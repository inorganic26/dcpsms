// src/shared/classVideoManager.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

export function createClassVideoManager(config) {
    const { app, elements, options = {} } = config;

    // 유튜브 URL 변환 헬퍼 함수
    const convertYoutubeUrl = (url) => {
        if (!url) return "";
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : url;
    };

    const manager = {
        app,
        elements,
        
        // ============================================================
        //  [파트 A] QnA 영상 (질문 영상)
        // ============================================================
        initQnaView() {
            this.populateClassSelect(this.elements.qnaClassSelect);
            
            const dateInput = document.getElementById(this.elements.qnaVideoDateInput);
            const classSelect = document.getElementById(this.elements.qnaClassSelect);
            const saveBtn = document.getElementById(this.elements.saveQnaVideoBtn);

            if (dateInput) dateInput.onchange = () => this.loadQnaVideos();
            if (classSelect) classSelect.onchange = () => this.loadQnaVideos();
            if (saveBtn) saveBtn.onclick = () => this.saveQnaVideo();

            this.loadQnaVideos();
        },

        async loadQnaVideos() {
            const dateInput = document.getElementById(this.elements.qnaVideoDateInput);
            const classSelect = document.getElementById(this.elements.qnaClassSelect);
            const listContainer = document.getElementById(this.elements.qnaVideosList);

            if (!listContainer) return;

            listContainer.innerHTML = ''; // 초기화

            if (!dateInput?.value || !classSelect?.value) {
                listContainer.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">날짜와 반을 선택해주세요.</p>';
                return;
            }

            listContainer.innerHTML = '<div class="loader-small mx-auto"></div>';
            
            try {
                // [핵심 변경] 'asc' (오름차순) -> 먼저 등록한 것이 위로 올라감
                const q = query(
                    collection(db, 'classVideos'),
                    where('videoDate', '==', dateInput.value),
                    where('classId', '==', classSelect.value),
                    orderBy('createdAt', 'asc') 
                );
                const snapshot = await getDocs(q);
                
                listContainer.innerHTML = ''; 

                if (snapshot.empty) {
                    listContainer.innerHTML = '<p class="text-sm text-slate-400 text-center py-4">해당 날짜에 등록된 질문 영상이 없습니다.</p>';
                    return;
                }

                snapshot.forEach(docSnap => {
                    const video = docSnap.data();
                    const div = document.createElement('div');
                    div.className = "bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-3 relative group";
                    div.innerHTML = `
                        <button class="delete-qna-btn absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition" 
                                title="삭제">
                            <span class="material-icons-round text-lg">close</span>
                        </button>
                        <div class="mb-2 pr-8">
                            <h4 class="font-bold text-slate-700 text-sm">${video.title}</h4>
                        </div>
                        <div class="aspect-video bg-black rounded overflow-hidden">
                            <iframe class="w-full h-full" src="${convertYoutubeUrl(video.youtubeUrl)}" frameborder="0" allowfullscreen></iframe>
                        </div>
                    `;
                    div.querySelector('.delete-qna-btn').onclick = () => this.deleteQnaVideo(docSnap.id);
                    listContainer.appendChild(div);
                });
            } catch (e) {
                console.error(e);
                listContainer.innerHTML = '<p class="text-red-500 text-sm text-center">데이터 로드 실패</p>';
            }
        },

        async saveQnaVideo() {
            const date = document.getElementById(this.elements.qnaVideoDateInput)?.value;
            const classId = document.getElementById(this.elements.qnaClassSelect)?.value;
            const title = document.getElementById(this.elements.qnaVideoTitleInput)?.value;
            const url = document.getElementById(this.elements.qnaVideoUrlInput)?.value;

            if (!date || !classId || !title || !url) {
                showToast("모든 항목을 입력해주세요.", true);
                return;
            }

            try {
                // [수정 완료] addDoc 사용으로 저장 오류 해결
                await addDoc(collection(db, 'classVideos'), {
                     videoDate: date,
                     classId,
                     title,
                     youtubeUrl: url,
                     createdAt: serverTimestamp()
                });

                showToast("저장되었습니다.");
                document.getElementById(this.elements.qnaVideoTitleInput).value = '';
                document.getElementById(this.elements.qnaVideoUrlInput).value = '';
                this.loadQnaVideos();
            } catch (e) { 
                console.error(e);
                showToast("저장 실패", true); 
            }
        },

        async deleteQnaVideo(id) {
            if (!confirm("정말 삭제하시겠습니까?")) return;
            try {
                await deleteDoc(doc(db, 'classVideos', id));
                showToast("삭제되었습니다.");
                this.loadQnaVideos();
            } catch (e) { showToast("삭제 실패", true); }
        },


        // ============================================================
        //  [파트 B] 수업 영상 (Lectures)
        // ============================================================
        initLectureView() {
            if (!options.disableClassSelectPopulation) {
                this.populateClassSelect(this.elements.lectureClassSelect, 'live-lecture');
            }
            
            const dateInput = document.getElementById(this.elements.lectureVideoDateInput);
            const classSelect = document.getElementById(this.elements.lectureClassSelect);
            const saveBtn = document.getElementById(this.elements.saveLectureVideoBtn);
            const addBtn = document.getElementById(this.elements.addLectureVideoFieldBtn);

            if (dateInput) dateInput.onchange = () => this.loadLectureVideos();
            if (classSelect) classSelect.onchange = () => this.loadLectureVideos();
            
            if (saveBtn) saveBtn.onclick = () => this.saveLectureVideo();
            
            if (addBtn) {
                const newAddBtn = addBtn.cloneNode(true);
                addBtn.parentNode.replaceChild(newAddBtn, addBtn);
                newAddBtn.onclick = (e) => { e.preventDefault(); this.addVideoField(); };
            }

            this.loadLectureVideos();
        },

        addVideoField(title = '', url = '') {
            let inputContainer = document.getElementById('lecture-video-inputs-container');
            if (!inputContainer) inputContainer = document.getElementById('lecture-video-inputs-container-teacher');

            if (!inputContainer) return;

            const div = document.createElement('div');
            div.className = "flex gap-2 mb-2 video-input-group items-center";
            div.innerHTML = `
                <input type="text" class="form-input flex-1 p-3 border rounded-xl text-sm video-title-input" placeholder="영상 제목" value="${title}">
                <input type="text" class="form-input flex-1 p-3 border rounded-xl text-sm video-url-input" placeholder="유튜브 URL" value="${url}">
                <button type="button" class="text-red-500 hover:bg-red-50 p-2 rounded-lg remove-field-btn transition" title="입력 삭제">
                    <span class="material-icons-round">remove_circle</span>
                </button>
            `;
            
            div.querySelector('.remove-field-btn').onclick = () => div.remove();
            inputContainer.appendChild(div);
        },

        async loadLectureVideos() {
            const dateInput = document.getElementById(this.elements.lectureVideoDateInput);
            const classSelect = document.getElementById(this.elements.lectureClassSelect);
            const listContainer = document.getElementById(this.elements.lectureVideoListContainer);
            
            let inputContainer = document.getElementById('lecture-video-inputs-container');
            if (!inputContainer) inputContainer = document.getElementById('lecture-video-inputs-container-teacher');

            if (!listContainer) return;
            
            listContainer.innerHTML = ''; 

            if (!dateInput?.value || !classSelect?.value) return; 

            try {
                const q = query(
                    collection(db, 'classLectures'),
                    where('lectureDate', '==', dateInput.value),
                    where('classId', '==', classSelect.value)
                );
                const snapshot = await getDocs(q);
                
                // 입력창 초기화
                document.getElementById(this.elements.lectureVideoTitleInput).value = '';
                document.getElementById(this.elements.lectureVideoUrlInput).value = '';
                
                if (inputContainer) {
                    const dynamicFields = inputContainer.querySelectorAll('.video-input-group');
                    dynamicFields.forEach(field => field.remove());
                }

                if (snapshot.empty) {
                    this.app.state.editingLectureId = null; 
                    listContainer.innerHTML = '<p class="text-sm text-slate-400 py-4 text-center">등록된 영상이 없습니다.</p>';
                } else {
                    const docData = snapshot.docs[0];
                    const data = docData.data();
                    this.app.state.editingLectureId = docData.id;

                    // 저장된 영상 불러와서 동적 필드로 추가 (삭제 가능하도록)
                    if (data.videos && data.videos.length > 0) {
                        data.videos.forEach(v => {
                            this.addVideoField(v.title, v.url);
                        });
                    }

                    // 하단 목록 렌더링 (순서: 배열 순서 = 등록 순서)
                    const videosHtml = (data.videos || []).map(v => `
                        <div class="mb-4 last:mb-0">
                            <p class="text-sm font-bold text-slate-700 mb-1">📺 ${v.title}</p>
                            <div class="aspect-video bg-black rounded overflow-hidden">
                                <iframe class="w-full h-full" src="${convertYoutubeUrl(v.url)}" frameborder="0" allowfullscreen></iframe>
                            </div>
                        </div>
                    `).join('');

                    const div = document.createElement('div');
                    div.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm";
                    div.innerHTML = `
                        <div class="flex justify-between items-center mb-3 border-b pb-2">
                            <div class="flex items-center gap-2">
                                <span class="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                    📅 ${data.lectureDate}
                                </span>
                                <span class="text-xs text-slate-400">총 ${data.videos?.length || 0}개</span>
                            </div>
                            <button class="delete-lecture-btn flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition" 
                                    data-id="${docData.id}">
                                <span class="material-icons-round text-sm">delete</span> 전체 삭제
                            </button>
                        </div>
                        <div class="space-y-4">
                            ${videosHtml}
                        </div>
                    `;
                    
                    div.querySelector('.delete-lecture-btn').onclick = () => this.deleteLectureVideo(docData.id);
                    listContainer.appendChild(div);
                }
            } catch (e) {
                console.error(e);
                listContainer.innerHTML = '<p class="text-red-500 text-sm">데이터 로드 실패</p>';
            }
        },

        async saveLectureVideo() {
            const dateInput = document.getElementById(this.elements.lectureVideoDateInput);
            const classSelect = document.getElementById(this.elements.lectureClassSelect);
            const date = dateInput?.value;
            const classId = classSelect?.value;

            if (!date || !classId) { showToast("날짜와 반을 선택해주세요.", true); return; }

            const mainTitle = document.getElementById(this.elements.lectureVideoTitleInput).value;
            const mainUrl = document.getElementById(this.elements.lectureVideoUrlInput).value;

            const videos = [];
            if (mainTitle && mainUrl) videos.push({ title: mainTitle, url: mainUrl });

            let inputContainer = document.getElementById('lecture-video-inputs-container');
            if (!inputContainer) inputContainer = document.getElementById('lecture-video-inputs-container-teacher');
            
            if (inputContainer) {
                inputContainer.querySelectorAll('.video-input-group').forEach(group => {
                    const t = group.querySelector('.video-title-input').value;
                    const u = group.querySelector('.video-url-input').value;
                    if (t && u) videos.push({ title: t, url: u });
                });
            }

            if (videos.length === 0) { showToast("영상이 없습니다. 입력해주세요.", true); return; }

            try {
                const data = { lectureDate: date, classId, videos, updatedAt: serverTimestamp() };
                
                if (this.app.state.editingLectureId) {
                    await updateDoc(doc(db, 'classLectures', this.app.state.editingLectureId), data);
                    showToast("수정되었습니다.");
                } else {
                    await addDoc(collection(db, 'classLectures'), data);
                    showToast("저장되었습니다.");
                }
                this.loadLectureVideos(); 
            } catch (e) { 
                console.error(e);
                showToast("저장 실패", true); 
            }
        },

        async deleteLectureVideo(id) {
            if (!confirm("해당 날짜의 모든 영상을 삭제하시겠습니까?")) return;
            try {
                await deleteDoc(doc(db, 'classLectures', id));
                showToast("삭제되었습니다.");
                this.loadLectureVideos();
            } catch (e) { showToast("삭제 실패", true); }
        },

        async populateClassSelect(selectId, typeFilter = null) {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = '<option value="">로딩 중...</option>';
            try {
                const q = query(collection(db, "classes"), orderBy("name"));
                const snapshot = await getDocs(q);
                select.innerHTML = '<option value="">-- 반 선택 --</option>';
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (!typeFilter || data.classType === typeFilter) {
                        const option = document.createElement('option');
                        option.value = doc.id;
                        option.textContent = data.name;
                        select.appendChild(option);
                    }
                });
            } catch (e) { select.innerHTML = '<option value="">로드 실패</option>'; }
        }
    };
    return manager;
}