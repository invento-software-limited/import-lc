from frappe import _


def update_purchase_receipt_dashboard(data):
	if not data:
		return data

	if "transactions" not in data:
		data["transactions"] = []

	data["transactions"].append({"label": _("Import"), "items": ["Import Insurance", "LC Shipment"]})

	if "non_standard_fieldnames" not in data:
		data["non_standard_fieldnames"] = {}

	data["non_standard_fieldnames"].update({"Import Insurance": "proforma_invoice", "LC Shipment": "name"})

	return data
