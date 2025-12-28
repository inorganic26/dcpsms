// src/admin/subjectManager.js

import { collection, addDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { setSubjects, getSubjects, SUBJECT_EVENTS } from "../store/subjectStore.js";

export const subjectManager = {
    elements: {},

    init() {
        // App 의존성 없이 스스로 요소 찾기
        this.elements = {
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
        };

        this.elements.addSubjectBtn?.addEventListener('click', () => this.handleAddSubject());
        
        this.elements.subjectsList?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-subject-btn')) {
                const id = e.target.dataset.id;
                this.handleDeleteSubject(id);
            }
        });

        document.addEventListener(SUBJECT_EVENTS.UPDATED, () => this.renderList());
        this.listenForSubjects();
    },

    listenForSubjects() {
        const q = query(collection(db, "subjects"), orderBy("name"));
        onSnapshot(q, (snap) => {
            const subjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setSubjects(subjects);
        }, (err) => {
            console.error(err);
            if(this.elements.subjectsList) this.elements.subjectsList.innerHTML = "로딩 실패";
        });
    },

    renderList() {
        const subjects = getSubjects();
        const listEl = this.elements.subjectsList;
        if (!listEl) return;

        listEl.innerHTML = '';
        if (subjects.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 과목이 없습니다.</p>';
            return;
        }

        subjects.forEach(sub => {
            const div = document.createElement('div');
            div.className = 'p-2 border rounded bg-white flex justify-between items-center';
            div.innerHTML = `<span>${sub.name}</span><button data-id="${sub.id}" class="delete-subject-btn text-red-500 text-xs font-bold">삭제</button>`;
            listEl.appendChild(div);
        });
    },

    async handleAddSubject() {
        const name = this.elements.newSubjectNameInput?.value.trim();
        if (!name) { showToast("과목 이름을 입력하세요.", true); return; }
        try {
            await addDoc(collection(db, "subjects"), { name });
            showToast("과목 추가 완료", false);
            if(this.elements.newSubjectNameInput) this.elements.newSubjectNameInput.value = '';
        } catch (e) { showToast("추가 실패", true); }
    },

    async handleDeleteSubject(id) {
        if (!confirm("이 과목을 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "subjects", id));
            showToast("과목 삭제 완료", false);
        } catch (e) { showToast("삭제 실패", true); }
    }
};