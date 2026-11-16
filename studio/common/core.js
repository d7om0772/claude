// =============================================================================
// core.js — المحرك المشترك لقوالب تيربو (حسب حزم الستايل 13/14/15):
// تحميل البيانات، الشريط العلوي (عداد "باقي" أو نقاط 1–5)، منطقة العنوان (شارة/عنوان/سعر/وصف/أزرار)،
// الستارة، الترجمة (كبسولة y 1378–1500)، فحص الجودة، والدالة الحتمية window.renderFrame(t).
// كل حالة على الشاشة = دالة نقية في t (بدون تراكم).
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
  inQuad: (p) => p * p,
  inOutCubic: (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2),
  outBack: (p, s = 1.70158) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2),
  spring: (p) => (p >= 1 ? 1 : 1 - Math.exp(-6 * p) * Math.cos(10 * p)),
  outBounce: (p) => {
    const n = 7.5625, d = 2.75;
    if (p < 1 / d) return n * p * p;
    if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75;
    if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375;
    return n * (p -= 2.625 / d) * p + 0.984375;
  },
};
export function life(t, start, end, inDur = 0.35, outDur = 0.25) {
  if (t < start || t > end + outDur) return { on: false, a: 0, s: 0, pin: 0, pout: 0 };
  const pin = prog(t, start, inDur), pout = prog(t, end, outDur);
  const a = clamp(Math.min(pin * 1.6, 1) * (1 - pout));
  const s = (pin < 1 ? E.outBack(pin) : 1) * (1 - 0.12 * pout);
  return { on: a > 0.001, a, s, pin, pout };
}
export function rng(seed = 1) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
/** آخر عنصر في قائمة مرتبة start بدأ قبل t */
export const lastStarted = (arr, t, key = "start") => { let r = null; for (const x of arr) if (x[key] <= t) r = x; return r; };

// ---------- نصوص ----------
export const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
// تسلسل لاتيني/أرقام واحد. ما ينتهي بـ + عشان علامة الربط تبقى بين الكلمتين.
const LTR_RUN = /([A-Za-z0-9][A-Za-z0-9+.,%/:#×\-–_' ]*[A-Za-z0-9%#)]|[A-Za-z0-9])/g;
export function isolateLTR(s) { return esc(s).replace(LTR_RUN, (m) => `<bdi dir="ltr" class="ltr">${m}</bdi>`); }
/** **نص** = أزرق الشعار · !!نص!! = أحمر · ++نص++ = أخضر */
export function rich(s) {
  return String(s ?? "").split(/(\*\*[^*]+\*\*|!![^!]+!!|\+\+[^+]+\+\+)/g).map((part) => {
    if (part.startsWith("**")) return `<span class="hl">${isolateLTR(part.slice(2, -2))}</span>`;
    if (part.startsWith("!!")) return `<span class="bad">${isolateLTR(part.slice(2, -2))}</span>`;
    if (part.startsWith("++")) return `<span class="good">${isolateLTR(part.slice(2, -2))}</span>`;
    return isolateLTR(part);
  }).join("");
}
export const hasLatin = (s) => /[A-Za-z0-9]/.test(s);
export const fmt = (n) => Number(Math.round(n)).toLocaleString("en-US");

// ---------- DOM ----------
export function el(tag, cls, html, parent) {
  const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e); return e;
}
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
async function loadData() {
  if (window.__SCENE_DATA__) return window.__SCENE_DATA__;
  const q = new URLSearchParams(location.search);
  return (await fetch(q.get("data") || "sample.json")).json();
}

// ---------- الترجمة ----------
function setupCaptions(ctx) {
  const lines = ctx.data.captions?.lines || [];
  const box = el("div", "caption", null, ctx.ov); box.dataset.safe = "1"; box.dataset.solo = "caption";
  const cap = el("div", "capsule", null, box);
  const closingWords = ctx.closingLabel.split(" ").map((w) => ({ w, start: 0, end: 0 }));
  let cur = null, spans = [];
  const build = (L) => {
    cap.innerHTML = ""; spans = [];
    const ws = L.words; let group = null;
    const isSym = (s) => /^[+\-–/×&]+$/.test(s.trim());
    ws.forEach((w, k) => {
      const mixed = hasLatin(w.w) && /^[\u0600-\u06FF]/.test(w.w); // مثل "وFortnite": حرف عربي ملتصق بكلمة لاتينية
      const latin = hasLatin(w.w) && !mixed, sym = isSym(w.w);
      const joinable = latin || (sym && group && ws[k + 1] && hasLatin(ws[k + 1].w));
      if (joinable) {
        if (!group) { if (k) cap.appendChild(document.createTextNode(" ")); group = el("bdi", "ltrgroup", null, cap); group.dir = "ltr"; }
        else group.appendChild(document.createTextNode(" "));
        spans.push(el("span", "w ltr", esc(w.w), group));
      } else {
        group = null; if (k) cap.appendChild(document.createTextNode(" "));
        spans.push(el("span", "w", mixed ? isolateLTR(w.w) : esc(w.w), cap));
      }
    });
    // لو السطر أعرض من الكبسولة: صغّر الخط
    cap.style.fontSize = ""; let fs = 48;
    while (cap.scrollWidth > 840 && fs > 34) { fs -= 2; cap.style.fontSize = fs + "px"; }
  };
  return (t) => {
    let L = null;
    if (t >= ctx.closingStart) L = { key: "closing", start: ctx.closingStart, words: closingWords, closing: true };
    else for (let i = 0; i < lines.length; i++) {
      const a = lines[i], next = lines[i + 1];
      const holdEnd = next ? Math.min(next.start, a.end + 0.6) : a.end + 0.6;
      if ((i === 0 && ctx.loopHold ? t >= 0 : t >= a.start - 0.05) && t < holdEnd) { L = a; break; }
    }
    if (L !== cur && !(L && cur && L.key === "closing" && cur.key === "closing")) { cur = L; if (L) build(L); }
    if (!L) { box.style.opacity = 0; return; }
    // مع الحلقة: أول سطر ظاهر كامل من الفريم الأول (الكلمات تتلون مع النطق كالعادة)
    const pin = ctx.loopHold && L === lines[0] ? 1 : prog(t, L.start - 0.05, 0.22);
    box.style.opacity = clamp(pin * 2);
    cap.style.transform = `scale(${0.92 + 0.08 * E.outBack(pin)})`;
    L.words.forEach((w, k) => {
      const now = !L.closing && t >= w.start && t < (L.words[k + 1]?.start ?? w.end + 0.25);
      spans[k].classList.toggle("now", now);
      spans[k].classList.toggle("said", L.closing || t >= w.start);
    });
  };
}

// ---------- منطقة العنوان: حالات تتبدل بالتوقيت ----------
// حالة = {start, chip, chip_color: 'brand'|'problem'|'fix', main, en: bool, size: 'mid', price, price_at, price_unit,
//         desc, desc_at, keys:[...], key_times:[...], keys_ok_at, curtain: bool}
function setupTitleZone(ctx) {
  const z = el("div", "tzone", null, ctx.ov); z.dataset.safe = "1"; z.dataset.solo = "title";
  const curtain = ctx.curtainEl;
  let cur = null, parts = {};
  const build = (s) => {
    z.innerHTML = ""; parts = {};
    if (s.chip) parts.chip = el("div", "chip " + (s.chip_color || ""), rich(s.chip), z);
    if (s.keys) {
      parts.keys = el("div", "keys", null, z);
      parts.caps = s.keys.map((k, i) => { if (i) el("span", "plus", "+", parts.keys); return el("div", "keycap", esc(k), parts.keys); });
    }
    if (s.main) parts.main = el("div", "main" + (s.en ? " en" : "") + (s.size ? " " + s.size : ""), s.en ? esc(s.main) : rich(s.main), z);
    if (s.price != null) parts.price = el("div", "price", `<bdi dir="ltr" class="ltr">${fmt(s.price)}</bdi> ${esc(s.price_unit || "ريال")}`, z);
    if (s.desc) parts.desc = el("div", "desc", rich(s.desc), z);
  };
  return (t) => {
    const s = t < ctx.closingStart ? lastStarted(ctx.titles, t) : null;
    if (s !== cur) { cur = s; if (s) build(s); else z.innerHTML = ""; }
    curtain.style.opacity = ctx.curtain(t);
    if (!s) return;
    const end = s.end ?? 1e9;
    const L = life(t, s.start, end, 0.35, 0.2);
    z.style.opacity = L.a;
    const pop = (e, t0) => { if (!e) return; const p = prog(t, t0, 0.35); e.style.opacity = clamp(p * 2); e.style.transform = `scale(${0.82 + 0.18 * E.outBack(p)})`; };
    pop(parts.chip, s.start); pop(parts.keys, s.start + 0.05);
    if (parts.chip && s.chip_fix_at != null) { // الشارة تقلب أخضر مع ✓ لحظة الحل (نبضة 0.3ث)
      const fixed = t >= s.chip_fix_at; parts.chip.classList.toggle("fix", fixed); parts.chip.classList.toggle("problem", !fixed && s.chip_color === "problem");
      if (fixed !== parts.chip._fixed) { parts.chip._fixed = fixed; parts.chip.innerHTML = rich(s.chip) + (fixed ? ' <bdi class="ltr">✓</bdi>' : ""); }
      if (fixed) { const q = prog(t, s.chip_fix_at, 0.3); parts.chip.style.transform = `scale(${1 + 0.18 * Math.sin(Math.PI * q)})`; } } pop(parts.main, s.start + (s.chip ? 0.08 : 0));
    pop(parts.price, s.price_at ?? s.start + 0.2); pop(parts.desc, s.desc_at ?? s.start + 0.3);
    if (parts.caps) parts.caps.forEach((c, i) => {
      const kt = s.key_times?.[i] ?? (s.start + 0.2 + i * 0.25);
      const ok = s.keys_ok_at != null && t >= s.keys_ok_at;
      c.classList.toggle("on", t >= kt && !ok); c.classList.toggle("ok", ok);
    });
  };
}

// ---------- فحص الجودة ----------
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
  for (const e of [...document.querySelectorAll("[data-safe]")].filter(visible)) {
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
 * cfg = { series, label, closingLabel, grid, header: 'counter'|'dots', build(ctx) → {update(t), curtain?(t)},
 *         handlers: { E01: {setup(ev,ctx), update(ev,t,ctx)} } }
 * كل حدث ممكن يحمل params.title → حالة عنوان تبدأ مع الحدث (أو title.start).
 * العنصر "T" = حالة عنوان فقط: {el:"T", start, params:{chip, main, ...}}
 */
export async function boot(cfg) {
  const data = await loadData();
  const stage = document.getElementById("stage"); if (cfg.grid) stage.classList.add("grid");
  const canvas = document.getElementById("gl");
  const ov = document.getElementById("overlay");
  await Promise.all([
    document.fonts.load('800 60px "Baloo Bhaijaan 2"', "تيربو"), document.fonts.load('700 60px "Baloo Bhaijaan 2"', "تيربو"),
    document.fonts.load('800 40px "Inter"', "RTX 5060"), document.fonts.load('700 40px "Inter"', "RTX 5060"), document.fonts.load('600 40px "Inter"', "RTX"),
  ]);
  await document.fonts.ready;
  const logoIcon = await loadImg("../../brand/logo/icon_transparent.png");
  const logoFull = await loadImg("../../brand/logo/full_transparent.png");

  const renderer = K.createRenderer(canvas);
  const scene = new THREE.Scene();
  const camera = K.isoCamera();
  const H0 = data.header || {};
  const ctx = {
    data, cfg, THREE, K, renderer, scene, camera, stage, ov, W, H, logoIcon, logoFull,
    duration: data.duration, closingStart: data.closing?.start ?? (data.duration - 2.5),
    closingLabel: data.closing?.label || cfg.closingLabel || `تيربو · ${cfg.label}`,
    rand: rng(data.seed ?? 7), variant: data.camera?.variant ?? 0,
    titles: [], counter: { start: H0.counter?.start ?? data.budget ?? 0, events: [] }, dots: { n: H0.dots ?? 5, events: [] },
    curtain: () => 0,
    project(v) { const p = v.clone().project(camera); return { x: (p.x + 1) / 2 * W, y: (1 - p.y) / 2 * H }; },
    addTitle(s) { ctx.titles.push(s); ctx.titles.sort((a, b) => a.start - b.start); },
  };
  ctx.curtainEl = el("div", "curtain", null, ov);

  // الشريط العلوي
  const top = el("header", "topbar", null, ov); top.dataset.safe = "1"; top.dataset.solo = "topbar";
  if (logoIcon) { const i = el("img", "logo", null, top); i.src = logoIcon.src; }
  el("div", "label", rich(H0.label || cfg.label), top);
  const end = el("div", "end", null, top);
  let counterNum = null, dotEls = [];
  if ((H0.mode || cfg.header) === "counter") {
    const c = el("div", "counter", `<span>${esc(H0.counter?.label || "باقي")}</span><bdi dir="ltr" class="num">0</bdi>`, end);
    counterNum = c.querySelector(".num");
  } else {
    const d = el("div", "dots", null, end); d.style.display = "flex"; d.style.gap = "8px";
    for (let i = 0; i < ctx.dots.n; i++) dotEls.push(el("div", "d", String(i + 1), d));
  }

  const sceneApi = await cfg.build(ctx);
  if (sceneApi.curtain) ctx.curtain = sceneApi.curtain;
  // العناصر
  const events = (data.events || []).map((ev, i) => ({ ...ev, _i: i, params: ev.params || {} })).sort((a, b) => a.start - b.start);
  for (const ev of events) {
    if (ev.params.title && typeof ev.params.title === "object") ctx.addTitle({ start: ev.start, ...ev.params.title });
    if (ev.el === "T") { ctx.addTitle({ start: ev.start, end: ev.params.until ?? undefined, ...ev.params }); continue; }
    const h = cfg.handlers[ev.el];
    if (!h) { console.warn("unknown element", ev.el); continue; }
    ev._h = h; h.setup?.(ev, ctx);
  }
  // عنوان الهوك من data.hook (لو موجود): أول حالة عنوان
  if (data.hook?.title || data.hook?.text) ctx.addTitle({ start: 0, ...(data.hook.title || { main: data.hook.text, desc: data.hook.desc }) });
  for (const d of ctx.dots.events) d.t = +d.t;
  ctx.counter.events.sort((a, b) => a.t - b.t);
  const updTitle = setupTitleZone(ctx);
  const updCaption = setupCaptions(ctx);
  if (new URLSearchParams(location.search).get("debug")) {
    for (const [l, t, w, h] of [[0, 0, 1080, 180], [0, 1500, 1080, 420], [960, 800, 120, 800]])
      Object.assign(el("div", "safe-guide", null, ov).style, { left: l + "px", top: t + "px", width: w + "px", height: h + "px" });
  }

  // الحلقة (بطلب صاحب الحساب 2026-11-16): آخر لقطة = أول لقطة، عشان الفيديو يعيد نفسه بدون ما يحس المشاهد.
  // data.loop = {start, dur}: من start يذوب الفريم تدريجياً في صورة الفريم الأول، وآخر فريم = الفريم الأول بالضبط.
  // صورة الفريم الأول يحطها الرندر (render.cjs / snap.cjs) بـ window.__setLoopFrame(dataUrl) بعد ما يصوّر t=0.
  const fpsL = data.fps || 30;
  const loop = data.loop && +data.loop.dur > 0
    ? { start: +(data.loop.start ?? (data.duration - data.loop.dur)), end: data.duration - 1 / fpsL } : null;
  const loopImg = el("img", "loop-frame", null, stage);
  Object.assign(loopImg.style, { position: "absolute", inset: "0", width: "1080px", height: "1920px", zIndex: "999",
    pointerEvents: "none", opacity: "0", display: "none" });
  // الفريم الأول لازم يكون لقطة مكتملة (هو آخر لقطة بعد): تركيب المشهد (البنطّات) والعنوان يتثبتون على حالتهم
  // عند loop.hold ثانية خلال [0, hold]، والصوت والترجمة والعناصر تمشي على الوقت الحقيقي. hold من القالب (cfg.loopHold).
  if (loop) loop.hold = +(data.loop.hold ?? cfg.loopHold ?? 1.0);
  ctx.loopHold = loop ? loop.hold : 0;
  window.__loop = loop;
  window.__setLoopFrame = (src) => new Promise((res) => { loopImg.onload = () => res(true); loopImg.onerror = () => res(false); loopImg.src = src; });
  const loopAlpha = (t) => {
    if (!loop || !loopImg.src || t < loop.start) return 0;
    const u = Math.min(1, Math.max(0, (t - loop.start) / Math.max(1 / fpsL, loop.end - loop.start)));
    return u * u * (3 - 2 * u);
  };

  window.renderFrame = (t) => {
    const la = loopAlpha(t);
    loopImg.style.display = la > 0 ? "block" : "none"; loopImg.style.opacity = la >= 0.999 ? "1" : String(la);
    if (counterNum) {
      let v = ctx.counter.start;
      for (const c of ctx.counter.events) v += c.delta * E.inOutCubic(prog(t, c.t, 0.6));
      counterNum.textContent = fmt(v);
    }
    if (dotEls.length) dotEls.forEach((d, i) => {
      const s = lastStarted(ctx.dots.events.filter((e) => e.i === i), t, "t");
      d.className = "d" + (s ? " " + s.state : "");
    });
    const vt = loop && t < loop.hold ? loop.hold : t; // وقت التركيب البصري (ثابت لين hold)
    sceneApi.update?.(vt);
    for (const ev of events) ev._h?.update?.(ev, t, ctx);
    updTitle(vt);
    updCaption(t);
    renderer.render(scene, camera);
    return true;
  };
  window.__qa = qa;
  window.__meta = { series: cfg.series, duration: data.duration, events: events.length, logo: !!logoIcon, logoFull: !!logoFull };
  const q = new URLSearchParams(location.search);
  if (q.get("t")) window.renderFrame(parseFloat(q.get("t")));
  window.__ready = true;
}
