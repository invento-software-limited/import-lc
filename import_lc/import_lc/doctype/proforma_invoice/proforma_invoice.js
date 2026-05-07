frappe.ui.form.on('Proforma Invoice', {
    refresh: function (frm) {
        if (frm.doc.supplier_address && !frm.doc.address_display) {
            frm.trigger('supplier_address');
        }
        if (frm.doc.supplier_contact && !frm.doc.supplier_phone_no) {
            frm.trigger('supplier_contact');
        }
        // Always apply query filters based on current supplier
        if (frm.doc.supplier) {
            frm.set_query('supplier_address', function () {
                return {
                    query: 'frappe.contacts.doctype.address.address.address_query',
                    filters: { link_doctype: 'Supplier', link_name: frm.doc.supplier }
                };
            });
            frm.set_query('supplier_contact', function () {
                return {
                    query: 'frappe.contacts.doctype.contact.contact.contact_query',
                    filters: { link_doctype: 'Supplier', link_name: frm.doc.supplier }
                };
            });
        }
        // Buyer: auto-populate address/contact display and apply query filters
        if (frm.doc.buyer_address && !frm.doc.buyer_address_display) {
            frm.trigger('buyer_address');
        }
        if (frm.doc.buyer_contact && !frm.doc.buyer_phone_no) {
            frm.trigger('buyer_contact');
        }
        toggle_base_currency_fields(frm);
        if (frm.doc.buyer) {
            frm.set_query('buyer_address', function () {
                return {
                    query: 'frappe.contacts.doctype.address.address.address_query',
                    filters: { link_doctype: 'Company', link_name: frm.doc.buyer }
                };
            });
            frm.set_query('buyer_contact', function () {
                return {
                    query: 'frappe.contacts.doctype.contact.contact.contact_query',
                    filters: { link_doctype: 'Company', link_name: frm.doc.buyer }
                };
            });
        }
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

    supplier: function (frm) {
        // Clear dependent fields when supplier changes
        frm.set_value('supplier_address', '');
        frm.set_value('address_display', '');
        frm.set_value('supplier_contact', '');
        frm.set_value('supplier_phone_no', '');
        frm.set_value('supplier_email', '');

        if (!frm.doc.supplier) return;

        // Set filter on supplier_address
        frm.set_query('supplier_address', function () {
            return {
                query: 'frappe.contacts.doctype.address.address.address_query',
                filters: {
                    link_doctype: 'Supplier',
                    link_name: frm.doc.supplier
                }
            };
        });

        // Set filter on supplier_contact
        frm.set_query('supplier_contact', function () {
            return {
                query: 'frappe.contacts.doctype.contact.contact.contact_query',
                filters: {
                    link_doctype: 'Supplier',
                    link_name: frm.doc.supplier
                }
            };
        });

        // Auto-fetch address if exactly one exists for this supplier
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Address',
                filters: [
                    ['Dynamic Link', 'link_doctype', '=', 'Supplier'],
                    ['Dynamic Link', 'link_name', '=', frm.doc.supplier],
                    ['disabled', '=', 0]
                ],
                fields: ['name'],
                limit: 2
            },
            callback: function (r) {
                if (r.message && r.message.length === 1) {
                    frm.set_value('supplier_address', r.message[0].name);
                }
            }
        });

        // Auto-fetch contact if exactly one exists for this supplier
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Contact',
                filters: [
                    ['Dynamic Link', 'link_doctype', '=', 'Supplier'],
                    ['Dynamic Link', 'link_name', '=', frm.doc.supplier]
                ],
                fields: ['name'],
                limit: 2
            },
            callback: function (r) {
                if (r.message && r.message.length === 1) {
                    frm.set_value('supplier_contact', r.message[0].name);
                }
            }
        });
    },

    supplier_address: function (frm) {
        if (frm.doc.supplier_address) {
            frappe.call({
                method: 'frappe.contacts.doctype.address.address.get_address_display',
                args: { address_dict: frm.doc.supplier_address },
                callback: function (r) {
                    if (r.message) {
                        let address = r.message.replace(/<br\s*\/?>/gi, '');
                        frm.set_value('address_display', address);
                    }
                }
            });
        } else {
            frm.set_value('address_display', '');
        }
    },

    supplier_contact: function (frm) {
        if (frm.doc.supplier_contact) {
            frappe.call({
                method: 'frappe.client.get',
                args: {
                    doctype: 'Contact',
                    name: frm.doc.supplier_contact
                },
                callback: function (r) {
                    if (r.message) {
                        let contact = r.message;
                        // Get primary phone
                        let phone = '';
                        if (contact.phone_nos && contact.phone_nos.length) {
                            let primary = contact.phone_nos.find(p => p.is_primary_mobile_no) ||
                                contact.phone_nos.find(p => p.is_primary_phone) ||
                                contact.phone_nos[0];
                            phone = primary ? primary.phone : '';
                        }
                        // Get primary email
                        let email = '';
                        if (contact.email_ids && contact.email_ids.length) {
                            let primary = contact.email_ids.find(e => e.is_primary) || contact.email_ids[0];
                            email = primary ? primary.email_id : '';
                        }
                        frm.set_value('supplier_phone_no', phone);
                        frm.set_value('supplier_email', email);
                    }
                }
            });
        } else {
            frm.set_value('supplier_phone_no', '');
            frm.set_value('supplier_email', '');
        }
    },

    buyer: function (frm) {
        // Clear dependent fields when buyer changes
        frm.set_value('buyer_address', '');
        frm.set_value('buyer_address_display', '');
        frm.set_value('buyer_contact', '');
        frm.set_value('buyer_phone_no', '');
        frm.set_value('buyer_email', '');

        if (!frm.doc.buyer) return;

        // Set filter on buyer_address
        frm.set_query('buyer_address', function () {
            return {
                query: 'frappe.contacts.doctype.address.address.address_query',
                filters: { link_doctype: 'Company', link_name: frm.doc.buyer }
            };
        });

        // Set filter on buyer_contact
        frm.set_query('buyer_contact', function () {
            return {
                query: 'frappe.contacts.doctype.contact.contact.contact_query',
                filters: { link_doctype: 'Company', link_name: frm.doc.buyer }
            };
        });

        // Fetch phone/email directly from Company
        frappe.call({
            method: 'frappe.client.get_value',
            args: {
                doctype: 'Company',
                filters: { name: frm.doc.buyer },
                fieldname: ['phone_no', 'email']
            },
            callback: function (r) {
                if (r.message) {
                    frm.set_value('buyer_phone_no', r.message.phone_no || '');
                    frm.set_value('buyer_email', r.message.email || '');
                }
            }
        });

        // Auto-fetch address if exactly one exists for this buyer
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Address',
                filters: [
                    ['Dynamic Link', 'link_doctype', '=', 'Company'],
                    ['Dynamic Link', 'link_name', '=', frm.doc.buyer],
                    ['disabled', '=', 0]
                ],
                fields: ['name'],
                limit: 2
            },
            callback: function (r) {
                if (r.message && r.message.length === 1) {
                    frm.set_value('buyer_address', r.message[0].name);
                }
            }
        });

        // Auto-fetch contact if exactly one exists for this buyer
        frappe.call({
            method: 'frappe.client.get_list',
            args: {
                doctype: 'Contact',
                filters: [
                    ['Dynamic Link', 'link_doctype', '=', 'Company'],
                    ['Dynamic Link', 'link_name', '=', frm.doc.buyer]
                ],
                fields: ['name'],
                limit: 2
            },
            callback: function (r) {
                if (r.message && r.message.length === 1) {
                    frm.set_value('buyer_contact', r.message[0].name);
                }
            }
        });
    },

    buyer_address: function (frm) {
        if (frm.doc.buyer_address) {
            frappe.call({
                method: 'frappe.contacts.doctype.address.address.get_address_display',
                args: { address_dict: frm.doc.buyer_address },
                callback: function (r) {
                    if (r.message) {
                        let address = r.message.replace(/<br\s*\/?>/gi, '');
                        frm.set_value('buyer_address_display', address);
                    }
                }
            });
        } else {
            frm.set_value('buyer_address_display', '');
        }
    },

    buyer_contact: function (frm) {
        if (frm.doc.buyer_contact) {
            // Contact selected — override phone/email from Contact
            frappe.call({
                method: 'frappe.client.get',
                args: { doctype: 'Contact', name: frm.doc.buyer_contact },
                callback: function (r) {
                    if (r.message) {
                        let contact = r.message;
                        let phone = '';
                        if (contact.phone_nos && contact.phone_nos.length) {
                            let primary = contact.phone_nos.find(p => p.is_primary_mobile_no) ||
                                contact.phone_nos.find(p => p.is_primary_phone) ||
                                contact.phone_nos[0];
                            phone = primary ? primary.phone : '';
                        }
                        let email = '';
                        if (contact.email_ids && contact.email_ids.length) {
                            let primary = contact.email_ids.find(e => e.is_primary) || contact.email_ids[0];
                            email = primary ? primary.email_id : '';
                        }
                        frm.set_value('buyer_phone_no', phone);
                        frm.set_value('buyer_email', email);
                    }
                }
            });
        } else if (frm.doc.buyer) {
            // Contact cleared — fall back to Company phone/email
            frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'Company',
                    filters: { name: frm.doc.buyer },
                    fieldname: ['phone_no', 'email']
                },
                callback: function (r) {
                    if (r.message) {
                        frm.set_value('buyer_phone_no', r.message.phone_no || '');
                        frm.set_value('buyer_email', r.message.email || '');
                    }
                }
            });
        } else {
            frm.set_value('buyer_phone_no', '');
            frm.set_value('buyer_email', '');
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

    currency: function (frm) {
        if (frm.doc.currency && frm.doc.company) {
            frappe.db.get_value('Company', frm.doc.company, 'default_currency', function (r) {
                if (r && r.default_currency) {
                    if (frm.doc.currency === r.default_currency) {
                        frm.set_value('conversion_rate', 1.0);
                    } else {
                        frappe.call({
                            method: "erpnext.setup.utils.get_exchange_rate",
                            args: {
                                transaction_date: frm.doc.pi_date || frappe.datetime.get_today(),
                                from_currency: frm.doc.currency,
                                to_currency: r.default_currency
                            },
                            callback: function (r2) {
                                frm.set_value('conversion_rate', flt(r2.message));
                            }
                        });
                    }
                }
            });
        }
        toggle_base_currency_fields(frm);
    },

    conversion_rate: function (frm) {
        // Re-calculate all items and totals with new conversion rate
        if (frm.doc.items && frm.doc.items.length > 0) {
            frm.doc.items.forEach(item => {
                var base_rate = flt(item.rate) * flt(frm.doc.conversion_rate || 1);
                var base_amount = flt(item.amount) * flt(frm.doc.conversion_rate || 1);
                frappe.model.set_value(item.doctype, item.name, 'base_rate', base_rate);
                frappe.model.set_value(item.doctype, item.name, 'base_amount', base_amount);
            });
        }
        calculate_totals(frm);
    },

    purchase_order: function (frm) {
        if (frm.doc.purchase_order) {
            frappe.call({
                method: "import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_proforma_invoice",
                args: {
                    source_name: frm.doc.purchase_order
                },
                callback: function (r) {
                    if (r.message) {
                        let doc = r.message;

                        // Map main fields safely
                        Object.keys(doc).forEach(key => {
                            if (key !== "name" && key !== "doctype" && key !== "items" && !key.startsWith("_")) {
                                if (doc[key]) {
                                    if (frm.fields_dict[key]) {
                                        frm.set_value(key, doc[key]);
                                    }
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

                        // Cascade all buyer data (phone, email, address, contact)
                        // since buyer is set from PO's company
                        if (frm.doc.buyer) {
                            frm.trigger('buyer');
                        }

                        frappe.show_alert({ message: __('Data fetched from Purchase Order'), indicator: 'green' });
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
    var total = flt(row.qty) * flt(row.rate);
    var base_rate = flt(row.rate) * flt(frm.doc.conversion_rate || 1);
    var base_total = total * flt(frm.doc.conversion_rate || 1);

    frappe.model.set_value(cdt, cdn, "total", total);
    frappe.model.set_value(cdt, cdn, "base_rate", base_rate);
    frappe.model.set_value(cdt, cdn, "base_total", base_total);

    // Assuming Total Amount (USD) is same as total for now
    frappe.model.set_value(cdt, cdn, "total_amount_usd", total);
    calculate_totals(frm);
};

var calculate_totals = function (frm) {
    var total = 0;
    var base_total = 0;

    (frm.doc.items || []).forEach(function (item) {
        total += flt(item.total);
        base_total += flt(item.base_total);
    });
    frm.set_value("total", total);
    frm.set_value("base_total", base_total);

    var conversion_rate = flt(frm.doc.conversion_rate) || 1;
    var base_freight = flt(frm.doc.freight_charges) * conversion_rate;

    var grand_total = total + flt(frm.doc.freight_charges);
    var base_grand_total = base_total + base_freight;

    frm.set_value("grand_total", grand_total);
    frm.set_value("rounded_total", Math.round(grand_total));

    frm.set_value("base_grand_total", base_grand_total);
    frm.set_value("base_rounded_total", Math.round(base_grand_total));
};

var toggle_base_currency_fields = function(frm) {
    if (frm.doc.company && frm.doc.currency) {
        frappe.db.get_value('Company', frm.doc.company, 'default_currency', function(r) {
            let hide_base = false;
            if (r && r.default_currency && frm.doc.currency === r.default_currency) {
                hide_base = true;
            }
            frm.toggle_display(['conversion_rate', 'base_total', 'base_grand_total', 'base_rounded_total', 'base_in_words'], !hide_base);
            if (frm.fields_dict.items && frm.fields_dict.items.grid) {
                frm.fields_dict.items.grid.toggle_display('base_rate', !hide_base);
                frm.fields_dict.items.grid.toggle_display('base_total', !hide_base);
            }
        });
    }
};
