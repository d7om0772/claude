// دالة مجدولة كل دقيقة: تجلب الأسعار الحالية وتحفظها وتسجّل سلاسل المعادن.
import { collect } from '../lib/collect.mjs';

export default async () => {
  const live = await collect();
  const failed = Object.entries(live.assets)
    .filter(([, a]) => !a?.ok)
    .map(([id]) => id);
  if (failed.length) console.warn('collector: failed assets', failed.join(','));
};

export const config = { schedule: '* * * * *' };
