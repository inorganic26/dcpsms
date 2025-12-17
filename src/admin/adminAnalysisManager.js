// src/admin/adminAnalysisManager.js

import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const adminAnalysisManager = {
    elements: {},
    state: {
        students: [], 
        
        // 일일 테스트
        selectedDailyClassId: null,
        selectedDailySubjectId: null,
        matrixLessons: [],
        matrixPage: 0,
        itemsPerPage: 4,
        matrixData: {}, // 데이터 캐싱

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
        } catch (e) { console.error("학생 로딩 실패", e); }
    },

    // =========================================
    // [View 1] 일일 테스트 (Matrix + Pagination)
    // =========================================
    initDailyTestView() {
        this.loadClassesToSelect(this.elements.dailyClassSelect);
        this.resetDailySelectors('class');
    },

    async handleDailyClassChange(classId) {
        this.state.selectedDailyClassId = classId;
        this.resetDailySelectors('subject');
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

        if (!subjectId) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = '<div class="loader-small mx-auto"></div> <p class="text-center mt-2">데이터 로딩 중...</p>';

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
        const container = this.elements.dailyResultTable;
        const pagination = this.elements.dailyPagination;
        const prevBtn = this.elements.dailyPrevBtn;
        const nextBtn = this.elements.dailyNextBtn;
        const pageInfo = this.elements.dailyPageInfo;

        const startIdx = matrixPage * itemsPerPage;
        const endIdx = startIdx + itemsPerPage;
        const visibleLessons = matrixLessons.slice(startIdx, endIdx);
        const totalPages = Math.ceil(matrixLessons.length / itemsPerPage);

        pagination.classList.remove('hidden');
        prevBtn.disabled = matrixPage === 0;
        nextBtn.disabled = matrixPage >= totalPages - 1;
        pageInfo.textContent = `${matrixPage + 1} / ${totalPages} 페이지`;

        const lessonStats = {}; 
        visibleLessons.forEach(l => lessonStats[l.id] = { total: 0, count: 0 });

        students.forEach(student => {
            const scores = matrixData[student.id];
            visibleLessons.forEach(l => {
                if (scores[l.id]?.dailyTestScore !== undefined && scores[l.id]?.dailyTestScore !== "") {
                    lessonStats[l.id].total += Number(scores[l.id].dailyTestScore);
                    lessonStats[l.id].count++;
                }
            });
        });

        let html = `
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
            
            let totalAll = 0, countAll = 0;
            matrixLessons.forEach(l => {
                if (scores[l.id]?.dailyTestScore) {
                    totalAll += Number(scores[l.id].dailyTestScore);
                    countAll++;
                }
            });
            const avg = countAll > 0 ? Math.round(totalAll / countAll) : '-';

            html += `<tr class="border-b hover:bg-slate-50 transition">
                <td class="p-3 border font-bold sticky left-0 bg-white z-10">${student.name}</td>
                <td class="p-3 border font-bold text-blue-600 bg-slate-50">${avg}</td>`;

            visibleLessons.forEach(lesson => {
                const data = scores[lesson.id];
                if (!data || data.dailyTestScore === undefined || data.dailyTestScore === "") {
                    html += `<td class="p-3 border text-slate-300">-</td>`;
                } else {
                    const score = Number(data.dailyTestScore);
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
    // [View 2] 학습 현황 상세
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