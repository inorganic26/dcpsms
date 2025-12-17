// src/teacher/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, writeBatch, orderBy, getDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonManager = {
    managerInstance: null, 
    lessonUnsubscribe: null,
    
    elements: {
        modal: 'teacher-new-lesson-modal',
        lessonTitle: 'teacher-lesson-title',
        video1Url: 'teacher-video1-url',
        quizJsonInput: 'teacher-quiz-json-input',
        questionsPreviewContainer: 'teacher-questions-preview-container',
        questionsPreviewList: 'teacher-questions-preview-list',
        saveLessonBtn: 'teacher-save-lesson-btn',
        subjectSelectForMgmt: 'teacher-subject-select-mgmt',
        lessonsManagementContent: 'teacher-lessons-management-content',
        lessonsList: 'teacher-lessons-list',
        
        // Buttons
        showNewLessonModalBtn: 'teacher-show-new-lesson-modal-btn',
        closeModalBtn: 'teacher-close-modal-btn',
        cancelBtn: 'teacher-cancel-btn',
        previewQuizBtn: 'teacher-preview-quiz-btn',
        addVideo1RevBtn: 'teacher-add-video1-rev-btn',
        saveOrderBtn: 'teacher-save-lesson-order-btn',
        
        // Text elements
        modalTitle: 'teacher-lesson-modal-title',
        saveBtnText: 'teacher-save-btn-text',
        saveLoader: 'teacher-save-loader',
        questionsPreviewTitle: 'teacher-questions-preview-title',
        lessonPrompt: 'teacher-lesson-prompt'
    },

    init(app) {
        this.app = app;
        this.addEventListeners();
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id] || id);

        // Subject Change
        el('subjectSelectForMgmt')?.addEventListener('change', (e) => this.handleLessonFilterChange());
        
        // Buttons
        el('showNewLessonModalBtn')?.addEventListener('click', () => this.showModal('add'));
        el('closeModalBtn')?.addEventListener('click', () => this.hideModal());
        el('cancelBtn')?.addEventListener('click', () => this.hideModal());
        el('previewQuizBtn')?.addEventListener('click', () => this.previewQuiz());
        el('saveLessonBtn')?.addEventListener('click', () => this.saveLesson());
        
        el('addVideo1RevBtn')?.addEventListener('click', () => this.addRevUrlInput(1));
        el('saveOrderBtn')?.addEventListener('click', () => this.saveLessonOrder());

        // Video 2 Add Button (Dynamic ID in HTML)
        document.getElementById('btnAddVideo2Item')?.addEventListener('click', () => this.addVideo2InputItem());
    },

    // 과목 선택 시 호출
    handleLessonFilterChange() {
        const select = document.getElementById(this.elements.subjectSelectForMgmt);
        const subjectId = select?.value;
        const contentDiv = document.getElementById(this.elements.lessonsManagementContent);
        const listDiv = document.getElementById(this.elements.lessonsList);
        const promptDiv = document.getElementById(this.elements.lessonPrompt);

        this.app.state.selectedSubjectIdForMgmt = subjectId;
        if (this.lessonUnsubscribe) this.lessonUnsubscribe();

        if (subjectId) {
            contentDiv.style.display = 'block';
            listDiv.innerHTML = '<p class="text-sm text-slate-400">로딩 중...</p>';
            if(promptDiv) promptDiv.style.display = 'none';
            this.listenForLessons(subjectId);
        } else {
            contentDiv.style.display = 'none';
            if(promptDiv) promptDiv.style.display = 'block';
        }
    },

    listenForLessons(subjectId) {
        const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
        this.lessonUnsubscribe = onSnapshot(q, (snapshot) => {
            this.app.state.lessons = [];
            snapshot.forEach(doc => this.app.state.lessons.push({ id: doc.id, ...doc.data() }));
            this.renderList(this.app.state.lessons);
        }, (error) => {
            console.error(error);
            showToast("목록 로딩 실패", true);
        });
    },

    renderList(lessons) {
        const listEl = document.getElementById(this.elements.lessonsList);
        if (!listEl) return;

        listEl.innerHTML = '';
        if (lessons.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 학습 세트가 없습니다.</p>';
            return;
        }

        lessons.forEach((lesson, index) => {
            const div = document.createElement('div');
            const isActive = lesson.isActive === true;
            div.className = `lesson-card p-4 border rounded-lg flex items-center justify-between gap-2 ${isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'} cursor-grab`;
            div.setAttribute('draggable', true);
            div.dataset.id = lesson.id;
            div.dataset.order = lesson.order || index;

            div.innerHTML = `
                <div class="flex items-center space-x-3"><span class="material-icons text-slate-400">drag_indicator</span><h3 class="font-bold text-slate-800">${lesson.title}</h3></div>
                <div class="flex-shrink-0 flex items-center gap-2">
                    <button class="edit-btn text-blue-500 font-bold text-sm">수정</button>
                    <button class="toggle-btn ${isActive ? 'bg-gray-500' : 'bg-green-500'} text-white text-xs px-2 py-1 rounded">${isActive ? '비활성' : '활성'}</button>
                    <button class="delete-btn bg-red-500 text-white text-xs px-2 py-1 rounded">삭제</button>
                </div>`;
            
            div.querySelector('.edit-btn').onclick = () => this.showModal('edit', lesson);
            div.querySelector('.toggle-btn').onclick = () => this.toggleLessonActive(lesson.id, isActive);
            div.querySelector('.delete-btn').onclick = () => this.deleteLesson(lesson.id);

            listEl.appendChild(div);
        });
        
        this.addDragAndDropListeners(listEl);
    },

    addDragAndDropListeners(list) {
        let draggedItem = null;
        list.querySelectorAll('.lesson-card').forEach(item => {
            item.addEventListener('dragstart', () => { draggedItem = item; setTimeout(() => item.classList.add('dragging'), 0); });
            item.addEventListener('dragend', () => { draggedItem.classList.remove('dragging'); draggedItem = null; });
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                const afterElement = this.getDragAfterElement(list, e.clientY);
                if (afterElement == null) list.appendChild(item);
                else list.insertBefore(item, afterElement);
            });
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.lesson-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
            else return closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    async saveLessonOrder() {
        const list = document.getElementById(this.elements.lessonsList);
        const lessons = [...list.querySelectorAll('.lesson-card')];
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        
        if (!subjectId || lessons.length === 0) return;

        try {
            const batch = writeBatch(db);
            lessons.forEach((item, index) => {
                const ref = doc(db, `subjects/${subjectId}/lessons`, item.dataset.id);
                batch.update(ref, { order: index + 1 });
            });
            await batch.commit();
            showToast("순서가 저장되었습니다.", false);
        } catch (e) { showToast("순서 저장 실패", true); }
    },

    async toggleLessonActive(id, currentStatus) {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        try {
            await updateDoc(doc(db, `subjects/${subjectId}/lessons`, id), { isActive: !currentStatus });
            showToast("상태 변경 완료", false);
        } catch (e) { showToast("변경 실패"); }
    },

    async deleteLesson(id) {
        if(!confirm("삭제하시겠습니까?")) return;
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        try {
            await deleteDoc(doc(db, `subjects/${subjectId}/lessons`, id));
            showToast("삭제되었습니다.", false);
        } catch (e) { showToast("삭제 실패"); }
    },

    showModal(mode, lesson = null) {
        const modal = document.getElementById(this.elements.modal);
        if (!modal) return;

        this.app.state.editingLesson = lesson;
        const isEdit = mode === 'edit';
        
        document.getElementById(this.elements.modalTitle).textContent = isEdit ? '학습 세트 수정' : '새 학습 세트 추가';
        document.getElementById(this.elements.lessonTitle).value = lesson?.title || '';
        document.getElementById(this.elements.video1Url).value = lesson?.video1Url || '';
        
        // Video 2 List
        const v2Container = document.getElementById('video2ListContainer');
        if(v2Container) {
            v2Container.innerHTML = '';
            if (lesson?.video2List) {
                lesson.video2List.forEach(item => this.addVideo2InputItem(item.name, item.url));
            } else if (lesson?.video2Url) {
                this.addVideo2InputItem('기본', lesson.video2Url);
            } else {
                this.addVideo2InputItem();
            }
        }

        // Quiz
        let quizContent = lesson?.quizJson;
        if (!quizContent && lesson?.questionBank) quizContent = JSON.stringify(lesson.questionBank, null, 2);
        document.getElementById(this.elements.quizJsonInput).value = quizContent || '';
        
        // Rev Urls
        const v1Container = document.getElementById('teacher-video1-rev-urls-container');
        if(v1Container) {
            v1Container.innerHTML = '';
            lesson?.video1RevUrls?.forEach(url => this.addRevUrlInput(1, url));
        }

        // Reset UI
        document.getElementById(this.elements.questionsPreviewContainer).style.display = 'none';
        this.app.state.generatedQuiz = null;
        if(quizContent) this.previewQuiz(quizContent);

        modal.style.display = 'flex';
    },

    hideModal() {
        document.getElementById(this.elements.modal).style.display = 'none';
        this.app.state.editingLesson = null;
    },

    addVideo2InputItem(name = '', url = '') {
        const container = document.getElementById('video2ListContainer');
        const div = document.createElement('div');
        div.className = "flex gap-2 items-center video2-item mb-2";
        div.innerHTML = `
            <input type="text" class="video2-name border p-2 rounded w-1/3 text-sm" placeholder="교재명" value="${name}">
            <input type="text" class="video2-url border p-2 rounded w-full text-sm" placeholder="URL" value="${url}">
            <button type="button" class="btn-remove text-red-500 font-bold px-2">X</button>
        `;
        div.querySelector('.btn-remove').onclick = () => div.remove();
        container.appendChild(div);
    },

    addRevUrlInput(type, url = '') {
        const container = document.getElementById('teacher-video1-rev-urls-container');
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 mb-2';
        div.innerHTML = `
            <input type="url" class="w-full p-2 border rounded-md rev-url-input text-sm" value="${url}" placeholder="보충 영상 URL">
            <button class="text-xs bg-red-500 text-white px-2 py-1 rounded-md font-bold btn-remove">×</button>
        `;
        div.querySelector('.btn-remove').onclick = () => div.remove();
        container.appendChild(div);
    },

    async saveLesson() {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        const title = document.getElementById(this.elements.lessonTitle).value.trim();
        const video1Url = document.getElementById(this.elements.video1Url).value.trim();
        const quizJson = document.getElementById(this.elements.quizJsonInput).value.trim();
        
        const video2Items = document.querySelectorAll('.video2-item');
        const video2List = [];
        video2Items.forEach(item => {
            const name = item.querySelector('.video2-name').value.trim();
            const url = item.querySelector('.video2-url').value.trim();
            if (name && url) video2List.push({ name, url });
        });

        if (!title) { showToast("제목을 입력해주세요.", true); return; }

        // Save
        const btn = document.getElementById(this.elements.saveLessonBtn);
        const btnText = document.getElementById(this.elements.saveBtnText);
        const loader = document.getElementById(this.elements.saveLoader);
        
        btn.disabled = true; btnText.textContent = '저장 중...'; loader.style.display = 'block';

        let finalQuiz = {};
        if(this.app.state.generatedQuiz) finalQuiz.questionBank = this.app.state.generatedQuiz;
        if(quizJson) finalQuiz.quizJson = quizJson;

        const data = {
            title, video1Url, video2List,
            video1RevUrls: Array.from(document.querySelectorAll('.rev-url-input')).map(i => i.value.trim()).filter(Boolean),
            video2Url: video2List.length > 0 ? video2List[0].url : '',
            ...finalQuiz,
            updatedAt: serverTimestamp(),
            isActive: this.app.state.editingLesson?.isActive ?? false
        };

        try {
            if (this.app.state.editingLesson) {
                await updateDoc(doc(db, `subjects/${subjectId}/lessons`, this.app.state.editingLesson.id), data);
            } else {
                data.order = (this.app.state.lessons?.length || 0) + 1;
                data.createdAt = serverTimestamp();
                data.isActive = false;
                await addDoc(collection(db, `subjects/${subjectId}/lessons`), data);
            }
            showToast("저장되었습니다.", false);
            this.hideModal();
        } catch (e) {
            console.error(e);
            showToast("저장 실패", true);
        } finally {
            btn.disabled = false; btnText.textContent = '저장하기'; loader.style.display = 'none';
        }
    },

    previewQuiz(jsonStr = null) {
        const val = jsonStr || document.getElementById(this.elements.quizJsonInput).value.trim();
        const container = document.getElementById(this.elements.questionsPreviewContainer);
        const list = document.getElementById(this.elements.questionsPreviewList);
        
        if(!val) { container.style.display = 'none'; return; }

        try {
            const quiz = JSON.parse(val);
            const questions = Array.isArray(quiz) ? quiz : (quiz.questions || quiz.questionBank || []);
            
            if(questions.length === 0) throw new Error();

            list.innerHTML = '';
            document.getElementById(this.elements.questionsPreviewTitle).textContent = `미리보기 (${questions.length}문항)`;
            
            questions.forEach((q, i) => {
                const li = document.createElement('li');
                li.className = 'mb-2 p-2 bg-gray-100 rounded text-xs';
                li.innerHTML = `<strong>Q${i+1}.</strong> ${q.question || q.text}`;
                list.appendChild(li);
            });
            container.style.display = 'block';
            this.app.state.generatedQuiz = questions;
        } catch(e) {
            showToast("JSON 형식 오류", true);
            container.style.display = 'none';
        }
    }
};