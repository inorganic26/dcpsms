// src/parent/parentHomework.js

import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export const parentHomework = {
    db: null,
    student: null,
    
    state: {
        homeworks: [],
        pastHomeworks: []
    },

    elements: {
        listContainer: 'homework-list'
    },

    init(db, student) {
        this.db = db;
        this.student = student;
    },

    async fetchHomeworks() {
        if (!this.student) return;

        const classId = this.student.classId;
        const classIds = this.student.classIds || [];

        if (!classId && classIds.length === 0) return;

        this.renderLoading();

        try {
            let allHomeworks = [];

            // 1. 메인 반
            if (classId) {
                const q = query(collection(this.db, "homeworks"), where("classId", "==", classId));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => allHomeworks.push({ id: doc.id, ...doc.data() }));
            }

            // 2. 추가 반
            if (classIds.length > 0) {
                const q2 = query(collection(this.db, "homeworks"), where("classId", "in", classIds));
                const snapshot2 = await getDocs(q2);
                snapshot2.forEach(doc => {
                    if (!allHomeworks.find(h => h.id === doc.id)) {
                        allHomeworks.push({ id: doc.id, ...doc.data() });
                    }
                });
            }

            // 3. 정렬
            allHomeworks.sort((a, b) => {
                const dateA = a.dueDate || a.endDate || "0000-00-00";
                const dateB = b.dueDate || b.endDate || "0000-00-00";
                return new Date(dateB) - new Date(dateA);
            });

            const now = new Date();
            let active = [];
            let past = [];

            // 4. 분류 (숨김 없이)
            allHomeworks.forEach(hw => {
                const dateStr = hw.dueDate || hw.endDate;
                if (!dateStr) { active.push(hw); return; }
                const endDateTime = new Date(dateStr + "T23:59:59");
                if (endDateTime < now) past.push(hw);
                else active.push(hw);
            });

            // 5. 제출 확인 (3중 체크)
            this.state.homeworks = await this.checkSubmissionStatus(active);
            this.state.pastHomeworks = await this.checkSubmissionStatus(past);

            this.renderList();

        } catch (error) {
            console.error("부모님 앱 숙제 로딩 실패:", error);
            this.renderError();
        }
    },

    // [핵심] 옛날 데이터 호환성 검색
    async checkSubmissionStatus(homeworkList) {
        if (!this.student.id) return homeworkList;

        const results = await Promise.all(homeworkList.map(async (hw) => {
            try {
                // 1. 문서 ID (최신)
                const subRef = doc(this.db, "homeworks", hw.id, "submissions", this.student.id);
                const subSnap = await getDoc(subRef);
                if (subSnap.exists()) {
                    return { ...hw, isSubmitted: true, submissionData: subSnap.data() };
                } 
                
                // 2. studentId 필드 (구형)
                const subColRef = collection(this.db, "homeworks", hw.id, "submissions");
                const q1 = query(subColRef, where("studentId", "==", this.student.id));
                const snap1 = await getDocs(q1);
                if (!snap1.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap1.docs[0].data() };
                }

                // 3. studentDocId 필드 (더 옛날)
                const q2 = query(subColRef, where("studentDocId", "==", this.student.id));
                const snap2 = await getDocs(q2);
                if (!snap2.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap2.docs[0].data() };
                }

                return { ...hw, isSubmitted: false };

            } catch (e) {
                return { ...hw, isSubmitted: false };
            }
        }));

        return results;
    },

    renderLoading() {
        const el = document.getElementById(this.elements.listContainer);
        if(el) el.innerHTML = '<div class="loader-small mx-auto mt-10"></div>';
    },

    renderError() {
        const el = document.getElementById(this.elements.listContainer);
        if(el) el.innerHTML = '<div class="text-center text-red-500 py-4">숙제 정보를 불러오지 못했습니다.</div>';
    },

    renderList() {
        const listEl = document.getElementById(this.elements.listContainer);
        if(!listEl) return;

        let html = '';

        if (this.state.homeworks.length > 0) {
            html += `<div class="mb-2 px-1 text-sm font-bold text-slate-700 flex items-center gap-2"><span class="material-icons-round text-base text-blue-500">assignment</span> 진행 중인 과제</div>`;
            html += this.state.homeworks.map(hw => this.createCard(hw)).join('');
        } else {
            html += `<div class="text-center py-8 bg-white rounded-xl border border-slate-100 mb-6 text-slate-400 text-sm">현재 진행 중인 과제가 없습니다.</div>`;
        }

        if (this.state.pastHomeworks.length > 0) {
            html += `<div class="mt-8 mb-2 px-1 text-sm font-bold text-slate-400 flex items-center gap-2 border-t border-slate-200 pt-6"><span class="material-icons-round text-base">history</span> 지난 과제</div>`;
            html += this.state.pastHomeworks.map(hw => this.createCard(hw, true)).join(''); 
        } else {
            html += `<div class="text-center py-8 text-slate-400 mt-8 pt-6 border-t border-slate-200">지난 과제 기록이 없습니다.</div>`;
        }

        listEl.innerHTML = html;
    },

    createCard(hw, isPast = false) {
        let statusBadge = `<span class="bg-red-50 text-red-500 px-2 py-1 rounded text-xs font-bold border border-red-100">미제출</span>`;
        let submissionInfo = "";
        let opacityClass = isPast ? "opacity-70 grayscale-[0.3]" : "";

        if (hw.isSubmitted) {
            const status = hw.submissionData.status;
            const submittedDate = hw.submissionData.submittedAt ? new Date(hw.submissionData.submittedAt.toDate()).toLocaleDateString() : '-';
            
            if(status === 'partial') {
                statusBadge = `<span class="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold border border-orange-100">부분 제출</span>`;
            } else {
                statusBadge = `<span class="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold border border-green-100">제출 완료</span>`;
            }
            submissionInfo = `<div class="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50 flex items-center gap-1"><span class="material-icons-round text-sm text-green-500">check_circle</span> 제출일: ${submittedDate}</div>`;
        }

        return `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-3 ${opacityClass} transition hover:shadow-md">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-slate-800 text-base leading-snug">${hw.title}</h4>
                    <div class="flex-shrink-0 ml-2">${statusBadge}</div>
                </div>
                <p class="text-xs text-slate-500 mb-3 line-clamp-2">${hw.description || '내용 없음'}</p>
                <div class="flex justify-between items-center text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">
                    <div class="flex items-center gap-1">
                        <span class="material-icons-round text-sm">event</span>
                        마감: <span class="${isPast ? '' : 'text-blue-600 font-bold'}">${hw.dueDate || hw.endDate || '없음'}</span>
                    </div>
                    <div>${hw.pages ? `범위: ${hw.pages}` : ''}</div>
                </div>
                ${submissionInfo}
            </div>
        `;
    },
    
    toggleTab() {},
    closeModal() {},
    openSubmitModal() {},
    submitHomework() {}
};