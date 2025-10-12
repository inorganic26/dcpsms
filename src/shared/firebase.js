// src/shared/firebase.js

import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBWD__2wEy7dkZ40-UBMLik-acqPJ4wpEY",
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  storageBucket: "svcm-v2.firebasestorage.app",
  messagingSenderId: "189740450655",
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea"
};

const app = initializeApp(firebaseConfig);

// ✅ App Check 초기화 코드 수정 완료
// ==================================================================

// 1. App Check 초기화 실행
// 제공해주신 reCAPTCHA 사이트 키를 적용했습니다.
initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdZeOYrAAAAAIK_L5u1NB-XZWyxl08UQ1jGgW3j'), // 👈 키 적용 완료
  isTokenAutoRefreshEnabled: true
});

// 2. 디버그 토큰 설정 제거
// 아래 라인은 실제 서비스 환경에서는 필요 없으므로 주석 처리하거나 삭제하는 것이 좋습니다.
// self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

// ==================================================================

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const ensureAuth = (callback) => {
    onAuthStateChanged(auth, user => {
        if (user) {
            callback(user);
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous sign-in error:", err));
        }
    });
};

export { auth, db, storage, ensureAuth };