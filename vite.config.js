// vite.config.js
import { defineConfig } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite'; // 👈 [수정 1] vue 플러그인 대신 tailwindcss 플러그인을 가져옵니다.
import vue from '@vitejs/plugin-vue'; // 👈 [추가] vue 플러그인도 가져옵니다.

export default defineConfig(({ mode }) => {
  
  // 🧑‍💼 관리자 및 포탈 통합 빌드: 'portal' 또는 'admin' 모드
  // 빌드 폴더: dist-portal (svcm-v2 사이트)
  if (mode === 'portal' || mode === 'admin') {
    return {
      base: '/', 
      build: {
        outDir: 'dist-portal', 
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'index.html'), 
            admin: resolve(__dirname, 'src/admin/index.html'), 
          },
        },
      },
      plugins: [ // 👈 [수정 2] 여기에 플러그인 추가
        vue(),
        tailwindcss()
      ],
    };
  }

  // 🧑‍🎓 학생용 (dcprime-s) 빌드: 'student' 모드
  // 빌드 폴더: dist-student
  if (mode === 'student') {
    return {
      base: '/', 
      build: {
        outDir: 'dist-student', 
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'src/student/index.html'), 
          },
        },
      },
      plugins: [ // 👈 [수정 2] 여기에 플러그인 추가
        vue(),
        tailwindcss()
      ],
    };
  }

  // 👨‍🏫 선생님용 (t-dcprime) 빌드: 'teacher' 모드
  // 빌드 폴더: dist-teacher
  if (mode === 'teacher') {
    return {
      base: '/', 
      build: {
        outDir: 'dist-teacher', 
        emptyOutDir: true,
        rollupOptions: {
          input: {
            main: resolve(__dirname, 'src/teacher/index.html'), 
          },
        },
      },
      plugins: [ // 👈 [수정 2] 여기에 플러그인 추가
        vue(),
        tailwindcss()
      ],
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
    plugins: [ // 👈 [수정 2] 여기에 플러그인 추가
      vue(),
      tailwindcss()
    ],
  };