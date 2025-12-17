// src/teacher/analysisDashboard.js

import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const analysisDashboard = {
    elements: {},
    state: {
        students: [],
        dailyTestSubjectId: null,
        learningSubjectId: null,
        learningLessonId: null,
        
        // 페이지네이션용
        matrixLessons: [],
        matrixData: {},
        matrixPage: 0,
        itemsPerPage: 4,
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

    // ----------------------------------------
    // Daily Test (Matrix + Pagination)
    // ----------------------------------------
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
        
        if (!subjectId) {
            container.innerHTML = '<p class="text-center text-slate-400 py-10">과목을 선택해주세요.</p>';
            return;
        }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';

        // 1. Lesson 로드 (날짜 헤더용)
        const lessonsQ = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
        const lessonsSnap = await getDocs(lessonsQ);
        
        this.state.matrixLessons = lessonsSnap.docs.map((d, index) => {
            const data = d.data();
            let dateLabel = `${index + 1}회`;
            if (data.createdAt) {
                try {
                    const date = data.createdAt.toDate();
                    const mm = String(date.getMonth() + 1).padStart(2, '0');
                    const dd = String(date.getDate()).padStart(2, '0');
                    dateLabel = `${mm}.${dd}`;
                } catch (e) {}
            }
            return { id: d.id, dateLabel, ...data };
        });

        this.state.matrixPage = 0;

        if (this.state.matrixLessons.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-400 py-10">등록된 학습이 없습니다.</p>';
            return;
        }

        // 2. 점수 데이터 로드
        this.state.matrixData = {}; 
        const students = this.state.students;
        
        await Promise.all(students.map(async (student) => {
            this.state.matrixData[student.id] = {};
            for (const lesson of this.state.matrixLessons) {
                 const subRef = doc(db, `subjects/${subjectId}/lessons/${lesson.id}/submissions/${student.id}`);
                 const subSnap = await getDoc(subRef);
                 if (subSnap.exists()) {
                     this.state.matrixData[student.id][lesson.id] = subSnap.data();
                 }
            }
        }));

        this.renderMatrix();
    },

    changeMatrixPage(delta) {
        const newPage = this.state.matrixPage + delta;
        const maxPage = Math.ceil(this.state.matrixLessons.length / this.state.itemsPerPage) - 1;
        
        if (newPage >= 0 && newPage <= maxPage) {
            this.state.matrixPage = newPage;
            this.renderMatrix();
        }
    },

    renderMatrix() {
        const { matrixLessons, matrixPage, itemsPerPage, students, matrixData } = this.state;
        const container = this.elements.dailyTestResultTable;

        const startIdx = matrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleLessons = matrixLessons.slice(startIdx, endIdx);
        const totalPages = Math.ceil(matrixLessons.length / itemsPerPage);

        // 반 평균 계산
        const lessonStats = {}; 
        visibleLessons.forEach(l => lessonStats[l.id] = { total: 0, count: 0 });

        students.forEach(student => {
            const scores = matrixData[student.id];
            visibleLessons.forEach(l => {
                if (scores[l.id]?.dailyTestScore) {
                    lessonStats[l.id].total += Number(scores[l.id].dailyTestScore);
                    lessonStats[l.id].count++;
                }
            });
        });

        // HTML 생성
        let html = `
            <div class="flex justify-between items-center mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <button onclick="document.querySelector('#teacher-prev-btn').click()" class="text-sm font-bold text-slate-600 px-3 py-1 hover:bg-white rounded transition disabled:opacity-30" ${matrixPage === 0 ? 'disabled' : ''}>◀ 이전 4회</button>
                <span class="text-xs text-slate-500 font-mono">${matrixPage + 1} / ${totalPages} 페이지</span>
                <button onclick="document.querySelector('#teacher-next-btn').click()" class="text-sm font-bold text-slate-600 px-3 py-1 hover:bg-white rounded transition disabled:opacity-30" ${matrixPage >= totalPages - 1 ? 'disabled' : ''}>다음 4회 ▶</button>
            </div>
            
            <button id="teacher-prev-btn" style="display:none"></button>
            <button id="teacher-next-btn" style="display:none"></button>

            <table class="w-full text-sm text-center border-collapse whitespace-nowrap">
                <thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th class="p-3 border sticky left-0 bg-slate-100 z-20 min-w-[80px]">이름</th>
                        <th class="p-3 border bg-slate-50 min-w-[60px] text-blue-700">개인평균</th>
        `;

        visibleLessons.forEach(lesson => {
            html += `<th class="p-3 border font-bold text-slate-600">${lesson.dateLabel}</th>`;
        });
        html += `</tr></thead><tbody>`;

        students.forEach(student => {
            const scores = matrixData[student.id];
            let totalDaily = 0, countDaily = 0;
            matrixLessons.forEach(l => {
                if (scores[l.id]?.dailyTestScore) {
                    totalDaily += Number(scores[l.id].dailyTestScore);
                    countDaily++;
                }
            });
            const avg = countDaily > 0 ? Math.round(totalDaily / countDaily) : '-';

            html += `<tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 border font-bold sticky left-0 bg-white z-10">${student.name}</td>
                <td class="p-3 border font-bold text-blue-600 bg-slate-50">${avg}</td>`;

            visibleLessons.forEach(lesson => {
                const data = scores[lesson.id];
                const score = data?.dailyTestScore;
                if (!score && score !== 0) {
                    html += `<td class="p-3 border text-slate-300">-</td>`;
                } else {
                    let bgClass = "";
                    if (score >= 90) bgClass = "bg-blue-50 text-blue-700";
                    else if (score < 70) bgClass = "bg-red-50 text-red-600";
                    html += `<td class="p-3 border font-bold ${bgClass}">${score}</td>`;
                }
            });
            html += `</tr>`;
        });

        html += `<tr class="bg-slate-100 font-bold border-t-2 border-slate-300">
            <td class="p-3 border sticky left-0 bg-slate-100 z-10">반 평균</td>
            <td class="p-3 border text-slate-400">-</td>`;

        visibleLessons.forEach(lesson => {
            const stats = lessonStats[lesson.id];
            const classAvg = stats.count > 0 ? Math.round(stats.total / stats.count) : '-';
            html += `<td class="p-3 border text-indigo-700">${classAvg}</td>`;
        });

        html += `</tr></tbody></table>`;
        container.innerHTML = html;

        // 이벤트 재연결
        container.querySelector('#teacher-prev-btn').onclick = () => this.changeMatrixPage(-1);
        container.querySelector('#teacher-next-btn').onclick = () => this.changeMatrixPage(1);
    },

    // ----------------------------------------
    // Learning Status (기존 유지)
    // ----------------------------------------
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