// src/parent/parentDailyTest.js 전체 교체 추천

import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../shared/firebase.js"; // app import 필요

export const parentDailyTest = {
    db: null,
    student: null,
    classId: null,
    data: [],
    averages: {}, // 반 평균 저장용
    page: 0,
    PER_PAGE: 5, // 모바일이니까 5개 정도
    unsubscribe: null,

    init(db, student, classData) {
        this.db = db;
        this.student = student;
        this.classId = classData?.id;
        this.page = 0;
        this.data = [];
        this.averages = {};
        
        if(this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        // 1. 반 평균 비동기 로드 (서버 호출)
        this.loadAverages();
        
        // 2. 내 점수 실시간 로드
        this.loadData();

        const prevBtn = document.getElementById('daily-prev-btn');
        const nextBtn = document.getElementById('daily-next-btn');
        if(prevBtn) prevBtn.addEventListener('click', () => this.changePage(-1));
        if(nextBtn) nextBtn.addEventListener('click', () => this.changePage(1));
    },

    async loadAverages() {
        if (!this.classId) return;
        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const getAvgFn = httpsCallable(functions, 'getDailyTestAverages');
            const result = await getAvgFn({ classId: this.classId });
            this.averages = result.data || {};
            this.render(); // 평균 도착하면 다시 그리기
        } catch (e) {
            console.error("평균 로드 실패:", e);
        }
    },

    loadData() {
        if(!this.student || !this.student.id) return;
        
        const listEl = document.getElementById('daily-test-list');
        if(listEl) listEl.innerHTML = '<div class="text-center py-10 text-slate-400">데이터를 불러오는 중...</div>';

        // 내 자녀 데이터만 쿼리 (보안 규칙 준수)
        const q = query(
            collection(this.db, 'daily_tests'), 
            where('studentId', '==', this.student.id),
            orderBy('date', 'desc')
        );
        
        this.unsubscribe = onSnapshot(q, (snap) => {
            const grouped = {};
            snap.forEach(doc => {
                const d = doc.data();
                const key = `${d.date}_${d.subjectName}`;
                
                // 중복 데이터 방지
                if(!grouped[key]) {
                    grouped[key] = { 
                        date: d.date, 
                        subjectName: d.subjectName,
                        myScore: Number(d.score),
                        key: key
                    };
                }
            });

            this.data = Object.values(grouped)
                .sort((a,b) => new Date(b.date) - new Date(a.date));

            this.render();
        }, (error) => {
            console.error("로드 에러:", error);
            if(listEl) listEl.innerHTML = '<div class="text-center py-10 text-red-400">데이터를 불러올 권한이 없습니다.</div>';
        });
    },

    render() {
        const listEl = document.getElementById('daily-test-list');
        if(!listEl) return;

        const start = this.page * this.PER_PAGE;
        const end = start + this.PER_PAGE;
        const items = this.data.slice(start, end);

        const prevBtn = document.getElementById('daily-prev-btn');
        const nextBtn = document.getElementById('daily-next-btn');
        if(prevBtn) prevBtn.disabled = this.page === 0;
        if(nextBtn) nextBtn.disabled = end >= this.data.length;

        if(!items.length) {
            listEl.innerHTML = '<div class="text-center py-10 text-slate-400">기록이 없습니다.</div>';
            return;
        }

        // 학생 전체 평균 계산 (현재 페이지에 보이는 항목들 기준)
        const myTotal = items.reduce((sum, item) => sum + (item.myScore || 0), 0);
        const myAvg = items.length ? (myTotal / items.length).toFixed(1) : 0;

        listEl.innerHTML = `
            <div class="mb-4 px-2 flex justify-between text-sm font-bold text-slate-600">
                <span>최근 응시 평균: <span class="text-indigo-600">${myAvg}점</span></span>
            </div>
            ${items.map(item => {
                // 서버에서 가져온 평균 매칭
                const classAvg = this.averages[item.key] || '-';
                
                return `
                <div class="mobile-card mb-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                        <div>
                            <span class="text-xs font-bold text-slate-400 block mb-0.5">${item.date}</span>
                            <h3 class="font-bold text-base text-slate-800">${item.subjectName || '테스트'}</h3>
                        </div>
                        <div class="text-right">
                             <span class="text-xs font-bold text-slate-400">반 평균</span>
                             <div class="text-sm font-bold text-slate-600">${classAvg}점</div>
                        </div>
                    </div>
                    <div class="flex items-center justify-between">
                        <span class="text-sm font-bold text-slate-500">내 점수</span>
                        <span class="text-xl font-bold ${item.myScore >= classAvg ? 'text-indigo-600' : 'text-slate-700'}">
                            ${item.myScore}점
                        </span>
                    </div>
                </div>
            `}).join('')}`;
    },

    changePage(delta) {
        this.page += delta;
        this.render();
    }
};