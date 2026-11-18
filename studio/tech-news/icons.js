// icons.js — رسومات flat (SVG) لسلسلة tech-news حسب حزمة 16_quick_explainer.
// جمادات فقط (بدون ذوات أرواح). الألوان من 05_colors/palette.json.
export const C = {
  identity: "#EEF4FD", examples: "#E4C597", explain: "#0E1830", bridge: "#1D4FA3", ink: "#14284B",
  brand: "#2F6BCF", brandDark: "#1F4E9E", brandDeep: "#173F86", light: "#8FBAF0", card: "#F4F7FD", muted: "#5B6B82",
  accent: "#EF8A00", accentLight: "#FFB020", glow: "#FFD28A", gold: "#E7B23C", white: "#FFFFFF", wood: "#B07A42", woodDark: "#8A5A2C",
};

// ---------- أيقونات صغيرة (viewBox 64) ----------
const S = (inner, vb = "0 0 64 64") => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
const fan = (cx, cy, r, c = C.white, blade = C.brand) => {
  let b = ""; for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const x1 = cx + Math.cos(a) * r * 0.22, y1 = cy + Math.sin(a) * r * 0.22;
    const x2 = cx + Math.cos(a + 0.55) * r * 0.86, y2 = cy + Math.sin(a + 0.55) * r * 0.86;
    const xc = cx + Math.cos(a + 0.15) * r * 0.7, yc = cy + Math.sin(a + 0.15) * r * 0.7;
    b += `<path d="M${x1.toFixed(1)} ${y1.toFixed(1)} Q${xc.toFixed(1)} ${yc.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${blade}" stroke-width="${(r * 0.13).toFixed(1)}" stroke-linecap="round" fill="none"/>`;
  }
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${c}"/>${b}<circle cx="${cx}" cy="${cy}" r="${(r * 0.16).toFixed(1)}" fill="${blade}"/>`;
};
const ICON = {
  gpu: (c) => S(`<rect x="4" y="18" width="56" height="26" rx="5" fill="${c}"/>${fan(20, 31, 9, "#fff", c)}${fan(44, 31, 9, "#fff", c)}<rect x="12" y="44" width="30" height="5" rx="1" fill="${C.gold}"/><rect x="2" y="16" width="4" height="32" rx="1.5" fill="${C.ink}"/>`),
  chip: (c) => S(`${[14, 24, 34, 44].map((x) => `<rect x="${x + 2}" y="6" width="4" height="8" fill="${c}"/><rect x="${x + 2}" y="50" width="4" height="8" fill="${c}"/><rect x="6" y="${x + 2}" width="8" height="4" fill="${c}"/><rect x="50" y="${x + 2}" width="8" height="4" fill="${c}"/>`).join("")}<rect x="12" y="12" width="40" height="40" rx="6" fill="${c}"/><rect x="21" y="21" width="22" height="22" rx="3" fill="#fff"/><rect x="26" y="26" width="12" height="12" rx="2" fill="${c}"/>`),
  ram: (c) => S(`<rect x="3" y="20" width="58" height="22" rx="3" fill="${c}"/>${[8, 20, 32, 44].map((x) => `<rect x="${x}" y="25" width="9" height="11" rx="1.5" fill="#fff"/>`).join("")}<rect x="5" y="42" width="54" height="5" fill="${C.gold}"/><rect x="29" y="42" width="3" height="5" fill="${C.identity}"/>`),
  ssd: (c) => S(`<rect x="4" y="24" width="56" height="16" rx="3" fill="${c}"/><rect x="10" y="27" width="16" height="10" rx="1.5" fill="#fff"/><rect x="30" y="27" width="12" height="10" rx="1.5" fill="#fff"/><rect x="54" y="26" width="6" height="12" fill="${C.gold}"/><circle cx="8" cy="32" r="2.2" fill="#fff"/>`),
  monitor: (c) => S(`<rect x="5" y="9" width="54" height="34" rx="4" fill="${c}"/><rect x="10" y="14" width="44" height="24" rx="2" fill="#fff"/><rect x="28" y="43" width="8" height="9" fill="${c}"/><rect x="18" y="52" width="28" height="5" rx="2.5" fill="${c}"/>`),
  laptop: (c) => S(`<rect x="11" y="12" width="42" height="28" rx="3" fill="${c}"/><rect x="15" y="16" width="34" height="20" rx="1.5" fill="#fff"/><path d="M4 44h56l-4 8H8z" fill="${c}"/>`),
  case: (c) => S(`<rect x="16" y="4" width="32" height="56" rx="4" fill="${c}"/>${fan(32, 22, 8, "#fff", c)}${fan(32, 42, 8, "#fff", c)}<rect x="20" y="8" width="8" height="2.5" rx="1" fill="#fff"/>`),
  motherboard: (c) => S(`<rect x="6" y="6" width="52" height="52" rx="4" fill="${c}"/><rect x="12" y="12" width="16" height="16" rx="2" fill="#fff"/><rect x="34" y="12" width="4" height="22" fill="#fff"/><rect x="41" y="12" width="4" height="22" fill="#fff"/><rect x="12" y="36" width="34" height="5" rx="1" fill="#fff"/><rect x="12" y="46" width="34" height="5" rx="1" fill="#fff"/>`),
  server: (c) => S(`<rect x="14" y="4" width="36" height="56" rx="4" fill="${c}"/>${[10, 22, 34, 46].map((y) => `<rect x="19" y="${y}" width="26" height="7" rx="1.5" fill="#fff"/><circle cx="41" cy="${y + 3.5}" r="1.6" fill="${c}"/>`).join("")}`),
  gamepad: (c) => S(`<path d="M18 18h28c8 0 13 7 14 17 1 9-3 15-8 15-4 0-6-4-9-8H21c-3 4-5 8-9 8-5 0-9-6-8-15 1-10 6-17 14-17z" fill="${c}"/><rect x="15" y="29" width="12" height="4" rx="1" fill="#fff"/><rect x="19" y="25" width="4" height="12" rx="1" fill="#fff"/><circle cx="43" cy="28" r="2.6" fill="#fff"/><circle cx="49" cy="34" r="2.6" fill="#fff"/>`),
  keyboard: (c) => S(`<rect x="3" y="18" width="58" height="28" rx="4" fill="${c}"/>${[8, 17, 26, 35, 44, 53].map((x) => `<rect x="${x - 1}" y="23" width="6" height="5" rx="1" fill="#fff"/><rect x="${x - 1}" y="31" width="6" height="5" rx="1" fill="#fff"/>`).join("")}<rect x="18" y="39" width="28" height="4" rx="1" fill="#fff"/>`),
  mouse: (c) => S(`<rect x="18" y="6" width="28" height="52" rx="14" fill="${c}"/><rect x="31" y="12" width="2.5" height="12" rx="1.2" fill="#fff"/>`),
  plus: (c) => S(`<rect x="27" y="10" width="10" height="44" rx="3" fill="${c}"/><rect x="10" y="27" width="44" height="10" rx="3" fill="${c}"/>`),
  check: (c) => S(`<path d="M10 34l14 14 30-32" stroke="${c}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`),
  x: (c) => S(`<path d="M14 14l36 36M50 14L14 50" stroke="${c}" stroke-width="9" stroke-linecap="round" fill="none"/>`),
  clock: (c) => S(`<circle cx="32" cy="32" r="25" fill="none" stroke="${c}" stroke-width="6"/><path d="M32 18v15l10 7" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/>`),
  calendar: (c) => S(`<rect x="8" y="12" width="48" height="44" rx="6" fill="#fff" stroke="${c}" stroke-width="5"/><rect x="8" y="12" width="48" height="13" rx="5" fill="${c}"/><rect x="18" y="6" width="5" height="12" rx="2" fill="${c}"/><rect x="41" y="6" width="5" height="12" rx="2" fill="${c}"/>`),
  doc: (c) => S(`<path d="M14 6h26l12 12v40H14z" fill="#fff" stroke="${c}" stroke-width="5" stroke-linejoin="round"/><path d="M21 30h22M21 39h22M21 48h14" stroke="${c}" stroke-width="4.5" stroke-linecap="round"/>`),
  question: (c) => S(`<path d="M22 22c0-7 5-12 11-12s11 5 11 11c0 9-11 9-11 18" stroke="${c}" stroke-width="8" stroke-linecap="round" fill="none"/><circle cx="33" cy="52" r="5" fill="${c}"/>`),
  bolt: (c) => S(`<path d="M36 4L12 36h17l-4 24 26-34H34z" fill="${c}"/>`),
  chart: (c) => S(`<rect x="8" y="36" width="10" height="20" rx="2" fill="${c}"/><rect x="27" y="24" width="10" height="32" rx="2" fill="${c}"/><rect x="46" y="10" width="10" height="46" rx="2" fill="${c}"/>`),
  down: (c) => S(`<rect x="8" y="10" width="10" height="46" rx="2" fill="${c}"/><rect x="27" y="24" width="10" height="32" rx="2" fill="${c}"/><rect x="46" y="38" width="10" height="18" rx="2" fill="${c}"/>`),
  tag: (c) => S(`<path d="M6 30V8h22l30 30-22 22z" fill="${c}"/><circle cx="17" cy="19" r="5" fill="#fff"/>`),
  cloud: (c) => S(`<path d="M18 50h30a12 12 0 0 0 1-24 16 16 0 0 0-31 2 11 11 0 0 0 0 22z" fill="${c}"/>`),
  ai: (c) => S(`<path d="M28 6l5 15 15 5-15 5-5 15-5-15-15-5 15-5z" fill="${c}"/><path d="M48 36l3 8 8 3-8 3-3 8-3-8-8-3 8-3z" fill="${c}"/>`),
  lock: (c) => S(`<rect x="12" y="28" width="40" height="30" rx="5" fill="${c}"/><path d="M20 28v-8a12 12 0 0 1 24 0v8" stroke="${c}" stroke-width="6" fill="none"/><circle cx="32" cy="42" r="4" fill="#fff"/>`),
  wifi: (c) => S(`<path d="M6 26a38 38 0 0 1 52 0M14 35a26 26 0 0 1 36 0M22 44a14 14 0 0 1 20 0" stroke="${c}" stroke-width="6" stroke-linecap="round" fill="none"/><circle cx="32" cy="52" r="4.5" fill="${c}"/>`),
  download: (c) => S(`<path d="M32 8v32M18 28l14 14 14-14" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/><rect x="10" y="50" width="44" height="7" rx="3" fill="${c}"/>`),
  globe: (c) => S(`<circle cx="32" cy="32" r="25" fill="none" stroke="${c}" stroke-width="5"/><ellipse cx="32" cy="32" rx="11" ry="25" fill="none" stroke="${c}" stroke-width="4"/><path d="M8 32h48M12 20h40M12 44h40" stroke="${c}" stroke-width="4"/>`),
  warn: (c) => S(`<path d="M32 6l28 50H4z" fill="${c}"/><rect x="29" y="22" width="6" height="18" rx="2" fill="#fff"/><circle cx="32" cy="47" r="3.5" fill="#fff"/>`),
  star: (c) => S(`<path d="M32 5l8 18 19 2-14 13 4 19-17-10-17 10 4-19L5 25l19-2z" fill="${c}"/>`),
  shield: (c) => S(`<path d="M32 5l22 8v16c0 15-10 25-22 30C20 54 10 44 10 29V13z" fill="${c}"/><path d="M22 32l7 7 13-14" stroke="#fff" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`),
  battery: (c) => S(`<rect x="6" y="18" width="46" height="28" rx="5" fill="none" stroke="${c}" stroke-width="5"/><rect x="52" y="26" width="6" height="12" rx="2" fill="${c}"/><rect x="12" y="24" width="24" height="16" rx="2" fill="${c}"/>`),
  fan: (c) => S(`<rect x="6" y="6" width="52" height="52" rx="8" fill="${c}"/>${fan(32, 32, 20, "#fff", c)}`),
  price: (c) => S(`<path d="M6 30V8h22l30 30-22 22z" fill="${c}"/><circle cx="17" cy="19" r="5" fill="#fff"/>`),
  arrow: (c) => S(`<path d="M8 32h40M34 18l14 14-14 14" stroke="${c}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`),
  fire: (c) => S(`<path d="M32 4c4 12 18 18 18 34a18 18 0 0 1-36 0c0-8 4-13 8-17 0 7 3 10 6 11-2-10 0-19 4-28z" fill="${c}"/>`),
  power: (c) => S(`<path d="M32 8v22" stroke="${c}" stroke-width="7" stroke-linecap="round"/><path d="M20 16a20 20 0 1 0 24 0" stroke="${c}" stroke-width="7" stroke-linecap="round" fill="none"/>`),
  thermo: (c) => S(`<rect x="26" y="6" width="12" height="36" rx="6" fill="none" stroke="${c}" stroke-width="5"/><circle cx="32" cy="48" r="10" fill="${c}"/><rect x="30" y="20" width="4" height="24" fill="${c}"/>`),
  speed: (c) => S(`<path d="M8 44a24 24 0 0 1 48 0" stroke="${c}" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M32 44l14-16" stroke="${c}" stroke-width="6" stroke-linecap="round"/><circle cx="32" cy="44" r="5" fill="${c}"/>`),
};
ICON.cpu = ICON.chip; ICON.pc = ICON.case; ICON.storage = ICON.ssd; ICON.screen = ICON.monitor; ICON.controller = ICON.gamepad;
export function icon(name, color = C.brand) { return (ICON[name] || ICON.chip)(color); }
export const ICON_NAMES = Object.keys(ICON);

// ---------- العنصر البطل (رسم كبير) ----------
const HS = (inner, vb) => `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg" class="hero-svg">${inner}</svg>`;
const shadow = (cx, cy, rx, ry) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="rgba(20,40,75,.16)"/>`;
const HERO = {
  gpu: () => HS(`${shadow(300, 262, 250, 16)}
    <rect x="34" y="40" width="20" height="200" rx="5" fill="#9AA6B8"/><rect x="38" y="52" width="10" height="20" rx="2" fill="#6F7B8E"/><rect x="38" y="84" width="10" height="20" rx="2" fill="#6F7B8E"/>
    <rect x="50" y="60" width="520" height="168" rx="22" fill="${C.brand}"/><rect x="50" y="60" width="520" height="40" rx="22" fill="#3C7BDF"/>
    <rect x="50" y="200" width="520" height="28" rx="10" fill="${C.brandDark}"/>
    <rect x="452" y="44" width="70" height="20" rx="4" fill="${C.ink}"/>
    ${fan(190, 146, 66, "#fff", C.brand)}${fan(410, 146, 66, "#fff", C.brand)}
    <circle cx="190" cy="146" r="72" fill="none" stroke="${C.brandDark}" stroke-width="6"/><circle cx="410" cy="146" r="72" fill="none" stroke="${C.brandDark}" stroke-width="6"/>
    <rect x="150" y="228" width="300" height="18" rx="3" fill="${C.gold}"/>${Array.from({ length: 24 }, (_, i) => `<rect x="${156 + i * 12}" y="230" width="6" height="14" fill="#C8952A"/>`).join("")}`, "0 0 600 290"),
  chip: () => HS(`${shadow(220, 420, 170, 14)}${Array.from({ length: 8 }, (_, i) => { const p = 82 + i * 34;
      return `<rect x="${p}" y="18" width="14" height="40" rx="3" fill="${C.gold}"/><rect x="${p}" y="382" width="14" height="40" rx="3" fill="${C.gold}"/><rect x="18" y="${p}" width="40" height="14" rx="3" fill="${C.gold}"/><rect x="382" y="${p}" width="40" height="14" rx="3" fill="${C.gold}"/>`; }).join("")}
    <rect x="50" y="50" width="340" height="340" rx="34" fill="${C.brand}"/><rect x="50" y="50" width="340" height="60" rx="30" fill="#3C7BDF"/>
    <rect x="120" y="120" width="200" height="200" rx="22" fill="#fff"/><rect x="160" y="160" width="120" height="120" rx="14" fill="${C.brand}"/>`, "0 0 440 440"),
  ram: () => HS(`${shadow(320, 250, 290, 14)}<rect x="20" y="60" width="600" height="150" rx="14" fill="${C.brand}"/><rect x="20" y="60" width="600" height="36" rx="14" fill="#3C7BDF"/>
    ${[60, 190, 320, 450].map((x) => `<rect x="${x}" y="100" width="110" height="80" rx="8" fill="#fff"/><rect x="${x + 14}" y="114" width="82" height="52" rx="5" fill="${C.light}"/>`).join("")}
    <rect x="30" y="210" width="580" height="26" fill="${C.gold}"/><rect x="300" y="206" width="16" height="34" fill="${C.identity}"/>`, "0 0 640 270"),
  ssd: () => HS(`${shadow(320, 214, 290, 12)}<rect x="20" y="80" width="600" height="110" rx="14" fill="${C.brand}"/><rect x="20" y="80" width="600" height="30" rx="14" fill="#3C7BDF"/>
    <rect x="80" y="110" width="170" height="60" rx="8" fill="#fff"/><rect x="280" y="110" width="140" height="60" rx="8" fill="#fff"/><rect x="450" y="118" width="90" height="44" rx="6" fill="${C.light}"/>
    <rect x="580" y="96" width="40" height="78" fill="${C.gold}"/><circle cx="50" cy="135" r="13" fill="#fff"/>`, "0 0 640 240"),
  monitor: () => HS(`${shadow(300, 470, 170, 14)}<rect x="20" y="20" width="560" height="340" rx="24" fill="${C.ink}"/><rect x="42" y="42" width="516" height="296" rx="10" fill="${C.brand}"/>
    <rect x="42" y="42" width="516" height="296" rx="10" fill="url(#mg)"/><defs><linearGradient id="mg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5D97F0"/><stop offset="1" stop-color="${C.brand}"/></linearGradient></defs>
    <rect x="268" y="360" width="64" height="70" fill="${C.ink}"/><rect x="180" y="428" width="240" height="26" rx="13" fill="${C.ink}"/>`, "0 0 600 490"),
  laptop: () => HS(`${shadow(320, 410, 300, 14)}<rect x="90" y="30" width="460" height="300" rx="20" fill="${C.ink}"/><rect x="110" y="50" width="420" height="260" rx="8" fill="${C.brand}"/>
    <path d="M20 340h600l-40 50H60z" fill="#9AA6B8"/><rect x="250" y="344" width="140" height="12" rx="6" fill="#7D889B"/>`, "0 0 640 430"),
  case: () => HS(`${shadow(220, 590, 170, 14)}<rect x="60" y="20" width="320" height="550" rx="26" fill="${C.brand}"/><rect x="90" y="56" width="260" height="470" rx="16" fill="#3C7BDF"/>
    ${fan(220, 180, 84, "#fff", C.brand)}${fan(220, 390, 84, "#fff", C.brand)}<rect x="110" y="34" width="60" height="10" rx="5" fill="#fff"/>`, "0 0 440 620"),
  server: () => HS(`${shadow(220, 590, 170, 14)}<rect x="60" y="20" width="320" height="550" rx="22" fill="${C.ink}"/>
    ${[60, 170, 280, 390].map((y) => `<rect x="90" y="${y}" width="260" height="90" rx="12" fill="${C.brand}"/><rect x="110" y="${y + 30}" width="150" height="14" rx="6" fill="#fff"/><circle cx="318" cy="${y + 45}" r="9" fill="${C.glow}"/>`).join("")}`, "0 0 440 620"),
};
HERO.cpu = HERO.chip; HERO.pc = HERO.case;
export function hero(name) {
  if (HERO[name]) return HERO[name]();
  return HS(`${shadow(220, 420, 160, 14)}<rect x="40" y="40" width="360" height="360" rx="60" fill="${C.card}"/><g transform="translate(90 90) scale(4.2)">${icon(name).replace(/^<svg[^>]*>|<\/svg>$/g, "")}</g>`, "0 0 440 440");
}
