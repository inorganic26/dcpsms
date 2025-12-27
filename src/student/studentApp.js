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

export const StudentApp = {
    // 기존 모듈(studentLesson 등)과의 호환성을 위해 state를 연결
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
        
        classVideoDateScreen: 'student-class-video-date-screen',
        qnaVideoDateScreen: 'student-qna-video-date-screen',
        videoTitlesScreen: 'student-video-titles-screen',
        
        dashboardContainer: 'student-dashboard-grid', 
        lessonGrid: 'student-lesson-grid',
        welcomeMessage: 'student-welcome-message',
        selectedSubjectTitle: 'student-selected-subject-title',
        
        // 기타 ID 매핑 (기존 모듈 호환성 유지)
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

        // 1. 각 모듈 초기화 (this를 넘겨주어 서로 연결)
        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this);
        classVideoManager.init(this);
        studentDashboard.init(this); // 새로 만든 대시보드 모듈

        // 2. 이벤트 리스너 연결
        this.addEventListeners();

        // 3. 초기 화면: 로그인 화면 표시
        this.showScreen(this.elements.loginScreen);
    },

    addEventListeners() {
        const bindClick = (id, handler) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', handler);
        };

        // 뒤로가기 버튼들 연결
        bindClick('student-back-to-subjects-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-subjects-from-homework-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-menu-from-report-list-btn', () => this.showSubjectSelectionScreen());
        bindClick('student-back-to-subjects-from-daily-test-btn', () => this.showSubjectSelectionScreen());
        
        // 영상 화면에서 나갈 때 영상 끄기
        bindClick('student-back-to-lessons-from-video-btn', () => {
            const iframe = document.getElementById(this.elements.video1Iframe);
            if (iframe) iframe.src = ""; 
            this.state.selectedSubject ? this.showLessonSelectionScreen(this.state.selectedSubject.id) : this.showSubjectSelectionScreen();
        });

        bindClick('student-back-to-lessons-from-result-btn', () => {
            this.state.selectedSubject ? this.showLessonSelectionScreen(this.state.selectedSubject.id) : this.showSubjectSelectionScreen();
        });
    },

    // 화면 전환 함수 (Router 역할)
    showScreen(screenId) {
        // 모든 화면 숨김
        Object.values(this.elements).forEach(id => {
            if (id.includes('screen')) {
                const el = document.getElementById(id);
                if (el) el.style.display = 'none';
            }
        });

        // 타겟 화면 표시
        const target = document.getElementById(screenId);
        if (target) {
            // flex가 필요한 화면들은 따로 처리
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

    // 로그인 성공 시 호출되는 함수 (Auth 모듈에서 호출)
    async onLoginSuccess(studentData, studentDocId) {
        console.log("[StudentApp] 로그인 성공:", studentData.name);
        
        this.state.studentData = studentData;
        this.state.studentDocId = studentDocId;
        this.state.studentName = studentData.name;
        
        this.showScreen(this.elements.loadingScreen);

        // 학생 데이터 로드 (반 정보, 과목 정보 등)
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

                // 반에 할당된 과목만 필터링
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

        // 환영 메시지 업데이트
        const welcomeEl = document.getElementById(this.elements.welcomeMessage);
        if (welcomeEl) welcomeEl.textContent = `${studentData.name} 학생, 환영합니다!`;

        // 대시보드 화면으로 이동
        this.showSubjectSelectionScreen();
    },

    showSubjectSelectionScreen() {
        this.state.selectedSubject = null;
        // 대시보드 그리기 (분리된 모듈 사용)
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
        // 레슨 목록 로드 (Lesson 모듈 사용)
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
    }
};

// [중요] 앱 실행 코드
// DOM이 로드되면 앱을 초기화합니다.
document.addEventListener('DOMContentLoaded', () => {
    StudentApp.init();
});