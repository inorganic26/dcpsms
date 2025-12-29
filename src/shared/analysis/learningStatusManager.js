// src/shared/analysis/learningStatusManager.js

import { collection, query, orderBy, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "../firebase.js";

// [중요] 반드시 createLearningStatusManager 이름으로 export 되어야 합니다.
export const createLearningStatusManager = (config) => {
    const { elements } = config;
    
    // 상태 관리
    let state = { subjectId: null, lessonId: null, students: [] };
    
    // 실시간 리스너 해제용 변수
    let unsubscribe = null; 

    // --- UI 헬퍼 함수 ---
    const createRow = (student, data) => {
        const st = data?.status || '-';
        const sc = data?.score !== undefined ? `${data.score}점` : '-';
        let dt = '-';
        
        if(data?.lastAttemptAt) {
            const d = data.lastAttemptAt.toDate();
            dt = `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${d.getMinutes().toString().padStart(2,'0')}`;
        }
        
        // 스타일링 (완료/통과: 초록색, 실패: 빨간색)
        let cls = (st.includes('통과') || st === 'completed') ? 'text-green-600 font-bold' : (st.includes('실패') ? 'text-red-500 font-bold' : '');
        
        return `<tr class="border-b hover:bg-slate-50 transition">
            <td class="p-3 border font-medium text-slate-800">${student.name}</td>
            <td class="p-3 border ${cls}">${st}</td>
            <td class="p-3 border">${sc}</td>
            <td class="p-3 border text-xs text-slate-500">${dt}</td>
        </tr>`;
    };

    // --- 메인 로직 ---
    
    // 1. 과목 목록 로드
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
        } catch(e) { 
            console.error(e); 
            select.innerHTML = '<option>로드 실패</option>'; 
        }
    };

    // 2. 학습 세트(레슨) 목록 로드
    const loadLessonsForLearning = async (subjectId) => {
        const select = elements.learningLessonSelect;
        const table = elements.learningResultTable;
        
        // 화면 초기화 및 기존 리스너 해제
        if(table) table.innerHTML = '';
        if (unsubscribe) { unsubscribe(); unsubscribe = null; }

        if(!select) return;
        state.subjectId = subjectId;
        
        if(!subjectId) { 
            select.innerHTML = '<option value="">-- 과목을 먼저 선택하세요 --</option>'; 
            select.disabled = true; 
            return; 
        }

        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
            const snap = await getDocs(q);
            
            select.innerHTML = '<option value="">-- 학습 세트 선택 --</option>';
            if(snap.empty) select.innerHTML += '<option disabled>학습 없음</option>';
            else snap.forEach(d => select.innerHTML += `<option value="${d.id}">${d.data().title}</option>`);
            select.disabled = false;
        } catch(e) { 
            console.error(e); 
            select.innerHTML = '<option>로드 실패</option>'; 
        }
    };

    // 3. 학습 결과 실시간 로드 (onSnapshot)
    const loadLearningResults = (lessonId, students) => {
        const container = elements.learningResultTable;
        state.lessonId = lessonId; 
        state.students = students;
        
        // 기존 리스너 해제
        if (unsubscribe) {
            unsubscribe();
            unsubscribe = null;
        }

        if(!container) return;
        if(!lessonId) { container.innerHTML = ''; return; }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';

        // 해당 레슨의 모든 제출 기록 감시
        const submissionsRef = collection(db, "subjects", state.subjectId, "lessons", lessonId, "submissions");
        
        unsubscribe = onSnapshot(submissionsRef, (snapshot) => {
            // 빠른 검색을 위해 맵(Map)으로 변환
            const submissionMap = {};
            snapshot.forEach(doc => {
                submissionMap[doc.id] = doc.data();
            });

            // 테이블 HTML 생성
            let html = `<table class="w-full text-sm text-left border-collapse">
                <thead class="bg-slate-100 font-bold text-slate-700">
                    <tr>
                        <th class="p-3 border">이름</th>
                        <th class="p-3 border">상태</th>
                        <th class="p-3 border">퀴즈</th>
                        <th class="p-3 border">최근 시도</th>
                    </tr>
                </thead>
                <tbody>`;
            
            if(students.length === 0) {
                html += `<tr><td colspan="4" class="p-4 text-center text-slate-400">학생이 없습니다.</td></tr>`;
            } else {
                students.forEach(s => {
                    const data = submissionMap[s.id] || null; 
                    html += createRow(s, data);
                });
            }
            
            container.innerHTML = html + `</tbody></table>`;

        }, (error) => {
            console.error("실시간 로딩 에러:", error);
            container.innerHTML = '<p class="text-red-500 text-center p-4">데이터 로딩 중 오류 발생</p>';
        });
    };

    return { loadSubjectsForLearning, loadLessonsForLearning, loadLearningResults };
};