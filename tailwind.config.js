/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{html,js,jsx,ts,tsx,vue}"
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2563eb",
        secondary: "#475569"
      },
      fontFamily: {
        sans: ["Pretendard", "Inter", "sans-serif"]
      },
      boxShadow: {
        card: "0 4px 14px rgba(0,0,0,0.08)"
      }
    }
  },
  plugins: []
};
