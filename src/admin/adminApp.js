// src/admin/adminApp.js

import { signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

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
    
    // 1. [설정] 화면 요소들의 ID 목록
    uiIds: {
        // --- Views (화면들) ---
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
        weeklyTestMgmtView: "admin-weekly-test-mgmt-view", // [추가됨] 주간테스트 화면 ID
        learningStatusMgmtView: "admin-learning-status-mgmt-view",

        // --- Menu Buttons (메뉴 버튼) ---
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
        gotoWeeklyTestMgmtBtn: "goto-weekly-test-mgmt-btn", // [추가됨] 주간테스트 버튼 ID
        gotoLearningStatusMgmtBtn: "goto-learning-status-mgmt-btn",

        // --- Manager들이 사용하는 요소들 ---
        
        // Subject & Textbook
        newSubjectNameInput: 'admin-new-subject-name',
        addSubjectBtn: 'admin-add-subject-btn',
        subjectsList: 'admin-subjects-list',
        subjectSelectForTextbook: 'admin-subject-select-for-textbook',
        textbookManagementContent: 'admin-textbook-management-content',
        newTextbookNameInput: 'admin-new-textbook-name',
        addTextbookBtn: 'admin-add-textbook-btn',
        textbooksList: 'admin-textbooks-list',

        // Class
        newClassNameInput: 'admin-new-class-name',
        addClassBtn: 'admin-add-class-btn',
        classesList: 'admin-classes-list',
        editClassModal: 'admin-edit-class-modal',
        editClassName: 'admin-edit-class-name',
        closeEditClassModalBtn: 'admin-close-edit-class-modal-btn',
        cancelEditClassBtn: 'admin-cancel-edit-class-btn',
        saveClassEditBtn: 'admin-save-class-edit-btn',
        editClassSubjectsContainer: 'admin-edit-class-subjects-and-textbooks',
        editClassTypeSelect: 'admin-edit-class-type',

        // Student
        newStudentNameInput: 'admin-new-student-name',
        newStudentPhoneInput: 'admin-new-student-phone',
        newParentPhoneInput: 'admin-new-parent-phone',
        addStudentBtn: 'admin-add-student-btn',
        studentsList: 'admin-students-list',
        editStudentModal: 'admin-edit-student-modal',
        editStudentNameInput: 'admin-edit-student-name',
        editStudentPhoneInput: 'admin-edit-student-phone',
        editParentPhoneInput: 'admin-edit-parent-phone',
        closeEditStudentModalBtn: 'admin-close-edit-student-modal-btn',
        cancelEditStudentBtn: 'admin-cancel-edit-student-btn',
        saveStudentEditBtn: 'admin-save-student-edit-btn',
        searchStudentInput: 'search-student-input',
        studentPagination: 'admin-student-pagination',

        // Teacher
        newTeacherNameInput: 'admin-new-teacher-name',
        newTeacherPhoneInput: 'admin-new-teacher-phone',
        addTeacherBtn: 'admin-add-teacher-btn',
        teachersList: 'admin-teachers-list',
        editTeacherModal: 'admin-edit-teacher-modal',
        editTeacherNameInput: 'admin-edit-teacher-name',
        editTeacherPhoneInput: 'admin-edit-teacher-phone',
        closeEditTeacherModalBtn: 'admin-close-edit-teacher-modal-btn',
        cancelEditTeacherBtn: 'admin-cancel-edit-teacher-btn',
        saveTeacherEditBtn: 'admin-save-teacher-edit-btn',

        // Lesson
        subjectSelectForMgmt: 'admin-subject-select-for-lesson',
        lessonsManagementContent: 'admin-lessons-management-content',
        lessonPrompt: 'admin-lesson-prompt',
        lessonsList: 'admin-lessons-list',
        saveOrderBtn: 'admin-save-lesson-order-btn',
        showNewLessonModalBtn: 'admin-show-new-lesson-modal-btn',
        modal: 'admin-new-lesson-modal',
        modalTitle: 'admin-lesson-modal-title',
        closeModalBtn: 'admin-close-modal-btn',
        cancelBtn: 'admin-cancel-btn',
        lessonTitle: 'admin-lesson-title',
        video1Url: 'admin-video1-url',
        addVideo1RevBtn: 'admin-add-video1-rev-btn',
        quizJsonInput: 'admin-quiz-json-input',
        previewQuizBtn: 'admin-preview-quiz-btn',
        questionsPreviewContainer: 'admin-questions-preview-container',
        questionsPreviewTitle: 'admin-questions-preview-title',
        questionsPreviewList: 'admin-questions-preview-list',
        saveLessonBtn: 'admin-save-lesson-btn',
        saveBtnText: 'admin-save-btn-text',
        saveLoader: 'admin-save-loader',

        // Videos
        qnaVideoDateInput: 'admin-qna-video-date',
        qnaClassSelect: 'admin-qna-class-select',
        qnaVideoTitleInput: 'admin-qna-video-title',
        qnaVideoUrlInput: 'admin-qna-video-url',
        saveQnaVideoBtn: 'admin-save-qna-video-btn',
        qnaVideosList: 'admin-qna-videos-list',
        lectureVideoDateInput: 'admin-class-video-date',
        lectureClassSelect: 'admin-class-video-class-select',
        lectureVideoListContainer: 'admin-class-video-list-container',
        addLectureVideoFieldBtn: 'admin-add-class-video-field-btn',
        saveLectureVideoBtn: 'admin-save-class-video-btn',
        lectureVideoTitleInput: 'admin-class-video-title',
        lectureVideoUrlInput: 'admin-class-video-url',

        // Homework
        homeworkClassSelect: 'admin-homework-class-select',
        homeworkMainContent: 'admin-homework-main-content',
        homeworkSelect: 'admin-homework-select',
        assignHomeworkBtn: 'admin-assign-homework-btn',
        homeworkManagementButtons: 'admin-homework-management-buttons',
        editHomeworkBtn: 'admin-edit-homework-btn',
        deleteHomeworkBtn: 'admin-delete-homework-btn',
        homeworkContent: 'admin-homework-content',
        selectedHomeworkTitle: 'admin-selected-homework-title',
        homeworkTableBody: 'admin-homework-table-body',
        assignHomeworkModal: 'admin-assign-homework-modal',
        homeworkModalTitle: 'admin-homework-modal-title',
        closeHomeworkModalBtn: 'admin-close-homework-modal-btn',
        cancelHomeworkBtn: 'admin-cancel-homework-btn',
        saveHomeworkBtn: 'admin-save-homework-btn',
        homeworkSubjectSelect: 'admin-homework-subject-select',
        homeworkTextbookSelect: 'admin-homework-textbook-select',
        homeworkPagesInput: 'admin-homework-pages',
        homeworkDueDateInput: 'admin-homework-due-date',
        homeworkTitleInput: 'admin-homework-title',
        homeworkTotalPagesInput: 'admin-homework-total-pages',

        // Report & Analysis
        reportClassSelect: 'admin-report-class-select',
        reportDateInput: 'admin-report-date',
        reportFilesInput: 'admin-report-files-input',
        uploadReportsBtn: 'admin-upload-reports-btn',
        reportUploadStatus: 'admin-report-upload-status',
        uploadedReportsList: 'admin-uploaded-reports-list',
        
        // Analysis Manager
        dailyTestClassSelect: 'admin-daily-test-class-select',
        dailyTestSubjectSelect: 'admin-daily-test-subject-select',
        dailyTestPagination: 'admin-daily-test-pagination',
        dailyTestPrevBtn: 'admin-daily-test-prev-btn',
        dailyTestNextBtn: 'admin-daily-test-next-btn',
        dailyTestPageInfo: 'admin-daily-test-page-info',
        dailyTestResultTable: 'admin-daily-test-result-table',
        
        // [추가됨] 주간테스트 매니저용 ID
        weeklyClassSelect: 'admin-weekly-test-class-select',
        weeklyResultTable: 'admin-weekly-test-result-table',
        weeklyPagination: 'admin-weekly-test-pagination',
        weeklyPrevBtn: 'admin-weekly-test-prev-btn',
        weeklyNextBtn: 'admin-weekly-test-next-btn',
        weeklyPageInfo: 'admin-weekly-test-page-info',
        addWeeklyTestBtn: 'admin-add-weekly-test-btn',
        weeklyModal: 'admin-weekly-test-modal',
        
        learningClassSelect: 'admin-learning-class-select',
        learningSubjectSelect: 'admin-learning-subject-select',
        learningLessonSelect: 'admin-learning-lesson-select',
        learningResultTable: 'admin-learning-result-table',
    },

    elements: {}, 
    state: adminState.data, 

    async init() {
        console.log("[AdminApp.init] 초기화 시작");
        if (this.isInitialized) return;

        this.cacheElements();
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
            }
        }
    },

    setupStoreBridges() {
        document.addEventListener(CLASS_EVENTS.UPDATED, () => {
            this.state.classes = getClasses();
            if (this.state.currentView === 'reportMgmt') adminReportManager.populateReportClassSelect();
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
        // 메뉴 버튼 연결 매핑
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
            "gotoWeeklyTestMgmtBtn": "weeklyTestMgmt", // [추가됨] 주간테스트 연결
            "gotoLearningStatusMgmtBtn": "learningStatusMgmt",
        };

        Object.entries(menuMapping).forEach(([btnKey, viewName]) => {
            const btn = this.elements[btnKey];
            if (btn) {
                btn.addEventListener("click", () => this.showView(viewName));
            }
        });

        document.querySelectorAll(".back-to-admin-dashboard-btn")
            .forEach((b) => b.addEventListener("click", () => this.showView("dashboard")));
    },

    initializeAppUI(loadData = true) {
        if (this.isInitialized) return;
        
        try {
            this.cacheElements();

            // 매니저 초기화
            studentManager.init(this);
            classManager.init(this);
            subjectManager.init(this);
            teacherManager.init(this);
            textbookManager.init(this);
            lessonManager.init(this);
            studentAssignmentManager.init(this);
            adminClassVideoManager.init(this);
            adminHomeworkDashboard.init(this);
            adminAnalysisManager.init(this);
            adminReportManager.init(this);

            this.isInitialized = true;
            console.log("[AdminApp] 모든 매니저 초기화 완료");

        } catch (e) {
            console.error("매니저 초기화 중 오류 발생", e);
        }
    },

    showView(viewName) {
        // 1. 모든 뷰 숨기기
        Object.keys(this.uiIds).forEach((key) => {
            if (key.endsWith("View")) {
                const id = this.uiIds[key];
                const el = document.getElementById(id);
                if (el) el.style.display = "none";
            }
        });

        // 2. 타겟 뷰 보이기
        const viewKey = `${viewName}View`;
        const targetViewId = this.uiIds[viewKey];
        const targetViewElement = document.getElementById(targetViewId);

        if (targetViewElement) {
            targetViewElement.style.display = "block";
            this.state.currentView = viewName;

            // 뷰별 초기화 로직 실행
            switch (viewName) {
                case "homeworkMgmt": adminHomeworkDashboard.initView?.(); break;
                case "qnaVideoMgmt": adminClassVideoManager.initQnaView?.(); break;
                case "classVideoMgmt": adminClassVideoManager.initLectureView?.(); break;
                case "reportMgmt": adminReportManager.initView?.(); break;
                case "studentAssignment": 
                    studentAssignmentManager.populateSelects?.(); 
                    studentAssignmentManager.resetView?.(); 
                    break;
                case "textbookMgmt": 
                    textbookManager.populateSubjectSelect?.(); 
                    const subSelect = this.elements.subjectSelectForTextbook;
                    textbookManager.handleSubjectSelectForTextbook?.(subSelect?.value || ''); 
                    break;
                case "lessonMgmt": 
                    lessonManager.populateSubjectSelect?.(); 
                    const mgmtSelect = this.elements.subjectSelectForMgmt;
                    lessonManager.handleSubjectSelectForLesson?.(mgmtSelect?.value || ''); 
                    break;
                case "dailyTestMgmt": 
                    adminAnalysisManager.initDailyTestView?.();
                    break;
                // [추가됨] 주간테스트 화면 진입 시 초기화
                case "weeklyTestMgmt": 
                    adminAnalysisManager.initWeeklyTestView?.();
                    break;
                case "learningStatusMgmt": 
                    adminAnalysisManager.initLearningStatusView?.();
                    break;
            }
        } else {
            // 기본값: 대시보드
            const dash = document.getElementById(this.uiIds.dashboardView);
            if(dash) dash.style.display = "block";
            this.state.currentView = "dashboard";
        }
    }
};

document.addEventListener("DOMContentLoaded", () => {
    AdminApp.init();
});