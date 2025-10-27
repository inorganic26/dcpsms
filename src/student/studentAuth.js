// src/student/studentAuth.js

import { collection, getDocs, where, query, getDoc, doc, orderBy } from "firebase/firestore"; // orderBy import 확인
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
      const q = query(collection(db, "classes"), orderBy("name"));
      const snapshot = await getDocs(q);
      const classes = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

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
      const q = query(
        collection(db, "students"),
        where("classId", "==", classId),
        orderBy("name")
      );
      const snapshot = await getDocs(q);
      const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      students.forEach((s) => {
        const opt = document.createElement("option");
        // 👇 수정: value에 학생 문서 ID 저장
        opt.value = s.id;
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

  // 로그인 처리
  async handleLogin() {
    const { classSelect, nameSelect, passwordInput } = this.app.elements;
    const classId = classSelect?.value || "";
    // 👇 수정: 이름 대신 학생 문서 ID 가져오기
    const studentDocId = nameSelect?.value || "";
    const password = passwordInput?.value?.trim() || "";

    // 👇 수정: studentDocId 확인
    if (!classId || !studentDocId || !password) {
      showToast("반, 이름, 비밀번호를 모두 입력해주세요.");
      return;
    }

    this.app.showScreen(this.app.elements.loadingScreen);

    try {
      // 👇 수정: studentDocId로 학생 문서 직접 조회
      const studentDocRef = doc(db, "students", studentDocId);
      const studentDocSnap = await getDoc(studentDocRef);

      let student = null;
      if (studentDocSnap.exists()) {
          const data = studentDocSnap.data();
          // classId 일치 및 비밀번호 확인
          if (data.classId === classId && data.password === password) {
              student = { id: studentDocSnap.id, ...data };
          }
      }

      if (!student) {
        showToast("입력한 정보와 일치하는 학생이 없거나 비밀번호가 틀립니다.", true);
        this.showLoginScreen();
        return;
      }

      let className = "";
      let classType = "self-directed";
      let classData = null;

      try {
        const classDocRef = doc(db, "classes", classId);
        const classDocSnap = await getDoc(classDocRef);
        if (classDocSnap.exists()) {
          classData = { id: classDocSnap.id, ...classDocSnap.data() };
          className = classData.name || "";
          classType = classData.classType || "self-directed";
          console.log("[studentAuth] Class data loaded:", classData);
        } else {
            console.warn("[studentAuth] Class document not found for ID:", classId);
            showToast("반 정보를 찾을 수 없습니다. 관리자에게 문의하세요.", true);
            this.showLoginScreen();
            return;
        }
      } catch (e) {
        console.error("[studentAuth] Failed to load class data:", e);
        showToast("반 정보를 불러오는 중 오류 발생.", true);
        this.showLoginScreen();
        return;
      }

      this.app.state.studentName = student.name;
      // 👇 수정: studentDocId 상태에 저장
      this.app.state.studentDocId = student.id; // Firestore 문서 ID 저장
      this.app.state.classId = classId;
      this.app.state.className = className;
      this.app.state.classType = classType;
      this.app.state.selectedClassData = classData;

      console.log(`[studentAuth] Login successful. Student Doc ID: ${this.app.state.studentDocId}, Name: ${this.app.state.studentName}`);

      // 사용 가능 과목 로드 후 화면 전환
      await this.app.loadAvailableSubjects();
      console.log("[studentAuth] Available subjects loaded. Navigating to subject selection.");
      this.app.showSubjectSelectionScreen();

    } catch (e) {
      console.error("[studentAuth] handleLogin error:", e);
      showToast("로그인 처리 중 오류가 발생했습니다.", true);
      this.showLoginScreen();
    }
  },
};