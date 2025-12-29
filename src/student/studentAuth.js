// src/student/studentAuth.js

import { getFunctions, httpsCallable } from "firebase/functions";
import { signInWithCustomToken } from "firebase/auth";
import { app, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentAuth = {
    app: null,
    elements: {
        classSelect: 'student-class-select',
        nameSelect: 'student-name-select',
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
            nameSelect: document.getElementById(this.elements.nameSelect),
            passwordInput: document.getElementById(this.elements.passwordInput),
            loginBtn: document.getElementById(this.elements.loginBtn)
        };
    },

    addEventListeners() {
        this.el.classSelect?.addEventListener('change', (e) => this.handleClassChange(e.target.value));
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

    async handleClassChange(classId) {
        if (!classId) {
            if (this.el.nameSelect) {
                this.el.nameSelect.innerHTML = '<option value="">이름을 선택해주세요</option>';
                this.el.nameSelect.disabled = true;
            }
            return;
        }

        try {
            if (this.el.nameSelect) {
                this.el.nameSelect.innerHTML = '<option>로딩 중...</option>';
                this.el.nameSelect.disabled = true;
            }

            const functions = getFunctions(app, 'asia-northeast3');
            const getStudentsFn = httpsCallable(functions, 'getStudentsInClassForLogin');
            const result = await getStudentsFn({ classId });
            
            const students = result.data || [];
            
            if (this.el.nameSelect) {
                this.el.nameSelect.innerHTML = '<option value="">이름을 선택해주세요</option>';
                students.forEach(s => {
                    this.el.nameSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
                });
                this.el.nameSelect.disabled = false;
            }
        } catch (e) {
            console.error(e);
            showToast("학생 목록을 불러오지 못했습니다.", true);
        }
    },

    async handleLogin() {
        const classId = this.el.classSelect?.value;
        const studentId = this.el.nameSelect?.value; // studentDocId
        const password = this.el.passwordInput?.value;

        if (!classId || !studentId || !password) {
            showToast("모든 항목을 입력해주세요.", true);
            return;
        }

        showToast("로그인 중...", false);

        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const verifyLoginFn = httpsCallable(functions, 'verifyStudentLogin');
            
            const result = await verifyLoginFn({ classId, studentId, password });
            
            if (result.data.success) {
                await signInWithCustomToken(auth, result.data.token);
                // 로그인 성공 시 App의 메서드 호출
                this.app.onLoginSuccess(result.data.studentData, studentId);
            } else {
                showToast(result.data.message || "로그인 실패", true);
            }
        } catch (e) {
            console.error(e);
            showToast("로그인 중 오류가 발생했습니다.", true);
        }
    }
};