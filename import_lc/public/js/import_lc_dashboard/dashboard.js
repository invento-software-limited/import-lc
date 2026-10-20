// Dashboard tab on the Import LC form: renders the skeleton into a shadow root,
// fetches one payload from import_lc.api.import_lc_dashboard and binds it.
frappe.provide("import_lc.dashboard");

(() => {
	const ns = import_lc.dashboard;
	const fmt = ns.format;
	const charts = ns.charts;
	const METHOD = "import_lc.api.import_lc_dashboard.get_dashboard_data";

	frappe.ui.form.on("Import LC", {
		refresh(frm) {
			if (frm.is_new() || !frm.get_field("dashboard_html")) return;
			ns.render(frm);
		},
	});

	ns.render = (frm) => {
		const wrapper = frm.get_field("dashboard_html").$wrapper[0];
		if (!wrapper) return;
		const root = mount(wrapper);
		frm.__ilc_dashboard_for = frm.doc.name;
		const seq = (frm.__ilc_dashboard_seq = (frm.__ilc_dashboard_seq || 0) + 1);
		Promise.resolve(frappe.call({ method: METHOD, args: { name: frm.doc.name } }))
			.then((r) => seq === frm.__ilc_dashboard_seq && r.message && bind(root, r.message))
			.catch(() => {
				root.querySelector(".cd").innerHTML = `<div class="err">${__("Could not load the LC dashboard.")}</div>`;
			});
	};

	function mount(wrapper) {
		wrapper.innerHTML = "";
		const host = document.createElement("div");
		host.className = "import-lc-dashboard";
		wrapper.appendChild(host);
		const root = host.attachShadow({ mode: "open" });
		root.innerHTML = `<style>${ns.CSS}</style>${ns.HTML}`;
		return root;
	}


	function bind(root, d) {
		fmt.use_currency(d.currency, d.currency_symbol, d.currency_symbol_on_right);
		const $ = (field) => root.querySelector(`[data-field="${field}"]`);
		const ctx = {
			$,
			text: (field, value) => $(field) && ($(field).textContent = value),
			slot: (name, html) => (root.querySelector(`[data-slot="${name}"]`).innerHTML = html),
		};
		bind_header(d, ctx);
		bind_metrics(d, ctx);
		bind_stages(d, ctx);
		const s = ns.sections;
		[s.window_and_terms, s.landed_cost, s.goods, s.documents].forEach((fn) => fn(d, ctx));
		bind_drills(root, d);
	}

	function bind_header(d, { $, text }) {
		text("asof", __("Position as of {0}", [fmt.date(d.today)]));
		const base = d.company_currency !== d.currency ? ` · ${__("rate {0} {1}", [d.conversion_rate, d.company_currency])}` : "";
		text("ccy_note", __("Amounts in {0}", [d.currency]) + base);
		text("lc_no", d.lc_no || d.name);
		const meta = [d.lc_no ? d.name : null, d.beneficiary, d.country_of_origin, d.drafts_at].filter(Boolean).map(fmt.esc);
		meta.push(`<b>${fmt.esc(__(d.status || ""))}</b>`);
		$("meta").innerHTML = meta.join(" &nbsp;·&nbsp; ");
		text("lc_value", fmt.compact(d.lc_value));
		const expired = d.days_to_expiry != null && d.days_to_expiry < 0;
		text("expiry_label", expired ? __("Expired") : __("Expires"));
		text("expiry_value", fmt.date(d.expiry_date));
	}

	function bind_metrics(d, ctx) {
		const { $, text, slot } = ctx;
		fmt.set_compact($("drawn_amount"), d.drawn_amount);
		pill($("drawn_pct"), fmt.pct(d.drawn_pct, 0),
			d.drawn_pct > 100 ? "#8a4527" : d.drawn_pct >= 100 ? "#0a5a3c" : d.drawn_pct > 0 ? "#17505d" : "#3b4757");
		text("drawn_caption", __("{0} invoice(s)", [d.drawn_count]));
		slot("drawn_trend", charts.step_sparkline(d.drawn_trend, d.today, "#097C52"));

		fmt.set_compact($("available_amount"), d.over_drawn_amount > 0 ? -d.over_drawn_amount : d.available_amount);
		text("available_caption", d.over_drawn_amount > 0
			? __("over-drawn beyond LC value")
			: __("max {0} at ±{1}%", [fmt.compact(d.max_drawable), d.tolerance_pct]));
		slot("available_split", charts.segmented([
			{ label: __("Drawn"), value: Math.min(d.drawn_amount, d.max_drawable), color: "#097C52" },
			{ label: __("Available"), value: d.available_amount, color: "#2f5a86" },
			{ label: __("Tolerance"), value: d.max_drawable - Math.max(d.lc_value, d.drawn_amount), color: "#c5ccd4" },
		]));

		fmt.set_compact($("settled_amount"), d.settled_amount);
		pill($("settled_pct"), fmt.pct(d.settled_pct, 0), d.settled_pct >= 100 ? "#0a5a3c" : d.settled_pct > 0 ? "#7a4f12" : "#3b4757");
		slot("settled_gauge", charts.gauge(d.settled_pct, "#8a5a16",
			[__("{0} open", [fmt.compact(d.outstanding_amount)]), __("{0} late", [fmt.compact(d.overdue_amount)])],
			null, __("Settled {0} of {1} drawn", [fmt.compact(d.settled_amount), fmt.compact(d.drawn_amount)])));

		bind_validity(d, ctx);
	}

	function bind_validity(d, { $, text, slot }) {
		const el = $("validity_value");
		if (d.days_to_expiry == null) return (el.textContent = "—");
		const left = d.days_to_expiry;
		el.textContent = String(Math.abs(left));
		el.insertAdjacentHTML("beforeend", `<span>${fmt.esc(Math.abs(left) === 1 ? __("day") : __("days"))}</span>`);
		const [label, color] = left < 0 ? [__("expired"), "#7e2a30"] : left <= 15 ? [__("expiring"), "#7a4f12"] : [__("open"), "#17505d"];
		pill($("validity_pill"), label, color);
		text("validity_caption", d.latest_date_of_shipment ? __("ship by {0}", [fmt.date(d.latest_date_of_shipment, false)]) : "");
		slot("validity_gauge", charts.gauge(d.validity_elapsed_pct, left < 0 ? "#a3302f" : "#17626e",
			[fmt.date(d.date_of_issue, false), fmt.date(d.expiry_date, false)], d.shipment_mark_pct,
			__("Marker: latest date of shipment {0}", [fmt.date(d.latest_date_of_shipment)])));
	}

	function bind_stages(d, { text }) {
		text("st_opened", fmt.compact(d.lc_value));
		text("st_opened_s", __("{0} · {1} line(s)", [fmt.date(d.date_of_issue), d.items.length]));
		text("st_received", fmt.compact(d.received_amount));
		text("st_received_s", __("{0} of LC value", [fmt.pct(d.received_pct, 0)]));
		text("st_invoiced", fmt.compact(d.drawn_amount));
		text("st_invoiced_s", __("{0} of LC value", [fmt.pct(d.drawn_pct, 0)]));
		text("st_settled", fmt.compact(d.settled_amount));
		text("st_settled_s", __("{0} outstanding", [fmt.compact(d.outstanding_amount)]));
	}

	function bind_drills(root, d) {
		const commercial = { import_lc: d.name, docstatus: 1 };
		const lists = {
			drawn: ["Purchase Invoice", commercial],
			outstanding: ["Purchase Invoice", { ...commercial, outstanding_amount: [">", 0] }],
			received: ["Purchase Receipt", { import_lc: d.name, docstatus: 1 }],
		};
		root.querySelectorAll("[data-drill]").forEach((el) => {
			const [doctype, filters] = lists[el.dataset.drill];
			if (!d.can_read[doctype]) return el.classList.remove("lk");
			el.title = __("Open {0} list", [__(doctype)]);
			el.onclick = () => frappe.set_route("List", doctype, filters);
		});
		root.querySelectorAll("[data-doctype][data-name]").forEach((a) => {
			a.onclick = () => frappe.set_route("Form", a.dataset.doctype, a.dataset.name);
		});
	}

	function pill(el, label, color) {
		if (!el) return;
		el.textContent = label;
		el.style.background = color;
	}
})();
