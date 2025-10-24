// src/teacher/homeworkDashboard.js
import { createHomeworkManager } from '../shared/homeworkManager.js'; // 공통 매니저 import

// 교사 앱의 HTML 요소 ID들을 매핑하는 설정 객체
const teacherHomeworkManagerConfig = {
    app: null, // teacherApp 인스턴스가 할당될 위치
    elements: {
        // 교사 앱의 숙제 관련 요소 ID들
        assignHomeworkBtn: 'teacher-assign-homework-btn',
        closeHomeworkModalBtn: 'teacher-close-homework-modal-btn',
        cancelHomeworkBtn: 'teacher-cancel-homework-btn',
        saveHomeworkBtn: 'teacher-save-homework-btn',
        // homeworkClassSelect: null, // 교사 앱에는 없음
        homeworkSelect: 'teacher-homework-select',
        homeworkSubjectSelect: 'teacher-homework-subject-select', // 모달 내
        homeworkTextbookSelect: 'teacher-homework-textbook-select', // 모달 내
        homeworkPagesInput: 'teacher-homework-pages', // 모달 내
        homeworkDueDateInput: 'teacher-homework-due-date', // 모달 내
        editHomeworkBtn: 'teacher-edit-homework-btn',
        deleteHomeworkBtn: 'teacher-delete-homework-btn',
        // UI 영역 요소들
        // homeworkMainContent: null, // 교사 앱에는 없음
        homeworkManagementButtons: 'teacher-homework-management-buttons',
        homeworkContent: 'teacher-homework-content',
        selectedHomeworkTitle: 'teacher-selected-homework-title',
        homeworkTableBody: 'teacher-homework-table-body',
        assignHomeworkModal: 'teacher-assign-homework-modal',
        homeworkModalTitle: 'teacher-homework-modal-title',
    }
};

// teacherApp.js에서 사용할 homeworkDashboard 객체
export const homeworkDashboard = {
    managerInstance: null, // 공통 매니저 인스턴스 저장

    init(teacherApp) {
        // 공통 매니저를 생성하기 전에 app 컨텍스트를 설정
        teacherHomeworkManagerConfig.app = teacherApp;

        // 설정 객체를 전달하여 공통 homeworkManager 인스턴스를 생성하고 초기화
        this.managerInstance = createHomeworkManager(teacherHomeworkManagerConfig);
        this.managerInstance.init();

        // 교사 앱 전용 초기화 로직 (예: 반 선택 시 바로 숙제 목록 로드)
        // TeacherApp의 handleClassSelection에서 populateHomeworkSelect 호출하도록 변경 필요
    },

    // 교사 앱에서 필요 시 공통 매니저 함수 호출하는 래퍼 제공
    populateHomeworkSelect() {
        this.managerInstance?.populateHomeworkSelect();
    },
    handleHomeworkSelection(homeworkId) {
        this.managerInstance?.handleHomeworkSelection(homeworkId);
    },
    // ... 필요한 다른 래퍼 함수들 ...
};

// 기존 교사 앱의 homeworkDashboard.js 내용은 대부분 createHomeworkManager로 이동했으므로 삭제