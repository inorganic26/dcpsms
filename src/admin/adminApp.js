// src/admin/adminApp.js

import { auth, onAuthStateChanged, signInAnonymously, db } from '../shared/firebase.js';
// Firestore 모듈 추가
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, query, getDocs, where, writeBatch, setDoc, orderBy } from "firebase/firestore"; // orderBy 추가
import { showToast } from '../shared/utils.js';

// 기존 관리자 모듈 import
import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
import { teacherManager } from './teacherManager.js';
import { lessonManager } from './lessonManager.js';
import { studentAssignmentManager } from './studentAssignmentManager.js';
// ======[ 공통 숙제 관리 모듈 import ]======
import { adminHomeworkDashboard } from './adminHomeworkDashboard.js';
// ===================================
// ======[ 비디오 관리 래퍼 모듈 import ]======
import { adminClassVideoManager } from './adminClassVideoManager.js'; // 새로 추가
// ===================================


const AdminApp = {
    isInitialized: false,
    elements: {},
    state: {
        subjects: [],
        classes: [], // 반 목록 데이터 저장
        students: [], // 전체 학생 목록 (숙제 현황에서 사용될 수 있음)
        studentsInClass: new Map(), // 특정 반 학생 목록 (숙제 현황에서 사용)
        teachers: [],
        lessons: [],
        editingClass: null,
        selectedSubjectIdForLesson: null,
        editingLesson: null,
        generatedQuiz: null,
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
        // ======[ 비디오 관련 상태: 공통 모듈로 이동 ]======
        editingQnaVideoId: null, // adminClassVideoManager 내부 editingQnaVideoId 사용 (공통 모듈에서 접근)
        // ===================================
        // ======[ 숙제 관련 상태 추가 ]======
        selectedClassIdForHomework: null, // 숙제 관리용 반 ID
        selectedHomeworkId: null,       // 현재 선택된 숙제 ID
        editingHomeworkId: null,        // 수정 중인 숙제 ID
        textbooksBySubject: {}, // 공통 숙제 관리 모듈을 위한 교재 캐시
        // ===================================
    },

    init() {
        // ... (init 내용은 변경 없음) ...
        const initialLogin = document.getElementById('admin-initial-login');
        const mainDashboard = document.getElementById('admin-main-dashboard');
        if (initialLogin) initialLogin.style.display = 'flex';
        if (mainDashboard) mainDashboard.style.display = 'none';

        const secretLoginBtn = document.getElementById('admin-secret-login-btn');
        secretLoginBtn?.addEventListener('click', this.handleSecretLogin.bind(this));

        const passwordInput = document.getElementById('admin-secret-password');
        passwordInput?.addEventListener('keyup', (e) => {
             if (e.key === 'Enter') {
                 this.handleSecretLogin();
             }
        });
    },

    async handleSecretLogin() {
        // ... (handleSecretLogin 내용은 변경 없음) ...
        const inputPasswordEl = document.getElementById('admin-secret-password');
        if (!inputPasswordEl) return;
        const inputPassword = inputPasswordEl.value;

        // 실제 비밀번호 대신 환경 변수나 다른 안전한 방법 사용 권장
        // TODO: 비밀번호를 안전한 방식으로 확인하도록 변경
        if (inputPassword !== 'qkraudtls0626^^') {
            showToast('비밀번호가 올바르지 않습니다.');
            return;
        }

        try {
            await signInAnonymously(auth);
            showToast("인증 성공!", false);
            this.showDashboard();
        } catch (error) {
            console.error("익명 로그인 실패:", error);
            showToast("관리자 인증 실패. 인터넷 연결을 확인해주세요.");
        }
    },

    showDashboard() {
        // ... (showDashboard 내용은 변경 없음) ...
        const initialLogin = document.getElementById('admin-initial-login');
        const mainDashboard = document.getElementById('admin-main-dashboard');
        if (initialLogin) initialLogin.style.display = 'none';
        if (mainDashboard) mainDashboard.style.display = 'block';

        if (!this.isInitialized) {
            this.initializeDashboard();
        }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("[adminApp] Initializing dashboard...");

        this.cacheElements();
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        teacherManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this);
        adminHomeworkDashboard.init(this);
        adminClassVideoManager.init(this); // ✨ 비디오 매니저 초기화 추가
        this.addEventListeners(); // 이벤트 리스너 추가 먼저
        this.showAdminSection('dashboard'); // 대시보드 메뉴부터 표시
        console.log("[adminApp] Dashboard initialized.");
    },


    cacheElements() {
        this.elements = {
            // ... (기존 요소 캐싱 유지) ...
            dashboardView: document.getElementById('admin-dashboard-view'),
            gotoSubjectMgmtBtn: document.getElementById('goto-subject-mgmt-btn'),
            gotoTextbookMgmtBtn: document.getElementById('goto-textbook-mgmt-btn'),
            gotoClassMgmtBtn: document.getElementById('goto-class-mgmt-btn'),
            gotoStudentMgmtBtn: document.getElementById('goto-student-mgmt-btn'),
            gotoTeacherMgmtBtn: document.getElementById('goto-teacher-mgmt-btn'),
            gotoLessonMgmtBtn: document.getElementById('goto-lesson-mgmt-btn'),
            gotoStudentAssignmentBtn: document.getElementById('goto-student-assignment-btn'),
            gotoQnaVideoMgmtBtn: document.getElementById('goto-qna-video-mgmt-btn'),
            gotoClassVideoMgmtBtn: document.getElementById('goto-class-video-mgmt-btn'),
            gotoHomeworkMgmtBtn: document.getElementById('goto-homework-mgmt-btn'),

            // --- 비디오 관련 요소 ID 확인 및 필요시 수정 ---
            qnaVideoMgmtView: document.getElementById('admin-qna-video-mgmt-view'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'), // 공통 모듈 config와 일치
            qnaVideoDateInput: document.getElementById('admin-qna-video-date'), // 공통 모듈 config와 일치
            qnaVideoTitleInput: document.getElementById('admin-qna-video-title'), // 공통 모듈 config와 일치
            qnaVideoUrlInput: document.getElementById('admin-qna-video-url'), // 공통 모듈 config와 일치
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'), // 공통 모듈 config와 일치
            qnaVideosList: document.getElementById('admin-qna-videos-list'), // 공통 모듈 config와 일치

            classVideoMgmtView: document.getElementById('admin-class-video-mgmt-view'),
            lectureClassSelect: document.getElementById('admin-class-video-class-select'), // 공통 모듈 config와 일치
            lectureVideoDateInput: document.getElementById('admin-class-video-date'), // 공통 모듈 config와 일치
            lectureVideoListContainer: document.getElementById('admin-class-video-list-container'), // 공통 모듈 config와 일치
            saveLectureVideoBtn: document.getElementById('admin-save-class-video-btn'), // 공통 모듈 config와 일치
            lectureVideoTitleInput: document.getElementById('admin-class-video-title'), // 공통 모듈 config와 일치
            lectureVideoUrlInput: document.getElementById('admin-class-video-url'), // 공통 모듈 config와 일치
            // addLectureVideoFieldBtn: null, // 관리자 앱은 현재 동적 추가 버튼 없음 (공통 모듈 config와 일치)
            // ------------------------------------------

            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            teacherMgmtView: document.getElementById('admin-teacher-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'),
            // classVideoMgmtView: document.getElementById('admin-class-video-mgmt-view'), // 위에서 이미 캐싱됨
            homeworkMgmtView: document.getElementById('admin-homework-mgmt-view'),

            // ... (나머지 요소 캐싱 유지) ...
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
            studentsList: document.getElementById('admin-students-list'), // 학생 명단 관리 뷰의 목록

            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherEmailInput: document.getElementById('admin-new-teacher-email'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),

            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherEmailInput: document.getElementById('admin-edit-teacher-email'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),

            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'),
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
            video2Url: document.getElementById('admin-video2-url'),
            addVideo1RevBtn: document.getElementById('admin-add-video1-rev-btn'),
            addVideo2RevBtn: document.getElementById('admin-add-video2-rev-btn'),
            videoRevUrlsContainer: (type) => `admin-video${type}-rev-urls-container`,
            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'),
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),

            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
            editClassTypeSelect: document.getElementById('admin-edit-class-type'),

            editStudentModal: document.getElementById('admin-edit-student-modal'),
            closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
            cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
            saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),
            editStudentNameInput: document.getElementById('admin-edit-student-name'),
            editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
            editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),

            // ======[ 숙제 관련 요소 캐싱 유지 ]======
            homeworkClassSelect: document.getElementById('admin-homework-class-select'),
            homeworkMainContent: document.getElementById('admin-homework-main-content'),
            homeworkDashboardControls: document.getElementById('admin-homework-dashboard-controls'),
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
            // ===================================
        };
    },

    addEventListeners() {
        console.log("[adminApp] Adding event listeners...");
        // 메뉴 버튼 이벤트 (유지)
        this.elements.gotoSubjectMgmtBtn?.addEventListener('click', () => this.showAdminSection('subject-mgmt'));
        this.elements.gotoTextbookMgmtBtn?.addEventListener('click', () => this.showAdminSection('textbook-mgmt'));
        this.elements.gotoClassMgmtBtn?.addEventListener('click', () => this.showAdminSection('class-mgmt'));
        this.elements.gotoStudentMgmtBtn?.addEventListener('click', () => this.showAdminSection('student-mgmt'));
        this.elements.gotoTeacherMgmtBtn?.addEventListener('click', () => this.showAdminSection('teacher-mgmt'));
        this.elements.gotoLessonMgmtBtn?.addEventListener('click', () => this.showAdminSection('lesson-mgmt'));
        this.elements.gotoStudentAssignmentBtn?.addEventListener('click', () => this.showAdminSection('student-assignment'));
        this.elements.gotoQnaVideoMgmtBtn?.addEventListener('click', () => this.showAdminSection('qna-video-mgmt'));
        this.elements.gotoClassVideoMgmtBtn?.addEventListener('click', () => this.showAdminSection('class-video-mgmt'));
        this.elements.gotoHomeworkMgmtBtn?.addEventListener('click', () => this.showAdminSection('homework-mgmt'));

        // 뒤로가기 버튼 이벤트 (유지)
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });

        // ✨ 질문 영상/수업 영상 관련 이벤트 리스너 제거 (공통 모듈로 이동)

        // 사용자 정의 이벤트 리스너 (유지)
        document.addEventListener('subjectsUpdated', () => {
            console.log("[adminApp] 'subjectsUpdated' event received.");
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
            // 공통 숙제 관리 모듈의 함수 호출 (유지)
            if (adminHomeworkDashboard.managerInstance?.populateSubjectsForHomeworkModal) {
                if (this.elements.assignHomeworkModal?.style.display === 'flex') {
                    adminHomeworkDashboard.managerInstance.populateSubjectsForHomeworkModal();
                }
            }
            // ✨ 비디오 관리 모듈의 드롭다운 업데이트 호출 (필요시 추가) - 필요 없음 (initView에서 처리)
        });
        document.addEventListener('classesUpdated', () => {
            console.log("[adminApp] 'classesUpdated' event received.");
            // ✨ 비디오 관리 모듈의 populateClassSelect 호출
            if (adminClassVideoManager.managerInstance) {
                 // QnA 뷰가 현재 활성화되어 있으면 드롭다운 업데이트
                 if (this.elements.qnaVideoMgmtView?.style.display === 'block') {
                     adminClassVideoManager.managerInstance.populateClassSelect(this.elements.qnaClassSelect.id, 'selectedClassIdForQnaVideo');
                 }
                 // 수업 영상 뷰가 현재 활성화되어 있으면 드롭다운 업데이트
                 if (this.elements.classVideoMgmtView?.style.display === 'block') {
                     adminClassVideoManager.managerInstance.populateClassSelect(this.elements.lectureClassSelect.id, 'selectedClassIdForClassVideo');
                 }
            }

            // 공통 숙제 관리 모듈의 함수 호출 (유지)
            if (adminHomeworkDashboard.managerInstance?.populateClassSelect) {
                adminHomeworkDashboard.managerInstance.populateClassSelect();
            }
            // 학생 배정 관리 모듈 호출 (유지)
            if (studentAssignmentManager?.populateClassSelects) {
                console.log("[adminApp] Populating student assignment class selects.");
                studentAssignmentManager.populateClassSelects();
            } else {
                console.warn("[adminApp] studentAssignmentManager or populateClassSelects function not found.");
            }
        });

        console.log("[adminApp] Event listeners added.");
    },


    showAdminSection(sectionName) {
        console.log(`[adminApp] Attempting to show section: ${sectionName}`);

        // 모든 뷰 숨기기 (유지)
        Object.keys(this.elements).forEach(key => {
            if (key.endsWith('View') && this.elements[key] instanceof HTMLElement) {
                this.elements[key].style.display = 'none';
            }
        });

        // 보여줄 뷰 매핑 (유지)
        const viewMap = {
            'dashboard': this.elements.dashboardView,
            'subject-mgmt': this.elements.subjectMgmtView,
            'textbook-mgmt': this.elements.textbookMgmtView,
            'class-mgmt': this.elements.classMgmtView,
            'student-mgmt': this.elements.studentMgmtView,
            'teacher-mgmt': this.elements.teacherMgmtView,
            'lesson-mgmt': this.elements.lessonMgmtView,
            'student-assignment': this.elements.studentAssignmentView,
            'qna-video-mgmt': this.elements.qnaVideoMgmtView,
            'class-video-mgmt': this.elements.classVideoMgmtView,
            'homework-mgmt': this.elements.homeworkMgmtView,
        };

        // 해당 뷰 표시 (유지)
        const viewToShow = viewMap[sectionName];
        if (viewToShow instanceof HTMLElement) {
            console.log(`[adminApp] Showing element: ${viewToShow.id}`);
            viewToShow.style.display = 'block';
        } else {
             console.warn(`[adminApp] View element for "${sectionName}" not found or invalid. Showing dashboard.`);
             if(this.elements.dashboardView instanceof HTMLElement) {
                 this.elements.dashboardView.style.display = 'block';
             }
        }

        // 섹션별 초기화 로직
        switch (sectionName) {
            case 'textbook-mgmt':
                this.renderSubjectOptionsForTextbook(); // 유지
                break;
            case 'lesson-mgmt':
                this.renderSubjectOptionsForLesson(); // 유지
                if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
                break;
            case 'qna-video-mgmt':
                adminClassVideoManager.initQnaView(); // ✨ 변경: 공통 래퍼 호출
                break;
            case 'class-video-mgmt':
                adminClassVideoManager.initLectureView(); // ✨ 변경: 공통 래퍼 호출
                break;
            case 'student-assignment':
                 if (studentAssignmentManager?.populateClassSelects) { // 유지
                    studentAssignmentManager.populateClassSelects();
                    studentAssignmentManager.resetView();
                 }
                break;
            case 'homework-mgmt':
                if (adminHomeworkDashboard.managerInstance?.initView) { // 유지
                    adminHomeworkDashboard.managerInstance.initView();
                }
                break;
            case 'student-mgmt':
                 if (studentManager?.renderStudentListView) { // 유지
                     studentManager.renderStudentListView();
                 }
                break;
        }
    },

    // --- ✨ 비디오 관련 함수들 모두 제거 ---

    // --- 과목 옵션 관련 함수 (유지) ---
    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook; if (!select) return;
        const currentSelection = select.value || this.state.selectedSubjectIdForTextbook; select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) { select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>'; if(this.elements.textbookManagementContent) this.elements.textbookManagementContent.style.display = 'none'; return; }
        this.state.subjects.forEach(sub => { select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`; });
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection; this.state.selectedSubjectIdForTextbook = currentSelection; if (textbookManager?.handleSubjectSelectForTextbook) { textbookManager.handleSubjectSelectForTextbook(currentSelection); }
        } else { select.value = ''; this.state.selectedSubjectIdForTextbook = null; if (textbookManager?.handleSubjectSelectForTextbook) { textbookManager.handleSubjectSelectForTextbook(''); } }
    },
    renderSubjectOptionsForLesson() {
        const select = this.elements.subjectSelectForLesson; if (!select) return;
        const currentSelection = select.value || this.state.selectedSubjectIdForLesson; select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) { select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>'; if(this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none'; if(this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block'; return; }
        this.state.subjects.forEach(sub => { select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`; });
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection; this.state.selectedSubjectIdForLesson = currentSelection;
            if (lessonManager?.managerInstance?.handleLessonFilterChange) { lessonManager.managerInstance.handleLessonFilterChange(); }
        } else { select.value = ''; this.state.selectedSubjectIdForLesson = null;
            if (lessonManager?.managerInstance?.handleLessonFilterChange) { lessonManager.managerInstance.handleLessonFilterChange(); }
        }
    },

}; // AdminApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export default AdminApp;