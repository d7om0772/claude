// دالة مجدولة كل ساعة (الدقيقة 7 بتوقيت UTC): تحدّث السجل اليومي لكل الأصول.
import { maintain } from '../lib/history.mjs';

export default async () => {
  const report = await maintain();
  console.log('maintain:', JSON.stringify(report));
};

export const config = { schedule: '7 * * * *' };
