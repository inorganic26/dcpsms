// src/admin/studentManager.js
import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, query } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentManager = {
  editingStudentId: null, // 수정 중인 학생 ID 상태 추가
  isInitialLoad: true, // ✨ [추가] 초기 로드 상태 플래그

  init(app) {
    this.app = app;
    this.elements = app.elements; // AdminApp의 elements 객체를 참조하도록 명확히 함

    // 이벤트 리스너 연결
    this.elements.addStudentBtn?.addEventListener("click", () => this.addNewStudent());
    // 이벤트 위임을 위해 리스너는 studentsList에만 연결
    this.elements.studentsList?.addEventListener("click", (e) => this.handleListClick(e));
    this.elements.saveStudentEditBtn?.addEventListener("click", () => this.saveStudentChanges());
    this.elements.closeEditStudentModalBtn?.addEventListener("click", () => this.closeEditModal());
    this.elements.cancelEditStudentBtn?.addEventListener("click", () => this.closeEditModal());

    this.listenForStudents();
  },

  async addNewStudent() {
    // elements 객체를 사용하도록 수정
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
        classId: null // 초기에는 미배정 상태
      });
      showToast(`${name} 학생이 추가되었습니다.`, false); // 성공 토스트
      // 입력 필드 초기화
      this.elements.newStudentNameInput.value = "";
      this.elements.newStudentPhoneInput.value = "";
      this.elements.newParentPhoneInput.value = "";
    } catch (e) {
      console.error("학생 추가 실패:", e);
      showToast("학생 추가 실패", true);
    }
  },

  listenForStudents() {
    const q = query(collection(db, "students"));
    onSnapshot(q, (snap) => {
      // ✨ [수정] 초기 로드이거나 현재 뷰가 studentMgmt일 때만 렌더링
      const isFirstLoad = this.isInitialLoad;
      const shouldRender = isFirstLoad || (this.app.state.currentView === 'studentMgmt');
      
      if (!shouldRender) {
          console.log("[StudentManager] Skipping renderList: Not first load and not in studentMgmt view.");
          return;
      }

      this.isInitialLoad = false; // ✨ [수정] 초기 로드 플래그 해제
      
      const list = this.elements.studentsList;
      if (!list) {
          console.error("[StudentManager] studentsList element not found in cache.");
          return;
      }
      
      // 렌더링 로직
      list.innerHTML = "";
      const students = [];
      snap.forEach((d) => students.push({ id: d.id, ...d.data() }));
      this.app.state.students = students;
      students.sort((a, b) => a.name.localeCompare(b.name)); // 이름순 정렬

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
    // 이벤트 위임을 처리하도록 로직 변경
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

      // 모달에 값 채우기
      this.elements.editStudentNameInput.value = studentData.name || '';
      this.elements.editStudentPhoneInput.value = studentData.phone || '';
      this.elements.editParentPhoneInput.value = studentData.parentPhone || '';
      
      // 모달 표시
      this.elements.editStudentModal.style.display = "flex";
  },

  closeEditModal() {
      this.editingStudentId = null;
      this.elements.editStudentModal.style.display = "none";
  },

  async saveStudentChanges() {
    if (!this.editingStudentId) return;
    
    // elements 객체를 사용하도록 수정
    const name = this.elements.editStudentNameInput.value.trim();
    const phone = this.elements.editStudentPhoneInput.value.trim();
    const parentPhone = this.elements.editParentPhoneInput.value.trim();
    
    if (!name || !phone) {
      showToast("이름과 전화번호는 필수입니다.");
      return;
    }

    try {
      const studentRef = doc(db, "students", this.editingStudentId);
      const updateData = {
        name,
        phone,
        parentPhone: parentPhone || null,
        // 전화번호가 변경되면 비밀번호도 마지막 4자리로 재설정
        password: phone.slice(-4), 
        // isInitialPassword를 true로 설정하여 로그인 시 재설정 유도
        isInitialPassword: true, 
      };
      
      await updateDoc(studentRef, updateData);
      showToast(`${name} 학생 정보가 수정되었습니다. (비밀번호 재설정됨)`, false);
      this.closeEditModal();
    } catch (e) {
      console.error("학생 정보 수정 실패:", e);
      showToast("학생 정보 수정 실패", true);
    }
  }
};