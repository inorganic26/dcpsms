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
    },

    init() {
        console.log("[StudentApp] 초기화");
        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this);
        classVideoManager.init(this);
        studentDashboard.init(this);
        this.addEventListeners();
        this.showScreen('student-login-screen');
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
    },

    exitVideoScreen() {
        // [중요 수정] 영상 정지 호출
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
        if (this.state.studentData?.classId) {
            studentHomework.listenForHomework(this.state.studentData.classId);
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