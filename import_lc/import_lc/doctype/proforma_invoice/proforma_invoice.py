# Copyright (c) 2026, Invento Software Limited and contributors
# For license information, please see license.txt

# import frappe
from frappe.model.document import Document


class ProformaInvoice(Document):
	pass

import frappe
from frappe.model.mapper import get_mapped_doc

@frappe.whitelist()
def make_proforma_invoice(source_name, target_doc=None):
	def set_missing_values(source, target):
		target.purchase_order = source.name

	doclist = get_mapped_doc("Purchase Order", source_name, {
		"Purchase Order": {
			"doctype": "Proforma Invoice",
			"field_map": {
				"name": "purchase_order",
				"supplier": "supplier",
				"currency": "currency",
				"incoterm": "incoterm",
				"total_qty": "total_qty",
				"total": "total",
				"grand_total": "grand_total",
				"rounded_total": "rounded_total",
				"in_words": "in_words"
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
				"amount": "amount",
				"tolerance_percent": "tolerance_percent"
			}
		}
	}, target_doc, set_missing_values)

	return doclist


@frappe.whitelist()
def make_import_insurance(source_name, target_doc=None):
	def set_missing_values(source, target):
		target.proforma_invoice = source.name
		target.currency = source.currency
		if source.items:
			goods = ", ".join([d.item_name for d in source.items if d.item_name])
			target.goods_description = goods

	doclist = get_mapped_doc("Proforma Invoice", source_name, {
		"Proforma Invoice": {
			"doctype": "Import Insurance",
			"field_map": {
				"name": "proforma_invoice",
				"supplier_name": "insured_party",
				"currency": "currency",
				"total_invoice_value": "insured_value",
				"incoterm": "incoterm"
			}
		}
	}, target_doc, set_missing_values)

	return doclist


@frappe.whitelist()
def make_sales_invoice(source_name, target_doc=None):
	def set_missing_values(source, target):
		target.proforma_invoice = source.name
		target.currency = source.currency

	doclist = get_mapped_doc("Proforma Invoice", source_name, {
		"Proforma Invoice": {
			"doctype": "Sales Invoice",
			"field_map": {
				"supplier": "customer",
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
