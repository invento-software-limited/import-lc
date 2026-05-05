// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on("LC Shipment", {
	refresh: function(frm) {
		if (frm.doc.docstatus === 1) {
			frm.add_custom_button(__('Landed Cost Voucher'), function () {
				frappe.model.open_mapped_doc({
					method: "import_lc.import_lc.doctype.import_lc.import_lc.make_landed_cost_voucher",
					frm: frm
				});
			}, __('Create'));
		}
	},
	import_lc: function(frm) {
		if (frm.doc.import_lc) {
			frappe.db.get_doc("Import LC", frm.doc.import_lc).then(lc => {
				frm.set_value("company", lc.company);
				frm.set_value("supplier", lc.beneficiary);
				frm.set_value("currency", lc.currency);
				frm.set_value("freight_currency", lc.currency);
				frm.set_value("port_of_loading", lc.port_of_loading);
				frm.set_value("port_of_discharge", lc.port_of_discharge);
			});
		}
	},

	freight_amount: function(frm) { calculate_total_charges(frm); },
	insurance_amount: function(frm) { calculate_total_charges(frm); },
	other_charges: function(frm) { calculate_total_charges(frm); }
});

frappe.ui.form.on("LC Shipment Item", {
	qty: function(frm, cdt, cdn) { calculate_item_amount(frm, cdt, cdn); },
	rate: function(frm, cdt, cdn) { calculate_item_amount(frm, cdt, cdn); },
	
	item_code: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		if (row.item_code) {
			frappe.db.get_value("Item", row.item_code, ["item_name", "description", "stock_uom", "brand"]).then(r => {
				if (r.message) {
					frappe.model.set_value(cdt, cdn, "item_name", r.message.item_name);
					frappe.model.set_value(cdt, cdn, "description", r.message.description);
					frappe.model.set_value(cdt, cdn, "uom", r.message.stock_uom);
					frappe.model.set_value(cdt, cdn, "brand", r.message.brand);
				}
			});
		}
	}
});

function calculate_item_amount(frm, cdt, cdn) {
	let row = locals[cdt][cdn];
	frappe.model.set_value(cdt, cdn, "amount", (row.qty || 0) * (row.rate || 0));
}

function calculate_total_charges(frm) {
	let total = (frm.doc.freight_amount || 0) + 
				(frm.doc.insurance_amount || 0) + 
				(frm.doc.other_charges || 0);
	frm.set_value("total_cnf_amount", total);
}
