import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  let rootDir = './';
  let outDir = 'dist';
  let inputFile = 'index.html';

  if (mode === 'portal') {
    rootDir = 'src';
    outDir = 'dist-portal';
    inputFile = 'index.html';
  } else if (mode === 'student') {
    rootDir = 'src/student';
    outDir = 'dist-student';
    inputFile = 'index.html';
  } else if (mode === 'teacher') {
    rootDir = 'src/teacher';
    outDir = 'dist-teacher';
    inputFile = 'index.html';
  } else if (mode === 'admin') {
    rootDir = 'src/admin';
    outDir = 'dist-portal/admin'; // ✅ 관리자용은 포털 하위 폴더에
    inputFile = 'index.html';
  }

  return {
    root: rootDir,
    build: {
      outDir: resolve(__dirname, outDir),
      rollupOptions: {
        input: resolve(__dirname, `${rootDir}/${inputFile}`),
      },
      emptyOutDir: true,
    },
  };
});
