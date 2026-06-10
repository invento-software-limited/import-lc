import frappe


def run():
	# 1. Add Custom DocPerm for Payment Entry to Import LC User (if not exists)
	doctypes_to_grant = [
		"Purchase Order",
		"Purchase Invoice",
		"Proforma Invoice",
		"Import Insurance",
		"Import LC",
		"Journal Entry",
		"LC Shipment",
		"Purchase Receipt",
		"Landed Cost Voucher",
		"Payment Entry",
	]

	for dt in doctypes_to_grant:
		# Ensure Import LC User has full permission
		if not frappe.db.exists("Custom DocPerm", {"parent": dt, "role": "Import LC User"}):
			doc = frappe.new_doc("Custom DocPerm")
			doc.parent = dt
			doc.parenttype = "DocType"
			doc.parentfield = "permissions"
			doc.role = "Import LC User"
			doc.permlevel = 0
			doc.read = 1
			doc.write = 1
			doc.create = 1
			doc.delete = 1
			doc.submit = 1
			doc.cancel = 1
			doc.amend = 1
			doc.insert()
			print(f"Added Import LC User perm for {dt}")
		else:
			# update to make sure they have all permissions
			doc = frappe.get_doc("Custom DocPerm", {"parent": dt, "role": "Import LC User"})
			doc.read = doc.write = doc.create = doc.delete = doc.submit = doc.cancel = doc.amend = 1
			doc.save()
			print(f"Updated Import LC User perm for {dt}")

		# Ensure Import LC Manager has full permission
		if not frappe.db.exists("Custom DocPerm", {"parent": dt, "role": "Import LC Manager"}):
			doc = frappe.new_doc("Custom DocPerm")
			doc.parent = dt
			doc.parenttype = "DocType"
			doc.parentfield = "permissions"
			doc.role = "Import LC Manager"
			doc.permlevel = 0
			doc.read = 1
			doc.write = 1
			doc.create = 1
			doc.delete = 1
			doc.submit = 1
			doc.cancel = 1
			doc.amend = 1
			doc.insert()
			print(f"Added Import LC Manager perm for {dt}")
		else:
			doc = frappe.get_doc("Custom DocPerm", {"parent": dt, "role": "Import LC Manager"})
			doc.read = doc.write = doc.create = doc.delete = doc.submit = doc.cancel = doc.amend = 1
			doc.save()
			print(f"Updated Import LC Manager perm for {dt}")

	# 2. Ensure Role Profile "Import LC Manager" exists and has roles
	role_profile_name = "Import LC Manager"
	roles_to_assign = [
		"Import LC Manager",
		"Import LC User",
		"Purchase Manager",
		"Accounts Manager",
		"Stock Manager",
		"Desk User",
	]

	if not frappe.db.exists("Role Profile", role_profile_name):
		rp = frappe.new_doc("Role Profile")
		rp.role_profile = role_profile_name
		for role in roles_to_assign:
			rp.append("roles", {"role": role})
		rp.insert()
		print(f"Created Role Profile {role_profile_name}")
	else:
		rp = frappe.get_doc("Role Profile", role_profile_name)
		existing_roles = [r.role for r in rp.roles]
		for role in roles_to_assign:
			if role not in existing_roles:
				rp.append("roles", {"role": role})
		rp.save()
		print(f"Updated Role Profile {role_profile_name}")

	frappe.db.commit()
