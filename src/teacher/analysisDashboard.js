// src/teacher/analysisDashboard.js

import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { createAnalysisManager } from "../shared/analysisManager.js"; 

export const analysisDashboard = {
    app: null,
    manager: null,
    state: {
        students: [] 
    },

    init(app) {
        this.app = app;
        
        // UI 요소 연결
        const elements = {
            dailyTestResultTable: document.getElementById('teacher-daily-test-result-table'),
            dailyTestPagination: document.getElementById('teacher-daily-test-pagination'),
            dailyTestPrevBtn: document.getElementById('teacher-daily-test-prev-btn'),
            dailyTestNextBtn: document.getElementById('teacher-daily-test-next-btn'),
            dailyTestPageInfo: document.getElementById('teacher-daily-test-page-info'),
            dailyTestSubjectSelect: document.getElementById('teacher-daily-test-subject-select'), 

            weeklyResultTable: document.getElementById('teacher-weekly-test-result-table'),
            weeklyPagination: document.getElementById('teacher-weekly-test-pagination'),
            weeklyPrevBtn: document.getElementById('teacher-weekly-test-prev-btn'),
            weeklyNextBtn: document.getElementById('teacher-weekly-test-next-btn'),
            weeklyPageInfo: document.getElementById('teacher-weekly-test-page-info'),
            weeklyModal: document.getElementById('teacher-weekly-test-modal'),
            weeklyModalStudent: document.getElementById('teacher-weekly-modal-student'),
            weeklyModalDate: document.getElementById('teacher-weekly-modal-date'),
            weeklyModalScore: document.getElementById('teacher-weekly-modal-score'),

            // 학습 현황
            learningSubjectSelect: document.getElementById('teacher-learning-subject-select'),
            learningLessonSelect: document.getElementById('teacher-learning-lesson-select'),
            learningResultTable: document.getElementById('teacher-learning-result-table'),
        };

        // 공통 매니저 생성
        this.manager = createAnalysisManager({
            elements: elements,
            role: 'teacher'
        });

        // --- 이벤트 연결 ---

        // Daily
        const dailySubjectSelect = document.getElementById('teacher-daily-test-subject-select');
        dailySubjectSelect?.addEventListener('change', (e) => {
            const classId = this.app.state.selectedClassId;
            this.manager.loadDailyTests(classId, e.target.value, this.state.students);
        });

        elements.dailyTestPrevBtn?.addEventListener('click', () => this.manager.changeDailyPage(-1));
        elements.dailyTestNextBtn?.addEventListener('click', () => this.manager.changeDailyPage(1));

        // Weekly
        elements.weeklyPrevBtn?.addEventListener('click', () => this.manager.changeWeeklyPage(-1));
        elements.weeklyNextBtn?.addEventListener('click', () => this.manager.changeWeeklyPage(1));

        document.getElementById('teacher-add-weekly-test-btn')?.addEventListener('click', () => this.manager.openAddWeeklyModal());
        document.getElementById('teacher-weekly-modal-save-btn')?.addEventListener('click', () => this.manager.saveWeeklyFromModal());
        document.getElementById('teacher-weekly-modal-close-btn')?.addEventListener('click', () => {
            if(elements.weeklyModal) elements.weeklyModal.style.display = 'none';
        });
        
        // Learning Status
        elements.learningSubjectSelect?.addEventListener('change', (e) => this.manager.loadLessonsForLearning(e.target.value));
        elements.learningLessonSelect?.addEventListener('change', (e) => this.manager.loadLearningResults(e.target.value, this.state.students));

        // 반 변경 감지
        document.addEventListener('class-changed', () => this.reset());
    },

    reset() {
        // 화면 초기화
        this.manager.loadDailyTests(null, null, []);
        this.manager.loadWeeklyTests(null, []);
        
        const subSelect = document.getElementById('teacher-daily-test-subject-select');
        if(subSelect) subSelect.value = '';

        // 학습현황 초기화
        const ls = document.getElementById('teacher-learning-subject-select');
        const ll = document.getElementById('teacher-learning-lesson-select');
        const lt = document.getElementById('teacher-learning-result-table');
        if(ls) ls.value=''; 
        if(ll) { ll.innerHTML='<option value="">-- 과목 선택 --</option>'; ll.disabled=true; }
        if(lt) lt.innerHTML='';
    },

    async prepareStudents() {
        // TeacherApp의 전역 상태인 studentsInClass(Map)를 배열로 변환
        const map = this.app.state.studentsInClass;
        if (!map || map.size === 0) return false;
        
        this.state.students = Array.from(map.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.name.localeCompare(b.name));
        return true;
    },

    async initDailyTestView() {
        const subSelect = document.getElementById('teacher-daily-test-subject-select');
        if (!subSelect) return;
        
        subSelect.innerHTML = '<option>로딩 중...</option>';
        if (!await this.prepareStudents()) {
            subSelect.innerHTML = '<option value="">학생 데이터 없음</option>';
            return;
        }

        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            subSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => subSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            subSelect.disabled = false;
        } catch (e) { showToast("과목 로딩 실패"); }
    },

    async initWeeklyTestView() {
        if (!await this.prepareStudents()) return;
        const classId = this.app.state.selectedClassId;
        // 공통 매니저 호출
        this.manager.loadWeeklyTests(classId, this.state.students);
    },

    async initLearningStatusView() {
        if (!await this.prepareStudents()) return;
        // 공통 매니저 호출 (과목 로드)
        this.manager.loadSubjectsForLearning();
    },
    
    // (이전 버전 호환용 빈 함수들 - 필요 시 삭제 가능)
    handleLearningSubjectChange() {},
    handleLearningLessonChange() {}
};