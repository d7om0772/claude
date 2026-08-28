#!/usr/bin/env node
import { spawn } from "node:child_process";

/**
 * يشغّل خادم الرندر وخادم الواجهة معاً.
 *
 * كان السكربت `npm run server & npm run ui` وهي صيغة صدفة يونكس. على ويندوز
 * ينفّذ npm السكربتات عبر cmd.exe حيث تعني `&` التتابع لا التوازي، فيبقى
 * الخادم الأول يعمل ولا تُشغَّل الواجهة أبداً. هذا السكربت يعمل على الأنظمة
 * الثلاثة بلا اعتماديات إضافية.
 */

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const children = ["server", "ui"].map((script) =>
  spawn(npm, ["run", script], { stdio: "inherit", shell: process.platform === "win32" }),
);

const stopAll = () => {
  for (const child of children) {
    child.kill();
  }
};

process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("SIGTERM", stopAll);

for (const child of children) {
  child.on("exit", (code) => {
    if (code !== 0 && code !== null) {
      stopAll();
      process.exit(code);
    }
  });
}
