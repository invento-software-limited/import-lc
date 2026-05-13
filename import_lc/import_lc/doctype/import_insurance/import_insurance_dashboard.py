from frappe import _

def get_data():
	return {
		"fieldname": "import_insurance",
		"transactions": [
			{
				"label": _("Procurement"),
				"items": ["Purchase Invoice"]
			},
		]
	}