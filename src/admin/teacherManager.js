// src/admin/teacherManager.js
import { collection, onSnapshot, doc, deleteDoc, query, updateDoc, writeBatch } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

let functions;
let createOrUpdateTeacher;
let resetTeacherPasswordFunction; 

export const teacherManager = {
  editingTeacherId: null,
  isInitialLoad: true, // ✨ [추가] 초기 로드 상태 플래그

  init(adminAppInstance) {
    this.app = adminAppInstance;
    functions = getFunctions(app, "asia-northeast3");
    createOrUpdateTeacher = httpsCallable(functions, "createOrUpdateTeacher");
    resetTeacherPasswordFunction = httpsCallable(functions, "resetTeacherPassword"); 

    this.elements = this.app.elements;

    this.elements.addTeacherBtn?.addEventListener("click", () => this.addNewTeacher());
    this.elements.closeEditTeacherModalBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.cancelEditTeacherBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.saveTeacherEditBtn?.addEventListener("click", () => this.saveTeacherChanges());
    
    // 이벤트 위임 (수정/삭제/비밀번호 초기화 버튼 처리)
    this.elements.teachersList?.addEventListener("click", (e) => this.handleListClick(e));

    this.listenForTeachers();
  },

  async addNewTeacher() {
    if (typeof createOrUpdateTeacher !== "function") {
      showToast("교사 추가 기능을 사용할 수 없습니다. (Cloud Function 확인 필요)", true);
      return;
    }

    const { newTeacherNameInput, newTeacherEmailInput, newTeacherPhoneInput } = this.elements;
    const name = newTeacherNameInput?.value.trim();
    // ✨ [수정] 이메일은 null로 초기화 (선택적)
    const email = newTeacherEmailInput?.value.trim() || null; 
    const phone = newTeacherPhoneInput?.value.trim();

    // ✨ [수정] 필수 입력 필드를 이름과 전화번호로만 변경
    if (!name || !phone) {
      showToast("이름과 전화번호는 모두 입력해주세요.", true);
      return;
    }

    try {
      // Cloud Function에 보낼 데이터 구성
      const dataToSend = { name, phone };
      if (email) dataToSend.email = email;
      
      const result = await createOrUpdateTeacher(dataToSend);
      showToast(result.data.message, false);
      
      // 입력 필드 초기화
      newTeacherNameInput.value = "";
      newTeacherEmailInput.value = "";
      newTeacherPhoneInput.value = "";
    } catch (error) {
      console.error("[teacherManager] 교사 추가 실패:", error);
      showToast(`교사 추가 실패: ${error.message}`, true);
    }
  },

  listenForTeachers() {
    const q = query(collection(db, "teachers"));
    const listEl = this.elements.teachersList;
    if (!listEl) return;

    onSnapshot(
      q,
      (snapshot) => {
        const teachers = [];
        snapshot.forEach((doc) => teachers.push({ id: doc.id, ...doc.data() }));
        teachers.sort((a, b) => a.name.localeCompare(b.name));
        this.app.state.teachers = teachers;
        
        // ✨ [수정] 초기 로드이거나 현재 뷰가 'teacherMgmt'일 때만 렌더링
        if (this.isInitialLoad || this.app.state.currentView === 'teacherMgmt') {
             this.renderList(teachers);
        }
        
        this.isInitialLoad = false; // ✨ [추가] 초기 로드 플래그 해제

      },
      (error) => {
        console.error("[teacherManager] Firestore listen error:", error);
        if (listEl) listEl.innerHTML = '<p class="text-red-500">교사 목록 로딩 실패</p>';
      }
    );
  },

  renderList(teachers) {
    const listEl = this.elements.teachersList;
    if (!listEl) return;
    listEl.innerHTML = "";

    if (teachers.length === 0) {
      listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교사가 없습니다.</p>';
      return;
    }

    teachers.forEach((teacher) => this.renderTeacher(teacher));
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
  },
  
  // 이벤트 위임 처리 함수
  async handleListClick(e) {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains("edit-teacher-btn")) {
          this.openEditTeacherModal(id);
      } else if (e.target.classList.contains("delete-teacher-btn")) {
          const teacherName = this.app.state.teachers.find(t => t.id === id)?.name || '이 교사';
          if (confirm(`'${teacherName}' 교사를 삭제하시겠습니까?`)) {
               await deleteDoc(doc(db, "teachers", id)); 
               showToast("교사 삭제 완료.", false);
          }
      } else if (e.target.classList.contains("reset-password-btn")) {
           this.resetTeacherPassword(id);
      }
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
    const email = this.elements.editTeacherEmailInput.value.trim() || null;
    const phone = this.elements.editTeacherPhoneInput.value.trim();
    
    if (!name || !phone) {
      showToast("이름과 전화번호는 필수입니다.");
      return;
    }

    try {
        const dataToSend = { teacherId: this.editingTeacherId, name, phone };
        if (email) dataToSend.email = email;
        
        const result = await createOrUpdateTeacher(dataToSend);

        showToast(result.data.message, false);
        this.closeEditTeacherModal();
    } catch (error) {
        console.error("정보 수정 실패:", error);
        showToast(`정보 수정 실패: ${error.message}`, true);
    }
  },
  
  // 교사 비밀번호 초기화 함수
  async resetTeacherPassword(teacherId) {
       const teacherData = this.app.state.teachers.find(t => t.id === teacherId);
       if (!teacherData?.phone || teacherData.phone.length < 4) {
           showToast("전화번호가 유효하지 않아 초기 비밀번호를 설정할 수 없습니다. 수정 후 다시 시도해주세요.", true);
           return;
       }
       const newPassword = teacherData.phone.slice(-4);

       if (!confirm(`'${teacherData.name}' 교사의 비밀번호를 전화번호 뒷 4자리(${newPassword})로 초기화하고, 최초 로그인 상태로 되돌리시겠습니까?`)) {
           return;
       }

       try {
           const teacherRef = doc(db, 'teachers', teacherId);
           await updateDoc(teacherRef, {
               password: newPassword,
               isInitialPassword: true
           });
           
           showToast(`'${teacherData.name}' 교사의 비밀번호가 초기화되었습니다.`, false);
       } catch (error) {
           console.error("비밀번호 초기화 실패:", error);
           showToast(`비밀번호 초기화 실패: ${error.message}`, true);
       }
  }
};