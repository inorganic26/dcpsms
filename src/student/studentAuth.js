// src/student/studentAuth.js

// ✅ orderBy import 제거
import { collection, getDocs, where, query, getDoc, doc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentAuth = {
    init(app) {
        this.app = app;

        this.app.elements.loginBtn?.addEventListener('click', () => this.handleLogin());
        this.app.elements.passwordInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.app.elements.classSelect?.addEventListener('change', (e) => this.populateStudentNameSelect(e.target.value));
    },

    async populateClassSelect() {
        const classSelect = this.app.elements.classSelect;
        if (!classSelect) return;
        classSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
        try {
             // ✅ orderBy("name") 제거
            const q = query(collection(db, 'classes'));
            const snapshot = await getDocs(q);

            // ▼▼▼ [추가된 디버깅 코드] ▼▼▼
            console.log("Firestore Debug: classes 쿼리 실행됨");
            if (snapshot.empty) {
                console.warn("Firestore Debug: classes 컬렉션에 문서가 없습니다.");
                this.app.elements.classSelect.innerHTML = '<option value="">-- 등록된 반 없음 --</option>';
            } else {
                console.log(`Firestore Debug: 총 ${snapshot.size}개의 반 문서가 발견되었습니다.`);
                // 이름순으로 정렬 (클라이언트 측)
                const classes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                classes.sort((a, b) => a.name.localeCompare(b.name));

                classes.forEach(cls => {
                    const option = document.createElement('option');
                    option.value = cls.id;
                    option.textContent = cls.name;
                    classSelect.appendChild(option);
                });
            }
            // ▲▲▲ [추가된 디버깅 코드] ▲▲▲

        } catch (error) {
            console.error("Error fetching classes:", error);
            showToast("반 목록을 불러오는 데 실패했습니다. 네트워크 상태를 확인해주세요.", true);
            classSelect.innerHTML = '<option value="">-- 목록 로드 실패 --</option>';
        }
    },

    async populateStudentNameSelect(classId) {
        const nameSelect = this.app.elements.nameSelect;
        if (!nameSelect) return;
        nameSelect.innerHTML = '<option value="">-- 이름을 선택하세요 --</option>';
        nameSelect.disabled = true;

        if (!classId) return;

        try {
             // ✅ orderBy("name") 제거
            const q = query(collection(db, 'students'), where("classId", "==", classId));
            const snapshot = await getDocs(q);

            // 이름순으로 정렬 (클라이언트 측)
            const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            students.sort((a, b) => a.name.localeCompare(b.name));

            students.forEach(std => {
                const option = document.createElement('option');
                option.value = std.name; // value도 이름으로 설정
                option.textContent = std.name;
                nameSelect.appendChild(option);
            });
            nameSelect.disabled = students.length === 0; // 학생 없으면 비활성화 유지
        } catch (error) {
            console.error("Error fetching students:", error);
            showToast("학생 목록을 불러오는 데 실패했습니다.");
        }
    },


    showLoginScreen() {
        this.populateClassSelect();
        if(this.app.elements.nameSelect) this.app.elements.nameSelect.disabled = true; // 이름 선택 초기 비활성화
        if(this.app.elements.passwordInput) this.app.elements.passwordInput.value = ''; // 비밀번호 필드 초기화
        this.app.showScreen(this.app.elements.loginScreen);
    },

    async handleLogin() {
        const { classSelect, nameSelect, passwordInput } = this.app.elements;
        const classId = classSelect.value;
        const name = nameSelect.value;
        const password = passwordInput.value.trim();

        if (!classId || !name || !password) {
            showToast("반, 이름, 비밀번호를 모두 입력해주세요.");
            return;
        }

        this.app.showScreen(this.app.elements.loadingScreen); // 로딩 화면 표시

        let studentDoc = null;
        let studentData = null;

        try {
            // 입력된 정보로 학생을 찾습니다 (반 소속 학생 먼저)
            const q = query(
                collection(db, 'students'),
                where("classId", "==", classId),
                where("name", "==", name),
                where("password", "==", password) // ❗ 실제 앱에서는 해싱된 비밀번호 비교 필요
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                if (querySnapshot.size > 1) {
                    showToast("계정 정보가 중복되어 로그인할 수 없습니다. 관리자에게 문의하세요.");
                     this.showLoginScreen(); // 로그인 화면으로 복귀
                    return;
                }
                studentDoc = querySnapshot.docs[0];
                studentData = studentDoc.data();
            } else {
                 // 미배정 학생 중에서 찾아봅니다.
                 const unassignedQ = query(
                    collection(db, 'students'),
                    where("classId", "==", null), // classId가 null인 학생
                    where("name", "==", name),
                    where("password", "==", password) // ❗ 실제 앱에서는 해싱된 비밀번호 비교 필요
                );
                const unassignedSnapshot = await getDocs(unassignedQ);
                 if (!unassignedSnapshot.empty) {
                     if (unassignedSnapshot.size > 1) {
                         showToast("미배정 계정 정보가 중복되어 로그인할 수 없습니다. 관리자에게 문의하세요.");
                         this.showLoginScreen();
                         return;
                     }
                     studentDoc = unassignedSnapshot.docs[0];
                     studentData = studentDoc.data();
                 }
            }

            // 학생 정보 찾음
            if (studentDoc && studentData) {
                 showToast(`환영합니다, ${studentData.name} 학생!`, false);
                 this.app.state.studentId = studentDoc.id;
                 this.app.state.studentName = studentData.name;
                 this.app.state.classId = studentData.classId; // null일 수도 있음

                 // ✅ 반 유형(classType) 가져오기
                 if (studentData.classId) {
                     const classDocRef = doc(db, 'classes', studentData.classId);
                     const classDocSnap = await getDoc(classDocRef);
                     if (classDocSnap.exists()) {
                         this.app.state.classType = classDocSnap.data().classType || 'self-directed';
                     } else {
                         console.warn(`Class document not found for ID: ${studentData.classId}, defaulting to self-directed.`);
                         this.app.state.classType = 'self-directed'; // 반 정보 없으면 기본값
                     }
                 } else {
                      this.app.state.classType = 'self-directed'; // 미배정 시 기본값
                 }

                 // 과목 로드 및 메인 화면 표시
                 await this.app.loadAvailableSubjects(); // loadAvailableSubjects가 classType을 사용하도록 수정됨

            } else {
                 showToast("입력한 정보와 일치하는 학생이 없습니다.");
                 this.showLoginScreen(); // 로그인 실패 시 로그인 화면으로
            }

        } catch (error) {
             console.error("Login process error:", error);
             showToast("로그인 처리 중 오류가 발생했습니다.");
             this.showLoginScreen(); // 오류 시 로그인 화면으로
        }
    },
};