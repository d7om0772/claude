// حسابات وتنسيقات خالصة (بلا DOM) يستخدمها الموقع والاختبارات.

export const GRAMS_PER_TROY_OUNCE = 31.1034768;
export const USD_TO_SAR = 3.75;
export const KARATS = [24, 22, 21, 18];
export const CRYPTO_DECIMALS = 8;
export const METAL_DECIMALS = 3;

export const METAL_UNITS = {
  g: { grams: 1, label: 'جرام' },
  oz: { grams: GRAMS_PER_TROY_OUNCE, label: 'أونصة' },
  kg: { grams: 1000, label: 'كيلوجرام' },
};

export const NISAB_GOLD_GRAMS = 85;
export const NISAB_SILVER_GRAMS = 595;
export const ZAKAT_RATE = 0.025;

export const toCurrency = (usd, currency, rate = USD_TO_SAR) => (currency === 'SAR' ? usd * rate : usd);

export const usdPerGram = (usdPerOunce) => usdPerOunce / GRAMS_PER_TROY_OUNCE;

// سعر وحدة واحدة بالدولار: للمعادن حسب الوحدة والعيار، وللعملات الرقمية سعر الوحدة الكاملة.
export function unitPriceUsd(kind, usdPrice, { unit = 'g', karat = 24 } = {}) {
  if (kind !== 'metal') return usdPrice;
  return usdPerGram(usdPrice) * METAL_UNITS[unit].grams * (karat / 24);
}

const DIGIT_MAP = { '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4', '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9' };

// يقبل الأرقام العربية والفارسية والفاصلة العشرية العربية (٫)، ويتجاهل فواصل الآلاف.
// يرجع نصاً منظفاً وقيمته.
export function parseAmount(input, maxDecimals) {
  let s = String(input ?? '')
    .replace(/[٠-٩]/g, (d) => DIGIT_MAP[d])
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, '.')
    .replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot !== -1) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  let truncated = false;
  if (dot !== -1 && s.length - dot - 1 > maxDecimals) {
    s = s.slice(0, dot + 1 + maxDecimals);
    truncated = true;
  }
  if (s.startsWith('.')) s = `0${s}`;
  const value = s === '' ? null : Number(s);
  return { text: s, value: Number.isFinite(value) ? value : null, truncated };
}

// الزكاة لكل معدن بنصابه منفرداً. ذهب العيارات الأقل يُحوَّل إلى ما يعادله من الذهب الخالص.
export function computeZakat({ goldGrams = 0, goldKarat = 24, silverGrams = 0, goldUsdPerOunce, silverUsdPerOunce }) {
  const goldPerGram = usdPerGram(goldUsdPerOunce);
  const silverPerGram = usdPerGram(silverUsdPerOunce);
  const pureGold = (goldGrams || 0) * (goldKarat / 24);
  const goldValue = pureGold * goldPerGram;
  const silverValue = (silverGrams || 0) * silverPerGram;
  const goldReached = pureGold >= NISAB_GOLD_GRAMS;
  const silverReached = (silverGrams || 0) >= NISAB_SILVER_GRAMS;
  const gold = { pureGrams: pureGold, value: goldValue, reached: goldReached, due: goldReached ? goldValue * ZAKAT_RATE : 0 };
  const silver = { grams: silverGrams || 0, value: silverValue, reached: silverReached, due: silverReached ? silverValue * ZAKAT_RATE : 0 };
  return {
    gold,
    silver,
    totalDue: gold.due + silver.due,
    nisabGoldValue: NISAB_GOLD_GRAMS * goldPerGram,
    nisabSilverValue: NISAB_SILVER_GRAMS * silverPerGram,
  };
}

export function changeRatio(from, to) {
  if (!(from > 0) || !Number.isFinite(to)) return null;
  return (to - from) / from;
}

// ---------- التنسيق (أرقام إنجليزية دائماً) ----------

const formatters = new Map();
function nf(min, max) {
  const key = `${min}-${max}`;
  if (!formatters.has(key)) {
    formatters.set(key, new Intl.NumberFormat('en-US', { minimumFractionDigits: min, maximumFractionDigits: max }));
  }
  return formatters.get(key);
}

export function formatNumber(n, min = 2, max = min) {
  if (!Number.isFinite(n)) return '—';
  return nf(min, max).format(n);
}

// خانات عشرية مناسبة لحجم المبلغ حتى لا تختفي القيم الصغيرة.
export function formatMoney(n) {
  if (!Number.isFinite(n)) return '—';
  const abs = Math.abs(n);
  if (abs === 0 || abs >= 1) return formatNumber(n, 2);
  if (abs >= 0.01) return formatNumber(n, 2, 4);
  return formatNumber(n, 2, 8);
}

export function formatPercent(ratio) {
  if (ratio == null || !Number.isFinite(ratio)) return '—';
  return `${formatNumber(Math.abs(ratio) * 100, 2)}%`;
}

export function formatQuantity(n, maxDecimals) {
  if (!Number.isFinite(n)) return '';
  return nf(0, maxDecimals).format(n).replace(/,/g, '');
}

const pad = (n) => String(n).padStart(2, '0');

export function formatClock(ms) {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatDateTime(ms) {
  const d = new Date(ms);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${formatClock(ms)}`;
}

// تنسيق وقت مخزّن كـ UTC (تستخدمه الرسوم بعد إزاحة المنطقة الزمنية).
export function formatUtc(sec, withTime) {
  const d = new Date(sec * 1000);
  const date = `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
  return withTime ? `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : date;
}
