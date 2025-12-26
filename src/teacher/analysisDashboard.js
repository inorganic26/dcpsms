// src/teacher/analysisDashboard.js

import { collection, getDocs, doc, getDoc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const analysisDashboard = {
    elements: {},
    unsubscribeDailyTest: null,

    state: {
        students: [],
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
        
        document.addEventListener('class-changed', () => {
            if (this.unsubscribeDailyTest) {
                this.unsubscribeDailyTest();
                this.unsubscribeDailyTest = null;
            }
            this.initDailyTestView();
            this.initLearningStatusView();
        });
    },

    async prepareData() {
        const classId = this.app.state.selectedClassId;
        if (!classId) return false;
        try {
            const q = query(collection(db, "students"), where("classId", "==", classId));
            const snapshot = await getDocs(q);
            this.state.students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.state.students.sort((a, b) => a.name.localeCompare(b.name));
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

        if (!await this.prepareData()) return;

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

        container.innerHTML = '<div class="loader-small mx-auto"></div><p class="text-center mt-2 text-slate-400">실시간 데이터 연결 중...</p>';

        try {
            const q = query(
                collection(db, "daily_tests"), 
                where("subjectId", "==", subjectId),
                where("classId", "==", currentClassId),
                orderBy("date", "desc")
            );
            
            this.unsubscribeDailyTest = onSnapshot(q, (snapshot) => {
                const allRecords = [];
                snapshot.forEach(doc => {
                    allRecords.push({ id: doc.id, ...doc.data() });
                });

                this.state.dailyTestRecords = allRecords;
                
                const dates = [...new Set(allRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a));
                this.state.uniqueDates = dates;
                this.state.matrixPage = 0;

                if (dates.length === 0) {
                    container.innerHTML = '<p class="text-center text-slate-400 py-10">등록된 테스트 점수가 없습니다.</p>';
                } else {
                    this.renderDailyMatrix();
                }
            }, (error) => {
                console.error("실시간 업데이트 오류:", error);
                if (error.code === 'failed-precondition') {
                     container.innerHTML = `<div class="text-red-500 text-center p-4">DB 색인 생성 필요</div>`;
                } else {
                    container.innerHTML = '<div class="text-red-500 text-center p-4">데이터 로드 실패</div>';
                }
            });

        } catch (error) {
            console.error(error);
            container.innerHTML = '<div class="text-red-500 text-center p-4">초기화 실패</div>';
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
        const container = this.elements.dailyTestResultTable;

        if (uniqueDates.length === 0) return;

        const startIdx = matrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleDates = uniqueDates.slice(startIdx, endIdx);
        const totalPages = Math.ceil(uniqueDates.length / itemsPerPage);

        let html = `
            <div class="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <button id="teacher-daily-prev-btn" class="text-sm font-bold text-slate-600 px-3 py-1 hover:bg-white rounded transition disabled:opacity-30" ${matrixPage === 0 ? 'disabled' : ''}>◀ 이전</button>
                <span class="text-xs text-slate-500 font-mono">${matrixPage + 1} / ${totalPages} 페이지</span>
                <button id="teacher-daily-next-btn" class="text-sm font-bold text-slate-600 px-3 py-1 hover:bg-white rounded transition disabled:opacity-30" ${matrixPage >= totalPages - 1 ? 'disabled' : ''}>다음 ▶</button>
            </div>

            <table class="w-full text-sm text-center border-collapse whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="p-3 border sticky left-0 bg-slate-100 z-20 min-w-[80px]">이름</th>
                        <th class="p-3 border bg-slate-50 min-w-[60px] text-blue-700">평균</th>
        `;

        visibleDates.forEach(date => {
            const parts = date.split('-');
            const label = parts.length === 3 ? `${parts[1]}.${parts[2]}` : date;
            html += `<th class="p-3 border font-bold text-slate-600">${label}</th>`;
        });
        html += `</tr></thead><tbody>`;

        students.forEach(student => {
            const studentRecords = dailyTestRecords.filter(r => r.studentId === student.id);
            const totalScore = studentRecords.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
            const avg = studentRecords.length > 0 ? Math.round(totalScore / studentRecords.length) : '-';

            html += `<tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 border font-bold sticky left-0 bg-white z-10">${student.name}</td>
                <td class="p-3 border font-bold text-blue-600 bg-slate-50">${avg}</td>`;

            visibleDates.forEach(date => {
                const record = studentRecords.find(r => r.date === date);
                // ✨ [수정] 점수 클릭 시 수정을 위한 데이터 속성 추가
                if (!record) {
                    html += `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 teacher-daily-cell" 
                                data-student-id="${student.id}" data-date="${date}" data-exists="false">
                                <span class="text-xs text-red-300 font-bold">미응시</span>
                             </td>`;
                } else {
                    const score = Number(record.score);
                    let bgClass = "";
                    if (score >= 90) bgClass = "bg-blue-50 text-blue-700";
                    else if (score < 70) bgClass = "bg-red-50 text-red-600";
                    
                    const tooltip = record.memo ? `title="메모: ${record.memo}"` : "";
                    html += `<td class="p-3 border font-bold ${bgClass} cursor-pointer hover:bg-opacity-80 teacher-daily-cell" 
                                ${tooltip} data-student-id="${student.id}" data-date="${date}" data-exists="true" 
                                data-doc-id="${record.id}" data-score="${score}" data-memo="${record.memo || ''}">
                                ${score}
                             </td>`;
                }
            });
            html += `</tr>`;
        });

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

        container.querySelector('#teacher-daily-prev-btn').onclick = () => this.changeMatrixPage(-1);
        container.querySelector('#teacher-daily-next-btn').onclick = () => this.changeMatrixPage(1);

        // ✨ [신규] 셀 클릭 이벤트 연결 (점수 수정)
        container.querySelectorAll('.teacher-daily-cell').forEach(cell => {
            cell.onclick = () => this.handleScoreClick(cell);
        });
    },

    // ✨ [신규] 점수 입력/수정 핸들러
    async handleScoreClick(cell) {
        const { studentId, date, exists, docId, score, memo } = cell.dataset;
        const student = this.state.students.find(s => s.id === studentId);
        
        const newScoreStr = prompt(`${date} ${student.name} 학생의 점수를 입력하세요.\n(0~100)`, exists === "true" ? score : "");
        if (newScoreStr === null) return; // 취소

        const newScore = Number(newScoreStr);
        if (isNaN(newScore) || newScore < 0 || newScore > 100) {
            alert("유효한 점수를 입력해주세요.");
            return;
        }

        const newMemo = prompt("메모를 입력하세요 (선택 사항)", exists === "true" ? memo : "");

        try {
            if (exists === "true" && docId) {
                await updateDoc(doc(db, "daily_tests", docId), {
                    score: newScore,
                    memo: newMemo || "",
                    updatedAt: serverTimestamp()
                });
                showToast("수정되었습니다.");
            } else {
                const subjectSelect = this.elements.dailyTestSubjectSelect;
                const subjectName = subjectSelect.options[subjectSelect.selectedIndex].text;

                await addDoc(collection(db, "daily_tests"), {
                    studentId: studentId,
                    studentName: student.name,
                    classId: this.app.state.selectedClassId,
                    subjectId: this.state.dailyTestSubjectId,
                    subjectName: subjectName,
                    date: date,
                    score: newScore,
                    memo: newMemo || "",
                    createdAt: serverTimestamp()
                });
                showToast("입력되었습니다.");
            }
        } catch (e) {
            console.error(e);
            showToast("저장 실패", true);
        }
    },

    async initLearningStatusView() {
        const subjectSelect = this.elements.learningSubjectSelect;
        const lessonSelect = this.elements.learningLessonSelect;
        const resultTable = this.elements.learningResultTable;
        if (!subjectSelect) return;
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        lessonSelect.disabled = true;
        resultTable.innerHTML = '';
        if (!await this.prepareData()) return;
        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            subjectSelect.disabled = false;
        } catch (e) { showToast("과목 로딩 실패"); }
    },

    async handleLearningSubjectChange(subjectId) {
        this.state.learningSubjectId = subjectId;
        const lessonSelect = this.elements.learningLessonSelect;
        lessonSelect.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
            const snapshot = await getDocs(q);
            lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
            snapshot.forEach(doc => lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`);
            lessonSelect.disabled = false;
        } catch (e) { showToast("학습 로딩 실패"); }
    },

    async handleLearningLessonChange(lessonId) {
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
            let html = `
                <table class="w-full text-sm text-left border-collapse">
                    <thead class="bg-slate-100 text-slate-700 font-bold">
                        <tr><th class="p-3 border">이름</th><th class="p-3 border">상태</th><th class="p-3 border">퀴즈 점수</th><th class="p-3 border">최근 시도</th></tr>
                    </thead>
                    <tbody>`;
            results.forEach(({ student, data }) => {
                const status = data?.status || '-';
                const quizScore = data?.score !== undefined ? `${data.score}점` : '-';
                let dateStr = '-';
                if (data?.lastAttemptAt) {
                    const d = data.lastAttemptAt.toDate();
                    dateStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
                }
                let cls = status.includes('통과') ? 'text-green-600 font-bold' : (status.includes('실패') ? 'text-red-500 font-bold' : '');
                html += `<tr class="border-b hover:bg-slate-50"><td class="p-3 border font-medium">${student.name}</td><td class="p-3 border ${cls}">${status}</td><td class="p-3 border">${quizScore}</td><td class="p-3 border text-xs text-slate-500">${dateStr}</td></tr>`;
            });
            html += `</tbody></table>`;
            container.innerHTML = html;
        } catch (e) { container.innerHTML = '<p class="text-red-500">오류 발생</p>'; }
    }
};