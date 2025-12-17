// src/admin/adminHomeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const adminHomeworkDashboard = {
    elements: {
        modal: 'admin-assign-homework-modal',
        modalTitle: 'admin-homework-modal-title',
        titleInput: 'admin-homework-title',
        subjectSelect: 'admin-homework-subject-select',
        textbookSelect: 'admin-homework-textbook-select',
        pagesInput: 'admin-homework-pages',
        dueDateInput: 'admin-homework-due-date',
        
        saveBtn: 'admin-save-homework-btn',
        closeBtn: 'admin-close-homework-modal-btn',
        cancelBtn: 'admin-cancel-homework-btn',
        
        classSelect: 'admin-homework-class-select',
        homeworkMainContent: 'admin-homework-main-content',
        homeworkListSelect: 'admin-homework-select',
        homeworkContent: 'admin-homework-content',
        homeworkTableBody: 'admin-homework-table-body',
        selectedHomeworkTitle: 'admin-selected-homework-title',
        mgmtButtons: 'admin-homework-management-buttons',
        editBtn: 'admin-edit-homework-btn',
        deleteBtn: 'admin-delete-homework-btn',
        placeholder: 'admin-homework-placeholder',
        
        assignBtn: 'admin-assign-homework-btn',
    },
    
    state: {
        selectedClassId: null,
        selectedHomeworkId: null,
        editingHomework: null,
    },

    init(app) {
        this.app = app;
        this.addEventListeners();
        // ✨ [수정] 앱이 시작될 때 반 목록을 불러오도록 이 줄을 반드시 추가해야 합니다!
        this.populateClassSelect(); 
    },

    initView() {
        this.populateClassSelect();
        const el = (id) => document.getElementById(this.elements[id]);
        // 초기화 시 메인 콘텐츠 숨김 (반 선택 전)
        if (el('homeworkMainContent')) el('homeworkMainContent').style.display = 'none';
        if (el('homeworkContent')) el('homeworkContent').style.display = 'none';
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id]);

        el('classSelect')?.addEventListener('change', (e) => this.handleClassChange(e.target.value));
        el('homeworkListSelect')?.addEventListener('change', (e) => this.loadHomeworkDetails(e.target.value));
        el('assignBtn')?.addEventListener('click', () => this.openModal('create'));
        
        el('saveBtn')?.addEventListener('click', () => this.saveHomework());
        el('closeBtn')?.addEventListener('click', () => this.closeModal());
        el('cancelBtn')?.addEventListener('click', () => this.closeModal());
        el('editBtn')?.addEventListener('click', () => this.openModal('edit'));
        el('deleteBtn')?.addEventListener('click', () => this.deleteHomework());
        el('subjectSelect')?.addEventListener('change', (e) => this.handleSubjectChange(e.target.value));
    },

    async populateClassSelect() {
        const select = document.getElementById(this.elements.classSelect);
        if (!select) return;
        
        // 이미 로딩 중이면 중복 실행 방지
        if (select.options.length > 1 && select.options[1].value !== "") return;

        select.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, 'classes'), orderBy('name'));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">-- 반 선택 --</option>';
            snap.forEach(doc => {
                select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
        } catch (e) {
            console.error(e);
            select.innerHTML = '<option value="">로드 실패</option>';
        }
    },

    handleClassChange(classId) {
        this.state.selectedClassId = classId;
        this.state.selectedHomeworkId = null;
        
        const mainContent = document.getElementById(this.elements.homeworkMainContent);
        
        if (classId) {
            // ✨ 반이 선택되면 메인 콘텐츠(숙제 목록+버튼)를 보여줌
            if(mainContent) mainContent.style.display = 'block';
            this.loadHomeworkList(classId);
        } else {
            // 반 선택이 해제되면 숨김
            if(mainContent) mainContent.style.display = 'none';
        }
        
        // 우측 상세 화면 초기화
        const el = (id) => document.getElementById(this.elements[id]);
        if(el('homeworkContent')) el('homeworkContent').style.display = 'none';
        if(el('placeholder')) el('placeholder').style.display = 'flex';
        if(el('mgmtButtons')) el('mgmtButtons').style.display = 'none';
    },

    async loadHomeworkList(classId) {
        const select = document.getElementById(this.elements.homeworkListSelect);
        if (!select) return;
        
        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            
            select.innerHTML = ''; // 기존 목록 초기화
            if (snap.empty) {
                // select에 option을 추가하는 방식으로 변경 (innerHTML 덮어쓰기 문제 방지)
                select.innerHTML = '<option disabled>(등록된 숙제 없음)</option>';
            } else {
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.text = data.title ? data.title : "(제목 없음)";
                    select.add(opt);
                });
            }
        } catch (e) {
            console.error(e);
            select.innerHTML = '<option>로드 실패</option>';
        }
    },

    async loadHomeworkDetails(homeworkId) {
        if (!homeworkId) return;
        this.state.selectedHomeworkId = homeworkId;
        const currentClassId = this.state.selectedClassId;
        
        const el = (id) => document.getElementById(this.elements[id]);
        
        el('homeworkContent').style.display = 'flex';
        el('homeworkContent').classList.remove('hidden');
        el('placeholder').style.display = 'none';
        el('mgmtButtons').style.display = 'flex';
        el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center">로딩 중...</td></tr>';

        try {
            const docRef = doc(db, 'homeworks', homeworkId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) {
                el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">숙제가 삭제되었습니다.</td></tr>';
                return;
            }
            const hwData = docSnap.data();
            this.state.editingHomework = { id: homeworkId, ...hwData };
            
            el('selectedHomeworkTitle').textContent = hwData.title || "(제목 없음)";

            const studentsSnap = await getDocs(collection(db, 'students'));
            
            const submissions = hwData.submissions || {};
            const tbody = el('homeworkTableBody');
            tbody.innerHTML = '';

            let hasStudent = false;

            studentsSnap.forEach(sDoc => {
                const student = sDoc.data();
                
                let isInClass = false;
                if (student.classIds && Array.isArray(student.classIds)) {
                    if (student.classIds.includes(currentClassId)) isInClass = true;
                } else if (student.classId === currentClassId) {
                    isInClass = true;
                }

                if (isInClass) {
                    hasStudent = true;
                    const sub = submissions[sDoc.id];
                    const isDone = sub && sub.status === 'completed';
                    const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
                    
                    let checkHtml = `<span class="text-slate-400">-</span>`;
                    if (isDone && sub.fileUrl) {
                        checkHtml = `<a href="${sub.fileUrl}" target="_blank" class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 font-bold">확인</a>`;
                    }

                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-slate-50 border-b";
                    tr.innerHTML = `
                        <td class="p-3 font-medium text-slate-700">${student.name}</td>
                        <td class="p-3 font-bold ${isDone ? 'text-green-600' : 'text-red-500'}">
                            ${isDone ? '완료' : '미완료'}
                        </td>
                        <td class="p-3 text-xs text-slate-500">${date}</td>
                        <td class="p-3 text-center">${checkHtml}</td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            if (!hasStudent) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">이 반에 등록된 학생이 없습니다.</td></tr>';
            }

        } catch (e) {
            console.error(e);
            el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">데이터 로딩 오류</td></tr>';
        }
    },

    async openModal(mode) {
        const el = (id) => document.getElementById(this.elements[id]);
        const modal = el('modal');
        const titleEl = el('modalTitle');

        if (!modal) return;

        const isEdit = mode === 'edit';
        if (titleEl) titleEl.textContent = isEdit ? '숙제 수정' : '새 숙제 등록';
        
        await this.loadSubjects();

        if (isEdit && this.state.editingHomework) {
            const hw = this.state.editingHomework;
            el('titleInput').value = hw.title;
            el('pagesInput').value = hw.pages || '';
            el('dueDateInput').value = hw.dueDate || '';
            
            const subjSelect = el('subjectSelect');
            if (hw.subjectId && subjSelect) {
                subjSelect.value = hw.subjectId;
                await this.handleSubjectChange(hw.subjectId);
                el('textbookSelect').value = hw.textbookId || '';
            }
        } else {
            el('titleInput').value = '';
            el('pagesInput').value = '';
            el('dueDateInput').value = '';
            if(el('subjectSelect')) el('subjectSelect').value = '';
            if(el('textbookSelect')) {
                el('textbookSelect').innerHTML = '<option value="">교재 선택</option>';
                el('textbookSelect').disabled = true;
            }
            this.state.editingHomework = null;
        }

        modal.style.display = 'flex';
        modal.classList.remove('hidden');
    },

    closeModal() {
        const modal = document.getElementById(this.elements.modal);
        if(modal) {
            modal.style.display = 'none';
            modal.classList.add('hidden');
        }
        this.state.editingHomework = null;
    },

    async loadSubjects() {
        const select = document.getElementById(this.elements.subjectSelect);
        if (!select) return;

        select.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, 'subjects'), orderBy('name'));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">과목 선택</option>';
            snap.forEach(doc => {
                select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
        } catch (e) {
            select.innerHTML = '<option>로드 실패</option>';
        }
    },

    async handleSubjectChange(subjectId) {
        const select = document.getElementById(this.elements.textbookSelect);
        if(!select) return;

        select.innerHTML = '<option value="">로딩 중...</option>';
        select.disabled = true;
        
        if (!subjectId) {
            select.innerHTML = '<option value="">교재 선택</option>';
            return;
        }

        try {
            const q = query(collection(db, 'textbooks'), where('subjectId', '==', subjectId));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">교재 선택</option>';
            snap.forEach(doc => {
                select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`;
            });
            select.disabled = false;
        } catch (e) {
            select.innerHTML = '<option>로드 실패</option>';
        }
    },

    async saveHomework() {
        const el = (id) => document.getElementById(this.elements[id]);
        
        const classId = this.state.selectedClassId;
        if (!classId) { showToast("반이 선택되지 않았습니다."); return; }

        const title = el('titleInput')?.value;
        const subjectId = el('subjectSelect')?.value;
        const textbookId = el('textbookSelect')?.value;
        const pages = el('pagesInput')?.value;
        const dueDate = el('dueDateInput')?.value;

        if (!title || !subjectId) {
            showToast("제목과 과목은 필수입니다.", true);
            return;
        }

        const data = {
            classId, title, subjectId, textbookId, pages, dueDate,
            updatedAt: serverTimestamp()
        };

        try {
            if (this.state.editingHomework) {
                await updateDoc(doc(db, 'homeworks', this.state.editingHomework.id), data);
                showToast("수정되었습니다.", false);
            } else {
                data.createdAt = serverTimestamp();
                data.submissions = {};
                await addDoc(collection(db, 'homeworks'), data);
                showToast("등록되었습니다.", false);
            }
            this.closeModal();
            this.loadHomeworkList(classId);
        } catch (e) {
            showToast("저장 실패", true);
        }
    },

    async deleteHomework() {
        if (!this.state.selectedHomeworkId) return;
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            await deleteDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
            showToast("삭제되었습니다.", false);
            this.loadHomeworkList(this.state.selectedClassId);
            
            const el = (id) => document.getElementById(this.elements[id]);
            if(el('homeworkContent')) el('homeworkContent').style.display = 'none';
            if(el('placeholder')) el('placeholder').style.display = 'flex';
            if(el('mgmtButtons')) el('mgmtButtons').style.display = 'none';
        } catch (e) {
            showToast("삭제 실패", true);
        }
    }
};