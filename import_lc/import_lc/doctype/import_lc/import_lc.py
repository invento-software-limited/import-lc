# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc
from frappe.utils import flt, money_in_words
import erpnext


class ImportLC(Document):
	def validate(self):
		self.validate_one_to_one()
		self.calculate_totals()
		self.set_in_words()

	def validate_one_to_one(self):
		if self.proforma_invoice:
			existing_lc = frappe.db.get_value("Import LC", 
				{"proforma_invoice": self.proforma_invoice, "name": ["!=", self.name], "docstatus": ["<", 2]}, "name")
			if existing_lc:
				from frappe.utils import get_link_to_form
				link = get_link_to_form("Import LC", existing_lc)
				pi_link = get_link_to_form("Proforma Invoice", self.proforma_invoice)
				frappe.throw(f"Import LC <b>{link}</b> already exists for Proforma Invoice <b>{pi_link}</b>")

	def calculate_totals(self):
		self.total = 0
		self.base_total = 0
		self.total_qty = 0
		
		for item in self.items:
			item.total = flt(item.qty) * flt(item.rate)
			item.base_rate = flt(item.rate) * flt(self.conversion_rate or 1)
			item.base_total = flt(item.total) * flt(self.conversion_rate or 1)
			
			self.total += item.total
			self.base_total += item.base_total
			self.total_qty += flt(item.qty)
		
		self.grand_total = flt(self.total)
		self.base_grand_total = self.grand_total * flt(self.conversion_rate or 1)
		
		self.rounded_total = round(self.grand_total)
		self.base_rounded_total = round(self.base_grand_total)

	def set_in_words(self):
		self.in_words = money_in_words(self.grand_total, self.currency)
		company_currency = frappe.get_cached_value("Company", self.company, "default_currency")
		if company_currency:
			self.base_in_words = money_in_words(self.base_grand_total, company_currency)


@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None):
	"""Create Purchase Invoice from Import LC and its linked Proforma Invoice."""
	
	def set_missing_values(source, target):
		target.purchase_type = "Import"
		target.naming_series = "COM-INV-.YYYY.-"
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
			target.branch = pi.bank_branch
			target.account_number__iban = pi.account_number_iban
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
			target.mode_of_transport = pi.mode_of_transport
			target.mode_of_shipment_container_details = pi.mode_of_shipment
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
				"base_rate": "base_rate",
				"total": "amount",
				"base_total": "base_amount"
			}
		}
	}, target_doc, set_missing_values)

	return doclist


@frappe.whitelist()
def make_purchase_receipt(source_name, target_doc=None):
	"""Create Purchase Receipt from Import LC and its linked Purchase Invoice."""
	
	def set_missing_values(source, target):
		target.purchase_type = "Import"
		target.import_lc = source.name
		
		# Find linked Purchase Invoice
		pi_name = frappe.db.get_value("Purchase Invoice", {"import_lc": source.name, "docstatus": ["<", 2]}, "name")
		if pi_name:
			pi = frappe.get_doc("Purchase Invoice", pi_name)
			target.purchase_invoice = pi.name
			
			# Map fields from PI if they exist
			fields_to_map = [
				"pi_number", "pi_date", "bank", "swift_code", "branch", "account_number__iban",
				"bank_address", "buyer_name", "phone_no", "email", "buyer_address", "freight_charges",
				"delivery_terms", "safta_clause", "mode_of_transport", "mode_of_shipment_container_details", "shipment_conditions",
				"country_of_origin"
			]
			for field in fields_to_map:
				if hasattr(pi, field) and getattr(pi, field):
					setattr(target, field, getattr(pi, field))
			
			# Map items from PI to get logistics data
			pi_items_map = {item.item_code: item for item in pi.items}
			for item in target.items:
				if item.item_code in pi_items_map:
					pi_item = pi_items_map[item.item_code]
					item.hs_code = pi_item.hs_code
					item.country_of_origin = pi_item.country_of_origin
					item.packing_type = pi_item.packing_type
					item.total_qty = pi_item.total_qty
					item.total_amount_usd = pi_item.total_amount_usd

	doclist = get_mapped_doc("Import LC", source_name, {
		"Import LC": {
			"doctype": "Purchase Receipt",
			"field_map": {
				"lc_no": "lc_no",
				"beneficiary": "supplier",
				"applicant": "buyer",
				"currency": "currency",
				"incoterm": "incoterm",
				"drafts_at": "payment_terms",
				"percentage_credit_amount_tolerance": "tolerance__on_total_pi_value",
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
			"doctype": "Purchase Receipt Item",
			"field_map": {
				"item_code": "item_code",
				"item_name": "item_name",
				"description": "description",
				"qty": "qty",
				"uom": "uom",
				"rate": "rate"
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
	je.import_lc_amount = lc.base_grand_total
	je.lc_margin = lc.lc_margin
	
	# Calculate LC Margin Amount
	amount = flt(lc.base_grand_total) * (flt(lc.lc_margin) / 100.0)
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
	je.import_lc_amount = lc.base_grand_total
	
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
		lc_name = frappe.db.get_value("LC Shipment", source_name, "import_lc")
	else:
		lc_name = source_name

	if not lc_name:
		return None

	lc = frappe.get_cached_value("Import LC", lc_name, 
		["company", "lc_no", "base_grand_total", "lc_margin", "freight_charges", "import_insurance", "other_charges"], 
		as_dict=1
	)

	lcv = frappe.new_doc("Landed Cost Voucher")
	lcv.company = lc.company
	lcv.distribute_charges_based_on = "Amount"
	lcv.import_lc = lc_name
	
	if hasattr(lcv, "lc_no"):
		lcv.lc_no = lc.lc_no
	if source_doctype == "LC Shipment" and hasattr(lcv, "custom_lc_shipment"):
		lcv.custom_lc_shipment = source_name

	lcv.posting_date = frappe.utils.nowdate()

	# Aggregate linked documents
	filters = {"import_lc": lc_name, "docstatus": 1}

	# Fetch PRs
	prs = frappe.get_all("Purchase Receipt", filters=filters, fields=["name", "supplier", "posting_date", "base_grand_total"])
	for pr in prs:
		lcv.append("purchase_receipts", {
			"receipt_document_type": "Purchase Receipt",
			"receipt_document": pr.name,
			"supplier": pr.supplier,
			"posting_date": pr.posting_date,
			"grand_total": pr.base_grand_total
		})
	
	# Fetch and Aggregate Charges
	freight = flt(lc.freight_charges)
	insurance = 0.0
	expenses = 0.0

	# Add insurance premium from the linked Import Insurance document
	if lc.import_insurance:
		# Search for a PI that points to this insurance document
		pi_name = frappe.db.get_value("Purchase Invoice", 
			{"import_insurance": lc.import_insurance, "docstatus": 1}, "name")
		
		if pi_name:
			# Fetch PI details
			pi_data = frappe.db.get_value("Purchase Invoice", pi_name, 
				["name", "supplier", "posting_date", "base_grand_total"], as_dict=1)
			
			if pi_data:
				# frappe.msgprint(f"Found PI {pi_data.name} via Import Insurance field")
				# Add to the VENDOR INVOICES table
				lcv.append("vendor_invoices", {
					"vendor_invoice": pi_data.name,
					"amount": pi_data.base_grand_total
				})
				# Add to the insurance charge total
				insurance += flt(pi_data.base_grand_total)
		else:
			# Fallback: use premium from the insurance doc itself
			prem = frappe.db.get_value("Import Insurance", lc.import_insurance, "insurance_premium")
			insurance += flt(prem)

	# Combine header other_charges and Journal Entry expenses
	total_lc_expenses = flt(lc.other_charges)
	
	# Fetch LC Expense Journal Entries (including draft for easier verification)
	# Fetch ALL Journal Entries linked to this LC (debugging why LC Expense is not fetching)
	# Fetch ALL Journal Entries linked to this LC (debugging why LC Expense is not fetching)
	jes = frappe.get_all("Journal Entry", 
		filters={"import_lc": lc_name, "docstatus": ["<", 2]},
		fields=["name", "total_amount", "total_debit", "docstatus", "voucher_type"]
	)
	
	if not jes:
		# Try searching with custom_ prefix just in case
		jes = frappe.get_all("Journal Entry", 
			filters={"custom_import_lc": lc_name, "docstatus": ["<", 2]},
			fields=["name", "total_amount", "total_debit", "docstatus", "voucher_type"]
		)
		if jes:
			# If found with custom_ prefix, update the field names in the list
			for d in jes: d.import_lc = d.custom_import_lc

	je_info = [f"{d.name} ({d.voucher_type}) - Amt: {d.get('total_amount') or d.get('total_debit')}" for d in jes]
	# frappe.msgprint(f"LC Number: {lc.lc_no}<br>Header Other Charges: {lc.other_charges}<br>Found {len(jes)} Journal Entries: {', '.join(je_info)}")
	
	# Filter for expenses and margin journals
	je_expense_list = [d for d in jes if d.voucher_type != "LC Margin"]
	je_margin_list = [d for d in jes if d.voucher_type == "LC Margin"]
	
	je_expense_total = 0
	for d in je_expense_list:
		je_expense_total += flt(d.get("total_amount")) or flt(d.get("total_debit"))
	
	je_margin_total = 0
	for d in je_margin_list:
		je_margin_total += flt(d.get("total_amount")) or flt(d.get("total_debit"))
	
	total_lc_expenses += je_expense_total

	if total_lc_expenses:
		# Distinguish between submitted and draft in the description
		je_names = [d.name for d in je_expense_list]
		draft_jes = [d.name for d in je_expense_list if d.docstatus == 0]
		desc = "LC Expenses"
		if je_names:
			desc += f" (Journals: {', '.join(je_names)})"
		if draft_jes:
			desc += " [Note: includes draft journals]"
			
		lcv.append("taxes", {
			"description": desc,
			"amount": total_lc_expenses,
			"base_amount": total_lc_expenses
		})

	if freight: lcv.append("taxes", {"description": "Freight Charges", "amount": freight, "base_amount": freight})
	
	if insurance:
		desc = "Import Insurance"
		account = None
		
		if lc.import_insurance:
			# Get account from insurance doc
			account = frappe.db.get_value("Import Insurance", lc.import_insurance, "debit_account")
			# Try to find if we used a PI for the name
			pi_name = frappe.db.get_value("Purchase Invoice", {"import_insurance": lc.import_insurance, "docstatus": 1}, "name")
			if pi_name:
				desc += f" (Invoice: {pi_name})"
		
		lcv.append("taxes", {
			"description": desc, 
			"amount": insurance, 
			"base_amount": insurance,
			"account": account
		})

	# Use JEs if they exist, otherwise fallback to percentage-based calculation
	total_margin = 0
	if je_margin_total:
		total_margin = je_margin_total
	else:
		total_margin = flt(lc.base_grand_total) * (flt(lc.lc_margin) / 100.0)
	
	if total_margin:
		desc = "LC Margin"
		if je_margin_list:
			desc += f" (Journals: {', '.join([d.name for d in je_margin_list])})"
		
		lcv.append("taxes", {
			"description": desc, 
			"amount": total_margin, 
			"base_amount": total_margin
		})

	# Bulk Fetch Items for optimized performance
	if lcv.purchase_receipts:
		receipt_docs = {}
		for d in lcv.purchase_receipts:
			if d.receipt_document_type not in receipt_docs:
				receipt_docs[d.receipt_document_type] = []
			receipt_docs[d.receipt_document_type].append(d.receipt_document)
		
		default_cost_center = erpnext.get_default_cost_center(lc.company)
		
		for dtype, names in receipt_docs.items():
			items = frappe.get_all(dtype + " Item", 
				filters={"parent": ["in", names]},
				fields=["item_code", "description", "qty", "base_rate", "base_amount", "name", "cost_center", "parent", "is_fixed_asset"]
			)
			
			if not items:
				continue
				
			# Filter by stock item/fixed asset in one bulk query
			item_codes = list(set([d.item_code for d in items]))
			stock_items_info = frappe.get_all("Item", 
				filters={"name": ["in", item_codes]}, 
				fields=["name", "is_stock_item", "is_fixed_asset"]
			)
			allowed_items = {d.name for d in stock_items_info if d.is_stock_item or d.is_fixed_asset}
			
			for d in items:
				if d.item_code not in allowed_items:
					continue
					
				item = lcv.append("items")
				item.item_code = d.item_code
				item.description = d.description
				item.qty = d.qty
				item.rate = d.base_rate
				item.cost_center = d.cost_center or default_cost_center
				item.amount = d.base_amount
				item.receipt_document_type = dtype
				item.receipt_document = d.parent
				item.is_fixed_asset = d.is_fixed_asset
				item.purchase_receipt_item = d.name

	# Calculate totals only when items exist
	if lcv.items:
		lcv.set_total_taxes_and_charges()
		lcv.set_applicable_charges_on_item()

	return lcv
