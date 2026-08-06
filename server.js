/**
 * صوتك — خادم بسيط بدون أي اعتماديات خارجية.
 * يقدّم واجهة الويب ويعمل كوسيط آمن بين المتصفح و Gemini TTS API
 * بحيث لا يُكشف مفتاح الـ API للمتصفح أبداً.
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(ROOT, 'public');

loadDotEnv(join(ROOT, '.env'));

const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.GEMINI_API_KEY || '';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

const MAX_CHARS = 5000;

// نماذج الطبقة المجانية فقط — نموذج Pro يتطلب خطة مدفوعة ويرجع 429 دائماً.
const ALLOWED_MODELS = new Set([
  'gemini-2.5-flash-preview-tts',
  'gemini-3.1-flash-tts-preview',
]);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

/** يقرأ ملف .env يدوياً (سطر KEY=VALUE) دون الحاجة لمكتبة dotenv. */
function loadDotEnv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

function readBody(req, limitBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error('حجم الطلب كبير جداً'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

/**
 * Gemini يُرجع صوتاً خاماً بصيغة PCM 16-bit (audio/L16).
 * نغلّفه برأس WAV حتى يشتغل مباشرة في المتصفح وعند التحميل.
 */
function pcmToWav(pcm, { sampleRate = 24000, channels = 1, bitsPerSample = 16 } = {}) {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // حجم مقطع fmt
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/** يستخرج معدّل العينات من نوع MIME مثل: audio/L16;codec=pcm;rate=24000 */
function sampleRateFromMime(mime = '') {
  const match = /rate=(\d+)/.exec(mime);
  return match ? Number(match[1]) : 24000;
}

async function handleTts(req, res) {
  if (!API_KEY) {
    return sendJson(res, 500, {
      error: 'لم يتم ضبط GEMINI_API_KEY. أضِف المفتاح في ملف .env ثم أعد التشغيل.',
    });
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return sendJson(res, 400, { error: 'صيغة الطلب غير صحيحة.' });
  }

  const text = String(payload.text ?? '').trim();
  const style = String(payload.style ?? '').trim();
  const voice = String(payload.voice ?? 'Puck').trim();
  const model = ALLOWED_MODELS.has(payload.model)
    ? payload.model
    : 'gemini-2.5-flash-preview-tts';

  if (!text) return sendJson(res, 400, { error: 'اكتب النص المراد تحويله أولاً.' });
  if (text.length > MAX_CHARS) {
    return sendJson(res, 400, {
      error: `النص طويل جداً (${text.length} حرف). الحد الأقصى ${MAX_CHARS} حرف.`,
    });
  }
  if (!/^[A-Za-z]{2,30}$/.test(voice)) {
    return sendJson(res, 400, { error: 'اسم الصوت غير صالح.' });
  }

  // نُركّب تعليمات الأداء الصوتي قبل النص نفسه — هكذا يفهم Gemini الأسلوب المطلوب.
  const prompt = style ? `${style}:\n\n${text}` : text;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  const callGemini = () =>
    fetch(`${API_BASE}/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': API_KEY,
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
        },
      }),
    });

  try {
    let upstream = await callGemini();

    // 503 من جيمناي عابر في الغالب — نعيد المحاولة مرة واحدة بعد ثانيتين.
    if (upstream.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      upstream = await callGemini();
    }

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return sendJson(res, 429, {
          error:
            'تجاوزت حصة الطبقة المجانية. انتظر دقيقة وجرّب مرة ثانية، أو فعّل الفوترة في Google AI Studio.',
        });
      }
      if (upstream.status === 503) {
        return sendJson(res, 503, {
          error: 'خدمة جيمناي مشغولة حالياً. جرّب بعد لحظات.',
        });
      }
      const message = data?.error?.message || `فشل الطلب (${upstream.status}).`;
      return sendJson(res, 502, { error: message });
    }

    const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part) {
      const blocked = data?.promptFeedback?.blockReason;
      const reason = data?.candidates?.[0]?.finishReason;
      return sendJson(res, 502, {
        error: blocked
          ? `تم رفض المحتوى من النموذج (${blocked}). جرّب صياغة أخرى.`
          : `لم يُرجع النموذج أي صوت${reason ? ` (${reason})` : ''}. جرّب نصاً أطول قليلاً أو أعد المحاولة.`,
      });
    }

    const pcm = Buffer.from(part.inlineData.data, 'base64');
    const sampleRate = sampleRateFromMime(part.inlineData.mimeType);
    const wav = pcmToWav(pcm, { sampleRate });

    return sendJson(res, 200, {
      audio: wav.toString('base64'),
      mimeType: 'audio/wav',
      sampleRate,
      bytes: wav.length,
      durationSeconds: Number((pcm.length / 2 / sampleRate).toFixed(2)),
      model,
      voice,
    });
  } catch (err) {
    const aborted = err.name === 'AbortError';
    return sendJson(res, aborted ? 504 : 500, {
      error: aborted ? 'انتهت مهلة الطلب. جرّب نصاً أقصر.' : `خطأ غير متوقع: ${err.message}`,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function serveStatic(req, res, pathname) {
  const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname).slice(1);
  const filePath = normalize(join(PUBLIC_DIR, relative));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const file = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extname(filePath)] || 'application/octet-stream',
      'Content-Length': file.length,
    });
    res.end(file);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('الصفحة غير موجودة');
  }
}

const server = createServer(async (req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  if (pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, hasKey: Boolean(API_KEY), maxChars: MAX_CHARS });
  }

  if (pathname === '/api/tts') {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'الطريقة غير مدعومة.' });
    return handleTts(req, res);
  }

  if (req.method !== 'GET') return sendJson(res, 405, { error: 'الطريقة غير مدعومة.' });
  return serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`\n  🎙️  صوتك يعمل على  http://localhost:${PORT}`);
  if (!API_KEY) {
    console.log('  ⚠️  تنبيه: GEMINI_API_KEY غير مضبوط — انسخ .env.example إلى .env وأضف مفتاحك.\n');
  } else {
    console.log('  ✅  المفتاح جاهز.\n');
  }
});
