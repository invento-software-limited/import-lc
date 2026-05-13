// Helper: fetch Proforma Invoice data and populate PI fields
function fetch_proforma_invoice_data(frm, pi_name) {
	if (!pi_name) return;
	frappe.db.get_doc('Proforma Invoice', pi_name).then(pi => {
		frm.set_value({
			'purchase_type': 'Import',
			'pi_number': pi.pi_number,
			'pi_date': pi.pi_date,
			'country_of_final_destination': pi.country_of_final_destination,
			'port_of_loading': pi.port_of_loading,
			'port_of_discharge': pi.port_of_discharge,
			'supplier_phone_no': pi.supplier_phone_no,
			'supplier_email': pi.supplier_email,

			// Bank Information
			'bank': pi.bank,
			'swift_code': pi.swift_code,
			'branch': pi.bank_branch,
			'account_number__iban': pi.account_number_iban,
			'bank_address': pi.bank_address,

			// Buyer Information
			'buyer': pi.buyer,
			'buyer_name': pi.buyer_name,
			'buyer_phone_no': pi.phone_no,
			'buyer_email': pi.email,
			'buyer_full_address': pi.buyer_address,

			// Trade & Commercial Details
			'payment_terms': pi.payment_terms,
			'incoterm': pi.incoterm,
			'tolerance__on_total_pi_value': pi.tolerance_percent,
			'freight_charges': pi.freight_charges,
			'delivery_terms': pi.delivery_terms,
			'safta_clause': pi.safta_clause,

			// Shipment Details
			'mode_of_transport': pi.mode_of_transport,
			'mode_of_shipment_container_details': pi.mode_of_shipment,
			'transshipment': pi.transshipment,
			'partial_shipment': pi.partial_shipment,
			'shipment_conditions': pi.shipment_conditions,
			'currency': pi.currency,
			'supplier': pi.supplier
		});

		// Map PI items only if no real items exist yet
		const hasRealItems = frm.doc.items && frm.doc.items.some(i => i.item_code);
		if (!hasRealItems && pi.items && pi.items.length > 0) {
			frm.doc.items = [];
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
				row.country_of_origin = item.country_of_origin;
				row.packing_type = item.packing_type;
				row.total_qty = item.total_qty;
				row.total_volume_weight = item.total_volume_weight;
				row.rate_per_carton = item.rate_per_carton;
				row.total_amount_usd = item.total_amount_usd;
			});
			frm.refresh_field('items');
		}

		frm.trigger('refresh');
		frappe.show_alert({
			message: __('Data fetched from Proforma Invoice: {0}', [pi_name]),
			indicator: 'green'
		});
	});
}

frappe.ui.form.on('Purchase Invoice', {
	refresh: function (frm) {
		frm.toggle_display([
			'reference_section',
			'supplier_bank_section',
			'buyer_information_section',
			'trade_commercial_section',
			'shipment_details_section'
		], frm.doc.purchase_type === 'Import');
		frm.trigger('set_naming_series');

		if (frm.doc.purchase_type === 'Import') {
			['reference_section', 'supplier_bank_section', 'buyer_information_section', 
			 'trade_commercial_section', 'shipment_details_section'].forEach(section => {
				if (frm.fields_dict[section]) {
					frm.fields_dict[section].collapse(false);
				}
			});
		}
	},
	purchase_type: function (frm) {
		frm.trigger('refresh');
		frm.trigger('set_naming_series');
	},
	set_naming_series: function (frm) {
		let options = "ACC-PINV-.YYYY.-\nACC-PINV-RET-.YYYY.-";
		if (frm.doc.purchase_type === 'Import') {
			options += "\nCOM-INV-.YYYY.-";
			if (!frm.doc.naming_series || !frm.doc.naming_series.startsWith('COM-INV-')) {
				frm.set_value('naming_series', 'COM-INV-.YYYY.-');
			}
		} else {
			if (frm.doc.naming_series && frm.doc.naming_series.startsWith('COM-INV-')) {
				frm.set_value('naming_series', 'ACC-PINV-.YYYY.-');
			}
		}
		frm.set_df_property('naming_series', 'options', options);
	},
	import_lc: function (frm) {
		if (!frm.doc.import_lc) return;

		frappe.db.get_doc('Import LC', frm.doc.import_lc).then(lc => {
			// Step 1: Set LC header fields (proforma_invoice excluded here)
			frm.set_value({
				'purchase_type': 'Import',
				'lc_number': lc.lc_no,
				'port_of_loading': lc.port_of_loading,
				'port_of_discharge': lc.port_of_discharge,
				'mode_of_transport': lc.mode_of_transport,
				'country_of_final_destination': lc.final_destination,
				'transshipment': lc.transshipment,
				'partial_shipment': lc.partial_shipments,
				'currency': lc.currency,
				'incoterm': lc.incoterm,
				'payment_terms': lc.drafts_at,
				'tolerance__on_total_pi_value': lc.percentage_credit_amount_tolerance,
				'buyer': lc.applicant,
				'supplier': lc.beneficiary,
				'bank': lc.beneficiary_bank,
				'shipment_deadline': lc.latest_date_of_shipment,
				'import_insurance': lc.import_insurance,
			});

			// Step 2: Map LC items (ignore Frappe's default empty placeholder row)
			const hasRealItems = frm.doc.items && frm.doc.items.some(i => i.item_code);
			if (!hasRealItems && lc.items && lc.items.length > 0) {
				frm.doc.items = [];
				lc.items.forEach(item => {
					let row = frm.add_child('items');
					row.item_code = item.item_code;
					row.item_name = item.item_name;
					row.description = item.description;
					row.uom = item.uom;
					row.qty = item.qty;
					row.rate = item.rate;
					row.hs_code = item.hs_code;
					row.country_of_origin = item.country_of_origin;
					row.packing_type = item.packing_type;
					row.total_qty = item.total_qty;
					row.total_volume_weight = item.total_volume_weight;
					row.rate_per_carton = item.rate_per_carton;
					row.total_amount_usd = item.total_amount_usd;
				});
				frm.refresh_field('items');
			}

			// Step 3: Set proforma_invoice field value, then fetch PI data directly
			// (do not rely on the proforma_invoice event firing reliably here)
			if (lc.proforma_invoice) {
				frm.doc.proforma_invoice = lc.proforma_invoice;
				frm.refresh_field('proforma_invoice');
				fetch_proforma_invoice_data(frm, lc.proforma_invoice);
			}

			frm.trigger('refresh');
		});
	},
	proforma_invoice: function (frm) {
		// Fired when user manually selects a Proforma Invoice
		fetch_proforma_invoice_data(frm, frm.doc.proforma_invoice);
	},
	buyer_address: function (frm) {
		if (frm.doc.buyer_address) {
			frappe.contacts.get_address_display(frm, "buyer_address", "buyer_full_address");
		}
	}
});
