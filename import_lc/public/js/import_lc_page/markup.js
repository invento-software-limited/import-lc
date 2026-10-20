// Skeleton of the Import LC page dashboard. data-field = text, data-slot = rendered visual,
// data-drill = list drill-through key resolved in render.js.
frappe.provide("import_lc.page");

import_lc.page.HTML = () => {
	const P = `<i class="sc p" title="${__("Moves with the period")}"></i>`;
	const T = `<i class="sc t" title="${__("As of today")}"></i>`;
	const presets = [["30d", __("30 days")], ["6m", __("6 months")], ["1y", __("1 year")]];
	return `
<div class="cd">
<div class="hd">
  <div class="hd-mono">LC</div>
  <div class="hd-id">
    <div class="hd-name">${__("Import LCs")}</div>
    <div class="hd-meta" data-field="meta">—</div>
  </div>
  <div class="hd-r">
    <div><div class="k">${T}${__("Undrawn")}</div><div class="v" data-field="hd_undrawn">—</div></div>
    <div><div class="k">${P}${__("Opened")} · <span data-field="hd_period">—</span></div><div class="v" data-field="hd_opened">—</div></div>
  </div>
</div>

<div class="fc">
  <div class="fc-r1"><select class="fsel" data-f="company" aria-label="${__("Company")}"></select></div>
  <div class="fc-r2">
    <span class="lg"><span><i class="sc p"></i>${__("moves with period")}</span><span><i class="sc t"></i>${__("as of today")}</span></span>
    <div class="per" role="group" aria-label="${__("Period")}">
      ${presets.map(([p, l]) => `<button type="button" data-p="${p}">${l}</button>`).join("")}
      <button type="button" class="cu" data-p="custom" aria-haspopup="dialog">${__("Custom")}</button>
    </div>
  </div>
</div>

<div data-slot="body"><div class="ld">${__("Loading Import LC dashboard…")}</div></div>
</div>`;
};

import_lc.page.BODY = () => {
	const P = `<i class="sc p"></i>`;
	const T = `<i class="sc t"></i>`;
	return `
<div class="mx surf">
  <div class="mx-c">
    <div class="k">${P}${__("LCs opened")}</div>
    <div class="mx-v"><a class="lk" data-field="opened_amount" data-drill="opened">—</a></div>
    <div class="mx-s"><span class="pill" data-field="opened_change">—</span><span data-field="opened_caption">—</span></div>
    <div class="mx-sp" data-slot="opened_trend"></div>
  </div>
  <div class="mx-c">
    <div class="k">${P}${__("Drawn under LC")}</div>
    <div class="mx-v"><a class="lk" data-field="drawn_amount" data-drill="drawn">—</a></div>
    <div class="mx-s"><span class="pill" data-field="drawn_settled">—</span><span data-field="drawn_caption">—</span></div>
    <div class="mx-sp" data-slot="drawn_gauge"></div>
  </div>
  <div class="mx-c tint">
    <div class="k">${T}${__("Undrawn on live LCs")}</div>
    <div class="mx-v"><a class="lk" data-field="undrawn_amount" data-drill="live">—</a></div>
    <div class="mx-s" data-field="undrawn_caption">—</div>
    <div class="mx-sp" data-slot="undrawn_split"></div>
  </div>
  <div class="mx-c">
    <div class="k">${T}${__("Expiring in 30 days")}</div>
    <div class="mx-v"><a class="lk" data-field="expiring_amount" data-drill="expiring">—</a></div>
    <div class="mx-s"><span class="pill" data-field="expiring_count">—</span><span data-field="expiring_caption">—</span></div>
    <div class="mx-sp" data-slot="expiring_bars"></div>
  </div>
</div>

<div class="sec">${P}${__("LC lifecycle · LCs opened in period")}<span class="sub" data-field="cohort_sub">—</span></div>
<div class="fl">
  <div class="fl-c" style="--bg:#22405e"><div class="fl-k">${__("Opened")}</div>
    <div class="fl-v"><a class="lk" data-field="st_opened" data-drill="opened">—</a></div><div class="fl-s" data-field="st_opened_s">—</div></div>
  <div class="fl-c" style="--bg:#0f5a4e"><div class="fl-k">${__("Received")}</div>
    <div class="fl-v"><a class="lk" data-field="st_received" data-drill="cohort_pr">—</a></div><div class="fl-s" data-field="st_received_s">—</div></div>
  <div class="fl-c" style="--bg:#0a5a3c"><div class="fl-k">${__("Invoiced")}</div>
    <div class="fl-v"><a class="lk" data-field="st_invoiced" data-drill="cohort_pi">—</a></div><div class="fl-s" data-field="st_invoiced_s">—</div></div>
  <div class="fl-c" style="--bg:#7a4f12"><div class="fl-k">${__("Settled")}</div>
    <div class="fl-v" data-field="st_settled">—</div><div class="fl-s"><a class="lk" data-field="st_settled_s" data-drill="cohort_due">—</a></div></div>
</div>

<div class="surf card"><div class="two">
  <div><div class="hrow"><div class="h">${__("Opened vs drawn")}</div><div class="hs" data-field="combo_sub">—</div></div>
    <div data-slot="combo"></div>
    <div class="lgd"><span><i style="background:#097C52"></i>${__("LC value opened")}</span><span><i style="background:#a3552f;height:2px"></i>${__("Drawn (commercial invoices)")}</span></div></div>
  <div><div class="hrow"><div class="h">${__("Status mix")}</div><div class="hs" data-field="mix_sub">—</div></div>
    <div data-slot="mix"></div></div>
</div></div>

<div class="surf card"><div class="two">
  <div><div class="hrow"><div class="h">${__("Top beneficiaries")}</div><div class="hs" data-field="top_sub">—</div></div>
    <div class="rk" data-slot="top"></div></div>
  <div><div class="hrow"><div class="h">${__("Expiry runway")}</div><div class="hs" data-field="runway_sub">—</div></div>
    <div data-slot="runway"></div></div>
</div></div>

<div class="surf card">
  <div class="hrow"><div class="h">${__("LC worklist")}</div><div class="hs" data-field="work_sub">—</div></div>
  <div class="tb-wrap"><table class="tb">
    <thead><tr><th>${__("LC")}</th><th>${__("Beneficiary")}</th><th>${__("Expiry")}</th><th>${__("Status")}</th>
      <th class="n">${__("LC value")}</th><th class="n">${__("Drawn")}</th><th class="n">${__("Undrawn")}</th></tr></thead>
    <tbody data-slot="work"></tbody>
  </table></div>
  <div class="more" data-slot="work_more"></div>
</div>`;
};
