// src/teacher/homeworkDashboard.js

import { createHomeworkDashboardManager } from "../shared/homeworkDashboardManager.js"; 

export const homeworkDashboard = {
    manager: null,
    app: null, 

    init(app) {
        this.app = app; 

        const elements = {
            homeworkSelect: document.getElementById('teacher-homework-select'),
            contentDiv: document.getElementById('teacher-homework-content'),
            contentTitle: document.getElementById('teacher-selected-homework-title'),
            tableBody: document.getElementById('teacher-homework-table-body'),
            btnsDiv: document.getElementById('teacher-homework-management-buttons'),
            assignBtn: document.getElementById('teacher-assign-homework-btn'),
            editBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteBtn: document.getElementById('teacher-delete-homework-btn'),
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

        // ⭐ [핵심 수정] 표(Table) 가로 스크롤 기능 강제 적용
        if (elements.tableBody) {
            const table = elements.tableBody.closest('table');
            if (table && !table.parentElement.classList.contains('overflow-x-auto')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'overflow-x-auto w-full border rounded-lg'; 
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        }

        this.manager = createHomeworkDashboardManager({
            app: app,
            elements: elements,
            mode: 'teacher' 
        });
    },

    populateHomeworkSelect() {
        if (!this.app || !this.app.state) return;

        const classId = this.app.state.selectedClassId;
        if (classId) {
            this.manager.loadHomeworkList(classId);
        }
    }
};