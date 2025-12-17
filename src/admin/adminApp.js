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
import { reportManager } from "../shared/reportManager.js";
import { adminAnalysisManager } from "./adminAnalysisManager.js"; 

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
        
        this.setupStoreBridges();

        console.log("[AdminApp.init] 기본 초기화 완료");
    },

    setupStoreBridges() {
        document.addEventListener(CLASS_EVENTS.UPDATED, () => {
            this.state.classes = getClasses();
            if (this.state.currentView === 'reportMgmt') this.populateReportClassSelect();
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

    cacheElements() {
        this.elements = {
            initialLogin: document.getElementById("admin-initial-login"),
            secretPasswordInput: document.getElementById("admin-secret-password"),
            secretLoginBtn: document.getElementById("admin-secret-login-btn"),
            mainDashboard: document.getElementById("admin-main-dashboard"),
            dashboardView: document.getElementById("admin-dashboard-view"),
            
            // Views
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
            dailyTestMgmtView: document.getElementById("admin-daily-test-mgmt-view"),
            learningStatusMgmtView: document.getElementById("admin-learning-status-mgmt-view"),

            // Menu Buttons
            gotoSubjectMgmtBtn: document.getElementById("goto-subject-mgmt-btn"),
            gotoTextbookMgmtBtn: document.getElementById("goto-textbook-mgmt-btn"),
            gotoClassMgmtBtn: document.getElementById("goto-class-mgmt-btn"),
            gotoStudentMgmtBtn: document.getElementById("goto-student-mgmt-btn"),
            gotoTeacherMgmtBtn: document.getElementById("goto-teacher-mgmt-btn"),
            gotoStudentAssignmentBtn: document.getElementById("goto-student-assignment-btn"),
            gotoLessonMgmtBtn: document.getElementById("goto-lesson-mgmt-btn"),
            gotoQnaVideoMgmtBtn: document.getElementById("goto-qna-video-mgmt-btn"),
            gotoClassVideoMgmtBtn: document.getElementById("goto-class-video-mgmt-btn"),
            gotoHomeworkMgmtBtn: document.getElementById("goto-homework-mgmt-btn"),
            gotoReportMgmtBtn: document.getElementById("goto-report-mgmt-btn"),
            gotoDailyTestMgmtBtn: document.getElementById("goto-daily-test-mgmt-btn"),
            gotoLearningStatusMgmtBtn: document.getElementById("goto-learning-status-mgmt-btn"),

            // ... (기존 요소 매핑 유지) ...
            // Subject & Textbook
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),

            // Class
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('admin-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('admin-edit-class-type'),

            // Student
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPhoneInput: document.getElementById('admin-new-student-phone'),
            newParentPhoneInput: document.getElementById('admin-new-parent-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),
            editStudentModal: document.getElementById('admin-edit-student-modal'),
            editStudentNameInput: document.getElementById('admin-edit-student-name'),
            editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
            editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),
            closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
            cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
            saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),

            // Teacher
            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),
            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),

            // Lesson
            subjectSelectForMgmt: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('admin-show-new-lesson-modal-btn'),
            modal: document.getElementById('admin-new-lesson-modal'),
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            closeModalBtn: document.getElementById('admin-close-modal-btn'),
            cancelBtn: document.getElementById('admin-cancel-btn'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'),
            addVideo1RevBtn: document.getElementById('admin-add-video1-rev-btn'),
            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'),
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),

            // Videos
            qnaVideoDateInput: document.getElementById('admin-qna-video-date'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoTitleInput: document.getElementById('admin-qna-video-title'),
            qnaVideoUrlInput: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            qnaVideosList: document.getElementById('admin-qna-videos-list'),
            lectureVideoDateInput: document.getElementById('admin-class-video-date'),
            lectureClassSelect: document.getElementById('admin-class-video-class-select'),
            lectureVideoListContainer: document.getElementById('admin-class-video-list-container'),
            addLectureVideoFieldBtn: document.getElementById('admin-add-class-video-field-btn'),
            saveLectureVideoBtn: document.getElementById('admin-save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('admin-class-video-title'),
            lectureVideoUrlInput: document.getElementById('admin-class-video-url'),

            // Homework
            homeworkClassSelect: document.getElementById('admin-homework-class-select'),
            homeworkMainContent: document.getElementById('admin-homework-main-content'),
            homeworkSelect: document.getElementById('admin-homework-select'),
            assignHomeworkBtn: document.getElementById('admin-assign-homework-btn'),
            homeworkManagementButtons: document.getElementById('admin-homework-management-buttons'),
            editHomeworkBtn: document.getElementById('admin-edit-homework-btn'),
            deleteHomeworkBtn: document.getElementById('admin-delete-homework-btn'),
            homeworkContent: document.getElementById('admin-homework-content'),
            selectedHomeworkTitle: document.getElementById('admin-selected-homework-title'),
            homeworkTableBody: document.getElementById('admin-homework-table-body'),
            assignHomeworkModal: document.getElementById('admin-assign-homework-modal'),
            homeworkModalTitle: document.getElementById('admin-homework-modal-title'),
            closeHomeworkModalBtn: document.getElementById('admin-close-homework-modal-btn'),
            cancelHomeworkBtn: document.getElementById('admin-cancel-homework-btn'),
            saveHomeworkBtn: document.getElementById('admin-save-homework-btn'),
            homeworkSubjectSelect: document.getElementById('admin-homework-subject-select'),
            homeworkTextbookSelect: document.getElementById('admin-homework-textbook-select'),
            homeworkPagesInput: document.getElementById('admin-homework-pages'),
            homeworkDueDateInput: document.getElementById('admin-homework-due-date'),
            homeworkTitleInput: document.getElementById('admin-homework-title'),

            // Report
            reportClassSelect: document.getElementById('admin-report-class-select'),
            reportDateInput: document.getElementById('admin-report-date'),
            reportFilesInput: document.getElementById('admin-report-files-input'),
            uploadReportsBtn: document.getElementById('admin-upload-reports-btn'),
            reportUploadStatus: document.getElementById('admin-report-upload-status'),
            uploadedReportsList: document.getElementById('admin-uploaded-reports-list'),
        };
    },

    addEventListeners() {
        this.elements.secretLoginBtn?.addEventListener("click", () => this.handleAdminLogin());
        this.elements.secretPasswordInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.handleAdminLogin();
        });

        const menuButtons = [
            { key: "gotoSubjectMgmtBtn", view: "subjectMgmt" },
            { key: "gotoTextbookMgmtBtn", view: "textbookMgmt" },
            { key: "gotoClassMgmtBtn", view: "classMgmt" },
            { key: "gotoStudentMgmtBtn", view: "studentMgmt" },
            { key: "gotoTeacherMgmtBtn", view: "teacherMgmt" },
            { key: "gotoStudentAssignmentBtn", view: "studentAssignment" },
            { key: "gotoLessonMgmtBtn", view: "lessonMgmt" },
            { key: "gotoQnaVideoMgmtBtn", view: "qnaVideoMgmt" },
            { key: "gotoClassVideoMgmtBtn", view: "classVideoMgmt" },
            { key: "gotoHomeworkMgmtBtn", view: "homeworkMgmt" },
            { key: "gotoReportMgmtBtn", view: "reportMgmt" },
            { key: "gotoDailyTestMgmtBtn", view: "dailyTestMgmt" }, 
            { key: "gotoLearningStatusMgmtBtn", view: "learningStatusMgmt" },
        ];

        menuButtons.forEach(({ key, view }) => {
            const buttonElement = this.elements[key];
            if (buttonElement) {
                buttonElement.addEventListener("click", () => this.showView(view));
            }
        });

        document.querySelectorAll(".back-to-admin-dashboard-btn")
            .forEach((b) => b.addEventListener("click", () => this.showView("dashboard")));

        this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload());
        this.elements.reportClassSelect?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());
    },

    showLoginScreen() {
        this.elements.initialLogin?.style.setProperty("display", "flex");
        this.elements.mainDashboard?.style.setProperty("display", "none");
    },

    async handleAdminLogin() {
        const password = this.elements.secretPasswordInput?.value || "";
        if (!password) { showToast("비밀번호 입력 필요", true); return; }
        showToast("로그인 중...", false);

        try {
            if (!auth.currentUser) await signInAnonymously(auth);
            
            const functions = getFunctions(app, 'asia-northeast3');
            const verifyPassword = httpsCallable(functions, 'verifyAdminPassword');
            
            await verifyPassword({ password });
            await auth.currentUser.getIdToken(true);

            showToast("관리자 로그인 성공", false);
            this.elements.initialLogin.style.display = "none";
            this.elements.mainDashboard.style.display = "block";

            setTimeout(() => {
                if (!this.isInitialized) this.initializeAppUI(true);
                this.showView("dashboard");
            }, 50);
        } catch (e) {
            console.error(e);
            showToast("로그인 실패: 비밀번호 확인 필요", true);
        }
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
            adminClassVideoManager.init(this);
            adminHomeworkDashboard.init(this);
            adminAnalysisManager.init(this);

            this.isInitialized = true;
        } catch (e) {
            console.error("초기화 오류", e);
        }
    },

    showView(viewName) {
        if (!this.elements.mainDashboard) return;
        Object.keys(this.elements).forEach((key) => {
            if (key.endsWith("View") && this.elements[key]) this.elements[key].style.display = "none";
        });

        const viewElementKey = `${viewName}View`;
        const targetViewElement = this.elements[viewElementKey];

        if (targetViewElement) {
            targetViewElement.style.display = "block";
            this.state.currentView = viewName;

            switch (viewName) {
                case "homeworkMgmt": adminHomeworkDashboard.initView?.(); break;
                case "qnaVideoMgmt": adminClassVideoManager.initQnaView?.(); break;
                case "classVideoMgmt": adminClassVideoManager.initLectureView?.(); break;
                case "reportMgmt": 
                    this.populateReportClassSelect(); 
                    this.loadAndRenderUploadedReports(); 
                    break;
                case "studentAssignment": 
                    studentAssignmentManager.populateSelects?.(); 
                    studentAssignmentManager.resetView?.(); 
                    break;
                case "textbookMgmt": 
                    textbookManager.populateSubjectSelect?.(); 
                    textbookManager.handleSubjectSelectForTextbook?.(this.elements.subjectSelectForTextbook.value || ''); 
                    break;
                case "lessonMgmt": 
                    lessonManager.populateSubjectSelect?.(); 
                    lessonManager.handleSubjectSelectForLesson?.(this.elements.subjectSelectForMgmt.value || ''); 
                    break;
                case "dailyTestMgmt": 
                    adminAnalysisManager.initDailyTestView?.();
                    break;
                case "learningStatusMgmt": 
                    adminAnalysisManager.initLearningStatusView?.();
                    break;
            }
        } else {
            this.elements.dashboardView.style.display = "block";
            this.state.currentView = "dashboard";
        }
    },

    populateReportClassSelect() {
        const sel = this.elements.reportClassSelect;
        if (!sel) return;
        
        const classes = this.state.classes; 
        const currentSelection = sel.value;
        
        sel.innerHTML = '<option value="">-- 반 선택 --</option>';
        if (!classes || classes.length === 0) {
            sel.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
            return;
        }
        
        classes.forEach((c) =>
            sel.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`)
        );
        if (classes.some(c => c.id === currentSelection)) {
            sel.value = currentSelection;
        }
    },
    
    async handleReportUpload() {
        const dateInput = this.elements.reportDateInput;
        const filesInput = this.elements.reportFilesInput;
        const statusEl = this.elements.reportUploadStatus;
        const uploadBtn = this.elements.uploadReportsBtn;

        if (!dateInput || !filesInput || !statusEl || !uploadBtn) return;

        const classId = this.elements.reportClassSelect?.value;
        const testDateRaw = dateInput.value;
        const files = filesInput.files;

        if (!classId) { showToast("반 선택 필요"); return; }
        if (!testDateRaw || !files.length) { showToast("날짜/파일 선택 필요"); return; }

        const testDate = testDateRaw.replace(/-/g, '');
        uploadBtn.disabled = true;
        statusEl.innerHTML = `<span class="text-blue-600">업로드 중...</span>`;

        const uploadPromises = [];
        for (const file of files) {
            uploadPromises.push(
                reportManager.uploadReport(file, classId, testDate)
            );
        }

        try {
            await Promise.all(uploadPromises);
            statusEl.innerHTML = `<span class="text-green-600">완료</span>`;
            showToast(`업로드 완료`, false);
            filesInput.value = '';
            await this.loadAndRenderUploadedReports();
        } catch (error) {
            console.error(error);
            statusEl.innerHTML = `<span class="text-red-600">오류 발생</span>`;
            showToast("업로드 오류", true);
        } finally {
            uploadBtn.disabled = false;
        }
    },

    async loadAndRenderUploadedReports() {
        const cls = this.elements.reportClassSelect?.value;
        const date = this.elements.reportDateInput?.value;
        const list = this.elements.uploadedReportsList;

        if (!cls || !date || !list) return;

        list.innerHTML = 'Loading...';
        try {
            const yyyymmdd = date.replace(/-/g, "");
            const reports = await reportManager.listReportsForDateAndClass(cls, yyyymmdd);
            
            list.innerHTML = "";
            if (!reports.length) { list.innerHTML = "없음"; return; }

            const ul = document.createElement("ul");
            ul.className = 'space-y-2 mt-2';
            reports.forEach(r => {
                const li = document.createElement("li");
                li.className = "flex justify-between border p-2 rounded text-sm";
                li.innerHTML = `<span>${r.fileName}</span> 
                    <div class="flex gap-2">
                        <a href="${r.url}" target="_blank" class="text-blue-500 font-bold">보기</a>
                        <button class="text-red-500 font-bold del-btn">삭제</button>
                    </div>`;
                
                li.querySelector('.del-btn').addEventListener('click', async () => {
                    if(confirm('삭제?')) {
                        const path = `reports/${cls}/${yyyymmdd}/${r.fileName}`;
                        await this.tryDeleteReport(cls, date, r.fileName, path);
                        this.loadAndRenderUploadedReports();
                    }
                });
                ul.appendChild(li);
            });
            list.appendChild(ul);
        } catch (e) {
            list.innerHTML = "로딩 실패";
        }
    },

    async tryDeleteReport(classId, dateStr, fileName, primaryPath) {
        let success = await reportManager.deleteReport(primaryPath);
        if (!success) {
             const rootPath = `reports/${classId}/${fileName}`;
             success = await reportManager.deleteReport(rootPath);
        }
        showToast(success ? "삭제됨" : "삭제 실패", !success);
        return success;
    }
};

document.addEventListener("DOMContentLoaded", () => {
    console.log("[AdminApp] Start");
    AdminApp.init();
});