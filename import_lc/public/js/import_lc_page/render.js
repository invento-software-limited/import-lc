// Binds the portfolio payload (import_lc.api.import_lc_portfolio) into the page skeleton.
frappe.provide("import_lc.page");

import_lc.page.render = (() => {
	const fmt = import_lc.dashboard.format;
	const dash = import_lc.dashboard.charts;
	const charts = import_lc.page.charts;
	const STATUS = { Active: "#2f5a86", "Partially Utilized": "#17626e", "Fully Utilized": "#097C52", Expired: "#a3302f", Closed: "#5c6672" };
	const STATUS_PILL = { Active: "#22405e", "Partially Utilized": "#17505d", Expired: "#7e2a30" };
	const RUNWAY = ["#a3302f", "#a3552f", "#8a5a16", "#17626e", "#097C52"];
	const TOP = ["#0e442e", "#1a6f4a", "#2b8b62", "#5aa584", "#8fbfa8"];

	function bind(root, d) {
		fmt.use_currency(d.currency, d.currency_symbol, d.currency_symbol_on_right);
		const ctx = make_ctx(root, d);
		bind_header(ctx);
		bind_metrics(ctx);
		bind_cohort(ctx);
		bind_trend(ctx);
		bind_mix_and_top(ctx);
		bind_runway(ctx);
		bind_worklist(ctx, d.worklist, false);
	}

	function make_ctx(root, d) {
		const $ = (f) => root.querySelector(`[data-field="${f}"]`);
		return {
			root, d, $,
			text: (f, v) => $(f) && ($(f).textContent = v),
			slot: (s, html) => (root.querySelector(`[data-slot="${s}"]`).innerHTML = html),
			width: (s) => Math.max(root.querySelector(`[data-slot="${s}"]`).clientWidth, 200),
			drills: drills(d),
		};
	}

	function bind_header({ d, $, text }) {
		$("meta").innerHTML = [esc(d.company), `<b>${esc(__("as of {0}", [fmt.date(d.today)]))}</b>`, esc(d.currency)].join(" &nbsp;·&nbsp; ");
		text("hd_undrawn", fmt.compact(d.undrawn.amount));
		text("hd_period", d.period_label);
		text("hd_opened", fmt.compact(d.opened.amount));
	}

	function bind_metrics({ d, $, text, slot }) {
		const o = d.opened;
		fmt.set_compact($("opened_amount"), o.amount);
		const up = o.change_pct == null ? null : o.change_pct >= 0;
		pill($("opened_change"), o.change_pct == null ? __("new") : `${up ? "▲" : "▼"} ${Math.abs(o.change_pct).toFixed(0)}%`,
			up == null ? "#3b4757" : up ? "#0a5a3c" : "#7e2a30");
		text("opened_caption", __("{0} LC(s) · prior {1}", [o.count, fmt.compact(o.prior_amount)]));
		slot("opened_trend", charts.bar_sparkline(o.trend, o.trend.map(() => "#097C52"), true));

		const dr = d.drawn;
		fmt.set_compact($("drawn_amount"), dr.amount);
		pill($("drawn_settled"), fmt.pct(dr.settled_pct, 0), dr.settled_pct >= 100 ? "#0a5a3c" : dr.settled_pct > 0 ? "#7a4f12" : "#3b4757");
		text("drawn_caption", __("settled · {0} invoice(s)", [dr.count]));
		slot("drawn_gauge", dash.gauge(dr.settled_pct, "#8a5a16",
			[__("{0} settled", [fmt.compact(dr.settled)]), __("{0} due", [fmt.compact(dr.outstanding)])], null,
			__("Share of the period's commercial invoices already paid to beneficiaries")));

		const u = d.undrawn;
		fmt.set_compact($("undrawn_amount"), u.amount);
		text("undrawn_caption", __("across {0} live LC(s)", [u.count]));
		slot("undrawn_split", dash.segmented([
			{ label: __("Drawn"), value: u.drawn, color: "#097C52" },
			{ label: __("Undrawn"), value: u.amount, color: "#2f5a86" },
		]));

		const e = d.expiring;
		fmt.set_compact($("expiring_amount"), e.amount);
		pill($("expiring_count"), __("{0} LC(s)", [e.count]), e.count ? "#7e2a30" : "#3b4757");
		text("expiring_caption", e.lapsed_count ? __("{0} lapsed undrawn", [fmt.compact(e.lapsed_amount)]) : __("undrawn at risk"));
		slot("expiring_bars", charts.bar_sparkline(e.runway.map((b) => b.amount), RUNWAY));
	}

	function bind_cohort({ d, text }) {
		const c = d.cohort;
		text("cohort_sub", d.period_label);
		text("st_opened", fmt.compact(c.opened));
		text("st_opened_s", __("{0} LC(s)", [c.count]));
		text("st_received", fmt.compact(c.received));
		text("st_received_s", __("{0} of LC value", [fmt.pct(c.received_pct, 0)]));
		text("st_invoiced", fmt.compact(c.invoiced));
		text("st_invoiced_s", __("{0} of LC value", [fmt.pct(c.invoiced_pct, 0)]));
		text("st_settled", fmt.compact(c.settled));
		text("st_settled_s", __("{0} · {1} due", [fmt.pct(c.settled_pct, 0), fmt.compact(c.outstanding)]));
	}

	function bind_trend({ d, text, slot, width }) {
		const chart = charts.combo(d.chart.labels, d.chart.opened, d.chart.drawn, width("combo"));
		slot("combo", chart.svg || chart);
		text("combo_sub", `${d.period_label}, ${d.currency} ${chart.unit || ""}`.trim());
	}

	function bind_mix_and_top(ctx) {
		const { d, text, slot, root } = ctx;
		const total = d.status_mix.reduce((s, r) => s + r.amount, 0);
		const parts = d.status_mix.map((r) => ({ label: __(r.status), value: r.amount, count: r.count, color: STATUS[r.status] || "#5c6672", names: r.names }));
		text("mix_sub", __("LCs opened in period, by current status"));
		const legend = parts.map((p, i) => `<div class="dn-r lk" data-i="${i}" title="${esc(__("Open {0} LCs", [p.label]))}"><i style="background:${p.color}"></i>
			<span class="n">${esc(p.label)}</span><span class="p">${fmt.pct((p.value / (total || 1)) * 100, 0)}</span><span class="v">${esc(fmt.compact(p.value))}</span></div>`).join("");
		slot("mix", parts.length
			? `<div class="dn">${charts.donut(parts, String(d.cohort.count), __("LCs"))}<div class="dn-l">${legend}</div></div>`
			: `<div class="empty">${__("No LCs opened in this period.")}</div>`);
		root.querySelectorAll('[data-slot="mix"] [data-i]').forEach((el) => {
			const p = parts[el.dataset.i];
			el.onclick = () => go("Import LC", { name: ["in", p.names] });
		});

		text("top_sub", __("By LC value opened · {0}", [d.period_label.toLowerCase()]));
		slot("top", d.top_beneficiaries.length ? d.top_beneficiaries.map((a, i) => `<div class="lk" data-i="${i}" title="${esc(__("Open this beneficiary's LCs"))}">
			<div class="rk-r"><span class="rk-d" style="background:${TOP[i]}"></span><span class="rk-n">${esc(a.beneficiary)}</span>
			<span class="rk-v">${esc(fmt.compact(a.amount))}<em> · ${a.count} LC · ${fmt.pct(a.pct, 0)}</em></span></div>
			<div class="rk-t"><div class="rk-f" style="width:${Math.max(a.pct, 2).toFixed(0)}%;background:${TOP[i]}"></div></div></div>`).join("")
			: `<div class="empty">${__("No LCs opened in this period.")}</div>`);
		root.querySelectorAll('[data-slot="top"] [data-i]').forEach((el) => {
			el.onclick = () => go("Import LC", { ...ctx.drills.opened_filters, beneficiary: d.top_beneficiaries[el.dataset.i].beneficiary });
		});
	}

	function bind_runway(ctx) {
		const { d, text, slot, width, root } = ctx;
		const buckets = d.expiring.runway.map((b, i) => ({ ...b, color: RUNWAY[i] }));
		const chart = charts.histogram(buckets, width("runway"));
		slot("runway", chart.svg);
		text("runway_sub", __("Undrawn on live LCs by days to expiry, {0} {1}", [d.currency, chart.unit]));
		root.querySelectorAll('[data-slot="runway"] [data-i]').forEach((el) => {
			const b = buckets[el.dataset.i];
			el.onclick = b.names.length ? () => go("Import LC", { name: ["in", b.names] }) : null;
		});
	}

	// `append` adds the next page under the rows already shown.
	function bind_worklist(ctx, w, append) {
		const { d, text, slot, root } = ctx;
		text("work_sub", __("{0} open LC(s) · {1} undrawn · as of today", [w.total, fmt.compact(w.amount)]));
		const rows = w.rows.map((r) => {
			const days = r.days_to_expiry;
			const [label, color] = r.lapsed ? [__("expired {0} d", [Math.abs(days)]), "#7e2a30"]
				: days == null ? ["—", "#3b4757"] : days <= 15 ? [__("{0} d left", [days]), "#7e2a30"] : days <= 30 ? [__("{0} d left", [days]), "#8a4527"] : [__("{0} d left", [days]), "#17505d"];
			return `<tr><td class="doc"><a class="lk" data-name="${esc(r.name)}">${esc(r.lc_no || r.name)}</a></td>
				<td>${esc(r.beneficiary || "")}</td><td>${esc(fmt.date(r.expiry_date))} <span class="pill" style="background:${color}">${esc(label)}</span></td>
				<td><span class="pill" style="background:${STATUS_PILL[r.status] || "#3b4757"}">${esc(__(r.status))}</span></td>
				<td class="n">${esc(r.currency)} ${esc(Number(r.lc_value).toLocaleString("en-US", { maximumFractionDigits: 2 }))}</td>
				<td class="n">${fmt.pct(r.drawn_pct, 0)}</td><td class="n${r.lapsed ? " cl" : ""}">${esc(fmt.compact(r.undrawn))}</td></tr>`;
		}).join("");
		const tbody = root.querySelector('[data-slot="work"]');
		if (append) tbody.insertAdjacentHTML("beforeend", rows);
		else tbody.innerHTML = rows || `<tr><td colspan="7" class="empty">${__("No live or lapsed LCs for this company.")}</td></tr>`;
		tbody.querySelectorAll("a[data-name]").forEach((a) => (a.onclick = () => frappe.set_route("Form", "Import LC", a.dataset.name)));
		const shown = w.start + w.rows.length;
		slot("work_more", shown < w.total ? `<button type="button" data-more="${shown}">${__("Show more ({0} of {1})", [shown, w.total])}</button>` : "");
		bind_drill_links(ctx);
	}

	function drills(d) {
		const base = { company: d.company, docstatus: 1 };
		const period = ["between", [d.period_start, d.period_end]];
		const names = d.cohort.names.length ? ["in", d.cohort.names] : null;
		const opened_filters = { ...base, date_of_issue: period };
		const by_names = (list) => (list.length ? ["Import LC", { name: ["in", list] }] : null);
		const commercial = { ...base, import_lc: names };
		return {
			opened_filters,
			opened: ["Import LC", opened_filters],
			drawn: ["Purchase Invoice", { ...base, import_lc: ["is", "set"], posting_date: period }],
			live: by_names(d.undrawn.names),
			expiring: by_names(d.expiring.names),
			cohort_pr: names && ["Purchase Receipt", { ...base, import_lc: names }],
			cohort_pi: names && ["Purchase Invoice", commercial],
			cohort_due: names && ["Purchase Invoice", { ...commercial, outstanding_amount: [">", 0] }],
		};
	}

	function bind_drill_links({ root, d, drills: map }) {
		root.querySelectorAll("[data-drill]").forEach((el) => {
			const target = map[el.dataset.drill];
			const allowed = target && (target[0] === "Import LC" || d.can_read[target[0]]);
			el.classList.toggle("lk", !!allowed);
			el.onclick = allowed ? () => go(target[0], target[1]) : null;
			el.title = allowed ? __("Open {0} list", [__(target[0])]) : "";
		});
	}

	function go(doctype, filters) {
		frappe.set_route("List", doctype, filters);
	}

	function pill(el, label, color) {
		el.textContent = label;
		el.style.background = color;
	}

	const esc = (v) => fmt.esc(v);

	return { bind, bind_worklist, make_ctx };
})();
