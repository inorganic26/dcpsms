// src/admin/adminApp.js

import { db, ensureAuth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 분리된 모든 기능 모듈들을 가져옵니다.
import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
import { lessonManager } from './lessonManager.js';

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: { 
        subjects: [],
        classes: [],
        lessons: [],
        selectedSubjectsForNewClass: new Set(),
        editingClass: null,
        selectedSubjectIdForLesson: null,
        editingLesson: null,
        generatedQuiz: null, 
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
    },

    init() {
        if (this.isInitialized) {
            this.showAdminSection('dashboard');
            return;
        };
        this.isInitialized = true;
        
        this.cacheElements();
        
        // 각 기능 모듈을 초기화하고, AdminApp 객체 자체를 전달합니다.
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        lessonManager.init(this);

        this.addEventListeners();
        this.showAdminSection('dashboard');
    },

    cacheElements() {
        this.elements = {
            dashboardView: document.getElementById('admin-dashboard-view'),
            gotoSubjectMgmtBtn: document.getElementById('goto-subject-mgmt-btn'),
            gotoTextbookMgmtBtn: document.getElementById('goto-textbook-mgmt-btn'),
            gotoClassMgmtBtn: document.getElementById('goto-class-mgmt-btn'),
            gotoStudentMgmtBtn: document.getElementById('goto-student-mgmt-btn'),
            gotoLessonMgmtBtn: document.getElementById('goto-lesson-mgmt-btn'),
            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),
            classSubjectsOptions: document.getElementById('admin-class-subjects-options'),
            classSelectForStudent: document.getElementById('admin-class-select-for-student'),
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPasswordInput: document.getElementById('admin-new-student-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),
            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            modal: document.getElementById('admin-new-lesson-modal'), 
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'),
            video1RevUrl: document.getElementById('admin-video1-rev-url'),
            video2Url: document.getElementById('admin-video2-url'),
            video2RevUrl: document.getElementById('admin-video2-rev-url'),
            quizJsonInput: document.getElementById('admin-quiz-json-input'), 
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'), 
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'), 
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'), 
            saveLoader: document.getElementById('admin-save-loader'),
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            editClassSubjectsOptions: document.getElementById('admin-edit-class-subjects-options'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
        };
    },
    
    addEventListeners() {
        // 메뉴 이동 관련 이벤트 리스너
        this.elements.gotoSubjectMgmtBtn.addEventListener('click', () => this.showAdminSection('subject-mgmt'));
        this.elements.gotoTextbookMgmtBtn.addEventListener('click', () => this.showAdminSection('textbook-mgmt'));
        this.elements.gotoClassMgmtBtn.addEventListener('click', () => this.showAdminSection('class-mgmt'));
        this.elements.gotoStudentMgmtBtn.addEventListener('click', () => this.showAdminSection('student-mgmt'));
        this.elements.gotoLessonMgmtBtn.addEventListener('click', () => this.showAdminSection('lesson-mgmt'));
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });
        
        // 과목 목록이 업데이트될 때마다 다른 UI(드롭다운 등)를 다시 그립니다.
        document.addEventListener('subjectsUpdated', () => {
            this.renderSubjectOptionsForClass();
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
        });
    },

    showAdminSection(sectionName) {
        this.elements.dashboardView.style.display = 'none';
        Object.keys(this.elements).forEach(key => {
            if (key.endsWith('MgmtView')) {
                this.elements[key].style.display = 'none';
            }
        });
        const viewMap = {
            'dashboard': this.elements.dashboardView,
            'subject-mgmt': this.elements.subjectMgmtView,
            'textbook-mgmt': this.elements.textbookMgmtView,
            'class-mgmt': this.elements.classMgmtView,
            'student-mgmt': this.elements.studentMgmtView,
            'lesson-mgmt': this.elements.lessonMgmtView,
        };
        if (viewMap[sectionName]) {
            viewMap[sectionName].style.display = 'block';
        }
    },

    // 여러 모듈에서 공통으로 사용하는 과목 목록 렌더링 함수들
    renderSubjectOptionsForClass() {
        const { classSubjectsOptions, subjects } = this.elements;
        classSubjectsOptions.innerHTML = '';
        if (this.state.subjects.length === 0) {
            classSubjectsOptions.innerHTML = '<p class="text-slate-400">먼저 공통 과목을 생성해주세요.</p>';
            return;
        }
        this.state.subjects.forEach(subjectData => {
            const optionDiv = document.createElement('div');
            optionDiv.className = "subject-option";
            optionDiv.dataset.id = subjectData.id;
            optionDiv.textContent = subjectData.name;
            optionDiv.addEventListener('click', () => {
                const id = subjectData.id;
                if (this.state.selectedSubjectsForNewClass.has(id)) {
                    this.state.selectedSubjectsForNewClass.delete(id);
                    optionDiv.classList.remove('selected');
                } else {
                    this.state.selectedSubjectsForNewClass.add(id);
                    optionDiv.classList.add('selected');
                }
            });
            classSubjectsOptions.appendChild(optionDiv);
        });
    },
    
    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id; option.textContent = sub.name;
            select.appendChild(option);
        });
    },

    renderSubjectOptionsForLesson() {
        const select = this.elements.subjectSelectForLesson;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            select.appendChild(option);
        });
    },
};

// 앱 시작점
document.addEventListener('DOMContentLoaded', () => {
    ensureAuth(() => {
        AdminApp.init();
    });
});

export default AdminApp;