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
import studentHomework from "./studentHomework.js"; // default export로 가져옴
import { reportManager } from "../shared/reportManager.js";

const StudentApp = {
  isInitialized: false,
  elements: {},
  state: {
    authUid: null,
    studentDocId: null, // Firestore 문서 ID 저장
    studentName: null,
    classId: null,
    className: null,
    classType: null,
    selectedClassData: null,

    activeSubjects: [],
    selectedSubject: null,
    lessons: [],
    activeLesson: null,

    classVideosByDate: {},
    qnaVideosByDate: {},

    currentVideoDate: null,
    currentVideoType: null,

    reportsByDate: {},

    quizQuestions: [],
    currentQuestionIndex: 0,
    score: 0,
    totalQuizQuestions: 5,
    passScore: 4,

    currentRevVideoIndex: 0,
  },

  // 초기화
  init() {
    console.log("[StudentApp.init] Initializing app...");
    if (this.isInitialized) {
      console.warn("[StudentApp.init] Already initialized.");
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

  // 과목 로드
  async loadAvailableSubjects() {
    console.log("[StudentApp.loadAvailableSubjects] called.");
    this.state.activeSubjects = []; // 시작 시 초기화

    try {
      const classData = this.state.selectedClassData;
      if (!classData) {
        throw new Error("No class data found.");
      }

      // 1. classData.subjects 맵의 키(ID)를 과목 목록으로 사용합니다.
      const classSubjectsMap = (typeof classData.subjects === 'object' && classData.subjects !== null) ? classData.subjects : {};
      const subjectIds = Object.keys(classSubjectsMap); 
      
      if (subjectIds.length === 0) {
           showToast("클래스에 등록된 과목이 없습니다.", true);
           this.renderSubjectList(); // 빈 목록 렌더링
           return;
      }
      
      // 2. subjects 컬렉션에서 전체 과목 이름 정보를 가져옵니다.
      const allSubjectsQuery = query(collection(db, 'subjects'));
      const allSubjectsSnapshot = await getDocs(allSubjectsQuery);
      const allSubjectsMap = new Map();
      allSubjectsSnapshot.forEach(docSnap => {
          allSubjectsMap.set(docSnap.id, docSnap.data().name);
      });

      // 3. subjectIds 배열을 기반으로 activeSubjects 배열 생성
      this.state.activeSubjects = subjectIds
        .map((id) => {
          const subjectName = allSubjectsMap.get(id); // subjects 컬렉션에서 이름 조회
          
          if (subjectName) { 
              return { id, name: subjectName };
          } else { 
              console.warn(`[StudentApp.loadAvailableSubjects] Subject name not found for ID: ${id}. Using ID as name.`);
              return { id, name: `과목 ID: ${id}` };
          }
        })
        .filter(subject => subject !== null); // 혹시 모를 null 값 제거

      // 과목 이름 순 정렬 (선택적)
      this.state.activeSubjects.sort((a, b) => a.name.localeCompare(b.name));

      console.log(
        "[StudentApp.loadAvailableSubjects] Successfully loaded subjects:",
        this.state.activeSubjects
      );

    } catch (error) {
      console.error("[StudentApp.loadAvailableSubjects] Error:", error);
      showToast("과목 정보를 불러오는 중 오류가 발생했습니다.", true);
      this.state.activeSubjects = []; // 오류 시 빈 배열 유지
    } finally {
        this.renderSubjectList(); // 항상 과목 목록 UI 업데이트 호출
    }
  },

  // 요소 캐싱 (이전 답변과 동일)
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
      backToLessonsFromVideoBtn: document.getElementById("student-back-to-lessons-from-video-btn"),
      homeworkScreen: document.getElementById('student-homework-screen'),
      homeworkList: document.getElementById('student-homework-list'),
      backToSubjectsFromHomeworkBtn: document.getElementById('student-back-to-subjects-from-homework-btn'),
      uploadModal: document.getElementById('student-upload-modal'),
      uploadModalTitle: document.getElementById('student-upload-modal-title'),
      previewContainer: document.getElementById('student-preview-container'),
      filesInput: document.getElementById('student-files-input'),
      uploadBtn: document.getElementById('student-upload-btn'),
      uploadBtnText: document.getElementById('student-upload-btn-text'),
      uploadLoader: document.getElementById('student-upload-loader'),
      closeUploadModalBtn: document.getElementById('student-close-upload-modal-btn'),
      cancelUploadBtn: document.getElementById('student-cancel-upload-btn'),
      video1Screen: document.getElementById("student-video1-screen"),
      video1Title: document.getElementById("student-video1-title"),
      video1Iframe: document.getElementById("student-video1-iframe"),
      gotoRev1Btn: document.getElementById("student-goto-rev1-btn"),
      startQuizBtn: document.getElementById("student-start-quiz-btn"),
      quizScreen: document.getElementById("student-quiz-screen"),
      progressText: document.getElementById("student-progress-text"),
      progressBar: document.getElementById("student-progress-bar"),
      scoreText: document.getElementById("student-score-text"),
      questionText: document.getElementById("student-question-text"),
      optionsContainer: document.getElementById("student-options-container"),
      resultScreen: document.getElementById("student-result-screen"),
      successMessage: document.getElementById("student-success-message"),
      failureMessage: document.getElementById("student-failure-message"),
      resultScoreTextSuccess: document.getElementById("student-result-score-text-success"),
      resultScoreTextFailure: document.getElementById("student-result-score-text-failure"),
      reviewVideo2Iframe: document.getElementById("student-review-video2-iframe"),
      video2Iframe: document.getElementById("student-video2-iframe"),
      retryQuizBtn: document.getElementById("student-retry-quiz-btn"),
      rewatchVideo1Btn: document.getElementById("student-rewatch-video1-btn"),
      showRev2BtnSuccess: document.getElementById("student-show-rev2-btn-success"),
      showRev2BtnFailure: document.getElementById("student-show-rev2-btn-failure"),
      backToLessonsFromResultBtn: document.getElementById("student-back-to-lessons-from-result-btn"),
      classVideoDateScreen: document.getElementById("student-class-video-date-screen"),
      classVideoDateList: document.getElementById("student-class-video-date-list"),
      backToSubjectsFromClassVideoBtn: document.getElementById("student-back-to-subjects-from-class-video-btn"),
      qnaVideoDateScreen: document.getElementById("student-qna-video-date-screen"),
      qnaVideoDateList: document.getElementById("student-qna-video-date-list") || document.getElementById("student-qna-video-dates"),
      backToSubjectsFromQnaBtn: document.getElementById("student-back-to-subjects-from-qna-btn"),
      videoTitlesScreen: document.getElementById("student-video-titles-screen"),
      videoTitlesDate: document.getElementById("student-video-titles-date"),
      videoTitlesList: document.getElementById("student-video-titles-list"),
      backToVideoDatesBtn: document.getElementById("student-back-to-video-dates-btn"),
      videoDisplayModal: document.getElementById("student-video-display-modal"),
      videoModalTitle: document.getElementById("student-video-modal-title"),
      videoModalContent: document.getElementById("student-video-modal-content"),
      closeVideoModalBtn: document.getElementById("student-close-video-modal-btn"),
      reportListScreen: document.getElementById("student-report-list-screen"),
      reportListContainer: document.getElementById("student-report-list"),
      backToMenuFromReportListBtn: document.getElementById("student-back-to-menu-from-report-list-btn"),
    };
    console.log("[StudentApp.cacheElements] Cached elements:", Object.keys(this.elements).length);
    Object.keys(this.elements).forEach(key => { if (!this.elements[key]) { console.warn(`[StudentApp.cacheElements] Element with key '${key}' not found in DOM! Check HTML ID.`); } });
  },

  // 이벤트 리스너 추가 (숙제 중복 방지 코드 포함됨)
  addEventListeners() {
    // 뒤로가기 버튼들
    this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
    this.elements.backToLessonsFromResultBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
    this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());

    // 메뉴 카드 클릭 이벤트
    this.elements.subjectsList?.addEventListener('click', (e) => {
        if (e.target.closest('.subject-btn')) {
            const subjectId = e.target.closest('.subject-btn').dataset.id;
            const subjectName = e.target.closest('.subject-btn').dataset.name;
            this.selectSubjectAndShowLessons({ id: subjectId, name: subjectName });
        }
    });
    this.elements.gotoClassVideoCard?.addEventListener('click', () => this.showClassVideoDateScreen());
    this.elements.gotoQnaVideoCard?.addEventListener('click', () => this.showQnaVideoDateScreen());
    this.elements.gotoHomeworkCard?.addEventListener('click', () => {
        // 👇 숙제 목록 중복 방지: 호출 전에 로딩 표시
        if (this.elements.homeworkList) {
            this.elements.homeworkList.innerHTML = '<div class="loader mx-auto my-4"></div>';
        }
        studentHomework.showHomeworkScreen();
    });
    this.elements.gotoReportCard?.addEventListener('click', () => this.showReportListScreen());

    // 비디오 관련 뒤로가기 및 모달 닫기
    this.elements.backToSubjectsFromClassVideoBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToVideoDatesBtn?.addEventListener('click', () => this.backToVideoDatesScreen());
    this.elements.closeVideoModalBtn?.addEventListener('click', () => this.closeVideoModal());

    // 리포트 관련 뒤로가기
    this.elements.backToMenuFromReportListBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
  },

  // 화면 전환 (변경 없음)
  showScreen(screenEl) {
    const screens = document.querySelectorAll(".student-screen");
    screens.forEach((el) => { if (el) el.style.display = "none"; });
    if (screenEl) screenEl.style.display = "flex";
    else console.warn("[StudentApp.showScreen] Target screen element is null or undefined.");
  },

  // 과목 선택 화면 표시 (변경 없음)
  showSubjectSelectionScreen() {
    const welcomeEl = this.elements.welcomeMessage;
    if (welcomeEl) { welcomeEl.textContent = `${this.state.className || ''} ${this.state.studentName || ''}님, 환영합니다!`; }
    this.renderSubjectList();
    const classType = this.state.classType;
    if(this.elements.startLessonCard) this.elements.startLessonCard.style.display = (classType === 'self-directed' && this.state.activeSubjects.length > 0) ? 'flex' : 'none';
    if(this.elements.gotoClassVideoCard) this.elements.gotoClassVideoCard.style.display = classType === 'live-lecture' ? 'flex' : 'none';
    if(this.elements.gotoQnaVideoCard) this.elements.gotoQnaVideoCard.style.display = 'flex';
    if(this.elements.gotoHomeworkCard) this.elements.gotoHomeworkCard.style.display = 'flex';
    if(this.elements.gotoReportCard) this.elements.gotoReportCard.style.display = 'flex';
    this.showScreen(this.elements.subjectSelectionScreen);
    console.log("[StudentApp] Subject selection screen shown.");
  },

  // 과목 목록 UI 렌더링 (변경 없음)
  renderSubjectList() {
    const listEl = this.elements.subjectsList;
    if (!listEl) { console.error("[StudentApp.renderSubjectList] subjectsList element not found!"); return; }
    listEl.innerHTML = '';
    if (!this.state.activeSubjects || this.state.activeSubjects.length === 0) { listEl.innerHTML = '<p class="text-center text-sm text-slate-400 py-4">수강 중인 과목이 없습니다.</p>'; if (this.elements.startLessonCard) this.elements.startLessonCard.style.display = 'none'; return; }
    if (this.elements.startLessonCard && this.state.classType === 'self-directed') { this.elements.startLessonCard.style.display = 'flex'; }
    this.state.activeSubjects.forEach(subject => {
      const button = document.createElement('button'); button.className = 'subject-btn w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left'; button.textContent = subject.name; button.dataset.id = subject.id; button.dataset.name = subject.name; listEl.appendChild(button);
    });
  },

  // 과목 선택 및 학습 목록 화면 표시 (변경 없음)
  async selectSubjectAndShowLessons(subject) {
    this.state.selectedSubject = subject;
    if (this.elements.selectedSubjectTitle) { this.elements.selectedSubjectTitle.textContent = `${subject.name} 학습 목록`; }
    await this.loadLessonsForSubject(subject.id);
    this.showScreen(this.elements.lessonSelectionScreen);
  },

  // 학습 목록 화면 표시 (변경 없음)
  showLessonSelectionScreen() {
      if (!this.state.selectedSubject) { console.warn("[StudentApp] No subject selected. Cannot show lesson screen."); this.showSubjectSelectionScreen(); return; }
      this.showScreen(this.elements.lessonSelectionScreen);
  },

  // 학습 목록 로드 및 렌더링 (변경 없음)
  async loadLessonsForSubject(subjectId) {
    const listEl = this.elements.lessonsList; if (!listEl) return; listEl.innerHTML = '<div class="loader mx-auto my-4"></div>';
    try {
      const q = query( collection(db, 'subjects', subjectId, 'lessons'), where('isActive', '==', true), orderBy('order', 'asc') );
      const snapshot = await getDocs(q); this.state.lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); listEl.innerHTML = '';
      if (this.state.lessons.length === 0) { listEl.innerHTML = '<p class="text-center text-slate-500 py-8">아직 학습할 내용이 없습니다.</p>'; return; }
      this.state.lessons.forEach(lesson => {
        const button = document.createElement('button'); button.className = 'w-full p-4 border border-gray-200 rounded-lg text-left hover:bg-gray-50 transition';
        button.innerHTML = `<h3 class="font-semibold text-slate-800">${lesson.title}</h3><p class="text-xs text-slate-500 mt-1">학습 시작하기 &rarr;</p>`;
        button.onclick = () => studentLesson.startSelectedLesson(lesson); listEl.appendChild(button);
      });
    } catch (error) { console.error("[StudentApp] Error loading lessons:", error); listEl.innerHTML = '<p class="text-center text-red-500 py-8">학습 목록을 불러오는 중 오류 발생</p>'; showToast("학습 목록 로딩 실패", true); }
  },

  // 수업 영상 날짜 선택 화면 (변경 없음)
  async showClassVideoDateScreen() { await this.loadAndRenderVideoDates("class"); this.showScreen(this.elements.classVideoDateScreen); },

  // 질문 영상 날짜 선택 화면 (변경 없음)
  async showQnaVideoDateScreen() { await this.loadAndRenderVideoDates("qna"); this.showScreen(this.elements.qnaVideoDateScreen); },

  // 날짜 선택 화면으로 돌아가기 (변경 없음)
  backToVideoDatesScreen() { if (this.state.currentVideoType === "qna") this.showScreen(this.elements.qnaVideoDateScreen); else this.showScreen(this.elements.classVideoDateScreen); },

  // 영상 날짜 목록 로드 및 렌더링 (변경 없음)
  async loadAndRenderVideoDates(videoType) {
    const isQna = videoType === "qna"; const collectionName = isQna ? "classVideos" : "classLectures"; const dateFieldName = isQna ? "videoDate" : "lectureDate";
    const listElement = isQna ? this.elements.qnaVideoDateList : this.elements.classVideoDateList; const stateKey = isQna ? "qnaVideosByDate" : "classVideosByDate";
    if (!listElement) { console.error(`[StudentApp] listElement missing for ${videoType}`); return; } if (!this.state.classId) { listElement.innerHTML = `<p class="text-center text-gray-500 py-8">반 배정 정보가 없습니다.</p>`; return; }
    listElement.innerHTML = `<div class="loader mx-auto my-4"></div>`;
    try {
      const qCol = query( collection(db, collectionName), where("classId", "==", this.state.classId), orderBy(dateFieldName, "desc") );
      const snapshot = await getDocs(qCol); const videosByDate = {};
      snapshot.forEach((docSnap) => {
        const data = docSnap.data(); const date = (data[dateFieldName] || "").slice(0, 10); if (!date) return;
        if (isQna) { const url = data.youtubeUrl || ""; const title = data.title || "제목 없음"; if (!videosByDate[date]) videosByDate[date] = []; videosByDate[date].push({ id: docSnap.id, title, url }); }
        else { const videosArray = Array.isArray(data.videos) ? data.videos : []; if (videosArray.length > 0) { if (!videosByDate[date]) videosByDate[date] = []; videosArray.forEach((videoItem, index) => { videosByDate[date].push({ id: `${docSnap.id}-${index}`, title: videoItem.title || `영상 ${index + 1}`, url: videoItem.url || "" }); }); } }
      });
      this.state[stateKey] = videosByDate; const datesFound = Object.keys(videosByDate); listElement.innerHTML = "";
      if (datesFound.length === 0) { listElement.innerHTML = `<p class="text-center text-gray-500 py-8">영상이 없습니다.</p>`; return; }
      datesFound.sort((a, b) => b.localeCompare(a));
      datesFound.forEach((date) => { const btn = document.createElement("button"); btn.className = "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition"; btn.textContent = date; btn.addEventListener("click", () => this.showVideoTitlesForDate(videoType, date)); listElement.appendChild(btn); });
    } catch (e) { console.error("[StudentApp] loadAndRenderVideoDates error:", e); listElement.innerHTML = `<p class="text-center text-red-500 py-8">영상 목록을 불러오는 중 오류가 발생했습니다.</p>`; }
  },

  // 날짜별 영상 제목 목록 표시 (변경 없음)
  showVideoTitlesForDate(videoType, date) {
    this.state.currentVideoDate = date; this.state.currentVideoType = videoType; const stateKey = videoType === "qna" ? "qnaVideosByDate" : "classVideosByDate"; const videos = this.state[stateKey]?.[date] || [];
    if (this.elements.videoTitlesDate) { this.elements.videoTitlesDate.textContent = `${date} ${videoType === "qna" ? "질문" : "수업"} 영상`; }
    if (this.elements.videoTitlesList) {
        this.elements.videoTitlesList.innerHTML = ""; if (videos.length === 0) { this.elements.videoTitlesList.innerHTML = "<p class='text-center text-gray-500 py-8'>영상이 없습니다.</p>"; }
        else { videos.forEach((v) => { const btn = document.createElement("button"); btn.className = "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left"; btn.textContent = v.title; btn.addEventListener("click", () => this.playVideoInModal(v)); this.elements.videoTitlesList.appendChild(btn); }); }
    }
    this.showScreen(this.elements.videoTitlesScreen);
  },

  // 모달에서 영상 재생 (최종 수정 반영)
  playVideoInModal(video) {
    const modal = this.elements.videoDisplayModal; 
    const content = this.elements.videoModalContent; 
    const titleEl = this.elements.videoModalTitle;
    
    // 필수 요소가 없으면 경고 후 함수 종료
    if (!modal || !content) {
        console.error("[StudentApp] Video modal elements not found.");
        showToast("영상 모달을 여는 데 실패했습니다.", true);
        return; 
    }
    
    // 1. UI 초기화 및 로딩 표시
    content.innerHTML = '<div class="w-full aspect-video flex items-center justify-center bg-black"><div class="loader"></div></div>'; // 로딩 표시
    if (titleEl) titleEl.textContent = video.title || "영상 보기";
    
    const embedUrl = studentLesson.convertYoutubeUrlToEmbed(video.url); 
    console.log(`[StudentApp] Trying to play video: ${video.title}, Original URL: ${video.url}, Embed URL: ${embedUrl}`);
    
    modal.style.display = "flex"; // 모달 먼저 표시

    if (embedUrl) {
      // iframe을 DOM에 추가한 후 src를 설정하여 재생 시작 시점 분리
      const iframe = document.createElement("iframe"); 
      iframe.className = "w-full aspect-video"; 
      iframe.style.border = "none"; // ✨ [보강] border: none 추가
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"; 
      iframe.allowFullscreen = true; 
      iframe.style.display = 'none'; // 로드 완료 시까지 숨김
      
      content.innerHTML = ""; // 로딩 인디케이터 제거
      content.appendChild(iframe); // DOM에 추가

      // 로드 핸들러
      iframe.onload = () => {
          console.log("[StudentApp] Iframe loaded successfully.");
          iframe.style.display = 'block'; // 로드 성공 시 표시
      };
      
      // 오류 핸들러 (유튜브가 로드를 거부했을 때 발생)
      iframe.onerror = () => {
          console.error("[StudentApp] Iframe failed to load.");
          content.innerHTML = `<p class="text-red-500 p-4">영상 로드 실패: YouTube 임베드 정책 문제이거나 URL이 잘못되었습니다.</p>`;
          showToast("영상 로드에 실패했습니다. (유튜브 정책 확인 필요)", true);
      };

      // SRC 설정 (즉시 실행)
      iframe.src = embedUrl; 
      console.log(`[StudentApp] Iframe SRC set to: ${embedUrl}`);
      
    } else { 
      console.error("[StudentApp] Failed to get embed URL for video:", video); 
      content.innerHTML = `<p class="text-red-500 p-4">유효하지 않은 비디오 URL입니다. 관리자에게 문의하세요.</p>`; 
      modal.style.display = "flex";
    }
  },

  // 영상 모달 닫기 (변경 없음)
  closeVideoModal() {
    const modal = this.elements.videoDisplayModal; 
    const content = this.elements.videoModalContent;
    
    if (modal) modal.style.display = "none"; 
    
    // 콘텐츠를 비우면 다음 재생 시 충돌 방지
    if (content) content.innerHTML = ""; 
    
    // 모달이 닫히면 이전 화면으로 돌아가야 합니다.
    this.showScreen(this.elements.videoTitlesScreen);
  },

  // 시험 결과 리포트 목록 화면 표시 (변경 없음)
  async showReportListScreen() {
      const container = this.elements.reportListContainer; if (!container) return;
      if (!this.state.classId || !this.state.studentName) { container.innerHTML = '<p class="text-center text-red-500 py-8">학생 또는 반 정보가 없습니다.</p>'; this.showScreen(this.elements.reportListScreen); return; }
      container.innerHTML = '<div class="loader mx-auto my-4"></div>'; this.showScreen(this.elements.reportListScreen);
      try { const reportsByDate = await reportManager.listStudentReports(this.state.classId, this.state.studentName); this.state.reportsByDate = reportsByDate; this.renderReportList(); }
      catch (error) { console.error("Error loading student reports:", error); container.innerHTML = '<p class="text-center text-red-500 py-8">시험 결과 목록 로딩 실패</p>'; }
  },

  // 시험 결과 리포트 목록 렌더링 (변경 없음)
  renderReportList() {
      const container = this.elements.reportListContainer; if (!container) return; container.innerHTML = ''; const dates = Object.keys(this.state.reportsByDate).sort((a, b) => b.localeCompare(a));
      if (dates.length === 0) { container.innerHTML = '<p class="text-center text-slate-500 py-8">업로드된 시험 결과가 없습니다.</p>'; return; }
      dates.forEach(date => {
          const reports = this.state.reportsByDate[date]; if (!reports || reports.length === 0) return;
          const dateSection = document.createElement('div'); dateSection.className = 'mb-6'; const dateHeader = document.createElement('h3');
          const displayDate = date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date; dateHeader.textContent = displayDate; dateHeader.className = 'text-lg font-semibold text-slate-700 mb-2 border-b pb-1';
          dateSection.appendChild(dateHeader); const ul = document.createElement('ul'); ul.className = 'space-y-2';
          reports.forEach(report => {
              const li = document.createElement('li'); li.className = 'p-3 border rounded-md flex justify-between items-center text-sm bg-white hover:bg-slate-50';
              li.innerHTML = `<span class="truncate mr-2">${report.title}</span> ${report.url ? `<a href="${report.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 text-xs font-bold flex-shrink-0">결과 보기</a>` : '<span class="text-xs text-slate-400 flex-shrink-0">열 수 없음</span>'}`; ul.appendChild(li);
          });
          dateSection.appendChild(ul); container.appendChild(dateSection);
      });
  },

  // 모든 비디오 중지 (변경 없음)
  stopAllVideos() {
      if (this.elements.video1Iframe) { this.elements.video1Iframe.src = 'about:blank'; }
      if (this.elements.reviewVideo2Iframe) { this.elements.reviewVideo2Iframe.src = 'about:blank'; }
      if (this.elements.video2Iframe) { this.elements.video2Iframe.src = 'about:blank'; }
      this.closeVideoModal();
  },

};

// DOM 로드 후 앱 초기화 (변경 없음)
document.addEventListener("DOMContentLoaded", () => {
  console.log("[StudentApp] DOMContentLoaded. Ensuring auth...");
  ensureAnonymousAuth((user) => {
    if (user) {
      console.log("[StudentApp] Anonymous auth successful (or cached). UID:", user.uid);
      StudentApp.state.authUid = user.uid;
      if (!StudentApp.isInitialized) StudentApp.init();
    } else {
      console.error("[StudentApp] Anonymous auth failed.");
      showToast("인증 초기화 실패. 새로고침 해주세요.", true);
      if (!StudentApp.isInitialized) StudentApp.init();
    }
  });
});

export default StudentApp;