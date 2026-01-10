import { defineConfig } from 'vite';
import { resolve } from 'path';
import vue from '@vitejs/plugin-vue'; // [필수 추가]

export default defineConfig({
  plugins: [vue()], // [필수 추가] 이게 없으면 화면이 하얗게 나옵니다.
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