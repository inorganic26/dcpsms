// src/student/studentApp.js

import { studentState } from "./studentState.js";
import { studentDashboard } from "./studentDashboard.js";
import { studentAuth } from "./studentAuth.js";
import { studentLesson } from "./studentLesson.js";
import { studentHomework } from "./studentHomework.js"; 
import { classVideoManager } from "../student/classVideoManager.js"; 
import { reportManager } from "../shared/reportManager.js";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db, auth } from "../shared/firebase.js"; 
import { onAuthStateChanged, signOut } from "firebase/auth"; 
import { studentWeeklyTest } from "./studentWeeklyTest.js"; 
import { studentDailyTest } from "./studentDailyTest.js";

export const StudentApp = {
    state: studentState.data,
    
    elements: {
        loadingScreen: 'student-loading-screen',
        loginScreen: 'student-login-screen',
        subjectSelectionScreen: 'student-subject-selection-screen',
        lessonSelectionScreen: 'student-lesson-selection-screen',
        video1Screen: 'student-video1-screen',
        quizScreen: 'student-quiz-screen',
        resultScreen: 'student-result-screen',
        homeworkScreen: 'student-homework-screen',
        dailyTestScreen: 'student-daily-test-screen',
        weeklyTestScreen: 'student-weekly-test-screen',
        reportListScreen: 'student-report-list-screen',
        classVideoDateScreen: 'student-class-video-date-screen',
        qnaVideoDateScreen: 'student-qna-video-date-screen',
        videoTitlesScreen: 'student-video-titles-screen',
        welcomeMessage: 'student-welcome-message',
        selectedSubjectTitle: 'student-selected-subject-title',
        logoutBtn: 'student-logout-btn'
    },

    init() {
        console.log("[StudentApp] 초기화 시작");
        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this);
        classVideoManager.init(this);
        studentDashboard.init(this);
        this.addEventListeners();
        
        // 로그인 상태 체크
        this.checkLoginStatus();
    },

    checkLoginStatus() {
        onAuthStateChanged(auth, async (user) => {
            const isLoginPage = document.getElementById(this.elements.loginScreen).style.display === 'flex';

            if (user) {
                // 로그인 상태 (앱 껐다 켜도 유지됨)
                if (this.state.studentData && this.state.studentData.id === user.uid) return;

                console.log("세션 복구 중...");
                try {
                    const docSnap = await getDoc(doc(db, "students", user.uid));
                    if (docSnap.exists()) {
                        const data = { id: docSnap.id, ...docSnap.data() };
                        this.onLoginSuccess(data, user.uid);
                    } else {
                        // 학생 정보가 없으면 강제 로그아웃
                        await signOut(auth);
                        this.showScreen('student-login-screen');
                    }
                } catch (e) {
                    console.error("세션 복구 실패", e);
                    this.showScreen('student-login-screen');
                }
            } else {
                // 로그아웃 상태 (로그인 화면 보여주기)
                if (!isLoginPage) {
                    this.showScreen('student-login-screen');
                }
            }
        });
    },

    addEventListeners() {
        const bindClick = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        };

        bindClick('student-back-to-subjects-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-subjects-from-homework-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-menu-from-report-list-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-subjects-from-daily-test-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-subjects-from-weekly-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-lessons-from-video-btn', () => this.exitVideoScreen());
        bindClick('student-back-to-lessons-from-result-btn', () => this.exitVideoScreen());

        // 로그아웃 버튼 연결
        bindClick(this.elements.logoutBtn, () => this.handleLogout());
    },

    async handleLogout() {
        if (confirm("정말 로그아웃 하시겠습니까?")) {
            try {
                await signOut(auth);
                alert("로그아웃 되었습니다.");
                window.location.reload();
            } catch (error) {
                console.error("로그아웃 실패:", error);
                alert("로그아웃 중 오류가 발생했습니다.");
            }
        }
    },

    exitVideoScreen() {
        studentLesson.stopVideo();
        if (this.state.selectedSubject) {
            this.showLessonSelectionScreen(this.state.selectedSubject.id);
        } else {
            this.showSubjectSelectionScreen();
        }
    },

    showScreen(screenId) {
        Object.values(this.elements).forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        const target = document.getElementById(screenId);
        if (target) {
            const flexScreens = ['student-loading-screen', 'student-login-screen', 'student-video1-screen', 'student-quiz-screen', 'student-result-screen'];
            target.style.display = flexScreens.includes(screenId) ? 'flex' : 'block';
        }
    },

    async onLoginSuccess(studentData, studentDocId) {
        this.state.studentData = studentData;
        this.state.studentDocId = studentDocId;
        this.state.studentName = studentData.name;
        
        this.showScreen(this.elements.loadingScreen);

        if (studentData.classId) {
            try {
                const classDoc = await getDoc(doc(db, "classes", studentData.classId));
                let classSubjectsMap = {};
                
                if (classDoc.exists()) {
                    this.state.classType = classDoc.data().classType || 'live-lecture'; 
                    classSubjectsMap = classDoc.data().subjects || {};
                }

                const subjectsSnapshot = await getDocs(collection(db, "subjects"));
                const allSubjects = subjectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                this.state.subjects = Object.keys(classSubjectsMap).map(subjectId => {
                    const subjectInfo = allSubjects.find(s => s.id === subjectId);
                    return subjectInfo ? { id: subjectId, name: subjectInfo.name } : null;
                }).filter(s => s !== null).sort((a, b) => a.name.localeCompare(b.name));

            } catch (e) { 
                console.error("데이터 로드 실패:", e); 
                this.state.subjects = [];
            }
        }

        const welcomeEl = document.getElementById(this.elements.welcomeMessage);
        if (welcomeEl) welcomeEl.textContent = `${studentData.name} 학생, 환영합니다!`;

        this.showSubjectSelectionScreen();
    },

    showSubjectSelectionScreen() {
        this.state.selectedSubject = null;
        studentDashboard.render();
        this.showScreen(this.elements.subjectSelectionScreen);
    },

    async showLessonSelectionScreen(subjectId) {
        const subject = this.state.subjects.find(s => s.id === subjectId);
        if (!subject) return;
        this.state.selectedSubject = subject;
        document.getElementById(this.elements.selectedSubjectTitle).textContent = subject.name;

        this.showScreen(this.elements.loadingScreen);
        await studentLesson.loadLessons(subjectId);
        this.showScreen(this.elements.lessonSelectionScreen);
    },

    showHomeworkScreen() {
        this.showScreen(this.elements.homeworkScreen);
        if (this.state.studentData) {
            try {
                studentHomework.fetchHomeworks();
            } catch(e) {
                console.error("숙제 불러오기 실패:", e);
            }
        }
    },

    showReportListScreen() {
        this.showScreen(this.elements.reportListScreen);
        reportManager.init(this);
    },

    showWeeklyTestScreen() {
        this.showScreen(this.elements.weeklyTestScreen);
        studentWeeklyTest.init(this.state.studentDocId, this.state.studentName);
    },
    
    showDailyTestScreen() {
        this.showScreen(this.elements.dailyTestScreen);
        studentDailyTest.init(this);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    StudentApp.init();
});