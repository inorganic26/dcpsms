const functions = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { onObjectFinalized } = require("firebase-functions/v2/storage");

initializeApp();

const db = getFirestore();
const storage = getStorage();
// functions.config()는 배포 후에만 값을 가져올 수 있으므로, process.env를 사용합니다.
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const region = "asia-northeast3"; // 지역을 변수로 지정

// ========== 1. 시험지 PDF 분석 함수 (v2 + Region 설정) ==========
exports.analyzeTestPdf = onObjectFinalized({ region: region }, async (event) => {
    const object = event.data;
    const filePath = object.name;
    const contentType = object.contentType;

    if (!contentType.startsWith("application/pdf") || !filePath.startsWith("test-analysis/")) {
        return functions.logger.log("Not a relevant PDF file.");
    }

    const testId = filePath.split("/")[1];
    const resultDocRef = db.collection("testAnalysisResults").doc(testId);
    
    try {
        await resultDocRef.set({ status: "processing" });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
            You are an expert math tutor. Analyze the provided PDF math test.
            For each numbered question, extract the following information in a structured JSON format:
            1. "단원명": The specific mathematical topic or chapter.
            2. "난이도": Classify the difficulty as one of [쉬움, 보통, 어려움].
            3. "오답대응방안": Provide a concise, actionable suggestion for a student who got the question wrong. Start the sentence with a verb.
            The output should be a single JSON object where keys are the question numbers as strings (e.g., "1", "2", "3").
        `;

        const result = await model.generateContent([
            prompt,
            {
                fileData: {
                    mimeType: contentType,
                    fileUri: `gs://${object.bucket}/${filePath}`,
                },
            },
        ]);
        
        const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const analysisData = JSON.parse(responseText);

        await resultDocRef.set({
            status: "completed",
            analysis: analysisData,
        });

    } catch (error) {
        functions.logger.error("Error analyzing PDF:", error);
        await resultDocRef.set({
            status: "error",
            error: error.message,
        });
    }
});

// ========== 2. 숙제 이미지 채점 함수 (v2 + Region 설정) ==========
exports.gradeHomeworkImage = onObjectFinalized({ region: region }, async (event) => {
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
        await resultDocRef.set({ status: "processing" }, { merge: true });

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const prompt = `
            You are an automated scoring assistant. Analyze the provided image of a solved math problem set.
            Your task is to identify each question number and determine if it is correct, incorrect, or not solved.
            - A circle (O) around the number means CORRECT.
            - A cross (X), slash (/), or triangle (△) means INCORRECT.
            - No marking means NOT SOLVED.
            Provide the output as a single JSON object where keys are the question numbers (as strings) and values are "정답", "오답", or "안풂".
        `;
        
        const result = await model.generateContent([
            prompt,
            {
                fileData: {
                    mimeType: contentType,
                    fileUri: `gs://${object.bucket}/${filePath}`,
                },
            },
        ]);

        const responseText = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
        const gradingData = JSON.parse(responseText);

        const studentUpdateData = {};
        studentUpdateData[`results.${studentName}.${fileName}`] = gradingData;

        await resultDocRef.set(studentUpdateData, { merge: true });
        
        await resultDocRef.set({ status: "completed" }, { merge: true });

    } catch (error) {
        functions.logger.error("Error grading image:", error);
        await resultDocRef.set({
            status: "error",
            error: error.message,
        }, { merge: true });
    }
});