// src/student/studentAuth.js

import { getFunctions, httpsCallable } from "firebase/functions";
// 👇 [수정] setPersistence, browserLocalPersistence 추가
import { signInWithCustomToken, setPersistence, browserLocalPersistence } from "firebase/auth";
import { app, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentAuth = {
    app: null,
    elements: {
        classSelect: 'student-class-select',
        nameInput: 'student-name-input',
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
        this.el = {
            classSelect: document.getElementById(this.elements.classSelect),
            nameInput: document.getElementById(this.elements.nameInput),
            passwordInput: document.getElementById(this.elements.passwordInput),
            loginBtn: document.getElementById(this.elements.loginBtn)
        };
    },

    addEventListeners() {
        this.el.classSelect?.addEventListener('change', () => {
             // 필요 시 로직 추가
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
        const studentName = this.el.nameInput?.value.trim();
        const password = this.el.passwordInput?.value.trim();

        if (!classId || !studentName || !password) {
            showToast("반, 이름, 비밀번호를 모두 입력해주세요.", true);
            return;
        }

        showToast("로그인 중...", false);

        try {
            // 🚀 [핵심 수정] 로그인 상태 영구 유지 설정 (앱 꺼도 유지됨)
            await setPersistence(auth, browserLocalPersistence);

            const functions = getFunctions(app, 'asia-northeast3');
            const verifyLoginFn = httpsCallable(functions, 'verifyStudentLogin');
            const result = await verifyLoginFn({ classId, studentName, password });
            
            if (result.data.success) {
                // 설정 적용 후 로그인
                await signInWithCustomToken(auth, result.data.token);
                
                // 로그인 성공 후 처리
                if (this.app && this.app.onLoginSuccess) {
                    this.app.onLoginSuccess(result.data.studentData, result.data.studentData.id);
                }
            } else {
                showToast(result.data.message || "로그인 실패", true);
            }
        } catch (e) {
            console.error(e);
            showToast("로그인 처리 중 오류가 발생했습니다.", true);
        }
    }
};