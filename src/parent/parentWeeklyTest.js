// src/jsparent/parentWeeklyTest.

import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../shared/firebase.js";
import { openImagePreviewModal } from "../shared/utils.js"; // 👇 추가

export const parentWeeklyTest = {
    db: null,
    student: null,
    classId: null, // 반 평균 조회를 위한 반 ID
    page: 0,
    data: [],
    averages: {},
    PER_PAGE: 5,
    unsubscribe: null,

    // 🔴 [수정됨] classData 파라미터 추가
    init(db, student, classData) {
        this.db = db;
        this.student = student;

        // [핵심] 로그인 시 선택한 반 정보(classData.id)가 있으면 그걸 쓰고, 없으면 학생 정보 사용
        this.classId = classData?.id || student.classId;

        this.page = 0;
        this.data = [];
        this.averages = {};

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        // 반 정보가 확보되었으면 평균 로드
        if (this.classId) {
            this.loadAverages();
        } else {
            console.warn("반 정보(classId)가 없어 주간테스트 평균을 로드하지 못했습니다.");
        }

        this.loadData();

        // 페이지네이션 버튼 이벤트 연결
        const prevBtn = document.getElementById('weekly-prev-btn');
        const nextBtn = document.getElementById('weekly-next-btn');

        // 리스너 중복 방지를 위해 기존 요소 교체 (복제)
        if (prevBtn) {
            const newPrev = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            newPrev.addEventListener('click', () => this.changePage(-1));
        }
        if (nextBtn) {
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            newNext.addEventListener('click', () => this.changePage(1));
        }
    },

    async loadAverages() {
        if (!this.classId) return;
        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const getAvgFn = httpsCallable(functions, 'getWeeklyTestAverages');
            const result = await getAvgFn({ classId: this.classId });
            this.averages = result.data || {};
            this.render(); // 평균값 도착 후 화면 갱신
        } catch (e) {
            console.error("주간테스트 평균 로드 실패:", e);
        }
    },

    loadData() {
        if (!this.student || !this.student.id) return;
        const listEl = document.getElementById('weekly-test-list');
        if (listEl) listEl.innerHTML = '<div class="text-center py-10 text-slate-400">데이터를 불러오는 중...</div>';

        // 내 점수(uid 기준) 가져오기
        const q = query(
            collection(this.db, 'weekly_tests'),
            where('uid', '==', this.student.id),
            orderBy('targetDate', 'desc')
        );

        this.unsubscribe = onSnapshot(q, (snap) => {
            const items = [];
            snap.forEach(doc => {
                const d = doc.data();
                // 날짜 키 생성 (서버와 동일 로직)
                const key = d.targetDate || d.weekLabel;
                items.push({
                    key: key,
                    label: key || '날짜 미상',
                    myRecord: d
                });
            });

            this.data = items;
            this.render();
        }, (error) => {
            console.error("주간테스트 로드 에러:", error);
            if (listEl) listEl.innerHTML = '<div class="text-center py-10 text-red-400">데이터를 불러올 권한이 없습니다.</div>';
        });
    },

    render() {
        const listEl = document.getElementById('weekly-test-list');
        if (!listEl) return;

        const start = this.page * this.PER_PAGE;
        const items = this.data.slice(start, start + this.PER_PAGE);

        const prevBtn = document.getElementById('weekly-prev-btn');
        const nextBtn = document.getElementById('weekly-next-btn');

        if (prevBtn) prevBtn.disabled = this.page === 0;
        if (nextBtn) nextBtn.disabled = start + this.PER_PAGE >= this.data.length;

        if (!items.length) {
            listEl.innerHTML = '<div class="text-center py-10 text-slate-400">기록이 없습니다.</div>';
            return;
        }

        listEl.innerHTML = items.map(item => {
            const rec = item.myRecord;
            // 로드해둔 평균값에서 찾기
            const classAvg = this.averages[item.key] || '-';

            let reserveInfo = '<span class="text-slate-400">정보 없음</span>';
            if (rec.examDate) {
                reserveInfo = `<span class="text-indigo-600 font-bold">${rec.examDate}</span> ${rec.examTime ? '<span class="text-slate-500 text-xs">(' + rec.examTime + ')</span>' : ''}`;
            }

            return `
            <div class="mobile-card mb-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
                <div class="flex justify-between items-start mb-3 border-b border-slate-50 pb-2">
                    <div>
                        <span class="text-xs font-bold text-slate-400 block mb-1">주간 테스트</span>
                        <h3 class="font-bold text-base text-slate-800">${item.label}</h3>
                    </div>
                    <div class="text-right">
                        ${rec.imageUrls && rec.imageUrls.length > 0 ?
                    `<button class="mb-2 text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors flex items-center gap-1 ml-auto view-images-btn" 
                                     data-urls="${rec.imageUrls.join(',')}">
                                <span class="material-icons-round text-sm">filter_none</span> 보기(${rec.imageUrls.length})
                             </button>`
                    : ''}
                        <span class="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded">예약일</span>
                        <div class="mt-1 text-xs">${reserveInfo}</div>
                    </div>
                </div>
                <div class="flex justify-between items-center bg-slate-50 rounded-xl p-3">
                    <div class="text-center w-1/2 border-r border-slate-200">
                        <p class="text-xs text-slate-500 font-bold mb-1">반 평균</p>
                        <p class="text-lg font-bold text-slate-600">${classAvg}점</p>
                    </div>
                    <div class="text-center w-1/2">
                        <p class="text-xs text-slate-500 font-bold mb-1">내 점수</p>
                        <p class="text-xl font-bold ${rec.score >= 80 ? 'text-green-600' : 'text-slate-700'}">
                            ${rec.score !== null ? rec.score + '점' : '<span class="text-yellow-600 text-sm">미응시</span>'}
                        </p>
                    </div>
                </div>
            </div>`;

        }).join('');

        // 이미지 보기 버튼 이벤트
        listEl.querySelectorAll('.view-images-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const urls = btn.dataset.urls.split(',');
                openImagePreviewModal(urls);
            });
        });
    },

    changePage(d) { this.page += d; this.render(); }
};