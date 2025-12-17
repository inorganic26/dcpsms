// src/admin/studentManager.js

import { collection, addDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../shared/firebase.js"; 
import { showToast } from "../shared/utils.js";
import { getClasses } from "../store/classStore.js"; 
import { getStudents } from "../store/studentStore.js"; 

export const studentManager = {
    app: null,
    elements: {},
    state: {
        students: [],
        currentPage: 1,     
        itemsPerPage: 10,
    },

    init(app) {
        this.app = app;
        this.elements = app.elements;
        
        if (!this.elements.searchStudentInput) {
            this.elements.searchStudentInput = document.getElementById('search-student-input');
        }

        this.addEventListeners();
        this.renderStudentList();

        document.addEventListener('studentsUpdated', () => this.renderStudentList());
        document.addEventListener('classesUpdated', () => this.renderStudentList());
    },

    addEventListeners() {
        this.elements.addStudentBtn?.addEventListener('click', () => this.createStudent());
        
        this.elements.searchStudentInput?.addEventListener('input', () => {
            this.state.currentPage = 1; 
            this.renderStudentList();
        });
        
        this.elements.closeEditStudentModalBtn?.addEventListener('click', () => this.closeEditModal());
        this.elements.cancelEditStudentBtn?.addEventListener('click', () => this.closeEditModal());
        this.elements.saveStudentEditBtn?.addEventListener('click', () => this.updateStudent());
    },

    async createStudent() {
        const nameInput = this.elements.newStudentNameInput;
        const phoneInput = this.elements.newStudentPhoneInput;
        const parentPhoneInput = this.elements.newParentPhoneInput; 

        const name = nameInput?.value.trim();
        const phone = phoneInput?.value.trim();
        const parentPhone = parentPhoneInput ? parentPhoneInput.value.trim() : "";

        if (!name || !phone) {
            showToast("이름과 전화번호를 입력하세요.", true);
            return;
        }

        if (phone.length < 4) {
            showToast("전화번호는 최소 4자리 이상이어야 합니다.", true);
            return;
        }

        try {
            showToast("학생 계정을 생성 중입니다...", false);
            
            const functions = getFunctions(app, 'asia-northeast3');
            const createAccountFn = httpsCallable(functions, 'createStudentAccount');
            
            const result = await createAccountFn({
                name: name,
                phone: phone,
                parentPhone: parentPhone
            });
            
            if (result.data.success) {
                showToast("학생이 등록되었습니다.", false);
                
                if(nameInput) nameInput.value = "";
                if(phoneInput) phoneInput.value = "";
                if(parentPhoneInput) parentPhoneInput.value = "";
            } else {
                throw new Error(result.data.message || "생성 실패");
            }
            
        } catch (error) {
            console.error("학생 생성 오류:", error);
            showToast("등록 실패: " + error.message, true);
        }
    },

    openEditModal(student) {
        this.app.state.editingStudent = student;
        const modal = this.elements.editStudentModal;
        
        if (this.elements.editStudentNameInput) this.elements.editStudentNameInput.value = student.name;
        if (this.elements.editStudentPhoneInput) this.elements.editStudentPhoneInput.value = student.phone || "";
        if (this.elements.editParentPhoneInput) this.elements.editParentPhoneInput.value = student.parentPhone || "";

        const currentClassIds = student.classIds || (student.classId ? [student.classId] : []);
        const classSelect = document.getElementById('admin-edit-student-class-select');
        
        if (classSelect) {
            classSelect.style.display = 'none';
            
            let checkboxContainer = document.getElementById('admin-edit-student-class-checkboxes');
            if (!checkboxContainer) {
                checkboxContainer = document.createElement('div');
                checkboxContainer.id = 'admin-edit-student-class-checkboxes';
                checkboxContainer.className = 'max-h-40 overflow-y-auto border rounded p-2 bg-slate-50 grid grid-cols-2 gap-2';
                classSelect.parentNode.insertBefore(checkboxContainer, classSelect.nextSibling);
            }
            
            const classes = getClasses();
            checkboxContainer.innerHTML = '';
            
            if (classes.length === 0) {
                checkboxContainer.innerHTML = '<span class="text-sm text-slate-400 p-2">등록된 반이 없습니다.</span>';
            } else {
                classes.forEach(c => {
                    const isChecked = currentClassIds.includes(c.id);
                    const label = document.createElement('label');
                    label.className = 'flex items-center gap-2 text-sm cursor-pointer hover:bg-white p-1 rounded';
                    label.innerHTML = `
                        <input type="checkbox" value="${c.id}" class="class-checkbox w-4 h-4 text-indigo-600 rounded" ${isChecked ? 'checked' : ''}>
                        <span>${c.name}</span>
                    `;
                    checkboxContainer.appendChild(label);
                });
            }
        }

        modal?.classList.remove('hidden');
        modal?.classList.add('flex');
    },

    closeEditModal() {
        const modal = this.elements.editStudentModal;
        modal?.classList.add('hidden');
        modal?.classList.remove('flex');
        this.app.state.editingStudent = null;
    },

    async updateStudent() {
        const student = this.app.state.editingStudent;
        if (!student) return;

        const newName = this.elements.editStudentNameInput?.value.trim();
        const newPhone = this.elements.editStudentPhoneInput?.value.trim();
        const newParentPhone = this.elements.editParentPhoneInput?.value.trim() || "";
        
        const checkboxContainer = document.getElementById('admin-edit-student-class-checkboxes');
        let newClassIds = [];
        if (checkboxContainer) {
            const checkboxes = checkboxContainer.querySelectorAll('.class-checkbox:checked');
            newClassIds = Array.from(checkboxes).map(cb => cb.value);
        } else {
            const classSelect = document.getElementById('admin-edit-student-class-select');
            if (classSelect && classSelect.value) newClassIds = [classSelect.value];
        }

        if (!newName || !newPhone) {
            showToast("이름과 전화번호를 입력하세요.", true);
            return;
        }

        try {
            await updateDoc(doc(db, "students", student.id), {
                name: newName,
                phone: newPhone,
                parentPhone: newParentPhone,
                classIds: newClassIds,
                classId: newClassIds.length > 0 ? newClassIds[0] : null
            });
            showToast("학생 정보가 수정되었습니다.", false);
            this.closeEditModal();
        } catch (error) {
            console.error(error);
            showToast("수정 실패", true);
        }
    },

    renderStudentList() {
        const listEl = this.elements.studentsList; 
        const searchInput = this.elements.searchStudentInput;
        if (!listEl) return;

        let students = getStudents(); 
        const classes = getClasses();

        if (searchInput && searchInput.value.trim() !== "") {
            const keyword = searchInput.value.trim().toLowerCase();
            students = students.filter(s => 
                s.name.toLowerCase().includes(keyword) || 
                (s.phone && s.phone.includes(keyword))
            );
        }

        const totalItems = students.length;
        const totalPages = Math.ceil(totalItems / this.state.itemsPerPage);

        if (this.state.currentPage > totalPages) this.state.currentPage = totalPages || 1;
        if (this.state.currentPage < 1) this.state.currentPage = 1;

        const startIndex = (this.state.currentPage - 1) * this.state.itemsPerPage;
        const endIndex = startIndex + this.state.itemsPerPage;
        const currentStudents = students.slice(startIndex, endIndex);

        listEl.innerHTML = "";

        if (totalItems === 0) {
            listEl.innerHTML = '<tr><td colspan="4" class="text-center py-6 text-slate-400">등록된 학생이 없습니다.</td></tr>';
            this.renderPagination(0, 0);
            return;
        }

        currentStudents.forEach(student => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 border-b border-slate-100 transition";

            const studentClassIds = student.classIds || (student.classId ? [student.classId] : []);
            let classBadgeHtml = "";

            if (studentClassIds.length === 0) {
                classBadgeHtml = `<span class="text-xs px-2 py-1 rounded font-bold bg-orange-50 text-orange-600 border border-orange-100">미배정</span>`;
            } else {
                classBadgeHtml = studentClassIds.map(cid => {
                    const cls = classes.find(c => c.id === cid);
                    if (!cls) return ""; 
                    const colorClass = cls.classType === 'live-lecture' 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "bg-emerald-50 text-emerald-700";
                    return `<span class="text-xs px-2 py-1 rounded font-bold ${colorClass} mr-1 mb-1 inline-block">${cls.name}</span>`;
                }).join("");
            }

            tr.innerHTML = `
                <td class="p-3 text-slate-800 font-bold">${student.name}</td>
                <td class="p-3 text-slate-600 font-mono text-sm">${student.phone || '-'}</td>
                <td class="p-3">
                    ${classBadgeHtml}
                </td>
                <td class="p-3 text-right">
                    <button class="edit-btn text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition">
                        <span class="material-icons text-sm">edit</span>
                    </button>
                    <button class="delete-btn text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition">
                        <span class="material-icons text-sm">delete</span>
                    </button>
                </td>
            `;

            tr.querySelector(".edit-btn").addEventListener("click", () => this.openEditModal(student));
            tr.querySelector(".delete-btn").addEventListener("click", () => this.deleteStudent(student.id, student.name));

            listEl.appendChild(tr);
        });

        this.renderPagination(totalItems, totalPages);
    },

    renderPagination(totalItems, totalPages) {
        const paginationContainer = document.getElementById('admin-student-pagination');
        if (!paginationContainer) return;

        paginationContainer.innerHTML = "";
        if (totalPages <= 1) return;

        const createBtn = (text, onClick, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.disabled = disabled;
            btn.onclick = onClick;
            
            // ✨ [핵심 수정] text를 String으로 변환하여 안전하게 .includes 체크
            if (String(text).includes('material-icons')) { 
                btn.className = `p-2 rounded hover:bg-slate-100 text-slate-500 disabled:opacity-30 ${disabled ? 'cursor-not-allowed' : ''}`;
            } else { 
                btn.className = `w-8 h-8 flex items-center justify-center rounded text-sm font-bold transition ${
                    isActive 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`;
            }
            return btn;
        };

        paginationContainer.appendChild(createBtn(
            '<span class="material-icons text-sm">chevron_left</span>',
            () => { this.state.currentPage--; this.renderStudentList(); },
            this.state.currentPage === 1
        ));

        let startPage = 1;
        let endPage = totalPages;
        if (totalPages > 10) {
            startPage = Math.max(1, this.state.currentPage - 2);
            endPage = Math.min(totalPages, startPage + 4);
            if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationContainer.appendChild(createBtn(
                i, 
                () => { this.state.currentPage = i; this.renderStudentList(); }, 
                false, 
                i === this.state.currentPage
            ));
        }

        paginationContainer.appendChild(createBtn(
            '<span class="material-icons text-sm">chevron_right</span>',
            () => { this.state.currentPage++; this.renderStudentList(); },
            this.state.currentPage === totalPages
        ));
    },

    async deleteStudent(studentId, studentName) {
        if (!confirm(`'${studentName}' 학생을 삭제하시겠습니까?\n(로그인 계정도 함께 삭제됩니다)`)) return;

        try {
            await deleteDoc(doc(db, "students", studentId));
            showToast("학생이 삭제되었습니다.", false);
        } catch (error) {
            console.error(error);
            showToast("삭제 실패", true);
        }
    }
};