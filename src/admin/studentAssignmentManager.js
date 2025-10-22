// src/admin/studentAssignmentManager.js
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

/**
 * 반 배정 화면 매니저
 * - 왼쪽(출발 반) 목록에서 학생 선택 → 오른쪽(도착 반)으로 배정
 * - "배정하기" 후: DB 반영 + UI 즉시 이동(왼쪽 제거, 오른쪽 추가)
 * - 컨테이너 없을 경우 JS가 자동 생성(자가 치유)
 */
export const studentAssignmentManager = {
  app: null,
  elements: null,
  state: null,

  init(app) {
    this.app = app;

    // ===== DOM 캐싱 =====
    this.elements = {
      // 좌측(출발 반)
      sourceClassSelect: document.getElementById("admin-source-class-select"),
      studentSearchInput: document.getElementById(
        "admin-student-search-input-assignment"
      ),
      sourceStudentList: document.getElementById("admin-source-student-list"),

      // 우측(도착 반)
      targetClassSelect: document.getElementById("admin-target-class-select"),
      targetStudentList: document.getElementById("admin-target-student-list"),

      // 실행 버튼
      assignBtn: document.getElementById("admin-assign-students-btn"),
    };

    // 우측 컨테이너가 없으면 자동 생성 (자가 치유)
    if (!this.elements.targetStudentList && this.elements.targetClassSelect) {
      const rightCard = this.elements.targetClassSelect.closest(".content-card");
      if (rightCard) {
        const placeholder = document.createElement("div");
        placeholder.id = "admin-target-student-list";
        placeholder.className =
          "space-y-2 p-2 border rounded-lg min-h-[300px] overflow-y-auto custom-scrollbar bg-white mb-6";
        placeholder.innerHTML =
          '<p class="text-sm text-slate-400">오른쪽 상단에서 배정할 반을 선택하세요.</p>';

        // 드롭다운 바로 아래에 삽입 (버튼 위)
        const buttonRow = document.getElementById("admin-assign-students-btn");
        if (buttonRow && buttonRow.parentElement) {
          rightCard.insertBefore(placeholder, buttonRow.parentElement);
        } else {
          rightCard.appendChild(placeholder);
        }
        this.elements.targetStudentList = placeholder;
      }
    }

    // ===== 상태 =====
    this.state = {
      sourceStudents: [],        // 좌측 현재 로드된 학생(검색 전 풀 리스트)
      selectedIds: new Set(),    // 좌측에서 선택된 학생 id
      targetStudents: [],        // 우측 현재 로드된 학생
    };

    // ===== 이벤트 =====
    this.elements.sourceClassSelect?.addEventListener("change", () =>
      this.handleSourceClassChange()
    );
    this.elements.targetClassSelect?.addEventListener("change", () =>
      this.handleTargetClassChange()
    );
    this.elements.studentSearchInput?.addEventListener("input", () =>
      this.renderSourceStudentList()
    );
    this.elements.assignBtn?.addEventListener("click", () =>
      this.assignStudents()
    );

    // 셀렉트 옵션 채우기 + 초기 표기
    this.populateClassSelects();
    this.resetView();
  },

  // 좌/우 셀렉트 옵션 채우기
  populateClassSelects() {
    const { classes } = this.app?.state || {};
    const srcSel = this.elements.sourceClassSelect;
    const tgtSel = this.elements.targetClassSelect;
    if (!srcSel || !tgtSel) return;

    srcSel.innerHTML = '<option value="unassigned">미배정</option>';
    tgtSel.innerHTML = '<option value="">-- 배정할 반 --</option>';

    if (!classes || classes.length === 0) return;
    classes.forEach((c) => {
      const opt = `<option value="${c.id}">${c.name}</option>`;
      srcSel.insertAdjacentHTML("beforeend", opt);
      tgtSel.insertAdjacentHTML("beforeend", opt);
    });
  },

  resetView() {
    if (this.elements.sourceStudentList) {
      this.elements.sourceStudentList.innerHTML =
        '<p class="text-sm text-slate-400">왼쪽 상단에서 반을 선택하세요.</p>';
    }
    if (this.elements.targetStudentList) {
      this.elements.targetStudentList.innerHTML =
        '<p class="text-sm text-slate-400">오른쪽 상단에서 배정할 반을 선택하세요.</p>';
    }
    if (this.elements.studentSearchInput) this.elements.studentSearchInput.value = "";
    this.state.sourceStudents = [];
    this.state.targetStudents = [];
    this.state.selectedIds.clear();
  },

  // ======= 좌측(출발 반) 변경 =======
  async handleSourceClassChange() {
    const srcSel = this.elements.sourceClassSelect;
    const listEl = this.elements.sourceStudentList;
    if (!srcSel || !listEl) return;

    const classId = srcSel.value;
    listEl.innerHTML = '<div class="loader-small mx-auto my-4"></div>';

    try {
      let qy;
      if (classId === "unassigned") {
        qy = query(collection(db, "students"), where("classId", "==", null));
      } else if (classId) {
        qy = query(collection(db, "students"), where("classId", "==", classId));
      } else {
        this.state.sourceStudents = [];
        this.state.selectedIds.clear();
        this.renderSourceStudentList();
        return;
      }

      const snap = await getDocs(qy);
      this.state.sourceStudents = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.state.selectedIds.clear();
      this.renderSourceStudentList();
    } catch (e) {
      console.error("[Assignment] source fetch error:", e);
      listEl.innerHTML = '<p class="text-red-500">학생 목록 로딩 실패</p>';
    }
  },

  // ======= 우측(도착 반) 변경 =======
  async handleTargetClassChange() {
    const tgtSel = this.elements.targetClassSelect;
    const listEl = this.elements.targetStudentList;
    if (!tgtSel || !listEl) return;

    const classId = tgtSel.value;
    if (!classId) {
      listEl.innerHTML =
        '<p class="text-sm text-slate-400">오른쪽 상단에서 배정할 반을 선택하세요.</p>';
      this.state.targetStudents = [];
      return;
    }

    listEl.innerHTML = '<div class="loader-small mx-auto my-4"></div>';

    try {
      const qy = query(collection(db, "students"), where("classId", "==", classId));
      const snap = await getDocs(qy);
      this.state.targetStudents = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.renderTargetStudentList();
    } catch (e) {
      console.error("[Assignment] target fetch error:", e);
      listEl.innerHTML = '<p class="text-red-500">반 학생 목록 로딩 실패</p>';
    }
  },

  // ======= 좌측 목록 렌더 & 선택 토글 =======
  renderSourceStudentList() {
    const listEl = this.elements.sourceStudentList;
    const search = (this.elements.studentSearchInput?.value || "").toLowerCase();
    if (!listEl) return;

    listEl.innerHTML = "";

    const filtered = this.state.sourceStudents.filter(
      (s) =>
        s.name.toLowerCase().includes(search) ||
        (s.phone && s.phone.includes(search))
    );

    if (filtered.length === 0) {
      listEl.innerHTML =
        '<p class="text-sm text-slate-400">학생이 없거나 검색 결과가 없습니다.</p>';
      return;
    }

    filtered.forEach((s) => {
      const isSel = this.state.selectedIds.has(s.id);
      const div = document.createElement("div");
      div.className =
        "p-3 border rounded-lg cursor-pointer transition select-none " +
        (isSel ? "bg-blue-100 border-blue-300" : "bg-white");
      div.dataset.id = s.id;
      div.textContent = `${s.name} (${s.phone || "번호없음"})`;

      div.addEventListener("click", () => {
        if (this.state.selectedIds.has(s.id)) {
          this.state.selectedIds.delete(s.id);
          div.classList.remove("bg-blue-100", "border-blue-300");
          div.classList.add("bg-white");
        } else {
          this.state.selectedIds.add(s.id);
          div.classList.add("bg-blue-100", "border-blue-300");
          div.classList.remove("bg-white");
        }
      });

      listEl.appendChild(div);
    });
  },

  // ======= 우측 목록 렌더 =======
  renderTargetStudentList() {
    const listEl = this.elements.targetStudentList;
    if (!listEl) return;

    listEl.innerHTML = "";
    if (this.state.targetStudents.length === 0) {
      listEl.innerHTML =
        '<p class="text-sm text-slate-400">해당 반에 학생이 없습니다.</p>';
      return;
    }

    this.state.targetStudents.forEach((s) => {
      const div = document.createElement("div");
      div.className = "p-3 border rounded-lg bg-white";
      div.textContent = `${s.name} (${s.phone || "번호없음"})`;
      div.dataset.id = s.id;
      listEl.appendChild(div);
    });
  },

  // ======= 배정 실행 =======
  async assignStudents() {
    const srcSel = this.elements.sourceClassSelect;
    const tgtSel = this.elements.targetClassSelect;
    if (!tgtSel || !srcSel) return;

    const targetClassId = tgtSel.value;
    if (!targetClassId) {
      showToast("배정할 반을 선택하세요.");
      return;
    }

    if (this.state.selectedIds.size === 0) {
      showToast("배정할 학생을 한 명 이상 선택하세요.");
      return;
    }

    const sourceClassId = srcSel.value;
    if (
      sourceClassId &&
      sourceClassId !== "unassigned" &&
      sourceClassId === targetClassId
    ) {
      showToast("같은 반으로는 배정할 수 없습니다.");
      return;
    }

    if (!confirm(`${this.state.selectedIds.size}명의 학생을 선택한 반으로 배정할까요?`))
      return;

    // 이동 대상
    const moving = this.state.sourceStudents.filter((s) =>
      this.state.selectedIds.has(s.id)
    );

    try {
      // 1) DB 업데이트
      const batch = writeBatch(db);
      moving.forEach((s) => {
        batch.update(doc(db, "students", s.id), { classId: targetClassId });
      });
      await batch.commit();

      // 2) UI 즉시 반영 — 왼쪽 제거
      const leftEl = this.elements.sourceStudentList;
      moving.forEach((s) => {
        this.state.sourceStudents = this.state.sourceStudents.filter(
          (x) => x.id !== s.id
        );
        const card = leftEl?.querySelector(`[data-id="${s.id}"]`);
        card?.parentElement?.removeChild(card);
      });

      // 3) 우측 추가
      const rightEl = this.elements.targetStudentList;
      if (rightEl && rightEl.querySelector("p")) rightEl.innerHTML = "";
      moving.forEach((s) => {
        if (!this.state.targetStudents.find((x) => x.id === s.id)) {
          this.state.targetStudents.push({ ...s, classId: targetClassId });
        }
        const div = document.createElement("div");
        div.className = "p-3 border rounded-lg bg-white";
        div.textContent = `${s.name} (${s.phone || "번호없음"})`;
        div.dataset.id = s.id;
        rightEl?.appendChild(div);
      });

      // 4) 선택 초기화
      this.state.selectedIds.clear();

      showToast("학생 배정이 완료되었습니다.", false);
    } catch (e) {
      console.error("[Assignment] assign error:", e);
      showToast(`배정 중 오류가 발생했습니다: ${e.message}`, true);
    }
  },
};
