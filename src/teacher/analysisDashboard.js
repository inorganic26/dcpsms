// src/teacher/analysisDashboard.js

import { collection, getDocs, doc, getDoc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const analysisDashboard = {
    elements: {},
    unsubscribeDailyTest: null,

    state: {
        students: [], // 현재 선택된 반의 학생들만 담김
        dailyTestSubjectId: null,
        dailyTestRecords: [], 
        uniqueDates: [],      
        matrixPage: 0,
        itemsPerPage: 5,
        learningSubjectId: null,
        learningLessonId: null,
    },

    init(app) {
        this.app = app;
        this.elements = {
            dailyTestSubjectSelect: document.getElementById('teacher-daily-test-subject-select'),
            dailyTestResultTable: document.getElementById('teacher-daily-test-result-table'),
            learningSubjectSelect: document.getElementById('teacher-learning-subject-select'),
            learningLessonSelect: document.getElementById('teacher-learning-lesson-select'),
            learningResultTable: document.getElementById('teacher-learning-result-table'),
        };

        this.elements.dailyTestSubjectSelect?.addEventListener('change', (e) => this.handleDailyTestSubjectChange(e.target.value));
        this.elements.learningSubjectSelect?.addEventListener('change', (e) => this.handleLearningSubjectChange(e.target.value));
        this.elements.learningLessonSelect?.addEventListener('change', (e) => this.handleLearningLessonChange(e.target.value));
        
        // 반 변경 시 리셋
        document.addEventListener('class-changed', () => this.reset());
    },

    reset() {
        if (this.unsubscribeDailyTest) {
            this.unsubscribeDailyTest();
            this.unsubscribeDailyTest = null;
        }
        this.state.students = [];
        this.state.dailyTestRecords = [];
        this.state.uniqueDates = [];
        
        if(this.elements.dailyTestResultTable) this.elements.dailyTestResultTable.innerHTML = '';
        if(this.elements.learningResultTable) this.elements.learningResultTable.innerHTML = '';
        if(this.elements.dailyTestSubjectSelect) this.elements.dailyTestSubjectSelect.value = '';
    },

    async prepareData() {
        const classId = this.app.state.selectedClassId;
        if (!classId) return false;

        // [핵심 수정] 반이 바뀌면 확실하게 학생 목록을 새로 고침 (단일/다중 반 모두 포함)
        try {
            const q1 = query(collection(db, "students"), where("classId", "==", classId));
            const q2 = query(collection(db, "students"), where("classIds", "array-contains", classId));
            
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            
            const studentMap = new Map();
            snap1.forEach(d => studentMap.set(d.id, { id: d.id, ...d.data() }));
            snap2.forEach(d => studentMap.set(d.id, { id: d.id, ...d.data() }));

            this.state.students = Array.from(studentMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            return true;
        } catch (e) {
            console.error("학생 로딩 실패", e);
            return false;
        }
    },

    async initDailyTestView() {
        const subjectSelect = this.elements.dailyTestSubjectSelect;
        if (!subjectSelect) return;
        
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        this.elements.dailyTestResultTable.innerHTML = '';
        subjectSelect.disabled = true;

        if (!await this.prepareData()) {
             subjectSelect.innerHTML = '<option value="">학생 로드 실패</option>';
             return;
        }

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

    async handleDailyTestSubjectChange(subjectId) {
        this.state.dailyTestSubjectId = subjectId;
        const container = this.elements.dailyTestResultTable;
        const currentClassId = this.app.state.selectedClassId; 

        if (this.unsubscribeDailyTest) {
            this.unsubscribeDailyTest();
            this.unsubscribeDailyTest = null;
        }

        if (!subjectId) {
            container.innerHTML = '<p class="text-center text-slate-400 py-10">과목을 선택해주세요.</p>';
            return;
        }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            // [데이터 섞임 방지] 현재 반 ID로 정확하게 필터링
            const q = query(
                collection(db, "daily_tests"), 
                where("subjectId", "==", subjectId),
                where("classId", "==", currentClassId),
                orderBy("date", "desc")
            );
            
            this.unsubscribeDailyTest = onSnapshot(q, (snapshot) => {
                const allRecords = [];
                snapshot.forEach(doc => allRecords.push({ id: doc.id, ...doc.data() }));

                this.state.dailyTestRecords = allRecords;
                
                const dates = [...new Set(allRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a));
                this.state.uniqueDates = dates;
                this.state.matrixPage = 0;

                this.renderDailyMatrix();
            });

        } catch (error) {
            console.error(error);
            container.innerHTML = '<div class="text-red-500 text-center p-4">데이터 로드 실패</div>';
        }
    },
    
    // (이하 changeMatrixPage, renderDailyMatrix, handleScoreClick, initLearningStatusView 등은 기존 코드 유지)
    // 단, prepareData()가 강력해져서 모든 기능이 정상 작동할 것입니다.
    
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
        const container = this.elements.dailyTestResultTable;

        // 데이터가 없어도 학생 목록은 보여줘야 함 (입력을 위해)
        // 단, 날짜가 하나도 없으면 헤더만 그림
        
        const totalPages = Math.ceil(uniqueDates.length / itemsPerPage) || 1;
        const startIdx = matrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleDates = uniqueDates.slice(startIdx, endIdx);

        let html = `
            <div class="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <button id="teacher-daily-prev-btn" class="text-sm font-bold text-slate-600 px-3 py-1 bg-white border rounded disabled:opacity-50" ${matrixPage === 0 ? 'disabled' : ''}>◀ 이전</button>
                <span class="text-xs text-slate-500 font-mono">${matrixPage + 1} / ${totalPages} 페이지</span>
                <button id="teacher-daily-next-btn" class="text-sm font-bold text-slate-600 px-3 py-1 bg-white border rounded disabled:opacity-50" ${matrixPage >= totalPages - 1 ? 'disabled' : ''}>다음 ▶</button>
            </div>
            <div class="overflow-x-auto">
            <table class="w-full text-sm text-center border-collapse whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-700">
                    <tr>
                        <th class="p-3 border bg-slate-200 sticky left-0 z-10">이름</th>
                        <th class="p-3 border text-blue-700">평균</th>
        `;

        visibleDates.forEach(date => {
            html += `<th class="p-3 border font-bold text-slate-600">${date}</th>`;
        });
        
        // 날짜가 없으면 안내 메시지용 빈칸
        if (visibleDates.length === 0) html += `<th class="p-3 border text-slate-400 font-normal">등록된 시험 없음</th>`;

        html += `</tr></thead><tbody>`;

        if (students.length === 0) {
            html += `<tr><td colspan="${visibleDates.length + 2}" class="p-4 text-slate-400">학생이 없습니다.</td></tr>`;
        } else {
            students.forEach(student => {
                const studentRecords = dailyTestRecords.filter(r => r.studentId === student.id);
                const totalScore = studentRecords.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
                const avg = studentRecords.length > 0 ? Math.round(totalScore / studentRecords.length) : '-';

                html += `<tr class="border-b hover:bg-slate-50">
                    <td class="p-3 border font-bold sticky left-0 bg-white">${student.name}</td>
                    <td class="p-3 border font-bold text-blue-600 bg-slate-50">${avg}</td>`;

                visibleDates.forEach(date => {
                    const record = studentRecords.find(r => r.date === date);
                    if (!record) {
                        html += `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 teacher-daily-cell" 
                                    data-student-id="${student.id}" data-date="${date}" data-exists="false">
                                    <span class="text-xs text-red-300">미응시</span>
                                 </td>`;
                    } else {
                        const score = Number(record.score);
                        let cls = score >= 90 ? "bg-blue-50 text-blue-700" : (score < 70 ? "bg-red-50 text-red-600" : "");
                        html += `<td class="p-3 border font-bold ${cls} cursor-pointer hover:bg-opacity-80 teacher-daily-cell" 
                                    data-student-id="${student.id}" data-date="${date}" data-exists="true" 
                                    data-doc-id="${record.id}" data-score="${score}" data-memo="${record.memo || ''}">
                                    ${score}
                                 </td>`;
                    }
                });
                
                if (visibleDates.length === 0) html += `<td class="p-3 border bg-slate-50"></td>`;
                html += `</tr>`;
            });
        }
        html += `</tbody></table></div>`;
        
        container.innerHTML = html;
        
        container.querySelector('#teacher-daily-prev-btn').onclick = () => this.changeMatrixPage(-1);
        container.querySelector('#teacher-daily-next-btn').onclick = () => this.changeMatrixPage(1);
        container.querySelectorAll('.teacher-daily-cell').forEach(cell => {
            cell.onclick = () => this.handleScoreClick(cell);
        });
    },

    async handleScoreClick(cell) {
        const { studentId, date, exists, docId, score, memo } = cell.dataset;
        const student = this.state.students.find(s => s.id === studentId);
        
        const newScoreStr = prompt(`${date} ${student.name} 점수 수정 (0~100)`, exists === "true" ? score : "");
        if (newScoreStr === null) return;

        const newScore = Number(newScoreStr);
        if (isNaN(newScore)) return;

        const newMemo = prompt("메모", exists === "true" ? memo : "");

        try {
            if (exists === "true" && docId) {
                await updateDoc(doc(db, "daily_tests", docId), { score: newScore, memo: newMemo || "", updatedAt: serverTimestamp() });
            } else {
                // 신규 등록 로직 (생략 - 필요 시 기존 코드 참조)
                // 주의: 날짜별 컬럼 클릭이 아니라 '미응시' 칸 클릭이므로, 
                // 새로운 날짜의 시험을 추가하려면 별도의 '시험 추가' 버튼이 필요합니다.
                // 여기서는 기존 날짜에 대한 점수 입력만 처리합니다.
                
                const subjectName = this.elements.dailyTestSubjectSelect.options[this.elements.dailyTestSubjectSelect.selectedIndex].text;
                await addDoc(collection(db, "daily_tests"), {
                    studentId, studentName: student.name,
                    classId: this.app.state.selectedClassId,
                    subjectId: this.state.dailyTestSubjectId,
                    subjectName, date, score: newScore, memo: newMemo || "",
                    createdAt: serverTimestamp()
                });
            }
            showToast("저장됨");
        } catch (e) { showToast("저장 실패", true); }
    },
    
    // Learning Status 뷰 관련
    async initLearningStatusView() {
        const subjectSelect = this.elements.learningSubjectSelect;
        const lessonSelect = this.elements.learningLessonSelect;
        if (!subjectSelect) return;
        
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        lessonSelect.disabled = true;
        this.elements.learningResultTable.innerHTML = '';
        
        if (!await this.prepareData()) return; // 학생 로드

        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            subjectSelect.disabled = false;
        } catch (e) { console.error(e); }
    },

    async handleLearningSubjectChange(subjectId) {
        this.state.learningSubjectId = subjectId;
        const lessonSelect = this.elements.learningLessonSelect;
        lessonSelect.innerHTML = '<option>로딩 중...</option>';
        
        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
            const snapshot = await getDocs(q);
            lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
            snapshot.forEach(doc => lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`);
            lessonSelect.disabled = false;
        } catch (e) { console.error(e); }
    },

    async handleLearningLessonChange(lessonId) {
        // 기존 로직 유지 (prepareData 덕분에 올바른 학생 목록 사용함)
        this.state.learningLessonId = lessonId;
        const container = this.elements.learningResultTable;
        if (!lessonId) { container.innerHTML = ''; return; }
        
        container.innerHTML = '<div class="loader-small mx-auto"></div>';
        
        try {
            const subjectId = this.state.learningSubjectId;
            const students = this.state.students;
            
            const results = await Promise.all(students.map(async (student) => {
                const docRef = doc(db, "subjects", subjectId, "lessons", lessonId, "submissions", student.id);
                const docSnap = await getDoc(docRef);
                return { student, data: docSnap.exists() ? docSnap.data() : null };
            }));
            
            let html = `<table class="w-full text-sm text-left border-collapse">
                <thead class="bg-slate-100 font-bold"><tr><th class="p-3 border">이름</th><th class="p-3 border">상태</th><th class="p-3 border">점수</th></tr></thead><tbody>`;
                
            results.forEach(({ student, data }) => {
                const status = data?.status || '-';
                const score = data?.score !== undefined ? data.score : '-';
                let cls = status.includes('통과') ? 'text-green-600' : '';
                html += `<tr class="border-b"><td class="p-3 border">${student.name}</td><td class="p-3 border ${cls}">${status}</td><td class="p-3 border">${score}</td></tr>`;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        } catch (e) { container.innerHTML = '오류'; }
    }
};