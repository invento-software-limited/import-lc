// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

// Helper: fetch Purchase Invoice data and populate PR fields
function fetch_purchase_invoice_data(frm, pi_name) {
	if (!pi_name) return;
	frappe.db.get_doc("Purchase Invoice", pi_name).then((pi) => {
		frm.set_value({
			purchase_type: "Import",
			import_lc: pi.import_lc,
			lc_no: pi.lc_number,
			lc_shipment: pi.lc_shipment,
			pi_number: pi.pi_number,
			pi_date: pi.pi_date,

			// Bank Information
			bank: pi.bank,
			swift_code: pi.swift_code,
			branch: pi.bank_branch,
			account_number__iban: pi.account_number_iban,
			bank_address: pi.bank_address,

			// Buyer Information
			buyer: pi.buyer,
			buyer_name: pi.buyer_name,
			buyer_phone_no: pi.phone_no,
			buyer_email: pi.email,
			buyer_address: pi.buyer_address,
			buyer_full_address: pi.buyer_full_address,

			// Trade & Commercial Details
			payment_terms: pi.payment_terms,
			incoterm: pi.incoterm,
			tolerance__on_total_pi_value: pi.tolerance_percent,
			freight_charges: pi.freight_charges,
			delivery_terms: pi.delivery_terms,
			safta_clause: pi.safta_clause,

			// Shipment Details
			port_of_loading: pi.port_of_loading,
			port_of_discharge: pi.port_of_discharge,
			shipment_deadline: pi.shipment_deadline,
			country_of_final_destination: pi.country_of_final_destination,
			mode_of_transport: pi.mode_of_transport,
			mode_of_shipment_container_details: pi.mode_of_shipment,
			transshipment: pi.transshipment,
			partial_shipment: pi.partial_shipment,
			shipment_conditions: pi.shipment_conditions,

			currency: pi.currency,
			supplier: pi.supplier,
		});

		// Map items from PI
		const hasRealItems = frm.doc.items && frm.doc.items.some((i) => i.item_code);
		if (!hasRealItems && pi.items && pi.items.length > 0) {
			frm.doc.items = [];
			pi.items.forEach((item) => {
				let row = frm.add_child("items");
				row.item_code = item.item_code;
				row.item_name = item.item_name;
				row.brand = item.brand;
				row.description = item.description;
				row.hs_code = item.hs_code;
				row.uom = item.uom;
				row.qty = item.qty;
				row.rate = item.rate;
				row.country_of_origin = item.country_of_origin;
				row.packing_type = item.packing_type;
				row.total_qty = item.total_qty;
				row.total_volume_weight = item.total_volume_weight;
				row.rate_per_carton = item.rate_per_carton;
				row.total_amount_usd = item.total_amount_usd;
			});
			frm.refresh_field("items");
		}

		frm.trigger("refresh");
		frappe.show_alert({
			message: __("Data fetched from Purchase Invoice: {0}", [pi_name]),
			indicator: "green",
		});
	});
}

frappe.ui.form.on("Purchase Receipt", {
	import_lc: function (frm) {
		if (!frm.doc.import_lc) return;

		// Auto-set purchase type
		frm.set_value("purchase_type", "Import");

		// Fetch basic info from Import LC
		frappe.db.get_value("Import LC", frm.doc.import_lc, ["currency", "lc_no"], (r) => {
			if (r) {
				if (r.currency) frm.set_value("currency", r.currency);
				if (r.lc_no) frm.set_value("lc_no", r.lc_no);
			}
		});

		// Search for linked Purchase Invoice
		frappe.db.get_value(
			"Purchase Invoice",
			{
				import_lc: frm.doc.import_lc,
				docstatus: ["<", 2],
			},
			"name",
			(r) => {
				if (r && r.name) {
					frm.set_value("purchase_invoice", r.name);
				}
			}
		);
	},

	purchase_invoice: function (frm) {
		if (frm.doc.purchase_invoice) {
			fetch_purchase_invoice_data(frm, frm.doc.purchase_invoice);
		}
	},

	buyer_address: function (frm) {
		if (frm.doc.buyer_address) {
			frappe.contacts.get_address_display(frm, "buyer_address", "buyer_full_address");
		}
	},

	purchase_type: function (frm) {
		// Clear import fields when switching back to Local
		if (frm.doc.purchase_type !== "Import") {
			frm.set_value("import_lc", null);
			frm.set_value("lc_no", null);
			frm.set_value("lc_shipment", null);
			frm.set_value("purchase_invoice", null);
		}
	},

	refresh: function (frm) {
		// Expand import sections by default
		if (frm.doc.purchase_type === "Import") {
			[
				"supplier_bank_information",
				"trade__commercial_details",
				"shipment_details",
				"buyer_address_tab",
			].forEach((section) => {
				if (frm.fields_dict[section]) {
					frm.fields_dict[section].collapse(false);
				}
			});
		}
	},
});
