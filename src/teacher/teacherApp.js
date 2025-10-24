// src/teacher/teacherApp.js

// Firestore import 문법 수정 및 필요한 함수 추가
import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    onSnapshot, // 수정됨
    updateDoc,  // 추가됨
    addDoc,     // 추가됨
    serverTimestamp,
    orderBy,
    deleteDoc
} from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 모듈 import
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { classVideoManager } from './classVideoManager.js';

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null, // 반 상세 데이터 (Firestore 문서)
        studentsInClass: new Map(), // <studentId, studentName>
        subjects: [], // 앱 전체에서 공유하는 과목 목록 (Firestore 문서 배열)
        textbooksBySubject: {}, // { subjectId: [{id, name}, ...], ... } : 교재 정보 캐시
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        editingClass: null, // classEditor에서 수정 중인 반 데이터 참조
        editingHomeworkId: null,
        currentView: 'dashboard', // 현재 활성화된 뷰 추적
        isSubjectsLoading: true, // 과목 로딩 상태 추가
        isClassDataLoading: false, // 반 데이터 로딩 상태 추가
        areTextbooksLoading: {}, // { subjectId: boolean } 교재 로딩 상태
    },

    init() {
        if (this.isInitialized) return; // 중복 초기화 방지

        this.cacheElements(); // DOM 요소 캐싱 먼저 수행

        // 로그인 관련 이벤트 리스너 설정
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

        // 초기 화면 설정
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'flex';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'none';

        // isInitialized 플래그는 dashboard 초기화 시 true로 설정
    },

    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }
        // 로딩 표시 추가 (선택 사항)
        // showToast("로그인 중...", false);

        try {
            // Firestore 보안 규칙 때문에 직접 비밀번호 비교는 실제 앱에서는 부적절합니다.
            // Cloud Functions를 이용한 인증 로직 구현을 권장합니다.
            // 여기서는 제공된 코드 구조를 유지하며 임시로 진행합니다.

            let loggedIn = false;
            let userId = null;
            let userData = null;

            // 교사 검색
            const teacherQuery = query(collection(db, 'teachers'), where("name", "==", name));
            const teacherSnapshot = await getDocs(teacherQuery);

            if (!teacherSnapshot.empty) {
                const userDoc = teacherSnapshot.docs[0];
                const data = userDoc.data();
                // 임시 비밀번호 비교 (실제 앱에서는 해싱된 값 비교 필요)
                if (data.password === password) {
                    loggedIn = true;
                    userId = userDoc.id;
                    userData = data;
                    showToast(`환영합니다, ${userData.name} 선생님!`, false);
                }
            }

            // 교사 로그인 실패 시 관리자 검색
            if (!loggedIn) {
                const adminQuery = query(collection(db, 'admins'), where("name", "==", name));
                const adminSnapshot = await getDocs(adminQuery);
                if (!adminSnapshot.empty) {
                    const adminDoc = adminSnapshot.docs[0];
                    const adminData = adminDoc.data();
                    // 임시 비밀번호 비교
                    if (adminData.password === password) {
                        loggedIn = true;
                        userId = adminDoc.id;
                        userData = adminData; // role 등 필요한 정보 포함 가정
                        showToast(`환영합니다, ${adminData.name} 관리자님!`, false);
                    }
                }
            }

            // 로그인 성공/실패 처리
            if (loggedIn && userId && userData) {
                this.showDashboard(userId, userData);
            } else {
                showToast("이름 또는 비밀번호가 일치하지 않습니다.");
            }

        } catch (error) {
            console.error("Login error:", error);
            if (error.code === 'permission-denied') {
                 showToast("로그인 정보 조회 권한이 부족합니다. Firestore 규칙을 확인하세요.");
            } else if (error.code === 'unavailable') {
                 showToast("서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.");
            }
            else {
                showToast("로그인 중 오류가 발생했습니다.");
            }
        } finally {
            // 로딩 표시 제거 (선택 사항)
        }
    },

    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';

        // 대시보드 초기화 (최초 로그인 시 1회만 실행)
        if (!this.isInitialized) {
            this.initializeDashboard();
        }

        // 최초 비밀번호 변경 프롬프트 (교사만 해당, 관리자 제외 가정)
         if (userData.isInitialPassword === true && userData.role !== 'admin') {
             this.promptPasswordChange(userId);
         }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true; // 초기화 플래그 설정
        console.log("[TeacherApp] Initializing dashboard...");

        // this.cacheElements(); // init에서 이미 호출됨

        // 모듈 할당
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager;

        // 모듈 초기화 (this(TeacherApp)를 전달)
        try {
            this.homeworkDashboard.init(this);
            this.lessonManager.init(this);
            this.classEditor.init(this); // classEditor 초기화 호출 확인
            this.classVideoManager.init(this);
        } catch (e) {
             console.error("Error initializing modules:", e);
             showToast("앱 초기화 중 오류 발생", true);
             return; // 초기화 실패 시 중단
        }


        this.addEventListeners(); // 이벤트 리스너 설정
        this.populateClassSelect(); // 반 목록 로드
        this.listenForSubjects(); // 과목 목록 실시간 감지 시작
        this.showDashboardMenu(); // 초기 화면으로 메뉴 표시

        console.log("[TeacherApp] Dashboard initialized.");
    },

     async promptPasswordChange(teacherId) {
         const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
         if (newPassword && newPassword.length >= 6) {
             try {
                 const teacherRef = doc(db, 'teachers', teacherId);
                 // 🚨 중요: 실제 앱에서는 비밀번호를 해싱하여 저장해야 합니다.
                 await updateDoc(teacherRef, {
                     password: newPassword, // 보안 취약점! 실제로는 해싱된 값 저장
                     isInitialPassword: false
                 });
                 showToast("비밀번호가 성공적으로 변경되었습니다.", false);
             } catch (error) {
                 console.error("비밀번호 변경 실패:", error);
                 showToast("비밀번호 변경에 실패했습니다.");
             }
         } else if (newPassword) {
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

            views: {
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'student-list-mgmt': document.getElementById('view-student-list-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'),
            },
            studentListContainer: document.getElementById('teacher-student-list-container'),

            // 반 설정 뷰 관련 요소
            currentClassInfo: document.getElementById('current-class-info'),
            currentClassType: document.getElementById('current-class-type'),
            currentClassSubjectsList: document.getElementById('current-class-subjects-list'),
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
            modal: document.getElementById('teacher-new-lesson-modal'), // 학습 세트 모달
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
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            editClassModal: document.getElementById('teacher-edit-class-modal'), // ID 확인!
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),

            // 질문 영상 관련
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            qnaVideoListContainer: document.getElementById('qna-video-list-teacher-container'),
            qnaVideosList: document.getElementById('qna-videos-list-teacher'),

            // 수업 영상 관련
            classVideoDateInput: document.getElementById('class-video-date'),
            classVideoListContainer: document.getElementById('class-video-list-container'),
            addClassVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveClassVideoBtn: document.getElementById('save-class-video-btn'),
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),
        };
        // 캐싱 후 필수 요소 확인 (디버깅용)
        // if (!this.elements.editClassModal) console.error("FATAL: teacher-edit-class-modal not found during cache!");
    },

     addEventListeners() {
        if (this.elements.classSelect) {
            this.elements.classSelect.addEventListener('change', (e) => this.handleClassSelection(e));
        }
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.addEventListener('click', (e) => {
                 const card = e.target.closest('.teacher-nav-btn');
                 if (card && card.dataset.view) {
                     this.handleViewChange(card.dataset.view);
                 }
            });
        }
         if (this.elements.mainContent) {
             this.elements.mainContent.addEventListener('click', (e) => {
                 if (e.target.classList.contains('back-to-teacher-menu')) {
                     this.showDashboardMenu();
                 }
             });
         }
         this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo().then(() => this.loadQnaVideosForTeacher()));
         this.elements.qnaVideoDateInput?.addEventListener('change', () => this.loadQnaVideosForTeacher());

         // 과목 로딩 완료 시 UI 업데이트 리스너
         document.addEventListener('subjectsUpdated', () => {
             console.log("[TeacherApp] 'subjectsUpdated' event received.");
             this.state.isSubjectsLoading = false; // 로딩 완료 상태 변경
             this.updateSubjectDropdowns(); // 드롭다운 업데이트

             // 과목/교재 관리 모달 열려있으면 갱신
             const mgmtModal = document.getElementById('teacher-subject-textbook-mgmt-modal');
             if (mgmtModal && mgmtModal.style.display === 'flex' && this.classEditor) {
                 this.classEditor.renderSubjectListForMgmt();
                 this.classEditor.populateSubjectSelectForTextbookMgmt();
             }
             // 현재 반 설정 뷰가 보이고 있다면 정보 갱신
             if(this.state.currentView === 'class-mgmt') {
                 this.displayCurrentClassInfo();
             }
        });
    },

    showDashboardMenu() {
        this.state.currentView = 'dashboard';
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'grid';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }
    },

    handleViewChange(viewName) {
        this.state.currentView = viewName;
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) { viewToShow.style.display = 'block'; }
        else { this.showDashboardMenu(); return; }

        switch (viewName) {
            case 'homework-dashboard':
                if (this.elements.homeworkDashboardControls) this.elements.homeworkDashboardControls.style.display = 'flex';
                if (this.elements.homeworkManagementButtons) this.elements.homeworkManagementButtons.style.display = 'none';
                if (this.elements.homeworkContent) this.elements.homeworkContent.style.display = 'none';
                this.homeworkDashboard.populateHomeworkSelect();
                if(this.elements.homeworkSelect) this.elements.homeworkSelect.value = '';
                break;
             case 'qna-video-mgmt':
                 const todayQna = new Date().toISOString().slice(0, 10);
                 if(this.elements.qnaVideoDateInput) {
                     if (!this.elements.qnaVideoDateInput.value || this.elements.qnaVideoDateInput.value !== todayQna) { this.elements.qnaVideoDateInput.value = todayQna; }
                     this.loadQnaVideosForTeacher(this.elements.qnaVideoDateInput.value); // 날짜 변경 후 로드
                 } else { this.loadQnaVideosForTeacher(); } // 날짜 입력 없으면 기본 로드
                 if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
                 if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
                break;
            case 'lesson-mgmt':
                 if (this.elements.lessonMgmtControls) this.elements.lessonMgmtControls.style.display = 'block';
                 if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                 if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                 this.populateSubjectSelectForMgmt();
                 if(this.elements.subjectSelectForMgmt) this.elements.subjectSelectForMgmt.value = '';
                break;
            case 'student-list-mgmt': this.renderStudentList(); break;
            case 'class-mgmt':
                // 반 설정 뷰 진입 시, 데이터 로딩 상태 확인 후 정보 표시
                if (this.state.isClassDataLoading || this.state.isSubjectsLoading) {
                    this.displayCurrentClassInfo(); // 로딩 메시지 표시
                } else if (this.state.selectedClassData) {
                    this.displayCurrentClassInfo(); // 데이터 있으면 표시
                } else {
                    // 데이터 없으면 로딩 시도 (선택 사항)
                    if (this.state.selectedClassId) {
                        this.state.isClassDataLoading = true;
                        this.displayCurrentClassInfo(); // 로딩 메시지 표시
                        this.fetchClassData(this.state.selectedClassId).then(() => {
                            this.state.isClassDataLoading = false;
                            this.displayCurrentClassInfo(); // 로드 후 표시
                        });
                    } else {
                         this.displayCurrentClassInfo(); // 반 선택 안 된 상태 메시지 표시
                    }
                }
                break;
             case 'class-video-mgmt':
                 this.classVideoManager.initView();
                 break;
            default: this.showDashboardMenu(); break;
        }
    },

    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;
        const newClassName = selectedOption.text;

        // 반 선택 시 항상 메뉴 뷰로 돌아감 (선택 사항)
        // if (this.state.currentView !== 'dashboard') { this.showDashboardMenu(); }

        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = newClassName;
        this.state.selectedHomeworkId = null;
        this.state.selectedSubjectIdForMgmt = null;
        this.state.selectedLessonId = null;
        this.state.selectedSubjectId = null;
        this.state.selectedClassData = null; // 반 데이터 초기화
        this.state.studentsInClass.clear(); // 학생 데이터 초기화

        // 반 선택 해제 시 처리
        if (!this.state.selectedClassId) {
            if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';
            // 현재 활성화된 뷰에 따라 UI 업데이트
            if (this.state.currentView === 'student-list-mgmt') { this.renderStudentList(); }
            if (this.state.currentView === 'class-mgmt') { this.displayCurrentClassInfo(); }
            if (this.elements.gotoClassVideoMgmtBtn) { this.elements.gotoClassVideoMgmtBtn.style.display = 'none'; }
            // 다른 뷰들도 필요에 따라 초기화
            // this.homeworkDashboard?.resetView(); // 예시
            return;
        }

        // 반 선택 시 처리
        if(this.elements.mainContent) this.elements.mainContent.style.display = 'block';

        // 로딩 상태 설정 및 데이터 로드
        this.state.isClassDataLoading = true;
        // 현재 뷰가 반 설정 또는 학생 목록이면 로딩 상태 표시
        if (this.state.currentView === 'class-mgmt') { this.displayCurrentClassInfo(); }
        if (this.state.currentView === 'student-list-mgmt') { this.renderStudentList(); }

        await this.fetchClassData(this.state.selectedClassId); // 데이터 로드 (학생 + 반)
        this.state.isClassDataLoading = false; // 로딩 완료

        // 현강반 메뉴 버튼 업데이트
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }

        // 현재 뷰에 따라 UI 업데이트
        if (this.state.currentView === 'student-list-mgmt') { this.renderStudentList(); }
        else if (this.state.currentView === 'class-mgmt') { this.displayCurrentClassInfo(); }
        // 다른 모듈/뷰에도 변경 알림 (필요한 경우)
        // this.homeworkDashboard?.handleClassChange(); // 예시

        document.dispatchEvent(new CustomEvent('class-changed'));
    },

    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        this.state.selectedClassData = null; // 로드 전 초기화
        let studentFetchError = false;
        let classFetchError = false;

        try {
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));
        } catch (error) { console.error("Error fetching students:", error); showToast("학생 명단 로딩 실패.", true); studentFetchError = true; }

        try {
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
        } catch (error) { console.error("Error fetching class details:", error); showToast("반 정보 로딩 실패.", true); classFetchError = true; }

        // 로딩 상태 해제는 handleClassSelection에서
    },

    renderStudentList(hasError = false) {
        if (this.state.currentView !== 'student-list-mgmt') return;
        const container = this.elements.studentListContainer;
        if (!container) { console.error("studentListContainer element not found."); return; }
        container.innerHTML = '';

        if (this.state.isClassDataLoading) { // 반 데이터 로딩 중 확인
             container.innerHTML = '<div class="loader-small mx-auto"></div>'; return;
        }
        if (hasError) { container.innerHTML = '<p class="text-sm text-red-500">학생 명단 로딩 실패</p>'; return; }
        if (!this.state.selectedClassId) { container.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>'; return; }
        if (this.state.studentsInClass.size === 0) { container.innerHTML = '<p class="text-sm text-slate-500">이 반에 배정된 학생이 없습니다.</p>'; return; }

        const sortedStudents = Array.from(this.state.studentsInClass.entries()).sort(([, a], [, b]) => a.localeCompare(b));
        sortedStudents.forEach(([id, name]) => {
            const studentDiv = document.createElement('div');
            studentDiv.className = "p-3 border-b border-slate-100 bg-white";
            studentDiv.textContent = name;
            container.appendChild(studentDiv);
        });
    },

    // ======== 현재 반 설정 정보 표시 함수 (수정됨) ========
    async displayCurrentClassInfo() {
        if (this.state.currentView !== 'class-mgmt') return;

        const { currentClassInfo, currentClassType, currentClassSubjectsList } = this.elements;

        // 필수 요소 확인
        if (!currentClassInfo || !currentClassType || !currentClassSubjectsList) {
            console.error("반 설정 정보 표시 영역 요소를 찾을 수 없습니다.");
            if(currentClassInfo) currentClassInfo.style.display = 'none';
            return;
        }

        // 반 데이터 로딩 중 처리
        if (this.state.isClassDataLoading) {
            currentClassInfo.style.display = 'block';
            currentClassType.textContent = '로딩 중...';
            currentClassSubjectsList.innerHTML = '<li>로딩 중...</li>';
            return;
        }

        const classData = this.state.selectedClassData;

        // 반 데이터 없는 경우 처리
        if (!classData) {
            currentClassInfo.style.display = 'none'; // 반 선택 안됐거나 로드 실패 시 숨김
            return;
        }

        currentClassInfo.style.display = 'block';

        // 반 유형 표시
        currentClassType.textContent = classData.classType === 'live-lecture' ? '현강반' : '자기주도반';

        // 연결된 과목 및 교재 목록 표시 (과목 로딩 상태 확인)
        currentClassSubjectsList.innerHTML = ''; // 기존 목록 비우기

        // 과목 데이터 로딩 중 처리
        if (this.state.isSubjectsLoading) {
            currentClassSubjectsList.innerHTML = '<li>과목 정보 로딩 중...</li>';
            return; // 과목 로드될 때까지 대기 (subjectsUpdated 이벤트에서 다시 호출됨)
        }
        // 과목 데이터 로드 완료 확인
        if (!Array.isArray(this.state.subjects)) {
             currentClassSubjectsList.innerHTML = '<li>과목 정보를 불러올 수 없습니다.</li>';
             return;
        }

        const classSubjects = classData.subjects || {};
        const subjectIds = Object.keys(classSubjects);

        if (subjectIds.length === 0) {
            currentClassSubjectsList.innerHTML = '<li>연결된 과목 없음</li>';
            return;
        }

        // 교재 정보 미리 로드 (필요한 경우만, 효율성 개선 가능)
        const neededSubjectIds = subjectIds.filter(id => !this.state.textbooksBySubject[id] && !this.state.areTextbooksLoading[id]);
        if (neededSubjectIds.length > 0) {
            neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = true);
            currentClassSubjectsList.innerHTML = '<li>과목/교재 정보 로딩 중...</li>'; // 로딩 표시
            try {
                const textbookPromises = neededSubjectIds.map(subjectId =>
                    getDocs(collection(db, `subjects/${subjectId}/textbooks`))
                );
                const textbookSnapshots = await Promise.all(textbookPromises);
                neededSubjectIds.forEach((subjectId, index) => {
                    this.state.textbooksBySubject[subjectId] = textbookSnapshots[index].docs.map(doc => ({ id: doc.id, name: doc.data().name }));
                    this.state.areTextbooksLoading[subjectId] = false;
                });
                 // 교재 로드 후 다시 렌더링 (재귀 호출 대신 직접 호출)
                 this.displayCurrentClassInfo(); // ★★★ 여기를 수정
                 return; // 재귀 호출 제거
            } catch (error) {
                console.error("교재 정보 로딩 실패:", error);
                neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = false);
                showToast("일부 교재 정보를 불러오지 못했습니다.", true);
                // 오류 발생해도 일단 현재까지 로드된 정보로 표시 시도
            }
        }

        // 과목 및 교재 목록 생성 (교재 로딩 완료 후 실행됨)
        currentClassSubjectsList.innerHTML = ''; // 다시 초기화
        subjectIds.forEach(subjectId => {
            const subjectInfo = this.state.subjects.find(s => s.id === subjectId);
            const subjectName = subjectInfo ? subjectInfo.name : `알 수 없는 과목 (ID: ${subjectId})`;
            const textbookIds = classSubjects[subjectId]?.textbooks || [];

            const li = document.createElement('li');
            li.textContent = `${subjectName}`; // 과목 이름

            const textbookList = this.state.textbooksBySubject[subjectId]; // 캐시된 교재 정보 사용
            const textbooksP = document.createElement('p'); // 교재 정보 표시 p 태그 생성
            textbooksP.className = "text-xs pl-4"; // 기본 스타일

            if (textbookIds.length > 0) {
                 if (this.state.areTextbooksLoading[subjectId]) { // 아직 로딩 중이면
                     textbooksP.textContent = `교재 정보 로딩 중...`;
                     textbooksP.classList.add("text-slate-400");
                 } else if (textbookList) { // 로딩 완료 & 정보 있으면
                    const selectedTextbooks = textbookIds
                        .map(id => textbookList.find(tb => tb.id === id)?.name) // 이름 찾기
                        .filter(Boolean); // 이름 못 찾은 경우 제외

                    if (selectedTextbooks.length > 0) {
                        textbooksP.textContent = `교재: ${selectedTextbooks.join(', ')}`;
                        textbooksP.classList.add("text-slate-500");
                    } else if (textbookIds.length > 0) { // ID는 있는데 이름을 못찾은 경우
                        textbooksP.textContent = `교재: ${textbookIds.length}개 선택됨 (이름 확인 불가)`;
                        textbooksP.classList.add("text-slate-400");
                    } else { // textbookIds는 있는데 로드된 textbookList가 없는 이상한 경우
                         textbooksP.textContent = `선택된 교재 없음 (오류)`;
                         textbooksP.classList.add("text-red-500");
                    }
                 } else { // 로딩 완료 & 정보 없으면 (로드 실패 등)
                      textbooksP.textContent = `교재 정보 로드 실패`;
                      textbooksP.classList.add("text-red-500");
                 }
            } else { // 선택된 교재 ID 자체가 없으면
                 textbooksP.textContent = `선택된 교재 없음`;
                 textbooksP.classList.add("text-slate-400");
            }
            li.appendChild(textbooksP); // p 태그를 li에 추가
            currentClassSubjectsList.appendChild(li); // li를 ul에 추가
        });
    },
    // ===========================================

    listenForSubjects() {
        this.state.isSubjectsLoading = true;
        try {
            const q = query(collection(db, 'subjects')); // orderBy 제거 가능 (클라이언트 정렬)
            onSnapshot(q, (snapshot) => {
                this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.state.subjects.sort((a, b) => a.name.localeCompare(b.name)); // 클라이언트에서 정렬
                console.log("Subjects loaded:", this.state.subjects);
                this.state.isSubjectsLoading = false; // 로딩 완료
                document.dispatchEvent(new CustomEvent('subjectsUpdated')); // 이벤트 발생
            }, (error) => {
                 console.error("[TeacherApp] Error listening for subjects:", error);
                 showToast("과목 목록 실시간 업데이트 실패", true);
                 this.state.isSubjectsLoading = false;
                 document.dispatchEvent(new CustomEvent('subjectsUpdated')); // 에러 발생해도 이벤트 발생
            });
        } catch (error) {
            console.error("[TeacherApp] Error setting up subject listener:", error);
            showToast("과목 목록 실시간 업데이트 설정 실패", true);
            this.state.isSubjectsLoading = false;
        }
    },

    updateSubjectDropdowns() {
         if (this.state.isSubjectsLoading) {
             console.log("Subjects still loading, delaying dropdown update.");
             return;
         }
         let activeView = this.state.currentView;
        if (activeView === 'lesson-mgmt') { this.populateSubjectSelectForMgmt(); }
        if (this.elements.assignHomeworkModal?.style.display === 'flex') {
             if (this.homeworkDashboard?.populateSubjectsForHomeworkModal) {
                this.homeworkDashboard.populateSubjectsForHomeworkModal();
             }
        }
    },

    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.disabled = true;
        select.innerHTML = '<option value="">-- 로딩 중... --</option>';
        try {
            const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name")));
            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            if (snapshot.empty) {
                select.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
            } else {
                snapshot.forEach(doc => {
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = doc.data().name;
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

    populateSubjectSelectForMgmt() {
        if (this.state.isSubjectsLoading) {
             const select = this.elements.subjectSelectForMgmt;
             if (select) { select.innerHTML = '<option value="">-- 과목 로딩 중... --</option>'; select.disabled = true; }
             return;
        }
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;
        const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
        if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';

        if (!this.state.subjects || this.state.subjects.length === 0) {
             select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
             select.disabled = true; return;
        }
        select.disabled = false;
        this.state.subjects.forEach(sub => {
             const option = document.createElement('option'); option.value = sub.id; option.textContent = sub.name; select.appendChild(option);
        });
        if (currentSubjectId && this.state.subjects.some(s => s.id === currentSubjectId)) {
             select.value = currentSubjectId;
             this.state.selectedSubjectIdForMgmt = currentSubjectId;
              if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'block';
              if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'none';
              if (this.lessonManager?.managerInstance?.handleLessonFilterChange) {
                  this.lessonManager.managerInstance.handleLessonFilterChange();
              } else { console.error("lessonManager instance or function not found."); }
        } else {
            this.state.selectedSubjectIdForMgmt = null;
            if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
             select.value = '';
             if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
             if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
        }
    },
    async saveQnaVideo() { /* ... 이전 코드와 동일 ... */ },
    async loadQnaVideosForTeacher(selectedDate = this.elements.qnaVideoDateInput?.value) { /* ... 이전 코드와 동일 ... */ },

}; // TeacherApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    // DOM 로드 후 TeacherApp 초기화
    TeacherApp.init();
});

// 💡 수정됨: Default Export 대신 Named Export로 변경
export { TeacherApp };