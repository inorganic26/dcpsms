// src/shared/firebase.js

import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBWD__2wEy7dkZ40-UBMLik-acqPJ4wpEY",
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  storageBucket: "svcm-v2.firebasestorage.app", // 수정된 부분입니다!
  messagingSenderId: "189740450655",
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// 익명 로그인을 처리하고 콜백 함수를 실행하는 공통 함수
const ensureAuth = (callback) => {
    onAuthStateChanged(auth, user => {
        if (user) {
            callback(user);
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous sign-in error:", err));
        }
    });
};

// ensureAuth를 export 목록에 추가
export { auth, db, storage, ensureAuth };