// src/parent/parentWeeklyTest.js
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";

export const parentWeeklyTest = {
    db: null,
    student: null,
    page: 0,
    data: [],
    PER_PAGE: 2,
    unsubscribe: null,

    init(db, student) {
        this.db = db;
        this.student = student;
        this.page = 0;
        
        if(this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.loadData();
        
        const prevBtn = document.getElementById('weekly-prev-btn');
        const nextBtn = document.getElementById('weekly-next-btn');
        if(prevBtn) prevBtn.addEventListener('click', () => this.changePage(-1));
        if(nextBtn) nextBtn.addEventListener('click', () => this.changePage(1));
    },

    loadData() {
        const listEl = document.getElementById('weekly-test-list');
        if(listEl) listEl.innerHTML = '<div class="text-center py-10 text-slate-400">데이터를 불러오는 중...</div>';

        // [수정] onSnapshot 사용
        const q = query(collection(this.db, 'weekly_tests'), orderBy('targetDate', 'desc'));
        
        this.unsubscribe = onSnapshot(q, (snap) => {
            const grouped = {};
            snap.forEach(doc => {
                const d = doc.data();
                const key = d.targetDate || d.weekLabel; 
                if(!grouped[key]) grouped[key] = { label: key, scores: [], myRecord: null };
                
                if(d.score !== null) grouped[key].scores.push(Number(d.score));
                
                if(d.uid === this.student.id) {
                    grouped[key].myRecord = d;
                }
            });

            this.data = Object.values(grouped)
                .filter(g => g.myRecord) 
                .map(g => {
                    const avg = g.scores.length ? Math.round(g.scores.reduce((a,b)=>a+b,0)/g.scores.length) : 0;
                    return { ...g, avg };
                });

            this.render();
        }, (error) => {
            console.error("주간테스트 로드 에러:", error);
        });
    },

    render() {
        const listEl = document.getElementById('weekly-test-list');
        if(!listEl) return;

        const start = this.page * this.PER_PAGE;
        const items = this.data.slice(start, start + this.PER_PAGE);

        const prevBtn = document.getElementById('weekly-prev-btn');
        const nextBtn = document.getElementById('weekly-next-btn');
        if(prevBtn) prevBtn.disabled = this.page === 0;
        if(nextBtn) nextBtn.disabled = start + this.PER_PAGE >= this.data.length;

        if(!items.length) {
            listEl.innerHTML = '<div class="text-center py-10 text-slate-400">기록이 없습니다.</div>';
            return;
        }

        listEl.innerHTML = items.map(item => {
            const rec = item.myRecord;
            let reserveInfo = '<span class="text-slate-400">정보 없음</span>';
            if(rec.examDate) {
                 reserveInfo = `<span class="text-indigo-600 font-bold">${rec.examDate}</span> ${rec.examTime ? '<span class="text-slate-500 text-xs">('+rec.examTime+')</span>' : ''}`;
            }

            return `
            <div class="mobile-card">
                <div class="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                    <div>
                        <span class="text-xs font-bold text-slate-400 block mb-1">주간 테스트</span>
                        <h3 class="font-bold text-lg text-slate-800">${item.label}</h3>
                    </div>
                    <div class="text-right">
                        <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">응시 예약일</span>
                        <div class="mt-1 text-sm">${reserveInfo}</div>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="bg-indigo-50 rounded-xl p-3">
                        <p class="text-xs text-indigo-500 font-bold mb-1">반 평균</p>
                        <p class="text-xl font-bold text-indigo-700">${item.avg}점</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="text-xs text-slate-500 font-bold mb-1">학생 점수</p>
                        <p class="text-xl font-bold ${rec.score >= item.avg ? 'text-green-600' : 'text-slate-700'}">
                            ${rec.score !== null ? rec.score + '점' : '<span class="text-yellow-600 text-sm">예약/미응시</span>'}
                        </p>
                    </div>
                </div>
            </div>`;
        }).join('');
    },

    changePage(d) { this.page += d; this.render(); }
};