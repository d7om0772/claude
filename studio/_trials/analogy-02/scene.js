/* =============================================================================
 scene.js — التجربة الثانية لأسلوب "الشرح بالتشبيه" (trial-analogy-02): Win + Shift + S، تشبيه قطّاعة البسكوت.
 التصميم 2 "ورق فاتح": هوية فاتحة · مطبخ من فوق برسم ورق مقصوص · سطح مكتب كحلي بنوافذ بيضاء وأزرار مجسّمة.
 DOM + SVG فقط. دالة حتمية window.renderFrame(t) — نفس عقد render.cjs / snap.cjs.
 القواعد: بدون ذوات أرواح (جمادات فقط، والسكين والقطّاعة يتحركون بنفسهم) · بدون موسيقى · بدون شعارات شركات
 (زر Win نص فقط) · المناطق الآمنة · الحلقة.
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
const INK = "#14284B", NO = "#E5384A", YES = "#1FAE5B", BRAND = "#2F6BCF";
const KEYRX = /^(Win|Shift|S|Ctrl|V|R)$/;

const clean = (s) => s.replace(/[،.]+$/u, "");
function wordHTML(i, cls = "", keepPunct = false) {
  const raw = keepPunct ? W[i].w.replace(/[.]+$/u, "") : clean(W[i].w), core = raw.replace(/[،:]$/u, "");
  if (KEYRX.test(core)) return `<span class="w kc" data-i="${i}">${core}</span>`;
  if (core === "+") return `<span class="w pl" data-i="${i}">+</span>`;
  return `<span class="w ${cls}" data-i="${i}">${raw}</span>`;
}
function lineHTML(i0, i1) {                         // يجمع الأزرار المتتالية في مجموعة LTR عشان تنقرا "Ctrl + V" مو "V + Ctrl"
  let out = "", combo = "";
  for (let i = i0; i <= i1; i++) {
    const core = W[i].w.replace(/[،.:]+$/u, "");
    if (KEYRX.test(core) || core === "+") { combo += wordHTML(i); continue; }
    if (combo) { out += `<span class="combo">${combo}</span>`; combo = ""; }
    out += wordHTML(i, "", i < i1);
  }
  if (combo) out += `<span class="combo">${combo}</span>`;
  return out;
}

/* ---------- رسومات: كلها جمادات ---------- */
const stampArt = (id, ok, r = 60) => {
  const c = ok ? YES : NO;
  return `<g id="${id}" opacity="0"><circle r="${r * 1.08}" fill="rgba(0,0,0,.18)" transform="translate(4,8)"/><circle r="${r}" fill="#fff"/><circle r="${r * 0.82}" fill="${c}"/>` +
    (ok ? `<path d="M${-r * 0.4},${r * 0.02} L${-r * 0.1},${r * 0.32} L${r * 0.42},${-r * 0.3}" fill="none" stroke="#fff" stroke-width="${r * 0.2}" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="M${-r * 0.3},${-r * 0.3} L${r * 0.3},${r * 0.3} M${r * 0.3},${-r * 0.3} L${-r * 0.3},${r * 0.3}" stroke="#fff" stroke-width="${r * 0.2}" stroke-linecap="round"/>`) + `</g>`;
};
const SHADOW = `<filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="10"/></filter>`;
const knifeArt = (id) => `
<g id="${id}"><g transform="rotate(-28)">
  <g transform="translate(18,24)" fill="rgba(80,40,10,.22)"><path d="M0,0 L-6,-40 L4,-205 L60,-212 L54,-24 Z"/><rect x="8" y="-336" width="48" height="132" rx="20"/></g>
  <path d="M0,0 L-6,-40 L4,-205 L60,-212 L54,-24 Z" fill="#E6EBF1"/><path d="M0,0 L-6,-40 L4,-205 L18,-206 L12,-30 Z" fill="#FFFFFF" opacity=".8"/>
  <path d="M30,-209 L60,-212 L54,-24 L40,-30 Z" fill="#C3CCD8"/>
  <rect x="8" y="-336" width="48" height="132" rx="20" fill="#2B2F38"/>
  ${[-306, -270, -234].map((y) => `<circle cx="32" cy="${y}" r="6" fill="#A7B2C2"/>`).join("")}
</g></g>`;
const cutterArt = (id, w, h, rx, sw, handle = true) => `
<g id="${id}">
  <rect x="${-w / 2 + 14}" y="${-h / 2 + 26}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="rgba(60,30,10,.25)" stroke-width="${sw}" filter="url(#soft)"/>
  <rect x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" rx="${rx}" fill="none" stroke="url(#steel)" stroke-width="${sw}"/>
  <rect x="${-w / 2 - sw / 2 + 3}" y="${-h / 2 - sw / 2 + 3}" width="${w + sw - 6}" height="${h + sw - 6}" rx="${rx + sw / 2 - 3}" fill="none" stroke="#F6F8FB" stroke-width="${Math.max(3, sw * 0.16)}" opacity=".9"/>
  ${handle ? `<rect x="${-w * 0.42 + 8}" y="${-sw * 0.36 + 14}" width="${w * 0.84}" height="${sw * 0.72}" rx="${sw * 0.36}" fill="rgba(60,30,10,.18)" filter="url(#soft)"/>
  <rect x="${-w * 0.42}" y="${-sw * 0.36}" width="${w * 0.84}" height="${sw * 0.72}" rx="${sw * 0.36}" fill="url(#steelH)"/>` : ""}
</g>`;
const STEEL_DEFS = `<linearGradient id="steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#EEF2F6"/><stop offset=".45" stop-color="#B9C3D0"/><stop offset=".7" stop-color="#DCE2EA"/><stop offset="1" stop-color="#8E9AAB"/></linearGradient>
<linearGradient id="steelH" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F7FA"/><stop offset="1" stop-color="#AEB8C6"/></linearGradient>`;
const cookieArt = (x, y, w, h, id = "") => `<g ${id ? `id="${id}"` : ""} transform="translate(${x},${y})">
  <rect x="8" y="16" width="${w}" height="${h}" rx="22" fill="rgba(90,45,10,.28)" filter="url(#soft)"/>
  <rect width="${w}" height="${h}" rx="22" fill="#D4924A"/><rect x="8" y="6" width="${w - 16}" height="${h - 18}" rx="18" fill="#E7AE63"/>
  ${[0, 1, 2].map((r) => [0, 1, 2].map((c) => `<circle cx="${w * (0.28 + c * 0.22)}" cy="${h * (0.3 + r * 0.2)}" r="5" fill="#C27F3A"/>`).join("")).join("")}
</g>`;
// المسارات العوجا (قص بالسكين) والمستطيل المضبوط (القطّاعة)
const PA = [[196, 268], [262, 262], [330, 278], [402, 256], [478, 272], [488, 350], [470, 420], [492, 502], [476, 590], [400, 604], [322, 586], [252, 606], [188, 596], [200, 514], [180, 440], [202, 350], [196, 268]];
const PB = [[150, 215], [205, 205], [262, 222], [318, 203], [354, 222], [360, 290], [346, 350], [364, 412], [344, 446], [290, 456], [236, 438], [182, 454], [146, 440], [158, 380], [140, 318], [160, 262], [150, 215]];
const pts = (P) => P.map((p) => p.join(",")).join(" ");
const DOUGH = "M80,150 C200,118 420,132 600,140 C622,260 610,420 622,560 C626,680 606,760 590,800 C420,822 260,812 84,800 C66,640 74,470 62,320 C60,240 68,190 80,150 Z";
const doughArt = (p) => `
  <path d="${DOUGH}" transform="translate(10,16)" fill="rgba(120,70,20,.22)" filter="url(#soft)"/>
  <path d="${DOUGH}" fill="#F1CC91"/><path d="${DOUGH}" fill="none" stroke="#E6B979" stroke-width="10" opacity=".7"/>
  ${[[150, 220], [520, 210], [560, 690], [130, 700], [330, 760], [470, 470], [120, 520], [560, 380]].map(([x, y], k) => `<circle cx="${x}" cy="${y}" r="${4 + (k % 3)}" fill="#DDAE6A" opacity=".7"/>`).join("")}`;
const trayBase = `<rect x="22" y="22" width="632" height="912" rx="20" fill="#F4EBDA"/><rect x="22" y="22" width="632" height="912" rx="20" fill="none" stroke="#E6DAC4" stroke-width="6"/>`;

const traySVG = (p) => `
<svg width="676" height="956" viewBox="0 0 676 956" xmlns="http://www.w3.org/2000/svg">
 <defs>${SHADOW}${STEEL_DEFS}</defs>
 <g id="${p}work">
  ${trayBase}${doughArt(p)}
  ${p === "a-" ? `
   <polygon points="${pts(PA)}" fill="#DCAE6C" id="a-hole" opacity="0"/>
   <g id="a-piece" opacity="0"><polygon points="${pts(PA)}" transform="translate(12,18)" fill="rgba(110,60,15,.32)" filter="url(#soft)"/><polygon points="${pts(PA)}" fill="#F4D6A2"/></g>
   <polyline id="a-groove" points="" fill="none" stroke="#B5844A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
   ${stampArt("a-x", false)}
   <g id="a-knifeG">${knifeArt("a-knife")}</g>` : `
   ${[[70, 828, -6], [262, 846, 5]].map(([x, y, r]) => `<g transform="translate(${x},${y}) rotate(${r})"><polygon points="0,6 40,0 92,10 150,2 156,40 150,74 96,82 44,72 4,80 8,42" transform="translate(6,12)" fill="rgba(110,60,15,.25)" filter="url(#soft)"/><polygon points="0,6 40,0 92,10 150,2 156,40 150,74 96,82 44,72 4,80 8,42" fill="#F4D6A2"/></g>`).join("")}
   <polygon points="${pts(PB)}" fill="#DCAE6C" id="b-hole" opacity="0"/>
   <polyline id="b-groove" points="" fill="none" stroke="#B5844A" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
   <rect id="b-dent" x="300" y="480" width="260" height="240" rx="24" fill="none" stroke="#B5844A" stroke-width="8" opacity="0"/>
   <g id="b-piece" opacity="0"><rect x="300" y="480" width="260" height="240" rx="24" transform="translate(12,18)" fill="rgba(110,60,15,.32)" filter="url(#soft)"/><rect x="300" y="480" width="260" height="240" rx="24" fill="#F4D6A2"/></g>
   ${stampArt("b-x", false)}${stampArt("b-ok", true)}
   <g id="b-knifeG">${knifeArt("b-knife")}</g>
   <g id="b-cutterG">${cutterArt("b-cutter", 260, 240, 24, 22)}</g>`}
 </g>
 ${p === "b-" ? `<g id="b-batch">${trayBase}
   ${[0, 1, 2].map((r) => [0, 1].map((c) => cookieArt(96 + c * 256, 110 + r * 236, 228, 196, `ck${r * 2 + c}`)).join("")).join("")}
   ${stampArt("b-ok2", true, 70)}</g>` : ""}
</svg>`;

/* ---------- واجهات (نوافذ بيضاء بدون صور أو أفاتار) ---------- */
const barsArt = (id, x, y, s = 1) => `<g ${id ? `id="${id}"` : ""} transform="translate(${x},${y}) scale(${s})">
  <rect width="500" height="300" rx="22" fill="#fff" stroke="#DCE3EE" stroke-width="4"/>
  <rect x="300" y="28" width="170" height="20" rx="10" fill="#14284B" opacity=".8"/>
  <path d="M40,262 H460" stroke="#C9D3E2" stroke-width="4"/>
  ${[90, 150, 120, 200, 170].map((h, k) => `<rect class="bar" data-h="${h}" x="${60 + k * 82}" y="${262 - h}" width="56" height="${h}" rx="10" fill="${k % 2 ? "#6B9FE9" : BRAND}"/>`).join("")}
</g>`;
const pageArt = (p) => `
  <rect x="220" y="40" width="520" height="34" rx="12" fill="#14284B" opacity=".85"/>
  ${[[100, 640], [140, 560], [180, 600]].map(([y, w]) => `<rect x="${740 - w}" y="${y}" width="${w}" height="18" rx="9" fill="#C9D3E2"/>`).join("")}
  ${barsArt(p + "chart", 150, 230)}
  ${[[580, 620], [620, 540], [660, 600]].map(([y, w]) => `<rect x="${740 - w}" y="${y}" width="${w}" height="18" rx="9" fill="#C9D3E2"/>`).join("")}`;
const antsArt = (id) => `<g id="${id}" opacity="0"><rect class="a1" fill="none" stroke="${BRAND}" stroke-width="10"/><rect class="a2" fill="none" stroke="#fff" stroke-width="5" stroke-dasharray="22 16"/></g>`;
const cursorArt = (id) => `<path id="${id}" d="M0,0 L0,52 L13,40 L23,62 L33,57 L23,36 L40,36 Z" fill="#fff" stroke="${INK}" stroke-width="4" stroke-linejoin="round" opacity="0"/>`;
const miniBar = (id, sel = 0) => `<g id="${id}" opacity="0"><rect x="-150" y="-30" width="300" height="60" rx="30" fill="#fff" filter="url(#soft2)"/><rect x="-150" y="-30" width="300" height="60" rx="30" fill="#fff"/>
  ${[0, 1, 2, 3].map((k) => `<rect x="${92 - k * 62}" y="-22" width="44" height="44" rx="12" fill="${k === sel ? BRAND : "#EEF3FB"}"/>`).join("")}
  <rect x="100" y="-10" width="28" height="20" rx="3" fill="none" stroke="${sel === 0 ? "#fff" : INK}" stroke-width="4" stroke-dasharray="6 4"/>
  <path d="M46,-10 C30,-12 28,6 40,10 C52,14 58,0 50,-6" fill="none" stroke="${INK}" stroke-width="4" stroke-dasharray="6 4"/>
  <rect x="-24" y="-12" width="30" height="24" rx="3" fill="none" stroke="${INK}" stroke-width="4"/><path d="M-24,-5 H6" stroke="${INK}" stroke-width="4"/>
  <path d="M-86,-12 h-8 v8 M-68,-12 h8 v8 M-86,12 h-8 v-8 M-68,12 h8 v-8" fill="none" stroke="${INK}" stroke-width="4"/>
  <path d="M-128,-8 l16,16 M-112,-8 l-16,16" stroke="#8C9AB0" stroke-width="4" stroke-linecap="round"/></g>`;
const keysHTML = (id, labels, cls = "") => `<div class="keys ${cls}" id="${id}" data-safe="${id}">${labels.map((l, k) => (k ? `<span class="plus">+</span>` : "") + `<div class="key" id="${id}-${k}">${l}</div>`).join("")}</div>`;
const clipboardArt = (id) => `<g id="${id}" opacity="0">
  <rect x="10" y="18" width="130" height="170" rx="18" fill="rgba(0,0,0,.18)" filter="url(#soft2)"/>
  <rect width="130" height="170" rx="18" fill="#B7834F"/><rect x="14" y="26" width="102" height="132" rx="8" fill="#fff"/>
  <rect x="37" y="-12" width="56" height="34" rx="10" fill="#8E9AAB"/><rect x="47" y="-4" width="36" height="12" rx="6" fill="#C9D1DC"/>
  <g id="${id}-thumb" opacity="0">${[30, 52, 42, 66, 58].map((h, k) => `<rect x="${24 + k * 18}" y="${136 - h}" width="12" height="${h}" rx="3" fill="${k % 2 ? "#6B9FE9" : BRAND}"/>`).join("")}</g>
  <text x="65" y="232" text-anchor="middle" font-family="Baloo Bhaijaan 2" font-weight="800" font-size="34" fill="${INK}" direction="rtl">الحافظة</text></g>`;
const bubble = (x, y, w, h, out, lines) => `<g transform="translate(${x},${y})"><rect width="${w}" height="${h}" rx="26" fill="${out ? "#DCE8FB" : "#fff"}" stroke="${out ? "#C3D6F6" : "#DCE3EE"}" stroke-width="3"/>
  ${lines.map((lw, k) => `<rect x="${w - 30 - lw}" y="${26 + k * 30}" width="${lw}" height="16" rx="8" fill="${out ? "#A9C3EE" : "#C9D3E2"}"/>`).join("")}</g>`;

/* ---------- بناء DOM ---------- */
stage.innerHTML = `
<div class="world" id="brand">
  <div id="hero"><svg width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs>${STEEL_DEFS}${SHADOW}<filter id="halo" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="22"/></filter></defs>
    ${[[300, 1260, 34], [790, 1290, 26], [690, 760, 18], [250, 820, 14], [840, 960, 20]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity=".9"/>`).join("")}
    <g id="h-cookie" opacity="0">${cookieArt(330, 832, 420, 296)}</g>
    <rect id="h-halo" x="280" y="790" width="520" height="380" rx="64" fill="none" stroke="#4F92FF" stroke-width="56" filter="url(#halo)" opacity="0"/>
    <g transform="translate(540,980)">${cutterArt("h-cutter", 520, 380, 64, 44)}</g>
    <g id="h-ants" opacity="0"><rect x="280" y="790" width="520" height="380" rx="64" fill="none" stroke="${BRAND}" stroke-width="12"/><rect id="h-ants2" x="280" y="790" width="520" height="380" rx="64" fill="none" stroke="#fff" stroke-width="6" stroke-dasharray="30 20"/></g>
  </svg></div>
  <div class="card-text" id="hook" style="top:742px;font-size:128px" data-safe="hook"><div class="row">${wordHTML(0)}${wordHTML(1)}</div><div class="row">${wordHTML(2)}${wordHTML(3, "acc mark")}</div></div>
  <div class="card-text" id="cta" style="top:610px" data-safe="cta">
    <div class="row" style="font-size:92px">${wordHTML(83)}</div>
    <div class="rule" id="cta-rule" style="width:620px;margin:16px 0 4px"></div>
    <div class="row acc" id="cta-word" style="font-size:228px;line-height:1.2"><span class="w mark">«${clean(W[84].w)}»</span></div>
    <div class="row" style="font-size:86px;margin-top:4px">${wordHTML(85)}${wordHTML(86)}</div>
  </div>
  <div class="card-text" id="closer" style="top:236px" data-safe="closer">
    <div class="row" style="font-size:108px">${wordHTML(87)}${wordHTML(88, "acc")}</div>
    <div class="row" style="font-size:70px;color:#5B6B82">${[89, 90, 91, 92].map((i) => wordHTML(i)).join("")}</div>
  </div>
  <div id="logo-tile" style="left:455px;top:1250px"><img src="../../../brand/logo/icon_transparent.png" alt=""></div>
</div>
<div class="world" id="bridge"><div class="card-text" id="imagine" style="top:850px;font-size:146px;color:#fff" data-safe="imagine"><div class="row">${wordHTML(12)}${wordHTML(13)}${wordHTML(14)}</div></div></div>
<div class="world" id="story">
  <div id="wood"></div>
  <div id="counter">
    <svg class="prop" style="position:absolute;left:150px;top:150px" width="820" height="380" viewBox="-110 -60 820 380"><defs><filter id="cs1" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="12"/></filter></defs>
      <g transform="translate(110,180) rotate(-14)"><rect x="18" y="30" width="560" height="74" rx="37" fill="rgba(80,40,10,.25)" filter="url(#cs1)"/><rect x="-60" y="22" width="110" height="46" rx="23" fill="#B98A5E"/><rect x="530" y="22" width="110" height="46" rx="23" fill="#B98A5E"/><rect width="560" height="92" rx="46" fill="#EAD3B2"/><rect x="20" y="12" width="520" height="18" rx="9" fill="#F6E7D0"/></g></svg>
    ${[[1650, 520, 120], [1200, 1980, 150], [520, 1900, 110], [2050, 1500, 90], [2180, 560, 60], [760, 1520, 70]].map(([x, y, r]) => `<div class="prop" style="position:absolute;left:${x - r}px;top:${y - r}px;width:${r * 2}px;height:${r * 2}px;border-radius:50%;background:radial-gradient(circle at 65% 35%, rgba(255,255,255,.55) 0 ${r * 0.3}px, rgba(255,255,255,.32) ${r * 0.32}px)"></div>`).join("")}
    <div class="prop" style="position:absolute;left:1710px;top:1790px;width:380px;height:380px;border-radius:50%;background:radial-gradient(circle, #F1CC91 0 140px, #C9D1DC 141px 150px, #E9EEF4 151px);box-shadow:16px 26px 34px rgba(80,40,10,.25)"></div>
  </div>
  <div class="tray" id="trayA"><div class="in">${traySVG("a-")}</div></div>
  <div class="tray" id="trayB"><div class="in">${traySVG("b-")}</div></div>
  <div class="fill" id="freezeSat" style="background:#808080;mix-blend-mode:saturation;opacity:0"></div><div class="fill" id="freezeDim" style="background:#000;opacity:0"></div>
  <div class="sticker" id="sticker"><span data-safe="sticker">${clean(W[23].w)}</span></div>
</div>
<div class="world" id="explain">
  <div class="bloom"></div>
  <div id="link">
    <div class="card-text" id="link-t1" style="top:640px;font-size:104px;color:#fff" data-safe="link"><div class="row">${wordHTML(30)}${wordHTML(31, "", true)}</div></div>
    ${keysHTML("link-keys", ["Win", "Shift", "S"]).replace('class="keys "', 'class="keys" style="left:0;right:0;top:842px"')}
    <div class="rule" id="link-rule" style="position:absolute;left:250px;width:580px;top:1066px;box-shadow:0 0 26px rgba(79,146,255,.9)"></div>
    <div class="card-text" id="link-t2" style="top:1102px;font-size:84px;color:#fff" data-safe="link2"><div class="row">${wordHTML(37)}${wordHTML(38)}</div></div>
  </div>
  <div id="diagram">
    <svg class="fill" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs><linearGradient id="wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F6BCF"/><stop offset="1" stop-color="#9CC2F3"/></linearGradient>
        <clipPath id="scr"><rect x="172" y="492" width="736" height="426" rx="14"/></clipPath>
        <filter id="glw" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter></defs>
      <rect x="500" y="938" width="80" height="54" fill="#22355E"/><rect x="430" y="988" width="220" height="16" rx="8" fill="#22355E"/>
      <rect x="150" y="470" width="780" height="470" rx="30" fill="#0A1226" stroke="#2B3E66" stroke-width="4"/>
      <g clip-path="url(#scr)">
        <rect x="172" y="492" width="736" height="426" fill="url(#wall)"/><circle cx="760" cy="580" r="170" fill="#fff" opacity=".14"/>
        <g opacity=".95"><rect x="230" y="620" width="300" height="200" rx="14" fill="#fff"/><rect x="230" y="620" width="300" height="34" rx="14" fill="#E7EDF6"/>${[680, 712, 744].map((y, k) => `<rect x="${500 - [220, 180, 200][k]}" y="${y}" width="${[220, 180, 200][k]}" height="14" rx="7" fill="#C9D3E2"/>`).join("")}</g>
        <g opacity=".95"><rect x="580" y="660" width="260" height="170" rx="14" fill="#fff"/><rect x="580" y="660" width="260" height="34" rx="14" fill="#E7EDF6"/>${barsArt("", 600, 706, 0.44)}</g>
        <rect x="172" y="872" width="736" height="46" fill="#14284B" opacity=".55"/>${[0, 1, 2, 3].map((k) => `<rect x="${470 + k * 40}" y="882" width="26" height="26" rx="6" fill="#fff" opacity=".8"/>`).join("")}
        <rect id="d-dim" x="172" y="492" width="736" height="426" fill="#0A1226" opacity="0"/>
        <g id="d-bar" transform="translate(540,-80)"><rect x="-210" y="-40" width="420" height="80" rx="40" fill="#fff"/>
          ${[0, 1, 2, 3].map((k) => `<rect id="d-ic${k}" x="${110 - k * 90}" y="-30" width="60" height="60" rx="16" fill="#EEF3FB"/>`).join("")}
          <g id="d-icons" fill="none" stroke-width="5">
            <rect id="d-g0" x="122" y="-14" width="36" height="28" rx="4" stroke="${INK}" stroke-dasharray="8 5"/>
            <path id="d-g1" d="M50,-14 C28,-16 26,8 42,12 C58,16 64,-2 54,-8" stroke="${INK}" stroke-dasharray="8 5"/>
            <g id="d-g2" stroke="${INK}"><rect x="-58" y="-15" width="36" height="30" rx="4"/><path d="M-58,-6 H-22"/></g>
            <path id="d-g3" d="M-146,-14 h-10 v10 M-124,-14 h10 v10 M-146,14 h-10 v-10 M-124,14 h10 v-10" stroke="${INK}"/></g>
          <path d="M-184,-10 l20,20 M-164,-10 l-20,20" stroke="#8C9AB0" stroke-width="5" stroke-linecap="round"/></g>
      </g>
      ${[0, 1, 2, 3].map((k) => { const ix = 680 - k * 90, tx = 847 - k * 205; return `<path id="d-sp${k}" d="M${ix},584 C${ix},820 ${tx},820 ${tx},1046" fill="none" stroke="#7DB4FF" stroke-width="6" stroke-linecap="round" filter="url(#glw)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`; }).join("")}
    </svg>
    ${[["مستطيل", `<rect x="22" y="18" width="100" height="72" rx="8" fill="none" stroke="${BRAND}" stroke-width="7" stroke-dasharray="16 10"/>`],
       ["رسم حر", `<path d="M40,26 C10,30 8,78 46,88 C86,98 126,82 118,50 C110,20 82,40 66,22 C58,14 50,20 40,26 Z" fill="none" stroke="${BRAND}" stroke-width="7" stroke-dasharray="16 10"/>`],
       ["نافذة", `<rect x="20" y="16" width="104" height="76" rx="10" fill="#EEF3FB" stroke="${BRAND}" stroke-width="7"/><path d="M20,36 H124" stroke="${BRAND}" stroke-width="7"/>`],
       ["الشاشة<br>كاملة", `<rect x="16" y="14" width="112" height="78" rx="8" fill="#EEF3FB" stroke="#C9D3E2" stroke-width="4"/><path d="M14,34 v-22 h22 M108,12 h22 v22 M14,74 v22 h22 M108,96 h22 v-22" fill="none" stroke="${BRAND}" stroke-width="7" stroke-linecap="round"/>`]]
      .map(([l, g], k) => `<div class="tile" id="d-t${k}" style="left:${752 - k * 205}px;top:1050px"><svg width="144" height="108" viewBox="0 0 144 108">${g}</svg><div class="lbl" data-safe="d-t${k}">${l}</div></div>`).join("")}
  </div>
  <!-- 1) اسحب ← الحافظة -->
  <div class="win" id="win1"><div class="bar"><div class="ctl"><i></i><i></i><i></i></div></div><div class="step">1</div>
    <div class="body"><svg width="800" height="726" viewBox="0 0 800 726">
      <defs><filter id="soft2" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="8"/></filter>
        <mask id="m1"><rect width="800" height="726" fill="#fff"/><rect id="m1-hole" x="0" y="0" width="0" height="0" rx="6" fill="#000"/></mask></defs>
      ${pageArt("p1-")}
      <rect id="w1-dim" width="800" height="726" fill="#0E1A33" opacity="0" mask="url(#m1)"/>
      ${antsArt("w1-ants")}
      <g id="w1-piece" opacity="0">${barsArt("", 0, 0)}</g>
      <g transform="translate(400,30)">${miniBar("w1-mini")}</g>
      ${clipboardArt("w1-clip")}
      ${stampArt("w1-ok", true, 50)}
      ${cursorArt("w1-cur")}
    </svg></div></div>
  <!-- 2) Ctrl + V في المحادثة -->
  <div class="win" id="win2"><div class="bar"><div class="tab on" id="w2-tab0">محادثة</div><div class="tab" id="w2-tab1">ملف</div><div class="ctl"><i></i><i></i><i></i></div></div><div class="step">2</div>
    <div class="body"><svg width="800" height="726" viewBox="0 0 800 726">
      ${bubble(380, 40, 360, 104, false, [280, 200])}${bubble(60, 170, 340, 74, true, [240])}${bubble(300, 270, 440, 104, false, [360, 260])}
      <g id="w2-img" opacity="0"><g transform="translate(60,400)"><rect width="400" height="232" rx="26" fill="#DCE8FB" stroke="#C3D6F6" stroke-width="3"/>${barsArt("", 20, 18, 0.72)}</g></g>
      ${stampArt("w2-ok", true, 50)}
      <rect x="40" y="652" width="720" height="58" rx="29" fill="#fff" stroke="#DCE3EE" stroke-width="3"/><rect id="w2-caret" x="716" y="666" width="5" height="30" rx="2" fill="${BRAND}"/>
    </svg></div></div>
  ${keysHTML("w2-keys", ["Ctrl", "V"], "sm").replace('class="keys sm"', 'class="keys sm" style="left:0;right:0;top:1366px"')}
  <!-- 3) بونص: Win + Shift + R -->
  <div class="win" id="win3"><div class="bar"><div class="ctl"><i></i><i></i><i></i></div></div><div class="step ar" id="w3-bonus">بونص</div>
    <div class="body"><svg width="800" height="726" viewBox="0 0 800 726">
      <g id="w3-page" opacity="0">${pageArt("p3-")}${antsArt("w3-ants")}
        <g id="w3-rec" opacity="0"><rect x="430" y="150" width="236" height="52" rx="26" fill="#fff" stroke="#DCE3EE" stroke-width="3"/><circle id="w3-dot" cx="636" cy="176" r="12" fill="${NO}"/>
          <text x="610" y="188" text-anchor="end" font-family="Inter" font-weight="800" font-size="30" fill="${INK}" id="w3-time">00:00</text><text x="470" y="188" font-family="Inter" font-weight="800" font-size="24" fill="${NO}" text-anchor="middle">REC</text></g></g>
    </svg>
    ${keysHTML("w3-keys", ["Win", "Shift", "R"]).replace('class="keys "', 'class="keys" style="left:0;right:0;top:230px"')}</div></div>
</div>
<div id="cap"><div class="pill" id="capline" data-safe="caption"></div></div>
<canvas id="grain" width="540" height="960" style="width:1080px;height:1920px"></canvas>
<img id="loopimg" alt="">`;

/* ---------- حبيبات ورق ثابتة (PRNG ببذرة) ---------- */
{
  const cv = $("#grain"), cx = cv.getContext("2d"), im = cx.createImageData(540, 960); let s = 20261116;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < im.data.length; i += 4) { const v = 170 + rnd() * 85; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  cx.putImageData(im, 0, 0);
}

/* ---------- مراجع ---------- */
const el = {}; document.querySelectorAll("[id]").forEach((n) => (el[n.id] = n));
const PROPS = [...document.querySelectorAll("#counter .prop")];
const wEl = {}; document.querySelectorAll(".w[data-i]").forEach((n) => (wEl[n.dataset.i] = n));
const show = (n, v) => { n.style.opacity = v; };
const T = (n, s) => { n.style.transform = s; };
const A = (n, k, v) => n.setAttribute(k, v);

function reveal(n, t, ts, grow = false) {           // ظهور الكلمة: تطلع من تحت لفوق (التصميم 1 كان blur). grow: الكبسولة تكبر معها
  if (t < ts - 0.03) { if (grow) n.style.display = "none"; else n.style.visibility = "hidden"; return; }
  const p = pr(t, ts - 0.03, 0.16); n.style.visibility = "visible"; if (grow) n.style.display = "inline-block"; n.style.opacity = Math.min(1, p * 1.6);
  n.style.transform = `translateY(${((1 - oB(p, 1.6)) * 0.32).toFixed(3)}em)`;
}
function stamp(g, t, t0, x, y, base = 1) {
  if (t < t0) { A(g, "opacity", 0); return; }
  const p = pr(t, t0, 0.13), k = t - t0 - 0.13;
  const s = base * (p < 1 ? lerp(2.2, 1, iC(p)) : 1 + 0.07 * Math.exp(-k * 16) * Math.cos(k * 46));
  A(g, "opacity", Math.min(1, p * 3)); A(g, "transform", `translate(${x},${y}) scale(${s.toFixed(4)}) rotate(${p < 1 ? (1 - p) * -14 : 0})`);
}
function pop(n, t, t0, d = 0.3, rot = 9) {
  if (t < t0) { show(n, 0); return 0; }
  const p = pr(t, t0, d); show(n, Math.min(1, p * 4)); T(n, `scale(${oB(p).toFixed(4)}) rotate(${((1 - oC(p)) * rot).toFixed(2)}deg)`); return p;
}
function popG(g, t, t0, x, y, d = 0.28) {          // نفس pop لعناصر SVG
  if (t < t0) { A(g, "opacity", 0); return 0; }
  const p = pr(t, t0, d); A(g, "opacity", Math.min(1, p * 4)); A(g, "transform", `translate(${x},${y}) scale(${oB(p).toFixed(4)})`); return p;
}
function keyState(n, t, t0, hold = 0.2, stay = false, appear = null) {   // زر ينضغط على كلمته (appear: يطلع بنطّة قبلها)
  const down = t >= t0 && (stay || t < t0 + hold);
  n.classList.toggle("down", down);
  const k = t - t0, bounce = k >= 0 && k < 0.12 ? Math.sin(Math.PI * k / 0.12) : 0;
  let sc = 1 - 0.04 * bounce, rot = 0;
  if (appear !== null) { if (t < appear) { show(n, 0); return; } const p = pr(t, appear, 0.24); show(n, Math.min(1, p * 4)); sc *= oB(p); rot = (1 - oC(p)) * 6; }
  T(n, `translateY(${down ? 11 : 0}px) scale(${sc.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`);
}
// المشي على مسار مكسّر
function walker(P) {
  const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
  return (p) => { const d = clamp(p) * L[L.length - 1]; let i = 1; while (i < L.length - 1 && L[i] < d) i++;
    const q = (d - L[i - 1]) / Math.max(1e-6, L[i] - L[i - 1]), x = lerp(P[i - 1][0], P[i][0], q), y = lerp(P[i - 1][1], P[i][1], q);
    return { x, y, done: P.slice(0, i).concat([[x, y]]) }; };
}
const walkA = walker(PA), walkB = walker(PB);
function knife(gid, groove, walk, t, t0, dur, exitAt, offX = 0) {
  const g = el[gid];
  if (t < t0 - 0.25 || t > exitAt + 0.5) { A(g, "opacity", 0); A(el[groove], "points", t > exitAt ? pts(walk(1).done) : ""); return; }
  const inP = oC(pr(t, t0 - 0.25, 0.25)), outP = iC(pr(t, exitAt, 0.4)), w = walk(pr(t, t0, dur));
  const x = w.x + (1 - inP) * 260 + outP * 340 + offX, y = w.y - (1 - inP) * 160 - outP * 420;
  A(g, "opacity", 1); A(g, "transform", `translate(${x.toFixed(1)},${y.toFixed(1)})`);
  A(el[groove], "points", t >= t0 ? pts(w.done) : "");
}

/* ---------- الكابشن ---------- */
const CAPS = D.captions.map((c) => { const n = c.i1 - c.i0 + 1; return { ...c, html: lineHTML(c.i0, c.i1), fs: n <= 2 ? 92 : n === 3 ? 84 : n === 4 ? 76 : 70 }; });
function fitCaps() {
  for (const c of CAPS) {
    el.capline.style.fontSize = c.fs + "px"; el.capline.innerHTML = c.html;
    const w = el.capline.getBoundingClientRect().width; if (w > 836) c.fs = Math.floor(c.fs * 836 / w);
  }
  el.capline.innerHTML = "";
  for (const id of ["hook", "imagine", "link-t1", "cta", "closer"]) {
    const n = el[id]; const rows = [...n.querySelectorAll(".row")];
    for (const r of rows) { const w = r.scrollWidth, fs = parseFloat(getComputedStyle(r).fontSize); if (w > 780) r.style.fontSize = Math.floor(fs * 780 / w) + "px"; }
  }
}
let capIdx = -2, capWords = [];
function caption(t) {
  const i = CAPS.findIndex((c) => t >= c.start && t < c.end);
  if (i !== capIdx) { capIdx = i; el.capline.innerHTML = i < 0 ? "" : CAPS[i].html; if (i >= 0) el.capline.style.fontSize = CAPS[i].fs + "px"; capWords = [...el.capline.querySelectorAll(".w")]; }
  if (i >= 0) { const c = CAPS[i], p = pr(t, c.start, 0.18); T(el.capline, `scale(${lerp(0.9, 1, oB(p, 1.6)).toFixed(4)})`); show(el.capline, Math.min(1, p * 3)); }
  for (const n of capWords) reveal(n, t, S(+n.dataset.i), true);
  for (const c of el.capline.querySelectorAll(".combo")) c.style.display = [...c.children].some((x) => x.style.display !== "none") ? "inline-flex" : "none";
}

/* ---------- الرندر ---------- */
const inFlash = (t, cut) => (t >= cut - 0.2 && t < cut - 0.134) || (t >= cut - 0.067 && t < cut);
function renderFrame(t) {
  t = clamp(t, 0, DUR);
  const inBrand = t < C.cut_bridge || t >= C.cut_cta, inBridge = t >= C.cut_bridge && t < C.cut_story, inStory = t >= C.cut_story && t < C.cut_link, inExplain = t >= C.cut_link && t < C.cut_cta;
  show(el.brand, inBrand ? 1 : 0); show(el.bridge, inBridge ? 1 : 0); show(el.story, inStory ? 1 : 0); show(el.explain, inExplain ? 1 : 0);
  stage.style.filter = inFlash(t, C.cut_bridge) || inFlash(t, C.cut_link) ? "invert(1)" : "none";
  el.grain.style.opacity = inStory ? 0.42 : inExplain ? 0.1 : 0.16;
  caption(t);

  /* ===== عالم الهوية: الهوك ← القطّاعة (البطل) ← (CTA ← الختام) ===== */
  if (inBrand) {
    const hookOn = t < C.cut_answer, heroA = t >= C.cut_answer && t < C.cut_bridge, closeP = pr(t, C.cut_close - 0.1, 0.22), heroB = closeP > 0, ctaOn = t >= C.cut_cta;
    show(el.hook, hookOn ? 1 : 0);
    if (hookOn) { T(el.hook, `scale(${lerp(1, 1.05, t / C.cut_answer).toFixed(4)})`);
      for (let i = 0; i <= 3; i++) { const k = t - S(i), b = k >= 0 && k < 0.3 ? Math.sin(Math.PI * k / 0.3) * 0.09 : 0; wEl[i].style.visibility = "visible"; wEl[i].style.opacity = 1; T(wEl[i], `translateY(${(-b * 0.4).toFixed(3)}em) scale(${(1 + b).toFixed(4)})`); } }
    show(el.hero, heroA || heroB ? 1 : 0);
    const ants = (on, k) => { A(el["h-ants"], "opacity", on); A(el["h-ants2"], "stroke-dashoffset", (-t * 90).toFixed(1)); A(el["h-halo"], "opacity", on * (0.55 + 0.15 * Math.sin(t * 8)) * k); };
    if (heroA) { const p = pr(t, C.cut_answer, 0.34), push = lerp(1, 1.06, pr(t, C.cut_answer + 0.34, C.cut_bridge - C.cut_answer));
      const kb = t - C.cutter, bump = kb >= 0 ? 0.06 * Math.exp(-kb * 7) * Math.sin(kb * 30) : 0;
      T(el.hero, `scale(${(lerp(3.1, 1, oC(p)) * push + bump).toFixed(4)})`); el.hero.style.filter = p < 1 ? `blur(${((1 - p) * 18).toFixed(1)}px)` : "none";
      A(el["h-cookie"], "opacity", 0); ants(t >= C.ants ? oC(pr(t, C.ants, 0.18)) : 0, 1); }
    if (heroB) { T(el.hero, `translate(${((1 - oC(closeP)) * 1080).toFixed(1)}px,0) scale(${lerp(1, 1.05, pr(t, C.cut_close, DUR - C.cut_close)).toFixed(4)})`); el.hero.style.filter = closeP < 1 ? `blur(${((1 - closeP) * 10).toFixed(1)}px)` : "none";
      A(el["h-cookie"], "opacity", 1); ants(1, 0.8); }
    show(el.cta, ctaOn && closeP < 1 ? 1 : 0);
    if (ctaOn) { T(el.cta, `translate(${(-iC(closeP) * 1080).toFixed(1)}px,0) scale(${lerp(1, 1.04, pr(t, C.cut_cta, 2)).toFixed(4)})`);
      reveal(wEl[83], t, S(83)); T(el["cta-rule"], `scaleX(${oC(pr(t, S(83) + 0.1, 0.25)).toFixed(4)})`);
      const p = pr(t, C.cta_word, 0.24); el["cta-word"].style.visibility = t < C.cta_word ? "hidden" : "visible"; T(el["cta-word"], `translateY(${((1 - oB(p, 1.4)) * 60).toFixed(1)}px) scale(${lerp(0.85, 1, oB(p, 1.4)).toFixed(4)})`);
      for (const i of [85, 86]) reveal(wEl[i], t, S(i)); }
    show(el.closer, heroB ? 1 : 0);
    if (heroB) { for (let i = 87; i <= 92; i++) reveal(wEl[i], t, S(i)); pop(el["logo-tile"], t, C.logo, 0.32, -10); } else show(el["logo-tile"], 0);
  }

  /* ===== كرت الجسر الأزرق ===== */
  if (inBridge) { T(el.imagine, `scale(${lerp(1, 1.05, pr(t, C.cut_bridge, C.cut_story - C.cut_bridge)).toFixed(4)})`); for (const i of [12, 13, 14]) reveal(wEl[i], t, S(i)); }

  /* ===== عالم القصة: المطبخ ===== */
  if (inStory) {
    const wp = pr(t, C.whip, 0.2), wq = pr(t, C.whip + 0.12, 0.28);
    const frozen = t >= C.freeze && t < C.unfreeze, fz = pr(t, C.freeze, C.unfreeze - C.freeze), fend = pr(t, C.unfreeze - 0.24, 0.24);
    // التجميد بطبقة تسحب اللون (filter على العالم كامل كان يخلي مربعات فاضية في الرندر)
    show(el.freezeSat, frozen ? 1 : 0); show(el.freezeDim, frozen ? (0.5 * fend).toFixed(3) : 0);
    { const dx = -ioC(pr(t, C.whip, 0.42)) * 520 - (t - C.cut_story) * 8, dy = -ioC(pr(t, C.batch, 0.5)) * 260;
      el.wood.style.backgroundPosition = Array(3).fill(`${(dx - 500).toFixed(1)}px ${(dy - 200).toFixed(1)}px`).join(",");
      for (const n of PROPS) T(n, `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px)`); }
    // الصينية A: سكين يقص بشكل أعوج
    show(el.trayA, wp < 1 ? 1 : 0);
    T(el.trayA, `translate(${(-iC(wp) * 1300).toFixed(1)}px,0) rotate(-1.4deg) scale(${lerp(0.62, 0.94, oC(pr(t, C.cut_story, 1.0))).toFixed(4)})`);
    el.trayA.style.filter = wp > 0 && wp < 1 ? `blur(${(wp * 16).toFixed(1)}px)` : "none";
    knife("a-knifeG", "a-groove", walkA, t, C.knifeA, C.liftA - C.knifeA - 0.08, C.liftA);
    { const p = pr(t, C.liftA, 0.3); A(el["a-piece"], "opacity", t >= C.liftA ? 1 : 0); A(el["a-piece"], "transform", `translate(${(-10 * oB(p)).toFixed(1)},${(-16 * oB(p)).toFixed(1)})`); }
    A(el["a-hole"], "opacity", t >= C.liftA ? 1 : 0);
    stamp(el["a-x"], t, C.xA, 338, 436);
    // الصينية B: محاولة ثانية عوجا ← تجميد ← القطّاعة
    show(el.trayB, wq > 0 ? 1 : 0);
    const grow = lerp(0.86, 1, pr(t, C.whip + 0.12, C.cut_link - C.whip)) * (frozen ? 1 + 0.08 * fz : 1);
    T(el.trayB, `translate(${((1 - oC(wq)) * 1300).toFixed(1)}px,0) rotate(1.2deg) scale(${grow.toFixed(4)})`);
    el.trayB.style.filter = wq > 0 && wq < 1 ? `blur(${((1 - wq) * 16).toFixed(1)}px)` : frozen && fend > 0 ? `blur(${(fend * 10).toFixed(1)}px)` : "none";
    knife("b-knifeG", "b-groove", walkB, t, C.knifeB, C.xB - C.knifeB - 0.05, C.xB + 0.05);
    A(el["b-hole"], "opacity", t >= C.xB ? 1 : 0);
    stamp(el["b-x"], t, C.xB, 252, 330); if (t >= C.okB) A(el["b-x"], "opacity", 1 - pr(t, C.okB, 0.2));
    // القطّاعة: تنزل من فوق، ضغطة، وترتفع
    { const g = el["b-cutterG"];
      if (t < C.cutter_in - 0.05 || t > C.okB + 0.7) A(g, "opacity", 0);
      else { const d = oC(pr(t, C.cutter_in - 0.05, C.press - C.cutter_in + 0.05)), up = ioC(pr(t, C.okB - 0.12, 0.5));
        const sq = t >= C.press && t < C.press + 0.16 ? 1 - 0.05 * Math.sin(Math.PI * (t - C.press) / 0.16) : 1;
        A(g, "opacity", Math.min(1, d * 3) * (1 - up)); A(g, "transform", `translate(430,${(600 - (1 - d) * 640 - up * 380).toFixed(1)}) scale(${(lerp(1.35, 1, d) * sq + up * 0.25).toFixed(4)})`); } }
    A(el["b-dent"], "opacity", t >= C.press ? 1 : 0);
    { const p = pr(t, C.okB - 0.05, 0.3); A(el["b-piece"], "opacity", t >= C.okB - 0.05 ? 1 : 0); A(el["b-piece"], "transform", `translate(${(-10 * oB(p)).toFixed(1)},${(-16 * oB(p)).toFixed(1)})`); }
    stamp(el["b-ok"], t, C.okB, 430, 600);
    // دفعة البسكوت: كلها نفس الشكل بالضبط
    { const p = ioC(pr(t, C.batch - 0.05, 0.5)), bl = Math.sin(Math.PI * p) * 8;
      // انزلاق قصير + تلاشي، والمخفي display=none (مجموعة بفلاتر برا حدود الـ SVG كانت ترسم مربع أبيض فوق الشاشة)
      A(el["b-work"], "display", p >= 1 ? "none" : "inline"); A(el["b-work"], "opacity", (1 - p).toFixed(3)); A(el["b-work"], "transform", `translate(0,${(-p * 140).toFixed(1)})`);
      A(el["b-batch"], "display", p <= 0 ? "none" : "inline"); A(el["b-batch"], "opacity", p.toFixed(3)); A(el["b-batch"], "transform", `translate(0,${((1 - p) * 140).toFixed(1)})`);
      $("svg", el.trayB).style.filter = bl > 0.4 ? `blur(${bl.toFixed(1)}px)` : "none";
      for (let k = 0; k < 6; k++) { const q = pr(t, C.batch + 0.12 + k * 0.17, 0.24), r = Math.floor(k / 2), c = k % 2, x = 96 + c * 256, y = 110 + r * 236;
        A(el["ck" + k], "opacity", q > 0 ? 1 : 0); A(el["ck" + k], "transform", `translate(${x + 114},${y + 98}) scale(${oB(q).toFixed(4)}) translate(-114,-98)`); }
      stamp(el["b-ok2"], t, C.okBatch, 338, 842); }
    // ملصق السؤال
    const sp = pr(t, S(23), 0.2); show(el.sticker, frozen && t >= S(23) ? 1 : 0); T(el.sticker, `translateX(-50%) rotate(-5deg) scale(${(oB(sp, 2.2) * (1 + 0.06 * fz)).toFixed(4)})`);
  }

  /* ===== عالم الشرح: كرت الربط ← المخطط ← 3 نوافذ ===== */
  if (inExplain) {
    const linkOn = t < C.cut_diag + 0.25, lo = pr(t, C.cut_diag - 0.05, 0.28);
    show(el.link, linkOn ? 1 - lo : 0);
    if (linkOn) { T(el.link, `scale(${(lerp(1, 1.04, pr(t, C.cut_link, C.cut_diag - C.cut_link)) * lerp(1, 0.86, iC(lo))).toFixed(4)}) translateY(${(-lo * 120).toFixed(1)}px)`);
      for (const i of [30, 31]) reveal(wEl[i], t, S(i));
      const kt = [C.kWin, C.kShift, C.kS];
      kt.forEach((k0, k) => keyState(el["link-keys-" + k], t, t >= C.together ? C.together : k0, 0.22, t >= C.together, k0 - 0.22));
      [...el["link-keys"].querySelectorAll(".plus")].forEach((n, k) => show(n, oC(pr(t, kt[k + 1] - 0.22, 0.2))));
      for (const i of [37, 38]) reveal(wEl[i], t, S(i));
      T(el["link-rule"], `scaleX(${oC(pr(t, C.together, 0.3)).toFixed(4)})`); }
    show(el.diagram, t >= C.cut_diag - 0.05 ? 1 : 0);
    if (t >= C.cut_diag - 0.05) {
      const f = oC(pr(t, C.cut_e1 - 0.08, 0.38)), k2 = ioC(pr(t, C.cut_e2 - 0.08, 0.4)), k3 = ioC(pr(t, C.cut_e3 - 0.06, 0.4));
      const sc = lerp(0.92, 1, oC(pr(t, C.cut_diag - 0.05, 0.4))) * lerp(1, 1.04, pr(t, C.cut_diag, C.cut_e1 - C.cut_diag)) * lerp(1, 1.28, f) + 0.1 * k2 - 0.05 * k3;
      const tx = lerp(0, 130, f) - 230 * k2 + 280 * k3, ty = lerp(0, 40, f) - 160 * k2 + 120 * k3;
      T(el.diagram, `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${sc.toFixed(4)})`);
      el.diagram.style.opacity = lerp(Math.min(1, pr(t, C.cut_diag - 0.05, 0.2) * 1.5), 0.22, f); el.diagram.style.filter = f > 0.02 ? `blur(${(f * 7).toFixed(1)}px)` : "none";
      const tb = oB(pr(t, C.toolbar, 0.36), 1.3), pulse = t >= C.choose && t < C.choose + 0.3 ? Math.sin(Math.PI * (t - C.choose) / 0.3) * 0.08 : 0;
      A(el["d-bar"], "transform", `translate(540,${lerp(420, 540, tb).toFixed(1)}) scale(${(1 + pulse).toFixed(4)})`);
      A(el["d-dim"], "opacity", (0.5 * oC(pr(t, C.dim, 0.3))).toFixed(3));
      const TK = [C.t1, C.t2, C.t3, C.t4];
      let sel = -1; TK.forEach((t0, k) => { if (t >= t0) sel = k; });
      TK.forEach((t0, k) => {
        A(el["d-sp" + k], "stroke-dashoffset", (1 - oC(pr(t, t0 - 0.16, 0.24))).toFixed(4));
        const p = pop(el["d-t" + k], t, t0 + 0.02, 0.3, k % 2 ? -8 : 8);
        el["d-t" + k].style.boxShadow = k === sel ? "0 0 0 6px #7DB4FF, 0 0 50px rgba(79,146,255,.8), 0 18px 36px rgba(0,0,0,.45)" : "";
        A(el["d-ic" + k], "fill", k === sel ? BRAND : "#EEF3FB");
        const g = el["d-g" + k]; A(g, "stroke", k === sel ? "#fff" : INK); [...g.querySelectorAll("*")].forEach((c) => A(c, "stroke", k === sel ? "#fff" : INK));
      });
    }
    const win = (n, t0, t1) => { if (t < t0 + 0.06 || t >= t1 + 0.1) { show(n, 0); return false; }
      const p = pr(t, t0 + 0.06, 0.3), out = pr(t, t1 - 0.06, 0.16); show(n, Math.min(1, p * 4) * (1 - out));
      T(n, `translateY(${((1 - oB(p, 1.4)) * 80).toFixed(1)}px) scale(${(lerp(0.9, 1, oC(p)) * lerp(1, 1.03, pr(t, t0, t1 - t0)) * lerp(1, 0.94, out)).toFixed(4)})`); return true; };
    const sel = (x0, y0, x1, y1, gid, hole) => { const g = el[gid]; for (const r of g.querySelectorAll("rect")) { A(r, "x", Math.min(x0, x1)); A(r, "y", Math.min(y0, y1)); A(r, "width", Math.abs(x1 - x0)); A(r, "height", Math.abs(y1 - y0)); A(r, "rx", 6); }
      $(".a2", g).setAttribute("stroke-dashoffset", (-t * 80).toFixed(1)); if (hole) { A(hole, "x", Math.min(x0, x1)); A(hole, "y", Math.min(y0, y1)); A(hole, "width", Math.abs(x1 - x0)); A(hole, "height", Math.abs(y1 - y0)); } };
    if (win(el.win1, C.cut_e1, C.cut_e2)) {        // 1) اسحب على الجزء ← ينحفظ في الحافظة
      A(el["w1-mini"], "opacity", oC(pr(t, C.cut_e1 + 0.15, 0.25))); A(el["w1-mini"], "transform", `translate(0,${((1 - oB(pr(t, C.cut_e1 + 0.15, 0.3))) * -40).toFixed(1)})`);
      const dimP = oC(pr(t, C.drag - 0.15, 0.2)) * (1 - oC(pr(t, C.lift + 0.15, 0.3)));
      A(el["w1-dim"], "opacity", (0.55 * dimP).toFixed(3));
      const dp = ioC(pr(t, C.drag, C.drag_end - C.drag - 0.1)), x1 = lerp(140, 660, dp), y1 = lerp(220, 542, dp);
      sel(140, 220, x1, y1, "w1-ants", el["m1-hole"]); A(el["w1-ants"], "opacity", t >= C.drag && t < C.lift + 0.1 ? 1 : 0);
      A(el["w1-cur"], "opacity", t >= C.drag - 0.25 && t < C.lift ? 1 : 0);
      A(el["w1-cur"], "transform", `translate(${(t < C.drag ? lerp(330, 140, oC(pr(t, C.drag - 0.25, 0.25))) : x1).toFixed(1)},${(t < C.drag ? lerp(420, 220, oC(pr(t, C.drag - 0.25, 0.25))) : y1).toFixed(1)})`);
      // القطعة ترتفع وتطير للحافظة
      const lp = oB(pr(t, C.lift, 0.25), 1.4), fp = ioC(pr(t, C.fly, 0.45)), arc = Math.sin(Math.PI * fp) * -120;
      A(el["w1-piece"], "opacity", t >= C.lift && fp < 1 ? 1 : 0);
      A(el["w1-piece"], "transform", `translate(${lerp(150, 92, fp).toFixed(1)},${(lerp(230, 548, fp) + arc - 10 * lp).toFixed(1)}) scale(${(lerp(1, 0.16, fp) * (1 + 0.04 * lp)).toFixed(4)})`);
      el["w1-piece"].style.filter = t >= C.lift ? "drop-shadow(0 22px 26px rgba(20,40,75,.35))" : "none";
      popG(el["w1-clip"], t, C.lift + 0.1, 64, 486);
      A(el["w1-clip-thumb"], "opacity", t >= C.fly + 0.42 ? 1 : 0);
      stamp(el["w1-ok"], t, C.clip_ok, 270, 560);
    }
    if (win(el.win2, C.cut_e2, C.cut_e3)) {        // 2) Ctrl + V في المحادثة
      el["w2-tab1"].classList.toggle("on", t >= C.tab_file && t < C.tab_file + 0.5); el["w2-tab0"].classList.toggle("on", !(t >= C.tab_file && t < C.tab_file + 0.5));
      A(el["w2-caret"], "opacity", Math.floor(t * 2.4) % 2 ? 0.15 : 1);
      const ip = oB(pr(t, C.kV + 0.04, 0.3), 1.5); A(el["w2-img"], "opacity", t >= C.kV + 0.04 ? 1 : 0);
      A(el["w2-img"], "transform", `translate(260,516) scale(${ip.toFixed(4)}) translate(-260,-516)`);
      stamp(el["w2-ok"], t, C.kV + 0.16, 560, 500);
    }
    { const on = t >= C.cut_e2 + 0.06 && t < C.cut_e3; show(el["w2-keys"], on ? oC(pr(t, C.kCtrl - 0.4, 0.25)) * (1 - pr(t, C.cut_e3 - 0.06, 0.12)) : 0);
      if (on) { keyState(el["w2-keys-0"], t, C.kCtrl, 0.9, t >= C.kV); keyState(el["w2-keys-1"], t, C.kV, 0.25, t >= C.kV); } }
    if (win(el.win3, C.cut_e3, C.cut_cta)) {       // 3) بونص: Win + Shift + R يسجّل فيديو
      pop(el["w3-bonus"], t, C.bonus, 0.3, -10);
      const ko = pr(t, C.rec - 0.1, 0.3);
      show(el["w3-keys"], (1 - ko) * oC(pr(t, C.kWin2 - 0.35, 0.25))); T(el["w3-keys"], `translateY(${(-ko * 80).toFixed(1)}px) scale(${lerp(1, 0.8, ko).toFixed(3)})`);
      [C.kWin2, C.kShift2, C.kR].forEach((k0, k) => keyState(el["w3-keys-" + k], t, k0, 0.2, t >= C.kR));
      A(el["w3-page"], "opacity", oC(pr(t, C.rec - 0.05, 0.3)));
      const sp = oC(pr(t, C.rec, 0.3)); sel(lerp(400, 140, sp), lerp(380, 220, sp), lerp(400, 660, sp), lerp(380, 542, sp), "w3-ants");
      A(el["w3-ants"], "opacity", t >= C.rec ? 1 : 0); A(el["w3-rec"], "opacity", oC(pr(t, C.rec + 0.2, 0.2)));
      A(el["w3-dot"], "opacity", Math.floor((t - C.rec) * 2.2) % 2 ? 0.25 : 1);
      el["w3-time"].textContent = "00:0" + Math.max(0, Math.min(9, Math.floor(t - C.rec + 1)));
      el["w3-page"].querySelectorAll(".bar").forEach((b, k) => { const h = +b.dataset.h * (t >= C.rec ? 0.75 + 0.25 * Math.sin((t - C.rec) * 5 + k * 1.3) : 1); A(b, "y", (262 - h).toFixed(1)); A(b, "height", h.toFixed(1)); });
    }
  }

  /* ===== الحلقة: آخر ثانية تذوب في الفريم الأول (آخر 0.2ث = الفريم الأول بالضبط) ===== */
  show(el.loopimg, D.loop && loopReady ? pr(t, D.loop.start, D.loop.dur - 0.2) : 0);
}

/* ---------- فحص المناطق الآمنة ---------- */
function qa(t) {
  const out = [];
  document.querySelectorAll("[data-safe]").forEach((n) => {
    let o = 1; for (let p = n; p && p !== document.body; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity);
    if (o < 0.5 || getComputedStyle(n).visibility === "hidden" || getComputedStyle(n).display === "none") return;
    let r = n.getBoundingClientRect();
    if (n.classList.contains("card-text") || n.classList.contains("keys")) { const rs = [...n.querySelectorAll(n.classList.contains("keys") ? ".key" : ".row")].filter((x) => getComputedStyle(x).visibility !== "hidden").map((x) => x.getBoundingClientRect()).filter((x) => x.width > 2); if (!rs.length) return;
      r = { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)), width: 9, height: 9 }; }
    if (r.width < 2 || r.height < 2) return;
    if ((n.id === "cta" && t >= C.cut_close - 0.12) || (n.closest("#diagram") && t >= C.cut_e1 - 0.1) || (n.closest("#link") && t >= C.cut_diag - 0.1)) return;
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
Promise.all([document.fonts.load('800 100px "Baloo Bhaijaan 2"', "تيربو"), document.fonts.load('800 100px "Baloo Bhaijaan 2"', "Turbo"), document.fonts.load('800 30px "Inter"', "Win"), document.fonts.ready,
  ...[...document.images].filter((i) => i.id !== "loopimg").map((i) => i.decode().catch(() => {}))]).then(() => { fitCaps(); renderFrame(0); window.__ready = true; });
