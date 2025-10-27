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
    selectedClassData: null,

    // 과목 / 레슨 상태
    activeSubjects: [], // [{id, name}] - 반 설정에 따른 과목
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

    // 퀴즈 상태 (studentLesson에서 주로 사용하나, 초기화 위해 여기에 선언)
    quizQuestions: [],
    currentQuestionIndex: 0,
    score: 0,
    totalQuizQuestions: 5,
    passScore: 4, // 👈 통과 기준 점수 4점으로 변경

    // 보충 영상 상태
    currentRevVideoIndex: 0,
  },

  // ----------------------------------
  // 초기화
  // ----------------------------------
  init() {
    console.log("[StudentApp.init] Initializing app...");
    if (this.isInitialized) {
        console.warn("[StudentApp.init] App already initialized. Skipping.");
        return;
    }
    this.isInitialized = true;
    this.cacheElements();
    this.addEventListeners();
    studentAuth.init(this);
    studentLesson.init(this);
    studentHomework.init(this);
    studentAuth.showLoginScreen();
    console.log("[StudentApp.init] App initialization complete.");
  },

  // ----------------------------------
  // DOM 캐싱
  // ----------------------------------
  cacheElements() {
    this.elements = {
      loadingScreen: document.getElementById("student-loading-screen"),
      loginScreen: document.getElementById("student-login-screen"),
      classSelect: document.getElementById("student-class-select"),
      nameSelect: document.getElementById("student-name-select"),
      passwordInput: document.getElementById("student-password"),
      loginBtn: document.getElementById("student-login-btn"),
      subjectSelectionScreen: document.getElementById("student-subject-selection-screen"),
      welcomeMessage: document.getElementById("student-welcome-message"),
      startLessonCard: document.getElementById("student-start-lesson-card"),
      subjectsList: document.getElementById("student-subjects-list"),
      gotoClassVideoCard: document.getElementById("student-goto-class-video-card"),
      gotoQnaVideoCard: document.getElementById("student-goto-qna-video-card"),
      gotoHomeworkCard: document.getElementById("student-goto-homework-card"),
      gotoReportCard: document.getElementById("student-goto-report-card"),
      lessonSelectionScreen: document.getElementById("student-lesson-selection-screen"),
      selectedSubjectTitle: document.getElementById("student-selected-subject-title"),
      lessonsList: document.getElementById("student-lessons-list"),
      backToSubjectsBtn: document.getElementById("student-back-to-subjects-btn"),
      video1Screen: document.getElementById("student-video1-screen"),
      video1Title: document.getElementById("student-video1-title"),
      video1Iframe: document.getElementById("student-video1-iframe"),
      gotoRev1Btn: document.getElementById("student-goto-rev1-btn"),
      startQuizBtn: document.getElementById("student-start-quiz-btn"),
      backToLessonsFromVideoBtn: document.getElementById("student-back-to-lessons-from-video-btn"),
      quizScreen: document.getElementById("student-quiz-screen"),
      progressText: document.getElementById("student-progress-text"),
      scoreText: document.getElementById("student-score-text"),
      progressBar: document.getElementById("student-progress-bar"),
      questionText: document.getElementById("student-question-text"),
      optionsContainer: document.getElementById("student-options-container"),
      resultScreen: document.getElementById("student-result-screen"),
      successMessage: document.getElementById("student-success-message"),
      failureMessage: document.getElementById("student-failure-message"),
      resultScoreTextSuccess: document.getElementById("student-result-score-text-success"),
      resultScoreTextFailure: document.getElementById("student-result-score-text-failure"),
      reviewVideo2Iframe: document.getElementById("student-review-video2-iframe"),
      video2Iframe: document.getElementById("student-video2-iframe"),
      rewatchVideo1Btn: document.getElementById("student-rewatch-video1-btn"),
      showRev2BtnSuccess: document.getElementById("student-show-rev2-btn-success"),
      showRev2BtnFailure: document.getElementById("student-show-rev2-btn-failure"),
      backToLessonsBtnSuccess: document.getElementById("student-back-to-lessons-btn-success"),
      retryQuizBtn: document.getElementById("student-retry-quiz-btn"),
      homeworkScreen: document.getElementById("student-homework-screen"),
      homeworkList: document.getElementById("student-homework-list"),
      backToSubjectsFromHomeworkBtn: document.getElementById("student-back-to-subjects-from-homework-btn"),
      uploadModal: document.getElementById("student-upload-modal"),
      uploadModalTitle: document.getElementById("student-upload-modal-title"),
      closeUploadModalBtn: document.getElementById("student-close-upload-modal-btn"),
      filesInput: document.getElementById("student-homework-files-input"),
      previewContainer: document.getElementById("student-homework-preview-container"),
      cancelUploadBtn: document.getElementById("student-cancel-upload-btn"),
      uploadBtn: document.getElementById("student-upload-btn"),
      uploadBtnText: document.getElementById("student-upload-btn-text"),
      uploadLoader: document.getElementById("student-upload-loader"),
      classVideoDateScreen: document.getElementById("student-class-video-date-screen"),
      classVideoDateList: document.getElementById("student-class-video-date-list"),
      qnaVideoDateScreen: document.getElementById("student-qna-video-date-screen"),
      qnaVideoDateList: document.getElementById("student-qna-video-date-list"), // 👈 ID 확인
      backToSubjectsFromClassVideoBtn: document.getElementById("student-back-to-subjects-from-class-video-btn"),
      backToSubjectsFromQnaBtn: document.getElementById("student-back-to-subjects-from-qna-btn"),
      videoTitlesScreen: document.getElementById("student-video-titles-screen"),
      videoTitlesDate: document.getElementById("student-video-titles-date"),
      backToVideoDatesBtn: document.getElementById("student-back-to-video-dates-btn"),
      videoTitlesList: document.getElementById("student-video-titles-list"),
      videoDisplayModal: document.getElementById("student-video-display-modal"),
      videoModalTitle: document.getElementById("student-video-modal-title"),
      closeVideoModalBtn: document.getElementById("student-close-video-modal-btn"),
      videoModalContent: document.getElementById("student-video-modal-content"),
      reportListScreen: document.getElementById("student-report-list-screen"),
      backToMenuFromReportListBtn: document.getElementById("student-back-to-menu-from-report-list-btn"),
      reportListContainer: document.getElementById("student-report-list"),
      reportViewerModal: document.getElementById("student-report-viewer-modal"),
      reportModalTitle: document.getElementById("student-report-modal-title"),
      closeReportModalBtn: document.getElementById("student-close-report-modal-btn"),
      reportIframe: document.getElementById("student-report-iframe"),
    };
     // --- 👇 캐싱 후 요소 존재 여부 확인 로그 추가 👇 ---
     console.log("[StudentApp.cacheElements] Cached elements:", this.elements);
     if (!this.elements.qnaVideoDateList) {
         console.error("[StudentApp.cacheElements] !!! qnaVideoDateList element NOT FOUND !!! Check HTML ID 'student-qna-video-date-list'.");
     }
     // --- 👆 ---
  },

  // ----------------------------------
  // 공통 이벤트 리스너
  // ----------------------------------
  addEventListeners() {
    this.elements.backToSubjectsBtn?.addEventListener("click", () => this.showSubjectSelectionScreen());
    this.elements.backToLessonsFromVideoBtn?.addEventListener("click", () => this.showLessonSelectionScreen());
    this.elements.backToSubjectsFromHomeworkBtn?.addEventListener("click", () => this.showSubjectSelectionScreen());
    this.elements.backToVideoDatesBtn?.addEventListener("click", () => this.backToVideoDatesScreen());
    this.elements.backToSubjectsFromClassVideoBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToMenuFromReportListBtn?.addEventListener("click", () => this.showSubjectSelectionScreen());
    this.elements.gotoHomeworkCard?.addEventListener("click", () => studentHomework.showHomeworkScreen());
    this.elements.gotoClassVideoCard?.addEventListener("click", () => this.showClassVideoDateScreen());
    this.elements.gotoQnaVideoCard?.addEventListener("click", () => this.showQnaVideoDateScreen());
    this.elements.gotoReportCard?.addEventListener("click", () => this.showReportListScreen());
    this.elements.closeVideoModalBtn?.addEventListener("click", () => this.closeVideoModal());
    this.elements.closeReportModalBtn?.addEventListener("click", () => this.closeReportModal());
    this.elements.backToLessonsBtnSuccess?.addEventListener("click", () => this.showLessonSelectionScreen());
  },

  // ----------------------------------
  // 화면 전환 유틸 (로그 추가됨)
  // ----------------------------------
  showScreen(screenEl) {
    console.log(`[StudentApp.showScreen] Attempting to show screen with ID: ${screenEl ? screenEl.id : 'null'}`);
    const screens = document.querySelectorAll(".student-screen");
    screens.forEach((el) => { el.style.display = "none"; });
    const iframes = document.querySelectorAll("iframe");
    iframes.forEach((iframe) => { if (iframe && iframe.src && iframe.src !== "about:blank") { try { iframe.src = "about:blank"; } catch(e) { console.warn("Error stopping video in iframe:", e); iframe.src = "about:blank"; } } });
    this.closeVideoModal(); this.closeReportModal();
    if (screenEl) {
      let displayStyle = 'flex';
      if (['student-class-video-date-screen', 'student-qna-video-date-screen', 'student-video-titles-screen', 'student-report-list-screen'].includes(screenEl.id)) { displayStyle = 'block'; }
      console.log(`[StudentApp.showScreen] Setting display of #${screenEl.id} to '${displayStyle}'`);
      screenEl.style.display = displayStyle;
    } else { console.warn("[StudentApp.showScreen] Target screen element is null or undefined."); }
  },

  // ----------------------------------
  // 메인 메뉴(대시보드) (로그 및 오류 처리 추가됨)
  // ----------------------------------
  showSubjectSelectionScreen() {
    console.log("[StudentApp.showSubjectSelectionScreen] Starting...");
    try {
        if (this.elements.welcomeMessage) { this.elements.welcomeMessage.textContent = `${this.state.studentName || "학생"}님, 환영합니다!`; }
        else { console.warn("[StudentApp.showSubjectSelectionScreen] welcomeMessage element not found."); }
        const isLiveLecture = this.state.classType === "live-lecture"; const isSelfDirected = !isLiveLecture;
        if (this.elements.startLessonCard) { this.elements.startLessonCard.style.display = isSelfDirected ? "flex" : "none"; }
        else { console.warn("[StudentApp.showSubjectSelectionScreen] startLessonCard element not found."); }
        if (this.elements.gotoClassVideoCard) { this.elements.gotoClassVideoCard.style.display = isLiveLecture ? "flex" : "none"; }
        else { console.warn("[StudentApp.showSubjectSelectionScreen] gotoClassVideoCard element not found."); }
        console.log(`[StudentApp.showSubjectSelectionScreen] Checking classId for common menus: '${this.state.classId}'`); const commonMenuStyle = this.state.classId ? "flex" : "none";
        if (this.elements.gotoQnaVideoCard) { this.elements.gotoQnaVideoCard.style.display = commonMenuStyle; }
        else { console.warn("[StudentApp.showSubjectSelectionScreen] gotoQnaVideoCard element not found."); }
        if (this.elements.gotoHomeworkCard) { this.elements.gotoHomeworkCard.style.display = commonMenuStyle; }
        else { console.warn("[StudentApp.showSubjectSelectionScreen] gotoHomeworkCard element not found."); }
        if (this.elements.gotoReportCard) { this.elements.gotoReportCard.style.display = commonMenuStyle; }
        else { console.warn("[StudentApp.showSubjectSelectionScreen] gotoReportCard element not found."); }
        if (isSelfDirected && this.elements.subjectsList) {
          this.elements.subjectsList.innerHTML = ""; console.log(`[StudentApp.showSubjectSelectionScreen] Rendering subjects. Count: ${this.state.activeSubjects.length}`);
          if (this.state.activeSubjects.length === 0) { this.elements.subjectsList.innerHTML = `<p class="text-center text-sm text-slate-400 py-4">수강 가능한 과목이 없습니다.</p>`; }
          else { this.state.activeSubjects.forEach((subject, index) => this.renderSubjectChoice(subject, index)); }
        } else if (this.elements.subjectsList) { this.elements.subjectsList.innerHTML = `<p class="text-center text-sm text-slate-400 py-4">현강반은 '수업 영상 보기'를 이용하세요.</p>`; }
        else { console.warn("[StudentApp.showSubjectSelectionScreen] subjectsList element not found."); }
        console.log("[StudentApp.showSubjectSelectionScreen] About to call showScreen for subjectSelectionScreen");
        this.showScreen(this.elements.subjectSelectionScreen);
        console.log("[StudentApp.showSubjectSelectionScreen] Finished.");
    } catch (error) { console.error("[StudentApp.showSubjectSelectionScreen] Error occurred:", error); showToast("메인 화면을 표시하는 중 오류가 발생했습니다.", true); this.showScreen(this.elements.loginScreen); }
  },

  // ----------------------------------
  // 과목 → 레슨 선택 화면
  // ----------------------------------
  showLessonSelectionScreen() {
    if (this.state.classType === "live-lecture") { showToast("현강반은 '수업 영상 보기'를 이용하세요."); this.showSubjectSelectionScreen(); return; }
    if (!this.state.selectedSubject || !this.elements.selectedSubjectTitle) { showToast("과목 정보를 표시할 수 없습니다."); this.showSubjectSelectionScreen(); return; }
    this.elements.selectedSubjectTitle.textContent = this.state.selectedSubject.name;
    this.listenForAvailableLessons();
    this.showScreen(this.elements.lessonSelectionScreen);
  },

  // ----------------------------------
  // 반 영상 날짜 목록 (현강)
  // ----------------------------------
  async showClassVideoDateScreen() { await this.loadAndRenderVideoDates("class"); this.showScreen(this.elements.classVideoDateScreen); },
  async showQnaVideoDateScreen() { await this.loadAndRenderVideoDates("qna"); this.showScreen(this.elements.qnaVideoDateScreen); },
  backToVideoDatesScreen() { if (this.state.currentVideoType === "qna") { this.showScreen(this.elements.qnaVideoDateScreen); } else { this.showScreen(this.elements.classVideoDateScreen); } },

  // 날짜별 영상 제목 목록
  showVideoTitlesForDate(videoType, date) {
    this.state.currentVideoDate = date; this.state.currentVideoType = videoType;
    const stateKey = videoType === "qna" ? "qnaVideosByDate" : "classVideosByDate";
    const videos = this.state[stateKey]?.[date] || [];
    if (this.elements.videoTitlesDate) { this.elements.videoTitlesDate.textContent = `${date} ${videoType === "qna" ? "질문" : "수업"} 영상 목록`; }
    if (!this.elements.videoTitlesList) return; this.elements.videoTitlesList.innerHTML = "";
    if (videos.length === 0) { this.elements.videoTitlesList.innerHTML = `<p class="text-center text-slate-500 py-8">해당 날짜에 영상이 없습니다.</p>`; }
    else { videos.forEach((video) => { const button = document.createElement("button"); button.className = "w-full p-3 border border-gray-200 rounded-md font-medium text-slate-700 hover:bg-gray-50 transition text-left"; button.textContent = video.title || "제목 없음"; button.addEventListener("click", () => this.playVideoInModal(video)); this.elements.videoTitlesList.appendChild(button); }); }
    this.showScreen(this.elements.videoTitlesScreen);
  },

  // 반 영상 날짜 목록 로딩 (로그 추가됨, listElement 확인 강화)
  async loadAndRenderVideoDates(videoType) {
    const isQna = videoType === "qna";
    const collectionName = isQna ? "classVideos" : "classLectures";
    const dateFieldName = isQna ? "videoDate" : "lectureDate";
    const listElementId = isQna ? 'qnaVideoDateList' : 'classVideoDateList'; // 👈 키 이름 사용
    const listElement = this.elements[listElementId]; // 👈 캐시에서 가져오기
    const stateKey = isQna ? "qnaVideosByDate" : "classVideosByDate";

    console.log(`[StudentApp.loadAndRenderVideoDates] Loading '${videoType}' videos for class: ${this.state.classId}`);

    if (!listElement) {
        // --- 👇 오류 로그 개선 👇 ---
        console.error(`[StudentApp.loadAndRenderVideoDates] List element with ID '${listElementId}' (expected HTML ID: student-${listElementId.toLowerCase()}) not found in cache or DOM.`);
        showToast("화면 구성 요소를 찾을 수 없습니다.", true);
        // 오류 발생 시 메인 화면으로 돌아가기 (선택적)
        this.showSubjectSelectionScreen();
        // --- 👆 ---
        return;
    }

    if (!this.state.classId) { listElement.innerHTML = `<p class="text-center text-slate-500 py-8">반 배정 정보가 없어 영상을 조회할 수 없습니다.</p>`; return; }
    listElement.innerHTML = `<div class="loader mx-auto my-4"></div>`;

    try {
      const qCol = query(collection(db, collectionName), where("classId", "==", this.state.classId), orderBy(dateFieldName, "desc"));
      console.log(`[StudentApp.loadAndRenderVideoDates] Querying Firestore collection: ${collectionName} for classId: ${this.state.classId}`);
      const snapshot = await getDocs(qCol);
      console.log(`[StudentApp.loadAndRenderVideoDates] Firestore query completed. Found ${snapshot.size} documents for '${videoType}'.`);

      const videosByDate = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data(); const d = (data[dateFieldName] || "").slice?.(0, 10) || ""; if (!d) return; if (!videosByDate[d]) videosByDate[d] = [];
        if (collectionName === "classLectures" && Array.isArray(data.videos)) { data.videos.forEach(video => videosByDate[d].push({ id: docSnap.id, title: video.title || "제목 없음", url: video.url || "", videoId: video.videoId || "" })); }
        else { videosByDate[d].push({ id: docSnap.id, title: data.title || "제목 없음", url: data.youtubeUrl || data.url || "", videoId: data.videoId || "" }); }
      });
      this.state[stateKey] = videosByDate;
      const datesFound = Object.keys(videosByDate);
      console.log(`[StudentApp.loadAndRenderVideoDates] Processed videos into dates for '${videoType}'. Dates found: ${datesFound.length}`, datesFound);

      listElement.innerHTML = ""; const dates = datesFound.sort((a,b) => b.localeCompare(a));
      if (dates.length === 0) { listElement.innerHTML = `<p class="text-center text-slate-500 py-8">영상이 없습니다.</p>`; return; }
      dates.forEach((date) => { const btn = document.createElement("button"); btn.className = "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition"; btn.textContent = date; btn.addEventListener("click", () => this.showVideoTitlesForDate(videoType, date)); listElement.appendChild(btn); });
    } catch (e) { console.error(`[studentApp] loadAndRenderVideoDates error for '${videoType}':`, e); listElement.innerHTML = `<p class="text-center text-red-500 py-8">목록을 불러오는 중 오류가 발생했습니다.</p>`; }
  },

  // ----------------------------------
  // 반 영상 모달
  // ----------------------------------
  playVideoInModal(video) { if (!this.elements.videoDisplayModal || !this.elements.videoModalContent) return; const container = this.elements.videoModalContent; container.innerHTML = ""; if (this.elements.videoModalTitle) { this.elements.videoModalTitle.textContent = video.title || "영상 보기"; } const iframe = document.createElement("iframe"); iframe.className = "w-full aspect-video"; iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; web-share; picture-in-picture"; iframe.allowFullscreen = true; const embed = this.getYoutubeEmbedUrl(video.url || "", video.videoId || ""); iframe.src = embed || (video.url || "about:blank"); container.appendChild(iframe); this.elements.videoDisplayModal.style.display = "flex"; document.body.classList.add("modal-open"); },
  closeVideoModal() { if (!this.elements.videoDisplayModal) return; this.elements.videoDisplayModal.style.display = "none"; if (this.elements.videoModalContent) { const iframe = this.elements.videoModalContent.querySelector('iframe'); if (iframe) iframe.src = 'about:blank'; this.elements.videoModalContent.innerHTML = ""; } document.body.classList.remove("modal-open"); },
  getYoutubeEmbedUrl(url, videoId) { let id = ""; if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) id = videoId; if (!id && typeof url === "string") { const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/); if (m) id = m[1]; } return id ? `https://www.youtube.com/embed/${id}?enablejsapi=1` : ""; },

  // ----------------------------------
  // 시험 결과 리포트 화면
  // ----------------------------------
  async showReportListScreen() { const listEl = this.elements.reportListContainer; if (!listEl) return; if (!this.state.classId) { showToast("반 배정 정보가 없습니다."); listEl.innerHTML = `<p class="text-center text-slate-500 py-8">반 배정 정보 없음</p>`; this.showScreen(this.elements.reportListScreen); return; } if (!this.state.studentName) { listEl.innerHTML = `<p class="text-center text-slate-500 py-8">학생 정보 로딩 중...</p>`; this.showScreen(this.elements.reportListScreen); return; } this.showScreen(this.elements.reportListScreen); listEl.innerHTML = `<div class="loader mx-auto my-4"></div>`; try { const reports = await reportManager.listStudentReports(this.state.classId, this.state.studentName); this.state.reportsByDate = reports || {}; listEl.innerHTML = ""; const dates = Object.keys(this.state.reportsByDate).sort((a,b) => b.localeCompare(a)); if (dates.length === 0) { listEl.innerHTML = `<p class="text-center text-slate-500 py-8">조회 가능한 리포트가 없습니다.</p>`; return; } dates.forEach((date) => { const group = this.state.reportsByDate[date] || []; const section = document.createElement("section"); section.className = "mb-6"; const h = document.createElement("h3"); h.className = "text-sm font-semibold text-slate-500 mb-3"; const displayDate = `${date.substring(0, 4)}-${date.substring(4, 6)}-${date.substring(6, 8)}`; h.textContent = displayDate; section.appendChild(h); group.sort((a,b) => (a.title || a.fileName).localeCompare(b.title || b.fileName)); group.forEach((rep) => { const btn = document.createElement("button"); btn.className = "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left mb-2"; btn.textContent = rep.title || rep.fileName || "리포트"; btn.addEventListener("click", () => { this.showReportInModal(btn.textContent, rep.url); }); section.appendChild(btn); }); listEl.appendChild(section); }); } catch (e) { console.error("[studentApp] report load error:", e); listEl.innerHTML = `<p class="text-center text-red-500 py-8">목록을 불러오는 중 오류가 발생했습니다.</p>`; } },
  showReportInModal(title, pdfUrl) { if (!pdfUrl) { showToast("리포트 파일 URL이 없습니다.", true); return; } window.open(pdfUrl, "_blank"); this.closeReportModal(); },
  closeReportModal() { if (!this.elements.reportViewerModal) return; this.elements.reportViewerModal.style.display = "none"; if (this.elements.reportIframe) { this.elements.reportIframe.src = "about:blank"; } document.body.classList.remove("modal-open"); },

  // ----------------------------------
  // 과목 목록 로드 (로그인 후 반 설정 기반)
  // ----------------------------------
  async loadAvailableSubjects() { console.log("[studentApp] loadAvailableSubjects - Loading subjects based on class config."); const classData = this.state.selectedClassData; const classSubjectMap = classData?.subjects; if (!classData || !classSubjectMap || Object.keys(classSubjectMap).length === 0) { console.log("[studentApp] loadAvailableSubjects - No class data or no subjects configured for this class."); this.state.activeSubjects = []; return; } const subjectIdsInClass = Object.keys(classSubjectMap); console.log("[studentApp] loadAvailableSubjects - Subject IDs configured for class:", subjectIdsInClass); try { const subjectPromises = subjectIdsInClass.map(id => getDoc(doc(db, "subjects", id))); const subjectDocs = await Promise.all(subjectPromises); const subjects = subjectDocs.filter(docSnap => docSnap.exists()).map((docSnap) => ({ id: docSnap.id, name: docSnap.data().name || "이름 없음" })); subjects.sort((a, b) => a.name.localeCompare(b.name, "ko")); this.state.activeSubjects = subjects; console.log("[studentApp] loadAvailableSubjects - Successfully loaded subjects for the class:", this.state.activeSubjects.length); } catch (e) { console.error("[studentApp] loadAvailableSubjects error (fetching specific subjects):", e); this.state.activeSubjects = []; showToast("수강 과목 목록을 불러오는 중 오류가 발생했습니다.", true); } },

  // ----------------------------------
  // 학습 목록 로드 (선택된 과목 기반)
  // ----------------------------------
  async listenForAvailableLessons() { if (!this.state.selectedSubject?.id) { if (this.elements.lessonsList) { this.elements.lessonsList.innerHTML = ""; } return; } const subjectId = this.state.selectedSubject.id; if (this.elements.lessonsList) { this.elements.lessonsList.innerHTML = `<div class="loader mx-auto my-4"></div>`; } try { const lessonsRef = collection(db, "subjects", subjectId, "lessons"); const q = query(lessonsRef, where("isActive", "==", true), orderBy("order", "asc")); const snapshot = await getDocs(q); const list = snapshot.docs.map((docSnap) => { const d = docSnap.data(); const orderValue = typeof d.order === "number" ? d.order : 9999; return { id: docSnap.id, title: d.title || "제목 없음", order: orderValue, createdAt: d.createdAt || null, video1Url: d.video1Url || "", video2Url: d.video2Url || "", video1RevUrls: d.video1RevUrls || [], video2RevUrls: d.video2RevUrls || [], questionBank: d.questionBank || [], isActive: d.isActive, ...d }; }); list.sort((a, b) => { if (a.order !== b.order) return a.order - b.order; const ad = a.createdAt?.toMillis() || 0; const bd = b.createdAt?.toMillis() || 0; return bd - ad; }); this.state.lessons = list; if (this.elements.lessonsList) { if (list.length === 0) { this.elements.lessonsList.innerHTML = `<p class="text-center text-slate-500 py-8">이 과목에 등록된 학습이 없습니다.</p>`; } else { this.elements.lessonsList.innerHTML = ""; list.forEach((lesson) => this.renderLessonChoice(lesson)); } } } catch (e) { console.error("[studentApp] listenForAvailableLessons error:", e); if (this.elements.lessonsList) { this.elements.lessonsList.innerHTML = `<p class="text-center text-red-500 py-8">학습 목록을 불러오는 중 오류가 발생했습니다.</p>`; if (e.message && e.message.includes("requires an index")) { const indexLinkMatch = e.message.match(/(https:\/\/[^ ]+)/); if (indexLinkMatch && indexLinkMatch[0]) { this.elements.lessonsList.innerHTML += `<p class="text-xs text-slate-400 mt-2">쿼리에 색인이 필요합니다. <a href="${indexLinkMatch[0]}" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">여기</a>에서 생성할 수 있습니다.</p>`; } } else { this.elements.lessonsList.innerHTML += `<p class="text-xs text-slate-400 mt-2">${e.message}</p>`; } } } },

  // 과목 버튼 렌더 (색상 순환 적용됨)
  renderSubjectChoice(subject, index) { if (!this.elements.subjectsList) return; const colors = [ { bg: 'bg-blue-50', hoverBg: 'bg-blue-100', border: 'border-blue-300' }, { bg: 'bg-green-50', hoverBg: 'bg-green-100', border: 'border-green-300' }, { bg: 'bg-yellow-50', hoverBg: 'bg-yellow-100', border: 'border-yellow-300' }, { bg: 'bg-purple-50', hoverBg: 'bg-purple-100', border: 'border-purple-300' }, { bg: 'bg-red-50', hoverBg: 'bg-red-100', border: 'border-red-300' }, ]; const color = colors[index % colors.length]; const btn = document.createElement("button"); btn.className = `w-full p-4 border ${color.border} rounded-lg text-sm font-medium text-slate-800 hover:${color.hoverBg} transition text-left shadow-sm ${color.bg}`; btn.textContent = subject.name; btn.addEventListener("click", () => { this.state.selectedSubject = subject; this.showLessonSelectionScreen(); }); this.elements.subjectsList.appendChild(btn); },

  // 레슨 버튼 렌더
  renderLessonChoice(lesson) { if (!this.elements.lessonsList) return; const btn = document.createElement("button"); btn.className = "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left"; btn.textContent = lesson.title || "제목 없음"; btn.addEventListener("click", () => { studentLesson.startSelectedLesson(lesson); }); this.elements.lessonsList.appendChild(btn); },
};

// Firebase 익명 인증 완료 후 앱 시작
document.addEventListener("DOMContentLoaded", () => {
  console.log("[StudentApp] DOMContentLoaded event fired.");
  ensureAnonymousAuth((user) => {
    console.log(`[StudentApp] ensureAnonymousAuth callback executed. User UID: ${user?.uid}, isInitialized: ${StudentApp.isInitialized}`);
    if (user) {
      StudentApp.state.authUid = user.uid;
      if (!StudentApp.isInitialized) {
        console.log("[StudentApp] User authenticated, initializing app...");
        StudentApp.init();
      } else {
        console.log("[StudentApp] User authenticated, but app already initialized.");
      }
    } else {
        console.error("[StudentApp] Failed to get anonymous UID. App cannot initialize.");
        showToast("사용자 인증 실패. 앱을 사용할 수 없습니다.", true);
        const loadingScreen = document.getElementById('student-loading-screen');
        const loginScreen = document.getElementById('student-login-screen');
        if (loadingScreen) loadingScreen.style.display = 'none';
        if (loginScreen) { loginScreen.innerHTML = `<div class="w-full max-w-xs mx-auto p-4 text-center text-red-600"><p>인증에 실패했습니다.</p><p class="text-sm mt-2">페이지를 새로고침하거나 관리자에게 문의하세요.</p></div>`; loginScreen.style.display = 'flex'; }
    }
  });
});

export default StudentApp;