/*
 * مستخرج الفريمات — استخراج فريمات الفيديو داخل المتصفح، تحديدها، وتصديرها.
 * كل المعالجة محلية: <video> + seek + canvas. لا يُرفع أي ملف إلى خادم.
 */
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);

const COMMON_FPS = [23.976, 24, 25, 29.97, 30, 48, 50, 59.94, 60, 120];

const video = $('#video');
const workCanvas = $('#workCanvas');
const grid = $('#grid');

const state = {
  file: null,
  objectUrl: null,
  duration: 0,
  natW: 0,
  natH: 0,
  fps: null,          // معدل الفيديو المكتشف (قد يكون null)
  frames: [],         // {index, time, url, blob}
  selected: new Set(),
  middleIndex: -1,
  busy: false,
  cancel: false,
  lastClicked: null,
  lbIndex: -1,
};

/* ---------- أدوات مساعدة ---------- */

function fmtTime(t) {
  const total = Math.max(0, t);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = Math.floor(total % 60);
  const ms = Math.round((total - Math.floor(total)) * 1000);
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return (h > 0 ? p(h) + ':' : '') + p(m) + ':' + p(s) + '.' + p(ms, 3);
}

const fileSafe = (s) => s.replace(/[^\w؀-ۿ.-]+/g, '_').replace(/_+/g, '_');

function bytes(n) {
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

let toastTimer = null;
function toast(msg, ms = 2600) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

function once(target, type, timeoutMs = 0) {
  return new Promise((resolve, reject) => {
    let timer = null;
    const ok = (e) => { cleanup(); resolve(e); };
    const bad = () => { cleanup(); reject(new Error('تعذّر تحميل/قراءة الفيديو')); };
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      target.removeEventListener(type, ok);
      target.removeEventListener('error', bad);
    };
    target.addEventListener(type, ok, { once: true });
    target.addEventListener('error', bad, { once: true });
    if (timeoutMs) timer = setTimeout(() => { cleanup(); reject(new Error('انتهت المهلة')); }, timeoutMs);
  });
}

/* الوصول إلى عنصر الفيديو متسلسل حتى لا تتداخل عمليات الـ seek */
let chain = Promise.resolve();
function lock(fn) {
  const run = chain.then(fn, fn);
  chain = run.then(() => {}, () => {});
  return run;
}

function seekTo(t) {
  const target = Math.max(0, Math.min(t, Math.max(0, state.duration - 0.001)));
  if (Math.abs(video.currentTime - target) < 1e-4 && video.readyState >= 2) return waitForFrame();
  const p = once(video, 'seeked', 8000).then(waitForFrame);
  video.currentTime = target;
  return p;
}

/* ضمان أن الفريم أصبح جاهزًا للرسم بعد الـ seek */
function waitForFrame() {
  return new Promise((resolve) => {
    if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
      let done = false;
      const finish = () => { if (!done) { done = true; resolve(); } };
      video.requestVideoFrameCallback(finish);
      setTimeout(finish, 120); // احتياط: بعض المتصفحات لا تستدعي rVFC أثناء الإيقاف
    } else {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    }
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, quality));
}

function drawFrame(targetW) {
  const w = Math.max(1, Math.round(targetW));
  const h = Math.max(1, Math.round(w * state.natH / state.natW));
  workCanvas.width = w;
  workCanvas.height = h;
  const ctx = workCanvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(video, 0, 0, w, h);
  return { w, h };
}

/* ---------- تحميل الملف ---------- */

async function loadFile(file) {
  const looksVideo = file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|ogv|ogg|mkv|avi)$/i.test(file.name);
  if (!looksVideo) { showError('الملف المختار ليس فيديو.'); return; }

  resetAll();
  showError('');
  state.file = file;
  state.objectUrl = URL.createObjectURL(file);
  video.src = state.objectUrl;

  try {
    await once(video, 'loadedmetadata', 30000);
  } catch (e) {
    showError('تعذّر قراءة هذا الفيديو. المتصفح قد لا يدعم ترميزه (جرّب MP4/H.264 أو WebM).');
    return;
  }

  state.duration = Number.isFinite(video.duration) ? video.duration : 0;
  state.natW = video.videoWidth;
  state.natH = video.videoHeight;

  if (!state.duration || !state.natW) {
    showError('لم يتمكن المتصفح من تحديد مدة/أبعاد هذا الملف.');
    return;
  }

  $('#setupPanel').hidden = false;
  renderStats('جارٍ قياس معدل الفريمات…');

  state.fps = await detectFps();
  renderStats();

  const suggested = state.fps ? Math.min(state.fps, 15) : 10;
  $('#optRate').value = String(Math.round(suggested * 100) / 100);
  $('#rateHint').textContent = state.fps
    ? `معدل الفيديو ≈ ${state.fps.toFixed(3)} ف/ث — اضغط «كل الفريمات» لاستخدامه`
    : 'تعذّر اكتشاف معدل الفيديو تلقائيًا — حدّده يدويًا';
  updatePlan();
  $('#setupPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function showError(msg) {
  const el = $('#loadError');
  el.textContent = msg;
  el.hidden = !msg;
}

function renderStats(fpsOverride) {
  const fpsText = fpsOverride || (state.fps ? state.fps.toFixed(3) + ' ف/ث' : 'غير معروف');
  const items = [
    ['اسم الملف', state.file.name],
    ['الحجم', bytes(state.file.size)],
    ['المدة', fmtTime(state.duration)],
    ['الأبعاد', `${state.natW}×${state.natH}`],
    ['معدل الفريمات', fpsText],
    ['منتصف المقطع', fmtTime(state.duration / 2)],
  ];
  $('#stats').innerHTML = items
    .map(([k, v]) => `<div class="stat"><b title="${escapeHtml(String(v))}">${escapeHtml(String(v))}</b><span>${k}</span></div>`)
    .join('');
}

const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* قياس معدل الفريمات عبر تشغيل لحظي ومراقبة mediaTime */
function detectFps() {
  if (!('requestVideoFrameCallback' in HTMLVideoElement.prototype)) return Promise.resolve(null);

  return new Promise((resolve) => {
    const deltas = [];
    let last = null, done = false;

    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { video.pause(); } catch (e) {}
      video.currentTime = 0;
      resolve(snapFps(estimate()));
    };

    const estimate = () => {
      if (deltas.length < 4) return null;
      const sorted = deltas.slice().sort((a, b) => a - b);
      const med = sorted[Math.floor(sorted.length / 2)];
      return med > 0 ? 1 / med : null;
    };

    const cb = (_now, meta) => {
      if (done) return;
      if (last !== null) {
        const d = meta.mediaTime - last;
        if (d > 0.0005 && d < 0.5) deltas.push(d);
      }
      last = meta.mediaTime;
      if (deltas.length >= 24) { finish(); return; }
      video.requestVideoFrameCallback(cb);
    };

    const timer = setTimeout(finish, 2600);
    video.muted = true;
    video.currentTime = 0;
    video.requestVideoFrameCallback(cb);
    const p = video.play();
    if (p && p.catch) p.catch(() => finish());
  });
}

function snapFps(fps) {
  if (!fps || !Number.isFinite(fps)) return null;
  for (const c of COMMON_FPS) {
    if (Math.abs(fps - c) / c < 0.035) return c;
  }
  return Math.round(fps * 1000) / 1000;
}

/* ---------- التخطيط قبل الاستخراج ---------- */

function planFrames() {
  const rate = Math.max(0.05, Number($('#optRate').value) || 1);
  const max = Math.max(10, Math.floor(Number($('#optMax').value) || 1200));
  const step = 1 / rate;
  let count = Math.max(1, Math.floor(state.duration / step) + 1);
  const capped = count > max;
  if (capped) count = max;
  const effStep = capped ? state.duration / count : step;
  return { rate, max, step: effStep, count, capped };
}

function updatePlan() {
  const p = planFrames();
  const note = $('#planNote');
  const est = fmtTime(p.step);
  if (p.capped) {
    note.className = 'alert warn';
    note.innerHTML = `سيتم استخراج <b>${p.count}</b> فريم فقط (بلغنا الحد الأقصى) — بمسافة ${est} بين كل فريم. ارفع الحد الأقصى لاستخراج عدد أكبر.`;
  } else {
    note.className = 'alert info';
    note.innerHTML = `سيتم استخراج <b>${p.count}</b> فريم — كل ${est} تقريبًا. فريم المنتصف سيكون معلّمًا باللون الذهبي.`;
  }
}

/* ---------- الاستخراج ---------- */

async function extract() {
  if (state.busy) return;
  const plan = planFrames();
  clearFrames();

  const thumbW = Number($('#optThumb').value) || 200;
  document.documentElement.style.setProperty('--cell', thumbW + 'px');
  document.documentElement.style.setProperty('--ar', `${state.natW} / ${state.natH}`);

  const times = [];
  for (let i = 0; i < plan.count; i++) times.push(Math.min(i * plan.step, Math.max(0, state.duration - 0.001)));

  // فريم المنتصف = الأقرب زمنيًا إلى منتصف المدة
  const mid = state.duration / 2;
  let best = 0, bestDiff = Infinity;
  times.forEach((t, i) => { const d = Math.abs(t - mid); if (d < bestDiff) { bestDiff = d; best = i; } });
  state.middleIndex = best;

  state.busy = true;
  state.cancel = false;
  $('#progressPanel').hidden = false;
  $('#toolbar').hidden = false;
  $('#gridWrap').hidden = false;
  $('#btnExtract').disabled = true;
  $('#btnAllFrames').disabled = true;

  const started = performance.now();

  try {
    await lock(async () => {
      try { video.pause(); } catch (e) {}
      for (let i = 0; i < times.length; i++) {
        if (state.cancel) break;
        await seekTo(times[i]);
        const dims = drawFrame(thumbW);
        const blob = await canvasToBlob(workCanvas, 'image/jpeg', 0.82);
        if (!blob) continue;
        const frame = { index: i, time: video.currentTime, url: URL.createObjectURL(blob), w: dims.w, h: dims.h };
        state.frames.push(frame);
        appendCard(frame);

        const pct = ((i + 1) / times.length) * 100;
        $('#progressBar').style.width = pct.toFixed(1) + '%';
        const elapsed = (performance.now() - started) / 1000;
        const eta = elapsed / (i + 1) * (times.length - i - 1);
        setProgressText(`استخراج ${i + 1} / ${times.length} — متبقٍ ~${Math.ceil(eta)} ثانية`);
      }
    });
  } catch (err) {
    toast('توقّف الاستخراج: ' + err.message);
  }

  state.busy = false;
  $('#btnExtract').disabled = false;
  $('#btnAllFrames').disabled = false;
  $('#progressPanel').hidden = true;
  $('#progressBar').style.width = '0%';

  if (state.frames.length) {
    // اختيار افتراضي: فريم المنتصف
    if (state.frames[state.middleIndex]) {
      state.selected.add(state.middleIndex);
      syncCard(state.middleIndex);
    }
    refreshSelectionUi();
    toast(`تم استخراج ${state.frames.length} فريم — المنتصف محدد تلقائيًا`);
  }
}

function setProgressText(t) { $('#progressText').textContent = t; }

function clearFrames() {
  state.frames.forEach((f) => URL.revokeObjectURL(f.url));
  state.frames = [];
  state.selected.clear();
  state.lastClicked = null;
  grid.innerHTML = '';
  refreshSelectionUi();
}

function resetAll() {
  state.cancel = true;
  clearFrames();
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
  state.objectUrl = null;
  state.fps = null;
  state.middleIndex = -1;
  $('#toolbar').hidden = true;
  $('#gridWrap').hidden = true;
  $('#progressPanel').hidden = true;
}

/* ---------- عرض البطاقات ---------- */

function appendCard(frame) {
  const isMid = frame.index === state.middleIndex;
  if (isMid) {
    const div = document.createElement('div');
    div.className = 'mid-divider';
    div.id = 'midDivider';
    div.innerHTML = `<span>⏺ منتصف المقطع — ${fmtTime(state.duration / 2)}</span>`;
    grid.appendChild(div);
  }

  const card = document.createElement('figure');
  card.className = 'card' + (isMid ? ' mid' : '');
  card.dataset.i = String(frame.index);
  card.setAttribute('role', 'button');
  card.setAttribute('aria-pressed', 'false');
  card.innerHTML = `
    <div class="thumb">
      <img src="${frame.url}" alt="فريم رقم ${frame.index} عند ${fmtTime(frame.time)}" loading="lazy" decoding="async">
      <span class="badge-idx">#${frame.index}</span>
      <button class="zoom" type="button" title="تكبير" aria-label="تكبير الفريم">⤢</button>
      ${isMid ? '<span class="ribbon">⏺ فريم المنتصف</span>' : ''}
    </div>
    <figcaption>
      <span class="t">${fmtTime(frame.time)}</span>
      <span class="check" aria-hidden="true"></span>
    </figcaption>`;
  grid.appendChild(card);
}

const cardEl = (i) => grid.querySelector(`.card[data-i="${i}"]`);

function syncCard(i) {
  const el = cardEl(i);
  if (!el) return;
  const on = state.selected.has(i);
  el.classList.toggle('sel', on);
  el.setAttribute('aria-pressed', on ? 'true' : 'false');
}

function toggle(i, forceValue) {
  const on = forceValue === undefined ? !state.selected.has(i) : forceValue;
  if (on) state.selected.add(i); else state.selected.delete(i);
  syncCard(i);
}

function refreshSelectionUi() {
  const n = state.selected.size;
  $('#selCounter').textContent = n ? `${n} محدد` : 'لا يوجد تحديد';
  $('#btnExport').disabled = n === 0;
  drawTimeline();
}

/* ---------- الخط الزمني ---------- */

let tlPending = false;
function drawTimeline() {
  if (tlPending) return;
  tlPending = true;
  requestAnimationFrame(() => {
    tlPending = false;
    const c = $('#timeline');
    if (!c.clientWidth) return;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(c.clientWidth * dpr);
    c.height = Math.round(34 * dpr);
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    const W = c.clientWidth, H = 34;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1b222c';
    ctx.fillRect(0, 0, W, H);

    // كل الفريمات
    ctx.fillStyle = '#2f3947';
    state.frames.forEach((f) => {
      const x = (f.time / state.duration) * (W - 2);
      ctx.fillRect(x, 10, 1, H - 20);
    });

    // المحددة
    ctx.fillStyle = '#3b82f6';
    state.selected.forEach((i) => {
      const f = state.frames[i];
      if (!f) return;
      const x = (f.time / state.duration) * (W - 2);
      ctx.fillRect(x, 5, 2, H - 10);
    });

    // علامة المنتصف
    const xm = 0.5 * (W - 2);
    ctx.fillStyle = '#f5b301';
    ctx.fillRect(xm - 1, 0, 3, H);
    ctx.beginPath();
    ctx.moveTo(xm - 5, 0); ctx.lineTo(xm + 5, 0); ctx.lineTo(xm, 7);
    ctx.closePath(); ctx.fill();
  });
}
window.addEventListener('resize', drawTimeline);

/* ---------- التصدير ---------- */

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

function frameName(f, ext) {
  const mid = f.index === state.middleIndex ? '_MID' : '';
  return `frame_${String(f.index).padStart(5, '0')}_${fmtTime(f.time).replace(/[:.]/g, '-')}${mid}.${ext}`;
}

function download(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function exportSelected() {
  if (state.busy) return;
  const idxs = [...state.selected].sort((a, b) => a - b);
  if (!idxs.length) { toast('ما فيه فريمات محددة'); return; }

  const type = $('#optFormat').value;
  const quality = Number($('#optQuality').value) / 100;
  const ext = EXT[type] || 'png';
  const fullRes = $('#optSize').value === 'full';
  const targetW = fullRes ? state.natW : (Number($('#optThumb').value) || 200);

  state.busy = true;
  state.cancel = false;
  $('#progressPanel').hidden = false;
  $('#btnExport').disabled = true;

  const outputs = [];
  try {
    await lock(async () => {
      for (let n = 0; n < idxs.length; n++) {
        if (state.cancel) break;
        const f = state.frames[idxs[n]];
        await seekTo(f.time);
        drawFrame(targetW);
        const blob = await canvasToBlob(workCanvas, type, quality);
        if (blob) outputs.push({ frame: f, blob, name: frameName(f, ext) });
        $('#progressBar').style.width = ((n + 1) / idxs.length * 100).toFixed(1) + '%';
        setProgressText(`تجهيز الصور ${n + 1} / ${idxs.length}`);
      }
    });

    if (!outputs.length) throw new Error('لم يتم تجهيز أي صورة');

    const base = fileSafe((state.file.name || 'video').replace(/\.[^.]+$/, ''));

    if (outputs.length === 1) {
      download(outputs[0].blob, `${base}_${outputs[0].name}`);
      toast('تم تنزيل الفريم');
    } else {
      setProgressText('تجهيز ملف ZIP…');
      const dir = `${base}_frames`;
      const entries = outputs.map((o) => ({ name: `${dir}/${o.name}`, data: o.blob }));

      if ($('#optManifest').checked) {
        entries.push({ name: `${dir}/frames.json`, data: JSON.stringify({
          source: state.file.name,
          duration: state.duration,
          width: state.natW,
          height: state.natH,
          detectedFps: state.fps,
          middleOfClipSeconds: state.duration / 2,
          exportedAt: new Date().toISOString(),
          frames: outputs.map((o) => ({
            file: o.name,
            index: o.frame.index,
            timeSeconds: Number(o.frame.time.toFixed(4)),
            timecode: fmtTime(o.frame.time),
            isMiddleFrame: o.frame.index === state.middleIndex,
          })),
        }, null, 2) });
      }

      const zipBlob = await ZipWriter.create(entries, (pct) => {
        $('#progressBar').style.width = pct.toFixed(1) + '%';
        setProgressText(`تجهيز ملف ZIP… ${pct.toFixed(0)}%`);
      });
      download(zipBlob, `${base}_frames_${outputs.length}.zip`);
      toast(`تم تصدير ${outputs.length} فريم (${bytes(zipBlob.size)})`);
    }
  } catch (err) {
    toast('فشل التصدير: ' + err.message, 4000);
  } finally {
    state.busy = false;
    $('#progressPanel').hidden = true;
    $('#progressBar').style.width = '0%';
    $('#btnExport').disabled = state.selected.size === 0;
  }
}

/* ---------- العارض المكبّر ---------- */

async function openLightbox(i) {
  const f = state.frames[i];
  if (!f) return;
  state.lbIndex = i;
  $('#lightbox').hidden = false;
  $('#lbTitle').textContent =
    `فريم #${f.index} — ${fmtTime(f.time)}${i === state.middleIndex ? '  ⏺ منتصف المقطع' : ''}`;
  $('#lbSelect').textContent = state.selected.has(i) ? '✓ محدد' : 'تحديد';
  $('#lbLoading').hidden = false;

  const lb = $('#lbCanvas');
  const ctx = lb.getContext('2d');
  // عرض المصغّرة فورًا ثم استبدالها بالدقة الكاملة
  const img = new Image();
  img.onload = () => {
    if (state.lbIndex !== i) return;
    lb.width = state.natW; lb.height = state.natH;
    ctx.drawImage(img, 0, 0, state.natW, state.natH);
  };
  img.src = f.url;

  if (state.busy) return;
  await lock(async () => {
    if (state.lbIndex !== i) return;
    await seekTo(f.time);
    drawFrame(state.natW);
    if (state.lbIndex !== i) return;
    lb.width = workCanvas.width; lb.height = workCanvas.height;
    ctx.drawImage(workCanvas, 0, 0);
  }).catch(() => {});
  if (state.lbIndex === i) $('#lbLoading').hidden = true;
}

function closeLightbox() {
  state.lbIndex = -1;
  $('#lightbox').hidden = true;
}

function lbStep(delta) {
  const next = state.lbIndex + delta;
  if (next < 0 || next >= state.frames.length) return;
  openLightbox(next);
  const el = cardEl(next);
  if (el) el.scrollIntoView({ block: 'center' });
}

/* ---------- الأحداث ---------- */

$('#dropzone').addEventListener('click', () => $('#fileInput').click());
$('#dropzone').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('#fileInput').click(); }
});
$('#fileInput').addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) loadFile(f);
  e.target.value = '';
});
$('#btnChange').addEventListener('click', () => $('#fileInput').click());

['dragenter', 'dragover'].forEach((t) => window.addEventListener(t, (e) => {
  e.preventDefault();
  $('#dropzone').classList.add('drag');
}));
['dragleave', 'drop'].forEach((t) => window.addEventListener(t, (e) => {
  e.preventDefault();
  if (t === 'dragleave' && e.relatedTarget) return;
  $('#dropzone').classList.remove('drag');
}));
window.addEventListener('drop', (e) => {
  const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) loadFile(f);
});

['#optRate', '#optMax'].forEach((s) => $(s).addEventListener('input', updatePlan));
$('#optQuality').addEventListener('input', (e) => { $('#qualityVal').textContent = e.target.value; });

$('#btnExtract').addEventListener('click', extract);
$('#btnAllFrames').addEventListener('click', () => {
  if (!state.fps) { toast('معدل الفيديو غير معروف — حدّده يدويًا'); return; }
  $('#optRate').value = String(state.fps);
  const needed = Math.floor(state.duration * state.fps) + 1;
  if (needed > Number($('#optMax').value)) $('#optMax').value = String(Math.min(20000, needed));
  updatePlan();
  extract();
});
$('#btnCancel').addEventListener('click', () => { state.cancel = true; toast('جارٍ الإيقاف…'); });

grid.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (!card) return;
  const i = Number(card.dataset.i);

  if (e.target.closest('.zoom')) { openLightbox(i); return; }

  if (e.shiftKey && state.lastClicked !== null) {
    const [a, b] = [state.lastClicked, i].sort((x, y) => x - y);
    const value = !state.selected.has(i);
    for (let k = a; k <= b; k++) toggle(k, value);
  } else {
    toggle(i);
  }
  state.lastClicked = i;
  refreshSelectionUi();
});

$('#toolbar').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const act = btn.dataset.act;

  if (act === 'all') state.frames.forEach((f) => state.selected.add(f.index));
  else if (act === 'none') state.selected.clear();
  else if (act === 'invert') state.frames.forEach((f) => {
    if (state.selected.has(f.index)) state.selected.delete(f.index); else state.selected.add(f.index);
  });
  else if (act === 'mid') {
    state.selected.clear();
    if (state.frames[state.middleIndex]) state.selected.add(state.middleIndex);
    scrollToMiddle();
  } else if (act === 'gomid') { scrollToMiddle(); return; }

  state.frames.forEach((f) => syncCard(f.index));
  refreshSelectionUi();
});

function scrollToMiddle() {
  const el = cardEl(state.middleIndex) || $('#midDivider');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

$('#btnExport').addEventListener('click', exportSelected);

$('#lbClose').addEventListener('click', closeLightbox);
$('#lbPrev').addEventListener('click', () => lbStep(-1));
$('#lbNext').addEventListener('click', () => lbStep(1));
$('#lbSelect').addEventListener('click', () => {
  if (state.lbIndex < 0) return;
  toggle(state.lbIndex);
  $('#lbSelect').textContent = state.selected.has(state.lbIndex) ? '✓ محدد' : 'تحديد';
  refreshSelectionUi();
});
$('#lightbox').addEventListener('click', (e) => { if (e.target.id === 'lightbox') closeLightbox(); });

window.addEventListener('keydown', (e) => {
  if ($('#lightbox').hidden) return;
  if (e.key === 'Escape') closeLightbox();
  // في واجهة RTL: السهم الأيسر = التالي، الأيمن = السابق
  else if (e.key === 'ArrowLeft') lbStep(1);
  else if (e.key === 'ArrowRight') lbStep(-1);
  else if (e.key === ' ') { e.preventDefault(); $('#lbSelect').click(); }
});

window.addEventListener('beforeunload', () => {
  state.frames.forEach((f) => URL.revokeObjectURL(f.url));
  if (state.objectUrl) URL.revokeObjectURL(state.objectUrl);
});
