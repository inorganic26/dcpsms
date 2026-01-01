// src/student/studentHomework.js

import { db, storage } from "../shared/firebase.js";
import { 
    collection, query, where, getDocs, doc, getDoc, setDoc, orderBy, serverTimestamp 
} from "firebase/firestore";
import { 
    ref, uploadBytes, getDownloadURL 
} from "firebase/storage";
import { showToast } from "../shared/utils.js";

export const studentHomework = {
    app: null,
    state: {
        homeworks: [],      
        pastHomeworks: [],  
        loading: false,
        selectedHomework: null,
        selectedFiles: []
    },

    elements: {
        listContainer: 'student-homework-list',
        modal: 'student-homework-modal',
        modalTitle: 'student-homework-modal-title',
        modalContent: 'student-homework-modal-content',
        modalUploadSection: 'student-homework-upload-section',
        closeBtn: 'student-close-homework-modal-btn'
    },

    init(app) {
        this.app = app;
        const closeBtn = document.getElementById(this.elements.closeBtn);
        if(closeBtn) {
            const newBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newBtn, closeBtn);
            newBtn.addEventListener('click', () => this.closeModal());
        }
    },

    async fetchHomeworks() {
        if (!this.app || !this.app.state.studentData) return;

        const studentId = this.app.state.studentDocId;
        const classId = this.app.state.studentData.classId;
        const classIds = this.app.state.studentData.classIds || [];

        if (!classId && classIds.length === 0) return;

        this.renderLoading();

        try {
            let allHomeworks = [];

            // 1. 메인 반 (모든 날짜 가져옴)
            if (classId) {
                const q = query(collection(db, "homeworks"), where("classId", "==", classId));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => allHomeworks.push({ id: doc.id, ...doc.data() }));
            }

            // 2. 추가 반 (모든 날짜 가져옴)
            if (classIds.length > 0) {
                const q2 = query(collection(db, "homeworks"), where("classId", "in", classIds));
                const snapshot2 = await getDocs(q2);
                snapshot2.forEach(doc => {
                    if (!allHomeworks.find(h => h.id === doc.id)) {
                        allHomeworks.push({ id: doc.id, ...doc.data() });
                    }
                });
            }

            // 3. 정렬 (날짜 없으면 맨 뒤로, 최신순)
            allHomeworks.sort((a, b) => {
                const dateA = a.dueDate || a.endDate || "0000-00-00";
                const dateB = b.dueDate || b.endDate || "0000-00-00";
                return new Date(dateB) - new Date(dateA);
            });

            const now = new Date();
            let active = [];
            let past = [];

            // 4. 분류 (필터링 없이 모두 표시)
            allHomeworks.forEach(hw => {
                const dateStr = hw.dueDate || hw.endDate;
                if (!dateStr) {
                    active.push(hw);
                    return;
                }
                const endDateTime = new Date(dateStr + "T23:59:59");
                if (endDateTime < now) {
                    past.push(hw);
                } else {
                    active.push(hw);
                }
            });

            // 5. 제출 확인 (강화된 로직 적용)
            this.state.homeworks = await this.checkSubmissionStatus(active);
            this.state.pastHomeworks = await this.checkSubmissionStatus(past);

            this.renderList();

        } catch (error) {
            console.error("숙제 로딩 에러:", error);
            this.renderError();
        }
    },

    // [핵심] 23일 이전 숙제 호환성 해결을 위한 3단계 확인
    async checkSubmissionStatus(homeworkList) {
        const studentId = this.app.state.studentDocId;
        if (!studentId) return homeworkList;

        const results = await Promise.all(homeworkList.map(async (hw) => {
            try {
                // 1. [정석] 문서 ID가 학생 ID인 경우
                const subRef = doc(db, "homeworks", hw.id, "submissions", studentId);
                const subSnap = await getDoc(subRef);
                if (subSnap.exists()) {
                    return { ...hw, isSubmitted: true, submissionData: subSnap.data() };
                } 
                
                // 2. [호환 1] studentId 필드로 저장된 경우 (문서 ID가 랜덤일 때)
                const subColRef = collection(db, "homeworks", hw.id, "submissions");
                const q1 = query(subColRef, where("studentId", "==", studentId));
                const snap1 = await getDocs(q1);
                if (!snap1.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap1.docs[0].data() };
                }

                // 3. [호환 2] studentDocId 필드로 저장된 경우 (더 옛날 데이터)
                const q2 = query(subColRef, where("studentDocId", "==", studentId));
                const snap2 = await getDocs(q2);
                if (!snap2.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap2.docs[0].data() };
                }

                return { ...hw, isSubmitted: false };

            } catch (e) {
                console.error(e);
                return { ...hw, isSubmitted: false };
            }
        }));

        return results;
    },

    renderLoading() {
        const el = document.getElementById(this.elements.listContainer);
        if(el) el.innerHTML = '<div class="p-8 text-center text-slate-400">숙제 정보를 가져오는 중...</div>';
    },

    renderError() {
        const el = document.getElementById(this.elements.listContainer);
        if(el) el.innerHTML = '<div class="p-8 text-center text-red-500">데이터를 불러오지 못했습니다.</div>';
    },

    renderList() {
        const container = document.getElementById(this.elements.listContainer);
        if (!container) return;

        let html = '';

        // 해야 할 숙제
        if (this.state.homeworks.length > 0) {
            html += `<h3 class="font-bold text-indigo-800 mb-3 px-1 flex items-center gap-2 mt-2"><span class="material-icons-round text-base">assignment</span> 해야 할 숙제</h3>`;
            html += this.state.homeworks.map(hw => this.createHomeworkCard(hw, true)).join('');
        } else {
            html += `<div class="text-center py-8 text-slate-400 bg-white rounded-2xl border border-slate-100 mb-6">현재 진행 중인 숙제가 없습니다 👍</div>`;
        }

        // 지난 숙제
        if (this.state.pastHomeworks.length > 0) {
            html += `<h3 class="font-bold text-slate-500 mb-3 px-1 flex items-center gap-2 mt-8 pt-6 border-t border-slate-200"><span class="material-icons-round text-base">history</span> 지난 숙제 기록</h3>`;
            html += this.state.pastHomeworks.map(hw => this.createHomeworkCard(hw, false)).join('');
        } else {
             html += `<div class="text-center py-8 text-slate-400 mt-8 pt-6 border-t border-slate-200">지난 숙제 기록이 없습니다.</div>`;
        }

        container.innerHTML = html;
        this.bindSubmitButtons(container);
    },

    bindSubmitButtons(container) {
        container.querySelectorAll('.homework-submit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.openSubmitModal(e.currentTarget.dataset.id));
        });
    },

    createHomeworkCard(hw, isActive) {
        let statusBadge = `<span class="bg-red-100 text-red-600 px-2 py-1 rounded text-xs font-bold">미제출</span>`;
        let btnText = "제출하기";
        let btnClass = "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200";
        let opacityClass = (!isActive) ? "opacity-75 grayscale-[0.2]" : "";

        if (hw.isSubmitted) {
            const status = hw.submissionData.status;
            if(status === 'partial') {
                statusBadge = `<span class="bg-orange-100 text-orange-600 px-2 py-1 rounded text-xs font-bold">부분 제출</span>`;
                btnText = "추가 제출";
            } else {
                statusBadge = `<span class="bg-green-100 text-green-600 px-2 py-1 rounded text-xs font-bold">제출 완료</span>`;
                btnText = "다시 제출";
                btnClass = "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50";
            }
        }

        return `
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm mb-3 ${opacityClass}">
                <div class="flex justify-between items-start mb-2">
                    <h3 class="font-bold text-lg text-slate-800">${hw.title}</h3>
                    ${statusBadge}
                </div>
                <p class="text-sm text-slate-500 mb-4">${hw.description || '내용 없음'}</p>
                <div class="flex justify-between items-center border-t pt-3 border-slate-50">
                    <span class="text-xs text-slate-400">마감: ${hw.dueDate || hw.endDate || '없음'}</span>
                    <button class="homework-submit-btn px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition active:scale-95 flex items-center gap-1 ${btnClass}" data-id="${hw.id}">
                        ${btnText}
                    </button>
                </div>
            </div>
        `;
    },

    openSubmitModal(homeworkId) {
        const hw = [...this.state.homeworks, ...this.state.pastHomeworks].find(h => h.id === homeworkId);
        if(!hw) return;
        this.state.selectedHomework = hw;
        this.state.selectedFiles = [];

        const modal = document.getElementById(this.elements.modal);
        if(modal) modal.style.display = 'flex';

        document.getElementById(this.elements.modalTitle).textContent = hw.title;
        document.getElementById(this.elements.modalContent).innerHTML = `
             <div class="text-sm text-slate-600 mb-4">
                <p>마감: ${hw.dueDate || hw.endDate || '없음'}</p>
                <p>범위: ${hw.pages || '-'}</p>
            </div>
        `;
        this.renderUploadSection(hw);
    },

    renderUploadSection(homework) {
        const section = document.getElementById(this.elements.modalUploadSection);
        section.innerHTML = `
            <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center relative hover:bg-slate-50 transition">
                <input type="file" id="homework-file-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple accept="image/*,.pdf">
                <span class="material-icons-round text-3xl text-slate-300">cloud_upload</span>
                <p class="text-xs text-slate-400 mt-1">파일 선택 (이미지, PDF)</p>
            </div>
            <div id="file-preview" class="mt-2 space-y-1 max-h-32 overflow-y-auto"></div>
            <button id="submit-btn" class="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold disabled:opacity-50" disabled>제출하기</button>
        `;

        const fileInput = document.getElementById('homework-file-input');
        const submitBtn = document.getElementById('submit-btn');
        const previewEl = document.getElementById('file-preview');

        fileInput.addEventListener('change', (e) => {
            this.state.selectedFiles = Array.from(e.target.files);
            if (this.state.selectedFiles.length > 0) {
                submitBtn.disabled = false;
                previewEl.innerHTML = this.state.selectedFiles.map(f => 
                    `<div class="text-xs bg-slate-100 p-2 rounded flex items-center gap-2"><span class="material-icons-round text-xs">description</span> ${f.name}</div>`
                ).join('');
            } else {
                submitBtn.disabled = true;
                previewEl.innerHTML = '';
            }
        });

        submitBtn.onclick = () => this.submitHomework(submitBtn);
    },

    closeModal() {
        const modal = document.getElementById(this.elements.modal);
        if(modal) modal.style.display = 'none';
        this.state.selectedFiles = [];
    },

    async submitHomework(btn) {
        if (!this.state.selectedFiles.length) return;
        const hw = this.state.selectedHomework;
        btn.disabled = true;
        btn.textContent = "업로드 중...";

        try {
            const studentId = this.app.state.studentDocId;
            const uploads = await Promise.all(this.state.selectedFiles.map(async (file) => {
                const refPath = `homework_submissions/${hw.id}/${studentId}/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, refPath);
                await uploadBytes(fileRef, file);
                return { fileName: file.name, fileUrl: await getDownloadURL(fileRef) };
            }));

            const required = hw.totalPages ? Number(hw.totalPages) : 0;
            const current = this.state.selectedFiles.length;
            const status = (required > 0 && current < required) ? 'partial' : 'completed';

            // [중요] 모든 호환 필드 저장
            await setDoc(doc(db, 'homeworks', hw.id, 'submissions', studentId), {
                studentDocId: studentId,
                studentId: studentId,
                studentName: this.app.state.studentName,
                status: status, 
                submittedAt: serverTimestamp(),
                files: uploads,
                fileUrl: uploads[0].fileUrl
            }, { merge: true });

            showToast("제출되었습니다!");
            this.closeModal();
            this.fetchHomeworks(); 

        } catch (e) {
            console.error(e);
            showToast("제출 실패", true);
        } finally {
            btn.disabled = false;
            btn.textContent = "제출하기";
        }
    }
};