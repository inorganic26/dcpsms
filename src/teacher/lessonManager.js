// src/teacher/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonManager = {
    app: null,
    elements: {},
    state: { editingLesson: null, generatedQuiz: null, lessons: [] },
    unsubscribe: null,

    init(app) {
        this.app = app;
        this.elements = {
            subjectSelect: document.getElementById('teacher-subject-select-mgmt'),
            contentDiv: document.getElementById('teacher-lessons-management-content'),
            listEl: document.getElementById('teacher-lessons-list'),
            promptEl: document.getElementById('teacher-lesson-prompt'),
            saveOrderBtn: document.getElementById('teacher-save-lesson-order-btn'),
            addBtn: document.getElementById('teacher-show-new-lesson-modal-btn'),
            
            modal: document.getElementById('teacher-new-lesson-modal'),
            modalTitle: document.getElementById('teacher-lesson-modal-title'),
            closeBtn: document.getElementById('teacher-close-modal-btn'),
            cancelBtn: document.getElementById('teacher-cancel-btn'),
            saveBtn: document.getElementById('teacher-save-lesson-btn'),
            saveText: document.getElementById('teacher-save-btn-text'),
            saveLoader: document.getElementById('teacher-save-loader'),
            
            titleInput: document.getElementById('teacher-lesson-title'),
            video1Input: document.getElementById('teacher-video1-url'),
            addRevBtn: document.getElementById('teacher-add-video1-rev-btn'),
            revContainer: document.getElementById('teacher-video1-rev-urls-container'),
            video2Container: document.getElementById('video2ListContainer'), // 공통 ID 사용
            addVideo2Btn: document.getElementById('btnAddVideo2Item'), // 공통 ID 사용
            
            quizInput: document.getElementById('teacher-quiz-json-input'),
            previewBtn: document.getElementById('teacher-preview-quiz-btn'),
            previewDiv: document.getElementById('teacher-questions-preview-container'),
            previewList: document.getElementById('teacher-questions-preview-list'),
            previewTitle: document.getElementById('teacher-questions-preview-title'),
        };
        this.addEventListeners();
    },

    addEventListeners() {
        this.elements.subjectSelect?.addEventListener('change', (e) => this.handleFilterChange(e.target.value));
        this.elements.addBtn?.addEventListener('click', () => this.showModal('add'));
        this.elements.closeBtn?.addEventListener('click', () => this.hideModal());
        this.elements.cancelBtn?.addEventListener('click', () => this.hideModal());
        this.elements.saveBtn?.addEventListener('click', () => this.saveLesson());
        this.elements.previewBtn?.addEventListener('click', () => this.previewQuiz());
        this.elements.addRevBtn?.addEventListener('click', () => this.addRevInput(1));
        this.elements.saveOrderBtn?.addEventListener('click', () => this.saveOrder());
        this.elements.addVideo2Btn?.addEventListener('click', () => this.addVideo2Input());
    },

    populateSubjectSelect() {
        const sel = this.elements.subjectSelect;
        if (!sel) return;
        const current = sel.value || this.app.state.selectedSubjectIdForMgmt;
        sel.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.app.state.subjects.forEach(s => sel.innerHTML += `<option value="${s.id}">${s.name}</option>`);
        if (current) sel.value = current;
    },

    handleFilterChange(sid) {
        this.app.state.selectedSubjectIdForMgmt = sid;
        if (this.unsubscribe) this.unsubscribe();
        if (sid) {
            this.elements.contentDiv.style.display = 'block';
            this.elements.promptEl.style.display = 'none';
            this.elements.listEl.innerHTML = '<p>로딩 중...</p>';
            const q = query(collection(db, `subjects/${sid}/lessons`), orderBy("order"));
            this.unsubscribe = onSnapshot(q, (snap) => {
                this.state.lessons = [];
                snap.forEach(d => this.state.lessons.push({ id: d.id, ...d.data() }));
                this.renderList(this.state.lessons);
            });
        } else {
            this.elements.contentDiv.style.display = 'none';
            this.elements.promptEl.style.display = 'block';
        }
    },

    renderList(lessons) {
        const list = this.elements.listEl;
        list.innerHTML = '';
        if (!lessons.length) { list.innerHTML = '<p>학습 세트 없음</p>'; return; }

        lessons.forEach((l) => {
            const div = document.createElement('div');
            const isActive = l.isActive === true;
            div.className = `lesson-card p-4 border rounded-lg flex items-center justify-between gap-2 ${isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'} cursor-grab`;
            div.draggable = true;
            div.dataset.id = l.id;
            div.innerHTML = `
                <div class="flex items-center gap-3"><span class="material-icons text-slate-400">drag_indicator</span><b>${l.title}</b></div>
                <div class="flex gap-2">
                    <button class="edit-btn text-blue-500 font-bold text-sm">수정</button>
                    <button class="toggle-btn ${isActive?'bg-gray-500':'bg-green-500'} text-white text-xs px-2 py-1 rounded">${isActive?'비활성':'활성'}</button>
                    <button class="del-btn bg-red-500 text-white text-xs px-2 py-1 rounded">삭제</button>
                </div>`;
            div.querySelector('.edit-btn').onclick = () => this.showModal('edit', l);
            div.querySelector('.toggle-btn').onclick = () => this.toggleActive(l.id, isActive);
            div.querySelector('.del-btn').onclick = () => this.deleteLesson(l.id);
            list.appendChild(div);
        });
        // Drag logic 생략 (관리자와 동일)
    },

    showModal(mode, lesson = null) {
        this.state.editingLesson = lesson;
        this.elements.modalTitle.textContent = mode === 'edit' ? '수정' : '추가';
        this.elements.titleInput.value = lesson?.title || '';
        this.elements.video1Input.value = lesson?.video1Url || '';
        this.elements.quizInput.value = lesson?.quizJson || '';
        this.elements.revContainer.innerHTML = '';
        lesson?.video1RevUrls?.forEach(u => this.addRevInput(1, u));
        this.elements.video2Container.innerHTML = '';
        if (lesson?.video2List) lesson.video2List.forEach(i => this.addVideo2Input(i.name, i.url));
        else this.addVideo2Input();
        
        this.elements.previewDiv.style.display = 'none';
        if (lesson?.quizJson) this.previewQuiz(lesson.quizJson);
        this.elements.modal.style.display = 'flex';
    },

    hideModal() { this.elements.modal.style.display = 'none'; this.state.editingLesson = null; },

    addRevInput(t, v='') {
        const d = document.createElement('div'); d.className='flex gap-2 mb-1';
        d.innerHTML = `<input class="w-full border p-2 rounded rev-url" value="${v}"><button class="text-red-500 px-2 rm">x</button>`;
        d.querySelector('.rm').onclick=()=>d.remove();
        this.elements.revContainer.appendChild(d);
    },
    addVideo2Input(n='', u='') {
        const d = document.createElement('div'); d.className='flex gap-2 mb-2 v2-item';
        d.innerHTML = `<input class="border p-2 rounded w-1/3 v2-name" value="${n}" placeholder="교재"><input class="border p-2 rounded w-full v2-url" value="${u}" placeholder="URL"><button class="text-red-500 px-2 rm">x</button>`;
        d.querySelector('.rm').onclick=()=>d.remove();
        this.elements.video2Container.appendChild(d);
    },

    previewQuiz(jsonStr) {
        const val = jsonStr || this.elements.quizInput.value;
        if(!val) return;
        try {
            const qs = JSON.parse(val);
            const list = Array.isArray(qs) ? qs : qs.questions;
            if(!list.length) throw 0;
            this.elements.previewList.innerHTML = '';
            this.elements.previewTitle.textContent = `${list.length}문항`;
            list.forEach((q, i) => this.elements.previewList.innerHTML += `<li class="p-2 border mb-1">Q${i+1}. ${q.question}</li>`);
            this.elements.previewDiv.style.display = 'block';
            this.state.generatedQuiz = list;
        } catch(e) { showToast("JSON 오류"); this.elements.previewDiv.style.display = 'none'; }
    },

    async saveLesson() {
        const sid = this.app.state.selectedSubjectIdForMgmt;
        const title = this.elements.titleInput.value.trim();
        if (!sid || !title) { showToast("과목/제목 필수"); return; }

        this.elements.saveBtn.disabled = true;
        
        const v2 = [];
        this.elements.video2Container.querySelectorAll('.v2-item').forEach(el => {
            const n = el.querySelector('.v2-name').value;
            const u = el.querySelector('.v2-url').value;
            if(n && u) v2.push({name:n, url:u});
        });
        const rev = Array.from(this.elements.revContainer.querySelectorAll('input')).map(i=>i.value).filter(Boolean);

        const data = {
            title, video1Url: this.elements.video1Input.value,
            video1RevUrls: rev, video2List: v2, video2Url: v2[0]?.url||'',
            quizJson: this.elements.quizInput.value,
            questionBank: this.state.generatedQuiz,
            updatedAt: serverTimestamp(),
            isActive: this.state.editingLesson?.isActive ?? false
        };

        try {
            if (this.state.editingLesson) await updateDoc(doc(db, `subjects/${sid}/lessons`, this.state.editingLesson.id), data);
            else { data.order = 999; data.createdAt = serverTimestamp(); await addDoc(collection(db, `subjects/${sid}/lessons`), data); }
            showToast("저장됨"); this.hideModal();
        } catch(e) { showToast("실패"); }
        finally { this.elements.saveBtn.disabled = false; }
    },

    async deleteLesson(id) { if(confirm("삭제?")) try { await deleteDoc(doc(db, `subjects/${this.app.state.selectedSubjectIdForMgmt}/lessons`, id)); showToast("삭제됨"); } catch(e){ showToast("실패"); } },
    async toggleActive(id, st) { try { await updateDoc(doc(db, `subjects/${this.app.state.selectedSubjectIdForMgmt}/lessons`, id), {isActive:!st}); showToast("변경됨"); } catch(e){} },
    async saveOrder() { /* 순서 저장 로직 (관리자와 동일하게 구현 가능) */ }
};