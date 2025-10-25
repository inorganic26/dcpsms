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
        // 오타 수정 반영
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
        loadedLectureVideos: [], // Firestore에서 로드한 원본 데이터
        lectureDocId: null,      // 현재 로드된 수업 영상 문서 ID
        editingQnaVideoId: null,
        editingLectureVideoIndex: null, // 현재 loadedLectureVideos 기준 수정 중인 인덱스

        init() {
            // === 이벤트 리스너 ===
            document.getElementById(elements.qnaVideoDateInput)?.addEventListener('change', (e) => this.handleQnaDateChange(e.target.value));
            document.getElementById(elements.saveQnaVideoBtn)?.addEventListener('click', () => this.saveOrUpdateQnaVideo());
            if (elements.qnaClassSelect) { document.getElementById(elements.qnaClassSelect).addEventListener('change', (e) => this.handleQnaClassChangeForAdmin(e.target.value)); }

            document.getElementById(elements.lectureVideoDateInput)?.addEventListener('change', (e) => this.handleLectureDateChange(e.target.value));
            document.getElementById(elements.saveLectureVideoBtn)?.addEventListener('click', () => this.saveLectureVideos());
            // elements.addLectureVideoFieldBtn가 index.html에 없으므로 주석 처리
            // document.getElementById(elements.addLectureVideoFieldBtn)?.addEventListener('click', (e) => { e.preventDefault(); this.addLectureVideoField(); });
            if (elements.lectureClassSelect) { document.getElementById(elements.lectureClassSelect).addEventListener('change', (e) => this.handleLectureClassChangeForAdmin(e.target.value)); }

            // 이벤트 위임
             document.getElementById(elements.qnaVideosList)?.addEventListener('click', (e) => {
                const editBtn = e.target.closest('.edit-qna-video-btn');
                const deleteBtn = e.target.closest('.delete-qna-video-btn');
                if (editBtn && editBtn.dataset.id) { e.stopPropagation(); this.openQnaVideoEditMode(editBtn.dataset.id); }
                if (deleteBtn && deleteBtn.dataset.id) { e.stopPropagation(); this.deleteQnaVideo(deleteBtn.dataset.id, deleteBtn.dataset.title); }
             });

            // 수업 영상 목록 이벤트 리스너 (수정/삭제)
            const lectureListContainer = document.getElementById(elements.lectureVideoListContainer);
            if (lectureListContainer) {
                lectureListContainer.addEventListener('click', (e) => {
                    const editBtn = e.target.closest('.edit-class-video-btn');
                    const deleteBtn = e.target.closest('.delete-class-video-btn'); 

                    if (editBtn && editBtn.dataset.index !== undefined) {
                        e.stopPropagation();
                        // index는 string으로 넘어오므로 parseInt 필요
                        this.openLectureVideoEditMode(parseInt(editBtn.dataset.index, 10)); 
                    }
                    if (deleteBtn && deleteBtn.dataset.index !== undefined) {
                        e.stopPropagation();
                        const indexToDelete = parseInt(deleteBtn.dataset.index, 10);
                        const videoTitle = deleteBtn.dataset.title || '제목 없음';
                        if (confirm(`'${videoTitle}' 영상을 목록에서 제거하시겠습니까? (최종 삭제는 '영상 저장하기' 클릭 시 반영됩니다)`)) {
                            // ✨ 수정: UI에서 제거하는 것이 아니라, loadedLectureVideos에서 제거 후 렌더링
                            this.removeLectureVideoItem(indexToDelete);
                        }
                    }
                });
            } else {
                console.error("[Shared CVM Init] lectureVideoListContainer not found!");
            }
        },

        // === 뷰 초기화 함수 (이전과 동일) ===
        initQnaView() { 
            const dateInput = document.getElementById(elements.qnaVideoDateInput); 
            const classSelect = document.getElementById(elements.qnaClassSelect); 
            const teacherClassId = app?.state?.selectedClassId; 
            if (dateInput) { 
                const today = new Date().toISOString().slice(0, 10); 
                if (!dateInput.value || dateInput.value !== today) { 
                    dateInput.value = today; 
                } 
                this.currentQnaDate = dateInput.value; 
            } else { 
                this.currentQnaDate = null; 
            } 
            if (classSelect) { 
                this.populateClassSelect(elements.qnaClassSelect, 'selectedClassIdForQnaVideo'); 
                classSelect.disabled = !this.currentQnaDate; 
                this.selectedClassIdForQna = classSelect.value || null; 
            } else { 
                this.selectedClassIdForQna = teacherClassId || null; 
            } 
            this.resetQnaEditState(); 
            this.loadQnaVideos(); 
        },
        initLectureView() { 
            const dateInput = document.getElementById(elements.lectureVideoDateInput); 
            const classSelect = document.getElementById(elements.lectureClassSelect); 
            const teacherClassId = app?.state?.selectedClassId; 
            if (dateInput) { 
                const today = new Date().toISOString().slice(0, 10); 
                if (!dateInput.value || dateInput.value !== today) { 
                    dateInput.value = today; 
                } 
                this.currentLectureDate = dateInput.value; 
            } else { 
                this.currentLectureDate = null; 
            } 
            if (classSelect) { 
                this.populateClassSelect(elements.lectureClassSelect, 'selectedClassIdForClassVideo'); 
                classSelect.disabled = !this.currentLectureDate; 
                this.selectedClassIdForLecture = classSelect.value || null; 
            } else { 
                this.selectedClassIdForLecture = teacherClassId || null; 
            } 
            this.resetLectureEditState(); 
            this.loadLectureVideos(); 
        },

        // === 공통 헬퍼 함수 (이전과 동일) ===
        populateClassSelect(selectElementId, stateKey) { 
            const select = document.getElementById(selectElementId); 
            if (!select || !app?.state?.classes) return; 
            const currentSelection = app.state[stateKey] || select.value; 
            select.innerHTML = '<option value="">-- 반 선택 --</option>'; 
            if (app.state.classes.length === 0) { 
                select.innerHTML += '<option value="" disabled>등록된 반 없음</option>'; 
                select.disabled = true; 
                if (app.state[stateKey]) app.state[stateKey] = null; 
                return; 
            } 
            app.state.classes.forEach(cls => { 
                const opt = document.createElement('option');
                opt.value = cls.id;
                opt.textContent = cls.name;
                select.appendChild(opt); 
            }); 
            if (app.state.classes.some(c => c.id === currentSelection)) { 
                select.value = currentSelection; 
                if (app.state[stateKey] !== currentSelection) app.state[stateKey] = currentSelection; 
            } else if (app.state.classes.length > 0) { 
                const dateSelected = stateKey === 'selectedClassIdForQnaVideo' ? this.currentQnaDate : this.currentLectureDate; 
                if (dateSelected) { 
                    const firstClassId = app.state.classes[0].id; 
                    select.value = firstClassId; 
                    if (app.state[stateKey] !== firstClassId) app.state[stateKey] = firstClassId; 
                } else { 
                    select.value = ''; 
                    if (app.state[stateKey]) app.state[stateKey] = null; 
                } 
            } else { 
                select.value = ''; 
                if (app.state[stateKey]) app.state[stateKey] = null; 
            } 
            select.disabled = !(stateKey === 'selectedClassIdForQnaVideo' ? this.currentQnaDate : this.currentLectureDate); 
        },
        resetQnaEditState() { 
            this.editingQnaVideoId = null; 
            if (app?.state?.editingQnaVideoId) app.state.editingQnaVideoId = null; 
            const titleInput = document.getElementById(elements.qnaVideoTitleInput); 
            const urlInput = document.getElementById(elements.qnaVideoUrlInput); 
            const saveBtn = document.getElementById(elements.saveQnaVideoBtn); 
            if (titleInput) titleInput.value = ''; 
            if (urlInput) urlInput.value = ''; 
            if (saveBtn) saveBtn.textContent = '영상 저장하기'; 
        },
        resetLectureEditState() { 
            // ✨ Lecture Edit Reset 함수 구현
            this.editingLectureVideoIndex = null;
            if (app?.state?.editingClassVideoIndex) app.state.editingClassVideoIndex = null;
            const titleInput = document.getElementById(elements.lectureVideoTitleInput);
            const urlInput = document.getElementById(elements.lectureVideoUrlInput);
            const saveBtn = document.getElementById(elements.saveLectureVideoBtn);
            if (titleInput) titleInput.value = '';
            if (urlInput) urlInput.value = '';
            if (saveBtn) saveBtn.textContent = '영상 저장하기';
            // 수정 모드 종료 시, 목록의 하이라이트 제거
            document.querySelectorAll('.video-list-item').forEach(item => item.classList.remove('border-blue-500', 'border-2'));
        },

        // === QnA 비디오 로직 (이전과 동일) ===
        handleQnaDateChange(selectedDate) { 
            console.log(`[Shared CVM] QnA Date changed to: ${selectedDate}`); 
            this.currentQnaDate = selectedDate || null; 
            const classSelect = document.getElementById(elements.qnaClassSelect); 
            if (classSelect) { 
                classSelect.disabled = !selectedDate; 
                if (!selectedDate) { 
                    classSelect.value = ''; 
                    this.selectedClassIdForQna = null; 
                    if (app?.state) app.state.selectedClassIdForQnaVideo = null; 
                    const listEl = document.getElementById(elements.qnaVideosList); 
                    if (listEl) listEl.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; 
                    this.resetQnaEditState(); 
                    return; 
                } else if (classSelect.value === '' && app?.state?.classes?.length > 0) { 
                    const firstClassId = app.state.classes[0].id; 
                    classSelect.value = firstClassId; 
                    this.selectedClassIdForQna = firstClassId; 
                    if (app?.state) app.state.selectedClassIdForQnaVideo = firstClassId; 
                } 
            } 
            this.resetQnaEditState(); 
            this.loadQnaVideos(); 
        },
        handleQnaClassChangeForAdmin(classId) { 
            console.log(`[Shared CVM] QnA Class changed to: ${classId}`); 
            this.selectedClassIdForQna = classId || null; 
            if (app?.state) app.state.selectedClassIdForQnaVideo = classId || null; 
            this.resetQnaEditState(); 
            this.loadQnaVideos(); 
        },
        async loadQnaVideos() { 
            const classId = elements.qnaClassSelect ? this.selectedClassIdForQna : app?.state?.selectedClassId; 
            const selectedDate = this.currentQnaDate; 
            console.log(`[Shared CVM] loadQnaVideos called. isLoading: ${isLoading}, Date: ${selectedDate}`); 
            if (isLoading) { 
                console.log("[Shared CVM] loadQnaVideos skipped because isLoading is true."); 
                return; 
            } 
            isLoading = true; 
            const listEl = document.getElementById(elements.qnaVideosList); 
            if (!listEl) { 
                isLoading = false; 
                console.error("[Shared CVM] qnaVideosList element not found."); 
                return; 
            } 
            if (!selectedDate) { 
                listEl.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; 
                this.loadedQnaVideos = []; 
                isLoading = false; 
                return; 
            } 
            if (!classId) { 
                listEl.innerHTML = '<p class="text-sm text-slate-500">반을 선택해주세요.</p>'; 
                this.loadedQnaVideos = []; 
                isLoading = false; 
                return; 
            } 
            listEl.innerHTML = '<div class="loader-small mx-auto"></div>'; 
            try { 
                console.log(`[Shared CVM] Querying Firestore for QnA videos: classId=${classId}, videoDate=${selectedDate}`); 
                const q = query( 
                    collection(db, 'classVideos'), 
                    where('classId', '==', classId), 
                    where('videoDate', '==', selectedDate), 
                    orderBy('createdAt', 'desc') 
                ); 
                const snapshot = await getDocs(q); 
                this.loadedQnaVideos = snapshot.docs.map(docSnap => ({ 
                    id: docSnap.id, 
                    ...docSnap.data() 
                })); 
                console.log(`[Shared CVM] Firestore query returned ${this.loadedQnaVideos.length} QnA videos. Rendering list...`); 
                this.renderQnaVideoList(); 
            } catch (error) { 
                console.error("[Shared CVM] Error loading QnA videos:", error); 
                listEl.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>'; 
                this.loadedQnaVideos = []; 
            } finally { 
                console.log("[Shared CVM] loadQnaVideos finished."); 
                isLoading = false; 
            } 
        },
        renderQnaVideoList() { 
            const listEl = document.getElementById(elements.qnaVideosList); 
            if (!listEl) return; 
            listEl.innerHTML = ''; 
            if (this.loadedQnaVideos.length === 0) { 
                listEl.innerHTML = '<p class="text-sm text-slate-500">해당 날짜에 등록된 질문 영상이 없습니다.</p>'; 
                return; 
            } 
            this.loadedQnaVideos.forEach(video => { 
                const div = document.createElement('div'); 
                div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm'; 
                div.innerHTML = ` 
                    <div class="flex-grow mr-4 overflow-hidden"> 
                        <p class="font-medium text-slate-700 break-words">${video.title || '제목 없음'}</p> 
                        <a href="${video.youtubeUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.youtubeUrl || 'URL 없음'}</a> 
                    </div> 
                    <div class="flex gap-2 flex-shrink-0"> 
                        <button data-id="${video.id}" class="edit-qna-video-btn btn btn-secondary btn-sm">수정</button> 
                        <button data-id="${video.id}" data-title="${video.title || '제목 없음'}" class="delete-qna-video-btn btn btn-danger btn-sm">삭제</button> 
                    </div>`; 
                listEl.appendChild(div); 
            }); 
        },
        async openQnaVideoEditMode(videoId) { 
            console.log(`[Shared CVM] ---- Start openQnaVideoEditMode for ID: ${videoId} ----`); 
            const videoData = this.loadedQnaVideos.find(v => v.id === videoId); 
            if (!videoData) { 
                showToast("수정할 영상 정보 없음"); 
                console.error(`[Shared CVM] QnA video data not found for ID: ${videoId} in loadedQnaVideos:`, this.loadedQnaVideos); 
                console.log(`[Shared CVM] ---- End openQnaVideoEditMode (failed) for ID: ${videoId} ----`); 
                return; 
            } 
            console.log("[Shared CVM] Found QnA video data:", videoData); 
            const titleInput = document.getElementById(elements.qnaVideoTitleInput); 
            const urlInput = document.getElementById(elements.qnaVideoUrlInput); 
            const saveBtn = document.getElementById(elements.saveQnaVideoBtn); 
            if (titleInput) { 
                console.log("[Shared CVM] Setting title input value:", videoData.title); 
                titleInput.value = videoData.title || ''; 
            } 
            if (urlInput) { 
                console.log("[Shared CVM] Setting URL input value:", videoData.youtubeUrl); 
                urlInput.value = videoData.youtubeUrl || ''; 
            } 
            console.log("[Shared CVM] Setting editingQnaVideoId:", videoId); 
            this.editingQnaVideoId = videoId; 
            if (app?.state) app.state.editingQnaVideoId = videoId; 
            if (saveBtn) { 
                console.log("[Shared CVM] Updating save button text."); 
                saveBtn.textContent = '수정하기'; 
            } 
            showToast("영상 정보 로드 완료. 수정 후 [수정하기] 클릭.", false); 
            console.log("[Shared CVM] Scrolling into view (if element exists)."); 
            titleInput?.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
            console.log(`[Shared CVM] ---- End openQnaVideoEditMode (success) for ID: ${videoId} ----`); 
        },
        async saveOrUpdateQnaVideo() { 
            const titleInput = document.getElementById(elements.qnaVideoTitleInput); 
            const urlInput = document.getElementById(elements.qnaVideoUrlInput); 
            const saveBtn = document.getElementById(elements.saveQnaVideoBtn); 
            const classId = elements.qnaClassSelect ? this.selectedClassIdForQna : app?.state?.selectedClassId; 
            const videoDate = this.currentQnaDate; 
            const title = titleInput?.value.trim(); 
            const url = urlInput?.value.trim(); 
            const editingId = this.editingQnaVideoId; 
            if (!classId || !videoDate || !title || !url) { 
                showToast("날짜, 반, 제목, URL 필수."); 
                return; 
            } 
            if (!isValidUrl(url)) { 
                showToast("유효하지 않은 URL 형식입니다.", true); 
                urlInput?.classList.add('border-red-500'); 
                return; 
            } else { 
                urlInput?.classList.remove('border-red-500'); 
            } 
            const videoData = { classId, videoDate, title, youtubeUrl: url }; 
            if (saveBtn) saveBtn.disabled = true; 
            try { 
                if (editingId) { 
                    console.log(`[Shared CVM] Updating QnA video ID: ${editingId}`); 
                    await updateDoc(doc(db, 'classVideos', editingId), videoData); 
                    showToast("질문 영상 수정 성공!", false); 
                } else { 
                    console.log("[Shared CVM] Adding new QnA video"); 
                    videoData.createdAt = serverTimestamp(); 
                    await addDoc(collection(db, 'classVideos'), videoData); 
                    showToast("질문 영상 저장 성공!", false); 
                } 
                this.resetQnaEditState(); 
                this.loadQnaVideos(); 
            } catch (error) { 
                console.error(`[Shared CVM] Error saving/updating QnA video: ${error}`); 
                showToast(`영상 ${editingId ? '수정' : '저장'} 실패: ${error.message}`); 
            } finally { 
                if (saveBtn) saveBtn.disabled = false; 
            } 
        },
        async deleteQnaVideo(videoId, videoTitle) { 
            if (!videoId) return; 
            console.log(`[Shared CVM] Attempting to delete QnA video ID: ${videoId}`); 
            if (confirm(`'${videoTitle || '제목 없음'}' 영상을 정말 삭제하시겠습니까?`)) { 
                try { 
                    await deleteDoc(doc(db, 'classVideos', videoId)); 
                    showToast("영상이 삭제되었습니다.", false); 
                    if (this.editingQnaVideoId === videoId) this.resetQnaEditState(); 
                    this.loadQnaVideos(); 
                } catch (err) { 
                    console.error(`[Shared CVM] Error deleting QnA video: ${err}`); 
                    showToast("영상 삭제 실패"); 
                } 
            } 
        },

        // === 수업 영상 로직 ===
        handleLectureDateChange(selectedDate) { 
            console.log(`[Shared CVM] Lecture Date changed to: ${selectedDate}`); 
            this.currentLectureDate = selectedDate || null; 
            const classSelect = document.getElementById(elements.lectureClassSelect); 
            if (classSelect) { 
                classSelect.disabled = !selectedDate; 
                if (!selectedDate) { 
                    classSelect.value = ''; 
                    this.selectedClassIdForLecture = null; 
                    if (app?.state) app.state.selectedClassIdForClassVideo = null; 
                    const listContainer = document.getElementById(elements.lectureVideoListContainer); 
                    if (listContainer) listContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 먼저 선택해주세요.</p>'; 
                    this.resetLectureEditState(); 
                    return; 
                } else if (classSelect.value === '' && app?.state?.classes?.length > 0) { 
                    const firstClassId = app.state.classes[0].id; 
                    classSelect.value = firstClassId; 
                    this.selectedClassIdForLecture = firstClassId; 
                    if (app?.state) app.state.selectedClassIdForClassVideo = firstClassId; 
                } 
            } 
            this.resetLectureEditState(); 
            this.loadLectureVideos(); 
        },
        handleLectureClassChangeForAdmin(classId) { 
            console.log(`[Shared CVM] Lecture Class changed to: ${classId}`); 
            this.selectedClassIdForLecture = classId || null; 
            if (app?.state) app.state.selectedClassIdForClassVideo = classId || null; 
            this.resetLectureEditState(); 
            this.loadLectureVideos(); 
        },

        async loadLectureVideos() {
            // ... (로딩 로직은 동일)
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
                const q = query( collection(db, 'classLectures'), where('classId', '==', classId), where('lectureDate', '==', selectedDate) );
                const snapshot = await getDocs(q);
                if (!snapshot.empty) {
                    const docSnap = snapshot.docs[0];
                    this.lectureDocId = docSnap.id;
                    const docData = docSnap.data();
                    this.loadedLectureVideos = Array.isArray(docData.videos) ? docData.videos : [];
                } else {
                    this.loadedLectureVideos = [];
                    this.lectureDocId = null;
                }
                this.renderLectureVideoList();
                // 로딩 완료 후 수정모드 종료
                this.resetLectureEditState(); 

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
             const listContainer = document.getElementById(elements.lectureVideoListContainer);
             if (!listContainer) { console.error("[Shared CVM] Cannot render: lectureVideoListContainer not found."); return; }
             listContainer.innerHTML = '';
             const videos = this.loadedLectureVideos;
            
            if (!Array.isArray(videos) || videos.length === 0) {
                 const noVideoMessage = "등록된 영상이 없습니다.";
                 listContainer.innerHTML = `<p class="text-sm text-slate-500">${noVideoMessage}</p>`;
                 return;
            }
            videos.forEach((video, index) => {
                const div = document.createElement('div');
                div.className = `p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm video-list-item ${this.editingLectureVideoIndex === index ? 'border-blue-500 border-2' : ''}`; // ✨ 수정 모드 시 하이라이트 추가
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
            });
        },
        
        // ✨ (수정) openLectureVideoEditMode 함수 본문 복구/구현
        openLectureVideoEditMode(index) {
             console.log(`[Shared CVM] ---- Start openLectureVideoEditMode for Index: ${index} ----`);
             this.resetLectureEditState(); // 기존 수정 모드 상태 초기화
             
             const videoData = this.loadedLectureVideos[index];
             if (!videoData) {
                 showToast("수정할 영상 정보 없음 (잘못된 인덱스)");
                 console.error(`[Shared CVM] Lecture video data not found for index: ${index}`);
                 return;
             }

             const titleInput = document.getElementById(elements.lectureVideoTitleInput);
             const urlInput = document.getElementById(elements.lectureVideoUrlInput);
             const saveBtn = document.getElementById(elements.saveLectureVideoBtn);
             
             // 1. 입력 필드에 데이터 채우기
             if (titleInput) titleInput.value = videoData.title || '';
             if (urlInput) urlInput.value = videoData.url || '';

             // 2. 상태 업데이트
             this.editingLectureVideoIndex = index;
             if (app?.state) app.state.editingClassVideoIndex = index;

             // 3. UI 업데이트
             if (saveBtn) saveBtn.textContent = '수정 저장';
             document.querySelector(`.video-list-item[data-index="${index}"]`)?.classList.add('border-blue-500', 'border-2');
             
             showToast(`영상 ${index + 1} 정보를 로드했습니다. 수정 후 [수정 저장] 클릭.`, false);
             titleInput?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             console.log(`[Shared CVM] ---- End openLectureVideoEditMode (success) for Index: ${index} ----`);
        },
        
        // ✨ (수정) 목록 아이템 삭제 함수 (UI가 아닌 로컬 상태에서 삭제 후 재렌더링)
        removeLectureVideoItem(index) {
            if (index < 0 || index >= this.loadedLectureVideos.length) return;
            
            const removed = this.loadedLectureVideos.splice(index, 1);
            if (removed.length > 0) {
                showToast("영상 항목이 목록에서 제거되었습니다. '영상 저장하기' 버튼을 눌러 최종 저장하세요.", false);
                if (this.editingLectureVideoIndex === index) {
                    this.resetLectureEditState(); // 삭제된 항목을 수정 중이었다면 모드 종료
                }
                this.renderLectureVideoList(); // 목록 재렌더링
            }
        },

        async saveLectureVideos() {
            // ✨ (수정) 저장 로직을 간소화: loadedLectureVideos 상태를 기준으로 저장
            const classId = elements.lectureClassSelect ? this.selectedClassIdForLecture : app?.state?.selectedClassId;
            const selectedDate = this.currentLectureDate;
            const saveBtn = document.getElementById(elements.saveLectureVideoBtn);

            if (!selectedDate || !classId) { showToast("날짜와 반 필수.", true); return; }

            const currentTitleInput = document.getElementById(elements.lectureVideoTitleInput);
            const currentUrlInput = document.getElementById(elements.lectureVideoUrlInput);
            const currentTitle = currentTitleInput?.value.trim();
            const currentUrl = currentUrlInput?.value.trim();
            const editingIndex = this.editingLectureVideoIndex;
            let videosToSave = [...this.loadedLectureVideos]; // 로컬 상태 복사본으로 시작

            if (saveBtn) saveBtn.disabled = true;

            try {
                if (editingIndex !== null) { // 1. 수정 모드일 때 (수정 저장)
                    if (!currentTitle || !currentUrl) { throw new Error("수정 중인 영상 제목/URL 필수."); }
                    if (!isValidUrl(currentUrl)) { currentUrlInput?.classList.add('border-red-500'); throw new Error("수정 중인 영상 URL 형식 오류."); }
                    
                    // 로컬 상태의 해당 인덱스 데이터를 현재 입력 값으로 대체
                    if (editingIndex >= 0 && editingIndex < videosToSave.length) {
                        videosToSave[editingIndex] = { title: currentTitle, url: currentUrl };
                    } else {
                         throw new Error("잘못된 수정 인덱스입니다.");
                    }
                } else if (currentTitle || currentUrl) { // 2. 추가 모드일 때 (새 영상 추가)
                    if (!currentTitle || !currentUrl) { throw new Error("새 영상 제목/URL 필수."); }
                    if (!isValidUrl(currentUrl)) { currentUrlInput?.classList.add('border-red-500'); throw new Error("새 영상 URL 형식 오류."); }
                    
                    videosToSave.push({ title: currentTitle, url: currentUrl });
                }
                // 3. 목록만 있고 입력 필드가 비어 있으면, loadedLectureVideos 그대로 저장

                if (videosToSave.length === 0) {
                    if (!this.lectureDocId) {
                        showToast("저장할 영상 정보가 없습니다.");
                        return; // 저장할 문서도 없고, 지울 문서도 없음
                    }
                    // 기존 문서가 있고 videosToSave가 0개면, 문서를 삭제
                    // saveLectureVideosInternal에서 처리됨
                }
                
                // 내부 저장 함수 호출 (삭제 로직 포함)
                await this.saveLectureVideosInternal(videosToSave); 
                showToast(`수업 영상 ${editingIndex !== null ? '수정' : '저장'} 완료.`, false);
                this.resetLectureEditState(); 
                
            } catch (error) { 
                console.error("[Shared CVM] Error during saveLectureVideos execution:", error); 
                showToast(`영상 저장 실패: ${error.message}`, true);
                if (currentUrlInput) currentUrlInput.classList.remove('border-red-500'); // 에러 발생 시 URL 필드 초기화
            }
            finally { 
                if (saveBtn) saveBtn.disabled = false; 
            }
        },

        async saveLectureVideosInternal(videosToSave) {
            // ... (이전과 동일: Firestore 저장/삭제 로직)
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
                // 저장/삭제 성공 후 UI 갱신 (loadedLectureVideos 기준)
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