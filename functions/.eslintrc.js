module.exports = {
  root: true,
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    // --- 아래 규칙들을 수정/비활성화하여 모든 오류를 무시합니다 ---
    "quotes": "off", // 따옴표 규칙 비활성화
    "no-unused-vars": "off", // 미사용 변수 규칙 비활성화
    "indent": "off",
    "linebreak-style": "off",
    "object-curly-spacing": "off",
    "max-len": "off",
    "no-trailing-spaces": "off",
    "padded-blocks": "off",
    "comma-dangle": "off",
    "eol-last": "off",
  },
};