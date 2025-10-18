// vite.config.js

import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'src/admin/index.html'),
        teacher: resolve(__dirname, 'src/teacher/index.html'),
        student: resolve(__dirname, 'src/student/index.html'),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
      }
    },
  },

  plugins: [
    // Netlify 관련 플러그인이 제거되었습니다.
  ],
})