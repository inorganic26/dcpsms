// src/student/studentApp.js

import { collection, doc, getDocs, getDoc, where, query, orderBy } from "firebase/firestore"; // orderBy 추가
import { db, ensureAnonymousAuth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// Import modules
import { studentAuth } from './studentAuth.js';
import { studentLesson } from './studentLesson.js';
import { studentHomework } from './studentHomework.js';
import { reportManager } from '../shared/reportManager.js'; // reportManager 추가

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
        qnaVideosByDate: {},
        classVideosByDate: {},
        currentVideoDate: null,
        currentVideoType: null,
        reportsByDate: null, // 시험 결과 리포트 상태 추가 { 'YYYYMMDD': [{ fileName, storagePath, downloadUrl }], ... }
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
            startLessonCard: document.getElementById('student-start-lesson-card'),
            gotoQnaVideoCard: document.getElementById('student-goto-qna-video-card'),
            gotoHomeworkCard: document.getElementById('student-goto-homework-card'),
            gotoClassVideoCard: document.getElementById('student-goto-class-video-card'),
            gotoReportCard: document.getElementById('student-goto-report-card'), // 리포트 카드 추가
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
            qnaVideoScreen: document.getElementById('student-qna-video-screen'),
            backToSubjectsFromQnaBtn: document.getElementById('student-back-to-subjects-from-qna-btn'),
            qnaVideoDateList: document.getElementById('qna-video-date-list'),
            classVideoScreen: document.getElementById('student-class-video-screen'),
            backToSubjectsFromClassVideoBtn: document.getElementById('student-back-to-subjects-from-class-video-btn'),
            classVideoDateList: document.getElementById('class-video-date-list'),
            videoTitlesScreen: document.getElementById('student-video-titles-screen'),
            videoTitlesDate: document.getElementById('student-video-titles-date'),
            backToVideoDatesBtn: document.getElementById('student-back-to-video-dates-btn'),
            videoTitlesList: document.getElementById('student-video-titles-list'),
            videoDisplayModal: document.getElementById('student-video-display-modal'),
            videoModalTitle: document.getElementById('student-video-modal-title'),
            closeVideoModalBtn: document.getElementById('student-close-video-modal-btn'),
            videoModalContent: document.getElementById('student-video-modal-content'),
            // 시험 결과 리포트 관련 요소 추가
            reportListScreen: document.getElementById('student-report-list-screen'),
            backToMenuFromReportListBtn: document.getElementById('student-back-to-menu-from-report-list-btn'),
            reportListContainer: document.getElementById('student-report-list'),
            reportViewerModal: document.getElementById('student-report-viewer-modal'),
            reportModalTitle: document.getElementById('student-report-modal-title'),
            closeReportModalBtn: document.getElementById('student-close-report-modal-btn'),
            reportModalContent: document.getElementById('student-report-modal-content'),
            reportIframe: document.getElementById('student-report-iframe'),
        };
    },

    addEventListeners() {
        this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToLessonsBtnSuccess?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.backToSubjectsFromQnaBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToSubjectsFromClassVideoBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToVideoDatesBtn?.addEventListener('click', () => this.backToVideoDatesScreen());
        this.elements.gotoQnaVideoCard?.addEventListener('click', () => this.showQnaVideoScreen());
        this.elements.gotoHomeworkCard?.addEventListener('click', () => studentHomework.showHomeworkScreen());
        this.elements.gotoClassVideoCard?.addEventListener('click', () => this.showClassVideoScreen());
        this.elements.closeVideoModalBtn?.addEventListener('click', () => this.closeVideoModal());
        // 시험 결과 리포트 관련 리스너 추가
        this.elements.gotoReportCard?.addEventListener('click', () => this.showReportListScreen());
        this.elements.backToMenuFromReportListBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.closeReportModalBtn?.addEventListener('click', () => this.closeReportModal());
    },

    showScreen(screenElement) {
        const screens = [
            this.elements.loadingScreen, this.elements.loginScreen,
            this.elements.subjectSelectionScreen, this.elements.lessonSelectionScreen,
            this.elements.video1Screen, this.elements.quizScreen, this.elements.resultScreen,
            this.elements.homeworkScreen, this.elements.qnaVideoScreen, this.elements.classVideoScreen,
            this.elements.videoTitlesScreen,
            this.elements.reportListScreen // 추가
        ];
        let hidingVideoScreen = false;
        screens.forEach(s => {
            if (s && s.style.display !== 'none') {
                if (s === this.elements.video1Screen || s === this.elements.resultScreen ||
                    s === this.elements.qnaVideoScreen || s === this.elements.classVideoScreen ||
                    s === this.elements.videoTitlesScreen) {
                    hidingVideoScreen = true;
                }
                s.style.display = 'none';
            }
        });
        if (hidingVideoScreen) {
            this.stopAllVideos(); // 비디오 화면 전환 시 비디오 정지
        }
        // 리포트 모달도 화면 전환 시 닫기
        this.closeReportModal();

        if(screenElement) {
            screenElement.style.display = 'flex';
        } else {
            console.warn("[studentApp.js] showScreen called with null screenElement.");
        }
    },

    stopAllVideos() {
        const iframes = document.querySelectorAll(
            '#student-video1-iframe, #student-review-video2-iframe, #student-video2-iframe, #student-video-modal-content iframe'
        );
        iframes.forEach((iframe) => {
            if (iframe && iframe.src && iframe.src !== 'about:blank') {
                iframe.src = 'about:blank'; // 비디오 iframe 중지
            }
        });
        this.closeVideoModal(); // 비디오 모달 닫기
    },

    showSubjectSelectionScreen() {
        if (!this.elements.welcomeMessage) {
            console.error("[studentApp.js] Welcome message element not found.");
            return;
        }
        this.elements.welcomeMessage.textContent = `${this.state.studentName || '학생'}님, 환영합니다!`;
        const isLiveLecture = this.state.classType === 'live-lecture';
        const isSelfDirected = !isLiveLecture;

        // 메뉴 카드 표시/숨김
        if (this.elements.startLessonCard) this.elements.startLessonCard.style.display = isSelfDirected ? 'flex' : 'none';
        if (this.elements.gotoClassVideoCard) this.elements.gotoClassVideoCard.style.display = isLiveLecture ? 'flex' : 'none';
        const commonMenuStyle = this.state.classId ? 'flex' : 'none'; // 반 배정 시 공통 메뉴 표시
        if (this.elements.gotoQnaVideoCard) this.elements.gotoQnaVideoCard.style.display = commonMenuStyle;
        if (this.elements.gotoHomeworkCard) this.elements.gotoHomeworkCard.style.display = commonMenuStyle;
        if (this.elements.gotoReportCard) this.elements.gotoReportCard.style.display = commonMenuStyle; // 리포트 카드 추가

        // 과목 목록 (자기주도반만)
        if (isSelfDirected && this.elements.subjectsList) {
             this.elements.subjectsList.innerHTML = '';
             if (this.state.activeSubjects.length === 0) {
                 this.elements.subjectsList.innerHTML = '<p class="text-center text-sm text-slate-400 py-4">수강 가능한 과목이 없습니다.</p>';
             } else {
                 this.state.activeSubjects.forEach(subject => this.renderSubjectChoice(subject));
             }
        } else if (this.elements.subjectsList) {
             this.elements.subjectsList.innerHTML = ''; // 현강반은 비움
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
        if (!this.elements.qnaVideoDateList || !this.elements.qnaVideoScreen) {
             console.error("[studentApp.js] Cannot show QnA video screen: Required elements missing.");
             return;
        }
        this.state.currentVideoType = 'qna';
        this.loadAndRenderVideoDates('qna');
        this.showScreen(this.elements.qnaVideoScreen);
    },

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
         this.state.currentVideoType = 'class';
         this.loadAndRenderVideoDates('class');
         this.showScreen(this.elements.classVideoScreen);
     },

    async loadAndRenderVideoDates(videoType) {
        const isQna = videoType === 'qna';
        const collectionName = isQna ? 'classVideos' : 'classLectures';
        const dateFieldName = isQna ? 'videoDate' : 'lectureDate';
        const listElement = isQna ? this.elements.qnaVideoDateList : this.elements.classVideoDateList;
        const stateKey = isQna ? 'qnaVideosByDate' : 'classVideosByDate';

        if (!listElement) {
            console.error(`[studentApp.js] Video date list element for ${videoType} not found.`); return;
        }
        if (!this.state.classId) {
            listElement.innerHTML = '<p class="text-center text-slate-500 py-8">반이 배정되지 않아 영상을 조회할 수 없습니다.</p>'; return;
        }

        listElement.innerHTML = '<div class="loader mx-auto"></div>'; // 로딩 표시

        try {
            const q = query(
                collection(db, collectionName),
                where('classId', '==', this.state.classId),
                orderBy(dateFieldName, 'desc') // 날짜 내림차순 정렬
            );
            const snapshot = await getDocs(q);

            const videosByDate = {};
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data[dateFieldName]; // YYYY-MM-DD 형식
                const videosRaw = isQna ? [data] : (data.videos || []); // 수업 영상은 videos 배열

                if (!date || videosRaw.length === 0) return; // 날짜 없거나 영상 없으면 스킵

                // 각 영상에 고유 ID 부여 (화면 이동 및 재생 시 식별용)
                const videos = videosRaw.map((v, index) => ({
                    ...v,
                    // QnA는 문서 ID, 수업 영상은 날짜+인덱스+제목 조합
                    videoId: isQna ? doc.id : `${date}-${index}-${v.title?.replace(/\s+/g, '-') || 'no-title'}`
                }));

                if (!videosByDate[date]) {
                    videosByDate[date] = [];
                }
                videosByDate[date].push(...videos);
            });

            this.state[stateKey] = videosByDate; // 상태 업데이트

            listElement.innerHTML = ''; // 로딩 제거
            const sortedDates = Object.keys(videosByDate).sort((a, b) => b.localeCompare(a)); // 날짜 내림차순 정렬

            if (sortedDates.length === 0) {
                listElement.innerHTML = `<p class="text-center text-slate-500 py-8">등록된 ${isQna ? '질문' : '수업'} 영상이 없습니다.</p>`; return;
            }

            sortedDates.forEach(date => {
                const videos = videosByDate[date];
                const card = document.createElement('button');
                card.className = "w-full p-4 border border-blue-300 bg-blue-50 rounded-lg text-lg font-semibold text-slate-800 hover:bg-blue-100 transition text-left";
                card.textContent = `${date} (${videos.length}개 영상)`;
                card.dataset.date = date;
                card.dataset.videoType = videoType;

                card.addEventListener('click', () => {
                    this.showVideoTitlesScreen(date, videoType); // 제목 목록 화면 표시 함수 호출
                });
                listElement.appendChild(card);
            });

        } catch (error) {
            console.error(`[studentApp.js] Error loading ${videoType} video dates:`, error);
            listElement.innerHTML = `<p class="text-center text-red-500 py-8">${isQna ? '질문' : '수업'} 영상 목록 로딩 실패</p>`;
            showToast(`${isQna ? '질문' : '수업'} 영상 목록 로딩 실패`, true);
        }
    },

    showVideoTitlesScreen(date, videoType) {
        if (!this.elements.videoTitlesScreen || !this.elements.videoTitlesDate || !this.elements.videoTitlesList) {
            console.error("[studentApp.js] Video titles screen elements not found.");
            showToast("영상 목록 화면을 열 수 없습니다.", true);
            this.backToVideoDatesScreen();
            return;
        }

        this.state.currentVideoDate = date; // 현재 날짜 상태 업데이트
        this.state.currentVideoType = videoType; // 현재 비디오 타입 업데이트

        const stateKey = videoType === 'qna' ? 'qnaVideosByDate' : 'classVideosByDate';
        const videos = this.state[stateKey]?.[date]; // 해당 날짜의 영상 목록 가져오기

        this.elements.videoTitlesDate.textContent = `${date} ${videoType === 'qna' ? '질문' : '수업'} 영상 목록`;
        this.elements.videoTitlesList.innerHTML = ''; // 목록 초기화

        if (!videos || videos.length === 0) {
            this.elements.videoTitlesList.innerHTML = '<p class="text-center text-slate-500 py-8">해당 날짜에 영상이 없습니다.</p>';
        } else {
            videos.forEach(video => {
                const button = document.createElement('button');
                button.className = "w-full p-3 border border-gray-300 bg-white rounded-lg text-md font-medium text-slate-700 hover:bg-gray-50 transition text-left";
                button.textContent = video.title || '제목 없음';
                button.dataset.videoId = video.videoId; // 고유 ID 저장

                button.addEventListener('click', () => {
                     const clickedVideo = videos.find(v => v.videoId === button.dataset.videoId);
                     if (clickedVideo) {
                        this.playVideoInModal(clickedVideo, videoType); // 모달에서 비디오 재생
                     } else {
                         console.error("클릭된 비디오 정보를 찾을 수 없습니다:", button.dataset.videoId);
                         showToast("영상을 재생할 수 없습니다.", true);
                     }
                });
                this.elements.videoTitlesList.appendChild(button);
            });
        }
        this.showScreen(this.elements.videoTitlesScreen);
    },

     backToVideoDatesScreen() {
        if (this.state.currentVideoType === 'qna') {
            this.showQnaVideoScreen();
        } else if (this.state.currentVideoType === 'class') {
            this.showClassVideoScreen();
        } else {
            this.showSubjectSelectionScreen(); // 타입 정보 없으면 메인으로
        }
        this.state.currentVideoDate = null; // 날짜 상태 초기화
    },

    playVideoInModal(video, videoType) {
        if (!this.elements.videoDisplayModal || !this.elements.videoModalTitle || !this.elements.videoModalContent) {
            console.error("Video display modal elements not found."); return;
        }

        this.elements.videoModalTitle.textContent = video.title || '제목 없음';
        this.elements.videoModalContent.innerHTML = ''; // 내용 초기화

        const urlField = videoType === 'qna' ? 'youtubeUrl' : 'url';
        const embedUrl = studentLesson.convertYoutubeUrlToEmbed(video[urlField]);

        if (embedUrl) {
            const iframeContainer = document.createElement('div');
            iframeContainer.className = 'w-full h-full aspect-video shadow-lg rounded-lg overflow-hidden relative';
            const iframe = document.createElement('iframe');
            iframe.className = 'absolute top-0 left-0 w-full h-full';
            iframe.src = embedUrl;
            iframe.frameBorder = '0';
            iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
            iframe.allowFullscreen = true;
            iframeContainer.appendChild(iframe);
            this.elements.videoModalContent.appendChild(iframeContainer);
        } else {
            const errorMsg = document.createElement('p');
            errorMsg.className = 'text-center text-red-500 py-8';
            errorMsg.textContent = `영상 URL(${video[urlField] || '없음'})이 올바르지 않아 표시할 수 없습니다.`;
            this.elements.videoModalContent.appendChild(errorMsg);
        }

        this.elements.videoDisplayModal.style.display = 'flex';
        document.body.classList.add('modal-open'); // 스크롤 방지
    },

    closeVideoModal() {
        if (this.elements.videoDisplayModal) {
            this.elements.videoDisplayModal.style.display = 'none';
             const iframes = this.elements.videoDisplayModal.querySelectorAll('iframe');
             iframes.forEach(iframe => { if (iframe && iframe.src !== 'about:blank') iframe.src = 'about:blank'; });
             this.elements.videoModalContent.innerHTML = ''; // 모달 내용 비우기
        }
        document.body.classList.remove('modal-open'); // 스크롤 잠금 해제
    },

    // 시험 결과 리포트 목록 화면 표시 - 추가됨
    async showReportListScreen() {
        const listEl = this.elements.reportListContainer;
        if (!listEl) {
             console.error("[studentApp] reportListContainer element not found."); return;
        }

        // 반 ID 없으면 안내 메시지 표시
        if (!this.state.classId) {
            showToast("반이 배정되지 않아 시험 결과를 볼 수 없습니다.");
            listEl.innerHTML = '<p class="text-center text-slate-500 py-8">반 배정 정보 없음</p>';
            this.showScreen(this.elements.reportListScreen);
            return;
        }
        // 학생 이름 없으면 (로그인 직후 등) 안내 메시지 표시
        if (!this.state.studentName) {
            showToast("학생 정보를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
             listEl.innerHTML = '<p class="text-center text-slate-500 py-8">학생 정보 로딩 중...</p>';
             this.showScreen(this.elements.reportListScreen);
             return;
        }

        this.showScreen(this.elements.reportListScreen); // 화면 먼저 전환
        listEl.innerHTML = '<div class="loader mx-auto my-4"></div>'; // 로딩 표시

        // reportManager를 사용하여 학생 리포트 목록 조회
        const reports = await reportManager.listStudentReports(this.state.classId, this.state.studentName);
        this.state.reportsByDate = reports; // 조회 결과 상태에 저장

        listEl.innerHTML = ''; // 로딩 제거

        if (!reports) { // 조회 중 오류 발생 (listStudentReports에서 null 반환)
            listEl.innerHTML = '<p class="text-center text-red-500 py-8">리포트 목록을 불러오는 중 오류가 발생했습니다.</p>';
            return;
        }
        if (Object.keys(reports).length === 0) { // 리포트 없음
            listEl.innerHTML = '<p class="text-center text-slate-500 py-8">확인 가능한 시험 결과 리포트가 없습니다.</p>';
            // TODO: 미응시 처리 - 전체 시험 목록과 비교 필요
            // 예를 들어, Firestore /tests 컬렉션에서 해당 반의 시험 목록을 가져와
            // reportsByDate에 없는 날짜의 시험을 "미응시"로 표시할 수 있음
            return;
        }

        // 날짜 역순(최신순)으로 정렬
        const sortedDates = Object.keys(reports).sort((a, b) => b.localeCompare(a));

        sortedDates.forEach(date => { // 각 날짜별로 섹션 생성
            const dateReports = reports[date];
            if (!dateReports || dateReports.length === 0) return; // 해당 날짜 리포트 없으면 스킵

            // 날짜 표시 형식 변환 (YYYYMMDD -> YYYY년 MM월 DD일)
            const year = date.substring(0, 4);
            const month = date.substring(4, 6);
            const day = date.substring(6, 8);
            const formattedDate = `${year}년 ${month}월 ${day}일`;

            const dateSection = document.createElement('div');
            dateSection.className = 'mb-6'; // 날짜별 간격
            dateSection.innerHTML = `<h2 class="text-xl font-semibold text-slate-700 mb-3 border-b pb-2">${formattedDate}</h2>`;

            // 해당 날짜의 리포트 버튼 생성
            dateReports.forEach(reportInfo => {
                const button = document.createElement('button');
                button.className = "w-full p-3 border border-gray-300 bg-white rounded-lg text-md font-medium text-slate-700 hover:bg-gray-50 transition text-left block mb-2";

                // 파일 이름에서 불필요한 부분 제거하여 표시 (예: "고1월수_리포트")
                let displayName = reportInfo.fileName
                    .replace(`_${this.state.studentName}_리포트.pdf`, '') // 이름과 확장자 제거
                    .replace(`_${date}_`, '_') // YYYYMMDD 날짜 제거
                    .replace(`_${year}-${month}-${day}_`, '_'); // YYYY-MM-DD 날짜 제거
                button.textContent = displayName || reportInfo.fileName; // 제거 실패 시 원본 표시
                button.dataset.storagePath = reportInfo.storagePath; // Storage 경로 저장

                button.addEventListener('click', async (e) => {
                    const path = e.currentTarget.dataset.storagePath;
                    button.disabled = true;
                    button.textContent = "리포트 여는 중...";
                    const url = await reportManager.getReportDownloadUrl(path); // 다운로드 URL 가져오기
                    if (url) {
                        this.showReportInModal(displayName, url); // 모달에 표시
                    } else {
                         showToast("리포트를 열 수 없습니다. 파일이 삭제되었거나 권한 문제가 있을 수 있습니다.", true);
                    }
                    button.disabled = false;
                    button.textContent = displayName; // 버튼 텍스트 복원
                });
                dateSection.appendChild(button);
            });
            listEl.appendChild(dateSection);
        });
    },

    // PDF 리포트 모달 표시 - 추가됨
    showReportInModal(title, pdfUrl) {
        if (!this.elements.reportViewerModal || !this.elements.reportModalTitle || !this.elements.reportIframe) {
            console.error("Report viewer modal elements not found."); return;
        }

        this.elements.reportModalTitle.textContent = title || '시험 결과 리포트';
        // Google Docs 뷰어를 사용하여 PDF 렌더링 (모바일 호환성 및 기능)
        // const viewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(pdfUrl)}&embedded=true`;
        // this.elements.reportIframe.src = viewerUrl;

        // 또는 직접 iframe에 로드 (브라우저 내장 뷰어 사용)
        this.elements.reportIframe.src = pdfUrl;

        this.elements.reportViewerModal.style.display = 'flex';
        document.body.classList.add('modal-open'); // 뒷 배경 스크롤 방지
    },

    // PDF 리포트 모달 닫기 - 추가됨
    closeReportModal() {
        if (this.elements.reportViewerModal) {
            this.elements.reportViewerModal.style.display = 'none';
            // iframe 내용 비우기 (메모리 누수 방지)
            if (this.elements.reportIframe) {
                this.elements.reportIframe.src = 'about:blank';
            }
        }
        document.body.classList.remove('modal-open'); // 스크롤 잠금 해제
    },


    // --- 기존 함수들 (loadAvailableSubjects, listenForAvailableLessons, etc.) 유지 ---
    // (이하 기존 함수들은 변경 없이 유지됩니다)
    async loadAvailableSubjects() { /* ... 기존 코드 ... */ },
    async listenForAvailableLessons() { /* ... 기존 코드 ... */ },
    renderSubjectChoice(subject) { /* ... 기존 코드 ... */ },
    renderLessonChoice(lesson) { /* ... 기존 코드 ... */ },

}; // StudentApp 객체 끝

// ▼▼▼ [수정] 디버깅을 위한 console.log 추가 ▼▼▼
document.addEventListener('DOMContentLoaded', () => {
    console.log('[StudentApp] DOM 로드 완료. 익명 인증 시작...');
    
    ensureAnonymousAuth((user) => {
        console.log('[StudentApp] 익명 인증 성공. 앱 초기화 시작.'); // 이 로그가 뜨는지 확인
        StudentApp.state.authUid = user.uid;
        StudentApp.init();
    });
});
// ▲▲▲ [수정] 디버깅을 위한 console.log 추가 ▲▲▲


export default StudentApp;