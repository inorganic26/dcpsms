// src/shared/analysis/dailyTestManager.js

import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, deleteDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import { showToast } from "../utils.js";

export const createDailyTestManager = (config) => {
    const { elements, role } = config;
    
    // 상태 관리
    let state = {
        records: [], dates: [], page: 0, unsubscribe: null, 
        classId: null, subjectId: null, students: []
    };
    const ITEMS_PER_PAGE = 5;

    // --- UI 헬퍼 함수 ---
    const createCell = (studentId, date, record) => {
        // 1. 미응시 상태 (점수 없음)
        if (!record) {
            return `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 cell-daily" 
                        data-sid="${studentId}" data-date="${date}" data-ex="false">
                        <span class="text-xs text-red-300 font-bold">-</span>
                    </td>`;
        }
        
        // 2. 응시 완료 상태 (점수 있음)
        const score = Number(record.score);
        let cls = score >= 90 ? "text-blue-700 bg-blue-50 font-bold" : (score < 70 ? "text-red-600 bg-red-50 font-bold" : "font-bold text-slate-700");
        
        // 점수와 삭제 버튼(x)을 함께 렌더링
        return `<td class="p-2 border ${cls} cell-daily relative group hover:bg-slate-50 transition-colors" 
                    title="${record.memo || ''}" data-sid="${studentId}" data-date="${date}" data-ex="true" 
                    data-doc="${record.id}" data-scr="${score}" data-memo="${record.memo || ''}">
                    
                    <div class="flex items-center justify-center gap-1 w-full h-full relative">
                        <span class="cursor-pointer hover:underline flex-1 text-center py-1">${score}</span>
                        
                        <button class="daily-delete-btn w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2" 
                                data-doc="${record.id}" title="삭제">
                            <span class="material-icons-round text-[14px]">close</span>
                        </button>
                    </div>
                </td>`;
    };

    const createRow = (student, visibleDates, records) => {
        const studentRecords = records.filter(r => r.studentId === student.id);
        const totalScore = studentRecords.reduce((sum, r) => sum + (Number(r.score) || 0), 0);
        const avg = studentRecords.length > 0 ? Math.round(totalScore / studentRecords.length) : '-';
        
        let html = `<tr class="border-b hover:bg-slate-50 transition">
            <td class="p-3 border font-bold sticky left-0 bg-white z-10 text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">${student.name}</td>
            <td class="p-3 border font-bold text-blue-600 bg-slate-50">${avg}</td>`;
        visibleDates.forEach(date => {
            html += createCell(student.id, date, studentRecords.find(r => r.date === date));
        });
        return html + `</tr>`;
    };

    // --- 메인 로직 ---
    const loadDailyTests = (classId, subjectId, students) => {
        const container = elements.dailyTestResultTable;
        state = { ...state, classId, subjectId, students, page: 0 }; 

        if (state.unsubscribe) { state.unsubscribe(); state.unsubscribe = null; }

        if (!classId || !subjectId) {
            if(container) container.innerHTML = '<p class="text-center text-slate-400 py-10">과목을 선택해주세요.</p>';
            elements.dailyTestPagination?.classList.add('hidden');
            return;
        }
        if(container) container.innerHTML = '<div class="loader-small mx-auto"></div>';

        const q = query(collection(db, "daily_tests"), where("subjectId", "==", subjectId), where("classId", "==", classId), orderBy("date", "desc"));
        state.unsubscribe = onSnapshot(q, (snap) => {
            const records = []; snap.forEach(d => records.push({ id: d.id, ...d.data() }));
            state.records = records;
            state.dates = [...new Set(records.map(r => r.date))].sort((a, b) => b.localeCompare(a));
            render();
        });
    };

    const render = () => {
        const { records, dates, page, students } = state;
        const container = elements.dailyTestResultTable;
        if (!container) return;
        if (dates.length === 0) { 
            container.innerHTML = '<p class="text-center text-slate-400 py-10">결과 없음</p>'; 
            elements.dailyTestPagination?.classList.add('hidden'); 
            return; 
        }

        const total = Math.ceil(dates.length / ITEMS_PER_PAGE);
        const start = page * ITEMS_PER_PAGE;
        const visibleDates = dates.slice(start, start + ITEMS_PER_PAGE);

        if(elements.dailyTestPagination) {
            elements.dailyTestPagination.classList.remove('hidden');
            if(elements.dailyTestPrevBtn) elements.dailyTestPrevBtn.disabled = page === 0;
            if(elements.dailyTestNextBtn) elements.dailyTestNextBtn.disabled = page >= total - 1;
            if(elements.dailyTestPageInfo) elements.dailyTestPageInfo.textContent = `${page + 1} / ${total}`;
        }

        let html = `<table class="w-full text-sm text-center border-collapse whitespace-nowrap"><thead class="bg-slate-100 text-slate-700 sticky top-0 z-10 shadow-sm"><tr><th class="p-3 border sticky left-0 bg-slate-100 z-20 min-w-[80px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">이름</th><th class="p-3 border bg-slate-50 min-w-[60px] text-blue-700">평균</th>`;
        visibleDates.forEach(d => html += `<th class="p-3 border font-bold text-slate-600">${d.split('-').slice(1).join('.')}</th>`);
        html += `</tr></thead><tbody>`;

        students.forEach(s => html += createRow(s, visibleDates, records));
        
        container.innerHTML = html + `</tbody></table>`;
        
        // --- 이벤트 연결 ---

        // 1. 셀 클릭 (점수 수정/입력)
        container.querySelectorAll('.cell-daily').forEach(c => {
            c.onclick = (e) => {
                // 삭제 버튼을 눌렀다면 수정 팝업 띄우지 않음
                if (e.target.closest('.daily-delete-btn')) return;
                handleScoreClick(c);
            };
        });

        // 2. 삭제 버튼 클릭 (삭제 실행)
        container.querySelectorAll('.daily-delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation(); // 부모(수정) 이벤트 전파 중단
                handleDelete(btn.dataset.doc);
            };
        });
    };

    // [삭제] 기능
    const handleDelete = async (docId) => {
        if (!docId) return;
        if (!confirm("정말 이 점수 기록을 삭제하시겠습니까?")) return;
        
        try {
            await deleteDoc(doc(db, "daily_tests", docId));
            showToast("기록 삭제됨");
        } catch (e) {
            console.error(e);
            showToast("삭제 실패", true);
        }
    };

    // [수정] 점수 수정 함수
    const handleScoreClick = async (cell) => {
        const { sid, date, ex, doc:did, scr, memo } = cell.dataset;
        const s = state.students.find(x => x.id === sid);
        
        const val = prompt(`${date} ${s.name} 점수`, ex==='true'?scr:'');
        if(val===null) return;
        
        const score = Number(val);
        if(isNaN(score)) return alert("숫자만 입력 가능합니다.");

        const mem = prompt("메모", ex==='true'?memo:'');
        
        try {
            if(ex==='true' && did) {
                // 수정
                await updateDoc(doc(db,"daily_tests",did), {
                    score, 
                    memo: mem || "", 
                    updatedAt: serverTimestamp()
                });
            } else {
                // 신규 등록
                const subName = elements.dailyTestSubjectSelect?.options[elements.dailyTestSubjectSelect.selectedIndex].text || "과목";
                await addDoc(collection(db,"daily_tests"), { 
                    studentId: sid, 
                    studentName: s.name, 
                    classId: state.classId, 
                    subjectId: state.subjectId, 
                    subjectName: subName, 
                    date, 
                    score, 
                    memo: mem || "", 
                    createdAt: serverTimestamp() 
                });
            }
            showToast("저장됨");
        } catch(e) { console.error(e); showToast("실패", true); }
    };

    return {
        loadDailyTests,
        changeDailyPage: (d) => { state.page += d; if(state.page < 0) state.page = 0; render(); }
    };
};