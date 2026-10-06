(() => {
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const AVC = ["#1B22E4","#067EEA","#8F23D7","#0E9F7A","#1B2955"];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STAGES = ["Introduced","Developing","Consistent","Mastered"];
const TITLES = ["Coach","Supervisor","Manager","Admin"]; const MG = ["Supervisor","Manager","Admin"];
const ls = { get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v);}catch{return d} }, set(k,v){ try{localStorage.setItem(k,JSON.stringify(v))}catch{} } };


/* ---------- dates ---------- */
const sundayOf = d => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() - x.getDay()); return x; };
const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const fromIso = s => { const [y,m,d] = s.split("-").map(Number); return new Date(y, m-1, d); };
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
function weekLabel(k){ const a = fromIso(k), b = new Date(a); b.setDate(b.getDate()+6);
  return a.getMonth()===b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}` : `${a.getDate()} ${MON[a.getMonth()]} – ${b.getDate()} ${MON[b.getMonth()]} ${b.getFullYear()}`; }
const ageOf = k => { if (k.dob) { const b = fromIso(k.dob), n = new Date(); let m = (n.getFullYear() - b.getFullYear()) * 12 + n.getMonth() - b.getMonth(); if (n.getDate() < b.getDate()) m--;
  if (m < 0) return ""; if (m < 24) return `${m} month${m === 1 ? "" : "s"}`; return String(Math.floor(m / 12)); } return k.age || ""; };
const fmtTime = t => { const m = String(t||"").trim().match(/^0?(\d{1,2})[.:](\d{2})\s*(am|pm)?$/i); return m ? `${m[1]}:${m[2]}${m[3] ? " " + m[3].toLowerCase() : ""}` : String(t||""); };
const timeVal = t => { const m = String(t||"").trim().match(/^(\d{1,2})[.:](\d{2})\s*(am|pm)?$/i); if (!m) return 9999; let h = +m[1] % 12; if (m[3] && m[3].toLowerCase() === "pm") h += 12; return h*60 + +m[2]; };
const groupOf = k => (k.sessions && k.sessions.length) ? k.sessions.map(x => `${x.day} ${fmtTime(x.time)}`).join(", ") : (k.group || "");
const sessCount = k => (k.sessions || []).length;
function termWeekOf(wk){ const t = S.term; if (!t || !t.start) return ""; const a = sundayOf(fromIso(t.start)), w = fromIso(wk);
  const n = Math.round((w - a) / 864e5 / 7) + 1; if (n < 1) return ""; if (t.end && w > fromIso(t.end)) return ""; return String(n); }
const todayLabel = () => { const d = new Date(); return `${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`; };

/* ---------- state ---------- */
const S = {
  week: iso(sundayOf(new Date())), level: ls.get("vx_level", 1), view: "swimmers", coachSel: ls.get("vx_cf", "all"),
  me: { id:null, mgmt:false, admin:false, coachId:null, name:"", email:"", role:"" }, programs: {},
  coaches: {}, staff: {}, kids: {}, reports: {}, notes: {}, names: {}, ready: false, blocked: false, term: null, day: ls.get("vx_day", "all"), q: "", allLv: ls.get("vx_all", false)
};
const mgmt = () => S.me.mgmt;
const myCoach = () => S.coaches[S.me.coachId] || {};
const coachName = cid => (S.coaches[cid] && S.coaches[cid].displayName) || S.names[cid] || "Coach";
const titleOf = id => { const st = S.staff[id] || (S.coaches[id] && S.staff[S.coaches[id].userId]); return st ? st.title : "Coach"; };
const visibleCoachIds = () => Object.keys(S.coaches).filter(id => !S.coaches[id].linkedTo);
const norm = s => String(s||"").toLowerCase().replace(/^\s*coach\s+/,"").replace(/\s+/g," ").trim();
/* ---------- Supabase data layer ---------- */
const sb = window.supabase.createClient(CFG.url, CFG.key, { auth: { persistSession: true, autoRefreshToken: true } });
const toKid = r => ({ id: r.id, cid: r.coach_id, name: r.name, dob: r.dob || "", age: r.age || "", level: r.level, sessions: r.sessions || [],
  group: r.group_note || "", ptType: r.pt_type || "", active: r.active, last: r.last || null, term: r.term || "", startDate: r.start_date || "", paidClasses: r.paid_classes ?? null, paid: r.paid ?? null });
const KIDMAP = { name:"name", dob:"dob", age:"age", level:"level", sessions:"sessions", group:"group_note", ptType:"pt_type", active:"active", last:"last", term:"term", startDate:"start_date", paidClasses:"paid_classes" };
const kidOut = d => { const o = {}; for (const k in KIDMAP) if (k in d) o[KIDMAP[k]] = ((k === "dob" || k === "startDate") && !d[k]) ? null : d[k]; return o; };
const toRep = r => ({ ...(r.data || {}), week: r.week, kidId: r.swimmer_id, level: r.level, done: r.done,
  reviewedAt: r.reviewed_at ? Date.parse(r.reviewed_at) : null, reviewedBy: r.reviewed_by || null });
const Store = {
  mode: "db",
  async getDoc(path){
    const [a, b] = path.split("/");
    if (a === "contacts") { const { data } = await sb.from("acad_contacts").select("*").eq("swimmer_id", b).maybeSingle(); return data; }
    return null;
  }
};
function fail(e){ console.error(e); toast(e && e.message && /row-level|permission/i.test(e.message) ? "Not saved – you don't have access to change this" : "Not saved – check your connection and try again"); throw e; }
async function write(path, data, partial){
  const p = path.split("/");
  if (p[0] === "coaches" && p.length === 2) {
    const row = { id: p[1] }; if (data.displayName) row.display_name = data.displayName;
    const { error } = partial ? await sb.from("acad_coaches").update(row).eq("id", p[1]) : await sb.from("acad_coaches").upsert({ display_name: "Coach", ...row });
    if (error) fail(error); S.coaches[p[1]] = { ...(S.coaches[p[1]] || {}), ...(data.displayName ? { displayName: data.displayName } : {}) }; return render();
  }
  if (p[0] === "coaches" && p[2] === "kids") {
    const cid = p[1], id = p[3], out = kidOut(data);
    const { data: row, error } = partial ? await sb.from("acad_swimmers").update({ ...out, updated_at: new Date().toISOString() }).eq("id", id).select().single()
                                         : await sb.from("acad_swimmers").upsert({ id, coach_id: cid, ...out, updated_at: new Date().toISOString() }).select().single();
    if (error) fail(error);
    for (const k of Object.keys(S.kids)) if (k.endsWith("/" + id)) delete S.kids[k];
    const kd = toKid(row); S.kids[`${kd.cid}/${kd.id}`] = kd; return render();
  }
  if (p[0] === "coaches" && p[2] === "reports") {
    const cid = p[1], [week, kid] = p[3].split("__"); const { reviewedAt, reviewedBy, done, level, week: _w, kidId: _k, ...rest } = data;
    const row = { id: `${week}__${kid}`, swimmer_id: kid, coach_id: cid, week, level, data: rest, done: !!done,
      reviewed_at: reviewedAt ? new Date(reviewedAt).toISOString() : null, reviewed_by: reviewedBy || null, updated_at: new Date().toISOString(), updated_by: S.me.id };
    const { error } = await sb.from("acad_reports").upsert(row); if (error) fail(error);
    S.reports[`${cid}/${week}__${kid}`] = toRep(row); return render();
  }
  if (p[0] === "coaches" && p[2] === "notes") {
    const cid = p[1], id = p[3], { week, level, ...rest } = data;
    const { error } = await sb.from("acad_notes").upsert({ id: `${cid}__${id}`, coach_id: cid, week: week || S.week, level, data: rest }); if (error) fail(error);
    S.notes[`${cid}/${id}`] = { ...data }; return render();
  }
  if (p[0] === "contacts") { const { error } = await sb.from("acad_contacts").upsert({ swimmer_id: p[1], phones: data.phones || [], email: data.email || null }); if (error) fail(error); return; }
  if (p[0] === "settings") { const { error } = await sb.from("acad_settings").upsert({ key: p[1], value: data }); if (error) fail(error);
    if (p[1] === "term") S.term = data; if (p[1] === "programs") { S.programs = data; applyPrograms(data); } return render(); }
  if (p[0] === "staff") { const role = String(data.title || "coach").toLowerCase(); const { error } = await sb.from("acad_staff").update({ role }).eq("user_id", p[1]); if (error) fail(error);
    if (S.staff[p[1]]) S.staff[p[1]].title = data.title; return render(); }
  throw new Error("Unknown path " + path);
}
const put = (path, data) => write(path, data, false).catch(() => {});
const patch = (path, data) => write(path, data, true).catch(() => {});
async function moveKid(id, from, to){
  const { data: row, error } = await sb.from("acad_swimmers").update({ coach_id: to, active: true, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) return fail(error);
  delete S.kids[`${from}/${id}`]; const kd = toKid(row); S.kids[`${kd.cid}/${kd.id}`] = kd; render();
}
async function adminCall(action, payload){
  const { data: sess } = await sb.auth.getSession();
  const res = await fetch(`${CFG.url}/functions/v1/acad-admin`, { method: "POST", headers: { "Content-Type": "application/json", apikey: CFG.key,
    Authorization: `Bearer ${sess.session ? sess.session.access_token : CFG.key}` }, body: JSON.stringify({ action, ...payload }) });
  const out = await res.json().catch(() => ({ error: "Unexpected response" }));
  if (!res.ok || out.error) throw new Error(out.error || "Request failed");
  return out;
}
function setStatus(err){
  const el = $("#status"); if (!el) return; el.classList.toggle("ok", !err);
  el.querySelector("span").textContent = err ? "Couldn't reach the server – changes may not be saved" : mgmt() ? "Seeing every coach's swimmers" : "Only you and management see these";
}
function toast(msg){ const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }

/* ---------- paths & keys ---------- */
const P = {
  coach: cid => `coaches/${cid}`, kid: (cid,k) => `coaches/${cid}/kids/${k}`,
  report: (cid,k) => `coaches/${cid}/reports/${S.week}__${k}`, note: (cid,l) => `coaches/${cid}/notes/${S.week}__L${l}`
};
const rKey = (cid,k) => `${cid}/${S.week}__${k}`;
const nKey = (cid,l) => `${cid}/${S.week}__L${l}`;
const notesFor = (cid,l) => S.notes[nKey(cid,l)] || {};
const reportOf = kid => S.reports[`${kid.cid}/${S.week}__${kid.id}`] || Object.entries(S.reports).find(([k]) => k.endsWith(`/${S.week}__${kid.id}`))?.[1];

/* ---------- loading ---------- */
async function loadBase(){
  const [c, k, st, se] = await Promise.all([
    sb.from("acad_coaches").select("*"), sb.from("acad_swimmers").select("*").limit(5000),
    sb.from("acad_staff").select("*"), sb.from("acad_settings").select("*") ]);
  const err = c.error || k.error || st.error || se.error; if (err) { setStatus(err); throw err; }
  S.coaches = {}; c.data.forEach(r => { S.coaches[r.id] = { displayName: r.display_name, userId: r.user_id, placeholder: !r.user_id, partTime: !!r.part_time, classMinutes: r.class_minutes || 40 }; });
  S.kids = {}; k.data.forEach(r => { const kd = toKid(r); S.kids[`${kd.cid}/${kd.id}`] = kd; });
  S.staff = {}; st.data.forEach(r => { S.staff[r.user_id] = { title: r.role[0].toUpperCase() + r.role.slice(1), name: r.display_name, email: r.email, active: r.active, managed: r.managed }; });
  se.data.forEach(r => { if (r.key === "term") S.term = r.value; if (r.key === "programs") { S.programs = r.value; applyPrograms(r.value); } });
  S.ready = true;
}
async function loadWeek(){
  const [r, n] = await Promise.all([ sb.from("acad_reports").select("*").eq("week", S.week), sb.from("acad_notes").select("*").eq("week", S.week) ]);
  if (r.error || n.error) return setStatus(r.error || n.error);
  S.reports = {}; r.data.forEach(x => { S.reports[`${x.coach_id}/${x.week}__${x.swimmer_id}`] = toRep(x); });
  S.notes = {}; n.data.forEach(x => { S.notes[`${x.coach_id}/${x.id.slice(x.coach_id.length + 2)}`] = { ...x.data, week: x.week, level: x.level }; });
  setStatus(); render();
}
function changeWeek(delta){ const d = fromIso(S.week); d.setDate(d.getDate() + 7*delta); S.week = iso(d); S.reports = {}; S.notes = {}; render(); loadWeek(); }

/* ---------- derived ---------- */
const activeCoach = () => mgmt() ? (S.coachSel !== "all" ? S.coachSel : null) : S.me.coachId;
const inScope = k => k.active !== false && (!mgmt() || S.coachSel === "all" || k.cid === S.coachSel);
const onDay = k => S.day === "all" || (k.sessions || []).some(x => x.day === S.day);
function kidsInLevel(lvl, ignoreDay){
  return Object.values(S.kids).filter(k => inScope(k) && ((reportOf(k)?.level ?? k.level) === lvl) && (ignoreDay || onDay(k)))
    .sort((a,b) => a.name.localeCompare(b.name));
}
const allLevelKids = ignoreDay => LEVELS.flatMap((_, i) => kidsInLevel(i + 1, ignoreDay)).sort((a,b) => a.name.localeCompare(b.name));
function statusOf(k){ const r = reportOf(k); return !r ? "todo" : r.reviewedAt ? "rev" : r.done ? "done" : "wip"; }
const isDone = k => ["done","rev"].includes(statusOf(k));
function blankReport(kid){
  const last = kid.last && kid.last.level === kid.level ? kid.last : null;
  return { week:S.week, kidId:kid.id, level:kid.level, att:[0,0,0,0,0,0,0],
    skills: last ? [...last.skills] : [0,0,0,0,0], assess: last ? [...last.assess] : [0,0,0,0,0], ready:0,
    traits: last ? [...last.traits] : [0,0,0,0], focus:"", goal:"", home:"", comment:"", done:false,
    attTotal: notesFor(kid.cid, kid.level).total || (sessCount(kid) ? String(sessCount(kid)) : "") };
}
const getReport = kid => reportOf(kid) ? JSON.parse(JSON.stringify(reportOf(kid))) : blankReport(kid);

/* ---------- render ---------- */
function renderTop(){
  const tw = termWeekOf(S.week);
  $("#wLabel").innerHTML = `${weekLabel(S.week)}<em>${tw ? `${esc(S.term.name || "Term")} · Week ${tw}` : S.week === iso(sundayOf(new Date())) ? "This week" : "Week starting Sunday"}</em>`;
  const nm = S.me.name || "";
  $("#meName").textContent = nm || "Set your name";
  $("#meInit").textContent = nm ? nm.replace(/^coach\s+/i,"").trim().charAt(0).toUpperCase() : "?";
  const t = S.me.role === "coach" ? "Coach" : "x"; $("#meRole").textContent = S.me.role ? S.me.role[0].toUpperCase() + S.me.role.slice(1) : ""; $("#meRole").className = "role" + (t !== "Coach" ? " mg" : "");
  $("#mgBar").classList.toggle("hide", !mgmt());
  $("#teamLbl").textContent = S.me.admin ? "Admin settings" : "Team";
  if (mgmt()) {
    document.querySelectorAll("#mgBar [data-view]").forEach(b => b.setAttribute("aria-pressed", b.dataset.view === S.view));
    const ids = visibleCoachIds().sort((a,b) => coachName(a).localeCompare(coachName(b)));
    if (S.coachSel !== "all" && (!S.coaches[S.coachSel] || S.coaches[S.coachSel].linkedTo)) S.coachSel = "all";
    $("#coachSel").innerHTML = `<option value="all">All coaches (${ids.length})</option>` + ids.map(id => `<option value="${esc(id)}" ${S.coachSel===id?"selected":""}>${esc(coachName(id))}${id===S.me.id?" (you)":""}</option>`).join("");
  }
  $("#vSwimmers").classList.toggle("hide", S.view !== "swimmers");
  $("#vOverview").classList.toggle("hide", S.view !== "overview");
  $("#vTimesheet")?.classList.toggle("hide", S.view !== "timesheet");
  $("#vDeck")?.classList.toggle("hide", S.view !== "deck");
  $("#vCal")?.classList.toggle("hide", S.view !== "calendar");
}
function renderLevels(){
  const grp = LEVELS[S.level-1].group;
  const gcount = g => LEVELS.reduce((a,L,i) => a + (L.group === g ? kidsInLevel(i+1, true).length : 0), 0);
  $("#groups").innerHTML = GROUPS.map(g => `<button data-grp="${g.id}" aria-pressed="${!S.allLv && g.id===grp && S.view==="swimmers"}">${g.name}<span>${gcount(g.id)}</span></button>`).join("");
  const allK = allLevelKids(true), allD = allK.filter(isDone).length;
  const allTile = `<button class="lv" data-l="all" aria-pressed="${!!S.allLv && S.view==="swimmers"}"><span style="position:absolute;left:8px;top:50%;transform:translateY(-50%);width:58px;height:58px;border-radius:14px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;gap:2px;background:#fff">${[1,2,3,5].map(n => `<img alt="" src="data:image/jpeg;base64,${ASSETS["thumb"+n]}" style="position:static;transform:none;width:100%;height:100%;border-radius:0;object-fit:cover">`).join("")}</span>
      <span class="n">Everyone</span><span class="nm">All levels</span><span class="ct">${allK.length ? `${allD} of ${allK.length} done` : "No swimmers yet"}</span></button>`;
  $("#levels").innerHTML = allTile + LEVELS.map((L,i) => {
    if (L.group !== grp) return "";
    const n = i+1, ks = kidsInLevel(n, true), done = ks.filter(isDone).length;
    return `<button class="lv" data-l="${n}" aria-pressed="${!S.allLv && S.level===n && S.view==="swimmers"}"><img alt="" src="data:image/jpeg;base64,${ASSETS["thumb"+n]}">
      <span class="n">${esc(L.short)}</span><span class="nm">${esc(L.name)}</span><span class="ct">${ks.length ? `${done} of ${ks.length} done` : "No swimmers yet"}</span></button>`;
  }).join("");
  $("#levels").style.gridTemplateColumns = `repeat(${1 + LEVELS.filter(L => L.group === grp).length}, minmax(150px, 1fr))`;
}
function renderFilters(){
  const counts = {}; DAYS.forEach(d => counts[d] = Object.values(S.kids).filter(k => inScope(k) && (k.sessions||[]).some(x => x.day === d)).length);
  $("#filters").innerHTML = `<div class="seg days-seg" role="group" aria-label="Training day"><button data-day-f="all" aria-pressed="${S.day==="all"}">All days</button>${DAYS.map(d => `<button data-day-f="${d}" aria-pressed="${S.day===d}" ${counts[d] ? "" : "disabled"}>${d}</button>`).join("")}</div>
    <input class="inp srch" id="q" type="search" placeholder="Search a swimmer" value="${esc(S.q)}" aria-label="Search a swimmer">`;
}
function rowHtml(k, i, sub){
  const st = statusOf(k), lab = { todo:"Not started", wip:"In progress", done:"Done", rev:"Reviewed" };
  return `<button class="row" data-k="${esc(k.cid)}/${esc(k.id)}"><span class="av" style="background:${AVC[i%5]}">${esc(k.name.charAt(0).toUpperCase())}</span>
      <span class="who"><b>${esc(k.name)}</b><span>${sub || "&nbsp;"}</span></span><span class="pill ${st}">${lab[st]}</span></button>`;
}
function renderList(){
  if (!$("#q") || document.activeElement !== $("#q")) renderFilters();
  const L = LEVELS[S.level-1], showCoach = mgmt() && S.coachSel === "all";
  const searching = S.q.trim().length > 0;
  const ks = searching ? Object.values(S.kids).filter(k => inScope(k) && norm(k.name).includes(norm(S.q))).sort((a,b) => a.name.localeCompare(b.name)) : S.allLv ? allLevelKids() : kidsInLevel(S.level);
  const all = S.allLv ? allLevelKids(true) : kidsInLevel(S.level, true), done = all.filter(isDone).length;
  $("#lvTitle").textContent = searching ? `Search: ${S.q}` : S.allLv ? "All levels" : `${L.short} · ${L.name}`;
  $("#lvSub").textContent = searching ? `${ks.length} swimmer${ks.length===1?"":"s"} found in all levels` : all.length ? `${done} of ${all.length} reports done this week` : L.goal;
  $("#progBar").style.width = !searching && all.length ? (done/all.length*100)+"%" : "0";
  if (!S.ready) { $("#list").innerHTML = `<div class="empty">Loading swimmers…</div>`; return; }
  if (!ks.length) { $("#list").innerHTML = `<div class="empty"><b>${searching ? "No swimmer by that name" : S.day !== "all" ? `No ${S.allLv ? "" : L.short + " "}swimmers on ${S.day}` : "No swimmers in this level yet"}</b>${searching || S.day !== "all" ? "" : mgmt() && S.coachSel==="all" ? "Import the term sheet in Admin settings, or add swimmers." : "Add your group once – they'll be here every week."}</div>`; return; }
  const base = k => [k.ptType && `${esc(k.ptType)} PT`, showCoach && esc(coachName(k.cid)), (searching || S.allLv) && esc(LEVELS[k.level-1].short), ageOf(k) && `Age ${esc(ageOf(k))}`].filter(Boolean);
  if (S.day === "all" || searching) {
    $("#list").innerHTML = ks.map((k,i) => rowHtml(k, i, [...base(k), esc(groupOf(k))].filter(Boolean).join(" · "))).join("");
    return;
  }
  const slots = {};
  ks.forEach(k => (k.sessions||[]).filter(x => x.day === S.day).forEach(x => { (slots[x.time] = slots[x.time] || []).push({ k, x }); }));
  $("#list").innerHTML = Object.keys(slots).sort((a,b) => timeVal(a) - timeVal(b)).map(t => {
    const items = slots[t], lanes = [...new Set(items.map(i => i.x.lane).filter(Boolean))];
    return `<div class="slot"><b>${esc(S.day)} ${esc(fmtTime(t))}</b><span>${items.length} swimmer${items.length===1?"":"s"}${lanes.length ? ` · Lane ${lanes.map(esc).join(", ")}` : ""}</span></div>` +
      items.map(({k, x}, i) => rowHtml(k, i, [...base(k), x.coach && x.coach !== coachName(k.cid).replace(/^Coach\s+/,"") && `with ${esc(x.coach)}`, x.lane && `Lane ${esc(x.lane)}`].filter(Boolean).join(" · "))).join("");
  }).join("");
}
function renderOverview(){
  const ids = visibleCoachIds().filter(id => !(MG.includes(titleOf(id)) && !Object.values(S.kids).some(k => k.cid === id && k.active !== false))).sort((a,b) => coachName(a).localeCompare(coachName(b)));
  const all = Object.values(S.kids).filter(k => k.active !== false);
  const doneN = all.filter(isDone).length, revN = all.filter(k => statusOf(k) === "rev").length, todoN = all.filter(k => statusOf(k) === "todo").length;
  const cell = (d,t) => `<span class="c ${!t ? "z" : d===t ? "f" : "p"}">${t ? `${d}/${t}` : "–"}</span>`;
  $("#vOverview").innerHTML = `
    <div class="bar"><div><h1>Coaches overview</h1><div class="sub">${weekLabel(S.week)} · reports done out of swimmers, per level</div></div></div>
    <div class="kpis">
      <div class="kpi"><b>${ids.length}</b><span>Coaches</span></div>
      <div class="kpi"><b>${all.length}</b><span>Swimmers</span></div>
      <div class="kpi"><b>${all.length ? Math.round(doneN/all.length*100) : 0}%</b><span>Reports done (${doneN})</span></div>
      <div class="kpi"><b>${revN}</b><span>Reviewed · ${todoN} not started</span></div>
    </div>
    <div class="ov"><table><thead><tr><th>Coach</th>${LEVELS.map(L=>`<th>${L.code}</th>`).join("")}<th>Total</th><th>Reviewed</th></tr></thead><tbody>
    ${ids.length ? ids.map(id => { const ks = all.filter(k => k.cid === id);
      const per = LEVELS.map((_,i) => { const l = ks.filter(k => (reportOf(k)?.level ?? k.level) === i+1); return cell(l.filter(isDone).length, l.length); });
      return `<tr class="click" data-c="${esc(id)}"><td><b>${esc(coachName(id))}</b><br><span class="note">${esc(titleOf(id))}</span></td>${per.map(p=>`<td>${p}</td>`).join("")}
        <td>${cell(ks.filter(isDone).length, ks.length)}</td><td>${ks.filter(k => statusOf(k)==="rev").length}</td></tr>`; }).join("")
      : `<tr><td colspan="${LEVELS.length+3}" class="empty">No coaches yet. Add them in Admin settings → People & logins.</td></tr>`}
    </tbody></table></div>`;
}
let rq = 0;
function render(){ if (S.blocked || rq) return; rq = requestAnimationFrame(() => { rq = 0; if (S.blocked) return; renderTop(); renderLevels(); if (S.view === "overview") renderOverview(); else if (S.view === "timesheet") { if (window.VXP) VXP.renderTimesheet(); } else if (S.view === "deck") { if (window.VXD) VXD.render(); } else if (S.view === "calendar") { if (window.VXC) VXC.render(); } else renderList(); }); }

/* ---------- sheets ---------- */
let closeHook = null;
function openSheet(html, narrow){
  $("#layer").innerHTML = `<div class="scrim"></div><aside class="sheet ${narrow?"narrow":""}" role="dialog" aria-modal="true">${html}</aside>`;
  $("#layer .scrim").onclick = closeSheet; $("#layer .x")?.addEventListener("click", closeSheet);
  setTimeout(() => $("#layer .sheet [autofocus]")?.focus(), 30);
}
function closeSheet(){ if (closeHook) { const h = closeHook; closeHook = null; h(); } $("#layer").innerHTML = ""; }
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#layer").innerHTML) closeSheet(); });
const head = (title, sub, lvl) => `<div class="sh-head">${lvl ? `<img alt="" src="data:image/jpeg;base64,${ASSETS["thumb"+lvl]}">` : ""}<div class="t"><b>${esc(title)}</b><span>${esc(sub)}</span></div><button class="x" aria-label="Close">×</button></div>`;
const needCoach = () => { const c = activeCoach(); if (!c) toast("Choose a coach first from the coach list"); return c; };

function addKids(){
  if (!mgmt() && !S.me.coachId) return toast("Your login isn't linked to a coach yet – ask an academy admin");
  const ids = mgmt() ? visibleCoachIds() : [S.me.coachId];
  const def = activeCoach() || S.me.coachId || ids[0];
  openSheet(`${head("Add swimmers", "Add a group once – they stay every week")}<div class="sh-body"><div class="box">
    <label class="f">Swimmer names – one per line, add age after a comma if you like
      <textarea class="inp" id="names" rows="8" autofocus placeholder="Layla Hassan, 7&#10;Omar Khalid, 6&#10;Sara Ahmed"></textarea></label>
    <div class="grid4" style="margin-top:10px">
      <label class="f">Level<select class="inp" id="lvl">${LEVELS.map((L,i)=>`<option value="${i+1}" ${S.level===i+1?"selected":""}>${esc(L.short)} · ${esc(L.name)}</option>`).join("")}</select></label>
      ${mgmt() ? `<label class="f">Coach<select class="inp" id="kc">${ids.map(id=>`<option value="${esc(id)}" ${id===def?"selected":""}>${esc(coachName(id))}</option>`).join("")}</select></label>` : ""}
    </div>
    <label class="f" style="margin-top:10px">Group / training days<input class="inp" id="kg" placeholder="e.g. Sun & Tue 4pm"></label>
  </div></div><div class="sh-foot"><span class="sp"></span><button class="btn primary" id="addGo">Add swimmers</button></div>`);
  $("#addGo").onclick = async () => {
    const lines = $("#names").value.split(/\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return $("#names").focus();
    const lvl = +$("#lvl").value, cid = mgmt() ? $("#kc").value : S.me.coachId, group = $("#kg").value.trim();
    if (!cid) return toast("Choose a coach");
    for (const ln of lines) { const [name, age] = ln.split(",").map(s => s.trim());
      const id = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2,7);
      await put(P.kid(cid, id), { name, age: age || "", level: lvl, group, active: true, createdAt: Date.now() }); }
    S.level = lvl; ls.set("vx_level", lvl); closeSheet(); render(); toast(`${lines.length} swimmer${lines.length>1?"s":""} added`);
  };
}

function groupNotes(){
  if (S.allLv) return toast("Choose a level first");
  const cid = needCoach(); if (!cid) return;
  const lvl = S.level, L = LEVELS[lvl-1], n = notesFor(cid, lvl);
  openSheet(`${head(`Group notes · ${L.short}`, `${coachName(cid)} · ${weekLabel(S.week)}`, lvl)}<div class="sh-body">
    <div class="box"><p class="note" style="margin:0 0 10px">These go on every report in this level for ${esc(coachName(cid))}'s swimmers. A personal note on a swimmer's report replaces them.</p>
      <div class="grid4"><label class="f">Term week no.<input class="inp" id="g_tw" inputmode="numeric" value="${esc(n.termWeek ?? "")}" placeholder="e.g. 6"></label>
      <label class="f">Sessions this week<input class="inp" id="g_tot" inputmode="numeric" value="${esc(n.total ?? "")}" placeholder="e.g. 2"></label></div>
      <label class="f" style="margin-top:10px">This week's focus<textarea class="inp" id="g_focus" placeholder="${esc(L.skills[0])}…">${esc(n.focus||"")}</textarea></label>
      <label class="f" style="margin-top:10px">Next week's goal<textarea class="inp" id="g_goal">${esc(n.goal||"")}</textarea></label>
      <label class="f" style="margin-top:10px">Try at home<textarea class="inp" id="g_home">${esc(n.home||"")}</textarea></label>
    </div></div><div class="sh-foot"><span class="sp"></span><button class="btn primary" id="gSave">Save group notes</button></div>`);
  $("#gSave").onclick = async () => {
    const d = { week:S.week, level:lvl, termWeek:$("#g_tw").value.trim(), total:$("#g_tot").value.trim(), focus:$("#g_focus").value.trim(), goal:$("#g_goal").value.trim(), home:$("#g_home").value.trim() };
    await put(P.note(cid, lvl), d); closeSheet(); toast("Group notes saved");
  };
}

function attendance(){
  if (S.allLv) return toast("Choose a level first");
  const cid = needCoach(); if (!cid) return;
  const lvl = S.level, L = LEVELS[lvl-1], ks = kidsInLevel(lvl).filter(k => k.cid === cid);
  if (!ks.length) return toast("Add swimmers to this level first");
  const work = Object.fromEntries(ks.map(k => [k.id, getReport(k)]));
  const tot = notesFor(cid, lvl).total ?? "";
  openSheet(`${head(`Attendance · ${L.short}`, `${coachName(cid)} · ${weekLabel(S.week)}`, lvl)}<div class="sh-body"><div class="box">
    <div class="tot" style="margin:0 0 10px">Sessions this week <input class="inp" id="a_tot" inputmode="numeric" value="${esc(tot)}"></div>
    <div style="overflow-x:auto"><table class="att-table"><thead><tr><th></th>${DAYS.map((d,i)=>`<th><button class="btn ghost" style="padding:2px 4px;font-size:11px" data-col="${i}" title="Mark everyone">${d}</button></th>`).join("")}</tr></thead><tbody>
    ${ks.map(k => `<tr><td>${esc(k.name)}</td>${DAYS.map((d,i)=>`<td><button class="day" data-k="${esc(k.id)}" data-d="${i}" aria-label="${esc(k.name)} ${d}" aria-pressed="${!!work[k.id].att[i]}"></button></td>`).join("")}</tr>`).join("")}
    </tbody></table></div><p class="note">Tap a day name to mark everyone present that day.</p></div></div>
    <div class="sh-foot"><span class="sp"></span><button class="btn primary" id="aSave">Save attendance</button></div>`);
  const sheet = $("#layer .sheet");
  sheet.addEventListener("click", e => {
    const b = e.target.closest("button.day"), c = e.target.closest("button[data-col]");
    if (b) { const r = work[b.dataset.k], i = +b.dataset.d; r.att[i] = r.att[i] ? 0 : 1; b.setAttribute("aria-pressed", !!r.att[i]); }
    if (c) { const i = +c.dataset.col, all = ks.every(k => work[k.id].att[i]); ks.forEach(k => { work[k.id].att[i] = all ? 0 : 1; });
      sheet.querySelectorAll(`button.day[data-d="${i}"]`).forEach(x => x.setAttribute("aria-pressed", !all)); }
  });
  $("#aSave").onclick = async () => {
    const t = $("#a_tot").value.trim();
    if (t !== String(tot)) await put(P.note(cid, lvl), { ...notesFor(cid, lvl), week:S.week, level:lvl, total:t });
    for (const k of ks) { const r = work[k.id]; if (t) r.attTotal = t; await put(P.report(cid, k.id), r); }
    closeSheet(); toast("Attendance saved");
  };
}

/* ---------- admin settings ---------- */
/* ---------- admin settings ---------- */
function parseLevel(v){
  const t = String(v ?? "").toLowerCase().trim(); if (!t) return 0;
  const c = t.replace(/[\s._-]+/g, "");
  let b = c.match(/^(bb|babybubbles)([123])$/); if (b) return 5 + +b[2];
  if (/^(grp|group)?pt$|private/.test(c)) return 9;
  const i = LEVELS.slice(0, 5).findIndex(L => L.name.toLowerCase().split(" ").some(w => w.length > 3 && t.includes(w)));
  if (i >= 0) return i + 1;
  const m = t.match(/^(level|l)?\s*([1-5])$/); return m ? +m[2] : 0;
}
const titleCase = s => String(s||"").trim().replace(/\s+/g," ").toLowerCase().replace(/(^|[\s\-'\/])(\p{L})/gu, (a,b,c) => b + c.toUpperCase());
function xDate(v){
  if (v instanceof Date && !isNaN(v)) { const d = new Date(v.getTime() + 12*36e5); return `${d.getUTCFullYear()}-${String(d.getUTCMonth()+1).padStart(2,"0")}-${String(d.getUTCDate()).padStart(2,"0")}`; }
  const m = String(v||"").match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); return m ? `${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}` : "";
}
const KEEP_STATUS = ["confirmed","tbc","complimentary","second session","staff"];
function primaryCoach(ses){
  const c = {}; ses.forEach(x => { const t = titleCase(String(x.coach||"").split(/[\/,&]/)[0]); if (t) c[t] = (c[t]||0) + 1; });
  let best = "", n = 0; for (const k in c) if (c[k] > n) { best = k; n = c[k]; } return best;
}
/* Reads either the simple template or the academy term sheet (Status, Full Name, DOB, Level, Sun Time / Sun Coach / Sun Lane …). */
function readRows(aoa){
  const hi = aoa.findIndex(r => r.some(c => /full\s*name|swimmer|^name$/i.test(String(c).trim())));
  if (hi < 0) return { ok:[], bad:[{ row:0, why:"No swimmer name column found" }], master:false };
  const H = aoa[hi].map(c => String(c ?? "").trim().toLowerCase().replace(/\s+/g," "));
  const col = re => H.findIndex(h => re.test(h));
  const days = {}; H.forEach((h,i) => { const m = h.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.? (time|coach|lane)$/); if (m) { const d = DAYS[["sun","mon","tue","wed","thu","fri","sat"].indexOf(m[1])]; (days[d] = days[d] || {})[m[2]] = i; } });
  const master = Object.keys(days).length > 0;
  const cN = col(/full ?name|swimmer|^name$/), cS = col(/^status$/), cD = col(/^dob$|birth/), cA = col(/^age/), cL = col(/^level/),
        cC = col(/^coach/), cG = col(/training|^days?$|group|schedule/), cP1 = col(/contact.*1|^phone|mobile/), cP2 = col(/contact.*2/), cE = col(/e-?mail/);
  const ok = [], bad = [], seen = {};
  aoa.slice(hi + 1).forEach((r, i) => {
    const rowNo = hi + i + 2, raw = String(r[cN] ?? "").trim();
    if (!raw || /^(full )?name$/i.test(raw)) return;
    const name = master ? titleCase(raw) : raw.replace(/\s+/g," ");
    const status = cS >= 0 ? String(r[cS] ?? "").trim() : "";
    if (master && !KEEP_STATUS.includes(status.toLowerCase())) { bad.push({ row: rowNo, name, why: status ? `Status "${status}"` : "No status" }); return; }
    const level = parseLevel(r[cL]);
    if (!level) { bad.push({ row: rowNo, name, why: r[cL] ? `"${String(r[cL]).trim()}" isn't a recognised level or programme` : "No level" }); return; }
    const sessions = DAYS.filter(d => days[d]).map(d => { const t = r[days[d].time], c = r[days[d].coach], l = r[days[d].lane];
      return (t || c) ? { day: d, time: String(t ?? "").trim(), coach: titleCase(c), lane: String(l ?? "").trim() } : null; }).filter(Boolean);
    const coach = master ? (primaryCoach(sessions) || "Unassigned") : String(r[cC] ?? "").trim();
    if (!coach) { bad.push({ row: rowNo, name, why: "Missing coach" }); return; }
    const dob = cD >= 0 ? xDate(r[cD]) : "";
    const phones = [cP1, cP2].filter(c => c >= 0).map(c => String(r[c] ?? "").trim()).filter(Boolean);
    const item = { pt: /gr(ou)?p/i.test(String(r[cL] ?? "")) ? "Group" : "", name, level, coach, dob, sessions, phones, email: cE >= 0 ? String(r[cE] ?? "").trim() : "", age: cA >= 0 && !master ? String(r[cA] ?? "").trim() : "", group: cG >= 0 ? String(r[cG] ?? "").trim() : "" };
    const key = norm(name) + "|" + dob;
    if (seen[key]) { const o = seen[key]; item.sessions.forEach(x => { if (!o.sessions.some(y => y.day === x.day && y.time === x.time)) o.sessions.push(x); }); o.sessions.sort((a,b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day)); return; }
    seen[key] = item; ok.push(item);
  });
  return { ok, bad, master };
}
function matchCoach(name){
  const n = norm(name);
  return visibleCoachIds().find(id => norm(S.coaches[id].displayName) === n || norm(S.names[id]) === n);
}

async function adminSheet(tab){
  const ad = S.me.admin;
  const swimmers = id => Object.values(S.kids).filter(k => k.cid === id && k.active !== false).length;
  const staffIds = Object.keys(S.staff).sort((a,b) => (S.staff[a].name||"").localeCompare(S.staff[b].name||""));
  const coachOf = uid => Object.keys(S.coaches).find(c => S.coaches[c].userId === uid);
  const freeCoaches = Object.keys(S.coaches).filter(c => !S.coaches[c].userId).sort((a,b) => coachName(a).localeCompare(coachName(b)));
  const staffRow = uid => { const s = S.staff[uid], cid = coachOf(uid), me = uid === S.me.id;
    return `<div class="person"><span class="av" style="background:${s.title === "Coach" ? "#067EEA" : "#1B2955"}">${esc((s.name||"?").replace(/^coach\s+/i,"").charAt(0).toUpperCase())}</span>
      <div class="who"><b>${esc(s.name)}${me ? " (you)" : ""}${s.active ? "" : ` <span class="pill todo">Inactive</span>`}</b><span>${esc(s.email)}${cid ? ` · coaches as ${esc(coachName(cid))} (${swimmers(cid)} swimmers)` : ""}</span></div>
      ${ad && !me ? `<select class="sel" data-role="${esc(uid)}" aria-label="Role">${TITLES.map(x => `<option ${x === s.title ? "selected" : ""}>${x}</option>`).join("")}</select>
        <button class="btn" data-more="${esc(uid)}" aria-label="More">⋯</button>` : `<span class="pill ${s.title === "Coach" ? "todo" : "rev"}">${esc(s.title)}</span>`}</div>
      ${ad && !me ? `<div class="more hide" id="more-${esc(uid)}">
        <label class="f">Swimmers come from coach<select class="inp" data-link="${esc(uid)}"><option value="">Not linked to a coach</option>${[cid, ...freeCoaches].filter(Boolean).map(c => `<option value="${esc(c)}" ${c===cid?"selected":""}>${esc(coachName(c))} · ${swimmers(c)} swimmers</option>`).join("")}</select></label>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
          ${s.managed ? `<button class="btn" data-pw="${esc(uid)}">Set a new password</button>` : `<span class="note">Uses an existing Vortex login – they change their own password.</span>`}
          <button class="btn" data-act="${esc(uid)}">${s.active ? "Turn off access" : "Turn access back on"}</button></div></div>` : ""}`; };
  const tabs = ad ? `<div class="seg" role="group" aria-label="Section" style="align-self:flex-start">${[["people","People & logins"],["import","Import"],["programs","Levels & programmes"],["branding","Logo & mascots"],["term","Term"]].map(([k,l]) => `<button data-tab="${k}" aria-pressed="${tab===k}">${l}</button>`).join("")}</div>` : "";
  let body = "";
  if (tab === "people") body = `
    <div class="box"><h3>Who sees what</h3>
      <p class="note" style="margin:0"><b>Coach</b> – only the swimmers of the coach they're linked to.</p>
      <p class="note"><b>Supervisor · Manager</b> – every coach, the overview, parent contacts; can review and correct reports.</p>
      <p class="note"><b>Admin</b> – all of that, plus this screen: logins, roles, import, levels and term.</p></div>
    ${ad ? `<div class="box"><h3>Create a login</h3>
      <div class="grid4"><label class="f">Name<input class="inp" id="nuName" placeholder="Coach Fathy"></label>
      <label class="f">Email<input class="inp" id="nuEmail" type="email" autocomplete="off" placeholder="name@example.com"></label>
      <label class="f">Temporary password<input class="inp" id="nuPw" type="text" autocomplete="off" placeholder="At least 8 characters"></label>
      <label class="f">Role<select class="inp" id="nuRole">${TITLES.map(x => `<option>${x}</option>`).join("")}</select></label></div>
      <label class="f" style="margin-top:10px">Their swimmers<select class="inp" id="nuCoach"><option value="">${"New coach with no swimmers yet"}</option>${freeCoaches.map(c => `<option value="${esc(c)}">${esc(coachName(c))} · ${swimmers(c)} swimmers</option>`).join("")}</select></label>
      <p class="note">Give them the email and temporary password. They sign in and change it under their name (top right). If the email already has a Vortex club login, they keep that password.</p>
      <button class="btn primary" id="nuGo" style="margin-top:6px">Create login</button></div>` : ""}
    <div class="box"><h3>Staff with logins <small>${staffIds.length}</small></h3>${staffIds.map(staffRow).join("") || `<p class="note">No logins yet.</p>`}</div>
    <div class="box"><h3>Coaches without a login <small>${freeCoaches.length}</small></h3>
      ${freeCoaches.map(c => `<div class="person"><span class="av" style="background:#8F23D7">${esc(coachName(c).replace(/^coach\s+/i,"").charAt(0))}</span><div class="who"><b>${esc(coachName(c))}</b><span>${swimmers(c)} swimmers</span></div>${ad ? `<button class="btn" data-mk="${esc(c)}">Create login</button>` : ""}</div>`).join("") || `<p class="note">Every coach has a login.</p>`}
      ${ad ? `<div style="display:flex;gap:8px;margin-top:10px"><input class="inp" id="phName" placeholder="Add a coach by name, e.g. Coach Hala"><button class="btn" id="phAdd">Add</button></div>` : ""}</div>`;
  if (tab === "import") body = `
    <div class="box"><h3>1 · Get the template</h3>
      <p class="note" style="margin:0 0 10px">Upload the academy term sheet as it is (Status, Full Name, DOB, Level, Sun Time / Sun Coach / Sun Lane …), or the simple template: Coach, Swimmer, Age, Level, Training days.</p>
      <button class="btn" id="tpl">Download template</button></div>
    <div class="box"><h3>2 · Upload your sheet</h3>
      <input type="file" id="xfile" accept=".xlsx,.xls,.csv" class="inp">
      <div id="prev"></div></div>`;
  if (tab === "programs") { const pi = S.progEdit || 6, P0 = LEVELS[pi-1];
    body = `<div class="box"><h3>Edit a level or programme</h3>
      <select class="inp" id="pgSel">${LEVELS.map((L,i) => `<option value="${i+1}" ${i+1===pi?"selected":""}>${esc(L.short)} · ${esc(L.name)}</option>`).join("")}</select>
      <label class="f" style="margin-top:10px">Name<input class="inp" id="pgName" value="${esc(P0.name)}"></label>
      <label class="f" style="margin-top:10px">Goal<input class="inp" id="pgGoal" value="${esc(P0.goal)}"></label>
      <label class="f" style="margin-top:10px">Next step (shown on the report)<input class="inp" id="pgNext" value="${esc(P0.next || "")}"></label>
      <label class="f" style="margin-top:10px">Skills to learn – one per line, up to 5<textarea class="inp" id="pgSkills" rows="5">${esc(P0.skills.join("\n"))}</textarea></label>
      <label class="f" style="margin-top:10px">Assessment to pass – one per line, up to 5<textarea class="inp" id="pgAssess" rows="5">${esc(P0.assess.join("\n"))}</textarea></label>
      <p class="note">Changes apply to every report from now on, for all coaches. Keep the order of skills the same mid-term so past ratings still line up.</p>
      <div style="display:flex;gap:8px;margin-top:6px"><button class="btn primary" id="pgSave">Save</button><button class="btn ghost" id="pgReset">Restore original</button></div></div>`; }
  if (tab === "branding") body = `
    <div class="box"><h3>Logo and level mascots</h3>
      <p class="note" style="margin:0 0 10px">These appear in the app and on every PDF report. PNG or JPG, up to 2 MB. Square images with the character centred work best.</p>
      ${[["logo.png", "Academy logo", ASSETS.hasLogo, ASSETS.logoURL]].concat([1,2,3,4,5].map(n => [`mascot-${n}.png`, `${LEVELS[n-1].short} · ${LEVELS[n-1].name}`, ASSETS.mascots && ASSETS.mascots[n-1], "data:image/jpeg;base64," + ASSETS["thumb" + n]])).map(([f, label, has, src]) => `
        <div class="person"><img src="${src}" alt="" style="width:46px;height:46px;border-radius:10px;object-fit:cover;background:#fff">
          <div class="who"><b>${esc(label)}</b><span>${has ? "Uploaded" : "Not uploaded yet – a drawn placeholder is used"}</span></div>
          <label class="btn">Choose file<input type="file" accept="image/png,image/jpeg,image/webp" data-up="${f}" hidden></label></div>`).join("")}</div>`;
  if (tab === "term") { const t = S.term || {}; body = `
    <div class="box"><h3>Current term</h3>
      <label class="f">Name<input class="inp" id="tName" value="${esc(t.name || "")}" placeholder="Term 1 2026"></label>
      <div class="grid4" style="margin-top:10px"><label class="f">Starts<input class="inp" type="date" id="tStart" value="${esc(t.start || "")}"></label>
      <label class="f">Ends<input class="inp" type="date" id="tEnd" value="${esc(t.end || "")}"></label></div>
      <p class="note">Week numbers on reports count from the week the term starts.</p>
      <button class="btn primary" id="tSave" style="margin-top:6px">Save term</button></div>`; }
  openSheet(`${head(ad ? "Admin settings" : "Team", ad ? "Logins, roles, import, levels and term" : "Who's who")}<div class="sh-body">${tabs}${body}</div>`);
  const sh = $("#layer .sheet");
  sh.querySelectorAll("[data-tab]").forEach(b => b.onclick = () => adminSheet(b.dataset.tab));
  if (!ad) return;

  if (tab === "people") {
    const reopen = async () => { await loadBase(); adminSheet("people"); };
    sh.addEventListener("click", async e => {
      const m = e.target.closest("[data-more]"); if (m) { $(`#more-${m.dataset.more}`).classList.toggle("hide"); return; }
      const mk = e.target.closest("[data-mk]"); if (mk) { $("#nuCoach").value = mk.dataset.mk; $("#nuName").value = coachName(mk.dataset.mk); $("#nuEmail").focus(); $("#nuName").scrollIntoView({ block: "center" }); return; }
      const pw = e.target.closest("[data-pw]"); if (pw) { const v = prompt(`New password for ${S.staff[pw.dataset.pw].name} (at least 8 characters)`); if (!v) return;
        try { await adminCall("set_password", { user_id: pw.dataset.pw, password: v }); toast("Password changed – tell them the new one"); } catch (er) { toast(er.message); } return; }
      const ac = e.target.closest("[data-act]"); if (ac) { const s = S.staff[ac.dataset.act];
        const { error } = await sb.from("acad_staff").update({ active: !s.active }).eq("user_id", ac.dataset.act); if (error) return toast(error.message); toast(s.active ? "Access turned off" : "Access turned on"); return reopen(); }
    });
    sh.addEventListener("change", async e => {
      const r = e.target.closest("select[data-role]"); if (r) { await put(`staff/${r.dataset.role}`, { title: r.value }); toast(`${S.staff[r.dataset.role].name} is now ${r.value}`); return; }
      const l = e.target.closest("select[data-link]"); if (l) { try { await adminCall("link_coach", { user_id: l.dataset.link, coach_id: l.value }); toast("Saved"); reopen(); } catch (er) { toast(er.message); } }
    });
    if (ad) {
      $("#nuGo").onclick = async ev => { const b = ev.currentTarget, name = $("#nuName").value.trim(), email = $("#nuEmail").value.trim(), password = $("#nuPw").value;
        if (!name || !email) return toast("Add a name and email"); b.disabled = true; b.textContent = "Creating…";
        try { const out = await adminCall("create_user", { name, email, password, role: $("#nuRole").value.toLowerCase(), coach_id: $("#nuCoach").value });
          toast(out.existing ? "Done – they sign in with their existing Vortex password" : "Login created"); reopen(); }
        catch (er) { toast(er.message); b.disabled = false; b.textContent = "Create login"; } };
      $("#phAdd").onclick = async () => { const n = $("#phName").value.trim(); if (!n) return $("#phName").focus();
        if (matchCoach(n)) return toast(`${n} is already in the list`);
        const id = "p-" + norm(n).replace(/[^a-z0-9]+/g, "-") + "-" + Math.random().toString(36).slice(2,5);
        await put(P.coach(id), { displayName: /^coach\s/i.test(n) ? n : "Coach " + n }); toast(`${n} added`); reopen(); };
    }
  }

  if (tab === "programs") {
    $("#pgSel").onchange = e => { S.progEdit = +e.target.value; adminSheet("programs"); };
    const pi = S.progEdit || 6, lines = id => $(id).value.split("\n").map(x => x.trim()).filter(Boolean);
    $("#pgSave").onclick = async () => { const sk = lines("#pgSkills"), as = lines("#pgAssess");
      if (!sk.length || !as.length) return toast("Add at least one skill and one assessment item");
      if (sk.length > 5 || as.length > 5) return toast("Keep it to 5 skills and 5 assessment items so the report fits one page");
      const all = { ...(S.programs || {}) }; all[String(pi)] = { name: $("#pgName").value.trim(), goal: $("#pgGoal").value.trim(), next: $("#pgNext").value.trim(), skills: sk, assess: as };
      await put("settings/programs", all); toast("Saved"); };
    $("#pgReset").onclick = async () => { const all = { ...(S.programs || {}) }; delete all[String(pi)]; await put("settings/programs", all); toast("Original restored"); setTimeout(() => adminSheet("programs"), 300); };
  }
  if (tab === "branding") sh.addEventListener("change", async e => { const i = e.target.closest("input[data-up]"); if (!i || !i.files[0]) return;
    const f = i.files[0]; if (f.size > 2097152) return toast("That file is over 2 MB");
    toast("Uploading…"); const { error } = await sb.storage.from("acad-assets").upload(i.dataset.up, f, { upsert: true, contentType: f.type, cacheControl: "60" });
    if (error) return toast(error.message); await loadAssets(); render(); toast("Uploaded"); adminSheet("branding"); });
  if (tab === "term") $("#tSave").onclick = async () => { await put("settings/term", { name: $("#tName").value.trim(), start: $("#tStart").value, end: $("#tEnd").value, updatedAt: Date.now() }); toast("Term saved"); };
  if (tab === "import") {
    $("#tpl").onclick = () => {
      if (!window.XLSX) return toast("The Excel tool didn't load – reload the page");
      const ws = XLSX.utils.aoa_to_sheet([["Coach","Swimmer","Age","Level","Training days"],["Coach Martin","Layla Hassan",7,3,"Sun & Tue 4pm"],["Coach Martin","Omar Khalid",6,"Bubbly Blowfish","Sun & Tue 4pm"],["Coach Sherif","Noor Ahmed",8,"Level 4","Mon & Wed 5pm"]]);
      ws["!cols"] = [{wch:18},{wch:24},{wch:6},{wch:20},{wch:18}];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Swimmers");
      deliver("Vortex Academy swimmers template.xlsx", new Blob([XLSX.write(wb, { type:"array", bookType:"xlsx" })]));
    };
    $("#xfile").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      if (!window.XLSX) return toast("The Excel tool didn't load – reload the page");
      let wb; try { wb = XLSX.read(await f.arrayBuffer(), { cellDates: true }); }
      catch { $("#prev").innerHTML = `<p class="note">That file couldn't be read. Save it as .xlsx or .csv and try again.</p>`; return; }
      const sheets = wb.SheetNames.map(n => { const a = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "" });
        const hr = a.slice(0,5).find(r => r.some(c => /full\s*name|swimmer|^name$/i.test(String(c).trim())));
        const days = hr ? hr.filter(c => /^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.?\s+time/i.test(String(c).trim())).length : 0;
        const filled = a.filter(r => r.some(c => String(c).trim())).length;
        return { n, a, ok: !!hr, score: (days ? 1e6 : 0) + filled }; }).filter(x => x.ok).sort((x,y) => y.score - x.score);
      if (!sheets.length) { $("#prev").innerHTML = `<p class="note">No sheet with a swimmer name column was found.</p>`; return; }
      showPreview(sheets, 0);
    };
    function showPreview(sheets, si){
      const rows = sheets[si].a;
      const { ok, bad, master } = readRows(rows);
      const byCoach = {}, label = {}; ok.forEach(r => { const k = norm(r.coach); if (!label[k] || /^coach\s/i.test(r.coach)) label[k] = r.coach; (byCoach[k] = byCoach[k] || LEVELS.map(() => 0))[r.level-1]++; });
      const newCoaches = Object.keys(byCoach).filter(c => !matchCoach(label[c]));
      $("#prev").innerHTML = `
        ${sheets.length > 1 ? `<label class="f" style="margin-top:10px">Sheet<select class="inp" id="shPick">${sheets.map((x,i) => `<option value="${i}" ${i===si?"selected":""}>${esc(x.n)}</option>`).join("")}</select></label>` : ""}
        <p class="note" style="margin:12px 0 8px"><b>${ok.length}</b> swimmers ready · <b>${Object.keys(byCoach).length}</b> coaches${newCoaches.length ? ` (${newCoaches.length} new)` : ""}${bad.length ? ` · <b style="color:#C0392B">${bad.length} rows skipped</b>` : ""}</p>
        ${ok.length ? `<div style="overflow-x:auto"><table class="att-table"><thead><tr><th style="text-align:left">Coach</th>${LEVELS.map(L=>`<th>${L.code}</th>`).join("")}</tr></thead><tbody>
          ${Object.entries(byCoach).map(([c,a]) => `<tr><td>${esc(label[c])}${matchCoach(label[c]) ? "" : ` <span class="pill wip">new</span>`}</td>${a.map(x=>`<td>${x||"–"}</td>`).join("")}</tr>`).join("")}</tbody></table></div>` : ""}
        ${bad.length ? `<details style="margin-top:8px"><summary class="note" style="cursor:pointer">Skipped rows</summary>${bad.slice(0,40).map(b => `<p class="note" style="margin:2px 0">Row ${b.row}${b.name ? ` (${esc(b.name)})` : ""}: ${esc(b.why)}</p>`).join("")}</details>` : ""}
        ${ok.length ? `<button class="btn primary" id="doImport" style="margin-top:12px">Import ${ok.length} swimmers</button><p class="note">Swimmers already in the system are updated, not duplicated. ${master ? "Each swimmer goes to the coach they train with most; parent numbers are kept for management only." : ""}</p>` : ""}`;
      $("#doImport") && ($("#doImport").onclick = async ev => {
        const btn = ev.currentTarget; btn.disabled = true;
        const cmap = {};
        for (const c of Object.keys(byCoach)) {
          const nm = label[c]; let id = matchCoach(nm);
          if (!id) { id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2,6);
            const dn = /^coach\s/i.test(nm) || nm === "Unassigned" ? nm : "Coach " + nm;
            await put(P.coach(id), { displayName: dn });
            S.coaches[id] = { displayName: dn, placeholder: true }; }
          cmap[c] = id;
        }
        let n = 0;
        for (const r of ok) {
          const cid = cmap[norm(r.coach)];
          const ex = Object.values(S.kids).find(k => k.active !== false && norm(k.name) === norm(r.name) && (!r.dob || !k.dob || k.dob === r.dob));
          const fields = { name: r.name, level: r.level, active: true, ...(r.pt ? { ptType: r.pt } : {}), ...(r.dob ? { dob: r.dob } : {}), ...(r.age ? { age: r.age } : {}), ...(r.sessions.length ? { sessions: r.sessions } : {}), ...(r.group ? { group: r.group } : {}) };
          let kidId;
          if (ex && ex.cid === cid) { kidId = ex.id; await patch(P.kid(cid, kidId), fields); }
          else if (ex) { kidId = ex.id; await moveKid(kidId, ex.cid, cid); await patch(P.kid(cid, kidId), fields); }
          else { kidId = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2,7); await put(P.kid(cid, kidId), { ...fields, createdAt: Date.now() }); }
          if (r.phones.length || r.email) await put(`contacts/${kidId}`, { phones: r.phones, email: r.email });
          btn.textContent = `Importing ${++n} of ${ok.length}…`;
        }
        btn.textContent = "Imported"; toast(`${ok.length} swimmers imported`);
      });
      $("#shPick") && ($("#shPick").onchange = e => showPreview(sheets, +e.target.value));
    }
  }
}

/* ---------- report editor ---------- */
let sample = null;
function openKid(key){
  const kid = S.kids[key]; if (!kid) return;
  const cid = kid.cid, id = kid.id; let r = getReport(kid); const lvl = r.level, L = LEVELS[lvl-1], gn = notesFor(cid, lvl);
  const editable = mgmt() || cid === S.me.coachId;
  let dirty = false, timer = null;
  const flush = async () => { clearTimeout(timer); if (!dirty) return; dirty = false; r.updatedAt = Date.now(); r.updatedBy = S.me.id;
    await put(P.report(cid, id), r);
    await patch(P.kid(cid, id), { last: { level: lvl, skills: r.skills, assess: r.assess, traits: r.traits } }); };
  const touch = () => { dirty = true; clearTimeout(timer); timer = setTimeout(flush, 700); };
  closeHook = flush;
  const stageRow = (s,i) => `<div class="sk"><p>${esc(s)}</p><div class="stage" role="group" aria-label="${esc(s)}">${STAGES.map((st,j)=>`<button data-sk="${i}" data-v="${j+1}" aria-pressed="${r.skills[i]===j+1}">${st}</button>`).join("")}</div></div>`;
  const asRow = (a,i) => `<div class="as"><span>${esc(a)}</span><div class="yn" role="group" aria-label="${esc(a)}"><button data-as="${i}" data-v="1" aria-pressed="${r.assess[i]===1}">Not yet</button><button data-as="${i}" data-v="2" aria-pressed="${r.assess[i]===2}">Achieved</button></div></div>`;
  const trRow = (t,i) => `<div class="tr"><span>${esc(t)}</span><div class="dots" role="group" aria-label="${esc(t)}">${[1,2,3,4,5].map(v=>`<button data-tr="${i}" data-v="${v}" class="${r.traits[i]>=v?"on":""}" aria-label="${v} of 5">${v}</button>`).join("")}</div></div>`;
  const nextKid = () => { const ks = [...document.querySelectorAll("#list .row")].map(b => S.kids[b.dataset.k]).filter(Boolean); const i = ks.findIndex(k => k.cid === cid && k.id === id); return ks[i+1]; };
  const coachIds = visibleCoachIds();
  const reviewed = r.reviewedAt ? `Reviewed${r.reviewedBy && S.coaches[r.reviewedBy] ? " by " + coachName(r.reviewedBy) : ""}` : "";

  openSheet(`${head(kid.name, `${L.short} · ${L.name} · ${coachName(cid)}`, lvl)}
  <div class="sh-body">
    ${mgmt() ? `<div class="box hide" id="contactBox" style="--c:var(--sky)"></div>` : ""}
    ${reviewed ? `<div class="box" style="--c:var(--royal)"><h3>${esc(reviewed)}</h3><p class="note" style="margin:0">Management has checked this report.</p></div>` : ""}
    <details class="box"><summary style="cursor:pointer;font-weight:600">Swimmer details</summary>
      <div class="grid4" style="margin-top:10px">
        <label class="f">Name<input class="inp" data-kf="name" value="${esc(kid.name)}"></label>
        <label class="f">Date of birth${kid.dob ? ` · age ${esc(ageOf(kid))}` : ""}<input class="inp" type="date" data-kf="dob" value="${esc(kid.dob||"")}"></label>
        ${(kid.sessions||[]).length ? "" : `<label class="f">Group / days<input class="inp" data-kf="group" value="${esc(kid.group||"")}"></label>`}
        ${mgmt() ? `<label class="f">Coach<select class="inp" id="mvCoach">${coachIds.map(c=>`<option value="${esc(c)}" ${c===cid?"selected":""}>${esc(coachName(c))}</option>`).join("")}</select></label>` : ""}
      </div>
      ${(kid.sessions||[]).length ? `<div class="schedlist">${kid.sessions.map(x => `<span><b>${esc(x.day)} ${esc(fmtTime(x.time))}</b>${[x.coach, x.lane && "Lane " + x.lane].filter(Boolean).map(esc).join(" · ")}</span>`).join("")}</div>` : ""}
      <button class="btn ghost" id="rmKid" style="margin-top:8px;color:#C0392B;padding-left:0">Remove from academy list</button>
    </details>
    <div class="box" style="--c:var(--royal)"><h3>Attendance</h3>
      <div class="days">${DAYS.map((d,i)=>`<button class="day ${(kid.sessions||[]).some(x=>x.day===d)?"sched":""}" data-day="${i}" aria-pressed="${!!r.att[i]}">${d}</button>`).join("")}</div>
      ${(kid.sessions||[]).length ? `<p class="note">Underlined days are ${esc(kid.name.split(" ")[0])}'s training days.</p>` : ""}
      <div class="tot">Attended <b id="attC">${r.att.filter(Boolean).length}</b> of <input class="inp" id="attT" inputmode="numeric" value="${esc(r.attTotal ?? "")}"> sessions</div>
    </div>
    <div class="box"><h3>Skills to learn <small>stage this week</small></h3>${L.skills.map(stageRow).join("")}</div>
    <div class="box" style="--c:var(--purple)"><h3>Assessment to pass</h3>${L.assess.map(asRow).join("")}
      <div class="ready"><span>Ready to move up?<em>${esc(L.next)}</em></span><div class="yn"><button data-rd="1" data-v="1" aria-pressed="${r.ready===1}">Yes</button><button data-rd="2" data-v="2" aria-pressed="${r.ready===2}">Not yet</button></div></div>
      <div id="moveWrap"></div>
    </div>
    <div class="box" style="--c:var(--royal)"><h3>Effort & attitude <small>1 needs support · 5 outstanding</small></h3>${TRAITS.map(trRow).join("")}</div>
    <div class="box" style="--c:var(--sky)"><h3>Notes for parents</h3>
      <label class="f">This week's focus<textarea class="inp" data-tf="focus" placeholder="${esc(gn.focus || "Uses the group note if left empty")}">${esc(r.focus)}</textarea></label>
      <label class="f" style="margin-top:10px">Next week's goal<textarea class="inp" data-tf="goal" placeholder="${esc(gn.goal || "Uses the group note if left empty")}">${esc(r.goal)}</textarea></label>
      <label class="f" style="margin-top:10px">Try at home<textarea class="inp" data-tf="home" placeholder="${esc(gn.home || "Uses the group note if left empty")}">${esc(r.home)}</textarea></label>
    </div>
    <div class="box" style="--c:var(--mint)"><h3>Coach's comment</h3>
      <textarea class="inp" data-tf="comment" rows="4" id="cmt" placeholder="Two or three warm, specific sentences for the parents">${esc(r.comment)}</textarea>
      <button class="btn ai hide" id="aiBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/></svg>Draft with Claude</button>
      <p class="note hide" id="aiNote"></p>
    </div>
  </div>
  <div class="sh-foot">
    <button class="btn" id="pdfOne"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16"/></svg>PDF</button>
    ${mgmt() ? `<button class="btn" id="revBtn">${r.reviewedAt ? "Undo review" : "Mark reviewed"}</button>` : ""}
    <button class="btn" id="profBtn">Profile</button>
    <span class="sp"></span>
    <button class="btn primary" id="doneBtn">${nextKid() ? "Mark done & next swimmer" : "Mark done"}</button>
  </div>`);
  if (mgmt()) Store.getDoc(`contacts/${id}`).then(c => { const b = $("#contactBox"); if (!b || !c || !(c.phones||[]).length && !c.email) return;
    const wa = p => { const d = String(p).replace(/\D/g, ""); return d.length === 8 ? "974" + d : d; };
    b.innerHTML = `<h3>Parent contact <small>management only</small></h3>` + (c.phones||[]).map(p => `<div class="as"><span>${esc(p)}</span><a class="btn" href="tel:+${wa(p)}">Call</a><a class="btn" href="https://wa.me/${wa(p)}" target="_blank" rel="noopener">WhatsApp</a></div>`).join("") +
      (c.email ? `<div class="as"><span>${esc(c.email)}</span><a class="btn" href="mailto:${esc(c.email)}">Email</a></div>` : "");
    b.classList.remove("hide"); }).catch(() => {});
  $("#profBtn").onclick = async () => { if (editable) await flush(); closeHook = null; if (window.VXP) VXP.open(key); };
  if (!editable) return;
  const sh = $("#layer .sheet");
  const moveUp = () => { const w = $("#moveWrap"), cur = S.kids[key];
    const nx = L.nextId, NL = nx ? LEVELS[nx-1] : null;
    w.innerHTML = r.ready === 1 && NL && cur.level === lvl ? `<button class="btn moveup" id="mvBtn">Move ${esc(kid.name.split(" ")[0])} to ${esc(NL.short)} · ${esc(NL.name)} from next week</button>` :
      cur.level !== lvl ? `<p class="note">Moves to ${esc(LEVELS[cur.level-1].short)} from next week.</p>` : "";
    $("#mvBtn") && ($("#mvBtn").onclick = async () => { await patch(P.kid(cid, id), { level: nx, last: null }); toast(`${kid.name} moves to ${NL.short} next week`); w.innerHTML = `<p class="note">Moves to ${esc(NL.short)} from next week.</p>`; });
  };
  moveUp();
  sh.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const setGroup = (val, attr) => b.parentNode.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", +x.dataset.v === val));
    if (b.dataset.day != null) { const i = +b.dataset.day; r.att[i] = r.att[i] ? 0 : 1; b.setAttribute("aria-pressed", !!r.att[i]); $("#attC").textContent = r.att.filter(Boolean).length; touch(); }
    else if (b.dataset.sk != null) { const i = +b.dataset.sk, v = +b.dataset.v; r.skills[i] = r.skills[i] === v ? 0 : v; setGroup(r.skills[i]); touch(); }
    else if (b.dataset.as != null) { const i = +b.dataset.as, v = +b.dataset.v; r.assess[i] = r.assess[i] === v ? 0 : v; setGroup(r.assess[i]); touch(); }
    else if (b.dataset.rd != null) { const v = +b.dataset.v; r.ready = r.ready === v ? 0 : v; setGroup(r.ready); moveUp(); touch(); }
    else if (b.dataset.tr != null) { const i = +b.dataset.tr, v = +b.dataset.v; r.traits[i] = r.traits[i] === v ? v - 1 : v; b.parentNode.querySelectorAll("button").forEach(x => x.classList.toggle("on", +x.dataset.v <= r.traits[i])); touch(); }
  });
  sh.querySelectorAll("[data-tf]").forEach(t => t.addEventListener("input", () => { r[t.dataset.tf] = t.value; touch(); }));
  $("#attT").addEventListener("input", e => { r.attTotal = e.target.value.trim(); touch(); });
  sh.querySelectorAll("[data-kf]").forEach(t => t.addEventListener("change", () => { const v = t.value.trim(); if (t.dataset.kf === "name" && !v) return; patch(P.kid(cid, id), { [t.dataset.kf]: v }); kid[t.dataset.kf] = v; }));
  $("#mvCoach") && ($("#mvCoach").onchange = async e => { const to = e.target.value; if (to === cid) return;
    if (!confirm(`Move ${kid.name} to ${coachName(to)}? Past reports stay with ${coachName(cid)}.`)) { e.target.value = cid; return; }
    await moveKid(id, cid, to);
    closeHook = null; closeSheet(); toast(`${kid.name} moved to ${coachName(to)}`); });
  $("#rmKid").onclick = async () => { if (!confirm(`Remove ${kid.name} from the academy list? Past reports are kept.`)) return; await patch(P.kid(cid, id), { active:false }); closeHook = null; closeSheet(); toast(`${kid.name} removed`); };
  $("#pdfOne").onclick = async () => { await flush(); downloadPdfs([{ kid, r }], "single"); };
  $("#revBtn") && ($("#revBtn").onclick = async () => { if (r.reviewedAt) { r.reviewedAt = null; r.reviewedBy = null; } else { r.reviewedAt = Date.now(); r.reviewedBy = S.me.id; r.done = true; }
    dirty = true; await flush(); closeHook = null; closeSheet(); toast(r.reviewedAt ? "Marked reviewed" : "Review removed"); });
  $("#doneBtn").onclick = async () => { r.done = true; dirty = true; await flush(); const nk = nextKid(); closeHook = null; closeSheet(); if (nk) openKid(`${nk.cid}/${nk.id}`); else toast("All done for this level"); };

  if (sample) {
    const ai = $("#aiBtn"); ai.classList.remove("hide");
    ai.onclick = async () => {
      const note = $("#aiNote"), ta = $("#cmt"); ai.disabled = true; note.classList.remove("hide"); note.textContent = "Writing…";
      const first = kid.name.split(" ")[0];
      const facts = [
        `Swimmer: ${first}${ageOf(kid) ? `, age ${ageOf(kid)}` : ""}. Programme: ${L.short} "${L.name}" (goal: ${L.goal}).`,
        `Attendance: ${r.att.filter(Boolean).length} of ${r.attTotal || "?"} sessions.`,
        "Skills (stage this week): " + L.skills.map((s,i) => `${s} – ${r.skills[i] ? STAGES[r.skills[i]-1] : "not rated"}`).join("; "),
        "Assessment items: " + L.assess.map((s,i) => `${s} – ${r.assess[i]===2 ? "achieved" : r.assess[i]===1 ? "not yet" : "not checked"}`).join("; "),
        `Ready to move up: ${r.ready===1 ? "yes" : r.ready===2 ? "not yet" : "not decided"}.`,
        "Effort & attitude (1-5): " + TRAITS.map((t,i) => `${t} ${r.traits[i]||"-"}`).join(", "),
        `Focus this week: ${r.focus || gn.focus || "-"}. Next goal: ${r.goal || gn.goal || "-"}.`,
        ta.value.trim() ? `Coach's rough notes to include: ${ta.value.trim()}` : ""
      ].filter(Boolean).join("\n");
      try {
        const res = await sample(`You write the coach's comment on a weekly swimming report that parents read. Using only the facts below, write 2-3 warm, specific sentences (max 55 words) in plain English: one real strength from the ratings, one thing to work on next, and an encouraging close using the child's first name. No emojis, no bullet points, no greeting or sign-off. Reply with the comment text only.\n\n${facts}`,
          { modelTier: "quick", cache: false, onText: ({ text }) => { ta.value = text; } });
        ta.value = res.text.trim(); r.comment = ta.value; touch(); note.textContent = "Drafted – edit anything before you mark it done.";
      } catch (e) { note.textContent = e && e.code === "not_granted" ? "Drafting isn't allowed on this account." : e && e.code === "rate_limited" ? "Too many drafts right now – try again in a minute." : "Couldn't draft a comment this time."; }
      ai.disabled = false;
    };
  }
}

/* ---------- PDFs ---------- */
function reportData(kid, r){
  const gn = notesFor(kid.cid, r.level);
  return { level:r.level, name:kid.name, age:ageOf(kid), coach:coachName(kid.cid), group:groupOf(kid), weekLabel:weekLabel(S.week), termWeek:gn.termWeek || termWeekOf(S.week),
    att:r.att, attCount:r.att.filter(Boolean).length, attTotal:r.attTotal || gn.total || "", skills:r.skills, assess:r.assess, ready:r.ready, traits:r.traits,
    focus:r.focus || gn.focus || "", goal:r.goal || gn.goal || "", home:r.home || gn.home || "", comment:r.comment, date:todayLabel() };
}
const safeName = s => String(s).replace(/[\\/:*?"<>|]+/g, "").trim();
async function deliver(filename, blob){
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}
async function downloadPdfs(items, mode, tagIn){
  if (!(await ensureFonts())) toast("Using a standard font – the brand font couldn't load");
  const JsPDF = window.jspdf && window.jspdf.jsPDF; if (!JsPDF) return toast("The PDF tool didn't load – reload the page");
  const wk = S.week, tag = tagIn || `${LEVELS[S.level-1].short} ${LEVELS[S.level-1].name} – Week of ${wk}`;
  if (mode === "single") { const { kid, r } = items[0]; return deliver(`${safeName(kid.name)} – Week of ${wk}.pdf`, PDFGEN.build(JsPDF, [reportData(kid, r)]).output("blob")); }
  if (mode === "zip") {
    if (!window.JSZip) return toast("The ZIP tool didn't load – reload the page");
    const z = new JSZip(), multi = new Set(items.map(i => i.kid.cid)).size > 1;
    items.forEach(({kid, r}) => z.file(`${multi ? safeName(coachName(kid.cid)) + "/" : ""}${safeName(kid.name)} – Week of ${wk}.pdf`, PDFGEN.build(JsPDF, [reportData(kid, r)]).output("arraybuffer")));
    return deliver(`${tag}.zip`, await z.generateAsync({ type:"blob" }));
  }
  return deliver(`${tag}.pdf`, PDFGEN.build(JsPDF, items.map(({kid, r}) => reportData(kid, r))).output("blob"));
}
function downloadAll(){
  const lvKids = kidsInLevel(S.level);
  const allKids = LEVELS.flatMap((_, i) => kidsInLevel(i + 1));
  if (!allKids.length) return toast("No swimmers yet");
  let scope = lvKids.length && !S.allLv ? "level" : "all", which = "done";
  const L = LEVELS[S.level-1], who = mgmt() ? " · " + (S.coachSel === "all" ? "all coaches" : coachName(S.coachSel)) : "", dayTxt = S.day !== "all" ? ` · ${S.day} only` : "";
  openSheet(`${head("Download reports", `${weekLabel(S.week)}${who}${dayTxt}`, S.level)}<div class="sh-body"><div class="box">
    <p class="note" style="margin:0 0 6px">Which levels</p>
    <div class="seg" role="group" aria-label="Which levels" style="margin-bottom:12px;flex-wrap:wrap"><button id="sLv">${esc(L.short)} only (${lvKids.length})</button><button id="sAll">All levels & programmes (${allKids.length})</button></div>
    <p class="note" style="margin:0 0 6px">Which reports</p>
    <div class="seg" role="group" aria-label="Which swimmers" style="margin-bottom:14px"><button id="dDone"></button><button id="dAll"></button></div>
    <button class="btn" id="dPrint" style="width:100%;justify-content:flex-start;padding:14px;margin-bottom:8px"><span style="text-align:left"><b style="display:block">One PDF with all reports</b><span class="note">Every swimmer on their own page, sorted by level then name</span></span></button>
    <button class="btn" id="dZip" style="width:100%;justify-content:flex-start;padding:14px"><span style="text-align:left"><b style="display:block">One PDF per swimmer</b><span class="note">A ZIP to send each family their own report</span></span></button>
    <p class="note" id="dWarn"></p>
  </div></div>`, true);
  const base = () => scope === "all" ? allKids : lvKids;
  const sync = () => { const b = base(), d = b.filter(isDone).length;
    $("#sLv").setAttribute("aria-pressed", scope === "level"); $("#sAll").setAttribute("aria-pressed", scope === "all");
    $("#dDone").textContent = `Done (${d})`; $("#dAll").textContent = `Everyone (${b.length})`;
    $("#dDone").setAttribute("aria-pressed", which === "done"); $("#dAll").setAttribute("aria-pressed", which === "all");
    $("#dWarn").textContent = which === "all" && b.length - d ? `${b.length - d} report${b.length - d === 1 ? " isn't" : "s aren't"} marked done – they'll print with what has been filled in so far.` : ""; };
  if (!base().some(isDone)) which = "all"; sync();
  $("#sLv").onclick = () => { scope = "level"; sync(); }; $("#sAll").onclick = () => { scope = "all"; sync(); };
  $("#dDone").onclick = () => { which = "done"; sync(); }; $("#dAll").onclick = () => { which = "all"; sync(); };
  const items = () => { const b = base(); return (which === "done" ? b.filter(isDone) : b).map(k => ({ kid:k, r:getReport(k) })); };
  const go = mode => async () => { const it = items(); if (!it.length) return toast(which === "done" ? "No reports marked done yet" : "No swimmers here");
    const tag = (scope === "all" ? "All levels" : `${L.short} ${L.name}`) + (mgmt() && S.coachSel !== "all" ? ` – ${coachName(S.coachSel)}` : "") + ` – Week of ${S.week}`;
    closeSheet(); toast(it.length > 60 ? `Preparing ${it.length} reports – this can take a minute…` : "Preparing PDFs…"); await downloadPdfs(it, mode, tag); };
  $("#dZip").onclick = go("zip"); $("#dPrint").onclick = go("print");
}

/* ---------- wiring ---------- */
$("#groups").addEventListener("click", e => { const b = e.target.closest("[data-grp]"); if (!b) return; const i = LEVELS.findIndex(L => L.group === b.dataset.grp); S.level = i + 1; S.allLv = false; ls.set("vx_all", false); S.view = "swimmers"; ls.set("vx_level", S.level); render(); });
$("#filters").addEventListener("click", e => { const b = e.target.closest("[data-day-f]"); if (!b) return; S.day = b.dataset.dayF; ls.set("vx_day", S.day); render(); });
$("#filters").addEventListener("input", e => { if (e.target.id !== "q") return; S.q = e.target.value; render(); });
$("#levels").addEventListener("click", e => { const b = e.target.closest(".lv"); if (!b) return; if (b.dataset.l === "all") S.allLv = true; else { S.allLv = false; S.level = +b.dataset.l; } ls.set("vx_all", S.allLv); S.view = "swimmers"; ls.set("vx_level", S.level); render(); });
$("#list").addEventListener("click", e => { const b = e.target.closest(".row"); if (b) openKid(b.dataset.k); });
$("#vOverview").addEventListener("click", e => { const tr = e.target.closest("tr[data-c]"); if (!tr) return; S.coachSel = tr.dataset.c; ls.set("vx_cf", S.coachSel); S.view = "swimmers"; render(); });
$("#mgBar").addEventListener("click", e => { const b = e.target.closest("[data-view]"); if (!b) return; S.view = b.dataset.view; render(); });
$("#coachSel").onchange = e => { S.coachSel = e.target.value; ls.set("vx_cf", S.coachSel); render(); };
$("#wPrev").onclick = () => changeWeek(-1); $("#wNext").onclick = () => changeWeek(1);
$("#meBtn").onclick = askName; $("#teamBtn").onclick = () => adminSheet("people");
$("#addBtn").onclick = addKids; $("#deckBtn") && ($("#deckBtn").onclick = () => { S.view = "deck"; render(); window.scrollTo(0, 0); }); $("#calBtn") && ($("#calBtn").onclick = () => { S.view = "calendar"; render(); window.scrollTo(0, 0); }); $("#notesBtn").onclick = groupNotes; $("#attBtn").onclick = attendance; $("#dlAllBtn").onclick = downloadAll;

window.VX = { S, sb, esc, openSheet, closeSheet, head, toast, mgmt, coachName, ageOf, fmtTime, timeVal, fromIso, iso, sundayOf, weekLabel, MON, DAYS, norm, visibleCoachIds, toRep, downloadPdfs, deliver, render, groupOf, loadBase,
  goWeek: ws => { S.week = iso(sundayOf(fromIso(ws))); S.reports = {}; S.notes = {}; S.view = "swimmers"; render(); loadWeek(); },
  goDay: ds => { const d = fromIso(ds); S.week = iso(sundayOf(d)); S.reports = {}; S.notes = {}; S.day = DAYS[d.getDay()]; ls.set("vx_day", S.day); S.view = "swimmers"; render(); loadWeek(); window.scrollTo(0, 0); } };

/* ---------- account, login, boot ---------- */
function askName(){
  openSheet(`${head(S.me.name || "Your account", `${titleOf(S.me.id)} · ${S.me.email || ""}`)}<div class="sh-body">
    <div class="box"><h3>Your access</h3><p class="note" style="margin:0">${mgmt() ? "You can see every coach's swimmers, reports and parent contacts." : S.me.coachId ? `You see the swimmers of ${esc(coachName(S.me.coachId))}. Management can see your reports.` : "Your login isn't linked to a coach yet – ask an academy admin."}</p></div>
    <div class="box"><h3>Change password</h3>
      <label class="f">New password<input class="inp" id="np1" type="password" autocomplete="new-password"></label>
      <label class="f" style="margin-top:10px">Type it again<input class="inp" id="np2" type="password" autocomplete="new-password"></label>
      <button class="btn primary" id="npGo" style="margin-top:10px">Change password</button></div>
    <div class="box"><button class="btn" id="soGo">Sign out</button></div></div>`, true);
  $("#npGo").onclick = async () => { const a = $("#np1").value, b = $("#np2").value;
    if (a.length < 8) return toast("Use at least 8 characters"); if (a !== b) return toast("The two passwords don't match");
    const { error } = await sb.auth.updateUser({ password: a }); if (error) return toast(error.message); closeSheet(); toast("Password changed"); };
  $("#soGo").onclick = async () => { await sb.auth.signOut(); location.reload(); };
}

function showLogin(msg, signedIn){
  S.blocked = true;
  let el = $("#auth"); if (!el) { el = document.createElement("div"); el.id = "auth"; document.body.appendChild(el); }
  const login = () => `
    <form class="auth-card" id="lf" autocomplete="on">
      <img src="${ASSETS.logoURL}" alt="">
      <small>VORTEX AQUATICS</small><h1>Swimming Academy</h1>
      ${msg ? `<p class="auth-msg">${esc(msg)}</p>` : ""}
      ${signedIn ? `<button class="btn primary" type="button" id="lo">Sign in with another account</button>` : `
      <label class="f">Email<input class="inp" id="le" type="email" autocomplete="username" required></label>
      <label class="f">Password<input class="inp" id="lp" type="password" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit" id="lb">Sign in</button>
      <button class="linkbtn" type="button" id="ls">First-time setup for the academy admin</button>`}
    </form>`;
  const setup = () => `
    <form class="auth-card" id="sf" autocomplete="off">
      <img src="${ASSETS.logoURL}" alt="">
      <small>VORTEX SWIMMING ACADEMY</small><h1>Create the admin login</h1>
      <p class="auth-msg muted">Only needed once. Use the setup code you were given.</p>
      <label class="f">Setup code<input class="inp" id="sc" required></label>
      <label class="f">Your name<input class="inp" id="sn" required placeholder="Ahmed Aly"></label>
      <label class="f">Email<input class="inp" id="se" type="email" autocomplete="username" required></label>
      <label class="f">Choose a password<input class="inp" id="sp" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="btn primary" type="submit">Create admin login</button>
      <button class="linkbtn" type="button" id="sb">Back to sign in</button>
    </form>`;
  const wire = () => {
    $("#lo") && ($("#lo").onclick = async () => { await sb.auth.signOut(); location.reload(); });
    $("#ls") && ($("#ls").onclick = () => { el.innerHTML = setup(); wire(); });
    $("#sb") && ($("#sb").onclick = () => { el.innerHTML = login(); wire(); });
    $("#lf") && ($("#lf").onsubmit = async e => { e.preventDefault(); const b = $("#lb"); b.disabled = true; b.textContent = "Signing in…";
      const { error } = await sb.auth.signInWithPassword({ email: $("#le").value.trim(), password: $("#lp").value });
      if (error) { b.disabled = false; b.textContent = "Sign in"; toast(/invalid/i.test(error.message) ? "Email or password is not correct" : error.message); return; }
      location.reload(); });
    $("#sf") && ($("#sf").onsubmit = async e => { e.preventDefault(); const email = $("#se").value.trim(), password = $("#sp").value;
      try { const out = await adminCall("bootstrap", { code: $("#sc").value.trim(), name: $("#sn").value.trim(), email, password });
        if (out.existing) { toast("Admin access added – sign in with your existing Vortex password"); el.innerHTML = login(); wire(); return; }
        const { error } = await sb.auth.signInWithPassword({ email, password }); if (error) return toast(error.message); location.reload();
      } catch (er) { toast(er.message); } });
  };
  el.innerHTML = login(); wire();
}

(async () => {
  try { await loadAssets(); } catch (e) { console.error(e); }
  render();
  const { data: { session } } = await sb.auth.getSession();
  if (!session) return showLogin();
  S.me.id = session.user.id; S.me.email = session.user.email;
  const { data: me, error } = await sb.from("acad_staff").select("*").eq("user_id", S.me.id).maybeSingle();
  if (error) return showLogin("Couldn't reach the server. Check your connection and reload.");
  if (!me || !me.active) return showLogin(me ? "Your access is turned off. Ask an academy admin." : "This login isn't set up for academy reports yet. Ask an academy admin to create your access.", true);
  S.me.role = me.role; S.me.name = me.display_name; S.me.mgmt = me.role !== "coach"; S.me.admin = me.role === "admin";
  if (!S.me.mgmt) S.view = "swimmers";
  try { await loadBase(); } catch { return; }
  S.me.coachId = Object.keys(S.coaches).find(c => S.coaches[c].userId === S.me.id) || null;
  setStatus(); render(); loadWeek();
  setInterval(() => { if (!document.hidden && !$("#layer").innerHTML) { loadBase().then(render).catch(() => {}); loadWeek(); } }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden && !$("#layer").innerHTML) loadWeek(); });
})();
})();
