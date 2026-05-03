frappe.ui.form.on('Purchase Invoice', {
	refresh: function (frm) {
		// Set visibility based on purchase_type
		frm.toggle_display([
			'reference_section',
			'supplier_bank_section',
			'buyer_information_section',
			'trade_commercial_section',
			'shipment_details_section'
		], frm.doc.purchase_type === 'Import');
	},
	purchase_type: function (frm) {
		frm.trigger('refresh');
	},
	import_lc: function (frm) {
		if (frm.doc.import_lc) {
			frappe.db.get_doc('Import LC', frm.doc.import_lc).then(lc => {
				frm.set_value({
					'purchase_type': 'Import',
					'lc_number': lc.lc_no,
					'proforma_invoice': lc.proforma_invoice,
					'port_of_loading': lc.port_of_loading,
					'port_of_discharge': lc.port_of_discharge,
					'mode_of_transport': lc.mode_of_transport,
					'country_of_final_destination': lc.final_destination,
					'transshipment': lc.transshipment,
					'partial_shipment': lc.partial_shipments,
					'currency': lc.currency,
					'incoterm': lc.incoterm,
					'payment_terms': lc.drafts_at,
					'tolerance_percent': lc.percentage_credit_amount_tolerance,
					'buyer': lc.applicant,
					'supplier': lc.beneficiary,
					'bank': lc.beneficiary_bank
				});

				// Map items if table is empty
				if (!frm.doc.items || frm.doc.items.length === 0) {
					lc.items.forEach(item => {
						let row = frm.add_child('items');
						row.item_code = item.item_code;
						row.qty = item.qty;
						row.rate = item.rate;
						row.amount = item.amount;
						row.hs_code = item.hs_code;
						row.item_name = item.item_name;
						row.description = item.description;
						row.uom = item.uom;
						row.packing_type = item.packing_type;
						row.custom_total_qty = item.total_qty;
						row.total_volume_weight = item.total_volume_weight;
						row.rate_per_carton = item.rate_per_carton;
						row.total_amount_usd = item.total_amount_usd;
					});
					frm.refresh_field('items');
				}
				
				// If proforma invoice is also linked in LC, trigger its fetch too to get more details
				if (lc.proforma_invoice && !frm.doc.proforma_invoice) {
					frm.set_value('proforma_invoice', lc.proforma_invoice);
				}
				
				frm.trigger('refresh');
			});
		}
	},
	proforma_invoice: function (frm) {
		if (frm.doc.proforma_invoice) {
			frappe.db.get_doc('Proforma Invoice', frm.doc.proforma_invoice).then(pi => {
				frm.set_value({
					'purchase_type': 'Import',
					'pi_number': pi.pi_number,
					'pi_date': pi.pi_date,
					'country_of_origin': pi.country_of_origin,
					'port_of_loading': pi.port_of_loading,
					'port_of_discharge': pi.port_of_discharge,
					'supplier_phone_no': pi.supplier_phone_no,
					'supplier_email': pi.supplier_email,

					// Bank Information
					'bank': pi.bank,
					'swift_code': pi.swift_code,
					'bank_branch': pi.bank_branch,
					'account_number_iban': pi.account_number_iban,
					'bank_address': pi.bank_address,
					
					// Buyer Information
					'buyer': pi.buyer,
					'buyer_name': pi.buyer_name,
					'phone_no': pi.phone_no,
					'email': pi.email,
					'buyer_address': pi.buyer_address,
					
					// Trade & Commercial Details
					'payment_terms': pi.payment_terms,
					'incoterm': pi.incoterm,
					'tolerance_percent': pi.tolerance_percent,
					'freight_charges': pi.freight_charges,
					'delivery_terms': pi.delivery_terms,
					'safta_clause': pi.safta_clause,

					// Shipment Details
					'mode_of_transport': pi.mode_of_transport,
					'mode_of_shipment': pi.mode_of_shipment,
					'transshipment': pi.transshipment,
					'partial_shipment': pi.partial_shipment,
					'shipment_conditions': pi.shipment_conditions,
					'country_of_final_destination': pi.country_of_final_destination,
					'currency': pi.currency,
					'supplier': pi.supplier
				});

				// Map items if table is empty
				if (!frm.doc.items || frm.doc.items.length === 0) {
					pi.items.forEach(item => {
						let row = frm.add_child('items');
						row.item_code = item.item_code;
						row.item_name = item.item_name;
						row.brand = item.brand;
						row.description = item.description;
						row.hs_code = item.hs_code;
						row.uom = item.uom;
						row.qty = item.qty;
						row.rate = item.rate;
						row.amount = item.amount;
						row.packing_type = item.packing_type;
						row.custom_total_qty = item.total_qty;
						row.total_volume_weight = item.total_volume_weight;
						row.rate_per_carton = item.rate_per_carton;
						row.total_amount_usd = item.total_amount_usd;
					});
					frm.refresh_field('items');
				}
				frm.trigger('refresh');
			});
		}
	}
});
