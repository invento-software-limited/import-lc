// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on("Import LC", {
	refresh(frm) {
		if (frm.doc.docstatus === 1) {
			frm.add_custom_button(
				__("Commercial Invoice"),
				function () {
					frappe.model.open_mapped_doc({
						method: "import_lc.import_lc.doctype.import_lc.import_lc.make_purchase_invoice",
						frm: frm,
					});
				},
				__("Create")
			);

			frm.add_custom_button(
				__("Purchase Receipt"),
				function () {
					frappe.model.open_mapped_doc({
						method: "import_lc.import_lc.doctype.import_lc.import_lc.make_purchase_receipt",
						frm: frm,
					});
				},
				__("Create")
			);

			frm.add_custom_button(
				__("LC Margin"),
				function () {
					frappe.call({
						method: "import_lc.import_lc.doctype.import_lc.import_lc.make_journal_entry",
						args: {
							source_name: frm.doc.name,
						},
						callback: function (r) {
							if (r.message) {
								var doc = frappe.model.sync(r.message)[0];
								frappe.set_route("Form", doc.doctype, doc.name);
							}
						},
					});
				},
				__("Create")
			);

			frm.add_custom_button(
				__("Difference Expense Booking"),
				function () {
					frappe.call({
						method: "import_lc.import_lc.doctype.import_lc.import_lc.make_lc_expense_journal_entry",
						args: {
							source_name: frm.doc.name,
						},
						callback: function (r) {
							if (r.message) {
								var doc = frappe.model.sync(r.message)[0];
								frappe.set_route("Form", doc.doctype, doc.name);
							}
						},
					});
				},
				__("Create")
			);

			frm.add_custom_button(
				__("Landed Cost Voucher"),
				function () {
					frappe.call({
						method: "import_lc.import_lc.doctype.import_lc.import_lc.make_landed_cost_voucher",
						args: {
							source_name: frm.doc.name,
						},
						callback: function (r) {
							if (r.message) {
								var doc = frappe.model.sync(r.message)[0];
								frappe.set_route("Form", doc.doctype, doc.name);
							}
						},
					});
				},
				__("Create")
			);
		}

		frm.set_query("import_insurance", function () {
			return {
				filters: {
					proforma_invoice: frm.doc.proforma_invoice,
				},
			};
		});

		toggle_base_currency_fields(frm);
	},
	tc_name: function (frm) {
		if (frm.doc.tc_name) {
			frappe.call({
				method: "frappe.client.get_value",
				args: {
					doctype: "Terms and Conditions",
					filters: { name: frm.doc.tc_name },
					fieldname: "terms",
				},
				callback: function (r) {
					if (r.message) {
						frm.set_value("terms", r.message.terms);
					}
				},
			});
		} else {
			frm.set_value("terms", "");
		}
	},
	freight_charges: function (frm) {
		calculate_totals(frm);
	},
	insurance_amount: function (frm) {
		calculate_totals(frm);
	},
	import_insurance: function (frm) {
		if (frm.doc.import_insurance) {
			frappe.db.get_value(
				"Import Insurance",
				frm.doc.import_insurance,
				"insurance_premium",
				(r) => {
					if (r && r.insurance_premium) {
						frm.set_value("insurance_amount", r.insurance_premium);
					}
				}
			);
		}
	},
	other_charges: function (frm) {
		calculate_totals(frm);
	},
	lc_margin: function (frm) {
		calculate_totals(frm);
	},
	currency: function (frm) {
		frm.trigger("get_conversion_rate");
		toggle_base_currency_fields(frm);
	},
	conversion_rate: function (frm) {
		// Re-calculate all items and totals with new conversion rate
		if (frm.doc.items && frm.doc.items.length > 0) {
			frm.doc.items.forEach((item) => {
				var base_rate = flt(item.rate) * flt(frm.doc.conversion_rate || 1);
				var base_total = flt(item.total) * flt(frm.doc.conversion_rate || 1);
				frappe.model.set_value(item.doctype, item.name, "base_rate", base_rate);
				frappe.model.set_value(item.doctype, item.name, "base_total", base_total);
			});
		}
		calculate_totals(frm);
	},
	date_of_issue: function (frm) {
		frm.trigger("get_conversion_rate");
	},
	get_conversion_rate: function (frm) {
		if (frm.doc.currency && frm.doc.company) {
			frappe.call({
				method: "erpnext.setup.utils.get_exchange_rate",
				args: {
					from_currency: frm.doc.currency,
					to_currency: frappe.get_doc(":Company", frm.doc.company).default_currency,
					transaction_date: frm.doc.date_of_issue || frappe.datetime.get_today(),
				},
				callback: function (r) {
					if (r.message) {
						frm.set_value("conversion_rate", r.message);
					}
				},
			});
		}
	},
	proforma_invoice: function (frm) {
		if (frm.doc.proforma_invoice) {
			frappe.call({
				method: "import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_import_lc",
				args: {
					source_name: frm.doc.proforma_invoice,
				},
				callback: function (r) {
					if (r.message) {
						let doc = r.message;

						// Map main fields safely
						Object.keys(doc).forEach((key) => {
							if (
								key !== "name" &&
								key !== "doctype" &&
								key !== "items" &&
								!key.startsWith("_")
							) {
								if (
									doc[key] !== undefined &&
									doc[key] !== null &&
									doc[key] !== ""
								) {
									if (frm.fields_dict[key]) {
										frm.set_value(key, doc[key]);
									}
								}
							}
						});

						// Map items
						if (doc.items && doc.items.length > 0) {
							frm.clear_table("items");
							doc.items.forEach((item) => {
								let row = frm.add_child("items");
								Object.keys(item).forEach((key) => {
									if (
										key !== "name" &&
										key !== "doctype" &&
										key !== "parent" &&
										key !== "parentfield" &&
										key !== "parenttype" &&
										!key.startsWith("_")
									) {
										if (item[key] !== undefined && item[key] !== null) {
											row[key] = item[key];
										}
									}
								});
							});
							frm.refresh_field("items");
						}

						calculate_totals(frm);
						toggle_base_currency_fields(frm);
						frappe.show_alert({
							message: __("Data fetched from Proforma Invoice"),
							indicator: "green",
						});
					}
				},
			});
		}
	},
});

frappe.ui.form.on("Import LC Item", {
	qty: function (frm, cdt, cdn) {
		calculate_item_amount(frm, cdt, cdn);
	},
	rate: function (frm, cdt, cdn) {
		calculate_item_amount(frm, cdt, cdn);
	},
	items_remove: function (frm) {
		calculate_totals(frm);
	},
});

var calculate_item_amount = function (frm, cdt, cdn) {
	var row = locals[cdt][cdn];
	var total = flt(row.qty) * flt(row.rate);
	var conversion_rate = flt(frm.doc.conversion_rate) || 1;
	var base_rate = flt(row.rate) * conversion_rate;
	var base_total = total * conversion_rate;

	frappe.model.set_value(cdt, cdn, "total", total);
	frappe.model.set_value(cdt, cdn, "base_rate", base_rate);
	frappe.model.set_value(cdt, cdn, "base_total", base_total);

	frappe.model.set_value(cdt, cdn, "total_amount_usd", total);
	calculate_totals(frm);
};

var calculate_totals = function (frm) {
	var total = 0;
	var base_total = 0;
	var total_qty = 0;

	(frm.doc.items || []).forEach(function (item) {
		total += flt(item.total);
		base_total += flt(item.base_total);
		total_qty += flt(item.qty);
	});

	frm.set_value("total", total);
	frm.set_value("base_total", base_total);
	frm.set_value("total_qty", total_qty);

	var conversion_rate = flt(frm.doc.conversion_rate) || 1;

	var grand_total = total;
	var base_grand_total = grand_total * conversion_rate;

	frm.set_value("grand_total", grand_total);
	frm.set_value("rounded_total", Math.round(grand_total));

	frm.set_value("base_grand_total", base_grand_total);
	frm.set_value("base_rounded_total", Math.round(base_grand_total));
};

var toggle_base_currency_fields = function (frm) {
	if (frm.doc.company && frm.doc.currency) {
		frappe.db.get_value("Company", frm.doc.company, "default_currency", function (r) {
			let hide_base = false;
			if (r && r.default_currency && frm.doc.currency === r.default_currency) {
				hide_base = true;
			}
			frm.toggle_display(
				[
					"conversion_rate",
					"base_total",
					"base_grand_total",
					"base_rounded_total",
					"base_in_words",
				],
				!hide_base
			);
			if (frm.fields_dict.items && frm.fields_dict.items.grid) {
				frm.fields_dict.items.grid.toggle_display("base_rate", !hide_base);
				frm.fields_dict.items.grid.toggle_display("base_total", !hide_base);
			}
		});
	}
};
