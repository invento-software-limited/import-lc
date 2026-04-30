frappe.ui.form.on('Proforma Invoice', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1) {
            // Create Import Insurance button
            frm.add_custom_button(__('Import Insurance'), function() {
                frappe.model.open_mapped_doc({
                    method: 'import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_import_insurance',
                    frm: frm
                });
            }, __('Create'));

            // Create Sales Invoice button (standard ERPNext mapped flow)
            frm.add_custom_button(__('Sales Invoice'), function() {
                frappe.model.open_mapped_doc({
                    method: 'import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_sales_invoice',
                    frm: frm
                });
            }, __('Create'));
        }
    }
});
