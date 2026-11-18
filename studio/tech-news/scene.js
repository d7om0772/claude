// =============================================================================
// tech-news — قالب سلسلة الأخبار حسب حزمة 16_quick_explainer ("الشرح السريع: 3 عوالم وكابشن علوي").
// رسومات 2D (HTML/SVG)، 3 عوالم: هوية فاتحة (E01/E02/E11–E14) · جسر أزرق (E04) · أمثلة خشب (E05–E08) · شرح غامق (E09/E10).
// كل عنصر = لقطة (event) بتوقيت كلمته. الكابشن العلوي (E16) طول الفيديو ما عدا الكروت النصية. الحلقة (E15) من data.loop.
// الحالة دالة نقية في t: window.renderFrame(t). طريقة الاستدعاء: ELEMENTS.md.
// =============================================================================
import { clamp, prog, E, esc, isolateLTR, el, qa } from "../common/core.js";
import { C, icon, hero } from "./icons.js";

const FPS = 30;
const TEXT_CARDS = new Set(["E01", "E04", "E13", "E14"]);
const WORLD = { E01: "identity", E02: "identity", E04: "bridge", E05: "examples", E06: "examples", E07: "examples", E08: "examples",
  E09: "explain", E10: "explain", E11: "identity", E12: "identity", E13: "identity", E14: "identity", X01: "identity" };
const GROUP = { E05: "shelf", E06: "shelf", E07: "shelf", E08: "shelf", E09: "hub", E10: "hub" };

// ---------- أدوات ----------
/** **نص** = لون الأكسنت (الكلمة المفتاحية/الرقم). اللاتيني والأرقام معزولة LTR. */
const acc = (s) => String(s ?? "").split(/(\*\*[^*]+\*\*)/g)
  .map((p) => (p.startsWith("**") ? `<span class="acc">${isolateLTR(p.slice(2, -2))}</span>` : isolateLTR(p))).join("");
/** pop مع ارتداد: 0 → 1.1 → 1 خلال 300ms */
function pop(t, at, dur = 0.3) {
  const p = prog(t, at, dur); if (p <= 0) return { a: 0, s: 0.001 };
  const s = p < 0.6 ? 1.1 * E.outCubic(p / 0.6) : 1.1 - 0.1 * E.outCubic((p - 0.6) / 0.4);
  return { a: clamp(p * 3), s: Math.max(0.001, s) };
}
const bounce = (t, at) => { const p = prog(t, at, 0.24); return p > 0 && p < 1 ? 1 + 0.13 * Math.sin(Math.PI * p) : 1; };
const setPop = (e, t, at, extra = "") => { const q = pop(t, at); e.style.opacity = q.a; e.style.transform = `${extra} scale(${q.s})`; return q; };
const tokens = (s) => String(s ?? "").replace(/\*\*/g, "").split(/\s+/).filter(Boolean);
/** يلف كل كلمة بـ span.wd (مع الحفاظ على **أكسنت**) */
function wordsHTML(s) {
  const out = [];
  for (const part of String(s ?? "").split(/(\*\*[^*]+\*\*)/g)) {
    if (!part) continue;
    const isAcc = part.startsWith("**"), txt = isAcc ? part.slice(2, -2) : part;
    for (const w of txt.split(/\s+/).filter(Boolean)) out.push(`<span class="wd${isAcc ? " acc" : ""}">${isolateLTR(w)}</span>`);
  }
  return out.join(" ");
}
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function rng(seed = 7) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PIN = `<svg viewBox="0 0 74 96"><path d="M37 94C37 94 6 56 6 34a31 31 0 0 1 62 0c0 22-31 60-31 60z" fill="${C.brand}"/><circle cx="37" cy="34" r="12" fill="#fff"/></svg>`;

async function loadData() {
  if (window.__SCENE_DATA__) return window.__SCENE_DATA__;
  const q = new URLSearchParams(location.search);
  return (await fetch(q.get("data") || "sample.json")).json();
}

// ============================================================================
async function main() {
  const data = await loadData();
  const stage = document.getElementById("stage");
  await Promise.all([document.fonts.load('800 60px "Baloo Bhaijaan 2"', "تيربو"), document.fonts.load('700 60px "Baloo Bhaijaan 2"', "تيربو"),
    document.fonts.load('800 40px "Inter"', "RTX 5060"), document.fonts.load('700 40px "Inter"', "RTX")]);
  await document.fonts.ready;
  const logoFull = await loadImg("../../brand/logo/full_transparent.png");
  const D = data.duration || 34;
  const words = (data.captions?.lines || []).flatMap((L) => L.words || []);
  /** أوقات الكلمات المنطوقة من بداية الحدث (لتنطيط كلمات الكروت) */
  const wordTimesFrom = (start, n) => words.filter((w) => w.start >= start - 0.08).slice(0, n).map((w) => w.start);

  // العوالم
  const worlds = {};
  for (const k of ["identity", "bridge", "explain", "examples"]) worlds[k] = el("div", `world ${k}`, null, stage);
  const layer = el("div", "abs", null, stage); Object.assign(layer.style, { inset: "0" });

  const events = (data.events || []).map((ev, i) => ({ ...ev, _i: i, params: ev.params || {} })).sort((a, b) => a.start - b.start);
  const shots = events.filter((e) => e.el !== "E03");
  const flashes = events.filter((e) => e.el === "E03").map((e) => e.start);
  const ctx = { data, D, words, wordTimesFrom, stage, layer, logoFull, shared: {}, events, shots };

  // ---------- عالم الأمثلة المشترك (الرف + الكاميرا) ----------
  const shelfEvs = shots.filter((e) => GROUP[e.el] === "shelf");
  if (shelfEvs.length) ctx.shelf = buildShelf(ctx, shelfEvs);
  const hubEv = shots.find((e) => e.el === "E09");
  if (hubEv) ctx.hub = buildHub(ctx, hubEv);

  for (const ev of shots) {
    ev._root = el("div", "shot", null, layer);
    ev._h = H[ev.el] || H.X01;
    ev._h.setup?.(ev, ctx);
  }
  // ---------- الكابشن العلوي ----------
  const updCap = setupTopCaption(ctx);
  // ---------- الحبيبات ----------
  const grain = el("div", "grain", null, stage);
  { const cv = document.createElement("canvas"); cv.width = cv.height = 192; const g = cv.getContext("2d"); const im = g.createImageData(192, 192); const r = rng(11);
    for (let i = 0; i < im.data.length; i += 4) { const v = 90 + r() * 165; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); grain.style.backgroundImage = `url(${cv.toDataURL()})`; }
  // ---------- الحلقة (آخر لقطة = أول لقطة) ----------
  const loop = data.loop && +data.loop.dur > 0 ? { start: +(data.loop.start ?? (D - data.loop.dur)), end: D - 1 / FPS } : null;
  const loopImg = el("img", "loop-frame", null, stage);
  Object.assign(loopImg.style, { position: "absolute", inset: "0", width: "1080px", height: "1920px", zIndex: "999", pointerEvents: "none", opacity: "0", display: "none" });
  window.__loop = loop;
  window.__setLoopFrame = (src) => new Promise((res) => { loopImg.onload = () => res(true); loopImg.onerror = () => res(false); loopImg.src = src; });
  if (new URLSearchParams(location.search).get("debug"))
    for (const [l, t, w, h] of [[0, 0, 1080, 180], [0, 1500, 1080, 420], [960, 800, 120, 800]])
      Object.assign(el("div", "abs", null, stage).style, { left: l + "px", top: t + "px", width: w + "px", height: h + "px", background: "rgba(255,0,0,.15)", zIndex: 998 });

  window.renderFrame = (t) => {
    let cur = shots[0]; for (const s of shots) if (s.start <= t) cur = s;
    const world = WORLD[cur?.el] || "identity";
    for (const k in worlds) worlds[k].style.display = k === world ? "block" : "none";
    for (const s of shots) {
      const on = s === cur;
      s._root.style.display = on ? "block" : "none";
      if (on) {
        const span = Math.max(0.5, (shots[shots.indexOf(s) + 1]?.start ?? D) - s.start);
        if (!GROUP[s.el]) s._root.style.transform = `scale(${1 + 0.06 * prog(t, s.start, span)})`; // push-in مستمر
        s._h.update?.(s, t, ctx);
      }
    }
    if (ctx.shelf) ctx.shelf.update(t, GROUP[cur?.el] === "shelf");
    if (ctx.hub) ctx.hub.update(t, GROUP[cur?.el] === "hub", cur);
    updCap(t, cur);
    // الوميض المعكوس (E03): مرتين × فريمين
    const inv = flashes.some((f) => (t >= f && t < f + 2 / FPS) || (t >= f + 4 / FPS && t < f + 6 / FPS));
    stage.style.filter = inv ? "invert(1)" : "none";
    const fr = Math.round(t * FPS); grain.style.backgroundPosition = `${(fr * 37) % 192}px ${(fr * 53) % 192}px`;
    grain.style.mixBlendMode = world === "explain" || world === "bridge" ? "overlay" : "multiply";
    let la = 0;
    if (loop && loopImg.src && t >= loop.start) { const u = clamp((t - loop.start) / Math.max(1 / FPS, loop.end - loop.start)); la = u * u * (3 - 2 * u); }
    loopImg.style.display = la > 0 ? "block" : "none"; loopImg.style.opacity = la >= 0.999 ? "1" : String(la);
    return true;
  };
  window.__qa = qa;
  window.__meta = { series: "tech-news", duration: D, events: events.length, logoFull: !!logoFull };
  const q = new URLSearchParams(location.search);
  if (q.get("t")) window.renderFrame(parseFloat(q.get("t")));
  window.__ready = true;
}

// ============================================================================
// الكابشن العلوي (E16): كبسولة يمين، سطر واحد 1–5 كلمات، كلمة كلمة، الحجم حسب عدد الكلمات
function setupTopCaption(ctx) {
  const box = el("div", "tcap", null, ctx.stage); box.dataset.safe = "1"; box.dataset.solo = "caption";
  const keys = new Set((ctx.data.keywords || []).map((k) => String(k)));
  const segs = [];
  const maxW = ctx.data.caption_max_words || 4;
  // المقطع ما يعبر حد لقطة، وكلمات الكروت النصية (الهوك، الجسر، الـ CTA، الختام) ما تدخل الكابشن
  const shotOf = (w) => { let c = ctx.shots[0]; for (const s of ctx.shots) if (s.start <= w.start + 0.02) c = s; return c; };
  for (const L of ctx.data.captions?.lines || []) {
    const runs = []; let cur = null, curShot = null;
    for (const w of L.words || []) {
      const sh = shotOf(w); if (sh && TEXT_CARDS.has(sh.el)) { cur = null; curShot = null; continue; }
      if (!cur || sh !== curShot) { cur = []; runs.push(cur); curShot = sh; }
      cur.push(w);
    }
    for (const ws of runs) { const n = Math.ceil(ws.length / maxW) || 0;
      for (let i = 0; i < n; i++) { const part = ws.slice(Math.round((i * ws.length) / n), Math.round(((i + 1) * ws.length) / n)); if (part.length) segs.push(part); } }
  }
  const SIZE = [0, 92, 92, 84, 76, 70, 66];
  let curSeg = null, spans = [], groups = [];
  return (t, shot) => {
    if (!shot || TEXT_CARDS.has(shot.el) || t >= ctx.D - 0.02) { box.style.display = "none"; return; }
    let seg = null;
    for (let i = 0; i < segs.length; i++) { const s = segs[i], nx = segs[i + 1];
      const end = nx ? Math.min(nx[0].start - 0.02, s[s.length - 1].end + 0.7) : s[s.length - 1].end + 0.7;
      if (t >= s[0].start - 0.03 && t < end) { seg = s; break; } }
    if (!seg) { box.style.display = "none"; return; }
    if (seg !== curSeg) {
      curSeg = seg; box.innerHTML = ""; spans = [];
      box.style.fontSize = (SIZE[Math.min(6, seg.length)] || 66) + "px";
      // الكلمات اللاتينية/الأرقام المتتالية (RTX 50) في عنصر واحد LTR عشان ما ينقلب ترتيبها
      const LAT = /^[A-Za-z0-9][A-Za-z0-9.+\-:%/×]*$/;
      groups = [];
      for (const w of seg) {
        const lat = LAT.test(w.w), last = groups[groups.length - 1];
        if (lat && last && last.lat) { last.ws.push(w); continue; }
        groups.push({ lat, ws: [w] });
      }
      for (const g of groups) {
        const txt = g.ws.map((w) => w.w).join(" ");
        const isAcc = /[0-9٠-٩]/.test(txt) || g.ws.some((w) => keys.has(w.w.replace(/[.,،؟?!]/g, "")));
        spans.push(el("span", "cw" + (isAcc ? " acc" : ""), g.lat ? `<bdi dir="ltr" class="ltr">${esc(txt)}</bdi>` : isolateLTR(txt), box));
      }
      // لو أعرض من 78٪: صغّر
      let fs = parseFloat(box.style.fontSize); box.style.display = "block"; spans.forEach((s) => (s.style.display = "inline-block"));
      while (box.scrollWidth > 842 && fs > 50) { fs -= 4; box.style.fontSize = fs + "px"; }
    }
    box.style.display = "block";
    groups.forEach((g, k) => {
      const w = g.ws[0]; const s = spans[k]; const p = prog(t, w.start - 0.02, 0.15);
      if (t < w.start - 0.02) { s.style.display = "none"; return; }
      s.style.display = "inline-block"; s.style.opacity = p; s.style.transform = `translateY(${(0.3 * (1 - E.outCubic(p))).toFixed(3)}em)`;
    });
  };
}

// ============================================================================
// عالم الأمثلة: رف خشب بثلاث أماكن، وكاميرا تتنقل (نظرة عامة ← تكبير ← جانبي ← سريع مغبّش)
const SLOT_X = (i) => 540 + i * 1100, BOX_TOP = 560, SHELF_Y = 900, FOCUS_Y = 700;
function buildShelf(ctx, evs) {
  const ov = evs.find((e) => e.el === "E05");
  const slots = ov?.params.slots || [0, 1, 2].map((i) => ({ label: evs.filter((e) => e.el === "E06")[i]?.params.name || "", icon: "chip" }));
  const root = el("div", "abs", null, ctx.layer); Object.assign(root.style, { inset: "0", display: "none" });
  const world = el("div", "shelfworld", null, root);
  const n = slots.length;
  const plankTop = el("div", "plank-top", null, world), plank = el("div", "plank", null, world);
  Object.assign(plankTop.style, { left: "-1400px", width: `${SLOT_X(n - 1) + 2800}px`, top: `${SHELF_Y - 16}px` });
  Object.assign(plank.style, { left: "-1400px", width: `${SLOT_X(n - 1) + 2800}px`, top: `${SHELF_Y}px` });
  const boxes = slots.map((s, i) => {
    const kind = s.unknown ? "unknown" : (s.light ? "light" : "dark");
    const b = el("div", `pbox ${kind}`, null, world);
    b.innerHTML = s.unknown ? `<div class="front"><div class="q">؟</div><div class="plabel">${esc(s.label || "")}</div></div>`
      : `<div class="top"></div><div class="side"></div><div class="front">${icon(s.icon || "chip", kind === "dark" ? "#1A4590" : C.brand)}<div class="plabel">${esc(s.label || "")}</div></div>`;
    Object.assign(b.style, { left: `${SLOT_X(i) - 200}px`, top: `${BOX_TOP}px`, transformOrigin: "50% 100%" });
    return b;
  });
  const plate = ov?.params.plate ? el("div", "plate", isolateLTR(ov.params.plate), root) : null;
  if (plate) plate.dataset.safe = "1";
  // الكاميرا: مفاتيح من E05 (نظرة عامة) و E06/E07 (مكان)
  const OVER = { x: SLOT_X((n - 1) / 2), z: 0.3 };
  const keys = [];
  for (const e of evs) {
    if (e.el === "E05") keys.push({ t: e.start, cam: OVER, dur: 0.01, type: "cut" });
    if (e.el === "E06" || e.el === "E07") {
      const type = e.params.enter || (keys.length <= 1 ? "zoom" : "pan");
      const dur = type === "whip" ? 0.42 : type === "pan" ? 0.55 : type === "cut" ? 0.01 : 0.6;
      keys.push({ t: e.start, cam: { x: SLOT_X(e.params.slot ?? 0), z: 1 }, dur, type });
    }
  }
  const camAt = (t) => {
    if (!keys.length) return { x: OVER.x, z: OVER.z, blur: 0 };
    let k = 0; while (k + 1 < keys.length && keys[k + 1].t <= t) k++;
    const K = keys[k], P = k > 0 ? keys[k - 1].cam : K.cam;
    if (t < K.t) return { ...K.cam, blur: 0 };
    const p = prog(t, K.t, K.dur), e = E.inOutCubic(p);
    // التكبير في المقياس اللوغاريتمي عشان الحركة تحس طبيعية
    const z = Math.exp(Math.log(P.z) + (Math.log(K.cam.z) - Math.log(P.z)) * e);
    const blur = K.type === "whip" ? 26 * Math.sin(Math.PI * p) : K.type === "pan" ? 8 * Math.sin(Math.PI * p) : 0;
    return { x: P.x + (K.cam.x - P.x) * e, z, blur };
  };
  return {
    update(t, on) {
      root.style.display = on ? "block" : "none"; if (!on) return;
      const c = camAt(t);
      world.style.transform = `translate(${540 - c.x * c.z}px, ${FOCUS_Y - FOCUS_Y * c.z}px) scale(${c.z})`;
      world.style.filter = c.blur > 0.3 ? `blur(${c.blur.toFixed(1)}px)` : "none";
      slots.forEach((s, i) => {
        const at = s.at ?? ((ov?.start ?? 0) + 0.25 + i * 0.3);
        const q = pop(t, at); const pulse = s.unknown ? 1 + 0.035 * Math.sin((t - at) * 6) : 1;
        boxes[i].style.opacity = q.a; boxes[i].style.transform = `scale(${q.s * pulse})`;
      });
      if (plate) { const showP = c.z < 0.6; const q = pop(t, (ov?.start ?? 0) + 0.15); plate.style.opacity = showP ? q.a : 0; plate.style.transform = `translateX(-50%) scale(${q.s})`; }
    },
  };
}

// عالم الشرح: عقدة مركزية + خانات منقطة + خطوط مضيئة + عوامل (E09)، والتكبير (E10) يعتّمه
function buildHub(ctx, ev) {
  const p = ev.params; const fs = (p.factors || []).slice(0, 3); const n = Math.max(2, fs.length);
  const root = el("div", "hub on-dark", null, ctx.layer); root.style.display = "none";
  const node = el("div", "node", `<div class="nt">${acc(p.center || "السبب")}</div>${p.sub ? `<div class="ns">${acc(p.sub)}</div>` : ""}`, root);
  Object.assign(node.style, { left: "290px", width: "500px", top: "520px", padding: "18px 20px" }); node.dataset.safe = "1";
  const pos = n === 2 ? [750, 330] : [830, 540, 250];   // يمين ← يسار (ترتيب القراءة)
  const SY = n === 2 ? 900 : 940, SW = n === 2 ? 340 : 250, SH = 210;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("class", "links"); root.insertBefore(svg, node);
  const items = fs.map((f, i) => {
    const x = pos[i]; const d = `M540 ${700} C540 ${(700 + SY) / 2}, ${x} ${(700 + SY) / 2 - 20}, ${x} ${SY}`;
    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.innerHTML = `<path d="${d}" stroke="#ffb547" stroke-width="10" fill="none" opacity=".55" style="filter:blur(9px)"/><path d="${d}" stroke="${C.glow}" stroke-width="5" fill="none" stroke-linecap="round"/>`;
    svg.appendChild(g);
    const paths = [...g.querySelectorAll("path")]; const L = paths[1].getTotalLength ? 600 : 600;
    paths.forEach((pp) => { pp.style.strokeDasharray = L; pp.style.strokeDashoffset = L; });
    const slot = el("div", "fslot", null, root); Object.assign(slot.style, { left: `${x - SW / 2}px`, top: `${SY}px`, width: `${SW}px`, height: `${SH}px` });
    const card = el("div", "fcard", `${icon(f.icon || "chip")}<div>${acc(f.text || "")}</div>`, root);
    Object.assign(card.style, { left: `${x - SW / 2}px`, top: `${SY}px`, width: `${SW}px`, height: `${SH}px` }); card.dataset.safe = "1";
    return { f, paths, L, slot, card };
  });
  const slotsAt = p.slots_at ?? (ev.start + 0.6);
  return {
    update(t, on, cur) {
      root.style.display = on ? "block" : "none"; if (!on) return;
      setPop(node, t, ev.start);
      items.forEach((it, i) => {
        const at = it.f.at ?? (slotsAt + 0.5 + i * 0.6);
        const s = pop(t, slotsAt + i * 0.08); it.slot.style.opacity = s.a * (t >= at ? 0 : 1); it.slot.style.transform = `scale(${s.s})`;
        const dp = E.outCubic(prog(t, at - 0.25, 0.22)); it.paths.forEach((pp) => (pp.style.strokeDashoffset = it.L * (1 - dp)));
        setPop(it.card, t, at);
      });
      // التكبير (E10): المخطط يعتم ويتغبّش، والكاميرا تقرّب على العامل
      if (cur && cur.el === "E10") {
        const z = E.outCubic(prog(t, cur.start, 0.3)); const fi = cur.params.focus ?? 0; const fx = pos[fi] ?? 540;
        root.style.opacity = 1 - 0.75 * z; root.style.filter = `blur(${(7 * z).toFixed(1)}px)`;
        root.style.transform = `translate(${(540 - fx) * 0.15 * z}px, ${-60 * z}px) scale(${1 + 0.15 * z})`;
      } else { root.style.opacity = 1; root.style.filter = "none"; root.style.transform = `scale(${1 + 0.05 * prog(t, ev.start, 6)})`; }
    },
  };
}

// ============================================================================
// العناصر
const H = {
  // E01 كرت الهوك — كامل من أول فريم، وكل كلمة تنط مع نطقها
  E01: {
    setup(ev, ctx) {
      const p = ev.params; const card = el("div", "tcard", null, ev._root); card.dataset.safe = "1"; card.dataset.solo = "card";
      card.innerHTML = `${p.text ? `<div class="l1">${wordsHTML(p.text)}</div>` : ""}${p.big ? `<div class="big">${wordsHTML(p.big)}</div><div class="uline"></div>` : ""}`;
      card.style.top = `${p.y ?? 700}px`;
      ev._wds = [...card.querySelectorAll(".wd")]; ev._u = card.querySelector(".uline");
      ev._wt = p.word_times || ctx.wordTimesFrom(ev.start, ev._wds.length);
      ev._bigAt = p.big_at ?? ev._wt[ev._wds.length - 1] ?? ev.start + 0.6;
    },
    update(ev, t) {
      ev._wds.forEach((w, i) => { w.style.transform = `scale(${bounce(t, ev._wt[i] ?? 99)})`; });
      if (ev._u) ev._u.style.width = `${Math.round(360 * E.outCubic(prog(t, ev._bigAt + 0.1, 0.3)))}px`;
    },
  },
  // E02 العنصر البطل + ختم الجواب
  E02: {
    setup(ev, ctx) {
      const p = ev.params;
      ev._glow = el("div", "hero-glow", null, ev._root); Object.assign(ev._glow.style, { left: "140px", top: "330px", width: "800px", height: "640px", opacity: 0 });
      ev._hero = el("div", "hero", hero(p.hero || ctx.data.hero || "gpu"), ev._root); Object.assign(ev._hero.style, { top: "420px", height: "460px" });
      if (p.tag) { ev._tag = el("div", "tagchip", isolateLTR(p.tag), ev._root); Object.assign(ev._tag.style, { left: "760px", top: "430px" }); }
      if (p.stamp) { ev._stamp = el("div", "stamp", acc(p.stamp), ev._root); ev._stamp.style.top = "930px"; ev._stamp.dataset.safe = "1"; ev._stamp.dataset.solo = "stamp"; }
      if (p.sub) { ev._sub = el("div", "subline", acc(p.sub), ev._root); ev._sub.style.top = "1100px"; ev._sub.dataset.safe = "1"; }
    },
    update(ev, t) {
      const p = ev.params; const k = prog(t, ev.start, 0.35), e = E.outCubic(k);
      ev._hero.style.transform = `scale(${1.75 - 0.75 * e})`; ev._hero.style.filter = k < 1 ? `blur(${(18 * (1 - e)).toFixed(1)}px)` : "none";
      ev._hero.style.opacity = clamp(k * 4);
      const sAt = p.stamp_at ?? ev.start + 0.9;
      ev._glow.style.opacity = 0.9 * E.outCubic(prog(t, sAt, 0.2));
      if (ev._stamp) setPop(ev._stamp, t, sAt, "translateX(-50%) rotate(-4deg)");
      if (ev._sub) setPop(ev._sub, t, p.sub_at ?? sAt + 0.45, "translateX(-50%)");
      if (ev._tag) setPop(ev._tag, t, p.tag_at ?? ev.start + 0.5);
    },
  },
  // E04 كرت الجسر — أزرق كامل، كلمة كلمة، والرقم بالأكسنت
  E04: {
    setup(ev, ctx) {
      const p = ev.params; const card = el("div", "tcard bridge-card", null, ev._root); card.dataset.safe = "1"; card.dataset.solo = "card";
      card.innerHTML = `${p.text ? `<div class="l1">${wordsHTML(p.text)}</div>` : ""}${p.big ? `<div class="big">${wordsHTML(p.big)}</div>` : ""}`;
      card.style.top = `${p.y ?? 720}px`;
      ev._wds = [...card.querySelectorAll(".wd")]; ev._wt = p.word_times || ctx.wordTimesFrom(ev.start, ev._wds.length);
    },
    update(ev, t) { ev._wds.forEach((w, i) => setPop(w, t, (ev._wt[i] ?? ev.start + 0.2 * i) - 0.03)); },
  },
  // E05 الرف (نظرة عامة) · E06 كرت المثال · E07 انتقال كاميرا فقط · E08 تفاصيل حية
  E05: { setup() {}, update() {} },
  E06: {
    setup(ev, ctx) {
      const p = ev.params;
      if (p.name) { ev._name = el("div", "exname", acc(p.name), ev._root); ev._name.dataset.safe = "1"; ev._name.dataset.solo = "exname"; }
      ev._badges = el("div", "badges", null, ev._root); ev._badges.dataset.safe = "1"; ev._badges.dataset.solo = "badges";
      ev._b = (p.badges || []).map((b) => el("div", "badge", `${icon(b.icon || "check")}<span>${acc(b.text || "")}</span>`, ev._badges));
      ev._pin = el("div", "pin", PIN, ev._root); Object.assign(ev._pin.style, { left: "503px", top: "380px" });
      H.E08.setup(ev, ctx);
    },
    update(ev, t) {
      const p = ev.params; const arrive = ev.start + (p.enter === "whip" ? 0.42 : p.enter === "pan" ? 0.55 : 0.6);
      const dp = prog(t, arrive - 0.05, 0.32); ev._pin.style.opacity = dp > 0 ? 1 : 0;
      ev._pin.style.transform = `translateY(${(-220 * (1 - E.outBounce(dp))).toFixed(1)}px)`;
      if (ev._name) setPop(ev._name, t, p.name_at ?? arrive, "translateX(-50%)");
      ev._b.forEach((b, i) => { const at = p.badges[i].at ?? arrive + 0.5 + 0.5 * i; setPop(b, t, at); b.style.display = t >= at - 0.01 ? "inline-flex" : "none"; });
      H.E08.update(ev, t);
    },
  },
  E07: { setup() {}, update() {} },
  E08: {
    setup(ev) {
      const d = ev.el === "E08" ? ev.params : ev.params.details; if (!d) return;
      ev._papers = (d.papers === false ? [] : [0, 1, 2]).map(() => el("div", "paper", "؟", ev._root));
      if (d.calendar) { ev._cal = el("div", "cal", `<div class="bar"></div>`, ev._root); Object.assign(ev._cal.style, { left: "720px", top: "760px" });
        ev._yrs = d.calendar.map((y) => el("div", "yr", isolateLTR(y), ev._cal)); }
    },
    update(ev, t) {
      const d = ev.el === "E08" ? ev.params : ev.params.details; if (!d) return;
      const pa = d.papers_at ?? ev.start + 0.8;
      (ev._papers || []).forEach((pp, i) => {
        const p = E.outCubic(prog(t, pa + i * 0.12, 0.6)); const tx = [-300, 300, -250][i], ty = [-260, -200, 120][i], rot = [-18, 14, -8][i];
        pp.style.opacity = p > 0 ? 1 : 0;
        pp.style.left = `${488 + tx * p}px`; pp.style.top = `${640 + ty * p - 140 * Math.sin(Math.PI * p)}px`;
        pp.style.transform = `rotate(${rot * p + 4 * Math.sin((t - pa) * 2 + i)}deg) scale(${0.5 + 0.5 * p})`;
      });
      if (ev._cal) {
        const ts = d.cal_times || d.calendar.map((_, i) => ev.start + 1 + i * 0.7);
        const q = pop(t, (ts[0] ?? ev.start + 1) - 0.25); ev._cal.style.opacity = q.a; ev._cal.style.transform = `scale(${q.s})`;
        ev._yrs.forEach((y, i) => {
          const tin = i === 0 ? -1 : ts[i], tout = ts[i + 1] ?? 1e9;
          const pin = i === 0 ? 1 : prog(t, tin, 0.22), pout = prog(t, tout, 0.22);
          y.style.opacity = pin > 0 && pout < 1 ? 1 : 0;
          y.style.transform = `rotateX(${(-90 * (1 - pin) + 90 * pout).toFixed(1)}deg)`;
          y.style.color = i === d.calendar.length - 1 && /؟|\?/.test(d.calendar[i]) ? C.brand : (/\+/.test(d.calendar[i]) ? C.accent : C.ink);
        });
      }
    },
  },
  // E09 المخطط — يُبنى في buildHub
  E09: { setup() {}, update() {} },
  // E10 لوحة التكبير فوق المخطط المعتّم: flow (من ← إلى) أو bars أو value
  E10: {
    setup(ev) {
      const p = ev.params; const panel = el("div", "panel", null, ev._root); panel.dataset.solo = "panel"; ev._panel = panel;
      const mode = p.mode || (p.bars ? "bars" : "flow");
      if (mode === "bars") {
        const bars = el("div", "bars", null, panel); const mx = Math.max(...p.bars.map((b) => +b.value || 0), 1);
        ev._bars = p.bars.map((b, i) => { const e = el("div", "b", `<div class="bl">${acc(b.label || "")}</div><div class="bv">${isolateLTR(b.text ?? String(b.value))}</div>`, bars);
          e.style.background = b.accent ? C.accent : C.brand; e._h = 300 * (+b.value || 0) / mx; return e; });
      } else {
        const from = p.from || { icon: "ram", label: "" }, to = p.to || { icon: "server", label: "" };
        const a = el("div", "pi", `${icon(from.icon)}<div>${acc(from.label || "")}</div>`, panel); Object.assign(a.style, { right: "70px", top: "120px" });
        const b = el("div", "pi", `${icon(to.icon)}<div>${acc(to.label || "")}</div>`, panel); Object.assign(b.style, { left: "70px", top: "120px" });
        const ar = el("div", "abs", icon("arrow", C.accent), panel); Object.assign(ar.style, { left: "390px", top: "190px", width: "120px", height: "120px", transform: "scaleX(-1)" });
        ev._chips = [0, 1, 2].map(() => { const c = el("div", "chipmini", icon(from.icon), panel); return c; });
        ev._a = a; ev._bb = b; ev._ar = ar;
      }
    },
    update(ev, t) {
      const st = ev.start + 0.15; setPop(ev._panel, t, st);
      if (ev._bars) ev._bars.forEach((b, i) => { const p = E.outCubic(prog(t, st + 0.35 + i * 0.3, 0.6)); b.style.height = `${(b._h * p).toFixed(1)}px`; b.style.opacity = p > 0 ? 1 : 0; });
      if (ev._chips) {
        setPop(ev._a, t, st + 0.2); setPop(ev._bb, t, st + 0.45); ev._ar.style.opacity = E.outCubic(prog(t, st + 0.55, 0.3));
        ev._chips.forEach((c, i) => {
          const ph = ((t - st - 0.7) / 1.3 + i / 3) % 1; const on = t > st + 0.7;
          const x = 640 - 540 * ph, y = 240 - 150 * Math.sin(Math.PI * ph);
          c.style.opacity = on ? Math.min(1, Math.sin(Math.PI * ph) * 3) : 0; c.style.left = `${x}px`; c.style.top = `${y}px`;
        });
      }
    },
  },
  // E11 وش يعني لك — العنصر البطل + أيقونة + الاسم + شارة
  E11: {
    setup(ev, ctx) {
      const p = ev.params;
      ev._hero = el("div", "hero", hero(p.hero || ctx.data.hero || "gpu"), ev._root); Object.assign(ev._hero.style, { top: "470px", height: "400px" });
      ev._ic = el("div", "abs", `<div style="width:96px;height:96px;background:#fff;border-radius:50%;box-shadow:0 6px 16px rgba(20,40,75,.18);display:flex;align-items:center;justify-content:center"><div style="width:62px;height:62px">${icon(p.corner_icon || "clock")}</div></div>`, ev._root);
      Object.assign(ev._ic.style, { left: "790px", top: "460px" });
      if (p.name) { ev._name = el("div", "exname", acc(p.name), ev._root); ev._name.dataset.safe = "1"; }
      ev._badges = el("div", "badges", null, ev._root); ev._badges.dataset.safe = "1";
      ev._b = (p.badges || (p.badge ? [{ icon: p.badge_icon || "check", text: p.badge, at: p.badge_at }] : [])).map((b) => { const e = el("div", "badge", `${icon(b.icon || "check")}<span>${acc(b.text)}</span>`, ev._badges); e._at = b.at; return e; });
    },
    update(ev, t) {
      const p = ev.params; setPop(ev._hero, t, ev.start);
      const ib = pop(t, ev.start + 0.35); ev._ic.style.opacity = ib.a; ev._ic.style.transform = `scale(${ib.s}) translateY(${(-8 * Math.abs(Math.sin((t - ev.start) * 4))).toFixed(1)}px)`;
      if (ev._name) setPop(ev._name, t, p.name_at ?? ev.start + 0.3, "translateX(-50%)");
      ev._b.forEach((b, i) => { const at = b._at ?? ev.start + 0.8 + 0.4 * i; setPop(b, t, at); b.style.display = t >= at - 0.01 ? "inline-flex" : "none"; });
    },
  },
  // E12 الساعة الرملية — انتظار أو مدة غير معروفة
  E12: {
    setup(ev) {
      const p = ev.params;
      ev._hg = el("div", "abs", `<svg viewBox="0 0 300 440" style="width:100%;height:100%;overflow:visible">
        <defs><clipPath id="hgTop"><path d="M60 40 L240 40 C240 140 160 170 150 220 C140 170 60 140 60 40z"/></clipPath><clipPath id="hgBot"><path d="M150 220 C160 270 240 300 240 400 L60 400 C60 300 140 270 150 220z"/></clipPath></defs>
        <path d="M60 40 L240 40 C240 140 160 170 150 220 C160 270 240 300 240 400 L60 400 C60 300 140 270 150 220 C140 170 60 140 60 40z" fill="#DCE8FA" stroke="#2F6BCF" stroke-width="6"/>
        <g clip-path="url(#hgTop)"><rect class="st" x="40" y="60" width="220" height="200" fill="${C.gold}"/></g>
        <g clip-path="url(#hgBot)"><rect class="sb" x="40" y="400" width="220" height="200" fill="${C.gold}"/></g>
        <rect class="stream" x="147" y="215" width="6" height="185" fill="${C.gold}"/>
        <rect x="30" y="18" width="240" height="26" rx="8" fill="${C.ink}"/><rect x="30" y="396" width="240" height="26" rx="8" fill="${C.ink}"/></svg>`, ev._root);
      Object.assign(ev._hg.style, { left: "390px", top: "440px", width: "300px", height: "440px", transformOrigin: "50% 50%" });
      ev._st = ev._hg.querySelector(".st"); ev._sb = ev._hg.querySelector(".sb"); ev._stream = ev._hg.querySelector(".stream");
      if (p.label) { ev._name = el("div", "exname", acc(p.label), ev._root); ev._name.dataset.safe = "1"; }
      ev._badges = el("div", "badges", null, ev._root); ev._badges.dataset.safe = "1";
      ev._b = (p.badges || []).map((b) => { const e = el("div", "badge", `${icon(b.icon || "clock")}<span>${acc(b.text)}</span>`, ev._badges); e._at = b.at; return e; });
    },
    update(ev, t) {
      const p = ev.params; const span = Math.max(1, ev.end - ev.start); const flip = p.flip_at;
      const t0 = flip != null && t >= flip ? flip + 0.35 : ev.start; const lvl = clamp((t - t0) / Math.max(1, (flip != null && t < flip ? flip : ev.end) - t0));
      ev._st.setAttribute("y", 60 + 160 * lvl); ev._sb.setAttribute("y", 400 - 120 * lvl); ev._stream.style.opacity = lvl < 0.98 ? 1 : 0;
      const rot = flip != null ? 180 * E.inOutCubic(prog(t, flip, 0.35)) : 0;
      const stretch = p.stretch_at != null ? 1 + 0.18 * E.outBack(prog(t, p.stretch_at, 0.35)) : 1;
      const q = pop(t, ev.start); ev._hg.style.opacity = q.a; ev._hg.style.transform = `scale(${q.s}) rotate(${rot}deg) scaleY(${stretch})`;
      if (ev._name) setPop(ev._name, t, p.label_at ?? ev.start + 0.3, "translateX(-50%)");
      ev._b.forEach((b, i) => { const at = b._at ?? ev.start + 0.8 + 0.4 * i; setPop(b, t, at); b.style.display = t >= at - 0.01 ? "inline-flex" : "none"; void span; });
    },
  },
  // E13 كرت الـ CTA — "اكتب بالتعليقات" ← خط ← «الكلمة» بالأكسنت
  E13: {
    setup(ev, ctx) {
      const p = ev.params; const card = el("div", "tcard", null, ev._root); card.dataset.safe = "1"; card.dataset.solo = "card";
      const wds = p.words || (p.word ? [p.word] : []);
      card.innerHTML = `<div class="small">${acc(p.top || "اكتب بالتعليقات")}</div><div class="uline" style="height:6px"></div>` +
        wds.map((w, i) => `${i ? `<div class="small" style="font-size:44px">${acc(p.or || "أو")}</div>` : ""}<div class="big cw2" style="font-size:150px;line-height:1.15">«${isolateLTR(w)}»</div>`).join("") +
        (p.sub ? `<div class="small" style="font-size:44px;margin-top:8px">${acc(p.sub)}</div>` : "");
      card.style.top = `${p.y ?? 640}px`;
      ev._u = card.querySelector(".uline"); ev._w = [...card.querySelectorAll(".cw2")];
      const wt = ctx.wordTimesFrom(ev.start, 12);
      ev._wt = p.word_times || ev._w.map((_, i) => ctx.words.find((w) => w.start >= ev.start && w.w.replace(/[«»"]/g, "").includes(wds[i]))?.start ?? (wt[2 + i * 2] ?? ev.start + 0.5 + i * 0.5));
    },
    update(ev, t) {
      ev._u.style.width = `${Math.round(320 * E.outCubic(prog(t, ev.start + 0.12, 0.25)))}px`;
      ev._w.forEach((w, i) => { const at = ev._wt[i]; const q = pop(t, at); const shake = prog(t, at, 0.3) > 0 && prog(t, at, 0.3) < 1 ? 6 * Math.sin((t - at) * 60) : 0;
        w.style.opacity = q.a; w.style.transform = `translateX(${shake.toFixed(1)}px) scale(${q.s})`; });
    },
  },
  // E14 الختام — سطر صغير ← رقم بالأكسنت ← سطر صغير، والعنصر البطل يرجع، والشعار صغير تحت
  E14: {
    setup(ev, ctx) {
      const p = ev.params; const card = el("div", "tcard", null, ev._root); card.dataset.safe = "1"; card.dataset.solo = "card";
      card.innerHTML = `${p.top ? `<div class="small">${acc(p.top)}</div>` : ""}${p.big ? `<div class="big" style="font-size:170px">${acc(p.big)}</div>` : ""}${p.bottom ? `<div class="small" style="color:#14284B">${acc(p.bottom)}</div>` : ""}`;
      card.style.top = `${p.y ?? 470}px`; ev._parts = [...card.children];
      ev._hero = el("div", "hero", hero(p.hero || ctx.data.hero || "gpu"), ev._root); Object.assign(ev._hero.style, { top: "880px", height: "300px", left: "230px", width: "620px" });
      if (ctx.logoFull) { const l = el("img", "logo", null, ev._root); l.src = ctx.logoFull.src; l.style.top = "1240px"; ev._logo = l; }
    },
    update(ev, t) {
      ev._parts.forEach((e, i) => setPop(e, t, ev.start + 0.05 + 0.25 * i));
      const sp = E.outCubic(prog(t, ev.start + 0.1, 0.2)); ev._hero.style.transform = `translateX(${(600 * (1 - sp)).toFixed(1)}px)`; ev._hero.style.opacity = sp > 0 ? 1 : 0;
      if (ev._logo) { const q = pop(t, ev.start + 0.6); ev._logo.style.opacity = q.a; ev._logo.style.transform = `translateX(-50%) scale(${q.s})`; }
    },
  },
  // X01 لقطة إضافية بنفس الأسلوب: عنصر بطل + اسم + شارات على عالم الهوية
  X01: {
    setup(ev, ctx) { H.E11.setup(ev, ctx); ev._ic.style.display = ev.params.corner_icon ? "block" : "none"; },
    update(ev, t) { H.E11.update(ev, t); },
  },
};

main();
