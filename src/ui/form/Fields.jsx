import React from "react";
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
const AssetField = ({ field, value, set, picked, onPick }) => (
  <div className="field">
    <label>{field.label}</label>
    <div className="file-row">
      <label className="btn ghost" style={{ fontSize: 13 }}>
        اختر ملفاً
        <input
          type="file"
          accept={field.accept}
          style={{ display: "none" }}
          onChange={(e) => onPick(field.name, e.target.files?.[0] ?? null)}
        />
      </label>
      {picked ? (
        <>
          <span className="file-name">{picked.name}</span>
          <button
            type="button"
            className="icon-btn"
            title="إزالة"
            onClick={() => {
              onPick(field.name, null);
              set(field.name, undefined);
            }}
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
const ObjectListField = ({ field, value, set }) => {
  const items = Array.isArray(value) ? value : [];
  const itemFields = field.itemFields ?? [];
  const update = (index, key, v) =>
    set(
      field.name,
      items.map((it, i) => (i === index ? { ...it, [key]: v } : it)),
    );
  const blank = () =>
    Object.fromEntries(
      itemFields.map((f) => [f.name, f.kind === "boolean" ? false : ""]),
    );
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
                onPick={() => undefined}
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
const CaptionsField = ({ field, value }) => {
  const list = Array.isArray(value) ? value : [];
  return (
    <div className="field">
      <label>
        {field.label} ({list.length})
      </label>
      {list.length === 0 ? (
        <div className="note">
          ارفع ملف SRT من قسم «الصوت والتزامن» ليُملأ هذا الحقل تلقائياً.
        </div>
      ) : (
        <div className="caption-list">
          {list.map((c, i) => (
            <div className="caption-row" key={i}>
              <span>{c.text}</span>
              <span className="t" dir="ltr">
                {(c.startMs / 1000).toFixed(2)}–{(c.endMs / 1000).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export const FieldControl = ({ field, value, set, picked, onPick }) => {
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
          picked={picked}
          onPick={onPick}
        />
      );
    case "numberList":
      return <NumberListField field={field} value={value} set={set} />;
    case "objectList":
      return <ObjectListField field={field} value={value} set={set} />;
    case "captions":
      return <CaptionsField field={field} value={value} />;
    default:
      return null;
  }
};
