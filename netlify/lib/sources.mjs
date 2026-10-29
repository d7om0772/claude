// الاتصال بمزوّدي البيانات. يعمل في الخادم فقط (Netlify Functions).
import { DAY } from './config.mjs';
import { roundPrice } from './series.mjs';

const TIMEOUT_MS = 6000;
const GOLD_API = 'https://api.gold-api.com';
const COINBASE = 'https://api.exchange.coinbase.com';

export function getEnv(name) {
  return globalThis.Netlify?.env?.get(name) ?? process.env[name];
}

export class HttpError extends Error {
  constructor(host, status) {
    super(`${host} responded ${status}`);
    this.status = status;
  }
}

async function getJSON(url, headers = {}) {
  const res = await fetch(url, {
    headers: { accept: 'application/json', 'user-agent': 'mizan-prices/1.0', ...headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new HttpError(new URL(url).host, res.status);
  return res.json();
}

function validPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) throw new Error(`invalid price: ${value}`);
  return roundPrice(n);
}

// السعر الحالي من Gold-API.com (مجاني، بلا مفتاح). السعر بالدولار للأونصة أو للوحدة.
export async function goldApiPrice(symbol) {
  const d = await getJSON(`${GOLD_API}/price/${symbol}`);
  return {
    price: validPrice(d.price),
    time: Date.parse(d.updatedAt) || Date.now(),
    src: 'gold-api',
  };
}

// السجل اليومي من Gold-API.com (يتطلب مفتاحاً مجانياً، والحد 10 طلبات في الساعة).
export async function goldApiDailyHistory(symbol, startSec, endSec, key) {
  const qs = new URLSearchParams({
    symbol,
    startTimestamp: String(Math.floor(startSec)),
    endTimestamp: String(Math.floor(endSec)),
    groupBy: 'day',
    aggregation: 'avg',
    orderBy: 'asc',
  });
  const rows = await getJSON(`${GOLD_API}/history?${qs}`, { 'x-api-key': key });
  if (!Array.isArray(rows)) throw new Error('unexpected history response');
  const pairs = [];
  for (const row of rows) {
    const day = row.day ?? row.date ?? row.timestamp;
    const priceKey = Object.keys(row).find((k) => k.endsWith('_price'));
    if (day == null || !priceKey) continue;
    const ms = typeof day === 'number' ? day * 1000 : Date.parse(String(day).length === 10 ? `${day}T00:00:00Z` : day);
    const price = Number(row[priceKey]);
    if (Number.isFinite(ms) && price > 0) pairs.push([Math.floor(ms / 1000 / DAY) * DAY, roundPrice(price)]);
  }
  return pairs.sort((a, b) => a[0] - b[0]);
}

// السعر الحالي وسعر ما قبل 24 ساعة من Coinbase (مجاني، بلا مفتاح).
export async function coinbaseStats(product) {
  const d = await getJSON(`${COINBASE}/products/${product}/stats`);
  return {
    price: validPrice(d.last),
    open24: Number(d.open) > 0 ? roundPrice(Number(d.open)) : null,
    time: Date.now(),
    src: 'coinbase',
  };
}

const COINBASE_MAX_CANDLES = 300;

// شموع Coinbase (طلب واحد). يرجع أزواج [وقت البداية، سعر الإغلاق] تصاعدياً.
export async function coinbaseCandles(product, granularity, startSec, endSec) {
  const qs = new URLSearchParams({
    granularity: String(granularity),
    start: new Date(startSec * 1000).toISOString(),
    end: new Date(endSec * 1000).toISOString(),
  });
  const rows = await getJSON(`${COINBASE}/products/${product}/candles?${qs}`);
  if (!Array.isArray(rows)) throw new Error('unexpected candles response');
  return rows
    .filter((r) => Array.isArray(r) && Number(r[4]) > 0)
    .map((r) => [Number(r[0]), roundPrice(Number(r[4]))])
    .sort((a, b) => a[0] - b[0]);
}

// نطاق طويل يُقسَّم إلى طلبات من 300 شمعة، بتوازٍ محدود احتراماً لحدود Coinbase.
export async function coinbaseRange(product, granularity, startSec, endSec, concurrency = 4) {
  const span = granularity * COINBASE_MAX_CANDLES;
  const chunks = [];
  for (let s = startSec; s < endSec; s += span) chunks.push([s, Math.min(s + span - granularity, endSec)]);
  const results = [];
  for (let i = 0; i < chunks.length; i += concurrency) {
    const batch = chunks.slice(i, i + concurrency).map(([s, e]) => coinbaseCandles(product, granularity, s, e));
    results.push(...(await Promise.all(batch)));
  }
  const map = new Map();
  for (const pairs of results) for (const [t, p] of pairs) map.set(t, p);
  return [...map.entries()].sort((a, b) => a[0] - b[0]);
}
