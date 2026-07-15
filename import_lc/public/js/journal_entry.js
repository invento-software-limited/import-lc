frappe.ui.form.on("Journal Entry", {
	refresh: function (frm) {
		// If opened from dashboard with import_lc pre-linked, default to LC Margin
		if (
			frm.is_new() &&
			frm.doc.import_lc &&
			(frm.doc.voucher_type === "Journal Entry" || !frm.doc.voucher_type)
		) {
			frm.set_value("voucher_type", "LC Margin");
		}

		// Set visibility based on voucher_type
		if (frm.doc.voucher_type === "LC Margin" || frm.doc.voucher_type === "LC Expense") {
			if (frm.is_new() && frm.doc.import_lc) {
				fetch_lc_data(frm);
			}
		}
	},
	import_lc: function (frm) {
		if (
			frm.doc.import_lc &&
			(frm.doc.voucher_type === "Journal Entry" || !frm.doc.voucher_type)
		) {
			frm.set_value("voucher_type", "LC Margin");
		}
		fetch_lc_data(frm);
	},
	voucher_type: function (frm) {
		if (frm.doc.voucher_type === "LC Margin" || frm.doc.voucher_type === "LC Expense") {
			// Clear fields not relevant to current type before fetching new data
			if (frm.doc.voucher_type === "LC Expense") {
				frm.set_value({
					lc_margin: 0,
					lc_margin_amount: 0,
				});
			}

			// Reset accounts if they are just empty placeholders
			if (frm.doc.accounts && frm.doc.accounts.length > 0) {
				let has_accounts = frm.doc.accounts.some((row) => row.account);
				if (!has_accounts) {
					frm.set_value("accounts", []);
				}
			}

			fetch_lc_data(frm);
		} else {
			// Clear all LC fields if type is changed to something else entirely
			frm.set_value({
				import_lc: "",
				import_lc_amount: 0,
				lc_margin: 0,
				lc_margin_amount: 0,
			});

			// Clear accounts if they were just placeholders
			if (frm.doc.accounts && frm.doc.accounts.length > 0) {
				let has_accounts = frm.doc.accounts.some((row) => row.account);
				if (!has_accounts) {
					frm.set_value("accounts", []);
				}
			}
		}
	},
	lc_margin: function (frm) {
		calculate_margin_amount(frm);
	},
});

var fetch_lc_data = function (frm) {
	if (
		frm.doc.import_lc &&
		(frm.doc.voucher_type === "LC Margin" || frm.doc.voucher_type === "LC Expense")
	) {
		let perform_fetch = function () {
			frappe.db.get_value(
				"Import LC",
				frm.doc.import_lc,
				["base_grand_total", "lc_margin"],
				(r) => {
					if (r) {
						if (r.base_grand_total !== undefined) {
							frm.set_value("import_lc_amount", r.base_grand_total);
						}
						if (r.lc_margin !== undefined && frm.doc.voucher_type === "LC Margin") {
							frm.set_value("lc_margin", r.lc_margin);
						}
						if (frm.doc.voucher_type === "LC Margin") {
							calculate_margin_amount(frm);
						} else if (frm.doc.voucher_type === "LC Expense") {
							update_account_rows(frm, 0);
						}
					}
				}
			);
		};

		// Check for existing LC Margin entry if voucher_type is LC Margin
		if (frm.doc.voucher_type === "LC Margin") {
			frappe.db.get_value(
				"Journal Entry",
				{
					import_lc: frm.doc.import_lc,
					voucher_type: "LC Margin",
					name: ["!=", frm.doc.name],
					docstatus: ["<", 2],
				},
				"name",
				(r) => {
					if (r && r.name) {
						frm.set_value("import_lc", "");
						frappe.msgprint({
							title: __("Duplicate LC Margin"),
							indicator: "red",
							message: __(
								"An active LC Margin Journal Entry {0} already exists for this Import LC.",
								[frappe.utils.get_form_link("Journal Entry", r.name)]
							),
						});
					} else {
						perform_fetch();
					}
				}
			);
		} else {
			perform_fetch();
		}
	}
};

var calculate_margin_amount = function (frm) {
	if (
		frm.doc.voucher_type === "LC Margin" &&
		frm.doc.lc_margin !== undefined &&
		frm.doc.import_lc_amount !== undefined
	) {
		var amount = flt(frm.doc.import_lc_amount) * (flt(frm.doc.lc_margin) / 100.0);
		frm.set_value("lc_margin_amount", amount);
		update_account_rows(frm, amount);
	}
};

var update_account_rows = function (frm, amount) {
	if (!frm.doc.accounts || frm.doc.accounts.length < 2) {
		// Clear empty placeholder rows if they have no account selected
		if (frm.doc.accounts && frm.doc.accounts.length > 0 && !frm.doc.accounts[0].account) {
			frm.set_value("accounts", []);
		}

		// Add two placeholder rows if table is empty
		if (!frm.doc.accounts || frm.doc.accounts.length === 0) {
			let row1 = frm.add_child("accounts");
			row1.debit_in_account_currency = amount;
			row1.debit = amount;
			row1.prev_calculated_amount = amount;

			let row2 = frm.add_child("accounts");
			row2.credit_in_account_currency = amount;
			row2.credit = amount;
			row2.prev_calculated_amount = amount;

			frm.refresh_field("accounts");
			return;
		}
	}

	// If we already have 2+ rows, update them
	if (frm.doc.accounts && frm.doc.accounts.length >= 2) {
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
