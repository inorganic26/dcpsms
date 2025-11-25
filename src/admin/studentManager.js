// src/admin/studentManager.js
import { 
    collection, 
    getDocs, 
    addDoc, 
    serverTimestamp, 
    doc, 
    deleteDoc, 
    updateDoc, 
    query, 
    orderBy, 
    limit, 
    startAfter 
} from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentManager = {
  editingStudentId: null,
  
  // ✅ 페이지네이션 상태 관리
  pageSize: 10,
  currentPage: 1,
  pageCursors: [], // 각 페이지의 마지막 문서를 저장하는 스택 (뒤로가기용)
  isLoading: false,

  init(app) {
    this.app = app;
    this.elements = app.elements;

    this.elements.addStudentBtn?.addEventListener("click", () => this.addNewStudent());
    this.elements.studentsList?.addEventListener("click", (e) => this.handleListClick(e));
    this.elements.saveStudentEditBtn?.addEventListener("click", () => this.saveStudentChanges());
    this.elements.closeEditStudentModalBtn?.addEventListener("click", () => this.closeEditModal());
    this.elements.cancelEditStudentBtn?.addEventListener("click", () => this.closeEditModal());

    // 페이지네이션 버튼 생성
    this.createPaginationControls();

    // 초기 로드
    this.loadPage('first'); 
  },

  createPaginationControls() {
      if (document.getElementById('pagination-controls')) return;
      
      const container = document.createElement('div');
      container.id = 'pagination-controls';
      container.className = 'flex justify-between items-center mt-4 gap-2';

      // 1. 이전 버튼
      const prevBtn = document.createElement('button');
      prevBtn.id = 'btn-prev-page';
      prevBtn.className = 'px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 disabled:opacity-50 disabled:cursor-not-allowed font-medium';
      prevBtn.textContent = '< 이전';
      prevBtn.disabled = true; // 첫 페이지라 비활성화
      prevBtn.addEventListener('click', () => this.loadPage('prev'));

      // 2. 초기화(처음으로) 버튼
      const resetBtn = document.createElement('button');
      resetBtn.className = 'px-3 py-2 text-sm text-slate-500 hover:text-slate-700 underline';
      resetBtn.textContent = '처음으로';
      resetBtn.addEventListener('click', () => this.loadPage('first'));

      // 3. 다음 버튼
      const nextBtn = document.createElement('button');
      nextBtn.id = 'btn-next-page';
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

  // ✅ 페이지 로드 함수 (핵심 로직)
  async loadPage(direction) {
    if (this.isLoading) return;
    this.isLoading = true;

    // UI 업데이트 (로딩 중)
    if(this.elements.studentsList) this.elements.studentsList.style.opacity = '0.5';

    try {
      let q;
      const studentsRef = collection(db, "students");
      
      // 1. 쿼리 설정
      if (direction === 'first') {
          this.currentPage = 1;
          this.pageCursors = []; // 커서 초기화
          q = query(studentsRef, orderBy("name"), limit(this.pageSize));
      } 
      else if (direction === 'next') {
          // 현재 페이지의 마지막 문서를 기준으로 다음 데이터 요청
          const lastDoc = this.pageCursors[this.currentPage - 1];
          if (!lastDoc) { this.isLoading = false; return; } // 에러 방지
          q = query(studentsRef, orderBy("name"), startAfter(lastDoc), limit(this.pageSize));
      } 
      else if (direction === 'prev') {
          if (this.currentPage <= 1) { this.isLoading = false; return; }
          // 이전 페이지 로드: '전전' 페이지의 마지막 문서가 '이전' 페이지의 시작점
          // 예: 3페이지 -> 2페이지로 갈 때: 1페이지의 끝(cursors[0])이 시작점.
          // Formula: targetPage = currentPage - 1. Cursor index = targetPage - 2.
          const targetPage = this.currentPage - 1;
          const cursorIndex = targetPage - 2;
          
          if (cursorIndex < 0) {
              // 1페이지로 돌아감
              q = query(studentsRef, orderBy("name"), limit(this.pageSize));
          } else {
              const prevCursor = this.pageCursors[cursorIndex];
              q = query(studentsRef, orderBy("name"), startAfter(prevCursor), limit(this.pageSize));
          }
      }

      const snapshot = await getDocs(q);
      
      // 2. 데이터 처리
      if (snapshot.empty) {
          if (direction === 'first') {
              this.elements.studentsList.innerHTML = '<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>';
              this.updateButtons(0);
          } else {
              showToast("더 이상 데이터가 없습니다.");
              this.nextBtn.disabled = true; // 다음 버튼 비활성화
          }
          return;
      }

      // 3. 상태 업데이트
      const newStudents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      this.app.state.students = newStudents; // 목록 교체 (append 아님)

      // 커서 관리
      if (direction === 'next') {
          // 다음 페이지로 갔을 때만 현재 페이지의 끝을 저장
          // (단, 이미 저장된 경우 중복 저장 방지 - pageCursors는 순차적으로 쌓임)
          if (this.pageCursors.length < this.currentPage) {
               this.pageCursors.push(snapshot.docs[snapshot.docs.length - 1]);
          } else {
               // 혹시 다시 로드된 경우 업데이트
               this.pageCursors[this.currentPage - 1] = snapshot.docs[snapshot.docs.length - 1];
          }
          this.currentPage++;
      } else if (direction === 'prev') {
          this.currentPage--;
          // 뒤로 가도 기존 커서는 유지 (나중에 다시 앞으로 갈 때 사용)
      } else { // first
          this.currentPage = 1;
          this.pageCursors = [snapshot.docs[snapshot.docs.length - 1]];
      }

      // 4. UI 렌더링
      this.elements.studentsList.innerHTML = ""; // 기존 목록 비우기
      newStudents.forEach(s => this.renderStudent(s));

      // 5. 버튼 상태 업데이트
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
      // 이전 버튼: 1페이지면 비활성화
      if (this.prevBtn) this.prevBtn.disabled = (this.currentPage <= 1);
      
      // 다음 버튼: 가져온 개수가 페이지 크기보다 작으면 마지막 페이지임
      if (this.nextBtn) this.nextBtn.disabled = (loadedCount < this.pageSize);
  },

  async addNewStudent() {
    const name = this.elements.newStudentNameInput.value.trim();
    const phone = this.elements.newStudentPhoneInput.value.trim();
    const parentPhone = this.elements.newParentPhoneInput.value.trim();
    
    if (!name || !phone) return showToast("이름과 전화번호는 필수입니다.");

    try {
      await addDoc(collection(db, "students"), {
        name, phone, parentPhone: parentPhone || null,
        password: phone.slice(-4), isInitialPassword: true,
        createdAt: serverTimestamp(), classId: null
      });

      showToast(`${name} 학생이 추가되었습니다.`, false);
      this.elements.newStudentNameInput.value = "";
      this.elements.newStudentPhoneInput.value = "";
      this.elements.newParentPhoneInput.value = "";
      
      // 추가하면 1페이지로 돌아가서 확인
      this.loadPage('first');

    } catch (e) {
      console.error("학생 추가 실패:", e);
      showToast("학생 추가 실패", true);
    }
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
        showToast("삭제되었습니다.", false);
        // 현재 페이지 새로고침
        const currentDir = this.currentPage > 1 ? 'next' : 'first'; 
        // next 로직이 current++ 하므로, 그냥 현재 상태 유지하며 로드하려면 약간의 트릭이 필요하지만
        // 간단히 first로 보내거나, 삭제된 자리를 채우기 어려우므로 first로 보냅니다.
        this.loadPage('first');
      }
    } else if (e.target.classList.contains("edit-student-btn")) {
      this.openEditModal(id);
    }
  },
  
  openEditModal(studentId) {
      const studentData = this.app.state.students.find(s => s.id === studentId);
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
        name, phone, parentPhone: parentPhone || null,
        password: phone.slice(-4), isInitialPassword: true, 
      });
      showToast("수정되었습니다.", false);
      this.closeEditModal();
      // 현재 페이지 데이터 갱신을 위해 1페이지로 리셋
      this.loadPage('first');
    } catch (e) {
      showToast("수정 실패", true);
    }
  }
};