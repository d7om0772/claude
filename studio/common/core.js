// =============================================================================
// core.js — المحرك المشترك لقوالب تيربو: تحميل البيانات، طبقة HTML، الترجمة، العناصر،
// والدالة الحتمية window.renderFrame(t). كل حالة على الشاشة = دالة نقية في t (بدون تراكم).
// =============================================================================
import * as THREE from "three";
import * as K from "./kit3d.js";

export { THREE, K };
export const W = 1080, H = 1920;

// ---------- رياضيات وتوقيت ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, p) => a + (b - a) * p;
export const prog = (t, start, dur) => clamp((t - start) / Math.max(1e-6, dur));
export const E = {
  linear: (p) => p,
  outCubic: (p) => 1 - Math.pow(1 - p, 3),
  inCubic: (p) => p * p * p,
  inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  outBounce: (p) => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  },
};
/** حالة ظهور عنصر بين start و end: دخول بارتداد وخروج سريع. */
export function life(t, start, end, inDur = 0.4, outDur = 0.25) {
  if (t < start || t > end + outDur) return { on: false, a: 0, s: 0, pin: 0, pout: 0 };
  const pin = prog(t, start, inDur), pout = prog(t, end, outDur);
  const a = clamp(Math.min(pin * 1.6, 1) * (1 - pout));
  const s = (pin < 1 ? E.outBack(pin) : 1) * (1 - 0.15 * pout);
  return { on: a > 0.001, a, s, pin, pout };
}
export function rng(seed = 1) { // mulberry32 — عشوائي حتمي
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------- نصوص: هروب HTML + عزل اللاتيني والأرقام LTR + **تمييز** ----------
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// تسلسل لاتيني/أرقام واحد (مثل "Win + Shift + S" أو "1,299" أو "RTX 5060 Ti"). ما ينتهي بـ + عشان علامة الربط تبقى بين الكلمتين.
const LTR_RUN = /([A-Za-z0-9][A-Za-z0-9+.,%/:#×\-–_' ]*[A-Za-z0-9%#)]|[A-Za-z0-9])/g;
export function isolateLTR(s) { return esc(s).replace(LTR_RUN, (m) => `<bdi dir="ltr" class="ltr">${m}</bdi>`); }
export function rich(s) { // **نص** → أزرق
  return String(s ?? "").split(/(\*\*[^*]+\*\*)/g).map((part) =>
    part.startsWith("**") ? `<span class="hl">${isolateLTR(part.slice(2, -2))}</span>` : isolateLTR(part)).join("");
}
export const hasLatin = (s) => /[A-Za-z0-9]/.test(s);
export function fmtPrice(n) { return Number(n).toLocaleString("en-US"); }

// ---------- DOM ----------
export function el(tag, cls, html, parent) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e); return e;
}
function loadImg(src) {
  return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

// ---------- البيانات ----------
async function loadData() {
  if (window.__SCENE_DATA__) return window.__SCENE_DATA__;
  const q = new URLSearchParams(location.search);
  const src = q.get("data") || "sample.json";
  const r = await fetch(src); return r.json();
}

// ---------- الترجمة: سطر واحد ظاهر، الكلمة الحالية بالأزرق ----------
function setupCaptions(ctx) {
  const lines = ctx.data.captions?.lines || [];
  const box = el("div", "caption", null, ctx.ov); box.dataset.safe = "1"; box.dataset.solo = "caption";
  const cap = el("div", "capsule", null, box);
  let cur = -1, spans = [];
  return (t) => {
    const closing = ctx.closingStart;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      const L = lines[i], next = lines[i + 1];
      const holdEnd = next ? Math.min(next.start, L.end + 0.6) : L.end + 0.6;
      if (t >= L.start - 0.05 && t < holdEnd) { idx = i; break; }
    }
    if (t >= closing) idx = -1;
    if (idx !== cur) {
      cur = idx; cap.innerHTML = ""; spans = [];
      if (idx >= 0) {
        // الكلمات اللاتينية/الأرقام المتتالية (مع + و - بينها) تنجمع في عنصر LTR واحد عشان ما ينقلب ترتيبها
        const ws = lines[idx].words; let group = null;
        const isL = (s) => hasLatin(s); const isSym = (s) => /^[+\-–/×&]+$/.test(s.trim());
        ws.forEach((w, k) => {
          const latin = isL(w.w), sym = isSym(w.w);
          const joinable = latin || (sym && group && ws[k + 1] && isL(ws[k + 1].w));
          if (joinable) {
            if (!group) { if (k) cap.appendChild(document.createTextNode(" ")); group = el("bdi", "ltrgroup", null, cap); group.dir = "ltr"; }
            else group.appendChild(document.createTextNode(" "));
            spans.push(el("span", "w ltr", esc(w.w), group));
          } else {
            group = null; if (k) cap.appendChild(document.createTextNode(" "));
            spans.push(el("span", "w", esc(w.w), cap));
          }
        });
      }
    }
    if (idx < 0) { box.style.opacity = 0; return; }
    const L = lines[idx];
    const pin = prog(t, L.start - 0.05, 0.22);
    box.style.opacity = clamp(pin * 2);
    cap.style.transform = `scale(${0.92 + 0.08 * E.outBack(pin)})`;
    L.words.forEach((w, k) => {
      const now = t >= w.start && t < (L.words[k + 1]?.start ?? w.end + 0.25);
      spans[k].classList.toggle("now", now);
      spans[k].classList.toggle("said", t >= w.start);
    });
  };
}

// ---------- فحص الجودة: المناطق الآمنة + التداخل ----------
function visible(e) {
  let n = e;
  while (n && n !== document.body) {
    const cs = getComputedStyle(n);
    if (cs.display === "none" || cs.visibility === "hidden" || parseFloat(cs.opacity) < 0.05) return false;
    n = n.parentElement;
  }
  return e.textContent.trim().length > 0;
}
function qa(t) {
  const out = [];
  const items = [...document.querySelectorAll("[data-safe]")].filter(visible);
  for (const e of items) {
    const r = e.getBoundingClientRect(); const name = e.dataset.solo || e.className;
    if (r.top < 180 - 1) out.push({ t, type: "safe-top", el: name, top: Math.round(r.top) });
    if (r.bottom > 1500 + 1) out.push({ t, type: "safe-bottom", el: name, bottom: Math.round(r.bottom) });
    if (r.right > 960 + 1 && r.bottom > 800 && r.top < 1600) out.push({ t, type: "safe-right", el: name, right: Math.round(r.right) });
  }
  const solos = [...document.querySelectorAll("[data-solo]")].filter(visible);
  for (let i = 0; i < solos.length; i++) for (let j = i + 1; j < solos.length; j++) {
    const a = solos[i].getBoundingClientRect(), b = solos[j].getBoundingClientRect(), pad = 4;
    if (a.left < b.right - pad && b.left < a.right - pad && a.top < b.bottom - pad && b.top < a.bottom - pad)
      out.push({ t, type: "overlap", a: solos[i].dataset.solo, b: solos[j].dataset.solo });
  }
  return out;
}

// ---------- الإقلاع ----------
/**
 * cfg = { series, label, build(ctx) → {update(t)}, handlers: { E01: {setup(ev,ctx), update(ev,t,ctx)} } }
 */
export async function boot(cfg) {
  const data = await loadData();
  const stage = document.getElementById("stage");
  const canvas = document.getElementById("gl");
  const ov = document.getElementById("overlay");
  await Promise.all([
    document.fonts.load('800 60px "Baloo Bhaijaan 2"', "تيربو"),
    document.fonts.load('700 60px "Baloo Bhaijaan 2"', "تيربو"),
    document.fonts.load('800 40px "Inter"', "RTX 5060"),
    document.fonts.load('600 40px "Inter"', "RTX 5060"),
  ]);
  await document.fonts.ready;

  const logoIcon = await loadImg("../../brand/logo/icon_transparent.png");
  const logoFull = await loadImg("../../brand/logo/full_transparent.png");

  const renderer = K.createRenderer(canvas);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(cfg.background || "#F1F6FE");
  const camera = K.isoCamera();
  const ctx = {
    data, cfg, THREE, K, renderer, scene, camera, stage, ov, W, H, logoIcon, logoFull,
    duration: data.duration, closingStart: data.closing?.start ?? (data.duration - 2.5),
    rand: rng(data.seed ?? 7), variant: data.camera?.variant ?? 0,
    project(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; },
  };

  // الشريط العلوي
  const top = el("header", "topbar", null, ov); top.dataset.safe = "1"; top.dataset.solo = "topbar";
  const row = el("div", "row", null, top);
  if (logoIcon) { const i = el("img", "logo", null, row); i.src = logoIcon.src; } else el("div", "logo-ph", "TURBO", row);
  el("div", "series", esc(cfg.label), row);
  el("div", "brandname", "TURBO PC", row);
  const bar = el("div", "progress", "<i></i>", top).firstChild;
  // العنوان
  const title = el("h1", "title", rich(data.title || ""), ov); title.dataset.safe = "1"; title.dataset.solo = "title";
  // الهوك
  const hook = el("div", "hook", rich(data.hook?.text || ""), ov); hook.dataset.safe = "1"; hook.dataset.solo = "hook";
  const hookStart = data.hook?.start ?? 0, hookEnd = data.hook?.end ?? 2.6;

  const updCaption = setupCaptions(ctx);

  // الختام
  const closing = el("div", "closing", null, ov);
  if (logoFull) { const i = el("img", "full", null, closing); i.src = logoFull.src; }
  else { el("div", "full-ph", "TURBO", closing); }
  el("div", "sig", `تيربو<span class="dot">·</span>${esc(cfg.label)}`, closing);
  if (!logoFull) el("div", "ph-note", "logo placeholder — brand/logo/full_transparent.png missing", closing);

  // المشهد 3D الخاص بالسلسلة
  const sceneApi = await cfg.build(ctx);
  // العناصر
  const events = (data.events || []).map((ev, i) => ({ ...ev, _i: i }));
  for (const ev of events) {
    const h = cfg.handlers[ev.el];
    if (!h) { console.warn("unknown element", ev.el); continue; }
    ev._h = h; h.setup?.(ev, ctx);
  }
  if (new URLSearchParams(location.search).get("debug")) {
    for (const [l, t, w, h] of [[0, 0, 1080, 180], [0, 1500, 1080, 420], [960, 800, 120, 800]])
      Object.assign(el("div", "safe-guide", null, ov).style, { left: l + "px", top: t + "px", width: w + "px", height: h + "px" });
  }

  window.renderFrame = (t) => {
    const cs = ctx.closingStart;
    bar.style.width = `${clamp(t / cs) * 100}%`;
    const hl = life(t, hookStart, hookEnd, 0.3, 0.3);
    hook.style.opacity = hl.a; hook.style.transform = `scale(${0.85 + 0.15 * hl.s})`;
    sceneApi.update?.(t);
    for (const ev of events) ev._h?.update?.(ev, t, ctx);
    updCaption(t);
    const cp = prog(t, cs, 0.45);
    closing.style.opacity = cp;
    const logoEl = closing.firstChild; if (logoEl) logoEl.style.transform = `scale(${0.7 + 0.3 * E.outBack(prog(t, cs + 0.1, 0.5))})`;
    renderer.render(scene, camera);
    return true;
  };
  window.__qa = qa;
  window.__meta = { series: cfg.series, duration: data.duration, events: events.length, logo: !!logoIcon, logoFull: !!logoFull };
  const q = new URLSearchParams(location.search);
  if (q.get("t")) window.renderFrame(parseFloat(q.get("t")));
  window.__ready = true;
}
