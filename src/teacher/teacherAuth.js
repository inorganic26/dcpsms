// src/teacher/teacherAuth.js

import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const auth = getAuth();
const db = getFirestore();

// [수정됨] 선생님 로그인 (DB비교 X -> Firebase Auth O)
export async function loginTeacher(name, password) {
  try {
    // 1. 이름으로 선생님 문서 찾기 (이메일 주소 확인용)
    // 선생님 ID를 모르므로 이름으로 먼저 검색합니다.
    const teachersRef = collection(db, "teachers");
    const q = query(teachersRef, where("name", "==", name));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("존재하지 않는 선생님 이름입니다.");
    }

    const teacherDoc = querySnapshot.docs[0];
    const teacherId = teacherDoc.id;
    
    // 2. 이메일 및 비밀번호 조합
    // 선생님 계정 생성 시(createTeacherAccount) 사용했던 규칙과 동일해야 합니다.
    const email = `${teacherId}@dcpsms.teacher`;
    
    // [중요] 계정 생성 시 소금(Salt)을 쳤으므로, 로그인할 때도 똑같이 붙여줘야 합니다.
    const salt = "dcpsms_secure_key";
    const securePassword = `${password}${salt}`;

    // 3. Firebase Auth 로그인 시도
    // 구글 서버가 암호화된 비밀번호를 안전하게 검증합니다.
    await signInWithEmailAndPassword(auth, email, securePassword);
    
    return { success: true, teacherId, teacherData: teacherDoc.data() };

  } catch (error) {
    console.error("Login Error:", error);
    // 보안상 "비밀번호가 틀림"과 "아이디가 없음"을 모호하게 처리하는 것이 좋으나,
    // 사용 편의를 위해 구분해서 알려줍니다.
    if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error("비밀번호가 일치하지 않습니다.");
    }
    throw error;
  }
}

export async function logoutTeacher() {
  await signOut(auth);
  window.location.reload();
}