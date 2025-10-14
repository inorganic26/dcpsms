// src/student/studentAuth.js

import { collection, getDocs, where, query } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentAuth = {
    // studentApp.js의 전체 컨텍스트를 전달받아 초기화합니다.
    init(app) {
        this.app = app;

        // 로그인 관련 이벤트 리스너를 설정합니다.
        this.app.elements.loginBtn?.addEventListener('click', () => this.handleLogin());
        
        // 엔터 키로 로그인 시도
        this.app.elements.nameInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.app.elements.passwordInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
    },

    // 로그인 화면에 반 목록을 채워넣는 함수
    async populateClassSelect() {
        const classSelect = this.app.elements.classSelect;
        if (!classSelect) return;
        classSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
        try {
            const snapshot = await getDocs(collection(db, 'classes'));
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                classSelect.appendChild(option);
            });
        } catch (error) {
            console.error("Error fetching classes:", error);
            showToast("반 목록을 불러오는 데 실패했습니다.");
        }
    },

    // 로그인 화면을 바로 표시합니다.
    showLoginScreen() {
        this.populateClassSelect(); // 반 목록을 불러옵니다.
        this.app.showScreen(this.app.elements.loginScreen);
    },

    // 로그인 버튼 클릭 시 인증을 처리합니다.
    async handleLogin() {
        const { classSelect, nameInput, passwordInput } = this.app.elements;
        const classId = classSelect.value;
        const name = nameInput.value.trim();
        const password = passwordInput.value.trim();

        if (!classId || !name || !password) { 
            showToast("반, 이름, 비밀번호를 모두 입력해주세요."); 
            return; 
        }

        // 입력된 정보로 학생을 찾습니다.
        const q = query(
            collection(db, 'students'), 
            where("classId", "==", classId),
            where("name", "==", name), 
            where("password", "==", password)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            // 한번 더, 미배정 학생 중에서 찾아봅니다.
             const unassignedQ = query(
                collection(db, 'students'), 
                where("classId", "==", null),
                where("name", "==", name), 
                where("password", "==", password)
            );
            const unassignedSnapshot = await getDocs(unassignedQ);
            if (unassignedSnapshot.empty) {
                showToast("입력한 정보와 일치하는 학생이 없습니다.");
                return;
            }
            
            const studentDoc = unassignedSnapshot.docs[0];
            const studentData = studentDoc.data();
            showToast(`환영합니다, ${studentData.name} 학생! 아직 배정된 반이 없습니다.`, false);
            // studentApp의 state를 업데이트합니다.
            this.app.state.studentId = studentDoc.id; 
            this.app.state.studentName = studentData.name; 
            this.app.state.classId = null; // classId는 null로 설정
            
            // 반이 없으므로 과목 선택 화면만 보여줍니다.
            await this.app.loadAvailableSubjects();
            this.app.showSubjectSelectionScreen();
            return;
        }
        
        // 일치하는 학생이 한 명일 경우 로그인 처리
        if (querySnapshot.size === 1) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();

            showToast(`환영합니다, ${studentData.name} 학생!`, false);
            // studentApp의 state를 업데이트합니다.
            this.app.state.studentId = studentDoc.id; 
            this.app.state.studentName = studentData.name; 
            this.app.state.classId = studentData.classId;
            
            // 로그인 성공 후 다음 단계로 넘어갑니다.
            await this.app.loadAvailableSubjects();
            this.app.showSubjectSelectionScreen();
        } else {
            // 혹시 모를 중복 데이터에 대한 처리
            showToast("계정 정보가 중복되어 로그인할 수 없습니다. 관리자에게 문의하세요.");
        }
    },
};