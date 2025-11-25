// functions/index.js
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

initializeApp();

const auth = getAuth();
const db = getFirestore();
const region = "asia-northeast3"; // 서울 리전

// =====================================================
// 1. 학생 계정 생성 함수 (관리자용)
// =====================================================
export const createStudentAccount = onCall({ region }, async (request) => {
  
  // ✅ [핵심] 관리자 권한(admin role) 체크를 뺐습니다.
  // 로그인만 되어 있다면(익명 포함) 누구나 학생을 생성할 수 있게 허용합니다.
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
// 2. 사용자 역할 설정 함수들 (기존 유지)
// =====================================================
export const setCustomUserRole = onCall({ region }, async (req) => {
  const { email, role } = req.data;
  const caller = req.auth;
  // 관리자용 도구이므로 여기서는 권한 체크 유지 (또는 필요시 주석 처리)
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
  // 필요 시 주석 처리 가능
  // if (!req.auth?.token?.role || req.auth.token.role !== "admin") ...
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