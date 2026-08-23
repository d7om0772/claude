import React, { useRef } from "react";
import { templates, type RegisteredTemplate } from "../lib/registry";

/**
 * شاشة الاختيار: عيّنة فيديو مصغّرة لكل قالب تعمل عند المرور بالمؤشّر،
 * فيرى المستخدم القالب متحرّكاً قبل أن يختاره.
 */
const Thumb: React.FC<{ id: string }> = ({ id }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = React.useState(false);

  if (failed) {
    return (
      <div className="hint">
        لا توجد عيّنة بعد
        <br />
        <code style={{ fontSize: 11 }}>npm run previews</code>
      </div>
    );
  }

  return (
    <video
      ref={ref}
      muted
      loop
      playsInline
      preload="metadata"
      onError={(e) => {
        // MEDIA_ERR_ABORTED‏ (1) ليس فقداناً للملف: يقع عند إلغاء الطلب —
        // مثلاً حين يعيد StrictMode تركيب العنصر في التطوير. لو عاملناه
        // كفقدان لاختفت كل العيّنات رغم وجودها على الخادم.
        const code = e.currentTarget.error?.code;
        if (code !== undefined && code !== MediaError.MEDIA_ERR_ABORTED) {
          setFailed(true);
        }
      }}
      onMouseEnter={() => void ref.current?.play()}
      onMouseLeave={() => {
        const v = ref.current;
        if (v) {
          v.pause();
          v.currentTime = 0;
        }
      }}
    >
      {/* الصيغتان معاً: H.264 ترميز احتكاري تفتقده بعض بُنى Chromium على
          لينكس، وwebm غير مدعوم على سفاري الأقدم. */}
      <source src={`/previews/${id}.webm`} type="video/webm" />
      <source src={`/previews/${id}.mp4`} type="video/mp4" />
    </video>
  );
};

export const Gallery: React.FC<{
  onPick: (template: RegisteredTemplate) => void;
}> = ({ onPick }) => (
  <div className="gallery">
    <p>اختر قالباً لتبدأ. مرّر المؤشّر على العيّنة لتشغيلها.</p>
    <div className="grid">
      {templates.map((t) => (
        <div
          className="card"
          key={t.meta.id}
          onClick={() => onPick(t)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onPick(t);
          }}
        >
          <div className="thumb">
            <Thumb id={t.meta.id} />
            {/* dir=ltr وإلا قلب اتجاه الصفحة ترتيب الرقمين حول علامة × */}
            <span className="badge" dir="ltr">
              {t.meta.width}×{t.meta.height}
            </span>
          </div>
          <div className="meta">
            <h3>{t.meta.nameAr}</h3>
            <p>{t.meta.description}</p>
            <div className="tags">
              {t.meta.tags.slice(0, 4).map((tag) => (
                <span className="tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
