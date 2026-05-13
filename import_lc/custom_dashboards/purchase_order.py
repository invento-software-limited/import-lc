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
