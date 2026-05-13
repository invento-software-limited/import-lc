// Copyright (c) 2026, Invento Software Limited and contributors
// For license information, please see license.txt

frappe.ui.form.on('Landed Cost Voucher', {
    import_lc: function(frm) {
        if (!frm.doc.import_lc) return;

        frappe.call({
            method: "import_lc.import_lc.doctype.import_lc.import_lc.make_landed_cost_voucher",
            args: {
                source_name: frm.doc.import_lc
            },
            freeze: true,
            freeze_message: __("Fetching Items and Charges..."),
            callback: function(r) {
                if (!r.message) return;
                let doc = r.message;

                // Helper: stamp each row with required Frappe child metadata
                function stamp_rows(rows, parentfield, doctype) {
                    return (rows || []).map(function(row, idx) {
                        return Object.assign({}, row, {
                            name: frappe.utils.get_random(10),
                            __islocal: 1,
                            __unsaved: 1,
                            docstatus: 0,
                            parent: frm.doc.name,
                            parentfield: parentfield,
                            parenttype: frm.doctype,
                            doctype: doctype,
                            idx: idx + 1
                        });
                    });
                }

                // Directly replace arrays — NO per-row events, NO set_value overhead
                frm.doc.purchase_receipts = stamp_rows(
                    doc.purchase_receipts,
                    "purchase_receipts",
                    "Landed Cost Purchase Receipt"
                );
                frm.doc.taxes = stamp_rows(
                    doc.taxes,
                    "taxes",
                    "Landed Cost Taxes and Charges"
                );
                frm.doc.items = stamp_rows(
                    doc.items,
                    "items",
                    "Landed Cost Item"
                );

                // Scalar fields
                if (doc.lc_no) frm.doc.lc_no = doc.lc_no;
                if (doc.total_taxes_and_charges) {
                    frm.doc.total_taxes_and_charges = doc.total_taxes_and_charges;
                }

                // Single render pass — no cascading re-renders
                frm.refresh_field("purchase_receipts");
                frm.refresh_field("taxes");
                frm.refresh_field("items");
                frm.refresh_field("lc_no");
                frm.refresh_field("total_taxes_and_charges");
                frm.dirty();

                frappe.show_alert({message: __('Data fetched from Import LC'), indicator: 'green'});
            }
        });
    }
});
