// Lower cards of the Import LC dashboard: validity window, terms, landed cost,
// goods and the documents table.
frappe.provide("import_lc.dashboard");

import_lc.dashboard.sections = (() => {
	const fmt = import_lc.dashboard.format;
	const charts = import_lc.dashboard.charts;
	const esc = fmt.esc;
	const STATUS_COLORS = {
		Overdue: "#7e2a30", Unpaid: "#3b4757", "Partly Paid": "#7a4f12", Paid: "#0a5a3c", "To Bill": "#8a4527",
		Completed: "#0a5a3c", Draft: "#3b4757", Submitted: "#3b4757", Return: "#7e2a30",
	};
	const COST_COLORS = ["#2f5a86", "#a3552f", "#8a5a16", "#17626e", "#5c6672"];

	const status_pill = (status) => `<span class="pill" style="background:${STATUS_COLORS[status] || "#3b4757"}">${esc(__(status))}</span>`;

	function window_and_terms(d, ctx) {
		ctx.text("window_caption", d.validity_days != null ? __("{0}-day credit · issue to expiry", [d.validity_days]) : "");
		const events = [];
		d.documents.filter((x) => x.status !== "Draft").forEach((x) => {
			if (x.doctype === "Purchase Receipt") events.push({ date: x.date, color: "#2f5a86", above: false, title: `${x.name} · ${fmt.date(x.date)}` });
			if (x.kind === __("Commercial Invoice")) events.push({ date: x.date, color: "#097C52", above: true, title: `${x.name} · ${fmt.date(x.date)} · ${fmt.compact(x.value)}` });
		});
		ctx.slot("timeline", charts.timeline(d, events));
		ctx.text("terms_caption", d.applicable_rules || "");
		const m = d.margin;
		const margin = m.pct
			? `${m.pct}% · ${in_company(d, () => fmt.compact(m.required))} ${m.booked ? __("· {0} booked", [in_company(d, () => fmt.compact(m.booked))]) : __("· not booked")}`
			: null;
		const route = [d.port_of_loading, d.port_of_discharge || d.final_destination].filter(Boolean).join(" → ");
		const rows = [
			[__("Form of credit"), d.form_of_documentary_credit], [__("Drafts at"), d.drafts_at],
			[__("Amount tolerance"), d.tolerance_pct ? `±${d.tolerance_pct}%` : null], [__("LC margin"), margin],
			[__("Partial shipments"), d.partial_shipments], [__("Transshipment"), d.transshipment],
			[__("Incoterm"), d.incoterm], [__("Issuing bank"), d.issuing_bank], [__("Beneficiary bank"), d.beneficiary_bank],
			[__("Route"), route ? `${route}${d.mode_of_transport ? ` · ${d.mode_of_transport}` : ""}` : null],
		].filter(([, v]) => v);
		ctx.slot("terms", rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="n">${esc(v)}</td></tr>`).join(""));
	}

	function landed_cost(d, ctx) {
		const c = d.landed_cost;
		ctx.text("cost_caption", __("{0} voucher(s) · {1}", [c.voucher_count, d.company_currency]));
		if (!c.goods && !c.charges.length) return ctx.slot("landed_cost", `<div class="empty">${__("No commercial invoice or landed cost voucher yet.")}</div>`);
		in_company(d, () => {
			const parts = [{ label: __("Goods (invoice)"), value: c.goods, color: "#097C52" },
				...c.charges.map((r, i) => ({ label: __(r.label), value: r.amount, color: COST_COLORS[i % COST_COLORS.length] }))];
			const rows = parts.map((p) => `<tr><td><i style="background:${p.color}"></i>${esc(p.label)}</td><td class="n">${esc(fmt.compact(p.value))}</td></tr>`).join("");
			ctx.slot("landed_cost", `${charts.segmented(parts, false)}
				<table class="terms"><tbody>${rows}
				<tr class="tot"><td>${esc(__("Landed cost · uplift {0}", [fmt.pct(c.uplift_pct)]))}</td><td class="n">${esc(fmt.compact(c.landed_total))}</td></tr></tbody></table>`);
		});
	}

	function goods(d, ctx) {
		ctx.text("goods_caption", __("Received quantity against LC quantity, per line"));
		if (!d.items.length) return ctx.slot("goods", `<div class="empty">${__("No goods lines on this LC.")}</div>`);
		ctx.slot("goods", d.items.map((it) => {
			const p = it.received_pct;
			const color = p > 100 ? "#a3552f" : p >= 100 ? "#097C52" : p > 0 ? "#17626e" : "#98a1ac";
			const tip = __("Received {0} · Invoiced {1} · LC {2} {3}", [fmt.qty(it.received_qty), fmt.qty(it.invoiced_qty), fmt.qty(it.lc_qty), it.uom || ""]);
			return `<div title="${esc(tip)}"><div class="rk-r"><span class="rk-d" style="background:${color}"></span>
				<span class="rk-n">${esc(it.item_name)}</span>
				<span class="rk-v">${fmt.qty(it.received_qty)} / ${fmt.qty(it.lc_qty)} ${esc(it.uom || "")}<em> · ${esc(__("{0} invoiced", [fmt.qty(it.invoiced_qty)]))}</em></span></div>
				<div class="rk-t"><div class="rk-f" style="width:${Math.max(Math.min(p, 100), p > 0 ? 2 : 0)}%;background:${color}"></div></div></div>`;
		}).join(""));
	}

	function documents(d, ctx) {
		const hidden = Object.keys(d.can_read).filter((dt) => !d.can_read[dt]);
		const note = hidden.length ? ` · ${__("no access to {0}", [hidden.join(", ")])}` : "";
		ctx.text("docs_caption", __("{0} document(s)", [d.documents.length]) + note);
		if (!d.documents.length) {
			return ctx.slot("documents", `<tr><td colspan="6" class="empty">${__("Nothing raised against this LC yet.")}</td></tr>`);
		}
		ctx.slot("documents", d.documents.map((x) => `<tr>
			<td class="doc"><a class="lk" data-doctype="${esc(x.doctype)}" data-name="${esc(x.name)}">${esc(x.name)}</a></td>
			<td>${esc(x.kind)}</td><td>${esc(fmt.date(x.date))}</td><td>${status_pill(x.status)}</td>
			<td class="n">${x.value == null ? "—" : esc(fmt.full_code(x.value, x.currency))}</td>
			<td class="n">${x.progress_pct == null ? "—" : esc(`${fmt.pct(x.progress_pct, 0)} ${x.progress_label}`)}</td></tr>`).join(""));
	}

	const in_company = (d, fn) => fmt.in_currency(d.company_currency, d.company_currency_symbol, d.company_currency_symbol_on_right, fn);

	return { window_and_terms, landed_cost, goods, documents };
})();
