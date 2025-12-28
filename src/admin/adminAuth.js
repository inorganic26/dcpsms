// src/admin/adminAuth.js
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
// [수정됨] app을 중괄호 { } 안에 넣어 가져옴
import { app, auth } from "../shared/firebase.js"; 
import { showToast } from "../shared/utils.js";

// 🔒 선생님이 화면에 입력할 비밀번호
const MY_SECRET_PASS = "qkraudtls0626^^";

// 🔑 내부적으로 사용할 시스템 계정 (이 계정으로 DB 권한 획득)
const SYSTEM_ADMIN_EMAIL = "inorganic26@gmail.com"; 
const SYSTEM_ADMIN_PW = "qkraudtls0626^^"; 

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
        
        // 이미 관리자 이메일로 로그인되어 있는지 확인
        onAuthStateChanged(auth, (user) => {
            if (user && user.email === SYSTEM_ADMIN_EMAIL) {
                // 이미 인증됨 -> 바로 대시보드로 이동
                this.showDashboard();
                // 약간의 지연 후 UI 초기화 (안전장치)
                setTimeout(() => {
                    if(this.app.initializeAppUI) {
                        this.app.initializeAppUI(true);
                        this.app.showView("dashboard");
                    }
                }, 100);
            } else {
                this.showLoginScreen();
            }
        });
    },

    cacheElements() {
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

    showDashboard() {
        if (this.dom.initialLogin) this.dom.initialLogin.style.display = "none";
        if (this.dom.mainDashboard) this.dom.mainDashboard.style.display = "block";
    },

    async handleAdminLogin() {
        const inputPw = this.dom.secretPasswordInput?.value || "";
        
        // 1. 입력한 비밀번호 확인
        if (inputPw !== MY_SECRET_PASS) {
            showToast("비밀번호가 틀렸습니다.", true);
            return;
        }
        
        showToast("관리자 권한 확인 중...", false);

        try {
            // 2. 시스템 계정으로 로그인 시도
            await signInWithEmailAndPassword(auth, SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_PW);
            showToast("로그인 성공!", false);
            
        } catch (e) {
            console.error(e);
            alert("시스템 로그인 실패: 파이어베이스 Authentication 메뉴에서 'inorganic26@gmail.com' 계정이 생성되어 있는지 확인해주세요.");
        }
    }
};