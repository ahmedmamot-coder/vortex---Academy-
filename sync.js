/* Excel sync: full backup export in the term-sheet layout, and import of the edited sheet back into the app. Uses window.VX. */
(() => {
const X = () => window.VX;
const WD = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const DH = { Sun: "Sun", Mon: "Mon", Tue: "Tues", Wed: "Wed", Thu: "Thurs", Fri: "Fri", Sat: "Sat" };
const KEEP = ["confirmed","tbc","complimentary","second session","staff"];
const tcase = s => String(s ?? "").trim().replace(/\s+/g, " ").toLowerCase().replace(/(^|[\s\-'\/])(\p{L})/gu, (a, b, c) => b + c.toUpperCase());
const str = v => String(v ?? "").trim();
const short = n => String(n || "").replace(/^coach\s+/i, "").trim();
const pad = n => String(n).padStart(2, "0");
const HEAD = ["Status","Exist/New","First Name","Family Name","Full Name","Sibling","Nationality","Gender","DOB","Age","Contact # 1","Contact # 2","Email 1","Email 2","FROM WHICH TERM","QID","Notes","KIT","Level","Coach","Start Date"]
  .concat(...WD.map(d => [`${DH[d]} Time`, `${DH[d]} Coach`, `${DH[d]} Lane`])).concat(["Paid","Term","Active","VX ID"]);
const lastKey = "vx_last_backup";
const PG = () => X().S.program || "kids";
const ADULT = () => PG() !== "kids";
const INACT = /expir|finish|complet|cancel|remov|transf|moved|refund/i;
/* Extra register columns kept for the adult programmes so an export gives the same file back */
const EX = [["renewal","Renewal Status",/^renewal status$/],["att","ATTENDANCE",/^attendance$/],["total","Total Lessons",/^total lessons?$/],
  ["l1","Lesson 1",/^lesson 1$/],["l2","Lesson 2",/^lesson 2$/],["l3","Lesson 3",/^lesson 3$/],["l4","Lesson 4",/^lesson 4$/],["l5","Lesson 5",/^lesson 5$/],
  ["rego","Rego",/^rego$/],["fee","Term Fee",/^term fee$/],["out","Outstanding Last Term",/^outstanding/],["tfee","TOTAL FEE",/^total fee$/],["credit","Credit",/^credit$/],
  ["paidAmt","Paid",/^paid$/],["rec","Rec. No.",/^rec\.?\s*no\.?$/],["pdate","Date",/^date$/],["mode","Mode of Payment",/^mode of payment$/],
  ["refund","Amount Refunded",/^amount refunded$/],["rdate","Date Refunded",/^date refunded$/],["bal","Balance due",/^balance due$/]];
const EXD = ["pdate","rdate"], MARKS = 15;
const DAYCOLS = WD.flatMap(d => [`${DH[d]} Time`, `${DH[d]} Coach`, `${DH[d]} Lane`]);
const FEES = ["Total Lessons","Lesson 1","Lesson 2","Lesson 3","Lesson 4","Lesson 5","Rego","Term Fee","Outstanding Last Term","TOTAL FEE","Credit","Paid","Rec. No.","Date","Mode of Payment","Amount Refunded","Date Refunded","Balance due"];
const HEAD_A = {
  men: ["Status","Exist/New","First Name","Family Name","Full Name","Sibling","Nationality","Gender","DOB","Age","Contact # 1","Contact # 2","Email 1","FROM WHICH TERM","QID","Notes","ATTENDANCE","Level","Coach","Start Date"]
    .concat(DAYCOLS, FEES, ["Term","Active","VX ID"]),
  ladies: ["Renewal Status","Client Status","Exist/New","Full Name","Sibling","Nationality","Gender","DOB","Age","Contact # 1","Contact # 2","Email 1","QID","Notes","Level","Coach","Start Date"]
    .concat(DAYCOLS, FEES, ["ATTENDANCE"], Array.from({ length: MARKS }, (_, i) => String(i + 1)), ["Term","Active","VX ID"])
};
const exVal = v => { if (v instanceof Date && !isNaN(v)) return toDate(v); if (typeof v === "number") return v; const t = str(v); return t === "" ? null : t; };
const num = v => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^\d.-]/g, "")); return isNaN(n) ? null : n; };
const stable = o => JSON.stringify(o && typeof o === "object" ? Object.keys(o).sort().reduce((a, k) => { if (o[k] != null && o[k] !== "" && !(Array.isArray(o[k]) && !o[k].some(Boolean))) a[k] = o[k]; return a; }, {}) : null);

function toDate(v){
  if (v instanceof Date && !isNaN(v)) { const d = new Date(v.getTime() + 12 * 36e5); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; }
  const s = str(v); let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); if (m) return `${m[1]}-${pad(m[2])}-${pad(m[3])}`;
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/); return m ? `${m[3]}-${pad(m[2])}-${pad(m[1])}` : "";
}
function toTime(v){
  let mins = null;
  if (v instanceof Date && !isNaN(v)) mins = v.getUTCHours() * 60 + v.getUTCMinutes() + (v.getUTCSeconds() >= 30 ? 1 : 0);
  else if (typeof v === "number" && v >= 0 && v < 1) mins = Math.round(v * 1440);
  if (mins == null) return str(v);
  const h = Math.floor(mins / 60), mm = mins % 60; return `${h % 12 || 12}:${pad(mm)} ${h < 12 ? "am" : "pm"}`;
}
function parseLevel(v){
  const t = str(v).toLowerCase(); if (!t) return 0; const c = t.replace(/[\s._*-]+/g, "");
  if (ADULT()) {
    if (/^aqua(pt|private)/.test(c)) return 18; if (/^aqua/.test(c)) return 17;
    if (/^(grp|group)(pt|private)/.test(c)) return 16; if (/^(pt|private)/.test(c)) return 15;
    const m = c.match(/^(level|l)?([1-5])$/); if (m) return 9 + +m[2];
    const k = LEVELS.slice(0, 5).findIndex(L => L.name.toLowerCase().split(" ").some(w => w.length > 3 && t.includes(w))); return k >= 0 ? 10 + k : 0;
  }
  const b = c.match(/^(bb|babybubbles)([123])$/); if (b) return 5 + +b[2];
  if (/^(grp|group)?pt$|private/.test(c)) return 9;
  const i = LEVELS.slice(0, 5).findIndex(L => L.name.toLowerCase().split(" ").some(w => w.length > 3 && t.includes(w))); if (i >= 0) return i + 1;
  const m = t.match(/^(level|l)?\s*([1-5])$/); return m ? +m[2] : 0;
}
const lvName = n => { const L = LEVELS[n - 1]; return L ? (L.reg ? L.reg : n <= 5 ? L.name : L.code === "PT" ? "Private Training" : L.name) : ""; };

async function fetchAll(withReports){
  const V = X();
  const q = [V.sb.from("acad_swimmers").select("*").eq("program", PG()).limit(10000), V.sb.from("acad_contacts").select("*").limit(10000)];
  if (withReports) q.push(V.sb.from("acad_reports").select("swimmer_id,coach_id,week,level,done,reviewed_at,data").limit(30000));
  const [s, c, r] = await Promise.all(q); if (s.error) throw s.error;
  const cm = {}; (c.data || []).forEach(x => { cm[x.swimmer_id] = x; });
  return { rows: s.data || [], cm, reps: r ? r.data || [] : [] };
}

async function exportBackup(btn){
  const V = X(); if (!window.XLSX) return V.toast("The Excel tool didn't load – reload the page");
  btn.disabled = true; const old = btn.textContent; btn.textContent = "Preparing…";
  try {
    const { rows, cm, reps } = await fetchAll(true);
    rows.sort((a, b) => (b.active !== false) - (a.active !== false) || a.name.localeCompare(b.name));
    const prog = PG(), H = HEAD_A[prog] || HEAD;
    const reg = [H];
    if (prog !== "kids") rows.forEach(r => { const c = cm[r.id] || {}, ph = c.phones || [], e = r.extra || {}, ses = {}; (r.sessions || []).forEach(x => { (ses[x.day] = ses[x.day] || []).push(x); });
      const day = {}; WD.forEach(d => { day[`${DH[d]} Time`] = ses[d] ? ses[d].map(x => V.fmtTime(x.time)).join(" | ") : ""; day[`${DH[d]} Coach`] = ses[d] ? ses[d].map(x => x.coach || "").join(" | ") : ""; day[`${DH[d]} Lane`] = ses[d] ? ses[d].map(x => x.lane || "").join(" | ") : ""; });
      const v = { "Status": r.reg_status || "", "Client Status": r.reg_status || "", "Exist/New": r.is_new === false ? "Existing" : r.is_new === true ? "New" : "", "First Name": r.first_name || "", "Family Name": r.family_name || "",
        "Full Name": r.name, "Sibling": r.sibling || "", "Nationality": r.nationality || "", "Gender": r.gender || "", "DOB": r.dob ? V.fromIso(r.dob) : "", "Age": r.dob ? V.ageOf({ dob: r.dob }) : (r.age || ""),
        "Contact # 1": ph[0] || "", "Contact # 2": ph[1] || "", "Email 1": c.email || "", "FROM WHICH TERM": r.from_term || "", "QID": c.qid || "", "Notes": r.notes || "", "Level": lvName(r.level),
        "Coach": short(V.coachName(r.coach_id)), "Start Date": r.start_date ? V.fromIso(r.start_date) : "", "Term": r.term || "", "Active": r.active === false ? "No" : "Yes", "VX ID": r.id, ...day };
      EX.forEach(([k, h]) => { const x = e[k]; v[h] = x == null ? "" : EXD.includes(k) && /^\d{4}-\d{2}-\d{2}$/.test(x) ? V.fromIso(x) : x; });
      if (e.total == null && r.paid_classes != null) v["Total Lessons"] = r.paid_classes;
      for (let i = 0; i < MARKS; i++) v[String(i + 1)] = (e.marks || [])[i] || "";
      reg.push(H.map(h => v[h] ?? "")); });
    else
    rows.forEach(r => { const c = cm[r.id] || {}, ph = c.phones || [], ses = {}; (r.sessions || []).forEach(x => { (ses[x.day] = ses[x.day] || []).push(x); });
      const parts = [r.first_name || "", r.family_name || ""];
      reg.push([r.reg_status || "", r.is_new === false ? "Exist" : r.is_new === true ? "New" : "", parts[0], parts[1], r.name, r.sibling || "", r.nationality || "", r.gender || "",
        r.dob ? V.fromIso(r.dob) : "", r.dob ? V.ageOf({ dob: r.dob }) : (r.age || ""), ph[0] || "", ph[1] || "", c.email || "", c.email2 || "", r.from_term || "", c.qid || "", r.notes || "", r.kit || "",
        lvName(r.level), short(V.coachName(r.coach_id)), r.start_date ? V.fromIso(r.start_date) : ""]
        .concat(...WD.map(d => ses[d] ? [ses[d].map(x => V.fmtTime(x.time)).join(" | "), ses[d].map(x => x.coach || "").join(" | "), ses[d].map(x => x.lane || "").join(" | ")] : ["", "", ""]))
        .concat([r.paid === true ? "Paid" : r.paid === false ? "Not paid" : "", r.term || "", r.active === false ? "No" : "Yes", r.id])); });
    const byId = {}; rows.forEach(r => { byId[r.id] = r; });
    const att = [["Swimmer","Date","Day","Time","Coach","Level"]], rep = [["Week of","Swimmer","Coach","Level","Status","Sessions attended","This week's focus","Next week's goal","Try at home","Coach's comment"]];
    reps.sort((a, b) => a.week.localeCompare(b.week)).forEach(x => { const k = byId[x.swimmer_id]; if (!k) return; const d = x.data || {};
      (d.att || []).forEach((a, i) => { if (!a) return; const dt = V.fromIso(x.week); dt.setDate(dt.getDate() + i); const s = (k.sessions || []).find(z => z.day === WD[i]);
        att.push([k.name, dt, WD[i], s ? V.fmtTime(s.time) : "", short(V.coachName(x.coach_id)), (LEVELS[x.level - 1] || {}).short || ""]); });
      rep.push([V.fromIso(x.week), k.name, short(V.coachName(x.coach_id)), (LEVELS[x.level - 1] || {}).short || "", x.reviewed_at ? "Reviewed" : x.done ? "Done" : "In progress",
        (d.att || []).filter(Boolean).length, d.focus || "", d.goal || "", d.home || "", d.comment || ""]); });
    const wb = XLSX.utils.book_new();
    const sheet = (aoa, name, widths) => { const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: "dd/mm/yyyy" }); ws["!cols"] = widths.map(w => ({ wch: w })); ws["!autofilter"] = { ref: ws["!ref"] }; XLSX.utils.book_append_sheet(wb, ws, name); };
    sheet(reg, "Register", H.map(h => /^\d+$/.test(h) ? 4 : /Name|Notes|Email/.test(h) ? 22 : /Time|Lane|Gender|Age|Sibling|Paid|Active/.test(h) ? 9 : h === "VX ID" ? 16 : 13));
    sheet(att, "Attendance", [28, 12, 6, 10, 14, 8]);
    sheet(rep, "Weekly reports", [12, 28, 14, 8, 11, 9, 30, 30, 30, 40]);
    const now = new Date(), stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    V.deliver(`Vortex ${PROGS[prog].name} Register – ${stamp}.xlsx`, new Blob([XLSX.write(wb, { type: "array", bookType: "xlsx", cellDates: true })]));
    try { localStorage.setItem(lastKey, String(Date.now())); } catch {}
    V.toast(`Backup saved – ${rows.length} swimmers`);
  } catch (e) { V.toast("Backup failed – " + (e.message || "check your connection")); }
  btn.disabled = false; btn.textContent = old;
}

function readSheet(aoa){
  const V = X(), hi = aoa.slice(0, 15).findIndex(r => r.some(c => /^full\s*name$/i.test(str(c)))); if (hi < 0) return null;
  const H = aoa[hi].map(c => str(c).toLowerCase().replace(/\s+/g, " "));
  const col = re => H.findIndex(h => re.test(h));
  const days = {}; H.forEach((h, i) => { const m = h.match(/^(sun|mon|tue|wed|thu|fri|sat)[a-z]*\.? ?(time|coach|caoch|lane)\s*(\d?)$/);
    if (m) { const d = WD[["sun","mon","tue","wed","thu","fri","sat"].indexOf(m[1])], key = d + (m[3] || ""), f = m[2] === "caoch" ? "coach" : m[2]; days[key] = days[key] || { d }; if (days[key][f] == null) days[key][f] = i; } });
  const dkeys = Object.keys(days).sort((a, b) => WD.indexOf(days[a].d) - WD.indexOf(days[b].d) || a.localeCompare(b));
  const EC = {}; EX.forEach(([k, , re]) => { EC[k] = col(re); }); const MC = []; H.forEach((h, i) => { if (/^\d{1,2}$/.test(h) && +h >= 1 && +h <= MARKS) MC[+h - 1] = i; });
  const C = { status: col(/^(status|client status.*|school)$/), isNew: col(/^exist\s*\/?\s*new$/), first: col(/^first name$/), family: col(/^family name$/), full: col(/^full\s*name$/), sib: col(/^sibling/), nat: col(/^nationality/), gender: col(/^gender/),
    dob: col(/^dob$|birth/), p1: col(/contact\s*#?\s*1/), p2: col(/contact\s*#?\s*2/), e1: col(/^email\s*1?$/), e2: col(/^email\s*2$/), from: col(/from which term/), qid: col(/^qid$/), notes: col(/^notes?$/), kit: col(/^kit$/),
    level: col(/^level$/), coach: col(/^coach$/), start: col(/^start date$/), paid: col(/^paid$/), term: col(/^term$/), active: col(/^active$/), id: col(/^vx id$/) };
  const g = (r, k) => C[k] >= 0 ? r[C[k]] : undefined;
  const out = []; out.has = {}; Object.keys(C).forEach(k => { out.has[k] = C[k] >= 0; }); out.hasDays = Object.keys(days).length > 0; out.hasExtra = EX.some(([k]) => EC[k] >= 0) || MC.length > 0;
  aoa.slice(hi + 1).forEach((r, i) => {
    const full = str(g(r, "full")) || [str(g(r, "first")), str(g(r, "family"))].filter(Boolean).join(" "); if (!full) return;
    const sessions = dkeys.flatMap(key => { const D = days[key], d = D.d, t = D.time != null ? r[D.time] : "", c = D.coach != null ? r[D.coach] : "", l = D.lane != null ? r[D.lane] : "";
      if (!(str(t) || str(c)) || (ADULT() && !str(t)) || /^freeze$/i.test(str(c))) return [];
      const ts = typeof t === "string" ? t.split("|") : [t], cs = str(c).split("|"), lsx = str(l).split("|");
      return ts.map((tt, j) => ({ day: d, time: toTime(typeof tt === "string" ? tt.trim() : tt), coach: tcase(str(cs[j] ?? cs[0])), lane: str(lsx[j] ?? lsx[0]) })); });
    const extra = {}; EX.forEach(([k]) => { if (EC[k] >= 0) { const v = exVal(r[EC[k]]); if (v != null) extra[k] = v; } });
    if (MC.length) { const mk = MC.map(i => i == null ? "" : str(r[i]).toUpperCase()); if (mk.some(Boolean)) extra.marks = mk; }
    let pr = g(r, "paid"), pv = typeof pr === "number" ? (pr > 0 ? "paid" : "") : str(pr).toLowerCase();
    if (ADULT()) { const bal = num(extra.bal), pa = num(extra.paidAmt); pv = bal != null && bal > 0 ? "not paid" : pa != null && pa > 0 ? "paid" : ""; }
    out.push({ row: hi + i + 2, id: str(g(r, "id")), name: tcase(full), first: tcase(g(r, "first")), family: tcase(g(r, "family")), status: str(g(r, "status")), isNew: str(g(r, "isNew")).toLowerCase(),
      sibling: str(g(r, "sib")), nationality: tcase(g(r, "nat")), gender: str(g(r, "gender")).toUpperCase().slice(0, 1), dob: toDate(g(r, "dob")),
      phones: [str(g(r, "p1")), str(g(r, "p2"))].filter(Boolean), email: str(g(r, "e1")), email2: str(g(r, "e2")), from: str(g(r, "from")), qid: str(g(r, "qid")), notes: str(g(r, "notes")), kit: str(g(r, "kit")),
      levelRaw: str(g(r, "level")), coachMain: str(g(r, "coach")), level: parseLevel(g(r, "level")), start: toDate(g(r, "start")), paid: pv ? (/^(paid|yes|y|1|true)$/.test(pv) ? true : /not|no|unpaid|0|false/.test(pv) ? false : null) : undefined,
      extra, total: num(extra.total), term: str(g(r, "term")), active: C.active >= 0 ? !/^(no|n|0|false|left|inactive)$/i.test(str(g(r, "active"))) : true, sessions });
  });
  return out;
}

async function plan(items){
  const V = X(), { rows, cm } = await fetchAll(false);
  const byId = {}, byKey = {}; rows.forEach(r => { byId[r.id] = r; byKey[V.norm(r.name) + "|" + (r.dob || "")] = r; byKey[V.norm(r.name) + "|"] = byKey[V.norm(r.name) + "|"] || r; });
  const cmap = {}; V.allCoachIds().forEach(id => { cmap[V.norm(short(V.coachName(id)))] = id; });
  const adult = ADULT(), prog = PG(), UNA = V.S.coaches["p-unassigned"] ? "p-unassigned" : null, sex = PROGS[prog].sex;
  const coachId = name => { const n = V.norm(short(String(name || "").split(/[\/,&]+/)[0])); return n ? cmap[n] || null : null; };
  const has = { ...items.has, days: items.hasDays }, hasExtra = !!items.hasExtra;
  const isKeep = it => !it.status || (adult ? !INACT.test(it.status) : KEEP.includes(it.status.toLowerCase()));
  const mk = {}, merged = [];
  items.slice().sort((a, b) => isKeep(b) - isKeep(a)).forEach(it => { const k = it.id || V.norm(it.name) + "|" + it.dob, o = mk[k];
    if (!o) { mk[k] = it; merged.push(it); return; }
    if (isKeep(o) && !isKeep(it)) return;
    it.sessions.forEach(x => { if (!o.sessions.some(y => y.day === x.day && V.timeVal(y.time) === V.timeVal(x.time))) o.sessions.push(x); });
    o.sessions.sort((p, q) => WD.indexOf(p.day) - WD.indexOf(q.day) || V.timeVal(p.time) - V.timeVal(q.time));
    if (it.start && (!o.start || it.start < o.start)) o.start = it.start;
    if (!o.phones.length) o.phones = it.phones; });
  items = merged;
  const res = { add: [], change: [], same: 0, skip: [], warn: [], seen: new Set(), coaches: new Set() };
  items.forEach(it => {
    const ex = (it.id && byId[it.id]) || byKey[V.norm(it.name) + "|" + it.dob] || (!it.dob && byKey[V.norm(it.name) + "|"]);
    const keep = isKeep(it);
    if (!adult && !ex && (!keep || !it.active)) return;
    if (adult && !it.level && !ex) { it.level = progLevels()[0]; if (keep) res.warn.push({ row: it.row, name: it.name, why: it.levelRaw ? `level "${it.levelRaw}" not recognised – put in ${LEVELS[it.level - 1].short}` : `no level – put in ${LEVELS[it.level - 1].short}` }); }
    if (!it.level && !ex) return res.skip.push({ row: it.row, name: it.name, why: it.levelRaw ? `level "${it.levelRaw}" not recognised` : "no level" });
    const sessions = has.days ? it.sessions.map(s => { const ok = s.coach.split(/[\/,&]+/).map(x => x.trim()).filter(x => x && coachId(x)); return { ...s, coach: ok.length ? ok.join("/") : s.coach }; }) : (ex ? ex.sessions || [] : []);
    const cnt = {}; sessions.forEach(s => { const c = s.coach.split("/")[0].trim(); if (c) cnt[c] = (cnt[c] || 0) + 1; });
    const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0];
    let cid = (it.coachMain && coachId(it.coachMain)) || (ex && sessions.some(s => s.coach.split("/").some(n => coachId(n) === ex.coach_id)) ? ex.coach_id : null) || (main && coachId(main)) || (ex ? ex.coach_id : null);
    if (!cid && adult && UNA) { cid = UNA; if (keep && main) res.warn.push({ row: it.row, name: it.name, why: `coach "${main}" not in the app – put under Unassigned` }); }
    if (cid) res.coaches.add(cid);
    if (!cid) return res.skip.push({ row: it.row, name: it.name, why: main ? `coach "${main}" not found in the app` : "no coach in the schedule" });
    const pick = (k, v) => has[k] ? (v || null) : (ex ? ex[k === "first" ? "first_name" : k === "family" ? "family_name" : k === "nat" ? "nationality" : k === "sib" ? "sibling" : k === "from" ? "from_term" : k] ?? null : null);
    const gd = /^[MF]$/.test(it.gender) ? it.gender : "", nat = /^#|yrs|^\d/i.test(it.nationality) ? "" : it.nationality;
    const rec = { program: prog, name: it.name, first_name: pick("first", it.first), family_name: pick("family", it.family), dob: it.dob || (ex ? ex.dob : null), level: it.level || (ex ? ex.level : 1), coach_id: cid, sessions,
      start_date: it.start || (ex ? ex.start_date : null), reg_status: it.status ? tcase(it.status) : (ex ? ex.reg_status : null), is_new: it.isNew ? it.isNew.startsWith("n") : (ex ? ex.is_new : null),
      gender: adult ? (gd || (ex && ex.gender) || sex || null) : pick("gender", it.gender), nationality: adult ? (nat || (ex && ex.nationality) || null) : pick("nat", it.nationality), sibling: pick("sib", it.sibling), kit: pick("kit", it.kit), from_term: pick("from", it.from), notes: pick("notes", it.notes),
      term: it.term || (ex ? ex.term : (V.S.term || {}).name || null), active: keep && it.active };
    if (it.paid !== undefined && (has.paid || adult)) rec.paid = it.paid; else if (ex) rec.paid = ex.paid ?? null;
    if (adult) { rec.extra = hasExtra ? (Object.keys(it.extra).length ? it.extra : null) : (ex ? ex.extra ?? null : null); rec.paid_classes = it.total != null ? Math.round(it.total) : (ex ? ex.paid_classes ?? null : null); }
    const c0 = ex ? cm[ex.id] || {} : {};
    const con = { phones: has.p1 || has.p2 ? it.phones : c0.phones || [], email: has.e1 ? it.email || null : c0.email || null, email2: has.e2 ? it.email2 || null : c0.email2 || null, qid: has.qid ? it.qid || null : c0.qid || null };
    if (!ex) { const id = "k" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); res.add.push({ id, rec: { id, ...rec }, con }); return; }
    res.seen.add(ex.id);
    const diff = [];
    const lab = { name: "name", dob: "date of birth", level: "level", coach_id: "coach", sessions: "schedule", start_date: "start date", reg_status: "status", paid: "payment", active: "active", gender: "gender", nationality: "nationality", notes: "notes", kit: "kit", sibling: "sibling", from_term: "from term", term: "term", is_new: "new/existing", first_name: "first name", family_name: "family name", paid_classes: "paid classes", extra: "fees / attendance" };
    Object.keys(lab).forEach(k => { if (!(k in rec)) return; const a = k === "extra" ? null : k === "sessions" ? JSON.stringify((ex.sessions || []).map(s => [s.day, V.timeVal(s.time), V.norm(s.coach || ""), String(s.lane || "")])) : ex[k] ?? null,
      b = k === "sessions" ? JSON.stringify(rec.sessions.map(s => [s.day, V.timeVal(s.time), V.norm(s.coach || ""), String(s.lane || "")])) : rec[k] ?? null;
      if (k === "extra") { if (stable(ex.extra) !== stable(rec.extra)) diff.push(lab[k]); return; }
      if (String(a ?? "") !== String(b ?? "")) diff.push(k === "level" ? `level ${(LEVELS[a - 1] || {}).short || a} → ${(LEVELS[b - 1] || {}).short || b}` : lab[k]); });
    const cdiff = String((c0.phones || []).join(",")) !== con.phones.join(",") || String(c0.email || "") !== String(con.email || "") || String(c0.email2 || "") !== String(con.email2 || "") || String(c0.qid || "") !== String(con.qid || "");
    if (cdiff) diff.push("contacts");
    if (diff.length) res.change.push({ id: ex.id, name: ex.name, rec: { id: ex.id, ...rec }, con, diff }); else res.same++;
  });
  res.missing = rows.filter(r => r.active !== false && !res.seen.has(r.id));
  res.rows = rows;
  return res;
}

async function apply(p, markLeft, btn){
  const V = X(); btn.disabled = true; btn.textContent = "Saving…"; const prog = (a, b) => { btn.textContent = `Saving ${a} of ${b}…`; };
  try {
    const recs = p.add.concat(p.change).map(x => ({ ...x.rec, updated_at: new Date().toISOString() }));
    for (let i = 0; i < recs.length; i += 100) { prog(i, recs.length); const { error } = await V.sb.from("acad_swimmers").upsert(recs.slice(i, i + 100)); if (error) throw error; }
    const cons = p.add.concat(p.change).map(x => ({ swimmer_id: x.id, ...x.con }));
    for (let i = 0; i < cons.length; i += 100) { const { error } = await V.sb.from("acad_contacts").upsert(cons.slice(i, i + 100)); if (error) throw error; }
    const pgm = PG(), tag = [...(p.coaches || [])].filter(id => V.S.coaches[id] && !(V.S.coaches[id].programs || ["kids"]).includes(pgm));
    for (const id of tag) { await V.sb.from("acad_coaches").update({ programs: [...new Set([...(V.S.coaches[id].programs || ["kids"]), pgm])] }).eq("id", id); }
    if (markLeft && p.missing.length) { const { error } = await V.sb.from("acad_swimmers").update({ active: false }).in("id", p.missing.map(r => r.id)); if (error) throw error; }
    try { await V.sb.from("acad_settings").upsert({ key: "last_import", value: { at: new Date().toISOString(), by: V.S.me.name || "", file: p.file || "", program: PG(), added: p.add.length, updated: p.change.length, left: markLeft ? p.missing.length : 0 } }); } catch {}
    await V.loadBase(); V.render();
    btn.textContent = "Done ✓"; V.toast(`Excel synced – ${p.add.length} added, ${p.change.length} updated${markLeft && p.missing.length ? `, ${p.missing.length} marked as left` : ""}`);
  } catch (e) { btn.disabled = false; btn.textContent = "Apply changes"; V.toast("Not saved – " + (e.message || "check your connection")); }
}

function mount(el){
  const V = X(), esc = V.esc; let last = 0; try { last = +localStorage.getItem(lastKey) || 0; } catch {}
  const ago = last ? Math.floor((Date.now() - last) / 864e5) : null;
  const prog = PG(), PN = PROGS[prog].name;
  el.innerHTML = `
    <div class="box" style="border-left:5px solid ${PROGS[prog].color}"><b>${esc(PN)}</b><span class="note" style="margin-left:6px">Import and export work on this program only – use “Switch” in the top bar for the others.</span></div>
    <div class="box"><h3>1 · Back up to Excel</h3>
      <p class="note" style="margin:0 0 10px">Downloads ${esc(PN)} in ${prog === "kids" ? "your term-sheet layout" : "the same layout as your " + esc(PN) + " register (including fees, payments and attendance)"}: a <b>Register</b> sheet (status, names, DOB, contacts, QID, level, coach, start date, every day's time / coach / lane, payment), plus <b>Attendance</b> and <b>Weekly reports</b> sheets. Keep this file as your backup and edit it in Excel.</p>
      <button class="btn primary" id="xsExport">Download ${esc(PROGS[prog].short)} register</button>
      <p class="note">${last ? `Last backup from this device: ${ago === 0 ? "today" : ago === 1 ? "yesterday" : ago + " days ago"}.` : "No backup downloaded on this device yet."}${ago != null && ago >= 7 ? ` <b style="color:#b4231f">Time for a new backup.</b>` : ""}</p></div>
    <div class="box"><h3>2 · Bring your Excel changes into the app <small id="xsLast"></small></h3>
      <p class="note" style="margin:0 0 10px">Upload the register after editing it in Excel – new rows are added, changed rows are updated (matched by the VX ID column, or name + date of birth). Nothing is saved until you check the changes and press Apply. ${prog === "kids" ? "The original term sheet works too." : `Your own ${esc(PN)} register file works too – upload it as it is.`}</p>
      <input type="file" id="xsFile" accept=".xlsx,.xls,.csv" class="inp"><div id="xsPrev"></div></div>`;
  el.querySelector("#xsExport").onclick = e => exportBackup(e.currentTarget);
  V.sb.from("acad_settings").select("value").eq("key", "last_import").maybeSingle().then(({ data }) => { const v = data && data.value, s = el.querySelector("#xsLast"); if (!v || !s) return;
    const d = new Date(v.at); s.textContent = `Last import ${d.getDate()} ${V.MON[d.getMonth()]}, ${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, "0")} ${d.getHours() < 12 ? "am" : "pm"}${v.by ? " by " + v.by : ""} · ${v.added} added, ${v.updated} updated`; });
  el.querySelector("#xsFile").onchange = async e => {
    const f = e.target.files[0], pv = el.querySelector("#xsPrev"); if (!f) return; fileInfo = { name: f.name, time: f.lastModified || Date.now() };
    if (!window.XLSX) return V.toast("The Excel tool didn't load – reload the page");
    pv.innerHTML = `<p class="note">Reading the file…</p>`;
    let cands = [];
    const kw = { kids: /academy|term/i, ladies: /ladies|women/i, men: /male|men\b|gents/i }[PG()];
    try { const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true }); const meta = (wb.Workbook && wb.Workbook.Sheets) || [];
      wb.SheetNames.forEach((n, i) => { const it = readSheet(XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: "", raw: true })), hidden = meta[i] && meta[i].Hidden;
        if (it && it.length) cands.push({ n, it, hidden, score: (n === "Register" ? 1e9 : 0) + (it.has.id ? 1e8 : 0) + (hidden ? 0 : 1e7) + (kw.test(n) ? 5e6 : 0) + (it.hasDays ? 1e6 : 0) + it.length }); }); }
    catch { cands = []; }
    if (!cands.length) { pv.innerHTML = `<p class="note">No register found – the sheet needs a "Full Name" column.</p>`; return; }
    cands.sort((a, b) => b.score - a.score);
    show(cands, 0);
  };
  let fileInfo = { name: "", time: Date.now() };
  async function show(cands, ci){
    const pv = el.querySelector("#xsPrev"), items = cands[ci].it;
    pv.innerHTML = `<p class="note">Comparing with the app…</p>`;
    let p; try { p = await plan(items); } catch (er) { pv.innerHTML = `<p class="note">Couldn't compare with the app: ${esc(er.message || "")}</p>`; return; }
    p.file = fileInfo.name;
    const other = Object.values(PROGS).find(P => P.id !== PG() && ({ ladies: /ladies/i, men: /male adult|\bmen\b/i, kids: /^$/ })[P.id].test(fileInfo.name + " " + cands[ci].n));
    const full = items.length >= 0.5 * p.rows.filter(r => r.active !== false).length;
    p.missing = full ? p.missing.filter(r => !r.updated_at || new Date(r.updated_at).getTime() < fileInfo.time) : [];
    pv.innerHTML = `${other ? `<p class="note" style="color:#b4231f;font-weight:600">This looks like the ${esc(other.name)} register, but you're in ${esc(PROGS[PG()].name)}. Switch program first if that's the case.</p>` : ""}${cands.length > 1 ? `<label class="f" style="margin-top:10px">Sheet<select class="inp" id="xsSheet">${cands.map((c, i) => `<option value="${i}" ${i === ci ? "selected" : ""}>${esc(c.n)}${c.hidden ? " (hidden)" : ""} – ${c.it.length} rows</option>`).join("")}</select></label>` : ""}
      <div class="kpis" style="grid-template-columns:repeat(4,1fr);margin:12px 0 8px"><div class="kpi"><b>${p.add.length}</b><span>New swimmers</span></div><div class="kpi"><b>${p.change.length}</b><span>Updated</span></div>
        <div class="kpi"><b>${p.same}</b><span>No change</span></div><div class="kpi"><b>${p.skip.length}</b><span>Skipped rows</span></div></div>
      ${p.add.length ? `<details open><summary class="note" style="cursor:pointer">New (${p.add.length})</summary>${p.add.slice(0, 50).map(x => `<p class="note" style="margin:2px 0">+ ${esc(x.rec.name)} · ${esc((LEVELS[x.rec.level - 1] || {}).short || "")} · Coach ${esc(short(V.coachName(x.rec.coach_id)))}</p>`).join("")}</details>` : ""}
      ${p.change.length ? `<details open><summary class="note" style="cursor:pointer">Updated (${p.change.length})</summary>${p.change.slice(0, 80).map(x => `<p class="note" style="margin:2px 0">• ${esc(x.name)}: ${esc(x.diff.join(", "))}</p>`).join("")}${p.change.length > 80 ? `<p class="note">…and ${p.change.length - 80} more</p>` : ""}</details>` : ""}
      ${p.skip.length ? `<details><summary class="note" style="cursor:pointer;color:#b4231f">Skipped (${p.skip.length})</summary>${p.skip.slice(0, 60).map(x => `<p class="note" style="margin:2px 0">Row ${x.row} (${esc(x.name)}): ${esc(x.why)}</p>`).join("")}</details>` : ""}
      ${p.warn.length ? `<details><summary class="note" style="cursor:pointer;color:#8a5a00">Notes (${p.warn.length})</summary>${p.warn.slice(0, 80).map(x => `<p class="note" style="margin:2px 0">Row ${x.row} (${esc(x.name)}): ${esc(x.why)}</p>`).join("")}</details>` : ""}
      ${p.missing.length ? `<label class="f" style="flex-direction:row;align-items:center;gap:8px;margin-top:10px"><input type="checkbox" id="xsLeft"> ${p.missing.length} swimmer${p.missing.length === 1 ? " is" : "s are"} in the app but not in this register – mark them as left <span class="note" style="margin:0">(swimmers added or edited in the app after this file was saved are kept)</span></label>` : ""}
      ${p.add.length || p.change.length || p.missing.length ? `<button class="btn primary" id="xsApply" style="margin-top:12px">Apply changes</button>` : `<p class="note" style="margin-top:10px">The app already matches this sheet.</p>`}`;
    const ap = pv.querySelector("#xsApply"); if (ap) ap.onclick = () => apply(p, !!(pv.querySelector("#xsLeft") || {}).checked, ap);
    const ss = pv.querySelector("#xsSheet"); if (ss) ss.onchange = () => show(cands, +ss.value);
  }
}
window.VXS = { mount, exportBackup };
})();
