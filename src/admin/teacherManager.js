// src/admin/teacherManager.js
import { collection, onSnapshot, doc, deleteDoc, query, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
// ✨ Store 임포트
import { setTeachers, getTeachers, TEACHER_EVENTS } from "../store/teacherStore.js";

export const teacherManager = {
  editingTeacherId: null,
  elements: {},

  init(adminAppInstance) {
    // this.app = adminAppInstance; // ❌ 의존성 제거
    this.elements = adminAppInstance.elements;

    this.elements.addTeacherBtn?.addEventListener("click", () => this.addNewTeacher());
    this.elements.closeEditTeacherModalBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.cancelEditTeacherBtn?.addEventListener("click", () => this.closeEditTeacherModal());
    this.elements.saveTeacherEditBtn?.addEventListener("click", () => this.saveTeacherChanges());
    this.elements.teachersList?.addEventListener("click", (e) => this.handleListClick(e));

    // ✨ Store 변경 감지 -> 화면 갱신
    document.addEventListener(TEACHER_EVENTS.UPDATED, () => {
        this.renderList();
    });

    this.listenForTeachers();
  },

  // ✅ 서버 함수 호출 유지 (보안)
  async addNewTeacher() {
    const { newTeacherNameInput, newTeacherPhoneInput } = this.elements;
    const name = newTeacherNameInput?.value.trim();
    const phone = newTeacherPhoneInput?.value.trim();

    if (!name || !phone) {
      showToast("이름과 전화번호는 모두 입력해주세요.", true);
      return;
    }

    showToast("교사 계정 생성 중...", false);

    try {
      const functions = getFunctions(app, 'asia-northeast3');
      const createTeacher = httpsCallable(functions, 'createTeacherAccount');
      
      await createTeacher({ name, phone });

      showToast(`${name} 교사가 등록되었습니다.`, false);
      
      newTeacherNameInput.value = "";
      newTeacherPhoneInput.value = "";
      
    } catch (error) {
      console.error("[teacherManager] 교사 추가 실패:", error);
      showToast(`교사 추가 실패: ${error.message}`, true);
    }
  },

  listenForTeachers() {
    const q = query(collection(db, "teachers"));
    const listEl = this.elements.teachersList;

    onSnapshot(
      q,
      (snapshot) => {
        const teachers = [];
        snapshot.forEach((doc) => teachers.push({ id: doc.id, ...doc.data() }));
        teachers.sort((a, b) => a.name.localeCompare(b.name));
        
        // ✨ Store 업데이트
        setTeachers(teachers);
      },
      (error) => {
        console.error("[teacherManager] Firestore listen error:", error);
        if (listEl) listEl.innerHTML = '<p class="text-red-500">교사 목록 로딩 실패 (권한 부족)</p>';
      }
    );
  },

  renderList() {
    const teachers = getTeachers(); // ✨ Store에서 조회
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
          // ✨ Store에서 조회
          const teacherName = getTeachers().find(t => t.id === id)?.name || '이 교사';
          if (confirm(`'${teacherName}' 교사를 삭제하시겠습니까?`)) {
               try {
                   await deleteDoc(doc(db, "teachers", id)); 
                   showToast("교사 삭제 완료.", false);
               } catch(e) {
                   showToast("삭제 실패 (권한 부족 가능성)");
               }
          }
      } else if (e.target.classList.contains("reset-password-btn")) {
           this.resetTeacherPassword(id);
      }
  },

  openEditTeacherModal(teacherId) {
    // ✨ Store에서 조회
    const teacherData = getTeachers().find((t) => t.id === teacherId);
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
        await updateDoc(teacherRef, {
            name, 
            phone,
            password: phone.slice(-4), 
            isInitialPassword: true 
        });

        showToast(`${name} 교사 정보가 수정되었습니다.`, false);
        this.closeEditTeacherModal();
    } catch (error) {
        console.error("정보 수정 실패:", error);
        showToast(`정보 수정 실패: ${error.message}`, true);
    }
  },
  
  async resetTeacherPassword(teacherId) {
       // ✨ Store에서 조회
       const teacherData = getTeachers().find(t => t.id === teacherId);
       if (!teacherData?.phone || teacherData.phone.length < 4) {
           showToast("전화번호가 유효하지 않습니다.", true);
           return;
       }
       const newPassword = teacherData.phone.slice(-4);

       if (!confirm(`'${teacherData.name}' 교사의 비밀번호를 초기화하시겠습니까?`)) {
           return;
       }

       try {
           const teacherRef = doc(db, 'teachers', teacherId);
           await updateDoc(teacherRef, {
               password: newPassword,
               isInitialPassword: true
           });
           
           showToast(`비밀번호가 초기화되었습니다.`, false);
       } catch (error) {
           console.error("비밀번호 초기화 실패:", error);
           showToast(`비밀번호 초기화 실패: ${error.message}`, true);
       }
  }
};