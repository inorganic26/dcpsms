// src/admin/adminAnalysisManager.js

import { collection, getDocs, doc, getDoc, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const adminAnalysisManager = {
    elements: {},
    // 실시간 감시 취소용
    unsubscribeDailyTest: null,

    state: {
        students: [],
        studentMap: new Map(), // ID -> 이름 매핑용
        
        // 일일 테스트
        selectedDailyClassId: null,
        selectedDailySubjectId: null,
        dailyTestRecords: [], // 불러온 전체 기록
        uniqueDates: [],      // 날짜 목록 (컬럼용)
        matrixPage: 0,
        itemsPerPage: 5,      // 한 페이지에 보여줄 날짜 수
        
        // 학습 현황
        selectedLearningClassId: null,
        selectedLearningSubjectId: null,
        selectedLearningLessonId: null,
    },

    init(app) {
        this.app = app;
        this.elements = {
            // Daily Test View Elements
            dailyClassSelect: document.getElementById('admin-daily-test-class-select'),
            dailySubjectSelect: document.getElementById('admin-daily-test-subject-select'),
            dailyResultTable: document.getElementById('admin-daily-test-result-table'),
            dailyPagination: document.getElementById('admin-daily-test-pagination'),
            dailyPrevBtn: document.getElementById('admin-daily-test-prev-btn'),
            dailyNextBtn: document.getElementById('admin-daily-test-next-btn'),
            dailyPageInfo: document.getElementById('admin-daily-test-page-info'),

            // Learning Status View Elements
            learningClassSelect: document.getElementById('admin-learning-class-select'),
            learningSubjectSelect: document.getElementById('admin-learning-subject-select'),
            learningLessonSelect: document.getElementById('admin-learning-lesson-select'),
            learningResultTable: document.getElementById('admin-learning-result-table'),
        };

        this.elements.dailyClassSelect?.addEventListener('change', (e) => this.handleDailyClassChange(e.target.value));
        this.elements.dailySubjectSelect?.addEventListener('change', (e) => this.handleDailySubjectChange(e.target.value));
        
        this.elements.dailyPrevBtn?.addEventListener('click', () => this.changeMatrixPage(-1));
        this.elements.dailyNextBtn?.addEventListener('click', () => this.changeMatrixPage(1));

        this.elements.learningClassSelect?.addEventListener('change', (e) => this.handleLearningClassChange(e.target.value));
        this.elements.learningSubjectSelect?.addEventListener('change', (e) => this.handleLearningSubjectChange(e.target.value));
        this.elements.learningLessonSelect?.addEventListener('change', (e) => this.handleLearningLessonChange(e.target.value));
    },

    async loadClassesToSelect(selectElement) {
        if (!selectElement) return;
        selectElement.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, "classes"), orderBy("name"));
            const snapshot = await getDocs(q);
            selectElement.innerHTML = '<option value="">-- 반 선택 --</option>';
            snapshot.forEach(doc => {
                selectElement.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
        } catch (e) { console.error(e); }
    },

    async loadStudents(classId) {
        try {
            const q = query(collection(db, "students"), where("classId", "==", classId));
            const snapshot = await getDocs(q);
            
            this.state.students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.state.students.sort((a, b) => a.name.localeCompare(b.name));
            
            // Map 생성 (ID로 이름 찾기용)
            this.state.studentMap.clear();
            this.state.students.forEach(s => this.state.studentMap.set(s.id, s.name));
            
        } catch (e) { console.error("학생 로딩 실패", e); }
    },

    // =========================================
    // [View 1] 일일 테스트 (Daily Tests Collection 사용)
    // =========================================
    initDailyTestView() {
        this.loadClassesToSelect(this.elements.dailyClassSelect);
        this.resetDailySelectors('class');
    },

    async handleDailyClassChange(classId) {
        this.state.selectedDailyClassId = classId;
        this.resetDailySelectors('subject');
        
        // 반이 변경되면 기존 감시 해제
        if (this.unsubscribeDailyTest) {
            this.unsubscribeDailyTest();
            this.unsubscribeDailyTest = null;
        }

        if (!classId) return;

        await this.loadStudents(classId);

        const subjectSelect = this.elements.dailySubjectSelect;
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => {
                subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
            subjectSelect.disabled = false;
        } catch (e) { showToast("과목 로딩 실패"); }
    },

    async handleDailySubjectChange(subjectId) {
        this.state.selectedDailySubjectId = subjectId;
        const container = this.elements.dailyResultTable;
        this.elements.dailyPagination.classList.add('hidden');

        // 기존 감시 해제
        if (this.unsubscribeDailyTest) {
            this.unsubscribeDailyTest();
            this.unsubscribeDailyTest = null;
        }

        if (!subjectId) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '<div class="loader-small mx-auto"></div> <p class="text-center mt-2">실시간 데이터 로딩 중...</p>';

        try {
            // ✨ [핵심 수정] getDocs -> onSnapshot (실시간)
            // 성능 최적화(where classId)와 실시간성(onSnapshot) 동시 적용
            const q = query(
                collection(db, "daily_tests"), 
                where("subjectId", "==", subjectId),
                where("classId", "==", this.state.selectedDailyClassId), 
                orderBy("date", "desc")
            );
            
            this.unsubscribeDailyTest = onSnapshot(q, (snapshot) => {
                const allRecords = [];
                snapshot.forEach(doc => {
                    allRecords.push({ id: doc.id, ...doc.data() });
                });

                this.state.dailyTestRecords = allRecords;
                
                // 날짜 목록 추출
                const dates = [...new Set(allRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a)); // 최신순
                this.state.uniqueDates = dates;
                this.state.matrixPage = 0;

                if (dates.length === 0) {
                    container.innerHTML = '<p class="text-center text-slate-400 py-10">등록된 테스트 기록이 없습니다.</p>';
                    this.elements.dailyPagination.classList.add('hidden');
                } else {
                    this.renderDailyMatrix();
                }

            }, (error) => {
                console.error(error);
                if (error.code === 'failed-precondition') {
                     container.innerHTML = `<div class="text-red-500 text-center p-4">
                        데이터베이스 색인(Index) 생성이 필요합니다.<br>
                        <a href="${error.message.match(/https?:\/\/[^\s]+/)[0]}" target="_blank" class="underline font-bold text-blue-600">여기(링크)를 클릭하여 생성해주세요.</a>
                        <br><span class="text-xs text-slate-500">(생성 후 몇 분 뒤부터 정상 작동합니다)</span>
                     </div>`;
                } else {
                    container.innerHTML = '<div class="text-red-500 text-center p-4">데이터 로드 실패</div>';
                }
            });

        } catch (error) {
            console.error(error);
            container.innerHTML = '<div class="text-red-500 text-center p-4">초기화 오류</div>';
        }
    },

    changeMatrixPage(delta) {
        const { uniqueDates, itemsPerPage, matrixPage } = this.state;
        const maxPage = Math.ceil(uniqueDates.length / itemsPerPage) - 1;
        const newPage = matrixPage + delta;
        
        if (newPage >= 0 && newPage <= maxPage) {
            this.state.matrixPage = newPage;
            this.renderDailyMatrix();
        }
    },

    renderDailyMatrix() {
        const { uniqueDates, dailyTestRecords, matrixPage, itemsPerPage, students } = this.state;
        const container = this.elements.dailyResultTable;
        const pagination = this.elements.dailyPagination;
        const prevBtn = this.elements.dailyPrevBtn;
        const nextBtn = this.elements.dailyNextBtn;
        const pageInfo = this.elements.dailyPageInfo;

        if (uniqueDates.length === 0) return;

        // 페이지네이션 처리
        const startIdx = matrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleDates = uniqueDates.slice(startIdx, endIdx);
        const totalPages = Math.ceil(uniqueDates.length / itemsPerPage);

        pagination.classList.remove('hidden');
        prevBtn.disabled = matrixPage === 0;
        nextBtn.disabled = matrixPage >= totalPages - 1;
        pageInfo.textContent = `${matrixPage + 1} / ${totalPages} 페이지`;

        // 날짜 포맷팅 (YYYY-MM-DD -> MM.DD)
        const dateLabels = visibleDates.map(d => {
            const parts = d.split('-');
            return parts.length === 3 ? `${parts[1]}.${parts[2]}` : d;
        });

        // 테이블 헤더 생성
        let html = `
            <table class="w-full text-sm text-center border-collapse whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="p-3 border sticky left-0 bg-slate-100 z-20 min-w-[80px]">이름</th>
                        <th class="p-3 border bg-slate-50 min-w-[60px] text-blue-700">개인평균</th>
        `;
        dateLabels.forEach(label => {
            html += `<th class="p-3 border font-bold text-slate-600">${label}</th>`;
        });
        html += `</tr></thead><tbody>`;

        // 학생별 행 생성
        students.forEach(student => {
            const studentRecords = dailyTestRecords.filter(r => r.studentId === student.id);
            const totalScore = studentRecords.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
            const avg = studentRecords.length > 0 ? Math.round(totalScore / studentRecords.length) : '-';

            html += `<tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 border font-bold sticky left-0 bg-white z-10">${student.name}</td>
                <td class="p-3 border font-bold text-blue-600 bg-slate-50">${avg}</td>`;

            // 각 날짜별 점수 매핑
            visibleDates.forEach(date => {
                const record = studentRecords.find(r => r.date === date);
                
                if (!record) {
                    html += `<td class="p-3 border text-slate-300">-</td>`;
                } else {
                    const score = Number(record.score);
                    let bgClass = "";
                    if (score >= 90) bgClass = "bg-blue-50 text-blue-700";
                    else if (score < 70) bgClass = "bg-red-50 text-red-600";
                    
                    const tooltip = record.memo ? `title="메모: ${record.memo}"` : "";
                    html += `<td class="p-3 border font-bold ${bgClass} cursor-help" ${tooltip}>${score}</td>`;
                }
            });
            html += `</tr>`;
        });

        // 반 평균 행 추가
        html += `<tr class="bg-slate-100 font-bold border-t-2 border-slate-300">
            <td class="p-3 border sticky left-0 bg-slate-100 z-10">반 평균</td>
            <td class="p-3 border text-slate-400">-</td>`;

        visibleDates.forEach(date => {
            const dateRecords = dailyTestRecords.filter(r => r.date === date);
            const dateTotal = dateRecords.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
            const dateAvg = dateRecords.length > 0 ? Math.round(dateTotal / dateRecords.length) : '-';
            html += `<td class="p-3 border text-indigo-700">${dateAvg}</td>`;
        });

        html += `</tr></tbody></table>`;
        container.innerHTML = html;
    },

    resetDailySelectors(level) {
        if (level === 'class') {
            this.elements.dailySubjectSelect.innerHTML = '<option value="">-- 반을 먼저 선택하세요 --</option>';
            this.elements.dailySubjectSelect.disabled = true;
            this.elements.dailyResultTable.innerHTML = '';
            this.elements.dailyPagination.classList.add('hidden');
        } else if (level === 'subject') {
            this.elements.dailyResultTable.innerHTML = '';
            this.elements.dailyPagination.classList.add('hidden');
        }
    },

    // =========================================
    // [View 2] 학습 현황 상세 (기존 로직 유지)
    // =========================================
    initLearningStatusView() {
        this.loadClassesToSelect(this.elements.learningClassSelect);
        this.resetLearningSelectors('class');
    },

    async handleLearningClassChange(classId) {
        this.state.selectedLearningClassId = classId;
        this.resetLearningSelectors('subject');
        if (!classId) return;

        await this.loadStudents(classId);

        const subjectSelect = this.elements.learningSubjectSelect;
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => {
                subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
            subjectSelect.disabled = false;
        } catch (e) { console.error(e); }
    },

    async handleLearningSubjectChange(subjectId) {
        this.state.selectedLearningSubjectId = subjectId;
        this.resetLearningSelectors('lesson');
        if (!subjectId) return;

        const lessonSelect = this.elements.learningLessonSelect;
        lessonSelect.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
            const snapshot = await getDocs(q);
            lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
            if (snapshot.empty) lessonSelect.innerHTML += '<option disabled>학습 없음</option>';
            else {
                snapshot.forEach(doc => {
                    lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`;
                });
            }
            lessonSelect.disabled = false;
        } catch (e) { console.error(e); }
    },

    async handleLearningLessonChange(lessonId) {
        this.state.selectedLearningLessonId = lessonId;
        const container = this.elements.learningResultTable;
        if (!lessonId) { container.innerHTML = ''; return; }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';
        try {
            const subjectId = this.state.selectedLearningSubjectId;
            const students = this.state.students;
            const results = await Promise.all(students.map(async (student) => {
                const docRef = doc(db, "subjects", subjectId, "lessons", lessonId, "submissions", student.id);
                const docSnap = await getDoc(docRef); 
                return { student, data: docSnap.exists() ? docSnap.data() : null };
            }));

            let html = `
                <table class="w-full text-sm text-left border-collapse">
                    <thead class="bg-slate-100 text-slate-700 font-bold">
                        <tr>
                            <th class="p-3 border">이름</th>
                            <th class="p-3 border">상태</th>
                            <th class="p-3 border">퀴즈 점수</th>
                            <th class="p-3 border">최근 시도</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            results.forEach(({ student, data }) => {
                const status = data?.status || '-';
                const quizScore = data?.score !== undefined ? `${data.score}점` : '-';
                let dateStr = '-';
                if (data?.lastAttemptAt) {
                    const d = data.lastAttemptAt.toDate();
                    dateStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
                }
                let cls = status.includes('통과') ? 'text-green-600 font-bold' : (status.includes('실패') ? 'text-red-500 font-bold' : '');
                
                html += `<tr class="border-b hover:bg-slate-50">
                    <td class="p-3 border font-medium">${student.name}</td>
                    <td class="p-3 border ${cls}">${status}</td>
                    <td class="p-3 border">${quizScore}</td>
                    <td class="p-3 border text-xs text-slate-500">${dateStr}</td>
                </tr>`;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        } catch (e) { container.innerHTML = '<p class="text-red-500">오류 발생</p>'; }
    },

    resetLearningSelectors(level) {
        if (level === 'class') {
            this.elements.learningSubjectSelect.innerHTML = '<option value="">-- 반을 먼저 선택하세요 --</option>';
            this.elements.learningSubjectSelect.disabled = true;
            this.elements.learningLessonSelect.innerHTML = '<option value="">-- 반을 먼저 선택하세요 --</option>';
            this.elements.learningLessonSelect.disabled = true;
            this.elements.learningResultTable.innerHTML = '';
        } else if (level === 'subject') {
            this.elements.learningLessonSelect.innerHTML = '<option value="">-- 과목을 먼저 선택하세요 --</option>';
            this.elements.learningLessonSelect.disabled = true;
            this.elements.learningResultTable.innerHTML = '';
        } else if (level === 'lesson') {
            this.elements.learningResultTable.innerHTML = '';
        }
    }
};