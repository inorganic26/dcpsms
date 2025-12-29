// src/admin/adminHomeworkDashboard.js

import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { createHomeworkDashboardManager } from "../shared/homeworkDashboardManager.js"; // 공통 매니저 임포트

export const adminHomeworkDashboard = {
    manager: null,
    elements: {},

    init(app) {
        // HTML 요소 매핑 (관리자 화면 ID)
        this.elements = {
            // 메인 UI
            classSelect: document.getElementById('admin-homework-class-select'),
            homeworkSelect: document.getElementById('admin-homework-select'),
            
            // 컨텐츠 영역
            contentDiv: document.getElementById('admin-homework-content'),
            placeholder: document.getElementById('admin-homework-placeholder'),
            contentTitle: document.getElementById('admin-selected-homework-title'),
            tableBody: document.getElementById('admin-homework-table-body'),
            btnsDiv: document.getElementById('admin-homework-management-buttons'),
            
            // 버튼
            assignBtn: document.getElementById('admin-assign-homework-btn'),
            editBtn: document.getElementById('admin-edit-homework-btn'),
            deleteBtn: document.getElementById('admin-delete-homework-btn'),
            
            // 모달
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

        // 공통 매니저 생성
        this.manager = createHomeworkDashboardManager({
            app: app,
            elements: this.elements,
            mode: 'admin' // 관리자 모드
        });

        this.populateClassSelect();
        
        // 반 변경 이벤트만 여기서 처리 (나머지는 매니저가 함)
        this.elements.classSelect?.addEventListener('change', (e) => {
            const classId = e.target.value;
            // 반이 선택되면 매니저에게 목록 로드 요청
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