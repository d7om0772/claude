// =============================================================================
// troubleshooting — قالب مؤقت (interim) لحزمة 14_desk_pc_red_green:
// مكتب قيمنق — الإضاءة والعلامات بالأحمر للمشكلة وبالأخضر للحل.
// مكتبة العناصر: ELEMENTS.md. يتبنى من جديد أول ما تتثبت الحزمة الأصلية.
// =============================================================================
import { boot, THREE, K, el, esc, rich, isolateLTR, life, prog, clamp, lerp, E } from "../common/core.js";
const { PAL } = K;
const SW = 1024, SH = 576;
const COL = { normal: PAL.blue, problem: PAL.red, solution: PAL.green };

// ---------- شاشة المونيتر ----------
function bg(g, c1 = "#1B2B4F", c2 = "#2F6BFF") { const gr = g.createLinearGradient(0, 0, SW, SH); gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, SW, SH); }
function panel(g, x, y, w, h, title) {
  g.save(); g.shadowColor = "rgba(0,0,0,.25)"; g.shadowBlur = 18; g.fillStyle = "#fff"; K.rr(g, x, y, w, h, 14); g.fill(); g.restore();
  if (title) { g.fillStyle = PAL.ink; g.font = `700 24px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText(title, x + 22, y + 40); }
}
const DEMOS = {
  desktop(g) { bg(g, "#BFD3FF", "#4D7DFF"); g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(0, SH - 44, SW, 44); },
  off(g) { g.fillStyle = "#0B1426"; g.fillRect(0, 0, SW, SH); },
  no_signal(g, p) { g.fillStyle = "#05090F"; g.fillRect(0, 0, SW, SH); const a = 0.6 + 0.4 * Math.sin(p * 20);
    g.globalAlpha = a; g.fillStyle = "#fff"; K.rr(g, SW / 2 - 200, SH / 2 - 60, 400, 120, 16); g.fill(); g.globalAlpha = 1;
    g.fillStyle = "#05090F"; g.font = `700 40px ${K.FONT_EN}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("No Signal", SW / 2, SH / 2); g.textBaseline = "alphabetic"; },
  text(g, p, s) { g.fillStyle = "#fff"; g.fillRect(0, 0, SW, SH); g.fillStyle = s.color || PAL.blue; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `800 ${s.size || 84}px ${s.ar ? K.FONT_AR : K.FONT_EN}`; g.fillText(s.text || "", SW / 2, SH / 2); g.textBaseline = "alphabetic"; },
  display_settings(g, p, s) { // Settings › Display › Advanced: Refresh rate
    bg(g, "#E9EFFA", "#DCE6F7"); panel(g, 70, 50, 884, 476, "Advanced display");
    g.font = `600 22px ${K.FONT_EN}`; g.fillStyle = PAL.slate; g.fillText("Choose a refresh rate", 100, 130);
    const from = s.from || "60 Hz", to = s.to || "144 Hz"; const q = clamp((p - 0.35) / 0.3);
    g.fillStyle = "#F3F6FC"; K.rr(g, 100, 150, 360, 60, 12); g.fill(); g.strokeStyle = q > 0.5 ? PAL.green : PAL.red; g.lineWidth = 4; K.rr(g, 100, 150, 360, 60, 12); g.stroke();
    g.fillStyle = PAL.ink; g.font = `700 28px ${K.FONT_EN}`; g.fillText(q > 0.5 ? to : from, 124, 190);
    if (q > 0 && q < 1) { const opts = [from, to]; opts.forEach((o, i) => { g.fillStyle = i === 1 ? "#DCE8FF" : "#fff"; K.rr(g, 100, 220 + i * 56, 360, 52, 10); g.fill(); g.fillStyle = PAL.ink; g.fillText(o, 124, 256 + i * 56); }); }
  },
  bios_xmp(g, p, s) {
    g.fillStyle = "#0F1B33"; g.fillRect(0, 0, SW, SH); g.fillStyle = "#9DB8F5"; g.font = `700 26px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText("BIOS › Memory", 60, 70);
    const on = p > 0.45; const rows = [["Memory Profile", on ? (s.profile || "XMP / EXPO Profile 1") : "Disabled"], ["Memory Speed", on ? (s.speed_on || "6000 MT/s") : (s.speed_off || "4800 MT/s")]];
    rows.forEach(([k, v], i) => { const y = 150 + i * 90; g.fillStyle = "#1B2B4F"; K.rr(g, 60, y - 50, 900, 72, 12); g.fill();
      g.fillStyle = "#fff"; g.font = `600 28px ${K.FONT_EN}`; g.fillText(k, 90, y - 4); g.fillStyle = on ? "#4BE3A8" : "#FF7A87"; g.textAlign = "right"; g.fillText(v, 930, y - 4); g.textAlign = "left"; });
  },
  temps(g, p, s) {
    bg(g, "#E9EFFA", "#DCE6F7"); panel(g, 70, 50, 884, 476, s.title || "Temperatures");
    const items = s.items || [["CPU", 92, 65], ["GPU", 84, 70]];
    items.forEach(([n, hot, ok], i) => { const v = lerp(hot, ok, clamp((p - 0.5) / 0.3)); const y = 150 + i * 150;
      g.fillStyle = PAL.ink; g.font = `700 30px ${K.FONT_EN}`; g.fillText(n, 110, y);
      g.fillStyle = "#EEF2FA"; K.rr(g, 110, y + 20, 700, 34, 17); g.fill();
      g.fillStyle = v > 85 ? PAL.red : v > 75 ? PAL.gold : PAL.green; K.rr(g, 110, y + 20, 700 * clamp(v / 100), 34, 17); g.fill();
      g.fillStyle = PAL.ink; g.textAlign = "right"; g.fillText(`${Math.round(v)}°C`, 900, y + 48); g.textAlign = "left"; });
  },
  startup(g, p, s) {
    bg(g, "#E9EFFA", "#DCE6F7"); panel(g, 70, 40, 884, 496, "Startup apps");
    const apps = s.apps || ["Game Launcher", "Chat App", "Cloud Sync", "Updater", "Music App"];
    apps.forEach((a, i) => { const y = 120 + i * 78; const off = p > 0.3 + i * 0.1 && i !== 0;
      g.fillStyle = PAL.ink; g.font = `600 26px ${K.FONT_EN}`; g.fillText(a, 110, y + 30);
      g.fillStyle = off ? "#C9D3E6" : PAL.blue; K.rr(g, 820, y + 6, 84, 40, 20); g.fill(); g.fillStyle = "#fff"; g.beginPath(); g.arc(off ? 842 : 882, y + 26, 15, 0, 7); g.fill(); });
  },
  fan_curve(g, p) {
    bg(g, "#E9EFFA", "#DCE6F7"); panel(g, 70, 40, 884, 496, "Fan curve");
    const q = E.inOutCubic(clamp((p - 0.3) / 0.4)); g.strokeStyle = "#E3EAF6"; g.lineWidth = 2;
    for (let i = 0; i <= 5; i++) { g.beginPath(); g.moveTo(120, 120 + i * 70); g.lineTo(900, 120 + i * 70); g.stroke(); }
    const pts = [[0, 0.75], [0.3, 0.8], [0.6, 0.9], [1, 1]].map(([x, y], i) => [x, lerp(y, [0.25, 0.3, 0.6, 1][i], q)]);
    g.strokeStyle = q > 0.5 ? PAL.green : PAL.red; g.lineWidth = 6; g.beginPath(); pts.forEach(([x, y], i) => { const X = 120 + x * 780, Y = 470 - y * 350; i ? g.lineTo(X, Y) : g.moveTo(X, Y); }); g.stroke();
    g.fillStyle = PAL.slate; g.font = `600 20px ${K.FONT_EN}`; g.fillText("Temp °C →", 760, 510); g.fillText("Fan %", 90, 104);
  },
  ping(g, p, s) {
    bg(g, "#0F1B33", "#1B2B4F"); const good = p > 0.5; const v = good ? (s.good || 18) : (s.bad || 140);
    g.fillStyle = good ? "#4BE3A8" : "#FF7A87"; g.font = `800 120px ${K.FONT_EN}`; g.textAlign = "center"; g.fillText(`${v} ms`, SW / 2, 280);
    g.strokeStyle = g.fillStyle; g.lineWidth = 5; g.beginPath();
    for (let i = 0; i <= 60; i++) { const x = 80 + i * 14.4, y = 450 - (good ? 10 + 6 * Math.sin(i) : 30 + 70 * Math.abs(Math.sin(i * 1.7))); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
  },
  stutter(g, p) { bg(g, "#3A4A6B", "#7D98D6"); const k = Math.floor(p * 18) % 3; g.fillStyle = "rgba(255,255,255,.75)";
    g.fillRect(100 + k * 40, 330, 300, 30); g.fillRect(560 - k * 30, 250, 260, 30); g.fillStyle = "#fff"; g.font = `800 40px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText(`${[24, 61, 19][k]} FPS`, 40, 70); },
};

function buildPC(root) {
  const g = new THREE.Group(); g.position.set(2.5, 0, -0.6); g.rotation.y = -0.25; root.add(g);
  const W = 1.35, Hh = 2.7, D = 2.5, t = 0.1;
  const add = (m, x, y, z) => { m.position.set(x, y, z); g.add(m); return m; };
  add(K.rbox(t, Hh, D, 0.04, "#EAF1FF"), -W / 2 + t / 2, Hh / 2, 0);
  add(K.rbox(W, t, D, 0.04, PAL.white), 0, t / 2, 0); add(K.rbox(W, t, D, 0.04, PAL.white), 0, Hh - t / 2, 0);
  add(K.rbox(W, Hh, t, 0.04, PAL.white), 0, Hh / 2, -D / 2 + t / 2); add(K.rbox(W, Hh, t, 0.04, PAL.white), 0, Hh / 2, D / 2 - t / 2);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.03, Hh - 0.1, D - 0.1), new THREE.MeshStandardMaterial({ color: "#CFE0FF", transparent: true, opacity: 0.18, roughness: 0.1 }));
  add(glass, W / 2 - 0.02, Hh / 2, 0);
  const strip = add(K.box(0.05, Hh - 0.3, 0.05, PAL.blue, { emissive: PAL.blue, ei: 1.2, unique: true }), W / 2 - 0.08, Hh / 2, D / 2 - 0.15);
  strip.material = strip.material.clone();
  const gpu = add(K.rbox(0.8, 0.3, 1.7, 0.05, "#1B2B4F"), -0.15, 1.0, -0.1);
  const gfan = K.fan(0.3, { frame: "#2E3F66", blade: "#8EA7DA" }); gfan.rotation.x = Math.PI / 2; add(gfan, -0.15, 0.84, -0.4);
  const mobo = add(K.rbox(0.05, 1.6, 1.8, 0.02, "#22304F"), -W / 2 + 0.13, 1.75, -0.15);
  const fans = []; for (let i = 0; i < 2; i++) { const f = K.fan(0.38, { glow: PAL.blue, frame: "#DDE6F7", blade: "#B9CBEF" }); add(f, 0, 0.9 + i * 0.95, D / 2 + 0.01); fans.push(f); }
  for (const f of fans) { f.userData.ring.material = f.userData.ring.material.clone(); }
  const light = new THREE.PointLight(PAL.blue, 5, 6, 1.5); add(light, 0.2, 1.6, 0.2);
  return { group: g, strip, fans, light, gpu, anchor: new THREE.Vector3(2.5, 3.2, -0.6) };
}
function buildMonitor(root) {
  const g = new THREE.Group(); g.position.set(-0.9, 0, -1.25); g.rotation.y = 0.12; root.add(g);
  const frame = K.rbox(3.5, 2.05, 0.14, 0.08, PAL.navy); frame.position.y = 2.25; g.add(frame);
  const tex = K.canvasTex(SW, SH, (gg, w, h, st) => (DEMOS[st.demo] || DEMOS.desktop)(gg, st.p ?? 1, st));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(3.34, 1.88), new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false }));
  scr.position.set(0, 2.25, 0.072); g.add(scr);
  const neck = K.rbox(0.24, 1.1, 0.16, 0.05, PAL.slate); neck.position.set(0, 0.85, -0.12); g.add(neck);
  const foot = K.rbox(1.1, 0.08, 0.6, 0.04, PAL.slate); foot.position.set(0, 0.04, -0.1); g.add(foot);
  return { group: g, tex, anchor: new THREE.Vector3(-0.9, 2.3, -1.2) };
}
function buildRouter(root) {
  const g = new THREE.Group(); g.position.set(-3.3, 0, 0.6); root.add(g);
  const b = K.rbox(1.0, 0.22, 0.7, 0.08, PAL.white); b.position.y = 0.11; g.add(b);
  for (const x of [-0.35, 0.35]) { const a = K.rbox(0.07, 0.8, 0.07, 0.03, PAL.slate); a.position.set(x, 0.55, -0.28); g.add(a); }
  const led = K.box(0.4, 0.03, 0.02, PAL.green, { emissive: PAL.green, ei: 1 }); led.position.set(0, 0.16, 0.36); g.add(led);
  return { group: g, anchor: new THREE.Vector3(-3.3, 0.9, 0.6) };
}

const BASE_CAMS = [{ yaw: 30, pitch: 30 }, { yaw: 40, pitch: 33 }, { yaw: 24, pitch: 28 }, { yaw: 36, pitch: 36 }];
const FOCUS = { pc: (c) => ({ target: [2.5, 1.4, -0.6], zoom: 1.6 }), monitor: () => ({ target: [-0.9, 2.2, -1.2], zoom: 1.6 }),
  router: () => ({ target: [-3.2, 0.5, 0.6], zoom: 2.0 }), desk: () => ({ target: [0, 0.9, 0], zoom: 0.92 }), keyboard: () => ({ target: [-0.6, 0.3, 1.0], zoom: 1.7, pitch: 50 }) };

async function build(ctx) {
  const { scene, camera, data } = ctx;
  K.lights(scene, { yaw: 35, shadowSize: 9 });
  K.shadowFloor(scene, -0.5, 40, 0.1);
  const desk = K.rbox(8.6, 0.36, 4.6, 0.14, PAL.desk); desk.position.set(0, -0.18, 0); scene.add(desk);
  for (const [x, z] of [[-3.9, -1.9], [3.9, -1.9], [-3.9, 1.9], [3.9, 1.9]]) { const l = K.rbox(0.28, 1.6, 0.28, 0.06, PAL.deskSide); l.position.set(x, -1.15, z); scene.add(l); }
  const root = new THREE.Group(); scene.add(root);
  const pc = buildPC(root), mon = buildMonitor(root);
  const kb = K.rbox(3.0, 0.14, 1.0, 0.06, PAL.white); kb.position.set(-0.8, 0.07, 1.0); root.add(kb);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 12; c++) { const k = K.rbox(0.2, 0.08, 0.18, 0.03, "#F7FAFF", { cast: false }); k.position.set(-0.8 - 1.32 + c * 0.24, 0.17, 1.0 - 0.33 + r * 0.22); root.add(k); }
  const mouse = K.rbox(0.38, 0.18, 0.6, 0.15, PAL.white); mouse.position.set(1.3, 0.1, 1.1); root.add(mouse);
  const router = (data.props || []).includes("router") ? buildRouter(root) : null;
  // ضوء الحالة (أحمر/أخضر)
  const stateLight = new THREE.PointLight(PAL.red, 0, 14, 1.2); stateLight.position.set(1.5, 4, 2); scene.add(stateLight);
  ctx.pc = pc; ctx.mon = mon; ctx.router = router; ctx.camFocus = []; ctx.screenEvs = []; ctx.stateEvs = [];
  const base = { ...BASE_CAMS[ctx.variant % BASE_CAMS.length], target: [0.2, 1.1, 0], zoom: 0.9, shiftY: 0.6 };
  ctx.camBase = base;
  return {
    update(t) {
      const intro = E.outCubic(prog(t, 0, 2.2));
      let cam = { ...base, yaw: base.yaw + 12 * (1 - intro) + 2 * Math.sin(t * 0.22), zoom: base.zoom * (0.82 + 0.18 * intro) };
      for (const f of ctx.camFocus) { const L = life(t, f.start, f.end, 0.6, 0.6); const w = E.inOutCubic(Math.min(L.pin, 1) * (1 - L.pout));
        if (w > 0) cam = K.lerpCam(cam, { ...cam, ...f.pose }, w); }
      K.setCam(camera, cam);
      for (const f of pc.fans) f.userData.rotor.rotation.z = -t * 5;
      // الحالة الحالية: آخر حدث مشكلة/حل بدأ
      const st = ctx.stateEvs.filter((e) => t >= e.start).pop();
      const mode = st && t < ctx.closingStart ? st.mode : "normal";
      const blend = st ? E.outCubic(prog(t, st.start, 0.5)) : 1;
      const col = new THREE.Color(COL[mode]);
      pc.strip.material.color.copy(col); pc.strip.material.emissive.copy(col);
      for (const f of pc.fans) { f.userData.ring.material.color.copy(col); f.userData.ring.material.emissive.copy(col); }
      pc.light.color.copy(col);
      stateLight.color.copy(col); stateLight.intensity = mode === "normal" ? 0 : 6 * blend * (mode === "problem" ? 0.85 + 0.15 * Math.sin(t * 6) : 1);
      // الشاشة
      const sv = ctx.screenEvs.filter((e) => t >= e.start).pop();
      if (!sv || t > sv.end + (sv.params.hold ?? 0.6)) mon.tex.redraw({ demo: data.idle_screen || "desktop", p: 1 });
      else mon.tex.redraw({ ...sv.params, p: Math.round(prog(t, sv.start, sv.end - sv.start) * 60) / 60 });
    },
  };
}

// ---------------------- العناصر ----------------------
function badge(ev, ctx, cls, icon) {
  const c = el("div", `badge ${cls}`, `<span class="ic">${icon}</span><span class="tx">${rich(ev.params.label || "")}</span>`, ctx.ov);
  c.dataset.safe = "1"; c.dataset.solo = `${cls}-${ev._i}`; return c;
}
function stateUpdate(ev, t, ctx) {
  const L = life(t, ev.start, ev.end, 0.35, 0.25); ev._c.style.opacity = L.a;
  const a = (ev.params.anchor === "monitor" ? ctx.mon.anchor : ctx.pc.anchor).clone(); const s = ctx.project(a);
  const w = ev._c.offsetWidth, h = ev._c.offsetHeight;
  const x = clamp(s.x - w / 2, 70, 940 - w), y = clamp(s.y - h - 20, 500, 1180 - h);
  ev._c.style.transform = `translate(${x}px, ${y}px) scale(${0.8 + 0.2 * L.s})`;
}
const handlers = {
  // E01 problem: {label, anchor:'pc'|'monitor'} — كل شي يصير أحمر + شارة تحذير
  E01: { setup(ev, ctx) { ev._c = badge(ev, ctx, "problem", "!"); ctx.stateEvs.push({ start: ev.start, mode: "problem" }); ctx.stateEvs.sort((a, b) => a.start - b.start); }, update: stateUpdate },
  // E02 solution: {label, anchor} — أخضر + علامة صح
  E02: { setup(ev, ctx) { ev._c = badge(ev, ctx, "solution", "✓"); ctx.stateEvs.push({ start: ev.start, mode: "solution" }); ctx.stateEvs.sort((a, b) => a.start - b.start); }, update: stateUpdate },
  // E03 camera: {focus:'pc'|'monitor'|'router'|'desk'|'keyboard'}
  E03: { setup(ev, ctx) { ctx.camFocus.push({ start: ev.start, end: ev.end, pose: { shiftY: 0.3, ...FOCUS[ev.params.focus || "desk"](ctx) } }); }, update() {} },
  // E04 steps: {title, steps:[...], times?:[...]} — الخطوة الحالية تتلون
  E04: {
    setup(ev, ctx) { const p = ev.params, c = el("div", "card steps", null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "steps-" + ev._i;
      c.innerHTML = (p.title ? `<h3>${rich(p.title)}</h3>` : "") + p.steps.map((s, i) => `<div class="st"><span class="n"><bdi dir="ltr">${i + 1}</bdi></span><span>${rich(s)}</span></div>`).join("");
      ev._c = c; ev._st = [...c.querySelectorAll(".st")]; ev._times = p.times || p.steps.map((_, i) => ev.start + 0.3 + i * ((ev.end - ev.start - 0.5) / p.steps.length)); },
    update(ev, t) { const L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; ev._c.style.transform = `translateY(${(1 - L.s) * 30}px)`;
      ev._st.forEach((s, i) => { s.classList.toggle("on", t >= ev._times[i] && (i === ev._st.length - 1 || t < ev._times[i + 1])); s.classList.toggle("done", ev._times[i + 1] != null && t >= ev._times[i + 1]); s.style.opacity = t >= ev._times[i] - 0.1 ? 1 : 0.35; }); },
  },
  // E05 ports_diagram: {wrong:'المنفذ الغلط', right:'المنفذ الصح'} — الكيبل ينتقل من منفذ الماذربورد لمنفذ كرت الشاشة
  E05: {
    setup(ev, ctx) { const p = ev.params, c = el("div", "card ports", null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "ports-" + ev._i;
      c.innerHTML = `<div class="io"><div class="grp mb"><div class="gl">${rich(p.wrong_label || "منافذ الماذربورد")}</div><div class="pt"></div><div class="pt"></div><div class="mk x">✗</div></div>
        <div class="grp gp"><div class="gl">${rich(p.right_label || "منافذ كرت الشاشة")}</div><div class="pt"></div><div class="pt"></div><div class="pt"></div><div class="mk v">✓</div></div><div class="plug"></div></div>`;
      ev._c = c; ev._plug = c.querySelector(".plug"); ev._x = c.querySelector(".x"); ev._v = c.querySelector(".v"); },
    update(ev, t) { const L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; ev._c.style.transform = `scale(${0.9 + 0.1 * L.s})`;
      const mid = ev.start + (ev.end - ev.start) * 0.45; const q = E.inOutCubic(prog(t, mid, 0.7));
      ev._plug.style.transform = `translate(${0}px, ${lerp(0, 196, q)}px)`; ev._x.style.opacity = t > ev.start + 0.4 && q < 0.5 ? 1 : 0; ev._v.style.opacity = q >= 1 ? 1 : 0; },
  },
  // E06 screen_demo: {demo:'no_signal'|'display_settings'|'bios_xmp'|'temps'|'startup'|'fan_curve'|'ping'|'stutter'|'text'|'off'|'desktop', ...params}
  E06: { setup(ev, ctx) { ctx.screenEvs.push(ev); ctx.screenEvs.sort((a, b) => a.start - b.start); }, update() {} },
  // E07 big_text: {text}
  E07: {
    setup(ev, ctx) { const c = el("div", "hook bt", rich(ev.params.text), ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "big-" + ev._i; ev._c = c; },
    update(ev, t) { const L = life(t, ev.start, ev.end, 0.3, 0.3); ev._c.style.opacity = L.a; ev._c.style.transform = `scale(${0.85 + 0.15 * L.s})`; },
  },
  // E08 gauge: {label, from, to, unit, max, bad_above}
  E08: {
    setup(ev, ctx) { const p = ev.params, c = el("div", "card gauge", null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "gauge-" + ev._i;
      c.innerHTML = `<div class="gl">${rich(p.label || "")}</div><div class="gv"><bdi dir="ltr" class="ltr num">0</bdi><span class="u">${esc(p.unit || "")}</span></div><div class="gb"><i></i></div>`;
      ev._c = c; ev._n = c.querySelector(".num"); ev._b = c.querySelector(".gb i"); },
    update(ev, t) { const p = ev.params, L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; ev._c.style.transform = `translateY(${(1 - L.s) * 30}px)`;
      const q = E.inOutCubic(prog(t, ev.start + (ev.end - ev.start) * 0.5, 0.8)); const v = lerp(p.from, p.to ?? p.from, q);
      ev._n.textContent = Math.round(v); ev._b.style.width = `${clamp(v / (p.max || 100)) * 100}%`;
      const bad = v > (p.bad_above ?? 1e9); ev._c.classList.toggle("bad", bad); ev._c.classList.toggle("good", !bad); },
  },
};

boot({ series: "troubleshooting", label: "مشاكل وحلولها", build, handlers });
