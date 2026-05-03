from frappe import _

def get_data():
	return {
		"fieldname": "import_lc",
		"transactions": [
			{
				"label": _("Procurement"),
				"items": ["Purchase Order", "Proforma Invoice", "Purchase Invoice", "Purchase Receipt", "LC Shipment"]
			},
			{
				"label": _("Finance"),
				"items": ["Journal Entry", "Landed Cost Voucher"]
			},
			{
				"label": _("Others"),
				"items": ["Import Insurance"]
			}
		]
	}
