// src/admin/adminApp.js
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore"; // Firestore import 추가
import { db, auth } from "../shared/firebase.js"; // auth도 import
import { showToast } from "../shared/utils.js";

// 모든 관리 모듈 import
import { teacherManager } from "./teacherManager.js";
import { studentManager } from "./studentManager.js";
import { subjectManager } from "./subjectManager.js";
import { textbookManager } from "./textbookManager.js";
import { classManager } from "./classManager.js";
import { studentAssignmentManager } from "./studentAssignmentManager.js";
import { lessonManager } from "./lessonManager.js";
import { adminClassVideoManager } from './adminClassVideoManager.js';
import { adminHomeworkDashboard } from './adminHomeworkDashboard.js';
import { reportManager } from '../shared/reportManager.js';

export const AdminApp = {
    isInitialized: false,
    elements: {},
    state: {
        currentView: 'dashboard',
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
        if (this.isInitialized) return;

        // 1. 익명 로그인 시도 및 상태 확인
        try {
            const userCredential = await signInAnonymously(auth);
            console.log("[AdminApp] Anonymous sign-in successful. UID:", userCredential.user.uid);

            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    try {
                        // 중요: 토큰 강제 갱신 (최신 클레임 반영 위해)
                        const idTokenResult = await user.getIdTokenResult(true);
                        console.log("[AdminApp] Auth state check. Claims:", idTokenResult.claims); // 클레임 확인 로그
                        if (idTokenResult.claims.role !== 'admin') {
                             console.warn("[AdminApp] Current user lacks 'admin' role. Showing login screen.");
                             this.showLoginScreen();
                        } else {
                            console.log("[AdminApp] Admin role confirmed."); // 역할 확인 로그
                            // admin 역할 있을 때만 초기화 진행
                            if (!this.isInitialized) {
                                this.initializeAppUI();
                            } else {
                                // 이미 초기화되었다면 대시보드가 보여야 함
                                this.showView('dashboard');
                            }
                        }
                    } catch (tokenError) {
                        console.error("[AdminApp] Error refreshing ID token:", tokenError);
                        this.showLoginScreen();
                    }
                } else {
                    console.log("[AdminApp] Auth state changed: User is signed out.");
                    this.showLoginScreen();
                }
            });

        } catch (error) {
            console.error("[AdminApp] Anonymous sign-in failed:", error);
            showToast("관리자 인증에 실패했습니다. 페이지를 새로고침하거나 관리자에게 문의하세요.", true);
            this.showLoginScreen();
            return;
        }
    },

    // UI 초기화 로직 분리
    initializeAppUI() {
        if (this.isInitialized) {
            console.log("[AdminApp] initializeAppUI called but already initialized. Skipping.");
            return;
        }
        this.isInitialized = true;
        console.log("[AdminApp] Initializing UI and Managers...");
        this.cacheElements();
        this.addEventListeners();

        this.listenForStudents();
        this.listenForSubjects();
        this.listenForClasses();

        try {
            teacherManager.init(this);
            studentManager.init(this);
            subjectManager.init(this);
            textbookManager.init(this);
            classManager.init(this);
            studentAssignmentManager.init(this);
            lessonManager.init(this);
            adminClassVideoManager.init(this);
            adminHomeworkDashboard.init(this);
            // reportManager는 정적 메소드 위주라 init 불필요

            // 초기 화면 설정은 onAuthStateChanged에서 역할 확인 후 처리
            console.log("[AdminApp] Managers initialized. Waiting for role confirmation to show dashboard.");


        } catch (e) {
            console.error("Error initializing admin modules:", e);
            showToast("관리 모듈 초기화 중 오류 발생", true);
        }
    },

    showLoginScreen() {
        console.log("[AdminApp] Showing Login Screen.");
        if (this.elements.initialLogin) this.elements.initialLogin.style.display = 'flex';
        if (this.elements.mainDashboard) this.elements.mainDashboard.style.display = 'none';
        this.isInitialized = false;
    },

    async handleAdminLogin() {
        console.log("[AdminApp.handleAdminLogin] Login button clicked or Enter pressed.");
        const passwordInput = this.elements.secretPasswordInput;
        const password = passwordInput?.value;

        console.log(`[AdminApp.handleAdminLogin] Password entered: '${password}' (checking against 'testtest')`);

        if (password === 'testtest') {
             const user = auth.currentUser;
             if (user) {
                 try {
                     console.log("[AdminApp.handleAdminLogin] Password matches. Refreshing token to check claims...");
                     // 중요: 토큰 강제 갱신 (최신 클레임 즉시 반영 위해)
                     const idTokenResult = await user.getIdTokenResult(true);
                     console.log("[AdminApp.handleAdminLogin] Token refreshed. Claims:", idTokenResult.claims);
                     if (idTokenResult.claims.role === 'admin') {
                         console.log("[AdminApp.handleAdminLogin] Admin role confirmed. Initializing/Showing dashboard...");
                         if (!this.isInitialized) {
                             this.initializeAppUI(); // 아직 초기화 안됐으면 초기화
                         }
                         // 역할 확인 후 바로 대시보드 표시 (onAuthStateChanged 기다리지 않음)
                         this.showView('dashboard');
                         if (passwordInput) passwordInput.value = '';
                     } else {
                         console.warn("[AdminApp.handleAdminLogin] Password correct, but 'admin' role missing.");
                         showToast("관리자 권한이 없습니다.", true);
                     }
                 } catch (error) {
                     console.error("[AdminApp.handleAdminLogin] Error checking admin role via token:", error);
                     showToast("권한 확인 중 오류 발생.", true);
                 }
             } else {
                 console.warn("[AdminApp.handleAdminLogin] Password correct, but no current user found.");
                 showToast("인증되지 않은 사용자입니다. 새로고침 후 다시 시도하세요.", true);
             }
        } else {
             console.warn("[AdminApp.handleAdminLogin] Password incorrect.");
             showToast("비밀번호가 일치하지 않습니다.", true);
             if (passwordInput) passwordInput.value = '';
        }
    },

    cacheElements() {
        this.elements = {
            initialLogin: document.getElementById('admin-initial-login'),
            secretPasswordInput: document.getElementById('admin-secret-password'),
            secretLoginBtn: document.getElementById('admin-secret-login-btn'),
            mainDashboard: document.getElementById('admin-main-dashboard'),
            dashboardView: document.getElementById('admin-dashboard-view'),
            gotoSubjectMgmtBtn: document.getElementById('goto-subject-mgmt-btn'),
            gotoTextbookMgmtBtn: document.getElementById('goto-textbook-mgmt-btn'),
            gotoClassMgmtBtn: document.getElementById('goto-class-mgmt-btn'),
            gotoStudentMgmtBtn: document.getElementById('goto-student-mgmt-btn'),
            gotoTeacherMgmtBtn: document.getElementById('goto-teacher-mgmt-btn'),
            gotoStudentAssignmentBtn: document.getElementById('goto-student-assignment-btn'),
            gotoLessonMgmtBtn: document.getElementById('goto-lesson-mgmt-btn'),
            gotoQnaVideoMgmtBtn: document.getElementById('goto-qna-video-mgmt-btn'),
            gotoClassVideoMgmtBtn: document.getElementById('goto-class-video-mgmt-btn'),
            gotoHomeworkMgmtBtn: document.getElementById('goto-homework-mgmt-btn'),
            gotoReportMgmtBtn: document.getElementById('goto-report-mgmt-btn'),
            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            teacherMgmtView: document.getElementById('admin-teacher-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            qnaVideoMgmtView: document.getElementById('admin-qna-video-mgmt-view'),
            classVideoMgmtView: document.getElementById('admin-class-video-mgmt-view'),
            homeworkMgmtView: document.getElementById('admin-homework-mgmt-view'),
            reportMgmtView: document.getElementById('admin-report-mgmt-view'),
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPhoneInput: document.getElementById('admin-new-student-phone'),
            newParentPhoneInput: document.getElementById('admin-new-parent-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),
            editStudentModal: document.getElementById('admin-edit-student-modal'),
            editStudentNameInput: document.getElementById('admin-edit-student-name'),
            editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
            editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),
            saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),
            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherEmailInput: document.getElementById('admin-new-teacher-email'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),
            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherEmailInput: document.getElementById('admin-edit-teacher-email'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),
            sourceClassSelect: document.getElementById("admin-source-class-select"),
            studentSearchInputAssignment: document.getElementById("admin-student-search-input-assignment"),
            sourceStudentList: document.getElementById("admin-source-student-list"),
            targetClassSelect: document.getElementById("admin-target-class-select"),
            targetStudentList: document.getElementById("admin-target-student-list"),
            assignStudentsBtn: document.getElementById("admin-assign-students-btn"),
            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveLessonOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('admin-show-new-lesson-modal-btn'),
            lessonModal: document.getElementById('admin-new-lesson-modal'),
            lessonModalTitle: document.getElementById('admin-lesson-modal-title'),
            closeLessonModalBtn: document.getElementById('admin-close-modal-btn'),
            cancelLessonBtn: document.getElementById('admin-cancel-btn'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'),
            video2Url: document.getElementById('admin-video2-url'),
            addVideo1RevBtn: document.getElementById('admin-add-video1-rev-btn'),
            addVideo2RevBtn: document.getElementById('admin-add-video2-rev-btn'),
            video1RevUrlsContainer: document.getElementById('admin-video1-rev-urls-container'),
            video2RevUrlsContainer: document.getElementById('admin-video2-rev-urls-container'),
            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'),
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),
            qnaVideoDateInput: document.getElementById('admin-qna-video-date'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoTitleInput: document.getElementById('admin-qna-video-title'),
            qnaVideoUrlInput: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            qnaVideosList: document.getElementById('admin-qna-videos-list'),
            lectureVideoDateInput: document.getElementById('admin-class-video-date'),
            lectureClassSelect: document.getElementById('admin-class-video-class-select'),
            lectureVideoListContainer: document.getElementById('admin-class-video-list-container'),
            saveLectureVideoBtn: document.getElementById('admin-save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('admin-class-video-title'),
            lectureVideoUrlInput: document.getElementById('admin-class-video-url'),
            homeworkClassSelect: document.getElementById('admin-homework-class-select'),
            homeworkMainContent: document.getElementById('admin-homework-main-content'),
            assignHomeworkBtn: document.getElementById('admin-assign-homework-btn'),
            homeworkSelect: document.getElementById('admin-homework-select'),
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
            reportDateInput: document.getElementById('admin-report-date'),
            reportClassSelect: document.getElementById('admin-report-class-select'),
            reportFilesInput: document.getElementById('admin-report-files-input'),
            uploadReportsBtn: document.getElementById('admin-upload-reports-btn'),
            reportUploadStatus: document.getElementById('admin-report-upload-status'),
            uploadedReportsList: document.getElementById('admin-uploaded-reports-list'),
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('admin-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('admin-edit-class-type'),
        };
        console.log("[AdminApp] Elements cached:", Object.keys(this.elements).length);
    },

    addEventListeners() { /* ... 이전 코드와 동일 ... */ },
    showView(viewName) { /* ... 이전 코드와 동일 ... */ },
    listenForStudents() { /* ... 이전 코드와 동일 ... */ },
    listenForSubjects() { /* ... 이전 코드와 동일 ... */ },
    listenForClasses() { /* ... 이전 코드와 동일 ... */ },
    populateSubjectSelectForLessonMgmt() { /* ... 이전 코드와 동일 ... */ },
    populateReportClassSelect() { /* ... 이전 코드와 동일 ... */ },
    initReportUploadView() { /* ... 이전 코드와 동일 ... */ },
    handleReportUpload() { /* ... 이전 코드와 동일 ... */ },
    async loadAndRenderUploadedReports() { /* ... 이전 코드와 동일 ... */ },
    renderReportFileList(reports) { /* ... 이전 코드와 동일 ... */ },
    async handleDeleteReport(storagePath, fileName) { /* ... 이전 코드와 동일 ... */ },
};

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});