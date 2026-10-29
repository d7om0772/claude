// GET /api/prices — الأسعار الحالية للأصول الخمسة بالدولار، مع تغيّر 24 ساعة ورسم مصغّر.
// يقرأ آخر نتيجة حفظتها الدالة المجدولة، ويجلب بنفسه إذا كانت قديمة. إن فشل الجلب
// يرجع آخر سعر محفوظ مع stale: true بدلاً من صفحة فارغة.
import { collect } from '../lib/collect.mjs';
import { ASSETS, ASSET_IDS, SOURCES, STALE_AFTER_MS, USD_SAR } from '../lib/config.mjs';
import { json } from '../lib/http.mjs';
import { readJSON } from '../lib/store.mjs';

const REFRESH_IF_OLDER_MS = 3 * 60 * 1000;
const SOURCE_TIME_MAX_AGE_MS = 30 * 60 * 1000;

export default async () => {
  const now = Date.now();
  let live = await readJSON('live');
  if (!live || now - live.fetchedAt > REFRESH_IF_OLDER_MS) {
    try {
      live = await collect(now);
    } catch (e) {
      console.error('collect failed:', e);
    }
  }

  const assets = {};
  let updatedAt = 0;
  let stale = false;
  for (const id of ASSET_IDS) {
    const a = live?.assets?.[id];
    if (!a) {
      assets[id] = null;
      stale = true;
      continue;
    }
    const isStale = !a.ok || now - a.fetchedAt > STALE_AFTER_MS || now - a.time > SOURCE_TIME_MAX_AGE_MS;
    stale ||= isStale;
    updatedAt = Math.max(updatedAt, a.fetchedAt);
    assets[id] = {
      price: a.price,
      unit: ASSETS[id].kind === 'metal' ? 'oz' : 'coin',
      change24: a.change24 ?? null,
      spark: a.spark ?? [],
      updatedAt: a.fetchedAt,
      stale: isStale,
      source: a.src === 'coinbase' ? SOURCES.crypto.name : SOURCES.metals.name,
    };
  }

  if (!updatedAt) return json({ error: 'unavailable' }, { status: 503 });
  return json(
    { updatedAt, serverTime: now, stale, usdSar: USD_SAR, assets, sources: SOURCES },
    { cdn: stale ? 'public, s-maxage=15' : 'public, durable, s-maxage=30, stale-while-revalidate=30' },
  );
};

export const config = { path: '/api/prices', method: 'GET' };
