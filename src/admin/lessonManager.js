// src/admin/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, writeBatch, orderBy } from "firebase/firestore";
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
            this.app.elements.lessonPrompt.style.display = 'none'; // 프롬프트 숨기기
        } else {
            this.elements.lessonsManagementContent.style.display = 'none';
            this.elements.lessonsList.innerHTML = '';
            this.app.elements.lessonPrompt.style.display = 'block'; // 프롬프트 표시
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
            const isActive = lesson.isActive === true; // 활성화 상태 확인
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

        // 드래그 앤 드롭 이벤트 리스너 추가
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
                if (afterElement == null) {
                    list.appendChild(item);
                } else {
                    list.insertBefore(item, afterElement);
                }
            });
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
        const lessons = [...this.elements.lessonsList.querySelectorAll('.lesson-card')];
        const subjectId = this.app.state.selectedSubjectIdForMgmt;
        if (!subjectId || lessons.length === 0) return;

        this.app.elements.saveOrderBtn.disabled = true;
        this.app.elements.saveOrderBtn.textContent = '순서 저장 중...';

        try {
            const batch = writeBatch(db);
            lessons.forEach((item, index) => {
                const lessonId = item.dataset.id;
                const newOrder = index + 1;
                const lessonRef = doc(db, `subjects/${subjectId}/lessons`, lessonId);
                batch.update(lessonRef, { order: newOrder });
            });
            await batch.commit();
            showToast("학습 순서가 성공적으로 저장되었습니다.", false);
        } catch (error) {
            console.error("[LessonManager] Save order failed:", error);
            showToast("학습 세트 순서 저장에 실패했습니다.", true);
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
            console.error("[LessonManager] Toggle active failed:", error);
            showToast("활성화 상태 변경에 실패했습니다.");
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
        
        // 보충 영상 입력 필드 초기화 및 기존 값 채우기
        document.getElementById(this.app.elements.videoRevUrlsContainer(1)).innerHTML = '';
        document.getElementById(this.app.elements.videoRevUrlsContainer(2)).innerHTML = '';
        lesson?.video1RevUrls?.forEach(url => this.addRevUrlInput(1, url));
        lesson?.video2RevUrls?.forEach(url => this.addRevUrlInput(2, url));

        // 퀴즈 미리보기 초기화
        this.elements.questionsPreviewContainer.style.display = 'none';
        this.elements.questionsPreviewList.innerHTML = '';
        this.app.elements.questionsPreviewTitle.textContent = '퀴즈 미리보기';
        this.app.state.generatedQuiz = null;
        
        // 퀴즈 JSON이 있으면 미리보기 실행
        if (lesson?.quizJson) {
            this.previewQuiz(lesson.quizJson);
        }
        
        this.elements.modal.style.display = 'flex';
    },
    
    addRevUrlInput(type, url = '') {
        const containerId = type === 1 ? 'admin-video1-rev-urls-container' : 'admin-video2-rev-urls-container';
        const container = document.getElementById(containerId);
        if (!container) return;

        const inputGroup = document.createElement('div');
        inputGroup.className = 'flex items-center gap-2';

        const newInput = document.createElement('input');
        newInput.type = 'url';
        newInput.className = 'w-full p-2 border rounded-md rev-url-input form-input-sm';
        newInput.value = url;
        newInput.placeholder = `보충 영상 URL #${container.children.length + 1}`;

        const removeBtn = document.createElement('button');
        removeBtn.textContent = '×';
        removeBtn.className = 'text-xs bg-red-500 text-white px-2 py-1 rounded-md font-bold hover:bg-red-600';
        removeBtn.onclick = (e) => { e.preventDefault(); inputGroup.remove(); };

        inputGroup.appendChild(newInput);
        inputGroup.appendChild(removeBtn);
        container.appendChild(inputGroup);
    },


    hideModal() {
        this.elements.modal.style.display = 'none';
        this.app.state.editingLesson = null;
    },

    async saveLesson() {
        // ... (기존 saveLesson 로직을 그대로 사용) ...
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
        
        // 보충 영상 URL 배열 추출
        const video1RevUrls = Array.from(document.querySelectorAll(`#admin-video1-rev-urls-container .rev-url-input`)).map(input => input.value.trim()).filter(Boolean);
        const video2RevUrls = Array.from(document.querySelectorAll(`#admin-video2-rev-urls-container .rev-url-input`)).map(input => input.value.trim()).filter(Boolean);


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
            video1RevUrls, // ✨ 보충 영상 URL 필드 추가
            video2RevUrls, // ✨ 보충 영상 URL 필드 추가
            quizJson: quizJson || null,
            updatedAt: serverTimestamp(),
            isActive: this.app.state.editingLesson?.isActive ?? false, // 기존 상태 유지
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
                lessonData.createdAt = serverTimestamp();
                lessonData.isActive = false;
                await addDoc(collection(db, `subjects/${subjectId}/lessons`), lessonData);
                showToast("새 학습 세트가 성공적으로 추가되었습니다.", false);
            }
            this.hideModal();
        } catch (error) {
            console.error("[LessonManager] Save lesson failed:", error);
            showToast("학습 세트 저장에 실패했습니다.", true);
        } finally {
            this.app.elements.saveBtnText.textContent = isEdit ? '저장하기' : '저장하기';
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
        } catch (error) { 
            console.error("[LessonManager] Delete lesson failed:", error);
            showToast("학습 세트 삭제에 실패했습니다."); 
        }
    },

    // 퀴즈 JSON 미리보기
    previewQuiz(jsonString = null) {
        const quizJson = jsonString || this.elements.quizJsonInput.value.trim();
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
            
            // JSON 구조가 { questions: [...] } 형태인지, 아니면 바로 배열인지 확인
            const questions = Array.isArray(quiz) ? quiz : (quiz.questions || []);

            if (!Array.isArray(questions) || questions.length === 0) {
                showToast("JSON 형식이 올바르지 않거나, 'questions' 배열이 비어있습니다.", true);
                previewContainer.style.display = 'none';
                return;
            }

            previewList.innerHTML = '';
            previewTitle.textContent = `퀴즈 미리보기 (${questions.length}문항)`;
            
            questions.forEach((q, index) => {
                const li = document.createElement('li');
                li.className = 'mb-4 p-3 border rounded-md bg-gray-50';
                
                // q.question 또는 q.text 사용 가능
                const questionText = q.question || q.text || '질문 텍스트 없음'; 
                
                let content = `
                    <p class="font-semibold text-sm mb-2 text-slate-700">Q${index + 1}. ${questionText}</p>
                    <ul class="list-disc ml-5 text-xs text-slate-600">
                `;
                
                // 옵션 처리 (options 배열이 있다고 가정)
                const options = q.options || [];
                const correctAnswerIndex = q.correctAnswerIndex;
                
                options.forEach((opt, optIndex) => {
                    const isAnswer = correctAnswerIndex !== undefined && correctAnswerIndex === optIndex;
                    const optionText = typeof opt === 'string' ? opt : (opt.text || opt.value || '옵션 텍스트 없음');
                    content += `<li class="${isAnswer ? 'font-bold text-green-600' : ''}">${String.fromCharCode(65 + optIndex)}. ${optionText} ${isAnswer ? '(정답)' : ''}</li>`;
                });
                content += '</ul>';
                
                if (q.explanation) {
                    content += `<p class="mt-2 text-xs text-slate-500">해설: ${q.explanation}</p>`;
                }
                
                li.innerHTML = content;
                previewList.appendChild(li);
            });

            previewContainer.style.display = 'block';
            this.app.state.generatedQuiz = questions; // 상태에 저장
            showToast(`퀴즈 ${questions.length}문항을 성공적으로 불러왔습니다.`, false);

        } catch (e) {
            showToast(`유효하지 않은 JSON 형식입니다: ${e.message}`, true);
            console.error("JSON 파싱 오류:", e);
            previewContainer.style.display = 'none';
        }
    },

    // 비디오 수정 이력 관련 함수 (현재는 UI 구성이 미흡하여 임시로 URL 입력만 지원)
    renderVideoRevisionButtons(lesson) {
        // 기존 보충 영상 입력 필드 렌더링은 showModal에서 처리됨
    },

    handleVideoRevision(type) {
        // 이 함수는 단순히 새 입력 필드를 추가하는 역할만 수행합니다.
        const containerId = type === 'video1' ? 'admin-video1-rev-urls-container' : 'admin-video2-rev-urls-container';
        this.addRevUrlInput(type === 'video1' ? 1 : 2);
    }
};