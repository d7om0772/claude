// =============================================================================
// kit3d.js — أدوات Three.js المشتركة: رندرر، كاميرا Orthographic أيزومترية، إضاءة،
// خامات، صناديق مدوّرة، مراوح، وخامات نصية (CanvasTexture). كلها بالكود — بدون موديلات خارجية.
// =============================================================================
import * as THREE from "three";
import { RoundedBoxGeometry } from "../vendor/addons/RoundedBoxGeometry.js";

export const PAL = {
  bg: "#F1F6FE", ink: "#14284B", blue: "#2F6BFF", blue2: "#DCE8FF", blue3: "#9DB8F5", white: "#FFFFFF",
  red: "#FF3347", green: "#16C47F", gold: "#FFB020", navy: "#1B2B4F", slate: "#3A4A6B", steel: "#C9D3E6",
  silver: "#E3E8F2", dark: "#22304F", desk: "#E7EEFA", deskSide: "#C8D6F0",
};

export function createRenderer(canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, alpha: false });
  r.setPixelRatio(1);
  r.setSize(1080, 1920, false);
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true;
  r.shadowMap.type = THREE.PCFShadowMap;
  return r;
}

/** كاميرا Orthographic؛ fh = ارتفاع الإطار بوحدات العالم. */
export function isoCamera(fh = 16) {
  const aspect = 1080 / 1920;
  const c = new THREE.OrthographicCamera(-fh * aspect / 2, fh * aspect / 2, fh / 2, -fh / 2, 0.1, 200);
  c.userData.fh = fh;
  setCam(c, {});
  return c;
}
/** يضبط الكاميرا: yaw/pitch بالدرجات حول target، zoom، وإزاحة الشاشة (shiftY بوحدات العالم). */
export function setCam(c, { target = [0, 0, 0], yaw = 45, pitch = 32, zoom = 1, dist = 60, shiftX = 0, shiftY = 0 } = {}) {
  const y = THREE.MathUtils.degToRad(yaw), p = THREE.MathUtils.degToRad(pitch);
  const tx = target[0], ty = target[1], tz = target[2];
  c.position.set(tx + dist * Math.cos(p) * Math.sin(y), ty + dist * Math.sin(p), tz + dist * Math.cos(p) * Math.cos(y));
  c.up.set(0, 1, 0);
  c.lookAt(tx, ty, tz);
  c.zoom = zoom;
  { // إزاحة الإطار على الشاشة (بوحدات العالم): shiftX موجب = المحتوى يتحرك يمين، shiftY موجب = المحتوى ينزل
    const fh = c.userData.fh, aspect = 1080 / 1920;
    c.top = fh / 2 + shiftY; c.bottom = -fh / 2 + shiftY; c.left = -fh * aspect / 2 - shiftX; c.right = fh * aspect / 2 - shiftX;
  }
  c.updateProjectionMatrix();
}
export const lerpCam = (a, b, p) => {
  const o = {};
  for (const k of ["yaw", "pitch", "zoom", "shiftX", "shiftY"]) o[k] = (a[k] ?? 0) + ((b[k] ?? 0) - (a[k] ?? 0)) * p;
  o.target = [0, 1, 2].map((i) => a.target[i] + (b.target[i] - a.target[i]) * p);
  return o;
};

export function lights(scene, { yaw = 45, shadowSize = 14 } = {}) {
  const hemi = new THREE.HemisphereLight(0xffffff, 0xbfd0ee, 1.55); scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.55);
  const y = THREE.MathUtils.degToRad(yaw - 35);
  key.position.set(Math.sin(y) * 14, 22, Math.cos(y) * 14);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  const s = key.shadow.camera; s.left = -shadowSize; s.right = shadowSize; s.top = shadowSize; s.bottom = -shadowSize; s.near = 1; s.far = 80;
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02; key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xdfe9ff, 0.45); fill.position.set(-12, 8, -6); scene.add(fill);
  return { hemi, key, fill };
}

const matCache = new Map();
export function mat(color, { rough = 0.6, metal = 0.05, emissive = null, ei = 0, opacity = 1, unique = false } = {}) {
  const key = [color, rough, metal, emissive, ei, opacity].join("|");
  if (!unique && matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, transparent: opacity < 1, opacity });
  if (emissive) { m.emissive = new THREE.Color(emissive); m.emissiveIntensity = ei; }
  if (!unique) matCache.set(key, m);
  return m;
}
export function rbox(w, h, d, r, color, opts = {}) {
  const g = new RoundedBoxGeometry(w, h, d, opts.seg ?? 3, Math.min(r, Math.min(w, h, d) / 2 - 1e-3));
  const m = new THREE.Mesh(g, opts.material || mat(color, opts));
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true;
  return m;
}
export function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), opts.material || mat(color, opts));
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true; return m;
}
export function cyl(rt, rb, h, color, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, opts.seg ?? 32), opts.material || mat(color, opts));
  m.castShadow = opts.cast ?? true; m.receiveShadow = opts.receive ?? true; return m;
}
/** أرضية تلتقط الظل فقط (بدون لون) */
export function shadowFloor(scene, y = 0, size = 60, opacity = 0.13) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.ShadowMaterial({ opacity }));
  p.rotation.x = -Math.PI / 2; p.position.y = y; p.receiveShadow = true; scene.add(p); return p;
}
/** مروحة: حلقة + محور + ريش. محورها Z (الوجه للأمام). دوّرها بـ fan.userData.rotor.rotation.z */
export function fan(radius = 0.5, { frame = PAL.navy, blade = PAL.blue3, hub = PAL.slate, blades = 7, depth = 0.12, glow = null } = {}) {
  const g = new THREE.Group();
  const fr = rbox(radius * 2.15, radius * 2.15, depth, radius * 0.18, frame);
  const hole = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.98, radius * 0.98, depth * 1.02, 40), mat("#0E1A33", { rough: 0.9 }));
  hole.rotation.x = Math.PI / 2; hole.position.z = 0.002;
  g.add(fr, hole);
  const rotor = new THREE.Group();
  const h = cyl(radius * 0.28, radius * 0.28, depth * 0.9, hub); h.rotation.x = Math.PI / 2; rotor.add(h);
  for (let i = 0; i < blades; i++) {
    const b = rbox(radius * 0.68, radius * 0.26, depth * 0.25, radius * 0.08, blade, { cast: false });
    b.position.set(radius * 0.52, 0, 0); b.rotation.x = 0.35;
    const piv = new THREE.Group(); piv.rotation.z = (i / blades) * Math.PI * 2; piv.add(b); rotor.add(piv);
  }
  rotor.position.z = depth * 0.1;
  g.add(rotor);
  if (glow) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.0, radius * 0.045, 8, 48), mat(glow, { emissive: glow, ei: 1.2 }));
    ring.position.z = depth / 2 + 0.005; g.add(ring); g.userData.ring = ring;
  }
  g.userData.rotor = rotor;
  return g;
}

/** خامة نصية/رسم ثنائي الأبعاد قابلة لإعادة الرسم كل فريم. draw(ctx2d, w, h, state) */
export function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
  const api = { canvas: c, g, tex, w, h, last: null,
    redraw(state) { const key = JSON.stringify(state); if (key === api.last) return; api.last = key; g.clearRect(0, 0, w, h); draw(g, w, h, state); tex.needsUpdate = true; } };
  return api;
}
/** مستطيل مدوّر في 2D */
export function rr(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
export const FONT_AR = '"Baloo Bhaijaan 2", sans-serif';
export const FONT_EN = '"Inter", sans-serif';

/** لوحة نص مسطحة (للمفاتيح والملصقات على المجسمات) */
export function textPlate(text, { w = 256, h = 256, bg = null, color = PAL.ink, size = 110, font = FONT_EN, weight = 800, radius = 0 } = {}) {
  const ct = canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; rr(g, 0, 0, w, h, radius); g.fill(); }
    g.fillStyle = color; g.textAlign = "center"; g.textBaseline = "middle";
    let s = size; g.font = `${weight} ${s}px ${font}`;
    while (g.measureText(text).width > w * 0.86 && s > 10) { s -= 4; g.font = `${weight} ${s}px ${font}`; }
    g.fillText(text, w / 2, h / 2 + s * 0.05);
  });
  ct.redraw({ text });
  return ct;
}
