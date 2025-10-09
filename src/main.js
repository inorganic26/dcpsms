// src/main.js

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, ensureAuth } from './shared/firebase.js';
import './shared/style.css';

// 초기 로드 시 앱 모듈을 import 하지 않습니다.
// import AdminApp from './admin/adminApp.js';
// import TeacherApp from './teacher/teacherApp.js';
// import StudentApp from './student/studentApp.js';

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

document.addEventListener('DOMContentLoaded', () => {
    ensureAuth(() => {
        AppNavigator.init();
    });
});