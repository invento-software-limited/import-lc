frappe.ui.form.on("Journal Entry", {
	import_lc: function(frm) {
		if (frm.doc.import_lc && frm.doc.voucher_type === "LC Margin") {
			frappe.db.get_value("Import LC", frm.doc.import_lc, "grand_total", (r) => {
				if (r && r.grand_total) {
					frm.doc.lc_total_amount = r.grand_total; // Helper for calculation
					calculate_margin_amount(frm);
				}
			});
		}
	},
	lc_margin: function(frm) {
		calculate_margin_amount(frm);
	}
});

var calculate_margin_amount = function(frm) {
	if (frm.doc.voucher_type === "LC Margin" && frm.doc.lc_margin) {
		if (frm.doc.import_lc && !frm.doc.lc_total_amount) {
			frappe.db.get_value("Import LC", frm.doc.import_lc, "grand_total", (r) => {
				if (r && r.grand_total) {
					var amount = flt(r.grand_total) * (flt(frm.doc.lc_margin) / 100.0);
					frm.set_value("lc_margin_amount", amount);
					update_account_rows(frm, amount);
				}
			});
		} else if (frm.doc.lc_total_amount) {
			var amount = flt(frm.doc.lc_total_amount) * (flt(frm.doc.lc_margin) / 100.0);
			frm.set_value("lc_margin_amount", amount);
			update_account_rows(frm, amount);
		}
	}
};

var update_account_rows = function(frm, amount) {
	if (frm.doc.accounts && frm.doc.accounts.length >= 2) {
		// Update first two rows if they are empty or already match previous calculation
		// This is a helper for the "Create" button flow
		let row1 = frm.doc.accounts[0];
		let row2 = frm.doc.accounts[1];
		
		if (!row1.debit || row1.debit === row1.prev_calculated_amount) {
			frappe.model.set_value(row1.doctype, row1.name, "debit_in_account_currency", amount);
			row1.prev_calculated_amount = amount;
		}
		if (!row2.credit || row2.credit === row2.prev_calculated_amount) {
			frappe.model.set_value(row2.doctype, row2.name, "credit_in_account_currency", amount);
			row2.prev_calculated_amount = amount;
		}
	}
};
