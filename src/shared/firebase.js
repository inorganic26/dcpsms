// src/shared/firebase.js
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// ⬇️ 수정된 부분: signInAnonymously, onAuthStateChanged 추가
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 🔹 Firebase 프로젝트 설정값
const firebaseConfig = {
  apiKey: "AIzaSyBWD__2wEy7dkZ40-UBMLik-acqPJ4wpEY", // 👈 실제 키 확인 필요
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  // 👇 storageBucket 주소 수정됨
  storageBucket: "svcm-v2.firebasestorage.app", // 👈 Firebase 콘솔 주소와 일치시킴
  // 👆 storageBucket 주소 수정됨
  messagingSenderId: "189740450655", // 👈 실제 값 확인 및 필요시 수정
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea" // 👈 실제 값 확인 및 필요시 수정
};

// 🔹 이미 초기화된 앱이 있으면 재사용
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// 🔹 서비스 참조
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// ⬇️ 추가된 함수
/**
 * Firebase 익명 인증을 확인하고,
 * 로그아웃 상태(user=null)이면 익명 로그인을 시도한 후
 * 콜백(callback)을 실행합니다.
 */
export const ensureAnonymousAuth = (callback) => {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      // 이미 익명 또는 다른 방식으로 로그인됨
      callback(user);
    } else {
      // 로그아웃 상태 -> 익명 로그인 시도
      signInAnonymously(auth)
        .then((userCredential) => {
          // 익명 로그인 성공
          callback(userCredential.user);
        })
        .catch((error) => {
          console.error("익명 로그인 실패:", error);
          // 실패하더라도 앱 로직은 (user=null)로 시도
          callback(null);
        });
    }
  });
};


export default app;