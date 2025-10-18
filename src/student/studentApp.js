// src/student/studentApp.js

import { collection, doc, getDocs, getDoc, where, query, orderBy } from "firebase/firestore";
import { db, ensureAnonymousAuth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// Import modules
import { studentAuth } from './studentAuth.js';
import { studentLesson } from './studentLesson.js';
import { studentHomework } from './studentHomework.js';

const StudentApp = {
    isInitialized: false,
    elements: {},
    state: {
        studentId: null, studentName: '', classId: null,
        activeSubjects: [], selectedSubject: null, activeLesson: null,
        currentQuestionIndex: 0, score: 0, quizQuestions: [],
        passScore: 4, totalQuizQuestions: 5,
        currentHomeworkId: null, filesToUpload: [], isEditingHomework: false,
        initialImageUrls: [],
        currentRevVideoIndex: 0,
        currentHomeworkPages: 0,
    },

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.cacheElements();

        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this);

        this.addEventListeners();
        studentAuth.showLoginScreen();
    },

    cacheElements() {
        this.elements = {
            loadingScreen: document.getElementById('student-loading-screen'),
            loginScreen: document.getElementById('student-login-screen'),
            classSelect: document.getElementById('student-class-select'),
            nameSelect: document.getElementById('student-name-select'),
            passwordInput: document.getElementById('student-password'),
            loginBtn: document.getElementById('student-login-btn'),

            subjectSelectionScreen: document.getElementById('student-subject-selection-screen'),
            welcomeMessage: document.getElementById('student-welcome-message'),
            subjectsList: document.getElementById('student-subjects-list'),
            startLessonCard: document.getElementById('student-start-lesson-card'),
            gotoQnaVideoCard: document.getElementById('student-goto-qna-video-card'),
            gotoHomeworkCard: document.getElementById('student-goto-homework-card'),

            qnaVideoScreen: document.getElementById('student-qna-video-screen'),
            backToSubjectsFromQnaBtn: document.getElementById('student-back-to-subjects-from-qna-btn'),
            qnaDatePicker: document.getElementById('qna-video-date-picker'),
            qnaVideoList: document.getElementById('qna-video-list'),

            lessonSelectionScreen: document.getElementById('student-lesson-selection-screen'),
            selectedSubjectTitle: document.getElementById('student-selected-subject-title'),
            lessonsList: document.getElementById('student-lessons-list'),
            noLessonScreen: document.getElementById('student-no-lesson-screen'),
            backToSubjectsBtn: document.getElementById('student-back-to-subjects-btn'),

            homeworkScreen: document.getElementById('student-homework-screen'),
            homeworkList: document.getElementById('student-homework-list'),
            backToSubjectsFromHomeworkBtn: document.getElementById('student-back-to-subjects-from-homework-btn'),

            uploadModal: document.getElementById('student-upload-modal'),
            uploadModalTitle: document.getElementById('student-upload-modal-title'),
            closeUploadModalBtn: document.getElementById('student-close-upload-modal-btn'),
            filesInput: document.getElementById('student-homework-files-input'),
            previewContainer: document.getElementById('student-homework-preview-container'),
            cancelUploadBtn: document.getElementById('student-cancel-upload-btn'),
            uploadBtn: document.getElementById('student-upload-btn'),
            uploadBtnText: document.getElementById('student-upload-btn-text'),
            uploadLoader: document.getElementById('student-upload-loader'),

            video1Screen: document.getElementById('student-video1-screen'),
            video1Title: document.getElementById('student-video1-title'),
            video1Iframe: document.getElementById('student-video1-iframe'),
            gotoRev1Btn: document.getElementById('student-goto-rev1-btn'),
            startQuizBtn: document.getElementById('student-start-quiz-btn'),
            backToLessonsFromVideoBtn: document.getElementById('student-back-to-lessons-from-video-btn'),

            quizScreen: document.getElementById('student-quiz-screen'),
            progressText: document.getElementById('student-progress-text'),
            scoreText: document.getElementById('student-score-text'),
            progressBar: document.getElementById('student-progress-bar'),
            questionText: document.getElementById('student-question-text'),
            optionsContainer: document.getElementById('student-options-container'),

            resultScreen: document.getElementById('student-result-screen'),
            successMessage: document.getElementById('student-success-message'),
            failureMessage: document.getElementById('student-failure-message'),
            resultScoreTextSuccess: document.getElementById('student-result-score-text-success'),
            resultScoreTextFailure: document.getElementById('student-result-score-text-failure'),
            reviewVideo2Iframe: document.getElementById('student-review-video2-iframe'),
            rewatchVideo1Btn: document.getElementById('student-rewatch-video1-btn'),
            showRev2BtnSuccess: document.getElementById('student-show-rev2-btn-success'),
            video2Iframe: document.getElementById('student-video2-iframe'),
            retryQuizBtn: document.getElementById('student-retry-quiz-btn'),
            showRev2BtnFailure: document.getElementById('student-show-rev2-btn-failure'),
            backToLessonsBtnSuccess: document.getElementById('student-back-to-lessons-btn-success'),
        };
    },

    addEventListeners() {
        this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToLessonsBtnSuccess?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.qnaDatePicker?.addEventListener('change', (e) => this.loadQnaVideos(e.target.value));
        this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());

        this.elements.gotoQnaVideoCard?.addEventListener('click', () => this.showQnaVideoScreen());
        this.elements.gotoHomeworkCard?.addEventListener('click', () => studentHomework.showHomeworkScreen());
    },

    showScreen(screenElement) {
        this.stopAllVideos();
        const screens = [
            this.elements.loadingScreen, this.elements.loginScreen,
            this.elements.subjectSelectionScreen, this.elements.lessonSelectionScreen,
            this.elements.video1Screen, this.elements.quizScreen,
            this.elements.resultScreen, this.elements.homeworkScreen,
            this.elements.qnaVideoScreen
        ];
        screens.forEach(s => { if(s) s.style.display = 'none' });
        if(screenElement) screenElement.style.display = 'flex';
    },

    stopAllVideos() {
        [
            this.elements.video1Iframe,
            this.elements.video2Iframe,
            this.elements.reviewVideo2Iframe
        ].forEach(iframe => {
            if (iframe && iframe.src) {
                iframe.src = "";
            }
        });
        const qnaList = this.elements.qnaVideoList;
        if (qnaList) {
             const qnaIframes = qnaList.querySelectorAll('iframe');
             qnaIframes.forEach(iframe => {
                 if (iframe && iframe.src) {
                    iframe.src = "";
                }
            });
        }
    },

    showSubjectSelectionScreen() {
        if (!this.elements.welcomeMessage || !this.elements.subjectsList) return;

        this.elements.welcomeMessage.textContent = `${this.state.studentName} 학생, 환영합니다!`;
        this.elements.subjectsList.innerHTML = '';

        if (this.state.activeSubjects.length === 0) {
             this.elements.subjectsList.innerHTML = '<p class="text-center text-sm text-slate-400 py-4">수강 가능한 과목이 없습니다. 관리자에게 문의하세요.</p>';
        } else {
            this.state.activeSubjects.forEach(subject => this.renderSubjectChoice(subject));
        }

        const displayStyle = this.state.classId ? 'flex' : 'none';
        if (this.elements.gotoHomeworkCard) this.elements.gotoHomeworkCard.style.display = displayStyle;
        if (this.elements.gotoQnaVideoCard) this.elements.gotoQnaVideoCard.style.display = displayStyle;

        this.showScreen(this.elements.subjectSelectionScreen);
    },

    showLessonSelectionScreen() {
         if (!this.elements.selectedSubjectTitle || !this.state.selectedSubject) return;
        this.elements.selectedSubjectTitle.textContent = this.state.selectedSubject.name;
        this.listenForAvailableLessons();
        this.showScreen(this.elements.lessonSelectionScreen);
    },

    showQnaVideoScreen() {
        if (!this.elements.qnaDatePicker || !this.elements.qnaVideoScreen) return;
        this.elements.qnaDatePicker.value = new Date().toISOString().slice(0, 10);
        this.loadQnaVideos(this.elements.qnaDatePicker.value);
        this.showScreen(this.elements.qnaVideoScreen);
    },

    async loadQnaVideos(selectedDate) {
         if (!this.elements.qnaVideoList) return;
        if (!selectedDate || !this.state.classId) {
            this.elements.qnaVideoList.innerHTML = '<p class="text-center text-slate-400 py-8">날짜를 선택해 주세요.</p>';
            return;
        }

        this.elements.qnaVideoList.innerHTML = '<div class="loader mx-auto"></div>';

        try {
            const q = query(
                collection(db, 'classVideos'),
                where('classId', '==', this.state.classId),
                where('videoDate', '==', selectedDate),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                this.elements.qnaVideoList.innerHTML = '<p class="text-center text-slate-500 py-8">해당 날짜에 등록된 질문 영상이 없습니다.</p>';
                return;
            }

            this.elements.qnaVideoList.innerHTML = '';
            snapshot.docs.forEach(doc => {
                const video = doc.data();
                const videoContainer = document.createElement('div');
                videoContainer.className = 'mb-6';
                const embedUrl = studentLesson.convertYoutubeUrlToEmbed(video.youtubeUrl);

                videoContainer.innerHTML = `
                    <h3 class="text-xl font-bold text-slate-800 mb-2">${video.title}</h3>
                    <div class="aspect-w-16 aspect-h-9 shadow-lg rounded-lg overflow-hidden">
                        <iframe class="w-full aspect-video" src="${embedUrl}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
                    </div>
                `;
                this.elements.qnaVideoList.appendChild(videoContainer);
            });

        } catch (error) {
            console.error("질문 영상 로딩 실패:", error);
            this.elements.qnaVideoList.innerHTML = '<p class="text-center text-red-500 py-8">영상을 불러오는 데 실패했습니다.</p>';
        }
    },

    async loadAvailableSubjects() {
        this.showScreen(this.elements.loadingScreen);
        this.state.activeSubjects = [];
        if (!this.state.classId) {
            this.showSubjectSelectionScreen();
            return;
        }
        try {
            const classDoc = await getDoc(doc(db, 'classes', this.state.classId));
            if (!classDoc.exists() || !classDoc.data().subjects) {
                 this.showSubjectSelectionScreen();
                return;
            }
            const subjectIds = Object.keys(classDoc.data().subjects);
            if (subjectIds.length === 0) {
                 this.showSubjectSelectionScreen();
                 return;
            }
            const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
            this.state.activeSubjects = subjectDocs
                .filter(d => d.exists())
                .map(d => ({ id: d.id, ...d.data() }));

             this.showSubjectSelectionScreen();

        } catch (error) {
            console.error("수강 과목 로딩 실패:", error);
             showToast("수강 과목 로딩에 실패했습니다.");
             this.showSubjectSelectionScreen();
        }
    },

    async listenForAvailableLessons() {
        if (!this.elements.lessonsList || !this.state.selectedSubject?.id) {
            console.error("학습 목록을 표시할 요소가 없거나 과목이 선택되지 않았습니다.");
            if (this.elements.lessonsList) {
                this.elements.lessonsList.innerHTML = '<p class="text-center text-red-500 py-8">과목 정보를 불러올 수 없습니다.</p>';
            }
            if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
            return;
        }

        this.elements.lessonsList.innerHTML = '<div class="loader mx-auto"></div>';
        if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';

        try {
            const q = query(
                collection(db, 'subjects', this.state.selectedSubject.id, 'lessons'),
                where("isActive", "==", true),
                orderBy("order", "asc"),
                orderBy("createdAt", "desc")
            );
            const lessonsSnapshot = await getDocs(q);

            this.elements.lessonsList.innerHTML = '';

            const activeLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (lessonsSnapshot.empty) {
                this.elements.lessonsList.innerHTML = '<p class="text-center text-slate-500 py-8">현재 진행 가능한 학습이 없습니다.</p>';
                 if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
                return;
            }

            activeLessons.forEach(lesson => this.renderLessonChoice(lesson));

        } catch(error) {
            console.error("학습 목록 로딩 실패:", error);
            this.elements.lessonsList.innerHTML = `<p class="text-center text-red-500 py-8">학습 목록 로딩 실패</p>`;
             if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
             showToast("학습 목록을 불러오는 중 오류가 발생했습니다.");
        }
    },

    renderSubjectChoice(subject) {
        if (!this.elements.subjectsList) return;

        const button = document.createElement('button');
        button.className = "w-full p-3 text-md font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition";
        button.textContent = subject.name;
        button.addEventListener('click', () => {
            this.state.selectedSubject = subject;
            this.showLessonSelectionScreen();
        });
        this.elements.subjectsList.appendChild(button);
    },

    // ▼▼▼ 수정된 함수 (버튼 스타일 변경) ▼▼▼
    renderLessonChoice(lesson) {
        if (!this.elements.lessonsList) return;

        const button = document.createElement('button');
        // 선생님 앱 카드 스타일과 유사하게 변경 (btn 클래스 제거)
        button.className = "w-full p-4 border border-blue-300 bg-blue-50 rounded-lg text-lg font-semibold text-slate-800 hover:bg-blue-100 transition text-left"; // text-slate-800 추가
        button.textContent = lesson.title;
        button.addEventListener('click', () => studentLesson.startSelectedLesson(lesson));
        this.elements.lessonsList.appendChild(button);
    },
     // ▲▲▲ 수정된 함수 끝 ▲▲▲
};

document.addEventListener('DOMContentLoaded', () => {
    ensureAnonymousAuth(() => {
        StudentApp.init();
    });
});

export default StudentApp;