// src/admin/adminApp.js

import app, { db, auth } from "../shared/firebase.js";

// Stores
import { getClasses, CLASS_EVENTS } from "../store/classStore.js";
import { getSubjects, SUBJECT_EVENTS } from "../store/subjectStore.js";
import { getStudents, STUDENT_EVENTS } from "../store/studentStore.js";
import { getTeachers, TEACHER_EVENTS } from "../store/teacherStore.js";

// Managers
import { studentManager } from "./studentManager.js";
import { classManager } from "./classManager.js";
import { subjectManager } from "./subjectManager.js"; 
import { teacherManager } from "./teacherManager.js";
import { textbookManager } from "./textbookManager.js"; 
import { lessonManager } from "./lessonManager.js";
import { studentAssignmentManager } from "./studentAssignmentManager.js";
import { adminClassVideoManager } from "./adminClassVideoManager.js";
import { adminHomeworkDashboard } from "./adminHomeworkDashboard.js";
import { adminReportManager } from "./adminReportManager.js"; 
import { adminAnalysisManager } from "./adminAnalysisManager.js"; 
import { adminAuth } from "./adminAuth.js"; 

import { adminState } from "./adminState.js"; 

export const AdminApp = {
    isInitialized: false,
    
    // [다이어트 완료] 이제 App.js는 '화면(View)'과 '메뉴 버튼'만 관리합니다.
    uiIds: {
        // --- Views (화면 컨테이너) ---
        dashboardView: "admin-dashboard-view",
        subjectMgmtView: "admin-subject-mgmt-view",
        textbookMgmtView: "admin-textbook-mgmt-view",
        classMgmtView: "admin-class-mgmt-view",
        studentMgmtView: "admin-student-mgmt-view",
        teacherMgmtView: "admin-teacher-mgmt-view",
        studentAssignmentView: "admin-student-assignment-view",
        lessonMgmtView: "admin-lesson-mgmt-view",
        qnaVideoMgmtView: "admin-qna-video-mgmt-view",
        classVideoMgmtView: "admin-class-video-mgmt-view",
        homeworkMgmtView: "admin-homework-mgmt-view",
        reportMgmtView: "admin-report-mgmt-view",
        dailyTestMgmtView: "admin-daily-test-mgmt-view",
        weeklyTestMgmtView: "admin-weekly-test-mgmt-view",
        learningStatusMgmtView: "admin-learning-status-mgmt-view",

        // --- Menu Buttons (화면 전환 버튼) ---
        gotoSubjectMgmtBtn: "goto-subject-mgmt-btn",
        gotoTextbookMgmtBtn: "goto-textbook-mgmt-btn",
        gotoClassMgmtBtn: "goto-class-mgmt-btn",
        gotoStudentMgmtBtn: "goto-student-mgmt-btn",
        gotoTeacherMgmtBtn: "goto-teacher-mgmt-btn",
        gotoStudentAssignmentBtn: "goto-student-assignment-btn",
        gotoLessonMgmtBtn: "goto-lesson-mgmt-btn",
        gotoQnaVideoMgmtBtn: "goto-qna-video-mgmt-btn",
        gotoClassVideoMgmtBtn: "goto-class-video-mgmt-btn",
        gotoHomeworkMgmtBtn: "goto-homework-mgmt-btn",
        gotoReportMgmtBtn: "goto-report-mgmt-btn",
        gotoDailyTestMgmtBtn: "goto-daily-test-mgmt-btn", 
        gotoWeeklyTestMgmtBtn: "goto-weekly-test-mgmt-btn",
        gotoLearningStatusMgmtBtn: "goto-learning-status-mgmt-btn",
    },

    elements: {}, 
    state: adminState.data, 

    async init() {
        console.log("[AdminApp.init] 초기화 시작");
        if (this.isInitialized) return;

        this.cacheElements(); // 화면과 메뉴 버튼만 찾음
        adminAuth.init(this);
        this.addEventListeners();
        this.setupStoreBridges();

        console.log("[AdminApp.init] 기본 초기화 완료");
    },

    cacheElements() {
        this.elements = {};
        for (const [key, id] of Object.entries(this.uiIds)) {
            const el = document.getElementById(id);
            if (el) {
                this.elements[key] = el;
            } else {
                console.warn(`[AdminApp] 요소를 찾을 수 없음: ${key} (#${id})`);
            }
        }
    },

    setupStoreBridges() {
        // 스토어 데이터가 변경되면 App 상태도 업데이트 (필요 시 매니저에게 알림 가능)
        document.addEventListener(CLASS_EVENTS.UPDATED, () => {
            this.state.classes = getClasses();
            // 필요하다면: adminReportManager.refreshData(); 
        });

        document.addEventListener(SUBJECT_EVENTS.UPDATED, () => {
            this.state.subjects = getSubjects();
        });

        document.addEventListener(STUDENT_EVENTS.UPDATED, () => {
            this.state.students = getStudents();
            document.dispatchEvent(new CustomEvent('studentsLoaded'));
        });

        document.addEventListener(TEACHER_EVENTS.UPDATED, () => {
            this.state.teachers = getTeachers();
        });
    },

    addEventListeners() {
        // 메뉴 버튼 연결
        const menuMapping = {
            "gotoSubjectMgmtBtn": "subjectMgmt",
            "gotoTextbookMgmtBtn": "textbookMgmt",
            "gotoClassMgmtBtn": "classMgmt",
            "gotoStudentMgmtBtn": "studentMgmt",
            "gotoTeacherMgmtBtn": "teacherMgmt",
            "gotoStudentAssignmentBtn": "studentAssignment",
            "gotoLessonMgmtBtn": "lessonMgmt",
            "gotoQnaVideoMgmtBtn": "qnaVideoMgmt",
            "gotoClassVideoMgmtBtn": "classVideoMgmt",
            "gotoHomeworkMgmtBtn": "homeworkMgmt",
            "gotoReportMgmtBtn": "reportMgmt",
            "gotoDailyTestMgmtBtn": "dailyTestMgmt", 
            "gotoWeeklyTestMgmtBtn": "weeklyTestMgmt",
            "gotoLearningStatusMgmtBtn": "learningStatusMgmt",
        };

        Object.entries(menuMapping).forEach(([btnKey, viewName]) => {
            const btn = this.elements[btnKey];
            if (btn) {
                btn.addEventListener("click", () => this.showView(viewName));
            }
        });

        // 뒤로가기 버튼 (공통 클래스)
        document.querySelectorAll(".back-to-admin-dashboard-btn")
            .forEach((b) => b.addEventListener("click", () => this.showView("dashboard")));
    },

    initializeAppUI(loadData = true) {
        if (this.isInitialized) return;
        
        try {
            // 각 매니저 초기화 (이제 매니저가 스스로 DOM 요소를 찾습니다)
            studentManager.init(this);
            classManager.init(this);
            subjectManager.init(this);
            teacherManager.init(this);
            textbookManager.init(this);
            lessonManager.init(this);
            studentAssignmentManager.init(this);
            adminClassVideoManager.init(this);
            adminHomeworkDashboard.init(this);
            adminAnalysisManager.init(this); // 이미 수정 완료됨
            adminReportManager.init(this);

            this.isInitialized = true;
            console.log("[AdminApp] 모든 매니저 초기화 및 위임 완료");

        } catch (e) {
            console.error("매니저 초기화 중 오류 발생", e);
        }
    },

    showView(viewName) {
        // 1. 모든 뷰 숨기기
        Object.keys(this.uiIds).forEach((key) => {
            if (key.endsWith("View")) {
                const el = this.elements[key];
                if (el) el.style.display = "none";
            }
        });

        // 2. 타겟 뷰 보이기
        const viewKey = `${viewName}View`;
        const targetView = this.elements[viewKey];

        if (targetView) {
            targetView.style.display = "block";
            this.state.currentView = viewName;

            // 뷰별 초기화 로직 (필요한 경우만 호출)
            switch (viewName) {
                case "homeworkMgmt": adminHomeworkDashboard.initView?.(); break;
                case "qnaVideoMgmt": adminClassVideoManager.initQnaView?.(); break;
                case "classVideoMgmt": adminClassVideoManager.initLectureView?.(); break;
                case "reportMgmt": adminReportManager.initView?.(); break;
                case "studentAssignment": studentAssignmentManager.resetView?.(); break;
                
                // 일부 매니저는 데이터 로딩이 필요할 수 있음
                case "textbookMgmt": textbookManager.populateSubjectSelect?.(); break;
                case "lessonMgmt": lessonManager.populateSubjectSelect?.(); break;
                
                // 분석/테스트 매니저 (이미 리팩토링 완료)
                case "dailyTestMgmt": adminAnalysisManager.initDailyTestView?.(); break;
                case "weeklyTestMgmt": adminAnalysisManager.initWeeklyTestView?.(); break;
                case "learningStatusMgmt": adminAnalysisManager.initLearningStatusView?.(); break;
            }
        } else {
            // 기본값: 대시보드
            const dash = this.elements.dashboardView;
            if(dash) dash.style.display = "block";
            this.state.currentView = "dashboard";
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    AdminApp.init();
});