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
        studentId: null, studentName: '', classId: null, authUid: null,
        classType: 'self-directed',
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
            gotoClassVideoCard: document.getElementById('student-goto-class-video-card'),

            qnaVideoScreen: document.getElementById('student-qna-video-screen'),
            backToSubjectsFromQnaBtn: document.getElementById('student-back-to-subjects-from-qna-btn'),
            qnaDatePicker: document.getElementById('qna-video-date-picker'),
            qnaVideoList: document.getElementById('qna-video-list'),

            classVideoScreen: document.getElementById('student-class-video-screen'),
            backToSubjectsFromClassVideoBtn: document.getElementById('student-back-to-subjects-from-class-video-btn'),
            classVideoDatePicker: document.getElementById('class-video-date-picker'),
            classVideoList: document.getElementById('class-video-list'),

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

        this.elements.gotoClassVideoCard?.addEventListener('click', () => this.showClassVideoScreen());
        this.elements.backToSubjectsFromClassVideoBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.classVideoDatePicker?.addEventListener('change', (e) => this.loadClassVideos(e.target.value));
    },

    showScreen(screenElement) {
        this.stopAllVideos();

        const screens = [
            this.elements.loadingScreen, this.elements.loginScreen,
            this.elements.subjectSelectionScreen, this.elements.lessonSelectionScreen,
            this.elements.video1Screen, this.elements.quizScreen,
            this.elements.resultScreen, this.elements.homeworkScreen,
            this.elements.qnaVideoScreen, this.elements.classVideoScreen,
        ];
        screens.forEach(s => { if(s) s.style.display = 'none' });

        if(screenElement) screenElement.style.display = 'flex'; 
    },

    stopAllVideos() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            if (iframe && iframe.src) {
                iframe.src = '';
            }
        });
    },

    showSubjectSelectionScreen() {
        if (!this.elements.welcomeMessage) return;

        this.elements.welcomeMessage.textContent = `${this.state.studentName} 학생, 환영합니다!`;

        const isLiveLecture = this.state.classType === 'live-lecture';
        const isSelfDirected = !isLiveLecture;

        if (this.elements.startLessonCard) this.elements.startLessonCard.style.display = isSelfDirected ? 'flex' : 'none';
        if (this.elements.gotoClassVideoCard) this.elements.gotoClassVideoCard.style.display = isLiveLecture ? 'flex' : 'none';
        
        const commonMenuStyle = this.state.classId ? 'flex' : 'none';
        if (this.elements.gotoQnaVideoCard) this.elements.gotoQnaVideoCard.style.display = commonMenuStyle;
        if (this.elements.gotoHomeworkCard) this.elements.gotoHomeworkCard.style.display = commonMenuStyle;

        if (isSelfDirected && this.elements.subjectsList) {
             this.elements.subjectsList.innerHTML = '';
             if (this.state.activeSubjects.length === 0) {
                 this.elements.subjectsList.innerHTML = '<p class="text-center text-sm text-slate-400 py-4">수강 가능한 과목이 없습니다.</p>';
             } else {
                 this.state.activeSubjects.forEach(subject => this.renderSubjectChoice(subject));
             }
        }

        this.showScreen(this.elements.subjectSelectionScreen);
    },

    showLessonSelectionScreen() {
         if (this.state.classType !== 'self-directed') {
              console.warn("현강반 학생은 학습 선택 화면에 접근할 수 없습니다.");
              this.showSubjectSelectionScreen();
              return;
         }
        if (!this.elements.selectedSubjectTitle || !this.state.selectedSubject) {
             console.error("과목 선택 타이틀 요소가 없거나 과목이 선택되지 않았습니다.");
             showToast("과목 정보를 표시할 수 없습니다.");
             return;
        }
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

    showClassVideoScreen() {
         if (this.state.classType !== 'live-lecture') {
              console.warn("자기주도반 학생은 수업 영상 화면에 접근할 수 없습니다.");
              this.showSubjectSelectionScreen();
              return;
         }
         if (!this.elements.classVideoDatePicker || !this.elements.classVideoScreen) return;
         this.elements.classVideoDatePicker.value = new Date().toISOString().slice(0, 10);
         this.loadClassVideos(this.elements.classVideoDatePicker.value);
         this.showScreen(this.elements.classVideoScreen);
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
                const embedUrl = studentLesson.convertYoutubeUrlToEmbed(video.youtubeUrl);
                
                if (!embedUrl) {
                    console.error("Invalid YouTube URL for video:", video.title, video.youtubeUrl);
                    return;
                }
                
                const videoContainer = document.createElement('div');
                videoContainer.className = 'mb-6';
                
                // QNA 영상 iframe: referrerpolicy 제거
                videoContainer.innerHTML = `
                    <h3 class="text-xl font-bold text-slate-800 mb-2">${video.title}</h3>
                    <div class="aspect-w-16 aspect-h-9 shadow-lg rounded-lg overflow-hidden">
                        <iframe 
                            class="w-full aspect-video" 
                            src="${embedUrl}" 
                            frameborder="0" 
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                            allowfullscreen>
                        </iframe>
                    </div>
                `;
                this.elements.qnaVideoList.appendChild(videoContainer);
            });

        } catch (error) {
            console.error("질문 영상 로딩 실패:", error);
            this.elements.qnaVideoList.innerHTML = '<p class="text-center text-red-500 py-8">영상을 불러오는 데 실패했습니다.</p>';
        }
    },

    async loadClassVideos(selectedDate) {
         if (!this.elements.classVideoList) return;
         if (!selectedDate || !this.state.classId) {
             this.elements.classVideoList.innerHTML = '<p class="text-center text-slate-400 py-8">날짜를 선택해 주세요。</p>';
             return;
         }

         this.elements.classVideoList.innerHTML = '<div class="loader mx-auto"></div>';

         try {
             const q = query(
                 collection(db, 'classLectures'),
                 where('classId', '==', this.state.classId),
                 where('lectureDate', '==', selectedDate)
             );
             const snapshot = await getDocs(q);

             if (snapshot.empty || !snapshot.docs[0].data().videos || snapshot.docs[0].data().videos.length === 0) {
                 this.elements.classVideoList.innerHTML = '<p class="text-center text-slate-500 py-8">해당 날짜에 등록된 수업 영상이 없습니다.</p>';
                 return;
             }

             const videos = snapshot.docs[0].data().videos;
             this.elements.classVideoList.innerHTML = '';

             videos.forEach(video => {
                 const embedUrl = studentLesson.convertYoutubeUrlToEmbed(video.url);
                 
                 if (!embedUrl) {
                     console.error("Invalid YouTube URL for class video:", video.title, video.url);
                     return;
                 }
                 
                 const videoContainer = document.createElement('div');
                 videoContainer.className = 'mb-6';

                 // 수업 영상 iframe: referrerpolicy 제거
                 videoContainer.innerHTML = `
                     <h3 class="text-xl font-bold text-slate-800 mb-2">${video.title}</h3>
                     <div class="aspect-w-16 aspect-h-9 shadow-lg rounded-lg overflow-hidden">
                         <iframe 
                             class="w-full aspect-video" 
                             src="${embedUrl}" 
                             frameborder="0" 
                             allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                             allowfullscreen>
                         </iframe>
                     </div>
                 `;
                 this.elements.classVideoList.appendChild(videoContainer);
             });

         } catch (error) {
             console.error("수업 영상 로딩 실패:", error);
             this.elements.classVideoList.innerHTML = '<p class="text-center text-red-500 py-8">수업 영상을 불러오는 데 실패했습니다.</p>';
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
            if (!classDoc.exists()) {
                console.warn(`Class document not found for ID: ${this.state.classId}`);
                showToast("반 정보를 찾을 수 없습니다.");
                this.showSubjectSelectionScreen();
                return;
            }

             this.state.classType = classDoc.data().classType || 'self-directed';

             if (this.state.classType === 'self-directed') {
                const subjectsData = classDoc.data().subjects;
                if (!subjectsData || Object.keys(subjectsData).length === 0) {
                    this.showSubjectSelectionScreen();
                    return;
                }
                const subjectIds = Object.keys(subjectsData);
                const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
                this.state.activeSubjects = subjectDocs
                    .filter(d => d.exists())
                    .map(d => ({ id: d.id, ...d.data() }));
                 this.state.activeSubjects.sort((a,b) => a.name.localeCompare(b.name));
             } else {
                 this.state.activeSubjects = [];
             }

             this.showSubjectSelectionScreen();

        } catch (error) {
            console.error("수강 과목 로딩 실패:", error);
             showToast("수강 과목 로딩에 실패했습니다.");
             this.showSubjectSelectionScreen();
             
             // Timeout 오류를 명시적으로 처리하여 앱이 멈추지 않도록 함
             if (error.message && error.message.includes("Timeout") || error.code === 'unavailable' || error.code === 'internal') {
                 showToast("데이터 로딩 중 타임아웃 오류가 발생했습니다. 네트워크 연결 상태를 확인하거나 잠시 후 다시 시도해주세요.", true);
             }
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

        let activeLessons = [];

        try {
            const q = query(
                collection(db, 'subjects', this.state.selectedSubject.id, 'lessons'),
                where("isActive", "==", true),
                orderBy("order", "asc"),
                orderBy("createdAt", "desc")
            );
            const lessonsSnapshot = await getDocs(q);

            this.elements.lessonsList.innerHTML = '';

            activeLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            if (lessonsSnapshot.empty) {
                this.elements.lessonsList.innerHTML = '';
                 if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'block';
                return;
            }
            
        } catch(error) {
            console.error("학습 목록 로딩 실패:", error);
            
            if (error.code === 'permission-denied') {
                 this.elements.lessonsList.innerHTML = `<p class="text-center text-red-600 py-8">⚠ 학습 세트를 불러올 권한이 없습니다. 관리자에게 문의하세요.</p>`;
                 showToast("학습 세트 로딩 실패: 권한 없음.");
            } else {
                 this.elements.lessonsList.innerHTML = `<p class="text-center text-red-500 py-8">학습 목록 로딩 실패</p>`;
                 showToast("학습 목록을 불러오는 중 오류가 발생했습니다.");
            }
            
            // Timeout 오류를 명시적으로 처리하여 앱이 멈추지 않도록 함
            if (error.message && error.message.includes("Timeout") || error.code === 'unavailable' || error.code === 'internal') {
                 showToast("데이터 로딩 중 타임아웃 오류가 발생했습니다. 네트워크 연결 상태를 확인하거나 잠시 후 다시 시도해주세요.", true);
            }
             if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
             return;
        }

        if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
        activeLessons.forEach(lesson => this.renderLessonChoice(lesson));
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

    renderLessonChoice(lesson) {
        if (!this.elements.lessonsList) return;

        const button = document.createElement('button');
        button.className = "w-full p-4 border border-blue-300 bg-blue-50 rounded-lg text-lg font-semibold text-slate-800 hover:bg-blue-100 transition text-left";
        button.textContent = lesson.title;
        button.addEventListener('click', () => studentLesson.startSelectedLesson(lesson));
        this.elements.lessonsList.appendChild(button);
    },
};

document.addEventListener('DOMContentLoaded', () => {
    ensureAnonymousAuth((user) => {
        console.log("Anonymous user authenticated:", user.uid);
        StudentApp.state.authUid = user.uid; 
        StudentApp.init();
    });
});

export default StudentApp;