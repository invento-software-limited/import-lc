// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on("Import LC", {
    refresh(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Purchase Invoice'), function () {
                frappe.model.open_mapped_doc({
                    method: "import_lc.import_lc.doctype.import_lc.import_lc.make_purchase_invoice",
                    frm: frm
                });
            }, __('Create'));

            frm.add_custom_button(__('LC Margin'), function () {
                frappe.call({
                    method: "import_lc.import_lc.doctype.import_lc.import_lc.make_journal_entry",
                    args: {
                        source_name: frm.doc.name
                    },
                    callback: function (r) {
                        if (r.message) {
                            var doc = frappe.model.sync(r.message)[0];
                            frappe.set_route("Form", doc.doctype, doc.name);
                        }
                    }
                });
            }, __('Create'));
        }
    },
    tc_name: function (frm) {
        if (frm.doc.tc_name) {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Terms and Conditions",
                    filters: { name: frm.doc.tc_name },
                    fieldname: "terms"
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_value("terms", r.message.terms);
                    }
                }
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
    other_charges: function (frm) {
        calculate_totals(frm);
    },
    lc_margin: function (frm) {
        calculate_totals(frm);
    }
});

frappe.ui.form.on('Import LC Item', {
    qty: function (frm, cdt, cdn) {
        calculate_item_amount(frm, cdt, cdn);
    },
    rate: function (frm, cdt, cdn) {
        calculate_item_amount(frm, cdt, cdn);
    },
    items_remove: function (frm) {
        calculate_totals(frm);
    }
});

var calculate_item_amount = function (frm, cdt, cdn) {
    var row = locals[cdt][cdn];
    var amount = flt(row.qty) * flt(row.rate);
    frappe.model.set_value(cdt, cdn, "amount", amount);
    frappe.model.set_value(cdt, cdn, "total_amount_usd", amount);
    calculate_totals(frm);
};

var calculate_totals = function (frm) {
    var subtotal = 0;
    (frm.doc.items || []).forEach(function (item) {
        subtotal += flt(item.amount);
    });
    frm.set_value("total", subtotal);

    var grand_total = subtotal + flt(frm.doc.freight_charges) + flt(frm.doc.insurance_amount) + flt(frm.doc.other_charges);
    frm.set_value("grand_total", grand_total);

    // Calculate LC Margin Amount
    if (frm.doc.lc_margin) {
        var lc_margin_amount = grand_total * (flt(frm.doc.lc_margin) / 100.0);
        frm.set_value("lc_margin_amount", lc_margin_amount);
    } else {
        frm.set_value("lc_margin_amount", 0);
    }
};
