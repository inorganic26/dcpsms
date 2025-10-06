// src/admin/textbookManager.js

import { collection, onSnapshot, addDoc, doc, deleteDoc, query } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const textbookManager = {
    init(app) {
        this.app = app;

        // 교재 관리 관련 이벤트 리스너 설정
        this.app.elements.subjectSelectForTextbook.addEventListener('change', (e) => this.handleSubjectSelectForTextbook(e.target.value));
        this.app.elements.addTextbookBtn.addEventListener('click', () => this.addNewTextbook());
    },

    handleSubjectSelectForTextbook(subjectId) {
        this.app.state.selectedSubjectIdForTextbook = subjectId;
        if (subjectId) {
            this.app.elements.textbookManagementContent.style.display = 'block';
            this.listenForTextbooks();
        } else {
            this.app.elements.textbookManagementContent.style.display = 'none';
            this.app.elements.textbooksList.innerHTML = '<p class="text-sm text-slate-400">먼저 과목을 선택해주세요.</p>';
        }
    },

    listenForTextbooks() {
        const subjectId = this.app.state.selectedSubjectIdForTextbook;
        if (!subjectId) return;

        const q = query(collection(db, `subjects/${subjectId}/textbooks`));
        onSnapshot(q, (snapshot) => {
            const textbooks = [];
            snapshot.forEach(doc => textbooks.push({ id: doc.id, ...doc.data() }));
            this.renderTextbookList(textbooks);
        });
    },

    renderTextbookList(textbooks) {
        const listEl = this.app.elements.textbooksList;
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
            showToast("교재 삭제에 실패했습니다."); 
        }
    },
};