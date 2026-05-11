# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_link_to_form


class ImportInsurance(Document):
	def validate(self):
		self.validate_one_to_one()

	def validate_one_to_one(self):
		if self.proforma_invoice:
			existing_ins = frappe.db.get_value("Import Insurance", 
				{"proforma_invoice": self.proforma_invoice, "name": ["!=", self.name], "docstatus": ["<", 2]}, "name")
			if existing_ins:
				link = get_link_to_form("Import Insurance", existing_ins)
				pi_link = get_link_to_form("Proforma Invoice", self.proforma_invoice)
				frappe.throw(f"Import Insurance <b>{link}</b> already exists for Proforma Invoice <b>{pi_link}</b>")
