// src/admin/adminAuth.js

// 👇 [수정] setPersistence, browserLocalPersistence 추가
import { signInWithEmailAndPassword, onAuthStateChanged, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

// 🔒 선생님이 화면에 입력할 비밀번호 (이걸 입력하면 아래 시스템 계정으로 로그인됨)
const MY_SECRET_PASS = "qkraudtls0626^^";

// 🔑 내부적으로 사용할 시스템 계정 (DB 권한을 가진 슈퍼 관리자)
const SYSTEM_ADMIN_EMAIL = "inorganic26@gmail.com"; 
const SYSTEM_ADMIN_PW = "qkraudtls0626^^"; 

export const adminAuth = {
    app: null,
    
    // HTML에 실제로 존재하는 ID들로 매핑
    elements: {
        initialLogin: 'admin-initial-login',      // 로그인 화면 전체 박스
        secretPasswordInput: 'admin-secret-password', // 비밀번호 입력창
        secretLoginBtn: 'admin-secret-login-btn',     // 로그인 버튼
        mainDashboard: 'admin-main-dashboard',    // 로그인 후 보여줄 대시보드
    },
    
    dom: {}, // 찾은 HTML 요소들을 저장할 곳

    init(app) {
        this.app = app;
        console.log("[AdminAuth] 초기화 시작");
        this.cacheElements();
        this.bindEvents();
        this.checkLoginStatus();
    },

    cacheElements() {
        // ID를 이용해 HTML 요소를 찾아서 저장
        for (const [key, id] of Object.entries(this.elements)) {
            const el = document.getElementById(id);
            if (el) {
                this.dom[key] = el;
            } else {
                console.warn(`⚠️ [AdminAuth] HTML에서 id='${id}' 요소를 찾을 수 없습니다.`);
            }
        }
    },

    bindEvents() {
        // 로그인 버튼 클릭 이벤트
        if (this.dom.secretLoginBtn) {
            this.dom.secretLoginBtn.addEventListener("click", (e) => {
                e.preventDefault(); // 새로고침 방지
                this.handleAdminLogin();
            });
        }

        // 비밀번호 입력창에서 엔터키 이벤트
        if (this.dom.secretPasswordInput) {
            this.dom.secretPasswordInput.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    e.preventDefault(); // 새로고침 방지
                    this.handleAdminLogin();
                }
            });
        }
    },

    checkLoginStatus() {
        // 현재 로그인 상태 확인
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // 로그인 된 상태라면
                if (user.email === SYSTEM_ADMIN_EMAIL) {
                    console.log("✅ 슈퍼 관리자 인증됨");
                    this.showDashboard();
                    
                    // 앱 UI 초기화 (약간의 딜레이를 두어 안전하게 로딩)
                    setTimeout(() => {
                        if(this.app && typeof this.app.initializeAppUI === 'function') {
                            this.app.initializeAppUI(true);
                            this.app.showView("dashboard");
                        }
                    }, 100);
                } else {
                    // 관리자 이메일이 아니면 로그아웃 시킴
                    alert("관리자 권한이 없는 계정입니다.");
                    signOut(auth);
                    this.showLoginScreen();
                }
            } else {
                // 로그아웃 상태라면 로그인 화면 표시
                this.showLoginScreen();
            }
        });
    },

    showLoginScreen() {
        if (this.dom.initialLogin) this.dom.initialLogin.style.display = "flex";
        if (this.dom.mainDashboard) this.dom.mainDashboard.style.display = "none";
        // 비밀번호 입력창 초기화
        if (this.dom.secretPasswordInput) this.dom.secretPasswordInput.value = "";
    },

    showDashboard() {
        if (this.dom.initialLogin) this.dom.initialLogin.style.display = "none";
        if (this.dom.mainDashboard) this.dom.mainDashboard.style.display = "block";
    },

    async handleAdminLogin() {
        const inputPw = this.dom.secretPasswordInput?.value || "";
        
        console.log("로그인 시도...");

        // 1. 선생님이 입력한 비밀번호가 맞는지 확인
        if (inputPw !== MY_SECRET_PASS) {
            alert("비밀번호가 틀렸습니다.");
            return;
        }
        
        if (typeof showToast === 'function') showToast("관리자 권한 확인 중...", false);

        try {
            // 🚀 [핵심 수정] 관리자 로그인 상태 영구 유지 설정
            await setPersistence(auth, browserLocalPersistence);

            // 2. 내부 시스템 계정으로 파이어베이스 로그인 시도
            await signInWithEmailAndPassword(auth, SYSTEM_ADMIN_EMAIL, SYSTEM_ADMIN_PW);
            console.log("로그인 성공!");
            // 성공하면 onAuthStateChanged가 감지하여 화면을 전환함
            
        } catch (e) {
            console.error("로그인 에러:", e);
            if (e.code === 'auth/invalid-credential' || e.code === 'auth/user-not-found' || e.code === 'auth/wrong-password') {
                alert("시스템 계정 로그인 실패: 이메일/비번을 확인해주세요.");
            } else {
                alert("로그인 오류: " + e.message);
            }
        }
    }
};