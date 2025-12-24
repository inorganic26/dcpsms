// src/student/studentHomework.js

import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentHomework = {
    app: null,
    unsubscribe: null,
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

        const container = document.getElementById(this.elements.listContainer);
        if (!container) return;

        container.innerHTML = '<div class="text-center py-10 text-slate-400">숙제 목록을 불러오는 중...</div>';

        const q = query(collection(db, 'homeworks'), where('classId', '==', classId));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const homeworks = [];
            snapshot.forEach(doc => {
                homeworks.push({ id: doc.id, ...doc.data() });
            });
            homeworks.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            
            this.state.homeworks = homeworks;
            this.renderList();
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

        const studentId = this.app.state.studentDocId;

        this.state.homeworks.forEach(hw => {
            const sub = hw.submissions?.[studentId];
            const isDone = sub && sub.status === 'completed';
            
            const div = document.createElement('div');
            div.className = `bg-white p-5 rounded-2xl border mb-3 shadow-sm transition-all ${isDone ? 'border-green-200 bg-green-50/30' : 'border-slate-100'}`;
            div.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <span class="text-xs font-bold px-2 py-1 rounded-md mb-2 inline-block ${isDone ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}">
                            ${isDone ? '제출 완료' : '미제출'}
                        </span>
                        <h3 class="font-bold text-slate-800 text-lg">${hw.title}</h3>
                    </div>
                    ${isDone ? '<span class="material-icons-round text-green-500">check_circle</span>' : ''}
                </div>
                <div class="text-sm text-slate-500 space-y-1 mb-4">
                    <p>📅 마감: ${hw.dueDate || '없음'}</p>
                    <p>📖 범위: ${hw.pages || '-'}</p>
                </div>
                <button class="w-full py-3 rounded-xl font-bold transition flex items-center justify-center gap-2 ${isDone ? 'bg-slate-100 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'}">
                    ${isDone ? '다시 제출하기' : '숙제 제출하기'}
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
        const title = document.getElementById(this.elements.modalTitle);
        const content = document.getElementById(this.elements.modalContent);
        const uploadSection = document.getElementById(this.elements.modalUploadSection);

        if (title) title.textContent = homework.title;
        
        if (content) {
            content.innerHTML = `
                <div class="bg-slate-50 p-4 rounded-xl mb-4 text-sm text-slate-600">
                    <p><strong>마감일:</strong> ${homework.dueDate || '없음'}</p>
                    <p><strong>페이지:</strong> ${homework.pages || '-'}</p>
                </div>
            `;
        }

        if (uploadSection) {
            uploadSection.innerHTML = `
                <div class="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50 group cursor-pointer relative">
                    <input type="file" id="homework-file-input" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer" multiple accept="image/*,.pdf">
                    <span class="material-icons-round text-4xl text-slate-300 group-hover:text-indigo-500 mb-2 transition">cloud_upload</span>
                    <p class="text-slate-500 text-sm font-medium group-hover:text-indigo-600">
                        여기를 눌러 파일을 선택하세요<br>
                        <span class="text-xs text-slate-400">(여러 장 선택 가능)</span>
                    </p>
                </div>
                <div id="selected-files-preview" class="mt-3 space-y-2 text-sm text-slate-600 max-h-40 overflow-y-auto"></div>
                <button id="real-submit-btn" class="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    제출하기
                </button>
            `;

            const fileInput = document.getElementById('homework-file-input');
            const preview = document.getElementById('selected-files-preview');
            const submitBtn = document.getElementById('real-submit-btn');

            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                
                // ✨ [추가] 0바이트 파일 필터링
                const validFiles = files.filter(f => f.size > 0);
                if (validFiles.length < files.length) {
                    showToast("내용이 없는(0KB) 파일이 제외되었습니다.", true);
                }

                this.state.selectedFiles = validFiles;
                
                if (this.state.selectedFiles.length > 0) {
                    preview.innerHTML = this.state.selectedFiles.map((f) => 
                        `<div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                            <span class="material-icons-round text-sm text-indigo-500">description</span>
                            <span class="truncate flex-1">${f.name}</span>
                            <span class="text-xs text-slate-400">${(f.size / 1024).toFixed(1)}KB</span>
                        </div>`
                    ).join('');
                    submitBtn.disabled = false;
                } else {
                    preview.innerHTML = '';
                    submitBtn.disabled = true;
                }
            });

            submitBtn.onclick = () => this.submitHomework(submitBtn);
        }

        if (modal) {
            modal.style.display = 'flex';
            modal.classList.remove('hidden');
        }
    },

    closeModal() {
        const modal = document.getElementById(this.elements.modal);
        if (modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
        this.state.selectedFiles = [];
    },

    async submitHomework(btn) {
        if (this.state.selectedFiles.length === 0) return showToast("파일을 선택해주세요.", true);
        
        // ✨ [추가] 업로드 중 이탈 방지
        window.onbeforeunload = () => "업로드 중입니다. 정말 나가시겠습니까?";
        
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = "업로드 중... (창을 닫지 마세요)";

        try {
            const storage = getStorage();
            const studentId = this.app.state.studentDocId;
            const homeworkId = this.state.selectedHomework.id;
            
            const uploadPromises = this.state.selectedFiles.map(async (file) => {
                // 파일명 중복 방지 (타임스탬프 추가)
                const uniqueName = `${Date.now()}_${file.name}`;
                const fileRef = ref(storage, `homework_submissions/${homeworkId}/${studentId}/${uniqueName}`);
                
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                return { fileName: file.name, fileUrl: url }; // 원본 이름 저장
            });

            const uploadedFiles = await Promise.all(uploadPromises);

            await updateDoc(doc(db, 'homeworks', homeworkId), {
                [`submissions.${studentId}`]: {
                    studentId: studentId,
                    studentName: this.app.state.studentName,
                    status: 'completed',
                    submittedAt: serverTimestamp(),
                    files: uploadedFiles,
                    fileUrl: uploadedFiles[0].fileUrl, // 하위 호환성
                    fileName: uploadedFiles[0].fileName
                }
            });

            showToast("제출되었습니다!", false);
            this.closeModal();

        } catch (e) {
            console.error(e);
            showToast("업로드 실패: " + e.message, true);
        } finally {
            // ✨ [추가] 이탈 방지 해제 및 버튼 복구
            window.onbeforeunload = null;
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};