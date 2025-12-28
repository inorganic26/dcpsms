// src/admin/textbookManager.js

import { collection, onSnapshot, addDoc, doc, deleteDoc, query, orderBy, where } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const textbookManager = {
    textbookUnsubscribe: null,
    app: null,
    elements: {},

    init(app) {
        this.app = app;
        this.elements = {
            subjectSelect: document.getElementById('admin-subject-select-for-textbook'),
            addBtn: document.getElementById('admin-add-textbook-btn'),
            listEl: document.getElementById('admin-textbooks-list'),
            contentDiv: document.getElementById('admin-textbook-management-content'),
            nameInput: document.getElementById('admin-new-textbook-name'),
        };
        
        this.elements.subjectSelect?.addEventListener('change', (e) => this.handleSubjectSelect(e.target.value));
        this.elements.addBtn?.addEventListener('click', () => this.addNewTextbook());
    },

    populateSubjectSelect() {
        const select = this.elements.subjectSelect;
        if (!select) return;

        const subjects = this.app.state.subjects || [];
        const currentSelection = this.app.state.selectedSubjectIdForTextbook;

        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (subjects.length === 0) { select.innerHTML += '<option disabled>과목 없음</option>'; return; }

        subjects.forEach(sub => select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`);
        if (currentSelection) select.value = currentSelection;
    },

    handleSubjectSelect(subjectId) {
        this.app.state.selectedSubjectIdForTextbook = subjectId;
        if (this.textbookUnsubscribe) this.textbookUnsubscribe(); 

        const { listEl, contentDiv } = this.elements;
        if (subjectId) {
            if(contentDiv) contentDiv.style.display = 'block';
            if(listEl) listEl.innerHTML = '<p class="text-sm text-slate-400">로딩 중...</p>';
            this.listenForTextbooks(subjectId);
        } else {
            if(contentDiv) contentDiv.style.display = 'none';
            if(listEl) listEl.innerHTML = '<p class="text-sm text-slate-400">과목을 선택해주세요.</p>';
        }
    },

    listenForTextbooks(subjectId) {
        const q = query(collection(db, "textbooks"), where("subjectId", "==", subjectId), orderBy("name"));
        this.textbookUnsubscribe = onSnapshot(q, (snapshot) => {
            const textbooks = [];
            snapshot.forEach(doc => textbooks.push({ id: doc.id, ...doc.data() }));
            this.renderList(textbooks);
        }, (err) => { console.error(err); this.renderList([]); });
    },

    renderList(textbooks) {
        const listEl = this.elements.listEl;
        if (!listEl) return;
        listEl.innerHTML = '';
        if (!textbooks.length) { listEl.innerHTML = '<p class="text-sm text-slate-400">교재 없음</p>'; return; }
        
        textbooks.forEach(book => {
            const div = document.createElement('div');
            div.className = "p-3 border rounded-lg flex items-center justify-between bg-white mb-2";
            div.innerHTML = `<span class="font-medium text-slate-700">${book.name}</span> <button data-id="${book.id}" class="del-btn text-red-500 text-sm font-bold">삭제</button>`;
            listEl.appendChild(div);
            div.querySelector('.del-btn').addEventListener('click', () => this.deleteTextbook(book.id));
        });
    },

    async addNewTextbook() {
        const subjectId = this.app.state.selectedSubjectIdForTextbook;
        const name = this.elements.nameInput?.value.trim();
        if (!subjectId || !name) { showToast("입력 확인 필요", true); return; }

        try {
            await addDoc(collection(db, "textbooks"), { name, subjectId, createdAt: new Date() });
            showToast("추가되었습니다.", false);
            this.elements.nameInput.value = '';
        } catch (error) { console.error(error); showToast("실패", true); }
    },

    async deleteTextbook(id) {
        if (!confirm("삭제하시겠습니까?")) return;
        try { await deleteDoc(doc(db, "textbooks", id)); showToast("삭제됨", false); } 
        catch (e) { showToast("실패", true); }
    },
};