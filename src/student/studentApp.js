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
        classType: 'self-directed', // 기본값
        activeSubjects: [], selectedSubject: null, activeLesson: null,
        currentQuestionIndex: 0, score: 0, quizQuestions: [],
        passScore: 4, totalQuizQuestions: 5, // 퀴즈 설정
        currentHomeworkId: null, filesToUpload: [], isEditingHomework: false,
        initialImageUrls: [], // 숙제 수정 시 기존 URL
        currentRevVideoIndex: 0, // 보충 영상 인덱스
        currentHomeworkPages: 0, // 현재 숙제의 총 페이지 수
    },

    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.cacheElements();

        studentAuth.init(this);
        studentLesson.init(this);
        studentHomework.init(this);

        this.addEventListeners();
        studentAuth.showLoginScreen(); // 로그인 화면부터 시작
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
            startLessonCard: document.getElementById('student-start-lesson-card'), // 자기주도반 과목 카드
            gotoQnaVideoCard: document.getElementById('student-goto-qna-video-card'), // 질문 영상 카드
            gotoHomeworkCard: document.getElementById('student-goto-homework-card'), // 숙제 카드
            gotoClassVideoCard: document.getElementById('student-goto-class-video-card'), // 현강반 영상 카드

            qnaVideoScreen: document.getElementById('student-qna-video-screen'),
            backToSubjectsFromQnaBtn: document.getElementById('student-back-to-subjects-from-qna-btn'),
            qnaDatePicker: document.getElementById('qna-video-date-picker'),
            qnaVideoList: document.getElementById('qna-video-list'), // 질문 영상 목록 컨테이너 ID

            classVideoScreen: document.getElementById('student-class-video-screen'),
            backToSubjectsFromClassVideoBtn: document.getElementById('student-back-to-subjects-from-class-video-btn'),
            classVideoDatePicker: document.getElementById('class-video-date-picker'),
            classVideoList: document.getElementById('class-video-list'),

            lessonSelectionScreen: document.getElementById('student-lesson-selection-screen'),
            selectedSubjectTitle: document.getElementById('student-selected-subject-title'),
            lessonsList: document.getElementById('student-lessons-list'),
            noLessonScreen: document.getElementById('student-no-lesson-screen'),
            backToSubjectsBtn: document.getElementById('student-back-to-subjects-btn'), // 학습선택->과목선택

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

            video1Screen: document.getElementById('student-video1-screen'), // 영상 1 화면
            video1Title: document.getElementById('student-video1-title'),
            video1Iframe: document.getElementById('student-video1-iframe'), // 영상 1 iframe
            gotoRev1Btn: document.getElementById('student-goto-rev1-btn'), // 영상 1 보충 버튼
            startQuizBtn: document.getElementById('student-start-quiz-btn'), // 퀴즈 시작 버튼
            backToLessonsFromVideoBtn: document.getElementById('student-back-to-lessons-from-video-btn'), // 영상->학습선택

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
            reviewVideo2Iframe: document.getElementById('student-review-video2-iframe'), // 성공 시 영상 2 iframe
            rewatchVideo1Btn: document.getElementById('student-rewatch-video1-btn'), // 영상 1 다시보기 버튼
            showRev2BtnSuccess: document.getElementById('student-show-rev2-btn-success'), // 성공 시 보충 영상 2 버튼
            video2Iframe: document.getElementById('student-video2-iframe'), // 실패 시 영상 2 iframe
            retryQuizBtn: document.getElementById('student-retry-quiz-btn'), // 퀴즈 재시도 버튼
            showRev2BtnFailure: document.getElementById('student-show-rev2-btn-failure'), // 실패 시 보충 영상 2 버튼
            backToLessonsBtnSuccess: document.getElementById('student-back-to-lessons-btn-success'), // 성공 시 학습목록 버튼
        };
        // 아래 로그 라인을 제거했습니다.
        // console.log("[studentApp.js] Elements cached:", Object.keys(this.elements).filter(key => this.elements[key]));
    },

    addEventListeners() {
        this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToLessonsBtnSuccess?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToSubjectsFromClassVideoBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.qnaDatePicker?.addEventListener('change', (e) => this.loadQnaVideos(e.target.value));
        this.elements.classVideoDatePicker?.addEventListener('change', (e) => this.loadClassVideos(e.target.value));
        this.elements.gotoQnaVideoCard?.addEventListener('click', () => this.showQnaVideoScreen());
        this.elements.gotoHomeworkCard?.addEventListener('click', () => studentHomework.showHomeworkScreen());
        this.elements.gotoClassVideoCard?.addEventListener('click', () => this.showClassVideoScreen());
    },

    showScreen(screenElement) {
        // console.log(`[studentApp.js] Attempting to show screen: ${screenElement ? screenElement.id : 'null'}`); // 로그 필요시 주석 해제
        const screens = [
            this.elements.loadingScreen, this.elements.loginScreen,
            this.elements.subjectSelectionScreen, this.elements.lessonSelectionScreen,
            this.elements.video1Screen, this.elements.quizScreen, this.elements.resultScreen,
            this.elements.homeworkScreen, this.elements.qnaVideoScreen, this.elements.classVideoScreen,
        ];
        let hidingVideoScreen = false;
        screens.forEach(s => {
            if (s && s.style.display !== 'none') {
                if (s === this.elements.video1Screen || s === this.elements.resultScreen || s === this.elements.qnaVideoScreen || s === this.elements.classVideoScreen) {
                    hidingVideoScreen = true;
                }
                // console.log(`[studentApp.js] Hiding screen: ${s.id}`); // 로그 필요시 주석 해제
                s.style.display = 'none';
            }
        });
        if (hidingVideoScreen) {
            // console.log("[studentApp.js] Calling stopAllVideos because a video screen was hidden."); // 로그 필요시 주석 해제
            this.stopAllVideos();
        } else {
             // console.log("[studentApp.js] Skipping stopAllVideos as no video screen was hidden."); // 로그 필요시 주석 해제
        }
        if(screenElement) {
            // console.log(`[studentApp.js] Setting display = 'flex' for: ${screenElement.id}`); // 로그 필요시 주석 해제
            screenElement.style.display = 'flex';
        } else {
            console.warn("[studentApp.js] showScreen called with null screenElement.");
        }
    },

    stopAllVideos() {
        const iframes = document.querySelectorAll(
            '#student-video1-iframe, #student-review-video2-iframe, #student-video2-iframe, #qna-video-list iframe, #class-video-list iframe'
        );
        // console.log(`[studentApp.js] stopAllVideos called. Found ${iframes.length} iframes to potentially stop.`); // 로그 필요시 주석 해제
        iframes.forEach((iframe, index) => {
            if (iframe && iframe.src && iframe.src !== 'about:blank') {
                // console.log(`[studentApp.js] Stopping video in iframe #${index + 1} (current src: ${iframe.src})`); // 로그 필요시 주석 해제
                iframe.src = 'about:blank';
            }
        });
    },

    showSubjectSelectionScreen() {
        if (!this.elements.welcomeMessage) {
            console.error("[studentApp.js] Welcome message element not found.");
            return;
        }
        // console.log(`[studentApp.js] showSubjectSelectionScreen called. Current classType: ${this.state.classType}`); // 로그 필요시 주석 해제
        this.elements.welcomeMessage.textContent = `${this.state.studentName || '학생'}님, 환영합니다!`;
        const isLiveLecture = this.state.classType === 'live-lecture';
        const isSelfDirected = !isLiveLecture;
        if (this.elements.startLessonCard) {
            this.elements.startLessonCard.style.display = isSelfDirected ? 'flex' : 'none';
             // console.log(`[studentApp.js] startLessonCard display set to: ${this.elements.startLessonCard.style.display}`); // 로그 필요시 주석 해제
        }
        if (this.elements.gotoClassVideoCard) {
            this.elements.gotoClassVideoCard.style.display = isLiveLecture ? 'flex' : 'none';
             // console.log(`[studentApp.js] gotoClassVideoCard display set to: ${this.elements.gotoClassVideoCard.style.display}`); // 로그 필요시 주석 해제
        }
        const commonMenuStyle = this.state.classId ? 'flex' : 'none';
        if (this.elements.gotoQnaVideoCard) {
             this.elements.gotoQnaVideoCard.style.display = commonMenuStyle;
              // console.log(`[studentApp.js] gotoQnaVideoCard display set to: ${this.elements.gotoQnaVideoCard.style.display}`); // 로그 필요시 주석 해제
        }
        if (this.elements.gotoHomeworkCard) {
            this.elements.gotoHomeworkCard.style.display = commonMenuStyle;
             // console.log(`[studentApp.js] gotoHomeworkCard display set to: ${this.elements.gotoHomeworkCard.style.display}`); // 로그 필요시 주석 해제
        }
        if (isSelfDirected && this.elements.subjectsList) {
             this.elements.subjectsList.innerHTML = '';
             if (this.state.activeSubjects.length === 0) {
                 this.elements.subjectsList.innerHTML = '<p class="text-center text-sm text-slate-400 py-4">수강 가능한 과목이 없습니다.</p>';
                  // console.log("[studentApp.js] No subjects to render for self-directed class."); // 로그 필요시 주석 해제
             } else {
                 // console.log("[studentApp.js] Rendering subjects for self-directed class:", this.state.activeSubjects.map(s => s.name)); // 로그 필요시 주석 해제
                 this.state.activeSubjects.forEach(subject => this.renderSubjectChoice(subject));
             }
        } else if (this.elements.subjectsList) {
             this.elements.subjectsList.innerHTML = '';
             // console.log("[studentApp.js] Not rendering subjects list (not self-directed or element missing)."); // 로그 필요시 주석 해제
        }
        this.showScreen(this.elements.subjectSelectionScreen);
    },

    showLessonSelectionScreen() {
         if (this.state.classType !== 'self-directed') {
              console.warn("[studentApp.js] Live-lecture students cannot access lesson selection.");
              this.showSubjectSelectionScreen();
              return;
         }
        if (!this.elements.selectedSubjectTitle || !this.state.selectedSubject) {
             console.error("[studentApp.js] Cannot show lesson selection: Title element or selected subject missing.");
             showToast("과목 정보를 표시할 수 없습니다.");
             this.showSubjectSelectionScreen();
             return;
        }
        this.elements.selectedSubjectTitle.textContent = this.state.selectedSubject.name;
        this.listenForAvailableLessons();
        this.showScreen(this.elements.lessonSelectionScreen);
    },

    showQnaVideoScreen() {
        if (!this.elements.qnaDatePicker || !this.elements.qnaVideoScreen) {
             console.error("[studentApp.js] Cannot show QnA video screen: Required elements missing.");
             return;
        }
        this.elements.qnaDatePicker.value = new Date().toISOString().slice(0, 10);
        this.loadQnaVideos(this.elements.qnaDatePicker.value); // 날짜 설정 후 바로 로드
        this.showScreen(this.elements.qnaVideoScreen); // 화면 먼저 표시
    },

    showClassVideoScreen() {
         if (this.state.classType !== 'live-lecture') {
              console.warn("[studentApp.js] Self-directed students cannot access class video screen.");
              this.showSubjectSelectionScreen();
              return;
         }
         if (!this.elements.classVideoDatePicker || !this.elements.classVideoScreen) {
             console.error("[studentApp.js] Cannot show class video screen: Required elements missing.");
             return;
         }
         this.elements.classVideoDatePicker.value = new Date().toISOString().slice(0, 10);
         this.loadClassVideos(this.elements.classVideoDatePicker.value); // 날짜 설정 후 바로 로드
         this.showScreen(this.elements.classVideoScreen); // 화면 먼저 표시
     },

    async loadQnaVideos(selectedDate) {
         const listEl = this.elements.qnaVideoList;
         // console.log(`[studentApp.js] loadQnaVideos called for date: ${selectedDate}, classId: ${this.state.classId}`); // 로그 필요시 주석 해제

         if (!listEl) { console.error("[studentApp.js] qnaVideoList element not found."); return; }
         if (!selectedDate || !this.state.classId) {
             listEl.innerHTML = '<p class="text-center text-slate-400 py-8">날짜를 선택해 주세요.</p>';
             return;
         }

         listEl.innerHTML = '<div class="loader mx-auto"></div>';

         try {
             const q = query(
                 collection(db, 'classVideos'),
                 where('classId', '==', this.state.classId),
                 where('videoDate', '==', selectedDate),
                 orderBy('createdAt', 'desc')
             );
             // console.log("[studentApp.js] Executing Firestore query for QnA videos..."); // 로그 필요시 주석 해제
             const snapshot = await getDocs(q);
             // console.log(`[studentApp.js] Firestore query returned ${snapshot.size} documents.`); // 로그 필요시 주석 해제

             listEl.innerHTML = '';

             if (snapshot.empty) {
                 // console.log("[studentApp.js] No QnA videos found for this date."); // 로그 필요시 주석 해제
                 listEl.innerHTML = '<p class="text-center text-slate-500 py-8">해당 날짜에 등록된 질문 영상이 없습니다.</p>';
                 return;
             }

             for (const docSnap of snapshot.docs) {
                 const video = docSnap.data();
                 const videoIndex = snapshot.docs.indexOf(docSnap) + 1;
                 // console.log(`[studentApp.js] Processing video ${videoIndex}:`, video.title); // 로그 필요시 주석 해제

                 let embedUrl = null;
                 try {
                     embedUrl = studentLesson.convertYoutubeUrlToEmbed(video.youtubeUrl);
                 } catch (convertError) {
                     console.error(`[studentApp.js] Error converting YouTube URL for video "${video.title}":`, video.youtubeUrl, convertError);
                 }

                 const videoContainer = document.createElement('div');
                 videoContainer.className = 'mb-6';
                 const titleElement = document.createElement('h3');
                 titleElement.className = 'text-xl font-bold text-slate-800 mb-2';
                 titleElement.textContent = video.title || '제목 없음';
                 videoContainer.appendChild(titleElement);

                 if (embedUrl) {
                     // console.log(`[studentApp.js] Creating elements for video "${video.title}" with URL:`, embedUrl); // 로그 필요시 주석 해제
                     const iframeContainer = document.createElement('div');
                     iframeContainer.className = 'aspect-w-16 aspect-h-9 shadow-lg rounded-lg overflow-hidden relative pb-[56.25%] h-0';
                     const iframe = document.createElement('iframe');
                     iframe.className = 'absolute top-0 left-0 w-full h-full';
                     iframe.frameBorder = '0';
                     iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                     iframe.allowFullscreen = true;
                     iframe.style.display = 'none';
                     iframe.onload = () => {
                         // console.log(`[studentApp.js] iframe for "${video.title}" loaded.`); // 로그 필요시 주석 해제
                         iframe.style.display = 'block';
                     };
                     iframe.onerror = (e) => {
                         console.error(`[studentApp.js] iframe for "${video.title}" failed to load:`, e);
                         const errorMsg = document.createElement('p');
                         errorMsg.className = 'text-sm text-red-500';
                         errorMsg.textContent = '(영상 로딩 실패)';
                         iframeContainer.appendChild(errorMsg);
                     };
                     iframeContainer.appendChild(iframe);
                     videoContainer.appendChild(iframeContainer);
                     listEl.appendChild(videoContainer);
                     setTimeout(() => {
                         // console.log(`[studentApp.js] Setting src for iframe "${video.title}": ${embedUrl}`); // 로그 필요시 주석 해제
                         iframe.src = embedUrl;
                     }, 10);

                 } else {
                     console.warn(`[studentApp.js] Skipping iframe rendering for video "${video.title}" due to invalid URL.`);
                     const errorMsg = document.createElement('p');
                     errorMsg.className = 'text-sm text-red-500';
                     errorMsg.textContent = `(영상 URL(${video.youtubeUrl || '없음'})이 올바르지 않아 표시할 수 없습니다.)`;
                     videoContainer.appendChild(errorMsg);
                     listEl.appendChild(videoContainer);
                 }
             }
             // console.log("[studentApp.js] Finished processing QnA video list."); // 로그 필요시 주석 해제

         } catch (error) {
             console.error("[studentApp.js] Error loading or rendering QnA videos:", error);
             listEl.innerHTML = '<p class="text-center text-red-500 py-8">영상을 불러오는 중 오류가 발생했습니다.</p>';
             showToast("질문 영상 로딩 실패", true);
             if (error.message?.includes("Timeout") || error.code === 'unavailable' || error.code === 'internal') {
                 showToast("데이터 로딩 시간 초과. 네트워크 확인 후 다시 시도해주세요.", true);
            }
         }
    },

    async loadClassVideos(selectedDate) {
         if (!this.elements.classVideoList) return;
         if (!selectedDate || !this.state.classId) {
             this.elements.classVideoList.innerHTML = '<p class="text-center text-slate-400 py-8">날짜를 선택해 주세요.</p>';
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
                     console.error("[studentApp.js] Invalid YouTube URL for class video:", video.title, video.url);
                     return;
                 }
                 const videoContainer = document.createElement('div');
                 videoContainer.className = 'mb-6';
                 videoContainer.innerHTML = `
                     <h3 class="text-xl font-bold text-slate-800 mb-2">${video.title || '제목 없음'}</h3>
                     <div class="aspect-w-16 aspect-h-9 shadow-lg rounded-lg overflow-hidden relative pb-[56.25%] h-0">
                         <iframe
                             class="absolute top-0 left-0 w-full h-full"
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
             console.error("[studentApp.js] Error loading class videos:", error);
             this.elements.classVideoList.innerHTML = '<p class="text-center text-red-500 py-8">수업 영상을 불러오는 데 실패했습니다.</p>';
             showToast("수업 영상 로딩 실패", true);
         }
     },

    async loadAvailableSubjects() {
        this.showScreen(this.elements.loadingScreen);
        this.state.activeSubjects = [];
        if (!this.state.classId) {
            this.state.classType = 'self-directed';
            // console.log("[studentApp.js] No classId found, defaulting classType to self-directed."); // 로그 필요시 주석 해제
            this.showSubjectSelectionScreen();
            return;
        }
        try {
            const classDoc = await getDoc(doc(db, 'classes', this.state.classId));
            if (!classDoc.exists()) {
                console.warn(`[studentApp.js] Class document not found for ID: ${this.state.classId}, defaulting to self-directed.`);
                showToast("반 정보를 찾을 수 없습니다.");
                this.state.classType = 'self-directed';
            } else {
                 this.state.classType = classDoc.data().classType || 'self-directed';
                 // console.log(`[studentApp.js] Fetched classType: ${this.state.classType}`); // 로그 필요시 주석 해제
            }
             if (this.state.classType === 'self-directed') {
                const subjectsData = classDoc.exists() ? classDoc.data().subjects : {};
                if (!subjectsData || Object.keys(subjectsData).length === 0) {
                     // console.log("[studentApp.js] No subjects assigned to this self-directed class."); // 로그 필요시 주석 해제
                } else {
                    const subjectIds = Object.keys(subjectsData);
                    const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
                    this.state.activeSubjects = subjectDocs
                        .filter(d => d.exists())
                        .map(d => ({ id: d.id, ...d.data() }));
                     this.state.activeSubjects.sort((a,b) => a.name.localeCompare(b.name));
                      // console.log("[studentApp.js] Loaded active subjects:", this.state.activeSubjects.map(s => s.name)); // 로그 필요시 주석 해제
                }
             } else {
                 this.state.activeSubjects = [];
                 // console.log("[studentApp.js] Class is live-lecture type, clearing active subjects list."); // 로그 필요시 주석 해제
             }
             this.showSubjectSelectionScreen();
        } catch (error) {
            console.error("[studentApp.js] Error loading available subjects:", error);
             showToast("수강 과목 로딩에 실패했습니다.");
             this.state.classType = 'self-directed';
             this.showSubjectSelectionScreen();
             if (error.message?.includes("Timeout") || error.code === 'unavailable' || error.code === 'internal') {
                 showToast("데이터 로딩 시간 초과. 네트워크 확인 후 다시 시도해주세요.", true);
             }
        }
    },

    async listenForAvailableLessons() {
        const listEl = this.elements.lessonsList;
        if (!listEl || !this.state.selectedSubject?.id) {
            console.error("[studentApp.js] Cannot listen for lessons: List element or selected subject ID missing.");
            if (listEl) listEl.innerHTML = '<p class="text-center text-red-500 py-8">과목 정보를 불러올 수 없습니다.</p>';
            if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'none';
            return;
        }
        listEl.innerHTML = '<div class="loader mx-auto"></div>';
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
            listEl.innerHTML = '';
            activeLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (lessonsSnapshot.empty) {
                if(this.elements.noLessonScreen) this.elements.noLessonScreen.style.display = 'block';
                return;
            }
        } catch(error) {
            console.error("[studentApp.js] Error loading lessons:", error);
            if (error.code === 'permission-denied') {
                 listEl.innerHTML = `<p class="text-center text-red-600 py-8">⚠ 학습 세트를 불러올 권한이 없습니다.</p>`;
                 showToast("학습 세트 로딩 실패: 권한 없음.", true);
            } else {
                 listEl.innerHTML = `<p class="text-center text-red-500 py-8">학습 목록 로딩 실패</p>`;
                 showToast("학습 목록 로딩 중 오류 발생", true);
            }
            if (error.message?.includes("Timeout") || error.code === 'unavailable' || error.code === 'internal') {
                 showToast("데이터 로딩 시간 초과. 네트워크 확인 후 다시 시도해주세요.", true);
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
}; // StudentApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    ensureAnonymousAuth((user) => {
        // console.log("[studentApp.js] Anonymous user authenticated:", user.uid); // 로그 필요시 주석 해제
        StudentApp.state.authUid = user.uid;
        StudentApp.init();
    });
});

export default StudentApp;