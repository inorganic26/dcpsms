// src/admin/adminClassVideoManager.js

import { createClassVideoManager } from '../shared/classVideoManager.js';

const config = {
    app: null, // init 시 주입
    elements: {
        // QnA 영상
        qnaVideoDateInput: 'admin-qna-video-date',
        qnaClassSelect: 'admin-qna-class-select', 
        qnaVideoTitleInput: 'admin-qna-video-title',
        qnaVideoUrlInput: 'admin-qna-video-url',
        saveQnaVideoBtn: 'admin-save-qna-video-btn',
        qnaVideosList: 'admin-qna-videos-list',

        // 수업 영상
        lectureVideoDateInput: 'admin-class-video-date',
        lectureClassSelect: 'admin-class-video-class-select', 
        lectureVideoListContainer: 'admin-class-video-list-container',
        addLectureVideoFieldBtn: 'admin-add-class-video-field-btn', 
        saveLectureVideoBtn: 'admin-save-class-video-btn',
        lectureVideoTitleInput: 'admin-class-video-title',
        lectureVideoUrlInput: 'admin-class-video-url',
    }
};

export const adminClassVideoManager = {
    managerInstance: null,

    init(adminApp) {
        config.app = adminApp;
        this.managerInstance = createClassVideoManager(config);
    },

    // 뷰 초기화 (AdminApp에서 탭 전환 시 호출)
    initQnaView() {
        this.managerInstance?.initQnaView();
    },

    initLectureView() {
        this.managerInstance?.initLectureView();
    },
};