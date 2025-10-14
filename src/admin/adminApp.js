// src/admin/adminApp.js

// ▼▼▼ [수정] import 항목 변경 ▼▼▼
import { db, ensureAuthWithRole } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 분리된 모든 기능 모듈들을 가져옵니다.
import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
import { lessonManager } from './lessonManager.js';
import { studentAssignmentManager } from './studentAssignmentManager.js'; // 새로 추가

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: { 
        subjects: [],
        classes: [],
        students: [], // 전체 학생 목록을 관리할 state
        lessons: [],
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
        
        // 각 기능 모듈을 초기화합니다.
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this); // 새로 추가

        this.addEventListeners();
        this.showAdminSection('dashboard');
    },

    cacheElements() {
        this.elements = {
            // 대시보드 및 메뉴 버튼
            dashboardView: document.getElementById('admin-dashboard-view'),
            gotoSubjectMgmtBtn: document.getElementById('goto-subject-mgmt-btn'),
            gotoTextbookMgmtBtn: document.getElementById('goto-textbook-mgmt-btn'),
            gotoClassMgmtBtn: document.getElementById('goto-class-mgmt-btn'),
            gotoStudentMgmtBtn: document.getElementById('goto-student-mgmt-btn'),
            gotoLessonMgmtBtn: document.getElementById('goto-lesson-mgmt-btn'),
            gotoStudentAssignmentBtn: document.getElementById('goto-student-assignment-btn'), // 새로 추가
            
            // 각 관리 뷰
            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'), // 새로 추가

            // 과목 관리
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),
            
            // 교재 관리
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),
            
            // 반 관리
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),
            
            // 학생 명단 관리
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPasswordInput: document.getElementById('admin-new-student-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),
            
            // 학습 세트 관리
            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            
            // 학습 세트 모달
            modal: document.getElementById('admin-new-lesson-modal'), 
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'),
            video2Url: document.getElementById('admin-video2-url'),
            quizJsonInput: document.getElementById('admin-quiz-json-input'), 
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'), 
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'), 
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'), 
            saveLoader: document.getElementById('admin-save-loader'),
            
            // 반 정보 수정 모달
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
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
        this.elements.gotoStudentAssignmentBtn.addEventListener('click', () => this.showAdminSection('student-assignment')); // 새로 추가
        
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });
        
        document.addEventListener('subjectsUpdated', () => {
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
        });
    },

    showAdminSection(sectionName) {
        // 모든 뷰 숨기기
        Object.keys(this.elements).forEach(key => {
            if (key.endsWith('View')) {
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
            'student-assignment': this.elements.studentAssignmentView, // 새로 추가
        };

        if (viewMap[sectionName]) {
            viewMap[sectionName].style.display = 'block';
        }
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

// ▼▼▼ [수정] DOMContentLoaded 리스너 변경 ▼▼▼
document.addEventListener('DOMContentLoaded', () => {
    // 'admin' 역할이 있어야만 앱을 초기화합니다.
    ensureAuthWithRole('admin', (user) => {
        AdminApp.init();
    });
});

export default AdminApp;