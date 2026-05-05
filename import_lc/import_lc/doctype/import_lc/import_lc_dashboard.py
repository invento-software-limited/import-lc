from frappe import _

def get_data():
	return {
		"fieldname": "import_lc",
		"non_standard_fieldnames": {
			"Purchase Invoice": "import_lc",
			"Purchase Receipt": "import_lc",
			"LC Shipment": "import_lc",
			"Journal Entry": "import_lc",
			"Landed Cost Voucher": "import_lc",
			"Import Insurance": "import_lc"
		},
		"transactions": [
			{
				"label": _("Procurement"),
				"items": ["Purchase Invoice", "Purchase Receipt"]
			},
			{
				"label": _("Finance"),
				"items": ["Journal Entry", "Landed Cost Voucher"]
			},
			{
				"label": _("Others"),
				"items": ["Import Insurance", "LC Shipment"]
			}
		]
	}
