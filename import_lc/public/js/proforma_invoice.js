frappe.ui.form.on('Proforma Invoice', {
    refresh: function (frm) {
        if (frm.doc.docstatus === 1) {
            // Create Import Insurance button
            frm.add_custom_button(__('Import Insurance'), function () {
                frappe.model.open_mapped_doc({
                    method: 'import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_import_insurance',
                    frm: frm
                });
            }, __('Create'));

            // Create Import LC button
            frm.add_custom_button(__('Import LC'), function () {
                frappe.model.open_mapped_doc({
                    method: 'import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_import_lc',
                    frm: frm
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
    purchase_order: function(frm) {
        if (frm.doc.purchase_order) {
            frappe.call({
                method: "import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_proforma_invoice",
                args: {
                    source_name: frm.doc.purchase_order
                },
                callback: function(r) {
                    if (r.message) {
                        let doc = r.message;
                        
                        // Map main fields safely
                        Object.keys(doc).forEach(key => {
                            if (key !== "name" && key !== "doctype" && key !== "items" && !key.startsWith("_")) {
                                if (doc[key]) {
                                    frm.set_value(key, doc[key]);
                                }
                            }
                        });

                        // Map items
                        if (doc.items && doc.items.length > 0) {
                            frm.clear_table("items");
                            doc.items.forEach(item => {
                                let row = frm.add_child("items");
                                Object.keys(item).forEach(key => {
                                    if (key !== "name" && key !== "doctype" && key !== "parent" && key !== "parentfield" && key !== "parenttype" && !key.startsWith("_")) {
                                        if (item[key] !== undefined && item[key] !== null) {
                                            row[key] = item[key];
                                        }
                                    }
                                });
                            });
                            frm.refresh_field("items");
                        }
                        
                        calculate_totals(frm);
                        frappe.show_alert({message: __('Data fetched from Purchase Order'), indicator: 'green'});
                    }
                }
            });
        }
    }
});

frappe.ui.form.on('Proforma Invoice Item', {
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
    // Assuming Total Amount (USD) is same as amount for now, or you can add currency conversion logic
    frappe.model.set_value(cdt, cdn, "total_amount_usd", amount);
    calculate_totals(frm);
};

var calculate_totals = function (frm) {
    var subtotal = 0;
    (frm.doc.items || []).forEach(function (item) {
        subtotal += flt(item.amount);
    });
    frm.set_value("subtotal", subtotal);

    // Sync freight charges from Trade Details to Summary
    frm.set_value("freight_charges_amount", frm.doc.freight_charges);

    var grand_total = subtotal + flt(frm.doc.freight_charges);
    frm.set_value("grand_total", grand_total);
    frm.set_value("rounded_total", Math.round(grand_total));
};
