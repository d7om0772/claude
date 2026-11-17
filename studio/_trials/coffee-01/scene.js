/* =============================================================================
 scene.js — تجربة "محاصيل القهوة" (trial-coffee-01): نفس نظام الأسلوب بدون قصة التشبيه.
 البنية: هوك (سؤال) ← جواب + البطل (كيس قهوة) ← كرت جسر (الوقفة) ← مخطط (3 عوامل) ← لوحة الارتفاع
         ← خريطة تتنقل: إثيوبيا ← اليمن ← البرازيل ← CTA ← ختام (البطل يرجع).
 DOM + SVG فقط، window.renderFrame(t) حتمية. الخريطة تتحرك بتغيير viewBox (مو transform لطبقة كبيرة)،
 وبدون filter على عالم كامل (دروس رندر التجربة 2).
 القواعد: بدون ذوات أرواح (حبوب، أكياس، جبال، نباتات، خرائط) · بدون موسيقى · بدون شعارات · المناطق الآمنة · الحلقة.
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
const INK = "#2A1A12", ACC = "#B83A2E", GOLD = "#E2A15A", LEAF = "#4F7A3A", CHERRY = "#C0392B";
const clean = (s) => s.replace(/[،.:]+$/u, "");
const wordHTML = (i, cls = "", keep = false) => `<span class="w ${cls}" data-i="${i}">${keep ? W[i].w.replace(/[.]+$/u, "") : clean(W[i].w)}</span>`;
const lineHTML = (i0, i1) => Array.from({ length: i1 - i0 + 1 }, (_, k) => wordHTML(i0 + k, "", k < i1 - i0)).join("");

/* ---------- رسومات (جمادات ونباتات فقط) ---------- */
const beanArt = (x, y, r, rot, id = "", fill = "#5A3420") => `<g ${id ? `id="${id}"` : ""} transform="translate(${x},${y}) rotate(${rot})">
  <ellipse rx="${r * 0.74}" ry="${r}" fill="rgba(40,20,8,.25)" transform="translate(${r * 0.12},${r * 0.18})"/>
  <ellipse rx="${r * 0.74}" ry="${r}" fill="${fill}"/><ellipse rx="${r * 0.5}" ry="${r * 0.78}" fill="#fff" opacity=".07" transform="translate(${-r * 0.16},${-r * 0.12})"/>
  <path d="M0,${-r * 0.86} C${r * 0.34},${-r * 0.3} ${-r * 0.34},${r * 0.3} 0,${r * 0.86}" fill="none" stroke="#2E170C" stroke-width="${Math.max(3, r * 0.12)}" stroke-linecap="round"/></g>`;
const pinArt = (id, s = 1) => `<g id="${id}"><g transform="scale(${s})"><ellipse cx="0" cy="2" rx="12" ry="4" fill="rgba(40,20,8,.3)"/>
  <path d="M0,0 C-10,-14 -18,-22 -18,-34 A18,18 0 1 1 18,-34 C18,-22 10,-14 0,0 Z" fill="${ACC}"/><circle cy="-34" r="7.5" fill="#FFF9F1"/></g></g>`;
const ICON = {
  sprout: `<path d="M22,40 V22" stroke="${LEAF}" stroke-width="5" stroke-linecap="round"/><path d="M22,24 C8,24 6,12 8,8 C16,8 24,14 22,24 Z" fill="${LEAF}"/><path d="M22,20 C34,20 38,10 36,4 C26,4 20,12 22,20 Z" fill="#6E9A4E"/>`,
  berry: `<path d="M22,6 C26,10 30,10 34,8" stroke="${LEAF}" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="14" cy="26" r="10" fill="${CHERRY}"/><circle cx="30" cy="24" r="10" fill="#A93226"/><circle cx="22" cy="36" r="9" fill="#D9534F"/><circle cx="11" cy="22" r="3" fill="#fff" opacity=".5"/>`,
  flower: `${[0, 72, 144, 216, 288].map((a) => `<ellipse cx="22" cy="11" rx="7" ry="11" fill="#F3B6C2" transform="rotate(${a} 22 22)"/>`).join("")}<circle cx="22" cy="22" r="6" fill="${GOLD}"/>`,
  sun: `<circle cx="22" cy="22" r="9" fill="${GOLD}"/>${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="20.5" y="1" width="3" height="8" rx="1.5" fill="${GOLD}" transform="rotate(${a} 22 22)"/>`).join("")}`,
  first: `<circle cx="22" cy="20" r="15" fill="${GOLD}"/><text x="22" y="27" text-anchor="middle" font-family="Baloo Bhaijaan 2" font-weight="800" font-size="22" fill="${INK}">1</text><path d="M13,32 L9,44 L16,40 L20,46 L22,34 Z M31,32 L35,44 L28,40 L24,46 L22,34 Z" fill="${ACC}"/>`,
  sack: `<path d="M10,14 C10,8 34,8 34,14 L38,38 C38,43 6,43 6,38 Z" fill="#C99E6B"/><path d="M12,14 C16,10 28,10 32,14" stroke="#8E6A47" stroke-width="3" fill="none"/>${beanArt(22, 28, 7, 20, "", "#5A3420")}`,
  sugar: `<path d="M8,16 L22,8 L36,16 L36,32 L22,40 L8,32 Z" fill="#fff" stroke="#D8C7AE" stroke-width="2"/><path d="M8,16 L22,24 L36,16 M22,24 V40" stroke="#D8C7AE" stroke-width="2" fill="none"/>`,
  gauge: `<path d="M6,32 A16,16 0 0 1 38,32" fill="none" stroke="#E7D8C2" stroke-width="7" stroke-linecap="round"/><path d="M6,32 A16,16 0 0 1 12,20" fill="none" stroke="${LEAF}" stroke-width="7" stroke-linecap="round"/><path d="M22,32 L12,24" stroke="${INK}" stroke-width="4" stroke-linecap="round"/><circle cx="22" cy="32" r="4" fill="${INK}"/>`,
  mountain: `<path d="M4,40 L18,14 L26,26 L32,18 L42,40 Z" fill="#B48A5E"/><path d="M18,14 L22,21 L18,19 L14,21 Z" fill="#fff"/>`,
  plant: `<path d="M22,42 V10" stroke="#6B4A2E" stroke-width="4" stroke-linecap="round"/>${[[22, 14, -1], [22, 22, 1], [22, 30, -1]].map(([x, y, d]) => `<ellipse cx="${x + d * 9}" cy="${y}" rx="9" ry="4.5" fill="${LEAF}" transform="rotate(${d * -25} ${x + d * 9} ${y})"/>`).join("")}<circle cx="15" cy="27" r="3.5" fill="${CHERRY}"/><circle cx="29" cy="20" r="3.5" fill="${CHERRY}"/>`,
  dry: `<circle cx="32" cy="10" r="7" fill="${GOLD}"/><rect x="4" y="26" width="36" height="8" rx="2" fill="#8E6A47"/><path d="M8,34 V42 M36,34 V42" stroke="#8E6A47" stroke-width="3"/>${[10, 17, 24, 31].map((x, k) => `<circle cx="${x}" cy="23" r="3.5" fill="${k % 2 ? "#A93226" : CHERRY}"/>`).join("")}`,
};
const icon = (k, s = 44) => `<svg width="${s}" height="${s}" viewBox="0 0 44 44">${ICON[k]}</svg>`;

/* البطل: كيس قهوة كرافت عليه بطاقة المنشأ */
const bagArt = () => `
  <ellipse cx="540" cy="1322" rx="290" ry="32" fill="rgba(60,35,15,.18)"/>
  <path d="M322,830 L758,830 L790,1296 Q792,1322 766,1322 L314,1322 Q288,1322 290,1296 Z" fill="#C99E6B"/>
  <path d="M690,830 L758,830 L790,1296 Q792,1322 766,1322 L728,1322 Z" fill="#B88C59"/>
  <path d="M330,770 L750,770 L758,840 L322,840 Z" fill="#B88C59"/><path d="M330,770 ${Array.from({ length: 14 }, (_, k) => `L${345 + k * 30},${k % 2 ? 770 : 756}`).join(" ")} L750,770" fill="#B88C59"/>
  <path d="M322,840 L758,840" stroke="#9C7547" stroke-width="5"/>
  <rect x="392" y="960" width="296" height="250" rx="20" fill="#FFF9F1"/><rect x="392" y="960" width="296" height="250" rx="20" fill="none" stroke="#E7D8C2" stroke-width="4"/>
  <circle cx="540" cy="1050" r="46" fill="none" stroke="#D8C7AE" stroke-width="4" stroke-dasharray="10 8"/>
  <rect x="440" y="1128" width="200" height="16" rx="8" fill="#E7D8C2"/><rect x="470" y="1160" width="140" height="16" rx="8" fill="#E7D8C2"/>
  <circle id="h-glow" cx="540" cy="1040" r="90" fill="${ACC}" opacity="0" filter="url(#hglow)"/>
  <g id="h-pinG">${pinArt("h-pin", 2.2)}</g>
  ${[[300, 1372, -30], [384, 1410, 20], [470, 1392, -10], [560, 1418, 35], [650, 1396, -25], [738, 1412, 15], [820, 1370, 40], [250, 1310, 10]].map(([x, y, r], k) => beanArt(x, y, 30, r, "hb" + k)).join("")}`;

/* الخريطة: إسقاط بسيط (lon,lat) ← (x,y)، 12 بكسل لكل درجة */
const MX = (lon) => (lon + 90) * 12, MY = (lat) => (35 - lat) * 12;
const poly = (P) => P.map(([lo, la]) => `${MX(lo).toFixed(0)},${MY(la).toFixed(0)}`).join(" ");
const LAND = {
  ca: [[-90, 14], [-90, 21.5], [-87, 21.5], [-88, 16], [-84, 15.5], [-83.5, 11], [-81, 8.5], [-79, 9.4], [-77.5, 8.5], [-79, 7], [-81, 7.5], [-85, 10], [-87.5, 13]],
  sa: [[-77.5, 8.5], [-75.5, 10.8], [-72, 12.2], [-71, 11], [-68, 10.6], [-62, 10.6], [-60, 8.5], [-57, 6], [-52, 5], [-50, 1.5], [-48, -1], [-44, -2.5], [-40, -3], [-35, -5.5], [-35, -9], [-39, -14], [-39.5, -18], [-41, -22], [-44, -23], [-48, -26], [-49, -29], [-53, -33.5], [-57, -35], [-58, -38.5], [-62, -39], [-65, -41], [-66, -46], [-72, -46], [-74, -40], [-73.5, -36], [-71.5, -30], [-71, -24], [-70.3, -18], [-75, -15.5], [-77, -12], [-80, -6], [-81, -4.5], [-80, -1], [-80, 0.8], [-78.5, 2], [-77.5, 4], [-77.3, 7]],
  af: [[-17, 21], [-17.5, 14.7], [-16.5, 12.5], [-13, 9], [-11, 6.8], [-7.5, 4.4], [-2, 4.8], [2, 6.3], [6, 4.3], [9, 4], [9.5, 1], [9, -1], [12, -5], [13.5, -11], [11.8, -17], [14.5, -23], [16.5, -28.5], [18.5, -34.3], [20, -34.8], [25.5, -34], [28, -33], [32.5, -28.5], [33, -25.5], [35.5, -24], [35.3, -21], [37, -17.5], [40.5, -15], [40.3, -10.5], [39.3, -6.5], [39, -5], [41, -1.5], [42, 0], [44, 2], [47, 4.5], [49.5, 8], [51.2, 10.5], [51, 12], [48, 11.3], [45, 10.5], [43.3, 11.5], [42.8, 12.6], [41, 14.5], [39.5, 15.5], [38.5, 18], [37.3, 21], [36.5, 22.5], [35.5, 24.5], [34, 27], [32.5, 30], [32, 31.2], [30, 31.5], [25, 31.8], [20, 31], [19, 30.3], [15, 32.3], [11, 33.3], [10.5, 37], [0, 36], [-6, 35.8], [-9.5, 30.5], [-13, 27.5]],
  ar: [[34.9, 29.5], [35.2, 28], [36.6, 26], [38.5, 23.5], [39.2, 21.5], [40.5, 19.5], [41.7, 17], [42.7, 15.5], [43.3, 13], [44, 12.6], [45, 12.9], [48.5, 14], [52.2, 15.6], [55, 17], [56.5, 18], [57.8, 20], [59.8, 22.5], [58.5, 23.7], [56.3, 24.9], [56, 26.2], [55, 25.5], [52, 24], [51.5, 25.8], [50.3, 25.5], [49.5, 27], [48.4, 28.5], [47.7, 30], [48.8, 30.3], [47, 31.5], [44, 32.5], [41, 33.5], [39, 32.3], [36.5, 33.5], [35.8, 32.5], [35.5, 31.5]],
  ir: [[48.8, 30.3], [50.5, 29.8], [51.5, 27.9], [54.5, 26.6], [56.5, 27.1], [57.5, 25.8], [62, 25.2], [62, 37], [44, 37], [44, 34], [47, 33]],
  md: [[49.3, -12], [50.4, -15.5], [49.5, -18], [48.5, -22], [47.1, -24.9], [45.2, -25.5], [44, -23.5], [43.7, -21], [44.4, -16.5], [46.5, -15.7], [48, -13.5]],
};
const COUNTRY = {
  eth: { P: [[36.5, 14.3], [37.9, 14.9], [40, 14.5], [41.5, 13.5], [42.4, 12.5], [43, 11.5], [42.8, 10.9], [44, 9], [47.9, 8], [45, 5], [42, 4], [41, 3.9], [39.5, 3.4], [38, 3.6], [36, 4.5], [35.3, 5.5], [34.5, 6.8], [33, 8], [34.2, 9.5], [35, 11], [35.6, 12.6]], c: [39.5, 8.6] },
  yem: { P: [[42.7, 15.7], [43.3, 13], [44, 12.6], [45, 12.9], [48.5, 14], [52.2, 15.6], [53.1, 16.6], [52, 19], [49, 18.6], [47.5, 17.3], [46.5, 17.2], [45.2, 17.4], [44, 17.4], [43.2, 16.8]], c: [46.5, 15.6] },
  bra: { P: [[-60, 5], [-56, 2], [-52, 4], [-50, 1.5], [-48, -1], [-44, -2.5], [-40, -3], [-35, -5.5], [-35, -9], [-39, -14], [-39.5, -18], [-41, -22], [-44, -23], [-48, -26], [-49, -29], [-53, -33.5], [-55, -31], [-57.5, -30], [-54, -27], [-54.5, -25], [-58, -22.5], [-58, -17.5], [-60, -16], [-61.5, -13.5], [-65, -11.5], [-69.5, -11], [-73, -9], [-73.5, -7.5], [-70, -4], [-69.5, -1], [-69.5, 1.5], [-66, 1], [-64, 2.5], [-63, 4]], c: [-50, -10] },
};
const mapSVG = () => `
<svg id="map" width="960" height="720" viewBox="0 0 1800 900" xmlns="http://www.w3.org/2000/svg">
  <rect x="-2000" y="-2000" width="6000" height="5000" fill="#CFE3DF"/>
  <rect x="-2000" y="${MY(25)}" width="6000" height="${MY(-30) - MY(25)}" fill="rgba(184,58,46,.07)"/>
  ${[25, -30].map((la) => `<path d="M-2000,${MY(la)} H4000" stroke="rgba(184,58,46,.4)" stroke-width="3" stroke-dasharray="14 10" vector-effect="non-scaling-stroke"/>`).join("")}
  <path d="M-2000,${MY(0)} H4000" stroke="rgba(42,26,18,.18)" stroke-width="2" stroke-dasharray="4 8" vector-effect="non-scaling-stroke"/>
  ${Object.values(LAND).map((P) => `<polygon points="${poly(P)}" fill="rgba(90,60,30,.16)" transform="translate(4,7)"/>`).join("")}
  ${Object.values(LAND).map((P) => `<polygon points="${poly(P)}" fill="#F7EEDF" stroke="#E3D2B6" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join("")}
  ${Object.entries(COUNTRY).map(([k, o]) => `<polygon id="m-${k}" points="${poly(o.P)}" fill="${ACC}" opacity="0" stroke="#7E2219" stroke-width="2" vector-effect="non-scaling-stroke"/>`).join("")}
  ${Object.keys(COUNTRY).map((k) => `<g id="m-pin-${k}" opacity="0">${pinArt("m-pinI-" + k)}</g>`).join("")}
</svg>`;
const VIEW = { over: { cx: 880, cy: 450, w: 1760 }, eth: { cx: MX(40.5), cy: MY(10), w: 640 }, yem: { cx: MX(45.5), cy: MY(13), w: 640 }, bra: { cx: MX(-51), cy: MY(-11), w: 1050 } };
const mixV = (a, b, p) => ({ cx: lerp(a.cx, b.cx, p), cy: lerp(a.cy, b.cy, p), w: Math.exp(lerp(Math.log(a.w), Math.log(b.w), p)) });
const EX = {
  eth: { name: clean(W[32].w), t: "eth", chips: [["sprout", "موطن الأرابيكا", "eth_c1"], ["berry", "فواكه", "eth_c2"], ["flower", "ورود", "eth_c3"]] },
  yem: { name: clean(W[39].w).replace(/^و/, ""), t: "yem", chips: [["first", "أول محصول", "yem_c1"], ["sun", "تجفيف طبيعي", "yem_c2"], ["berry", "فواكه", "yem_c3"]] },
  bra: { name: clean(W[49].w).replace(/^و/, ""), t: "bra", chips: [["sack", "أكبر منتج", "bra_c1"], ["sugar", "حلوة", "bra_c2"], ["gauge", "حموضة خفيفة", "bra_c3"]] },
};

/* ---------- بناء DOM ---------- */
stage.innerHTML = `
<div class="world" id="brand">
  <div id="hero"><svg width="1080" height="1920" viewBox="0 0 1080 1920"><defs><filter id="hglow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="26"/></filter></defs>${bagArt()}</svg></div>
  <div class="card-text" id="hook" style="top:760px;font-size:136px" data-safe="hook"><div class="row">${wordHTML(0)}${wordHTML(1)}</div><div class="row">${wordHTML(2, "acc mark")}${wordHTML(3)}</div></div>
  <div class="card-text" id="cta" style="top:620px" data-safe="cta">
    <div class="row" style="font-size:92px">${wordHTML(57)}</div>
    <div class="rule" id="cta-rule" style="width:620px;margin:16px 0 4px"></div>
    <div class="row acc" id="cta-word" style="font-size:212px;line-height:1.2"><span class="w mark">«${clean(W[58].w)}»</span></div>
    <div class="row" style="font-size:84px;margin-top:4px">${wordHTML(59)}${wordHTML(60)}</div>
  </div>
  <div class="card-text" id="closer" style="top:214px" data-safe="closer">
    <div class="row" style="font-size:72px">${[61, 62, 63, 64].map((i) => wordHTML(i)).join("")}</div>
    <div class="row acc" style="font-size:150px;line-height:1.1">${wordHTML(65)}${wordHTML(66)}</div>
    <div class="row" style="font-size:66px;color:#7A6555">${[67, 68, 69, 70].map((i) => wordHTML(i)).join("")}</div>
  </div>
</div>
<div class="world" id="bridge"><div class="card-text" id="ask" style="top:840px;font-size:150px;color:#FFF4E6" data-safe="ask"><div class="row">${wordHTML(11)}${wordHTML(12)}${wordHTML(13)}</div></div></div>
<div class="world" id="explain"><div class="bloom"></div><div class="dots"></div>
  <div id="diagram">
    <svg class="fill" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs><filter id="glw" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="hub" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="30"/></filter></defs>
      <circle id="d-halo" cx="540" cy="720" r="190" fill="${GOLD}" opacity="0" filter="url(#hub)"/>
      ${[835, 540, 245].map((x, k) => `<path id="d-sp${k}" d="M540,880 C540,960 ${x},950 ${x},1028" fill="none" stroke="${GOLD}" stroke-width="6" stroke-linecap="round" filter="url(#glw)" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1"/>`).join("")}
      <g id="d-bean" opacity="0">${beanArt(0, 0, 150, -18, "", "#6B3E24")}</g>
    </svg>
    ${[735, 440, 145].map((x, k) => `<div class="slot" id="d-s${k}" style="left:${x}px;top:1030px"></div>`).join("")}
    ${[["mountain", 19], ["plant", 20], ["dry", 21]].map(([ic, wi], k) => `<div class="tile" id="d-t${k}" style="left:${[735, 440, 145][k]}px;top:1030px">${icon(ic, 120)}<div class="lbl" data-safe="d-t${k}">${clean(W[wi].w).replace(/^و/, "")}</div></div>`).join("")}
  </div>
  <div class="panel" id="alt"><svg width="800" height="820" viewBox="0 0 800 820">
    <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7EC"/><stop offset="1" stop-color="#F1DFC4"/></linearGradient></defs>
    <rect width="800" height="820" fill="url(#sky)"/>
    <polygon points="-20,820 180,430 330,620 520,330 820,820" fill="#E2CBA6"/>
    <polygon points="40,820 400,170 780,820" fill="#B48A5E"/><polygon points="400,170 780,820 560,820" fill="#A07A50"/>
    <polygon points="400,170 440,240 410,228 385,250 365,232" fill="#FFF9F1"/>
    <polygon points="-20,820 -20,700 200,640 420,720 620,690 820,740 820,820" fill="#8E6A47"/>
    <path id="a-path" d="M150,690 C240,600 300,520 330,430 C360,340 380,270 398,215" fill="none" stroke="#FFF9F1" stroke-width="7" stroke-dasharray="18 14" stroke-linecap="round" opacity=".85"/>
    <g transform="translate(722,0)"><rect x="-6" y="190" width="12" height="520" rx="6" fill="#E7D8C2"/>${[0, 1, 2, 3, 4].map((k) => `<rect x="-22" y="${700 - k * 125}" width="44" height="6" rx="3" fill="#D8C7AE"/>`).join("")}
      <polygon id="a-mark" points="-34,0 -14,-14 -14,14" fill="${ACC}"/></g>
    <g id="a-plant">${`<g transform="translate(-60,-120) scale(2.7)">${ICON.plant}</g>`}</g>
    <g id="a-glass" opacity="0" transform="translate(140,200)"><rect x="-56" y="-86" width="112" height="16" rx="8" fill="#8E6A47"/><rect x="-56" y="70" width="112" height="16" rx="8" fill="#8E6A47"/>
      <path d="M-44,-70 L44,-70 L6,0 L44,70 L-44,70 L-6,0 Z" fill="#FFF9F1" stroke="#D8C7AE" stroke-width="5"/>
      <path id="a-sandT" d="" fill="${GOLD}"/><path id="a-sandB" d="" fill="${GOLD}"/><rect id="a-stream" x="-2.5" y="0" width="5" height="60" fill="${GOLD}"/></g>
    ${[["berry", -150, -60], ["flower", 0, -150], ["sun", 150, -60]].map(([k, dx, dy], i) => `<g id="a-f${i}" opacity="0" data-dx="${dx}" data-dy="${dy}"><circle r="62" fill="#FFF9F1"/><circle r="62" fill="none" stroke="#E7D8C2" stroke-width="4"/><g transform="translate(-44,-44) scale(2)">${ICON[k]}</g></g>`).join("")}
  </svg></div>
</div>
<div class="world" id="mapw">
  <div id="mapcard">${mapSVG()}</div>
  <div id="excard" data-safe="excard"><div id="exname"></div><div id="exchips"></div></div>
</div>
<div id="cap"><div class="pill" id="capline" data-safe="caption"></div></div>
<canvas id="grain" width="540" height="960" style="width:1080px;height:1920px"></canvas>
<img id="loopimg" alt="">`;

{ const cv = $("#grain"), cx = cv.getContext("2d"), im = cx.createImageData(540, 960); let s = 20261117;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < im.data.length; i += 4) { const v = 170 + rnd() * 85; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255; }
  cx.putImageData(im, 0, 0); }

const el = {}; document.querySelectorAll("[id]").forEach((n) => (el[n.id] = n));
const wEl = {}; document.querySelectorAll(".w[data-i]").forEach((n) => (wEl[n.dataset.i] = n));
const show = (n, v) => { n.style.opacity = v; };
const T = (n, s) => { n.style.transform = s; };
const A = (n, k, v) => n.setAttribute(k, v);
function reveal(n, t, ts, grow = false) {
  if (t < ts - 0.03) { if (grow) n.style.display = "none"; else n.style.visibility = "hidden"; return; }
  const p = pr(t, ts - 0.03, 0.16); n.style.visibility = "visible"; if (grow) n.style.display = "inline-block"; n.style.opacity = Math.min(1, p * 1.6);
  n.style.transform = `translateY(${((1 - oB(p, 1.6)) * 0.32).toFixed(3)}em)`;
}
function pop(n, t, t0, d = 0.3, rot = 9) {
  if (t < t0) { show(n, 0); return 0; }
  const p = pr(t, t0, d); show(n, Math.min(1, p * 4)); T(n, `scale(${oB(p).toFixed(4)}) rotate(${((1 - oC(p)) * rot).toFixed(2)}deg)`); return p;
}

/* ---------- الكابشن ---------- */
const CAPS = D.captions.map((c) => { const n = c.i1 - c.i0 + 1; return { ...c, html: lineHTML(c.i0, c.i1), fs: n <= 2 ? 92 : n === 3 ? 84 : n === 4 ? 76 : 70 }; });
function fitCaps() {
  for (const c of CAPS) { el.capline.style.fontSize = c.fs + "px"; el.capline.innerHTML = c.html; const w = el.capline.getBoundingClientRect().width; if (w > 836) c.fs = Math.floor(c.fs * 836 / w); }
  el.capline.innerHTML = "";
  for (const id of ["hook", "ask", "cta", "closer"]) for (const r of el[id].querySelectorAll(".row")) { const w = r.scrollWidth, fs = parseFloat(getComputedStyle(r).fontSize); if (w > 780) r.style.fontSize = Math.floor(fs * 780 / w) + "px"; }
}
let capIdx = -2, capWords = [];
function caption(t) {
  const i = CAPS.findIndex((c) => t >= c.start && t < c.end);
  if (i !== capIdx) { capIdx = i; el.capline.innerHTML = i < 0 ? "" : CAPS[i].html; if (i >= 0) el.capline.style.fontSize = CAPS[i].fs + "px"; capWords = [...el.capline.querySelectorAll(".w")]; }
  if (i >= 0) { const p = pr(t, CAPS[i].start, 0.18); T(el.capline, `scale(${lerp(0.9, 1, oB(p, 1.6)).toFixed(4)})`); show(el.capline, Math.min(1, p * 3)); }
  for (const n of capWords) reveal(n, t, S(+n.dataset.i), true);
}

/* ---------- بطاقة البلد تحت الخريطة ---------- */
let exKey = null, exChips = [];
function exCard(t) {
  const k = t >= C.bra ? "bra" : t >= C.yem ? "yem" : t >= C.eth ? "eth" : null;
  if (k !== exKey) { exKey = k; el.exname.textContent = k ? EX[k].name : "";
    el.exchips.innerHTML = k ? EX[k].chips.map(([ic, l]) => `<div class="chip">${icon(ic, 60)}<span data-safe="chip">${l}</span></div>`).join("") : ""; exChips = [...el.exchips.children]; }
  if (!k) return;
  const p = pr(t, C[EX[k].t], 0.3); show(el.exname, Math.min(1, p * 3)); T(el.exname, `translateY(${((1 - oB(p, 1.5)) * 40).toFixed(1)}px) scale(${lerp(0.8, 1, oB(p, 1.5)).toFixed(4)})`);
  exChips.forEach((n, j) => pop(n, t, C[EX[k].chips[j][2]], 0.28, j % 2 ? 6 : -6));
}

/* ---------- الرندر ---------- */
const inFlash = (t, cut) => (t >= cut - 0.2 && t < cut - 0.134) || (t >= cut - 0.067 && t < cut);
function renderFrame(t) {
  t = clamp(t, 0, DUR);
  const inBrand = t < C.cut_bridge || t >= C.cut_cta, inBridge = t >= C.cut_bridge && t < C.cut_diag, inExplain = t >= C.cut_diag && t < C.cut_map, inMap = t >= C.cut_map && t < C.cut_cta;
  show(el.brand, inBrand ? 1 : 0); show(el.bridge, inBridge ? 1 : 0); show(el.explain, inExplain ? 1 : 0); show(el.mapw, inMap ? 1 : 0);
  stage.style.filter = inFlash(t, C.cut_bridge) || inFlash(t, C.cut_map) ? "invert(1)" : "none";
  el.grain.style.opacity = inMap ? 0.4 : inExplain ? 0.1 : 0.2;
  caption(t);

  /* ===== الهوية: الهوك ← الكيس (البطل) ← CTA ← الختام ===== */
  if (inBrand) {
    const hookOn = t < C.cut_answer, heroA = t >= C.cut_answer && t < C.cut_bridge, closeP = pr(t, C.cut_close - 0.1, 0.22), heroB = closeP > 0, ctaOn = t >= C.cut_cta;
    show(el.hook, hookOn ? 1 : 0);
    if (hookOn) { T(el.hook, `scale(${lerp(1, 1.05, t / C.cut_answer).toFixed(4)})`);
      for (let i = 0; i <= 3; i++) { const k = t - S(i), b = k >= 0 && k < 0.3 ? Math.sin(Math.PI * k / 0.3) * 0.09 : 0; wEl[i].style.visibility = "visible"; wEl[i].style.opacity = 1; T(wEl[i], `translateY(${(-b * 0.4).toFixed(3)}em) scale(${(1 + b).toFixed(4)})`); } }
    show(el.hero, heroA || heroB ? 1 : 0);
    const pinState = (tp) => { const p = pr(t, tp, 0.32); A(el["h-pinG"], "opacity", t >= tp ? 1 : 0); A(el["h-pinG"], "transform", `translate(540,${lerp(560, 1080, oB(p, 1.2)).toFixed(1)})`);
      A(el["h-glow"], "opacity", t >= tp ? (0.45 + 0.12 * Math.sin(t * 7)) * oC(pr(t, tp + 0.2, 0.3)) : 0); };
    const beans = (tb, all) => { for (let k = 0; k < 8; k++) { const g = el["hb" + k], q = all ? 1 : pr(t, tb + k * 0.07, 0.26), tr = g.getAttribute("data-tr") || g.getAttribute("transform"); g.setAttribute("data-tr", tr);
      A(g, "opacity", q > 0 ? 1 : 0); A(g, "transform", `${tr} scale(${oB(q).toFixed(4)})`); } };
    if (heroA) { const p = pr(t, C.cut_answer, 0.34), push = lerp(1, 1.06, pr(t, C.cut_answer + 0.34, C.cut_bridge - C.cut_answer));
      T(el.hero, `scale(${(lerp(2.8, 1, oC(p)) * push).toFixed(4)})`); el.hero.style.filter = p < 1 ? `blur(${((1 - p) * 18).toFixed(1)}px)` : "none";
      pinState(C.pin); beans(C.beans, false); }
    if (heroB) { T(el.hero, `translate(${((1 - oC(closeP)) * 1080).toFixed(1)}px,${(80).toFixed(0)}px) scale(${lerp(0.86, 0.9, pr(t, C.cut_close, DUR - C.cut_close)).toFixed(4)})`); el.hero.style.filter = closeP < 1 ? `blur(${((1 - closeP) * 10).toFixed(1)}px)` : "none";
      pinState(-1); beans(0, true); }
    show(el.cta, ctaOn && closeP < 1 ? 1 : 0);
    if (ctaOn) { T(el.cta, `translate(${(-iC(closeP) * 1080).toFixed(1)}px,0) scale(${lerp(1, 1.04, pr(t, C.cut_cta, 2)).toFixed(4)})`);
      reveal(wEl[57], t, S(57)); T(el["cta-rule"], `scaleX(${oC(pr(t, S(57) + 0.1, 0.25)).toFixed(4)})`);
      const p = pr(t, C.cta_word, 0.24); el["cta-word"].style.visibility = t < C.cta_word ? "hidden" : "visible"; T(el["cta-word"], `translateY(${((1 - oB(p, 1.4)) * 60).toFixed(1)}px) scale(${lerp(0.85, 1, oB(p, 1.4)).toFixed(4)})`);
      for (const i of [59, 60]) reveal(wEl[i], t, S(i)); }
    show(el.closer, heroB ? 1 : 0);
    if (heroB) for (let i = 61; i <= 70; i++) reveal(wEl[i], t, S(i));
  }

  /* ===== كرت الجسر الأحمر = الوقفة ===== */
  if (inBridge) { T(el.ask, `scale(${lerp(1, 1.06, pr(t, C.cut_bridge, C.cut_diag - C.cut_bridge)).toFixed(4)})`); for (const i of [11, 12, 13]) reveal(wEl[i], t, S(i)); }

  /* ===== الشرح: حبة في النص + 3 عوامل ← لوحة الارتفاع ===== */
  if (inExplain) {
    const f = oC(pr(t, C.alt - 0.08, 0.38));
    T(el.diagram, `scale(${(lerp(0.94, 1, oC(pr(t, C.cut_diag, 0.4))) * lerp(1, 1.04, pr(t, C.cut_diag, C.alt - C.cut_diag)) * lerp(1, 1.3, f)).toFixed(4)})`);
    el.diagram.style.opacity = lerp(1, 0.22, f); el.diagram.style.filter = f > 0.02 ? `blur(${(f * 7).toFixed(1)}px)` : "none";
    { const p = pr(t, C.cut_diag + 0.05, 0.36); A(el["d-bean"], "opacity", t >= C.cut_diag + 0.05 ? 1 : 0); A(el["d-bean"], "transform", `translate(540,720) scale(${oB(p).toFixed(4)}) rotate(${(Math.sin(t * 1.3) * 3).toFixed(2)})`);
      A(el["d-halo"], "opacity", (0.55 * oC(pr(t, C.hub, 0.4))).toFixed(3)); }
    [C.t1, C.t2, C.t3].forEach((t0, k) => {
      pop(el["d-s" + k], t, C.slots + k * 0.08, 0.26, 0); if (t >= t0) show(el["d-s" + k], 0);
      A(el["d-sp" + k], "stroke-dashoffset", (1 - oC(pr(t, Math.min(t0 - 0.15, C.slots + k * 0.08), 0.3))).toFixed(4));
      pop(el["d-t" + k], t, t0, 0.3, k === 1 ? 0 : k ? -8 : 8);
    });
    // لوحة الارتفاع: النبتة تطلع الجبل ← الساعة الرملية (أبطأ) ← نكهات حول القمة (أعقد)
    const on = t >= C.alt + 0.06; show(el.alt, on ? Math.min(1, pr(t, C.alt + 0.06, 0.3) * 4) * (1 - pr(t, C.cut_map - 0.12, 0.12)) : 0);
    if (on) { const p = pr(t, C.alt + 0.06, 0.3); T(el.alt, `translateY(${((1 - oB(p, 1.4)) * 80).toFixed(1)}px) scale(${(lerp(0.9, 1, oC(p)) * lerp(1, 1.04, pr(t, C.alt, C.cut_map - C.alt))).toFixed(4)})`);
      const path = el["a-path"], L = path.getTotalLength(), rp = ioC(pr(t, C.rise, 1.1)), pt = path.getPointAtLength(L * rp);
      A(el["a-plant"], "transform", `translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`);
      A(el["a-mark"], "transform", `translate(0,${lerp(700, 215, rp).toFixed(1)})`);
      const g = pr(t, C.slow, 0.3); A(el["a-glass"], "opacity", t >= C.slow ? 1 : 0); A(el["a-glass"], "transform", `translate(140,210) scale(${oB(g).toFixed(4)}) rotate(${((1 - oC(g)) * -20).toFixed(1)})`);
      const sd = clamp((t - C.slow) / 6), top = 60 * (1 - sd), bot = 60 * sd;
      A(el["a-sandT"], "d", `M${(-44 * top / 70).toFixed(1)},${(-top).toFixed(1)} L${(44 * top / 70).toFixed(1)},${(-top).toFixed(1)} L4,-4 L-4,-4 Z`);
      A(el["a-sandB"], "d", `M-40,66 L40,66 L${(40 - bot * 0.5).toFixed(1)},${(66 - bot).toFixed(1)} L${(-40 + bot * 0.5).toFixed(1)},${(66 - bot).toFixed(1)} Z`);
      A(el["a-stream"], "height", (66 - bot).toFixed(1));
      [0, 1, 2].forEach((i) => { const n = el["a-f" + i], q = pr(t, C.complex + i * 0.12, 0.3), dx = +n.dataset.dx, dy = +n.dataset.dy;
        A(n, "opacity", q > 0 ? 1 : 0); A(n, "transform", `translate(${(398 + dx * oC(q)).toFixed(1)},${(215 + dy * oC(q)).toFixed(1)}) scale(${(0.6 * oB(q)).toFixed(4)})`); }); }
  }

  /* ===== الخريطة: إثيوبيا ← اليمن ← البرازيل ===== */
  if (inMap) {
    let v = VIEW.over;
    if (t >= C.eth - 0.05) v = mixV(VIEW.over, VIEW.eth, ioC(pr(t, C.eth - 0.05, 0.6)));
    if (t >= C.to_yem) v = mixV(VIEW.eth, VIEW.yem, ioC(pr(t, C.to_yem, 0.5)));
    if (t >= C.to_bra) v = mixV(VIEW.yem, VIEW.bra, ioC(pr(t, C.to_bra, 0.45)));
    const hold = t >= C.to_bra ? pr(t, C.to_bra + 0.45, C.cut_cta - C.to_bra) : t >= C.to_yem ? pr(t, C.to_yem + 0.5, C.to_bra - C.to_yem) : pr(t, C.eth + 0.55, C.to_yem - C.eth);
    const w = v.w * lerp(1, 0.94, hold), h = w * 720 / 960;
    A(el.map, "viewBox", `${(v.cx - w / 2).toFixed(1)} ${(v.cy - h / 2).toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)}`);
    const wp = pr(t, C.to_bra, 0.45); el.map.style.filter = wp > 0 && wp < 1 ? `blur(${(Math.sin(Math.PI * wp) * 9).toFixed(1)}px)` : "none";
    T(el.mapcard, `scale(${lerp(0.94, 1, oB(pr(t, C.cut_map, 0.35), 1.4)).toFixed(4)})`);
    const scale = 960 / w;
    for (const k of ["eth", "yem", "bra"]) {
      const t0 = C[k], active = t >= t0 && (k === "bra" || t < C[k === "eth" ? "to_yem" : "to_bra"] + 0.2);
      A(el["m-" + k], "opacity", t < t0 ? 0 : active ? (0.88 * oC(pr(t, t0, 0.3))).toFixed(3) : 0.35);
      const pin = el["m-pin-" + k], q = pr(t, t0 + 0.25, 0.3), [lo, la] = COUNTRY[k].c;
      A(pin, "opacity", t >= t0 + 0.25 ? 1 : 0);
      A(pin, "transform", `translate(${MX(lo).toFixed(1)},${(MY(la) - (1 - oB(q, 1.2)) * 90 / scale).toFixed(1)}) scale(${((active ? 1.9 : 1.2) / scale).toFixed(4)})`);
    }
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
    if ((n.id === "cta" && t >= C.cut_close - 0.12) || (n.closest("#diagram") && t >= C.alt - 0.1)) return;
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
Promise.all([document.fonts.load('800 100px "Baloo Bhaijaan 2"', "قهوة"), document.fonts.load('800 100px "Baloo Bhaijaan 2"', "40"), document.fonts.ready]).then(() => { fitCaps(); renderFrame(0); window.__ready = true; });
