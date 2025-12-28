// src/teacher/analysisDashboard.js

import { collection, getDocs, doc, getDoc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { getWeeklyTestTargetDate, getWeekLabel, formatDateString } from "../shared/dateUtils.js";

export const analysisDashboard = {
    elements: {},
    unsubscribeDailyTest: null,
    unsubscribeWeeklyTest: null,

    state: {
        students: [],
        dailyTestSubjectId: null, dailyTestRecords: [], uniqueDates: [], matrixPage: 0, itemsPerPage: 5,
        weeklyTestRecords: [], uniqueWeeks: [], weeklyMatrixPage: 0,
        learningSubjectId: null, learningLessonId: null,
    },

    init(app) {
        this.app = app;
        this.elements = {
            dailyTestSubjectSelect: document.getElementById('teacher-daily-test-subject-select'),
            dailyTestResultTable: document.getElementById('teacher-daily-test-result-table'),
            
            weeklyResultTable: document.getElementById('teacher-weekly-test-result-table'),
            weeklyPagination: document.getElementById('teacher-weekly-test-pagination'),
            weeklyPrevBtn: document.getElementById('teacher-weekly-test-prev-btn'),
            weeklyNextBtn: document.getElementById('teacher-weekly-test-next-btn'),
            weeklyPageInfo: document.getElementById('teacher-weekly-test-page-info'),
            
            addWeeklyTestBtn: document.getElementById('teacher-add-weekly-test-btn'),
            weeklyModal: document.getElementById('teacher-weekly-test-modal'),
            weeklyModalStudent: document.getElementById('teacher-weekly-modal-student'),
            weeklyModalDate: document.getElementById('teacher-weekly-modal-date'),
            weeklyModalScore: document.getElementById('teacher-weekly-modal-score'),
            weeklyModalSaveBtn: document.getElementById('teacher-weekly-modal-save-btn'),
            weeklyModalCloseBtn: document.getElementById('teacher-weekly-modal-close-btn'),

            learningSubjectSelect: document.getElementById('teacher-learning-subject-select'),
            learningLessonSelect: document.getElementById('teacher-learning-lesson-select'),
            learningResultTable: document.getElementById('teacher-learning-result-table'),
        };

        this.elements.dailyTestSubjectSelect?.addEventListener('change', (e) => this.handleDailyTestSubjectChange(e.target.value));
        this.elements.weeklyPrevBtn?.addEventListener('click', () => this.changeMatrixPage(-1, 'weekly'));
        this.elements.weeklyNextBtn?.addEventListener('click', () => this.changeMatrixPage(1, 'weekly'));
        
        this.elements.addWeeklyTestBtn?.addEventListener('click', () => this.openAddWeeklyTestModal());
        this.elements.weeklyModalSaveBtn?.addEventListener('click', () => this.saveWeeklyTestFromModal());
        this.elements.weeklyModalCloseBtn?.addEventListener('click', () => {
            if(this.elements.weeklyModal) this.elements.weeklyModal.style.display = 'none';
        });

        this.elements.learningSubjectSelect?.addEventListener('change', (e) => this.handleLearningSubjectChange(e.target.value));
        this.elements.learningLessonSelect?.addEventListener('change', (e) => this.handleLearningLessonChange(e.target.value));
        
        document.addEventListener('class-changed', () => this.reset());
    },

    reset() {
        if (this.unsubscribeDailyTest) { this.unsubscribeDailyTest(); this.unsubscribeDailyTest = null; }
        if (this.unsubscribeWeeklyTest) { this.unsubscribeWeeklyTest(); this.unsubscribeWeeklyTest = null; }
        this.state.students = []; this.state.dailyTestRecords = []; this.state.weeklyTestRecords = [];
        if(this.elements.dailyTestResultTable) this.elements.dailyTestResultTable.innerHTML = '';
        if(this.elements.weeklyResultTable) this.elements.weeklyResultTable.innerHTML = '';
        if(this.elements.learningResultTable) this.elements.learningResultTable.innerHTML = '';
        if(this.elements.dailyTestSubjectSelect) this.elements.dailyTestSubjectSelect.value = '';
    },

    async prepareData() {
        const classId = this.app.state.selectedClassId;
        if (!classId) return false;
        try {
            const q1 = query(collection(db, "students"), where("classId", "==", classId));
            const q2 = query(collection(db, "students"), where("classIds", "array-contains", classId));
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            const map = new Map();
            snap1.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
            snap2.forEach(d => map.set(d.id, { id: d.id, ...d.data() }));
            this.state.students = Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
            return true;
        } catch (e) { console.error("학생 로딩 실패", e); return false; }
    },

    // --- 일일테스트 ---
    async initDailyTestView() {
        const subjectSelect = this.elements.dailyTestSubjectSelect;
        if (!subjectSelect) return;
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        this.elements.dailyTestResultTable.innerHTML = '';
        subjectSelect.disabled = true;
        if (!await this.prepareData()) { subjectSelect.innerHTML = '<option value="">학생 로드 실패</option>'; return; }
        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            subjectSelect.disabled = false;
        } catch (e) { showToast("과목 로딩 실패"); }
    },
    async handleDailyTestSubjectChange(subjectId) {
        this.state.dailyTestSubjectId = subjectId;
        const container = this.elements.dailyTestResultTable;
        const currentClassId = this.app.state.selectedClassId; 
        if (this.unsubscribeDailyTest) { this.unsubscribeDailyTest(); this.unsubscribeDailyTest = null; }
        if (!subjectId) { container.innerHTML = '<p class="text-center text-slate-400 py-10">과목을 선택해주세요.</p>'; return; }
        container.innerHTML = '<div class="loader-small mx-auto"></div>';
        try {
            const q = query(collection(db, "daily_tests"), where("subjectId", "==", subjectId), where("classId", "==", currentClassId), orderBy("date", "desc"));
            this.unsubscribeDailyTest = onSnapshot(q, (snapshot) => {
                const allRecords = [];
                snapshot.forEach(doc => allRecords.push({ id: doc.id, ...doc.data() }));
                this.state.dailyTestRecords = allRecords;
                this.state.uniqueDates = [...new Set(allRecords.map(r => r.date))].sort((a, b) => b.localeCompare(a));
                this.state.matrixPage = 0;
                this.renderDailyMatrix();
            });
        } catch (error) { console.error(error); container.innerHTML = '로드 실패'; }
    },
    renderDailyMatrix() {
        const { uniqueDates, dailyTestRecords, matrixPage, itemsPerPage, students } = this.state;
        const container = this.elements.dailyTestResultTable;
        if (uniqueDates.length === 0) { container.innerHTML = '<p class="text-center text-slate-400 py-10">등록된 테스트 결과가 없습니다.</p>'; return; }
        const totalPages = Math.ceil(uniqueDates.length / itemsPerPage);
        const startIdx = matrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleDates = uniqueDates.slice(startIdx, endIdx);

        let html = `
            <div class="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <button onclick="this.dispatchEvent(new CustomEvent('prev-page'))" id="teacher-daily-prev-btn-inner" class="text-sm font-bold text-slate-600 px-3 py-1 bg-white border rounded disabled:opacity-50" ${matrixPage === 0 ? 'disabled' : ''}>◀ 이전</button>
                <span class="text-xs text-slate-500 font-mono">${matrixPage + 1} / ${totalPages} 페이지</span>
                <button onclick="this.dispatchEvent(new CustomEvent('next-page'))" id="teacher-daily-next-btn-inner" class="text-sm font-bold text-slate-600 px-3 py-1 bg-white border rounded disabled:opacity-50" ${matrixPage >= totalPages - 1 ? 'disabled' : ''}>다음 ▶</button>
            </div>
            <div class="overflow-x-auto">
            <table class="w-full text-sm text-center border-collapse whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-700">
                    <tr>
                        <th class="p-3 border bg-slate-200 sticky left-0 z-10">이름</th>
                        <th class="p-3 border text-blue-700">평균</th>
        `;
        visibleDates.forEach(date => html += `<th class="p-3 border font-bold text-slate-600">${date}</th>`);
        html += `</tr></thead><tbody>`;
        students.forEach(student => {
            const studentRecords = dailyTestRecords.filter(r => r.studentId === student.id);
            const totalScore = studentRecords.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
            const avg = studentRecords.length > 0 ? Math.round(totalScore / studentRecords.length) : '-';
            html += `<tr class="border-b hover:bg-slate-50"><td class="p-3 border font-bold sticky left-0 bg-white">${student.name}</td><td class="p-3 border font-bold text-blue-600 bg-slate-50">${avg}</td>`;
            visibleDates.forEach(date => {
                const record = studentRecords.find(r => r.date === date);
                if (!record) { html += `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 teacher-daily-cell" data-student-id="${student.id}" data-date="${date}" data-exists="false"><span class="text-xs text-red-300">미응시</span></td>`; } 
                else {
                    const score = Number(record.score);
                    let cls = score >= 90 ? "bg-blue-50 text-blue-700" : (score < 70 ? "bg-red-50 text-red-600" : "");
                    html += `<td class="p-3 border font-bold ${cls} cursor-pointer hover:bg-opacity-80 teacher-daily-cell" data-student-id="${student.id}" data-date="${date}" data-exists="true" data-doc-id="${record.id}" data-score="${score}" data-memo="${record.memo || ''}">${score}</td>`;
                }
            });
            html += `</tr>`;
        });
        html += `</tbody></table></div>`;
        container.innerHTML = html;
        container.querySelector('#teacher-daily-prev-btn-inner').onclick = () => this.changeMatrixPage(-1, 'daily');
        container.querySelector('#teacher-daily-next-btn-inner').onclick = () => this.changeMatrixPage(1, 'daily');
        container.querySelectorAll('.teacher-daily-cell').forEach(cell => cell.onclick = () => this.handleScoreClick(cell));
    },
    async handleScoreClick(cell) {
        const { studentId, date, exists, docId, score, memo } = cell.dataset;
        const student = this.state.students.find(s => s.id === studentId);
        const newScoreStr = prompt(`${date} ${student.name} 점수`, exists === "true" ? score : "");
        if (newScoreStr === null) return;
        const newScore = Number(newScoreStr);
        if (isNaN(newScore)) return;
        const newMemo = prompt("메모", exists === "true" ? memo : "");
        try {
            if (exists === "true" && docId) { await updateDoc(doc(db, "daily_tests", docId), { score: newScore, memo: newMemo || "", updatedAt: serverTimestamp() }); } 
            else {
                const subjectName = this.elements.dailyTestSubjectSelect.options[this.elements.dailyTestSubjectSelect.selectedIndex].text;
                await addDoc(collection(db, "daily_tests"), {
                    studentId, studentName: student.name, classId: this.app.state.selectedClassId,
                    subjectId: this.state.dailyTestSubjectId, subjectName, date, score: newScore, memo: newMemo || "", createdAt: serverTimestamp()
                });
            }
            showToast("저장됨");
        } catch (e) { showToast("실패", true); }
    },

    // --- 주간테스트 ---
    async initWeeklyTestView() {
        const container = this.elements.weeklyResultTable;
        if (!container) return;
        container.innerHTML = '<div class="loader-small mx-auto"></div>';
        if (!await this.prepareData()) { container.innerHTML = '<p class="text-center">로드 실패</p>'; return; }
        if (this.unsubscribeWeeklyTest) { this.unsubscribeWeeklyTest(); this.unsubscribeWeeklyTest = null; }
        try {
            const q = query(collection(db, "weekly_tests"), orderBy("targetDate", "desc"));
            this.unsubscribeWeeklyTest = onSnapshot(q, (snapshot) => {
                const allRecords = [];
                const ids = new Set(this.state.students.map(s => s.id));
                snapshot.forEach(doc => { if(ids.has(doc.data().uid)) allRecords.push({ id: doc.id, ...doc.data() }); });
                this.state.weeklyTestRecords = allRecords;
                const weeks = [...new Set(allRecords.map(r => r.weekLabel || r.targetDate))].sort().reverse();
                const thisWeek = getWeekLabel(getWeeklyTestTargetDate(new Date()));
                if (!weeks.includes(thisWeek)) weeks.unshift(thisWeek);
                this.state.uniqueWeeks = weeks;
                this.state.weeklyMatrixPage = 0;
                this.renderWeeklyMatrix();
            });
        } catch (error) { console.error(error); container.innerHTML = '로드 실패'; }
    },
    openAddWeeklyTestModal() {
        if (!this.app.state.selectedClassId) { showToast("반을 먼저 선택해주세요.", true); return; }
        const studentSelect = this.elements.weeklyModalStudent;
        studentSelect.innerHTML = '';
        this.state.students.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id; opt.text = s.name;
            studentSelect.appendChild(opt);
        });
        this.elements.weeklyModalDate.value = formatDateString(new Date());
        this.elements.weeklyModalScore.value = '';
        this.elements.weeklyModal.style.display = 'flex';
    },
    async saveWeeklyTestFromModal() {
        const studentId = this.elements.weeklyModalStudent.value;
        const dateVal = this.elements.weeklyModalDate.value;
        const scoreVal = this.elements.weeklyModalScore.value;
        if (!studentId || !dateVal || scoreVal === '') { alert("모든 항목을 입력해주세요."); return; }
        const student = this.state.students.find(s => s.id === studentId);
        const targetDate = getWeeklyTestTargetDate(dateVal);
        const targetDateStr = formatDateString(targetDate);
        const label = getWeekLabel(targetDate);
        const docId = `${studentId}_${targetDateStr}`;
        try {
            await setDoc(doc(db, "weekly_tests", docId), {
                uid: studentId, userName: student.name, targetDate: targetDateStr, weekLabel: label,
                examDate: dateVal, examTime: '선생님추가', score: Number(scoreVal), status: 'completed', updatedAt: serverTimestamp()
            }, { merge: true });
            showToast("추가됨");
            this.elements.weeklyModal.style.display = 'none';
        } catch (e) { console.error(e); showToast("실패", true); }
    },
    renderWeeklyMatrix() {
        const { uniqueWeeks, weeklyTestRecords, weeklyMatrixPage, itemsPerPage, students } = this.state;
        const container = this.elements.weeklyResultTable;
        const totalPages = Math.ceil(uniqueWeeks.length / itemsPerPage) || 1;
        const startIdx = weeklyMatrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleWeeks = uniqueWeeks.slice(startIdx, endIdx);

        if(this.elements.weeklyPagination) {
            this.elements.weeklyPagination.classList.remove('hidden');
            this.elements.weeklyPageInfo.textContent = `${weeklyMatrixPage+1}/${totalPages}`;
        }

        // [추가] 반평균 계산
        const classAverages = visibleWeeks.map(label => {
            const scores = students.map(s => {
                const record = weeklyTestRecords.find(r => r.uid === s.id && (r.weekLabel === label || r.targetDate === label));
                return record && record.score !== null ? Number(record.score) : null;
            }).filter(score => score !== null);

            if (scores.length === 0) return '-';
            const sum = scores.reduce((a, b) => a + b, 0);
            return Math.round(sum / scores.length);
        });

        let html = `<table class="w-full text-sm text-center border-collapse whitespace-nowrap"><thead class="bg-indigo-50 sticky top-0 z-10"><tr><th class="p-3 border sticky left-0 bg-indigo-50">이름</th>`;
        visibleWeeks.forEach(l => html+=`<th class="p-3 border font-bold">${l}</th>`);
        html+=`</tr></thead><tbody>`;

        // [추가] 반평균 행 표시
        if (students.length > 0) {
            html += `<tr class="bg-indigo-100 font-bold border-b border-indigo-200">
                <td class="p-3 border sticky left-0 bg-indigo-100 z-10 text-indigo-900">반평균</td>`;
            classAverages.forEach(avg => {
                html += `<td class="p-3 border text-indigo-800">${avg}</td>`;
            });
            html += `</tr>`;
        }

        students.forEach(s => {
            html+=`<tr class="border-b hover:bg-slate-50"><td class="p-3 border font-bold sticky left-0 bg-white">${s.name}</td>`;
            visibleWeeks.forEach(l => {
                const r = weeklyTestRecords.find(x => x.uid===s.id && (x.weekLabel===l || x.targetDate===l));
                if(!r) html+=`<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 cell" data-sid="${s.id}" data-lbl="${l}" data-ex="false">미응시</td>`;
                else {
                    let score = r.score;
                    let bg = score===null ? 'bg-yellow-50 text-yellow-600' : (score>=90?'bg-blue-50 text-blue-700':(score<70?'bg-red-50 text-red-600':''));
                    html+=`<td class="p-3 border font-bold ${bg} cursor-pointer hover:opacity-80 cell" data-sid="${s.id}" data-lbl="${l}" data-ex="true" data-doc="${r.id}" data-scr="${score||''}">${score===null?'예약':score}</td>`;
                }
            });
            html+=`</tr>`;
        });
        html+=`</tbody></table>`;
        container.innerHTML = html;
        container.querySelectorAll('.cell').forEach(c => c.onclick = () => this.handleWeeklyScoreClick(c));
    },
    async handleWeeklyScoreClick(cell) {
        const { sid, lbl, ex, doc:docId, scr } = cell.dataset;
        const s = this.state.students.find(x=>x.id===sid);
        const val = prompt(`${lbl} ${s.name} 점수`, ex==='true'?scr:'');
        if(val===null) return;
        const score = Number(val);
        if(isNaN(score)) return;
        try {
            if(ex==='true' && docId) await updateDoc(doc(db,"weekly_tests",docId), {score, status:'completed', updatedAt: serverTimestamp()});
            else {
                const target = getWeeklyTestTargetDate(new Date());
                const tStr = formatDateString(target);
                const id = `${sid}_${tStr}`;
                await setDoc(doc(db,"weekly_tests",id), {uid:sid, userName:s.name, targetDate:tStr, weekLabel:lbl, examDate:formatDateString(new Date()), examTime:'선생님', score, status:'completed', updatedAt:new Date()}, {merge:true});
            }
            showToast("저장됨");
        } catch(e){ showToast("실패", true); }
    },

    changeMatrixPage(delta, type) {
        if (type === 'weekly') {
            const { uniqueWeeks, itemsPerPage, weeklyMatrixPage } = this.state;
            const maxPage = Math.ceil(uniqueWeeks.length / itemsPerPage) - 1;
            const newPage = weeklyMatrixPage + delta;
            if (newPage >= 0 && newPage <= maxPage) {
                this.state.weeklyMatrixPage = newPage;
                this.renderWeeklyMatrix();
            }
        } else {
            const { uniqueDates, itemsPerPage, matrixPage } = this.state;
            const maxPage = Math.ceil(uniqueDates.length / itemsPerPage) - 1;
            const newPage = matrixPage + delta;
            if (newPage >= 0 && newPage <= maxPage) {
                this.state.matrixPage = newPage;
                this.renderDailyMatrix();
            }
        }
    },

    async initLearningStatusView() { this.loadClassesToSelect(this.elements.learningClassSelect); this.resetLearningSelectors('class'); },
    async handleLearningSubjectChange(subjectId) {
        this.state.learningSubjectId = subjectId;
        this.resetLearningSelectors('lesson');
        if (!subjectId) return;
        const lessonSelect = this.elements.learningLessonSelect;
        lessonSelect.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
            const snapshot = await getDocs(q);
            lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
            snapshot.forEach(doc => lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`);
            lessonSelect.disabled = false;
        } catch (e) { console.error(e); }
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
            let html = `<table class="w-full text-sm text-left border-collapse"><thead class="bg-slate-100 font-bold"><tr><th class="p-3 border">이름</th><th class="p-3 border">상태</th><th class="p-3 border">점수</th></tr></thead><tbody>`;
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