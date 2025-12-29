// src/student/studentHomework.js

import { collection, query, where, onSnapshot, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentHomework = {
    app: null,
    unsubscribe: null,
    submissionListeners: {},
    isInitialized: false,
    
    elements: {
        listContainer: 'student-homework-list',
        modal: 'student-homework-modal',
        modalTitle: 'student-homework-modal-title',
        modalContent: 'student-homework-modal-content',
        modalUploadSection: 'student-homework-upload-section',
        closeBtn: 'student-close-homework-modal-btn'
    },
    state: {
        homeworks: [],
        mySubmissions: {},
        selectedHomework: null,
        selectedFiles: [], 
    },

    init(app) {
        if (this.isInitialized) return;
        this.app = app;
        this.isInitialized = true;
        document.getElementById(this.elements.closeBtn)?.addEventListener('click', () => this.closeModal());
        if (this.app.state.studentData?.classId) {
            this.listenForHomework(this.app.state.studentData.classId);
        }
    },

    listenForHomework(classId) {
        if (this.unsubscribe) this.unsubscribe();
        Object.values(this.submissionListeners).forEach(unsub => unsub());
        this.submissionListeners = {};
        
        const q = query(collection(db, 'homeworks'), where('classId', '==', classId));
        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const homeworks = [];
            snapshot.forEach(doc => homeworks.push({ id: doc.id, ...doc.data() }));
            homeworks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            this.state.homeworks = homeworks;
            this.attachSubmissionListeners(homeworks);
            this.renderList();
        });
    },

    attachSubmissionListeners(homeworks) {
        const studentId = this.app.state.studentDocId;
        if (!studentId) return;
        homeworks.forEach(hw => {
            if (this.submissionListeners[hw.id]) return;
            const subRef = doc(db, 'homeworks', hw.id, 'submissions', studentId);
            this.submissionListeners[hw.id] = onSnapshot(subRef, (docSnap) => {
                this.state.mySubmissions[hw.id] = docSnap.exists() ? docSnap.data() : null;
                this.renderList();
            });
        });
    },

    renderList() {
        const container = document.getElementById(this.elements.listContainer);
        if (!container) return;
        container.innerHTML = '';

        if (this.state.homeworks.length === 0) {
            container.innerHTML = '<div class="text-center py-10 text-slate-400">등록된 숙제가 없습니다.</div>';
            return;
        }

        this.state.homeworks.forEach(hw => {
            const sub = this.state.mySubmissions[hw.id];
            
            // [수정] 상태별 UI 설정
            let statusBadge = `<span class="bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded">미제출</span>`;
            let borderClass = 'border-slate-100';
            let bgClass = 'bg-white';
            let icon = '';

            if (sub) {
                if (sub.status === 'completed') {
                    statusBadge = `<span class="bg-green-100 text-green-700 text-xs font-bold px-2 py-1 rounded">제출 완료</span>`;
                    borderClass = 'border-green-200';
                    bgClass = 'bg-green-50/30';
                    icon = '<span class="material-icons-round text-green-500">check_circle</span>';
                } else if (sub.status === 'partial') {
                    statusBadge = `<span class="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-1 rounded">부분 제출</span>`;
                    borderClass = 'border-orange-200';
                    bgClass = 'bg-orange-50/30';
                    icon = '<span class="material-icons-round text-orange-400">timelapse</span>';
                }
            }
            
            const div = document.createElement('div');
            div.className = `p-5 rounded-2xl border mb-3 shadow-sm transition-all ${bgClass} ${borderClass}`;
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        ${statusBadge}
                        <h3 class="font-bold text-slate-800 text-lg mt-1">${hw.title}</h3>
                    </div>
                    ${icon}
                </div>
                <div class="text-sm text-slate-500 space-y-1 mb-4">
                    <p>📅 마감: ${hw.dueDate || '없음'}</p>
                    <p>📖 범위: ${hw.pages || '-'}</p>
                </div>
                <button class="w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${sub ? 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}">
                    ${sub ? (sub.status==='partial' ? '추가 제출하기' : '다시 제출하기') : '숙제 제출하기'}
                </button>
            `;
            div.querySelector('button').onclick = () => this.openSubmitModal(hw);
            container.appendChild(div);
        });
    },

    openSubmitModal(homework) {
        this.state.selectedHomework = homework;
        this.state.selectedFiles = []; 
        const modal = document.getElementById(this.elements.modal);
        if(modal) modal.style.display = 'flex';
        
        document.getElementById(this.elements.modalTitle).textContent = homework.title;
        
        const totalPages = homework.totalPages ? Number(homework.totalPages) : 0;
        document.getElementById(this.elements.modalContent).innerHTML = `
            <div class="bg-slate-50 p-4 rounded-xl mb-4 text-sm text-slate-600">
                <p><strong>마감일:</strong> ${homework.dueDate || '없음'}</p>
                <p><strong>범위:</strong> ${homework.pages || '-'}</p>
                ${totalPages > 0 ? `<p class="mt-2 pt-2 border-t border-slate-200"><strong class="text-indigo-600">📸 필요: 총 ${totalPages}장</strong></p>` : ''}
            </div>
        `;

        this.renderUploadSection(homework);
    },

    renderUploadSection(homework) {
        const section = document.getElementById(this.elements.modalUploadSection);
        section.innerHTML = `
            <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center relative hover:border-indigo-400 hover:bg-indigo-50 transition">
                <input type="file" id="homework-file-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple accept="image/*,.pdf">
                <span class="material-icons-round text-4xl text-slate-300 mb-2">cloud_upload</span>
                <p class="text-slate-500 text-sm">파일 선택 (다중 가능)</p>
            </div>
            <div id="file-status" class="mt-2 text-right text-sm font-bold"></div>
            <div id="file-preview" class="mt-2 space-y-2 max-h-40 overflow-y-auto"></div>
            <button id="submit-btn" class="w-full mt-4 bg-indigo-600 text-white py-3 rounded-xl font-bold disabled:opacity-50" disabled>제출하기</button>
        `;

        const fileInput = document.getElementById('homework-file-input');
        const submitBtn = document.getElementById('submit-btn');
        const statusEl = document.getElementById('file-status');
        const previewEl = document.getElementById('file-preview');

        fileInput.addEventListener('change', (e) => {
            this.state.selectedFiles = Array.from(e.target.files).filter(f => f.size > 0);
            const count = this.state.selectedFiles.length;
            const required = homework.totalPages ? Number(homework.totalPages) : 0;

            if (count > 0) {
                let msg = `<span class="text-slate-500">${count}장 선택됨</span>`;
                if (required > 0) {
                    if (count >= required) msg = `<span class="text-green-600">충족 (${count}/${required})</span>`;
                    else msg = `<span class="text-orange-500">부족 (${count}/${required}) - 부분 제출</span>`;
                }
                statusEl.innerHTML = msg;
                submitBtn.disabled = false;
                
                previewEl.innerHTML = this.state.selectedFiles.map(f => 
                    `<div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded text-sm"><span class="material-icons-round text-xs">description</span> ${f.name}</div>`
                ).join('');
            } else {
                statusEl.innerHTML = '';
                previewEl.innerHTML = '';
                submitBtn.disabled = true;
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
        const required = hw.totalPages ? Number(hw.totalPages) : 0;
        const current = this.state.selectedFiles.length;
        
        // [핵심] 상태 결정 로직 (부족하면 'partial')
        let status = 'completed';
        if (required > 0 && current < required) {
            status = 'partial';
            if(!confirm(`⚠️ 총 ${required}장이 필요한데 ${current}장만 선택되었습니다.\n'부분 제출' 상태로 제출하시겠습니까?`)) return;
        }

        btn.disabled = true;
        btn.textContent = "업로드 중...";

        try {
            const storage = getStorage();
            const studentId = this.app.state.studentDocId;
            const uploads = await Promise.all(this.state.selectedFiles.map(async (file) => {
                const refPath = `homework_submissions/${hw.id}/${studentId}/${Date.now()}_${file.name}`;
                const fileRef = ref(storage, refPath);
                await uploadBytes(fileRef, file);
                return { fileName: file.name, fileUrl: await getDownloadURL(fileRef) };
            }));

            await setDoc(doc(db, 'homeworks', hw.id, 'submissions', studentId), {
                studentDocId: studentId,
                studentName: this.app.state.studentName,
                status: status, // 결정된 상태 저장
                submittedAt: serverTimestamp(),
                files: uploads,
                // 하위 호환용
                fileUrl: uploads[0].fileUrl,
                fileName: uploads[0].fileName
            }, { merge: true });

            showToast(status === 'partial' ? "부분 제출되었습니다." : "제출 완료!");
            this.closeModal();
        } catch (e) {
            console.error(e);
            showToast("제출 실패", true);
        } finally {
            btn.disabled = false;
            btn.textContent = "제출하기";
        }
    }
};