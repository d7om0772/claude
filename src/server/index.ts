#!/usr/bin/env tsx
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createReadStream, mkdirSync, statSync, writeFileSync } from "node:fs";
import { extname } from "node:path";
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

    json(res, 404, { error: "مسار غير معروف" });
  })().catch((err: unknown) => {
    json(res, 500, { error: err instanceof Error ? err.message : String(err) });
  });
});

server.listen(PORT, () => {
  process.stderr.write(`خادم الرندر يعمل على http://localhost:${PORT}\n`);
  process.stderr.write("تجهيز حزمة القوالب …\n");
  warmUp();
});
