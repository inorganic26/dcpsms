// src/admin/studentManager.js
import {
  collection,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  deleteDoc,
  updateDoc,
  getDoc,
  query,
} from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentManager = {
  editingStudentId: null, // 현재 수정 중인 학생 ID 저장
  app: null,
  elements: null,

  init(app) {
    this.app = app;

    // 요소 캐싱
    this.elements = {
      // 신규 등록 필드
      newStudentNameInput: document.getElementById("admin-new-student-name"),
      newStudentPhoneInput: document.getElementById("admin-new-student-phone"),
      newParentPhoneInput: document.getElementById("admin-new-parent-phone"),
      addStudentBtn: document.getElementById("admin-add-student-btn"),

      // 리스트 컨테이너 (여기에 '이벤트 위임' 1곳만 연결)
      studentsList: document.getElementById("admin-students-list"),

      // 수정 모달 필드
      editStudentModal: document.getElementById("admin-edit-student-modal"),
      closeEditStudentModalBtn: document.getElementById(
        "admin-close-edit-student-modal-btn"
      ),
      cancelEditStudentBtn: document.getElementById(
        "admin-cancel-edit-student-btn"
      ),
      saveStudentEditBtn: document.getElementById("admin-save-student-edit-btn"),
      editStudentNameInput: document.getElementById("admin-edit-student-name"),
      editStudentPhoneInput: document.getElementById("admin-edit-student-phone"),
      editParentPhoneInput: document.getElementById("admin-edit-parent-phone"),
    };

    // 이벤트 리스너
    this.elements.addStudentBtn?.addEventListener("click", () =>
      this.addNewStudent()
    );

    // (핵심) 리스트 한 곳에만 이벤트 위임
    this.elements.studentsList?.addEventListener(
      "click",
      this.handleListClick.bind(this)
    );

    // 수정 모달 버튼
    this.elements.closeEditStudentModalBtn?.addEventListener("click", () =>
      this.closeEditStudentModal()
    );
    this.elements.cancelEditStudentBtn?.addEventListener("click", () =>
      this.closeEditStudentModal()
    );
    this.elements.saveStudentEditBtn?.addEventListener("click", () =>
      this.saveStudentChanges()
    );

    this.listenForStudents(); // 학생 목록 실시간 감지 시작
  },

  // =============== 신규 학생 추가 ===============
  async addNewStudent() {
    const studentNameInput = this.elements.newStudentNameInput;
    const phoneInput = this.elements.newStudentPhoneInput;
    const parentPhoneInput = this.elements.newParentPhoneInput;

    if (!studentNameInput || !phoneInput || !parentPhoneInput) {
      showToast("입력 필드를 찾을 수 없습니다.");
      console.error("Missing input elements for adding new student.");
      return;
    }

    const studentName = studentNameInput.value.trim();
    const phone = phoneInput.value.trim();
    const parentPhone = parentPhoneInput.value.trim();

    if (!studentName || !phone) {
      showToast("학생 이름과 학생 전화번호는 필수입니다.");
      return;
    }
    if (!/^\d+$/.test(phone) || phone.length < 4) {
      showToast("학생 전화번호는 4자리 이상의 숫자로 입력해주세요.");
      return;
    }
    if (parentPhone && !/^\d+$/.test(parentPhone)) {
      showToast("부모님 전화번호는 숫자만 입력해주세요.");
      return;
    }

    const password = phone.slice(-4); // 비밀번호는 학생 전화번호 뒷 4자리
    try {
      await addDoc(collection(db, "students"), {
        name: studentName,
        password, // 실제 앱에서는 해싱 권장
        phone,
        parentPhone: parentPhone || null,
        classId: null, // 초기에는 미배정
        createdAt: serverTimestamp(),
        isInitialPassword: true,
      });
      showToast(
        `새로운 학생 ${studentName} 추가됨 (비밀번호: ${password})`,
        false
      );

      // 입력 필드 초기화
      studentNameInput.value = "";
      phoneInput.value = "";
      parentPhoneInput.value = "";
    } catch (error) {
      console.error("학생 추가 실패:", error);
      showToast("학생 추가 실패.");
    }
  },

  // =============== 실시간 목록 감지/렌더링 ===============
  listenForStudents() {
    const listEl = this.elements.studentsList;
    if (!listEl) {
      console.error(
        "[studentManager] studentsList element not found in listenForStudents."
      );
      return;
    }
    console.log("[studentManager] Starting to listen for students..."); // 로그 추가

    const q = query(collection(db, "students"));
    onSnapshot(
      q,
      (snapshot) => {
        console.log(`[studentManager] Firestore snapshot received for students. Size: ${snapshot.size}`); // 로그 추가
        const students = [];
        snapshot.forEach((d) => students.push({ id: d.id, ...d.data() }));
        students.sort((a, b) => a.name.localeCompare(b.name));

        // 앱 상태 업데이트
        if (this.app && this.app.state) {
            this.app.state.students = students; // 전체 학생 목록 저장
            console.log(`[studentManager] Updated app.state.students with ${students.length} students.`);
        } else {
             console.error("[studentManager] AdminApp instance or state is not available for updating students!");
             return;
        }


        // 학생 명단 관리 뷰 렌더링 (현재 화면이 학생 관리일 경우에만)
        if (document.getElementById('admin-student-mgmt-view')?.style.display === 'block') {
            this.renderStudentListView();
        }

        // ======[ 학생 로딩 완료 이벤트 발생 ]======
        console.log("[studentManager] Dispatching 'studentsLoaded' event.");
        document.dispatchEvent(new CustomEvent('studentsLoaded'));
        // =====================================
      },
      (error) => {
        console.error("[studentManager] Error listening for students:", error);
        showToast("학생 목록 실시간 로딩 중 오류 발생.", true);
        if (listEl && document.getElementById('admin-student-mgmt-view')?.style.display === 'block') {
            listEl.innerHTML = '<p class="text-red-500">학생 목록 로딩 실패</p>';
        }
         // ======[ 오류 발생 시에도 이벤트 발생 (선택적) ]======
         console.log("[studentManager] Dispatching 'studentsLoaded' event (even on error).");
         document.dispatchEvent(new CustomEvent('studentsLoaded'));
         // =====================================
      }
    );
  },

  // =============== 학생 명단 관리 뷰 렌더링 함수 (분리) ===============
  renderStudentListView() {
    const listEl = this.elements.studentsList;
    if (!listEl || !this.app || !this.app.state) return;

    listEl.innerHTML = ""; // 전체 초기화

    const students = this.app.state.students;

    if (!students || students.length === 0) {
      listEl.innerHTML =
        '<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>';
      return;
    }

    const assigned = students.filter((s) => s.classId);
    const unassigned = students.filter((s) => !s.classId);

    // 미배정
    listEl.innerHTML +=
      '<h4 class="text-md font-semibold text-slate-600 mt-4">미배정 학생</h4>';
    if (unassigned.length === 0) {
      listEl.innerHTML +=
        '<p class="text-sm text-slate-400">미배정 학생이 없습니다.</p>';
    } else {
      unassigned.forEach((std) => this.renderStudentCard(std));
    }

    // 배정됨
    listEl.innerHTML +=
      '<h4 class="text-md font-semibold text-slate-600 mt-6">반 배정된 학생</h4>';
    if (assigned.length === 0) {
      listEl.innerHTML +=
        '<p class="text-sm text-slate-400">반 배정된 학생이 없습니다.</p>';
    } else {
      assigned.forEach((std) => this.renderStudentCard(std));
    }
     console.log("[studentManager] Student list view rendered.");
  },


  // =============== 학생 카드 렌더링 (데이터 속성 정리) ===============
  renderStudentCard(studentData) { // 함수 이름 변경: renderStudent -> renderStudentCard
    const listEl = this.elements.studentsList;
    if (!listEl) {
      console.error(
        "[studentManager] studentsList element not found in renderStudentCard."
      );
      return;
    }

    const className =
      this.app?.state?.classes?.find((c) => c.id === studentData.classId)
        ?.name || "미배정";

    const parentPhoneDisplay = studentData.parentPhone
      ? `<p class="text-xs text-slate-500">보호자: ${studentData.parentPhone}</p>`
      : "";

    const studentDiv = document.createElement("div");
    studentDiv.className =
      "p-3 border rounded-lg flex items-center justify-between";

    // data-*를 버튼에 명확히 부여 (이벤트 위임에서 참조)
    studentDiv.innerHTML = `
      <div>
        <span class="font-medium text-slate-700">${
          studentData.name
        } (${studentData.phone || "번호없음"})</span>
        <span class="text-xs text-slate-500 ml-2">[${className}]</span>
        ${parentPhoneDisplay}
      </div>
      <div class="flex gap-2 flex-shrink-0">
        <button
          class="edit-student-btn text-blue-500 hover:text-blue-700 text-sm font-semibold"
          data-id="${studentData.id}"
        >수정</button>
        <button
          class="reset-password-btn text-gray-500 hover:text-gray-700 text-sm font-semibold"
          data-id="${studentData.id}"
          data-name="${studentData.name}"
        >비밀번호 초기화</button>
        <button
          class="delete-student-btn text-red-500 hover:text-red-700 text-sm font-semibold"
          data-id="${studentData.id}"
          data-name="${studentData.name}"
        >삭제</button>
      </div>
    `;

    listEl.appendChild(studentDiv);
  },

  // =============== (핵심) 리스트 이벤트 위임 핸들러 ===============
  async handleListClick(e) {
    const btn = e.target.closest("button");
    if (!btn) return;

    // 어떤 버튼인지 분기
    if (btn.classList.contains("edit-student-btn")) {
      const id = btn.dataset.id;
      console.log("Edit button clicked:", id);
      this.openEditStudentModal(id);
      return;
    }

    if (btn.classList.contains("delete-student-btn")) {
      const id = btn.dataset.id;
      const name = btn.dataset.name || "";
      console.log("Delete button clicked:", id);
      if (confirm(`'${name}' 학생을 정말 삭제하시겠습니까?`)) {
        try {
          await deleteDoc(doc(db, "students", id));
          showToast("학생 삭제 완료.", false);
        } catch (error) {
          console.error("학생 삭제 실패:", error);
          showToast("학생 삭제 실패.");
        }
      }
      return;
    }

    if (btn.classList.contains("reset-password-btn")) {
      const id = btn.dataset.id;
      const name = btn.dataset.name || "";
      console.log("Reset password button clicked:", id);
      this.resetStudentPassword(id, name);
      return;
    }
  },

  // =============== 수정 모달 ===============
  async openEditStudentModal(studentId) {
    this.editingStudentId = studentId;
    if (!studentId) return;

    if (
      !this.elements.editStudentNameInput ||
      !this.elements.editStudentPhoneInput ||
      !this.elements.editParentPhoneInput ||
      !this.elements.editStudentModal
    ) {
      showToast("수정 화면 요소를 찾을 수 없습니다.");
      console.error("Missing elements for edit student modal.");
      return;
    }

    try {
      const studentRef = doc(db, "students", studentId);
      const snap = await getDoc(studentRef);

      if (snap.exists()) {
        const data = snap.data();
        this.elements.editStudentNameInput.value = data.name || "";
        this.elements.editStudentPhoneInput.value = data.phone || "";
        this.elements.editParentPhoneInput.value = data.parentPhone || "";

        this.elements.editStudentModal.style.display = "flex";
        document.body.classList.add("modal-open");
      } else {
        showToast("학생 정보를 찾을 수 없습니다.");
        this.editingStudentId = null;
      }
    } catch (error) {
      console.error("학생 정보 로딩 실패:", error);
      showToast("학생 정보 로딩 실패.");
      this.editingStudentId = null;
    }
  },

  closeEditStudentModal() {
    this.editingStudentId = null;
    if (this.elements.editStudentModal)
      this.elements.editStudentModal.style.display = "none";
    document.body.classList.remove("modal-open");
  },

  async saveStudentChanges() {
    if (!this.editingStudentId) return;

    if (
      !this.elements.editStudentNameInput ||
      !this.elements.editStudentPhoneInput ||
      !this.elements.editParentPhoneInput
    ) {
      showToast("수정 화면 입력 필드를 찾을 수 없습니다.");
      console.error("Missing input elements for saving student changes.");
      return;
    }

    const name = this.elements.editStudentNameInput.value.trim();
    const phone = this.elements.editStudentPhoneInput.value.trim();
    const parentPhone = this.elements.editParentPhoneInput.value.trim();

    if (!name || !phone) {
      showToast("이름과 학생 전화번호는 필수입니다.");
      return;
    }
    if (!/^\d+$/.test(phone) || phone.length < 4) {
      showToast("학생 전화번호는 4자리 이상의 숫자로 입력해주세요.");
      return;
    }
    if (parentPhone && !/^\d+$/.test(parentPhone)) {
      showToast("부모님 전화번호는 숫자만 입력해주세요.");
      return;
    }

    const newPassword = phone.slice(-4);
    const dataToUpdate = {
      name,
      phone,
      parentPhone: parentPhone || null,
      password: newPassword, // 실제로는 해싱 권장
      isInitialPassword: true,
    };

    try {
      const studentRef = doc(db, "students", this.editingStudentId);
      await updateDoc(studentRef, dataToUpdate);
      showToast("학생 정보가 성공적으로 수정되었습니다.", false);
      this.closeEditStudentModal();
    } catch (error) {
      console.error("학생 정보 수정 실패:", error);
      showToast("학생 정보 수정 실패.");
    }
  },

  // =============== 비밀번호 초기화 ===============
  async resetStudentPassword(studentId, studentName) {
    if (
      !confirm(
        `'${studentName}' 학생의 비밀번호를 전화번호 뒷 4자리로 초기화하시겠습니까?`
      )
    ) {
      return;
    }

    try {
      const ref = doc(db, "students", studentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        showToast("학생 정보를 찾을 수 없어 초기화할 수 없습니다.");
        return;
      }

      const phone = snap.data().phone;
      if (!phone || phone.length < 4) {
        showToast("전화번호 정보가 올바르지 않아 초기화 불가.");
        return;
      }

      const newPassword = phone.slice(-4);
      await updateDoc(ref, {
        password: newPassword,
        isInitialPassword: true,
      });
      showToast(`'${studentName}' 비밀번호 '${newPassword}'로 초기화 완료.`, false);
    } catch (error) {
      console.error("비밀번호 초기화 실패:", error);
      showToast("비밀번호 초기화 실패.");
    }
  },
};