// src/teacher/classVideoManager.js
import { createClassVideoManager } from '../shared/classVideoManager.js';

const teacherClassVideoManagerConfig = {
    app: null,
    options: {
        disableClassSelectPopulation: true 
    },
    elements: {
        // QnA Video IDs
        qnaVideoDateInput: 'qna-video-date',
        qnaClassSelect: 'teacher-class-select', 
        qnaVideoTitleInput: 'qna-video-title',
        qnaVideoUrlInput: 'qna-video-url',
        saveQnaVideoBtn: 'save-qna-video-btn',
        qnaVideosList: 'qna-videos-list-teacher',

        // Class Lecture Video IDs
        lectureVideoDateInput: 'class-video-date',
        lectureClassSelect: 'teacher-class-select', 
        lectureVideoListContainer: 'class-video-list-container',
        
        // 선생님 앱에는 "영상 추가" 버튼이 없었으므로 null 처리하거나, 
        // index.html에 추가했다면 해당 ID ('add-class-video-field-btn')를 넣어야 함.
        // 앞서 HTML을 수정해 드렸으므로 ID를 연결합니다.
        addLectureVideoFieldBtn: 'add-class-video-field-btn', 
        
        saveLectureVideoBtn: 'save-class-video-btn',
        lectureVideoTitleInput: 'class-video-title',
        lectureVideoUrlInput: 'class-video-url',
    }
};

export const classVideoManager = {
    managerInstance: null,

    init(teacherApp) {
        teacherClassVideoManagerConfig.app = teacherApp;
        this.managerInstance = createClassVideoManager(teacherClassVideoManagerConfig);

        // ✨ [추가됨] 반 변경 이벤트 감지 리스너
        document.addEventListener('class-changed', () => {
            // QnA 뷰가 활성화되어 있다면 리로드
            if (document.getElementById('view-qna-video-mgmt')?.style.display !== 'none') {
                this.managerInstance.loadQnaVideos();
            }
            // 수업 영상 뷰가 활성화되어 있다면 리로드
            if (document.getElementById('view-class-video-mgmt')?.style.display !== 'none') {
                this.managerInstance.loadLectureVideos();
            }
        });
    },

    initQnaView() {
        this.managerInstance?.initQnaView();
    },

    initLectureView() {
        this.managerInstance?.initLectureView();
        // 뷰 진입 시 즉시 로드 시도
        setTimeout(() => this.managerInstance.loadLectureVideos(), 100);
    },
};