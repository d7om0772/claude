#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, appendFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * مشغّل بضغطة واحدة: يثبّت الاعتماديات عند اللزوم، يبني الواجهة، يتأكد أن
 * البناء أنتج ملفاً فعلاً، ثم يشغّل الخادم وينتظر جاهزيته قبل فتح المتصفح.
 *
 * كُتب بـ Node بدل ملف batch لأن batch لا يستطيع التحقق من نجاح الخطوات ولا
 * انتظار الخادم، فكانت النتيجة صفحة "الاتصال مرفوض" أو "الواجهة غير مبنيّة".
 * كل المخرجات تُسجَّل أيضاً في start-log.txt ليسهل إرسالها عند وجود مشكلة.
 */

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const logPath = join(root, "start-log.txt");
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const PORT = Number(process.env.PORT ?? 5174);
const url = `http://localhost:${PORT}`;

writeFileSync(logPath, `${new Date().toISOString()}\n`, "utf8");

const say = (line) => {
  process.stdout.write(`${line}\n`);
  appendFileSync(logPath, `${line}\n`, "utf8");
};

/** ينفّذ أمراً ويعيد رمز الخروج، مع تسجيل المخرجات في ملف السجل. */
const run = (args) =>
  new Promise((resolve) => {
    appendFileSync(logPath, `\n$ ${npm} ${args.join(" ")}\n`, "utf8");
    const child = spawn(npm, args, {
      cwd: root,
      shell: process.platform === "win32",
    });
    const tee = (chunk) => {
      process.stdout.write(chunk);
      appendFileSync(logPath, chunk);
    };
    child.stdout.on("data", tee);
    child.stderr.on("data", tee);
    child.on("error", (err) => {
      say(`تعذّر تشغيل ${npm}: ${err.message}`);
      resolve(1);
    });
    child.on("exit", (code) => resolve(code ?? 1));
  });

const fail = (message) => {
  say("");
  say(`  [!] ${message}`);
  say("");
  say(`      التفاصيل الكاملة في: ${logPath}`);
  say("      أرسل لي هذا الملف وسأصلح المشكلة.");
  process.exitCode = 1;
};

const openBrowser = () => {
  const [cmd, args] =
    process.platform === "win32"
      ? ["cmd", ["/c", "start", "", url]]
      : process.platform === "darwin"
        ? ["open", [url]]
        : ["xdg-open", [url]];
  try {
    const child = spawn(cmd, args, { stdio: "ignore", detached: true });
    // بلا هذا المستمع يرمي Node حدث error غير ملتقط فيسقط المشغّل كله
    child.on("error", () => {});
    child.unref();
  } catch {
    // فتح المتصفح كماليّ؛ الرابط مطبوع على الشاشة في كل الأحوال
  }
};

/** يستفسر من الخادم حتى يردّ، أو حتى تنتهي المهلة. */
const waitForServer = async (timeoutMs = 120000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // الخادم لم يستمع بعد
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

const main = async () => {
  say("");
  say("  ============================================");
  say("     قوالب مونتاج - التشغيل المحلي");
  say("  ============================================");
  say("");

  // 1) الاعتماديات
  const viteBin = join(root, "node_modules", "vite", "package.json");
  if (!existsSync(viteBin)) {
    say("  [1/3] تثبيت الاعتماديات... قد يأخذ دقيقة أو دقيقتين");
    if ((await run(["install"])) !== 0) {
      fail("فشل تثبيت الاعتماديات (npm install).");
      return;
    }
  } else {
    say("  [1/3] الاعتماديات موجودة - تخطّي");
  }

  // 2) بناء الواجهة، مع التحقق من الناتج لا من رمز الخروج وحده
  say("");
  say("  [2/3] بناء الواجهة...");
  const indexHtml = join(root, "dist-ui", "index.html");
  if ((await run(["run", "build"])) !== 0 || !existsSync(indexHtml)) {
    fail("فشل بناء الواجهة، فلن يعمل الموقع (dist-ui/index.html غير موجود).");
    return;
  }
  mkdirSync(join(root, "out"), { recursive: true });

  // 3) الخادم، ولا نفتح المتصفح إلا بعد أن يردّ فعلاً
  say("");
  say("  [3/3] تشغيل الخادم...");
  const server = spawn(process.execPath, [join("src", "server", "index.js")], {
    cwd: root,
    stdio: ["ignore", "inherit", "inherit"],
    env: { ...process.env, PORT: String(PORT) },
  });
  server.on("exit", (code) => {
    if (code !== 0 && code !== null) fail(`توقّف الخادم (رمز ${code}).`);
    process.exit(code ?? 0);
  });
  const stop = () => server.kill();
  process.on("SIGINT", () => {
    stop();
    process.exit(0);
  });
  process.on("SIGTERM", stop);

  if (!(await waitForServer())) {
    stop();
    fail("الخادم لم يستجب خلال دقيقتين.");
    return;
  }

  say("");
  say("  ============================================");
  say(`     OPEN:   ${url}`);
  say("  ============================================");
  say("");
  say("  للإيقاف: أغلق هذه النافذة.");
  say("");
  openBrowser();
};

main();
