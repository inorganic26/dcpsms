// src/student/studentHomework.js

import { collection, doc, getDocs, getDoc, setDoc, where, query, serverTimestamp, orderBy, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentHomework = {
    init(app) {
        this.app = app;

        // 숙제 관련 이벤트 리스너 설정
        this.app.elements.gotoHomeworkBtn?.addEventListener('click', () => this.showHomeworkScreen());
        this.app.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.app.showSubjectSelectionScreen());
        this.app.elements.closeUploadModalBtn?.addEventListener('click', () => this.closeUploadModal());
        this.app.elements.cancelUploadBtn?.addEventListener('click', () => this.closeUploadModal());
        this.app.elements.filesInput?.addEventListener('change', (e) => this.handleFileSelection(e));
        this.app.elements.uploadBtn?.addEventListener('click', () => this.handleUpload());
    },

    // 숙제 목록 화면 표시
    async showHomeworkScreen() {
        this.app.showScreen(this.app.elements.loadingScreen);
        const q = query(collection(db, 'homeworks'), where('classId', '==', this.app.state.classId), orderBy('dueDate', 'desc'));
        try {
            const homeworkSnapshot = await getDocs(q);
            const homeworks = homeworkSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
            
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const recentHomeworks = homeworks.filter(hw => (hw.dueDate && new Date(hw.dueDate) >= twoWeeksAgo));

            this.app.elements.homeworkList.innerHTML = '';
            if (recentHomeworks.length === 0) {
                this.app.elements.homeworkList.innerHTML = '<p class="text-center text-slate-500 py-8">최근 2주 내에 출제된 숙제가 없습니다.</p>';
            } else {
                for (const hw of recentHomeworks) {
                    const submissionDoc = await getDoc(doc(db, 'homeworks', hw.id, 'submissions', this.app.state.studentId));
                    this.renderHomeworkItem(hw, submissionDoc.exists() ? submissionDoc.data() : null);
                }
            }
        } catch (error) {
            console.error("숙제 로딩 실패:", error);
            this.app.elements.homeworkList.innerHTML = `<div class="text-center text-red-500 py-8"><p>숙제 목록을 불러오는 데 실패했습니다.</p><p class="text-sm text-slate-500 mt-2">관리자에게 문의하거나 잠시 후 다시 시도해주세요.</p></div>`;
        }
        this.app.showScreen(this.app.elements.homeworkScreen);
    },

    // 개별 숙제 항목 렌더링
    renderHomeworkItem(hw, submissionData) {
        const item = document.createElement('div');
        const isSubmitted = !!submissionData;
        const submittedPages = submissionData?.imageUrls?.length || 0;
        const totalPages = hw.pages || 0;
        const isComplete = submittedPages >= totalPages;

        item.className = `p-4 border rounded-lg flex items-center justify-between ${isComplete ? 'bg-green-50 border-green-200' : 'bg-white'}`;
        
        const statusHtml = isSubmitted 
            ? `<div class="flex items-center gap-2">
                 <span class="text-sm font-semibold ${isComplete ? 'text-green-700' : 'text-yellow-600'}">${isComplete ? '제출 완료' : '제출 중'} (${submittedPages}/${totalPages}p)</span>
                 <button class="edit-homework-btn text-xs bg-yellow-500 text-white font-semibold px-3 py-1 rounded-lg">수정하기</button>
               </div>`
            : `<button class="upload-homework-btn text-sm bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg">숙제 올리기</button>`;
        
        const displayDate = hw.dueDate || '기한없음';
        item.innerHTML = `
            <div>
                <p class="text-xs text-slate-500">기한: ${displayDate}</p>
                <h3 class="font-bold text-slate-800">${hw.textbookName} (${totalPages}p)</h3>
            </div>
            <div data-id="${hw.id}" data-textbook="${hw.textbookName}" data-pages="${totalPages}">${statusHtml}</div>`;
        this.app.elements.homeworkList.appendChild(item);

        item.querySelector('.upload-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement;
            this.openUploadModal(parent.dataset.id, parent.dataset.textbook, false);
        });

        item.querySelector('.edit-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement.parentElement;
            this.openUploadModal(parent.dataset.id, parent.dataset.textbook, true);
        });
    },

    // 숙제 업로드 모달 열기
    async openUploadModal(homeworkId, textbookName, isEditing = false) {
        const { state, elements } = this.app;
        state.currentHomeworkId = homeworkId;
        state.isEditingHomework = isEditing;
        state.filesToUpload = [];
        state.initialImageUrls = [];

        const homeworkDocRef = doc(db, 'homeworks', homeworkId);
        const homeworkDoc = await getDoc(homeworkDocRef);
        const totalPages = homeworkDoc.data()?.pages || 0;
        state.currentHomeworkPages = totalPages;

        elements.uploadModalTitle.textContent = `[${textbookName}] 숙제 ${isEditing ? '수정' : '업로드'}`;
        this.updateUploadButtonText(0);
        elements.previewContainer.innerHTML = '';
        elements.filesInput.value = '';

        if (isEditing) {
            const submissionDoc = await getDoc(doc(db, 'homeworks', state.currentHomeworkId, 'submissions', state.studentId));
            if (submissionDoc.exists()) {
                const existingUrls = submissionDoc.data().imageUrls || [];
                state.initialImageUrls = existingUrls;
                state.filesToUpload = existingUrls.map(url => ({ type: 'existing', url }));
                this.renderImagePreviews();
            }
        } else {
             this.renderImagePreviews();
        }

        elements.uploadModal.style.display = 'flex';
    },

    closeUploadModal() {
        const { state, elements } = this.app;
        state.currentHomeworkId = null;
        state.isEditingHomework = false;
        state.filesToUpload = [];
        state.initialImageUrls = [];
        elements.uploadModal.style.display = 'none';
    },

    // 업로드할 파일 선택 처리
    handleFileSelection(event) {
        const newFiles = Array.from(event.target.files).map(file => ({ type: 'new', file }));
        this.app.state.filesToUpload.push(...newFiles);
        this.renderImagePreviews();
    },

    updateUploadButtonText(uploadedCount) {
        const { uploadBtnText } = this.app.elements;
        const totalPages = this.app.state.currentHomeworkPages;
        uploadBtnText.textContent = `${uploadedCount} / ${totalPages} 페이지 업로드`;
    },

    // 선택된 파일 미리보기 렌더링
    renderImagePreviews() {
        this.app.elements.previewContainer.innerHTML = '';
        this.app.state.filesToUpload.forEach((fileObject, index) => {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'relative';
            
            const img = document.createElement('img');
            img.className = 'w-full h-24 object-cover rounded-md';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs';
            deleteBtn.textContent = 'X';
            deleteBtn.onclick = () => {
                this.app.state.filesToUpload.splice(index, 1);
                this.renderImagePreviews();
            };
            
            previewWrapper.appendChild(img);
            previewWrapper.appendChild(deleteBtn);

            if (fileObject.type === 'existing') {
                img.src = fileObject.url;
            } else { 
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target.result; };
                reader.readAsDataURL(fileObject.file);
            }
            this.app.elements.previewContainer.appendChild(previewWrapper);
        });
        this.updateUploadButtonText(this.app.state.filesToUpload.length);
    },

    // 파일 업로드 및 DB 저장 처리
    async handleUpload() {
        const { state } = this.app;
        if (state.filesToUpload.length === 0) { 
            showToast("업로드할 파일을 한 개 이상 선택해주세요."); 
            return; 
        }
        this.setUploadButtonLoading(true);

        const existingUrls = state.filesToUpload.filter(f => f.type === 'existing').map(f => f.url);
        const newFiles = state.filesToUpload.filter(f => f.type === 'new').map(f => f.file);

        try {
            const uploadPromises = newFiles.map((file, i) => {
                const filePath = `homeworks/${state.currentHomeworkId}/${state.studentId}/${Date.now()}_${i+1}_${file.name}`;
                const fileRef = ref(storage, filePath);
                return uploadBytes(fileRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
            const newImageUrls = await Promise.all(uploadPromises);
            const finalImageUrls = [...existingUrls, ...newImageUrls];

            const submissionRef = doc(db, 'homeworks', state.currentHomeworkId, 'submissions', state.studentId);
            const dataToSave = {
                studentName: state.studentName,
                submittedAt: serverTimestamp(),
                imageUrls: finalImageUrls
            };
            
            if (state.isEditingHomework) {
                await updateDoc(submissionRef, dataToSave);
                showToast("숙제를 성공적으로 수정했습니다.", false);
            } else {
                await setDoc(submissionRef, dataToSave);
                showToast("숙제를 성공적으로 제출했습니다.", false);
            }

            if (state.isEditingHomework) {
                const urlsToDelete = state.initialImageUrls.filter(url => !finalImageUrls.includes(url));
                if (urlsToDelete.length > 0) {
                    urlsToDelete.forEach(url => {
                        try {
                            deleteObject(ref(storage, url));
                        } catch (error) {
                            console.error("삭제 실패한 파일:", url, error);
                        }
                    });
                }
            }

            this.closeUploadModal();
            this.showHomeworkScreen();
        } catch (error) {
            console.error("업로드/수정 실패:", error);
            showToast("숙제 처리에 실패했습니다.");
        } finally {
            this.setUploadButtonLoading(false);
        }
    },

    setUploadButtonLoading(isLoading) {
        const { uploadBtn, uploadBtnText, uploadLoader } = this.app.elements;
        uploadBtnText.classList.toggle('hidden', isLoading);
        uploadLoader.classList.toggle('hidden', !isLoading);
        uploadBtn.disabled = isLoading;
    }
};