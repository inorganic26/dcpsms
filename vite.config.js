// vite.config.js
import { defineConfig } from "vite";
import tailwind from "@tailwindcss/vite";
import { resolve } from "path";

export default defineConfig({
  plugins: [tailwind()],
  base: "/",                 // 루트 기준
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      // 🔑 key에 '폴더/index' 형태를 사용 → dist/폴더/index.html 로 출력
      input: {
        index:              resolve(__dirname, "index.html"),                  // 포털
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
