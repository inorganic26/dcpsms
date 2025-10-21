// tailwind.config.js

import presetBase from '@tailwindcss/preset-base'
import presetDefault from '@tailwindcss/preset-default' // 👈 [필수] p-6 등 유틸리티 클래스 포함

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/admin/index.html",
    "./src/student/index.html",
    "./src/teacher/index.html",
    "./src/**/*.{js,vue,html}",
  ],
  theme: {
    extend: {},
  },
  presets: [ // 👈 [필수] 2개 프리셋 모두 적용
    presetBase,
    presetDefault 
  ],
  plugins: [],
}