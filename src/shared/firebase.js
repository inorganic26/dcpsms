// src/shared/firebase.js

import { initializeApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
// ▼▼▼ [수정] import 항목에 getIdTokenResult 추가 ▼▼▼
import { getAuth, onAuthStateChanged, signInAnonymously, getIdTokenResult } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// ▼▼▼ [신규 추가] showToast 유틸리티 import (경로가 정확한지 확인하세요) ▼▼▼
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

// ▼▼▼ [수정] 기존 ensureAuth -> ensureAnonymousAuth로 이름 변경 (학생 앱용) ▼▼▼
const ensureAnonymousAuth = (callback) => {
    onAuthStateChanged(auth, user => {
        if (user) {
            callback(user);
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous sign-in error:", err));
        }
    });
};

// ▼▼▼ [신규 추가] 관리자/선생님 역할 확인용 함수 (해결 방안 3) ▼▼▼
/**
 * 사용자가 로그인했는지, 그리고 필수 역할을 가졌는지 확인합니다.
 * @param {string | string[]} requiredRole - 필요한 역할 (예: 'admin' 또는 ['admin', 'teacher'])
 * @param {function} callback - 성공 시 실행될 콜백 (user 객체 전달)
 */
const ensureAuthWithRole = (requiredRole, callback) => {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // 토큰을 강제 새로고침하여 최신 Custom Claims를 가져옵니다.
        const idTokenResult = await getIdTokenResult(user, true);
        const userRole = idTokenResult.claims.role; // 예: 'admin'

        const roles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

        if (roles.includes(userRole)) {
          // 권한이 있으면 콜백 실행
          callback(user);
        } else {
          // 권한이 없는 사용자
          showToast("이 페이지에 접근할 권한이 없습니다.");
          // 포털 페이지로 리디렉션
          window.location.href = '../../index.html'; 
        }
      } catch (error) {
        console.error("권한 확인 중 오류 발생:", error);
        showToast("오류가 발생했습니다. 다시 로그인해주세요.");
        window.location.href = '../../index.html';
      }
    } else {
      // 로그인하지 않은 사용자
      showToast("로그인이 필요합니다.");
      // (중요) 여기에 실제 관리자/선생님 로그인 페이지로 이동하는 로직이 필요합니다.
      // 지금은 임시로 포털로 보냅니다.
      window.location.href = '../../index.html';
    }
  });
};


// ▼▼▼ [수정] export 항목 변경 ▼▼▼
export { auth, db, storage, ensureAnonymousAuth, ensureAuthWithRole };