// src/admin/adminAnalysisManager.js

import { collection, getDocs, doc, getDoc, query, where, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const adminAnalysisManager = {
    elements: {},
    state: {
        selectedClassId: null,
        selectedSubjectId: null,
        selectedLessonId: null,
        students: [], // 선택된 반의 학생들
    },

    init(app) {
        this.app = app;
        this.elements = app.elements;

        // 이벤트 리스너 연결
        this.elements.analysisClassSelect?.addEventListener('change', (e) => this.handleClassChange(e.target.value));
        this.elements.analysisSubjectSelect?.addEventListener('change', (e) => this.handleSubjectChange(e.target.value));
        this.elements.analysisLessonSelect?.addEventListener('change', (e) => this.handleLessonChange(e.target.value));
    },

    // 1. 화면 초기화 (반 목록 로드)
    async initView() {
        const classSelect = this.elements.analysisClassSelect;
        if (!classSelect) return;

        classSelect.innerHTML = '<option value="">데이터 로딩 중...</option>';
        this.resetSelectors('class');

        try {
            const q = query(collection(db, "classes"), orderBy("name"));
            const snapshot = await getDocs(q);
            
            classSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
            snapshot.forEach(doc => {
                classSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
        } catch (e) {
            console.error(e);
            showToast("반 목록을 불러오지 못했습니다.", true);
        }
    },

    // 2. 반 선택 시 -> 학생 목록 & 과목 목록 로드
    async handleClassChange(classId) {
        this.state.selectedClassId = classId;
        this.resetSelectors('subject');
        if (!classId) return;

        // 2-1. 해당 반 학생 미리 가져오기
        try {
            const q = query(collection(db, "students"), where("classId", "==", classId));
            const snapshot = await getDocs(q);
            this.state.students = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            this.state.students.sort((a, b) => a.name.localeCompare(b.name));
        } catch (e) {
            console.error("학생 로딩 실패", e);
        }

        // 2-2. 과목 목록 로드
        const subjectSelect = this.elements.analysisSubjectSelect;
        subjectSelect.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snapshot = await getDocs(q);
            
            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snapshot.forEach(doc => {
                subjectSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
            subjectSelect.disabled = false;
        } catch (e) {
            showToast("과목 로딩 실패", true);
        }
    },

    // 3. 과목 선택 시 -> 학습 세트(Lesson) 목록 로드
    async handleSubjectChange(subjectId) {
        this.state.selectedSubjectId = subjectId;
        this.resetSelectors('lesson');
        if (!subjectId) return;

        const lessonSelect = this.elements.analysisLessonSelect;
        lessonSelect.innerHTML = '<option value="">로딩 중...</option>';

        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
            const snapshot = await getDocs(q);

            lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
            
            // ✨ 누적 현황 보기 옵션
            lessonSelect.innerHTML += '<option value="ALL_ACCUMULATED">📊 전체 누적 현황 (Total)</option>';
            lessonSelect.innerHTML += '<option disabled>----------------</option>';

            if (snapshot.empty) {
                lessonSelect.innerHTML += '<option disabled>등록된 학습이 없습니다.</option>';
            } else {
                snapshot.forEach(doc => {
                    lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`;
                });
            }
            lessonSelect.disabled = false;
        } catch (e) {
            showToast("학습 목록 로딩 실패", true);
        }
    },

    // 4. 학습 선택 변경
    async handleLessonChange(lessonId) {
        this.state.selectedLessonId = lessonId;
        const resultContainer = this.elements.analysisResultTable;
        if (!resultContainer) return;

        if (!lessonId) { resultContainer.innerHTML = ''; return; }

        resultContainer.innerHTML = '<div class="loader-small mx-auto"></div> <p class="text-center mt-2">데이터 분석 중...</p>';

        try {
            const subjectId = this.state.selectedSubjectId;
            const students = this.state.students;

            if (students.length === 0) {
                resultContainer.innerHTML = '<p class="text-center text-slate-400">학생이 없습니다.</p>';
                return;
            }

            // 분기: 누적 vs 개별
            if (lessonId === 'ALL_ACCUMULATED') {
                await this.renderAccumulatedTable(subjectId, students);
            } else {
                const results = await Promise.all(students.map(async (student) => {
                    const docRef = doc(db, "subjects", subjectId, "lessons", lessonId, "submissions", student.id);
                    const docSnap = await getDoc(docRef); 
                    return { student, data: docSnap.exists() ? docSnap.data() : null };
                }));
                this.renderTable(results);
            }

        } catch (e) {
            console.error(e);
            resultContainer.innerHTML = '<p class="text-center text-red-500">오류가 발생했습니다.</p>';
        }
    },

    // ✨ [신규] 누적 현황 테이블 (날짜 표시 추가됨)
    async renderAccumulatedTable(subjectId, students) {
        const lessonsQ = query(collection(db, `subjects/${subjectId}/lessons`));
        const lessonsSnap = await getDocs(lessonsQ);
        const lessonIds = lessonsSnap.docs.map(d => d.id);

        const stats = await Promise.all(students.map(async (student) => {
            let totalDailyScore = 0;
            let totalQuizScore = 0;
            let lessonCount = 0;
            let latestDate = null; // 가장 최근 날짜 저장용

            for (const lid of lessonIds) {
                const subRef = doc(db, `subjects/${subjectId}/lessons/${lid}/submissions/${student.id}`);
                const subSnap = await getDoc(subRef);
                
                if (subSnap.exists()) {
                    const data = subSnap.data();
                    if (data.dailyTestScore) totalDailyScore += Number(data.dailyTestScore);
                    if (data.score) totalQuizScore += Number(data.score);
                    lessonCount++;

                    // 날짜 비교 (더 최신 날짜로 갱신)
                    if (data.lastAttemptAt) {
                        const d = data.lastAttemptAt.toDate();
                        if (!latestDate || d > latestDate) {
                            latestDate = d;
                        }
                    }
                }
            }

            return {
                student,
                totalDailyScore,
                totalQuizScore,
                lessonCount,
                latestDate
            };
        }));

        const container = this.elements.analysisResultTable;
        let html = `
            <div class="mb-2 text-right text-xs text-slate-500">총 ${lessonIds.length}개 학습 세트 기준</div>
            <table class="w-full text-sm text-left border-collapse">
                <thead class="bg-indigo-50 text-indigo-800 font-bold">
                    <tr>
                        <th class="p-3 border">이름</th>
                        <th class="p-3 border">일일테스트 누적</th>
                        <th class="p-3 border">퀴즈 점수 누적</th>
                        <th class="p-3 border">진행률</th>
                        <th class="p-3 border">최근 학습일</th> </tr>
                </thead>
                <tbody>
        `;

        stats.forEach(stat => {
            const progress = Math.round((stat.lessonCount / lessonIds.length) * 100) || 0;
            
            // 날짜 포맷팅
            let dateStr = '-';
            if (stat.latestDate) {
                const d = stat.latestDate;
                dateStr = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
            }

            html += `
                <tr class="border-b hover:bg-slate-50">
                    <td class="p-3 border font-bold">${stat.student.name}</td>
                    <td class="p-3 border text-blue-600 font-bold">${stat.totalDailyScore}점</td>
                    <td class="p-3 border">${stat.totalQuizScore}점</td>
                    <td class="p-3 border">
                        <div class="flex items-center gap-2">
                            <div class="w-full bg-slate-200 rounded-full h-2 w-20">
                                <div class="bg-blue-500 h-2 rounded-full" style="width: ${progress}%"></div>
                            </div>
                            <span class="text-xs">${progress}%</span>
                        </div>
                    </td>
                    <td class="p-3 border text-xs text-slate-500">${dateStr}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    // 개별 학습 결과 테이블 (날짜 표시됨)
    renderTable(results) {
        const container = this.elements.analysisResultTable;
        let html = `
            <table class="w-full text-sm text-left border-collapse">
                <thead class="bg-slate-100 text-slate-700 font-bold">
                    <tr>
                        <th class="p-3 border">이름</th>
                        <th class="p-3 border">일일테스트</th>
                        <th class="p-3 border">상태</th>
                        <th class="p-3 border">퀴즈 점수</th>
                        <th class="p-3 border">최근 시도</th>
                    </tr>
                </thead>
                <tbody>
        `;

        results.forEach(({ student, data }) => {
            const status = data?.status || '-';
            const quizScore = data?.score !== undefined ? `${data.score} / ${data.totalQuestions || 5}` : '-';
            const dailyScore = data?.dailyTestScore !== undefined ? `<span class="font-bold text-blue-600">${data.dailyTestScore}점</span>` : '-';
            
            let dateStr = '-';
            if (data?.lastAttemptAt) {
                const date = data.lastAttemptAt.toDate();
                dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
            }

            let statusClass = 'text-slate-500';
            if (status.includes('통과')) statusClass = 'text-green-600 font-bold';
            else if (status.includes('실패')) statusClass = 'text-red-500 font-bold';
            else if (status.includes('중')) statusClass = 'text-blue-500';

            html += `
                <tr class="border-b hover:bg-slate-50">
                    <td class="p-3 border font-medium">${student.name}</td>
                    <td class="p-3 border">${dailyScore}</td>
                    <td class="p-3 border ${statusClass}">${status}</td>
                    <td class="p-3 border">${quizScore}</td>
                    <td class="p-3 border text-xs text-slate-500">${dateStr}</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        container.innerHTML = html;
    },

    resetSelectors(level) {
        if (level === 'class') {
            if(this.elements.analysisSubjectSelect) {
                this.elements.analysisSubjectSelect.innerHTML = '<option value="">-- 반을 먼저 선택하세요 --</option>';
                this.elements.analysisSubjectSelect.disabled = true;
            }
            if(this.elements.analysisLessonSelect) {
                this.elements.analysisLessonSelect.innerHTML = '<option value="">-- 반을 먼저 선택하세요 --</option>';
                this.elements.analysisLessonSelect.disabled = true;
            }
            if(this.elements.analysisResultTable) this.elements.analysisResultTable.innerHTML = '';
        } else if (level === 'subject') {
            if(this.elements.analysisLessonSelect) {
                this.elements.analysisLessonSelect.innerHTML = '<option value="">-- 과목을 먼저 선택하세요 --</option>';
                this.elements.analysisLessonSelect.disabled = true;
            }
            if(this.elements.analysisResultTable) this.elements.analysisResultTable.innerHTML = '';
        } else if (level === 'lesson') {
            if(this.elements.analysisResultTable) this.elements.analysisResultTable.innerHTML = '';
        }
    }
};