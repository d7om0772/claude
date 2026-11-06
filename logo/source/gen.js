// Generates the "تيربو" logo set as SVG + PNG.
const fs = require('fs');
const path = require('path');
const {chromium} = require('playwright');

const D = __dirname;
const b64 = (f) => fs.readFileSync(path.join(D, f)).toString('base64');
const FONTS = `@font-face{font-family:T;src:url(data:font/woff2;base64,${b64('taj900.woff2')}) format('woff2');font-weight:900}
@font-face{font-family:L;src:url(data:font/woff2;base64,${b64('cairo900.woff2')}) format('woff2');font-weight:900}`;

const G = '#76ff4a', CY = '#2de2ff', BG = '#05070c';
const rad = (d) => (d * Math.PI) / 180;
const P = (cx, cy, r, a) => [cx + r * Math.cos(rad(a)), cy + r * Math.sin(rad(a))].map((v) => v.toFixed(2)).join(' ');

// turbine wheel icon centred at (cx,cy), outer housing radius R
function turbine(cx, cy, R, id) {
  const r1 = R * 0.24, r2 = R * 0.8, N = 9;
  let blades = '';
  for (let i = 0; i < N; i++) {
    const t = (360 / N) * i;
    const sw = 58, w = 15;
    blades += `<path d="M ${P(cx, cy, r1, t)} Q ${P(cx, cy, (r1 + r2) / 2, t + sw * 0.25)} ${P(cx, cy, r2, t + sw)}
      A ${r2} ${r2} 0 0 1 ${P(cx, cy, r2, t + sw + w)} Q ${P(cx, cy, (r1 + r2) / 2 + 4, t + sw * 0.45 + w)} ${P(cx, cy, r1, t + w)} Z" fill="url(#g${id})"/>`;
  }
  // speed arcs on the housing (gap at top-right = turbo outlet feel)
  return `
  <g>
    <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="url(#g${id})" stroke-width="${R * 0.11}"
      stroke-dasharray="${2 * Math.PI * R * 0.82} ${2 * Math.PI * R * 0.18}" stroke-linecap="round" transform="rotate(-70 ${cx} ${cy})"/>
    <path d="M ${P(cx, cy, R, -68)} L ${cx + R * 0.95} ${cy - R * 1.02} L ${cx + R * 1.28} ${cy - R * 1.02}" fill="none"
      stroke="url(#g${id})" stroke-width="${R * 0.11}" stroke-linecap="round" stroke-linejoin="round"/>
    ${blades}
    <circle cx="${cx}" cy="${cy}" r="${r1 * 1.05}" fill="${BG}" stroke="url(#g${id})" stroke-width="${R * 0.06}"/>
    <circle cx="${cx}" cy="${cy}" r="${r1 * 0.38}" fill="${G}"/>
  </g>`;
}
const grad = (id) => `<linearGradient id="g${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${G}"/><stop offset="1" stop-color="${CY}"/></linearGradient>`;
const speedLines = (x, y, s) => [0, 1, 2].map((i) =>
  `<rect x="${x - [70, 100, 55][i] * s}" y="${y + (i - 1) * 26 * s - 5 * s}" width="${[70, 100, 55][i] * s}" height="${10 * s}" rx="${5 * s}" fill="url(#gs)" opacity="${[0.6, 1, 0.45][i]}"/>`).join('');
const gs = `<linearGradient id="gs" x1="0" x2="1"><stop offset="0" stop-color="${CY}" stop-opacity="0"/><stop offset="1" stop-color="${CY}"/></linearGradient>`;

const svg = (w, h, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs><style>${FONTS}</style>${defs}</defs>${body}</svg>`;

// 1) Avatar (square, safe inside a circle crop)
const avatar = svg(1080, 1080, `
  <rect width="1080" height="1080" fill="${BG}"/>
  <circle cx="540" cy="470" r="440" fill="url(#bgGlow)"/>
  ${turbine(580, 400, 235, 'a')}
  ${speedLines(318, 400, 1.7)}
  <g transform="translate(540 845) skewX(-8)"><text x="0" y="0" text-anchor="middle" font-family="T" font-weight="900" font-size="235" fill="url(#ga)">تيربو</text></g>
  <text x="549" y="955" text-anchor="middle" font-family="L" font-weight="900" font-size="56" letter-spacing="18" fill="${CY}" opacity=".85">TURBO PC</text>`,
  grad('a') + gs + `<radialGradient id="bgGlow"><stop offset="0" stop-color="${G}" stop-opacity=".16"/><stop offset="1" stop-color="${G}" stop-opacity="0"/></radialGradient>`);

// 2) Horizontal lockup (icon on the right, Arabic reads RTL)
const lockup = svg(1600, 600, `
  <rect width="1600" height="600" fill="${BG}"/>
  ${turbine(1260, 300, 180, 'b')}
  <g transform="translate(990 330) skewX(-8)"><text x="0" y="0" text-anchor="end" font-family="T" font-weight="900" font-size="250" fill="url(#gb)">تيربو</text></g>
  <text x="972" y="445" text-anchor="end" font-family="L" font-weight="900" font-size="64" letter-spacing="22" fill="${CY}" opacity=".85">TURBO PC</text>
`,
  grad('b') + gs);

// 3) Watermark for videos (transparent, white text)
const mark = svg(900, 300, `
  ${turbine(740, 150, 100, 'c')}
  <g transform="translate(600 195) skewX(-8)"><text x="0" y="0" text-anchor="end" font-family="T" font-weight="900" font-size="150" fill="#fff">تيربو</text></g>`,
  grad('c'));

const out = {avatar: [avatar, 1080, 1080, false], lockup: [lockup, 1600, 600, false], watermark: [mark, 900, 300, true]};

(async () => {
  fs.mkdirSync(path.join(D, 'out'), {recursive: true});
  const browser = await chromium.launch();
  const page = await browser.newPage({deviceScaleFactor: 1});
  for (const [name, [s, w, h, transparent]] of Object.entries(out)) {
    fs.writeFileSync(path.join(D, 'out', `turbo-${name}.svg`), s);
    await page.setViewportSize({width: w, height: h});
    await page.setContent(`<html><body style="margin:0;background:${transparent ? 'transparent' : BG}">${s}</body></html>`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(150);
    await page.screenshot({path: path.join(D, 'out', `turbo-${name}.png`), omitBackground: transparent, clip: {x: 0, y: 0, width: w, height: h}});
  }
  await browser.close();
})();
