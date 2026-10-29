// جلب الأسعار الحالية لكل الأصول، وحفظ آخر سعر ناجح، وتسجيل سلاسل المعادن بالدقيقة والساعة.
// تستدعيه الدالة المجدولة كل دقيقة، وتستدعيه دالة الأسعار احتياطياً إذا توقفت الجدولة.
import { ASSETS, ASSET_IDS, CRYPTO_IDS, DAY, HOUR, MINUTE, HOURLY_KEEP, MINUTE_KEEP } from './config.mjs';
import { coinbaseCandles, coinbaseStats, goldApiPrice } from './sources.mjs';
import { readJSON, writeJSON } from './store.mjs';
import {
  changeRatio,
  downsample,
  emptySeries,
  pruneSeries,
  toPairs,
  upsertLast,
  valueAtOrBefore,
  windowPairs,
} from './series.mjs';

const SPARK_POINTS = 48;
const CRYPTO_SPARK_EVERY_MS = 5 * 60 * 1000;

async function fetchQuote(id) {
  const asset = ASSETS[id];
  if (asset.kind === 'metal') return goldApiPrice(asset.goldApi);
  try {
    return await coinbaseStats(asset.coinbase);
  } catch (e) {
    console.warn(`coinbase ${id} failed, using gold-api:`, e.message);
    return goldApiPrice(asset.goldApi);
  }
}

// يسجّل سعر المعدن فقط عندما يتغيّر، حتى لا تمتد خطوط مسطحة أثناء إغلاق السوق.
function recordMetal(minuteSeries, hourlySeries, quote) {
  if (minuteSeries.p.at(-1) === quote.price) return { minute: false, hourly: false };
  const sec = Math.floor(quote.time / 1000);
  const minute = upsertLast(minuteSeries, Math.floor(sec / MINUTE) * MINUTE, quote.price);
  const hourly = upsertLast(hourlySeries, Math.floor(sec / HOUR) * HOUR, quote.price);
  pruneSeries(minuteSeries, MINUTE_KEEP);
  pruneSeries(hourlySeries, HOURLY_KEEP);
  return { minute, hourly };
}

function metalDerived(minuteSeries, quote, ref) {
  const pairs = toPairs(minuteSeries);
  const lastT = pairs.at(-1)?.[0];
  if (!lastT) return { spark: [], change24: changeRatio(ref, quote.price) };
  const spark = downsample(windowPairs(pairs, lastT - DAY), SPARK_POINTS).map((x) => x[1]);
  const covers24h = pairs[0][0] <= lastT - DAY + 5 * MINUTE;
  const from = covers24h ? valueAtOrBefore(pairs, lastT - DAY)?.[1] : ref;
  return { spark, change24: changeRatio(from, quote.price) };
}

export async function collect(now = Date.now()) {
  const [prevLive, minuteStore, hourlyStore, refs] = await Promise.all([
    readJSON('live'),
    readJSON('minute'),
    readJSON('hourly'),
    readJSON('refs'),
  ]);
  const minute = minuteStore ?? {};
  const hourly = hourlyStore ?? {};
  const nowSec = Math.floor(now / 1000);
  const sparkDue = !prevLive?.cryptoSparkAt || now - prevLive.cryptoSparkAt >= CRYPTO_SPARK_EVERY_MS - 10_000;

  const [quotes, sparks] = await Promise.all([
    Promise.allSettled(ASSET_IDS.map(fetchQuote)),
    sparkDue
      ? Promise.allSettled(CRYPTO_IDS.map((id) => coinbaseCandles(ASSETS[id].coinbase, 900, nowSec - DAY, nowSec)))
      : Promise.resolve(null),
  ]);

  let minuteChanged = false;
  let hourlyChanged = false;
  const assets = {};

  ASSET_IDS.forEach((id, i) => {
    const prev = prevLive?.assets?.[id] ?? null;
    const result = quotes[i];
    if (result.status !== 'fulfilled') {
      console.error(`live ${id} failed:`, result.reason?.message ?? result.reason);
      // نُبقي آخر سعر محفوظ مع علامة الفشل؛ دالة الأسعار تعرضه كسعر غير محدّث.
      assets[id] = prev ? { ...prev, ok: false } : null;
      return;
    }
    const quote = result.value;
    const entry = { price: quote.price, time: quote.time, fetchedAt: now, src: quote.src, ok: true };

    if (ASSETS[id].kind === 'metal') {
      const m = (minute[id] ??= emptySeries());
      const h = (hourly[id] ??= emptySeries());
      const changed = recordMetal(m, h, quote);
      minuteChanged ||= changed.minute;
      hourlyChanged ||= changed.hourly;
      Object.assign(entry, metalDerived(m, quote, refs?.[id]?.p ?? null));
    } else {
      entry.change24 = changeRatio(quote.open24, quote.price);
      const spark = sparks?.[CRYPTO_IDS.indexOf(id)];
      entry.spark =
        spark?.status === 'fulfilled' && spark.value.length > 1
          ? downsample(spark.value, SPARK_POINTS).map((x) => x[1])
          : (prev?.spark ?? []);
    }
    assets[id] = entry;
  });

  const sparksOk = sparks?.every((s) => s.status === 'fulfilled');
  const live = {
    fetchedAt: now,
    cryptoSparkAt: sparkDue && sparksOk ? now : (prevLive?.cryptoSparkAt ?? null),
    assets,
  };

  const writes = [writeJSON('live', live)];
  if (minuteChanged) writes.push(writeJSON('minute', minute));
  if (hourlyChanged) writes.push(writeJSON('hourly', hourly));
  await Promise.all(writes);
  return live;
}
