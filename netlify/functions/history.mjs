// GET /api/history?asset=gold&range=1d — نقاط الرسم [وقت بالثواني، سعر بالدولار].
import { ASSETS, RANGE_CACHE_TTL, RANGES } from '../lib/config.mjs';
import { getHistory } from '../lib/history.mjs';
import { json } from '../lib/http.mjs';

export default async (req) => {
  const params = new URL(req.url).searchParams;
  const asset = params.get('asset');
  const range = params.get('range');
  if (!Object.hasOwn(ASSETS, asset ?? '') || !RANGES.includes(range)) {
    return json({ error: 'bad-request', ranges: RANGES, assets: Object.keys(ASSETS) }, { status: 400 });
  }
  try {
    const result = await getHistory(asset, range);
    // البيانات الجزئية (أثناء التجميع) تُخزَّن مدة أقصر حتى تظهر الإضافات بسرعة.
    const ttl = result.partial ? Math.min(RANGE_CACHE_TTL[range], 300) : RANGE_CACHE_TTL[range];
    return json(result, {
      cdn: `public, durable, s-maxage=${ttl}, stale-while-revalidate=${ttl}`,
      vary: 'query=asset|range',
    });
  } catch (e) {
    console.error(`history ${asset}/${range} failed:`, e);
    return json({ error: 'unavailable' }, { status: 503 });
  }
};

export const config = { path: '/api/history', method: 'GET' };
