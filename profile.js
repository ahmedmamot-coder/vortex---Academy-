/* Swimmer profile (coaches + management) and coach timesheets (management). Uses window.VX from app.js. */
(() => {
const X = () => window.VX;
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const T = { from: "", to: "", coach: "", only: "part", key: "", reps: null, loading: false, err: "" };
const addDays = (s, n) => { const d = X().fromIso(s); d.setDate(d.getDate() + n); return X().iso(d); };
const fmtDate = s => { const d = X().fromIso(String(s).slice(0, 10)); return `${WD[d.getDay()]} ${d.getDate()} ${X().MON[d.getMonth()]} ${d.getFullYear()}`; };
const term = () => { const t = X().S.term || {}; return { start: t.start || "", end: t.end || "", name: t.name || "Current term" }; };
const lv = n => LEVELS[n - 1] || { short: "–", name: "" };
function datesFor(kid, from, to){
  const days = new Set((kid.sessions || []).map(x => WD.indexOf(x.day))), out = [];
  if (!from || !to || !days.size) return out;
  for (let d = X().fromIso(from), e = X().fromIso(to); d <= e; d.setDate(d.getDate() + 1)) if (days.has(d.getDay())) out.push(X().iso(d));
  return out;
}

/* ---------- swimmer profile ---------- */
async function open(key){
  const V = X(), kid = V.S.kids[key]; if (!kid) return;
  const mg = V.mgmt(), esc = V.esc, L = lv(kid.level);
  V.openSheet(`${V.head(kid.name, `${L.short} · ${L.name} · ${V.coachName(kid.cid)}`, kid.level)}<div class="sh-body" id="pfBody"><div class="empty">Loading profile…</div></div>`);
  const [rep, hist] = await Promise.all([
    V.sb.from("acad_reports").select("*").eq("swimmer_id", kid.id).order("week", { ascending: false }),
    V.sb.from("acad_level_history").select("*").eq("swimmer_id", kid.id).order("changed_at", { ascending: true }) ]);
  const body = document.getElementById("pfBody"); if (!body) return;
  if (rep.error || hist.error) { body.innerHTML = `<div class="empty">Couldn't load this profile – check your connection.</div>`; return; }
  const reports = rep.data || [], tr = term(), start = kid.startDate || tr.start, today = V.iso(new Date());
  const attended = [];
  reports.forEach(r => (r.data && r.data.att || []).forEach((a, i) => { if (!a) return;
    const s = (kid.sessions || []).find(x => x.day === V.DAYS[i]); attended.push({ date: addDays(r.week, i), time: s ? V.fmtTime(s.time) : "" }); }));
  attended.sort((a, b) => a.date < b.date ? 1 : -1);
  const booked = datesFor(kid, start, tr.end).length, soFar = datesFor(kid, start, tr.end && tr.end < today ? tr.end : today).length;
  const row = (k, v) => `<div class="as"><span class="note" style="flex:0 0 120px;margin:0">${k}</span><span>${v}</span></div>`;
  const sched = (kid.sessions || []).length ? kid.sessions.map(x => `<span><b>${esc(x.day)} ${esc(V.fmtTime(x.time))}</b>${[x.coach, x.lane && "Lane " + x.lane].filter(Boolean).map(esc).join(" · ")}</span>`).join("") : `<span>${esc(kid.group || "No schedule saved")}</span>`;
  const prog = (hist.data || []).map(h => `<div class="as"><span><b>${esc(lv(h.to_level).short)} · ${esc(lv(h.to_level).name)}</b><br><span class="note">from ${esc(lv(h.from_level).short)} · ${esc(fmtDate(h.changed_at))}</span></span></div>`).join("");
  const cards = reports.map(r => { const n = (r.data && r.data.att || []).filter(Boolean).length, st = r.reviewed_at ? "Reviewed" : r.done ? "Done" : "In progress";
    return `<div class="as"><span><b>Week of ${esc(V.weekLabel(r.week))}</b><br><span class="note">${esc(lv(r.level).short)} · ${st} · attended ${n}</span></span><button class="btn" data-pdf="${esc(r.week)}">PDF</button></div>`; }).join("");
  const comments = reports.filter(r => r.data && String(r.data.comment || "").trim()).map(r => `<div class="sk"><p class="note" style="margin:0 0 4px">Week of ${esc(V.weekLabel(r.week))}</p><p style="margin:0">${esc(r.data.comment)}</p></div>`).join("");
  body.innerHTML = `
    <div class="box"><h3>Swimmer</h3>
      ${row("Full name", `<b>${esc(kid.name)}</b>`)}
      ${mg ? row("Date of birth", kid.dob ? `${esc(fmtDate(kid.dob))} · age ${esc(V.ageOf(kid))}` : "Not saved") : ""}
      ${row("Level", `${esc(L.short)} · ${esc(L.name)}`)}
      ${row("Coach", esc(V.coachName(kid.cid)))}
      ${mg ? row("Term", `${esc(kid.term || tr.name)}${tr.start && tr.end ? ` · ${esc(fmtDate(tr.start))} – ${esc(fmtDate(tr.end))}` : ""}`) : ""}
      ${mg ? row("Start date", start ? esc(fmtDate(start)) + (kid.startDate ? "" : " (term start)") : "Not saved") : ""}
    </div>
    <div class="box"><h3>Schedule</h3><div class="schedlist" style="margin-top:0">${sched}</div></div>
    ${mg ? `<div class="box" style="--c:var(--royal)"><h3>Classes</h3>
      <div class="kpis" style="grid-template-columns:repeat(3,1fr);margin:0 0 10px">
        <div class="kpi"><b style="color:${kid.paid === true ? "#06704f" : kid.paid === false ? "#b4231f" : "inherit"}">${kid.paid === true ? "Paid" : kid.paid === false ? "Not paid" : "–"}</b><span>Payment</span></div>
        <div class="kpi"><b>${attended.length}</b><span>Attended</span></div>
        <div class="kpi"><b>${booked}</b><span>Booked this term</span></div></div>
      <p class="note" style="margin:0 0 10px">Booked from the start date to the end of term: ${booked} classes · ${soFar} of them up to today.</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:flex-end">
        <label class="f">Payment<select class="inp" id="pfPaid" style="width:130px"><option value="">Not set</option><option value="1" ${kid.paid === true ? "selected" : ""}>Paid</option><option value="0" ${kid.paid === false ? "selected" : ""}>Not paid</option></select></label>
        <label class="f">Start date<input class="inp" type="date" id="pfStart" value="${esc(kid.startDate || "")}"></label>
        <button class="btn primary" id="pfSave">Save</button></div></div>` : ""}
    <div class="box" style="--c:var(--sky)"><h3>Attended classes <small>${attended.length}</small></h3>
      ${attended.length ? attended.map(a => `<div class="as"><span>${esc(fmtDate(a.date))}</span><span class="note" style="margin:0">${esc(a.time)}</span></div>`).join("") : `<p class="note" style="margin:0">No attendance recorded yet.</p>`}</div>
    <div class="box" style="--c:var(--purple)"><h3>Level progression</h3>
      ${row("Started in", `${esc(lv((hist.data || [])[0] ? hist.data[0].from_level : kid.level).short)}${start ? " · " + esc(fmtDate(start)) : ""}`)}${prog || `<p class="note" style="margin:6px 0 0">No level changes yet.</p>`}</div>
    <div class="box" style="--c:var(--mint)"><h3>Report cards <small>${reports.length}</small></h3>${cards || `<p class="note" style="margin:0">No reports yet.</p>`}</div>
    <div class="box" style="--c:var(--mint)"><h3>Coach comments</h3>${comments || `<p class="note" style="margin:0">No comments yet.</p>`}</div>`;
  body.addEventListener("click", async e => {
    const b = e.target.closest("[data-pdf]"); if (!b) return;
    const r = reports.find(x => x.week === b.dataset.pdf), saved = V.S.week;
    V.S.week = r.week; try { await V.downloadPdfs([{ kid, r: V.toRep(r) }], "single"); } finally { V.S.week = saved; }
  });
  const sv = document.getElementById("pfSave");
  if (sv) sv.onclick = async () => {
    const p = document.getElementById("pfPaid").value.trim(), s = document.getElementById("pfStart").value;
    const upd = { paid: p === "" ? null : p === "1", start_date: s || null };
    const { error } = await V.sb.from("acad_swimmers").update(upd).eq("id", kid.id);
    if (error) return V.toast("Not saved – " + error.message);
    kid.paid = upd.paid; kid.startDate = s || ""; V.toast("Saved"); open(key);
  };
}

/* ---------- timesheets ---------- */
const coachShort = id => X().norm(X().coachName(id));
function slotsFor(id){
  const V = X(), me = coachShort(id), slots = {};
  Object.values(V.S.kids).forEach(k => { if (k.active === false) return;
    (k.sessions || []).forEach(x => {
      const names = String(x.coach || "").split(/[\/,&]+/).map(V.norm).filter(Boolean);
      if (names.length ? !names.includes(me) : k.cid !== id) return;
      const key = x.day + "|" + x.time; (slots[key] = slots[key] || { day: x.day, time: x.time, kids: [] }).kids.push(k);
    }); });
  return Object.values(slots);
}
function classesFor(id, from, to, reps){
  const V = X(), today = V.iso(new Date()), slots = slotsFor(id), out = [];
  for (let d = V.fromIso(from), e = V.fromIso(to); d <= e; d.setDate(d.getDate() + 1)) {
    const ds = V.iso(d), wk = V.iso(V.sundayOf(d)), di = d.getDay();
    slots.filter(s => s.day === WD[di]).forEach(s => {
      const kids = s.kids.filter(k => !k.startDate || k.startDate <= ds); if (!kids.length) return;
      const att = kids.filter(k => { const r = reps[k.id + "|" + wk]; return r && r[di]; }).length;
      out.push({ date: ds, time: s.time, tv: V.timeVal(s.time), swimmers: kids.length, att, status: ds > today ? "Upcoming" : att ? "Delivered" : "No attendance" });
    });
  }
  return out.sort((a, b) => a.date === b.date ? a.tv - b.tv : a.date < b.date ? -1 : 1);
}
async function loadReps(){
  const V = X(), key = T.from + "|" + T.to; if (T.key === key && (T.reps || T.loading)) return;
  T.key = key; T.loading = true; T.err = ""; T.reps = null;
  const { data, error } = await V.sb.from("acad_reports").select("swimmer_id,week,data").gte("week", V.iso(V.sundayOf(V.fromIso(T.from)))).lte("week", T.to);
  if (T.key !== key) return;
  T.loading = false; if (error) { T.err = error.message; T.reps = {}; } else { T.reps = {}; (data || []).forEach(r => { T.reps[r.swimmer_id + "|" + r.week] = (r.data && r.data.att) || []; }); }
  V.render();
}
function renderTimesheet(){
  const V = X(), el = document.getElementById("vTimesheet"); if (!el) return;
  if (!V.mgmt()) { el.innerHTML = ""; return; }
  const esc = V.esc, tr = term(), today = V.iso(new Date());
  if (!T.from) { const n = new Date(); T.from = V.iso(new Date(n.getFullYear(), n.getMonth(), 1)); T.to = V.iso(new Date(n.getFullYear(), n.getMonth() + 1, 0)); if (tr.start && T.from < tr.start) T.from = tr.start; }
  loadReps();
  const ids = V.visibleCoachIds().sort((a, b) => V.coachName(a).localeCompare(V.coachName(b)));
  const C = id => V.S.coaches[id] || {};
  const shown = ids.filter(id => T.only === "all" || C(id).partTime);
  const head = `<div class="bar"><div><h1>Timesheets</h1><div class="sub">Classes each coach taught, from the swimmers' schedules and the attendance coaches mark</div></div></div>
    <div class="bar filters">
      <div class="seg" role="group" aria-label="Coaches"><button data-tsonly="part" aria-pressed="${T.only === "part"}">Part-time</button><button data-tsonly="all" aria-pressed="${T.only === "all"}">All coaches</button></div>
      <label class="f" style="flex-direction:row;align-items:center;gap:6px">From<input class="inp" type="date" id="tsFrom" value="${esc(T.from)}" style="width:auto"></label>
      <label class="f" style="flex-direction:row;align-items:center;gap:6px">To<input class="inp" type="date" id="tsTo" value="${esc(T.to)}" style="width:auto"></label>
      ${T.coach ? `<button class="btn" id="tsBack">‹ All coaches</button>` : ""}
    </div>`;
  if (!T.reps) { el.innerHTML = head + `<div class="list"><div class="empty">Loading attendance…</div></div>`; return; }
  const hrs = m => (Math.round(m / 6) / 10).toLocaleString();
  if (!T.coach) {
    const rows = shown.map(id => { const cl = classesFor(id, T.from, T.to, T.reps), del = cl.filter(c => c.status === "Delivered").length,
      past = cl.filter(c => c.status !== "Upcoming").length, mins = C(id).classMinutes || 40;
      return `<tr class="click" data-tsc="${esc(id)}"><td><b>${esc(V.coachName(id))}</b><br><span class="note">${C(id).partTime ? "Part-time" : "Full-time"} · ${mins} min classes</span></td>
        <td>${cl.length}</td><td>${del}</td><td>${past - del}</td><td><b>${hrs(del * mins)}</b></td></tr>`; }).join("");
    el.innerHTML = head + `${T.err ? `<p class="note">Couldn't load attendance: ${esc(T.err)}</p>` : ""}
      <div class="ov"><table><thead><tr><th>Coach</th><th>Scheduled</th><th>Delivered</th><th>No attendance</th><th>Hours</th></tr></thead><tbody>
      ${rows || `<tr><td colspan="5" class="empty">${T.only === "part" ? "No coaches are marked part-time yet. Choose All coaches, open a coach and tick Part-time." : "No coaches yet."}</td></tr>`}</tbody></table></div>
      <p class="note">Delivered = a class where at least one swimmer was marked present. Hours = delivered classes × class length.</p>`;
  } else {
    const id = T.coach, c = C(id), mins = c.classMinutes || 40, cl = classesFor(id, T.from, T.to, T.reps), del = cl.filter(x => x.status === "Delivered").length;
    el.innerHTML = head + `
      <div class="bar"><div><h1>${esc(V.coachName(id))}</h1><div class="sub">${esc(fmtDate(T.from))} – ${esc(fmtDate(T.to))}</div></div>
        <div class="tools"><button class="btn dark" id="tsXls">Download Excel</button></div></div>
      <div class="kpis"><div class="kpi"><b>${cl.length}</b><span>Scheduled classes</span></div><div class="kpi"><b>${del}</b><span>Delivered</span></div>
        <div class="kpi"><b>${hrs(del * mins)}</b><span>Hours</span></div><div class="kpi"><b>${mins}</b><span>Minutes per class</span></div></div>
      ${V.S.me.admin ? `<div class="bar"><label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="tsPart" ${c.partTime ? "checked" : ""}> Part-time coach</label>
        <label class="f" style="flex-direction:row;align-items:center;gap:6px">Class length (min)<input class="inp" id="tsMin" inputmode="numeric" value="${mins}" style="width:80px"></label>
        <button class="btn" id="tsSave">Save</button></div>` : ""}
      <div class="ov"><table><thead><tr><th>Date</th><th>Time</th><th>Swimmers</th><th>Attended</th><th>Status</th></tr></thead><tbody>
      ${cl.map(x => `<tr><td>${esc(fmtDate(x.date))}</td><td>${esc(V.fmtTime(x.time))}</td><td>${x.swimmers}</td><td>${x.status === "Upcoming" ? "–" : x.att}</td>
        <td><span class="c ${x.status === "Delivered" ? "f" : x.status === "Upcoming" ? "z" : "p"}">${x.status}</span></td></tr>`).join("") || `<tr><td colspan="5" class="empty">No classes scheduled for this coach in these dates.</td></tr>`}
      </tbody></table></div>`;
  }
  wire(el);
}
function wire(el){
  const V = X(), q = s => el.querySelector(s);
  el.querySelectorAll("[data-tsonly]").forEach(b => b.onclick = () => { T.only = b.dataset.tsonly; V.render(); });
  el.querySelectorAll("[data-tsc]").forEach(r => r.onclick = () => { T.coach = r.dataset.tsc; V.render(); });
  const ch = () => { const f = q("#tsFrom").value, t = q("#tsTo").value; if (!f || !t || f > t) return V.toast("Choose a valid date range"); T.from = f; T.to = t; V.render(); };
  q("#tsFrom").onchange = ch; q("#tsTo").onchange = ch;
  if (q("#tsBack")) q("#tsBack").onclick = () => { T.coach = ""; V.render(); };
  if (q("#tsSave")) q("#tsSave").onclick = async () => {
    const m = +q("#tsMin").value; if (!(m > 0 && m <= 240)) return V.toast("Class length must be 1–240 minutes");
    const { error } = await V.sb.from("acad_coaches").update({ part_time: q("#tsPart").checked, class_minutes: m }).eq("id", T.coach);
    if (error) return V.toast("Not saved – " + error.message);
    Object.assign(V.S.coaches[T.coach], { partTime: q("#tsPart").checked, classMinutes: m }); V.toast("Saved"); V.render(); };
  if (q("#tsXls")) q("#tsXls").onclick = () => {
    if (!window.XLSX) return V.toast("The Excel tool didn't load – reload the page");
    const id = T.coach, mins = (V.S.coaches[id] || {}).classMinutes || 40, cl = classesFor(id, T.from, T.to, T.reps);
    const rows = [["Coach", V.coachName(id)], ["From", T.from, "To", T.to], [], ["Date", "Day", "Time", "Swimmers", "Attended", "Status", "Minutes"]]
      .concat(cl.map(x => [x.date, WD[V.fromIso(x.date).getDay()], V.fmtTime(x.time), x.swimmers, x.status === "Upcoming" ? "" : x.att, x.status, x.status === "Delivered" ? mins : 0]));
    const del = cl.filter(x => x.status === "Delivered").length; rows.push([], ["Delivered classes", del], ["Total hours", Math.round(del * mins / 6) / 10]);
    const ws = XLSX.utils.aoa_to_sheet(rows); ws["!cols"] = [{ wch: 18 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 14 }, { wch: 9 }];
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Timesheet");
    V.deliver(`Timesheet – ${V.coachName(id)} – ${T.from} to ${T.to}.xlsx`, new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx" })]));
  };
}
window.VXP = { open, renderTimesheet };
})();
