// =============================================================================
// metaphor — قالب «الاستعارة الشارحة» (مثال تطبيقي لنظام الأسلوب في design-refs/video-style-system).
// البنية ثابتة (9 أجزاء): سؤال الهوك ← البطل + الجواب ← بوابة «تخيّل» (بيضاء) ← قصة الاستعارة (لوحة عالم + بطاقات + سفر)
//  ← الكشف ← الآلية (مخطط) ← 3 أمثلة (دخول ← فعل ← نتيجة) ← CTA بكلمة ← القفلة (نفس البطل) + الحلقة.
// كل الأوقات والنصوص والصور من scene.json → mx / assets. الحالة دالة نقية في t: window.renderFrame(t).
// =============================================================================
import { clamp, prog, E, isolateLTR, el, qa } from "../common/core.js";
import { icon } from "../tech-news/icons.js";

const FPS = 30, W = 1080, H = 1920;
const ACC = "#FFB020", WIFI = "#6B9FE9";

// ---------- أدوات ----------
const acc = (s) => String(s ?? "").split(/(\*\*[^*]+\*\*)/g)
  .map((p) => (p.startsWith("**") ? `<span class="acc">${isolateLTR(p.slice(2, -2))}</span>` : isolateLTR(p))).join("");
const pop = (t, at, dur = 0.32) => { // 0 → 1.12 → 1
  const p = prog(t, at, dur); if (p <= 0) return { a: 0, s: 0.001 };
  const s = p < 0.6 ? 1.12 * E.outCubic(p / 0.6) : 1.12 - 0.12 * E.outCubic((p - 0.6) / 0.4);
  return { a: clamp(p * 3), s: Math.max(0.001, s) };
};
const setPop = (e, t, at, base = "", dur) => { const q = pop(t, at, dur); e.style.opacity = q.a; e.style.transform = `${base} scale(${q.s})`; return q; };
const show = (e, on) => { e.style.display = on ? "block" : "none"; };
function loadImg(src) { return new Promise((res) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; }); }
function rng(seed = 7) { let a = seed >>> 0; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
async function loadData() {
  if (window.__SCENE_DATA__) return window.__SCENE_DATA__;
  const q = new URLSearchParams(location.search);
  return (await fetch(q.get("data") || "sample.json")).json();
}
const hblurG = () => document.getElementById("hblur-g");

// ---------- رسومات SVG (جمادات فقط) ----------
const SV = (inner, vb = "0 0 64 64") => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const ROUTER = (c) => SV(`<rect x="6" y="34" width="52" height="18" rx="5" fill="${c}"/><rect x="14" y="14" width="5" height="22" rx="2.5" fill="${c}"/><rect x="45" y="14" width="5" height="22" rx="2.5" fill="${c}"/>
  <circle cx="16" cy="43" r="2.6" fill="#12151c"/><circle cx="25" cy="43" r="2.6" fill="#12151c"/><circle cx="34" cy="43" r="2.6" fill="#12151c"/>
  <path d="M24 22a12 12 0 0 1 16 0M20 15a19 19 0 0 1 24 0" stroke="${c}" stroke-width="4" fill="none" stroke-linecap="round"/>`);
const PHONE = (c) => SV(`<rect x="18" y="5" width="28" height="54" rx="7" fill="${c}"/><rect x="22" y="12" width="20" height="36" rx="2.5" fill="#fff"/><circle cx="32" cy="53" r="2.6" fill="#fff"/>`);
const STAMP = (kind) => {
  const c = kind === "ok" ? "#1FAE5B" : "#E5384A";
  const mark = kind === "ok" ? `<path d="M62 118l34 34 66-74" stroke="${c}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`
    : `<path d="M70 70l90 90M160 70l-90 90" stroke="${c}" stroke-width="22" stroke-linecap="round" fill="none"/>`;
  return SV(`<circle cx="115" cy="115" r="98" fill="rgba(255,250,235,.82)" stroke="${c}" stroke-width="14"/><circle cx="115" cy="115" r="80" fill="none" stroke="${c}" stroke-width="4" stroke-dasharray="7 9"/>${mark}`, "0 0 230 230");
};
const CHECK = SV(`<circle cx="32" cy="32" r="29" fill="#1FAE5B"/><path d="M18 33l10 10 19-21" stroke="#fff" stroke-width="7" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`);
const PORT = SV(`<rect x="0" y="0" width="300" height="250" rx="22" fill="#2a2f3b"/><rect x="18" y="18" width="264" height="214" rx="14" fill="#1d212b"/>
  <path d="M95 70h110v95h-25v22h-60v-22H95z" fill="#0b0d12" stroke="#4a5163" stroke-width="5"/>
  ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${112 + i * 10}" y="80" width="5" height="22" fill="#c9a24a"/>`).join("")}
  <circle class="led1" cx="112" cy="52" r="9" fill="#333"/><circle class="led2" cx="188" cy="52" r="9" fill="#333"/>`, "0 0 300 250");
const PLUG = SV(`<rect x="44" y="140" width="32" height="420" rx="16" fill="${ACC}"/><path d="M14 0h92v92H86v22H34V92H14z" fill="rgba(220,235,255,.9)" stroke="#9fb3cf" stroke-width="4"/>
  ${[0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${24 + i * 10}" y="6" width="5" height="18" fill="#c9a24a"/>`).join("")}<rect x="30" y="112" width="60" height="40" rx="8" fill="#3b4252"/>`, "0 0 120 560");

// ============================================================================
async function main() {
  const data = await loadData();
  const mx = data.mx, A = data.assets || {};
  const stage = document.getElementById("stage");
  await Promise.all([document.fonts.load('800 60px "Baloo Bhaijaan 2"', "تيربو"), document.fonts.load('800 40px "Inter"', "Wi-Fi 5GHz")]);
  await document.fonts.ready;
  const imgs = {};
  await Promise.all(Object.entries(A).map(async ([k, v]) => { imgs[k] = await loadImg(v); }));
  const logoFull = await loadImg("../../brand/logo/full_transparent.png");
  const D = data.duration;
  const words = (data.captions?.lines || []).flatMap((L) => L.words || []);
  const RT = mx.rt; // وقت ظهور كل كلمة (محسوب في المسودة: بداية النطق الفعلية)

  // العوالم
  const worlds = {};
  for (const k of ["identity", "white", "story", "idea"]) worlds[k] = el("div", `world ${k}`, null, stage);
  const parts = {};
  const part = (k, world) => { const root = el("div", "abs", null, worlds[world]);
    Object.assign(root.style, { left: "0px", top: "0px", width: W + "px", height: H + "px" }); return (parts[k] = { root, world }); };

  // ---------- كلمات بتوقيت ----------
  /** يبني نص كلمة كلمة من فهارس الكلمات [a..b]؛ accSet = فهارس كلمات التمييز */
  function wordLine(parent, cls, a, b, accSet = new Set(), extraCls = "", brAfter = -1) {
    const box = el("div", cls + " " + extraCls, null, parent);
    const inner = el("span", "inner", null, box); inner.style.display = "inline-block"; box.inner = inner;
    const spans = [];
    for (let i = a; i <= b; i++) {
      if (i > a) inner.appendChild(i - 1 === brAfter ? document.createElement("br") : document.createTextNode(" "));
      const w = words[i].w; const s = el("span", "wd" + (accSet.has(i) ? " acc" : ""), isolateLTR(w), inner); spans.push([s, i]);
    }
    box.update = (t) => spans.forEach(([s, i]) => {
      const p = prog(t, RT[i] - 0.02, 0.17);
      s.style.display = p <= 0 ? "none" : "inline-block"; // السطر يكبر من المنتصف مع كل كلمة (مثل المرجع)
      s.style.opacity = p <= 0 ? 0 : 0.25 + 0.75 * E.outCubic(p);
      s.style.filter = p < 1 ? `blur(${(6 * (1 - p)).toFixed(1)}px)` : "none";
      s.style.transform = `translateY(${(8 * (1 - E.outCubic(p))).toFixed(1)}px)`;
    });
    return box;
  }

  // ======================= 1) سؤال الهوك (هوية) =======================
  const P1 = part("hook", "identity");
  const hookTxt = el("div", "l2", `<span class="inner" style="display:inline-block">${acc(mx.hook.text)}</span>`, P1.root); hookTxt.style.top = "800px";
  hookTxt.firstChild.dataset.safe = "1"; hookTxt.firstChild.dataset.solo = "hook";

  // ======================= 2) البطل + الجواب =======================
  const P2 = part("hero", "identity");
  const mkHero = (parent) => {
    const h = el("div", "hero", null, parent);
    const glow = el("div", "bglow", null, h); glow.style.left = (mx.hero.ball[0] * 900) + "px"; glow.style.top = (mx.hero.ball[1] * 1350) + "px";
    const img = el("img", null, null, h); img.src = A.hero;
    return { h, glow };
  };
  const hero2 = mkHero(P2.root);
  const black = el("div", "flash", null, stage); black.style.background = "#000";
  const white = el("div", "flash", null, stage); white.style.background = "#fff";

  // ======================= 3) بوابة «تخيّل» (بيضاء) =======================
  const P3 = part("gate", "white");
  const gateTxt = wordLine(P3.root, "l2 dark", mx.gate.w[0], mx.gate.w[1]); gateTxt.style.top = "870px"; gateTxt.style.fontSize = "92px"; gateTxt.inner.dataset.safe = "1"; gateTxt.inner.dataset.solo = "gate";
  gateTxt.style.transformOrigin = "540px 70px";

  // ======================= 4) القصة (لوحة عالم + بطاقات) =======================
  const P4 = part("story", "story");
  const S = mx.story;
  const cam = el("div", "cam", null, P4.root);
  { const c = el("img", "canvas", null, cam); c.src = A.canvas; }
  const cards = {};
  for (const [k, pl] of Object.entries(S.places)) {
    const c = el("div", "card", null, cam); c.style.left = (pl.x - 380) + "px"; c.style.top = (pl.y - 506) + "px";
    const i0 = el("img", null, null, c); i0.src = A["card" + k];
    const i1 = el("img", null, null, c); i1.src = A["card" + k + "_fix"]; i1.style.opacity = 0;
    const stx = el("div", "stamp", STAMP("x"), c), sok = el("div", "stamp", STAMP("ok"), c);
    for (const s of [stx, sok]) { s.style.left = (pl.stamp[0] * 760) + "px"; s.style.top = (pl.stamp[1] * 1013) + "px"; }
    const sparks = [...Array(10)].map(() => el("div", "spark", null, c));
    cards[k] = { c, i1, stx, sok, sparks, pl };
  }
  const gball = el("div", "gball", null, cam);
  const shade = el("div", "topshade", null, P4.root);
  const freezeWord = el("div", "l1 outline", `<span style="display:inline-block">${isolateLTR(S.freeze.word)}</span>`, P4.root); freezeWord.style.top = "300px"; freezeWord.firstChild.dataset.safe = "1"; freezeWord.firstChild.dataset.solo = "freeze";
  const dip = el("div", "dip", null, P4.root);
  const route = S.route; // نقاط المسار من A إلى B (إحداثيات اللوحة)
  const segLen = route.slice(1).map((p, i) => Math.hypot(p[0] - route[i][0], p[1] - route[i][1]));
  const total = segLen.reduce((a, b) => a + b, 0);
  const routeAt = (u) => { // u: 0 عند A → 1 عند B
    let d = clamp(u) * total;
    for (let i = 0; i < segLen.length; i++) { if (d <= segLen[i]) { const f = d / segLen[i]; return [route[i][0] + (route[i + 1][0] - route[i][0]) * f, route[i][1] + (route[i + 1][1] - route[i][1]) * f]; } d -= segLen[i]; }
    return route[route.length - 1];
  };
  const travels = S.seq.filter((x) => x.travel);
  function camState(t) {
    let place = S.seq[0].cam, arrived = S.seq[0].t, tr = null;
    for (const x of travels) { if (t >= x.t + x.dur) { place = x.travel[1]; arrived = x.t + x.dur; } else if (t >= x.t) { tr = x; break; } else break; }
    const kb = (since) => 1 + 0.05 * E.outCubic(clamp(since / 4.5));
    if (!tr) { const p = S.places[place]; return { cx: p.x, cy: p.y, s: kb(t - arrived), place, blur: 0, ball: null }; }
    const [f, to] = tr.travel, pf = S.places[f], pt = S.places[to];
    const e = (u) => E.inOutCubic(clamp(u));
    const u = (t - tr.t) / tr.dur, eu = e(u), eu2 = e(u + 1 / FPS / tr.dur);
    const cx = pf.x + (pt.x - pf.x) * eu, cy = pf.y + (pt.y - pf.y) * eu;
    const ru = f === "A" ? eu : 1 - eu; // المسار مرسوم من A إلى B
    const s = 1 - 0.12 * Math.sin(Math.PI * clamp(u)); // تبعد شوي وقت السفر
    return { cx, cy, s, place: null, blur: Math.min(46, Math.abs(pt.x - pf.x) * (eu2 - eu) * 0.55), ball: routeAt(ru), bu: u };
  }

  // ======================= 5) الكشف (عالم الفكرة) =======================
  const P5 = part("reveal", "idea");
  const R = mx.reveal;
  const revTxt = wordLine(P5.root, "l2", R.w[0], R.w[1], new Set(R.acc), "", R.br ?? -1); revTxt.style.top = "760px"; revTxt.style.fontSize = "100px"; revTxt.inner.dataset.safe = "1"; revTxt.inner.dataset.solo = "reveal";
  const revLine = el("div", "uline", null, P5.root); revLine.style.top = "1015px";

  // ======================= 6–7) المخطط + 3 أمثلة =======================
  const P6 = part("idea", "idea");
  const G = mx.diagram;
  const diag = el("div", "diag", null, P6.root);
  const lines = el("div", "abs", null, diag); Object.assign(lines.style, { inset: 0 });
  lines.innerHTML = `<svg class="lines" viewBox="0 0 1080 1920"></svg>`;
  const svg = lines.firstChild;
  const NS = "http://www.w3.org/2000/svg";
  const sLine = (x1, y1, x2, y2, attrs) => { const l = document.createElementNS(NS, "line"); Object.entries({ x1, y1, x2, y2, ...attrs }).forEach(([k, v]) => l.setAttribute(k, v)); svg.appendChild(l); return l; };
  const RT0 = G.router; // [x,y]
  const router = el("div", "chip", `${ROUTER(ACC)}<span>${G.router_label}</span>`, diag); router.style.left = RT0[0] + "px"; router.style.top = RT0[1] + "px";
  router.dataset.safe = "1";
  const devs = G.devices.map((d, i) => {
    const wl = sLine(RT0[0], RT0[1], d.x, d.y, { stroke: WIFI, "stroke-width": 6, "stroke-dasharray": "4 16", "stroke-linecap": "round", opacity: 0 });
    const tl = el("div", "tile", d.icon === "phone" ? PHONE("#2F6BCF") : icon(d.icon, "#2F6BCF"), diag); tl.style.left = d.x + "px"; tl.style.top = d.y + "px";
    return { tl, wl, d, at: G.dev_times[i] };
  });
  const cable = sLine(RT0[0], RT0[1] + 70, G.pc[0], G.pc[1] - 95, { stroke: ACC, "stroke-width": 12, "stroke-linecap": "round", filter: "drop-shadow(0 0 10px rgba(255,176,32,.9))" });
  const cableLen = Math.abs(G.pc[1] - 95 - RT0[1] - 70);
  cable.setAttribute("stroke-dasharray", `${cableLen} ${cableLen}`);
  const pcWifi = sLine(RT0[0], RT0[1], G.pc[0], G.pc[1], { stroke: ACC, "stroke-width": 6, "stroke-dasharray": "4 16", "stroke-linecap": "round", opacity: 0 });
  const pc = el("div", "tile big", icon("case", "#2F6BCF"), diag); pc.style.left = G.pc[0] + "px"; pc.style.top = G.pc[1] + "px";
  const pcLab = el("div", "tlabel", G.pc_label, diag); pcLab.style.left = G.pc[0] + "px"; pcLab.dataset.safe = "1";
  const walls = [0, 1].map((i) => { const w = el("div", "wall", null, diag); w.style.left = "540px"; w.style.top = G.walls[i] + "px"; return w; });
  const bars = el("div", "bars", null, diag); const barEls = [0, 1, 2, 3].map((i) => { const b = el("i", null, null, bars); b.style.height = (24 + i * 22) + "px"; return b; });
  const cutX = el("div", "abs", SV(`<circle cx="32" cy="32" r="28" fill="#E5384A"/><path d="M21 21l22 22M43 21L21 43" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`), diag);
  Object.assign(cutX.style, { width: "84px", height: "84px", left: (G.pc[0] - 42) + "px" });

  // مثال 1: نافذة المنفذ + الرسم البياني
  const X1 = mx.ex1;
  const win1 = el("div", "win", null, P6.root); Object.assign(win1.style, { top: "520px", height: "880px" });
  const port = el("div", "abs", PORT, win1); Object.assign(port.style, { left: "300px", top: "60px", width: "300px", height: "250px" });
  const plugWrap = el("div", "abs", null, win1); Object.assign(plugWrap.style, { left: "390px", top: "130px", width: "120px", height: "300px", overflow: "hidden" });
  plugWrap.innerHTML = PLUG; plugWrap.firstChild.style.cssText = "width:120px;height:560px";
  const graph = el("div", "abs", null, win1); Object.assign(graph.style, { left: "70px", top: "455px", width: "760px", height: "400px" });
  const gr = rng(3); const jit = [...Array(40)].map((_, i) => [20 + i * 18.5, 150 + (gr() - 0.5) * 150 + (i % 7 === 3 ? -90 : 0)]);
  const flat = [...Array(40)].map((_, i) => [20 + i * 18.5, 300 + (gr() - 0.5) * 12]);
  const poly = (pts) => pts.map((p) => p.join(",")).join(" ");
  graph.innerHTML = `<svg viewBox="0 0 760 400" width="760" height="400"><line x1="20" y1="380" x2="740" y2="380" stroke="rgba(255,255,255,.18)" stroke-width="3"/>
    <polyline class="pj" points="${poly(jit)}" fill="none" stroke="${WIFI}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
    <polyline class="pf" points="${poly(flat)}" fill="none" stroke="${ACC}" stroke-width="9" stroke-linecap="round" style="filter:drop-shadow(0 0 8px rgba(255,176,32,.8))"/></svg>`;
  const pj = graph.querySelector(".pj"), pf = graph.querySelector(".pf");
  const lenOf = (pts) => pts.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
  const Lj = lenOf(jit), Lf = lenOf(flat);
  pj.setAttribute("stroke-dasharray", `${Lj} ${Lj}`); pf.setAttribute("stroke-dasharray", `${Lf} ${Lf}`);
  const gl1 = el("div", "glab ltr", "Wi-Fi", graph); Object.assign(gl1.style, { right: "0px", top: "40px", color: WIFI, fontFamily: "var(--en)" });
  const gl2 = el("div", "glab", G.cable_label, graph); Object.assign(gl2.style, { right: "0px", top: "318px", color: ACC });

  // مثال 3: نافذة الشبكتين
  const X3 = mx.ex3;
  const win3 = el("div", "win", null, P6.root); Object.assign(win3.style, { top: "560px", height: "760px" });
  const mkLane = (top, label, n, seed) => {
    const ln = el("div", "lane", `<div class="lab">${label}</div>`, win3); ln.style.top = top + "px";
    const r = rng(seed); const cols = ["#6B9FE9", "#8FBAF0", "#c9d4e6", "#e7b23c", "#b9c6d8", "#7d8ca3"];
    const dots = [...Array(n)].map((_, i) => { const d = el("div", "dot", null, ln); d.style.background = cols[i % cols.length];
      return { d, x0: r() * 780, y0: 40 + r() * 140, vx: (r() - 0.3) * 260, ph: r() * 6.28, amp: 10 + r() * 40 }; });
    return { ln, dots };
  };
  const lane1 = mkLane(150, "2.4GHz", 30, 5), lane2 = mkLane(430, "5GHz", 5, 9);
  const okIcon = el("div", "abs", CHECK, win3); Object.assign(okIcon.style, { left: "78px", top: "452px", width: "84px", height: "84px" });

  // ======================= 8) CTA =======================
  const P8 = part("cta", "identity");
  const C = mx.cta;
  const ctaTop = wordLine(P8.root, "l4", C.w_top[0], C.w_top[1]); ctaTop.style.top = "590px"; ctaTop.inner.dataset.safe = "1"; ctaTop.inner.dataset.solo = "ctaTop";
  const ctaLine = el("div", "uline", null, P8.root); ctaLine.style.top = "730px";
  const ctaBig = el("div", "l1 acc", `<span style="display:inline-block">${isolateLTR(C.big)}</span>`, P8.root); ctaBig.style.top = "770px"; ctaBig.firstChild.dataset.safe = "1"; ctaBig.firstChild.dataset.solo = "ctaBig";
  const ctaBot = wordLine(P8.root, "l4", C.w_bottom[0], C.w_bottom[1]); ctaBot.style.top = "1060px"; ctaBot.inner.dataset.safe = "1"; ctaBot.inner.dataset.solo = "ctaBot";

  // ======================= 9) القفلة =======================
  const P9 = part("close", "identity");
  const K = mx.close;
  const hero9 = mkHero(P9.root);
  const c1 = wordLine(P9.root, "l4", K.w1[0], K.w1[1], new Set(K.acc || [])); c1.style.top = "230px"; c1.style.fontSize = "78px"; c1.inner.dataset.safe = "1"; c1.inner.dataset.solo = "close1";
  const c2 = wordLine(P9.root, "l4", K.w2[0], K.w2[1], new Set(K.acc || [])); c2.style.top = "330px"; c2.style.fontSize = "104px"; c2.inner.dataset.safe = "1"; c2.inner.dataset.solo = "close2";
  const pill = el("div", "logo-pill", null, P9.root); pill.style.top = "760px"; { const i = el("img", null, null, pill); i.src = A.logo || (logoFull && logoFull.src); }

  // ======================= الكابشن العلوي =======================
  const capBox = el("div", "tcap", null, stage);
  const capSegs = mx.caps.map((c) => ({ ...c, node: null }));
  let capCur = null;
  function updCap(t) {
    let seg = null;
    for (const c of capSegs) if (t >= c.from && t < c.until) seg = c;
    if (seg !== capCur) {
      capCur = seg; capBox.innerHTML = "";
      if (seg) { seg.node = wordLine(capBox, "", seg.a, seg.b, new Set(seg.acc || [])); seg.node.style.display = "inline"; seg.node.inner.dataset.safe = "1"; seg.node.inner.dataset.solo = "caption"; }
    }
    capBox.style.opacity = seg ? 1 : 0;
    if (seg) seg.node.update(t);
  }

  // ---------- الحبيبات ----------
  const grain = el("div", "grain", null, stage);
  { const cv = document.createElement("canvas"); cv.width = cv.height = 192; const g = cv.getContext("2d"); const im = g.createImageData(192, 192); const r = rng(11);
    for (let i = 0; i < im.data.length; i += 4) { const v = 60 + r() * 195; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); grain.style.backgroundImage = `url(${cv.toDataURL()})`; }
  // ---------- الحلقة ----------
  const loop = data.loop && +data.loop.dur > 0 ? { start: +(data.loop.start ?? (D - data.loop.dur)), end: D - 1 / FPS } : null;
  const loopImg = el("img", "loop-frame", null, stage);
  Object.assign(loopImg.style, { position: "absolute", inset: "0", width: "1080px", height: "1920px", zIndex: "999", pointerEvents: "none", opacity: "0", display: "none" });
  window.__loop = loop;
  window.__setLoopFrame = (src) => new Promise((res) => { loopImg.onload = () => res(true); loopImg.onerror = () => res(false); loopImg.src = src; });

  // ============================================================================
  const order = [["hook", 0], ["hero", mx.hero.start], ["gate", mx.gate.start], ["story", S.start], ["reveal", R.start], ["idea", G.start], ["cta", C.start], ["close", K.start]];
  window.renderFrame = (t) => {
    let cur = "hook"; for (const [k, s] of order) if (t >= s) cur = k;
    const world = parts[cur].world;
    for (const k in worlds) show(worlds[k], k === world);
    for (const k in parts) show(parts[k].root, k === cur);

    // 1) الهوك: لقطة مكتملة من أول فريم + push-in بطيء
    if (cur === "hook") hookTxt.style.transform = `scale(${1 + 0.02 * clamp(t / mx.hero.start)})`;

    // 2) البطل: فريم أسود ← punch-out ← توهج على الكلمة + push-in
    if (cur === "hero") {
      const p = prog(t, mx.hero.start, 0.32), e = E.outCubic(p);
      const g = prog(t, mx.hero.glow_at, 0.4);
      const s = (1.5 - 0.5 * e) * (1 + 0.1 * E.outCubic(g)) * (1 + 0.02 * prog(t, mx.hero.start, 3.5));
      hero2.h.style.transform = `scale(${s})`;
      hero2.h.style.filter = p < 1 ? `blur(${(10 * (1 - e)).toFixed(1)}px)` : "none";
      hero2.glow.style.opacity = 0.15 + 0.85 * E.outCubic(g);
      hero2.glow.style.transform = `scale(${0.6 + 0.4 * E.outBack(g)})`;
    }
    show(black, t >= mx.hero.start - 1 / FPS - 0.001 && t < mx.hero.start);

    // 3) البوابة: كلمة كلمة ← تصغير لنقطة
    if (cur === "gate") {
      gateTxt.update(t);
      const k = E.inCubic(prog(t, mx.gate.shrink_at, mx.gate.end - mx.gate.shrink_at));
      gateTxt.style.transform = `scale(${1 - 0.97 * k})`; gateTxt.style.opacity = 1 - clamp((k - 0.7) / 0.3);
    }

    // 4) القصة
    if (cur === "story") {
      const st = camState(t);
      let s = st.s, extra = "";
      const fz = S.freeze, fp = prog(t, fz.t, fz.until - fz.t), inFz = t >= fz.t && t < fz.until;
      if (inFz) s *= 1 + 0.22 * E.outCubic(fp);
      cam.style.transform = `translate(${540 - st.cx * s}px, ${960 - st.cy * s}px) scale(${s})`;
      let filt = "";
      if (inFz) filt = `grayscale(1) contrast(1.15) brightness(${1 - 0.32 * fp}) blur(${(5 * fp).toFixed(1)}px)`;
      if (st.blur > 0.6) { hblurG().setAttribute("stdDeviation", `${st.blur.toFixed(1)} 0`); filt += " url(#hblur)"; }
      cam.style.filter = filt || "none";
      // الكرة الدليل وقت السفر
      if (st.ball) { gball.style.display = ""; gball.style.left = st.ball[0] + "px"; gball.style.top = st.ball[1] + "px";
        gball.style.opacity = clamp(Math.min(st.bu / 0.12, (1 - st.bu) / 0.12)); } else gball.style.display = "none";
      // البطاقات: الحل + الأختام + الشرر
      for (const [k, cd] of Object.entries(cards)) {
        const sw = S.swaps.find((x) => x.place === k);
        cd.i1.style.opacity = sw ? E.outCubic(prog(t, sw.t, 0.3)) : 0;
        const sx = S.stamps.find((x) => x.place === k && x.kind === "x"), so = S.stamps.find((x) => x.place === k && x.kind === "ok");
        if (sx) { const q = pop(t, sx.t, 0.3); const out = sx.until != null ? prog(t, sx.until, 0.18) : 0;
          cd.stx.style.opacity = q.a * (1 - out); cd.stx.style.transform = `rotate(-12deg) scale(${q.s * (1 - 0.4 * out)})`; }
        if (so) { const q = pop(t, so.t, 0.3); cd.sok.style.opacity = q.a; cd.sok.style.transform = `rotate(-8deg) scale(${q.s})`; } else cd.sok.style.opacity = 0;
        const sp = S.sparks.find((x) => x.place === k);
        cd.sparks.forEach((e, i) => {
          if (!sp || t < sp.t || t > sp.t + 0.9) { e.style.opacity = 0; return; }
          const u = (t - sp.t) / 0.9, ang = i * 0.63 + 0.3, r = 40 + 170 * E.outCubic(u);
          e.style.left = (cd.pl.stamp[0] * 760 + Math.cos(ang) * r) + "px"; e.style.top = (cd.pl.stamp[1] * 1013 + Math.sin(ang) * r) + "px";
          e.style.opacity = 1 - u;
        });
      }
      // كلمة التجميد + الغمقة
      show(freezeWord, inFz);
      if (inFz) { const q = pop(t, fz.t, 0.28); freezeWord.style.opacity = q.a; freezeWord.style.transform = `scale(${q.s * (1 + 0.06 * fp)})`; }
      const d1 = prog(t, fz.until - 0.16, 0.16), d2 = prog(t, fz.until, 0.2);
      dip.style.opacity = t >= fz.until - 0.16 && t < fz.until + 0.2 ? (t < fz.until ? d1 : 1 - d2) : 0;
      shade.style.opacity = 1;
    }

    // 5) الكشف
    if (cur === "reveal") {
      revTxt.update(t);
      const lp = E.outCubic(prog(t, R.line_at, 0.38));
      Object.assign(revLine.style, { width: (900 * lp) + "px", left: (990 - 900 * lp) + "px", opacity: lp > 0 ? 1 : 0 });
      P5.root.style.transform = `scale(${1 + 0.04 * prog(t, R.start, R.end - R.start)})`; P5.root.style.transformOrigin = "540px 900px";
    }

    // 6–7) المخطط والأمثلة
    if (cur === "idea") {
      const sp = setPop(router, t, G.router_at, "", 0.34);
      router.style.boxShadow = `0 0 ${40 + 50 * Math.max(0, Math.sin(Math.PI * prog(t, G.cable[1], 0.5)))}px rgba(255,176,32,.6)`;
      const spot = t >= mx.ex2.start ? E.outCubic(prog(t, mx.ex2.start + 0.1, 0.3)) : 0; // تعتيم الباقي في مثال 2
      devs.forEach((d, i) => {
        const q = setPop(d.tl, t, d.at, "", 0.3);
        const dim = 1 - 0.85 * spot;
        d.tl.style.opacity = q.a * dim;
        d.wl.setAttribute("opacity", (0.75 * clamp((t - d.at) / 0.25) * dim).toFixed(2));
        d.wl.setAttribute("stroke-dashoffset", (-t * 60).toFixed(1));
      });
      // الجهاز: يقرب في مثال 2
      const closer = E.inOutCubic(prog(t, mx.ex2.closer_at, 0.6));
      const pcY = G.pc[1] - G.closer_dy * closer;
      pc.style.top = pcY + "px"; pcLab.style.top = (pcY + 100) + "px";
      const qpc = setPop(pc, t, G.pc_at, "", 0.32); pcLab.style.opacity = qpc.a;
      // الكيبل: يُرسم ← (مثال 2) يقصر ويختفي
      const cp = E.outCubic(prog(t, G.cable[0], G.cable[1] - G.cable[0]));
      const shrink = E.inOutCubic(prog(t, mx.ex2.cut_at, 0.3)), gone = prog(t, mx.ex2.closer_at, 0.25);
      cable.setAttribute("stroke-dashoffset", (cableLen * (1 - cp * (1 - 0.6 * shrink))).toFixed(1));
      cable.setAttribute("opacity", (1 - gone).toFixed(2));
      const qx = pop(t, mx.ex2.cut_at + 0.12, 0.28);
      cutX.style.opacity = qx.a * (1 - gone); cutX.style.transform = `scale(${qx.s})`; cutX.style.top = (RT0[1] + 70 + cableLen * 0.72 - 42) + "px";
      // واي فاي للجهاز + الأعمدة + الجدران (مثال 2)
      const wifiOn = clamp((t - mx.ex2.closer_at) / 0.3) * (t < mx.ex3.start + 0.2 ? 1 : 0.4);
      pcWifi.setAttribute("y2", pcY); pcWifi.setAttribute("opacity", (0.9 * wifiOn).toFixed(2)); pcWifi.setAttribute("stroke-dashoffset", (-t * 60).toFixed(1));
      const wallOut = E.inOutCubic(prog(t, mx.ex2.walls_at, 0.45));
      walls.forEach((w, i) => { const q = pop(t, mx.ex2.start + 0.25 + 0.1 * i, 0.3);
        w.style.opacity = q.a * (1 - wallOut) * (t >= mx.ex3.start ? 0 : 1); w.style.transform = `scale(${q.s}) scaleX(${1 - wallOut})`; });
      const lit = t < mx.ex2.closer_at ? 0 : t < mx.ex2.walls_at ? 1 + Math.floor(clamp((t - mx.ex2.closer_at - 0.2) / 0.8) * 1.99)
        : Math.min(4, 2 + Math.floor(clamp((t - mx.ex2.walls_at - 0.15) / 0.5) * 2.99));
      Object.assign(bars.style, { left: (G.pc[0] + 120) + "px", top: (pcY - 40) + "px", opacity: t >= mx.ex2.closer_at && t < mx.ex3.start ? 1 : 0 });
      barEls.forEach((b, i) => { b.style.background = i < lit ? ACC : "rgba(255,255,255,.18)"; });

      // كاميرا المخطط: بناء ← تقريب (مثال 1) ← رجوع (مثال 2) ← نزول + نافذة من المصدر (مثال 3)
      let ds = 1, dx = 0, dy = 0, dop = 1, dbl = 0;
      const in1 = E.inOutCubic(prog(t, X1.start, 0.42)), out1 = E.inOutCubic(prog(t, mx.ex2.start, 0.4));
      const z1 = in1 * (1 - out1);
      ds = 1 + 0.28 * z1; diag.style.transformOrigin = `${G.pc[0]}px ${G.pc[1]}px`;
      const w1 = prog(t, X1.win_at, 0.28), w1o = prog(t, mx.ex2.start, 0.16);
      const dimIn1 = E.outCubic(w1) * (1 - E.outCubic(w1o));
      const p3 = E.inOutCubic(prog(t, X3.start, 0.4)); dy = -90 * p3; ds *= 1 + 0.06 * p3;
      const w3 = prog(t, X3.win_at, 0.36);
      const dimIn3 = E.outCubic(w3);
      dop = 1 - 0.72 * Math.max(dimIn1, dimIn3); dbl = 6 * Math.max(dimIn1, dimIn3);
      if (t < X1.start) { ds *= 1 + 0.03 * prog(t, G.start, X1.start - G.start); }
      diag.style.transform = `translate(${dx}px, ${dy}px) scale(${ds})`;
      diag.style.opacity = dop; diag.style.filter = dbl > 0.2 ? `blur(${dbl.toFixed(1)}px)` : "none";

      // نافذة مثال 1
      const vis1 = t >= X1.win_at && t < mx.ex2.start + 0.18;
      show(win1, vis1);
      if (vis1) {
        const e = E.outBack(clamp(w1)), so = E.inCubic(w1o);
        win1.style.opacity = clamp(w1 * 2.5);
        win1.style.transform = `translateX(${-1250 * so}px) scale(${0.9 + 0.1 * e})`;
        if (so > 0.02) { hblurG().setAttribute("stdDeviation", `${(40 * so).toFixed(1)} 0`); win1.style.filter = "url(#hblur)"; } else win1.style.filter = "none";
        const pl = E.outCubic(prog(t, X1.plug_at, 0.32));
        plugWrap.firstChild.style.transform = `translateY(${(1 - pl) * 330}px)`;
        const on = t >= X1.plug_at + 0.32;
        port.querySelector(".led1").setAttribute("fill", on ? "#22D36A" : "#333"); port.querySelector(".led2").setAttribute("fill", on && Math.floor(t * 8) % 2 ? ACC : on ? "#7a4b00" : "#333");
        const gp = prog(t, X1.graph_at, 0.85);
        pj.setAttribute("stroke-dashoffset", (Lj * (1 - E.outCubic(gp))).toFixed(1)); pf.setAttribute("stroke-dashoffset", (Lf * (1 - E.outCubic(prog(t, X1.graph_at + 0.15, 0.85)))).toFixed(1));
        gl1.style.opacity = clamp(gp * 3); gl2.style.opacity = clamp((gp - 0.15) * 3);
        graph.style.opacity = gp > 0 ? 1 : 0;
      }
      // نافذة مثال 3: تكبر من مكان الراوتر
      const vis3 = t >= X3.win_at;
      show(win3, vis3);
      if (vis3) {
        const e = E.outBack(clamp(w3), 1.2);
        win3.style.transformOrigin = `${RT0[0] - 90}px ${RT0[1] - 560 - 90}px`;
        win3.style.transform = `scale(${0.05 + 0.95 * e})`; win3.style.opacity = clamp(w3 * 3);
        const lessP = E.outCubic(prog(t, X3.less_at, 0.35)), fiveP = prog(t, X3.five_at, 0.3);
        for (const [ln, crowd] of [[lane1, true], [lane2, false]]) {
          ln.dots.forEach((o) => {
            const tt = t - X3.win_at;
            const x = ((o.x0 + o.vx * tt) % 780 + 780) % 780, y = o.y0 + Math.sin(o.ph + tt * (crowd ? 7 : 2)) * (crowd ? o.amp : 8);
            o.d.style.left = x + "px"; o.d.style.top = clamp(y, 30, 180) + "px";
          });
        }
        lane1.ln.style.opacity = 1 - 0.6 * lessP;
        lane2.ln.style.borderColor = fiveP > 0 ? `rgba(255,176,32,${0.4 + 0.6 * fiveP})` : "rgba(255,255,255,.12)";
        lane2.ln.style.boxShadow = fiveP > 0 ? `0 0 ${30 * fiveP}px rgba(255,176,32,.55)` : "none";
        lane2.ln.querySelector(".lab").style.color = fiveP > 0 ? ACC : "rgba(255,255,255,.85)";
        setPop(okIcon, t, X3.five_at + 0.1, "", 0.3);
      }
    }

    // 8) CTA: ومضة أسود ← أبيض، فعل صغير ← خط ← الكلمة العملاقة ← الوعد
    show(white, t >= C.start - 1 / FPS - 0.001 && t < C.start);
    if (t >= C.start - 2 / FPS - 0.001 && t < C.start - 1 / FPS - 0.001) show(black, true);
    if (cur === "cta") {
      ctaTop.update(t); ctaBot.update(t);
      const lp = E.outCubic(prog(t, C.line_at, 0.35));
      Object.assign(ctaLine.style, { width: (640 * lp) + "px", left: (860 - 640 * lp) + "px", opacity: lp > 0 ? 1 : 0 });
      setPop(ctaBig, t, C.big_at, "", 0.32);
      P8.root.style.transform = "none"; P8.root.style.filter = "none";
    }
    // 9) القفلة: الـCTA ينسحب ← البطل يطلع من تحت + السطرين
    if (cur === "close") {
      c1.update(t); c2.update(t);
      const r = E.outCubic(prog(t, K.start + 0.08, 0.45));
      hero9.h.style.transform = `translateY(${(1 - r) * 900}px) scale(${1 + 0.03 * prog(t, K.start, 4)})`;
      hero9.glow.style.opacity = 0.35 + 0.65 * E.outCubic(prog(t, K.glow_at, 0.4));
      setPop(pill, t, K.logo_at, "", 0.3);
    }
    // الكابشن العلوي
    updCap(t);
    // ومضات الانعكاس (مرتين × فريمين)
    const inv = mx.flashes.some((f) => (t >= f && t < f + 2 / FPS) || (t >= f + 4 / FPS && t < f + 6 / FPS));
    stage.style.filter = inv ? "invert(1)" : "none";
    const fr = Math.round(t * FPS); grain.style.backgroundPosition = `${(fr * 37) % 192}px ${(fr * 53) % 192}px`;
    let la = 0;
    if (loop && loopImg.src && t >= loop.start) { const u = clamp((t - loop.start) / Math.max(1 / FPS, loop.end - loop.start)); la = u * u * (3 - 2 * u); }
    loopImg.style.display = la > 0 ? "block" : "none"; loopImg.style.opacity = la >= 0.999 ? "1" : String(la);
    return true;
  };
  window.__qa = qa;
  window.__meta = { series: "metaphor", duration: D, images: Object.fromEntries(Object.entries(imgs).map(([k, v]) => [k, !!v])), logoFull: !!logoFull };
  const q = new URLSearchParams(location.search);
  if (q.get("t")) window.renderFrame(parseFloat(q.get("t")));
  window.__ready = true;
}
main();
