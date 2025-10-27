// src/admin/studentManager.js
import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, query } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentManager = {
  init(app) {
    this.app = app;
    this.elements = app.elements;

    this.elements.addStudentBtn?.addEventListener("click", () => this.addNewStudent());
    this.elements.studentsList?.addEventListener("click", (e) => this.handleListClick(e));
    this.elements.saveStudentEditBtn?.addEventListener("click", () => this.saveStudentChanges());
    this.listenForStudents();
  },

  async addNewStudent() {
    const name = this.elements.newStudentNameInput.value.trim();
    const phone = this.elements.newStudentPhoneInput.value.trim();
    const parentPhone = this.elements.newParentPhoneInput.value.trim();
    if (!name || !phone) return showToast("이름과 전화번호는 필수입니다.");

    try {
      await addDoc(collection(db, "students"), {
        name,
        phone,
        parentPhone: parentPhone || null,
        password: phone.slice(-4),
        isInitialPassword: true,
        createdAt: serverTimestamp(),
      });
      showToast(`${name} 학생이 추가되었습니다.`);
    } catch (e) {
      console.error("학생 추가 실패:", e);
      showToast("학생 추가 실패");
    }
  },

  listenForStudents() {
    const q = query(collection(db, "students"));
    onSnapshot(q, (snap) => {
      const list = this.elements.studentsList;
      list.innerHTML = "";
      const students = [];
      snap.forEach((d) => students.push({ id: d.id, ...d.data() }));
      this.app.state.students = students;
      students.forEach((s) => this.renderStudent(s));
    });
  },

  renderStudent(data) {
    const div = document.createElement("div");
    div.className = "p-3 border rounded-lg flex justify-between";
    div.innerHTML = `
      <div>${data.name} (${data.phone || "번호없음"})</div>
      <div class="flex gap-2">
        <button data-id="${data.id}" class="edit-student-btn text-blue-500">수정</button>
        <button data-id="${data.id}" class="delete-student-btn text-red-500">삭제</button>
      </div>`;
    this.elements.studentsList.appendChild(div);
  },

  async handleListClick(e) {
    const id = e.target.dataset.id;
    if (e.target.classList.contains("delete-student-btn")) {
      if (confirm("삭제하시겠습니까?")) {
        await deleteDoc(doc(db, "students", id));
        showToast("삭제 완료");
      }
    }
  },
};
