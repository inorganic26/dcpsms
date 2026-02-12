// src/student/studentDailyTest.js

import imageCompression from 'browser-image-compression';
import { db, storage } from "../shared/firebase.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { showToast } from "../shared/utils.js";

export const studentDailyTest = {
    app: null,
    state: {
        tests: [],
        loading: false,
        selectedFiles: [],
        // 👇 [추가] 수정 모드 관련 상태
        isEditing: false,
        editingId: null,
        existingImages: [] // 수정 시 기존에 업로드된 이미지 URL들
    },

    elements: {
        listContainer: 'student-daily-test-list',
        addButton: 'student-add-daily-test-btn',
        subjectSelect: 'daily-test-subject-select',
        dateInput: 'daily-test-date',
        scoreInput: 'daily-test-score',
        memoInput: 'daily-test-memo',
        fileBtn: 'daily-test-file-btn',
        fileInput: 'daily-test-file-input',
        filePreview: 'daily-test-file-preview',
        formTitle: 'daily-test-form-title' // 폼 제목 (등록/수정 표시용)
    },

    init(app) {
        this.app = app;
        this.resetForm(); // 초기화
        this.populateSubjects();
        this.bindEvents();
        this.fetchTests();
    },

    populateSubjects() {
        const select = document.getElementById(this.elements.subjectSelect);
        if (!select) return;

        const subjects = this.app.state.subjects || [];
        select.innerHTML = '<option value="">과목을 선택해주세요</option>';

        if (subjects.length === 0) {
            select.innerHTML += '<option disabled>배정된 과목이 없습니다</option>';
            return;
        }
        subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
    },

    bindEvents() {
        const addBtn = document.getElementById(this.elements.addButton);
        if (addBtn) {
            // 이벤트 중복 방지를 위한 재생성
            const newBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newBtn, addBtn);
            newBtn.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                this.handleSave(newBtn);
            });
        }

        const fileBtn = document.getElementById(this.elements.fileBtn);
        const fileInput = document.getElementById(this.elements.fileInput);

        if (fileBtn && fileInput) {
            fileBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleFileSelect(e);
        }
    },

    // 폼 및 상태 초기화
    resetForm() {
        this.state.isEditing = false;
        this.state.editingId = null;
        this.state.existingImages = [];
        this.state.selectedFiles = [];

        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        document.getElementById(this.elements.scoreInput).value = '';
        document.getElementById(this.elements.memoInput).value = '';
        document.getElementById(this.elements.subjectSelect).value = '';
        document.getElementById(this.elements.fileInput).value = ''; // input 초기화
        
        // 버튼 및 UI 복구
        const btn = document.getElementById(this.elements.addButton);
        if(btn) btn.textContent = "등록하기";
        
        const fileBtn = document.getElementById(this.elements.fileBtn);
        if(fileBtn) fileBtn.innerHTML = `<span class="material-icons-round">add_a_photo</span> 사진 선택 (여러 장 가능)`;
        
        this.renderFilePreview();
    },

    // 👇 [수정] 파일 미리보기 렌더링 (기존 이미지 + 새 파일 통합)
    renderFilePreview() {
        const container = document.getElementById(this.elements.filePreview);
        if (!container) return;
        container.innerHTML = '';

        // 1. 기존 이미지 (수정 모드일 때)
        this.state.existingImages.forEach((url, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'relative inline-block m-1';
            
            wrapper.innerHTML = `
                <img src="${url}" class="w-16 h-16 object-cover rounded-lg border border-indigo-200">
                <button type="button" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors" title="삭제">
                    <span class="material-icons-round text-xs block">close</span>
                </button>
            `;
            
            // 삭제 버튼 이벤트
            wrapper.querySelector('button').onclick = () => {
                this.state.existingImages.splice(index, 1);
                this.renderFilePreview(); // 재렌더링
            };
            container.appendChild(wrapper);
        });

        // 2. 새로 선택한 파일
        this.state.selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const wrapper = document.createElement('div');
                wrapper.className = 'relative inline-block m-1';
                wrapper.innerHTML = `
                    <img src="${e.target.result}" class="w-16 h-16 object-cover rounded-lg border border-green-200 opacity-90">
                    <button type="button" class="absolute -top-2 -right-2 bg-slate-500 text-white rounded-full p-0.5 shadow-md hover:bg-slate-600 transition-colors" title="선택 취소">
                        <span class="material-icons-round text-xs block">close</span>
                    </button>
                `;
                 // 선택 취소 이벤트
                wrapper.querySelector('button').onclick = () => {
                    this.state.selectedFiles.splice(index, 1);
                    this.renderFilePreview();
                    this.updateFileButtonText();
                };
                container.appendChild(wrapper);
            };
            reader.readAsDataURL(file);
        });
        
        this.updateFileButtonText();
    },

    updateFileButtonText() {
        const btn = document.getElementById(this.elements.fileBtn);
        const total = this.state.existingImages.length + this.state.selectedFiles.length;
        if (btn) {
            if (total > 0) {
                btn.innerHTML = `<span class="material-icons-round text-indigo-500">check_circle</span> 총 ${total}장 (추가 가능)`;
            } else {
                btn.innerHTML = `<span class="material-icons-round">add_a_photo</span> 사진 선택 (여러 장 가능)`;
            }
        }
    },

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.state.selectedFiles = [...this.state.selectedFiles, ...files]; // 기존 선택에 누적
        this.renderFilePreview();
        event.target.value = ''; // 같은 파일 다시 선택 가능하게 초기화
    },

    // 👇 [핵심] 등록 및 수정 통합 로직
    async handleSave(btn) {
        const date = document.getElementById(this.elements.dateInput).value;
        const score = document.getElementById(this.elements.scoreInput).value;
        const memo = document.getElementById(this.elements.memoInput).value;
        const subjEl = document.getElementById(this.elements.subjectSelect);
        const subjectId = subjEl.value;

        if (!subjectId) return showToast("과목을 선택해주세요.", true);
        if (!score) return showToast("점수를 입력해주세요.", true);

        const subjectName = subjEl.options[subjEl.selectedIndex].text;
        const studentId = this.app.state.studentDocId;
        
        const actionText = this.state.isEditing ? "수정" : "등록";
        if (!confirm(`${subjectName} - ${score}점\n${actionText}하시겠습니까?`)) return;

        btn.disabled = true;
        btn.textContent = "처리 중...";

        try {
            // 1. 새 이미지 압축 및 업로드
            let newImageUrls = [];
            if (this.state.selectedFiles.length > 0) {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                const uploadPromises = this.state.selectedFiles.map(async (file) => {
                    try {
                        const compressedFile = await imageCompression(file, options);
                        const path = `daily_test_images/${studentId}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, path);
                        await uploadBytes(storageRef, compressedFile);
                        return await getDownloadURL(storageRef);
                    } catch (err) {
                        console.error("Upload error:", err);
                        return null;
                    }
                });
                const results = await Promise.all(uploadPromises);
                newImageUrls = results.filter(url => url !== null);
            }

            // 2. 최종 이미지 목록 합치기 (기존 유지된 것 + 새로 올린 것)
            const finalImageUrls = [...this.state.existingImages, ...newImageUrls];

            const payload = {
                date: date,
                score: Number(score),
                memo: memo || "",
                subjectId: subjectId,
                subjectName: subjectName,
                imageUrls: finalImageUrls,
                updatedAt: serverTimestamp()
            };

            if (this.state.isEditing) {
                // 수정
                await updateDoc(doc(db, "daily_tests", this.state.editingId), payload);
                showToast("수정되었습니다.", false);
            } else {
                // 신규 등록
                payload.studentId = studentId;
                payload.studentName = this.app.state.studentName;
                payload.classId = this.app.state.studentData?.classId || null;
                payload.createdAt = serverTimestamp();
                await addDoc(collection(db, "daily_tests"), payload);
                showToast("등록되었습니다.", false);
            }

            this.resetForm();
            this.fetchTests();

        } catch (error) {
            console.error("Save Error:", error);
            showToast("오류가 발생했습니다.", true);
        } finally {
            btn.disabled = false;
            btn.textContent = "등록하기";
        }
    },

    // 👇 [추가] 수정 버튼 클릭 시 폼 채우기
    startEdit(test) {
        this.state.isEditing = true;
        this.state.editingId = test.id;
        this.state.existingImages = test.imageUrls || [];
        this.state.selectedFiles = []; // 새 파일 초기화

        document.getElementById(this.elements.dateInput).value = test.date;
        document.getElementById(this.elements.scoreInput).value = test.score;
        document.getElementById(this.elements.memoInput).value = test.memo || '';
        document.getElementById(this.elements.subjectSelect).value = test.subjectId;

        // 버튼 텍스트 변경
        document.getElementById(this.elements.addButton).textContent = "수정하기";
        
        // 미리보기 렌더링
        this.renderFilePreview();
        
        // 스크롤을 폼으로 이동
        document.getElementById('daily-test-form-container')?.scrollIntoView({ behavior: 'smooth' });
        showToast("수정 모드입니다.", false);
    },

    async fetchTests() {
        const studentId = this.app.state.studentDocId;
        if (!studentId) return;

        this.renderLoading();

        try {
            const q = query(
                collection(db, "daily_tests"),
                where("studentId", "==", studentId)
            );
            const querySnapshot = await getDocs(q);
            let tests = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            tests.sort((a, b) => new Date(b.date) - new Date(a.date));
            this.state.tests = tests;
            this.renderList();
        } catch (error) {
            console.error(error);
            this.renderError();
        }
    },

    async handleDelete(id) {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "daily_tests", id));
            showToast("삭제되었습니다.");
            // 만약 수정 중인 항목을 삭제했다면 초기화
            if (this.state.editingId === id) this.resetForm();
            this.fetchTests();
        } catch (error) { showToast("삭제 실패", true); }
    },

    renderLoading() {
        const container = document.getElementById(this.elements.listContainer);
        if (container) container.innerHTML = `<div class="p-4 text-center text-slate-400">로딩 중...</div>`;
    },
    
    renderError() {
        const container = document.getElementById(this.elements.listContainer);
        if (container) container.innerHTML = `<div class="p-4 text-center text-red-500">데이터를 불러오지 못했습니다.</div>`;
    },

    renderList() {
        const container = document.getElementById(this.elements.listContainer);
        if (!container) return;

        if (this.state.tests.length === 0) {
            container.innerHTML = `<div class="p-4 text-center text-slate-400">기록이 없습니다.</div>`;
            return;
        }

        container.innerHTML = this.state.tests.map(test => {
            const hasImage = test.imageUrls && test.imageUrls.length > 0;
            const imageCount = hasImage ? test.imageUrls.length : 0;
            const imageIcon = hasImage
                ? `<span class="material-icons-round text-xs text-indigo-500 ml-1">image</span>`
                : '';
            
            return `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center hover:border-indigo-100 transition-colors">
                <div class="flex-1">
                    <div class="text-xs text-slate-400 mb-1 flex items-center gap-1">${test.date} ${imageIcon}</div>
                    <div class="font-bold text-slate-700">${test.subjectName || '과목없음'}</div>
                    <div class="text-sm text-slate-500 mt-1 truncate">${test.memo || '-'} ${hasImage ? `<span class="text-indigo-600 text-xs font-medium">(${imageCount}장)</span>` : ''}</div>
                </div>
                <div class="flex flex-col items-end gap-2 ml-4">
                    <div class="text-lg font-bold text-blue-600">${test.score}점</div>
                    <div class="flex gap-2">
                        <button class="edit-btn text-indigo-400 hover:text-indigo-600 text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors" data-id="${test.id}">
                            <span class="material-icons-round text-sm">edit</span> 수정
                        </button>
                        <button class="delete-btn text-red-400 hover:text-red-600 text-xs flex items-center gap-1 px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition-colors" data-id="${test.id}">
                            <span class="material-icons-round text-sm">delete</span> 삭제
                        </button>
                    </div>
                </div>
            </div>`;
        }).join('');

        // 이벤트 리스너 연결
        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
        
        // 수정 버튼 연결
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const test = this.state.tests.find(t => t.id === id);
                if (test) this.startEdit(test);
            });
        });
    }
};