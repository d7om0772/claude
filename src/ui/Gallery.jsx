import React, { useRef } from "react";
import { SHOT, TEMPLATE, templatesOfKind } from "../lib/registry.js";
import { assetUrl } from "../lib/asset-url.js";
/**
 * شاشة الاختيار: عيّنة فيديو مصغّرة لكل قالب تعمل عند المرور بالمؤشّر،
 * فيرى المستخدم القالب متحرّكاً قبل أن يختاره.
 */
const Thumb = ({ id }) => {
  const ref = useRef(null);
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
      <source src={assetUrl(`/previews/${id}.webm`)} type="video/webm" />
      <source src={assetUrl(`/previews/${id}.mp4`)} type="video/mp4" />
    </video>
  );
};
/**
 * قسمان: «اللقطات» وحدات مفردة، و«القوالب» نماذج مركّبة من عدة لقطات على
 * تايم لاين واحد. الفرق في `kind` داخل template.json لا في مجلدين منفصلين،
 * فيبقى عقد القالب واحداً وإضافة أي منهما سطراً واحداً في السجلّ.
 */
const SECTIONS = [
  {
    kind: TEMPLATE,
    label: "القوالب",
    hint: "نموذج كامل مكوّن من عدة لقطات على تايم لاين واحد — تعبّي محتواه وترندره.",
  },
  {
    kind: SHOT,
    label: "اللقطات",
    hint: "وحدة واحدة قائمة بذاتها. مرّر المؤشّر على العيّنة لتشغيلها.",
  },
];

const Card = ({ template, onPick }) => (
  <div
    className="card"
    onClick={() => onPick(template)}
    role="button"
    tabIndex={0}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") onPick(template);
    }}
  >
    <div className="thumb">
      <Thumb id={template.meta.id} />
      {/* dir=ltr وإلا قلب اتجاه الصفحة ترتيب الرقمين حول علامة × */}
      <span className="badge" dir="ltr">
        {template.meta.width}×{template.meta.height}
      </span>
    </div>
    <div className="meta">
      <h3>{template.meta.nameAr}</h3>
      <p>{template.meta.descriptionAr ?? template.meta.description}</p>
      <div className="tags">
        {template.meta.tags.slice(0, 4).map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export const Gallery = ({ onPick }) => (
  <div className="gallery">
    {SECTIONS.map((section) => {
      const items = templatesOfKind(section.kind);
      if (items.length === 0) return null;
      return (
        <section className="section" key={section.kind}>
          <div className="section-head">
            <h2>{section.label}</h2>
            <span className="section-count">{items.length}</span>
          </div>
          <p className="section-hint">{section.hint}</p>
          <div className="grid">
            {items.map((t) => (
              <Card key={t.meta.id} template={t} onPick={onPick} />
            ))}
          </div>
        </section>
      );
    })}
  </div>
);
