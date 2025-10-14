// src/admin/adminApp.js

import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
// import { teacherManager } from './teacherManager.js'; // TODO: 교사 관리 모듈 생성 필요
import { lessonManager } from './lessonManager.js';
import { studentAssignmentManager } from './studentAssignmentManager.js';

const functions = getFunctions();

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: { 
        subjects: [],
        classes: [],
        students: [],
        lessons: [],
        editingClass: null,
        selectedSubjectIdForLesson: null,
        editingLesson: null,
        generatedQuiz: null, 
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
    },

    init() {
        const secretLoginBtn = document.getElementById('admin-secret-login-btn');
        secretLoginBtn?.addEventListener('click', this.handleSecretLogin.bind(this));

        // 페이지 로드 시, 이미 익명 로그인이 되어 있는지 확인
        onAuthStateChanged(auth, (user) => {
            if (user && user.isAnonymous) {
                // 이미 익명 로그인 상태라면, 역할 확인 절차 바로 진행
                this.verifyRoleAndInitialize(user);
            }
            // 로그인되어 있지 않으면, 비밀번호 입력 대기
        });
    },

    async handleSecretLogin() {
        const inputPassword = document.getElementById('admin-secret-password').value;
        if (inputPassword !== 'qkraudtls0626^^') {
            showToast('비밀번호가 올바르지 않습니다.');
            return;
        }

        try {
            showToast("인증 중...", false);
            // 기존 익명 사용자가 없으면 새로 생성, 있으면 기존 사용자 정보 반환
            const userCredential = await signInAnonymously(auth);
            await this.verifyRoleAndInitialize(userCredential.user);
        } catch (error) {
            console.error("익명 로그인 실패:", error);
            showToast("관리자 인증에 실패했습니다. 인터넷 연결을 확인해주세요.");
        }
    },
    
    async verifyRoleAndInitialize(user) {
        try {
            const idTokenResult = await user.getIdTokenResult(true);
            const userRole = idTokenResult.claims.role;

            if (userRole === 'admin') {
                // 역할이 'admin'이면 대시보드 표시
                document.getElementById('admin-initial-login').style.display = 'none';
                document.getElementById('admin-main-dashboard').style.display = 'block';
                this.initializeDashboard();
            } else {
                // 역할이 없으면, UID를 포함한 안내 메시지 표시
                showToast(`관리자 권한이 없습니다. 다음 UID에 'admin' 역할을 부여해야 합니다: ${user.uid}`);
            }
        } catch (error) {
            console.error("권한 확인 중 오류 발생:", error);
            showToast("권한을 확인하는 중 오류가 발생했습니다.");
        }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        this.cacheElements();
        
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        // teacherManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this);

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
            gotoTeacherMgmtBtn: document.getElementById('goto-teacher-mgmt-btn'),
            gotoLessonMgmtBtn: document.getElementById('goto-lesson-mgmt-btn'),
            gotoStudentAssignmentBtn: document.getElementById('goto-student-assignment-btn'),
            
            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            teacherMgmtView: document.getElementById('admin-teacher-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'),

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
            video2Url: document.getElementById('admin-video2-url'),
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
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
        };
    },
    
    addEventListeners() {
        this.elements.gotoSubjectMgmtBtn.addEventListener('click', () => this.showAdminSection('subject-mgmt'));
        this.elements.gotoTextbookMgmtBtn.addEventListener('click', () => this.showAdminSection('textbook-mgmt'));
        this.elements.gotoClassMgmtBtn.addEventListener('click', () => this.showAdminSection('class-mgmt'));
        this.elements.gotoStudentMgmtBtn.addEventListener('click', () => this.showAdminSection('student-mgmt'));
        this.elements.gotoTeacherMgmtBtn?.addEventListener('click', () => this.showAdminSection('teacher-mgmt'));
        this.elements.gotoLessonMgmtBtn.addEventListener('click', () => this.showAdminSection('lesson-mgmt'));
        this.elements.gotoStudentAssignmentBtn.addEventListener('click', () => this.showAdminSection('student-assignment'));
        
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });
        
        document.addEventListener('subjectsUpdated', () => {
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
        });
    },

    showAdminSection(sectionName) {
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
            'teacher-mgmt': this.elements.teacherMgmtView,
            'lesson-mgmt': this.elements.lessonMgmtView,
            'student-assignment': this.elements.studentAssignmentView,
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

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export default AdminApp;