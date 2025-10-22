// src/student/studentApp.js

import { collection, doc, getDocs, getDoc, where, query, orderBy } from "firebase/firestore"; // orderBy 추가
import { db, ensureAnonymousAuth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// Import modules
import { studentAuth } from './studentAuth.js';
import { studentLesson } from './studentLesson.js'; // convertYoutubeUrlToEmbed 사용
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
        // ======[ 영상 관련 상태 추가 ]======
        qnaVideosByDate: {}, // { 'YYYY-MM-DD': [videoData, ...], ... }
        classVideosByDate: {}, // { 'YYYY-MM-DD': [videoData, ...], ... }
        // ===================================
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
            // ... (기존 요소 캐싱 유지) ...
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

            // ======[ 영상 화면 요소 수정 및 추가 ]======
            qnaVideoScreen: document.getElementById('student-qna-video-screen'),
            backToSubjectsFromQnaBtn: document.getElementById('student-back-to-subjects-from-qna-btn'),
            // qnaDatePicker: 제거됨
            qnaVideoDateList: document.getElementById('qna-video-date-list'), // ID 변경됨

            classVideoScreen: document.getElementById('student-class-video-screen'),
            backToSubjectsFromClassVideoBtn: document.getElementById('student-back-to-subjects-from-class-video-btn'),
            // classVideoDatePicker: 제거됨
            classVideoDateList: document.getElementById('class-video-date-list'), // ID 변경됨

            videoDisplayModal: document.getElementById('student-video-display-modal'),
            videoModalTitle: document.getElementById('student-video-modal-title'),
            closeVideoModalBtn: document.getElementById('student-close-video-modal-btn'),
            videoModalContent: document.getElementById('student-video-modal-content'),
            // ===================================
        };
    },

    addEventListeners() {
        // ... (기존 리스너 유지) ...
        this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToLessonsBtnSuccess?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToSubjectsFromClassVideoBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        // DatePicker 리스너 제거됨
        // this.elements.qnaDatePicker?.addEventListener('change', (e) => this.loadQnaVideos(e.target.value));
        // this.elements.classVideoDatePicker?.addEventListener('change', (e) => this.loadClassVideos(e.target.value));
        this.elements.gotoQnaVideoCard?.addEventListener('click', () => this.showQnaVideoScreen());
        this.elements.gotoHomeworkCard?.addEventListener('click', () => studentHomework.showHomeworkScreen());
        this.elements.gotoClassVideoCard?.addEventListener('click', () => this.showClassVideoScreen());

        // ======[ 모달 닫기 리스너 추가 ]======
        this.elements.closeVideoModalBtn?.addEventListener('click', () => this.closeVideoModal());
        // ===================================
    },

    showScreen(screenElement) {
        // ... (기존 화면 숨김 로직 유지, videoDisplayModal 추가) ...
        const screens = [
            this.elements.loadingScreen, this.elements.loginScreen,
            this.elements.subjectSelectionScreen, this.elements.lessonSelectionScreen,
            this.elements.video1Screen, this.elements.quizScreen, this.elements.resultScreen,
            this.elements.homeworkScreen, this.elements.qnaVideoScreen, this.elements.classVideoScreen,
            // this.elements.videoDisplayModal // 모달은 별도 관리
        ];
        let hidingVideoScreen = false;
        screens.forEach(s => {
            if (s && s.style.display !== 'none') {
                // qna/classVideoScreen도 비디오 화면으로 간주
                if (s === this.elements.video1Screen || s === this.elements.resultScreen ||
                    s === this.elements.qnaVideoScreen || s === this.elements.classVideoScreen) {
                    hidingVideoScreen = true;
                }
                s.style.display = 'none';
            }
        });
        if (hidingVideoScreen) {
            this.stopAllVideos();
        }
        if(screenElement) {
            screenElement.style.display = 'flex'; // 기본값 flex로 변경
        } else {
            console.warn("[studentApp.js] showScreen called with null screenElement.");
        }
    },

    stopAllVideos() {
        // 모달 내 iframe도 포함하도록 셀렉터 수정
        const iframes = document.querySelectorAll(
            '#student-video1-iframe, #student-review-video2-iframe, #student-video2-iframe, #student-video-modal-content iframe'
        );
        iframes.forEach((iframe) => {
            if (iframe && iframe.src && iframe.src !== 'about:blank') {
                iframe.src = 'about:blank'; // iframe 중지
            }
        });
        // 모달 닫기 (비디오 화면 전환 시 모달도 닫도록)
        this.closeVideoModal();
    },

    // ... (showSubjectSelectionScreen, showLessonSelectionScreen 등 기존 함수 유지) ...
    showSubjectSelectionScreen() {
        if (!this.elements.welcomeMessage) {
            console.error("[studentApp.js] Welcome message element not found.");
            return;
        }
        this.elements.welcomeMessage.textContent = `${this.state.studentName || '학생'}님, 환영합니다!`;
        const isLiveLecture = this.state.classType === 'live-lecture';
        const isSelfDirected = !isLiveLecture;
        if (this.elements.startLessonCard) {
            this.elements.startLessonCard.style.display = isSelfDirected ? 'flex' : 'none';
        }
        if (this.elements.gotoClassVideoCard) {
            this.elements.gotoClassVideoCard.style.display = isLiveLecture ? 'flex' : 'none';
        }
        const commonMenuStyle = this.state.classId ? 'flex' : 'none';
        if (this.elements.gotoQnaVideoCard) {
             this.elements.gotoQnaVideoCard.style.display = commonMenuStyle;
        }
        if (this.elements.gotoHomeworkCard) {
            this.elements.gotoHomeworkCard.style.display = commonMenuStyle;
        }
        if (isSelfDirected && this.elements.subjectsList) {
             this.elements.subjectsList.innerHTML = '';
             if (this.state.activeSubjects.length === 0) {
                 this.elements.subjectsList.innerHTML = '<p class="text-center text-sm text-slate-400 py-4">수강 가능한 과목이 없습니다.</p>';
             } else {
                 this.state.activeSubjects.forEach(subject => this.renderSubjectChoice(subject));
             }
        } else if (this.elements.subjectsList) {
             this.elements.subjectsList.innerHTML = '';
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

    // ======[ 질문 영상 화면 표시 로직 수정 ]======
    showQnaVideoScreen() {
        if (!this.elements.qnaVideoDateList || !this.elements.qnaVideoScreen) {
             console.error("[studentApp.js] Cannot show QnA video screen: Required elements missing.");
             return;
        }
        this.loadAndRenderVideoDates('qna'); // 데이터 로드 및 날짜 카드 렌더링 함수 호출
        this.showScreen(this.elements.qnaVideoScreen);
    },
    // ===================================

    // ======[ 수업 영상 화면 표시 로직 수정 ]======
    showClassVideoScreen() {
         if (this.state.classType !== 'live-lecture') {
              console.warn("[studentApp.js] Self-directed students cannot access class video screen.");
              this.showSubjectSelectionScreen();
              return;
         }
         if (!this.elements.classVideoDateList || !this.elements.classVideoScreen) {
             console.error("[studentApp.js] Cannot show class video screen: Required elements missing.");
             return;
         }
         this.loadAndRenderVideoDates('class'); // 데이터 로드 및 날짜 카드 렌더링 함수 호출
         this.showScreen(this.elements.classVideoScreen);
     },
    // ===================================

    // ======[ 영상 날짜 로드 및 카드 렌더링 함수 추가 ]======
    async loadAndRenderVideoDates(videoType) { // 'qna' 또는 'class'
        const isQna = videoType === 'qna';
        const collectionName = isQna ? 'classVideos' : 'classLectures';
        const dateFieldName = isQna ? 'videoDate' : 'lectureDate';
        const listElement = isQna ? this.elements.qnaVideoDateList : this.elements.classVideoDateList;
        const stateKey = isQna ? 'qnaVideosByDate' : 'classVideosByDate';

        if (!listElement) {
            console.error(`[studentApp.js] Video date list element for ${videoType} not found.`);
            return;
        }
        if (!this.state.classId) {
            listElement.innerHTML = '<p class="text-center text-slate-500 py-8">반이 배정되지 않아 영상을 조회할 수 없습니다.</p>';
            return;
        }

        listElement.innerHTML = '<div class="loader mx-auto"></div>'; // 로딩 표시

        try {
            const q = query(
                collection(db, collectionName),
                where('classId', '==', this.state.classId),
                orderBy(dateFieldName, 'desc') // 날짜 필드로 최신순 정렬
            );
            const snapshot = await getDocs(q);

            const videosByDate = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data[dateFieldName]; // 'YYYY-MM-DD' 형식
                const videos = isQna ? [data] : (data.videos || []); // QnA는 문서당 영상 1개, 수업은 배열

                if (!date || videos.length === 0) return; // 날짜 없거나 영상 없으면 스킵

                if (!videosByDate[date]) {
                    videosByDate[date] = [];
                }
                // QnA 영상은 바로 추가, 수업 영상은 배열 내 영상들을 추가
                if (isQna) {
                     videosByDate[date].push({ id: doc.id, ...data });
                } else {
                     videos.forEach(v => videosByDate[date].push(v)); // 수업 영상 배열 추가
                }
            });

            this.state[stateKey] = videosByDate; // 상태 업데이트

            // 날짜 카드 렌더링
            listElement.innerHTML = ''; // 기존 목록 비우기
            const sortedDates = Object.keys(videosByDate).sort((a, b) => b.localeCompare(a)); // 최신 날짜 순

            if (sortedDates.length === 0) {
                listElement.innerHTML = `<p class="text-center text-slate-500 py-8">등록된 ${isQna ? '질문' : '수업'} 영상이 없습니다.</p>`;
                return;
            }

            sortedDates.forEach(date => {
                const videos = videosByDate[date];
                const card = document.createElement('button');
                card.className = "w-full p-4 border border-blue-300 bg-blue-50 rounded-lg text-lg font-semibold text-slate-800 hover:bg-blue-100 transition text-left";
                card.textContent = `${date} (${videos.length}개 영상)`;
                card.dataset.date = date;
                card.dataset.videoType = videoType;

                card.addEventListener('click', () => {
                    const clickedDate = card.dataset.date;
                    const type = card.dataset.videoType;
                    const videosForDate = this.state[type === 'qna' ? 'qnaVideosByDate' : 'classVideosByDate'][clickedDate];
                    this.openVideoModal(clickedDate, videosForDate, type);
                });
                listElement.appendChild(card);
            });

        } catch (error) {
            console.error(`[studentApp.js] Error loading ${videoType} video dates:`, error);
            listElement.innerHTML = `<p class="text-center text-red-500 py-8">${isQna ? '질문' : '수업'} 영상 목록 로딩 실패</p>`;
            showToast(`${isQna ? '질문' : '수업'} 영상 목록 로딩 실패`, true);
        }
    },
    // ===================================

    // ======[ 영상 표시 모달 열기 함수 추가 ]======
    openVideoModal(date, videos, videoType) {
        if (!this.elements.videoDisplayModal || !this.elements.videoModalTitle || !this.elements.videoModalContent) {
            console.error("Video display modal elements not found.");
            return;
        }

        this.elements.videoModalTitle.textContent = `${date} ${videoType === 'qna' ? '질문' : '수업'} 영상`;
        this.elements.videoModalContent.innerHTML = ''; // 내용 초기화

        if (!videos || videos.length === 0) {
            this.elements.videoModalContent.innerHTML = '<p class="text-center text-slate-500 py-8">해당 날짜에 영상이 없습니다.</p>';
        } else {
            videos.forEach(video => {
                const videoContainer = document.createElement('div');
                videoContainer.className = 'mb-6';

                const titleElement = document.createElement('h3');
                titleElement.className = 'text-lg font-bold text-slate-700 mb-2';
                titleElement.textContent = video.title || '제목 없음';
                videoContainer.appendChild(titleElement);

                // QnA 영상은 youtubeUrl, 수업 영상은 url 필드 사용
                const urlField = videoType === 'qna' ? 'youtubeUrl' : 'url';
                const embedUrl = studentLesson.convertYoutubeUrlToEmbed(video[urlField]);

                if (embedUrl) {
                    const iframeContainer = document.createElement('div');
                    iframeContainer.className = 'aspect-video shadow-lg rounded-lg overflow-hidden relative'; // aspect-video 사용

                    const iframe = document.createElement('iframe');
                    iframe.className = 'absolute top-0 left-0 w-full h-full';
                    iframe.src = 'about:blank'; // 초기에는 비움 (스크롤 성능 위해)
                    iframe.dataset.src = embedUrl; // 실제 URL 저장
                    iframe.frameBorder = '0';
                    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
                    iframe.allowFullscreen = true;
                    // iframe.style.display = 'none'; // 초기에는 숨김 (Intersection Observer 사용 예정)

                    iframeContainer.appendChild(iframe);
                    videoContainer.appendChild(iframeContainer);
                } else {
                    const errorMsg = document.createElement('p');
                    errorMsg.className = 'text-sm text-red-500';
                    errorMsg.textContent = `(영상 URL(${video[urlField] || '없음'})이 올바르지 않아 표시할 수 없습니다.)`;
                    videoContainer.appendChild(errorMsg);
                }
                this.elements.videoModalContent.appendChild(videoContainer);
            });

             // Intersection Observer로 iframe 지연 로딩 (모달 열린 후)
             setTimeout(() => { // 모달 표시 후 잠시 기다렸다가 옵저버 실행
                 const iframes = this.elements.videoModalContent.querySelectorAll('iframe[data-src]');
                 const observer = new IntersectionObserver((entries) => {
                     entries.forEach(entry => {
                         if (entry.isIntersecting) {
                             const iframe = entry.target;
                             iframe.src = iframe.dataset.src;
                             iframe.style.display = 'block';
                             observer.unobserve(iframe); // 한 번 로드되면 관찰 중지
                         }
                     });
                 });
                 iframes.forEach(iframe => observer.observe(iframe));
             }, 100); // 100ms 지연
        }

        this.elements.videoDisplayModal.style.display = 'flex';
        document.body.classList.add('modal-open'); // 스크롤 방지
    },
    // ===================================

    // ======[ 영상 표시 모달 닫기 함수 추가 ]======
    closeVideoModal() {
        if (this.elements.videoDisplayModal) {
            this.elements.videoDisplayModal.style.display = 'none';
             // 모달 내 모든 iframe 중지
             const iframes = this.elements.videoDisplayModal.querySelectorAll('iframe');
             iframes.forEach(iframe => {
                 if (iframe && iframe.src !== 'about:blank') {
                      iframe.src = 'about:blank';
                 }
             });
        }
        document.body.classList.remove('modal-open'); // 스크롤 잠금 해제
    },
    // ===================================


    // --- 기존 loadQnaVideos, loadClassVideos 함수 제거 ---
    // async loadQnaVideos(selectedDate) { ... } // 제거
    // async loadClassVideos(selectedDate) { ... } // 제거

    // ... (loadAvailableSubjects, listenForAvailableLessons, renderSubjectChoice, renderLessonChoice 함수 유지) ...
    async loadAvailableSubjects() {
        this.showScreen(this.elements.loadingScreen);
        this.state.activeSubjects = [];
        if (!this.state.classId) {
            this.state.classType = 'self-directed';
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
            }
             if (this.state.classType === 'self-directed') {
                const subjectsData = classDoc.exists() ? classDoc.data().subjects : {};
                if (!subjectsData || Object.keys(subjectsData).length === 0) {
                } else {
                    const subjectIds = Object.keys(subjectsData);
                    const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
                    this.state.activeSubjects = subjectDocs
                        .filter(d => d.exists())
                        .map(d => ({ id: d.id, ...d.data() }));
                     this.state.activeSubjects.sort((a,b) => a.name.localeCompare(b.name));
                }
             } else {
                 this.state.activeSubjects = [];
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
        StudentApp.state.authUid = user.uid;
        StudentApp.init();
    });
});

export default StudentApp;