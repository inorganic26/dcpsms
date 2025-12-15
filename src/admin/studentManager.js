// src/admin/studentManager.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { getClasses } from "../store/classStore.js"; 

// ✨ [수정됨] setStudents 제거 (이제 필요 없음)
import { getStudents } from "../store/studentStore.js"; 

export const studentManager = {
    app: null,
    elements: {},
    state: {
        students: [],
    },

    init(app) {
        this.app = app;
        this.elements = app.elements;
        this.addEventListeners();

        // 1. 초기 목록 로드
        this.renderStudentList();

        // 2. ✨ 학생 데이터가 변경되면(추가/삭제 등) 자동으로 화면 갱신
        document.addEventListener('studentsUpdated', () => {
            console.log("학생 목록 변경 감지 -> 테이블 갱신");
            this.renderStudentList();
        });

        // 3. 반 정보가 변경되어도(반 이름 수정 등) 학생 목록 갱신 필요
        document.addEventListener('classesUpdated', () => {
            this.renderStudentList();
        });
    },

    addEventListeners() {
        this.elements.addStudentBtn?.addEventListener('click', () => this.createStudent());
        this.elements.searchStudentInput?.addEventListener('input', () => this.renderStudentList()); // 검색 기능
        
        // 수정 모달
        this.elements.closeEditStudentModalBtn?.addEventListener('click', () => this.closeEditModal());
        this.elements.cancelEditStudentBtn?.addEventListener('click', () => this.closeEditModal());
        this.elements.saveStudentEditBtn?.addEventListener('click', () => this.updateStudent());
    },

    // 학생 생성 (DB에 추가)
    async createStudent() {
        const nameInput = this.elements.newStudentNameInput;
        const phoneInput = this.elements.newStudentPhoneInput;
        const classSelect = this.elements.newStudentClassSelect; // (HTML에 있다면)

        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const classId = classSelect ? classSelect.value : null;

        if (!name || !phone) {
            showToast("이름과 전화번호를 입력하세요.", true);
            return;
        }

        try {
            await addDoc(collection(db, "students"), {
                name,
                phone,
                classId: classId === "unassigned" ? null : classId,
                createdAt: new Date()
            });
            
            showToast("학생이 등록되었습니다.", false);
            nameInput.value = "";
            phoneInput.value = "";
            if(classSelect) classSelect.value = "";
            
            // Store가 자동 감지하므로 수동 갱신 불필요
        } catch (error) {
            console.error(error);
            showToast("등록 실패", true);
        }
    },

    // 학생 목록 렌더링 (화면 그리기)
    renderStudentList() {
        const listEl = this.elements.studentsList; // tbody
        const searchInput = this.elements.searchStudentInput;
        if (!listEl) return;

        // Store에서 최신 데이터 가져오기
        let students = getStudents(); 
        const classes = getClasses();

        // 검색어 필터링
        if (searchInput && searchInput.value.trim() !== "") {
            const keyword = searchInput.value.trim().toLowerCase();
            students = students.filter(s => 
                s.name.toLowerCase().includes(keyword) || 
                (s.phone && s.phone.includes(keyword))
            );
        }

        listEl.innerHTML = "";

        if (students.length === 0) {
            listEl.innerHTML = '<tr><td colspan="5" class="text-center py-6 text-slate-400">등록된 학생이 없습니다.</td></tr>';
            return;
        }

        students.forEach(student => {
            const tr = document.createElement("tr");
            tr.className = "hover:bg-slate-50 border-b border-slate-100 transition";

            // 반 이름 찾기
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
    },

    openEditModal(student) {
        this.app.state.editingStudent = student;
        const modal = this.elements.editStudentModal;
        
        this.elements.editStudentName.value = student.name;
        this.elements.editStudentPhone.value = student.phone || "";

        // 반 선택 드롭다운 채우기
        const classSelect = this.elements.editStudentClassSelect;
        if (classSelect) {
            const classes = getClasses();
            classSelect.innerHTML = '<option value="">(미배정)</option>';
            classes.forEach(c => {
                const selected = c.id === student.classId ? "selected" : "";
                const typeLabel = c.classType === 'live-lecture' ? '[현강]' : '[자습]';
                classSelect.innerHTML += `<option value="${c.id}" ${selected}>${typeLabel} ${c.name}</option>`;
            });
        }

        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeEditModal() {
        this.elements.editStudentModal.classList.add('hidden');
        this.elements.editStudentModal.classList.remove('flex');
        this.app.state.editingStudent = null;
    },

    // 학생 정보 수정 (DB 업데이트)
    async updateStudent() {
        const student = this.app.state.editingStudent;
        if (!student) return;

        const newName = this.elements.editStudentName.value.trim();
        const newPhone = this.elements.editStudentPhone.value.trim();
        const newClassId = this.elements.editStudentClassSelect?.value || null;

        if (!newName || !newPhone) {
            showToast("이름과 전화번호를 입력하세요.", true);
            return;
        }

        try {
            await updateDoc(doc(db, "students", student.id), {
                name: newName,
                phone: newPhone,
                classId: newClassId
            });
            showToast("학생 정보가 수정되었습니다.", false);
            this.closeEditModal();
        } catch (error) {
            console.error(error);
            showToast("수정 실패", true);
        }
    },

    // 학생 삭제 (DB 삭제)
    async deleteStudent(studentId, studentName) {
        if (!confirm(`'${studentName}' 학생을 삭제하시겠습니까?`)) return;

        try {
            await deleteDoc(doc(db, "students", studentId));
            showToast("학생이 삭제되었습니다.", false);
        } catch (error) {
            console.error(error);
            showToast("삭제 실패", true);
        }
    }
};