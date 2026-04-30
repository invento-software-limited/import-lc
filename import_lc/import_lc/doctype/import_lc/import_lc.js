// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on("Import LC", {
    refresh(frm) {
        // Any refresh logic
    },
    tc_name: function(frm) {
        if (frm.doc.tc_name) {
            frappe.call({
                method: "frappe.client.get_value",
                args: {
                    doctype: "Terms and Conditions",
                    filters: { name: frm.doc.tc_name },
                    fieldname: "terms"
                },
                callback: function(r) {
                    if (r.message) {
                        frm.set_value("terms", r.message.terms);
                    }
                }
            });
        } else {
            frm.set_value("terms", "");
        }
    },
    freight_charges: function(frm) {
        calculate_totals(frm);
    }
});

frappe.ui.form.on('Import LC Item', {
    qty: function(frm, cdt, cdn) {
        calculate_item_amount(frm, cdt, cdn);
    },
    rate: function(frm, cdt, cdn) {
        calculate_item_amount(frm, cdt, cdn);
    },
    items_remove: function(frm) {
        calculate_totals(frm);
    }
});

var calculate_item_amount = function(frm, cdt, cdn) {
    var row = locals[cdt][cdn];
    var amount = flt(row.qty) * flt(row.rate);
    frappe.model.set_value(cdt, cdn, "amount", amount);
    frappe.model.set_value(cdt, cdn, "total_amount_usd", amount);
    calculate_totals(frm);
};

var calculate_totals = function(frm) {
    var subtotal = 0;
    (frm.doc.items || []).forEach(function(item) {
        subtotal += flt(item.amount);
    });
    frm.set_value("subtotal", subtotal);
    
    var grand_total = subtotal + flt(frm.doc.freight_charges);
    frm.set_value("grand_total", grand_total);
};
