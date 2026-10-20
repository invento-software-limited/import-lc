# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

"""Period presets for the Import LC page dashboard."""

import frappe
from frappe import _
from frappe.utils import add_days, add_months, date_diff, getdate

LABELS = {"30d": "Last 30 days", "6m": "Last 6 months", "1y": "Last 12 months"}
MAX_CUSTOM_DAYS = 366 * 3


def resolve(period, from_date=None, to_date=None, today=None):
	"""Inclusive (start, end, label). 6m / 1y start on the 1st so monthly buckets are whole."""
	today = getdate(today)
	if period == "custom":
		if not from_date or not to_date:
			frappe.throw(_("Choose both a From and a To date."))
		start, end = getdate(from_date), getdate(to_date)
		if start > end:
			frappe.throw(_("From date must be on or before To date."))
		if date_diff(end, start) > MAX_CUSTOM_DAYS:
			frappe.throw(_("Choose a range of three years or less."))
		return start, end, f"{start:%d %b %Y} – {end:%d %b %Y}"
	starts = {
		"30d": add_days(today, -29),
		"6m": add_months(today.replace(day=1), -5),
		"1y": add_months(today.replace(day=1), -11),
	}
	if period not in starts:
		frappe.throw(_("Unknown dashboard period: {0}").format(period))
	return getdate(starts[period]), today, _(LABELS[period])


def previous(start, end):
	"""The window of equal length immediately before (start, end)."""
	span = date_diff(end, start)
	prev_end = add_days(start, -1)
	return getdate(add_days(prev_end, -span)), getdate(prev_end)


def buckets(start, end):
	"""Chart buckets: weekly up to ~3 months, monthly beyond. Each is (key_start, key_end, label)."""
	start, end = getdate(start), getdate(end)
	out = []
	if date_diff(end, start) <= 92:
		cursor = start
		while cursor <= end:
			stop = min(getdate(add_days(cursor, 6)), end)
			out.append((cursor, stop, f"{cursor:%d %b}"))
			cursor = getdate(add_days(stop, 1))
		return out
	cursor = start.replace(day=1)
	while cursor <= end:
		stop = min(getdate(add_days(add_months(cursor, 1), -1)), end)
		out.append((max(cursor, start), stop, f"{cursor:%b}"))
		cursor = getdate(add_months(cursor, 1))
	return out
