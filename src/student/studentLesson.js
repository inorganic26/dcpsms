// src/student/studentLesson.js

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from '../shared/firebase.js';

export const studentLesson = {
    init(app) {
        this.app = app;

        // 학습 및 퀴즈 관련 이벤트 리스너 설정
        this.app.elements.gotoRev1Btn?.addEventListener('click', () => this.showRevisionVideo1());
        this.app.elements.startQuizBtn?.addEventListener('click', () => this.startQuiz());
        this.app.elements.retryQuizBtn?.addEventListener('click', () => this.startQuiz());
        this.app.elements.rewatchVideo1Btn?.addEventListener('click', () => this.rewatchVideo1());
        this.app.elements.showRev2BtnSuccess?.addEventListener('click', () => this.showRevisionVideo2(true));
        this.app.elements.showRev2BtnFailure?.addEventListener('click', () => this.showRevisionVideo2(false));
    },

    // 유튜브 URL을 임베드용으로 변환
    convertYoutubeUrlToEmbed(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.includes('/embed/')) return url;
        let videoId = url.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    },

    // 선택된 학습 시작 (영상 1 재생)
    startSelectedLesson(lesson) {
        this.app.state.activeLesson = lesson;
        this.app.elements.video1Title.textContent = this.app.state.activeLesson.title;
        this.app.elements.video1Iframe.src = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url);

        if (this.app.state.activeLesson.video1RevUrl) {
            this.app.elements.gotoRev1Btn.style.display = 'block';
            this.app.elements.startQuizBtn.style.display = 'none';
        } else {
            this.app.elements.gotoRev1Btn.style.display = 'none';
            this.app.elements.startQuizBtn.style.display = 'block';
        }
        
        this.app.showScreen(this.app.elements.video1Screen);
    },

    // 보충 영상 1 재생
    showRevisionVideo1() {
        const { activeLesson } = this.app.state;
        if (!activeLesson || !activeLesson.video1RevUrl) return;

        this.app.elements.video1Title.textContent = `${activeLesson.title} (보충 영상)`;
        this.app.elements.video1Iframe.src = this.convertYoutubeUrlToEmbed(activeLesson.video1RevUrl);

        this.app.elements.gotoRev1Btn.style.display = 'none';
        this.app.elements.startQuizBtn.style.display = 'block';
    },

    // 퀴즈 시작
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

    // 다음 문제 표시
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

    // 답안 선택 처리
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

    // 퀴즈 결과 화면 표시
    showResults() {
        const { score, passScore, totalQuizQuestions, activeLesson } = this.app.state;
        const pass = score >= passScore;
        this.updateStudentProgress(pass ? '퀴즈 통과 (완료)' : '퀴즈 실패', score);
        this.app.showScreen(this.app.elements.resultScreen);
        
        const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
        
        this.app.elements.showRev2BtnSuccess.style.display = 'none';
        this.app.elements.showRev2BtnFailure.style.display = 'none';

        if (pass) {
            this.app.elements.successMessage.style.display = 'block'; 
            this.app.elements.failureMessage.style.display = 'none';
            this.app.elements.resultScoreTextSuccess.textContent = scoreText;
            this.app.elements.reviewVideo2Iframe.src = this.convertYoutubeUrlToEmbed(activeLesson.video2Url);
            if (activeLesson.video2RevUrl) {
                this.app.elements.showRev2BtnSuccess.style.display = 'block';
            }
        } else {
            this.app.elements.successMessage.style.display = 'none'; 
            this.app.elements.failureMessage.style.display = 'block';
            this.app.elements.resultScoreTextFailure.textContent = scoreText;
            this.app.elements.video2Iframe.src = this.convertYoutubeUrlToEmbed(activeLesson.video2Url);
            if (activeLesson.video2RevUrl) {
                this.app.elements.showRev2BtnFailure.style.display = 'block';
            }
        }
    },

    // 보충 영상 2 재생
    showRevisionVideo2(isSuccess) {
        const { activeLesson } = this.app.state;
        if (!activeLesson || !activeLesson.video2RevUrl) return;
        const url = this.convertYoutubeUrlToEmbed(activeLesson.video2RevUrl);
        if (isSuccess) {
            this.app.elements.reviewVideo2Iframe.src = url;
            this.app.elements.showRev2BtnSuccess.style.display = 'none';
        } else {
            this.app.elements.video2Iframe.src = url;
            this.app.elements.showRev2BtnFailure.style.display = 'none';
        }
    },

    // 개념 영상 다시보기
    rewatchVideo1() {
        if (!this.app.state.activeLesson) return;
        this.app.elements.reviewVideo2Iframe.src = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url);
    },

    // 학생 학습 진행 상태 DB에 업데이트
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

    // UI 업데이트
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