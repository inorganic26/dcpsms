// src/teacher/lessonManager.js
import { createLessonManager } from '../shared/lessonManager.js';

// 선생님 앱의 HTML 요소 ID들을 매핑하는 설정 객체
const teacherLessonManagerConfig = {
    app: null,
    elements: {
        subjectSelectForMgmt: 'teacher-subject-select-mgmt',
        lessonsManagementContent: 'teacher-lessons-management-content',
        lessonPrompt: 'teacher-lesson-prompt',
        lessonsList: 'teacher-lessons-list',
        saveOrderBtn: 'teacher-save-lesson-order-btn',
        showNewLessonModalBtn: 'teacher-show-new-lesson-modal-btn',
        modal: 'teacher-new-lesson-modal',
        modalTitle: 'teacher-lesson-modal-title',
        closeModalBtn: 'teacher-close-modal-btn',
        cancelBtn: 'teacher-cancel-btn',
        lessonTitle: 'teacher-lesson-title',
        video1Url: 'teacher-video1-url',
        video2Url: 'teacher-video2-url',
        videoRevUrlsContainer: (type) => `teacher-video${type}-rev-urls-container`,
        addVideo1RevBtn: 'teacher-add-video1-rev-btn',
        addVideo2RevBtn: 'teacher-add-video2-rev-btn',
        quizJsonInput: 'teacher-quiz-json-input',
        previewQuizBtn: 'teacher-preview-quiz-btn',
        questionsPreviewContainer: 'teacher-questions-preview-container',
        questionsPreviewTitle: 'teacher-questions-preview-title',
        questionsPreviewList: 'teacher-questions-preview-list',
        saveLessonBtn: 'teacher-save-lesson-btn',
        saveBtnText: 'teacher-save-btn-text',
        saveLoader: 'teacher-save-loader',
    }
};

export const lessonManager = {
    init(teacherApp) {
        // 공통 매니저를 생성하기 전에 app 컨텍스트를 설정
        teacherLessonManagerConfig.app = teacherApp;
        
        // 설정 객체를 전달하여 공통 lessonManager 인스턴스를 생성하고 초기화
        const managerInstance = createLessonManager(teacherLessonManagerConfig);
        managerInstance.init();
    }
};