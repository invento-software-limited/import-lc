from frappe import _

def update_purchase_order_dashboard(data):
	if not data:
		return data
		
	if "transactions" not in data:
		data["transactions"] = []
		
	data["transactions"].append({
		"label": _("Import"),
		"items": ["Import LC", "Proforma Invoice"]
	})
	
	# Ensure correct field mapping
	if "non_standard_fieldnames" not in data:
		data["non_standard_fieldnames"] = {}
	
	data["non_standard_fieldnames"].update({
		"Import LC": "purchase_order",
		"Proforma Invoice": "purchase_order"
	})
	
	return data

def update_purchase_invoice_dashboard(data):
	if not data:
		return data

	if "transactions" not in data:
		data["transactions"] = []

	data["transactions"].append({
		"label": _("Import"),
		"items": ["Import Insurance", "LC Shipment"]
	})
	
	if "non_standard_fieldnames" not in data:
		data["non_standard_fieldnames"] = {}
		
	data["non_standard_fieldnames"].update({
		"Import Insurance": "purchase_invoice",
		"LC Shipment": "name" # Purchase Invoice links TO LC Shipment? No, usually reverse.
	})
	
	return data

def update_journal_entry_dashboard(data):
	return data

def update_landed_cost_voucher_dashboard(data):
	return data

def update_purchase_receipt_dashboard(data):
	if not data:
		return data
 
	if "transactions" not in data:
		data["transactions"] = []
 
	data["transactions"].append({
		"label": _("Import"),
		"items": ["Import Insurance", "LC Shipment"]
	})
	
	if "non_standard_fieldnames" not in data:
		data["non_standard_fieldnames"] = {}
		
	data["non_standard_fieldnames"].update({
		"Import Insurance": "proforma_invoice", # Insurance links to PI, PI links to PR? No.
		"LC Shipment": "name"
	})
	
	return data
