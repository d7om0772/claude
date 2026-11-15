// =============================================================================
// budget-builds — قالب حزمة 15_iso_build_drop: "تجميعة أيزومترية: القطع تنزل في الكيس والشاشة تعرض الأداء"
// غرفة مصغّرة (طاولة + شاشة + كيس مفتوح من فوق) → لفّة الكاميرا قدام الكيس → أشباح القطع بالأزرق →
// كل قطعة تنزل لمكانها وتثبت بومضة، والعداد "باقي" ينزل مع كل سعر → بيانات على الشاشة → الكيس يكتمل →
// المجموع → الأداء → الشعار على الشاشة. العناصر E01–E15 حسب brand/styles/budget-builds/02_elements/elements.md
// =============================================================================
import { boot, THREE, K, el, esc, rich, life, prog, clamp, lerp, E, fmt, lastStarted } from "../common/core.js";
const { PAL } = K;

const CASE = { w: 2.0, h: 2.25, d: 1.1, x: 1.85, z: -0.35 };   // الكيس: جنبه الزجاجي يواجه +z
const MON = { x: -1.55, z: -0.85, w: 2.7, h: 1.62 };
const CAT = { cpu: "المعالج", cooler: "مبرد المعالج", mobo: "المذربورد", gpu: "كرت الشاشة", ram: "الرام", ssd: "التخزين", psu: "الباور", case: "الكيس", fans: "المراوح" };

// ---------- القطع (إحداثيات داخل الكيس: x عمق الكيس، y ارتفاع، z سماكة؛ اللوحة الخلفية z≈-0.45) ----------
function boardTex() {
  const t = K.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = PAL.parts; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(143,186,240,.28)"; g.lineWidth = 3;
    for (let i = 0; i < 12; i++) { g.beginPath(); const y = 40 + i * 36; g.moveTo(20, y); g.lineTo(180 + (i * 41) % 160, y); g.lineTo(220 + (i * 41) % 160, y + 18); g.lineTo(492, y + 18); g.stroke(); }
    g.fillStyle = "#2E4170"; K.rr(g, 150, 70, 150, 150, 12); g.fill();
    g.fillStyle = "#2B3B63"; for (let i = 0; i < 4; i++) g.fillRect(360 + i * 22, 50, 12, 220);
    g.fillStyle = "#33467A"; g.fillRect(40, 320, 420, 22); g.fillRect(40, 400, 420, 14);
  });
  t.redraw({}); return t;
}
const PARTS = {
  mobo: { size: [1.4, 1.55, 0.05], pos: [-0.12, 1.35, -0.42], build(g) {
    K.place(K.rbox(1.4, 1.55, 0.05, 0.02, PAL.parts), 0, 0, 0, g);
    const f = new THREE.Mesh(new THREE.PlaneGeometry(1.36, 1.5), new THREE.MeshStandardMaterial({ map: boardTex().tex, roughness: 0.7 })); f.position.z = 0.027; g.add(f); } },
  cpu: { size: [0.34, 0.34, 0.06], pos: [-0.2, 1.72, -0.37], build(g) {
    K.place(K.rbox(0.34, 0.34, 0.05, 0.02, PAL.silver, { metal: 0.4, rough: 0.35 }), 0, 0, 0, g);
    K.place(K.rbox(0.24, 0.24, 0.02, 0.01, "#C8D2E3", { metal: 0.5, rough: 0.3 }), 0, 0, 0.03, g); } },
  cooler: { size: [0.56, 0.62, 0.5], pos: [-0.2, 1.72, -0.1], build(g) {
    for (let i = 0; i < 10; i++) K.place(K.box(0.5, 0.6, 0.03, PAL.steel, { metal: 0.5, rough: 0.35 }), 0, 0, -0.2 + i * 0.045, g);
    for (const x of [-0.12, 0.12]) { const p = K.cyl(0.025, 0.025, 0.66, "#C9D3E6", { metal: 0.6 }); K.place(p, x, 0, 0, g); }
    const f = K.fan(0.27, { frame: "#E9EFF9", ring: PAL.light }); f.rotation.y = Math.PI / 2; K.place(f, 0.3, 0, 0, g); g.userData.fan = f; } },
  ram: { size: [0.34, 0.74, 0.26], pos: [0.36, 1.68, -0.3], build(g) {
    for (const x of [-0.1, 0.1]) { K.place(K.rbox(0.11, 0.72, 0.24, 0.025, PAL.parts), x, 0, 0, g);
      K.place(K.box(0.03, 0.66, 0.02, PAL.light, { emissive: PAL.light, ei: 1.1 }), x, 0, 0.125, g); } } },
  ssd: { size: [0.42, 0.1, 0.03], pos: [-0.2, 1.25, -0.39], build(g) {
    K.place(K.rbox(0.42, 0.1, 0.025, 0.01, "#2E4170"), 0, 0, 0, g); K.place(K.box(0.14, 0.06, 0.027, PAL.light), 0.08, 0, 0.002, g); } },
  gpu: { size: [1.55, 0.28, 0.52], pos: [-0.12, 1.0, -0.15], build(g) {
    K.place(K.rbox(1.55, 0.26, 0.5, 0.05, PAL.parts), 0, 0, 0, g);
    K.place(K.box(1.4, 0.035, 0.02, PAL.light, { emissive: PAL.light, ei: 1.1 }), 0, 0, 0.255, g);
    K.place(K.rbox(1.5, 0.05, 0.46, 0.02, "#2E4170"), 0, 0.15, 0, g);
    for (const x of [-0.42, 0.32]) { const f = K.fan(0.19, { frame: "#2E4170", blade: "#5A6E99", depth: 0.06 }); f.rotation.x = Math.PI / 2; K.place(f, x, -0.14, 0, g); } } },
  psu: { size: [0.8, 0.45, 0.72], pos: [-0.5, 0.32, -0.08], build(g) {
    K.place(K.rbox(0.8, 0.45, 0.72, 0.05, PAL.parts), 0, 0, 0, g);
    K.place(K.box(0.6, 0.03, 0.02, PAL.light, { emissive: PAL.light, ei: 0.8 }), 0, 0.12, 0.365, g); } },
  fans: { size: [0.08, 1.6, 0.6], pos: [0.9, 1.3, -0.05], build(g) {
    g.userData.fans = [];
    for (const y of [-0.5, 0.0, 0.5]) { const f = K.fan(0.24, { frame: "#E9EFF9", ring: PAL.light, depth: 0.07 }); f.rotation.y = -Math.PI / 2; K.place(f, 0, y, 0, g); g.userData.fans.push(f); } } },
};

function buildCase(root) {
  const c = new THREE.Group(); c.position.set(CASE.x, 0.02, CASE.z); root.add(c);
  const panel = (w, h, d) => K.rbox(w, h, d, 0.03, PAL.white, { opacity: 0.94 });
  const t = 0.07;
  K.place(panel(CASE.w, CASE.h, t), 0, CASE.h / 2, -CASE.d / 2 + t / 2, c);       // الخلف (لوحة البوردة)
  K.place(panel(CASE.w, t, CASE.d), 0, t / 2, 0, c);                               // القاع
  K.place(panel(t, CASE.h, CASE.d), -CASE.w / 2 + t / 2, CASE.h / 2, 0, c);        // الطرف الخلفي
  K.place(panel(t, CASE.h, CASE.d), CASE.w / 2 - t / 2, CASE.h / 2, 0, c);         // الواجهة
  for (const z of [-CASE.d / 2 + 0.03, CASE.d / 2 - 0.03]) K.place(K.rbox(CASE.w, 0.06, 0.06, 0.02, "#E7EEF9"), 0, CASE.h - 0.03, z, c); // إطار علوي (مفتوح من فوق)
  K.place(K.rbox(CASE.w, 0.06, 0.06, 0.02, "#E7EEF9"), 0, 0.06, CASE.d / 2 - 0.03, c);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) K.place(K.cyl(0.06, 0.06, 0.05, "#C9D3E6", { seg: 12 }), sx * (CASE.w / 2 - 0.15), -0.01, sz * (CASE.d / 2 - 0.12), c);
  // الزجاج (E11): يتركب في الآخر
  const glass = new THREE.Mesh(new THREE.BoxGeometry(CASE.w - 0.02, CASE.h - 0.02, 0.02),
    new THREE.MeshStandardMaterial({ color: "#DCE9FF", transparent: true, opacity: 0, roughness: 0.08, metalness: 0.1, depthWrite: false }));
  K.place(glass, 0, CASE.h / 2, CASE.d / 2, c);
  const inside = new THREE.PointLight(0xcfe0ff, 0, 4, 1.6); K.place(inside, 0.2, 1.4, 0.3, c);
  return { group: c, glass, inside };
}

// ---------- محتوى الشاشة ----------
function drawScreen(ctx) {
  return (g, w, h, s) => {
    const p = s.p ?? 1;
    if (s.mode === "logo") { K.logoScreen(g, w, h, ctx.logoFull, ctx.logoIcon); return; }
    if (s.mode === "perf") { // E13: شاشة داكنة + عداد دائري
      g.fillStyle = "#0f1d38"; g.fillRect(0, 0, w, h);
      const rg = g.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, h * 0.7); rg.addColorStop(0, "rgba(58,123,213,.45)"); rg.addColorStop(1, "rgba(58,123,213,0)");
      g.fillStyle = rg; g.fillRect(0, 0, w, h);
      K.text(g, `${s.head || "الأداء على"} ${s.res || ""}`.trim(), w / 2, h * 0.13, { size: h * 0.085, color: "#ffffff" });
      const cx = w / 2, cy = h * 0.56, r = h * 0.29, a0 = Math.PI * 0.8, a1 = Math.PI * 2.2;
      g.lineCap = "round"; g.lineWidth = h * 0.045; g.strokeStyle = "rgba(255,255,255,.12)"; g.beginPath(); g.arc(cx, cy, r, a0, a1); g.stroke();
      const gr = g.createLinearGradient(cx - r, cy, cx + r, cy); gr.addColorStop(0, "#4a8fe7"); gr.addColorStop(1, "#8fc0ff");
      const q = E.outCubic(clamp(p * 1.4)); g.strokeStyle = gr; g.beginPath(); g.arc(cx, cy, r, a0, a0 + (a1 - a0) * 0.82 * q); g.stroke();
      const val = s.fps_num ? Math.round(s.fps_num * q) + (s.fps_plus ? "+" : "") : (s.fps || "");
      K.text(g, String(val), cx, cy - h * 0.01, { size: h * 0.17, color: "#fff", font: K.FONT_EN, weight: 800 });
      K.text(g, "FPS", cx, cy + h * 0.12, { size: h * 0.075, color: "#cfe0ff", font: K.FONT_EN, weight: 700 });
      (s.chips || []).forEach((c, i) => { g.font = `700 ${h * 0.06}px ${K.FONT_AR}`; const cw = g.measureText(c).width + h * 0.1, x = i ? w * 0.96 - cw : w * 0.04, y = h * 0.83;
        g.fillStyle = i ? "rgba(143,192,255,.9)" : "rgba(255,255,255,.14)"; K.rr(g, x, y, cw, h * 0.11, h * 0.055); g.fill();
        K.text(g, c, x + cw / 2, y + h * 0.058, { size: h * 0.06, color: i ? PAL.ink : "#fff", weight: 700 }); });
      return;
    }
    K.screenBg(g, w, h);
    if (s.mode === "goal") { // E01/E02: هدف كبير على الشاشة (مثل 1440p)
      const q = E.outBack(clamp(p * 2.2));
      g.save(); g.translate(w / 2, h * 0.47); g.scale(0.6 + 0.4 * q, 0.6 + 0.4 * q);
      g.fillStyle = "rgba(255,255,255,.92)"; K.rr(g, -w * 0.3, -h * 0.17, w * 0.6, h * 0.34, h * 0.06); g.fill();
      K.text(g, s.text || "", 0, 4, { size: h * 0.19, color: PAL.brand, weight: 800 }); g.restore();
      K.taskbar(g, w, h); return;
    }
    if (s.mode === "bars") { // E08: عمودين "بدون / مع" + سهم
      g.fillStyle = "rgba(255,255,255,.95)"; K.rr(g, w * 0.07, h * 0.08, w * 0.86, h * 0.8, 26); g.fill();
      K.text(g, s.title || "", w / 2, h * 0.17, { size: h * 0.1, color: PAL.ink });
      const bars = s.bars || []; const mx = Math.max(...bars.map((b) => b.value), 1);
      bars.forEach((b, i) => { const bw = w * 0.18, x = w * (0.5 - 0.2 + i * 0.4) - bw / 2, base = h * 0.72;
        const q = E.outCubic(clamp(p * 2 - i * 0.3)); const bh = h * 0.36 * (b.value / mx) * q;
        g.fillStyle = i ? PAL.brand : "#A9B9D6"; K.rr(g, x, base - bh, bw, bh, 12); g.fill();
        K.text(g, String(Math.round(b.value * q)) + (b.unit ? " " + b.unit : ""), x + bw / 2, base - bh - h * 0.04, { size: h * 0.085, color: PAL.ink, font: K.FONT_EN, weight: 800 });
        K.text(g, b.label, x + bw / 2, base + h * 0.075, { size: h * 0.075, color: PAL.muted, weight: 700 }); });
      return;
    }
    if (s.mode === "list") { // E12: قائمة القطع + شريط الميزانية + المجموع
      g.fillStyle = "rgba(255,255,255,.96)"; K.rr(g, w * 0.06, h * 0.06, w * 0.88, h * 0.86, 26); g.fill();
      const X1 = w * 0.9, X0 = w * 0.1;
      K.text(g, s.head || "تجميعتك", X1, h * 0.13, { size: h * 0.08, color: PAL.ink, align: "right" });
      K.text(g, `${fmt(s.total)} / ${fmt(s.budget)}`, X0, h * 0.13, { size: h * 0.065, color: PAL.muted, align: "left", font: K.FONT_EN, weight: 700 });
      g.fillStyle = "#E3EAF6"; K.rr(g, X0, h * 0.18, X1 - X0, h * 0.022, 6); g.fill();
      g.fillStyle = PAL.brand; K.rr(g, X1 - (X1 - X0) * clamp(s.total / s.budget) * clamp(p * 1.5), h * 0.18, (X1 - X0) * clamp(s.total / s.budget) * clamp(p * 1.5), h * 0.022, 6); g.fill();
      const items = s.items || []; const rowH = Math.min(h * 0.11, (h * 0.54) / Math.max(1, items.length));
      items.forEach((it, i) => { const q = clamp(p * (items.length + 2) - i); if (q <= 0) return; const y = h * 0.25 + i * rowH + rowH / 2;
        g.globalAlpha = q; g.fillStyle = PAL.brand; g.beginPath(); g.arc(X1 - rowH * 0.2, y, rowH * 0.24, 0, 7); g.fill();
        K.text(g, "✓", X1 - rowH * 0.2, y + 1, { size: rowH * 0.32, color: "#fff", font: K.FONT_EN });
        K.text(g, it.name, X1 - rowH * 0.6, y, { size: rowH * 0.66, color: PAL.ink, align: "right", weight: 700 });
        K.text(g, fmt(it.price), X0, y, { size: rowH * 0.66, color: PAL.brand, align: "left", font: K.FONT_EN, weight: 700 }); g.globalAlpha = 1; });
      const q = clamp(p * (items.length + 2) - items.length); if (q > 0) { g.globalAlpha = q; const y = h * 0.8;
        g.fillStyle = PAL.brand; K.rr(g, X0 - 10, y, X1 - X0 + 20, h * 0.09, 14); g.fill();
        K.text(g, s.total_label || "المجموع", X1 - 6, y + h * 0.047, { size: h * 0.07, color: "#fff", align: "right" });
        K.text(g, fmt(s.total), X0 + 4, y + h * 0.047, { size: h * 0.07, color: "#fff", align: "left", font: K.FONT_EN, weight: 800 }); g.globalAlpha = 1; }
      return;
    }
    K.taskbar(g, w, h);
  };
}

const POSES = (v) => {
  const yaw = [38, 44, 32, 48][v % 4];
  const caseC = [CASE.x, 1.15, CASE.z], monC = [MON.x, 0.75 + MON.h / 2, MON.z];
  return {
    room: { target: [-0.2, -0.75, 0.2], yaw, pitch: 30, zoom: 0.92, shiftY: 0.9 },
    case: { target: caseC, yaw: 0, pitch: 7, zoom: 2.45, shiftY: -0.12 },
    caseTilt: { target: caseC, yaw: -14, pitch: 10, zoom: 2.3, shiftY: -0.12, roll: -2 },
    screen: { target: monC, yaw: 0, pitch: 4, zoom: 2.75, shiftY: 0.18 },
    logo: { target: monC, yaw: 0, pitch: 2, zoom: 3.05, shiftY: 0.05 },
  };
};

async function build(ctx) {
  const { scene, camera, data } = ctx;
  K.lights(scene, { yaw: 28, shadowSize: 10 });
  const rm = K.room(scene, { w: 11, d: 8, h: 6, floorY: -2.45, rugX: -0.4, rugZ: 2.3 });
  const root = new THREE.Group(); scene.add(root);
  K.desk(root, { w: 6.6, d: 2.9, legH: 2.25 });
  const plate = K.logoPlate(root, ctx.logoIcon, { w: 0.9, h: 1.05 }); plate.position.set(-5.3, 1.6, -0.3); plate.rotation.y = Math.PI / 2;
  const mon = K.monitor(root, { w: MON.w, h: MON.h, texW: 1280, draw: drawScreen(ctx) }); mon.position.set(MON.x, 0, MON.z);
  const kb = K.keyboard(root, { u: 0.165 }); kb.position.set(MON.x - 0.1, 0, 0.55);
  const pad = K.rbox(0.95, 0.025, 0.8, 0.04, PAL.light); K.place(pad, 0.25, 0.012, 0.75, root);
  const ms = K.mouse(root); ms.position.set(0.25, 0.02, 0.75);
  const kase = buildCase(root);
  // القطع + أشباحها
  const parts = {}, ghosts = {}, flashes = {};
  for (const [name, P] of Object.entries(PARTS)) {
    const g = new THREE.Group(); P.build(g); K.uniqueMaterials(g); kase.group.add(g);
    g.position.set(...P.pos); g.userData.slot = new THREE.Vector3(...P.pos); g.visible = false; parts[name] = g;
    const gh = K.ghostBox(...P.size); gh.position.set(...P.pos); gh.visible = false; kase.group.add(gh); ghosts[name] = gh;
    const fl = K.glowSprite("#bcd6ff", 1.2); fl.position.set(P.pos[0], P.pos[1], P.pos[2] + 0.3); kase.group.add(fl); flashes[name] = fl;
  }
  ctx.parts = parts; ctx.kase = kase; ctx.mon = mon;
  // خطة التجميع من الأحداث
  const evs = (data.events || []).slice().sort((a, b) => a.start - b.start);
  const at = (x, d) => (x == null ? d : +x);
  ctx.plan = {}; // part → {ghostFrom, drop, side}
  const firstBuild = evs.find((e) => ["E04", "E07", "E10"].includes(e.el));
  const roll = evs.find((e) => e.el === "E03")?.start ?? (firstBuild ? Math.max(0.5, firstBuild.start - 1.3) : 1e9);
  for (const e of evs) if (["E04", "E07", "E10"].includes(e.el) && e.params.part) {
    ctx.plan[e.params.part] = { ghostFrom: roll + 0.9, drop: at(e.params.drop_at, e.start + 0.35), side: e.el === "E10" };
  }
  for (const p of data.preinstalled || []) ctx.plan[p] = { ghostFrom: 0, drop: -10 };
  // الكاميرا
  const P = POSES(ctx.variant);
  const keys = [{ t: 0, pose: P.room }];
  if (roll < 1e8) keys.push({ t: roll, pose: P.case, dur: 1.25 });
  for (const e of evs) {
    if (["E08", "E12", "E13"].includes(e.el)) keys.push({ t: e.start, pose: P.screen, dur: 0.85 });
    if (e.el === "E09") keys.push({ t: e.start, pose: P.case, dur: 0.85 });
    if (e.el === "E11") keys.push({ t: e.start, pose: P.caseTilt, dur: 0.9 });
  }
  keys.push({ t: ctx.closingStart - 0.35, pose: P.logo, dur: 0.85 });
  keys.sort((a, b) => a.t - b.t);
  ctx.camKeys = keys;
  // الشاشة: حالات
  ctx.screens = [{ start: 0, mode: "goal", text: data.goal || "" }];
  const goal = data.goal_screen ?? true;
  if (!goal) ctx.screens[0].mode = "desk";
  ctx.screens.push({ start: ctx.closingStart - 0.35, mode: "logo" });
  ctx.glassAt = evs.find((e) => e.el === "E11")?.start ?? 1e9;
  return {
    curtain: (t) => clamp((t - roll) / 0.6),
    update(t) {
      // الطفو الخفيف للغرفة + التركيب بنطّات أول ثانية
      const pop = E.spring(clamp(t / 0.9));
      root.scale.setScalar(0.94 + 0.06 * pop); rm.position.y = 0.04 * Math.sin(t * 1.1);
      root.position.y = rm.position.y;
      K.setCam(camera, K.cameraTrack(ctx.camKeys, t));
      // المراوح
      const fanOn = t >= ctx.glassAt;
      for (const f of parts.fans.userData.fans) { f.userData.rotor.rotation.z = -t * (fanOn ? 9 : 0); const r = f.userData.ring.material; r.emissive.set(PAL.light); r.emissiveIntensity = fanOn ? 1.6 * clamp((t - ctx.glassAt) / 0.6) : 0; }
      parts.cooler.userData.fan.userData.rotor.rotation.z = -t * 6;
      // القطع والأشباح والومضات
      for (const [name, g] of Object.entries(parts)) {
        const pl = ctx.plan[name], gh = ghosts[name], fl = flashes[name];
        if (!pl) { g.visible = false; gh.visible = false; fl.material.opacity = 0; continue; }
        const landed = t >= pl.drop + 0.5;
        // الشبح ينبض وهو ينتظر، ويختفي مع الهبوط
        const ga = clamp((t - pl.ghostFrom) / 0.4) * (1 - clamp((t - pl.drop - 0.5) / 0.3));
        gh.setGhost(ga, Math.sin(t * 5));
        if (t < pl.drop) { g.visible = false; } else {
          g.visible = true; const q = clamp((t - pl.drop) / 0.5);
          if (pl.side) { // E10: ينزل قدام الكيس ثم ينزلق للداخل
            const s = g.userData.slot; const qa = clamp((t - pl.drop) / 0.35), qb = E.inOutCubic(clamp((t - pl.drop - 0.35) / 0.45));
            g.position.set(s.x, s.y + 1.4 * (1 - E.inQuad(qa)), s.z + 0.9 * (1 - qb));
          } else { const s = g.userData.slot; g.position.set(s.x, s.y + 2.6 * (1 - E.inQuad(q)), s.z); }
          const sq = landed ? 1 - 0.08 * Math.sin(Math.PI * clamp((t - pl.drop - 0.5) / 0.22)) : 1;
          g.scale.set(1, sq, 1);
        }
        const fq = clamp((t - pl.drop - (pl.side ? 0.8 : 0.5)) / 0.5);
        fl.material.opacity = t >= pl.drop + (pl.side ? 0.8 : 0.5) && fq < 1 ? 0.9 * (1 - fq) : 0;
        fl.scale.setScalar(fl.userData.base * (0.6 + 0.8 * fq));
      }
      // الزجاج يتركب (E11)
      const gq = E.inOutCubic(clamp((t - ctx.glassAt) / 0.6));
      kase.glass.material.opacity = 0.28 * gq; kase.glass.position.x = (1 - gq) * -2.4; kase.glass.visible = gq > 0;
      kase.inside.intensity = fanOn ? 2.2 : 0.6;
      // الشاشة
      const sc = lastStarted(ctx.screens, t);
      mon.userData.tex.redraw({ ...sc, p: sc.dur ? Math.round(prog(t, sc.start, sc.dur) * 45) / 45 : 1 });
    },
  };
}

// ---------------------- العناصر ----------------------
function priceTag(ev, ctx, price) {
  const c = el("div", "tag3d", `−${fmt(price)}`, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "tag-" + ev._i; return c;
}
function partTitle(ev, extra = {}) {
  const p = ev.params;
  return { chip: p.category || CAT[p.part] || "", main: p.name || "", en: p.en ?? /^[\x00-\x7F]+$/.test(p.name || ""), ...extra };
}
function addPrice(ev, ctx, price, at) {
  ctx.counter.events.push({ t: at, delta: -price });
  ev._tag = priceTag(ev, ctx, price); ev._tagAt = at;
}
function updTag(ev, t, ctx) {
  if (!ev._tag) return;
  const L = life(t, ev._tagAt, ev._tagAt + 1.3, 0.3, 0.3); ev._tag.style.opacity = L.a;
  const s = ctx.project(new THREE.Vector3(CASE.x + 0.45, 1.75, CASE.z + 0.6));
  const w = ev._tag.offsetWidth; ev._tag.style.transform = `translate(${clamp(s.x - w / 2, 130, 950 - w)}px, ${s.y - 30 - 30 * L.pin}px) scale(${0.8 + 0.2 * L.s})`;
}

const handlers = {
  // E01 الغرفة الأيزومترية — params: {goal:"1440p"} (العنوان من data.hook.title)
  E01: { setup(ev, ctx) { if (ev.params.goal) ctx.screens.push({ start: ev.start, mode: "goal", text: ev.params.goal, dur: 0.8 }); ctx.screens.sort((a, b) => a.start - b.start); } },
  // E02 الهدف على الشاشة — params: {goal:"1440p"} الرقم يكبر بنطّة
  E02: { setup(ev, ctx) { ctx.screens.push({ start: ev.start, mode: "goal", text: ev.params.goal || ctx.data.goal || "", dur: 0.8 }); ctx.screens.sort((a, b) => a.start - b.start); } },
  // E03 لفّة الكاميرا للأمام (1.25ث) — توقيتها يحدد بداية الأشباح
  E03: {},
  // E04 الكيس وأماكن القطع — {part, category, name, drop_at?}  (+ price/desc اختياري بدل E05)
  E04: { setup(ev, ctx) { const p = ev.params; ctx.addTitle({ start: ev.start, ...partTitle(ev, p.price != null ? { price: p.price, price_at: p.price_at ?? ev.start + 0.9, desc: p.desc, desc_at: p.desc_at } : {}) });
    if (p.price != null) addPrice(ev, ctx, p.price, p.price_at ?? ev.start + 0.9); },
    update: updTag },
  // E05 السعر والميزانية — {price, desc?, desc_at?} يضيف حبة السعر للعنوان الحالي + وسم "−السعر" + العداد ينزل
  E05: { setup(ev, ctx) { const s = lastStarted(ctx.titles, ev.start + 0.01); const p = ev.params;
      if (s) { s.price = p.price; s.price_at = ev.start; if (p.desc) { s.desc = p.desc; s.desc_at = p.desc_at ?? ev.start + 0.5; } }
      addPrice(ev, ctx, p.price, ev.start); }, update: updTag },
  // E06 تثبيت قطعة — {part}: ومضة إضافية + انضغاط (الهبوط نفسه فيه ومضة تلقائياً)
  E06: { setup(ev, ctx) { const pl = ctx.plan[ev.params.part]; if (pl && pl.drop < -1) pl.drop = ev.start - 0.5; } },
  // E07 القطعة الرئيسية — {part:'gpu', category, name, price, desc:"قلب التجميعة"}
  E07: { setup(ev, ctx) { const p = ev.params; const pa = p.price_at ?? ev.start + 0.9;
      ctx.addTitle({ start: ev.start, ...partTitle(ev, { price: p.price, price_at: pa, desc: p.desc, desc_at: p.desc_at ?? pa + 0.5 }) });
      if (p.price != null) addPrice(ev, ctx, p.price, pa); }, update: updTag },
  // E08 بيانات على الشاشة — {title, bars:[{label, value, unit}]} الكاميرا تنزلق للشاشة
  E08: { setup(ev, ctx) { ctx.screens.push({ start: ev.start + 0.4, mode: "bars", title: ev.params.title, bars: ev.params.bars || [], dur: 1.4 }); ctx.screens.sort((a, b) => a.start - b.start); } },
  // E09 الرجوع للكيس — {} (انزلاق 0.85ث)
  E09: {},
  // E10 قطعة تدخل من الجنب — {part:'psu', category, name, price}
  E10: { setup(ev, ctx) { const p = ev.params; const pa = p.price_at ?? ev.start + 1.0;
      ctx.addTitle({ start: ev.start, ...partTitle(ev, p.price != null ? { price: p.price, price_at: pa, desc: p.desc, desc_at: p.desc_at } : {}) });
      if (p.price != null) addPrice(ev, ctx, p.price, pa); }, update: updTag },
  // E11 الكيس يكتمل — {category:"الكيس", name, price, desc}: الزجاج ينزلق، الكاميرا تميل، المراوح تنور
  E11: { setup(ev, ctx) { const p = ev.params; ctx.plan.fans = { ghostFrom: ev.start - 0.3, drop: ev.start - 0.5 };
      if (p.name) { const pa = p.price_at ?? ev.start + 0.8; ctx.addTitle({ start: ev.start, chip: p.category || CAT.case, main: p.name, en: /^[\x00-\x7F]+$/.test(p.name), price: p.price, price_at: pa, desc: p.desc, desc_at: p.desc_at });
        if (p.price != null) addPrice(ev, ctx, p.price, pa); } }, update: updTag },
  // E12 المجموع — {items?:[{name, price}], total?} (افتراضياً من كل الأسعار)
  E12: { setup(ev, ctx) {
      const items = ev.params.items || (ctx.data.events || []).filter((e) => ["E04", "E05", "E07", "E10", "E11"].includes(e.el) && e.params.price != null)
        .map((e) => { const src = e.el === "E05" ? (ctx.data.events || []).filter((x) => ["E04", "E07", "E10"].includes(x.el) && x.start <= e.start).pop() : e;
          return { name: e.params.list_name || src?.params.list_name || CAT[src?.params.part] || src?.params.category || src?.params.name || "", price: e.params.price }; });
      const total = ev.params.total ?? items.reduce((s, x) => s + x.price, 0);
      ctx.screens.push({ start: ev.start + 0.4, mode: "list", items, total, budget: ctx.data.budget || total, dur: 1.6 }); ctx.screens.sort((a, b) => a.start - b.start);
      ctx.addTitle({ start: ev.start, main: ev.params.title || `المجموع **${total}** ريال`, size: "mid", desc: ev.params.desc }); } },
  // E13 الأداء — {res:"1440p", fps:100, plus:true, chips:["DLSS ✓","إعدادات عالية · تقريبي"], title, desc}
  E13: { setup(ev, ctx) { const p = ev.params;
      ctx.screens.push({ start: ev.start + 0.4, mode: "perf", res: p.res, fps_num: p.fps, fps_plus: p.plus ?? true, chips: p.chips || [], head: p.head, dur: 1.6 }); ctx.screens.sort((a, b) => a.start - b.start);
      if (p.title) ctx.addTitle({ start: ev.start, main: p.title, size: "mid", desc: p.desc }); } },
  // E14 دعوة للتعليق — {title:"وش الميزانية الجاية؟", desc:"اكتبها بالتعليقات"}
  E14: { setup(ev, ctx) { ctx.addTitle({ start: ev.start, main: ev.params.title || "وش الميزانية الجاية؟", size: "mid", desc: ev.params.desc || "اكتبها بالتعليقات" }); } },
  // E15 الختام — تلقائي عند closing.start: الشاشة عليها الشعار + "تيربو · تجميعات"
  E15: {},
};

boot({ series: "budget-builds", label: "تجميعات", closingLabel: "تيربو · تجميعات", grid: true, header: "counter", build, handlers });
