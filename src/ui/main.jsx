import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { installBlobFetchShim } from "./blob-source.js";
import "./styles.css";

// قبل أي معاينة أو رندر: ملفات المستخدم تُقرأ من الذاكرة لا من الشبكة
installBlobFetchShim();
const container = document.getElementById("root");
if (!container) {
  throw new Error("عنصر الجذر #root غير موجود");
}
createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
