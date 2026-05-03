// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on('Purchase Receipt', {
    purchase_invoice: function(frm) {
        if (!frm.doc.purchase_invoice) return;

        frappe.db.get_value('Purchase Invoice', frm.doc.purchase_invoice, [
            'purchase_type', 'import_lc', 'lc_shipment'
        ], function(r) {
            if (!r) return;

            if (r.purchase_type) {
                frm.set_value('purchase_type', r.purchase_type);
            }
            if (r.import_lc) {
                // lc_no will auto-populate via fetch_from when import_lc is set
                frm.set_value('import_lc', r.import_lc);
            }
            if (r.lc_shipment) {
                frm.set_value('lc_shipment', r.lc_shipment);
            }
        });
    },

    purchase_type: function(frm) {
        // Clear import fields when switching back to Local
        if (frm.doc.purchase_type !== 'Import') {
            frm.set_value('import_lc', null);
            frm.set_value('lc_no', null);
            frm.set_value('lc_shipment', null);
            frm.set_value('purchase_invoice', null);
        }
    }
});
