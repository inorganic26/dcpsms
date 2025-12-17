// src/student/studentHomework.js

import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

const studentHomework = {
    app: null,
    unsubscribe: null,
    isInitialized: false,
    elements: { listContainer: 'student-homework-list', modal: 'student-homework-modal', modalTitle: 'student-homework-modal-title', modalContent: 'student-homework-modal-content', modalUploadSection: 'student-homework-upload-section', closeBtn: 'student-close-homework-modal-btn' },
    state: { homeworks: [], selectedHomework: null, selectedFile: null },

    init(app) {
        if (this.isInitialized) return;
        this.app = app;
        this.isInitialized = true;
        document.getElementById(this.elements.closeBtn)?.addEventListener('click', () => this.closeModal());
        if (this.app.state.studentData?.classId) this.listenForHomework(this.app.state.studentData.classId);
    },

    listenForHomework(classId) {
        if (this.unsubscribe) this.unsubscribe();
        const container = document.getElementById(this.elements.listContainer);
        if (!container) return;
        container.innerHTML = '<div class="text-center py-4 text-slate-400">숙제를 불러오는 중...</div>';

        const q = query(collection(db, 'homeworks'), where('classId', '==', classId));
        this.unsubscribe = onSnapshot(q, (snapshot) => {
            this.state.homeworks = [];
            snapshot.forEach(doc => this.state.homeworks.push({ id: doc.id, ...doc.data() }));
            this.state.homeworks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            this.renderList();
        });
    },

    renderList() {
        const container = document.getElementById(this.elements.listContainer);
        if (!container) return;
        container.innerHTML = '';
        if (this.state.homeworks.length === 0) { container.innerHTML = '<div class="text-center py-10 text-slate-400">등록된 숙제가 없습니다.</div>'; return; }

        this.state.homeworks.forEach(hw => {
            const sub = hw.submissions?.[this.app.state.studentDocId];
            const isDone = sub && sub.status === 'completed';
            const div = document.createElement('div');
            div.className = `p-4 rounded-xl border mb-3 shadow-sm transition cursor-pointer flex justify-between items-center ${isDone ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}`;
            div.innerHTML = `<div><h4 class="font-bold text-slate-800">${hw.title}</h4><p class="text-xs text-slate-500">마감: ${hw.dueDate || '-'} | 페이지: ${hw.pages || '-'}</p></div><div class="text-right">${isDone ? '<span class="px-3 py-1 rounded-full bg-green-200 text-green-800 text-xs font-bold">완료</span>' : '<span class="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-xs font-bold">미제출</span>'}</div>`;
            div.onclick = () => this.openModal(hw);
            container.appendChild(div);
        });
    },

    openModal(homework) {
        this.state.selectedHomework = homework;
        this.state.selectedFile = null;
        const modal = document.getElementById(this.elements.modal);
        if (!modal) return;

        document.getElementById(this.elements.modalTitle).textContent = homework.title;
        const sub = homework.submissions?.[this.app.state.studentDocId];
        const isDone = sub?.status === 'completed';

        document.getElementById(this.elements.modalContent).innerHTML = `
            <div class="space-y-2 text-sm text-slate-600 mb-6"><p><strong>페이지:</strong> ${homework.pages || '-'}</p><p><strong>상태:</strong> ${isDone ? '<span class="text-green-600 font-bold">제출 완료</span>' : '<span class="text-red-500 font-bold">미제출</span>'}</p>${sub?.fileUrl ? `<a href="${sub.fileUrl}" target="_blank" class="text-blue-600 underline text-xs">제출 파일 보기</a>` : ''}</div>`;

        document.getElementById(this.elements.modalUploadSection).innerHTML = `
            <div class="border-t pt-4"><input type="file" id="hw-file" class="hidden" accept="image/*,.pdf"><button id="hw-trigger" class="w-full py-3 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl font-bold mb-3 flex items-center justify-center gap-2"><span class="material-icons">camera_alt</span> ${isDone ? '다시 제출' : '파일/카메라'}</button><div id="hw-preview" class="hidden flex items-center justify-between bg-slate-100 p-3 rounded-lg mb-3"><span id="hw-fname" class="truncate text-sm"></span><button id="hw-cancel" class="text-red-500">X</button></div><button id="hw-submit" class="w-full btn-primary py-3 rounded-xl font-bold">제출하기</button></div>`;

        const fileInput = document.getElementById('hw-file');
        document.getElementById('hw-trigger').onclick = () => fileInput.click();
        fileInput.onchange = (e) => {
            if (e.target.files[0]) {
                this.state.selectedFile = e.target.files[0];
                document.getElementById('hw-fname').textContent = e.target.files[0].name;
                document.getElementById('hw-trigger').classList.add('hidden');
                document.getElementById('hw-preview').classList.remove('hidden');
            }
        };
        document.getElementById('hw-cancel').onclick = () => {
            this.state.selectedFile = null;
            fileInput.value = '';
            document.getElementById('hw-preview').classList.add('hidden');
            document.getElementById('hw-trigger').classList.remove('hidden');
        };
        document.getElementById('hw-submit').onclick = (e) => this.submitHomework(e.target);

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    },

    closeModal() {
        const modal = document.getElementById(this.elements.modal);
        if (modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
    },

    async submitHomework(btn) {
        if (!this.state.selectedFile) return showToast("파일을 선택해주세요.", true);
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = "업로드 중...";

        try {
            const storage = getStorage();
            const fileRef = ref(storage, `homework_submissions/${this.state.selectedHomework.id}/${this.app.state.studentDocId}/${this.state.selectedFile.name}`);
            await uploadBytes(fileRef, this.state.selectedFile);
            const url = await getDownloadURL(fileRef);

            await updateDoc(doc(db, 'homeworks', this.state.selectedHomework.id), {
                [`submissions.${this.app.state.studentDocId}`]: {
                    studentId: this.app.state.studentDocId,
                    studentName: this.app.state.studentName,
                    status: 'completed',
                    submittedAt: serverTimestamp(),
                    fileUrl: url,
                    fileName: this.state.selectedFile.name
                }
            });
            showToast("제출되었습니다!", false);
            this.closeModal();
        } catch (e) { showToast("실패: " + e.message, true); btn.disabled = false; btn.innerHTML = originalText; }
    }
};

export { studentHomework };
export default studentHomework;