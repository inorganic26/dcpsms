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

import "../shared/style.css";

import { studentAuth } from "./studentAuth.js";
import { studentLesson } from "./studentLesson.js";
import studentHomework from "./studentHomework.js"; 
import { reportManager } from "../shared/reportManager.js";

const StudentApp = {
  isInitialized: false,
  elements: {},
  state: {
    authUid: null,
    studentDocId: null, 
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
    isScoreInputMode: false, 
  },

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

  async loadAvailableSubjects() {
    console.log("[StudentApp.loadAvailableSubjects] called.");
    this.state.activeSubjects = []; 

    try {
      const classData = this.state.selectedClassData;
      if (!classData) {
        throw new Error("No class data found.");
      }

      const classSubjectsMap = (typeof classData.subjects === 'object' && classData.subjects !== null) ? classData.subjects : {};
      const subjectIds = Object.keys(classSubjectsMap);

      if (subjectIds.length === 0) {
           showToast("클래스에 등록된 과목이 없습니다.", true);
           this.renderSubjectList(); 
           return;
      }

      const allSubjectsQuery = query(collection(db, 'subjects'));
      const allSubjectsSnapshot = await getDocs(allSubjectsQuery);
      const allSubjectsMap = new Map();
      allSubjectsSnapshot.forEach(docSnap => {
          allSubjectsMap.set(docSnap.id, docSnap.data().name);
      });

      this.state.activeSubjects = subjectIds
        .map((id) => {
          const subjectName = allSubjectsMap.get(id); 

          if (subjectName) {
              return { id, name: subjectName };
          } else {
              console.warn(`Subject name not found for ID: ${id}`);
              return { id, name: `과목 ID: ${id}` };
          }
        })
        .filter(subject => subject !== null); 

      this.state.activeSubjects.sort((a, b) => a.name.localeCompare(b.name));

    } catch (error) {
      console.error("[StudentApp.loadAvailableSubjects] Error:", error);
      showToast("과목 정보를 불러오는 중 오류가 발생했습니다.", true);
      this.state.activeSubjects = []; 
    } finally {
        this.renderSubjectList(); 
    }
  },

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
      dailyTestCard: document.getElementById("student-daily-test-card"),
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
  },

  addEventListeners() {
    this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
    this.elements.backToLessonsFromResultBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
    this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());

    this.elements.dailyTestCard?.addEventListener('click', () => {
        this.state.isScoreInputMode = true;
        this.showSubjectSelectionScreen(true);
    });

    this.elements.subjectsList?.addEventListener('click', (e) => {
        if (e.target.closest('.subject-btn')) {
            const btn = e.target.closest('.subject-btn');
            const subjectId = btn.dataset.id;
            const subjectName = btn.dataset.name;
            this.selectSubjectAndShowLessons({ id: subjectId, name: subjectName });
        }
    });

    this.elements.gotoClassVideoCard?.addEventListener('click', () => this.showClassVideoDateScreen());
    this.elements.gotoQnaVideoCard?.addEventListener('click', () => this.showQnaVideoDateScreen());
    this.elements.gotoHomeworkCard?.addEventListener('click', () => {
        if (this.elements.homeworkList) {
            this.elements.homeworkList.innerHTML = '<div class="loader mx-auto my-4"></div>';
        }
        studentHomework.showHomeworkScreen();
    });
    this.elements.gotoReportCard?.addEventListener('click', () => this.showReportListScreen());

    this.elements.backToSubjectsFromClassVideoBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
    this.elements.backToVideoDatesBtn?.addEventListener('click', () => this.backToVideoDatesScreen());
    this.elements.closeVideoModalBtn?.addEventListener('click', () => this.closeVideoModal());
    this.elements.backToMenuFromReportListBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
  },

  showScreen(screenEl) {
    const screens = document.querySelectorAll(".student-screen");
    screens.forEach((el) => { if (el) el.style.display = "none"; });
    if (screenEl) screenEl.style.display = "flex";
    else console.warn("Target screen element is null.");
  },

  showSubjectSelectionScreen(keepMode = false) {
    if (!keepMode) this.state.isScoreInputMode = false;

    const welcomeEl = this.elements.welcomeMessage;
    if (welcomeEl) { 
        welcomeEl.textContent = `${this.state.className || ''} ${this.state.studentName || ''}님, 환영합니다!`; 
    }
    this.renderSubjectList(); 
    
    const classType = this.state.classType;
    const hasSubjects = this.state.activeSubjects.length > 0;

    // 1. 학습 시작 카드 (예습용)
    if(this.elements.startLessonCard) {
        if ((classType === 'self-directed' || classType === 'live-lecture') && hasSubjects) {
            this.elements.startLessonCard.style.display = 'block'; 
            
            const titleEl = document.getElementById('student-start-lesson-title');
            if (titleEl) {
                titleEl.textContent = (classType === 'live-lecture') ? "오늘의 예습 하기" : "과목별 학습 시작";
            }
            
            this.elements.startLessonCard.onclick = () => { 
                this.state.isScoreInputMode = false; 
            };
        } else {
            this.elements.startLessonCard.style.display = 'none';
        }
    }

    // 2. ✨ 일일테스트 카드 (현강반도 보이게 수정됨)
    if(this.elements.dailyTestCard) {
        if ((classType === 'self-directed' || classType === 'live-lecture') && hasSubjects) {
            this.elements.dailyTestCard.style.display = 'block'; 
        } else {
            this.elements.dailyTestCard.style.display = 'none';
        }
    }

    if(this.elements.gotoClassVideoCard) this.elements.gotoClassVideoCard.style.display = classType === 'live-lecture' ? 'flex' : 'none';
    if(this.elements.gotoQnaVideoCard) this.elements.gotoQnaVideoCard.style.display = 'flex';
    if(this.elements.gotoHomeworkCard) this.elements.gotoHomeworkCard.style.display = 'flex';
    if(this.elements.gotoReportCard) this.elements.gotoReportCard.style.display = 'flex';
    
    this.showScreen(this.elements.subjectSelectionScreen);
  },

  renderSubjectList() {
    const listEl = this.elements.subjectsList;
    if (!listEl) return;
    
    listEl.innerHTML = '';
    
    if (!this.state.activeSubjects || this.state.activeSubjects.length === 0) { 
        listEl.innerHTML = `
            <div class="text-center py-8">
                <span class="material-icons-round text-slate-300 text-4xl mb-2">sentiment_dissatisfied</span>
                <p class="text-sm text-slate-400">수강 중인 과목이 없습니다.</p>
            </div>`; 
        if (this.elements.startLessonCard) this.elements.startLessonCard.style.display = 'none'; 
        return; 
    }
    
    this.state.activeSubjects.forEach(subject => {
      const button = document.createElement('button'); 
      button.className = 'subject-btn w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between hover:bg-white hover:border-indigo-200 hover:shadow-md transition-all group mb-2';
      button.dataset.id = subject.id; 
      button.dataset.name = subject.name;
      
      button.innerHTML = `
        <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-indigo-500 group-hover:border-indigo-100 transition-colors">
                <span class="material-icons-round text-lg">class</span>
            </div>
            <span class="font-bold text-slate-700 text-sm group-hover:text-indigo-900 text-left">${subject.name}</span>
        </div>
        <span class="material-icons-round text-slate-300 group-hover:text-indigo-400 text-sm">arrow_forward_ios</span>
      `;
      
      listEl.appendChild(button);
    });
  },

  async selectSubjectAndShowLessons(subject) {
    this.state.selectedSubject = subject;
    
    const titleText = this.state.isScoreInputMode 
        ? `[점수 입력] 단원을 선택하세요` 
        : `${subject.name} 학습 목록`;
        
    if (this.elements.selectedSubjectTitle) { 
        this.elements.selectedSubjectTitle.textContent = titleText; 
        if(this.state.isScoreInputMode) {
            this.elements.selectedSubjectTitle.classList.add('text-rose-600');
        } else {
            this.elements.selectedSubjectTitle.classList.remove('text-rose-600');
        }
    }
    
    await this.loadLessonsForSubject(subject.id);
    this.showScreen(this.elements.lessonSelectionScreen);
  },

  async loadLessonsForSubject(subjectId) {
    const listEl = this.elements.lessonsList; if (!listEl) return; 
    
    listEl.innerHTML = `
        <div class="flex justify-center py-10">
            <div class="w-8 h-8 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin"></div>
        </div>`;
        
    try {
      const q = query( collection(db, 'subjects', subjectId, 'lessons'), where('isActive', '==', true), orderBy('order', 'asc') );
      const snapshot = await getDocs(q); 
      this.state.lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
      
      listEl.innerHTML = '';
      
      if (this.state.lessons.length === 0) { 
          listEl.innerHTML = `
            <div class="text-center py-12">
                <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span class="material-icons-round text-slate-300 text-3xl">inbox</span>
                </div>
                <p class="text-slate-400 text-sm">아직 등록된 학습이 없습니다.</p>
            </div>`;
          return; 
      }
      
      this.state.lessons.forEach((lesson, index) => {
        const button = document.createElement('button'); 
        button.className = 'w-full p-4 bg-white border border-slate-100 rounded-2xl mb-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center gap-4 text-left group';
        
        const idx = (index + 1).toString().padStart(2, '0');
        
        let actionIcon = 'play_circle';
        let actionText = '학습하기';
        let iconColor = 'text-indigo-500';
        let bgHover = 'group-hover:bg-indigo-50';

        if (this.state.isScoreInputMode) {
            actionIcon = 'edit';
            actionText = '점수 입력';
            iconColor = 'text-rose-500';
            bgHover = 'group-hover:bg-rose-50';
        }

        button.innerHTML = `
            <span class="text-xs font-bold text-slate-300 font-mono">${idx}</span>
            <div class="flex-grow">
                <h3 class="font-bold text-slate-800 text-sm mb-0.5 group-hover:text-indigo-700 transition-colors">${lesson.title}</h3>
                <p class="text-xs text-slate-400 flex items-center gap-1">
                    <span class="material-icons-round text-[10px]">timer</span> 10분 소요
                </p>
            </div>
            <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center ${bgHover} transition-colors">
                <span class="material-icons-round ${iconColor} text-xl">${actionIcon}</span>
            </div>
        `;
        
        if (this.state.isScoreInputMode) {
            button.onclick = () => studentLesson.inputDailyTestScoreOnly(lesson);
        } else {
            button.onclick = () => studentLesson.startSelectedLesson(lesson);
        }
        
        listEl.appendChild(button);
      });
    } catch (error) { 
        console.error(error); 
        listEl.innerHTML = '<p class="text-center text-red-400 py-8 text-sm">목록을 불러오지 못했습니다.</p>'; 
    }
  },

  showLessonSelectionScreen() {
      if (!this.state.selectedSubject) { console.warn("No subject selected."); this.showSubjectSelectionScreen(); return; }
      this.showScreen(this.elements.lessonSelectionScreen);
  },

  async showClassVideoDateScreen() { await this.loadAndRenderVideoDates("class"); this.showScreen(this.elements.classVideoDateScreen); },
  async showQnaVideoDateScreen() { await this.loadAndRenderVideoDates("qna"); this.showScreen(this.elements.qnaVideoDateScreen); },
  backToVideoDatesScreen() { if (this.state.currentVideoType === "qna") this.showScreen(this.elements.qnaVideoDateScreen); else this.showScreen(this.elements.classVideoDateScreen); },

  async loadAndRenderVideoDates(videoType) {
    const isQna = videoType === "qna"; const collectionName = isQna ? "classVideos" : "classLectures"; const dateFieldName = isQna ? "videoDate" : "lectureDate";
    const listElement = isQna ? this.elements.qnaVideoDateList : this.elements.classVideoDateList; const stateKey = isQna ? "qnaVideosByDate" : "classVideosByDate";
    if (!listElement) return; if (!this.state.classId) { listElement.innerHTML = `<p class="text-center text-slate-400 py-8">반 배정 정보가 없습니다.</p>`; return; }
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
      if (datesFound.length === 0) { listElement.innerHTML = `<p class="text-center text-slate-400 py-8">영상이 없습니다.</p>`; return; }
      datesFound.sort((a, b) => b.localeCompare(a));
      datesFound.forEach((date) => { const btn = document.createElement("button"); btn.className = "w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 transition mb-2"; btn.textContent = date; btn.addEventListener("click", () => this.showVideoTitlesForDate(videoType, date)); listElement.appendChild(btn); });
    } catch (e) { console.error(e); listElement.innerHTML = `<p class="text-center text-red-400 py-8">오류 발생</p>`; }
  },

  showVideoTitlesForDate(videoType, date) {
    this.state.currentVideoDate = date; this.state.currentVideoType = videoType; const stateKey = videoType === "qna" ? "qnaVideosByDate" : "classVideosByDate"; const videos = this.state[stateKey]?.[date] || [];
    if (this.elements.videoTitlesDate) { this.elements.videoTitlesDate.textContent = `${date} ${videoType === "qna" ? "질문" : "수업"} 영상`; }
    if (this.elements.videoTitlesList) {
        this.elements.videoTitlesList.innerHTML = ""; if (videos.length === 0) { this.elements.videoTitlesList.innerHTML = "<p class='text-center text-slate-400 py-8'>영상이 없습니다.</p>"; }
        else { videos.forEach((v) => { const btn = document.createElement("button"); btn.className = "w-full p-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 transition text-left mb-2 flex items-center justify-between"; btn.innerHTML = `<span>${v.title}</span><span class="material-icons-round text-indigo-400">play_circle_filled</span>`; btn.addEventListener("click", () => this.playVideoInModal(v)); this.elements.videoTitlesList.appendChild(btn); }); }
    }
    this.showScreen(this.elements.videoTitlesScreen);
  },

  playVideoInModal(video) {
    const modal = this.elements.videoDisplayModal; const content = this.elements.videoModalContent; const titleEl = this.elements.videoModalTitle;
    if (!modal || !content) return;
    content.innerHTML = ''; 
    if (titleEl) titleEl.textContent = video.title || "영상 보기";
    const videoId = studentLesson.extractVideoId(video.url);
    const embedUrl = videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    modal.style.display = "flex"; 
    if (embedUrl) {
      const iframe = document.createElement("iframe"); iframe.style.position = 'absolute'; iframe.style.top = '0'; iframe.style.left = '0'; iframe.style.width = '100%'; iframe.style.height = '100%'; iframe.style.border = 'none'; iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"; iframe.allowFullscreen = true; iframe.style.display = 'block'; iframe.src = embedUrl; content.appendChild(iframe);
    } else { content.innerHTML = `<p class="text-white text-center p-4">유효하지 않은 URL</p>`; }
  },

  closeVideoModal() {
    const modal = this.elements.videoDisplayModal; const content = this.elements.videoModalContent;
    if (modal) modal.style.display = "none"; if (content) content.innerHTML = ""; 
    this.showScreen(this.elements.videoTitlesScreen);
  },

  async showReportListScreen() {
      const container = this.elements.reportListContainer; if (!container) return;
      if (!this.state.classId || !this.state.studentName) { container.innerHTML = '<p class="text-center text-red-400 py-8">학생 정보 없음</p>'; this.showScreen(this.elements.reportListScreen); return; }
      container.innerHTML = '<div class="loader mx-auto my-4"></div>'; this.showScreen(this.elements.reportListScreen);
      try { const reportsByDate = await reportManager.listStudentReports(this.state.classId, this.state.studentName); this.state.reportsByDate = reportsByDate; this.renderReportList(); }
      catch (error) { console.error(error); container.innerHTML = '<p class="text-center text-red-400 py-8">로딩 실패</p>'; }
  },

  renderReportList() {
      const container = this.elements.reportListContainer; if (!container) return; container.innerHTML = ''; const dates = Object.keys(this.state.reportsByDate).sort((a, b) => b.localeCompare(a));
      if (dates.length === 0) { container.innerHTML = '<p class="text-center text-slate-400 py-8">시험 결과가 없습니다.</p>'; return; }
      dates.forEach(date => {
          const reports = this.state.reportsByDate[date]; if (!reports || reports.length === 0) return;
          const dateSection = document.createElement('div'); dateSection.className = 'mb-6'; const dateHeader = document.createElement('h3');
          const displayDate = date.length === 8 ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}` : date; dateHeader.textContent = displayDate; dateHeader.className = 'text-lg font-bold text-slate-800 mb-3 ml-1';
          dateSection.appendChild(dateHeader); const ul = document.createElement('ul'); ul.className = 'space-y-2';
          reports.forEach(report => {
              const li = document.createElement('li'); li.className = 'p-4 bg-white border border-slate-100 rounded-2xl shadow-sm flex justify-between items-center';
              li.innerHTML = `<span class="font-medium text-slate-700 truncate mr-2">${report.title}</span> ${report.url ? `<a href="${report.url}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-indigo-100 transition">결과 보기</a>` : '<span class="text-xs text-slate-300">열 수 없음</span>'}`; ul.appendChild(li);
          });
          dateSection.appendChild(ul); container.appendChild(dateSection);
      });
  },

  stopAllVideos() {
      if (this.elements.video1Iframe) { this.elements.video1Iframe.src = 'about:blank'; }
      if (this.elements.reviewVideo2Iframe) { this.elements.reviewVideo2Iframe.src = 'about:blank'; }
      if (this.elements.video2Iframe) { this.elements.video2Iframe.src = 'about:blank'; }
      this.closeVideoModal();
  },
};

document.addEventListener("DOMContentLoaded", () => {
  console.log("[StudentApp] Starting...");
  ensureAnonymousAuth((user) => {
    if (user) {
      StudentApp.state.authUid = user.uid;
      if (!StudentApp.isInitialized) StudentApp.init();
    } else {
      console.error("Auth failed");
      showToast("인증 실패. 새로고침 해주세요.", true);
      if (!StudentApp.isInitialized) StudentApp.init();
    }
  });
});

export default StudentApp;