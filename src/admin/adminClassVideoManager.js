// src/admin/adminClassVideoManager.js
import { createClassVideoManager } from '../shared/classVideoManager.js';

// 관리자 앱의 HTML 요소 ID들을 매핑하는 설정 객체
const adminClassVideoManagerConfig = {
    app: null, // adminApp 인스턴스가 할당될 위치
    elements: {
        // QnA 영상 관련 요소 ID (관리자 앱 HTML 기준)
        qnaVideoDateInput: 'admin-qna-video-date',
        qnaClassSelect: 'admin-qna-class-select', // 관리자 전용
        qnaVideoTitleInput: 'admin-qna-video-title',
        qnaVideoUrlInput: 'admin-qna-video-url',
        saveQnaVideoBtn: 'admin-save-qna-video-btn',
        qnaVideosList: 'admin-qna-videos-list',

        // 수업 영상 관련 요소 ID (관리자 앱 HTML 기준)
        lectureVideoDateInput: 'admin-class-video-date',
        lectureClassSelect: 'admin-class-video-class-select', // 관리자 전용
        lectureVideoListContainer: 'admin-class-video-list-container',
        addLectureVideoFieldBtn: null, // 관리자 앱은 필드 추가 방식이 다를 수 있음 (추후 구현) -> 일단 null
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
        console.log("[AdminApp] Shared ClassVideoManager initialized.");
    },

    // 뷰 초기화 함수 (adminApp.js 에서 호출)
    initQnaView() {
        this.managerInstance?.initQnaView();
    },

    initLectureView() {
        this.managerInstance?.initLectureView();
    },

    // 필요에 따라 다른 래퍼 함수 추가
};