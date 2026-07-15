# Copyright (c) 2026, Invento Software Limited and Contributors
# See license.txt

import unittest
from unittest.mock import MagicMock, patch

import frappe
from frappe.tests import IntegrationTestCase

from import_lc.import_lc.doctype.import_lc.import_lc import (
	make_purchase_invoice as make_purchase_invoice_from_lc,
)
from import_lc.import_lc.doctype.proforma_invoice.proforma_invoice import (
	make_purchase_invoice as make_purchase_invoice_from_pi,
)


class IntegrationTestImportLC(unittest.TestCase):
	@patch("import_lc.import_lc.doctype.import_lc.import_lc.get_mapped_doc")
	@patch("import_lc.import_lc.doctype.import_lc.import_lc.frappe.get_doc")
	def test_make_purchase_invoice_from_lc_no_invoice_date(self, mock_get_doc, mock_get_mapped_doc):
		source_doc = MagicMock()
		source_doc.name = "IMP-LC-0001"
		source_doc.proforma_invoice = "PI-0001"

		pi_doc = MagicMock()
		pi_doc.name = "PI-0001"
		pi_doc.pi_number = "PI-NUM"
		pi_doc.pi_date = "2026-06-28"
		pi_doc.pi_validity_date = "2026-12-31"
		# Remove invoice_date attribute to ensure it is not accessed
		if hasattr(pi_doc, "invoice_date"):
			delattr(pi_doc, "invoice_date")

		mock_get_doc.return_value = pi_doc

		target_doc = MagicMock()
		target_doc.items = []

		def side_effect(doctype, source_name, mapping, target, set_missing_values):
			set_missing_values(source_doc, target)
			return target

		mock_get_mapped_doc.side_effect = side_effect

		# This should not raise AttributeError
		res = make_purchase_invoice_from_lc("IMP-LC-0001", target_doc=target_doc)
		self.assertEqual(res.pi_number, "PI-NUM")
		self.assertEqual(res.pi_date, "2026-06-28")
		self.assertEqual(res.pi_validity_date, "2026-12-31")

	@patch("import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.get_mapped_doc")
	def test_make_purchase_invoice_from_pi_no_invoice_date(self, mock_get_mapped_doc):
		source_doc = MagicMock()
		source_doc.name = "PI-0001"
		source_doc.pi_number = "PI-NUM"
		source_doc.pi_date = "2026-06-28"
		source_doc.pi_validity_date = "2026-12-31"
		if hasattr(source_doc, "invoice_date"):
			delattr(source_doc, "invoice_date")

		target_doc = MagicMock()
		target_doc.items = []

		def side_effect(doctype, source_name, mapping, target, set_missing_values):
			set_missing_values(source_doc, target)
			return target

		mock_get_mapped_doc.side_effect = side_effect

		res = make_purchase_invoice_from_pi("PI-0001", target_doc=target_doc)
		# This confirms set_missing_values is executed successfully
		self.assertEqual(res.proforma_invoice, "PI-0001")
