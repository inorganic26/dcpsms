// src/teacher/homeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { homeworkManagerHelper } from "../shared/homeworkManager.js";

export const homeworkDashboard = {
    managerInstance: null,
    unsubHomework: null,
    unsubSubmissions: null,

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
        cachedHomeworkData: null,
        cachedSubmissions: {},
    },

    init(app) {
        this.app = app;
        this.managerInstance = this;
        this.addEventListeners();
    },

    refresh() {
        this.state.selectedClassId = this.app.state.selectedClassId;
        this.resetUIState();
        this.populateHomeworkSelect();
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
    },

    resetUIState() {
        this.clearListeners();
        const el = (id) => document.getElementById(this.config.elements[id]);
        if(el('homeworkContent')) el('homeworkContent').style.display = 'none';
        if(el('homeworkManagementButtons')) el('homeworkManagementButtons').style.display = 'none';
        if(el('homeworkSelect')) el('homeworkSelect').innerHTML = '<option value="">-- 숙제 선택 --</option>';
    },

    clearListeners() {
        if (this.unsubHomework) { this.unsubHomework(); this.unsubHomework = null; }
        if (this.unsubSubmissions) { this.unsubSubmissions(); this.unsubSubmissions = null; }
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
            select.innerHTML = '<option>목록 로드 실패</option>';
        }
    },

    loadHomeworkDetails(homeworkId) {
        if (!homeworkId) return;
        this.clearListeners();

        this.state.selectedHomeworkId = homeworkId;
        this.state.cachedHomeworkData = null;
        this.state.cachedSubmissions = {};

        const el = (id) => document.getElementById(this.config.elements[id]);
        
        el('homeworkContent').style.display = 'block';
        el('homeworkManagementButtons').style.display = 'flex';
        el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center">데이터 연결 중...</td></tr>';

        // 1. 숙제 문서 리스너
        this.unsubHomework = onSnapshot(doc(db, 'homeworks', homeworkId), (docSnap) => {
            if (!docSnap.exists()) {
                el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">삭제된 숙제입니다.</td></tr>';
                return;
            }
            const hwData = docSnap.data();
            this.state.editingHomework = { id: homeworkId, ...hwData };
            this.state.cachedHomeworkData = hwData;
            el('selectedHomeworkTitle').textContent = hwData.title;
            
            this.renderHomeworkTable();
        }, (error) => {
            console.error(error);
            el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">연결 끊김</td></tr>';
        });

        // 2. [변경] 서브컬렉션 리스너
        const subColRef = collection(db, 'homeworks', homeworkId, 'submissions');
        this.unsubSubmissions = onSnapshot(subColRef, (snapshot) => {
            const submissions = {};
            snapshot.forEach(doc => {
                submissions[doc.id] = doc.data();
            });
            this.state.cachedSubmissions = submissions;
            this.renderHomeworkTable();
        });
    },

    renderHomeworkTable() {
        const hwData = this.state.cachedHomeworkData;
        const submissions = this.state.cachedSubmissions;
        const studentsInClass = this.app.state.studentsInClass;
        
        if (!hwData || !studentsInClass) return;

        const el = (id) => document.getElementById(this.config.elements[id]);
        const tbody = el('homeworkTableBody');
        tbody.innerHTML = '';

        if (studentsInClass.size === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">등록된 학생이 없습니다.</td></tr>';
            return;
        }

        const sortedStudents = Array.from(studentsInClass.entries()).sort((a, b) => a[1].localeCompare(b[1]));

        sortedStudents.forEach(([id, name]) => {
            const sub = submissions[id]; // 서브컬렉션에서 찾기
            const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
            const statusInfo = homeworkManagerHelper.calculateStatus(sub, hwData);
            const buttonHtml = homeworkManagerHelper.renderFileButtons(sub, '반'); 

            let actionBtn = '';
            if (sub && !sub.manualComplete) {
                actionBtn = `<button class="teacher-force-complete-btn ml-2 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded" data-student-id="${id}">✅ 확인</button>`;
            }

            const tr = document.createElement('tr');
            tr.className = "border-b hover:bg-slate-50";
            tr.innerHTML = `
                <td class="py-3 px-4">${name}</td>
                <td class="py-3 px-4 ${statusInfo.color}">${statusInfo.text} ${actionBtn}</td>
                <td class="py-3 px-4 text-xs text-slate-500">
                    <div class="mb-1">${date}</div>
                    <div>${buttonHtml}</div>
                </td>`;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.teacher-force-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.forceCompleteHomework(this.state.selectedHomeworkId, e.target.dataset.studentId));
        });
    },

    async forceCompleteHomework(homeworkId, studentId) {
        if (!confirm("완료 처리하시겠습니까?")) return;
        try {
            // [변경] 서브컬렉션 setDoc 사용
            const subRef = doc(db, 'homeworks', homeworkId, 'submissions', studentId);
            await setDoc(subRef, {
                studentDocId: studentId,
                manualComplete: true,
                status: 'completed',
                updatedAt: serverTimestamp()
            }, { merge: true });
            
            showToast("완료 처리됨");
        } catch (e) { 
            console.error(e);
            showToast("실패", true); 
        }
    },
    
    async openModal(mode) {
        const el = (id) => document.getElementById(this.config.elements[id]);
        const modal = el('modal');
        if (!modal) return;
        
        const isEdit = mode === 'edit';
        el('modalTitle').textContent = isEdit ? '숙제 수정' : '새 숙제 출제';
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
        subjects.forEach(sub => select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`);
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
            snap.forEach(doc => select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            select.disabled = false;
        } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
    },

    async saveHomework() {
        const el = (id) => document.getElementById(this.config.elements[id]);
        const classId = this.app.state.selectedClassId;
        if (!classId) { showToast("반 선택 필요"); return; }
        
        const title = el('titleInput').value;
        const subjectId = el('subjectSelect').value;
        const textbookId = el('textbookSelect').value;
        const pages = el('pagesInput').value;
        const dueDate = el('dueDateInput').value;
        const totalPages = el('totalPagesInput') ? Number(el('totalPagesInput').value) : 0;

        if (!title || !subjectId) { showToast("제목/과목 필수", true); return; }

        const data = { classId, title, subjectId, textbookId, pages, dueDate, totalPages, updatedAt: serverTimestamp() };

        try {
            if (this.state.editingHomework) {
                await updateDoc(doc(db, 'homeworks', this.state.editingHomework.id), data);
                showToast("수정됨");
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, 'homeworks'), data);
                showToast("출제됨");
            }
            this.closeModal();
            this.populateHomeworkSelect(); 
        } catch (e) { showToast("실패", true); }
    },

    async deleteHomework() {
        if (!this.state.selectedHomeworkId || !confirm("삭제?")) return;
        try {
            await deleteDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
            showToast("삭제됨");
            this.resetUIState();
            this.populateHomeworkSelect();
        } catch (e) { showToast("실패", true); }
    }
};