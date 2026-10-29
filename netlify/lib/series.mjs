// أدوات السلاسل الزمنية. النقطة [t, p]: t بالثواني (UTC) و p السعر بالدولار.
// السلاسل المخزّنة بصيغة عمودية { t: [...], p: [...] } لتصغير الحجم.

import { DAY } from './config.mjs';

export const roundPrice = (p) => Math.round(p * 1e4) / 1e4;

export const emptySeries = () => ({ t: [], p: [] });

export function toPairs(series) {
  if (!series || !Array.isArray(series.t)) return [];
  return series.t.map((t, i) => [t, series.p[i]]);
}

export function fromPairs(pairs) {
  return { t: pairs.map((x) => x[0]), p: pairs.map((x) => x[1]) };
}

// يضيف نقطة في نهاية السلسلة. إن كانت في نفس الحاوية الزمنية لآخر نقطة يستبدلها،
// وإن كانت أقدم يتجاهلها. يرجع true إذا تغيّرت السلسلة.
export function upsertLast(series, t, p) {
  const n = series.t.length;
  if (n === 0 || t > series.t[n - 1]) {
    series.t.push(t);
    series.p.push(p);
    return true;
  }
  if (t === series.t[n - 1]) {
    if (series.p[n - 1] === p) return false;
    series.p[n - 1] = p;
    return true;
  }
  return false;
}

export function pruneSeries(series, keep) {
  const extra = series.t.length - keep;
  if (extra > 0) {
    series.t.splice(0, extra);
    series.p.splice(0, extra);
  }
  return series;
}

// دمج سلسلتين من الأزواج؛ عند تطابق الوقت تفوز b.
export function mergePairs(a, b) {
  const map = new Map();
  for (const [t, p] of a) map.set(t, p);
  for (const [t, p] of b) map.set(t, p);
  return [...map.entries()].sort((x, y) => x[0] - y[0]);
}

export function windowPairs(pairs, start, end = Infinity) {
  return pairs.filter(([t]) => t >= start && t <= end);
}

// آخر نقطة وقتها <= t (بحث ثنائي). يرجع null إن لم توجد.
export function valueAtOrBefore(pairs, t) {
  let lo = 0;
  let hi = pairs.length - 1;
  let found = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (pairs[mid][0] <= t) {
      found = pairs[mid];
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

// تقليل عدد النقاط بأخذ آخر نقطة من كل مجموعة، مع الإبقاء على أول نقطة وآخرها.
export function downsample(pairs, maxPoints) {
  if (pairs.length <= maxPoints) return pairs;
  const size = Math.ceil(pairs.length / maxPoints);
  const out = [pairs[0]];
  for (let i = size - 1; i < pairs.length - 1; i += size) out.push(pairs[i]);
  out.push(pairs[pairs.length - 1]);
  return out;
}

// قيم بداية كل يوم (UTC) مبنية من آخر سعر في ذلك اليوم.
export function dailyCloses(pairs) {
  const byDay = new Map();
  for (const [t, p] of pairs) byDay.set(Math.floor(t / DAY) * DAY, p);
  return [...byDay.entries()].sort((x, y) => x[0] - y[0]);
}

export const startOfDay = (t) => Math.floor(t / DAY) * DAY;

// نسبة التغيّر بين قيمتين (كسر عشري، مثل 0.0121 = 1.21%).
export function changeRatio(from, to) {
  if (!(from > 0) || !Number.isFinite(to)) return null;
  return (to - from) / from;
}
