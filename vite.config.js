// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig(({ mode }) => {
  
  // 🧑‍💼 관리자 및 포탈 통합 빌드: 'portal' 또는 'admin' 모드
  // 빌드 폴더: dist-portal (svcm-v2 사이트)
  if (mode === 'portal' || mode === 'admin') {
    return {
      base: '/', // 👈 루트 사이트의 Base URL은 '/'입니다.
      build: {
        outDir: 'dist-portal', // svcm-v2 사이트의 public 경로와 일치
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'), // 포탈 (루트) 진입점
            admin: resolve(__dirname, 'src/admin/index.html'), // 관리자 진입점
          },
        },
      },
    };
  }

  // 🧑‍🎓 학생용 (dcprime-s) 빌드: 'student' 모드
  // 빌드 폴더: dist-student
  if (mode === 'student') {
    return {
      base: '/', // 👈 dcprime-s.web.app는 독립적인 사이트이므로 Base URL은 '/'입니다.
      build: {
        outDir: 'dist-student', // dcprime-s 사이트의 public 경로와 일치
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'src/student/index.html'), // 학생용 진입점
          },
        },
      },
    };
  }

  // 👨‍🏫 선생님용 (t-dcprime) 빌드: 'teacher' 모드
  // 빌드 폴더: dist-teacher
  if (mode === 'teacher') {
    return {
      base: '/', // 👈 t-dcprime.web.app는 독립적인 사이트이므로 Base URL은 '/'입니다.
      build: {
        outDir: 'dist-teacher', // t-dcprime 사이트의 public 경로와 일치
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'src/teacher/index.html'), // 선생님용 진입점
          },
        },
      },
    };
  }

  // 개발용 (vite dev) 또는 기타 기본 빌드: 'dist' 폴더
  return {
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          admin: resolve(__dirname, 'src/admin/index.html'),
          teacher: resolve(__dirname, 'src/teacher/index.html'),
          student: resolve(__dirname, 'src/student/index.html'),
        },
      },
    },
  };
});