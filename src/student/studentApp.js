// src/student/studentApp.js

import { studentState } from "./studentState.js";
import { studentDashboard } from "./studentDashboard.js";
import { studentAuth } from "./studentAuth.js";
import { studentLesson } from "./studentLesson.js";
import { studentHomework } from "./studentHomework.js";
import { classVideoManager } from "../student/classVideoManager.js"; 
import { reportManager } from "../shared/reportManager.js";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../shared/firebase.js";

// [추가] 주간테스트 모듈 불러오기
import { studentWeeklyTest } from "./studentWeeklyTest.js"; 

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
        reportListScreen: 'student-report-list-screen',
        
        // [추가] 주간테스트 화면 ID 등록
        weeklyTestScreen: 'student-weekly-test-screen',

        classVideoDateScreen: 'student-class-video-date-screen',
        qnaVideoDateScreen: 'student-qna-video-date-screen',
        videoTitlesScreen: 'student-video-titles-screen',
        
        dashboardContainer: 'student-dashboard-grid', 
        lessonGrid: 'student-lesson-grid',
        welcomeMessage: 'student-welcome-message',
        selectedSubjectTitle: 'student-selected-subject-title',
        
        video1Iframe: 'student-video1-iframe',
        video1Title: 'student-video1-title',
        successMessage: 'student-result-success-msg',
        failureMessage: 'student-result-failure-msg',
        progressBar: 'student-quiz-progress-bar',
        progressText: 'student-quiz-progress-text',
        questionText: 'student-quiz-question-text',
        optionsContainer: 'student-quiz-options-container',
        resultScoreTextSuccess: 'student-result-score-text-success',
        resultScoreTextFailure: 'student-result-score-text-failure',
    },

    init() {
        console.log("[StudentApp] 앱 초기화 시작");

        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this);
        classVideoManager.init(this);
        studentDashboard.init(this);

        this.addEventListeners();
        this.showScreen(this.elements.loginScreen);
    },

    addEventListeners() {
        const bindClick = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        };

        // 뒤로가기 버튼들
        bindClick('student-back-to-subjects-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-subjects-from-homework-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-menu-from-report-list-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-subjects-from-daily-test-btn', () => this.showSubjectSelectionScreen());
        
        // [추가] 주간테스트 뒤로가기 버튼 연결
        bindClick('student-back-to-subjects-from-weekly-btn', () => this.showSubjectSelectionScreen());

        // 영상 화면 나가기
        bindClick('student-back-to-lessons-from-video-btn', () => {
            const iframe = document.getElementById(this.elements.video1Iframe);
            if (iframe) iframe.src = ""; 
            this.state.selectedSubject ? this.showLessonSelectionScreen(this.state.selectedSubject.id) : this.showSubjectSelectionScreen();
        });

        bindClick('student-back-to-lessons-from-result-btn', () => {
            this.state.selectedSubject ? this.showLessonSelectionScreen(this.state.selectedSubject.id) : this.showSubjectSelectionScreen();
        });
    },

    showScreen(screenId) {
        Object.values(this.elements).forEach(id => {
            if (id.includes('screen')) {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            }
        });

        const target = document.getElementById(screenId);
        if (target) {
            const flexScreens = [
                this.elements.loadingScreen, 
                this.elements.loginScreen, 
                this.elements.video1Screen, 
                this.elements.quizScreen, 
                this.elements.resultScreen
            ];
            target.style.display = flexScreens.includes(screenId) ? 'flex' : 'block';
        }
    },

    async onLoginSuccess(studentData, studentDocId) {
        console.log("[StudentApp] 로그인 성공:", studentData.name);
        
        this.state.studentData = studentData;
        this.state.studentDocId = studentDocId;
        this.state.studentName = studentData.name;
        
        this.showScreen(this.elements.loadingScreen);

        if (studentData.classId) {
            try {
                const classDoc = await getDoc(doc(db, "classes", studentData.classId));
                let classSubjectsMap = {};
                
                if (classDoc.exists()) {
                    const data = classDoc.data();
                    this.state.classType = data.classType || 'live-lecture'; 
                    classSubjectsMap = data.subjects || {};
                }

                const subjectsSnapshot = await getDocs(collection(db, "subjects"));
                const allSubjects = subjectsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

                this.state.subjects = Object.keys(classSubjectsMap).map(subjectId => {
                    const subjectInfo = allSubjects.find(s => s.id === subjectId);
                    return subjectInfo ? { id: subjectId, name: subjectInfo.name } : null;
                }).filter(s => s !== null);

                this.state.subjects.sort((a, b) => a.name.localeCompare(b.name));

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
        
        const titleEl = document.getElementById(this.elements.selectedSubjectTitle);
        if (titleEl) titleEl.textContent = subject.name;

        this.showScreen(this.elements.loadingScreen);
        await studentLesson.loadLessons(subjectId);
        this.showScreen(this.elements.lessonSelectionScreen);
    },

    showHomeworkScreen() {
        this.showScreen(this.elements.homeworkScreen);
        if (this.state.studentData?.classId) {
            studentHomework.listenForHomework(this.state.studentData.classId);
        }
    },

    showReportListScreen() {
        this.showScreen(this.elements.reportListScreen);
        reportManager.init(this);
    },

    // [추가] 주간테스트 화면 표시 함수
    showWeeklyTestScreen() {
        this.showScreen(this.elements.weeklyTestScreen);
        // 화면이 열릴 때 초기화 및 데이터 로딩 실행
        studentWeeklyTest.init(this.state.studentDocId, this.state.studentName);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    StudentApp.init();
});