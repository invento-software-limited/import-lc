# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

"""Data for the Import LC page dashboard (/app/import-lc-dashboard).

Portfolio totals mix LC currencies, so every amount is in company currency (base_*).
"Period" figures follow the selected window; balances, expiry and the worklist
are as of today.
"""

import frappe
from frappe import _
from frappe.core.doctype.user_permission.user_permission import get_user_permissions
from frappe.utils import cint, date_diff, flt, getdate, today

from import_lc.api import lc_common as rules
from import_lc.api import period as periods

RUNWAY = [("≤15 d", 0, 15), ("16–30 d", 16, 30), ("31–60 d", 31, 60), ("61–90 d", 61, 90), ("90+ d", 91, None)]
MAX_PAGE = 100


@frappe.whitelist()
def get_dashboard_data(company=None, period="1y", from_date=None, to_date=None, start=0, page_length=20):
	frappe.has_permission("Import LC", "read", throw=True)
	company = _validate_company(company)
	start, page_length = max(cint(start), 0), min(max(cint(page_length), 1), MAX_PAGE)
	return Portfolio(company, period, from_date, to_date).build(start, page_length)


def _validate_company(company):
	allowed = _allowed_companies()
	company = company or frappe.defaults.get_user_default("Company") or (allowed[0] if allowed else None)
	if not company or company not in allowed:
		frappe.throw(_("You do not have access to company {0}").format(company or ""), frappe.PermissionError)
	return company


def _allowed_companies():
	names = frappe.get_all("Company", pluck="name", order_by="name asc")
	restricted = get_user_permissions().get("Company")
	if restricted:
		allowed = {p.get("doc") for p in restricted}
		names = [n for n in names if n in allowed]
	return names


class Portfolio:
	def __init__(self, company, period, from_date, to_date):
		self.company = company
		self.period = period
		self.today = getdate(today())
		self.currency = frappe.get_cached_value("Company", company, "default_currency")
		self.start, self.end, self.label = periods.resolve(period, from_date, to_date, self.today)
		self.lcs = self._lcs()
		self.invoices = self._linked("Purchase Invoice", ["is_return", "outstanding_amount", "rounded_total",
			"base_rounded_total", "grand_total", "party_account_currency", "posting_date"])
		self.receipts = self._linked("Purchase Receipt", ["posting_date"])
		self._attach()

	def build(self, start, page_length):
		symbol, on_right = frappe.get_cached_value("Currency", self.currency, ["symbol", "symbol_on_right"]) or ("", 0)
		live = [lc for lc in self.lcs if lc.is_live]
		cohort = [lc for lc in self.lcs if self._in(lc.date_of_issue)]
		return {
			"company": self.company, "companies": _allowed_companies(), "currency": self.currency,
			"currency_symbol": symbol or self.currency, "currency_symbol_on_right": cint(on_right),
			"today": self.today, "period": self.period, "period_start": self.start, "period_end": self.end,
			"period_label": self.label,
			"opened": self._opened(cohort),
			"drawn": self._drawn(),
			"undrawn": {"amount": sum(lc.undrawn for lc in live), "count": len(live), "names": [lc.name for lc in live],
				"drawn": sum(min(lc.drawn, lc.value) for lc in live), "value": sum(lc.value for lc in live)},
			"expiring": self._expiring(live),
			"cohort": self._cohort(cohort),
			"chart": {"labels": [b[2] for b in periods.buckets(self.start, self.end)],
				"opened": self._series(self.lcs, "date_of_issue", "value"),
				"drawn": self._series(self.invoices, "posting_date", "base_grand_total")},
			"status_mix": self._group(cohort, "status"),
			"top_beneficiaries": self._group(cohort, "beneficiary", limit=5),
			"worklist": self._worklist(start, page_length),
			"can_read": {dt: frappe.has_permission(dt, "read") for dt in ("Purchase Invoice", "Purchase Receipt")},
		}

	def _lcs(self):
		fields = ["name", "lc_no", "beneficiary", "issuing_bank", "currency", "grand_total", "base_grand_total", "conversion_rate",
			"date_of_issue", "date_and_place_of_expiry", "latest_date_of_shipment", "docstatus"]
		return frappe.get_list("Import LC", filters={"company": self.company, "docstatus": 1}, fields=fields,
			limit_page_length=0, order_by="date_of_issue asc")

	def _linked(self, doctype, extra):
		if not frappe.has_permission(doctype, "read"):
			return []
		fields = ["name", "import_lc", "docstatus", "base_grand_total", *extra]
		rows = frappe.get_list(doctype, filters={"company": self.company, "docstatus": 1, "import_lc": ["is", "set"]},
			fields=list(dict.fromkeys(fields)), limit_page_length=0)
		for row in rows:
			row.paid = rules.paid_fraction(row, self.currency) if doctype == "Purchase Invoice" else 0
		return rows

	def _attach(self):
		by_lc = lambda rows, value: _sum_by(rows, "import_lc", value)
		drawn = by_lc(self.invoices, lambda r: flt(r.base_grand_total))
		received = by_lc(self.receipts, lambda r: flt(r.base_grand_total))
		for lc in self.lcs:
			lc.value = flt(lc.base_grand_total)
			lc.drawn, lc.received = drawn.get(lc.name, 0), received.get(lc.name, 0)
			lc.undrawn = max(lc.value - lc.drawn, 0)
			lc.status = rules.derive_status(1, lc.drawn, lc.value, lc.date_and_place_of_expiry, self.today)
			lc.days_to_expiry = date_diff(lc.date_and_place_of_expiry, self.today) if lc.date_and_place_of_expiry else None
			lc.is_live = lc.status in rules.LIVE_STATUSES and (lc.days_to_expiry is None or lc.days_to_expiry >= 0)
			lc.is_lapsed = lc.days_to_expiry is not None and lc.days_to_expiry < 0 and lc.undrawn > 0 and lc.status != "Fully Utilized"

	def _in(self, date, start=None, end=None):
		return bool(date) and (start or self.start) <= getdate(date) <= (end or self.end)

	def _opened(self, cohort):
		p_start, p_end = periods.previous(self.start, self.end)
		prior = sum(lc.value for lc in self.lcs if self._in(lc.date_of_issue, p_start, p_end))
		amount = sum(lc.value for lc in cohort)
		return {"amount": amount, "count": len(cohort), "prior_amount": prior,
			"change_pct": (amount - prior) / prior * 100 if prior else None,
			"trend": self._series(self.lcs, "date_of_issue", "value")}

	def _drawn(self):
		rows = [pi for pi in self.invoices if self._in(pi.posting_date)]
		amount = sum(flt(r.base_grand_total) for r in rows)
		settled = sum(flt(r.base_grand_total) * r.paid for r in rows if not r.is_return)
		return {"amount": amount, "count": len(rows), "settled": settled, "settled_pct": rules.pct(settled, amount),
			"outstanding": sum(flt(r.base_grand_total) * (1 - r.paid) for r in rows if not r.is_return)}

	def _expiring(self, live):
		runway = []
		for label, lo, hi in RUNWAY:
			hit = [lc for lc in live if lc.days_to_expiry is not None and lc.days_to_expiry >= lo and (hi is None or lc.days_to_expiry <= hi)]
			runway.append({"label": label, "from_days": lo, "to_days": hi, "amount": sum(lc.undrawn for lc in hit), "count": len(hit), "names": [lc.name for lc in hit]})
		soon = [lc for lc in live if lc.days_to_expiry is not None and lc.days_to_expiry <= 30]
		lapsed = [lc for lc in self.lcs if lc.is_lapsed]
		return {"amount": sum(lc.undrawn for lc in soon), "count": len(soon), "names": [lc.name for lc in soon], "runway": runway,
			"lapsed_amount": sum(lc.undrawn for lc in lapsed), "lapsed_count": len(lapsed)}

	def _cohort(self, cohort):
		names = {lc.name for lc in cohort}
		opened = sum(lc.value for lc in cohort)
		invoiced = sum(lc.drawn for lc in cohort)
		settled = sum(flt(pi.base_grand_total) * pi.paid for pi in self.invoices if pi.import_lc in names and not pi.is_return)
		received = sum(lc.received for lc in cohort)
		return {"opened": opened, "count": len(cohort), "received": received, "received_pct": rules.pct(received, opened), "invoiced": invoiced,
			"invoiced_pct": rules.pct(invoiced, opened), "settled": settled, "settled_pct": rules.pct(settled, invoiced),
			"outstanding": max(invoiced - settled, 0), "names": sorted(names)}

	def _series(self, rows, date_field, value_field):
		return [sum(flt(r.get(value_field)) for r in rows if self._in(r.get(date_field), lo, hi))
			for lo, hi, __ in periods.buckets(self.start, self.end)]

	def _group(self, lcs, key, limit=None):
		groups = {}
		for lc in lcs:
			row = groups.setdefault(lc.get(key), {key: lc.get(key), "count": 0, "amount": 0, "names": []})
			row["count"] += 1
			row["names"].append(lc.name)
			row["amount"] += lc.value
		rows = sorted(groups.values(), key=lambda r: -r["amount"])[:limit]
		total = sum(lc.value for lc in lcs)
		for r in rows:
			r["pct"] = rules.pct(r["amount"], total)
		return rows

	def _worklist(self, start, page_length):
		open_lcs = sorted((lc for lc in self.lcs if lc.is_live or lc.is_lapsed),
			key=lambda lc: (lc.days_to_expiry is None, lc.days_to_expiry or 0))
		rows = [{"name": lc.name, "lc_no": lc.lc_no, "beneficiary": lc.beneficiary, "status": lc.status,
			"expiry_date": lc.date_and_place_of_expiry, "days_to_expiry": lc.days_to_expiry, "currency": lc.currency,
			"lc_value": flt(lc.grand_total), "drawn_pct": rules.clamp(rules.pct(lc.drawn, lc.value), 0, 999),
			"undrawn": lc.undrawn, "lapsed": lc.is_lapsed} for lc in open_lcs[start:start + page_length]]
		return {"rows": rows, "total": len(open_lcs), "start": start, "page_length": page_length,
			"amount": sum(lc.undrawn for lc in open_lcs)}


def _sum_by(rows, key, value):
	out = {}
	for r in rows:
		out[r[key]] = out.get(r[key], 0) + value(r)
	return out
