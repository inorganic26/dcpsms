// src/teacher/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 이 파일의 내용은 src/admin/lessonManager.js 와 거의 동일합니다.
// 차이점은 this.app 이 가리키는 대상이 TeacherApp 이라는 점입니다.
export const lessonManager = {
    init(app) {
        this.app = app;

        this.app.elements.subjectSelectForMgmt.addEventListener('change', (e) => {
            this.app.state.selectedSubjectIdForMgmt = e.target.value;
            this.handleLessonFilterChange();
        });
        document.getElementById('teacher-show-new-lesson-modal-btn').addEventListener('click', () => this.openLessonModalForCreate());
        document.getElementById('teacher-close-modal-btn').addEventListener('click', () => this.hideModal());
        document.getElementById('teacher-cancel-btn').addEventListener('click', () => this.hideModal());
        this.app.elements.previewQuizBtn.addEventListener('click', () => this.handleJsonPreview());
        this.app.elements.saveLessonBtn.addEventListener('click', () => this.saveLesson());
        this.app.elements.saveOrderBtn.addEventListener('click', () => this.saveLessonOrder());

        document.getElementById('teacher-add-video1-rev-btn').addEventListener('click', () => this.addRevUrlInput(1));
        document.getElementById('teacher-add-video2-rev-btn').addEventListener('click', () => this.addRevUrlInput(2));

        this.handleLessonFilterChange();
    },

    addRevUrlInput(type, url = '') {
        const container = document.getElementById(`teacher-video${type}-rev-urls-container`);
        if (!container) return;

        const inputGroup = document.createElement('div');
        inputGroup.className = 'flex items-center gap-2';

        const newInput = document.createElement('input');
        newInput.type = 'url';
        newInput.className = 'w-full p-2 border rounded-md rev-url-input';
        newInput.value = url;
        newInput.placeholder = `보충 영상 URL #${container.children.length + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '-';
        removeBtn.className = 'text-xs bg-red-500 text-white px-2 py-1 rounded-md font-bold';
        removeBtn.onclick = () => { inputGroup.remove(); };

        inputGroup.appendChild(newInput);
        inputGroup.appendChild(removeBtn);
        container.appendChild(inputGroup);
    },

    handleLessonFilterChange() {
        const { state, elements } = this.app;
        const canShow = !!state.selectedSubjectIdForMgmt;
        elements.lessonsManagementContent.style.display = canShow ? 'block' : 'none';
        elements.lessonPrompt.style.display = canShow ? 'none' : 'block';
        if (canShow) this.listenForLessons();
        else elements.lessonsList.innerHTML = '';
    },

    listenForLessons() {
        const { selectedSubjectIdForMgmt } = this.app.state;
        if (!selectedSubjectIdForMgmt) return;

        const q = query(collection(db, 'subjects', selectedSubjectIdForMgmt, 'lessons'));
        onSnapshot(q, (snapshot) => {
            let lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            lessons.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            this.app.state.lessons = lessons;
            this.renderLessonList();
        });
    },

    renderLessonList() {
        const { lessonsList } = this.app.elements;
        lessonsList.innerHTML = '';
        if (this.app.state.lessons.length === 0) {
            lessonsList.innerHTML = '<p class="text-center text-slate-500 py-8">아직 생성된 학습 세트가 없습니다.</p>';
            return;
        }
        this.app.state.lessons.forEach(lesson => this.renderLessonCard(lesson));
        this.initDragAndDrop();
    },

    renderLessonCard(lesson) {
        const card = document.createElement('div');
        const isActive = lesson.isActive === true;
        card.className = `lesson-card p-4 border rounded-lg flex items-center justify-between gap-2 ${isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'}`;
        card.setAttribute('draggable', 'true');
        card.dataset.id = lesson.id;

        card.innerHTML = `
            <div class="flex items-center gap-3"><span class="drag-handle material-icons text-slate-400">drag_indicator</span><h3 class="font-bold text-slate-800">${lesson.title}</h3></div>
            <div class="flex-shrink-0 flex items-center gap-2">
                <button data-id="${lesson.id}" class="edit-lesson-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${lesson.id}" data-active="${isActive}" class="toggle-active-btn ${isActive ? 'bg-gray-500' : 'bg-green-500'} text-white font-semibold px-3 py-1 rounded-lg text-xs">${isActive ? '비활성화' : '활성화'}</button>
                <button data-id="${lesson.id}" class="delete-btn bg-red-500 text-white font-semibold px-3 py-1 rounded-lg text-xs">삭제</button>
            </div>`;
        this.app.elements.lessonsList.appendChild(card);
        card.querySelector('.edit-lesson-btn').addEventListener('click', (e) => this.openLessonModalForEdit(e.target.dataset.id));
        card.querySelector('.toggle-active-btn').addEventListener('click', (e) => this.toggleLessonActive(e.target.dataset.id, e.target.dataset.active === 'true'));
        card.querySelector('.delete-btn').addEventListener('click', (e) => this.deleteLesson(e.target.dataset.id));
    },

    initDragAndDrop() {
        const list = this.app.elements.lessonsList;
        let draggedItem = null;
        list.addEventListener('dragstart', e => {
            draggedItem = e.target.closest('.lesson-card');
            if (draggedItem) setTimeout(() => draggedItem.classList.add('dragging'), 0);
        });
        list.addEventListener('dragend', () => {
            if (draggedItem) draggedItem.classList.remove('dragging');
            draggedItem = null;
        });
        list.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(list, e.clientY);
            const currentlyDragging = document.querySelector('.dragging');
            if (currentlyDragging) {
                if (afterElement == null) list.appendChild(currentlyDragging);
                else list.insertBefore(currentlyDragging, afterElement);
            }
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.lesson-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            return (offset < 0 && offset > closest.offset) ? { offset: offset, element: child } : closest;
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    async saveLessonOrder() {
        const { selectedSubjectIdForMgmt } = this.app.state;
        if (!selectedSubjectIdForMgmt) return;

        const lessonCards = this.app.elements.lessonsList.querySelectorAll('.lesson-card');
        if (lessonCards.length === 0) return;

        const batch = writeBatch(db);
        lessonCards.forEach((card, index) => {
            const lessonRef = doc(db, 'subjects', selectedSubjectIdForMgmt, 'lessons', card.dataset.id);
            batch.update(lessonRef, { order: index });
        });

        try {
            await batch.commit();
            showToast("학습 순서가 성공적으로 저장되었습니다.", false);
        } catch (error) {
            showToast("순서 저장에 실패했습니다.");
        }
    },

    async toggleLessonActive(lessonId, currentStatus) {
        const { selectedSubjectIdForMgmt } = this.app.state;
        const lessonRef = doc(db, 'subjects', selectedSubjectIdForMgmt, 'lessons', lessonId);
        try {
            await updateDoc(lessonRef, { isActive: !currentStatus });
            showToast(`학습이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`, false);
        } catch (error) { showToast("활성화 상태 변경에 실패했습니다.");}
    },

    async deleteLesson(lessonIdToDelete) {
        if (!confirm("정말로 이 학습 세트를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'subjects', this.app.state.selectedSubjectIdForMgmt, 'lessons', lessonIdToDelete));
            showToast("학습 세트가 성공적으로 삭제되었습니다.", false);
        } catch (error) { showToast("학습 세트 삭제에 실패했습니다.");}
    },

    async saveLesson() {
        const { state, elements } = this.app;
        const { selectedSubjectIdForMgmt, editingLesson, generatedQuiz, lessons } = state;
        const title = elements.lessonTitle.value.trim();
        const video1Url = elements.video1Url.value.trim();
        const video2Url = elements.video2Url.value.trim();

        const video1RevUrls = Array.from(document.querySelectorAll('#teacher-video1-rev-urls-container .rev-url-input')).map(input => input.value.trim()).filter(Boolean);
        const video2RevUrls = Array.from(document.querySelectorAll('#teacher-video2-rev-urls-container .rev-url-input')).map(input => input.value.trim()).filter(Boolean);

        if (!title || !video1Url || !video2Url || !generatedQuiz) {
            showToast("제목, 기본 영상 1, 문제 풀이 영상 2, 퀴즈 정보는 필수입니다.");
            return;
        }

        this.setSaveButtonLoading(true);
        const lessonData = { title, video1Url, video2Url, video1RevUrls, video2RevUrls, questionBank: generatedQuiz };

        try {
            if (editingLesson) {
                await updateDoc(doc(db, 'subjects', selectedSubjectIdForMgmt, 'lessons', editingLesson.id), lessonData);
                showToast("학습 세트가 성공적으로 수정되었습니다.", false);
            } else {
                Object.assign(lessonData, { order: lessons.length, isActive: false, createdAt: serverTimestamp() });
                await addDoc(collection(db, 'subjects', selectedSubjectIdForMgmt, 'lessons'), lessonData);
                showToast("학습 세트가 성공적으로 생성되었습니다.", false);
            }
            this.hideModal();
        } catch(error) {
            showToast("저장 실패: " + error.message);
        } finally {
            this.setSaveButtonLoading(false);
        }
    },

    openLessonModalForCreate() {
        const { state, elements } = this.app;
        state.editingLesson = null;
        elements.modalTitle.textContent = "새 학습 세트 만들기";
        elements.lessonTitle.value = '';
        elements.video1Url.value = '';
        elements.video2Url.value = '';
        document.getElementById('teacher-video1-rev-urls-container').innerHTML = '';
        document.getElementById('teacher-video2-rev-urls-container').innerHTML = '';
        elements.quizJsonInput.value = '';
        elements.questionsPreviewContainer.classList.add('hidden');
        state.generatedQuiz = null;
        elements.modal.style.display = 'flex';
    },

    openLessonModalForEdit(lessonId) {
        const { state, elements } = this.app;
        const lessonData = state.lessons.find(l => l.id === lessonId);
        if (!lessonData) { showToast("수정할 학습 세트 정보를 찾을 수 없습니다."); return; }
        state.editingLesson = lessonData;
        elements.modalTitle.textContent = "학습 세트 수정";
        elements.lessonTitle.value = lessonData.title;
        elements.video1Url.value = lessonData.video1Url;
        elements.video2Url.value = lessonData.video2Url;

        const v1Container = document.getElementById('teacher-video1-rev-urls-container');
        const v2Container = document.getElementById('teacher-video2-rev-urls-container');
        v1Container.innerHTML = '';
        v2Container.innerHTML = '';

        lessonData.video1RevUrls?.forEach(url => this.addRevUrlInput(1, url));
        lessonData.video2RevUrls?.forEach(url => this.addRevUrlInput(2, url));

        elements.quizJsonInput.value = JSON.stringify(lessonData.questionBank, null, 2);
        this.handleJsonPreview();
        elements.modal.style.display = 'flex';
    },

    hideModal() {
        this.app.state.editingLesson = null;
        this.app.elements.modal.style.display = 'none';
    },

    handleJsonPreview() {
        const { state, elements } = this.app;
        const jsonText = elements.quizJsonInput.value.trim();
        if (!jsonText) {
            showToast("붙여넣은 내용이 없습니다.");
            state.generatedQuiz = null;
            elements.questionsPreviewContainer.classList.add('hidden');
            return;
        }
        try {
            const parsedJson = JSON.parse(jsonText);
            const questionBank = Array.isArray(parsedJson) ? parsedJson : parsedJson.questionBank;
            if (!Array.isArray(questionBank)) throw new Error("'questionBank' 배열을 찾을 수 없습니다.");

            state.generatedQuiz = questionBank;
            const count = state.generatedQuiz.length;
            elements.questionsPreviewTitle.textContent = `생성된 퀴즈 (${count}문항)`;
            elements.questionsPreviewList.innerHTML = state.generatedQuiz.map((q, i) => `<p><b>${i+1}. ${q.question}</b></p>`).join('');
            elements.questionsPreviewContainer.classList.remove('hidden');
            showToast(`퀴즈 ${count}개를 성공적으로 불러왔습니다.`, false);
        } catch (error) {
            state.generatedQuiz = null;
            elements.questionsPreviewContainer.classList.add('hidden');
            showToast(`JSON 형식이 올바르지 않습니다: ${error.message}`);
        }
    },

    setSaveButtonLoading(isLoading) {
        const { saveBtnText, saveLoader, saveLessonBtn } = this.app.elements;
        saveBtnText.classList.toggle('hidden', isLoading);
        saveLoader.classList.toggle('hidden', !isLoading);
        saveLessonBtn.disabled = isLoading;
    }
};