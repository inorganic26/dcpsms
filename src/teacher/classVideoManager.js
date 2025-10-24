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
        lectureVideoDateInput: 'class-video-date', // QnA와 동일한 ID 사용 가정
        lectureVideoListContainer: 'class-video-list-container',
        addLectureVideoFieldBtn: 'add-class-video-field-btn', // 선생님 앱에 추가 필요
        saveLectureVideoBtn: 'save-class-video-btn', // 선생님 앱에 추가 필요
        lectureVideoTitleInput: 'class-video-title', // 선생님 앱에 추가 필요
        lectureVideoUrlInput: 'class-video-url', // 선생님 앱에 추가 필요
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
    },

    // 뷰 초기화 함수 (teacherApp.js 에서 호출)
    initQnaView() {
        this.managerInstance?.initQnaView();
    },

    initLectureView() {
        // 선생님 앱은 lecture view 초기화 시 반 ID가 이미 설정되어 있어야 함
        if (teacherClassVideoManagerConfig.app?.state?.selectedClassId) {
             this.managerInstance?.initLectureView();
        } else {
             console.warn("[TeacherApp ClassVideo] Cannot init lecture view without selectedClassId.");
             // 필요시 사용자에게 반 선택 알림
        }
    },

    // 필요한 경우 공통 매니저 함수를 호출하는 래퍼 함수 추가
    loadQnaVideosForTeacher(date) {
        this.managerInstance?.loadQnaVideos(date);
    },
};