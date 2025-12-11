// src/student/studentLesson.js

import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentLesson = {
  player: null, 
  isYoutubeApiReady: false, 

  init(app) {
    this.app = app;

    this.app.elements.gotoRev1Btn?.addEventListener("click", () => this.showNextRevisionVideo(1));
    this.app.elements.startQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.retryQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.rewatchVideo1Btn?.addEventListener("click", () => this.rewatchVideo1());
    this.app.elements.showRev2BtnSuccess?.addEventListener("click", () => this.showNextRevisionVideo(2, true));
    this.app.elements.showRev2BtnFailure?.addEventListener("click", () => this.showNextRevisionVideo(2, false));

    this.loadYoutubeApi();
  },

  convertYoutubeUrlToEmbed(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) return "";
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;
  },

  loadYoutubeApi() {
    if (window.YT && window.YT.Player) {
        this.isYoutubeApiReady = true;
        return;
    }

    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
        this.isYoutubeApiReady = true;
        console.log("YouTube API Ready");
    };
  },

  extractVideoId(url) {
    if (!url || typeof url !== "string") return null;
    const videoIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/;
    const match = url.match(videoIdRegex);
    return match ? match[1] : null;
  },

  // ✨ 점수 입력 함수 (독립형)
  async inputDailyTestScoreOnly(lesson) {
    const { state } = this.app;
    const studentId = state.studentDocId;
    const subjectId = state.selectedSubject.id;
    const lessonId = lesson.id;

    try {
        const submissionRef = doc(db, "subjects", subjectId, "lessons", lessonId, "submissions", studentId);
        const docSnap = await getDoc(submissionRef);
        let defaultVal = "";
        if (docSnap.exists() && docSnap.data().dailyTestScore !== undefined) {
            defaultVal = docSnap.data().dailyTestScore;
        }

        let scoreInput = null;
        while (true) {
            scoreInput = prompt(`[${lesson.title}]\n일일테스트 점수를 입력하세요:`, defaultVal);
            if (scoreInput === null) return; 
            
            if (scoreInput.trim() !== "" && !isNaN(scoreInput)) {
                break;
            }
            alert("숫자만 입력해주세요.");
        }

        await setDoc(submissionRef, {
            studentName: state.studentName,
            studentDocId: studentId,
            dailyTestScore: Number(scoreInput),
            lastAttemptAt: serverTimestamp()
        }, { merge: true });

        showToast(`'${lesson.title}' 점수(${scoreInput}점) 저장 완료!`, false);
        
    } catch (error) {
        console.error("점수 저장 실패:", error);
        showToast("점수 저장 중 오류가 발생했습니다.", true);
    }
  },

  // ✨ 영상 재생 함수 (강제 점수 입력 제거됨)
  startSelectedLesson(lesson) {
    const { elements } = this.app;
    
    // -- [삭제된 부분] 현강반 점수 강제 입력 로직 --

    this.app.state.activeLesson = lesson;
    this.app.state.currentRevVideoIndex = 0;

    const titleElement = elements.video1Title;
    if (titleElement) titleElement.textContent = lesson.title;

    this.app.showScreen(elements.video1Screen);

    const videoId = this.extractVideoId(lesson.video1Url);
    if (!videoId) {
        showToast("영상 URL이 올바르지 않습니다.", true);
        return;
    }

    const iframe = elements.video1Iframe;
    if (iframe) {
        iframe.style.display = 'block'; 
        iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;
        
        const container = iframe.parentNode;
        const oldMsg = container?.querySelector('.video-complete-msg');
        if(oldMsg) oldMsg.remove();
    }

    if (elements.startQuizBtn) {
        elements.startQuizBtn.style.display = "none"; 
        elements.startQuizBtn.textContent = "퀴즈 시작 (영상을 끝까지 봐주세요)";
        elements.startQuizBtn.disabled = true;
        elements.startQuizBtn.classList.add("opacity-50", "cursor-not-allowed");
    }
    if (elements.gotoRev1Btn) elements.gotoRev1Btn.style.display = "none";

    this.loadVideoWithMonitoring('student-video1-iframe', (playerStatus) => {
        if (playerStatus === 0) { 
            this.onVideoEnded();
        }
    });
  },

  loadVideoWithMonitoring(iframeId, onStateChangeCallback) {
    if (!this.isYoutubeApiReady) {
        setTimeout(() => this.loadVideoWithMonitoring(iframeId, onStateChangeCallback), 500);
        return;
    }

    try {
        this.player = new YT.Player(iframeId, {
            playerVars: { 'rel': 0, 'origin': window.location.origin },
            events: {
                'onStateChange': (event) => {
                    onStateChangeCallback(event.data);
                },
                'onError': () => {
                    this.onVideoEnded(); 
                }
            }
        });
    } catch (e) {
        console.warn("YouTube Player 연결 실패:", e);
    }
  },

  onVideoEnded() {
    const { elements } = this.app;
    
    if (elements.video1Iframe) {
        elements.video1Iframe.style.display = 'none';
        
        const container = elements.video1Iframe.parentNode;
        if (container && !container.querySelector('.video-complete-msg')) {
            const msgDiv = document.createElement('div');
            msgDiv.className = 'video-complete-msg w-full h-full flex flex-col items-center justify-center text-white bg-slate-800';
            msgDiv.innerHTML = `
                <svg class="w-16 h-16 mb-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span class="text-xl font-bold">학습 영상 시청 완료!</span>
                <span class="text-sm text-slate-400 mt-2">아래 버튼을 눌러 다음 단계로 진행하세요.</span>
            `;
            container.appendChild(msgDiv);
        }
    }

    const lesson = this.app.state.activeLesson;
    const revUrls = lesson.video1RevUrls;
    const hasRevUrls = revUrls && Array.isArray(revUrls) && revUrls.length > 0;

    if (hasRevUrls) {
        if (elements.gotoRev1Btn) {
            elements.gotoRev1Btn.style.display = "block";
            elements.gotoRev1Btn.textContent = `보충 영상 보기 (1/${revUrls.length})`;
        }
    } else {
        if (elements.startQuizBtn) {
            elements.startQuizBtn.style.display = "block";
            elements.startQuizBtn.textContent = "퀴즈 시작";
            elements.startQuizBtn.disabled = false;
            elements.startQuizBtn.classList.remove("opacity-50", "cursor-not-allowed");
            elements.startQuizBtn.classList.add("animate-bounce"); 
            setTimeout(() => elements.startQuizBtn.classList.remove("animate-bounce"), 2000);
        }
    }
    showToast("학습 완료! 다음 단계로 진행하세요.", false);
  },

  showNextRevisionVideo(type, isSuccess = null) {
    const { state, elements } = this.app;
    const revUrls = type === 1 ? state.activeLesson?.video1RevUrls : state.activeLesson?.video2RevUrls;
    
    if (!state.activeLesson || !revUrls || revUrls.length === 0) return;
    const currentIndex = state.currentRevVideoIndex; 
    if (currentIndex >= revUrls.length) return;
    
    const url = revUrls[currentIndex];
    const videoId = this.extractVideoId(url);
    if (!videoId) return;
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;

    if (type === 1) {
      const iframe = elements.video1Iframe;
      
      iframe.style.display = "block"; 
      const container = iframe.parentNode;
      const oldMsg = container?.querySelector('.video-complete-msg');
      if(oldMsg) oldMsg.remove();

      iframe.src = embedUrl;
      
      state.currentRevVideoIndex++;

      if (state.currentRevVideoIndex < revUrls.length) { 
          if(elements.gotoRev1Btn) elements.gotoRev1Btn.textContent = `보충 영상 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`; 
      } else { 
          if(elements.gotoRev1Btn) elements.gotoRev1Btn.style.display = "none"; 
          if(elements.startQuizBtn) {
              elements.startQuizBtn.style.display = "block"; 
              elements.startQuizBtn.disabled = false;
              elements.startQuizBtn.textContent = "퀴즈 시작";
              elements.startQuizBtn.classList.remove("opacity-50", "cursor-not-allowed");
          }
      }
    } else {
      const button = isSuccess ? elements.showRev2BtnSuccess : elements.showRev2BtnFailure;
      const iframe = isSuccess ? elements.reviewVideo2Iframe : elements.video2Iframe;
      
      iframe.src = embedUrl; 
      iframe.style.display = "block";
      state.currentRevVideoIndex++;
      
      if (button) { 
          if (state.currentRevVideoIndex < revUrls.length) { 
              button.textContent = `보충 풀이 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`; 
          } else { 
              button.style.display = "none"; 
          } 
      }
    }
  },

  startQuiz() {
    if (!this.app.state.activeLesson) return;
    
    if (this.player && typeof this.player.pauseVideo === 'function') {
        try { this.player.pauseVideo(); } catch(e) {}
    }

    this.updateStudentProgress("퀴즈 푸는 중");
    this.app.state.currentQuestionIndex = 0; 
    this.app.state.score = 0;
    
    const questionBank = Array.isArray(this.app.state.activeLesson.questionBank) ? this.app.state.activeLesson.questionBank : [];
    if (questionBank.length === 0) { showToast("문항이 없습니다."); return; }
    
    const shuffledBank = [...questionBank].sort(() => 0.5 - Math.random());
    this.app.state.quizQuestions = shuffledBank.slice(0, this.app.state.totalQuizQuestions);
    this.updateScoreDisplay(); 
    this.app.showScreen(this.app.elements.quizScreen); 
    this.displayQuestion();
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

    const isLiveClass = this.app.state.classType === 'live-lecture';

    if (this.app.elements.successMessage) this.app.elements.successMessage.style.display = pass ? "block" : "none";
    if (this.app.elements.failureMessage) this.app.elements.failureMessage.style.display = pass ? "none" : "block";
    
    if (pass) {
        if(this.app.elements.resultScoreTextSuccess) this.app.elements.resultScoreTextSuccess.textContent = scoreText;
        
        const resultVideoContainer = this.app.elements.reviewVideo2Iframe?.parentNode?.parentNode;
        
        if (isLiveClass) {
            // 현강반: 완료 (영상2 숨김)
            if(resultVideoContainer) resultVideoContainer.style.display = 'none';
            if(this.app.elements.showRev2BtnSuccess) this.app.elements.showRev2BtnSuccess.style.display = 'none';
            
            const successHeader = this.app.elements.successMessage.querySelector('h1');
            if(successHeader) successHeader.textContent = "🎉 예습 완료! 🎉";
            if(this.app.elements.resultScoreTextSuccess) this.app.elements.resultScoreTextSuccess.textContent = `${scoreText}\n오늘 수업 준비가 완료되었습니다.`;

        } else {
            // 자기주도반: 영상2 표시
            if(resultVideoContainer) resultVideoContainer.style.display = 'block';
            const successHeader = this.app.elements.successMessage.querySelector('h1');
            if(successHeader) successHeader.textContent = "🎉 퀴즈 통과! 🎉";

            if(this.app.elements.showRev2BtnSuccess) this.app.elements.showRev2BtnSuccess.style.display = revUrls.length > 0 ? "block" : "none";
            
            const video2List = activeLesson.video2List || [];
            const targetIframe = this.app.elements.reviewVideo2Iframe;
            const existingSelection = document.getElementById('video2SelectionContainer');
            if(existingSelection) existingSelection.innerHTML = '';

            if (video2List.length > 1) {
                this.showVideo2Selection(video2List, targetIframe);
            } else {
                const defaultUrl = video2List.length === 1 ? video2List[0].url : activeLesson.video2Url;
                const embedUrl = this.convertYoutubeUrlToEmbed(defaultUrl);
                
                if(embedUrl && targetIframe) {
                    targetIframe.src = embedUrl;
                    targetIframe.style.display = 'block';
                } else if(targetIframe) {
                    targetIframe.style.display = 'none';
                }
            }
        }
    } else {
        if(this.app.elements.resultScoreTextFailure) this.app.elements.resultScoreTextFailure.textContent = scoreText;
        if(this.app.elements.showRev2BtnFailure) this.app.elements.showRev2BtnFailure.style.display = revUrls.length > 0 ? "block" : "none";
        
        const targetIframe = this.app.elements.video2Iframe;
        const embedUrl = this.convertYoutubeUrlToEmbed(activeLesson.video2Url);

        if(embedUrl && targetIframe) {
            targetIframe.src = embedUrl;
            targetIframe.style.display = 'block';
        }
    }
  },

  showVideo2Selection(videoList, iframeElement) {
    iframeElement.style.display = 'none'; 
    
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
            const embedUrl = this.convertYoutubeUrlToEmbed(item.url);
            iframeElement.src = embedUrl;
            iframeElement.style.display = 'block';
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