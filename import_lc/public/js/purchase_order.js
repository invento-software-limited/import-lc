frappe.ui.form.on("Purchase Order", {
	refresh: function (frm) {
		if (frm.doc.docstatus === 1 && frm.doc.purchase_type === "Import") {
			frm.add_custom_button(
				__("Proforma Invoice"),
				function () {
					frappe.model.open_mapped_doc({
						method: "import_lc.import_lc.doctype.proforma_invoice.proforma_invoice.make_proforma_invoice",
						frm: frm,
					});
				},
				__("Create")
			);
		}

		if (frm.doc.purchase_type === "Import") {
			if (!frm.doc.buyer && frm.doc.company) {
				frm.set_value("buyer", frm.doc.company);
			}
		}
	},

	purchase_type: function (frm) {
		if (frm.doc.purchase_type === "Import") {
			if (!frm.doc.buyer && frm.doc.company) {
				frm.set_value("buyer", frm.doc.company);
			}
		}
	},

	company: function (frm) {
		if (frm.doc.purchase_type === "Import") {
			frm.set_value("buyer", frm.doc.company);
		}
	},

	buyer: function (frm) {
		if (!frm.doc.buyer) {
			frm.set_value("buyer_name", "");
			frm.set_value("buyer_address", "");
			frm.set_value("buyer_contact", "");
			return;
		}

		frappe.db.get_value("Company", frm.doc.buyer, "company_name", function (r) {
			if (r && r.company_name) {
				frm.set_value("buyer_name", r.company_name);
			}
		});

		// Set filters
		frm.set_query("buyer_address", function () {
			return {
				query: "frappe.contacts.doctype.address.address.address_query",
				filters: { link_doctype: "Company", link_name: frm.doc.buyer },
			};
		});

		frm.set_query("buyer_contact", function () {
			return {
				query: "frappe.contacts.doctype.contact.contact.contact_query",
				filters: { link_doctype: "Company", link_name: frm.doc.buyer },
			};
		});

		// Auto-fetch address
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Address",
				filters: [
					["Dynamic Link", "link_doctype", "=", "Company"],
					["Dynamic Link", "link_name", "=", frm.doc.buyer],
					["disabled", "=", 0],
				],
				fields: ["name"],
				limit: 2,
			},
			callback: function (r) {
				if (r.message && r.message.length === 1) {
					frm.set_value("buyer_address", r.message[0].name);
				}
			},
		});

		// Auto-fetch contact
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Contact",
				filters: [
					["Dynamic Link", "link_doctype", "=", "Company"],
					["Dynamic Link", "link_name", "=", frm.doc.buyer],
				],
				fields: ["name"],
				limit: 2,
			},
			callback: function (r) {
				if (r.message && r.message.length === 1) {
					frm.set_value("buyer_contact", r.message[0].name);
				}
			},
		});
	},
});
