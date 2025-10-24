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
    addDoc,     // 추가
    serverTimestamp, // 추가
    orderBy,    // 추가
    deleteDoc   // 추가
} from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 모듈 import
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { classVideoManager } from './classVideoManager.js'; // ✨ 래퍼 모듈 사용

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        studentsInClass: new Map(),
        subjects: [],
        textbooksBySubject: {},
        selectedSubjectId: null, // 학습 현황용
        selectedLessonId: null,  // 학습 현황용
        selectedHomeworkId: null, // 숙제 현황용 (공통 모듈이 사용)
        selectedSubjectIdForMgmt: null, // 학습 관리용
        lessons: [], // 학습 관리용
        editingLesson: null, // 학습 관리용
        generatedQuiz: null, // 학습 관리용
        editingClass: null, // 반 설정 수정용
        editingHomeworkId: null, // 숙제 수정용 (공통 모듈이 사용)
        currentView: 'dashboard',
        isSubjectsLoading: true,
        isClassDataLoading: false,
        areTextbooksLoading: {},
        // ✨ QnA 비디오 수정 상태는 공통 모듈에서 관리
    },

    init() {
        // ... (init 로그인 로직 변경 없음) ...
        if (this.isInitialized) return;

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
        // ... (handleLogin 로직 변경 없음) ...
        if (!name || !password) { showToast("이름과 비밀번호를 모두 입력해주세요."); return; }
        try {
            let loggedIn = false; let userId = null; let userData = null;
            const teacherQuery = query(collection(db, 'teachers'), where("name", "==", name));
            const teacherSnapshot = await getDocs(teacherQuery);
            if (!teacherSnapshot.empty) {
                const userDoc = teacherSnapshot.docs[0]; const data = userDoc.data();
                // 🚨 임시 비밀번호 비교! 실제로는 해싱된 값 비교 필요
                if (data.password === password) {
                    loggedIn = true; userId = userDoc.id; userData = data;
                    showToast(`환영합니다, ${userData.name} 선생님!`, false);
                }
            }
            if (loggedIn && userId && userData) { this.showDashboard(userId, userData); }
            else { showToast("이름 또는 비밀번호가 일치하지 않습니다."); }
        } catch (error) {
            console.error("Login error:", error);
            let msg = "로그인 중 오류 발생";
            if (error.code === 'permission-denied') msg = "로그인 정보 조회 권한 부족";
            else if (error.code === 'unavailable') msg = "서버 연결 불가";
            showToast(msg);
        }
    },

    showDashboard(userId, userData) {
        // ... (showDashboard 로직 변경 없음) ...
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';
        if (!this.isInitialized) { this.initializeDashboard(); }
        if (userData.isInitialPassword === true) { this.promptPasswordChange(userId); }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        console.log("[TeacherApp] Initializing dashboard...");

        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager; // ✨ classVideoManager 인스턴스 저장

        try {
            this.homeworkDashboard.init(this);
            this.lessonManager.init(this);
            this.classEditor.init(this);
            this.classVideoManager.init(this); // ✨ 초기화
        } catch (e) {
             console.error("Error initializing modules:", e); showToast("앱 초기화 중 오류 발생", true); return;
        }

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects();
        if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';

        console.log("[TeacherApp] Dashboard initialized.");
    },

    async promptPasswordChange(teacherId) {
        // ... (promptPasswordChange 로직 변경 없음) ...
         const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
         if (newPassword && newPassword.length >= 6) {
             try {
                 // 🚨 중요: 실제 앱에서는 Cloud Function을 통해 비밀번호를 안전하게 업데이트해야 합니다.
                 await updateDoc(doc(db, 'teachers', teacherId), {
                     password: newPassword, // 보안 취약점!
                     isInitialPassword: false
                 });
                 showToast("비밀번호 변경 완료.", false);
             } catch (error) { console.error("비밀번호 변경 실패:", error); showToast("비밀번호 변경 실패."); }
         } else if (newPassword) { showToast("비밀번호는 6자리 이상이어야 합니다."); }
    },

    cacheElements() {
        // 교사 앱 요소 캐싱 (비디오 관련 ID 추가/확인)
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

            // 숙제 관련 (공통 매니저 Config와 일치)
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

            // 학습 관리 관련 (공통 매니저 Config와 일치)
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

             // 반 설정 수정 모달 관련 (classEditor Config와 일치)
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),

            // 질문 영상 관련 (공통 모듈 config와 일치)
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            qnaVideosList: document.getElementById('qna-videos-list-teacher'),

            // 수업 영상 관련 (공통 모듈 config와 일치 - HTML에 해당 ID 요소 필요)
            lectureVideoDateInput: document.getElementById('class-video-date'), // QnA와 동일 ID 가정
            lectureVideoListContainer: document.getElementById('class-video-list-container'),
            addLectureVideoFieldBtn: document.getElementById('add-class-video-field-btn'), // HTML에 추가 필요
            saveLectureVideoBtn: document.getElementById('save-class-video-btn'), // HTML에 추가 필요
            lectureVideoTitleInput: document.getElementById('class-video-title'), // HTML에 추가 필요
            lectureVideoUrlInput: document.getElementById('class-video-url'), // HTML에 추가 필요
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),
        };
    },

     addEventListeners() {
        if (this.elements.classSelect) {
            this.elements.classSelect.addEventListener('change', (e) => this.handleClassSelection(e));
        }
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.addEventListener('click', (e) => {
                 const card = e.target.closest('.teacher-nav-btn');
                 if (card?.dataset.view) this.handleViewChange(card.dataset.view);
            });
        }
         if (this.elements.mainContent) {
             this.elements.mainContent.addEventListener('click', (e) => {
                 if (e.target.classList.contains('back-to-teacher-menu')) this.showDashboardMenu();
             });
         }
         // ✨ QnA 영상 관련 리스너 제거 (공통 모듈로 이동)

         // subjectsUpdated 이벤트 리스너 (유지)
         document.addEventListener('subjectsUpdated', () => {
             console.log("[TeacherApp] 'subjectsUpdated' event received.");
             this.state.isSubjectsLoading = false;
             this.updateSubjectDropdowns(); // 학습 관리, 숙제 모달 등

             const mgmtModal = document.getElementById('teacher-subject-textbook-mgmt-modal');
             if (mgmtModal?.style.display === 'flex' && this.classEditor) {
                 this.classEditor.renderSubjectListForMgmt();
                 this.classEditor.populateSubjectSelectForTextbookMgmt();
             }
             if(this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        });
        // class-changed 이벤트 리스너는 handleClassSelection 내부에서 처리 (유지)
    },

    showDashboardMenu() {
        // ... (showDashboardMenu 로직 변경 없음) ...
        this.state.currentView = 'dashboard';
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'grid';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }
         if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
    },

    handleViewChange(viewName) {
        this.state.currentView = viewName;
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) { viewToShow.style.display = 'block'; }
        else { this.showDashboardMenu(); return; }
        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';

        switch (viewName) {
            case 'homework-dashboard':
                if (this.homeworkDashboard.managerInstance) { // 유지
                    this.homeworkDashboard.managerInstance.populateHomeworkSelect();
                    const mgmtButtons = document.getElementById(this.homeworkDashboard.managerInstance.config.elements.homeworkManagementButtons);
                    const content = document.getElementById(this.homeworkDashboard.managerInstance.config.elements.homeworkContent);
                    const select = document.getElementById(this.homeworkDashboard.managerInstance.config.elements.homeworkSelect);
                    if (mgmtButtons) mgmtButtons.style.display = 'none';
                    if (content) content.style.display = 'none';
                    if (select) select.value = '';
                }
                break;
            case 'qna-video-mgmt':
                 this.classVideoManager.initQnaView(); // ✨ 변경: 공통 래퍼 호출
                break;
            case 'lesson-mgmt':
                 this.populateSubjectSelectForMgmt(); // 유지
                 if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                 if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                 if (this.elements.subjectSelectForMgmt) this.elements.subjectSelectForMgmt.value = '';
                break;
            case 'student-list-mgmt': this.renderStudentList(); break; // 유지
            case 'class-mgmt': this.displayCurrentClassInfo(); break; // 유지
            case 'class-video-mgmt':
                 this.classVideoManager.initLectureView(); // ✨ 변경: 공통 래퍼 호출
                 break;
            default: this.showDashboardMenu(); break;
        }
    },

    async handleClassSelection(event) {
        // ... (handleClassSelection 로직 변경 없음) ...
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;
        const newClassName = selectedOption.text;

        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = newClassName;
        this.state.selectedHomeworkId = null;
        this.state.selectedSubjectIdForMgmt = null;
        this.state.selectedLessonId = null;
        this.state.selectedSubjectId = null;
        this.state.selectedClassData = null;
        this.state.studentsInClass.clear();

        if (!this.state.selectedClassId) {
            if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';
            if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
            if (this.elements.gotoClassVideoMgmtBtn) this.elements.gotoClassVideoMgmtBtn.style.display = 'none';
            this.homeworkDashboard.managerInstance?.resetUIState();
            return;
        }

        this.state.isClassDataLoading = true;
        if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();

        await this.fetchClassData(this.state.selectedClassId);
        this.state.isClassDataLoading = false;

        this.showDashboardMenu(); // 메뉴 먼저 표시
        this.homeworkDashboard.managerInstance?.populateHomeworkSelect();
        this.state.textbooksBySubject = {}; // 교재 캐시 클리어
        document.dispatchEvent(new CustomEvent('class-changed'));
    },

    async fetchClassData(classId) {
        // ... (fetchClassData 로직 변경 없음) ...
        this.state.studentsInClass.clear(); this.state.selectedClassData = null;
        let studentFetchError = false; let classFetchError = false;
        try {
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name)); // TODO: key를 authUid로 변경 고려
        } catch (error) { console.error("Error fetching students:", error); studentFetchError = true; }
        try {
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
        } catch (error) { console.error("Error fetching class details:", error); classFetchError = true; }
        if (studentFetchError || classFetchError) showToast("반 정보/학생 명단 로딩 실패.", true);
    },

    renderStudentList(hasError = false) {
        // ... (renderStudentList 로직 변경 없음) ...
        if (this.state.currentView !== 'student-list-mgmt') return;
        const container = this.elements.studentListContainer; if (!container) return; container.innerHTML = '';
        if (this.state.isClassDataLoading) { container.innerHTML = '<div class="loader-small mx-auto"></div>'; return; }
        if (hasError) { container.innerHTML = '<p class="text-sm text-red-500">학생 명단 로딩 실패</p>'; return; }
        if (!this.state.selectedClassId) { container.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>'; return; }
        if (this.state.studentsInClass.size === 0) { container.innerHTML = '<p class="text-sm text-slate-500">이 반에 배정된 학생이 없습니다.</p>'; return; }
        const sortedStudents = Array.from(this.state.studentsInClass.entries()).sort(([, a], [, b]) => a.localeCompare(b));
        sortedStudents.forEach(([id, name]) => { const div = document.createElement('div'); div.className = "p-3 border-b border-slate-100 bg-white"; div.textContent = name; container.appendChild(div); });
    },

    async displayCurrentClassInfo() {
        // ... (displayCurrentClassInfo 로직 변경 없음) ...
        if (this.state.currentView !== 'class-mgmt') return;
        const { currentClassInfo, currentClassType, currentClassSubjectsList } = this.elements;
        if (!currentClassInfo || !currentClassType || !currentClassSubjectsList) return;
        if (this.state.isClassDataLoading) { currentClassInfo.style.display = 'block'; currentClassType.textContent = '로딩 중...'; currentClassSubjectsList.innerHTML = '<li>로딩 중...</li>'; return; }
        const classData = this.state.selectedClassData; if (!classData) { currentClassInfo.style.display = 'none'; return; }
        currentClassInfo.style.display = 'block'; currentClassType.textContent = classData.classType === 'live-lecture' ? '현강반' : '자기주도반'; currentClassSubjectsList.innerHTML = '';
        if (this.state.isSubjectsLoading) { currentClassSubjectsList.innerHTML = '<li>과목 정보 로딩 중...</li>'; return; }
        if (!Array.isArray(this.state.subjects)) { currentClassSubjectsList.innerHTML = '<li>과목 정보 오류</li>'; return; }
        const classSubjects = classData.subjects || {}; const subjectIds = Object.keys(classSubjects);
        if (subjectIds.length === 0) { currentClassSubjectsList.innerHTML = '<li>연결된 과목 없음</li>'; return; }
        const neededSubjectIds = subjectIds.filter(id => !this.state.textbooksBySubject[id] && !this.state.areTextbooksLoading[id]);
        if (neededSubjectIds.length > 0) {
            neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = true); currentClassSubjectsList.innerHTML = '<li>과목/교재 정보 로딩 중...</li>';
            try {
                const textbookPromises = neededSubjectIds.map(id => getDocs(collection(db, `subjects/${id}/textbooks`)));
                const textbookSnapshots = await Promise.all(textbookPromises);
                neededSubjectIds.forEach((id, index) => { this.state.textbooksBySubject[id] = textbookSnapshots[index].docs.map(d => ({ id: d.id, name: d.data().name })); this.state.areTextbooksLoading[id] = false; });
                this.displayCurrentClassInfo(); return;
            } catch (error) { neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = false); }
        }
        currentClassSubjectsList.innerHTML = '';
        subjectIds.forEach(subjectId => {
            const subjectInfo = this.state.subjects.find(s => s.id === subjectId); const subjectName = subjectInfo ? subjectInfo.name : `ID: ${subjectId}`;
            const textbookIds = classSubjects[subjectId]?.textbooks || []; const li = document.createElement('li'); li.textContent = `${subjectName}`;
            const textbookList = this.state.textbooksBySubject[subjectId]; const textbooksP = document.createElement('p'); textbooksP.className = "text-xs pl-4";
            if (textbookIds.length > 0) {
                if (this.state.areTextbooksLoading[subjectId]) { textbooksP.textContent = `교재 로딩 중...`; textbooksP.classList.add("text-slate-400"); }
                else if (textbookList) { const selected = textbookIds.map(id => textbookList.find(tb => tb.id === id)?.name).filter(Boolean); if (selected.length > 0) { textbooksP.textContent = `교재: ${selected.join(', ')}`; textbooksP.classList.add("text-slate-500"); } else if (textbookIds.length > 0) { textbooksP.textContent = `교재: ${textbookIds.length}개 선택됨 (이름 확인 불가)`; textbooksP.classList.add("text-slate-400"); } else { textbooksP.textContent = `선택된 교재 없음 (오류)`; textbooksP.classList.add("text-red-500"); } }
                else { textbooksP.textContent = `교재 정보 로드 실패`; textbooksP.classList.add("text-red-500"); }
            } else { textbooksP.textContent = `선택된 교재 없음`; textbooksP.classList.add("text-slate-400"); }
            li.appendChild(textbooksP); currentClassSubjectsList.appendChild(li);
        });
    },

    listenForSubjects() {
        // ... (listenForSubjects 로직 변경 없음) ...
        this.state.isSubjectsLoading = true; try { const q = query(collection(db, 'subjects')); onSnapshot(q, (snapshot) => { this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })); this.state.subjects.sort((a, b) => a.name.localeCompare(b.name)); console.log("Subjects loaded:", this.state.subjects); this.state.isSubjectsLoading = false; document.dispatchEvent(new CustomEvent('subjectsUpdated')); }, (error) => { console.error("[TeacherApp] Error listening for subjects:", error); this.state.isSubjectsLoading = false; document.dispatchEvent(new CustomEvent('subjectsUpdated')); }); } catch (error) { console.error("[TeacherApp] Error setting up subject listener:", error); this.state.isSubjectsLoading = false; }
    },

    updateSubjectDropdowns() {
        // ... (updateSubjectDropdowns 로직 변경 없음) ...
         if (this.state.isSubjectsLoading) return;
         if (this.state.currentView === 'lesson-mgmt') this.populateSubjectSelectForMgmt();
         if (this.homeworkDashboard.managerInstance && this.elements.assignHomeworkModal?.style.display === 'flex') { this.homeworkDashboard.managerInstance.populateSubjectsForHomeworkModal(); }
    },

    async populateClassSelect() {
        // ... (populateClassSelect 로직 변경 없음) ...
        const select = this.elements.classSelect; if (!select) return; select.disabled = true; select.innerHTML = '<option value="">-- 로딩 중... --</option>'; try { const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name"))); select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>'; if (snapshot.empty) { select.innerHTML += '<option value="" disabled>등록된 반 없음</option>'; } else { snapshot.forEach(doc => { const option = document.createElement('option'); option.value = doc.id; option.textContent = doc.data().name; select.appendChild(option); }); } } catch (error) { console.error("Error populating class select:", error); select.innerHTML = '<option value="">-- 목록 로드 실패 --</option>'; showToast("반 목록 로딩 실패", true); } finally { select.disabled = false; }
    },

    populateSubjectSelectForMgmt() {
        // ... (populateSubjectSelectForMgmt 로직 변경 없음) ...
        if (this.state.isSubjectsLoading) { const select = this.elements.subjectSelectForMgmt; if (select) { select.innerHTML = '<option value="">-- 과목 로딩 중... --</option>'; select.disabled = true; } return; } const select = this.elements.subjectSelectForMgmt; if (!select) return; const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt; select.innerHTML = '<option value="">-- 과목 선택 --</option>'; if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none'; if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block'; if (!this.state.subjects || this.state.subjects.length === 0) { select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>'; select.disabled = true; return; } select.disabled = false; this.state.subjects.forEach(sub => { const option = document.createElement('option'); option.value = sub.id; option.textContent = sub.name; select.appendChild(option); }); if (currentSubjectId && this.state.subjects.some(s => s.id === currentSubjectId)) { select.value = currentSubjectId; this.state.selectedSubjectIdForMgmt = currentSubjectId; if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'block'; if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'none'; if (this.lessonManager?.managerInstance?.handleLessonFilterChange) { this.lessonManager.managerInstance.handleLessonFilterChange(); } } else { this.state.selectedSubjectIdForMgmt = null; if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = ''; select.value = ''; if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none'; if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block'; }
    },
    // --- ✨ QnA 비디오 관련 함수 제거 ---

}; // TeacherApp 객체 끝

export { TeacherApp };