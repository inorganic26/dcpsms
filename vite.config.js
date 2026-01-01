// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // [중요] base를 '/'로 설정하여 경로 꼬임 방지
  base: '/', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),                // 포탈
        admin: resolve(__dirname, 'src/admin/index.html'),     // 관리자
        teacher: resolve(__dirname, 'src/teacher/index.html'), // 선생님
        student: resolve(__dirname, 'src/student/index.html'), // 학생
        
        // ▼▼▼ [이 부분이 빠져 있어서 추가했습니다] ▼▼▼
        parent: resolve(__dirname, 'src/parent/index.html'),   // 학부모님
      },
    },
  },
});