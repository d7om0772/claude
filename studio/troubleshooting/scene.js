// =============================================================================
// troubleshooting — قالب حزمة 14_desk_pc_red_green: "مكتب 3D مع كمبيوتر قيمنق (أحمر للمشكلة وأخضر للحل)"
// مكتب: شاشة، كيبورد، ماوس لاسلكي على ماوس باد كحلي، كيس قيمنق بجنب زجاجي وإضاءة RGB.
// الإضاءة والشارات حمراء وقت المشكلة وتقلب خضراء مع ✓ لحظة الحل. العناصر E01–E17 حسب
// brand/styles/troubleshooting/02_elements/elements.md (+ X01 عروض شاشة، X02 مخطط منافذ الشاشة الخلفية).
// =============================================================================
import { boot, THREE, K, el, esc, rich, life, prog, clamp, lerp, E, fmt, lastStarted } from "../common/core.js";
const { PAL } = K;
const RED = new THREE.Color(PAL.problem), GREEN = new THREE.Color(PAL.fix), BLUE = new THREE.Color(PAL.light);
const MON = { x: -1.25, z: -0.8, w: 2.8, h: 1.65 };
const PC = { x: 2.05, z: -0.45, w: 1.45, h: 2.3, d: 1.0 };
const MOUSE = { x: 0.95, z: 0.55 };
const KB = { x: -1.15, z: 0.5 };

// ---------------- الشاشة الرئيسية ----------------
function monitorDraw(ctx) {
  return (g, w, h, s) => {
    const p = s.p ?? 1, m = s.mode || "desktop";
    const desk = () => { K.screenBg(g, w, h); g.fillStyle = "rgba(255,255,255,.85)"; for (let i = 0; i < 3; i++) { K.rr(g, w * 0.03, h * (0.06 + i * 0.12), h * 0.07, h * 0.07, 8); g.fill(); } K.taskbar(g, w, h); };
    if (m === "logo") return K.logoScreen(g, w, h, ctx.logoFull, ctx.logoIcon);
    if (m === "missing_cursor") { desk(); const cx = w * 0.56, cy = h * 0.42, r = h * 0.13 * (1 + 0.08 * Math.sin(p * 18));
      g.strokeStyle = PAL.problem; g.lineWidth = h * 0.012; g.setLineDash([h * 0.03, h * 0.02]); g.beginPath(); g.arc(cx, cy, r, 0, 7); g.stroke(); g.setLineDash([]);
      K.text(g, "?", cx, cy, { size: h * 0.12, color: PAL.problem, font: K.FONT_EN }); g.globalAlpha = 0.35; K.cursor(g, cx + r * 0.9, cy + r * 0.6, h / 420, PAL.problem, "rgba(255,51,71,.3)"); g.globalAlpha = 1; return; }
    if (m === "cursor_back") { desk(); const cx = w * 0.56 + Math.sin(p * 4) * w * 0.05, cy = h * 0.42 + Math.cos(p * 3) * h * 0.03; const q = clamp(p / 0.4);
      g.strokeStyle = `rgba(34,211,106,${1 - q * 0.6})`; g.lineWidth = h * 0.012; g.beginPath(); g.arc(cx, cy, h * (0.05 + 0.12 * E.outCubic(q)), 0, 7); g.stroke();
      K.cursor(g, cx, cy, h / 380); if (q > 0.5) { g.fillStyle = PAL.fix; g.beginPath(); g.arc(cx + h * 0.14, cy - h * 0.1, h * 0.05, 0, 7); g.fill(); K.text(g, "✓", cx + h * 0.14, cy - h * 0.1, { size: h * 0.06, color: "#fff", font: K.FONT_EN }); } return; }
    if (m === "ctrl_alt_del") { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, "#1D2C48"); gr.addColorStop(1, "#2F6BCF"); g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const items = s.items || ["Lock", "Switch user", "Sign out", "Change a password", "Task Manager"]; const q = clamp(p / 0.3);
      items.forEach((it, i) => { g.globalAlpha = clamp(q * 3 - i * 0.4); K.text(g, it, w * 0.5, h * (0.2 + i * 0.12), { size: h * 0.07, weight: 600, color: "#fff", font: K.FONT_EN }); });
      g.globalAlpha = clamp(q * 3 - 2); g.strokeStyle = "#fff"; g.lineWidth = 3; K.rr(g, w * 0.82, h * 0.82, w * 0.14, h * 0.1, 8); g.stroke(); K.text(g, "Cancel", w * 0.89, h * 0.87, { size: h * 0.05, weight: 600, color: "#fff", font: K.FONT_EN }); g.globalAlpha = 1; return; }
    if (m === "comment") { desk(); const q = E.outBack(clamp(p / 0.3)); g.save(); g.translate(w / 2, h * 0.42); g.scale(q, q);
      g.fillStyle = "#fff"; K.rr(g, -w * 0.3, -h * 0.22, w * 0.6, h * 0.36, h * 0.07); g.fill(); g.beginPath(); g.moveTo(-w * 0.08, h * 0.13); g.lineTo(-w * 0.14, h * 0.24); g.lineTo(-w * 0.01, h * 0.13); g.fill();
      for (let i = 0; i < 3; i++) { g.fillStyle = PAL.brand; g.beginPath(); g.arc((i - 1) * w * 0.07, -h * 0.05, h * 0.035, 0, 7); g.fill(); } g.restore();
      K.text(g, s.text || "اكتب مشكلتك بالتعليقات", w / 2, h * 0.82, { size: h * 0.08, color: "#fff" }); return; }
    // X01 — عروض إضافية بنفس الأسلوب
    if (m === "no_signal") { g.fillStyle = "#05090F"; g.fillRect(0, 0, w, h); g.globalAlpha = 0.65 + 0.35 * Math.sin(p * 20);
      g.fillStyle = "#fff"; K.rr(g, w / 2 - w * 0.18, h / 2 - h * 0.1, w * 0.36, h * 0.2, 16); g.fill(); g.globalAlpha = 1;
      K.text(g, s.text || "No Signal", w / 2, h / 2, { size: h * 0.08, weight: 700, color: "#05090F", font: K.FONT_EN }); return; }
    if (m === "off") { g.fillStyle = "#0B1426"; g.fillRect(0, 0, w, h); return; }
    // input_menu — قائمة مدخلات الشاشة (OSD) على شاشة سوداء: {items, from, to, pick_at}: التحديد ينتقل من المدخل الغلط (أحمر) للصح (أخضر)
    if (m === "input_menu") { g.fillStyle = "#05090F"; g.fillRect(0, 0, w, h);
      const items = s.items || ["HDMI 1", "HDMI 2", "DisplayPort"], tNow = (s.start ?? 0) + p * (s.dur ?? 1);
      const picked = s.pick_at != null ? tNow >= s.pick_at : p > 0.55; const sel = picked ? (s.to ?? items.length - 1) : (s.from ?? 0);
      const q = E.outBack(clamp(p / 0.12)); g.save(); g.translate(w / 2, h / 2); g.scale(q, q); g.translate(-w / 2, -h / 2);
      g.fillStyle = "#1D2C48"; K.rr(g, w * 0.26, h * 0.1, w * 0.48, h * 0.8, 18); g.fill();
      K.text(g, s.title || "Input Source", w / 2, h * 0.2, { size: h * 0.065, weight: 700, color: "#9DB8F5", font: K.FONT_EN });
      items.forEach((it, i) => { const y = h * (0.36 + i * 0.17), on = i === sel; const col = on ? (picked ? PAL.fix : PAL.problem) : null;
        g.fillStyle = on ? col : "#2A3B5C"; K.rr(g, w * 0.3, y - h * 0.065, w * 0.4, h * 0.13, 12); g.fill();
        K.text(g, it, w / 2, y, { size: h * 0.06, weight: 700, color: "#fff", font: K.FONT_EN });
        if (on && picked) K.text(g, "✓", w * 0.66, y, { size: h * 0.06, weight: 800, color: "#fff", font: K.FONT_EN }); });
      g.restore(); return; }
    if (m === "text") { desk(); const col = s.color === "problem" ? PAL.problem : s.color === "fix" ? PAL.fix : (s.color || "#fff");
      const pulse = s.pulse ? 1 + 0.05 * Math.sin(p * (s.dur || 1) * 9) : 1; const ty = s.sub ? h * 0.4 : h * 0.45;
      if (s.color && s.color !== "#fff") { g.fillStyle = "rgba(255,255,255,.92)"; K.rr(g, w * 0.22, ty - h * 0.15, w * 0.56, h * 0.3, h * 0.06); g.fill(); }
      g.save(); g.translate(w / 2, ty); g.scale(pulse, pulse); K.text(g, s.text || "", 0, 0, { size: h * (s.size || 0.15), color: col, font: /[A-Za-z0-9]/.test(s.text || "") ? K.FONT_EN : undefined, weight: 800 }); g.restore();
      if (s.sub) K.text(g, s.sub, w / 2, h * 0.68, { size: h * 0.06, color: "#fff", font: /^[\x00-\x7F]+$/.test(s.sub) ? K.FONT_EN : undefined, weight: 700 });
      if (s.ring) { const q = clamp(p * (s.dur || 1) / 0.5); g.strokeStyle = `rgba(34,211,106,${1 - q * 0.5})`; g.lineWidth = h * 0.014; g.beginPath(); g.arc(w / 2, ty, h * (0.12 + 0.12 * E.outCubic(q)), 0, 7); g.stroke();
        if (q > 0.5) { g.fillStyle = PAL.fix; g.beginPath(); g.arc(w * 0.76, ty - h * 0.13, h * 0.06, 0, 7); g.fill(); K.text(g, "✓", w * 0.76, ty - h * 0.13, { size: h * 0.07, color: "#fff", font: K.FONT_EN }); } }
      return; }
    // settings_nav — مسار الإعدادات: {items, times}: كل عنصر يتحدد بالأزرق مع كلمته
    if (m === "settings_nav") { desk(); const tNow = (s.start ?? 0) + p * (s.dur ?? 1); const items = s.items || ["Settings", "System", "Display"];
      K.windowBox(g, w * 0.08, h * 0.08, w * 0.84, h * 0.78, s.title || "Settings", { lines: 0 });
      let cur = -1; items.forEach((_, i) => { if (tNow >= (s.times?.[i] ?? (s.start ?? 0) + i * 0.6)) cur = i; });
      items.forEach((it, i) => { const y = h * (0.3 + i * 0.13); const on = i === cur, done = i < cur;
        if (i > cur) g.globalAlpha = 0.35; g.fillStyle = on ? PAL.brand : done ? "#E6EEFB" : "#F3F6FC"; K.rr(g, w * 0.13 + i * w * 0.04, y - h * 0.05, w * 0.6, h * 0.1, 10); g.fill();
        K.text(g, (i ? "› " : "") + it, w * 0.16 + i * w * 0.04, y, { size: h * 0.055, align: "left", font: K.FONT_EN, weight: on ? 800 : 600, color: on ? "#fff" : PAL.navy }); g.globalAlpha = 1; });
      return; }
    // spec_table — مواصفات الشاشة لكل منفذ بدون أرقام مخترعة: {rows:[[المنفذ، القيمة]]}
    if (m === "spec_table") { desk(); K.windowBox(g, w * 0.08, h * 0.08, w * 0.84, h * 0.78, s.title || "Monitor specs", { lines: 0 });
      (s.rows || [["HDMI", "? Hz"], ["DisplayPort", "? Hz"]]).forEach(([k, v], i) => { const y = h * (0.36 + i * 0.2); g.globalAlpha = clamp(p * (s.dur || 1) / 0.3 - i * 0.6);
        g.fillStyle = "#F3F6FC"; K.rr(g, w * 0.13, y - h * 0.07, w * 0.74, h * 0.14, 12); g.fill();
        K.text(g, k, w * 0.16, y, { size: h * 0.065, align: "left", font: K.FONT_EN, weight: 700 }); K.text(g, v, w * 0.84, y, { size: h * 0.07, align: "right", font: K.FONT_EN, weight: 800, color: PAL.brand }); g.globalAlpha = 1; });
      return; }
    if (m === "display_settings") { desk(); K.windowBox(g, w * 0.08, h * 0.08, w * 0.84, h * 0.78, "Settings › Display › Advanced display", { lines: 0 });
      K.text(g, "Choose a refresh rate", w * 0.13, h * 0.3, { size: h * 0.055, weight: 600, align: "left", font: K.FONT_EN, color: PAL.muted });
      const tNow = (s.start ?? 0) + p * (s.dur ?? 1);
      const ok = s.fix_at != null ? tNow >= s.fix_at : s.state === "problem" ? false : clamp((p - 0.35) / 0.3) > 0.5;
      g.fillStyle = "#F3F6FC"; K.rr(g, w * 0.13, h * 0.37, w * 0.36, h * 0.13, 12); g.fill(); g.strokeStyle = ok ? PAL.fix : PAL.problem; g.lineWidth = 5; K.rr(g, w * 0.13, h * 0.37, w * 0.36, h * 0.13, 12); g.stroke();
      K.text(g, ok ? (s.to || "144 Hz") : (s.from || "60 Hz"), w * 0.16, h * 0.435, { size: h * 0.07, align: "left", font: K.FONT_EN, weight: 700 });
      if (s.star_at != null && tNow >= s.star_at) { const q = E.outBack(clamp((tNow - s.star_at) / 0.3)); g.save(); g.translate(w * 0.56, h * 0.435); g.scale(q, q);
        g.fillStyle = PAL.brand; g.beginPath(); g.arc(0, 0, h * 0.06, 0, 7); g.fill(); K.text(g, "*", 0, h * 0.015, { size: h * 0.11, color: "#fff", font: K.FONT_EN, weight: 800 }); g.restore(); }
      return; }
    if (m === "bios_xmp") { g.fillStyle = "#0F1B33"; g.fillRect(0, 0, w, h); K.text(g, "BIOS › Memory", w * 0.06, h * 0.12, { size: h * 0.06, align: "left", font: K.FONT_EN, weight: 700, color: "#9DB8F5" });
      const on = p > 0.45; [["Memory Profile", on ? (s.profile || "XMP / EXPO Profile 1") : "Disabled"], ["Memory Speed", on ? (s.speed_on || "6000 MT/s") : (s.speed_off || "4800 MT/s")]].forEach(([k, v], i) => {
        const y = h * (0.32 + i * 0.22); g.fillStyle = "#1B2B4F"; K.rr(g, w * 0.06, y - h * 0.08, w * 0.88, h * 0.16, 12); g.fill();
        K.text(g, k, w * 0.09, y, { size: h * 0.06, align: "left", font: K.FONT_EN, weight: 600, color: "#fff" }); K.text(g, v, w * 0.91, y, { size: h * 0.06, align: "right", font: K.FONT_EN, weight: 700, color: on ? "#4BE3A8" : "#FF7A87" }); }); return; }
    if (m === "temps") { desk(); K.windowBox(g, w * 0.08, h * 0.08, w * 0.84, h * 0.78, s.title || "Temperatures", { lines: 0 });
      (s.items || [["CPU", 92, 65], ["GPU", 84, 70]]).forEach(([n, hot, ok], i) => { const v = lerp(hot, ok, clamp((p - 0.5) / 0.3)); const y = h * (0.32 + i * 0.24);
        K.text(g, n, w * 0.13, y, { size: h * 0.065, align: "left", font: K.FONT_EN, weight: 700 }); g.fillStyle = "#EEF2FA"; K.rr(g, w * 0.13, y + h * 0.05, w * 0.6, h * 0.06, h * 0.03); g.fill();
        g.fillStyle = v > 85 ? PAL.problem : v > 75 ? "#FFB020" : PAL.fix; K.rr(g, w * 0.13, y + h * 0.05, w * 0.6 * clamp(v / 100), h * 0.06, h * 0.03); g.fill();
        K.text(g, `${Math.round(v)}°C`, w * 0.86, y + h * 0.08, { size: h * 0.065, align: "right", font: K.FONT_EN, weight: 800 }); }); return; }
    if (m === "startup") { desk(); K.windowBox(g, w * 0.08, h * 0.06, w * 0.84, h * 0.82, "Startup apps", { lines: 0 });
      (s.apps || ["Game Launcher", "Chat App", "Cloud Sync", "Updater"]).forEach((a, i) => { const y = h * (0.26 + i * 0.15); const off = p > 0.3 + i * 0.1 && i !== 0;
        K.text(g, a, w * 0.13, y, { size: h * 0.06, align: "left", font: K.FONT_EN, weight: 600 }); g.fillStyle = off ? "#C9D3E6" : PAL.brand; K.rr(g, w * 0.78, y - h * 0.04, w * 0.08, h * 0.08, h * 0.04); g.fill();
        g.fillStyle = "#fff"; g.beginPath(); g.arc(off ? w * 0.80 : w * 0.84, y, h * 0.03, 0, 7); g.fill(); }); return; }
    if (m === "fan_curve" || m === "ping" || m === "stutter") { g.fillStyle = "#0f1d38"; g.fillRect(0, 0, w, h);
      const good = p > 0.5; const col = good ? "#4BE3A8" : "#FF7A87";
      if (m === "ping") K.text(g, `${good ? (s.good || 18) : (s.bad || 140)} ms`, w / 2, h * 0.35, { size: h * 0.2, color: col, font: K.FONT_EN, weight: 800 });
      if (m === "stutter") K.text(g, `${good ? (s.good || 60) : [24, 61, 19][Math.floor(p * 18) % 3]} FPS`, w / 2, h * 0.35, { size: h * 0.2, color: col, font: K.FONT_EN, weight: 800 });
      if (m === "fan_curve") K.text(g, s.text || "Fan curve", w / 2, h * 0.2, { size: h * 0.09, color: "#fff", font: K.FONT_EN, weight: 700 });
      g.strokeStyle = col; g.lineWidth = 6; g.beginPath();
      for (let i = 0; i <= 60; i++) { const x = w * 0.08 + i * w * 0.0140, y = h * 0.8 - (m === "fan_curve" ? h * 0.4 * Math.pow(i / 60, good ? 2.2 : 0.4) : (good ? h * 0.03 + h * 0.01 * Math.sin(i) : h * 0.05 + h * 0.15 * Math.abs(Math.sin(i * 1.7)))); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.stroke(); return; }
    desk();
  };
}
function laptopDraw(g, w, h, s) {
  K.screenBg(g, w, h); K.taskbar(g, w, h);
  if (s.cursor) { K.cursor(g, w * 0.5, h * 0.4, h / 260); }
}
// بطن الماوس: مكان البطارية + زر OFF/ON
function bellyDraw(g, w, h, s) {
  g.fillStyle = "#DDE4EF"; g.beginPath(); g.ellipse(w / 2, h / 2, w * 0.46, h * 0.47, 0, 0, 7); g.fill();
  g.lineWidth = 10; g.strokeStyle = PAL.navy; g.stroke();
  g.fillStyle = "#C3CEDF"; K.rr(g, w * 0.3, h * 0.14, w * 0.4, h * 0.3, 18); g.fill(); g.strokeStyle = "#8D9AB2"; g.lineWidth = 4; g.stroke();
  K.text(g, "+  −", w / 2, h * 0.29, { size: h * 0.07, color: PAL.navy, font: K.FONT_EN, weight: 700, dir: "ltr" });
  g.fillStyle = PAL.navy; g.beginPath(); g.arc(w / 2, h * 0.56, h * 0.025, 0, 7); g.fill();
  const on = s.on ?? 0; g.fillStyle = "#1D2C48"; K.rr(g, w * 0.34, h * 0.68, w * 0.32, h * 0.09, h * 0.045); g.fill();
  g.fillStyle = on > 0.5 ? PAL.fix : PAL.problem; g.beginPath(); g.arc(w * (0.39 + 0.22 * on), h * 0.725, h * 0.036, 0, 7); g.fill();
  K.text(g, "OFF", w * 0.25, h * 0.725, { size: h * 0.045, color: PAL.problem, font: K.FONT_EN, weight: 800 }); K.text(g, "ON", w * 0.75, h * 0.725, { size: h * 0.045, color: on > 0.5 ? PAL.fix : "#8D9AB2", font: K.FONT_EN, weight: 800 });
}
// ظهر الكيس: منافذ البوردة (فوق) + منافذ كرت الشاشة (تحت) + مروحة + باور
function rearDraw(g, w, h, s) {
  g.fillStyle = "#EEF3FB"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#D7E0EE"; K.rr(g, w * 0.08, h * 0.05, w * 0.3, h * 0.36, 12); g.fill();      // درع منافذ البوردة
  const port = (x, y, pw, ph, hl) => { g.fillStyle = "#1D2C48"; K.rr(g, x, y, pw, ph, 6); g.fill(); if (hl) { g.strokeStyle = hl; g.lineWidth = 8; K.rr(g, x - 6, y - 6, pw + 12, ph + 12, 10); g.stroke(); } };
  for (let r = 0; r < 4; r++) port(w * 0.12, h * (0.08 + r * 0.07), w * 0.09, h * 0.04, (s.hl === "usb_rear" && r === 2) ? s.hlColor : null);
  port(w * 0.25, h * 0.1, w * 0.1, h * 0.045, s.hl === "mobo_hdmi" ? s.hlColor : null); K.text(g, "HDMI", w * 0.3, h * 0.17, { size: h * 0.028, color: "#5B6B82", font: K.FONT_EN, weight: 700 });
  for (let i = 0; i < 3; i++) { g.fillStyle = "#C9D3E6"; K.rr(g, w * 0.08, h * (0.5 + i * 0.07), w * 0.84, h * 0.05, 6); g.fill(); }   // فتحات PCIe
  g.fillStyle = "#2E4170"; K.rr(g, w * 0.08, h * 0.5, w * 0.84, h * 0.05, 6); g.fill();                                        // براكيت كرت الشاشة
  for (let i = 0; i < 3; i++) port(w * (0.14 + i * 0.12), h * 0.505, w * 0.09, h * 0.04, ((s.hl === "gpu_out" || s.hl === "gpu_hdmi") && i === 0) || (s.hl === "gpu_dp" && i === 1) ? s.hlColor : null);
  if (s.gpuLabels) ["HDMI", "DP", "DP"].forEach((n, i) => { g.fillStyle = "#fff"; K.rr(g, w * (0.125 + i * 0.12), h * 0.565, w * 0.12, h * 0.045, 6); g.fill();
    K.text(g, n, w * (0.185 + i * 0.12), h * 0.588, { size: h * (i ? 0.032 : 0.026), color: i === 0 && s.hl === "gpu_hdmi" ? PAL.problem : i === 1 && s.hl === "gpu_dp" ? PAL.fix : PAL.navy, font: K.FONT_EN, weight: 800 }); });
  K.text(g, "GPU", w * 0.6, h * 0.525, { size: h * 0.03, color: "#cfe0ff", font: K.FONT_EN, weight: 800 });
  g.strokeStyle = "#B8C6DD"; g.lineWidth = 6; g.beginPath(); g.arc(w * 0.68, h * 0.22, h * 0.13, 0, 7); g.stroke();       // مروحة خلفية
  g.fillStyle = "#1D2C48"; K.rr(g, w * 0.08, h * 0.8, w * 0.36, h * 0.14, 10); g.fill();                                       // الباور
}
const PORT_UV = { mobo_hdmi: [0.3, 0.122], usb_rear: [0.165, 0.24], gpu_out: [0.185, 0.525], gpu_hdmi: [0.185, 0.525], gpu_dp: [0.305, 0.525], usb_front: null };

function buildPC(root) {
  const g = new THREE.Group(); g.position.set(PC.x, 0.02, PC.z); root.add(g);
  const inner = new THREE.Group(); g.add(inner);   // كل شي يلف مع الكيس
  const t = 0.07, panel = (w, h, d, c = PAL.white) => K.rbox(w, h, d, 0.03, c);
  K.place(panel(PC.w, PC.h, t), 0, PC.h / 2, -PC.d / 2 + t / 2, inner);
  K.place(panel(PC.w, t, PC.d), 0, t / 2, 0, inner); K.place(panel(PC.w, t, PC.d), 0, PC.h - t / 2, 0, inner);
  K.place(panel(t, PC.h, PC.d), PC.w / 2 - t / 2, PC.h / 2, 0, inner);
  const rearTex = K.canvasTex(512, 812, rearDraw); rearTex.redraw({});
  const rear = new THREE.Mesh(new THREE.BoxGeometry(t, PC.h, PC.d), [K.mat(PAL.white), new THREE.MeshStandardMaterial({ map: rearTex.tex, roughness: 0.6 }), K.mat(PAL.white), K.mat(PAL.white), K.mat(PAL.white), K.mat(PAL.white)]);
  rear.material[1] = new THREE.MeshStandardMaterial({ map: rearTex.tex, roughness: 0.6 });
  // وجه الظهر (-x): BoxGeometry ترتيب الوجوه: +x, -x, +y, -y, +z, -z
  K.place(rear, -PC.w / 2 + t / 2, PC.h / 2, 0, inner);
  // الداخل
  K.place(K.rbox(1.0, 1.35, 0.04, 0.02, PAL.inside), -0.12, 1.4, -PC.d / 2 + 0.1, inner);
  K.place(K.rbox(1.1, 0.24, 0.42, 0.04, PAL.inside), -0.1, 0.95, -0.15, inner);
  const gstrip = K.box(0.95, 0.03, 0.02, PAL.problem, { emissive: PAL.problem, ei: 1.3, unique: true }); K.place(gstrip, -0.1, 0.95, 0.07, inner);
  const fan = K.fan(0.33, { ring: PAL.problem }); fan.rotation.y = -Math.PI / 2; K.place(fan, PC.w / 2 - 0.12, 1.55, -0.02, inner);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 8, 40), K.mat(PAL.problem, { emissive: PAL.problem, ei: 1.4, unique: true })); K.place(ring2, -0.15, 1.65, -PC.d / 2 + 0.16, inner);
  const strip = K.box(0.04, PC.h - 0.35, 0.04, PAL.problem, { emissive: PAL.problem, ei: 1.4, unique: true }); K.place(strip, PC.w / 2 - 0.12, PC.h / 2, PC.d / 2 - 0.1, inner);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(PC.w - 0.05, PC.h - 0.05, 0.02), new THREE.MeshStandardMaterial({ color: "#DCE9FF", transparent: true, opacity: 0.18, roughness: 0.05, depthWrite: false }));
  K.place(glass, 0, PC.h / 2, PC.d / 2, inner);
  const light = new THREE.PointLight(PAL.problem, 4, 4.5, 1.4); K.place(light, 0, 1.3, 0.35, inner);
  const glow = K.glowSprite(PAL.problem, 2.8); K.place(glow, 0.2, 1.3, 0.9, inner);
  // منفذ USB أمامي فوق الواجهة
  const fio = K.rbox(0.3, 0.03, 0.14, 0.01, PAL.navy); K.place(fio, PC.w / 2 - 0.3, PC.h + 0.005, 0.15, inner);
  const plug = new THREE.Group(); K.place(K.rbox(0.09, 0.22, 0.05, 0.015, "#C9D3E6", { metal: 0.3 }), 0, 0.11, 0, plug); K.place(K.rbox(0.11, 0.12, 0.07, 0.02, PAL.navy), 0, 0.27, 0, plug);
  const plugGlow = K.glowSprite(PAL.problem, 0.7); plug.add(plugGlow); plugGlow.position.y = 0.05; plug.visible = false; inner.add(plug);
  return { group: g, inner, rgb: [gstrip, ring2, strip, fan.userData.ring], fan, light, glow, plug, plugGlow, rearTex };
}
function buildMouse(root) {
  const m = new THREE.Group(); m.position.set(MOUSE.x, 0.03, MOUSE.z); root.add(m);
  const body = new THREE.Group(); m.add(body);
  K.place(K.rbox(0.36, 0.17, 0.56, 0.16, PAL.navy), 0, 0.085, 0, body);
  const led = K.box(0.02, 0.012, 0.08, PAL.fix, { emissive: PAL.fix, ei: 1.2, unique: true }); K.place(led, 0, 0.172, -0.12, body);
  const btex = K.canvasTex(256, 384, bellyDraw); btex.redraw({ on: 0 });
  const belly = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.52), new THREE.MeshBasicMaterial({ map: btex.tex, transparent: true }));
  belly.rotation.x = Math.PI / 2; belly.position.y = -0.002; body.add(belly);
  const batt = (c) => { const b = new THREE.Group(); const cy = K.cyl(0.035, 0.035, 0.16, c); cy.rotation.z = Math.PI / 2; b.add(cy); return b; };
  const oldB = batt("#8D9AB2"), newB = batt(PAL.fix); oldB.visible = newB.visible = false; m.add(oldB, newB);
  return { group: m, body, btex, led, oldB, newB };
}
function buildLaptop(root) {
  const g = new THREE.Group(); g.position.set(KB.x, 0, KB.z); root.add(g);
  K.place(K.rbox(1.9, 0.07, 1.25, 0.04, "#E9EFF9"), 0, 0.035, 0, g);
  const kb = K.keyboard(g, { u: 0.11, fnRow: true }); kb.position.set(-0.17, 0.0, -0.2); kb.scale.setScalar(1);
  const tp = K.rbox(0.62, 0.012, 0.36, 0.03, "#D5DEED", { unique: true }); K.place(tp, 0, 0.075, 0.38, g);
  const lid = new THREE.Group(); lid.position.set(0, 0.07, -0.62); g.add(lid);
  K.place(K.rbox(1.9, 1.15, 0.05, 0.04, "#E9EFF9"), 0, 0.575, 0, lid);
  const lt = K.canvasTex(640, 384, laptopDraw); lt.redraw({ cursor: false });
  K.place(new THREE.Mesh(new THREE.PlaneGeometry(1.76, 1.02), new THREE.MeshBasicMaterial({ map: lt.tex })), 0, 0.59, 0.027, lid); lid.rotation.x = -0.12;
  const xTex = K.canvasTex(256, 160, (gg, w, h, s) => { if (s.mode === "x") { gg.strokeStyle = PAL.problem; gg.lineWidth = 18; gg.lineCap = "round"; gg.beginPath(); gg.moveTo(80, 30); gg.lineTo(176, 130); gg.moveTo(176, 30); gg.lineTo(80, 130); gg.stroke(); }
    if (s.mode === "ok") { gg.fillStyle = PAL.fix; gg.beginPath(); gg.arc(128, 80, 50, 0, 7); gg.fill(); K.text(gg, "✓", 128, 82, { size: 64, color: "#fff", font: K.FONT_EN }); } });
  xTex.redraw({ mode: "none" });
  const xp = new THREE.Mesh(new THREE.PlaneGeometry(0.58, 0.34), new THREE.MeshBasicMaterial({ map: xTex.tex, transparent: true })); xp.rotation.x = -Math.PI / 2; K.place(xp, 0, 0.083, 0.38, g);
  g.visible = false;
  return { group: g, kb, tp, lt, xTex };
}

const POSE = {
  wide: { target: [0.25, 0.75, -0.3], yaw: 0, pitch: 12, zoom: 1.12, shiftY: 0.55 },
  monitor: { target: [MON.x, 0.75 + MON.h / 2, MON.z], yaw: 0, pitch: 5, zoom: 2.35, shiftY: 0.05 },
  desk: { target: [-0.6, 0.85, -0.2], yaw: 0, pitch: 18, zoom: 1.75, shiftY: -0.05 },
  mouse: { target: [MOUSE.x, 0.4, MOUSE.z + 0.2], yaw: 0, pitch: 12, zoom: 7.0, shiftY: 0.0 },
  case: { target: [PC.x, 1.15, PC.z], yaw: 0, pitch: 7, zoom: 2.5, shiftY: -0.05 },
  caseTop: { target: [PC.x + 0.25, 1.75, PC.z], yaw: 0, pitch: 18, zoom: 2.55, shiftY: -0.2 },
  laptop: { target: [KB.x, 0.55, KB.z - 0.2], yaw: 0, pitch: 24, zoom: 2.5, shiftY: -0.05 },
  logo: { target: [MON.x, 0.75 + MON.h / 2, MON.z], yaw: 0, pitch: 3, zoom: 2.6, shiftY: -0.04 },
};
const VAR = [{ yaw: 0 }, { yaw: 5 }, { yaw: -5 }, { yaw: 3, pitch: 2 }];
const CAM_FOR = { E01: "wide", E02: "monitor", E04: "mouse", E05: "mouse", E06: "mouse", E07: "caseTop", E08: "case", E09: "laptop", E10: "laptop", E11: "laptop",
  E12: "desk", E13: "monitor", E14: "wide", E15: "wide", E16: "monitor" };

async function build(ctx) {
  const { scene, data } = ctx;
  K.lights(scene, { yaw: 18, shadowSize: 9 });
  const rm = K.room(scene, { w: 9.2, d: 5.6, h: 5.6, floorY: -2.35, rugX: -0.3, rugZ: 1.5 });
  const root = new THREE.Group(); scene.add(root);
  K.desk(root, { w: 6.6, d: 2.6, legH: 2.2 });
  const mon = K.monitor(root, { w: MON.w, h: MON.h, draw: monitorDraw(ctx) }); mon.position.set(MON.x, 0, MON.z);
  const kb = K.keyboard(root, { u: 0.165 }); kb.position.set(KB.x, 0, KB.z);
  K.place(K.rbox(1.25, 0.025, 1.0, 0.05, PAL.navy), MOUSE.x, 0.012, MOUSE.z, root);
  const ms = buildMouse(root); const pc = buildPC(root); const lap = buildLaptop(root);
  const plate = K.logoPlate(root, ctx.logoIcon, { w: 0.9, h: 1.05 }); plate.position.set(-3.4, 2.0, -2.6);
  const shelf = new THREE.Group(); shelf.position.set(1.2, 2.6, -2.55); root.add(shelf);
  K.place(K.rbox(2.2, 0.08, 0.45, 0.03, "#FFFFFF"), 0, 0, 0, shelf);
  [[-0.8, 0.5, PAL.brand], [-0.62, 0.42, PAL.navy], [-0.46, 0.55, PAL.light]].forEach(([x, hh, c]) => K.place(K.rbox(0.13, hh, 0.32, 0.02, c), x, hh / 2 + 0.04, 0, shelf));
  K.place(K.cyl(0.14, 0.14, 0.3, "#DCE6F6"), 0.6, 0.19, 0, shelf);
  const items = [mon, kb, ms.group, pc.group, plate, shelf]; items.forEach((it, i) => { it.userData.popDelay = 0.08 * i; it.userData.baseScale = it.scale.clone(); });
  ctx.T = { mon, kb, ms, pc, lap };
  ctx.states = [{ t: -1, mode: data.initial_state || "problem" }];
  ctx.screens = [{ start: 0, mode: data.idle_screen || "desktop" }]; ctx.lapScreens = [{ start: 0, cursor: false }];
  ctx.presses = []; ctx.marks = []; ctx.fx = { flip: [], batt: [], sw: [], frontPlug: [], rot: [], laptop: [], fkey: [], fnFix: [], hop: [] };
  const evs = (data.events || []).slice().sort((a, b) => a.start - b.start);
  const v = VAR[ctx.variant % VAR.length];
  const pose = (n) => ({ ...POSE[n], yaw: (POSE[n].yaw || 0) + (v.yaw || 0), pitch: POSE[n].pitch + (v.pitch || 0) });
  const keys = [{ t: 0, pose: pose("wide") }];
  for (const e of evs) { const n = e.params?.cam || CAM_FOR[e.el]; if (n) keys.push({ t: e.start, pose: pose(n), dur: 0.85 }); }
  keys.push({ t: ctx.closingStart - 0.35, pose: pose("logo"), dur: 0.85 }); keys.sort((a, b) => a.t - b.t); ctx.camKeys = keys;
  ctx.screens.push({ start: ctx.closingStart - 0.35, mode: "logo" });
  ctx.sortAll = () => { ctx.states.sort((a, b) => a.t - b.t); ctx.screens.sort((a, b) => a.start - b.start); ctx.lapScreens.sort((a, b) => a.start - b.start); };
  return {
    curtain: (t) => { const k = lastStarted(ctx.camKeys, t, "t"); const close = k && k.pose.zoom > 1.3 && t < ctx.closingStart - 0.4; return close ? clamp((t - k.t) / 0.5) : 0; },
    update(t) {
      for (const it of items) { const q = E.spring(clamp((t - it.userData.popDelay) / 0.7)); it.scale.copy(it.userData.baseScale).multiplyScalar(Math.max(0.001, q)); }
      root.position.y = 0.03 * Math.sin(t * 1.1); rm.position.y = root.position.y;
      K.setCam(ctx.camera, K.cameraTrack(ctx.camKeys, t));
      pc.fan.userData.rotor.rotation.z = -t * 7;
      // الحالة اللونية: أحمر ↔ أخضر (ومع الختام: أزرق)
      const st = lastStarted(ctx.states, t, "t"); const mode = t >= ctx.closingStart ? "normal" : st.mode;
      const prev = ctx.states[Math.max(0, ctx.states.indexOf(st) - 1)]; const bl = E.outCubic(clamp((t - st.t) / 0.4));
      const colOf = (m) => (m === "fix" ? GREEN : m === "problem" ? RED : BLUE);
      const col = colOf(prev.mode).clone().lerp(colOf(mode), bl);
      for (const r of pc.rgb) { r.material.color.copy(col); r.material.emissive.copy(col); r.material.emissiveIntensity = 1.4; }
      pc.light.color.copy(col); pc.glow.material.color.copy(col); pc.glow.material.opacity = mode === "normal" ? 0.25 : 0.55 + (mode === "problem" ? 0.15 * Math.sin(t * 6) : 0);
      // الكيبورد
      kb.userData.reset(); lap.kb.userData.reset();
      for (const pr of ctx.presses) pr.keys.forEach((k, i) => { const kt = pr.times[i]; if (t >= kt && t <= pr.end) (pr.laptop ? lap.kb : kb).userData.press(k, clamp((t - kt) / 0.1), pr.color || PAL.brand); });
      // E10: زر في صف F ينبض برتقالي
      for (const f of ctx.fx.fkey) if (t >= f.start && t <= f.end) lap.kb.userData.press(f.key, 0.5 + 0.5 * Math.sin((t - f.start) * 8), "#FF9F1C");
      // الماوس: يقلب ويوجّه بطنه للكاميرا (E04/E06)
      let flip = 0; for (const f of ctx.fx.flip) flip = Math.max(flip, E.inOutCubic(clamp((t - f.start) / 0.5)) * (1 - E.inOutCubic(clamp((t - f.end) / 0.4))));
      ms.body.rotation.x = -Math.PI / 2 * 1.0 * flip; ms.body.position.y = 0.32 * flip; ms.body.position.z = 0.25 * flip;
      let on = 0; for (const s of ctx.fx.sw) on = Math.max(on, E.inOutCubic(clamp((t - s.at) / 0.25)));
      ms.btex.redraw({ on: Math.round(on * 20) / 20 });
      ms.led.material.emissiveIntensity = on > 0.5 || !ctx.fx.sw.length ? 1.2 : 0.1;
      // البطاريات: القديمة تطير والجديدة تنزل
      ms.oldB.visible = ms.newB.visible = false;
      for (const b of ctx.fx.batt) { if (t < b.start || t > b.start + 1.6) continue;
        const qa = clamp((t - b.start) / 0.6), qb = clamp((t - b.start - 0.5) / 0.5);
        ms.oldB.visible = qa < 1; ms.oldB.position.set(0.4 * qa, 0.42 + 0.6 * qa - 0.9 * qa * qa, 0.35 + 0.3 * qa); ms.oldB.rotation.z = 4 * qa;
        ms.newB.visible = qb > 0; ms.newB.position.set(0, 0.42 + 0.6 * (1 - E.outCubic(qb)), 0.31); }
      // الوصلة الأمامية (E07) والكيس يلف 90° (E08)
      let rot = 0; for (const r of ctx.fx.rot) rot = Math.max(rot, E.inOutCubic(clamp((t - r.start) / 0.8)) * (1 - E.inOutCubic(clamp((t - r.end) / 0.6))));
      pc.inner.rotation.y = Math.PI / 2 * rot;
      pc.plug.visible = false; let plugCol = RED;
      for (const f of ctx.fx.frontPlug) if (t >= f.start && t <= f.end + 0.3) { const q = E.outBack(clamp((t - f.start) / 0.5)); pc.plug.visible = true;
        pc.plug.position.set(PC.w / 2 - 0.3, PC.h + 0.3 * q, 0.15); pc.plug.rotation.set(0, 0, 0); pc.plugGlow.material.opacity = 0.5 + 0.4 * Math.sin((t - f.start) * 10); plugCol = RED; }
      let hl = null;
      for (const r of ctx.fx.rot) if (t >= r.start && t <= r.end + 0.5 && r.to) { const q = E.inOutCubic(clamp((t - r.plugAt) / 0.6));
        const uv = (k) => { const u = PORT_UV[k]; return u ? new THREE.Vector3(-PC.w / 2 - 0.04, PC.h * (1 - u[1]), -PC.d / 2 + u[0] * PC.d) : new THREE.Vector3(PC.w / 2 - 0.3, PC.h + 0.3, 0.15); };
        const a = uv(r.from), b = uv(r.to); pc.plug.visible = rot > 0.3; pc.plug.position.copy(a).lerp(b, q); pc.plug.position.x -= 0.12 * Math.sin(Math.PI * q) + 0.12;
        pc.plug.rotation.set(0, 0, -Math.PI / 2); const done = q >= 1; plugCol = done ? GREEN : RED; pc.plugGlow.material.opacity = done ? 0.9 : 0.3;
        hl = { hl: done ? r.to : r.from, hlColor: done ? PAL.fix : PAL.problem, gpuLabels: /^gpu_(hdmi|dp)$/.test(r.from) || /^gpu_(hdmi|dp)$/.test(r.to) }; }
      pc.plugGlow.material.color.copy(plugCol);
      pc.rearTex.redraw(hl || {});
      // اللابتوب بدل الكيبورد (E09–E11) + الماوس على جهاز ثاني (E14)
      let lapOn = 0, lapAt = null; for (const l of ctx.fx.laptop) { const q = E.spring(clamp((t - l.start) / 0.5)) * (1 - E.inOutCubic(clamp((t - l.end) / 0.4))); if (q > lapOn) { lapOn = q; lapAt = l; } }
      lap.group.visible = lapOn > 0.01; lap.group.scale.setScalar(Math.max(0.001, lapOn)); kb.visible = !(lapOn > 0.5 && lapAt && !lapAt.front);
      if (lapAt && lapAt.front) { lap.group.position.set(PC.x - 0.2, 0, PC.z + 1.05); lap.group.scale.setScalar(Math.max(0.001, lapOn * 0.6)); } else lap.group.position.set(KB.x, 0, KB.z);
      let tpMode = "none"; for (const l of ctx.fx.laptop) if (t >= l.start && t <= l.end) tpMode = l.x ? "x" : tpMode;
      for (const f of ctx.fx.fnFix) if (t >= f.at) tpMode = t <= f.end ? "ok" : tpMode;
      lap.xTex.redraw({ mode: tpMode }); lap.tp.material.color.set(tpMode === "ok" ? "#BFF0D3" : tpMode === "x" ? "#FFD2D7" : "#D5DEED");
      const ls = lastStarted(ctx.lapScreens, t); lap.lt.redraw({ cursor: !!ls.cursor });
      // الماوس ينط بقوس للجهاز الثاني (E14)
      ms.group.position.set(MOUSE.x, 0.03, MOUSE.z);
      for (const hpp of ctx.fx.hop) if (t >= hpp.start) { const q = E.inOutCubic(clamp((t - hpp.start) / 0.6)); const to = new THREE.Vector3(PC.x - 0.2 + 0.45, 0.08, PC.z + 1.25);
        if (t <= hpp.end + 0.4) ms.group.position.set(lerp(MOUSE.x, to.x, q), 0.03 + 0.8 * Math.sin(Math.PI * q) + (to.y - 0.03) * q, lerp(MOUSE.z, to.z, q)); }
      // الشاشة
      const sc = lastStarted(ctx.screens, t); mon.userData.tex.redraw({ ...sc, p: sc.dur ? Math.round(prog(t, sc.start, sc.dur) * 45) / 45 : 1 });
      // علامات الاستفهام (E15)
      for (const mk of ctx.marks) { const L = life(t, mk.start, mk.end, 0.3, 0.25); mk.el.style.opacity = L.a;
        const s = ctx.project(mk.anchor()); mk.el.style.transform = `translate(${clamp(s.x - 42, 130, 870)}px, ${clamp(s.y - 120, 650, 1300)}px) scale(${0.6 + 0.4 * L.s})`; }
    },
  };
}

// ---------------------- العناصر ----------------------
const state = (mode) => ({ setup(ev, ctx) { ctx.states.push({ t: ev.params.state_at ?? ev.start, mode }); ctx.sortAll(); } });
const scr = (mode, extra = {}) => ({ setup(ev, ctx) { ctx.screens.push({ start: ev.start, dur: Math.max(0.6, ev.end - ev.start), mode, ...extra, ...ev.params }); ctx.sortAll(); } });
const merge = (...hs) => ({ setup(ev, ctx) { for (const h of hs) h.setup(ev, ctx); } });
const handlers = {
  // E01 المشهد الواسع — المكتب يتركب بنطّات والإضاءة حمراء
  E01: state("problem"),
  // E02 المؤشر المختفي — دائرة حمراء متقطعة "?" على الشاشة. العنوان بكلمة حمراء: !!اختفى؟!!
  E02: merge(state("problem"), scr("missing_cursor")),
  // E03 شارة الخطوة ونقاط التقدم — {index, title, desc, fix_at}: الشارة حمراء ثم تقلب أخضر مع ✓
  E03: { setup(ev, ctx) { const p = ev.params, i = (p.index ?? 1) - 1;
    ctx.addTitle({ start: ev.start, chip: p.label || `الخطوة ${i + 1}`, chip_color: "problem", chip_fix_at: p.fix_at, main: p.title, desc: p.desc, desc_at: p.desc_at, keys: p.keys, key_times: p.key_times, keys_ok_at: p.keys_ok_at });
    ctx.dots.events.push({ t: ev.start, i, state: "problem" }); ctx.states.push({ t: ev.start, mode: "problem" });
    if (p.fix_at != null) { ctx.dots.events.push({ t: p.fix_at, i, state: "fix" }); ctx.states.push({ t: p.fix_at, mode: "fix" }); }
    if (p.keys) ctx.presses.push({ keys: p.keys, times: p.key_times || p.keys.map((_, k) => ev.start + 0.2 + k * 0.25), end: ev.end, color: p.keys_ok_at ? PAL.fix : PAL.brand });
    ctx.sortAll(); } },
  // E04 بطن الماوس والبطارية — {swap_at}
  E04: { setup(ev, ctx) { ctx.fx.flip.push({ start: ev.start, end: ev.end }); ctx.fx.batt.push({ start: ev.params.swap_at ?? ev.start + 0.6 }); } },
  // E05 أيقونة الشحن — دائرة خضراء فيها صاعقة جنب الماوس
  E05: { setup(ev, ctx) { const c = el("div", "qmark", "⚡", ctx.ov); c.style.background = "var(--fix-badge)"; c.dataset.solo = "charge-" + ev._i;
    ctx.marks.push({ el: c, start: ev.start, end: ev.end, anchor: () => new THREE.Vector3(MOUSE.x + 0.45, 0.4, MOUSE.z) }); } },
  // E06 زر OFF / ON — {at}: ينزلق من OFF الأحمر لـ ON الأخضر
  E06: { setup(ev, ctx) { ctx.fx.flip.push({ start: ev.start, end: ev.end }); const at = ev.params.at ?? ev.start + 0.6; ctx.fx.sw.push({ at }); ctx.states.push({ t: at, mode: "fix" }); ctx.sortAll(); } },
  // E07 المنفذ الأمامي — الوصلة تطلع من المنفذ الأمامي مع وميض أحمر
  E07: { setup(ev, ctx) { ctx.fx.frontPlug.push({ start: ev.start, end: ev.end }); ctx.states.push({ t: ev.start, mode: "problem" }); ctx.sortAll(); } },
  // E08 ظهر الكيس والمنفذ الخلفي — {from:'usb_front'|'mobo_hdmi', to:'usb_rear'|'gpu_out', plug_at}: لفّة 90° والوصلة تنتقل وتتوهج أخضر
  E08: { setup(ev, ctx) { const p = ev.params; const plugAt = p.plug_at ?? ev.start + 0.9;
    ctx.fx.rot.push({ start: ev.start, end: ev.end, from: p.from || "usb_front", to: p.to || "usb_rear", plugAt }); ctx.states.push({ t: plugAt + 0.6, mode: "fix" }); ctx.sortAll(); } },
  // E09 التاتش باد المقفول — لابتوب بدل الكيبورد، والتاتش باد عليه X أحمر
  E09: { setup(ev, ctx) { const end = ev.params.until ?? ev.end + 6; ctx.fx.laptop.push({ start: ev.start, end, x: true }); ctx.states.push({ t: ev.start, mode: "problem" }); ctx.sortAll(); } },
  // E10 البحث عن الزر — {key:"F7"} ينبض بإطار برتقالي
  E10: { setup(ev, ctx) { ctx.fx.fkey.push({ start: ev.start, end: ev.end, key: ev.params.key || "F7" }); } },
  // E11 Fn + الزر = تشغيل — {key:"F7", key_times:[..], fix_at}
  E11: { setup(ev, ctx) { const p = ev.params, key = p.key || "F7"; const times = p.key_times || [ev.start + 0.2, ev.start + 0.45]; const fix = p.fix_at ?? times[1] + 0.25;
    ctx.presses.push({ keys: ["Fn", key], times, end: ev.end, laptop: true, color: PAL.fix }); ctx.fx.fnFix.push({ at: fix, end: ev.end + 0.3 });
    ctx.lapScreens.push({ start: fix, cursor: true }); ctx.states.push({ t: fix, mode: "fix" }); ctx.sortAll(); } },
  // E12 شاشة Ctrl + Alt + Delete — {key_times}: الأزرار تنضغط بالترتيب والشاشة تتبدل
  E12: { setup(ev, ctx) { const p = ev.params; const times = p.key_times || [ev.start + 0.2, ev.start + 0.45, ev.start + 0.7];
    ctx.presses.push({ keys: ["Ctrl", "Alt", "Del"], times, end: ev.end });
    ctx.screens.push({ start: times[2] + 0.1, dur: 1.2, mode: "ctrl_alt_del", items: p.items }); ctx.sortAll(); } },
  // E13 رجوع المؤشر — {key_at}: بعد Esc يرجع سطح المكتب والمؤشر بحلقة خضراء ✓
  E13: { setup(ev, ctx) { const at = ev.params.key_at ?? ev.start + 0.2; ctx.presses.push({ keys: ["Esc"], times: [at], end: ev.end, color: PAL.fix });
    ctx.screens.push({ start: at + 0.15, dur: Math.max(1, ev.end - at), mode: "cursor_back" }); ctx.states.push({ t: at + 0.15, mode: "fix" }); ctx.sortAll(); } },
  // E14 الماوس على جهاز ثاني — لابتوب صغير قدام الكيس والماوس ينط عليه
  E14: { setup(ev, ctx) { ctx.fx.laptop.push({ start: ev.start, end: ev.end, front: true }); ctx.fx.hop.push({ start: ev.start + 0.4, end: ev.end });
    ctx.lapScreens.push({ start: ev.start + 1.0, cursor: true }); ctx.lapScreens.push({ start: ev.end + 0.5, cursor: false }); ctx.states.push({ t: ev.start + 1.0, mode: "fix" }); ctx.sortAll(); } },
  // E15 علامات الاستفهام — "؟" حمراء فوق الكيس وفوق الماوس
  E15: { setup(ev, ctx) { for (const [a, k] of [[() => new THREE.Vector3(PC.x, PC.h + 0.6, PC.z), "pc"], [() => new THREE.Vector3(MOUSE.x, 0.7, MOUSE.z), "mouse"]]) {
    const c = el("div", "qmark", "؟", ctx.ov); c.dataset.solo = `q-${k}-${ev._i}`; ctx.marks.push({ el: c, start: ev.start, end: ev.end, anchor: a }); } } },
  // E16 فقاعة التعليق — {text, title, desc}
  E16: { setup(ev, ctx) { ctx.screens.push({ start: ev.start, dur: 1, mode: "comment", text: ev.params.text }); ctx.sortAll();
    ctx.addTitle({ start: ev.start, main: ev.params.title || "واجهتك مشكلة ثانية؟", size: "mid", desc: ev.params.desc }); } },
  // E17 الختام — تلقائي
  E17: {},
  // X01 عرض شاشة بنفس الأسلوب — {mode:'no_signal'|'display_settings'|'bios_xmp'|'temps'|'startup'|'fan_curve'|'ping'|'stutter'|'text'|'off'|'desktop', state?:'problem'|'fix', ...}
  X01: { setup(ev, ctx) { const p = ev.params; ctx.screens.push({ start: ev.start, dur: Math.max(0.6, ev.end - ev.start), ...p }); if (p.state) ctx.states.push({ t: ev.start, mode: p.state }); ctx.sortAll(); } },
};

boot({ series: "troubleshooting", loopHold: 1.1, label: "المشاكل وحلولها", closingLabel: "المشاكل وحلولها · تيربو", grid: false, header: "dots", build, handlers });
