// functions/index.js

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentDeleted } from "firebase-functions/v2/firestore"; // ✨ 추가됨: 삭제 감지 트리거
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage"; // ✨ 추가됨: 스토리지 접근용

initializeApp();

const auth = getAuth();
const db = getFirestore();
// const storage = getStorage(); // 필요 시 변수로 사용, 아래에서는 getStorage() 직접 호출
const region = "asia-northeast3"; // 서울 리전

// =====================================================
// 1. 학생 계정 생성 함수 (관리자용) - 기존 기능 유지
// =====================================================
export const createStudentAccount = onCall({ region }, async (request) => {
  
  // 로그인 여부만 체크 (관리자 권한 체크 완화됨)
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, phone, parentPhone } = request.data;

  if (!phone || phone.length < 4) {
    throw new HttpsError("invalid-argument", "전화번호 형식이 올바르지 않습니다.");
  }

  // 비밀번호 생성 규칙: 전화번호 뒷 4자리 + 보안키
  const passwordInit = phone.slice(-4); 
  const salt = "dcpsms_secure_key";
  const shadowPassword = `${passwordInit}${salt}`;

  try {
    // 1) Firestore에 먼저 빈 문서를 만들어 ID 확보
    const studentRef = db.collection("students").doc();
    const studentId = studentRef.id;

    // 2) 쉐도우 이메일 생성
    const shadowEmail = `${studentId}@dcpsms.student`;

    // 3) Firebase Auth에 실제 계정 생성
    await auth.createUser({
      uid: studentId,
      email: shadowEmail,
      password: shadowPassword,
      displayName: name,
    });

    // 4) Firestore에 학생 정보 저장
    await studentRef.set({
      name: name,
      phone: phone,
      parentPhone: parentPhone || null,
      classId: null,
      createdAt: new Date(),
      isInitialPassword: true
    });

    return { success: true, message: "학생 계정 생성 완료" };

  } catch (error) {
    console.error("학생 생성 실패:", error);
    if (error.code === 'auth/email-already-exists' || error.code === 'auth/uid-already-exists') {
        throw new HttpsError("already-exists", "이미 등록된 학생이거나 계정 생성 중 충돌이 발생했습니다.");
    }
    throw new HttpsError("internal", "계정 생성 중 알 수 없는 오류가 발생했습니다.");
  }
});

// =====================================================
// 2. 사용자 역할 설정 함수들 - 기존 기능 유지
// =====================================================
export const setCustomUserRole = onCall({ region }, async (req) => {
  const { email, role } = req.data;
  const caller = req.auth;

  // 관리자 권한 체크 (필요에 따라 주석 처리 가능)
  if (!caller?.token?.role || caller.token.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
  if (!email || !role) {
    throw new HttpsError("invalid-argument", "이메일과 역할이 필요합니다.");
  }

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
    return { message: `${email} → '${role}' 역할 부여 완료` };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});

export const setCustomUserRoleByUid = onCall({ region }, async (req) => {
  const { uid, role } = req.data;
  
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "UID와 역할이 필요합니다.");
  }

  try {
    await auth.setCustomUserClaims(uid, { role });
    return { message: `UID ${uid} → '${role}' 역할 부여 완료` };
  } catch (err) {
    throw new HttpsError("internal", err.message);
  }
});


// =====================================================
// ✨ 3. [자동 청소] 숙제 삭제 시 관련 파일 자동 삭제
// =====================================================
// Firestore의 'homeworks/{homeworkId}' 문서가 삭제되면 자동으로 실행됩니다.
export const onHomeworkDeleted = onDocumentDeleted({ region, document: "homeworks/{homeworkId}" }, async (event) => {
    const homeworkId = event.params.homeworkId;
    const bucket = getStorage().bucket();

    // 지울 폴더 경로: homeworks/{숙제ID}/
    const folderPath = `homeworks/${homeworkId}/`;

    try {
        // 해당 경로(prefix)로 시작하는 모든 파일을 찾아서 삭제
        await bucket.deleteFiles({ prefix: folderPath });
        console.log(`🧹 [CleanUp] 숙제(${homeworkId}) 관련 파일들이 스토리지에서 삭제되었습니다.`);
    } catch (error) {
        console.error(`❌ [CleanUp Error] 숙제 파일 삭제 실패 (${homeworkId}):`, error);
    }
});


// =====================================================
// ✨ 4. [자동 청소] 학생 삭제 시 관련 파일 자동 삭제
// =====================================================
// Firestore의 'students/{studentId}' 문서가 삭제되면 자동으로 실행됩니다.
export const onStudentDeleted = onDocumentDeleted({ region, document: "students/{studentId}" }, async (event) => {
    const studentId = event.params.studentId;
    const bucket = getStorage().bucket();
    
    // 1) 학생 프로필/개인 폴더 삭제 (예: students/{studentId}/...)
    const folderPath = `students/${studentId}/`;

    try {
         // 스토리지 파일 삭제
         await bucket.deleteFiles({ prefix: folderPath });
         console.log(`🧹 [CleanUp] 학생(${studentId}) 관련 파일 삭제 완료.`);
         
         // 2) Firebase Auth 계정도 같이 삭제해주면 완벽함 (선택사항)
         try {
             await auth.deleteUser(studentId);
             console.log(`👤 [Auth] 학생(${studentId}) 인증 계정도 삭제되었습니다.`);
         } catch (authErr) {
             // 이미 지워졌거나 없으면 패스
             console.log(`ℹ️ [Auth] 인증 계정 삭제 건너뜀: ${authErr.message}`);
         }

    } catch (error) {
        console.error(`❌ [CleanUp Error] 학생 정리 실패:`, error);
    }
});