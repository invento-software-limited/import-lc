from frappe import _
 
def get_data():
	return {
		"fieldname": "lc_shipment",
		"transactions": [
			{
				"label": _("Procurement"),
				"items": ["Purchase Receipt", "Purchase Invoice"]
			}
		]
	}
