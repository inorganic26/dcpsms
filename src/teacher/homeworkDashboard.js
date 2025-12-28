// src/teacher/homeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { homeworkManagerHelper } from "../shared/homeworkManager.js";

export const homeworkDashboard = {
    app: null,
    elements: {},
    state: { selectedHomeworkId: null, editingHomework: null, cachedData: null, cachedSubs: {} },
    unsubs: { homework: null, subs: null },

    init(app) {
        this.app = app;
        this.elements = {
            select: document.getElementById('teacher-homework-select'),
            assignBtn: document.getElementById('teacher-assign-homework-btn'),
            
            modal: document.getElementById('teacher-assign-homework-modal'),
            modalTitle: document.getElementById('teacher-homework-modal-title'),
            titleInput: document.getElementById('teacher-homework-title'),
            subjectSelect: document.getElementById('teacher-homework-subject-select'),
            textbookSelect: document.getElementById('teacher-homework-textbook-select'),
            pagesInput: document.getElementById('teacher-homework-pages'),
            totalPagesInput: document.getElementById('teacher-homework-total-pages'),
            dueDateInput: document.getElementById('teacher-homework-due-date'),
            saveBtn: document.getElementById('teacher-save-homework-btn'),
            closeBtn: document.getElementById('teacher-close-homework-modal-btn'),
            cancelBtn: document.getElementById('teacher-cancel-homework-btn'),
            
            contentDiv: document.getElementById('teacher-homework-content'),
            tableBody: document.getElementById('teacher-homework-table-body'),
            contentTitle: document.getElementById('teacher-selected-homework-title'),
            btnsDiv: document.getElementById('teacher-homework-management-buttons'),
            editBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteBtn: document.getElementById('teacher-delete-homework-btn'),
        };
        this.addEventListeners();
    },

    addEventListeners() {
        this.elements.select?.addEventListener('change', (e) => this.loadHomeworkDetails(e.target.value));
        this.elements.assignBtn?.addEventListener('click', () => this.openModal('create'));
        this.elements.saveBtn?.addEventListener('click', () => this.saveHomework());
        this.elements.closeBtn?.addEventListener('click', () => this.closeModal());
        this.elements.cancelBtn?.addEventListener('click', () => this.closeModal());
        this.elements.editBtn?.addEventListener('click', () => this.openModal('edit'));
        this.elements.deleteBtn?.addEventListener('click', () => this.deleteHomework());
        this.elements.subjectSelect?.addEventListener('change', (e) => this.handleSubjectChange(e.target.value));
    },

    async populateHomeworkSelect() {
        const sel = this.elements.select;
        const cid = this.app.state.selectedClassId;
        if (!sel || !cid) return;

        sel.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', cid), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            sel.innerHTML = '<option value="">-- 숙제 선택 --</option>';
            if (snap.empty) sel.innerHTML += '<option disabled>숙제 없음</option>';
            else snap.forEach(d => sel.innerHTML += `<option value="${d.id}">${d.data().title}</option>`);
        } catch (e) { sel.innerHTML = '<option>로드 실패</option>'; }
    },

    loadHomeworkDetails(hid) {
        if (!hid) return;
        if (this.unsubs.homework) this.unsubs.homework();
        if (this.unsubs.subs) this.unsubs.subs();

        this.state.selectedHomeworkId = hid;
        this.elements.contentDiv.style.display = 'block';
        this.elements.btnsDiv.style.display = 'flex';
        this.elements.tableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">로딩 중...</td></tr>';

        this.unsubs.homework = onSnapshot(doc(db, 'homeworks', hid), (snap) => {
            if (!snap.exists()) { this.elements.tableBody.innerHTML = '<tr><td colspan="4">삭제됨</td></tr>'; return; }
            const data = snap.data();
            this.state.editingHomework = { id: hid, ...data };
            this.state.cachedData = data;
            this.elements.contentTitle.textContent = data.title;
            this.renderTable();
        });

        this.unsubs.subs = onSnapshot(collection(db, 'homeworks', hid, 'submissions'), (snap) => {
            this.state.cachedSubs = {};
            snap.forEach(d => this.state.cachedSubs[d.id] = d.data());
            this.renderTable();
        });
    },

    renderTable() {
        const { cachedData, cachedSubs } = this.state;
        const students = this.app.state.studentsInClass;
        if (!cachedData || !students) return;

        const oldSubs = cachedData.submissions || {};
        const tbody = this.elements.tableBody;
        tbody.innerHTML = '';

        if (students.size === 0) { tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">학생 없음</td></tr>'; return; }

        Array.from(students.entries()).sort((a,b)=>a[1].localeCompare(b[1])).forEach(([id, name]) => {
            const sub = cachedSubs[id] || oldSubs[id];
            const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
            const status = homeworkManagerHelper.calculateStatus(sub, cachedData);
            const btns = homeworkManagerHelper.renderFileButtons(sub, '반'); 
            const action = (sub && !sub.manualComplete) ? `<button class="force-btn ml-2 text-xs bg-green-50 text-green-600 px-2 py-1 rounded" data-id="${id}">✅ 확인</button>` : '';

            tbody.innerHTML += `<tr class="border-b hover:bg-slate-50"><td class="p-3">${name}</td><td class="p-3 ${status.color}">${status.text} ${action}</td><td class="p-3 text-xs text-slate-500">${date}<div>${btns}</div></td><td class="p-3"></td></tr>`;
        });

        tbody.querySelectorAll('.force-btn').forEach(b => b.onclick = () => this.forceComplete(b.dataset.id));
    },

    async forceComplete(sid) {
        if (!confirm("완료 처리?")) return;
        try {
            await setDoc(doc(db, 'homeworks', this.state.selectedHomeworkId, 'submissions', sid), { studentDocId: sid, manualComplete: true, status: 'completed', updatedAt: serverTimestamp() }, { merge: true });
            showToast("완료됨");
        } catch (e) { showToast("실패", true); }
    },

    async openModal(mode) {
        const isEdit = mode === 'edit';
        this.elements.modalTitle.textContent = isEdit ? '수정' : '새 숙제';
        
        // 과목 로드
        const subSel = this.elements.subjectSelect;
        subSel.innerHTML = '<option value="">과목 선택</option>';
        this.app.state.subjects.forEach(s => subSel.innerHTML += `<option value="${s.id}">${s.name}</option>`);

        if (isEdit && this.state.editingHomework) {
            const hw = this.state.editingHomework;
            this.elements.titleInput.value = hw.title;
            this.elements.pagesInput.value = hw.pages || '';
            this.elements.totalPagesInput.value = hw.totalPages || '';
            this.elements.dueDateInput.value = hw.dueDate || '';
            if (hw.subjectId) {
                subSel.value = hw.subjectId;
                await this.handleSubjectChange(hw.subjectId);
                this.elements.textbookSelect.value = hw.textbookId || '';
            }
        } else {
            this.elements.titleInput.value = ''; this.elements.pagesInput.value = '';
            this.elements.totalPagesInput.value = ''; this.elements.dueDateInput.value = '';
            subSel.value = ''; 
            this.elements.textbookSelect.innerHTML = '<option value="">교재 선택</option>';
            this.elements.textbookSelect.disabled = true;
            this.state.editingHomework = null;
        }
        this.elements.modal.style.display = 'flex';
    },

    closeModal() { this.elements.modal.style.display = 'none'; this.state.editingHomework = null; },

    async handleSubjectChange(sid) {
        const tbSel = this.elements.textbookSelect;
        tbSel.innerHTML = '<option>로딩 중...</option>'; tbSel.disabled = true;
        if (!sid) { tbSel.innerHTML = '<option value="">교재 선택</option>'; return; }
        try {
            const snap = await getDocs(query(collection(db, 'textbooks'), where('subjectId', '==', sid)));
            tbSel.innerHTML = '<option value="">교재 선택</option>';
            snap.forEach(d => tbSel.innerHTML += `<option value="${d.id}">${d.data().name}</option>`);
            tbSel.disabled = false;
        } catch (e) { tbSel.innerHTML = '<option>실패</option>'; }
    },

    async saveHomework() {
        const cid = this.app.state.selectedClassId;
        if (!cid) { showToast("반 선택 필요"); return; }
        const data = {
            classId: cid,
            title: this.elements.titleInput.value,
            subjectId: this.elements.subjectSelect.value,
            textbookId: this.elements.textbookSelect.value,
            pages: this.elements.pagesInput.value,
            dueDate: this.elements.dueDateInput.value,
            totalPages: Number(this.elements.totalPagesInput.value) || 0,
            updatedAt: serverTimestamp()
        };
        if (!data.title || !data.subjectId) { showToast("제목/과목 필수", true); return; }

        try {
            if (this.state.editingHomework) await updateDoc(doc(db, 'homeworks', this.state.editingHomework.id), data);
            else { data.createdAt = serverTimestamp(); await addDoc(collection(db, 'homeworks'), data); }
            showToast(this.state.editingHomework ? "수정됨" : "출제됨");
            this.closeModal();
            this.populateHomeworkSelect();
        } catch (e) { showToast("실패", true); }
    },

    async deleteHomework() {
        if (!this.state.selectedHomeworkId || !confirm("삭제?")) return;
        try { await deleteDoc(doc(db, 'homeworks', this.state.selectedHomeworkId)); showToast("삭제됨"); this.populateHomeworkSelect(); this.elements.contentDiv.style.display='none'; } 
        catch (e) { showToast("실패", true); }
    }
};