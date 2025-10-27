// src/admin/textbookManager.js

import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const textbookManager = {
    textbookUnsubscribe: null, // 실시간 감지 해제용 변수

    init(app) {
        this.app = app;

        // 교재 관리 관련 이벤트 리스너 설정
        this.app.elements.subjectSelectForTextbook.addEventListener('change', (e) => this.handleSubjectSelectForTextbook(e.target.value));
        this.app.elements.addTextbookBtn.addEventListener('click', () => this.addNewTextbook());
        
        // 초기 로드 시 과목 드롭다운 채우기 (AdminApp.js의 listenForSubjects 이벤트에 의해 호출됨)
    },

    // ✨ [추가] 과목 드롭다운 채우기 함수
    populateSubjectSelect() {
        const select = this.app.elements.subjectSelectForTextbook;
        if (!select) return;

        const subjects = this.app.state.subjects || [];
        const currentSelection = this.app.state.selectedSubjectIdForTextbook;

        select.innerHTML = '<option value="">-- 과목 선택 --</option>';

        if (subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            return;
        }

        subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });

        // 이전에 선택된 값 복원 시도
        if (currentSelection && subjects.some(s => s.id === currentSelection)) {
             select.value = currentSelection;
        } else {
             select.value = '';
        }
    },

    handleSubjectSelectForTextbook(subjectId) {
        this.app.state.selectedSubjectIdForTextbook = subjectId;
        if (this.textbookUnsubscribe) this.textbookUnsubscribe(); // 기존 리스너 해제

        const listEl = this.app.elements.textbooksList;

        if (subjectId) {
            this.app.elements.textbookManagementContent.style.display = 'block';
            if(listEl) listEl.innerHTML = '<p class="text-sm text-slate-400">교재 목록 로딩 중...</p>';
            this.listenForTextbooks(subjectId);
        } else {
            this.app.elements.textbookManagementContent.style.display = 'none';
            if(listEl) listEl.innerHTML = '<p class="text-sm text-slate-400">먼저 과목을 선택해주세요.</p>';
        }
    },

    listenForTextbooks(subjectId) {
        if (!subjectId) return;

        // 이름순으로 정렬하여 가져오도록 수정
        const q = query(collection(db, `subjects/${subjectId}/textbooks`), orderBy("name"));
        
        // ✨ 리스너 저장 및 실행
        this.textbookUnsubscribe = onSnapshot(q, (snapshot) => {
            const textbooks = [];
            snapshot.forEach(doc => textbooks.push({ id: doc.id, ...doc.data() }));
            this.renderList(textbooks);
        }, (error) => {
            console.error("[TextbookManager] Textbook listen error:", error);
            showToast("교재 목록 실시간 업데이트 실패", true);
            this.renderList([]);
        });
    },

    // ✨ [수정] 함수 이름 통일: renderTextbookList -> renderList
    renderList(textbooks) {
        const listEl = this.app.elements.textbooksList;
        if (!listEl) return;

        listEl.innerHTML = '';
        if (textbooks.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교재가 없습니다.</p>';
            return;
        }
        textbooks.forEach(book => {
            const div = document.createElement('div');
            div.className = "p-3 border rounded-lg flex items-center justify-between";
            div.innerHTML = `<span class="font-medium text-slate-700">${book.name}</span> <button data-id="${book.id}" class="delete-textbook-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>`;
            listEl.appendChild(div);
            div.querySelector('.delete-textbook-btn').addEventListener('click', (e) => this.deleteTextbook(e.target.dataset.id));
        });
    },

    async addNewTextbook() {
        const subjectId = this.app.state.selectedSubjectIdForTextbook;
        const textbookName = this.app.elements.newTextbookNameInput.value.trim();
        if (!subjectId) { 
            showToast("먼저 과목을 선택해주세요."); 
            return; 
        }
        if (!textbookName) { 
            showToast("교재 이름을 입력해주세요."); 
            return; 
        }
        try {
            await addDoc(collection(db, `subjects/${subjectId}/textbooks`), { name: textbookName });
            showToast("새 교재가 추가되었습니다.", false);
            this.app.elements.newTextbookNameInput.value = '';
        } catch (error) { 
            console.error("[TextbookManager] Add textbook failed:", error);
            showToast("교재 추가에 실패했습니다."); 
        }
    },

    async deleteTextbook(textbookId) {
        const subjectId = this.app.state.selectedSubjectIdForTextbook;
        if (!confirm("정말로 이 교재를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, `subjects/${subjectId}/textbooks`, textbookId));
            showToast("교재가 삭제되었습니다.", false);
        } catch (error) { 
            console.error("[TextbookManager] Delete textbook failed:", error);
            showToast("교재 삭제에 실패했습니다."); 
        }
    },
};