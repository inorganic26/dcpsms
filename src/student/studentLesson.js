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
        if (!url || typeof url !== 'string') return '';
        if (url.includes('/embed/')) return url;
        let videoId = url.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    },

    startSelectedLesson(lesson) {
        this.app.state.activeLesson = lesson;
        this.app.state.currentRevVideoIndex = 0; 
        
        this.app.elements.video1Title.textContent = this.app.state.activeLesson.title;
        this.app.elements.video1Iframe.src = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url);

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
        if (!this.app.state.activeLesson) return;
        this.updateStudentProgress('퀴즈 푸는 중');
        this.app.showScreen(this.app.elements.quizScreen);
        this.app.state.currentQuestionIndex = 0; 
        this.app.state.score = 0;
        
        const shuffledBank = [...this.app.state.activeLesson.questionBank].sort(() => 0.5 - Math.random());
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
        
        [...question.options].sort(() => 0.5 - Math.random()).forEach(option => {
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
        this.app.state.currentRevVideoIndex = 0; // 결과 화면 진입 시 보충 풀이 영상 인덱스 초기화

        const pass = score >= passScore;
        this.updateStudentProgress(pass ? '퀴즈 통과 (완료)' : '퀴즈 실패', score);
        this.app.showScreen(this.app.elements.resultScreen);
        
        const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
        
        const revUrls = activeLesson.video2RevUrls;
        
        if (pass) {
            const button = this.app.elements.showRev2BtnSuccess;
            this.app.elements.successMessage.style.display = 'block'; 
            this.app.elements.failureMessage.style.display = 'none';
            this.app.elements.resultScoreTextSuccess.textContent = scoreText;
            this.app.elements.reviewVideo2Iframe.src = this.convertYoutubeUrlToEmbed(activeLesson.video2Url);
            
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
            this.app.elements.video2Iframe.src = this.convertYoutubeUrlToEmbed(activeLesson.video2Url);
            
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
        this.app.elements.reviewVideo2Iframe.src = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url);
    },

    async updateStudentProgress(status, score = null) {
        const { activeLesson, studentId, selectedSubject, studentName, totalQuizQuestions } = this.app.state;
        if (!activeLesson || !studentId) return;
        
        const submissionRef = doc(db, 'subjects', selectedSubject.id, 'lessons', activeLesson.id, 'submissions', studentId);
        const data = { 
            studentName: studentName, 
            status, 
            lastAttemptAt: serverTimestamp() 
        };
        if (score !== null) { 
            data.score = score; 
            data.totalQuestions = totalQuizQuestions; 
        }
        await setDoc(submissionRef, data, { merge: true });
    },

    updateScoreDisplay() { 
        this.app.elements.scoreText.textContent = `점수: ${this.app.state.score}`; 
    },

    updateProgress() {
        const { currentQuestionIndex, totalQuizQuestions } = this.app.state;
        const progress = (currentQuestionIndex + 1) / totalQuizQuestions * 100;
        this.app.elements.progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${totalQuizQuestions}`;
        this.app.elements.progressBar.style.width = `${progress}%`;
    },
};