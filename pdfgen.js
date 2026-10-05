/* Vortex weekly report PDF generator (jsPDF). Expects global ASSETS and LEVELS. */
const PDFGEN = (() => {
  const C = {
    NAVY: "#1B2955", INK: "#1A1F36", GREY: "#6B7280", LINE: "#D5DAE6", CARD: "#F3F5FB", SOFT: "#B9C2E0",
    SKY: "#067EEA", PUR: "#8F23D7", ROY: "#1B22E4", MINT: "#1DFEBF", DIGIT: "#24397E", WEEKLINE: "#4A5A94"
  };
  const W = 595.28, H = 841.89, M = 30, CW = W - 2 * M;
  const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const mix = (a, b, r) => a.map((v, i) => Math.round(v + (b[i] - v) * r));

  let FAM = "Poppins";
  function setup(doc) {
    if (!ASSETS.fontR || !ASSETS.fontB) { FAM = "helvetica"; return; } FAM = "Poppins";
    doc.addFileToVFS("Poppins-Regular.ttf", ASSETS.fontR);
    doc.addFont("Poppins-Regular.ttf", "Poppins", "normal");
    doc.addFileToVFS("Poppins-Bold.ttf", ASSETS.fontB);
    doc.addFont("Poppins-Bold.ttf", "Poppins", "bold");
  }

  function page(doc, d) {
    const n = d.level, L = LEVELS[n - 1];
    const font = (w, s, col) => { doc.setFont(FAM, w); doc.setFontSize(s); doc.setTextColor(col); };
    const fill = c => doc.setFillColor(c);
    const stroke = (c, w) => { doc.setDrawColor(c); doc.setLineWidth(w); };
    const txt = (s, x, y, o) => doc.text(String(s), x, y, o || {});
    const tw = s => doc.getTextWidth(String(s));
    const fit = (s, w, size, max) => { let z = size; doc.setFontSize(z); while (tw(s) > max && z > 6.4) { z -= 0.2; doc.setFontSize(z); } return z; };
    const opacity = o => doc.setGState(new doc.GState({ opacity: o }));
    const grad = (x, y, w, h) => {
      const st = [C.ROY, C.SKY, C.MINT, C.PUR].map(hex), k = 120;
      for (let i = 0; i < k; i++) {
        const f = i / (k - 1) * 3, j = Math.min(Math.floor(f), 2);
        doc.setFillColor(...mix(st[j], st[j + 1], f - j));
        doc.rect(x + w * i / k, y, w / k + 0.6, h, "F");
      }
    };
    const section = (title, x, t, col) => {
      fill(col); doc.roundedRect(x, t, 3.2, 12, 1.5, 1.5, "F");
      font("bold", 9.5, C.INK); txt(title, x + 9, t + 10);
    };
    const card = (x, t, w, h) => { fill(C.CARD); doc.roundedRect(x, t, w, h, 8, 8, "F"); };
    const box = (x, t, s, col, on, checkCol) => {
      if (on) {
        fill(col); doc.roundedRect(x, t, s, s, 2, 2, "F");
        stroke(checkCol || "#FFFFFF", s * 0.13); doc.setLineCap("round"); doc.setLineJoin("round");
        doc.lines([[s * 0.18, s * 0.18], [s * 0.33, -s * 0.38]], x + s * 0.25, t + s * 0.52, [1, 1], "S");
      } else {
        fill("#FFFFFF"); stroke(col, 1.1); doc.roundedRect(x, t, s, s, 2, 2, "FD");
      }
    };
    const wrap = (s, w, maxLines) => {
      let lines = doc.splitTextToSize(String(s || "").trim(), w);
      if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…"; }
      return lines;
    };

    // HEADER
    fill(C.NAVY); doc.rect(0, 0, W, 100, "F");
    opacity(0.16); fill(C.PUR); doc.circle(W - 50, 10, 80, "F"); fill(C.SKY); doc.circle(W - 150, 62, 38, "F"); opacity(1);
    fill("#FFFFFF"); doc.roundedRect(M, 18, 66, 66, 12, 12, "F");
    doc.addImage("data:image/png;base64," + ASSETS.logo, "PNG", M + 7, 25, 52, 52);
    font("bold", 8.5, C.MINT); txt("VORTEX SWIMMING ACADEMY", M + 82, 36);
    font("bold", 22, "#FFFFFF"); txt("Weekly Progress Report", M + 82, 60);
    font("normal", 8.5, C.SOFT); txt("A snapshot of your swimmer's week in the water", M + 82, 75);
    const bx = W - M - 122;
    opacity(0.08); fill("#FFFFFF"); doc.roundedRect(bx, 18, 122, 66, 10, 10, "F"); opacity(1);
    font("normal", 6.2, C.SOFT); txt("WEEK NO.", bx + 10, 28); txt("WEEK OF", bx + 10, 55);
    stroke(C.WEEKLINE, 0.7); doc.line(bx + 10, 46, bx + 112, 46); doc.line(bx + 10, 74, bx + 112, 74);
    font("bold", 11, "#FFFFFF"); txt(d.termWeek || "", bx + 10, 43);
    font("normal", 8.6, "#FFFFFF"); txt(d.weekLabel || "", bx + 10, 71);
    grad(0, 100, W, 4);

    // LEVEL BANNER
    let t = 114; const bh = 88;
    fill(C.NAVY); doc.roundedRect(M, t, CW, bh, 10, 10, "F");
    doc.addImage("data:image/jpeg;base64," + ASSETS["band" + n], "JPEG", W - M - 140, t, 140, bh);
    font("bold", L.badge.length > 1 ? 70 : 96, C.DIGIT); txt(L.badge, M + 56, t + 80, { align: "center" });
    font("bold", 17, C.SKY); fit(L.kicker, 100, 17, 100); txt(L.kicker, M + 56, t + 50, { align: "center" });
    font("bold", 21, "#FFFFFF"); fit(L.name, CW - 260, 21, CW - 260); txt(L.name, M + 112, t + 34);
    stroke(C.SKY, 1); doc.line(M + 112, t + 42, M + 340, t + 42);
    font("bold", 7.5, C.SKY); txt("GOAL", M + 112, t + 58);
    font("normal", 8.5, "#FFFFFF"); txt(L.goal, M + 140, t + 58);
    font("bold", 7.5, C.MINT); txt("NEXT", M + 112, t + 74);
    font("normal", 8.5, C.SOFT); txt(L.next || "", M + 140, t + 74);

    // SWIMMER INFO
    t = 212; card(M, t, CW, 80);
    const fw = (CW - 24 - 30) / 4;
    [["SWIMMER NAME", d.name], ["AGE", d.age], ["COACH", d.coach], ["GROUP / TRAINING DAYS", d.group]].forEach(([lab, val], i) => {
      const x = M + 12 + i * (fw + 10);
      font("normal", 6.5, C.GREY); txt(lab, x, t + 12);
      stroke(C.LINE, 0.8); doc.line(x, t + 34, x + fw, t + 34);
      font(i === 0 ? "bold" : "normal", 9, C.INK);
      const v = String(val || ""); fit(v, fw, 9, fw); txt(v, x, t + 30);
    });
    stroke(C.LINE, 0.8); doc.line(M + 12, t + 42, W - M - 12, t + 42);
    font("normal", 6.5, C.GREY); txt("ATTENDANCE", M + 12, t + 64);
    ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].forEach((dn, i) => {
      const x = M + 66 + i * 41;
      font("bold", 6.5, C.GREY); txt(dn, x, t + 64);
      box(x + 20, t + 54, 13, C.ROY, !!(d.att && d.att[i]));
    });
    const ax = M + 66 + 7 * 41 + 10;
    font("normal", 8.5, C.INK); txt("Sessions attended", ax, t + 64);
    const sx = ax + tw("Sessions attended") + 6;
    stroke(C.LINE, 0.8); doc.line(sx, t + 67, sx + 26, t + 67); doc.line(sx + 44, t + 67, sx + 70, t + 67);
    font("normal", 8.5, C.INK); txt("of", sx + 31, t + 64);
    font("bold", 10, C.INK); txt(String(d.attCount ?? ""), sx + 13, t + 64, { align: "center" }); txt(String(d.attTotal ?? ""), sx + 57, t + 64, { align: "center" });

    // SKILLS
    t = 304;
    section("Skills to Learn", M, t, C.SKY);
    font("normal", 7, C.GREY); txt("Stage reached this week", W - M, t + 10, { align: "right" });
    const cols = [["INTRODUCED", C.LINE, C.INK, C.ROY], ["DEVELOPING", C.SKY, "#FFFFFF", C.SKY], ["CONSISTENT", C.ROY, "#FFFFFF", C.ROY], ["MASTERED", C.PUR, "#FFFFFF", C.PUR]];
    const th = t + 20, cwid = 66, nameW = CW - 4 * cwid;
    fill(C.NAVY); doc.roundedRect(M, th, CW, 20, 6, 6, "F");
    font("bold", 7.5, "#FFFFFF"); txt("SKILL", M + 12, th + 13.5);
    cols.forEach(([lab, bg, fg], i) => {
      const x = M + nameW + i * cwid;
      fill(bg); doc.roundedRect(x + 5, th + 4.5, 56, 11, 5.5, 5.5, "F");
      font("bold", 6.3, fg); txt(lab, x + 33, th + 12.4, { align: "center" });
    });
    const dots = [C.ROY, C.SKY, C.PUR, C.MINT];
    L.skills.forEach((s, r) => {
      const ry = th + 20 + r * 20;
      if (r % 2 === 1) { fill(C.CARD); doc.rect(M, ry, CW, 20, "F"); }
      fill(dots[r % 4]); doc.circle(M + 13, ry + 10, 2.5, "F");
      font("normal", 8.5, C.INK); fit(s, nameW - 30, 8.5, nameW - 30); txt(s, M + 22, ry + 13.3);
      cols.forEach((c, i) => box(M + nameW + i * cwid + 26, ry + 3.5, 13, c[3], (d.skills && d.skills[r]) === i + 1));
    });
    const end = th + 20 + L.skills.length * 20;
    stroke(C.LINE, 0.8); doc.line(M, end, W - M, end);

    // ASSESSMENT + EFFORT
    t = end + 14; const lw = 338, rx = M + lw + 12, rw = CW - lw - 12, ch = 134;
    section("Assessment to Pass", M, t, C.PUR);
    card(M, t + 20, lw, ch);
    font("bold", 6.2, C.GREY); txt("NOT YET", M + lw - 78, t + 33, { align: "center" }); txt("ACHIEVED", M + lw - 30, t + 33, { align: "center" });
    L.assess.forEach((a, r) => {
      const ry = t + 38 + r * 17;
      fill(C.PUR); doc.roundedRect(M + 12, ry + 4, 8, 8, 2, 2, "F");
      font("normal", 8.2, C.INK); fit(a, lw - 140, 8.2, lw - 140); txt(a, M + 26, ry + 11);
      const v = d.assess ? d.assess[r] : 0;
      box(M + lw - 84, ry + 1, 12, C.GREY, v === 1);
      box(M + lw - 36, ry + 1, 12, C.PUR, v === 2);
    });
    const ry = t + 20 + ch - 28;
    fill(C.NAVY); doc.roundedRect(M + 8, ry, lw - 16, 22, 6, 6, "F");
    font("bold", 7.8, "#FFFFFF"); txt("Ready to move up?", M + 16, ry + 14);
    const rqw = tw("Ready to move up?");
    font("normal", 7.5, C.SOFT); fit(L.next || "", lw - 170 - rqw, 7.5, lw - 170 - rqw); txt(L.next || "", M + 16 + rqw + 5, ry + 14);
    [["Yes", M + lw - 110, C.MINT, 1], ["Not yet", M + lw - 66, C.SOFT, 2]].forEach(([lab, xx, col, val]) => {
      box(xx, ry + 5, 12, col, d.ready === val, C.NAVY);
      font("normal", 7.5, "#FFFFFF"); txt(lab, xx + 16, ry + 14);
    });

    section("Effort & Attitude", rx, t, C.ROY);
    card(rx, t + 20, rw, ch);
    const bx0 = rx + rw - 10 - 5 * 16;
    font("normal", 6, C.GREY); for (let k = 0; k < 5; k++) txt(String(k + 1), bx0 + k * 16 + 6, t + 33, { align: "center" });
    TRAITS.forEach((tr, j) => {
      const yy = t + 40 + j * 24;
      font("normal", 7.8, C.INK); txt(tr, rx + 10, yy + 9);
      const v = d.traits ? d.traits[j] : 0;
      for (let k = 0; k < 5; k++) box(bx0 + k * 16, yy, 12, C.ROY, k < v);
    });
    font("normal", 6.3, C.GREY); txt("1 = needs support   ·   5 = outstanding", rx + 10, t + 20 + ch - 10);

    // FOCUS / GOAL / HOME
    let t2 = t + 20 + ch + 14; const bw = (CW - 20) / 3, bh2 = 60;
    [["This Week's Focus", "What we worked on", C.SKY, d.focus], ["Next Week's Goal", "What we're aiming for", C.PUR, d.goal], ["Try at Home", "A small tip for parents", C.ROY, d.home]].forEach(([ttl, sub, col, val], i) => {
      const x = M + i * (bw + 10); card(x, t2, bw, bh2);
      fill(col); doc.roundedRect(x, t2, bw, 4, 2, 2, "F");
      font("bold", 8.8, C.INK); txt(ttl, x + 10, t2 + 19);
      font("normal", 6.5, C.GREY); txt(sub, x + 10, t2 + 28);
      if (val && String(val).trim()) {
        font("normal", 7.8, C.INK); wrap(val, bw - 20, 3).forEach((ln, k) => txt(ln, x + 10, t2 + 39 + k * 9.5));
      } else { stroke(C.LINE, 0.8); doc.line(x + 10, t2 + 44, x + bw - 10, t2 + 44); doc.line(x + 10, t2 + 57, x + bw - 10, t2 + 57); }
    });

    // COMMENT
    const t3 = t2 + bh2 + 12;
    section("Coach's Comment", M, t3, C.MINT);
    card(M, t3 + 18, CW, 52);
    if (d.comment && d.comment.trim()) {
      font("normal", 8.6, C.INK); wrap(d.comment, CW - 24, 4).forEach((ln, k) => txt(ln, M + 12, t3 + 31 + k * 11));
    } else { stroke(C.LINE, 0.8); doc.line(M + 12, t3 + 42, W - M - 12, t3 + 42); doc.line(M + 12, t3 + 57, W - M - 12, t3 + 57); }

    // SIGN-OFF
    const t4 = t3 + 18 + 52 + 12;
    font("normal", 6.5, C.GREY); txt("COACH", M, t4); txt("DATE", M + 205, t4); txt("PARENT SIGNATURE", M + 335, t4);
    stroke(C.INK, 0.6); doc.line(M, t4 + 20, M + 185, t4 + 20); doc.line(M + 205, t4 + 20, M + 315, t4 + 20); doc.line(M + 335, t4 + 20, W - M, t4 + 20);
    font("normal", 9, C.INK); if (d.coach) txt(d.coach, M, t4 + 16); if (d.date) txt(d.date, M + 205, t4 + 16);

    // FOOTER
    fill(C.NAVY); doc.rect(0, H - 26, W, 26, "F"); grad(0, H - 29, W, 3);
    doc.addImage("data:image/png;base64," + ASSETS.logo, "PNG", M, H - 21, 15, 15);
    font("bold", 8.5, "#FFFFFF"); txt("VORTEX", M + 19, H - 13.5); font("normal", 4.6, C.SOFT); txt("SWIMMING ACADEMY", M + 19.3, H - 8.3);
    font("normal", 7, C.SOFT); txt("Hamad Aquatic Center  ·  Aspire Zone, Doha, Qatar", W / 2, H - 10, { align: "center" });
    font("bold", 7, "#FFFFFF"); txt(`${L.short.toUpperCase()}  ·  ${L.name.toUpperCase()}`, W - M, H - 10, { align: "right" });
  }

  function build(JsPDF, list) {
    const doc = new JsPDF({ unit: "pt", format: "a4", compress: true });
    setup(doc);
    list.forEach((d, i) => { if (i) doc.addPage(); page(doc, d); });
    doc.setProperties({ title: list.length === 1 ? `${list[0].name} – Weekly Progress Report` : "Vortex Swimming Academy – Weekly Progress Reports", author: "Vortex Swimming Academy" });
    return doc;
  }
  return { build };
})();
