// src/teacher/classVideoManager.js
import { createClassVideoManager } from '../shared/classVideoManager.js';

const config = {
    app: null,
    options: { disableClassSelectPopulation: true },
    elements: {
        qnaVideoDateInput: 'qna-video-date',
        qnaClassSelect: 'teacher-class-select', 
        qnaVideoTitleInput: 'qna-video-title',
        qnaVideoUrlInput: 'qna-video-url',
        saveQnaVideoBtn: 'save-qna-video-btn',
        qnaVideosList: 'qna-videos-list-teacher',
        lectureVideoDateInput: 'class-video-date',
        lectureClassSelect: 'teacher-class-select', 
        lectureVideoListContainer: 'class-video-list-container',
        addLectureVideoFieldBtn: 'add-class-video-field-btn', 
        saveLectureVideoBtn: 'save-class-video-btn',
        lectureVideoTitleInput: 'class-video-title',
        lectureVideoUrlInput: 'class-video-url',
    }
};

export const classVideoManager = {
    managerInstance: null,

    init(teacherApp) {
        config.app = teacherApp;
        this.managerInstance = createClassVideoManager(config);

        // 반 변경 시 영상 목록 새로고침
        document.addEventListener('class-changed', () => {
            if (document.getElementById('view-qna-video-mgmt')?.style.display !== 'none') {
                this.managerInstance.loadQnaVideos();
            }
            if (document.getElementById('view-class-video-mgmt')?.style.display !== 'none') {
                this.managerInstance.loadLectureVideos();
            }
        });
    },

    // [수정됨] 페이지 진입 시, 이미 선택된 반이 있다면 바로 로드하도록 수정
    initQnaView() { 
        this.managerInstance?.initQnaView(); 
        if (config.app?.state?.selectedClassId) {
            setTimeout(() => this.managerInstance.loadQnaVideos(), 100);
        }
    },

    initLectureView() { 
        this.managerInstance?.initLectureView(); 
        // 여기는 기존에도 잘 동작하던 코드
        if (config.app?.state?.selectedClassId) {
            setTimeout(() => this.managerInstance.loadLectureVideos(), 100);
        }
    },
};