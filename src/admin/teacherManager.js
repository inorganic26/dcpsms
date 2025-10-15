// src/admin/teacherManager.js

import { collection, onSnapshot, doc, deleteDoc, getDoc, query } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

const functions = getFunctions(app, 'asia-northeast3');
const createOrUpdateTeacher = httpsCallable(functions, 'createOrUpdateTeacher');

export const teacherManager = {
    editingTeacherId: null,

    init(app) {
        this.app = app;

        this.app.elements.addTeacherBtn.addEventListener('click', () => this.addNewTeacher());
        this.app.elements.closeEditTeacherModalBtn.addEventListener('click', () => this.closeEditTeacherModal());
        this.app.elements.cancelEditTeacherBtn.addEventListener('click', () => this.closeEditTeacherModal());
        this.app.elements.saveTeacherEditBtn.addEventListener('click', () => this.saveTeacherChanges());
        
        this.listenForTeachers(); 
    },

    async addNewTeacher() {
        const { newTeacherNameInput, newTeacherEmailInput, newTeacherPhoneInput } = this.app.elements;
        const name = newTeacherNameInput.value.trim();
        const email = newTeacherEmailInput.value.trim();
        const phone = newTeacherPhoneInput.value.trim();

        if (!name || !email || !phone) { 
            showToast("이름, 이메일, 전화번호를 모두 입력해주세요."); 
            return; 
        }

        try {
            const result = await createOrUpdateTeacher({ name, email, phone });
            showToast(result.data.message, false);
            newTeacherNameInput.value = '';
            newTeacherEmailInput.value = '';
            newTeacherPhoneInput.value = '';
        } catch (error) { 
            console.error("교사 추가 실패:", error); 
            showToast(`교사 추가 실패: ${error.message}`); 
        }
    },

    listenForTeachers() {
        const q = query(collection(db, 'teachers'));
        onSnapshot(q, (snapshot) => {
            const listEl = this.app.elements.teachersList;
            listEl.innerHTML = '';
            if (snapshot.empty) { 
                listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교사가 없습니다.</p>'; 
                return; 
            }
            const teachers = [];
            snapshot.forEach(doc => teachers.push({ id: doc.id, ...doc.data() }));
            teachers.sort((a, b) => a.name.localeCompare(b.name));
            this.app.state.teachers = teachers;
            teachers.forEach(teacher => this.renderTeacher(teacher));
        });
    },

    renderTeacher(teacherData) {
        const teacherDiv = document.createElement('div');
        teacherDiv.className = "p-3 border rounded-lg flex items-center justify-between";
        const emailDisplay = teacherData.email ? `(${teacherData.email})` : '(이메일 미등록)';
        
        teacherDiv.innerHTML = `
            <div>
                <p class="font-medium text-slate-700">${teacherData.name} ${emailDisplay}</p>
                <p class="text-xs text-slate-500">${teacherData.phone || '번호없음'}</p>
            </div>
            <div class="flex gap-2">
                <button data-id="${teacherData.id}" class="edit-teacher-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${teacherData.id}" data-name="${teacherData.name}" class="reset-password-btn text-gray-500 hover:text-gray-700 text-sm font-semibold">비밀번호 초기화</button>
                <button data-id="${teacherData.id}" class="delete-teacher-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
            </div>
        `;
        this.app.elements.teachersList.appendChild(teacherDiv);

        teacherDiv.querySelector('.edit-teacher-btn').addEventListener('click', (e) => {
            this.openEditTeacherModal(e.target.dataset.id);
        });

        teacherDiv.querySelector('.delete-teacher-btn').addEventListener('click', async (e) => {
            if (confirm(`'${teacherData.name}' 교사를 정말 삭제하시겠습니까? (연결된 로그인 계정도 삭제됩니다)`)) {
                // TODO: 교사 삭제 Cloud Function 호출 필요
                await deleteDoc(doc(db, "teachers", e.target.dataset.id));
                showToast("교사 정보가 삭제되었습니다. 연결된 계정은 별도 삭제가 필요할 수 있습니다.", false);
            }
        });

        teacherDiv.querySelector('.reset-password-btn').addEventListener('click', (e) => {
            this.resetTeacherPassword(e.target.dataset.id, e.target.dataset.name);
        });
    },

    openEditTeacherModal(teacherId) {
        const teacherData = this.app.state.teachers.find(t => t.id === teacherId);
        if (!teacherData) {
            showToast("교사 정보를 찾을 수 없습니다.");
            return;
        }
        this.editingTeacherId = teacherId;
        this.app.elements.editTeacherNameInput.value = teacherData.name;
        this.app.elements.editTeacherEmailInput.value = teacherData.email || '';
        this.app.elements.editTeacherPhoneInput.value = teacherData.phone;
        this.app.elements.editTeacherModal.style.display = 'flex';
    },

    closeEditTeacherModal() {
        this.editingTeacherId = null;
        this.app.elements.editTeacherModal.style.display = 'none';
    },

    async saveTeacherChanges() {
        if (!this.editingTeacherId) return;

        const name = this.app.elements.editTeacherNameInput.value.trim();
        const email = this.app.elements.editTeacherEmailInput.value.trim();
        const phone = this.app.elements.editTeacherPhoneInput.value.trim();

        if (!name || !phone) {
            showToast("이름과 전화번호는 필수입니다.");
            return;
        }

        try {
            const result = await createOrUpdateTeacher({
                teacherId: this.editingTeacherId,
                name,
                email,
                phone
            });
            showToast(result.data.message, false);
            this.closeEditTeacherModal();
        } catch (error) {
            console.error("교사 정보 수정 실패:", error);
            showToast(`정보 수정 실패: ${error.message}`);
        }
    },

    async resetTeacherPassword(teacherId, teacherName) {
        if (confirm(`'${teacherName}' 교사의 비밀번호를 전화번호 뒷 4자리로 초기화하시겠습니까?`)) {
            // TODO: 비밀번호 초기화 Cloud Function 호출 필요
            showToast("비밀번호 초기화 기능은 아직 구현되지 않았습니다.");
        }
    },
};