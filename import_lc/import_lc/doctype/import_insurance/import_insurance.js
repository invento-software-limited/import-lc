// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on("Import Insurance", {
    refresh(frm) {
        frm.set_query('purchase_invoice', function() {
            return {
                filters: {
                    proforma_invoice: frm.doc.proforma_invoice
                }
            };
        });
        frm.set_query('import_lc', function() {
            return {
                filters: {
                    proforma_invoice: frm.doc.proforma_invoice
                }
            };
        });
    },
    proforma_invoice: function(frm) {
        if (frm.doc.proforma_invoice) {
            frappe.call({
                method: "import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_import_insurance",
                args: {
                    source_name: frm.doc.proforma_invoice
                },
                callback: function(r) {
                    if (r.message) {
                        let doc = r.message;
                        
                        // Map main fields safely
                        Object.keys(doc).forEach(key => {
                            if (key !== "name" && key !== "doctype" && key !== "items" && !key.startsWith("_")) {
                                if (doc[key] !== undefined && doc[key] !== null && doc[key] !== "") {
                                    if (frm.fields_dict[key]) {
                                        frm.set_value(key, doc[key]);
                                    }
                                }
                            }
                        });
                        
                        frappe.show_alert({message: __('Data fetched from Proforma Invoice'), indicator: 'green'});
                    }
                }
            });
        }
    }
});
