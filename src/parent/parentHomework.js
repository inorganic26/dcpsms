// src/parent/parentHomework.js
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";

export const parentHomework = {
    db: null,
    student: null,
    
    init(db, student) {
        this.db = db;
        this.student = student;
    },

    async render() {
        const listEl = document.getElementById('homework-list');
        if(!this.student.classId) return;

        listEl.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            // 1. 반 숙제 목록
            const q = query(collection(this.db, 'homeworks'), where('classId', '==', this.student.classId), orderBy('createdAt', 'desc'));
            const hwSnap = await getDocs(q);
            
            if(hwSnap.empty) {
                listEl.innerHTML = '<div class="text-center py-10 text-slate-400">등록된 숙제가 없습니다.</div>';
                return;
            }

            let html = '';
            // 2. 각 숙제별 제출 상태 확인
            for(const d of hwSnap.docs) {
                const hw = { id: d.id, ...d.data() };
                
                // 제출 기록 조회
                const subRef = doc(this.db, 'homeworks', hw.id, 'submissions', this.student.id);
                const subSnap = await getDoc(subRef);
                const sub = subSnap.exists() ? subSnap.data() : null;

                // 상태 판별
                let statusBadge = '<span class="bg-red-100 text-red-500 text-xs font-bold px-2 py-1 rounded">미제출</span>';
                if(sub) {
                    if(sub.status === 'completed' || sub.manualComplete) 
                        statusBadge = '<span class="bg-green-100 text-green-600 text-xs font-bold px-2 py-1 rounded">제출 완료</span>';
                    else if(sub.status === 'partial')
                        statusBadge = '<span class="bg-orange-100 text-orange-600 text-xs font-bold px-2 py-1 rounded">부분 제출</span>';
                }

                html += `
                <div class="mobile-card flex justify-between items-center">
                    <div>
                        <div class="mb-1">${statusBadge}</div>
                        <h3 class="font-bold text-slate-800">${hw.title}</h3>
                        <p class="text-xs text-slate-400 mt-1">마감: ${hw.dueDate || '없음'}</p>
                    </div>
                    <div class="text-right text-xs text-slate-500">
                        ${sub ? '제출일: ' + new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-'}
                    </div>
                </div>`;
            }
            listEl.innerHTML = html;

        } catch(e) { console.error(e); }
    }
};