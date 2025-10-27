// src/admin/subjectManager.js
import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, query } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const subjectManager = {
  init(app) {
    this.app = app;
    this.elements = app.elements;
    this.elements.addSubjectBtn?.addEventListener("click", () => this.addNewSubject());
    this.listenForSubjects();
  },

  async addNewSubject() {
    const name = this.app.elements.newSubjectNameInput.value.trim();
    if (!name) return showToast("과목 이름을 입력해주세요.");
    await addDoc(collection(db, "subjects"), { name, createdAt: serverTimestamp() });
    showToast("과목이 추가되었습니다.");
    this.app.elements.newSubjectNameInput.value = '';
  },

  listenForSubjects() {
    const q = query(collection(db, "subjects"));
    onSnapshot(q, (snap) => {
      const subjects = [];
      snap.forEach((doc) => subjects.push({ id: doc.id, ...doc.data() }));
      this.app.state.subjects = subjects;
      this.renderList();
    });
  },

  renderList() {
    const list = this.app.elements.subjectsList;
    if (!list) return;
    list.innerHTML = "";
    if (this.app.state.subjects.length === 0) {
      list.innerHTML = '<p class="text-sm text-slate-400">생성된 과목이 없습니다.</p>';
      return;
    }
    this.app.state.subjects.forEach((sub) => {
      const div = document.createElement("div");
      div.className = "p-3 border rounded-lg flex justify-between";
      div.innerHTML = `${sub.name} <button data-id="${sub.id}" class="delete-subject-btn text-red-500">삭제</button>`;
      list.appendChild(div);
      div.querySelector(".delete-subject-btn")?.addEventListener("click", async () => {
        if (confirm(`'${sub.name}' 과목을 삭제할까요?`)) await deleteDoc(doc(db, "subjects", sub.id));
      });
    });
  },
};