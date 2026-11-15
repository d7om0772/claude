// =============================================================================
// budget-builds — قالب مؤقت (interim) لحزمة 15_iso_build_drop:
// تجميعة أيزومترية — القطع تنزل في الكيس وحدة وحدة مع اسمها وسعرها، وفاتورة بعداد المجموع.
// مكتبة العناصر: ELEMENTS.md. يتبنى من جديد أول ما تتثبت الحزمة الأصلية.
// =============================================================================
import { boot, THREE, K, el, esc, rich, isolateLTR, life, prog, clamp, lerp, E, fmtPrice } from "../common/core.js";
const { PAL } = K;

const CASE = { w: 2.4, h: 4.6, d: 4.4 };
const PART_NAMES = { cpu: "المعالج", gpu: "كرت الشاشة", ram: "الرام", mobo: "الماذربورد", ssd: "التخزين", psu: "الباور", cooler: "التبريد", case: "الكيس", fans: "المراوح" };

function boardTex() {
  return K.canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = "#22304F"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(157,184,245,.35)"; g.lineWidth = 3;
    for (let i = 0; i < 14; i++) { g.beginPath(); const y = 30 + i * 34; g.moveTo(20, y); g.lineTo(200 + (i * 37) % 200, y); g.lineTo(240 + (i * 37) % 200, y + 20); g.lineTo(490, y + 20); g.stroke(); }
    g.fillStyle = "#3A4A6B"; K.rr(g, 300, 60, 150, 150, 14); g.fill();       // مقبس المعالج
    g.fillStyle = "#2B3A5C"; for (let i = 0; i < 4; i++) { g.fillRect(470 - i * 18, 40, 10, 230); } // منافذ الرام
    g.fillStyle = "#3A4A6B"; g.fillRect(40, 330, 430, 22); g.fillRect(40, 420, 430, 14);           // منافذ PCIe
  });
}

function buildCase(root) {
  const c = new THREE.Group(); root.add(c);
  const wall = PAL.white, inner = "#EAF1FF", t = 0.14;
  const back = K.rbox(t, CASE.h, CASE.d, 0.06, inner); back.position.set(-CASE.w / 2 + t / 2, CASE.h / 2, 0);
  const bottom = K.rbox(CASE.w, t, CASE.d, 0.06, wall); bottom.position.set(0, t / 2, 0);
  const top = K.rbox(t, t, CASE.d, 0.04, wall); top.position.set(-CASE.w / 2 + t / 2, CASE.h - t / 2, 0); // الكيس مفتوح من فوق عشان القطع تنزل فيه
  const rear = K.rbox(CASE.w, CASE.h, t, 0.06, wall); rear.position.set(0, CASE.h / 2, -CASE.d / 2 + t / 2);
  const front = K.rbox(CASE.w, CASE.h, t, 0.06, wall); front.position.set(0, CASE.h / 2, CASE.d / 2 - t / 2);
  const frame = K.rbox(t * 0.6, CASE.h, t * 0.6, 0.03, PAL.blue); frame.position.set(CASE.w / 2 - t * 0.3, CASE.h / 2, CASE.d / 2 - t * 0.3);
  const frame2 = frame.clone(); frame2.position.z = -CASE.d / 2 + t * 0.3;
  const feet = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => { const f = K.cyl(0.12, 0.12, 0.12, PAL.navy); f.position.set(sx * (CASE.w / 2 - 0.25), -0.06, sz * (CASE.d / 2 - 0.35)); return f; }));
  const topRail = K.rbox(CASE.w, t, t, 0.04, wall); topRail.position.set(0, CASE.h - t / 2, CASE.d / 2 - t / 2);
  const topRail2 = topRail.clone(); topRail2.position.z = -CASE.d / 2 + t / 2;
  c.add(back, bottom, top, topRail, topRail2, rear, front, frame, frame2, ...feet);
  const inside = new THREE.PointLight(0xdfe9ff, 6, 9, 1.6); inside.position.set(0.6, 3.2, 0.6); c.add(inside);
  const fans = [];
  for (let i = 0; i < 3; i++) { // مراوح الواجهة (تواجه +z)
    const f = K.fan(0.48, { glow: PAL.blue, frame: "#DDE6F7", blade: "#B9CBEF" }); f.position.set(-0.05, 1.0 + i * 1.25, CASE.d / 2 + 0.02); c.add(f); fans.push(f);
  }
  const rf = K.fan(0.45, { frame: "#DDE6F7", blade: "#B9CBEF" }); rf.position.set(0, 3.55, -CASE.d / 2 - 0.02); rf.rotation.y = Math.PI; c.add(rf); fans.push(rf);
  return { group: c, fans };
}

function buildParts(root) {
  const P = {};
  const mk = (name, anchor) => { const g = new THREE.Group(); g.userData = { name, anchor: new THREE.Vector3(...anchor) }; root.add(g); P[name] = g; return g; };
  const x0 = -CASE.w / 2 + 0.14;
  // الماذربورد
  { const g = mk("mobo", [x0 + 0.05, 3.0, -0.2]);
    const b = K.rbox(0.07, 2.9, 3.1, 0.03, "#22304F"); b.position.set(x0 + 0.04, 2.95, -0.25); g.add(b);
    const tex = boardTex(); tex.redraw({});
    const face = new THREE.Mesh(new THREE.PlaneGeometry(3.0, 2.8), new THREE.MeshStandardMaterial({ map: tex.tex, roughness: 0.7 }));
    face.rotation.y = Math.PI / 2; face.position.set(x0 + 0.08, 2.95, -0.25); face.receiveShadow = true; g.add(face); }
  // المعالج
  { const g = mk("cpu", [x0 + 0.12, 3.6, -0.6]);
    const s = K.rbox(0.08, 0.6, 0.6, 0.03, PAL.silver, { metal: 0.4, rough: 0.35 }); s.position.set(x0 + 0.11, 3.6, -0.6); g.add(s);
    const lab = K.textPlate("CPU", { w: 256, h: 256, color: PAL.slate, size: 90 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), new THREE.MeshBasicMaterial({ map: lab.tex, transparent: true }));
    pl.rotation.y = Math.PI / 2; pl.position.set(x0 + 0.156, 3.6, -0.6); g.add(pl); }
  // التبريد (برج + مروحة)
  { const g = mk("cooler", [-0.35, 3.6, -0.6]);
    for (let i = 0; i < 9; i++) { const fin = K.box(0.7, 0.92, 0.035, PAL.steel, { metal: 0.5, rough: 0.35 }); fin.position.set(x0 + 0.55, 3.6, -0.8 + i * 0.05); g.add(fin); }
    const f = K.fan(0.42, { glow: PAL.blue }); f.rotation.y = Math.PI / 2; f.position.set(x0 + 0.98, 3.6, -0.6); g.add(f); g.userData.fan = f; }
  // الرام
  { const g = mk("ram", [x0 + 0.3, 3.75, 0.45]);
    for (const z of [0.32, 0.5]) {
      const s = K.rbox(0.36, 1.2, 0.08, 0.03, "#1B2B4F"); s.position.set(x0 + 0.24, 3.6, z); g.add(s);
      const strip = K.box(0.08, 1.12, 0.09, PAL.blue, { emissive: PAL.blue, ei: 0.9 }); strip.position.set(x0 + 0.42, 3.6, z); g.add(strip);
    } }
  // التخزين
  { const g = mk("ssd", [x0 + 0.1, 2.75, 0.55]);
    const s = K.rbox(0.05, 0.22, 0.8, 0.02, "#2B3A5C"); s.position.set(x0 + 0.1, 2.75, 0.55); g.add(s);
    const st = K.box(0.052, 0.12, 0.3, PAL.blue3); st.position.set(x0 + 0.13, 2.75, 0.6); g.add(st); }
  // كرت الشاشة (تركيب عمودي: المراوح تواجه الجهة المفتوحة)
  { const g = mk("gpu", [-0.3, 2.2, -0.15]);
    const body = K.rbox(0.42, 1.1, 2.8, 0.08, "#1B2B4F"); body.position.set(-0.35, 1.95, -0.15); g.add(body);
    const plate = K.rbox(0.05, 1.0, 2.7, 0.04, "#2E3F66"); plate.position.set(-0.12, 1.95, -0.15); g.add(plate);
    const accent = K.box(0.06, 0.08, 2.7, PAL.blue, { emissive: PAL.blue, ei: 0.8 }); accent.position.set(-0.1, 2.48, -0.15); g.add(accent);
    g.userData.fans = [];
    for (const z of [-0.85, 0.45]) { const f = K.fan(0.44, { frame: "#2E3F66", blade: "#8EA7DA", glow: null }); f.rotation.y = Math.PI / 2; f.position.set(-0.08, 1.95, z); g.add(f); g.userData.fans.push(f); } }
  // الباور
  { const g = mk("psu", [0.0, 0.7, -1.2]);
    const b = K.rbox(1.9, 0.85, 1.5, 0.08, "#22304F"); b.position.set(0.0, 0.58, -1.25); g.add(b);
    const grille = K.fan(0.32, { frame: "#2E3F66", blade: "#5D6F96" }); grille.rotation.x = -Math.PI / 2; grille.position.set(0.1, 1.02, -1.25); g.add(grille);
    const lab = K.textPlate("PSU", { w: 256, h: 128, color: "#9DB8F5", size: 80 });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: lab.tex, transparent: true }));
    pl.rotation.y = Math.PI / 2; pl.position.set(0.96, 0.58, -1.25); g.add(pl); }
  // ماتيريال خاصة لكل قطعة عشان الإضاءة (highlight) ما تأثر على غيرها
  for (const g of Object.values(P)) g.traverse((m) => { if (m.isMesh && m.material?.isMeshStandardMaterial) { m.material = m.material.clone(); m.userData.baseEI = m.material.emissiveIntensity || 0; m.userData.baseE = m.material.emissive.clone(); } });
  return P;
}

const BASE_CAMS = [
  { yaw: 42, pitch: 30 }, { yaw: 50, pitch: 33 }, { yaw: 36, pitch: 27 }, { yaw: 56, pitch: 31 },
];

async function build(ctx) {
  const { scene, camera, data } = ctx;
  K.lights(scene, { yaw: 45, shadowSize: 9 });
  K.shadowFloor(scene, -0.12, 40, 0.12);
  const plate = K.rbox(6.0, 0.24, 6.0, 0.12, "#E3ECFB"); plate.position.y = -0.24; plate.receiveShadow = true; scene.add(plate);
  const root = new THREE.Group(); scene.add(root);
  const kase = buildCase(root);
  const parts = buildParts(root);
  ctx.parts = parts; ctx.kase = kase;
  // ترتيب نزول القطع: من أحداث E01؛ القطع اللي ما لها حدث تبقى ظاهرة من البداية لو preinstalled=true
  const drops = {};
  for (const ev of data.events || []) if (ev.el === "E01") drops[ev.params.part] = drops[ev.params.part] ?? ev.start;
  ctx.firstDrop = drops;
  const base = { ...BASE_CAMS[ctx.variant % BASE_CAMS.length], target: [0, 2.2, 0], zoom: 0.92, shiftX: 1.35, shiftY: 0.9 };
  ctx.camBase = base; ctx.camFocus = []; // تعبّيها أحداث E05
  const preinstalled = new Set(data.preinstalled || ["mobo"]);
  return {
    update(t) {
      // الكاميرا: دوران خفيف مستمر + اقتراب في البداية (الهوك المرئي)
      const intro = E.outCubic(prog(t, 0, 2.4));
      let cam = { ...base, yaw: base.yaw - 14 * (1 - intro) + 2.5 * Math.sin(t * 0.25), zoom: base.zoom * (0.8 + 0.2 * intro) };
      for (const f of ctx.camFocus) {
        const L = life(t, f.start, f.end, 0.7, 0.7); const w = E.inOutCubic(Math.min(L.pin, 1) * (1 - L.pout));
        if (w > 0) cam = K.lerpCam(cam, { ...cam, ...f.pose, target: f.pose.target || cam.target }, w);
      }
      K.setCam(camera, cam);
      // المراوح تدور
      for (const f of kase.fans) f.userData.rotor.rotation.z = -t * 5;
      parts.cooler.userData.fan.userData.rotor.rotation.z = -t * 6;
      for (const f of parts.gpu.userData.fans) f.userData.rotor.rotation.z = -t * 4;
      updateReceipt(t, ctx);
      // ظهور القطع
      for (const [name, g] of Object.entries(parts)) {
        const t0 = drops[name];
        if (t0 == null) { g.visible = preinstalled.has(name); g.position.y = 0; continue; }
        const p = prog(t, t0, 0.75);
        g.visible = t >= t0;
        g.position.y = 5.5 * (1 - E.outBounce(p));
      }
    },
  };
}

// ---------------------- العناصر ----------------------
function labelFor(ev, ctx) {
  const L = el("div", "label3d", null, ctx.ov); L.dataset.safe = "1"; L.dataset.solo = "label-" + ev._i;
  const p = ev.params;
  L.innerHTML = `<div class="tag"><span class="pname">${isolateLTR(p.name || PART_NAMES[p.part] || p.part)}</span>` +
    (p.price != null ? `<span class="chip gold"><bdi dir="ltr" class="ltr">${fmtPrice(p.price)}</bdi> ريال</span>` : "") + `</div>`;
  return L;
}

let receipt = null;
function ensureReceipt(ctx) {
  if (receipt) return receipt;
  const d = ctx.data, card = el("div", "card receipt", null, ctx.ov); card.dataset.safe = "1"; card.dataset.solo = "receipt";
  const budget = d.budget ? `<span class="chip soft">الميزانية <bdi dir="ltr" class="ltr">${fmtPrice(d.budget)}</bdi></span>` : "";
  card.innerHTML = `<div class="rhead"><h3>الفاتورة</h3>${budget}</div><div class="rows"></div>
    <div class="rtotal"><span>المجموع</span><span class="tv"><bdi dir="ltr" class="ltr num">0</bdi> ريال</span></div>`;
  receipt = { card, rows: card.querySelector(".rows"), tv: card.querySelector(".tv .num"), items: [] };
  return receipt;
}

// الفاتورة: تظهر مع أول قطعة، كل سطر يظهر لما تنزل قطعته، والمجموع يعدّ
function updateReceipt(t, ctx) {
  const r = receipt; if (!r) return;
  const first = r.items[0]?.t ?? 0;
  const showAt = (ctx.data.events || []).find((e) => e.el === "E02")?.params?.show_at ?? first - 0.3;
  const L = life(t, showAt, ctx.closingStart - 0.2, 0.4, 0.2);
  r.card.style.opacity = L.a; r.card.style.transform = `translateX(${(1 - L.s) * -40}px)`;
  let total = 0;
  for (const it of r.items) {
    const p = prog(t, it.t, 0.5);
    it.row.style.opacity = p; it.row.style.transform = `translateY(${(1 - E.outCubic(p)) * 14}px)`;
    total += it.price * E.outCubic(p);
  }
  r.tv.textContent = fmtPrice(Math.round(total));
  if (ctx.data.budget) r.card.classList.toggle("over", total > ctx.data.budget * 1.0001);
}

const handlers = {
  // E01 part_drop: القطعة تنزل في الكيس + ملصق اسم وسعر + سطر في الفاتورة
  E01: {
    setup(ev, ctx) {
      ev._label = labelFor(ev, ctx);
      const nxt = (ctx.data.events || []).filter((e) => e.el === "E01" && e.start > ev.start).sort((a, b) => a.start - b.start)[0];
      ev._next = nxt ? nxt.start + 0.3 : null; // ملصق واحد بس على الشاشة
      const r = ensureReceipt(ctx);
      const row = el("div", "rrow", `<span class="rn">${isolateLTR(ev.params.name || PART_NAMES[ev.params.part])}</span>` +
        `<span class="rp">${ev.params.price != null ? `<bdi dir="ltr" class="ltr">${fmtPrice(ev.params.price)}</bdi>` : "—"}</span>`, r.rows);
      r.items.push({ t: ev.start + 0.55, price: +ev.params.price || 0, row });
    },
    update(ev, t, ctx) {
      const g = ctx.parts[ev.params.part]; const L = life(t, ev.start + 0.35, Math.min(ev.end, ev._next ?? 1e9), 0.35, 0.2);
      ev._label.style.opacity = L.a;
      if (L.on && g) {
        const a = g.userData.anchor.clone(); a.y += 0.3; const s = ctx.project(g.localToWorld(a));
        const w = ev._label.offsetWidth, h = ev._label.offsetHeight;
        const x = clamp(s.x - w / 2, 495, 940 - w), y = clamp(s.y - h - 30, 500, 1180 - h);
        ev._label.style.transform = `translate(${x}px, ${y}px) scale(${0.85 + 0.15 * L.s})`;
      }
    },
  },
  // E02 receipt: يحدد متى تظهر الفاتورة (افتراضياً مع أول قطعة) — params: {show_at?}
  E02: { setup() {}, update() {} },
  // E03 fps_badge: {game, fps, res, approx:true|false, source}
  E03: {
    setup(ev, ctx) {
      const p = ev.params, c = el("div", "card fps", null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "fps-" + ev._i;
      c.innerHTML = `<div class="fg">${isolateLTR(p.game || "")}</div><div class="fv"><bdi dir="ltr" class="ltr big">${p.fps}</bdi><span class="u">FPS</span></div>` +
        `<div class="fm">${isolateLTR(p.res || "")}${p.approx ? ` <span class="chip soft small">تقريبي</span>` : ""}</div>`;
      ev._c = c;
    },
    update(ev, t) { const L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; ev._c.style.transform = `scale(${0.8 + 0.2 * L.s})`; },
  },
  // E04 spec_card: {title, items:[...], pos:'top'|'bottom'}
  E04: {
    setup(ev, ctx) {
      const p = ev.params, c = el("div", "card spec " + (p.pos || "bottom"), null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "spec-" + ev._i;
      c.innerHTML = (p.title ? `<h3>${rich(p.title)}</h3>` : "") + (p.items || []).map((x) => `<div class="li">${rich(x)}</div>`).join("");
      ev._c = c;
    },
    update(ev, t) { const L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; ev._c.style.transform = `translateY(${(1 - L.s) * 30}px)`; },
  },
  // E05 camera_focus: {part, zoom=1.6} — الكاميرا تقرب على قطعة ثم ترجع
  E05: {
    setup(ev, ctx) {
      const g = ctx.parts[ev.params.part]; const a = g ? g.userData.anchor : new THREE.Vector3(0, 2.2, 0);
      ctx.camFocus.push({ start: ev.start, end: ev.end, pose: { target: [a.x, a.y, a.z], zoom: ev.params.zoom || 1.3, shiftX: 1.6, shiftY: 0.2, yaw: ctx.camBase.yaw + (ev.params.yaw || 0) } });
    },
    update() {},
  },
  // E06 highlight: {part} — توهج أزرق نابض
  E06: {
    setup() {},
    update(ev, t, ctx) {
      const g = ctx.parts[ev.params.part]; if (!g) return;
      const L = life(t, ev.start, ev.end, 0.3, 0.3); const k = L.a * (0.55 + 0.45 * Math.sin((t - ev.start) * 7));
      g.traverse((m) => { if (m.isMesh && m.material?.isMeshStandardMaterial) {
        m.material.emissive.copy(m.userData.baseE).lerp(new THREE.Color(PAL.blue), k > 0 ? 1 : 0);
        m.material.emissiveIntensity = (m.userData.baseEI || 0) + 0.6 * k; } });
    },
  },
  // E07 big_text: {text} — نص كبير وسط الشاشة
  E07: {
    setup(ev, ctx) { const c = el("div", "hook bt", rich(ev.params.text), ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "big-" + ev._i; ev._c = c; },
    update(ev, t) { const L = life(t, ev.start, ev.end, 0.3, 0.3); ev._c.style.opacity = L.a; ev._c.style.transform = `scale(${0.85 + 0.15 * L.s})`; },
  },
  // E08 price_note: {text} — مصدر وتاريخ الأسعار تحت الفاتورة
  E08: {
    setup(ev, ctx) { const r = ensureReceipt(ctx); const c = el("div", "pnote", rich(ev.params.text), r.card); ev._c = c; },
    update(ev, t) { const L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; },
  },
};

boot({ series: "budget-builds", label: "تجميعات بالميزانية", build, handlers });
