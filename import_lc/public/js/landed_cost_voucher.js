// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on("Landed Cost Voucher", {
	import_lc: function (frm) {
		if (frm.doc.import_lc) {
			fetch_lc_data(frm, "Import LC", frm.doc.import_lc);
		}
	},
});

function fetch_lc_data(frm, doctype, name) {
	frappe.call({
		method: "import_lc.import_lc.doctype.import_lc.import_lc.make_landed_cost_voucher",
		args: {
			source_name: name,
			source_doctype: doctype,
		},
		freeze: true,
		freeze_message: __("Fetching Items and Charges..."),
		callback: function (r) {
			if (!r.message) return;
			let doc = r.message;
			console.log("Fetched LCV Data:", doc);
			if (doc.taxes) console.log("Taxes Table:", doc.taxes);
			if (doc.purchase_receipts) console.log("Vouchers Table:", doc.purchase_receipts);

			// Map scalar fields
			frm.set_value("company", doc.company);
			frm.set_value("lc_no", doc.lc_no);
			frm.set_value(
				"distribute_charges_based_on",
				doc.distribute_charges_based_on || "Amount"
			);
			frm.set_value("total_taxes_and_charges", doc.total_taxes_and_charges);

			// Clear and Map child tables
			frm.clear_table("purchase_receipts");
			(doc.purchase_receipts || []).forEach((row) => {
				let d = frm.add_child("purchase_receipts");
				Object.keys(row).forEach((key) => {
					if (!key.startsWith("_") && key !== "name") {
						d[key] = row[key];
					}
				});
			});

			frm.clear_table("taxes");
			(doc.taxes || []).forEach((row) => {
				let d = frm.add_child("taxes");
				Object.keys(row).forEach((key) => {
					if (!key.startsWith("_") && key !== "name") {
						d[key] = row[key];
					}
				});
			});

			frm.clear_table("vendor_invoices");
			(doc.vendor_invoices || []).forEach((row) => {
				let d = frm.add_child("vendor_invoices");
				Object.keys(row).forEach((key) => {
					if (!key.startsWith("_") && key !== "name") {
						d[key] = row[key];
					}
				});
			});

			frm.clear_table("items");
			(doc.items || []).forEach((row) => {
				let d = frm.add_child("items");
				Object.keys(row).forEach((key) => {
					if (!key.startsWith("_") && key !== "name") {
						d[key] = row[key];
					}
				});
			});

			frm.refresh_fields();
			frappe.show_alert({ message: __("Data fetched from " + doctype), indicator: "green" });
		},
	});
}
