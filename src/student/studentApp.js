// src/student/studentApp.js

import { collection, doc, getDocs, getDoc, where, query, orderBy } from "firebase/firestore";
// ▼▼▼ [수정] import 항목 변경 및 추가 ▼▼▼
import { db, ensureAnonymousAuth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js'; // showToast 가져오기

// 분리된 기능 모듈들을 가져옵니다.
import { studentAuth } from './studentAuth.js';
import { studentLesson } from './studentLesson.js';
import { studentHomework } from './studentHomework.js'; // studentHomework 가져오기 확인

const StudentApp = {
    isInitialized: false,
    elements: {}, // elements 객체 초기화
    state: {
        studentId: null, studentName: '', classId: null,
        activeSubjects: [], selectedSubject: null, activeLesson: null,
        currentQuestionIndex: 0, score: 0, quizQuestions: [],
        passScore: 4, totalQuizQuestions: 5,
        currentHomeworkId: null, filesToUpload: [], isEditingHomework: false,
        initialImageUrls: [],
        currentRevVideoIndex: 0,
        currentHomeworkPages: 0, // 선택된 숙제의 페이지 수를 저장하기 위해 추가
    },

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.cacheElements(); // cacheElements 먼저 호출

        // 모듈 초기화
        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this); // 이것이 초기화되었는지 확인

        this.addEventListeners();

        studentAuth.showLoginScreen(); // 로그인으로 시작
    },

    cacheElements() {
        this.elements = {
            loadingScreen: document.getElementById('student-loading-screen'),
            loginScreen: document.getElementById('student-login-screen'),
            classSelect: document.getElementById('student-class-select'),
            nameSelect: document.getElementById('student-name-select'),
            passwordInput: document.getElementById('student-password'),
            loginBtn: document.getElementById('student-login-btn'),

            // 새 레이아웃을 위해 업데이트됨
            subjectSelectionScreen: document.getElementById('student-subject-selection-screen'),
            welcomeMessage: document.getElementById('student-welcome-message'),
            subjectsList: document.getElementById('student-subjects-list'), // 학습 카드 내부
            startLessonCard: document.getElementById('student-start-lesson-card'), // 카드 자체
            gotoQnaVideoCard: document.getElementById('student-goto-qna-video-card'), // QnA 카드
            gotoHomeworkCard: document.getElementById('student-goto-homework-card'), // 숙제 카드

            qnaVideoScreen: document.getElementById('student-qna-video-screen'),
            backToSubjectsFromQnaBtn: document.getElementById('student-back-to-subjects-from-qna-btn'),
            qnaDatePicker: document.getElementById('qna-video-date-picker'),
            qnaVideoList: document.getElementById('qna-video-list'),

            lessonSelectionScreen: document.getElementById('student-lesson-selection-screen'),
            selectedSubjectTitle: document.getElementById('student-selected-subject-title'),
            lessonsList: document.getElementById('student-lessons-list'),
            noLessonScreen: document.getElementById('student-no-lesson-screen'), // This element might be removed if error/empty is handled in lessonsList
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
        // 기존 리스너
        this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToLessonsBtnSuccess?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.qnaDatePicker?.addEventListener('change', (e) => this.loadQnaVideos(e.target.value));
        this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());


        // 새 대시보드 카드 리스너
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
                iframe.src = ""; // src 비워서 중지
            }
        });
        const qnaList = this.elements.qnaVideoList;
        if (qnaList) {
             const qnaIframes = qnaList.querySelectorAll('iframe');
             qnaIframes.forEach(iframe => {
                 if (iframe && iframe.src) {
                    iframe.src = ""; // 비디오 중지
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
        this.listenForAvailableLessons(); // 이 함수가 학습 목록을 로드함
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

        this.elements.qnaVideoList.innerHTML = '<div class="loader mx-auto"></div>'; // 로딩 표시

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

            this.elements.qnaVideoList.innerHTML = ''; // 목록 비우기
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

    // ▼▼▼ 수정된 함수 (오류/데이터 없음 처리 강화) ▼▼▼
    async listenForAvailableLessons() {
        // 요소 존재 및 선택된 과목 ID 확인
        if (!this.elements.lessonsList || !this.state.selectedSubject?.id) {
            console.error("학습 목록을 표시할 요소가 없거나 과목이 선택되지 않았습니다.");
            if (this.elements.lessonsList) {
                this.elements.lessonsList.innerHTML = '<p class="text-center text-red-500 py-8">과목 정보를 불러올 수 없습니다.</p>';
            }
            // `noLessonScreen` 요소가 있다면 숨김 처리
            if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
            return;
        }

        this.elements.lessonsList.innerHTML = '<div class="loader mx-auto"></div>'; // 로딩 표시
        // `noLessonScreen` 요소가 있다면 숨김 처리
        if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';


        try {
            const q = query(
                collection(db, 'subjects', this.state.selectedSubject.id, 'lessons'),
                where("isActive", "==", true),
                orderBy("order", "asc"),
                orderBy("createdAt", "desc")
            );
            const lessonsSnapshot = await getDocs(q);

            this.elements.lessonsList.innerHTML = ''; // 로더/이전 목록 제거

            const activeLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (lessonsSnapshot.empty) { // 스냅샷이 비었는지 직접 확인
                 // 학습 목록 영역에 "학습 없음" 메시지 표시
                this.elements.lessonsList.innerHTML = '<p class="text-center text-slate-500 py-8">현재 진행 가능한 학습이 없습니다.</p>';
                // `noLessonScreen` 요소가 있다면 숨김 처리 (대신 lessonsList 사용)
                if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
                return;
            }

            activeLessons.forEach(lesson => this.renderLessonChoice(lesson));

        } catch(error) {
            console.error("학습 목록 로딩 실패:", error);
            // 목록 영역에 오류 메시지 표시
            this.elements.lessonsList.innerHTML = `<p class="text-center text-red-500 py-8">학습 목록 로딩 실패</p>`; // 오류 메시지를 구체적으로 표시하지 않음 (이전과 동일)
             // `noLessonScreen` 요소가 있다면 숨김 처리
             if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
             showToast("학습 목록을 불러오는 중 오류가 발생했습니다."); // 토스트 메시지 표시
        }
    },
    // ▲▲▲ 수정된 함수 끝 ▲▲▲


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

    renderLessonChoice(lesson) {
        if (!this.elements.lessonsList) return;

        const button = document.createElement('button');
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