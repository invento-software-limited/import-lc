// Static skeleton of the Import LC dashboard. Every dynamic node carries a data-field
// (text) or data-slot (rendered visual); dashboard.js fills them from the API response.
frappe.provide("import_lc.dashboard");

import_lc.dashboard.HTML = `
<div class="cd">
<div class="bar">
  <span class="k">${__("Import LC")}</span>
  <span class="asof" data-field="asof">—</span>
  <span class="asof" data-field="ccy_note">—</span>
</div>

<div class="hd">
  <div class="hd-mono">LC</div>
  <div class="hd-id">
    <div class="hd-name" data-field="lc_no">—</div>
    <div class="hd-meta" data-field="meta">—</div>
  </div>
  <div class="hd-r">
    <div><div class="k">${__("LC value")}</div><div class="v" data-field="lc_value">—</div></div>
    <div><div class="k" data-field="expiry_label">${__("Expires")}</div><div class="v" data-field="expiry_value">—</div></div>
  </div>
</div>

<div class="mx surf">
  <div class="mx-c">
    <div class="k">${__("Drawn")}</div>
    <div class="mx-v"><a class="lk" data-field="drawn_amount" data-drill="drawn">—</a></div>
    <div class="mx-s"><span class="pill" data-field="drawn_pct">—</span><span data-field="drawn_caption">—</span></div>
    <div class="mx-sp" data-slot="drawn_trend"></div>
  </div>
  <div class="mx-c tint">
    <div class="k">${__("Available to draw")}</div>
    <div class="mx-v" data-field="available_amount">—</div>
    <div class="mx-s" data-field="available_caption">—</div>
    <div class="mx-sp" data-slot="available_split"></div>
  </div>
  <div class="mx-c">
    <div class="k" title="${__("Paid to the beneficiary against commercial invoices")}">${__("Settled")}</div>
    <div class="mx-v"><span data-field="settled_amount">—</span></div>
    <div class="mx-s"><span class="pill" data-field="settled_pct">—</span><span>${__("of drawn")}</span></div>
    <div class="mx-sp" data-slot="settled_gauge"></div>
  </div>
  <div class="mx-c">
    <div class="k">${__("Validity")}</div>
    <div class="mx-v" data-field="validity_value">—</div>
    <div class="mx-s"><span class="pill" data-field="validity_pill">—</span><span data-field="validity_caption">—</span></div>
    <div class="mx-sp" data-slot="validity_gauge"></div>
  </div>
</div>

<div class="sec">${__("LC lifecycle")}</div>
<div class="fl">
  <div class="fl-c" style="--bg:#22405e"><div class="fl-k">${__("Opened")}</div>
    <div class="fl-v" data-field="st_opened">—</div><div class="fl-s" data-field="st_opened_s">—</div></div>
  <div class="fl-c" style="--bg:#0f5a4e"><div class="fl-k">${__("Received")}</div>
    <div class="fl-v"><a class="lk" data-field="st_received" data-drill="received">—</a></div><div class="fl-s" data-field="st_received_s">—</div></div>
  <div class="fl-c" style="--bg:#0a5a3c"><div class="fl-k">${__("Invoiced")}</div>
    <div class="fl-v"><a class="lk" data-field="st_invoiced" data-drill="drawn">—</a></div><div class="fl-s" data-field="st_invoiced_s">—</div></div>
  <div class="fl-c" style="--bg:#7a4f12"><div class="fl-k">${__("Settled")}</div>
    <div class="fl-v" data-field="st_settled">—</div>
    <div class="fl-s"><a class="lk" data-field="st_settled_s" data-drill="outstanding">—</a></div></div>
</div>

<div class="surf card">
  <div class="two">
    <div>
      <div class="hrow"><div class="h">${__("Validity window")}</div><div class="hs" data-field="window_caption">—</div></div>
      <div data-slot="timeline"></div>
      <div class="lgd">
        <span><i style="background:#17626e;opacity:.55"></i>${__("Validity elapsed")}</span>
        <span><i style="background:#2f5a86;border-radius:50%"></i>${__("Receipt")}</span>
        <span><i style="background:#097C52;border-radius:50%"></i>${__("Invoice")}</span>
      </div>
    </div>
    <div>
      <div class="hrow"><div class="h">${__("Credit terms")}</div><div class="hs" data-field="terms_caption">—</div></div>
      <table class="terms"><tbody data-slot="terms"></tbody></table>
    </div>
  </div>
</div>

<div class="surf card lcost">
  <div class="hrow"><div class="h">${__("Landed cost")}</div><div class="hs" data-field="cost_caption">—</div></div>
  <div data-slot="landed_cost"></div>
</div>

<div class="surf card">
  <div class="hrow"><div class="h">${__("Goods: credited vs received")}</div><div class="hs" data-field="goods_caption">—</div></div>
  <div class="rk" data-slot="goods"></div>
</div>

<div class="surf card">
  <div class="hrow"><div class="h">${__("Documents against this LC")}</div><div class="hs" data-field="docs_caption">—</div></div>
  <div class="tb-wrap">
    <table class="tb">
      <thead><tr>
        <th>${__("Document")}</th><th>${__("Type")}</th><th>${__("Date")}</th><th>${__("Status")}</th>
        <th class="n">${__("Value")}</th><th class="n">${__("Progress")}</th>
      </tr></thead>
      <tbody data-slot="documents"></tbody>
    </table>
  </div>
</div>
</div>
`;
