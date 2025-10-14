// src/teacher/teacherApp.js

import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc } from "firebase/firestore";
import { db, ensureAnonymousAuth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

import { lessonDashboard } from './lessonDashboard.js';
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { analysisDashboard } from './analysisDashboard.js';

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

        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'flex';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'none';
    },

    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }

        let userDoc = null;
        
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
    },

    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';

        this.initializeDashboard();

        if (userData.isInitialPassword) {
            this.promptPasswordChange(userId);
        }
    },
    
    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        // 각 모듈을 TeacherApp의 속성으로 추가하여 서로 참조할 수 있도록 함
        this.lessonDashboard = lessonDashboard;
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.analysisDashboard = analysisDashboard;

        // 초기화
        this.lessonDashboard.init(this);
        this.homeworkDashboard.init(this);
        this.lessonManager.init(this);
        this.classEditor.init(this);
        this.analysisDashboard.init(this);

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects();
        this.handleViewChange('lesson-dashboard');
    },

    async promptPasswordChange(teacherId) {
        const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
        if (newPassword && newPassword.length >= 6) {
            try {
                const teacherRef = doc(db, 'teachers', teacherId);
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
            navButtons: document.querySelectorAll('.teacher-nav-btn'),
            views: {
                'lesson-dashboard': document.getElementById('view-lesson-dashboard'),
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'analysis-dashboard': document.getElementById('view-analysis-dashboard'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
            },
            subjectSelectLesson: document.getElementById('teacher-subject-select-lesson'),
            lessonSelect: document.getElementById('teacher-lesson-select'),
            lessonDashboardContent: document.getElementById('teacher-lesson-dashboard-content'),
            selectedLessonTitle: document.getElementById('teacher-selected-lesson-title'),
            resultsTableBody: document.getElementById('teacher-results-table-body'),
            homeworkSelect: document.getElementById('teacher-homework-select'),
            homeworkContent: document.getElementById('teacher-homework-content'),
            selectedHomeworkTitle: document.getElementById('teacher-selected-homework-title'),
            homeworkTableBody: document.getElementById('teacher-homework-table-body'),
            assignHomeworkBtn: document.getElementById('teacher-assign-homework-btn'),
            homeworkManagementButtons: document.getElementById('teacher-homework-management-buttons'),
            editHomeworkBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteHomeworkBtn: document.getElementById('teacher-delete-homework-btn'),
            assignHomeworkModal: document.getElementById('teacher-assign-homework-modal'),
            homeworkModalTitle: document.getElementById('teacher-homework-modal-title'),
            closeHomeworkModalBtn: document.getElementById('teacher-close-homework-modal-btn'),
            cancelHomeworkBtn: document.getElementById('teacher-cancel-homework-btn'),
            saveHomeworkBtn: document.getElementById('teacher-save-homework-btn'),
            homeworkSubjectSelect: document.getElementById('teacher-homework-subject-select'),
            homeworkTextbookSelect: document.getElementById('teacher-homework-textbook-select'),
            homeworkDueDateInput: document.getElementById('teacher-homework-due-date'),
            subjectSelectForMgmt: document.getElementById('teacher-subject-select-mgmt'),
            lessonsManagementContent: document.getElementById('teacher-lessons-management-content'),
            lessonPrompt: document.getElementById('teacher-lesson-prompt'),
            lessonsList: document.getElementById('teacher-lessons-list'),
            saveOrderBtn: document.getElementById('teacher-save-lesson-order-btn'),
            modal: document.getElementById('teacher-new-lesson-modal'),
            modalTitle: document.getElementById('teacher-lesson-modal-title'),
            lessonTitle: document.getElementById('teacher-lesson-title'),
            video1Url: document.getElementById('teacher-video1-url'),
            video2Url: document.getElementById('teacher-video2-url'),
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
        };
    },

    addEventListeners() {
        if (this.elements.classSelect) {
            this.elements.classSelect.addEventListener('change', (e) => this.handleClassSelection(e));
        }
        this.elements.navButtons.forEach(btn => {
            btn.addEventListener('click', () => this.handleViewChange(btn.dataset.view));
        });
    },

    handleViewChange(viewName) {
        this.elements.navButtons.forEach(btn => {
            const isSelected = btn.dataset.view === viewName;
            btn.classList.toggle('bg-white', isSelected);
            btn.classList.toggle('text-blue-600', isSelected);
            btn.classList.toggle('shadow-sm', isSelected);
            btn.classList.toggle('text-slate-600', !isSelected);
            btn.classList.toggle('hover:bg-slate-300', !isSelected);
        });

        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });
        
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        }

        if (viewName === 'lesson-dashboard') {
            this.populateSubjectSelectForLessonDashboard();
        } else if (viewName === 'homework-dashboard') {
            this.homeworkDashboard.populateHomeworkSelect();
        } else if (viewName === 'lesson-mgmt') {
             this.populateSubjectSelectForMgmt();
        } else if (viewName === 'analysis-dashboard') {
            this.analysisDashboard.renderStudentLists();
        }
    },

    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        this.state.selectedClassId = selectedOption.value;
        this.state.selectedClassName = selectedOption.text;

        if (!this.state.selectedClassId) {
            this.elements.mainContent.style.display = 'none';
            return;
        }

        this.elements.mainContent.style.display = 'block';
        await this.fetchClassData(this.state.selectedClassId);
        
        const activeNav = document.querySelector('.teacher-nav-btn.bg-white');
        const activeView = activeNav ? activeNav.dataset.view : 'lesson-dashboard';
        this.handleViewChange(activeView);
    },

    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
        const studentsSnapshot = await getDocs(studentsQuery);
        studentsSnapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));

        const classDoc = await getDoc(doc(db, 'classes', classId));
        this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;

        document.dispatchEvent(new CustomEvent('class-changed'));
    },

    listenForSubjects() {
        onSnapshot(query(collection(db, 'subjects')), (snapshot) => {
            this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
    },

    async populateClassSelect() {
        this.elements.classSelect.disabled = true;
        try {
            const snapshot = await getDocs(query(collection(db, 'classes')));
            this.elements.classSelect.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                this.elements.classSelect.appendChild(option);
            });
        } catch (error) {
            this.elements.classSelect.innerHTML = '<option value="">-- 목록 로드 실패 --</option>';
            showToast("반 목록을 불러오는 데 실패했습니다.");
        } finally {
            this.elements.classSelect.disabled = false;
        }
    },

    populateSubjectSelectForLessonDashboard() {
        const select = this.elements.subjectSelectLesson;
        if (!select) return;

        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.elements.lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
        this.elements.lessonSelect.disabled = true;
        this.elements.lessonDashboardContent.style.display = 'none';

        if (!this.state.selectedClassData || !this.state.selectedClassData.subjects) {
            select.disabled = true; return;
        }

        const subjectIds = Object.keys(this.state.selectedClassData.subjects);
        if(subjectIds.length === 0) {
            select.disabled = true; return;
        }

        subjectIds.forEach(id => {
            const subject = this.state.subjects.find(s => s.id === id);
            if (subject) {
                select.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
            }
        });
        select.disabled = false;
    },

    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;
        
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
    },
};

document.addEventListener('DOMContentLoaded', () => {
    ensureAnonymousAuth(() => {
        TeacherApp.init();
    });
});

export default TeacherApp;