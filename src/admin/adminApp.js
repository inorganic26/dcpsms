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
        // --- init 로직 간소화: 익명 로그인 시도 후 무조건 로그인 화면 표시 ---
        if (this.isInitialized) return; // 중복 초기화 방지

        console.log("[AdminApp.init] Starting initialization...");
        this.cacheElements(); // 요소 캐싱
        this.addEventListeners(); // 이벤트 리스너 추가

        try {
            // 익명 로그인 시도 (성공 여부와 관계없이 로그인 화면으로 진행)
            await signInAnonymously(auth);
            console.log("[AdminApp.init] Anonymous sign-in attempt finished (success or cached).");
        } catch (error) {
            console.error("[AdminApp.init] Anonymous sign-in failed:", error);
            showToast("관리자 인증 초기화 실패. 새로고침하세요.", true);
            // 실패해도 UI 초기화 및 로그인 화면 표시는 진행
        }

        // UI 매니저 초기화 (데이터 로드 없이)
        this.initializeAppUI(false);
        // 무조건 로그인 화면 표시
        this.showLoginScreen();
        console.log("[AdminApp.init] Initialization complete, showing login screen.");
    },

    // UI 초기화 로직 분리
    initializeAppUI(loadData = true) {
        if (this.isInitialized && loadData === false) {
             console.log("[AdminApp] initializeAppUI called again minimally, skipping.");
             return; // 최소 초기화는 중복 방지
        }
        if (this.isInitialized && loadData === true && this.state.students.length > 0) {
            console.log("[AdminApp] initializeAppUI called for data load, but data seems loaded. Skipping.");
            return; // 데이터 로드도 이미 된 것 같으면 스킵
        }


        console.log(`[AdminApp] Initializing UI and Managers (loadData: ${loadData})...`);
        // Elements and listeners should already be cached/added by init

        // Initialize Managers
        if (!this.isInitialized) { // 매니저 초기화는 정말 딱 한 번만
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
                 console.log("[AdminApp] Managers initialized.");
                 this.isInitialized = true; // 매니저 초기화 완료 시 플래그 설정
             } catch (e) {
                 console.error("Error initializing admin modules:", e);
                 showToast("관리 모듈 초기화 중 오류 발생", true);
             }
        }


        // Load Firestore listeners only if full data loading is requested
        if (loadData) {
            console.log("[AdminApp] Loading initial Firestore data...");
            this.listenForStudents();
            this.listenForSubjects();
            this.listenForClasses();
        } else {
            console.log("[AdminApp] Skipping initial Firestore data loading.");
        }
    },


    showLoginScreen() {
        console.log("[AdminApp] Showing Login Screen.");
        if (this.elements.initialLogin) this.elements.initialLogin.style.display = 'flex';
        if (this.elements.mainDashboard) this.elements.mainDashboard.style.display = 'none';
        // Do not reset this.isInitialized here
    },

    async handleAdminLogin() {
        console.log("[AdminApp.handleAdminLogin] Login attempt...");
        const passwordInput = this.elements.secretPasswordInput;
        const password = passwordInput?.value;

        // 1. Check hardcoded password first
        if (password !== 'qkraudtls0626^^') { // 원래 비밀번호로 수정됨
            console.warn("[AdminApp.handleAdminLogin] Password incorrect.");
            showToast("비밀번호가 일치하지 않습니다.", true);
            if (passwordInput) passwordInput.value = '';
            return;
        }

        console.log("[AdminApp.handleAdminLogin] Password correct.");
        // 역할 확인 없이 비밀번호만 맞으면 바로 대시보드로 이동
        console.log("[AdminApp.handleAdminLogin] Proceeding without role check.");
        try {
            // UI 및 데이터 로드가 필요한지 확인하고 수행
            if (!this.isInitialized) {
                 console.warn("[AdminApp.handleAdminLogin] UI was not initialized before login success? Initializing now.");
                 this.initializeAppUI(true); // 완전 초기화
            } else if (this.state.students.length === 0) { // UI는 초기화되었지만 데이터 로드가 안된 경우
                 console.log("[AdminApp.handleAdminLogin] UI initialized, loading data now...");
                 this.initializeAppUI(true); // 데이터 로드만 수행
            }

            // 대시보드 표시
            this.showView('dashboard');
            if (passwordInput) passwordInput.value = ''; // 비밀번호 필드 지우기
            console.log("[AdminApp.handleAdminLogin] Login successful (password only), dashboard shown.");

        } catch (error) {
             console.error("[AdminApp.handleAdminLogin] Error during post-password UI initialization or view switching:", error);
             showToast("대시보드 로딩 중 오류 발생.", true);
             this.showLoginScreen(); // 문제 발생 시 로그인 화면으로 복귀
        }
    },


    cacheElements() {
        // 각 뷰 섹션 요소 ID를 캐싱 (ID 확인 필요)
        this.elements = {
            initialLogin: document.getElementById('admin-initial-login'),
            secretPasswordInput: document.getElementById('admin-secret-password'),
            secretLoginBtn: document.getElementById('admin-secret-login-btn'),
            mainDashboard: document.getElementById('admin-main-dashboard'),

            // --- 각 뷰 섹션 ---
            dashboardView: document.getElementById('admin-dashboard-view'),
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

            // --- 대시보드 버튼 ---
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

            // --- 기타 요소 (기존 코드 유지) ---
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
             closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
             cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
        };
        // 캐싱 후 요소 존재 여부 확인 로그 (디버깅 시 유용)
        Object.keys(this.elements).forEach(key => {
            if (!this.elements[key]) {
                console.warn(`[AdminApp.cacheElements] Element with key '${key}' not found in DOM.`);
            }
        });
        console.log("[AdminApp] Elements cached:", Object.keys(this.elements).length);
    },


    addEventListeners() {
        // --- This function remains unchanged ---
        // Login listeners
        this.elements.secretLoginBtn?.addEventListener('click', () => this.handleAdminLogin());
        this.elements.secretPasswordInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleAdminLogin();
        });

        // Dashboard navigation
        const dashboardButtons = [
            'gotoSubjectMgmtBtn', 'gotoTextbookMgmtBtn', 'gotoClassMgmtBtn',
            'gotoStudentMgmtBtn', 'gotoTeacherMgmtBtn', 'gotoStudentAssignmentBtn',
            'gotoLessonMgmtBtn', 'gotoQnaVideoMgmtBtn', 'gotoClassVideoMgmtBtn',
            'gotoHomeworkMgmtBtn', 'gotoReportMgmtBtn'
        ];
        dashboardButtons.forEach(btnId => {
            this.elements[btnId]?.addEventListener('click', () => {
                // 'goto-' 와 '-btn' 을 제거하여 viewName 생성 (예: 'subjectMgmt')
                const viewName = btnId.replace(/^goto-/, '').replace(/-btn$/, '');
                this.showView(viewName);
            });
        });


        // Back buttons in each view
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showView('dashboard'));
        });

        // Add Subject
        this.elements.addSubjectBtn?.addEventListener('click', () => subjectManager.addNewSubject());

        // Textbook Management
        this.elements.subjectSelectForTextbook?.addEventListener('change', (e) => textbookManager.handleSubjectSelectForTextbook(e.target.value));
        this.elements.addTextbookBtn?.addEventListener('click', () => textbookManager.addNewTextbook());

        // Class Management
        this.elements.addClassBtn?.addEventListener('click', () => classManager.addNewClass());

         // Student Management (Ensure these listeners point to studentManager methods)
        this.elements.addStudentBtn?.addEventListener('click', () => studentManager.addNewStudent());
        this.elements.studentsList?.addEventListener('click', (e) => {
            if (e.target.classList.contains('edit-student-btn') && e.target.dataset.id) {
                 studentManager.openEditStudentModal(e.target.dataset.id);
            } else if (e.target.classList.contains('delete-student-btn') && e.target.dataset.id) {
                studentManager.handleListClick(e); // Assuming handleListClick handles deletion confirmation
            }
        });
        this.elements.saveStudentEditBtn?.addEventListener('click', () => studentManager.saveStudentChanges());
         this.elements.closeEditStudentModalBtn?.addEventListener('click', () => studentManager.closeEditStudentModal());
         this.elements.cancelEditStudentBtn?.addEventListener('click', () => studentManager.closeEditStudentModal());


        // Teacher Management
        this.elements.addTeacherBtn?.addEventListener('click', () => teacherManager.addNewTeacher());
        this.elements.saveTeacherEditBtn?.addEventListener('click', () => teacherManager.saveTeacherChanges());
        this.elements.closeEditTeacherModalBtn?.addEventListener('click', () => teacherManager.closeEditTeacherModal());
        this.elements.cancelEditTeacherBtn?.addEventListener('click', () => teacherManager.closeEditTeacherModal());

        // Student Assignment
        this.elements.sourceClassSelect?.addEventListener('change', () => studentAssignmentManager.handleSourceClassChange());
        this.elements.targetClassSelect?.addEventListener('change', () => studentAssignmentManager.handleTargetClassChange());
        this.elements.studentSearchInputAssignment?.addEventListener('input', () => studentAssignmentManager.renderSourceStudentList());
        this.elements.assignStudentsBtn?.addEventListener('click', () => studentAssignmentManager.assignStudents());

         // Lesson Management (Ensure these listeners point to the correct lessonManager instance or methods)
         // Note: lessonManager itself is initialized later, these rely on that instance
         this.elements.subjectSelectForLesson?.addEventListener('change', (e) => {
            this.state.selectedSubjectIdForMgmt = e.target.value;
            lessonManager.managerInstance?.handleLessonFilterChange();
         });
         this.elements.showNewLessonModalBtn?.addEventListener('click', () => lessonManager.managerInstance?.openLessonModalForCreate());
         this.elements.closeLessonModalBtn?.addEventListener('click', () => lessonManager.managerInstance?.hideModal());
         this.elements.cancelLessonBtn?.addEventListener('click', () => lessonManager.managerInstance?.hideModal());
         this.elements.previewQuizBtn?.addEventListener('click', () => lessonManager.managerInstance?.handleJsonPreview());
         this.elements.saveLessonBtn?.addEventListener('click', () => lessonManager.managerInstance?.saveLesson());
         this.elements.saveLessonOrderBtn?.addEventListener('click', () => lessonManager.managerInstance?.saveLessonOrder());
         this.elements.addVideo1RevBtn?.addEventListener('click', () => lessonManager.managerInstance?.addRevUrlInput(1));
         this.elements.addVideo2RevBtn?.addEventListener('click', () => lessonManager.managerInstance?.addRevUrlInput(2));
         this.elements.lessonsList?.addEventListener('click', (e) => {
             const editBtn = e.target.closest('.edit-lesson-btn');
             const toggleBtn = e.target.closest('.toggle-active-btn');
             const deleteBtn = e.target.closest('.delete-btn');
             if (editBtn) lessonManager.managerInstance?.openLessonModalForEdit(editBtn.dataset.id);
             if (toggleBtn) lessonManager.managerInstance?.toggleLessonActive(toggleBtn.dataset.id, toggleBtn.dataset.active === 'true');
             if (deleteBtn) lessonManager.managerInstance?.deleteLesson(deleteBtn.dataset.id);
         });


        // Homework Management (listeners handled within adminHomeworkDashboard.init -> createHomeworkManager)

        // Report Management
        this.elements.reportClassSelect?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.reportFilesInput?.addEventListener('change', (e) => { /* Potentially update UI to show # files selected */ });
        this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload());
         this.elements.uploadedReportsList?.addEventListener('click', (e) => {
             const deleteBtn = e.target.closest('.delete-report-btn');
             if (deleteBtn && deleteBtn.dataset.path) {
                 this.handleDeleteReport(deleteBtn.dataset.path, deleteBtn.dataset.filename);
             }
             // View/Download handled directly via <a> tag in renderReportFileList if needed
         });


        // Class Editor Modal (listeners for save/close handled within classManager.init -> createClassEditor)

        console.log("[AdminApp] Event listeners added.");
    },


    // 👇 showView 함수 수정됨 (캐시된 요소 직접 사용)
    showView(viewName) {
        console.log(`[AdminApp] Showing view: ${viewName}`);
        if (!this.elements.mainDashboard) return;

        // 로그인 화면 숨기고 메인 대시보드 표시
        if (this.elements.initialLogin) this.elements.initialLogin.style.display = 'none';
        this.elements.mainDashboard.style.display = 'block';

        // 모든 뷰 섹션 숨기기 (캐시된 요소 사용)
        Object.keys(this.elements).forEach(key => {
            if (key.endsWith('View') && this.elements[key]) { // 'View'로 끝나는 캐시된 요소들
                this.elements[key].style.display = 'none';
            }
        });

        // 대상 뷰의 캐시 키 생성 (예: 'subjectMgmt') -> 'subjectMgmtView'
        const targetViewKey = `${viewName}View`;
        const targetElement = this.elements[targetViewKey];

        if (targetElement) {
            targetElement.style.display = 'block'; // 대상 뷰 표시
            this.state.currentView = viewName;

            // 뷰 전환 시 필요한 초기화 로직 수행
             switch (viewName) {
                 case 'textbookMgmt':
                     this.populateSubjectSelectForTextbookMgmt();
                     textbookManager.handleSubjectSelectForTextbook(this.elements.subjectSelectForTextbook?.value || '');
                     break;
                 case 'studentAssignment':
                     if (this.elements.sourceClassSelect && this.elements.sourceClassSelect.options.length <= 1) {
                         studentAssignmentManager.populateClassSelects();
                     }
                     studentAssignmentManager.resetView();
                     break;
                 case 'lessonMgmt':
                     this.populateSubjectSelectForLessonMgmt();
                     lessonManager.managerInstance?.handleLessonFilterChange();
                     break;
                 case 'homeworkMgmt':
                     adminHomeworkDashboard.initView();
                     break;
                 case 'reportMgmt':
                      this.populateReportClassSelect();
                      this.initReportUploadView();
                      this.loadAndRenderUploadedReports();
                      break;
                  case 'qnaVideoMgmt':
                     adminClassVideoManager.initQnaView();
                      break;
                  case 'classVideoMgmt':
                     adminClassVideoManager.initLectureView();
                      break;
                 // 다른 뷰 초기화 로직 필요시 추가
             }

        } else {
            console.error(`View element not found in cache for key: ${targetViewKey} (derived from viewName: ${viewName})`);
            // 대상 뷰 없으면 대시보드로 복귀
            if (this.elements.dashboardView) this.elements.dashboardView.style.display = 'block';
            this.state.currentView = 'dashboard';
        }
    },
    // 👆 showView 함수 수정됨


    // --- Firestore Listeners ---
    listenForStudents() {
        // --- This function remains unchanged ---
        console.log("[AdminApp] Setting up Firestore listener for students...");
        const q = query(collection(db, "students"), orderBy("name")); // Order by name
        onSnapshot(q, (snapshot) => {
            const students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.state.students = students;
            console.log(`[AdminApp] Students updated (${students.length} students)`);
            studentManager.renderStudentList(); // Update student management list
            // Optionally, dispatch an event if other modules need to react to student updates
             document.dispatchEvent(new CustomEvent('studentsLoaded'));
        }, (error) => {
            console.error("[AdminApp] Error listening for students:", error);
            showToast("학생 목록 실시간 업데이트 실패.", true);
        });
    },

    listenForSubjects() {
        // --- This function remains unchanged ---
        console.log("[AdminApp] Setting up Firestore listener for subjects...");
        const q = query(collection(db, "subjects"), orderBy("name")); // Order by name
        onSnapshot(q, (snapshot) => {
            const subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.state.subjects = subjects;
            console.log(`[AdminApp] Subjects updated (${subjects.length} subjects)`);
            subjectManager.renderList(); // Update subject management list
            this.populateSubjectSelectForTextbookMgmt(); // Update textbook management dropdown
            this.populateSubjectSelectForLessonMgmt(); // Update lesson management dropdown
            // Optionally, dispatch event
             document.dispatchEvent(new CustomEvent('subjectsUpdated'));
        }, (error) => {
            console.error("[AdminApp] Error listening for subjects:", error);
            showToast("과목 목록 실시간 업데이트 실패.", true);
        });
    },

    listenForClasses() {
        // --- This function remains unchanged ---
        console.log("[AdminApp] Setting up Firestore listener for classes...");
        const q = query(collection(db, "classes"), orderBy("name")); // Order by name
        onSnapshot(q, (snapshot) => {
            const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.state.classes = classes;
            console.log(`[AdminApp] Classes updated (${classes.length} classes)`);
            classManager.renderClassList(); // Update class management list
            // Update dropdowns in other views
            studentAssignmentManager.populateClassSelects();
            adminHomeworkDashboard.managerInstance?.populateClassSelect(); // Update homework dashboard dropdown
            this.populateReportClassSelect(); // Update report management dropdown
            adminClassVideoManager.managerInstance?.populateClassSelect(this.elements.qnaClassSelect?.id, 'selectedClassIdForQnaVideo');
             adminClassVideoManager.managerInstance?.populateClassSelect(this.elements.lectureClassSelect?.id, 'selectedClassIdForClassVideo');
            // Dispatch event for modules that depend on class list indirectly
            document.dispatchEvent(new CustomEvent('classesUpdated'));
        }, (error) => {
            console.error("[AdminApp] Error listening for classes:", error);
            showToast("반 목록 실시간 업데이트 실패.", true);
        });
    },

    // --- Dropdown Population ---
     populateSubjectSelectForTextbookMgmt() {
        // --- This function remains unchanged ---
         const select = this.elements.subjectSelectForTextbook;
         if (!select) return;
         const currentVal = select.value;
         select.innerHTML = '<option value="">-- 과목 선택 --</option>';
         this.state.subjects.forEach(sub => {
             select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
         });
         // Restore previous selection if possible
         if (this.state.subjects.some(s => s.id === currentVal)) {
             select.value = currentVal;
         } else {
             select.value = '';
             textbookManager.handleSubjectSelectForTextbook(''); // Reset textbook list if subject removed
         }
     },

    populateSubjectSelectForLessonMgmt() {
        // --- This function remains unchanged ---
        const select = this.elements.subjectSelectForLesson;
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
        // Restore previous selection if possible
         if (this.state.subjects.some(s => s.id === currentVal)) {
             select.value = currentVal;
             // Ensure lessonManager updates if needed
             if (this.state.currentView === 'lessonMgmt') {
                 lessonManager.managerInstance?.handleLessonFilterChange();
             }
         } else {
             select.value = '';
             if (this.state.currentView === 'lessonMgmt') {
                 lessonManager.managerInstance?.handleLessonFilterChange(); // Reset lesson list
             }
         }
    },

    populateReportClassSelect() {
        // --- This function remains unchanged ---
        const select = this.elements.reportClassSelect;
        if (!select) return;
         const currentVal = select.value;
        select.innerHTML = '<option value="">-- 반 선택 --</option>';
        this.state.classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
         // Restore previous selection if possible
         if (this.state.classes.some(c => c.id === currentVal)) {
             select.value = currentVal;
         } else {
             select.value = '';
             // Optionally trigger report list reload if view is active
             if(this.state.currentView === 'reportMgmt') {
                 this.loadAndRenderUploadedReports();
             }
         }
    },

    // --- Report Management Functions ---
     initReportUploadView() {
        // --- This function remains unchanged ---
         if (this.elements.reportDateInput) this.elements.reportDateInput.value = '';
         if (this.elements.reportFilesInput) this.elements.reportFilesInput.value = '';
         if (this.elements.reportUploadStatus) this.elements.reportUploadStatus.textContent = '';
         // Ensure class dropdown is populated but don't reset its selection here
         // this.populateReportClassSelect(); // Called by listenForClasses
         this.renderReportFileList([]); // Clear the list initially
     },

     async handleReportUpload() {
        // --- This function remains unchanged ---
         const dateInput = this.elements.reportDateInput;
         const classSelect = this.elements.reportClassSelect;
         const filesInput = this.elements.reportFilesInput;
         const statusEl = this.elements.reportUploadStatus;
         const uploadBtn = this.elements.uploadReportsBtn;

         if (!dateInput || !classSelect || !filesInput || !statusEl || !uploadBtn) {
             console.error("Report upload UI elements missing."); return;
         }

         const classId = classSelect.value;
         const testDateRaw = dateInput.value; // YYYY-MM-DD
         const files = filesInput.files;

         if (!classId || !testDateRaw || !files || files.length === 0) {
             showToast("반, 시험 날짜, 리포트 파일을 모두 선택해주세요."); return;
         }
         const testDate = testDateRaw.replace(/-/g, ''); // YYYYMMDD

         uploadBtn.disabled = true;
         statusEl.textContent = `파일 ${files.length}개 업로드 시작...`;
         let successCount = 0; let failCount = 0;
         const uploadPromises = Array.from(files).map(file =>
             reportManager.uploadReport(file, classId, testDate)
                 .then(success => {
                     if (success) successCount++; else failCount++;
                     statusEl.textContent = `업로드 중... (${successCount + failCount}/${files.length}, 성공: ${successCount}, 실패: ${failCount})`;
                 })
                 .catch(err => {
                     failCount++;
                     console.error("Upload promise error:", err);
                     statusEl.textContent = `업로드 중... (${successCount + failCount}/${files.length}, 성공: ${successCount}, 실패: ${failCount})`;
                 })
         );

         try {
             await Promise.all(uploadPromises);
             statusEl.textContent = `업로드 완료: 총 ${files.length}개 중 ${successCount}개 성공, ${failCount}개 실패.`;
             showToast(`리포트 업로드 완료 (성공: ${successCount}, 실패: ${failCount})`, failCount > 0);
             filesInput.value = '';
             await this.loadAndRenderUploadedReports(); // Refresh the list
         } catch (error) { /* Errors handled in individual promises */ }
         finally { uploadBtn.disabled = false; }
     },

     async loadAndRenderUploadedReports() {
        // --- This function remains unchanged ---
         const dateInput = this.elements.reportDateInput;
         const classSelect = this.elements.reportClassSelect;
         const listContainer = this.elements.uploadedReportsList;

         if (!dateInput || !classSelect || !listContainer) return;

         const classId = classSelect.value;
         const testDateRaw = dateInput.value;

         if (!classId || !testDateRaw) {
             this.renderReportFileList([]); // Clear list if class or date is missing
             return;
         }
         const testDate = testDateRaw.replace(/-/g, '');
         listContainer.innerHTML = '<p class="text-sm text-slate-400">파일 목록 로딩 중...</p>';

         try {
             const reports = await reportManager.listReportsForDateAndClass(classId, testDate);
              // Transform report objects to include storagePath for deletion
              const reportsWithPaths = reports.map(r => ({
                  ...r,
                  storagePath: `reports/${classId}/${testDate}/${r.fileName}` // Assuming folder structure
              }));
             this.renderReportFileList(reportsWithPaths);
         } catch (error) {
             console.error("Error loading reports:", error);
             listContainer.innerHTML = '<p class="text-sm text-red-500">파일 목록 로딩 실패</p>';
             showToast("리포트 목록 로딩 실패", true);
         }
     },

    renderReportFileList(reports) {
        // --- This function remains unchanged ---
        const listContainer = this.elements.uploadedReportsList;
        if (!listContainer) return;
        listContainer.innerHTML = ''; // Clear previous list

        if (!reports || reports.length === 0) {
            listContainer.innerHTML = '<p class="text-sm text-slate-400 mt-4">해당 날짜/반에 업로드된 리포트가 없습니다.</p>';
            return;
        }

        const listTitle = document.createElement('h3');
        listTitle.className = 'text-lg font-semibold text-slate-700 mb-2 mt-6 border-t pt-4';
        listTitle.textContent = `업로드된 리포트 (${reports.length}개)`;
        listContainer.appendChild(listTitle);

        const ul = document.createElement('ul');
        ul.className = 'space-y-2';
        reports.forEach(report => {
            const li = document.createElement('li');
            li.className = 'p-2 border rounded-md flex justify-between items-center text-sm bg-white';
            // Use <a> for download/view, button for delete
            li.innerHTML = `
                <span class="truncate mr-2">${report.fileName}</span>
                <div class="flex-shrink-0 flex gap-2">
                    ${report.url ? `<a href="${report.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 text-xs font-bold">보기/다운로드</a>` : '<span class="text-xs text-slate-400">URL 없음</span>'}
                    <button class="delete-report-btn text-red-500 hover:text-red-700 text-xs font-bold" data-path="${report.storagePath}" data-filename="${report.fileName}">삭제</button>
                </div>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    },


     async handleDeleteReport(storagePath, fileName) {
        // --- This function remains unchanged ---
         if (!storagePath) { showToast("삭제할 파일 경로 정보가 없습니다.", true); return; }
         if (confirm(`'${fileName}' 리포트 파일을 정말 삭제하시겠습니까?`)) {
             const success = await reportManager.deleteReport(storagePath);
             if (success) {
                 showToast("리포트 삭제 완료.", false);
                 await this.loadAndRenderUploadedReports(); // Refresh list
             } else {
                 showToast("리포트 삭제 실패.", true);
             }
         }
     },
};

// Initialize the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log("[AdminApp] DOMContentLoaded. Initializing AdminApp...");
    AdminApp.init();
});