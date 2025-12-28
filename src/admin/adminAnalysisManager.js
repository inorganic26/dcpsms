// src/admin/adminAnalysisManager.js

import { collection, getDocs, doc, getDoc, query, where, orderBy, onSnapshot, addDoc, updateDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { getWeeklyTestTargetDate, getWeekLabel, formatDateString } from "../shared/dateUtils.js";

export const adminAnalysisManager = {
    elements: {},
    unsubscribeDailyTest: null,
    unsubscribeWeeklyTest: null,

    state: {
        students: [],
        studentMap: new Map(), 
        // 일일테스트
        selectedDailyClassId: null, selectedDailySubjectId: null,
        dailyTestRecords: [], uniqueDates: [], matrixPage: 0, itemsPerPage: 5,
        // 주간테스트
        selectedWeeklyClassId: null, weeklyTestRecords: [], uniqueWeeks: [], weeklyMatrixPage: 0,
        // 학습현황
        selectedLearningClassId: null, selectedLearningSubjectId: null, selectedLearningLessonId: null,
    },

    init(app) {
        this.app = app;
        this.elements = {
            dailyClassSelect: document.getElementById('admin-daily-test-class-select'),
            dailySubjectSelect: document.getElementById('admin-daily-test-subject-select'),
            dailyResultTable: document.getElementById('admin-daily-test-result-table'),
            dailyPagination: document.getElementById('admin-daily-test-pagination'),
            dailyPrevBtn: document.getElementById('admin-daily-test-prev-btn'),
            dailyNextBtn: document.getElementById('admin-daily-test-next-btn'),
            dailyPageInfo: document.getElementById('admin-daily-test-page-info'),
            
            weeklyClassSelect: document.getElementById('admin-weekly-test-class-select'),
            weeklyResultTable: document.getElementById('admin-weekly-test-result-table'),
            weeklyPagination: document.getElementById('admin-weekly-test-pagination'),
            weeklyPrevBtn: document.getElementById('admin-weekly-test-prev-btn'),
            weeklyNextBtn: document.getElementById('admin-weekly-test-next-btn'),
            weeklyPageInfo: document.getElementById('admin-weekly-test-page-info'),
            
            addWeeklyTestBtn: document.getElementById('admin-add-weekly-test-btn'),
            weeklyModal: document.getElementById('admin-weekly-test-modal'),
            weeklyModalStudent: document.getElementById('admin-weekly-modal-student'),
            weeklyModalDate: document.getElementById('admin-weekly-modal-date'),
            weeklyModalScore: document.getElementById('admin-weekly-modal-score'),
            weeklyModalSaveBtn: document.getElementById('admin-weekly-modal-save-btn'),
            weeklyModalCloseBtn: document.getElementById('admin-weekly-modal-close-btn'),

            learningClassSelect: document.getElementById('admin-learning-class-select'),
            learningSubjectSelect: document.getElementById('admin-learning-subject-select'),
            learningLessonSelect: document.getElementById('admin-learning-lesson-select'),
            learningResultTable: document.getElementById('admin-learning-result-table'),
        };

        this.elements.dailyClassSelect?.addEventListener('change', (e) => this.handleDailyClassChange(e.target.value));
        this.elements.dailySubjectSelect?.addEventListener('change', (e) => this.handleDailySubjectChange(e.target.value));
        this.elements.dailyPrevBtn?.addEventListener('click', () => this.changeMatrixPage(-1, 'daily'));
        this.elements.dailyNextBtn?.addEventListener('click', () => this.changeMatrixPage(1, 'daily'));

        this.elements.weeklyClassSelect?.addEventListener('change', (e) => this.handleWeeklyClassChange(e.target.value));
        this.elements.weeklyPrevBtn?.addEventListener('click', () => this.changeMatrixPage(-1, 'weekly'));
        this.elements.weeklyNextBtn?.addEventListener('click', () => this.changeMatrixPage(1, 'weekly'));
        
        this.elements.addWeeklyTestBtn?.addEventListener('click', () => this.openAddWeeklyTestModal());
        this.elements.weeklyModalSaveBtn?.addEventListener('click', () => this.saveWeeklyTestFromModal());
        this.elements.weeklyModalCloseBtn?.addEventListener('click', () => {
            if(this.elements.weeklyModal) this.elements.weeklyModal.style.display = 'none';
        });

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
            this.state.studentMap.clear();
            this.state.students.forEach(s => this.state.studentMap.set(s.id, s.name));
        } catch (e) { console.error("학생 로딩 실패", e); }
    },

    // --- 일일테스트 ---
    initDailyTestView() { this.loadClassesToSelect(this.elements.dailyClassSelect); this.resetDailySelectors('class'); },
    async handleDailyClassChange(classId) {
        this.state.selectedDailyClassId = classId;
        this.resetDailySelectors('subject');
        if (this.unsubscribeDailyTest) { this.unsubscribeDailyTest(); this.unsubscribeDailyTest = null; }
        if (!classId) return;
        await this.loadStudents(classId);
        const subjectSelect = this.elements.dailySubjectSelect;
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            subjectSelect.disabled = false;
        } catch (e) { showToast("과목 로딩 실패"); }
    },
    async handleDailySubjectChange(subjectId) {
        this.state.selectedDailySubjectId = subjectId;
        const container = this.elements.dailyResultTable;
        this.elements.dailyPagination?.classList.add('hidden');
        if (this.unsubscribeDailyTest) { this.unsubscribeDailyTest(); this.unsubscribeDailyTest = null; }
        if (!subjectId) { container.innerHTML = ''; return; }
        container.innerHTML = '<div class="loader-small mx-auto"></div>';
        try {
            const q = query(collection(db, "daily_tests"), where("subjectId", "==", subjectId), where("classId", "==", this.state.selectedDailyClassId), orderBy("date", "desc"));
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

    // --- 주간테스트 ---
    initWeeklyTestView() {
        this.loadClassesToSelect(this.elements.weeklyClassSelect);
        if(this.elements.weeklyResultTable) this.elements.weeklyResultTable.innerHTML = '';
        this.elements.weeklyPagination?.classList.add('hidden');
    },
    openAddWeeklyTestModal() {
        if (!this.state.selectedWeeklyClassId) { showToast("반을 먼저 선택해주세요.", true); return; }
        const studentSelect = this.elements.weeklyModalStudent;
        studentSelect.innerHTML = '';
        if (this.state.students.length === 0) {
            studentSelect.innerHTML = '<option disabled>학생이 없습니다</option>';
        } else {
            this.state.students.forEach(s => {
                const opt = document.createElement('option');
                opt.value = s.id; opt.text = s.name;
                studentSelect.appendChild(opt);
            });
        }
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
                examDate: dateVal, examTime: '관리자추가', score: Number(scoreVal), status: 'completed', updatedAt: serverTimestamp()
            }, { merge: true });
            showToast("추가되었습니다.");
            this.elements.weeklyModal.style.display = 'none';
        } catch (e) { console.error(e); showToast("저장 실패", true); }
    },
    async handleWeeklyClassChange(classId) {
        this.state.selectedWeeklyClassId = classId;
        const container = this.elements.weeklyResultTable;
        this.elements.weeklyPagination?.classList.add('hidden');
        if (this.unsubscribeWeeklyTest) { this.unsubscribeWeeklyTest(); this.unsubscribeWeeklyTest = null; }
        if (!classId) { container.innerHTML = ''; return; }
        await this.loadStudents(classId);
        container.innerHTML = '<div class="loader-small mx-auto"></div>';
        try {
            const q = query(collection(db, "weekly_tests"), orderBy("targetDate", "desc"));
            this.unsubscribeWeeklyTest = onSnapshot(q, (snapshot) => {
                const allRecords = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (this.state.studentMap.has(data.uid)) allRecords.push({ id: doc.id, ...data });
                });
                this.state.weeklyTestRecords = allRecords;
                const weeks = [...new Set(allRecords.map(r => r.weekLabel || r.targetDate))].sort().reverse();
                const thisWeekLabel = getWeekLabel(getWeeklyTestTargetDate(new Date()));
                if (!weeks.includes(thisWeekLabel)) weeks.unshift(thisWeekLabel);
                this.state.uniqueWeeks = weeks;
                this.state.weeklyMatrixPage = 0;
                this.renderWeeklyMatrix();
            });
        } catch (error) { console.error(error); container.innerHTML = '로드 실패'; }
    },

    renderWeeklyMatrix() {
        const { uniqueWeeks, weeklyTestRecords, weeklyMatrixPage, itemsPerPage, students } = this.state;
        const container = this.elements.weeklyResultTable;
        const pagination = this.elements.weeklyPagination;
        const prevBtn = this.elements.weeklyPrevBtn;
        const nextBtn = this.elements.weeklyNextBtn;
        const pageInfo = this.elements.weeklyPageInfo;

        if (!container) return;

        const totalPages = Math.ceil(uniqueWeeks.length / itemsPerPage) || 1;
        const startIdx = weeklyMatrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleWeeks = uniqueWeeks.slice(startIdx, endIdx);

        if (pagination) {
            pagination.classList.remove('hidden');
            if(prevBtn) prevBtn.disabled = weeklyMatrixPage === 0;
            if(nextBtn) nextBtn.disabled = weeklyMatrixPage >= totalPages - 1;
            if(pageInfo) pageInfo.textContent = `${weeklyMatrixPage + 1} / ${totalPages} 페이지`;
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

        let html = `
            <table class="w-full text-sm text-center border-collapse whitespace-nowrap">
                <thead class="bg-indigo-50 text-indigo-900 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="p-3 border sticky left-0 bg-indigo-50 z-20 min-w-[80px]">이름</th>
        `;
        visibleWeeks.forEach(label => {
            html += `<th class="p-3 border font-bold">${label}</th>`;
        });
        html += `</tr></thead><tbody>`;

        // [추가] 반평균 행 표시
        if (students.length > 0) {
            html += `<tr class="bg-indigo-100 font-bold border-b border-indigo-200">
                <td class="p-3 border sticky left-0 bg-indigo-100 z-10 text-indigo-900">반평균</td>`;
            classAverages.forEach(avg => {
                html += `<td class="p-3 border text-indigo-800">${avg}</td>`;
            });
            html += `</tr>`;
        }

        if (students.length === 0) {
            html += `<tr><td colspan="${visibleWeeks.length + 1}" class="p-4 text-slate-400">학생이 없습니다.</td></tr>`;
        } else {
            students.forEach(student => {
                html += `<tr class="border-b hover:bg-slate-50 transition">
                    <td class="p-3 border font-bold sticky left-0 bg-white z-10">${student.name}</td>`;

                visibleWeeks.forEach(label => {
                    const record = weeklyTestRecords.find(r => r.uid === student.id && (r.weekLabel === label || r.targetDate === label));
                    
                    if (!record) {
                        html += `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 admin-weekly-cell" 
                                    data-student-id="${student.id}" data-label="${label}" data-exists="false">
                                    <span class="text-xs text-red-300">미응시</span>
                                 </td>`;
                    } else {
                        const score = record.score;
                        const scoreDisplay = score !== null ? score : '예약';
                        let bgClass = "";
                        if (score >= 90) bgClass = "bg-blue-50 text-blue-700";
                        else if (score < 70 && score !== null) bgClass = "bg-red-50 text-red-600";
                        else if (score === null) bgClass = "bg-yellow-50 text-yellow-600";

                        html += `<td class="p-3 border font-bold ${bgClass} cursor-pointer hover:bg-opacity-80 admin-weekly-cell" 
                                    data-student-id="${student.id}" data-label="${label}" data-exists="true" 
                                    data-doc-id="${record.id}" data-score="${score || ''}">
                                    ${scoreDisplay}
                                 </td>`;
                    }
                });
                html += `</tr>`;
            });
        }
        html += `</tbody></table>`;
        container.innerHTML = html;

        container.querySelectorAll('.admin-weekly-cell').forEach(cell => {
            cell.onclick = () => this.handleWeeklyScoreClick(cell);
        });
    },

    async handleWeeklyScoreClick(cell) {
        const { studentId, label, exists, docId, score } = cell.dataset;
        const student = this.state.students.find(s => s.id === studentId);
        const newScoreStr = prompt(`${label} ${student.name} 점수 수정`, exists === "true" ? score : "");
        if (newScoreStr === null) return; 
        const newScore = Number(newScoreStr);
        if (isNaN(newScore)) return alert("숫자 입력 필요");

        try {
            if (exists === "true" && docId) {
                await updateDoc(doc(db, "weekly_tests", docId), { score: newScore, status: 'completed', updatedAt: serverTimestamp() });
            } else {
                const todayTarget = getWeeklyTestTargetDate(new Date());
                const todayLabel = getWeekLabel(todayTarget);
                if (label !== todayLabel && !confirm(`선택한 주차가 이번 주와 다릅니다. 진행할까요?`)) return;
                const targetDateStr = formatDateString(todayTarget);
                const newDocId = `${studentId}_${targetDateStr}`;
                await setDoc(doc(db, "weekly_tests", newDocId), {
                    uid: studentId, userName: student.name, targetDate: targetDateStr, weekLabel: label,
                    examDate: formatDateString(new Date()), examTime: '관리자입력', score: newScore, status: 'completed', updatedAt: new Date()
                }, { merge: true });
            }
            showToast("저장됨");
        } catch (e) { console.error(e); showToast("실패", true); }
    },

    changeMatrixPage(delta, type) {
        if (type === 'daily') {
            const { uniqueDates, itemsPerPage, matrixPage } = this.state;
            const maxPage = Math.ceil(uniqueDates.length / itemsPerPage) - 1;
            const newPage = matrixPage + delta;
            if (newPage >= 0 && newPage <= maxPage) {
                this.state.matrixPage = newPage;
                this.renderDailyMatrix();
            }
        } else if (type === 'weekly') {
            const { uniqueWeeks, itemsPerPage, weeklyMatrixPage } = this.state;
            const maxPage = Math.ceil(uniqueWeeks.length / itemsPerPage) - 1;
            const newPage = weeklyMatrixPage + delta;
            if (newPage >= 0 && newPage <= maxPage) {
                this.state.weeklyMatrixPage = newPage;
                this.renderWeeklyMatrix();
            }
        }
    },

    renderDailyMatrix() {
        const { uniqueDates, dailyTestRecords, matrixPage, itemsPerPage, students } = this.state;
        const container = this.elements.dailyResultTable;
        const pagination = this.elements.dailyPagination;
        const prevBtn = this.elements.dailyPrevBtn;
        const nextBtn = this.elements.dailyNextBtn;
        const pageInfo = this.elements.dailyPageInfo;

        if (uniqueDates.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-400 py-10">등록된 테스트 결과가 없습니다.</p>'; return;
        }
        const totalPages = Math.ceil(uniqueDates.length / itemsPerPage);
        const startIdx = matrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleDates = uniqueDates.slice(startIdx, endIdx);

        pagination?.classList.remove('hidden');
        if(prevBtn) prevBtn.disabled = matrixPage === 0;
        if(nextBtn) nextBtn.disabled = matrixPage >= totalPages - 1;
        if(pageInfo) pageInfo.textContent = `${matrixPage + 1} / ${totalPages} 페이지`;

        let html = `
            <table class="w-full text-sm text-center border-collapse whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="p-3 border sticky left-0 bg-slate-100 z-20 min-w-[80px]">이름</th>
                        <th class="p-3 border bg-slate-50 min-w-[60px] text-blue-700">개인평균</th>
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
                if (!record) {
                    html += `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 admin-daily-cell" data-student-id="${student.id}" data-date="${date}" data-exists="false"><span class="text-xs text-red-300 font-bold">미응시</span></td>`;
                } else {
                    const score = Number(record.score);
                    let bgClass = score >= 90 ? "bg-blue-50 text-blue-700" : (score < 70 ? "bg-red-50 text-red-600" : "");
                    html += `<td class="p-3 border font-bold ${bgClass} cursor-pointer hover:bg-opacity-80 admin-daily-cell" title="${record.memo||''}" data-student-id="${student.id}" data-date="${date}" data-exists="true" data-doc-id="${record.id}" data-score="${score}" data-memo="${record.memo || ''}">${score}</td>`;
                }
            });
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        container.innerHTML = html;
        container.querySelectorAll('.admin-daily-cell').forEach(cell => cell.onclick = () => this.handleScoreClick(cell));
    },

    async handleScoreClick(cell) {
        const { studentId, date, exists, docId, score, memo } = cell.dataset;
        const student = this.state.students.find(s => s.id === studentId);
        const newScoreStr = prompt(`${date} ${student.name} 점수`, exists === "true" ? score : "");
        if (newScoreStr === null) return; 
        const newScore = Number(newScoreStr);
        if (isNaN(newScore)) return alert("숫자 입력 필요");
        const newMemo = prompt("메모", exists === "true" ? memo : "");

        try {
            if (exists === "true" && docId) {
                await updateDoc(doc(db, "daily_tests", docId), { score: newScore, memo: newMemo || "", updatedAt: serverTimestamp() });
            } else {
                const subjectName = this.elements.dailySubjectSelect.options[this.elements.dailySubjectSelect.selectedIndex].text;
                await addDoc(collection(db, "daily_tests"), {
                    studentId, studentName: student.name, classId: this.state.selectedDailyClassId,
                    subjectId: this.state.selectedDailySubjectId, subjectName, date, score: newScore, memo: newMemo || "", createdAt: serverTimestamp()
                });
            }
            showToast("저장됨");
        } catch (e) { console.error(e); showToast("실패", true); }
    },

    resetDailySelectors(level) {
        if (level === 'class') {
            this.elements.dailySubjectSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
            this.elements.dailySubjectSelect.disabled = true;
            this.elements.dailyResultTable.innerHTML = '';
            this.elements.dailyPagination?.classList.add('hidden');
        } else if (level === 'subject') {
            this.elements.dailyResultTable.innerHTML = '';
            this.elements.dailyPagination?.classList.add('hidden');
        }
    },

    initLearningStatusView() { this.loadClassesToSelect(this.elements.learningClassSelect); this.resetLearningSelectors('class'); },
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
            snapshot.forEach(doc => subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
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
            else snapshot.forEach(doc => lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`);
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
            let html = `<table class="w-full text-sm text-left border-collapse"><thead class="bg-slate-100 font-bold"><tr><th class="p-3 border">이름</th><th class="p-3 border">상태</th><th class="p-3 border">퀴즈</th><th class="p-3 border">최근 시도</th></tr></thead><tbody>`;
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
        } else if (level === 'lesson') this.elements.learningResultTable.innerHTML = '';
    }
};