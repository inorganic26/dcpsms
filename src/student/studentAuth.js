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
        this.app.elements.phoneInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
        this.app.elements.passwordInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });
    },

    // 로그인 화면을 바로 표시합니다.
    showLoginScreen() {
        this.app.showScreen(this.app.elements.loginScreen);
    },

    // 로그인 버튼 클릭 시 인증을 처리합니다.
    async handleLogin() {
        const { phoneInput, passwordInput } = this.app.elements;
        const phone = phoneInput.value.trim();
        const password = passwordInput.value.trim();

        if (!phone || !password) { 
            showToast("전화번호와 비밀번호를 모두 입력해주세요."); 
            return; 
        }

        // 입력된 전화번호와 비밀번호로 학생을 찾습니다.
        const q = query(
            collection(db, 'students'), 
            where("phone", "==", phone), 
            where("password", "==", password)
        );
        
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            showToast("전화번호 또는 비밀번호가 일치하지 않습니다.");
            return;
        }
        
        // 일치하는 학생이 한 명일 경우 로그인 처리
        if (querySnapshot.size === 1) {
            const studentDoc = querySnapshot.docs[0];
            const studentData = studentDoc.data();

            if (!studentData.classId) {
                showToast("아직 배정된 반이 없습니다. 관리자에게 문의하세요.");
                return;
            }

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