// src/student/studentApp.js

import { studentAuth } from "./studentAuth.js";
import { studentLesson } from "./studentLesson.js";
import { studentHomework } from "./studentHomework.js";
import { reportManager } from "../shared/reportManager.js";
import { classVideoManager } from "./classVideoManager.js"; 
import { doc, getDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";

export const StudentApp = {
    elements: {
        loadingScreen: 'student-loading-screen',
        loginScreen: 'student-login-screen',
        subjectSelectionScreen: 'student-subject-selection-screen',
        lessonSelectionScreen: 'student-lesson-selection-screen',
        video1Screen: 'student-video1-screen',
        quizScreen: 'student-quiz-screen',
        resultScreen: 'student-result-screen',
        homeworkScreen: 'student-homework-screen',
        reportListScreen: 'student-report-list-screen',
        
        classVideoDateScreen: 'student-class-video-date-screen',
        qnaVideoDateScreen: 'student-qna-video-date-screen',
        videoTitlesScreen: 'student-video-titles-screen',
        videoDisplayModal: 'student-video-display-modal',

        startLessonCard: 'student-start-lesson-card',
        dailyTestCard: 'student-daily-test-card',
        gotoClassVideoCard: 'student-goto-class-video-card',
        gotoQnaVideoCard: 'student-goto-qna-video-card',
        gotoHomeworkCard: 'student-goto-homework-card',
        gotoReportCard: 'student-goto-report-card',

        welcomeMessage: 'student-welcome-message',
        selectedSubjectTitle: 'student-selected-subject-title',
        backToSubjectsBtn: 'student-back-to-subjects-btn',
        backToSubjectsFromHomeworkBtn: 'student-back-to-subjects-from-homework-btn',
        backToMenuFromReportListBtn: 'student-back-to-menu-from-report-list-btn',
    },

    state: {
        studentData: null,
        studentDocId: null,
        studentName: null,
        classType: null,
        subjects: [],
        selectedSubject: null,
        lessons: [],
        activeLesson: null,
        quizQuestions: [],
        currentQuestionIndex: 0,
        score: 0,
        passScore: 4,
        totalQuizQuestions: 5,
        currentRevVideoIndex: 0,
    },

    init() {
        console.log("[StudentApp] Initializing...");
        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this);
        classVideoManager.init(this);
        this.addEventListeners();

        // 초기 화면 설정: 로그인 화면 표시
        this.showScreen(this.elements.loginScreen);
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id]);

        el('gotoClassVideoCard')?.addEventListener('click', () => classVideoManager.showDateSelectionScreen('class'));
        el('gotoQnaVideoCard')?.addEventListener('click', () => classVideoManager.showDateSelectionScreen('qna'));
        el('gotoHomeworkCard')?.addEventListener('click', () => this.showHomeworkScreen());
        el('gotoReportCard')?.addEventListener('click', () => this.showReportListScreen());

        el('backToSubjectsBtn')?.addEventListener('click', () => this.showSubjectSelectionScreen());
        el('backToSubjectsFromHomeworkBtn')?.addEventListener('click', () => this.showSubjectSelectionScreen());
        el('backToMenuFromReportListBtn')?.addEventListener('click', () => this.showSubjectSelectionScreen());

        document.getElementById('student-back-to-lessons-from-video-btn')?.addEventListener('click', () => {
            this.state.selectedSubject ? this.showLessonSelectionScreen(this.state.selectedSubject.id) : this.showSubjectSelectionScreen();
        });
        
        document.getElementById('student-back-to-lessons-from-result-btn')?.addEventListener('click', () => {
            this.state.selectedSubject ? this.showLessonSelectionScreen(this.state.selectedSubject.id) : this.showSubjectSelectionScreen();
        });
    },

    showScreen(screenId) {
        const screens = [
            this.elements.loadingScreen, this.elements.loginScreen, this.elements.subjectSelectionScreen,
            this.elements.lessonSelectionScreen, this.elements.video1Screen, this.elements.quizScreen,
            this.elements.resultScreen, this.elements.homeworkScreen, this.elements.reportListScreen,
            this.elements.classVideoDateScreen, this.elements.qnaVideoDateScreen, this.elements.videoTitlesScreen
        ];
        screens.forEach(id => {
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
                if (classDoc.exists()) {
                    const data = classDoc.data();
                    this.state.classType = data.classType;
                    // 클래스 데이터에 담긴 과목 정보를 가져옴
                    this.state.subjects = data.subjects || [];
                }
            } catch (e) { 
                console.error("클래스 로드 실패:", e); 
            }
        }

        const welcomeEl = document.getElementById(this.elements.welcomeMessage);
        if (welcomeEl) {
            welcomeEl.textContent = `${studentData.name} 학생, 환영합니다!`;
        }

        this.loadAvailableSubjects();
        this.showSubjectSelectionScreen();
    },

    async loadAvailableSubjects() {
        const container = document.getElementById('student-subjects-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        // 과목 영역 표시
        const startCard = document.getElementById(this.elements.startLessonCard);
        if (startCard) startCard.style.display = 'block';

        if (!this.state.subjects || this.state.subjects.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400">학습할 과목이 없습니다.</p>';
        } else {
            this.state.subjects.forEach(subject => {
                const div = document.createElement('div');
                div.className = 'p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center cursor-pointer hover:bg-indigo-50 transition mb-2';
                div.innerHTML = `<span class="font-bold text-slate-700">${subject.name}</span><span class="material-icons-round text-slate-300 text-sm">arrow_forward_ios</span>`;
                div.onclick = () => this.showLessonSelectionScreen(subject.id);
                container.appendChild(div);
            });
        }
        
        // 나머지 기능 버튼들(수업영상, 숙제 등) 표시
        const menuKeys = ['gotoClassVideoCard', 'gotoQnaVideoCard', 'gotoHomeworkCard', 'gotoReportCard', 'dailyTestCard'];
        menuKeys.forEach(key => {
            const el = document.getElementById(this.elements[key]);
            if(el) {
                el.style.display = 'flex';
                el.classList.remove('hidden'); // hidden 클래스가 남아있을 경우 제거
            }
        });
    },

    showSubjectSelectionScreen() {
        this.state.selectedSubject = null;
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
    }
};

document.addEventListener('DOMContentLoaded', () => {
    StudentApp.init();
});