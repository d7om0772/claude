// =============================================================================
// shortcuts — قالب حزمة 13_mini_desk_diorama: "مكتب مصغّر ثلاثي الأبعاد (كيبورد وشاشتين)"
// غرفة مكتب مصغّرة تتركب بنطّات، الكاميرا ثابتة قدام الشاشتين وتقرّب/تبعد بنعومة (0.85ث)،
// الأزرار تنضغط مع نطق اسمها، نبضة ضوء في الكيبل، والنتيجة على الشاشة. العناصر E01–E17
// حسب brand/styles/shortcuts/02_elements/elements.md (+ X01 عروض شاشة إضافية بنفس الأسلوب).
// =============================================================================
import { boot, THREE, K, el, esc, rich, life, prog, clamp, lerp, E, fmt, lastStarted } from "../common/core.js";
const { PAL } = K;
const ORD = ["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع"];
const MONW = 2.55, MONH = 1.5;
const LM = { x: -1.42, z: -0.75 }, RM = { x: 1.42, z: -0.75 };

// ---------------- محتوى الشاشات ----------------
const SYMBOLS = ["♥", "★", "⚡", "☀", "☁", "♪", "✓", "☂", "✿", "⚙", "✉", "☕"];   // أشياء ورموز فقط — بدون وجوه أو كائنات حية
const MATH = ["Ω", "π", "∞", "±", "≈", "√", "∑", "°", "©", "€", "→", "✓"];
function demo(ctx) {
  return (g, w, h, s) => {
    const p = s.p ?? 1, m = s.mode || "desktop";
    const desk = (o = {}) => { K.screenBg(g, w, h); K.taskbar(g, w, h); };
    if (m === "logo") return K.logoScreen(g, w, h, ctx.logoFull, ctx.logoIcon);
    if (m === "title") { desk(); const q = E.outBack(clamp(p * 2.5));
      g.save(); g.translate(w / 2, h * 0.44); g.scale(0.7 + 0.3 * q, 0.7 + 0.3 * q);
      K.text(g, s.big || "", 0, -h * 0.06, { size: h * 0.32, color: "#fff", font: K.FONT_EN, weight: 800 });
      K.text(g, s.text || "", 0, h * 0.2, { size: h * 0.1, color: "#fff" }); g.restore(); return; }
    if (m === "clock") { desk(); const cx = w / 2, cy = h * 0.44, r = h * 0.28;
      g.fillStyle = "#fff"; g.beginPath(); g.arc(cx, cy, r, 0, 7); g.fill(); g.lineWidth = h * 0.02; g.strokeStyle = PAL.navy; g.stroke();
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.fillStyle = PAL.navy; g.beginPath(); g.arc(cx + Math.sin(a) * r * 0.82, cy - Math.cos(a) * r * 0.82, h * 0.008, 0, 7); g.fill(); }
      const spin = (s.spins ?? 3) * Math.PI * 2 * E.inOutCubic(clamp(p)); const hand = (a, L, wd) => { g.lineCap = "round"; g.lineWidth = wd; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.sin(a) * L, cy - Math.cos(a) * L); g.stroke(); };
      g.strokeStyle = PAL.navy; hand(-0.9 + spin / 12, r * 0.5, h * 0.022); g.strokeStyle = PAL.brand; hand(1.2 + spin, r * 0.72, h * 0.014);
      if (s.text) K.text(g, s.text, cx, h * 0.83, { size: h * 0.08, color: "#fff" }); return; }
    if (m === "move_out" || m === "move_in") { desk(); const q = E.inOutCubic(clamp(p / 0.6)); const back = s.back ? E.inOutCubic(clamp((p - 0.7) / 0.3)) : 0;
      const off = m === "move_out" ? q - back : (q - back) - 1;   // out: 0→1 يطلع يمين ؛ in: -1→0 يدخل من اليسار
      K.windowBox(g, w * 0.22 + off * w * 1.05, h * 0.16, w * 0.56, h * 0.58, s.title || "Documents", { lines: 5 }); return; }
    if (m === "desktop_new") { const q = E.inOutCubic(clamp(p / 0.25));
      g.save(); g.translate(-q * w, 0); desk(); K.windowBox(g, w * 0.12, h * 0.12, w * 0.5, h * 0.5, "Mail"); K.windowBox(g, w * 0.4, h * 0.22, w * 0.5, h * 0.52, "Docs"); g.restore();
      g.save(); g.translate((1 - q) * w, 0); desk(); g.restore();
      if (q > 0.6) { const b = E.outBack(clamp((p - 0.3) / 0.2)); g.save(); g.translate(w / 2, h * 0.8); g.scale(b, b);
        g.fillStyle = "#fff"; K.rr(g, -w * 0.12, -h * 0.05, w * 0.24, h * 0.1, h * 0.05); g.fill(); K.text(g, s.label || "Desktop 2", 0, 2, { size: h * 0.055, color: PAL.ink, font: K.FONT_EN, weight: 700 }); g.restore(); }
      return; }
    if (m === "browser_close" || m === "browser_restore") {
      g.fillStyle = "#fff"; g.fillRect(0, 0, w, h); g.fillStyle = "#E8EEF8"; g.fillRect(0, 0, w, h * 0.13);
      const tabs = s.tabs || ["News", "Specs", "Prices"]; const tw = w * 0.24;
      let third = 1, glow = 0;
      if (m === "browser_close") third = 1 - E.inOutCubic(clamp((p - 0.55) / 0.2));
      else { third = E.outBack(clamp(p / 0.25)); glow = 1 - clamp((p - 0.25) / 0.5); }
      tabs.forEach((t, i) => { const sc = i === 2 ? third : 1; if (sc <= 0.01) return; const x = w * 0.03 + i * (tw + 10);
        g.fillStyle = i === 2 ? "#fff" : "#D6DFF0"; K.rr(g, x, h * 0.03, tw * sc, h * 0.1, 12); g.fill();
        if (i === 2 && glow > 0) { g.strokeStyle = `rgba(58,123,213,${glow})`; g.lineWidth = 8; K.rr(g, x - 3, h * 0.03 - 3, tw * sc + 6, h * 0.1 + 6, 14); g.stroke(); }
        if (sc > 0.5) { K.text(g, t, x + 24, h * 0.083, { size: h * 0.05, weight: 600, align: "left", color: PAL.ink }); K.text(g, "×", x + tw * sc - 26, h * 0.083, { size: h * 0.05, weight: 500, color: PAL.muted }); } });
      g.fillStyle = "#DCE5F5"; for (let i = 0; i < 6; i++) { K.rr(g, w * 0.06, h * 0.24 + i * h * 0.1, w * 0.86 * (0.9 - (i % 3) * 0.2), h * 0.04, 10); g.fill(); }
      if (m === "browser_close") { const q = E.inOutCubic(clamp(p / 0.5)); const tx = w * 0.03 + 2 * (tw + 10) + tw - 26, ty = h * 0.083;
        K.cursor(g, lerp(w * 0.55, tx, q), lerp(h * 0.6, ty, q), h / 500); if (p > 0.5 && p < 0.6) { g.fillStyle = "rgba(58,123,213,.35)"; g.beginPath(); g.arc(tx, ty, h * 0.04, 0, 7); g.fill(); } }
      return; }
    if (m === "emoji" || m === "symbols") { desk(); K.windowBox(g, w * 0.08, h * 0.1, w * 0.84, h * 0.72, "Notes", { lines: 0 });
      K.text(g, s.text || "مرحبا", w * 0.82, h * 0.3, { size: h * 0.08, color: PAL.ink, align: "right" });
      const q = E.outBack(clamp(p / 0.25)); g.save(); g.translate(w * 0.5, h * 0.36); g.scale(q, q);
      g.save(); g.shadowColor = "rgba(20,40,75,.3)"; g.shadowBlur = 24; g.fillStyle = "#fff"; K.rr(g, -w * 0.2, 0, w * 0.4, h * 0.42, 18); g.fill(); g.restore();
      const symTab = m === "symbols" && p > 0.2; ["☺︎".replace("☺︎", "♥"), "Ω"].forEach((tb, i) => { g.fillStyle = (i === 1) === symTab ? "#DCE8FF" : "#F3F6FC"; K.rr(g, -w * 0.18 + i * w * 0.09, h * 0.02, w * 0.08, h * 0.06, 10); g.fill();
        K.text(g, tb, -w * 0.14 + i * w * 0.09, h * 0.05, { size: h * 0.045, color: PAL.ink, font: K.FONT_EN }); });
      const set = symTab ? MATH : SYMBOLS; set.forEach((c, i) => { const cx = -w * 0.15 + (i % 4) * w * 0.1, cy = h * 0.14 + Math.floor(i / 4) * h * 0.09;
        K.text(g, c, cx, cy + h * 0.02, { size: h * 0.06, color: i % 3 === 0 ? PAL.brand : PAL.ink, font: K.FONT_EN }); });
      g.restore();
      if (m === "symbols" && p > 0.65) { const b = E.outBack(clamp((p - 0.65) / 0.15)); g.save(); g.translate(w * 0.33, h * 0.3); g.scale(b, b); K.text(g, "✓", 0, 0, { size: h * 0.09, color: PAL.brand, font: K.FONT_EN }); g.restore(); }
      return; }
    if (m === "delete_word" || m === "delete_chars") { desk(); K.windowBox(g, w * 0.06, h * 0.12, w * 0.88, h * 0.62, "Notes", { lines: 0 });
      const words = (s.text || "الاختصارات توفر وقتك كل يوم").split(" "); let shown = words.join(" ");
      if (m === "delete_word") { const last = words[words.length - 1]; const flash = p > 0.3 && p < 0.55; const gone = p >= 0.55;
        const head = words.slice(0, -1).join(" "); K.text(g, head, w * 0.86, h * 0.36, { size: h * 0.11, color: PAL.ink, align: "right" });
        g.font = `800 ${h * 0.11}px ${K.FONT_AR}`; const hw = g.measureText(head + " ").width;
        if (!gone) { if (flash) { g.fillStyle = "rgba(255,51,71,.25)"; const lw = g.measureText(last).width; K.rr(g, w * 0.86 - hw - lw - 8, h * 0.29, lw + 16, h * 0.14, 8); g.fill(); }
          K.text(g, last, w * 0.86 - hw, h * 0.36, { size: h * 0.11, color: flash ? PAL.problem : PAL.ink, align: "right" }); }
      } else { const n = Math.floor(clamp(p) * (s.chars ?? 4)); shown = shown.slice(0, Math.max(0, shown.length - n));
        K.text(g, shown, w * 0.86, h * 0.36, { size: h * 0.11, color: PAL.ink, align: "right" }); }
      return; }
    if (m === "save" || m === "share") { desk(); const q = E.outBack(clamp(p / 0.3)); g.save(); g.translate(w / 2, h * 0.4); g.scale(q, q);
      g.fillStyle = "#fff"; K.rr(g, -h * 0.17, -h * 0.17, h * 0.34, h * 0.34, h * 0.06); g.fill(); g.fillStyle = PAL.brand; g.strokeStyle = PAL.brand; g.lineWidth = h * 0.022; g.lineCap = "round";
      if (m === "save") { g.beginPath(); g.moveTo(-h * 0.07, -h * 0.1); g.lineTo(h * 0.07, -h * 0.1); g.lineTo(h * 0.07, h * 0.1); g.lineTo(0, h * 0.05); g.lineTo(-h * 0.07, h * 0.1); g.closePath(); g.fill(); }
      else { g.beginPath(); g.moveTo(0, h * 0.06); g.lineTo(0, -h * 0.09); g.moveTo(-h * 0.05, -h * 0.04); g.lineTo(0, -h * 0.09); g.lineTo(h * 0.05, -h * 0.04); g.stroke();
        g.beginPath(); g.moveTo(-h * 0.08, 0); g.lineTo(-h * 0.08, h * 0.1); g.lineTo(h * 0.08, h * 0.1); g.lineTo(h * 0.08, 0); g.stroke(); }
      g.restore(); K.text(g, s.text || (m === "save" ? "احفظ" : "علّمه"), w / 2, h * 0.76, { size: h * 0.15, color: "#fff" }); return; }
    // ---- X01: عروض إضافية بنفس الأسلوب ----
    if (m === "snip") { desk(); K.windowBox(g, w * 0.08, h * 0.1, w * 0.5, h * 0.5, "Docs"); K.windowBox(g, w * 0.42, h * 0.2, w * 0.5, h * 0.52, "Browser");
      g.fillStyle = "rgba(10,20,40,.42)"; g.fillRect(0, 0, w, h); g.fillStyle = "#fff"; K.rr(g, w / 2 - w * 0.16, h * 0.03, w * 0.32, h * 0.09, 12); g.fill();
      for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? PAL.brand : "#B8C7E6"; K.rr(g, w / 2 - w * 0.14 + i * w * 0.072, h * 0.045, w * 0.05, h * 0.06, 8); g.fill(); }
      const q = E.inOutCubic(clamp((p - 0.15) / 0.55)); const x0 = w * 0.25, y0 = h * 0.22, ww = w * 0.45 * q, hh = h * 0.45 * q;
      if (q > 0) { g.save(); g.beginPath(); g.rect(x0, y0, ww, hh); g.clip(); K.screenBg(g, w, h); K.windowBox(g, w * 0.08, h * 0.1, w * 0.5, h * 0.5, "Docs"); K.windowBox(g, w * 0.42, h * 0.2, w * 0.5, h * 0.52, "Browser"); g.restore();
        g.strokeStyle = "#fff"; g.lineWidth = 4; g.setLineDash([12, 8]); g.strokeRect(x0, y0, ww, hh); g.setLineDash([]); }
      return; }
    if (m === "clipboard") { desk(); const a = E.outCubic(clamp(p / 0.25)); const pw = w * 0.36, x = w * 0.6, y = h * 0.92 - h * 0.78 * a;
      g.save(); g.shadowColor = "rgba(20,40,75,.3)"; g.shadowBlur = 24; g.fillStyle = "#fff"; K.rr(g, x, y, pw, h * 0.72, 16); g.fill(); g.restore();
      K.text(g, "Clipboard", x + 24, y + h * 0.06, { size: h * 0.05, align: "left", font: K.FONT_EN, weight: 700 });
      (s.items || ["Meeting 4 PM", "photo.png", "RTX specs", "Order #4821"]).forEach((it, i) => { const sel = p > 0.45 && i === Math.min(3, Math.floor((p - 0.45) * 8));
        g.fillStyle = sel ? "#DCE8FF" : "#F3F6FC"; K.rr(g, x + 16, y + h * 0.11 + i * h * 0.145, pw - 32, h * 0.12, 12); g.fill();
        K.text(g, it, x + 34, y + h * 0.17 + i * h * 0.145, { size: h * 0.045, align: "left", font: K.FONT_EN, weight: 600 }); }); return; }
    if (m === "taskmgr") { desk(); g.globalAlpha = clamp(p / 0.12); K.windowBox(g, w * 0.08, h * 0.06, w * 0.84, h * 0.8, "Task Manager", { lines: 0 });
      (s.rows || [["Browser", 34], ["Game", 51], ["Updater", 8], ["Chat", 3]]).forEach(([n, c], i) => { const y = h * 0.24 + i * h * 0.14;
        K.text(g, n, w * 0.13, y, { size: h * 0.05, align: "left", font: K.FONT_EN, weight: 600 }); g.fillStyle = c > 30 ? "#FFD2D7" : "#DCE8FF"; K.rr(g, w * 0.45, y - h * 0.025, w * 0.32 * (c / 60) * clamp(p * 2), h * 0.05, 8); g.fill();
        K.text(g, `${Math.round(c * clamp(p * 2))}%`, w * 0.86, y, { size: h * 0.05, align: "right", font: K.FONT_EN, weight: 700 }); }); g.globalAlpha = 1; return; }
    if (m === "snap") { K.screenBg(g, w, h); const q = E.inOutCubic(clamp((p - 0.2) / 0.5));
      K.windowBox(g, lerp(w * 0.12, 6, q), lerp(h * 0.12, 6, q), lerp(w * 0.42, w / 2 - 9, q), lerp(h * 0.5, h * 0.86, q), "Docs");
      K.windowBox(g, lerp(w * 0.45, w / 2 + 3, q), lerp(h * 0.25, 6, q), lerp(w * 0.42, w / 2 - 9, q), lerp(h * 0.5, h * 0.86, q), "Browser"); K.taskbar(g, w, h); return; }
    if (m === "lock") { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1D2C48"); gr.addColorStop(1, "#2F6BCF"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      g.globalAlpha = clamp(p / 0.2); K.text(g, s.time || "10:24", w / 2, h * 0.42, { size: h * 0.26, weight: 300, color: "#fff", font: K.FONT_EN });
      g.strokeStyle = "#fff"; g.lineWidth = h * 0.018; g.beginPath(); g.arc(w / 2, h * 0.68, h * 0.05, Math.PI, 0); g.stroke(); g.fillStyle = "#fff"; K.rr(g, w / 2 - h * 0.075, h * 0.67, h * 0.15, h * 0.11, 10); g.fill(); g.globalAlpha = 1; return; }
    if (m === "text") { desk(); K.text(g, s.text || "", w / 2, h * 0.45, { size: h * (s.size || 0.16), color: "#fff", font: /^[\x00-\x7F]+$/.test(s.text || "") ? K.FONT_EN : K.FONT_AR }); return; }
    desk(); if (s.windows !== false) { K.windowBox(g, w * 0.1, h * 0.12, w * 0.46, h * 0.5, "Mail"); K.windowBox(g, w * 0.42, h * 0.22, w * 0.48, h * 0.52, "Docs"); }
  };
}

function buildRoom(ctx) {
  const { scene } = ctx; const items = [];
  K.lights(scene, { yaw: 18, shadowSize: 9 });
  const rm = K.room(scene, { w: 9.2, d: 5.6, h: 5.6, floorY: -2.35, right: true, rugX: 0, rugZ: 1.5 });
  const root = new THREE.Group(); scene.add(root);
  const desk = K.desk(root, { w: 6.4, d: 2.5, legH: 2.2 }); items.push(desk);
  const mons = { left: K.monitor(root, { w: MONW, h: MONH, draw: demo(ctx) }), right: K.monitor(root, { w: MONW, h: MONH, draw: demo(ctx) }) };
  mons.left.position.set(LM.x, 0, LM.z); mons.right.position.set(RM.x, 0, RM.z); items.push(mons.left, mons.right);
  const kb = K.keyboard(root, { u: 0.158 }); kb.position.set(-1.25, 0, 0.45); kb.rotation.x = 0.06; items.push(kb);
  const pad = K.rbox(1.1, 0.025, 0.85, 0.04, PAL.light); K.place(pad, 1.15, 0.012, 0.5, root); items.push(pad);
  const ms = K.mouse(root); ms.position.set(1.15, 0.02, 0.5); items.push(ms);
  const mg = K.mug(root); mg.position.set(2.65, 0, 0.35); items.push(mg);
  const pc = K.rbox(0.85, 1.75, 1.6, 0.06, PAL.white); K.place(pc, 2.35, -1.47, -0.2, root); items.push(pc);
  const plate = K.logoPlate(root, ctx.logoIcon, { w: 0.95, h: 1.1 }); plate.position.set(-3.55, 1.75, -2.6); items.push(plate);
  // ساعة الجدار + نافذة
  const clockTex = K.canvasTex(256, 256, (g, w, h, s) => { g.fillStyle = "#fff"; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill(); g.lineWidth = 14; g.strokeStyle = PAL.brand; g.stroke();
    g.strokeStyle = PAL.navy; g.lineCap = "round"; const hand = (a, L, wd) => { g.lineWidth = wd; g.beginPath(); g.moveTo(128, 128); g.lineTo(128 + Math.sin(a) * L, 128 - Math.cos(a) * L); g.stroke(); };
    hand(s.h, 55, 12); hand(s.m, 85, 7); });
  const clock = new THREE.Mesh(new THREE.CircleGeometry(0.42, 48), new THREE.MeshBasicMaterial({ map: clockTex.tex })); K.place(clock, 3.5, 2.55, -2.62, root); items.push(clock);
  const win = new THREE.Group(); K.place(K.rbox(1.0, 1.5, 0.08, 0.04, "#FFFFFF"), 0, 0, 0, win); K.place(K.rbox(0.86, 1.36, 0.02, 0.02, "#CFE0FA"), 0, 0, 0.045, win);
  K.place(K.box(0.04, 1.36, 0.03, "#FFFFFF"), 0, 0, 0.06, win); win.position.set(3.5, 1.1, -2.63); root.add(win); items.push(win);
  // الكيبل: من الكيبورد للشاشة الرئيسية
  const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.25, 0.08, 0.05), new THREE.Vector3(-1.3, 0.03, -0.35), new THREE.Vector3(LM.x, 0.03, LM.z + 0.2), new THREE.Vector3(LM.x, 0.4, LM.z - 0.08), new THREE.Vector3(LM.x, 0.95, LM.z - 0.08)]);
  const cable = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.022, 8, false), K.mat(PAL.navy)); root.add(cable);
  const pulse = K.glowSprite("#78afff", 0.45); root.add(pulse); const core = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), new THREE.MeshBasicMaterial({ color: "#8fc0ff", transparent: true })); root.add(core);
  items.forEach((it, i) => { it.userData.popDelay = 0.06 * i; it.userData.baseScale = it.scale.clone(); });
  return { root, rm, items, mons, kb, clockTex, curve, pulse, core };
}

const POSE = {
  wide: { target: [0, 0.55, -0.4], yaw: 0, pitch: 13, zoom: 1.12, shiftY: 0.55 },
  screens: { target: [0, 1.45, -0.6], yaw: 0, pitch: 9, zoom: 1.6, shiftY: 0.0 },
  main: { target: [-1.3, 0.95, -0.15], yaw: 0, pitch: 24, zoom: 2.05, shiftY: -0.1 },
  left: { target: [LM.x, 1.5, LM.z], yaw: 0, pitch: 6, zoom: 2.5, shiftY: 0.0 },
  right: { target: [RM.x, 1.5, RM.z], yaw: 0, pitch: 6, zoom: 2.5, shiftY: 0.0 },
  logo: { target: [LM.x, 1.5, LM.z], yaw: 0, pitch: 3, zoom: 2.9, shiftY: -0.05 },
};
const VAR = [{ yaw: 0 }, { yaw: 6 }, { yaw: -6 }, { yaw: 3, pitch: 2 }];
const CAM_FOR = { E01: "wide", E02: "wide", E03: "screens", E04: "main", E05: "main", E06: "screens", E07: "screens", E08: "left",
  E09: "main", E10: "main", E11: "main", E12: "main", E13: "main", E14: "main", E15: "screens", E16: "screens" };

async function build(ctx) {
  const R = buildRoom(ctx); ctx.R = R;
  ctx.screens = { left: [{ start: 0, mode: "desktop" }], right: [{ start: 0, mode: "desktop", windows: false }] };
  ctx.pulses = []; ctx.glows = []; ctx.presses = [];
  const evs = (ctx.data.events || []).slice().sort((a, b) => a.start - b.start);
  const v = VAR[ctx.variant % VAR.length];
  const pose = (n) => ({ ...POSE[n], yaw: (POSE[n].yaw || 0) + (v.yaw || 0), pitch: POSE[n].pitch + (v.pitch || 0) });
  const keys = [{ t: 0, pose: pose("wide") }];
  for (const e of evs) { const n = e.params?.cam || CAM_FOR[e.el]; if (n) keys.push({ t: e.start, pose: pose(n), dur: 0.85 }); }
  keys.push({ t: ctx.closingStart - 0.35, pose: pose("logo"), dur: 0.85 }); keys.sort((a, b) => a.t - b.t);
  ctx.camKeys = keys;
  ctx.screens.left.push({ start: ctx.closingStart - 0.35, mode: "logo" });
  const sortS = () => { ctx.screens.left.sort((a, b) => a.start - b.start); ctx.screens.right.sort((a, b) => a.start - b.start); };
  ctx.sortS = sortS;
  return {
    curtain: (t) => { const k = lastStarted(ctx.camKeys, t, "t"); return k && k.pose.zoom > 1.3 && t < ctx.closingStart - 0.4 ? clamp((t - k.t) / 0.5) : (k && k.pose.zoom <= 1.3 ? 1 - clamp((t - k.t) / 0.5) : 0); },
    update(t) {
      // تركيب الغرفة بنطّات مطاطية + طفو هادئ
      for (const it of R.items) { const q = E.spring(clamp((t - it.userData.popDelay) / 0.7)); it.scale.copy(it.userData.baseScale).multiplyScalar(Math.max(0.001, q)); }
      R.root.position.y = 0.035 * Math.sin(t * 1.1); R.rm.position.y = R.root.position.y;
      K.setCam(ctx.camera, K.cameraTrack(ctx.camKeys, t));
      R.clockTex.redraw({ h: -0.9 + t * 0.002, m: 1.2 + Math.floor(t) * 0.105 });
      // الأزرار
      R.kb.userData.reset();
      for (const pr of ctx.presses) pr.keys.forEach((k, i) => { const kt = pr.times[i]; if (t >= kt && t <= pr.end) R.kb.userData.press(k, clamp((t - kt) / 0.1) * (1 - 0.3 * clamp((t - pr.end + 0.2) / 0.2))); });
      // نبضة الكيبل
      let pa = 0, pp = 0; for (const s of ctx.pulses) if (t >= s && t < s + 0.45) { pp = clamp((t - s) / 0.25); pa = t < s + 0.25 ? 1 : 1 - (t - s - 0.25) / 0.2; }
      const pt = R.curve.getPoint(pp); R.pulse.position.copy(pt); R.core.position.copy(pt); R.pulse.material.opacity = pa; R.core.material.opacity = pa; R.core.visible = pa > 0;
      // توهج إطارات الشاشتين (E07)
      let gl = 0; for (const gq of ctx.glows) if (t >= gq.start && t <= gq.end + 0.3) gl = Math.max(gl, (0.5 + 0.5 * Math.sin((t - gq.start) * 9)) * (1 - clamp((t - gq.end) / 0.3)));
      for (const m of [R.mons.left, R.mons.right]) { m.userData.frameMat.emissive.set(PAL.accent); m.userData.frameMat.emissiveIntensity = gl * 1.3; }
      // الشاشتين
      for (const side of ["left", "right"]) { const s = lastStarted(ctx.screens[side], t); R.mons[side].userData.tex.redraw({ ...s, p: s.dur ? Math.round(prog(t, s.start, s.dur) * 45) / 45 : 1 }); }
    },
  };
}

const scr = (side, mode, extra = {}) => ({
  setup(ev, ctx) { ctx.screens[ev.params.screen || side].push({ start: ev.start, mode, dur: Math.max(0.5, ev.end - ev.start), ...extra, ...ev.params }); ctx.sortS(); },
});
const handlers = {
  // E01 المشهد الافتتاحي — {big:"5", text:"اختصارات", clock:true}
  E01: { setup(ev, ctx) { const p = ev.params; ctx.screens.left.push({ start: ev.start, mode: "title", big: p.big ?? "", text: p.text ?? "", dur: 0.8 });
    if (p.clock !== false) ctx.screens.right.push({ start: ev.start, mode: "clock", spins: 0.3, dur: 2 }); ctx.sortS(); } },
  // E02 الساعة الدوارة — {text:"وقت", spins:3}
  E02: { setup(ev, ctx) { ctx.screens[ev.params.screen || "right"].push({ start: ev.start, mode: "clock", spins: ev.params.spins ?? 3, text: ev.params.text, dur: Math.max(1.2, ev.end - ev.start) }); ctx.sortS(); } },
  // E03 شارة الاختصار وأزراره — {index:1, label?, keys:["Win","Shift","S"], key_times:[...], desc, desc_at}
  E03: { setup(ev, ctx) { const p = ev.params; const i = (p.index ?? 1) - 1;
    ctx.addTitle({ start: ev.start, chip: p.label || `الاختصار ${ORD[i] || i + 1}`, keys: p.keys, key_times: p.key_times, desc: p.desc, desc_at: p.desc_at });
    ctx.dots.events.push({ t: ev.start, i, state: "active" }); if (i > 0) ctx.dots.events.push({ t: ev.start, i: i - 1, state: "done" });
    if (p.keys) { ctx.presses.push({ keys: p.keys, times: p.key_times || p.keys.map((_, k) => ev.start + 0.2 + k * 0.25), end: ev.end });
      if (p.pulse !== false) ctx.pulses.push((p.key_times ? p.key_times[p.key_times.length - 1] : ev.start + 0.2 + (p.keys.length - 1) * 0.25) + 0.12); } } },
  // E04 الكيبورد والأزرار المضغوطة — {keys, key_times} (الكاميرا تقرب على الشاشة الرئيسية والكيبورد)
  E04: { setup(ev, ctx) { const p = ev.params; if (p.keys) ctx.presses.push({ keys: p.keys, times: p.key_times || p.keys.map((_, k) => ev.start + 0.2 + k * 0.25), end: ev.end }); } },
  // E05 نبضة الكيبل — {at?}
  E05: { setup(ev, ctx) { ctx.pulses.push(ev.params.at ?? ev.start); } },
  // E06 نقل النافذة بين الشاشتين — {title:"Documents", back:true}
  E06: { setup(ev, ctx) { const d = Math.max(0.8, ev.end - ev.start);
    ctx.screens.left.push({ start: ev.start, mode: "move_out", title: ev.params.title, back: ev.params.back, dur: d });
    ctx.screens.right.push({ start: ev.start, mode: "move_in", title: ev.params.title, back: ev.params.back, dur: d, windows: false }); ctx.sortS(); } },
  // E07 توهج الشاشتين
  E07: { setup(ev, ctx) { ctx.glows.push({ start: ev.start, end: ev.end }); } },
  // E08 سطح مكتب جديد — {label:"Desktop 2"}
  E08: scr("left", "desktop_new"),
  // E09 المؤشر يقفل التبويب — {tabs:[...]}
  E09: scr("left", "browser_close"),
  // E10 رجوع التبويب
  E10: scr("left", "browser_restore"),
  // E11 قائمة الإيموجي (أشياء ورموز فقط) — {text}
  E11: scr("left", "emoji"),
  // E12 تبويب الرموز وإضافة رمز
  E12: scr("left", "symbols"),
  // E13 مسح الكلمة كاملة — {text}
  E13: scr("left", "delete_word"),
  // E14 مسح حرف حرف — {text, chars}
  E14: scr("left", "delete_chars"),
  // E15 شاشة احفظ — {text:"احفظ"} + عنوان
  E15: { setup(ev, ctx) { ctx.screens.left.push({ start: ev.start, mode: "save", text: ev.params.text, dur: 1 }); ctx.sortS();
    ctx.addTitle({ start: ev.start, main: ev.params.title || "احفظ المقطع", size: "mid", desc: ev.params.desc }); } },
  // E16 شاشة علّمه — {text:"علّمه"}
  E16: { setup(ev, ctx) { ctx.screens.right.push({ start: ev.start, mode: "share", text: ev.params.text, dur: 1 }); ctx.sortS();
    if (ev.params.title || ev.params.desc) ctx.addTitle({ start: ev.start, main: ev.params.title || "احفظ المقطع", size: "mid", desc: ev.params.desc || "وعلّم صاحبك اللي يحتاجها" }); } },
  // E17 الختام — تلقائي عند closing.start
  E17: {},
  // X01 عرض شاشة إضافي بنفس الأسلوب — {screen:'left'|'right', mode:'snip'|'clipboard'|'taskmgr'|'snap'|'lock'|'text'|'desktop', ...}
  X01: { setup(ev, ctx) { const p = ev.params; ctx.screens[p.screen || "left"].push({ start: ev.start, dur: Math.max(0.6, ev.end - ev.start), ...p }); ctx.sortS(); } },
};

boot({ series: "shortcuts", label: "اختصارات ويندوز", closingLabel: "تيربو · اختصارات ويندوز", grid: true, header: "dots", build, handlers });
