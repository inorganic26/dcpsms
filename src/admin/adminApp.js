// src/admin/adminApp.js

import { auth, onAuthStateChanged, signInAnonymously, db } from '../shared/firebase.js';
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { showToast } from '../shared/utils.js';

import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
import { teacherManager } from './teacherManager.js';
import { lessonManager } from './lessonManager.js';
import { studentAssignmentManager } from './studentAssignmentManager.js';

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: { 
        subjects: [],
        classes: [],
        students: [],
        teachers: [],
        lessons: [],
        editingClass: null,
        selectedSubjectIdForLesson: null,
        editingLesson: null,
        generatedQuiz: null, 
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
    },

    init() {
        document.getElementById('admin-initial-login').style.display = 'flex';
        document.getElementById('admin-main-dashboard').style.display = 'none';

        const secretLoginBtn = document.getElementById('admin-secret-login-btn');
        secretLoginBtn?.addEventListener('click', this.handleSecretLogin.bind(this));
    },

    async handleSecretLogin() {
        const inputPassword = document.getElementById('admin-secret-password').value;
        if (inputPassword !== 'qkraudtls0626^^') {
            showToast('비밀번호가 올바르지 않습니다.');
            return;
        }

        try {
            await signInAnonymously(auth);
            showToast("인증 성공!", false);
            this.showDashboard();
        } catch (error) {
            console.error("익명 로그인 실패:", error);
            showToast("관리자 인증에 실패했습니다. 인터넷 연결을 확인해주세요.");
        }
    },

    showDashboard() {
        document.getElementById('admin-initial-login').style.display = 'none';
        document.getElementById('admin-main-dashboard').style.display = 'block';
        this.initializeDashboard();
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        this.cacheElements();
        
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        teacherManager.init(this);
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
            
            // ▼▼▼ [추가] 질문 영상 관리 UI 요소 ▼▼▼
            gotoQnaVideoMgmtBtn: document.getElementById('goto-qna-video-mgmt-btn'),
            qnaVideoMgmtView: document.getElementById('admin-qna-video-mgmt-view'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoDate: document.getElementById('admin-qna-video-date'),
            qnaVideoTitle: document.getElementById('admin-qna-video-title'),
            qnaVideoUrl: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            // ▲▲▲ [추가] 여기까지 ▲▲▲
            
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
            
            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),
            
            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),

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
        
        // ▼▼▼ [추가] 질문 영상 관리 메뉴 이벤트 리스너 ▼▼▼
        this.elements.gotoQnaVideoMgmtBtn?.addEventListener('click', () => this.showAdminSection('qna-video-mgmt'));
        this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo());
        // ▲▲▲ [추가] 여기까지 ▲▲▲

        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });
        
        document.addEventListener('subjectsUpdated', () => {
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
        });

        // [추가] 반 목록이 업데이트되면 질문 영상 관리의 반 선택 목록도 갱신
        document.addEventListener('classesUpdated', () => {
            this.populateClassSelectForQnaVideo();
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
            'qna-video-mgmt': this.elements.qnaVideoMgmtView, // [추가]
        };

        if (viewMap[sectionName]) {
            viewMap[sectionName].style.display = 'block';
        }

        // [추가] 질문 영상 관리 뷰를 열 때 반 목록 채우기
        if (sectionName === 'qna-video-mgmt') {
            this.populateClassSelectForQnaVideo();
        }
    },
    
    // ▼▼▼ [추가] 새로운 함수들 ▼▼▼
    populateClassSelectForQnaVideo() {
        const select = this.elements.qnaClassSelect;
        if (!select) return;

        select.innerHTML = '<option value="">-- 반 선택 --</option>';
        this.state.classes.forEach(c => {
            select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    },

    async saveQnaVideo() {
        const classId = this.elements.qnaClassSelect.value;
        const videoDate = this.elements.qnaVideoDate.value;
        const title = this.elements.qnaVideoTitle.value.trim();
        const youtubeUrl = this.elements.qnaVideoUrl.value.trim();

        if (!classId || !videoDate || !title || !youtubeUrl) {
            showToast("반, 날짜, 제목, URL을 모두 입력해야 합니다.");
            return;
        }

        try {
            await addDoc(collection(db, 'classVideos'), {
                classId: classId,
                videoDate,
                title,
                youtubeUrl,
                createdAt: serverTimestamp()
            });
            showToast("질문 영상이 성공적으로 저장되었습니다.", false);
            this.elements.qnaVideoTitle.value = '';
            this.elements.qnaVideoUrl.value = '';
        } catch (error) {
            console.error("질문 영상 저장 실패:", error);
            showToast("영상 저장에 실패했습니다.");
        }
    },
    // ▲▲▲ [추가] 여기까지 ▲▲▲
    
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