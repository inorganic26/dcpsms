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


        // --- 1. 테이블 UI 최적화 (HTML에서 처리됨) ---
        // HTML에서 이미 overflow-auto, max-height: 500px, 
        // white-space: nowrap 등이 적용되어 있으므로
        // 여기서는 별도의 스타일 조작이 필요 없습니다.

        // --- 2. 매니저 초기화 ---
        // --- 2. 매니저 초기화 ---
        this.manager = createHomeworkDashboardManager({
            app: app,
            elements: this.elements,
            mode: 'admin' 
        });

        // --- 3. [수정됨] 모바일 스크롤 로직 ---
        const detailWrapper = document.getElementById('admin-homework-content')?.parentElement;

        this.elements.homeworkSelect?.addEventListener('change', (e) => {
            const classId = this.elements.classSelect.value;
            const homeworkId = e.target.value;
            
            if (classId && homeworkId) {
                document.getElementById('admin-homework-main-content').style.display = 'block';
                this.manager.loadHomeworkList(classId); // (내부적으로 상세 로드 호출)
                
                // ⭐ 모바일(화면 작을 때)이면 상세 내용 쪽으로 부드럽게 스크롤
                if (window.innerWidth < 1024 && detailWrapper) {
                    // 약간의 딜레이를 주어 화면이 렌더링된 후 스크롤되게 함
                    setTimeout(() => {
                        detailWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 100);
                }
            } else {
                document.getElementById('admin-homework-main-content').style.display = 'none';
            }
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