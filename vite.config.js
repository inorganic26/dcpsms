// vite.config.js

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Rollup 옵션을 사용하여 여러 진입점(Entry Point) 설정
    rollupOptions: {
      input: {
        // 포털 페이지
        main: resolve(__dirname, 'index.html'),
        
        // 관리자 앱
        admin: resolve(__dirname, 'src/admin/index.html'),
        
        // 선생님 앱
        teacher: resolve(__dirname, 'src/teacher/index.html'),
        
        // 학생 앱
        student: resolve(__dirname, 'src/student/index.html'),
      },
    },
    // 빌드 결과물을 dist 폴더에 생성
    outDir: 'dist', 
  },
});