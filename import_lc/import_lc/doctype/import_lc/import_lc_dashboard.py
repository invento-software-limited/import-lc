from frappe import _

def get_data():
	return {
		"fieldname": "import_lc",
		"transactions": [
			{
				"label": _("Procurement"),
				"items": ["Purchase Invoice", "Purchase Receipt", "LC Shipment"]
			},
			{
				"label": _("Finance"),
				"items": ["Journal Entry"]
			},
			{
				"label": _("Others"),
				"items": []
			}
		]
	}
