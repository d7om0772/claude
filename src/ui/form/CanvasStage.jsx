import React, { useCallback, useEffect, useRef, useState } from "react";
import { mediaGeometry } from "./media-geometry.js";

/**
 * تحريك الطبقات بالماوس فوق المعاينة.
 *
 * الأرقام في الـ schema نسبٌ من الإطار، والمعاينة مقاس آخر — فكل ما يفعله
 * هذا الملف تحويل بين الاثنين: يرسم صندوقاً في إحداثيات المعاينة، ويكتب
 * النتيجة نسبةً. لذلك يبقى القالب جاهلاً بوجود محرّر أصلاً، وتعمل نفس القيم
 * في الرندر بأي مقاس.
 */

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

/** يتتبّع سحب المؤشّر ويعطي الإزاحة بالنسبة إلى مقاس المسرح. */
const useDrag = (stageRef, onMove) => {
  const state = useRef(null);
  const onPointerDown = useCallback(
    (event) => {
      const stage = stageRef.current;
      if (!stage) return;
      event.preventDefault();
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      const rect = stage.getBoundingClientRect();
      state.current = { x: event.clientX, y: event.clientY, rect };
    },
    [stageRef],
  );
  const onPointerMove = useCallback(
    (event) => {
      const start = state.current;
      if (!start) return;
      const dx = (event.clientX - start.x) / start.rect.width;
      const dy = (event.clientY - start.y) / start.rect.height;
      state.current = { ...start, x: event.clientX, y: event.clientY };
      onMove(dx, dy);
    },
    [onMove],
  );
  const stop = useCallback((event) => {
    state.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);
  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: stop,
    onPointerCancel: stop,
  };
};

const Handle = ({ label, title, ...handlers }) => (
  <div className="stage-handle" title={title} {...handlers}>
    {label}
  </div>
);

/**
 * صندوق قابل للتحريك والتحجيم.
 * المواضع بالنِّسب [0..1] من المسرح، فالمكوّن لا يعرف البكسلات إلا للعرض.
 */
const Box = ({
  stageRef,
  label,
  rect,
  onMove,
  onResize,
  onFontSize,
  active,
  onSelect,
}) => {
  const move = useDrag(stageRef, onMove);
  const resize = useDrag(stageRef, onResize);
  const font = useDrag(stageRef, onFontSize ?? (() => undefined));
  return (
    <div
      className={`stage-box${active ? " active" : ""}`}
      style={{
        left: `${rect.left * 100}%`,
        top: `${rect.top * 100}%`,
        width: `${rect.width * 100}%`,
        height: `${rect.height * 100}%`,
      }}
      onPointerDown={(e) => {
        onSelect();
        move.onPointerDown(e);
      }}
      onPointerMove={move.onPointerMove}
      onPointerUp={move.onPointerUp}
      onPointerCancel={move.onPointerCancel}
    >
      <span className="stage-label">{label}</span>
      <Handle label="⇲" title="اسحب لتغيير الحجم" {...resize} />
      {onFontSize ? (
        <div className="stage-font" title="اسحب لتغيير حجم الخط" {...font}>
          A
        </div>
      ) : null}
    </div>
  );
};

/** شريط عرض أفقي: للقوالب التي تسمح بتغيير العرض دون الموضع. */
const WidthBar = ({
  stageRef,
  label,
  widthRatio,
  onResize,
  active,
  onSelect,
}) => {
  const resize = useDrag(stageRef, onResize);
  return (
    <div
      className={`stage-box${active ? " active" : ""}`}
      style={{
        left: `${(1 - widthRatio) * 50}%`,
        width: `${widthRatio * 100}%`,
        top: "50%",
        height: "0px",
      }}
      onPointerDown={onSelect}
    >
      <span className="stage-label">{label}</span>
      <Handle label="⇔" title="اسحب لتغيير العرض" {...resize} />
    </div>
  );
};

export const CanvasStage = ({ props, set, meta, withText, children }) => {
  const stageRef = useRef(null);
  const [selected, setSelected] = useState("text");
  const [enabled, setEnabled] = useState(true);

  // إخفاء الأدلّة أثناء التشغيل يشوّش أقل، لكن إبقاءها يجعل الضبط أسرع —
  // فالقرار للمستخدم عبر مفتاح واحد.
  useEffect(() => {
    if (!enabled) setSelected(null);
  }, [enabled]);

  const media = mediaGeometry(props, meta);
  const apply = (patch) => {
    for (const [key, value] of Object.entries(patch)) set(key, value);
  };

  // ارتفاع كتلة النص تقديري: سطران بحجم الخط الحالي — يكفي كدليل سحب
  const textHeight = (props.fontSizeRatio * meta.width * 2.6) / meta.height;
  const textRect = {
    left: props.textCenterXRatio - props.textWidthRatio / 2,
    top: props.textCenterYRatio - textHeight / 2,
    width: props.textWidthRatio,
    height: textHeight,
  };

  const moveBy = (xKey, yKey, min, max) => (dx, dy) => {
    set(xKey, clamp(props[xKey] + dx, min, max));
    set(yKey, clamp(props[yKey] + dy, min, max));
  };

  return (
    <div className="stage-canvas" ref={stageRef}>
      {children}
      {enabled ? (
        <div className="stage-overlay">
          {media?.kind === "box" ? (
            <Box
              stageRef={stageRef}
              label={media.label}
              rect={media.rect}
              active={selected === "media"}
              onSelect={() => setSelected("media")}
              onMove={(dx, dy) => apply(media.onMove(dx, dy))}
              onResize={(dx, dy) => apply(media.onResize(dx, dy))}
            />
          ) : null}
          {media?.kind === "width" ? (
            <WidthBar
              stageRef={stageRef}
              label={media.label}
              widthRatio={media.widthRatio}
              active={selected === "media"}
              onSelect={() => setSelected("media")}
              onResize={(dx, dy) => apply(media.onResize(dx, dy))}
            />
          ) : null}
          {withText ? (
            <Box
              stageRef={stageRef}
              label="النص"
              rect={textRect}
              active={selected === "text"}
              onSelect={() => setSelected("text")}
              onMove={moveBy("textCenterXRatio", "textCenterYRatio", 0, 1)}
              onResize={(dx) =>
                set(
                  "textWidthRatio",
                  clamp(props.textWidthRatio + dx * 2, 0.2, 1),
                )
              }
              onFontSize={(_dx, dy) =>
                set(
                  "fontSizeRatio",
                  clamp(props.fontSizeRatio + dy * 0.25, 0.02, 0.2),
                )
              }
            />
          ) : null}
        </div>
      ) : null}
      <button
        type="button"
        className="btn ghost tiny stage-toggle"
        onClick={() => setEnabled((v) => !v)}
      >
        {enabled ? "إخفاء أدلّة التحريك" : "إظهار أدلّة التحريك"}
      </button>
    </div>
  );
};
