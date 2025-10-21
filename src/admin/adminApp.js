// src/admin/adminApp.js

import { auth, onAuthStateChanged, signInAnonymously, db } from '../shared/firebase.js';
// Firestore 모듈 추가 (classLectures 컬렉션 사용 위해)
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

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: {
        subjects: [],
        classes: [], // 반 목록 데이터 저장
        students: [],
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
        currentClassVideos: [],
    },

    init() {
        const initialLogin = document.getElementById('admin-initial-login');
        const mainDashboard = document.getElementById('admin-main-dashboard');
        if (initialLogin) initialLogin.style.display = 'flex';
        if (mainDashboard) mainDashboard.style.display = 'none';

        const secretLoginBtn = document.getElementById('admin-secret-login-btn');
        secretLoginBtn?.addEventListener('click', this.handleSecretLogin.bind(this));

        // 비밀번호 입력 후 Enter 키로 로그인 시도
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

        // 비밀번호 확인 (실제 환경에서는 안전한 방식 사용)
        if (inputPassword !== 'qkraudtls0626^^') {
            showToast('비밀번호가 올바르지 않습니다.');
            return;
        }

        try {
            await signInAnonymously(auth); // 익명 로그인 시도
            showToast("인증 성공!", false);
            this.showDashboard(); // 성공 시 대시보드 표시
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

        if (!this.isInitialized) { // 최초 한 번만 초기화 실행
            this.initializeDashboard();
        }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("[adminApp] Initializing dashboard..."); // ✨ 로그 추가

        this.cacheElements(); // 1. 요소 캐싱

        // 2. 모듈들을 this에 할당 (init보다 먼저!)
        // lessonManager는 createLessonManager 방식이 아니므로 직접 할당 불필요

        // 3. 각 관리 모듈 초기화 (AdminApp 인스턴스를 전달)
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this); // 여기서 listenForClasses 호출 -> classesUpdated 이벤트 발생
        studentManager.init(this);
        teacherManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this);

        // 4. 이벤트 리스너 추가 (모듈 초기화 이후)
        this.addEventListeners(); // classesUpdated 리스너 여기서 추가됨

        // 5. 초기 화면 표시
        this.showAdminSection('dashboard');
        console.log("[adminApp] Dashboard initialized."); // ✨ 로그 추가
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
            gotoClassVideoMgmtBtn: document.getElementById('goto-class-video-mgmt-btn'), // 수업 영상 메뉴 버튼 ID로 가져오기

            qnaVideoMgmtView: document.getElementById('admin-qna-video-mgmt-view'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoDate: document.getElementById('admin-qna-video-date'),
            qnaVideoTitle: document.getElementById('admin-qna-video-title'),
            qnaVideoUrl: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),

            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            teacherMgmtView: document.getElementById('admin-teacher-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'),
            classVideoMgmtView: document.getElementById('admin-class-video-mgmt-view'), // 수업 영상 뷰

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
            newStudentPhoneInput: document.getElementById('admin-new-student-phone'), // ID 수정됨
            newParentPhoneInput: document.getElementById('admin-new-parent-phone'), // 부모님 번호 추가
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),

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

            // 학습 세트 관리 (lessonManager) 관련 요소 ID 확인 및 추가
            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'), // 이름 확인
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('admin-show-new-lesson-modal-btn'),

            // 학습 세트 모달 내부 요소
            modal: document.getElementById('admin-new-lesson-modal'),
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            closeModalBtn: document.getElementById('admin-close-modal-btn'),
            cancelBtn: document.getElementById('admin-cancel-btn'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'),
            video2Url: document.getElementById('admin-video2-url'),
            addVideo1RevBtn: document.getElementById('admin-add-video1-rev-btn'),
            addVideo2RevBtn: document.getElementById('admin-add-video2-rev-btn'),
            videoRevUrlsContainer: (type) => `admin-video${type}-rev-urls-container`, // 함수 형태 유지
            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'),
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),

            // 반 수정 모달 (classManager) 관련 요소
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
            editClassTypeSelect: document.getElementById('admin-edit-class-type'),

            // 학생 수정 모달 요소 (studentManager)
            editStudentModal: document.getElementById('admin-edit-student-modal'),
            closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
            cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
            saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),
            editStudentNameInput: document.getElementById('admin-edit-student-name'),
            editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
            editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),

            // 수업 영상 관리 요소
            classVideoClassSelect: document.getElementById('admin-class-video-class-select'),
            classVideoDateInput: document.getElementById('admin-class-video-date'),
            classVideoListContainer: document.getElementById('admin-class-video-list-container'),
            addClassVideoFieldBtn: document.getElementById('admin-add-class-video-field-btn'),
            saveClassVideoBtn: document.getElementById('admin-save-class-video-btn'),
        };
        // 캐싱된 요소 확인 (디버깅용)
        // console.log("[adminApp] Cached elements:", this.elements);
    },

    addEventListeners() {
        console.log("[adminApp] Adding event listeners..."); // ✨ 로그 추가
        // 메뉴 버튼 이벤트 (null 체크 추가)
        this.elements.gotoSubjectMgmtBtn?.addEventListener('click', () => this.showAdminSection('subject-mgmt'));
        this.elements.gotoTextbookMgmtBtn?.addEventListener('click', () => this.showAdminSection('textbook-mgmt'));
        this.elements.gotoClassMgmtBtn?.addEventListener('click', () => this.showAdminSection('class-mgmt'));
        this.elements.gotoStudentMgmtBtn?.addEventListener('click', () => this.showAdminSection('student-mgmt'));
        this.elements.gotoTeacherMgmtBtn?.addEventListener('click', () => this.showAdminSection('teacher-mgmt'));
        this.elements.gotoLessonMgmtBtn?.addEventListener('click', () => this.showAdminSection('lesson-mgmt'));
        this.elements.gotoStudentAssignmentBtn?.addEventListener('click', () => this.showAdminSection('student-assignment'));
        this.elements.gotoQnaVideoMgmtBtn?.addEventListener('click', () => this.showAdminSection('qna-video-mgmt'));
        this.elements.gotoClassVideoMgmtBtn?.addEventListener('click', () => this.showAdminSection('class-video-mgmt'));

        // 뒤로가기 버튼 이벤트 (이벤트 위임)
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });

        // 질문 영상 저장 버튼 (null 체크 추가)
        this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo());

        // 수업 영상 관리 이벤트 리스너 (null 체크 추가)
        this.elements.classVideoClassSelect?.addEventListener('change', (e) => this.handleClassVideoClassChange(e.target.value));
        this.elements.classVideoDateInput?.addEventListener('change', (e) => this.handleClassVideoDateChange(e.target.value));
        this.elements.addClassVideoFieldBtn?.addEventListener('click', () => this.addClassVideoField());
        this.elements.saveClassVideoBtn?.addEventListener('click', () => this.saveClassVideos());

        // 사용자 정의 이벤트 리스너
        document.addEventListener('subjectsUpdated', () => {
            console.log("[adminApp] 'subjectsUpdated' event received."); // ✨ 로그 추가
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson(); // 학습 세트 관리용 과목 드롭다운 업데이트
        });
        document.addEventListener('classesUpdated', () => {
            console.log("[adminApp] 'classesUpdated' event received."); // ✨ 로그 추가
            // 모든 관련 드롭다운 업데이트
            this.populateClassSelectForQnaVideo();
            this.populateClassSelectForClassVideo();
            // studentAssignmentManager의 드롭다운도 업데이트
            if (studentAssignmentManager && typeof studentAssignmentManager.populateClassSelects === 'function') {
                console.log("[adminApp] Populating student assignment class selects."); // ✨ 로그 추가
                studentAssignmentManager.populateClassSelects();
            } else {
                console.warn("[adminApp] studentAssignmentManager or populateClassSelects function not found."); // ✨ 경고 로그
            }
        });
        console.log("[adminApp] Event listeners added."); // ✨ 로그 추가
    },


    showAdminSection(sectionName) {
        console.log(`[adminApp] Attempting to show section: ${sectionName}`); // 로그 추가

        Object.keys(this.elements).forEach(key => {
            // 'View'로 끝나고 실제 요소가 존재하는 경우에만 숨김 처리
            if (key.endsWith('View') && this.elements[key] instanceof HTMLElement) {
                this.elements[key].style.display = 'none';
            }
        });

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
            'class-video-mgmt': this.elements.classVideoMgmtView, // 수업 영상 뷰 확인
        };

        const viewToShow = viewMap[sectionName];
        if (viewToShow instanceof HTMLElement) { // 요소가 실제 HTMLElement인지 확인
            console.log(`[adminApp] Showing element: ${viewToShow.id}`); // 로그 추가
            viewToShow.style.display = 'block';
        } else {
             console.warn(`[adminApp] View element for "${sectionName}" not found or invalid. Showing dashboard.`); // 요소 못 찾으면 경고
             if(this.elements.dashboardView instanceof HTMLElement) {
                 this.elements.dashboardView.style.display = 'block';
             }
        }

        // 섹션별 초기화 로직
        switch (sectionName) {
            case 'textbook-mgmt':
                this.renderSubjectOptionsForTextbook(); // 교재 관리 진입 시 과목 드롭다운 채우기
                break;
            case 'lesson-mgmt':
                this.renderSubjectOptionsForLesson(); // 학습 세트 관리 진입 시 과목 드롭다운 채우기
                // lessonManager의 초기 상태 설정 (예: 목록 숨기기)
                if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = ''; // 목록 비우기
                break;
            case 'qna-video-mgmt':
                this.populateClassSelectForQnaVideo(); // 질문 영상 관리 진입 시 반 드롭다운 채우기
                // 날짜 기본값 설정 (오늘)
                if(this.elements.qnaVideoDate) this.elements.qnaVideoDate.valueAsDate = new Date();
                break;
            case 'class-video-mgmt':
                console.log("[adminApp] Initializing Class Video View via showAdminSection..."); // 로그 추가
                this.initClassVideoView(); // 수업 영상 관리 뷰 초기화
                break;
             case 'student-assignment':
                 // 학생 배정 관리 진입 시 반 드롭다운 채우기
                 if (studentAssignmentManager && typeof studentAssignmentManager.populateClassSelects === 'function') {
                    studentAssignmentManager.populateClassSelects();
                    studentAssignmentManager.resetView(); // 뷰 상태 초기화
                 }
                break;
            // 다른 섹션 초기화 필요 시 추가
        }
    },

    // --- 👇 populateClassSelectForQnaVideo 함수에 로그 추가 👇 ---
    populateClassSelectForQnaVideo() {
        const select = this.elements.qnaClassSelect;
        if (!select) {
            console.warn("[adminApp] qnaClassSelect element not found."); // ✨ 경고 로그
            return;
        }
        console.log("[adminApp] Populating QnA Video class select. Current classes:", this.state.classes); // ✨ 로그 추가
        const currentSelection = select.value; // 현재 선택값 저장
        select.innerHTML = '<option value="">-- 반 선택 --</option>'; // 기본 옵션
        if (!this.state.classes || this.state.classes.length === 0) {
             console.warn("[adminApp] No classes available to populate QnA dropdown."); // ✨ 경고 로그
             select.innerHTML += '<option value="" disabled>등록된 반 없음</option>'; // 반 없음 옵션
             return;
        }
        this.state.classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
        // 기존 선택값 유지 시도
         if (this.state.classes.some(c => c.id === currentSelection)) {
            select.value = currentSelection;
         }
        console.log("[adminApp] QnA Video class select populated."); // ✨ 로그 추가
    },
    // --- 👆 populateClassSelectForQnaVideo 함수 수정 끝 👆 ---

    async saveQnaVideo() {
        // ... (기존 저장 로직, null 체크 강화)
        const classId = this.elements.qnaClassSelect?.value;
        const videoDate = this.elements.qnaVideoDate?.value;
        const title = this.elements.qnaVideoTitle?.value.trim();
        const url = this.elements.qnaVideoUrl?.value.trim();

        if (!classId || !videoDate || !title || !url) {
            showToast("반, 날짜, 제목, URL을 모두 입력해주세요.");
            return;
        }
        console.log("[adminApp] Saving QnA video:", { classId, videoDate, title, url }); // ✨ 로그 추가
         try {
             await addDoc(collection(db, 'classVideos'), {
                 classId, videoDate, title, youtubeUrl: url, createdAt: serverTimestamp()
             });
             showToast("질문 영상 저장 성공!", false);
             if(this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
             if(this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
         } catch (error) {
             console.error("[adminApp] 질문 영상 저장 실패:", error); // ✨ 상세 오류 로깅
             showToast("영상 저장 실패.");
         }
    },

    // --- 👇 과목 드롭다운 채우기 함수들 수정 (학습 세트 관리 포함) 👇 ---
    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook;
        if (!select) {
             console.warn("[adminApp] subjectSelectForTextbook element not found.");
             return;
        }
        console.log("[adminApp] Rendering subject options for Textbook manager. Subjects:", this.state.subjects); // ✨ 로그 추가
        const currentSelection = select.value || this.state.selectedSubjectIdForTextbook; // 현재 또는 이전 선택값
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) {
             select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
             if(this.elements.textbookManagementContent) this.elements.textbookManagementContent.style.display = 'none'; // 내용 숨김
             return;
        }
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
        // 기존 선택 유지 또는 초기화
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection;
            this.state.selectedSubjectIdForTextbook = currentSelection; // 상태 업데이트
            if (textbookManager && typeof textbookManager.handleSubjectSelectForTextbook === 'function') {
                textbookManager.handleSubjectSelectForTextbook(currentSelection); // 교재 목록 로드 트리거
            }
        } else {
             select.value = '';
             this.state.selectedSubjectIdForTextbook = null;
             if (textbookManager && typeof textbookManager.handleSubjectSelectForTextbook === 'function') {
                 textbookManager.handleSubjectSelectForTextbook(''); // 교재 목록 초기화 트리거
             }
        }
    },

    renderSubjectOptionsForLesson() {
        const select = this.elements.subjectSelectForLesson; // 학습 세트 관리용 select
        if (!select) {
            console.warn("[adminApp] subjectSelectForLesson element not found.");
            return;
        }
        console.log("[adminApp] Rendering subject options for Lesson manager. Subjects:", this.state.subjects); // ✨ 로그 추가
        const currentSelection = select.value || this.state.selectedSubjectIdForLesson; // 현재 또는 이전 선택값
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            // 학습 세트 내용 숨김 처리
            if(this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
            if(this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
            return;
        }
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
        // 기존 선택 유지 또는 초기화
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection;
            this.state.selectedSubjectIdForLesson = currentSelection; // 상태 업데이트
            // lessonManager의 handleLessonFilterChange 호출 (존재 여부 확인)
            if (lessonManager && typeof lessonManager.handleLessonFilterChange === 'function') {
                 console.log("[adminApp] Triggering lessonManager.handleLessonFilterChange for selected subject."); // ✨ 로그 추가
                 lessonManager.handleLessonFilterChange(); // 학습 목록 로드 트리거
            } else {
                 console.warn("[adminApp] lessonManager or handleLessonFilterChange not found.");
            }
        } else {
             select.value = '';
             this.state.selectedSubjectIdForLesson = null;
             // lessonManager의 handleLessonFilterChange 호출 (초기화)
             if (lessonManager && typeof lessonManager.handleLessonFilterChange === 'function') {
                  console.log("[adminApp] Triggering lessonManager.handleLessonFilterChange for empty selection."); // ✨ 로그 추가
                 lessonManager.handleLessonFilterChange(); // 학습 목록 초기화 트리거
             }
        }
    },
    // --- 👆 과목 드롭다운 채우기 함수들 수정 끝 👆 ---


    // --- 👇 수업 영상 관리 관련 함수에 로그 추가 👇 ---
    initClassVideoView() {
        console.log("[adminApp] Initializing Class Video View..."); // ✨ 로그 추가
        this.populateClassSelectForClassVideo(); // 반 목록 채우기
        // 날짜 기본값 설정 및 비디오 로드
        const dateInput = this.elements.classVideoDateInput;
        if (dateInput) {
            const today = new Date().toISOString().slice(0, 10);
            // 날짜 입력 값이 없거나 오늘 날짜가 아니면 오늘로 설정하고 로드 트리거
             if (!dateInput.value || dateInput.value !== today) {
                dateInput.value = today;
                this.handleClassVideoDateChange(today); // 변경 핸들러 호출
             } else {
                 // 이미 오늘 날짜면 반 선택에 따라 로드될 것이므로 여기서는 호출 안 함
                 this.loadClassVideos(); // 또는 현재 날짜로 강제 로드
             }
        } else {
             if (this.elements.classVideoListContainer) {
                this.elements.classVideoListContainer.innerHTML = '<p class="text-sm text-slate-500">날짜 입력 필드를 찾을 수 없습니다.</p>';
             }
        }
    },

    populateClassSelectForClassVideo() {
        const select = this.elements.classVideoClassSelect;
        if (!select) {
            console.warn("[adminApp] classVideoClassSelect element not found."); // ✨ 경고 로그
            return;
        }
        console.log("[adminApp] Populating Class Video class select. Current classes:", this.state.classes); // ✨ 로그 추가
        const currentSelection = this.state.selectedClassIdForClassVideo || select.value; // 상태 또는 현재 값
        select.innerHTML = '<option value="">-- 반 선택 --</option>'; // 기본 옵션
        if (!this.state.classes || this.state.classes.length === 0) {
             console.warn("[adminApp] No classes available to populate Class Video dropdown."); // ✨ 경고 로그
             select.innerHTML += '<option value="" disabled>등록된 반 없음</option>'; // 반 없음 옵션
             this.handleClassVideoClassChange(''); // 반 목록 비었으면 비디오 목록 초기화
             return;
        }
        this.state.classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });
        // 기존 선택값 유지 시도
         if (this.state.classes.some(c => c.id === currentSelection)) {
            select.value = currentSelection;
            // 상태값이 업데이트되지 않았을 수 있으므로 여기서 다시 설정
            this.state.selectedClassIdForClassVideo = currentSelection;
         } else {
             select.value = ''; // 유효하지 않으면 초기화
             this.state.selectedClassIdForClassVideo = null;
             this.handleClassVideoClassChange(''); // 선택값 없어졌으면 비디오 목록 초기화
         }
         console.log("[adminApp] Class Video class select populated."); // ✨ 로그 추가
    },

    handleClassVideoClassChange(classId) {
         console.log(`[adminApp] Class Video Class changed to: ${classId}`); // ✨ 로그 추가
         this.state.selectedClassIdForClassVideo = classId || null; // 빈 문자열이면 null로
         // 날짜가 이미 선택되어 있다면 비디오 로드
         const selectedDate = this.elements.classVideoDateInput?.value;
         if (selectedDate && classId) {
             this.loadClassVideos();
         } else {
             if(this.elements.classVideoListContainer) {
                 this.elements.classVideoListContainer.innerHTML = '<p class="text-sm text-slate-500">반과 날짜를 선택해주세요.</p>';
             }
             this.state.currentClassVideos = []; // 비디오 목록 초기화
         }
    },

    handleClassVideoDateChange(selectedDate) {
         console.log(`[adminApp] Class Video Date changed to: ${selectedDate}`); // ✨ 로그 추가
         this.state.currentClassVideoDate = selectedDate || null; // 빈 문자열이면 null로
         // 반이 이미 선택되어 있다면 비디오 로드
         const classId = this.state.selectedClassIdForClassVideo; // 상태값 사용
         if (classId && selectedDate) {
             this.loadClassVideos();
         } else {
              if(this.elements.classVideoListContainer) {
                  this.elements.classVideoListContainer.innerHTML = '<p class="text-sm text-slate-500">반과 날짜를 선택해주세요.</p>';
              }
              this.state.currentClassVideos = []; // 비디오 목록 초기화
         }
    },

    async loadClassVideos() {
        const classId = this.state.selectedClassIdForClassVideo;
        const selectedDate = this.state.currentClassVideoDate;
        const listContainer = this.elements.classVideoListContainer;

        if (!classId || !selectedDate || !listContainer) {
             console.warn("[adminApp] Cannot load class videos: missing classId, date, or container."); // ✨ 경고 로그
             if (listContainer) listContainer.innerHTML = '<p class="text-sm text-slate-500">반과 날짜를 선택해주세요.</p>';
             this.state.currentClassVideos = [];
             return;
        }

        console.log(`[adminApp] Loading class videos for class ${classId} on ${selectedDate}`); // ✨ 로그 추가
        listContainer.innerHTML = '<div class="loader-small mx-auto"></div>'; // 로딩 표시

        try {
            const q = query(
                collection(db, 'classLectures'),
                where('classId', '==', classId),
                where('lectureDate', '==', selectedDate)
            );
            const snapshot = await getDocs(q);

            console.log(`[adminApp] Firestore query for classLectures returned ${snapshot.size} documents.`); // ✨ 로그 추가

            if (snapshot.empty) {
                this.state.currentClassVideos = [];
            } else {
                // 해당 날짜+반 조합의 문서는 하나만 있다고 가정
                this.state.currentClassVideos = snapshot.docs[0].data().videos || [];
            }
            console.log("[adminApp] Loaded class videos:", this.state.currentClassVideos); // ✨ 로그 추가
            this.renderClassVideoFields(this.state.currentClassVideos);
        } catch (error) {
            console.error("[adminApp] 수업 영상 로딩 실패:", error); // ✨ 상세 오류 로깅
            showToast("수업 영상을 불러오는 데 실패했습니다.");
            listContainer.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>';
             this.state.currentClassVideos = [];
        }
    },

    renderClassVideoFields(videos) {
        const listContainer = this.elements.classVideoListContainer;
        if (!listContainer) return;

        console.log("[adminApp] Rendering class video fields for:", videos); // ✨ 로그 추가
        listContainer.innerHTML = ''; // 기존 필드 초기화

        if (!Array.isArray(videos) || videos.length === 0) { // videos가 배열인지 확인
             listContainer.innerHTML = '<p class="text-sm text-slate-500">등록된 영상이 없습니다. 아래 버튼으로 추가하세요.</p>';
        } else {
             videos.forEach((video, index) => this.addClassVideoField(video.title, video.url, index));
        }
    },


    addClassVideoField(title = '', url = '', index = -1) {
        const listContainer = this.elements.classVideoListContainer;
        if (!listContainer) return;

        // "등록된 영상 없음" 메시지 제거 (있다면)
        const noVideoMsg = listContainer.querySelector('p.text-slate-500');
        if (noVideoMsg) noVideoMsg.remove();

        const fieldIndex = (index === -1) ? (listContainer.querySelectorAll('.video-field-group').length) : index;

        console.log(`[adminApp] Adding class video field at index ${fieldIndex} with title: "${title}"`); // ✨ 로그 추가

        const div = document.createElement('div');
        div.className = 'video-field-group border p-3 rounded bg-white relative mb-4'; // mb-4 추가
        div.dataset.index = fieldIndex;

        div.innerHTML = `
            <button class="remove-video-field-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none">&times;</button>
            <div class="mb-2">
                <label for="admin-video-title-${fieldIndex}" class="block text-xs font-medium text-slate-600 mb-1">영상 제목 ${fieldIndex + 1}</label>
                <input type="text" id="admin-video-title-${fieldIndex}" class="form-input form-input-sm video-title-input" value="${title}" placeholder="예: 수학 1단원 개념">
            </div>
            <div>
                <label for="admin-video-url-${fieldIndex}" class="block text-xs font-medium text-slate-600 mb-1">YouTube URL ${fieldIndex + 1}</label>
                <input type="url" id="admin-video-url-${fieldIndex}" class="form-input form-input-sm video-url-input" value="${url}" placeholder="https://youtube.com/watch?v=...">
            </div>
        `;

        const removeBtn = div.querySelector('.remove-video-field-btn');
        if (removeBtn) {
             removeBtn.addEventListener('click', (e) => {
                 e.preventDefault();
                 console.log(`[adminApp] Removing class video field at index ${div.dataset.index}`); // ✨ 로그 추가
                 div.remove();
                 this.reindexClassVideoFields(); // 삭제 후 인덱스 재정렬
                 // 영상 필드가 하나도 없으면 메시지 다시 표시
                  if (listContainer.querySelectorAll('.video-field-group').length === 0) {
                     listContainer.innerHTML = '<p class="text-sm text-slate-500">등록된 영상이 없습니다. 아래 버튼으로 추가하세요.</p>';
                  }
             });
        }

        listContainer.appendChild(div);
    },


    reindexClassVideoFields() {
         const listContainer = this.elements.classVideoListContainer;
         if (!listContainer) return;
         const fieldGroups = listContainer.querySelectorAll('.video-field-group');
         console.log(`[adminApp] Reindexing ${fieldGroups.length} class video fields.`); // ✨ 로그 추가
         fieldGroups.forEach((group, newIndex) => {
             group.dataset.index = newIndex;
             const titleLabel = group.querySelector('label[for^="admin-video-title"]');
             const titleInput = group.querySelector('.video-title-input');
             const urlLabel = group.querySelector('label[for^="admin-video-url"]');
             const urlInput = group.querySelector('.video-url-input');

             if (titleLabel) {
                 titleLabel.setAttribute('for', `admin-video-title-${newIndex}`);
                 titleLabel.textContent = `영상 제목 ${newIndex + 1}`;
             }
             if (titleInput) titleInput.id = `admin-video-title-${newIndex}`;
             if (urlLabel) {
                 urlLabel.setAttribute('for', `admin-video-url-${newIndex}`);
                 urlLabel.textContent = `YouTube URL ${newIndex + 1}`;
             }
             if (urlInput) urlInput.id = `admin-video-url-${newIndex}`;
         });
    },

    async saveClassVideos() {
         const classId = this.state.selectedClassIdForClassVideo;
         const selectedDate = this.state.currentClassVideoDate;
         const listContainer = this.elements.classVideoListContainer;
         const saveBtn = this.elements.saveClassVideoBtn;

         if (!classId || !selectedDate || !listContainer || !saveBtn) {
             showToast("반과 날짜가 선택되어야 하며, 저장 버튼과 목록 컨테이너가 필요합니다.");
             return;
         }

         const videoFields = listContainer.querySelectorAll('.video-field-group');
         const videosToSave = [];
         let hasError = false;

         videoFields.forEach(field => {
             const titleInput = field.querySelector('.video-title-input');
             const urlInput = field.querySelector('.video-url-input');

             // 입력 필드가 없는 경우 예외 처리
             if (!titleInput || !urlInput) {
                  console.error(`[adminApp] Video field at index ${field.dataset.index} is missing input elements.`);
                  hasError = true;
                  return; // 다음 필드로 넘어감
             }

             const title = titleInput.value.trim();
             const url = urlInput.value.trim();

             // 입력값 유효성 검사 강화
             titleInput.classList.remove('border-red-500'); // 기존 에러 스타일 제거
             urlInput.classList.remove('border-red-500'); // 기존 에러 스타일 제거

             if (title && url) {
                 // URL 유효성 검사 (간단하게 http로 시작하는지 정도만)
                 if (!url.startsWith('http://') && !url.startsWith('https://')) {
                      showToast(`영상 ${parseInt(field.dataset.index) + 1}의 URL 형식이 올바르지 않습니다. (http:// 또는 https:// 로 시작)`, true);
                      urlInput.classList.add('border-red-500');
                      hasError = true;
                 } else {
                     videosToSave.push({ title, url });
                 }
             } else if (title || url) { // 둘 중 하나만 입력된 경우
                 showToast(`영상 ${parseInt(field.dataset.index) + 1}의 제목과 URL을 모두 입력하거나, 필드를 삭제해주세요.`, true);
                 titleInput.classList.toggle('border-red-500', !title);
                 urlInput.classList.toggle('border-red-500', !url);
                 hasError = true;
             }
             // 둘 다 비어있으면 무시 (저장 안 함)
         });

         if (hasError) return;

         console.log("[adminApp] Saving class videos:", videosToSave); // ✨ 로그 추가
         saveBtn.disabled = true; // 저장 버튼 비활성화

         try {
            const q = query(
                 collection(db, 'classLectures'),
                 where('classId', '==', classId),
                 where('lectureDate', '==', selectedDate)
             );
             const snapshot = await getDocs(q);

             if (videosToSave.length === 0) {
                  if (!snapshot.empty) {
                      const docRef = snapshot.docs[0].ref;
                      await deleteDoc(docRef);
                      showToast("해당 날짜의 모든 수업 영상이 삭제되었습니다.", false);
                       console.log("[adminApp] Deleted class lecture document as no videos were provided."); // ✨ 로그 추가
                  } else {
                       showToast("저장할 영상이 없습니다.", false);
                  }
             } else {
                  const data = {
                      classId: classId,
                      lectureDate: selectedDate,
                      videos: videosToSave,
                  };

                  let docRef;
                  if (snapshot.empty) {
                      data.createdAt = serverTimestamp(); // 새 문서에만 생성 시간 추가
                      docRef = doc(collection(db, 'classLectures')); // 자동 ID로 새 문서 참조 생성
                      await setDoc(docRef, data);
                      console.log("[adminApp] Created new class lecture document."); // ✨ 로그 추가
                  } else {
                      docRef = snapshot.docs[0].ref;
                      // createdAt 필드를 제외하고 업데이트 (merge 옵션 대신 명시적 업데이트)
                      const updateData = {
                          videos: videosToSave,
                          // 필요하다면 lastUpdatedAt: serverTimestamp() 같은 필드 추가
                      };
                      await updateDoc(docRef, updateData);
                      console.log("[adminApp] Updated existing class lecture document."); // ✨ 로그 추가
                  }
                  showToast("수업 영상이 성공적으로 저장되었습니다.", false);
             }

             // 저장 후 현재 상태 업데이트 및 UI 재렌더링
             this.state.currentClassVideos = videosToSave;
             // UI를 다시 렌더링하기 전에 목록 컨테이너가 있는지 확인
             if (this.elements.classVideoListContainer) {
                 this.renderClassVideoFields(this.state.currentClassVideos); // UI 갱신
             }

         } catch (error) {
             console.error("[adminApp] 수업 영상 저장 실패:", error); // ✨ 상세 오류 로깅
             showToast("수업 영상 저장에 실패했습니다.");
         } finally {
             saveBtn.disabled = false; // 저장 버튼 다시 활성화
         }
    },
    // --- 👆 수업 영상 관리 관련 함수 수정 끝 👆 ---

}; // AdminApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export default AdminApp;