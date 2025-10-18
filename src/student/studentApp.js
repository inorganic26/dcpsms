// src/student/studentApp.js

import { collection, doc, getDocs, getDoc, where, query, orderBy } from "firebase/firestore";
// ▼▼▼ [수정] import 항목 변경 및 추가 ▼▼▼
import { db, ensureAnonymousAuth } from '../shared/firebase.js';

// 분리된 기능 모듈들을 가져옵니다.
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
            gotoHomeworkBtn: document.getElementById('student-goto-homework-btn'),

            // ▼▼▼ 질문 영상 관련 UI 요소 ▼▼▼
            gotoQnaVideoBtn: document.getElementById('student-goto-qna-video-btn'),
            qnaVideoScreen: document.getElementById('student-qna-video-screen'),
            backToSubjectsFromQnaBtn: document.getElementById('student-back-to-subjects-from-qna-btn'),
            qnaDatePicker: document.getElementById('qna-video-date-picker'),
            qnaVideoList: document.getElementById('qna-video-list'),
            // ▲▲▲ 여기까지 ▲▲▲

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

        // ▼▼▼ 질문 영상 관련 이벤트 리스너 ▼▼▼
        this.elements.gotoQnaVideoBtn?.addEventListener('click', () => this.showQnaVideoScreen());
        this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.qnaDatePicker?.addEventListener('change', (e) => this.loadQnaVideos(e.target.value));
        // ▲▲▲ 여기까지 ▲▲▲
    },

    showScreen(screenElement) {
        this.stopAllVideos();
        const screens = [
            this.elements.loadingScreen, this.elements.loginScreen,
            this.elements.subjectSelectionScreen, this.elements.lessonSelectionScreen,
            this.elements.video1Screen, this.elements.quizScreen,
            this.elements.resultScreen, this.elements.homeworkScreen,
            this.elements.qnaVideoScreen // [추가]
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
                const tempSrc = iframe.src;
                iframe.src = "";
                iframe.src = tempSrc;
            }
        });
        // 질문 영상 iframe도 중지
        const qnaIframes = this.elements.qnaVideoList.querySelectorAll('iframe');
        qnaIframes.forEach(iframe => {
             if (iframe && iframe.src) {
                const tempSrc = iframe.src;
                iframe.src = "";
                iframe.src = tempSrc;
            }
        });
    },

    showSubjectSelectionScreen() {
        this.elements.welcomeMessage.textContent = `${this.state.studentName} 학생, 환영합니다!`;
        this.elements.subjectsList.innerHTML = '';
        if (this.state.activeSubjects.length === 0) {
            this.elements.subjectsList.innerHTML = '<p class="text-center text-slate-500 py-8">수강 가능한 과목이 없습니다. 관리자에게 문의하세요.</p>';
        } else {
            this.state.activeSubjects.forEach(subject => this.renderSubjectChoice(subject));
        }

        // [수정] classId가 있을 때만 버튼 표시
        if (this.state.classId) {
            this.elements.gotoHomeworkBtn.style.display = 'block';
            this.elements.gotoQnaVideoBtn.style.display = 'block';
        } else {
            this.elements.gotoHomeworkBtn.style.display = 'none';
            this.elements.gotoQnaVideoBtn.style.display = 'none';
        }

        this.showScreen(this.elements.subjectSelectionScreen);
    },

    showLessonSelectionScreen() {
        this.elements.selectedSubjectTitle.textContent = this.state.selectedSubject.name;
        this.listenForAvailableLessons();
        this.showScreen(this.elements.lessonSelectionScreen);
    },

    // ▼▼▼ [추가] 새로운 함수들 ▼▼▼
    showQnaVideoScreen() {
        // 오늘 날짜로 기본 설정
        this.elements.qnaDatePicker.value = new Date().toISOString().slice(0, 10);
        this.loadQnaVideos(this.elements.qnaDatePicker.value);
        this.showScreen(this.elements.qnaVideoScreen);
    },

    async loadQnaVideos(selectedDate) {
        if (!selectedDate || !this.state.classId) {
            this.elements.qnaVideoList.innerHTML = '<p class="text-center text-slate-400 py-8">날짜를 선택해 주세요.</p>';
            return;
        }

        this.elements.qnaVideoList.innerHTML = '<div class="loader mx-auto"></div>'; // 로딩 표시

        try {
            // Firestore에서 해당 반, 해당 날짜의 비디오 쿼리
            const q = query(
                collection(db, 'classVideos'), // 'classVideos' 컬렉션 사용 (teacherApp.js 참고)
                where('classId', '==', this.state.classId),
                where('videoDate', '==', selectedDate),
                orderBy('createdAt', 'desc') // 최신 영상부터 보여주기 (선택 사항)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                this.elements.qnaVideoList.innerHTML = '<p class="text-center text-slate-500 py-8">해당 날짜에 등록된 질문 영상이 없습니다.</p>';
                return;
            }

            this.elements.qnaVideoList.innerHTML = ''; // 기존 목록 비우기
            snapshot.docs.forEach(doc => {
                const video = doc.data();
                const videoContainer = document.createElement('div');
                // 유튜브 URL을 임베드 URL로 변환 (studentLesson 모듈 함수 재사용)
                const embedUrl = studentLesson.convertYoutubeUrlToEmbed(video.youtubeUrl);

                // 비디오 제목과 iframe을 포함하는 HTML 생성
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
    // ▲▲▲ [추가] 여기까지 ▲▲▲

    async loadAvailableSubjects() {
        this.showScreen(this.elements.loadingScreen);
        if (!this.state.classId) {
            this.state.activeSubjects = [];
            return;
        }
        try {
            const classDoc = await getDoc(doc(db, 'classes', this.state.classId));
            if (!classDoc.exists() || !classDoc.data().subjects) {
                this.state.activeSubjects = [];
                return;
            }
            const subjectIds = Object.keys(classDoc.data().subjects);
            const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
            this.state.activeSubjects = subjectDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
        } catch (error) {
            console.error("수강 과목 로딩 실패:", error);
            this.state.activeSubjects = [];
        }
    },

    async listenForAvailableLessons() {
        this.elements.lessonsList.innerHTML = '';
        this.elements.noLessonScreen.style.display = 'none';

        const q = query(collection(db, 'subjects', this.state.selectedSubject.id, 'lessons'), where("isActive", "==", true));
        const lessonsSnapshot = await getDocs(q);

        const activeLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (activeLessons.length === 0) {
            this.elements.noLessonScreen.style.display = 'block';
            return;
        }

        activeLessons.sort((a, b) => {
            const orderA = a.order ?? Infinity;
            const orderB = b.order ?? Infinity;
            if (orderA !== orderB) return orderA - orderB;
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });

        activeLessons.forEach(lesson => this.renderLessonChoice(lesson));
    },

    renderSubjectChoice(subject) {
        const button = document.createElement('button');
        // 파란색 버튼 스타일 적용
        button.className = "w-full p-4 text-lg font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition";
        button.textContent = subject.name;
        button.addEventListener('click', () => {
            this.state.selectedSubject = subject;
            this.showLessonSelectionScreen();
        });
        this.elements.subjectsList.appendChild(button);
    },

    renderLessonChoice(lesson) {
        const button = document.createElement('button');
        // 파란색 버튼 스타일 적용
        button.className = "w-full p-4 text-lg font-semibold bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition";
        button.textContent = lesson.title;
        button.addEventListener('click', () => studentLesson.startSelectedLesson(lesson));
        this.elements.lessonsList.appendChild(button);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    ensureAnonymousAuth(() => {
        StudentApp.init();
    });
});

export default StudentApp;