#!/usr/bin/env tsx
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { enqueue, getJob, listJobs, warmUp } from "./queue";
import { templates } from "../lib/registry";

/**
 * خادم الرندر — بلا أي إطار عمل: أربعة مسارات فقط.
 *
 *   GET  /api/health          هل الخادم يعمل (تفحصه الواجهة لتعرف إن كان
 *                             الرندر متاحاً، فنسخة الملف الواحد بلا خادم)
 *   POST /api/assets          يرفع ملفاً إلى public/uploads ويعيد مساره
 *   POST /api/jobs            ينشئ مهمة رندر
 *   GET  /api/jobs            حالة كل المهام
 *   GET  /api/jobs/:id/file   تنزيل الناتج
 *
 * وما عدا ذلك يُقدَّم كملف ساكن من dist-ui ثم public، فيكفي أن تعمل عملية
 * واحدة على المضيف: الواجهة والرندر على نفس المنفذ بلا وكيل ولا خادم ثانٍ.
 */

const PORT = Number(process.env.PORT ?? 5174);
const UPLOAD_DIR = "public/uploads";
mkdirSync(UPLOAD_DIR, { recursive: true });

const json = (res: ServerResponse, status: number, body: unknown): void => {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(payload);
};

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });

/**
 * الملفات تُحفظ داخل public لأن staticFile في القوالب يحلّ المسارات النسبية
 * من هناك — فيصير المسار المعاد صالحاً للرندر بلا تحويل إضافي.
 * الاسم يُولَّد من جديد ولا يُشتقّ من اسم الملف الوارد، حتى لا يتسرّب مسار.
 */
const saveUpload = (data: Buffer, fileName: string): string => {
  const ext = extname(fileName).slice(0, 10).replace(/[^.a-z0-9]/giu, "");
  const name = `${randomUUID()}${ext}`;
  writeFileSync(`${UPLOAD_DIR}/${name}`, data);
  return `uploads/${name}`;
};

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const STATIC_ROOTS = ["dist-ui", "public"];

/**
 * يحلّ مساراً واردًا إلى ملف داخل أحد الجذرين، ويرفض أي خروج عنهما.
 * normalize وحده لا يكفي: لا بد من التحقق أن المسار المطلق يبدأ فعلاً
 * بالجذر، وإلا فتح «..» الطريق إلى أي ملف على المضيف.
 */
const resolveStatic = (urlPath: string): string | null => {
  const clean = normalize(decodeURIComponent(urlPath)).replace(/^(\.\.[/\\])+/u, "");
  for (const root of STATIC_ROOTS) {
    const base = resolve(root);
    const candidate = resolve(join(base, clean));
    if (!candidate.startsWith(`${base}/`) && candidate !== base) continue;
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
};

const sendFile = (res: ServerResponse, filePath: string): void => {
  const { size } = statSync(filePath);
  res.writeHead(200, {
    "content-type": MIME_TYPES[extname(filePath).toLowerCase()] ?? "application/octet-stream",
    "content-length": size,
    "accept-ranges": "bytes",
  });
  createReadStream(filePath).pipe(res);
};

const server = createServer((req, res) => {
  void (async () => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host}`);
    const path = url.pathname;

    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "content-type, x-file-name",
        "access-control-allow-methods": "GET, POST, OPTIONS",
      });
      res.end();
      return;
    }

    if (path === "/api/health") {
      json(res, 200, { ok: true, templates: templates.length });
      return;
    }

    if (path === "/api/assets" && req.method === "POST") {
      const fileName = String(req.headers["x-file-name"] ?? "file.bin");
      const data = await readBody(req);
      if (data.length === 0) {
        json(res, 400, { error: "ملف فارغ" });
        return;
      }
      json(res, 200, { path: saveUpload(data, fileName) });
      return;
    }

    if (path === "/api/jobs" && req.method === "POST") {
      const body = JSON.parse((await readBody(req)).toString("utf8")) as {
        templateId?: string;
        props?: Record<string, unknown>;
      };
      const template = templates.find((t) => t.meta.id === body.templateId);
      if (!template) {
        json(res, 400, { error: `لا يوجد قالب بالمعرّف ${body.templateId}` });
        return;
      }
      const job = enqueue(template.meta.id, template.meta.nameAr, {
        ...template.defaultProps,
        ...(body.props ?? {}),
      });
      json(res, 200, { id: job.id });
      return;
    }

    if (path === "/api/jobs" && req.method === "GET") {
      json(
        res,
        200,
        listJobs().map(({ props: _props, outputPath: _out, ...rest }) => rest),
      );
      return;
    }

    const fileMatch = /^\/api\/jobs\/([^/]+)\/file$/u.exec(path);
    if (fileMatch && req.method === "GET") {
      const job = getJob(fileMatch[1] as string);
      if (!job?.outputPath) {
        json(res, 404, { error: "لا يوجد ناتج لهذه المهمة" });
        return;
      }
      const { size } = statSync(job.outputPath);
      res.writeHead(200, {
        "content-type": "video/mp4",
        "content-length": size,
        "content-disposition": `attachment; filename="${job.templateId}.mp4"`,
        "access-control-allow-origin": "*",
      });
      createReadStream(job.outputPath).pipe(res);
      return;
    }

    if (path.startsWith("/api/")) {
      json(res, 404, { error: "مسار غير معروف" });
      return;
    }

    // ملف ساكن، وإلا صفحة الواجهة (التوجيه يجري في المتصفح)
    const file = resolveStatic(path === "/" ? "/index.html" : path);
    if (file) {
      sendFile(res, file);
      return;
    }
    const index = resolveStatic("/index.html");
    if (index) {
      sendFile(res, index);
      return;
    }
    json(res, 404, {
      error: "الواجهة غير مبنيّة. شغّل npm run ui:build أولاً.",
    });
  })().catch((err: unknown) => {
    json(res, 500, { error: err instanceof Error ? err.message : String(err) });
  });
});

server.listen(PORT, () => {
  process.stderr.write(`خادم الرندر يعمل على http://localhost:${PORT}\n`);
  process.stderr.write("تجهيز حزمة القوالب …\n");
  warmUp();
});
