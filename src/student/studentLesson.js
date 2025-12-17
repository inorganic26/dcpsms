// src/student/studentLesson.js

import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentLesson = {
  player: null, 
  video2Player: null, // Video 2 전용 플레이어 변수 추가
  isYoutubeApiReady: false, 
  app: null,

  init(app) {
    this.app = app;

    // 기존 버튼 이벤트 연결
    this.app.elements.gotoRev1Btn?.addEventListener("click", () => this.showNextRevisionVideo(1));
    this.app.elements.startQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.retryQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.rewatchVideo1Btn?.addEventListener("click", () => this.rewatchVideo1());
    
    this.app.elements.showRev2BtnSuccess?.addEventListener("click", () => this.showNextRevisionVideo(2, true));
    this.app.elements.showRev2BtnFailure?.addEventListener("click", () => this.showNextRevisionVideo(2, false));

    this.loadYoutubeApi();
  },

  // ⬇️ [복구됨] 강의 목록 불러오기 (영상 목록이 안 뜨는 문제 해결)
  async loadLessons(subjectId) {
    this.app.state.lessons = [];
    const container = document.getElementById('student-lesson-grid');
    if(container) container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">강의를 불러오는 중...</div>';

    try {
        const lessonsRef = collection(db, "subjects", subjectId, "lessons");
        const q = query(lessonsRef, orderBy("createdAt", "asc"));
        const querySnapshot = await getDocs(q);
        
        const lessons = [];
        querySnapshot.forEach((doc) => {
            lessons.push({ id: doc.id, ...doc.data() });
        });
        
        this.app.state.lessons = lessons;
        this.renderLessonList();

    } catch (error) {
        console.error("강의 로드 실패:", error);
        if(container) container.innerHTML = '<div class="col-span-full text-center py-10 text-red-400">강의 정보를 불러오지 못했습니다.</div>';
    }
  },

  // ⬇️ [복구됨] 강의 목록 그리기
  renderLessonList() {
    const container = document.getElementById('student-lesson-grid');
    if (!container) return;
    
    container.innerHTML = '';
    // 모바일/PC 반응형 그리드
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    const lessons = this.app.state.lessons;
    if (lessons.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center py-20 text-slate-400">등록된 강의가 없습니다.</div>';
        return;
    }

    lessons.forEach((lesson, index) => {
        const div = document.createElement('div');
        div.className = "bg-white p-5 rounded-2xl border border-slate-100 shadow-sm cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all group flex flex-col";
        
        div.innerHTML = `
            <div class="flex items-start justify-between mb-3">
                <div class="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    ${index + 1}
                </div>
                ${lesson.isCompleted ? '<span class="material-icons-round text-green-500">check_circle</span>' : ''}
            </div>
            <h3 class="font-bold text-slate-800 text-lg leading-tight mb-1 line-clamp-2">${lesson.title}</h3>
            <p class="text-sm text-slate-500 line-clamp-2 flex-grow">${lesson.description || '설명 없음'}</p>
        `;
        
        // 클릭 시 영상 재생 시작
        div.onclick = () => this.startSelectedLesson(lesson);
        container.appendChild(div);
    });
  },

  // 유튜브 API 로드
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

  convertYoutubeUrlToEmbed(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) return "";
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;
  },

  // 1. 학습 시작 (Video 1 재생)
  startSelectedLesson(lesson) {
    const { elements } = this.app;
    this.app.state.activeLesson = lesson;
    this.app.state.currentRevVideoIndex = 0;

    if(elements.video1Title) elements.video1Title.textContent = lesson.title;
    this.app.showScreen(elements.video1Screen);

    const videoId = this.extractVideoId(lesson.video1Url);
    if (!videoId) {
        // 영상 없음 처리
        if(elements.video1Iframe) elements.video1Iframe.style.display = 'none';
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
    }

    // 버튼 초기화 (숨김)
    if (elements.startQuizBtn) elements.startQuizBtn.style.display = "none"; 
    if (elements.gotoRev1Btn) elements.gotoRev1Btn.style.display = "none";

    // Video 1 모니터링 시작
    this.loadVideoWithMonitoring('student-video1-iframe', (status) => {
        if (status === 0) this.onVideo1Ended(); // 0 = 종료됨
    });
  },

  // Video 1 종료 시 처리
  onVideo1Ended() {
    const { elements } = this.app;
    
    // 1. 영상 숨기고 완료 메시지
    if (elements.video1Iframe) {
        elements.video1Iframe.style.display = 'none';
        const container = elements.video1Iframe.parentNode;
        if (container && !container.querySelector('.video-complete-msg')) {
            const msg = document.createElement('div');
            msg.className = 'video-complete-msg w-full h-full flex flex-col items-center justify-center text-white bg-slate-800 rounded-xl';
            msg.innerHTML = `<span class="material-icons text-4xl mb-2 text-green-400">check_circle</span><span class="text-xl font-bold mb-1">영상 시청 완료!</span><span class="text-sm text-slate-300">퀴즈를 풀어보세요.</span>`;
            container.appendChild(msg);
        }
    }

    const lesson = this.app.state.activeLesson;
    
    // 2. 퀴즈 시작 버튼 표시 (보충 영상 로직은 일단 배제하고 바로 퀴즈로)
    if (elements.startQuizBtn) {
        elements.startQuizBtn.style.display = "block";
        elements.startQuizBtn.disabled = false;
        elements.startQuizBtn.textContent = "퀴즈 시작";
        elements.startQuizBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  },

  // 퀴즈 시작
  startQuiz() {
    this.app.state.currentQuestionIndex = 0; 
    this.app.state.score = 0;
    
    const questionBank = this.app.state.activeLesson.questionBank || [];
    if (questionBank.length === 0) { showToast("문항이 없습니다."); return; }
    
    // 랜덤 5문제
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
    
    // 진행률 표시
    const progressPercent = ((currentQuestionIndex + 1) / this.app.state.totalQuizQuestions) * 100;
    if (this.app.elements.progressBar) this.app.elements.progressBar.style.width = `${progressPercent}%`;
    if (this.app.elements.progressText) this.app.elements.progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${this.app.state.totalQuizQuestions}`;

    // 문제 렌더링
    this.app.elements.questionText.innerHTML = question.question || "질문 없음";
    const optionsContainer = this.app.elements.optionsContainer;
    optionsContainer.innerHTML = "";
    optionsContainer.classList.remove("disabled");
    
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
    optionsContainer.classList.add("disabled");

    const currentQuestion = this.app.state.quizQuestions[this.app.state.currentQuestionIndex]; 
    const isCorrect = String(selectedText).trim() === String(currentQuestion.answer).trim();
    const selectedBtn = e.target;

    if (isCorrect) {
      this.app.state.score++;
      selectedBtn.classList.remove("border-slate-300", "hover:bg-slate-100");
      selectedBtn.classList.add("bg-green-100", "border-green-500", "text-green-800", "font-bold");
    } else {
      selectedBtn.classList.remove("border-slate-300", "hover:bg-slate-100");
      selectedBtn.classList.add("bg-red-100", "border-red-500", "text-red-800");
      
      Array.from(optionsContainer.children).forEach(btn => {
          if(String(btn.innerHTML).trim() === String(currentQuestion.answer).trim()) {
              btn.classList.remove("border-slate-300");
              btn.classList.add("bg-green-100", "border-green-500", "text-green-800", "font-bold");
          }
      });
    }

    setTimeout(() => { 
        this.app.state.currentQuestionIndex++; 
        this.displayQuestion(); 
    }, 1500);
  },

  // ✨ 결과 화면 (핵심 로직 수정됨)
  showResults() {
    const { score, passScore, totalQuizQuestions, activeLesson, classType } = this.app.state;
    const isPass = score >= passScore;
    
    // 결과 저장
    this.updateStudentProgress(isPass ? "퀴즈 통과" : "퀴즈 실패", score);
    
    this.app.showScreen(this.app.elements.resultScreen);
    
    const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
    // classType 확인 (반 정보에 따라 분기)
    // ⚠️ 주의: DB에 'live-lecture' 또는 'self-directed'로 저장되어 있어야 함
    const isSelfDirected = classType === 'self-directed'; 

    // 성공 메시지 표시
    if (isPass) {
        this.app.elements.successMessage.style.display = "block";
        this.app.elements.failureMessage.style.display = "none";
        this.app.elements.resultScoreTextSuccess.innerHTML = scoreText;

        const resultVideoContainer = document.getElementById('student-review-video2-container');
        
        // 버튼 컨테이너 초기화 (기존 버튼 삭제)
        const btnContainer = this.app.elements.successMessage.querySelector('.nav-buttons-container');
        if(btnContainer) btnContainer.remove();

        // 🟢 [자기주도반] -> Video 2 보여주기 & 시청 후 버튼 표시
        if (isSelfDirected) {
            if (resultVideoContainer) {
                resultVideoContainer.style.display = 'block';
                resultVideoContainer.innerHTML = `
                    <p class="text-sm font-bold text-slate-600 mb-3 text-left">📖 심화 학습 (Video 2)</p>
                    <div class="aspect-video bg-black rounded-lg overflow-hidden mb-3">
                        <iframe id="student-review-video2-iframe" class="w-full h-full" src="" frameborder="0" allowfullscreen></iframe>
                    </div>
                `;
            }

            // Video 2 URL 결정
            const video2List = activeLesson.video2List || [];
            const defaultUrl = video2List.length > 0 ? video2List[0].url : activeLesson.video2Url;
            
            if (defaultUrl) {
                const embedUrl = this.convertYoutubeUrlToEmbed(defaultUrl);
                const iframe = document.getElementById('student-review-video2-iframe');
                if(iframe) {
                    iframe.src = embedUrl;
                    
                    // ✨ Video 2 종료 감지하여 버튼 표시
                    this.loadVideoWithMonitoring('student-review-video2-iframe', (status) => {
                        if (status === 0) { // 종료됨
                            this.renderNavigationButtons(this.app.elements.successMessage);
                        }
                    });
                }
            } else {
                // 영상이 없으면 바로 버튼 표시
                if(resultVideoContainer) resultVideoContainer.innerHTML = '<p class="text-center text-slate-400 py-4">등록된 심화 영상이 없습니다.</p>';
                this.renderNavigationButtons(this.app.elements.successMessage);
            }

        } else {
            // 🔴 [현강반] -> Video 2 숨김 & 바로 버튼 표시
            if (resultVideoContainer) resultVideoContainer.style.display = 'none';
            this.renderNavigationButtons(this.app.elements.successMessage);
        }

    } else {
        // [실패 시]
        this.app.elements.successMessage.style.display = "none";
        this.app.elements.failureMessage.style.display = "block";
        this.app.elements.resultScoreTextFailure.textContent = scoreText;
        
        const resultVideoContainer = document.getElementById('student-review-video2-container');
        if(resultVideoContainer) resultVideoContainer.style.display = 'none';
    }
  },

  // ⬇️ [신규] 네비게이션 버튼 렌더링 (대시보드 / 목록)
  renderNavigationButtons(container) {
      // 중복 생성 방지
      if (container.querySelector('.nav-buttons-container')) return;

      const btnWrapper = document.createElement('div');
      btnWrapper.className = 'nav-buttons-container mt-6 flex flex-col gap-3 w-full';
      
      // 1. 목록으로 가기 버튼
      const backToListBtn = document.createElement('button');
      backToListBtn.className = 'btn-primary w-full py-3 rounded-xl font-bold shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2';
      backToListBtn.innerHTML = `<span class="material-icons">list</span> 학습 목록으로 돌아가기`;
      backToListBtn.onclick = () => {
          if (this.app.state.selectedSubject) {
              this.app.showLessonSelectionScreen(this.app.state.selectedSubject.id);
          } else {
              this.app.showSubjectSelectionScreen();
          }
      };

      // 2. 대시보드로 가기 버튼
      const backToHomeBtn = document.createElement('button');
      backToHomeBtn.className = 'w-full py-3 bg-white border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition flex items-center justify-center gap-2';
      backToHomeBtn.innerHTML = `<span class="material-icons">home</span> 대시보드로 이동`;
      backToHomeBtn.onclick = () => {
          this.app.showSubjectSelectionScreen();
      };

      btnWrapper.appendChild(backToListBtn);
      btnWrapper.appendChild(backToHomeBtn);
      container.appendChild(btnWrapper);
  },

  // 유튜브 모니터링 헬퍼
  loadVideoWithMonitoring(iframeId, onStateChangeCallback) {
    if (!this.isYoutubeApiReady) {
        setTimeout(() => this.loadVideoWithMonitoring(iframeId, onStateChangeCallback), 500);
        return;
    }
    try {
        new YT.Player(iframeId, {
            playerVars: { 'rel': 0, 'origin': window.location.origin },
            events: {
                'onStateChange': (event) => onStateChangeCallback(event.data),
            }
        });
    } catch (e) { console.warn("YT Player Warning", e); }
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
    } catch (error) { 
        console.error("Progress save failed:", error);
    }
  },
  
  // Video 1 다시보기 (실패 시)
  rewatchVideo1() {
      this.app.showScreen(this.app.elements.video1Screen);
      const iframe = this.app.elements.video1Iframe;
      if(iframe) {
        iframe.style.display = 'block';
        const container = iframe.parentNode;
        const msg = container.querySelector('.video-complete-msg');
        if(msg) msg.remove();
      }
  }
};