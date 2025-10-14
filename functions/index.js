// functions/index.js

const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onCall } = require("firebase-functions/v2/https");
const { getAuth } = require("firebase-admin/auth");

initializeApp();

const db = getFirestore();
const storage = getStorage();
const auth = getAuth();
const region = "asia-northeast3";

// ========== 1. 시험지 PDF 분석 함수 ==========
// ▼▼▼ [수정] secrets 설정을 추가합니다. ▼▼▼
exports.analyzeTestPdf = onObjectFinalized({
    region: region,
    secrets: ["GEMINI_API_KEY"],
    // ▼▼▼ [수정] 메모리 설정을 128MiB로 변경합니다. ▼▼▼
    memory: "128MiB",
}, async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;

    if (!contentType.startsWith("application/pdf") || !filePath.startsWith("test-analysis/")) {
        return functions.logger.log("Not a relevant PDF file.");
    }

    const testId = filePath.split("/")[1];
    const resultDocRef = db.collection("testAnalysisResults").doc(testId);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY; 
    
    if (!GEMINI_API_KEY) {
        functions.logger.error("Cannot analyze PDF: GEMINI_API_KEY is missing");
        await resultDocRef.set({
            status: "error",
            error: "서버에 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.",
            errorAt: new Date()
        }, { merge: true });
        return;
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    try {
        await resultDocRef.set({ status: "processing", timestamp: new Date() }, { merge: true });
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
당신은 수학 시험지 분석 전문가입니다. 제공된 PDF 수학 시험지를 분석하세요.
각 문제 번호에 대해 다음 세 가지 정보를 JSON 형식으로 제공하세요.
1. "단원명": 해당 문제의 구체적인 수학 단원명 또는 핵심 개념 (예: '삼각함수', '미분계수의 정의')
2. "난이도": [쉬움, 보통, 어려움] 중 하나로 분류
3. "오답대응방안": 틀린 학생을 위한 **핵심만 요약된, 15자 내외의 구체적이고 간결한 조언** (예: '미분계수 공식 반복 숙달').
출력은 문제 번호를 키로 하는 하나의 JSON 객체여야 합니다 (예: "1", "2", "3").
        `.trim();

        const bucket = storage.bucket(object.bucket);
        const file = bucket.file(filePath);
        const [fileBuffer] = await file.download();

        const base64Data = fileBuffer.toString('base64');
        
        const filePart = { 
            inlineData: {
                data: base64Data,
                mimeType: contentType,
            }
        };

        const result = await model.generateContent([ prompt, filePart ]);
        const responseText = result.response.text();
        
        functions.logger.log("Raw response:", responseText);

        let analysisData;
        try {
            const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
            let jsonContent;

            if (jsonMatch && jsonMatch[1]) {
                jsonContent = jsonMatch[1].trim();
            } else {
                const cleanedResponse = responseText.replace(/```json/g, "").replace(/```/g, "").replace(/AI 분석 요약:/i, "").trim();
                const startIndex = cleanedResponse.indexOf('{');
                const endIndex = cleanedResponse.lastIndexOf('}');

                if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
                    jsonContent = cleanedResponse.substring(startIndex, endIndex + 1);
                } else {
                    jsonContent = cleanedResponse;
                }
            }
            analysisData = JSON.parse(jsonContent);
        } catch (parseError) {
            throw new Error(`JSON 파싱 실패: ${parseError.message}. 응답: ${responseText.substring(0, 100)}...`);
        }

        await resultDocRef.set({ 
            status: "completed", 
            analysis: analysisData,
            completedAt: new Date()
        }, { merge: true });

        functions.logger.log("Analysis completed for testId:", testId);
    } catch (error) {
        functions.logger.error("Error analyzing PDF:", error);
        await resultDocRef.set({ 
            status: "error", 
            error: error.message,
            errorDetails: error.stack,
            errorAt: new Date()
        }, { merge: true });
    }
});

// ========== 숙제 채점 및 분석 통합 함수 ==========
// ▼▼▼ [수정] secrets 설정을 추가합니다. ▼▼▼
exports.gradeAndAnalyzeHomework = onCall({ 
    region: region,
    secrets: ["GEMINI_API_KEY"],
    // ▼▼▼ [수정] 메모리 설정을 128MiB로 변경합니다. ▼▼▼
    memory: "128MiB",
}, async (request) => {
    // 1. 요청 인증 및 데이터 유효성 검사
    if (!request.auth) {
        throw new functions.https.HttpsError('unauthenticated', '인증되지 않은 사용자입니다.');
    }
    const { homeworkId, studentId } = request.data;
    if (!homeworkId || !studentId) {
        throw new functions.https.HttpsError('invalid-argument', 'homeworkId와 studentId가 필요합니다.');
    }

    // 2. 학생 제출물 정보 가져오기
    const submissionRef = db.doc(`homeworks/${homeworkId}/submissions/${studentId}`);
    const submissionDoc = await submissionRef.get();
    if (!submissionDoc.exists) {
        throw new functions.https.HttpsError('not-found', '해당 학생의 제출물을 찾을 수 없습니다.');
    }
    const submissionData = submissionDoc.data();
    const imageUrls = submissionData.imageUrls;
    if (!imageUrls || imageUrls.length === 0) {
        throw new functions.https.HttpsError('not-found', '채점할 이미지가 없습니다.');
    }

    // 3. Gemini AI 설정 및 프롬프트 정의
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        throw new functions.https.HttpsError('internal', '서버에 API 키가 설정되지 않았습니다.');
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = `
        당신은 자동 채점 시스템입니다. 제공된 수학 문제 풀이 이미지를 분석하세요.
        각 문제 번호를 확인하고 정답인지, 오답인지, 풀지 않았는지 판단하세요.
        - 문제 번호 주위에 동그라미(O)가 있으면 'O' (정답)
        - 엑스(X), 슬래시(/), 삼각형(△) 표시가 있으면 'X' (오답)
        - 아무 표시가 없으면 'N' (안풂)
        결과를 문제 번호를 키로, 값은 "O", "X", "N" 중 하나인 JSON 객체로 출력해주세요. 다른 설명은 절대 추가하지 마세요.
    `.trim();

    // 4. 각 이미지에 대해 AI 채점 실행
    let allResults = {};
    for (const url of imageUrls) {
        try {
            const path = new URL(url).pathname;
            const filePath = decodeURIComponent(path.substring(path.indexOf('/o/') + 3).split('?')[0]);
            
            const file = storage.bucket().file(filePath);
            const [fileBuffer] = await file.download();
            
            const filePart = { inlineData: { data: fileBuffer.toString('base64'), mimeType: 'image/jpeg' } };
            const result = await model.generateContent([prompt, filePart]);
            const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            const pageResult = JSON.parse(responseText);
            Object.assign(allResults, pageResult);
        } catch (error) {
            functions.logger.error(`이미지 처리 실패 (URL: ${url}):`, error);
        }
    }
    
    // 5. 결과 데이터베이스에 저장
    const homeworkRef = db.doc(`homeworks/${homeworkId}`);
    const studentAnalysisRef = db.doc(`students/${studentId}/homeworkAnalysis/${homeworkId}`);
    
    try {
        await db.runTransaction(async (transaction) => {
            const homeworkDoc = await transaction.get(homeworkRef);
            if (!homeworkDoc.exists) {
                throw new Error("숙제 문서를 찾을 수 없습니다.");
            }
            const analysisData = homeworkDoc.data().analysis || {};

            const oldStudentResultDoc = await transaction.get(studentAnalysisRef);
            if (oldStudentResultDoc.exists) {
                const oldResults = oldStudentResultDoc.data().results;
                for (const qNum in oldResults) {
                    if (oldResults[qNum] === 'X' && analysisData[qNum]) {
                        analysisData[qNum] = Math.max(0, analysisData[qNum] - 1);
                        if(analysisData[qNum] === 0) delete analysisData[qNum];
                    }
                }
            }
            
            for (const qNum in allResults) {
                if (allResults[qNum] === 'X') {
                    analysisData[qNum] = (analysisData[qNum] || 0) + 1;
                }
            }

            transaction.set(studentAnalysisRef, {
                studentName: submissionData.studentName,
                results: allResults,
                analyzedAt: FieldValue.serverTimestamp()
            });
            transaction.update(homeworkRef, { analysis: analysisData });
        });
        
        functions.logger.log(`채점 및 분석 완료: homeworkId=${homeworkId}, studentId=${studentId}`);
        return { success: true, message: "채점 및 분석이 완료되었습니다.", results: allResults };
    } catch (error) {
        functions.logger.error("데이터베이스 업데이트 실패:", error);
        throw new functions.https.HttpsError('internal', '결과를 데이터베이스에 저장하는 데 실패했습니다.');
    }
});


// ========== 사용자 역할 설정 함수들 ==========
exports.setCustomUserRole = onCall({ region: region, memory: "128MiB" }, async (request) => { // 메모리 설정 추가
  const data = request.data;
  const authContext = request.auth;

  if (authContext.token.role !== 'admin') {
    functions.logger.warn(`권한 없는 사용자(${authContext.uid})가 역할 설정을 시도했습니다.`);
    throw new functions.https.HttpsError('permission-denied', '이 작업을 수행하려면 관리자 권한이 필요합니다.');
  }

  const email = data.email;
  const role = data.role;

  if (!email || !role) {
    throw new functions.https.HttpsError('invalid-argument', '이메일과 역할이 필요합니다.');
  }
  if (!['admin', 'teacher', 'student'].includes(role)) {
     throw new functions.https.HttpsError('invalid-argument', '유효하지 않은 역할입니다.');
  }

  try {
    const user = await auth.getUserByEmail(email);
    await auth.setCustomUserClaims(user.uid, { role: role });
    
    functions.logger.log(`성공: ${authContext.uid}가 ${user.uid}(${email})에게 '${role}' 역할을 부여했습니다.`);
    return { message: `성공: ${email} 님에게 '${role}' 역할을 부여했습니다.` };
  } catch (error) {
    functions.logger.error("역할 설정 실패:", error);
    throw new functions.https.HttpsError('internal', '사용자 역할을 설정하는 데 실패했습니다.');
  }
});

exports.setCustomUserRoleByUid = onCall({ region: region, memory: "128MiB" }, async (request) => { // 메모리 설정 추가
    const data = request.data;
    const authContext = request.auth;

    if (authContext.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', '이 작업을 수행하려면 관리자 권한이 필요합니다.');
    }

    const { uid, role } = data;

    if (!uid || !role) {
        throw new functions.https.HttpsError('invalid-argument', 'UID와 역할이 필요합니다.');
    }

    try {
        await auth.setCustomUserClaims(uid, { role: role });
        functions.logger.log(`성공: ${authContext.uid}가 ${uid}에게 '${role}' 역할을 부여했습니다.`);
        return { message: `성공: UID ${uid}에게 '${role}' 역할을 부여했습니다.` };
    } catch (error) {
        functions.logger.error("UID로 역할 설정 실패:", error);
        throw new functions.https.HttpsError('internal', 'UID로 사용자 역할을 설정하는 데 실패했습니다.');
    }
});