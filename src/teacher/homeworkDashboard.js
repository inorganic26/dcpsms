// src/teacher/homeworkDashboard.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const homeworkDashboard = {
    managerInstance: null,
    unsubscribe: null, // ✨ 실시간 감시 취소용 변수 추가

    config: {
        elements: {
            modal: 'teacher-assign-homework-modal',
            modalTitle: 'teacher-homework-modal-title',
            titleInput: 'teacher-homework-title',
            subjectSelect: 'teacher-homework-subject-select',
            textbookSelect: 'teacher-homework-textbook-select',
            pagesInput: 'teacher-homework-pages',
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
        // 기존 감시(리스너)가 있다면 해제
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

    // ✨ [핵심 수정] 실시간 데이터 감시(onSnapshot) 적용
    loadHomeworkDetails(homeworkId) {
        if (!homeworkId) return;
        
        // 기존 리스너 해제 (다른 숙제 클릭 시)
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

        // onSnapshot을 사용하여 실시간 업데이트
        this.unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (!docSnap.exists()) {
                el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">숙제가 삭제되었습니다.</td></tr>';
                return;
            }

            const hwData = docSnap.data();
            this.state.editingHomework = { id: homeworkId, ...hwData };
            
            el('selectedHomeworkTitle').textContent = hwData.title;

            // 학생 데이터와 제출 데이터 매칭
            const studentsInClass = this.app.state.studentsInClass; 
            const submissions = hwData.submissions || {};
            
            const tbody = el('homeworkTableBody');
            tbody.innerHTML = '';

            if (studentsInClass.size === 0) {
                tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">학생이 없습니다.</td></tr>';
                return;
            }

            // 학생 목록을 이름순 정렬
            const sortedStudents = Array.from(studentsInClass.entries()).sort((a, b) => a[1].localeCompare(b[1]));

            sortedStudents.forEach(([id, name]) => {
                const sub = submissions[id];
                const isDone = sub && sub.status === 'completed';
                const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
                
                // 파일 다운로드 버튼 (URL이 있을 경우)
                let downloadBtn = '';
                if (sub?.fileUrl) {
                    downloadBtn = `<a href="${sub.fileUrl}" target="_blank" class="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 ml-2">다운로드</a>`;
                }

                const tr = document.createElement('tr');
                tr.className = "border-b hover:bg-slate-50 transition duration-300"; // 애니메이션 효과 추가
                tr.innerHTML = `
                    <td class="py-3 px-4">${name}</td>
                    <td class="py-3 px-4 font-bold ${isDone ? 'text-green-600' : 'text-red-500'}">
                        ${isDone ? '완료' : '미완료'}
                    </td>
                    <td class="py-3 px-4 text-xs text-slate-500">
                        ${date} ${downloadBtn}
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }, (error) => {
            console.error("실시간 업데이트 실패:", error);
            el('homeworkTableBody').innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">실시간 연결 끊김</td></tr>';
        });
    },

    // --- Modal Functions ---
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
            this.populateHomeworkSelect(); 
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