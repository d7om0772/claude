// ميزان — منطق الواجهة: التوجيه، وتحديث الأسعار كل 60 ثانية، والحاسبات.
// المتصفح لا يتصل إلا بـ /api/* على نفس الموقع؛ لا توجد أي مفاتيح هنا.
import {
  CRYPTO_DECIMALS,
  KARATS,
  METAL_DECIMALS,
  METAL_UNITS,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  USD_TO_SAR,
  changeRatio,
  computeZakat,
  formatClock,
  formatDateTime,
  formatMoney,
  formatNumber,
  formatPercent,
  formatQuantity,
  formatUtc,
  parseAmount,
  toCurrency,
  unitPriceUsd,
  usdPerGram,
} from './calc.js';

const ASSETS = {
  gold: { name: 'الذهب', kind: 'metal', icon: 'i-gold' },
  silver: { name: 'الفضة', kind: 'metal', icon: 'i-silver' },
  platinum: { name: 'البلاتين', kind: 'metal', icon: 'i-platinum' },
  bitcoin: { name: 'بيتكوين', kind: 'crypto', icon: 'i-btc', symbol: 'BTC', quick: ['0.001', '0.01', '0.1', '1'] },
  ethereum: { name: 'إيثيريوم', kind: 'crypto', icon: 'i-eth', symbol: 'ETH', quick: ['0.01', '0.1', '1', '10'] },
};
const ORDER = Object.keys(ASSETS);

const RANGES = [
  ['1h', 'ساعة', 'خلال ساعة'],
  ['1d', 'يوم', 'خلال يوم'],
  ['1w', 'أسبوع', 'خلال أسبوع'],
  ['1m', 'شهر', 'خلال شهر'],
  ['1y', 'سنة', 'خلال سنة'],
  ['5y', '5 سنوات', 'خلال 5 سنوات'],
  ['10y', '10 سنوات', 'خلال 10 سنوات'],
];
const RANGE_IDS = RANGES.map((r) => r[0]);
const INTRADAY = new Set(['1h', '1d', '1w', '1m']);
const LIVE_RANGES = new Set(['1h', '1d']);
// أقل عدد نقاط يُرسم به خط مفيد؛ أقل من ذلك نعرض رسالة التجميع.
const MIN_CHART_POINTS = 8;
const CURRENCIES = { SAR: 'ر.س', USD: '$' };
const POLL_MS = 60_000;
const LS_PRICES = 'mizan:prices';
const LS_PREFS = 'mizan:prefs';

// ---------- التخزين المحلي (اختياري؛ قد يكون معطّلاً) ----------

const storage = {
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* التخزين غير متاح: نكمل بدونه */
    }
  },
};

const saved = storage.get(LS_PREFS) ?? {};
const prefs = {
  currency: Object.hasOwn(CURRENCIES, saved.currency) ? saved.currency : 'SAR',
  karat: KARATS.includes(saved.karat) ? saved.karat : 24,
  range: RANGE_IDS.includes(saved.range) ? saved.range : '1d',
  lastAsset: Object.hasOwn(ASSETS, saved.lastAsset) ? saved.lastAsset : 'gold',
};
const savePrefs = () => storage.set(LS_PREFS, prefs);

const state = {
  prices: null,
  offline: false,
  lastFetchAt: 0,
  inflight: null,
  view: null,
  calc: Object.fromEntries(
    ORDER.map((id) => [id, ASSETS[id].kind === 'metal' ? { unit: 'g', qty: '10' } : { unit: 'coin', qty: '0.01' }]),
  ),
  zakat: { gold: '', karat: 21, silver: '' },
};

const $view = document.getElementById('view');
const $banner = document.getElementById('status-banner');

// ---------- تنسيق مشترك ----------

const rate = () => state.prices?.usdSar ?? USD_TO_SAR;
const inCurrency = (usd) => toCurrency(usd, prefs.currency, rate());
const curLabel = () => CURRENCIES[prefs.currency];

function moneyHTML(usd) {
  if (usd == null || !Number.isFinite(usd)) return '<span class="num">—</span>';
  return `<span class="money"><span class="num">${formatMoney(inCurrency(usd))}</span> <span class="cur">${curLabel()}</span></span>`;
}

const dirOf = (ratio) => (ratio == null ? 'flat' : ratio > 0 ? 'up' : ratio < 0 ? 'down' : 'flat');

function changeHTML(ratio) {
  const dir = dirOf(ratio);
  const arrow = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '';
  const word = dir === 'up' ? 'ارتفاع' : dir === 'down' ? 'انخفاض' : '';
  return `<span class="chg ${dir}">${word ? `<span class="sr">${word}</span>` : ''}<span class="num" aria-hidden="${word ? 'false' : 'true'}">${arrow}${formatPercent(ratio)}</span></span>`;
}

function sparkHTML(values, dir) {
  const W = 120;
  const H = 40;
  if (!Array.isArray(values) || values.length < 2) return `<svg class="spark" viewBox="0 0 ${W} ${H}" aria-hidden="true"></svg>`;
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - min) / span) * (H - 6)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  return `<svg class="spark ${dir}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><path class="spark-fill" d="${line}L${W} ${H}L0 ${H}Z"/><path class="spark-line" d="${line}"/></svg>`;
}

const placeholder = () => (state.offline ? '<span class="num">—</span>' : '<span class="sk">000.00</span>');

const iconHTML = (id, cls = 'asset-ic') => `<svg class="${cls}" aria-hidden="true"><use href="#${ASSETS[id].icon}"/></svg>`;

const asset = (id) => state.prices?.assets?.[id] ?? null;

// سعر العرض الأساسي بالدولار: للجرام في المعادن (حسب العيار للذهب)، وللوحدة في العملات الرقمية.
function displayUsd(id, rawUsd, karat = 24) {
  if (rawUsd == null) return null;
  return ASSETS[id].kind === 'metal' ? usdPerGram(rawUsd) * (id === 'gold' ? karat / 24 : 1) : rawUsd;
}

// ---------- حالة الاتصال والتنبيه ----------

function renderStatus() {
  const p = state.prices;
  const t = p?.updatedAt;
  for (const el of document.querySelectorAll('[data-updated]')) el.textContent = t ? formatClock(t) : '--:--';
  for (const el of document.querySelectorAll('[data-updated-full]')) el.textContent = t ? formatDateTime(t) : '—';

  let text = '';
  let retry = false;
  if (!p && state.offline) {
    text = 'تعذّر تحميل الأسعار حالياً. سنعيد المحاولة تلقائياً كل دقيقة.';
    retry = true;
  } else if (p && state.offline) {
    text = `تعذّر الاتصال بمصدر البيانات. الأسعار المعروضة هي آخر أسعار محفوظة وغير محدّثة (آخر تحديث: ${formatDateTime(t)}).`;
    retry = true;
  } else if (p?.stale) {
    const staleTimes = ORDER.map((id) => p.assets[id])
      .filter((a) => a?.stale)
      .map((a) => a.updatedAt);
    const oldest = staleTimes.length ? Math.min(...staleTimes) : t;
    text = `تنبيه: تعذّر تحديث بعض الأسعار من المصدر، والمعروض آخر سعر محفوظ وهو غير محدّث (آخر تحديث ناجح: ${formatDateTime(oldest)}).`;
  }
  $banner.hidden = !text;
  if (text) {
    $banner.querySelector('[data-banner-text]').innerHTML =
      `${text.replace(/(\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})/, '<span class="num">$1</span>')}`;
    let btn = $banner.querySelector('button');
    if (retry && !btn) {
      btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'إعادة المحاولة';
      btn.addEventListener('click', () => refreshPrices());
      $banner.append(btn);
    } else if (!retry && btn) {
      btn.remove();
    }
  }
}

async function refreshPrices() {
  state.inflight ??= (async () => {
    try {
      const res = await fetch('/api/prices');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.assets) throw new Error('bad payload');
      state.prices = data;
      state.offline = false;
      storage.set(LS_PRICES, data);
    } catch (e) {
      console.warn('prices fetch failed:', e.message);
      state.offline = true;
      if (!state.prices) {
        const cached = storage.get(LS_PRICES);
        if (cached?.assets) state.prices = cached;
      }
    } finally {
      state.lastFetchAt = Date.now();
      state.inflight = null;
    }
    renderStatus();
    state.view?.update();
  })();
  return state.inflight;
}

let pollTimer;
function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (!document.hidden) await refreshPrices();
    schedulePoll();
  }, POLL_MS);
}
document.addEventListener('visibilitychange', async () => {
  if (!document.hidden && Date.now() - state.lastFetchAt >= POLL_MS) {
    await refreshPrices();
    schedulePoll();
  }
});

// ---------- الصفحة الرئيسية ----------

function assetCardHTML(id) {
  const meta = ASSETS[id];
  const a = asset(id);
  const usd = displayUsd(id, a?.price);
  const per = meta.kind === 'metal' ? (id === 'gold' ? 'للجرام عيار 24' : 'للجرام') : `لكل 1 ${meta.symbol}`;
  return `<a class="card asset-card" href="#/asset/${id}">
    ${iconHTML(id)}
    <div class="ac-main">
      <h2 class="ac-name">${meta.name}</h2>
      <p class="ac-price">${a ? moneyHTML(usd) : placeholder()}<span class="per">${per}</span></p>
      <p class="ac-chg">${changeHTML(a?.change24)}<span class="muted">خلال 24 ساعة</span></p>
    </div>
    ${sparkHTML(a?.spark, dirOf(a?.change24))}
    ${a?.stale ? '<span class="badge-stale">غير محدّث</span>' : ''}
  </a>`;
}

function homeHTML() {
  const gold = asset('gold');
  const karats = KARATS.map(
    (k) => `<div class="karat"><span class="karat-k">عيار <span class="num">${k}</span></span><b>${
      gold ? moneyHTML(displayUsd('gold', gold.price, k)) : placeholder()
    }</b></div>`,
  ).join('');
  const nisab = gold ? moneyHTML(usdPerGram(gold.price) * NISAB_GOLD_GRAMS) : '—';
  return `<div class="page-head"><h1 class="page-title">الأسعار الآن</h1></div>
    <div class="cards">${ORDER.map(assetCardHTML).join('')}</div>
    <section class="card karats" aria-labelledby="karats-h">
      <div class="sec-head"><h2 id="karats-h">أسعار الذهب حسب العيار</h2><span class="muted">للجرام</span></div>
      <div class="karat-grid">${karats}</div>
      <p class="note">أسعار خام محسوبة من السعر الفوري لعيار 24، بدون مصنعية أو ضريبة.</p>
    </section>
    <a class="card cta" href="#/zakat">
      <svg class="ic" aria-hidden="true"><use href="#i-calc"/></svg>
      <span class="cta-text"><b>حاسبة الزكاة</b><span class="muted">قيمة نصاب الذهب اليوم (<span class="num">85</span> جرام): ${nisab}</span></span>
      <svg class="ic go" aria-hidden="true"><use href="#i-left"/></svg>
    </a>`;
}

function HomeView() {
  return {
    title: 'ميزان | أسعار الذهب والفضة والبلاتين والعملات الرقمية',
    mount() {
      $view.innerHTML = homeHTML();
      const idle = window.requestIdleCallback ?? ((fn) => setTimeout(fn, 1500));
      idle(() => import('./chart.js').then((m) => m.prefetchChartLib()));
    },
    update() {
      $view.innerHTML = homeHTML();
    },
  };
}

// ---------- صفحة الأصل ----------

function AssetView(id) {
  const meta = ASSETS[id];
  const isMetal = meta.kind === 'metal';
  const calc = state.calc[id];
  const maxDecimals = isMetal ? METAL_DECIMALS : CRYPTO_DECIMALS;
  let chart = null;
  let chartPromise = null;
  let points = null;
  let historyMeta = null;
  let request = 0;
  let destroyed = false;

  const karat = () => (id === 'gold' ? prefs.karat : 24);
  const q = (sel) => $view.querySelector(sel);

  function perLabel() {
    if (!isMetal) return `لكل 1 ${meta.symbol}`;
    return id === 'gold' ? `للجرام عيار ${karat()}` : 'للجرام';
  }

  function quickButtons() {
    if (isMetal) {
      return [
        ['1', 'g', '1 جرام'],
        ['100', 'g', '100 جرام'],
        ['1', 'kg', '1 كيلو'],
      ];
    }
    return meta.quick.map((v) => [v, 'coin', `${v} ${meta.symbol}`]);
  }

  function html() {
    const karatRow =
      id === 'gold'
        ? `<div class="chips karat-row" role="group" aria-label="العيار">${KARATS.map(
            (k) => `<button type="button" class="chip" data-karat="${k}" aria-pressed="${k === karat()}">عيار <span class="num">${k}</span></button>`,
          ).join('')}</div>`
        : '';
    const unitField = isMetal
      ? `<label class="lbl" for="calc-unit">الوحدة</label>
         <select id="calc-unit" class="select" data-unit>${Object.entries(METAL_UNITS)
           .map(([u, { label }]) => `<option value="${u}"${u === calc.unit ? ' selected' : ''}>${label}</option>`)
           .join('')}</select>`
      : `<span class="lbl" id="calc-unit-l">الوحدة</span>
         <div class="unit-static" aria-labelledby="calc-unit-l">${meta.name} <span class="num muted">(${meta.symbol})</span></div>`;
    return `<section aria-labelledby="av-title">
      <div class="av-head">
        <a class="back" href="#/" aria-label="رجوع إلى الرئيسية"><svg class="ic" aria-hidden="true"><use href="#i-right"/></svg></a>
        ${iconHTML(id)}
        <h1 id="av-title">${meta.name}</h1>
        <p class="av-price"><span data-price></span><span class="per" data-per>${perLabel()}</span></p>
        <p class="av-change" data-period-change aria-live="polite"></p>
      </div>
      ${karatRow}
      <div class="layout">
        <div class="card chart-card">
          <div class="ranges" role="group" aria-label="الفترة">${RANGES.map(
            ([r, label]) => `<button type="button" class="chip" data-range="${r}" aria-pressed="${r === prefs.range}">${label}</button>`,
          ).join('')}</div>
          <div class="chart-wrap">
            <div class="chart" data-chart role="img" aria-label="رسم بياني لسعر ${meta.name}"></div>
            <div class="chart-tip" data-tip hidden></div>
            <div class="chart-msg" data-chart-msg hidden></div>
          </div>
          <p class="chart-note" data-chart-note></p>
        </div>
        <div class="card calc-card">
          <h2>احسب القيمة</h2>
          <div class="fields">
            <div>${unitField}</div>
            <div>
              <label class="lbl" for="calc-qty">الكمية</label>
              <div class="qty">
                <button type="button" data-step="1" aria-label="زيادة الكمية">+</button>
                <input id="calc-qty" class="field num" data-qty type="text" inputmode="decimal" autocomplete="off" spellcheck="false" dir="ltr" value="${calc.qty}" aria-describedby="calc-hint">
                <button type="button" data-step="-1" aria-label="إنقاص الكمية">−</button>
              </div>
            </div>
          </div>
          <div class="quick" role="group" aria-label="كميات سريعة">${quickButtons()
            .map(
              ([v, u, label]) =>
                `<button type="button" class="chip" data-quick="${v}" data-quick-unit="${u}"><span class="num">${label.split(' ')[0]}</span> ${label.split(' ').slice(1).join(' ')}</button>`,
            )
            .join('')}</div>
          <p class="hint" id="calc-hint" data-hint></p>
          <div class="total">
            <span class="total-label">القيمة الإجمالية</span>
            <output class="total-value" data-total for="calc-qty calc-unit" aria-live="polite"></output>
          </div>
          <p class="unit-price"><span data-unit-label></span><b data-unit-price></b></p>
        </div>
      </div>
    </section>`;
  }

  function renderPrices() {
    const a = asset(id);
    q('[data-price]').innerHTML = a ? moneyHTML(displayUsd(id, a.price, karat())) : placeholder();
    q('[data-per]').textContent = perLabel();
    renderTotal();
  }

  function renderTotal() {
    const a = asset(id);
    const parsed = parseAmount(calc.qty, maxDecimals);
    const unitUsd = a ? unitPriceUsd(meta.kind, a.price, { unit: calc.unit, karat: karat() }) : null;
    const total = parsed.value != null && unitUsd != null ? unitUsd * parsed.value : null;
    q('[data-total]').innerHTML = total == null ? '<span class="num">—</span>' : moneyHTML(total);
    const unitName = isMetal ? METAL_UNITS[calc.unit].label : meta.symbol;
    q('[data-unit-label]').textContent = `السعر الحالي لكل ${isMetal ? unitName : `1 ${unitName}`}${id === 'gold' ? ` (عيار ${karat()})` : ''}`;
    q('[data-unit-price]').innerHTML = moneyHTML(unitUsd);
  }

  function setQty(text, { fromInput = false } = {}) {
    const parsed = parseAmount(text, maxDecimals);
    calc.qty = parsed.text;
    const input = q('[data-qty]');
    if (!fromInput || input.value !== parsed.text) input.value = parsed.text;
    q('[data-hint]').textContent = parsed.truncated ? `الحد الأقصى ${maxDecimals} خانات عشرية.` : '';
    renderTotal();
  }

  function periodLabel() {
    if (historyMeta?.partial && historyMeta.from) {
      return `منذ ${formatUtc(historyMeta.from + (INTRADAY.has(prefs.range) ? -new Date().getTimezoneOffset() * 60 : 0), INTRADAY.has(prefs.range))}`;
    }
    return RANGES.find((r) => r[0] === prefs.range)[2];
  }

  function showMessage(kind) {
    const el = q('[data-chart-msg]');
    const messages = {
      loading: '<span class="sk">جارٍ تحميل الرسم البياني</span>',
      error: '<div>تعذّر تحميل بيانات الرسم الآن.<br><button type="button" class="btn" data-retry>إعادة المحاولة</button></div>',
      empty: 'لا تتوفر بيانات كافية لهذه الفترة بعد. يجري تجميعها تلقائياً وستظهر تدريجياً.',
    };
    el.hidden = !kind;
    if (kind) el.innerHTML = messages[kind];
  }

  function drawChart() {
    const note = q('[data-chart-note]');
    const change = q('[data-period-change]');
    if (!points || points.length < MIN_CHART_POINTS) {
      chart?.setData([], { isIntraday: true });
      showMessage('empty');
      change.innerHTML = '';
      note.textContent = '';
      return;
    }
    showMessage(null);
    const mapped = points.map(([t, usd]) => [t, inCurrency(displayUsd(id, usd, karat()))]);
    chart.setData(mapped, { isIntraday: INTRADAY.has(prefs.range) });
    change.innerHTML = `${changeHTML(changeRatio(points[0][1], points.at(-1)[1]))}<span class="muted">${periodLabel()}</span>`;
    note.textContent = historyMeta?.partial
      ? 'البيانات المتاحة لهذه الفترة أقصر من مدتها الكاملة لأنها ما زالت تُجمَّع.'
      : `السعر ${perLabel()} بـ${prefs.currency === 'SAR' ? 'الريال السعودي' : 'الدولار الأمريكي'}`;
  }

  function onHover(info) {
    const tip = q('[data-tip]');
    if (!tip) return;
    if (!info) {
      tip.hidden = true;
      return;
    }
    tip.innerHTML = `<b><span class="num">${formatMoney(info.value)}</span> <span class="cur">${curLabel()}</span></b><span class="num">${info.label}</span>`;
    tip.hidden = false;
    const wrap = q('.chart-wrap').clientWidth;
    const w = tip.offsetWidth;
    tip.style.left = `${Math.max(0, Math.min(wrap - w, info.x - w / 2))}px`;
  }

  // وعد واحد حتى لا يُنشأ رسمان إذا تزامن التحميل الأول مع تحديث الأسعار.
  function ensureChart() {
    chartPromise ??= import('./chart.js')
      .then((m) =>
        destroyed
          ? null
          : m.createPriceChart(q('[data-chart]'), {
              formatPrice: (v) => formatNumber(v, Math.abs(v) >= 10000 ? 0 : 2, Math.abs(v) >= 10000 ? 0 : Math.abs(v) < 1 ? 4 : 2),
              onHover,
            }),
      )
      .then((c) => {
        chart = c;
        if (destroyed) c?.destroy();
        return c;
      })
      .catch((e) => {
        chartPromise = null;
        throw e;
      });
    return chartPromise;
  }

  async function loadChart({ quiet = false } = {}) {
    const id0 = ++request;
    const range = prefs.range;
    if (!quiet) showMessage('loading');
    try {
      const [res] = await Promise.all([fetch(`/api/history?asset=${id}&range=${range}`), ensureChart()]);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (destroyed || id0 !== request) return;
      points = data.points;
      historyMeta = { partial: data.partial, from: data.from };
      drawChart();
    } catch (e) {
      console.warn('history failed:', e.message);
      if (destroyed || id0 !== request) return;
      if (!quiet || !points) showMessage('error');
    }
  }

  function onClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.range) {
      prefs.range = t.dataset.range;
      savePrefs();
      for (const b of $view.querySelectorAll('[data-range]')) b.setAttribute('aria-pressed', String(b === t));
      loadChart();
    } else if (t.dataset.karat) {
      prefs.karat = Number(t.dataset.karat);
      savePrefs();
      for (const b of $view.querySelectorAll('[data-karat]')) b.setAttribute('aria-pressed', String(b === t));
      renderPrices();
      if (points) drawChart();
    } else if (t.dataset.quick) {
      if (isMetal) {
        calc.unit = t.dataset.quickUnit;
        q('[data-unit]').value = calc.unit;
      }
      setQty(t.dataset.quick);
    } else if (t.dataset.step) {
      const step = isMetal ? 1 : 0.01;
      const current = parseAmount(calc.qty, maxDecimals).value ?? 0;
      const next = Math.max(0, current + Number(t.dataset.step) * step);
      setQty(formatQuantity(Number(next.toFixed(maxDecimals)), maxDecimals));
    } else if (t.hasAttribute('data-retry')) {
      loadChart();
    }
  }

  function onInput(e) {
    if (e.target.matches('[data-qty]')) setQty(e.target.value, { fromInput: true });
  }

  function onChange(e) {
    if (e.target.matches('[data-unit]')) {
      calc.unit = e.target.value;
      renderTotal();
    }
  }

  return {
    title: `سعر ${meta.name} | ميزان`,
    mount() {
      $view.innerHTML = html();
      $view.addEventListener('click', onClick);
      $view.addEventListener('input', onInput);
      $view.addEventListener('change', onChange);
      renderPrices();
      loadChart();
    },
    update() {
      renderPrices();
      if (LIVE_RANGES.has(prefs.range)) loadChart({ quiet: true });
    },
    refresh() {
      renderPrices();
      if (points) drawChart();
    },
    destroy() {
      destroyed = true;
      $view.removeEventListener('click', onClick);
      $view.removeEventListener('input', onInput);
      $view.removeEventListener('change', onChange);
      chart?.destroy();
    },
  };
}

// ---------- حاسبة الزكاة ----------

function ZakatView() {
  const z = state.zakat;
  const q = (sel) => $view.querySelector(sel);

  function html() {
    const nisabCard = (id, grams, label) => `<article class="card nisab">
      ${iconHTML(id)}
      <h2>نصاب ${label}</h2>
      <p class="nisab-w"><span class="num">${grams}</span> جرام${id === 'gold' ? ' عيار <span class="num">24</span>' : ''}</p>
      <p class="nisab-v"><span class="muted">قيمته الحالية</span><b data-nisab="${id}"></b></p>
    </article>`;
    return `<section aria-labelledby="zk-title">
      <div class="page-head"><h1 class="page-title" id="zk-title">حاسبة الزكاة</h1></div>
      <p class="lead">تجب الزكاة بنسبة <span class="num">2.5%</span> إذا بلغ المال النصاب وحال عليه الحول الهجري. أدخل ما تملكه لمعرفة الزكاة المستحقة بالسعر الحالي.</p>
      <div class="nisab-grid">${nisabCard('gold', NISAB_GOLD_GRAMS, 'الذهب')}${nisabCard('silver', NISAB_SILVER_GRAMS, 'الفضة')}</div>
      <div class="zk-grid">
        <div class="card zk-in">
          <label class="zk-label" for="zk-gold">${iconHTML('gold')}ذهبك بالجرام</label>
          <input id="zk-gold" class="field num" data-zk="gold" type="text" inputmode="decimal" autocomplete="off" dir="ltr" placeholder="أدخل كمية الذهب" value="${z.gold}">
          <div class="chips" role="group" aria-label="عيار ذهبك">${KARATS.map(
            (k) => `<button type="button" class="chip" data-zk-karat="${k}" aria-pressed="${k === z.karat}">عيار <span class="num">${k}</span></button>`,
          ).join('')}</div>
          <p class="zk-status" data-zk-status="gold" aria-live="polite"></p>
        </div>
        <div class="card zk-in">
          <label class="zk-label" for="zk-silver">${iconHTML('silver')}فضتك بالجرام</label>
          <input id="zk-silver" class="field num" data-zk="silver" type="text" inputmode="decimal" autocomplete="off" dir="ltr" placeholder="أدخل كمية الفضة" value="${z.silver}">
          <p class="zk-status" data-zk-status="silver" aria-live="polite"></p>
        </div>
      </div>
      <div class="card zk-result">
        <svg class="ic" aria-hidden="true"><use href="#i-calc"/></svg>
        <div>
          <h2>الزكاة الواجبة (<span class="num">2.5%</span>)</h2>
          <output class="zk-total" data-zk-total aria-live="polite"></output>
          <p class="zk-sub" data-zk-sub></p>
        </div>
      </div>
      <p class="note">يُحسب كل معدن بنصابه منفرداً. الذهب بعيار أقل من 24 يُحوَّل إلى ما يعادله من الذهب الخالص قبل مقارنته بالنصاب، والفضة تُعامل على أنها خالصة. الحاسبة تقديرية، وللحالات الخاصة يُرجع إلى أهل العلم.</p>
    </section>`;
  }

  function render() {
    const gold = asset('gold');
    const silver = asset('silver');
    if (!gold || !silver) {
      for (const el of $view.querySelectorAll('[data-nisab], [data-zk-total]')) el.innerHTML = placeholder();
      return;
    }
    const goldGrams = parseAmount(z.gold, METAL_DECIMALS).value ?? 0;
    const silverGrams = parseAmount(z.silver, METAL_DECIMALS).value ?? 0;
    const r = computeZakat({
      goldGrams,
      goldKarat: z.karat,
      silverGrams,
      goldUsdPerOunce: gold.price,
      silverUsdPerOunce: silver.price,
    });
    q('[data-nisab="gold"]').innerHTML = moneyHTML(r.nisabGoldValue);
    q('[data-nisab="silver"]').innerHTML = moneyHTML(r.nisabSilverValue);

    const goldStatus = q('[data-zk-status="gold"]');
    goldStatus.innerHTML = goldGrams
      ? `${z.karat === 24 ? '' : `يعادل <span class="num">${formatNumber(r.gold.pureGrams, 2)}</span> جرام ذهب خالص · `}قيمته ${moneyHTML(r.gold.value)} · ${
          r.gold.reached
            ? `<span class="ok">بلغ النصاب</span> وزكاته ${moneyHTML(r.gold.due)}`
            : `<span class="no">لم يبلغ النصاب</span> (ينقصه <span class="num">${formatNumber(NISAB_GOLD_GRAMS - r.gold.pureGrams, 2)}</span> جرام خالص)`
        }`
      : '';
    const silverStatus = q('[data-zk-status="silver"]');
    silverStatus.innerHTML = silverGrams
      ? `قيمتها ${moneyHTML(r.silver.value)} · ${
          r.silver.reached
            ? `<span class="ok">بلغت النصاب</span> وزكاتها ${moneyHTML(r.silver.due)}`
            : `<span class="no">لم تبلغ النصاب</span> (ينقصها <span class="num">${formatNumber(NISAB_SILVER_GRAMS - silverGrams, 2)}</span> جرام)`
        }`
      : '';

    q('[data-zk-total]').innerHTML = moneyHTML(r.totalDue);
    q('[data-zk-sub]').textContent =
      !goldGrams && !silverGrams
        ? 'أدخل كمية الذهب أو الفضة لحساب الزكاة.'
        : r.totalDue > 0
          ? 'المبلغ المستحق على ما بلغ النصاب مما أدخلته.'
          : 'لا زكاة على المدخلات الحالية لأنها لم تبلغ النصاب.';
  }

  function onInput(e) {
    const key = e.target.dataset.zk;
    if (!key) return;
    const parsed = parseAmount(e.target.value, METAL_DECIMALS);
    if (e.target.value !== parsed.text) e.target.value = parsed.text;
    z[key] = parsed.text;
    render();
  }

  function onClick(e) {
    const b = e.target.closest('[data-zk-karat]');
    if (!b) return;
    z.karat = Number(b.dataset.zkKarat);
    for (const x of $view.querySelectorAll('[data-zk-karat]')) x.setAttribute('aria-pressed', String(x === b));
    render();
  }

  return {
    title: 'حاسبة الزكاة | ميزان',
    mount() {
      $view.innerHTML = html();
      $view.addEventListener('input', onInput);
      $view.addEventListener('click', onClick);
      render();
    },
    update: render,
    refresh: render,
    destroy() {
      $view.removeEventListener('input', onInput);
      $view.removeEventListener('click', onClick);
    },
  };
}

// ---------- التوجيه ----------

function parseRoute() {
  const [page, arg] = location.hash.replace(/^#\/?/, '').split('/');
  if (page === 'asset' && Object.hasOwn(ASSETS, arg ?? '')) return { page: 'asset', id: arg };
  if (page === 'zakat') return { page: 'zakat' };
  return { page: 'home' };
}

function updateNav(route) {
  for (const a of document.querySelectorAll('[data-nav]')) {
    if (a.dataset.nav === 'asset') a.href = `#/asset/${prefs.lastAsset}`;
    if (a.dataset.nav === route.page) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function render(firstLoad = false) {
  const route = parseRoute();
  state.view?.destroy?.();
  if (route.page === 'asset') {
    prefs.lastAsset = route.id;
    savePrefs();
  }
  state.view = route.page === 'asset' ? AssetView(route.id) : route.page === 'zakat' ? ZakatView() : HomeView();
  state.view.mount();
  document.title = state.view.title;
  updateNav(route);
  if (!firstLoad) {
    window.scrollTo(0, 0);
    $view.focus({ preventScroll: true });
  }
}

function setCurrency(currency) {
  prefs.currency = currency;
  savePrefs();
  for (const b of document.querySelectorAll('[data-currency]')) b.setAttribute('aria-pressed', String(b.dataset.currency === currency));
  (state.view?.refresh ?? state.view?.update)?.call(state.view);
}

for (const b of document.querySelectorAll('[data-currency]')) {
  b.setAttribute('aria-pressed', String(b.dataset.currency === prefs.currency));
  b.addEventListener('click', () => setCurrency(b.dataset.currency));
}

window.addEventListener('hashchange', () => render());

// عرض آخر أسعار محفوظة فوراً (إن وُجدت) ثم جلب الجديد.
const cached = storage.get(LS_PRICES);
if (cached?.assets) state.prices = cached;
render(true);
renderStatus();
refreshPrices().then(schedulePoll);
