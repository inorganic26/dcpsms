// src/admin/adminHomeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { homeworkManagerHelper } from "../shared/homeworkManager.js";

export const adminHomeworkDashboard = {
    elements: {},
    state: {
        selectedClassId: null,
        selectedHomeworkId: null,
        editingHomework: null,
        cachedHomeworkData: null,
        cachedSubmissions: {},
        cachedStudents: [],
    },
    unsubHomework: null,
    unsubSubmissions: null,

    init(app) {
        this.app = app;
        this.cacheElements();
        this.addEventListeners();
        this.populateClassSelect(); 
    },

    cacheElements() {
        this.elements = {
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
            
            classSelect: document.getElementById('admin-homework-class-select'),
            homeworkMainContent: document.getElementById('admin-homework-main-content'),
            homeworkListSelect: document.getElementById('admin-homework-select'),
            homeworkContent: document.getElementById('admin-homework-content'),
            homeworkTableBody: document.getElementById('admin-homework-table-body'),
            selectedHomeworkTitle: document.getElementById('admin-selected-homework-title'),
            mgmtButtons: document.getElementById('admin-homework-management-buttons'),
            editBtn: document.getElementById('admin-edit-homework-btn'),
            deleteBtn: document.getElementById('admin-delete-homework-btn'),
            placeholder: document.getElementById('admin-homework-placeholder'),
            assignBtn: document.getElementById('admin-assign-homework-btn'),
        };
    },

    addEventListeners() {
        this.elements.classSelect?.addEventListener('change', (e) => this.handleClassChange(e.target.value));
        this.elements.homeworkListSelect?.addEventListener('change', (e) => this.loadHomeworkDetails(e.target.value));
        this.elements.assignBtn?.addEventListener('click', () => this.openModal('create'));
        this.elements.saveBtn?.addEventListener('click', () => this.saveHomework());
        this.elements.closeBtn?.addEventListener('click', () => this.closeModal());
        this.elements.cancelBtn?.addEventListener('click', () => this.closeModal());
        this.elements.editBtn?.addEventListener('click', () => this.openModal('edit'));
        this.elements.deleteBtn?.addEventListener('click', () => this.deleteHomework());
        this.elements.subjectSelect?.addEventListener('change', (e) => this.handleSubjectChange(e.target.value));
    },

    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, 'classes'), orderBy('name'));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">-- 반 선택 --</option>';
            snap.forEach(doc => select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
        } catch (e) {
            console.error(e);
            select.innerHTML = '<option value="">로드 실패</option>';
        }
    },

    handleClassChange(classId) {
        this.state.selectedClassId = classId;
        this.state.selectedHomeworkId = null;
        
        if (classId) {
            if(this.elements.homeworkMainContent) this.elements.homeworkMainContent.style.display = 'block';
            this.loadHomeworkList(classId);
        } else {
            if(this.elements.homeworkMainContent) this.elements.homeworkMainContent.style.display = 'none';
        }
        
        if(this.elements.homeworkContent) this.elements.homeworkContent.style.display = 'none';
        if(this.elements.placeholder) this.elements.placeholder.style.display = 'flex';
        if(this.elements.mgmtButtons) this.elements.mgmtButtons.style.display = 'none';

        this.clearListeners();
    },

    clearListeners() {
        if (this.unsubHomework) { this.unsubHomework(); this.unsubHomework = null; }
        if (this.unsubSubmissions) { this.unsubSubmissions(); this.unsubSubmissions = null; }
    },

    async loadHomeworkList(classId) {
        const select = this.elements.homeworkListSelect;
        if (!select) return;
        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
            if (snap.empty) {
                select.innerHTML += '<option disabled>(등록된 숙제 없음)</option>';
            } else {
                snap.forEach(doc => {
                    const data = doc.data();
                    select.innerHTML += `<option value="${doc.id}">${data.title || "(제목 없음)"}</option>`;
                });
            }
        } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
    },

    async loadHomeworkDetails(homeworkId) {
        if (!homeworkId) return;
        this.clearListeners();

        this.state.selectedHomeworkId = homeworkId;
        this.state.cachedHomeworkData = null;
        this.state.cachedSubmissions = {};
        this.state.cachedStudents = [];

        this.elements.homeworkContent.style.display = 'flex';
        this.elements.homeworkContent.classList.remove('hidden');
        this.elements.placeholder.style.display = 'none';
        this.elements.mgmtButtons.style.display = 'flex';
        this.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">데이터를 불러오는 중...</td></tr>';

        // 학생 목록 로드
        try {
            const studentsSnap = await getDocs(collection(db, 'students'));
            this.state.cachedStudents = studentsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e) { console.error("학생 목록 로드 실패", e); }

        // 숙제 정보 리스너
        this.unsubHomework = onSnapshot(doc(db, 'homeworks', homeworkId), (docSnap) => {
            if (!docSnap.exists()) {
                this.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">숙제가 삭제되었습니다.</td></tr>';
                return;
            }
            const hwData = docSnap.data();
            this.state.editingHomework = { id: homeworkId, ...hwData };
            this.state.cachedHomeworkData = hwData;
            this.elements.selectedHomeworkTitle.textContent = hwData.title || "(제목 없음)";
            this.renderHomeworkTable();
        });

        // 제출 현황 리스너
        const subColRef = collection(db, 'homeworks', homeworkId, 'submissions');
        this.unsubSubmissions = onSnapshot(subColRef, (snapshot) => {
            const submissions = {};
            snapshot.forEach(doc => submissions[doc.id] = doc.data());
            this.state.cachedSubmissions = submissions;
            this.renderHomeworkTable();
        });
    },

    renderHomeworkTable() {
        const { cachedHomeworkData: hwData, cachedSubmissions: newSubmissions, cachedStudents: students, selectedClassId: currentClassId } = this.state;
        if (!hwData || !students.length) return;

        const oldSubmissions = hwData.submissions || {}; // Fallback
        const tbody = this.elements.homeworkTableBody;
        const className = this.elements.classSelect.options[this.elements.classSelect.selectedIndex].text;

        tbody.innerHTML = '';
        let hasStudent = false;

        students.forEach(student => {
            let isInClass = student.classId === currentClassId;
            if (student.classIds && Array.isArray(student.classIds)) {
                if (student.classIds.includes(currentClassId)) isInClass = true;
            }

            if (isInClass) {
                hasStudent = true;
                const sub = newSubmissions[student.id] || oldSubmissions[student.id];
                const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
                const statusInfo = homeworkManagerHelper.calculateStatus(sub, hwData);
                const buttonHtml = homeworkManagerHelper.renderFileButtons(sub, className);

                let actionBtn = (sub && !sub.manualComplete) ? `
                    <button class="admin-force-complete-btn ml-2 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition" 
                            data-student-id="${student.id}" title="강제 완료 처리">✅ 확인</button>` : '';

                tbody.innerHTML += `
                    <tr class="hover:bg-slate-50 border-b">
                        <td class="p-3 font-medium text-slate-700">${student.name}</td>
                        <td class="p-3 ${statusInfo.color}">${statusInfo.text} ${actionBtn}</td>
                        <td class="p-3 text-xs text-slate-500">${date}</td>
                        <td class="p-3 text-center"><div>${buttonHtml}</div></td>
                    </tr>`;
            }
        });

        tbody.querySelectorAll('.admin-force-complete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.forceCompleteHomework(this.state.selectedHomeworkId, e.target.dataset.studentId));
        });

        if (!hasStudent) tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">이 반에 등록된 학생이 없습니다.</td></tr>';
    },

    async forceCompleteHomework(homeworkId, studentId) {
        if (!confirm("페이지 수가 부족해도 '완료' 상태로 변경하시겠습니까?")) return;
        try {
            await setDoc(doc(db, 'homeworks', homeworkId, 'submissions', studentId), {
                studentDocId: studentId, manualComplete: true, status: 'completed', updatedAt: serverTimestamp()
            }, { merge: true });
            showToast("완료 처리되었습니다.", false);
        } catch (e) { console.error(e); showToast("처리 실패", true); }
    },

    async openModal(mode) {
        const isEdit = mode === 'edit';
        this.elements.modalTitle.textContent = isEdit ? '숙제 수정' : '새 숙제 등록';
        await this.loadSubjects();

        if (isEdit && this.state.editingHomework) {
            const hw = this.state.editingHomework;
            this.elements.titleInput.value = hw.title;
            this.elements.pagesInput.value = hw.pages || '';
            if(this.elements.totalPagesInput) this.elements.totalPagesInput.value = hw.totalPages || '';
            this.elements.dueDateInput.value = hw.dueDate || '';
            
            if (hw.subjectId) {
                this.elements.subjectSelect.value = hw.subjectId;
                await this.handleSubjectChange(hw.subjectId);
                this.elements.textbookSelect.value = hw.textbookId || '';
            }
        } else {
            this.elements.titleInput.value = '';
            this.elements.pagesInput.value = '';
            if(this.elements.totalPagesInput) this.elements.totalPagesInput.value = '';
            this.elements.dueDateInput.value = '';
            this.elements.subjectSelect.value = '';
            this.elements.textbookSelect.innerHTML = '<option value="">교재 선택</option>';
            this.elements.textbookSelect.disabled = true;
            this.state.editingHomework = null;
        }
        this.elements.modal.style.display = 'flex';
    },

    closeModal() {
        this.elements.modal.style.display = 'none';
        this.state.editingHomework = null;
    },

    async loadSubjects() {
        const select = this.elements.subjectSelect;
        select.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const snap = await getDocs(query(collection(db, 'subjects'), orderBy('name')));
            select.innerHTML = '<option value="">-- 과목 선택 --</option>';
            snap.forEach(doc => select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
        } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
    },

    async handleSubjectChange(subjectId) {
        const select = this.elements.textbookSelect;
        select.innerHTML = '<option value="">로딩 중...</option>';
        select.disabled = true;
        if (!subjectId) { select.innerHTML = '<option value="">교재 선택</option>'; return; }

        try {
            const q = query(collection(db, 'textbooks'), where('subjectId', '==', subjectId));
            const snap = await getDocs(q);
            select.innerHTML = '<option value="">-- 교재 선택 --</option>';
            snap.forEach(doc => select.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            select.disabled = false;
        } catch (e) { select.innerHTML = '<option>로드 실패</option>'; }
    },

    async saveHomework() {
        const classId = this.state.selectedClassId;
        if (!classId) { showToast("반이 선택되지 않았습니다."); return; }

        const data = {
            classId,
            title: this.elements.titleInput.value,
            subjectId: this.elements.subjectSelect.value,
            textbookId: this.elements.textbookSelect.value,
            pages: this.elements.pagesInput.value,
            dueDate: this.elements.dueDateInput.value,
            totalPages: Number(this.elements.totalPagesInput?.value) || 0,
            updatedAt: serverTimestamp()
        };

        if (!data.title || !data.subjectId) { showToast("제목과 과목은 필수입니다.", true); return; }

        try {
            if (this.state.editingHomework) {
                await updateDoc(doc(db, 'homeworks', this.state.editingHomework.id), data);
                showToast("수정되었습니다.");
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, 'homeworks'), data);
                showToast("등록되었습니다.");
            }
            this.closeModal();
            this.loadHomeworkList(classId);
        } catch (e) { showToast("저장 실패", true); }
    },

    async deleteHomework() {
        if (!this.state.selectedHomeworkId || !confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
            showToast("삭제되었습니다.");
            this.loadHomeworkList(this.state.selectedClassId);
            this.elements.homeworkContent.style.display = 'none';
            this.elements.placeholder.style.display = 'flex';
            this.elements.mgmtButtons.style.display = 'none';
        } catch (e) { showToast("삭제 실패", true); }
    }
};