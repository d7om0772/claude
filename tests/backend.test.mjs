// اختبارات الخادم بمزوّدين وهميين (fetch مُحاكى) ومخزن محلي مؤقت.
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, test } from 'node:test';

let dir;
let fetchImpl;
const realFetch = globalThis.fetch;

before(async () => {
  dir = await mkdtemp(path.join(os.tmpdir(), 'mizan-test-'));
  process.env.MIZAN_LOCAL_STORE = dir;
  delete process.env.GOLD_API_KEY;
  globalThis.fetch = (url, opts) => fetchImpl(String(url), opts);
});
after(async () => {
  globalThis.fetch = realFetch;
  await rm(dir, { recursive: true, force: true });
});

const jsonResponse = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const metalPrices = { XAU: 4000, XAG: 50, XPT: 1500, BTC: 80000, ETH: 2300 };
let failing = new Set();
let sourceClock = null; // وقت المصدر الوهمي (updatedAt)؛ null = الوقت الحقيقي
beforeEach(() => {
  failing = new Set();
  fetchImpl = async (url) => {
    const host = new URL(url).host;
    if (failing.has(host)) return jsonResponse({ message: 'down' }, 503);
    let m = url.match(/gold-api\.com\/price\/(\w+)/);
    if (m) return jsonResponse({ price: metalPrices[m[1]], updatedAt: new Date(sourceClock ?? Date.now()).toISOString() });
    m = url.match(/products\/(\w+)-USD\/stats/);
    if (m) return jsonResponse({ last: String(metalPrices[m[1]]), open: String(metalPrices[m[1]] * 0.98) });
    if (url.includes('/candles')) {
      const u = new URL(url);
      const g = Number(u.searchParams.get('granularity'));
      const start = Date.parse(u.searchParams.get('start')) / 1000;
      const end = Date.parse(u.searchParams.get('end')) / 1000;
      const rows = [];
      for (let t = Math.ceil(start / g) * g; t <= end && rows.length < 300; t += g) rows.push([t, 1, 2, 1, 100 + (t % 7), 5]);
      return jsonResponse(rows.reverse());
    }
    if (url.includes('/history')) {
      return jsonResponse([
        { day: '2026-10-26', avg_price: 3990 },
        { day: '2026-10-27', avg_price: 4010 },
      ]);
    }
    throw new Error(`unexpected url ${url}`);
  };
});

const { collect } = await import('../netlify/lib/collect.mjs');
const { getHistory, maintain } = await import('../netlify/lib/history.mjs');
const prices = (await import('../netlify/functions/prices.mjs')).default;
const history = (await import('../netlify/functions/history.mjs')).default;

test('collect stores live prices and records metals only when the price moves', async () => {
  const t0 = Date.UTC(2026, 9, 28, 10, 0, 0);
  sourceClock = t0;
  let live = await collect(t0);
  assert.equal(live.assets.gold.price, 4000);
  assert.equal(live.assets.bitcoin.src, 'coinbase');
  assert.ok(Math.abs(live.assets.bitcoin.change24 - (1 / 0.98 - 1)) < 1e-9);
  sourceClock = t0 + 60_000;
  await collect(t0 + 60_000); // نفس السعر: لا نقطة جديدة
  metalPrices.XAU = 4004;
  sourceClock = t0 + 120_000;
  live = await collect(t0 + 120_000);
  sourceClock = null;
  const h = await getHistory('gold', '1h', t0 + 120_000);
  assert.equal(h.points.length, 2);
  assert.deepEqual(
    h.points.map(([t]) => t),
    [t0 / 1000, t0 / 1000 + 120],
  );
  assert.equal(h.points.at(-1)[1], 4004);
  assert.equal(h.partial, true);
});

test('prices endpoint falls back to the last saved price and flags it stale', async () => {
  await collect();
  failing = new Set(['api.gold-api.com', 'api.exchange.coinbase.com']);
  const live = await collect(); // كل المصادر معطّلة
  assert.equal(live.assets.gold.ok, false);
  const res = await prices(new Request('http://x/api/prices'));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.stale, true);
  assert.equal(body.assets.gold.stale, true);
  assert.ok(body.assets.gold.price > 0);
  assert.equal(res.headers.get('netlify-cdn-cache-control'), 'public, s-maxage=15');
});

test('crypto falls back to gold-api when coinbase is down', async () => {
  failing = new Set(['api.exchange.coinbase.com']);
  const live = await collect();
  assert.equal(live.assets.bitcoin.ok, true);
  assert.equal(live.assets.bitcoin.src, 'gold-api');
});

test('history endpoint validates input and sets cache headers', async () => {
  let res = await history(new Request('http://x/api/history?asset=dogecoin&range=1d'));
  assert.equal(res.status, 400);
  res = await history(new Request('http://x/api/history?asset=bitcoin&range=1d'));
  assert.equal(res.status, 200);
  assert.match(res.headers.get('netlify-cdn-cache-control'), /s-maxage=120/);
  assert.equal(res.headers.get('netlify-vary'), 'query=asset|range');
  const body = await res.json();
  assert.ok(body.points.length > 200);
});

test('all ranges work for all assets', async () => {
  for (const id of ['gold', 'silver', 'platinum', 'bitcoin', 'ethereum']) {
    for (const range of ['1h', '1d', '1w', '1m', '1y', '5y', '10y']) {
      const r = await getHistory(id, range);
      assert.ok(Array.isArray(r.points), `${id} ${range}`);
    }
  }
});

test('metal long history uses Gold-API daily data when a key is set', async () => {
  process.env.GOLD_API_KEY = 'test-key';
  let sentKey = null;
  const inner = fetchImpl;
  fetchImpl = async (url, opts) => {
    if (url.includes('/history')) sentKey = opts?.headers?.['x-api-key'];
    return inner(url, opts);
  };
  const report = await maintain();
  assert.equal(report.gold, '+2');
  assert.equal(sentKey, 'test-key');
  const r = await getHistory('gold', '1y');
  assert.ok(r.points.some(([, p]) => p === 3990));
  delete process.env.GOLD_API_KEY;
});
