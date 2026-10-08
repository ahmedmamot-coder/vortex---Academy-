/* Mobile layout: no sideways scrolling, compact header, tables as cards, and a bottom navigation bar. */
(() => {
const X = () => window.VX;
const st = document.createElement("style");
st.textContent = `
html,body{overflow-x:hidden;max-width:100%}
#mgBar .seg{max-width:100%;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}
#mgBar .seg button{white-space:nowrap}
.ov{max-width:100%}
#mnav{display:none;position:fixed;left:12px;right:12px;bottom:calc(10px + env(safe-area-inset-bottom,0px));z-index:15;background:#1B2955;border-radius:32px;padding:7px;gap:4px;box-shadow:0 14px 34px rgba(27,41,85,.4),inset 0 0 0 1px rgba(255,255,255,.06)}
#mnav button{--c:#067EEA;--ic:#067EEA;--on:#fff;flex:1;border:0;background:none;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11px;font-weight:600;color:#B9C2E0;padding:9px 0 8px;border-radius:24px;min-width:0;position:relative;overflow:hidden;transition:color .2s,background .2s}
#mnav button:nth-child(2){--c:#1DFEBF;--ic:#1DFEBF;--on:#1B2955}#mnav button:nth-child(3){--c:#8F23D7;--ic:#B57BFF}#mnav button:nth-child(4){--c:#1B22E4;--ic:#6E74FF}#mnav button:nth-child(5){--c:#067EEA;--ic:#B9C2E0}
#mnav button svg{width:24px;height:24px;position:relative;z-index:1;stroke:var(--ic)}#mnav button span{position:relative;z-index:1}
#mnav button[aria-current="true"]{color:var(--on);background:var(--c);box-shadow:0 6px 16px rgba(0,0,0,.25)}
#mnav button[aria-current="true"]::before{content:"";position:absolute;left:-10%;right:-10%;top:-38%;height:72%;border-radius:0 0 50% 50%/0 0 34% 34%;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.24))}
#mnav button[aria-current="true"] svg{stroke:var(--on)}
.mmenu button{width:100%;justify-content:flex-start;padding:14px;font-size:15px;margin-bottom:8px}
@media (max-width:720px){
  .top-in{padding:12px 14px 14px;gap:10px}
  .brand{gap:10px}.brand img{width:38px;height:38px;border-radius:10px;padding:4px}.brand b{font-size:17px}.brand small{font-size:10px}
  .me{padding:6px 10px;font-size:13px}.me #meName{max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .week{order:3;width:100%;justify-content:space-between}.week span{flex:1}
  .groups{margin-bottom:10px}.levels{padding:10px 0 14px}.levels-in{gap:8px}
  .lv{min-height:66px;padding:9px 9px 9px 64px;border-radius:14px}.lv .nm{font-size:13px}
  .lv img,.lv>span:first-child{width:48px!important;height:48px!important;left:8px!important}
  main{padding:14px 12px calc(112px + env(safe-area-inset-bottom,0px))}
  #mgBar .seg,#mgBar .tools{display:none}#mgBar .sel{flex:1;max-width:none}
  .bar{gap:10px;margin-bottom:12px}.bar h1{font-size:20px}
  .tools{margin-left:0;width:100%}.tools .btn{padding:10px 12px;flex:1;justify-content:center;min-width:44px}
  .days-seg{width:100%;overflow-x:auto;flex-wrap:nowrap;scrollbar-width:none}.days-seg button{flex:0 0 auto;white-space:nowrap}
  .srch{width:100%;max-width:none;margin-left:0}
  .row{padding:13px 12px}.pill{font-size:11px;padding:4px 8px}
  .kpis{grid-template-columns:repeat(2,1fr);gap:8px}.kpi{padding:12px}.kpi b{font-size:20px}
  .ov{border-radius:14px}
  .ov table,.ov tbody,.ov tr,.ov td{display:block;width:100%;min-width:0!important}
  .ov thead{display:none}
  .ov tr{border-top:1px solid var(--line);padding:10px 14px}.ov tr:first-child{border-top:0}
  .ov td{border:0!important;padding:3px 0!important;text-align:left!important;display:flex!important;gap:10px;align-items:center;flex-wrap:wrap;max-width:none!important}
  .ov td[data-label]::before{content:attr(data-label);flex:0 0 110px;font-size:12px;color:var(--muted);font-weight:600}
  .ov td:empty{display:none!important}
  .deck-head{border-radius:12px 12px 0 0}
  .sheet,.sheet.narrow{width:100%}
  .sh-foot{gap:8px}.sh-foot .btn{flex:1;justify-content:center}.sh-foot .sp{display:none}
  .grid4{grid-template-columns:1fr}
  .stage button{padding:9px 2px}
  .cal{gap:4px}
  #mnav{display:flex}
}`;
document.head.appendChild(st);

const ic = {
  swim: '<path d="M2 18c2 0 2-1.5 4-1.5S8 18 10 18s2-1.5 4-1.5 2 1.5 4 1.5 2-1.5 4-1.5"/><circle cx="15" cy="6" r="2"/><path d="M6 13l4-4 3 3 4-2"/>',
  track: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  deck: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M3 9h18M9 9v12"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  plan: '<path d="M9 6h11M9 12h11M9 18h11M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  me: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'
};
const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ic[k]}</svg>`;
const nav = document.createElement("nav"); nav.id = "mnav"; nav.setAttribute("aria-label", "Main"); document.body.appendChild(nav);
let built = "";
const go = v => { const V = X(); V.S.view = v; V.render(); window.scrollTo(0, 0); };
const click = id => { const b = document.getElementById(id); if (b) b.click(); };
function more(){
  const V = X(), items = [["Lesson plans", () => go("plans")], ["Coaches overview", () => go("overview")], ["Timesheets", () => go("timesheet")], ["Register a swimmer", () => click("regBtn")], ["Admin settings / Team", () => click("teamBtn")], ["My account", () => click("meBtn")]];
  V.openSheet(`${V.head("More", "Vortex Swimming Academy")}<div class="sh-body mmenu">${items.map((it, i) => `<button class="btn" data-mi="${i}">${it[0]}</button>`).join("")}</div>`, true);
  document.querySelectorAll("[data-mi]").forEach(b => b.onclick = () => { V.closeSheet(); setTimeout(items[+b.dataset.mi][1], 30); });
}
function build(){
  const V = X(); if (!V || !V.S.ready) return;
  const mg = V.mgmt(), key = mg ? "m" : "c";
  if (built !== key) {
    built = key;
    const items = mg ? [["swimmers", "swim", "Swimmers"], ["track", "track", "Tracking"], ["deck", "deck", "Decksheets"], ["calendar", "cal", "Calendar"], ["more", "more", "More"]]
                     : [["swimmers", "swim", "Swimmers"], ["plans", "plan", "Plans"], ["deck", "deck", "Decksheet"], ["calendar", "cal", "Calendar"], ["submit", "send", "Submit"]];
    nav.innerHTML = items.map(([v, i, l]) => `<button data-nv="${v}">${svg(i)}<span>${l}</span></button>`).join("");
    nav.querySelectorAll("[data-nv]").forEach(b => b.onclick = () => { const v = b.dataset.nv;
      if (v === "more") return more(); if (v === "submit") { go("swimmers"); return setTimeout(() => click("subBtn"), 60); } if (v === "me") return click("meBtn"); go(v); });
  }
  nav.querySelectorAll("[data-nv]").forEach(b => b.setAttribute("aria-current", String(b.dataset.nv === V.S.view || (b.dataset.nv === "more" && ["overview", "timesheet", "plans"].includes(V.S.view)))));
}
function label(){
  document.querySelectorAll(".ov table").forEach(t => { const th = [...t.querySelectorAll("thead th")].map(x => x.textContent.trim()); if (!th.length) return;
    t.querySelectorAll("tbody tr").forEach(tr => [...tr.children].forEach((td, i) => { if (th[i] && !td.dataset.label) td.dataset.label = th[i]; })); });
}
let q = 0;
new MutationObserver(() => { if (q) return; q = requestAnimationFrame(() => { q = 0; build(); label(); }); }).observe(document.getElementById("main"), { childList: true, subtree: true });
setTimeout(build, 1500);
})();
