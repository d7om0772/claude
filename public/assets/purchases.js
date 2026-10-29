// سجل الشراء: يُحفظ في متصفح المستخدم على جهازه فقط (localStorage)، بلا حسابات ولا خادم.
// عند الإضافة يُسجَّل السعر الفوري الحالي تلقائياً، ثم يُقارن لاحقاً بالسعر الحالي.
import {
  CRYPTO_DECIMALS,
  KARATS,
  METAL_DECIMALS,
  METAL_UNITS,
  USD_TO_SAR,
  changeRatio,
  formatDateTime,
  formatMoney,
  formatQuantity,
  parseAmount,
  unitPriceUsd,
} from './calc.js';

export const PURCHASES_KEY = 'mizan:purchases';
const KINDS = { gold: 'metal', silver: 'metal', platinum: 'metal', bitcoin: 'crypto', ethereum: 'crypto' };
const NOTE_MAX = 120;
const IMPORT_MAX_BYTES = 1_000_000;

// ---------- منطق خالص (بلا DOM، ويُختبر في Node) ----------

export const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const karatOf = (p) => (p.asset === 'gold' ? p.karat : 24);

// سعر الوحدة المختارة بالدولار وقت الشراء (من السعر الفوري المسجّل).
export const purchaseUnitUsd = (p) => unitPriceUsd(KINDS[p.asset], p.spotUsd, { unit: p.unit, karat: karatOf(p) });

// التكلفة: المبلغ المدفوع فعلياً إن أُدخل، وإلا السعر الفوري وقت الشراء × الكمية.
export function purchaseCostUsd(p) {
  if (p.paid) return p.paid.currency === 'SAR' ? p.paid.amount / (p.usdSar || USD_TO_SAR) : p.paid.amount;
  return purchaseUnitUsd(p) * p.qty;
}

export function purchaseValueUsd(p, currentSpotUsd) {
  if (!(currentSpotUsd > 0)) return null;
  return unitPriceUsd(KINDS[p.asset], currentSpotUsd, { unit: p.unit, karat: karatOf(p) }) * p.qty;
}

export function purchaseResult(p, currentSpotUsd) {
  const cost = purchaseCostUsd(p);
  const value = purchaseValueUsd(p, currentSpotUsd);
  return { cost, value, pl: value == null ? null : value - cost, ratio: value == null ? null : changeRatio(cost, value) };
}

// الإجمالي؛ إن غاب سعر أي أصل تكون القيمة الحالية غير معروفة بدل أن تكون ناقصة.
export function summarizePurchases(list, spotOf) {
  let cost = 0;
  let value = 0;
  let complete = true;
  for (const p of list) {
    const r = purchaseResult(p, spotOf(p.asset));
    cost += r.cost;
    if (r.value == null) complete = false;
    else value += r.value;
  }
  if (!complete) return { cost, value: null, pl: null, ratio: null };
  return { cost, value, pl: value - cost, ratio: changeRatio(cost, value) };
}

// تنظيف أي سجل (من التخزين أو من ملف مستورد)؛ يرجع null إن لم يكن صالحاً.
export function normalizePurchase(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const kind = KINDS[raw.asset];
  if (!kind) return null;
  const unit = kind === 'metal' ? (Object.hasOwn(METAL_UNITS, raw.unit) ? raw.unit : null) : 'coin';
  const qty = Number(raw.qty);
  const spotUsd = Number(raw.spotUsd);
  const createdAt = Number(raw.createdAt);
  if (!unit || !(qty > 0) || !(spotUsd > 0) || !(createdAt > 0)) return null;
  const paidAmount = Number(raw.paid?.amount);
  const paid = paidAmount > 0 && ['SAR', 'USD'].includes(raw.paid?.currency) ? { amount: paidAmount, currency: raw.paid.currency } : null;
  return {
    id: typeof raw.id === 'string' && raw.id && raw.id.length <= 40 ? raw.id : newId(),
    asset: raw.asset,
    karat: raw.asset === 'gold' ? (KARATS.includes(Number(raw.karat)) ? Number(raw.karat) : 24) : null,
    qty,
    unit,
    spotUsd,
    usdSar: Number(raw.usdSar) > 0 ? Number(raw.usdSar) : USD_TO_SAR,
    priceAt: Number(raw.priceAt) > 0 ? Number(raw.priceAt) : createdAt,
    createdAt,
    paid,
    note: typeof raw.note === 'string' ? raw.note.trim().slice(0, NOTE_MAX) : '',
  };
}

// دمج سجلات مستوردة مع الموجودة؛ المكرر (نفس المعرّف) يُتجاهل.
export function mergePurchases(existing, incoming) {
  const ids = new Set(existing.map((p) => p.id));
  const list = [...existing];
  let added = 0;
  let skipped = 0;
  for (const raw of incoming) {
    const p = normalizePurchase(raw);
    if (!p || ids.has(p.id)) {
      skipped++;
      continue;
    }
    ids.add(p.id);
    list.push(p);
    added++;
  }
  return { list, added, skipped };
}

export function parseBackup(text) {
  const data = JSON.parse(text);
  const items = Array.isArray(data) ? data : data?.purchases;
  if (!Array.isArray(items)) throw new Error('not a backup');
  return items;
}

// ---------- التخزين ----------

export function loadPurchases() {
  try {
    const raw = JSON.parse(localStorage.getItem(PURCHASES_KEY));
    return Array.isArray(raw) ? raw.map(normalizePurchase).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function savePurchases(list) {
  try {
    localStorage.setItem(PURCHASES_KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

function storageAvailable() {
  try {
    const k = '__mizan_test__';
    localStorage.setItem(k, '1');
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

// العدد مع المعدود: عملية واحدة، عمليتان، 3 عمليات، 11 عملية.
export function countText(n) {
  if (n === 1) return 'عملية واحدة';
  if (n === 2) return 'عمليتان';
  const mod = n % 100;
  return `<span class="num">${n}</span> ${mod >= 3 && mod <= 10 ? 'عمليات' : 'عملية'}`;
}

const escapeHTML = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// ---------- الواجهة ----------

// ctx: أدوات العرض المشتركة من app.js (العملة، الأسعار، تنسيق المبالغ، الأيقونات).
export function createPurchases(ctx) {
  const { ASSETS, ORDER } = ctx;
  let dialog = null;
  let draft = null;

  const decimalsOf = (id) => (KINDS[id] === 'metal' ? METAL_DECIMALS : CRYPTO_DECIMALS);
  const unitName = (p) => (KINDS[p.asset] === 'metal' ? METAL_UNITS[p.unit].label : ASSETS[p.asset].symbol);
  const assetTitle = (p) =>
    `${ASSETS[p.asset].name}${p.asset === 'gold' ? ` <span class="muted">عيار <span class="num">${p.karat}</span></span>` : ''}`;

  function signedMoneyHTML(usd) {
    if (usd == null || !Number.isFinite(usd)) return '<span class="num">—</span>';
    const v = ctx.inCurrency(usd);
    const sign = v > 0.004 ? '+' : v < -0.004 ? '−' : '';
    return `<span class="money"><span class="num">${sign}${formatMoney(Math.abs(v))}</span> <span class="cur">${ctx.curLabel()}</span></span>`;
  }

  const dirOf = (n) => (n == null ? 'flat' : n > 0 ? 'up' : n < 0 ? 'down' : 'flat');

  function toast(html) {
    let el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.append(el);
    }
    el.innerHTML = html;
    el.hidden = false;
    clearTimeout(el._t);
    el._t = setTimeout(() => (el.hidden = true), 5000);
  }

  // ----- نافذة الإضافة والتعديل -----

  function buildDialog() {
    dialog = document.createElement('dialog');
    dialog.className = 'sheet';
    dialog.setAttribute('aria-labelledby', 'pd-title');
    dialog.innerHTML = `<form class="sheet-in" novalidate>
      <div class="sheet-head">
        <h2 id="pd-title"></h2>
        <button type="button" class="icon-btn" data-pd-close aria-label="إغلاق"><svg class="ic" aria-hidden="true"><use href="#i-close"/></svg></button>
      </div>
      <div class="pd-block" data-pd-assets>
        <span class="lbl" id="pd-asset-l">ماذا اشتريت؟</span>
        <div class="pd-assets" role="group" aria-labelledby="pd-asset-l">${ORDER.map(
          (id) => `<button type="button" class="chip pd-asset" data-pd-asset="${id}">${ctx.iconHTML(id, 'pd-ic')}<span>${ASSETS[id].name}</span></button>`,
        ).join('')}</div>
      </div>
      <div class="pd-block" data-pd-karats>
        <span class="lbl" id="pd-karat-l">العيار</span>
        <div class="chips" role="group" aria-labelledby="pd-karat-l">${KARATS.map(
          (k) => `<button type="button" class="chip" data-pd-karat="${k}">عيار <span class="num">${k}</span></button>`,
        ).join('')}</div>
      </div>
      <div class="fields pd-block">
        <div data-pd-unit-wrap>
          <label class="lbl" for="pd-unit">الوحدة</label>
          <select id="pd-unit" class="select" data-pd-unit>${Object.entries(METAL_UNITS)
            .map(([u, { label }]) => `<option value="${u}">${label}</option>`)
            .join('')}</select>
        </div>
        <div data-pd-unit-static hidden>
          <span class="lbl">الوحدة</span>
          <div class="unit-static" data-pd-unit-name></div>
        </div>
        <div>
          <label class="lbl" for="pd-qty">الكمية</label>
          <input id="pd-qty" class="field num" data-pd-qty type="text" inputmode="decimal" autocomplete="off" spellcheck="false" dir="ltr" placeholder="0">
        </div>
      </div>
      <div class="pd-price" data-pd-price aria-live="polite"></div>
      <div class="pd-block">
        <label class="lbl" for="pd-paid">المبلغ الذي دفعته فعلياً <span class="muted">(اختياري، بـ<span data-pd-cur></span>)</span></label>
        <input id="pd-paid" class="field num" data-pd-paid type="text" inputmode="decimal" autocomplete="off" dir="ltr" placeholder="0.00" aria-describedby="pd-paid-help">
        <p class="field-help" id="pd-paid-help">إن أدخلته يُحسب الربح والخسارة على أساسه بدلاً من السعر الفوري، مثلاً إذا دفعت مصنعية أو ضريبة.</p>
      </div>
      <div class="pd-block">
        <label class="lbl" for="pd-note">ملاحظة <span class="muted">(اختياري)</span></label>
        <input id="pd-note" class="field field-text" data-pd-note type="text" maxlength="${NOTE_MAX}" autocomplete="off" placeholder="مثل: سبيكة من محل…">
      </div>
      <p class="hint" data-pd-error role="alert"></p>
      <div class="sheet-actions">
        <button type="submit" class="btn-primary" data-pd-save>حفظ</button>
        <button type="button" class="btn-ghost" data-pd-close>إلغاء</button>
      </div>
    </form>`;
    document.body.append(dialog);

    const q = (sel) => dialog.querySelector(sel);
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog || e.target.closest('[data-pd-close]')) return dialog.close();
      const assetBtn = e.target.closest('[data-pd-asset]');
      if (assetBtn && draft.mode === 'add') {
        const id = assetBtn.dataset.pdAsset;
        if (KINDS[id] !== KINDS[draft.asset]) draft.unit = KINDS[id] === 'metal' ? 'g' : 'coin';
        draft.asset = id;
        draft.qty = parseAmount(draft.qty, decimalsOf(id)).text;
        syncDialog();
        q('[data-pd-qty]').focus();
      }
      const karatBtn = e.target.closest('[data-pd-karat]');
      if (karatBtn) {
        draft.karat = Number(karatBtn.dataset.pdKarat);
        syncDialog();
      }
    });
    dialog.addEventListener('input', (e) => {
      if (e.target.matches('[data-pd-qty]')) {
        const parsed = parseAmount(e.target.value, decimalsOf(draft.asset));
        if (e.target.value !== parsed.text) e.target.value = parsed.text;
        draft.qty = parsed.text;
        renderPrice();
      } else if (e.target.matches('[data-pd-paid]')) {
        const parsed = parseAmount(e.target.value, 2);
        if (e.target.value !== parsed.text) e.target.value = parsed.text;
        draft.paid = parsed.text;
      } else if (e.target.matches('[data-pd-note]')) {
        draft.note = e.target.value;
      }
    });
    dialog.addEventListener('change', (e) => {
      if (e.target.matches('[data-pd-unit]')) {
        draft.unit = e.target.value;
        renderPrice();
      }
    });
    q('form').addEventListener('submit', (e) => {
      e.preventDefault();
      save();
    });
  }

  // سعر الوحدة بالدولار للمسودة: السعر الحالي عند الإضافة، والمسجّل عند التعديل.
  function draftSpot() {
    if (draft.mode === 'edit') return { spot: draft.entry.spotUsd, at: draft.entry.createdAt, stale: false };
    const a = ctx.asset(draft.asset);
    return a ? { spot: a.price, at: a.updatedAt, stale: Boolean(a.stale || ctx.offline()) } : null;
  }

  function renderPrice() {
    const box = dialog.querySelector('[data-pd-price]');
    const info = draftSpot();
    const saveBtn = dialog.querySelector('[data-pd-save]');
    if (!info) {
      box.innerHTML = '<p class="warn">لا يتوفر سعر حالياً، لذا لا يمكن التسجيل الآن. حاول بعد قليل.</p>';
      saveBtn.disabled = true;
      return;
    }
    saveBtn.disabled = false;
    const p = { asset: draft.asset, karat: draft.karat, unit: draft.unit, spotUsd: info.spot, qty: 1 };
    const unitUsd = purchaseUnitUsd(p);
    const qty = parseAmount(draft.qty, decimalsOf(draft.asset)).value;
    const label = draft.mode === 'edit' ? 'السعر المسجّل وقت الشراء' : 'السعر الآن، ويُسجَّل تلقائياً عند الحفظ';
    box.innerHTML = `<div class="pd-row"><span>${label}</span><b>${ctx.moneyHTML(unitUsd)}</b></div>
      <div class="pd-row muted"><span>لكل ${KINDS[draft.asset] === 'metal' ? METAL_UNITS[draft.unit].label : `1 ${ASSETS[draft.asset].symbol}`}${
        draft.asset === 'gold' ? ` عيار <span class="num">${draft.karat}</span>` : ''
      }</span><span class="num">${formatDateTime(info.at)}</span></div>
      <div class="pd-row pd-total"><span>القيمة بهذا السعر</span><b>${qty > 0 ? ctx.moneyHTML(unitUsd * qty) : '<span class="num">—</span>'}</b></div>
      ${info.stale ? '<p class="warn">تنبيه: السعر الحالي غير محدّث، وسيُسجَّل آخر سعر محفوظ.</p>' : ''}`;
  }

  function syncDialog() {
    const q = (sel) => dialog.querySelector(sel);
    const isMetal = KINDS[draft.asset] === 'metal';
    q('#pd-title').innerHTML = draft.mode === 'edit' ? `تعديل شراء ${ASSETS[draft.asset].name}` : 'تسجيل عملية شراء';
    q('[data-pd-assets]').hidden = draft.mode === 'edit';
    for (const b of dialog.querySelectorAll('[data-pd-asset]')) b.setAttribute('aria-pressed', String(b.dataset.pdAsset === draft.asset));
    q('[data-pd-karats]').hidden = draft.asset !== 'gold';
    for (const b of dialog.querySelectorAll('[data-pd-karat]')) b.setAttribute('aria-pressed', String(Number(b.dataset.pdKarat) === draft.karat));
    q('[data-pd-unit-wrap]').hidden = !isMetal;
    q('[data-pd-unit-static]').hidden = isMetal;
    q('[data-pd-unit-name]').innerHTML = isMetal ? '' : `${ASSETS[draft.asset].name} <span class="num muted">(${ASSETS[draft.asset].symbol})</span>`;
    if (isMetal) q('[data-pd-unit]').value = draft.unit;
    q('[data-pd-qty]').value = draft.qty;
    q('[data-pd-paid]').value = draft.paid;
    q('[data-pd-note]').value = draft.note;
    q('[data-pd-cur]').textContent = ctx.currency() === 'SAR' ? 'الريال' : 'الدولار';
    q('[data-pd-error]').textContent = '';
    renderPrice();
  }

  function openDialog(opts = {}) {
    if (!dialog) buildDialog();
    if (opts.mode === 'edit') {
      const entry = loadPurchases().find((p) => p.id === opts.id);
      if (!entry) return;
      const paidUsd = entry.paid ? purchaseCostUsd(entry) : null;
      draft = {
        mode: 'edit',
        entry,
        asset: entry.asset,
        karat: entry.karat ?? 24,
        unit: entry.unit,
        qty: formatQuantity(entry.qty, decimalsOf(entry.asset)),
        paid: paidUsd == null ? '' : ctx.inCurrency(paidUsd).toFixed(2),
        note: entry.note,
      };
    } else {
      const asset = Object.hasOwn(ASSETS, opts.asset ?? '') ? opts.asset : ctx.lastAsset();
      const isMetal = KINDS[asset] === 'metal';
      draft = {
        mode: 'add',
        asset,
        karat: KARATS.includes(opts.karat) ? opts.karat : ctx.karat(),
        unit: isMetal ? (Object.hasOwn(METAL_UNITS, opts.unit ?? '') ? opts.unit : 'g') : 'coin',
        qty: opts.qty ?? '',
        paid: '',
        note: '',
      };
    }
    syncDialog();
    dialog.showModal();
    dialog.querySelector('[data-pd-qty]').focus();
  }

  function save() {
    const err = dialog.querySelector('[data-pd-error]');
    const qty = parseAmount(draft.qty, decimalsOf(draft.asset)).value;
    if (!(qty > 0)) {
      err.textContent = 'أدخل كمية أكبر من صفر.';
      dialog.querySelector('[data-pd-qty]').focus();
      return;
    }
    const paidText = String(draft.paid ?? '').trim();
    const paidValue = parseAmount(paidText, 2).value;
    if (paidText && !(paidValue > 0)) {
      err.textContent = 'المبلغ المدفوع يجب أن يكون أكبر من صفر، أو اتركه فارغاً.';
      return;
    }
    const paid = paidValue > 0 ? { amount: paidValue, currency: ctx.currency() } : null;
    const common = {
      karat: draft.asset === 'gold' ? draft.karat : null,
      qty,
      unit: KINDS[draft.asset] === 'metal' ? draft.unit : 'coin',
      paid,
      note: draft.note.trim().slice(0, NOTE_MAX),
    };

    const list = loadPurchases();
    let entry;
    if (draft.mode === 'edit') {
      const i = list.findIndex((p) => p.id === draft.entry.id);
      if (i === -1) return dialog.close();
      entry = normalizePurchase({ ...list[i], ...common, usdSar: ctx.rate() });
      list[i] = entry;
    } else {
      const a = ctx.asset(draft.asset);
      if (!a) {
        err.textContent = 'لا يتوفر سعر حالياً، حاول بعد قليل.';
        return;
      }
      const now = Date.now();
      entry = normalizePurchase({
        id: newId(),
        asset: draft.asset,
        ...common,
        spotUsd: a.price,
        usdSar: ctx.rate(),
        priceAt: a.updatedAt ?? now,
        createdAt: now,
      });
      list.push(entry);
    }
    if (!savePurchases(list)) {
      err.textContent = 'تعذّر الحفظ لأن التخزين غير متاح في هذا المتصفح (قد يكون وضع التصفح الخاص).';
      return;
    }
    dialog.close();
    ctx.onSaved();
    if (draft.mode === 'add' && !ctx.onPurchasesPage()) {
      toast(`تم تسجيل شراء ${ASSETS[entry.asset].name}. <a href="#/purchases">عرض سجل الشراء</a>`);
    }
  }

  // ----- صفحة السجل -----

  function PurchasesView() {
    let pendingDelete = null;
    let pendingTimer = null;
    let backupMsg = '';
    const available = storageAvailable();
    const $view = ctx.view;

    function entryHTML(p) {
      const r = purchaseResult(p, ctx.asset(p.asset)?.price);
      const dir = dirOf(r.pl);
      return `<article class="card pc">
        <div class="pc-head">
          ${ctx.iconHTML(p.asset)}
          <div class="pc-title">
            <h2>${assetTitle(p)}</h2>
            <p class="pc-date"><span class="num">${formatDateTime(p.createdAt)}</span></p>
          </div>
          <div class="pc-pl chg ${dir}">${signedMoneyHTML(r.pl)}<span class="pc-ratio">${ctx.changeHTML(r.ratio)}</span></div>
        </div>
        <dl class="pc-grid">
          <div><dt>الكمية</dt><dd><span class="num">${formatQuantity(p.qty, decimalsOf(p.asset))}</span> ${unitName(p)}</dd></div>
          <div><dt>سعر الشراء</dt><dd>${ctx.moneyHTML(purchaseUnitUsd(p))} <span class="per">لكل ${KINDS[p.asset] === 'metal' ? unitName(p) : `1 ${unitName(p)}`}</span></dd></div>
          <div><dt>${p.paid ? 'المبلغ المدفوع' : 'تكلفة الشراء'}</dt><dd>${ctx.moneyHTML(r.cost)}</dd></div>
          <div><dt>القيمة الآن</dt><dd>${r.value == null ? ctx.placeholder() : ctx.moneyHTML(r.value)}</dd></div>
        </dl>
        ${p.note ? `<p class="pc-note">${escapeHTML(p.note)}</p>` : ''}
        <div class="pc-actions">
          <button type="button" class="btn-link" data-edit="${p.id}">تعديل</button>
          <button type="button" class="btn-link danger" data-del="${p.id}">${pendingDelete === p.id ? 'اضغط مرة أخرى للتأكيد' : 'حذف'}</button>
        </div>
      </article>`;
    }

    function html() {
      const list = loadPurchases().sort((a, b) => b.createdAt - a.createdAt);
      const sum = summarizePurchases(list, (id) => ctx.asset(id)?.price);
      const summary = list.length
        ? `<section class="card pc-summary" aria-label="ملخص المشتريات">
            <div><span class="muted">إجمالي تكلفة الشراء</span><b>${ctx.moneyHTML(sum.cost)}</b></div>
            <div><span class="muted">القيمة الآن</span><b>${sum.value == null ? ctx.placeholder() : ctx.moneyHTML(sum.value)}</b></div>
            <div><span class="muted">الربح أو الخسارة</span><b class="chg ${dirOf(sum.pl)}">${signedMoneyHTML(sum.pl)}</b><span>${ctx.changeHTML(sum.ratio)}</span></div>
          </section>`
        : '';
      const body = list.length
        ? `<div class="pc-list">${list.map(entryHTML).join('')}</div>`
        : `<div class="card pc-empty">
            <svg class="ic" aria-hidden="true"><use href="#i-list"/></svg>
            <p>لا توجد عمليات شراء مسجّلة بعد.</p>
            <button type="button" class="btn-primary" data-add><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg>سجّل أول عملية شراء</button>
          </div>`;
      return `<section aria-labelledby="pc-title-h">
        <div class="page-head">
          <h1 class="page-title" id="pc-title-h">سجل الشراء</h1>
          <button type="button" class="add-btn" data-add aria-label="إضافة عملية شراء"><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg><span>إضافة شراء</span></button>
        </div>
        <p class="lead">اضغط زر الإضافة عند كل عملية شراء، فيُسجَّل سعرها تلقائياً. ارجع إلى هنا لاحقاً لتعرف بكم اشتريت وكم تساوي الآن.</p>
        ${available ? '' : '<p class="banner">التخزين غير متاح في هذا المتصفح (قد يكون وضع التصفح الخاص)، لذا لن يُحفظ السجل.</p>'}
        ${summary}
        ${body}
        <section class="card pc-backup" aria-labelledby="pc-backup-h">
          <h2 id="pc-backup-h">النسخة الاحتياطية</h2>
          <p class="muted">السجل محفوظ في متصفحك على هذا الجهاز فقط، ولا يُرسل إلى أي خادم. إذا مسحت بيانات المتصفح أو غيّرت جهازك يضيع، فصدّر نسخة احتياطية واحتفظ بها، ثم استوردها على الجهاز الجديد.</p>
          <div class="pc-backup-actions">
            <button type="button" class="btn" data-export${list.length ? '' : ' disabled'}>تصدير نسخة احتياطية</button>
            <button type="button" class="btn" data-import>استيراد نسخة</button>
            <input type="file" accept="application/json,.json" data-import-file hidden>
          </div>
          <p class="field-help" data-backup-msg role="status">${backupMsg}</p>
        </section>
      </section>`;
    }

    const render = () => {
      $view.innerHTML = html();
    };

    function exportBackup() {
      const list = loadPurchases();
      const blob = new Blob([JSON.stringify({ app: 'mizan', version: 1, exportedAt: new Date().toISOString(), purchases: list }, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mizan-purchases-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    async function importBackup(file) {
      try {
        if (file.size > IMPORT_MAX_BYTES) throw new Error('too large');
        const { list, added, skipped } = mergePurchases(loadPurchases(), parseBackup(await file.text()));
        if (added && !savePurchases(list)) throw new Error('save failed');
        backupMsg = added
          ? `تم استيراد ${countText(added)}${skipped ? `، وتُجوهل ${countText(skipped)} (مكررة أو غير صالحة)` : ''}.`
          : 'لا توجد عمليات جديدة في الملف؛ كل ما فيه موجود مسبقاً أو غير صالح.';
      } catch {
        backupMsg = 'تعذّر استيراد الملف. تأكد أنه نسخة احتياطية صدّرتها من ميزان.';
      }
      render();
    }

    function onClick(e) {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.hasAttribute('data-add')) openDialog({ mode: 'add' });
      else if (t.dataset.edit) openDialog({ mode: 'edit', id: t.dataset.edit });
      else if (t.dataset.del) {
        clearTimeout(pendingTimer);
        if (pendingDelete === t.dataset.del) {
          savePurchases(loadPurchases().filter((p) => p.id !== t.dataset.del));
          pendingDelete = null;
        } else {
          pendingDelete = t.dataset.del;
          pendingTimer = setTimeout(() => {
            pendingDelete = null;
            render();
          }, 4000);
        }
        render();
        $view.querySelector(`[data-del="${pendingDelete}"]`)?.focus();
      } else if (t.hasAttribute('data-export')) exportBackup();
      else if (t.hasAttribute('data-import')) $view.querySelector('[data-import-file]').click();
    }

    function onChange(e) {
      if (e.target.matches('[data-import-file]') && e.target.files[0]) importBackup(e.target.files[0]);
    }

    return {
      title: 'سجل الشراء | ميزان',
      mount() {
        render();
        $view.addEventListener('click', onClick);
        $view.addEventListener('change', onChange);
      },
      update: render,
      refresh: render,
      destroy() {
        clearTimeout(pendingTimer);
        $view.removeEventListener('click', onClick);
        $view.removeEventListener('change', onChange);
      },
    };
  }

  return {
    PurchasesView,
    openDialog,
    // تحديث معاينة السعر إذا كانت النافذة مفتوحة أثناء وصول أسعار جديدة.
    refreshDialog() {
      if (dialog?.open && draft) renderPrice();
    },
    summary: () => {
      const list = loadPurchases();
      return list.length ? { count: list.length, ...summarizePurchases(list, (id) => ctx.asset(id)?.price) } : null;
    },
    signedMoneyHTML,
    countText,
  };
}
