// functions/index.js
const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onCall } = require("firebase-functions/v2/https");

initializeApp();

const db = getFirestore();
const storage = getStorage();
const auth = getAuth();
const region = "asia-northeast3";

// ========== 1. 시험지 PDF 분석 함수 ==========
exports.analyzeTestPdf = onObjectFinalized({
    region: region,
    memory: "256MiB", // ✅ 요청하신대로 메모리를 256MB로 상향 조정
}, async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;

    if (!contentType.startsWith("application/pdf") || !filePath.startsWith("test-analysis/")) {
        return functions.logger.log("Not a relevant PDF file.");
    }

    const testId = filePath.split("/")[1];
    const resultDocRef = db.collection("testAnalysisResults").doc(testId);

    // .env 파일에서 API 키를 가져오도록 수정 (최신 권장 방식)
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        functions.logger.error("Cannot analyze PDF: GEMINI_API_KEY is missing from .env file.");
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

        // 모델 이름을 "gemini-2.5-flash"로 설정
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
당신은 수학 시험지 분석 전문가입니다. 제공된 PDF 수학 시험지를 분석하세요.
각 문제 번호에 대해 다음 세 가지 정보를 JSON 형식으로 제공하세요.
1. "단원명": 해당 문제의 구체적인 수학 단원명 또는 핵심 개념 (예: '삼각함수', '미분계수의 정의')
2. "난이도": [쉬움, 보통, 어려움] 중 하나로 분류
3. "오답대응방안": 틀린 학생을 위한 **핵심만 요약된, 15자 내외의 구체적이고 간결한 조언** (예: '미분계수 공식 반복 숙달').
출력은 문제 번호를 키로 하는 하나의 JSON 객체여야 합니다 (예: "1", "2", "3").
        `.trim();

        const fileUri = \`gs://${object.bucket}/${filePath}\`;
        functions.logger.log("Analyzing file via URI:", fileUri);

        const filePart = {
            fileData: {
                mimeType: contentType,
                fileUri: fileUri
            }
        };

        const result = await model.generateContent([ prompt, filePart ]);
        const responseText = result.response.text();
        functions.logger.log("Raw response:", responseText);

        let analysisData;
        try {
            const jsonMatch = responseText.match(/\\\`\\\`\\\`json\n([\s\S]*?)\n\\\`\\\`\\\`/);
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
            const errorMsg = \`JSON parsing failed: \${parseError.message}. Response: \${responseText.substring(0, 100)}...\`;
            throw new Error(errorMsg);
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

// ========== 2. 숙제 이미지 채점 함수 ==========
exports.gradeHomeworkImage = onObjectFinalized({
    region: region,
    memory: "256MiB", // ✅ 메모리 256MB로 상향 조정
}, async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;

    if (!contentType.startsWith("image/") || !filePath.startsWith("homework-grading/")) {
        return functions.logger.log("Not a relevant image file.");
    }
    
    const parts = filePath.split("/");
    const homeworkId = parts[1];
    const fileName = parts[2];
    const nameParts = fileName.split("_");
    const studentName = nameParts[2];
    const resultDocRef = db.collection("homeworkGradingResults").doc(homeworkId);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
        functions.logger.error("Cannot grade image: GEMINI_API_KEY is missing");
        await resultDocRef.set({
            status: "error",
            error: "서버에 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.",
            errorAt: new Date()
        }, { merge: true });
        return;
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    try {
        await resultDocRef.set({ 
            status: "processing",
            timestamp: new Date()
        }, { merge: true });
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = \`
당신은 자동 채점 보조 시스템입니다. 제공된 수학 문제 풀이 이미지를 분석하세요.
각 문제 번호를 확인하고 정답인지, 오답인지, 풀지 않았는지 판단하세요.

- 번호 주위에 동그라미(O)가 있으면 정답
- 엑스(X), 슬래시(/), 삼각형(△)이 있으면 오답
- 표시가 없으면 안풂

문제 번호를 키로, 값은 "정답", "오답", "안풂" 중 하나인 JSON 객체로 출력하세요.
        \`.trim();
        
        const fileUri = \`gs://\${object.bucket}/\${filePath}\`;
        functions.logger.log("Grading file via URI:", fileUri);
        
        const filePart = { 
            fileData: {
                mimeType: contentType,
                fileUri: fileUri
            }
        };

        const result = await model.generateContent([ prompt, filePart ]);
        const responseText = result.response.text()
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        
        functions.logger.log("Raw grading response:", responseText);
        
        const gradingData = JSON.parse(responseText);

        const studentUpdateData = {};
        studentUpdateData[\`results.\${studentName}.\${fileName}\`] = gradingData;
        studentUpdateData.lastUpdatedAt = new Date();

        await resultDocRef.set(studentUpdateData, { merge: true });
        
        functions.logger.log("Grading completed for:", homeworkId, studentName, fileName);
        
    } catch (error) {
        functions.logger.error("Error grading image:", error);
        await resultDocRef.set({ 
            status: "error", 
            error: error.message,
            errorDetails: error.stack,
            errorAt: new Date()
        }, { merge: true });
    }
});


// ========== 사용자 역할 설정 함수들 ==========
exports.setCustomUserRole = onCall({ region: region, memory: "256MiB" }, async (request) => { // ✅ 메모리 256MB로 상향 조정
    const data = request.data;
    const authContext = request.auth;

    if (authContext.token.role !== 'admin') {
        functions.logger.warn(\`Unauthorized user (\${authContext.uid}) attempted role assignment.\`);
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

        functions.logger.log(\`Success: \${authContext.uid} assigned '\${role}' to \${user.uid} (\${email}).\`);
        return { message: \`성공: \${email} 님에게 '\${role}' 역할을 부여했습니다.\` };
    } catch (error) {
        functions.logger.error("Role assignment failed:", error);
        throw new functions.https.HttpsError('internal', '사용자 역할을 설정하는 데 실패했습니다.');
    }
});

exports.setCustomUserRoleByUid = onCall({ region: region, memory: "256MiB" }, async (request) => { // ✅ 메모리 256MB로 상향 조정
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
        functions.logger.log(\`Success: \${authContext.uid} assigned '\${role}' to \${uid}.\`);
        return { message: \`성공: UID \${uid}에게 '\${role}' 역할을 부여했습니다.\` };
    } catch (error) {
        functions.logger.error("Role assignment by UID failed:", error);
        throw new functions.https.HttpsError('internal', 'UID로 사용자 역할을 설정하는 데 실패했습니다.');
    }
});