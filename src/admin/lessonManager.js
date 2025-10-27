// src/admin/lessonManager.js

import { collection, onSnapshot, addDoc, doc, updateDoc, deleteDoc, query, orderBy, where, getDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonManager = {
    lessonUnsubscribe: null,
    
    // 모달 관련 요소는 AdminApp에서 캐시됨
    elements: {
        modal: null,
        lessonTitle: null,
        video1Url: null,
        video2Url: null,
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
        this.elements.video2Url = this.app.elements.video2Url;
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
        this.app.elements.addVideo1RevBtn?.addEventListener('click', () => this.handleVideoRevision('video1'));
        this.app.elements.addVideo2RevBtn?.addEventListener('click', () => this.handleVideoRevision('video2'));
        this.app.elements.saveOrderBtn?.addEventListener('click', () => this.saveLessonOrder());
    },

    // ✨ [추가] 과목 드롭다운 채우기 함수
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

        // 이전에 선택된 값 복원 시도
        if (currentSelection && subjects.some(s => s.id === currentSelection)) {
             select.value = currentSelection;
        } else {
             select.value = '';
        }
    },

    // 과목 선택 핸들러
    handleSubjectSelectForLesson(subjectId) {
        this.app.state.selectedSubjectIdForMgmt = subjectId;
        if (this.lessonUnsubscribe) this.lessonUnsubscribe(); // 기존 리스너 해제

        if (subjectId) {
            this.elements.lessonsManagementContent.style.display = 'block';
            this.elements.lessonsList.innerHTML = '<p class="text-sm text-slate-400">학습 세트 목록 로딩 중...</p>';
            this.listenForLessons(subjectId);
            this.app.elements.lessonPrompt.textContent = `${this.app.state.subjects.find(s => s.id === subjectId)?.name} 과목의 학습 세트 관리`;
        } else {
            this.elements.lessonsManagementContent.style.display = 'none';
            this.elements.lessonsList.innerHTML = '<p class="text-sm text-slate-400">먼저 과목을 선택해주세요.</p>';
        }
    },

    listenForLessons(subjectId) {
        if (!subjectId) return;

        // order 필드를 기준으로 정렬하여 가져오기
        const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy("order"));
        
        // 리스너 저장 및 실행
        this.lessonUnsubscribe = onSnapshot(q, (snapshot) => {
            this.app.state.lessons = [];
            snapshot.forEach(doc => this.app.state.lessons.push({ id: doc.id, ...doc.data() }));
            this.renderList(this.app.state.lessons);
        }, (error) => {
            console.error("[LessonManager] Lesson listen error:", error);
            showToast("학습 세트 목록 실시간 업데이트 실패", true);
            this.app.state.lessons = [];
            this.renderList([]);
        });
    },

    renderList(lessons) {
        const listEl = this.elements.lessonsList;
        if (!listEl) return;

        listEl.innerHTML = '';
        if (lessons.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 학습 세트가 없습니다. 새 학습 세트를 추가해보세요.</p>';
            return;
        }

        lessons.forEach((lesson, index) => {
            const div = document.createElement('div');
            div.className = "lesson-item p-3 border rounded-lg flex items-center justify-between bg-white cursor-move";
            div.setAttribute('draggable', true);
            div.dataset.id = lesson.id;
            div.dataset.order = lesson.order || index;

            div.innerHTML = `
                <div class="flex items-center space-x-3">
                    <span class="drag-handle text-slate-400 mr-2">☰</span>
                    <span class="font-medium text-slate-700">${lesson.title}</span>
                </div>
                <div class="flex space-x-2">
                    <button data-id="${lesson.id}" class="edit-lesson-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                    <button data-id="${lesson.id}" class="delete-lesson-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
                </div>
            `;
            listEl.appendChild(div);

            div.querySelector('.edit-lesson-btn')?.addEventListener('click', (e) => this.editLesson(e.target.dataset.id));
            div.querySelector('.delete-lesson-btn')?.addEventListener('click', (e) => this.deleteLesson(e.target.dataset.id));
        });

        // 드래그 앤 드롭 이벤트 리스너 추가
        this.addDragAndDropListeners();
    },

    addDragAndDropListeners() {
        const list = this.elements.lessonsList;
        let draggedItem = null;

        list.querySelectorAll('.lesson-item').forEach(item => {
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
                if (afterElement == null) {
                    list.appendChild(item);
                } else {
                    list.insertBefore(item, afterElement);
                }
            });
        });
    },

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.lesson-item:not(.dragging)')];

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
        const lessons = [...this.elements.lessonsList.querySelectorAll('.lesson-item')];
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId || lessons.length === 0) return;

        this.app.elements.saveOrderBtn.disabled = true;
        this.app.elements.saveOrderBtn.textContent = '순서 저장 중...';

        try {
            const updates = lessons.map((item, index) => {
                const lessonId = item.dataset.id;
                const newOrder = index + 1;
                return updateDoc(doc(db, `subjects/${subjectId}/lessons`, lessonId), { order: newOrder });
            });
            await Promise.all(updates);
            showToast("학습 세트 순서가 저장되었습니다.", false);
        } catch (error) {
            console.error("[LessonManager] Save order failed:", error);
            showToast("학습 세트 순서 저장에 실패했습니다.", true);
        } finally {
            this.app.elements.saveOrderBtn.disabled = false;
            this.app.elements.saveOrderBtn.textContent = '순서 저장';
        }
    },


    showModal(mode, lesson = null) {
        this.app.state.editingLesson = lesson;
        const isEdit = mode === 'edit';

        this.app.elements.modalTitle.textContent = isEdit ? '학습 세트 수정' : '새 학습 세트 추가';
        this.elements.lessonTitle.value = lesson?.title || '';
        this.elements.video1Url.value = lesson?.video1Url || '';
        this.elements.video2Url.value = lesson?.video2Url || '';
        this.elements.quizJsonInput.value = lesson?.quizJson || '';

        // 퀴즈 미리보기 초기화
        this.elements.questionsPreviewContainer.style.display = 'none';
        this.elements.questionsPreviewList.innerHTML = '';
        this.app.elements.questionsPreviewTitle.textContent = '퀴즈 미리보기';
        this.app.state.generatedQuiz = null;

        // 비디오 수정 이력 버튼 초기화
        this.renderVideoRevisionButtons(lesson);

        this.elements.modal.style.display = 'flex';
    },

    hideModal() {
        this.elements.modal.style.display = 'none';
        this.app.state.editingLesson = null;
    },

    async editLesson(lessonId) {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId) return;
        
        try {
            const docSnap = await getDoc(doc(db, `subjects/${subjectId}/lessons`, lessonId));
            if (docSnap.exists()) {
                this.showModal('edit', { id: docSnap.id, ...docSnap.data() });
            } else {
                showToast("해당 학습 세트를 찾을 수 없습니다.", true);
            }
        } catch (error) {
            showToast("학습 세트 정보를 불러오는 데 실패했습니다.", true);
            console.error(error);
        }
    },

    async saveLesson() {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId) { 
            showToast("과목을 선택해주세요."); 
            return; 
        }

        const title = this.elements.lessonTitle.value.trim();
        const video1Url = this.elements.video1Url.value.trim();
        const video2Url = this.elements.video2Url.value.trim();
        const quizJson = this.elements.quizJsonInput.value.trim();
        const isEdit = !!this.app.state.editingLesson;

        if (!title || (!video1Url && !video2Url && !quizJson)) {
            showToast("제목을 입력하고, 최소한 하나의 영상 URL이나 퀴즈 JSON을 입력해주세요.", true);
            return;
        }

        this.app.elements.saveBtnText.textContent = isEdit ? '수정 중...' : '저장 중...';
        this.app.elements.saveLessonBtn.disabled = true;
        this.app.elements.saveLoader.style.display = 'inline-block';

        const lessonData = {
            title,
            video1Url: video1Url || null,
            video2Url: video2Url || null,
            quizJson: quizJson || null,
            updatedAt: new Date(),
        };
        
        try {
            if (isEdit) {
                // 수정 모드
                await updateDoc(doc(db, `subjects/${subjectId}/lessons`, this.app.state.editingLesson.id), lessonData);
                showToast("학습 세트가 성공적으로 수정되었습니다.", false);
            } else {
                // 추가 모드 - 새 order 값 계산
                const newOrder = (this.app.state.lessons?.length || 0) + 1;
                lessonData.order = newOrder;
                lessonData.createdAt = new Date();
                await addDoc(collection(db, `subjects/${subjectId}/lessons`), lessonData);
                showToast("새 학습 세트가 성공적으로 추가되었습니다.", false);
            }
            this.hideModal();
        } catch (error) {
            console.error("[LessonManager] Save lesson failed:", error);
            showToast("학습 세트 저장에 실패했습니다.", true);
        } finally {
            this.app.elements.saveBtnText.textContent = isEdit ? '수정' : '저장';
            this.app.elements.saveLessonBtn.disabled = false;
            this.app.elements.saveLoader.style.display = 'none';
        }
    },

    async deleteLesson(lessonId) {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId) return;

        const lesson = this.app.state.lessons.find(l => l.id === lessonId);
        if (!lesson) return;

        if (!confirm(`'${lesson.title}' 학습 세트를 정말로 삭제하시겠습니까?`)) return;

        try {
            await deleteDoc(doc(db, `subjects/${subjectId}/lessons`, lessonId));
            showToast("학습 세트가 삭제되었습니다.", false);
            
            // 삭제 후 순서 재정렬 (선택 사항이지만 일관성 유지를 위해)
            await this.reorderLessonsAfterDeletion();
        } catch (error) { 
            console.error("[LessonManager] Delete lesson failed:", error);
            showToast("학습 세트 삭제에 실패했습니다."); 
        }
    },

    async reorderLessonsAfterDeletion() {
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId) return;

        // lessons 상태가 이미 onSnapshot에 의해 갱신되었으므로, 이를 사용
        const lessons = this.app.state.lessons.filter(l => l.order !== undefined).sort((a, b) => (a.order || 0) - (b.order || 0));

        try {
            const updates = lessons.map((lesson, index) => {
                const newOrder = index + 1;
                // 기존 order와 다를 때만 업데이트
                if (lesson.order !== newOrder) {
                    return updateDoc(doc(db, `subjects/${subjectId}/lessons`, lesson.id), { order: newOrder });
                }
                return Promise.resolve();
            }).filter(p => p instanceof Promise); // Promise만 필터링

            await Promise.all(updates);
            console.log("Lessons reordered successfully.");
        } catch (error) {
            console.error("Failed to reorder lessons after deletion:", error);
            // 사용자에게는 토스트 메시지 대신 콘솔 로그만 남김
        }
    },

    // 퀴즈 JSON 미리보기
    previewQuiz() {
        const quizJson = this.elements.quizJsonInput.value.trim();
        const previewContainer = this.elements.questionsPreviewContainer;
        const previewList = this.elements.questionsPreviewList;
        const previewTitle = this.app.elements.questionsPreviewTitle;

        if (!quizJson) {
            showToast("퀴즈 JSON을 입력해주세요.", true);
            previewContainer.style.display = 'none';
            return;
        }

        try {
            const quiz = JSON.parse(quizJson);
            
            if (!Array.isArray(quiz.questions)) {
                showToast("JSON 형식이 올바르지 않습니다. 'questions' 배열이 필요합니다.", true);
                previewContainer.style.display = 'none';
                return;
            }

            previewList.innerHTML = '';
            previewTitle.textContent = `퀴즈 미리보기 (${quiz.questions.length}문항)`;
            
            quiz.questions.forEach((q, index) => {
                const li = document.createElement('li');
                li.className = 'mb-4 p-3 border rounded-md bg-gray-50';
                
                let content = `
                    <p class="font-semibold text-sm mb-2 text-slate-700">Q${index + 1}. ${q.text}</p>
                    <ul class="list-disc ml-5 text-xs text-slate-600">
                `;
                q.options.forEach((opt, optIndex) => {
                    const isAnswer = q.correctAnswerIndex === optIndex;
                    content += `<li class="${isAnswer ? 'font-bold text-green-600' : ''}">${String.fromCharCode(65 + optIndex)}. ${opt} ${isAnswer ? '(정답)' : ''}</li>`;
                });
                content += '</ul>';
                
                if (q.explanation) {
                    content += `<p class="mt-2 text-xs text-slate-500">해설: ${q.explanation}</p>`;
                }
                
                li.innerHTML = content;
                previewList.appendChild(li);
            });

            previewContainer.style.display = 'block';
            this.app.state.generatedQuiz = quiz; // 상태에 저장 (추가적인 로직에 필요할 경우)

        } catch (e) {
            showToast("유효하지 않은 JSON 형식입니다.", true);
            console.error("JSON 파싱 오류:", e);
            previewContainer.style.display = 'none';
        }
    },

    // 비디오 수정 이력 관련 함수 (현재는 스텁/프롬프트만 제공)
    renderVideoRevisionButtons(lesson) {
        // 비디오 수정 이력 버튼에 현재 URL을 표시하고, 클릭 시 이력 관리 함수를 호출하는 로직 (현재는 간단한 팝업만)
        const btn1 = this.app.elements.addVideo1RevBtn;
        const btn2 = this.app.elements.addVideo2RevBtn;

        if (btn1) {
            btn1.textContent = lesson?.video1Url ? '수정 이력 관리' : '비디오 1 없음';
            btn1.disabled = !lesson?.video1Url;
        }
        if (btn2) {
            btn2.textContent = lesson?.video2Url ? '수정 이력 관리' : '비디오 2 없음';
            btn2.disabled = !lesson?.video2Url;
        }
    },

    handleVideoRevision(videoKey) {
        const lesson = this.app.state.editingLesson;
        const currentUrl = lesson?.[`${videoKey}Url`];
        
        if (!currentUrl) {
            showToast("현재 등록된 URL이 없습니다.", true);
            return;
        }

        // 실제 수정 이력 관리 모달/로직을 여기서 구현해야 합니다.
        // 현재는 콘솔에 메시지를 출력하고 간단한 팝업만 띄웁니다.
        console.log(`[Video Revision] ${lesson.title}의 ${videoKey} URL 이력 관리 요청: ${currentUrl}`);
        alert(`'${lesson.title}'의 ${videoKey}에 대한 수정 이력 관리 기능은 현재 개발 중입니다.\n현재 URL: ${currentUrl}`);
    }
};