// Inline-SVG mini-visuals and the validity timeline for the Import LC dashboard.
frappe.provide("import_lc.dashboard");

import_lc.dashboard.charts = (() => {
	const fmt = import_lc.dashboard.format;
	const DAY = 86400000;
	const to_ms = (iso) => new Date(iso + "T00:00:00").getTime();
	const clamp = (v, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

	// Cumulative drawn amount as a step line over real dates, issue → today.
	function step_sparkline(points, end_date, color) {
		const W = 170, H = 26, top = 5, bottom = 23;
		const pts = (points || []).filter((p) => p.date);
		if (!pts.length) return "";
		const t0 = to_ms(pts[0].date);
		const t1 = Math.max(to_ms(end_date), to_ms(pts[pts.length - 1].date), t0 + DAY);
		const max = Math.max(...pts.map((p) => p.value), 1);
		const x = (iso) => 1 + ((to_ms(iso) - t0) / (t1 - t0)) * (W - 2);
		const y = (v) => bottom - (v / max) * (bottom - top);
		let d = `M ${x(pts[0].date).toFixed(1)} ${y(pts[0].value).toFixed(1)}`;
		pts.slice(1).forEach((p, i) => {
			d += ` L ${x(p.date).toFixed(1)} ${y(pts[i].value).toFixed(1)} L ${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`;
		});
		const last = pts[pts.length - 1];
		const lx = (W - 1).toFixed(1), ly = y(last.value).toFixed(1);
		d += ` L ${lx} ${ly}`;
		const gid = "ilcsp" + color.replace("#", "");
		const tips = pts.slice(1).map((p) => `${fmt.date(p.date)}: ${fmt.compact(p.value)}`).join("\n");
		return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" preserveAspectRatio="none" role="img">
			<title>${fmt.esc(tips || __("Nothing drawn yet"))}</title>
			<defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1">
				<stop offset="0%" stop-color="${color}" stop-opacity=".16"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/>
			</linearGradient></defs>
			<path d="${d} L ${lx} ${H} L 1 ${H} Z" fill="url(#${gid})"/>
			<path d="${d}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
			<circle cx="${lx}" cy="${ly}" r="2.4" fill="${color}"/>
		</svg>`;
	}

	// Progress against a target, with an optional marker (e.g. latest shipment date).
	function gauge(fill_pct, color, labels, marker_pct, title) {
		const marker = marker_pct == null ? "" : `<div class="pg-m" style="left:calc(${clamp(marker_pct)}% - 1px)"></div>`;
		return `<div class="pg" title="${fmt.esc(title || "")}">
			<div class="pg-t"><div class="pg-f" style="width:${clamp(fill_pct)}%;background:${color}"></div>${marker}</div>
			<div class="pg-l"><span>${fmt.esc(labels[0])}</span><span>${fmt.esc(labels[1])}</span></div>
		</div>`;
	}

	// One bar split into named parts; each part is {label, value, color}. The legend can be
	// left off when the caller lists the parts itself.
	function segmented(parts, with_legend = true) {
		const total = parts.reduce((s, p) => s + Math.max(p.value, 0), 0) || 1;
		const bar = parts
			.filter((p) => p.value > 0)
			.map((p) => `<i style="width:${((p.value / total) * 100).toFixed(2)}%;background:${p.color}" title="${fmt.esc(`${p.label}: ${fmt.compact(p.value)}`)}"></i>`)
			.join("");
		const legend = parts.map((p) => `<span><i style="background:${p.color}"></i>${fmt.esc(p.label)}</span>`).join("");
		return `<div class="sg-b">${bar}</div>${with_legend ? `<div class="sg-l">${legend}</div>` : ""}`;
	}

	// Issue → latest shipment → expiry on a date axis, today marked. `events` are dots:
	// {date, color, above, title} — above the track or below it.
	function timeline(data, events) {
		const issue = data.date_of_issue, expiry = data.expiry_date;
		if (!issue || !expiry) return `<div class="empty">${__("Set the issue and expiry dates to see the validity window.")}</div>`;
		const dots = (events || []).filter((e) => e.date);
		const ends = [expiry, data.today, ...dots.map((e) => e.date)].map(to_ms);
		const t0 = Math.min(to_ms(issue), ...ends), t1 = Math.max(...ends);
		const W = 400, L = 10, R = W - 10, TY = 62;
		const x = (iso) => L + ((to_ms(iso) - t0) / (t1 - t0 || DAY)) * (R - L);
		const now = Math.min(to_ms(data.today), to_ms(expiry));
		const elapsed_end = now < to_ms(issue) ? x(issue) : L + ((now - t0) / (t1 - t0 || DAY)) * (R - L);
		const anchor = (px) => (px < L + 40 ? "start" : px > R - 40 ? "end" : "middle");

		let svg = `<rect x="${x(issue).toFixed(1)}" y="${TY - 4}" width="${(x(expiry) - x(issue)).toFixed(1)}" height="8" rx="4" fill="#eef1f4"/>`;
		svg += `<rect x="${x(issue).toFixed(1)}" y="${TY - 4}" width="${Math.max(elapsed_end - x(issue), 0).toFixed(1)}" height="8" rx="4" fill="#17626e" fill-opacity=".55"><title>${fmt.esc(__("Validity elapsed"))}</title></rect>`;
		if (to_ms(data.today) > to_ms(expiry)) {
			svg += `<line x1="${x(expiry).toFixed(1)}" x2="${x(data.today).toFixed(1)}" y1="${TY}" y2="${TY}" stroke="#a3302f" stroke-width="1.6" stroke-dasharray="3 3"><title>${fmt.esc(__("Past expiry"))}</title></line>`;
		}
		const marks = [
			{ iso: issue, color: "#22405e", label: __("Issued"), above: false },
			data.latest_date_of_shipment && { iso: data.latest_date_of_shipment, color: "#a3552f", label: __("Last shipment"), above: true, dash: true },
			{ iso: expiry, color: "#a3302f", label: __("Expiry"), above: false },
			{ iso: data.today, color: "#0d1117", label: __("Today"), above: true },
		].filter(Boolean).map((m) => ({ ...m, px: x(m.iso) }));
		// Labels sharing a row and closer than ~80 units split apart: left one ends at its line, right one starts at it.
		marks.forEach((m) => (m.anchor = anchor(m.px)));
		[true, false].forEach((row) => {
			const same = marks.filter((m) => m.above === row).sort((a, b) => a.px - b.px);
			same.slice(1).forEach((m, i) => {
				if (m.px - same[i].px < 80) {
					same[i].anchor = "end";
					m.anchor = "start";
				}
			});
		});
		marks.forEach((m) => {
			const px = m.px.toFixed(1), ty = m.above ? TY - 38 : TY + 34;
			const tx = m.anchor === "end" ? (m.px - 3).toFixed(1) : m.anchor === "start" ? (m.px + 3).toFixed(1) : px;
			svg += `<line x1="${px}" x2="${px}" y1="${TY - 20}" y2="${TY + 20}" stroke="${m.color}" stroke-width="1.4" ${m.dash ? 'stroke-dasharray="3 2"' : ""}/>
				<text x="${tx}" y="${ty}" font-size="10" font-weight="600" fill="${m.color}" text-anchor="${m.anchor}">${fmt.esc(m.label)}</text>
				<text x="${tx}" y="${ty + 12}" font-size="9.5" fill="#5c6672" text-anchor="${m.anchor}">${fmt.esc(fmt.date(m.iso))}</text>`;
		});
		dots.forEach((e) => {
			svg += `<circle cx="${x(e.date).toFixed(1)}" cy="${e.above ? TY - 9 : TY + 9}" r="4" fill="${e.color}" stroke="#fff" stroke-width="1.5"><title>${fmt.esc(e.title)}</title></circle>`;
		});
		return `<svg viewBox="0 0 ${W} 124" width="100%" height="124" role="img" aria-label="${fmt.esc(__("LC validity timeline"))}">${svg}</svg>`;
	}

	return { step_sparkline, gauge, segmented, timeline };
})();
