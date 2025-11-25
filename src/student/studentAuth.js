// src/student/studentAuth.js

// ✅ [수정됨] 'where' 포함, 필요한 모든 모듈 import
import { collection, getDocs, query, getDoc, doc, orderBy, where } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentAuth = {
  init(app) {
    this.app = app;
    this.app.elements.loginBtn?.addEventListener("click", () => this.handleLogin());
    this.app.elements.passwordInput?.addEventListener("keyup", (e) => {
      if (e.key === "Enter") this.handleLogin();
    });
    this.app.elements.classSelect?.addEventListener("change", (e) =>
      this.populateStudentNameSelect(e.target.value)
    );
  },

  showLoginScreen() {
    this.populateClassSelect();
    if (this.app.elements.nameSelect) {
        this.app.elements.nameSelect.innerHTML = '<option value="">-- 이름을 선택하세요 --</option>';
        this.app.elements.nameSelect.disabled = true;
    }
    if (this.app.elements.passwordInput) {
        this.app.elements.passwordInput.value = "";
    }
    this.app.showScreen(this.app.elements.loginScreen);
  },

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
    }
  },

  async populateStudentNameSelect(classId) {
    const nameSelect = this.app.elements.nameSelect;
    if (!nameSelect) return;
    nameSelect.innerHTML = `<option value="">-- 이름을 선택하세요 --</option>`;
    nameSelect.disabled = true;
    if (!classId) return;

    try {
      // ✅ 'where' 함수 사용
      const q = query(collection(db, "students"), where("classId", "==", classId), orderBy("name"));
      const snapshot = await getDocs(q);
      const students = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      students.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.id; // 학생 문서 ID
        opt.textContent = s.name;
        nameSelect.appendChild(opt);
      });
      nameSelect.disabled = false;
    } catch (e) {
      console.error("[studentAuth] populateStudentNameSelect error:", e);
    }
  },

  async handleLogin() {
    const { nameSelect, passwordInput } = this.app.elements;
    const studentDocId = nameSelect?.value || "";
    const inputPassword = passwordInput?.value?.trim() || "";

    if (!studentDocId || !inputPassword) {
      showToast("이름을 선택하고 비밀번호를 입력해주세요.");
      return;
    }

    this.app.showScreen(this.app.elements.loadingScreen);

    const salt = "dcpsms_secure_key";
    const shadowEmail = `${studentDocId}@dcpsms.student`;
    const shadowPassword = `${inputPassword}${salt}`;

    try {
      const userCredential = await signInWithEmailAndPassword(auth, shadowEmail, shadowPassword);
      const user = userCredential.user;

      console.log("✅ 보안 로그인 성공! UID:", user.uid);

      const studentDocRef = doc(db, "students", user.uid);
      const studentDocSnap = await getDoc(studentDocRef);

      if (!studentDocSnap.exists()) {
          throw new Error("학생 데이터가 존재하지 않습니다.");
      }

      const studentData = { id: studentDocSnap.id, ...studentDocSnap.data() };

      this.app.state.studentName = studentData.name;
      this.app.state.studentDocId = studentData.id;
      this.app.state.classId = studentData.classId;

      if (studentData.classId) {
        const classDocRef = doc(db, "classes", studentData.classId);
        const classDocSnap = await getDoc(classDocRef);
        if (classDocSnap.exists()) {
          this.app.state.selectedClassData = { id: classDocSnap.id, ...classDocSnap.data() };
          this.app.state.className = classDocSnap.data().name;
          this.app.state.classType = classDocSnap.data().classType || "self-directed";
        }
      }

      await this.app.loadAvailableSubjects();
      this.app.showSubjectSelectionScreen();

    } catch (error) {
      console.error("로그인 실패:", error);
      let msg = "로그인 중 오류가 발생했습니다.";
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
          msg = "이름이나 비밀번호가 올바르지 않습니다. (관리자에게 재등록 요청)";
      }
      showToast(msg, true);
      
      // ✅ [수정됨] this.app.showLoginScreen() -> this.showLoginScreen()
      this.showLoginScreen(); 
    }
  },
};