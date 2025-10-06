// src/teacher/teacherApp.js

import { doc, getDoc, getDocs, collection, query } from "firebase/firestore";
import { db, ensureAuth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 분리된 기능 모듈들을 가져옵니다.
import { lessonDashboard } from './lessonDashboard.js';
import { homeworkDashboard } from './homeworkDashboard.js';

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        editingHomeworkId: null,
        studentsInClass: new Map(),
    },

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.cacheElements();
        this.addEventListeners();

        // 각 기능 모듈을 초기화하고, state와 elements 객체를 전달합니다.
        lessonDashboard.init(this.state, this.elements);
        homeworkDashboard.init(this.state, this.elements);

        this.populateClassSelect();
    },

    cacheElements() {
        this.elements = {
            loadingScreen: document.getElementById('teacher-loading-screen'),
            classSelect: document.getElementById('teacher-class-select'),
            viewSelect: document.getElementById('teacher-view-select'),
            lessonsDashboard: document.getElementById('teacher-lessons-dashboard'),
            subjectSelect: document.getElementById('teacher-subject-select'),
            lessonSelect: document.getElementById('teacher-lesson-select'),
            dashboardContent: document.getElementById('teacher-dashboard-content'),
            selectedLessonTitle: document.getElementById('teacher-selected-lesson-title'),
            resultsTableBody: document.getElementById('teacher-results-table-body'),
            homeworkDashboard: document.getElementById('teacher-homework-dashboard'),
            assignHomeworkBtnContainer: document.getElementById('teacher-assign-homework-btn-container'),
            assignHomeworkBtn: document.getElementById('teacher-assign-homework-btn'),
            homeworkSelect: document.getElementById('teacher-homework-select'),
            homeworkContent: document.getElementById('teacher-homework-content'),
            selectedHomeworkTitle: document.getElementById('teacher-selected-homework-title'),
            homeworkManagementButtons: document.getElementById('teacher-homework-management-buttons'),
            editHomeworkBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteHomeworkBtn: document.getElementById('teacher-delete-homework-btn'),
            homeworkTableBody: document.getElementById('teacher-homework-table-body'),
            assignHomeworkModal: document.getElementById('teacher-assign-homework-modal'),
            homeworkModalTitle: document.getElementById('teacher-homework-modal-title'),
            closeHomeworkModalBtn: document.getElementById('teacher-close-homework-modal-btn'),
            cancelHomeworkBtn: document.getElementById('teacher-cancel-homework-btn'),
            saveHomeworkBtn: document.getElementById('teacher-save-homework-btn'),
            homeworkSubjectSelect: document.getElementById('teacher-homework-subject-select'),
            homeworkTextbookSelect: document.getElementById('teacher-homework-textbook-select'),
            homeworkDueDateInput: document.getElementById('teacher-homework-due-date'),
        };
    },

    // 앱의 메인 컨트롤러 역할만 하는 이벤트 리스너들을 남겨둡니다.
    addEventListeners() { 
        this.elements.classSelect?.addEventListener('change', (e) => this.handleClassSelection(e));
        this.elements.viewSelect?.addEventListener('change', (e) => this.handleViewChange(e.target.value));
    },

    resetAllSelections() {
        this.state.selectedClassId = null; this.state.selectedClassName = null;
        this.state.selectedClassData = null; this.state.selectedSubjectId = null;
        this.state.selectedLessonId = null; this.state.selectedHomeworkId = null;
        this.state.studentsInClass.clear();
        this.elements.viewSelect.disabled = true;
        this.elements.lessonsDashboard.style.display = 'none';
        this.elements.homeworkDashboard.style.display = 'none';
        this.elements.assignHomeworkBtnContainer.style.display = 'none';
    },

    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        this.state.selectedClassId = selectedOption.value;
        this.state.selectedClassName = selectedOption.text;
        if (!this.state.selectedClassId) {
            this.resetAllSelections();
            return;
        }
        this.elements.viewSelect.disabled = false;
        await this.fetchClassData(this.state.selectedClassId);
        this.handleViewChange(this.elements.viewSelect.value);
    },

    async fetchClassData(classId) {
        await this.fetchStudentsInClass(classId);
        const classDoc = await getDoc(doc(db, 'classes', classId));
        this.state.selectedClassData = classDoc.exists() ? classDoc.data() : null;
    },

    async fetchStudentsInClass(classId) {
        this.state.studentsInClass.clear();
        const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
        const snapshot = await getDocs(studentsQuery);
        snapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));
    },

    // '학습' 또는 '숙제' 뷰를 전환하는 역할
    handleViewChange(view) {
        this.elements.lessonsDashboard.style.display = 'none';
        this.elements.homeworkDashboard.style.display = 'none';
        this.elements.assignHomeworkBtnContainer.style.display = 'none';
        this.elements.dashboardContent.style.display = 'none';
        this.elements.homeworkContent.style.display = 'none';
        this.elements.homeworkManagementButtons.style.display = 'none';

        if (lessonDashboard.unsubscribe) lessonDashboard.unsubscribe();
        if (homeworkDashboard.unsubscribe) homeworkDashboard.unsubscribe();

        if (view === 'lessons') {
            this.elements.lessonsDashboard.style.display = 'block';
            this.populateSubjectSelect();
        } else if (view === 'homework') {
            this.elements.homeworkDashboard.style.display = 'block';
            this.elements.assignHomeworkBtnContainer.style.display = 'block';
            homeworkDashboard.populateHomeworkSelect(); // 숙제 모듈의 함수 호출
        }
    },

    async populateClassSelect() {
        this.elements.loadingScreen.style.display = 'flex';
        this.elements.classSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
        try {
            const q = query(collection(db, 'classes'));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id; option.textContent = doc.data().name;
                this.elements.classSelect.appendChild(option);
            });
        } catch (error) {
            showToast("반 목록을 불러오는 데 실패했습니다.");
        } finally {
            this.elements.loadingScreen.style.display = 'none';
        }
    },

    async populateSubjectSelect() {
        this.elements.subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.elements.lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
        this.elements.lessonSelect.disabled = true; this.elements.dashboardContent.style.display = 'none';
        
        if (!this.state.selectedClassData || !this.state.selectedClassData.subjects) { 
            this.elements.subjectSelect.disabled = true; 
            return; 
        }
        
        const subjectIds = Object.keys(this.state.selectedClassData.subjects);
        if(subjectIds.length === 0) { 
            this.elements.subjectSelect.disabled = true; 
            return; 
        }

        const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
        subjectDocs.forEach(subjectDoc => {
            if(subjectDoc.exists()) {
                this.elements.subjectSelect.innerHTML += `<option value="${subjectDoc.id}">${subjectDoc.data().name}</option>`;
            }
        });
        this.elements.subjectSelect.disabled = false;
    },
};

// 앱 시작점
document.addEventListener('DOMContentLoaded', () => {
    ensureAuth(() => {
        TeacherApp.init();
    });
});

export default TeacherApp;