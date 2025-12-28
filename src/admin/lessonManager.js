// src/admin/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, writeBatch, orderBy } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonManager = {
    lessonUnsubscribe: null,
    elements: {},

    init(app) {
        this.app = app;
        this.cacheElements();
        this.addEventListeners();
    },

    cacheElements() {
        this.elements = {
            subjectSelect: document.getElementById('admin-subject-select-for-lesson'),
            contentDiv: document.getElementById('admin-lessons-management-content'),
            listEl: document.getElementById('admin-lessons-list'),
            promptEl: document.getElementById('admin-lesson-prompt'),
            
            modal: document.getElementById('admin-new-lesson-modal'),
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            lessonTitleInput: document.getElementById('admin-lesson-title'),
            video1Input: document.getElementById('admin-video1-url'),
            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            
            showModalBtn: document.getElementById('admin-show-new-lesson-modal-btn'),
            closeModalBtn: document.getElementById('admin-close-modal-btn'),
            cancelBtn: document.getElementById('admin-cancel-btn'),
            saveBtn: document.getElementById('admin-save-lesson-btn'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            
            previewBtn: document.getElementById('admin-preview-quiz-btn'),
            previewContainer: document.getElementById('admin-questions-preview-container'),
            previewList: document.getElementById('admin-questions-preview-list'),
            previewTitle: document.getElementById('admin-questions-preview-title'),
            
            addRevBtn: document.getElementById('admin-add-video1-rev-btn'),
            revContainer: document.getElementById('admin-video1-rev-urls-container'),
            video2Container: document.getElementById('video2ListContainer'),
            addVideo2Btn: document.getElementById('btnAddVideo2Item'),
            
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),
        };
    },

    addEventListeners() {
        this.elements.subjectSelect?.addEventListener('change', (e) => this.handleSubjectSelect(e.target.value));
        this.elements.showModalBtn?.addEventListener('click', () => this.showModal('add'));
        this.elements.closeModalBtn?.addEventListener('click', () => this.hideModal());
        this.elements.cancelBtn?.addEventListener('click', () => this.hideModal());
        this.elements.saveBtn?.addEventListener('click', () => this.saveLesson());
        this.elements.previewBtn?.addEventListener('click', () => this.previewQuiz());
        this.elements.addRevBtn?.addEventListener('click', () => this.addRevUrlInput(1));
        this.elements.saveOrderBtn?.addEventListener('click', () => this.saveLessonOrder());
        this.elements.addVideo2Btn?.addEventListener('click', () => this.addVideo2InputItem());
    },

    populateSubjectSelect() {
        const select = this.elements.subjectSelect;
        if (!select) return;
        const subjects = this.app.state.subjects || [];
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!subjects.length) { select.innerHTML += '<option disabled>과목 없음</option>'; return; }
        subjects.forEach(s => select.innerHTML += `<option value="${s.id}">${s.name}</option>`);
        if (this.app.state.selectedSubjectIdForMgmt) select.value = this.app.state.selectedSubjectIdForMgmt;
    },

    handleSubjectSelect(sid) {
        this.app.state.selectedSubjectIdForMgmt = sid;
        if (this.lessonUnsubscribe) this.lessonUnsubscribe();

        if (sid) {
            this.elements.contentDiv.style.display = 'block';
            this.elements.listEl.innerHTML = '<p>로딩 중...</p>';
            this.elements.promptEl.style.display = 'none';
            this.listenForLessons(sid);
        } else {
            this.elements.contentDiv.style.display = 'none';
            this.elements.listEl.innerHTML = '';
            this.elements.promptEl.style.display = 'block';
        }
    },

    listenForLessons(sid) {
        const q = query(collection(db, `subjects/${sid}/lessons`), orderBy("order"));
        this.lessonUnsubscribe = onSnapshot(q, (snap) => {
            this.app.state.lessons = [];
            snap.forEach(d => this.app.state.lessons.push({ id: d.id, ...d.data() }));
            this.renderList(this.app.state.lessons);
        }, (e) => { console.error(e); showToast("로딩 실패"); });
    },

    renderList(lessons) {
        const list = this.elements.listEl;
        list.innerHTML = '';
        if (!lessons.length) { list.innerHTML = '<p class="text-sm text-slate-400">학습 세트 없음</p>'; return; }

        lessons.forEach((l, idx) => {
            const div = document.createElement('div');
            const isActive = l.isActive === true;
            div.className = `lesson-card p-4 border rounded-lg flex items-center justify-between gap-2 ${isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'} cursor-grab`;
            div.setAttribute('draggable', true);
            div.dataset.id = l.id;
            div.dataset.order = l.order || idx;

            div.innerHTML = `
                <div class="flex items-center space-x-3"><span class="drag-handle material-icons text-slate-400">drag_indicator</span><h3 class="font-bold text-slate-800">${l.title}</h3></div>
                <div class="flex-shrink-0 flex items-center gap-2">
                    <button class="edit-btn text-blue-500 font-bold text-sm">수정</button>
                    <button class="toggle-btn ${isActive ? 'bg-gray-500' : 'bg-green-500'} text-white font-bold px-2 py-1 rounded text-xs">${isActive ? '비활성' : '활성'}</button>
                    <button class="del-btn bg-red-500 text-white font-bold px-2 py-1 rounded text-xs">삭제</button>
                </div>`;
            list.appendChild(div);

            div.querySelector('.edit-btn').onclick = () => this.showModal('edit', l);
            div.querySelector('.del-btn').onclick = () => this.deleteLesson(l.id);
            div.querySelector('.toggle-btn').onclick = () => this.toggleLessonActive(l.id, isActive);
        });
        this.addDragAndDropListeners();
    },

    // (드래그 앤 드롭 로직 유지 - 코드 길이상 생략하지 않고 핵심만 포함)
    addDragAndDropListeners() {
        const list = this.elements.listEl;
        list.querySelectorAll('.lesson-card').forEach(item => {
            item.addEventListener('dragstart', () => { item.classList.add('dragging'); });
            item.addEventListener('dragend', () => { item.classList.remove('dragging'); });
        });
        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(list, e.clientY);
            const dragging = document.querySelector('.dragging');
            if (afterElement == null) list.appendChild(dragging);
            else list.insertBefore(dragging, afterElement);
        });
    },
    getDragAfterElement(container, y) {
        const els = [...container.querySelectorAll('.lesson-card:not(.dragging)')];
        return els.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    async saveLessonOrder() {
        const lessons = [...this.elements.listEl.querySelectorAll('.lesson-card')];
        const sid = this.app.state.selectedSubjectIdForMgmt;
        if (!sid || !lessons.length) return;
        
        this.elements.saveOrderBtn.disabled = true;
        this.elements.saveOrderBtn.textContent = '저장 중...';
        try {
            const batch = writeBatch(db);
            lessons.forEach((item, idx) => {
                batch.update(doc(db, `subjects/${sid}/lessons`, item.dataset.id), { order: idx + 1 });
            });
            await batch.commit();
            showToast("순서 저장 완료", false);
        } catch(e) { showToast("실패", true); }
        finally { this.elements.saveOrderBtn.disabled = false; this.elements.saveOrderBtn.textContent = '순서 저장'; }
    },

    async toggleLessonActive(lid, status) {
        try { await updateDoc(doc(db, 'subjects', this.app.state.selectedSubjectIdForMgmt, 'lessons', lid), { isActive: !status }); showToast("상태 변경됨", false); } 
        catch(e) { showToast("실패"); }
    },

    showModal(mode, lesson = null) {
        this.app.state.editingLesson = lesson;
        const isEdit = mode === 'edit';
        this.elements.modalTitle.textContent = isEdit ? '수정' : '추가';
        this.elements.lessonTitleInput.value = lesson?.title || '';
        this.elements.video1Input.value = lesson?.video1Url || '';
        
        // Video 2 List
        this.elements.video2Container.innerHTML = '';
        if (lesson?.video2List) lesson.video2List.forEach(i => this.addVideo2InputItem(i.name, i.url));
        else if (lesson?.video2Url) this.addVideo2InputItem('기본', lesson.video2Url);
        else this.addVideo2InputItem();

        // Quiz JSON
        let qJson = lesson?.quizJson;
        if(!qJson && lesson?.questionBank) qJson = JSON.stringify(lesson.questionBank, null, 2);
        this.elements.quizJsonInput.value = qJson || '';

        // Rev URLs
        this.elements.revContainer.innerHTML = '';
        lesson?.video1RevUrls?.forEach(url => this.addRevUrlInput(1, url));

        this.elements.previewContainer.style.display = 'none';
        this.app.state.generatedQuiz = null;
        if (qJson) this.previewQuiz(qJson);
        
        this.elements.modal.style.display = 'flex';
    },

    hideModal() { this.elements.modal.style.display = 'none'; this.app.state.editingLesson = null; },

    addVideo2InputItem(name='', url='') {
        const div = document.createElement('div');
        div.className = "flex gap-2 items-center video2-item mb-2";
        div.innerHTML = `<input type="text" class="video2-name border p-2 rounded w-1/3 text-sm" placeholder="교재명" value="${name}"><input type="text" class="video2-url border p-2 rounded w-full text-sm" placeholder="URL" value="${url}"><button type="button" class="rm-btn text-red-500 font-bold px-2">X</button>`;
        div.querySelector('.rm-btn').onclick = () => div.remove();
        this.elements.video2Container.appendChild(div);
    },

    addRevUrlInput(type, url='') {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 mb-1';
        div.innerHTML = `<input type="url" class="w-full p-2 border rounded rev-url-input" value="${url}" placeholder="URL"><button class="text-red-500 font-bold px-2 rm-rev">×</button>`;
        div.querySelector('.rm-rev').onclick = () => div.remove();
        this.elements.revContainer.appendChild(div);
    },

    previewQuiz(jsonStr = null) {
        const val = jsonStr || this.elements.quizJsonInput.value.trim();
        if (!val) { this.elements.previewContainer.style.display = 'none'; return; }
        try {
            const quiz = JSON.parse(val);
            const qs = Array.isArray(quiz) ? quiz : (quiz.questions || []);
            if (!qs.length) throw new Error();
            
            this.elements.previewList.innerHTML = '';
            this.elements.previewTitle.textContent = `${qs.length}문항`;
            qs.forEach((q, i) => {
                const li = document.createElement('li');
                li.className = 'mb-2 p-2 bg-gray-50 text-xs';
                li.innerHTML = `<strong>Q${i+1}. ${q.question}</strong>`;
                this.elements.previewList.appendChild(li);
            });
            this.elements.previewContainer.style.display = 'block';
            this.app.state.generatedQuiz = qs;
        } catch(e) { showToast("JSON 오류"); this.elements.previewContainer.style.display = 'none'; }
    },

    async saveLesson() {
        const sid = this.app.state.selectedSubjectIdForMgmt;
        const title = this.elements.lessonTitleInput.value.trim();
        if (!sid || !title) { showToast("과목/제목 필수", true); return; }

        this.elements.saveBtn.disabled = true;
        this.elements.saveBtnText.textContent = '저장 중...';
        this.elements.saveLoader.style.display = 'inline-block';

        const v2List = [];
        this.elements.video2Container.querySelectorAll('.video2-item').forEach(d => {
            const n = d.querySelector('.video2-name').value.trim();
            const u = d.querySelector('.video2-url').value.trim();
            if(n && u) v2List.push({ name: n, url: u });
        });
        const revs = Array.from(this.elements.revContainer.querySelectorAll('input')).map(i => i.value.trim()).filter(Boolean);
        
        const data = {
            title, video1Url: this.elements.video1Input.value.trim(),
            video1RevUrls: revs, video2List: v2List, video2Url: v2List[0]?.url || '',
            quizJson: this.elements.quizJsonInput.value.trim(),
            questionBank: this.app.state.generatedQuiz,
            updatedAt: serverTimestamp(),
            isActive: this.app.state.editingLesson?.isActive ?? false
        };

        try {
            if (this.app.state.editingLesson) {
                await updateDoc(doc(db, `subjects/${sid}/lessons`, this.app.state.editingLesson.id), data);
            } else {
                data.order = (this.app.state.lessons?.length || 0) + 1;
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, `subjects/${sid}/lessons`), data);
            }
            showToast("저장됨", false);
            this.hideModal();
        } catch(e) { console.error(e); showToast("실패", true); }
        finally { 
            this.elements.saveBtn.disabled = false; 
            this.elements.saveBtnText.textContent = '저장'; 
            this.elements.saveLoader.style.display = 'none'; 
        }
    },

    async deleteLesson(lid) {
        if(!confirm("삭제하시겠습니까?")) return;
        try { await deleteDoc(doc(db, `subjects/${this.app.state.selectedSubjectIdForMgmt}/lessons`, lid)); showToast("삭제됨"); }
        catch(e) { showToast("실패"); }
    }
};