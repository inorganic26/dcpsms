// src/admin/adminHomeworkDashboard.js

import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { createHomeworkDashboardManager } from "../shared/homeworkDashboardManager.js"; 

export const adminHomeworkDashboard = {
    manager: null,
    elements: {},

    init(app) {
        this.elements = {
            classSelect: document.getElementById('admin-homework-class-select'),
            homeworkSelect: document.getElementById('admin-homework-select'),
            contentDiv: document.getElementById('admin-homework-content'),
            placeholder: document.getElementById('admin-homework-placeholder'),
            contentTitle: document.getElementById('admin-selected-homework-title'),
            tableBody: document.getElementById('admin-homework-table-body'),
            btnsDiv: document.getElementById('admin-homework-management-buttons'),
            assignBtn: document.getElementById('admin-assign-homework-btn'),
            editBtn: document.getElementById('admin-edit-homework-btn'),
            deleteBtn: document.getElementById('admin-delete-homework-btn'),
            modal: document.getElementById('admin-assign-homework-modal'),
            modalTitle: document.getElementById('admin-homework-modal-title'),
            titleInput: document.getElementById('admin-homework-title'),
            subjectSelect: document.getElementById('admin-homework-subject-select'),
            textbookSelect: document.getElementById('admin-homework-textbook-select'),
            pagesInput: document.getElementById('admin-homework-pages'),
            totalPagesInput: document.getElementById('admin-homework-total-pages'),
            dueDateInput: document.getElementById('admin-homework-due-date'),
            saveBtn: document.getElementById('admin-save-homework-btn'),
            closeBtn: document.getElementById('admin-close-homework-modal-btn'),
            cancelBtn: document.getElementById('admin-cancel-homework-btn'),
        };

        // ⭐ [핵심 수정] 표(Table) 가로 스크롤 기능 강제 적용
        // 모바일에서 학생 이름이 잘리지 않고 옆으로 밀 수 있게 만듦
        if (this.elements.tableBody) {
            const table = this.elements.tableBody.closest('table');
            if (table && !table.parentElement.classList.contains('overflow-x-auto')) {
                const wrapper = document.createElement('div');
                wrapper.className = 'overflow-x-auto w-full border rounded-lg'; // 가로 스크롤 컨테이너
                table.parentNode.insertBefore(wrapper, table);
                wrapper.appendChild(table);
            }
        }

        this.manager = createHomeworkDashboardManager({
            app: app,
            elements: this.elements,
            mode: 'admin' 
        });

        this.populateClassSelect();
        
        this.elements.classSelect?.addEventListener('change', (e) => {
            const classId = e.target.value;
            if (classId) {
                document.getElementById('admin-homework-main-content').style.display = 'block';
                this.manager.loadHomeworkList(classId);
            } else {
                document.getElementById('admin-homework-main-content').style.display = 'none';
            }
        });
    },

    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        try {
            const q = query(collection(db, 'classes'), orderBy('name'));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">-- 반 선택 --</option>';
            snap.forEach(doc => select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
        } catch (e) { console.error(e); }
    }
};