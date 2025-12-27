// src/admin/adminAuth.js
import { signInAnonymously } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const adminAuth = {
    app: null,
    elements: {
        initialLogin: 'admin-initial-login',
        secretPasswordInput: 'admin-secret-password',
        secretLoginBtn: 'admin-secret-login-btn',
        mainDashboard: 'admin-main-dashboard',
    },

    init(app) {
        this.app = app;
        this.cacheElements();
        this.bindEvents();
        
        // 초기 화면 설정
        this.showLoginScreen();
    },

    cacheElements() {
        // 요소 ID로 DOM 객체 찾기
        this.dom = {};
        for (const [key, id] of Object.entries(this.elements)) {
            this.dom[key] = document.getElementById(id);
        }
    },

    bindEvents() {
        this.dom.secretLoginBtn?.addEventListener("click", () => this.handleAdminLogin());
        this.dom.secretPasswordInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.handleAdminLogin();
        });
    },

    showLoginScreen() {
        if (this.dom.initialLogin) this.dom.initialLogin.style.display = "flex";
        if (this.dom.mainDashboard) this.dom.mainDashboard.style.display = "none";
    },

    async handleAdminLogin() {
        const password = this.dom.secretPasswordInput?.value || "";
        if (!password) { showToast("비밀번호 입력 필요", true); return; }
        
        showToast("로그인 중...", false);

        try {
            // 1. 익명 로그인 (Firebase 연결)
            if (!auth.currentUser) await signInAnonymously(auth);
            
            // 2. 비밀번호 검증 함수 호출 (Cloud Functions)
            const functions = getFunctions(app, 'asia-northeast3');
            const verifyPassword = httpsCallable(functions, 'verifyAdminPassword');
            
            await verifyPassword({ password });
            
            // 3. 토큰 갱신 (관리자 권한 적용)
            await auth.currentUser.getIdToken(true);

            showToast("관리자 로그인 성공", false);
            
            // 4. 화면 전환
            if (this.dom.initialLogin) this.dom.initialLogin.style.display = "none";
            if (this.dom.mainDashboard) this.dom.mainDashboard.style.display = "block";

            // 5. 앱 초기화 (데이터 로딩 시작)
            setTimeout(() => {
                this.app.initializeAppUI(true);
                this.app.showView("dashboard");
            }, 50);

        } catch (e) {
            console.error(e);
            showToast("로그인 실패: 비밀번호 확인 필요", true);
        }
    }
};