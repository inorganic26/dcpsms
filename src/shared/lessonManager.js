// src/shared/lessonManager.js
import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, updateDoc, orderBy } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

export function createLessonManager(config) {
    const { app, elements } = config;

    const lessonManager = {
        init() {
            // 기존 리스너
            document.getElementById(elements.addLessonBtn)?.addEventListener('click', () => this.openLessonModal(false));
            document.getElementById(elements.closeLessonModalBtn)?.addEventListener('click', () => this.closeLessonModal());
            document.getElementById(elements.cancelLessonBtn)?.addEventListener('click', () => this.closeLessonModal());
            document.getElementById(elements.saveLessonBtn)?.addEventListener('click', () => this.saveLesson());
            document.getElementById(elements.deleteLessonBtn)?.addEventListener('click', () => this.deleteLesson());
            document.getElementById(elements.lessonList)?.addEventListener('click', (e) => this.handleLessonListClick(e));
            
            // ✅ [신규] 영상 추가 버튼 리스너 (교재별 영상 추가)
            document.getElementById('btnAddVideo2Item')?.addEventListener('click', () => this.addVideo2InputItem());
        },

        // 1. 모달 열기 (영상 리스트 초기화 및 로드)
        async openLessonModal(isEditing = false) {
            if (!app.state.selectedSubjectId) { showToast("과목을 먼저 선택해주세요."); return; }
            app.state.editingLessonId = isEditing ? app.state.selectedLessonId : null;

            const modal = document.getElementById(elements.lessonModal);
            const title = document.getElementById(elements.lessonModalTitle);
            const saveBtn = document.getElementById(elements.saveLessonBtn);
            
            const titleInput = document.getElementById(elements.lessonTitleInput);
            const video1Input = document.getElementById(elements.lessonVideo1Input);
            const container = document.getElementById('video2ListContainer'); // [신규 컨테이너]

            if (!modal || !container) return;

            // 초기화
            titleInput.value = '';
            video1Input.value = '';
            container.innerHTML = ''; // 리스트 비우기

            title.textContent = isEditing ? '레슨 수정' : '새 레슨 추가';
            saveBtn.textContent = isEditing ? '수정하기' : '추가하기';

            if (isEditing && app.state.editingLessonId) {
                try {
                    const docSnap = await getDoc(doc(db, 'subjects', app.state.selectedSubjectId, 'lessons', app.state.editingLessonId));
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        titleInput.value = data.title;
                        video1Input.value = data.video1Url || '';
                        
                        // [핵심] Video 2 리스트 불러오기
                        // 1. 신규 방식 (video2List 배열이 있는 경우)
                        if (data.video2List && Array.isArray(data.video2List)) {
                            data.video2List.forEach(item => this.addVideo2InputItem(item.name, item.url));
                        } 
                        // 2. 구 방식 (video2Url 문자열만 있는 경우) -> 리스트로 변환해서 보여줌
                        else if (data.video2Url) {
                            this.addVideo2InputItem('기본', data.video2Url);
                        } else {
                            this.addVideo2InputItem(); // 데이터 없으면 빈 칸 하나 추가
                        }

                    } else { showToast("레슨 정보를 찾을 수 없습니다."); return; }
                } catch (e) { console.error(e); showToast("레슨 로드 오류"); return; }
            } else {
                // 새 레슨이면 빈 칸 하나 추가
                this.addVideo2InputItem();
            }

            modal.style.display = 'flex';
        },

        // 2. [신규] 영상 입력줄 추가 함수
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
            
            // 삭제 버튼 기능
            div.querySelector('.btn-remove').addEventListener('click', () => div.remove());
            container.appendChild(div);
        },

        // 3. 저장 로직 수정 (리스트를 저장)
        async saveLesson() {
            const subjectId = app.state.selectedSubjectId;
            const title = document.getElementById(elements.lessonTitleInput).value.trim();
            const video1Url = document.getElementById(elements.lessonVideo1Input).value.trim();
            
            // [핵심] Video 2 리스트 수집
            const video2Items = document.querySelectorAll('.video2-item');
            const video2List = [];
            video2Items.forEach(item => {
                const name = item.querySelector('.video2-name').value.trim();
                const url = item.querySelector('.video2-url').value.trim();
                if (name && url) {
                    video2List.push({ name, url });
                }
            });

            if (!subjectId || !title) { showToast("제목은 필수입니다."); return; }

            const lessonData = {
                title,
                video1Url,
                video2List, // 배열 저장 [{name:'쎈', url:'...'}, ...]
                // 하위 호환성 유지: 첫 번째 영상을 기본값으로 설정
                video2Url: video2List.length > 0 ? video2List[0].url : '' 
            };

            try {
                if (app.state.editingLessonId) {
                    await updateDoc(doc(db, 'subjects', subjectId, 'lessons', app.state.editingLessonId), lessonData);
                    showToast("수정되었습니다.", false);
                } else {
                    lessonData.createdAt = serverTimestamp();
                    lessonData.questionBank = []; 
                    await addDoc(collection(db, 'subjects', subjectId, 'lessons'), lessonData);
                    showToast("추가되었습니다.", false);
                }
                this.closeLessonModal();
            } catch (error) {
                console.error("저장 실패:", error);
                showToast("저장 실패", true);
            }
        },

        closeLessonModal() {
            const modal = document.getElementById(elements.lessonModal);
            if (modal) modal.style.display = 'none';
            app.state.editingLessonId = null;
        },

        async deleteLesson() {
             if (!app.state.selectedLessonId) return;
             if (confirm("정말 삭제하시겠습니까?")) {
                 try {
                     await deleteDoc(doc(db, 'subjects', app.state.selectedSubjectId, 'lessons', app.state.selectedLessonId));
                     showToast("삭제되었습니다.", false);
                     if(document.getElementById(elements.lessonDetailView)) document.getElementById(elements.lessonDetailView).style.display = 'none';
                 } catch(e) { showToast("삭제 실패"); }
             }
        },

        async handleLessonListClick(e) {
            const lessonId = e.target.closest('li')?.dataset.id;
            if (!lessonId) return;
    
            app.state.selectedLessonId = lessonId;
            const lessons = app.state.lessons || [];
            const lesson = lessons.find(l => l.id === lessonId);
            
            if (lesson) {
                this.renderLessonDetail(lesson);
            }
        },

        renderLessonDetail(lesson) {
            const detailView = document.getElementById(elements.lessonDetailView);
            if (!detailView) return;
            
            detailView.style.display = 'block';
            document.getElementById(elements.lessonDetailTitle).textContent = lesson.title;
            
            // 상세 화면에도 Video 2 목록을 보여주면 좋음 (여기서는 간단히 개수만 표시하거나 생략)
            const v2Count = lesson.video2List ? lesson.video2List.length : (lesson.video2Url ? 1 : 0);
            
            // 기존 UI 요소가 있다면 업데이트 (없으면 생략)
            // 상세 구현은 기존 코드 유지
        },

        listenForLessons() {
             // AdminApp/TeacherApp에서 구현된 로직 사용 (여기서는 팩토리 함수이므로 리스너 등록 로직은 상위 앱에 위임될 수 있음)
             // 만약 여기에 있어야 한다면 기존 코드 복원 필요. 
             // (보통 shared 폴더의 manager는 init과 CRUD 로직을 담당)
        }
    };
    return lessonManager;
}