// src/admin/adminAnalysisManager.js

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { createAnalysisManager } from "../shared/analysisManager.js"; 

export const adminAnalysisManager = {
    elements: {},
    manager: null,
    state: { students: [], selectedClassId: null },

    init(app) {
        this.app = app;
        
        // DOM 요소 캐싱 (모든 분석 기능 통합)
        this.elements = {
            dailyTestResultTable: document.getElementById('admin-daily-test-result-table'),
            dailyTestPagination: document.getElementById('admin-daily-test-pagination'),
            dailyTestPrevBtn: document.getElementById('admin-daily-test-prev-btn'),
            dailyTestNextBtn: document.getElementById('admin-daily-test-next-btn'),
            dailyTestPageInfo: document.getElementById('admin-daily-test-page-info'),
            dailyTestSubjectSelect: document.getElementById('admin-daily-test-subject-select'),

            weeklyResultTable: document.getElementById('admin-weekly-test-result-table'),
            weeklyPagination: document.getElementById('admin-weekly-test-pagination'),
            weeklyPrevBtn: document.getElementById('admin-weekly-test-prev-btn'),
            weeklyNextBtn: document.getElementById('admin-weekly-test-next-btn'),
            weeklyPageInfo: document.getElementById('admin-weekly-test-page-info'),
            weeklyModal: document.getElementById('admin-weekly-test-modal'),
            weeklyModalStudent: document.getElementById('admin-weekly-modal-student'),
            weeklyModalDate: document.getElementById('admin-weekly-modal-date'),
            weeklyModalScore: document.getElementById('admin-weekly-modal-score'),
            
            learningClassSelect: document.getElementById('admin-learning-class-select'),
            learningSubjectSelect: document.getElementById('admin-learning-subject-select'),
            learningLessonSelect: document.getElementById('admin-learning-lesson-select'),
            learningResultTable: document.getElementById('admin-learning-result-table'),
        };

        // 공통 매니저 생성
        this.manager = createAnalysisManager({ elements: this.elements, role: 'admin' });

        // --- 이벤트 연결 ---
        
        // 1. 일일 테스트
        document.getElementById('admin-daily-test-class-select')?.addEventListener('change', (e) => this.handleDailyClassChange(e.target.value));
        this.elements.dailyTestSubjectSelect?.addEventListener('change', (e) => this.manager.loadDailyTests(this.state.selectedClassId, e.target.value, this.state.students));
        this.elements.dailyTestPrevBtn?.addEventListener('click', () => this.manager.changeDailyPage(-1));
        this.elements.dailyTestNextBtn?.addEventListener('click', () => this.manager.changeDailyPage(1));

        // 2. 주간 테스트
        document.getElementById('admin-weekly-test-class-select')?.addEventListener('change', (e) => this.handleWeeklyClassChange(e.target.value));
        this.elements.weeklyPrevBtn?.addEventListener('click', () => this.manager.changeWeeklyPage(-1));
        this.elements.weeklyNextBtn?.addEventListener('click', () => this.manager.changeWeeklyPage(1));
        document.getElementById('admin-add-weekly-test-btn')?.addEventListener('click', () => this.manager.openAddWeeklyModal());
        document.getElementById('admin-weekly-modal-save-btn')?.addEventListener('click', () => this.manager.saveWeeklyFromModal());
        document.getElementById('admin-weekly-modal-close-btn')?.addEventListener('click', () => { if(this.elements.weeklyModal) this.elements.weeklyModal.style.display='none'; });

        // 3. 학습 현황 (공통 모듈 사용)
        this.elements.learningClassSelect?.addEventListener('change', (e) => this.handleLearningClassChange(e.target.value));
        this.elements.learningSubjectSelect?.addEventListener('change', (e) => this.manager.loadLessonsForLearning(e.target.value));
        this.elements.learningLessonSelect?.addEventListener('change', (e) => this.manager.loadLearningResults(e.target.value, this.state.students));
    },

    // --- Admin 고유 로직 (반 선택 & 학생 로드) ---
    async loadClassesToSelect(id) {
        const sel = document.getElementById(id); if(!sel) return;
        sel.innerHTML = '<option>로딩 중...</option>';
        try {
            const snap = await getDocs(query(collection(db,"classes"), orderBy("name")));
            sel.innerHTML = '<option value="">-- 반 선택 --</option>';
            snap.forEach(d => sel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`);
        } catch(e) { console.error(e); }
    },
    async loadStudents(cid) {
        if(!cid) { this.state.students=[]; return; }
        const snap = await getDocs(query(collection(db,"students"), where("classId","==",cid)));
        this.state.students = snap.docs.map(d=>({id:d.id, ...d.data()})).sort((a,b)=>a.name.localeCompare(b.name));
    },

    // --- 뷰 초기화 ---
    initDailyTestView() {
        this.loadClassesToSelect('admin-daily-test-class-select');
        const s = this.elements.dailyTestSubjectSelect;
        if(s) { s.innerHTML='<option value="">-- 반 선택 필요 --</option>'; s.disabled=true; }
        this.elements.dailyTestResultTable.innerHTML = '';
    },
    async handleDailyClassChange(cid) {
        this.state.selectedClassId = cid;
        this.manager.loadDailyTests(null, null, []);
        if(!cid) return;
        await this.loadStudents(cid);
        // 과목 로드 (Admin은 직접 로드)
        const s = this.elements.dailyTestSubjectSelect;
        if(s) {
            s.innerHTML = '<option>로딩 중...</option>';
            const snap = await getDocs(query(collection(db,"subjects"), orderBy("name")));
            s.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snap.forEach(d => s.innerHTML += `<option value="${d.id}">${d.data().name}</option>`);
            s.disabled = false;
        }
    },

    initWeeklyTestView() {
        this.loadClassesToSelect('admin-weekly-test-class-select');
        this.elements.weeklyResultTable.innerHTML = '';
    },
    async handleWeeklyClassChange(cid) {
        if(!cid) { this.manager.loadWeeklyTests(null, []); return; }
        await this.loadStudents(cid);
        this.manager.loadWeeklyTests(cid, this.state.students);
    },

    initLearningStatusView() {
        this.loadClassesToSelect('admin-learning-class-select');
        this.elements.learningSubjectSelect.innerHTML = '<option value="">-- 반 선택 필요 --</option>';
        this.elements.learningSubjectSelect.disabled = true;
        this.elements.learningLessonSelect.innerHTML = '<option value="">-- 반 선택 필요 --</option>';
        this.elements.learningLessonSelect.disabled = true;
        this.elements.learningResultTable.innerHTML = '<p class="text-center text-slate-400 py-10">반을 선택해주세요.</p>';
    },
    async handleLearningClassChange(cid) {
        this.elements.learningResultTable.innerHTML = '';
        this.elements.learningLessonSelect.innerHTML = '<option value="">-- 과목 선택 필요 --</option>';
        this.elements.learningLessonSelect.disabled = true;
        
        if(!cid) {
            this.elements.learningSubjectSelect.innerHTML = '<option value="">-- 반 선택 필요 --</option>';
            this.elements.learningSubjectSelect.disabled = true;
            return;
        }
        await this.loadStudents(cid);
        // 과목 로드 (공통 모듈 사용)
        this.manager.loadSubjectsForLearning();
    }
};