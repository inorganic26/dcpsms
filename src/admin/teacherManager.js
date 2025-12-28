// src/admin/teacherManager.js

import { collection, onSnapshot, doc, deleteDoc, query, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { setTeachers, getTeachers, TEACHER_EVENTS } from "../store/teacherStore.js";

export const teacherManager = {
  editingTeacherId: null,
  elements: {},

  init() {
    this.elements = {
        addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
        teachersList: document.getElementById('admin-teachers-list'),
        
        newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
        newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
        
        editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
        closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
        cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
        saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),
        editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
        editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),
    };

    this.elements.addTeacherBtn?.addEventListener("click", () => this.addNewTeacher());
    this.elements.closeEditTeacherModalBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.cancelEditTeacherBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.saveTeacherEditBtn?.addEventListener("click", () => this.saveTeacherChanges());
    this.elements.teachersList?.addEventListener("click", (e) => this.handleListClick(e));

    document.addEventListener(TEACHER_EVENTS.UPDATED, () => this.renderList());
    this.listenForTeachers();
  },

  async addNewTeacher() {
    const name = this.elements.newTeacherNameInput?.value.trim();
    const phone = this.elements.newTeacherPhoneInput?.value.trim();

    if (!name || !phone) { showToast("이름과 전화번호는 필수입니다.", true); return; }
    showToast("교사 계정 생성 중...", false);

    try {
      const functions = getFunctions(app, 'asia-northeast3');
      const createTeacher = httpsCallable(functions, 'createTeacherAccount');
      await createTeacher({ name, phone });
      showToast(`${name} 교사가 등록되었습니다.`, false);
      this.elements.newTeacherNameInput.value = "";
      this.elements.newTeacherPhoneInput.value = "";
    } catch (error) {
      console.error(error); showToast(`추가 실패: ${error.message}`, true);
    }
  },

  listenForTeachers() {
    const q = query(collection(db, "teachers"));
    onSnapshot(q, (snapshot) => {
        const teachers = [];
        snapshot.forEach((doc) => teachers.push({ id: doc.id, ...doc.data() }));
        teachers.sort((a, b) => a.name.localeCompare(b.name));
        setTeachers(teachers);
    }, (error) => {
        console.error(error);
        if (this.elements.teachersList) this.elements.teachersList.innerHTML = '<p class="text-red-500">로딩 실패</p>';
    });
  },

  renderList() {
    const teachers = getTeachers();
    const listEl = this.elements.teachersList;
    if (!listEl) return;
    listEl.innerHTML = "";

    if (teachers.length === 0) { listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교사가 없습니다.</p>'; return; }
    teachers.forEach((t) => {
        const div = document.createElement("div");
        div.className = "p-3 border rounded-lg flex items-center justify-between";
        div.innerHTML = `
          <div><p class="font-medium text-slate-700">${t.name}</p><p class="text-xs text-slate-500">${t.phone || "-"}</p></div>
          <div class="flex gap-2">
            <button data-id="${t.id}" class="edit-teacher-btn text-blue-500 text-sm font-semibold">수정</button>
            <button data-id="${t.id}" class="reset-password-btn text-gray-500 text-sm font-semibold">초기화</button>
            <button data-id="${t.id}" class="delete-teacher-btn text-red-500 text-sm font-semibold">삭제</button>
          </div>`;
        listEl.appendChild(div);
    });
  },
  
  async handleListClick(e) {
      const id = e.target.dataset.id;
      if (!id) return;
      if (e.target.classList.contains("edit-teacher-btn")) this.openEditTeacherModal(id);
      else if (e.target.classList.contains("delete-teacher-btn")) {
          const tName = getTeachers().find(t => t.id === id)?.name;
          if (confirm(`'${tName}' 교사를 삭제하시겠습니까?`)) {
               try { await deleteDoc(doc(db, "teachers", id)); showToast("삭제 완료", false); } catch(e) { showToast("삭제 실패"); }
          }
      } else if (e.target.classList.contains("reset-password-btn")) this.resetTeacherPassword(id);
  },

  openEditTeacherModal(teacherId) {
    const teacherData = getTeachers().find((t) => t.id === teacherId);
    if (!teacherData) return;
    this.editingTeacherId = teacherId;
    this.elements.editTeacherNameInput.value = teacherData.name;
    this.elements.editTeacherPhoneInput.value = teacherData.phone;
    this.elements.editTeacherModal.style.display = "flex";
  },

  closeEditTeacherModal() {
    this.editingTeacherId = null;
    if(this.elements.editTeacherModal) this.elements.editTeacherModal.style.display = "none";
  },

  async saveTeacherChanges() {
    if (!this.editingTeacherId) return;
    const name = this.elements.editTeacherNameInput.value.trim();
    const phone = this.elements.editTeacherPhoneInput.value.trim();
    if (!name || !phone) { showToast("입력 확인 필요"); return; }

    try {
        await updateDoc(doc(db, 'teachers', this.editingTeacherId), { name, phone, password: phone.slice(-4), isInitialPassword: true });
        showToast("수정되었습니다.", false);
        this.closeEditTeacherModal();
    } catch (error) { showToast(`수정 실패: ${error.message}`, true); }
  },
  
  async resetTeacherPassword(teacherId) {
       const teacherData = getTeachers().find(t => t.id === teacherId);
       if (!teacherData?.phone || teacherData.phone.length < 4) { showToast("전화번호 오류", true); return; }
       if (!confirm(`'${teacherData.name}' 비밀번호 초기화?`)) return;
       try {
           await updateDoc(doc(db, 'teachers', teacherId), { password: teacherData.phone.slice(-4), isInitialPassword: true });
           showToast(`초기화 완료`, false);
       } catch (error) { showToast(`실패: ${error.message}`, true); }
  }
};