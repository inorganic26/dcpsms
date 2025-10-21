// vite.config.js
import { defineConfig } from "vite";
import tailwind from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  appType: "mpa",               // 멀티 페이지 모드 명시
  plugins: [tailwind()],
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // ★ 여기 '키=가상경로'가 핵심입니다
      //    → dist/admin/index.html, dist/teacher/index.html, dist/student/index.html
      input: {
        index:              resolve(__dirname, "index.html"),                // 포털(루트)
        "admin/index":      resolve(__dirname, "src/admin/index.html"),
        "teacher/index":    resolve(__dirname, "src/teacher/index.html"),
        "student/index":    resolve(__dirname, "src/student/index.html"),
      },
      output: {
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/[name]-[hash].js",
        entryFileNames: "assets/[name]-[hash].js",
      },
    },
  },
});
