from frappe import _

def get_data():
	return {
		"fieldname": "proforma_invoice",
		"transactions": [
			{
				"label": _("Procurement"),
				"items": ["Import LC", "Purchase Invoice", "Purchase Order"]
			},
			{
				"label": _("Logistics"),
				"items": ["Import Insurance"]
			}
		]
	}
