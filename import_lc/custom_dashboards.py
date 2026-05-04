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
	return data

def update_purchase_invoice_dashboard(data):
	if not data:
		return data

	if "transactions" not in data:
		data["transactions"] = []

	data["transactions"].append({
		"label": _("Import"),
		"items": ["Import Insurance"]
	})
	return data

def update_journal_entry_dashboard(data):
	return data

def update_landed_cost_voucher_dashboard(data):
	return data

def update_purchase_receipt_dashboard(data):
	return data
