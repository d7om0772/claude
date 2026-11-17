/* =============================================================================
 scene.js — تجربة "طرق معالجة القهوة" (trial-coffee-02) — نظام الأسلوب الإصدار 2 بتصميم "طباعة ريزو".
 البنية: هوك (مغسولة ولا طبيعية؟) ← جواب + ثمرة البن (أشعة تكشف الحبوب) ← جسر (الوقفة) ← مقطع الثمرة بطبقاته
         ← تكبير (وش يبقى على الحبة) ← مناشر التجفيف: مغسولة ← طبيعية ← عسلية ← CTA ← ختام.
 DOM + SVG، window.renderFrame(t) حتمية. عالم الأمثلة يتحرك بـ viewBox، وبدون filter على عالم كامل.
 بدون ذوات أرواح · بدون موسيقى · بدون شعارات · المناطق الآمنة · الحلقة.
============================================================================= */
const D = window.__SCENE_DATA__, W = D.words, C = D.cues, DUR = D.duration;
const stage = document.getElementById("stage");
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, p) => a + (b - a) * p;
const pr = (t, a, d) => clamp((t - a) / d);
const oC = (p) => 1 - Math.pow(1 - p, 3);
const iC = (p) => p * p * p;
const ioC = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const oB = (p, s = 1.9) => 1 + (s + 1) * Math.pow(p - 1, 3) + s * Math.pow(p - 1, 2);
const S = (i) => W[i].start;
const $ = (q, r = document) => r.querySelector(q);
const INK = "#262220", RED = "#F15060", TEAL = "#00838A", YEL = "#FFD23F", PAPER = "#F2EBDD";
const clean = (s) => s.replace(/[،.:]+$/u, "");
const wordHTML = (i, cls = "", keep = false) => `<span class="w ${cls}" data-i="${i}">${keep ? W[i].w.replace(/[.]+$/u, "") : clean(W[i].w)}</span>`;
const lineHTML = (i0, i1) => Array.from({ length: i1 - i0 + 1 }, (_, k) => wordHTML(i0 + k, "", k < i1 - i0)).join("");
let seed = 20261117; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);

/* ---------- أنماط الهافتون (حبر واحد بنقاط) ---------- */
const DOTS = `
  <pattern id="dotI" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="3.4" fill="${INK}"/></pattern>
  <pattern id="dotR" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="8" cy="8" r="4.6" fill="${RED}"/></pattern>
  <pattern id="dotT" width="15" height="15" patternUnits="userSpaceOnUse"><circle cx="7.5" cy="7.5" r="4" fill="${TEAL}"/></pattern>
  <pattern id="mesh" width="22" height="22" patternUnits="userSpaceOnUse"><path d="M0,0 H22 M0,0 V22" stroke="${INK}" stroke-width="2" opacity=".28"/></pattern>`;

/* ---------- الرسومات ---------- */
// حبة بن مقطوعة بالنص (شكل D) — side: -1 يسار، 1 يمين
const halfBean = (x, side, rx, ry, fill = PAPER) => `<g transform="translate(${x},0) scale(${side},1)">
  <path d="M0,${-ry} C${rx * 1.35},${-ry} ${rx * 1.35},${ry} 0,${ry} Z" fill="${fill}" stroke="${INK}" stroke-width="5"/>
  <path d="M${rx * 0.22},${-ry * 0.7} C${rx * 0.5},${-ry * 0.2} ${rx * 0.05},${ry * 0.25} ${rx * 0.28},${ry * 0.7}" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/></g>`;
// ثمرة البن (البطل)
const cherryArt = (p) => `
  <circle id="${p}mis" r="250" fill="${TEAL}" transform="translate(16,14)" style="mix-blend-mode:multiply" opacity=".85"/>
  <g id="${p}fill"><circle r="250" fill="${RED}"/><circle r="250" fill="url(#dotI)" mask="url(#${p}cres)" opacity=".55"/>
    <ellipse cx="-92" cy="-104" rx="46" ry="72" fill="${PAPER}" opacity=".9" transform="rotate(-32 -92 -104)"/></g>
  <circle id="${p}ring" r="250" fill="none" stroke="${INK}" stroke-width="6" stroke-dasharray="20 14" opacity="0"/>
  <g id="${p}beans" opacity="0">${halfBean(-12, -1, 82, 150)}${halfBean(12, 1, 82, 150)}</g>
  <g id="${p}stem"><path d="M0,-236 C4,-280 14,-310 30,-336" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/>
    <g transform="translate(110,-344) rotate(-22)"><ellipse rx="104" ry="40" fill="${TEAL}" transform="translate(10,8)" opacity=".35"/><ellipse rx="104" ry="40" fill="${TEAL}"/><path d="M-96,0 H96" stroke="${INK}" stroke-width="5"/></g></g>`;
const cherryDefs = (p) => `<mask id="${p}cres"><circle r="250" fill="#fff"/><circle r="250" cx="-70" cy="-80" fill="#000"/></mask>`;

// مقطع الثمرة بطبقاته (الشرح + اللوحة)
const sectionArt = (p, R) => `
  <g id="${p}mis"><circle r="${R}" fill="${TEAL}" transform="translate(${R * 0.05},${R * 0.045})" opacity=".85" style="mix-blend-mode:multiply"/></g>
  <g id="${p}skin"><circle r="${R}" fill="${RED}"/></g>
  <g id="${p}pulp"><circle r="${R * 0.89}" fill="${PAPER}"/><circle r="${R * 0.89}" fill="url(#dotR)" opacity=".75"/></g>
  <g id="${p}muc"><circle r="${R * 0.66}" fill="${YEL}"/><path d="M${-R * 0.42},${-R * 0.42} A${R * 0.6},${R * 0.6} 0 0 1 ${R * 0.3},${-R * 0.55}" fill="none" stroke="${PAPER}" stroke-width="${R * 0.05}" stroke-linecap="round" opacity=".85"/></g>
  <g id="${p}beansS">${halfBean(-R * 0.04, -1, R * 0.27, R * 0.46)}${halfBean(R * 0.04, 1, R * 0.27, R * 0.46)}</g>`;

const ICON = {
  drop: `<path d="M22,4 C30,16 36,22 36,29 A14,14 0 0 1 8,29 C8,22 14,16 22,4 Z" fill="${TEAL}" stroke="${INK}" stroke-width="3"/>`,
  sparkle: `<path d="M22,3 L26,17 L41,22 L26,27 L22,41 L18,27 L3,22 L18,17 Z" fill="${YEL}" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`,
  lemon: `<circle cx="22" cy="22" r="18" fill="${YEL}" stroke="${INK}" stroke-width="3"/><circle cx="22" cy="22" r="12" fill="#FFF2B3"/>${[0, 60, 120, 180, 240, 300].map((a) => `<path d="M22,22 L22,10" stroke="${YEL}" stroke-width="3" transform="rotate(${a} 22 22)"/>`).join("")}`,
  cherry: `<path d="M22,12 C24,6 28,4 32,3" stroke="${INK}" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="22" cy="26" r="15" fill="${RED}" stroke="${INK}" stroke-width="3"/><ellipse cx="16" cy="20" rx="4" ry="6" fill="${PAPER}" opacity=".8"/>`,
  berry: `<circle cx="14" cy="26" r="10" fill="${RED}" stroke="${INK}" stroke-width="2.5"/><circle cx="30" cy="24" r="10" fill="#C23B4E" stroke="${INK}" stroke-width="2.5"/><circle cx="22" cy="36" r="8" fill="${RED}" stroke="${INK}" stroke-width="2.5"/><path d="M22,14 C24,8 30,6 34,8" stroke="${TEAL}" stroke-width="4" fill="none"/>`,
  weight: `<path d="M14,14 A8,8 0 0 1 30,14" fill="none" stroke="${INK}" stroke-width="4"/><path d="M8,40 L12,16 H32 L36,40 Z" fill="${INK}"/><rect x="18" y="26" width="8" height="5" fill="${YEL}"/>`,
  honey: `<path d="M22,4 C30,16 36,22 36,29 A14,14 0 0 1 8,29 C8,22 14,16 22,4 Z" fill="#E8A13A" stroke="${INK}" stroke-width="3"/><ellipse cx="17" cy="27" rx="3" ry="6" fill="${PAPER}" opacity=".8"/>`,
  sugar: `<path d="M8,16 L22,8 L36,16 L36,32 L22,40 L8,32 Z" fill="${PAPER}" stroke="${INK}" stroke-width="3"/><path d="M8,16 L22,24 L36,16 M22,24 V40" stroke="${INK}" stroke-width="3" fill="none"/>`,
  balance: `<path d="M22,6 V38 M10,40 H34 M6,14 H38" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/><path d="M6,14 L1,26 H11 Z M38,14 L33,26 H43 Z" fill="${YEL}" stroke="${INK}" stroke-width="2.5"/>`,
};
const icon = (k, s = 50) => `<svg width="${s}" height="${s}" viewBox="0 0 44 44">${ICON[k]}</svg>`;

/* ---------- مناشر التجفيف (عالم الأمثلة) ---------- */
const BED = { wsh: 600, nat: 1800, hon: 3000 }, BY0 = 380, BY1 = 1140;
function bedArt(k, cx) {
  const x0 = cx - 360, x1 = cx + 360, ix0 = x0 + 30, iy0 = BY0 + 30, iw = 660, ih = BY1 - BY0 - 60;
  let items = ""; const cols = 11, rows = 14;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const x = ix0 + (c + 0.5) * iw / cols + (rnd() - 0.5) * 16, y = iy0 + (r + 0.5) * ih / rows + (rnd() - 0.5) * 12, a = Math.round(rnd() * 180);
    if (k === "nat") items += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${a})"><circle r="22" fill="${rnd() < 0.5 ? "#7A1F2B" : "#93283A"}" stroke="${INK}" stroke-width="2.5"/><path d="M-12,-6 C-4,-12 4,0 12,-6 M-10,6 C-2,0 6,12 12,4" fill="none" stroke="${INK}" stroke-width="2.5" opacity=".6"/><circle cx="-8" cy="-9" r="4" fill="${PAPER}" opacity=".5"/></g>`;
    else items += `<g transform="translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${a})"><ellipse rx="18" ry="24" fill="${k === "wsh" ? "#EADFC6" : "#E8A13A"}" stroke="${INK}" stroke-width="2.5"/><path d="M0,-17 C5,-5 -5,5 0,17" fill="none" stroke="${INK}" stroke-width="2.5"/>${k === "hon" ? `<ellipse cx="-7" cy="-8" rx="3" ry="6" fill="${PAPER}" opacity=".85"/>` : ""}</g>`;
  }
  return `<g id="bed-${k}">
    <rect x="${x0 + 22}" y="${BY0 + 26}" width="720" height="${BY1 - BY0}" fill="url(#dotI)" opacity=".7"/>
    <rect x="${x0}" y="${BY0}" width="720" height="${BY1 - BY0}" fill="${TEAL}"/>
    <rect x="${ix0}" y="${iy0}" width="${iw}" height="${ih}" fill="${PAPER}"/><rect x="${ix0}" y="${iy0}" width="${iw}" height="${ih}" fill="url(#mesh)"/>
    ${items}
    <rect x="${x0 + 9}" y="${BY0 + 8}" width="720" height="${BY1 - BY0}" fill="none" stroke="${RED}" stroke-width="5" style="mix-blend-mode:multiply"/></g>`;
}
const EX = {
  wsh: { name: clean(W[32].w), chips: [["drop", "بدون قشرة ولب", "wsh_c1"], ["sparkle", "أنظف", "wsh_c2"], ["lemon", "حموضة أوضح", "wsh_c3"]] },
  nat: { name: clean(W[41].w), chips: [["cherry", "الثمرة كاملة", "nat_c1"], ["berry", "فواكه", "nat_c2"], ["weight", "قوام أثقل", "nat_c3"]] },
  hon: { name: clean(W[49].w).replace(/^و/, ""), chips: [["honey", "طبقة لزجة", "hon_c1"], ["sugar", "حلوة", "hon_c2"], ["balance", "بين الثنتين", "hon_c3"]] },
};

/* ---------- بناء DOM ---------- */
stage.innerHTML = `
<div class="world" id="brand">
  <div class="sun ht-red"></div>
  ${[["left:64px;top:150px"], ["right:64px;top:150px"], ["left:64px;bottom:150px"], ["right:64px;bottom:150px"]].map(([p]) => `<div class="reg" style="${p}"></div>`).join("")}
  <div id="hero"><svg width="1080" height="1920" viewBox="0 0 1080 1920"><defs>${DOTS}${cherryDefs("h-")}</defs>
    <ellipse cx="560" cy="1300" rx="250" ry="34" fill="url(#dotI)" opacity=".6"/>
    <g id="h-cherry" transform="translate(540,1010)">${cherryArt("h-")}</g></svg></div>
  <div class="card-text" id="hook" style="top:590px" data-safe="hook">
    <div class="row c-teal sh-ink" style="font-size:196px">${wordHTML(0)}</div><div class="row" style="font-size:96px">${wordHTML(1)}</div><div class="row c-red sh-ink" style="font-size:196px">${wordHTML(2)}</div></div>
  <div class="card-text" id="cta" style="top:500px" data-safe="cta">
    <div class="row" style="font-size:88px">${wordHTML(58)}</div>
    <div class="rule" id="cta-rule" style="width:560px;margin:14px 0 18px"></div>
    <div class="row c-teal sh-ink" id="cta-a" style="font-size:178px"><span class="w">«${clean(W[59].w)}»</span></div>
    <div class="row" style="font-size:78px">${wordHTML(60)}</div>
    <div class="row c-red sh-ink" id="cta-b" style="font-size:178px"><span class="w">«${clean(W[61].w)}»</span></div></div>
  <div class="card-text" id="closer" style="top:200px" data-safe="closer">
    <div class="row" style="font-size:70px">${[62, 63, 64].map((i) => wordHTML(i)).join("")}</div>
    <div class="row" style="font-size:70px">${[65, 66, 67].map((i) => wordHTML(i)).join("")}</div>
    <div class="row c-red sh-ink" style="font-size:150px">${wordHTML(68)}${wordHTML(69)}</div></div>
</div>
<div class="world" id="bridge"><div class="fill ht-paper"></div><div class="card-text sh-red" id="ask" style="top:850px;font-size:140px;color:${PAPER}" data-safe="ask"><div class="row">${wordHTML(11)}${wordHTML(12)}${wordHTML(13)}</div></div></div>
<div class="world" id="explain"><div class="fill ht-paper" style="opacity:.6"></div>
  <div id="diagram">
    <svg class="fill" width="1080" height="1920" viewBox="0 0 1080 1920"><defs>${DOTS}</defs>
      ${[[752, 1032, 830], [540, 1086, 540], [400, 960, 270]].map(([x, y, lx], k) => `<path id="d-ln${k}" d="M${lx},1176 C${lx},1110 ${x},${y + 50} ${x},${y}" fill="none" stroke="${PAPER}" stroke-width="5" stroke-dasharray="1" pathLength="1" stroke-dashoffset="1"/><circle id="d-pt${k}" cx="${x}" cy="${y}" r="10" fill="${PAPER}" opacity="0"/>`).join("")}
      <g id="d-sec" transform="translate(540,820)">${sectionArt("d-", 300)}</g>
    </svg>
    ${[["قشرة", RED, 720], ["لب", "dots", 470], ["طبقة لزجة", YEL, 140]].map(([l, c, x], k) => `<div class="lab" id="d-lb${k}" style="left:${x}px;top:1180px"><i style="${c === "dots" ? `background:radial-gradient(circle, ${RED} 0 4px, ${PAPER} 4.5px) 0 0/11px 11px` : `background:${c}`}"></i><span data-safe="d-lb${k}">${l}</span></div>`).join("")}
  </div>
  <div class="panel" id="zp"><svg width="800" height="760" viewBox="0 0 800 760"><defs>${DOTS}</defs>
    <circle id="z-sun" cx="640" cy="760" r="170" fill="url(#dotR)" opacity="0"/>
    <g id="z-sec" transform="translate(400,330)">${sectionArt("z-", 230)}</g>
    <rect id="z-dry" x="0" y="0" width="800" height="760" fill="url(#dotI)" opacity="0"/>
    ${[0, 1, 2].map((k) => `<circle id="z-d${k}" cx="${470 - k * 70}" cy="650" r="20" fill="none" stroke="${INK}" stroke-width="5"/>`).join("")}
  </svg></div>
</div>
<div class="world" id="exw">
  <div class="sunx ht-red"></div>
  <svg id="ex" class="fill" width="1080" height="1920" viewBox="60 0 1080 1920"><defs>${DOTS}</defs>${Object.entries(BED).map(([k, cx]) => bedArt(k, cx)).join("")}</svg>
  <div id="excard" data-safe="excard"><div id="exname"></div><div id="exchips"></div></div>
</div>
<div id="cap"><div class="pill" id="capline" data-safe="caption"></div></div>
<canvas id="grain" width="540" height="960" style="width:1080px;height:1920px"></canvas>
<img id="loopimg" alt="">`;

{ const cv = $("#grain"), cx = cv.getContext("2d"), im = cx.createImageData(540, 960); let s = 777;
  const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < im.data.length; i += 4) { const q = r(), v = q < 0.012 ? 120 : 175 + r() * 80; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  cx.putImageData(im, 0, 0); }

const el = {}; document.querySelectorAll("[id]").forEach((n) => (el[n.id] = n));
const wEl = {}; document.querySelectorAll(".w[data-i]").forEach((n) => (wEl[n.dataset.i] = n));
const show = (n, v) => { n.style.opacity = v; };
const T = (n, s) => { n.style.transform = s; };
const A = (n, k, v) => n.setAttribute(k, v);
// الكلمة "تنختم": تنزل كبيرة ومايلة وتستقر (التصميمات السابقة: blur / تطلع من تحت)
function reveal(n, t, ts, grow = false) {
  if (t < ts - 0.02) { if (grow) n.style.display = "none"; else n.style.visibility = "hidden"; return; }
  const p = pr(t, ts - 0.02, 0.12); n.style.visibility = "visible"; if (grow) n.style.display = "inline-block"; n.style.opacity = Math.min(1, p * 3);
  n.style.transform = `scale(${(1 + 0.38 * (1 - oC(p))).toFixed(4)}) rotate(${((1 - oC(p)) * -7).toFixed(2)}deg)`;
}
function stampBlock(n, t, t0, d = 0.16) {
  if (t < t0) { n.style.visibility = "hidden"; return 0; }
  const p = pr(t, t0, d); n.style.visibility = "visible"; n.style.opacity = Math.min(1, p * 3);
  n.style.transform = `scale(${(1 + 0.18 * (1 - oC(p))).toFixed(4)}) rotate(${((1 - oC(p)) * -6).toFixed(2)}deg)`; return p;
}
function pop(n, t, t0, d = 0.28, rot = 6) {
  if (t < t0) { show(n, 0); return 0; }
  const p = pr(t, t0, d); show(n, Math.min(1, p * 4)); T(n, `scale(${oB(p).toFixed(4)}) rotate(${((1 - oC(p)) * rot + rot * 0.25).toFixed(2)}deg)`); return p;
}

/* ---------- الكابشن ---------- */
const CAPS = D.captions.map((c) => { const n = c.i1 - c.i0 + 1; return { ...c, html: lineHTML(c.i0, c.i1), fs: n <= 2 ? 90 : n === 3 ? 82 : n === 4 ? 74 : 68 }; });
function fitCaps() {
  for (const c of CAPS) { el.capline.style.fontSize = c.fs + "px"; el.capline.innerHTML = c.html; const w = el.capline.getBoundingClientRect().width; if (w > 820) c.fs = Math.floor(c.fs * 820 / w); }
  el.capline.innerHTML = "";
  for (const id of ["hook", "ask", "cta", "closer"]) { const mx = id === "cta" ? 700 : 780; for (const r of el[id].querySelectorAll(".row")) { const w = r.scrollWidth, fs = parseFloat(getComputedStyle(r).fontSize); if (w > mx) r.style.fontSize = Math.floor(fs * mx / w) + "px"; } }
}
let capIdx = -2, capWords = [];
function caption(t) {
  const i = CAPS.findIndex((c) => t >= c.start && t < c.end);
  if (i !== capIdx) { capIdx = i; el.capline.innerHTML = i < 0 ? "" : CAPS[i].html; if (i >= 0) el.capline.style.fontSize = CAPS[i].fs + "px"; capWords = [...el.capline.querySelectorAll(".w")]; }
  if (i >= 0) { const p = pr(t, CAPS[i].start, 0.14); T(el.capline, `rotate(-1.2deg) scaleX(${lerp(0.6, 1, oC(p)).toFixed(4)})`); show(el.capline, Math.min(1, p * 3)); }
  for (const n of capWords) reveal(n, t, S(+n.dataset.i), true);
}

/* ---------- بطاقة المثال ---------- */
let exKey = null, exChips = [];
function exCard(t) {
  const k = t >= C.hon ? "hon" : t >= C.nat ? "nat" : t >= C.wsh ? "wsh" : null;
  if (k !== exKey) { exKey = k; el.exname.textContent = k ? EX[k].name : "";
    el.exchips.innerHTML = k ? EX[k].chips.map(([ic, l]) => `<div class="chip">${icon(ic, 54)}<span data-safe="chip">${l}</span></div>`).join("") : ""; exChips = [...el.exchips.children]; }
  if (!k) return;
  stampBlock(el.exname, t, C[k], 0.18);
  exChips.forEach((n, j) => pop(n, t, C[EX[k].chips[j][2]], 0.26, j % 2 ? 3 : -3));
}

/* ---------- الرندر ---------- */
const inFlash = (t, cut) => (t >= cut - 0.2 && t < cut - 0.134) || (t >= cut - 0.067 && t < cut);
const vb = (cx, w, cyF = 760) => { const h = w * 1920 / 1080; return `${(cx - w / 2).toFixed(1)} ${(cyF - h * cyF / 1920).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`; };
function renderFrame(t) {
  t = clamp(t, 0, DUR);
  const inBrand = t < C.cut_bridge || t >= C.cut_cta, inBridge = t >= C.cut_bridge && t < C.cut_diag, inExplain = t >= C.cut_diag && t < C.cut_ex, inEx = t >= C.cut_ex && t < C.cut_cta;
  show(el.brand, inBrand ? 1 : 0); show(el.bridge, inBridge ? 1 : 0); show(el.explain, inExplain ? 1 : 0); show(el.exw, inEx ? 1 : 0);
  stage.style.filter = inFlash(t, C.cut_bridge) || inFlash(t, C.cut_ex) ? "invert(1)" : "none";
  el.grain.style.opacity = inExplain ? 0.18 : 0.55;
  caption(t);
  el.capline.style.background = inExplain ? PAPER : ""; el.capline.style.color = inExplain ? INK : "";

  /* ===== الورق: الهوك ← الثمرة ← CTA ← الختام ===== */
  if (inBrand) {
    const hookOn = t < C.cut_answer, heroA = t >= C.cut_answer && t < C.cut_bridge, closeP = pr(t, C.cut_close - 0.1, 0.22), heroB = closeP > 0, ctaOn = t >= C.cut_cta;
    T($(".sun", el.brand), `rotate(${(t * 6).toFixed(1)}deg)`);
    show(el.hook, hookOn ? 1 : 0);
    if (hookOn) { T(el.hook, `scale(${lerp(1, 1.05, t / C.cut_answer).toFixed(4)})`);
      for (let i = 0; i <= 2; i++) { const k = t - S(i), b = k >= 0 && k < 0.28 ? Math.sin(Math.PI * k / 0.28) : 0; wEl[i].style.visibility = "visible"; wEl[i].style.opacity = 1;
        T(wEl[i], `scale(${(1 + 0.08 * b).toFixed(4)}) rotate(${(-2 * b).toFixed(2)}deg)`); } }
    show(el.hero, heroA || heroB ? 1 : 0);
    if (heroA) { const p = pr(t, C.cut_answer, 0.32), push = lerp(1, 1.06, pr(t, C.cut_answer + 0.32, C.cut_bridge - C.cut_answer));
      T(el.hero, `scale(${(lerp(2.8, 1, oC(p)) * push).toFixed(4)})`); el.hero.style.filter = p < 1 ? `blur(${((1 - p) * 16).toFixed(1)}px)` : "none";
      // أشعة: الثمرة تشف وتبان الحبوب جواها
      const x = oC(pr(t, C.xray, 0.3)); A(el["h-fill"], "opacity", (1 - 0.82 * x).toFixed(3)); A(el["h-mis"], "opacity", (0.85 * (1 - x)).toFixed(3)); A(el["h-ring"], "opacity", x.toFixed(3)); A(el["h-ring"], "stroke-dashoffset", (-t * 40).toFixed(1));
      A(el["h-beans"], "opacity", x.toFixed(3)); A(el["h-beans"], "transform", `scale(${oB(pr(t, C.xray + 0.05, 0.3)).toFixed(4)})`);
      // تنقطف: العنق يطير والثمرة تنزل وتنط
      const k = pr(t, C.picked, 0.45); A(el["h-stem"], "opacity", (1 - k).toFixed(3)); A(el["h-stem"], "transform", `translate(${(k * 160).toFixed(1)},${(-k * 260).toFixed(1)}) rotate(${(k * 40).toFixed(1)})`);
      const d = t >= C.picked ? Math.sin(Math.PI * clamp((t - C.picked) / 0.36)) * 50 * Math.exp(-(t - C.picked) * 2) : 0;
      A(el["h-cherry"], "transform", `translate(540,${(1010 + d).toFixed(1)})`); }
    if (heroB) { T(el.hero, `translate(${((1 - oC(closeP)) * 1080).toFixed(1)}px,110px) scale(${lerp(0.78, 0.82, pr(t, C.cut_close, DUR - C.cut_close)).toFixed(4)})`); el.hero.style.filter = closeP < 1 ? `blur(${((1 - closeP) * 10).toFixed(1)}px)` : "none";
      A(el["h-fill"], "opacity", 1); A(el["h-mis"], "opacity", 0.85); A(el["h-ring"], "opacity", 0); A(el["h-beans"], "opacity", 0); A(el["h-stem"], "opacity", 1); A(el["h-stem"], "transform", ""); A(el["h-cherry"], "transform", "translate(540,1010)"); }
    show(el.cta, ctaOn && closeP < 1 ? 1 : 0);
    if (ctaOn) { T(el.cta, `translate(${(-iC(closeP) * 1080).toFixed(1)}px,0) scale(${lerp(1, 1.04, pr(t, C.cut_cta, 2)).toFixed(4)})`);
      reveal(wEl[58], t, S(58)); T(el["cta-rule"], `scaleX(${oC(pr(t, S(58) + 0.08, 0.22)).toFixed(4)})`);
      stampBlock(el["cta-a"], t, C.cta_a); reveal(wEl[60], t, S(60)); stampBlock(el["cta-b"], t, C.cta_b); }
    show(el.closer, heroB ? 1 : 0);
    if (heroB) for (let i = 62; i <= 69; i++) reveal(wEl[i], t, S(i));
  }

  /* ===== الجسر التركوازي = الوقفة ===== */
  if (inBridge) { T(el.ask, `scale(${lerp(1, 1.06, pr(t, C.cut_bridge, C.cut_diag - C.cut_bridge)).toFixed(4)})`); for (const i of [11, 12, 13]) reveal(wEl[i], t, S(i)); }

  /* ===== الحبر الأسود: مقطع الثمرة ← تكبير ===== */
  if (inExplain) {
    const f = oC(pr(t, C.zoom - 0.08, 0.38));
    T(el.diagram, `scale(${(lerp(1, 1.04, pr(t, C.cut_diag, C.zoom - C.cut_diag)) * lerp(1, 1.3, f)).toFixed(4)})`);
    el.diagram.style.opacity = lerp(1, 0.2, f); el.diagram.style.filter = f > 0.02 ? `blur(${(f * 7).toFixed(1)}px)` : "none";
    const b = pr(t, C.beans, 0.3); A(el["d-beansS"], "opacity", t >= C.beans ? 1 : 0); A(el["d-beansS"], "transform", `scale(${oB(b).toFixed(4)})`);
    const fr = oB(pr(t, C.fruit, 0.4), 1.4), frOn = t >= C.fruit ? 1 : 0;
    for (const id of ["d-skin", "d-pulp", "d-muc", "d-mis"]) { A(el[id], "opacity", frOn); A(el[id], "transform", `scale(${Math.max(0.01, fr).toFixed(4)})`); }
    [C.l_skin, C.l_pulp, C.l_muc].forEach((t0, k) => {
      A(el["d-ln" + k], "stroke-dashoffset", (1 - oC(pr(t, t0 - 0.12, 0.22))).toFixed(4)); A(el["d-pt" + k], "opacity", t >= t0 - 0.05 ? 1 : 0);
      pop(el["d-lb" + k], t, t0, 0.28, k % 2 ? 3 : -3);
      const pulse = t >= t0 && t < t0 + 0.3 ? Math.sin(Math.PI * (t - t0) / 0.3) * 0.04 : 0;
      A(el[["d-skin", "d-pulp", "d-muc"][k]], "transform", `scale(${(Math.max(0.01, fr) + pulse).toFixed(4)})`);
    });
    // اللوحة: وش يبقى على الحبة (كاملة ← طبقة لزجة ← بدون) ← تنشف تحت الشمس
    const on = t >= C.zoom + 0.06; show(el.zp, on ? Math.min(1, pr(t, C.zoom + 0.06, 0.3) * 4) * (1 - pr(t, C.cut_ex - 0.12, 0.12)) : 0);
    if (on) { const p = pr(t, C.zoom + 0.06, 0.3); T(el.zp, `rotate(${lerp(-4, -1.5, oC(p)).toFixed(2)}deg) translateY(${((1 - oB(p, 1.4)) * 80).toFixed(1)}px) scale(${(lerp(0.9, 1, oC(p)) * lerp(1, 1.04, pr(t, C.zoom, C.cut_ex - C.zoom))).toFixed(4)})`);
      const state = t < C.cycle || t >= C.dry ? 0 : Math.floor((t - C.cycle) / 0.34) % 3;   // 0 كاملة · 1 طبقة لزجة بس · 2 بدون (تدور لين "تنشف")
      A(el["z-skin"], "opacity", state === 0 ? 1 : 0); A(el["z-pulp"], "opacity", state === 0 ? 1 : 0); A(el["z-mis"], "opacity", state === 0 ? 0.85 : 0); A(el["z-muc"], "opacity", state <= 1 ? 1 : 0);
      [0, 1, 2].forEach((k) => A(el["z-d" + k], "fill", k === state ? RED : "none"));
      const dr = oC(pr(t, C.dry, 0.5)); A(el["z-sun"], "opacity", dr); A(el["z-sun"], "cy", lerp(860, 600, dr).toFixed(1)); A(el["z-dry"], "opacity", (0.18 * dr).toFixed(3)); }
  }

  /* ===== الأرض الصفراء: مناشر التجفيف ===== */
  if (inEx) {
    let cx = BED.wsh, w = lerp(1500, 1080, oC(pr(t, C.cut_ex, 0.5)));
    if (t >= C.to_nat) cx = lerp(BED.wsh, BED.nat, ioC(pr(t, C.to_nat, 0.5)));
    if (t >= C.to_hon) cx = lerp(BED.nat, BED.hon, ioC(pr(t, C.to_hon, 0.42)));
    const hold = t >= C.to_hon ? pr(t, C.to_hon + 0.42, C.cut_cta - C.to_hon) : t >= C.to_nat ? pr(t, C.to_nat + 0.5, C.to_hon - C.to_nat) : pr(t, C.cut_ex + 0.5, C.to_nat - C.cut_ex);
    w *= lerp(1, 0.95, hold);
    A(el.ex, "viewBox", vb(cx, w));
    const wp = pr(t, C.to_hon, 0.42); el.ex.style.filter = wp > 0 && wp < 1 ? `blur(${(Math.sin(Math.PI * wp) * 8).toFixed(1)}px)` : "none";
    T($(".sunx", el.exw), `translate(${(-(cx - 600) * 0.06).toFixed(1)}px,0) rotate(${(t * 8).toFixed(1)}deg)`);
    exCard(t);
  } else if (exKey !== null) exCard(-1);

  show(el.loopimg, D.loop && loopReady ? pr(t, D.loop.start, D.loop.dur - 0.2) : 0);
}

/* ---------- فحص المناطق الآمنة ---------- */
function qa(t) {
  const out = [];
  document.querySelectorAll("[data-safe]").forEach((n) => {
    let o = 1; for (let p = n; p && p !== document.body; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity);
    if (o < 0.5 || getComputedStyle(n).visibility === "hidden" || getComputedStyle(n).display === "none") return;
    let r = n.getBoundingClientRect();
    if (n.classList.contains("card-text") || n.id === "excard") { const rs = [...n.querySelectorAll(n.id === "excard" ? "#exname, .chip" : ".row")].filter((x) => getComputedStyle(x).visibility !== "hidden" && parseFloat(getComputedStyle(x).opacity) > 0.5).map((x) => x.getBoundingClientRect()).filter((x) => x.width > 2); if (!rs.length) return;
      r = { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)), width: 9, height: 9 }; }
    if (r.width < 2 || r.height < 2) return;
    if ((n.id === "cta" && t >= C.cut_close - 0.12) || (n.closest("#diagram") && t >= C.zoom - 0.1)) return;
    const bad = r.top < 180 ? "top<180" : r.bottom > 1500 ? "bottom>1500" : (r.right > 962 && r.bottom > 800 && r.top < 1600) ? "right>960" : r.left < 0 || r.right > 1080 ? "offscreen" : null;
    if (bad) out.push({ type: "safe_zone", t: +t.toFixed(2), id: n.dataset.safe, why: bad, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
  });
  return out;
}

let loopReady = false;
window.__loop = D.loop || null;
window.__setLoopFrame = (src) => new Promise((res) => { el.loopimg.onload = () => { loopReady = true; res(true); }; el.loopimg.src = src; });
window.__qa = qa;
window.__meta = { id: D.id, style: D.style, duration: DUR, fps: D.fps };
window.renderFrame = renderFrame;
Promise.all([document.fonts.load('800 100px "Baloo Bhaijaan 2"', "قهوة"), document.fonts.load('800 100px "Baloo Bhaijaan 2"', "6"), document.fonts.ready]).then(() => { fitCaps(); renderFrame(0); window.__ready = true; });
