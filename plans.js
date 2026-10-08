/* Lesson plans: per coach, per level, per week – 2 or 3 lessons + 1 make-up. Each lesson: warm-up, main set, cool-down, last 5 min (games / dive / streamline). Uses window.VX. */
(() => {
const X = () => window.VX;
const SEC = [["warm", "Warm-up", "#067EEA", 5], ["main", "Main set", "#1B22E4", 25], ["cool", "Cool-down", "#0E9F7A", 5], ["finish", "Last 5 min", "#8F23D7", 5]];
const FIN = [["games", "Games"], ["dive", "Dive"], ["streamline", "Streamline"]];
const LIB = {
  warm: [["Easy kick on the wall", "Holding the edge, small fast kicks, face in and out", 3], ["Bubbles & bobs", "10 bubble breaths, then 5 bobs to the floor (shallow end)", 3], ["Noodle walk & kick", "Walk-and-kick 1 width with a noodle", 4], ["Easy swim of choice", "1–2 widths, focus on relaxed breathing", 4], ["Arm circles & sculling", "Standing: forward/back arm circles, then sculling hands", 3]],
  cool: [["Easy back float", "Starfish float 10–15 s, coach support if needed", 3], ["Gentle choice swim", "1 width easy, long and relaxed", 3], ["Stretch & breathe", "On the wall: slow bubbles and shoulder stretches", 2], ["Skill recap", "Each swimmer shows one thing they learned today", 3]],
  games: [["Treasure hunt", "Collect sinking toys – face in water, eyes open", 5], ["Red light, green light", "Kick on green, float on red", 5], ["Simon says", "Coach calls skills: float, bubbles, jump, streamline", 5], ["Relay race", "Kick-board relay across the width", 5], ["Shark & minnows", "Swim across without being tagged", 5]],
  dive: [["Sitting dive", "Sit on the edge, arms streamlined, roll in head first", 5], ["Kneeling dive", "One knee down, chin tucked, enter through the hands", 5], ["Crouch dive", "Feet at edge, fall forward into streamline", 5], ["Standing dive", "Full dive from the side, glide out in streamline", 5], ["Hoop dive", "Dive through a floating hoop", 5]],
  streamline: [["Push & glide", "Push off the wall, arms locked over the head, hold 3 s", 5], ["Streamline kick", "Glide + kick to the flags / 5 m", 5], ["Torpedo challenge", "Who glides furthest in a perfect streamline", 5], ["Back streamline", "Push off on the back, arms overhead, ears covered", 5], ["Streamline + breakout", "Glide, 3 kicks, first stroke breakout", 5]]
};
const EXTRA_MAIN = {
  1: [["Assisted front float", "Coach support at shoulders, face in for 3 s", 5], ["Blow bubbles with kick", "Board or noodle, bubbles every 2 kicks", 6]],
  2: [["Push & glide to coach", "3 m glide, straight body", 6], ["Back float alone", "5 s, ears in, tummy up", 5]],
  3: [["Superman kick with board", "Face in, bubbles, 6 m", 8], ["Catch-up freestyle", "One arm at a time, breathe to the side", 8]],
  4: [["Freestyle 12.5 m", "Breathing every 3, long strokes", 8], ["Backstroke arms", "Straight arm recovery, little finger first", 8]],
  5: [["Freestyle 25 m with turn", "Bilateral breathing, tumble or open turn", 10], ["Breaststroke timing", "Pull–breathe–kick–glide", 8], ["Dolphin kick off the wall", "3 kicks in streamline", 6]],
  6: [["Supported back float", "Parent supports head, eye contact, songs", 5], ["Ready-go water pour", "Cue, then pour water over the head", 4]],
  7: [["Monkey walk", "Hands along the wall to the corner", 5], ["Kick on the front", "Parent supports under the arms", 6]],
  8: [["Front glide to parent", "1 m glide, face in", 6], ["Jump & turn to wall", "Jump in, turn, reach the wall", 6]],
  9: [["Technique focus", "Coach chooses the stroke focus for this swimmer", 10], ["Pace & endurance", "Repeat distances with rest", 10]]
};
const P = { level: 0, coach: "", plan: null, row: null, key: "", loading: false, timer: null, custom: null, overview: {}, ovKey: "" };
const st = document.createElement("style");
st.textContent = `.lp-l{background:var(--surface);border-radius:16px;box-shadow:var(--shadow);overflow:hidden;margin-bottom:14px}
.lp-lh{display:flex;flex-wrap:wrap;gap:8px;align-items:center;padding:12px 16px;background:linear-gradient(120deg,#1B2955 55%,#1B22E4 140%);color:#fff;position:relative}
.lp-lh::after{content:"";position:absolute;left:0;right:0;bottom:0;height:3px;background:linear-gradient(90deg,#1B22E4,#067EEA,#1DFEBF,#8F23D7)}
.lp-lh b{font-size:16px}.lp-lh input{background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.2);color:#fff;border-radius:9px;padding:6px 10px;font-size:13px;flex:1;min-width:160px}
.lp-lh input::placeholder{color:#B9C2E0}.lp-min{margin-left:auto;font-size:12px;font-weight:700;border-radius:8px;padding:3px 9px;background:rgba(255,255,255,.14)}.lp-min.ok{background:#1DFEBF;color:#1B2955}.lp-min.over{background:#f4c7c3;color:#8a1c14}
.lp-s{padding:10px 14px;border-top:1px solid var(--line)}.lp-s:first-of-type{border-top:0}
.lp-sh{display:flex;align-items:center;gap:8px;margin-bottom:6px}.lp-sh b{font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--c)}.lp-sh b::before{content:"";display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--c);margin-right:7px;vertical-align:1px}
.lp-sh .note{margin:0 0 0 auto}.lp-d{display:flex;gap:8px;align-items:flex-start;padding:7px 8px;border-radius:10px;background:var(--surface-2);margin-bottom:6px}
.lp-d .t{flex:1;min-width:0}.lp-d .t input{width:100%;border:0;background:transparent;font:inherit;color:var(--ink);padding:0}.lp-d .t input.n{font-weight:600;font-size:14px}.lp-d .t input.dt{font-size:12.5px;color:var(--muted);margin-top:2px}
.lp-d .m{width:54px;text-align:center;border:1px solid var(--line);border-radius:8px;background:var(--surface);padding:4px;font-size:12.5px}.lp-d button{border:0;background:none;color:var(--muted);font-size:15px;padding:2px 5px;border-radius:6px}.lp-d button:hover{background:var(--chip)}
.lp-add{display:flex;gap:6px;flex-wrap:wrap}.lp-add .btn{padding:6px 10px;font-size:12.5px}
.lp-fin{display:flex;gap:6px;margin-bottom:8px}.lp-fin button{border:1.5px solid var(--line);background:var(--surface-2);border-radius:20px;padding:5px 12px;font-size:12.5px;font-weight:600;color:var(--muted)}.lp-fin button[aria-pressed=true]{background:#8F23D7;border-color:#8F23D7;color:#fff}
.lp-st{display:inline-block;font-size:12px;font-weight:700;border-radius:20px;padding:3px 10px}.lp-st.draft{background:#fff1d6;color:#8a5a00}.lp-st.submitted{background:#e3e6ff;color:#1b22e4}.lp-st.reviewed{background:#d8fff2;color:#06704f}.lp-st.none{background:var(--chip);color:var(--muted)}
.lp-pick{width:100%;text-align:left;justify-content:flex-start;margin-bottom:6px;flex-direction:column;align-items:flex-start;gap:2px}.lp-pick span{font-size:12px;color:var(--muted);font-weight:400}`;
document.head.appendChild(st);

const blankLesson = (n, lvl) => ({ title: n, focus: "", warm: [], main: [], cool: [], finish: { kinds: ["games"], items: [] } });
const blankPlan = lvl => ({ count: 2, lessons: [blankLesson("Lesson 1", lvl), blankLesson("Lesson 2", lvl), blankLesson("Lesson 3", lvl)], makeup: blankLesson("Make-up lesson", lvl), notes: "" });
const lessonsOf = p => p.lessons.slice(0, p.count).concat([p.makeup]);
const mins = l => ["warm", "main", "cool"].reduce((a, k) => a + l[k].reduce((s, d) => s + (+d.min || 0), 0), 0) + l.finish.items.reduce((s, d) => s + (+d.min || 0), 0);
function coachLevels(cid){ const V = X(), s = new Set(); Object.values(V.S.kids).forEach(k => { if (k.active !== false && k.cid === cid) s.add(k.level); }); return [...s].sort((a, b) => a - b); }
function curCoach(){ const V = X(); return V.mgmt() ? (V.S.coachSel !== "all" ? V.S.coachSel : "") : V.S.me.coachId; }
async function loadCustom(){ const V = X(); if (P.custom) return; P.custom = []; const { data } = await V.sb.from("acad_drills").select("*").order("created_at", { ascending: false }).limit(1000); P.custom = data || []; }
async function loadPlan(){
  const V = X(), key = `${P.coach}|${V.S.week}|${P.level}`; if (P.key === key || P.loading) return; P.loading = true; P.key = key; P.plan = null;
  const { data } = await V.sb.from("acad_lesson_plans").select("*").eq("id", key).maybeSingle();
  if (P.key !== key) { P.loading = false; return; }
  P.row = data || null; P.plan = data && data.data && data.data.lessons ? data.data : blankPlan(P.level); P.loading = false; V.render();
}
async function loadOverview(){
  const V = X(), wk = V.S.week; if (P.ovKey === wk) return; P.ovKey = wk; P.overview = null;
  const { data } = await V.sb.from("acad_lesson_plans").select("id,coach_id,level,status,submitted_at,reviewed_at").eq("week", wk);
  if (P.ovKey !== wk) return; P.overview = {}; (data || []).forEach(r => { P.overview[`${r.coach_id}|${r.level}`] = r; }); V.render();
}
function save(status){
  const V = X(); clearTimeout(P.timer);
  const go = async () => { if (!P.plan) return;
    const row = { id: P.key, coach_id: P.coach, week: V.S.week, level: P.level, data: P.plan, updated_at: new Date().toISOString(), updated_by: V.S.me.id };
    if (status) { row.status = status; if (status === "submitted") { row.submitted_at = new Date().toISOString(); row.reviewed_at = null; row.review_note = null; } }
    else if (!P.row) row.status = "draft";
    const { data, error } = await V.sb.from("acad_lesson_plans").upsert(row).select().single();
    if (error) return V.toast("Not saved – " + error.message);
    P.row = data; P.ovKey = ""; const s = document.getElementById("lpSaved"); if (s) s.textContent = "Saved ✓";
    if (status) { V.toast(status === "submitted" ? "Lesson plan submitted to management ✓" : "Saved"); V.render(); } };
  if (status) return go(); P.timer = setTimeout(go, 900); const s = document.getElementById("lpSaved"); if (s) s.textContent = "Saving…";
}

function render(){
  const V = X(), el = document.getElementById("vPlans"); if (!el) return;
  const esc = V.esc, mg = V.mgmt(); P.coach = curCoach();
  const head = `<div class="bar"><div><h1>Lesson plans</h1><div class="sub">Week of ${esc(V.weekLabel(V.S.week))} · 40-min lessons: warm-up, main set, cool-down and the last 5 minutes (games, dive or streamline) · 2–3 lessons + 1 make-up per level</div></div>
    ${mg ? "" : `<div class="tools"><button class="btn" id="lpBack">‹ Back to swimmers</button></div>`}</div>`;
  if (mg && !P.coach) { loadOverview();
    const ids = V.visibleCoachIds().filter(id => coachLevels(id).length).sort((a, b) => V.coachName(a).localeCompare(V.coachName(b)));
    el.innerHTML = head + `<p class="note" style="margin:0 0 10px">Choose a coach in the coach list (or tap a row) to open and review their plans.</p>` + (!P.overview ? `<div class="list"><div class="empty">Loading…</div></div>` :
      `<div class="ov"><table><thead><tr><th>Coach</th><th>Levels this week</th><th>Submitted</th></tr></thead><tbody>${ids.map(id => { const lv = coachLevels(id), done = lv.filter(n => P.overview[`${id}|${n}`] && P.overview[`${id}|${n}`].status !== "draft").length;
        return `<tr class="click" data-lpc="${esc(id)}"><td><b>${esc(V.coachName(id))}</b></td><td style="text-align:left">${lv.map(n => { const r = P.overview[`${id}|${n}`], s = r ? r.status : "none"; return `<span class="lp-st ${s}" style="margin:2px">${esc((LEVELS[n - 1] || {}).short || "")} · ${s === "none" ? "not started" : s}</span>`; }).join(" ")}</td>
        <td><span class="c ${done === lv.length ? "f" : done ? "p" : "z"}">${done}/${lv.length}</span></td></tr>`; }).join("")}</tbody></table></div>`);
    el.querySelectorAll("[data-lpc]").forEach(r => r.onclick = () => { V.S.coachSel = r.dataset.lpc; V.render(); });
    return; }
  if (!P.coach) { el.innerHTML = head + `<div class="list"><div class="empty">Your login isn't linked to a coach yet – ask an academy admin.</div></div>`; return; }
  const lv = coachLevels(P.coach); const all = LEVELS.map((_, i) => i + 1);
  if (!P.level || !all.includes(P.level)) P.level = lv[0] || 1;
  loadPlan(); loadCustom();
  const r = P.row, stt = r ? r.status : "none";
  el.innerHTML = head + `<div class="bar filters"><div class="seg" role="group" aria-label="Level" style="flex-wrap:wrap">${(lv.length ? lv : all).map(n => `<button data-lpl="${n}" aria-pressed="${n === P.level}">${esc((LEVELS[n - 1] || {}).short)}</button>`).join("")}</div>
      ${mg ? `<span class="note" style="margin:0">Coach: <b>${esc(V.coachName(P.coach))}</b></span>` : ""}</div>` +
    (!P.plan ? `<div class="list"><div class="empty">Loading…</div></div>` : editor(esc, stt, r));
  wire(el);
}
function drillRow(sec, li, i, d, ro){
  const esc = X().esc;
  return `<div class="lp-d"><div class="t"><input class="n" data-f="name" data-s="${sec}" data-l="${li}" data-i="${i}" value="${esc(d.name)}" ${ro}><input class="dt" data-f="detail" data-s="${sec}" data-l="${li}" data-i="${i}" value="${esc(d.detail || "")}" placeholder="Details – reps, distance, equipment" ${ro}></div>
    <input class="m" inputmode="numeric" data-f="min" data-s="${sec}" data-l="${li}" data-i="${i}" value="${esc(d.min ?? "")}" title="Minutes" ${ro}>${ro ? "" : `<button data-up="${sec}|${li}|${i}" title="Move up">↑</button><button data-del="${sec}|${li}|${i}" title="Remove">✕</button>`}</div>`;
}
function editor(esc, stt, r){
  const V = X(), L = LEVELS[P.level - 1] || {}, p = P.plan, mg = V.mgmt(), ro = !mg && stt === "reviewed" ? "disabled" : "";
  const lessons = lessonsOf(p);
  return `<div class="box" style="--c:var(--royal)"><h3>${esc(L.short)} · ${esc(L.name)} <small><span class="lp-st ${stt}">${stt === "none" ? "Not started" : stt === "draft" ? "Draft" : stt === "submitted" ? "Submitted" : "Reviewed"}</span></small></h3>
      <p class="note" style="margin:0 0 8px">Level goal: ${esc(L.goal || "")}. Skills to level up: ${esc((L.assess || []).join(" · "))}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="note" style="margin:0">Lessons this week</span>
      <div class="seg" role="group"><button data-cnt="2" aria-pressed="${p.count === 2}" ${ro}>2 lessons</button><button data-cnt="3" aria-pressed="${p.count === 3}" ${ro}>3 lessons</button></div><span class="note" style="margin:0">+ 1 make-up lesson</span>
      ${ro ? "" : `<button class="btn" id="lpCopy" style="margin-left:auto">Copy last week's plan</button>`}</div>
      ${r && r.review_note ? `<p class="note"><b>Management:</b> ${esc(r.review_note)}</p>` : ""}</div>
    ${lessons.map((l, li) => { const m = mins(l), idx = li === lessons.length - 1 ? "m" : li;
      return `<div class="lp-l"><div class="lp-lh"><b>${esc(l.title)}</b><input data-lf="focus" data-l="${idx}" value="${esc(l.focus || "")}" placeholder="Lesson focus, e.g. streamline & kick" ${ro}><span class="lp-min ${m === 40 ? "ok" : m > 40 ? "over" : ""}">${m}/40 min</span></div>
        ${SEC.map(([k, name, col, sug]) => { const items = k === "finish" ? l.finish.items : l[k];
          return `<div class="lp-s" style="--c:${col}"><div class="lp-sh"><b>${name}</b><span class="note">${items.reduce((s, d) => s + (+d.min || 0), 0)} min · suggested ${sug}</span></div>
            ${k === "finish" ? `<div class="lp-fin">${FIN.map(([f, fl]) => `<button data-fin="${idx}|${f}" aria-pressed="${l.finish.kinds.includes(f)}" ${ro}>${fl}</button>`).join("")}</div>` : ""}
            ${items.map((d, i) => drillRow(k, idx, i, d, ro)).join("")}
            ${ro ? "" : `<div class="lp-add"><button class="btn" data-pick="${k}|${idx}">+ Choose drill</button><button class="btn" data-own="${k}|${idx}">+ Write my own</button></div>`}</div>`; }).join("")}</div>`; }).join("")}
    <div class="box"><h3>Notes for the week</h3><textarea class="inp" id="lpNotes" rows="3" ${ro} placeholder="Equipment, swimmers to watch, who is close to levelling up…">${esc(p.notes || "")}</textarea></div>
    <div class="bar"><span class="note" id="lpSaved" style="margin:0">${r ? "Saved ✓" : "Changes save automatically"}</span>
      <div class="tools">${mg && P.row && P.row.status === "submitted" ? `<input class="inp" id="lpRevNote" placeholder="Note to the coach (optional)" style="max-width:260px"><button class="btn primary" id="lpRev">Mark reviewed</button>` : ""}
      ${!ro ? `<button class="btn ${mg ? "" : "primary"}" id="lpSubmit">${stt === "submitted" ? "Submit again" : "Submit to management"}</button>` : ""}</div></div>`;
}
const getL = li => li === "m" ? P.plan.makeup : P.plan.lessons[+li];
const getArr = (sec, li) => sec === "finish" ? getL(li).finish.items : getL(li)[sec];
function wire(el){
  const V = X(), q = s => el.querySelector(s);
  if (q("#lpBack")) q("#lpBack").onclick = () => { V.S.view = "swimmers"; V.render(); };
  el.querySelectorAll("[data-lpl]").forEach(b => b.onclick = () => { P.level = +b.dataset.lpl; P.key = ""; V.render(); });
  if (!P.plan) return;
  el.querySelectorAll("[data-cnt]").forEach(b => b.onclick = () => { P.plan.count = +b.dataset.cnt; save(); V.render(); });
  el.querySelectorAll("[data-fin]").forEach(b => b.onclick = () => { const [li, f] = b.dataset.fin.split("|"), k = getL(li).finish.kinds, i = k.indexOf(f); if (i >= 0) k.splice(i, 1); else k.push(f); save(); V.render(); });
  el.querySelectorAll("[data-lf]").forEach(i => i.oninput = () => { getL(i.dataset.l).focus = i.value; save(); });
  el.querySelectorAll("[data-f]").forEach(i => i.oninput = () => { const a = getArr(i.dataset.s, i.dataset.l); a[+i.dataset.i][i.dataset.f] = i.dataset.f === "min" ? (i.value.replace(/\D/g, "") ? +i.value.replace(/\D/g, "") : "") : i.value; save(); if (i.dataset.f === "min") clearTimeout(P.rt), P.rt = setTimeout(() => V.render(), 700); });
  el.querySelectorAll("[data-del]").forEach(b => b.onclick = () => { const [s, l, i] = b.dataset.del.split("|"); getArr(s, l).splice(+i, 1); save(); V.render(); });
  el.querySelectorAll("[data-up]").forEach(b => b.onclick = () => { const [s, l, i] = b.dataset.up.split("|"), a = getArr(s, l), n = +i; if (n > 0) { [a[n - 1], a[n]] = [a[n], a[n - 1]]; save(); V.render(); } });
  el.querySelectorAll("[data-pick]").forEach(b => b.onclick = () => { const [s, l] = b.dataset.pick.split("|"); picker(s, l); });
  el.querySelectorAll("[data-own]").forEach(b => b.onclick = () => { const [s, l] = b.dataset.own.split("|"); own(s, l); });
  if (q("#lpNotes")) q("#lpNotes").oninput = e => { P.plan.notes = e.target.value; save(); };
  if (q("#lpSubmit")) q("#lpSubmit").onclick = () => { const empty = lessonsOf(P.plan).filter(l => !l.main.length).length; if (empty && !confirm(`${empty} lesson${empty === 1 ? " has" : "s have"} no main set yet. Submit anyway?`)) return; save("submitted"); };
  if (q("#lpRev")) q("#lpRev").onclick = async () => { const { error } = await V.sb.from("acad_lesson_plans").update({ status: "reviewed", reviewed_at: new Date().toISOString(), reviewed_by: V.S.me.id, review_note: q("#lpRevNote").value.trim() || null }).eq("id", P.key);
    if (error) return V.toast(error.message); P.key = ""; P.ovKey = ""; V.toast("Marked reviewed – the coach is notified"); V.render(); };
  if (q("#lpCopy")) q("#lpCopy").onclick = async () => { const d = V.fromIso(V.S.week); d.setDate(d.getDate() - 7); const pk = `${P.coach}|${V.iso(d)}|${P.level}`;
    const { data } = await V.sb.from("acad_lesson_plans").select("data").eq("id", pk).maybeSingle();
    if (!data || !data.data || !data.data.lessons) return V.toast("No plan last week for this level");
    if (!confirm("Replace this week's plan with last week's?")) return; P.plan = JSON.parse(JSON.stringify(data.data)); save(); V.render(); V.toast("Copied – edit anything you like"); };
}
function libFor(sec, lvl){
  const base = sec === "main" ? (LEVELS[lvl - 1] ? LEVELS[lvl - 1].skills.map(s => [s, "Skill from the level programme", 6]) : []).concat(EXTRA_MAIN[lvl] || []) : sec === "finish" ? [] : LIB[sec] || [];
  return base.map(([name, detail, min]) => ({ name, detail, min, src: "Vortex" }));
}
function picker(sec, li){
  const V = X(), esc = V.esc, l = getL(li), kinds = sec === "finish" ? (l.finish.kinds.length ? l.finish.kinds : ["games", "dive", "streamline"]) : [sec];
  const lists = kinds.map(k => { const lib = k === sec ? libFor(sec, P.level) : (LIB[k] || []).map(([name, detail, min]) => ({ name, detail, min, src: "Vortex" }));
    const cust = (P.custom || []).filter(d => d.section === k && (!d.level || d.level === P.level)).map(d => ({ name: d.name, detail: d.detail || "", min: d.minutes || "", src: "Coaches", id: d.id }));
    return [k, cust.concat(lib)]; });
  const title = sec === "finish" ? "Last 5 min" : (SEC.find(s => s[0] === sec) || [])[1];
  let flat = [];
  V.openSheet(`${V.head(`Choose a drill · ${title}`, `${(LEVELS[P.level - 1] || {}).short || ""} · tap to add, then edit it in the plan`)}<div class="sh-body">
    <input class="inp" id="lpQ" placeholder="Search drills">
    ${lists.map(([k, arr]) => `<div class="box" data-grp><h3>${esc(FIN.find(f => f[0] === k) ? FIN.find(f => f[0] === k)[1] : title)} <small>${arr.length}</small></h3>${arr.map(d => { flat.push(d); return `<button class="btn lp-pick" data-pk="${flat.length - 1}" data-q="${esc((d.name + " " + d.detail).toLowerCase())}"><b>${esc(d.name)}${d.min ? ` · ${esc(d.min)} min` : ""}</b><span>${esc(d.detail)}${d.src === "Coaches" ? " · added by a coach" : ""}</span></button>`; }).join("") || `<p class="note" style="margin:0">No drills yet – use "Write my own".</p>`}</div>`).join("")}
  </div>`, true);
  document.getElementById("lpQ").oninput = e => { const t = e.target.value.toLowerCase(); document.querySelectorAll("[data-pk]").forEach(b => b.style.display = b.dataset.q.includes(t) ? "" : "none"); };
  document.querySelectorAll("[data-pk]").forEach(b => b.onclick = () => { const d = flat[+b.dataset.pk]; getArr(sec, li).push({ name: d.name, detail: d.detail, min: d.min }); save(); V.closeSheet(); V.render(); V.toast("Drill added"); });
}
function own(sec, li){
  const V = X(), l = getL(li);
  const kinds = sec === "finish" ? FIN : [[sec, (SEC.find(s => s[0] === sec) || [])[1]]];
  V.openSheet(`${V.head("Write my own drill", (LEVELS[P.level - 1] || {}).short || "")}<div class="sh-body"><div class="box">
    <label class="f">Drill name<input class="inp" id="odN" autofocus placeholder="e.g. Rocket push-off"></label>
    <label class="f" style="margin-top:10px">Details<textarea class="inp" id="odD" rows="3" placeholder="How to do it – reps, distance, equipment, coaching points"></textarea></label>
    <div class="grid4" style="margin-top:10px"><label class="f">Minutes<input class="inp" id="odM" inputmode="numeric" value="5"></label>
    ${sec === "finish" ? `<label class="f">Type<select class="inp" id="odK">${FIN.map(([k, n]) => `<option value="${k}" ${l.finish.kinds[0] === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>` : ""}</div>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="odS" checked> Save to the academy drill library so every coach can use it</label>
  </div></div><div class="sh-foot"><span class="sp"></span><button class="btn primary" id="odGo">Add drill</button></div>`, true);
  document.getElementById("odGo").onclick = async () => {
    const name = document.getElementById("odN").value.trim(), detail = document.getElementById("odD").value.trim(), min = +document.getElementById("odM").value || "";
    if (!name) return document.getElementById("odN").focus();
    getArr(sec, li).push({ name, detail, min }); save();
    if (document.getElementById("odS").checked) { const k = sec === "finish" ? document.getElementById("odK").value : sec;
      const { data, error } = await V.sb.from("acad_drills").insert({ level: P.level, section: k, name, detail: detail || null, minutes: min || null, created_by: V.S.me.id }).select().single();
      if (!error && data) (P.custom = P.custom || []).unshift(data); }
    V.closeSheet(); V.render(); V.toast("Drill added");
  };
}
const pb = document.getElementById("plansBtn"); if (pb) pb.onclick = () => { X().S.view = "plans"; X().render(); window.scrollTo(0, 0); };
window.VXL = { render, open: (coach, week, level) => { const V = X(); if (week && week !== V.S.week) V.goWeek(week); if (V.mgmt() && coach) V.S.coachSel = coach; if (level) P.level = +level; P.key = ""; V.S.view = "plans"; V.render(); window.scrollTo(0, 0); } };
})();
