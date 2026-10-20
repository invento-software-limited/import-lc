# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

"""Data for the Dashboard tab on the Import LC form.

LC-level figures (drawn, received, settled) are in the LC's own currency
(F32B); linked documents in another currency convert through company currency at
the LC's exchange rate. Landed cost and LC margin are in company currency, the
currency they are booked in.
"""

import frappe
from frappe import _
from frappe.utils import cint, date_diff, flt, getdate, today

from import_lc.api import lc_common as lc_rules

LINKED = {
	"Purchase Invoice": ["status", "posting_date", "currency", "grand_total", "base_grand_total", "rounded_total",
		"base_rounded_total", "outstanding_amount", "party_account_currency", "is_return", "due_date"],
	"Purchase Receipt": ["status", "posting_date", "currency", "grand_total", "base_grand_total", "per_billed", "is_return"],
	"Landed Cost Voucher": ["posting_date", "total_taxes_and_charges"],
	"Journal Entry": ["voucher_type", "posting_date", "total_debit", "lc_margin_amount"],
}


@frappe.whitelist()
def get_dashboard_data(name: str) -> dict:
	frappe.has_permission("Import LC", "read", name, throw=True)
	return ImportLCDashboard(frappe.get_doc("Import LC", name)).build()


class ImportLCDashboard:
	def __init__(self, lc):
		self.lc = lc
		self.rate = flt(lc.conversion_rate) or 1
		self.company_currency = frappe.get_cached_value("Company", lc.company, "default_currency")
		self.docs = {dt: self._linked(dt, fields) for dt, fields in LINKED.items()}

	def build(self):
		lc, docs = self.lc, self.docs
		commercial = [d for d in docs["Purchase Invoice"] if d.docstatus == 1]
		value = flt(lc.grand_total)
		drawn = sum(d.lc_value for d in commercial)
		settled = sum(d.lc_value * d.paid for d in commercial if not d.is_return)
		received = sum(d.lc_value for d in docs["Purchase Receipt"] if d.docstatus == 1)
		tolerance = lc_rules.tolerance_pct(lc.percentage_credit_amount_tolerance)
		return {
			**self._identity(),
			**self._currency(),
			**self._dates(),
			"status": lc_rules.derive_status(lc.docstatus, drawn, value, lc.date_and_place_of_expiry),
			"lc_value": value,
			"tolerance_pct": tolerance,
			"max_drawable": value * (1 + tolerance / 100),
			"drawn_amount": drawn,
			"drawn_count": len(commercial),
			"drawn_pct": lc_rules.pct(drawn, value),
			"drawn_trend": self._cumulative(commercial),
			"available_amount": max(value - drawn, 0),
			"over_drawn_amount": max(drawn - value, 0),
			"received_amount": received,
			"received_pct": lc_rules.pct(received, value),
			"settled_amount": settled,
			"settled_pct": lc_rules.pct(settled, drawn),
			"outstanding_amount": sum(d.lc_value * (1 - d.paid) for d in commercial if not d.is_return),
			"overdue_amount": sum(d.lc_value * (1 - d.paid) for d in commercial
				if not d.is_return and d.due_date and getdate(d.due_date) < getdate(today())),
			"margin": self._margin(),
			"landed_cost": self._landed_cost(commercial),
			"items": self._items(commercial),
			"documents": self._documents(),
			"can_read": {dt: frappe.has_permission(dt, "read") for dt in LINKED},
		}

	def _identity(self):
		fields = ["name", "lc_no", "docstatus", "company", "beneficiary", "issuing_bank", "beneficiary_bank",
			"form_of_documentary_credit", "applicable_rules", "drafts_at", "incoterm", "partial_shipments",
			"transshipment", "confirmation_instructions", "port_of_loading", "final_destination",
			"mode_of_transport", "proforma_invoice", "purchase_order"]
		return {f: self.lc.get(f) for f in fields}

	def _currency(self):
		return {
			"currency": self.lc.currency,
			**_symbol("", self.lc.currency),
			"company_currency": self.company_currency,
			**_symbol("company_", self.company_currency),
			"conversion_rate": self.rate,
		}

	def _dates(self):
		lc = self.lc
		issue, expiry, shipment = lc.date_of_issue, lc.date_and_place_of_expiry, lc.latest_date_of_shipment
		span = date_diff(expiry, issue) if issue and expiry else None
		mark = lambda d: lc_rules.clamp(lc_rules.pct(date_diff(d, issue), span)) if span and d else None
		return {
			"today": today(), "date_of_issue": issue, "expiry_date": expiry, "latest_date_of_shipment": shipment,
			"days_to_expiry": lc_rules.days_until(expiry), "days_to_shipment": lc_rules.days_until(shipment),
			"validity_days": span, "validity_elapsed_pct": mark(today()), "shipment_mark_pct": mark(shipment),
		}

	def _linked(self, doctype, extra):
		if not frappe.has_permission(doctype, "read"):
			return []
		rows = frappe.get_list(doctype, filters={"import_lc": self.lc.name, "docstatus": ["<", 2]},
			fields=["name", "docstatus", *extra], order_by="creation asc", limit_page_length=0)
		for row in rows:
			row.doctype = doctype
			row.lc_value = self._to_lc(row) if "grand_total" in extra else 0
			row.paid = lc_rules.paid_fraction(row, self.company_currency) if doctype == "Purchase Invoice" else 0
		return rows

	def _to_lc(self, row):
		if row.currency == self.lc.currency:
			return flt(row.grand_total)
		return flt(row.base_grand_total) / self.rate

	def _children(self, child_doctype, parents, fields):
		if not parents:
			return []
		return frappe.get_all(child_doctype, filters={"parent": ["in", parents]}, fields=["parent", *fields])

	def _cumulative(self, invoices):
		points, running = [{"date": self.lc.date_of_issue, "value": 0}], 0
		for d in sorted(invoices, key=lambda d: str(d.posting_date)):
			running += d.lc_value
			points.append({"date": d.posting_date, "value": running})
		return points

	def _margin(self):
		required = flt(self.lc.base_grand_total) * flt(self.lc.lc_margin) / 100
		booked = sum(flt(j.lc_margin_amount) or flt(j.total_debit) for j in self.docs["Journal Entry"]
			if j.docstatus == 1 and j.voucher_type == "LC Margin")
		return {"pct": flt(self.lc.lc_margin), "required": required, "booked": booked}

	def _landed_cost(self, commercial):
		goods = sum(flt(d.base_grand_total) for d in commercial)
		names = [v.name for v in self.docs["Landed Cost Voucher"] if v.docstatus == 1]
		charges = {}
		for row in self._children("Landed Cost Taxes and Charges", names, ["description", "amount"]):
			key = lc_rules.readable_charge(row.description)
			charges[key] = charges.get(key, 0) + flt(row.base_amount if row.get("base_amount") else row.amount)
		lines = sorted(({"label": k, "amount": v} for k, v in charges.items()), key=lambda r: -r["amount"])
		total_charges = sum(r["amount"] for r in lines)
		return {"goods": goods, "charges": lines, "total_charges": total_charges, "landed_total": goods + total_charges,
			"uplift_pct": lc_rules.pct(total_charges, goods), "voucher_count": len(names)}

	def _items(self, commercial):
		received = self._children("Purchase Receipt Item", [d.name for d in self.docs["Purchase Receipt"] if d.docstatus == 1],
			["item_code", "qty", "uom", "stock_qty"])
		invoiced = self._children("Purchase Invoice Item", [d.name for d in commercial], ["item_code", "qty", "uom", "stock_qty"])
		rows = []
		for item in self.lc.items:
			qty_of = lambda rows_: _qty_in_uom([r for r in rows_ if r.item_code == item.item_code], item)
			lc_qty = flt(item.qty)
			got = qty_of(received)
			rows.append({"item_code": item.item_code, "item_name": item.item_name or item.item_code, "uom": item.uom,
				"lc_qty": lc_qty, "lc_amount": flt(item.total), "received_qty": got,
				"invoiced_qty": qty_of(invoiced), "received_pct": lc_rules.pct(got, lc_qty)})
		return rows

	def _documents(self):
		docs = []
		for dt, rows in self.docs.items():
			for d in rows:
				docs.append(_document_row(d, self.lc.currency, self.company_currency))
		return sorted(docs, key=lambda d: str(d["date"] or ""), reverse=True)


def _document_row(d, lc_ccy, company_ccy):
	dt = d.doctype
	kind = _("Commercial Invoice") if dt == "Purchase Invoice" else _(dt)
	value, ccy, progress = None, company_ccy, None
	if dt in ("Purchase Invoice", "Purchase Receipt"):
		value, ccy = d.lc_value, lc_ccy
		progress = (d.paid * 100, _("paid")) if dt == "Purchase Invoice" else (flt(d.per_billed), _("billed"))
	elif dt == "Landed Cost Voucher":
		value = flt(d.total_taxes_and_charges)
	elif dt == "Journal Entry":
		value = flt(d.lc_margin_amount) or flt(d.total_debit)
	if d.docstatus == 0:
		progress = None
	return {"doctype": dt, "kind": kind, "name": d.name, "status": d.get("status") or ("Draft" if d.docstatus == 0 else _("Submitted")),
		"date": d.get("posting_date"),
		"value": value, "currency": ccy, "progress_pct": progress[0] if progress else None,
		"progress_label": progress[1] if progress else ""}


def _qty_in_uom(rows, lc_item):
	"""Quantities in the LC line's UOM; other UOMs convert through stock qty and the item's UOM factor."""
	total = 0
	for r in rows:
		if not r.get("uom") or r.uom == lc_item.uom:
			total += flt(r.qty)
		elif r.get("stock_qty"):
			total += flt(r.stock_qty) / (_uom_factor(lc_item.item_code, lc_item.uom) or 1)
	return total


def _uom_factor(item_code, uom):
	if frappe.get_cached_value("Item", item_code, "stock_uom") == uom:
		return 1
	return flt(frappe.db.get_value("UOM Conversion Detail", {"parent": item_code, "uom": uom}, "conversion_factor"))


def _symbol(prefix, currency):
	symbol, on_right = frappe.get_cached_value("Currency", currency, ["symbol", "symbol_on_right"]) or ("", 0)
	return {f"{prefix}currency_symbol": symbol or currency, f"{prefix}currency_symbol_on_right": cint(on_right)}
