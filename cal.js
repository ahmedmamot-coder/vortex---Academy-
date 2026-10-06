/* Term calendar: every scheduled class across the term, with attendance for past days. Uses window.VX. */
(() => {
const X = () => window.VX;
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const C = { month: "", coach: "all", key: "", reps: null, loading: false };
const st = document.createElement("style");
st.textContent = `.cal{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}.cal .dh{font-size:11px;font-weight:600;color:var(--muted);text-align:center;padding:4px 0}
.cal .dc{min-height:86px;border-radius:12px;background:var(--surface);box-shadow:var(--shadow);padding:8px;text-align:left;border:2px solid transparent;display:flex;flex-direction:column;gap:3px;font-size:11.5px;color:var(--muted)}
.cal .dc b{font-size:14px;color:var(--ink)}.cal .dc.off{background:transparent;box-shadow:none;opacity:.35;cursor:default}.cal .dc.today{border-color:var(--sky)}
.cal .dc .n{font-weight:600;color:var(--ink)}.cal .dc .bar2{height:5px;border-radius:3px;background:var(--chip);overflow:hidden;margin-top:auto}.cal .dc .bar2 i{display:block;height:100%;background:linear-gradient(90deg,var(--sky),var(--mint))}
.cal .dc.miss .bar2 i{background:#f0b400}.calkey{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted);margin:10px 0}.calkey i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px;vertical-align:-1px}
@media (max-width:720px){.cal .dc{min-height:64px;padding:5px;font-size:10px}.cal .dc .t{display:none}}`;
document.head.appendChild(st);

const ymd = d => X().iso(d);
function term(){ const t = X().S.term || {}; return { start: t.start || "", end: t.end || "", name: t.name || "Term" }; }
function kidsInScope(){ const V = X(), mg = V.mgmt(); return Object.values(V.S.kids).filter(k => k.active !== false && (mg || k.cid === V.S.me.coachId)); }
function classesOn(ds){
  const V = X(), d = V.fromIso(ds), day = WD[d.getDay()], wk = ymd(V.sundayOf(d)), di = d.getDay(), cls = {};
  kidsInScope().forEach(k => { if (k.startDate && k.startDate > ds) return;
    (k.sessions || []).forEach(x => { if (x.day !== day) return;
      const coach = (x.coach || V.coachName(k.cid).replace(/^coach\s+/i, "")).trim();
      if (C.coach !== "all" && !V.norm(coach).split(/[\/,&]+/).map(s => s.trim()).includes(C.coach)) return;
      const key = V.timeVal(x.time) + "|" + V.norm(coach);
      const c = cls[key] = cls[key] || { time: x.time, tv: V.timeVal(x.time), coach, lanes: new Set(), kids: [] };
      if (x.lane) c.lanes.add(x.lane);
      const r = C.reps && C.reps[k.id + "|" + wk]; c.kids.push({ k, att: !!(r && r[di]), marked: !!r });
    }); });
  return Object.values(cls).sort((a, b) => a.tv - b.tv || a.coach.localeCompare(b.coach));
}
async function loadReps(from, to){
  const V = X(), key = from + "|" + to; if (C.key === key && (C.reps || C.loading)) return;
  C.key = key; C.loading = true; C.reps = null;
  const { data } = await V.sb.from("acad_reports").select("swimmer_id,week,data").gte("week", ymd(V.sundayOf(V.fromIso(from)))).lte("week", to);
  if (C.key !== key) return; C.loading = false; C.reps = {};
  (data || []).forEach(r => { C.reps[r.swimmer_id + "|" + r.week] = (r.data && r.data.att) || []; }); V.render();
}
function render(){
  const V = X(), el = document.getElementById("vCal"); if (!el) return;
  const esc = V.esc, tr = term(), today = ymd(new Date());
  if (!C.month) { const base = tr.start && today < tr.start ? tr.start : tr.end && today > tr.end ? tr.end : today; C.month = base.slice(0, 7); }
  const [y, m] = C.month.split("-").map(Number), first = new Date(y, m - 1, 1), last = new Date(y, m, 0);
  loadReps(ymd(first), ymd(last));
  const inTerm = ds => (!tr.start || ds >= tr.start) && (!tr.end || ds <= tr.end);
  const coaches = [...new Set(kidsInScope().flatMap(k => (k.sessions || []).flatMap(x => V.norm(x.coach || V.coachName(k.cid).replace(/^coach\s+/i, "")).split(/[\/,&]+/).map(s => s.trim()))).filter(Boolean))].sort();
  const months = []; if (tr.start && tr.end) { for (let d = new Date(+tr.start.slice(0, 4), +tr.start.slice(5, 7) - 1, 1); ymd(d) <= tr.end; d.setMonth(d.getMonth() + 1)) months.push(ymd(d).slice(0, 7)); }
  const mi = months.indexOf(C.month);
  let cells = WD.map(d => `<div class="dh">${d}</div>`).join("") + "<div></div>".repeat(first.getDay()).replace(/<div><\/div>/g, `<div class="dc off"></div>`);
  let tCls = 0, tDone = 0, tMiss = 0;
  for (let d = 1; d <= last.getDate(); d++) {
    const ds = ymd(new Date(y, m - 1, d));
    if (!inTerm(ds)) { cells += `<div class="dc off"><b>${d}</b></div>`; continue; }
    const cl = classesOn(ds), sw = cl.reduce((a, c) => a + c.kids.length, 0), past = ds <= today;
    const done = past ? cl.filter(c => c.kids.some(x => x.att)).length : 0, miss = past ? cl.length - done : 0;
    tCls += cl.length; tDone += done; tMiss += miss;
    cells += `<button class="dc ${ds === today ? "today" : ""} ${past && miss ? "miss" : ""}" data-cd="${ds}" ${cl.length ? "" : "disabled"}>
      <b>${d}</b>${cl.length ? `<span class="n">${cl.length} class${cl.length === 1 ? "" : "es"}</span><span class="t">${sw} swimmers</span>
      ${past ? `<span class="t">${done} with attendance</span><span class="bar2"><i style="width:${cl.length ? done / cl.length * 100 : 0}%"></i></span>` : `<span class="t">Upcoming</span>`}` : `<span class="t">No classes</span>`}</button>`;
  }
  el.innerHTML = `<div class="bar"><div><h1>Term calendar</h1><div class="sub">${esc(tr.name)}${tr.start ? ` · ${esc(tr.start)} to ${esc(tr.end)}` : ""} · past days show attendance, future days show what's scheduled</div></div>
      ${V.mgmt() ? "" : `<div class="tools"><button class="btn" id="clBack">‹ Back to swimmers</button></div>`}</div>
    <div class="bar filters">
      <div class="seg" role="group" aria-label="Month"><button id="clPrev" ${mi > 0 || !months.length ? "" : "disabled"}>‹</button><button aria-pressed="true" style="min-width:150px">${V.MON[m - 1]} ${y}</button><button id="clNext" ${mi < months.length - 1 || !months.length ? "" : "disabled"}>›</button></div>
      ${coaches.length > 1 ? `<select class="sel" id="clCoach"><option value="all">All coaches</option>${coaches.map(c => `<option value="${esc(c)}" ${C.coach === c ? "selected" : ""}>${esc(c.replace(/\b\w/g, s => s.toUpperCase()))}</option>`).join("")}</select>` : ""}
      ${months.length ? `<div class="seg" role="group" aria-label="Jump to month">${months.map(mm => `<button data-cm="${mm}" aria-pressed="${mm === C.month}">${V.MON[+mm.slice(5) - 1]}</button>`).join("")}</div>` : ""}
    </div>
    <div class="kpis"><div class="kpi"><b>${tCls}</b><span>Classes this month</span></div><div class="kpi"><b>${tDone}</b><span>With attendance</span></div>
      <div class="kpi"><b>${tMiss}</b><span>Past, no attendance yet</span></div><div class="kpi"><b>${kidsInScope().length}</b><span>Swimmers</span></div></div>
    <div class="calkey"><span><i style="background:linear-gradient(90deg,#067EEA,#1DFEBF)"></i>Attendance taken</span><span><i style="background:#f0b400"></i>Some classes missing attendance</span><span><i style="border:2px solid #067EEA"></i>Today</span></div>
    <div class="cal">${cells}</div>`;
  const q = s => el.querySelector(s);
  if (q("#clBack")) q("#clBack").onclick = () => { V.S.view = "swimmers"; V.render(); };
  if (q("#clPrev")) q("#clPrev").onclick = () => { const d = new Date(y, m - 2, 1); C.month = ymd(d).slice(0, 7); V.render(); };
  if (q("#clNext")) q("#clNext").onclick = () => { const d = new Date(y, m, 1); C.month = ymd(d).slice(0, 7); V.render(); };
  if (q("#clCoach")) q("#clCoach").onchange = e => { C.coach = e.target.value; V.render(); };
  el.querySelectorAll("[data-cm]").forEach(b => b.onclick = () => { C.month = b.dataset.cm; V.render(); });
  el.querySelectorAll("[data-cd]").forEach(b => b.onclick = () => openDay(b.dataset.cd));
}
function openDay(ds){
  const V = X(), esc = V.esc, d = V.fromIso(ds), today = ymd(new Date()), past = ds <= today, cl = classesOn(ds);
  const label = `${["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()]} ${d.getDate()} ${V.MON[d.getMonth()]} ${d.getFullYear()}`;
  V.openSheet(`${V.head(label, `${cl.length} classes · ${cl.reduce((a, c) => a + c.kids.length, 0)} swimmers${past ? "" : " · upcoming"}`)}<div class="sh-body">
    ${cl.map(c => { const max = c.kids.every(x => x.k.level === 5) ? 8 : 4, n = c.kids.length, a = c.kids.filter(x => x.att).length;
      return `<div class="box" style="--c:${past ? (a ? "var(--mint)" : "#f0b400") : "var(--sky)"}"><h3>${esc(V.fmtTime(c.time))} · Coach ${esc(c.coach)}<small>${c.lanes.size ? "Lane " + [...c.lanes].map(esc).join(", ") + " · " : ""}${n}/${max}${past ? ` · ${a} present` : ""}</small></h3>
        ${c.kids.sort((p, q) => p.k.name.localeCompare(q.k.name)).map(x => `<div class="as"><span>${esc(x.k.name)} <span class="note" style="margin:0">· ${esc((LEVELS[x.k.level - 1] || {}).short || "")}</span></span>
          ${past ? `<span class="pill ${x.att ? "done" : x.marked ? "todo" : "wip"}">${x.att ? "Present" : x.marked ? "Absent" : "Not marked"}</span>` : ""}</div>`).join("")}</div>`; }).join("") || `<div class="empty">No classes on this day.</div>`}
  </div><div class="sh-foot"><span class="sp"></span><button class="btn primary" id="clOpenWeek">Open this week's reports</button></div>`);
  document.getElementById("clOpenWeek").onclick = () => { V.closeSheet(); V.goDay(ds); };
}
window.VXC = { render };
})();
