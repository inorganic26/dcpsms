// src/admin/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, writeBatch, orderBy, getDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonManager = {
    lessonUnsubscribe: null,
    
    elements: {
        modal: null,
        lessonTitle: null,
        video1Url: null,
        quizJsonInput: null,
        questionsPreviewContainer: null,
        questionsPreviewList: null,
        saveLessonBtn: null,
        subjectSelectForMgmt: null,
        lessonsManagementContent: null,
        lessonsList: null,
    },

    init(app) {
        this.app = app;
        this.cacheElements();
        this.addEventListeners();
    },

    cacheElements() {
        this.elements.modal = this.app.elements.modal;
        this.elements.lessonTitle = this.app.elements.lessonTitle;
        this.elements.video1Url = this.app.elements.video1Url;
        this.elements.quizJsonInput = this.app.elements.quizJsonInput;
        this.elements.questionsPreviewContainer = this.app.elements.questionsPreviewContainer;
        this.elements.questionsPreviewList = this.app.elements.questionsPreviewList;
        this.elements.saveLessonBtn = this.app.elements.saveLessonBtn;
        this.elements.subjectSelectForMgmt = this.app.elements.subjectSelectForMgmt;
        this.elements.lessonsManagementContent = this.app.elements.lessonsManagementContent;
        this.elements.lessonsList = this.app.elements.lessonsList;
    },

    addEventListeners() {
        this.elements.subjectSelectForMgmt?.addEventListener('change', (e) => this.handleSubjectSelectForLesson(e.target.value));
        this.app.elements.showNewLessonModalBtn?.addEventListener('click', () => this.showModal('add'));
        this.app.elements.closeModalBtn?.addEventListener('click', () => this.hideModal());
        this.app.elements.cancelBtn?.addEventListener('click', () => this.hideModal());
        this.app.elements.previewQuizBtn?.addEventListener('click', () => this.previewQuiz());
        this.app.elements.saveLessonBtn?.addEventListener('click', () => this.saveLesson());
        this.app.elements.addVideo1RevBtn?.addEventListener('click', () => this.addRevUrlInput(1));
        
        // ✨ [수정됨] 순서 저장 버튼 리스너 추가 (이 부분이 빠져 있었습니다)
        this.app.elements.saveOrderBtn?.addEventListener('click', () => this.saveLessonOrder());

        // 교재별 영상 추가 버튼 리스너
        document.getElementById('btnAddVideo2Item')?.addEventListener('click', () => this.addVideo2InputItem());
    },

    populateSubjectSelect() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;

        const subjects = this.app.state.subjects || [];
        const currentSelection = this.app.state.selectedSubjectIdForMgmt;

        select.innerHTML = '<option value="">-- 과목 선택 --</option>';

        if (subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>등록된 과목 없음</option>';
            return;
        }

        subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });

        if (currentSelection && subjects.some(s => s.id === currentSelection)) {
             select.value = currentSelection;
        } else {
             select.value = '';
        }
    },

    handleSubjectSelectForLesson(subjectId) {
        this.app.state.selectedSubjectIdForMgmt = subjectId;
        if (this.lessonUnsubscribe) this.lessonUnsubscribe();

        if (subjectId) {
            this.elements.lessonsManagementContent.style.display = 'block';
            this.elements.lessonsList.innerHTML = '<p class="text-sm text-slate-400">학습 세트 목록 로딩 중...</p>';
            this.listenForLessons(subjectId);
            this.app.elements.lessonPrompt.style.display = 'none';
        } else {
            this.elements.lessonsManagementContent.style.display = 'none';
            this.elements.lessonsList.innerHTML = '';
            this.app.elements.lessonPrompt.style.display = 'block';
        }
    },

    listenForLessons(subjectId) {
        if (!subjectId) return;
        const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
        
        this.lessonUnsubscribe = onSnapshot(q, (snapshot) => {
            this.app.state.lessons = [];
            snapshot.forEach(doc => this.app.state.lessons.push({ id: doc.id, ...doc.data() }));
            this.renderList(this.app.state.lessons);
        }, (error) => {
            console.error("[LessonManager] Lesson listen error:", error);
            showToast("학습 세트 목록 로딩 실패", true);
        });
    },

    renderList(lessons) {
        const listEl = this.elements.lessonsList;
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
                <div class="flex items-center space-x-3"><span class="drag-handle material-icons text-slate-400">drag_indicator</span><h3 class="font-bold text-slate-800">${lesson.title}</h3></div>
                <div class="flex-shrink-0 flex items-center gap-2">
                    <button data-id="${lesson.id}" class="edit-lesson-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                    <button data-id="${lesson.id}" data-active="${isActive}" class="toggle-active-btn ${isActive ? 'bg-gray-500' : 'bg-green-500'} text-white font-semibold px-3 py-1 rounded-lg text-xs">${isActive ? '비활성화' : '활성화'}</button>
                    <button data-id="${lesson.id}" class="delete-btn bg-red-500 text-white font-semibold px-3 py-1 rounded-lg text-xs">삭제</button>
                </div>`;
            listEl.appendChild(div);

            div.querySelector('.edit-lesson-btn')?.addEventListener('click', (e) => this.editLesson(e.target.dataset.id));
            div.querySelector('.delete-btn')?.addEventListener('click', (e) => this.deleteLesson(e.target.dataset.id));
             div.querySelector('.toggle-active-btn')?.addEventListener('click', (e) => this.toggleLessonActive(e.target.dataset.id, e.target.dataset.active === 'true'));
        });

        this.addDragAndDropListeners();
    },

    addDragAndDropListeners() {
        const list = this.elements.lessonsList;
        let draggedItem = null;

        list.querySelectorAll('.lesson-card').forEach(item => {
            item.addEventListener('dragstart', () => {
                draggedItem = item;
                setTimeout(() => item.classList.add('dragging'), 0);
            });
            item.addEventListener('dragend', () => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            });
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
        // querySelectorAll은 현재 DOM에 있는 순서대로 요소를 가져옵니다.
        const lessons = [...this.elements.lessonsList.querySelectorAll('.lesson-card')];
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId || lessons.length === 0) return;

        this.app.elements.saveOrderBtn.disabled = true;
        this.app.elements.saveOrderBtn.textContent = '순서 저장 중...';

        try {
            const batch = writeBatch(db);
            lessons.forEach((item, index) => {
                const lessonId = item.dataset.id;
                const lessonRef = doc(db, `subjects/${subjectId}/lessons`, lessonId);
                // 화면에 보이는 순서대로 1부터 번호를 매겨 업데이트
                batch.update(lessonRef, { order: index + 1 });
            });
            await batch.commit();
            showToast("학습 순서가 저장되었습니다.", false);
        } catch (error) {
            console.error(error);
            showToast("순서 저장 실패", true);
        } finally {
            this.app.elements.saveOrderBtn.disabled = false;
            this.app.elements.saveOrderBtn.textContent = '순서 저장';
        }
    },
    
    async toggleLessonActive(lessonId, currentStatus) {
        const { selectedSubjectIdForMgmt } = this.app.state;
        const lessonRef = doc(db, 'subjects', selectedSubjectIdForMgmt, 'lessons', lessonId);
        try {
            await updateDoc(lessonRef, { isActive: !currentStatus });
            showToast(`학습이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`, false);
        } catch (error) { 
            showToast("상태 변경 실패");
        }
    },

    editLesson(lessonId) {
        const lesson = this.app.state.lessons.find(l => l.id === lessonId);
        if (lesson) {
             this.showModal('edit', lesson);
        } else {
             showToast("정보를 찾을 수 없습니다.");
        }
    },

    showModal(mode, lesson = null) {
        if (!this.elements.modal) {
             showToast("모달 오류: 페이지를 새로고침 해주세요.", true);
             return;
        }
        
        this.app.state.editingLesson = lesson;
        const isEdit = mode === 'edit';

        this.app.elements.modalTitle.textContent = isEdit ? '학습 세트 수정' : '새 학습 세트 추가';
        this.elements.lessonTitle.value = lesson?.title || '';
        this.elements.video1Url.value = lesson?.video1Url || '';
        
        const video2Container = document.getElementById('video2ListContainer');
        if (video2Container) {
            video2Container.innerHTML = ''; 
            
            if (lesson) {
                if (lesson.video2List && Array.isArray(lesson.video2List)) {
                    lesson.video2List.forEach(item => this.addVideo2InputItem(item.name, item.url));
                } 
                else if (lesson.video2Url) {
                    this.addVideo2InputItem('기본', lesson.video2Url);
                } else {
                    this.addVideo2InputItem();
                }
            } else {
                this.addVideo2InputItem();
            }
        }
        
        let quizContent = lesson?.quizJson;
        try {
            if (!quizContent && lesson?.questionBank) {
                 quizContent = JSON.stringify(lesson.questionBank || [], null, 2);
            }
        } catch(e) {
             quizContent = lesson?.quizJson || ''; 
        }

        if (this.elements.quizJsonInput) {
             this.elements.quizJsonInput.value = quizContent || '';
        }
        
        const v1Container = document.getElementById('admin-video1-rev-urls-container');
        if (v1Container) {
            v1Container.innerHTML = '';
            lesson?.video1RevUrls?.forEach(url => this.addRevUrlInput(1, url));
        }

        this.elements.questionsPreviewContainer.style.display = 'none';
        this.elements.questionsPreviewList.innerHTML = '';
        this.app.state.generatedQuiz = null;
        
        if (quizContent) {
            this.previewQuiz(quizContent); 
        }
        
        this.elements.modal.style.display = 'flex';
    },
    
    addVideo2InputItem(name = '', url = '') {
        const container = document.getElementById('video2ListContainer');
        if (!container) return;

        const div = document.createElement('div');
        div.className = "flex gap-2 items-center video2-item mb-2";
        div.innerHTML = `
            <input type="text" class="video2-name border p-2 rounded w-1/3 text-sm" placeholder="교재명 (예: 쎈)" value="${name}">
            <input type="text" class="video2-url border p-2 rounded w-full text-sm" placeholder="유튜브 URL" value="${url}">
            <button type="button" class="btn-remove text-red-500 font-bold px-2 hover:bg-red-50 rounded">X</button>
        `;
        
        div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
        container.appendChild(div);
    },

    addRevUrlInput(type, url = '') {
        const containerId = type === 1 ? 'admin-video1-rev-urls-container' : 'admin-video2-rev-urls-container';
        const container = document.getElementById(containerId);
        if (!container) return;

        const inputGroup = document.createElement('div');
        inputGroup.className = 'flex items-center gap-2';
        inputGroup.innerHTML = `
            <input type="url" class="w-full p-2 border rounded-md rev-url-input form-input-sm" value="${url}" placeholder="보충 영상 URL">
            <button class="text-xs bg-red-500 text-white px-2 py-1 rounded-md font-bold hover:bg-red-600 btn-remove-rev">×</button>
        `;
        
        inputGroup.querySelector('.btn-remove-rev').onclick = () => inputGroup.remove();
        container.appendChild(inputGroup);
    },

    hideModal() {
        this.elements.modal.style.display = 'none';
        this.app.state.editingLesson = null;
    },

    async saveLesson() {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId) { showToast("과목을 선택해주세요."); return; }

        const title = this.elements.lessonTitle.value.trim();
        const video1Url = this.elements.video1Url.value.trim();
        
        const video2Items = document.querySelectorAll('.video2-item');
        const video2List = [];
        video2Items.forEach(item => {
            const name = item.querySelector('.video2-name').value.trim();
            const url = item.querySelector('.video2-url').value.trim();
            if (name && url) video2List.push({ name, url });
        });

        const quizJsonInput = this.elements.quizJsonInput.value.trim();
        const isEdit = !!this.app.state.editingLesson;
        
        const video1RevUrls = Array.from(document.querySelectorAll(`#admin-video1-rev-urls-container .rev-url-input`)).map(input => input.value.trim()).filter(Boolean);

        if (!title || (!video1Url && video2List.length === 0 && !quizJsonInput)) {
            showToast("제목과 최소 하나의 컨텐츠(영상/퀴즈)가 필요합니다.", true);
            return;
        }
        
        const generatedQuiz = this.app.state.generatedQuiz;
        this.app.elements.saveBtnText.textContent = '저장 중...';
        this.app.elements.saveLessonBtn.disabled = true;
        this.app.elements.saveLoader.style.display = 'inline-block';

        let finalQuizData = {};
        if (generatedQuiz) finalQuizData.questionBank = generatedQuiz;
        if (quizJsonInput) finalQuizData.quizJson = quizJsonInput;

        const lessonData = {
            title,
            video1Url: video1Url || null,
            video1RevUrls,
            video2List, 
            video2Url: video2List.length > 0 ? video2List[0].url : '', 
            ...finalQuizData,
            updatedAt: serverTimestamp(),
            isActive: this.app.state.editingLesson?.isActive ?? false,
        };
        
        try {
            if (isEdit) {
                await updateDoc(doc(db, `subjects/${subjectId}/lessons`, this.app.state.editingLesson.id), lessonData);
                showToast("수정되었습니다.", false);
            } else {
                const newOrder = (this.app.state.lessons?.length || 0) + 1;
                lessonData.order = newOrder;
                lessonData.createdAt = serverTimestamp();
                lessonData.isActive = false;
                await addDoc(collection(db, `subjects/${subjectId}/lessons`), lessonData);
                showToast("추가되었습니다.", false);
            }
            this.hideModal();
        } catch (error) {
            console.error("Save failed:", error);
            showToast("저장 실패", true);
        } finally {
            this.app.elements.saveBtnText.textContent = '저장하기';
            this.app.elements.saveLessonBtn.disabled = false;
            this.app.elements.saveLoader.style.display = 'none';
        }
    },

    async deleteLesson(lessonId) {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId || !lessonId) return;
        if (!confirm(`정말 삭제하시겠습니까?`)) return;

        try {
            await deleteDoc(doc(db, `subjects/${subjectId}/lessons`, lessonId));
            showToast("삭제되었습니다.", false);
        } catch (error) { 
            showToast("삭제 실패"); 
        }
    },

    previewQuiz(jsonString = null) {
        const quizJson = jsonString || this.elements.quizJsonInput.value.trim();
        const previewContainer = this.elements.questionsPreviewContainer;
        const previewList = this.elements.questionsPreviewList;
        const previewTitle = this.app.elements.questionsPreviewTitle;

        if (!quizJson) {
            previewContainer.style.display = 'none';
            return;
        }

        try {
            const quiz = JSON.parse(quizJson);
            const questions = Array.isArray(quiz) ? quiz : (quiz.questions || quiz.questionBank || []);

            if (!Array.isArray(questions) || questions.length === 0) {
                showToast("JSON 형식 오류: 문항이 없습니다.", true);
                return;
            }

            previewList.innerHTML = '';
            previewTitle.textContent = `퀴즈 미리보기 (${questions.length}문항)`;
            
            questions.forEach((q, index) => {
                const li = document.createElement('li');
                li.className = 'mb-4 p-3 border rounded-md bg-gray-50';
                const questionText = q.question || q.text || '질문 없음'; 
                let content = `<p class="font-semibold text-sm mb-2 text-slate-700">Q${index + 1}. ${questionText}</p><ul class="list-disc ml-5 text-xs text-slate-600">`;
                
                const options = q.options || [];
                options.forEach((opt, optIndex) => {
                    const isAnswer = q.correctAnswerIndex === optIndex;
                    const optionText = typeof opt === 'string' ? opt : (opt.text || '');
                    content += `<li class="${isAnswer ? 'font-bold text-green-600' : ''}">${String.fromCharCode(65 + optIndex)}. ${optionText} ${isAnswer ? '(정답)' : ''}</li>`;
                });
                content += '</ul>';
                li.innerHTML = content;
                previewList.appendChild(li);
            });

            previewContainer.style.display = 'block';
            this.app.state.generatedQuiz = questions;
            showToast(`퀴즈 로드 성공 (${questions.length}문항)`, false);

        } catch (e) {
            showToast(`JSON 파싱 오류`, true);
            previewContainer.style.display = 'none';
        }
    },
};