/* Runtime assets: logo and mascots come from the academy's public storage (uploaded in Admin settings → Branding).
   Until they are uploaded, a drawn logo and drawn level art are used. PDF fonts are fetched on first use. */
const ASSETS = {};
const ASSET_BASE = CFG.url + "/storage/v1/object/public/acad-assets/";
const b64 = buf => { let s = ""; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s); };
const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
const cv = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return [c, c.getContext("2d")]; };
function rnd(seed){ let s = seed; return () => (s = (s * 9301 + 49297) % 233280) / 233280; }

function drawLogo(size){
  // Fallback mark: four brand-coloured waves forming an X
  const [c, x] = cv(size, size), k = size / 100;
  x.lineCap = "round"; x.lineWidth = 13 * k;
  const wave = (col1, col2, pts) => { const g = x.createLinearGradient(pts[0] * k, pts[1] * k, pts[6] * k, pts[7] * k); g.addColorStop(0, col1); g.addColorStop(1, col2);
    x.strokeStyle = g; x.beginPath(); x.moveTo(pts[0] * k, pts[1] * k); x.bezierCurveTo(pts[2] * k, pts[3] * k, pts[4] * k, pts[5] * k, pts[6] * k, pts[7] * k); x.stroke(); };
  wave("#B57BFF", "#8F23D7", [14, 22, 30, 8, 40, 40, 54, 30]);
  wave("#1DFEBF", "#12C99A", [78, 14, 90, 30, 62, 46, 82, 62]);
  wave("#1B22E4", "#3E46FF", [14, 40, 34, 46, 30, 66, 46, 74]);
  wave("#067EEA", "#7CC4FF", [28, 88, 42, 68, 58, 84, 86, 76]);
  return c;
}
function drawArt(ctx, w, h, kind, seed){
  ctx.fillStyle = "#1B2955"; ctx.fillRect(0, 0, w, h);
  const r = rnd(seed), sc = w / 280;
  if (kind === "lanes") for (let y = h * .15; y < h; y += h * .22) for (let x = w * .3, k = 0; x < w; x += 12 * sc, k++) {
    ctx.fillStyle = k % 2 ? "rgba(29,254,191,.6)" : "rgba(6,126,234,.6)"; ctx.beginPath(); ctx.arc(x, y, 3.2 * sc, 0, 7); ctx.fill(); }
  else for (let i = 0; i < 14; i++) { const x = w * .3 + r() * w * .7, y = r() * h, rad = (5 + r() * 15) * sc;
    ctx.strokeStyle = "rgba(86,180,255,.55)"; ctx.lineWidth = Math.max(1.4, 1.6 * sc); ctx.beginPath(); ctx.arc(x, y, rad, 0, 7); ctx.stroke();
    ctx.fillStyle = "rgba(200,235,255,.5)"; ctx.beginPath(); ctx.arc(x - rad * .3, y - rad * .4, rad * .18, 0, 7); ctx.fill(); }
}
async function tryImg(name){ try { const r = await fetch(ASSET_BASE + name + "?v=" + (ASSETS.v || 0), { cache: "no-cache" }); if (!r.ok) return null;
  const blob = await r.blob(); const url = URL.createObjectURL(blob); const im = await loadImg(url); return im; } catch { return null; } }

async function loadAssets(){
  ASSETS.v = Date.now();
  const [logoImg, ...masc] = await Promise.all(["logo.png", "mascot-1.png", "mascot-2.png", "mascot-3.png", "mascot-4.png", "mascot-5.png"].map(tryImg));
  ASSETS.hasLogo = !!logoImg; ASSETS.mascots = masc.map(Boolean);
  // logo as PNG (base64, no prefix) for the PDF and a data URL for the page
  const [lc, lx] = cv(256, 256);
  if (logoImg) { const s = Math.min(256 / logoImg.width, 256 / logoImg.height); lx.drawImage(logoImg, (256 - logoImg.width * s) / 2, (256 - logoImg.height * s) / 2, logoImg.width * s, logoImg.height * s); }
  else lx.drawImage(drawLogo(256), 0, 0);
  ASSETS.logoURL = lc.toDataURL("image/png"); ASSETS.logo = ASSETS.logoURL.split(",")[1];
  const logo = lc;
  for (let n = 1; n <= 9; n++) {
    const kind = n === 9 ? "lanes" : "bubbles", im = n <= 5 ? masc[n - 1] : null;
    // PDF banner strip (140 x 88 pt → 280 x 176 px)
    const [c, x] = cv(280, 176); drawArt(x, 280, 176, kind, n * 7);
    if (im) { const s = Math.min(176 / im.width, 176 / im.height); x.drawImage(im, 280 - 14 - im.width * s, (176 - im.height * s) / 2, im.width * s, im.height * s); }
    else if (n <= 5) { x.fillStyle = "rgba(255,255,255,.12)"; x.font = "bold 150px Poppins, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText(String(n), 200, 96); x.drawImage(logo, 280 - 120, 40, 96, 96); }
    else x.drawImage(logo, 280 - 146, 24, 128, 128);
    const g = x.createLinearGradient(0, 0, 112, 0); g.addColorStop(0, "rgba(27,41,85,1)"); g.addColorStop(1, "rgba(27,41,85,0)"); x.fillStyle = g; x.fillRect(0, 0, 112, 176);
    x.fillStyle = "#fff"; const R = 20; x.beginPath(); x.moveTo(280, 0); x.lineTo(280 - R, 0); x.arcTo(280, 0, 280, R, R); x.closePath(); x.fill();
    x.beginPath(); x.moveTo(280, 176); x.lineTo(280, 176 - R); x.arcTo(280, 176, 280 - R, 176, R); x.closePath(); x.fill();
    ASSETS["band" + n] = c.toDataURL("image/jpeg", .85).split(",")[1];
    // square tile thumbnail
    const [t, y] = cv(160, 160); drawArt(y, 160, 160, kind, n * 11);
    if (im) { const s = Math.min(150 / im.width, 150 / im.height); y.drawImage(im, (160 - im.width * s) / 2, (160 - im.height * s) / 2, im.width * s, im.height * s); }
    else { y.drawImage(logo, 32, 32, 96, 96); }
    ASSETS["thumb" + n] = t.toDataURL("image/jpeg", .85).split(",")[1];
  }
  const l = document.getElementById("logo"); if (l) l.src = ASSETS.logoURL;
  document.querySelectorAll('link[rel="icon"],link[rel="apple-touch-icon"]').forEach(e => e.href = ASSETS.logoURL);
}
async function ensureFonts(){
  if (ASSETS.fontR && ASSETS.fontB) return true;
  try {
    const base = "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/";
    const [r, b] = await Promise.all(["Poppins-Regular.ttf", "Poppins-Bold.ttf"].map(f => fetch(base + f).then(x => { if (!x.ok) throw 0; return x.arrayBuffer(); })));
    ASSETS.fontR = b64(r); ASSETS.fontB = b64(b); return true;
  } catch { return false; }
}
