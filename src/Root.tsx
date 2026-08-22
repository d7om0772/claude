import React from "react";
import { Composition } from "remotion";
import { templates } from "./lib/registry";

/**
 * كل قالب في السجلّ يصير Composition تلقائياً.
 * إضافة قالب لا تتطلب أي تعديل هنا.
 */
export const RemotionRoot: React.FC = () => (
  <>
    {templates.map((t) => (
      <Composition
        key={t.meta.id}
        id={t.meta.id}
        component={t.component}
        schema={t.schema}
        defaultProps={t.defaultProps}
        calculateMetadata={t.calculateMetadata}
        durationInFrames={t.meta.defaultDurationInFrames}
        fps={t.meta.fps}
        width={t.meta.width}
        height={t.meta.height}
      />
    ))}
  </>
);
