// src/admin/adminHomeworkDashboard.js
import { createHomeworkManager } from '../shared/homeworkManager.js'; // 공통 매니저 import

// 관리자 앱의 HTML 요소 ID들을 매핑하는 설정 객체
const adminHomeworkManagerConfig = {
    app: null, // adminApp 인스턴스가 할당될 위치
    elements: {
        // 관리자 앱의 숙제 관련 요소 ID들
        assignHomeworkBtn: 'admin-assign-homework-btn',
        closeHomeworkModalBtn: 'admin-close-homework-modal-btn',
        cancelHomeworkBtn: 'admin-cancel-homework-btn',
        saveHomeworkBtn: 'admin-save-homework-btn',
        homeworkClassSelect: 'admin-homework-class-select', // 관리자 전용
        homeworkSelect: 'admin-homework-select',
        homeworkSubjectSelect: 'admin-homework-subject-select', // 모달 내
        homeworkTextbookSelect: 'admin-homework-textbook-select', // 모달 내
        homeworkPagesInput: 'admin-homework-pages', // 모달 내
        homeworkDueDateInput: 'admin-homework-due-date', // 모달 내
        editHomeworkBtn: 'admin-edit-homework-btn',
        deleteHomeworkBtn: 'admin-delete-homework-btn',
        // UI 영역 요소들
        homeworkMainContent: 'admin-homework-main-content', // 관리자 전용
        homeworkManagementButtons: 'admin-homework-management-buttons',
        homeworkContent: 'admin-homework-content',
        selectedHomeworkTitle: 'admin-selected-homework-title',
        homeworkTableBody: 'admin-homework-table-body',
        assignHomeworkModal: 'admin-assign-homework-modal',
        homeworkModalTitle: 'admin-homework-modal-title',
    }
};

// adminApp.js에서 사용할 adminHomeworkDashboard 객체
export const adminHomeworkDashboard = {
    managerInstance: null, // 공통 매니저 인스턴스 저장

    init(adminApp) {
        // 공통 매니저를 생성하기 전에 app 컨텍스트를 설정
        adminHomeworkManagerConfig.app = adminApp;

        // 설정 객체를 전달하여 공통 homeworkManager 인스턴스를 생성하고 초기화
        this.managerInstance = createHomeworkManager(adminHomeworkManagerConfig);
        this.managerInstance.init();

        // 관리자 전용 초기화 로직이 있다면 여기서 추가
        // 예: this.managerInstance.initView(); // initView는 관리자 전용이므로 여기서 호출
    },

    // 관리자 앱에서 뷰가 활성화될 때 호출할 함수
    initView() {
        if (this.managerInstance) {
            this.managerInstance.initView(); // 공통 매니저의 관리자 전용 초기화 함수 호출
        } else {
            console.error("Homework manager instance not initialized yet.");
        }
    },

    // 필요하다면 공통 매니저의 다른 함수를 호출하는 래퍼 함수 추가 가능
    // 예: populateClassSelect() { this.managerInstance?.populateClassSelect(); }
};