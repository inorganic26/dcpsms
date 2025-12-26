// src/teacher/homeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { homeworkManagerHelper } from "../shared/homeworkManager.js";

export const homeworkDashboard = {
    managerInstance: null,
    unsubscribe: null,

    config: {
        elements: {
            modal: 'teacher-assign-homework-modal',
            modalTitle: 'teacher-homework-modal-title',
            titleInput: 'teacher-homework-title',
            subjectSelect: 'teacher-homework-subject-select',
            textbookSelect: 'teacher-homework-textbook-select',
            pagesInput: 'teacher-homework-pages',
            totalPagesInput: 'teacher-homework-total-pages', 
            dueDateInput: 'teacher-homework-due-date',
            
            saveBtn: 'teacher-save-homework-btn',
            closeBtn: 'teacher-close-homework-modal-btn',
            cancelBtn: 'teacher-cancel-homework-btn',
            
            homeworkSelect: 'teacher-homework-select',
            assignBtn: 'teacher-assign-homework-btn',
            
            homeworkContent: 'teacher-homework-content',
            homeworkTableBody: 'teacher-homework-table-body',
            selectedHomeworkTitle: 'teacher-selected-homework-title',
            
            homeworkManagementButtons: 'teacher-homework-management-buttons',
            editBtn: 'teacher-edit-homework-btn',
            deleteBtn: 'teacher-delete-homework-btn',
        }
    },

    state: {
        selectedClassId: null,
        selectedHomeworkId: null,
        editingHomework: null,
    },

    init(app) {
        this.app = app;
        this.managerInstance = this;
        this.addEventListeners();
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.config.elements[id]);

        el('homeworkSelect')?.addEventListener('change', (e) => this.loadHomeworkDetails(e.target.value));
        el('assignBtn')?.addEventListener('click', () => this.openModal('create'));
        
        el('saveBtn')?.addEventListener('click', () => this.saveHomework());
        el('closeBtn')?.addEventListener('click', () => this.closeModal());
        el('cancelBtn')?.addEventListener('click', () => this.closeModal());
        
        el('editBtn')?.addEventListener('click', () => this.openModal('edit'));
        el('deleteBtn')?.addEventListener('click', () => this.deleteHomework());

        el('subjectSelect')?.addEventListener('change', (e) => this.handleSubjectChange(e.target.value));
        
        document.addEventListener('class-changed', () => {
            this.state.selectedClassId = this.app.state.selectedClassId;
            this.resetUIState();
            this.populateHomeworkSelect();
        });
    },

    resetUIState() {
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        const el = (id) => document.getElementById(this.config.elements[id]);
        if(el('homeworkContent')) el('homeworkContent').style.display = 'none';
        if(el('homeworkManagementButtons')) el('homeworkManagementButtons').style.display = 'none';
        if(el('homeworkSelect')) el('homeworkSelect').innerHTML = '<option value="">-- 숙제 선택 --</option>';
    },

    async populateHomeworkSelect() {
        const select = document.getElementById(this.config.elements.homeworkSelect);
        const classId = this.app.state.selectedClassId;
        
        if (!select || !classId) return;

        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            
            select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
            if (snap.empty) {
                select.innerHTML += '<option disabled>등록된 숙제가 없습니다.</option>';
            } else {
                snap.forEach(doc => {
                    select.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`;
                });
            }
        } catch (e) {
            console.error(e);
            select.innerHTML = '<option>로드 실패</option>';
        }
    },

    loadHomeworkDetails(homeworkId) {
        if (!homeworkId) return;
        
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        this.state.selectedHomeworkId = homeworkId;
        
        const el = (id) => document.getElementById(this.config.elements[id]);
        
        el('homeworkContent').style.display = 'block';
        el('homeworkContent').classList.remove('hidden');
        el('homeworkManagementButtons').style.display = 'flex';
        el('homeworkManagementButtons').classList.remove('hidden');
        el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center">데이터 연결 중...</td></tr>';

        const docRef = doc(db, 'homeworks', homeworkId);
        const classSelect = document.getElementById('teacher-class-select');
        const className = classSelect && classSelect.selectedIndex > -1 ? classSelect.options[classSelect.selectedIndex].text : '반';

        this.unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (!docSnap.exists()) {
                el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">숙제가 삭제되었습니다.</td></tr>';
                return;
            }

            const hwData = docSnap.data();
            this.state.editingHomework = { id: homeworkId, ...hwData };
            el('selectedHomeworkTitle').textContent = hwData.title;

            const studentsInClass = this.app.state.studentsInClass; 
            const submissions = hwData.submissions || {};
            const tbody = el('homeworkTableBody');
            tbody.innerHTML = '';

            if (studentsInClass.size === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">학생이 없습니다.</td></tr>';
                return;
            }

            const sortedStudents = Array.from(studentsInClass.entries()).sort((a, b) => a[1].localeCompare(b[1]));

            sortedStudents.forEach(([id, name]) => {
                const sub = submissions[id];
                const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
                
                const statusInfo = homeworkManagerHelper.calculateStatus(sub, hwData);
                const buttonHtml = homeworkManagerHelper.renderFileButtons(sub, className);

                // ✨ [추가] 제출은 했지만 수동 완료가 아닐 때 '확인' 버튼 표시
                let actionBtn = '';
                if (sub && !sub.manualComplete) {
                    actionBtn = `
                        <button class="teacher-force-complete-btn ml-2 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition" 
                                data-student-id="${id}" title="페이지 수가 부족해도 완료로 처리합니다">
                            ✅ 확인
                        </button>
                    `;
                }

                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50 transition duration-300";
                tr.innerHTML = `
                    <td class="py-3 px-4">${name}</td>
                    <td class="py-3 px-4 ${statusInfo.color}">
                        ${statusInfo.text}
                        ${actionBtn}
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-500">
                        <div class="mb-1">${date}</div>
                        <div>${buttonHtml}</div>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // 이벤트 위임으로 버튼 클릭 처리
            tbody.querySelectorAll('.teacher-force-complete-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const sId = e.target.dataset.studentId;
                    this.forceCompleteHomework(homeworkId, sId);
                });
            });

        }, (error) => {
            console.error(error);
            el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">연결 끊김</td></tr>';
        });
    },

    // ✨ [신규] 강제 완료 처리 함수
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
        const el = (id) => document.getElementById(this.config.elements[id]);
        const modal = el('modal');
        const titleEl = el('modalTitle');

        if (!modal || !titleEl) return;

        const isEdit = mode === 'edit';
        titleEl.textContent = isEdit ? '숙제 수정' : '새 숙제 출제';
        
        await this.populateSubjectsForHomeworkModal();

        if (isEdit && this.state.editingHomework) {
            const hw = this.state.editingHomework;
            el('titleInput').value = hw.title;
            el('pagesInput').value = hw.pages || '';
            if(el('totalPagesInput')) el('totalPagesInput').value = hw.totalPages || '';
            el('dueDateInput').value = hw.dueDate || '';
            
            if (hw.subjectId) {
                el('subjectSelect').value = hw.subjectId;
                await this.handleSubjectChange(hw.subjectId);
                el('textbookSelect').value = hw.textbookId || '';
            }
        } else {
            el('titleInput').value = '';
            el('pagesInput').value = '';
            if(el('totalPagesInput')) el('totalPagesInput').value = '';
            el('dueDateInput').value = '';
            el('subjectSelect').value = '';
            el('textbookSelect').innerHTML = '<option value="">교재 선택</option>';
            el('textbookSelect').disabled = true;
            this.state.editingHomework = null;
        }

        modal.style.display = 'flex';
    },

    closeModal() {
        const modal = document.getElementById(this.config.elements.modal);
        if(modal) modal.style.display = 'none';
        this.state.editingHomework = null;
    },

    async populateSubjectsForHomeworkModal() {
        const select = document.getElementById(this.config.elements.subjectSelect);
        const subjects = this.app.state.subjects || [];
        select.innerHTML = '<option value="">과목 선택</option>';
        subjects.forEach(sub => { select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`; });
    },

    async handleSubjectChange(subjectId) {
        const select = document.getElementById(this.config.elements.textbookSelect);
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
        const el = (id) => document.getElementById(this.config.elements[id]);
        
        const classId = this.app.state.selectedClassId;
        if (!classId) { showToast("반이 선택되지 않았습니다."); return; }

        const title = el('titleInput').value;
        const subjectId = el('subjectSelect').value;
        const textbookId = el('textbookSelect').value;
        const pages = el('pagesInput').value;
        const dueDate = el('dueDateInput').value;
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
                showToast("출제되었습니다.", false);
            }
            this.closeModal();
            this.populateHomeworkSelect(); 
        } catch (e) { showToast("저장 실패", true); }
    },

    async deleteHomework() {
        if (!this.state.selectedHomeworkId) return;
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
            showToast("삭제되었습니다.", false);
            this.resetUIState();
            this.populateHomeworkSelect();
        } catch (e) { showToast("삭제 실패", true); }
    }
};