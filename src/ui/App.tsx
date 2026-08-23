import React, { useCallback, useEffect, useState } from "react";
import { Gallery } from "./Gallery";
import { Editor } from "./Editor";
import { RenderQueue } from "./RenderQueue";
import { checkServer, fetchJobs, type Job } from "./render";
import type { RegisteredTemplate } from "../lib/registry";

/**
 * الطابور يعيش هنا، فوق الشاشتين.
 *
 * هذا وحده ما يجعل «اشتغل على قالب ثانٍ بينما الأول يُرندر» مجانياً: الرندر
 * يجري في الخادم، والواجهة لا تحمل منه إلا مُعرّف المهمة. الرجوع للمعرض
 * واختيار قالب آخر لا يمسّ المهام الجارية لأن حالتها ليست داخل المحرّر.
 */
export const App: React.FC = () => {
  const [selected, setSelected] = useState<RegisteredTemplate | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [serverUp, setServerUp] = useState<boolean | null>(null);

  useEffect(() => {
    void checkServer().then(setServerUp);
  }, []);

  // نستطلع فقط حين توجد مهمة لم تنتهِ — لا استطلاع دائم بلا سبب.
  const active = jobs.some(
    (j) => j.status === "queued" || j.status === "rendering",
  );

  useEffect(() => {
    if (serverUp !== true) return undefined;
    let cancelled = false;
    const tick = (): void => {
      void fetchJobs().then((next) => {
        if (!cancelled) setJobs(next);
      });
    };
    tick();
    if (!active) return () => { cancelled = true; };
    const id = window.setInterval(tick, 1000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [serverUp, active]);

  const onQueued = useCallback(() => {
    setQueueOpen(true);
    void fetchJobs().then(setJobs);
  }, []);

  const pending = jobs.filter(
    (j) => j.status === "queued" || j.status === "rendering",
  ).length;

  return (
    <>
      <header className="topbar">
        <h1>قوالب مونتاج</h1>
        <span className="spacer" />
        {serverUp === true ? (
          <button className="btn" onClick={() => setQueueOpen((o) => !o)}>
            مهام الرندر
            {pending > 0 ? <span className="queue-badge">{pending}</span> : null}
          </button>
        ) : null}
        {selected ? (
          <button className="btn" onClick={() => setSelected(null)}>
            المعرض
          </button>
        ) : null}
      </header>

      {queueOpen ? (
        <>
          <div className="queue-scrim" onClick={() => setQueueOpen(false)} />
          <RenderQueue jobs={jobs} onClose={() => setQueueOpen(false)} />
        </>
      ) : null}

      <div className={queueOpen ? "with-queue" : undefined}>
        {selected ? (
          <Editor
            key={selected.meta.id}
            template={selected}
            onBack={() => setSelected(null)}
            serverUp={serverUp}
            onQueued={onQueued}
          />
        ) : (
          <Gallery onPick={setSelected} />
        )}
      </div>
    </>
  );
};
