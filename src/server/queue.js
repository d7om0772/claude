import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const OUT_DIR = ".render/out";
mkdirSync(OUT_DIR, { recursive: true });
const jobs = new Map();
let running = false;
/**
 * الحزمة تُبنى مرة واحدة وتُعاد للجميع. بناؤها لكل مهمة يضيف عشرات الثواني
 * بلا فائدة، فالقوالب لا تتغيّر أثناء التشغيل.
 */
let bundlePromise = null;
const getBundle = () => {
  bundlePromise ??= bundle({
    entryPoint: "src/index.js",
    onProgress: () => undefined,
  });
  return bundlePromise;
};
/** يُستدعى عند الإقلاع حتى لا تدفع أول مهمة كلفة البناء وحدها. */
export const warmUp = () => {
  void getBundle().catch(() => {
    bundlePromise = null;
  });
};
export const listJobs = () =>
  [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);
export const getJob = (id) => jobs.get(id);
export const enqueue = (templateId, templateName, props) => {
  const job = {
    id: randomUUID(),
    templateId,
    templateName,
    status: "queued",
    progress: 0,
    createdAt: Date.now(),
    props,
  };
  jobs.set(job.id, job);
  void drain();
  return job;
};
const runOne = async (job) => {
  job.status = "rendering";
  job.progress = 0;
  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl,
    id: job.templateId,
    inputProps: job.props,
  });
  const outputLocation = `${OUT_DIR}/${job.id}.mp4`;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation,
    inputProps: job.props,
    onProgress: ({ progress }) => {
      job.progress = progress;
    },
  });
  job.outputPath = outputLocation;
  job.status = "done";
  job.progress = 1;
  job.finishedAt = Date.now();
};
/** ينفّذ المهام واحدة تلو الأخرى حتى يفرغ الطابور. */
const drain = async () => {
  if (running) return;
  running = true;
  try {
    for (;;) {
      const next = [...jobs.values()]
        .filter((j) => j.status === "queued")
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      if (!next) break;
      try {
        await runOne(next);
      } catch (err) {
        next.status = "failed";
        next.error = err instanceof Error ? err.message : String(err);
        next.finishedAt = Date.now();
      }
    }
  } finally {
    running = false;
  }
};
