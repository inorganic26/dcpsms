// src/student/studentAuth.js

import { collection, getDocs, where, query, getDoc, doc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentAuth = {
  init(app) {
    this.app = app;

    // 이벤트
    this.app.elements.loginBtn?.addEventListener("click", () => this.handleLogin());
    this.app.elements.passwordInput?.addEventListener("keyup", (e) => {
      if (e.key === "Enter") this.handleLogin();
    });
    this.app.elements.classSelect?.addEventListener("change", (e) =>
      this.populateStudentNameSelect(e.target.value)
    );
  },

  // 로그인 화면 진입
  showLoginScreen() {
    this.populateClassSelect();
    if (this.app.elements.nameSelect) this.app.elements.nameSelect.disabled = true;
    if (this.app.elements.passwordInput) this.app.elements.passwordInput.value = "";
    this.app.showScreen(this.app.elements.loginScreen);
  },

  // 반 목록 로드
  async populateClassSelect() {
    const classSelect = this.app.elements.classSelect;
    if (!classSelect) return;

    classSelect.innerHTML = `<option value="">-- 반을 선택하세요 --</option>`;

    try {
      const q = query(collection(db, "classes"));
      const snapshot = await getDocs(q);

      const classes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      // 이름순 정렬
      classes.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));

      classes.forEach((cls) => {
        const opt = document.createElement("option");
        opt.value = cls.id;
        opt.textContent = cls.name || "(이름 없음)";
        classSelect.appendChild(opt);
      });
    } catch (e) {
      console.error("[studentAuth] populateClassSelect error:", e);
      showToast("반 목록을 불러오는 중 오류가 발생했습니다.", true);
      classSelect.innerHTML = `<option value="">-- 목록 로드 실패 --</option>`;
    }
  },

  // 선택된 반의 학생 이름 목록 로드
  async populateStudentNameSelect(classId) {
    const nameSelect = this.app.elements.nameSelect;
    if (!nameSelect) return;

    nameSelect.innerHTML = `<option value="">-- 이름을 선택하세요 --</option>`;
    nameSelect.disabled = true;
    if (!classId) return;

    try {
      const q = query(collection(db, "students"), where("classId", "==", classId));
      const snapshot = await getDocs(q);

      const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
      students.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));

      students.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.name || s.id;
        opt.textContent = s.name || "(이름 없음)";
        nameSelect.appendChild(opt);
      });

      nameSelect.disabled = false;
    } catch (e) {
      console.error("[studentAuth] populateStudentNameSelect error:", e);
      showToast("이름 목록을 불러오는 중 오류가 발생했습니다.", true);
      nameSelect.innerHTML = `<option value="">-- 로드 실패 --</option>`;
      nameSelect.disabled = true;
    }
  },

  // 로그인 처리 (무한 로딩 방지: 성공/실패 모든 경로에서 다음 화면 보장)
  async handleLogin() {
    const { classSelect, nameSelect, passwordInput } = this.app.elements;
    const classId = classSelect?.value || "";
    const name = nameSelect?.value || "";
    const password = passwordInput?.value?.trim() || "";

    if (!classId || !name || !password) {
      showToast("반, 이름, 비밀번호를 모두 입력해주세요.");
      return;
    }

    // 로딩 화면
    this.app.showScreen(this.app.elements.loadingScreen);

    try {
      // 학생 검색
      const q = query(
        collection(db, "students"),
        where("classId", "==", classId),
        where("name", "==", name),
        where("password", "==", password) // 실제 서비스에서는 해시 비교 필요
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        showToast("입력한 정보와 일치하는 학생이 없습니다.", true);
        this.showLoginScreen();
        return;
      }

      const studentDoc = snap.docs[0];
      const student = { id: studentDoc.id, ...studentDoc.data() };

      // 반 정보 읽기 (타입)
      let className = "";
      let classType = "self-directed";
      try {
        const c = await getDoc(doc(db, "classes", classId));
        if (c.exists()) {
          const cd = c.data();
          className = cd.name || "";
          classType = cd.type || "self-directed"; // 'live-lecture' | 'self-directed'
        }
      } catch (e) {
        console.warn("[studentAuth] class doc read warning:", e);
      }

      // 상태 세팅
      this.app.state.studentName = student.name || name;
      this.app.state.classId = classId;
      this.app.state.className = className;
      this.app.state.classType = classType;
      // authUid는 app 초기화 시 ensureAnonymousAuth에서 들어옴

      // 과목 목록 로드 → 메뉴 표시
      await this.app.loadAvailableSubjects(); // 내부에서 showSubjectSelectionScreen 호출

    } catch (e) {
      console.error("[studentAuth] handleLogin error:", e);
      showToast("로그인 처리 중 오류가 발생했습니다.", true);
      this.showLoginScreen();
    }
  },
};