// functions/index.js
import { onCall } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

// dotenv import 및 config() 호출 제거됨

initializeApp();

const auth = getAuth();
const region = "asia-northeast3";

// =====================================================
// 1️⃣ Google Generative AI 클라이언트 생성 헬퍼 (제거됨)
// =====================================================
// AI 관련 기능이 제거되었으므로 해당 헬퍼 함수는 필요하지 않습니다.

// =====================================================
// 2️⃣ Gemini API 키 로드 (제거됨)
// =====================================================
// AI 관련 기능이 제거되었으므로 API 키 로드 코드는 필요하지 않습니다.

// =====================================================
// 3️⃣ 시험지 PDF 분석 함수 (제거됨)
// =====================================================
// AI 분석 기능이 제거되었습니다.

// =====================================================
// 4️⃣ 숙제 이미지 채점 함수 (제거됨)
// =====================================================
// AI 분석 기능이 제거되었습니다.

// =====================================================
// 5️⃣ 사용자 역할 설정 함수들
// =====================================================
export const setCustomUserRole = onCall({ region }, async (req) => {
  const { email, role } = req.data;
  const caller = req.auth;

  if (!caller?.token?.role || caller.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
  if (!email || !role) {
    throw new functions.https.HttpsError("invalid-argument", "이메일과 역할이 필요합니다.");
  }

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role });
    return { message: `${email} → '${role}' 역할 부여 완료` };
  } catch (err) {
    functions.logger.error("❌ 역할 설정 실패:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});

export const setCustomUserRoleByUid = onCall({ region }, async (req) => {
  const { uid, role } = req.data;
  const caller = req.auth;

  if (!caller?.token?.role || caller.token.role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "관리자 권한이 필요합니다.");
  }
  if (!uid || !role) {
    throw new functions.https.HttpsError("invalid-argument", "UID와 역할이 필요합니다.");
  }

  try {
    await auth.setCustomUserClaims(uid, { role });
    return { message: `UID ${uid} → '${role}' 역할 부여 완료` };
  } catch (err) {
    functions.logger.error("❌ UID 역할 설정 실패:", err);
    throw new functions.https.HttpsError("internal", err.message);
  }
});