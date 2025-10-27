// shared/reportManager.js
//
// 공통 보고서(리포트) 관리 유틸
// ... (주석 생략)

import { listAll, getDownloadURL, ref, uploadBytes, deleteObject } from "firebase/storage";
import { storage } from "./firebase.js";

// --------------------------------------------------
// 유틸: 학생 이름 비교용 (공백 제거해서 비교 편하게)
// --------------------------------------------------
function normalizeName(str) {
  if (!str) return "";
  return str.replace(/\s+/g, "").trim();
}

// --------------------------------------------------
// 유틸: 날짜 문자열 정규화
// "2025-10-25" -> "20251025"
// "20251025"   -> "20251025"
// null/빈값    -> ""
// --------------------------------------------------
function normalizeDateFolderName(dateStr) {
  if (!dateStr) return "";
  return dateStr.replace(/[^0-9]/g, ""); // 숫자만 남김
}

// ✨ [추가] 유틸: 날짜 문자열을 "M월D일" 포맷으로 변환 (예: 10월18일)
function toKoreanDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return null;
  const normalized = dateStr.replace(/[^0-9]/g, "");
  if (normalized.length !== 8) return null;

  try {
    const month = parseInt(normalized.substring(4, 6), 10);
    const day = parseInt(normalized.substring(6, 8), 10);

    if (month > 0 && month <= 12 && day > 0 && day <= 31) {
      return `${month}월${day}일`; // 예: "10월18일"
    }
    return null;
  } catch (e) {
    return null;
  }
}

// --------------------------------------------------
// 내부 유틸: 특정 storage 경로(folderRef) 아래 pdf 파일들을
// [{ title, fileName, url }, ...] 로 변환.
// --------------------------------------------------
async function listFilesInFolder(folderRef) {
  const results = [];
  try {
    const listRes = await listAll(folderRef);

    for (const itemRef of listRes.items) {
      const fileName = itemRef.name;

      let url = "";
      try {
        url = await getDownloadURL(itemRef);
      } catch (err) {
        console.warn(
          "[ReportManager] getDownloadURL failed for",
          fileName,
          err
        );
      }

      const title =
        fileName
          .replace(/\.pdf$/i, "")
          .replace(/_/g, " ") || fileName;

      results.push({
        title,
        fileName,
        url,
      });
    }
  } catch (err) {
    console.warn("[ReportManager] listFilesInFolder error:", err);
  }
  return results;
}

export const reportManager = {
  /**
   * [학생 화면용]
   * ... (listStudentReports 함수 생략 - 변경 없음)
   */
  async listStudentReports(classId, studentName) {
    const groupedByDate = {};
    const basePath = `reports/${classId}`;
    const normStudent = normalizeName(studentName);

    console.log(
      "[ReportManager] Listing reports for student:",
      studentName,
      "in class:",
      classId
    );

    try {
      const classRef = ref(storage, basePath);
      const classList = await listAll(classRef);

      // 1) 날짜 폴더들 순회
      for (const datePrefixRef of classList.prefixes) {
        const rawDateFolderName = datePrefixRef.name;
        const normalizedDateKey =
          normalizeDateFolderName(rawDateFolderName) || rawDateFolderName;

        const dateList = await listAll(datePrefixRef);

        for (const itemRef of dateList.items) {
          const fileName = itemRef.name;
          const normFile = normalizeName(fileName);

          if (
            normFile.includes(normStudent) ||
            fileName.includes(studentName)
          ) {
            let url = "";
            try {
              url = await getDownloadURL(itemRef);
            } catch (err) {
              console.warn(
                "[ReportManager] getDownloadURL failed for",
                fileName,
                err
              );
            }

            const title =
              fileName
                .replace(/\.pdf$/i, "")
                .replace(/_/g, " ") || fileName;

            if (!groupedByDate[normalizedDateKey]) {
              groupedByDate[normalizedDateKey] = [];
            }
            groupedByDate[normalizedDateKey].push({
              title,
              fileName,
              url,
            });
          }
        }
      }

      // 2) /reports/{classId} 루트 바로 아래 파일 커버
      if (classList.items && classList.items.length > 0) {
        for (const itemRef of classList.items) {
          const fileName = itemRef.name;
          const normFile = normalizeName(fileName);

          if (
            normFile.includes(normStudent) ||
            fileName.includes(studentName)
          ) {
            let url = "";
            try {
              url = await getDownloadURL(itemRef);
            } catch (err) {
              console.warn(
                "[ReportManager] getDownloadURL failed (root)",
                fileName,
                err
              );
            }

            const title =
              fileName
                .replace(/\.pdf$/i, "")
                .replace(/_/g, " ") || fileName;

            const fallbackDate = "기타";

            if (!groupedByDate[fallbackDate]) {
              groupedByDate[fallbackDate] = [];
            }
            groupedByDate[fallbackDate].push({
              title,
              fileName,
              url,
            });
          }
        }
      }
    } catch (err) {
      console.error(
        "[ReportManager] Error listing reports for",
        studentName,
        ":",
        err
      );
      return {};
    }

    return groupedByDate;
  },
  
  /**
   * [교사/관리자 화면용 - 목록 불러오기]
   *
   * 1. YYYYMMDD, YYYY-MM-DD 형태의 폴더를 모두 검색
   * 2. 검색에 실패하면, 클래스 루트 폴더를 검색하되, 파일명에 "M월D일" 형태의 날짜가 포함된 파일만 반환
   */
  async listReportsForDateAndClass(classId, dateStr) {
    console.log(
      "[ReportManager] listReportsForDateAndClass called with:",
      classId,
      dateStr
    );

    if (!classId || !dateStr) return [];

    const normalized = normalizeDateFolderName(dateStr); // YYYYMMDD
    const koreanDate = toKoreanDate(dateStr); // M월D일 (예: 10월18일)

    const candidates = [];
    // 1. 숫자만 남긴 버전 (YYYYMMDD)
    if (normalized) candidates.push(normalized);
    // 2. 원본 그대로 (YYYY-MM-DD 또는 YYYYMMDD)
    if (dateStr && dateStr !== normalized) candidates.push(dateStr);
    // 3. YYYY-MM-DD 형태로 변환된 버전
    if (normalized && normalized.length === 8) {
      const hyphenated = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
      if (hyphenated !== dateStr) candidates.push(hyphenated);
    }
    
    // 중복 제거 및 유효한 폴더 이름만 필터링
    const uniqueFolders = [...new Set(candidates)].filter(Boolean);


    // 1단계: 날짜 폴더 검색 (가장 일반적인 경우)
    for (const folderName of uniqueFolders) {
      const folderPath = `reports/${classId}/${folderName}`;
      const folderRef = ref(storage, folderPath);

      const files = await listFilesInFolder(folderRef);

      if (files.length > 0) {
        console.log(
          "[ReportManager] Found reports in date folder:",
          folderName
        );
        return files;
      } else {
        console.log(
          "[ReportManager] No reports found in date folder:",
          folderName
        );
      }
    }

    // ✨ 2단계: 클래스 루트 폴더 검색 (파일이 날짜 폴더 없이 업로드되었을 경우 대비)
    console.log("[ReportManager] Final attempt: checking class root folder for loose reports.");
    const rootPath = `reports/${classId}`;
    const rootRef = ref(storage, rootPath);
    const allRootFiles = await listFilesInFolder(rootRef);
    
    let relevantRootFiles = [];
    if (koreanDate) {
      // 파일명에 '10월18일'과 같은 한국어 날짜 포맷이 포함된 파일만 필터링
      relevantRootFiles = allRootFiles.filter(file => 
        file.fileName.includes(koreanDate)
      );
    } else {
      relevantRootFiles = [];
    }
    
    if (relevantRootFiles.length > 0) {
        console.log("[ReportManager] Found loose reports in root folder matching the date.");
        return relevantRootFiles;
    }
    
    console.log("[ReportManager] No reports found for the selected class and date.");
    return [];
  },

  /**
   * [교사/관리자 화면용 - 단일 파일 URL 얻기]
   *
   * resolve 성공 시: URL(string)
   * 못 찾으면: null
   */
  async getReportDownloadUrl(classId, dateStr, fileName) {
    if (!classId || !dateStr || !fileName) return null;

    const normalized = normalizeDateFolderName(dateStr); // YYYYMMDD
    const koreanDate = toKoreanDate(dateStr); // M월D일 (예: 10월18일)
    
    const candidates = [];
    // 1. 숫자만 남긴 버전 (YYYYMMDD)
    if (normalized) candidates.push(normalized);
    // 2. 원본 그대로 (YYYY-MM-DD 또는 YYYYMMDD)
    if (dateStr && dateStr !== normalized) candidates.push(dateStr);
    // 3. YYYY-MM-DD 형태로 변환된 버전
    if (normalized && normalized.length === 8) {
      const hyphenated = `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
      if (hyphenated !== dateStr) candidates.push(hyphenated);
    }
    
    const uniqueFolders = [...new Set(candidates)].filter(Boolean);

    // 1단계: 날짜 폴더 검색
    for (const folderName of uniqueFolders) {
      const filePath = `reports/${classId}/${folderName}/${fileName}`;
      const fileRef = ref(storage, filePath);
      try {
        const url = await getDownloadURL(fileRef);
        return url; // 찾으면 바로 리턴
      } catch (err) {
        // 다음 후보 폴더로 계속 시도
      }
    }
    
    // ✨ 2단계: 클래스 루트 폴더 검색
    if (koreanDate && fileName.includes(koreanDate)) {
        const rootFilePath = `reports/${classId}/${fileName}`;
        const rootFileRef = ref(storage, rootFilePath);
        try {
            const url = await getDownloadURL(rootFileRef);
            return url;
        } catch(err) {
             // 루트 폴더에도 없으면 실패
        }
    }

    return null;
  },

  /**
   * [관리자 화면용 - 리포트 업로드]
   *
   * @param {File} file 업로드할 파일 객체
   * @param {string} classId 반 문서 ID
   * @param {string} dateStr 날짜 문자열 ("YYYYMMDD")
   * @returns {Promise<boolean>} 성공 여부
   */
  async uploadReport(file, classId, dateStr) {
    const filePath = `reports/${classId}/${dateStr}/${file.name}`;
    const fileRef = ref(storage, filePath);

    console.log(`[ReportManager] Attempting to upload: ${filePath}`);

    try {
      await uploadBytes(fileRef, file);
      console.log(`[ReportManager] Upload successful: ${filePath}`);
      return true;
    } catch (err) {
      console.error(`[ReportManager] Upload failed for ${filePath}:`, err);
      return false;
    }
  },

  /**
   * [관리자 화면용 - 리포트 삭제]
   *
   * @param {string} storagePath 삭제할 파일의 전체 Storage 경로
   * @returns {Promise<boolean>} 성공 여부
   */
  async deleteReport(storagePath) {
    if (!storagePath) return false;

    console.log(`[ReportManager] Attempting to delete: ${storagePath}`);
    const fileRef = ref(storage, storagePath);

    try {
      await deleteObject(fileRef); // Cloud Storage에서 파일 삭제
      console.log(`[ReportManager] Delete successful: ${storagePath}`);
      return true;
    } catch (err) {
      console.error(`[ReportManager] Delete failed for ${storagePath}:`, err);
      return false;
    }
  },
};