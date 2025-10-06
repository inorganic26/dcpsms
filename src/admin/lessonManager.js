// src/admin/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonManager = {
    init(app) {
        this.app = app;

        // 학습 세트 관리 관련 이벤트 리스너 설정
        this.app.elements.subjectSelectForLesson.addEventListener('change', (e) => {
            this.app.state.selectedSubjectIdForLesson = e.target.value;
            this.handleLessonFilterChange();
        });
        document.getElementById('admin-show-new-lesson-modal-btn').addEventListener('click', () => this.openLessonModalForCreate());
        document.getElementById('admin-close-modal-btn').addEventListener('click', () => this.hideModal());
        document.getElementById('admin-cancel-btn').addEventListener('click', () => this.hideModal());
        this.app.elements.previewQuizBtn.addEventListener('click', () => this.handleJsonPreview());
        this.app.elements.saveLessonBtn.addEventListener('click', () => this.saveLesson());
        this.app.elements.saveOrderBtn.addEventListener('click', () => this.saveLessonOrder());
        
        this.handleLessonFilterChange();
    },

    handleLessonFilterChange() {
        const { state, elements } = this.app;
        const canShow = !!state.selectedSubjectIdForLesson;
        elements.lessonsManagementContent.style.display = canShow ? 'block' : 'none';
        elements.lessonPrompt.style.display = canShow ? 'none' : 'block';
        if (canShow) {
            this.listenForLessons();
        } else {
            elements.lessonsList.innerHTML = '';
        }
    },

    listenForLessons() {
        const { selectedSubjectIdForLesson } = this.app.state;
        if (!selectedSubjectIdForLesson) return;

        const lessonsRef = collection(db, 'subjects', selectedSubjectIdForLesson, 'lessons');
        const q = query(lessonsRef);
        onSnapshot(q, (snapshot) => {
            let lessons = [];
            snapshot.forEach(doc => lessons.push({ id: doc.id, ...doc.data() }));
            lessons.sort((a, b) => {
                const orderA = a.order ?? Infinity;
                const orderB = b.order ?? Infinity;
                if (orderA !== orderB) return orderA - orderB;
                return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
            });
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
            <div class="flex items-center gap-3">
                <span class="drag-handle material-icons text-slate-400">drag_indicator</span>
                <h3 class="font-bold text-slate-800">${lesson.title}</h3>
            </div>
            <div class="flex-shrink-0 flex items-center gap-2">
                <button data-id="${lesson.id}" class="edit-lesson-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${lesson.id}" data-active="${isActive}" class="toggle-active-btn ${isActive ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 hover:bg-green-600'} text-white font-semibold px-3 py-1 rounded-lg transition text-xs">${isActive ? '비활성화' : '활성화'}</button>
                <button data-id="${lesson.id}" class="delete-btn bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded-lg transition text-xs">삭제</button>
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
            if (!draggedItem) return;
            setTimeout(() => draggedItem.classList.add('dragging'), 0);
        });

        list.addEventListener('dragend', () => {
            if (!draggedItem) return;
            draggedItem.classList.remove('dragging');
            draggedItem = null;
        });

        list.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(list, e.clientY);
            const currentlyDragging = document.querySelector('.dragging');
            if (!currentlyDragging) return;
            if (afterElement == null) {
                list.appendChild(currentlyDragging);
            } else {
                list.insertBefore(currentlyDragging, afterElement);
            }
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.lesson-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },

    async saveLessonOrder() {
        const { selectedSubjectIdForLesson } = this.app.state;
        if (!selectedSubjectIdForLesson) return;

        const lessonCards = this.app.elements.lessonsList.querySelectorAll('.lesson-card');
        if (lessonCards.length === 0) return;

        const batch = writeBatch(db);
        lessonCards.forEach((card, index) => {
            const lessonId = card.dataset.id;
            const lessonRef = doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', lessonId);
            batch.update(lessonRef, { order: index });
        });

        try {
            await batch.commit();
            showToast("학습 순서가 성공적으로 저장되었습니다.", false);
        } catch (error) {
            console.error("순서 저장 실패:", error);
            showToast("순서 저장에 실패했습니다.");
        }
    },

    async toggleLessonActive(lessonId, currentStatus) {
        const { selectedSubjectIdForLesson } = this.app.state;
        const lessonRef = doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', lessonId);
        try {
            await updateDoc(lessonRef, { isActive: !currentStatus });
            showToast(`학습이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`, false);
        } catch (error) { console.error("활성화 상태 변경 실패:", error); showToast("활성화 상태 변경에 실패했습니다.");}
    },

    async deleteLesson(lessonIdToDelete) {
        const { selectedSubjectIdForLesson } = this.app.state;
        if (!confirm("정말로 이 학습 세트를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', lessonIdToDelete));
            showToast("학습 세트가 성공적으로 삭제되었습니다.", false);
        } catch (error) { console.error("삭제 실패:", error); showToast("학습 세트 삭제에 실패했습니다.");}
    },

    async saveLesson() {
        const { state, elements } = this.app;
        const { selectedSubjectIdForLesson, editingLesson, generatedQuiz, lessons } = state;
        const title = elements.lessonTitle.value.trim();
        const video1Url = elements.video1Url.value.trim();
        const video1RevUrl = elements.video1RevUrl.value.trim();
        const video2Url = elements.video2Url.value.trim();
        const video2RevUrl = elements.video2RevUrl.value.trim();

        if (!title || !video1Url || !video2Url || !generatedQuiz) {
            showToast("제목, 기본 영상 1, 문제 풀이 영상 2, 퀴즈 정보는 필수입니다.");
            return;
        }

        this.setSaveButtonLoading(true);
        const lessonData = {
            title, video1Url, video1RevUrl, video2Url, video2RevUrl,
            questionBank: generatedQuiz,
        };

        try {
            if (editingLesson) {
                const lessonRef = doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', editingLesson.id);
                await updateDoc(lessonRef, lessonData);
                showToast("학습 세트가 성공적으로 수정되었습니다.", false);
            } else {
                lessonData.order = lessons.length;
                lessonData.isActive = false;
                lessonData.createdAt = serverTimestamp();
                const lessonsRef = collection(db, 'subjects', selectedSubjectIdForLesson, 'lessons');
                await addDoc(lessonsRef, lessonData);
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
        elements.video1RevUrl.value = '';
        elements.video2Url.value = '';
        elements.video2RevUrl.value = '';
        elements.quizJsonInput.value = '';
        elements.questionsPreviewContainer.classList.add('hidden');
        state.generatedQuiz = null;
        elements.modal.style.display = 'flex';
    },

    openLessonModalForEdit(lessonId) {
        const { state, elements } = this.app;
        const lessonData = state.lessons.find(l => l.id === lessonId);
        if (!lessonData) {
            showToast("수정할 학습 세트 정보를 찾을 수 없습니다.");
            return;
        }
        state.editingLesson = lessonData;
        elements.modalTitle.textContent = "학습 세트 수정";
        elements.lessonTitle.value = lessonData.title;
        elements.video1Url.value = lessonData.video1Url;
        elements.video1RevUrl.value = lessonData.video1RevUrl || '';
        elements.video2Url.value = lessonData.video2Url;
        elements.video2RevUrl.value = lessonData.video2RevUrl || '';
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
            if (!questionBank || !Array.isArray(questionBank)) {
                throw new Error("'questionBank' 배열을 찾을 수 없습니다.");
            }
            state.generatedQuiz = questionBank;
            const questionCount = state.generatedQuiz.length;
            elements.questionsPreviewTitle.textContent = `생성된 퀴즈 (${questionCount}문항)`;
            elements.questionsPreviewList.innerHTML = state.generatedQuiz.map((q, i) => `<p><b>${i+1}. ${q.question}</b></p>`).join('');
            elements.questionsPreviewContainer.classList.remove('hidden');
            showToast(`퀴즈 ${questionCount}개를 성공적으로 불러왔습니다.`, false);
        } catch (error) {
            state.generatedQuiz = null;
            elements.questionsPreviewContainer.classList.add('hidden');
            showToast(`JSON 형식이 올바르지 않습니다: ${error.message}`);
        }
    },

    setSaveButtonLoading(isLoading) {
        const { saveBtnText, saveLoader, saveLessonBtn } = this.app.elements;
        if (!saveBtnText || !saveLoader || !saveLessonBtn) return;
        saveBtnText.classList.toggle('hidden', isLoading);
        saveLoader.classList.toggle('hidden', !isLoading);
        saveLessonBtn.disabled = isLoading;
    }
};