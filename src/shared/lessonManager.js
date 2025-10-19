// src/shared/lessonManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, query, writeBatch } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

export function createLessonManager(config) {
    const { app, elements } = config;

    const lessonManager = {
        init() {
            document.getElementById(elements.subjectSelectForMgmt)?.addEventListener('change', (e) => {
                app.state.selectedSubjectIdForMgmt = e.target.value;
                this.handleLessonFilterChange();
            });
            document.getElementById(elements.showNewLessonModalBtn)?.addEventListener('click', () => this.openLessonModalForCreate());
            document.getElementById(elements.closeModalBtn)?.addEventListener('click', () => this.hideModal());
            document.getElementById(elements.cancelBtn)?.addEventListener('click', () => this.hideModal());
            document.getElementById(elements.previewQuizBtn)?.addEventListener('click', () => this.handleJsonPreview());
            document.getElementById(elements.saveLessonBtn)?.addEventListener('click', () => this.saveLesson());
            document.getElementById(elements.saveOrderBtn)?.addEventListener('click', () => this.saveLessonOrder());
            document.getElementById(elements.addVideo1RevBtn)?.addEventListener('click', () => this.addRevUrlInput(1));
            document.getElementById(elements.addVideo2RevBtn)?.addEventListener('click', () => this.addRevUrlInput(2));

            this.handleLessonFilterChange();
        },

        addRevUrlInput(type, url = '') {
            const container = document.getElementById(elements.videoRevUrlsContainer(type));
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
            const canShow = !!app.state.selectedSubjectIdForMgmt;
            const contentEl = document.getElementById(elements.lessonsManagementContent);
            const promptEl = document.getElementById(elements.lessonPrompt);
            const listEl = document.getElementById(elements.lessonsList);

            if (contentEl) contentEl.style.display = canShow ? 'block' : 'none';
            if (promptEl) promptEl.style.display = canShow ? 'none' : 'block';

            if (canShow) this.listenForLessons();
            else if(listEl) listEl.innerHTML = '';
        },

        listenForLessons() {
            const { selectedSubjectIdForMgmt } = app.state;
            if (!selectedSubjectIdForMgmt) return;

            const q = query(collection(db, 'subjects', selectedSubjectIdForMgmt, 'lessons'));
            onSnapshot(q, (snapshot) => {
                let lessons = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                // Firestore 쿼리에서 orderBy를 제거했으므로 클라이언트 측에서 정렬
                lessons.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity) || (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
                app.state.lessons = lessons;
                this.renderLessonList();
            });
        },

        renderLessonList() {
            const lessonsList = document.getElementById(elements.lessonsList);
            lessonsList.innerHTML = '';
            if (app.state.lessons.length === 0) {
                lessonsList.innerHTML = '<p class="text-center text-slate-500 py-8">아직 생성된 학습 세트가 없습니다.</p>';
                return;
            }
            app.state.lessons.forEach(lesson => this.renderLessonCard(lesson));
            this.initDragAndDrop();
        },

        renderLessonCard(lesson) {
            const lessonsList = document.getElementById(elements.lessonsList);
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
            lessonsList.appendChild(card);
            card.querySelector('.edit-lesson-btn').addEventListener('click', (e) => this.openLessonModalForEdit(e.target.dataset.id));
            card.querySelector('.toggle-active-btn').addEventListener('click', (e) => this.toggleLessonActive(e.target.dataset.id, e.target.dataset.active === 'true'));
            card.querySelector('.delete-btn').addEventListener('click', (e) => this.deleteLesson(e.target.dataset.id));
        },

        initDragAndDrop() {
            const list = document.getElementById(elements.lessonsList);
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
            const { selectedSubjectIdForMgmt } = app.state;
            if (!selectedSubjectIdForMgmt) return;

            const lessonCards = document.getElementById(elements.lessonsList).querySelectorAll('.lesson-card');
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
            const { selectedSubjectIdForMgmt } = app.state;
            const lessonRef = doc(db, 'subjects', selectedSubjectIdForMgmt, 'lessons', lessonId);
            try {
                await updateDoc(lessonRef, { isActive: !currentStatus });
                showToast(`학습이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`, false);
            } catch (error) { showToast("활성화 상태 변경에 실패했습니다.");}
        },

        async deleteLesson(lessonIdToDelete) {
            if (!confirm("정말로 이 학습 세트를 삭제하시겠습니까?")) return;
            try {
                await deleteDoc(doc(db, 'subjects', app.state.selectedSubjectIdForMgmt, 'lessons', lessonIdToDelete));
                showToast("학습 세트가 성공적으로 삭제되었습니다.", false);
            } catch (error) { showToast("학습 세트 삭제에 실패했습니다.");}
        },

        async saveLesson() {
            // 앱 상태에서 필요한 정보 가져오기
            const { selectedSubjectIdForMgmt, editingLesson, generatedQuiz, lessons } = app.state;
            // HTML 입력 요소에서 값 가져오기
            const title = document.getElementById(elements.lessonTitle).value.trim();
            const video1Url = document.getElementById(elements.video1Url).value.trim();
            const video2Url = document.getElementById(elements.video2Url).value.trim();

            // 보충 영상 URL 배열 만들기 (빈 값은 제외)
            const video1RevUrls = Array.from(document.querySelectorAll(`#${elements.videoRevUrlsContainer(1)} .rev-url-input`)).map(input => input.value.trim()).filter(Boolean);
            const video2RevUrls = Array.from(document.querySelectorAll(`#${elements.videoRevUrlsContainer(2)} .rev-url-input`)).map(input => input.value.trim()).filter(Boolean);

            // 필수 값 확인
            if (!title || !video1Url || !video2Url || !generatedQuiz) {
                showToast("제목, 기본 영상 1, 문제 풀이 영상 2, 퀴즈 정보는 필수입니다.");
                return; // 필수 값이 없으면 함수 종료
            }

            this.setSaveButtonLoading(true); // 저장 버튼 로딩 상태 시작

            // Firestore에 저장할 데이터 객체 생성
            const lessonData = {
                 title,
                 video1Url,
                 video2Url,
                 video1RevUrls,
                 video2RevUrls,
                 questionBank: generatedQuiz
            };

            // --- 👇 로그 추가 시작 👇 ---
            console.log("[Shared] 🔥 lessonData being saved:", JSON.stringify(lessonData, null, 2)); // 데이터 내용 확인 (JSON 문자열로 변환하여 undefined 확인 용이)
            // --- 👆 로그 추가 끝 👆 ---

            try {
                // 수정 모드일 경우
                if (editingLesson) {
                    // --- 👇 로그 추가 시작 👇 ---
                    console.log("[Shared] 🛠️ Updating lesson. Path:", 'subjects', selectedSubjectIdForMgmt, 'lessons', editingLesson?.id); // 경로 확인
                    // --- 👆 로그 추가 끝 👆 ---
                    if (!selectedSubjectIdForMgmt || !editingLesson.id) {
                        throw new Error("과목 ID 또는 수정할 학습 ID가 없습니다.");
                    }
                    await updateDoc(doc(db, 'subjects', selectedSubjectIdForMgmt, 'lessons', editingLesson.id), lessonData);
                    showToast("학습 세트가 성공적으로 수정되었습니다.", false);
                }
                // 생성 모드일 경우
                else {
                    // --- 👇 로그 추가 시작 👇 ---
                     console.log("[Shared] ✨ Creating new lesson. Path:", 'subjects', selectedSubjectIdForMgmt, 'lessons'); // 경로 확인
                    // --- 👆 로그 추가 끝 👆 ---
                    if (!selectedSubjectIdForMgmt) {
                        throw new Error("과목 ID가 없습니다.");
                    }
                    Object.assign(lessonData, {
                        order: lessons.length,
                        isActive: false,
                        createdAt: serverTimestamp()
                    });
                    await addDoc(collection(db, 'subjects', selectedSubjectIdForMgmt, 'lessons'), lessonData);
                    showToast("학습 세트가 성공적으로 생성되었습니다.", false);
                }
                this.hideModal();
            } catch(error) {
                console.error("[Shared] Firestore 저장 오류:", error); // 오류 로그에도 태그 추가
                showToast("저장 실패: " + error.message);
            } finally {
                this.setSaveButtonLoading(false);
            }
        },


        openLessonModalForCreate() {
            app.state.editingLesson = null;
            document.getElementById(elements.modalTitle).textContent = "새 학습 세트 만들기";
            document.getElementById(elements.lessonTitle).value = '';
            document.getElementById(elements.video1Url).value = '';
            document.getElementById(elements.video2Url).value = '';
            document.getElementById(elements.videoRevUrlsContainer(1)).innerHTML = '';
            document.getElementById(elements.videoRevUrlsContainer(2)).innerHTML = '';
            document.getElementById(elements.quizJsonInput).value = '';
            document.getElementById(elements.questionsPreviewContainer).classList.add('hidden');
            app.state.generatedQuiz = null;
            document.getElementById(elements.modal).style.display = 'flex';
        },

        openLessonModalForEdit(lessonId) {
            const lessonData = app.state.lessons.find(l => l.id === lessonId);
            if (!lessonData) { showToast("수정할 학습 세트 정보를 찾을 수 없습니다."); return; }
            app.state.editingLesson = lessonData;
            document.getElementById(elements.modalTitle).textContent = "학습 세트 수정";
            document.getElementById(elements.lessonTitle).value = lessonData.title;
            document.getElementById(elements.video1Url).value = lessonData.video1Url; // video1Url 필드가 없을 수 있음
            document.getElementById(elements.video2Url).value = lessonData.video2Url;

            const v1Container = document.getElementById(elements.videoRevUrlsContainer(1));
            const v2Container = document.getElementById(elements.videoRevUrlsContainer(2));
            v1Container.innerHTML = '';
            v2Container.innerHTML = '';

            lessonData.video1RevUrls?.forEach(url => this.addRevUrlInput(1, url));
            lessonData.video2RevUrls?.forEach(url => this.addRevUrlInput(2, url));

            // questionBank가 없을 경우 빈 객체로 처리하여 오류 방지
            document.getElementById(elements.quizJsonInput).value = JSON.stringify(lessonData.questionBank || {}, null, 2);
            this.handleJsonPreview(); // 미리보기 실행
            document.getElementById(elements.modal).style.display = 'flex';
        },

        hideModal() {
            app.state.editingLesson = null;
            document.getElementById(elements.modal).style.display = 'none';
        },

        handleJsonPreview() {
            const jsonText = document.getElementById(elements.quizJsonInput).value.trim();
            const previewContainer = document.getElementById(elements.questionsPreviewContainer);
            if (!jsonText) {
                showToast("붙여넣은 내용이 없습니다.");
                app.state.generatedQuiz = null;
                previewContainer.classList.add('hidden');
                return;
            }
            try {
                const parsedJson = JSON.parse(jsonText);
                // JSON 구조가 배열 형태인지, 또는 { questionBank: [] } 형태인지 확인
                const questionBank = Array.isArray(parsedJson) ? parsedJson : parsedJson.questionBank;
                if (!Array.isArray(questionBank)) throw new Error("JSON 데이터에서 'questionBank' 배열을 찾을 수 없습니다.");

                app.state.generatedQuiz = questionBank;
                const count = app.state.generatedQuiz.length;
                document.getElementById(elements.questionsPreviewTitle).textContent = `생성된 퀴즈 (${count}문항)`;
                // 각 질문 객체에 'question' 속성이 있는지 확인하고 표시
                document.getElementById(elements.questionsPreviewList).innerHTML = app.state.generatedQuiz.map((q, i) => `<p><b>${i+1}. ${q.question || '질문 없음'}</b></p>`).join('');
                previewContainer.classList.remove('hidden');
                showToast(`퀴즈 ${count}개를 성공적으로 불러왔습니다.`, false);
            } catch (error) {
                app.state.generatedQuiz = null;
                previewContainer.classList.add('hidden');
                showToast(`JSON 형식이 올바르지 않습니다: ${error.message}`);
            }
        },


        setSaveButtonLoading(isLoading) {
            const saveBtnText = document.getElementById(elements.saveBtnText);
            const saveLoader = document.getElementById(elements.saveLoader);
            const saveLessonBtn = document.getElementById(elements.saveLessonBtn);

            if(saveBtnText) saveBtnText.classList.toggle('hidden', isLoading);
            if(saveLoader) saveLoader.classList.toggle('hidden', !isLoading);
            if(saveLessonBtn) saveLessonBtn.disabled = isLoading;
        }
    };

    return lessonManager;
}