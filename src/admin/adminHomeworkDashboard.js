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

        // ⭐ [PC/모바일 공통] 스크롤 및 높이 자동 조절 (최종 수정)
        if (this.elements.tableBody) {
            const table = this.elements.tableBody.closest('table');
            const wrapper = table?.parentElement;

            if (table && wrapper) {
                // 1. 테이블 가로 최소 너비 확보
                table.style.minWidth = '600px'; 
                
                // 2. 텍스트 줄바꿈 방지
                const updateTableStyles = () => {
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('th, td');
                        if(cells.length > 0) {
                            cells[0].style.whiteSpace = 'nowrap';
                            if(cells[1]) cells[1].style.whiteSpace = 'nowrap';
                        }
                    });
                };
                const observer = new MutationObserver(updateTableStyles);
                observer.observe(this.elements.tableBody, { childList: true });

                // 3. ⭐ [수정] 박스 높이 최적화
                // 기존 'h-full' 클래스가 있으면 강제로 꽉 차버리므로 제거합니다.
                wrapper.classList.remove('h-full');

                // Flexbox 환경에서 스크롤이 정상 작동하도록 클래스 추가
                wrapper.classList.add(
                    'overflow-auto', // 스크롤바 생성
                    'w-full',
                    'border',
                    'rounded-lg',
                    'bg-white',
                    'shadow-sm',
                    'flex-1',       // 남는 공간 채우기 (최대치까지)
                    'min-h-0'       // Flex 내부 스크롤 필수 속성
                );
                
                // 4. ⭐ [수정] 강제 높이 설정 변경
                // '100%' 대신 'auto'를 주어 내용이 적으면 박스도 작아지게 합니다.
                wrapper.style.height = 'auto';       
                wrapper.style.maxHeight = 'none';    
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