import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { describeSchema } from "../lib/schema-introspect.js";
import { srtToCaptions } from "../lib/srt.js";
import { FieldControl } from "./form/Fields.jsx";
import { readAudioDuration, runChecks, wantsWordLevel } from "./sync.js";
import { submitRender } from "./render.js";
import { pickOutputFormat, renderInBrowser } from "./web-render.js";
import { saveFile } from "./save-file.js";
/**
 * مسار blob بلا امتداد، والقوالب تميّز الفيديو من الصورة بالامتداد — فبدون
 * لاحقة يُعرض أي فيديو مرفوع كصورة ثابتة ولا تُحتسب مدّته. الجزء بعد # لا
 * يدخل في البحث عن الـ blob فيبقى الرابط صالحاً، ويكفي أدوات الاكتشاف.
 */
/**
 * رسائل فشل الرندر في المتصفح تأتي بالإنجليزية ومصطلحات ترميز. نترجم أشهرها
 * إلى سبب وحلّ، ونُبقي الأصل ملحقاً لمن يريد التفاصيل.
 */
const describeRenderFailure = (err) => {
  const raw = err?.message ?? String(err);

  if (/could not be decoded|DEMUXER_ERROR|no supported stream/iu.test(raw)) {
    return (
      "متصفحك لا يستطيع فكّ ترميز الفيديو المرفق. جرّب مقطعاً بترميز " +
      "H.264 داخل mp4، أو VP9 داخل webm — وهما الأوسع دعماً. " +
      `(${raw.slice(0, 120)})`
    );
  }

  if (
    /WebCodecs|VideoEncoder|not supported in @remotion\/web-renderer/iu.test(
      raw,
    )
  ) {
    return `متصفحك لا يدعم الترميز داخل الصفحة. جرّب كروم أو إيدج حديثاً. (${raw.slice(0, 120)})`;
  }

  return raw;
};

const extensionSuffix = (fileName) => {
  const dot = fileName.lastIndexOf(".");
  return dot > 0 ? `#${fileName.slice(dot)}` : "";
};
/**
 * تقسيم الحقول إلى مجموعات مفهومة. الترتيب مقصود: ما يعدّله المستخدم كثيراً
 * أولاً (المحتوى، الألوان، الصوت)، وضبط التخطيط والحركة في النهاية مطوياً.
 */
const groupOf = (field) => {
  if (field.name === "voiceover" || field.kind === "captions") {
    return "الصوت والتزامن";
  }
  if (field.kind === "asset") return "الوسائط والشعار";
  if (field.kind === "color") return "الألوان";
  if (
    field.kind === "text" ||
    field.kind === "textarea" ||
    field.kind === "objectList"
  ) {
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
];
export const Editor = ({ template, onBack, serverUp, onQueued }) => {
  const fields = useMemo(() => describeSchema(template.schema), [template]);
  const [props, setProps] = useState(() => ({ ...template.defaultProps }));
  const [picked, setPicked] = useState({});
  const [srtName, setSrtName] = useState(null);
  const [audioSeconds, setAudioSeconds] = useState(null);
  const [duration, setDuration] = useState(
    template.meta.defaultDurationInFrames,
  );
  const [submitting, setSubmitting] = useState(false);
  const [renderError, setRenderError] = useState(null);
  // الرندر في المتصفح: تقدّم من ٠ إلى ١، وnull حين لا يجري رندر
  const [webProgress, setWebProgress] = useState(null);
  const [webNote, setWebNote] = useState(null);
  const set = useCallback((name, value) => {
    setProps((prev) => ({ ...prev, [name]: value }));
  }, []);
  const onPick = useCallback(
    (name, file) => {
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
        return { ...prev, [name]: { url, name: file.name, file } };
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
    async (file) => {
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
        props: props,
        defaultProps: template.defaultProps,
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
  const onRender = useCallback(() => {
    setSubmitting(true);
    setRenderError(null);
    submitRender(template.meta.id, props, picked)
      .then(() => onQueued())
      .catch((err) =>
        setRenderError(err instanceof Error ? err.message : String(err)),
      )
      .finally(() => setSubmitting(false));
  }, [template.meta.id, props, picked, onQueued]);
  /**
   * الرندر داخل المتصفح — الطريق حين لا يكون خلف الصفحة خادم.
   * أبطأ ويشغّل تبويب المستخدم، لذلك نُبقيه صريحاً لا تلقائياً.
   */
  const onBrowserRender = useCallback(async () => {
    setRenderError(null);
    setWebNote(null);
    setWebProgress(0);
    try {
      const format = await pickOutputFormat({
        width: template.meta.width,
        height: template.meta.height,
        muted: false,
      });
      if (!format) {
        throw new Error(
          "متصفحك لا يدعم الترميز داخل الصفحة (WebCodecs). جرّب كروم أو إيدج حديثاً.",
        );
      }
      const { blob, extension } = await renderInBrowser({
        template,
        props,
        format,
        onProgress: ({ progress }) => setWebProgress(progress),
      });
      const message = await saveFile(`${template.meta.id}.${extension}`, blob);
      setWebNote(
        `${message} — ${(blob.size / 1024 / 1024).toFixed(2)} م.ب بصيغة ${extension}`,
      );
    } catch (err) {
      setRenderError(describeRenderFailure(err));
    } finally {
      setWebProgress(null);
    }
  }, [template, props]);

  const captions = props.captions ?? [];

  /**
   * بعض القوالب تجعل حقول النص احتياطية خلف الكابشن: لو كان فيه مقطع واحد
   * على الأقل فالكلمات تأتي منه، وتعديل «النص الرئيسي» لا يغيّر شيئاً.
   * مؤلّفو القوالب وثّقوا ذلك في وصف الحقل، فنكتشفه من وصفهم لا بتخمين.
   */
  const textOverriddenByCaptions = useMemo(
    () =>
      captions.length > 0 &&
      fields.some(
        (f) =>
          f.kind !== "captions" && /captions|ترجمة/u.test(f.description ?? ""),
      ),
    [captions.length, fields],
  );
  const checks = useMemo(
    () => runChecks(template.meta, captions, audioSeconds),
    [template.meta, captions, audioSeconds],
  );
  const grouped = useMemo(() => {
    const map = new Map();
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
                {groupName}{" "}
                <span className="count">({groupFields.length})</span>
              </summary>
              <div className="body">
                {groupName === "النصوص" && textOverriddenByCaptions ? (
                  <div className="note warn">
                    <b>هذه الحقول لا تظهر الآن.</b> الكابشن ممتلئ (
                    {captions.length} مقاطع) والكلمات المعروضة تأتي منه. عدّلها
                    من قسم «الصوت والتزامن»، أو امسح الكابشن ليظهر النص من هنا.
                    <div style={{ marginTop: 8 }}>
                      <button
                        type="button"
                        className="btn ghost"
                        style={{ padding: "4px 12px", fontSize: 12 }}
                        onClick={() => set("captions", [])}
                      >
                        مسح الكابشن واستعمال النص
                      </button>
                    </div>
                  </div>
                ) : null}

                {groupName === "الصوت والتزامن" ? (
                  <>
                    <div className="field">
                      <label>
                        ملف الترجمة SRT — منه تُشتقّ توقيتات الكلمات
                      </label>
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
                        <> · طول الصوت {audioSeconds.toFixed(2)} ثانية</>
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
        <div className="render-bar">
          <span style={{ color: "var(--muted)", fontSize: 13 }}>
            {duration} فريم · {(duration / template.meta.fps).toFixed(2)} ثانية
          </span>

          {serverUp === true ? (
            <button
              className="btn primary"
              onClick={onRender}
              disabled={submitting}
            >
              {submitting ? "جارٍ الإرسال …" : "رندر"}
            </button>
          ) : null}

          {serverUp !== true ? (
            <button
              className="btn primary"
              onClick={onBrowserRender}
              disabled={webProgress !== null}
            >
              {webProgress === null
                ? "رندر في المتصفح"
                : `يُرندر… ${Math.round(webProgress * 100)}%`}
            </button>
          ) : null}

          <button className="btn ghost" onClick={onBack}>
            ← رجوع للمعرض
          </button>
        </div>
        {webProgress !== null ? (
          <div className="bar" style={{ marginTop: 12, width: 300 }}>
            <span style={{ width: `${Math.round(webProgress * 100)}%` }} />
          </div>
        ) : null}
        {webNote ? (
          <div className="note good" style={{ marginTop: 10, maxWidth: 420 }}>
            {webNote}
          </div>
        ) : null}
        {renderError ? (
          <div className="note bad" style={{ marginTop: 10, maxWidth: 420 }}>
            {renderError}
          </div>
        ) : null}
      </main>
    </div>
  );
};
