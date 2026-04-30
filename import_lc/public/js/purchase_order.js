frappe.ui.form.on('Purchase Order', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1 && frm.doc.purchase_type === 'Import') {
            frm.add_custom_button(__('Proforma Invoice'), function() {
                frappe.model.open_mapped_doc({
                    method: 'import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_proforma_invoice',
                    frm: frm
                });
            }, __('Create'));
        }
    }
});
