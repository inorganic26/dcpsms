// src/admin/adminApp.js

import app, { db, auth } from "../shared/firebase.js";
import { getClasses, CLASS_EVENTS } from "../store/classStore.js";
import { getSubjects, SUBJECT_EVENTS } from "../store/subjectStore.js";
import { getStudents, STUDENT_EVENTS } from "../store/studentStore.js";
import { getTeachers, TEACHER_EVENTS } from "../store/teacherStore.js";

import { studentManager } from "./studentManager.js";
import { classManager } from "./classManager.js";
import { subjectManager } from "./subjectManager.js"; 
import { teacherManager } from "./teacherManager.js";
import { textbookManager } from "./textbookManager.js"; 
import { lessonManager } from "./lessonManager.js";
import { studentAssignmentManager } from "./studentAssignmentManager.js";
import { createClassVideoManager } from "../shared/classVideoManager.js";
import { adminHomeworkDashboard } from "./adminHomeworkDashboard.js";
import { adminReportManager } from "./adminReportManager.js"; 
import { adminAnalysisManager } from "./adminAnalysisManager.js"; 
import { adminAuth } from "./adminAuth.js"; 
import { adminState } from "./adminState.js"; 

export const AdminApp = {
    isInitialized: false,
    adminClassVideoManager: null, 

    uiIds: {
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
        if (this.isInitialized) return;
        this.cacheElements();
        adminAuth.init(this);
        this.addEventListeners();
        this.setupStoreBridges();

        // ⭐ [핵심 수정] 메인 콘텐츠 영역에 스크롤 기능 강제 주입
        // (HTML 구조를 몰라도 JS로 강제 적용하여 스크롤 문제를 해결함)
        const mainContent = document.getElementById('admin-main-content') || document.querySelector('main');
        if (mainContent) {
            mainContent.classList.add('overflow-y-auto', 'h-full', 'pb-20');
            // 부모 컨테이너도 높이 제한 확인
            if(mainContent.parentElement) {
                mainContent.parentElement.classList.add('h-screen', 'overflow-hidden', 'flex', 'flex-col');
            }
        }
    },

    cacheElements() {
        this.elements = {};
        for (const [key, id] of Object.entries(this.uiIds)) {
            const el = document.getElementById(id);
            if (el) this.elements[key] = el;
        }
        this.elements.qnaClassSelect = "admin-qna-class-select";
        this.elements.qnaVideoDateInput = "admin-qna-video-date";
        this.elements.saveQnaVideoBtn = "admin-save-qna-video-btn";
        this.elements.qnaVideoTitleInput = "admin-qna-video-title";
        this.elements.qnaVideoUrlInput = "admin-qna-video-url";
        this.elements.qnaVideosList = "admin-qna-videos-list";

        this.elements.lectureClassSelect = "admin-class-video-class-select";
        this.elements.lectureVideoDateInput = "admin-class-video-date";
        this.elements.saveLectureVideoBtn = "admin-save-class-video-btn";
        this.elements.addLectureVideoFieldBtn = "admin-add-class-video-field-btn";
        this.elements.lectureVideoListContainer = "admin-class-video-list-container";
        this.elements.lectureVideoTitleInput = "admin-class-video-title";
        this.elements.lectureVideoUrlInput = "admin-class-video-url";
    },

    setupStoreBridges() {
        document.addEventListener(CLASS_EVENTS.UPDATED, () => { this.state.classes = getClasses(); });
        document.addEventListener(SUBJECT_EVENTS.UPDATED, () => { this.state.subjects = getSubjects(); });
        document.addEventListener(STUDENT_EVENTS.UPDATED, () => { this.state.students = getStudents(); });
        document.addEventListener(TEACHER_EVENTS.UPDATED, () => { this.state.teachers = getTeachers(); });
    },

    addEventListeners() {
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
            if (btn) btn.addEventListener("click", () => this.showView(viewName));
        });

        document.querySelectorAll(".back-to-admin-dashboard-btn")
            .forEach((b) => b.addEventListener("click", () => this.showView("dashboard")));
    },

    initializeAppUI(loadData = true) {
        if (this.isInitialized) return;
        
        try {
            studentManager.init(this);
            classManager.init(this);
            subjectManager.init(this);
            teacherManager.init(this);
            textbookManager.init(this);
            lessonManager.init(this);
            studentAssignmentManager.init(this);
            
            this.adminClassVideoManager = createClassVideoManager({ 
                app: this, 
                elements: this.elements,
                options: { disableClassSelectPopulation: false } 
            });

            adminHomeworkDashboard.init(this);
            adminAnalysisManager.init(this);
            adminReportManager.init(this);

            this.isInitialized = true;
        } catch (e) { console.error("매니저 초기화 오류", e); }
    },

    showView(viewName) {
        Object.keys(this.uiIds).forEach((key) => {
            if (key.endsWith("View")) {
                const el = this.elements[key];
                if (el) el.style.display = "none";
            }
        });

        const viewKey = `${viewName}View`;
        const targetView = this.elements[viewKey];

        if (targetView) {
            targetView.style.display = "block";
            this.state.currentView = viewName;

            switch (viewName) {
                case "homeworkMgmt": adminHomeworkDashboard.initView?.(); break;
                case "qnaVideoMgmt": this.adminClassVideoManager.initQnaView(); break;
                case "classVideoMgmt": this.adminClassVideoManager.initLectureView(); break;
                
                case "reportMgmt": adminReportManager.initView?.(); break;
                case "studentAssignment": studentAssignmentManager.resetView?.(); break;
                case "textbookMgmt": textbookManager.populateSubjectSelect?.(); break;
                case "lessonMgmt": lessonManager.populateSubjectSelect?.(); break;
                case "dailyTestMgmt": adminAnalysisManager.initDailyTestView?.(); break;
                case "weeklyTestMgmt": adminAnalysisManager.initWeeklyTestView?.(); break;
                case "learningStatusMgmt": adminAnalysisManager.initLearningStatusView?.(); break;
            }
        } else {
            const dash = this.elements.dashboardView;
            if(dash) dash.style.display = "block";
            this.state.currentView = "dashboard";
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    AdminApp.init();
});