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
import { db, auth } from '../shared/firebase.js'; // auth 추가
import { showToast } from '../shared/utils.js';

// 모듈 import
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { classVideoManager } from './classVideoManager.js';
import { reportManager } from '../shared/reportManager.js'; // reportManager 추가

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        teacherId: null, // 로그인한 교사 ID
        teacherData: null, // 로그인한 교사 데이터
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        studentsInClass: new Map(), // key: studentId, value: studentName
        subjects: [], // 모든 공통 과목
        textbooksBySubject: {}, // key: subjectId, value: [textbooks]
        selectedSubjectId: null, // 학습 현황용 (lessonDashboard가 사용)
        selectedLessonId: null,  // 학습 현황용 (lessonDashboard가 사용)
        selectedHomeworkId: null, // 숙제 현황용 (homeworkDashboard가 사용)
        selectedSubjectIdForMgmt: null, // 학습 관리용 (lessonManager가 사용)
        lessons: [], // 학습 관리용 (lessonManager가 사용)
        editingLesson: null, // 학습 관리용 (lessonManager가 사용)
        generatedQuiz: null, // 학습 관리용 (lessonManager가 사용)
        editingClass: null, // 반 설정 수정용 (classEditor가 사용)
        editingHomeworkId: null, // 숙제 수정용 (homeworkDashboard가 사용)
        currentView: 'dashboard',
        isSubjectsLoading: true,
        isClassDataLoading: false,
        areTextbooksLoading: {},
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

    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }

        // 로그인 시도 전 로딩 표시 등 UI 처리 추가 가능

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

                // 🚨 임시 비밀번호 비교! 실제로는 Firebase Auth 또는 해싱된 값 비교 필요
                if (data.password === password) {
                    loggedIn = true;
                    userId = userDoc.id;
                    userData = data;
                    showToast(`환영합니다, ${userData.name} 선생님!`, false);
                }
            }

            if (loggedIn && userId && userData) {
                this.state.teacherId = userId; // 교사 ID 저장
                this.state.teacherData = userData; // 교사 데이터 저장
                this.showDashboard(userId, userData); // 대시보드 표시
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
            this.initializeDashboard(); // 대시보드 컴포넌트들 초기화
        }

        // 초기 비밀번호 변경 안내 (필요시)
        if (userData.isInitialPassword === true) {
            this.promptPasswordChange(userId);
        }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("[TeacherApp] Initializing dashboard...");

        // 모듈 인스턴스 저장 및 초기화
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager;

        try {
            this.homeworkDashboard.init(this);
            this.lessonManager.init(this);
            this.classEditor.init(this);
            this.classVideoManager.init(this);
        } catch (e) {
             console.error("Error initializing modules:", e);
             showToast("앱 초기화 중 오류 발생", true);
             return;
        }

        this.addEventListeners(); // 이벤트 리스너 연결
        this.populateClassSelect(); // 반 선택 목록 채우기
        this.listenForSubjects(); // 과목 목록 실시간 감지 시작
        if(this.elements.mainContent) this.elements.mainContent.style.display = 'none'; // 초기에는 메인 컨텐츠 숨김

        console.log("[TeacherApp] Dashboard initialized.");
    },

    async promptPasswordChange(teacherId) {
         const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
         if (newPassword && newPassword.length >= 6) {
             try {
                 // 🚨 중요: 실제 앱에서는 Cloud Function을 통해 비밀번호를 안전하게 업데이트해야 합니다.
                 await updateDoc(doc(db, 'teachers', teacherId), {
                     password: newPassword, // 보안 취약점! 실제 앱에서는 해싱된 값 저장 필요
                     isInitialPassword: false
                 });
                 showToast("비밀번호 변경 완료.", false);
             } catch (error) {
                 console.error("비밀번호 변경 실패:", error);
                 showToast("비밀번호 변경 실패.");
             }
         } else if (newPassword) { // 비밀번호를 입력했지만 6자리 미만인 경우
             showToast("비밀번호는 6자리 이상이어야 합니다.");
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

            views: { // 각 메뉴에 해당하는 뷰 컨테이너
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'student-list-mgmt': document.getElementById('view-student-list-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'),
                'report-mgmt': document.getElementById('view-report-mgmt'), // 추가
            },
            studentListContainer: document.getElementById('teacher-student-list-container'),

            // 반 설정 뷰 관련
            currentClassInfo: document.getElementById('current-class-info'),
            currentClassType: document.getElementById('current-class-type'),
            currentClassSubjectsList: document.getElementById('current-class-subjects-list'),
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            manageSubjectsTextbooksBtn: document.getElementById('teacher-manage-subjects-textbooks-btn'),

            // 숙제 관련 (homeworkManager config와 일치)
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

            // 학습 관리 관련 (lessonManager config와 일치)
            lessonMgmtControls: document.getElementById('lesson-mgmt-controls'),
            subjectSelectForMgmt: document.getElementById('teacher-subject-select-mgmt'),
            lessonsManagementContent: document.getElementById('teacher-lessons-management-content'),
            lessonPrompt: document.getElementById('teacher-lesson-prompt'),
            lessonsList: document.getElementById('teacher-lessons-list'),
            saveOrderBtn: document.getElementById('teacher-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('teacher-show-new-lesson-modal-btn'),
            modal: document.getElementById('teacher-new-lesson-modal'), // 학습 생성/수정 모달
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

             // 반 설정 수정 모달 관련 (classEditor config와 일치)
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),

            // 과목/교재 관리 모달 (classEditor 가 사용)
            subjectTextbookMgmtModal: document.getElementById('teacher-subject-textbook-mgmt-modal'),
            newSubjectNameInputMgmt: document.getElementById('teacher-new-subject-name'), // ID 충돌 주의, 필요시 수정
            addSubjectBtnMgmt: document.getElementById('teacher-add-subject-btn'), // ID 충돌 주의, 필요시 수정
            subjectsListMgmt: document.getElementById('teacher-subjects-list-mgmt'),
            subjectSelectForTextbookMgmt: document.getElementById('teacher-subject-select-for-textbook-mgmt'),
            textbookManagementContentMgmt: document.getElementById('teacher-textbook-management-content'),
            newTextbookNameInputMgmt: document.getElementById('teacher-new-textbook-name'), // ID 충돌 주의, 필요시 수정
            addTextbookBtnMgmt: document.getElementById('teacher-add-textbook-btn'), // ID 충돌 주의, 필요시 수정
            textbooksListMgmt: document.getElementById('teacher-textbooks-list-mgmt'),
            closeSubjectTextbookModalBtn: document.getElementById('teacher-close-subject-textbook-modal-btn'),
            closeSubjectTextbookModalBtnFooter: document.getElementById('teacher-close-subject-textbook-modal-btn-footer'),

            // QnA 영상 (classVideoManager config와 일치)
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            qnaVideosList: document.getElementById('qna-videos-list-teacher'),

            // 수업 영상 (classVideoManager config와 일치 - HTML에 해당 ID 요소 필요)
            lectureVideoDateInput: document.getElementById('class-video-date'),
            lectureVideoListContainer: document.getElementById('class-video-list-container'),
            addLectureVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveLectureVideoBtn: document.getElementById('save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('class-video-title'),
            lectureVideoUrlInput: document.getElementById('class-video-url'),
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),

            // 시험 결과 리포트 관리 (추가)
            reportDateInput: document.getElementById('teacher-report-date'),
            reportFilesInput: document.getElementById('teacher-report-files-input'),
            reportCurrentClassSpan: document.getElementById('teacher-report-current-class'),
            uploadReportsBtn: document.getElementById('teacher-upload-reports-btn'),
            reportUploadStatus: document.getElementById('teacher-report-upload-status'),
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
                 if (e.target.classList.contains('back-to-teacher-menu')) this.showDashboardMenu();
             });
         }

         // 시험 결과 업로드 버튼 (추가)
         this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload());

         // 과목 목록 업데이트 시 관련 UI 갱신 리스너
         document.addEventListener('subjectsUpdated', () => {
             console.log("[TeacherApp] 'subjectsUpdated' event received.");
             this.state.isSubjectsLoading = false; // 로딩 상태 해제
             this.updateSubjectDropdowns(); // 학습 관리, 숙제 모달 등 드롭다운 업데이트

             // 과목/교재 관리 모달 열려있으면 목록 새로고침 (classEditor 내부 로직)
             // ▼▼▼ 이 부분이 스크린샷의 오류 지점입니다. ▼▼▼
             if (this.classEditor?.isSubjectTextbookMgmtModalOpen()) {
                  this.classEditor.renderSubjectListForMgmt();
                  this.classEditor.populateSubjectSelectForTextbookMgmt();
             }
             // ▲▲▲ this.classEditor 로 수정되었습니다. ▲▲▲

             // 반 설정 뷰가 열려있으면 정보 업데이트
             if(this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        });

        // 반 변경 시 필요한 UI 업데이트 리스너 (handleClassSelection 내부에서 직접 호출됨)
        // document.addEventListener('class-changed', () => { ... });
    },

    // 메인 대시보드 메뉴 표시
    showDashboardMenu() {
        this.state.currentView = 'dashboard';
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'grid';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        // 현강반일 경우 '수업 영상 관리' 메뉴 표시
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }
         // 메인 컨텐츠 영역 표시
         if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
    },

    // 특정 뷰(메뉴)로 전환
    handleViewChange(viewName) {
        this.state.currentView = viewName;
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none'; // 메뉴 버튼 숨김
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; }); // 모든 뷰 숨김

        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
             viewToShow.style.display = 'block'; // 요청된 뷰 표시
        } else {
             this.showDashboardMenu(); // 해당 뷰 없으면 메뉴로 복귀
             return;
        }
        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block'; // 메인 컨텐츠 영역 표시

        // 뷰 전환 시 필요한 초기화 로직 수행
        switch (viewName) {
            case 'homework-dashboard':
                // homeworkDashboard 모듈의 populateHomeworkSelect 호출 (숙제 목록 다시 로드)
                this.homeworkDashboard.managerInstance?.populateHomeworkSelect();
                // 숙제 선택 초기화 및 상세 내용 숨김
                const mgmtButtons = document.getElementById(this.homeworkDashboard.managerInstance.config.elements.homeworkManagementButtons);
                const content = document.getElementById(this.homeworkDashboard.managerInstance.config.elements.homeworkContent);
                const select = document.getElementById(this.homeworkDashboard.managerInstance.config.elements.homeworkSelect);
                if (mgmtButtons) mgmtButtons.style.display = 'none';
                if (content) content.style.display = 'none';
                if (select) select.value = '';
                break;
            case 'qna-video-mgmt':
                 this.classVideoManager.initQnaView(); // QnA 영상 뷰 초기화
                break;
            case 'lesson-mgmt':
                 this.populateSubjectSelectForMgmt(); // 학습 관리용 과목 선택 목록 채우기
                 // 초기 상태 설정
                 if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                 if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                 if (this.elements.subjectSelectForMgmt) this.elements.subjectSelectForMgmt.value = ''; // 선택 초기화
                break;
            case 'student-list-mgmt':
                 this.renderStudentList(); // 학생 명단 렌더링
                 break;
            case 'class-mgmt':
                 this.displayCurrentClassInfo(); // 현재 반 설정 정보 표시
                 break;
            case 'class-video-mgmt':
                 this.classVideoManager.initLectureView(); // 수업 영상 뷰 초기화
                 break;
            case 'report-mgmt': // 추가
                 this.initReportUploadView(); // 리포트 업로드 뷰 초기화
                 break;
            default:
                 this.showDashboardMenu(); // 정의되지 않은 뷰면 메뉴로
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
        this.state.textbooksBySubject = {}; // 교재 캐시 초기화

        // 반 선택 해제 시 UI 초기화
        if (!this.state.selectedClassId) {
            if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';
            if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
            if (this.elements.gotoClassVideoMgmtBtn) this.elements.gotoClassVideoMgmtBtn.style.display = 'none'; // 현강반 메뉴 숨김
            this.homeworkDashboard.managerInstance?.resetUIState(); // 숙제 UI 초기화
            document.dispatchEvent(new CustomEvent('class-changed')); // 반 변경 이벤트 발생
            return;
        }

        // 반 데이터 로딩 시작 상태 설정 및 관련 UI 업데이트
        this.state.isClassDataLoading = true;
        if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        if (this.state.currentView === 'student-list-mgmt') this.renderStudentList(); // 로딩 표시

        // Firestore에서 반 상세 정보 및 학생 목록 비동기 조회
        await this.fetchClassData(this.state.selectedClassId);
        this.state.isClassDataLoading = false; // 로딩 완료

        this.showDashboardMenu(); // 데이터 로드 후 메뉴 표시
        this.homeworkDashboard.managerInstance?.populateHomeworkSelect(); // 숙제 목록 업데이트
        document.dispatchEvent(new CustomEvent('class-changed')); // 반 변경 완료 이벤트 발생
    },

    // Firestore에서 반 상세 정보 및 학생 목록 조회
    async fetchClassData(classId) {
        this.state.studentsInClass.clear(); // 학생 목록 초기화
        this.state.selectedClassData = null; // 반 데이터 초기화
        let studentFetchError = false;
        let classFetchError = false;

        try {
            // 학생 목록 조회 (classId 필드 기준)
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(doc => {
                 // key: 학생 문서 ID, value: 학생 이름
                 this.state.studentsInClass.set(doc.id, doc.data().name);
            });
            console.log(`[TeacherApp] Fetched ${this.state.studentsInClass.size} students for class ${classId}.`);
        } catch (error) {
            console.error("Error fetching students:", error);
            studentFetchError = true;
        }

        try {
            // 반 상세 정보 조회
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
            console.log("[TeacherApp] Fetched class data:", this.state.selectedClassData);
        } catch (error) {
            console.error("Error fetching class details:", error);
            classFetchError = true;
        }

        // 오류 발생 시 알림
        if (studentFetchError || classFetchError) {
            showToast("반 정보 또는 학생 명단 로딩에 실패했습니다.", true);
        }
    },

    // 학생 명단 렌더링
    renderStudentList(hasError = false) {
        if (this.state.currentView !== 'student-list-mgmt') return; // 현재 뷰가 아니면 중단

        const container = this.elements.studentListContainer;
        if (!container) return;
        container.innerHTML = ''; // 기존 목록 초기화

        if (this.state.isClassDataLoading) { // 데이터 로딩 중이면 로더 표시
            container.innerHTML = '<div class="loader-small mx-auto my-4"></div>';
            return;
        }
        if (hasError) { // 오류 발생 시 메시지 표시
            container.innerHTML = '<p class.="text-sm text-red-500 p-4">학생 명단 로딩 실패</p>';
            return;
        }
        if (!this.state.selectedClassId) { // 반 선택 안됐으면 안내 메시지
            container.innerHTML = '<p class.="text-sm text-slate-500 p-4">반을 선택해주세요.</p>';
            return;
        }
        if (this.state.studentsInClass.size === 0) { // 학생 없으면 안내 메시지
            container.innerHTML = '<p class.="text-sm text-slate-500 p-4">이 반에 배정된 학생이 없습니다.</p>';
            return;
        }

        // 학생 이름을 기준으로 정렬하여 목록 생성
        const sortedStudents = Array.from(this.state.studentsInClass.entries()).sort(([, a], [, b]) => a.localeCompare(b));
        sortedStudents.forEach(([id, name]) => {
            const div = document.createElement('div');
            div.className = "p-3 border-b border-slate-100 bg-white text-sm";
            div.textContent = name;
            container.appendChild(div);
        });
    },

    // 현재 반 설정 정보 표시 (과목/교재 포함)
    async displayCurrentClassInfo() {
        if (this.state.currentView !== 'class-mgmt') return; // 현재 뷰가 아니면 중단

        const { currentClassInfo, currentClassType, currentClassSubjectsList } = this.elements;
        if (!currentClassInfo || !currentClassType || !currentClassSubjectsList) return;

        // 로딩 중 상태 처리
        if (this.state.isClassDataLoading) {
            currentClassInfo.style.display = 'block';
            currentClassType.textContent = '로딩 중...';
            currentClassSubjectsList.innerHTML = '<li>로딩 중...</li>';
            return;
        }

        const classData = this.state.selectedClassData;
        if (!classData) { // 반 데이터 없으면 숨김
            currentClassInfo.style.display = 'none';
            return;
        }

        currentClassInfo.style.display = 'block'; // 정보 영역 표시
        // 반 유형 표시
        currentClassType.textContent = classData.classType === 'live-lecture' ? '현강반' : '자기주도반';
        currentClassSubjectsList.innerHTML = ''; // 과목 목록 초기화

        // 과목 로딩 상태 확인
        if (this.state.isSubjectsLoading) {
            currentClassSubjectsList.innerHTML = '<li>과목 정보 로딩 중...</li>';
            return;
        }
        if (!Array.isArray(this.state.subjects)) {
            currentClassSubjectsList.innerHTML = '<li>과목 정보 오류</li>';
            return;
        }

        const classSubjects = classData.subjects || {}; // 현재 반에 설정된 과목 정보
        const subjectIds = Object.keys(classSubjects); // 설정된 과목 ID 목록

        if (subjectIds.length === 0) { // 설정된 과목 없으면 메시지 표시
            currentClassSubjectsList.innerHTML = '<li>연결된 과목 없음</li>';
            return;
        }

        // 아직 로드되지 않은 교재 정보가 있는지 확인
        const neededSubjectIds = subjectIds.filter(id => !this.state.textbooksBySubject[id] && !this.state.areTextbooksLoading[id]);

        // 필요한 교재 정보 비동기 로드
        if (neededSubjectIds.length > 0) {
            neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = true); // 로딩 상태 설정
            currentClassSubjectsList.innerHTML = '<li>과목/교재 정보 로딩 중...</li>'; // 로딩 메시지 표시
            try {
                // 여러 과목의 교재 정보를 병렬로 가져옴
                const textbookPromises = neededSubjectIds.map(id => getDocs(collection(db, `subjects/${id}/textbooks`)));
                const textbookSnapshots = await Promise.all(textbookPromises);

                // 가져온 교재 정보를 state.textbooksBySubject에 저장 (캐싱)
                neededSubjectIds.forEach((id, index) => {
                    this.state.textbooksBySubject[id] = textbookSnapshots[index].docs.map(d => ({ id: d.id, name: d.data().name }));
                    this.state.areTextbooksLoading[id] = false; // 로딩 상태 해제
                });
                // 교재 정보 로드 후 다시 UI 렌더링
                this.displayCurrentClassInfo();
                return; // 재귀 호출 후 종료
            } catch (error) {
                console.error("Error fetching textbooks:", error);
                neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = false); // 오류 시 로딩 상태 해제
                // 오류 발생해도 일단 진행하여 일부 정보라도 표시 시도
            }
        }

        // 과목 및 선택된 교재 목록 UI 생성
        currentClassSubjectsList.innerHTML = ''; // 목록 초기화
        subjectIds.forEach(subjectId => {
            const subjectInfo = this.state.subjects.find(s => s.id === subjectId); // 전체 과목 목록에서 정보 찾기
            const subjectName = subjectInfo ? subjectInfo.name : `알 수 없는 과목(ID: ${subjectId})`;
            const textbookIds = classSubjects[subjectId]?.textbooks || []; // 이 반의 이 과목에 선택된 교재 ID 목록

            const li = document.createElement('li');
            li.textContent = `${subjectName}`; // 과목 이름 표시

            const textbooksP = document.createElement('p'); // 교재 정보 표시할 p 태그
            textbooksP.className = "text-xs pl-4";

            if (textbookIds.length > 0) { // 선택된 교재가 있을 경우
                if (this.state.areTextbooksLoading[subjectId]) { // 아직 로딩 중이면
                    textbooksP.textContent = `교재 로딩 중...`;
                    textbooksP.classList.add("text-slate-400");
                } else if (this.state.textbooksBySubject[subjectId]) { // 교재 정보 로드 완료
                    const textbookList = this.state.textbooksBySubject[subjectId];
                    // 선택된 교재 ID에 해당하는 교재 이름 찾기
                    const selectedTextbookNames = textbookIds.map(id => textbookList.find(tb => tb.id === id)?.name).filter(Boolean);
                    if (selectedTextbookNames.length > 0) {
                        textbooksP.textContent = `교재: ${selectedTextbookNames.join(', ')}`;
                        textbooksP.classList.add("text-slate-500");
                    } else if (textbookIds.length > 0) {
                        // 교재 ID는 있는데 이름을 못 찾은 경우 (데이터 불일치 등)
                        textbooksP.textContent = `교재: ${textbookIds.length}개 선택됨 (이름 확인 불가)`;
                        textbooksP.classList.add("text-slate-400");
                    } else {
                        textbooksP.textContent = `선택된 교재 없음 (오류)`;
                        textbooksP.classList.add("text-red-500");
                    }
                } else { // 교재 정보 로드 실패
                    textbooksP.textContent = `교재 정보 로드 실패`;
                    textbooksP.classList.add("text-red-500");
                }
            } else { // 선택된 교재 없음
                textbooksP.textContent = `선택된 교재 없음`;
                textbooksP.classList.add("text-slate-400");
            }

            li.appendChild(textbooksP); // 과목 li에 교재 정보 추가
            currentClassSubjectsList.appendChild(li); // 전체 목록에 추가
        });
    },

    // Firestore에서 모든 공통 과목 목록 실시간 감지
    listenForSubjects() {
        this.state.isSubjectsLoading = true; // 로딩 시작 상태
        try {
            const q = query(collection(db, 'subjects'), orderBy("name")); // 이름순 정렬 쿼리
            onSnapshot(q, (snapshot) => {
                this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // this.state.subjects.sort((a, b) => a.name.localeCompare(b.name)); // Firestore에서 정렬하므로 제거 가능
                console.log("[TeacherApp] Subjects loaded:", this.state.subjects);
                this.state.isSubjectsLoading = false; // 로딩 완료
                document.dispatchEvent(new CustomEvent('subjectsUpdated')); // 이벤트 발생시켜 다른 모듈에 알림
            }, (error) => { // 에러 핸들링
                console.error("[TeacherApp] Error listening for subjects:", error);
                this.state.isSubjectsLoading = false;
                showToast("과목 목록 로딩 중 오류 발생", true);
                document.dispatchEvent(new CustomEvent('subjectsUpdated')); // 에러 발생 시에도 이벤트 발생
            });
        } catch (error) { // 쿼리 설정 자체의 오류 핸들링
            console.error("[TeacherApp] Error setting up subject listener:", error);
            this.state.isSubjectsLoading = false;
            showToast("과목 목록 리스너 설정 실패", true);
        }
    },

    // 과목 관련 드롭다운 UI 업데이트
    updateSubjectDropdowns() {
         if (this.state.isSubjectsLoading) return; // 로딩 중이면 중단

         // 학습 관리 뷰의 과목 드롭다운 업데이트
         if (this.state.currentView === 'lesson-mgmt') {
             this.populateSubjectSelectForMgmt();
         }
         // 숙제 생성/수정 모달이 열려 있으면 과목 드롭다운 업데이트
         if (this.homeworkDashboard.managerInstance && this.elements.assignHomeworkModal?.style.display === 'flex') {
             this.homeworkDashboard.managerInstance.populateSubjectsForHomeworkModal();
         }
    },

    // Firestore에서 모든 반 목록 조회하여 드롭다운 채우기
    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;

        select.disabled = true; // 로딩 중 비활성화
        select.innerHTML = '<option value="">-- 반 목록 로딩 중... --</option>';

        try {
            // Firestore에서 'classes' 컬렉션 조회 (이름순 정렬)
            const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name")));

            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>'; // 기본 옵션
            if (snapshot.empty) {
                select.innerHTML += '<option value="" disabled>등록된 반 없음</option>'; // 반 없을 때
            } else {
                snapshot.forEach(doc => { // 조회된 반 목록으로 옵션 추가
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error("Error populating class select:", error);
            select.innerHTML = '<option value="">-- 목록 로드 실패 --</option>'; // 오류 시
            showToast("반 목록 로딩 실패", true);
        } finally {
            select.disabled = false; // 로딩 완료 후 활성화
        }
    },

    // 학습 관리 뷰의 과목 선택 드롭다운 채우기
    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;

        // 과목 로딩 중 처리
        if (this.state.isSubjectsLoading) {
            select.innerHTML = '<option value="">-- 과목 로딩 중... --</option>';
            select.disabled = true;
            return;
        }

        const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt; // 현재 선택값 유지 시도
        select.innerHTML = '<option value="">-- 과목 선택 --</option>'; // 기본 옵션

        // 학습 목록 UI 초기화
        if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
        if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';

        // 과목 목록 없을 때
        if (!this.state.subjects || this.state.subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            select.disabled = true;
            return;
        }

        select.disabled = false; // 과목 있으면 활성화
        // 로드된 과목 목록으로 옵션 추가
        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            select.appendChild(option);
        });

        // 이전에 선택된 과목 유지 또는 초기화
        if (currentSubjectId && this.state.subjects.some(s => s.id === currentSubjectId)) {
            select.value = currentSubjectId; // 이전 선택값 복원
            this.state.selectedSubjectIdForMgmt = currentSubjectId; // 상태 업데이트
            // 과목 선택 시 학습 목록 영역 표시
            if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'block';
            if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'none';
            // lessonManager의 필터 변경 핸들러 호출 (학습 목록 로드 시작)
            if (this.lessonManager?.managerInstance?.handleLessonFilterChange) {
                this.lessonManager.managerInstance.handleLessonFilterChange();
            }
        } else { // 선택된 과목 없거나 목록에 없으면 초기화
            this.state.selectedSubjectIdForMgmt = null;
            if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
            select.value = ''; // 드롭다운 선택 초기화
            if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
            if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
        }
    },

    // 리포트 업로드 뷰 초기화 (현재 반 이름 표시) - 추가됨
    initReportUploadView() {
        if (this.elements.reportCurrentClassSpan) {
            this.elements.reportCurrentClassSpan.textContent = this.state.selectedClassName || '반 선택 필요';
        }
        // 입력 필드 및 상태 초기화
        if(this.elements.reportDateInput) this.elements.reportDateInput.value = '';
        if(this.elements.reportFilesInput) this.elements.reportFilesInput.value = '';
        if(this.elements.reportUploadStatus) this.elements.reportUploadStatus.textContent = '';
    },

    // 리포트 업로드 처리 - 추가됨
    async handleReportUpload() {
        const dateInput = this.elements.reportDateInput;
        const filesInput = this.elements.reportFilesInput;
        const statusEl = this.elements.reportUploadStatus;
        const uploadBtn = this.elements.uploadReportsBtn;

        if (!dateInput || !filesInput || !statusEl || !uploadBtn) {
             console.error("Report upload UI elements missing."); return;
        }

        const classId = this.state.selectedClassId; // 현재 선택된 반 ID 사용
        const testDateRaw = dateInput.value; // YYYY-MM-DD
        const files = filesInput.files;

        if (!classId) {
            showToast("먼저 상단에서 반을 선택해주세요.");
            return;
        }
        if (!testDateRaw || !files || files.length === 0) {
            showToast("시험 날짜와 리포트 파일을 모두 선택해주세요.");
            return;
        }

        // 날짜 형식을 YYYYMMDD로 변환
        const testDate = testDateRaw.replace(/-/g, '');
        if (testDate.length !== 8 || !/^\d+$/.test(testDate)) {
             showToast("날짜 형식이 올바르지 않습니다 (YYYY-MM-DD 선택).", true);
             return;
        }

        uploadBtn.disabled = true; // 버튼 비활성화
        statusEl.textContent = `파일 ${files.length}개 업로드 시작 중...`;
        let successCount = 0;
        let failCount = 0;

        // 모든 파일 업로드를 병렬로 처리
        const uploadPromises = [];
        for (const file of files) {
            uploadPromises.push(
                reportManager.uploadReport(file, classId, testDate)
                    .then(success => {
                        if (success) successCount++;
                        else failCount++;
                        // 각 파일 처리 후 상태 업데이트 (선택적)
                        statusEl.textContent = `업로드 진행 중... (${successCount + failCount}/${files.length}, 성공: ${successCount}, 실패: ${failCount})`;
                    })
            );
        }

        try {
            await Promise.all(uploadPromises); // 모든 업로드 완료까지 대기
            statusEl.textContent = `업로드 완료: 총 ${files.length}개 중 ${successCount}개 성공, ${failCount}개 실패.`;
            showToast(`리포트 업로드 완료 (성공: ${successCount}, 실패: ${failCount})`, failCount > 0);
            filesInput.value = ''; // 파일 입력 필드 초기화
        } catch (error) {
            console.error("Error during parallel report upload:", error);
            statusEl.textContent = `업로드 중 오류 발생. 일부 파일 실패 가능성 있음. (성공: ${successCount}, 실패: ${failCount})`;
            showToast("리포트 업로드 중 오류 발생", true);
        } finally {
            uploadBtn.disabled = false; // 버튼 다시 활성화
        }
    },


}; // TeacherApp 객체 끝

export { TeacherApp };