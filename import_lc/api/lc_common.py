# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

"""Definitions shared by the Import LC record dashboard and the Import LC page dashboard."""

import re

import frappe
from frappe.utils import date_diff, flt, getdate, today

LIVE_STATUSES = ("Active", "Partially Utilized")


def derive_status(docstatus, drawn, lc_value, expiry, on=None):
	"""Import LC has no stored status; this mirrors Export LC's rules."""
	if docstatus == 0:
		return "Draft"
	if docstatus == 2:
		return "Cancelled"
	if flt(lc_value) and flt(drawn) >= flt(lc_value):
		return "Fully Utilized"
	if flt(drawn) > 0:
		return "Partially Utilized"
	if expiry and getdate(expiry) < getdate(on or today()):
		return "Expired"
	return "Active"


def paid_fraction(pi, company_currency):
	"""Share of the invoice already settled; outstanding is held in the party account currency."""
	if pi.docstatus != 1 or pi.is_return:
		return 0
	in_company_ccy = (pi.party_account_currency or company_currency) == company_currency
	total = (pi.base_rounded_total or pi.base_grand_total) if in_company_ccy else (pi.rounded_total or pi.grand_total)
	if not flt(total):
		return 0
	return clamp(1 - flt(pi.outstanding_amount) / flt(total), 0, 1)


def tolerance_pct(raw):
	"""F39A is free text such as "5", "5%" or "5/5"; the first number is the upper tolerance."""
	match = re.search(r"\d+(?:\.\d+)?", str(raw or ""))
	return flt(match.group()) if match else 0


def days_until(date, on=None):
	return date_diff(date, on or today()) if date else None


def pct(part, whole):
	return flt(part) / flt(whole) * 100 if flt(whole) else 0


def clamp(value, low=0, high=100):
	return max(low, min(high, value))


def readable_charge(description):
	"""LCV lines read like "Freight (Invoice: ACC-PINV-…)"; group on the part before "("."""
	return (description or "").split("(")[0].strip() or "Other charges"
