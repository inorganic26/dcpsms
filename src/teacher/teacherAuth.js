// src/teacher/teacherAuth.js

import { 
    signInWithCustomToken, 
    signOut, 
    onAuthStateChanged,
    setPersistence, 
    browserSessionPersistence 
} from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import app, { auth, db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const teacherAuth = {
    app: null,
    elements: {
        loginContainer: 'teacher-login-container',
        dashboardContainer: 'teacher-dashboard-container',
        nameInput: 'teacher-name',
        passwordInput: 'teacher-password',
        loginBtn: 'teacher-login-btn',
    },
    dom: {},

    async init(app) {
        this.app = app;
        this.cacheElements();
        this.bindEvents();
        
        // [핵심 수정] 앱 실행 시 무조건 로그아웃 (자동 로그인 방지)
        // 사용자가 명시적으로 로그인 버튼을 눌러야만 합니다.
        try {
            await signOut(auth);
            await setPersistence(auth, browserSessionPersistence);
            console.log("[Auth] 초기화: 자동 로그인 방지됨");
            this.showLoginScreen();
        } catch (error) {
            console.error("[Auth] 초기화 오류:", error);
        }

        // 로그인 상태 변화 감지 (로그인 버튼 클릭 후 처리용)
        this.checkAuthStatus();
    },

    cacheElements() {
        this.dom = {};
        for (const [key, id] of Object.entries(this.elements)) {
            this.dom[key] = document.getElementById(id);
        }
        this.dom.portalBtns = document.querySelectorAll('.back-to-portal-btn');
    },

    bindEvents() {
        this.dom.loginBtn?.addEventListener('click', () => this.handleLogin());
        this.dom.passwordInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleLogin();
        });

        this.dom.portalBtns?.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleLogout();
            });
        });
    },

    checkAuthStatus() {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                // 로그인 버튼을 눌러서 성공했을 때만 실행됨
                console.log("[Auth] 로그인 성공:", user.uid);
                await this.loadTeacherProfile(user.uid);
            } else {
                // 로그아웃 상태면 로그인 화면 유지
                this.showLoginScreen();
            }
        });
    },

    async loadTeacherProfile(uid) {
        try {
            const docRef = doc(db, "teachers", uid);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const teacherData = { id: uid, ...docSnap.data() };
                this.app.state.teacherData = teacherData;
                this.app.state.teacherId = uid;

                if (teacherData.isInitialPassword) {
                    this.showDashboard();
                    this.promptPasswordChange(uid);
                } else {
                    showToast(`${teacherData.name} 선생님, 환영합니다.`, false);
                    this.showDashboard();
                }
                
                // 앱 UI 초기화 (반 목록 로드 등)
                if (this.app.initializeAppUI) {
                    this.app.initializeAppUI();
                }

            } else {
                showToast("선생님 정보를 찾을 수 없습니다.", true);
                await signOut(auth);
            }
        } catch (e) {
            console.error("프로필 로드 오류:", e);
            this.showLoginScreen();
        }
    },

    async handleLogin() {
        const name = this.dom.nameInput?.value.trim();
        const password = this.dom.passwordInput?.value.trim();

        if (!name || !password) {
            showToast("이름과 비밀번호를 입력해주세요.", true);
            return;
        }
        
        showToast("로그인 확인 중...", false);

        try {
            const functions = getFunctions(app, 'asia-northeast3');
            const verifyLogin = httpsCallable(functions, 'verifyTeacherLogin');
            const result = await verifyLogin({ name, password });
            
            if (!result.data.success) {
                showToast(result.data.message, true);
                return;
            }

            // 성공 시 로그인 세션 시작 (이때 onAuthStateChanged가 반응함)
            await signInWithCustomToken(auth, result.data.token);

        } catch (error) {
            console.error("로그인 에러:", error);
            showToast("서버 연결 실패", true);
        }
    },

    async handleLogout() {
        if(confirm("로그아웃 하시겠습니까?")) {
            await signOut(auth);
            window.location.href = "/";
        }
    },

    async promptPasswordChange(uid) {
        setTimeout(async () => {
            const newPw = prompt("새 비밀번호를 설정해주세요 (6자리 이상)");
            if(newPw && newPw.length >= 6) {
                try {
                    await updateDoc(doc(db, "teachers", uid), { 
                        password: newPw, isInitialPassword: false 
                    });
                    alert("비밀번호가 변경되었습니다.");
                } catch(e) {
                    alert("비밀번호 저장 실패");
                }
            }
        }, 500);
    },

    showLoginScreen() {
        if(this.dom.loginContainer) this.dom.loginContainer.style.display = 'flex';
        if(this.dom.dashboardContainer) this.dom.dashboardContainer.style.display = 'none';
        // 입력창 비우기 (보안)
        if(this.dom.passwordInput) this.dom.passwordInput.value = '';
    },

    showDashboard() {
        if(this.dom.loginContainer) this.dom.loginContainer.style.display = 'none';
        if(this.dom.dashboardContainer) this.dom.dashboardContainer.style.display = 'block';
    }
};