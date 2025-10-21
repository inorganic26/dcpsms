// tailwind.config.js

import preset from '@tailwindcss/preset-base' // 👈 [수정 1] Tailwind 4용 기본 프리셋 가져오기

/** @type {import('tailwindcss').Config} */
export default {
  // [수정 2] 모든 HTML 진입점과 JS 파일을 스캔하도록 경로 추가
  content: [
    "./index.html",               // 포털
    "./src/admin/index.html",     // 관리자
    "./src/student/index.html",   // 학생
    "./src/teacher/index.html",   // 교사
    "./src/**/*.{js,vue,html}", // 모든 하위 JS/Vue/HTML 파일
  ],
  theme: {
    extend: {},
  },
  presets: [ // 👈 [수정 1] 프리셋 적용
    preset 
  ],
  plugins: [],
}