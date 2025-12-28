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
        this.state.mySubmissions = {};

        const container = document.getElementById(this.elements.listContainer);
        if (container) container.innerHTML = '<div class="text-center py-10 text-slate-400">숙제 목록을 불러오는 중...</div>';

        const q = query(collection(db, 'homeworks'), where('classId', '==', classId));

        this.unsubscribe = onSnapshot(q, (snapshot) => {
            const homeworks = [];
            snapshot.forEach(doc => {
                homeworks.push({ id: doc.id, ...doc.data() });
            });
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
                if (docSnap.exists()) {
                    this.state.mySubmissions[hw.id] = docSnap.data();
                } else {
                    this.state.mySubmissions[hw.id] = null;
                }
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
            // [수정됨] 제출 필요 장수 표시 로직
            const totalPages = homework.totalPages ? Number(homework.totalPages) : 0;
            const pagesInfo = totalPages > 0 
                ? `<p class="mt-2 pt-2 border-t border-slate-200"><strong class="text-indigo-600">📸 제출 필요: 총 ${totalPages}장</strong></p>` 
                : `<p class="mt-2 pt-2 border-t border-slate-200 text-slate-400">제출 장수 제한 없음</p>`;

            content.innerHTML = `
                <div class="bg-slate-50 p-4 rounded-xl mb-4 text-sm text-slate-600">
                    <p><strong>마감일:</strong> ${homework.dueDate || '없음'}</p>
                    <p><strong>페이지:</strong> ${homework.pages || '-'}</p>
                    ${pagesInfo}
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
                <div id="file-count-status" class="mt-2 text-sm text-right font-bold hidden"></div>
                <div id="selected-files-preview" class="mt-2 space-y-2 text-sm text-slate-600 max-h-40 overflow-y-auto"></div>
                <button id="real-submit-btn" class="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed">
                    제출하기
                </button>
            `;

            const fileInput = document.getElementById('homework-file-input');
            const preview = document.getElementById('selected-files-preview');
            const countStatus = document.getElementById('file-count-status');
            const submitBtn = document.getElementById('real-submit-btn');

            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files);
                const validFiles = files.filter(f => f.size > 0);
                
                if (validFiles.length < files.length) {
                    showToast("내용이 없는(0KB) 파일이 제외되었습니다.", true);
                }

                this.state.selectedFiles = validFiles;
                const currentCount = this.state.selectedFiles.length;
                const requiredCount = homework.totalPages ? Number(homework.totalPages) : 0;

                // [추가됨] 실시간 장수 체크 및 피드백 표시
                if (currentCount > 0) {
                    countStatus.style.display = 'block';
                    if (requiredCount > 0) {
                        if (currentCount === requiredCount) {
                            countStatus.innerHTML = `<span class="text-green-600">현재 ${currentCount}장 / 총 ${requiredCount}장 (완료)</span>`;
                        } else if (currentCount < requiredCount) {
                            countStatus.innerHTML = `<span class="text-red-500">현재 ${currentCount}장 / 총 ${requiredCount}장 (부족)</span>`;
                        } else {
                            countStatus.innerHTML = `<span class="text-orange-500">현재 ${currentCount}장 / 총 ${requiredCount}장 (초과)</span>`;
                        }
                    } else {
                        countStatus.innerHTML = `<span class="text-slate-500">현재 ${currentCount}장 선택됨</span>`;
                    }

                    preview.innerHTML = this.state.selectedFiles.map((f) => 
                        `<div class="flex items-center gap-2 bg-slate-50 px-3 py-2 rounded-lg">
                            <span class="material-icons-round text-sm text-indigo-500">description</span>
                            <span class="truncate flex-1">${f.name}</span>
                            <span class="text-xs text-slate-400">${(f.size / 1024).toFixed(1)}KB</span>
                        </div>`
                    ).join('');
                    submitBtn.disabled = false;
                } else {
                    countStatus.style.display = 'none';
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
        
        // 제출 전 장수 확인 (경고만 띄우고 막지는 않음)
        const requiredCount = this.state.selectedHomework.totalPages ? Number(this.state.selectedHomework.totalPages) : 0;
        const currentCount = this.state.selectedFiles.length;

        if (requiredCount > 0 && currentCount < requiredCount) {
            if(!confirm(`⚠️ 사진이 ${requiredCount}장 필요한데, ${currentCount}장만 선택되었습니다.\n그래도 제출하시겠습니까?`)) {
                return;
            }
        }
        
        window.onbeforeunload = () => "업로드 중입니다. 정말 나가시겠습니까?";
        
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.textContent = "업로드 중... (창을 닫지 마세요)";

        try {
            const storage = getStorage();
            const studentId = this.app.state.studentDocId;
            const homeworkId = this.state.selectedHomework.id;
            
            const uploadPromises = this.state.selectedFiles.map(async (file) => {
                const uniqueName = `${Date.now()}_${file.name}`;
                const fileRef = ref(storage, `homework_submissions/${homeworkId}/${studentId}/${uniqueName}`);
                await uploadBytes(fileRef, file);
                const url = await getDownloadURL(fileRef);
                return { fileName: file.name, fileUrl: url };
            });

            const uploadedFiles = await Promise.all(uploadPromises);

            const submissionRef = doc(db, 'homeworks', homeworkId, 'submissions', studentId);

            await setDoc(submissionRef, {
                studentDocId: studentId,
                studentName: this.app.state.studentName,
                status: 'completed',
                submittedAt: serverTimestamp(),
                files: uploadedFiles,
                fileUrl: uploadedFiles[0].fileUrl,
                fileName: uploadedFiles[0].fileName
            }, { merge: true });

            showToast("제출되었습니다!", false);
            this.closeModal();

        } catch (e) {
            console.error(e);
            showToast("업로드 실패: " + e.message, true);
        } finally {
            window.onbeforeunload = null;
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }
};