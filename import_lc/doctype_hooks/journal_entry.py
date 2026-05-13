import frappe
from frappe.utils import get_link_to_form

def validate_journal_entry_one_to_one(doc, method):
	if doc.get("voucher_type") == "LC Margin" and doc.get("import_lc"):
		existing_je = frappe.db.get_value("Journal Entry", 
			{
				"import_lc": doc.import_lc, 
				"voucher_type": "LC Margin",
				"name": ["!=", doc.name], 
				"docstatus": ["<", 2]
			}, "name")
		if existing_je:
			link = get_link_to_form("Journal Entry", existing_je)
			lc_link = get_link_to_form("Import LC", doc.import_lc)
			frappe.throw(f"LC Margin Journal Entry <b>{link}</b> already exists for Import LC <b>{lc_link}</b>")
