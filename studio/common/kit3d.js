// =============================================================================
// kit3d.js — أدوات Three.js المشتركة (حسب حزم الستايل): رندرر شفاف فوق خلفية CSS، كاميرا Orthographic،
// إضاءة ناعمة، صناديق مدوّرة، غرفة/طاولة/شاشة/كيبورد/ماوس/كوب/لوحة شعار، أشباح القطع، ومضة التثبيت،
// ورسم محتوى الشاشات (CanvasTexture). كلها بالكود — بدون موديلات خارجية.
// =============================================================================
import * as THREE from "three";
import { RoundedBoxGeometry } from "../vendor/addons/RoundedBoxGeometry.js";

// palette.json (الحزم 13/14/15)
export const PAL = {
  bg: "#F1F6FE", white: "#F8FAFD", floor: "#E2EBFA", text: "#14284B", ink: "#14284B", navy: "#1D2C48",
  brand: "#2F6BCF", accent: "#3A7BD5", ghost: "#3A7BD5", parts: "#223152", light: "#8FBAF0", lightBlue: "#9CBDF0",
  screen: "#6B9FE9", muted: "#5B6B82", problem: "#FF3347", fix: "#22D36A", inside: "#223152",
  wall: "#EEF3FB", rug: "#D3E1F7", steel: "#D9E1EE", silver: "#E6EBF3", key: "#F8FAFD", keyEdge: "#DDE5F2",
};
export const FONT_AR = '"Baloo Bhaijaan 2", sans-serif';
export const FONT_EN = '"Inter", sans-serif';

export function createRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: true, premultipliedAlpha: false });
  r.setPixelRatio(1); r.setSize(1080, 1920, false); r.setClearColor(0x000000, 0);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
  return r;
}

/** كاميرا Orthographic؛ fh = ارتفاع الإطار بوحدات العالم. */
export function isoCamera(fh = 16) {
  const a = 1080 / 1920;
  const c = new THREE.OrthographicCamera(-fh * a / 2, fh * a / 2, fh / 2, -fh / 2, 0.1, 300);
  c.userData.fh = fh; setCam(c, {}); return c;
}
/** pose: target, yaw/pitch (درجات)، zoom، shiftX/shiftY (إزاحة الإطار بوحدات العالم: + يمين / + ينزل)، roll (ميلان) */
export function setCam(c, { target = [0, 0, 0], yaw = 45, pitch = 32, zoom = 1, dist = 80, shiftX = 0, shiftY = 0, roll = 0 } = {}) {
  const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
  c.position.set(target[0] + dist * Math.cos(p) * Math.sin(y), target[1] + dist * Math.sin(p), target[2] + dist * Math.cos(p) * Math.cos(y));
  c.up.set(Math.sin(THREE.MathUtils.degToRad(roll)), Math.cos(THREE.MathUtils.degToRad(roll)), 0);
  c.lookAt(target[0], target[1], target[2]);
  c.zoom = zoom;
  const fh = c.userData.fh, a = 1080 / 1920;
  c.top = fh / 2 + shiftY; c.bottom = -fh / 2 + shiftY; c.left = -fh * a / 2 - shiftX; c.right = fh * a / 2 - shiftX;
  c.updateProjectionMatrix(); c.updateMatrixWorld(true);   // ضروري عشان project() يستخدم وضع الكاميرا الحالي مو السابق
}
export function lerpPose(a, b, p) {
  const o = {};
  for (const k of ["yaw", "pitch", "zoom", "shiftX", "shiftY", "roll"]) o[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * p;
  o.target = [0, 1, 2].map((i) => a.target[i] + (b.target[i] - a.target[i]) * p);
  return o;
}
/** مسار كاميرا: [{t, pose, dur, ease}] — كل نقطة تنتقل لوضعها خلال dur ثانية. يرجع الوضع عند t. */
export function cameraTrack(keys, t, ease = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2)) {
  let pose = keys[0].pose;
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i]; if (t < k.t) break;
    const p = Math.min(1, (t - k.t) / Math.max(0.001, k.dur ?? 0.85));
    pose = lerpPose(pose, k.pose, (k.ease || ease)(p));
  }
  return pose;
}

export function lights(scene, { yaw = 30, shadowSize = 12, intensity = 1 } = {}) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xc9d8f2, 1.7 * intensity); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.35 * intensity);
  const y = THREE.MathUtils.degToRad(yaw);
  key.position.set(Math.sin(y) * 14, 24, Math.cos(y) * 16);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  const s = key.shadow.camera; s.left = -shadowSize; s.right = shadowSize; s.top = shadowSize; s.bottom = -shadowSize; s.near = 1; s.far = 90;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe3ecff, 0.5 * intensity); fill.position.set(-12, 8, 10); scene.add(fill);
  return { hemi, key, fill };
}

const matCache = new Map();
export function mat(color, { rough = 0.62, metal = 0.03, emissive = null, ei = 0, opacity = 1, unique = false } = {}) {
  const key = [color, rough, metal, emissive, ei, opacity].join("|");
  if (!unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, transparent: opacity < 1, opacity });
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei; }
  if (!unique) matCache.set(key, m);
  return m;
}
export function rbox(w, h, d, r, color, opts = {}) {
  const g = new RoundedBoxGeometry(w, h, d, opts.seg ?? 3, Math.max(0.001, Math.min(r, Math.min(w, h, d) / 2 - 1e-3)));
  const m = new THREE.Mesh(g, opts.material || mat(color, opts));
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true; return m;
}
export function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || mat(color, opts));
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true; return m;
}
export function cyl(rt, rb, h, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 40), opts.material || mat(color, opts));
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true; return m;
}
export function place(m, x, y, z, parent) { m.position.set(x, y, z); if (parent) parent.add(m); return m; }
/** يخلي كل مواد المجموعة نسخ خاصة (للتحكم بالشفافية/التوهج لكل قطعة) */
export function uniqueMaterials(g) {
  g.traverse((m) => { if (m.isMesh && m.material) { m.material = m.material.clone(); m.material.transparent = true; m.userData.baseOpacity = m.material.opacity;
    if (m.material.emissive) { m.userData.baseE = m.material.emissive.clone(); m.userData.baseEI = m.material.emissiveIntensity || 0; } } });
}
export function setOpacity(g, a) { g.traverse((m) => { if (m.isMesh && m.material) { m.material.opacity = (m.userData.baseOpacity ?? 1) * a; m.material.depthWrite = a > 0.98; } }); g.visible = a > 0.001; }

/** شبح قطعة: تعبئة زرقاء شفافة .10 + حواف .55 (حسب palette.json) */
export function ghostBox(w, h, d, color = PAL.ghost) {
  const g = new THREE.Group();
  const fill = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.10, depthWrite: false }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.55 }));
  g.add(fill, edges); g.userData = { fill, edges };
  g.setGhost = (a, pulse = 0) => { fill.material.opacity = 0.10 * a * (1 + 0.6 * pulse); edges.material.opacity = 0.55 * a * (0.7 + 0.3 * (1 + pulse) / 2); g.visible = a > 0.01; };
  return g;
}
/** ومضة: sprite إضافي (additive) بتدرج دائري */
export function glowSprite(color = "#bcd6ff", size = 1) {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"); const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  const col = new THREE.Color(color); const rgb = `${Math.round(col.r * 255)},${Math.round(col.g * 255)},${Math.round(col.b * 255)}`;
  gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(0.45, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
  s.scale.setScalar(size); s.userData.base = size; return s;
}
/** مروحة (محورها Z) — rotor يدور. ring اختياري يضيء */
export function fan(radius = 0.5, { frame = "#E9EFF9", blade = "#C3D4F2", hub = "#9DB3D8", blades = 7, depth = 0.1, ring = null } = {}) {
  const g = new THREE.Group();
  place(rbox(radius * 2.1, radius * 2.1, depth, radius * 0.16, frame), 0, 0, 0, g);
  const hole = cyl(radius * 0.97, radius * 0.97, depth * 1.02, "#1D2C48", { seg: 40 }); hole.rotation.x = Math.PI / 2; hole.position.z = 0.003; g.add(hole);
  const rotor = new THREE.Group(); rotor.position.z = depth * 0.12; g.add(rotor);
  const h = cyl(radius * 0.26, radius * 0.26, depth * 0.9, hub); h.rotation.x = Math.PI / 2; rotor.add(h);
  for (let i = 0; i < blades; i++) {
    const b = rbox(radius * 0.66, radius * 0.26, depth * 0.22, radius * 0.08, blade, { cast: false });
    b.position.set(radius * 0.52, 0, 0); b.rotation.x = 0.35;
    const piv = new THREE.Group(); piv.rotation.z = (i / blades) * Math.PI * 2; piv.add(b); rotor.add(piv);
  }
  if (ring) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.99, radius * 0.05, 8, 48), mat(ring, { emissive: ring, ei: 0, unique: true }));
    r.position.z = depth / 2 + 0.006; g.add(r); g.userData.ring = r;
  }
  g.userData.rotor = rotor; return g;
}

// ---------------- رسم 2D (الشاشات واللوحات) ----------------
export function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const api = { canvas: c, g, tex, w, h, last: null,
    redraw(state) { const key = JSON.stringify(state); if (key === api.last) return; api.last = key; g.save(); g.clearRect(0, 0, w, h); draw(g, w, h, state); g.restore(); tex.needsUpdate = true; } };
  return api;
}
export function rr(g, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** نص عربي/مختلط داخل الكانفس (RTL افتراضياً) */
export function text(g, s, x, y, { size = 40, weight = 800, color = PAL.ink, align = "center", font = null, dir = "rtl", base = "middle" } = {}) {
  const latin = /^[\x00-\x7F]+$/.test(s);
  g.font = `${weight} ${size}px ${font || (latin ? FONT_EN : FONT_AR)}`;
  g.fillStyle = color; g.textAlign = align; g.textBaseline = base; g.direction = latin ? "ltr" : dir;
  g.fillText(s, x, y);
}
/** خلفية الشاشات: linear-gradient(135deg, #2f6bcf, #9cc2f3) + bloom أبيض + 6 بتلات بيضاء @.11 (شكل مجرد) */
export function screenBg(g, w, h, { petals = true } = {}) {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, "#2f6bcf"); gr.addColorStop(1, "#9cc2f3");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  const rg = g.createRadialGradient(w * 0.55, h * 0.45, 0, w * 0.55, h * 0.45, h * 0.6);
  rg.addColorStop(0, "rgba(255,255,255,.55)"); rg.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = rg; g.fillRect(0, 0, w, h);
  if (petals) { g.save(); g.translate(w * 0.55, h * 0.45); g.fillStyle = "rgba(255,255,255,.11)";
    for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.ellipse(0, -h * 0.17, h * 0.08, h * 0.2, 0, 0, Math.PI * 2); g.fill(); } g.restore(); }
}
/** شريط مهام مبسّط (بدون شعارات تجارية) */
export function taskbar(g, w, h) {
  g.fillStyle = "rgba(255,255,255,.85)"; g.fillRect(0, h - h * 0.075, w, h * 0.075);
  const s = h * 0.045, y = h - h * 0.0375 - s / 2;
  for (let i = 0; i < 6; i++) { g.fillStyle = i === 0 ? PAL.brand : "#9DB2DA"; rr(g, w / 2 - 3 * (s + 10) + i * (s + 10), y, s, s, s * 0.22); g.fill(); }
}
/** نافذة ويندوز مبسّطة: عنوان Inter + أزرار – □ × + أسطر */
export function windowBox(g, x, y, w, h, title, { lines = 4, active = false, glow = 0 } = {}) {
  g.save(); g.shadowColor = "rgba(20,40,75,.28)"; g.shadowBlur = 22; g.fillStyle = "#fff"; rr(g, x, y, w, h, 12); g.fill(); g.restore();
  if (glow > 0) { g.save(); g.strokeStyle = `rgba(58,123,213,${glow})`; g.lineWidth = 10; rr(g, x - 4, y - 4, w + 8, h + 8, 16); g.stroke(); g.restore(); }
  g.fillStyle = "#F1F5FC"; rr(g, x, y, w, 44, 12); g.fill(); g.fillRect(x, y + 30, w, 14);
  text(g, title, x + 18, y + 23, { size: 20, weight: 600, align: "left", color: PAL.ink });
  ["–", "□", "×"].forEach((c, i) => text(g, c, x + w - 24 - i * 34, y + 23, { size: 20, weight: 500, color: PAL.muted }));
  g.fillStyle = "#DCE5F5";
  for (let i = 0; i < lines; i++) { rr(g, x + 22, y + 66 + i * 32, (w - 44) * (0.9 - (i % 3) * 0.2), 14, 7); g.fill(); }
}
/** شاشة الختام: أبيض + الشعار الكامل في الوسط */
export function logoScreen(g, w, h, logoFull, logoIcon) {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  const img = logoFull || logoIcon;
  if (img) { const s = Math.min(w * 0.42 / img.width, h * 0.78 / img.height); const iw = img.width * s, ih = img.height * s; g.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih); }
  else text(g, "تيربو", w / 2, h / 2, { size: h * 0.2, color: PAL.brand });
}
/** مؤشر ماوس (سهم) */
export function cursor(g, x, y, s = 1, color = "#14284B", fill = "#fff") {
  g.save(); g.translate(x, y); g.scale(s, s); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 34); g.lineTo(9, 26); g.lineTo(16, 40); g.lineTo(22, 37); g.lineTo(15, 23); g.lineTo(26, 23); g.closePath();
  g.fillStyle = fill; g.fill(); g.lineWidth = 2.5; g.strokeStyle = color; g.stroke(); g.restore();
}

// ---------------- مجسمات مشتركة ----------------
/** غرفة: أرضية + جدار خلفي + جدار يسار (+ يمين اختياري) + سجادة */
export function room(scene, { w = 12, d = 9, h = 7, floorY = -2.4, right = false, rug = true, rugX = 0, rugZ = 1.5 } = {}) {
  const g = new THREE.Group(); scene.add(g);
  const wallM = mat(PAL.wall, { emissive: "#ffffff", ei: 0.32, unique: true }), sideM = mat("#E9EFF9", { emissive: "#ffffff", ei: 0.18, unique: true });
  place(rbox(w, 0.3, d, 0.08, PAL.floor, { material: mat(PAL.floor, { emissive: "#ffffff", ei: 0.12, unique: true }) }), 0, floorY - 0.15, 0, g);
  place(rbox(w, h, 0.3, 0.08, PAL.wall, { material: wallM }), 0, floorY + h / 2, -d / 2 + 0.15, g);
  place(rbox(0.3, h, d, 0.08, "#E6EDF8", { material: sideM }), -w / 2 + 0.15, floorY + h / 2, 0, g);
  if (right) place(rbox(0.3, h, d, 0.08, "#E6EDF8", { material: sideM }), w / 2 - 0.15, floorY + h / 2, 0, g);
  if (rug) { const r = cyl(2.2, 2.2, 0.04, PAL.rug, { seg: 64 }); r.scale.set(1.25, 1, 0.75); place(r, rugX, floorY + 0.02, rugZ, g); }
  g.userData = { floorY, w, d, h };
  return g;
}
/** طاولة بيضاء بأرجل زرقاء فاتحة؛ سطحها عند y=0 */
export function desk(parent, { w = 7, d = 3.2, legH = 2.4, top = PAL.white, leg = PAL.lightBlue } = {}) {
  const g = new THREE.Group(); parent.add(g);
  place(rbox(w, 0.22, d, 0.06, top), 0, -0.11, 0, g);
  for (const [x, z] of [[-w / 2 + 0.25, -d / 2 + 0.25], [w / 2 - 0.25, -d / 2 + 0.25], [-w / 2 + 0.25, d / 2 - 0.25], [w / 2 - 0.25, d / 2 - 0.25]])
    place(cyl(0.07, 0.07, legH, leg, { seg: 16 }), x, -0.22 - legH / 2, z, g);
  return g;
}
/** شاشة: إطار كحلي + سطح عرض CanvasTexture + ستاند. draw(g,w,h,state). frameMat للتوهج. */
export function monitor(parent, { w = 3.2, h = 1.9, texW = 1280, draw }) {
  const g = new THREE.Group(); parent.add(g);
  const frameMat = mat(PAL.navy, { unique: true, rough: 0.5 });
  const frame = place(rbox(w, h, 0.12, 0.06, PAL.navy, { material: frameMat }), 0, h / 2 + 0.75, 0, g);
  const texH = Math.round(texW * (h - 0.12) / (w - 0.12));
  const tex = canvasTex(texW, texH, draw);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, h - 0.12), new THREE.MeshBasicMaterial({ map: tex.tex, toneMapped: false }));
  place(scr, 0, h / 2 + 0.75, 0.062, g);
  place(rbox(0.16, 0.8, 0.12, 0.04, PAL.navy), 0, 0.4, -0.06, g);
  place(rbox(1.0, 0.07, 0.55, 0.03, PAL.navy), 0, 0.035, -0.02, g);
  g.userData = { tex, frame, frameMat, screen: scr, center: new THREE.Vector3(0, h / 2 + 0.75, 0.06), w, h };
  return g;
}
const KB_ROWS = [
  [["Esc", 1], ["1", 1], ["2", 1], ["3", 1], ["4", 1], ["5", 1], ["6", 1], ["7", 1], ["8", 1], ["9", 1], ["0", 1], ["-", 1], ["=", 1], ["Backspace", 2]],
  [["Tab", 1.5], ["Q", 1], ["W", 1], ["E", 1], ["R", 1], ["T", 1], ["Y", 1], ["U", 1], ["I", 1], ["O", 1], ["P", 1], ["[", 1], ["]", 1], ["\\", 1.5]],
  [["Caps", 1.75], ["A", 1], ["S", 1], ["D", 1], ["F", 1], ["G", 1], ["H", 1], ["J", 1], ["K", 1], ["L", 1], [";", 1], ["'", 1], ["Enter", 2.25]],
  [["Shift", 2.25], ["Z", 1], ["X", 1], ["C", 1], ["V", 1], ["B", 1], ["N", 1], ["M", 1], [",", 1], [".", 1], ["/", 1], ["RShift", 2.75]],
  [["Ctrl", 1.25], ["Win", 1.25], ["Alt", 1.25], ["Space", 6.25], ["RAlt", 1.25], ["Fn", 1.25], ["Menu", 1.25], ["RCtrl", 1.25]],
];
const KB_LEG = { RShift: "Shift", RAlt: "Alt", RCtrl: "Ctrl", Backspace: "Back", Menu: "≡", Space: "", Left: "←", Right: "→", Up: "↑", Down: "↓" };
export const KEY_ALIAS = { WINDOWS: "Win", WIN: "Win", CONTROL: "Ctrl", CTRL: "Ctrl", ESCAPE: "Esc", ESC: "Esc", DEL: "Del", DELETE: "Del", BACKSPACE: "Backspace",
  "←": "Left", "→": "Right", "↑": "Up", "↓": "Down", LEFT: "Left", RIGHT: "Right", UP: "Up", DOWN: "Down", ENTER: "Enter", TAB: "Tab", SHIFT: "Shift", ALT: "Alt", SPACE: "Space", FN: "Fn",
  "F1": "F1", "F2": "F2", "F3": "F3", "F4": "F4", "F5": "F5", "F6": "F6", "F7": "F7", "F8": "F8", "F9": "F9", "F10": "F10", "F11": "F11", "F12": "F12", "PRTSC": "PrtSc" };
export const keyId = (k) => KEY_ALIAS[String(k).toUpperCase()] || (String(k).length === 1 ? String(k).toUpperCase() : k);
/** كيبورد أبيض: كل زر مجسم بخامة خاصة (ينضغط ويتلون). keys[id] = [caps]. press(id, p, color) */
export function keyboard(parent, { u = 0.2, fnRow = false } = {}) {
  const kb = new THREE.Group(); parent.add(kb);
  const rows = fnRow ? [[["Esc", 1], ...Array.from({ length: 12 }, (_, i) => [`F${i + 1}`, 1]), ["Del", 1], ["PrtSc", 1]], ...KB_ROWS] : KB_ROWS;
  const totalW = 15 * u, nR = rows.length;
  place(rbox(totalW + 3.6 * u, 0.1, nR * u + 0.22, 0.05, PAL.white), 1.6 * u, 0.05, 0, kb);
  const keys = {};
  const labelTex = new Map();
  const mk = (id, w, x, z) => {
    const cap = rbox(w * u - 0.03, 0.08, u - 0.03, 0.025, PAL.key, { unique: true, seg: 2 });
    cap.material = cap.material.clone(); cap.material.emissive = new THREE.Color(PAL.brand); cap.material.emissiveIntensity = 0;
    place(cap, x, 0.14, z, kb); cap.userData.baseY = 0.14;
    const leg = KB_LEG[id] ?? id;
    if (leg) {
      if (!labelTex.has(leg)) {
        const t = canvasTex(Math.round(96 * Math.min(w, 2.4)), 96, (g, W, H) => text(g, leg, W / 2, H / 2 + 2, { size: leg.length > 3 ? 30 : leg.length > 1 ? 36 : 46, weight: 600, color: "#5B6B82", font: FONT_EN }));
        t.redraw({ leg }); labelTex.set(leg, t.tex);
      }
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(Math.min(w, 2.4) * u * 0.8, u * 0.8), new THREE.MeshBasicMaterial({ map: labelTex.get(leg), transparent: true }));
      pl.rotation.x = -Math.PI / 2; pl.position.y = 0.041; cap.add(pl);
    }
    (keys[id] = keys[id] || []).push(cap);
  };
  rows.forEach((row, r) => { let x = -totalW / 2; const z = (r - (nR - 1) / 2) * u; for (const [id, w] of row) { mk(id, w, x + (w * u) / 2, z); x += w * u; } });
  const ax = totalW / 2 + 0.2 + u * 0.5, zb = ((nR - 1) / 2) * u;
  mk("Up", 1, ax + u, zb - u); mk("Left", 1, ax, zb); mk("Down", 1, ax + u, zb); mk("Right", 1, ax + 2 * u, zb);
  if (!fnRow) mk("Del", 1, ax + u, -zb);
  keys.Shift = [...(keys.Shift || []), ...(keys.RShift || [])]; keys.Ctrl = [...(keys.Ctrl || []), ...(keys.RCtrl || [])]; keys.Alt = [...(keys.Alt || []), ...(keys.RAlt || [])];
  const reset = () => { for (const caps of Object.values(keys)) for (const c of caps) { c.position.y = c.userData.baseY; c.material.color.set(PAL.key); c.material.emissiveIntensity = 0; } };
  const press = (id, p, color = PAL.brand) => { for (const c of keys[keyId(id)] || []) { if (p <= 0) continue;
    c.position.y = Math.min(c.position.y, c.userData.baseY - 0.05 * p); c.material.color.set(PAL.key).lerp(new THREE.Color(color), p); c.material.emissive.set(color); c.material.emissiveIntensity = Math.max(c.material.emissiveIntensity, 0.35 * p); } };
  kb.userData = { keys, reset, press, u, width: totalW + 3.6 * u };
  return kb;
}
export function mouse(parent, color = PAL.white) {
  const m = new THREE.Group(); parent.add(m);
  const body = rbox(0.34, 0.16, 0.52, 0.15, color); place(body, 0, 0.08, 0, m);
  place(rbox(0.02, 0.03, 0.18, 0.01, "#C9D3E6"), 0, 0.165, -0.12, m);
  return m;
}
export function mug(parent, color = PAL.brand) {
  const g = new THREE.Group(); parent.add(g);
  place(cyl(0.2, 0.18, 0.4, color), 0, 0.2, 0, g);
  const h = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 24, Math.PI), mat(color)); h.rotation.z = -Math.PI / 2; place(h, 0.2, 0.2, 0, g);
  return g;
}
/** لوحة الشعار على الجدار (الأيقونة كما هي بدون تغيير) */
export function logoPlate(parent, img, { w = 1.1, h = 1.3 } = {}) {
  const g = new THREE.Group(); parent.add(g);
  place(rbox(w, h, 0.08, 0.05, "#FFFFFF"), 0, 0, 0, g);
  if (img) {
    const t = canvasTex(256, Math.round(256 * h / w), (gg, W, H) => { gg.fillStyle = "#fff"; gg.fillRect(0, 0, W, H); const s = Math.min(W * 0.8 / img.width, H * 0.8 / img.height);
      gg.drawImage(img, (W - img.width * s) / 2, (H - img.height * s) / 2, img.width * s, img.height * s); });
    t.redraw({ img: img.src });
    place(new THREE.Mesh(new THREE.PlaneGeometry(w * 0.92, h * 0.92), new THREE.MeshBasicMaterial({ map: t.tex })), 0, 0, 0.042, g);
  }
  return g;
}
