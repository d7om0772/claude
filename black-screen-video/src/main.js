// 3D Gaming Desk · Red Problem / Green Fix — "black screen" episode.
// Everything on screen is a pure function of t (seconds): window.renderFrame(t).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

const C = {
  bg: '#F1F6FE', white: '#F8FAFD', floor: '#E2EBFA', text: '#14284B', navy: '#1D2C48',
  problem: '#FF3347', fix: '#22D36A', brand: '#2F6BCF', screen: '#6B9FE9', inside: '#223152',
};
const W = await (await fetch('./words.json')).json();
await Promise.all(['800 40px "Baloo Bhaijaan 2"', '700 40px "Baloo Bhaijaan 2"', '600 20px Inter', '700 20px Inter', '800 20px Inter']
  .map((f) => document.fonts.load(f, 'ابجد abc')));
await document.fonts.ready;
const S = (i) => W[i].s;
const E = (i) => W[i].e;
const T_OUTRO = 47.78;
const T_END = 50.4;

// ---------- math helpers ----------
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const prog = (t, t0, d) => clamp((t - t0) / d);
const eio = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const eout = (k) => 1 - Math.pow(1 - k, 3);
const backOut = (k) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2); };
const pop = (t, t0, d = 0.42) => (t < t0 ? 0 : backOut(clamp((t - t0) / d)));
const win = (t, a, b) => t >= a && t < b;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);

// ---------- renderer / camera ----------
const canvas = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(1080, 1920, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const FW = 11.0, FH = FW * 1920 / 1080;
const camera = new THREE.OrthographicCamera(-FW / 2, FW / 2, FH / 2, -FH / 2, 0.1, 200);
const ELEV = THREE.MathUtils.degToRad(21);
const CAM_DIR = v3(0, Math.sin(ELEV), Math.cos(ELEV));
const PX_PER_UNIT = 1080 / FW;

scene.add(new THREE.HemisphereLight('#ffffff', '#b9c8e4', 2.1));
const sun = new THREE.DirectionalLight('#ffffff', 1.55);
sun.position.set(-5, 12, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
sun.shadow.bias = -0.0006;
sun.shadow.radius = 6;
scene.add(sun);
const fill = new THREE.DirectionalLight('#dfe9ff', 0.55);
fill.position.set(6, 4, 10);
scene.add(fill);

const world = new THREE.Group();
scene.add(world);

// ---------- material / geometry helpers ----------
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.62, metalness: 0, ...o });
const basic = (color, o = {}) => new THREE.MeshBasicMaterial({ color, ...o });
function rbox(w, h, d, r, mat, { cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)), mat);
  m.castShadow = cast; m.receiveShadow = recv; return m;
}
function box(w, h, d, mat, { cast = true, recv = true } = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.castShadow = cast; m.receiveShadow = recv; return m;
}
function at(obj, x, y, z) { obj.position.set(x, y, z); return obj; }
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8;
  tx.userData = { canvas: c, g };
  return tx;
}
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
const glowTex = canvasTex(256, 256, (g, w) => {
  const gr = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, w, w);
});
function glowSprite(scale, opacity = 0.5) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: C.problem, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false }));
  s.scale.set(scale, scale, 1); s.userData.baseOpacity = opacity; return s;
}

// ---------- room ----------
const wallMat = std('#EEF3FB', { roughness: 0.9 });
const wall = at(box(60, 30, 0.2, wallMat, { cast: false, recv: false }), 0, 4, -3.2); world.add(wall);
const floorMat = std(C.floor, { roughness: 0.95 });
const floor = at(box(60, 0.2, 30, floorMat, { cast: false }), 0, -7.1, 6); world.add(floor);
for (const y of [-2.2, 5.95]) world.add(at(box(60, 0.18, 0.18, std('#F8FAFD'), { cast: false }), 0, y, -3.02));
world.add(at(box(60, 0.06, 0.06, std('#d5e0f1'), { cast: false }), 0, -6.95, -3.0));
// rug
const rug = new THREE.Mesh(new THREE.CylinderGeometry(4.4, 4.4, 0.06, 64), std('#d4e1f6', { roughness: 1 }));
rug.scale.set(1, 1, 0.55); rug.receiveShadow = true; at(rug, 0.3, -6.98, 2.2); world.add(rug);
// shelf + books (top right, behind the case)
const SHY = 4.5;
const shelf = at(rbox(4.2, 0.16, 0.9, 0.05, std(C.white)), 5.9, SHY, -2.65); world.add(shelf);
[['#2F6BCF', 0.32, 1.1], ['#9CC2F3', 0.28, 0.95], ['#1D2C48', 0.34, 1.2], ['#6B9FE9', 0.26, 0.85]].forEach(([c, w, h], i) => {
  world.add(at(rbox(w, h, 0.62, 0.04, std(c)), 4.75 + i * 0.4, SHY + 0.08 + h / 2, -2.6));
});
const can = new THREE.Mesh(new THREE.CylinderGeometry(0.33, 0.33, 0.62, 32), std(C.brand)); at(can, 6.5, SHY + 0.39, -2.6); world.add(can);

// ---------- desk ----------
const deskMat = std(C.white, { roughness: 0.55 });
const deskTop = at(rbox(14.0, 0.34, 4.6, 0.08, deskMat), -2.1, -0.17, -0.3); world.add(deskTop);
const legMat = std('#8db2ef', { roughness: 0.45 });
for (const [x, z] of [[4.6, 1.65], [4.6, -2.25], [-5.35, 1.65], [-5.35, -2.25]]) {
  const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 6.75, 20), legMat);
  leg.castShadow = true; at(leg, x, -3.7, z); world.add(leg);
}

// ---------- monitor ----------
const MON = { x: -2.5, y: 1.25, z: -1.2, w: 4.95, h: 2.95 };
const monitor = new THREE.Group(); at(monitor, MON.x, 0, MON.z); world.add(monitor);
const navyMat = std(C.navy, { roughness: 0.45 });
monitor.add(at(rbox(MON.w, MON.h, 0.2, 0.07, navyMat), 0, MON.y + MON.h / 2, 0));
monitor.add(at(rbox(0.34, MON.y + 0.2, 0.16, 0.05, navyMat), 0, (MON.y + 0.2) / 2, -0.14));
monitor.add(at(rbox(1.9, 0.1, 0.95, 0.04, navyMat), 0, 0.05, -0.05));
const SCR = { w: MON.w - 0.24, h: MON.h - 0.24, cw: 1024, ch: Math.round(1024 * (MON.h - 0.24) / (MON.w - 0.24)) };
const screenTex = canvasTex(SCR.cw, SCR.ch, () => {});
const screenMesh = new THREE.Mesh(new THREE.PlaneGeometry(SCR.w, SCR.h), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
at(screenMesh, 0, MON.y + MON.h / 2, 0.102); monitor.add(screenMesh);

// ---------- keyboard ----------
const KB = { x: -2.5, z: 0.95, w: 4.75, d: 1.45 };
const keyboard = new THREE.Group(); at(keyboard, KB.x, 0, KB.z); world.add(keyboard);
keyboard.add(at(rbox(KB.w, 0.16, KB.d, 0.06, std(C.white)), 0, 0.08, 0));
const kbTex = canvasTex(1400, Math.round(1400 * KB.d / KB.w), (g, w, h) => {
  g.fillStyle = '#eef2f8'; g.fillRect(0, 0, w, h);
  const rows = [
    [['Esc', 1], ['1', 1], ['2', 1], ['3', 1], ['4', 1], ['5', 1], ['6', 1], ['7', 1], ['8', 1], ['9', 1], ['0', 1], ['-', 1], ['Back', 2], ['Del', 1]],
    [['Tab', 1.5], ['Q', 1], ['W', 1], ['E', 1], ['R', 1], ['T', 1], ['Y', 1], ['U', 1], ['I', 1], ['O', 1], ['P', 1], ['[', 1], [']', 1], ['\\', 1.5]],
    [['Caps', 1.8], ['A', 1], ['S', 1], ['D', 1], ['F', 1], ['G', 1], ['H', 1], ['J', 1], ['K', 1], ['L', 1], [';', 1], ["'", 1], ['Enter', 2.2]],
    [['Shift', 2.3], ['Z', 1], ['X', 1], ['C', 1], ['V', 1], ['B', 1], ['N', 1], ['M', 1], [',', 1], ['.', 1], ['/', 1], ['Shift', 1.7], ['↑', 1]],
    [['Ctrl', 1.4], ['⊞', 1.2], ['Alt', 1.2], ['', 6.2], ['Alt', 1.2], ['Ctrl', 1.2], ['', 1], ['↓', 1], ['', 1.6]],
  ];
  const pad = 26, rowH = (h - pad * 2) / rows.length;
  rows.forEach((row, ri) => {
    const tot = row.reduce((a, k) => a + k[1], 0); const unit = (w - pad * 2) / tot; let x = pad;
    row.forEach(([lab, kw]) => {
      const kx = x + 5, ky = pad + ri * rowH + 5, kwp = kw * unit - 10, kh = rowH - 10;
      g.fillStyle = '#c9d3e4'; rr(g, kx, ky + 6, kwp, kh, 12); g.fill();
      g.fillStyle = '#ffffff'; rr(g, kx, ky, kwp, kh - 4, 12); g.fill();
      g.fillStyle = '#4a5b7c'; g.font = `600 ${lab.length > 1 ? 22 : 30}px Inter`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(lab, kx + kwp / 2, ky + kh / 2 - 2); x += kw * unit;
    });
  });
});
const kbTop = new THREE.Mesh(new THREE.PlaneGeometry(KB.w - 0.12, KB.d - 0.1), std('#ffffff', { map: kbTex, roughness: 0.7 }));
kbTop.rotation.x = -Math.PI / 2; kbTop.receiveShadow = true; at(kbTop, 0, 0.165, 0); keyboard.add(kbTop);

// ---------- mouse pad + mouse ----------
const PADP = { x: 1.25, z: 1.05 };
world.add(at(rbox(2.3, 0.05, 1.45, 0.02, std(C.navy, { roughness: 0.85 })), PADP.x, 0.025, PADP.z));
const mouse = new THREE.Group(); world.add(mouse);
const mouseBody = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), navyMat);
mouseBody.scale.set(0.3, 0.17, 0.44); mouseBody.castShadow = true; at(mouseBody, 0, 0.12, 0); mouse.add(mouseBody);
const mouseLedMat = basic(C.problem);
const mouseLed = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 10), mouseLedMat); at(mouseLed, 0, 0.27, -0.12); mouse.add(mouseLed);

// ---------- PC case ----------
const CASE = { x: 2.6, z: -0.75, L: 3.4, H: 4.1, Wd: 2.1 };
const caseG = new THREE.Group(); at(caseG, CASE.x, 0.1, CASE.z); world.add(caseG);
const caseMat = std(C.white, { roughness: 0.5 });
const hl = CASE.L / 2, hw = CASE.Wd / 2;
caseG.add(at(rbox(CASE.L, 0.14, CASE.Wd, 0.05, caseMat), 0, CASE.H - 0.07, 0));
caseG.add(at(rbox(CASE.L, 0.14, CASE.Wd, 0.05, caseMat), 0, 0.07, 0));
caseG.add(at(rbox(0.14, CASE.H, CASE.Wd, 0.05, caseMat), -hl + 0.07, CASE.H / 2, 0));
caseG.add(at(rbox(0.14, CASE.H, CASE.Wd, 0.05, caseMat), hl - 0.07, CASE.H / 2, 0));
caseG.add(at(box(CASE.L, CASE.H, 0.08, caseMat), 0, CASE.H / 2, -hw + 0.04));
for (const [w, h, x, y] of [[CASE.L, 0.14, 0, CASE.H - 0.07], [CASE.L, 0.14, 0, 0.07], [0.14, CASE.H, -hl + 0.07, CASE.H / 2], [0.14, CASE.H, hl - 0.07, CASE.H / 2]])
  caseG.add(at(box(w, h, 0.1, caseMat), x, y, hw - 0.05));
for (const x of [-1.25, 1.25]) for (const z of [-0.7, 0.7]) caseG.add(at(rbox(0.5, 0.1, 0.32, 0.04, navyMat), x, -0.05, z));
// interior liner
const innerMat = std(C.inside, { roughness: 0.8, side: THREE.BackSide });
const liner = at(new THREE.Mesh(new THREE.BoxGeometry(CASE.L - 0.28, CASE.H - 0.28, CASE.Wd - 0.18), innerMat), 0, CASE.H / 2, 0.0);
liner.receiveShadow = true; caseG.add(liner);
const rgbMat = basic(C.problem, { toneMapped: false });
const rgbSoft = basic(C.problem, { transparent: true, opacity: 0.35, toneMapped: false });
// motherboard (in-case)
const mobo = at(box(2.1, 2.5, 0.06, std('#2b3d66', { roughness: 0.7 })), -0.55, 2.62, -0.86); caseG.add(mobo);
// fans
const fans = [];
function makeFan(r, withRing = true) {
  const g = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.TorusGeometry(r, r * 0.11, 12, 48), std('#2a3a5e', { roughness: 0.5 }));
  g.add(frame);
  if (withRing) { const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.93, r * 0.05, 8, 48), rgbMat); ring.position.z = 0.03; g.add(ring); }
  const blades = new THREE.Group();
  for (let i = 0; i < 7; i++) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(r * 0.72, r * 0.22, 0.02), std('#8193b8', { roughness: 0.6 }));
    b.position.set(Math.cos(i / 7 * Math.PI * 2) * r * 0.45, Math.sin(i / 7 * Math.PI * 2) * r * 0.45, 0);
    b.rotation.z = i / 7 * Math.PI * 2 + 0.5; b.rotation.x = 0.35; blades.add(b);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.22, r * 0.22, 0.06, 24), std('#3b4d75'));
  hub.rotation.x = Math.PI / 2; blades.add(hub);
  g.add(blades); fans.push(blades); return g;
}
const cpuFan = makeFan(0.48); at(cpuFan, -0.75, 2.95, -0.45); caseG.add(cpuFan);
caseG.add(at(box(0.95, 0.95, 0.3, std('#33476f')), -0.75, 2.95, -0.68));
for (const y of [1.95, 2.85, 3.68]) { const f = makeFan(0.33); at(f, 1.3, y, -0.6); caseG.add(f); }
// in-case RAM sticks (edge-on)
const caseRam = [];
for (const x of [0.12, 0.3]) {
  const st = at(box(0.1, 1.15, 0.36, std(C.brand, { roughness: 0.4 })), x, 2.95, -0.68); caseG.add(st);
  const top = at(box(0.1, 0.07, 0.36, rgbMat, { cast: false }), x, 3.56, -0.68); caseG.add(top); caseRam.push(st);
}
// GPU
const gpu = new THREE.Group(); at(gpu, -0.3, 1.82, -0.35); caseG.add(gpu);
gpu.add(at(rbox(2.35, 0.52, 1.0, 0.05, std('#24355a', { roughness: 0.45 })), 0, 0, 0));
gpu.add(at(box(2.1, 0.07, 0.02, rgbMat, { cast: false }), 0, -0.1, 0.505));
gpu.add(at(box(0.05, 0.52, 1.02, std('#c3cfe4')), -1.18, 0, 0)); // bracket edge
// GPU power sockets (top edge) + plugs
const SOCKETS = [0.45, 0.82];
const plugs = [];
for (const sx of SOCKETS) {
  gpu.add(at(box(0.3, 0.06, 0.16, std('#101a2e')), sx, 0.29, 0.25));
  const plug = new THREE.Group(); at(plug, sx, 0.3, 0.25); gpu.add(plug);
  plug.add(at(rbox(0.32, 0.2, 0.18, 0.03, std('#0f1a30', { roughness: 0.5 })), 0, 0.1, 0));
  const gap = at(box(0.36, 0.05, 0.2, basic(C.problem, { transparent: true, opacity: 0.0, toneMapped: false }), { cast: false }), 0, -0.01, 0);
  plug.add(gap); plug.userData.gap = gap;
  // wires bundle going up then to the front
  const wires = new THREE.Group();
  for (let i = 0; i < 4; i++) {
    const curve = new THREE.CatmullRomCurve3([v3(-0.1 + i * 0.065, 0.2, 0), v3(-0.1 + i * 0.065, 0.55, 0.02), v3(0.25 + i * 0.03, 0.85, 0.05), v3(1.3 - sx + 0.2 + i * 0.03, 0.9, 0.05)]);
    wires.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.022, 6), std('#0d1526', { roughness: 0.6 })));
  }
  plug.add(wires); plugs.push(plug);
}
// PSU shroud
caseG.add(at(box(CASE.L - 0.3, 0.8, CASE.Wd - 0.25, std('#E6EDF8', { roughness: 0.55 })), 0, 0.52, -0.02));
caseG.add(at(box(CASE.L - 0.34, 0.05, 0.02, rgbMat, { cast: false }), 0, 0.91, 0.98));
// vertical RGB strips
caseG.add(at(box(0.05, 2.65, 0.03, rgbMat, { cast: false }), -1.52, 2.6, 0.92));
// glass
const glass = new THREE.Mesh(new THREE.PlaneGeometry(CASE.L - 0.24, CASE.H - 0.24),
  new THREE.MeshStandardMaterial({ color: '#ffffff', transparent: true, opacity: 0.1, roughness: 0.05, depthWrite: false }));
at(glass, 0, CASE.H / 2, hw - 0.02); caseG.add(glass);
const glint = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 5), basic('#ffffff', { transparent: true, opacity: 0.08, depthWrite: false }));
glint.rotation.z = -0.6; at(glint, 0.7, 2.2, hw - 0.01); caseG.add(glint);
// power button + front USB on top
const pwrBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.04, 24), std('#dfe6f2')); at(pwrBtn, 1.2, CASE.H + 0.01, 0.35); caseG.add(pwrBtn);
const pwrRing = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.018, 8, 32), rgbMat); pwrRing.rotation.x = Math.PI / 2; at(pwrRing, 1.2, CASE.H + 0.035, 0.35); caseG.add(pwrRing);
// inner light + glow
const caseLight = new THREE.PointLight(C.problem, 6, 5, 1.5); at(caseLight, 0, 2.5, 0.2); caseG.add(caseLight);
const caseGlow = glowSprite(7.5, 0.32); at(caseGlow, 0.3, 2.4, -0.9); caseG.add(caseGlow);
const caseGlow2 = glowSprite(3.2, 0.35); at(caseGlow2, -0.7, 2.9, 0.4); caseG.add(caseGlow2);

// ----- back panel (texture + 3D fan + port glows) -----
const BP = { w: CASE.Wd, h: CASE.H, cw: 520, ch: Math.round(520 * CASE.H / CASE.Wd) };
const bpx = (z) => (z + BP.w / 2) / BP.w * BP.cw;
const bpy = (y) => (BP.h - y) / BP.h * BP.ch;
const PORT_MOBO = { y: 3.0, z: -0.6 }, PORT_GPU = { y: 1.83, z: 0.2 };
function hdmi(g, cx, cy, s, color = '#0b1222') {
  g.fillStyle = '#dfe7f5'; g.beginPath(); g.moveTo(cx - 30 * s, cy - 11 * s); g.lineTo(cx + 30 * s, cy - 11 * s); g.lineTo(cx + 30 * s, cy + 3 * s);
  g.lineTo(cx + 22 * s, cy + 11 * s); g.lineTo(cx - 22 * s, cy + 11 * s); g.lineTo(cx - 30 * s, cy + 3 * s); g.closePath(); g.fill();
  g.fillStyle = color; g.beginPath(); g.moveTo(cx - 24 * s, cy - 6 * s); g.lineTo(cx + 24 * s, cy - 6 * s); g.lineTo(cx + 24 * s, cy + 1 * s);
  g.lineTo(cx + 18 * s, cy + 6 * s); g.lineTo(cx - 18 * s, cy + 6 * s); g.lineTo(cx - 24 * s, cy + 1 * s); g.closePath(); g.fill();
}
function dp(g, cx, cy, s) {
  g.fillStyle = '#dfe7f5'; g.beginPath(); g.moveTo(cx - 26 * s, cy - 11 * s); g.lineTo(cx + 26 * s, cy - 11 * s); g.lineTo(cx + 26 * s, cy + 11 * s);
  g.lineTo(cx - 18 * s, cy + 11 * s); g.lineTo(cx - 26 * s, cy + 3 * s); g.closePath(); g.fill();
  g.fillStyle = '#0b1222'; g.fillRect(cx - 20 * s, cy - 5 * s, 40 * s, 10 * s);
}
const bpTex = canvasTex(BP.cw, BP.ch, (g, w, h) => {
  g.fillStyle = '#EEF2F9'; g.fillRect(0, 0, w, h);
  // I/O shield
  g.fillStyle = '#1D2C48'; rr(g, bpx(-0.92), bpy(3.78), bpx(-0.28) - bpx(-0.92), bpy(2.3) - bpy(3.78), 8); g.fill();
  const usb = (cx, cy) => { g.fillStyle = '#dfe7f5'; g.fillRect(cx - 22, cy - 9, 44, 18); g.fillStyle = '#2F6BCF'; g.fillRect(cx - 16, cy - 3, 32, 6); };
  usb(bpx(-0.72), bpy(3.6)); usb(bpx(-0.48), bpy(3.6)); usb(bpx(-0.72), bpy(3.42)); usb(bpx(-0.48), bpy(3.42));
  usb(bpx(-0.72), bpy(2.62)); usb(bpx(-0.48), bpy(2.62));
  g.fillStyle = '#dfe7f5'; g.fillRect(bpx(-0.7) - 4, bpy(2.86) - 16, 52, 32); g.fillStyle = '#0b1222'; g.fillRect(bpx(-0.7), bpy(2.86) - 11, 44, 22);
  for (let i = 0; i < 3; i++) { g.fillStyle = ['#6B9FE9', '#22D36A', '#FF9F1C'][i]; g.beginPath(); g.arc(bpx(-0.78) + i * 22, bpy(2.45), 7, 0, 7); g.fill(); }
  hdmi(g, bpx(PORT_MOBO.z), bpy(PORT_MOBO.y) - 0, 1.15);
  g.fillStyle = '#c8d4ea'; g.font = '600 15px Inter'; g.textAlign = 'center'; g.fillText('HDMI', bpx(PORT_MOBO.z), bpy(PORT_MOBO.y) - 22);
  // exhaust grill
  g.strokeStyle = '#c9d4e6'; g.lineWidth = 5;
  for (const r of [0.42, 0.3, 0.18]) { g.beginPath(); g.arc(bpx(0.45), bpy(3.05), r * w / BP.w, 0, 7); g.stroke(); }
  // expansion slots
  for (let i = 0; i < 6; i++) {
    const y = 2.22 - i * 0.2;
    g.fillStyle = '#dbe3f0'; rr(g, bpx(-0.88), bpy(y), bpx(0.5) - bpx(-0.88), 0.14 / BP.h * h, 4); g.fill();
    g.fillStyle = '#c4cfe2'; for (let k = 0; k < 9; k++) g.fillRect(bpx(-0.8) + k * 30, bpy(y) + 6, 18, 0.14 / BP.h * h - 12);
  }
  // GPU bracket
  g.fillStyle = '#24355a'; rr(g, bpx(-0.9), bpy(2.12), bpx(0.52) - bpx(-0.9), bpy(1.55) - bpy(2.12), 6); g.fill();
  g.fillStyle = '#3a4d78'; for (let k = 0; k < 7; k++) g.fillRect(bpx(-0.85) + k * 38, bpy(1.68), 24, 10);
  dp(g, bpx(-0.68), bpy(1.86), 1.0); dp(g, bpx(-0.4), bpy(1.86), 1.0); dp(g, bpx(-0.12), bpy(1.86), 1.0);
  hdmi(g, bpx(PORT_GPU.z), bpy(PORT_GPU.y), 1.15);
  g.fillStyle = '#c8d4ea'; g.font = '600 15px Inter'; g.fillText('HDMI', bpx(PORT_GPU.z), bpy(PORT_GPU.y) - 22);
  // PSU
  g.fillStyle = '#2b3a5c'; rr(g, bpx(-0.95), bpy(0.95), bpx(0.95) - bpx(-0.95), bpy(0.15) - bpy(0.95), 8); g.fill();
  g.strokeStyle = '#4a5f8c'; g.lineWidth = 4; for (const r of [0.3, 0.2, 0.1]) { g.beginPath(); g.arc(bpx(0.35), bpy(0.55), r * w / BP.w, 0, 7); g.stroke(); }
  g.fillStyle = '#0b1222'; rr(g, bpx(-0.75), bpy(0.72), 70, 46, 6); g.fill();
  g.fillStyle = '#FF3347'; rr(g, bpx(-0.75) + 84, bpy(0.72) + 4, 26, 38, 4); g.fill();
});
const backPanel = new THREE.Mesh(new THREE.PlaneGeometry(BP.w - 0.02, BP.h - 0.02), std('#ffffff', { map: bpTex, roughness: 0.6 }));
backPanel.rotation.y = -Math.PI / 2; at(backPanel, -hl - 0.005, BP.h / 2, 0); caseG.add(backPanel);
const exFan = makeFan(0.38, false); exFan.rotation.y = -Math.PI / 2; at(exFan, -hl - 0.04, 3.05, 0.45); caseG.add(exFan);
function portGlow() {
  const g = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.27, 40), basic(C.problem, { transparent: true, opacity: 0, toneMapped: false, depthWrite: false }));
  g.rotation.y = -Math.PI / 2; return g;
}
const glowMobo = portGlow(); at(glowMobo, -hl - 0.03, PORT_MOBO.y, PORT_MOBO.z); caseG.add(glowMobo);
const glowGpu = portGlow(); at(glowGpu, -hl - 0.03, PORT_GPU.y, PORT_GPU.z); caseG.add(glowGpu);
glowGpu.material = glowGpu.material.clone(); glowGpu.material.color.set(C.fix);

// ----- HDMI cable (world space; plug follows a port) -----
const cableMat = std('#16213a', { roughness: 0.5 });
const plugHead = new THREE.Group(); world.add(plugHead);
plugHead.add(at(rbox(0.36, 0.2, 0.34, 0.04, cableMat), 0, 0, 0.17));
plugHead.add(at(box(0.26, 0.1, 0.12, std('#c9d3e3', { metalness: 0.4, roughness: 0.3 })), 0, 0, -0.04));
let cableMesh = null;

// ---------- hero motherboard ----------
const HB = { x0: -3.4, x1: 6.2, z0: -2.1, z1: 2.1 };
const LEDZ = [-1.55, -1.03, -0.51, 0.01];
const LEDX = 3.55;
const HBW = HB.x1 - HB.x0, HBD = HB.z1 - HB.z0;
const hero = new THREE.Group(); world.add(hero); hero.visible = false;
const hbTex = canvasTex(1920, 840, (g, w, h) => {
  const u = (x) => (x - HB.x0) / HBW * w, v = (z) => (z - HB.z0) / HBD * h;
  g.fillStyle = '#223152'; g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(107,159,233,.16)'; g.lineWidth = 3;
  for (let i = 0; i < 46; i++) { const y = 20 + i * 18; g.beginPath(); g.moveTo(0, y); g.lineTo(w * (0.3 + (i * 37 % 50) / 100), y); g.lineTo(w * (0.34 + (i * 37 % 50) / 100), y + 30); g.lineTo(w, y + 30); g.stroke(); }
  g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '700 26px Inter'; g.textAlign = 'center';
  const slotsZ = [-1.45, -1.03, -0.61, -0.19];
  ['DIMM_A1', 'DIMM_A2', 'DIMM_B1', 'DIMM_B2'].forEach((s, i) => { g.textAlign = 'left'; g.fillText(s, u(-0.42) - 140, v(slotsZ[i]) + 9); });
  g.textAlign = 'center'; g.font = '800 30px Inter'; g.fillText('CPU', u(-1.95), v(0.75));
  // debug LED labels (left of LEDs)
  g.font = '800 30px Inter'; g.textAlign = 'right'; g.fillStyle = 'rgba(255,255,255,.85)';
  ['CPU', 'DRAM', 'VGA', 'BOOT'].forEach((s, i) => g.fillText(s, u(3.28), v(LEDZ[i]) + 11));
  g.textAlign = 'center'; g.font = '700 24px Inter'; g.fillStyle = 'rgba(255,255,255,.55)';
  g.fillText('SATA', u(4.75), v(-1.95)); g.fillText('ATX_PWR', u(5.65), v(1.95));
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 3; rr(g, u(3.05), v(-1.85), u(3.95) - u(3.05), v(0.3) - v(-1.85), 12); g.stroke();
  // screw holes
  g.fillStyle = '#c9d4e8'; for (const [x, z] of [[-3.1, -1.8], [5.9, -1.8], [-3.1, 1.8], [5.9, 1.8], [0.9, 0.2], [3.2, 1.3]]) { g.beginPath(); g.arc(u(x), v(z), 14, 0, 7); g.fill(); }
});
const heroBoard = at(box(HBW, 0.1, HBD, std('#223152', { roughness: 0.7 })), (HB.x0 + HB.x1) / 2, -0.05, 0); hero.add(heroBoard);
const heroTop = new THREE.Mesh(new THREE.PlaneGeometry(HBW, HBD), std('#ffffff', { map: hbTex, roughness: 0.7 }));
heroTop.rotation.x = -Math.PI / 2; at(heroTop, (HB.x0 + HB.x1) / 2, 0.002, 0); hero.add(heroTop);
// CPU socket + VRM + misc
hero.add(at(rbox(1.5, 0.14, 1.5, 0.04, std('#c9d4e8', { roughness: 0.4, metalness: 0.2 })), -1.95, 0.07, -0.55));
hero.add(at(box(1.1, 0.05, 1.1, std('#8e9fc0')), -1.95, 0.15, -0.55));
hero.add(at(rbox(1.9, 0.38, 0.4, 0.05, std('#33476f')), -1.95, 0.19, -1.72));
hero.add(at(rbox(0.4, 0.38, 1.7, 0.05, std('#33476f')), -3.05, 0.19, -0.5));
hero.add(at(rbox(3.6, 0.16, 0.26, 0.03, std('#101a2e')), -1.2, 0.08, 1.35));   // PCIe slot
hero.add(at(rbox(2.0, 0.12, 0.5, 0.04, std('#33476f')), -1.0, 0.06, 0.62));    // M.2 heatsink
hero.add(at(rbox(1.0, 0.22, 0.8, 0.05, std('#33476f')), 1.9, 0.11, 1.4));      // chipset
hero.add(at(rbox(0.36, 0.32, 1.5, 0.04, std('#E6EDF8')), 5.65, 0.16, 1.05));     // 24-pin
for (let i = 0; i < 4; i++) hero.add(at(rbox(0.5, 0.2, 0.26, 0.03, std('#101a2e')), 4.75, 0.1, -1.6 + i * 0.36)); // SATA
hero.add(at(rbox(0.7, 0.18, 0.7, 0.04, std('#33476f')), 3.6, 0.09, 1.25));      // small heatsink
// DIMM slots + sticks + latches
const SLOT = { x: 1.1, len: 2.85, z: [-1.45, -1.03, -0.61, -0.19] };
for (const z of SLOT.z) hero.add(at(box(SLOT.len, 0.14, 0.14, std('#101a2e')), SLOT.x, 0.07, z));
const heroSticks = [], latches = [];
const stickTopMat = basic('#8fa0be', { toneMapped: false });
for (const z of [SLOT.z[1], SLOT.z[3]]) {
  const st = new THREE.Group(); at(st, SLOT.x, 0.12, z); hero.add(st);
  const pcbMat = std(C.brand, { roughness: 0.38, transparent: true });
  st.add(at(rbox(2.6, 0.78, 0.09, 0.03, pcbMat), 0, 0.39, 0));
  const label = canvasTex(520, 160, (g, w, h) => {
    g.fillStyle = '#ffffff'; rr(g, 0, 0, w, h, 18); g.fill(); g.fillStyle = '#14284B'; g.font = '800 64px Inter'; g.textAlign = 'center';
    g.fillText('DDR5', w / 2, 88); g.font = '600 34px Inter'; g.fillStyle = '#5C6E91'; g.fillText('16GB · 6000', w / 2, 136);
  });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 0.34), new THREE.MeshBasicMaterial({ map: label, transparent: true }));
  at(lab, 0, 0.42, 0.048); st.add(lab);
  st.add(at(box(2.55, 0.06, 0.1, stickTopMat, { cast: false }), 0, 0.81, 0));
  st.userData.mats = [pcbMat, lab.material, stickTopMat];
  heroSticks.push(st);
}
for (const z of SLOT.z) for (const side of [-1, 1]) {
  const l = new THREE.Group(); at(l, SLOT.x + side * (SLOT.len / 2 + 0.04), 0.06, z); hero.add(l);
  l.add(at(rbox(0.1, 0.42, 0.16, 0.03, std('#E6EDF8')), 0, 0.21, 0)); l.userData.side = side; latches.push(l);
}
// debug LEDs

const leds = LEDZ.map((z) => {
  const m = basic('#3b4a6a', { toneMapped: false });
  const led = at(rbox(0.28, 0.1, 0.18, 0.03, m), LEDX, 0.05, z); hero.add(led);
  const gs = glowSprite(0.95, 0); at(gs, LEDX, 0.2, z); hero.add(gs); led.userData = { m, gs }; return led;
});
// hero poses
const HERO_IN = { pos: v3(CASE.x - 0.55, 2.7, CASE.z + 1.25), rotX: Math.PI / 2, s: 0.3 };
const HERO_OUT = { pos: v3(2.0, 1.75, 3.6), rotX: THREE.MathUtils.degToRad(26), s: 1.0 };
function setHeroPose(k) {
  hero.position.lerpVectors(HERO_IN.pos, HERO_OUT.pos, k);
  hero.rotation.x = lerp(HERO_IN.rotX, HERO_OUT.rotX, k);
  hero.scale.setScalar(lerp(HERO_IN.s, HERO_OUT.s, k));
}
setHeroPose(1); hero.updateMatrixWorld(true);
const HERO_SLOTS_W = hero.localToWorld(v3(SLOT.x - 0.25, 0.45, -0.6));
const HERO_LEDS_W = hero.localToWorld(v3(LEDX, 0.05, (LEDZ[0] + LEDZ[3]) / 2));
const heroLocalToWorld = (p) => { hero.updateMatrixWorld(true); return hero.localToWorld(p.clone()); };

// ---------- screen drawing ----------
const logoImg = new Image(); logoImg.src = '../assets/logo_full.png';
await new Promise((r) => { logoImg.onload = r; logoImg.onerror = r; });
function drawDesktop(g, w, h) {
  const gr = g.createRadialGradient(w * 0.55, h * 0.5, 10, w * 0.5, h * 0.5, w * 0.7);
  gr.addColorStop(0, '#9CC2F3'); gr.addColorStop(0.55, '#6B9FE9'); gr.addColorStop(1, '#2F6BCF');
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.save(); g.translate(w * 0.55, h * 0.47); g.globalAlpha = 0.18; g.fillStyle = '#ffffff';
  for (let i = 0; i < 4; i++) { g.rotate(Math.PI / 4); g.beginPath(); g.ellipse(0, 0, 210, 52, 0, 0, 7); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(255,255,255,.85)'; for (let i = 0; i < 3; i++) { rr(g, 40, 38 + i * 76, 52, 52, 10); g.fill(); }
  g.fillStyle = 'rgba(248,250,253,.92)'; g.fillRect(0, h - 40, w, 40);
  const cols = ['#2F6BCF', '#2F6BCF', '#6B9FE9', '#2F6BCF', '#9CC2F3', '#1D2C48'];
  cols.forEach((c, i) => { g.fillStyle = c; rr(g, w / 2 - 120 + i * 42, h - 31, 26, 22, 5); g.fill(); });
}
function cursor(g, x, y, s = 1) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 46); g.lineTo(11, 35); g.lineTo(20, 54); g.lineTo(28, 50); g.lineTo(19, 32); g.lineTo(34, 32); g.closePath();
  g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#14284B'; g.stroke(); g.restore();
}
function drawScreen(t) {
  const { g } = screenTex.userData; const w = SCR.cw, h = SCR.ch;
  g.save(); g.clearRect(0, 0, w, h);
  const off = win(t, S(53), FIX[3]);
  if (t < FIX_SCREEN) {
    // "black screen": deep navy, faint reflection, pulsing red dashed circle with "?"
    g.fillStyle = '#0c1526'; g.fillRect(0, 0, w, h);
    const rg = g.createLinearGradient(0, 0, w, h); rg.addColorStop(0, 'rgba(255,255,255,.06)'); rg.addColorStop(0.5, 'rgba(255,255,255,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
    if (!off) {
      const pulse = 1 + 0.06 * Math.sin(t * 6.2);
      g.save(); g.translate(w / 2, h / 2); g.scale(pulse, pulse);
      g.setLineDash([22, 16]); g.lineWidth = 10; g.strokeStyle = '#FF3347'; g.beginPath(); g.arc(0, 0, 92, 0, 7); g.stroke();
      g.setLineDash([]); g.fillStyle = '#FF3347'; g.font = '800 120px Inter'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, 6);
      g.restore();
      g.fillStyle = 'rgba(255,255,255,.45)'; g.font = '600 30px Inter'; g.textAlign = 'center'; g.fillText('NO SIGNAL', w / 2, h - 60);
    }
  } else if (t < S(101)) {
    drawDesktop(g, w, h);
    const k = prog(t, FIX_SCREEN, 0.7);
    g.strokeStyle = `rgba(34,211,106,${1 - 0.6 * k})`; g.lineWidth = 12; g.beginPath(); g.arc(w / 2, h / 2, 40 + 120 * eout(k), 0, 7); g.stroke();
    cursor(g, w / 2 - 6 + 30 * Math.sin(t * 1.3), h / 2 - 20 + 12 * Math.sin(t * 1.9), 1.1);
    const b = pop(t, FIX_SCREEN + 0.15, 0.4);
    if (b > 0) { g.save(); g.translate(w - 70, 66); g.scale(b, b); g.fillStyle = '#22D36A'; g.beginPath(); g.arc(0, 0, 38, 0, 7); g.fill();
      g.strokeStyle = '#fff'; g.lineWidth = 9; g.lineCap = 'round'; g.beginPath(); g.moveTo(-16, 1); g.lineTo(-4, 13); g.lineTo(17, -11); g.stroke(); g.restore(); }
  } else if (t < T_OUTRO) {
    drawDesktop(g, w, h);
    const b = pop(t, S(101) + 0.1, 0.45);
    g.save(); g.translate(w / 2, h / 2 - 30); g.scale(b, b);
    g.fillStyle = '#ffffff'; rr(g, -250, -120, 500, 210, 46); g.fill();
    g.beginPath(); g.moveTo(-90, 85); g.lineTo(-150, 150); g.lineTo(-20, 85); g.fill();
    for (let i = 0; i < 3; i++) { g.fillStyle = '#2F6BCF'; g.globalAlpha = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 7 - i * 0.9)); g.beginPath(); g.arc(-80 + i * 80, -18, 26, 0, 7); g.fill(); }
    g.restore(); g.globalAlpha = 1;
    g.fillStyle = 'rgba(29,44,72,.9)'; rr(g, w / 2 - 340, h - 158, 680, 96, 48); g.fill();
    g.fillStyle = '#fff'; g.font = '800 54px "Baloo Bhaijaan 2"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.direction = 'rtl';
    g.fillText('اكتب حلّك بالتعليقات', w / 2, h - 106);
  } else {
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
    const k = eout(prog(t, T_OUTRO + 0.1, 0.8)); const s = 0.82 + 0.18 * k;
    const lh = h * 0.84 * s, lw = lh * logoImg.width / logoImg.height;
    g.globalAlpha = k; g.drawImage(logoImg, w / 2 - lw / 2, h / 2 - lh / 2, lw, lh); g.globalAlpha = 1;
  }
  // screen flash on content changes
  for (const tf of [FIX_SCREEN, S(101), T_OUTRO]) {
    const f = 1 - prog(t, tf, 0.35);
    if (t >= tf && f > 0) { g.fillStyle = `rgba(255,255,255,${0.85 * f})`; g.fillRect(0, 0, w, h); }
  }
  g.restore();
  screenTex.needsUpdate = true;
}

// ---------- timeline ----------
const START = { 1: S(15), 2: S(38), 3: S(50), 4: S(71) };
const FIX = { 1: 12.42, 2: S(49) + 0.12, 3: S(69) + 0.05, 4: S(93) + 0.5 };
const FIX_SCREEN = S(95) - 0.05;
const HERO_T = S(54) + 0.12; // motherboard flies out of the case
const scn = (t) => (t < S(15) ? 'hook' : t < S(38) ? 's1' : t < S(50) ? 's2' : t < S(71) ? 's3' : t < S(94) ? 's4' : t < S(101) ? 'sum' : t < T_OUTRO ? 'cta' : 'outro');
const stepOf = (t) => (t < S(15) ? 0 : t < S(38) ? 1 : t < S(50) ? 2 : t < S(71) ? 3 : t < S(94) ? 4 : 5);

// case rotation (radians around Y): back panel to camera during step 1
function caseRot(t) {
  const a = eio(prog(t, S(15) + 0.12, 0.8)), b = eio(prog(t, S(38) + 0.12, 0.8));
  return (Math.PI / 2) * (a - b);
}
// RGB colour + intensity
const RED = new THREE.Color(C.problem), GREEN = new THREE.Color(C.fix), OFF = new THREE.Color('#3a4766');
function rgbState(t) {
  const segs = [[0, RED, 1], [FIX[1], GREEN, 1], [START[2], RED, 1], [FIX[2], GREEN, 1], [START[3], RED, 1], [S(53), OFF, 0],
    [FIX[3], GREEN, 1], [START[4], RED, 1], [FIX[4], GREEN, 1], [S(94), GREEN, 1]];
  let i = 0; while (i + 1 < segs.length && segs[i + 1][0] <= t) i++;
  const cur = segs[i], prev = segs[Math.max(0, i - 1)];
  const k = i === 0 ? 1 : eio(prog(t, cur[0], 0.25));
  return { color: prev[1].clone().lerp(cur[1], k), on: lerp(prev[2], cur[2], k) };
}
// fan angle: integral of speed (spin down when powered off, spin up at FIX3)
function fanAngle(t) {
  const v = 11, tOff = S(53) + 0.05, Td = 1.3, tOn = FIX[3], Tu = 0.8;
  if (t < tOff) return v * t;
  const a0 = v * tOff;
  if (t < tOn) { const tau = Math.min(t - tOff, Td); return a0 + v * (tau - tau * tau / (2 * Td)); }
  const a1 = a0 + v * Td / 2, tau = t - tOn;
  return a1 + (tau < Tu ? v * tau * tau / (2 * Tu) : v * (Tu / 2 + tau - Tu));
}
// camera keyframes: [time, target(Vector3), zoom, duration]
const WIDE = v3(0.25, 2.1, 0);
const backCenter = v3(CASE.x, 2.45, CASE.z + CASE.L / 2);
const backView = backCenter.clone().add(v3(-(700 - 540) / (PX_PER_UNIT * 1.85), 0, 0));
const camKeys = [
  [0, WIDE, 1.0, 0.01],
  [S(7) - 0.12, v3(CASE.x - 0.4, 2.5, CASE.z + 1), 1.38, 0.85],
  [S(13) - 0.05, WIDE, 1.0, 0.85],
  [S(15) + 0.05, backView, 1.85, 0.9],
  [S(38) + 0.05, v3(CASE.x + 0.15, 2.2, CASE.z + 0.6), 2.55, 0.9],
  [S(50) + 0.05, v3(CASE.x - 0.3, 2.35, CASE.z + 1), 1.55, 0.85],
  [HERO_T, HERO_SLOTS_W, 2.3, 0.75],
  [S(71) + 0.05, HERO_LEDS_W.clone().add(v3((540 - 330) / (PX_PER_UNIT * 3.1), -0.05, 0)), 3.1, 0.9],
  [S(94) + 0.02, WIDE, 1.0, 0.9],
  [S(101) + 0.02, v3(MON.x, MON.y + MON.h / 2 - 0.15, MON.z + 0.4), 1.8, 0.85],
  [T_OUTRO, v3(MON.x, MON.y + MON.h / 2 - 0.05, MON.z + 0.4), 2.15, 2.4],
];
function camState(t) {
  let target = camKeys[0][1].clone(), zoom = camKeys[0][2];
  for (const [t0, tg, z, d] of camKeys) {
    if (t < t0) break;
    const k = eio(prog(t, t0, d));
    target = target.clone().lerp(tg, k); zoom = lerp(zoom, z, k);
  }
  return { target, zoom };
}
function applyCamera(t) {
  const { target, zoom } = camState(t);
  camera.position.copy(target).addScaledVector(CAM_DIR, 60);
  camera.lookAt(target); camera.zoom = zoom; camera.updateProjectionMatrix();
  return zoom;
}
const _p = new THREE.Vector3();
function toScreen(p) { _p.copy(p).project(camera); return { x: (_p.x + 1) / 2 * 1080, y: (1 - _p.y) / 2 * 1920 }; }

// ---------- DOM overlays ----------
const $ = (id) => document.getElementById(id);
const dots = [...document.querySelectorAll('.dot')];
const labelsEl = $('labels');
function el(cls, html) { const d = document.createElement('div'); d.className = cls; d.innerHTML = html; labelsEl.appendChild(d); return d; }
const IC_OK = '<span class="ic fix">✓</span>', IC_X = '<span class="ic problem">✕</span>';
// label definitions: {el, show:[a,b], anchor:(t)=>Vector3, dx, dy, align:'left'|'right'|'center', update?(t, el)}
const labels = [];
function addLabel(o) { o.el = el('lbl ' + (o.cls || ''), o.html); labels.push(o); return o; }
const caseWorld = (lx, ly, lz) => { caseG.updateMatrixWorld(true); return caseG.localToWorld(v3(lx, ly, lz)); };

addLabel({ html: `${IC_OK}<span>المراوح تدور</span>`, show: [S(2) - 0.05, S(7) - 0.1], anchor: () => caseWorld(-0.6, CASE.H + 0.15, 1.0), dy: -58, align: 'center' });
addLabel({ html: '<span>المذربورد</span>', cls: 'dark', show: [S(19), S(38)], anchor: () => caseWorld(-hl, PORT_MOBO.y, PORT_MOBO.z), dx: -190, align: 'right',
  update(t, e) { const bad = t >= S(31) - 0.05; e.className = 'lbl ' + (bad ? 'problem' : 'dark'); e.innerHTML = bad ? `${IC_X}<span>المذربورد</span>` : '<span>المذربورد</span>'; } });
addLabel({ html: '<span>كرت الشاشة</span>', cls: 'dark', show: [S(23) - 0.05, S(38)], anchor: () => caseWorld(-hl, PORT_GPU.y, PORT_GPU.z), dx: -330, align: 'right',
  update(t, e) { const ok = t >= FIX[1]; e.className = 'lbl ' + (ok ? 'fix' : 'dark'); e.innerHTML = ok ? `${IC_OK}<span>كرت الشاشة</span>` : '<span>كرت الشاشة</span>'; } });
addLabel({ html: `${IC_X}<span>مو داخلة للآخر</span>`, cls: 'problem', show: [S(40) - 0.05, S(50)], anchor: () => caseWorld(-0.3 + 0.63, 1.82 + 0.75, -0.35 + 0.25), dy: -120, align: 'center',
  update(t, e) { const ok = t >= FIX[2]; e.className = 'lbl ' + (ok ? 'fix' : 'problem'); e.innerHTML = ok ? `${IC_OK}<span>راكبة زين وكاملة</span>` : `${IC_X}<span>مو داخلة للآخر</span>`; } });
addLabel({ html: '<span>الرام</span>', cls: 'dark', show: [S(52) - 0.05, S(53)], anchor: () => caseWorld(0.21, 3.75, -0.5), dy: -60, align: 'center' });
const offLbl = addLabel({ html: '<span class="ic problem">⏻</span><span>طفّ الجهاز</span>', cls: 'problem big', show: [S(53) - 0.03, HERO_T + 0.15], anchor: () => caseWorld(0.1, 2.5, 1.1), dy: 0, align: 'center' });
const numLbls = [0, 1].map((i) => addLabel({ html: `<span>${i + 1}</span>`, cls: 'dark big', show: [S(64) + i * 0.3, i ? S(67) + 0.3 : S(69)],
  anchor: () => heroLocalToWorld(v3(SLOT.x - 1.3, 0.45 + heroSticks[i].position.y, heroSticks[i].position.z + 0.05)), dx: -30, align: 'right' }));
addLabel({ html: `${IC_OK}<span>شريحة وحدة</span>`, cls: 'fix big', show: [S(69), S(71)], anchor: () => heroLocalToWorld(v3(SLOT.x, 1.25, SLOT.z[1])), dy: -60, align: 'center' });
const ledNames = ['المعالج', 'الرام', 'كرت الشاشة', 'الإقلاع'];
const ledTimes = [S(86), S(88), S(90), S(93)];
const ledLbls = ledNames.map((n, i) => addLabel({ html: `<span class="ic problem" style="width:22px;height:22px"></span><span>${n}</span>`, show: [ledTimes[i] - 0.03, S(94) + 0.1],
  anchor: () => heroLocalToWorld(v3(LEDX, 0.1, LEDZ[i])), dx: 60, align: 'left',
  update(t, e) { const cur = ledActive(t) === i; e.style.opacity = cur ? 1 : 0.6; e.className = 'lbl big ' + (cur ? 'problem' : ''); } }));
const tik = el('burst', 'تِك!'); const tikRing = el('ring', '');
const ledFrame = el('frame', '');
const noTool = el('noTool', `<svg viewBox="0 0 150 150" width="150" height="150"><circle cx="75" cy="75" r="66" fill="#fff" stroke="#e5384a" stroke-width="12"/>
  <g transform="rotate(45 75 75)"><rect x="70" y="18" width="10" height="60" rx="3" fill="#8a9bbd"/><path d="M70 18 L75 8 L80 18 Z" fill="#8a9bbd"/><rect x="60" y="74" width="30" height="62" rx="13" fill="#1D2C48"/><rect x="66" y="84" width="4" height="40" rx="2" fill="#3b4d75"/><rect x="80" y="84" width="4" height="40" rx="2" fill="#3b4d75"/></g>
  <line x1="30" y1="30" x2="120" y2="120" stroke="#e5384a" stroke-width="12" stroke-linecap="round"/></svg>`);

function ledActive(t) { let a = -1; ledTimes.forEach((lt, i) => { if (t >= lt) a = i; }); return a; }

function placeLabel(o, t) {
  const vis = win(t, o.show[0], o.show[1]);
  if (!vis) { o.el.style.display = 'none'; return; }
  o.el.style.display = 'inline-flex';
  if (o.update) o.update(t, o.el);
  const p = toScreen(o.anchor(t));
  const s = pop(t, o.show[0], 0.4), out = prog(t, o.show[1] - 0.2, 0.2);
  const wpx = o.el.offsetWidth, hpx = o.el.offsetHeight;
  let x = p.x + (o.dx || 0), y = p.y + (o.dy || 0) - hpx / 2;
  if (o.align === 'center') x -= wpx / 2; else if (o.align === 'right') x -= wpx;
  x = clamp(x, 120, 960 - wpx); y = clamp(y, 300, 1360);
  o.el.style.transform = `translate(${x}px, ${y}px) scale(${Math.max(0.001, s * (1 - out))})`;
}

// ---------- title / badge / desc / chips by time ----------
const titleSpecs = [
  { t: 0, cls: 'hook', html: 'الجهاز شغّال<br>والشاشة <span class="red">سوداء؟</span>' },
  { t: START[1], html: 'كيبل الشاشة' },
  { t: START[2], html: 'باور كرت الشاشة' },
  { t: START[3], html: 'الرام' },
  { t: START[4], html: 'لمبات المذربورد' },
  { t: S(94), html: 'الحل غالباً في واحد منها', style: 'font-size:86px' },
  { t: S(101), html: 'صار معك هالشي؟' },
  { t: T_OUTRO, html: '' },
];
const descSpecs = [
  { t: 0, txt: 'المراوح تدور… بس ما فيه صورة' },
  { t: S(7) - 0.05, txt: 'لا تفك الجهاز قبل ما تشيّك' },
  { t: S(13) - 0.05, txt: 'شيّك على هالأربع أشياء' },
  { t: START[1], txt: '' },
  { t: S(17), txt: 'وين راكب؟' },
  { t: S(25), txt: 'لازم يكون في كرت الشاشة نفسه' },
  { t: S(34) - 0.05, txt: '' },
  { t: START[2], txt: '' },
  { t: S(40), txt: 'تأكد إنها راكبة زين وكاملة' },
  { t: START[3], txt: '' },
  { t: S(55), txt: 'طلّعها ورجّعها لين تسمع التكة' },
  { t: S(62), txt: 'أكثر من شريحة؟ جرّب وحدة بس' },
  { t: START[4], txt: '' },
  { t: S(73), txt: 'تقولك وين المشكلة' },
  { t: S(94), txt: '' },
  { t: S(104) - 0.05, txt: 'وش كان الحل عندك؟' },
  { t: T_OUTRO, txt: '' },
];
const lastSpec = (specs, t) => { let s = specs[0]; for (const x of specs) if (t >= x.t) s = x; return s; };
let lastTitleKey = '', lastDescKey = '', lastChipsKey = '';
const sumChips = [['كيبل الشاشة', S(95) + 0.05], ['باور الكرت', S(95) + 0.3], ['الرام', S(97) + 0.05], ['لمبات البوردة', S(97) + 0.3]];
function updateText(t) {
  const st = stepOf(t);
  // dots
  dots.forEach((d, i) => {
    const n = i + 1; let cls = 'dot';
    if (t >= FIX[n]) cls += ' fix'; else if (t >= START[n]) cls += ' problem';
    d.className = cls;
    let sc = 1;
    if (t >= START[n]) sc = Math.max(sc, 1 + 0.25 * Math.sin(Math.PI * prog(t, START[n], 0.35)));
    if (t >= FIX[n]) sc = Math.max(sc, 1 + 0.25 * Math.sin(Math.PI * prog(t, FIX[n], 0.35)));
    const hookPulse = S(13) + 0.12 + i * 0.16; if (t < START[1]) sc = Math.max(sc, 1 + 0.3 * Math.sin(Math.PI * prog(t, hookPulse, 0.32)));
    d.style.transform = `scale(${sc})`;
    if (t < START[1] && t >= hookPulse) d.style.borderColor = '#2F6BCF', d.style.color = '#2F6BCF'; else d.style.borderColor = '', d.style.color = '';
  });
  const header = $('header'); const ho = 1 - prog(t, T_OUTRO, 0.3); header.style.opacity = ho;
  // badge
  const badge = $('badge');
  if (st >= 1 && st <= 4) {
    const fixed = t >= FIX[st];
    badge.style.display = 'inline-flex';
    badge.className = fixed ? 'fix' : '';
    badge.innerHTML = `<span>الخطوة</span><span class="num">${st}</span>${fixed ? '<span>✓</span>' : ''}`;
    const s = fixed ? 1 + 0.18 * Math.sin(Math.PI * prog(t, FIX[st], 0.3)) : pop(t, START[st], 0.4);
    badge.style.transform = `scale(${s})`;
  } else badge.style.display = 'none';
  // title
  const ts = lastSpec(titleSpecs, t); const title = $('title');
  if (ts.t + ts.html !== lastTitleKey) { title.innerHTML = ts.html; title.className = ts.cls || ''; title.style.cssText = ts.style || ''; lastTitleKey = ts.t + ts.html; }
  const tk = ts.t === 0 ? 1 : eout(prog(t, ts.t, 0.38));
  title.style.opacity = tk; title.style.transform = `translateY(${(1 - tk) * 26}px) scale(${0.94 + 0.06 * tk})`;
  if (ts.t === 0) { const r = title.querySelector('.red'); if (r) r.style.display = 'inline-block', r.style.transform = `scale(${1 + 0.07 * Math.max(0, Math.sin(Math.PI * prog(t, S(6), 0.4)))})`; }
  // desc
  const ds = lastSpec(descSpecs, t); const desc = $('desc');
  if (ds.t + ds.txt !== lastDescKey) { desc.textContent = ds.txt; lastDescKey = ds.t + ds.txt; }
  const dk = ds.t === 0 ? 1 : eout(prog(t, ds.t, 0.3)); desc.style.opacity = dk; desc.style.transform = `translateY(${(1 - dk) * 14}px)`;
  // chips
  const chips = $('chips'); let key = '', html = '';
  if (win(t, S(34) - 0.05, START[2])) { key = 'warn'; html = `<div class="chip warn" data-t="${S(34) - 0.05}"><span class="ic problem">!</span><span>أكثر غلطة منتشرة</span></div>`; }
  else if (win(t, S(94), S(101))) {
    key = 'sum' + sumChips.filter(([, ct]) => t >= ct).length;
    html = sumChips.filter(([, ct]) => t >= ct).map(([n, ct]) => `<div class="chip" data-t="${ct}"><span class="ic fix">✓</span><span>${n}</span></div>`).join('');
  }
  if (key !== lastChipsKey) { chips.innerHTML = html; lastChipsKey = key; }
  for (const c of chips.children) c.style.transform = `scale(${pop(t, +c.dataset.t, 0.4)})`;
  // curtain
  const z = camera.zoom; $('curtain').style.opacity = clamp((z - 1.12) / 0.35) * (t < T_OUTRO ? 1 : 1 - prog(t, T_OUTRO, 0.3));
  $('titleZone').style.opacity = t < T_OUTRO ? 1 : 1 - prog(t, T_OUTRO, 0.25);
}

// ---------- captions ----------
const chunks = [[0, 3], [4, 6], [7, 9], [10, 14], [15, 20], [21, 24], [25, 30], [31, 33], [34, 37], [38, 43], [44, 49], [50, 52], [53, 56], [57, 61],
  [62, 66], [67, 70], [71, 72], [73, 77], [78, 81], [82, 85], [86, 88], [89, 93], [94, 100], [101, 103], [104, 107]];
let lastCapKey = '';
function updateCaption(t) {
  const pill = $('capPill');
  if (t >= T_OUTRO) {
    if (lastCapKey !== 'outro') { pill.innerHTML = '<span class="past">المشاكل وحلولها · تيربو</span>'; lastCapKey = 'outro'; }
    const k = pop(t, T_OUTRO + 0.15, 0.45); pill.style.transform = `scale(${k})`; return;
  }
  let ci = 0; chunks.forEach(([a], i) => { if (t >= S(a) - 0.06) ci = i; });
  const [a, b] = chunks[ci];
  const key = 'c' + ci;
  if (key !== lastCapKey) {
    pill.innerHTML = W.slice(a, b + 1).map((w, k) => `<span data-i="${a + k}">${w.w}</span>`).join(' ');
    lastCapKey = key; pill.style.fontSize = '54px';
    if (pill.scrollWidth > 840) pill.style.fontSize = Math.floor(54 * 760 / pill.scrollWidth) + 'px';
  }
  for (const sp of pill.children) {
    const i = +sp.dataset.i; const cur = t >= W[i].s - 0.04 && (i === b || t < W[i + 1].s - 0.04);
    sp.className = cur ? 'cur' : t >= W[i].s ? 'past' : '';
  }
  const lastEnd = E(b); const fade = (ci === chunks.length - 1) ? 1 : 1;
  const k = ci === 0 ? 1 : eout(prog(t, S(a) - 0.06, 0.18));
  pill.style.transform = `translateY(${(1 - k) * 10}px)`; pill.style.opacity = fade * (0.4 + 0.6 * k);
}

// ---------- per-frame 3D update ----------
const OFFSCREEN = v3(0, -50, 0);
function update3D(t) {
  // assembly pops (subtle; the first frame already reads as a full desk)
  const assemble = (obj, t0) => { const s = 0.86 + 0.14 * backOut(clamp((t - t0) / 0.45)); obj.scale.setScalar(s); };
  assemble(monitor, 0.0); assemble(keyboard, 0.08); assemble(caseG, 0.12); assemble(mouse, 0.2);
  world.position.y = 0.05 * Math.sin(t * 1.1);

  // mouse wiggle (hook and summary)
  const mw = t < S(15) || t >= S(94) ? 1 : 0.15;
  mouse.position.set(PADP.x + 0.28 * mw * Math.sin(t * 2.1), 0, PADP.z + 0.16 * mw * Math.sin(t * 1.55 + 0.6));

  // case rotation
  caseG.rotation.y = caseRot(t);

  // RGB
  const { color, on } = rgbState(t);
  rgbMat.color.copy(color); rgbSoft.color.copy(color);
  caseLight.color.copy(color); caseLight.intensity = 7 * on;
  for (const gsp of [caseGlow, caseGlow2]) { gsp.material.color.copy(color); gsp.material.opacity = gsp.userData.baseOpacity * on; }
  mouseLedMat.color.copy(on > 0.5 ? color : OFF);
  // fans
  const fa = fanAngle(t); fans.forEach((b, i) => { b.rotation.z = -fa * (i % 2 ? 1.08 : 1); });

  // port glows (step 1)
  const pulse = 0.55 + 0.45 * Math.sin(t * 9);
  glowMobo.material.opacity = (win(t, S(18), 11.35) ? pulse : 0) + (win(t, S(31) - 0.05, S(38)) ? 0.6 * pulse : 0);
  glowGpu.material.opacity = win(t, FIX[1], S(38)) ? 0.6 + 0.4 * (1 - prog(t, FIX[1], 0.6)) : 0;

  // HDMI cable (only while the back is turned toward the camera)
  const cableOn = t > S(15) + 0.5 && t < S(38) + 0.35;
  plugHead.visible = cableOn;
  if (cableMesh) { world.remove(cableMesh); cableMesh.geometry.dispose(); cableMesh = null; }
  if (cableOn) {
    const pM = caseWorld(-hl - 0.02, PORT_MOBO.y, PORT_MOBO.z), pG = caseWorld(-hl - 0.02, PORT_GPU.y, PORT_GPU.z);
    const n = caseWorld(-hl - 1, 0, 0).sub(caseWorld(-hl, 0, 0)).normalize();
    const t0 = 11.35, k1 = eout(prog(t, t0, 0.25)), k2 = eio(prog(t, t0 + 0.25, 0.55)), k3 = eio(prog(t, t0 + 0.8, 0.25));
    const P = pM.clone().lerp(pG, k2).addScaledVector(n, 0.45 * (k1 - k3) + 0.25 * Math.sin(Math.PI * k2));
    plugHead.position.copy(P); plugHead.quaternion.setFromUnitVectors(v3(0, 0, 1), n);
    const out = P.clone().addScaledVector(n, 0.34);
    const top = caseWorld(-hl, 0, 0).addScaledVector(n, 1.1); top.y = 7.5; top.x -= 0.55;
    const curve = new THREE.CatmullRomCurve3([out, out.clone().addScaledVector(n, 0.35).add(v3(-0.05, 0.3, 0)),
      out.clone().addScaledVector(n, 0.55).add(v3(-0.3, 1.1, 0)), top.clone().add(v3(0.1, -2.6, 0)), top]);
    cableMesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, 0.075, 10), cableMat); cableMesh.castShadow = true; world.add(cableMesh);
  }

  // GPU power plugs (step 2)
  plugs.forEach((p, i) => {
    const seat = i === 0 ? S(47) + 0.1 : S(49) + 0.02;
    const k = eio(prog(t, seat, 0.14));
    const loose = t < seat ? 1 - k : 1 - k;
    p.position.y = 0.3 + 0.17 * loose + (t < seat && t > S(40) ? 0.015 * Math.sin(t * 14 + i) : 0);
    const gm = p.userData.gap.material;
    if (t < seat) { gm.color.set(C.problem); gm.opacity = win(t, S(40) - 0.1, seat) ? 0.55 + 0.4 * Math.sin(t * 9) : 0; }
    else { gm.color.set(C.fix); gm.opacity = 0.9 * (1 - prog(t, seat + 0.1, 0.6)); }
  });

  // hero motherboard
  const kOut = eio(prog(t, HERO_T, 0.7)), kBack = eio(prog(t, S(94) + 0.05, 0.7));
  const hk = kOut * (1 - kBack);
  hero.visible = hk > 0.001;
  setHeroPose(hk);
  // sticks
  const lift = (() => {
    if (t < 25.05) return 0;
    if (t < 25.45) return 1.05 * eout(prog(t, 25.05, 0.4));
    if (t < 25.62) return 1.05;
    if (t < 26.0) return lerp(1.05, 0.2, eio(prog(t, 25.62, 0.38)));
    if (t < S(61)) return lerp(0.2, 0.07, prog(t, 26.0, S(61) - 26.0));
    return 0.07 * (1 - prog(t, S(61), 0.06));
  })();
  heroSticks.forEach((st, i) => {
    let y = 0.12 + lift, x = SLOT.x, a = 1;
    if (i === 1) { // second stick gets removed
      const r1 = eout(prog(t, S(67) + 0.2, 0.3)), r2 = eio(prog(t, S(67) + 0.45, 0.45));
      y += 1.35 * r1 + 1.2 * r2; x += 2.6 * r2; a = 1 - prog(t, S(67) + 0.55, 0.3);
    }
    st.position.set(x, y, st.position.z); st.visible = a > 0.01;
    st.userData.mats[0].opacity = a; st.userData.mats[1].opacity = a;
  });
  const stickCol = t >= FIX[3] ? GREEN : (t >= START[3] && t < S(53) ? RED : OFF);
  stickTopMat.color.copy(stickCol);
  latches.forEach((l) => {
    const open = t > 24.95 && t < S(61) ? 1 : 0;
    const k = t < S(61) ? eout(prog(t, 24.95, 0.15)) : 1 - prog(t, S(61), 0.07);
    l.rotation.z = -l.userData.side * 0.62 * (open ? k : Math.max(0, k));
  });
  // debug LEDs
  const act = ledActive(t);
  leds.forEach((led, i) => {
    let lit = 0;
    if (win(t, S(78), S(85) + 0.3)) lit = (Math.floor((t - S(78)) * 6) % 4 === i) ? 1 : 0;
    if (t >= S(86) - 0.03 && act === i) lit = 1;
    if (t >= S(86) - 0.03 && act !== i && act >= 0) lit = 0;
    const col = lit ? RED : new THREE.Color('#3b4a6a');
    led.userData.m.color.copy(col);
    led.userData.gs.material.color.copy(RED); led.userData.gs.material.opacity = lit ? 0.9 : 0;
  });
}

function updateFx(t) {
  // RAM click burst
  const tk = prog(t, S(61), 0.6);
  if (t >= S(61) && tk < 1 && hero.visible) {
    const p = toScreen(heroLocalToWorld(v3(SLOT.x + 0.9, 1.0, SLOT.z[3])));
    tik.style.display = 'block';
    const s = backOut(clamp(tk / 0.5)); const o = 1 - prog(t, S(61) + 0.4, 0.2);
    tik.style.transform = `translate(${p.x - 20}px, ${p.y - 120}px) scale(${s}) rotate(-8deg)`; tik.style.opacity = o;
    const q = toScreen(heroLocalToWorld(v3(SLOT.x + SLOT.len / 2, 0.3, SLOT.z[3])));
    const r = 30 + 110 * eout(tk);
    Object.assign(tikRing.style, { display: 'block', width: 2 * r + 'px', height: 2 * r + 'px', border: `8px solid rgba(34,211,106,${1 - tk})`,
      transform: `translate(${q.x - r}px, ${q.y - r}px)` });
  } else { tik.style.display = 'none'; tikRing.style.display = 'none'; }
  // LED search frame
  if (win(t, S(73), S(86) - 0.05)) {
    const a = toScreen(heroLocalToWorld(v3(LEDX - 0.75, 0.05, LEDZ[0] - 0.28))), b = toScreen(heroLocalToWorld(v3(LEDX + 0.3, 0.05, LEDZ[3] + 0.26)));
    const s = pop(t, S(73), 0.35) * (1 + 0.04 * Math.sin(t * 8));
    ledFrame.style.display = 'block';
    Object.assign(ledFrame.style, { width: (b.x - a.x) + 'px', height: (b.y - a.y) + 'px',
      transform: `translate(${a.x}px, ${a.y}px) scale(${s})`, opacity: 1 - prog(t, S(86) - 0.25, 0.2) });
  } else ledFrame.style.display = 'none';
  // no-screwdriver icon (hook)
  if (win(t, S(7) - 0.05, S(13))) {
    const p = toScreen(caseWorld(0.0, 2.4, 1.1));
    const s = pop(t, S(7) - 0.05, 0.4) * (1 - prog(t, S(13) - 0.2, 0.2));
    noTool.style.display = 'block'; noTool.style.transform = `translate(${p.x - 75}px, ${p.y - 75}px) scale(${s})`;
  } else noTool.style.display = 'none';
}

// ---------- SFX cue list (used by the audio mix) ----------
window.SFX_CUES = [
  [0.02, 'pickup', -12], [0.16, 'pickup', -14], [0.3, 'pickup', -14],
  [S(2) - 0.05, 'select', -14], [S(6), 'error', -6], [S(7) - 0.12, 'swipe', -14], [S(7) - 0.02, 'pickup', -10], [S(13) - 0.05, 'swipe', -14],
  [S(13) + 0.12, 'pickup', -16], [S(13) + 0.28, 'pickup', -16], [S(13) + 0.44, 'pickup', -16], [S(13) + 0.6, 'pickup', -16],
  [START[1] - 0.02, 'select', -12], [START[1] + 0.1, 'grass2', -10], [S(18), 'error', -8], [S(19), 'pickup', -13], [S(23) - 0.05, 'pickup', -13],
  [11.33, 'swipe', -13], [12.38, 'lock', -5], [FIX[1] + 0.02, 'sel_fwd', -8], [FIX[1] + 0.06, 'pickup', -10], [S(31) - 0.05, 'error', -10], [S(34) - 0.05, 'select', -13],
  [START[2] - 0.02, 'select', -12], [START[2] + 0.1, 'grass5', -10], [S(40) - 0.05, 'error', -9], [S(47) + 0.12, 'lock', -6], [S(49) + 0.04, 'lock', -6],
  [FIX[2] + 0.04, 'sel_fwd', -8], [FIX[2] + 0.08, 'pickup', -10],
  [START[3] - 0.02, 'select', -12], [S(52) - 0.05, 'pickup', -13], [S(53) - 0.03, 'select', -7], [HERO_T - 0.03, 'swipe', -10], [25.05, 'grass2', -12],
  [25.62, 'grass5', -14], [S(61), 'lock', -3], [S(64), 'pickup', -13], [S(64) + 0.3, 'pickup', -13], [S(67) + 0.2, 'swipe', -12], [S(67) + 0.75, 'drop', -12],
  [FIX[3], 'sel_fwd', -8], [FIX[3] + 0.04, 'pickup', -10],
  [START[4] - 0.02, 'select', -12], [START[4] + 0.05, 'grass2', -12], [S(73), 'keyboard:0.7', -16],
  [ledTimes[0], 'pickup', -10], [ledTimes[1], 'pickup', -10], [ledTimes[2], 'pickup', -10], [ledTimes[3], 'pickup', -10],
  [FIX[4], 'sel_fwd', -8], [FIX[4] + 0.04, 'pickup', -10],
  [S(94) + 0.02, 'swipe', -12], [FIX_SCREEN, 'sel_fwd', -6], [FIX_SCREEN + 0.04, 'pickup', -8], [S(97) + 0.05, 'pickup', -15],
  [S(101), 'notif', -8], [T_OUTRO, 'swipe', -12], [T_OUTRO + 0.2, 'notif', -8],
];
window.T_END = T_END;

// ---------- main entry ----------

window.renderFrame = (t) => {
  update3D(t);
  applyCamera(t);
  drawScreen(t);
  updateText(t);
  updateCaption(t);
  for (const o of labels) placeLabel(o, t);
  updateFx(t);
  renderer.render(scene, camera);
};
window.renderFrame(0);
window.READY = true;
