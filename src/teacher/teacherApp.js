// src/teacher/teacherApp.js

import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

import { lessonDashboard } from './lessonDashboard.js';
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
// import { qnaVideoManager } from './qnaVideoManager.js';

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        studentsInClass: new Map(),
        subjects: [],
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        editingClass: null,
    },

    init() {
        this.cacheElements();

        this.elements.loginBtn?.addEventListener('click', () => {
            const name = this.elements.nameInput.value;
            const password = this.elements.passwordInput.value;
            this.handleLogin(name, password);
        });

        this.elements.passwordInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') {
                const name = this.elements.nameInput.value;
                const password = this.elements.passwordInput.value;
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
        // ... (rest of handleLogin remains the same)
        let userDoc = null;
        try {
            const teacherQuery = query(collection(db, 'teachers'), where("name", "==", name), where("password", "==", password));
            const teacherSnapshot = await getDocs(teacherQuery);

            if (!teacherSnapshot.empty) {
                userDoc = teacherSnapshot.docs[0];
            } else {
                const adminQuery = query(collection(db, 'admins'), where("name", "==", name), where("password", "==", password));
                const adminSnapshot = await getDocs(adminQuery);
                if (!adminSnapshot.empty) {
                    userDoc = adminSnapshot.docs[0];
                }
            }

            if (userDoc) {
                const userData = userDoc.data();
                showToast(`환영합니다, ${userData.name} 님!`, false);
                this.showDashboard(userDoc.id, userData);
            } else {
                showToast("이름 또는 비밀번호가 일치하지 않습니다.");
            }
        } catch (error) {
            console.error("Login error:", error);
            showToast("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
    },

    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';

        this.initializeDashboard();

        if (userData.isInitialPassword) {
             const userRef = doc(db, 'teachers', userId); // Assuming 'teachers' collection
             getDoc(userRef).then(docSnap => {
                 if (docSnap.exists()) {
                     this.promptPasswordChange(userId);
                 }
             });
        }
    },


    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // Initialize modules first
        this.lessonDashboard = lessonDashboard;
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        // this.qnaVideoManager = qnaVideoManager;

        this.lessonDashboard.init(this);
        this.homeworkDashboard.init(this);
        this.lessonManager.init(this);
        this.classEditor.init(this);
        // this.qnaVideoManager.init(this);

        // Then add event listeners etc.
        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects();
        this.showDashboardMenu(); // Show the menu initially
    },

     async promptPasswordChange(teacherId) {
        // ... (promptPasswordChange remains the same)
        const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
        if (newPassword && newPassword.length >= 6) {
            try {
                const teacherRef = doc(db, 'teachers', teacherId);
                await updateDoc(teacherRef, {
                    password: newPassword, // Note: Store hashed passwords in production!
                    isInitialPassword: false
                });
                showToast("비밀번호가 성공적으로 변경되었습니다.", false);
            } catch (error) {
                console.error("비밀번호 변경 실패:", error);
                showToast("비밀번호 변경에 실패했습니다.");
            }
        } else if (newPassword) {
            showToast("비밀번호는 6자리 이상이어야 합니다.");
        } else {
            showToast("비밀번호 변경이 취소되었습니다.");
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
            navButtonsContainer: document.getElementById('teacher-navigation-buttons'), // Grid container for cards
            views: { // Container divs for each section/page
                'lesson-dashboard': document.getElementById('view-lesson-dashboard'),
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
            },
            // Specific elements within each view...
            lessonDashboardControls: document.getElementById('lesson-dashboard-controls'),
            subjectSelectLesson: document.getElementById('teacher-subject-select-lesson'),
            lessonSelectContainer: document.getElementById('lesson-select-container'),
            lessonSelect: document.getElementById('teacher-lesson-select'),
            lessonDashboardContent: document.getElementById('teacher-lesson-dashboard-content'),
            selectedLessonTitle: document.getElementById('teacher-selected-lesson-title'),
            resultsTableBody: document.getElementById('teacher-results-table-body'),
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
            quizJsonInput: document.getElementById('teacher-quiz-json-input'),
            previewQuizBtn: document.getElementById('teacher-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('teacher-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('teacher-questions-preview-title'),
            questionsPreviewList: document.getElementById('teacher-questions-preview-list'),
            saveLessonBtn: document.getElementById('teacher-save-lesson-btn'),
            saveBtnText: document.getElementById('teacher-save-btn-text'),
            saveLoader: document.getElementById('teacher-save-loader'),
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            videoRevUrlsContainer: (type) => `teacher-video${type}-rev-urls-container`,
        };
    },

     addEventListeners() {
        if (this.elements.classSelect) {
            this.elements.classSelect.addEventListener('change', (e) => this.handleClassSelection(e));
        }
        // 카드 네비게이션을 위한 이벤트 위임
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.addEventListener('click', (e) => {
                 const card = e.target.closest('.teacher-nav-btn'); // 클릭된 카드 찾기
                 if (card && card.dataset.view) {
                     this.handleViewChange(card.dataset.view);
                 }
            });
        }
         // 새로 추가된 "메뉴로" 버튼들에 대한 이벤트 리스너 추가
         // document.querySelectorAll('.back-to-teacher-menu').forEach(btn => { // This might be too early if views are initially hidden
         // Instead, use event delegation on the main content area
         if (this.elements.mainContent) {
             this.elements.mainContent.addEventListener('click', (e) => {
                 if (e.target.classList.contains('back-to-teacher-menu')) {
                     this.showDashboardMenu();
                 }
             });
         }
    },

    // 메인 메뉴(카드 그리드)를 보여주는 새 함수
    showDashboardMenu() {
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'grid'; // 카드 그리드 표시
        }
        // 모든 특정 뷰 div 숨기기
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });
        // 필요한 경우 특정 뷰 선택 상태 초기화 (선택 사항)
        // this.state.selectedSubjectId = null; 등등
    },


    handleViewChange(viewName) {
        // 카드 네비게이션 그리드 숨기기
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'none';
        }

        // 먼저 모든 특정 뷰 숨기기
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });

        // 선택된 뷰 표시
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block'; // 뷰 컨테이너에는 'block' 사용
        } else {
             // 뷰가 존재하지 않으면 메뉴를 다시 표시
             this.showDashboardMenu();
             return;
        }


        // 각 뷰가 표시될 때의 특정 로직
        switch (viewName) {
            case 'lesson-dashboard':
                // 컨트롤은 뷰 내부에 있으므로 여기서 별도로 표시를 관리할 필요 없음
                this.populateSubjectSelectForLessonDashboard();
                // 이 뷰로 이동할 때 학습 선택 초기화
                if (this.elements.lessonSelect) {
                     this.elements.lessonSelect.value = ''; // 드롭다운 리셋
                     this.elements.lessonSelect.dispatchEvent(new Event('change')); // 콘텐츠 숨기기 위해 change 이벤트 트리거
                }

                break;
            case 'homework-dashboard':
                this.homeworkDashboard.populateHomeworkSelect();
                 // 이 뷰로 이동할 때 숙제 선택 초기화
                if(this.elements.homeworkSelect) {
                     this.elements.homeworkSelect.value = '';
                     this.elements.homeworkSelect.dispatchEvent(new Event('change'));
                }
                break;
            case 'lesson-mgmt':
                 this.populateSubjectSelectForMgmt();
                 // 관리용 과목 선택 초기화
                 if(this.elements.subjectSelectForMgmt) {
                     this.elements.subjectSelectForMgmt.value = '';
                     this.elements.subjectSelectForMgmt.dispatchEvent(new Event('change'));
                 }
                break;
            case 'qna-video-mgmt':
                // 필요시 QnA 폼 초기화
                 if(this.elements.qnaVideoDateInput) this.elements.qnaVideoDateInput.value = '';
                 if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
                 if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
                break;
            case 'class-mgmt':
                // 현재 이 단순한 뷰에는 특정 초기화 필요 없음
                break;
            default:
                 // 유효한 viewName이 아닐 경우 발생 (좋은 습관)
                 this.showDashboardMenu();
                 break;
        }
    },


    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;

        if (newClassId === this.state.selectedClassId) return;

        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = selectedOption.text;
        // 반 변경 시 선택 초기화
        this.state.selectedSubjectId = null;
        this.state.selectedLessonId = null;
        this.state.selectedHomeworkId = null;
        this.state.selectedSubjectIdForMgmt = null;


        if (!this.state.selectedClassId) {
            if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';
            // 반이 선택되지 않은 경우 네비게이션 버튼 컨테이너도 숨김
            if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none';
            Object.values(this.elements.views).forEach(view => {
                if (view) view.style.display = 'none';
            });
            return;
        }

        if(this.elements.mainContent) this.elements.mainContent.style.display = 'block';
        await this.fetchClassData(this.state.selectedClassId);
        // 반 선택 후 항상 메인 메뉴 표시
        this.showDashboardMenu();
    },

    // ... fetchClassData, listenForSubjects, updateSubjectDropdowns, populateClassSelect ...
    // ... populateSubjectSelectForLessonDashboard, populateSubjectSelectForMgmt ...
    // (이 함수들은 이전 응답과 거의 동일하게 유지)
    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        try {
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));

            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;

            document.dispatchEvent(new CustomEvent('class-changed'));
        } catch (error) {
            console.error("반 데이터 로딩 실패:", error);
            showToast("반 정보를 불러오는 데 실패했습니다.");
            this.state.selectedClassData = null;
            this.state.studentsInClass.clear();
        }
    },

    listenForSubjects() {
        try {
            onSnapshot(query(collection(db, 'subjects')), (snapshot) => {
                this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                this.updateSubjectDropdowns();
            });
        } catch (error) {
            console.error("과목 실시간 업데이트 실패:", error);
            showToast("과목 목록 업데이트에 실패했습니다.");
        }
    },

    updateSubjectDropdowns() {
         let activeView = null;
         for (const viewName in this.elements.views) {
             if (this.elements.views[viewName] && this.elements.views[viewName].style.display === 'block') {
                 activeView = viewName;
                 break;
             }
         }

        if (activeView === 'lesson-dashboard') {
            this.populateSubjectSelectForLessonDashboard();
        } else if (activeView === 'lesson-mgmt') {
            this.populateSubjectSelectForMgmt();
        }

        if (this.elements.assignHomeworkModal && this.elements.assignHomeworkModal.style.display === 'flex') {
            this.homeworkDashboard.populateSubjectsForHomeworkModal?.();
        }
    },

    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.disabled = true;
        try {
            const snapshot = await getDocs(query(collection(db, 'classes')));
            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("반 목록 로딩 실패:", error);
            select.innerHTML = '<option value="">-- 목록 로드 실패 --</option>';
            showToast("반 목록을 불러오는 데 실패했습니다.");
        } finally {
            select.disabled = false;
        }
    },

     populateSubjectSelectForLessonDashboard() {
        const select = this.elements.subjectSelectLesson;
        const lessonSelect = this.elements.lessonSelect;
        if (!select || !lessonSelect) return;

        const currentSubjectId = select.value;

        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
        lessonSelect.disabled = true;
        if(this.elements.lessonSelectContainer) this.elements.lessonSelectContainer.style.display = 'none';
        if(this.elements.lessonDashboardContent) this.elements.lessonDashboardContent.style.display = 'none';


        if (!this.state.selectedClassData || !this.state.selectedClassData.subjects) {
            select.disabled = true;
            return;
        }

        const subjectIdsInClass = Object.keys(this.state.selectedClassData.subjects);
        if (subjectIdsInClass.length === 0) {
            select.disabled = true;
            return;
        }

        subjectIdsInClass.forEach(id => {
            const subject = this.state.subjects.find(s => s.id === id);
            if (subject) {
                const option = document.createElement('option');
                option.value = subject.id;
                option.textContent = subject.name;
                select.appendChild(option);
            }
        });

        if (subjectIdsInClass.includes(currentSubjectId)) {
            select.value = currentSubjectId;
             if(this.elements.lessonSelectContainer) this.elements.lessonSelectContainer.style.display = 'block';
             // 과목이 이미 선택된 경우 학습 목록도 다시 채움
             lessonDashboard.populateLessonSelect(currentSubjectId); // 모듈의 함수 호출
        } else {
             this.state.selectedSubjectId = null;
             this.state.selectedLessonId = null;
        }

        select.disabled = false;
    },

    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;

        const currentSubjectId = select.value;

        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
        if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';


        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            select.appendChild(option);
        });

        if (this.state.subjects.some(s => s.id === currentSubjectId)) {
             select.value = currentSubjectId;
              if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'block';
              if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'none';
              // 과목이 이미 선택된 경우 학습 목록도 다시 채움
              lessonManager.handleLessonFilterChange(); // 모듈의 함수 호출
        } else {
            this.state.selectedSubjectIdForMgmt = null;
            if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = ''; // 학습 목록 비우기
        }


        select.disabled = this.state.subjects.length === 0;
    },

};

document.addEventListener('DOMContentLoaded', () => {
    TeacherApp.init();
});

export default TeacherApp;