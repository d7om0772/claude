// =============================================================================
// shortcuts — قالب مؤقت (interim) لحزمة 13_mini_desk_diorama:
// مكتب مصغّر: كيبورد (الأزرار تنضغط وتنوّر مع الكلام) + شاشتين تعرض النتيجة.
// مكتبة العناصر: ELEMENTS.md. يتبنى من جديد أول ما تتثبت الحزمة الأصلية.
// =============================================================================
import { boot, THREE, K, el, esc, rich, isolateLTR, life, prog, clamp, lerp, E } from "../common/core.js";
const { PAL } = K;
const U = 0.27; // وحدة المفتاح

// تخطيط مبسّط لكيبورد (العرض بوحدات المفتاح)
const ROWS = [
  [["Esc", 1], ["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["=", 1], ["Back", 2]],
  [["Tab", 1.5], ["Q", 1], ["W", 1], ["E", 1], ["R", 1], ["T", 1], ["Y", 1], ["U", 1], ["I", 1], ["O", 1], ["P", 1], ["[", 1], ["]", 1], ["\\", 1.5]],
  [["Caps", 1.75], ["A", 1], ["S", 1], ["D", 1], ["F", 1], ["G", 1], ["H", 1], ["J", 1], ["K", 1], ["L", 1], [";", 1], ["'", 1], ["Enter", 2.25]],
  [["Shift", 2.25], ["Z", 1], ["X", 1], ["C", 1], ["V", 1], ["B", 1], ["N", 1], ["M", 1], [",", 1], [".", 1], ["/", 1], ["RShift", 2.75]],
  [["Ctrl", 1.25], ["Win", 1.25], ["Alt", 1.25], ["Space", 6.25], ["RAlt", 1.25], ["Fn", 1.25], ["Menu", 1.25], ["RCtrl", 1.25]],
];
const ALIAS = { WINDOWS: "Win", WIN: "Win", CONTROL: "Ctrl", CTRL: "Ctrl", ESCAPE: "Esc", ESC: "Esc", DEL: "Del", DELETE: "Del",
  "←": "Left", "→": "Right", "↑": "Up", "↓": "Down", LEFT: "Left", RIGHT: "Right", UP: "Up", DOWN: "Down", ENTER: "Enter", TAB: "Tab", SHIFT: "Shift", ALT: "Alt", SPACE: "Space" };
const LEG = { RShift: "Shift", RAlt: "Alt", RCtrl: "Ctrl", Back: "⌫", Menu: "≡", Space: "", Left: "←", Right: "→", Up: "↑", Down: "↓" };
const keyId = (k) => ALIAS[String(k).toUpperCase()] || (String(k).length === 1 ? String(k).toUpperCase() : k);

function buildKeyboard(root) {
  const kb = new THREE.Group(); root.add(kb);
  const totalW = 15 * U;
  const base = K.rbox(totalW + 0.5 + 3.4 * U, 0.16, 5 * U + 0.4, 0.08, PAL.white); base.position.set(1.7 * U / 2, 0.08, 0); kb.add(base);
  const keys = {};
  const mkKey = (id, w, x, z) => {
    const cap = K.rbox(w * U - 0.04, 0.12, U - 0.04, 0.035, "#F7FAFF", { unique: true, seg: 2 });
    cap.material = cap.material.clone(); cap.material.emissive = new THREE.Color(PAL.blue); cap.material.emissiveIntensity = 0;
    cap.position.set(x, 0.22, z); kb.add(cap);
    const leg = LEG[id] ?? id;
    if (leg) {
      const tp = K.textPlate(leg, { w: Math.round(128 * Math.min(w, 2.2)), h: 128, color: PAL.ink, size: leg.length > 2 ? 52 : 74 });
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w, 2.2) * U * 0.8, U * 0.8), new THREE.MeshBasicMaterial({ map: tp.tex, transparent: true }));
      pl.rotation.x = -Math.PI / 2; pl.position.y = 0.061; cap.add(pl); cap.userData.plate = pl;
    }
    cap.userData.baseY = 0.22; keys[id] = keys[id] || []; keys[id].push(cap);
  };
  ROWS.forEach((row, r) => {
    let x = -totalW / 2; const z = (r - 2) * U;
    for (const [id, w] of row) { mkKey(id === "RShift" ? "RShift" : id, w, x + (w * U) / 2, z); x += w * U; }
  });
  // الأسهم
  const ax = totalW / 2 + 0.25 + U * 0.5;
  mkKey("Up", 1, ax + U, (3 - 2) * U); mkKey("Left", 1, ax, 2 * U); mkKey("Down", 1, ax + U, 2 * U); mkKey("Right", 1, ax + 2 * U, 2 * U);
  mkKey("Del", 1, ax + U, -2 * U);
  // Shift/Ctrl/Alt يمين = نفس المفتاح
  keys.Shift = [...(keys.Shift || []), ...(keys.RShift || [])]; keys.Ctrl = [...(keys.Ctrl || []), ...(keys.RCtrl || [])]; keys.Alt = [...(keys.Alt || []), ...(keys.RAlt || [])];
  kb.position.set(0, 0, 1.0);
  return { group: kb, keys };
}

// ---------- محتوى الشاشات (رسم 2D حتمي حسب التقدّم p) ----------
const SW = 1024, SH = 576;
function wallpaper(g) {
  const gr = g.createLinearGradient(0, 0, SW, SH); gr.addColorStop(0, "#BFD3FF"); gr.addColorStop(1, "#4D7DFF");
  g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
  g.fillStyle = "rgba(255,255,255,.18)"; for (let i = 0; i < 5; i++) { g.beginPath(); g.arc(780 - i * 90, 120 + i * 60, 160 - i * 18, 0, Math.PI * 2); g.fill(); }
}
function taskbar(g) {
  g.fillStyle = "rgba(255,255,255,.88)"; g.fillRect(0, SH - 46, SW, 46);
  for (let i = 0; i < 6; i++) { g.fillStyle = i === 0 ? PAL.blue : "#9DB2DA"; K.rr(g, SW / 2 - 150 + i * 52, SH - 38, 34, 30, 7); g.fill(); }
  g.fillStyle = PAL.ink; g.font = `600 18px ${K.FONT_EN}`; g.textAlign = "right"; g.fillText("10:24", SW - 18, SH - 17);
}
function win(g, x, y, w, h, title, body = 4) {
  g.save(); g.shadowColor = "rgba(20,40,75,.25)"; g.shadowBlur = 18; g.fillStyle = "#fff"; K.rr(g, x, y, w, h, 12); g.fill(); g.restore();
  g.fillStyle = "#EEF3FC"; K.rr(g, x, y, w, 40, 12); g.fill(); g.fillRect(x, y + 28, w, 12);
  g.fillStyle = PAL.ink; g.font = `600 18px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText(title, x + 16, y + 26);
  g.fillStyle = "#DCE5F5"; for (let i = 0; i < body; i++) { K.rr(g, x + 18, y + 60 + i * 30, (w - 36) * (0.9 - (i % 3) * 0.2), 14, 7); g.fill(); }
}
function toast(g, text, a) {
  if (a <= 0) return; g.globalAlpha = a; g.fillStyle = PAL.ink; K.rr(g, SW - 330, SH - 120, 300, 56, 14); g.fill();
  g.fillStyle = "#fff"; g.font = `600 20px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText(text, SW - 310, SH - 85); g.globalAlpha = 1;
}
const DEMOS = {
  desktop(g) { wallpaper(g); win(g, 90, 70, 460, 300, "Documents"); win(g, 470, 150, 440, 290, "Browser"); taskbar(g); },
  text(g, p, s) { g.fillStyle = "#fff"; g.fillRect(0, 0, SW, SH); g.fillStyle = PAL.blue; g.textAlign = "center"; g.textBaseline = "middle";
    g.font = `800 ${s.size || 92}px ${s.ar ? K.FONT_AR : K.FONT_EN}`; g.globalAlpha = clamp(p * 3); g.fillText(s.text || "", SW / 2, SH / 2); g.globalAlpha = 1; },
  snip(g, p) {
    DEMOS.desktop(g); g.fillStyle = "rgba(10,20,40,.42)"; g.fillRect(0, 0, SW, SH);
    g.fillStyle = "#fff"; K.rr(g, SW / 2 - 150, 16, 300, 50, 12); g.fill();
    for (let i = 0; i < 4; i++) { g.fillStyle = i === 0 ? PAL.blue : "#B8C7E6"; K.rr(g, SW / 2 - 130 + i * 66, 26, 48, 30, 8); g.fill(); }
    const q = E.inOutCubic(clamp((p - 0.15) / 0.55)); const x0 = 250, y0 = 120, w = 480 * q, h = 280 * q;
    if (q > 0) { g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); DEMOS.desktop(g); g.restore();
      g.strokeStyle = "#fff"; g.lineWidth = 4; g.setLineDash([12, 8]); g.strokeRect(x0, y0, w, h); g.setLineDash([]); }
    toast(g, "Copied to clipboard ✓", clamp((p - 0.75) / 0.1));
  },
  clipboard(g, p) {
    DEMOS.desktop(g); const a = E.outCubic(clamp(p / 0.25)); const x = SW - 380, y = SH - 46 - 380 * a;
    g.save(); g.shadowColor = "rgba(20,40,75,.3)"; g.shadowBlur = 24; g.fillStyle = "#fff"; K.rr(g, x, y, 350, 370, 16); g.fill(); g.restore();
    g.fillStyle = PAL.ink; g.font = `700 20px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText("Clipboard", x + 20, y + 34);
    const items = ["Meeting at 4 PM", "turbo-pc.png", "RTX 5060 specs", "Order #48213"];
    const sel = Math.min(3, Math.floor(clamp((p - 0.4) / 0.5) * 4));
    items.forEach((it, i) => { g.fillStyle = i === sel && p > 0.4 ? "#DCE8FF" : "#F3F6FC"; K.rr(g, x + 16, y + 56 + i * 76, 318, 64, 12); g.fill();
      g.fillStyle = PAL.ink; g.font = `600 19px ${K.FONT_EN}`; g.fillText(it, x + 32, y + 95 + i * 76); });
  },
  taskmgr(g, p) {
    DEMOS.desktop(g); const a = E.outBack(clamp(p / 0.25)); g.save(); g.translate(SW / 2, SH / 2); g.scale(0.85 + 0.15 * a, 0.85 + 0.15 * a); g.translate(-SW / 2, -SH / 2);
    g.globalAlpha = clamp(p / 0.12); win(g, 140, 50, 744, 440, "Task Manager", 0);
    const rows = [["Browser", 34], ["Game", 51], ["Updater", 8], ["Chat", 3], ["System", 2]];
    rows.forEach(([n, c], i) => { const yy = 120 + i * 62; g.fillStyle = i % 2 ? "#F6F8FD" : "#fff"; g.fillRect(150, yy - 30, 724, 56);
      g.fillStyle = PAL.ink; g.font = `600 20px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText(n, 176, yy + 4);
      g.fillStyle = c > 30 ? "#FFD2D7" : "#DCE8FF"; K.rr(g, 520, yy - 12, 260 * (c / 60) * clamp(p * 2), 22, 6); g.fill();
      g.fillStyle = PAL.ink; g.textAlign = "right"; g.fillText(`${Math.round(c * clamp(p * 2))}%`, 860, yy + 4); });
    g.restore(); g.globalAlpha = 1;
  },
  snap(g, p) {
    wallpaper(g); const q = E.inOutCubic(clamp((p - 0.2) / 0.5));
    win(g, lerp(160, 6, q), lerp(80, 6, q), lerp(420, SW / 2 - 9, q), lerp(280, SH - 58, q), "Documents");
    win(g, lerp(480, SW / 2 + 3, q), lerp(160, 6, q), lerp(400, SW / 2 - 9, q), lerp(270, SH - 58, q), "Browser");
    taskbar(g);
  },
  desktops(g, p) {
    wallpaper(g); g.fillStyle = "rgba(10,20,40,.35)"; g.fillRect(0, 0, SW, SH);
    const n = p > 0.45 ? 3 : 2;
    for (let i = 0; i < n; i++) { const a = i === 2 ? E.outBack(clamp((p - 0.45) / 0.2)) : 1; const x = 120 + i * 270, y = 150;
      g.save(); g.translate(x + 120, y + 80); g.scale(a, a); g.translate(-(x + 120), -(y + 80));
      g.fillStyle = "#fff"; K.rr(g, x, y, 240, 160, 14); g.fill(); g.strokeStyle = i === n - 1 && p > 0.45 ? PAL.blue : "transparent"; g.lineWidth = 6; K.rr(g, x, y, 240, 160, 14); g.stroke();
      g.fillStyle = PAL.ink; g.font = `600 20px ${K.FONT_EN}`; g.textAlign = "center"; g.fillText(`Desktop ${i + 1}`, x + 120, y + 196); g.restore(); }
  },
  lock(g, p) {
    const gr = g.createLinearGradient(0, 0, 0, SH); gr.addColorStop(0, "#22304F"); gr.addColorStop(1, "#2F6BFF"); g.fillStyle = gr; g.fillRect(0, 0, SW, SH);
    g.globalAlpha = clamp(p / 0.2); g.fillStyle = "#fff"; g.textAlign = "center"; g.font = `200 150px ${K.FONT_EN}`; g.fillText("10:24", SW / 2, 270);
    g.font = `500 30px ${K.FONT_EN}`; g.fillText("Monday, November 16", SW / 2, 330);
    // قفل مرسوم (بدون إيموجي)
    g.strokeStyle = "#fff"; g.lineWidth = 10; g.beginPath(); g.arc(SW / 2, 410, 30, Math.PI, 0); g.stroke();
    g.fillStyle = "#fff"; K.rr(g, SW / 2 - 46, 405, 92, 70, 12); g.fill(); g.globalAlpha = 1;
  },
  reopen_tab(g, p) {
    g.fillStyle = "#fff"; g.fillRect(0, 0, SW, SH); g.fillStyle = "#E9EEF8"; g.fillRect(0, 0, SW, 70);
    const tabs = ["News", "Specs", "Prices"]; const gone = p > 0.25 && p < 0.6;
    tabs.forEach((t, i) => { if (i === 2 && gone) return; const a = i === 2 && p >= 0.6 ? E.outBack(clamp((p - 0.6) / 0.15)) : 1;
      g.fillStyle = i === 2 ? "#fff" : "#D6DFF0"; K.rr(g, 14 + i * 200, 16, 190 * a, 54, 12); g.fill();
      g.fillStyle = PAL.ink; g.font = `600 22px ${K.FONT_EN}`; g.textAlign = "left"; g.fillText(t, 34 + i * 200, 52); });
    g.fillStyle = "#DCE5F5"; for (let i = 0; i < 7; i++) { K.rr(g, 60, 120 + i * 56, 880 * (0.9 - (i % 3) * 0.2), 22, 10); g.fill(); }
  },
};

function buildMonitor(root, x, rotY) {
  const g = new THREE.Group(); g.position.set(x, 0, -1.1); g.rotation.y = rotY; root.add(g);
  const frame = K.rbox(3.1, 1.86, 0.14, 0.08, PAL.navy); frame.position.y = 2.15; g.add(frame);
  const tex = K.canvasTex(SW, SH, (gg, w, h, st) => (DEMOS[st.demo] || DEMOS.desktop)(gg, st.p ?? 1, st));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(2.94, 1.654), new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false }));
  scr.position.set(0, 2.15, 0.072); g.add(scr);
  const neck = K.rbox(0.22, 1.0, 0.16, 0.05, PAL.slate); neck.position.set(0, 0.85, -0.12); g.add(neck);
  const foot = K.rbox(1.0, 0.08, 0.6, 0.04, PAL.slate); foot.position.set(0, 0.04, -0.1); g.add(foot);
  return { group: g, tex, center: new THREE.Vector3(x, 2.15, -1.0) };
}

const BASE_CAMS = [{ yaw: 34, pitch: 30 }, { yaw: 44, pitch: 33 }, { yaw: 26, pitch: 28 }, { yaw: 40, pitch: 36 }];
const FOCUS = { keyboard: { target: [0.2, 0.3, 1.0], zoom: 1.35, pitch: 54, shiftY: 0.9 }, screens: { target: [0, 1.9, -1.0], zoom: 1.2 }, left: { target: [-1.65, 2.0, -1.0], zoom: 1.75 },
  right: { target: [1.65, 2.0, -1.0], zoom: 1.75 }, wide: { target: [0, 1.1, 0], zoom: 0.92 } };

async function build(ctx) {
  const { scene, camera, data } = ctx;
  K.lights(scene, { yaw: 40, shadowSize: 9 });
  K.shadowFloor(scene, -0.5, 40, 0.1);
  const desk = K.rbox(8.6, 0.36, 4.6, 0.14, PAL.desk); desk.position.set(0, -0.18, 0); scene.add(desk);
  const legs = [[-3.9, -1.9], [3.9, -1.9], [-3.9, 1.9], [3.9, 1.9]].map(([x, z]) => { const l = K.rbox(0.28, 1.6, 0.28, 0.06, PAL.deskSide); l.position.set(x, -1.15, z); scene.add(l); return l; });
  const root = new THREE.Group(); scene.add(root);
  const kb = buildKeyboard(root);
  const mons = { left: buildMonitor(root, -1.65, 0.12), right: buildMonitor(root, 1.65, -0.12) };
  // إكسسوارات المكتب (بدون ذوات أرواح)
  const mug = K.cyl(0.26, 0.24, 0.5, PAL.blue); mug.position.set(-3.4, 0.25, 0.9); root.add(mug);
  const pad = K.rbox(1.5, 0.04, 1.3, 0.05, "#2B3A5C"); pad.position.set(3.2, 0.02, 1.0); root.add(pad);
  const mouse = K.rbox(0.42, 0.2, 0.66, 0.16, PAL.white); mouse.position.set(3.2, 0.14, 1.05); root.add(mouse);
  const lamp = K.cyl(0.06, 0.06, 2.0, PAL.slate); lamp.position.set(-3.6, 1.0, -1.7); root.add(lamp);
  const shade = K.cyl(0.18, 0.45, 0.45, PAL.white, { emissive: "#FFF4D6", ei: 0.3 }); shade.position.set(-3.6, 2.05, -1.7); root.add(shade);
  ctx.kb = kb; ctx.mons = mons; ctx.camFocus = []; ctx.screenState = { left: [], right: [] };
  const base = { ...BASE_CAMS[ctx.variant % BASE_CAMS.length], target: [0, 1.0, 0], zoom: 0.92, shiftY: 0.6 };
  ctx.camBase = base;
  return {
    update(t) {
      const intro = E.outCubic(prog(t, 0, 2.2));
      let cam = { ...base, yaw: base.yaw + 12 * (1 - intro) + 2 * Math.sin(t * 0.22), zoom: base.zoom * (0.82 + 0.18 * intro) };
      for (const f of ctx.camFocus) { const L = life(t, f.start, f.end, 0.6, 0.6); const w = E.inOutCubic(Math.min(L.pin, 1) * (1 - L.pout));
        if (w > 0) cam = K.lerpCam(cam, { ...cam, ...f.pose }, w); }
      K.setCam(camera, cam);
      // المفاتيح: ترجع لوضعها، والأحداث تضغطها
      for (const caps of Object.values(kb.keys)) for (const c of caps) { c.position.y = c.userData.baseY; c.material.emissiveIntensity = 0; c.material.color.set("#F7FAFF"); }
      // الشاشات: آخر حدث فعّال لكل شاشة
      for (const side of ["left", "right"]) {
        const evs = ctx.screenState[side].filter((e) => t >= e.start);
        const ev = evs[evs.length - 1];
        if (!ev || t > ev.end + (ev.params.hold ?? 0.6)) mons[side].tex.redraw({ demo: side === "right" && ctx.data.right_screen ? "text" : "desktop", ...(side === "right" ? ctx.data.right_screen || {} : {}), p: 1 });
        else mons[side].tex.redraw({ ...ev.params, demo: ev.params.demo, p: Math.round(prog(t, ev.start, ev.end - ev.start) * 60) / 60 });
      }
    },
  };
}

// ---------------------- العناصر ----------------------
const handlers = {
  // E01 key_combo: {keys:["Win","Shift","S"], times?:[...]} — شرائح الأزرار فوق + ضغط الأزرار في المجسم
  E01: {
    setup(ev, ctx) {
      const keys = ev.params.keys.map(keyId);
      const c = el("div", "combo", null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "combo-" + ev._i;
      c.innerHTML = keys.map((k, i) => `${i ? '<span class="plus">+</span>' : ""}<span class="kc"><bdi dir="ltr">${esc(LEG[k] ?? k)}</bdi></span>`).join("");
      ev._c = c; ev._chips = [...c.querySelectorAll(".kc")]; ev._keys = keys;
      ev._times = ev.params.times || keys.map((_, i) => ev.start + 0.15 + i * 0.28);
    },
    update(ev, t, ctx) {
      const L = life(t, ev.start, ev.end, 0.3, 0.25);
      ev._c.style.opacity = L.a; ev._c.style.transform = `translateY(${(1 - L.s) * 20}px) scale(${0.9 + 0.1 * L.s})`;
      ev._keys.forEach((k, i) => {
        const on = t >= ev._times[i] && t <= ev.end;
        const pp = on ? Math.min(1, (t - ev._times[i]) / 0.12) : 0;
        ev._chips[i].classList.toggle("on", on);
        for (const cap of ctx.kb.keys[k] || []) { if (pp <= 0) continue;
          cap.position.y = Math.min(cap.position.y, cap.userData.baseY - 0.07 * pp);
          cap.material.color.set("#F7FAFF").lerp(new THREE.Color(PAL.blue), pp); cap.material.emissiveIntensity = Math.max(cap.material.emissiveIntensity, 0.35 * pp); }
      });
    },
  },
  // E02 screen_demo: {screen:'left'|'right', demo:'snip'|'clipboard'|'taskmgr'|'snap'|'desktops'|'lock'|'reopen_tab'|'text'|'desktop', text?, hold?}
  E02: { setup(ev, ctx) { ctx.screenState[ev.params.screen || "left"].push(ev); ctx.screenState[ev.params.screen || "left"].sort((a, b) => a.start - b.start); }, update() {} },
  // E03 camera: {focus:'keyboard'|'screens'|'left'|'right'|'wide'}
  E03: { setup(ev, ctx) { ctx.camFocus.push({ start: ev.start, end: ev.end, pose: { shiftY: 0.2, ...FOCUS[ev.params.focus || "wide"] } }); }, update() {} },
  // E04 big_text: {text}
  E04: {
    setup(ev, ctx) { const c = el("div", "hook bt", rich(ev.params.text), ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "big-" + ev._i; ev._c = c; },
    update(ev, t) { const L = life(t, ev.start, ev.end, 0.3, 0.3); ev._c.style.opacity = L.a; ev._c.style.transform = `scale(${0.85 + 0.15 * L.s})`; },
  },
  // E05 tip_card: {title, items:[...]}
  E05: {
    setup(ev, ctx) { const p = ev.params, c = el("div", "card tip", null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "tip-" + ev._i;
      c.innerHTML = (p.title ? `<h3>${rich(p.title)}</h3>` : "") + (p.items || []).map((x) => `<div class="li">${rich(x)}</div>`).join(""); ev._c = c; },
    update(ev, t) { const L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; ev._c.style.transform = `translateY(${(1 - L.s) * 30}px)`; },
  },
  // E06 old_vs_new: {old:"...", new:"..."}
  E06: {
    setup(ev, ctx) { const p = ev.params, c = el("div", "card ovn", null, ctx.ov); c.dataset.safe = "1"; c.dataset.solo = "ovn-" + ev._i;
      c.innerHTML = `<div class="r old"><span class="chip red">✗</span><span>${rich(p.old)}</span></div><div class="r new"><span class="chip green">✓</span><span>${rich(p.new)}</span></div>`;
      ev._c = c; ev._new = c.querySelector(".new"); },
    update(ev, t) { const L = life(t, ev.start, ev.end); ev._c.style.opacity = L.a; ev._c.style.transform = `translateY(${(1 - L.s) * 30}px)`;
      ev._new.style.opacity = prog(t, ev.start + (ev.end - ev.start) * 0.45, 0.3); },
  },
};

boot({ series: "shortcuts", label: "اختصارات كيبورد", build, handlers });
