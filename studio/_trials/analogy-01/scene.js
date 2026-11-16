/* =============================================================================
 scene.js — تجربة أسلوب "الشرح بالتشبيه" (trial-analogy-01) على سكربت "الجهاز شغال والشاشة سوداء".
 DOM + SVG فقط (بدون Three.js). دالة حتمية window.renderFrame(t) — نفس عقد render.cjs / snap.cjs.
 البيانات: window.__SCENE_DATA__ = scene.json (من build.py): words · cues · captions · loop.
 القواعد المطبقة: بدون ذوات أرواح (جمادات فقط) · بدون موسيقى · بدون شعارات شركات · المناطق الآمنة · الحلقة.
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
const S = (i) => W[i].start, E = (i) => W[i].end;
const $ = (q, r = document) => r.querySelector(q);
const INK = "#16233B", NO = "#FF3347", YES = "#22D36A", ACC = "#7DB4FF", ACCD = "#2F6BCF";

const clean = (s) => s.replace(/[،.]+$/u, "");
const wordHTML = (i, cls = "", keepComma = false) => {
  const s = keepComma ? W[i].w.replace(/[.]+$/u, "") : clean(W[i].w), ltr = /^[A-Za-z0-9 ]+$/.test(s);
  return `<span class="w ${cls} ${ltr ? "ltr" : ""}" data-i="${i}">${s}</span>`;
};

/* ---------- الرسومات (كلها جمادات) ---------- */
const tapArt = (id, lever) => `
<g id="${id}">
 <rect x="-16" y="-38" width="30" height="76" rx="9" fill="#C98F2B" stroke="${INK}" stroke-width="7"/>
 <path d="M0,-22 H176 Q232,-22 232,34 V72 H188 V40 Q188,22 170,22 H0 Z" fill="#EDB84C" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
 <path d="M16,-9 H170 Q212,-9 217,26" fill="none" stroke="#FBE3A6" stroke-width="7" stroke-linecap="round" opacity=".85"/>
 <rect x="180" y="70" width="60" height="24" rx="7" fill="#C98F2B" stroke="${INK}" stroke-width="7"/>
 <rect x="68" y="-52" width="54" height="32" rx="6" fill="#C98F2B" stroke="${INK}" stroke-width="7"/>
 <rect x="88" y="-82" width="14" height="32" fill="${INK}"/>
 <g id="${id}-lever"><rect x="39" y="-101" width="112" height="30" rx="15" fill="${lever}" stroke="${INK}" stroke-width="7"/><circle cx="95" cy="-86" r="7" fill="${INK}"/></g>
</g>`;
const stampArt = (id, ok, r = 62) => {
  const c = ok ? YES : NO;
  return `<g id="${id}" opacity="0"><circle r="${r}" fill="#fff" opacity=".94"/><circle r="${r}" fill="none" stroke="${c}" stroke-width="${r * 0.22}"/>` +
    (ok ? `<path d="M${-r * 0.45},${r * 0.03} L${-r * 0.13},${r * 0.38} L${r * 0.48},${-r * 0.36}" fill="none" stroke="${c}" stroke-width="${r * 0.26}" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<path d="M${-r * 0.38},${-r * 0.38} L${r * 0.38},${r * 0.38} M${r * 0.38},${-r * 0.38} L${-r * 0.38},${r * 0.38}" stroke="${c}" stroke-width="${r * 0.26}" stroke-linecap="round"/>`) + `</g>`;
};
const TAP1 = { x: 600, y: 470 }, TAP2 = { x: 600, y: 1130 }, NOZ = { dx: 210, dy: 94 }, SHELF = 750, GROUND = 1480;
const sceneSVG = (p) => `
<svg width="1000" height="1700" viewBox="0 0 1000 1700" xmlns="http://www.w3.org/2000/svg">
 <rect width="1000" height="1700" fill="#F4E4BC"/>
 <g opacity=".5">${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect x="${i * 150 + 20}" y="0" width="60" height="1480" fill="#EFD9A6"/>`).join("")}</g>
 <rect y="${GROUND}" width="1000" height="220" fill="#D85C3A"/><rect y="${GROUND}" width="1000" height="14" fill="${INK}"/>
 <g opacity=".35">${[0, 1, 2, 3, 4, 5].map((i) => `<rect x="${i * 190 - 30}" y="${GROUND + 60 + (i % 2) * 54}" width="120" height="12" rx="6" fill="#B8442A"/>`).join("")}</g>
 <!-- الخزان -->
 <rect x="150" y="1390" width="56" height="92" fill="${INK}"/><rect x="504" y="1390" width="56" height="92" fill="${INK}"/>
 <rect x="290" y="216" width="130" height="50" rx="12" fill="#C9D6DB" stroke="${INK}" stroke-width="9"/>
 <rect x="110" y="258" width="490" height="1140" rx="44" fill="#EEF3F4" stroke="${INK}" stroke-width="10"/>
 <rect x="470" y="268" width="120" height="1120" rx="36" fill="#D9E3E6"/>
 ${[450, 640, 830, 1020, 1210].map((y) => `<path d="M116,${y} H594" stroke="${INK}" stroke-width="7" opacity=".22"/>`).join("")}
 <rect x="162" y="330" width="52" height="1000" rx="26" fill="#D2DEE2" stroke="${INK}" stroke-width="7"/>
 <rect x="171" y="392" width="34" height="929" rx="15" fill="#63C7EA"/><rect x="171" y="392" width="34" height="14" rx="7" fill="#B9E9F7"/>
 <!-- الرف -->
 <path d="M650,${SHELF + 26} L650,${SHELF + 150} L760,${SHELF + 26} Z" fill="#B8442A" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>
 <rect x="630" y="${SHELF}" width="370" height="28" rx="8" fill="#D85C3A" stroke="${INK}" stroke-width="7"/>
 <!-- الماء (الحنفية الثانية) -->
 <g id="${p}stream" opacity="0"><rect id="${p}streamR" x="${TAP2.x + NOZ.dx - 15}" y="${TAP2.y + NOZ.dy}" width="30" height="10" rx="12" fill="#63C7EA"/>
  <rect id="${p}streamH" x="${TAP2.x + NOZ.dx - 6}" y="${TAP2.y + NOZ.dy}" width="7" height="10" rx="3" fill="#D8F4FC"/></g>
 <circle id="${p}drip" cx="${TAP2.x + NOZ.dx}" cy="0" r="9" fill="#63C7EA" opacity="0"/>
 <!-- الحنفيتين -->
 <g transform="translate(${TAP1.x},${TAP1.y})">${tapArt(p + "tap1", NO)}</g>
 <g transform="translate(${TAP2.x},${TAP2.y})">${tapArt(p + "tap2", YES)}</g>
 <circle id="${p}ring1" cx="${TAP1.x + 120}" cy="${TAP1.y - 10}" r="150" fill="none" stroke="#fff" stroke-width="12" opacity="0"/>
 <circle id="${p}ring2" cx="${TAP2.x + 120}" cy="${TAP2.y - 10}" r="150" fill="none" stroke="#fff" stroke-width="12" opacity="0"/>
 <circle id="${p}vring" cx="${TAP1.x + 95}" cy="${TAP1.y - 100}" r="100" fill="none" stroke="${NO}" stroke-width="12" opacity="0"/>
 <g id="${p}puff" opacity="0" stroke="${INK}" stroke-width="8" stroke-linecap="round" fill="none">
  <path d="M${TAP1.x + NOZ.dx - 34},${TAP1.y + NOZ.dy + 14} l-14,22"/><path d="M${TAP1.x + NOZ.dx},${TAP1.y + NOZ.dy + 16} v26"/><path d="M${TAP1.x + NOZ.dx + 34},${TAP1.y + NOZ.dy + 14} l14,22"/></g>
 <!-- السطل -->
 <g id="${p}bucket"><path d="M-96,-150 L96,-150 L70,0 L-70,0 Z" fill="#E8573A" stroke="${INK}" stroke-width="8" stroke-linejoin="round"/>
  <path d="M-58,-128 L-44,-14" stroke="#F58D6F" stroke-width="12" stroke-linecap="round"/>
  <rect x="-106" y="-166" width="212" height="26" rx="12" fill="#B8442A" stroke="${INK}" stroke-width="8"/>
  <g id="${p}splash" opacity="0" fill="#63C7EA"><circle cx="-34" cy="-186" r="9"/><circle cx="30" cy="-192" r="7"/><circle cx="-6" cy="-204" r="6"/><circle cx="52" cy="-178" r="5"/></g></g>
 ${stampArt(p + "sx", false)}${stampArt(p + "sok", true)}
</svg>`;

const portHDMI = (x, y, s = 1, f = INK) => `<path transform="translate(${x},${y}) scale(${s})" d="M-46,-20 H46 V6 L34,20 H-34 L-46,6 Z" fill="${f}"/>`;
const portDP = (x, y, s = 1, f = INK) => `<path transform="translate(${x},${y}) scale(${s})" d="M-46,-20 H34 L46,-8 V20 H-46 Z" fill="${f}"/>`;
const badgeHTML = (id, ok) => `<div class="badge" id="${id}"><svg width="84" height="84" viewBox="-42 -42 84 84">${stampArt(id + "g", ok, 36).replace('opacity="0"', "")}</svg></div>`;

/* ---------- بناء DOM ---------- */
stage.innerHTML = `
<div class="world" id="brand">
  <div id="hero"><svg width="1080" height="1920" viewBox="0 0 1080 1920">
    <defs><radialGradient id="halo"><stop offset="0" stop-color="#9CC8FF" stop-opacity=".95"/><stop offset=".45" stop-color="#4F92FF" stop-opacity=".45"/><stop offset="1" stop-color="#4F92FF" stop-opacity="0"/></radialGradient>
      <linearGradient id="hstream" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#63C7EA"/><stop offset=".75" stop-color="#63C7EA"/><stop offset="1" stop-color="#63C7EA" stop-opacity="0"/></linearGradient></defs>
    <ellipse cx="540" cy="1310" rx="250" ry="26" fill="#040B1F" opacity=".5"/>
    <circle id="h-halo" cx="497" cy="700" r="230" fill="url(#halo)" opacity="0"/>
    <g id="h-water" opacity="0"><rect id="h-streamR" x="743" y="1134" width="60" height="230" rx="26" fill="url(#hstream)"/><rect id="h-streamH" x="762" y="1134" width="12" height="60" rx="6" fill="#D8F4FC"/></g>
    <g transform="translate(269,910) scale(2.4)">${tapArt("h-tap", NO)}</g>
  </svg></div>
  <div class="card-text" id="hook" style="top:742px;font-size:132px" data-safe="hook"><div class="row">${wordHTML(0)}${wordHTML(1)}</div><div class="row">${wordHTML(2)}${wordHTML(3, "acc")}</div></div>
  <div class="card-text" id="cta" style="top:600px" data-safe="cta">
    <div class="row" style="font-size:92px">${wordHTML(77)}</div>
    <div class="rule" id="cta-rule" style="width:640px;margin:14px 0 6px"></div>
    <div class="row acc" id="cta-word" style="font-size:236px;line-height:1.18"><span class="w">«${clean(W[78].w)}»</span></div>
    <div class="row" style="font-size:84px;margin-top:8px">${wordHTML(79)}${wordHTML(80)}${wordHTML(81)}</div>
  </div>
  <div class="card-text" id="closer" style="top:232px" data-safe="closer">
    <div class="row" style="font-size:108px">${wordHTML(82)}${wordHTML(83, "acc")}</div>
    <div class="row" style="font-size:70px">${[84, 85, 86, 87, 88].map((i) => wordHTML(i)).join("")}</div>
  </div>
  <div id="logo-tile" style="left:215px;top:1090px"><img src="../../../brand/logo/icon_transparent.png" alt=""></div>
</div>
<div class="world" id="white"><div class="card-text" id="imagine" style="top:860px;font-size:150px;color:#0B1730" data-safe="imagine"><div class="row">${wordHTML(10)}${wordHTML(11)}${wordHTML(12)}</div></div></div>
<div class="world" id="story">
  <div class="tiles" id="tiles"></div>
  <div class="card" id="cardA"><div class="in"><div class="cam">${sceneSVG("a-")}</div></div></div>
  <div class="card" id="cardB"><div class="in"><div class="cam">${sceneSVG("b-")}</div></div></div>
  <div class="sticker" id="sticker"><span data-safe="sticker">${clean(W[21].w)}</span></div>
</div>
<div class="world" id="explain">
  <div class="dots"></div>
  <div class="card-text" id="link" style="top:820px;font-size:120px" data-safe="link"><div class="row">${wordHTML(29, "acc")}${wordHTML(30)}${wordHTML(31)}</div><div class="rule" id="link-rule" style="width:800px;margin-top:20px"></div></div>
  <div id="diagram">
    <svg class="fill" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs><filter id="gl" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
      <rect id="d-case" x="150" y="640" width="330" height="690" rx="34" fill="rgba(125,180,255,.05)" stroke="${ACC}" stroke-width="5" filter="url(#gl)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <g id="d-slots" opacity="0">${[0, 1, 2].map((i) => `<rect x="190" y="${938 + i * 36}" width="250" height="18" rx="9" fill="rgba(125,180,255,.22)"/>`).join("")}</g>
      <path id="d-l1" d="M445,800 C580,800 570,950 690,950" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <path id="d-l1dead" d="M445,800 C580,800 570,950 690,950" fill="none" stroke="#5A667A" stroke-width="6" stroke-linecap="round" stroke-dasharray="4 18" opacity="0"/>
      <path id="d-l2" d="M445,1170 C580,1170 570,1020 690,1020" fill="none" stroke="${ACC}" stroke-width="7" stroke-linecap="round" filter="url(#gl)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>
      <path id="d-l2dots" d="M445,1170 C580,1170 570,1020 690,1020" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" stroke-dasharray="2 46" opacity="0"/>
    </svg>
    <div class="dlabel" id="d-caselbl" style="left:150px;width:330px;top:574px" data-safe="d-caselbl">ظهر الكيس</div>
    <div class="tile" id="d-mobo" style="left:185px;top:690px;width:260px;height:220px"><svg width="220" height="70" viewBox="-110 -35 220 70">${portHDMI(-54, 0)}${portDP(54, 0)}</svg><div class="lbl" data-safe="d-mobo">الماذربورد</div></div>
    <div class="tile" id="d-gpu" style="left:185px;top:1060px;width:260px;height:220px"><svg width="220" height="70" viewBox="-110 -35 220 70">${portHDMI(-54, 0)}${portDP(54, 0)}</svg><div class="lbl" data-safe="d-gpu">كرت الشاشة</div></div>
    <div class="tile" id="d-mon" style="left:690px;top:870px;width:250px;height:230px"><svg width="170" height="130" viewBox="0 0 170 130"><rect x="6" y="6" width="158" height="96" rx="12" fill="${INK}"/><rect id="d-scr" x="16" y="16" width="138" height="76" rx="6" fill="#0A0D13"/><rect x="74" y="102" width="22" height="16" fill="${INK}"/><rect x="46" y="116" width="78" height="10" rx="5" fill="${INK}"/></svg><div class="lbl" data-safe="d-mon">الشاشة</div></div>
    ${badgeHTML("d-bx", false)}${badgeHTML("d-bok", true)}
  </div>
  <!-- الخطوة 1: انقل الكيبل -->
  <div class="win" id="win1"><svg width="780" height="760" viewBox="0 0 780 760">
    <rect x="60" y="130" width="660" height="570" rx="28" fill="#1C2637" stroke="#33415A" stroke-width="4"/>
    <rect x="100" y="190" width="580" height="150" rx="14" fill="#C9D2DE"/>
    ${portHDMI(190, 265, 1.15, "#141B28")}${portDP(330, 265, 1.15, "#141B28")}${[470, 530, 590, 640].map((x, i) => `<circle cx="${x}" cy="265" r="${i < 3 ? 17 : 12}" fill="#141B28"/>`).join("")}
    <rect x="100" y="372" width="580" height="26" rx="10" fill="#27344A"/><rect x="100" y="640" width="580" height="26" rx="10" fill="#27344A"/>
    <rect x="100" y="424" width="580" height="150" rx="14" fill="#C9D2DE"/>
    ${portHDMI(190, 499, 1.15, "#141B28")}${portDP(330, 499, 1.15, "#141B28")}${portDP(470, 499, 1.15, "#141B28")}
    <circle id="w1-red" cx="190" cy="265" r="74" fill="none" stroke="${NO}" stroke-width="9"/>
    <circle id="w1-green" cx="190" cy="499" r="74" fill="none" stroke="${YES}" stroke-width="9" opacity="0"/>
    <path id="w1-cable" d="" fill="none" stroke="${ACCD}" stroke-width="22" stroke-linecap="round"/>
    <g id="w1-plug"><rect x="-62" y="-38" width="124" height="76" rx="14" fill="${ACCD}" stroke="#A9CCFF" stroke-width="5"/><rect x="-36" y="-12" width="72" height="24" rx="8" fill="#1B4A9C"/></g>
    ${stampArt("w1-ok", true, 56)}
  </svg><div class="step">1</div>
  <div class="wlbl" style="left:100px;top:142px" data-safe="w1a">منافذ الماذربورد</div><div class="wlbl" style="left:100px;top:592px" data-safe="w1b">منافذ كرت الشاشة</div></div>
  <!-- الخطوة 2: دخّله لآخره -->
  <div class="win" id="win2">
   <div class="fill" id="w2A"><svg width="780" height="760" viewBox="0 0 780 760">
    ${[0, 1].map((k) => { const y = 290 + k * 270; return `
     <rect x="90" y="${y - 76}" width="190" height="152" rx="18" fill="#C9D2DE"/><rect x="232" y="${y - 30}" width="48" height="60" rx="6" fill="#141B28"/>
     <path id="w2c${k}" d="" stroke="${ACCD}" stroke-width="22" stroke-linecap="round" fill="none"/>
     <g id="w2p${k}"><rect x="0" y="-24" width="96" height="48" rx="5" fill="#EEF2F7" stroke="#8FA0B8" stroke-width="4"/><rect x="92" y="-48" width="170" height="96" rx="16" fill="${ACCD}" stroke="#A9CCFF" stroke-width="5"/></g>
     <path id="w2g${k}" d="M290,${y - 52} h78 M290,${y + 52} h78" stroke="${NO}" stroke-width="7" stroke-dasharray="10 9" stroke-linecap="round"/>
     <g transform="translate(662,${y})">${stampArt("w2ok" + k, true, 44).replace("<g ", '<g transform="scale(1)" ')}</g>`; }).join("")}
   </svg><div class="wlbl dim" style="left:90px;top:150px" data-safe="w2a">طرف الجهاز</div><div class="wlbl dim" style="left:90px;top:420px" data-safe="w2b">طرف الشاشة</div></div>
   <div class="fill" id="w2B" style="opacity:0"><svg width="780" height="760" viewBox="0 0 780 760">
     <rect x="80" y="300" width="230" height="230" rx="22" fill="#C9D2DE"/><rect x="250" y="372" width="60" height="86" rx="8" fill="#141B28"/>
     <path d="M560,415 H780" stroke="${ACCD}" stroke-width="30" stroke-linecap="round"/>
     <g id="w2dots" fill="#fff">${[0, 1, 2, 3].map((i) => `<circle id="w2d${i}" cx="700" cy="415" r="8"/>`).join("")}</g>
     <rect x="286" y="381" width="120" height="68" rx="7" fill="#EEF2F7" stroke="#8FA0B8" stroke-width="5"/>
     <rect x="340" y="345" width="230" height="140" rx="22" fill="${ACCD}" stroke="#A9CCFF" stroke-width="6"/>
     <rect x="312" y="372" width="26" height="86" fill="${NO}" opacity=".0" id="w2gapfill"/>
     <circle id="w2mag" cx="325" cy="415" r="92" fill="none" stroke="#fff" stroke-width="8" stroke-dasharray="16 12" opacity="0"/>
     <g transform="translate(325,415)">${stampArt("w2x", false, 54)}</g>
   </svg><div class="chip" style="left:80px;top:150px" data-safe="w2chip">DisplayPort</div></div>
   <div class="step">2</div></div>
  <!-- الخطوة 3: اختر المدخل -->
  <div class="win" id="win3"><svg width="780" height="760" viewBox="0 0 780 760">
    <defs><linearGradient id="desk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2F6BCF"/><stop offset="1" stop-color="#9CC2F3"/></linearGradient></defs>
    <rect x="336" y="556" width="108" height="66" fill="#33415A"/><rect x="250" y="614" width="280" height="26" rx="13" fill="#33415A"/>
    <rect x="70" y="140" width="640" height="424" rx="26" fill="#0A0D13" stroke="#33415A" stroke-width="9"/>
    <g id="w3-desk" opacity="0"><rect x="90" y="160" width="600" height="384" rx="10" fill="url(#desk)"/><circle cx="560" cy="270" r="120" fill="#fff" opacity=".16"/>
      <rect x="90" y="508" width="600" height="36" fill="#14284B" opacity=".55"/>${[0, 1, 2, 3].map((i) => `<rect x="${300 + i * 48}" y="517" width="30" height="18" rx="5" fill="#fff" opacity=".8"/>`).join("")}</g>
    <g id="w3-osd">
      <text id="w3-nosig" x="250" y="366" text-anchor="middle" font-family="Baloo Bhaijaan 2" font-weight="700" font-size="34" fill="#5F6B80" direction="rtl">لا توجد إشارة</text>
      <rect id="w3-panel" x="404" y="178" width="268" height="300" rx="16" fill="#182233" stroke="${ACC}" stroke-width="4"/>
      <text x="538" y="232" text-anchor="middle" font-family="Baloo Bhaijaan 2" font-weight="800" font-size="36" fill="#fff" direction="rtl">المدخل</text>
      <rect id="w3-hl" x="420" y="254" width="236" height="60" rx="12" fill="${ACCD}"/>
      ${["HDMI 1", "HDMI 2", "DisplayPort"].map((s, i) => `<text x="538" y="${296 + i * 68}" text-anchor="middle" font-family="Inter" font-weight="700" font-size="32" fill="#fff">${s}</text>`).join("")}
    </g>
    <g transform="translate(600,650)">${stampArt("w3-ok", true, 56)}</g>
  </svg><div class="step">3</div></div>
</div>
<div id="cap" data-safe="caption"><div class="line" id="capline"></div></div>
<canvas id="grain" width="540" height="960" style="width:1080px;height:1920px"></canvas>
<img id="loopimg" alt="">`;

/* ---------- حبيبات ثابتة (PRNG ببذرة = نفس الناتج كل مرة) ---------- */
{
  const cv = $("#grain"), cx = cv.getContext("2d"), im = cx.createImageData(540, 960); let s = 20261116;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < im.data.length; i += 4) { const v = 150 + rnd() * 105; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  cx.putImageData(im, 0, 0);
}

/* ---------- مراجع ---------- */
const el = {}; document.querySelectorAll("[id]").forEach((n) => (el[n.id] = n));
const wEl = {}; document.querySelectorAll(".w[data-i]").forEach((n) => (wEl[n.dataset.i] = n));
const show = (n, v) => { n.style.opacity = v; };
const T = (n, s) => { n.style.transform = s; };
const A = (n, k, v) => n.setAttribute(k, v);

function reveal(n, t, ts, keep = false) {         // ظهور كلمة: من باهت ومغبّش إلى واضح خلال ~0.13ث
  if (t < ts - 0.02) { if (keep) { n.style.visibility = "hidden"; n.style.display = "inline-block"; } else n.style.display = "none"; return; }
  const p = pr(t, ts - 0.02, 0.13);
  n.style.display = "inline-block"; n.style.visibility = "visible"; n.style.opacity = lerp(0.3, 1, p);
  n.style.filter = p < 1 ? `blur(${((1 - p) * 7).toFixed(2)}px)` : "none";
}
function stamp(g, t, t0, x, y, base = 1) {        // ختم ✗/✓: ينزل كبير ويستقر + اهتزاز قصير
  if (t < t0) { A(g, "opacity", 0); return; }
  const p = pr(t, t0, 0.13), k = t - t0 - 0.13;
  const s = base * (p < 1 ? lerp(2.3, 1, iC(p)) : 1 + 0.07 * Math.exp(-k * 16) * Math.cos(k * 46));
  A(g, "opacity", Math.min(1, p * 3)); A(g, "transform", `translate(${x},${y}) scale(${s.toFixed(4)}) rotate(${p < 1 ? (1 - p) * -14 : 0})`);
}
function pop(n, t, t0, d = 0.3, rot = 9) {        // دخول بنطّة + ميلان
  if (t < t0) { show(n, 0); return 0; }
  const p = pr(t, t0, d); show(n, Math.min(1, p * 4)); T(n, `scale(${oB(p).toFixed(4)}) rotate(${((1 - oC(p)) * rot).toFixed(2)}deg)`); return p;
}

/* ---------- الكابشن العلوي: مقاسات جاهزة لكل مقطع ---------- */
const CAPS = D.captions.map((c) => {
  const n = c.i1 - c.i0 + 1; let fs = n <= 2 ? 116 : n === 3 ? 100 : n === 4 ? 88 : 78;
  const html = Array.from({ length: n }, (_, k) => wordHTML(c.i0 + k, "", k < n - 1)).join("");
  return { ...c, html, fs };
});
function fitCaps() {
  for (const c of CAPS) {
    el.capline.style.fontSize = c.fs + "px"; el.capline.innerHTML = c.html;
    const w = el.capline.getBoundingClientRect().width; if (w > 836) c.fs = Math.floor(c.fs * 836 / w);
  }
  el.capline.innerHTML = "";
  for (const id of ["hook", "imagine", "link", "cta"]) { if (id === "cta") { const r = el["cta-word"], w = r.scrollWidth; if (w > 720) r.style.fontSize = Math.floor(236 * 720 / w) + "px"; continue; } const n = el[id]; const w = Math.max(...[...n.querySelectorAll(".row")].map((r) => r.scrollWidth)); if (w > 780) n.style.fontSize = Math.floor(parseFloat(n.style.fontSize) * 780 / w) + "px"; }
}
let capIdx = -2, capWords = [];
function caption(t) {
  const i = CAPS.findIndex((c) => t >= c.start && t < c.end);
  if (i !== capIdx) { capIdx = i; el.capline.innerHTML = i < 0 ? "" : CAPS[i].html; if (i >= 0) el.capline.style.fontSize = CAPS[i].fs + "px"; capWords = [...el.capline.querySelectorAll(".w")]; }
  for (const n of capWords) reveal(n, t, S(+n.dataset.i));
}

/* ---------- الكاميرا داخل الكرت ---------- */
const VIEW = { all: { x: 0, y: 150, w: 1000 }, top: { x: 460, y: 250, w: 520 }, valve: { x: 505, y: 195, w: 380 }, bottom: { x: 440, y: 889, w: 560 } };
const mixV = (a, b, p) => ({ x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), w: lerp(a.w, b.w, p) });
function setCam(card, v, blur = 0) { const cam = $(".cam", card), s = 668 / v.w; T(cam, `translate(${(-v.x * s).toFixed(2)}px,${(-v.y * s).toFixed(2)}px) scale(${s.toFixed(5)})`); cam.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "none"; }
function sceneState(p, t) {                        // حالة الرسمة (نفسها في الكرتين)
  const g = (id) => el[p + id];
  // الحلقات على الحنفيتين
  [["ring1", C.taps1], ["ring2", C.taps1 + 0.22]].forEach(([id, t0]) => { const q = pr(t, t0, 0.5); A(g(id), "opacity", t < t0 ? 0 : (1 - q) * 0.95); A(g(id), "r", lerp(70, 190, oC(q))); });
  // ذراع الحنفية الأولى: مقفّل (عمودي أحمر) + محاولة فتح فاشلة
  let a1 = -90; if (t >= C.valve) { const k = t - C.valve; a1 += 13 * Math.exp(-k * 3.2) * Math.sin(k * 26); }
  A(g("tap1-lever"), "transform", `rotate(${a1.toFixed(2)} 95 -86)`);
  { const k = Math.max(0, t - C.valve), q = (k % 0.6) / 0.6; A(g("vring"), "opacity", t < C.valve || t > C.pan + 0.1 ? 0 : (1 - q) * 0.9); A(g("vring"), "r", lerp(86, 150, oC(q))); }
  // لا قطرة
  { const q = pr(t, C.puff, 0.7); A(g("puff"), "opacity", t < C.puff ? 0 : Math.sin(Math.PI * q) * 0.9); A(g("puff"), "transform", `translate(0,${(q * 16).toFixed(1)})`); }
  // السطل
  let bx = TAP1.x + NOZ.dx, by = SHELF, rot = 0;
  if (t < C.pan) { const q = pr(t, C.bucket_in, 0.32); bx = lerp(1180, bx, oB(q, 1.2)); rot = (1 - q) * 8; if (t < C.bucket_in) bx = 1180; }
  else { const q = pr(t, C.pan, 0.62), e = ioC(q); by = lerp(SHELF, GROUND, e) - Math.sin(Math.PI * q) * 40; bx += Math.sin(Math.PI * q) * 135; rot = Math.sin(Math.PI * q) * 10;
    const k = t - C.pan - 0.62; if (k > 0) by += 0; }
  const sq = t >= C.flow ? 1 + 0.02 * Math.sin((t - C.flow) * 30) * Math.exp(-(t - C.flow) * 3) : 1;
  A(g("bucket"), "transform", `translate(${bx.toFixed(1)},${by.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(1,${sq.toFixed(4)})`);
  // تنقيط خفيف من الحنفية الثانية قبل، ثم ماء كامل
  const ny = TAP2.y + NOZ.dy;
  if (t < C.flow) { const q = ((t + 0.3) % 1.1) / 1.1; A(g("drip"), "opacity", q < 0.55 ? 1 : 0); A(g("drip"), "cy", ny + 8 + iC(q / 0.55) * 250); A(g("stream"), "opacity", 0); }
  else { A(g("drip"), "opacity", 0); const q = pr(t, C.flow, 0.16), h = lerp(8, GROUND - 150 - ny + 16, q); A(g("stream"), "opacity", 1); A(g("streamR"), "height", h.toFixed(1));
    const hh = 46, off = ((t - C.flow) * 520) % (h + hh); A(g("streamH"), "y", (ny + Math.min(off, h - 8)).toFixed(1)); A(g("streamH"), "height", Math.max(4, Math.min(hh, h - off)).toFixed(1));
    const sp = (t - C.flow - 0.16); A(g("splash"), "opacity", sp > 0 ? 0.55 + 0.45 * Math.sin(sp * 22) : 0); A(g("splash"), "transform", `translate(0,${(Math.sin(sp * 22) * 6).toFixed(1)})`); }
  stamp(g("sx"), t >= C.unfreeze ? -1 : t, C.x_stamp, TAP1.x + NOZ.dx, TAP1.y + NOZ.dy + 22);
  stamp(g("sok"), t, C.ok_stamp, 925, TAP2.y + 20);
}

/* ---------- الرندر ---------- */
const inFlash = (t, cut) => (t >= cut - 0.2 && t < cut - 0.134) || (t >= cut - 0.067 && t < cut);
function renderFrame(t) {
  t = clamp(t, 0, DUR);
  const inBrand = t < C.cut_white || t >= C.cut_cta, inWhite = t >= C.cut_white && t < C.cut_story, inStory = t >= C.cut_story && t < C.cut_link, inExplain = t >= C.cut_link && t < C.cut_cta;
  show(el.brand, inBrand ? 1 : 0); show(el.white, inWhite ? 1 : 0); show(el.story, inStory ? 1 : 0); show(el.explain, inExplain ? 1 : 0);
  stage.style.filter = inFlash(t, C.cut_white) || inFlash(t, C.cut_link) ? "invert(1)" : "none";
  el.grain.style.opacity = inStory ? 0.5 : inWhite ? 0.12 : 0.22;
  caption(t);

  /* ===== عالم الهوية: الهوك ← العنصر البطل ← (CTA ← الختام) ===== */
  if (inBrand) {
    const hookOn = t < C.cut_answer, heroA = t >= C.cut_answer && t < C.cut_white, ctaOn = t >= C.cut_cta, closeP = pr(t, C.cut_close - 0.1, 0.22);
    // الهوك: الفريم الأول لقطة مكتملة (قاعدة الحلقة) والكلمة المنطوقة تنبض
    show(el.hook, hookOn ? 1 : 0);
    if (hookOn) { T(el.hook, `scale(${lerp(1, 1.05, t / C.cut_answer).toFixed(4)})`);
      for (let i = 0; i <= 3; i++) { const k = t - S(i), b = k >= 0 && k < 0.3 ? Math.sin(Math.PI * k / 0.3) * 0.09 : 0; T(wEl[i], `scale(${(1 + b).toFixed(4)})`); wEl[i].style.opacity = 1; } }
    // العنصر البطل (حنفية مقفّلة) — يرجع في الختام مفتوح والماء ينزل
    const heroB = closeP > 0;
    show(el.hero, heroA || heroB ? 1 : 0);
    if (heroA) { const p = pr(t, C.cut_answer, 0.36), push = lerp(1, 1.07, pr(t, C.cut_answer + 0.36, C.cut_white - C.cut_answer));
      T(el.hero, `scale(${(lerp(3.3, 1, oC(p)) * push).toFixed(4)})`); el.hero.style.filter = p < 1 ? `blur(${((1 - p) * 20).toFixed(1)}px)` : "none";
      A(el["h-tap-lever"], "transform", "rotate(-90 95 -86)"); A(el["h-tap-lever"].firstChild, "fill", NO); A(el["h-water"], "opacity", 0);
      const g = pr(t, C.glow, 0.22); A(el["h-halo"], "opacity", t < C.glow ? 0 : g * (0.85 + 0.15 * Math.sin((t - C.glow) * 9))); A(el["h-halo"], "r", lerp(120, 250, oB(g, 1.4))); }
    if (heroB) { T(el.hero, `translate(${((1 - oC(closeP)) * 1080).toFixed(1)}px,0) scale(${lerp(1, 1.06, pr(t, C.cut_close, DUR - C.cut_close)).toFixed(4)})`); el.hero.style.filter = closeP < 1 ? `blur(${((1 - closeP) * 10).toFixed(1)}px)` : "none";
      A(el["h-tap-lever"], "transform", "rotate(0 95 -86)"); A(el["h-tap-lever"].firstChild, "fill", YES);
      A(el["h-water"], "opacity", 1); const off = ((t * 520) % 280); A(el["h-streamH"], "y", 1134 + Math.min(off, 190)); A(el["h-streamH"], "opacity", off < 190 ? 0.9 : 0);
      A(el["h-halo"], "opacity", 0.6 + 0.12 * Math.sin(t * 7)); A(el["h-halo"], "cx", 773); A(el["h-halo"], "cy", 1150); A(el["h-halo"], "r", 240); }
    else { A(el["h-halo"], "cx", 497); A(el["h-halo"], "cy", 700); }
    // CTA: كلمة أمر ← خط ← الكلمة بين «» بأكبر حجم ← الشرط
    show(el.cta, ctaOn && closeP < 1 ? 1 : 0);
    if (ctaOn) { T(el.cta, `translate(${(-iC(closeP) * 1080).toFixed(1)}px,0) scale(${lerp(1, 1.04, pr(t, C.cut_cta, 2)).toFixed(4)})`);
      reveal(wEl[77], t, S(77), true); T(el["cta-rule"], `scaleX(${oC(pr(t, S(77) + 0.1, 0.25)).toFixed(4)})`);
      const p = pr(t, C.cta_word, 0.26); el["cta-word"].style.visibility = t < C.cta_word ? "hidden" : "visible"; T(el["cta-word"], `scale(${lerp(1.15, 1, oB(p, 1.3)).toFixed(4)})`); el["cta-word"].style.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : "none";
      for (const i of [79, 80, 81]) reveal(wEl[i], t, S(i), true); }
    // الختام
    show(el.closer, heroB ? 1 : 0);
    if (heroB) { for (let i = 82; i <= 88; i++) reveal(wEl[i], t, S(i), true); pop(el["logo-tile"], t, C.logo, 0.32, -10); } else show(el["logo-tile"], 0);
  }

  /* ===== الكرت الأبيض ===== */
  if (inWhite) { T(el.imagine, `scale(${lerp(1, 1.04, pr(t, C.cut_white, C.cut_story - C.cut_white)).toFixed(4)})`); for (const i of [10, 11, 12]) reveal(wEl[i], t, S(i)); }

  /* ===== عالم القصة ===== */
  if (inStory) {
    sceneState("a-", t); sceneState("b-", t);
    const wp = pr(t, C.whip, 0.2), wq = pr(t, C.whip + 0.13, 0.26);          // whip: A يطلع يسار، B يدخل من اليمين
    const frozen = t >= C.freeze && t < C.unfreeze, fz = pr(t, C.freeze, C.unfreeze - C.freeze), fend = pr(t, C.unfreeze - 0.26, 0.26);
    el.story.style.filter = frozen ? `grayscale(1) contrast(1.08) brightness(${lerp(1, 0.45, fend).toFixed(3)}) blur(${(fend * 12).toFixed(1)}px)` : "none";
    T(el.tiles, `translate(${(-ioC(pr(t, C.whip, 0.4)) * 360 - (t - C.cut_story) * 9).toFixed(1)}px,${(-ioC(pr(t, C.pan, 0.6)) * 300).toFixed(1)}px)`);
    // الكرت A: نظرة كاملة على الخزان والحنفيتين
    show(el.cardA, wp < 1 ? 1 : 0);
    T(el.cardA, `translate(${(-iC(wp) * 1300).toFixed(1)}px,0) rotate(-1.2deg) scale(${lerp(0.6, 0.9, oC(pr(t, C.cut_story, 1.1))).toFixed(4)})`);
    el.cardA.style.filter = wp > 0 && wp < 1 ? `blur(${(wp * 16).toFixed(1)}px)` : "none";
    setCam(el.cardA, mixV(VIEW.all, { x: 40, y: 190, w: 930 }, pr(t, C.cut_story, 1.2)));
    // الكرت B: لقطات قريبة (الأولى ← المحبس ← الثانية)
    show(el.cardB, wq > 0 ? 1 : 0);
    const grow = lerp(0.8, 1, pr(t, C.whip + 0.13, C.cut_link - C.whip)) * (frozen ? 1 + 0.1 * fz : t >= C.unfreeze ? 1 : 1);
    T(el.cardB, `translate(${((1 - oC(wq)) * 1300).toFixed(1)}px,0) rotate(1deg) scale(${grow.toFixed(4)})`);
    el.cardB.style.filter = wq > 0 && wq < 1 ? `blur(${((1 - wq) * 16).toFixed(1)}px)` : "none";
    let v = VIEW.top, vb = 0;
    if (t >= C.unfreeze) v = mixV(VIEW.top, VIEW.valve, oC(pr(t, C.unfreeze, 0.3)));
    if (t >= C.pan) { const q = pr(t, C.pan, 0.55); v = mixV(VIEW.valve, VIEW.bottom, ioC(q)); vb = Math.sin(Math.PI * q) * 9; }
    setCam(el.cardB, v, vb);
    // ملصق السؤال
    const sp = pr(t, S(21), 0.2); show(el.sticker, frozen && t >= S(21) ? 1 : 0); T(el.sticker, `rotate(-5deg) scale(${(oB(sp, 2.2) * (1 + 0.06 * fz)).toFixed(4)})`);
  }

  /* ===== عالم الشرح: كرت الربط ← المخطط ← 3 خطوات ===== */
  if (inExplain) {
    const linkOn = t < C.cut_diag;
    show(el.link, linkOn ? 1 : 0);
    if (linkOn) { T(el.link, `scale(${lerp(1, 1.04, pr(t, C.cut_link, C.cut_diag - C.cut_link)).toFixed(4)})`); for (const i of [29, 30, 31]) reveal(wEl[i], t, S(i)); T(el["link-rule"], `scaleX(${oC(pr(t, C.underline - 0.25, 0.4)).toFixed(4)})`); }
    show(el.diagram, linkOn ? 0 : 1);
    if (!linkOn) {
      // سفر الكاميرا داخل نفس اللوحة + عزل بالعمق وقت الخطوات
      const f = oC(pr(t, C.cut_e1 - 0.08, 0.38)), k2 = ioC(pr(t, C.cut_e2 - 0.08, 0.4)), k3 = ioC(pr(t, C.cut_e3 - 0.08, 0.4));
      const sc = 1.15 * lerp(1, 1.05, pr(t, C.cut_diag, C.cut_e1 - C.cut_diag)) * lerp(1, 1.3, f) + 0.12 * k2 - 0.02 * k3;
      const tx = lerp(-70, 170, f) - 40 * k2 - 330 * k3, ty = lerp(0, 120, f) - 150 * k2 + 190 * k3;
      T(el.diagram, `translate(${tx.toFixed(1)}px,${ty.toFixed(1)}px) scale(${sc.toFixed(4)})`);
      el.diagram.style.opacity = lerp(1, 0.24, f); el.diagram.style.filter = f > 0.02 ? `blur(${(f * 6).toFixed(1)}px)` : "none";
      A(el["d-case"], "stroke-dashoffset", (1 - oC(pr(t, C.cut_diag, 0.45))).toFixed(4)); show(el["d-caselbl"], pr(t, C.cut_diag + 0.1, 0.2)); A(el["d-slots"], "opacity", pr(t, C.cut_diag + 0.25, 0.2));
      pop(el["d-mon"], t, C.d_monitor, 0.32, -8); pop(el["d-mobo"], t, C.d_mobo, 0.32, 9);
      A(el["d-l1"], "stroke-dashoffset", (1 - oC(pr(t, C.d_line1 - 0.1, 0.24))).toFixed(4));
      const dead = pr(t, C.d_dead, 0.25);
      A(el["d-l1"], "opacity", 1 - dead); A(el["d-l1dead"], "opacity", dead); el["d-mobo"].style.filter = dead > 0 ? `grayscale(${dead}) brightness(${lerp(1, 0.55, dead).toFixed(3)})` : "none";
      { const b = el["d-bx"]; const p = pr(t, C.d_dead + 0.05, 0.14); show(b, t < C.d_dead + 0.05 ? 0 : 1); b.style.left = "568px"; b.style.top = "866px"; T(b, `scale(${lerp(2.2, 1, iC(p)).toFixed(4)})`); }
      pop(el["d-gpu"], t, C.d_gpu, 0.32, -9); el["d-gpu"].style.boxShadow = t >= C.d_gpu ? "0 0 0 5px #7DB4FF, 0 0 46px rgba(79,146,255,.85)" : "";
      A(el["d-l2"], "stroke-dashoffset", (1 - oC(pr(t, C.d_line2, 0.3))).toFixed(4));
      { const b = el["d-bok"]; const p = pr(t, C.d_ok, 0.14); show(b, t < C.d_ok ? 0 : 1); b.style.left = "568px"; b.style.top = "1104px"; T(b, `scale(${lerp(2.2, 1, iC(p)).toFixed(4)})`); }
      A(el["d-l2dots"], "opacity", t >= C.d_ok ? 0.95 : 0); A(el["d-l2dots"], "stroke-dashoffset", (-(t * 150) % 48).toFixed(1));
      A(el["d-scr"], "fill", t >= C.d_ok ? "#4F8FE8" : "#0A0D13");
    }
    // النوافذ
    const win = (n, t0, t1) => { if (t < t0 + 0.06 || t >= t1 + 0.1) { show(n, 0); return false; }
      const p = pr(t, t0 + 0.06, 0.3), out = pr(t, t1 - 0.06, 0.16); show(n, Math.min(1, p * 4) * (1 - out));
      T(n, `scale(${(lerp(0.84, 1, oB(p, 1.5)) * lerp(1, 1.035, pr(t, t0, t1 - t0)) * lerp(1, 0.92, out)).toFixed(4)})`); return true; };
    if (win(el.win1, C.cut_e1, C.cut_e2)) {       // 1) الكيبل ينتقل بنفسه من منافذ الماذربورد لمنافذ الكرت
      const q = pr(t, C.e1_move, C.e1_lock - C.e1_move), e = ioC(q), px = 190 + Math.sin(Math.PI * q) * 150, py = lerp(265, 499, e);
      A(el["w1-plug"], "transform", `translate(${px.toFixed(1)},${py.toFixed(1)})`); A(el["w1-cable"], "d", `M${(px + 62).toFixed(1)},${py.toFixed(1)} C${(px + 330).toFixed(1)},${py.toFixed(1)} 700,${lerp(520, 640, e).toFixed(1)} 800,720`);
      const k = (t % 0.7) / 0.7; A(el["w1-red"], "opacity", q > 0 ? 0 : 0.35 + 0.65 * (1 - k)); A(el["w1-red"], "r", lerp(70, 92, k));
      A(el["w1-green"], "opacity", t >= C.e1_lock ? 1 : 0); A(el["w1-green"], "r", lerp(100, 74, oC(pr(t, C.e1_lock, 0.2))));
      stamp(el["w1-ok"], t, C.e1_lock + 0.1, 610, 499);
    }
    if (win(el.win2, C.cut_e2, C.cut_e3)) {       // 2) دخّله لآخره من الطرفين ← تحذير DisplayPort
      const sw = pr(t, C.e2_panel, 0.2); show(el.w2A, 1 - sw); show(el.w2B, sw); T(el.w2A, `translate(${(-sw * 60).toFixed(1)}px,0)`); T(el.w2B, `translate(${((1 - oC(sw)) * 80).toFixed(1)}px,0)`);
      [[0, C.e2_pushA], [1, C.e2_pushB]].forEach(([k, t0]) => { const y = 290 + k * 270, p = oB(pr(t, t0, 0.2), 1.1), tx = lerp(318, 190, p);
        A(el["w2p" + k], "transform", `translate(${tx.toFixed(1)},${y})`); A(el["w2c" + k], "d", `M${(tx + 262).toFixed(1)},${y} H800`);
        A(el["w2g" + k], "opacity", t < t0 ? 0.5 + 0.5 * Math.sin(t * 12) : 0); stamp(el["w2ok" + k], t, t0 + 0.16, 0, 0); });
      const lk = pr(t, C.e2_look, 0.25); A(el.w2mag, "opacity", lk); A(el.w2mag, "r", lerp(140, 92, oC(lk))); A(el.w2mag, "stroke-dashoffset", (t * 40).toFixed(1));
      const deadT = t >= C.e2_dead;
      for (let i = 0; i < 4; i++) { const ph = ((t * 0.9 + i * 0.25) % 1); const x = lerp(770, 590, ph); A(el["w2d" + i], "cx", x.toFixed(1)); A(el["w2d" + i], "opacity", deadT ? 0.18 : ph > 0.85 ? (1 - ph) / 0.15 : 1); A(el["w2d" + i], "fill", deadT ? "#7A8699" : "#fff"); }
      A(el.w2gapfill, "opacity", deadT ? 0.55 : 0); stamp(el.w2x, t, C.e2_dead, 0, 0);
    }
    if (win(el.win3, C.cut_e3, C.cut_cta)) {      // 3) اختر المدخل الصح ← ترجع الصورة
      const row = t >= C.e3_row3 ? 2 : t >= C.e3_row2 ? 1 : 0, t0 = row === 2 ? C.e3_row3 : row === 1 ? C.e3_row2 : -9, m = oC(pr(t, t0, 0.14));
      A(el["w3-hl"], "y", (254 + lerp(Math.max(0, row - 1), row, m) * 68).toFixed(1)); A(el["w3-hl"], "fill", row === 2 && t - C.e3_row3 > 0.14 ? ACC : ACCD);
      const mg = t >= C.e3_menu && t < C.e3_on ? 0.5 + 0.5 * Math.sin((t - C.e3_menu) * 10) : 0; A(el["w3-panel"], "stroke-width", (4 + mg * 6).toFixed(1));
      const on = pr(t, C.e3_on, 0.28); A(el["w3-desk"], "opacity", on); A(el["w3-osd"], "opacity", 1 - pr(t, C.e3_on, 0.12));
      stamp(el["w3-ok"], t, C.e3_ok, 0, 0);
    }
  }

  /* ===== الحلقة: آخر ثانية تذوب في الفريم الأول ===== */
  show(el.loopimg, D.loop && loopReady ? pr(t, D.loop.start, D.loop.dur - 0.2) : 0);   // آخر 0.2ث = الفريم الأول بالضبط
}

/* ---------- فحص المناطق الآمنة (كل نص مهم معلّم بـ data-safe) ---------- */
function qa(t) {
  const out = [];
  document.querySelectorAll("[data-safe]").forEach((n) => {
    let o = 1; for (let p = n; p && p !== document.body; p = p.parentElement) o *= parseFloat(getComputedStyle(p).opacity);
    if (o < 0.5 || getComputedStyle(n).visibility === "hidden") return;
    let r = n.getBoundingClientRect(); if (n.classList.contains("card-text")) { const rs = [...n.querySelectorAll(".row")].filter((x) => getComputedStyle(x).visibility !== "hidden").map((x) => x.getBoundingClientRect()).filter((x) => x.width > 2); if (!rs.length) return; r = { left: Math.min(...rs.map((x) => x.left)), right: Math.max(...rs.map((x) => x.right)), top: Math.min(...rs.map((x) => x.top)), bottom: Math.max(...rs.map((x) => x.bottom)), width: 9, height: 9 }; }
    if (r.width < 2 || r.height < 2) return; if (n.id === "cta" && t >= C.cut_close - 0.12) return;
    const bad = r.top < 180 ? "top<180" : r.bottom > 1500 ? "bottom>1500" : (r.right > 962 && r.bottom > 800 && r.top < 1600) ? "right>960" : r.left < 0 || r.right > 1080 ? "offscreen" : null;
    if (bad && !(t >= C.cut_e1 - 0.1 && n.closest("#diagram"))) out.push({ type: "safe_zone", t: +t.toFixed(2), id: n.dataset.safe, why: bad, rect: [r.left, r.top, r.right, r.bottom].map(Math.round) });
  });
  return out;
}

let loopReady = false;
window.__loop = D.loop || null;
window.__setLoopFrame = (src) => new Promise((res) => { el.loopimg.onload = () => { loopReady = true; res(true); }; el.loopimg.src = src; });
window.__qa = qa;
window.__meta = { id: D.id, style: D.style, duration: DUR, fps: D.fps };
window.renderFrame = renderFrame;
Promise.all([document.fonts.load('800 100px "Baloo Bhaijaan 2"', "تيربو"), document.fonts.load('800 100px "Baloo Bhaijaan 2"', "Turbo"), document.fonts.load('700 30px "Inter"', "HDMI"), document.fonts.ready,
  ...[...document.images].filter((i) => i.id !== "loopimg").map((i) => i.decode().catch(() => {}))]).then(() => { fitCaps(); renderFrame(0); window.__ready = true; });
