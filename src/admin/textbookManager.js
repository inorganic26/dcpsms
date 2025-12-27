// src/admin/textbookManager.js

import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const textbookManager = {
    textbookUnsubscribe: null,
    app: null, // app 객체 참조 저장

    init(app) {
        this.app = app;
        
        // [수정] 안전장치 추가: 요소가 있고 + addEventListener 함수도 있는지 확인
        const subjectSelect = this.app.elements.subjectSelectForTextbook;
        
        if (subjectSelect && typeof subjectSelect.addEventListener === 'function') {
            subjectSelect.addEventListener('change', (e) => this.handleSubjectSelectForTextbook(e.target.value));
        } else {
            console.warn("[TextbookManager] 과목 선택 박스(subjectSelectForTextbook)를 찾을 수 없거나 이벤트 연결 불가:", subjectSelect);
        }

        const addBtn = this.app.elements.addTextbookBtn;
        if (addBtn && typeof addBtn.addEventListener === 'function') {
            addBtn.addEventListener('click', () => this.addNewTextbook());
        }
    },

    populateSubjectSelect() {
        const select = this.app.elements.subjectSelectForTextbook;
        // select가 없거나 DOM 요소가 아니면 중단
        if (!select || !select.innerHTML) return;

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

        if (currentSelection && subjects.some(s => s.id === currentSelection)) {
             select.value = currentSelection;
        } else {
             select.value = '';
        }
    },

    handleSubjectSelectForTextbook(subjectId) {
        this.app.state.selectedSubjectIdForTextbook = subjectId;
        if (this.textbookUnsubscribe) this.textbookUnsubscribe(); 

        const listEl = this.app.elements.textbooksList;
        const contentDiv = this.app.elements.textbookManagementContent;

        if (subjectId) {
            if(contentDiv) contentDiv.style.display = 'block';
            if(listEl) listEl.innerHTML = '<p class="text-sm text-slate-400">교재 목록 로딩 중...</p>';
            this.listenForTextbooks(subjectId);
        } else {
            if(contentDiv) contentDiv.style.display = 'none';
            if(listEl) listEl.innerHTML = '<p class="text-sm text-slate-400">먼저 과목을 선택해주세요.</p>';
        }
    },

    listenForTextbooks(subjectId) {
        if (!subjectId) return;

        const q = query(
            collection(db, "textbooks"), 
            where("subjectId", "==", subjectId), 
            orderBy("name")
        );
        
        this.textbookUnsubscribe = onSnapshot(q, (snapshot) => {
            const textbooks = [];
            snapshot.forEach(doc => textbooks.push({ id: doc.id, ...doc.data() }));
            this.renderList(textbooks);
        }, (error) => {
            console.error("[TextbookManager] Error:", error);
            showToast("교재 목록을 불러오지 못했습니다.", true);
            this.renderList([]);
        });
    },

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
            div.className = "p-3 border rounded-lg flex items-center justify-between bg-white mb-2";
            div.innerHTML = `<span class="font-medium text-slate-700">${book.name}</span> <button data-id="${book.id}" class="delete-textbook-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>`;
            listEl.appendChild(div);
            
            div.querySelector('.delete-textbook-btn').addEventListener('click', (e) => this.deleteTextbook(e.target.dataset.id));
        });
    },

    async addNewTextbook() {
        const subjectId = this.app.state.selectedSubjectIdForTextbook;
        const nameInput = this.app.elements.newTextbookNameInput;
        const textbookName = nameInput?.value.trim();

        if (!subjectId) { 
            showToast("먼저 과목을 선택해주세요.", true); 
            return; 
        }
        if (!textbookName) { 
            showToast("교재 이름을 입력해주세요.", true); 
            return; 
        }

        try {
            await addDoc(collection(db, "textbooks"), { 
                name: textbookName,
                subjectId: subjectId,
                createdAt: new Date()
            });
            
            showToast("새 교재가 추가되었습니다.", false);
            if(nameInput) nameInput.value = '';
        } catch (error) { 
            console.error("[TextbookManager] Add failed:", error);
            showToast("교재 추가 실패", true); 
        }
    },

    async deleteTextbook(textbookId) {
        if (!confirm("정말로 이 교재를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "textbooks", textbookId));
            showToast("교재가 삭제되었습니다.", false);
        } catch (error) { 
            console.error("[TextbookManager] Delete failed:", error);
            showToast("교재 삭제 실패", true); 
        }
    },
};