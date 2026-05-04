from frappe import _

def get_data():
	return {
		"fieldname": "import_insurance",
		"non_standard_fieldnames": {
			"Import LC": "import_insurance",
			"Purchase Invoice": "import_insurance"
		},
		"transactions": [
			{
				"label": _("Procurement"),
				"items": []
			}
		]
	}