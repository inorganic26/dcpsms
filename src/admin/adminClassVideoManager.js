// src/admin/adminClassVideoManager.js

import { createClassVideoManager } from '../shared/classVideoManager.js';

// 관리자 앱의 HTML 요소 ID들을 매핑하는 설정 객체
const adminClassVideoManagerConfig = {
    app: null, 
    elements: {
        // QnA 영상 관련 요소 ID
        qnaVideoDateInput: 'admin-qna-video-date',
        qnaClassSelect: 'admin-qna-class-select', 
        qnaVideoTitleInput: 'admin-qna-video-title',
        qnaVideoUrlInput: 'admin-qna-video-url',
        saveQnaVideoBtn: 'admin-save-qna-video-btn',
        qnaVideosList: 'admin-qna-videos-list',

        // 수업 영상 관련 요소 ID
        lectureVideoDateInput: 'admin-class-video-date',
        lectureClassSelect: 'admin-class-video-class-select', 
        lectureVideoListContainer: 'admin-class-video-list-container',
        
        // ✨ [핵심 수정] 이 부분이 null이면 버튼이 작동하지 않습니다. 정확한 ID로 연결!
        addLectureVideoFieldBtn: 'admin-add-class-video-field-btn', 
        
        saveLectureVideoBtn: 'admin-save-class-video-btn',
        lectureVideoTitleInput: 'admin-class-video-title',
        lectureVideoUrlInput: 'admin-class-video-url',
    }
};

export const adminClassVideoManager = {
    managerInstance: null,

    init(adminApp) {
        adminClassVideoManagerConfig.app = adminApp;
        // 공통 매니저 생성 및 초기화
        this.managerInstance = createClassVideoManager(adminClassVideoManagerConfig);
    },

    // 뷰 초기화 함수 (adminApp.js 에서 호출)
    initQnaView() {
        this.managerInstance?.initQnaView();
    },

    initLectureView() {
        this.managerInstance?.initLectureView();
    },
};