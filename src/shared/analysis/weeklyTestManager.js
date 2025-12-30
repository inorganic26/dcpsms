// src/shared/analysis/weeklyTestManager.js

import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { showToast } from "../utils.js";
import { getWeeklyTestTargetDate, getWeekLabel, formatDateString } from "../dateUtils.js";

export const createWeeklyTestManager = (config) => {
    const { elements, role } = config;
    
    let state = { records: [], weeks: [], page: 0, unsubscribe: null, classId: null, students: [] };
    const ITEMS_PER_PAGE = 5;

    // --- UI 헬퍼 함수 ---
    const createCell = (studentId, label, record) => {
        // 1. 미응시
        if (!record) {
            return `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 cell-weekly" 
                        data-sid="${studentId}" data-lbl="${label}" data-ex="false">
                        <span class="text-xs text-red-300">미응시</span>
                    </td>`;
        }
        
        const sc = record.score;
        let content = '';

        // 2. 예약 상태 (점수가 없음)
        if (sc === null) {
            // [핵심 수정] 필드명 호환성 체크 (examDate 또는 date, examTime 또는 time)
            const rDate = record.examDate || record.date || record.reservationDate;
            const rTime = record.examTime || record.time || record.reservationTime;

            if (rDate && rTime) {
                // 날짜 포맷팅 (MM-DD)
                const shortDate = rDate.length > 5 ? rDate.slice(5) : rDate;
                
                // 요일 계산
                let dayLabel = '';
                try {
                    const [y, m, d] = rDate.split('-').map(Number);
                    const dayIndex = new Date(y, m - 1, d).getDay();
                    dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dayIndex];
                } catch(e) {}

                content = `<div class="text-xs leading-tight">
                                <div class="font-medium text-slate-700">${shortDate} <span class="text-slate-500">(${dayLabel})</span></div>
                                <div class="text-blue-600 font-bold">${rTime}</div>
                           </div>`;
            } else {
                content = '<span class="text-xs text-slate-400">예약됨</span>';
            }
        } else {
            // 3. 응시 완료 (점수 있음)
            content = `<span class="text-lg">${sc}</span>`;
        }

        // 스타일링
        let cls = sc === null 
            ? "bg-yellow-50 text-yellow-700" // 예약 상태 배경
            : (sc >= 90 ? "bg-blue-50 text-blue-700 font-bold" 
            : (sc < 70 ? "bg-red-50 text-red-600 font-bold" 
            : "font-bold text-slate-700"));

        return `<td class="p-2 border ${cls} cursor-pointer hover:opacity-80 cell-weekly align-middle" 
                    data-sid="${studentId}" data-lbl="${label}" data-ex="true" 
                    data-doc="${record.id}" data-scr="${sc||''}">
                    ${content}
                </td>`;
    };

    const createAvgRow = (weeks, students, records) => {
        let html = `<tr class="bg-indigo-100 font-bold border-b border-indigo-200"><td class="p-3 border sticky left-0 bg-indigo-100 z-10 text-indigo-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">반평균</td>`;
        weeks.forEach(lbl => {
            const scores = students.map(s => {
                const r = records.find(rec => rec.uid === s.id && (rec.weekLabel === lbl || rec.targetDate === lbl));
                return r && r.score !== null ? Number(r.score) : null;
            }).filter(v => v !== null);
            html += `<td class="p-3 border text-indigo-800">${scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : '-'}</td>`;
        });
        return html + `</tr>`;
    };

    // --- 메인 로직 ---
    const loadWeeklyTests = (classId, students) => {
        state = { ...state, classId, students, page: 0 };
        if(state.unsubscribe) { state.unsubscribe(); state.unsubscribe=null; }
        
        if(!classId) { 
            if(elements.weeklyResultTable) elements.weeklyResultTable.innerHTML = ''; 
            elements.weeklyPagination?.classList.add('hidden'); 
            return; 
        }
        if(elements.weeklyResultTable) elements.weeklyResultTable.innerHTML = '<div class="loader-small mx-auto"></div>';

        const q = query(collection(db,"weekly_tests"), orderBy("targetDate","desc"));
        state.unsubscribe = onSnapshot(q, (snap) => {
            const recs = [];
            const ids = new Set(students.map(s=>s.id));
            snap.forEach(d => { if(ids.has(d.data().uid)) recs.push({id:d.id, ...d.data()}); });
            
            state.records = recs;
            const w = [...new Set(recs.map(r=>r.weekLabel||r.targetDate))].sort().reverse();
            const thisW = getWeekLabel(getWeeklyTestTargetDate(new Date()));
            if(!w.includes(thisW)) w.unshift(thisW);
            state.weeks = w;
            render();
        });
    };

    const render = () => {
        const { records, weeks, page, students } = state;
        const container = elements.weeklyResultTable;
        if(!container) return;
        
        const total = Math.ceil(weeks.length/ITEMS_PER_PAGE)||1;
        const start = page*ITEMS_PER_PAGE;
        const viewWeeks = weeks.slice(start, start+ITEMS_PER_PAGE);

        if(elements.weeklyPagination) {
            elements.weeklyPagination.classList.remove('hidden');
            if(elements.weeklyPrevBtn) elements.weeklyPrevBtn.disabled = page===0;
            if(elements.weeklyNextBtn) elements.weeklyNextBtn.disabled = page>=total-1;
            if(elements.weeklyPageInfo) elements.weeklyPageInfo.textContent = `${page+1}/${total}`;
        }

        let html = `<table class="w-full text-sm text-center border-collapse whitespace-nowrap"><thead class="bg-indigo-50 text-indigo-900 sticky top-0 z-10 shadow-sm"><tr><th class="p-3 border sticky left-0 bg-indigo-50 z-20 min-w-[80px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">이름</th>`;
        viewWeeks.forEach(l => html+=`<th class="p-3 border font-bold">${l}</th>`);
        html+=`</tr></thead><tbody>`;

        if(students.length) {
            html += createAvgRow(viewWeeks, students, records);
            students.forEach(s => {
                html += `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 border font-bold sticky left-0 bg-white z-10 text-slate-800 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">${s.name}</td>`;
                viewWeeks.forEach(l => html += createCell(s.id, l, records.find(x => x.uid===s.id && (x.weekLabel===l || x.targetDate===l))));
                html += `</tr>`;
            });
        } else { html += `<tr><td colspan="${viewWeeks.length+1}" class="p-4 text-slate-400">학생 없음</td></tr>`; }
        
        container.innerHTML = html + `</tbody></table>`;
        container.querySelectorAll('.cell-weekly').forEach(c => c.onclick = () => handleScoreClick(c));
    };

    const handleScoreClick = async (cell) => {
        const { sid, lbl, ex, doc:did, scr } = cell.dataset;
        const s = state.students.find(x=>x.id===sid);
        
        // 점수 입력
        const val = prompt(`${lbl} ${s.name} 점수`, ex==='true'?scr:'');
        if(val===null) return;
        const score = Number(val);
        if(isNaN(score)) return alert("숫자만 입력");

        try {
            if(ex==='true' && did) {
                // 기존 기록 업데이트 (점수 입력 시 완료 처리)
                await updateDoc(doc(db,"weekly_tests",did), {score, status:'completed', updatedAt:serverTimestamp()});
            } else {
                // 신규 기록 (관리자/선생님이 직접 추가하는 경우)
                const t = getWeeklyTestTargetDate(new Date());
                const l = getWeekLabel(t);
                if(lbl!==l && !confirm(`선택 주차가 이번주와 다릅니다. 진행?`)) return;
                const dStr = formatDateString(t);
                const nid = `${sid}_${dStr}`;
                const who = role==='admin'?'관리자':'선생님';
                
                await setDoc(doc(db,"weekly_tests",nid), {
                    uid: sid, 
                    userName: s.name, 
                    targetDate: dStr, 
                    weekLabel: lbl, 
                    examDate: formatDateString(new Date()), // 오늘 날짜
                    examTime: who, 
                    score, 
                    status:'completed', 
                    updatedAt: serverTimestamp()
                }, {merge:true});
            }
            showToast("저장됨");
        } catch(e){ console.error(e); showToast("실패",true); }
    };

    // 모달 관련
    const openAddWeeklyModal = () => {
        if(!state.classId) { showToast("반 선택 필요",true); return; }
        elements.weeklyModalStudent.innerHTML = state.students.length ? '' : '<option disabled>학생 없음</option>';
        state.students.forEach(s => elements.weeklyModalStudent.innerHTML+=`<option value="${s.id}">${s.name}</option>`);
        elements.weeklyModalDate.value = formatDateString(new Date());
        elements.weeklyModalScore.value = '';
        elements.weeklyModal.style.display = 'flex';
    };

    const saveWeeklyFromModal = async () => {
        const sid = elements.weeklyModalStudent.value;
        const dVal = elements.weeklyModalDate.value;
        const scVal = elements.weeklyModalScore.value;
        if(!sid || !dVal || scVal==='') return alert("입력 확인");
        
        const s = state.students.find(x=>x.id===sid);
        const t = getWeeklyTestTargetDate(dVal);
        const tStr = formatDateString(t);
        const lbl = getWeekLabel(t);
        const did = `${sid}_${tStr}`;
        const who = role==='admin'?'관리자추가':'선생님추가';
        try {
            await setDoc(doc(db,"weekly_tests",did), {
                uid:sid, 
                userName:s.name, 
                targetDate:tStr, 
                weekLabel:lbl, 
                examDate:dVal, 
                examTime:who, 
                score:Number(scVal), 
                status:'completed', 
                updatedAt:serverTimestamp()
            }, {merge:true});
            showToast("추가됨");
            elements.weeklyModal.style.display='none';
        } catch(e){ console.error(e); showToast("실패",true); }
    };

    return {
        loadWeeklyTests,
        changeWeeklyPage: (d) => { state.page+=d; if(state.page<0) state.page=0; render(); },
        openAddWeeklyModal,
        saveWeeklyFromModal
    };
};