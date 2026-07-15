import frappe
from frappe.utils import get_link_to_form


def validate_purchase_invoice_one_to_one(doc, method):
	if doc.get("purchase_type") == "Import" and doc.get("import_lc"):
		existing_pi = frappe.db.get_value(
			"Purchase Invoice",
			{"import_lc": doc.import_lc, "name": ["!=", doc.name], "docstatus": ["<", 2]},
			"name",
		)
		if existing_pi:
			link = get_link_to_form("Purchase Invoice", existing_pi)
			lc_link = get_link_to_form("Import LC", doc.import_lc)
			frappe.throw(f"Commercial Invoice <b>{link}</b> already exists for Import LC <b>{lc_link}</b>")


def populate_virtual_fields(doc, method=None):
	"""
	Populate virtual fields that don't have a DB column.
	"""
	if not doc.get("import_insurance"):
		# Since we can't have a column on tabPurchase Invoice due to row size limits,
		# we fetch the back-link from the Import Insurance table.
		doc.import_insurance = frappe.db.get_value("Import Insurance", {"purchase_invoice": doc.name})
