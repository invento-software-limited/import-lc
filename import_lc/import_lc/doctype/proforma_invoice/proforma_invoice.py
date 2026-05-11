# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe.model.mapper import get_mapped_doc


from frappe.utils import flt, money_in_words

class ProformaInvoice(Document):
	def validate(self):
		self.calculate_totals()
		self.set_in_words()

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
		
		self.grand_total = flt(self.total) + flt(self.freight_charges)
		self.base_grand_total = flt(self.base_total) + (flt(self.freight_charges) * flt(self.conversion_rate or 1))
		
		self.rounded_total = round(self.grand_total)
		self.base_rounded_total = round(self.base_grand_total)

	def set_in_words(self):
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
				"bank": "bank",
				"swift_code": "swift_code",
				"bank_branch": "bank_branch",
				"account_number_iban": "account_number_iban",
				"bank_address": "bank_address",
				"buyer_name": "buyer_name",
				"buyer_address": "buyer_address",
				"buyer_full_address": "buyer_address_display",
				"buyer_contact": "buyer_contact",
				"buyer_phone_no": "buyer_phone_no",
				"buyer_email": "buyer_email",
				"currency": "currency",
				"conversion_rate": "conversion_rate",
				"payment_terms": "payment_terms",
				"incoterm": "incoterm",
				"tolerance_percent": "tolerance_percent",
				"freight_charges": "freight_charges",
				"delivery_terms": "delivery_terms",
				"safta_clause": "safta_clause",
				"port_of_loading": "port_of_loading",
				"port_of_discharge": "port_of_discharge",
				"country_of_final_destination": "country_of_final_destination",
				"mode_of_transport": "mode_of_transport",
				"mode_of_shipment": "mode_of_shipment",
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
				"description": "description",
				"hs_code": "hs_code",
				"qty": "qty",
				"uom": "uom",
				"rate": "rate",
				"base_rate": "base_rate",
				"amount": "total",
				"base_amount": "base_total",
				"tolerance_percent": "tolerance_percent",
				"brand": "brand",
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
				"base_rate": "base_rate",
				"amount": "total",
				"base_amount": "base_total"
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
				"supplier": "beneficiary",
				"supplier_address": "beneficiary_address",
				"bank": "beneficiary_bank",
				"buyer": "applicant",
				"buyer_address": "applicant_address",
				"country_of_origin": "country_of_origin",
				"currency": "currency",
				"conversion_rate": "conversion_rate",
				"total": "total",
				"base_total": "base_total",
				"grand_total": "grand_total",
				"base_grand_total": "base_grand_total",
				"rounded_total": "rounded_total",
				"base_rounded_total": "base_rounded_total",
				"in_words": "in_words",
				"base_in_words": "base_in_words",
				"payment_terms": "drafts_at",
				"incoterm": "incoterm",
				"tolerance_percent": "percentage_credit_amount_tolerance",
				"freight_charges": "freight_charges",
				"delivery_terms": "delivery_terms",
				"safta_clause": "safta_clause",
				"port_of_loading": "port_of_loading",
				"port_of_discharge": "port_of_discharge",
				"country_of_final_destination": "final_destination",
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
				"total": "total",
				"base_total": "base_total",
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
		target.naming_series = "COM-INV-.YYYY.-"
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
				"total_qty": "total_qty",
				"total_volume_weight": "total_volume_weight",
				"rate_per_carton": "rate_per_carton",
				"total_amount_usd": "total_amount_usd"
			}
		}
	}, target_doc, set_missing_values)

	return doclist
