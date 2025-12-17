// src/student/studentApp.js

import { studentAuth } from "./studentAuth.js";
import { studentLesson } from "./studentLesson.js";
import { studentHomework } from "./studentHomework.js";
import { reportManager } from "../shared/reportManager.js";
import { classVideoManager } from "./classVideoManager.js"; 
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
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

        dashboardContainer: 'student-dashboard-grid', 

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

        this.showScreen(this.elements.loginScreen);
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id]);

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
                let classSubjectsMap = {};
                
                if (classDoc.exists()) {
                    const data = classDoc.data();
                    this.state.classType = data.classType;
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
        if (welcomeEl) {
            welcomeEl.textContent = `${studentData.name} 학생, 환영합니다!`;
        }

        this.loadAvailableSubjects(); 
        this.showSubjectSelectionScreen();
    },

    async loadAvailableSubjects() {
        const container = document.getElementById(this.elements.dashboardContainer);
        if (!container) return;
        
        container.innerHTML = '';
        
        // 1. 영상 학습용 과목 카드
        if (this.state.subjects && this.state.subjects.length > 0) {
            this.state.subjects.forEach(subject => {
                const card = this.createDashboardCard(
                    'menu_book', 
                    subject.name, 
                    'bg-purple-50 text-purple-600 group-hover:bg-purple-100', 
                    () => this.showLessonSelectionScreen(subject.id)
                );
                container.appendChild(card);
            });
        } else {
            const emptyMsg = document.createElement('div');
            emptyMsg.className = "col-span-full text-center text-slate-400 py-4";
            emptyMsg.textContent = "등록된 학습 과목이 없습니다.";
            container.appendChild(emptyMsg);
        }

        // 2. 기능 카드들
        container.appendChild(this.createDashboardCard(
            'assignment', '숙제 확인', 'bg-yellow-50 text-yellow-600 group-hover:bg-yellow-100',
            () => this.showHomeworkScreen()
        ));

        // ⬇️ [수정됨] 일일 테스트: 클릭 시 '전체 테스트 목록 불러오기' 실행 (과목 선택 X)
        container.appendChild(this.createDashboardCard(
            'edit_note', '일일 테스트', 'bg-orange-50 text-orange-600 group-hover:bg-orange-100',
            () => studentLesson.loadAllDailyTests()
        ));

        container.appendChild(this.createDashboardCard(
            'ondemand_video', '수업 영상', 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100',
            () => classVideoManager.showDateSelectionScreen('class')
        ));

        container.appendChild(this.createDashboardCard(
            'question_answer', '질문 영상', 'bg-cyan-50 text-cyan-600 group-hover:bg-cyan-100',
            () => classVideoManager.showDateSelectionScreen('qna')
        ));

        container.appendChild(this.createDashboardCard(
            'assessment', '성적표 확인', 'bg-lime-50 text-lime-600 group-hover:bg-lime-100',
            () => this.showReportListScreen()
        ));
    },

    createDashboardCard(iconName, title, colorClass, onClickHandler) {
        const div = document.createElement('div');
        div.className = "cursor-pointer bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-100 flex flex-col items-center justify-center gap-3 group active:scale-95 duration-200";
        div.innerHTML = `
            <div class="w-14 h-14 rounded-2xl flex items-center justify-center transition ${colorClass}">
                <span class="material-icons-round text-3xl">${iconName}</span>
            </div>
            <h3 class="font-bold text-slate-700 text-base">${title}</h3>
        `;
        div.addEventListener('click', onClickHandler);
        return div;
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