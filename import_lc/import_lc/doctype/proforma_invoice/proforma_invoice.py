# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


from frappe.utils import money_in_words

class ProformaInvoice(Document):
	def validate(self):
		self.in_words = money_in_words(self.grand_total, self.currency)
		company_currency = frappe.db.get_value("Company", self.company, "default_currency")
		if company_currency:
			self.base_in_words = money_in_words(self.base_grand_total, company_currency)


@frappe.whitelist()
def make_proforma_invoice(source_name, target_doc=None):
	"""Create Proforma Invoice from Purchase Order."""
	def set_missing_values(source, target):
		target.purchase_order = source.name
		target.buyer = source.company  # Set PO company as the buyer in Proforma Invoice

	doclist = get_mapped_doc("Purchase Order", source_name, {
		"Purchase Order": {
			"doctype": "Proforma Invoice",
			"field_map": {
				"name": "purchase_order",
				"company": "company",
				"supplier": "supplier",
				"supplier_name": "supplier_name",
				"supplier_address": "supplier_address",
				"address_display": "address_display",
				"contact_person": "supplier_contact",
				"contact_mobile": "supplier_phone_no",
				"contact_email": "supplier_email",
				"buyer_name": "buyer_name",
				"buyer_address": "buyer_address",
				"buyer_contact": "buyer_contact",
				"currency": "currency",
				"conversion_rate": "conversion_rate",
				"incoterm": "incoterm",
				"port_of_loading": "port_of_loading",
				"port_of_discharge": "port_of_discharge",
				"partial_shipment": "partial_shipment",
				"transshipment": "transshipment",
				"shipment_conditions": "shipment_conditions",
				"tc_name": "tc_name",
				"terms": "terms"
			}
		},
		"Purchase Order Item": {
			"doctype": "Proforma Invoice Item",
			"field_map": {
				"item_code": "item_code",
				"item_name": "item_name",
				"hs_code": "hs_code",
				"qty": "qty",
				"uom": "uom",
				"rate": "rate",
				"base_rate": "base_rate",
				"amount": "amount",
				"base_amount": "base_amount",
				"tolerance_percent": "tolerance_percent",
				"brand": "brand"
			}
		}
	}, target_doc, set_missing_values)

	return doclist


@frappe.whitelist()
def make_import_insurance(source_name, target_doc=None):
	"""Create Import Insurance from Proforma Invoice."""
	def set_missing_values(source, target):
		target.proforma_invoice = source.name
		# Set currency to company default since we are using base_grand_total
		from erpnext import get_company_currency
		target.currency = get_company_currency(source.company)
		
		if source.items:
			goods = ", ".join([d.item_name for d in source.items if d.item_name])
			target.goods_description = goods

	doclist = get_mapped_doc("Proforma Invoice", source_name, {
		"Proforma Invoice": {
			"doctype": "Import Insurance",
			"field_map": {
				"name": "proforma_invoice",
				"buyer_name": "insured_party",
				"base_grand_total": "insured_value",
				"incoterm": "incoterm",
				"port_of_loading": "port_of_loading",
				"port_of_discharge": "port_of_discharge"
			}
		}
	}, target_doc, set_missing_values)

	return doclist


@frappe.whitelist()
def make_sales_invoice(source_name, target_doc=None):
	"""Create Sales Invoice from Proforma Invoice."""
	def set_missing_values(source, target):
		target.currency = source.currency

	doclist = get_mapped_doc("Proforma Invoice", source_name, {
		"Proforma Invoice": {
			"doctype": "Sales Invoice",
			"field_map": {
				"currency": "currency",
				"grand_total": "grand_total",
				"rounded_total": "rounded_total",
				"in_words": "in_words"
			}
		},
		"Proforma Invoice Item": {
			"doctype": "Sales Invoice Item",
			"field_map": {
				"item_code": "item_code",
				"item_name": "item_name",
				"qty": "qty",
				"uom": "uom",
				"rate": "rate",
				"amount": "amount"
			}
		}
	}, target_doc, set_missing_values)

	return doclist

@frappe.whitelist()
def make_import_lc(source_name, target_doc=None):
	"""Create Import LC from Proforma Invoice."""
	def set_missing_values(source, target):
		target.proforma_invoice = source.name
		target.currency = source.currency
		target.lc_amount = source.grand_total

	doclist = get_mapped_doc("Proforma Invoice", source_name, {
		"Proforma Invoice": {
			"doctype": "Import LC",
			"field_map": {
				"company": "company",
				"supplier": "supplier",
				"supplier_name": "supplier_name",
				"supplier_address": "supplier_address",
				"address_display": "address_display",
				"country_of_origin": "country_of_origin",
				"bank": "issuing_bank",
				"buyer": "buyer",
				"buyer_name": "buyer_name",
				"phone_no": "phone_no",
				"email": "email",
				"buyer_address": "buyer_address",
				"currency": "currency",
				"conversion_rate": "conversion_rate",
				"grand_total": "lc_amount",
				"base_grand_total": "base_lc_amount",
				"payment_terms": "payment_terms",
				"incoterm": "incoterm",
				"tolerance_percent": "tolerance_percent",
				"freight_charges": "freight_charges",
				"delivery_terms": "delivery_terms",
				"safta_clause": "safta_clause",
				"port_of_loading": "port_of_loading",
				"port_of_discharge": "port_of_discharge",
				"final_destination": "final_destination",
				"country_of_final_destination": "country_of_final_destination",
				"mode_of_transport": "mode_of_transport",
				"mode_of_shipment": "mode_of_shipment",
				"transshipment": "transshipment",
				"partial_shipment": "partial_shipment",
				"shipment_conditions": "shipment_conditions",
				"purchase_order": "purchase_order"
			}
		},
		"Proforma Invoice Item": {
			"doctype": "Import LC Item",
			"field_map": {
				"item_code": "item_code",
				"item_name": "item_name",
				"description": "description",
				"brand": "brand",
				"hs_code": "hs_code",
				"qty": "qty",
				"uom": "uom",
				"rate": "rate",
				"base_rate": "base_rate",
				"amount": "amount",
				"base_amount": "base_amount",
				"packing_type": "packing_type",
				"packing_details": "packing_details",
				"total_qty": "total_qty",
				"total_volume_weight": "total_volume_weight",
				"rate_per_carton": "rate_per_carton",
				"total_amount_usd": "total_amount_usd"
			}
		}
	}, target_doc, set_missing_values)

	return doclist

@frappe.whitelist()
def make_purchase_invoice(source_name, target_doc=None):
	"""Create Purchase Invoice from Proforma Invoice."""
	def set_missing_values(source, target):
		target.purchase_type = "Import"
		target.proforma_invoice = source.name

	doclist = get_mapped_doc("Proforma Invoice", source_name, {
		"Proforma Invoice": {
			"doctype": "Purchase Invoice",
			"field_map": {
				"pi_number": "pi_number",
				"pi_date": "pi_date",
				"invoice_date": "invoice_date",
				"pi_validity_date": "pi_validity_date",
				"supplier": "supplier",
				"supplier_name": "supplier_name",
				"supplier_address": "supplier_address",
				"address_display": "address_display",
				"supplier_phone_no": "supplier_phone_no",
				"supplier_email": "supplier_email",
				"bank": "bank",
				"swift_code": "swift_code",
				"bank_branch": "bank_branch",
				"account_number_iban": "account_number_iban",
				"bank_address": "bank_address",
				"buyer": "buyer",
				"buyer_name": "buyer_name",
				"phone_no": "phone_no",
				"email": "email",
				"buyer_address": "buyer_address",
				"currency": "currency",
				"conversion_rate": "conversion_rate",
				"payment_terms": "payment_terms",
				"incoterm": "incoterm",
				"tolerance_percent": "tolerance_percent",
				"freight_charges": "freight_charges",
				"base_freight_charges_amount": "base_taxes_and_charges_added",
				"grand_total": "grand_total",
				"base_grand_total": "base_grand_total",
				"rounded_total": "rounded_total",
				"base_rounded_total": "base_rounded_total",
				"delivery_terms": "delivery_terms",
				"safta_clause": "safta_clause",
				"port_of_loading": "port_of_loading",
				"port_of_discharge": "port_of_discharge",
				"country_of_final_destination": "country_of_final_destination",
				"mode_of_transport": "mode_of_transport",
				"mode_of_shipment": "mode_of_shipment",
				"transshipment": "transshipment",
				"partial_shipment": "partial_shipment",
				"shipment_conditions": "shipment_conditions"
			}
		},
		"Proforma Invoice Item": {
			"doctype": "Purchase Invoice Item",
			"field_map": {
				"item_code": "item_code",
				"item_name": "item_name",
				"description": "description",
				"brand": "brand",
				"hs_code": "hs_code",
				"qty": "qty",
				"uom": "uom",
				"rate": "rate",
				"base_rate": "base_rate",
				"amount": "amount",
				"base_amount": "base_amount",
				"packing_type": "packing_type",
				"total_qty": "custom_total_qty",
				"total_volume_weight": "total_volume_weight",
				"rate_per_carton": "rate_per_carton",
				"total_amount_usd": "total_amount_usd"
			}
		}
	}, target_doc, set_missing_values)

	return doclist
