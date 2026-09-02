import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { registerBlob, unregisterBlob } from "./blob-source.js";
import { describeSchema } from "../lib/schema-introspect.js";
import { srtToCaptions } from "../lib/srt.js";
import {
  MAX_WORDS_PER_CUE,
  cuesFromSrt,
  srtGranularity,
} from "./form/srt-cues.js";
import { FieldControl } from "./form/Fields.jsx";
import { Scenes } from "./form/Scenes.jsx";
import { CanvasStage } from "./form/CanvasStage.jsx";
import { WordLines } from "./form/WordLines.jsx";
import { mediaGeometry } from "./form/media-geometry.js";
import { setIn } from "./form/paths.js";
import {
  readAudioDuration,
  readMediaAspect,
  runChecks,
  wantsWordLevel,
} from "./sync.js";
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
  // كل ما يخصّ المقطع المرفق والشعار مع ملفه: كتم الصوت خاصةً كان يهبط في
  // «التخطيط والحركة» فيبحث عنه المستخدم في المكان الخطأ. الألوان تُفحص
  // قبله لأن mutedFontColor لون لا إعداد وسائط
  if (/^(media|mute|logo)/iu.test(field.name)) return "الوسائط والشعار";
  if (
    field.kind === "text" ||
    field.kind === "textarea" ||
    field.kind === "objectList"
  ) {
    return "النصوص";
  }
  return "التخطيط والحركة";
};
const SCENES_GROUP = "اللقطات";
const WORDS_GROUP = "الكلمات";
const GROUP_ORDER = [
  SCENES_GROUP,
  WORDS_GROUP,
  "النصوص",
  "الألوان",
  "الصوت والتزامن",
  "الوسائط والشعار",
  "التخطيط والحركة",
];
const TEXT_STYLES = [
  { value: "karaoke", label: "تراكم", hint: "الكلمات تتراكم والنشطة داكنة" },
  { value: "pop", label: "قفزة", hint: "كل كلمة تكبر في مكانها" },
  { value: "kinetic", label: "سطر متحرك", hint: "سطر واحد ينزلق مع الكلمة" },
  { value: "boxed", label: "شريط", hint: "الكلمة النشطة على شريط ملوّن" },
  {
    value: "highlight",
    label: "تظليل",
    hint: "الجملة كلها ظاهرة، والنشطة تتلوّن — كاريوكي الأغاني",
  },
  { value: "underline", label: "تسطير", hint: "خط ملوّن تحت الكلمة النشطة" },
  { value: "slide", label: "انزلاق", hint: "الكلمة تصعد من خلف قناع" },
  { value: "stack", label: "تراص عمودي", hint: "كل كلمة في سطر مستقل" },
  {
    value: "oneWord",
    label: "كلمة واحدة",
    hint: "كلمة واحدة كبيرة في كل لحظة",
  },
  { value: "gradient", label: "تدرّج", hint: "تدرّج لوني على الكلمة النشطة" },
];

const MEDIA_STYLES = [
  { value: "plain", label: "بلا زخرفة", hint: "المقطع كما هو" },
  { value: "shadow", label: "ظل", hint: "ظل ناعم يرفعه عن الخلفية" },
  { value: "frame", label: "إطار", hint: "حدّ بلون الإبراز" },
  { value: "polaroid", label: "بولارويد", hint: "هامش أبيض عريض وظل" },
  { value: "tilt", label: "ميلان", hint: "ميلان خفيف كصورة ملقاة" },
  {
    value: "offset",
    label: "بطاقة خلفه",
    hint: "بطاقة ملوّنة مزاحة خلف المقطع",
  },
  { value: "circle", label: "دائرة", hint: "يُقصّ في دائرة" },
  { value: "zoom", label: "تكبير بطيء", hint: "زحف تكبير عبر اللقطة" },
];

const REVEAL_MODES = [
  { value: "word", label: "كلمة كلمة", hint: "كل كلمة تظهر في وقتها" },
  {
    value: "cue",
    label: "جملة كاملة",
    hint: "كلمات المقطع تظهر معاً، فتتحكم بتوقيت كل جملة وحدها",
  },
];

/** صفّ أزرار اختيار — بديل القائمة المنسدلة حين تكون الخيارات قليلة ومرئية. */
const ChipRow = ({ label, hint, options, value, onPick }) => (
  <div className="field">
    <label>{label}</label>
    <div className="style-picker">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          title={option.hint}
          className={`style-chip${value === option.value ? " active" : ""}`}
          onClick={() => onPick(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
    {hint ? <p className="field-hint">{hint}</p> : null}
  </div>
);

/**
 * المسرح يلفّ المعاينة في كل قالب يصف هندسة مقطعه — لا في الاستوديو وحده:
 * تكبير المقطع بالماوس مطلوب في القوالب الجاهزة كذلك. كتلة النص تبقى
 * للاستوديو لأنها وحدها من يملك موضعاً حرّاً للنص.
 */
const StageWrap = ({ studio, props, set, meta, children }) =>
  mediaGeometry(props, meta) === null && !studio ? (
    children
  ) : (
    <CanvasStage props={props} set={set} meta={meta} withText={studio}>
      {children}
    </CanvasStage>
  );

export const Editor = ({ template, onBack, serverUp, onQueued }) => {
  const fields = useMemo(() => describeSchema(template.schema), [template]);
  const [props, setProps] = useState(() => ({ ...template.defaultProps }));
  const [picked, setPicked] = useState({});
  const [srtName, setSrtName] = useState(null);
  const [srtKind, setSrtKind] = useState(null);
  const [srtText, setSrtText] = useState(null);
  /**
   * كلمات السطر الواحد عند الاستيراد.
   *
   * حالةُ محرّر لا خاصية قالب: الناتج المحفوظ هو المقاطع نفسها، فلو خزّنّاه
   * في props لصار رقماً لا يقرؤه القالب ويوهم بأنه يؤثر في الرندر.
   */
  const [wordsPerCue, setWordsPerCue] = useState(4);
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
  /**
   * يسجّل ملفاً مرفوعاً تحت مفتاح المسار ويعيد رابطه، ولا يكتب في props.
   *
   * الكتابة متروكة لمن نادى، لأن الحقل قد يكون متداخلاً
   * (`scenes.2.media.src`) فيضعه أبوه في موضعه بنفسه. أما التسجيل — إبطال
   * الرابط القديم وربط الملف بالذاكرة — فمركزي هنا حتى لا يتسرّب رابط.
   */
  const pickAsset = useCallback(
    (key, file) => {
      const url = file
        ? URL.createObjectURL(file) + extensionSuffix(file.name)
        : null;
      // يقرأ منه محرّك الوسائط مباشرة؛ بلا هذا يفشل fetch على blob: بالسياسة
      if (url && file) registerBlob(url, file);
      setPicked((prev) => {
        const old = prev[key];
        if (old) {
          URL.revokeObjectURL(old.url);
          unregisterBlob(old.url);
        }
        if (!file || url === null) {
          const { [key]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [key]: { url, name: file.name, file } };
      });
      // القوالب التي تعرض المقطع بنسبته الطبيعية تحتاج النسبة قيمةً في props،
      // فتُقاس هنا مرة بدل قراءة غير متزامنة داخل القالب في كل فريم.
      if (key === "media" && "mediaAspect" in template.defaultProps) {
        if (url === null) {
          set("mediaAspect", null);
        } else {
          readMediaAspect(url)
            .then((value) => set("mediaAspect", value))
            .catch(() => set("mediaAspect", null));
        }
      }
      if (key === "voiceover") {
        if (url === null) {
          setAudioSeconds(null);
        } else {
          readAudioDuration(url)
            .then(setAudioSeconds)
            .catch(() => setAudioSeconds(null));
        }
      }
      return url;
    },
    [set, template.defaultProps],
  );

  const pickedAt = useCallback((key) => picked[key], [picked]);

  const captionField = useMemo(
    () => fields.find((f) => f.kind === "captions"),
    [fields],
  );
  const studio = template.meta.kind === "studio";
  const sceneField = useMemo(
    () =>
      fields.find(
        (f) =>
          f.name === "scenes" &&
          f.kind === "objectList" &&
          (f.itemFields ?? []).some((s) => s.name === "media"),
      ),
    [fields],
  );
  const sceneBased = Boolean(sceneField && captionField);
  const wordTimed = useMemo(
    () =>
      (captionField?.itemFields ?? []).some((f) => f.name === "wordStartsMs"),
    [captionField],
  );
  /**
   * محرّر الكلمات ليس حكراً على الاستوديو: كل قالب مقاطعُه كلماتٌ مفردة
   * ويجمعها أسطراً بعدد ثابت يستحقّ الصناديق نفسها — فما يراه المستخدم في
   * اللوحة يصير سطر الفيديو نفسه بدل قائمة مقاطع لا شكل لها.
   */
  const perLineField = useMemo(
    () => fields.find((f) => f.name === "wordsPerLine"),
    [fields],
  );
  const wordCueTemplate =
    !studio && wantsWordLevel(template.meta) && perLineField !== undefined;
  /**
   * القوالب التي مقاطعها أسطرٌ من كلمات — يُعرف ذلك بوجود `wordStartsMs` في
   * مقطعها — تُحرَّر بنفس الصناديق: السطر مقطع، وأطواله تختلف كما يشاء
   * المستخدم. القوالب المبنية على لقطات مستثناة لأن لكل لقطة كابشنها.
   */
  const lineCueTemplate = !studio && !sceneBased && wordTimed;
  const wordEditor = studio || wordCueTemplate || lineCueTemplate;

  // «جملة كاملة» تعرض كلمات المقطع معاً، فلا معنى لتقطيعها إلى أسطر
  const cueOptions = useMemo(
    () => ({
      maxWords:
        props.revealMode === "cue" ? Number.POSITIVE_INFINITY : wordsPerCue,
    }),
    [props.revealMode, wordsPerCue],
  );

  const onSrt = useCallback(
    async (file) => {
      if (!file) {
        setSrtName(null);
        setSrtKind(null);
        setSrtText(null);
        set("captions", []);
        return;
      }
      const text = await file.text();
      setSrtText(text);
      // القوالب التي توقّت كل كلمة تحتاج تجميع ملفات مستوى الكلمة في مقاطع؛
      // غيرها يأخذ المقاطع كما هي في الملف.
      const captions = wordTimed
        ? cuesFromSrt(text, cueOptions)
        : srtToCaptions(text);
      setSrtKind(srtGranularity(text));
      setSrtName(`${file.name} — ${captions.length} مقاطع`);
      set("captions", captions);
    },
    [set, wordTimed, cueOptions],
  );

  /**
   * إعادة الاشتقاق عند تبديل طريقة الكشف.
   *
   * سقف الكلمات جزء من الطريقة لا من الملف: «كلمة كلمة» تريد مقاطع قصيرة،
   * و«جملة كاملة» تريد الجملة كما هي. بلا هذا يعتمد الناتج على ترتيب النقر —
   * استورد ثم بدّل، أو بدّل ثم استورد — وهو فخّ صامت.
   */
  useEffect(() => {
    if (srtText === null || !wordTimed) return;
    set("captions", cuesFromSrt(srtText, cueOptions));
    // الاشتقاق يتبع الملف والطريقة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // تبديل الطريقة وحده يعيد الاشتقاق؛ عدد كلمات السطر يعيد التوزيع على
    // الكلمات الموجودة في محرّرها، فلا يمحو التحرير اليدوي
  }, [srtText, props.revealMode, wordTimed]);
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
    () => runChecks(template.meta, captions, audioSeconds, srtKind, wordTimed),
    [template.meta, captions, audioSeconds, srtKind, wordTimed],
  );
  /**
   * قالب مشهدي: عنده مصفوفة مشاهد ومصفوفة كابشن معاً. عندها يُعرض محرّر
   * اللقطات بدل الحقلين الخامين، لأن عرضهما منفصلين يجبر المستخدم على مطابقة
   * توقيتات الكابشن بالمشاهد يدوياً.
   */
  const sceneMediaSrc = useMemo(
    () =>
      (sceneField?.itemFields ?? [])
        .find((f) => f.name === "media")
        ?.itemFields?.find((f) => f.name === "src"),
    [sceneField],
  );
  const captionStyles = useMemo(() => {
    const styleField = (captionField?.itemFields ?? []).find(
      (f) => f.name === "style",
    );
    return styleField?.options ?? [];
  }, [captionField]);

  const grouped = useMemo(() => {
    const map = new Map();
    // مجموعة الكلمات في الاستوديو ليست حقلاً في الـ schema: محرّرها يبني
    // مصفوفة المقاطع من كلمات مفردة، فتُفتح لها مجموعة صريحة بدل دفنها بين
    // الحقول — وهناك ضاعت على المستخدم فعلاً.
    if (wordEditor) map.set(WORDS_GROUP, []);
    for (const f of fields) {
      if (f.kind === "unsupported") continue;
      if (sceneBased && (f.name === "scenes" || f.kind === "captions")) {
        map.set(SCENES_GROUP, [...(map.get(SCENES_GROUP) ?? []), f]);
        continue;
      }
      const g = groupOf(f);
      map.set(g, [...(map.get(g) ?? []), f]);
    }
    return map;
  }, [fields, sceneBased, wordEditor]);
  return (
    <div className="editor">
      <aside className="controls">
        {GROUP_ORDER.map((groupName, index) => {
          const groupFields = grouped.get(groupName);
          // مجموعة الكلمات محرّرها مرسوم يدوياً لا من حقول الـ schema، فشرط
          // «لا حقول ⇐ لا مجموعة» كان يحذفها بالكامل.
          const ownRows = groupName === WORDS_GROUP ? captions.length : 0;
          if (
            !groupFields ||
            (groupFields.length === 0 &&
              ownRows === 0 &&
              groupName !== WORDS_GROUP)
          )
            return null;
          return (
            <details className="group" key={groupName} open={index < 3}>
              <summary>
                {groupName}{" "}
                <span className="count">
                  ({groupName === WORDS_GROUP ? ownRows : groupFields.length})
                </span>
              </summary>
              <div className="body">
                {groupName === WORDS_GROUP ? (
                  <>
                    <div className="field">
                      <label>ملف الترجمة SRT</label>
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
                          <span className="file-empty">
                            لا شيء — أضف الكلمات يدوياً
                          </span>
                        )}
                      </div>
                    </div>
                    <WordLines
                      cues={captions}
                      setCues={(next) => set("captions", next)}
                      perLine={
                        wordCueTemplate
                          ? (props.wordsPerLine ?? 1)
                          : wordsPerCue
                      }
                      setPerLine={(n) =>
                        wordCueTemplate
                          ? set("wordsPerLine", n)
                          : setWordsPerCue(n)
                      }
                      perWordTiming={
                        studio
                          ? props.revealMode === "word"
                          : wantsWordLevel(template.meta)
                      }
                      styles={studio ? TEXT_STYLES : []}
                      showPosition={studio}
                      defaultStyle={props.textStyle}
                      granularity={wordCueTemplate ? "word" : "line"}
                      perLineMin={
                        wordCueTemplate ? (perLineField?.min ?? 1) : 1
                      }
                      perLineMax={
                        wordCueTemplate ? (perLineField?.max ?? 10) : 10
                      }
                    />
                  </>
                ) : null}

                {studio && groupName === "النصوص" ? (
                  <>
                    <ChipRow
                      label="ستايل كشف الكلمات"
                      options={TEXT_STYLES}
                      value={props.textStyle}
                      onPick={(v) => set("textStyle", v)}
                    />
                    <ChipRow
                      label="طريقة الكشف"
                      hint="حرّك المقطع والنص بالماوس فوق المعاينة، واسحب مقبض الزاوية للحجم و«A» لحجم الخط."
                      options={REVEAL_MODES}
                      value={props.revealMode}
                      onPick={(v) => set("revealMode", v)}
                    />
                  </>
                ) : null}

                {studio && groupName === "الوسائط والشعار" ? (
                  <ChipRow
                    label="ستايل المقطع"
                    options={MEDIA_STYLES}
                    value={props.mediaStyle}
                    onPick={(v) => set("mediaStyle", v)}
                  />
                ) : null}

                {groupName === SCENES_GROUP ? (
                  <Scenes
                    scenes={props.scenes ?? []}
                    captions={captions}
                    styles={captionStyles}
                    setScenes={(v) => set("scenes", v)}
                    setCaptions={(v) => set("captions", v)}
                    accept={sceneMediaSrc?.accept ?? "video/*"}
                    pickedAt={pickedAt}
                    pickAsset={pickAsset}
                  />
                ) : null}

                {groupName === "النصوص" && textOverriddenByCaptions ? (
                  <div className="note warn">
                    <b>هذه الحقول لا تظهر الآن.</b> الكابشن ممتلئ (
                    {captions.length} مقاطع) والكلمات المعروضة تأتي منه. عدّلها
                    من قسم «{wordEditor ? WORDS_GROUP : "الصوت والتزامن"}»، أو
                    امسح الكابشن ليظهر النص من هنا.
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
                    {/* لمن له محرّر كلمات: صفّ الاستيراد هناك، فتكراره هنا
                        زرّان لعمل واحد */}
                    {wordEditor ? null : (
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
                    )}
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

                {/* في الاستوديو تُعرض هذه الحقول بأدوات خاصة أعلاه، فرسمها
                    خاماً هنا يعني نسختين من الشيء نفسه تتعارضان */}
                {(groupName === SCENES_GROUP
                  ? []
                  : groupFields.filter(
                      (f) =>
                        !(
                          (studio &&
                            ["textStyle", "revealMode", "mediaStyle"].includes(
                              f.name,
                            )) ||
                          (wordEditor && f.kind === "captions") ||
                          (wordCueTemplate && f.name === "wordsPerLine")
                        ),
                    )
                ).map((field) => (
                  <FieldControl
                    key={field.name}
                    field={field}
                    value={props[field.name]}
                    set={set}
                    pickedAt={pickedAt}
                    pickAsset={pickAsset}
                  />
                ))}
              </div>
            </details>
          );
        })}
      </aside>

      <main className="stage">
        <div className="player-wrap">
          <StageWrap
            studio={studio}
            props={props}
            set={set}
            meta={template.meta}
          >
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
          </StageWrap>
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
