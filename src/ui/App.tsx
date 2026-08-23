import React, { useState } from "react";
import { Gallery } from "./Gallery";
import { Editor } from "./Editor";
import type { RegisteredTemplate } from "../lib/registry";

export const App: React.FC = () => {
  const [selected, setSelected] = useState<RegisteredTemplate | null>(null);

  return (
    <>
      <header className="topbar">
        <h1>قوالب مونتاج</h1>
        <span className="spacer" />
        {selected ? (
          <button className="btn" onClick={() => setSelected(null)}>
            المعرض
          </button>
        ) : null}
      </header>
      {selected ? (
        <Editor
          key={selected.meta.id}
          template={selected}
          onBack={() => setSelected(null)}
        />
      ) : (
        <Gallery onPick={setSelected} />
      )}
    </>
  );
};
