/* Branded decksheet PDFs (A4 landscape): every class is its own column card. Uses window.VX, ASSETS, LEVELS, jsPDF. */
(() => {
const NAVY = "#1B2955", INK = "#1A1F36", GREY = "#6B7280", LINE = "#D5DAE6", CARD = "#F3F5FB", SOFT = "#B9C2E0", SKY = "#067EEA", ROY = "#1B22E4", PUR = "#8F23D7", MINT = "#1DFEBF";
const LVC = ["#1B22E4", "#067EEA", "#8F23D7", "#0E9F7A", "#1B2955", "#E46AA8", "#C2489A", "#9B2C86", "#F08A24"];
const DAYN = { Sun: "Sunday", Mon: "Monday", Tue: "Tuesday", Wed: "Wednesday", Thu: "Thursday", Fri: "Friday", Sat: "Saturday" };
const W = 841.89, H = 595.28, M = 24, COLS = 5, GAP = 10, CW = (W - 2 * M - (COLS - 1) * GAP) / COLS, ROWH = 21, HEADH = 40;
const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const mix = (a, b, r) => a.map((v, i) => Math.round(v + (b[i] - v) * r));

async function build(mode, day, list){
  const V = window.VX;
  const fontsOk = await ensureFonts();
  const JsPDF = window.jspdf && window.jspdf.jsPDF; if (!JsPDF) return V.toast("The PDF tool didn't load – reload the page");
  const doc = new JsPDF({ unit: "pt", format: "a4", orientation: "landscape", compress: true });
  let FAM = "helvetica";
  if (fontsOk) { doc.addFileToVFS("Poppins-Regular.ttf", ASSETS.fontR); doc.addFont("Poppins-Regular.ttf", "Poppins", "normal"); doc.addFileToVFS("Poppins-Bold.ttf", ASSETS.fontB); doc.addFont("Poppins-Bold.ttf", "Poppins", "bold"); FAM = "Poppins"; }
  const font = (w, s, c) => { doc.setFont(FAM, w); doc.setFontSize(s); doc.setTextColor(c); };
  const fill = c => doc.setFillColor(c);
  const txt = (s, x, y, o) => doc.text(String(s), x, y, o || {});
  const fit = (s, max) => { s = String(s); if (doc.getTextWidth(s) <= max) return s; while (s.length > 1 && doc.getTextWidth(s + "…") > max) s = s.slice(0, -1); return s + "…"; };
  const grad = (x, y, w, h) => { const st = [ROY, SKY, MINT, PUR].map(hex), k = 90; for (let i = 0; i < k; i++) { const f = i / (k - 1) * 3, j = Math.min(Math.floor(f), 2); doc.setFillColor(...mix(st[j], st[j + 1], f - j)); doc.rect(x + w * i / k, y, w / k + 0.6, h, "F"); } };
  const title = mode === "master" ? "Master Decksheet" : "Instructor Decksheet";
  const total = list.length, today = new Date(), dateStr = `${today.getDate()} ${V.MON[today.getMonth()]} ${today.getFullYear()}`;
  let page = 0, y = 0;
  const header = () => {
    if (page) doc.addPage(); page++;
    fill(NAVY); doc.rect(0, 0, W, 62, "F");
    doc.setGState(new doc.GState({ opacity: 0.14 })); fill(PUR); doc.circle(W - 60, 6, 70, "F"); fill(SKY); doc.circle(W - 170, 52, 30, "F"); doc.setGState(new doc.GState({ opacity: 1 }));
    fill("#FFFFFF"); doc.roundedRect(M, 11, 40, 40, 8, 8, "F");
    try { doc.addImage("data:image/png;base64," + ASSETS.logo, "PNG", M + 4, 15, 32, 32); } catch (e) {}
    font("bold", 7.5, MINT); txt("VORTEX SWIMMING ACADEMY", M + 52, 25);
    font("bold", 18, "#FFFFFF"); txt(`${title} · ${DAYN[day]}`, M + 52, 45);
    font("normal", 8, SOFT); txt(`${V.S.term && V.S.term.name ? V.S.term.name + " · " : ""}${total} swimmers · 40-min classes · max 4 per class (Nitro Needlefish 8)`, W - M, 27, { align: "right" });
    txt(`Printed ${dateStr} · page ${page}`, W - M, 41, { align: "right" });
    grad(0, 62, W, 3);
    font("normal", 6.5, GREY); txt("Hamad Aquatic Center · Aspire Zone, Doha", M, H - 12); txt(title, W - M, H - 12, { align: "right" });
    y = 78;
  };
  const section = (label, sub) => {
    if (y + 18 + HEADH + ROWH > H - 26) header();
    fill(CARD); doc.roundedRect(M, y, W - 2 * M, 18, 5, 5, "F"); fill(SKY); doc.roundedRect(M, y, 4, 18, 2, 2, "F");
    font("bold", 9.5, INK); txt(label, M + 12, y + 12.5); const lw = doc.getTextWidth(label); font("normal", 7.5, GREY); txt(sub, M + 22 + lw, y + 12.5);
    y += 26;
  };
  const cardH = n => HEADH + Math.max(n, 1) * ROWH + 6;
  // classes: [{ head, sub, items }] laid out COLS per row
  const cards = classes => {
    for (let i = 0; i < classes.length; i += COLS) {
      const row = classes.slice(i, i + COLS), h = Math.max(...row.map(c => cardH(c.items.length)));
      if (y + h > H - 26) { header(); }
      row.forEach((c, j) => {
        const x = M + j * (CW + GAP), n = c.items.length, pt = c.items.every(e => e.kid.level === 9), max = c.items.every(e => e.kid.level === 5) ? 8 : 4;
        const over = !pt && n > max, full = !pt && n === max;
        fill("#FFFFFF"); doc.setDrawColor(LINE); doc.setLineWidth(0.8); doc.roundedRect(x, y, CW, h, 8, 8, "FD");
        fill(NAVY); doc.roundedRect(x, y, CW, HEADH, 8, 8, "F"); doc.rect(x, y + HEADH - 8, CW, 8, "F");
        font("bold", 10, "#FFFFFF"); txt(fit(c.head, CW - 52), x + 9, y + 16);
        font("normal", 7, SOFT); txt(fit(c.sub, CW - 52), x + 9, y + 30);
        if (!pt) { fill(over ? "#F4C7C3" : full ? MINT : "#2C3A63"); doc.roundedRect(x + CW - 40, y + 9, 32, 14, 7, 7, "F");
          font("bold", 8, over ? "#8A1C14" : full ? NAVY : "#FFFFFF"); txt(`${n}/${max}`, x + CW - 24, y + 19, { align: "center" }); }
        c.items.forEach((e, r) => {
          const ry = y + HEADH + 3 + r * ROWH, L = LEVELS[e.kid.level - 1] || { code: "", short: "" };
          if (r % 2) { fill(CARD); doc.rect(x + 1, ry, CW - 2, ROWH, "F"); }
          fill(LVC[(e.kid.level - 1) % LVC.length]); doc.roundedRect(x + 7, ry + 5, 24, 11, 5.5, 5.5, "F");
          font("bold", 6.3, "#FFFFFF"); txt(L.code || "", x + 19, ry + 12.6, { align: "center" });
          font("bold", 7.6, INK); txt(fit(e.kid.name, CW - 66), x + 36, ry + 11);
          font("normal", 6.3, GREY); txt(fit([V.ageOf(e.kid) && "Age " + V.ageOf(e.kid), e.lane && c.showLane && "Lane " + e.lane].filter(Boolean).join(" · "), CW - 66), x + 36, ry + 18.5);
          doc.setDrawColor(LINE); doc.setLineWidth(0.6); doc.rect(x + CW - 18, ry + 5, 10, 10, "S");
        });
        if (!n) { font("normal", 7, GREY); txt("No swimmers", x + 9, y + HEADH + 16); }
      });
      y += h + GAP;
    }
  };
  header();
  const lanesOf = it => [...new Set(it.map(e => e.lane).filter(Boolean))];
  if (mode === "master") {
    const byTime = {}; list.forEach(e => (byTime[e.time] = byTime[e.time] || []).push(e));
    Object.keys(byTime).sort((a, b) => V.timeVal(a) - V.timeVal(b)).forEach(t => {
      const g = {}; byTime[t].forEach(e => (g[V.norm(e.coach)] = g[V.norm(e.coach)] || []).push(e));
      const classes = Object.values(g).sort((a, b) => a[0].coach.localeCompare(b[0].coach)).map(it => { const ln = lanesOf(it);
        return { head: it[0].coach, sub: "Coach" + (ln.length ? " · Lane " + ln.join(", ") : ""), items: it.sort((a, b) => a.kid.level - b.kid.level || a.kid.name.localeCompare(b.kid.name)), showLane: ln.length > 1 }; });
      section(`${day} ${V.fmtTime(t)}`, `${byTime[t].length} swimmers · ${classes.length} class${classes.length === 1 ? "" : "es"}`);
      cards(classes);
    });
  } else {
    const byCoach = {}; list.forEach(e => (byCoach[e.coach] = byCoach[e.coach] || []).push(e));
    Object.keys(byCoach).sort().forEach((c, ci) => {
      if (ci && y > 78) header();
      const byT = {}; byCoach[c].forEach(e => (byT[e.time] = byT[e.time] || []).push(e));
      const classes = Object.keys(byT).sort((a, b) => V.timeVal(a) - V.timeVal(b)).map(t => { const it = byT[t], ln = lanesOf(it);
        return { head: `${day} ${V.fmtTime(t)}`, sub: ln.length ? "Lane " + ln.join(", ") : "", items: it.sort((a, b) => a.kid.level - b.kid.level || a.kid.name.localeCompare(b.kid.name)), showLane: ln.length > 1 }; });
      section(`Coach ${c}`, `${byCoach[c].length} swimmers · ${classes.length} class${classes.length === 1 ? "" : "es"}`);
      cards(classes);
    });
  }
  if (!list.length) { font("normal", 11, GREY); txt("No swimmers for this day and filters.", M, 100); }
  doc.setProperties({ title: `${title} – ${DAYN[day]}`, author: "Vortex Swimming Academy" });
  V.deliver(`${title} – ${DAYN[day]}.pdf`, doc.output("blob"));
}
window.VXDP = { build };
})();
