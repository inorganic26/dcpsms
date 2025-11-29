// functions/index.js

import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

initializeApp();

const auth = getAuth();
const db = getFirestore();
const region = "asia-northeast3"; // 서울 리전

// =====================================================
// 1. 학생 계정 생성 함수 (관리자용)
// =====================================================
export const createStudentAccount = onCall({ region }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
  }

  const { name, phone, parentPhone } = request.data;

  if (!phone || phone.length < 4) {
    throw new HttpsError("invalid-argument", "전화번호 형식이 올바르지 않습니다.");
  }

  const passwordInit = phone.slice(-4); 
  const salt = "dcpsms_secure_key";
  const shadowPassword = `${passwordInit}${salt}`;

  try {
    const studentRef = db.collection("students").doc();
    const studentId = studentRef.id;
    const shadowEmail = `${studentId}@dcpsms.student`;

    await auth.createUser({
      uid: studentId,
      email: shadowEmail,
      password: shadowPassword,
      displayName: name,
    });

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
// 2. 사용자 역할 설정 함수들
// =====================================================
export const setCustomUserRole = onCall({ region }, async (req) => {
  const { email, role } = req.data;
  const caller = req.auth;

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
  
  const caller = req.auth;
  if (!caller || caller.token.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자만 역할을 부여할 수 있습니다.");
  }

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
// 3. [자동 청소] 숙제 삭제 시 관련 파일 자동 삭제
// =====================================================
export const onHomeworkDeleted = onDocumentDeleted({ region, document: "homeworks/{homeworkId}" }, async (event) => {
    const homeworkId = event.params.homeworkId;
    const bucket = getStorage().bucket();
    const folderPath = `homeworks/${homeworkId}/`;

    try {
        await bucket.deleteFiles({ prefix: folderPath });
        console.log(`🧹 [CleanUp] 숙제(${homeworkId}) 관련 파일들이 스토리지에서 삭제되었습니다.`);
    } catch (error) {
        console.error(`❌ [CleanUp Error] 숙제 파일 삭제 실패 (${homeworkId}):`, error);
    }
});


// =====================================================
// 4. [자동 청소] 학생 삭제 시 관련 파일 자동 삭제
// =====================================================
export const onStudentDeleted = onDocumentDeleted({ region, document: "students/{studentId}" }, async (event) => {
    const studentId = event.params.studentId;
    const bucket = getStorage().bucket();
    const folderPath = `students/${studentId}/`;

    try {
         await bucket.deleteFiles({ prefix: folderPath });
         console.log(`🧹 [CleanUp] 학생(${studentId}) 관련 파일 삭제 완료.`);
         
         try {
             await auth.deleteUser(studentId);
             console.log(`👤 [Auth] 학생(${studentId}) 인증 계정도 삭제되었습니다.`);
         } catch (authErr) {
             console.log(`ℹ️ [Auth] 인증 계정 삭제 건너뜀: ${authErr.message}`);
         }

    } catch (error) {
        console.error(`❌ [CleanUp Error] 학생 정리 실패:`, error);
    }
});

// =====================================================
// 5. 교사 계정 생성 및 권한 부여 함수
// =====================================================
export const createTeacherAccount = onCall({ region }, async (request) => {
  const caller = request.auth;
  if (!caller || caller.token.role !== "admin") {
    throw new HttpsError("permission-denied", "관리자만 교사를 등록할 수 있습니다.");
  }

  const { name, phone } = request.data;

  if (!phone || phone.length < 4) {
    throw new HttpsError("invalid-argument", "전화번호 형식이 올바르지 않습니다.");
  }

  const passwordInit = phone.slice(-4);
  const salt = "dcpsms_secure_key";
  const shadowPassword = `${passwordInit}${salt}`;

  try {
    const teacherRef = db.collection("teachers").doc();
    const teacherId = teacherRef.id;
    const shadowEmail = `${teacherId}@dcpsms.teacher`;

    await auth.createUser({
      uid: teacherId,
      email: shadowEmail,
      password: shadowPassword,
      displayName: name,
    });

    await auth.setCustomUserClaims(teacherId, { role: "teacher" });

    await teacherRef.set({
      name: name,
      phone: phone,
      createdAt: new Date(),
      isInitialPassword: true
    });

    return { success: true, message: "교사 계정 생성 및 권한 부여 완료" };

  } catch (error) {
    console.error("교사 생성 실패:", error);
    throw new HttpsError("internal", "교사 계정 생성 중 오류가 발생했습니다.");
  }
});

// =====================================================
// 6. 관리자 비밀번호 검증 및 권한 부여 함수
// =====================================================
export const verifyAdminPassword = onCall({ region }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인 세션이 필요합니다.");
  }

  const { password } = request.data;
  if (password !== "qkraudtls0626^^") {
    throw new HttpsError("permission-denied", "비밀번호가 일치하지 않습니다.");
  }

  try {
    await auth.setCustomUserClaims(request.auth.uid, { role: "admin" });
    return { success: true, message: "관리자 권한이 부여되었습니다." };
  } catch (error) {
    console.error("권한 부여 실패:", error);
    throw new HttpsError("internal", "권한 부여 중 오류가 발생했습니다.");
  }
});

// =====================================================
// 7. [신규] 선생님 로그인 처리 (이름/비번 검증 -> 토큰 생성)
// =====================================================
export const verifyTeacherLogin = onCall({ region }, async (request) => {
  const { name, password } = request.data;

  try {
    // 1. 이름으로 선생님 찾기 (관리자 권한으로 DB 조회)
    const snapshot = await db.collection("teachers").where("name", "==", name).get();
    
    if (snapshot.empty) {
        return { success: false, message: "존재하지 않는 선생님입니다." };
    }

    const teacherDoc = snapshot.docs[0];
    const teacherData = teacherDoc.data();
    const teacherId = teacherDoc.id;

    // 2. 비밀번호 비교 (전화번호 뒷 4자리 or 설정된 비번)
    let isMatch = false;
    // (보안상 실제로는 hash 비교가 좋지만, 현재 로직 유지)
    if (teacherData.password === password) isMatch = true;
    else if (teacherData.phone && teacherData.phone.slice(-4) === password) isMatch = true;

    if (!isMatch) {
        return { success: false, message: "비밀번호가 일치하지 않습니다." };
    }

    // 3. 성공 시 커스텀 토큰 생성 (클라이언트가 이걸로 로그인함)
    // 중요: 'teacher' 역할을 토큰에 심어서 반환
    const customToken = await auth.createCustomToken(teacherId, { role: "teacher" });
    
    return { 
        success: true, 
        token: customToken, 
        teacherId: teacherId, 
        teacherData: teacherData 
    };

  } catch (error) {
    console.error("Teacher Login Error:", error);
    throw new HttpsError("internal", "로그인 처리 중 오류 발생");
  }
});