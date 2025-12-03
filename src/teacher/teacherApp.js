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
import { signInWithCustomToken } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db, auth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// ✨ Store 임포트 (반 설정 화면에 데이터 공급용)
import { setSubjects } from "../store/subjectStore.js";

// 모듈 import
// (주의: classEditor는 공용 모듈을 사용합니다)
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from '../shared/classEditor.js'; // ✨ shared 경로로 수정 권장
import { classVideoManager } from './classVideoManager.js';
import { reportManager } from '../shared/reportManager.js';
import { analysisDashboard } from './analysisDashboard.js'; 

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

    // ✅ 서버 함수를 통한 안전한 로그인 (권한 문제 해결)
    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }

        showToast("로그인 중...", false);

        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const verifyLogin = httpsCallable(functions, 'verifyTeacherLogin');
            
            // 1. 서버에 이름/비번 보내서 검증
            const result = await verifyLogin({ name, password });
            const { success, message, token, teacherId, teacherData } = result.data;

            if (!success) {
                showToast(message || "로그인 실패", true);
                return;
            }

            // 2. 받아온 토큰으로 실제 Firebase 로그인 (이때 권한 획득!)
            await signInWithCustomToken(auth, token);

            // 3. 상태 저장 및 대시보드 이동
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
        console.log("[TeacherApp] Initializing dashboard...");

        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager;
        this.analysisDashboard = analysisDashboard; 

        try {
            this.homeworkDashboard.init(this);
            this.lessonManager.init(this);
            this.classEditor.init(this);
            this.classVideoManager.init(this);
            this.analysisDashboard.init(this); 

        } catch (e) {
            console.error("Error initializing modules:", e);
            showToast("앱 초기화 중 오류 발생", true);
            return;
        }

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects(); // 여기서 Store 업데이트 실행됨

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'none';

        console.log("[TeacherApp] Dashboard initialized.");
    },

    async promptPasswordChange(teacherId) {
        let newPassword = null;
        let isValid = false;

        while (!isValid) {
            newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
            
            if (newPassword === null) {
                showToast("비밀번호 변경 취소. (권장하지 않음)");
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
            await updateDoc(doc(db, 'teachers', teacherId), {
                password: newPassword,
                isInitialPassword: false
            });
            showToast("비밀번호가 변경되었습니다.", false);
        } catch (error) {
            console.error("비밀번호 변경 실패:", error);
            showToast("비밀번호 변경 실패", true);
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
            
            // Class Info
            currentClassInfo: document.getElementById('current-class-info'),
            currentClassType: document.getElementById('current-class-type'),
            currentClassSubjectsList: document.getElementById('current-class-subjects-list'),
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            manageSubjectsTextbooksBtn: document.getElementById('teacher-manage-subjects-textbooks-btn'),
            
            // Homework
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
            
            // Lesson
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
            
            // Videos
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
            
            // Report
            reportDateInput: document.getElementById('teacher-report-date'),
            reportFilesInput: document.getElementById('teacher-report-files-input'),
            reportCurrentClassSpan: document.getElementById('teacher-report-current-class'),
            uploadReportsBtn: document.getElementById('teacher-upload-reports-btn'),
            reportUploadStatus: document.getElementById('teacher-report-upload-status'),
            uploadedReportsList: document.getElementById('teacher-uploaded-reports-list'),
            
            // Analysis
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
        this.elements.classSelect?.addEventListener('change', (e) => this.handleClassSelection(e));

        this.elements.navButtonsContainer?.addEventListener('click', (e) => {
            const card = e.target.closest('.teacher-nav-btn');
            if (card?.dataset.view) this.handleViewChange(card.dataset.view);
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
            const viewBtn = e.target.closest('.view-report-btn');
            const deleteBtn = e.target.closest('.delete-report-btn');

            if (viewBtn && viewBtn.dataset.url) {
                const fileUrl = viewBtn.dataset.url;
                if (fileUrl) window.open(fileUrl, '_blank');
            }

            if (deleteBtn && deleteBtn.dataset.path) {
                this.handleDeleteReport(deleteBtn.dataset.path, deleteBtn.dataset.filename);
            }
        });

        document.addEventListener('subjectsUpdated', () => {
            this.state.isSubjectsLoading = false;
            this.updateSubjectDropdowns();
            if (this.classEditor?.managerInstance?.isSubjectTextbookMgmtModalOpen?.()) {
                this.classEditor.managerInstance.renderSubjectListForMgmt();
                this.classEditor.managerInstance.populateSubjectSelectForTextbookMgmt();
            }
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        });

        document.addEventListener('class-changed', () => {
            if (this.state.currentView === 'report-mgmt') {
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
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

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
    },

    handleViewChange(viewName) {
        this.state.currentView = viewName;
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none';
        
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        } else {
            this.showDashboardMenu();
            return;
        }
        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';

        switch (viewName) {
            case 'homework-dashboard': {
                this.homeworkDashboard?.managerInstance?.populateHomeworkSelect();
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
            case 'qna-video-mgmt': this.classVideoManager?.initQnaView(); break;
            case 'lesson-mgmt':
                this.populateSubjectSelectForMgmt();
                if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                if (this.elements.subjectSelectForMgmt) this.elements.subjectSelectForMgmt.value = '';
                break;
            case 'student-list-mgmt': this.renderStudentList(); break;
            case 'class-mgmt': this.displayCurrentClassInfo(); break;
            case 'class-video-mgmt': this.classVideoManager?.initLectureView(); break;
            case 'report-mgmt':
                this.initReportUploadView();
                this.loadAndRenderUploadedReports();
                break;
            default: this.showDashboardMenu(); break;
        }
    },

    async handleClassSelection(event) {
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
        this.state.textbooksBySubject = {};
        this.state.selectedReportDate = null;
        this.state.uploadedReports = [];

        if (!this.state.selectedClassId) {
            if (this.elements.mainContent) this.elements.mainContent.style.display = 'none';
            if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
            if (this.elements.gotoClassVideoMgmtBtn) this.elements.gotoClassVideoMgmtBtn.style.display = 'none';
            this.homeworkDashboard.managerInstance?.resetUIState();
            document.dispatchEvent(new CustomEvent('class-changed'));
            return;
        }

        this.state.isClassDataLoading = true;
        if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();

        await this.fetchClassData(this.state.selectedClassId);
        this.state.isClassDataLoading = false;

        this.showDashboardMenu();
        this.homeworkDashboard.managerInstance?.populateHomeworkSelect();
        document.dispatchEvent(new CustomEvent('class-changed'));
    },

    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        this.state.selectedClassData = null;

        try {
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(docSnap => {
                this.state.studentsInClass.set(docSnap.id, docSnap.data().name);
            });
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
            container.innerHTML = '<p class="text-sm text-slate-500 p-4">반 선택 필요</p>';
            return;
        }
        if (this.state.studentsInClass.size === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500 p-4">학생 없음</p>';
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

    async displayCurrentClassInfo() {
        if (this.state.currentView !== 'class-mgmt') return;
        const { currentClassInfo, currentClassType, currentClassSubjectsList } = this.elements;
        if (!currentClassInfo) return;

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
            currentClassSubjectsList.innerHTML = '<li>과목 로딩 중...</li>';
            return;
        }

        const classSubjects = classData.subjects || {};
        const subjectIds = Object.keys(classSubjects);

        if (subjectIds.length === 0) {
            currentClassSubjectsList.innerHTML = '<li>과목 없음</li>';
            return;
        }

        const neededSubjectIds = subjectIds.filter(
            id => !this.state.textbooksBySubject[id] && !this.state.areTextbooksLoading[id]
        );

        if (neededSubjectIds.length > 0) {
            neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = true);
            currentClassSubjectsList.innerHTML = '<li>교재 로딩 중...</li>';
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
                console.error(error);
                neededSubjectIds.forEach(id => this.state.areTextbooksLoading[id] = false);
            }
        }

        currentClassSubjectsList.innerHTML = '';
        subjectIds.forEach(subjectId => {
            const subjectInfo = this.state.subjects.find(s => s.id === subjectId);
            const subjectName = subjectInfo ? subjectInfo.name : `과목(${subjectId})`;
            const textbookIds = classSubjects[subjectId]?.textbooks || [];

            const li = document.createElement('li');
            li.textContent = `${subjectName}`;
            const textbooksP = document.createElement('p');
            textbooksP.className = "text-xs pl-4";

            if (textbookIds.length > 0) {
                if (this.state.textbooksBySubject[subjectId]) {
                    const textbookList = this.state.textbooksBySubject[subjectId];
                    const names = textbookIds.map(id => textbookList.find(tb => tb.id === id)?.name).filter(Boolean);
                    textbooksP.textContent = names.length > 0 ? `교재: ${names.join(', ')}` : `교재: ${textbookIds.length}개`;
                    textbooksP.classList.add("text-slate-500");
                } else {
                    textbooksP.textContent = "교재 로딩 중...";
                }
            } else {
                textbooksP.textContent = "교재 없음";
                textbooksP.classList.add("text-slate-400");
            }
            li.appendChild(textbooksP);
            currentClassSubjectsList.appendChild(li);
        });
    },

    // ✅ [핵심 수정] 과목 데이터를 불러오면 Store에도 넣어줍니다.
    listenForSubjects() {
        this.state.isSubjectsLoading = true;
        try {
            const q = query(collection(db, 'subjects'), orderBy("name"));
            onSnapshot(q, (snapshot) => {
                const subjects = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
                this.state.subjects = subjects;
                
                // ✨ Store 업데이트 (이게 있어야 반 설정 화면에서 과목이 뜹니다!)
                setSubjects(subjects);

                this.state.isSubjectsLoading = false;
                document.dispatchEvent(new CustomEvent('subjectsUpdated'));
            }, (error) => {
                console.error(error);
                this.state.isSubjectsLoading = false;
            });
        } catch (error) {
            console.error(error);
            this.state.isSubjectsLoading = false;
        }
    },

    updateSubjectDropdowns() {
        if (this.state.isSubjectsLoading) return;
        if (this.state.currentView === 'lesson-mgmt') this.populateSubjectSelectForMgmt();
        if (this.homeworkDashboard.managerInstance && this.elements.assignHomeworkModal?.style.display === 'flex') {
            this.homeworkDashboard.managerInstance.populateSubjectsForHomeworkModal();
        }
    },

    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.disabled = true;
        select.innerHTML = '<option>로딩 중...</option>';

        try {
            const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name")));
            select.innerHTML = '<option value="">-- 반 선택 --</option>';
            if (snapshot.empty) select.innerHTML += '<option disabled>반 없음</option>';
            else {
                snapshot.forEach(docSnap => {
                    const option = document.createElement('option');
                    option.value = docSnap.id;
                    option.textContent = docSnap.data().name;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error(error);
            select.innerHTML = '<option>로드 실패</option>';
        } finally {
            select.disabled = false;
        }
    },

    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;

        if (this.state.isSubjectsLoading) {
            select.innerHTML = '<option>로딩 중...</option>';
            select.disabled = true;
            return;
        }

        const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';

        if (!this.state.subjects || this.state.subjects.length === 0) {
            select.innerHTML += '<option disabled>과목 없음</option>';
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

    initReportUploadView() {
        if (this.elements.reportCurrentClassSpan) {
            this.elements.reportCurrentClassSpan.textContent = this.state.selectedClassName || '반 선택 필요';
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