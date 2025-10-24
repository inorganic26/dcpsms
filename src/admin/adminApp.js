// src/admin/adminApp.js

import { auth, onAuthStateChanged, signInAnonymously, db } from '../shared/firebase.js';
// Firestore 모듈 추가 (classLectures 컬렉션 사용 위해 + 질문 영상 로드/삭제/수정)
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
// ======[ 숙제 모듈 import 추가 ]======
import { adminHomeworkDashboard } from './adminHomeworkDashboard.js';
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
        selectedClassIdForClassVideo: null,
        currentClassVideoDate: null,
        currentClassVideos: [], // 이제 로드된 영상 목록 [{title, url}, ...]
        editingClassVideoIndex: null, // 수정 중인 수업 영상의 배열 인덱스
        selectedClassIdForQnaVideo: null,
        currentQnaVideoDate: null,
        editingQnaVideoId: null, // 수정 중인 질문 영상 ID 추가
        // ======[ 숙제 관련 상태 추가 ]======
        selectedClassIdForHomework: null, // 숙제 관리용 반 ID
        selectedHomeworkId: null,       // 현재 선택된 숙제 ID
        editingHomeworkId: null,        // 수정 중인 숙제 ID
        // ===================================
    },

    init() {
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
        studentManager.init(this); // 학생 목록 로드를 위해 먼저 초기화
        teacherManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this);
        adminHomeworkDashboard.init(this); // ======[ 숙제 모듈 초기화 ]======
        this.addEventListeners(); // 이벤트 리스너 추가 먼저
        this.showAdminSection('dashboard'); // 대시보드 메뉴부터 표시
        // 학생 목록 로드 (숙제 현황 등에서 사용)
        // studentManager.listenForStudents()는 studentManager.init에서 호출됨
        console.log("[adminApp] Dashboard initialized.");
    },


    cacheElements() {
        this.elements = {
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
            // ======[ 숙제 메뉴 버튼 추가 ]======
            gotoHomeworkMgmtBtn: document.getElementById('goto-homework-mgmt-btn'),
            // ===================================

            qnaVideoMgmtView: document.getElementById('admin-qna-video-mgmt-view'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoDate: document.getElementById('admin-qna-video-date'),
            qnaVideoTitle: document.getElementById('admin-qna-video-title'),
            qnaVideoUrl: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            qnaVideosList: document.getElementById('admin-qna-videos-list'),

            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            teacherMgmtView: document.getElementById('admin-teacher-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'),
            classVideoMgmtView: document.getElementById('admin-class-video-mgmt-view'),
            // ======[ 숙제 뷰 추가 ]======
            homeworkMgmtView: document.getElementById('admin-homework-mgmt-view'),
            // ===========================

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

            classVideoClassSelect: document.getElementById('admin-class-video-class-select'),
            classVideoDateInput: document.getElementById('admin-class-video-date'),
            classVideoListContainer: document.getElementById('admin-class-video-list-container'),
            saveClassVideoBtn: document.getElementById('admin-save-class-video-btn'),
            classVideoTitleInput: document.getElementById('admin-class-video-title'),
            classVideoUrlInput: document.getElementById('admin-class-video-url'),

            // ======[ 숙제 관련 요소 캐싱 추가 ]======
            homeworkClassSelect: document.getElementById('admin-homework-class-select'), // 반 선택
            homeworkMainContent: document.getElementById('admin-homework-main-content'), // 숙제 메인 영역
            homeworkDashboardControls: document.getElementById('admin-homework-dashboard-controls'),
            homeworkSelect: document.getElementById('admin-homework-select'), // 숙제 선택
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
            homeworkSubjectSelect: document.getElementById('admin-homework-subject-select'), // 모달 내 과목 선택
            homeworkTextbookSelect: document.getElementById('admin-homework-textbook-select'), // 모달 내 교재 선택
            homeworkPagesInput: document.getElementById('admin-homework-pages'), // 모달 내 페이지 수
            homeworkDueDateInput: document.getElementById('admin-homework-due-date'), // 모달 내 마감일
            // ===================================
        };
    },

    // ======[ 이벤트 리스너 함수 수정 ]======
    addEventListeners() {
        console.log("[adminApp] Adding event listeners...");
        // 메뉴 버튼 이벤트
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

        // 뒤로가기 버튼 이벤트
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });

        // 질문 영상 저장 버튼
        this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo());
        this.elements.qnaVideoDate?.addEventListener('change', (e) => this.handleQnaVideoDateChange(e.target.value));
        this.elements.qnaClassSelect?.addEventListener('change', (e) => this.handleQnaVideoClassChange(e.target.value));

        // 수업 영상 관리 이벤트 리스너
        this.elements.classVideoDateInput?.addEventListener('change', (e) => this.handleClassVideoDateChange(e.target.value));
        this.elements.classVideoClassSelect?.addEventListener('change', (e) => this.handleClassVideoClassChange(e.target.value));
        this.elements.saveClassVideoBtn?.addEventListener('click', () => this.saveOrUpdateClassVideo());

        // 사용자 정의 이벤트 리스너
        document.addEventListener('subjectsUpdated', () => {
            console.log("[adminApp] 'subjectsUpdated' event received.");
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
            if (adminHomeworkDashboard?.populateSubjectsForHomeworkModal) {
                if (this.elements.assignHomeworkModal?.style.display === 'flex') {
                    adminHomeworkDashboard.populateSubjectsForHomeworkModal();
                }
            }
        });
        document.addEventListener('classesUpdated', () => {
            console.log("[adminApp] 'classesUpdated' event received.");
            this.populateClassSelectForQnaVideo();
            this.populateClassSelectForClassVideo();
            if (adminHomeworkDashboard?.populateClassSelect) {
                adminHomeworkDashboard.populateClassSelect();
            }
            if (studentAssignmentManager?.populateClassSelects) {
                console.log("[adminApp] Populating student assignment class selects.");
                studentAssignmentManager.populateClassSelects();
            } else {
                console.warn("[adminApp] studentAssignmentManager or populateClassSelects function not found.");
            }
        });

        // ======[ studentsLoaded 이벤트 리스너 추가 ]======
        // 이 리스너는 adminHomeworkDashboard.js 내부에서 직접 처리하도록 변경되었습니다.
        // adminApp.js에서는 더 이상 이 이벤트를 직접 처리할 필요가 없습니다.
        /*
        document.addEventListener('studentsLoaded', () => {
            console.log("[adminApp] 'studentsLoaded' event received.");
            // 숙제 현황 모듈에 알림 (필요한 경우)
            if (this.state.selectedClassIdForHomework && adminHomeworkDashboard?.filterAndDisplayStudents) {
                 console.log("[adminApp] Triggering student filtering in homework dashboard.");
                 adminHomeworkDashboard.filterAndDisplayStudents(this.state.selectedClassIdForHomework);
            }
        });
        */
       // ============================================

        console.log("[adminApp] Event listeners added.");
    },
    // =====================================

    showAdminSection(sectionName) {
        console.log(`[adminApp] Attempting to show section: ${sectionName}`);

        // 모든 뷰 숨기기
        Object.keys(this.elements).forEach(key => {
            if (key.endsWith('View') && this.elements[key] instanceof HTMLElement) {
                this.elements[key].style.display = 'none';
            }
        });

        // 보여줄 뷰 매핑
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
            // ======[ 숙제 뷰 매핑 추가 ]======
            'homework-mgmt': this.elements.homeworkMgmtView,
            // ===================================
        };

        // 해당 뷰 표시
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
                this.renderSubjectOptionsForTextbook();
                break;
            case 'lesson-mgmt':
                this.renderSubjectOptionsForLesson();
                if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
                break;
            case 'qna-video-mgmt':
                this.initQnaVideoView();
                break;
            case 'class-video-mgmt':
                this.initClassVideoView();
                break;
            case 'student-assignment':
                 if (studentAssignmentManager && typeof studentAssignmentManager.populateClassSelects === 'function') {
                    studentAssignmentManager.populateClassSelects();
                    studentAssignmentManager.resetView();
                 }
                break;
            // ======[ 숙제 뷰 초기화 로직 추가 ]======
            case 'homework-mgmt':
                if (adminHomeworkDashboard && typeof adminHomeworkDashboard.initView === 'function') {
                    adminHomeworkDashboard.initView(); // 반 목록 채우고 초기 상태 설정
                }
                break;
            // ===================================
            // ======[ 학생 관리 뷰 진입 시 목록 렌더링 호출 추가 ]======
            case 'student-mgmt':
                 if (studentManager && typeof studentManager.renderStudentListView === 'function') {
                     studentManager.renderStudentListView();
                 }
                break;
            // ====================================================
        }
    },

    // --- (질문 영상, 수업 영상, 과목 옵션 관련 함수들은 이전과 동일하게 유지) ---
    initQnaVideoView() {
        console.log("[adminApp] Initializing QnA Video View...");
        const dateInput = this.elements.qnaVideoDate;
        const classSelect = this.elements.qnaClassSelect;
        if (dateInput) {
            const today = new Date().toISOString().slice(0, 10);
            if (!dateInput.value || dateInput.value !== today) { dateInput.value = today; }
            this.state.currentQnaVideoDate = dateInput.value;
        } else { this.state.currentQnaVideoDate = null; }
        this.populateClassSelectForQnaVideo();
        if (classSelect && this.state.currentQnaVideoDate) { classSelect.disabled = false; }
        this.loadQnaVideos();
        this.state.editingQnaVideoId = null;
        if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
        if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
        if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
    },
    populateClassSelectForQnaVideo() {
        const select = this.elements.qnaClassSelect;
        if (!select) { console.warn("[adminApp] qnaClassSelect element not found."); return; }
        const currentSelection = this.state.selectedClassIdForQnaVideo || select.value;
        select.innerHTML = '<option value="">-- 반 선택 --</option>';
        if (!this.state.classes || this.state.classes.length === 0) {
             select.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
             select.disabled = true; this.handleQnaVideoClassChange(''); return;
        }
        this.state.classes.forEach(cls => { select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`; });
        if (this.state.classes.some(c => c.id === currentSelection)) {
           select.value = currentSelection; this.state.selectedClassIdForQnaVideo = currentSelection;
        } else if (this.state.classes.length > 0 && this.state.currentQnaVideoDate) {
            const firstClassId = this.state.classes[0].id; select.value = firstClassId; this.state.selectedClassIdForQnaVideo = firstClassId;
        } else { select.value = ''; this.state.selectedClassIdForQnaVideo = null; }
        select.disabled = !this.state.currentQnaVideoDate;
    },
    handleQnaVideoDateChange(selectedDate) {
         this.state.currentQnaVideoDate = selectedDate || null;
         const classSelect = this.elements.qnaClassSelect;
         if (classSelect) {
             classSelect.disabled = !selectedDate;
             if (!selectedDate) {
                 classSelect.value = ''; this.state.selectedClassIdForQnaVideo = null;
                 if (this.elements.qnaVideosList) { this.elements.qnaVideosList.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; }
                 this.state.editingQnaVideoId = null;
                 if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
                 if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
                 if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = ''; return;
             } else if (classSelect.value === '' && this.state.classes.length > 0) {
                const firstClassId = this.state.classes[0].id; classSelect.value = firstClassId; this.state.selectedClassIdForQnaVideo = firstClassId;
            }
         }
         this.state.editingQnaVideoId = null;
         if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
         if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
         if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
         this.loadQnaVideos();
    },
    handleQnaVideoClassChange(classId) {
         this.state.selectedClassIdForQnaVideo = classId || null;
         this.state.editingQnaVideoId = null;
         if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
         if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
         if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
         this.loadQnaVideos();
    },
    async saveQnaVideo() {
        const classId = this.state.selectedClassIdForQnaVideo;
        const videoDate = this.state.currentQnaVideoDate;
        const title = this.elements.qnaVideoTitle?.value.trim();
        const url = this.elements.qnaVideoUrl?.value.trim();
        const editingId = this.state.editingQnaVideoId;
        if (!classId || !videoDate || !title || !url) { showToast("날짜, 반, 제목, URL을 모두 입력해주세요."); return; }
        const videoData = { classId, videoDate, title, youtubeUrl: url };
        try {
            if (editingId) {
                const videoRef = doc(db, 'classVideos', editingId); await updateDoc(videoRef, videoData); showToast("질문 영상 수정 성공!", false);
            } else {
                videoData.createdAt = serverTimestamp(); await addDoc(collection(db, 'classVideos'), videoData); showToast("질문 영상 저장 성공!", false);
            }
            this.state.editingQnaVideoId = null;
            if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
            if(this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
            if(this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
            this.loadQnaVideos();
        } catch (error) { console.error(`[adminApp] 질문 영상 ${editingId ? '수정' : '저장'} 실패:`, error); showToast(`영상 ${editingId ? '수정' : '저장'} 실패.`); }
    },
    async loadQnaVideos() {
        const classId = this.state.selectedClassIdForQnaVideo;
        const selectedDate = this.state.currentQnaVideoDate;
        const listEl = this.elements.qnaVideosList;
        if (!listEl) { console.error("[adminApp] QnA video list element not found."); return; }
        if (!selectedDate) { listEl.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; return; }
        if (!classId) { listEl.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>'; return; }
        listEl.innerHTML = '<div class="loader-small mx-auto"></div>';
        try {
            const q = query( collection(db, 'classVideos'), where('classId', '==', classId), where('videoDate', '==', selectedDate), orderBy('createdAt', 'desc') );
            const snapshot = await getDocs(q); listEl.innerHTML = '';
            if (snapshot.empty) { listEl.innerHTML = '<p class="text-sm text-slate-500">해당 날짜에 등록된 질문 영상이 없습니다.</p>'; return; }
            snapshot.docs.forEach(docSnap => {
                const video = docSnap.data(); const videoId = docSnap.id; const div = document.createElement('div');
                div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm';
                div.innerHTML = ` <div class="flex-grow mr-4 overflow-hidden"> <p class="font-medium text-slate-700 break-words">${video.title || '제목 없음'}</p> <a href="${video.youtubeUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.youtubeUrl || 'URL 없음'}</a> </div> <div class="flex gap-2 flex-shrink-0"> <button data-id="${videoId}" class="edit-qna-video-btn btn btn-secondary btn-sm">수정</button> <button data-id="${videoId}" class="delete-qna-video-btn btn btn-danger btn-sm">삭제</button> </div> `;
                div.querySelector('.edit-qna-video-btn')?.addEventListener('click', (e) => { this.openQnaVideoEditMode(e.target.dataset.id); });
                div.querySelector('.delete-qna-video-btn')?.addEventListener('click', async (e) => {
                    const videoDocId = e.target.dataset.id;
                    if (confirm(`'${video.title}' 영상을 정말 삭제하시겠습니까?`)) {
                        try {
                            await deleteDoc(doc(db, 'classVideos', videoDocId)); showToast("영상이 삭제되었습니다.", false);
                            if (this.state.editingQnaVideoId === videoDocId) {
                                this.state.editingQnaVideoId = null; if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = ''; if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = ''; if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
                            } this.loadQnaVideos();
                        } catch (err) { console.error("[adminApp] Error deleting QnA video:", err); showToast("영상 삭제 실패"); }
                    }
                }); listEl.appendChild(div);
            });
        } catch (error) { console.error("[adminApp] Error loading QnA videos:", error); listEl.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>'; showToast("질문 영상 목록 로딩 중 오류 발생", true); }
    },
    async openQnaVideoEditMode(videoId) {
        if (!videoId) return;
        try {
            const videoRef = doc(db, 'classVideos', videoId); const videoSnap = await getDoc(videoRef);
            if (videoSnap.exists()) {
                const videoData = videoSnap.data(); if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = videoData.title || ''; if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = videoData.youtubeUrl || '';
                this.state.editingQnaVideoId = videoId; if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '수정하기';
                showToast("영상 정보를 불러왔습니다. 수정 후 [수정하기] 버튼을 누르세요.", false); this.elements.qnaVideoTitle?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else { showToast("수정할 영상 정보를 찾을 수 없습니다."); this.state.editingQnaVideoId = null; if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기'; }
        } catch (error) { console.error("[adminApp] Error fetching QnA video for editing:", error); showToast("영상 정보를 불러오는 중 오류 발생."); }
    },
    initClassVideoView() {
        const dateInput = this.elements.classVideoDateInput; const classSelect = this.elements.classVideoClassSelect; const titleInput = this.elements.classVideoTitleInput; const urlInput = this.elements.classVideoUrlInput; const saveBtn = this.elements.saveClassVideoBtn;
        if (dateInput) { const today = new Date().toISOString().slice(0, 10); if (!dateInput.value || dateInput.value !== today) { dateInput.value = today; } this.state.currentClassVideoDate = dateInput.value; } else { this.state.currentClassVideoDate = null; }
        this.populateClassSelectForClassVideo(); if (classSelect && this.state.currentClassVideoDate) { classSelect.disabled = false; }
        this.loadClassVideos(); this.state.editingClassVideoIndex = null; if (titleInput) titleInput.value = ''; if (urlInput) urlInput.value = ''; if (saveBtn) saveBtn.textContent = '영상 저장하기';
    },
    populateClassSelectForClassVideo() {
        const select = this.elements.classVideoClassSelect; if (!select) return;
        const currentSelection = this.state.selectedClassIdForClassVideo || select.value; select.innerHTML = '<option value="">-- 반 선택 --</option>';
        if (!this.state.classes || this.state.classes.length === 0) { select.innerHTML += '<option value="" disabled>등록된 반 없음</option>'; select.disabled = true; this.handleClassVideoClassChange(''); return; }
        this.state.classes.forEach(cls => { select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`; });
        if (this.state.classes.some(c => c.id === currentSelection)) { select.value = currentSelection; this.state.selectedClassIdForClassVideo = currentSelection; }
        else if (this.state.classes.length > 0 && this.state.currentClassVideoDate) { const firstClassId = this.state.classes[0].id; select.value = firstClassId; this.state.selectedClassIdForClassVideo = firstClassId; }
        else { select.value = ''; this.state.selectedClassIdForClassVideo = null; }
        select.disabled = !this.state.currentClassVideoDate;
    },
    handleClassVideoDateChange(selectedDate) {
         this.state.currentClassVideoDate = selectedDate || null; const classSelect = this.elements.classVideoClassSelect; const titleInput = this.elements.classVideoTitleInput; const urlInput = this.elements.classVideoUrlInput; const saveBtn = this.elements.saveClassVideoBtn;
         if (classSelect) {
             classSelect.disabled = !selectedDate;
             if (!selectedDate) {
                 classSelect.value = ''; this.state.selectedClassIdForClassVideo = null; if (this.elements.classVideoListContainer) { this.elements.classVideoListContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; }
                 this.state.currentClassVideos = []; this.state.editingClassVideoIndex = null; if (titleInput) titleInput.value = ''; if (urlInput) urlInput.value = ''; if (saveBtn) saveBtn.textContent = '영상 저장하기'; return;
             } else if (classSelect.value === '' && this.state.classes.length > 0) { const firstClassId = this.state.classes[0].id; classSelect.value = firstClassId; this.state.selectedClassIdForClassVideo = firstClassId; }
         }
         this.state.editingClassVideoIndex = null; if (titleInput) titleInput.value = ''; if (urlInput) urlInput.value = ''; if (saveBtn) saveBtn.textContent = '영상 저장하기';
         this.loadClassVideos();
    },
    handleClassVideoClassChange(classId) {
         this.state.selectedClassIdForClassVideo = classId || null; const titleInput = this.elements.classVideoTitleInput; const urlInput = this.elements.classVideoUrlInput; const saveBtn = this.elements.saveClassVideoBtn;
         this.state.editingClassVideoIndex = null; if (titleInput) titleInput.value = ''; if (urlInput) urlInput.value = ''; if (saveBtn) saveBtn.textContent = '영상 저장하기';
         this.loadClassVideos();
    },
    async loadClassVideos() {
        const classId = this.state.selectedClassIdForClassVideo; const selectedDate = this.state.currentClassVideoDate; const listContainer = this.elements.classVideoListContainer;
        if (!listContainer) return; if (!selectedDate) { listContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; this.state.currentClassVideos = []; return; } if (!classId) { listContainer.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>'; this.state.currentClassVideos = []; return; }
        listContainer.innerHTML = '<div class="loader-small mx-auto"></div>';
        try {
            const q = query( collection(db, 'classLectures'), where('classId', '==', classId), where('lectureDate', '==', selectedDate) ); const snapshot = await getDocs(q);
            if (snapshot.empty) { this.state.currentClassVideos = []; } else { this.state.currentClassVideos = snapshot.docs[0].data().videos || []; }
            this.renderClassVideoList(this.state.currentClassVideos);
        } catch (error) { console.error("[adminApp] 수업 영상 로딩 실패:", error); showToast("수업 영상을 불러오는 데 실패했습니다."); listContainer.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>'; this.state.currentClassVideos = []; }
    },
    renderClassVideoList(videos) {
        const listContainer = this.elements.classVideoListContainer; if (!listContainer) return; listContainer.innerHTML = '';
        if (!Array.isArray(videos) || videos.length === 0) { listContainer.innerHTML = '<p class="text-sm text-slate-500">등록된 영상이 없습니다.</p>'; return; }
        videos.forEach((video, index) => {
            const div = document.createElement('div'); div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm';
            div.innerHTML = ` <div class="flex-grow mr-4 overflow-hidden"> <p class="font-medium text-slate-700 break-words">${index + 1}. ${video.title || '제목 없음'}</p> <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.url || 'URL 없음'}</a> </div> <div class="flex gap-2 flex-shrink-0"> <button data-index="${index}" class="edit-class-video-btn btn btn-secondary btn-sm">수정</button> <button data-index="${index}" class="delete-class-video-btn btn btn-danger btn-sm">삭제</button> </div> `;
            div.querySelector('.edit-class-video-btn')?.addEventListener('click', (e) => { this.openClassVideoEditMode(parseInt(e.target.dataset.index, 10)); });
            div.querySelector('.delete-class-video-btn')?.addEventListener('click', (e) => { this.deleteClassVideo(parseInt(e.target.dataset.index, 10)); });
            listContainer.appendChild(div);
        });
    },
    openClassVideoEditMode(index) {
        if (index === undefined || index < 0 || index >= this.state.currentClassVideos.length) return;
        const videoData = this.state.currentClassVideos[index]; const titleInput = this.elements.classVideoTitleInput; const urlInput = this.elements.classVideoUrlInput; const saveBtn = this.elements.saveClassVideoBtn;
        if (titleInput) titleInput.value = videoData.title || ''; if (urlInput) urlInput.value = videoData.url || '';
        this.state.editingClassVideoIndex = index; if (saveBtn) saveBtn.textContent = '수정하기';
        showToast("영상 정보를 불러왔습니다. 수정 후 [수정하기] 버튼을 누르세요.", false); titleInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    },
    async deleteClassVideo(index) {
        if (index === undefined || index < 0 || index >= this.state.currentClassVideos.length) return;
        const videoToDelete = this.state.currentClassVideos[index]; if (!confirm(`'${videoToDelete.title}' 영상을 정말 삭제하시겠습니까?`)) return;
        this.state.currentClassVideos.splice(index, 1);
        await this.saveClassVideos(this.state.currentClassVideos);
        if (this.state.editingClassVideoIndex === index) {
            this.state.editingClassVideoIndex = null; if (this.elements.classVideoTitleInput) this.elements.classVideoTitleInput.value = ''; if (this.elements.classVideoUrlInput) this.elements.classVideoUrlInput.value = ''; if (this.elements.saveClassVideoBtn) this.elements.saveClassVideoBtn.textContent = '영상 저장하기';
        } else if (this.state.editingClassVideoIndex !== null && this.state.editingClassVideoIndex > index) { this.state.editingClassVideoIndex--; }
        showToast("영상이 삭제되었습니다.", false);
    },
    async saveOrUpdateClassVideo() {
        const titleInput = this.elements.classVideoTitleInput; const urlInput = this.elements.classVideoUrlInput; const title = titleInput?.value.trim(); const url = urlInput?.value.trim(); const editingIndex = this.state.editingClassVideoIndex;
        if (!title || !url) { showToast("영상 제목과 URL을 모두 입력해주세요."); return; }
         if (!url.startsWith('http://') && !url.startsWith('https://')) { showToast(`URL 형식이 올바르지 않습니다. (http:// 또는 https:// 로 시작)`, true); urlInput?.classList.add('border-red-500'); return; } else { urlInput?.classList.remove('border-red-500'); }
        const newVideoData = { title, url }; let updatedVideos = [...this.state.currentClassVideos];
        if (editingIndex !== null && editingIndex >= 0 && editingIndex < updatedVideos.length) { updatedVideos[editingIndex] = newVideoData; } else { updatedVideos.push(newVideoData); }
        await this.saveClassVideos(updatedVideos);
        this.state.editingClassVideoIndex = null; if (titleInput) titleInput.value = ''; if (urlInput) urlInput.value = ''; if (this.elements.saveClassVideoBtn) this.elements.saveClassVideoBtn.textContent = '영상 저장하기';
        showToast(`영상 ${editingIndex !== null ? '수정' : '저장'} 성공!`, false);
    },
    async saveClassVideos(videosToSave) {
        const classId = this.state.selectedClassIdForClassVideo; const selectedDate = this.state.currentClassVideoDate; const saveBtn = this.elements.saveClassVideoBtn;
        if (!selectedDate || !classId) { showToast("날짜와 반이 모두 선택되어야 합니다.", true); return; }
        if (saveBtn) saveBtn.disabled = true;
        try {
            const q = query( collection(db, 'classLectures'), where('classId', '==', classId), where('lectureDate', '==', selectedDate) ); const snapshot = await getDocs(q);
            if (!Array.isArray(videosToSave) || videosToSave.length === 0) {
                if (!snapshot.empty) { const docRef = snapshot.docs[0].ref; await deleteDoc(docRef); } this.state.currentClassVideos = [];
            } else {
                const data = { classId: classId, lectureDate: selectedDate, videos: videosToSave }; let docRef;
                if (snapshot.empty) { data.createdAt = serverTimestamp(); docRef = doc(collection(db, 'classLectures')); await setDoc(docRef, data); }
                else { docRef = snapshot.docs[0].ref; await updateDoc(docRef, { videos: videosToSave }); } this.state.currentClassVideos = videosToSave;
            } this.renderClassVideoList(this.state.currentClassVideos);
        } catch (error) { console.error("[adminApp] 수업 영상 Firestore 저장 실패:", error); showToast("수업 영상 저장에 실패했습니다."); }
        finally { if (saveBtn) saveBtn.disabled = false; }
    },
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

    // ======[ 전체 학생 목록 로드 함수 추가 (studentManager 호출) ]======
    // adminApp 초기화 시 studentManager.init()이 호출되면서 listenForStudents가 실행됩니다.
    // 해당 함수는 this.app.state.students에 전체 학생 목록을 저장합니다.
    // 따라서 별도의 로드 함수는 필요하지 않습니다. 숙제 현황 모듈에서는
    // this.app.state.students를 참조하고, 선택된 반 ID로 필터링하여 사용합니다.
    // =============================================================

}; // AdminApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export default AdminApp;