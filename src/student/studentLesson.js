// src/student/studentLesson.js

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentLesson = {
  init(app) {
    this.app = app;

    this.app.elements.gotoRev1Btn?.addEventListener("click", () => this.showNextRevisionVideo(1));
    this.app.elements.startQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.retryQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.rewatchVideo1Btn?.addEventListener("click", () => this.rewatchVideo1());
    this.app.elements.showRev2BtnSuccess?.addEventListener("click", () => this.showNextRevisionVideo(2, true));
    this.app.elements.showRev2BtnFailure?.addEventListener("click", () => this.showNextRevisionVideo(2, false));
  },

  convertYoutubeUrlToEmbed(url) {
    if (!url || typeof url !== "string") return "";
    let videoId = null;
    let startTime = 0;
    let tempUrl = url.trim();
    const videoIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/;
    const idMatch = tempUrl.match(videoIdRegex);
    if (idMatch && idMatch[1]) videoId = idMatch[1];
    else return "";

    try {
      if (!tempUrl.startsWith("http")) tempUrl = "https://" + tempUrl;
      const urlObj = new URL(tempUrl);
      const tParam = urlObj.searchParams.get('t') || urlObj.searchParams.get('start');
      if (tParam) {
          const secondsMatch = tParam.match(/^(\d+)/);
          if (secondsMatch) startTime = parseInt(secondsMatch[1], 10);
      }
    } catch (e) {}

    let embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    if (startTime > 0) embedUrl += `&start=${startTime}`;
    return embedUrl;
  },

  startSelectedLesson(lesson) {
    const { elements } = this.app;
    this.app.state.activeLesson = lesson;
    this.app.state.currentRevVideoIndex = 0;

    const originalUrl = lesson.video1Url;
    const embedUrl = this.convertYoutubeUrlToEmbed(originalUrl);
    const iframe = elements.video1Iframe;
    const titleElement = elements.video1Title;

    if (!iframe || !titleElement) {
        showToast("플레이어 오류", true);
        return;
    }

    this.app.showScreen(elements.video1Screen);
    titleElement.textContent = lesson.title;
    
    if (!embedUrl) {
        showToast("영상 URL 오류", true);
        iframe.style.display = 'none';
        return;
    }

    iframe.src = embedUrl;
    iframe.style.display = 'block';

    const revUrls = lesson.video1RevUrls;
    const hasRevUrls = revUrls && Array.isArray(revUrls) && revUrls.length > 0;

    if (elements.gotoRev1Btn) {
        elements.gotoRev1Btn.style.display = hasRevUrls ? "block" : "none";
        if (hasRevUrls) elements.gotoRev1Btn.textContent = `보충 영상 보기 (1/${revUrls.length})`;
    }
    if (elements.startQuizBtn) {
        elements.startQuizBtn.style.display = hasRevUrls ? "none" : "block";
    }
  },

  showNextRevisionVideo(type, isSuccess = null) {
    const { state, elements } = this.app;
    const revUrls = type === 1 ? state.activeLesson?.video1RevUrls : state.activeLesson?.video2RevUrls;
    if (!state.activeLesson || !revUrls || revUrls.length === 0) return;
    const currentIndex = state.currentRevVideoIndex; if (currentIndex >= revUrls.length) return;
    const url = this.convertYoutubeUrlToEmbed(revUrls[currentIndex]); if (!url) return;
    
    if (type === 1) {
      const iframe = elements.video1Iframe;
      iframe.src = url; iframe.style.display = "block"; state.currentRevVideoIndex++;
      if (state.currentRevVideoIndex < revUrls.length) { if(elements.gotoRev1Btn) elements.gotoRev1Btn.textContent = `보충 영상 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`; }
      else { if(elements.gotoRev1Btn) elements.gotoRev1Btn.style.display = "none"; if(elements.startQuizBtn) elements.startQuizBtn.style.display = "block"; }
    } else {
      const button = isSuccess ? elements.showRev2BtnSuccess : elements.showRev2BtnFailure;
      const iframe = isSuccess ? elements.reviewVideo2Iframe : elements.video2Iframe;
      iframe.src = url; iframe.style.display = "block";
      state.currentRevVideoIndex++;
      if (button) { if (state.currentRevVideoIndex < revUrls.length) { button.textContent = `보충 풀이 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`; } else { button.style.display = "none"; } }
    }
  },

  startQuiz() {
    if (!this.app.state.activeLesson) return;
    this.updateStudentProgress("퀴즈 푸는 중");
    this.app.state.currentQuestionIndex = 0; this.app.state.score = 0;
    const questionBank = Array.isArray(this.app.state.activeLesson.questionBank) ? this.app.state.activeLesson.questionBank : [];
    if (questionBank.length === 0) { showToast("문항이 없습니다."); return; }
    
    const shuffledBank = [...questionBank].sort(() => 0.5 - Math.random());
    this.app.state.quizQuestions = shuffledBank.slice(0, this.app.state.totalQuizQuestions);
    this.updateScoreDisplay(); this.app.showScreen(this.app.elements.quizScreen); this.displayQuestion();
  },

  displayQuestion() {
    const { quizQuestions, currentQuestionIndex } = this.app.state;
    if (currentQuestionIndex >= quizQuestions.length) { this.showResults(); return; }
    const question = quizQuestions[currentQuestionIndex];
    this.updateProgress();

    const questionEl = this.app.elements.questionText;
    questionEl.innerHTML = question.question || "질문 없음";

    const optionsContainer = this.app.elements.optionsContainer;
    optionsContainer.innerHTML = "";
    
    const options = Array.isArray(question.options) ? question.options : [];
    [...options].sort(() => 0.5 - Math.random()).forEach((option) => {
      const button = document.createElement("button");
      button.innerHTML = option;
      button.className = "option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100";
      button.onclick = (e) => this.selectAnswer(e);
      button.dataset.text = option; 
      optionsContainer.appendChild(button);
    });

    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([questionEl, optionsContainer]).catch((err) => console.error(err));
    }
  },

  selectAnswer(e) {
    if(this.app.elements.optionsContainer) this.app.elements.optionsContainer.classList.add("disabled");
    const selectedButton = e.target.closest('.option-btn');
    if (!selectedButton) return;

    const selectedAnswerText = selectedButton.dataset.text || selectedButton.textContent; 
    const currentQuestion = this.app.state.quizQuestions[this.app.state.currentQuestionIndex]; 
    const correctAnswerText = currentQuestion.answer;

    if (selectedAnswerText.trim() === correctAnswerText.trim()) {
      this.app.state.score++;
      selectedButton.classList.add("correct");
    } else {
      selectedButton.classList.add("incorrect");
      Array.from(this.app.elements.optionsContainer.children).forEach((btn) => {
        const buttonText = btn.dataset.text || btn.textContent;
        if (buttonText.trim() === correctAnswerText.trim()) btn.classList.add("correct");
      });
    }
    this.updateScoreDisplay();
    setTimeout(() => { 
        if(this.app.elements.optionsContainer) this.app.elements.optionsContainer.classList.remove("disabled"); 
        this.app.state.currentQuestionIndex++; 
        this.displayQuestion(); 
    }, 1500);
  },

  showResults() {
    const { score, passScore, totalQuizQuestions, activeLesson, studentDocId } = this.app.state;
    this.updateStudentProgress(score >= passScore ? "퀴즈 통과" : "퀴즈 실패", score);
    
    this.app.showScreen(this.app.elements.resultScreen);
    
    const pass = score >= passScore;
    const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
    const revUrls = activeLesson.video2RevUrls || [];

    // 성공/실패 UI 전환
    if (this.app.elements.successMessage) this.app.elements.successMessage.style.display = pass ? "block" : "none";
    if (this.app.elements.failureMessage) this.app.elements.failureMessage.style.display = pass ? "none" : "block";
    
    if (pass) {
        if(this.app.elements.resultScoreTextSuccess) this.app.elements.resultScoreTextSuccess.textContent = scoreText;
        if(this.app.elements.showRev2BtnSuccess) this.app.elements.showRev2BtnSuccess.style.display = revUrls.length > 0 ? "block" : "none";
        
        // ✅ [핵심 변경] 교재 영상 처리 로직
        const video2List = activeLesson.video2List || [];
        const targetIframe = this.app.elements.reviewVideo2Iframe;
        
        // 영상 선택 컨테이너 초기화 (이전 잔여물 삭제)
        const existingSelection = document.getElementById('video2SelectionContainer');
        if(existingSelection) existingSelection.innerHTML = '';

        if (video2List.length > 1) {
            // 영상이 여러 개면 선택 버튼 표시 (iframe은 일단 숨김)
            this.showVideo2Selection(video2List, targetIframe);
        } else {
            // 영상이 1개거나 없으면 기존 방식대로 재생
            const defaultUrl = video2List.length === 1 ? video2List[0].url : activeLesson.video2Url;
            const embedUrl = this.convertYoutubeUrlToEmbed(defaultUrl);
            
            if(embedUrl && targetIframe) {
                targetIframe.src = embedUrl;
                targetIframe.style.display = 'block';
            } else if(targetIframe) {
                targetIframe.style.display = 'none';
            }
        }
    } else {
        // 실패 시 처리 (기존과 동일)
        if(this.app.elements.resultScoreTextFailure) this.app.elements.resultScoreTextFailure.textContent = scoreText;
        if(this.app.elements.showRev2BtnFailure) this.app.elements.showRev2BtnFailure.style.display = revUrls.length > 0 ? "block" : "none";
        
        const targetIframe = this.app.elements.video2Iframe;
        const embedUrl = this.convertYoutubeUrlToEmbed(activeLesson.video2Url); // 실패시는 기본 영상(보통 해설)만 보여줌
        if(embedUrl && targetIframe) {
            targetIframe.src = embedUrl;
            targetIframe.style.display = 'block';
        }
    }
  },

  // ✅ [신규] 영상 선택 UI 표시 함수
  showVideo2Selection(videoList, iframeElement) {
    iframeElement.style.display = 'none'; // 비디오 숨김
    
    let container = document.getElementById('video2SelectionContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'video2SelectionContainer';
        container.className = 'flex flex-col gap-3 items-center justify-center mt-6 w-full max-w-lg mx-auto';
        iframeElement.parentNode.insertBefore(container, iframeElement);
    }
    container.innerHTML = ''; 

    const label = document.createElement('div');
    label.className = 'text-lg font-bold text-slate-700 mb-2';
    label.innerHTML = '✨ 퀴즈 통과! 학습할 교재를 선택하세요:';
    container.appendChild(label);

    videoList.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'w-full py-3 px-6 bg-white border-2 border-blue-200 hover:border-blue-500 hover:bg-blue-50 text-slate-700 rounded-xl font-bold shadow-sm transition-all text-left flex items-center gap-3';
        btn.innerHTML = `<span class="text-xl">📘</span> <span>${item.name}</span>`;
        
        btn.onclick = () => {
            // 선택 시 영상 재생
            const embedUrl = this.convertYoutubeUrlToEmbed(item.url);
            iframeElement.src = embedUrl;
            iframeElement.style.display = 'block';
            
            // 선택 후 버튼들은 숨기기 (깔끔하게)
            // container.style.display = 'none'; 
            
            // 또는 선택됨 표시를 하고 영상으로 스크롤 이동
            iframeElement.scrollIntoView({ behavior: 'smooth' });
        };
        container.appendChild(btn);
    });
  },

  rewatchVideo1() {
    if (!this.app.state.activeLesson) return; 
    const embedUrl = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url);
    const iframe = this.app.elements.reviewVideo2Iframe;
    if (embedUrl && iframe) { 
        iframe.src = embedUrl; 
        iframe.style.display = "block";
        // 다시보기 시 선택 컨테이너 숨김
        const container = document.getElementById('video2SelectionContainer');
        if(container) container.innerHTML = '';
    }
  },

  async updateStudentProgress(status, score = null) {
    const { activeLesson, studentDocId, selectedSubject, studentName, totalQuizQuestions } = this.app.state;
    if (!activeLesson?.id || !studentDocId) return;

    const submissionRef = doc(db, "subjects", selectedSubject.id, "lessons", activeLesson.id, "submissions", studentDocId);
    const data = {
      studentName: studentName || "익명",
      status: status,
      lastAttemptAt: serverTimestamp(),
      studentDocId: studentDocId
    };
    if (score !== null) {
      data.score = score;
      data.totalQuestions = totalQuizQuestions;
    }
    try { await setDoc(submissionRef, data, { merge: true }); } 
    catch (error) { showToast("기록 저장 실패"); }
  },

  updateScoreDisplay() {
    if (this.app.elements.scoreText) this.app.elements.scoreText.textContent = `점수: ${this.app.state.score}`;
  },

  updateProgress() {
    const { currentQuestionIndex, totalQuizQuestions } = this.app.state;
    const progressPercent = totalQuizQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuizQuestions) * 100 : 0;
    if (this.app.elements.progressText) this.app.elements.progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${totalQuizQuestions}`;
    if (this.app.elements.progressBar) this.app.elements.progressBar.style.width = `${progressPercent}%`;
  },
};