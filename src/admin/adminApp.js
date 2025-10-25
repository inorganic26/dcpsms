// src/admin/adminApp.js
//
// 관리자 앱 전체 컨트롤러
// - 로그인
// - 섹션 전환
// - 각 매니저 초기화
// - 시험 결과 리포트 업로드 / 목록 표시 / 삭제
//

import { auth, signInAnonymously } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
import { teacherManager } from './teacherManager.js';
import { lessonManager } from './lessonManager.js';
import { studentAssignmentManager } from './studentAssignmentManager.js';
import { adminHomeworkDashboard } from './adminHomeworkDashboard.js';
import { adminClassVideoManager } from './adminClassVideoManager.js';
import { reportManager } from '../shared/reportManager.js';

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: {
        subjects: [],
        classes: [], // [{id, name, ...}] ← classManager에서 복사
        students: [],
        studentsInClass: new Map(),
        teachers: [],
        lessons: [],
        editingClass: null,
        selectedSubjectIdForLesson: null,
        editingLesson: null,
        generatedQuiz: null,
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
        editingQnaVideoId: null,
        selectedClassIdForHomework: null,
        selectedHomeworkId: null,
        editingHomeworkId: null,
        textbooksBySubject: {},

        // 리포트 관리용
        selectedReportClassId: null,   // Firestore class 문서 ID
        selectedReportDate: null,      // 'YYYYMMDD'
        uploadedReports: [],           // [{fileName,url,storagePath}]
    },

    /* --------------------------
       초기 진입 / 로그인 처리
    ---------------------------*/
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

        // TODO: 운영 시 안전하게 교체
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

    /* --------------------------
       대시보드 전체 초기화
    ---------------------------*/
    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("[adminApp] Initializing dashboard...");

        this.cacheElements();

        // 각 매니저들 초기화
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        teacherManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this);
        adminHomeworkDashboard.init(this);
        adminClassVideoManager.init(this);

        this.addEventListeners();

        this.showAdminSection('dashboard');

        console.log("[adminApp] Dashboard initialized.");
    },

    /* --------------------------
       DOM 캐싱
    ---------------------------*/
    cacheElements() {
        this.elements = {
            // 네비 / 섹션 전환 버튼
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
            gotoReportMgmtBtn: document.getElementById('goto-report-mgmt-btn'),

            // 섹션 뷰 컨테이너
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
            reportMgmtView: document.getElementById('admin-report-mgmt-view'),

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

            // 반 수정 모달
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
            editClassTypeSelect: document.getElementById('admin-edit-class-type'),
            editClassSubjectsContainer: document.getElementById('admin-edit-class-subjects-and-textbooks'),

            // 학생 수정 모달
            editStudentModal: document.getElementById('admin-edit-student-modal'),
            closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
            cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
            saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),
            editStudentNameInput: document.getElementById('admin-edit-student-name'),
            editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
            editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),

            // 숙제 관리
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

            // 동영상 / QnA
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoDateInput: document.getElementById('admin-qna-video-date'),
            qnaVideoTitleInput: document.getElementById('admin-qna-video-title'),
            qnaVideoUrlInput: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            qnaVideosList: document.getElementById('admin-qna-videos-list'),

            lectureClassSelect: document.getElementById('admin-class-video-class-select'),
            lectureVideoDateInput: document.getElementById('admin-class-video-date'),
            lectureVideoListContainer: document.getElementById('admin-class-video-list-container'),
            saveLectureVideoBtn: document.getElementById('admin-save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('admin-class-video-title'),
            lectureVideoUrlInput: document.getElementById('admin-class-video-url'),

            // 시험 결과 리포트 관리
            reportMgmtView: document.getElementById('admin-report-mgmt-view'),
            reportClassSelect: document.getElementById('admin-report-class-select'),
            reportDateInput: document.getElementById('admin-report-date'),
            reportFilesInput: document.getElementById('admin-report-files-input'),
            uploadReportsBtn: document.getElementById('admin-upload-reports-btn'),
            reportUploadStatus: document.getElementById('admin-report-upload-status'),
            uploadedReportsList: document.getElementById('admin-uploaded-reports-list'),
        };
    },

    /* --------------------------
       class 목록 동기화
    ---------------------------*/
    syncClassesFromManager() {
        // classManager 내부에서 들고 있는 classes 배열을 복사해온다
        if (classManager?.state?.classes && Array.isArray(classManager.state.classes)) {
            this.state.classes = classManager.state.classes;
        } else if (Array.isArray(classManager?.classes)) {
            this.state.classes = classManager.classes;
        }
    },

    /* --------------------------
       이벤트 바인딩
    ---------------------------*/
    addEventListeners() {
        console.log("[adminApp] Adding event listeners...");

        // 섹션 전환 버튼들
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
        this.elements.gotoReportMgmtBtn?.addEventListener('click', () => this.showAdminSection('report-mgmt'));

        // 공통 뒤로가기 ("← 관리자 메뉴로")
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });

        // 리포트 업로드 버튼
        this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload());

        // 날짜/반 바뀔 때마다 목록 새로고침
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.reportClassSelect?.addEventListener('change', () => this.loadAndRenderUploadedReports());

        // 업로드된 리포트 목록에서 보기 / 삭제 (이벤트 위임)
        this.elements.uploadedReportsList?.addEventListener('click', async (e) => {
            const viewBtn = e.target.closest('.view-report-btn');
            const deleteBtn = e.target.closest('.delete-report-btn');

            if (viewBtn && viewBtn.dataset.url) {
                const fileUrl = viewBtn.dataset.url;
                if (fileUrl) {
                    window.open(fileUrl, '_blank');
                } else {
                    showToast("리포트를 열 수 없습니다.", true);
                }
            }

            if (deleteBtn && deleteBtn.dataset.path) {
                // reportManager.deleteReport(storagePath)를 호출
                this.handleDeleteReport(deleteBtn.dataset.path, deleteBtn.dataset.filename);
            }
        });

        // 과목 갱신 이벤트
        document.addEventListener('subjectsUpdated', () => {
            console.log("[adminApp] 'subjectsUpdated' event received.");
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();

            // 숙제 모달 떠있으면 안에서 과목 셀렉트도 갱신
            const modalEl = document.getElementById('admin-assign-homework-modal');
            if (
                modalEl?.style.display === 'flex' &&
                adminHomeworkDashboard.managerInstance?.populateSubjectsForHomeworkModal
            ) {
                adminHomeworkDashboard.managerInstance.populateSubjectsForHomeworkModal();
            }
        });

        // 반 목록 갱신 이벤트
        document.addEventListener('classesUpdated', () => {
            console.log("[adminApp] 'classesUpdated' event received.");

            // 최신 반 목록 복사
            this.syncClassesFromManager();

            // 기존 다른 화면들용 로직 (학생배정, 동영상 등)
            if (adminClassVideoManager.managerInstance) {
                if (this.elements.qnaVideoMgmtView?.style.display === 'block') {
                    adminClassVideoManager.managerInstance.populateClassSelect(
                        this.elements.qnaClassSelect.id,
                        'selectedClassIdForQnaVideo'
                    );
                }
                if (this.elements.classVideoMgmtView?.style.display === 'block') {
                    adminClassVideoManager.managerInstance.populateClassSelect(
                        this.elements.lectureClassSelect.id,
                        'selectedClassIdForClassVideo'
                    );
                }
            }

            if (adminHomeworkDashboard.managerInstance?.populateClassSelect) {
                adminHomeworkDashboard.managerInstance.populateClassSelect();
            }

            if (studentAssignmentManager?.populateClassSelects) {
                console.log("[adminApp] Updating class selects in assignment view...");
                studentAssignmentManager.populateClassSelects();
            }

            // 지금 화면이 리포트 관리면 즉시 드롭다운/리스트 최신화
            if (this.elements.reportMgmtView?.style.display === 'block') {
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
            }
        });

        console.log("[adminApp] Event listeners added.");
    },

    /* --------------------------
       섹션 전환
    ---------------------------*/
    showAdminSection(sectionName) {
        console.log(`[adminApp] Attempting to show section: ${sectionName}`);

        // 모든 섹션 숨김
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
            'homework-mgmt': this.elements.homeworkMgmtView,
            'report-mgmt': this.elements.reportMgmtView,
        };

        const viewToShow = viewMap[sectionName];
        if (viewToShow instanceof HTMLElement) {
            console.log(`[adminApp] Showing element: ${viewToShow.id}`);
            viewToShow.style.display = 'block';
        } else {
            console.warn(`[adminApp] View "${sectionName}" not found. Showing dashboard instead.`);
            if (this.elements.dashboardView instanceof HTMLElement) {
                this.elements.dashboardView.style.display = 'block';
            }
        }

        switch (sectionName) {
            case 'textbook-mgmt':
                this.renderSubjectOptionsForTextbook();
                break;

            case 'lesson-mgmt':
                this.renderSubjectOptionsForLesson();
                if (this.elements.lessonsManagementContent)
                    this.elements.lessonsManagementContent.style.display = 'none';
                if (this.elements.lessonPrompt)
                    this.elements.lessonPrompt.style.display = 'block';
                if (this.elements.lessonsList)
                    this.elements.lessonsList.innerHTML = '';
                break;

            case 'qna-video-mgmt':
                adminClassVideoManager.initQnaView();
                break;

            case 'class-video-mgmt':
                adminClassVideoManager.initLectureView();
                break;

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

            case 'report-mgmt':
                // 리포트 관리 화면 들어올 때마다 최신 반 목록 싱크 → 드롭다운 구성 → 목록 뿌리기
                this.syncClassesFromManager();
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
                break;
        }
    },

    /* --------------------------
       과목 선택 드롭다운 (교재 관리 / 학습 관리)
    ---------------------------*/
    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook;
        if (!select) return;

        const current = select.value || this.state.selectedSubjectIdForTextbook;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';

        if (!this.state.subjects || this.state.subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            if (this.elements.textbookManagementContent)
                this.elements.textbookManagementContent.style.display = 'none';
            return;
        }

        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });

        if (this.state.subjects.some(s => s.id === current)) {
            select.value = current;
            this.state.selectedSubjectIdForTextbook = current;
            if (textbookManager?.handleSubjectSelectForTextbook) {
                textbookManager.handleSubjectSelectForTextbook(current);
            }
        } else {
            select.value = '';
            this.state.selectedSubjectIdForTextbook = null;
            if (textbookManager?.handleSubjectSelectForTextbook) {
                textbookManager.handleSubjectSelectForTextbook('');
            }
        }
    },

    renderSubjectOptionsForLesson() {
        const select = this.elements.subjectSelectForLesson;
        if (!select) return;

        const current = select.value || this.state.selectedSubjectIdForLesson;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';

        if (!this.state.subjects || this.state.subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            if (this.elements.lessonsManagementContent)
                this.elements.lessonsManagementContent.style.display = 'none';
            if (this.elements.lessonPrompt)
                this.elements.lessonPrompt.style.display = 'block';
            return;
        }

        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });

        if (this.state.subjects.some(s => s.id === current)) {
            select.value = current;
            this.state.selectedSubjectIdForLesson = current;
            if (lessonManager?.managerInstance?.handleLessonFilterChange) {
                lessonManager.managerInstance.handleLessonFilterChange();
            }
        } else {
            select.value = '';
            this.state.selectedSubjectIdForLesson = null;
            if (lessonManager?.managerInstance?.handleLessonFilterChange) {
                lessonManager.managerInstance.handleLessonFilterChange();
            }
        }
    },

    /* --------------------------
       리포트 화면 초기화 (드롭다운 채우기 등)
    ---------------------------*/
    initReportUploadView() {
        const classSelect = this.elements.reportClassSelect;
        if (!classSelect) return;

        classSelect.innerHTML = '<option value="">-- 반 선택 --</option>';

        if (!this.state.classes || this.state.classes.length === 0) {
            classSelect.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
        } else {
            const sorted = [...this.state.classes].sort((a, b) => {
                const an = a.name || '';
                const bn = b.name || '';
                return an.localeCompare(bn);
            });

            sorted.forEach(cls => {
                // value에 Firestore 문서 ID를 넣는 게 제일 안정적
                classSelect.innerHTML += `<option value="${cls.id}">${cls.name || '(이름 없음)'}</option>`;
            });
        }

        // 초기화
        this.state.selectedReportClassId = null;
        this.state.selectedReportDate = null;
        this.state.uploadedReports = [];

        if (this.elements.reportFilesInput) this.elements.reportFilesInput.value = '';
        if (this.elements.reportUploadStatus) this.elements.reportUploadStatus.textContent = '';

        this.renderReportFileList([]);
    },

    /* --------------------------
       리포트 파일 업로드
    ---------------------------*/
    async handleReportUpload() {
        const dateInput = this.elements.reportDateInput;
        const classSelect = this.elements.reportClassSelect;
        const filesInput = this.elements.reportFilesInput;
        const statusEl = this.elements.reportUploadStatus;
        const uploadBtn = this.elements.uploadReportsBtn;

        if (!dateInput || !classSelect || !filesInput || !statusEl || !uploadBtn) return;

        const testDateRaw = dateInput.value; // "YYYY-MM-DD"
        let classId = classSelect.value;     // 보통은 문서 ID여야 하는데, 혹시 반 이름일 수도 있으므로 아래에서 보정
        const files = filesInput.files;

        // value가 "중3화목" 같은 이름일 수도 있으므로 문서ID로 다시 찾아줌
        const optText = classSelect.options[classSelect.selectedIndex]?.text?.trim();
        const byName = (nm) =>
            this.state.classes?.find(c => (c.name || '').trim() === (nm || '').trim());
        if (!classId || classId.length < 10) { // Firestore 랜덤 ID는 보통 꽤 김
            const hit = byName(classId) || byName(optText);
            if (hit?.id) classId = hit.id;
        }

        if (!testDateRaw || !classId || !files || files.length === 0) {
            showToast("시험 날짜, 반, 파일을 모두 선택해주세요.");
            return;
        }

        const testDate = testDateRaw.replace(/-/g, ''); // "YYYYMMDD"

        uploadBtn.disabled = true;
        statusEl.textContent = `파일 ${files.length}개 업로드 시작 중...`;
        let successCount = 0;
        let failCount = 0;

        const jobs = [];
        for (const file of files) {
            jobs.push(
                reportManager
                    .uploadReport(file, classId, testDate)
                    .then(ok => {
                        if (ok) successCount++;
                        else failCount++;
                        statusEl.textContent =
                            `업로드 진행 중... (${successCount + failCount}/${files.length}, 성공:${successCount}, 실패:${failCount})`;
                    })
            );
        }

        try {
            await Promise.all(jobs);

            statusEl.textContent =
                `업로드 완료: 총 ${files.length}개 중 ${successCount}개 성공, ${failCount}개 실패.`;
            showToast(
                `리포트 업로드 완료 (성공:${successCount}, 실패:${failCount})`,
                failCount > 0
            );

            filesInput.value = '';

            await this.loadAndRenderUploadedReports();
        } catch (e) {
            console.error(e);
            statusEl.textContent =
                `업로드 중 오류. (성공:${successCount}, 실패:${failCount})`;
            showToast("리포트 업로드 중 오류 발생", true);
        } finally {
            uploadBtn.disabled = false;
        }
    },

    /* --------------------------
       리포트 목록 불러오기
    ---------------------------*/
    async loadAndRenderUploadedReports() {
        const dateInput = this.elements.reportDateInput;
        const classSelect = this.elements.reportClassSelect;
        const listContainer = this.elements.uploadedReportsList;
        if (!dateInput || !classSelect || !listContainer) return;

        const testDateRaw = dateInput.value; // "YYYY-MM-DD"
        let classId = classSelect.value;     // 문서 ID ideally. 아니면 아래에서 이름→ID 보정
        if (!testDateRaw) {
            this.state.selectedReportClassId = null;
            this.state.selectedReportDate = null;
            this.state.uploadedReports = [];
            this.renderReportFileList([]);
            return;
        }

        const optText = classSelect.options[classSelect.selectedIndex]?.text?.trim();
        const byName = (nm) =>
            this.state.classes?.find(c => (c.name || '').trim() === (nm || '').trim());
        if (!classId || classId.length < 10) {
            const hit = byName(classId) || byName(optText);
            if (hit?.id) classId = hit.id;
        }

        if (!classId) {
            this.state.selectedReportClassId = null;
            this.state.selectedReportDate = null;
            this.state.uploadedReports = [];
            this.renderReportFileList([]);
            return;
        }

        const testDate = testDateRaw.replace(/-/g, ''); // "YYYYMMDD"
        this.state.selectedReportClassId = classId;
        this.state.selectedReportDate = testDate;

        listContainer.innerHTML =
            '<p class="text-sm text-slate-400">파일 목록 로딩 중...</p>';

        // reportManager.listReportsForDateAndClass(classId, testDate)
        // -> [{ fileName, url }, ...] 형태 기대
        const rawReports = await reportManager.listReportsForDateAndClass(
            classId,
            testDate
        );

        if (!rawReports) {
            listContainer.innerHTML =
                '<p class="text-sm text-red-500">파일 목록 로딩 실패</p>';
            this.state.uploadedReports = [];
            return;
        }

        // 삭제용 storagePath 붙여서 가공
        const mapped = rawReports.map(r => ({
            fileName: r.fileName,
            url: r.url || '',
            // listReportsForDateAndClass가 찾은 폴더 이름을 사용해야 함
            // 하지만 listReportsForDateAndClass의 내부 구현에서 어떤 폴더를 사용했는지 알 수 없으므로,
            // 안전하게 현재 selectedReportDate(testDate)를 사용하고,
            // getReportDownloadUrl/deleteReport가 후보 폴더를 순회하도록 설계했으므로
            // 여기서는 정규화된 testDate를 사용함.
            storagePath: `reports/${classId}/${testDate}/${r.fileName}`,
        }));

        this.state.uploadedReports = mapped;
        this.renderReportFileList(mapped);
    },

    /* --------------------------
       리포트 목록 렌더링
    ---------------------------*/
    renderReportFileList(reports) {
        const listContainer = this.elements.uploadedReportsList;
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (!reports || reports.length === 0) {
            listContainer.innerHTML =
                '<p class="text-sm text-slate-400 mt-6">해당 날짜와 반에 업로드된 리포트가 없습니다.</p>';
            return;
        }

        const header = document.createElement('h3');
        header.className =
            'text-lg font-semibold text-slate-700 mb-2 mt-8 border-t pt-4';
        header.textContent = `업로드된 리포트 (${reports.length}개)`;
        listContainer.appendChild(header);

        const ul = document.createElement('ul');
        ul.className = 'space-y-2';

        reports.forEach(report => {
            const li = document.createElement('li');
            li.className =
                'p-2 border rounded-md flex justify-between items-center text-sm bg-white';

            li.innerHTML = `
                <span class="truncate mr-2">${report.fileName}</span>
                <div class="flex-shrink-0 flex gap-2">
                    <button
                        class="view-report-btn text-blue-500 hover:text-blue-700 text-xs font-bold"
                        data-url="${report.url}"
                    >보기/다운로드</button>
                    <button
                        class="delete-report-btn text-red-500 hover:text-red-700 text-xs font-bold"
                        data-path="${report.storagePath}"
                        data-filename="${report.fileName}"
                    >삭제</button>
                </div>
            `;

            ul.appendChild(li);
        });

        listContainer.appendChild(ul);
    },

    /* --------------------------
       리포트 삭제
    ---------------------------*/
    async handleDeleteReport(storagePath, fileName) {
        if (!storagePath) return;
        const ok = confirm(`'${fileName}' 리포트 파일을 정말 삭제하시겠습니까?`);
        if (!ok) return;

        // reportManager.deleteReport 호출하여 파일 삭제
        const success = await reportManager.deleteReport(storagePath);
        if (success) {
            showToast("삭제 완료.", false);
            // 삭제 후 목록 새로고침
            this.loadAndRenderUploadedReports();
        } else {
            showToast("삭제 중 오류가 발생했습니다. (파일이 없거나 권한 부족)", true);
        }
    },
};

/* 앱 부트 */
document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export { AdminApp };