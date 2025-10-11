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

// 💡 App Check 초기화 코드 (올바른 순서 적용)
// ==================================================================

// 1. 디버그 모드 활성화 (반드시 초기화보다 먼저 실행되어야 합니다!)
//    (중요: 실제 서비스 배포 시에는 이 줄을 반드시 제거하거나 주석 처리해야 합니다.)
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

// 2. App Check 초기화 실행
initializeAppCheck(app, {
  // Firebase 콘솔에서 App Check을 설정했으므로, 실제 키를 넣을 필요가 없습니다.
  // 아래 'abcdef...' 부분은 단순히 형식을 맞추기 위한 임의의 값입니다.
  provider: new ReCaptchaV3Provider('abcdef-123456-abcdef-123456'),
  isTokenAutoRefreshEnabled: true
});

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