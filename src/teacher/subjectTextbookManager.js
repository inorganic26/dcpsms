// src/teacher/subjectTextbookManager.js

import { collection, addDoc, doc, deleteDoc, query, orderBy, onSnapshot, serverTimestamp, where } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const subjectTextbookManager = {
    elements: {},
    selectedSubjectId: null,

    init(app) {
        this.app = app;
        // 자체 요소 캐싱
        this.elements = {
            modal: document.getElementById('teacher-subject-textbook-mgmt-modal'),
            closeBtns: [
                document.getElementById('teacher-close-subject-textbook-modal-btn'),
                document.getElementById('teacher-close-subject-textbook-modal-btn-footer')
            ],
            openBtn: document.getElementById('teacher-manage-subjects-textbooks-btn'),
            
            subInput: document.getElementById('teacher-new-subject-name'),
            addSubBtn: document.getElementById('teacher-add-subject-btn'),
            subList: document.getElementById('teacher-subjects-list-mgmt'),
            
            subSelect: document.getElementById('teacher-subject-select-for-textbook-mgmt'),
            tbContent: document.getElementById('teacher-textbook-management-content'),
            tbInput: document.getElementById('teacher-new-textbook-name'),
            addTbBtn: document.getElementById('teacher-add-textbook-btn'),
            tbList: document.getElementById('teacher-textbooks-list-mgmt'),
        };
        this.bindEvents();
    },

    bindEvents() {
        this.elements.openBtn?.addEventListener('click', () => this.openModal());
        this.elements.closeBtns.forEach(b => b?.addEventListener('click', () => this.closeModal()));
        this.elements.addSubBtn?.addEventListener('click', () => this.addSubject());
        this.elements.subSelect?.addEventListener('change', (e) => this.handleSubjectSelect(e.target.value));
        this.elements.addTbBtn?.addEventListener('click', () => this.addTextbook());
    },

    openModal() {
        if (this.elements.modal) {
            this.elements.modal.style.display = 'flex';
            this.loadSubjects();
        }
    },

    closeModal() {
        if (this.elements.modal) this.elements.modal.style.display = 'none';
        if (this.elements.tbContent) this.elements.tbContent.style.display = 'none';
        if (this.elements.subSelect) this.elements.subSelect.value = '';
    },

    loadSubjects() {
        const q = query(collection(db, 'subjects'), orderBy('name'));
        onSnapshot(q, (snap) => {
            if (!this.elements.subList) return;
            this.elements.subList.innerHTML = '';
            this.elements.subSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            
            snap.forEach(d => {
                const div = document.createElement('div');
                div.className = "flex justify-between p-2 border-b bg-white";
                div.innerHTML = `<span>${d.data().name}</span><button class="text-red-500 text-xs border p-1 del-sub">삭제</button>`;
                div.querySelector('.del-sub').onclick = () => this.deleteSubject(d.id, d.data().name);
                this.elements.subList.appendChild(div);

                const opt = document.createElement('option');
                opt.value = d.id; opt.textContent = d.data().name;
                this.elements.subSelect.appendChild(opt);
            });
        });
    },

    handleSubjectSelect(sid) {
        this.selectedSubjectId = sid;
        if (!sid) { this.elements.tbContent.style.display = 'none'; return; }
        this.elements.tbContent.style.display = 'block';
        this.loadTextbooks(sid);
    },

    loadTextbooks(sid) {
        const q = query(collection(db, 'textbooks'), where('subjectId', '==', sid));
        onSnapshot(q, (snap) => {
            this.elements.tbList.innerHTML = '';
            snap.forEach(d => {
                const div = document.createElement('div');
                div.className = "flex justify-between p-2 border-b bg-white";
                div.innerHTML = `<span>${d.data().name}</span><button class="text-red-500 text-xs border p-1 del-tb">삭제</button>`;
                div.querySelector('.del-tb').onclick = () => this.deleteTextbook(d.id);
                this.elements.tbList.appendChild(div);
            });
        });
    },

    async addSubject() {
        const name = this.elements.subInput.value.trim();
        if (!name) return;
        try { await addDoc(collection(db, 'subjects'), { name, createdAt: serverTimestamp() }); this.elements.subInput.value=''; showToast("추가됨"); } catch(e){ showToast("실패"); }
    },

    async deleteSubject(id, name) {
        if (!confirm(`'${name}' 삭제?`)) return;
        try { await deleteDoc(doc(db, 'subjects', id)); showToast("삭제됨"); } catch(e){ showToast("실패"); }
    },

    async addTextbook() {
        const name = this.elements.tbInput.value.trim();
        if (!name) return;
        try { await addDoc(collection(db, 'textbooks'), { name, subjectId: this.selectedSubjectId, createdAt: serverTimestamp() }); this.elements.tbInput.value=''; showToast("추가됨"); } catch(e){ showToast("실패"); }
    },

    async deleteTextbook(id) {
        if (!confirm("삭제?")) return;
        try { await deleteDoc(doc(db, 'textbooks', id)); showToast("삭제됨"); } catch(e){ showToast("실패"); }
    }
};