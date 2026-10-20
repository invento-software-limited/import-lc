# Copyright (c) 2026, Invento Software Limited and Contributors
# See license.txt

import unittest
from datetime import date

import frappe

from import_lc.api import period


class TestExportLCPeriod(unittest.TestCase):
	TODAY = "2026-10-19"

	def test_presets_resolve_inclusive_windows(self):
		self.assertEqual(period.resolve("30d", today=self.TODAY)[:2], (date(2026, 9, 20), date(2026, 10, 19)))
		self.assertEqual(period.resolve("1y", today=self.TODAY)[:2], (date(2025, 11, 1), date(2026, 10, 19)))

	def test_custom_range_is_validated(self):
		self.assertRaises(frappe.ValidationError, period.resolve, "custom", "2026-05-02", "2026-05-01")
		self.assertRaises(frappe.ValidationError, period.resolve, "custom", "2020-01-01", "2026-01-01")
		self.assertRaises(frappe.ValidationError, period.resolve, "bogus", today=self.TODAY)

	def test_previous_window_has_equal_length(self):
		self.assertEqual(period.previous(date(2026, 9, 20), date(2026, 10, 19)), (date(2026, 8, 21), date(2026, 9, 19)))

	def test_buckets_cover_the_window_without_gaps(self):
		monthly = period.buckets("2025-11-01", "2026-10-19")
		self.assertEqual(len(monthly), 12)
		weekly = period.buckets("2026-09-20", "2026-10-19")
		self.assertEqual(weekly[0][0], date(2026, 9, 20))
		self.assertEqual(weekly[-1][1], date(2026, 10, 19))
		for (_, end, _), (start, _, _) in zip(weekly, weekly[1:]):
			self.assertEqual((start - end).days, 1)
