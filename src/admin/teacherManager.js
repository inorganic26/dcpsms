// src/admin/teacherManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, query } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const teacherManager = {
    editingTeacherId: null, // 현재 수정 중인 교사 ID를 저장할 변수

    init(app) {
        this.app = app;

        // 신규 교사 추가 이벤트
        this.app.elements.addTeacherBtn.addEventListener('click', () => this.addNewTeacher());

        // 수정 모달 이벤트
        this.app.elements.closeEditTeacherModalBtn.addEventListener('click', () => this.closeEditTeacherModal());
        this.app.elements.cancelEditTeacherBtn.addEventListener('click', () => this.closeEditTeacherModal());
        this.app.elements.saveTeacherEditBtn.addEventListener('click', () => this.saveTeacherChanges());
        
        this.listenForTeachers(); 
    },

    async addNewTeacher() {
        const { newTeacherNameInput, newTeacherPhoneInput } = this.app.elements;
        const teacherName = newTeacherNameInput.value.trim();
        const phone = newTeacherPhoneInput.value.trim();

        if (!teacherName || !phone) { 
            showToast("교사 이름과 전화번호를 모두 입력해주세요."); 
            return; 
        }
        if (!/^\d+$/.test(phone) || phone.length < 4) {
            showToast("전화번호는 4자리 이상의 숫자로 입력해주세요."); 
            return;
        }

        const password = phone.slice(-4);
        try {
            await addDoc(collection(db, 'teachers'), { 
                name: teacherName, 
                password: password, 
                phone: phone,
                createdAt: serverTimestamp(),
                isInitialPassword: true
            });
            showToast(`새로운 교사가 추가되었습니다. (비밀번호: ${password})`, false);
            newTeacherNameInput.value = '';
            newTeacherPhoneInput.value = '';
        } catch (error) { 
            console.error("교사 추가 실패:", error); 
            showToast("교사 추가에 실패했습니다."); 
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
            this.app.state.teachers = teachers; // 앱의 state에 교사 목록 저장
            teachers.forEach(teacher => this.renderTeacher(teacher));
        });
    },

    renderTeacher(teacherData) {
        const teacherDiv = document.createElement('div');
        teacherDiv.className = "p-3 border rounded-lg flex items-center justify-between";
        teacherDiv.innerHTML = `
            <div>
                <span class="font-medium text-slate-700">${teacherData.name} (${teacherData.phone || '번호없음'})</span>
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
            if (confirm(`'${teacherData.name}' 교사를 정말 삭제하시겠습니까?`)) {
                await deleteDoc(doc(db, "teachers", e.target.dataset.id));
                showToast("교사가 삭제되었습니다.", false);
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
        this.app.elements.editTeacherPhoneInput.value = teacherData.phone;
        this.app.elements.editTeacherModal.style.display = 'flex';
    },

    closeEditTeacherModal() {
        this.editingTeacherId = null;
        this.app.elements.editTeacherModal.style.display = 'none';
    },

    async saveTeacherChanges() {
        if (!this.editingTeacherId) return;

        const newName = this.app.elements.editTeacherNameInput.value.trim();
        const newPhone = this.app.elements.editTeacherPhoneInput.value.trim();

        if (!newName || !newPhone) {
            showToast("이름과 전화번호를 모두 입력해주세요.");
            return;
        }
        if (!/^\d+$/.test(newPhone) || newPhone.length < 4) {
            showToast("전화번호는 4자리 이상의 숫자로 입력해주세요.");
            return;
        }

        const newPassword = newPhone.slice(-4);
        const teacherRef = doc(db, 'teachers', this.editingTeacherId);

        try {
            await updateDoc(teacherRef, {
                name: newName,
                phone: newPhone,
                password: newPassword
            });
            showToast("교사 정보가 성공적으로 수정되었습니다.", false);
            this.closeEditTeacherModal();
        } catch (error) {
            console.error("교사 정보 수정 실패:", error);
            showToast("정보 수정에 실패했습니다.");
        }
    },

    async resetTeacherPassword(teacherId, teacherName) {
        if (confirm(`'${teacherName}' 교사의 비밀번호를 전화번호 뒷 4자리로 초기화하시겠습니까?`)) {
            try {
                const teacherRef = doc(db, 'teachers', teacherId);
                const teacherSnap = await getDoc(teacherRef);

                if (teacherSnap.exists()) {
                    const phone = teacherSnap.data().phone;
                    if (phone && phone.length >= 4) {
                        const newPassword = phone.slice(-4);
                        await updateDoc(teacherRef, { 
                            password: newPassword,
                            isInitialPassword: true 
                        });
                        showToast(`'${teacherName}' 교사의 비밀번호가 '${newPassword}'로 초기화되었습니다.`, false);
                    } else {
                        showToast("해당 교사의 전화번호 정보가 올바르지 않아 초기화할 수 없습니다.");
                    }
                }
            } catch (error) { 
                console.error("비밀번호 초기화 실패:", error); 
                showToast("비밀번호 초기화에 실패했습니다."); 
            }
        }
    },
};