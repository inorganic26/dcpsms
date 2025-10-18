// src/teacher/classVideoManager.js
import { collection, doc, getDocs, setDoc, deleteDoc, query, where, serverTimestamp } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const classVideoManager = {
    app: null,
    elements: {},
    currentDate: null,
    currentVideos: [], // 현재 날짜의 비디오 목록 {id?, title, url} (id는 Firestore 문서 ID)

    init(app) {
        this.app = app;
        this.elements = {
            dateInput: document.getElementById('class-video-date'),
            videoListContainer: document.getElementById('class-video-list-container'),
            addFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveBtn: document.getElementById('save-class-video-btn'),
        };

        this.addEventListeners();
    },

    addEventListeners() {
        this.elements.dateInput?.addEventListener('change', (e) => this.handleDateChange(e.target.value));
        this.elements.addFieldBtn?.addEventListener('click', () => this.addVideoField());
        this.elements.saveBtn?.addEventListener('click', () => this.saveClassVideos());
    },

    // 뷰가 활성화될 때 호출될 함수
    initView() {
        // 오늘 날짜로 기본 설정
        const today = new Date().toISOString().slice(0, 10);
        if (this.elements.dateInput) {
            this.elements.dateInput.value = today;
            this.handleDateChange(today); // 날짜 변경 핸들러 호출하여 비디오 로드
        } else {
             this.renderVideoFields([]); // 날짜 입력 없으면 빈 목록 표시
        }
    },

    async handleDateChange(selectedDate) {
        if (!selectedDate || !this.app.state.selectedClassId) {
             this.currentDate = null;
             this.currentVideos = [];
             this.renderVideoFields([]); // 빈 목록 렌더링
             if (this.elements.videoListContainer) {
                 this.elements.videoListContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 선택해주세요.</p>';
             }
            return;
        }

        this.currentDate = selectedDate;
        this.elements.videoListContainer.innerHTML = '<div class="loader-small mx-auto"></div>'; // 로딩 표시

        try {
            const q = query(
                collection(db, 'classLectures'),
                where('classId', '==', this.app.state.selectedClassId),
                where('lectureDate', '==', selectedDate)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                this.currentVideos = [];
            } else {
                // 해당 날짜에 문서가 하나만 있다고 가정 (필요시 여러 문서 처리 로직 추가)
                const docSnap = snapshot.docs[0];
                this.currentVideos = docSnap.data().videos.map((video, index) => ({
                    id: `${docSnap.id}-${index}`, // 임시 ID 부여 (저장 시 사용 안 함)
                    ...video
                }));
            }
            this.renderVideoFields(this.currentVideos);
        } catch (error) {
            console.error("수업 영상 로딩 실패:", error);
            showToast("수업 영상을 불러오는 데 실패했습니다.");
             if (this.elements.videoListContainer) {
                 this.elements.videoListContainer.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>';
             }
        }
    },

    renderVideoFields(videos) {
        if (!this.elements.videoListContainer) return;
        this.elements.videoListContainer.innerHTML = ''; // 기존 필드 초기화

        if (videos.length === 0) {
            this.elements.videoListContainer.innerHTML = '<p class="text-sm text-slate-500">등록된 영상이 없습니다. 아래 버튼으로 추가하세요.</p>';
        } else {
            videos.forEach((video, index) => this.addVideoField(video.title, video.url, index));
        }
    },

    addVideoField(title = '', url = '', index = -1) {
        if (!this.elements.videoListContainer) return;

        // "등록된 영상 없음" 메시지 제거
        const noVideoMsg = this.elements.videoListContainer.querySelector('p');
        if (noVideoMsg) noVideoMsg.remove();


        const fieldIndex = (index === -1) ? (this.elements.videoListContainer.querySelectorAll('.video-field-group').length) : index;

        const div = document.createElement('div');
        div.className = 'video-field-group border p-3 rounded bg-white relative';
        div.dataset.index = fieldIndex; // 각 필드 그룹에 인덱스 부여

        div.innerHTML = `
            <button class="remove-video-field-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none">&times;</button>
            <div class="mb-2">
                <label for="video-title-${fieldIndex}" class="block text-xs font-medium text-slate-600 mb-1">영상 제목 ${fieldIndex + 1}</label>
                <input type="text" id="video-title-${fieldIndex}" class="form-input form-input-sm video-title-input" value="${title}" placeholder="예: 수학 1단원 개념">
            </div>
            <div>
                <label for="video-url-${fieldIndex}" class="block text-xs font-medium text-slate-600 mb-1">YouTube URL ${fieldIndex + 1}</label>
                <input type="url" id="video-url-${fieldIndex}" class="form-input form-input-sm video-url-input" value="${url}" placeholder="https://youtube.com/watch?v=...">
            </div>
        `;

        div.querySelector('.remove-video-field-btn').addEventListener('click', (e) => {
            e.preventDefault();
            div.remove();
             // 삭제 후 인덱스 재정렬 (선택 사항, 저장 시 순서대로 처리하면 불필요)
             this.reindexVideoFields();
        });

        this.elements.videoListContainer.appendChild(div);
    },

     // 필드 삭제 시 인덱스와 레이블 업데이트 (선택 사항)
     reindexVideoFields() {
         const fieldGroups = this.elements.videoListContainer.querySelectorAll('.video-field-group');
         fieldGroups.forEach((group, newIndex) => {
             group.dataset.index = newIndex;
             group.querySelector('.video-title-input').id = `video-title-${newIndex}`;
             group.querySelector('label[for^="video-title"]').setAttribute('for', `video-title-${newIndex}`);
             group.querySelector('label[for^="video-title"]').textContent = `영상 제목 ${newIndex + 1}`;
             group.querySelector('.video-url-input').id = `video-url-${newIndex}`;
             group.querySelector('label[for^="video-url"]').setAttribute('for', `video-url-${newIndex}`);
             group.querySelector('label[for^="video-url"]').textContent = `YouTube URL ${newIndex + 1}`;
         });
     },


    async saveClassVideos() {
        if (!this.currentDate || !this.app.state.selectedClassId) {
            showToast("날짜와 반이 선택되어야 합니다.");
            return;
        }

        const videoFields = this.elements.videoListContainer.querySelectorAll('.video-field-group');
        const videosToSave = [];
        let hasError = false;

        videoFields.forEach(field => {
            const titleInput = field.querySelector('.video-title-input');
            const urlInput = field.querySelector('.video-url-input');
            const title = titleInput.value.trim();
            const url = urlInput.value.trim();

            if (title && url) {
                videosToSave.push({ title, url });
            } else if (title || url) {
                // 둘 중 하나만 입력된 경우 에러 처리
                showToast(`영상 ${parseInt(field.dataset.index) + 1}의 제목과 URL을 모두 입력하거나, 필드를 삭제해주세요.`);
                titleInput.classList.toggle('border-red-500', !title);
                urlInput.classList.toggle('border-red-500', !url);
                hasError = true;
            }
            // 둘 다 비어있으면 무시하고 저장 안 함
        });

        if (hasError) return;

        this.elements.saveBtn.disabled = true; // 저장 버튼 비활성화

        try {
            // 해당 날짜+반 ID로 기존 문서 찾기
            const q = query(
                collection(db, 'classLectures'),
                where('classId', '==', this.app.state.selectedClassId),
                where('lectureDate', '==', this.currentDate)
            );
            const snapshot = await getDocs(q);

            if (videosToSave.length === 0) {
                 // 저장할 영상이 없고 기존 문서가 있으면 삭제
                 if (!snapshot.empty) {
                     const docRef = snapshot.docs[0].ref;
                     await deleteDoc(docRef);
                     showToast("해당 날짜의 모든 수업 영상이 삭제되었습니다.", false);
                 } else {
                      showToast("저장할 영상이 없습니다.", false); // 저장할 것도, 지울 것도 없음
                 }
            } else {
                 // 저장할 영상이 있으면 문서 생성 또는 업데이트
                 const data = {
                     classId: this.app.state.selectedClassId,
                     lectureDate: this.currentDate,
                     videos: videosToSave,
                     createdAt: serverTimestamp() // 최초 생성 시 추가
                 };

                 let docRef;
                 if (snapshot.empty) {
                     // 새 문서 생성 (문서 ID는 자동 생성)
                     docRef = doc(collection(db, 'classLectures'));
                     await setDoc(docRef, data);
                 } else {
                     // 기존 문서 업데이트 (업데이트 시 createdAt은 유지됨)
                     docRef = snapshot.docs[0].ref;
                     // 생성 시간을 제외하고 업데이트할 필드만 지정
                     const { createdAt, ...updateData } = data;
                     await setDoc(docRef, updateData, { merge: true }); // setDoc با merge 옵션 사용 가능
                     // 또는 updateDoc 사용: await updateDoc(docRef, { videos: videosToSave });
                 }
                 showToast("수업 영상이 성공적으로 저장되었습니다.", false);
            }

            // 저장 후 현재 상태 업데이트 및 UI 재렌더링
            this.currentVideos = videosToSave.map((v, i) => ({ id: `temp-${i}`, ...v })); // 임시 ID 부여
            this.renderVideoFields(this.currentVideos);

        } catch (error) {
            console.error("수업 영상 저장 실패:", error);
            showToast("수업 영상 저장에 실패했습니다.");
        } finally {
             if(this.elements.saveBtn) this.elements.saveBtn.disabled = false; // 저장 버튼 활성화
        }
    },
};