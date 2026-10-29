// بناء بيانات الرسم لكل أصل وفترة، وصيانة السجل اليومي.
//
// العملات الرقمية: Coinbase للفترات القصيرة مباشرة، وسجل يومي محفوظ للسنة فأكثر.
// المعادن: تسجيلنا الذاتي بالدقيقة والساعة للفترات القصيرة، وسجل يومي من Gold-API.com
// (بمفتاح مجاني) مدموجاً مع إغلاقاتنا اليومية المسجّلة.
import { ASSETS, CRYPTO_IDS, DAY, HOUR, MAX_POINTS, METAL_IDS, RANGE_SECONDS } from './config.mjs';
import { coinbaseCandles, coinbaseRange, getEnv, goldApiDailyHistory } from './sources.mjs';
import { readJSON, writeJSON } from './store.mjs';
import { dailyCloses, downsample, fromPairs, mergePairs, startOfDay, toPairs, windowPairs } from './series.mjs';

const TEN_YEARS = RANGE_SECONDS['10y'];
const CRYPTO_INTRADAY = { '1h': 60, '1d': 300, '1w': 3600, '1m': 3600 };
const CRYPTO_DAILY_MAX_AGE_MS = 2 * HOUR * 1000;
const METAL_SYNC_EVERY_MS = 6 * HOUR * 1000;
const GOLD_API_BLOCK_MS = HOUR * 1000;
const LAZY_SEED_GAP_MS = 15 * 60 * 1000;

// ---------- العملات الرقمية ----------

export async function ensureCryptoDaily(asset, nowSec, { force = false } = {}) {
  const key = `daily/${asset.id}`;
  const stored = await readJSON(key);
  let pairs = toPairs(stored);
  const target = nowSec - TEN_YEARS - 7 * DAY;
  const fresh = stored && Date.now() - stored.updatedAt < CRYPTO_DAILY_MAX_AGE_MS;
  if (pairs.length && fresh && !force) return pairs;

  if (!pairs.length || !stored.seeded) {
    pairs = await coinbaseRange(asset.coinbase, DAY, startOfDay(target), nowSec);
    if (pairs.length) await writeJSON(key, { ...fromPairs(pairs), seeded: true, updatedAt: Date.now() });
    return pairs;
  }
  const recent = await coinbaseCandles(asset.coinbase, DAY, Math.max(pairs.at(-1)[0] - 3 * DAY, nowSec - 290 * DAY), nowSec);
  pairs = mergePairs(windowPairs(pairs, target), recent);
  await writeJSON(key, { ...fromPairs(pairs), seeded: true, updatedAt: Date.now() });
  return pairs;
}

async function cryptoHistory(asset, range, nowSec) {
  const span = RANGE_SECONDS[range];
  if (CRYPTO_INTRADAY[range]) {
    const points = await coinbaseRange(asset.coinbase, CRYPTO_INTRADAY[range], nowSec - span, nowSec);
    return { points, partial: false };
  }
  const daily = await ensureCryptoDaily(asset, nowSec);
  return { points: windowPairs(daily, nowSec - span), partial: false };
}

// ---------- المعادن ----------

async function goldApiAllowed(now) {
  const meta = (await readJSON('meta')) ?? {};
  return { meta, allowed: !(meta.goldApiBlockedUntil > now) };
}

async function noteGoldApiError(meta, error, now) {
  if ([401, 403, 429].includes(error.status)) {
    meta.goldApiBlockedUntil = now + GOLD_API_BLOCK_MS;
    await writeJSON('meta', meta);
  }
}

// تعبئة السجل اليومي لمعدن عند أول طلب له بعد إضافة المفتاح (لا ننتظر الدالة المجدولة).
async function lazySeedMetal(asset, nowSec) {
  const apiKey = getEnv('GOLD_API_KEY');
  if (!apiKey) return [];
  const now = Date.now();
  const { meta, allowed } = await goldApiAllowed(now);
  if (!allowed || now - (meta.lazySeed?.[asset.id] ?? 0) < LAZY_SEED_GAP_MS) return [];
  meta.lazySeed = { ...meta.lazySeed, [asset.id]: now };
  await writeJSON('meta', meta);
  try {
    const pairs = await goldApiDailyHistory(asset.goldApi, nowSec - TEN_YEARS, nowSec, apiKey);
    if (pairs.length) await writeJSON(`daily/${asset.id}`, { ...fromPairs(pairs), updatedAt: now });
    return pairs;
  } catch (e) {
    console.error(`gold-api history ${asset.id} failed:`, e.message);
    await noteGoldApiError(meta, e, now);
    return [];
  }
}

// السجل اليومي للمعدن: سجل المزوّد للأيام المكتملة، ثم إغلاقاتنا المسجّلة لما بعدها.
async function metalDaily(asset, hourlyPairs, nowSec, { allowSeed = true } = {}) {
  const [provStore, recStore] = await Promise.all([readJSON(`daily/${asset.id}`), readJSON(`recdaily/${asset.id}`)]);
  let provider = toPairs(provStore);
  if (!provider.length && allowSeed) provider = await lazySeedMetal(asset, nowSec);
  provider = provider.filter(([t]) => t < startOfDay(nowSec));
  const recorded = mergePairs(toPairs(recStore), dailyCloses(hourlyPairs));
  const lastProvider = provider.at(-1)?.[0] ?? -Infinity;
  return {
    pairs: mergePairs(provider, recorded.filter(([t]) => t > lastProvider)),
    hasProvider: provider.length > 0,
  };
}

async function metalHistory(asset, range, nowSec) {
  const [minuteStore, hourlyStore] = await Promise.all([readJSON('minute'), readJSON('hourly')]);
  const m = toPairs(minuteStore?.[asset.id]);
  const h = toPairs(hourlyStore?.[asset.id]);
  const span = RANGE_SECONDS[range];

  if (range === '1h' || range === '1d') {
    // نهاية الفترة هي آخر سعر مسجّل، فتعرض آخر جلسة تداول عند إغلاق السوق.
    const last = m.at(-1)?.[0] ?? h.at(-1)?.[0];
    if (!last) return { points: [], partial: true };
    const start = last - span;
    const minuteStart = m[0]?.[0] ?? Infinity;
    let points = windowPairs(m, start);
    if (range === '1d' && minuteStart > start) points = mergePairs(windowPairs(h, start, minuteStart - 1), points);
    return { points, partial: (points[0]?.[0] ?? Infinity) > start + 5 * 60 };
  }

  const daily = await metalDaily(asset, h, nowSec);
  if (range === '1w' || range === '1m') {
    const last = h.at(-1)?.[0] ?? daily.pairs.at(-1)?.[0];
    if (!last) return { points: [], partial: true };
    const start = last - span;
    const hourlyStart = h[0]?.[0] ?? Infinity;
    const points = mergePairs(windowPairs(daily.pairs, start, hourlyStart - 1), windowPairs(h, start));
    return { points, partial: (points[0]?.[0] ?? Infinity) > start + DAY };
  }

  const start = nowSec - span;
  const points = windowPairs(daily.pairs, start);
  return {
    points,
    partial: (points[0]?.[0] ?? Infinity) > start + 7 * DAY,
    needsKey: !daily.hasProvider && !getEnv('GOLD_API_KEY'),
  };
}

export async function getHistory(id, range, now = Date.now()) {
  const asset = ASSETS[id];
  const nowSec = Math.floor(now / 1000);
  const result = asset.kind === 'crypto' ? await cryptoHistory(asset, range, nowSec) : await metalHistory(asset, range, nowSec);
  return {
    asset: id,
    range,
    points: downsample(result.points, MAX_POINTS),
    partial: result.partial,
    from: result.points[0]?.[0] ?? null,
    ...(result.needsKey ? { needsKey: true } : {}),
  };
}

// ---------- الصيانة الدورية (كل ساعة) ----------

// مزامنة سجل Gold-API.com اليومي لمعدن بطلب واحد على الأكثر في كل تشغيل.
async function syncMetalDaily(asset, apiKey, nowSec, meta, now) {
  const key = `daily/${asset.id}`;
  const stored = await readJSON(key);
  const pairs = toPairs(stored);
  const target = nowSec - TEN_YEARS;
  let from;
  let to = nowSec;
  let backfill = false;
  if (!pairs.length) {
    from = target;
  } else if (now - (stored.updatedAt ?? 0) > METAL_SYNC_EVERY_MS) {
    from = pairs.at(-1)[0] - 3 * DAY;
  } else if (pairs[0][0] > target + 7 * DAY && !stored.backfillDone) {
    // إن أرجع المزوّد جزءاً من المدى فقط، نكمل الأقدم في التشغيلات التالية.
    from = target;
    to = pairs[0][0] - 1;
    backfill = true;
  } else {
    return 'up-to-date';
  }
  const got = await goldApiDailyHistory(asset.goldApi, from, to, apiKey);
  const merged = mergePairs(pairs, got);
  await writeJSON(key, {
    ...fromPairs(merged),
    updatedAt: backfill ? (stored.updatedAt ?? now) : now,
    backfillDone: Boolean(stored?.backfillDone || (backfill && got.length === 0)),
  });
  return `+${got.length}`;
}

export async function maintain(now = Date.now()) {
  const nowSec = Math.floor(now / 1000);
  const report = {};

  await Promise.all(
    CRYPTO_IDS.map(async (id) => {
      try {
        const pairs = await ensureCryptoDaily(ASSETS[id], nowSec, { force: true });
        report[id] = `${pairs.length} days`;
      } catch (e) {
        report[id] = `error: ${e.message}`;
      }
    }),
  );

  // حفظ إغلاقاتنا اليومية للمعادن بشكل دائم (السلسلة الساعية تحتفظ بـ 45 يوماً فقط).
  const hourly = (await readJSON('hourly')) ?? {};
  for (const id of METAL_IDS) {
    const rec = toPairs(await readJSON(`recdaily/${id}`));
    const merged = mergePairs(rec, dailyCloses(toPairs(hourly[id])));
    if (merged.length) await writeJSON(`recdaily/${id}`, fromPairs(merged));
  }

  const apiKey = getEnv('GOLD_API_KEY');
  const { meta } = await goldApiAllowed(now);
  for (const id of METAL_IDS) {
    if (!apiKey) {
      report[id] = 'no GOLD_API_KEY: recorded data only';
    } else if (meta.goldApiBlockedUntil > now) {
      report[id] = 'gold-api paused (rate limit or invalid key)';
    } else {
      try {
        report[id] = await syncMetalDaily(ASSETS[id], apiKey, nowSec, meta, now);
      } catch (e) {
        report[id] = `error: ${e.message}`;
        await noteGoldApiError(meta, e, now);
      }
    }
  }

  // مرجع تغيّر 24 ساعة يُستخدم قبل أن يكتمل يوم من التسجيل الذاتي.
  const refs = {};
  for (const id of METAL_IDS) {
    const { pairs } = await metalDaily(ASSETS[id], toPairs(hourly[id]), nowSec, { allowSeed: false });
    const yesterday = pairs.filter(([t]) => t < startOfDay(nowSec)).at(-1);
    if (yesterday) refs[id] = { t: yesterday[0], p: yesterday[1] };
  }
  await writeJSON('refs', refs);
  return report;
}
