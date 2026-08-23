import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import type { RegisteredTemplate } from "../lib/registry";
import { describeSchema, type Field } from "../lib/schema-introspect";
import { srtToCaptions, type Caption } from "../lib/srt";
import { FieldControl, type AssetPick } from "./form/Fields";
import { readAudioDuration, runChecks, wantsWordLevel } from "./sync";

type Props = Record<string, unknown>;

/**
 * مسار blob بلا امتداد، والقوالب تميّز الفيديو من الصورة بالامتداد — فبدون
 * لاحقة يُعرض أي فيديو مرفوع كصورة ثابتة ولا تُحتسب مدّته. الجزء بعد # لا
 * يدخل في البحث عن الـ blob فيبقى الرابط صالحاً، ويكفي أدوات الاكتشاف.
 */
const extensionSuffix = (fileName: string): string => {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? `#${fileName.slice(dot)}` : "";
};

/**
 * تقسيم الحقول إلى مجموعات مفهومة. الترتيب مقصود: ما يعدّله المستخدم كثيراً
 * أولاً (المحتوى، الألوان، الصوت)، وضبط التخطيط والحركة في النهاية مطوياً.
 */
const groupOf = (field: Field): string => {
  if (field.name === "voiceover" || field.kind === "captions") {
    return "الصوت والتزامن";
  }
  if (field.kind === "asset") return "الوسائط والشعار";
  if (field.kind === "color") return "الألوان";
  if (field.kind === "text" || field.kind === "textarea" || field.kind === "objectList") {
    return "النصوص";
  }
  return "التخطيط والحركة";
};

const GROUP_ORDER = [
  "النصوص",
  "الألوان",
  "الصوت والتزامن",
  "الوسائط والشعار",
  "التخطيط والحركة",
] as const;

export const Editor: React.FC<{
  template: RegisteredTemplate;
  onBack: () => void;
}> = ({ template, onBack }) => {
  const fields = useMemo(
    () => describeSchema(template.schema),
    [template],
  );

  const [props, setProps] = useState<Props>(
    () => ({ ...template.defaultProps }),
  );
  const [picked, setPicked] = useState<Record<string, AssetPick>>({});
  const [srtName, setSrtName] = useState<string | null>(null);
  const [audioSeconds, setAudioSeconds] = useState<number | null>(null);
  const [duration, setDuration] = useState(template.meta.defaultDurationInFrames);

  const set = useCallback((name: string, value: unknown) => {
    setProps((prev) => ({ ...prev, [name]: value }));
  }, []);

  const onPick = useCallback(
    (name: string, file: File | null) => {
      // رابط واحد للملف يُستعمل في العرض وفي القالب معاً، ويُبطَل عند
      // الاستبدال. إنشاء رابطين لنفس الملف يسرّب أحدهما.
      const url = file
        ? URL.createObjectURL(file) + extensionSuffix(file.name)
        : null;

      setPicked((prev) => {
        const old = prev[name];
        if (old) URL.revokeObjectURL(old.url);
        if (!file || url === null) {
          const { [name]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [name]: { url, name: file.name } };
      });

      if (url === null) {
        set(name, undefined);
        if (name === "voiceover") setAudioSeconds(null);
        return;
      }

      set(name, url);
      if (name === "voiceover") {
        readAudioDuration(url)
          .then(setAudioSeconds)
          .catch(() => setAudioSeconds(null));
      }
    },
    [set],
  );

  const onSrt = useCallback(
    async (file: File | null) => {
      if (!file) {
        setSrtName(null);
        set("captions", []);
        return;
      }
      const captions = srtToCaptions(await file.text());
      setSrtName(file.name);
      set("captions", captions);
    },
    [set],
  );

  // المدة تُحسب بنفس الدالة التي يستعملها الرندر، فالمعاينة تطابق المخرج.
  useEffect(() => {
    let cancelled = false;
    void Promise.resolve(
      template.calculateMetadata({
        props: props as never,
        defaultProps: template.defaultProps as never,
        abortSignal: new AbortController().signal,
        compositionId: template.meta.id,
        isRendering: false,
      }),
    )
      .then((meta) => {
        const frames = meta?.durationInFrames;
        if (!cancelled && typeof frames === "number" && frames > 0) {
          setDuration(Math.ceil(frames));
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [props, template]);

  useEffect(
    () => () => {
      Object.values(picked).forEach((p) => URL.revokeObjectURL(p.url));
    },
    // التنظيف عند مغادرة المحرّر فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const captions = (props.captions ?? []) as Caption[];
  const checks = useMemo(
    () => runChecks(template.meta, captions, audioSeconds),
    [template.meta, captions, audioSeconds],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Field[]>();
    for (const f of fields) {
      if (f.kind === "unsupported") continue;
      const g = groupOf(f);
      map.set(g, [...(map.get(g) ?? []), f]);
    }
    return map;
  }, [fields]);

  return (
    <div className="editor">
      <aside className="controls">
        {GROUP_ORDER.map((groupName, index) => {
          const groupFields = grouped.get(groupName);
          if (!groupFields || groupFields.length === 0) return null;
          return (
            <details className="group" key={groupName} open={index < 3}>
              <summary>
                {groupName} <span className="count">({groupFields.length})</span>
              </summary>
              <div className="body">
                {groupName === "الصوت والتزامن" ? (
                  <>
                    <div className="field">
                      <label>ملف الترجمة SRT — منه تُشتقّ توقيتات الكلمات</label>
                      <div className="file-row">
                        <label className="btn ghost" style={{ fontSize: 13 }}>
                          اختر ملف SRT
                          <input
                            type="file"
                            accept=".srt,.vtt,text/plain"
                            style={{ display: "none" }}
                            onChange={(e) =>
                              void onSrt(e.target.files?.[0] ?? null)
                            }
                          />
                        </label>
                        {srtName ? (
                          <span className="file-name">{srtName}</span>
                        ) : (
                          <span className="file-empty">لا شيء</span>
                        )}
                      </div>
                    </div>
                    <div className="note">
                      هذا القالب يتوقع تقطيعاً على مستوى{" "}
                      <b>
                        {wantsWordLevel(template.meta) ? "الكلمة" : "الجملة"}
                      </b>
                      {audioSeconds !== null ? (
                        <>
                          {" "}· طول الصوت {audioSeconds.toFixed(2)} ثانية
                        </>
                      ) : null}
                    </div>
                    {checks.map((c, i) => (
                      <div className={`note ${c.severity}`} key={i}>
                        {c.text}
                      </div>
                    ))}
                  </>
                ) : null}

                {groupFields.map((field) => (
                  <FieldControl
                    key={field.name}
                    field={field}
                    value={props[field.name]}
                    set={set}
                    picked={picked[field.name]}
                    onPick={onPick}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </aside>

      <main className="stage">
        <div className="player-wrap">
          <Player
            component={template.component}
            inputProps={props}
            durationInFrames={duration}
            fps={template.meta.fps}
            compositionWidth={template.meta.width}
            compositionHeight={template.meta.height}
            style={{ width: "100%" }}
            controls
            loop
            acknowledgeRemotionLicense
          />
        </div>
        <div style={{ marginTop: 14, color: "var(--muted)", fontSize: 13 }}>
          {template.meta.nameAr} · {duration} فريم ·{" "}
          {(duration / template.meta.fps).toFixed(2)} ثانية
          <button
            className="btn ghost"
            style={{ marginInlineStart: 12 }}
            onClick={onBack}
          >
            ← رجوع للمعرض
          </button>
        </div>
      </main>
    </div>
  );
};
