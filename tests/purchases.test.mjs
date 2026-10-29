import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GRAMS_PER_TROY_OUNCE } from '../public/assets/calc.js';
import {
  mergePurchases,
  normalizePurchase,
  parseBackup,
  purchaseCostUsd,
  purchaseResult,
  purchaseUnitUsd,
  summarizePurchases,
} from '../public/assets/purchases.js';

const OZ = GRAMS_PER_TROY_OUNCE;
const base = { id: 'a1', createdAt: 1_700_000_000_000, usdSar: 3.75, note: '' };
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-6, `${a} != ${b}`);

test('gold purchase uses the recorded spot price, unit, and karat', () => {
  // 100$ للجرام عيار 24 وقت الشراء؛ 10 جرام عيار 21
  const p = normalizePurchase({ ...base, asset: 'gold', karat: 21, unit: 'g', qty: 10, spotUsd: OZ * 100 });
  close(purchaseUnitUsd(p), 87.5);
  close(purchaseCostUsd(p), 875);
  const r = purchaseResult(p, OZ * 110); // ارتفع 10%
  close(r.value, 962.5);
  close(r.pl, 87.5);
  close(r.ratio, 0.1);
});

test('the amount actually paid replaces the spot cost when given', () => {
  const p = normalizePurchase({
    ...base,
    asset: 'gold',
    karat: 24,
    unit: 'g',
    qty: 10,
    spotUsd: OZ * 100,
    paid: { amount: 4125, currency: 'SAR' }, // 1100$
  });
  close(purchaseCostUsd(p), 1100);
  const r = purchaseResult(p, OZ * 100);
  close(r.pl, -100);
});

test('crypto purchase in whole-coin units', () => {
  const p = normalizePurchase({ ...base, asset: 'bitcoin', unit: 'g', karat: 21, qty: 0.015, spotUsd: 80000 });
  assert.equal(p.unit, 'coin');
  assert.equal(p.karat, null);
  close(purchaseCostUsd(p), 1200);
  close(purchaseResult(p, 90000).pl, 150);
});

test('normalizePurchase rejects invalid records and trims notes', () => {
  assert.equal(normalizePurchase(null), null);
  assert.equal(normalizePurchase({ ...base, asset: 'dogecoin', qty: 1, spotUsd: 1 }), null);
  assert.equal(normalizePurchase({ ...base, asset: 'gold', unit: 'g', qty: 0, spotUsd: 1 }), null);
  assert.equal(normalizePurchase({ ...base, asset: 'gold', unit: 'lb', qty: 1, spotUsd: 1 }), null);
  assert.equal(normalizePurchase({ ...base, asset: 'gold', unit: 'g', qty: 1, spotUsd: -5 }), null);
  const p = normalizePurchase({ ...base, asset: 'silver', unit: 'kg', qty: 1, spotUsd: 50, note: `  ${'x'.repeat(300)}`, paid: { amount: 5, currency: 'EUR' } });
  assert.equal(p.note.length, 120);
  assert.equal(p.paid, null);
  assert.equal(p.karat, null);
});

test('summary totals and missing prices', () => {
  const list = [
    normalizePurchase({ ...base, id: 'g', asset: 'gold', karat: 24, unit: 'g', qty: 1, spotUsd: OZ * 100 }),
    normalizePurchase({ ...base, id: 'b', asset: 'bitcoin', qty: 0.01, spotUsd: 80000 }),
  ];
  const s = summarizePurchases(list, (id) => ({ gold: OZ * 120, bitcoin: 70000 })[id]);
  close(s.cost, 900);
  close(s.value, 820);
  close(s.pl, -80);
  const missing = summarizePurchases(list, (id) => (id === 'gold' ? OZ * 120 : undefined));
  assert.equal(missing.value, null);
  close(missing.cost, 900);
});

test('backup import merges by id and skips invalid entries', () => {
  const existing = [normalizePurchase({ ...base, id: 'x', asset: 'gold', karat: 24, unit: 'g', qty: 1, spotUsd: 100 })];
  const backup = JSON.stringify({
    app: 'mizan',
    purchases: [
      { ...base, id: 'x', asset: 'gold', karat: 24, unit: 'g', qty: 1, spotUsd: 100 },
      { ...base, id: 'y', asset: 'ethereum', qty: 2, spotUsd: 2000 },
      { id: 'z', asset: 'gold' },
    ],
  });
  const { list, added, skipped } = mergePurchases(existing, parseBackup(backup));
  assert.equal(added, 1);
  assert.equal(skipped, 2);
  assert.deepEqual(
    list.map((p) => p.id),
    ['x', 'y'],
  );
  assert.throws(() => parseBackup('{"foo":1}'));
});

test('Arabic count wording', async () => {
  const { countText } = await import('../public/assets/purchases.js');
  assert.equal(countText(1), 'عملية واحدة');
  assert.equal(countText(2), 'عمليتان');
  assert.match(countText(3), /عمليات$/);
  assert.match(countText(10), /عمليات$/);
  assert.match(countText(11), /عملية$/);
  assert.match(countText(103), /عمليات$/);
});
