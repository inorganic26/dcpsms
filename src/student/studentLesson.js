// src/student/studentLesson.js

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentLesson = {
    init(app) {
        this.app = app;

        this.app.elements.gotoRev1Btn?.addEventListener('click', () => this.showNextRevisionVideo(1));
        this.app.elements.startQuizBtn?.addEventListener('click', () => this.startQuiz());
        this.app.elements.retryQuizBtn?.addEventListener('click', () => this.startQuiz());
        this.app.elements.rewatchVideo1Btn?.addEventListener('click', () => this.rewatchVideo1());
        this.app.elements.showRev2BtnSuccess?.addEventListener('click', () => this.showNextRevisionVideo(2, true));
        this.app.elements.showRev2BtnFailure?.addEventListener('click', () => this.showNextRevisionVideo(2, false));
    },

    convertYoutubeUrlToEmbed(url) {
        if (!url || typeof url !== 'string') {
            console.error("Invalid URL provided to convertYoutubeUrlToEmbed:", url); 
            return '';
        }
        
        // URL 정리 (앞뒤 공백 제거)
        url = url.trim();
        
        // 이미 embed 형식이면 videoId만 추출해서 재구성
        if (url.includes('/embed/')) {
            const match = url.match(/embed\/([a-zA-Z0-9_-]{11})/);
            if (match && match[1]) {
                return `https://www.youtube.com/embed/${match[1]}`;
            }
        }
        
        // YouTube URL에서 videoId 추출
        let videoId = null;
        
        try {
            // youtube.com/watch?v=VIDEO_ID 형식
            if (url.includes('youtube.com/watch')) {
                const urlObj = new URL(url);
                videoId = urlObj.searchParams.get('v');
            } 
            // youtu.be/VIDEO_ID 형식
            else if (url.includes('youtu.be/')) {
                const parts = url.split('youtu.be/')[1];
                if (parts) {
                    videoId = parts.split(/[?&#]/)[0];
                }
            }
            // youtube.com/embed/VIDEO_ID 형식
            else if (url.includes('youtube.com/embed/')) {
                const parts = url.split('youtube.com/embed/')[1];
                if (parts) {
                    videoId = parts.split(/[?&#]/)[0];
                }
            }
        } catch (e) {
            console.error("URL parsing error:", e);
        }
        
        // videoId 유효성 검사
        if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
            console.error("Invalid YouTube videoId:", videoId, "from URL:", url); 
            return '';
        }

        // 안전한 embed URL 반환
        return `https://www.youtube.com/embed/${videoId}`;
    },

    startSelectedLesson(lesson) {
        this.app.state.activeLesson = lesson;
        this.app.state.currentRevVideoIndex = 0;

        const embedUrl = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url); 
        console.log("Video 1 URL to embed:", embedUrl); 

        if (!embedUrl) {
            showToast("비디오 URL이 올바르지 않습니다.");
            return;
        }

        this.app.elements.video1Title.textContent = this.app.state.activeLesson.title;
        this.app.elements.video1Iframe.src = embedUrl;

        const revUrls = this.app.state.activeLesson.video1RevUrls;
        if (revUrls && revUrls.length > 0) {
            this.app.elements.gotoRev1Btn.style.display = 'block';
            this.app.elements.gotoRev1Btn.textContent = `보충 영상 보기 (1/${revUrls.length})`;
            this.app.elements.startQuizBtn.style.display = 'none';
        } else {
            this.app.elements.gotoRev1Btn.style.display = 'none';
            this.app.elements.startQuizBtn.style.display = 'block';
        }

        this.app.showScreen(this.app.elements.video1Screen);
    },

    showNextRevisionVideo(type, isSuccess = null) {
        const { state, elements } = this.app;
        const revUrls = (type === 1) ? state.activeLesson.video1RevUrls : state.activeLesson.video2RevUrls;

        if (!revUrls || revUrls.length === 0) return;

        const currentIndex = state.currentRevVideoIndex;
        if (currentIndex >= revUrls.length) return;

        const url = this.convertYoutubeUrlToEmbed(revUrls[currentIndex]);
        
        if (!url) {
            showToast("비디오 URL이 올바르지 않습니다.");
            return;
        }
        
        const title = `${state.activeLesson.title} (보충 영상 ${currentIndex + 1}/${revUrls.length})`;

        if (type === 1) {
            elements.video1Title.textContent = title;
            elements.video1Iframe.src = url;
            state.currentRevVideoIndex++;

            if (state.currentRevVideoIndex < revUrls.length) {
                elements.gotoRev1Btn.textContent = `보충 영상 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`;
            } else {
                elements.gotoRev1Btn.style.display = 'none';
                elements.startQuizBtn.style.display = 'block';
            }
        } else { // type === 2
            const button = isSuccess ? elements.showRev2BtnSuccess : elements.showRev2BtnFailure;
            const iframe = isSuccess ? elements.reviewVideo2Iframe : elements.video2Iframe;

            iframe.src = url;
            state.currentRevVideoIndex++;

            if (state.currentRevVideoIndex < revUrls.length) {
                button.textContent = `보충 풀이 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`;
            } else {
                button.style.display = 'none';
            }
        }
    },

    startQuiz() {
        if (!this.app.state.activeLesson) {
            console.error("activeLesson이 없습니다.");
            return;
        }
        
        this.updateStudentProgress('퀴즈 푸는 중');
        this.app.showScreen(this.app.elements.quizScreen);
        this.app.state.currentQuestionIndex = 0;
        this.app.state.score = 0;

        const questionBank = Array.isArray(this.app.state.activeLesson.questionBank)
                             ? this.app.state.activeLesson.questionBank
                             : [];

        if (questionBank.length === 0) {
            showToast("퀴즈 문항이 없습니다. 관리자에게 문의하세요.");
            this.app.showLessonSelectionScreen();
            return;
        }

        const shuffledBank = [...questionBank].sort(() => 0.5 - Math.random());
        this.app.state.quizQuestions = shuffledBank.slice(0, this.app.state.totalQuizQuestions);

        this.updateScoreDisplay();
        this.displayQuestion();
    },

    displayQuestion() {
        const { quizQuestions, currentQuestionIndex } = this.app.state;
        const question = quizQuestions[currentQuestionIndex];

        if (!question) {
            this.showResults();
            return;
        }

        this.updateProgress();
        this.app.elements.questionText.textContent = question.question;
        this.app.elements.optionsContainer.innerHTML = '';

        const options = Array.isArray(question.options) ? question.options : [];

        if (options.length === 0) {
            console.warn(`Question ${currentQuestionIndex + 1} has no options.`);
            setTimeout(() => {
                this.app.state.currentQuestionIndex++;
                this.displayQuestion();
            }, 500);
            return;
        }

        [...options].sort(() => 0.5 - Math.random()).forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100';
            button.onclick = (e) => this.selectAnswer(e);
            this.app.elements.optionsContainer.appendChild(button);
        });
    },

    selectAnswer(e) {
        this.app.elements.optionsContainer.classList.add('disabled');
        const selected = e.target.textContent;
        const correct = this.app.state.quizQuestions[this.app.state.currentQuestionIndex].answer;

        if (selected === correct) {
            this.app.state.score++;
            e.target.classList.add('correct');
        } else {
            e.target.classList.add('incorrect');
            Array.from(this.app.elements.optionsContainer.children).forEach(btn => {
                if (btn.textContent === correct) btn.classList.add('correct');
            });
        }

        this.updateScoreDisplay();
        setTimeout(() => {
            this.app.elements.optionsContainer.classList.remove('disabled');
            this.app.state.currentQuestionIndex++;
            this.displayQuestion();
        }, 1500);
    },

    showResults() {
        const { score, passScore, totalQuizQuestions, activeLesson } = this.app.state;
        this.app.state.currentRevVideoIndex = 0;

        const pass = score >= passScore;
        this.updateStudentProgress(pass ? '퀴즈 통과 (완료)' : '퀴즈 실패', score);
        this.app.showScreen(this.app.elements.resultScreen);

        const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
        const revUrls = Array.isArray(activeLesson.video2RevUrls) ? activeLesson.video2RevUrls : [];

        const video2EmbedUrl = this.convertYoutubeUrlToEmbed(activeLesson.video2Url);
        
        if (!video2EmbedUrl) {
            console.error("video2Url이 올바르지 않습니다:", activeLesson.video2Url);
        }

        if (pass) {
            const button = this.app.elements.showRev2BtnSuccess;
            this.app.elements.successMessage.style.display = 'block';
            this.app.elements.failureMessage.style.display = 'none';
            this.app.elements.resultScoreTextSuccess.textContent = scoreText;
            
            if (video2EmbedUrl) {
                this.app.elements.reviewVideo2Iframe.src = video2EmbedUrl;
            }

            if (revUrls && revUrls.length > 0) {
                button.textContent = `보충 풀이 보기 (1/${revUrls.length})`;
                button.style.display = 'block';
            } else {
                button.style.display = 'none';
            }
        } else {
            const button = this.app.elements.showRev2BtnFailure;
            this.app.elements.successMessage.style.display = 'none';
            this.app.elements.failureMessage.style.display = 'block';
            this.app.elements.resultScoreTextFailure.textContent = scoreText;
            
            if (video2EmbedUrl) {
                this.app.elements.video2Iframe.src = video2EmbedUrl;
            }

            if (revUrls && revUrls.length > 0) {
                button.textContent = `보충 풀이 보기 (1/${revUrls.length})`;
                button.style.display = 'block';
            } else {
                button.style.display = 'none';
            }
        }
    },

    rewatchVideo1() {
        if (!this.app.state.activeLesson) return;
        
        const embedUrl = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url);
        if (embedUrl) {
            this.app.elements.reviewVideo2Iframe.src = embedUrl;
        }
    },

    async updateStudentProgress(status, score = null) {
        const { activeLesson, authUid, selectedSubject, studentName, totalQuizQuestions } = this.app.state;
        
        if (!activeLesson || !authUid || !selectedSubject) {
            console.warn("학습 진행 상황 업데이트 실패: 필요한 정보 부족", { 
                hasActiveLesson: !!activeLesson, 
                hasAuthUid: !!authUid, 
                hasSelectedSubject: !!selectedSubject 
            });
            return;
        }

        const submissionRef = doc(db, 'subjects', selectedSubject.id, 'lessons', activeLesson.id, 'submissions', authUid);
        const data = {
            studentName: studentName || '익명',
            status,
            lastAttemptAt: serverTimestamp()
        };
        
        if (score !== null) {
            data.score = score;
            data.totalQuestions = totalQuizQuestions;
        }

        try {
            await setDoc(submissionRef, data, { merge: true });
            console.log("Student progress updated successfully:", status, score);
        } catch (error) {
            console.error("Firestore 쓰기 오류 (updateStudentProgress):", error);
            
            if (error.code === 'permission-denied') {
                showToast("학습 기록 저장 권한이 없습니다. 관리자에게 문의하세요.");
            } else if (error.code === 'unavailable') {
                showToast("네트워크 연결을 확인해주세요.");
            } else {
                showToast("학습 기록 저장 중 오류가 발생했습니다.");
            }
        }
    },

    updateScoreDisplay() {
        this.app.elements.scoreText.textContent = `점수: ${this.app.state.score}`;
    },

    updateProgress() {
        const { currentQuestionIndex, totalQuizQuestions } = this.app.state;
        const progress = totalQuizQuestions > 0 ? (currentQuestionIndex + 1) / totalQuizQuestions * 100 : 0;
        this.app.elements.progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${totalQuizQuestions}`;
        this.app.elements.progressBar.style.width = `${progress}%`;
    },
};