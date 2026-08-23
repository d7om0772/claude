import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";

/**
 * قائمة انتظار الرندر.
 *
 * مهمة واحدة تُنفَّذ في كل لحظة وما عداها ينتظر: الرندر يشبع المعالج، وتشغيل
 * مهمتين معاً يبطئ الاثنتين ولا يقصّر الزمن الكلي. الطابور هنا هو ما يحرّر
 * المستخدم ليشتغل على قالب ثانٍ بينما الأول يُرندر.
 */

export type JobStatus = "queued" | "rendering" | "done" | "failed";

export type Job = {
  readonly id: string;
  readonly templateId: string;
  readonly templateName: string;
  status: JobStatus;
  /** من ٠ إلى ١ أثناء الرندر */
  progress: number;
  createdAt: number;
  finishedAt?: number;
  outputPath?: string;
  error?: string;
  readonly props: Record<string, unknown>;
};

const OUT_DIR = ".render/out";
mkdirSync(OUT_DIR, { recursive: true });

const jobs = new Map<string, Job>();
let running = false;

/**
 * الحزمة تُبنى مرة واحدة وتُعاد للجميع. بناؤها لكل مهمة يضيف عشرات الثواني
 * بلا فائدة، فالقوالب لا تتغيّر أثناء التشغيل.
 */
let bundlePromise: Promise<string> | null = null;

const getBundle = (): Promise<string> => {
  bundlePromise ??= bundle({
    entryPoint: "src/index.ts",
    onProgress: () => undefined,
  });
  return bundlePromise;
};

/** يُستدعى عند الإقلاع حتى لا تدفع أول مهمة كلفة البناء وحدها. */
export const warmUp = (): void => {
  void getBundle().catch(() => {
    bundlePromise = null;
  });
};

export const listJobs = (): Job[] =>
  [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt);

export const getJob = (id: string): Job | undefined => jobs.get(id);

export const enqueue = (
  templateId: string,
  templateName: string,
  props: Record<string, unknown>,
): Job => {
  const job: Job = {
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

const runOne = async (job: Job): Promise<void> => {
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
const drain = async (): Promise<void> => {
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
