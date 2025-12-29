// src/shared/classVideoManager.js

import { collection, getDocs, doc, setDoc, deleteDoc, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase.js";
import { showToast } from "./utils.js";

export const createClassVideoManager = (config) => {
    const { app, elements, options } = config;

    // --- 1. 공통 유틸리티: 반(Class) 목록 불러오기 (관리자용) ---
    const populateClassSelect = async (selectElementId) => {
        if (options?.disableClassSelectPopulation) return; 

        const select = document.getElementById(selectElementId);
        if (!select) return;

        select.innerHTML = '<option value="">반을 선택하세요</option>';
        try {
            const q = query(collection(db, "classes"), orderBy("name", "asc"));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.text = doc.data().name;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error("반 목록 로드 실패:", e);
        }
    };

    // --- 2. 유튜브 URL 변환기 ---
    const convertYoutubeUrl = (url) => {
        if (!url) return "";
        const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : url;
    };

    // --- 3. 공통 삭제 함수 ---
    const handleDeleteVideo = async (collectionName, docId, confirmMsg) => {
        if (!confirm(confirmMsg)) return;
        try {
            await deleteDoc(doc(db, collectionName, docId));
            showToast("삭제되었습니다.");
            // 삭제 후 목록 갱신
            if (collectionName === 'classVideos') loadQnaVideos();
            else loadLectureVideos();
        } catch (e) {
            console.error("삭제 실패:", e);
            alert("삭제 중 오류가 발생했습니다.");
        }
    };


    // ============================================================
    //  [파트 A] QnA 영상 관리 (StudentApp: classVideos / videoDate)
    // ============================================================
    
    const initQnaView = async () => {
        await populateClassSelect(elements.qnaClassSelect);
        
        const classSelect = document.getElementById(elements.qnaClassSelect);
        const saveBtn = document.getElementById(elements.saveQnaVideoBtn);

        if (classSelect) {
            classSelect.addEventListener('change', () => loadQnaVideos());
        }

        if (saveBtn) {
            const newBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);
            newBtn.addEventListener('click', saveQnaVideo);
        }
    };

    const loadQnaVideos = async () => {
        const container = document.getElementById(elements.qnaVideosList);
        const classSelect = document.getElementById(elements.qnaClassSelect);
        
        let classId = classSelect?.value;
        if (options?.disableClassSelectPopulation && app?.state?.selectedClassId) {
            classId = app.state.selectedClassId;
        }

        if (!container) return;
        if (!classId) {
            container.innerHTML = '<p class="text-slate-400 text-center py-4">반을 선택해주세요.</p>';
            return;
        }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            const q = query(
                collection(db, "classVideos"), 
                where("classId", "==", classId),
                orderBy("videoDate", "desc")
            );
            
            const snapshot = await getDocs(q);
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-slate-400 text-center py-4">등록된 QnA 영상이 없습니다.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const div = document.createElement('div');
                div.className = "bg-white p-4 rounded-lg border border-slate-200 shadow-sm mb-3 relative group";
                
                // [수정] 삭제 버튼 추가 (우측 상단 x 버튼)
                div.innerHTML = `
                    <button class="delete-qna-btn absolute top-2 right-2 text-slate-300 hover:text-red-500 p-1 rounded-full hover:bg-red-50 transition" 
                            data-id="${doc.id}" title="삭제">
                        <span class="material-icons-round text-lg">close</span>
                    </button>
                    
                    <div class="flex justify-between items-start mb-2 pr-8">
                        <div>
                            <span class="text-xs font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded">${data.videoDate}</span>
                            <h4 class="font-bold text-slate-700 mt-1">${data.title}</h4>
                        </div>
                    </div>
                    <div class="aspect-video bg-black rounded overflow-hidden">
                        <iframe class="w-full h-full" src="${convertYoutubeUrl(data.youtubeUrl)}" frameborder="0" allowfullscreen></iframe>
                    </div>
                `;
                container.appendChild(div);
            });

            // 삭제 버튼 이벤트 연결
            container.querySelectorAll('.delete-qna-btn').forEach(btn => {
                btn.addEventListener('click', () => handleDeleteVideo('classVideos', btn.dataset.id, "정말 이 QnA 영상을 삭제하시겠습니까?"));
            });

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="text-red-400 text-center">데이터 로드 실패</p>';
        }
    };

    const saveQnaVideo = async () => {
        const dateInput = document.getElementById(elements.qnaVideoDateInput);
        const titleInput = document.getElementById(elements.qnaVideoTitleInput);
        const urlInput = document.getElementById(elements.qnaVideoUrlInput);
        const classSelect = document.getElementById(elements.qnaClassSelect);

        let classId = classSelect?.value;
        if (options?.disableClassSelectPopulation && app?.state?.selectedClassId) {
            classId = app.state.selectedClassId;
        }

        if (!classId || !dateInput.value || !titleInput.value || !urlInput.value) {
            alert("모든 정보를 입력해주세요.");
            return;
        }

        try {
            const docId = `${classId}_${dateInput.value}_${Date.now()}`;
            
            await setDoc(doc(db, "classVideos", docId), {
                classId: classId,
                videoDate: dateInput.value,
                title: titleInput.value,
                youtubeUrl: urlInput.value,
                createdAt: serverTimestamp()
            });

            showToast("QnA 영상이 등록되었습니다.");
            titleInput.value = '';
            urlInput.value = '';
            loadQnaVideos(); 

        } catch (e) {
            console.error(e);
            alert("저장 실패: " + e.message);
        }
    };


    // =================================================================
    //  [파트 B] 수업 영상 관리 (StudentApp: classLectures / lectureDate)
    // =================================================================

    const initLectureView = async () => {
        await populateClassSelect(elements.lectureClassSelect);
        
        const classSelect = document.getElementById(elements.lectureClassSelect);
        const addFieldBtn = document.getElementById(elements.addLectureVideoFieldBtn);
        const saveBtn = document.getElementById(elements.saveLectureVideoBtn);

        if (classSelect) {
            classSelect.addEventListener('change', () => loadLectureVideos());
        }

        if (addFieldBtn) {
            const newAddBtn = addFieldBtn.cloneNode(true);
            addFieldBtn.parentNode.replaceChild(newAddBtn, addFieldBtn);
            newAddBtn.addEventListener('click', addVideoInputField);
        }

        if (saveBtn) {
            const newSaveBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);
            newSaveBtn.addEventListener('click', saveLectureVideo);
        }
    };

    const addVideoInputField = () => {
        const parent = document.getElementById(elements.lectureVideoUrlInput)?.parentNode?.parentNode;
        if(!parent) return;

        const div = document.createElement('div');
        div.className = "flex gap-2 mb-2 video-input-group";
        div.innerHTML = `
            <input type="text" placeholder="영상 제목" class="video-title-input flex-1 p-3 border rounded-xl text-sm">
            <input type="text" placeholder="유튜브 URL" class="video-url-input flex-1 p-3 border rounded-xl text-sm">
            <button class="text-red-500 hover:bg-red-50 p-2 rounded-lg" onclick="this.parentElement.remove()">
                <span class="material-icons-round">remove_circle</span>
            </button>
        `;
        parent.appendChild(div);
    };

    const loadLectureVideos = async () => {
        const container = document.getElementById(elements.lectureVideoListContainer);
        const classSelect = document.getElementById(elements.lectureClassSelect);
        
        let classId = classSelect?.value;
        if (options?.disableClassSelectPopulation && app?.state?.selectedClassId) {
            classId = app.state.selectedClassId;
        }

        if (!container) return;
        if (!classId) {
            container.innerHTML = '<p class="text-slate-400 text-center py-4">반을 선택해주세요.</p>';
            return;
        }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            const q = query(
                collection(db, "classLectures"), 
                where("classId", "==", classId),
                orderBy("lectureDate", "desc")
            );
            
            const snapshot = await getDocs(q);
            container.innerHTML = '';

            if (snapshot.empty) {
                container.innerHTML = '<p class="text-slate-400 text-center py-4">등록된 수업 영상이 없습니다.</p>';
                return;
            }

            snapshot.forEach(doc => {
                const data = doc.data();
                const videosHtml = (data.videos || []).map(v => `
                    <div class="mb-2 last:mb-0">
                        <p class="text-sm font-bold text-slate-700 mb-1">📺 ${v.title}</p>
                        <div class="aspect-video bg-black rounded overflow-hidden">
                            <iframe class="w-full h-full" src="${convertYoutubeUrl(v.url)}" frameborder="0" allowfullscreen></iframe>
                        </div>
                    </div>
                `).join('');

                const div = document.createElement('div');
                div.className = "bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4";
                
                // [수정] 삭제 버튼 추가 (헤더 영역)
                div.innerHTML = `
                    <div class="flex justify-between items-center mb-3 border-b pb-2">
                        <div class="flex items-center gap-2">
                            <span class="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full">
                                📅 ${data.lectureDate}
                            </span>
                            <span class="text-xs text-slate-400">총 ${data.videos?.length || 0}개</span>
                        </div>
                        <button class="delete-lecture-btn flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-bold px-2 py-1 rounded hover:bg-red-50 transition" 
                                data-id="${doc.id}">
                            <span class="material-icons-round text-sm">delete</span> 삭제
                        </button>
                    </div>
                    <div class="space-y-4">
                        ${videosHtml}
                    </div>
                `;
                container.appendChild(div);
            });

            // 삭제 버튼 이벤트 연결
            container.querySelectorAll('.delete-lecture-btn').forEach(btn => {
                btn.addEventListener('click', () => handleDeleteVideo('classLectures', btn.dataset.id, "이 날짜의 모든 수업 영상을 삭제하시겠습니까?"));
            });

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="text-red-400 text-center">데이터 로드 실패</p>';
        }
    };

    const saveLectureVideo = async () => {
        const dateInput = document.getElementById(elements.lectureVideoDateInput);
        const classSelect = document.getElementById(elements.lectureClassSelect);

        const mainTitle = document.getElementById(elements.lectureVideoTitleInput).value;
        const mainUrl = document.getElementById(elements.lectureVideoUrlInput).value;

        let classId = classSelect?.value;
        if (options?.disableClassSelectPopulation && app?.state?.selectedClassId) {
            classId = app.state.selectedClassId;
        }

        if (!classId || !dateInput.value) {
            alert("반과 날짜를 선택해주세요.");
            return;
        }

        if (!mainTitle || !mainUrl) {
            alert("최소 1개의 영상 정보(제목, URL)는 입력해야 합니다.");
            return;
        }

        const videos = [];
        videos.push({ title: mainTitle, url: mainUrl });

        document.querySelectorAll('.video-input-group').forEach(group => {
            const t = group.querySelector('.video-title-input').value;
            const u = group.querySelector('.video-url-input').value;
            if (t && u) videos.push({ title: t, url: u });
        });

        try {
            const docId = `${classId}_${dateInput.value}`;
            
            await setDoc(doc(db, "classLectures", docId), {
                classId: classId,
                lectureDate: dateInput.value,
                videos: videos,
                createdAt: serverTimestamp()
            }, { merge: true });

            showToast("수업 영상이 등록되었습니다.");
            
            document.getElementById(elements.lectureVideoTitleInput).value = '';
            document.getElementById(elements.lectureVideoUrlInput).value = '';
            
            loadLectureVideos(); 

        } catch (e) {
            console.error(e);
            alert("저장 실패: " + e.message);
        }
    };

    return {
        initQnaView,
        loadQnaVideos,
        initLectureView,
        loadLectureVideos
    };
};