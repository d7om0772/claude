import React from "react";
import { downloadUrl } from "./render.js";
const LABEL = {
  queued: "في الانتظار",
  rendering: "يُرندر",
  done: "جاهز",
  failed: "فشل",
};
const elapsed = (job) => {
  const end = job.finishedAt ?? Date.now();
  return `${Math.round((end - job.createdAt) / 1000)} ث`;
};
export const RenderQueue = ({ jobs, onClose }) => (
  <aside className="queue">
    <div className="queue-head">
      <strong>مهام الرندر</strong>
      <button className="icon-btn" onClick={onClose} title="إغلاق">
        ✕
      </button>
    </div>

    {jobs.length === 0 ? (
      <p className="queue-empty">
        لا مهام بعد. اضغط «رندر» داخل أي قالب، وتقدر تكمل على قالب ثانٍ بينما
        يشتغل.
      </p>
    ) : (
      <ul className="queue-list">
        {jobs.map((job) => (
          <li className={`queue-item ${job.status}`} key={job.id}>
            <div className="queue-row">
              <span className="queue-name">{job.templateName}</span>
              <span className="queue-status">{LABEL[job.status]}</span>
            </div>

            {job.status === "rendering" ? (
              <div className="bar">
                <span style={{ width: `${Math.round(job.progress * 100)}%` }} />
              </div>
            ) : null}

            <div className="queue-row sub">
              <span>{elapsed(job)}</span>
              {job.status === "done" ? (
                <a
                  className="btn primary tiny"
                  href={downloadUrl(job.id)}
                  download
                >
                  تنزيل
                </a>
              ) : null}
            </div>

            {job.error ? <div className="note bad">{job.error}</div> : null}
          </li>
        ))}
      </ul>
    )}
  </aside>
);
