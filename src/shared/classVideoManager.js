// src/shared/classVideoManager.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

export function createClassVideoManager(config) {
    const { app, elements, options = {} } = config;

    const manager = {
        app,
        elements,
        
        initQnaView() {
            this.populateClassSelect(this.elements.qnaClassSelect);
            const dateInput = document.getElementById(this.elements.qnaVideoDateInput);
            const classSelect = document.getElementById(this.elements.qnaClassSelect);
            const saveBtn = document.getElementById(this.elements.saveQnaVideoBtn);

            if (dateInput) dateInput.onchange = () => this.loadQnaVideos();
            if (classSelect) classSelect.onchange = () => this.loadQnaVideos();
            if (saveBtn) saveBtn.onclick = () => this.saveQnaVideo();
        },

        initLectureView() {
            // 선생님 앱은 이미 상단에서 반을 선택했으므로 중복 로딩 방지
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
            
            // 영상 추가 버튼 연결
            if (addBtn) {
                addBtn.onclick = (e) => {
                    e.preventDefault();
                    this.addVideoField();
                };
            }
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
            } catch (e) {
                select.innerHTML = '<option value="">로드 실패</option>';
            }
        },

        // --- QnA Logic ---
        async loadQnaVideos() {
            const dateInput = document.getElementById(this.elements.qnaVideoDateInput);
            const classSelect = document.getElementById(this.elements.qnaClassSelect);
            const listContainer = document.getElementById(this.elements.qnaVideosList);

            if (!dateInput?.value || !classSelect?.value || !listContainer) return;

            listContainer.innerHTML = '<p class="text-sm text-slate-400">로딩 중...</p>';
            
            try {
                const q = query(
                    collection(db, 'classVideos'),
                    where('videoDate', '==', dateInput.value),
                    where('classId', '==', classSelect.value)
                );
                const snapshot = await getDocs(q);
                
                listContainer.innerHTML = '';
                if (snapshot.empty) {
                    listContainer.innerHTML = '<p class="text-sm text-slate-400">등록된 영상이 없습니다.</p>';
                    return;
                }

                snapshot.forEach(docSnap => {
                    const video = docSnap.data();
                    const div = document.createElement('div');
                    div.className = "flex justify-between items-center p-3 bg-white border rounded shadow-sm mb-2";
                    div.innerHTML = `
                        <div>
                            <p class="font-bold text-slate-700">${video.title}</p>
                            <a href="${video.youtubeUrl}" target="_blank" class="text-xs text-blue-500 hover:underline truncate block max-w-[200px]">${video.youtubeUrl}</a>
                        </div>
                        <button class="text-red-500 text-sm font-bold delete-video-btn">삭제</button>
                    `;
                    div.querySelector('.delete-video-btn').onclick = () => this.deleteQnaVideo(docSnap.id);
                    listContainer.appendChild(div);
                });
            } catch (e) {
                listContainer.innerHTML = '<p class="text-red-500 text-sm">로딩 실패</p>';
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
                await addDoc(collection(db, 'classVideos'), {
                    videoDate: date,
                    classId,
                    title,
                    youtubeUrl: url,
                    createdAt: serverTimestamp()
                });
                showToast("영상이 저장되었습니다.", false);
                document.getElementById(this.elements.qnaVideoTitleInput).value = '';
                document.getElementById(this.elements.qnaVideoUrlInput).value = '';
                this.loadQnaVideos();
            } catch (e) {
                showToast("저장 실패", true);
            }
        },

        async deleteQnaVideo(id) {
            if (!confirm("삭제하시겠습니까?")) return;
            try {
                await deleteDoc(doc(db, 'classVideos', id));
                showToast("삭제되었습니다.", false);
                this.loadQnaVideos();
            } catch (e) { showToast("삭제 실패", true); }
        },

        // --- Lecture Video Logic ---
        addVideoField(title = '', url = '') {
            const container = document.getElementById(this.elements.lectureVideoListContainer);
            if (!container) return;

            const div = document.createElement('div');
            div.className = "flex gap-2 items-center lecture-video-item mb-2";
            div.innerHTML = `
                <input type="text" class="form-input w-1/3 video-title" placeholder="제목" value="${title}">
                <input type="text" class="form-input w-2/3 video-url" placeholder="URL" value="${url}">
                <button type="button" class="text-red-500 font-bold px-2 hover:bg-red-50 rounded remove-field-btn">X</button>
            `;
            
            div.querySelector('.remove-field-btn').onclick = () => div.remove();
            container.appendChild(div);
        },

        async loadLectureVideos() {
            const dateInput = document.getElementById(this.elements.lectureVideoDateInput);
            const classSelect = document.getElementById(this.elements.lectureClassSelect);
            const container = document.getElementById(this.elements.lectureVideoListContainer);

            if (!dateInput?.value || !classSelect?.value || !container) return;

            container.innerHTML = '<p class="text-sm text-slate-400">로딩 중...</p>';

            try {
                const q = query(
                    collection(db, 'classLectures'),
                    where('lectureDate', '==', dateInput.value),
                    where('classId', '==', classSelect.value)
                );
                const snapshot = await getDocs(q);

                container.innerHTML = '';
                
                if (snapshot.empty) {
                    this.addVideoField();
                    this.app.state.editingLectureId = null; 
                } else {
                    const data = snapshot.docs[0].data();
                    this.app.state.editingLectureId = snapshot.docs[0].id;
                    if (data.videos && data.videos.length > 0) {
                        data.videos.forEach(v => this.addVideoField(v.title, v.url));
                    } else {
                        this.addVideoField();
                    }
                }
            } catch (e) {
                container.innerHTML = '<p class="text-red-500">데이터를 불러올 수 없습니다.</p>';
            }
        },

        async saveLectureVideo() {
            const dateInput = document.getElementById(this.elements.lectureVideoDateInput);
            const classSelect = document.getElementById(this.elements.lectureClassSelect);
            const container = document.getElementById(this.elements.lectureVideoListContainer);

            const date = dateInput.value;
            const classId = classSelect.value;

            if (!date || !classId) { showToast("날짜와 반을 선택해주세요.", true); return; }

            const videoItems = container.querySelectorAll('.lecture-video-item');
            const videos = [];
            videoItems.forEach(item => {
                const title = item.querySelector('.video-title').value.trim();
                const url = item.querySelector('.video-url').value.trim();
                if (title && url) videos.push({ title, url });
            });

            if (videos.length === 0) { showToast("최소 하나의 영상을 입력해주세요.", true); return; }

            try {
                const data = { lectureDate: date, classId, videos, updatedAt: serverTimestamp() };
                if (this.app.state.editingLectureId) {
                    await updateDoc(doc(db, 'classLectures', this.app.state.editingLectureId), data);
                    showToast("수정되었습니다.", false);
                } else {
                    await addDoc(collection(db, 'classLectures'), data);
                    showToast("저장되었습니다.", false);
                    this.loadLectureVideos();
                }
            } catch (e) { showToast("저장 실패", true); }
        }
    };
    return manager;
}