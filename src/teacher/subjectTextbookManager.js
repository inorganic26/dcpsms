// src/teacher/subjectTextbookManager.js

import { collection, addDoc, doc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, where, getDocs } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const subjectTextbookManager = {
    app: null,
    unsubscribeSubjects: null,
    unsubscribeTextbooks: null,
    selectedSubjectId: null,

    // HTML IDs와 매핑
    elements: {
        modal: 'teacher-subject-textbook-mgmt-modal',
        closeBtn: 'teacher-close-subject-textbook-modal-btn',
        closeBtnFooter: 'teacher-close-subject-textbook-modal-btn-footer',
        
        newSubjectNameInput: 'teacher-new-subject-name',
        addSubjectBtn: 'teacher-add-subject-btn',
        subjectsList: 'teacher-subjects-list-mgmt',
        
        subjectSelect: 'teacher-subject-select-for-textbook-mgmt',
        textbookContent: 'teacher-textbook-management-content',
        newTextbookNameInput: 'teacher-new-textbook-name',
        addTextbookBtn: 'teacher-add-textbook-btn',
        textbooksList: 'teacher-textbooks-list-mgmt',
        
        openBtn: 'teacher-manage-subjects-textbooks-btn'
    },

    init(app) {
        this.app = app;
        this.bindEvents();
    },

    bindEvents() {
        const el = (id) => document.getElementById(this.elements[id]);

        el('openBtn')?.addEventListener('click', () => this.openModal());
        el('closeBtn')?.addEventListener('click', () => this.closeModal());
        el('closeBtnFooter')?.addEventListener('click', () => this.closeModal());

        el('addSubjectBtn')?.addEventListener('click', () => this.addSubject());
        
        el('subjectSelect')?.addEventListener('change', (e) => this.handleSubjectSelect(e.target.value));
        el('addTextbookBtn')?.addEventListener('click', () => this.addTextbook());
    },

    openModal() {
        const modal = document.getElementById(this.elements.modal);
        if (modal) {
            modal.style.display = 'flex';
            this.loadSubjects();
        }
    },

    closeModal() {
        const modal = document.getElementById(this.elements.modal);
        if (modal) modal.style.display = 'none';
        
        if(this.unsubscribeSubjects) this.unsubscribeSubjects();
        if(this.unsubscribeTextbooks) this.unsubscribeTextbooks();
        
        const tbContent = document.getElementById(this.elements.textbookContent);
        if(tbContent) tbContent.style.display = 'none';
        
        const sel = document.getElementById(this.elements.subjectSelect);
        if(sel) sel.value = '';
    },

    loadSubjects() {
        const listEl = document.getElementById(this.elements.subjectsList);
        const selectEl = document.getElementById(this.elements.subjectSelect);
        
        const q = query(collection(db, 'subjects'), orderBy('name'));
        
        this.unsubscribeSubjects = onSnapshot(q, (snapshot) => {
            if (!listEl || !selectEl) return;
            
            listEl.innerHTML = '';
            selectEl.innerHTML = '<option value="">-- 과목 선택 --</option>';
            
            snapshot.forEach(docSnap => {
                const data = docSnap.data();
                const div = document.createElement('div');
                div.className = "flex justify-between items-center p-2 border-b bg-white";
                div.innerHTML = `
                    <span>${data.name}</span>
                    <button class="del-btn text-red-500 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                `;
                div.querySelector('.del-btn').onclick = () => this.deleteSubject(docSnap.id, data.name);
                listEl.appendChild(div);

                const opt = document.createElement('option');
                opt.value = docSnap.id;
                opt.textContent = data.name;
                selectEl.appendChild(opt);
            });
            
            if (this.selectedSubjectId) {
                selectEl.value = this.selectedSubjectId;
            }
        });
    },

    async addSubject() {
        const input = document.getElementById(this.elements.newSubjectNameInput);
        const name = input.value.trim();
        if (!name) return showToast("과목 이름을 입력해주세요.", true);

        try {
            await addDoc(collection(db, 'subjects'), { name, createdAt: serverTimestamp() });
            input.value = '';
            showToast("과목이 추가되었습니다.");
        } catch (e) { showToast("추가 실패", true); }
    },

    async deleteSubject(id, name) {
        if (!confirm(`'${name}' 과목을 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'subjects', id));
            showToast("삭제되었습니다.");
        } catch (e) { showToast("삭제 실패", true); }
    },

    handleSubjectSelect(subjectId) {
        this.selectedSubjectId = subjectId;
        const content = document.getElementById(this.elements.textbookContent);
        
        if (this.unsubscribeTextbooks) this.unsubscribeTextbooks();

        if (!subjectId) {
            content.style.display = 'none';
            return;
        }

        content.style.display = 'block';
        this.loadTextbooks(subjectId);
    },

    loadTextbooks(subjectId) {
        const listEl = document.getElementById(this.elements.textbooksList);
        // orderBy 제거 (인덱스 문제 방지)
        const q = query(collection(db, 'textbooks'), where('subjectId', '==', subjectId));

        this.unsubscribeTextbooks = onSnapshot(q, (snapshot) => {
            if (!listEl) return;
            listEl.innerHTML = '';
            
            const docs = snapshot.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => a.name.localeCompare(b.name));
            
            if (docs.length === 0) {
                listEl.innerHTML = '<p class="text-sm text-slate-400 p-2">등록된 교재가 없습니다.</p>';
            }

            docs.forEach(data => {
                const div = document.createElement('div');
                div.className = "flex justify-between items-center p-2 border-b bg-white";
                div.innerHTML = `
                    <span>${data.name}</span>
                    <button class="del-btn text-red-500 text-xs border border-red-200 px-2 py-1 rounded hover:bg-red-50">삭제</button>
                `;
                div.querySelector('.del-btn').onclick = () => this.deleteTextbook(data.id, data.name);
                listEl.appendChild(div);
            });
        });
    },

    async addTextbook() {
        const input = document.getElementById(this.elements.newTextbookNameInput);
        const name = input.value.trim();
        if (!this.selectedSubjectId) return;
        if (!name) return showToast("교재 이름을 입력해주세요.", true);

        try {
            await addDoc(collection(db, 'textbooks'), {
                name,
                subjectId: this.selectedSubjectId,
                createdAt: serverTimestamp()
            });
            input.value = '';
            showToast("교재가 추가되었습니다.");
        } catch (e) { showToast("추가 실패", true); }
    },

    async deleteTextbook(id, name) {
        if (!confirm(`'${name}' 교재를 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'textbooks', id));
            showToast("삭제되었습니다.");
        } catch (e) { showToast("삭제 실패", true); }
    }
};