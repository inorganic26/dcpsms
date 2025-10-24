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
        currentClassVideos: [], // 이제 로드된 영상 목록 [{title, url}, ...]
        editingClassVideoIndex: null, // 수정 중인 수업 영상의 배열 인덱스
        selectedClassIdForQnaVideo: null,
        currentQnaVideoDate: null,
        editingQnaVideoId: null, // 수정 중인 질문 영상 ID 추가
    },

    init() {
        // ... (init 내용 동일) ...
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
        // ... (handleSecretLogin 내용 동일) ...
        const inputPasswordEl = document.getElementById('admin-secret-password');
        if (!inputPasswordEl) return;
        const inputPassword = inputPasswordEl.value;

        // 실제 비밀번호 대신 환경 변수나 다른 안전한 방법 사용 권장
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
        // ... (showDashboard 내용 동일) ...
        const initialLogin = document.getElementById('admin-initial-login');
        const mainDashboard = document.getElementById('admin-main-dashboard');
        if (initialLogin) initialLogin.style.display = 'none';
        if (mainDashboard) mainDashboard.style.display = 'block';

        if (!this.isInitialized) {
            this.initializeDashboard();
        }
    },

    initializeDashboard() {
        // ... (initializeDashboard 내용 동일) ...
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
        this.addEventListeners();
        this.showAdminSection('dashboard');
        console.log("[adminApp] Dashboard initialized.");
    },


    cacheElements() {
        // ... (cacheElements 내용 동일) ...
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
            qnaVideosList: document.getElementById('admin-qna-videos-list'), // 질문 영상 목록 컨테이너 ID 추가

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

            // ======== 수업 영상 관리 요소 수정/추가 ========
            classVideoClassSelect: document.getElementById('admin-class-video-class-select'),
            classVideoDateInput: document.getElementById('admin-class-video-date'),
            classVideoListContainer: document.getElementById('admin-class-video-list-container'),
            // addClassVideoFieldBtn 제거
            saveClassVideoBtn: document.getElementById('admin-save-class-video-btn'), // 기존 저장 버튼은 추가/수정용으로 사용
            classVideoTitleInput: document.getElementById('admin-class-video-title'), // 제목 입력 필드 추가
            classVideoUrlInput: document.getElementById('admin-class-video-url'), // URL 입력 필드 추가
            // ===========================================
        };
    },

    addEventListeners() {
        // ... (이전과 동일) ...
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

        // 뒤로가기 버튼 이벤트
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });

        // 질문 영상 저장 버튼
        this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo());
        // 질문 영상 날짜/반 선택 이벤트 (순서 변경됨)
        this.elements.qnaVideoDate?.addEventListener('change', (e) => this.handleQnaVideoDateChange(e.target.value));
        this.elements.qnaClassSelect?.addEventListener('change', (e) => this.handleQnaVideoClassChange(e.target.value));

        // ======== 수업 영상 관리 이벤트 리스너 수정 ========
        this.elements.classVideoDateInput?.addEventListener('change', (e) => this.handleClassVideoDateChange(e.target.value));
        this.elements.classVideoClassSelect?.addEventListener('change', (e) => this.handleClassVideoClassChange(e.target.value));
        // addClassVideoFieldBtn 리스너 제거
        this.elements.saveClassVideoBtn?.addEventListener('click', () => this.saveOrUpdateClassVideo()); // 호출 함수 변경
        // ===========================================

        // 사용자 정의 이벤트 리스너
        document.addEventListener('subjectsUpdated', () => {
            console.log("[adminApp] 'subjectsUpdated' event received.");
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
        });
        document.addEventListener('classesUpdated', () => {
            console.log("[adminApp] 'classesUpdated' event received.");
            this.populateClassSelectForQnaVideo();
            this.populateClassSelectForClassVideo();
            if (studentAssignmentManager && typeof studentAssignmentManager.populateClassSelects === 'function') {
                console.log("[adminApp] Populating student assignment class selects.");
                studentAssignmentManager.populateClassSelects();
            } else {
                console.warn("[adminApp] studentAssignmentManager or populateClassSelects function not found.");
            }
        });
        console.log("[adminApp] Event listeners added.");
    },


    showAdminSection(sectionName) {
        // ... (이전과 동일) ...
        console.log(`[adminApp] Attempting to show section: ${sectionName}`);

        Object.keys(this.elements).forEach(key => {
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
            'class-video-mgmt': this.elements.classVideoMgmtView,
        };

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
                this.initQnaVideoView(); // 날짜 먼저 선택 로직으로 초기화
                break;
            case 'class-video-mgmt':
                this.initClassVideoView(); // 날짜 먼저 선택 로직으로 초기화
                break;
             case 'student-assignment':
                 if (studentAssignmentManager && typeof studentAssignmentManager.populateClassSelects === 'function') {
                    studentAssignmentManager.populateClassSelects();
                    studentAssignmentManager.resetView();
                 }
                break;
        }
    },

    // --- 👇 질문 영상 관리 뷰 초기화 함수 수정 (날짜 먼저, 반 비활성화) 👇 ---
    initQnaVideoView() {
        console.log("[adminApp] Initializing QnA Video View...");
        const dateInput = this.elements.qnaVideoDate;
        const classSelect = this.elements.qnaClassSelect;

        // 1. 날짜 기본값 설정 (오늘) 및 상태 업데이트
        if (dateInput) {
            const today = new Date().toISOString().slice(0, 10);
            if (!dateInput.value || dateInput.value !== today) {
                dateInput.value = today;
            }
            this.state.currentQnaVideoDate = dateInput.value;
            console.log(`[adminApp] QnA Video Date initialized to: ${this.state.currentQnaVideoDate}`);
        } else {
            this.state.currentQnaVideoDate = null;
        }

        // 2. 반 목록 채우기 (HTML에서 disabled 상태로 시작)
        this.populateClassSelectForQnaVideo();

        // 3. 날짜가 설정되었으면 반 드롭다운 활성화
        if (classSelect && this.state.currentQnaVideoDate) {
            classSelect.disabled = false;
        }

        // 4. 초기 목록 로드 시도 (날짜와 (자동)선택된 반 기준)
        this.loadQnaVideos();

        // 5. 수정 모드 초기화
        this.state.editingQnaVideoId = null;
        if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
        if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
        if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
    },
    // --- 👆 질문 영상 관리 뷰 초기화 함수 수정 끝 👆 ---

    // --- 👇 질문 영상 반 드롭다운 채우기 함수 수정 (자동 로드 제거) 👇 ---
    populateClassSelectForQnaVideo() {
        const select = this.elements.qnaClassSelect;
        if (!select) {
            console.warn("[adminApp] qnaClassSelect element not found."); return;
        }
        console.log("[adminApp] Populating QnA Video class select. Current classes:", this.state.classes);
        const currentSelection = this.state.selectedClassIdForQnaVideo || select.value;
        select.innerHTML = '<option value="">-- 반 선택 --</option>';

        if (!this.state.classes || this.state.classes.length === 0) {
             console.warn("[adminApp] No classes available to populate QnA dropdown.");
             select.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
             select.disabled = true; // 반 없으면 비활성화
             this.handleQnaVideoClassChange(''); // 비디오 목록 초기화
             return;
        }

        this.state.classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });

        // 기존 선택값 유지 또는 첫 번째 반 선택 (날짜가 선택된 경우)
         if (this.state.classes.some(c => c.id === currentSelection)) {
            select.value = currentSelection;
            this.state.selectedClassIdForQnaVideo = currentSelection;
         } else if (this.state.classes.length > 0 && this.state.currentQnaVideoDate) { // 날짜 있을 때만
             const firstClassId = this.state.classes[0].id;
             select.value = firstClassId;
             this.state.selectedClassIdForQnaVideo = firstClassId;
             console.log(`[adminApp] Auto-selected first class for QnA: ${firstClassId}`);
         } else {
             select.value = '';
             this.state.selectedClassIdForQnaVideo = null;
         }

        // 날짜가 선택된 상태면 드롭다운 활성화, 아니면 비활성화 (init에서 이미 처리하지만 중복 확인)
        select.disabled = !this.state.currentQnaVideoDate;

        console.log("[adminApp] QnA Video class select populated.");
        // 여기서 loadQnaVideos() 호출 제거됨
    },
    // --- 👆 질문 영상 반 드롭다운 채우기 함수 수정 끝 👆 ---

    // --- 👇 질문 영상 날짜 변경 핸들러 수정 (반 드롭다운 활성화) 👇 ---
    handleQnaVideoDateChange(selectedDate) {
         console.log(`[adminApp] QnA Video Date changed to: ${selectedDate}`);
         this.state.currentQnaVideoDate = selectedDate || null;
         const classSelect = this.elements.qnaClassSelect;

         if (classSelect) {
             classSelect.disabled = !selectedDate; // 날짜 선택 여부에 따라 활성화/비활성화
             if (!selectedDate) {
                 // 날짜 해제 시 반 선택 초기화 및 목록 비우기
                 classSelect.value = '';
                 this.state.selectedClassIdForQnaVideo = null;
                 if (this.elements.qnaVideosList) {
                     this.elements.qnaVideosList.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>';
                 }
                 // 수정 모드 초기화
                 this.state.editingQnaVideoId = null;
                 if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
                 if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
                 if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
                 return; // 로드 중단
             } else if (classSelect.value === '' && this.state.classes.length > 0) {
                // 날짜 선택 시, 반이 비어 있으면 첫 반 자동 선택 시도
                const firstClassId = this.state.classes[0].id;
                classSelect.value = firstClassId;
                this.state.selectedClassIdForQnaVideo = firstClassId;
                console.log(`[adminApp] Auto-selected first class for QnA after date change: ${firstClassId}`);
            }
         }
         // 날짜 변경 시에도 수정 모드 초기화
         this.state.editingQnaVideoId = null;
         if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
         if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
         if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';

         this.loadQnaVideos(); // 날짜 변경 시 목록 새로고침
    },
    // --- 👆 질문 영상 날짜 변경 핸들러 수정 끝 👆 ---

    // --- 👇 질문 영상 반 변경 핸들러 수정 (로직 동일) 👇 ---
    handleQnaVideoClassChange(classId) {
         console.log(`[adminApp] QnA Video Class changed to: ${classId}`);
         this.state.selectedClassIdForQnaVideo = classId || null;
         // 반 변경 시에도 수정 모드 초기화
         this.state.editingQnaVideoId = null;
         if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
         if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
         if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
         this.loadQnaVideos(); // 반 변경 시 목록 새로고침
    },
    // --- 👆 질문 영상 반 변경 핸들러 수정 끝 👆 ---

    async saveQnaVideo() {
        // ... (saveQnaVideo 내용 동일, 로직 수정 없음) ...
        const classId = this.state.selectedClassIdForQnaVideo;
        const videoDate = this.state.currentQnaVideoDate;
        const title = this.elements.qnaVideoTitle?.value.trim();
        const url = this.elements.qnaVideoUrl?.value.trim();
        const editingId = this.state.editingQnaVideoId;

        if (!classId || !videoDate || !title || !url) {
            showToast("날짜, 반, 제목, URL을 모두 입력해주세요."); // 메시지 수정
            return;
        }

        const videoData = { classId, videoDate, title, youtubeUrl: url };

        try {
            if (editingId) {
                console.log(`[adminApp] Updating QnA video ID: ${editingId}`);
                const videoRef = doc(db, 'classVideos', editingId);
                await updateDoc(videoRef, videoData);
                showToast("질문 영상 수정 성공!", false);
            } else {
                console.log("[adminApp] Adding new QnA video:", videoData);
                videoData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'classVideos'), videoData);
                showToast("질문 영상 저장 성공!", false);
            }

            this.state.editingQnaVideoId = null;
            if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
            if(this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
            if(this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
            this.loadQnaVideos();

        } catch (error) {
            console.error(`[adminApp] 질문 영상 ${editingId ? '수정' : '저장'} 실패:`, error);
            showToast(`영상 ${editingId ? '수정' : '저장'} 실패.`);
        }
    },

    async loadQnaVideos() {
        // ... (loadQnaVideos 내용 동일, 로직 수정 없음) ...
        const classId = this.state.selectedClassIdForQnaVideo;
        const selectedDate = this.state.currentQnaVideoDate;
        const listEl = this.elements.qnaVideosList;

        if (!listEl) { console.error("[adminApp] QnA video list element not found."); return; }
        // 날짜/반 선택 유도 메시지 순서 변경
        if (!selectedDate) {
            listEl.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>';
            return;
        }
        if (!classId) {
            listEl.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>';
            return;
        }

        console.log(`[adminApp] Loading QnA videos for class ${classId} on ${selectedDate}`);
        listEl.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            const q = query(
                collection(db, 'classVideos'),
                where('classId', '==', classId),
                where('videoDate', '==', selectedDate),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            listEl.innerHTML = '';

            if (snapshot.empty) {
                listEl.innerHTML = '<p class="text-sm text-slate-500">해당 날짜에 등록된 질문 영상이 없습니다.</p>';
                return;
            }

            snapshot.docs.forEach(docSnap => {
                const video = docSnap.data();
                const videoId = docSnap.id;
                const div = document.createElement('div');
                div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm';
                div.innerHTML = `
                    <div class="flex-grow mr-4 overflow-hidden">
                        <p class="font-medium text-slate-700 break-words">${video.title || '제목 없음'}</p>
                        <a href="${video.youtubeUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.youtubeUrl || 'URL 없음'}</a>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button data-id="${videoId}" class="edit-qna-video-btn btn btn-secondary btn-sm">수정</button>
                        <button data-id="${videoId}" class="delete-qna-video-btn btn btn-danger btn-sm">삭제</button>
                    </div>
                `;
                div.querySelector('.edit-qna-video-btn')?.addEventListener('click', (e) => {
                    this.openQnaVideoEditMode(e.target.dataset.id);
                });
                div.querySelector('.delete-qna-video-btn')?.addEventListener('click', async (e) => {
                    const videoDocId = e.target.dataset.id;
                    if (confirm(`'${video.title}' 영상을 정말 삭제하시겠습니까?`)) {
                        try {
                            await deleteDoc(doc(db, 'classVideos', videoDocId));
                            showToast("영상이 삭제되었습니다.", false);
                            if (this.state.editingQnaVideoId === videoDocId) {
                                this.state.editingQnaVideoId = null;
                                if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = '';
                                if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = '';
                                if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
                            }
                            this.loadQnaVideos();
                        } catch (err) {
                            console.error("[adminApp] Error deleting QnA video:", err);
                            showToast("영상 삭제 실패");
                        }
                    }
                });
                listEl.appendChild(div);
            });

        } catch (error) {
            console.error("[adminApp] Error loading QnA videos:", error);
            listEl.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>';
            showToast("질문 영상 목록 로딩 중 오류 발생", true);
        }
    },

    async openQnaVideoEditMode(videoId) {
        // ... (openQnaVideoEditMode 내용 동일, 로직 수정 없음) ...
        if (!videoId) return;
        console.log(`[adminApp] Opening QnA video edit mode for ID: ${videoId}`);

        try {
            const videoRef = doc(db, 'classVideos', videoId);
            const videoSnap = await getDoc(videoRef);

            if (videoSnap.exists()) {
                const videoData = videoSnap.data();
                if (this.elements.qnaVideoTitle) this.elements.qnaVideoTitle.value = videoData.title || '';
                if (this.elements.qnaVideoUrl) this.elements.qnaVideoUrl.value = videoData.youtubeUrl || '';

                this.state.editingQnaVideoId = videoId;
                if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '수정하기';

                showToast("영상 정보를 불러왔습니다. 수정 후 [수정하기] 버튼을 누르세요.", false);
                 this.elements.qnaVideoTitle?.scrollIntoView({ behavior: 'smooth', block: 'center' });

            } else {
                showToast("수정할 영상 정보를 찾을 수 없습니다.");
                this.state.editingQnaVideoId = null;
                if (this.elements.saveQnaVideoBtn) this.elements.saveQnaVideoBtn.textContent = '영상 저장하기';
            }
        } catch (error) {
            console.error("[adminApp] Error fetching QnA video for editing:", error);
            showToast("영상 정보를 불러오는 중 오류 발생.");
        }
    },

    // --- 👇 수업 영상 관리 뷰 초기화 함수 수정 (날짜 먼저, 반 비활성화) 👇 ---
    initClassVideoView() {
        console.log("[adminApp] Initializing Class Video View...");
        const dateInput = this.elements.classVideoDateInput;
        const classSelect = this.elements.classVideoClassSelect;
        const titleInput = this.elements.classVideoTitleInput;
        const urlInput = this.elements.classVideoUrlInput;
        const saveBtn = this.elements.saveClassVideoBtn;

        // 1. 날짜 기본값 설정 (오늘) 및 상태 업데이트
        if (dateInput) {
            const today = new Date().toISOString().slice(0, 10);
            if (!dateInput.value || dateInput.value !== today) {
                dateInput.value = today;
            }
            this.state.currentClassVideoDate = dateInput.value;
            console.log(`[adminApp] Class Video Date initialized to: ${this.state.currentClassVideoDate}`);
        } else {
            this.state.currentClassVideoDate = null;
        }

        // 2. 반 목록 채우기 (HTML에서 disabled 상태로 시작)
        this.populateClassSelectForClassVideo();

        // 3. 날짜가 설정되었으면 반 드롭다운 활성화
        if (classSelect && this.state.currentClassVideoDate) {
            classSelect.disabled = false;
        }

        // 4. 초기 목록 로드 시도 (날짜와 (자동)선택된 반 기준)
        this.loadClassVideos();

        // 5. 수정/추가 관련 상태 초기화
        this.state.editingClassVideoIndex = null;
        if (titleInput) titleInput.value = '';
        if (urlInput) urlInput.value = '';
        if (saveBtn) saveBtn.textContent = '영상 저장하기';
    },
    // --- 👆 수업 영상 관리 뷰 초기화 함수 수정 끝 👆 ---

    // --- 👇 수업 영상 반 드롭다운 채우기 함수 수정 (자동 로드 제거) 👇 ---
    populateClassSelectForClassVideo() {
        const select = this.elements.classVideoClassSelect;
        if (!select) {
            console.warn("[adminApp] classVideoClassSelect element not found."); return;
        }
        console.log("[adminApp] Populating Class Video class select. Current classes:", this.state.classes);
        const currentSelection = this.state.selectedClassIdForClassVideo || select.value;
        select.innerHTML = '<option value="">-- 반 선택 --</option>';

        if (!this.state.classes || this.state.classes.length === 0) {
             console.warn("[adminApp] No classes available to populate Class Video dropdown.");
             select.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
             select.disabled = true; // 반 없으면 비활성화
             this.handleClassVideoClassChange(''); // 비디오 목록 초기화
             return;
        }

        this.state.classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });

        // 기존 선택값 유지 또는 첫 번째 반 선택 (날짜가 선택된 경우)
         if (this.state.classes.some(c => c.id === currentSelection)) {
            select.value = currentSelection;
            this.state.selectedClassIdForClassVideo = currentSelection;
         } else if (this.state.classes.length > 0 && this.state.currentClassVideoDate) { // 날짜 있을 때만
             const firstClassId = this.state.classes[0].id;
             select.value = firstClassId;
             this.state.selectedClassIdForClassVideo = firstClassId;
             console.log(`[adminApp] Auto-selected first class for Class Video: ${firstClassId}`);
         } else {
             select.value = '';
             this.state.selectedClassIdForClassVideo = null;
         }

        // 날짜가 선택된 상태면 드롭다운 활성화, 아니면 비활성화 (HTML에서 disabled 상태로 시작)
        select.disabled = !this.state.currentClassVideoDate;

        console.log("[adminApp] Class Video class select populated.");
        // 여기서 loadClassVideos() 호출 제거됨
    },
    // --- 👆 수업 영상 반 드롭다운 채우기 함수 수정 끝 👆 ---

    // --- 👇 수업 영상 날짜 변경 핸들러 수정 (반 드롭다운 활성화) 👇 ---
    handleClassVideoDateChange(selectedDate) {
         console.log(`[adminApp] Class Video Date changed to: ${selectedDate}`);
         this.state.currentClassVideoDate = selectedDate || null;
         const classSelect = this.elements.classVideoClassSelect;
         const titleInput = this.elements.classVideoTitleInput;
         const urlInput = this.elements.classVideoUrlInput;
         const saveBtn = this.elements.saveClassVideoBtn;

         if (classSelect) {
             classSelect.disabled = !selectedDate; // 날짜 선택 여부에 따라 활성화/비활성화
             if (!selectedDate) {
                 // 날짜 해제 시 반 선택 초기화 및 목록 비우기
                 classSelect.value = '';
                 this.state.selectedClassIdForClassVideo = null;
                 if (this.elements.classVideoListContainer) {
                     this.elements.classVideoListContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>';
                 }
                 this.state.currentClassVideos = [];
                 this.state.editingClassVideoIndex = null; // 수정 상태 초기화
                 if (titleInput) titleInput.value = '';
                 if (urlInput) urlInput.value = '';
                 if (saveBtn) saveBtn.textContent = '영상 저장하기';
                 return; // 로드 중단
             } else if (classSelect.value === '' && this.state.classes.length > 0) {
                 // 날짜 선택 시, 반이 비어 있으면 첫 반 자동 선택 시도
                 const firstClassId = this.state.classes[0].id;
                 classSelect.value = firstClassId;
                 this.state.selectedClassIdForClassVideo = firstClassId;
                 console.log(`[adminApp] Auto-selected first class for Class Video after date change: ${firstClassId}`);
             }
         }

         // 날짜 변경 시 수정 상태 초기화
         this.state.editingClassVideoIndex = null;
         if (titleInput) titleInput.value = '';
         if (urlInput) urlInput.value = '';
         if (saveBtn) saveBtn.textContent = '영상 저장하기';

         this.loadClassVideos(); // 날짜 변경 시 목록 새로고침
    },
    // --- 👆 수업 영상 날짜 변경 핸들러 수정 끝 👆 ---

    // --- 👇 수업 영상 반 변경 핸들러 수정 (수정 상태 초기화 추가) 👇 ---
    handleClassVideoClassChange(classId) {
         console.log(`[adminApp] Class Video Class changed to: ${classId}`);
         this.state.selectedClassIdForClassVideo = classId || null;
         const titleInput = this.elements.classVideoTitleInput;
         const urlInput = this.elements.classVideoUrlInput;
         const saveBtn = this.elements.saveClassVideoBtn;

         // 반 변경 시 수정 상태 초기화
         this.state.editingClassVideoIndex = null;
         if (titleInput) titleInput.value = '';
         if (urlInput) urlInput.value = '';
         if (saveBtn) saveBtn.textContent = '영상 저장하기';

         this.loadClassVideos(); // 반 변경 시 목록 새로고침
    },
    // --- 👆 수업 영상 반 변경 핸들러 수정 끝 👆 ---

    async loadClassVideos() {
        // ... (내용 거의 동일, 에러 메시지/로그 수정) ...
        const classId = this.state.selectedClassIdForClassVideo;
        const selectedDate = this.state.currentClassVideoDate;
        const listContainer = this.elements.classVideoListContainer;

        if (!listContainer) { console.error("[adminApp] classVideoListContainer element not found."); return; }
        // 날짜/반 선택 유도 메시지 순서 변경
        if (!selectedDate) {
            listContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>';
            this.state.currentClassVideos = []; return;
        }
        if (!classId) {
            listContainer.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>';
            this.state.currentClassVideos = []; return;
        }

        console.log(`[adminApp] Loading class videos for class ${classId} on ${selectedDate}`);
        listContainer.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            const q = query(
                collection(db, 'classLectures'),
                where('classId', '==', classId),
                where('lectureDate', '==', selectedDate)
            );
            const snapshot = await getDocs(q);
            console.log(`[adminApp] Firestore query for classLectures returned ${snapshot.size} documents.`);

            if (snapshot.empty) {
                this.state.currentClassVideos = [];
            } else {
                // 해당 날짜/반에 문서가 여러 개 있을 경우 첫 번째 문서만 사용 (개선 필요 시 로직 수정)
                this.state.currentClassVideos = snapshot.docs[0].data().videos || [];
            }
            console.log("[adminApp] Loaded class videos:", this.state.currentClassVideos);
            // renderClassVideoFields 대신 renderClassVideoList 호출
            this.renderClassVideoList(this.state.currentClassVideos);
        } catch (error) {
            console.error("[adminApp] 수업 영상 로딩 실패:", error);
            showToast("수업 영상을 불러오는 데 실패했습니다.");
            listContainer.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>';
            this.state.currentClassVideos = [];
        }
    },

    // ======== 수업 영상 목록 렌더링 함수 (신규) ========
    renderClassVideoList(videos) {
        const listContainer = this.elements.classVideoListContainer;
        if (!listContainer) return;
        console.log("[adminApp] Rendering class video list for:", videos);
        listContainer.innerHTML = ''; // 기존 목록 비우기

        if (!Array.isArray(videos) || videos.length === 0) {
            listContainer.innerHTML = '<p class="text-sm text-slate-500">등록된 영상이 없습니다.</p>';
            return;
        }

        // videos 배열 순서대로 렌더링 (필요시 정렬 로직 추가)
        videos.forEach((video, index) => {
            const div = document.createElement('div');
            div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm';
            // data-index 속성에 배열 인덱스 저장
            div.innerHTML = `
                <div class="flex-grow mr-4 overflow-hidden">
                    <p class="font-medium text-slate-700 break-words">${index + 1}. ${video.title || '제목 없음'}</p>
                    <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.url || 'URL 없음'}</a>
                </div>
                <div class="flex gap-2 flex-shrink-0">
                    <button data-index="${index}" class="edit-class-video-btn btn btn-secondary btn-sm">수정</button>
                    <button data-index="${index}" class="delete-class-video-btn btn btn-danger btn-sm">삭제</button>
                </div>
            `;
            // 수정 버튼 이벤트
            div.querySelector('.edit-class-video-btn')?.addEventListener('click', (e) => {
                const videoIndex = parseInt(e.target.dataset.index, 10); // index 가져오기
                this.openClassVideoEditMode(videoIndex);
            });
            // 삭제 버튼 이벤트
            div.querySelector('.delete-class-video-btn')?.addEventListener('click', (e) => {
                const videoIndex = parseInt(e.target.dataset.index, 10); // index 가져오기
                this.deleteClassVideo(videoIndex);
            });
            listContainer.appendChild(div);
        });
    },
    // ===========================================

    // ======== 수업 영상 수정 모드 열기 함수 (신규) ========
    openClassVideoEditMode(index) {
        if (index === undefined || index < 0 || index >= this.state.currentClassVideos.length) {
            console.error(`[adminApp] Invalid index for editing class video: ${index}`);
            return;
        }
        console.log(`[adminApp] Opening Class video edit mode for index: ${index}`);

        const videoData = this.state.currentClassVideos[index];
        const titleInput = this.elements.classVideoTitleInput;
        const urlInput = this.elements.classVideoUrlInput;
        const saveBtn = this.elements.saveClassVideoBtn;

        if (titleInput) titleInput.value = videoData.title || '';
        if (urlInput) urlInput.value = videoData.url || '';

        this.state.editingClassVideoIndex = index; // 인덱스 저장
        if (saveBtn) saveBtn.textContent = '수정하기';

        showToast("영상 정보를 불러왔습니다. 수정 후 [수정하기] 버튼을 누르세요.", false);
        titleInput?.scrollIntoView({ behavior: 'smooth', block: 'center' }); // 입력 필드로 스크롤
    },
    // ===========================================

    // ======== 수업 영상 삭제 함수 (신규) ========
    async deleteClassVideo(index) {
        if (index === undefined || index < 0 || index >= this.state.currentClassVideos.length) {
            console.error(`[adminApp] Invalid index for deleting class video: ${index}`);
            return;
        }
        const videoToDelete = this.state.currentClassVideos[index];
        if (!confirm(`'${videoToDelete.title}' 영상을 정말 삭제하시겠습니까?`)) return;

        console.log(`[adminApp] Deleting class video at index ${index}:`, videoToDelete);

        // 1. 로컬 상태(배열)에서 해당 비디오 제거
        this.state.currentClassVideos.splice(index, 1);

        // 2. 변경된 로컬 상태를 Firestore에 저장 (saveClassVideos 함수 재활용)
        await this.saveClassVideos(this.state.currentClassVideos); // 수정된 배열 전달

        // 3. 수정 중이던 영상이 삭제된 경우, 수정 상태 초기화
        if (this.state.editingClassVideoIndex === index) {
            this.state.editingClassVideoIndex = null;
            if (this.elements.classVideoTitleInput) this.elements.classVideoTitleInput.value = '';
            if (this.elements.classVideoUrlInput) this.elements.classVideoUrlInput.value = '';
            if (this.elements.saveClassVideoBtn) this.elements.saveClassVideoBtn.textContent = '영상 저장하기';
        } else if (this.state.editingClassVideoIndex !== null && this.state.editingClassVideoIndex > index) {
            // 삭제된 항목보다 뒤에 있는 항목을 수정 중이었다면 인덱스 조정
            this.state.editingClassVideoIndex--;
        }

        // 4. 목록 다시 렌더링 (saveClassVideos 내부에서 처리됨)
        showToast("영상이 삭제되었습니다.", false);
    },
    // ===========================================

    // ======== 수업 영상 추가/수정 저장 함수 (신규) ========
    async saveOrUpdateClassVideo() {
        const titleInput = this.elements.classVideoTitleInput;
        const urlInput = this.elements.classVideoUrlInput;
        const title = titleInput?.value.trim();
        const url = urlInput?.value.trim();
        const editingIndex = this.state.editingClassVideoIndex;

        if (!title || !url) {
            showToast("영상 제목과 URL을 모두 입력해주세요.");
            return;
        }
         if (!url.startsWith('http://') && !url.startsWith('https://')) {
             showToast(`URL 형식이 올바르지 않습니다. (http:// 또는 https:// 로 시작)`, true);
             urlInput?.classList.add('border-red-500'); return;
         } else {
             urlInput?.classList.remove('border-red-500');
         }

        const newVideoData = { title, url };
        let updatedVideos = [...this.state.currentClassVideos]; // 현재 목록 복사

        if (editingIndex !== null && editingIndex >= 0 && editingIndex < updatedVideos.length) {
            // 수정 모드
            console.log(`[adminApp] Updating class video at index ${editingIndex}:`, newVideoData);
            updatedVideos[editingIndex] = newVideoData; // 해당 인덱스 데이터 교체
        } else {
            // 추가 모드
            console.log("[adminApp] Adding new class video:", newVideoData);
            updatedVideos.push(newVideoData); // 배열 끝에 추가
        }

        // 변경된 배열을 Firestore에 저장
        await this.saveClassVideos(updatedVideos);

        // 입력 필드 초기화 및 수정 상태 해제
        this.state.editingClassVideoIndex = null;
        if (titleInput) titleInput.value = '';
        if (urlInput) urlInput.value = '';
        if (this.elements.saveClassVideoBtn) this.elements.saveClassVideoBtn.textContent = '영상 저장하기';

        showToast(`영상 ${editingIndex !== null ? '수정' : '저장'} 성공!`, false);
    },
    // ===========================================

    // ======== 수업 영상 배열 Firestore 저장 함수 (수정됨) ========
    async saveClassVideos(videosToSave) { // 인수로 저장할 배열을 받음
        const classId = this.state.selectedClassIdForClassVideo;
        const selectedDate = this.state.currentClassVideoDate;
        const saveBtn = this.elements.saveClassVideoBtn; // 버튼 참조 추가

        // 필수 정보 확인
        if (!selectedDate || !classId) {
            showToast("날짜와 반이 모두 선택되어야 합니다.", true); // 에러로 표시
            return;
        }

        console.log("[adminApp] Saving class videos to Firestore:", videosToSave);
        if (saveBtn) saveBtn.disabled = true; // 저장 버튼 비활성화

        try {
            const q = query(
                 collection(db, 'classLectures'),
                 where('classId', '==', classId),
                 where('lectureDate', '==', selectedDate)
             );
             const snapshot = await getDocs(q);

             if (!Array.isArray(videosToSave) || videosToSave.length === 0) {
                 // 저장할 영상이 없고 기존 문서가 있으면 삭제
                 if (!snapshot.empty) {
                     const docRef = snapshot.docs[0].ref;
                     await deleteDoc(docRef);
                     console.log("[adminApp] Deleted class lecture document as no videos were provided.");
                 }
                 this.state.currentClassVideos = []; // 로컬 상태도 업데이트
             } else {
                 // 저장할 영상이 있으면 문서 생성 또는 업데이트
                 const data = { classId: classId, lectureDate: selectedDate, videos: videosToSave };
                 let docRef;
                 if (snapshot.empty) {
                     // 새 문서 생성
                     data.createdAt = serverTimestamp(); // 최초 생성 시 타임스탬프 추가
                     docRef = doc(collection(db, 'classLectures'));
                     await setDoc(docRef, data);
                     console.log("[adminApp] Created new class lecture document.");
                 } else {
                     // 기존 문서 업데이트 (Firestore 문서 ID 유지)
                     docRef = snapshot.docs[0].ref;
                     // updatedAt 필드 추가/갱신 (선택 사항)
                     // data.updatedAt = serverTimestamp();
                     // updateDoc 대신 setDoc으로 전체 데이터를 덮어쓰거나 merge: true 옵션 사용 가능
                     // 여기서는 videos 필드만 업데이트
                     await updateDoc(docRef, { videos: videosToSave });
                     console.log("[adminApp] Updated existing class lecture document.");
                 }
                 this.state.currentClassVideos = videosToSave; // 로컬 상태 업데이트
             }
             // 목록 다시 렌더링
             this.renderClassVideoList(this.state.currentClassVideos);

         } catch (error) {
             console.error("[adminApp] 수업 영상 Firestore 저장 실패:", error);
             showToast("수업 영상 저장에 실패했습니다.");
         } finally {
             if (saveBtn) saveBtn.disabled = false; // 저장 버튼 활성화
         }
    },
    // ===========================================

    // --- (과목 옵션 등 나머지 함수는 이전과 동일) ---
    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook;
        if (!select) {
             console.warn("[adminApp] subjectSelectForTextbook element not found."); return;
        }
        console.log("[adminApp] Rendering subject options for Textbook manager. Subjects:", this.state.subjects);
        const currentSelection = select.value || this.state.selectedSubjectIdForTextbook;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) {
             select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
             if(this.elements.textbookManagementContent) this.elements.textbookManagementContent.style.display = 'none';
             return;
        }
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection;
            this.state.selectedSubjectIdForTextbook = currentSelection;
            if (textbookManager && typeof textbookManager.handleSubjectSelectForTextbook === 'function') {
                textbookManager.handleSubjectSelectForTextbook(currentSelection);
            }
        } else {
             select.value = '';
             this.state.selectedSubjectIdForTextbook = null;
             if (textbookManager && typeof textbookManager.handleSubjectSelectForTextbook === 'function') {
                 textbookManager.handleSubjectSelectForTextbook('');
             }
        }
    },

    renderSubjectOptionsForLesson() {
        const select = this.elements.subjectSelectForLesson;
        if (!select) {
            console.warn("[adminApp] subjectSelectForLesson element not found."); return;
        }
        console.log("[adminApp] Rendering subject options for Lesson manager. Subjects:", this.state.subjects);
        const currentSelection = select.value || this.state.selectedSubjectIdForLesson;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            if(this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
            if(this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
            return;
        }
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection;
            this.state.selectedSubjectIdForLesson = currentSelection;
            // lessonManager 객체 자체에 접근해야 함 (lessonManager.js에서 export된 객체)
            if (lessonManager && typeof lessonManager.handleLessonFilterChange === 'function') {
                 console.log("[adminApp] Triggering lessonManager.handleLessonFilterChange for selected subject.");
                 lessonManager.handleLessonFilterChange();
            } else {
                 // lessonManager.js에서 생성된 실제 인스턴스의 함수를 호출하도록 시도
                 if (lessonManager && lessonManager.managerInstance && typeof lessonManager.managerInstance.handleLessonFilterChange === 'function') {
                    console.log("[adminApp] Triggering lessonManager.managerInstance.handleLessonFilterChange for selected subject.");
                    lessonManager.managerInstance.handleLessonFilterChange();
                 } else {
                    console.warn("[adminApp] lessonManager or its instance/handleLessonFilterChange not found.");
                 }
            }
        } else {
             select.value = '';
             this.state.selectedSubjectIdForLesson = null;
             if (lessonManager && typeof lessonManager.handleLessonFilterChange === 'function') {
                  console.log("[adminApp] Triggering lessonManager.handleLessonFilterChange for empty selection.");
                 lessonManager.handleLessonFilterChange();
             } else {
                  // lessonManager.js에서 생성된 실제 인스턴스의 함수를 호출하도록 시도
                  if (lessonManager && lessonManager.managerInstance && typeof lessonManager.managerInstance.handleLessonFilterChange === 'function') {
                     console.log("[adminApp] Triggering lessonManager.managerInstance.handleLessonFilterChange for empty selection.");
                     lessonManager.managerInstance.handleLessonFilterChange();
                  } else {
                     console.warn("[adminApp] lessonManager or its instance/handleLessonFilterChange not found.");
                  }
             }
        }
    },


}; // AdminApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export default AdminApp;