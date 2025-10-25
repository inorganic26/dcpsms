// src/admin/adminApp.js

import { auth, signInAnonymously } from '../shared/firebase.js'; // db 관련 import 제거 (여기선 불필요)
import { showToast } from '../shared/utils.js';

// 기존 관리자 모듈 import
import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
import { teacherManager } from './teacherManager.js';
import { lessonManager } from './lessonManager.js';
import { studentAssignmentManager } from './studentAssignmentManager.js';
import { adminHomeworkDashboard } from './adminHomeworkDashboard.js';
import { adminClassVideoManager } from './adminClassVideoManager.js';
import { reportManager } from '../shared/reportManager.js'; // reportManager import 추가

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: {
        subjects: [],
        classes: [],
        students: [],
        studentsInClass: new Map(),
        teachers: [],
        lessons: [],
        editingClass: null,
        selectedSubjectIdForLesson: null, // lessonManager에서 사용
        editingLesson: null,        // lessonManager에서 사용
        generatedQuiz: null,        // lessonManager에서 사용
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
        editingQnaVideoId: null,
        selectedClassIdForHomework: null,
        selectedHomeworkId: null,
        editingHomeworkId: null,
        textbooksBySubject: {},
        // ✨ 추가: 리포트 관리 상태
        selectedReportClassId: null,
        selectedReportDate: null, // YYYYMMDD 형식
        uploadedReports: [], // 현재 표시된 리포트 파일 목록
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
        if (inputPassword !== 'qkraudtls0626^^') { // 비밀번호 확인
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

        if (!this.isInitialized) {
            this.initializeDashboard();
        }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("[adminApp] Initializing dashboard...");

        this.cacheElements();
        // 각 매니저 초기화
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        teacherManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this);
        adminHomeworkDashboard.init(this);
        adminClassVideoManager.init(this);
        this.addEventListeners(); // 이벤트 리스너 추가 먼저
        this.showAdminSection('dashboard'); // 대시보드 메뉴부터 표시
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
            gotoHomeworkMgmtBtn: document.getElementById('goto-homework-mgmt-btn'),
            gotoReportMgmtBtn: document.getElementById('goto-report-mgmt-btn'), // 추가

            // 뷰 컨테이너
            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            teacherMgmtView: document.getElementById('admin-teacher-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'),
            qnaVideoMgmtView: document.getElementById('admin-qna-video-mgmt-view'),
            classVideoMgmtView: document.getElementById('admin-class-video-mgmt-view'),
            homeworkMgmtView: document.getElementById('admin-homework-mgmt-view'),
            reportMgmtView: document.getElementById('admin-report-mgmt-view'), // 추가

            // 과목 관리
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),

            // 교재 관리
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),

            // 반 관리
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),

            // 학생 관리
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPhoneInput: document.getElementById('admin-new-student-phone'),
            newParentPhoneInput: document.getElementById('admin-new-parent-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),

            // 교사 관리
            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherEmailInput: document.getElementById('admin-new-teacher-email'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),

            // 교사 수정 모달
            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherEmailInput: document.getElementById('admin-edit-teacher-email'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),

            // 학습 관리
            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('admin-show-new-lesson-modal-btn'),

            // 학습 생성/수정 모달 (lessonManager config와 동일)
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

             // 반 설정 수정 모달 (classEditor config와 동일)
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
            editClassTypeSelect: document.getElementById('admin-edit-class-type'),
            editClassSubjectsContainer: document.getElementById('admin-edit-class-subjects-and-textbooks'), // 추가

            // 학생 수정 모달
            editStudentModal: document.getElementById('admin-edit-student-modal'),
            closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
            cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
            saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),
            editStudentNameInput: document.getElementById('admin-edit-student-name'),
            editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
            editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),

            // 숙제 관리 (homeworkManager config와 동일)
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

            // QnA 영상 (classVideoManager config와 동일)
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoDateInput: document.getElementById('admin-qna-video-date'),
            qnaVideoTitleInput: document.getElementById('admin-qna-video-title'),
            qnaVideoUrlInput: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            qnaVideosList: document.getElementById('admin-qna-videos-list'),

            // 수업 영상 (classVideoManager config와 동일)
            lectureClassSelect: document.getElementById('admin-class-video-class-select'),
            lectureVideoDateInput: document.getElementById('admin-class-video-date'),
            lectureVideoListContainer: document.getElementById('admin-class-video-list-container'),
            saveLectureVideoBtn: document.getElementById('admin-save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('admin-class-video-title'),
            lectureVideoUrlInput: document.getElementById('admin-class-video-url'),
            // addLectureVideoFieldBtn은 관리자 앱에 현재 없음

            // 시험 결과 리포트 관리 (추가)
            reportDateInput: document.getElementById('admin-report-date'),
            reportClassSelect: document.getElementById('admin-report-class-select'),
            reportFilesInput: document.getElementById('admin-report-files-input'),
            uploadReportsBtn: document.getElementById('admin-upload-reports-btn'),
            reportUploadStatus: document.getElementById('admin-report-upload-status'),
            // ✨ 추가: 업로드된 리포트 목록 컨테이너
            uploadedReportsList: document.getElementById('admin-uploaded-reports-list'),
        };
    },

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
        this.elements.gotoReportMgmtBtn?.addEventListener('click', () => this.showAdminSection('report-mgmt')); // 추가

        // 뒤로가기 버튼 이벤트
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });

        // 시험 결과 리포트 업로드 버튼
        this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload()); // 추가

        // ✨ 추가: 시험 결과 리포트 날짜 또는 반 변경 시 목록 업데이트
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.reportClassSelect?.addEventListener('change', () => this.loadAndRenderUploadedReports());

        // ✨ 추가: 업로드된 리포트 목록에서 삭제 버튼 클릭 처리 (이벤트 위임)
        this.elements.uploadedReportsList?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-report-btn') && e.target.dataset.path) {
                this.handleDeleteReport(e.target.dataset.path, e.target.dataset.filename);
            }
        });

        // 사용자 정의 이벤트 리스너
        document.addEventListener('subjectsUpdated', () => {
            console.log("[adminApp] 'subjectsUpdated' event received.");
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
            if (adminHomeworkDashboard.managerInstance?.populateSubjectsForHomeworkModal) {
                if (this.elements.assignHomeworkModal?.style.display === 'flex') {
                    adminHomeworkDashboard.managerInstance.populateSubjectsForHomeworkModal();
                }
            }
        });
        document.addEventListener('classesUpdated', () => {
            console.log("[adminApp] 'classesUpdated' event received.");
            if (adminClassVideoManager.managerInstance) {
                 if (this.elements.qnaVideoMgmtView?.style.display === 'block') {
                     adminClassVideoManager.managerInstance.populateClassSelect(this.elements.qnaClassSelect.id, 'selectedClassIdForQnaVideo');
                 }
                 if (this.elements.classVideoMgmtView?.style.display === 'block') {
                     adminClassVideoManager.managerInstance.populateClassSelect(this.elements.lectureClassSelect.id, 'selectedClassIdForClassVideo');
                 }
            }
            if (adminHomeworkDashboard.managerInstance?.populateClassSelect) {
                adminHomeworkDashboard.managerInstance.populateClassSelect();
            }
            if (studentAssignmentManager?.populateClassSelects) {
                console.log("[adminApp] Populating student assignment class selects.");
                studentAssignmentManager.populateClassSelects();
            } else {
                console.warn("[adminApp] studentAssignmentManager or populateClassSelects function not found.");
            }
            // 리포트 관리 뷰가 활성화 상태이면 반 목록 업데이트 (추가)
            if (this.elements.reportMgmtView?.style.display === 'block') {
                this.initReportUploadView(); // 반 목록만 업데이트
                this.loadAndRenderUploadedReports(); // 목록 다시 로드
            }
        });
        console.log("[adminApp] Event listeners added.");
    },

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
            'homework-mgmt': this.elements.homeworkMgmtView,
            'report-mgmt': this.elements.reportMgmtView, // 추가
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
            case 'textbook-mgmt': this.renderSubjectOptionsForTextbook(); break;
            case 'lesson-mgmt':
                this.renderSubjectOptionsForLesson();
                if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
                break;
            case 'qna-video-mgmt': adminClassVideoManager.initQnaView(); break;
            case 'class-video-mgmt': adminClassVideoManager.initLectureView(); break;
            case 'student-assignment':
                 if (studentAssignmentManager?.populateClassSelects) {
                    studentAssignmentManager.populateClassSelects();
                    studentAssignmentManager.resetView();
                 }
                break;
            case 'homework-mgmt':
                if (adminHomeworkDashboard.managerInstance?.initView) {
                    adminHomeworkDashboard.managerInstance.initView();
                }
                break;
            case 'student-mgmt':
                 if (studentManager?.renderStudentListView) {
                     studentManager.renderStudentListView();
                 }
                break;
            case 'report-mgmt': // 추가
                this.initReportUploadView(); // 반 목록 채우기 및 상태 초기화
                this.loadAndRenderUploadedReports(); // 파일 목록 로드
                break;
        }
    },

    // 과목 옵션 렌더링 (교재 관리용)
    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook; if (!select) return;
        const currentSelection = select.value || this.state.selectedSubjectIdForTextbook; select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) { select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>'; if(this.elements.textbookManagementContent) this.elements.textbookManagementContent.style.display = 'none'; return; }
        this.state.subjects.forEach(sub => { select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`; });
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection; this.state.selectedSubjectIdForTextbook = currentSelection; if (textbookManager?.handleSubjectSelectForTextbook) { textbookManager.handleSubjectSelectForTextbook(currentSelection); }
        } else { select.value = ''; this.state.selectedSubjectIdForTextbook = null; if (textbookManager?.handleSubjectSelectForTextbook) { textbookManager.handleSubjectSelectForTextbook(''); } }
    },

    // 과목 옵션 렌더링 (학습 관리용)
    renderSubjectOptionsForLesson() {
        const select = this.elements.subjectSelectForLesson; if (!select) return;
        const currentSelection = select.value || this.state.selectedSubjectIdForLesson; select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.state.subjects || this.state.subjects.length === 0) { select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>'; if(this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none'; if(this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block'; return; }
        this.state.subjects.forEach(sub => { select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`; });
        if (this.state.subjects.some(s => s.id === currentSelection)) {
            select.value = currentSelection; this.state.selectedSubjectIdForLesson = currentSelection;
            // lessonManager 인스턴스의 함수 직접 호출
            if (lessonManager?.managerInstance?.handleLessonFilterChange) {
                lessonManager.managerInstance.handleLessonFilterChange();
            }
        } else {
            select.value = ''; this.state.selectedSubjectIdForLesson = null;
            if (lessonManager?.managerInstance?.handleLessonFilterChange) {
                lessonManager.managerInstance.handleLessonFilterChange();
            }
        }
    },

    // 리포트 업로드 뷰 초기화 (반 목록 채우기)
    initReportUploadView() {
        const select = this.elements.reportClassSelect;
        if (!select) return;

        // 상태 초기화
        this.state.selectedReportClassId = null;
        this.state.selectedReportDate = null;
        this.state.uploadedReports = [];

        select.innerHTML = '<option value="">-- 반 선택 --</option>';
        if (!this.state.classes || this.state.classes.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
            return;
        }
        // 클래스 목록을 이름순으로 정렬하여 표시
        const sortedClasses = [...this.state.classes].sort((a, b) => a.name.localeCompare(b.name));
        sortedClasses.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });

        // 입력 필드 및 상태 초기화
        if(this.elements.reportDateInput) this.elements.reportDateInput.value = '';
        if(this.elements.reportFilesInput) this.elements.reportFilesInput.value = '';
        if(this.elements.reportUploadStatus) this.elements.reportUploadStatus.textContent = '';
        // ✨ 목록 영역 초기화
        this.renderReportFileList([]);
    },

    // 리포트 업로드 처리
    async handleReportUpload() {
        const dateInput = this.elements.reportDateInput;
        const classSelect = this.elements.reportClassSelect;
        const filesInput = this.elements.reportFilesInput;
        const statusEl = this.elements.reportUploadStatus;
        const uploadBtn = this.elements.uploadReportsBtn;

        if (!dateInput || !classSelect || !filesInput || !statusEl || !uploadBtn) return;

        const testDateRaw = dateInput.value; // YYYY-MM-DD
        const classId = classSelect.value;
        const files = filesInput.files;

        if (!testDateRaw || !classId || !files || files.length === 0) {
            showToast("시험 날짜, 반, 파일을 모두 선택해주세요.");
            return;
        }

        // 날짜 형식을 YYYYMMDD로 변환
        const testDate = testDateRaw.replace(/-/g, '');

        uploadBtn.disabled = true;
        statusEl.textContent = `파일 ${files.length}개 업로드 시작 중...`;
        let successCount = 0;
        let failCount = 0;

        // Promise.all을 사용하여 병렬 업로드 시도 (Storage는 병렬 처리 가능)
        const uploadPromises = [];
        for (const file of files) {
            uploadPromises.push(
                reportManager.uploadReport(file, classId, testDate)
                    .then(success => {
                        if (success) successCount++;
                        else failCount++;
                        statusEl.textContent = `업로드 진행 중... (${successCount + failCount}/${files.length}, 성공: ${successCount}, 실패: ${failCount})`;
                    })
            );
        }

        try {
            await Promise.all(uploadPromises);
            statusEl.textContent = `업로드 완료: 총 ${files.length}개 중 ${successCount}개 성공, ${failCount}개 실패.`;
            showToast(`리포트 업로드 완료 (성공: ${successCount}, 실패: ${failCount})`, failCount > 0);
            filesInput.value = ''; // 파일 입력 초기화
            // ✨ 업로드 성공 후 파일 목록 새로고침
            await this.loadAndRenderUploadedReports();
        } catch (error) {
            // 개별 업로드 실패는 이미 처리되었으므로 여기서는 최종 상태만 업데이트
            console.error("Error during parallel upload:", error); // 전체 실패 시 추가 로그
            statusEl.textContent = `업로드 중 오류 발생. 일부 파일 실패 가능성 있음. (성공: ${successCount}, 실패: ${failCount})`;
            showToast("리포트 업로드 중 오류 발생", true);
        } finally {
            uploadBtn.disabled = false;
        }
    },

    // --- ✨ 추가된 함수들 시작 ---

    /**
     * 선택된 날짜와 반의 업로드된 리포트 파일 목록을 로드하고 화면에 표시합니다.
     */
    async loadAndRenderUploadedReports() {
        const dateInput = this.elements.reportDateInput;
        const classSelect = this.elements.reportClassSelect;
        const listContainer = this.elements.uploadedReportsList;

        if (!dateInput || !classSelect || !listContainer) return;

        const testDateRaw = dateInput.value;
        const classId = classSelect.value;

        // 날짜나 반이 선택되지 않았으면 목록 초기화
        if (!testDateRaw || !classId) {
            this.state.selectedReportClassId = null;
            this.state.selectedReportDate = null;
            this.state.uploadedReports = [];
            this.renderReportFileList([]); // 빈 목록으로 렌더링
            return;
        }

        const testDate = testDateRaw.replace(/-/g, ''); // YYYYMMDD
        this.state.selectedReportClassId = classId;
        this.state.selectedReportDate = testDate;

        listContainer.innerHTML = '<p class="text-sm text-slate-400">파일 목록 로딩 중...</p>'; // 로딩 표시

        const reports = await reportManager.listReportsForDateAndClass(classId, testDate);

        if (reports === null) { // 오류 발생 시
            listContainer.innerHTML = '<p class="text-sm text-red-500">파일 목록 로딩 실패</p>';
            this.state.uploadedReports = [];
        } else {
            this.state.uploadedReports = reports;
            this.renderReportFileList(reports); // 목록 렌더링
        }
    },

    /**
     * 가져온 리포트 파일 목록을 HTML로 렌더링합니다.
     * @param {Array<{fileName: string, storagePath: string}>} reports - 표시할 리포트 파일 정보 배열
     */
    renderReportFileList(reports) {
        const listContainer = this.elements.uploadedReportsList;
        if (!listContainer) return;

        listContainer.innerHTML = ''; // 기존 내용 지우기

        if (!reports || reports.length === 0) {
            listContainer.innerHTML = '<p class="text-sm text-slate-400">해당 날짜와 반에 업로드된 리포트가 없습니다.</p>';
            return;
        }

        const listTitle = document.createElement('h3');
        listTitle.className = 'text-lg font-semibold text-slate-700 mb-2 mt-4 border-t pt-4';
        listTitle.textContent = `업로드된 리포트 (${reports.length}개)`;
        listContainer.appendChild(listTitle);

        const ul = document.createElement('ul');
        ul.className = 'space-y-2';
        reports.forEach(report => {
            const li = document.createElement('li');
            li.className = 'p-2 border rounded-md flex justify-between items-center text-sm bg-white';
            li.innerHTML = `
                <span>${report.fileName}</span>
                <button
                    class="delete-report-btn text-red-500 hover:text-red-700 text-xs font-bold"
                    data-path="${report.storagePath}"
                    data-filename="${report.fileName}"
                >삭제</button>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    },

    /**
     * 삭제 버튼 클릭 시 확인 후 reportManager의 삭제 함수를 호출하고 목록을 새로고침합니다.
     * @param {string} storagePath - 삭제할 파일의 Storage 경로
     * @param {string} fileName - 삭제할 파일 이름 (확인 메시지용)
     */
    async handleDeleteReport(storagePath, fileName) {
        if (confirm(`'${fileName}' 리포트 파일을 정말 삭제하시겠습니까?`)) {
            const success = await reportManager.deleteReport(storagePath);
            if (success) {
                // 삭제 성공 시 현재 목록에서 해당 항목 제거 또는 목록 새로고침
                // 여기서는 목록 새로고침 선택
                await this.loadAndRenderUploadedReports();
            }
        }
    }
    // --- ✨ 추가된 함수들 끝 ---

}; // AdminApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export default AdminApp;