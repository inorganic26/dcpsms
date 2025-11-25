// src/admin/studentManager.js

import { collection, onSnapshot, doc, deleteDoc, updateDoc, query } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentManager = {
  editingStudentId: null,
  isInitialLoad: true,

  init(app) {
    this.app = app;
    this.elements = app.elements;

    this.elements.addStudentBtn?.addEventListener("click", () => this.addNewStudent());
    this.elements.studentsList?.addEventListener("click", (e) => this.handleListClick(e));
    this.elements.saveStudentEditBtn?.addEventListener("click", () => this.saveStudentChanges());
    this.elements.closeEditStudentModalBtn?.addEventListener("click", () => this.closeEditModal());
    this.elements.cancelEditStudentBtn?.addEventListener("click", () => this.closeEditModal());

    this.listenForStudents();
  },

  // ✅ [수정됨] 리전을 명시하여 클라우드 함수 호출
  async addNewStudent() {
    const name = this.elements.newStudentNameInput.value.trim();
    const phone = this.elements.newStudentPhoneInput.value.trim();
    const parentPhone = this.elements.newParentPhoneInput.value.trim();
    
    if (!name || !phone || phone.length < 4) {
        showToast("이름과 전화번호(4자리 이상)를 입력해주세요.", true);
        return;
    }

    showToast("학생 계정 생성 중...", false);

    try {
      // ✅ 여기서 'asia-northeast3'를 꼭 지정해야 합니다.
      const functions = getFunctions(app, 'asia-northeast3');
      const createStudent = httpsCallable(functions, 'createStudentAccount');
      
      await createStudent({ name, phone, parentPhone });

      showToast(`${name} 학생이 추가되었습니다.`, false);
      
      this.elements.newStudentNameInput.value = "";
      this.elements.newStudentPhoneInput.value = "";
      this.elements.newParentPhoneInput.value = "";
    } catch (e) {
      console.error("학생 추가 실패:", e);
      showToast(`추가 실패: ${e.message}`, true);
    }
  },

  listenForStudents() {
    const q = query(collection(db, "students"));
    onSnapshot(q, (snap) => {
      const isFirstLoad = this.isInitialLoad;
      const shouldRender = isFirstLoad || (this.app.state.currentView === 'studentMgmt');
      
      if (!shouldRender) return;
      this.isInitialLoad = false;
      
      const list = this.elements.studentsList;
      if (!list) return;
      
      list.innerHTML = "";
      const students = [];
      snap.forEach((d) => students.push({ id: d.id, ...d.data() }));
      this.app.state.students = students;
      students.sort((a, b) => a.name.localeCompare(b.name));

      if (students.length === 0) {
        list.innerHTML = '<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>';
        return;
      }
      students.forEach((s) => this.renderStudent(s));
    });
  },

  renderStudent(data) {
    const div = document.createElement("div");
    div.className = "p-3 border rounded-lg flex justify-between items-center";
    div.innerHTML = `
      <div>
        <p class="font-medium text-slate-700">${data.name}</p>
        <p class="text-xs text-slate-500">${data.phone || "번호없음"}</p>
      </div>
      <div class="flex gap-2">
        <button data-id="${data.id}" class="edit-student-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
        <button data-id="${data.id}" class="delete-student-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
      </div>`;
    this.elements.studentsList.appendChild(div);
  },

  async handleListClick(e) {
    const id = e.target.dataset.id;
    if (e.target.classList.contains("delete-student-btn")) {
      const studentName = this.app.state.students.find(s => s.id === id)?.name || "이 학생";
      if (confirm(`'${studentName}' 학생 정보를 삭제하시겠습니까?`)) {
        await deleteDoc(doc(db, "students", id));
        showToast("학생 정보가 삭제되었습니다.", false);
      }
    } else if (e.target.classList.contains("edit-student-btn")) {
      this.openEditModal(id);
    }
  },
  
  openEditModal(studentId) {
      const studentData = this.app.state.students.find(s => s.id === studentId);
      if (!studentData) return showToast("학생 정보를 찾을 수 없습니다.");
      this.editingStudentId = studentId;
      this.elements.editStudentNameInput.value = studentData.name || '';
      this.elements.editStudentPhoneInput.value = studentData.phone || '';
      this.elements.editParentPhoneInput.value = studentData.parentPhone || '';
      this.elements.editStudentModal.style.display = "flex";
  },

  closeEditModal() {
      this.editingStudentId = null;
      this.elements.editStudentModal.style.display = "none";
  },

  async saveStudentChanges() {
    if (!this.editingStudentId) return;
    const name = this.elements.editStudentNameInput.value.trim();
    const phone = this.elements.editStudentPhoneInput.value.trim();
    const parentPhone = this.elements.editParentPhoneInput.value.trim();
    
    if (!name || !phone) {
      showToast("이름과 전화번호는 필수입니다.");
      return;
    }
    try {
      const studentRef = doc(db, "students", this.editingStudentId);
      const updateData = { name, phone, parentPhone: parentPhone || null };
      await updateDoc(studentRef, updateData);
      showToast(`${name} 학생 정보가 수정되었습니다.`, false);
      this.closeEditModal();
    } catch (e) {
      console.error("학생 정보 수정 실패:", e);
      showToast("학생 정보 수정 실패", true);
    }
  }
};