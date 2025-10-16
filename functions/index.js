// functions/index.js
import { onObjectFinalized } from "firebase-functions/v2/storage";
import { onCall } from "firebase-functions/v2/https";
import * as functions from "firebase-functions";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { getAuth } from "firebase-admin/auth";
import dotenv from "dotenv";

dotenv.config(); // ✅ .env 파일 자동 로드

initializeApp();

const db = getFirestore();
const storage = getStorage();
const auth = getAuth();
const region = "asia-northeast3";

// =====================================================
// 1️⃣ Google Generative AI 클라이언트 생성 헬퍼
// =====================================================
function createGenerativeClient(apiKey) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
  }

  // ✅ @google/generative-ai 시도
  try {
    const pkg = require("@google/generative-ai");
    if (pkg && typeof pkg.GoogleGenerativeAI === "function") {
      return { client: new pkg.GoogleGenerativeAI(apiKey), lib: "@google/generative-ai" };
    }
  } catch (err) {
    functions.logger.debug("Legacy SDK 불러오기 실패:", err.message);
  }

  // ✅ @google/genai 시도
  try {
    const genai = require("@google/genai");
    if (genai && typeof genai.GenAIClient === "function") {
      return { client: new genai.GenAIClient({ apiKey }), lib: "@google/genai" };
    }
  } catch (err) {
    functions.logger.debug("New SDK 불러오기 실패:", err.message);
  }

  throw new Error(
    "Google GenAI SDK를 찾을 수 없습니다. 'npm install @google/genai' 또는 '@google/generative-ai' 실행 후 다시 배포하세요."
  );
}

// =====================================================
// 2️⃣ Gemini API 키 로드 (dotenv 사용)
// =====================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  functions.logger.error("❌ GEMINI_API_KEY 환경변수가 없습니다. .env 또는 CLI 환경변수 설정을 확인하세요.");
}

// =====================================================
// 3️⃣ 시험지 PDF 분석 함수
// =====================================================
export const analyzeTestPdf = onObjectFinalized({ region }, async (event) => {
  const object = event.data;
  const filePath = object.name || "";
  const contentType = object.contentType || "";

  if (!contentType.startsWith("application/pdf") || !filePath.startsWith("test-analysis/")) {
    functions.logger.log("Skip non-PDF file:", filePath);
    return;
  }

  const testId = filePath.split("/")[1];
  const resultDocRef = db.collection("testAnalysisResults").doc(testId);

  await resultDocRef.set({ status: "processing", startedAt: new Date() }, { merge: true });

  try {
    const { client, lib } = createGenerativeClient(GEMINI_API_KEY);
    functions.logger.log(`✅ Using ${lib} for PDF analysis`);

    const modelName = "gemini-2.5-flash";
    const prompt = `
당신은 수학 시험지 분석 전문가입니다. PDF 시험지를 분석하고 각 문제 번호별로
1) 단원명, 2) 난이도(쉬움/보통/어려움), 3) 오답대응방안(15자 이내)을 JSON 형식으로 정리하세요.
`;

    const fileUri = `gs://${object.bucket}/${filePath}`;
    let rawResult;

    if (typeof client.getGenerativeModel === "function") {
      const model = client.getGenerativeModel({ model: modelName });
      rawResult = await model.generateContent([
        prompt,
        { fileData: { mimeType: contentType, fileUri } },
      ]);
    } else if (typeof client.generateContent === "function") {
      rawResult = await client.generateContent({
        model: modelName,
        input: [prompt, { fileData: { mimeType: contentType, fileUri } }],
      });
    } else {
      throw new Error("GenAI 클라이언트에서 generateContent를 찾을 수 없습니다.");
    }

    const text =
      rawResult?.response?.text?.() ||
      rawResult?.text ||
      JSON.stringify(rawResult);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    await resultDocRef.set({
      status: "completed",
      analysis,
      completedAt: new Date(),
    }, { merge: true });

    functions.logger.log(`✅ 시험지 분석 완료: ${testId}`);
  } catch (err) {
    functions.logger.error("❌ 시험지 분석 오류:", err);
    await resultDocRef.set({
      status: "error",
      error: err.message,
      errorAt: new Date(),
    }, { merge: true });
  }
});

// =====================================================
// 4️⃣ 숙제 이미지 채점 함수
// =====================================================
export const gradeHomeworkImage = onObjectFinalized({ region }, async (event) => {
  const object = event.data;
  const filePath = object.name || "";
  const contentType = object.contentType || "";

  if (!contentType.startsWith("image/") || !filePath.startsWith("homework-grading/")) {
    functions.logger.log("Skip non-image:", filePath);
    return;
  }

  const [_, homeworkId, fileName] = filePath.split("/");
  const studentName = fileName?.split("_")[2] || "unknown";
  const resultDocRef = db.collection("homeworkGradingResults").doc(homeworkId);

  await resultDocRef.set({ status: "processing", startedAt: new Date() }, { merge: true });

  try {
    const { client, lib } = createGenerativeClient(GEMINI_API_KEY);
    functions.logger.log(`✅ Using ${lib} for image grading`);

    const modelName = "gemini-1.5-flash";
    const prompt = `
당신은 자동 채점 시스템입니다. 수학 풀이 이미지에서 각 문제의 정답 여부를 분석하세요.
- 동그라미(O): 정답
- 엑스(X)/삼각형(△)/슬래시(/): 오답
- 표시 없음: 안풀음
JSON 형식으로 {"1": "정답", "2": "오답", ...} 형태로 출력하세요.
`;

    const fileUri = `gs://${object.bucket}/${filePath}`;
    let rawResult;

    if (typeof client.getGenerativeModel === "function") {
      const model = client.getGenerativeModel({ model: modelName });
      rawResult = await model.generateContent([prompt, { fileData: { mimeType: contentType, fileUri } }]);
    } else if (typeof client.generateContent === "function") {
      rawResult = await client.generateContent({
        model: modelName,
        input: [prompt, { fileData: { mimeType: contentType, fileUri } }],
      });
    } else {
      throw new Error("GenAI 클라이언트에서 generateContent를 찾을 수 없습니다.");
    }

    const text =
      rawResult?.response?.text?.() ||
      rawResult?.text ||
      JSON.stringify(rawResult);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const grading = jsonMatch ? JSON.parse(jsonMatch[0]) : {};

    await resultDocRef.set({
      status: "completed",
      [`results.${studentName}.${fileName}`]: grading,
      completedAt: new Date(),
    }, { merge: true });

    functions.logger.log(`✅ 채점 완료: ${homeworkId}/${studentName}`);
  } catch (err) {
    functions.logger.error("❌ 채점 오류:", err);
    await resultDocRef.set({
      status: "error",
      error: err.message,
      errorAt: new Date(),
    }, { merge: true });
  }
});

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
