// main.js

import './style.css'; 
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
// 상단에서 직접 import 하던 부분을 제거합니다.
// import AdminApp from './adminApp.js';
// import TeacherApp from './teacherApp.js';
// import StudentApp from './studentApp.js';
import { auth, getAppId } from './firebase.js';

const AppNavigator = {
    views: {},
    apps: {}, // 로드된 앱을 캐싱하여 중복 로드를 방지합니다.

    init() {
        this.views = {
            portal: document.getElementById('portal-view'),
            admin: document.getElementById('admin-view'),
            teacher: document.getElementById('teacher-view'),
            student: document.getElementById('student-view')
        };

        // 각 버튼 클릭 이벤트를 async 함수로 변경합니다.
        document.getElementById('goto-admin-btn').addEventListener('click', async () => {
            await this.loadAndShowView('admin', './adminApp.js');
        });
        document.getElementById('goto-teacher-btn').addEventListener('click', async () => {
            await this.loadAndShowView('teacher', './teacherApp.js');
        });
        document.getElementById('goto-student-btn').addEventListener('click', async () => {
            const studentApp = await this.loadAndShowView('student', './studentApp.js');
            studentApp.showLoginScreen();
        });

        document.querySelectorAll('.back-to-portal-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (this.apps.student) {
                    this.apps.student.stopAllVideos();
                }
                this.showView('portal');
            });
        });

        document.getElementById('portal-session-id').textContent = getAppId();
        document.getElementById('reset-session-btn').addEventListener('click', () => {
            auth.signOut().then(() => {
                window.location.reload();
            });
        });

        // #student 해시 처리도 async/await으로 변경
        (async () => {
            if (window.location.hash === '#student') {
                const studentApp = await this.loadAndShowView('student', './studentApp.js');
                studentApp.showLoginScreen();
                const studentPortalBtn = document.querySelector('#student-view .back-to-portal-btn');
                if (studentPortalBtn) {
                    studentPortalBtn.style.display = 'none';
                }
            } else {
                this.showView('portal');
            }
        })();
    },

    // 뷰를 보여주는 로직과 앱을 로드하는 로직을 통합합니다.
    async loadAndShowView(viewName, appPath) {
        Object.values(this.views).forEach(view => {
            if(view) view.classList.remove('active-view');
        });
        if(this.views[viewName]) {
            this.views[viewName].classList.add('active-view');
        }

        // 앱이 아직 로드되지 않았다면 동적으로 import 합니다.
        if (!this.apps[viewName]) {
            const appModule = await import(appPath);
            this.apps[viewName] = appModule.default;
            this.apps[viewName].init();
        }
        return this.apps[viewName];
    },
    
    // 단순 뷰 전환을 위한 함수는 그대로 둡니다.
    showView(viewName) {
        Object.values(this.views).forEach(view => {
            if(view) view.classList.remove('active-view');
        });
        if(this.views[viewName]) {
            this.views[viewName].classList.add('active-view');
        }
    }
};

// --- 앱 시작 ---
document.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, user => {
        if (user) {
            AppNavigator.init();
        } else {
            signInAnonymously(auth).catch(err => console.error("Anonymous sign-in error:", err));
        }
    });
});