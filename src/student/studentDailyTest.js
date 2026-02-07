// src/student/studentDailyTest.js

// 👇 [추가] 이미지 압축 라이브러리 import
import imageCompression from 'browser-image-compression';
import { db, storage } from "../shared/firebase.js"; // 👇 [수정] storage 추가
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
// 👇 [추가] Storage 관련 함수 import
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { showToast } from "../shared/utils.js";

export const studentDailyTest = {
    app: null,
    state: {
        tests: [],
        loading: false,
        selectedFiles: [] // 👇 [추가] 선택된 파일 보관용
    },

    elements: {
        listContainer: 'student-daily-test-list',
        addButton: 'student-add-daily-test-btn',
        subjectSelect: 'daily-test-subject-select',
        dateInput: 'daily-test-date',
        scoreInput: 'daily-test-score',
        memoInput: 'daily-test-memo',

        // 👇 [추가] 파일 업로드 관련 ID
        fileBtn: 'daily-test-file-btn',
        fileInput: 'daily-test-file-input',
        filePreview: 'daily-test-file-preview'
    },

    init(app) {
        this.app = app;

        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

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
        // 기존 등록 버튼
        const addBtn = document.getElementById(this.elements.addButton);
        if (addBtn) {
            const newBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newBtn, addBtn);
            newBtn.addEventListener('click', (e) => {
                if (e) e.preventDefault();
                this.handleAddTest(newBtn); // 버튼 전달
            });
        }

        // 👇 [추가] 파일 선택 버튼 연결
        const fileBtn = document.getElementById(this.elements.fileBtn);
        const fileInput = document.getElementById(this.elements.fileInput);

        if (fileBtn && fileInput) {
            fileBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleFileSelect(e);
        }
    },

    // 👇 [추가] 파일 선택 시 미리보기 처리
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.state.selectedFiles = files; // 상태 저장

        const previewContainer = document.getElementById(this.elements.filePreview);
        if (!previewContainer) return;

        previewContainer.innerHTML = '';

        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-16 object-cover rounded-lg border border-slate-200';
                previewContainer.appendChild(img);
            };
            reader.readAsDataURL(file);
        });

        // 버튼 텍스트 변경
        const btn = document.getElementById(this.elements.fileBtn);
        if (btn) btn.innerHTML = `<span class="material-icons-round text-green-500">check_circle</span> ${files.length}장 선택됨`;
    },

    async handleAddTest(btn) {
        const dateEl = document.getElementById(this.elements.dateInput);
        const scoreEl = document.getElementById(this.elements.scoreInput);
        const memoEl = document.getElementById(this.elements.memoInput);
        const subjEl = document.getElementById(this.elements.subjectSelect);

        if (!dateEl || !scoreEl || !memoEl || !subjEl) return;

        const date = dateEl.value;
        const score = scoreEl.value;
        const memo = memoEl.value;
        const subjectId = subjEl.value;

        if (!subjectId) return showToast("과목을 선택해주세요.", true);
        if (!score) return showToast("점수를 입력해주세요.", true);

        const subjectName = subjEl.options[subjEl.selectedIndex].text;
        const studentId = this.app.state.studentDocId;
        const studentName = this.app.state.studentName || "이름 없음";
        const classId = this.app.state.studentData?.classId || null;

        if (!confirm(`${subjectName} - ${score}점\n등록하시겠습니까?`)) return;

        // 버튼 비활성화
        btn.disabled = true;
        btn.textContent = "저장 중...";

        try {
            // 👇 [추가] 이미지 압축 및 업로드 로직
            console.log("[Debug] Selected files:", this.state.selectedFiles);
            let imageUrls = [];
            if (this.state.selectedFiles.length > 0) {
                // 압축 옵션 (1MB 이하로 제한)
                const options = {
                    maxSizeMB: 1,
                    maxWidthOrHeight: 1920,
                    useWebWorker: true
                };

                // 병렬 처리로 모든 파일 압축 및 업로드
                const uploadPromises = this.state.selectedFiles.map(async (file) => {
                    try {
                        const compressedFile = await imageCompression(file, options);
                        // 경로: daily_test_images/학생ID/날짜_파일명
                        const path = `daily_test_images/${studentId}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, path);
                        await uploadBytes(storageRef, compressedFile);
                        return await getDownloadURL(storageRef);
                    } catch (err) {
                        console.error("이미지 업로드 실패:", err);
                        return null;
                    }
                });

                const results = await Promise.all(uploadPromises);
                imageUrls = results.filter(url => url !== null);
                console.log("[Debug] Uploaded Image URLs:", imageUrls);
            } else {
                console.log("[Debug] No files selected");
            }

            // DB 저장
            await addDoc(collection(db, "daily_tests"), {
                studentId: studentId,
                studentName: studentName,
                classId: classId,
                subjectId: subjectId,
                subjectName: subjectName,
                date: date,
                score: Number(score),
                memo: memo || "",
                imageUrls: imageUrls, // 👇 이미지 URL 배열 저장
                createdAt: serverTimestamp()
            });

            showToast("등록되었습니다.", false);

            // 초기화
            scoreEl.value = '';
            memoEl.value = '';
            subjEl.value = '';
            this.state.selectedFiles = []; // 파일 초기화
            document.getElementById(this.elements.filePreview).innerHTML = ''; // 미리보기 초기화
            document.getElementById(this.elements.fileBtn).innerHTML = `<span class="material-icons-round">add_a_photo</span> 사진 선택 (여러 장 가능)`;

            this.fetchTests();
        } catch (error) {
            console.error("저장 에러:", error);
            showToast("저장 중 오류가 발생했습니다.", true);
        } finally {
            btn.disabled = false;
            btn.textContent = "등록하기";
        }
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
            // 이미지가 있는지 확인해서 아이콘 표시
            const hasImage = test.imageUrls && test.imageUrls.length > 0;
            const imageCount = hasImage ? test.imageUrls.length : 0;
            const imageIcon = hasImage
                ? `<span class="material-icons-round text-xs text-indigo-500 ml-1" title="사진 ${imageCount}장">image</span>`
                : '';
            const imageCountText = hasImage
                ? `<span class="text-xs text-indigo-600 font-bold ml-1">(사진 ${imageCount}장)</span>`
                : '';

            return `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                    <div class="text-xs text-slate-400 mb-1 flex items-center gap-1">${test.date} ${imageIcon}</div>
                    <div class="font-bold text-slate-700">${test.subjectName || '과목없음'}</div>
                    <div class="text-sm text-slate-500 mt-1">${test.memo || '-'} ${imageCountText}</div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-blue-600 mb-1">${test.score}점</div>
                    <button class="text-red-400 hover:text-red-600 text-xs delete-btn flex items-center gap-1 justify-end ml-auto" data-id="${test.id}">
                        <span class="material-icons-round text-sm">delete</span> 삭제
                    </button>
                </div>
            </div>`;
        }).join('');

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
    }
};