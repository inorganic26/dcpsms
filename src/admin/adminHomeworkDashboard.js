// src/admin/adminHomeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { homeworkManagerHelper } from "../shared/homeworkManager.js";

export const adminHomeworkDashboard = {
    elements: {
        modal: 'admin-assign-homework-modal',
        modalTitle: 'admin-homework-modal-title',
        titleInput: 'admin-homework-title',
        subjectSelect: 'admin-homework-subject-select',
        textbookSelect: 'admin-homework-textbook-select',
        pagesInput: 'admin-homework-pages',
        totalPagesInput: 'admin-homework-total-pages',
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

    unsubscribe: null,

    init(app) {
        this.app = app;
        this.addEventListeners();
        this.populateClassSelect(); 
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
            if(mainContent) mainContent.style.display = 'block';
            this.loadHomeworkList(classId);
        } else {
            if(mainContent) mainContent.style.display = 'none';
        }
        
        const el = (id) => document.getElementById(this.elements[id]);
        if(el('homeworkContent')) el('homeworkContent').style.display = 'none';
        if(el('placeholder')) el('placeholder').style.display = 'flex';
        if(el('mgmtButtons')) el('mgmtButtons').style.display = 'none';

        if(this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; }
    },

    async loadHomeworkList(classId) {
        const select = document.getElementById(this.elements.homeworkListSelect);
        if (!select) return;
        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            select.innerHTML = ''; 
            if (snap.empty) {
                select.innerHTML = '<option disabled>(등록된 숙제 없음)</option>';
            } else {
                select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
                snap.forEach(doc => {
                    const data = doc.data();
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.text = data.title ? data.title : "(제목 없음)";
                    select.add(opt);
                });
            }
        } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
    },

    async loadHomeworkDetails(homeworkId) {
        if (!homeworkId) return;
        if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; }

        this.state.selectedHomeworkId = homeworkId;
        const currentClassId = this.state.selectedClassId;
        
        const el = (id) => document.getElementById(this.elements[id]);
        el('homeworkContent').style.display = 'flex';
        el('homeworkContent').classList.remove('hidden');
        el('placeholder').style.display = 'none';
        el('mgmtButtons').style.display = 'flex';
        el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center">로딩 중...</td></tr>';

        const classSelect = document.getElementById(this.elements.classSelect);
        const className = classSelect && classSelect.selectedIndex > -1 ? classSelect.options[classSelect.selectedIndex].text : '반';

        this.unsubscribe = onSnapshot(doc(db, 'homeworks', homeworkId), async (docSnap) => {
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
                } else if (student.classId === currentClassId) { isInClass = true; }

                if (isInClass) {
                    hasStudent = true;
                    const sub = submissions[sDoc.id];
                    const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
                    
                    const statusInfo = homeworkManagerHelper.calculateStatus(sub, hwData);
                    const buttonHtml = homeworkManagerHelper.renderFileButtons(sub, className);

                    let actionBtn = '';
                    if (sub && !sub.manualComplete) {
                        actionBtn = `
                            <button class="admin-force-complete-btn ml-2 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition" 
                                    data-student-id="${sDoc.id}" title="페이지 수가 부족해도 완료로 처리합니다">
                                ✅ 확인
                            </button>
                        `;
                    }

                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-slate-50 border-b";
                    tr.innerHTML = `
                        <td class="p-3 font-medium text-slate-700">${student.name}</td>
                        <td class="p-3 ${statusInfo.color}">
                            ${statusInfo.text}
                            ${actionBtn}
                        </td>
                        <td class="p-3 text-xs text-slate-500">${date}</td>
                        <td class="p-3 text-center">
                            <div>${buttonHtml}</div>
                        </td>
                    `;
                    tbody.appendChild(tr);
                }
            });

            // 관리자 버튼 이벤트 위임
            tbody.querySelectorAll('.admin-force-complete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sId = e.target.dataset.studentId;
                    this.forceCompleteHomework(homeworkId, sId);
                });
            });

            if (!hasStudent) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">이 반에 등록된 학생이 없습니다.</td></tr>';
            }
        });
    },

    async forceCompleteHomework(homeworkId, studentId) {
        if (!confirm("페이지 수가 부족해도 '완료' 상태로 변경하시겠습니까?")) return;
        try {
            await updateDoc(doc(db, 'homeworks', homeworkId), {
                [`submissions.${studentId}.manualComplete`]: true,
                [`submissions.${studentId}.status`]: 'completed'
            });
            showToast("완료 처리되었습니다.", false);
        } catch (e) {
            console.error(e);
            showToast("처리 실패", true);
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
            if(el('totalPagesInput')) el('totalPagesInput').value = hw.totalPages || '';
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
            if(el('totalPagesInput')) el('totalPagesInput').value = '';
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
        if(modal) { modal.style.display = 'none'; modal.classList.add('hidden'); }
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
            snap.forEach(doc => { select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`; });
        } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
    },

    async handleSubjectChange(subjectId) {
        const select = document.getElementById(this.elements.textbookSelect);
        if(!select) return;
        select.innerHTML = '<option value="">로딩 중...</option>';
        select.disabled = true;
        if (!subjectId) { select.innerHTML = '<option value="">교재 선택</option>'; return; }

        try {
            const q = query(collection(db, 'textbooks'), where('subjectId', '==', subjectId));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">교재 선택</option>';
            snap.forEach(doc => { select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`; });
            select.disabled = false;
        } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
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
        const totalPages = el('totalPagesInput') ? Number(el('totalPagesInput').value) : 0;

        if (!title || !subjectId) { showToast("제목과 과목은 필수입니다.", true); return; }

        const data = {
            classId, title, subjectId, textbookId, pages, dueDate,
            totalPages,
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
        } catch (e) { showToast("저장 실패", true); }
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
        } catch (e) { showToast("삭제 실패", true); }
    }
};