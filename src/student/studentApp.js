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
    authUid: null,
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

  // ✅ 새로 추가된 함수
  async loadAvailableSubjects() {
    console.log("[StudentApp.loadAvailableSubjects] called.");

    try {
      const classData = this.state.selectedClassData;
      if (!classData) {
        throw new Error("No class data found.");
      }

      // Firestore 클래스 문서에서 subjectIds / subjects 필드 사용
      const subjectIds = classData.subjectIds || [];
      const subjects = classData.subjects || {};

      // 상태에 과목 목록 저장
      this.state.activeSubjects = subjectIds.map((id) => ({
        id,
        name: subjects[id]?.name || "이름없음",
      }));

      console.log(
        "[StudentApp.loadAvailableSubjects] Successfully loaded subjects:",
        this.state.activeSubjects
      );
    } catch (error) {
      console.error("[StudentApp.loadAvailableSubjects] Error:", error);
      showToast("과목 정보를 불러오는 중 오류가 발생했습니다.", true);
    }
  },

  // 요소 캐싱
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
      classVideoDateScreen: document.getElementById("student-class-video-date-screen"),
      classVideoDateList: document.getElementById("student-class-video-date-list"),

      qnaVideoDateScreen: document.getElementById("student-qna-video-date-screen"),
      qnaVideoDateList:
        document.getElementById("student-qna-video-date-list") ||
        document.getElementById("student-qna-video-dates"),

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

    console.log("[StudentApp.cacheElements] Cached elements:", this.elements);
  },

  addEventListeners() {
    this.elements.backToVideoDatesBtn?.addEventListener("click", () =>
      this.backToVideoDatesScreen()
    );
    this.elements.gotoClassVideoCard?.addEventListener("click", () =>
      this.showClassVideoDateScreen()
    );
    this.elements.gotoQnaVideoCard?.addEventListener("click", () =>
      this.showQnaVideoDateScreen()
    );
    this.elements.closeVideoModalBtn?.addEventListener("click", () =>
      this.closeVideoModal()
    );
  },

  showScreen(screenEl) {
    const screens = document.querySelectorAll(".student-screen");
    screens.forEach((el) => (el.style.display = "none"));
    if (screenEl) screenEl.style.display = "block";
  },

  async showClassVideoDateScreen() {
    await this.loadAndRenderVideoDates("class");
    this.showScreen(this.elements.classVideoDateScreen);
  },

  async showQnaVideoDateScreen() {
    await this.loadAndRenderVideoDates("qna");
    this.showScreen(this.elements.qnaVideoDateScreen);
  },

  backToVideoDatesScreen() {
    if (this.state.currentVideoType === "qna")
      this.showScreen(this.elements.qnaVideoDateScreen);
    else this.showScreen(this.elements.classVideoDateScreen);
  },

  async loadAndRenderVideoDates(videoType) {
    const isQna = videoType === "qna";
    const collectionName = isQna ? "classVideos" : "classLectures";
    const dateFieldName = isQna ? "videoDate" : "lectureDate";
    const listElement = isQna
      ? this.elements.qnaVideoDateList
      : this.elements.classVideoDateList;
    const stateKey = isQna ? "qnaVideosByDate" : "classVideosByDate";

    if (!listElement) {
      console.error(`[StudentApp] listElement missing for ${videoType}`);
      return;
    }

    if (!this.state.classId) {
      listElement.innerHTML = `<p class="text-center text-gray-500 py-8">반 배정 정보가 없습니다.</p>`;
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
        const date = (data[dateFieldName] || "").slice(0, 10);
        if (!date) return;
        const url =
          data.videoUrl || data.youtubeUrl || data.url || "";
        const title = data.title || "제목 없음";

        if (!videosByDate[date]) videosByDate[date] = [];
        videosByDate[date].push({ id: docSnap.id, title, url });
      });

      this.state[stateKey] = videosByDate;
      const datesFound = Object.keys(videosByDate);

      listElement.innerHTML = "";
      if (datesFound.length === 0) {
        listElement.innerHTML = `<p class="text-center text-gray-500 py-8">영상이 없습니다.</p>`;
        return;
      }

      datesFound.sort((a, b) => b.localeCompare(a));
      datesFound.forEach((date) => {
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
      console.error("[StudentApp] loadAndRenderVideoDates error:", e);
      listElement.innerHTML = `<p class="text-center text-red-500 py-8">영상 목록을 불러오는 중 오류가 발생했습니다.</p>`;
    }
  },

  showVideoTitlesForDate(videoType, date) {
    this.state.currentVideoDate = date;
    this.state.currentVideoType = videoType;
    const stateKey = videoType === "qna" ? "qnaVideosByDate" : "classVideosByDate";
    const videos = this.state[stateKey]?.[date] || [];

    this.elements.videoTitlesDate.textContent = `${date} ${
      videoType === "qna" ? "질문" : "수업"
    } 영상`;
    this.elements.videoTitlesList.innerHTML = "";

    if (videos.length === 0) {
      this.elements.videoTitlesList.innerHTML =
        "<p class='text-center text-gray-500 py-8'>영상이 없습니다.</p>";
    } else {
      videos.forEach((v) => {
        const btn = document.createElement("button");
        btn.className =
          "w-full p-3 border border-gray-200 rounded-md text-sm font-medium text-slate-700 hover:bg-gray-50 transition text-left";
        btn.textContent = v.title;
        btn.addEventListener("click", () => this.playVideoInModal(v));
        this.elements.videoTitlesList.appendChild(btn);
      });
    }

    this.showScreen(this.elements.videoTitlesScreen);
  },

  playVideoInModal(video) {
    const modal = this.elements.videoDisplayModal;
    const content = this.elements.videoModalContent;
    const titleEl = this.elements.videoModalTitle;

    if (!modal || !content) return;
    content.innerHTML = "";
    if (titleEl) titleEl.textContent = video.title || "영상 보기";

    const iframe = document.createElement("iframe");
    iframe.className = "w-full aspect-video";
    iframe.allow =
      "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
    iframe.allowFullscreen = true;
    iframe.src = this.getYoutubeEmbedUrl(video.url);
    content.appendChild(iframe);

    modal.style.display = "flex";
  },

  closeVideoModal() {
    const modal = this.elements.videoDisplayModal;
    if (modal) modal.style.display = "none";
  },

  getYoutubeEmbedUrl(url) {
    if (!url) return "about:blank";
    const match = url.match(
      /(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  },
};

document.addEventListener("DOMContentLoaded", () => {
  ensureAnonymousAuth((user) => {
    if (user) {
      StudentApp.state.authUid = user.uid;
      if (!StudentApp.isInitialized) StudentApp.init();
    } else {
      showToast("로그인 실패", true);
    }
  });
});

export default StudentApp;
