import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  root: "src/ui",
  // نفس مجلد public الذي يستعمله Remotion، فيعمل staticFile() في الواجهة
  // بلا أي تهيئة إضافية: يعيد "/fonts/..." وVite يخدمه من هنا.
  publicDir: "../../public",
  build: {
    outDir: "../../dist-ui",
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    // خادم الرندر منفصل؛ الوكيل يجعل الواجهة تناديه على نفس الأصل
    proxy: { "/api": "http://localhost:5174" },
  },
});
