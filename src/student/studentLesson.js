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
    
    // 성공/실패 시 추가 영상 보기 버튼 (자기주도반용)
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
    };
  },

  extractVideoId(url) {
    if (!url || typeof url !== "string") return null;
    const videoIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/;
    const match = url.match(videoIdRegex);
    return match ? match[1] : null;
  },

  // 점수 입력 (일일테스트용 - 별도 메뉴에서 사용)
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
            if (scoreInput.trim() !== "" && !isNaN(scoreInput)) break;
            alert("숫자만 입력해주세요.");
        }

        await setDoc(submissionRef, {
            studentName: state.studentName,
            studentDocId: studentId,
            dailyTestScore: Number(scoreInput),
            lastAttemptAt: serverTimestamp()
        }, { merge: true });

        showToast(`점수(${scoreInput}점) 저장 완료!`, false);
    } catch (error) {
        console.error("점수 저장 실패:", error);
        showToast("점수 저장 실패 (권한 오류일 수 있음)", true);
    }
  },

  // 학습 시작 (영상 재생)
  startSelectedLesson(lesson) {
    const { elements } = this.app;
    this.app.state.activeLesson = lesson;
    this.app.state.currentRevVideoIndex = 0;

    if(elements.video1Title) elements.video1Title.textContent = lesson.title;
    this.app.showScreen(elements.video1Screen);

    const videoId = this.extractVideoId(lesson.video1Url);
    if (!videoId) {
        if(elements.video1Iframe) {
            elements.video1Iframe.style.display = 'none';
            // 메시지 표시
            const container = elements.video1Iframe.parentNode;
            if(!container.querySelector('.error-msg')) {
                 container.innerHTML += `<div class="error-msg text-center py-10 text-slate-400">영상을 불러올 수 없습니다.</div>`;
            }
        }
        return;
    }

    const iframe = elements.video1Iframe;
    if (iframe) {
        iframe.style.display = 'block'; 
        iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;
        
        // 이전 완료 메시지 제거
        const container = iframe.parentNode;
        const oldMsg = container?.querySelector('.video-complete-msg');
        if(oldMsg) oldMsg.remove();
        const errorMsg = container?.querySelector('.error-msg');
        if(errorMsg) errorMsg.remove();
    }

    // 퀴즈/보충 버튼 초기화
    if (elements.startQuizBtn) {
        elements.startQuizBtn.style.display = "none"; 
        elements.startQuizBtn.disabled = true;
    }
    if (elements.gotoRev1Btn) elements.gotoRev1Btn.style.display = "none";

    // 영상 종료 감지 시작
    this.loadVideoWithMonitoring('student-video1-iframe', (status) => {
        if (status === 0) this.onVideoEnded(); // 0 is YT.PlayerState.ENDED
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
                'onStateChange': (event) => onStateChangeCallback(event.data),
                'onError': () => this.onVideoEnded() // 에러 시에도 다음 단계 진행 허용
            }
        });
    } catch (e) { console.warn("YT Player Warning", e); }
  },

  onVideoEnded() {
    const { elements } = this.app;
    
    // 영상 숨기고 완료 메시지 표시
    if (elements.video1Iframe) {
        elements.video1Iframe.style.display = 'none';
        const container = elements.video1Iframe.parentNode;
        if (container && !container.querySelector('.video-complete-msg')) {
            const msg = document.createElement('div');
            msg.className = 'video-complete-msg w-full h-full flex flex-col items-center justify-center text-white bg-slate-800 rounded-xl';
            msg.innerHTML = `<span class="material-icons text-4xl mb-2 text-green-400">check_circle</span><span class="text-xl font-bold mb-1">영상 시청 완료!</span><span class="text-sm text-slate-300">다음 단계로 진행하세요.</span>`;
            container.appendChild(msg);
        }
    }

    const lesson = this.app.state.activeLesson;
    const revUrls = lesson.video1RevUrls;

    // 보충 영상이 있으면 보충 영상 버튼 표시, 없으면 퀴즈 시작 버튼 표시
    if (revUrls && revUrls.length > 0) {
        if (elements.gotoRev1Btn) {
            elements.gotoRev1Btn.style.display = "block";
            elements.gotoRev1Btn.textContent = `보충 영상 보기 (1/${revUrls.length})`;
        }
    } else {
        if (elements.startQuizBtn) {
            elements.startQuizBtn.style.display = "block";
            elements.startQuizBtn.disabled = false;
            elements.startQuizBtn.textContent = "퀴즈 시작";
            elements.startQuizBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
  },

  // 보충 영상(Video 1 Rev) 또는 해설 영상(Video 2 Rev) 재생
  showNextRevisionVideo(type, isSuccess = null) {
    const { state, elements } = this.app;
    const revUrls = type === 1 ? state.activeLesson?.video1RevUrls : state.activeLesson?.video2RevUrls;
    
    if (!state.activeLesson || !revUrls || revUrls.length === 0) return;
    if (state.currentRevVideoIndex >= revUrls.length) return;
    
    const url = revUrls[state.currentRevVideoIndex];
    const videoId = this.extractVideoId(url);
    if (!videoId) return;
    
    const embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;

    if (type === 1) {
      // Video 1 보충
      const iframe = elements.video1Iframe;
      iframe.style.display = "block"; 
      iframe.src = embedUrl;
      
      const container = iframe.parentNode;
      const oldMsg = container.querySelector('.video-complete-msg');
      if(oldMsg) oldMsg.remove();

      state.currentRevVideoIndex++;
      if (state.currentRevVideoIndex < revUrls.length) { 
          elements.gotoRev1Btn.textContent = `보충 영상 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`; 
      } else { 
          elements.gotoRev1Btn.style.display = "none"; 
          if(elements.startQuizBtn) {
              elements.startQuizBtn.style.display = "block"; 
              elements.startQuizBtn.disabled = false;
              elements.startQuizBtn.classList.remove('opacity-50', 'cursor-not-allowed');
          }
      }
    } else {
      // Video 2 해설 (사용 안함)
    }
  },

  startQuiz() {
    if (this.player && typeof this.player.pauseVideo === 'function') {
        try { this.player.pauseVideo(); } catch(e) {}
    }
    this.app.state.currentQuestionIndex = 0; 
    this.app.state.score = 0;
    
    const questionBank = this.app.state.activeLesson.questionBank || [];
    if (questionBank.length === 0) { showToast("문항이 없습니다."); return; }
    
    // 퀴즈 랜덤 섞기 및 5문제 자르기
    this.app.state.quizQuestions = [...questionBank].sort(() => 0.5 - Math.random()).slice(0, this.app.state.totalQuizQuestions);
    
    this.app.showScreen(this.app.elements.quizScreen); 
    this.displayQuestion();
  },

  displayQuestion() {
    const { quizQuestions, currentQuestionIndex } = this.app.state;
    if (currentQuestionIndex >= quizQuestions.length) { 
        this.showResults(); 
        return; 
    }
    const question = quizQuestions[currentQuestionIndex];
    
    const progressPercent = ((currentQuestionIndex + 1) / this.app.state.totalQuizQuestions) * 100;
    if (this.app.elements.progressBar) this.app.elements.progressBar.style.width = `${progressPercent}%`;
    if (this.app.elements.progressText) this.app.elements.progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${this.app.state.totalQuizQuestions}`;

    this.app.elements.questionText.innerHTML = question.question || "질문 없음";
    const optionsContainer = this.app.elements.optionsContainer;
    optionsContainer.innerHTML = "";
    optionsContainer.classList.remove("disabled"); // 잠금 해제
    
    const options = question.options || [];
    [...options].sort(() => 0.5 - Math.random()).forEach((option) => {
      const btn = document.createElement("button");
      btn.innerHTML = option;
      btn.className = "option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100 mb-2 transition-colors";
      btn.onclick = (e) => this.selectAnswer(e, option);
      optionsContainer.appendChild(btn);
    });

    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise) {
        MathJax.typesetPromise([this.app.elements.questionText, optionsContainer]).catch(() => {});
    }
  },

  selectAnswer(e, selectedText) {
    const optionsContainer = this.app.elements.optionsContainer;
    if(optionsContainer.classList.contains("disabled")) return;
    optionsContainer.classList.add("disabled"); // 중복 클릭 방지

    const currentQuestion = this.app.state.quizQuestions[this.app.state.currentQuestionIndex]; 
    
    // 정답 텍스트 비교 (공백 제거)
    const isCorrect = String(selectedText).trim() === String(currentQuestion.answer).trim();
    const selectedBtn = e.target;

    if (isCorrect) {
      this.app.state.score++;
      selectedBtn.classList.remove("border-slate-300", "hover:bg-slate-100");
      selectedBtn.classList.add("bg-green-100", "border-green-500", "text-green-800", "font-bold");
    } else {
      selectedBtn.classList.remove("border-slate-300", "hover:bg-slate-100");
      selectedBtn.classList.add("bg-red-100", "border-red-500", "text-red-800");
      
      // 정답 표시
      Array.from(optionsContainer.children).forEach(btn => {
          if(String(btn.innerHTML).trim() === String(currentQuestion.answer).trim()) {
              btn.classList.remove("border-slate-300");
              btn.classList.add("bg-green-100", "border-green-500", "text-green-800", "font-bold");
          }
      });
    }

    // 1.5초 후 다음 문제
    setTimeout(() => { 
        this.app.state.currentQuestionIndex++; 
        this.displayQuestion(); 
    }, 1500);
  },

  showResults() {
    const { score, passScore, totalQuizQuestions, activeLesson, classType } = this.app.state;
    const isPass = score >= passScore;
    
    this.updateStudentProgress(isPass ? "퀴즈 통과" : "퀴즈 실패", score);
    
    this.app.showScreen(this.app.elements.resultScreen);
    
    const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
    const isLive = classType === 'live-lecture'; // 현강반 여부

    if (isPass) {
        this.app.elements.successMessage.style.display = "block";
        this.app.elements.failureMessage.style.display = "none";
        this.app.elements.resultScoreTextSuccess.innerHTML = scoreText;

        const resultVideoContainer = document.getElementById('student-review-video2-container') || this.app.elements.reviewVideo2Iframe?.parentNode;
        
        // ✨ [핵심 분기 처리]
        if (!isLive) {
            // [자기주도반] -> Video 2 (응용 영상) 보여주기
            if (resultVideoContainer) {
                resultVideoContainer.style.display = 'block';
                // 기존 내용(메시지 등) 초기화는 필요 없음
            }
            
            const video2List = activeLesson.video2List || [];
            const defaultUrl = video2List.length > 0 ? video2List[0].url : activeLesson.video2Url;
            
            // Video 2 선택/재생 로직
            if (video2List.length > 1) {
                this.showVideo2Selection(video2List, this.app.elements.reviewVideo2Iframe);
            } else if (defaultUrl) {
                const embedUrl = this.convertYoutubeUrlToEmbed(defaultUrl);
                const iframe = this.app.elements.reviewVideo2Iframe;
                if(iframe) {
                    iframe.src = embedUrl;
                    iframe.style.display = 'block';
                    // 선택 버튼 컨테이너가 있다면 숨김
                    const sel = document.getElementById('video2SelectionContainer');
                    if(sel) sel.style.display = 'none';
                }
            } else {
                if(resultVideoContainer) resultVideoContainer.innerHTML = '<p class="text-center text-slate-400 py-4">등록된 응용 영상이 없습니다.</p>';
            }
        } else {
            // [현강반] -> Video 2 숨김
            if (resultVideoContainer) resultVideoContainer.style.display = 'none';
        }

        // 메뉴로 돌아가기 버튼 (현강반, 자기주도반 모두 표시)
        this.renderMenuButton(this.app.elements.successMessage);

    } else {
        // [실패 시]
        this.app.elements.successMessage.style.display = "none";
        this.app.elements.failureMessage.style.display = "block";
        this.app.elements.resultScoreTextFailure.textContent = scoreText;
        
        // 실패 시에는 Video 2 숨김 (재시도 유도)
        const resultVideoContainer = this.app.elements.reviewVideo2Iframe?.parentNode;
        if(resultVideoContainer) resultVideoContainer.style.display = 'none';
    }
  },

  renderMenuButton(container) {
      let btn = container.querySelector('.go-to-menu-btn');
      if (!btn) {
          btn = document.createElement('button');
          btn.className = 'go-to-menu-btn btn-primary w-full mt-6 py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2';
          btn.innerHTML = `<span class="material-icons">list</span> 학습 목록으로 돌아가기`;
          btn.onclick = () => {
              if (this.app.state.selectedSubject) {
                  this.app.showLessonSelectionScreen(this.app.state.selectedSubject.id);
              } else {
                  this.app.showSubjectSelectionScreen();
              }
          };
          container.appendChild(btn);
      }
      btn.style.display = 'flex';
  },

  showVideo2Selection(videoList, iframeElement) {
    iframeElement.style.display = 'none'; 
    let container = document.getElementById('video2SelectionContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'video2SelectionContainer';
        container.className = 'flex flex-col gap-3 mt-4 w-full';
        iframeElement.parentNode.insertBefore(container, iframeElement);
    } else {
        container.style.display = 'flex';
    }
    container.innerHTML = '<p class="text-center font-bold text-slate-700 mb-2">학습할 교재 영상 선택</p>';

    videoList.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'w-full py-3 px-4 bg-white border border-indigo-100 hover:bg-indigo-50 text-indigo-900 rounded-xl font-bold shadow-sm text-left flex items-center gap-2 transition-all';
        btn.innerHTML = `<span class="material-icons text-indigo-500">play_circle</span> ${item.name}`;
        btn.onclick = () => {
            const embedUrl = this.convertYoutubeUrlToEmbed(item.url);
            iframeElement.src = embedUrl;
            iframeElement.style.display = 'block';
            container.style.display = 'none'; // 선택 후 버튼 목록 숨김
            iframeElement.scrollIntoView({ behavior: 'smooth' });
        };
        container.appendChild(btn);
    });
  },

  async updateStudentProgress(status, score) {
    const { activeLesson, studentDocId, selectedSubject, studentName, totalQuizQuestions } = this.app.state;
    if (!activeLesson?.id || !studentDocId) return;

    try {
        const submissionRef = doc(db, "subjects", selectedSubject.id, "lessons", activeLesson.id, "submissions", studentDocId);
        const data = {
          studentName: studentName || "익명",
          status: status,
          lastAttemptAt: serverTimestamp(),
          studentDocId: studentDocId,
          score: score,
          totalQuestions: totalQuizQuestions
        };
        await setDoc(submissionRef, data, { merge: true });
        console.log("Progress saved successfully");
    } catch (error) { 
        console.error("Progress save failed:", error);
        showToast("결과 저장 실패 (관리자 문의)", true); 
    }
  }
};