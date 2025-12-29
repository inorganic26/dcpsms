// src/teacher/homeworkDashboard.js

import { createHomeworkDashboardManager } from "../shared/homeworkDashboardManager.js"; // 공통 매니저 임포트

export const homeworkDashboard = {
    manager: null,

    init(app) {
        // HTML 요소 매핑 (선생님 화면 ID)
        const elements = {
            // 메인 UI
            homeworkSelect: document.getElementById('teacher-homework-select'),
            
            // 컨텐츠 영역
            contentDiv: document.getElementById('teacher-homework-content'),
            // 선생님은 placeholder가 보통 없으므로 생략 가능하거나 필요시 추가
            contentTitle: document.getElementById('teacher-selected-homework-title'),
            tableBody: document.getElementById('teacher-homework-table-body'),
            btnsDiv: document.getElementById('teacher-homework-management-buttons'),
            
            // 버튼
            assignBtn: document.getElementById('teacher-assign-homework-btn'),
            editBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteBtn: document.getElementById('teacher-delete-homework-btn'),
            
            // 모달
            modal: document.getElementById('teacher-assign-homework-modal'),
            modalTitle: document.getElementById('teacher-homework-modal-title'),
            titleInput: document.getElementById('teacher-homework-title'),
            subjectSelect: document.getElementById('teacher-homework-subject-select'),
            textbookSelect: document.getElementById('teacher-homework-textbook-select'),
            pagesInput: document.getElementById('teacher-homework-pages'),
            totalPagesInput: document.getElementById('teacher-homework-total-pages'),
            dueDateInput: document.getElementById('teacher-homework-due-date'),
            saveBtn: document.getElementById('teacher-save-homework-btn'),
            closeBtn: document.getElementById('teacher-close-homework-modal-btn'),
            cancelBtn: document.getElementById('teacher-cancel-homework-btn'),
        };

        // 공통 매니저 생성
        this.manager = createHomeworkDashboardManager({
            app: app,
            elements: elements,
            mode: 'teacher' // 선생님 모드
        });
    },

    // 선생님 앱은 반이 바뀌면 외부에서 이 함수를 호출해줌
    populateHomeworkSelect() {
        const classId = this.app.state.selectedClassId;
        if (classId) {
            this.manager.loadHomeworkList(classId);
        }
    }
};