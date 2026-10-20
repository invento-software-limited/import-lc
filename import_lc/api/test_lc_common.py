# Copyright (c) 2026, Invento Software Limited and Contributors
# See license.txt

import unittest

import frappe

from import_lc.api import lc_common as rules


def _pi(**kw):
	base = {"docstatus": 1, "is_return": 0, "party_account_currency": "USD", "outstanding_amount": 0,
		"grand_total": 100, "rounded_total": 100, "base_grand_total": 12280, "base_rounded_total": 12280}
	return frappe._dict({**base, **kw})


class TestImportLCRules(unittest.TestCase):
	def test_status_follows_drawn_and_expiry(self):
		self.assertEqual(rules.derive_status(0, 0, 100, None), "Draft")
		self.assertEqual(rules.derive_status(2, 0, 100, None), "Cancelled")
		self.assertEqual(rules.derive_status(1, 100, 100, "2026-01-01", "2026-10-19"), "Fully Utilized")
		self.assertEqual(rules.derive_status(1, 40, 100, "2026-01-01", "2026-10-19"), "Partially Utilized")
		self.assertEqual(rules.derive_status(1, 0, 100, "2026-01-01", "2026-10-19"), "Expired")
		self.assertEqual(rules.derive_status(1, 0, 100, "2026-12-31", "2026-10-19"), "Active")

	def test_paid_fraction_reads_outstanding_in_party_currency(self):
		self.assertEqual(rules.paid_fraction(_pi(outstanding_amount=25), "BDT"), 0.75)
		self.assertEqual(rules.paid_fraction(_pi(party_account_currency="BDT", outstanding_amount=6140), "BDT"), 0.5)
		self.assertEqual(rules.paid_fraction(_pi(is_return=1), "BDT"), 0)

	def test_charge_labels_group_on_the_text_before_brackets(self):
		self.assertEqual(rules.readable_charge("Import Insurance (Invoice: ACC-PINV-1)"), "Import Insurance")
		self.assertEqual(rules.readable_charge(""), "Other charges")
		self.assertEqual(rules.tolerance_pct("10/5"), 10)
