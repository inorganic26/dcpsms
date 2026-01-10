// src/shared/firebase.js

// ⚠️ 주의: 만약 웹브라우저에서 직접 실행 중이라면 아래 import 경로가
// "https://www.gstatic.com/firebasejs/..." 형태여야 할 수도 있습니다.
// (Vite 번들러를 쓰신다면 현재 상태가 맞습니다.)
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// 🔹 [수정] setPersistence, browserLocalPersistence 추가
import { getAuth, signInAnonymously, onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 🔹 Firebase 프로젝트 설정값
export const firebaseConfig = {
  apiKey: "AIzaSyBWto_OQ5pXI1i4NDTrEiqNZwZInmbxDwY",
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  storageBucket: "svcm-v2.firebasestorage.app",
  messagingSenderId: "189740450655",
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea"
};

// 🔹 앱 초기화 (이미 초기화되었다면 기존 앱 사용)
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// 🔹 서비스 참조
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// 🔹 [중요] 세션 유지 설정 (새로고침/창 닫아도 로그인 유지)
// 이 코드가 있어야 자동 로그아웃을 방지할 수 있습니다.
setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("✅ Firebase Auth: 세션 지속성 설정 완료 (LOCAL)");
  })
  .catch((error) => {
    console.error("❌ 세션 설정 오류:", error);
  });

// 🔹 익명 로그인 헬퍼 함수
export const ensureAnonymousAuth = (callback) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      callback(user);
    } else {
      signInAnonymously(auth)
        .then((userCredential) => {
          callback(userCredential.user);
        })
        .catch((error) => {
          console.error("익명 로그인 실패:", error);
          callback(null);
        });
    }
  });
};

export default app;