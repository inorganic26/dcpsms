// vite.config.js

import { resolve } from 'path'
import { defineConfig } from 'vite'
import { copyFileSync, existsSync } from 'fs'

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
        // 여기부터 추가된 부분입니다.
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`
        // 여기까지 추가된 부분입니다.
      }
    },
  },

  plugins: [
    {
      name: 'copy-redirects-plugin',
      closeBundle() {
        const source = resolve(__dirname, 'public/_redirects')
        const target = resolve(__dirname, 'dist/_redirects')

        if (existsSync(source)) {
          try {
            copyFileSync(source, target)
            console.log('✅ Netlify redirects 파일이 dist 폴더로 복사되었습니다.')
          } catch (err) {
            console.warn('⚠️ _redirects 파일 복사 중 오류:', err)
          }
        } else {
          console.warn('⚠️ public/_redirects 파일이 존재하지 않습니다.')
        }
      },
    },
  ],
})