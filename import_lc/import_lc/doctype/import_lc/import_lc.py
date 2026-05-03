# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


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
				"partial_shipments": "partial_shipment"
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
