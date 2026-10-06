/* New swimmer registration (management). Places the swimmer with their coach, lane, days and times. Uses window.VX. */
(() => {
const X = () => window.VX;
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const STATUS = ["Confirmed","TBC","Complimentary","Second Session","Staff"];
const cap = lvl => lvl === 5 ? 8 : 4;
const short = n => String(n || "").replace(/^coach\s+/i, "").trim();
const tcase = s => String(s || "").trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s\-'\/])(\p{L})/gu, (a, b, c) => b + c.toUpperCase());
function slotCount(day, time, coach, skipId){
  const V = X(), t = V.timeVal(time), c = V.norm(coach); if (!time || !coach) return null;
  let n = 0, lv5 = true;
  Object.values(V.S.kids).forEach(k => { if (k.active === false || k.id === skipId) return;
    (k.sessions || []).forEach(x => { if (x.day === day && V.timeVal(x.time) === t && V.norm(x.coach || short(V.coachName(k.cid))).split(/[\/,&]+/).map(s => s.trim()).includes(c)) { n++; if (k.level !== 5) lv5 = false; } }); });
  return { n, lv5 };
}
async function open(kidId){
  const V = X(), esc = V.esc; if (!V.mgmt()) return V.toast("Only management can register swimmers");
  let row = {}, ct = {};
  if (kidId) {
    const [a, b] = await Promise.all([V.sb.from("acad_swimmers").select("*").eq("id", kidId).maybeSingle(), V.sb.from("acad_contacts").select("*").eq("swimmer_id", kidId).maybeSingle()]);
    if (a.error || !a.data) return V.toast("Couldn't load this swimmer"); row = a.data; ct = b.data || {};
  }
  const tr = V.S.term || {}, edit = !!kidId;
  const coaches = V.visibleCoachIds().map(id => short(V.coachName(id))).filter(n => n && !/^unassigned$/i.test(n)).sort();
  const times = {}; Object.values(V.S.kids).forEach(k => (k.sessions || []).forEach(x => { (times[x.day] = times[x.day] || new Set()).add(V.fmtTime(x.time)); }));
  const ses = {}; (row.sessions || []).forEach(x => { ses[x.day] = x; });
  const nm = row.first_name || row.family_name ? [row.first_name || "", row.family_name || ""] : (row.name ? [row.name.split(" ")[0], row.name.split(" ").slice(1).join(" ")] : ["", ""]);
  const opt = (list, v) => list.map(o => `<option ${String(o) === String(v) ? "selected" : ""}>${esc(o)}</option>`).join("");
  const phones = ct.phones || [];
  V.openSheet(`${V.head(edit ? "Edit registration" : "Register a new swimmer", edit ? row.name : (tr.name || "Academy"))}<div class="sh-body">
    <div class="box"><h3>Registration</h3><div class="grid4">
      <label class="f">Status<select class="inp" id="rgStatus">${opt(STATUS, row.reg_status || "Confirmed")}</select></label>
      <label class="f">New or existing<select class="inp" id="rgNew"><option value="1" ${row.is_new !== false ? "selected" : ""}>New</option><option value="0" ${row.is_new === false ? "selected" : ""}>Existing</option></select></label>
      <label class="f">Term<input class="inp" id="rgTerm" value="${esc(row.term || tr.name || "")}"></label>
      <label class="f">From which term<input class="inp" id="rgFrom" value="${esc(row.from_term || "")}" placeholder="e.g. Term 3 2026"></label>
      <label class="f">Start date<input class="inp" type="date" id="rgStart" value="${esc(row.start_date || V.iso(new Date()))}"></label>
      <label class="f">Payment<select class="inp" id="rgPaid"><option value="">Not set</option><option value="1" ${row.paid === true ? "selected" : ""}>Paid</option><option value="0" ${row.paid === false ? "selected" : ""}>Not paid</option></select></label>
    </div></div>
    <div class="box" style="--c:var(--purple)"><h3>Swimmer</h3><div class="grid4">
      <label class="f">First name *<input class="inp" id="rgFirst" value="${esc(nm[0])}" autofocus></label>
      <label class="f">Family name *<input class="inp" id="rgFamily" value="${esc(nm[1])}"></label>
      <label class="f">Date of birth *<input class="inp" type="date" id="rgDob" value="${esc(row.dob || "")}"></label>
      <label class="f">Gender<select class="inp" id="rgGender"><option value="">–</option>${opt(["M","F"], row.gender)}</select></label>
      <label class="f">Nationality<input class="inp" id="rgNat" value="${esc(row.nationality || "")}"></label>
      <label class="f">QID<input class="inp" id="rgQid" inputmode="numeric" value="${esc(ct.qid || "")}"></label>
      <label class="f">Sibling no.<input class="inp" id="rgSib" value="${esc(row.sibling || "")}" placeholder="1, 2…"></label>
      <label class="f">Kit<input class="inp" id="rgKit" value="${esc(row.kit || "")}"></label>
    </div><p class="note" id="rgAge"></p></div>
    <div class="box" style="--c:var(--sky)"><h3>Parent contact <small>management only</small></h3><div class="grid4">
      <label class="f">Contact 1 *<input class="inp" id="rgP1" inputmode="tel" value="${esc(phones[0] || "")}"></label>
      <label class="f">Contact 2<input class="inp" id="rgP2" inputmode="tel" value="${esc(phones[1] || "")}"></label>
      <label class="f">Email 1<input class="inp" id="rgE1" type="email" value="${esc(ct.email || "")}"></label>
      <label class="f">Email 2<input class="inp" id="rgE2" type="email" value="${esc(ct.email2 || "")}"></label>
    </div></div>
    <div class="box" style="--c:var(--royal)"><h3>Level</h3>
      <select class="inp" id="rgLevel">${LEVELS.map((L, i) => `<option value="${i + 1}" ${(row.level || 1) === i + 1 ? "selected" : ""}>${esc(L.short)} · ${esc(L.name)}</option>`).join("")}</select></div>
    <div class="box" style="--c:var(--mint)"><h3>Days, times, coach and lane <small>fill the days they swim</small></h3>
      ${WD.map(d => { const s = ses[d] || {}; return `<div class="as" style="flex-wrap:wrap"><b style="width:40px">${d}</b>
        <input class="inp" data-rt="${d}" list="rgT${d}" placeholder="Time e.g. 4:15 pm" value="${esc(s.time ? V.fmtTime(s.time) : "")}" style="width:140px">
        <datalist id="rgT${d}">${[...(times[d] || [])].sort((a, b) => V.timeVal(a) - V.timeVal(b)).map(t => `<option value="${esc(t)}">`).join("")}</datalist>
        <select class="inp" data-rc="${d}" style="width:150px"><option value="">Coach</option>${opt(coaches, short(s.coach))}</select>
        <input class="inp" data-rl="${d}" placeholder="Lane" value="${esc(s.lane || "")}" style="width:80px">
        <span class="note" data-rs="${d}" style="margin:0"></span></div>`; }).join("")}
    </div>
    <div class="box"><h3>Notes</h3><textarea class="inp" id="rgNotes" rows="3">${esc(row.notes || "")}</textarea></div>
  </div><div class="sh-foot"><span class="note" id="rgMsg" style="margin:0"></span><span class="sp"></span><button class="btn primary" id="rgSave">${edit ? "Save changes" : "Register swimmer"}</button></div>`);
  const sh = document.querySelector("#layer .sheet"), q = s => sh.querySelector(s);
  const upd = () => {
    const dob = q("#rgDob").value; q("#rgAge").textContent = dob ? `Age: ${V.ageOf({ dob })}` : "";
    const lvl = +q("#rgLevel").value;
    WD.forEach(d => { const t = q(`[data-rt="${d}"]`).value.trim(), c = q(`[data-rc="${d}"]`).value, el = q(`[data-rs="${d}"]`);
      const r = slotCount(d, t, c, kidId); if (!r) { el.textContent = ""; return; }
      const max = r.lv5 && lvl === 5 ? 8 : 4, n = r.n + 1;
      el.textContent = `${n}/${max} in this class${n > max ? " – over capacity" : ""}`; el.style.color = n > max ? "#b4231f" : n === max ? "#06704f" : ""; });
  };
  sh.addEventListener("input", upd); sh.addEventListener("change", upd); upd();
  q("#rgSave").onclick = async ev => {
    const b = ev.currentTarget, first = tcase(q("#rgFirst").value), family = tcase(q("#rgFamily").value), dob = q("#rgDob").value, p1 = q("#rgP1").value.trim();
    const msg = t => { q("#rgMsg").textContent = t; q("#rgMsg").style.color = "#b4231f"; };
    if (!first || !family) return msg("Add first and family name"); if (!dob) return msg("Add the date of birth"); if (!p1) return msg("Add at least one contact number");
    const sessions = WD.map(d => ({ day: d, time: q(`[data-rt="${d}"]`).value.trim(), coach: q(`[data-rc="${d}"]`).value, lane: q(`[data-rl="${d}"]`).value.trim() })).filter(s => s.time || s.coach);
    if (!sessions.length) return msg("Add at least one day with a time and coach");
    if (sessions.some(s => !s.time || !s.coach)) return msg("Each day needs both a time and a coach");
    if (sessions.some(s => V.timeVal(s.time) === 9999)) return msg("Write times like 4:15 pm");
    const name = `${first} ${family}`;
    if (!edit) { const dup = Object.values(V.S.kids).find(k => k.active !== false && V.norm(k.name) === V.norm(name) && (!k.dob || k.dob === dob)); if (dup) return msg(`${name} is already registered`); }
    const cnt = {}; sessions.forEach(s => { cnt[s.coach] = (cnt[s.coach] || 0) + 1; });
    const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    const cid = V.visibleCoachIds().find(id => V.norm(short(V.coachName(id))) === V.norm(main)) || (kidId && row.coach_id);
    if (!cid) return msg("Couldn't match the coach – check Admin settings → People & logins");
    b.disabled = true; b.textContent = "Saving…";
    const id = kidId || "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const pv = q("#rgPaid").value;
    const rec = { id, coach_id: cid, name, first_name: first, family_name: family, dob, level: +q("#rgLevel").value, sessions, active: true,
      term: q("#rgTerm").value.trim() || null, start_date: q("#rgStart").value || null, paid: pv === "" ? null : pv === "1",
      reg_status: q("#rgStatus").value, is_new: q("#rgNew").value === "1", gender: q("#rgGender").value || null, nationality: tcase(q("#rgNat").value) || null,
      sibling: q("#rgSib").value.trim() || null, kit: q("#rgKit").value.trim() || null, from_term: q("#rgFrom").value.trim() || null, notes: q("#rgNotes").value.trim() || null,
      updated_at: new Date().toISOString() };
    const a = await V.sb.from("acad_swimmers").upsert(rec);
    if (a.error) { b.disabled = false; b.textContent = edit ? "Save changes" : "Register swimmer"; return msg("Not saved – " + a.error.message); }
    const c = await V.sb.from("acad_contacts").upsert({ swimmer_id: id, phones: [p1, q("#rgP2").value.trim()].filter(Boolean), email: q("#rgE1").value.trim() || null, email2: q("#rgE2").value.trim() || null, qid: q("#rgQid").value.trim() || null });
    if (c.error) V.toast("Swimmer saved, but contacts weren't: " + c.error.message);
    await V.loadBase(); V.render(); V.closeSheet();
    V.toast(edit ? "Registration updated" : `${name} registered with Coach ${main}`);
  };
}
const btn = document.getElementById("regBtn"); if (btn) btn.onclick = () => open();
window.VXR = { open };
})();
