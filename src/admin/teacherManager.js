// src/admin/teacherManager.js
import { collection, onSnapshot, addDoc, doc, deleteDoc, query, updateDoc, serverTimestamp } from "firebase/firestore";
// import { getFunctions, httpsCallable } from "firebase/functions"; // ⚠️ Cloud Function 관련 코드 제거
import app, { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

// ⚠️ Cloud Function 관련 변수 제거

export const teacherManager = {
  editingTeacherId: null,
  isInitialLoad: true,

  init(adminAppInstance) {
    this.app = adminAppInstance;
    // ⚠️ Cloud Function 초기화 로직 제거
    
    this.elements = this.app.elements;

    this.elements.addTeacherBtn?.addEventListener("click", () => this.addNewTeacher());
    this.elements.closeEditTeacherModalBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.cancelEditTeacherBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.saveTeacherEditBtn?.addEventListener("click", () => this.saveTeacherChanges());
    
    this.elements.teachersList?.addEventListener("click", (e) => this.handleListClick(e));

    this.listenForTeachers();
  },

  async addNewTeacher() {
    // ⚠️ Cloud Function 호출 전 검사 로직 제거

    const { newTeacherNameInput, newTeacherPhoneInput } = this.elements;
    const name = newTeacherNameInput?.value.trim();
    const phone = newTeacherPhoneInput?.value.trim();

    if (!name || !phone) {
      showToast("이름과 전화번호는 모두 입력해주세요.", true);
      return;
    }

    try {
      // ✅ Cloud Function 대신 Firestore addDoc 사용
      await addDoc(collection(db, "teachers"), {
          name,
          phone,
          password: phone.slice(-4), // 초기 비번: 전화번호 뒷 4자리
          isInitialPassword: true, // 첫 로그인 시 재설정 유도
          createdAt: serverTimestamp(),
      });

      showToast(`${name} 교사가 등록되었습니다. (초기 비밀번호: 뒷 4자리)`, false);
      
      // 입력 필드 초기화
      newTeacherNameInput.value = "";
      newTeacherPhoneInput.value = "";
    } catch (error) {
      console.error("[teacherManager] 교사 추가 실패:", error);
      showToast(`교사 추가 실패: ${error.message}`, true);
    }
  },

  listenForTeachers() {
    // Firestore 직접 읽기 (onSnapshot) 사용
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
        
        // 이 로직 덕분에 등록/수정 즉시 목록이 갱신됩니다.
        if (this.isInitialLoad || this.app.state.currentView === 'teacherMgmt') {
             this.renderList(teachers);
        }
        
        this.isInitialLoad = false;
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

    teacherDiv.innerHTML = `
      <div>
        <p class="font-medium text-slate-700">${teacherData.name}</p>
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
  
  async handleListClick(e) {
      const id = e.target.dataset.id;
      if (!id) return;

      if (e.target.classList.contains("edit-teacher-btn")) {
          this.openEditTeacherModal(id);
      } else if (e.target.classList.contains("delete-teacher-btn")) {
          const teacherName = this.app.state.teachers.find(t => t.id === id)?.name || '이 교사';
          if (confirm(`'${teacherName}' 교사를 삭제하시겠습니까?`)) {
               // Firestore 직접 삭제
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
    const phone = this.elements.editTeacherPhoneInput.value.trim();
    
    if (!name || !phone) {
      showToast("이름과 전화번호는 필수입니다.");
      return;
    }

    try {
        const teacherRef = doc(db, 'teachers', this.editingTeacherId);
        
        // ✅ Cloud Function 대신 Firestore updateDoc 사용
        await updateDoc(teacherRef, {
            name, 
            phone,
            password: phone.slice(-4), // 전화번호 변경 시 비밀번호 재설정
            isInitialPassword: true // 재설정 시 첫 로그인 플래그 활성화
        });

        showToast(`${name} 교사 정보가 수정되었습니다. (비밀번호 재설정됨)`, false);
        this.closeEditTeacherModal();
    } catch (error) {
        console.error("정보 수정 실패:", error);
        showToast(`정보 수정 실패: ${error.message}`, true);
    }
  },
  
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
           // Firestore 직접 업데이트 (이 로직은 이전에도 updateDoc을 사용했습니다)
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