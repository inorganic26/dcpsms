// src/student/studentHomework.js

import { collection, doc, getDocs, getDoc, setDoc, where, query, serverTimestamp, orderBy, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

const studentHomework = {
    unsubscribe: null,
    // 👇 수정: 로딩 상태 플래그 추가
    isLoading: false,

    init(app) {
        this.app = app;

        // 숙제 관련 이벤트 리스너 설정
        this.app.elements.gotoHomeworkCard?.addEventListener('click', () => this.showHomeworkScreen());
        this.app.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.app.showSubjectSelectionScreen());
        this.app.elements.closeUploadModalBtn?.addEventListener('click', () => this.closeUploadModal());
        this.app.elements.cancelUploadBtn?.addEventListener('click', () => this.closeUploadModal());
        this.app.elements.filesInput?.addEventListener('change', (e) => this.handleFileSelection(e));
        this.app.elements.uploadBtn?.addEventListener('click', () => this.handleUpload());
    },

    // 숙제 목록 화면 표시
    async showHomeworkScreen() {
        // 👇 수정: 로딩 중이면 중복 실행 방지
        if (this.isLoading) {
            console.log("[studentHomework] showHomeworkScreen skipped, already loading.");
            return;
        }
        this.isLoading = true; // 로딩 시작 플래그 설정
        console.log("[studentHomework] showHomeworkScreen started.");


        const homeworkListEl = this.app.elements.homeworkList;
        if (!homeworkListEl) {
            console.error("[studentHomework] homeworkList element not found in cache!");
            showToast("숙제 목록 영역을 찾을 수 없습니다.", true);
            this.app.showSubjectSelectionScreen();
            this.isLoading = false; // 로딩 종료 플래그 설정
            return;
        }

        // 화면 전환 전에 목록 비우기 및 로딩 표시
        homeworkListEl.innerHTML = '<div class="loader mx-auto my-4"></div>';
        this.app.showScreen(this.app.elements.homeworkScreen); // 로딩 표시 후 화면 전환


        if (!this.app.state.classId) {
            homeworkListEl.innerHTML = '<p class="text-center text-slate-500 py-8">배정된 반이 없어 숙제를 확인할 수 없습니다.</p>';
            // this.app.showScreen(this.app.elements.homeworkScreen); // 이미 위에서 호출됨
            this.isLoading = false; // 로딩 종료 플래그 설정
            return;
        }
        if (!this.app.state.studentDocId) {
            showToast("학생 정보(문서 ID)가 없습니다. 다시 로그인해주세요.", true);
            homeworkListEl.innerHTML = '<p class="text-center text-red-500 py-8">학생 정보를 찾을 수 없습니다.</p>';
            // this.app.showScreen(this.app.elements.homeworkScreen); // 이미 위에서 호출됨
            this.isLoading = false; // 로딩 종료 플래그 설정
            return;
        }


        const homeworksQuery = query(
            collection(db, 'homeworks'),
            where('classId', '==', this.app.state.classId),
            orderBy('dueDate', 'desc')
        );

        try {
            const homeworkSnapshot = await getDocs(homeworksQuery);
            const homeworks = homeworkSnapshot.docs.map(d => ({id: d.id, ...d.data()}));

            const oneMonthAgo = new Date();
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
            const recentHomeworks = homeworks.filter(hw => {
                if (!hw.dueDate) return true;
                const dueDate = new Date(hw.dueDate);
                return dueDate >= oneMonthAgo;
            });

            homeworkListEl.innerHTML = ''; // 실제 렌더링 전 다시 비우기
            if (recentHomeworks.length === 0) {
                homeworkListEl.innerHTML = '<p class="text-center text-slate-500 py-8">최근 1개월 내에 출제된 숙제가 없습니다.</p>';
            } else {
                const submissionPromises = recentHomeworks.map(hw =>
                    getDoc(doc(db, 'homeworks', hw.id, 'submissions', this.app.state.studentDocId))
                );
                const submissionSnapshots = await Promise.all(submissionPromises);

                recentHomeworks.forEach((hw, index) => {
                    const submissionDoc = submissionSnapshots[index];
                    this.renderHomeworkItem(hw, submissionDoc.exists() ? submissionDoc.data() : null);
                });
            }
        } catch (error) {
            console.error("숙제 로딩 실패:", error);
            homeworkListEl.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <p>숙제 목록을 불러오는 데 실패했습니다.</p>
                    <p class="text-sm text-slate-500 mt-2">관리자에게 문의하거나 잠시 후 다시 시도해주세요.</p>
                </div>`;
        } finally {
             // 👇 수정: 로딩 종료 플래그 설정
            this.isLoading = false;
            console.log("[studentHomework] showHomeworkScreen finished.");
        }
        // this.app.showScreen(this.app.elements.homeworkScreen); // 로딩 표시 후 바로 전환하므로 여기서는 제거
    },

    // 개별 숙제 항목 렌더링 (변경 없음)
    renderHomeworkItem(hw, submissionData) {
        const homeworkListEl = this.app.elements.homeworkList;
        if (!homeworkListEl) return;

        const item = document.createElement('div');
        const isSubmitted = !!submissionData;
        const submittedPages = submissionData?.imageUrls?.length || 0;
        const totalPages = hw.pages || 0;
        const isComplete = totalPages > 0 && submittedPages >= totalPages;

        item.className = `p-4 border rounded-lg flex items-center justify-between ${isComplete ? 'bg-green-50 border-green-200' : 'bg-white'}`;

        const pagesInfo = totalPages ? `(${submittedPages}/${totalPages}p)` : `(${submittedPages}p)`;
        const statusHtml = isSubmitted
            ? `<div class="flex items-center gap-2">
                 <span class="text-sm font-semibold ${isComplete ? 'text-green-700' : 'text-yellow-600'}">${isComplete ? '제출 완료' : '제출 중'} ${pagesInfo}</span>
                 <button class="edit-homework-btn text-xs bg-yellow-500 text-white font-semibold px-3 py-1 rounded-lg hover:bg-yellow-600 transition">수정하기</button>
               </div>`
            : `<button class="upload-homework-btn text-sm bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-blue-700 transition">숙제 올리기</button>`;

        const displayDate = hw.dueDate || '기한없음';
        const titlePages = totalPages ? `(${totalPages}p)` : '';
        item.innerHTML = `
            <div>
                <p class="text-xs text-slate-500">기한: ${displayDate}</p>
                <h3 class="font-bold text-slate-800">${hw.textbookName} ${titlePages}</h3>
            </div>
            <div data-id="${hw.id}" data-textbook="${hw.textbookName}" data-pages="${totalPages}">${statusHtml}</div>`;
        homeworkListEl.appendChild(item);

        item.querySelector('.upload-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement;
            this.openUploadModal(parent.dataset.id, parent.dataset.textbook, false);
        });

        item.querySelector('.edit-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement.parentElement;
            this.openUploadModal(parent.dataset.id, parent.dataset.textbook, true);
        });
    },

    // 숙제 업로드 모달 열기 (변경 없음)
    async openUploadModal(homeworkId, textbookName, isEditing = false) {
        const { state, elements } = this.app;
        if (!state.studentDocId) {
            showToast("학생 정보(문서 ID)가 없습니다. 다시 로그인해주세요.", true);
            return;
        }

        state.currentHomeworkId = homeworkId;
        state.isEditingHomework = isEditing;
        state.filesToUpload = [];
        state.initialImageUrls = [];

        try {
            const homeworkDocRef = doc(db, 'homeworks', homeworkId);
            const homeworkDoc = await getDoc(homeworkDocRef);
            const totalPages = homeworkDoc.data()?.pages;
            state.currentHomeworkPages = (typeof totalPages === 'number' && totalPages > 0) ? totalPages : 0;

            elements.uploadModalTitle.textContent = `[${textbookName}] 숙제 ${isEditing ? '수정' : '업로드'}`;
            this.updateUploadButtonText(0);
            elements.previewContainer.innerHTML = '';
            elements.filesInput.value = '';

            if (isEditing) {
                const submissionDoc = await getDoc(doc(db, 'homeworks', state.currentHomeworkId, 'submissions', state.studentDocId));
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
        } catch (error) {
            console.error("모달 열기 실패:", error);
            showToast("숙제 정보를 불러오는 데 실패했습니다.");
        }
    },

    // 모달 닫기 (변경 없음)
    closeUploadModal() {
        const { state, elements } = this.app;
        state.currentHomeworkId = null;
        state.isEditingHomework = false;
        state.filesToUpload = [];
        state.initialImageUrls = [];
        state.currentHomeworkPages = 0;
        elements.uploadModal.style.display = 'none';
    },

    // 파일 선택 처리 (변경 없음)
    handleFileSelection(event) {
        const newFiles = Array.from(event.target.files).map(file => ({ type: 'new', file }));
        const currentCount = this.app.state.filesToUpload.length;
        const totalPages = this.app.state.currentHomeworkPages;

        if (totalPages > 0 && currentCount + newFiles.length > totalPages) {
            showToast(`최대 ${totalPages}페이지만 업로드할 수 있습니다. (${currentCount}개 선택됨)`);
            event.target.value = '';
            return;
        }

        this.app.state.filesToUpload.push(...newFiles);
        this.renderImagePreviews();
        event.target.value = '';
    },

    // 업로드 버튼 텍스트 업데이트 (변경 없음)
    updateUploadButtonText(uploadedCount) {
        const { uploadBtnText } = this.app.elements;
        const totalPages = this.app.state.currentHomeworkPages;
        const totalText = totalPages > 0 ? `/ ${totalPages}` : '';
        if (uploadBtnText) {
            uploadBtnText.textContent = `${uploadedCount} ${totalText} 페이지 업로드`;
        }
    },

    // 이미지 미리보기 렌더링 (변경 없음)
    renderImagePreviews() {
        // 👇 수정: previewContainer 요소 null 체크 추가
        const previewContainerEl = this.app.elements.previewContainer;
        if (!previewContainerEl) {
            console.error("[studentHomework] previewContainer element not found!");
            return;
        }
        previewContainerEl.innerHTML = '';
        this.app.state.filesToUpload.forEach((fileObject, index) => {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'relative';

            const img = document.createElement('img');
            img.className = 'w-full h-24 object-cover rounded-md border border-slate-200';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition shadow-md';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = (e) => {
                e.preventDefault(); e.stopPropagation();
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
            previewContainerEl.appendChild(previewWrapper); // 수정: previewContainerEl 사용
        });
        this.updateUploadButtonText(this.app.state.filesToUpload.length);
    },

    // 업로드 처리 (변경 없음)
    async handleUpload() {
        const { state } = this.app;

        if (!state.studentDocId) {
            showToast("학생 정보(문서 ID)가 없습니다. 다시 로그인해주세요.", true);
            return;
        }
        if (state.filesToUpload.length === 0 && !state.isEditingHomework) {
            showToast("업로드할 파일을 한 개 이상 선택해주세요.");
            return;
        }

        this.setUploadButtonLoading(true);

        const existingUrls = state.filesToUpload.filter(f => f.type === 'existing').map(f => f.url);
        const newFiles = state.filesToUpload.filter(f => f.type === 'new').map(f => f.file);

        try {
            let finalImageUrls = existingUrls;

            if (newFiles.length > 0) {
                 const uploadPromises = newFiles.map((file, i) => {
                    const timestamp = Date.now();
                    const filePath = `homeworks/${state.currentHomeworkId}/${state.studentDocId}/${timestamp}_${i+1}_${file.name}`;
                    const fileRef = ref(storage, filePath);
                    return uploadBytes(fileRef, file).then(snapshot => getDownloadURL(snapshot.ref));
                });
                const newImageUrls = await Promise.all(uploadPromises);
                finalImageUrls = [...existingUrls, ...newImageUrls];
            }

            const submissionRef = doc(db, 'homeworks', state.currentHomeworkId, 'submissions', state.studentDocId);
            const dataToSave = {
                studentName: state.studentName,
                submittedAt: serverTimestamp(),
                imageUrls: finalImageUrls,
                studentDocId: state.studentDocId // 필드 추가
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
                            const fileRef = ref(storage, url);
                            deleteObject(fileRef).catch(err => { console.error("파일 삭제 실패:", url, err); });
                        } catch (error) { console.error("파일 참조 생성 실패:", url, error); }
                    });
                }
            }

            this.closeUploadModal();
            await this.showHomeworkScreen();
        } catch (error) {
            console.error("업로드/수정 실패:", error);
            showToast("숙제 처리에 실패했습니다. 다시 시도해주세요.");
        } finally {
            this.setUploadButtonLoading(false);
        }
    },

    // 로딩 상태 설정 (변경 없음)
    setUploadButtonLoading(isLoading) {
        const { uploadBtn, uploadBtnText, uploadLoader } = this.app.elements;
        uploadBtnText?.classList.toggle('hidden', isLoading);
        uploadLoader?.classList.toggle('hidden', !isLoading);
        if (uploadBtn) uploadBtn.disabled = isLoading;
    }
};

export default studentHomework;