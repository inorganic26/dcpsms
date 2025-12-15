// src/admin/studentManager.js

import { doc, updateDoc, deleteDoc } from "firebase/firestore";
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
        itemsPerPage: 10,   // 10명씩 보기
    },

    init(app) {
        this.app = app;
        this.elements = app.elements;
        
        if (!this.elements.searchStudentInput) {
            this.elements.searchStudentInput = document.getElementById('search-student-input');
        }

        this.addEventListeners();

        // 초기 로드
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

    // 학생 생성 (서울 리전 설정 유지)
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
            
            // 서울 리전 함수 호출
            const functions = getFunctions(app, 'asia-northeast3');
            const createAccountFn = httpsCallable(functions, 'createStudentAccount');
            
            const result = await createAccountFn({
                name: name,
                phone: phone,
                parentPhone: parentPhone
            });
            
            if (result.data.success) {
                showToast("학생이 등록되었습니다. (비번: 전화번호 뒤 4자리)", false);
                if(nameInput) nameInput.value = "";
                if(phoneInput) phoneInput.value = "";
                if(parentPhoneInput) parentPhoneInput.value = "";
            } else {
                throw new Error(result.data.message || "생성 실패");
            }
            
        } catch (error) {
            console.error("학생 생성 오류:", error);
            let msg = "등록에 실패했습니다.";
            if (error.message.includes("already-exists")) {
                msg = "이미 등록된 전화번호이거나 학생입니다.";
            }
            showToast(msg, true);
        }
    },

    openEditModal(student) {
        this.app.state.editingStudent = student;
        const modal = this.elements.editStudentModal;
        
        if (this.elements.editStudentNameInput) this.elements.editStudentNameInput.value = student.name;
        if (this.elements.editStudentPhoneInput) this.elements.editStudentPhoneInput.value = student.phone || "";
        if (this.elements.editParentPhoneInput) this.elements.editParentPhoneInput.value = student.parentPhone || "";

        const classSelect = document.getElementById('admin-edit-student-class-select');
        if (classSelect) {
            const classes = getClasses();
            classSelect.innerHTML = '<option value="">(미배정)</option>';
            classes.forEach(c => {
                const selected = c.id === student.classId ? "selected" : "";
                const typeLabel = c.classType === 'live-lecture' ? '[현강]' : '[자습]';
                classSelect.innerHTML += `<option value="${c.id}" ${selected}>${typeLabel} ${c.name}</option>`;
            });
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
        
        const classSelect = document.getElementById('admin-edit-student-class-select');
        const newClassId = classSelect ? classSelect.value : (student.classId || null);

        if (!newName || !newPhone) {
            showToast("이름과 전화번호를 입력하세요.", true);
            return;
        }

        try {
            await updateDoc(doc(db, "students", student.id), {
                name: newName,
                phone: newPhone,
                parentPhone: newParentPhone,
                classId: newClassId === "" ? null : newClassId
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

            let className = "-";
            let classBadgeColor = "bg-slate-100 text-slate-500";
            
            if (student.classId) {
                const cls = classes.find(c => c.id === student.classId);
                if (cls) {
                    className = cls.name;
                    classBadgeColor = cls.classType === 'live-lecture' 
                        ? "bg-indigo-50 text-indigo-700" 
                        : "bg-emerald-50 text-emerald-700";
                } else {
                    className = "삭제된 반";
                    classBadgeColor = "bg-red-50 text-red-500";
                }
            } else {
                className = "미배정";
                classBadgeColor = "bg-orange-50 text-orange-600 border border-orange-100";
            }

            tr.innerHTML = `
                <td class="p-3 text-slate-800 font-bold">${student.name}</td>
                <td class="p-3 text-slate-600 font-mono text-sm">${student.phone || '-'}</td>
                <td class="p-3">
                    <span class="text-xs px-2 py-1 rounded font-bold ${classBadgeColor}">
                        ${className}
                    </span>
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

        // ✨ [수정됨] text를 String으로 변환해서 안전하게 검사
        const createBtn = (text, onClick, disabled = false, isActive = false) => {
            const btn = document.createElement('button');
            btn.innerHTML = text;
            btn.disabled = disabled;
            btn.onclick = onClick;
            
            // 여기서 String(text)를 사용하여 숫자가 들어와도 오류가 나지 않도록 수정
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
                i, // 숫자 i를 그대로 넘겨도 내부에서 String으로 변환하므로 안전함
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