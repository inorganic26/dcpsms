// src/admin/lessonManager.js
import { createLessonManager } from '../shared/lessonManager.js';

// 관리자 앱의 HTML 요소 ID들을 매핑하는 설정 객체
const adminLessonManagerConfig = {
    app: null, 
    elements: {
        subjectSelectForMgmt: 'admin-subject-select-for-lesson',
        lessonsManagementContent: 'admin-lessons-management-content',
        lessonPrompt: 'admin-lesson-prompt',
        lessonsList: 'admin-lessons-list',
        saveOrderBtn: 'admin-save-lesson-order-btn',
        showNewLessonModalBtn: 'admin-show-new-lesson-modal-btn',
        modal: 'admin-new-lesson-modal',
        modalTitle: 'admin-lesson-modal-title',
        closeModalBtn: 'admin-close-modal-btn',
        cancelBtn: 'admin-cancel-btn',
        lessonTitle: 'admin-lesson-title',
        video1Url: 'admin-video1-url',
        video2Url: 'admin-video2-url',
        videoRevUrlsContainer: (type) => `admin-video${type}-rev-urls-container`,
        addVideo1RevBtn: 'admin-add-video1-rev-btn',
        addVideo2RevBtn: 'admin-add-video2-rev-btn',
        quizJsonInput: 'admin-quiz-json-input',
        previewQuizBtn: 'admin-preview-quiz-btn',
        questionsPreviewContainer: 'admin-questions-preview-container',
        questionsPreviewTitle: 'admin-questions-preview-title',
        questionsPreviewList: 'admin-questions-preview-list',
        saveLessonBtn: 'admin-save-lesson-btn',
        saveBtnText: 'admin-save-btn-text',
        saveLoader: 'admin-save-loader',
    }
};

// adminApp.js에서 사용할 lessonManager 객체
export const lessonManager = {
    init(adminApp) {
        // 공통 매니저를 생성하기 전에 app 컨텍스트를 설정
        adminLessonManagerConfig.app = adminApp;
        
        // 설정 객체를 전달하여 공통 lessonManager 인스턴스를 생성하고 초기화
        const managerInstance = createLessonManager(adminLessonManagerConfig);
        managerInstance.init();
    }
};