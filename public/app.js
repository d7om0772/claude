/* ==========  صوتك — منطق الواجهة  ========== */

/** الأسلوب الافتراضي: شاب سعودي حماسي بأسلوب مقدّم بودكاست إعلاني. */
const DEFAULT_STYLE =
  'اقرأ النص التالي بصوت شاب سعودي حماسي، طبقة صوت متوسطة، إيقاع سريع وحيوي بأسلوب مقدم بودكاست إعلاني، ' +
  'مع تلوين واضح في النبرة: صعود حماسي في بداية الجمل وتشويق قبل النقاط المهمة، ووقفات قصيرة جداً بين الأفكار، ' +
  'وطاقة عالية ثابتة من أول كلمة لآخر كلمة. النص';

const STYLE_PRESETS = [
  { id: 'hype', label: '🔥 سعودي حماسي', text: DEFAULT_STYLE },
  {
    id: 'calm',
    label: '🌙 هادئ ودافئ',
    text:
      'اقرأ النص التالي بصوت عربي هادئ ودافئ، طبقة صوت منخفضة، إيقاع متأنٍّ ومريح، ' +
      'مع وقفات طبيعية بين الجمل ونبرة صادقة قريبة من المستمع بدون مبالغة. النص',
  },
  {
    id: 'news',
    label: '📰 إخباري رسمي',
    text:
      'اقرأ النص التالي بأسلوب مذيع نشرة أخبار عربية فصيحة، نطق واضح ومحايد، ' +
      'إيقاع منتظم، وتأكيد خفيف على الأرقام والأسماء بدون أي انفعال. النص',
  },
  {
    id: 'story',
    label: '📖 قصصي مشوّق',
    text:
      'اقرأ النص التالي بأسلوب راوي قصص، نبرة مشوّقة تتغير مع أحداث النص، ' +
      'إبطاء عند اللحظات المهمة ووقفات درامية قصيرة قبل المفاجآت. النص',
  },
];

const SAMPLES = {
  ad: 'يا هلا والله فيكم! اليوم عندنا لك عرض ما يتكرر… خصومات توصل لخمسين بالمية على كل المنتجات، وتوصيل مجاني لكل مدن المملكة. لا تفوّت الفرصة، العرض لمدة ثلاثة أيام بس!',
  podcast:
    'أهلاً وسهلاً فيكم في حلقة جديدة! اليوم بنتكلم عن موضوع كل واحد فينا يمر فيه، بس قليل اللي ينتبه له… جهّز فنجالك، وخلنا نبدأ.',
  promo:
    'انتبه! باقي ساعات على نهاية العرض. اشترك الحين واحصل على شهر مجاني كامل، بدون أي التزام، وتقدر تلغي في أي وقت. الرابط تحت — لا تتأخر!',
};

const VOICES = [
  { name: 'Puck', desc: 'شاب حيوي — مثالي للإعلانات' },
  { name: 'Fenrir', desc: 'قوي ومتحمّس' },
  { name: 'Charon', desc: 'عميق وواثق' },
  { name: 'Orus', desc: 'حازم ومباشر' },
  { name: 'Kore', desc: 'واضح ومتوازن' },
  { name: 'Zephyr', desc: 'مشرق وخفيف' },
  { name: 'Leda', desc: 'شبابي ونشِط' },
  { name: 'Aoede', desc: 'منساب وناعم' },
  { name: 'Callirrhoe', desc: 'مرتاح وودود' },
  { name: 'Autonoe', desc: 'مشرق ومتفائل' },
  { name: 'Enceladus', desc: 'هامس وهادئ' },
  { name: 'Iapetus', desc: 'صافٍ ونقي' },
  { name: 'Umbriel', desc: 'مطمئن ورصين' },
  { name: 'Algieba', desc: 'سلس ومنساب' },
  { name: 'Despina', desc: 'ناعم وسريع' },
  { name: 'Erinome', desc: 'واضح ومحايد' },
  { name: 'Algenib', desc: 'خشن ومميّز' },
  { name: 'Rasalgethi', desc: 'معلوماتي وجاد' },
  { name: 'Laomedeia', desc: 'مبتهج ومرح' },
  { name: 'Achernar', desc: 'رقيق وخفيف' },
  { name: 'Alnilam', desc: 'ثابت وقوي' },
  { name: 'Schedar', desc: 'متزن ومحترف' },
  { name: 'Gacrux', desc: 'ناضج ورزين' },
  { name: 'Pulcherrima', desc: 'جريء ومتقدّم' },
  { name: 'Achird', desc: 'ودود وقريب' },
  { name: 'Zubenelgenubi', desc: 'عفوي ويومي' },
  { name: 'Vindemiatrix', desc: 'لطيف ومهذّب' },
  { name: 'Sadachbia', desc: 'مفعم بالحياة' },
  { name: 'Sadaltager', desc: 'خبير وواثق' },
  { name: 'Sulafat', desc: 'دافئ وجذّاب' },
];

const $ = (id) => document.getElementById(id);
const el = {
  text: $('text'),
  style: $('style'),
  presets: $('presets'),
  voices: $('voices'),
  voiceSearch: $('voiceSearch'),
  voiceCount: $('voiceCount'),
  model: $('model'),
  counter: $('counter'),
  generate: $('generate'),
  error: $('error'),
  empty: $('empty'),
  player: $('player'),
  audio: $('audio'),
  meta: $('meta'),
  download: $('download'),
  viz: $('viz'),
  history: $('history'),
  historyHint: $('historyHint'),
  clearHistory: $('clearHistory'),
  status: $('status'),
  statusText: $('statusText'),
  resetStyle: $('resetStyle'),
};

const state = {
  voice: 'Puck',
  busy: false,
  history: [],
  lastUrl: null,
};

/* ----------  بناء عناصر الواجهة  ---------- */

function renderPresets() {
  el.presets.innerHTML = '';
  for (const preset of STYLE_PRESETS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'chip';
    btn.textContent = preset.label;
    btn.dataset.id = preset.id;
    btn.addEventListener('click', () => {
      el.style.value = preset.text;
      markActivePreset();
    });
    el.presets.appendChild(btn);
  }
}

/** يبرز الأسلوب المطابق لمحتوى الصندوق (إن وُجد). */
function markActivePreset() {
  const current = el.style.value.trim();
  for (const btn of el.presets.children) {
    const preset = STYLE_PRESETS.find((p) => p.id === btn.dataset.id);
    btn.classList.toggle('active', preset?.text.trim() === current);
  }
}

function renderVoices(filter = '') {
  const query = filter.trim().toLowerCase();
  const list = VOICES.filter(
    (v) => !query || v.name.toLowerCase().includes(query) || v.desc.includes(query)
  );

  el.voices.innerHTML = '';
  el.voiceCount.textContent = `${list.length} صوت`;

  if (!list.length) {
    el.voices.innerHTML = '<p class="no-results">ما فيه صوت مطابق للبحث.</p>';
    return;
  }

  for (const voice of list) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'voice' + (voice.name === state.voice ? ' active' : '');
    btn.innerHTML =
      `<span class="name">${voice.name}</span><span class="desc">${voice.desc}</span>`;
    btn.addEventListener('click', () => {
      state.voice = voice.name;
      renderVoices(el.voiceSearch.value);
    });
    el.voices.appendChild(btn);
  }
}

function updateCounter() {
  const len = el.text.value.length;
  el.counter.textContent = `${len} / 5000`;
  el.counter.classList.toggle('warn', len > 4500);
}

/* ----------  المؤثر البصري للموجة  ---------- */

let audioCtx = null;
let analyser = null;
let rafId = null;

function setupVisualizer() {
  if (analyser) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;
  audioCtx = new Ctx();
  const source = audioCtx.createMediaElementSource(el.audio);
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 128;
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
}

function drawVisualizer() {
  const canvas = el.viz;
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);

  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  const bins = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;

  const frame = () => {
    rafId = requestAnimationFrame(frame);
    ctx.clearRect(0, 0, width, height);
    if (bins) analyser.getByteFrequencyData(bins);

    const count = 40;
    const gap = 3;
    const barWidth = (width - gap * (count - 1)) / count;
    // نستخدم الثلثين الأولين فقط من الطيف — الترددات العالية شبه صامتة في الكلام
    const usable = bins ? Math.floor(bins.length * 0.66) : 0;

    for (let i = 0; i < count; i++) {
      // طيف معكوس حول المنتصف: الترددات المنخفضة في الوسط والعالية عند الأطراف
      const distance = Math.abs(i - (count - 1) / 2) / ((count - 1) / 2);
      const value = bins ? bins[Math.floor(distance * (usable - 1))] / 255 : 0;
      // ارتفاع أدنى حتى تبقى الموجة ظاهرة أثناء الصمت
      const barHeight = Math.max(3, value * (height - 12));
      const x = i * (barWidth + gap);
      const y = (height - barHeight) / 2;

      const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
      gradient.addColorStop(0, '#f4c15c');
      gradient.addColorStop(1, '#2fd6a5');
      ctx.fillStyle = gradient;
      ctx.globalAlpha = 0.35 + value * 0.65;

      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  };

  cancelAnimationFrame(rafId);
  frame();
}

/* ----------  الطلب والنتيجة  ---------- */

function showError(message) {
  el.error.textContent = message;
  el.error.hidden = !message;
}

function setBusy(busy) {
  state.busy = busy;
  el.generate.disabled = busy;
  el.generate.classList.toggle('loading', busy);
  el.generate.querySelector('.btn-label').textContent = busy
    ? 'جاري التوليد…'
    : 'توليد الصوت';
}

function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mimeType });
}

function showResult(result, text) {
  if (state.lastUrl) URL.revokeObjectURL(state.lastUrl);
  const url = URL.createObjectURL(base64ToBlob(result.audio, result.mimeType));
  state.lastUrl = url;

  el.audio.src = url;
  el.download.href = url;
  el.download.download = `sawtak-${result.voice}-${Date.now()}.wav`;

  el.meta.innerHTML = [
    `🎤 ${result.voice}`,
    `⏱️ ${result.durationSeconds} ثانية`,
    `📦 ${(result.bytes / 1024 / 1024).toFixed(2)} ميجابايت`,
    `🧠 ${result.model.includes('pro') ? 'Pro' : 'Flash'}`,
  ]
    .map((chip) => `<span>${chip}</span>`)
    .join('');

  el.empty.hidden = true;
  el.player.hidden = false;

  drawVisualizer();
  el.audio.play().catch(() => {
    /* المتصفح قد يمنع التشغيل التلقائي — المستخدم يضغط تشغيل */
  });

  addHistory({ url, text, voice: result.voice, meta: el.meta.innerHTML });
}

function addHistory(entry) {
  state.history.unshift(entry);
  if (state.history.length > 6) {
    const removed = state.history.pop();
    if (removed.url !== state.lastUrl) URL.revokeObjectURL(removed.url);
  }
  renderHistory();
}

function renderHistory() {
  el.history.innerHTML = '';
  el.clearHistory.hidden = state.history.length === 0;
  el.historyHint.hidden = state.history.length > 0;

  for (const item of state.history) {
    const li = document.createElement('li');
    li.innerHTML =
      `<span class="h-text">${item.text.slice(0, 60)}${item.text.length > 60 ? '…' : ''}</span>` +
      `<span class="h-voice">${item.voice}</span>`;
    li.title = 'اضغط للاستماع مرة أخرى';
    li.addEventListener('click', () => {
      el.audio.src = item.url;
      el.download.href = item.url;
      el.meta.innerHTML = item.meta;
      el.empty.hidden = true;
      el.player.hidden = false;
      drawVisualizer();
      el.audio.play().catch(() => {});
    });
    el.history.appendChild(li);
  }
}

async function generate() {
  if (state.busy) return;
  showError('');

  const text = el.text.value.trim();
  if (!text) {
    showError('اكتب النص أولاً 🙂');
    el.text.focus();
    return;
  }

  setBusy(true);
  try {
    setupVisualizer();
    if (audioCtx?.state === 'suspended') await audioCtx.resume();

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        style: el.style.value.trim(),
        voice: state.voice,
        model: el.model.value,
      }),
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'تعذّر توليد الصوت.');

    showResult(data, text);
  } catch (err) {
    showError(err.message || 'صار خطأ غير متوقع. جرّب مرة ثانية.');
  } finally {
    setBusy(false);
  }
}

/* ----------  التهيئة  ---------- */

async function checkHealth() {
  try {
    const res = await fetch('/api/health');
    const data = await res.json();
    if (data.hasKey) {
      el.status.className = 'status ok';
      el.statusText.textContent = 'متصل بـ Gemini';
    } else {
      el.status.className = 'status bad';
      el.statusText.textContent = 'المفتاح غير مضبوط';
    }
  } catch {
    el.status.className = 'status bad';
    el.statusText.textContent = 'الخادم غير متاح';
  }
}

function init() {
  el.style.value = DEFAULT_STYLE;
  renderPresets();
  markActivePreset();
  renderVoices();
  updateCounter();
  renderHistory();
  checkHealth();

  el.text.addEventListener('input', updateCounter);
  el.style.addEventListener('input', markActivePreset);
  el.voiceSearch.addEventListener('input', (e) => renderVoices(e.target.value));
  el.generate.addEventListener('click', generate);

  el.resetStyle.addEventListener('click', () => {
    el.style.value = DEFAULT_STYLE;
    markActivePreset();
  });

  el.clearHistory.addEventListener('click', () => {
    for (const item of state.history) {
      if (item.url !== state.lastUrl) URL.revokeObjectURL(item.url);
    }
    state.history = [];
    renderHistory();
  });

  for (const btn of document.querySelectorAll('.sample')) {
    btn.addEventListener('click', () => {
      el.text.value = SAMPLES[btn.dataset.sample];
      updateCounter();
      el.text.focus();
    });
  }

  // Ctrl/Cmd + Enter للتوليد السريع
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      generate();
    }
  });

  window.addEventListener('resize', () => {
    if (!el.player.hidden) drawVisualizer();
  });
}

init();
