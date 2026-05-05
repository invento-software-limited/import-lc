# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import flt


class ImportLC(Document):
	pass


@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None):
	"""Create Purchase Invoice from Import LC and its linked Proforma Invoice."""
	
	def set_missing_values(source, target):
		target.purchase_type = "Import"
		target.import_lc = source.name
		
		if source.proforma_invoice:
			pi = frappe.get_doc("Proforma Invoice", source.proforma_invoice)
			target.proforma_invoice = pi.name
			target.pi_number = pi.pi_number
			target.pi_date = pi.pi_date
			target.invoice_date = pi.invoice_date
			target.pi_validity_date = pi.pi_validity_date
			
			# Supplier Information
			target.country_of_origin = pi.country_of_origin
			target.supplier_phone_no = pi.supplier_phone_no
			target.supplier_email = pi.supplier_email
			
			# Bank Information
			target.bank = pi.bank
			target.swift_code = pi.swift_code
			target.bank_branch = pi.bank_branch
			target.account_number_iban = pi.account_number_iban
			target.bank_address = pi.bank_address
			
			# Buyer Information
			target.buyer_name = pi.buyer_name
			target.phone_no = pi.phone_no
			target.email = pi.email
			target.buyer_address = pi.buyer_address
			
			# Trade Details
			target.freight_charges = pi.freight_charges
			target.delivery_terms = pi.delivery_terms
			target.safta_clause = pi.safta_clause
			
			# Shipment Details
			target.mode_of_shipment = pi.mode_of_shipment
			target.shipment_conditions = pi.shipment_conditions
			
			# Map items from PI if LC items are generic or missing logistics
			pi_items_map = {item.item_code: item for item in pi.items}
			for item in target.items:
				if item.item_code in pi_items_map:
					pi_item = pi_items_map[item.item_code]
					item.brand = pi_item.brand
					item.packing_type = pi_item.packing_type
					item.custom_total_qty = pi_item.total_qty
					item.total_volume_weight = pi_item.total_volume_weight
					item.rate_per_carton = pi_item.rate_per_carton
					item.total_amount_usd = pi_item.total_amount_usd

	doclist = get_mapped_doc("Import LC", source_name, {
		"Import LC": {
			"doctype": "Purchase Invoice",
			"field_map": {
				"lc_no": "lc_number",
				"beneficiary": "supplier",
				"applicant": "buyer",
				"currency": "currency",
				"incoterm": "incoterm",
				"drafts_at": "payment_terms",
				"percentage_credit_amount_tolerance": "tolerance_percent",
				"port_of_loading": "port_of_loading",
				"port_of_discharge": "port_of_discharge",
				"final_destination": "country_of_final_destination",
				"mode_of_transport": "mode_of_transport",
				"transshipment": "transshipment",
				"partial_shipments": "partial_shipment",
				"conversion_rate": "conversion_rate"
			}
		},
		"Import LC Item": {
			"doctype": "Purchase Invoice Item",
			"field_map": {
				"item_code": "item_code",
				"item_name": "item_name",
				"description": "description",
				"hs_code": "hs_code",
				"qty": "qty",
				"uom": "uom",
				"rate": "rate",
				"amount": "amount"
			}
		}
	}, target_doc, set_missing_values)

	return doclist


@frappe.whitelist()
def make_journal_entry(source_name):
	"""Create Journal Entry (LC Margin) from Import LC."""
	lc = frappe.get_doc("Import LC", source_name)
	
	je = frappe.new_doc("Journal Entry")
	je.voucher_type = "LC Margin"
	je.company = lc.company
	je.posting_date = frappe.utils.nowdate()
	
	# Map custom fields
	je.import_lc = lc.name
	je.import_lc_amount = lc.grand_total
	je.lc_margin = lc.lc_margin
	
	# Calculate LC Margin Amount
	amount = flt(lc.grand_total) * (flt(lc.lc_margin) / 100.0)
	je.lc_margin_amount = amount
	
	# Add placeholder account rows
	je.append("accounts", {
		"account": "", # User to select account
		"debit_in_account_currency": amount,
		"debit": amount
	})
	je.append("accounts", {
		"account": "", # User to select account
		"credit_in_account_currency": amount,
		"credit": amount
	})
	
	return je


@frappe.whitelist()
def make_lc_expense_journal_entry(source_name):
	"""Create Journal Entry (LC Expense) from Import LC."""
	lc = frappe.get_doc("Import LC", source_name)
	
	je = frappe.new_doc("Journal Entry")
	je.voucher_type = "LC Expense"
	je.company = lc.company
	je.posting_date = frappe.utils.nowdate()
	
	# Map custom fields
	je.import_lc = lc.name
	je.import_lc_amount = lc.grand_total
	
	# Add placeholder account rows
	je.append("accounts", {
		"account": "", # User to select account
		"debit_in_account_currency": 0,
		"debit": 0
	})
	je.append("accounts", {
		"account": "", # User to select account
		"credit_in_account_currency": 0,
		"credit": 0
	})
	
	return je
@frappe.whitelist()
def make_landed_cost_voucher(source_name, source_doctype="Import LC"):
	"""Create Landed Cost Voucher from Import LC or LC Shipment."""
	
	if source_doctype == "LC Shipment":
		shipment = frappe.get_doc("LC Shipment", source_name)
		lc_name = shipment.import_lc
	else:
		lc_name = source_name

	lc = frappe.get_doc("Import LC", lc_name)
	
	# Ensure Custom Field exists in Landed Cost Voucher to keep the reference
	if not frappe.db.exists("Custom Field", "Landed Cost Voucher-import_lc"):
		frappe.get_doc({
			"doctype": "Custom Field",
			"dt": "Landed Cost Voucher",
			"fieldname": "import_lc",
			"label": "Import LC",
			"fieldtype": "Link",
			"options": "Import LC",
			"insert_after": "company",
			"read_only": 1
		}).insert()

	lcv = frappe.new_doc("Landed Cost Voucher")
	lcv.company = lc.company
	lcv.distribute_charges_based_on = "Amount"
	lcv.import_lc = lc.name
	lcv.posting_date = frappe.utils.nowdate()

	# Find Purchase Receipts linked to this Import LC
	# If source is a shipment, we filter by shipment name too
	filters = {"import_lc": lc.name, "docstatus": 1}
	if source_doctype == "LC Shipment":
		filters["lc_shipment"] = source_name

	prs = frappe.get_all("Purchase Receipt",
		filters=filters,
		fields=["name", "supplier", "posting_date", "base_grand_total"]
	)
	
	for pr in prs:
		lcv.append("purchase_receipts", {
			"receipt_document_type": "Purchase Receipt",
			"receipt_document": pr.name,
			"supplier": pr.supplier,
			"posting_date": pr.posting_date,
			"grand_total": pr.base_grand_total
		})

	# Find Purchase Invoices linked to this Import LC (only those that update stock)
	# Reuse the same filters (import_lc and optional lc_shipment)
	filters["update_stock"] = 1
	pis = frappe.get_all("Purchase Invoice", 
		filters=filters,
		fields=["name", "supplier", "posting_date", "base_grand_total"]
	)
	
	for pi in pis:
		lcv.append("purchase_receipts", {
			"receipt_document_type": "Purchase Invoice",
			"receipt_document": pi.name,
			"supplier": pi.supplier,
			"posting_date": pi.posting_date,
			"grand_total": pi.base_grand_total
		})
	
	# Fetch charges
	freight = 0
	insurance = 0
	other = 0

	if source_doctype == "LC Shipment":
		shipment = frappe.get_doc("LC Shipment", source_name)
		freight = flt(shipment.freight_amount)
		insurance = flt(shipment.insurance_amount)
		other = flt(shipment.other_charges)
	else:
		# Fallback to Import LC charges or sum of all shipments
		freight = flt(lc.freight_charges)
		shipments = frappe.get_all("LC Shipment", filters={"import_lc": lc.name, "docstatus": 1}, 
			fields=["freight_amount", "insurance_amount", "other_charges"])
		
		for s in shipments:
			freight += flt(s.freight_amount)
			insurance += flt(s.insurance_amount)
			other += flt(s.other_charges)

	if freight > 0:
		lcv.append("taxes", {
			"description": "Freight Charges",
			"amount": freight
		})
	
	if insurance > 0:
		lcv.append("taxes", {
			"description": "Insurance Amount",
			"amount": insurance
		})
		
	if other > 0:
		lcv.append("taxes", {
			"description": "Other Charges",
			"amount": other
		})

	if lcv.purchase_receipts:
		lcv.get_items_from_purchase_receipts()
	
	return lcv
