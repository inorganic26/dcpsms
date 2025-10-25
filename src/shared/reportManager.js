// shared/reportManager.js
//
// 공통 보고서(리포트) 관리 유틸
//
// 학생 화면:
//   await reportManager.listStudentReports(classId, studentName)
//   -> {
//        "20251025": [
//          { title: "...", fileName: "...pdf", url: "https://..." },
//          ...
//        ],
//      }
//
// 선생님/관리자 화면 (teacherApp):
//   await reportManager.listReportsForDateAndClass(classId, dateStr)
//   -> [
//        { title: "...", fileName: "...pdf", url: "https://..." },
//        ...
//      ]
//
//   await reportManager.getReportDownloadUrl(classId, dateStr, fileName)
//   -> "https://...." (해당 파일의 직접 다운로드/보기 URL)
//
// Storage 구조 가정:
//   reports/{classId}/{dateStr}/파일.pdf
// 예:
//   reports/khfCgNHgcWGg9ahNhrRn/20251025/중3화목_10월18일_김가은_리포트.pdf
//
// storage.rules 에서는 reports/{classId}/ 이하 read 허용돼 있어야 한다
// (우리가 rules에서 로그인한 사용자 read 허용으로 열어둔 상태)

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

// --------------------------------------------------
// 내부 유틸: 특정 storage 경로(folderRef) 아래 pdf 파일들을
// [{ title, fileName, url }, ...] 로 변환.
// 각 항목의 url은 getDownloadURL()로 만든 실제 접근 URL.
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
   * 특정 반(classId), 특정 학생 이름(studentName)에 해당하는
   * 모든 리포트를 날짜별로 묶어서 반환.
   *
   * return 예:
   * {
   * "20251025": [
   * {
   * title: "중3화목 10월18일 김가은 리포트",
   * fileName: "중3화목_10월18일_김가은_리포트.pdf",
   * url: "https://..."
   * }
   * ],
   * "기타": [...]
   * }
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
      // /reports/{classId} 아래 하위(날짜 폴더) + 루트 파일들 스캔
      const classRef = ref(storage, basePath);
      const classList = await listAll(classRef);

      //
      // 1) 날짜 폴더들 순회
      //
      for (const datePrefixRef of classList.prefixes) {
        // ex) "20251025" 또는 "2025-10-25"
        const rawDateFolderName = datePrefixRef.name;
        // 화면에 묶을 key는 숫자만 버전(없으면 원본)
        const normalizedDateKey =
          normalizeDateFolderName(rawDateFolderName) || rawDateFolderName;

        const dateList = await listAll(datePrefixRef);

        for (const itemRef of dateList.items) {
          const fileName = itemRef.name; // "중3화목_10월18일_김가은_리포트.pdf"
          const normFile = normalizeName(fileName);

          // 파일명에 학생 이름이 들어가 있는지 (공백 제거 버전 포함)
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

            console.log(
              "[ReportManager] Found report:",
              fileName,
              "for date folder:",
              rawDateFolderName
            );

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

      //
      // 2) /reports/{classId} 루트 바로 아래 파일도 커버 (날짜 폴더 없이 올린 경우)
      //
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

            console.log(
              "[ReportManager] Found report (no subfolder):",
              fileName,
              "as date:",
              fallbackDate
            );

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

      console.log(
        "[ReportManager] Final groupedByDate:",
        groupedByDate
      );
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
   * teacherApp에서 이렇게 부르고 있음:
   * reportManager.listReportsForDateAndClass(classId, dateStr)
   *
   * classId 예: "khfCgNHgcWGg9ahNhrRn"
   * dateStr  예: "2025-10-25" (input[type="date"]) 또는 "20251025"
   *
   * 실제 Storage 폴더명은 하이픈이 없을 수도 있고 있을 수도 있으므로
   * - 원본 dateStr
   * - 숫자만 남긴 dateStr
   * 두 후보를 순서대로 시도해서
   * 첫 번째로 실제 파일이 존재하는 폴더의 파일 리스트를 반환.
   *
   * return 예:
   * [
   * {
   * title: "중3화목 10월18일 김가은 리포트",
   * fileName: "중3화목_10월18일_김가은_리포트.pdf",
   * url: "https://..."
   * },
   * ...
   * ]
   */
  async listReportsForDateAndClass(classId, dateStr) {
    console.log(
      "[ReportManager] listReportsForDateAndClass called with:",
      classId,
      dateStr
    );

    // dateStr 후보들:
    //   - 원본 그대로 (예: "2025-10-25")
    //   - 숫자만 남긴 버전 (예: "20251025")
    const candidates = [];
    if (dateStr) {
      candidates.push(dateStr);
      const normalized = normalizeDateFolderName(dateStr);
      if (normalized && normalized !== dateStr) {
        candidates.push(normalized);
      }
    }

    // 중복 제거
    const uniqueFolders = [...new Set(candidates)].filter(Boolean);

    for (const folderName of uniqueFolders) {
      const folderPath = `reports/${classId}/${folderName}`;
      const folderRef = ref(storage, folderPath);

      const files = await listFilesInFolder(folderRef);

      if (files.length > 0) {
        console.log(
          "[ReportManager] Found reports in folder:",
          folderName,
          files
        );
        return files;
      } else {
        console.log(
          "[ReportManager] No reports found in folder:",
          folderName
        );
      }
    }

    console.log(
      "[ReportManager] No reports found for any candidate folders:",
      uniqueFolders
    );
    return [];
  },

  /**
   * [교사/관리자 화면용 - 단일 파일 URL 얻기]
   *
   * teacherApp 쪽 "보기/다운로드" 버튼은 예전 코드대로
   * reportManager.getReportDownloadUrl(classId, dateStr, fileName)
   * 이런 식으로 부르고 있을 가능성이 높다.
   *
   * 이 함수는 위와 같은 인자를 받아서
   * Storage 경로를 찾아 getDownloadURL()로 실제 열 수 있는 URL을 리턴한다.
   *
   * - dateStr: "2025-10-25" 또는 "20251025"
   * => 여기서도 위와 동일하게 원본 / normalize 둘 다 시도
   *
   * resolve 성공 시: URL(string)
   * 못 찾으면: null
   */
  async getReportDownloadUrl(classId, dateStr, fileName) {
    console.log(
      "[ReportManager] getReportDownloadUrl called with:",
      classId,
      dateStr,
      fileName
    );

    if (!classId || !dateStr || !fileName) {
      console.warn(
        "[ReportManager] getReportDownloadUrl missing args",
        classId,
        dateStr,
        fileName
      );
      return null;
    }

    // date 후보들
    const candidates = [];
    candidates.push(dateStr);
    const normalized = normalizeDateFolderName(dateStr);
    if (normalized && normalized !== dateStr) {
      candidates.push(normalized);
    }

    const uniqueFolders = [...new Set(candidates)].filter(Boolean);

    for (const folderName of uniqueFolders) {
      const filePath = `reports/${classId}/${folderName}/${fileName}`;
      const fileRef = ref(storage, filePath);

      try {
        const url = await getDownloadURL(fileRef);
        console.log(
          "[ReportManager] getReportDownloadUrl resolved:",
          filePath,
          url
        );
        return url;
      } catch (err) {
        // 못 찾으면 다음 후보 폴더로 계속 시도
        console.warn(
          "[ReportManager] getReportDownloadUrl failed for",
          filePath,
          err
        );
      }
    }

    console.warn(
      "[ReportManager] getReportDownloadUrl: no matching file found for any candidate folders"
    );
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
   * @param {string} storagePath 삭제할 파일의 전체 Storage 경로 (예: reports/classId/dateStr/fileName.pdf)
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
      // 파일이 없거나(not-found) 권한 오류(permission-denied) 등 발생 가능
      console.error(`[ReportManager] Delete failed for ${storagePath}:`, err);
      return false;
    }
  },
};