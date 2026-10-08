/* In-app notifications: report submissions, level-up requests and decisions. Created by the database; shown with a bell. Uses window.VX. */
(() => {
const X = () => window.VX;
const N = { items: [], seen: null, lastId: 0, first: true, busy: false };
const st = document.createElement("style");
st.textContent = `#bellBtn{position:relative;border:0;background:rgba(255,255,255,.08);color:#fff;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;flex:none}
#bellBtn svg{width:21px;height:21px}#bellBtn b{position:absolute;top:-4px;right:-4px;min-width:19px;height:19px;padding:0 5px;border-radius:10px;background:#E5484D;color:#fff;font-size:11px;line-height:19px;font-weight:700;box-shadow:0 0 0 2px var(--navy)}
.nt{display:flex;gap:12px;align-items:flex-start;width:100%;text-align:left;border:0;background:var(--surface);border-radius:14px;padding:12px;box-shadow:var(--shadow);margin-bottom:8px;position:relative}
.nt.un{box-shadow:inset 3px 0 0 var(--sky),var(--shadow)}.nt i{flex:none;width:36px;height:36px;border-radius:10px;display:grid;place-items:center;font-style:normal;font-size:17px}
.nt b{display:block;font-size:14px}.nt span{display:block;font-size:12.5px;color:var(--muted);margin-top:2px}.nt em{font-style:normal;font-size:11px;color:var(--muted);white-space:nowrap;margin-left:auto}
.nt.un::after{content:"";position:absolute;right:12px;bottom:12px;width:8px;height:8px;border-radius:50%;background:var(--sky)}`;
document.head.appendChild(st);
const ICON = { plan_submitted: ["📝", "#E3E6FF"], plan_reviewed: ["✅", "#D8FFF2"], submitted: ["📨", "#E3E6FF"], reviewed: ["✅", "#D8FFF2"], levelup_request: ["⬆️", "#FFF1D6"], levelup_approved: ["🎉", "#D8FFF2"], levelup_declined: ["⏸️", "#FFE1DE"] };
const ago = s => { const m = Math.round((Date.now() - new Date(s)) / 6e4); if (m < 1) return "now"; if (m < 60) return m + " min"; const h = Math.round(m / 60); if (h < 24) return h + " h"; const d = Math.round(h / 24); return d < 7 ? d + " d" : new Date(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" }); };
const unread = () => N.items.filter(n => !N.seen || n.created_at > N.seen).length;

function bell(){
  const me = document.getElementById("meBtn"); if (!me) return;
  let b = document.getElementById("bellBtn");
  if (!b) { b = document.createElement("button"); b.id = "bellBtn"; b.setAttribute("aria-label", "Notifications"); me.parentNode.insertBefore(b, me); b.onclick = panel; }
  const u = unread();
  b.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>${u ? `<b>${u > 99 ? "99+" : u}</b>` : ""}`;
  b.title = u ? `${u} new notification${u === 1 ? "" : "s"}` : "Notifications";
}
async function load(){
  const V = X(); if (!V || !V.S.ready || N.busy) return; N.busy = true;
  try {
    const [a, s] = await Promise.all([V.sb.from("acad_notifications").select("*").order("created_at", { ascending: false }).limit(60),
      N.seen === null ? V.sb.from("acad_notif_seen").select("seen_at").eq("user_id", V.S.me.id).maybeSingle() : Promise.resolve(null)]);
    if (s) N.seen = (s.data && s.data.seen_at) || "1970-01-01";
    if (!a.error) {
      const items = a.data || [], top = items.length ? items[0].id : 0;
      if (!N.first && top > N.lastId) {
        const fresh = items.filter(n => n.id > N.lastId && n.actor !== V.S.me.id);
        fresh.slice(0, 3).forEach((n, i) => setTimeout(() => {
          V.toast(`🔔 ${n.title}`);
          try { if ("Notification" in window && Notification.permission === "granted" && document.hidden) new Notification(n.title, { body: n.body || "", icon: ASSETS.logoURL }); } catch {}
        }, i * 2700));
      }
      N.items = items; N.lastId = Math.max(N.lastId, top); N.first = false;
    }
  } catch {}
  N.busy = false; bell();
}
async function markSeen(){
  const V = X(), now = new Date().toISOString(); N.seen = now; bell();
  await V.sb.from("acad_notif_seen").upsert({ user_id: V.S.me.id, seen_at: now });
}
function open(n){
  const V = X(), l = n.link || {};
  V.closeSheet();
  if (l.type === "plan") { if (window.VXL) VXL.open(l.coach, l.week, l.level); return; }
  if (l.type === "subs") { if (l.week) V.goWeek(l.week); if (V.mgmt()) { V.S.view = "track"; V.render(); } window.scrollTo(0, 0); return; }
  if (l.type === "levelup") { const k = Object.values(V.S.kids).find(x => x.id === l.swimmer);
    if (k && window.VXT) setTimeout(() => VXT.form(`${k.cid}/${k.id}`, l.id), 60); else V.toast("This swimmer is no longer in the active list"); }
}
function panel(){
  const V = X(), esc = V.esc, seen = N.seen;
  const perm = "Notification" in window ? Notification.permission : "unsupported";
  V.openSheet(`${V.head("Notifications", V.mgmt() ? "Report submissions and level-ups from every coach" : "Updates on your reports and level-ups")}<div class="sh-body">
    ${perm === "default" ? `<div class="box" style="--c:var(--sky)"><h3>Alerts on this device</h3><p class="note" style="margin:0 0 8px">Get a pop-up when something new arrives while the app is open in the background.</p><button class="btn" id="ntPerm">Turn on alerts</button></div>` : ""}
    ${N.items.length ? N.items.map((n, i) => { const [ic, bg] = ICON[n.kind] || ["🔔", "#E6EAF5"];
      return `<button class="nt ${!seen || n.created_at > seen ? "un" : ""}" data-ni="${i}"><i style="background:${bg}">${ic}</i><div style="min-width:0;flex:1"><b>${esc(n.title)}</b><span>${esc(n.body || "")}</span></div><em>${esc(ago(n.created_at))}</em></button>`; }).join("")
      : `<div class="empty"><b>No notifications yet</b>${V.mgmt() ? "You'll see report submissions and level-up requests here." : "You'll see when management reviews your reports or decides on a level-up."}</div>`}
  </div>`, true);
  document.querySelectorAll("[data-ni]").forEach(b => b.onclick = () => open(N.items[+b.dataset.ni]));
  const p = document.getElementById("ntPerm"); if (p) p.onclick = async () => { try { await Notification.requestPermission(); } catch {} panel(); };
  markSeen();
}
let started = false;
function start(){ const V = X(); if (started || !V || !V.S.ready || !V.S.me.id) return; started = true; load();
  setInterval(load, 30000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) load(); }); }
const t = setInterval(() => { start(); if (started) clearInterval(t); }, 1000);
window.VXN = { load, panel };
})();
