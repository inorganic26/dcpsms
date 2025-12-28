// src/shared/firebase.js
import { getApps, initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getStorage } from "firebase/storage";

// 🔹 Firebase 프로젝트 설정값
const firebaseConfig = {
  apiKey: "AIzaSyBWto_OQ5pXI1i4NDTrEiqNZwZInmbxDwY", 
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  storageBucket: "svcm-v2.firebasestorage.app", 
  messagingSenderId: "189740450655", 
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea" 
};

// 🔹 [수정됨] export 추가 (Named Export)
export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

// 🔹 서비스 참조
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

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