// src/parent/parentDailyTest.js
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";

export const parentDailyTest = {
    db: null,
    student: null,
    classId: null,
    data: [],
    page: 0,
    PER_PAGE: 2,

    init(db, student, classData) {
        this.db = db;
        this.student = student;
        this.classId = classData?.id;
        this.page = 0;
        this.data = [];
        this.loadData();

        document.getElementById('daily-prev-btn').addEventListener('click', () => this.changePage(-1));
        document.getElementById('daily-next-btn').addEventListener('click', () => this.changePage(1));
    },

    async loadData() {
        if(!this.classId) return;
        const listEl = document.getElementById('daily-test-list');
        listEl.innerHTML = '<div class="text-center py-10 text-slate-400">데이터를 불러오는 중...</div>';

        try {
            // 반 전체 성적을 가져와야 평균 계산 가능
            const q = query(collection(this.db, 'daily_tests'), where('classId', '==', this.classId), orderBy('date', 'desc'));
            const snap = await getDocs(q);

            // 날짜별로 그룹화
            const grouped = {};
            snap.forEach(doc => {
                const d = doc.data();
                if(!grouped[d.date]) grouped[d.date] = { date: d.date, scores: [], myScore: null };
                
                if(d.score !== null && d.score !== undefined) {
                    grouped[d.date].scores.push(Number(d.score));
                    if(d.studentId === this.student.id) {
                        grouped[d.date].myScore = Number(d.score);
                        grouped[d.date].subjectName = d.subjectName; // 과목명 겟
                    }
                }
            });

            // 배열로 변환 (내가 응시하지 않은 날도 평균은 보여줄 수 있음. 여기선 내 점수 있는 날만 표시하거나 정책따라)
            // 요구사항: "누적되게" -> 내 기록 중심
            this.data = Object.values(grouped)
                .map(item => {
                    const avg = item.scores.length ? Math.round(item.scores.reduce((a,b)=>a+b,0) / item.scores.length) : 0;
                    return { ...item, avg };
                })
                .sort((a,b) => new Date(b.date) - new Date(a.date)); // 최신순

            this.render();

        } catch(e) { console.error(e); }
    },

    render() {
        const listEl = document.getElementById('daily-test-list');
        const start = this.page * this.PER_PAGE;
        const end = start + this.PER_PAGE;
        const items = this.data.slice(start, end);

        // 페이지 버튼 상태
        document.getElementById('daily-prev-btn').disabled = this.page === 0;
        document.getElementById('daily-next-btn').disabled = end >= this.data.length;

        if(!items.length) {
            listEl.innerHTML = '<div class="text-center py-10 text-slate-400">기록이 없습니다.</div>';
            return;
        }

        listEl.innerHTML = items.map(item => `
            <div class="mobile-card">
                <div class="flex justify-between items-end mb-4 border-b border-slate-100 pb-3">
                    <div>
                        <span class="text-xs font-bold text-slate-400 block mb-1">${item.date}</span>
                        <h3 class="font-bold text-lg text-slate-800">${item.subjectName || '일일 테스트'}</h3>
                    </div>
                </div>
                <div class="grid grid-cols-2 gap-4 text-center">
                    <div class="bg-indigo-50 rounded-xl p-3">
                        <p class="text-xs text-indigo-500 font-bold mb-1">반 평균</p>
                        <p class="text-xl font-bold text-indigo-700">${item.avg}점</p>
                    </div>
                    <div class="bg-slate-50 rounded-xl p-3">
                        <p class="text-xs text-slate-500 font-bold mb-1">학생 점수</p>
                        <p class="text-xl font-bold ${item.myScore >= item.avg ? 'text-green-600' : 'text-slate-700'}">
                            ${item.myScore !== null ? item.myScore + '점' : '<span class="text-red-400 text-sm">미응시</span>'}
                        </p>
                    </div>
                </div>
            </div>
        `).join('');
    },

    changePage(delta) {
        this.page += delta;
        this.render();
    }
};