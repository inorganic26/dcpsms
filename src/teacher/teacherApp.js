// src/teacher/teacherApp.js

import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    onSnapshot,
    updateDoc,
    orderBy
} from "firebase/firestore";
import { db, auth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 모듈 import
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { classVideoManager } from './classVideoManager.js';
import { reportManager } from '../shared/reportManager.js';
import { analysisDashboard } from './analysisDashboard.js'; // ✨ analysisDashboard 모듈 import

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        teacherId: null,
        teacherData: null,
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        studentsInClass: new Map(),
        subjects: [],
        textbooksBySubject: {},
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        editingClass: null,
        editingHomeworkId: null,
        currentView: 'dashboard',
        isSubjectsLoading: true,
        isClassDataLoading: false,
        areTextbooksLoading: {},

        // 리포트 관리 상태
        selectedReportDate: null,
        uploadedReports: [],
    },

    init() {
        if (this.isInitialized) return;

        this.cacheElements();

        // 로그인 UI 요소 이벤트 리스너 설정
        this.elements.loginBtn?.addEventListener('click', () => {
            const name = this.elements.nameInput?.value;
            const password = this.elements.passwordInput?.value;
            this.handleLogin(name, password);
        });
        this.elements.passwordInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const name = this.elements.nameInput?.value;
                const password = this.elements.passwordInput?.value;
                this.handleLogin(name, password);
            }
        });

        // 초기 화면 설정 (로그인 화면 표시)
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'flex';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'none';
    },

    // ✨ [수정] 로그인 로직: 이름 + 비밀번호(뒷 4자리)로 인증
    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }

        try {
            let loggedIn = false;
            let userId = null;
            let userData = null;

            // Firestore에서 이름으로 교사 검색
            const teacherQuery = query(collection(db, 'teachers'), where("name", "==", name));
            const teacherSnapshot = await getDocs(teacherQuery);

            if (!teacherSnapshot.empty) {
                const userDoc = teacherSnapshot.docs[0];
                const data = userDoc.data();
                
                // 🚨 [수정] 비밀번호 비교: 전화번호 뒷 4자리 또는 설정된 비밀번호 비교
                if ((data.phone && data.phone.slice(-4) === password) || data.password === password) {
                    loggedIn = true;
                    userId = userDoc.id;
                    userData = data;
                }
            }

            if (loggedIn && userId && userData) {
                this.state.teacherId = userId;
                this.state.teacherData = userData;
                
                // ✨ [추가] 최초 로그인 상태 확인 및 처리
                if (userData.isInitialPassword === true) {
                     this.showDashboard(userId, userData); // 일단 대시보드 표시
                     this.promptPasswordChange(userId); // 비밀번호 변경 프롬프트
                } else {
                     showToast(`환영합니다, ${userData.name} 선생님!`, false);
                     this.showDashboard(userId, userData);
                }
            } else {
                showToast("이름 또는 비밀번호가 일치하지 않습니다.");
            }
        } catch (error) {
            console.error("Login error:", error);
            let msg = "로그인 중 오류 발생";
            if (error.code === 'permission-denied') msg = "로그인 정보 조회 권한 부족";
            else if (error.code === 'unavailable') msg = "서버 연결 불가";
            showToast(msg, true);
        }
    },

    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';

        if (!this.isInitialized) {
            this.initializeDashboard();
        }

        // isInitialPassword 처리는 handleLogin에서 호출하도록 변경되었으므로 여기서 제거
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("[TeacherApp] Initializing dashboard...");

        // 모듈 인스턴스 초기화
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager;
        this.analysisDashboard = analysisDashboard; // ✨ analysisDashboard 모듈 초기화

        try {
            // 모든 모듈의 init 함수 호출
            this.homeworkDashboard.init(this);
            this.lessonManager.init(this);
            this.classEditor.init(this);
            this.classVideoManager.init(this);
            this.analysisDashboard.init(this); // ✨ analysisDashboard init 호출

        } catch (e) {
            console.error("Error initializing modules:", e);
            showToast("앱 초기화 중 오류 발생", true);
            return;
        }

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects();

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'none';

        console.log("[TeacherApp] Dashboard initialized.");
    },

    // ✨ [수정] 최초 비밀번호 변경 프롬프트 함수
    async promptPasswordChange(teacherId) {
        let newPassword = null;
        let isValid = false;

        while (!isValid) {
            newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
            
            if (newPassword === null) { // 취소 버튼
                showToast("비밀번호 변경을 취소했습니다. 다음 로그인 시 다시 변경해야 합니다.");
                return;
            }
            
            newPassword = newPassword.trim();
            if (newPassword.length >= 6) {
                isValid = true;
            } else {
                alert("비밀번호는 6자리 이상이어야 합니다.");
            }
        }

        try {
            // Firestore에 새 비밀번호와 최초 로그인 플래그 업데이트
            await updateDoc(doc(db, 'teachers', teacherId), {
                password: newPassword,
                isInitialPassword: false
            });
            showToast("비밀번호가 성공적으로 변경되었습니다.", false);
        } catch (error) {
            console.error("비밀번호 변경 실패:", error);
            showToast("비밀번호 변경에 실패했습니다. 관리자에게 문의하세요.");
        }
    },

    cacheElements() {
        this.elements = {
            loginContainer: document.getElementById('teacher-login-container'),
            dashboardContainer: document.getElementById('teacher-dashboard-container'),
            nameInput: document.getElementById('teacher-name'),
            passwordInput: document.getElementById('teacher-password'),
            loginBtn: document.getElementById('teacher-login-btn'),
            classSelect: document.getElementById('teacher-class-select'),
            mainContent: document.getElementById('teacher-main-content'),
            navButtonsContainer: document.getElementById('teacher-navigation-buttons'),

            views: {
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'student-list-mgmt': document.getElementById('view-student-list-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'),
                'report-mgmt': document.getElementById('view-report-mgmt'),
            },

            studentListContainer: document.getElementById('teacher-student-list-container'),

            // 반 설정 뷰 관련
            currentClassInfo: document.getElementById('current-class-info'),
            currentClassType: document.getElementById('current-class-type'),
            currentClassSubjectsList: document.getElementById('current-class-subjects-list'),
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            manageSubjectsTextbooksBtn: document.getElementById('teacher-manage-subjects-textbooks-btn'),

            // 숙제 관련
            homeworkDashboardControls: document.getElementById('homework-dashboard-controls'),
            homeworkSelect: document.getElementById('teacher-homework-select'),
            assignHomeworkBtn: document.getElementById('teacher-assign-homework-btn'),
            homeworkManagementButtons: document.getElementById('teacher-homework-management-buttons'),
            editHomeworkBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteHomeworkBtn: document.getElementById('teacher-delete-homework-btn'),
            homeworkContent: document.getElementById('teacher-homework-content'),
            selectedHomeworkTitle: document.getElementById('teacher-selected-homework-title'),
            homeworkTableBody: document.getElementById('teacher-homework-table-body'),
            assignHomeworkModal: document.getElementById('teacher-assign-homework-modal'),
            homeworkModalTitle: document.getElementById('teacher-homework-modal-title'),
            closeHomeworkModalBtn: document.getElementById('teacher-close-homework-modal-btn'),
            cancelHomeworkBtn: document.getElementById('teacher-cancel-homework-btn'),
            saveHomeworkBtn: document.getElementById('teacher-save-homework-btn'),
            homeworkSubjectSelect: document.getElementById('teacher-homework-subject-select'),
            homeworkTextbookSelect: document.getElementById('teacher-homework-textbook-select'),
            homeworkPagesInput: document.getElementById('teacher-homework-pages'),
            homeworkDueDateInput: document.getElementById('teacher-homework-due-date'),

            // 학습 관리 관련
            lessonMgmtControls: document.getElementById('lesson-mgmt-controls'),
            subjectSelectForMgmt: document.getElementById('teacher-subject-select-mgmt'),
            lessonsManagementContent: document.getElementById('teacher-lessons-management-content'),
            lessonPrompt: document.getElementById('teacher-lesson-prompt'),
            lessonsList: document.getElementById('teacher-lessons-list'),
            saveOrderBtn: document.getElementById('teacher-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('teacher-show-new-lesson-modal-btn'),
            modal: document.getElementById('teacher-new-lesson-modal'),
            modalTitle: document.getElementById('teacher-lesson-modal-title'),
            closeModalBtn: document.getElementById('teacher-close-modal-btn'),
            cancelBtn: document.getElementById('teacher-cancel-btn'),
            lessonTitle: document.getElementById('teacher-lesson-title'),
            video1Url: document.getElementById('teacher-video1-url'),
            video2Url: document.getElementById('teacher-video2-url'),
            addVideo1RevBtn: document.getElementById('teacher-add-video1-rev-btn'),
            addVideo2RevBtn: document.getElementById('teacher-add-video2-rev-btn'),
            videoRevUrlsContainer: (type) => `teacher-video${type}-rev-urls-container`,
            quizJsonInput: document.getElementById('teacher-quiz-json-input'),
            previewQuizBtn: document.getElementById('teacher-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('teacher-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('teacher-questions-preview-title'),
            questionsPreviewList: document.getElementById('teacher-questions-preview-list'),
            saveLessonBtn: document.getElementById('teacher-save-lesson-btn'),
            saveBtnText: document.getElementById('teacher-save-btn-text'),
            saveLoader: document.getElementById('teacher-save-loader'),

            // 반 설정 수정 모달 관련
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),

            // 과목/교재 관리 모달
            subjectTextbookMgmtModal: document.getElementById('teacher-subject-textbook-mgmt-modal'),
            newSubjectNameInputMgmt: document.getElementById('teacher-new-subject-name'),
            addSubjectBtnMgmt: document.getElementById('teacher-add-subject-btn'),
            subjectsListMgmt: document.getElementById('teacher-subjects-list-mgmt'),
            subjectSelectForTextbookMgmt: document.getElementById('teacher-subject-select-for-textbook-mgmt'),
            textbookManagementContentMgmt: document.getElementById('teacher-textbook-management-content'),
            newTextbookNameInputMgmt: document.getElementById('teacher-new-textbook-name'),
            addTextbookBtnMgmt: document.getElementById('teacher-add-textbook-btn'),
            textbooksListMgmt: document.getElementById('teacher-textbooks-list-mgmt'),
            closeSubjectTextbookModalBtn: document.getElementById('teacher-close-subject-textbook-modal-btn'),
            closeSubjectTextbookModalBtnFooter: document.getElementById('teacher-close-subject-textbook-modal-btn-footer'),

            // QnA 영상
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            qnaVideosList: document.getElementById('qna-videos-list-teacher'),

            // 수업 영상
            lectureVideoDateInput: document.getElementById('class-video-date'),
            lectureVideoListContainer: document.getElementById('class-video-list-container'),
            addLectureVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveLectureVideoBtn: document.getElementById('save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('class-video-title'),
            lectureVideoUrlInput: document.getElementById('class-video-url'),
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),

            // 시험 결과 리포트 관리
            reportDateInput: document.getElementById('teacher-report-date'),
            reportFilesInput: document.getElementById('teacher-report-files-input'),
            reportCurrentClassSpan: document.getElementById('teacher-report-current-class'),
            uploadReportsBtn: document.getElementById('teacher-upload-reports-btn'),
            reportUploadStatus: document.getElementById('teacher-report-upload-status'),
            uploadedReportsList: document.getElementById('teacher-uploaded-reports-list'),
            
            // ✨ analysisDashboard 요소 (analysisDashboard.js에서 null 처리 필요)
            studentDataUploadInput: document.getElementById('student-data-upload-input'),
            testStudentListContainer: document.getElementById('test-analysis-student-list'),
            analysisModal: document.getElementById('analysis-report-modal'),
            analysisHeader: document.getElementById('analysis-report-header'),
            analysisMain: document.getElementById('analysis-report-main'),
            analysisCloseBtn: document.getElementById('analysis-report-close-btn'),
            analysisSaveBtn: document.getElementById('analysis-report-save-btn'),
            pdfAnalysisJsonInput: document.getElementById('pdf-analysis-json-input'),
            loadAnalysisJsonBtn: document.getElementById('load-analysis-json-btn'),
            pdfAnalysisStatus: document.getElementById('pdf-analysis-status'),
        };
    },

    addEventListeners() {
        // 반 선택 변경
        this.elements.classSelect?.addEventListener('change', (e) => this.handleClassSelection(e));

        // 메인 메뉴 네비게이션 버튼
        this.elements.navButtonsContainer?.addEventListener('click', (e) => {
            const card = e.target.closest('.teacher-nav-btn');
            if (card?.dataset.view) this.handleViewChange(card.dataset.view);
        });

        // 각 뷰의 '메뉴로 돌아가기' 버튼
        if (this.elements.mainContent) {
            this.elements.mainContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('back-to-teacher-menu')) {
                    this.showDashboardMenu();
                }
            });
        }

        // 시험 결과 업로드 버튼
        this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload());

        // 시험 결과 날짜 변경 -> 목록 새로고침
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());

        // 업로드된 리포트 목록에서 보기/다운로드 & 삭제 버튼 (이벤트 위임)
        this.elements.uploadedReportsList?.addEventListener('click', async (e) => {
            const viewBtn = e.target.closest('.view-report-btn');
            const deleteBtn = e.target.closest('.delete-report-btn');

            // 보기/다운로드
            if (viewBtn && viewBtn.dataset.url) {
                const fileUrl = viewBtn.dataset.url;
                if (fileUrl) {
                    window.open(fileUrl, '_blank');
                } else {
                    showToast("리포트를 열 수 없습니다.", true);
                }
            }

            // 삭제
            if (deleteBtn && deleteBtn.dataset.path) {
                this.handleDeleteReport(deleteBtn.dataset.path, deleteBtn.dataset.filename);
            }
        });

        // 과목 목록 업데이트 시 관련 UI 갱신
        document.addEventListener('subjectsUpdated', () => {
            console.log("[TeacherApp] 'subjectsUpdated' event received.");
            this.state.isSubjectsLoading = false;
            this.updateSubjectDropdowns();

            // 과목/교재 관리 모달이 열려 있으면 즉시 새 목록 반영
            if (this.classEditor?.managerInstance?.isSubjectTextbookMgmtModalOpen?.()) {
                this.classEditor.managerInstance.renderSubjectListForMgmt();
                this.classEditor.managerInstance.populateSubjectSelectForTextbookMgmt();
            }

            // 반 설정 뷰가 열려 있다면 갱신
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        });

        // 반 변경 시 후속 UI 갱신
        document.addEventListener('class-changed', () => {
            // 리포트 뷰가 열려 있다면 해당 반 기준으로 초기화/갱신
            if (this.state.currentView === 'report-mgmt') {
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
            }
        });
    },

    // 메인 대시보드 메뉴 표시
    showDashboardMenu() {
        this.state.currentView = 'dashboard';
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'grid';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        // 현강반일 경우만 수업 영상 관리 메뉴 노출
        if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
        }

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
    },

    // 특정 뷰(메뉴)로 전환
    handleViewChange(viewName) {
        this.state.currentView = viewName;
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none';
        
        // 모든 뷰 숨기기
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        } else {
            this.showDashboardMenu();
            return;
        }
        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';

        // 전환 시 초기화 동작
        // ⚠️ [수정] 모든 모듈 접근에 대해 철저한 Optional Chaining 적용
        switch (viewName) {
            case 'homework-dashboard': {
                this.homeworkDashboard?.managerInstance?.populateHomeworkSelect();
                
                // homeworkDashboard 모듈의 elements 접근을 안전하게 보호
                const elements = this.homeworkDashboard?.managerInstance?.config?.elements;
                if (elements) {
                    const mgmtButtons = document.getElementById(elements.homeworkManagementButtons);
                    const content = document.getElementById(elements.homeworkContent);
                    const select = document.getElementById(elements.homeworkSelect);
                    
                    if (mgmtButtons) mgmtButtons.style.display = 'none';
                    if (content) content.style.display = 'none';
                    if (select) select.value = '';
                }
                break;
            }
            case 'qna-video-mgmt':
                this.classVideoManager?.initQnaView();
                break;
            case 'lesson-mgmt':
                this.populateSubjectSelectForMgmt();
                if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                if (this.elements.subjectSelectForMgmt) this.elements.subjectSelectForMgmt.value = '';
                break;
            case 'student-list-mgmt':
                this.renderStudentList();
                break;
            case 'class-mgmt':
                this.displayCurrentClassInfo();
                break;
            case 'class-video-mgmt':
                this.classVideoManager?.initLectureView();
                break;
            case 'report-mgmt':
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
                break;
            default:
                this.showDashboardMenu();
                break;
        }
    },

    // 반 선택 변경 시 처리
    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;
        const newClassName = selectedOption.text;

        // 상태 초기화
        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = newClassName;
        this.state.selectedHomeworkId = null;
        this.state.selectedSubjectIdForMgmt = null;
        this.state.selectedLessonId = null;
        this.state.selectedSubjectId = null;
        this.state.selectedClassData = null;
        this.state.studentsInClass.clear();
        this.state.textbooksBySubject = {};
        this.state.selectedReportDate = null;
        this.state.uploadedReports = [];

        // 반 해제된 경우
        if (!this.state.selectedClassId) {
            if (this.elements.mainContent) this.elements.mainContent.style.display = 'none';
            if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
            if (this.elements.gotoClassVideoMgmtBtn) this.elements.gotoClassVideoMgmtBtn.style.display = 'none';
            this.homeworkDashboard.managerInstance?.resetUIState();
            document.dispatchEvent(new CustomEvent('class-changed'));
            return;
        }

        // 로딩 상태 표시
        this.state.isClassDataLoading = true;
        if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();

        // Firestore에서 반 상세 정보 & 학생 목록 조회
        await this.fetchClassData(this.state.selectedClassId);
        this.state.isClassDataLoading = false;

        this.showDashboardMenu();
        this.homeworkDashboard.managerInstance?.populateHomeworkSelect();
        document.dispatchEvent(new CustomEvent('class-changed'));
    },

    // Firestore에서 반 상세 정보 및 학생 목록 조회
    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        this.state.selectedClassData = null;
        let studentFetchError = false;
        let classFetchError = false;

        try {
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(docSnap => {
                this.state.studentsInClass.set(docSnap.id, docSnap.data().name);
            });
            console.log(`[TeacherApp] Fetched ${this.state.studentsInClass.size} students for class ${classId}.`);
        } catch (error) {
            console.error("Error fetching students:", error);
            studentFetchError = true;
        }

        try {
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
            console.log("[TeacherApp] Fetched class data:", this.state.selectedClassData);
        } catch (error) {
            console.error("Error fetching class details:", error);
            classFetchError = true;
        }

        if (studentFetchError || classFetchError) {
            showToast("반 정보 또는 학생 명단 로딩에 실패했습니다.", true);
        }
    },

    // 학생 명단 렌더링
    renderStudentList(hasError = false) {
        if (this.state.currentView !== 'student-list-mgmt') return;

        const container = this.elements.studentListContainer;
        if (!container) return;
        container.innerHTML = '';

        if (this.state.isClassDataLoading) {
            container.innerHTML = '<div class="loader-small mx-auto my-4"></div>';
            return;
        }
        if (hasError) {
            container.innerHTML = '<p class="text-sm text-red-500 p-4">학생 명단 로딩 실패</p>';
            return;
        }
        if (!this.state.selectedClassId) {
            container.innerHTML = '<p class="text-sm text-slate-500 p-4">반을 선택해주세요.</p>';
            return;
        }
        if (this.state.studentsInClass.size === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500 p-4">이 반에 배정된 학생이 없습니다.</p>';
            return;
        }

        const sortedStudents = Array.from(this.state.studentsInClass.entries())
            .sort(([, a], [, b]) => a.localeCompare(b));
        sortedStudents.forEach(([id, name]) => {
            const div = document.createElement('div');
            div.className = "p-3 border-b border-slate-100 bg-white text-sm";
            div.textContent = name;
            container.appendChild(div);
        });
    },

    // 현재 반 설정 정보 표시 (과목/교재 포함)
    async displayCurrentClassInfo() {
        if (this.state.currentView !== 'class-mgmt') return;

        const { currentClassInfo, currentClassType, currentClassSubjectsList } = this.elements;
        if (!currentClassInfo || !currentClassType || !currentClassSubjectsList) return;

        if (this.state.isClassDataLoading) {
            currentClassInfo.style.display = 'block';
            currentClassType.textContent = '로딩 중...';
            currentClassSubjectsList.innerHTML = '<li>로딩 중...</li>';
            return;
        }

        const classData = this.state.selectedClassData;
        if (!classData) {
            currentClassInfo.style.display = 'none';
            return;
        }

        currentClassInfo.style.display = 'block';
        currentClassType.textContent = classData.classType === 'live-lecture' ? '현강반' : '자기주도반';
        currentClassSubjectsList.innerHTML = '';

        if (this.state.isSubjectsLoading) {
            currentClassSubjectsList.innerHTML = '<li>과목 정보 로딩 중...</li>';
            return;
        }
        if (!Array.isArray(this.state.subjects)) {
            currentClassSubjectsList.innerHTML = '<li>과목 정보 오류</li>';
            return;
        }

        const classSubjects = classData.subjects || {};
        const subjectIds = Object.keys(classSubjects);

        if (subjectIds.length === 0) {
            currentClassSubjectsList.innerHTML = '<li>연결된 과목 없음</li>';
            return;
        }

        const neededSubjectIds = subjectIds.filter(
            id => !this.state.textbooksBySubject[id] && !this.state.areTextbooksLoading[id]
        );

        if (neededSubjectIds.length > 0) {
            neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = true);
            currentClassSubjectsList.innerHTML = '<li>과목/교재 정보 로딩 중...</li>';
            try {
                const textbookPromises = neededSubjectIds.map(id => getDocs(collection(db, `subjects/${id}/textbooks`)));
                const textbookSnapshots = await Promise.all(textbookPromises);

                neededSubjectIds.forEach((id, index) => {
                    this.state.textbooksBySubject[id] = textbookSnapshots[index].docs.map(d => ({
                        id: d.id,
                        name: d.data().name
                    }));
                    this.state.areTextbooksLoading[id] = false;
                });

                this.displayCurrentClassInfo();
                return;
            } catch (error) {
                console.error("Error fetching textbooks:", error);
                neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = false);
            }
        }

        currentClassSubjectsList.innerHTML = '';
        subjectIds.forEach(subjectId => {
            const subjectInfo = this.state.subjects.find(s => s.id === subjectId);
            const subjectName = subjectInfo ? subjectInfo.name : `알 수 없는 과목(ID: ${subjectId})`;
            const textbookIds = classSubjects[subjectId]?.textbooks || [];

            const li = document.createElement('li');
            li.textContent = `${subjectName}`;

            const textbooksP = document.createElement('p');
            textbooksP.className = "text-xs pl-4";

            if (textbookIds.length > 0) {
                if (this.state.areTextbooksLoading[subjectId]) {
                    textbooksP.textContent = `교재 로딩 중...`;
                    textbooksP.classList.add("text-slate-400");
                } else if (this.state.textbooksBySubject[subjectId]) {
                    const textbookList = this.state.textbooksBySubject[subjectId];
                    const selectedTextbookNames = textbookIds
                        .map(id => textbookList.find(tb => tb.id === id)?.name)
                        .filter(Boolean);
                    if (selectedTextbookNames.length > 0) {
                        textbooksP.textContent = `교재: ${selectedTextbookNames.join(', ')}`;
                        textbooksP.classList.add("text-slate-500");
                    } else if (textbookIds.length > 0) {
                        textbooksP.textContent = `교재: ${textbookIds.length}개 선택됨 (이름 확인 불가)`;
                        textbooksP.classList.add("text-slate-400");
                    } else {
                        textbooksP.textContent = `선택된 교재 없음 (오류)`;
                        textbooksP.classList.add("text-red-500");
                    }
                } else {
                    textbooksP.textContent = `교재 정보 로드 실패`;
                    textbooksP.classList.add("text-red-500");
                }
            } else {
                textbooksP.textContent = `선택된 교재 없음`;
                textbooksP.classList.add("text-slate-400");
            }

            li.appendChild(textbooksP);
            currentClassSubjectsList.appendChild(li);
        });
    },

    // Firestore에서 모든 공통 과목 목록 실시간 감지
    listenForSubjects() {
        this.state.isSubjectsLoading = true;
        try {
            const q = query(collection(db, 'subjects'), orderBy("name"));
            onSnapshot(q, (snapshot) => {
                this.state.subjects = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
                console.log("[TeacherApp] Subjects loaded:", this.state.subjects);
                this.state.isSubjectsLoading = false;
                document.dispatchEvent(new CustomEvent('subjectsUpdated'));
            }, (error) => {
                console.error("[TeacherApp] Error listening for subjects:", error);
                this.state.isSubjectsLoading = false;
                showToast("과목 목록 로딩 중 오류 발생", true);
                document.dispatchEvent(new CustomEvent('subjectsUpdated'));
            });
        } catch (error) {
            console.error("[TeacherApp] Error setting up subject listener:", error);
            this.state.isSubjectsLoading = false;
            showToast("과목 목록 리스너 설정 실패", true);
        }
    },

    // 과목 관련 드롭다운 UI 업데이트
    updateSubjectDropdowns() {
        if (this.state.isSubjectsLoading) return;

        if (this.state.currentView === 'lesson-mgmt') {
            this.populateSubjectSelectForMgmt();
        }

        if (
            this.homeworkDashboard.managerInstance &&
            this.elements.assignHomeworkModal?.style.display === 'flex'
        ) {
            this.homeworkDashboard.managerInstance.populateSubjectsForHomeworkModal();
        }
    },

    // Firestore에서 모든 반 목록 조회하여 드롭다운 채우기
    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;

        select.disabled = true;
        select.innerHTML = '<option value="">-- 반 목록 로딩 중... --</option>';

        try {
            const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name")));

            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            if (snapshot.empty) {
                select.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
            } else {
                snapshot.forEach(docSnap => {
                    const option = document.createElement('option');
                    option.value = docSnap.id;
                    option.textContent = docSnap.data().name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error populating class select:", error);
            select.innerHTML = '<option value="">-- 목록 로드 실패 --</option>';
            showToast("반 목록 로딩 실패", true);
        } finally {
            select.disabled = false;
        }
    },

    // 학습 관리 뷰의 과목 선택 드롭다운 채우기
    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;

        if (this.state.isSubjectsLoading) {
            select.innerHTML = '<option value="">-- 과목 로딩 중... --</option>';
            select.disabled = true;
            return;
        }

        const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';

        if (!this.state.subjects || this.state.subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false;
        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            select.appendChild(option);
        });

        if (currentSubjectId && this.state.subjects.some(s => s.id === currentSubjectId)) {
            select.value = currentSubjectId;
            this.state.selectedSubjectIdForMgmt = currentSubjectId;

            if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'block';
            if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'none';

            if (this.lessonManager?.managerInstance?.handleLessonFilterChange) {
                this.lessonManager.managerInstance.handleLessonFilterChange();
            }
        } else {
            this.state.selectedSubjectIdForMgmt = null;
            if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
            select.value = '';
            if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
            if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
        }
    },

    // 리포트 업로드 뷰 초기화 (현재 반 이름 표시)
    initReportUploadView() {
        const span = this.elements.reportCurrentClassSpan;
        if (span) {
            span.textContent = this.state.selectedClassName || '반 선택 필요';
        }

        this.state.selectedReportDate = null;
        this.state.uploadedReports = [];

        if (this.elements.reportDateInput) this.elements.reportDateInput.value = '';
        if (this.elements.reportFilesInput) this.elements.reportFilesInput.value = '';
        if (this.elements.reportUploadStatus) this.elements.reportUploadStatus.textContent = '';

        this.renderReportFileList([]);
    },

    // 리포트 업로드 처리
    async handleReportUpload() {
        const dateInput = this.elements.reportDateInput;
        const filesInput = this.elements.reportFilesInput;
        const statusEl = this.elements.reportUploadStatus;
        const uploadBtn = this.elements.uploadReportsBtn;

        if (!dateInput || !filesInput || !statusEl || !uploadBtn) {
            console.error("Report upload UI elements missing.");
            return;
        }

        const classId = this.state.selectedClassId;
        const testDateRaw = dateInput.value;
        const files = filesInput.files;

        if (!classId) {
            showToast("먼저 상단에서 반을 선택해주세요.");
            return;
        }
        if (!testDateRaw || !files || files.length === 0) {
            showToast("시험 날짜와 리포트 파일을 모두 선택해주세요.");
            return;
        }

        // YYYY-MM-DD -> YYYYMMDD
        const testDate = testDateRaw.replace(/-/g, '');
        if (testDate.length !== 8 || !/^\d+$/.test(testDate)) {
            showToast("날짜 형식이 올바르지 않습니다 (YYYY-MM-DD 선택).", true);
            return;
        }

        uploadBtn.disabled = true;
        statusEl.textContent = `파일 ${files.length}개 업로드 시작 중...`;
        let successCount = 0;
        let failCount = 0;

        const uploadPromises = [];
        for (const file of files) {
            uploadPromises.push(
                reportManager.uploadReport(file, classId, testDate)
                    .then(success => {
                        if (success) successCount++;
                        else failCount++;
                        statusEl.textContent =
                            `업로드 진행 중... (${successCount + failCount}/${files.length}, 성공: ${successCount}, 실패: ${failCount})`;
                    })
            );
        }

        try {
            await Promise.all(uploadPromises);
            statusEl.textContent =
                `업로드 완료: 총 ${files.length}개 중 ${successCount}개 성공, ${failCount}개 실패.`;
            showToast(`리포트 업로드 완료 (성공: ${successCount}, 실패: ${failCount})`, failCount > 0);
            filesInput.value = '';
            await this.loadAndRenderUploadedReports();
        } catch (error) {
            console.error("Error during parallel report upload:", error);
            statusEl.textContent =
                `업로드 중 오류 발생. 일부 파일 실패 가능성 있음. (성공: ${successCount}, 실패: ${failCount})`;
            showToast("리포트 업로드 중 오류 발생", true);
        } finally {
            uploadBtn.disabled = false;
        }
    },

    /**
     * 선택된 날짜와 반의 업로드된 리포트 파일 목록을 로드하고 화면에 표시
     */
    async loadAndRenderUploadedReports() {
        const dateInput = this.elements.reportDateInput;
        const listContainer = this.elements.uploadedReportsList;
        const classId = this.state.selectedClassId;

        if (!dateInput || !listContainer) return;

        const testDateRaw = dateInput.value;

        // 날짜나 반이 없으면 초기화
        if (!testDateRaw || !classId) {
            this.state.selectedReportDate = null;
            this.state.uploadedReports = [];
            this.renderReportFileList([]);
            return;
        }

        const testDate = testDateRaw.replace(/-/g, '');
        this.state.selectedReportDate = testDate;

        listContainer.innerHTML = '<p class="text-sm text-slate-400">파일 목록 로딩 중...</p>';

        // reportManager에서 파일 목록 가져오기
        const rawReports = await reportManager.listReportsForDateAndClass(classId, testDate);

        if (!rawReports) {
            listContainer.innerHTML = '<p class="text-sm text-red-500">파일 목록 로딩 실패</p>';
            this.state.uploadedReports = [];
            return;
        }

        // storagePath를 추가하여 상태 업데이트
        const mappedReports = rawReports.map(r => ({
            fileName: r.fileName,
            url: r.url || '',
            storagePath: `reports/${classId}/${testDate}/${r.fileName}`,
        }));

        this.state.uploadedReports = mappedReports;
        this.renderReportFileList(mappedReports);
    },

    /**
     * 리포트 파일 목록 렌더링
     * reports: [{fileName, url, storagePath}]
     */
    renderReportFileList(reports) {
        const listContainer = this.elements.uploadedReportsList;
        if (!listContainer) return;

        listContainer.innerHTML = '';

        if (!reports || reports.length === 0) {
            listContainer.innerHTML =
                '<p class="text-sm text-slate-400 mt-4">해당 날짜에 업로드된 리포트가 없습니다.</p>';
            return;
        }

        const listTitle = document.createElement('h3');
        listTitle.className =
            'text-lg font-semibold text-slate-700 mb-2 mt-4 border-t pt-4';
        listTitle.textContent = `업로드된 리포트 (${reports.length}개)`;
        listContainer.appendChild(listTitle);

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

    /**
     * 삭제 버튼 클릭 시 확인 후 reportManager.deleteReport(storagePath) 호출
     */
    async handleDeleteReport(storagePath, fileName) {
        if (confirm(`'${fileName}' 리포트 파일을 정말 삭제하시겠습니까?`)) {
            const success = await reportManager.deleteReport(storagePath);
            if (success) {
                showToast("리포트 삭제 완료.", false);
                await this.loadAndRenderUploadedReports();
            } else {
                 showToast("리포트 삭제에 실패했습니다.", true);
            }
        }
    }
};

export { TeacherApp };