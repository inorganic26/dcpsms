// src/student/studentHomework.js

import { collection, doc, getDocs, getDoc, setDoc, where, query, serverTimestamp, orderBy, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 🚨 수정된 부분: export 키워드를 제거하고 const로 선언합니다.
const studentHomework = { 
    unsubscribe: null,

    init(app) {
        this.app = app;

        // 숙제 관련 이벤트 리스너 설정
        this.app.elements.gotoHomeworkCard?.addEventListener('click', () => this.showHomeworkScreen());
        this.app.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.app.showSubjectSelectionScreen());
        this.app.elements.closeUploadModalBtn?.addEventListener('click', () => this.closeUploadModal());
        this.app.elements.cancelUploadBtn?.addEventListener('click', () => this.closeUploadModal());
        this.app.elements.filesInput?.addEventListener('change', (e) => this.handleFileSelection(e)); // 여기가 수정될 부분
        this.app.elements.uploadBtn?.addEventListener('click', () => this.handleUpload());
    },

    // 숙제 목록 화면 표시
    async showHomeworkScreen() {
        this.app.showScreen(this.app.elements.loadingScreen);

        // classId가 없으면 빈 화면 표시
        if (!this.app.state.classId) {
            this.app.elements.homeworkList.innerHTML = '<p class="text-center text-slate-500 py-8">배정된 반이 없어 숙제를 확인할 수 없습니다.</p>';
            this.app.showScreen(this.app.elements.homeworkScreen);
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
            oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1); // 한 달 전으로 설정
            const recentHomeworks = homeworks.filter(hw => {
                if (!hw.dueDate) return true; // 기한 없는 숙제는 항상 표시
                const dueDate = new Date(hw.dueDate);
                return dueDate >= oneMonthAgo;
            });

            this.app.elements.homeworkList.innerHTML = '';
            if (recentHomeworks.length === 0) {
                this.app.elements.homeworkList.innerHTML = '<p class="text-center text-slate-500 py-8">최근 1개월 내에 출제된 숙제가 없습니다.</p>';
            } else {
                // 각 숙제에 대한 학생의 제출 정보를 병렬로 조회
                const submissionPromises = recentHomeworks.map(hw =>
                    // ✅ 수정: 학생의 익명 UID를 제출물 ID로 사용 (권한 문제 해결)
                    getDoc(doc(db, 'homeworks', hw.id, 'submissions', this.app.state.authUid))
                );
                const submissionSnapshots = await Promise.all(submissionPromises);

                // 조회된 제출 정보를 바탕으로 숙제 목록 렌더링
                recentHomeworks.forEach((hw, index) => {
                    const submissionDoc = submissionSnapshots[index];
                    this.renderHomeworkItem(hw, submissionDoc.exists() ? submissionDoc.data() : null);
                });
            }
        } catch (error) {
            console.error("숙제 로딩 실패:", error);
            this.app.elements.homeworkList.innerHTML = `
                <div class="text-center text-red-500 py-8">
                    <p>숙제 목록을 불러오는 데 실패했습니다.</p>
                    <p class="text-sm text-slate-500 mt-2">관리자에게 문의하거나 잠시 후 다시 시도해주세요.</p>
                </div>`;
        }
        this.app.showScreen(this.app.elements.homeworkScreen);
    },

    // 개별 숙제 항목 렌더링 (기존 유지)
    renderHomeworkItem(hw, submissionData) {
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
        this.app.elements.homeworkList.appendChild(item);

        item.querySelector('.upload-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement;
            this.openUploadModal(parent.dataset.id, parent.dataset.textbook, false);
        });

        item.querySelector('.edit-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement.parentElement; // 버튼의 부모(div)의 부모(div)에서 dataset 가져옴
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

        try {
            const homeworkDocRef = doc(db, 'homeworks', homeworkId);
            const homeworkDoc = await getDoc(homeworkDocRef);
            // totalPages가 0 또는 undefined일 수 있음
            const totalPages = homeworkDoc.data()?.pages;
            // totalPages가 유효한 양의 정수인지 확인, 아니면 0으로 설정
            state.currentHomeworkPages = (typeof totalPages === 'number' && totalPages > 0) ? totalPages : 0;

            elements.uploadModalTitle.textContent = `[${textbookName}] 숙제 ${isEditing ? '수정' : '업로드'}`;
            this.updateUploadButtonText(0);
            elements.previewContainer.innerHTML = '';
            elements.filesInput.value = '';

            if (isEditing) {
                // ✅ 수정: 학생의 익명 UID를 제출물 ID로 사용
                const submissionDoc = await getDoc(doc(db, 'homeworks', state.currentHomeworkId, 'submissions', state.authUid));
                if (submissionDoc.exists()) {
                    const existingUrls = submissionDoc.data().imageUrls || [];
                    state.initialImageUrls = existingUrls;
                    state.filesToUpload = existingUrls.map(url => ({ type: 'existing', url }));
                    this.renderImagePreviews();
                }
            } else {
                this.renderImagePreviews(); // 새 업로드 시 빈 미리보기 렌더링
            }

            elements.uploadModal.style.display = 'flex';
        } catch (error) {
            console.error("모달 열기 실패:", error);
            showToast("숙제 정보를 불러오는 데 실패했습니다.");
        }
    },

    closeUploadModal() {
        const { state, elements } = this.app;
        state.currentHomeworkId = null;
        state.isEditingHomework = false;
        state.filesToUpload = [];
        state.initialImageUrls = [];
        state.currentHomeworkPages = 0;
        elements.uploadModal.style.display = 'none';
    },

    // 파일 선택 처리 (페이지 수 제한 추가됨)
    handleFileSelection(event) {
        const newFiles = Array.from(event.target.files).map(file => ({ type: 'new', file }));
        const currentCount = this.app.state.filesToUpload.length;
        const totalPages = this.app.state.currentHomeworkPages; // 숙제에 설정된 총 페이지 수 가져오기

        // 총 페이지 수가 0보다 크고, 현재 파일 수 + 새 파일 수가 총 페이지 수를 초과하는 경우 제한
        if (totalPages > 0 && currentCount + newFiles.length > totalPages) {
            showToast(`최대 ${totalPages}페이지만 업로드할 수 있습니다. (${currentCount}개 선택됨)`); // 사용자에게 알림
            event.target.value = ''; // 파일 입력 필드 초기화 (같은 파일 다시 선택 시 change 이벤트 발생 위함)
            return; // 파일 추가 중단
        }

        this.app.state.filesToUpload.push(...newFiles); // 제한에 걸리지 않으면 파일 목록에 추가
        this.renderImagePreviews(); // 미리보기 업데이트
        // input 초기화 (같은 파일 다시 선택 가능하도록)
        event.target.value = '';
    },


    updateUploadButtonText(uploadedCount) {
        const { uploadBtnText } = this.app.elements;
        const totalPages = this.app.state.currentHomeworkPages;
        // 총 페이지 수가 0보다 크면 "/ N" 표시, 아니면 그냥 개수만 표시
        const totalText = totalPages > 0 ? `/ ${totalPages}` : '';
        uploadBtnText.textContent = `${uploadedCount} ${totalText} 페이지 업로드`;
    },

    // 선택된 파일 미리보기 렌더링 (기존 유지)
    renderImagePreviews() {
        this.app.elements.previewContainer.innerHTML = '';
        this.app.state.filesToUpload.forEach((fileObject, index) => {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'relative';

            const img = document.createElement('img');
            img.className = 'w-full h-24 object-cover rounded-md border border-slate-200';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition shadow-md';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.app.state.filesToUpload.splice(index, 1); // 해당 인덱스 파일 제거
                this.renderImagePreviews(); // 미리보기 다시 렌더링
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
        // 파일 개수가 변경되었으므로 업로드 버튼 텍스트 업데이트
        this.updateUploadButtonText(this.app.state.filesToUpload.length);
    },


    // 파일 업로드 및 DB 저장 처리 (기존 유지)
    async handleUpload() {
        const { state } = this.app;

        // ✅ 수정된 로직: 수정 모드이고 파일이 0개인 경우, 오류 메시지 출력 없이 바로 저장 로직으로 진입합니다.
        if (state.filesToUpload.length === 0 && !state.isEditingHomework) {
            showToast("업로드할 파일을 한 개 이상 선택해주세요.");
            return;
        }

        this.setUploadButtonLoading(true);

        // 기존 URL과 새로 업로드할 파일을 분리
        const existingUrls = state.filesToUpload.filter(f => f.type === 'existing').map(f => f.url);
        const newFiles = state.filesToUpload.filter(f => f.type === 'new').map(f => f.file);

        try {
            let finalImageUrls = existingUrls;

            // 새로 업로드할 파일이 있는 경우에만 Storage 업로드 진행
            if (newFiles.length > 0) {
                 const uploadPromises = newFiles.map((file, i) => {
                    const timestamp = Date.now();
                    // ✅ 수정: 학생의 익명 UID를 Storage 경로에 사용 (Storage 권한 해결)
                    const filePath = `homeworks/${state.currentHomeworkId}/${state.authUid}/${timestamp}_${i+1}_${file.name}`;
                    const fileRef = ref(storage, filePath);
                    return uploadBytes(fileRef, file).then(snapshot => getDownloadURL(snapshot.ref));
                });
                const newImageUrls = await Promise.all(uploadPromises);
                finalImageUrls = [...existingUrls, ...newImageUrls];
            }
            // NOTE: finalImageUrls는 파일이 0개일 경우 빈 배열([])이 됩니다.

            // ✅ 수정: 학생의 익명 UID를 제출물 문서 ID로 사용 (Firestore 권한 해결)
            const submissionRef = doc(db, 'homeworks', state.currentHomeworkId, 'submissions', state.authUid);
            const dataToSave = {
                studentName: state.studentName,
                submittedAt: serverTimestamp(),
                imageUrls: finalImageUrls // 파일이 0개여도 빈 배열이 저장되어 제출 기록은 유지됨
            };

            if (state.isEditingHomework) {
                await updateDoc(submissionRef, dataToSave);
                showToast("숙제를 성공적으로 수정했습니다.", false);
            } else {
                await setDoc(submissionRef, dataToSave);
                showToast("숙제를 성공적으로 제출했습니다.", false);
            }

            // 수정 시 삭제된 이미지 파일 제거 (기존 유지)
            if (state.isEditingHomework) {
                const urlsToDelete = state.initialImageUrls.filter(url => !finalImageUrls.includes(url));
                if (urlsToDelete.length > 0) {
                    urlsToDelete.forEach(url => {
                        try {
                            const fileRef = ref(storage, url);
                            // 파일을 삭제하는 것은 비동기적으로 처리하며 실패해도 전체 로직은 진행합니다.
                            deleteObject(fileRef).catch(err => {
                                console.error("파일 삭제 실패:", url, err);
                            });
                        } catch (error) {
                            console.error("파일 참조 생성 실패:", url, error);
                        }
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

    setUploadButtonLoading(isLoading) {
        const { uploadBtn, uploadBtnText, uploadLoader } = this.app.elements;
        // Optional chaining 추가
        uploadBtnText?.classList.toggle('hidden', isLoading);
        uploadLoader?.classList.toggle('hidden', !isLoading);
        if (uploadBtn) uploadBtn.disabled = isLoading;
    }
};

// 🚨 수정된 부분: Default Export로 변경하여 모듈 로딩 오류 해결
export default studentHomework;