# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.utils import get_link_to_form, flt


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


@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None):
	"""Create a local service Purchase Invoice for the insurance premium from Import Insurance."""
	ins = frappe.get_doc("Import Insurance", source_name)

	if ins.docstatus != 1:
		frappe.throw("Please submit the Import Insurance document before creating a Purchase Invoice.")

	# Duplicate check: check the back-link on the Import Insurance document
	existing_pi = ins.purchase_invoice
	if existing_pi:
		link = get_link_to_form("Purchase Invoice", existing_pi)
		frappe.throw(f"Purchase Invoice {link} already exists for this Import Insurance.")

	# Get or create a default insurance service item
	insurance_item = frappe.db.get_value("Item", {"item_name": "Import Insurance Premium"}, "name")
	if not insurance_item:
		ins_item_doc = frappe.get_doc({
			"doctype": "Item",
			"item_code": "Import Insurance Premium",
			"item_name": "Import Insurance Premium",
			"item_group": "Services",
			"is_stock_item": 0,
			"is_purchase_item": 1,
		})
		ins_item_doc.insert(ignore_permissions=True)
		insurance_item = ins_item_doc.name

	# Determine company currency (local purchase — always in base currency)
	company_currency = frappe.get_cached_value("Company", ins.company, "default_currency")

	pi = frappe.new_doc("Purchase Invoice")
	pi.company = ins.company
	pi.supplier = ins.insurance_provider   # local insurance company
	pi.currency = company_currency
	pi.purchase_type = "Local"
	pi.set_posting_time = 1

	# Store reference to Import Insurance for traceability
	pi.import_insurance = source_name
	if ins.import_lc:
		pi.import_lc = ins.import_lc
	if ins.proforma_invoice:
		pi.proforma_invoice = ins.proforma_invoice

	# Build remarks from insurance details
	desc_parts = []
	if ins.policy_number:
		desc_parts.append(f"Insurance Policy: {ins.policy_number}")
	if ins.insured_party:
		desc_parts.append(f"Insured Party: {ins.insured_party}")
	if ins.remarks:
		desc_parts.append(ins.remarks)
	pi.remarks = " | ".join(desc_parts)

	# Single service line item for the insurance premium
	pi.append("items", {
		"item_code": insurance_item,
		"item_name": "Import Insurance Premium",
		"description": f"Insurance Premium – Policy No: {ins.policy_number or source_name}",
		"qty": 1,
		"rate": flt(ins.insurance_premium),
		"uom": "Nos",
	})

	# Pre-fill expense account from debit_account if set
	if ins.debit_account:
		for item in pi.items:
			item.expense_account = ins.debit_account

	pi.run_method("set_missing_values")
	pi.run_method("calculate_taxes_and_totals")

	return pi
