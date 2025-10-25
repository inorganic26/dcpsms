// src/student/studentApp.js

import {
  collection,
  doc,
  getDocs,
  getDoc,
  where,
  query,
  orderBy,
} from "firebase/firestore";
import { db, ensureAnonymousAuth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

// 모듈
import { studentAuth } from "./studentAuth.js";
import { studentLesson } from "./studentLesson.js";
// 🚨 수정된 부분: Default Export로 변경된 studentHomework 모듈을 가져옵니다.
import studentHomework from "./studentHomework.js"; 
import { reportManager } from "../shared/reportManager.js";

const StudentApp = {
  isInitialized: false,
  elements: {},
  state: {
    // 로그인/학생 기본 상태
    authUid: null,
    studentName: null,
    classId: null,
    className: null,
    classType: null, // 'self-directed' | 'live-lecture'

    // 과목 / 레슨 상태
    activeSubjects: [], // [{id, name}]
    selectedSubject: null, // {id, name}
    lessons: [], // 현재 과목의 레슨들
    activeLesson: null,

    // 반 영상 (현강/질문)
    classVideosByDate: {}, // { 'YYYY-MM-DD': [{title, videoId, url}] }
    qnaVideosByDate: {},

    currentVideoDate: null,
    currentVideoType: null, // "class" | "qna"

    // 리포트
    reportsByDate: {}, // { 'YYYYMMDD': [{ title, fileName, url }] }
  },

  // ----------------------------------
  // 초기화
  // ----------------------------------
  init() {
    if (this.isInitialized) return;
    this.isInitialized = true;

    // DOM 요소 캐싱
    this.cacheElements();

    // 화면 내 버튼/이벤트 연결
    this.addEventListeners();

    // 서브 모듈 초기화
    studentAuth.init(this);
    studentLesson.init(this);
    studentHomework.init(this);

    // 첫 화면은 로그인 화면
    studentAuth.showLoginScreen();
  },

  // ----------------------------------
  // DOM 캐싱
  // ----------------------------------
  cacheElements() {
    this.elements = {
      // 공통 화면들
      loadingScreen: document.getElementById("student-loading-screen"),
      loginScreen: document.getElementById("student-login-screen"),

      // 로그인 영역
      classSelect: document.getElementById("student-class-select"),
      nameSelect: document.getElementById("student-name-select"),
      passwordInput: document.getElementById("student-password"),
      loginBtn: document.getElementById("student-login-btn"),

      // 메인 메뉴 / 대시보드
      subjectSelectionScreen: document.getElementById(
        "student-subject-selection-screen"
      ),
      welcomeMessage: document.getElementById("student-welcome-message"),
      startLessonCard: document.getElementById("student-start-lesson-card"),
      subjectsList: document.getElementById("student-subjects-list"),

      gotoClassVideoCard: document.getElementById(
        "student-goto-class-video-card"
      ),
      gotoQnaVideoCard: document.getElementById("student-goto-qna-video-card"),
      gotoHomeworkCard: document.getElementById("student-goto-homework-card"),
      gotoReportCard: document.getElementById("student-goto-report-card"),

      // 레슨 선택 화면
      lessonSelectionScreen: document.getElementById(
        "student-lesson-selection-screen"
      ),
      selectedSubjectTitle: document.getElementById(
        "student-selected-subject-title"
      ),
      lessonsList: document.getElementById("student-lessons-list"),
      backToSubjectsBtn: document.getElementById(
        "student-back-to-subjects-btn"
      ),

      // 개념 영상 화면 (video1)
      video1Screen: document.getElementById("student-video1-screen"),
      video1Title: document.getElementById("student-video1-title"),
      video1Iframe: document.getElementById("student-video1-iframe"),
      gotoRev1Btn: document.getElementById("student-goto-rev1-btn"),
      startQuizBtn: document.getElementById("student-start-quiz-btn"),
      backToLessonsFromVideoBtn: document.getElementById(
        "student-back-to-lessons-from-video-btn"
      ),

      // 퀴즈 화면
      quizScreen: document.getElementById("student-quiz-screen"),
      progressText: document.getElementById("student-progress-text"),
      scoreText: document.getElementById("student-score-text"),
      progressBar: document.getElementById("student-progress-bar"),
      questionText: document.getElementById("student-question-text"),
      optionsContainer: document.getElementById("student-options-container"),
      submitAnswerBtn: document.getElementById("student-submit-answer-btn"),
      retryQuizBtn: document.getElementById("student-retry-quiz-btn"),
      // (퀴즈 결과/재시작 버튼 등은 studentLesson 쪽에서 처리)

      // 숙제 화면
      homeworkScreen: document.getElementById("student-homework-screen"),
      homeworkList: document.getElementById("student-homework-list"),
      backToSubjectsFromHomeworkBtn: document.getElementById(
        "student-back-to-subjects-from-homework-btn"
      ),
      uploadModal: document.getElementById("student-upload-modal"),
      uploadModalTitle: document.getElementById("student-upload-modal-title"),
      closeUploadModalBtn: document.getElementById(
        "student-close-upload-modal-btn"
      ),
      filesInput: document.getElementById("student-homework-files-input"),
      previewContainer: document.getElementById(
        "student-homework-preview-container"
      ),
      cancelUploadBtn: document.getElementById("student-cancel-upload-btn"),
      uploadBtn: document.getElementById("student-upload-btn"),
      uploadBtnText: document.getElementById("student-upload-btn-text"),
      uploadLoader: document.getElementById("student-upload-loader"),

      // 반 영상 날짜 선택 화면들
      classVideoDateScreen: document.getElementById(
        "student-class-video-date-screen"
      ),
      classVideoDateList: document.getElementById(
        "student-class-video-date-list"
      ),
      qnaVideoDateScreen: document.getElementById(
        "student-qna-video-date-screen"
      ),
      qnaVideoDateList: document.getElementById("student-qna-video-date-list"),

      // 날짜별 영상 제목 목록 화면
      videoTitlesScreen: document.getElementById(
        "student-video-titles-screen"
      ),
      videoTitlesDate: document.getElementById("student-video-titles-date"),
      backToVideoDatesBtn: document.getElementById(
        "student-back-to-video-dates-btn"
      ),
      videoTitlesList: document.getElementById("student-video-titles-list"),

      // 영상 재생 모달
      videoDisplayModal: document.getElementById(
        "student-video-display-modal"
      ),
      videoModalTitle: document.getElementById("student-video-modal-title"),
      closeVideoModalBtn: document.getElementById(
        "student-close-video-modal-btn"
      ),
      videoModalContent: document.getElementById(
        "student-video-modal-content"
      ),

      // 시험 결과 리포트 리스트 화면
      reportListScreen: document.getElementById(
        "student-report-list-screen"
      ),
      backToMenuFromReportListBtn: document.getElementById(
        "student-back-to-menu-from-report-list-btn"
      ),
      reportListContainer: document.getElementById("student-report-list"),

      // 리포트 보기 모달 (현재는 안 쓸 예정이지만 DOM은 잡아둔다)
      reportViewerModal: document.getElementById(
        "student-report-viewer-modal"
      ),
      reportModalTitle: document.getElementById("student-report-modal-title"),
      closeReportModalBtn: document.getElementById(
        "student-close-report-modal-btn"
      ),
      reportIframe: document.getElementById("student-report-iframe"),
    };
  },

  // ----------------------------------
  // 공통 이벤트 리스너
  // ----------------------------------
  addEventListeners() {
    // 기본 네비게이션
    this.elements.backToSubjectsBtn?.addEventListener("click", () =>
      this.showSubjectSelectionScreen()
    );
    this.elements.backToLessonsFromVideoBtn?.addEventListener("click", () =>
      this.showLessonSelectionScreen()
    );
    this.elements.backToSubjectsFromHomeworkBtn?.addEventListener(
      "click",
      () => this.showSubjectSelectionScreen()
    );
    this.elements.backToVideoDatesBtn?.addEventListener("click", () =>
      this.backToVideoDatesScreen()
    );

    // 리포트 화면에서 ← 메뉴로 돌아가기
    this.elements.backToMenuFromReportListBtn?.addEventListener(
      "click",
      () => this.showSubjectSelectionScreen()
    );

    // 메인 메뉴 카드들
    this.elements.gotoHomeworkCard?.addEventListener("click", () =>
      studentHomework.showHomeworkScreen()
    );
    this.elements.gotoClassVideoCard?.addEventListener("click", () =>
      this.showClassVideoDateScreen()
    );
    this.elements.gotoQnaVideoCard?.addEventListener("click", () =>
      this.showQnaVideoDateScreen()
    );
    this.elements.gotoReportCard?.addEventListener("click", () =>
      this.showReportListScreen()
    );

    // 모달 닫기 버튼들
    this.elements.closeVideoModalBtn?.addEventListener("click", () =>
      this.closeVideoModal()
    );
    this.elements.closeReportModalBtn?.addEventListener("click", () =>
      this.closeReportModal()
    );
  },

  // ----------------------------------
  // 화면 전환 유틸
  // ----------------------------------
  showScreen(screenEl) {
    // 모든 screen 숨기기
    const screens = document.querySelectorAll(".student-screen");
    screens.forEach((el) => {
      el.style.display = "none";
    });

    // 모든 iframe(src 초기화해서 영상 멈추기)
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => {
      if (iframe && iframe.src && iframe.src !== "about:blank") {
        iframe.src = "about:blank";
      }
    });

    // 비디오 모달 강제 닫기
    this.closeVideoModal();
    // 리포트 모달 강제 닫기
    this.closeReportModal();

    // 대상 화면만 표시
    if (screenEl) {
      screenEl.style.display = "flex";
    }
  },

  // ----------------------------------
  // 메인 메뉴(대시보드)
  // ----------------------------------
  showSubjectSelectionScreen() {
    if (this.elements.welcomeMessage) {
      this.elements.welcomeMessage.textContent = `${
        this.state.studentName || "학생"
      }님, 환영합니다!`;
    }

    const isLiveLecture = this.state.classType === "live-lecture";
    const isSelfDirected = !isLiveLecture;

    // 자기주도반만 "학습 시작하기(과목 선택)" 카드 노출
    if (this.elements.startLessonCard) {
      this.elements.startLessonCard.style.display = isSelfDirected
        ? "flex"
        : "none";
    }

    // 현강반만 "수업 영상 보기" 카드 노출
    if (this.elements.gotoClassVideoCard) {
      this.elements.gotoClassVideoCard.style.display = isLiveLecture
        ? "flex"
        : "none";
    }

    // 공통으로 보여줄 카드들 (질문 영상 / 숙제 제출 / 시험 결과 리포트)
    const commonMenuStyle = this.state.classId ? "flex" : "none";
    if (this.elements.gotoQnaVideoCard)
      this.elements.gotoQnaVideoCard.style.display = commonMenuStyle;
    if (this.elements.gotoHomeworkCard)
      this.elements.gotoHomeworkCard.style.display = commonMenuStyle;
    if (this.elements.gotoReportCard)
      this.elements.gotoReportCard.style.display = commonMenuStyle;

    // 자기주도반이라면 과목 목록 렌더링
    if (isSelfDirected && this.elements.subjectsList) {
      this.elements.subjectsList.innerHTML = "";
      if (this.state.activeSubjects.length === 0) {
        this.elements.subjectsList.innerHTML = `
          <p class="text-center text-sm text-slate-400 py-4">
            수강 가능한 과목이 없습니다.
          </p>`;
      } else {
        this.state.activeSubjects.forEach((subject) =>
          this.renderSubjectChoice(subject)
        );
      }
    } else if (this.elements.subjectsList) {
      // 현강반이면 과목 박스는 비워둠
      this.elements.subjectsList.innerHTML = `
        <p class="text-center text-sm text-slate-400 py-4">
          현강반은 '수업 영상 보기'를 이용하세요.
        </p>`;
    }

    this.showScreen(this.elements.subjectSelectionScreen);
  },

  // ----------------------------------
  // 과목 → 레슨 선택 화면
  // ----------------------------------
  showLessonSelectionScreen() {
    if (this.state.classType === "live-lecture") {
      // 현강반은 이 화면 쓸 일이 없음
      showToast("현강반은 '수업 영상 보기'를 이용하세요.");
      this.showSubjectSelectionScreen();
      return;
    }

    if (!this.state.selectedSubject || !this.elements.selectedSubjectTitle) {
      showToast("과목 정보를 표시할 수 없습니다.");
      this.showSubjectSelectionScreen();
      return;
    }

    // 화면 상단 제목 바꾸기
    this.elements.selectedSubjectTitle.textContent =
      this.state.selectedSubject.name;

    // 레슨 목록 가져와서 렌더
    this.listenForAvailableLessons();

    // 레슨 선택 화면 보여주기
    this.showScreen(this.elements.lessonSelectionScreen);
  },

  // ----------------------------------
  // 반 영상 날짜 목록 (현강)
  // ----------------------------------
  async showClassVideoDateScreen() {
    await this.loadAndRenderVideoDates("class");
    this.showScreen(this.elements.classVideoDateScreen);
  },

  async showQnaVideoDateScreen() {
    await this.loadAndRenderVideoDates("qna");
    this.showScreen(this.elements.qnaVideoDateScreen);
  },

  backToVideoDatesScreen() {
    if (this.state.currentVideoType === "qna") {
      this.showScreen(this.elements.qnaVideoDateScreen);
    } else {
      this.showScreen(this.elements.classVideoDateScreen);
    }
  },

  // 날짜별 영상 제목 목록
  showVideoTitlesForDate(videoType, date) {
    this.state.currentVideoDate = date;
    this.state.currentVideoType = videoType;

    const stateKey = videoType === "qna" ? "qnaVideosByDate" : "classVideosByDate";
    const videos = this.state[stateKey]?.[date] || [];

    if (this.elements.videoTitlesDate) {
      this.elements.videoTitlesDate.textContent = `${date} ${
        videoType === "qna" ? "질문" : "수업"
      } 영상 목록`;
    }

    if (!this.elements.videoTitlesList) return;
    this.elements.videoTitlesList.innerHTML = "";

    if (videos.length === 0) {
      this.elements.videoTitlesList.innerHTML = `
        <p class="text-center text-slate-500 py-8">
          해당 날짜에 영상이 없습니다.
        </p>`;
    } else {
      videos.forEach((video) => {
        const button = document.createElement("button");
        button.className =
          "w-full p-3 border border-gray-200 rounded-md font-medium text-slate-700 hover:bg-gray-50 transition text-left";
        button.textContent = video.title || "제목 없음";
        button.addEventListener("click", () =>
          this.playVideoInModal(video, videoType)
        );
        this.elements.videoTitlesList.appendChild(button);
      });
    }

    this.showScreen(this.elements.videoTitlesScreen);
  },

  // 반 영상 날짜 목록 로딩
  async loadAndRenderVideoDates(videoType) {
    const isQna = videoType === "qna";
    const collectionName = isQna ? "classVideos" : "classLectures";
    const dateFieldName = isQna ? "videoDate" : "lectureDate";
    const listElement = isQna
      ? this.elements.qnaVideoDateList
      : this.elements.classVideoDateList;
    const stateKey = isQna ? "qnaVideosByDate" : "classVideosByDate";

    if (!listElement) return;

    if (!this.state.classId) {
        listElement.innerHTML = `
          <p class="text-center text-slate-500 py-8">
            반 배정 정보가 없어 영상을 조회할 수 없습니다.
          </p>`;
        return;
    }

    listElement.innerHTML = `<div class="loader mx-auto my-4"></div>`;

    try {
      const qCol = query(
        collection(db, collectionName),
        where("classId", "==", this.state.classId),
        orderBy(dateFieldName, "desc")
      );
      const snapshot = await getDocs(qCol);

      const videosByDate = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const d =
          (data[dateFieldName] || "").slice?.(0, 10) ||
          ""; // 기대: "YYYY-MM-DD"
        if (!d) return;
        if (!videosByDate[d]) videosByDate[d] = [];
        // 수업 영상(classLectures)은 videos 배열 안에 실제 영상 목록이 있으므로
        // videos 필드의 배열을 개별 영상으로 풀어줘야 함.
        if (collectionName === "classLectures" && Array.isArray(data.videos)) {
            data.videos.forEach(video => {
                // video 객체에 date 정보 추가 (제목 화면에 전달용)
                videosByDate[d].push({
                    id: docSnap.id,
                    title: video.title || "제목 없음",
                    url: video.url || "",
                    videoId: video.videoId || "",
                });
            });
        } else {
            // QnA 영상 (classVideos) 또는 수업 영상 배열이 없는 경우
            videosByDate[d].push({
                id: docSnap.id,
                title: data.title || "제목 없음",
                url: data.youtubeUrl || data.url || "", // QnA는 youtubeUrl 필드 사용
                videoId: data.videoId || "",
            });
        }
      });

      this.state[stateKey] = videosByDate;

      // 날짜 버튼 렌더
      listElement.innerHTML = "";
      const dates = Object.keys(videosByDate);
      if (dates.length === 0) {
        listElement.innerHTML = `
          <p class="text-center text-slate-500 py-8">
            영상이 없습니다.
          </p>`;
        return;
      }

      dates.forEach((date) => {
        const btn = document.createElement("button");
        btn.className =
          "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition";
        btn.textContent = date;
        btn.addEventListener("click", () =>
          this.showVideoTitlesForDate(videoType, date)
        );
        listElement.appendChild(btn);
      });
    } catch (e) {
      console.error("[studentApp] loadAndRenderVideoDates error:", e);
      listElement.innerHTML = `
        <p class="text-center text-slate-500 py-8">
          목록을 불러오는 중 오류가 발생했습니다.
        </p>`;
    }
  },

  // ----------------------------------
  // 반 영상 모달
  // ----------------------------------
  playVideoInModal(video) {
    if (!this.elements.videoDisplayModal || !this.elements.videoModalContent)
      return;

    // 비워주고 새 iframe
    const container = this.elements.videoModalContent;
    container.innerHTML = "";
    
    // 제목 업데이트
    if (this.elements.videoModalTitle) {
        this.elements.videoModalTitle.textContent = video.title || "영상 보기";
    }

    const iframe = document.createElement("iframe");
    iframe.className = "w-full aspect-video";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share; picture-in-picture";
    iframe.allowFullscreen = true;

    const embed = this.getYoutubeEmbedUrl(video.url || "", video.videoId || "");
    iframe.src = embed || (video.url || "about:blank");

    container.appendChild(iframe);

    // 모달 열기
    this.elements.videoDisplayModal.style.display = "flex";
    document.body.classList.add("modal-open");
  },

  closeVideoModal() {
    if (!this.elements.videoDisplayModal) return;
    this.elements.videoDisplayModal.style.display = "none";
    if (this.elements.videoModalContent)
      this.elements.videoModalContent.innerHTML = "";
    document.body.classList.remove("modal-open");
  },

  getYoutubeEmbedUrl(url, videoId) {
    let id = "";
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      id = videoId;
    }
    if (!id && typeof url === "string") {
      const m = url.match(
        /(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/
      );
      if (m) id = m[1];
    }
    return id
      ? `https://www.youtube.com/embed/${id}?enablejsapi=1`
      : "";
  },

  // ----------------------------------
  // 시험 결과 리포트 화면
  // ----------------------------------
  async showReportListScreen() {
    const listEl = this.elements.reportListContainer;
    if (!listEl) return;

    if (!this.state.classId) {
      showToast("반 배정 정보가 없습니다.");
      listEl.innerHTML = `
        <p class="text-center text-slate-500 py-8">
          반 배정 정보 없음
        </p>`;
      this.showScreen(this.elements.reportListScreen);
      return;
    }

    if (!this.state.studentName) {
      listEl.innerHTML = `
        <p class="text-center text-slate-500 py-8">
          학생 정보 로딩 중...
        </p>`;
      this.showScreen(this.elements.reportListScreen);
      return;
    }

    // 먼저 빈 화면 보여주고 로딩 메시지
    this.showScreen(this.elements.reportListScreen);
    listEl.innerHTML = `<div class="loader mx-auto my-4"></div>`;

    try {
      // reportManager에서 학생 리포트 가져오기
      const reports = await reportManager.listStudentReports(
        this.state.classId,
        this.state.studentName
      );

      // reports = { '20251025': [ {title,fileName,url}, ... ], ... }
      this.state.reportsByDate = reports || {};
      listEl.innerHTML = "";

      const dates = Object.keys(this.state.reportsByDate);
      if (dates.length === 0) {
        listEl.innerHTML = `
          <p class="text-center text-slate-500 py-8">
            조회 가능한 리포트가 없습니다.
          </p>`;
        return;
      }

      // 날짜별 그룹 렌더
      dates.forEach((date) => {
        const group = this.state.reportsByDate[date] || [];

        const section = document.createElement("section");
        section.className = "mb-6";

        const h = document.createElement("h3");
        h.className = "text-sm font-semibold text-slate-500 mb-3";
        h.textContent = date;
        section.appendChild(h);

        group.forEach((rep) => {
          const btn = document.createElement("button");
          btn.className =
            "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left";
          btn.textContent =
            rep.title || rep.fileName || "리포트";

          btn.addEventListener("click", () => {
            this.showReportInModal(btn.textContent, rep.url);
          });

          section.appendChild(btn);
        });

        listEl.appendChild(section);
      });
    } catch (e) {
      console.error("[studentApp] report load error:", e);
      listEl.innerHTML = `
        <p class="text-center text-slate-500 py-8">
          목록을 불러오는 중 오류가 발생했습니다.
        </p>`;
    }
  },

  // ✅ 변경된 부분:
  // 예전에는 모달 열고 iframe.src에 PDF를 넣었는데
  // 이제는 그냥 새 탭으로 PDF를 연다.
  // 이유: Storage에서 내려오는 URL은 iframe embed가 막혀있어서
  // 모달은 뜨지만 내용이 비어 보여서 화면을 덮어버림.
  showReportInModal(title, pdfUrl) {
    if (!pdfUrl) {
      showToast("리포트 파일 URL이 없습니다.", true);
      return;
    }

    // 그냥 새 탭으로 열기
    window.open(pdfUrl, "_blank");

    // 혹시 떠 있는 모달이 있으면 닫는다 (안 떠 있어도 안전)
    this.closeReportModal();
  },

  closeReportModal() {
    if (!this.elements.reportViewerModal) return;
    this.elements.reportViewerModal.style.display = "none";
    if (this.elements.reportIframe) {
      this.elements.reportIframe.src = "about:blank";
    }
    document.body.classList.remove("modal-open");
  },

  // ----------------------------------
  // 과목 목록 로드 (subjects 컬렉션 기반)
  // ----------------------------------
  async loadAvailableSubjects() {
    console.log("[studentApp] loadAvailableSubjects - Loading subjects from 'subjects' collection.");
    
    // 현강반이거나 classId가 없더라도 subjects 목록은 로드하여 메뉴를 표시함.
    // 다만, 현강반은 메뉴 화면에서 '과목별 학습 시작' 카드 자체가 숨겨짐.
    
    try {
      // subjects 컬렉션 전체를 조회합니다.
      const q = query(collection(db, "subjects"));
      const snapshot = await getDocs(q);

      const subjects = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "이름 없음",
      }));

      subjects.sort((a, b) => a.name.localeCompare(b.name, "ko"));
      this.state.activeSubjects = subjects;
      console.log("[studentApp] loadAvailableSubjects - Successfully loaded subjects:", this.state.activeSubjects.length);

    } catch (e) {
      console.error("[studentApp] loadAvailableSubjects error:", e);
      this.state.activeSubjects = [];
      showToast("과목 목록을 불러오는 중 오류가 발생했습니다.", true);
    }

    this.showSubjectSelectionScreen();
  },

  async listenForAvailableLessons() {
    if (!this.state.classId || !this.state.selectedSubject) {
        if (this.elements.lessonsList) {
          this.elements.lessonsList.innerHTML = "";
        }
        return;
    }

    const subjectKey = this.state.selectedSubject.id;

    if (this.elements.lessonsList) {
      this.elements.lessonsList.innerHTML =
        `<div class="loader mx-auto my-4"></div>`;
    }

    try {
      // subject 필드명이 다를 수 있으므로 두 번 조회 후 merge
      const q1 = query(
        collection(db, "lessons"),
        where("classId", "==", this.state.classId),
        where("subject", "==", subjectKey)
      );
      const q2 = query(
        collection(db, "lessons"),
        where("classId", "==", this.state.classId),
        where("subjectName", "==", this.state.selectedSubject.name)
      );

      const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const merged = new Map();

      for (const snap of [s1, s2]) {
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          const enabled = d.isActive !== false;
          if (!enabled) return;

          // 정렬용 값
          const orderValue =
            typeof d.order === "number"
              ? d.order
              : Number.isFinite(d.index)
              ? d.index
              : 9999;

          merged.set(docSnap.id, {
            id: docSnap.id,
            title: d.title || "제목 없음",
            order: orderValue,
            createdAt: d.createdAt || null,
            video1Url: d.video1Url || d.videoUrl || d.url || "",
            video2Url: d.video2Url || "",
            video1RevUrls: d.video1RevUrls || [],
            video2RevUrls: d.video2RevUrls || [],
            questionBank: d.questionBank || [],
            isActive: d.isActive,
            // 나머지 필드도 그대로 둠
            ...d,
          });
        });
      }

      // 정렬: order ASC, createdAt DESC fallback
      const list = Array.from(merged.values()).sort((a, b) => {
        if (a.order !== b.order) return a.order - b.order;
        const ad = a.createdAt || "";
        const bd = b.createdAt || "";
        return bd.localeCompare(ad);
      });

      this.state.lessons = list;

      // 렌더
      if (this.elements.lessonsList) {
        if (list.length === 0) {
          this.elements.lessonsList.innerHTML = `
            <p class="text-center text-slate-500 py-8">
              이 과목에 등록된 학습이 없습니다.
            </p>`;
        } else {
          this.elements.lessonsList.innerHTML = "";
          list.forEach((lesson) => this.renderLessonChoice(lesson));
        }
      }
    } catch (e) {
      console.error("[studentApp] listenForAvailableLessons error:", e);
      if (this.elements.lessonsList) {
        this.elements.lessonsList.innerHTML = `
          <p class="text-center text-slate-500 py-8">
            목록을 불러오는 중 오류가 발생했습니다.
          </p>`;
      }
    }
  },

  // 과목 버튼 렌더
  renderSubjectChoice(subject) {
    if (!this.elements.subjectsList) return;
    const btn = document.createElement("button");
    btn.className =
      "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left";
    btn.textContent = subject.name;
    btn.addEventListener("click", () => {
      this.state.selectedSubject = subject;
      this.showLessonSelectionScreen();
    });
    this.elements.subjectsList.appendChild(btn);
  },

  // 레슨 버튼 렌더
  renderLessonChoice(lesson) {
    if (!this.elements.lessonsList) return;
    const btn = document.createElement("button");
    btn.className =
      "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left";
    btn.textContent = lesson.title || "제목 없음";
    btn.addEventListener("click", () => {
      // 어떤 레슨을 시작할지 studentLesson에게 넘김
      studentLesson.startSelectedLesson(lesson);
    });
    this.elements.lessonsList.appendChild(btn);
  },
};

// Firebase 익명 인증 완료 후 앱 시작
document.addEventListener("DOMContentLoaded", () => {
  ensureAnonymousAuth((user) => {
    StudentApp.state.authUid = user?.uid || null;
    StudentApp.init();
  });
});

export default StudentApp;