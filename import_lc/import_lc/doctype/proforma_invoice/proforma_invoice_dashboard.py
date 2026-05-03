from frappe import _

def get_data():
	return {
		"fieldname": "proforma_invoice",
		"transactions": [
			{
				"label": _("Procurement"),
				"items": ["Purchase Order", "Import LC", "Purchase Invoice", "Purchase Receipt"]
			},
			{
				"label": _("Logistics"),
				"items": ["Import Insurance"]
			}
		]
	}
