// الأصول المدعومة ومصادرها. لا تُضاف أصول خارج هذه القائمة.
export const ASSETS = {
  gold: { id: 'gold', kind: 'metal', goldApi: 'XAU' },
  silver: { id: 'silver', kind: 'metal', goldApi: 'XAG' },
  platinum: { id: 'platinum', kind: 'metal', goldApi: 'XPT' },
  bitcoin: { id: 'bitcoin', kind: 'crypto', coinbase: 'BTC-USD', goldApi: 'BTC' },
  ethereum: { id: 'ethereum', kind: 'crypto', coinbase: 'ETH-USD', goldApi: 'ETH' },
};

export const ASSET_IDS = Object.keys(ASSETS);
export const METAL_IDS = ASSET_IDS.filter((id) => ASSETS[id].kind === 'metal');
export const CRYPTO_IDS = ASSET_IDS.filter((id) => ASSETS[id].kind === 'crypto');

export const RANGES = ['1h', '1d', '1w', '1m', '1y', '5y', '10y'];

export const MINUTE = 60;
export const HOUR = 3600;
export const DAY = 86400;

// مدة كل فترة بالثواني.
export const RANGE_SECONDS = {
  '1h': HOUR,
  '1d': DAY,
  '1w': 7 * DAY,
  '1m': 30 * DAY,
  '1y': 365 * DAY,
  '5y': 5 * 365 * DAY + DAY,
  '10y': 10 * 365 * DAY + 3 * DAY,
};

// مدة التخزين المؤقت لكل فترة على شبكة Netlify (بالثواني).
export const RANGE_CACHE_TTL = {
  '1h': 60,
  '1d': 120,
  '1w': 600,
  '1m': 1800,
  '1y': 6 * HOUR,
  '5y': 6 * HOUR,
  '10y': 6 * HOUR,
};

// أقصى عدد نقاط يُرسل للمتصفح في الرسم.
export const MAX_POINTS = 900;

// عدد النقاط المحفوظة من تسجيل المعادن الذاتي.
export const MINUTE_KEEP = 1600; // نحو 26 ساعة تداول
export const HOURLY_KEEP = 24 * 45; // نحو 45 يوماً

// يُعدّ السعر غير محدّث إذا مضى على آخر جلب ناجح أكثر من هذه المدة.
export const STALE_AFTER_MS = 5 * 60 * 1000;

export const SOURCES = {
  metals: { name: 'Gold-API.com', url: 'https://gold-api.com' },
  crypto: { name: 'Coinbase Exchange', url: 'https://exchange.coinbase.com' },
};

// الريال مربوط رسمياً بالدولار منذ 1986.
export const USD_SAR = 3.75;
