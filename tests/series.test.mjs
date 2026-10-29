import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  dailyCloses,
  downsample,
  emptySeries,
  mergePairs,
  pruneSeries,
  toPairs,
  upsertLast,
  valueAtOrBefore,
} from '../netlify/lib/series.mjs';

test('upsertLast appends, replaces the same bucket, ignores older points', () => {
  const s = emptySeries();
  assert.equal(upsertLast(s, 60, 1), true);
  assert.equal(upsertLast(s, 120, 2), true);
  assert.equal(upsertLast(s, 120, 3), true);
  assert.equal(upsertLast(s, 120, 3), false);
  assert.equal(upsertLast(s, 60, 9), false);
  assert.deepEqual(toPairs(s), [
    [60, 1],
    [120, 3],
  ]);
  pruneSeries(s, 1);
  assert.deepEqual(toPairs(s), [[120, 3]]);
});

test('mergePairs sorts and lets the second series win', () => {
  assert.deepEqual(
    mergePairs(
      [
        [3, 'a'],
        [1, 'a'],
      ],
      [
        [3, 'b'],
        [2, 'b'],
      ],
    ),
    [
      [1, 'a'],
      [2, 'b'],
      [3, 'b'],
    ],
  );
});

test('downsample keeps first and last points within the limit', () => {
  const pairs = Array.from({ length: 1000 }, (_, i) => [i, i]);
  const out = downsample(pairs, 100);
  assert.ok(out.length <= 101);
  assert.deepEqual(out[0], [0, 0]);
  assert.deepEqual(out.at(-1), [999, 999]);
  assert.equal(downsample(pairs.slice(0, 5), 100).length, 5);
});

test('valueAtOrBefore and dailyCloses', () => {
  const pairs = [
    [100, 1],
    [200, 2],
    [300, 3],
  ];
  assert.deepEqual(valueAtOrBefore(pairs, 250), [200, 2]);
  assert.equal(valueAtOrBefore(pairs, 50), null);
  const day = 86400;
  assert.deepEqual(
    dailyCloses([
      [day + 10, 5],
      [day + 20, 6],
      [2 * day + 5, 7],
    ]),
    [
      [day, 6],
      [2 * day, 7],
    ],
  );
});
