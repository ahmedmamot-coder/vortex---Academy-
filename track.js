/* Report submissions (coach → management), level-up forms with approval, and level-up certificates. Uses window.VX. */
(() => {
const X = () => window.VX;
const T = { tab: "subs", subs: {}, subsLoading: {}, lu: null, luLoading: false, mine: {} };
const PRE = { short: "Club Pre-Team", name: "Vortex Club Pre-Team", code: "PRE" };
const PRE_SKILLS = ["Swims 50m freestyle with bilateral breathing, no stops", "Swims 25m backstroke, breaststroke and butterfly with legal technique", "Starts from the side or block with a streamlined entry", "Performs freestyle tumble turns and legal open turns", "Follows a simple training set and reads the pace clock"];
const lvl = n => n === 0 ? PRE : LEVELS[n - 1] || { short: "–", name: "" };
const nextOf = n => n === 9 ? null : n === 5 ? 0 : (LEVELS[n - 1] || {}).nextId || null;
const fmtD = s => { const d = new Date(s); return `${d.getDate()} ${X().MON[d.getMonth()]} ${d.getFullYear()}`; };
const fmtDT = s => { const d = new Date(s); return `${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][d.getDay()]} ${d.getDate()} ${X().MON[d.getMonth()]}, ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}`; };
const uid = () => "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/* ---------- report submissions ---------- */
async function loadSubs(week, force){
  const V = X(); if (!force && (T.subs[week] || T.subsLoading[week])) return; T.subsLoading[week] = true;
  const { data } = await V.sb.from("acad_submissions").select("*").eq("week", week);
  T.subs[week] = {}; (data || []).forEach(r => { T.subs[week][r.coach_id] = r; }); T.subsLoading[week] = false; V.render();
}
function coachCounts(cid){
  const V = X(), ks = Object.values(V.S.kids).filter(k => k.cid === cid && k.active !== false);
  const done = ks.filter(k => { const r = V.S.reports[`${k.cid}/${V.S.week}__${k.id}`]; return r && (r.done || r.reviewedAt); });
  return { ks, done };
}
function after(){
  const V = X(); if (!V.S.ready) return;
  loadSubs(V.S.week);
  const tools = document.getElementById("addBtn") && document.getElementById("addBtn").parentNode;
  if (!tools) return;
  let b = document.getElementById("subBtn");
  if (V.mgmt() || !V.S.me.coachId) { if (b) b.remove(); return; }
  if (!b) { b = document.createElement("button"); b.id = "subBtn"; b.className = "btn dark"; tools.insertBefore(b, tools.firstChild); b.onclick = submitSheet; }
  const s = (T.subs[V.S.week] || {})[V.S.me.coachId];
  b.innerHTML = s ? `✓ Submitted ${fmtDT(s.submitted_at)}` : "Submit week's reports";
}
function submitSheet(){
  const V = X(), esc = V.esc, cid = V.S.me.coachId, { ks, done } = coachCounts(cid), s = (T.subs[V.S.week] || {})[cid];
  const left = ks.filter(k => !done.includes(k)).sort((a, b) => a.name.localeCompare(b.name));
  V.openSheet(`${V.head("Submit reports to management", `${V.coachName(cid)} · week of ${V.weekLabel(V.S.week)}`)}<div class="sh-body">
    <div class="kpis" style="grid-template-columns:repeat(2,1fr);margin:0"><div class="kpi"><b>${done.length}/${ks.length}</b><span>Reports marked done</span></div><div class="kpi"><b>${s ? "✓" : "–"}</b><span>${s ? "Submitted " + esc(fmtDT(s.submitted_at)) : "Not submitted yet"}</span></div></div>
    ${left.length ? `<div class="box" style="--c:#f0b400"><h3>Not done yet <small>${left.length}</small></h3>${left.slice(0, 40).map(k => `<p class="note" style="margin:2px 0">${esc(k.name)} · ${esc(lvl(k.level).short)}</p>`).join("")}${left.length > 40 ? `<p class="note">…and ${left.length - 40} more</p>` : ""}</div>` : `<div class="box" style="--c:var(--mint)"><h3>All reports are done</h3><p class="note" style="margin:0">Great work – management will be notified in the app.</p></div>`}
    <div class="box"><h3>Note for management <small>optional</small></h3><textarea class="inp" id="sbNote" rows="3" placeholder="e.g. Two swimmers absent all week">${esc(s ? s.note || "" : "")}</textarea></div>
  </div><div class="sh-foot"><span class="note" style="margin:0">${left.length ? "You can still submit – unfinished reports will show as missing." : ""}</span><span class="sp"></span><button class="btn primary" id="sbGo">${s ? "Submit again" : "Submit to management"}</button></div>`, true);
  document.getElementById("sbGo").onclick = async ev => {
    const b = ev.currentTarget; b.disabled = true; b.textContent = "Submitting…";
    const row = { id: `${cid}|${V.S.week}`, coach_id: cid, week: V.S.week, submitted_at: new Date().toISOString(), submitted_by: V.S.me.id, done_count: done.length, total_count: ks.length, note: document.getElementById("sbNote").value.trim() || null, reviewed_at: null, reviewed_by: null };
    const { error } = await V.sb.from("acad_submissions").upsert(row);
    if (error) { b.disabled = false; b.textContent = "Submit to management"; return V.toast("Not submitted – " + error.message); }
    (T.subs[V.S.week] = T.subs[V.S.week] || {})[cid] = row; V.closeSheet(); V.render(); V.toast("Submitted to management ✓");
  };
}

/* ---------- level-up form ---------- */
async function form(key, luId){
  const V = X(), esc = V.esc, kid = V.S.kids[key]; if (!kid) return;
  if (!luId && nextOf(kid.level) === null) return V.toast("Private training has no level-up – the coach advises the right level");
  const [ex, rep] = await Promise.all([
    luId ? V.sb.from("acad_levelups").select("*").eq("id", luId).maybeSingle() : V.sb.from("acad_levelups").select("*").eq("swimmer_id", kid.id).eq("status", "pending").maybeSingle(),
    V.sb.from("acad_reports").select("week,data").eq("swimmer_id", kid.id).order("week", { ascending: false }).limit(1) ]);
  const lu = ex.data, from = lu ? lu.from_level : kid.level, to = lu ? lu.to_level : nextOf(kid.level);
  const L = lvl(from), N = lvl(to), mg = V.mgmt();
  V.openSheet(`${V.head(`Level-up form · ${kid.name}`, `${L.short} ${L.name} → ${N.short}${to ? " " + N.name : ""}`, from)}<div class="sh-body" id="luBody"></div>`);
  const d = lu ? lu.data || {} : {}, last = (rep.data || [])[0], ld = last ? last.data || {} : {};
  const assess = d.assess || L.assess.map((_, i) => (ld.assess || [])[i] === 2 ? 2 : (ld.assess || [])[i] === 1 ? 1 : 0);
  const pre = d.pre || PRE_SKILLS.map(() => 0);
  const done = lu && lu.status !== "pending", ro = done;
  const yn = (name, i, v) => `<div class="yn" role="group"><button data-${name}="${i}" data-v="1" aria-pressed="${v === 1}" ${ro ? "disabled" : ""}>Not yet</button><button data-${name}="${i}" data-v="2" aria-pressed="${v === 2}" ${ro ? "disabled" : ""}>Achieved</button></div>`;
  const body = document.getElementById("luBody"); if (!body) return;
  body.innerHTML = `
    ${done ? `<div class="box" style="--c:${lu.status === "approved" ? "var(--mint)" : "#b4231f"}"><h3>${lu.status === "approved" ? "Approved" : "Declined"} · ${esc(fmtD(lu.decided_at || lu.created_at))}</h3>${lu.status === "approved" ? `<button class="btn primary" id="luCert">Download certificate</button>` : ""}</div>` : lu ? `<div class="box" style="--c:#f0b400"><h3>Waiting for management approval</h3><p class="note" style="margin:0">Sent ${esc(fmtDT(lu.created_at))}</p></div>` : ""}
    <div class="box"><h3>Swimmer</h3>
      <div class="as"><span class="note" style="flex:0 0 120px;margin:0">Name</span><b>${esc(kid.name)}</b></div>
      <div class="as"><span class="note" style="flex:0 0 120px;margin:0">Age</span><span>${esc(V.ageOf(kid))}</span></div>
      <div class="as"><span class="note" style="flex:0 0 120px;margin:0">Coach</span><span>${esc(V.coachName(kid.cid))}</span></div>
      <div class="as"><span class="note" style="flex:0 0 120px;margin:0">Moving</span><span><b>${esc(L.short)} · ${esc(L.name)}</b> → <b>${esc(N.short)}${to ? " · " + esc(N.name) : ""}</b></span></div></div>
    <div class="box" style="--c:var(--purple)"><h3>${esc(L.short)} assessment to pass</h3>${L.assess.map((a, i) => `<div class="as"><span>${esc(a)}</span>${yn("la", i, assess[i])}</div>`).join("")}
      <p class="note">Filled in from the latest weekly report – change anything that's different on assessment day.</p></div>
    ${to === 0 ? `<div class="box" style="--c:var(--royal)"><h3>Club Pre-Team readiness</h3>${PRE_SKILLS.map((a, i) => `<div class="as"><span>${esc(a)}</span>${yn("pr", i, pre[i])}</div>`).join("")}</div>` : ""}
    <div class="box" style="--c:var(--sky)"><h3>Coach's recommendation</h3>
      <div class="grid4"><label class="f">Assessment date<input class="inp" type="date" id="luDate" value="${esc(d.date || V.iso(new Date()))}" ${ro ? "disabled" : ""}></label>
      <label class="f">Recommendation<select class="inp" id="luRec" ${ro ? "disabled" : ""}><option value="ready" ${d.rec !== "more" ? "selected" : ""}>Ready to move up</option><option value="more" ${d.rec === "more" ? "selected" : ""}>Needs a little more time</option></select></label></div>
      <label class="f" style="margin-top:10px">Notes<textarea class="inp" id="luNotes" rows="3" ${ro ? "disabled" : ""} placeholder="Strengths, what to keep practising">${esc(d.notes || "")}</textarea></label>
      ${d.mgNote ? `<p class="note"><b>Management:</b> ${esc(d.mgNote)}</p>` : ""}</div>
    ${mg && !done ? `<div class="box" style="--c:var(--mint)"><h3>Management decision</h3><label class="f">Note to the coach <small>optional</small><input class="inp" id="luMg" value=""></label></div>` : ""}
  `;
  const sheet = document.querySelector("#layer .sheet");
  if (!done) {
    const foot = document.createElement("div"); foot.className = "sh-foot";
    foot.innerHTML = `<span class="sp"></span>${mg && lu ? `<button class="btn" id="luNo">Decline</button>` : ""}<button class="btn ${mg ? "" : "primary"}" id="luSend">${lu ? "Update form" : "Send for approval"}</button>${mg ? `<button class="btn primary" id="luYes">Approve & move up</button>` : ""}`;
    sheet.appendChild(foot);
  }
  body.addEventListener("click", e => { const b = e.target.closest("button[data-la],button[data-pr]"); if (!b || ro) return;
    const arr = b.dataset.la != null ? assess : pre, i = +(b.dataset.la ?? b.dataset.pr), v = +b.dataset.v; arr[i] = arr[i] === v ? 0 : v;
    b.parentNode.querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", +x.dataset.v === arr[i])); });
  const collect = () => ({ assess, pre: to === 0 ? pre : undefined, date: document.getElementById("luDate").value, rec: document.getElementById("luRec").value, notes: document.getElementById("luNotes").value.trim(),
    mgNote: (document.getElementById("luMg") || {}).value || d.mgNote || "", coach: V.coachName(kid.cid) });
  const save = async status => {
    const row = { id: lu ? lu.id : uid(), swimmer_id: kid.id, coach_id: kid.cid, from_level: from, to_level: to, data: collect(), status: "pending" };
    const { error } = await V.sb.from("acad_levelups").upsert(row); if (error) throw error;
    if (status === "pending") return row;
    const upd = to === 0 ? { reg_status: "Moved To Pre-Team", active: false } : { level: to, last: null };
    const a = await V.sb.from("acad_swimmers").update({ ...upd, updated_at: new Date().toISOString() }).eq("id", kid.id); if (a.error) throw a.error;
    const b = await V.sb.from("acad_levelups").update({ status, decided_at: new Date().toISOString(), decided_by: V.S.me.id }).eq("id", row.id); if (b.error) throw b.error;
    return { ...row, status, decided_at: new Date().toISOString() };
  };
  const btn = id => document.getElementById(id);
  if (btn("luSend")) btn("luSend").onclick = async () => { try { await save("pending"); T.lu = null; V.closeSheet(); V.toast(mg ? "Saved" : "Sent to management for approval ✓"); V.render(); } catch (e) { V.toast("Not saved – " + e.message); } };
  if (btn("luYes")) btn("luYes").onclick = async () => {
    if (!confirm(`Approve and move ${kid.name} to ${N.short}${to ? " · " + N.name : ""}?`)) return;
    try { const row = await save("approved"); T.lu = null; await V.loadBase(); V.render(); V.closeSheet(); V.toast(`${kid.name} moved up 🎉`); cert({ ...row, decided_at: row.decided_at }, kid); }
    catch (e) { V.toast("Not saved – " + e.message); } };
  if (btn("luNo")) btn("luNo").onclick = async () => {
    const r1 = await V.sb.from("acad_levelups").update({ status: "declined", decided_at: new Date().toISOString(), decided_by: V.S.me.id, data: collect() }).eq("id", lu.id);
    if (r1.error) return V.toast("Not saved – " + r1.error.message); T.lu = null; V.closeSheet(); V.toast("Declined – the coach can see your note"); V.render(); };
  if (btn("luCert")) btn("luCert").onclick = () => cert(lu, kid);
}

/* ---------- certificate ---------- */
async function cert(lu, kidIn){
  const V = X(); const kid = kidIn || Object.values(V.S.kids).find(k => k.id === lu.swimmer_id) || { name: lu.name || "Swimmer", cid: lu.coach_id };
  const ok = await ensureFonts(); const JsPDF = window.jspdf && window.jspdf.jsPDF; if (!JsPDF) return V.toast("The PDF tool didn't load – reload the page");
  const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape" }), W = 841.89, H = 595.28;
  let F = "helvetica"; if (ok) { doc.addFileToVFS("Poppins-Regular.ttf", ASSETS.fontR); doc.addFont("Poppins-Regular.ttf", "Poppins", "normal"); doc.addFileToVFS("Poppins-Bold.ttf", ASSETS.fontB); doc.addFont("Poppins-Bold.ttf", "Poppins", "bold"); F = "Poppins"; }
  const font = (w, s, c) => { doc.setFont(F, w); doc.setFontSize(s); doc.setTextColor(c); };
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), mix = (a, b, r) => a.map((v, i) => Math.round(v + (b[i] - v) * r));
  const grad = (x, y, w, h) => { const st = ["#1B22E4", "#067EEA", "#1DFEBF", "#8F23D7"].map(hex), k = 120; for (let i = 0; i < k; i++) { const f = i / (k - 1) * 3, j = Math.min(Math.floor(f), 2); doc.setFillColor(...mix(st[j], st[j + 1], f - j)); doc.rect(x + w * i / k, y, w / k + 0.6, h, "F"); } };
  const from = lvl(lu.from_level), to = lvl(lu.to_level), pre = lu.to_level === 0, d = lu.data || {};
  doc.setFillColor("#FFFFFF"); doc.rect(0, 0, W, H, "F");
  doc.setFillColor("#1B2955"); doc.rect(0, 0, W, H, "F"); doc.setFillColor("#FFFFFF"); doc.roundedRect(18, 18, W - 36, H - 36, 18, 18, "F");
  grad(18, 18, W - 36, 7); grad(18, H - 25, W - 36, 7);
  doc.setDrawColor("#D5DAE6"); doc.setLineWidth(1); doc.roundedRect(34, 40, W - 68, H - 80, 12, 12, "S");
  doc.setGState(new doc.GState({ opacity: 0.07 })); doc.setFillColor("#067EEA"); doc.circle(110, H - 110, 70, "F"); doc.setFillColor("#8F23D7"); doc.circle(W - 110, 110, 70, "F"); doc.setGState(new doc.GState({ opacity: 1 }));
  try { doc.addImage("data:image/png;base64," + ASSETS.logo, "PNG", W / 2 - 30, 52, 60, 60); } catch (e) {}
  font("bold", 9, "#067EEA"); doc.text("VORTEX SWIMMING ACADEMY", W / 2, 128, { align: "center", charSpace: 1.5 });
  font("bold", 34, "#1B2955"); doc.text(pre ? "Certificate of Graduation" : "Certificate of Achievement", W / 2, 170, { align: "center" });
  font("bold", 17, "#8F23D7"); doc.text("Congratulations!", W / 2, 198, { align: "center" });
  font("normal", 11, "#6B7280"); doc.text("This certificate is proudly presented to", W / 2, 228, { align: "center" });
  let ns = 40; font("bold", ns, "#1B22E4"); while (doc.getTextWidth(kid.name) > W - 300 && ns > 22) { ns -= 2; doc.setFontSize(ns); } doc.text(kid.name, W / 2, 275, { align: "center" });
  grad(W / 2 - 150, 287, 300, 3);
  font("normal", 13, "#1A1F36");
  const l1 = `for successfully completing ${from.short} · ${from.name}`, l2 = pre ? "and graduating from Learn to Swim to the Vortex Club Pre-Team" : `and moving up to ${to.short} · ${to.name}`;
  doc.text(l1, W / 2, 318, { align: "center" }); font("bold", 13, "#1B2955"); doc.text(l2, W / 2, 338, { align: "center" });
  const img = n => { try { return "data:image/jpeg;base64," + ASSETS["thumb" + n]; } catch (e) { return null; } };
  const badge = (x, n, label, sub) => { doc.setFillColor("#1B2955"); doc.roundedRect(x - 46, 362, 92, 92, 16, 16, "F");
    if (n) { const s = img(n); if (s) doc.addImage(s, "JPEG", x - 42, 366, 84, 84); } else { try { doc.addImage("data:image/png;base64," + ASSETS.logo, "PNG", x - 34, 374, 68, 68); } catch (e) {} }
    font("bold", 9.5, "#1B2955"); doc.text(label, x, 470, { align: "center" }); font("normal", 8, "#6B7280"); doc.text(sub, x, 482, { align: "center" }); };
  badge(W / 2 - 110, lu.from_level, from.short, from.name); badge(W / 2 + 110, pre ? 0 : lu.to_level, to.short, pre ? "Vortex Aquatics" : to.name);
  doc.setDrawColor("#067EEA"); doc.setLineWidth(2); doc.line(W / 2 - 46, 408, W / 2 + 40, 408); doc.setFillColor("#067EEA"); doc.triangle(W / 2 + 46, 408, W / 2 + 36, 402, W / 2 + 36, 414, "F");
  const dateS = d.date ? fmtD(d.date + "T12:00:00") : fmtD(lu.decided_at || lu.created_at);
  const sig = (x, label, val) => { doc.setDrawColor("#1A1F36"); doc.setLineWidth(0.7); doc.line(x - 85, 520, x + 85, 520); font("normal", 11, "#1A1F36"); if (val) doc.text(val, x, 514, { align: "center" }); font("normal", 8, "#6B7280"); doc.text(label, x, 532, { align: "center" }); };
  sig(150, "Date", dateS); sig(W - 150, "Coach", d.coach || V.coachName(kid.cid)); sig(W / 2, "Aquatic Manager", "Ahmed Aly");
  font("normal", 7.5, "#6B7280"); doc.text("Hamad Aquatic Center · Aspire Zone, Doha, Qatar", W / 2, H - 46, { align: "center" });
  doc.setProperties({ title: `Certificate – ${kid.name}`, author: "Vortex Swimming Academy" });
  V.deliver(`Certificate – ${kid.name} – ${to.short}.pdf`, doc.output("blob"));
}

/* ---------- tracking view (management) ---------- */
async function loadLU(){ const V = X(); if (T.lu || T.luLoading) return; T.luLoading = true;
  const { data } = await V.sb.from("acad_levelups").select("*").order("created_at", { ascending: false }).limit(500); T.lu = data || []; T.luLoading = false; V.render(); }
function render(){
  const V = X(), el = document.getElementById("vTrack"); if (!el) return; if (!V.mgmt()) { el.innerHTML = ""; return; }
  const esc = V.esc; loadSubs(V.S.week); loadLU();
  const pend = (T.lu || []).filter(x => x.status === "pending");
  let html = `<div class="bar"><div><h1>Tracking</h1><div class="sub">Who submitted this week's reports, and level-up forms waiting for approval</div></div></div>
    <div class="bar"><div class="seg" role="group"><button data-tt="subs" aria-pressed="${T.tab === "subs"}">Report submissions</button><button data-tt="lu" aria-pressed="${T.tab === "lu"}">Level-ups${pend.length ? ` (${pend.length} waiting)` : ""}</button></div></div>`;
  if (T.tab === "subs") {
    const subs = T.subs[V.S.week]; const ids = V.visibleCoachIds().filter(id => coachCounts(id).ks.length).sort((a, b) => V.coachName(a).localeCompare(V.coachName(b)));
    if (!subs) html += `<div class="list"><div class="empty">Loading…</div></div>`;
    else { const n = ids.filter(id => subs[id]).length;
      html += `<div class="kpis"><div class="kpi"><b>${n}/${ids.length}</b><span>Coaches submitted</span></div><div class="kpi"><b>${ids.reduce((a, id) => a + coachCounts(id).done.length, 0)}</b><span>Reports done</span></div>
        <div class="kpi"><b>${ids.reduce((a, id) => a + coachCounts(id).ks.length, 0)}</b><span>Swimmers</span></div><div class="kpi"><b>${ids.filter(id => subs[id] && subs[id].reviewed_at).length}</b><span>Submissions reviewed</span></div></div>
        <div class="ov"><table><thead><tr><th>Coach</th><th>Reports done</th><th>Submitted</th><th>Note</th><th>Reviewed</th><th></th></tr></thead><tbody>
        ${ids.map(id => { const s = subs[id], c = coachCounts(id); return `<tr><td><b>${esc(V.coachName(id))}</b></td><td><span class="c ${c.done.length === c.ks.length ? "f" : c.done.length ? "p" : "z"}">${c.done.length}/${c.ks.length}</span></td>
          <td>${s ? `<span class="pill done">✓ ${esc(fmtDT(s.submitted_at))}</span>` : `<span class="pill todo">Not yet</span>`}</td><td style="max-width:220px;text-align:left">${s && s.note ? esc(s.note) : ""}</td>
          <td>${s && s.reviewed_at ? `<span class="pill rev">✓ ${esc(fmtD(s.reviewed_at))}</span>` : ""}</td>
          <td style="white-space:nowrap"><button class="btn" data-open="${esc(id)}">Open</button> ${s && !s.reviewed_at ? `<button class="btn" data-rev="${esc(id)}">Mark reviewed</button>` : ""}</td></tr>`; }).join("")}
        </tbody></table></div><p class="note">Use the week arrows (or tap the week) at the top to see other weeks.</p>`; }
  } else {
    if (!T.lu) html += `<div class="list"><div class="empty">Loading…</div></div>`;
    else if (!T.lu.length) html += `<div class="list"><div class="empty"><b>No level-up forms yet</b>Coaches open one from a report (Ready to move up → Yes) or from a swimmer's profile.</div></div>`;
    else { const byId = {}; Object.values(V.S.kids).forEach(k => { byId[k.id] = k; });
      html += `<div class="ov"><table><thead><tr><th>Swimmer</th><th>Level-up</th><th>Coach</th><th>Recommendation</th><th>Sent</th><th>Status</th><th></th></tr></thead><tbody>
        ${T.lu.map(x => { const k = byId[x.swimmer_id], d = x.data || {}; return `<tr><td style="text-align:left"><b>${esc(k ? k.name : "Swimmer")}</b></td><td>${esc(lvl(x.from_level).short)} → ${esc(lvl(x.to_level).short)}</td><td>${esc(V.coachName(x.coach_id))}</td>
          <td>${d.rec === "more" ? "Needs more time" : "Ready"}</td><td>${x.created_at ? esc(fmtD(x.created_at)) : ""}</td>
          <td><span class="pill ${x.status === "approved" ? "done" : x.status === "declined" ? "todo" : "wip"}">${x.status === "approved" ? "Approved" : x.status === "declined" ? "Declined" : "Waiting"}</span></td>
          <td style="white-space:nowrap">${k ? `<button class="btn" data-lu="${esc(x.id)}" data-k="${esc(k.cid + "/" + k.id)}">${x.status === "pending" ? "Review" : "View"}</button>` : ""} ${x.status === "approved" ? `<button class="btn" data-cert="${esc(x.id)}">Certificate</button>` : ""}</td></tr>`; }).join("")}
        </tbody></table></div>`; }
  }
  el.innerHTML = html;
  el.querySelectorAll("[data-tt]").forEach(b => b.onclick = () => { T.tab = b.dataset.tt; if (T.tab === "lu") T.lu = null; V.render(); });
  el.querySelectorAll("[data-open]").forEach(b => b.onclick = () => { V.S.coachSel = b.dataset.open; V.S.view = "swimmers"; V.S.allLv = true; V.render(); window.scrollTo(0, 0); });
  el.querySelectorAll("[data-rev]").forEach(b => b.onclick = async () => { const s = T.subs[V.S.week][b.dataset.rev];
    const { error } = await V.sb.from("acad_submissions").update({ reviewed_at: new Date().toISOString(), reviewed_by: V.S.me.id }).eq("id", s.id);
    if (error) return V.toast(error.message); s.reviewed_at = new Date().toISOString(); V.render(); V.toast("Marked reviewed"); });
  el.querySelectorAll("[data-lu]").forEach(b => b.onclick = () => form(b.dataset.k, b.dataset.lu));
  el.querySelectorAll("[data-cert]").forEach(b => b.onclick = () => { const x = T.lu.find(y => y.id === b.dataset.cert); cert(x); });
}
window.VXT = { after, render, form, cert };
})();
