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

// ---- مساعدات X01 (لقطة الشاشة): منطقة القص الثابتة + مصغّرها + أيقونات الشريط (أشكال مجردة) ----
const SNIPR = (w, h) => ({ x: w * 0.25, y: h * 0.22, w: w * 0.45, h: h * 0.45 });
function snipWins(g, w, h) { K.windowBox(g, w * 0.08, h * 0.1, w * 0.5, h * 0.5, "Docs"); K.windowBox(g, w * 0.42, h * 0.2, w * 0.5, h * 0.52, "Browser"); }
function snipThumb(g, w, h, x, y, tw) { const r = SNIPR(w, h), k = tw / r.w, th = r.h * k;
  g.save(); g.beginPath(); g.rect(x, y, tw, th); g.clip(); g.translate(x - r.x * k, y - r.y * k); g.scale(k, k); K.screenBg(g, w, h); snipWins(g, w, h); g.restore();
  g.strokeStyle = "#fff"; g.lineWidth = 3; g.strokeRect(x, y, tw, th); return th; }
function snipIcon(g, i, cx, cy, r, col) { g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(3, r * 0.14); g.lineJoin = "round"; g.lineCap = "round";
  if (i === 0) { g.setLineDash([r * 0.22, r * 0.16]); g.strokeRect(cx - r * 0.8, cy - r * 0.55, r * 1.6, r * 1.1); }
  if (i === 1) { g.beginPath(); g.moveTo(cx - r * 0.7, cy + r * 0.2); g.bezierCurveTo(cx - r * 0.9, cy - r * 0.8, cx + r * 0.2, cy - r * 0.6, cx + r * 0.5, cy - r * 0.3); g.bezierCurveTo(cx + r * 1.0, cy + r * 0.2, cx + r * 0.1, cy + r * 0.8, cx - r * 0.7, cy + r * 0.2); g.stroke(); }
  if (i === 2) { g.strokeRect(cx - r * 0.8, cy - r * 0.6, r * 1.6, r * 1.2); g.fillRect(cx - r * 0.8, cy - r * 0.6, r * 1.6, r * 0.35); }
  if (i === 3) { const L = r * 0.4, a = r * 0.8, b = r * 0.6; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => { g.beginPath(); g.moveTo(cx + dx * a, cy + dy * (b - L)); g.lineTo(cx + dx * a, cy + dy * b); g.lineTo(cx + dx * (a - L), cy + dy * b); g.stroke(); }); }
  if (i === 4) { K.rr(g, cx - r * 0.8, cy - r * 0.45, r * 1.05, r * 0.9, r * 0.15); g.fill(); g.beginPath(); g.moveTo(cx + r * 0.35, cy); g.lineTo(cx + r * 0.85, cy - r * 0.4); g.lineTo(cx + r * 0.85, cy + r * 0.4); g.closePath(); g.fill(); }
  g.restore(); }
function appIcon(g, i, cx, cy, r, col) { g.save(); g.strokeStyle = col; g.fillStyle = col; g.lineWidth = Math.max(3, r * 0.16); g.lineCap = "round"; g.lineJoin = "round";
  if (i === 0) { g.beginPath(); g.moveTo(cx - r * 0.6, cy + r * 0.6); g.lineTo(cx + r * 0.5, cy - r * 0.5); g.stroke(); g.beginPath(); g.moveTo(cx - r * 0.75, cy + r * 0.75); g.lineTo(cx - r * 0.45, cy + r * 0.75); g.lineTo(cx - r * 0.75, cy + r * 0.45); g.closePath(); g.fill(); }
  if (i === 1) { g.fillRect(cx - r * 0.25, cy - r * 0.7, r * 0.5, r * 0.9); g.fillRect(cx - r * 0.6, cy + r * 0.45, r * 1.2, r * 0.2); }
  if (i === 2) { g.beginPath(); g.moveTo(cx - r * 0.4, cy - r * 0.8); g.lineTo(cx - r * 0.4, cy + r * 0.4); g.lineTo(cx + r * 0.8, cy + r * 0.4); g.moveTo(cx - r * 0.8, cy - r * 0.4); g.lineTo(cx + r * 0.4, cy - r * 0.4); g.lineTo(cx + r * 0.4, cy + r * 0.8); g.stroke(); }
  if (i === 3) { g.strokeRect(cx - r * 0.45, cy - r * 0.6, r * 0.9, r * 1.1); g.strokeRect(cx - r * 0.7, cy - r * 0.35, r * 0.9, r * 1.1); }
  if (i === 4) { g.beginPath(); g.moveTo(cx - r * 0.7, cy - r * 0.7); g.lineTo(cx + r * 0.45, cy - r * 0.7); g.lineTo(cx + r * 0.7, cy - r * 0.45); g.lineTo(cx + r * 0.7, cy + r * 0.7); g.lineTo(cx - r * 0.7, cy + r * 0.7); g.closePath(); g.stroke(); g.fillRect(cx - r * 0.35, cy - r * 0.7, r * 0.6, r * 0.45); }
  g.restore(); }
// ---- مساعدات X01 (سجل الحافظة Win + V، 2026-11-17): بطاقات نسخ + لوحة Clipboard + مستند — جمادات ورموز فقط ----
const CLIP_DEF = ["Meeting 4 PM", "pc-case.png", "RTX specs", "Order #4821"];
function pcThumb(g, x, y, tw, th) { g.fillStyle = "#DCE8FF"; K.rr(g, x, y, tw, th, 8); g.fill();
  const cw = th * 0.42, ch = th * 0.72, cx = x + tw / 2 - cw / 2, cy = y + th * 0.14; g.fillStyle = PAL.navy; K.rr(g, cx, cy, cw, ch, 6); g.fill();
  g.fillStyle = "#78afff"; g.beginPath(); g.arc(cx + cw / 2, cy + ch * 0.35, cw * 0.26, 0, 7); g.fill(); g.beginPath(); g.arc(cx + cw / 2, cy + ch * 0.72, cw * 0.18, 0, 7); g.fill(); }
function pinIcon(g, cx, cy, r, on) { g.save(); g.translate(cx, cy); g.rotate(0.6); g.fillStyle = on ? PAL.brand : "#B8C6E0";
  K.rr(g, -r * 0.35, -r, r * 0.7, r * 0.9, r * 0.12); g.fill(); g.fillRect(-r * 0.6, -r * 0.15, r * 1.2, r * 0.22);
  g.strokeStyle = on ? PAL.brand : "#B8C6E0"; g.lineWidth = Math.max(2, r * 0.16); g.lineCap = "round"; g.beginPath(); g.moveTo(0, r * 0.05); g.lineTo(0, r * 0.95); g.stroke(); g.restore(); }
function clipCard(g, x, y, cw, ch, it, o = {}) {
  const img = /\.(png|jpg)$/i.test(it);
  g.save(); g.globalAlpha = o.alpha ?? 1;
  g.save(); g.shadowColor = "rgba(20,40,75,.18)"; g.shadowBlur = o.shadow ?? 10; g.fillStyle = o.grey ? "#E4E8EF" : (o.sel ? "#DCE8FF" : "#F6F8FD"); K.rr(g, x, y, cw, ch, 14); g.fill(); g.restore();
  if (o.flash) { g.fillStyle = `rgba(255,51,71,${0.35 * o.flash})`; K.rr(g, x, y, cw, ch, 14); g.fill(); }
  if (o.glow) { g.strokeStyle = `rgba(47,107,207,${o.glow})`; g.lineWidth = 7; K.rr(g, x - 4, y - 4, cw + 8, ch + 8, 18); g.stroke(); }
  const col = o.grey ? "#9AA6BB" : PAL.ink; let tx = x + 22;
  if (img) { const th = ch * 0.74, tw = th * 1.3; if (o.grey) g.globalAlpha *= 0.55; pcThumb(g, x + 16, y + (ch - th) / 2, tw, th); g.globalAlpha = o.alpha ?? 1; tx = x + 32 + tw; }
  else { g.fillStyle = o.grey ? "#C9D1DE" : "#C4D6F5"; for (let i = 0; i < 2; i++) { K.rr(g, x + 22, y + ch * (0.62 + i * 0.16) - 4, cw * (0.5 - i * 0.18), 9, 4); g.fill(); } }
  K.text(g, img ? "Image" : it, tx, img ? y + ch * 0.5 : y + ch * 0.32, { size: ch * 0.34, align: "left", font: K.FONT_EN, weight: 700, color: col });
  if (o.q) { const b = E.outBack(clamp(o.q)); g.save(); g.translate(x + cw - ch * 0.42, y + ch / 2); g.scale(b, b); g.fillStyle = "#9AA6BB"; g.beginPath(); g.arc(0, 0, ch * 0.28, 0, 7); g.fill();
    K.text(g, "?", 0, 2, { size: ch * 0.38, color: "#fff", font: K.FONT_EN, weight: 800 }); g.restore(); }
  if (o.pin != null) pinIcon(g, x + cw - ch * 0.42, y + ch / 2, ch * 0.24 * (1 + 0.25 * (o.pinPop || 0)), o.pin);
  g.restore(); }
function clipPanel(g, w, h, a = 1) { const pw = w * 0.72, ph = h * 0.84, px = (w - pw) / 2, py = h * 0.04;
  g.save(); g.translate(w / 2, py + ph); g.scale(0.6 + 0.4 * a, 0.6 + 0.4 * a); g.translate(-w / 2, -(py + ph)); g.globalAlpha = clamp(a * 1.5);
  g.save(); g.shadowColor = "rgba(20,40,75,.32)"; g.shadowBlur = 26; g.fillStyle = "#fff"; K.rr(g, px, py, pw, ph, 18); g.fill(); g.restore();
  K.text(g, "Clipboard", px + 26, py + h * 0.065, { size: h * 0.055, align: "left", font: K.FONT_EN, weight: 700 });
  return { px, py, pw, ph, done: () => g.restore() }; }
function cliphist(g, w, h, s) {
  const T = (s.start ?? 0) + (s.p ?? 1) * (s.dur ?? 1), t0 = s.start ?? 0, ph = s.phase || "open";
  K.screenBg(g, w, h); K.taskbar(g, w, h);
  const items = s.items || CLIP_DEF;
  if (ph === "lost") {   // نسخة جديدة تنزل فوق، والقديمة تبهت رمادي وعليها علامة استفهام (Ctrl + C يكتب فوق الحافظة)
    const cw = w * 0.62, ch = h * 0.16, x = (w - cw) / 2, gap = h * 0.035, at = s.at ?? t0 + 0.4;
    const d = E.outBack(clamp((T - at) / 0.45)), fade = clamp((T - at - 0.35) / 0.4);
    items.forEach((it, i) => { const y = h * 0.1 + (i + d) * (ch + gap); clipCard(g, x, y, cw, ch, it, { grey: fade > 0.5, alpha: 1 - 0.35 * fade, q: fade > 0 ? (T - at - 0.35) / 0.3 : 0 }); });
    if (T >= at) { const y = lerp(-ch * 1.4, h * 0.1, d); clipCard(g, x, y, cw, ch, s.fresh || "Order #4821", { glow: 1 - clamp((T - at - 0.45) / 0.6), shadow: 18 }); }
    return; }
  const open = ph === "open" ? E.outCubic(clamp((T - t0) / 0.45)) : 1;
  const P = clipPanel(g, w, h, open), cx = P.px + 22, cw = P.pw - 44, ch = h * 0.15, gap = h * 0.018, y0 = P.py + h * 0.115;
  const rowY = (i) => y0 + i * (ch + gap);
  if (ph === "turnon") {   // أول مرة: زر Turn on أزرق ينضغط (بدون نص الرسالة الرسمية)
    const at = s.at ?? t0 + 0.8; const bw = P.pw * 0.5, bh = h * 0.12, bx = w / 2 - bw / 2, by = P.py + P.ph * 0.5;
    g.fillStyle = "#EEF3FB"; K.rr(g, w / 2 - h * 0.09, P.py + P.ph * 0.2, h * 0.18, h * 0.2, 14); g.fill(); g.fillStyle = PAL.navy; K.rr(g, w / 2 - h * 0.04, P.py + P.ph * 0.2 - h * 0.015, h * 0.08, h * 0.04, 8); g.fill();
    g.fillStyle = "#C4D6F5"; for (let i = 0; i < 3; i++) { K.rr(g, w / 2 - h * 0.055, P.py + P.ph * 0.27 + i * h * 0.04, h * 0.11 - i * h * 0.02, h * 0.016, 4); g.fill(); }
    const pr = T >= at && T < at + 0.18 ? 0.94 : 1, on = T >= at; g.save(); g.translate(w / 2, by + bh / 2); g.scale(pr, pr);
    g.fillStyle = on ? "#1F55B0" : PAL.brand; K.rr(g, -bw / 2, -bh / 2, bw, bh, bh / 2); g.fill(); K.text(g, on ? "On  ✓" : "Turn on", 0, 2, { size: bh * 0.42, color: "#fff", font: K.FONT_EN, weight: 700 }); g.restore();
    if (on) { const r = clamp((T - at) / 0.5); g.strokeStyle = `rgba(47,107,207,${1 - r})`; g.lineWidth = 8; K.rr(g, bx - 20 * r, by - 20 * r, bw + 40 * r, bh + 40 * r, bh / 2 + 20 * r); g.stroke(); }
    const q = E.inOutCubic(clamp((T - t0 - 0.2) / Math.max(0.3, at - t0 - 0.25))); K.cursor(g, lerp(w * 0.85, bx + bw * 0.62, q), lerp(h * 0.95, by + bh * 0.55, q), h / 480);
    P.done(); return; }
  if (ph === "fill") {   // كل نسخة تنضاف فوق، وعداد 25
    const tm = s.times || items.map((_, i) => t0 + 0.3 + i * 0.6); let n = 0; tm.forEach((tt) => { if (T >= tt) n++; });
    const lastT = n ? tm[n - 1] : 0, d = n ? E.outBack(clamp((T - lastT) / 0.4)) : 1;
    for (let k = 0; k < n; k++) { const it = items[n - 1 - k]; const yy = k === 0 ? lerp(y0 - ch, y0, d) : rowY(k - 1 + d); if (k > 4) break;
      clipCard(g, cx, yy, cw, ch, it, { alpha: k === 0 ? clamp(d * 1.4) : 1, glow: k === 0 ? 1 - clamp((T - lastT - 0.4) / 0.5) : 0 }); }
    if (s.show_at != null && T >= s.show_at) { const b = E.outBack(clamp((T - s.show_at) / 0.35)); g.save(); g.translate(P.px + P.pw - h * 0.11, P.py + h * 0.065); g.scale(b, b);
      g.fillStyle = PAL.brand; K.rr(g, -h * 0.085, -h * 0.045, h * 0.17, h * 0.09, h * 0.045); g.fill(); K.text(g, "25", 0, 2, { size: h * 0.06, color: "#fff", font: K.FONT_EN, weight: 800 }); g.restore(); }
    P.done(); return; }
  const pinI = s.pin_index ?? 1;
  if (ph === "pick") {   // المؤشر يختار البطاقة الثانية
    const at = s.pick_at ?? t0 + 0.8, q = E.inOutCubic(clamp((T - t0 - 0.15) / Math.max(0.3, at - t0 - 0.15))), sel = T >= at;
    items.forEach((it, i) => clipCard(g, cx, rowY(i), cw, ch, it, { sel: sel && i === pinI, glow: sel && i === pinI ? 1 - clamp((T - at) / 0.8) : 0 }));
    K.cursor(g, lerp(w * 0.86, cx + cw * 0.55, q), lerp(h * 0.9, rowY(pinI) + ch * 0.55, q), h / 480);
    if (sel && T < at + 0.3) { g.fillStyle = `rgba(47,107,207,${0.35 * (1 - (T - at) / 0.3)})`; g.beginPath(); g.arc(cx + cw * 0.55, rowY(pinI) + ch * 0.55, h * 0.05, 0, 7); g.fill(); }
    P.done(); return; }
  if (ph === "pin") {    // دبوس يتفعّل بالأزرق على بطاقة وحدة
    const at = s.at ?? t0 + 0.5, on = T >= at;
    items.forEach((it, i) => clipCard(g, cx, rowY(i), cw, ch, it, { pin: i === pinI ? on : null, pinPop: i === pinI && on ? 1 - clamp((T - at) / 0.35) : 0, glow: i === pinI && on ? 1 - clamp((T - at) / 0.8) : 0, sel: i === pinI }));
    P.done(); return; }
  if (ph === "wipe") {   // إعادة التشغيل: غير المثبّت يومض أحمر وينمسح، والمثبّت يطلع فوق ويتوهج
    const at = s.at ?? t0 + 0.4, fl = clamp((T - at) / 0.35), gone = clamp((T - at - 0.35) / 0.35), up = E.inOutCubic(clamp((T - at - 0.7) / 0.4));
    items.forEach((it, i) => { if (i === pinI) return; if (gone >= 1) return; clipCard(g, cx + gone * cw * 0.15, rowY(i), cw, ch, it, { flash: T >= at ? Math.sin(fl * Math.PI * 2) * 0.5 + 0.5 : 0, alpha: 1 - gone }); });
    clipCard(g, cx, lerp(rowY(pinI), rowY(0), up), cw, ch, items[pinI], { pin: true, sel: true, glow: up > 0 ? 0.5 + 0.5 * Math.sin((T - at) * 6) : 0 });
    P.done(); return; }
  // open: قائمة السجل تنفتح بتكبير
  items.forEach((it, i) => clipCard(g, cx, rowY(i), cw, ch, it, { alpha: clamp((T - t0 - 0.15 - i * 0.08) / 0.25) }));
  P.done(); }
function docScreen(g, w, h, s) {   // مستند Notes: اللصق عند at (البطاقة الملصوقة تتوهج)
  const T = (s.start ?? 0) + (s.p ?? 1) * (s.dur ?? 1); K.screenBg(g, w, h); K.taskbar(g, w, h);
  const X = w * 0.08, Y = h * 0.05, W = w * 0.84, H = h * 0.82; K.windowBox(g, X, Y, W, H, s.wtitle || "Notes", { lines: 3 });
  const ly = Y + 66 + 3 * 32 + 16;
  if (s.at != null && T >= s.at) { const b = E.outBack(clamp((T - s.at) / 0.35)); const cw = W * 0.62, ch = h * 0.15;
    g.save(); g.translate(X + 22, ly); g.scale(1, b); clipCard(g, X + 22 - (X + 22), 0, cw, ch, s.paste || "Order #4821", { sel: true, glow: 1 - clamp((T - s.at - 0.3) / 0.7), shadow: 0 }); g.restore();
    g.fillStyle = PAL.brand; g.fillRect(X + 22 + cw + 14, ly + 10, 4, ch - 20); }
  else if (Math.floor(T * 2.5) % 2 === 0) { g.fillStyle = PAL.brand; g.fillRect(X + 22, ly + 6, 4, h * 0.07); }
}
// ---- مساعدات X01 (Ctrl + Shift + Esc، 2026-11-21): شاشة الأمان + مدير المهام + عداد الخطوات — نص وأشكال مجردة فقط، بدون شعارات ولا أفاتار ----
const SEC_ROWS = ["Lock", "Switch user", "Sign out", "···", "Task Manager"];
function secRowsGeo(w, h) { return SEC_ROWS.map((_, i) => ({ y: h * 0.15 + i * h * 0.145, pw: w * 0.56, ph: h * 0.125 })); }
function secBg(g, w, h, grey) { const gr = g.createLinearGradient(0, 0, 0, h);
  gr.addColorStop(0, grey ? "#8E98AA" : "#1D2C48"); gr.addColorStop(1, grey ? "#A9B2C2" : "#263E6B"); g.fillStyle = gr; g.fillRect(0, 0, w, h); }
function secScreen(g, w, h, s) {   // شاشة الأمان (Ctrl + Alt + Delete): خيارات نص فقط، تتظلل وحدة وحدة، والمؤشر ينقر Task Manager
  const t0 = s.start ?? 0, T = t0 + (s.p ?? 1) * (s.dur ?? 1), a = s.fade === false ? 1 : E.outCubic(clamp((T - t0) / 0.3));
  if (a < 1) { K.screenBg(g, w, h); K.taskbar(g, w, h); }
  g.save(); g.globalAlpha = a; secBg(g, w, h, false);
  const geo = secRowsGeo(w, h), hl = s.times || [], tmAt = s.show_at, pickAt = s.pick_at;
  let cur = -1; hl.forEach((tt, i) => { if (T >= tt) cur = i; }); if (tmAt != null && T >= tmAt) cur = 4;
  SEC_ROWS.forEach((r, i) => { const G = geo[i], x = w / 2 - G.pw / 2, on = i === cur, tm = i === 4 && tmAt != null && T >= tmAt;
    const st = i === 4 ? tmAt : hl[i], pop = on && st != null ? E.outBack(clamp((T - st) / 0.25)) : 0;
    const press = pickAt != null && i === 4 && T >= pickAt && T < pickAt + 0.18 ? 0.95 : 1;
    g.save(); g.translate(w / 2, G.y); g.scale(press, press); g.translate(-w / 2, -G.y);
    if (on || tm) { g.fillStyle = tm ? PAL.brand : `rgba(255,255,255,${0.3 * pop})`; K.rr(g, x, G.y - G.ph / 2, G.pw, G.ph, G.ph / 2); g.fill();
      if (!tm) { g.fillStyle = "#8fc0ff"; K.rr(g, x + 14, G.y - G.ph * 0.28, 8, G.ph * 0.56, 4); g.fill(); } }
    K.text(g, r, w / 2, G.y + 2, { size: h * (i === 3 ? 0.095 : 0.082), weight: on || tm ? 700 : 500, color: on || tm ? "#fff" : "rgba(255,255,255,.82)", font: K.FONT_EN });
    g.restore(); });
  K.text(g, "Cancel", w * 0.9, h * 0.9, { size: h * 0.045, weight: 600, color: "rgba(255,255,255,.75)", font: K.FONT_EN, align: "right" });
  if (pickAt != null && tmAt != null && T >= tmAt) { const G = geo[4], q = E.inOutCubic(clamp((T - tmAt - 0.1) / Math.max(0.3, pickAt - tmAt - 0.15)));
    const tx = w / 2 + G.pw * 0.3, ty = G.y + G.ph * 0.15; K.cursor(g, lerp(w * 0.86, tx, q), lerp(h * 0.95, ty, q), h / 420);
    if (T >= pickAt && T < pickAt + 0.4) { const r = clamp((T - pickAt) / 0.4); g.strokeStyle = `rgba(143,192,255,${1 - r})`; g.lineWidth = 6; g.beginPath(); g.arc(tx, ty, h * (0.02 + 0.06 * r), 0, 7); g.stroke(); } }
  g.restore(); }
function secMini(g, w, h, s) {   // شاشة الأمان مصغّرة رمادية وعليها خط شطب أحمر (بدون ما تمر عليها)
  const t0 = s.start ?? 0, T = t0 + (s.p ?? 1) * (s.dur ?? 1), at = s.at ?? t0 + 0.4; K.screenBg(g, w, h); K.taskbar(g, w, h);
  const b = E.outBack(clamp((T - t0) / 0.35)), cw = w * 0.5, ch = h * 0.62, cx = w / 2, cy = h * 0.43;
  g.save(); g.translate(cx, cy); g.scale(b, b); g.translate(-cw / 2, -ch / 2);
  g.save(); g.shadowColor = "rgba(20,40,75,.3)"; g.shadowBlur = 20; g.beginPath(); K.rr(g, 0, 0, cw, ch, 16); g.clip(); secBg(g, cw, ch, true); g.restore();
  ["Lock", "Switch user", "Sign out", "Task Manager"].forEach((r, i) => K.text(g, r, cw / 2, ch * 0.2 + i * ch * 0.2, { size: ch * 0.09, weight: 500, color: "rgba(255,255,255,.85)", font: K.FONT_EN }));
  const fl = T >= at ? Math.max(0, Math.sin(clamp((T - at) / 0.5) * Math.PI)) : 0; if (fl > 0) { g.fillStyle = `rgba(255,51,71,${0.3 * fl})`; K.rr(g, 0, 0, cw, ch, 16); g.fill(); }
  const d = E.outCubic(clamp((T - at) / 0.3)); if (d > 0) { g.strokeStyle = PAL.problem; g.lineWidth = h * 0.028; g.lineCap = "round"; g.beginPath(); g.moveTo(cw * 0.06, ch * 0.08); g.lineTo(cw * 0.06 + cw * 0.88 * d, ch * 0.08 + ch * 0.84 * d); g.stroke(); }
  g.restore(); }
function stepsScreen(g, w, h, s) {   // عداد الخطوات: two = دائرتين (1 ← 2، بترتيب القراءة من اليمين) · one = خطوة وحدة
  const t0 = s.start ?? 0, T = t0 + (s.p ?? 1) * (s.dur ?? 1); K.screenBg(g, w, h); K.taskbar(g, w, h);
  const R = h * 0.14, cy = h * 0.4, circ = (x, n, k, fill, ring) => { const b = E.outBack(clamp((T - t0 - k) / 0.3)); if (b <= 0) return; g.save(); g.translate(x, cy); g.scale(b, b);
    if (ring > 0) { g.strokeStyle = `rgba(255,255,255,${ring})`; g.lineWidth = 8; g.beginPath(); g.arc(0, 0, R * (1.15 + 0.35 * (1 - ring)), 0, 7); g.stroke(); }
    g.fillStyle = fill ? PAL.brand : "#fff"; g.beginPath(); g.arc(0, 0, R, 0, 7); g.fill(); g.lineWidth = 6; g.strokeStyle = "#fff"; g.stroke();
    K.text(g, n, 0, 4, { size: R * 1.15, weight: 800, color: fill ? "#fff" : PAL.ink, font: K.FONT_EN }); g.restore(); };
  if ((s.phase || "two") === "two") { const at = s.at, on = at != null && T >= at, ring = on ? 1 - clamp((T - at) / 0.6) : 0;
    circ(w * 0.7, "1", 0, false, 0); circ(w * 0.3, "2", 0.15, on, ring);
    const q = E.outCubic(clamp((T - t0 - 0.1) / 0.3)); if (q > 0) { g.save(); g.globalAlpha = q; g.strokeStyle = "#fff"; g.lineWidth = 10; g.lineCap = "round"; g.lineJoin = "round";
      const x1 = w * 0.7 - R * 1.4, x2 = w * 0.3 + R * 1.4; g.beginPath(); g.moveTo(x1, cy); g.lineTo(x2, cy); g.moveTo(x2 + 26, cy - 24); g.lineTo(x2, cy); g.lineTo(x2 + 26, cy + 24); g.stroke(); g.restore(); }
    K.text(g, on ? "خطوة زيادة" : "خطوتين", w / 2, h * 0.76, { size: h * 0.1, color: "#fff" }); return; }
  circ(w / 2, "1", 0, true, 1 - clamp((T - t0) / 0.6));
  const cb = E.outBack(clamp((T - t0 - 0.25) / 0.3)); if (cb > 0) { g.save(); g.translate(w / 2 + R * 0.8, cy - R * 0.75); g.scale(cb, cb); g.fillStyle = "#fff"; g.beginPath(); g.arc(0, 0, R * 0.38, 0, 7); g.fill();
    g.strokeStyle = PAL.brand; g.lineWidth = R * 0.13; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(-R * 0.17, 0); g.lineTo(-R * 0.03, R * 0.14); g.lineTo(R * 0.2, -R * 0.14); g.stroke(); g.restore(); }
  K.text(g, "خطوة وحدة", w / 2, h * 0.76, { size: h * 0.1, color: "#fff" }); }
function tmOpen(g, w, h, s) {   // مدير المهام ينفتح مباشرة: نافذة نص فقط (Processes)، أشرطة للزينة بدون أرقام
  const t0 = s.start ?? 0, T = t0 + (s.p ?? 1) * (s.dur ?? 1), at = s.at ?? t0; K.screenBg(g, w, h); K.taskbar(g, w, h);
  if (T < at) return; const b = E.outBack(clamp((T - at) / 0.35)), gl = 1 - clamp((T - at - 0.3) / 0.7);
  const X = w * 0.05, Y = h * 0.04, W = w * 0.9, H = h * 0.83;
  g.save(); g.translate(X + W / 2, Y + H / 2); g.scale(0.82 + 0.18 * b, 0.82 + 0.18 * b); g.translate(-(X + W / 2), -(Y + H / 2)); g.globalAlpha = clamp((T - at) / 0.15);
  K.windowBox(g, X, Y, W, H, "Task Manager", { lines: 0, glow: gl });
  const rail = W * 0.075; g.fillStyle = "#F4F7FC"; g.fillRect(X, Y + 44, rail, H - 56);
  for (let i = 0; i < 5; i++) { g.fillStyle = i === 0 ? PAL.brand : "#C9D6EC"; K.rr(g, X + rail * 0.25, Y + 70 + i * h * 0.1, rail * 0.5, rail * 0.5, 8); g.fill(); }
  const cx = X + rail + 26; K.text(g, "Processes", cx, Y + 82, { size: h * 0.055, weight: 700, align: "left", font: K.FONT_EN });
  const c1 = X + W * 0.6, c2 = X + W * 0.8, hy = Y + 140; K.text(g, "Name", cx, hy, { size: h * 0.035, weight: 600, align: "left", color: PAL.muted, font: K.FONT_EN });
  K.text(g, "CPU", c1, hy, { size: h * 0.035, weight: 600, align: "left", color: PAL.muted, font: K.FONT_EN }); K.text(g, "Memory", c2, hy, { size: h * 0.035, weight: 600, align: "left", color: PAL.muted, font: K.FONT_EN });
  g.fillStyle = "#E3EAF5"; g.fillRect(cx, hy + 22, X + W - 30 - cx, 2);
  (s.rows || ["Browser", "Game", "Updater", "Chat", "Notes"]).forEach((n, i) => { const y = hy + 62 + i * h * 0.085, rv = clamp((T - at - 0.15 - i * 0.06) / 0.25); if (rv <= 0) return;
    g.save(); g.globalAlpha *= rv; g.fillStyle = "#DCE5F5"; K.rr(g, cx, y - 13, 26, 26, 6); g.fill();
    K.text(g, n, cx + 40, y, { size: h * 0.042, weight: 600, align: "left", font: K.FONT_EN });
    const v1 = 0.25 + 0.5 * Math.abs(Math.sin(i * 1.7 + 0.3)) + 0.06 * Math.sin(T * 2 + i), v2 = 0.3 + 0.45 * Math.abs(Math.cos(i * 1.3));
    [[c1, v1], [c2, v2]].forEach(([x, v]) => { g.fillStyle = "#EEF3FB"; K.rr(g, x, y - 9, W * 0.13, 18, 9); g.fill(); g.fillStyle = "#9CBDF0"; K.rr(g, x, y - 9, W * 0.13 * v, 18, 9); g.fill(); });
    g.restore(); });
  g.restore(); }
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
    if (m === "snip") { const T = (s.start ?? 0) + p * (s.dur ?? 1), R0 = SNIPR(w, h), timed = !!(s.times || s.at != null || s.rec);
      desk(); snipWins(g, w, h);
      const fade = timed ? clamp((T - (s.start ?? 0)) / 0.3) : 1;
      g.fillStyle = `rgba(10,20,40,${0.42 * fade})`; g.fillRect(0, 0, w, h);
      let sel = 0; if (s.times) { sel = -1; s.times.forEach((tt, i) => { if (T >= tt) sel = i; }); }
      let q = 0; if (s.at != null) q = E.inOutCubic(clamp((T - s.at) / 0.9)); else if (!timed) q = E.inOutCubic(clamp((p - 0.15) / 0.55));
      if (q > 0) sel = 0;
      // معاينة الشكل المختار قبل السحب
      if (q === 0 && sel >= 0 && s.times) { g.save(); g.strokeStyle = "#fff"; g.lineWidth = 5; g.setLineDash([16, 10]); g.lineDashOffset = -T * 60;
        if (sel === 0) g.strokeRect(R0.x, R0.y, R0.w, R0.h);
        if (sel === 1) { g.beginPath(); g.moveTo(w * 0.3, h * 0.3); g.bezierCurveTo(w * 0.45, h * 0.12, w * 0.7, h * 0.25, w * 0.66, h * 0.45); g.bezierCurveTo(w * 0.62, h * 0.66, w * 0.4, h * 0.7, w * 0.33, h * 0.55); g.bezierCurveTo(w * 0.27, h * 0.45, w * 0.22, h * 0.38, w * 0.3, h * 0.3); g.stroke(); }
        if (sel === 2) { g.setLineDash([]); g.strokeStyle = "#8fc0ff"; g.lineWidth = 9; K.rr(g, w * 0.42 - 6, h * 0.2 - 6, w * 0.5 + 12, h * 0.52 + 12, 16); g.stroke(); }
        if (sel === 3) { g.setLineDash([]); g.strokeStyle = "#8fc0ff"; g.lineWidth = 12; g.strokeRect(8, 8, w - 16, h - 16); }
        g.restore(); }
      if (q > 0) { const ww = R0.w * q, hh = R0.h * q;
        g.save(); g.beginPath(); g.rect(R0.x, R0.y, ww, hh); g.clip(); K.screenBg(g, w, h); snipWins(g, w, h);
        if (s.at != null && !s.rec) { const fl = 1 - clamp((T - s.at - 0.9) / 0.35); if (q >= 1 && fl > 0) { g.fillStyle = `rgba(255,255,255,${0.55 * fl})`; g.fillRect(R0.x, R0.y, ww, hh); } }
        g.restore(); g.strokeStyle = s.rec && q >= 1 ? PAL.problem : "#fff"; g.lineWidth = 5; g.setLineDash([16, 10]); g.strokeRect(R0.x, R0.y, ww, hh); g.setLineDash([]);
        if (q < 1) K.cursor(g, R0.x + ww, R0.y + hh, h / 520);
        if (s.rec && q >= 1) { const a = 0.55 + 0.45 * Math.sin((T - s.at) * 7); const cx = R0.x + 44, cy = R0.y + 44;
          g.fillStyle = `rgba(255,51,71,${a})`; g.beginPath(); g.arc(cx, cy, 20, 0, 7); g.fill();
          g.fillStyle = "rgba(255,255,255,.92)"; K.rr(g, cx + 30, cy - 22, 190, 44, 22); g.fill();
          const sec = Math.max(0, Math.floor(T - s.at - 0.9)); K.text(g, `REC 00:0${Math.min(9, sec)}`, cx + 125, cy + 1, { size: 26, weight: 700, color: PAL.problem }); } }
      // شريط القص فوق الشاشة
      const by = lerp(-h * 0.14, h * 0.035, E.outBack(fade)), bw = w * 0.46, bx = w / 2 - bw / 2, bh = h * 0.11;
      g.save(); g.shadowColor = "rgba(10,20,40,.35)"; g.shadowBlur = 20; g.fillStyle = "#fff"; K.rr(g, bx, by, bw, bh, 16); g.fill(); g.restore();
      for (let i = 0; i < 5; i++) { const cw = bw * 0.155, cx0 = bx + bw * 0.035 + i * (cw + bw * 0.03) + (i === 4 ? bw * 0.01 : 0), cy0 = by + bh * 0.13, ch = bh * 0.74;
        const on = i === 4 ? !!s.rec : i === sel; g.fillStyle = on ? (i === 4 ? PAL.problem : PAL.brand) : "#E3EAF7"; K.rr(g, cx0, cy0, cw, ch, 12); g.fill();
        snipIcon(g, i, cx0 + cw / 2, cy0 + ch / 2, ch * 0.5, on ? "#fff" : PAL.navy); }
      if (s.times && sel >= 0 && q === 0) { const nm = ["مستطيل", "رسم حر", "نافذة", "الشاشة كاملة"][sel]; const b = E.outBack(clamp((T - s.times[sel]) / 0.25));
        g.save(); g.translate(w / 2, by + bh + h * 0.1); g.scale(b, b); g.fillStyle = PAL.brand; K.rr(g, -w * 0.15, -h * 0.055, w * 0.3, h * 0.11, h * 0.055); g.fill();
        K.text(g, nm, 0, 4, { size: h * 0.07, color: "#fff" }); g.restore(); }
      return; }
    if (m === "fullshot") { const T = (s.start ?? 0) + p * (s.dur ?? 1); desk(); snipWins(g, w, h);
      const ins = lerp(h * 0.03, h * 0.11, E.inOutCubic(clamp(p))); g.fillStyle = "rgba(10,20,40,.35)";
      g.fillRect(0, 0, w, ins); g.fillRect(0, h - ins, w, ins); g.fillRect(0, ins, ins, h - 2 * ins); g.fillRect(w - ins, ins, ins, h - 2 * ins);
      g.save(); g.strokeStyle = "#fff"; g.lineWidth = 6; g.setLineDash([22, 14]); g.lineDashOffset = -T * 40; g.strokeRect(ins, ins, w - 2 * ins, h - 2 * ins); g.restore();
      g.strokeStyle = "#fff"; g.lineWidth = 12; g.lineCap = "round"; const L = h * 0.08;
      [[ins, ins, 1, 1], [w - ins, ins, -1, 1], [ins, h - ins, 1, -1], [w - ins, h - ins, -1, -1]].forEach(([x, y, dx, dy]) => { g.beginPath(); g.moveTo(x + dx * L, y); g.lineTo(x, y); g.lineTo(x, y + dy * L); g.stroke(); });
      return; }
    if (m === "chat") { const T = (s.start ?? 0) + p * (s.dur ?? 1); desk(); const X = w * 0.1, Y = h * 0.05, W = w * 0.8, H = h * 0.82;
      K.windowBox(g, X, Y, W, H, s.wtitle || "Chat", { lines: 0 });
      const bub = (right, y, bw2, col) => { g.fillStyle = col; K.rr(g, right ? X + W - 28 - bw2 : X + 28, y, bw2, h * 0.085, 20); g.fill(); };
      bub(false, Y + h * 0.12, W * 0.46, "#E8EEF8"); bub(true, Y + h * 0.24, W * 0.34, "#DCE8FF"); bub(false, Y + h * 0.36, W * 0.3, "#E8EEF8");
      g.fillStyle = "#F1F5FC"; K.rr(g, X + 24, Y + H - h * 0.11, W - 48, h * 0.08, 20); g.fill();
      if (s.at != null && T >= s.at) { const b = E.outBack(clamp((T - s.at) / 0.35)); const tw = W * 0.38, th = tw * h / w, tx = X + W - 28 - tw, ty = Y + h * 0.48;
        g.save(); g.translate(tx + tw, ty + th); g.scale(b, b); g.translate(-(tx + tw), -(ty + th));
        g.fillStyle = "#DCE8FF"; K.rr(g, tx - 12, ty - 12, tw + 24, th + 24, 20); g.fill(); snipThumb(g, w, h, tx, ty, tw); g.restore();
        const gl = 1 - clamp((T - s.at - 0.35) / 0.6); if (gl > 0) { g.strokeStyle = `rgba(47,107,207,${gl})`; g.lineWidth = 8; K.rr(g, tx - 18, ty - 18, tw + 36, th + 36, 24); g.stroke(); } }
      else { g.fillStyle = PAL.brand; g.fillRect(X + 48, Y + H - h * 0.095, 4, h * 0.05); }
      return; }
    if (m === "snipapp") { const T = (s.start ?? 0) + p * (s.dur ?? 1); desk(); const X = w * 0.06, Y = h * 0.05, W = w * 0.88, H = h * 0.82;
      K.windowBox(g, X, Y, W, H, "Snipping Tool", { lines: 0 });
      const tools = 5, tb = h * 0.085; for (let i = 0; i < tools; i++) { const tx = X + 24 + i * (tb + 14), ty = Y + 56; const on = (i === 0 && p > 0.25 && p < 0.62) || (i === 4 && p >= 0.62);
        g.fillStyle = on ? PAL.brand : "#EEF3FB"; K.rr(g, tx, ty, tb, tb, 12); g.fill(); appIcon(g, i, tx + tb / 2, ty + tb / 2, tb * 0.5, on ? "#fff" : PAL.navy); }
      const tw = W * 0.6, th = tw * h / w, tx = X + (W - tw) / 2, ty = Y + 56 + tb + 24; snipThumb(g, w, h, tx, ty, tw);
      const d = clamp((p - 0.3) / 0.3); if (d > 0) { g.save(); g.strokeStyle = PAL.problem; g.lineWidth = 9; g.lineCap = "round"; g.beginPath();
        g.ellipse(tx + tw * 0.62, ty + th * 0.42, tw * 0.22, th * 0.2, -0.15, -1.6, -1.6 + d * Math.PI * 2.1); g.stroke(); g.restore(); }
      if (p >= 0.62) { const b = E.outBack(clamp((p - 0.62) / 0.12)); g.save(); g.translate(X + W - w * 0.14, Y + H - h * 0.09); g.scale(b, b);
        g.fillStyle = PAL.brand; K.rr(g, -w * 0.11, -h * 0.045, w * 0.22, h * 0.09, h * 0.045); g.fill(); K.text(g, "Saved", 0, 3, { size: h * 0.045, color: "#fff", weight: 700 }); g.restore(); }
      return; }
    if (m === "clipboard") { desk(); const a = E.outCubic(clamp(p / 0.25)); const pw = w * 0.36, x = w * 0.6, y = h * 0.92 - h * 0.78 * a;
      g.save(); g.shadowColor = "rgba(20,40,75,.3)"; g.shadowBlur = 24; g.fillStyle = "#fff"; K.rr(g, x, y, pw, h * 0.72, 16); g.fill(); g.restore();
      K.text(g, "Clipboard", x + 24, y + h * 0.06, { size: h * 0.05, align: "left", font: K.FONT_EN, weight: 700 });
      (s.items || ["Meeting 4 PM", "photo.png", "RTX specs", "Order #4821"]).forEach((it, i) => { const sel = s.thumb ? (i === 0 && p > 0.3) : (p > 0.45 && i === Math.min(3, Math.floor((p - 0.45) * 8)));
        const iy = y + h * 0.11 + i * h * 0.145; g.fillStyle = sel ? "#DCE8FF" : "#F3F6FC"; K.rr(g, x + 16, iy, pw - 32, h * 0.12, 12); g.fill();
        if (s.thumb && i === 0) { const nb = E.outBack(clamp((p - 0.18) / 0.2)); g.save(); g.translate(x + 30, iy + h * 0.06); g.scale(nb, nb); snipThumb(g, w, h, 0, -h * 0.045, w * 0.09); g.restore();
          K.text(g, it, x + 34 + w * 0.105, iy + h * 0.06, { size: h * 0.04, align: "left", font: K.FONT_EN, weight: 700 }); }
        else K.text(g, it, x + 34, iy + h * 0.06, { size: h * 0.045, align: "left", font: K.FONT_EN, weight: 600 }); }); return; }
    if (m === "cliphist") return cliphist(g, w, h, s);
    if (m === "doc") return docScreen(g, w, h, s);
    if (m === "secscreen") return secScreen(g, w, h, s);
    if (m === "secmini") return secMini(g, w, h, s);
    if (m === "steps") return stepsScreen(g, w, h, s);
    if (m === "tmopen") return tmOpen(g, w, h, s);
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
  const kb = K.keyboard(root, { u: 0.158, fnRow: !!(ctx.data.keyboard && ctx.data.keyboard.fn) }); kb.position.set(-1.25, 0, 0.45); kb.rotation.x = 0.06; items.push(kb);
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
      for (const side of ["left", "right"]) { const s = lastStarted(ctx.screens[side], t); R.mons[side].userData.tex.redraw({ ...s, p: s.dur ? Math.round(prog(t, s.start, s.dur) * Math.max(45, Math.round(s.dur * 15))) / Math.max(45, Math.round(s.dur * 15)) : 1 }); }
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

boot({ series: "shortcuts", loopHold: 1.35, label: "اختصارات ويندوز", closingLabel: "تيربو · اختصارات ويندوز", grid: true, header: "dots", build, handlers });
