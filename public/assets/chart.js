// الرسم البياني بمكتبة TradingView Lightweight Charts، تُحمَّل فقط عند فتح صفحة الأصل.
import { formatUtc } from './calc.js';

const LIB_URL = '/assets/vendor/lightweight-charts-5.2.1.mjs';
let libPromise;
const loadLib = () => (libPromise ??= import(LIB_URL));

export function prefetchChartLib() {
  if (document.querySelector(`link[href="${LIB_URL}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = LIB_URL;
  document.head.append(link);
}

const pad = (n) => String(n).padStart(2, '0');

// الأوقات تصل للرسم مزاحة بالمنطقة الزمنية المحلية، فتُقرأ بدوال UTC.
function tickMark(time, type) {
  const d = new Date(time * 1000);
  switch (type) {
    case 0:
      return String(d.getUTCFullYear());
    case 1:
      return `${pad(d.getUTCMonth() + 1)}/${d.getUTCFullYear()}`;
    case 2:
      return `${pad(d.getUTCDate())}/${pad(d.getUTCMonth() + 1)}`;
    default:
      return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  }
}

export async function createPriceChart(container, { formatPrice, onHover }) {
  const LWC = await loadLib();
  let intraday = true;
  const chart = LWC.createChart(container, {
    autoSize: true,
    layout: {
      background: { type: LWC.ColorType.Solid, color: 'transparent' },
      textColor: '#A9AFBA',
      fontFamily: "'IBM Plex Sans Arabic', system-ui, sans-serif",
      fontSize: 11,
      attributionLogo: true,
    },
    grid: { vertLines: { visible: false }, horzLines: { color: 'rgba(255,255,255,0.06)' } },
    leftPriceScale: { visible: true, borderVisible: false, scaleMargins: { top: 0.14, bottom: 0.06 } },
    rightPriceScale: { visible: false },
    timeScale: {
      borderVisible: false,
      timeVisible: true,
      secondsVisible: false,
      fixLeftEdge: true,
      fixRightEdge: true,
      lockVisibleTimeRangeOnResize: true,
      tickMarkFormatter: tickMark,
    },
    crosshair: {
      mode: LWC.CrosshairMode.Magnet,
      vertLine: { color: 'rgba(212,175,55,0.55)', labelVisible: false, style: LWC.LineStyle.Dashed },
      horzLine: { color: 'rgba(212,175,55,0.35)', labelVisible: false, style: LWC.LineStyle.Dashed },
    },
    localization: {
      locale: 'en-US',
      priceFormatter: formatPrice,
      timeFormatter: (t) => formatUtc(t, intraday),
    },
    handleScroll: false,
    handleScale: false,
  });

  const series = chart.addSeries(LWC.AreaSeries, {
    priceScaleId: 'left',
    lineColor: '#D4AF37',
    lineWidth: 2,
    topColor: 'rgba(212,175,55,0.30)',
    bottomColor: 'rgba(212,175,55,0.02)',
    priceLineVisible: false,
    lastValueVisible: true,
    crosshairMarkerRadius: 4,
    crosshairMarkerBorderColor: '#0F1115',
    crosshairMarkerBackgroundColor: '#D4AF37',
    priceFormat: { type: 'custom', formatter: formatPrice, minMove: 0.0001 },
    // مدى أدنى للمحور (0.2% من السعر) حتى لا تتكرر التسميات عندما يكون السعر شبه ثابت.
    autoscaleInfoProvider: (original) => {
      const info = original();
      const range = info?.priceRange;
      if (range) {
        const mid = (range.minValue + range.maxValue) / 2;
        const minSpan = Math.abs(mid) * 0.002;
        if (range.maxValue - range.minValue < minSpan) {
          info.priceRange = { minValue: mid - minSpan / 2, maxValue: mid + minSpan / 2 };
        }
      }
      return info;
    },
  });

  chart.subscribeCrosshairMove((param) => {
    const data = param.time != null && param.point ? param.seriesData.get(series) : null;
    if (!data) return onHover(null);
    onHover({ x: param.point.x, y: param.point.y, value: data.value, label: formatUtc(param.time, intraday) });
  });

  return {
    // points: [[وقت بالثواني UTC، قيمة]]؛ الفترات القصيرة تُعرض بالتوقيت المحلي.
    setData(points, { isIntraday }) {
      intraday = isIntraday;
      const shift = isIntraday ? -new Date().getTimezoneOffset() * 60 : 0;
      chart.applyOptions({ timeScale: { timeVisible: isIntraday } });
      series.setData(points.map(([t, v]) => ({ time: t + shift, value: v })));
      chart.timeScale().fitContent();
    },
    destroy() {
      chart.remove();
    },
  };
}
