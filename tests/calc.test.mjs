import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  computeZakat,
  formatMoney,
  formatPercent,
  GRAMS_PER_TROY_OUNCE,
  parseAmount,
  toCurrency,
  unitPriceUsd,
} from '../public/assets/calc.js';

const OZ = GRAMS_PER_TROY_OUNCE;

test('metal unit prices by unit and karat', () => {
  const usdPerOz = OZ * 100; // 100$ للجرام
  assert.equal(unitPriceUsd('metal', usdPerOz, { unit: 'g', karat: 24 }), 100);
  assert.equal(unitPriceUsd('metal', usdPerOz, { unit: 'kg', karat: 24 }), 100000);
  assert.ok(Math.abs(unitPriceUsd('metal', usdPerOz, { unit: 'oz', karat: 24 }) - usdPerOz) < 1e-9);
  assert.equal(unitPriceUsd('metal', usdPerOz, { unit: 'g', karat: 21 }), 87.5);
  assert.equal(unitPriceUsd('metal', usdPerOz, { unit: 'g', karat: 18 }), 75);
  assert.equal(unitPriceUsd('crypto', 80000, { unit: 'g', karat: 18 }), 80000);
});

test('SAR conversion uses the 3.75 peg', () => {
  assert.equal(toCurrency(100, 'SAR'), 375);
  assert.equal(toCurrency(100, 'USD'), 100);
});

test('parseAmount accepts Arabic digits and limits decimals', () => {
  assert.deepEqual(parseAmount('١٠٫٥', 3), { text: '10.5', value: 10.5, truncated: false });
  assert.deepEqual(parseAmount('۲۵', 3), { text: '25', value: 25, truncated: false });
  assert.deepEqual(parseAmount('0.123456789', 8), { text: '0.12345678', value: 0.12345678, truncated: true });
  assert.deepEqual(parseAmount('1,000', 3), { text: '1000', value: 1000, truncated: false });
  assert.deepEqual(parseAmount('.5', 3), { text: '0.5', value: 0.5, truncated: false });
  assert.deepEqual(parseAmount('1.2.3', 3), { text: '1.23', value: 1.23, truncated: false });
  assert.equal(parseAmount('', 3).value, null);
  assert.equal(parseAmount('abc', 3).value, null);
});

test('zakat: gold nisab uses pure gold equivalent', () => {
  const goldUsdPerOunce = OZ * 100;
  const silverUsdPerOunce = OZ * 1;
  // 96 جرام عيار 21 = 84 جرام خالص: لم يبلغ النصاب
  let r = computeZakat({ goldGrams: 96, goldKarat: 21, silverGrams: 0, goldUsdPerOunce, silverUsdPerOunce });
  assert.equal(r.gold.reached, false);
  assert.equal(r.totalDue, 0);
  // 100 جرام عيار 21 = 87.5 جرام خالص: بلغ النصاب، والزكاة 2.5% من قيمته
  r = computeZakat({ goldGrams: 100, goldKarat: 21, silverGrams: 0, goldUsdPerOunce, silverUsdPerOunce });
  assert.equal(r.gold.reached, true);
  assert.ok(Math.abs(r.gold.value - 8750) < 1e-9);
  assert.ok(Math.abs(r.gold.due - 218.75) < 1e-9);
  assert.ok(Math.abs(r.nisabGoldValue - 8500) < 1e-9);
});

test('zakat: silver nisab and both metals assessed separately', () => {
  const r = computeZakat({
    goldGrams: 50,
    goldKarat: 24,
    silverGrams: 600,
    goldUsdPerOunce: OZ * 100,
    silverUsdPerOunce: OZ * 1,
  });
  assert.equal(r.gold.reached, false);
  assert.equal(r.silver.reached, true);
  assert.ok(Math.abs(r.silver.due - 15) < 1e-9);
  assert.ok(Math.abs(r.totalDue - 15) < 1e-9);
  assert.ok(Math.abs(r.nisabSilverValue - 595) < 1e-9);
});

test('formatting uses English digits', () => {
  assert.equal(formatMoney(1234567.891), '1,234,567.89');
  assert.equal(formatMoney(0.5), '0.50');
  assert.equal(formatMoney(0.00080123), '0.00080123');
  assert.equal(formatPercent(-0.0121), '1.21%');
  assert.equal(formatPercent(null), '—');
});
