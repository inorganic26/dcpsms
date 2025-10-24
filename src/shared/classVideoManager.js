// src/shared/classVideoManager.js
import {
    collection,
    doc,
    getDocs,
    setDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp,
    orderBy,
    updateDoc,
    addDoc
} from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

// 비디오 URL 유효성 검사 함수
function isValidUrl(string) {
    if (!string || !string.trim()) return false;
    try {
        const url = new URL(string.trim());
        // ✨ 오타 수정: "httpS:" -> "https:"
        return (url.protocol === "http:" || url.protocol === "https:") && url.host;
    } catch (_) {
        return false;
    }
}


export function createClassVideoManager(config) {
    const { app, elements } = config;
    let isLoading = false; // 로딩 중 상태 플래그

    const manager = {
        // === 상태 변수 ===
        currentQnaDate: null,
        currentLectureDate: null,
        selectedClassIdForQna: null,
        selectedClassIdForLecture: null,
        loadedQnaVideos: [],
        loadedLectureVideos: [], // Firestore에서 로드한 원본 데이터 (수정/저장 시 기준X)
        lectureDocId: null,      // 현재 로드된 수업 영상 문서 ID
        editingQnaVideoId: null,
        editingLectureVideoIndex: null, // 현재 UI 목록 기준 수정 중인 인덱스

        init() {
            // === 이벤트 리스너 ===
            document.getElementById(elements.qnaVideoDateInput)?.addEventListener('change', (e) => this.handleQnaDateChange(e.target.value));
            document.getElementById(elements.saveQnaVideoBtn)?.addEventListener('click', () => this.saveOrUpdateQnaVideo());
            if (elements.qnaClassSelect) { document.getElementById(elements.qnaClassSelect).addEventListener('change', (e) => this.handleQnaClassChangeForAdmin(e.target.value)); }

            document.getElementById(elements.lectureVideoDateInput)?.addEventListener('change', (e) => this.handleLectureDateChange(e.target.value));
            document.getElementById(elements.saveLectureVideoBtn)?.addEventListener('click', () => this.saveLectureVideos());
            document.getElementById(elements.addLectureVideoFieldBtn)?.addEventListener('click', (e) => { e.preventDefault(); this.addLectureVideoField(); });
            if (elements.lectureClassSelect) { document.getElementById(elements.lectureClassSelect).addEventListener('change', (e) => this.handleLectureClassChangeForAdmin(e.target.value)); }

            // 이벤트 위임
             document.getElementById(elements.qnaVideosList)?.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-qna-video-btn');
                const deleteBtn = e.target.closest('.delete-qna-video-btn');
                if (editBtn && editBtn.dataset.id) { e.stopPropagation(); this.openQnaVideoEditMode(editBtn.dataset.id); }
                if (deleteBtn && deleteBtn.dataset.id) { e.stopPropagation(); this.deleteQnaVideo(deleteBtn.dataset.id, deleteBtn.dataset.title); }
             });

            // ✨ 수업 영상 목록 이벤트 리스너 수정
            const lectureListContainer = document.getElementById(elements.lectureVideoListContainer);
            if (lectureListContainer) {
                lectureListContainer.addEventListener('click', (e) => {
                    const editBtn = e.target.closest('.edit-class-video-btn');
                    const deleteBtn = e.target.closest('.delete-class-video-btn'); // 목록 아이템의 삭제 버튼
                    const removeFieldBtn = e.target.closest('.remove-video-field-btn'); // 동적 필드의 'X' 버튼

                    if (editBtn && editBtn.dataset.index !== undefined) {
                        e.stopPropagation();
                        this.openLectureVideoEditMode(parseInt(editBtn.dataset.index, 10));
                    }
                    // ✨ 수정: 목록 아이템의 삭제 버튼 클릭 시 removeLectureVideoItemFromUI 호출
                    if (deleteBtn && deleteBtn.dataset.index !== undefined) {
                        e.stopPropagation();
                        const indexToDelete = parseInt(deleteBtn.dataset.index, 10);
                        const videoTitle = deleteBtn.dataset.title || '제목 없음';
                        console.log(`[Shared CVM] Lecture Delete button clicked for list item index: ${indexToDelete}, title: ${videoTitle}. Calling UI removal.`);
                        if (confirm(`'${videoTitle}' 영상을 목록에서 제거하시겠습니까? (최종 삭제는 '영상 저장하기' 클릭 시 반영됩니다)`)) {
                            this.removeLectureVideoItemFromUI(indexToDelete); // ❗ 올바른 함수 호출
                        }
                    }
                    if (removeFieldBtn) { // 'X' 버튼 로직 유지
                        console.log("[Shared CVM] Lecture Remove Field ('X') button clicked.");
                        e.preventDefault(); e.stopPropagation();
                        removeFieldBtn.closest('.video-field-group')?.remove();
                        this.reindexLectureVideoFields();
                    }
                });
            } else {
                console.error("[Shared CVM Init] lectureVideoListContainer not found!");
            }
        },

        // === 뷰 초기화 함수 (이전과 동일) ===
        initQnaView() { /*...*/ const dateInput = document.getElementById(elements.qnaVideoDateInput); const classSelect = document.getElementById(elements.qnaClassSelect); const teacherClassId = app?.state?.selectedClassId; if (dateInput) { const today = new Date().toISOString().slice(0, 10); if (!dateInput.value || dateInput.value !== today) { dateInput.value = today; } this.currentQnaDate = dateInput.value; } else { this.currentQnaDate = null; } if (classSelect) { this.populateClassSelect(elements.qnaClassSelect, 'selectedClassIdForQnaVideo'); classSelect.disabled = !this.currentQnaDate; this.selectedClassIdForQna = classSelect.value || null; } else { this.selectedClassIdForQna = teacherClassId || null; } this.resetQnaEditState(); this.loadQnaVideos(); },
        initLectureView() { /*...*/ const dateInput = document.getElementById(elements.lectureVideoDateInput); const classSelect = document.getElementById(elements.lectureClassSelect); const teacherClassId = app?.state?.selectedClassId; if (dateInput) { const today = new Date().toISOString().slice(0, 10); if (!dateInput.value || dateInput.value !== today) { dateInput.value = today; } this.currentLectureDate = dateInput.value; } else { this.currentLectureDate = null; } if (classSelect) { this.populateClassSelect(elements.lectureClassSelect, 'selectedClassIdForClassVideo'); classSelect.disabled = !this.currentLectureDate; this.selectedClassIdForLecture = classSelect.value || null; } else { this.selectedClassIdForLecture = teacherClassId || null; } this.resetLectureEditState(); this.loadLectureVideos(); },

        // === 공통 헬퍼 함수 (이전과 동일) ===
        populateClassSelect(selectElementId, stateKey) { /*...*/ const select = document.getElementById(selectElementId); if (!select || !app?.state?.classes) return; const currentSelection = app.state[stateKey] || select.value; select.innerHTML = '<option value="">-- 반 선택 --</option>'; if (app.state.classes.length === 0) { select.innerHTML += '<option value="" disabled>등록된 반 없음</option>'; select.disabled = true; if (app.state[stateKey]) app.state[stateKey] = null; return; } app.state.classes.forEach(cls => { select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`; }); if (app.state.classes.some(c => c.id === currentSelection)) { select.value = currentSelection; if (app.state[stateKey] !== currentSelection) app.state[stateKey] = currentSelection; } else if (app.state.classes.length > 0) { const dateSelected = stateKey === 'selectedClassIdForQnaVideo' ? this.currentQnaDate : this.currentLectureDate; if (dateSelected) { const firstClassId = app.state.classes[0].id; select.value = firstClassId; if (app.state[stateKey] !== firstClassId) app.state[stateKey] = firstClassId; } else { select.value = ''; if (app.state[stateKey]) app.state[stateKey] = null; } } else { select.value = ''; if (app.state[stateKey]) app.state[stateKey] = null; } select.disabled = !(stateKey === 'selectedClassIdForQnaVideo' ? this.currentQnaDate : this.currentLectureDate); },
        resetQnaEditState() { /*...*/ this.editingQnaVideoId = null; if (app?.state?.editingQnaVideoId) app.state.editingQnaVideoId = null; const titleInput = document.getElementById(elements.qnaVideoTitleInput); const urlInput = document.getElementById(elements.qnaVideoUrlInput); const saveBtn = document.getElementById(elements.saveQnaVideoBtn); if (titleInput) titleInput.value = ''; if (urlInput) urlInput.value = ''; if (saveBtn) saveBtn.textContent = '영상 저장하기'; },
        resetLectureEditState() { /*...*/ this.editingLectureVideoIndex = null; if (app?.state?.editingClassVideoIndex) app.state.editingClassVideoIndex = null; const titleInput = document.getElementById(elements.lectureVideoTitleInput); const urlInput = document.getElementById(elements.lectureVideoUrlInput); const saveBtn = document.getElementById(elements.saveLectureVideoBtn); if (titleInput) titleInput.value = ''; if (urlInput) urlInput.value = ''; if (saveBtn) saveBtn.textContent = '영상 저장하기'; },

        // === QnA 비디오 로직 (이전과 동일) ===
        handleQnaDateChange(selectedDate) { /*...*/ console.log(`[Shared CVM] QnA Date changed to: ${selectedDate}`); this.currentQnaDate = selectedDate || null; const classSelect = document.getElementById(elements.qnaClassSelect); if (classSelect) { classSelect.disabled = !selectedDate; if (!selectedDate) { classSelect.value = ''; this.selectedClassIdForQna = null; if (app?.state) app.state.selectedClassIdForQnaVideo = null; const listEl = document.getElementById(elements.qnaVideosList); if (listEl) listEl.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; this.resetQnaEditState(); return; } else if (classSelect.value === '' && app?.state?.classes?.length > 0) { const firstClassId = app.state.classes[0].id; classSelect.value = firstClassId; this.selectedClassIdForQna = firstClassId; if (app?.state) app.state.selectedClassIdForQnaVideo = firstClassId; } } this.resetQnaEditState(); this.loadQnaVideos(); },
        handleQnaClassChangeForAdmin(classId) { /*...*/ console.log(`[Shared CVM] QnA Class changed to: ${classId}`); this.selectedClassIdForQna = classId || null; if (app?.state) app.state.selectedClassIdForQnaVideo = classId || null; this.resetQnaEditState(); this.loadQnaVideos(); },
        async loadQnaVideos() { /*...*/ const classId = elements.qnaClassSelect ? this.selectedClassIdForQna : app?.state?.selectedClassId; const selectedDate = this.currentQnaDate; console.log(`[Shared CVM] loadQnaVideos called. isLoading: ${isLoading}, Date: ${selectedDate}, ClassId: ${classId}`); if (isLoading) { console.log("[Shared CVM] loadQnaVideos skipped because isLoading is true."); return; } isLoading = true; const listEl = document.getElementById(elements.qnaVideosList); if (!listEl) { isLoading = false; console.error("[Shared CVM] qnaVideosList element not found."); return; } if (!selectedDate) { listEl.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; this.loadedQnaVideos = []; isLoading = false; return; } if (!classId) { listEl.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>'; this.loadedQnaVideos = []; isLoading = false; return; } listEl.innerHTML = '<div class="loader-small mx-auto"></div>'; try { console.log(`[Shared CVM] Querying Firestore for QnA videos: classId=${classId}, videoDate=${selectedDate}`); const q = query( collection(db, 'classVideos'), where('classId', '==', classId), where('videoDate', '==', selectedDate), orderBy('createdAt', 'desc') ); const snapshot = await getDocs(q); this.loadedQnaVideos = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })); console.log(`[Shared CVM] Firestore query returned ${this.loadedQnaVideos.length} QnA videos. Rendering list...`); this.renderQnaVideoList(); } catch (error) { console.error("[Shared CVM] Error loading QnA videos:", error); listEl.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>'; this.loadedQnaVideos = []; } finally { console.log("[Shared CVM] loadQnaVideos finished."); isLoading = false; } },
        renderQnaVideoList() { /*...*/ const listEl = document.getElementById(elements.qnaVideosList); if (!listEl) return; listEl.innerHTML = ''; if (this.loadedQnaVideos.length === 0) { listEl.innerHTML = '<p class="text-sm text-slate-500">해당 날짜에 등록된 질문 영상이 없습니다.</p>'; return; } this.loadedQnaVideos.forEach(video => { const div = document.createElement('div'); div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm'; div.innerHTML = ` <div class="flex-grow mr-4 overflow-hidden"> <p class="font-medium text-slate-700 break-words">${video.title || '제목 없음'}</p> <a href="${video.youtubeUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.youtubeUrl || 'URL 없음'}</a> </div> <div class="flex gap-2 flex-shrink-0"> <button data-id="${video.id}" class="edit-qna-video-btn btn btn-secondary btn-sm">수정</button> <button data-id="${video.id}" data-title="${video.title || '제목 없음'}" class="delete-qna-video-btn btn btn-danger btn-sm">삭제</button> </div>`; listEl.appendChild(div); }); },
        async openQnaVideoEditMode(videoId) { /*...*/ console.log(`[Shared CVM] ---- Start openQnaVideoEditMode for ID: ${videoId} ----`); const videoData = this.loadedQnaVideos.find(v => v.id === videoId); if (!videoData) { showToast("수정할 영상 정보 없음"); console.error(`[Shared CVM] QnA video data not found for ID: ${videoId} in loadedQnaVideos:`, this.loadedQnaVideos); console.log(`[Shared CVM] ---- End openQnaVideoEditMode (failed) for ID: ${videoId} ----`); return; } console.log("[Shared CVM] Found QnA video data:", videoData); const titleInput = document.getElementById(elements.qnaVideoTitleInput); const urlInput = document.getElementById(elements.qnaVideoUrlInput); const saveBtn = document.getElementById(elements.saveQnaVideoBtn); if (titleInput) { console.log("[Shared CVM] Setting title input value:", videoData.title); titleInput.value = videoData.title || ''; } if (urlInput) { console.log("[Shared CVM] Setting URL input value:", videoData.youtubeUrl); urlInput.value = videoData.youtubeUrl || ''; } console.log("[Shared CVM] Setting editingQnaVideoId:", videoId); this.editingQnaVideoId = videoId; if (app?.state) app.state.editingQnaVideoId = videoId; if (saveBtn) { console.log("[Shared CVM] Updating save button text."); saveBtn.textContent = '수정하기'; } showToast("영상 정보 로드 완료. 수정 후 [수정하기] 클릭.", false); console.log("[Shared CVM] Scrolling into view (if element exists)."); titleInput?.scrollIntoView({ behavior: 'smooth', block: 'center' }); console.log(`[Shared CVM] ---- End openQnaVideoEditMode (success) for ID: ${videoId} ----`); },
        async saveOrUpdateQnaVideo() { /*...*/ const titleInput = document.getElementById(elements.qnaVideoTitleInput); const urlInput = document.getElementById(elements.qnaVideoUrlInput); const saveBtn = document.getElementById(elements.saveQnaVideoBtn); const classId = elements.qnaClassSelect ? this.selectedClassIdForQna : app?.state?.selectedClassId; const videoDate = this.currentQnaDate; const title = titleInput?.value.trim(); const url = urlInput?.value.trim(); const editingId = this.editingQnaVideoId; if (!classId || !videoDate || !title || !url) { showToast("날짜, 반, 제목, URL 필수."); return; } if (!isValidUrl(url)) { showToast("유효하지 않은 URL 형식입니다.", true); urlInput?.classList.add('border-red-500'); return; } else { urlInput?.classList.remove('border-red-500'); } const videoData = { classId, videoDate, title, youtubeUrl: url }; if (saveBtn) saveBtn.disabled = true; try { if (editingId) { console.log(`[Shared CVM] Updating QnA video ID: ${editingId}`); await updateDoc(doc(db, 'classVideos', editingId), videoData); showToast("질문 영상 수정 성공!", false); } else { console.log("[Shared CVM] Adding new QnA video"); videoData.createdAt = serverTimestamp(); await addDoc(collection(db, 'classVideos'), videoData); showToast("질문 영상 저장 성공!", false); } this.resetQnaEditState(); this.loadQnaVideos(); } catch (error) { console.error(`[Shared CVM] Error saving/updating QnA video: ${error}`); showToast(`영상 ${editingId ? '수정' : '저장'} 실패: ${error.message}`); } finally { if (saveBtn) saveBtn.disabled = false; } },
        async deleteQnaVideo(videoId, videoTitle) { /*...*/ if (!videoId) return; console.log(`[Shared CVM] Attempting to delete QnA video ID: ${videoId}`); if (confirm(`'${videoTitle || '제목 없음'}' 영상을 정말 삭제하시겠습니까?`)) { try { await deleteDoc(doc(db, 'classVideos', videoId)); showToast("영상이 삭제되었습니다.", false); if (this.editingQnaVideoId === videoId) this.resetQnaEditState(); this.loadQnaVideos(); } catch (err) { console.error(`[Shared CVM] Error deleting QnA video: ${err}`); showToast("영상 삭제 실패"); } } },

        // === 수업 영상 로직 ===
        handleLectureDateChange(selectedDate) { /*...*/ console.log(`[Shared CVM] Lecture Date changed to: ${selectedDate}`); this.currentLectureDate = selectedDate || null; const classSelect = document.getElementById(elements.lectureClassSelect); if (classSelect) { classSelect.disabled = !selectedDate; if (!selectedDate) { classSelect.value = ''; this.selectedClassIdForLecture = null; if (app?.state) app.state.selectedClassIdForClassVideo = null; const listContainer = document.getElementById(elements.lectureVideoListContainer); if (listContainer) listContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; this.resetLectureEditState(); return; } else if (classSelect.value === '' && app?.state?.classes?.length > 0) { const firstClassId = app.state.classes[0].id; classSelect.value = firstClassId; this.selectedClassIdForLecture = firstClassId; if (app?.state) app.state.selectedClassIdForClassVideo = firstClassId; } } this.resetLectureEditState(); this.loadLectureVideos(); },
        handleLectureClassChangeForAdmin(classId) { /*...*/ console.log(`[Shared CVM] Lecture Class changed to: ${classId}`); this.selectedClassIdForLecture = classId || null; if (app?.state) app.state.selectedClassIdForClassVideo = classId || null; this.resetLectureEditState(); this.loadLectureVideos(); },

        async loadLectureVideos() {
            // ✨ 상세 로깅 유지 (이전과 동일)
            const classId = elements.lectureClassSelect ? this.selectedClassIdForLecture : app?.state?.selectedClassId;
            const selectedDate = this.currentLectureDate;
            console.log(`[Shared CVM] >>> loadLectureVideos called. isLoading: ${isLoading}, Date: ${selectedDate}, ClassId: ${classId}`);
            if (isLoading) { console.log("[Shared CVM] loadLectureVideos skipped: Already loading."); return; }
            isLoading = true;
            this.lectureDocId = null;
            const listContainer = document.getElementById(elements.lectureVideoListContainer);
            if (!listContainer) { isLoading = false; console.error("[Shared CVM] lectureVideoListContainer element not found."); return; }
            if (!selectedDate) { listContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; this.loadedLectureVideos = []; isLoading = false; return; }
            if (!classId) { listContainer.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>'; this.loadedLectureVideos = []; isLoading = false; return; }
            listContainer.innerHTML = '<div class="loader-small mx-auto"></div>';
            try {
                console.log(`[Shared CVM] Querying Firestore for Lecture videos: classId=${classId}, lectureDate=${selectedDate}`);
                const q = query( collection(db, 'classLectures'), where('classId', '==', classId), where('lectureDate', '==', selectedDate) );
                const snapshot = await getDocs(q);
                console.log(`[Shared CVM] Firestore query snapshot empty: ${snapshot.empty}, size: ${snapshot.size}`);
                if (snapshot.empty) {
                    this.loadedLectureVideos = [];
                    this.lectureDocId = null;
                    console.log("[Shared CVM] No lecture document found for this date/class.");
                } else {
                    const docSnap = snapshot.docs[0];
                    this.lectureDocId = docSnap.id;
                    const docData = docSnap.data();
                    console.log(`[Shared CVM] Found lecture document ID: ${docSnap.id}, Data:`, JSON.stringify(docData));
                    this.loadedLectureVideos = Array.isArray(docData.videos) ? docData.videos : [];
                    console.log(`[Shared CVM] Extracted ${this.loadedLectureVideos.length} videos from document.`);
                }
                console.log(`[Shared CVM] Rendering ${this.loadedLectureVideos.length} lecture videos...`);
                console.log("[Shared CVM] About to call renderLectureVideoList with:", this.loadedLectureVideos);
                this.renderLectureVideoList();
            } catch (error) {
                console.error("[Shared CVM] Error loading Lecture videos:", error);
                listContainer.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>'; this.loadedLectureVideos = []; this.lectureDocId = null;
            }
            finally {
                console.log("[Shared CVM] <<< loadLectureVideos finished.");
                isLoading = false;
            }
        },

        renderLectureVideoList() {
             // ✨ 상세 로깅 유지 (이전과 동일)
             const listContainer = document.getElementById(elements.lectureVideoListContainer);
             if (!listContainer) { console.error("[Shared CVM] Cannot render: lectureVideoListContainer not found."); return; }
             listContainer.innerHTML = '';
             const videos = this.loadedLectureVideos;
             console.log(`[Shared CVM] renderLectureVideoList called. Rendering ${videos?.length ?? 0} videos.`);
            if (!Array.isArray(videos) || videos.length === 0) {
                 console.log("[Shared CVM] No videos to render.");
                 const noVideoMessage = elements.addLectureVideoFieldBtn ? "등록된 영상이 없습니다. 아래 버튼으로 추가하세요." : "등록된 영상이 없습니다.";
                 listContainer.innerHTML = `<p class="text-sm text-slate-500">${noVideoMessage}</p>`;
                 return;
            }
            videos.forEach((video, index) => {
                console.log(`[Shared CVM] Creating list item for index ${index}, title: ${video.title}`);
                const div = document.createElement('div');
                div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm video-list-item';
                div.dataset.index = index;
                div.innerHTML = `
                    <div class="flex-grow mr-4 overflow-hidden">
                        <p class="font-medium text-slate-700 break-words">${index + 1}. ${video.title || '제목 없음'}</p>
                        <a href="${video.url}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.url || 'URL 없음'}</a>
                    </div>
                    <div class="flex gap-2 flex-shrink-0">
                        <button data-index="${index}" class="edit-class-video-btn btn btn-secondary btn-sm">수정</button>
                        <button data-index="${index}" data-title="${video.title || '제목 없음'}" class="delete-class-video-btn btn btn-danger btn-sm">삭제</button>
                    </div>`;
                listContainer.appendChild(div);
                console.log(`[Shared CVM] Appended list item for index ${index}`);
            });
            console.log("[Shared CVM] Finished rendering lecture video list.");
        },

        addLectureVideoField(title = '', url = '') { /*...*/ }, // Unchanged
        reindexLectureVideoFields() { /*...*/ }, // Unchanged
        reindexLectureVideoListItems() { /*...*/ }, // Unchanged
        openLectureVideoEditMode(index) { /*...*/ }, // Unchanged

        // ✨ UI 아이템 제거 함수 (이전과 동일)
        removeLectureVideoItemFromUI(index) {
             const container = document.getElementById(elements.lectureVideoListContainer);
             const itemToRemove = container?.querySelector(`.video-list-item[data-index="${index}"]`);
             if (itemToRemove) {
                 console.log(`[Shared CVM] Removing lecture video list item at index ${index} from UI.`);
                 itemToRemove.remove();
                 this.reindexLectureVideoListItems(); // 목록 아이템 인덱스 재정렬

                 if (container?.querySelectorAll('.video-list-item').length === 0) {
                      const noVideoMessage = elements.addLectureVideoFieldBtn ? "등록된 영상이 없습니다. 아래 버튼으로 추가하세요." : "등록된 영상이 없습니다.";
                      container.innerHTML = `<p class="text-sm text-slate-500">${noVideoMessage}</p>`;
                 }
                 showToast("영상 항목이 목록에서 제거되었습니다. '영상 저장하기' 버튼을 눌러 최종 저장하세요.", false);
             } else {
                  console.warn(`[Shared CVM] Could not find list item to remove at index ${index}.`);
             }
         },

        async saveLectureVideos() {
            // ✨ 데이터 수집 로직 수정: 화면의 요소에서 직접 읽기
            const classId = elements.lectureClassSelect ? this.selectedClassIdForLecture : app?.state?.selectedClassId;
            const selectedDate = this.currentLectureDate;
            const saveBtn = document.getElementById(elements.saveLectureVideoBtn);
            const listContainer = document.getElementById(elements.lectureVideoListContainer);

            console.log(`[Shared CVM] >>> saveLectureVideos called. Date: ${selectedDate}, ClassId: ${classId}, Editing Index: ${this.editingLectureVideoIndex}`);

            if (!selectedDate || !classId) { showToast("날짜와 반 필수.", true); return; }

            let videosToSave = []; // ✨ 최종 저장할 배열
            let hasError = false;

            // '영상 추가 또는 수정' 영역의 단일 필드 값
            const currentTitleInput = document.getElementById(elements.lectureVideoTitleInput || 'admin-class-video-title');
            const currentUrlInput = document.getElementById(elements.lectureVideoUrlInput || 'admin-class-video-url');
            const currentTitle = currentTitleInput?.value.trim();
            const currentUrl = currentUrlInput?.value.trim();
            const editingIndex = this.editingLectureVideoIndex;

            console.log(`[Shared CVM] saveLectureVideos - Current Input Title: ${currentTitle}, Current Input URL: ${currentUrl}`);

            // ✨ 데이터 수집: 현재 화면에 *보이는* 요소들로부터 데이터를 읽어옴
            const items = listContainer?.querySelectorAll('.video-list-item'); // 현재 렌더링된 목록 아이템
            const fields = listContainer?.querySelectorAll('.video-field-group'); // 현재 렌더링된 동적 입력 필드 (선생님 앱)
            let collectedData = []; // UI에서 수집된 데이터를 임시 저장할 배열

            // ✨ 로직 수정: items(목록) 또는 fields(동적입력) 중 하나만 사용
            if (items && items.length > 0) { // 목록 아이템이 화면에 있으면, 거기서 데이터 추출
                console.log(`[Shared CVM] Reading data from ${items.length} rendered list items.`);
                items.forEach((item, currentItemIndex) => {
                     const titleElem = item.querySelector('p.font-medium');
                     const urlElem = item.querySelector('a');
                     const title = titleElem ? titleElem.textContent.replace(/^\d+\.\s*/, '').trim() : '';
                     const url = urlElem ? urlElem.href : ''; // href 속성 (전체 URL) 사용

                     if (title && url) {
                          if (!isValidUrl(url)) {
                                showToast(`목록의 영상 ${currentItemIndex + 1} URL 형식 오류.`, true); hasError = true;
                          } else {
                                collectedData.push({ title: title, url: url });
                          }
                     } else { console.warn(`[Shared CVM] Missing title or url in list item at apparent index ${currentItemIndex}`); }
                });
            } else if (fields && fields.length > 0) { // 동적 입력 필드에서 데이터 추출
                console.log(`[Shared CVM] Reading data from ${fields.length} dynamic fields.`);
                 fields.forEach((field) => {
                     const titleInput = field.querySelector('.lecture-video-title-input');
                     const urlInput = field.querySelector('.lecture-video-url-input');
                     const title = titleInput?.value.trim();
                     const url = urlInput?.value.trim();
                     const fieldIdx = parseInt(field.dataset.index, 10);
                     if (title || url) {
                         if (!title || !url) { showToast(`입력 필드 ${fieldIdx + 1} 제목/URL 필수.`, true); hasError = true; }
                         else if (!isValidUrl(url)) { showToast(`입력 필드 ${fieldIdx + 1} URL 형식 오류.`, true); hasError = true; }
                         else { collectedData.push({ title, url }); }
                     }
                 });
            }
            console.log("[Shared CVM] Data collected from UI elements:", collectedData);


            // 데이터 병합 (수정 모드 우선)
            if (editingIndex !== null) { // 수정 모드 (단일 필드 사용)
                console.log(`[Shared CVM] In Edit Mode (Index: ${editingIndex})`);
                 if (!currentTitle || !currentUrl) { showToast("수정 중인 영상 제목/URL 필수.", true); hasError = true; }
                 else if (!isValidUrl(currentUrl)) { showToast("수정 중인 영상 URL 형식 오류.", true); currentUrlInput?.classList.add('border-red-500'); hasError = true; }
                 else {
                    if (editingIndex >= 0 && editingIndex < collectedData.length) {
                        collectedData[editingIndex] = { title: currentTitle, url: currentUrl };
                        videosToSave.push(...collectedData); // 최종 저장 목록
                        console.log(`[Shared CVM] Updated video at index ${editingIndex}. videosToSave:`, videosToSave);
                    } else {
                         console.error("[Shared CVM] Invalid editing index during save:", editingIndex, "Collected data length:", collectedData.length);
                         // ✨ 오류: 수정 인덱스가 유효하지 않음.
                         // 이전에 로드된 데이터를 기반으로 시도
                         let fallbackList = [...this.loadedLectureVideos];
                         if(editingIndex >= 0 && editingIndex < fallbackList.length) {
                             fallbackList[editingIndex] = { title: currentTitle, url: currentUrl };
                             videosToSave.push(...fallbackList);
                             console.warn("[Shared CVM] Used fallback loadedLectureVideos list for update.");
                         } else {
                            console.error("[Shared CVM] Fallback index also invalid. Save aborted.");
                            hasError = true;
                         }
                    }
                 }
            } else { // 추가 모드 또는 목록만 있는 경우
                 console.log("[Shared CVM] In Add Mode or List-only Mode");
                 videosToSave.push(...collectedData); // 목록/필드 데이터 우선 복사
                 // 단일 필드에 입력 있으면 추가
                 if (currentTitle || currentUrl) {
                     if (!currentTitle || !currentUrl) { showToast("새 영상 제목/URL 필수.", true); hasError = true; }
                     else if (!isValidUrl(currentUrl)) { showToast("새 영상 URL 형식 오류.", true); hasError = true; }
                     else {
                         videosToSave.push({ title: currentTitle, url: currentUrl });
                         console.log("[Shared CVM] Added new video from single input field. videosToSave:", videosToSave);
                     }
                 } else {
                     console.log("[Shared CVM] No new video data in single field, using collected list data. videosToSave:", videosToSave);
                 }
            }


            if (hasError) { console.log("[Shared CVM] Error detected during data collection, aborting save."); return; }
            console.log("[Shared CVM] Final videos prepared for saving:", JSON.stringify(videosToSave)); // ✨ 최종 저장 데이터 로깅

            if (videosToSave.length === 0 && !currentTitle && !currentUrl && editingIndex === null) {
                 showToast("저장할 영상 정보가 없습니다.");
                 console.log("[Shared CVM] Aborting save: No videos to save and no input.");
                 return;
            }

            if (saveBtn) saveBtn.disabled = true;

            try {
                await this.saveLectureVideosInternal(videosToSave); // ✨ 내부 저장 함수 호출
                showToast(`수업 영상 ${editingIndex !== null ? '수정' : '저장'} 완료.`, false);
                this.resetLectureEditState(); // ✨ 수정 모드 종료 및 입력 필드 초기화
            } catch (error) { console.error("[Shared CVM] Error during saveLectureVideos execution:", error); }
            finally { if (saveBtn) saveBtn.disabled = false; }
        },

        // ✨ UI 목록 아이템 제거 함수 (이전과 동일)
        removeLectureVideoItemFromUI(index) { /*...*/ const container = document.getElementById(elements.lectureVideoListContainer); const itemToRemove = container?.querySelector(`.video-list-item[data-index="${index}"]`); if (itemToRemove) { console.log(`[Shared CVM] Removing lecture video list item at index ${index} from UI.`); itemToRemove.remove(); this.reindexLectureVideoListItems(); if (container?.querySelectorAll('.video-list-item').length === 0) { const noVideoMessage = elements.addLectureVideoFieldBtn ? "등록된 영상이 없습니다. 아래 버튼으로 추가하세요." : "등록된 영상이 없습니다."; container.innerHTML = `<p class="text-sm text-slate-500">${noVideoMessage}</p>`; } showToast("영상 항목이 목록에서 제거되었습니다. '영상 저장하기' 버튼을 눌러 최종 저장하세요.", false); } else { console.warn(`[Shared CVM] Could not find list item to remove at index ${index}.`); } },
        // ✨ 목록 아이템 인덱스 재정렬 함수 (이전과 동일)
        reindexLectureVideoListItems() { /*...*/ const container = document.getElementById(elements.lectureVideoListContainer); const items = container?.querySelectorAll('.video-list-item'); items?.forEach((item, newIndex) => { item.dataset.index = newIndex; item.querySelector('.edit-class-video-btn')?.setAttribute('data-index', newIndex); item.querySelector('.delete-class-video-btn')?.setAttribute('data-index', newIndex); const titleElement = item.querySelector('.font-medium'); if (titleElement) { titleElement.textContent = titleElement.textContent.replace(/^\d+\.\s*/, `${newIndex + 1}. `); } }); },

        async saveLectureVideosInternal(videosToSave) {
            // ✨ 문서 ID 사용 및 삭제 조건 수정 (이전과 동일)
            const classId = elements.lectureClassSelect ? this.selectedClassIdForLecture : app?.state?.selectedClassId;
            const selectedDate = this.currentLectureDate;
            const saveBtn = document.getElementById(elements.saveLectureVideoBtn);
            const currentDocId = this.lectureDocId;

            if (!selectedDate || !classId) { throw new Error("날짜와 반이 모두 선택되어야 합니다."); }
            if (saveBtn) saveBtn.disabled = true;
             console.log("[Shared CVM] >>> saveLectureVideosInternal called with videos:", JSON.stringify(videosToSave), ` Current Doc ID: ${currentDocId}`);

            try {
                let docRef;
                if ((!Array.isArray(videosToSave) || videosToSave.length === 0) && currentDocId) {
                    docRef = doc(db, 'classLectures', currentDocId);
                    console.log(`[Shared CVM] Deleting existing lecture document ID: ${currentDocId} (Internal) because videosToSave is empty.`);
                    await deleteDoc(docRef);
                    this.loadedLectureVideos = [];
                    this.lectureDocId = null;
                }
                else if (Array.isArray(videosToSave) && videosToSave.length > 0) {
                    const data = { classId, lectureDate: selectedDate, videos: videosToSave };
                    if (!currentDocId) { // 새 문서 생성
                        data.createdAt = serverTimestamp();
                        docRef = doc(collection(db, 'classLectures'));
                        console.log(`[Shared CVM] Creating new lecture document for date ${selectedDate} with ID ${docRef.id} (Internal)`);
                        await setDoc(docRef, data);
                        this.lectureDocId = docRef.id;
                    } else { // 기존 문서 업데이트
                        docRef = doc(db, 'classLectures', currentDocId);
                        console.log(`[Shared CVM] Updating existing lecture document ID: ${currentDocId} (Internal)`);
                        await updateDoc(docRef, { videos: videosToSave });
                    }
                    this.loadedLectureVideos = videosToSave; // 로컬 상태 업데이트
                } else {
                     console.log("[Shared CVM] No videos to save and no existing document to delete (Internal).");
                     this.loadedLectureVideos = [];
                     this.lectureDocId = null;
                }
                // ✨ 저장/삭제 성공 후 UI 갱신 (loadedLectureVideos 기준)
                this.renderLectureVideoList();

            } catch (error) {
                console.error("[Shared CVM] Error in saveLectureVideosInternal:", error);
                showToast(`수업 영상 업데이트 실패: ${error.message}`, true);
                this.loadLectureVideos();
                throw error;
            } finally {
                if (saveBtn) saveBtn.disabled = false;
                console.log("[Shared CVM] <<< saveLectureVideosInternal finished.");
            }
        },


    }; // manager 객체 끝

    manager.init();
    return manager;
}