// src/student/studentHomework.js

import { collection, doc, getDocs, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// ✨ [추가] 이미지 압축 라이브러리 임포트
import imageCompression from 'browser-image-compression';

const studentHomework = {
    isLoading: false,
    state: {
        currentHomework: null,
        selectedFiles: [], // 압축된 파일들이 저장될 곳
        initialImageUrls: [], 
        isEditingHomework: false
    },

    init(app) {
        this.app = app;
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            homeworkScreen: document.getElementById('student-homework-screen'),
            homeworkList: document.getElementById('student-homework-list'),
            uploadModal: document.getElementById('student-upload-modal'),
            uploadModalTitle: document.getElementById('student-upload-modal-title'),
            filesInput: document.getElementById('student-files-input'),
            previewContainer: document.getElementById('student-preview-container'),
            uploadBtn: document.getElementById('student-upload-btn'),
            uploadBtnText: document.getElementById('student-upload-btn-text'),
            uploadLoader: document.getElementById('student-upload-loader'),
            cancelUploadBtn: document.getElementById('student-cancel-upload-btn'),
            closeUploadModalBtn: document.getElementById('student-close-upload-modal-btn'),
        };
    },

    bindEvents() {
        this.app.elements.gotoHomeworkCard?.addEventListener('click', () => this.showHomeworkScreen());
        this.elements.closeUploadModalBtn?.addEventListener('click', () => this.closeUploadModal());
        this.elements.cancelUploadBtn?.addEventListener('click', () => this.closeUploadModal());
        
        // 파일 선택 시 처리
        this.elements.filesInput?.addEventListener('change', (e) => this.handleFileSelection(e));
        
        // 업로드 버튼 클릭
        this.elements.uploadBtn?.addEventListener('click', () => this.handleUpload());
    },

    async showHomeworkScreen() {
        if (this.isLoading) return;
        this.app.showScreen(this.elements.homeworkScreen);
        await this.loadHomeworkList();
    },

    async loadHomeworkList() {
        const { classId, studentDocId } = this.app.state;
        const listContainer = this.elements.homeworkList;
        if (!listContainer) return;

        listContainer.innerHTML = '<div class="loader mx-auto my-4"></div>';

        try {
            // 1. 해당 반의 숙제 목록 가져오기
            const q = collection(db, 'homeworks'); // 필요 시 where('classId', '==', classId) 추가
            const snapshot = await getDocs(q);
            
            const homeworks = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                // 해당 반의 숙제인지 확인 (classId 필드가 있다면)
                if (!data.classId || data.classId === classId) {
                    homeworks.push({ id: doc.id, ...data });
                }
            });

            // 2. 제출 여부 확인을 위해 학생의 제출 기록 조회
            // (최적화를 위해 개별 조회 대신 여기서 한 번에 처리하거나, UI 렌더링 시 조회)
            
            listContainer.innerHTML = '';
            if (homeworks.length === 0) {
                listContainer.innerHTML = '<p class="text-center text-slate-400 py-8">등록된 숙제가 없습니다.</p>';
                return;
            }

            // 날짜순 정렬 (최신순)
            homeworks.sort((a, b) => (b.dueDate || '').localeCompare(a.dueDate || ''));

            for (const hw of homeworks) {
                await this.renderHomeworkItem(hw, studentDocId, listContainer);
            }

        } catch (error) {
            console.error("숙제 목록 로딩 실패:", error);
            listContainer.innerHTML = '<p class="text-center text-red-500 py-8">목록을 불러오지 못했습니다.</p>';
        }
    },

    async renderHomeworkItem(hw, studentId, container) {
        // 제출 내역 확인
        const subRef = doc(db, `homeworks/${hw.id}/submissions/${studentId}`);
        const subSnap = await getDoc(subRef);
        const isSubmitted = subSnap.exists();
        const subData = isSubmitted ? subSnap.data() : null;

        const div = document.createElement('div');
        div.className = `p-4 border rounded-lg shadow-sm bg-white flex justify-between items-center ${isSubmitted ? 'border-green-200 bg-green-50' : ''}`;
        
        const statusBadge = isSubmitted 
            ? `<span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">제출 완료</span>` 
            : `<span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">미제출</span>`;

        div.innerHTML = `
            <div>
                <h3 class="font-bold text-slate-800">${hw.title || '제목 없음'}</h3>
                <p class="text-sm text-slate-600 mt-1">마감: ${hw.dueDate || '없음'} | 범위: ${hw.pages || '-'}</p>
                <div class="mt-2">${statusBadge}</div>
            </div>
            <button class="btn-primary text-sm px-4 py-2 whitespace-nowrap ml-3">
                ${isSubmitted ? '수정하기' : '제출하기'}
            </button>
        `;

        div.querySelector('button').addEventListener('click', () => {
            this.openUploadModal(hw, isSubmitted, subData);
        });

        container.appendChild(div);
    },

    openUploadModal(homework, isEdit, submissionData) {
        this.state.currentHomework = homework;
        this.state.isEditingHomework = isEdit;
        this.state.selectedFiles = []; // 초기화
        this.state.initialImageUrls = isEdit && submissionData?.imageUrls ? submissionData.imageUrls : [];

        // UI 초기화
        this.elements.uploadModalTitle.textContent = isEdit ? `숙제 수정: ${homework.title}` : `숙제 제출: ${homework.title}`;
        this.elements.filesInput.value = ''; // 파일 선택 초기화
        this.elements.previewContainer.innerHTML = '';
        this.elements.uploadBtnText.textContent = isEdit ? '수정하기' : '제출하기';
        this.elements.uploadModal.style.display = 'flex';

        // 기존 제출된 이미지가 있다면 미리보기에 표시
        if (isEdit && this.state.initialImageUrls.length > 0) {
            this.state.initialImageUrls.forEach(url => {
                this.createPreviewItem(url, true); // true = 기존 이미지(삭제 시 처리 다름)
            });
        }
    },

    closeUploadModal() {
        this.elements.uploadModal.style.display = 'none';
        this.state.currentHomework = null;
        this.state.selectedFiles = [];
    },

    // ✨ [수정] 파일 선택 시 압축 진행
    async handleFileSelection(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 압축 옵션 설정 (최대 1MB 정도, 화면 너비 1920px 제한)
        const options = {
            maxSizeMB: 1,
            maxWidthOrHeight: 1920,
            useWebWorker: true
        };

        // 로딩 표시 (선택적인 UI)
        showToast("이미지 처리 중...", false);

        for (const file of files) {
            if (!file.type.match('image.*')) {
                showToast(`'${file.name}'은(는) 이미지가 아닙니다.`, true);
                continue;
            }

            try {
                // 1. 압축 실행
                const compressedFile = await imageCompression(file, options);
                
                // 2. 상태에 추가
                this.state.selectedFiles.push(compressedFile);

                // 3. 미리보기 생성 (FileReader)
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.createPreviewItem(e.target.result, false, compressedFile);
                };
                reader.readAsDataURL(compressedFile);

            } catch (error) {
                console.error("이미지 압축 실패:", error);
                showToast("이미지 처리에 실패했습니다. (용량이 너무 클 수 있습니다)", true);
            }
        }
    },

    createPreviewItem(src, isExisting, fileObj = null) {
        const div = document.createElement('div');
        div.className = "relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200";
        
        div.innerHTML = `
            <img src="${src}" class="w-full h-full object-cover">
            <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition">&times;</button>
        `;

        // 삭제 버튼 이벤트
        div.querySelector('button').addEventListener('click', () => {
            div.remove();
            if (isExisting) {
                // 기존 이미지 목록에서 제거 (나중에 DB 저장 시 반영)
                this.state.initialImageUrls = this.state.initialImageUrls.filter(url => url !== src);
            } else {
                // 새로 추가한 파일 목록에서 제거
                this.state.selectedFiles = this.state.selectedFiles.filter(f => f !== fileObj);
            }
        });

        this.elements.previewContainer.appendChild(div);
    },

    async handleUpload() {
        if (this.isLoading) return;
        
        const { currentHomework, selectedFiles, initialImageUrls, isEditingHomework } = this.state;
        const studentId = this.app.state.studentDocId;
        const studentName = this.app.state.studentName;

        // 유효성 검사
        if ((!selectedFiles || selectedFiles.length === 0) && (!initialImageUrls || initialImageUrls.length === 0)) {
            showToast("최소 한 장 이상의 이미지를 등록해야 합니다.", true);
            return;
        }

        this.isLoading = true;
        this.elements.uploadLoader.style.display = 'block';
        this.elements.uploadBtnText.style.display = 'none';
        this.elements.uploadBtn.disabled = true;

        try {
            const newImageUrls = [];

            // 1. 새 파일 업로드 (압축된 파일 사용)
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(async (file) => {
                    const timestamp = Date.now();
                    const fileName = `${studentId}_${timestamp}_${Math.random().toString(36).substr(2, 9)}.jpg`;
                    const filePath = `homeworks/${currentHomework.id}/${fileName}`;
                    const fileRef = ref(storage, filePath);
                    
                    const snapshot = await uploadBytes(fileRef, file);
                    return await getDownloadURL(snapshot.ref);
                });

                const urls = await Promise.all(uploadPromises);
                newImageUrls.push(...urls);
            }

            // 2. 최종 URL 목록 병합
            const finalImageUrls = [...initialImageUrls, ...newImageUrls];

            // 3. Firestore 저장
            const submissionRef = doc(db, `homeworks/${currentHomework.id}/submissions/${studentId}`);
            const dataToSave = {
                studentName: studentName,
                studentDocId: studentId,
                imageUrls: finalImageUrls,
                submittedAt: serverTimestamp(),
                status: 'submitted' // 'checked' 등 상태 관리 가능
            };

            await setDoc(submissionRef, dataToSave, { merge: true });

            // 4. (수정 시) 삭제된 기존 이미지 파일 정리 (선택 사항 - 여기선 생략 가능하지만 용량 절약 위해 추천)
            // 구현하려면 원래 초기 이미지 목록과 비교해서 없어진 것만 deleteObject 호출

            showToast(isEditingHomework ? "수정되었습니다." : "제출되었습니다.", false);
            this.closeUploadModal();
            this.loadHomeworkList(); // 목록 새로고침

        } catch (error) {
            console.error("업로드 실패:", error);
            showToast("업로드 중 오류가 발생했습니다. 다시 시도해주세요.", true);
        } finally {
            this.isLoading = false;
            this.elements.uploadLoader.style.display = 'none';
            this.elements.uploadBtnText.style.display = 'block';
            this.elements.uploadBtn.disabled = false;
        }
    }
};

export default studentHomework;