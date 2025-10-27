// src/admin/adminApp.js — 공용 유지형 컨트롤러(경로 수정 안정화 버전)

import { signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, auth } from "../shared/firebase.js";   // ✅ 경로 수정됨
import { showToast } from "../shared/utils.js";     // ✅ 경로 수정됨

// 공용 기반 모듈
import { studentManager } from "./studentManager.js";
import { classManager } from "./classManager.js";
import { studentAssignmentManager } from "./studentAssignmentManager.js";
import { lessonManager } from "./lessonManager.js";
import { adminClassVideoManager } from "./adminClassVideoManager.js";
import { adminHomeworkDashboard } from "./adminHomeworkDashboard.js";
import { reportManager } from "../shared/reportManager.js"; // ✅ 경로 수정됨

// 아직 안 주신 모듈은 임시 스텁 처리
const subjectManager = {
  init() {},
  renderList() {},
  addNewSubject() { showToast("과목 매니저 파일이 아직 연결되지 않았어요."); }
};
const textbookManager = {
  init() {},
  handleSubjectSelectForTextbook() { showToast("교재 매니저 파일이 아직 연결되지 않았어요."); },
  addNewTextbook() { showToast("교재 매니저 파일이 아직 연결되지 않았어요."); }
};
const teacherManager = {
  init() {},
  renderList() {},
  addNewTeacher() { showToast("교사 매니저 파일이 아직 연결되지 않았어요."); }
};

export const AdminApp = {
  isInitialized: false,
  elements: {},
  state: {
    currentView: "dashboard",
    teachers: [],
    students: [],
    subjects: [],
    classes: [],
    selectedSubjectIdForTextbook: null,
    editingClass: null,
    selectedClassIdForHomework: null,
    selectedHomeworkId: null,
    studentsInClass: new Map(),
    selectedSubjectIdForMgmt: null,
    lessons: [],
    editingLesson: null,
    generatedQuiz: null,
    selectedClassIdForQnaVideo: null,
    selectedClassIdForClassVideo: null,
    editingQnaVideoId: null,
    editingClassVideoIndex: null,
    selectedReportClassId: null,
    selectedReportDate: null,
    uploadedReports: [],
  },

  async init() {
    console.log("[AdminApp.init] 초기화 시작");
    if (this.isInitialized) return;

    this.cacheElements();
    this.showLoginScreen();
    this.addEventListeners();

    try {
      await signInAnonymously(auth);
      console.log("[AdminApp.init] Firebase 익명 로그인 성공");
    } catch (e) {
      console.warn("[AdminApp.init] 익명 로그인 실패", e);
    }

    console.log("[AdminApp.init] 기본 초기화 완료");
  },

  cacheElements() {
    this.elements = {
      initialLogin: document.getElementById("admin-initial-login"),
      secretPasswordInput: document.getElementById("admin-secret-password"),
      secretLoginBtn: document.getElementById("admin-secret-login-btn"),
      mainDashboard: document.getElementById("admin-main-dashboard"),

      // 각 섹션 뷰
      dashboardView: document.getElementById("admin-dashboard-view"),
      subjectMgmtView: document.getElementById("admin-subject-mgmt-view"),
      textbookMgmtView: document.getElementById("admin-textbook-mgmt-view"),
      classMgmtView: document.getElementById("admin-class-mgmt-view"),
      studentMgmtView: document.getElementById("admin-student-mgmt-view"),
      teacherMgmtView: document.getElementById("admin-teacher-mgmt-view"),
      studentAssignmentView: document.getElementById("admin-student-assignment-view"),
      lessonMgmtView: document.getElementById("admin-lesson-mgmt-view"),
      qnaVideoMgmtView: document.getElementById("admin-qna-video-mgmt-view"),
      classVideoMgmtView: document.getElementById("admin-class-video-mgmt-view"),
      homeworkMgmtView: document.getElementById("admin-homework-mgmt-view"),
      reportMgmtView: document.getElementById("admin-report-mgmt-view"),
    };
    console.log("[AdminApp] cacheElements 완료");
  },

  addEventListeners() {
    this.elements.secretLoginBtn?.addEventListener("click", () => this.handleAdminLogin());
    this.elements.secretPasswordInput?.addEventListener("keypress", (e) => {
      if (e.key === "Enter") this.handleAdminLogin();
    });

    [
      "gotoSubjectMgmtBtn",
      "gotoTextbookMgmtBtn",
      "gotoClassMgmtBtn",
      "gotoStudentMgmtBtn",
      "gotoTeacherMgmtBtn",
      "gotoStudentAssignmentBtn",
      "gotoLessonMgmtBtn",
      "gotoQnaVideoMgmtBtn",
      "gotoClassVideoMgmtBtn",
      "gotoHomeworkMgmtBtn",
      "gotoReportMgmtBtn",
    ].forEach((btnId) => {
      this.elements[btnId]?.addEventListener("click", () => {
        const viewName = btnId
          .replace(/^goto-/, "")
          .replace(/-btn$/, "")
          .replace(/-([a-z])/g, (_, g1) => g1.toUpperCase());
        this.showView(viewName);
      });
    });

    document.querySelectorAll(".back-to-admin-dashboard-btn")
      .forEach((b) => b.addEventListener("click", () => this.showView("dashboard")));

    console.log("[AdminApp] 이벤트 리스너 등록 완료");
  },

  showLoginScreen() {
    this.elements.initialLogin?.style.setProperty("display", "flex");
    this.elements.mainDashboard?.style.setProperty("display", "none");
  },

  async handleAdminLogin() {
    const password = this.elements.secretPasswordInput?.value || "";
    if (password !== "qkraudtls0626^^") {
      showToast("비밀번호가 일치하지 않습니다.", true);
      return;
    }

    showToast("관리자 로그인 성공", false);
    this.elements.initialLogin.style.display = "none";
    this.elements.mainDashboard.style.display = "block";

    setTimeout(() => {
      this.cacheElements();
      this.initializeAppUI(true);
      this.showView("dashboard");
    }, 50);
  },

  initializeAppUI(loadData = true) {
    if (this.isInitialized) return;
    try {
      studentManager.init(this);
      classManager.init(this);
      studentAssignmentManager.init(this);
      lessonManager.init(this);
      adminClassVideoManager.init(this);
      adminHomeworkDashboard.init(this);
      subjectManager.init(this);
      textbookManager.init(this);
      teacherManager.init(this);

      this.isInitialized = true;
      console.log("[AdminApp] 매니저 초기화 완료");

      if (loadData) {
        this.listenForSubjects();
        this.listenForClasses();
        this.listenForStudents();
      }
    } catch (e) {
      console.error("[AdminApp.initializeAppUI] 오류", e);
    }
  },

  showView(viewName) {
    console.log(`[AdminApp] 뷰 전환: ${viewName}`);
    if (!this.elements.mainDashboard) return;

    Object.keys(this.elements).forEach((k) => {
      if (k.endsWith("View") && this.elements[k]) this.elements[k].style.display = "none";
    });

    const el = this.elements[`${viewName}View`];
    if (!el) {
      console.error(`[AdminApp] ${viewName}View 요소를 찾을 수 없음`);
      this.elements.dashboardView.style.display = "block";
      return;
    }

    el.style.display = "block";
    this.state.currentView = viewName;

    switch (viewName) {
      case "homeworkMgmt":
        adminHomeworkDashboard.initView?.();
        break;
      case "qnaVideoMgmt":
        adminClassVideoManager.initQnaView?.();
        break;
      case "classVideoMgmt":
        adminClassVideoManager.initLectureView?.();
        break;
      case "reportMgmt":
        this.populateReportClassSelect();
        this.loadAndRenderUploadedReports();
        break;
    }
  },

  listenForStudents() {
    const qy = query(collection(db, "students"), orderBy("name"));
    onSnapshot(qy, (snap) => {
      this.state.students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    });
  },

  listenForSubjects() {
    const qy = query(collection(db, "subjects"), orderBy("name"));
    onSnapshot(qy, (snap) => {
      this.state.subjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      subjectManager.renderList?.();
    });
  },

  listenForClasses() {
    const qy = query(collection(db, "classes"), orderBy("name"));
    onSnapshot(qy, (snap) => {
      this.state.classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      classManager.renderClassList?.();
      this.populateReportClassSelect();
    });
  },

  populateReportClassSelect() {
    const sel = this.elements.reportClassSelect;
    if (!sel) return;
    sel.innerHTML = '<option value="">-- 반 선택 --</option>';
    this.state.classes.forEach((c) =>
      sel.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`)
    );
  },

  async loadAndRenderUploadedReports() {
    const cls = this.elements.reportClassSelect?.value;
    const date = this.elements.reportDateInput?.value;
    const list = this.elements.uploadedReportsList;
    if (!cls || !date || !list) return;

    try {
      const yyyymmdd = date.replace(/-/g, "");
      const reports = await reportManager.listReportsForDateAndClass(cls, yyyymmdd);
      list.innerHTML = "";
      if (!reports?.length) {
        list.innerHTML = '<p class="text-sm text-slate-400 mt-2">업로드된 리포트가 없습니다.</p>';
        return;
      }
      const ul = document.createElement("ul");
      reports.forEach((r) => {
        const li = document.createElement("li");
        li.className = "flex justify-between items-center border p-2 rounded mb-1 bg-white";
        li.innerHTML = `<span>${r.fileName}</span>
          <a href="${r.url}" target="_blank" class="text-blue-500 text-sm font-bold">보기</a>`;
        ul.appendChild(li);
      });
      list.appendChild(ul);
    } catch (e) {
      console.error("[AdminApp] 리포트 목록 로딩 실패", e);
      list.innerHTML = '<p class="text-red-500 text-sm">리포트 목록 불러오기 실패</p>';
    }
  },
};

document.addEventListener("DOMContentLoaded", () => AdminApp.init());
