// src/teacher/teacherApp.js

import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, addDoc, serverTimestamp, orderBy, deleteDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 기존 import 유지
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { classVideoManager } from './classVideoManager.js';
// analysisDashboard import 제거 (해당 기능 사용 안 함)
// import { analysisDashboard } from './analysisDashboard.js';

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        studentsInClass: new Map(), // <studentId, studentName>
        subjects: [],
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        editingClass: null,
        editingHomeworkId: null,
        currentView: 'dashboard', // 현재 활성화된 뷰 추적
    },

    init() {
        this.cacheElements();
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
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'flex';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'none';
    },

    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }
        try {
            // Firestore 보안 규칙 변경으로 인해 직접 비밀번호 비교 로직 제거 또는 수정 필요
            // 여기서는 임시로 관리자 계정만 허용하는 방식으로 가정합니다.
            // 실제 앱에서는 Cloud Functions를 이용한 인증을 권장합니다.

            // 임시: 이름만으로 교사 찾기 (보안상 매우 취약)
            const q = query(collection(db, 'teachers'), where("name", "==", name));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                // 임시: 비밀번호 검증 (실제로는 안전하지 않음)
                if (userData.password === password) {
                    showToast(`환영합니다, ${userData.name} 선생님!`, false);
                    this.showDashboard(userDoc.id, userData);
                } else {
                    showToast("비밀번호가 일치하지 않습니다.");
                }
            } else {
                 // 관리자 계정 로그인 시도 (동일하게 이름만으로 찾음 - 보안 취약)
                 const adminQ = query(collection(db, 'admins'), where("name", "==", name));
                 const adminSnapshot = await getDocs(adminQ);
                 if(!adminSnapshot.empty) {
                     const adminDoc = adminSnapshot.docs[0];
                     const adminData = adminDoc.data();
                     // 임시: 비밀번호 검증
                     if (adminData.password === password) {
                        showToast(`환영합니다, ${adminData.name} 관리자님!`, false);
                        this.showDashboard(adminDoc.id, adminData);
                     } else {
                        showToast("비밀번호가 일치하지 않습니다.");
                     }
                 } else {
                    showToast("등록된 교사 또는 관리자 이름이 아닙니다.");
                 }
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.code === 'permission-denied') {
                 showToast("로그인 정보 조회 권한이 부족합니다. Firestore 규칙을 확인하세요.");
            } else {
                showToast("로그인 중 오류가 발생했습니다.");
            }
        }
    },

    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';
        if (!this.isInitialized) {
            this.initializeDashboard();
        }
         // 최초 비밀번호 변경 로직 (선택 사항)
         if (userData.isInitialPassword === true && userData.role !== 'admin') {
             this.promptPasswordChange(userId);
         }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.cacheElements(); // 1. 요소 캐싱

        // 2. 모듈들을 this에 할당 (init보다 먼저!)
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager; // lessonManager 객체 자체 할당
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager;
        // analysisDashboard 제거

        // 3. 모듈들 초기화
        this.homeworkDashboard.init(this);
        this.lessonManager.init(this);
        this.classEditor.init(this);
        this.classVideoManager.init(this);
        // analysisDashboard.init(this) 제거

        // 4. 이벤트 리스너 추가
        this.addEventListeners();

        // 5. 초기 데이터 로드 시작
        this.populateClassSelect();
        this.listenForSubjects(); // 여기서 onSnapshot 설정 -> subjectsUpdated 이벤트 발생 가능성 있음

        // 6. 초기 화면 표시
        this.showDashboardMenu(); // 메뉴 화면을 먼저 표시
    },

     async promptPasswordChange(teacherId) {
         const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
         if (newPassword && newPassword.length >= 6) {
             try {
                 const teacherRef = doc(db, 'teachers', teacherId);
                 // 🚨 중요: 실제 앱에서는 비밀번호를 해싱하여 저장해야 합니다.
                 await updateDoc(teacherRef, {
                     password: newPassword,
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
            navButtonsContainer: document.getElementById('teacher-navigation-buttons'), // 메뉴 버튼 컨테이너

            // ======== Views ========
            views: {
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'student-list-mgmt': document.getElementById('view-student-list-mgmt'), // 학생 명단 뷰 추가
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'),
                // analysis view 제거
            },
            // ======== 학생 명단 관련 요소 (뷰 내부 컨테이너) ========
            studentListContainer: document.getElementById('teacher-student-list-container'), // 기존 컨테이너 ID 유지
            // ===================================

            // --- 각 뷰 내부 요소들 ---
            // (숙제 관련)
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

            // (학습 관리 관련)
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
            videoRevUrlsContainer: (type) => `teacher-video${type}-rev-urls-container`, // 함수 유지
            quizJsonInput: document.getElementById('teacher-quiz-json-input'),
            previewQuizBtn: document.getElementById('teacher-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('teacher-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('teacher-questions-preview-title'),
            questionsPreviewList: document.getElementById('teacher-questions-preview-list'),
            saveLessonBtn: document.getElementById('teacher-save-lesson-btn'),
            saveBtnText: document.getElementById('teacher-save-btn-text'),
            saveLoader: document.getElementById('teacher-save-loader'),

             // (반 설정 관련)
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),

            // (질문 영상 관련)
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            qnaVideoListContainer: document.getElementById('qna-video-list-teacher-container'),
            qnaVideosList: document.getElementById('qna-videos-list-teacher'),

            // (수업 영상 관련)
            classVideoDateInput: document.getElementById('class-video-date'),
            classVideoListContainer: document.getElementById('class-video-list-container'),
            addClassVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveClassVideoBtn: document.getElementById('save-class-video-btn'),
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'), // 수업 영상 메뉴 버튼
        };
    },

     addEventListeners() {
        if (this.elements.classSelect) {
            this.elements.classSelect.addEventListener('change', (e) => this.handleClassSelection(e));
        }
        // 네비게이션 버튼 (메뉴 카드) 클릭 이벤트 위임
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.addEventListener('click', (e) => {
                 const card = e.target.closest('.teacher-nav-btn'); // 클릭된 요소 또는 그 부모 중 .teacher-nav-btn 찾기
                 if (card && card.dataset.view) {
                     this.handleViewChange(card.dataset.view); // data-view 속성 값으로 뷰 전환
                 }
            });
        }
        // 각 뷰 내부의 "뒤로가기" 버튼 이벤트 위임
         if (this.elements.mainContent) {
             this.elements.mainContent.addEventListener('click', (e) => {
                 // 클릭된 요소가 back-to-teacher-menu 클래스를 가지고 있는지 확인
                 if (e.target.classList.contains('back-to-teacher-menu')) {
                     this.showDashboardMenu(); // 메뉴 화면 표시 함수 호출
                 }
             });
         }
         // QnA 영상 관련 이벤트
         this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo().then(() => this.loadQnaVideosForTeacher()));
         this.elements.qnaVideoDateInput?.addEventListener('change', () => this.loadQnaVideosForTeacher());

         // 과목 목록 업데이트 시 드롭다운 갱신
         document.addEventListener('subjectsUpdated', () => {
             this.updateSubjectDropdowns();
        });
    },

    // 대시보드 메뉴(카드 목록) 표시
    showDashboardMenu() {
        this.state.currentView = 'dashboard'; // 현재 뷰 상태 업데이트
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'grid'; // 메뉴 카드들 표시
        }
        // 모든 상세 뷰 숨기기
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });
        // 현강반일 경우 수업 영상 관리 메뉴 표시
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }
    },

    // 메뉴 카드 클릭 시 뷰 전환 처리
    handleViewChange(viewName) {
        this.state.currentView = viewName; // 현재 뷰 상태 업데이트
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'none'; // 메뉴 카드 숨김
        }
        // 모든 상세 뷰 숨김
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });

        // 요청된 뷰 표시
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        } else {
             console.warn(`[teacherApp.js] View "${viewName}" not found. Showing dashboard menu.`);
             this.showDashboardMenu(); // 해당 뷰 없으면 메뉴로 복귀
             return;
        }

        // 각 뷰 초기화 로직
        switch (viewName) {
            case 'homework-dashboard':
                if (this.elements.homeworkDashboardControls) this.elements.homeworkDashboardControls.style.display = 'flex';
                if (this.elements.homeworkManagementButtons) this.elements.homeworkManagementButtons.style.display = 'none';
                if (this.elements.homeworkContent) this.elements.homeworkContent.style.display = 'none';
                this.homeworkDashboard.populateHomeworkSelect();
                if(this.elements.homeworkSelect) this.elements.homeworkSelect.value = '';
                break;
            case 'lesson-mgmt':
                 if (this.elements.lessonMgmtControls) this.elements.lessonMgmtControls.style.display = 'block';
                 if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                 if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                 this.populateSubjectSelectForMgmt();
                 if(this.elements.subjectSelectForMgmt) this.elements.subjectSelectForMgmt.value = '';
                break;
            case 'qna-video-mgmt':
                 const todayQna = new Date().toISOString().slice(0, 10);
                 if(this.elements.qnaVideoDateInput) {
                     if (!this.elements.qnaVideoDateInput.value || this.elements.qnaVideoDateInput.value !== todayQna) {
                         this.elements.qnaVideoDateInput.value = todayQna;
                         this.loadQnaVideosForTeacher(todayQna);
                     } else {
                         this.loadQnaVideosForTeacher(this.elements.qnaVideoDateInput.value);
                     }
                 } else {
                     this.loadQnaVideosForTeacher();
                 }
                 if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
                 if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
                break;
             case 'class-video-mgmt':
                 this.classVideoManager.initView(); // 수업 영상 뷰 초기화
                 break;
             case 'student-list-mgmt': // 학생 명단 뷰 케이스 추가
                 this.renderStudentList(); // 학생 명단 렌더링 함수 호출
                 break;
            case 'class-mgmt':
                // 반 설정 뷰는 특별한 초기화 로직 없음 (버튼 클릭 시 모달 열림)
                break;
            default:
                 // 알 수 없는 뷰 이름이면 메뉴로 복귀
                 this.showDashboardMenu();
                 break;
        }
    },

    // 반 선택 변경 처리
    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;
        const newClassName = selectedOption.text;

        // 반 선택 변경 시, 현재 활성화된 뷰가 메뉴가 아니면 메뉴로 돌아감
        if (this.state.currentView !== 'dashboard') {
            this.showDashboardMenu();
        }

        // 상태 업데이트
        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = newClassName;
        this.state.selectedHomeworkId = null;
        this.state.selectedSubjectIdForMgmt = null;
        this.state.selectedLessonId = null;
        this.state.selectedSubjectId = null;

        if (!this.state.selectedClassId) {
            // 반 선택 해제 시 메인 컨텐츠 영역 숨김
            if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';
            this.state.selectedClassData = null; // 반 데이터 초기화
            this.state.studentsInClass.clear(); // 학생 데이터 초기화
            // 현재 학생 명단 뷰가 보이고 있다면 목록 비우기
            if (this.state.currentView === 'student-list-mgmt') {
                 this.renderStudentList();
            }
             // 현강반 메뉴 버튼 숨김
             if (this.elements.gotoClassVideoMgmtBtn) {
                 this.elements.gotoClassVideoMgmtBtn.style.display = 'none';
             }
            return;
        }

        // 메인 컨텐츠 영역 표시
        if(this.elements.mainContent) this.elements.mainContent.style.display = 'block';

        // 반 데이터 및 학생 데이터 가져오기 (렌더링은 직접 호출 안 함)
        await this.fetchClassData(this.state.selectedClassId);

         // 현강반 여부에 따라 수업 영상 관리 메뉴 표시/숨김
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }

        // 현재 학생 명단 뷰가 활성화되어 있다면 목록 갱신
        if (this.state.currentView === 'student-list-mgmt') {
            this.renderStudentList();
        }

        // 다른 모듈에 반 변경 알림
        document.dispatchEvent(new CustomEvent('class-changed'));
    },

    // 반 데이터 및 학생 데이터 가져오기 (UI 직접 조작 제거)
    async fetchClassData(classId) {
        this.state.studentsInClass.clear(); // 기존 학생 목록 초기화
        let studentFetchError = false; // 학생 로딩 실패 여부 플래그

        try {
            // 학생 목록 가져오기
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));
        } catch (error) {
            console.error("[teacherApp.js] Error fetching students for class:", error);
            showToast("학생 명단을 불러오는 데 실패했습니다.", true);
            studentFetchError = true; // 로딩 실패 플래그 설정
        }

        try {
            // 반 상세 정보 가져오기
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
        } catch (error) {
             console.error("[teacherApp.js] Error fetching class details:", error);
             showToast("반 정보를 불러오는 데 실패했습니다.", true);
             this.state.selectedClassData = null;
        }

        // 학생 목록 렌더링 호출은 handleViewChange 또는 handleClassSelection에서 처리
        // this.renderStudentList(studentFetchError); // 여기서 직접 호출 제거
    },

    // 학생 명단 렌더링 함수 (view-student-list-mgmt 내부 컨테이너 사용)
    renderStudentList(hasError = false) {
        // 학생 명단 뷰가 아니면 렌더링 안 함
        if (this.state.currentView !== 'student-list-mgmt') return;

        const container = this.elements.studentListContainer; // 캐시된 요소 사용
        if (!container) {
            console.error("[teacherApp.js] studentListContainer element not found for rendering.");
            return;
        }

        container.innerHTML = ''; // 기존 내용 지우기

        if (hasError) {
             container.innerHTML = '<p class="text-sm text-red-500">학생 명단 로딩 실패</p>';
             return;
        }

        if (!this.state.selectedClassId) {
             container.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>';
             return;
        }

        if (this.state.studentsInClass.size === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500">이 반에 배정된 학생이 없습니다.</p>';
            return;
        }

        // Map을 이름순으로 정렬하기 위해 배열로 변환
        const sortedStudents = Array.from(this.state.studentsInClass.entries())
                                    .sort(([, nameA], [, nameB]) => nameA.localeCompare(nameB));

        // 정렬된 학생 목록을 기반으로 HTML 생성
        sortedStudents.forEach(([id, name]) => {
            const studentDiv = document.createElement('div');
            studentDiv.className = "p-3 border-b border-slate-100 bg-white"; // 스타일 약간 변경
            studentDiv.textContent = name;
            // 필요하다면 여기에 학생 상세 정보 보기 버튼 등을 추가할 수 있습니다.
            // studentDiv.dataset.studentId = id;
            container.appendChild(studentDiv);
        });
    },

    // --- (이하 나머지 함수들은 기존 코드 유지) ---
    listenForSubjects() {
        try {
            onSnapshot(query(collection(db, 'subjects')), (snapshot) => {
                this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 this.state.subjects.sort((a, b) => a.name.localeCompare(b.name));
                 document.dispatchEvent(new CustomEvent('subjectsUpdated'));
            });
        } catch (error) {
            console.error("[teacherApp.js] Error listening for subjects:", error);
            showToast("과목 목록 실시간 업데이트 실패");
        }
    },

    updateSubjectDropdowns() {
         let activeView = this.state.currentView; // state 사용

        if (activeView === 'lesson-mgmt') {
            this.populateSubjectSelectForMgmt();
        }
        // 숙제 모달이 열려있을 때 과목/교재 드롭다운 업데이트
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
        try {
            const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name")));
            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("[teacherApp.js] Error populating class select:", error);
            select.innerHTML = '<option value="">-- 목록 로드 실패 --</option>';
            showToast("반 목록 로딩 실패");
        } finally {
            select.disabled = false;
        }
    },

    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;

        const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
        if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';

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

              // lessonManager 인스턴스의 함수 호출 확인
              if (this.lessonManager && this.lessonManager.managerInstance && typeof this.lessonManager.managerInstance.handleLessonFilterChange === 'function') {
                  this.lessonManager.managerInstance.handleLessonFilterChange();
              } else {
                  console.error("[teacherApp.js] Error: lessonManager instance or handleLessonFilterChange not found.");
              }

        } else {
            this.state.selectedSubjectIdForMgmt = null;
            if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
             select.value = '';
             if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
             if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
        }
        select.disabled = this.state.subjects.length === 0;
    },

     async saveQnaVideo() {
         const videoDate = this.elements.qnaVideoDateInput?.value;
         const title = this.elements.qnaVideoTitleInput?.value.trim();
         const youtubeUrl = this.elements.qnaVideoUrlInput?.value.trim();
         if (!this.state.selectedClassId) { showToast("반을 먼저 선택해주세요."); return; }
         if (!videoDate || !title || !youtubeUrl) { showToast("날짜, 제목, URL을 모두 입력해야 합니다."); return; }
         try {
             const docRef = await addDoc(collection(db, 'classVideos'), {
                 classId: this.state.selectedClassId, videoDate, title, youtubeUrl, createdAt: serverTimestamp()
             });
             showToast("질문 영상 저장 성공!", false);
             if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
             if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
         } catch (error) {
             console.error("[teacherApp.js] Error saving QnA video:", error);
             showToast("영상 저장 실패.");
         }
     },

     async loadQnaVideosForTeacher(selectedDate = this.elements.qnaVideoDateInput?.value) {
         const listEl = this.elements.qnaVideosList;
         if (!listEl) {
             console.error("[teacherApp.js] QnA video list element (qna-videos-list-teacher) not found.");
             return;
         }
         if (!this.state.selectedClassId || !selectedDate) {
             listEl.innerHTML = '<p class="text-sm text-slate-500">반이나 날짜를 선택해주세요.</p>';
             return;
         }
         listEl.innerHTML = '<div class="loader-small mx-auto"></div>';
         try {
             const q = query(
                 collection(db, 'classVideos'),
                 where('classId', '==', this.state.selectedClassId),
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
                     <button data-id="${videoId}" class="delete-qna-video-btn btn btn-danger btn-sm flex-shrink-0">삭제</button>
                 `;
                 div.querySelector('.delete-qna-video-btn')?.addEventListener('click', async (e) => {
                     const videoDocId = e.target.dataset.id;
                     if (confirm(`'${video.title}' 영상을 정말 삭제하시겠습니까?`)) {
                         try {
                             await deleteDoc(doc(db, 'classVideos', videoDocId));
                             showToast("영상이 삭제되었습니다.", false);
                             this.loadQnaVideosForTeacher();
                         } catch (err) {
                             console.error("[teacherApp.js] Error deleting QnA video:", err);
                             showToast("영상 삭제 실패");
                         }
                     }
                 });
                 listEl.appendChild(div);
             });
         } catch (error) {
             console.error("[teacherApp.js] Error loading QnA videos:", error);
             listEl.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>';
             showToast("질문 영상 목록 로딩 중 오류 발생", true);
         }
     },
}; // TeacherApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    TeacherApp.init();
});

export default TeacherApp;