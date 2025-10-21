// src/main.js

// Firebase 인증 관련 기능이 포털 페이지 자체에서 필요하다면
// 아래 import 문들의 주석을 해제하고 사용하세요.
// import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
// import { auth, ensureAnonymousAuth } from './shared/firebase.js';

// 전역 스타일시트는 계속 import 합니다.
import './shared/style.css';

// --- AppNavigator 관련 코드 제거 ---
// 각 앱(admin, teacher, student)은 이제 각자의 HTML 파일과
// 진입점 JavaScript 파일(예: adminApp.js)을 통해 독립적으로 로드되고 실행됩니다.
// main.js는 더 이상 앱 간의 화면 전환을 관리하지 않습니다.

/* // 기존 AppNavigator 코드 시작 (이제 사용되지 않음)
const AppNavigator = {
    views: {},
    initializedApps: {
        admin: false,
        teacher: false,
        student: false,
    },

    init() {
        this.views = {
            portal: document.getElementById('portal-view'),
            admin: document.getElementById('admin-view'),
            teacher: document.getElementById('teacher-view'),
            student: document.getElementById('student-view')
        };

        Object.values(this.views).forEach(view => {
            if(view) view.style.display = 'none';
        });

        document.getElementById('goto-admin-btn').addEventListener('click', () => this.showView('admin'));
        document.getElementById('goto-teacher-btn').addEventListener('click', () => this.showView('teacher'));
        document.getElementById('goto-student-btn').addEventListener('click', () => this.showView('student'));

        document.querySelectorAll('.back-to-portal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                // StudentApp이 초기화되었는지 확인 후 stopAllVideos 호출
                if (this.initializedApps.student && StudentApp) {
                    StudentApp.stopAllVideos();
                }
                this.showView('portal');
            });
        });

        this.showView('portal');
    },

    async showView(viewName) {
        Object.values(this.views).forEach(view => {
            if (view) view.style.display = 'none';
        });

        const viewToShow = this.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        }

        if (viewName !== 'portal' && !this.initializedApps[viewName]) {
            try {
                const appModule = await this.getAppModule(viewName);
                if (appModule) {
                    // 기본 내보내기(default export)를 사용하므로 .default로 접근
                    appModule.default.init();
                    this.initializedApps[viewName] = true;

                    // StudentApp의 경우, 전역에서 접근할 수 있도록 window 객체에 할당
                    if (viewName === 'student') {
                        window.StudentApp = appModule.default;
                    }
                }
            } catch (error) {
                console.error(`${viewName} App 로딩 실패:`, error);
            }
        }
    },

    // getAppModule을 동적 import를 사용하도록 수정
    getAppModule(appName) {
        switch(appName) {
            case 'admin':
                return import('./admin/adminApp.js');
            case 'teacher':
                return import('./teacher/teacherApp.js');
            case 'student':
                return import('./student/studentApp.js');
            default:
                return null;
        }
    }
};
*/ // 기존 AppNavigator 코드 끝

/* // 기존 DOMContentLoaded 이벤트 리스너 시작 (이제 사용되지 않음)
document.addEventListener('DOMContentLoaded', () => {
    // ensureAuth 대신 필요한 인증 함수 사용 (예: ensureAnonymousAuth)
    // ensureAuth(() => {
    //     AppNavigator.init(); // AppNavigator 초기화 제거
    // });

    // 만약 포털 자체에서 Firebase 인증이 필요하다면 여기에 로직 추가
    // 예: ensureAnonymousAuth(() => { console.log("Portal Authenticated"); });
});
*/ // 기존 DOMContentLoaded 이벤트 리스너 끝

// 포털 페이지 자체에서 특별히 실행해야 할 JavaScript 코드가 있다면 여기에 추가합니다.
// 예를 들어, 익명 인증이 필요하다면 아래와 같이 사용할 수 있습니다.
/*
import { ensureAnonymousAuth } from './shared/firebase.js';
document.addEventListener('DOMContentLoaded', () => {
    ensureAnonymousAuth(() => {
        console.log("포털 페이지 익명 인증 완료");
        // 포털 페이지 로드 후 필요한 추가 작업 수행
    });
});
*/

console.log("Portal main.js loaded. Navigation handled by browser."); // 로드 확인용 로그