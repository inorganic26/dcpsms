// src/teacher/classVideoManager.js

import { createClassVideoManager } from '../shared/classVideoManager.js';

export const classVideoManager = {
    managerInstance: null,
    app: null, // [추가] 앱 인스턴스를 저장할 변수

    init(teacherApp) {
        this.app = teacherApp; // [수정] 앱 인스턴스 저장

        // App에서 요소를 받지 않고 직접 ID를 지정하여 전달
        const config = {
            app: teacherApp,
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

        this.managerInstance = createClassVideoManager(config);

        document.addEventListener('class-changed', () => {
            if (document.getElementById('view-qna-video-mgmt')?.style.display !== 'none') {
                this.managerInstance.loadQnaVideos();
            }
            if (document.getElementById('view-class-video-mgmt')?.style.display !== 'none') {
                this.managerInstance.loadLectureVideos();
            }
        });
    },

    initQnaView() { 
        this.managerInstance?.initQnaView(); 
        // [수정] this.managerInstance.config.app 대신 this.app 사용
        if (this.app?.state?.selectedClassId) {
            setTimeout(() => this.managerInstance.loadQnaVideos(), 100);
        }
    },

    initLectureView() { 
        this.managerInstance?.initLectureView(); 
        // [수정] this.managerInstance.config.app 대신 this.app 사용
        if (this.app?.state?.selectedClassId) {
            setTimeout(() => this.managerInstance.loadLectureVideos(), 100);
        }
    },
};