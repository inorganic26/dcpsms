// src/parent/parentDailyTest.js

import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../shared/firebase.js"; 
import { openImagePreviewModal } from "../shared/utils.js"; 

export const parentDailyTest = {
    db: null,
    student: null,
    classId: null,
    data: [],
    averages: {}, 
    page: 0,
    PER_PAGE: 5, 
    unsubscribe: null,

    init(db, student, classData) {
        this.db = db;
        this.student = student;
        this.classId = classData?.id;
        this.page = 0;
        this.data = [];
        this.averages = {};

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.loadAverages();
        this.loadData();

        const prevBtn = document.getElementById('daily-prev-btn');
        const nextBtn = document.getElementById('daily-next-btn');
        if (prevBtn) prevBtn.addEventListener('click', () => this.changePage(-1));
        if (nextBtn) nextBtn.addEventListener('click', () => this.changePage(1));
    },

    async loadAverages() {
        if (!this.classId) return;
        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const getAvgFn = httpsCallable(functions, 'getDailyTestAverages');
            const result = await getAvgFn({ classId: this.classId });
            this.averages = result.data || {};
            this.render(); 
        } catch (e) {
            console.error("평균 로드 실패:", e);
        }
    },

    loadData() {
        if (!this.student || !this.student.id) return;

        const listEl = document.getElementById('daily-test-list');
        if (listEl) listEl.innerHTML = '<div class="text-center py-10 text-slate-400">데이터를 불러오는 중...</div>';

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

                if (!grouped[key]) {
                    grouped[key] = {
                        date: d.date,
                        subjectName: d.subjectName,
                        myScore: Number(d.score),
                        imageUrls: d.imageUrls || [],
                        key: key
                    };
                }
            });

            this.data = Object.values(grouped)
                .sort((a, b) => new Date(b.date) - new Date(a.date));

            this.render();
        }, (error) => {
            console.error("로드 에러:", error);
            if (listEl) listEl.innerHTML = '<div class="text-center py-10 text-red-400">데이터를 불러올 권한이 없습니다.</div>';
        });
    },

    render() {
        const listEl = document.getElementById('daily-test-list');
        if (!listEl) return;

        const start = this.page * this.PER_PAGE;
        const end = start + this.PER_PAGE;
        const items = this.data.slice(start, end);

        const prevBtn = document.getElementById('daily-prev-btn');
        const nextBtn = document.getElementById('daily-next-btn');
        if (prevBtn) prevBtn.disabled = this.page === 0;
        if (nextBtn) nextBtn.disabled = end >= this.data.length;

        if (!items.length) {
            listEl.innerHTML = '<div class="text-center py-10 text-slate-400">기록이 없습니다.</div>';
            return;
        }

        const myTotal = items.reduce((sum, item) => sum + (item.myScore || 0), 0);
        const myAvg = items.length ? (myTotal / items.length).toFixed(1) : 0;

        // 👇 [수정] view-images-btn에 data-name, data-date 속성 추가
        listEl.innerHTML = `
            <div class="mb-4 px-2 flex justify-between text-sm font-bold text-slate-600">
                <span>최근 응시 평균: <span class="text-indigo-600">${myAvg}점</span></span>
            </div>
            ${items.map(item => {
            const classAvg = this.averages[item.key] || '-';

            return `
                <div class="mobile-card mb-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-50">
                        <div>
                            <span class="text-xs font-bold text-slate-400 block mb-0.5">${item.date}</span>
                            <h3 class="font-bold text-base text-slate-800">${item.subjectName || '테스트'}</h3>
                            ${item.imageUrls.length > 0 ?
                    `<button class="mt-1 text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1 view-images-btn" 
                                         data-urls="${item.imageUrls.join(',')}" data-name="${this.student.name}" data-date="${item.date}">
                                    <span class="material-icons-round text-sm">filter_none</span> 시험지 확인 (${item.imageUrls.length}장)
                                 </button>`
                    : ''}
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

        // 👇 [수정] openImagePreviewModal 호출 시 name, date 함께 전달
        listEl.querySelectorAll('.view-images-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const urls = btn.dataset.urls.split(',');
                const name = btn.dataset.name;
                const date = btn.dataset.date;
                openImagePreviewModal(urls, name, date);
            });
        });
    },

    changePage(delta) {
        this.page += delta;
        this.render();
    }
};