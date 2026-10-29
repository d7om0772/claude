// خادم تطوير محلي بلا اعتماديات: يقدّم public/ ويشغّل دوال /api/* ويحاكي الجدولة.
// التخزين في مجلد .data بدلاً من Netlify Blobs. الاستخدام: npm run dev
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.MIZAN_LOCAL_STORE ??= path.join(root, '.data');

const { collect } = await import('../netlify/lib/collect.mjs');
const { maintain } = await import('../netlify/lib/history.mjs');
const routes = {
  '/api/prices': (await import('../netlify/functions/prices.mjs')).default,
  '/api/history': (await import('../netlify/functions/history.mjs')).default,
};

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

const publicDir = path.join(root, 'public');
const port = Number(process.env.PORT) || 8888;

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  try {
    const fn = routes[url.pathname];
    if (fn) {
      const response = await fn(new Request(url, { method: req.method }));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.join(publicDir, rel);
    if (!file.startsWith(publicDir)) throw Object.assign(new Error('forbidden'), { code: 'ENOENT' });
    const body = await readFile(file);
    res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500, { 'content-type': 'text/plain; charset=utf-8' });
    res.end(e.code === 'ENOENT' ? 'Not found' : String(e));
  }
}).listen(port, () => console.log(`ميزان يعمل على http://localhost:${port}`));

// محاكاة الدوال المجدولة: الجمع كل دقيقة، والصيانة عند البدء ثم كل ساعة.
const run = (name, task) => task().catch((e) => console.error(`${name} failed:`, e.message));
run('collect', () => collect());
run('maintain', () => maintain());
setInterval(() => run('collect', () => collect()), 60_000);
setInterval(() => run('maintain', () => maintain()), 3_600_000);
