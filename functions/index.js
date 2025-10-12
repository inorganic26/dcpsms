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

// ========== 1. 시험지 PDF 분석 함수 ==========
exports.analyzeTestPdf = onObjectFinalized({
    region: region,
}, async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;

    if (!contentType.startsWith("application/pdf") || !filePath.startsWith("test-analysis/")) {
        return functions.logger.log("Not a relevant PDF file.");
    }

    const testId = filePath.split("/")[1];
    const resultDocRef = db.collection("testAnalysisResults").doc(testId);

    // ***** 💡 API 키 유효성 검사 로직 *****
    const GEMINI_API_KEY = functions.config().gemini?.key;
    if (!GEMINI_API_KEY) {
        functions.logger.error("Cannot analyze PDF: GEMINI_API_KEY is missing");
        await resultDocRef.set({
            status: "error",
            error: "서버에 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.",
            errorAt: new Date()
        }, { merge: true });
        return; // 함수 종료
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // *******************************************

    try {
        // 🛠️ 'processing' 상태를 기록하여 클라이언트에게 작업 시작을 알림
        await resultDocRef.set({ status: "processing", timestamp: new Date() }, { merge: true });
        
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }, { apiVersion: 'v1' });

        // 🛠️ 프롬프트 개선: '오답대응방안'의 답변 길이를 제한하여 AI의 생성 부하를 줄임
        const prompt = `
당신은 수학 시험지 분석 전문가입니다. 제공된 PDF 수학 시험지를 분석하세요.
각 문제 번호에 대해 다음 세 가지 정보를 JSON 형식으로 제공하세요.

1. "단원명": 해당 문제의 구체적인 수학 단원명 또는 핵심 개념 (예: '삼각함수', '미분계수의 정의')
2. "난이도": [쉬움, 보통, 어려움] 중 하나로 분류
3. "오답대응방안": 틀린 학생을 위한 **핵심만 요약된, 15자 내외의 구체적이고 간결한 조언** (예: '미분계수 공식 반복 숙달').

출력은 문제 번호를 키로 하는 하나의 JSON 객체여야 합니다 (예: "1", "2", "3").
        `.trim();

        // 🛠️ 메모리 효율 개선: GCS URI를 직접 AI에 전달
        const fileUri = `gs://${object.bucket}/${filePath}`;
        functions.logger.log("Analyzing file via URI:", fileUri);
        
        const filePart = { 
            fileData: {
                mimeType: contentType,
                fileUri: fileUri
            }
        };

        const result = await model.generateContent([
            prompt, 
            filePart 
        ]);

        const responseText = result.response.text()
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        
        functions.logger.log("Raw response:", responseText);
        
        const analysisData = JSON.parse(responseText);

        // 🛠️ 'completed' 상태 기록
        await resultDocRef.set({ 
            status: "completed", 
            analysis: analysisData,
            completedAt: new Date()
        }, { merge: true });

        functions.logger.log("Analysis completed for testId:", testId);
    } catch (error) {
        functions.logger.error("Error analyzing PDF:", error);
        // 🛠️ 'error' 상태 기록
        await resultDocRef.set({ 
            status: "error", 
            error: error.message,
            errorDetails: error.stack,
            errorAt: new Date()
        }, { merge: true });
    }
});

// ========== 2. 숙제 이미지 채점 함수 (유지) ==========
exports.gradeHomeworkImage = onObjectFinalized({
    region: region,
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

    // ***** 💡 API 키 유효성 검사 로직 *****
    const GEMINI_API_KEY = functions.config().gemini?.key;
    if (!GEMINI_API_KEY) {
        functions.logger.error("Cannot grade image: GEMINI_API_KEY is missing");
        await resultDocRef.set({
            status: "error",
            error: "서버에 API 키가 설정되지 않았습니다. 관리자에게 문의하세요.",
            errorAt: new Date()
        }, { merge: true });
        return; // 함수 종료
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // *******************************************

    try {
        // processing 상태는 개별 파일 처리 시작 시 기록
        await resultDocRef.set({ 
            status: "processing",
            timestamp: new Date()
        }, { merge: true });
        
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }, { apiVersion: 'v1' });

        const prompt = `
당신은 자동 채점 보조 시스템입니다. 제공된 수학 문제 풀이 이미지를 분석하세요.
각 문제 번호를 확인하고 정답인지, 오답인지, 풀지 않았는지 판단하세요.

- 번호 주위에 동그라미(O)가 있으면 정답
- 엑스(X), 슬래시(/), 삼각형(△)이 있으면 오답
- 표시가 없으면 안풂

문제 번호를 키로, 값은 "정답", "오답", "안풂" 중 하나인 JSON 객체로 출력하세요.
        `.trim();

        // 🛠️ 메모리 효율 개선: GCS URI를 직접 AI에 전달
        const fileUri = `gs://${object.bucket}/${filePath}`;
        functions.logger.log("Grading file via URI:", fileUri);
        
        const filePart = { 
            fileData: {
                mimeType: contentType,
                fileUri: fileUri
            }
        };

        const result = await model.generateContent([
            prompt, 
            filePart 
        ]);

        const responseText = result.response.text()
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();
        
        functions.logger.log("Raw grading response:", responseText);
        
        const gradingData = JSON.parse(responseText);

        // 학생별, 파일별 결과를 results 맵에 저장
        const studentUpdateData = {};
        studentUpdateData[`results.${studentName}.${fileName}`] = gradingData;
        studentUpdateData.lastUpdatedAt = new Date();

        await resultDocRef.set(studentUpdateData, { merge: true });

        // 참고: 'completed' 상태는 모든 파일 처리가 끝났을 때를 감지하는 별도의 로직이 필요할 수 있습니다.
        // 여기서는 개별 파일 처리 성공 시 로그만 남깁니다.
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