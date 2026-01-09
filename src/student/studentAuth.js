// src/student/studentAuth.js

import { getFunctions, httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { app, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentAuth = {
    app: null,
    elements: {
        classSelect: 'student-class-select',
        nameInput: 'student-name-input', // [변경] Select -> Input (ID 확인 필수)
        passwordInput: 'student-password',
        loginBtn: 'student-login-btn'
    },

    init(app) {
        this.app = app;
        this.cacheElements();
        this.loadClasses();
        this.addEventListeners();
    },

    cacheElements() {
        // 실제 DOM 요소 캐싱
        this.el = {
            classSelect: document.getElementById(this.elements.classSelect),
            nameInput: document.getElementById(this.elements.nameInput), // [변경]
            passwordInput: document.getElementById(this.elements.passwordInput),
            loginBtn: document.getElementById(this.elements.loginBtn)
        };
    },

    addEventListeners() {
        // [변경] 반이 바뀌어도 학생 목록을 불러올 필요가 없으므로 로직 간소화
        this.el.classSelect?.addEventListener('change', (e) => {
            // 반 선택 시 필요한 UI 초기화 등이 있다면 여기에 작성
            if(this.el.nameInput) this.el.nameInput.value = '';
            if(this.el.passwordInput) this.el.passwordInput.value = '';
        });
        
        this.el.loginBtn?.addEventListener('click', () => this.handleLogin());
    },

    async loadClasses() {
        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const getClassesFn = httpsCallable(functions, 'getClassesForStudentLogin');
            const result = await getClassesFn();
            
            const classes = result.data || [];
            if (this.el.classSelect) {
                this.el.classSelect.innerHTML = '<option value="">반을 선택해주세요</option>';
                classes.forEach(c => {
                    this.el.classSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
                });
            }
        } catch (e) {
            console.error(e);
            showToast("반 목록을 불러오지 못했습니다.", true);
        }
    },

    async handleLogin() {
        const classId = this.el.classSelect?.value;
        const studentName = this.el.nameInput?.value.trim(); // [변경] 입력된 이름 가져오기
        const password = this.el.passwordInput?.value.trim();

        if (!classId || !studentName || !password) {
            showToast("모든 항목을 입력해주세요.", true);
            return;
        }

        showToast("로그인 중...", false);

        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const verifyLoginFn = httpsCallable(functions, 'verifyStudentLogin');
            
            // [변경] studentId 대신 studentName을 서버로 전송
            const result = await verifyLoginFn({ classId, studentName, password });
            
            if (result.data.success) {
                await signInWithCustomToken(auth, result.data.token);
                // 로그인 성공 시 App의 메서드 호출
                this.app.onLoginSuccess(result.data.studentData, result.data.studentData.id);
            } else {
                showToast(result.data.message || "로그인 실패", true);
            }
        } catch (e) {
            console.error(e);
            showToast("로그인 중 오류가 발생했습니다.", true);
        }
    }
};