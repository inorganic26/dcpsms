// src/student/studentDailyTest.js

// 🔥 [수정됨] 메모리를 갉아먹는 압축 라이브러리(browser-image-compression) 완전 제거
import { db, storage } from "../shared/firebase.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAuth } from "firebase/auth"; 
import { showToast } from "../shared/utils.js";

export const studentDailyTest = {
    app: null,
    state: {
        tests: [],
        loading: false,
        selectedFiles: [],
        isEditing: false,
        editingId: null,
        existingImages: [] 
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
        formTitle: 'daily-test-form-title' 
    },

    init(app) {
        this.app = app;
        this.resetForm(); 
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
            // 🔥 [수정됨] cloneNode 방식 제거. 확실하게 onclick으로 덮어씌워 이벤트 유실 원천 차단.
            addBtn.onclick = (e) => {
                if (e) e.preventDefault();
                this.handleSave(addBtn);
            };
        }

        const fileBtn = document.getElementById(this.elements.fileBtn);
        const fileInput = document.getElementById(this.elements.fileInput);

        if (fileBtn && fileInput) {
            fileBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleFileSelect(e);
        }
    },

    resetForm() {
        this.state.isEditing = false;
        this.state.editingId = null;
        this.state.existingImages = [];
        this.state.selectedFiles = [];

        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

        const scoreInput = document.getElementById(this.elements.scoreInput);
        if (scoreInput) scoreInput.value = '';

        const memoInput = document.getElementById(this.elements.memoInput);
        if (memoInput) memoInput.value = '';

        const subjectSelect = document.getElementById(this.elements.subjectSelect);
        if (subjectSelect) subjectSelect.value = '';

        const fileInput = document.getElementById(this.elements.fileInput);
        if (fileInput) fileInput.value = ''; 
        
        const btn = document.getElementById(this.elements.addButton);
        if(btn) {
            // 🔥 [수정됨] 폼이 리셋될 때 버튼 잠금도 무조건 풀어주어 '무반응' 버그 방지
            btn.disabled = false;
            btn.textContent = "등록하기";
        }
        
        const fileBtn = document.getElementById(this.elements.fileBtn);
        if(fileBtn) fileBtn.innerHTML = `<span class="material-icons-round">add_a_photo</span> 사진 선택 (여러 장 가능)`;
        
        this.renderFilePreview();
    },

    renderFilePreview() {
        const container = document.getElementById(this.elements.filePreview);
        if (!container) return;
        container.innerHTML = '';

        this.state.existingImages.forEach((url, index) => {
            const wrapper = document.createElement('div');
            wrapper.className = 'relative inline-block m-1';
            
            wrapper.innerHTML = `
                <img src="${url}" class="w-16 h-16 object-cover rounded-lg border border-indigo-200">
                <button type="button" class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600 transition-colors" title="삭제">
                    <span class="material-icons-round text-xs block">close</span>
                </button>
            `;
            
            wrapper.querySelector('button').onclick = () => {
                this.state.existingImages.splice(index, 1);
                this.renderFilePreview(); 
            };
            container.appendChild(wrapper);
        });

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
        this.state.selectedFiles = [...this.state.selectedFiles, ...files]; 
        this.renderFilePreview();
        event.target.value = ''; 
    },

    async handleSave(btn) {
        const dateInput = document.getElementById(this.elements.dateInput);
        const date = dateInput ? dateInput.value : '';
        
        const scoreInput = document.getElementById(this.elements.scoreInput);
        const score = scoreInput ? scoreInput.value : '';
        
        const memoInput = document.getElementById(this.elements.memoInput);
        const memo = memoInput ? memoInput.value : '';
        
        const subjEl = document.getElementById(this.elements.subjectSelect);
        const subjectId = subjEl ? subjEl.value : '';

        if (!subjectId) return showToast("과목을 선택해주세요.", true);
        if (score === '' || score === null) return showToast("점수를 입력해주세요.", true);

        const subjectName = subjEl.options[subjEl.selectedIndex].text;
        const studentId = this.app.state.studentDocId;
        
        const actionText = this.state.isEditing ? "수정" : "등록";
        if (!confirm(`${subjectName} - ${score}점\n${actionText}하시겠습니까?`)) return;

        btn.disabled = true;
        btn.textContent = "업로드 중...";

        try {
            const auth = getAuth();
            const currentUser = auth.currentUser;
            const userUid = currentUser ? currentUser.uid : studentId; 

            let newImageUrls = [];
            
            if (this.state.selectedFiles.length > 0) {
                const uploadPromises = this.state.selectedFiles.map(async (file) => {
                    try {
                        // 🔥 [수정됨] 압축 로직 완전히 제거. 원본 파일(file) 다이렉트 업로드.
                        const path = `daily_test_images/${userUid}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, path);
                        
                        await uploadBytes(storageRef, file);
                        const downloadUrl = await getDownloadURL(storageRef);
                        
                        return downloadUrl;
                    } catch (err) {
                        console.error("Upload error:", err);
                        return "ERROR"; 
                    }
                });
                
                const results = await Promise.all(uploadPromises);
                
                if (results.includes("ERROR")) {
                    throw new Error("이미지 업로드에 실패했습니다. 다시 시도해주세요.");
                }
                
                newImageUrls = results;
            }

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
                await updateDoc(doc(db, "daily_tests", this.state.editingId), payload);
                showToast("수정되었습니다.", false);
            } else {
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
            alert(error.message || "오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            showToast("등록 실패", true);
            // 오류 발생 시 폼 전체 리셋을 통해 버튼 상태 확실히 복구
            this.resetForm(); 
        } finally {
            // catch 후 화면 이탈 등 예외 방지를 위해 버튼 복구 로직 강화
            if (btn) {
                btn.disabled = false;
                btn.textContent = this.state.isEditing ? "수정하기" : "등록하기";
            }
        }
    },

    startEdit(test) {
        this.state.isEditing = true;
        this.state.editingId = test.id;
        this.state.existingImages = test.imageUrls || [];
        this.state.selectedFiles = []; 

        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput) dateInput.value = test.date;

        const scoreInput = document.getElementById(this.elements.scoreInput);
        if (scoreInput) scoreInput.value = test.score;

        const memoInput = document.getElementById(this.elements.memoInput);
        if (memoInput) memoInput.value = test.memo || '';

        const subjectSelect = document.getElementById(this.elements.subjectSelect);
        if (subjectSelect) subjectSelect.value = test.subjectId;

        const addBtn = document.getElementById(this.elements.addButton);
        if (addBtn) addBtn.textContent = "수정하기";
        
        this.renderFilePreview();
        
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

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
        
        container.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                const test = this.state.tests.find(t => t.id === id);
                if (test) this.startEdit(test);
            });
        });
    }
};