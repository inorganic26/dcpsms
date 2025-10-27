// src/admin/teacherManager.js
import { collection, onSnapshot, doc, deleteDoc, query } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

let functions;
let createOrUpdateTeacher;

export const teacherManager = {
  editingTeacherId: null,

  init(adminAppInstance) {
    this.app = adminAppInstance;
    functions = getFunctions(app, "asia-northeast3");
    createOrUpdateTeacher = httpsCallable(functions, "createOrUpdateTeacher");

    this.elements = this.app.elements;

    this.elements.addTeacherBtn?.addEventListener("click", () => this.addNewTeacher());
    this.elements.closeEditTeacherModalBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.cancelEditTeacherBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.saveTeacherEditBtn?.addEventListener("click", () => this.saveTeacherChanges());

    this.listenForTeachers();
  },

  async addNewTeacher() {
    if (typeof createOrUpdateTeacher !== "function") {
      showToast("교사 추가 기능을 사용할 수 없습니다. (Cloud Function 확인 필요)");
      return;
    }

    const { newTeacherNameInput, newTeacherEmailInput, newTeacherPhoneInput } = this.elements;
    const name = newTeacherNameInput?.value.trim();
    const email = newTeacherEmailInput?.value.trim();
    const phone = newTeacherPhoneInput?.value.trim();

    if (!name || !email || !phone) {
      showToast("이름, 이메일, 전화번호를 모두 입력해주세요.");
      return;
    }

    try {
      const result = await createOrUpdateTeacher({ name, email, phone });
      showToast(result.data.message, false);
      newTeacherNameInput.value = "";
      newTeacherEmailInput.value = "";
      newTeacherPhoneInput.value = "";
    } catch (error) {
      console.error("[teacherManager] 교사 추가 실패:", error);
      showToast(`교사 추가 실패: ${error.message}`);
    }
  },

  listenForTeachers() {
    const q = query(collection(db, "teachers"));
    const listEl = this.elements.teachersList;
    if (!listEl) return;

    onSnapshot(
      q,
      (snapshot) => {
        listEl.innerHTML = "";
        if (snapshot.empty) {
          listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교사가 없습니다.</p>';
          return;
        }

        const teachers = [];
        snapshot.forEach((doc) => teachers.push({ id: doc.id, ...doc.data() }));
        teachers.sort((a, b) => a.name.localeCompare(b.name));
        this.app.state.teachers = teachers;
        teachers.forEach((teacher) => this.renderTeacher(teacher));
      },
      (error) => {
        console.error("[teacherManager] Firestore listen error:", error);
        showToast("교사 목록을 불러오는 중 오류 발생.", true);
        listEl.innerHTML = '<p class="text-red-500">교사 목록 로딩 실패</p>';
      }
    );
  },

  renderTeacher(teacherData) {
    const listEl = this.elements.teachersList;
    if (!listEl) return;

    const teacherDiv = document.createElement("div");
    teacherDiv.className = "p-3 border rounded-lg flex items-center justify-between";
    const emailDisplay = teacherData.email ? `(${teacherData.email})` : "(이메일 미등록)";

    teacherDiv.innerHTML = `
      <div>
        <p class="font-medium text-slate-700">${teacherData.name} ${emailDisplay}</p>
        <p class="text-xs text-slate-500">${teacherData.phone || "번호없음"}</p>
      </div>
      <div class="flex gap-2">
        <button data-id="${teacherData.id}" class="edit-teacher-btn text-blue-500 text-sm font-semibold">수정</button>
        <button data-id="${teacherData.id}" class="reset-password-btn text-gray-500 text-sm font-semibold">비밀번호 초기화</button>
        <button data-id="${teacherData.id}" class="delete-teacher-btn text-red-500 text-sm font-semibold">삭제</button>
      </div>
    `;
    listEl.appendChild(teacherDiv);

    teacherDiv.querySelector(".edit-teacher-btn")?.addEventListener("click", (e) => {
      this.openEditTeacherModal(e.target.dataset.id);
    });

    teacherDiv.querySelector(".delete-teacher-btn")?.addEventListener("click", async (e) => {
      if (confirm(`'${teacherData.name}' 교사를 삭제하시겠습니까?`)) {
        await deleteDoc(doc(db, "teachers", e.target.dataset.id));
        showToast("교사 삭제 완료.", false);
      }
    });
  },

  openEditTeacherModal(teacherId) {
    const teacherData = this.app.state.teachers.find((t) => t.id === teacherId);
    if (!teacherData) return;
    this.editingTeacherId = teacherId;
    this.elements.editTeacherNameInput.value = teacherData.name;
    this.elements.editTeacherEmailInput.value = teacherData.email || "";
    this.elements.editTeacherPhoneInput.value = teacherData.phone;
    this.elements.editTeacherModal.style.display = "flex";
  },

  closeEditTeacherModal() {
    this.editingTeacherId = null;
    this.elements.editTeacherModal.style.display = "none";
  },

  async saveTeacherChanges() {
    if (!this.editingTeacherId) return;
    const name = this.elements.editTeacherNameInput.value.trim();
    const email = this.elements.editTeacherEmailInput.value.trim();
    const phone = this.elements.editTeacherPhoneInput.value.trim();
    if (!name || !phone) {
      showToast("이름과 전화번호는 필수입니다.");
      return;
    }

    try {
      const result = await createOrUpdateTeacher({
        teacherId: this.editingTeacherId,
        name,
        email,
        phone,
      });
      showToast(result.data.message, false);
      this.closeEditTeacherModal();
    } catch (error) {
      showToast(`정보 수정 실패: ${error.message}`);
    }
  },
};
