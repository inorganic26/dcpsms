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
import { signInWithCustomToken, signOut, onAuthStateChanged } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db, auth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

import { setSubjects } from "../store/subjectStore.js";

import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js'; 
import { classVideoManager } from './classVideoManager.js';
import { reportManager } from '../shared/reportManager.js';
import { analysisDashboard } from './analysisDashboard.js';
import { subjectTextbookManager } from './subjectTextbookManager.js';

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
        selectedReportDate: null,
        uploadedReports: [],
    },

    init() {
        if (this.isInitialized) return;

        this.cacheElements();

        // 자동 로그인 방지 (앱 시작 시 로그아웃)
        signOut(auth).then(() => {
            console.log("Logged out for security.");
        });

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

        showToast("로그인 중...", false);

        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const verifyLogin = httpsCallable(functions, 'verifyTeacherLogin');
            
            const result = await verifyLogin({ name, password });
            const { success, message, token, teacherId, teacherData } = result.data;

            if (!success) {
                showToast(message || "로그인 실패", true);
                return;
            }

            await signInWithCustomToken(auth, token);

            this.state.teacherId = teacherId;
            this.state.teacherData = teacherData;

            if (teacherData.isInitialPassword === true) {
                 this.showDashboard(teacherId, teacherData);
                 this.promptPasswordChange(teacherId);
            } else {
                 showToast(`환영합니다, ${teacherData.name} 선생님!`, false);
                 this.showDashboard(teacherId, teacherData);
            }

        } catch (error) {
            console.error("Login error:", error);
            showToast("로그인 서버 오류 발생", true);
        }
    },

    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';

        if (!this.isInitialized) {
            this.initializeDashboard();
        }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        // 매니저 연결
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager;
        this.analysisDashboard = analysisDashboard;
        this.subjectTextbookManager = subjectTextbookManager;

        try {
            this.homeworkDashboard.init(this);
            this.lessonManager.init(this);
            this.classEditor.init(this);
            this.classVideoManager.init(this);
            this.analysisDashboard.init(this);
            this.subjectTextbookManager.init(this);

        } catch (e) {
            console.error("Error initializing modules:", e);
        }

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects(); 

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'none';
    },

    async promptPasswordChange(teacherId) {
        let newPassword = null;
        while (true) {
            newPassword = prompt("새 비밀번호를 입력하세요 (6자리 이상).");
            if (newPassword === null) return;
            if (newPassword.trim().length >= 6) break;
            alert("6자리 이상이어야 합니다.");
        }
        try {
            await updateDoc(doc(db, 'teachers', teacherId), { password: newPassword, isInitialPassword: false });
            showToast("비밀번호 변경 완료", false);
        } catch (error) { showToast("변경 실패", true); }
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

            // [수정] 뷰 목록에 주간 테스트 화면 추가
            views: {
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'student-list-mgmt': document.getElementById('view-student-list-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'),
                'report-mgmt': document.getElementById('view-report-mgmt'),
                'daily-test-mgmt': document.getElementById('view-daily-test-mgmt'),
                'weekly-test-mgmt': document.getElementById('view-weekly-test-mgmt'), // [추가됨]
                'learning-status-mgmt': document.getElementById('view-learning-status-mgmt'),
            },

            studentListContainer: document.getElementById('teacher-student-list-container'),
            
            // Class Info
            currentClassInfo: document.getElementById('current-class-info'),
            currentClassType: document.getElementById('current-class-type'),
            currentClassSubjectsList: document.getElementById('current-class-subjects-list'),
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            manageSubjectsTextbooksBtn: document.getElementById('teacher-manage-subjects-textbooks-btn'),
            
            // Homework IDs
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
            
            // Lesson IDs
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
            addVideo1RevBtn: document.getElementById('teacher-add-video1-rev-btn'),
            quizJsonInput: document.getElementById('teacher-quiz-json-input'),
            previewQuizBtn: document.getElementById('teacher-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('teacher-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('teacher-questions-preview-title'),
            questionsPreviewList: document.getElementById('teacher-questions-preview-list'),
            saveLessonBtn: document.getElementById('teacher-save-lesson-btn'),
            saveBtnText: document.getElementById('teacher-save-btn-text'),
            saveLoader: document.getElementById('teacher-save-loader'),
            
            // Class Editor & Mgmt
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),
            
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
            
            // Videos & Reports
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            qnaVideosList: document.getElementById('qna-videos-list-teacher'),
            lectureVideoDateInput: document.getElementById('class-video-date'),
            lectureVideoListContainer: document.getElementById('class-video-list-container'),
            addLectureVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveLectureVideoBtn: document.getElementById('save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('class-video-title'),
            lectureVideoUrlInput: document.getElementById('class-video-url'),
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),
            
            reportDateInput: document.getElementById('teacher-report-date'),
            reportFilesInput: document.getElementById('teacher-report-files-input'),
            reportCurrentClassSpan: document.getElementById('teacher-report-current-class'),
            uploadReportsBtn: document.getElementById('teacher-upload-reports-btn'),
            reportUploadStatus: document.getElementById('teacher-report-upload-status'),
            uploadedReportsList: document.getElementById('teacher-uploaded-reports-list'),
        };
    },

    addEventListeners() {
        this.elements.classSelect?.addEventListener('change', (e) => this.handleClassSelection(e));

        // 메인 대시보드 내비게이션 버튼 클릭 이벤트
        this.elements.navButtonsContainer?.addEventListener('click', (e) => {
            const card = e.target.closest('.teacher-nav-btn');
            if (card?.dataset.view) {
                this.handleViewChange(card.dataset.view);
            }
        });

        if (this.elements.mainContent) {
            this.elements.mainContent.addEventListener('click', (e) => {
                if (e.target.classList.contains('back-to-teacher-menu')) {
                    this.showDashboardMenu();
                }
            });
        }
        
        this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload());
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.uploadedReportsList?.addEventListener('click', async (e) => {
            if (e.target.closest('.delete-report-btn')) {
                const btn = e.target.closest('.delete-report-btn');
                this.handleDeleteReport(btn.dataset.path, btn.dataset.filename);
            }
            if (e.target.closest('.view-report-btn')) {
                const btn = e.target.closest('.view-report-btn');
                window.open(btn.dataset.url, '_blank');
            }
        });

        document.addEventListener('subjectsUpdated', () => {
            this.state.isSubjectsLoading = false;
            this.updateSubjectDropdowns();
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        });

        document.addEventListener('class-changed', () => {
            // 반이 변경되면 현재 보고 있는 뷰를 새로고침
            if (this.state.currentView === 'report-mgmt') {
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
            }
            if (this.state.currentView === 'daily-test-mgmt') this.analysisDashboard.initDailyTestView();
            if (this.state.currentView === 'weekly-test-mgmt') this.analysisDashboard.initWeeklyTestView(); // [추가됨]
            if (this.state.currentView === 'learning-status-mgmt') this.analysisDashboard.initLearningStatusView();
        });
    },

    showDashboardMenu() {
        this.state.currentView = 'dashboard';
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'grid';
        
        // 모든 뷰 숨기기
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        // 현강반일 경우에만 '수업 영상 관리' 버튼 보이기
        if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
        }

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
    },

    handleViewChange(viewName) {
        this.state.currentView = viewName;
        
        // 대시보드 메뉴 숨기기
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none';
        
        // 모든 뷰 숨기기
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        // 선택된 뷰 보이기
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) viewToShow.style.display = 'block';
        else { this.showDashboardMenu(); return; }

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
        
        // 화면 이동 시 반 선택 드롭다운 상태 유지 보장
        if (this.elements.classSelect && this.state.selectedClassId) {
            this.elements.classSelect.value = this.state.selectedClassId;
        }

        // 뷰별 초기화 로직
        switch (viewName) {
            case 'homework-dashboard': this.homeworkDashboard?.managerInstance?.populateHomeworkSelect(); break;
            case 'qna-video-mgmt': this.classVideoManager?.initQnaView(); break;
            case 'lesson-mgmt':
                this.populateSubjectSelectForMgmt();
                break;
            case 'student-list-mgmt': this.renderStudentList(); break;
            case 'class-mgmt': this.displayCurrentClassInfo(); break;
            case 'class-video-mgmt': this.classVideoManager?.initLectureView(); break;
            case 'report-mgmt':
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
                break;
            case 'daily-test-mgmt': this.analysisDashboard.initDailyTestView(); break;
            case 'weekly-test-mgmt': this.analysisDashboard.initWeeklyTestView(); break; // [추가됨]
            case 'learning-status-mgmt': this.analysisDashboard.initLearningStatusView(); break;
        }
    },

    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;

        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = selectedOption.text;
        
        this.state.studentsInClass.clear();
        this.state.textbooksBySubject = {};
        this.state.selectedReportDate = null;
        this.state.uploadedReports = [];

        if (!newClassId) {
            this.showDashboardMenu();
            return;
        }

        this.state.isClassDataLoading = true;
        if (this.state.currentView === 'student-list-mgmt') this.renderStudentList(); 
        
        try {
            const q1 = query(collection(db, 'students'), where('classId', '==', newClassId));
            const q2 = query(collection(db, 'students'), where('classIds', 'array-contains', newClassId));
            const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            
            s1.forEach(d => this.state.studentsInClass.set(d.id, d.data().name));
            s2.forEach(d => this.state.studentsInClass.set(d.id, d.data().name));
            
            const classDoc = await getDoc(doc(db, 'classes', newClassId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
            
        } catch(e) { console.error(e); }
        
        this.state.isClassDataLoading = false;

        document.dispatchEvent(new CustomEvent('class-changed'));
        
        // 현재 화면 유지 또는 대시보드 복귀 로직
        if (this.state.currentView === 'dashboard' || !this.state.currentView) {
            this.showDashboardMenu();
        } else if (this.state.currentView === 'student-list-mgmt') {
            this.renderStudentList();
        }
    },

    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        this.state.selectedClassData = null;

        try {
            const q1 = query(collection(db, 'students'), where('classId', '==', classId));
            const q2 = query(collection(db, 'students'), where('classIds', 'array-contains', classId));
            const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            
            s1.forEach(docSnap => this.state.studentsInClass.set(docSnap.id, docSnap.data().name));
            s2.forEach(docSnap => this.state.studentsInClass.set(docSnap.id, docSnap.data().name));
        } catch (error) { console.error("Error fetching students:", error); }

        try {
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
        } catch (error) { console.error("Error fetching class details:", error); }
    },

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
            container.innerHTML = '<p class="text-sm text-red-500 p-4">로딩 실패</p>';
            return;
        }
        if (!this.state.selectedClassId) {
            container.innerHTML = '<p class="text-sm text-slate-500 p-4">반을 먼저 선택해주세요.</p>';
            return;
        }
        if (this.state.studentsInClass.size === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500 p-4">등록된 학생이 없습니다.</p>';
            return;
        }

        const sortedStudents = Array.from(this.state.studentsInClass.entries())
            .sort(([, a], [, b]) => a.localeCompare(b));
        sortedStudents.forEach(([id, name]) => {
            const div = document.createElement('div');
            div.className = "p-3 border-b border-slate-100 bg-white text-sm hover:bg-slate-50";
            div.textContent = name;
            container.appendChild(div);
        });
    },

    async displayCurrentClassInfo() {
        if (this.state.currentView !== 'class-mgmt') return;
        const { currentClassInfo, currentClassType, currentClassSubjectsList } = this.elements;
        if (!currentClassInfo) return;

        const classData = this.state.selectedClassData;
        if (!classData) {
            currentClassInfo.style.display = 'none';
            return;
        }

        currentClassInfo.style.display = 'block';
        currentClassType.textContent = classData.classType === 'live-lecture' ? '현강반' : '자기주도반';
        currentClassSubjectsList.innerHTML = '';

        const classSubjects = classData.subjects || {};
        const subjectIds = Object.keys(classSubjects);

        if (subjectIds.length === 0) {
            currentClassSubjectsList.innerHTML = '<li>연결된 과목 없음</li>';
            return;
        }

        subjectIds.forEach(subId => {
            const subName = this.state.subjects.find(s => s.id === subId)?.name || '알 수 없는 과목';
            const li = document.createElement('li');
            li.textContent = subName;
            currentClassSubjectsList.appendChild(li);
        });
    },

    listenForSubjects() {
        this.state.isSubjectsLoading = true;
        const q = query(collection(db, 'subjects'), orderBy("name"));
        onSnapshot(q, (snapshot) => {
            const subjects = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.state.subjects = subjects;
            setSubjects(subjects);
            this.state.isSubjectsLoading = false;
            document.dispatchEvent(new CustomEvent('subjectsUpdated'));
        });
    },

    updateSubjectDropdowns() {
        if (this.state.currentView === 'lesson-mgmt') this.populateSubjectSelectForMgmt();
    },

    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.disabled = true;
        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const snap = await getDocs(query(collection(db, 'classes'), orderBy("name")));
            select.innerHTML = '<option value="">-- 반 선택 --</option>';
            snap.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = d.data().name;
                select.appendChild(opt);
            });
            
            if (this.state.selectedClassId) {
                select.value = this.state.selectedClassId;
            }
        } catch(e) { select.innerHTML = '<option>로드 실패</option>'; }
        finally { select.disabled = false; }
    },

    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;
        const current = select.value || this.state.selectedSubjectIdForMgmt;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);
        });
        if (current) select.value = current;
    },

    initReportUploadView() {
        if (this.elements.reportCurrentClassSpan) {
            this.elements.reportCurrentClassSpan.textContent = this.state.selectedClassName || '-';
        }
        this.state.selectedReportDate = null;
        this.state.uploadedReports = [];
        if (this.elements.reportDateInput) this.elements.reportDateInput.value = '';
        if (this.elements.reportFilesInput) this.elements.reportFilesInput.value = '';
        if (this.elements.reportUploadStatus) this.elements.reportUploadStatus.textContent = '';
        this.renderReportFileList([]);
    },

    async handleReportUpload() {
        const dateInput = this.elements.reportDateInput;
        const filesInput = this.elements.reportFilesInput;
        const statusEl = this.elements.reportUploadStatus;
        const uploadBtn = this.elements.uploadReportsBtn;

        if (!dateInput || !filesInput || !statusEl || !uploadBtn) return;

        const classId = this.state.selectedClassId;
        const testDateRaw = dateInput.value;
        const files = filesInput.files;

        if (!classId) { showToast("반 선택 필요"); return; }
        if (!testDateRaw || !files.length) { showToast("날짜/파일 선택 필요"); return; }

        const testDate = testDateRaw.replace(/-/g, '');
        uploadBtn.disabled = true;
        statusEl.textContent = `업로드 중...`;

        const uploadPromises = [];
        for (const file of files) {
            uploadPromises.push(reportManager.uploadReport(file, classId, testDate));
        }

        try {
            await Promise.all(uploadPromises);
            statusEl.textContent = `완료`;
            showToast("업로드 성공", false);
            filesInput.value = '';
            await this.loadAndRenderUploadedReports();
        } catch (error) {
            console.error(error);
            statusEl.textContent = `실패`;
            showToast("업로드 실패", true);
        } finally {
            uploadBtn.disabled = false;
        }
    },

    async loadAndRenderUploadedReports() {
        const dateInput = this.elements.reportDateInput;
        const listContainer = this.elements.uploadedReportsList;
        const classId = this.state.selectedClassId;

        if (!dateInput || !listContainer) return;
        const testDateRaw = dateInput.value;

        if (!testDateRaw || !classId) {
            this.state.selectedReportDate = null;
            this.state.uploadedReports = [];
            this.renderReportFileList([]);
            return;
        }

        const testDate = testDateRaw.replace(/-/g, '');
        this.state.selectedReportDate = testDate;
        listContainer.innerHTML = '<p>로딩 중...</p>';

        const rawReports = await reportManager.listReportsForDateAndClass(classId, testDate);
        if (!rawReports) {
            listContainer.innerHTML = '<p>로딩 실패</p>';
            this.state.uploadedReports = [];
            return;
        }

        const mappedReports = rawReports.map(r => ({
            fileName: r.fileName,
            url: r.url || '',
            storagePath: `reports/${classId}/${testDate}/${r.fileName}`,
        }));

        this.state.uploadedReports = mappedReports;
        this.renderReportFileList(mappedReports);
    },

    renderReportFileList(reports) {
        const listContainer = this.elements.uploadedReportsList;
        if (!listContainer) return;
        listContainer.innerHTML = '';

        if (!reports || reports.length === 0) {
            listContainer.innerHTML = '<p class="text-sm text-slate-400 mt-4">리포트 없음</p>';
            return;
        }

        const ul = document.createElement('ul');
        ul.className = 'space-y-2 mt-4';

        reports.forEach(report => {
            const li = document.createElement('li');
            li.className = 'p-2 border rounded-md flex justify-between items-center text-sm bg-white';
            li.innerHTML = `
                <span class="truncate mr-2">${report.fileName}</span>
                <div class="flex-shrink-0 flex gap-2">
                    <button class="view-report-btn text-blue-500 font-bold" data-url="${report.url}">보기</button>
                    <button class="delete-report-btn text-red-500 font-bold" data-path="${report.storagePath}" data-filename="${report.fileName}">삭제</button>
                </div>
            `;
            ul.appendChild(li);
        });
        listContainer.appendChild(ul);
    },

    async handleDeleteReport(storagePath, fileName) {
        if (confirm(`삭제하시겠습니까?`)) {
            const success = await reportManager.deleteReport(storagePath);
            if (success) {
                showToast("삭제 완료", false);
                await this.loadAndRenderUploadedReports();
            } else {
                 showToast("삭제 실패", true);
            }
        }
    }
};

export { TeacherApp };