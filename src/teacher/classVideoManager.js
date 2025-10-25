// src/teacher/classVideoManager.js
import { createClassVideoManager } from '../shared/classVideoManager.js';

// 선생님 앱의 HTML 요소 ID들을 매핑하는 설정 객체
// 선생님 앱 HTML (src/teacher/index.html) 에 맞게 ID 확인 및 수정 필요
const teacherClassVideoManagerConfig = {
    app: null, // teacherApp 인스턴스가 할당될 위치
    elements: {
        // QnA 영상 관련 요소 ID (선생님 앱 HTML 기준)
        qnaVideoDateInput: 'qna-video-date',
        qnaVideoTitleInput: 'qna-video-title',
        qnaVideoUrlInput: 'qna-video-url',
        saveQnaVideoBtn: 'save-qna-video-btn',
        qnaVideosList: 'qna-videos-list-teacher',
        // qnaClassSelect: null, // 선생님 앱에는 반 선택 없음

        // 수업 영상 관련 요소 ID (선생님 앱 HTML 기준)
        lectureVideoDateInput: 'class-video-date',
        lectureVideoListContainer: 'class-video-list-container',
        // 'add-class-video-field-btn'는 index.html에 없음: addLectureVideoFieldBtn: 'add-class-video-field-btn', 
        saveLectureVideoBtn: 'save-class-video-btn', 
        lectureVideoTitleInput: 'class-video-title', 
        lectureVideoUrlInput: 'class-video-url', 
        // lectureClassSelect: null, // 선생님 앱에는 반 선택 없음
    }
};

export const classVideoManager = {
    managerInstance: null,

    init(teacherApp) {
        teacherClassVideoManagerConfig.app = teacherApp;
        // 공통 매니저 생성 및 초기화
        this.managerInstance = createClassVideoManager(teacherClassVideoManagerConfig);
        // init은 create 함수 내에서 자동으로 호출됩니다.
        console.log("[TeacherApp] Shared ClassVideoManager initialized.");
        
        // QnA와 Lecture 뷰의 이벤트 리스너는 각 initView 함수에서 처리하도록 유지
    },

    // 뷰 초기화 함수 (teacherApp.js 에서 호출)
    initQnaView() {
        this.managerInstance?.initQnaView();
    },

    initLectureView() {
        // 선생님 앱은 lecture view 초기화 시 반 ID가 이미 설정되어 있어야 함
        const app = teacherClassVideoManagerConfig.app;
        if (app?.state?.selectedClassId) {
             this.managerInstance?.initLectureView();

             // ✨ (보강) 날짜 변경 시 영상 목록을 로드하는 리스너를 여기서 명시적으로 추가합니다.
             // 이로써 수업 영상 관리 뷰가 열리고 날짜를 선택했을 때 영상 목록이 제대로 렌더링됩니다.
             const dateInput = app.elements.lectureVideoDateInput;
             // 중복 리스너 추가 방지를 위해 플래그 사용
             if (dateInput && !dateInput.classList.contains('listener-added-lecture')) {
                 dateInput.classList.add('listener-added-lecture'); 
                 dateInput.addEventListener('change', (e) => {
                     const dateStr = e.target.value.replace(/-/g, '');
                     const listContainer = app.elements.lectureVideoListContainer;
                     
                     if (dateStr.length === 8) {
                         listContainer.innerHTML = '<p class="text-sm text-slate-500">영상 목록 로딩 중...</p>';
                         this.managerInstance?.loadLectureVideos(dateStr); 
                     } else {
                         listContainer.innerHTML = '<p class="text-sm text-slate-500">날짜를 선택하면 해당 영상 목록이 표시됩니다.</p>';
                     }
                 });
             }
        } else {
             console.warn("[TeacherApp ClassVideo] Cannot init lecture view without selectedClassId.");
             // 필요시 사용자에게 반 선택 알림
        }
    },

    loadQnaVideosForTeacher(date) {
        this.managerInstance?.loadQnaVideos(date);
    },
};