import React from "react";
import { joinPath } from "./paths.js";
const asString = (v, fallback = "") => (typeof v === "string" ? v : fallback);
/** hex فقط هو ما يقبله <input type="color">؛ غيره (rgba مثلاً) يُحرَّر نصياً. */
const hexOrNull = (v) =>
  /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? v.trim() : null;
const ColorField = ({ field, value, set }) => {
  const text = asString(value);
  const hex = hexOrNull(text);
  return (
    <div className="field">
      <label>{field.label}</label>
      <div className="color-row">
        <input
          type="color"
          value={hex ?? "#000000"}
          onChange={(e) => set(field.name, e.target.value)}
          title={hex ? undefined : "القيمة الحالية ليست hex — حرّرها نصياً"}
        />
        <input
          type="text"
          value={text}
          onChange={(e) => set(field.name, e.target.value)}
          dir="ltr"
        />
      </div>
    </div>
  );
};
const TextField = ({ field, value, set }) => {
  const text = asString(value);
  const over = field.maxLength !== undefined && text.length > field.maxLength;
  return (
    <div className="field">
      <label>
        {field.label}
        {field.maxLength !== undefined ? (
          <span style={{ color: over ? "var(--danger)" : "inherit" }}>
            {" "}
            ({text.length}/{field.maxLength})
          </span>
        ) : null}
      </label>
      {field.kind === "textarea" ? (
        <textarea
          value={text}
          onChange={(e) => set(field.name, e.target.value)}
        />
      ) : (
        <input
          type="text"
          value={text}
          onChange={(e) => set(field.name, e.target.value)}
        />
      )}
    </div>
  );
};
const NumberField = ({ field, value, set }) => {
  const num = typeof value === "number" ? value : 0;
  const bounded = field.min !== undefined && field.max !== undefined;
  return (
    <div className="field">
      <label>{field.label}</label>
      {bounded ? (
        <div className="slider-row">
          <input
            type="range"
            min={field.min}
            max={field.max}
            step={field.step ?? 0.001}
            value={num}
            onChange={(e) => set(field.name, Number(e.target.value))}
          />
          <span className="val">{Number(num.toFixed(4))}</span>
        </div>
      ) : (
        <input
          type="number"
          step={field.step ?? 1}
          value={num}
          onChange={(e) => set(field.name, Number(e.target.value))}
        />
      )}
    </div>
  );
};
const BooleanField = ({ field, value, set }) => (
  <div className="field">
    <label className="switch">
      <input
        type="checkbox"
        checked={value === true}
        onChange={(e) => set(field.name, e.target.checked)}
      />
      <span>{field.label}</span>
    </label>
  </div>
);
const EnumField = ({ field, value, set }) => (
  <div className="field">
    <label>{field.label}</label>
    <select
      value={asString(value)}
      onChange={(e) => set(field.name, e.target.value)}
    >
      {(field.options ?? []).map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </div>
);
const AssetField = ({ field, value, set, path, picked, pickAsset }) => {
  const choose = (file) => {
    const url = pickAsset(path, file);
    set(field.name, url ?? undefined);
  };
  return (
    <div className="field">
      <label>{field.label}</label>
      <div className="file-row">
        <label className="btn ghost" style={{ fontSize: 13 }}>
          اختر ملفاً
          <input
            type="file"
            accept={field.accept}
            style={{ display: "none" }}
            onChange={(e) => choose(e.target.files?.[0] ?? null)}
          />
        </label>
        {picked ? (
          <>
            <span className="file-name">{picked.name}</span>
            <button
              type="button"
              className="icon-btn"
              title="إزالة"
              onClick={() => choose(null)}
            >
              ✕
            </button>
          </>
        ) : (
          <span className="file-empty">
            {value ? asString(value) : "لا شيء — القالب يعمل بدونه"}
          </span>
        )}
      </div>
    </div>
  );
};
const NumberListField = ({ field, value, set }) => {
  const list = Array.isArray(value) ? value : [];
  return (
    <div className="field">
      <label>{field.label}</label>
      <div className="num-list">
        {list.map((n, i) => (
          <span className="chip" key={`${i}-${n}`}>
            {n}
            <button
              type="button"
              className="icon-btn"
              onClick={() =>
                set(
                  field.name,
                  list.filter((_, j) => j !== i),
                )
              }
            >
              ✕
            </button>
          </span>
        ))}
        <button
          type="button"
          className="btn ghost"
          style={{ padding: "3px 10px", fontSize: 12 }}
          onClick={() => set(field.name, [...list, list.length])}
        >
          + إضافة
        </button>
      </div>
    </div>
  );
};
/** عنصر فارغ مطابق لشكل الحقول — الأرقام صفر والمنطقيات false. */
const blankFromFields = (fields) =>
  Object.fromEntries(
    fields.map((f) => {
      if (f.kind === "boolean") return [f.name, false];
      if (f.kind === "number") return [f.name, f.min ?? 0];
      if (f.kind === "object") return [f.name, null];
      if (f.kind === "objectList" || f.kind === "numberList")
        return [f.name, []];
      if (f.kind === "enum") return [f.name, (f.options ?? [""])[0]];
      return [f.name, ""];
    }),
  );

const ObjectListField = ({ field, value, set, path, pickedAt, pickAsset }) => {
  const items = Array.isArray(value) ? value : [];
  const itemFields = field.itemFields ?? [];
  const update = (index, key, v) =>
    set(
      field.name,
      items.map((it, i) => (i === index ? { ...it, [key]: v } : it)),
    );
  const blank = () => blankFromFields(itemFields);
  return (
    <div className="field">
      <label>{field.label}</label>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map((item, i) => (
          <div className="obj-item" key={i}>
            <div className="obj-head">
              <span>عنصر {i + 1}</span>
              <button
                type="button"
                className="icon-btn"
                onClick={() =>
                  set(
                    field.name,
                    items.filter((_, j) => j !== i),
                  )
                }
              >
                ✕
              </button>
            </div>
            {itemFields.map((sub) => (
              <FieldControl
                key={sub.name}
                field={sub}
                value={item[sub.name]}
                set={(k, v) => update(i, k, v)}
                path={joinPath(joinPath(path, i), sub.name)}
                pickedAt={pickedAt}
                pickAsset={pickAsset}
              />
            ))}
          </div>
        ))}
        <button
          type="button"
          className="btn ghost"
          style={{ padding: "5px 12px", fontSize: 13 }}
          onClick={() => set(field.name, [...items, blank()])}
        >
          + سطر جديد
        </button>
      </div>
    </div>
  );
};
/**
 * الكابشن قابل للتحرير هنا لا للعرض فقط.
 *
 * في القوالب التي يعرض فيها الكابشن كلمات الفيديو، يكون حقل «النص الرئيسي»
 * احتياطياً لا يظهر إلا حين يفرغ الكابشن. فلو بقي الكابشن للقراءة فقط، صار
 * النص غير قابل للتغيير إطلاقاً من الواجهة.
 */
const CaptionsField = ({ field, value, set }) => {
  const list = Array.isArray(value) ? value : [];

  const update = (index, key, raw) =>
    set(
      field.name,
      list.map((c, i) => (i === index ? { ...c, [key]: raw } : c)),
    );

  const updateTime = (index, key, seconds) => {
    const ms = Math.max(0, Math.round(Number(seconds) * 1000));
    update(index, key, Number.isFinite(ms) ? ms : 0);
  };

  const addRow = () => {
    const last = list[list.length - 1];
    const startMs = last ? last.endMs : 0;
    set(field.name, [...list, { text: "كلمة", startMs, endMs: startMs + 500 }]);
  };

  return (
    <div className="field">
      <label>
        {field.label} ({list.length})
      </label>

      {list.length === 0 ? (
        <div className="note">
          فارغ — يظهر النص الرئيسي بدله. ارفع ملف SRT من قسم «الصوت والتزامن»،
          أو أضف مقاطع يدوياً.
        </div>
      ) : (
        <>
          <div className="note">
            هذه الكلمات هي ما يظهر في الفيديو. ما دام هنا مقطع واحد على الأقل،
            فحقل النص الرئيسي لا يظهر.
          </div>
          <div className="caption-list">
            {list.map((c, i) => (
              <div className="caption-edit" key={i}>
                <input
                  type="text"
                  value={c.text}
                  onChange={(e) => update(i, "text", e.target.value)}
                />
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  dir="ltr"
                  title="بداية بالثواني"
                  value={(c.startMs / 1000).toFixed(2)}
                  onChange={(e) => updateTime(i, "startMs", e.target.value)}
                />
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  dir="ltr"
                  title="نهاية بالثواني"
                  value={(c.endMs / 1000).toFixed(2)}
                  onChange={(e) => updateTime(i, "endMs", e.target.value)}
                />
                <button
                  type="button"
                  className="icon-btn"
                  title="حذف المقطع"
                  onClick={() =>
                    set(
                      field.name,
                      list.filter((_, j) => j !== i),
                    )
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          className="btn ghost"
          style={{ padding: "4px 12px", fontSize: 12 }}
          onClick={addRow}
        >
          + مقطع
        </button>
        {list.length > 0 ? (
          <button
            type="button"
            className="btn ghost"
            style={{ padding: "4px 12px", fontSize: 12 }}
            onClick={() => set(field.name, [])}
            title="يُفرغ الكابشن فيظهر النص الرئيسي بدله"
          >
            مسح الكل
          </button>
        ) : null}
      </div>
    </div>
  );
};

/**
 * كائن متداخل — مثل وسائط المشهد {src, aspect, …}.
 *
 * القيمة قد تكون null (مشهد بلا وسائط)، فنعرض زرّ إنشاء بدل حقول على كائن
 * غير موجود: الكتابة في حقل ابن لكائن null تنتج كائناً ناقص البقية.
 */
const ObjectField = ({ field, value, set, path, pickedAt, pickAsset }) => {
  const itemFields = field.itemFields ?? [];
  const present = value !== null && typeof value === "object";
  const obj = present ? value : {};
  const childSet = (key, v) => set(field.name, { ...obj, [key]: v });
  if (!present) {
    return (
      <div className="field">
        <label>{field.label}</label>
        <button
          type="button"
          className="btn ghost"
          style={{ padding: "5px 12px", fontSize: 13 }}
          onClick={() => set(field.name, blankFromFields(itemFields))}
        >
          + تفعيل
        </button>
      </div>
    );
  }
  return (
    <div className="field">
      <div className="obj-item">
        <div className="obj-head">
          <span>{field.label}</span>
          {field.optional ? (
            <button
              type="button"
              className="icon-btn"
              title="إزالة"
              onClick={() => set(field.name, null)}
            >
              ✕
            </button>
          ) : null}
        </div>
        {itemFields.map((sub) => (
          <FieldControl
            key={sub.name}
            field={sub}
            value={obj[sub.name]}
            set={childSet}
            path={joinPath(path, sub.name)}
            pickedAt={pickedAt}
            pickAsset={pickAsset}
          />
        ))}
      </div>
    </div>
  );
};

const Control = ({ field, value, set, path, pickedAt, pickAsset }) => {
  switch (field.kind) {
    case "color":
      return <ColorField field={field} value={value} set={set} />;
    case "text":
    case "textarea":
      return <TextField field={field} value={value} set={set} />;
    case "number":
      return <NumberField field={field} value={value} set={set} />;
    case "boolean":
      return <BooleanField field={field} value={value} set={set} />;
    case "enum":
      return <EnumField field={field} value={value} set={set} />;
    case "asset":
      return (
        <AssetField
          field={field}
          value={value}
          set={set}
          path={path}
          picked={pickedAt(path)}
          pickAsset={pickAsset}
        />
      );
    case "numberList":
      return <NumberListField field={field} value={value} set={set} />;
    case "objectList":
      return (
        <ObjectListField
          field={field}
          value={value}
          set={set}
          path={path}
          pickedAt={pickedAt}
          pickAsset={pickAsset}
        />
      );
    case "object":
      return (
        <ObjectField
          field={field}
          value={value}
          set={set}
          path={path}
          pickedAt={pickedAt}
          pickAsset={pickAsset}
        />
      );
    case "captions":
      return <CaptionsField field={field} value={value} set={set} />;
    default:
      return null;
  }
};

export const FieldControl = (props) => {
  const control = Control({ ...props, path: props.path ?? props.field.name });
  if (!control) return null;

  const { field } = props;
  const hint =
    field.description && field.description !== field.label
      ? field.description
      : null;

  return (
    <div className="field-wrap">
      {control}
      {hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
};
