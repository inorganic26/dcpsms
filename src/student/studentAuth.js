// src/student/studentAuth.js

import { collection, doc, getDocs, getDoc, where, query } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentAuth = {
    // studentApp.js의 전체 컨텍스트를 전달받아 초기화합니다.
    init(app) {
        this.app = app;

        // 로그인 관련 이벤트 리스너를 설정합니다.
        this.app.elements.classSelect?.addEventListener('change', (e) => this.onClassSelect(e.target.value));
        this.app.elements.nameSelect?.addEventListener('change', () => this.onNameSelect());
        this.app.elements.loginBtn?.addEventListener('click', () => this.handleLogin());
    },

    // 로그인 화면을 표시하고 반 목록을 불러옵니다.
    async showLoginScreen() {
        this.app.showScreen(this.app.elements.loadingScreen);
        const q = query(collection(db, 'classes'));
        try {
            const snapshot = await getDocs(q);
            this.app.elements.classSelect.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            snapshot.forEach(doc => this.app.elements.classSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            this.app.showScreen(this.app.elements.loginScreen);
        } catch (error) { 
            console.error("반 목록 로딩 실패:", error); 
        }
    },

    // 반 선택 시 학생 목록을 불러옵니다.
    async onClassSelect(classId) {
        const { nameSelect, passwordInput, loginBtn } = this.app.elements;
        nameSelect.innerHTML = '<option value="">-- 이름을 선택하세요 --</option>';
        nameSelect.disabled = true; 
        passwordInput.disabled = true; 
        loginBtn.disabled = true; 
        passwordInput.value = '';
        
        if (!classId) return;

        const q = query(collection(db, 'students'), where("classId", "==", classId));
        const snapshot = await getDocs(q);
        const students = [];
        snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
        students.sort((a,b) => a.name.localeCompare(b.name));
        students.forEach(student => nameSelect.innerHTML += `<option value="${student.id}">${student.name}</option>`);
        nameSelect.disabled = false;
    },

    // 이름 선택 시 비밀번호 입력창과 로그인 버튼을 활성화합니다.
    onNameSelect() {
        const { nameSelect, passwordInput, loginBtn } = this.app.elements;
        const isEnabled = !!nameSelect.value;
        passwordInput.disabled = !isEnabled; 
        loginBtn.disabled = !isEnabled; 
        passwordInput.value = '';
    },

    // 로그인 버튼 클릭 시 인증을 처리합니다.
    async handleLogin() {
        const { nameSelect, passwordInput } = this.app.elements;
        const studentId = nameSelect.value;
        const password = passwordInput.value;

        if (!studentId || !password) { 
            showToast("이름과 비밀번호를 모두 입력해주세요."); 
            return; 
        }

        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) { 
            showToast("학생 정보를 찾을 수 없습니다."); 
            return; 
        }

        const studentData = studentDoc.data();
        if (studentData.password === password) {
            showToast(`환영합니다, ${studentData.name} 학생!`, false);
            // studentApp의 state를 업데이트합니다.
            this.app.state.studentId = studentId; 
            this.app.state.studentName = studentData.name; 
            this.app.state.classId = studentData.classId;
            
            // 로그인 성공 후 다음 단계로 넘어갑니다.
            await this.app.loadAvailableSubjects();
            this.app.showSubjectSelectionScreen();
        } else { 
            showToast("비밀번호가 일치하지 않습니다."); 
        }
    },
};