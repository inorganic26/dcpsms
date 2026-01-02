// src/shared/analysis/weeklyTestManager.js

import { collection, query, orderBy, onSnapshot, doc, updateDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { showToast } from "../utils.js";
import { getWeeklyTestTargetDate, getWeekLabel, formatDateString } from "../dateUtils.js";

export const createWeeklyTestManager = (config) => {
    const { elements, role } = config;
    
    let state = { records: [], weeks: [], page: 0, unsubscribe: null, classId: null, students: [] };
    const ITEMS_PER_PAGE = 5;

    // [헬퍼] 요일에 따른 시간 옵션 업데이트
    const updateTimeOptions = (dateStr) => {
        const timeSelect = document.getElementById('weekly-modal-generated-time');
        if (!timeSelect || !dateStr) return;

        // 요일 계산
        const date = new Date(dateStr);
        const day = date.getDay(); // 0:일, 1:월, ..., 5:금, 6:토

        let options = [];
        
        // 금요일 (5)
        if (day === 5) {
            options = ['16:00', '17:00', '18:00', '19:00', '20:00'];
        } 
        // 토요일(6) 또는 일요일(0)
        else if (day === 6 || day === 0) {
            options = ['12:00', '13:00', '14:00', '15:00'];
        } 
        // 그 외 요일
        else {
            options = []; // 비워두거나 필요 시 추가
        }

        // 옵션 렌더링
        timeSelect.innerHTML = '<option value="">시간 선택</option>';
        if (options.length === 0) {
            timeSelect.innerHTML += '<option value="" disabled>예약 불가 요일</option>';
        } else {
            options.forEach(t => {
                timeSelect.innerHTML += `<option value="${t}">${t}</option>`;
            });
        }
    };

    // [헬퍼] 시간 입력 필드(Select) 동적 생성
    const ensureTimeSelect = () => {
        if (!elements.weeklyModalDate) return null;
        let timeSelect = document.getElementById('weekly-modal-generated-time');
        
        if (!timeSelect) {
            const container = document.createElement('div');
            container.className = "flex gap-2 w-full";
            
            const dateInput = elements.weeklyModalDate;
            const parent = dateInput.parentNode;
            
            // Select 생성
            timeSelect = document.createElement('select');
            timeSelect.id = 'weekly-modal-generated-time';
            timeSelect.className = "w-1/3 p-3 border rounded-xl text-sm focus:outline-none focus:border-indigo-500 bg-white cursor-pointer";
            
            parent.insertBefore(timeSelect, dateInput.nextSibling);
            
            dateInput.classList.remove('w-full');
            dateInput.classList.add('flex-1');

            // [이벤트] 날짜 변경 시 시간 옵션 업데이트
            dateInput.addEventListener('change', (e) => updateTimeOptions(e.target.value));
        }
        return timeSelect;
    };

    // --- UI 헬퍼 함수 ---
    const createCell = (studentId, label, record) => {
        // 1. 데이터 없음
        if (!record) {
            return `<td class="p-3 border text-slate-300 cursor-pointer hover:bg-slate-100 cell-weekly transition-colors" 
                        data-sid="${studentId}" data-lbl="${label}" data-ex="false">
                        <span class="text-xs text-red-300">미응시</span>
                    </td>`;
        }
        
        const sc = record.score;
        let content = '';
        
        // 2. 예약 상태
        if (sc === null || sc === undefined || sc === '') {
            const rDate = record.examDate || record.date || record.reservationDate;
            const rTime = record.examTime || record.time || record.reservationTime;

            if (rDate) {
                const shortDate = rDate.length > 5 ? rDate.slice(5) : rDate;
                let dayLabel = '';
                try {
                    const [y, m, d] = rDate.split('-').map(Number);
                    const dayIndex = new Date(y, m - 1, d).getDay();
                    dayLabel = ['일', '월', '화', '수', '목', '금', '토'][dayIndex];
                } catch(e) {}

                content = `<div class="text-xs leading-tight">
                                <div class="font-medium text-slate-700">${shortDate} <span class="text-slate-500">(${dayLabel})</span></div>
                                <div class="text-blue-600 font-bold text-[10px] mt-0.5">${rTime || '예약'}</div>
                           </div>`;
            } else {
                content = '<span class="text-xs text-slate-400">예약됨</span>';
            }
        } else {
            // 3. 응시 완료
            content = `<span class="text-lg">${sc}</span>`;
        }

        // 스타일링
        let cls = (sc === null || sc === undefined || sc === '')
            ? "bg-yellow-50 text-yellow-700 hover:bg-yellow-100" 
            : (sc >= 90 ? "bg-blue-50 text-blue-700 font-bold hover:bg-blue-100" 
            : (sc < 70 ? "bg-red-50 text-red-600 font-bold hover:bg-red-100" 
            : "font-bold text-slate-700 hover:bg-slate-100"));

        const deleteBtnHtml = `
            <button class="weekly-delete-btn w-6 h-6 flex items-center justify-center rounded-full text-slate-400 hover:bg-red-100 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100 absolute right-1 top-1/2 -translate-y-1/2 z-20" 
                    data-doc="${record.id}" title="기록 삭제">
                <span class="material-icons-round text-[14px]">close</span>
            </button>`;

        return `<td class="p-2 border ${cls} relative group cell-weekly align-middle transition-colors cursor-pointer" 
                    data-sid="${studentId}" data-lbl="${label}" data-ex="true" 
                    data-doc="${record.id}" data-scr="${(sc !== null && sc !== undefined) ? sc : ''}"
                    data-date="${record.examDate || ''}" data-time="${record.examTime || ''}">
                    <div class="flex items-center justify-center gap-1 w-full h-full relative min-h-[40px]">
                        ${content}
                        ${deleteBtnHtml}
                    </div>
                </td>`;
    };

    const createAvgRow = (weeks, students, records) => {
        let html = `<tr class="bg-indigo-100 font-bold border-b border-indigo-200"><td class="p-3 border sticky left-0 bg-indigo-100 z-10 text-indigo-900 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">반평균</td>`;
        weeks.forEach(lbl => {
            const scores = students.map(s => {
                const r = records.find(rec => rec.uid === s.id && (rec.weekLabel === lbl || rec.targetDate === lbl));
                return (r && r.score !== null && r.score !== undefined && r.score !== '') ? Number(r.score) : null;
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
        
        // 이벤트 연결
        container.querySelectorAll('.cell-weekly').forEach(c => {
            c.onclick = (e) => {
                if (e.target.closest('.weekly-delete-btn')) return;
                openEditModal(c);
            };
        });

        container.querySelectorAll('.weekly-delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation(); 
                handleDelete(btn.dataset.doc);
            };
        });
    };

    const handleDelete = async (docId) => {
        if (!docId) return;
        if (!confirm("정말 이 기록을 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "weekly_tests", docId));
            showToast("삭제되었습니다.");
        } catch (e) { console.error(e); showToast("삭제 실패", true); }
    };

    // [셀 클릭] 수정 모달 열기
    const openEditModal = (cell) => {
        const { sid, lbl, ex, doc:did, scr, date, time } = cell.dataset;
        
        const timeSelect = ensureTimeSelect();
        
        // 학생 선택
        elements.weeklyModalStudent.innerHTML = '';
        state.students.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            if(s.id === sid) opt.selected = true;
            elements.weeklyModalStudent.appendChild(opt);
        });

        // 날짜 설정 및 시간 옵션 초기화
        const initialDate = (date && date !== 'undefined') ? date : formatDateString(new Date());
        elements.weeklyModalDate.value = initialDate;
        
        // 날짜에 맞춰 시간 옵션 생성
        updateTimeOptions(initialDate);

        // 시간 선택 (옵션에 있는 값이면 선택, 없으면 추가하거나 선택 안함)
        if (time && time !== 'undefined' && timeSelect) {
            // 기존 옵션에 없는데 저장된 값이면(예: 관리자가 수동 입력했던 값) 임시로 추가
            if (![...timeSelect.options].some(o => o.value === time)) {
                const opt = document.createElement('option');
                opt.value = time;
                opt.textContent = time;
                timeSelect.appendChild(opt);
            }
            timeSelect.value = time;
        } else if (timeSelect) {
            timeSelect.value = '';
        }

        // 점수 설정
        elements.weeklyModalScore.value = (scr && scr !== 'null') ? scr : '';

        elements.weeklyModal.style.display = 'flex';
    };

    // [추가 버튼] 모달 열기
    const openAddWeeklyModal = () => {
        if(!state.classId) { showToast("반 선택 필요",true); return; }
        
        const timeSelect = ensureTimeSelect();
        
        elements.weeklyModalStudent.innerHTML = state.students.length ? '' : '<option disabled>학생 없음</option>';
        state.students.forEach(s => elements.weeklyModalStudent.innerHTML+=`<option value="${s.id}">${s.name}</option>`);
        
        const today = formatDateString(new Date());
        elements.weeklyModalDate.value = today;
        updateTimeOptions(today); // 오늘 날짜 기준 시간 목록 갱신

        if(timeSelect) timeSelect.value = '';
        elements.weeklyModalScore.value = '';
        
        elements.weeklyModal.style.display = 'flex';
    };

    // [저장]
    const saveWeeklyFromModal = async () => {
        const sid = elements.weeklyModalStudent.value;
        const dVal = elements.weeklyModalDate.value;
        const scVal = elements.weeklyModalScore.value;
        
        const timeSelect = document.getElementById('weekly-modal-generated-time');
        const tVal = timeSelect ? timeSelect.value : '';

        if(!sid || !dVal) return alert("학생과 날짜는 필수입니다.");
        
        let score = null;
        let status = 'assigned';

        if (scVal.trim() !== '') {
            score = Number(scVal);
            status = 'completed';
        }

        const s = state.students.find(x=>x.id===sid);
        
        const t = getWeeklyTestTargetDate(dVal);
        const tStr = formatDateString(t);
        const lbl = getWeekLabel(t);
        const did = `${sid}_${tStr}`;
        
        // 시간 선택 안 하면 역할 표시, 선택하면 시간 표시
        const timeDisplay = tVal || (role==='admin'?'관리자':'선생님');

        try {
            await setDoc(doc(db,"weekly_tests",did), {
                uid:sid, 
                userName:s.name, 
                targetDate:tStr, 
                weekLabel:lbl, 
                examDate:dVal, 
                examTime:timeDisplay, 
                score: score,
                status: status, 
                updatedAt:serverTimestamp()
            }, {merge:true});
            
            showToast(score !== null ? "저장됨" : "예약됨");
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