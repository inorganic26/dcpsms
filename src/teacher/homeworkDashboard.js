// src/teacher/homeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, getDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const homeworkDashboard = {
    managerInstance: null, // TeacherApp에서 접근 가능하도록

    // 선생님 앱용 HTML ID 매핑
    config: {
        elements: {
            modal: 'teacher-assign-homework-modal',
            modalTitle: 'teacher-homework-modal-title', // ✨ 선생님 앱 ID
            titleInput: 'teacher-homework-title',
            subjectSelect: 'teacher-homework-subject-select',
            textbookSelect: 'teacher-homework-textbook-select',
            pagesInput: 'teacher-homework-pages',
            dueDateInput: 'teacher-homework-due-date',
            
            saveBtn: 'teacher-save-homework-btn',
            closeBtn: 'teacher-close-homework-modal-btn',
            cancelBtn: 'teacher-cancel-homework-btn',
            
            // Dashboard controls
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
        this.managerInstance = this; // Self reference
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
        
        // 반 변경 감지 (TeacherApp에서 이벤트 발생시킴)
        document.addEventListener('class-changed', () => {
            this.state.selectedClassId = this.app.state.selectedClassId;
            this.resetUIState();
            this.populateHomeworkSelect();
        });
    },

    resetUIState() {
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

    async loadHomeworkDetails(homeworkId) {
        if (!homeworkId) return;
        this.state.selectedHomeworkId = homeworkId;
        
        const el = (id) => document.getElementById(this.config.elements[id]);
        
        el('homeworkContent').style.display = 'block';
        el('homeworkContent').classList.remove('hidden'); // Tailwind hidden 제거
        
        el('homeworkManagementButtons').style.display = 'flex';
        el('homeworkManagementButtons').classList.remove('hidden');

        el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center">로딩 중...</td></tr>';

        try {
            const docRef = doc(db, 'homeworks', homeworkId);
            const docSnap = await getDoc(docRef);
            
            if (!docSnap.exists()) return;
            const hwData = docSnap.data();
            this.state.editingHomework = { id: homeworkId, ...hwData };
            
            el('selectedHomeworkTitle').textContent = hwData.title;

            // 학생 데이터 로드 (현재 반 학생들)
            // TeacherApp의 state에 이미 학생 정보가 있다면 활용 가능
            const studentsInClass = this.app.state.studentsInClass; // Map(id -> name)
            const submissions = hwData.submissions || {};
            
            const tbody = el('homeworkTableBody');
            tbody.innerHTML = '';

            if (studentsInClass.size === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">학생이 없습니다.</td></tr>';
                return;
            }

            studentsInClass.forEach((name, id) => {
                const sub = submissions[id];
                const isDone = sub && sub.status === 'completed';
                const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
                
                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50";
                tr.innerHTML = `
                    <td class="py-3 px-4">${name}</td>
                    <td class="py-3 px-4 font-bold ${isDone ? 'text-green-600' : 'text-red-500'}">
                        ${isDone ? '완료' : '미완료'}
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-500">${date}</td>
                `;
                tbody.appendChild(tr);
            });

        } catch (e) {
            console.error(e);
            el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">오류 발생</td></tr>';
        }
    },

    // --- Modal Functions ---
    async openModal(mode) {
        const el = (id) => document.getElementById(this.config.elements[id]);
        const modal = el('modal');
        const titleEl = el('modalTitle');

        if (!modal || !titleEl) {
            console.error("Homework modal elements missing");
            return;
        }

        const isEdit = mode === 'edit';
        titleEl.textContent = isEdit ? '숙제 수정' : '새 숙제 출제';
        
        await this.populateSubjectsForHomeworkModal();

        if (isEdit && this.state.editingHomework) {
            const hw = this.state.editingHomework;
            el('titleInput').value = hw.title;
            el('pagesInput').value = hw.pages || '';
            el('dueDateInput').value = hw.dueDate || '';
            
            if (hw.subjectId) {
                el('subjectSelect').value = hw.subjectId;
                await this.handleSubjectChange(hw.subjectId);
                el('textbookSelect').value = hw.textbookId || '';
            }
        } else {
            el('titleInput').value = '';
            el('pagesInput').value = '';
            el('dueDateInput').value = '';
            el('subjectSelect').value = '';
            el('textbookSelect').innerHTML = '<option value="">교재 선택</option>';
            el('textbookSelect').disabled = true;
            this.state.editingHomework = null;
        }

        modal.style.display = 'flex'; // Show modal
    },

    closeModal() {
        const modal = document.getElementById(this.config.elements.modal);
        if(modal) modal.style.display = 'none';
        this.state.editingHomework = null;
    },

    async populateSubjectsForHomeworkModal() {
        const select = document.getElementById(this.config.elements.subjectSelect);
        const subjects = this.app.state.subjects || []; // TeacherApp has cached subjects
        
        select.innerHTML = '<option value="">과목 선택</option>';
        subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
    },

    async handleSubjectChange(subjectId) {
        const select = document.getElementById(this.config.elements.textbookSelect);
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
            console.error(e);
            select.innerHTML = '<option>로드 실패</option>';
        }
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
                showToast("출제되었습니다.", false);
            }
            this.closeModal();
            this.populateHomeworkSelect(); // 리스트 갱신
        } catch (e) {
            console.error(e);
            showToast("저장 실패", true);
        }
    },

    async deleteHomework() {
        if (!this.state.selectedHomeworkId) return;
        if (!confirm("정말 삭제하시겠습니까?")) return;

        try {
            await deleteDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
            showToast("삭제되었습니다.", false);
            this.resetUIState();
            this.populateHomeworkSelect();
        } catch (e) {
            showToast("삭제 실패", true);
        }
    }
};