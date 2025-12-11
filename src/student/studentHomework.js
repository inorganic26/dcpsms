// src/student/studentHomework.js

import { collection, doc, getDocs, getDoc, setDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { db, storage } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 이미지 압축 라이브러리
import imageCompression from 'browser-image-compression';

const studentHomework = {
    isLoading: false,
    state: {
        currentHomework: null,
        selectedFiles: [], // 새로 추가할 파일 객체들
        initialImageUrls: [], // 이미 서버에 있는 파일 URL들
        isEditingHomework: false,
        uploadLimit: 0 // ✨ 최대 업로드 가능 장수 (0이면 무제한)
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
        
        // 파일 선택 시
        this.elements.filesInput?.addEventListener('change', (e) => this.handleFileSelection(e));
        
        // 업로드(제출/저장) 버튼 클릭
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
            const q = collection(db, 'homeworks'); 
            const snapshot = await getDocs(q);
            
            const homeworks = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                if (!data.classId || data.classId === classId) {
                    homeworks.push({ id: doc.id, ...data });
                }
            });
            
            listContainer.innerHTML = '';
            if (homeworks.length === 0) {
                listContainer.innerHTML = '<p class="text-center text-slate-400 py-8">등록된 숙제가 없습니다.</p>';
                return;
            }

            // 마감일 내림차순 정렬
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
        
        const count = subData?.imageUrls?.length || 0;
        const statusBadge = isSubmitted 
            ? `<span class="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full font-bold">제출 완료 (${count}장)</span>` 
            : `<span class="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full font-bold">미제출</span>`;

        const btnText = isSubmitted ? '추가 제출 / 수정' : '제출하기';
        const btnClass = isSubmitted ? 'btn-secondary' : 'btn-primary';

        div.innerHTML = `
            <div>
                <h3 class="font-bold text-slate-800">${hw.title || '제목 없음'}</h3>
                <p class="text-sm text-slate-600 mt-1">마감: ${hw.dueDate || '없음'} | 범위: ${hw.pages || '-'}</p>
                <div class="mt-2">${statusBadge}</div>
            </div>
            <button class="${btnClass} text-sm px-4 py-2 whitespace-nowrap ml-3 rounded-lg font-bold shadow-sm transition">
                ${btnText}
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
        this.state.selectedFiles = []; 
        this.state.initialImageUrls = isEdit && submissionData?.imageUrls ? submissionData.imageUrls : [];

        // ✨ [핵심] 제한 장수 계산 (숫자만 추출)
        // 예: "3" -> 3, "5쪽" -> 5, "p.10~12" -> NaN(0, 무제한)
        const parsedLimit = parseInt(homework.pages);
        this.state.uploadLimit = isNaN(parsedLimit) ? 0 : parsedLimit;

        // UI 설정
        this.elements.uploadModalTitle.textContent = isEdit ? `숙제 수정: ${homework.title}` : `숙제 제출: ${homework.title}`;
        this.elements.filesInput.value = ''; 
        this.elements.previewContainer.innerHTML = '';
        this.elements.uploadBtnText.textContent = isEdit ? '저장하기' : '제출하기';
        this.elements.uploadModal.style.display = 'flex';

        // 기존 이미지 표시
        if (this.state.initialImageUrls.length > 0) {
            this.state.initialImageUrls.forEach(url => {
                this.createPreviewItem(url, true);
            });
        }
        
        // 제한 안내 메시지 띄우기 (선택 사항)
        if (this.state.uploadLimit > 0) {
            showToast(`이 숙제는 최대 ${this.state.uploadLimit}장까지 제출 가능합니다.`);
        }
    },

    closeUploadModal() {
        this.elements.uploadModal.style.display = 'none';
        this.state.currentHomework = null;
        this.state.selectedFiles = [];
        this.state.initialImageUrls = [];
        this.state.uploadLimit = 0;
    },

    // ✨ 파일 선택 핸들러 (개수 제한 + 압축)
    async handleFileSelection(e) {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // 1. 개수 제한 체크
        if (this.state.uploadLimit > 0) {
            const currentTotal = this.state.initialImageUrls.length + this.state.selectedFiles.length;
            if (currentTotal + files.length > this.state.uploadLimit) {
                alert(`🚫 장수 초과!\n\n이 숙제는 최대 ${this.state.uploadLimit}장까지만 제출할 수 있습니다.\n(현재 ${currentTotal}장 + 추가 ${files.length}장)`);
                e.target.value = ''; // 선택 초기화
                return;
            }
        }

        showToast(`${files.length}개 파일 처리 중...`, false);

        // 2. 압축 설정 (0.7MB, 1280px)
        const options = {
            maxSizeMB: 0.7,
            maxWidthOrHeight: 1280,
            useWebWorker: true
        };

        for (const file of files) {
            if (!file.type.match('image.*')) {
                showToast(`'${file.name}'은(는) 이미지가 아닙니다.`, true);
                continue;
            }

            try {
                // 압축
                const compressedFile = await imageCompression(file, options);
                
                // 목록 추가
                this.state.selectedFiles.push(compressedFile);

                // 미리보기
                const reader = new FileReader();
                reader.onload = (e) => {
                    this.createPreviewItem(e.target.result, false, compressedFile);
                };
                reader.readAsDataURL(compressedFile);

            } catch (error) {
                console.error("압축 실패:", error);
                showToast("이미지 처리 실패 (메모리 부족 가능성)", true);
            }
        }
        
        // 입력값 초기화 (같은 파일 다시 선택 가능하게)
        e.target.value = '';
    },

    createPreviewItem(src, isExisting, fileObj = null) {
        const div = document.createElement('div');
        div.className = "relative aspect-square bg-slate-100 rounded-lg overflow-hidden border border-slate-200 group";
        
        div.innerHTML = `
            <img src="${src}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
            <button class="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow-md hover:bg-red-600 transition scale-90 hover:scale-100">
                &times;
            </button>
        `;

        div.querySelector('button').addEventListener('click', () => {
            div.remove();
            if (isExisting) {
                this.state.initialImageUrls = this.state.initialImageUrls.filter(url => url !== src);
            } else {
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

        if ((!selectedFiles || selectedFiles.length === 0) && (!initialImageUrls || initialImageUrls.length === 0)) {
            showToast("제출할 이미지가 없습니다.", true);
            return;
        }

        this.isLoading = true;
        this.elements.uploadLoader.style.display = 'block';
        this.elements.uploadBtnText.style.display = 'none';
        this.elements.uploadBtn.disabled = true;

        try {
            const newImageUrls = [];

            // 새 파일 업로드
            if (selectedFiles.length > 0) {
                const uploadPromises = selectedFiles.map(async (file) => {
                    const timestamp = Date.now();
                    const fileName = `${studentId}_${timestamp}_${Math.random().toString(36).substr(2, 5)}.jpg`;
                    const filePath = `homeworks/${currentHomework.id}/${fileName}`;
                    const fileRef = ref(storage, filePath);
                    
                    const snapshot = await uploadBytes(fileRef, file);
                    return await getDownloadURL(snapshot.ref);
                });

                const urls = await Promise.all(uploadPromises);
                newImageUrls.push(...urls);
            }

            // URL 합치기
            const finalImageUrls = [...initialImageUrls, ...newImageUrls];

            // DB 저장
            const submissionRef = doc(db, `homeworks/${currentHomework.id}/submissions/${studentId}`);
            const dataToSave = {
                studentName: studentName,
                studentDocId: studentId,
                imageUrls: finalImageUrls,
                submittedAt: serverTimestamp(),
                status: 'submitted' 
            };

            await setDoc(submissionRef, dataToSave, { merge: true });
            
            showToast("제출 완료!", false);
            this.closeUploadModal();
            this.loadHomeworkList(); 

        } catch (error) {
            console.error("업로드 실패:", error);
            showToast("업로드 실패 (네트워크 확인 필요)", true);
        } finally {
            this.isLoading = false;
            this.elements.uploadLoader.style.display = 'none';
            this.elements.uploadBtnText.style.display = 'block';
            this.elements.uploadBtn.disabled = false;
        }
    }
};

export default studentHomework;