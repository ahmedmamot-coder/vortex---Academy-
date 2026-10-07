/* Deck sheets: Master (all levels, per day and time) and Instructor (per coach). Uses window.VX. */
(() => {
const X = () => window.VX;
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const D = { mode: "", day: WD[new Date().getDay()], coach: "all", ageMin: "", ageMax: "", phone: "", contacts: null, loading: false };
const cap = list => list.every(e => e.kid.level === 5) ? 8 : 4;
const yearsOf = k => { if (k.dob) { const b = X().fromIso(k.dob), n = new Date(); let y = n.getFullYear() - b.getFullYear(); if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y--; return y; } const a = parseInt(k.age, 10); return isNaN(a) ? null : a; };
const digits = s => String(s || "").replace(/\D/g, "");
const st = document.createElement("style");
st.textContent = `@media print{.top,.levels,#mgBar,.deck-ctl,.toast{display:none!important}main{padding:0!important;max-width:none!important}body{background:#fff}.ov{box-shadow:none!important}.deck-class{break-inside:avoid}}
.deck-class{margin-bottom:14px}.deck-head{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline;padding:10px 16px;background:var(--navy);color:#fff;border-radius:12px 12px 0 0}.deck-head b{font-size:15px}.deck-head span{font-size:12.5px;color:#b9c2e0}
.deck-head .cap{margin-left:auto;font-weight:600;border-radius:8px;padding:2px 8px;background:rgba(255,255,255,.12);color:#fff}.deck-head .cap.over{background:#f4c7c3;color:#8a1c14}.deck-head .cap.full{background:var(--mint);color:var(--navy)}
.deck-class .ov{border-radius:0 0 12px 12px}.deck-class table{min-width:520px}.deck-class td,.deck-class th{text-align:left!important;padding:9px 12px!important}.pd{font-size:11px;font-weight:600;border-radius:8px;padding:2px 8px}.pd.y{background:#d8fff2;color:#06704f}.pd.n{background:#ffe1de;color:#b4231f}
.att{border:1.5px solid var(--line);background:var(--surface-2);border-radius:9px;padding:6px 10px;font-size:12px;font-weight:600;color:var(--muted);white-space:nowrap;cursor:pointer}.att.on{background:#d8fff2;border-color:#0E9F7A;color:#06704f}
.deck-head .att.all{margin-left:auto;background:rgba(255,255,255,.12);border-color:rgba(255,255,255,.3);color:#fff}@media print{.att.all{display:none}}`;
document.head.appendChild(st);

function entries(){
  const V = X(), mg = V.mgmt(), out = [];
  Object.values(V.S.kids).forEach(k => {
    if (k.active === false) return;
    if (!mg && k.cid !== V.S.me.coachId) return;
    (k.sessions || []).forEach(x => { if (x.day !== D.day) return;
      out.push({ kid: k, time: x.time, tv: V.timeVal(x.time), lane: x.lane || "", coach: (x.coach || V.coachName(k.cid).replace(/^coach\s+/i, "")).trim() }); });
  });
  return out;
}
function filtered(list){
  const V = X(), mn = D.ageMin === "" ? null : +D.ageMin, mx = D.ageMax === "" ? null : +D.ageMax, ph = digits(D.phone);
  return list.filter(e => {
    if (mn != null || mx != null) { const y = yearsOf(e.kid); if (y == null || (mn != null && y < mn) || (mx != null && y > mx)) return false; }
    if (ph) { const c = D.contacts && D.contacts[e.kid.id]; if (!c || !c.some(p => digits(p).includes(ph))) return false; }
    if (D.mode === "instructor" && D.coach !== "all" && V.norm(e.coach).split(/[\/,&]+/).map(s => s.trim()).indexOf(D.coach) < 0) return false;
    return true;
  });
}
async function loadContacts(){
  const V = X(); if (D.contacts || D.loading || !V.mgmt()) return; D.loading = true;
  const { data } = await V.sb.from("acad_contacts").select("swimmer_id,phones").limit(5000);
  D.contacts = {}; (data || []).forEach(r => { D.contacts[r.swimmer_id] = r.phones || []; }); D.loading = false; V.render();
}
function render(){
  const V = X(), el = document.getElementById("vDeck"); if (!el) return;
  const esc = V.esc, mg = V.mgmt(); if (!D.mode) D.mode = mg ? "master" : "instructor"; if (!mg) D.mode = "instructor";
  if (mg) loadContacts();
  const all = entries(), list = filtered(all);
  const coaches = [...new Set(all.flatMap(e => V.norm(e.coach).split(/[\/,&]+/).map(s => s.trim())).filter(Boolean))].sort();
  const counts = {}; Object.values(V.S.kids).forEach(k => { if (k.active === false || (!mg && k.cid !== V.S.me.coachId)) return; (k.sessions || []).forEach(x => { counts[x.day] = (counts[x.day] || 0) + 1; }); });
  const lvl = k => { const L = LEVELS[k.level - 1] || {}; return `${esc(L.short || "")} · ${esc(L.name || "")}`; };
  const paid = k => k.paid === true ? `<span class="pd y">Paid</span>` : k.paid === false ? `<span class="pd n">Not paid</span>` : "";
  const phone = k => D.contacts && D.contacts[k.id] ? esc(D.contacts[k.id].join(", ")) : "";
  const ctl = `<div class="bar deck-ctl">
      ${mg ? `<div class="seg" role="group" aria-label="Deck sheet"><button data-dm="master" aria-pressed="${D.mode === "master"}">Master decksheet</button><button data-dm="instructor" aria-pressed="${D.mode === "instructor"}">Instructor decksheet</button></div>` : `<button class="btn" id="dkBack">‹ Back to swimmers</button>`}
      <div class="tools"><button class="btn primary" id="dkPdf">Download PDF</button><button class="btn" id="dkPrint">Print</button><button class="btn dark" id="dkXls">Download Excel</button></div></div>
    <div class="bar deck-ctl"><div class="seg days-seg" role="group" aria-label="Day">${WD.map(d => `<button data-dd="${d}" aria-pressed="${D.day === d}" ${counts[d] ? "" : "disabled"}>${d}</button>`).join("")}</div></div>
    <div class="bar filters deck-ctl">
      <label class="f" style="flex-direction:row;align-items:center;gap:6px">Age<input class="inp" id="dkMin" inputmode="numeric" placeholder="from" value="${esc(D.ageMin)}" style="width:70px">–<input class="inp" id="dkMax" inputmode="numeric" placeholder="to" value="${esc(D.ageMax)}" style="width:70px"></label>
      ${mg ? `<input class="inp" id="dkPhone" inputmode="tel" placeholder="Filter by mobile" value="${esc(D.phone)}" style="max-width:200px">` : ""}
      ${D.mode === "instructor" && coaches.length > 1 ? `<select class="sel" id="dkCoach"><option value="all">All coaches</option>${coaches.map(c => `<option value="${esc(c)}" ${D.coach === c ? "selected" : ""}>${esc(c.replace(/\b\w/g, m => m.toUpperCase()))}</option>`).join("")}</select>` : ""}
      ${D.ageMin || D.ageMax || D.phone || D.coach !== "all" ? `<button class="btn ghost" id="dkClear">Clear filters</button>` : ""}
    </div>`;
  const di = WD.indexOf(D.day), dDate = V.fromIso(V.S.week); dDate.setDate(dDate.getDate() + di); const future = V.iso(dDate) > V.iso(new Date());
  const isP = k => { const r = V.reportOf(k); return !!(r && r.att && r.att[di]); };
  const attCell = e => future ? `<td><span class="note" style="margin:0">Upcoming</span></td>` : `<td><button class="att ${isP(e.kid) ? "on" : ""}" data-att="${esc(e.kid.cid + "/" + e.kid.id)}">${isP(e.kid) ? "✓ Present" : "Mark present"}</button></td>`;
  const allBtn = items => future ? "" : `<button class="att all" data-allp="${esc(items.map(e => e.kid.cid + "/" + e.kid.id).join(","))}">All present</button>`;
  const pc = items => items.filter(e => isP(e.kid)).length;
  const title = `<div class="bar"><div><h1>${D.mode === "master" ? "Master decksheet" : "Instructor decksheet"} · ${({Sun:"Sunday",Mon:"Monday",Tue:"Tuesday",Wed:"Wednesday",Thu:"Thursday",Fri:"Friday",Sat:"Saturday"})[D.day]} ${dDate.getDate()} ${V.MON[dDate.getMonth()]}</h1>
    <div class="sub">${list.length} swimmer${list.length === 1 ? "" : "s"}${list.length !== all.length ? ` of ${all.length}` : ""} ${future ? " · upcoming" : ` · <b>${list.filter(e => isP(e.kid)).length} present</b>`} · classes are 40 min · max 4 per class, Nitro Needlefish 8</div></div></div>`;
  let body = "";
  const classBlock = (label, sub, items, showCoach) => {
    const c = cap(items), n = items.length, pt = items.every(e => e.kid.level === 9);
    return `<div class="deck-class"><div class="deck-head"><b>${label}</b><span>${sub}</span>${future ? "" : `<span>${pc(items)} present</span>`}${allBtn(items)}${pt ? "" : `<span class="cap ${n > c ? "over" : n === c ? "full" : ""}">${n}/${c}${n > c ? " · over capacity" : ""}</span>`}</div>
      <div class="ov"><table><thead><tr>${showCoach ? "<th>Coach</th><th>Lane</th>" : "<th>Lane</th>"}<th>Swimmer</th><th>Level</th><th>Age</th>${mg ? "<th>Mobile</th><th>Payment</th>" : ""}<th>Present</th></tr></thead><tbody>
      ${items.map(e => `<tr>${showCoach ? `<td>${esc(e.coach)}</td>` : ""}<td>${esc(e.lane)}</td><td><b>${esc(e.kid.name)}</b></td><td>${lvl(e.kid)}</td><td>${esc(V.ageOf(e.kid))}</td>${mg ? `<td>${phone(e.kid)}</td><td>${paid(e.kid)}</td>` : ""}${attCell(e)}</tr>`).join("")}
      </tbody></table></div></div>`;
  };
  if (!list.length) body = `<div class="list"><div class="empty"><b>No swimmers</b>${all.length ? "Nothing matches these filters." : `No classes on ${D.day}.`}</div></div>`;
  else if (D.mode === "master") {
    const byTime = {}; list.forEach(e => (byTime[e.time] = byTime[e.time] || []).push(e));
    body = Object.keys(byTime).sort((a, b) => V.timeVal(a) - V.timeVal(b)).map(t => {
      const items = byTime[t].sort((a, b) => a.coach.localeCompare(b.coach) || a.kid.level - b.kid.level || a.kid.name.localeCompare(b.kid.name));
      const groups = {}; items.forEach(e => (groups[V.norm(e.coach)] = groups[V.norm(e.coach)] || []).push(e));
      const over = Object.values(groups).filter(g => !g.every(e => e.kid.level === 9) && g.length > cap(g)).length;
      return `<div class="deck-class"><div class="deck-head"><b>${esc(D.day)} ${esc(V.fmtTime(t))}</b>${future ? "" : `<span>${pc(items)}/${items.length} present</span>`}${allBtn(items)}<span>${items.length} swimmers · ${Object.keys(groups).length} coach${Object.keys(groups).length === 1 ? "" : "es"}</span>${over ? `<span class="cap over">${over} class${over === 1 ? "" : "es"} over capacity</span>` : ""}</div>
        <div class="ov"><table><thead><tr><th>Coach</th><th>Lane</th><th>Swimmer</th><th>Level</th><th>Age</th>${mg ? "<th>Mobile</th><th>Payment</th>" : ""}<th>Present</th></tr></thead><tbody>
        ${items.map(e => `<tr><td>${esc(e.coach)}</td><td>${esc(e.lane)}</td><td><b>${esc(e.kid.name)}</b></td><td>${lvl(e.kid)}</td><td>${esc(V.ageOf(e.kid))}</td>${mg ? `<td>${phone(e.kid)}</td><td>${paid(e.kid)}</td>` : ""}${attCell(e)}</tr>`).join("")}
        </tbody></table></div></div>`;
    }).join("");
  } else {
    const byCoach = {}; list.forEach(e => (byCoach[e.coach] = byCoach[e.coach] || []).push(e));
    body = Object.keys(byCoach).sort().map(c => {
      const byT = {}; byCoach[c].forEach(e => (byT[e.time] = byT[e.time] || []).push(e));
      return `<h2 style="font-size:17px;margin:18px 0 8px">Coach ${esc(c)} <span class="note">· ${byCoach[c].length} swimmers · ${Object.keys(byT).length} classes</span></h2>` +
        Object.keys(byT).sort((a, b) => V.timeVal(a) - V.timeVal(b)).map(t => { const it = byT[t].sort((a, b) => a.kid.level - b.kid.level || a.kid.name.localeCompare(b.kid.name));
          const lanes = [...new Set(it.map(e => e.lane).filter(Boolean))];
          return classBlock(`${esc(D.day)} ${esc(V.fmtTime(t))}`, lanes.length ? "Lane " + lanes.map(esc).join(", ") : "", it, false); }).join("");
    }).join("");
  }
  el.innerHTML = ctl + title + body;
  wire(el, list);
}
function wire(el, list){
  const V = X(), q = s => el.querySelector(s);
  el.querySelectorAll("[data-dm]").forEach(b => b.onclick = () => { D.mode = b.dataset.dm; V.render(); });
  el.querySelectorAll("[data-dd]").forEach(b => b.onclick = () => { D.day = b.dataset.dd; V.render(); });
  const bind = (id, k) => { const i = q(id); if (i) i.onchange = () => { D[k] = i.value.trim(); V.render(); }; };
  bind("#dkMin", "ageMin"); bind("#dkMax", "ageMax"); bind("#dkPhone", "phone"); bind("#dkCoach", "coach");
  if (q("#dkClear")) q("#dkClear").onclick = () => { D.ageMin = D.ageMax = D.phone = ""; D.coach = "all"; V.render(); };
  if (q("#dkBack")) q("#dkBack").onclick = () => { V.S.view = "swimmers"; V.render(); };
  q("#dkPrint").onclick = () => window.print();
  el.querySelectorAll("[data-att]").forEach(b => b.onclick = async () => { const k = V.S.kids[b.dataset.att]; if (!k) return; b.disabled = true; const di = WD.indexOf(D.day), r = V.reportOf(k); await V.saveAtt(k, di, !(r && r.att && r.att[di])); });
  el.querySelectorAll("[data-allp]").forEach(b => b.onclick = async () => { b.disabled = true; b.textContent = "Saving…"; const di = WD.indexOf(D.day);
    for (const key of b.dataset.allp.split(",")) { const k = V.S.kids[key], r = k && V.reportOf(k); if (k && !(r && r.att && r.att[di])) await V.saveAtt(k, di, true); } V.toast("Marked present ✓"); });
  q("#dkPdf").onclick = async () => { if (!window.VXDP) return V.toast("Reload the page and try again"); V.toast("Preparing PDF…"); await VXDP.build(D.mode, D.day, list); };
  q("#dkXls").onclick = () => {
    if (!window.XLSX) return V.toast("The Excel tool didn't load – reload the page");
    const mg = V.mgmt(), rows = [[D.mode === "master" ? "Master decksheet" : "Instructor decksheet", D.day], [],
      ["Time", "Coach", "Lane", "Swimmer", "Level", "Age"].concat(mg ? ["Mobile", "Payment"] : [])];
    list.slice().sort((a, b) => D.mode === "master" ? a.tv - b.tv || a.coach.localeCompare(b.coach) : a.coach.localeCompare(b.coach) || a.tv - b.tv)
      .forEach(e => { const L = LEVELS[e.kid.level - 1] || {}; rows.push([V.fmtTime(e.time), e.coach, e.lane, e.kid.name, `${L.short || ""} ${L.name || ""}`.trim(), V.ageOf(e.kid)]
        .concat(mg ? [D.contacts && D.contacts[e.kid.id] ? D.contacts[e.kid.id].join(", ") : "", e.kid.paid === true ? "Paid" : e.kid.paid === false ? "Not paid" : ""] : [])); });
    const ws = XLSX.utils.aoa_to_sheet(rows); ws["!cols"] = [{ wch: 10 }, { wch: 14 }, { wch: 7 }, { wch: 30 }, { wch: 26 }, { wch: 10 }, { wch: 22 }, { wch: 10 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, D.day);
    V.deliver(`${D.mode === "master" ? "Master" : "Instructor"} decksheet – ${D.day}.xlsx`, new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })]));
  };
}
window.VXD = { render };
})();
