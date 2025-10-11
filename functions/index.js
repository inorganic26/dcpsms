// functions/index.js

const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { onObjectFinalized } = require("firebase-functions/v2/storage");

initializeApp();

const db = getFirestore();
const storage = getStorage();
const region = "asia-northeast3";

// 환경 변수에서 API 키 가져오기 (여러 방법 지원)
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 
                       functions.config().gemini?.api_key || 
                       functions.config().gemini?.key;

if (!GEMINI_API_KEY) {
  functions.logger.error("GEMINI_API_KEY is not set!");
} else {
  functions.logger.log("API Key loaded successfully");
}

// ========== 1. 시험지 PDF 분석 함수 ==========
exports.analyzeTestPdf = onObjectFinalized({
    region: region,
}, async (event) => {
    if (!GEMINI_API_KEY) {
        functions.logger.error("Cannot analyze PDF: GEMINI_API_KEY is missing");
        return;
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;

    if (!contentType.startsWith("application/pdf") || !filePath.startsWith("test-analysis/")) {
        return functions.logger.log("Not a relevant PDF file.");
    }

    const testId = filePath.split("/")[1].replace(".pdf", "");
    const resultDocRef = db.collection("testAnalysisResults").doc(testId);

    try {
        await resultDocRef.set({ status: "processing", timestamp: new Date() }, { merge: true });
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
당신은 수학 전문 교사입니다. 제공된 PDF 수학 시험지를 분석하세요.
각 문제 번호에 대해 다음 정보를 추출하여 JSON 형식으로 제공하세요:

1. "단원명": 구체적인 수학 주제나 단원명
2. "난이도": [쉬움, 보통, 어려움] 중 하나로 분류
3. "오답대응방안": 틀린 학생을 위한 구체적이고 실행 가능한 조언. 동사로 시작하는 문장.

출력은 문제 번호를 키로 하는 하나의 JSON 객체여야 합니다 (예: "1", "2", "3").
        `.trim();

        const fileUri = `gs://${object.bucket}/${filePath}`;
        functions.logger.log("Analyzing file:", fileUri);

        const result = await model.generateContent([
            prompt, 
            { 
                inlineData: {
                    mimeType: contentType,
                    data: (await storage.bucket(object.bucket).file(filePath).download())[0].toString('base64')
                }
            }
        ]);

        const responseText = result.response.text()
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        
        functions.logger.log("Raw response:", responseText);
        
        const analysisData = JSON.parse(responseText);

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
}, async (event) => {
    if (!GEMINI_API_KEY) {
        functions.logger.error("Cannot grade image: GEMINI_API_KEY is missing");
        return;
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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

    try {
        await resultDocRef.set({ 
            status: "processing",
            timestamp: new Date()
        }, { merge: true });
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
당신은 자동 채점 보조 시스템입니다. 제공된 수학 문제 풀이 이미지를 분석하세요.
각 문제 번호를 확인하고 정답인지, 오답인지, 풀지 않았는지 판단하세요.

- 번호 주위에 동그라미(O)가 있으면 정답
- 엑스(X), 슬래시(/), 삼각형(△)이 있으면 오답
- 표시가 없으면 안풂

문제 번호를 키로, 값은 "정답", "오답", "안풂" 중 하나인 JSON 객체로 출력하세요.
        `.trim();

        const fileUri = `gs://${object.bucket}/${filePath}`;
        functions.logger.log("Grading file:", fileUri);

        const result = await model.generateContent([
            prompt, 
            { 
                inlineData: {
                    mimeType: contentType,
                    data: (await storage.bucket(object.bucket).file(filePath).download())[0].toString('base64')
                }
            }
        ]);

        const responseText = result.response.text()
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        
        functions.logger.log("Raw grading response:", responseText);
        
        const gradingData = JSON.parse(responseText);

        const studentUpdateData = {
            status: "completed",
            completedAt: new Date()
        };
        studentUpdateData[`results.${studentName}.${fileName}`] = gradingData;

        await resultDocRef.set(studentUpdateData, { merge: true });

        functions.logger.log("Grading completed for:", homeworkId, studentName);
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