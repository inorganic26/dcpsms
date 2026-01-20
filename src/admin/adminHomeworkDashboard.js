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

        // ⭐ [PC/모바일 공통] 스크롤 및 잘림 현상 강력 해결 (수정된 버전)
        if (this.elements.tableBody) {
            const table = this.elements.tableBody.closest('table');
            const wrapper = table?.parentElement;

            if (table && wrapper) {
                // 1. 테이블 가로 최소 너비 확보 (PC에서 창 줄였을 때 이름 찌그러짐 방지)
                table.style.minWidth = '600px'; 
                
                // 2. 이름 및 상태 텍스트 줄바꿈 방지 (한 줄로 깔끔하게 나오게)
                const updateTableStyles = () => {
                    const rows = table.querySelectorAll('tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('th, td');
                        if(cells.length > 0) {
                            cells[0].style.whiteSpace = 'nowrap'; // 이름
                            if(cells[1]) cells[1].style.whiteSpace = 'nowrap'; // 상태
                        }
                    });
                };
                // 데이터 로드될 때마다 스타일 적용
                const observer = new MutationObserver(updateTableStyles);
                observer.observe(this.elements.tableBody, { childList: true });

                // 3. ⭐ 스크롤 박스 강제 설정 (PC 화면 핵심)
                // [수정] 기존 클래스를 초기화하지 않고(className = '' 삭제), 필요한 스타일만 추가합니다.
                // wrapper.className = '';  <-- 이 줄을 삭제했습니다.
                
                wrapper.classList.add(
                    'overflow-auto', // 상하좌우 스크롤 자동 생성
                    'w-full',
                    'border',
                    'rounded-lg',
                    'bg-white',
                    'shadow-sm'
                );
                
                // 4. ⭐ [수정] 높이 강제 제한 해제
                // vh 단위 대신 부모 높이를 따라가도록 변경하여 저해상도에서도 꽉 차게 나옵니다.
                wrapper.style.height = '100%';       // (변경됨) auto -> 100%
                wrapper.style.maxHeight = 'none';    // (변경됨) 65vh -> none
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