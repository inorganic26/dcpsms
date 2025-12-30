// src/parent/parentWeeklyTest.js
import { collection, query, orderBy, getDocs } from "firebase/firestore";

export const parentWeeklyTest = {
    db: null,
    student: null,
    page: 0,
    data: [],
    PER_PAGE: 2,

    init(db, student) {
        this.db = db;
        this.student = student;
        this.page = 0;
        this.loadData();
        
        document.getElementById('weekly-prev-btn').addEventListener('click', () => this.changePage(-1));
        document.getElementById('weekly-next-btn').addEventListener('click', () => this.changePage(1));
    },

    async loadData() {
        try {
            // 주간 테스트 전체 로드 (반 필터가 없으므로 전체 가져와서 JS 필터링... 
            // *최적화: targetDate 등으로 쿼리해야 하지만 구조상 전체 로드 후 가공)
            const q = query(collection(this.db, 'weekly_tests'), orderBy('targetDate', 'desc'));
            const snap = await getDocs(q);
            
            const grouped = {};
            snap.forEach(doc => {
                const d = doc.data();
                const key = d.targetDate || d.weekLabel; // 주차 식별
                if(!grouped[key]) grouped[key] = { label: key, scores: [], myRecord: null };
                
                if(d.score !== null) grouped[key].scores.push(Number(d.score));
                
                if(d.uid === this.student.id) {
                    grouped[key].myRecord = d;
                }
            });

            // 내가 포함된 주차만 표시 (또는 전체 표시하되 내 점수 없음)
            // "누적" 의미상 전체 주차를 보여주되 내 기록을 매칭
            this.data = Object.values(grouped)
                .filter(g => g.myRecord) // 내 기록(예약 포함)이 있는 것만
                .map(g => {
                    const avg = g.scores.length ? Math.round(g.scores.reduce((a,b)=>a+b,0)/g.scores.length) : 0;
                    return { ...g, avg };
                });

            this.render();
        } catch(e) { console.error(e); }
    },

    render() {
        const listEl = document.getElementById('weekly-test-list');
        const start = this.page * this.PER_PAGE;
        const items = this.data.slice(start, start + this.PER_PAGE);

        document.getElementById('weekly-prev-btn').disabled = this.page === 0;
        document.getElementById('weekly-next-btn').disabled = start + this.PER_PAGE >= this.data.length;

        if(!items.length) {
            listEl.innerHTML = '<div class="text-center py-10 text-slate-400">기록이 없습니다.</div>';
            return;
        }

        listEl.innerHTML = items.map(item => {
            const rec = item.myRecord;
            // 예약 날짜/시간 포맷팅
            let reserveInfo = '<span class="text-slate-400">정보 없음</span>';
            if(rec.examDate) {
                 // examTime이 있으면 같이 표시
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