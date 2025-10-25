// src/shared/reportManager.js
import { ref, uploadBytes, getDownloadURL, listAll } from "firebase/storage";
import { storage } from './firebase.js'; // db import 제거
// import { doc, getDoc } from "firebase/firestore"; // Firestore getDoc 제거
import { showToast } from './utils.js';

// 파일 이름 형식: "{자유형식}_{학생이름}_리포트.pdf"
// 예: "고1월수_정희진_리포트.pdf", "중3A_박진제_리포트.pdf"
// 날짜 정보는 더 이상 파일명에서 추출하지 않음
const reportFilenameRegex = /.*_([^_]+)_리포트\.pdf$/;

export const reportManager = {

    /**
     * 파일 이름에서 학생 이름을 추출합니다.
     * @param {string} fileName - 원본 파일 이름
     * @returns {string|null} - 학생 이름 또는 null
     */
    parseReportFilenameForStudentName(fileName) {
        const match = fileName.match(reportFilenameRegex);
        if (match && match.length >= 2) {
            const studentName = match[1];
            return studentName;
        }
        console.warn(`[ReportManager] Failed to parse student name from filename: ${fileName}`);
        return null;
    },

    /**
     * Firebase Storage 경로를 생성합니다.
     * @param {string} classId - 반 ID
     * @param {string} testDate - 시험 날짜 (YYYYMMDD)
     * @param {string} fileName - 원본 파일 이름
     * @returns {string|null} - Storage 경로
     */
    getReportStoragePath(classId, testDate, fileName) {
        if (!classId || !testDate || !fileName) {
            console.error("[ReportManager] Missing required info for storage path generation.");
            return null;
        }
        // 날짜 형식 검증 (YYYYMMDD) - 간단하게 길이만 체크
        if (testDate.length !== 8 || !/^\d+$/.test(testDate)) {
             console.error(`[ReportManager] Invalid testDate format: ${testDate}. Expected YYYYMMDD.`);
             return null;
        }
        return `reports/${classId}/${testDate}/${fileName}`;
    },

    /**
     * 시험 결과 리포트 PDF 파일을 업로드합니다.
     * @param {File} file - 업로드할 파일 객체
     * @param {string} classId - 대상 반 ID
     * @param {string} testDate - 시험 날짜 (YYYYMMDD 형식)
     * @returns {Promise<boolean>} - 업로드 성공 여부
     */
    async uploadReport(file, classId, testDate) {
        if (!file || !classId || !testDate) {
            showToast("업로드 정보(파일, 반, 날짜)가 부족합니다.", true);
            return false;
        }

        // 파일 이름 유효성 검사 (학생 이름 추출 가능한지)
        const studentName = this.parseReportFilenameForStudentName(file.name);
        if (!studentName) {
            showToast(`파일 이름 형식이 올바르지 않습니다: ${file.name}. (_이름_리포트.pdf 형식 필요)`, true);
            return false;
        }

        const storagePath = this.getReportStoragePath(classId, testDate, file.name);
        if (!storagePath) {
             showToast(`업로드 경로 생성 실패 (날짜 형식: ${testDate})`, true);
             return false;
        }

        const fileRef = ref(storage, storagePath);

        try {
            console.log(`[ReportManager] Uploading ${file.name} to ${storagePath}`);
            await uploadBytes(fileRef, file);
            console.log(`[ReportManager] Successfully uploaded ${file.name}`);
            return true;
        } catch (error) {
            console.error(`[ReportManager] Error uploading ${file.name}:`, error);
            showToast(`파일 업로드 실패 (${file.name}): ${error.message}`, true);
            if (error.code === 'storage/unauthorized') {
                 showToast("업로드 권한이 없습니다. Storage 규칙을 확인하세요.", true);
            }
            return false;
        }
    },

    /**
     * 특정 학생의 모든 리포트 목록을 가져옵니다. (날짜별 그룹화)
     * @param {string} classId - 학생의 반 ID
     * @param {string} studentName - 학생 이름
     * @returns {Promise<object|null>} - { 'YYYYMMDD': [{ fileName: string, storagePath: string, downloadUrl?: string }], ... } 또는 null
     */
    async listStudentReports(classId, studentName) {
        if (!classId || !studentName) {
            console.warn("[ReportManager] Cannot list reports: Missing classId or studentName.");
            return null;
        }
        console.log(`[ReportManager] Listing reports for student: ${studentName} in class: ${classId}`);

        const reportsByDate = {};
        const classReportBaseRef = ref(storage, `reports/${classId}`);

        try {
            const dateFolders = await listAll(classReportBaseRef);

            // 각 날짜 폴더 순회 (날짜 폴더 이름이 YYYYMMDD 형식이라고 가정)
            for (const dateFolderRef of dateFolders.prefixes) {
                const testDate = dateFolderRef.name; // YYYYMMDD
                if (testDate.length !== 8 || !/^\d+$/.test(testDate)) {
                    console.warn(`[ReportManager] Skipping invalid date folder: ${testDate}`);
                    continue; // 유효하지 않은 날짜 폴더는 건너뜀
                }

                const dateFiles = await listAll(dateFolderRef);

                // 해당 날짜 폴더 내 파일들 검사
                for (const fileRef of dateFiles.items) {
                    const fileName = fileRef.name;
                    // 파일 이름에서 학생 이름 파싱 시도
                    const parsedStudentName = this.parseReportFilenameForStudentName(fileName);
                    if (parsedStudentName === studentName) {
                        if (!reportsByDate[testDate]) {
                             reportsByDate[testDate] = [];
                        }
                        reportsByDate[testDate].push({
                            fileName: fileName,
                            storagePath: fileRef.fullPath,
                            // downloadUrl은 필요 시점에 가져오도록 변경 (성능)
                        });
                         console.log(`[ReportManager] Found report: ${fileName} for date: ${testDate}`);
                    }
                }
            }
             console.log(`[ReportManager] Found reports grouped by date:`, reportsByDate);
            return reportsByDate;

        } catch (error) {
            console.error(`[ReportManager] Error listing reports for ${studentName}:`, error);
            if (error.code === 'storage/unauthorized') {
                showToast("리포트 목록을 볼 권한이 없습니다. Storage 규칙을 확인하세요.", true);
            } else if (error.code === 'storage/object-not-found') {
                console.log(`[ReportManager] No reports found for class ${classId}.`); // 폴더가 없을 수 있음
                return {}; // 빈 객체 반환
            } else {
                showToast("리포트 목록 로딩 중 오류 발생", true);
            }
            return null;
        }
    },

     /**
     * Storage 경로를 사용하여 다운로드 URL을 가져옵니다.
     * @param {string} storagePath - Firebase Storage 전체 경로
     * @returns {Promise<string|null>} - 다운로드 URL 또는 null
     */
     async getReportDownloadUrl(storagePath) {
        if (!storagePath) return null;
        try {
            const fileRef = ref(storage, storagePath);
            const url = await getDownloadURL(fileRef);
            return url;
        } catch (error) {
            console.error(`[ReportManager] Error getting download URL for ${storagePath}:`, error);
            if (error.code === 'storage/object-not-found') {
                showToast("리포트 파일을 찾을 수 없습니다.", true);
            } else if (error.code === 'storage/unauthorized') {
                showToast("리포트 파일 접근 권한이 없습니다.", true);
            } else {
                showToast("리포트 URL을 가져오는 데 실패했습니다.", true);
            }
            return null;
        }
    }
};