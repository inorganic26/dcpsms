// src/admin/studentManager.js
import { 
    collection, 
    getDocs, 
    doc, 
    deleteDoc, 
    updateDoc, 
    query, 
    orderBy, 
    limit, 
    startAfter 
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
// ✨ Store 임포트
import { setStudents, getStudents, STUDENT_EVENTS } from "../store/studentStore.js";

export const studentManager = {
  editingStudentId: null,
  
  // 페이지네이션 상태
  pageSize: 10,
  currentPage: 1,
  pageCursors: [], 
  isLoading: false,
  elements: {},

  init(adminAppInstance) {
    // this.app = adminAppInstance; // ❌ 의존성 제거
    this.elements = adminAppInstance.elements;

    this.elements.addStudentBtn?.addEventListener("click", () => this.addNewStudent());
    this.elements.studentsList?.addEventListener("click", (e) => this.handleListClick(e));
    this.elements.saveStudentEditBtn?.addEventListener("click", () => this.saveStudentChanges());
    this.elements.closeEditStudentModalBtn?.addEventListener("click", () => this.closeEditModal());
    this.elements.cancelEditStudentBtn?.addEventListener("click", () => this.closeEditModal());

    this.createPaginationControls();
    
    // ✨ Store 변경 감지 -> 화면 갱신
    document.addEventListener(STUDENT_EVENTS.UPDATED, () => {
        const currentData = getStudents();
        this.renderList(currentData);
    });

    this.loadPage('first'); 
  },

  createPaginationControls() {
      if (document.getElementById('pagination-controls')) return;
      
      const container = document.createElement('div');
      container.id = 'pagination-controls';
      container.className = 'flex justify-between items-center mt-4 gap-2';

      const prevBtn = document.createElement('button');
      prevBtn.className = 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium';
      prevBtn.textContent = '< 이전';
      prevBtn.disabled = true;
      prevBtn.addEventListener('click', () => this.loadPage('prev'));

      const resetBtn = document.createElement('button');
      resetBtn.className = 'px-3 py-2 text-sm text-slate-500 hover:text-slate-700 underline';
      resetBtn.textContent = '처음으로';
      resetBtn.addEventListener('click', () => this.loadPage('first'));

      const nextBtn = document.createElement('button');
      nextBtn.className = 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium';
      nextBtn.textContent = '다음 >';
      nextBtn.addEventListener('click', () => this.loadPage('next'));

      container.appendChild(prevBtn);
      container.appendChild(resetBtn);
      container.appendChild(nextBtn);
      
      this.elements.studentsList?.parentNode?.appendChild(container);
      
      this.prevBtn = prevBtn;
      this.nextBtn = nextBtn;
  },

  async loadPage(direction) {
    if (this.isLoading) return;
    this.isLoading = true;
    if(this.elements.studentsList) this.elements.studentsList.style.opacity = '0.5';

    try {
      let q;
      const studentsRef = collection(db, "students");
      
      if (direction === 'first') {
          this.currentPage = 1;
          this.pageCursors = [];
          q = query(studentsRef, orderBy("name"), limit(this.pageSize));
      } else if (direction === 'next') {
          const lastDoc = this.pageCursors[this.currentPage - 1];
          if (!lastDoc) { this.isLoading = false; return; }
          q = query(studentsRef, orderBy("name"), startAfter(lastDoc), limit(this.pageSize));
      } else if (direction === 'prev') {
          if (this.currentPage <= 1) { this.isLoading = false; return; }
          const targetPage = this.currentPage - 1;
          const cursorIndex = targetPage - 2;
          if (cursorIndex < 0) {
              q = query(studentsRef, orderBy("name"), limit(this.pageSize));
          } else {
              const prevCursor = this.pageCursors[cursorIndex];
              q = query(studentsRef, orderBy("name"), startAfter(prevCursor), limit(this.pageSize));
          }
      }

      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
          if (direction === 'first') {
              this.elements.studentsList.innerHTML = '<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>';
              this.updateButtons(0);
          } else {
              showToast("더 이상 데이터가 없습니다.");
              this.nextBtn.disabled = true;
          }
          return;
      }

      const newStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // ✨ Store 업데이트
      setStudents(newStudents);

      if (direction === 'next') {
          if (this.pageCursors.length < this.currentPage) {
               this.pageCursors.push(snapshot.docs[snapshot.docs.length - 1]);
          } else {
               this.pageCursors[this.currentPage - 1] = snapshot.docs[snapshot.docs.length - 1];
          }
          this.currentPage++;
      } else if (direction === 'prev') {
          this.currentPage--;
      } else { 
          this.currentPage = 1;
          this.pageCursors = [snapshot.docs[snapshot.docs.length - 1]];
      }

      this.updateButtons(snapshot.docs.length);

    } catch (error) {
      console.error("학생 목록 로딩 실패:", error);
      showToast("데이터를 불러오지 못했습니다.", true);
    } finally {
      this.isLoading = false;
      if(this.elements.studentsList) this.elements.studentsList.style.opacity = '1';
    }
  },

  updateButtons(loadedCount) {
      if (this.prevBtn) this.prevBtn.disabled = (this.currentPage <= 1);
      if (this.nextBtn) this.nextBtn.disabled = (loadedCount < this.pageSize);
  },

  // ✅ 서버 함수 호출 유지 (보안)
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
      const functions = getFunctions(app, 'asia-northeast3');
      const createStudent = httpsCallable(functions, 'createStudentAccount');
      
      await createStudent({ name, phone, parentPhone });

      showToast(`${name} 학생이 추가되었습니다.`, false);
      
      this.elements.newStudentNameInput.value = "";
      this.elements.newStudentPhoneInput.value = "";
      this.elements.newParentPhoneInput.value = "";
      
      this.loadPage('first');

    } catch (e) {
      console.error("학생 추가 실패:", e);
      showToast(`추가 실패: ${e.message}`, true);
    }
  },

  renderList(data) {
    if(!this.elements.studentsList) return;
    this.elements.studentsList.innerHTML = "";
    data.forEach(s => this.renderStudent(s));
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
      // ✨ Store에서 데이터 찾기
      const studentName = getStudents().find(s => s.id === id)?.name || "이 학생";
      if (confirm(`'${studentName}' 학생 정보를 삭제하시겠습니까?`)) {
        await deleteDoc(doc(db, "students", id));
        showToast("삭제되었습니다.", false);
        this.loadPage('first');
      }
    } else if (e.target.classList.contains("edit-student-btn")) {
      this.openEditModal(id);
    }
  },
  
  openEditModal(studentId) {
      // ✨ Store에서 데이터 찾기
      const studentData = getStudents().find(s => s.id === studentId);
      if (!studentData) return showToast("정보를 찾을 수 없습니다.");
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
    if (!name || !phone) { showToast("필수 입력 항목 누락"); return; }

    try {
      await updateDoc(doc(db, "students", this.editingStudentId), {
        name, phone, parentPhone: parentPhone || null
      });
      showToast("수정되었습니다.", false);
      this.closeEditModal();
      this.loadPage('first');
    } catch (e) {
      showToast("수정 실패", true);
    }
  }
};