// src/shared/firebase.js

import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
// ▼▼▼ [수정] 필요한 함수들을 모두 import 합니다. ▼▼▼
import { getAuth, onAuthStateChanged, signInAnonymously, getIdTokenResult } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { showToast } from './utils.js';

const firebaseConfig = {
  apiKey: "AIzaSyBWD__2wEy7dkZ40-UBMLik-acqPJ4wpEY",
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  storageBucket: "svcm-v2.firebasestorage.app",
  messagingSenderId: "189740450655",
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea"
};

const app = initializeApp(firebaseConfig);

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdZeOYrAAAAAIK_L5u1NB-XZWyxl08UQ1jGgW3j'),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const ensureAnonymousAuth = (callback) => {
    onAuthStateChanged(auth, user => {
        if (user) {
            callback(user);
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous sign-in error:", err));
        }
    });
};

const ensureAuthWithRole = (requiredRole, callback) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        const idTokenResult = await getIdTokenResult(user, true);
        const userRole = idTokenResult.claims.role;

        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        if (roles.includes(userRole)) {
          callback(user);
        } else {
          showToast("이 페이지에 접근할 권한이 없습니다.");
          // 권한 없는 사용자는 로그아웃 처리 후 포털로 이동
          await auth.signOut();
          window.location.href = '../../index.html'; 
        }
      } catch (error) {
        console.error("권한 확인 중 오류 발생:", error);
        showToast("오류가 발생했습니다. 다시 로그인해주세요.");
        window.location.href = '../../index.html';
      }
    } else {
      // 로그인하지 않은 사용자는 포털로 리디렉션
      window.location.href = '../../index.html';
    }
  });
};

// ▼▼▼ [수정] export 목록에 onAuthStateChanged와 signInAnonymously를 추가합니다. ▼▼▼
export { auth, db, storage, ensureAnonymousAuth, ensureAuthWithRole, onAuthStateChanged, signInAnonymously };