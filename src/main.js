// src/main.js

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, ensureAuth } from './shared/firebase.js';
import './shared/style.css';

import AdminApp from './admin/adminApp.js';
import TeacherApp from './teacher/teacherApp.js';
import StudentApp from './student/studentApp.js';

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
                if (StudentApp.isInitialized) {
                    StudentApp.stopAllVideos();
                }
                this.showView('portal');
            });
        });

        this.showView('portal');
    },

    showView(viewName) {
        Object.values(this.views).forEach(view => {
            if (view) view.style.display = 'none';
        });

        const viewToShow = this.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        }

        if (viewName !== 'portal' && !this.initializedApps[viewName]) {
            const app = this.getAppModule(viewName);
            if (app) {
                app.init();
                this.initializedApps[viewName] = true;
            }
        }
    },
    
    getAppModule(appName) {
        switch(appName) {
            case 'admin': return AdminApp;
            case 'teacher': return TeacherApp;
            case 'student': return StudentApp;
            default: return null;
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    ensureAuth(() => {
        AppNavigator.init();
    });
});