// src/teacher/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, orderBy, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonManager = {
    app: null,
    lessonUnsubscribe: null,
    
    // UI IDs Match teacherApp.js
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
        lessonPrompt: 'teacher-lesson-prompt',
        showNewLessonModalBtn: 'teacher-show-new-lesson-modal-btn',
        closeModalBtn: 'teacher-close-modal-btn',
        cancelBtn: 'teacher-cancel-btn',
        previewQuizBtn: 'teacher-preview-quiz-btn',
        addVideo1RevBtn: 'teacher-add-video1-rev-btn',
        saveOrderBtn: 'teacher-save-lesson-order-btn',
        modalTitle: 'teacher-lesson-modal-title',
        saveBtnText: 'teacher-save-btn-text',
        saveLoader: 'teacher-save-loader',
    },

    init(app) {
        this.app = app;
        this.addEventListeners();
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id]);

        el('subjectSelectForMgmt')?.addEventListener('change', (e) => this.handleLessonFilterChange(e.target.value));
        
        el('showNewLessonModalBtn')?.addEventListener('click', () => this.showModal('add'));
        el('closeModalBtn')?.addEventListener('click', () => this.hideModal());
        el('cancelBtn')?.addEventListener('click', () => this.hideModal());
        el('previewQuizBtn')?.addEventListener('click', () => this.previewQuiz());
        el('saveLessonBtn')?.addEventListener('click', () => this.saveLesson());
        el('addVideo1RevBtn')?.addEventListener('click', () => this.addRevUrlInput(1));
        el('saveOrderBtn')?.addEventListener('click', () => this.saveLessonOrder());
        
        document.getElementById('btnAddVideo2Item')?.addEventListener('click', () => this.addVideo2InputItem());
    },

    handleLessonFilterChange(subjectId) {
        const contentDiv = document.getElementById(this.elements.lessonsManagementContent);
        const listDiv = document.getElementById(this.elements.lessonsList);
        const promptDiv = document.getElementById(this.elements.lessonPrompt);

        if(this.app.state) this.app.state.selectedSubjectIdForMgmt = subjectId;

        if (this.lessonUnsubscribe) this.lessonUnsubscribe();

        if (subjectId) {
            contentDiv.style.display = 'block';
            if(promptDiv) promptDiv.style.display = 'none';
            listDiv.innerHTML = '<p class="text-sm text-slate-400">로딩 중...</p>';
            this.listenForLessons(subjectId);
        } else {
            contentDiv.style.display = 'none';
            if(promptDiv) promptDiv.style.display = 'block';
        }
    },

    listenForLessons(subjectId) {
        const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
        this.lessonUnsubscribe = onSnapshot(q, (snapshot) => {
            const lessons = [];
            snapshot.forEach(doc => lessons.push({ id: doc.id, ...doc.data() }));
            this.renderList(lessons);
        }, (error) => {
            console.error(error);
            const listEl = document.getElementById(this.elements.lessonsList);
            listEl.innerHTML = '<p class="text-red-500">로딩 실패</p>';
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
            
            div.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="material-icons text-slate-400">drag_indicator</span>
                    <h3 class="font-bold text-slate-800">${lesson.title}</h3>
                </div>
                <div class="flex items-center gap-2">
                    <button class="edit-btn text-blue-500 font-bold text-sm">수정</button>
                    <button class="toggle-btn ${isActive ? 'bg-gray-500' : 'bg-green-500'} text-white text-xs px-2 py-1 rounded">${isActive ? '비활성' : '활성'}</button>
                    <button class="delete-btn bg-red-500 text-white text-xs px-2 py-1 rounded">삭제</button>
                </div>`;
            
            div.querySelector('.edit-btn').onclick = () => this.showModal('edit', lesson);
            div.querySelector('.toggle-btn').onclick = () => this.toggleLessonActive(lesson.id, isActive);
            div.querySelector('.delete-btn').onclick = () => this.deleteLesson(lesson.id);

            listEl.appendChild(div);
        });
        
        // Drag and Drop (간소화)
        // (필요 시 기존 D&D 로직 추가 가능)
    },

    // ... (showModal, saveLesson, deleteLesson 등 기존 CRUD 로직 유지)
    showModal(mode, lesson = null) {
        const modal = document.getElementById(this.elements.modal);
        if (!modal) return;
        
        this.app.state.editingLesson = lesson;
        document.getElementById(this.elements.modalTitle).textContent = mode === 'edit' ? '학습 세트 수정' : '새 학습 세트 추가';
        document.getElementById(this.elements.lessonTitle).value = lesson?.title || '';
        document.getElementById(this.elements.video1Url).value = lesson?.video1Url || '';
        document.getElementById(this.elements.quizJsonInput).value = lesson?.quizJson || '';
        
        modal.style.display = 'flex';
    },

    hideModal() {
        document.getElementById(this.elements.modal).style.display = 'none';
        this.app.state.editingLesson = null;
    },

    async saveLesson() {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        const title = document.getElementById(this.elements.lessonTitle).value.trim();
        const video1Url = document.getElementById(this.elements.video1Url).value.trim();
        const quizJson = document.getElementById(this.elements.quizJsonInput).value.trim();

        if (!title) { showToast("제목 필수", true); return; }

        const data = {
            title, video1Url, quizJson,
            updatedAt: serverTimestamp(),
            isActive: this.app.state.editingLesson?.isActive ?? false
        };

        try {
            if (this.app.state.editingLesson) {
                await updateDoc(doc(db, `subjects/${subjectId}/lessons`, this.app.state.editingLesson.id), data);
            } else {
                data.order = 999;
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, `subjects/${subjectId}/lessons`), data);
            }
            showToast("저장됨");
            this.hideModal();
        } catch (e) { showToast("저장 실패", true); }
    },
    
    async deleteLesson(id) {
        if(!confirm("삭제?")) return;
        try {
            await deleteDoc(doc(db, `subjects/${this.app.state.selectedSubjectIdForMgmt}/lessons`, id));
            showToast("삭제됨");
        } catch(e) { showToast("실패", true); }
    },
    
    async toggleLessonActive(id, status) {
         try {
            await updateDoc(doc(db, `subjects/${this.app.state.selectedSubjectIdForMgmt}/lessons`, id), { isActive: !status });
            showToast("변경됨");
        } catch(e) { showToast("실패", true); }
    },

    addRevUrlInput() {}, // (구현 필요 시 추가)
    addVideo2InputItem() {}, // (구현 필요 시 추가)
    previewQuiz() {}, // (구현 필요 시 추가)
    saveLessonOrder() {} // (구현 필요 시 추가)
};