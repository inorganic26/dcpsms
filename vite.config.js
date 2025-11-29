// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        // 각 사이트의 대문(index.html) 위치를 정확히 알려줍니다.
        main: resolve(__dirname, 'index.html'),           // 포탈
        admin: resolve(__dirname, 'src/admin/index.html'),   // 관리자
        teacher: resolve(__dirname, 'src/teacher/index.html'), // 선생님
        student: resolve(__dirname, 'src/student/index.html'), // 학생
      },
    },
  },
});