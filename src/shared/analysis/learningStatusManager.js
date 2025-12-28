// src/shared/analysis/learningStatusManager.js

import { collection, query, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "../firebase.js";

export const createLearningStatusManager = (config) => {
    const { elements } = config;
    let state = { subjectId: null, lessonId: null, students: [] };

    // --- UI 헬퍼 ---
    const createRow = (student, data) => {
        const st = data?.status || '-';
        const sc = data?.score !== undefined ? `${data.score}점` : '-';
        let dt = '-';
        if(data?.lastAttemptAt) {
            const d = data.lastAttemptAt.toDate();
            dt = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
        }
        let cls = (st.includes('통과') || st === 'completed') ? 'text-green-600 font-bold' : (st.includes('실패') ? 'text-red-500 font-bold' : '');
        return `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 border font-medium text-slate-800">${student.name}</td><td class="p-3 border ${cls}">${st}</td><td class="p-3 border">${sc}</td><td class="p-3 border text-xs text-slate-500">${dt}</td></tr>`;
    };

    // --- 메인 로직 ---
    const loadSubjectsForLearning = async () => {
        const select = elements.learningSubjectSelect;
        if(!select) return;
        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, "subjects"), orderBy("name"));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snap.forEach(d => select.innerHTML += `<option value="${d.id}">${d.data().name}</option>`);
            select.disabled = false;
        } catch(e) { console.error(e); select.innerHTML = '<option>로드 실패</option>'; }
    };

    const loadLessonsForLearning = async (subjectId) => {
        const select = elements.learningLessonSelect;
        const table = elements.learningResultTable;
        if(table) table.innerHTML = '';
        if(!select) return;
        state.subjectId = subjectId;
        
        if(!subjectId) { select.innerHTML = '<option value="">-- 과목을 먼저 선택하세요 --</option>'; select.disabled = true; return; }

        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">-- 학습 세트 선택 --</option>';
            if(snap.empty) select.innerHTML += '<option disabled>학습 없음</option>';
            else snap.forEach(d => select.innerHTML += `<option value="${d.id}">${d.data().title}</option>`);
            select.disabled = false;
        } catch(e) { console.error(e); select.innerHTML = '<option>로드 실패</option>'; }
    };

    const loadLearningResults = async (lessonId, students) => {
        const container = elements.learningResultTable;
        state.lessonId = lessonId; state.students = students;
        if(!container) return;
        if(!lessonId) { container.innerHTML = ''; return; }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';
        try {
            const results = await Promise.all(students.map(async (s) => {
                const dRef = doc(db, "subjects", state.subjectId, "lessons", lessonId, "submissions", s.id);
                const snap = await getDoc(dRef);
                return { s, data: snap.exists() ? snap.data() : null };
            }));

            let html = `<table class="w-full text-sm text-left border-collapse"><thead class="bg-slate-100 font-bold text-slate-700"><tr><th class="p-3 border">이름</th><th class="p-3 border">상태</th><th class="p-3 border">퀴즈</th><th class="p-3 border">최근 시도</th></tr></thead><tbody>`;
            if(results.length===0) html += `<tr><td colspan="4" class="p-4 text-center text-slate-400">학생이 없습니다.</td></tr>`;
            results.forEach(({s, data}) => html += createRow(s, data));
            container.innerHTML = html + `</tbody></table>`;
        } catch(e) { console.error(e); container.innerHTML = '<p class="text-red-500">오류</p>'; }
    };

    return { loadSubjectsForLearning, loadLessonsForLearning, loadLearningResults };
};