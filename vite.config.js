import { defineConfig } from 'vite';
import { resolve } from 'path';

// vue 플러그인 제거 (Vanilla JS 프로젝트이므로 불필요)
export default defineConfig({
  // plugins: [vue()], // 삭제됨
  base: '/', 
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'src/admin/index.html'),
        teacher: resolve(__dirname, 'src/teacher/index.html'),
        student: resolve(__dirname, 'src/student/index.html'),
        parent: resolve(__dirname, 'src/parent/index.html'),
      },
    },
  },
});