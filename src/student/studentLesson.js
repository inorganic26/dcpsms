// src/student/studentLesson.js

import { doc, setDoc, getDoc, serverTimestamp, collection, query, orderBy, getDocs, addDoc, where, deleteDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentLesson = {
  player: null, 
  video2Player: null,
  isYoutubeApiReady: false, 
  app: null,

  init(app) {
    this.app = app;
    this.bindEvents();
    this.loadYoutubeApi();
  },

  bindEvents() {
    const { elements } = this.app;
    const el = (id) => document.getElementById(elements[id] || id);

    el('startQuizBtn')?.addEventListener("click", () => this.startQuiz());
    el('retryQuizBtn')?.addEventListener("click", () => this.startQuiz());
    el('rewatchVideo1Btn')?.addEventListener("click", () => this.rewatchVideo1());
    
    const addTestBtn = document.getElementById('student-add-daily-test-btn');
    if(addTestBtn) {
        addTestBtn.onclick = () => this.addDailyTest();
    }
  },

  // 1. 강의 목록 불러오기
  async loadLessons(subjectId) {
    this.app.state.lessons = [];
    const container = document.getElementById(this.app.elements.lessonGrid || 'student-lesson-grid');
    if(container) container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">강의를 불러오는 중...</div>';

    try {
        const lessonsRef = collection(db, "subjects", subjectId, "lessons");
        const q = query(lessonsRef, orderBy("order", "asc")); 
        
        const querySnapshot = await getDocs(q);
        
        const lessons = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.isActive === true) {
                lessons.push({ id: doc.id, ...data });
            }
        });
        
        this.app.state.lessons = lessons;
        this.renderLessonList();

    } catch (error) {
        console.error("강의 로드 실패:", error);
        if(container) container.innerHTML = `<div class="col-span-full text-center py-10 text-red-400">강의 목록을 불러오지 못했습니다.<br><span class="text-xs text-slate-300">관리자 앱에서 '순서 저장'을 한 번 눌러주세요.</span></div>`;
    }
  },

  renderLessonList() {
    const container = document.getElementById(this.app.elements.lessonGrid || 'student-lesson-grid');
    if (!container) return;
    
    container.innerHTML = '';
    container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4';

    const lessons = this.app.state.lessons;
    if (!lessons || lessons.length === 0) {
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
        
        div.onclick = () => this.startSelectedLesson(lesson);
        container.appendChild(div);
    });
  },

  // ✨ [수정] 강의 시작 로직 (통과 여부 확인 후 분기)
  async startSelectedLesson(lesson) {
    this.app.state.activeLesson = lesson;
    const { studentDocId, classType, selectedSubject } = this.app.state;

    // 1. 자기주도반이 아니면 바로 영상 1 재생 (기존 로직)
    if (classType !== 'self-directed') {
        this.playVideo1(lesson);
        return;
    }

    // 2. 자기주도반인 경우, DB에서 통과 여부 확인
    showToast("학습 정보를 확인 중입니다...", false);
    try {
        const submissionRef = doc(db, "subjects", selectedSubject.id, "lessons", lesson.id, "submissions", studentDocId);
        const snapshot = await getDoc(submissionRef);

        // 3. 이미 통과(completed)한 경우 -> 선택 팝업 띄우기
        if (snapshot.exists() && snapshot.data().status === 'completed') {
            this.showVideoSelectionModal(lesson);
        } else {
            // 4. 아직 통과 못 했으면 -> 정석대로 1번 영상부터
            this.playVideo1(lesson);
        }
    } catch (e) {
        console.error(e);
        // 에러 나면 그냥 1번부터 재생
        this.playVideo1(lesson);
    }
  },

  // ✨ [신규] 영상 선택 팝업 (HTML 수정 없이 JS로 동적 생성)
  showVideoSelectionModal(lesson) {
    // 기존 모달이 있다면 제거
    const oldModal = document.getElementById('video-selection-modal');
    if(oldModal) oldModal.remove();

    const modal = document.createElement('div');
    modal.id = 'video-selection-modal';
    modal.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-[9999] p-4 animate-fade-in';
    modal.innerHTML = `
        <div class="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center transform scale-100 transition-transform">
            <div class="mb-4">
                <span class="material-icons text-5xl text-green-500 mb-2">check_circle</span>
                <h3 class="text-xl font-bold text-slate-800">학습 완료한 강의입니다!</h3>
                <p class="text-slate-500 text-sm mt-1">어떤 영상을 보시겠습니까?</p>
            </div>
            
            <div class="space-y-3">
                <button id="btn-select-video1" class="w-full py-4 rounded-xl border-2 border-indigo-100 hover:border-indigo-500 bg-indigo-50 hover:bg-indigo-600 group transition-all flex items-center justify-center gap-3">
                    <span class="material-icons text-indigo-500 group-hover:text-white">play_circle</span>
                    <span class="font-bold text-indigo-700 group-hover:text-white">개념 영상 다시보기</span>
                </button>

                <button id="btn-select-video2" class="w-full py-4 rounded-xl border-2 border-purple-100 hover:border-purple-500 bg-purple-50 hover:bg-purple-600 group transition-all flex items-center justify-center gap-3">
                    <span class="material-icons text-purple-500 group-hover:text-white">rocket_launch</span>
                    <span class="font-bold text-purple-700 group-hover:text-white">심화 영상(문제풀이) 보기</span>
                </button>
            </div>

            <button id="btn-close-selection" class="mt-6 text-slate-400 hover:text-slate-600 text-sm underline">닫기</button>
        </div>
    `;

    document.body.appendChild(modal);

    // 이벤트 연결
    document.getElementById('btn-select-video1').onclick = () => {
        modal.remove();
        this.playVideo1(lesson); // 1번 영상 재생
    };

    document.getElementById('btn-select-video2').onclick = () => {
        modal.remove();
        this.playVideo2Only(lesson); // 2번 영상 바로 재생 (퀴즈 패스)
    };

    document.getElementById('btn-close-selection').onclick = () => modal.remove();
  },

  // ✨ [기존 로직 분리] 1번 영상 재생
  playVideo1(lesson) {
    const { elements } = this.app;
    
    const titleEl = document.getElementById(elements.video1Title);
    if(titleEl) titleEl.textContent = lesson.title;

    this.app.showScreen(elements.video1Screen);

    const videoId = this.extractVideoId(lesson.video1Url);
    const iframe = document.getElementById(elements.video1Iframe);

    if (iframe) {
        if (!videoId) {
            iframe.style.display = 'none';
        } else {
            iframe.style.display = 'block'; 
            iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;
            
            const container = iframe.parentNode;
            const oldMsg = container?.querySelector('.video-complete-msg');
            if(oldMsg) oldMsg.remove();

            this.loadVideoWithMonitoring(elements.video1Iframe, (status) => {
                if (status === 0) this.onVideo1Ended(); 
            });
        }
    }

    const quizBtn = document.getElementById(elements.startQuizBtn);
    if (quizBtn) quizBtn.style.display = "none"; 
  },

  // ✨ [신규] 2번 영상(결과화면) 바로 가기
  playVideo2Only(lesson) {
    const { elements } = this.app;
    this.app.showScreen(elements.resultScreen);

    // 성공 메시지로 세팅
    const successMsg = document.getElementById(elements.successMessage);
    const failureMsg = document.getElementById(elements.failureMessage);
    const successText = document.getElementById(elements.resultScoreTextSuccess);

    if(successMsg) successMsg.style.display = "block";
    if(failureMsg) failureMsg.style.display = "none";
    
    // 점수 대신 안내 문구
    if(successText) successText.innerHTML = "학습을 완료한 강의입니다.<br>심화 영상을 자유롭게 시청하세요.";

    // 버튼 생성 (목록 돌아가기 등)
    const oldNav = successMsg.querySelector('.nav-buttons-container');
    if(oldNav) oldNav.remove();
    this.renderNavigationButtons(successMsg);

    // 2번 영상 재생 준비
    const resultVideoContainer = document.getElementById('student-review-video2-container');
    if(resultVideoContainer) {
        resultVideoContainer.style.display = 'block';
        resultVideoContainer.classList.remove('hidden');

        const video2List = lesson.video2List || [];
        const defaultUrl = video2List.length > 0 ? video2List[0].url : lesson.video2Url;
        
        const iframe = document.getElementById('student-review-video2-iframe');
        
        if (defaultUrl && iframe) {
            const embedUrl = this.convertYoutubeUrlToEmbed(defaultUrl);
            iframe.src = embedUrl;
        } else {
            resultVideoContainer.innerHTML = '<p class="text-center text-slate-400 py-4">등록된 심화 영상이 없습니다.</p>';
        }
    }
  },

  onVideo1Ended() {
    const { elements } = this.app;
    
    const iframe = document.getElementById(elements.video1Iframe);
    if (iframe) {
        iframe.style.display = 'none';
        const container = iframe.parentNode;
        if (container && !container.querySelector('.video-complete-msg')) {
            const msg = document.createElement('div');
            msg.className = 'video-complete-msg w-full h-full flex flex-col items-center justify-center text-white bg-slate-800 rounded-xl';
            msg.innerHTML = `
                <span class="material-icons text-4xl mb-2 text-green-400">check_circle</span>
                <span class="text-xl font-bold mb-1">영상 시청 완료!</span>
                <span class="text-sm text-slate-300">이제 퀴즈를 풀어보세요.</span>
            `;
            container.appendChild(msg);
        }
    }

    const quizBtn = document.getElementById(elements.startQuizBtn);
    if (quizBtn) {
        quizBtn.style.display = "block";
        quizBtn.disabled = false;
        quizBtn.textContent = "퀴즈 시작";
        quizBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
  },

  // 3. 퀴즈 로직
  startQuiz() {
    this.app.state.currentQuestionIndex = 0; 
    this.app.state.score = 0;
    
    const questionBank = this.app.state.activeLesson.questionBank || [];
    if (questionBank.length === 0) { showToast("등록된 문항이 없습니다."); return; }
    
    const count = Math.min(questionBank.length, this.app.state.totalQuizQuestions);
    this.app.state.quizQuestions = [...questionBank].sort(() => 0.5 - Math.random()).slice(0, count);
    
    this.app.showScreen(this.app.elements.quizScreen); 
    this.displayQuestion();
  },

  displayQuestion() {
    const { quizQuestions, currentQuestionIndex } = this.app.state;
    const { elements } = this.app;

    if (currentQuestionIndex >= quizQuestions.length) { 
        this.showResults(); 
        return; 
    }
    const question = quizQuestions[currentQuestionIndex];
    
    const progressPercent = ((currentQuestionIndex + 1) / quizQuestions.length) * 100;
    const progressBar = document.getElementById(elements.progressBar);
    const progressText = document.getElementById(elements.progressText);
    
    if (progressBar) progressBar.style.width = `${progressPercent}%`;
    if (progressText) progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${quizQuestions.length}`;

    const qTextEl = document.getElementById(elements.questionText);
    const optsContainer = document.getElementById(elements.optionsContainer);
    
    if(qTextEl) qTextEl.innerHTML = question.question || "질문 없음";
    if(optsContainer) {
        optsContainer.innerHTML = "";
        optsContainer.classList.remove("disabled");
        
        const options = question.options || [];
        [...options].sort(() => 0.5 - Math.random()).forEach((option) => {
          const btn = document.createElement("button");
          btn.innerHTML = option;
          btn.className = "option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100 mb-2 transition-colors";
          btn.onclick = (e) => this.selectAnswer(e, option);
          optsContainer.appendChild(btn);
        });
    }

    if (typeof MathJax !== 'undefined' && MathJax.typesetPromise && qTextEl && optsContainer) {
        MathJax.typesetPromise([qTextEl, optsContainer]).catch(() => {});
    }
  },

  selectAnswer(e, selectedText) {
    const { elements } = this.app;
    const optsContainer = document.getElementById(elements.optionsContainer);
    
    if(optsContainer.classList.contains("disabled")) return;
    optsContainer.classList.add("disabled");

    const currentQuestion = this.app.state.quizQuestions[this.app.state.currentQuestionIndex]; 
    const isCorrect = String(selectedText).trim() === String(currentQuestion.answer).trim();
    const selectedBtn = e.target;

    if (isCorrect) {
      this.app.state.score++;
      selectedBtn.classList.replace("border-slate-300", "border-green-500");
      selectedBtn.classList.replace("hover:bg-slate-100", "bg-green-100");
      selectedBtn.classList.add("text-green-800", "font-bold");
    } else {
      selectedBtn.classList.replace("border-slate-300", "border-red-500");
      selectedBtn.classList.replace("hover:bg-slate-100", "bg-red-100");
      selectedBtn.classList.add("text-red-800");
      
      Array.from(optsContainer.children).forEach(btn => {
          if(String(btn.innerHTML).trim() === String(currentQuestion.answer).trim()) {
              btn.classList.replace("border-slate-300", "border-green-500");
              btn.classList.add("bg-green-100", "text-green-800", "font-bold");
          }
      });
    }

    setTimeout(() => { 
        this.app.state.currentQuestionIndex++; 
        this.displayQuestion(); 
    }, 1500);
  },

  showResults() {
    const { score, passScore, totalQuizQuestions, activeLesson, classType } = this.app.state;
    const { elements } = this.app;
    
    const isPass = score >= passScore;
    
    this.updateStudentProgress(isPass ? "completed" : "failed", score);
    
    this.app.showScreen(elements.resultScreen);
    
    const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;

    const successMsg = document.getElementById(elements.successMessage);
    const failureMsg = document.getElementById(elements.failureMessage);
    const successText = document.getElementById(elements.resultScoreTextSuccess);
    const failureText = document.getElementById(elements.resultScoreTextFailure);

    if (isPass) {
        if(successMsg) successMsg.style.display = "block";
        if(failureMsg) failureMsg.style.display = "none";
        if(successText) successText.innerHTML = scoreText;

        const oldNav = successMsg.querySelector('.nav-buttons-container');
        if(oldNav) oldNav.remove();

        if (classType === 'self-directed') {
            const resultVideoContainer = document.getElementById('student-review-video2-container');
            if(resultVideoContainer) {
                resultVideoContainer.style.display = 'block';
                resultVideoContainer.classList.remove('hidden');

                const video2List = activeLesson.video2List || [];
                const defaultUrl = video2List.length > 0 ? video2List[0].url : activeLesson.video2Url;
                
                const iframe = document.getElementById('student-review-video2-iframe');
                
                if (defaultUrl && iframe) {
                    const embedUrl = this.convertYoutubeUrlToEmbed(defaultUrl);
                    iframe.src = embedUrl;
                    
                    this.loadVideoWithMonitoring('student-review-video2-iframe', (status) => {
                        if (status === 0) { 
                            this.renderNavigationButtons(successMsg);
                        }
                    });
                } else {
                    resultVideoContainer.innerHTML = '<p class="text-center text-slate-400 py-4">심화 영상이 없습니다.</p>';
                    this.renderNavigationButtons(successMsg);
                }
            }
        } else {
            const resultVideoContainer = document.getElementById('student-review-video2-container');
            if(resultVideoContainer) resultVideoContainer.style.display = 'none';
            
            this.renderNavigationButtons(successMsg);
        }

    } else {
        if(successMsg) successMsg.style.display = "none";
        if(failureMsg) failureMsg.style.display = "block";
        if(failureText) failureText.textContent = scoreText;
        
        const resultVideoContainer = document.getElementById('student-review-video2-container');
        if(resultVideoContainer) resultVideoContainer.style.display = 'none';
    }
  },

  renderNavigationButtons(container) {
      if (!container) return;
      if (container.querySelector('.nav-buttons-container')) return; 

      const btnWrapper = document.createElement('div');
      btnWrapper.className = 'nav-buttons-container mt-6 flex flex-col gap-3 w-full animate-fade-in-up';
      
      const backToListBtn = document.createElement('button');
      backToListBtn.className = 'w-full py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 transition flex items-center justify-center gap-2';
      backToListBtn.innerHTML = `<span class="material-icons">list</span> 목록으로 돌아가기`;
      backToListBtn.onclick = () => {
          if (this.app.state.selectedSubject) {
              this.app.showLessonSelectionScreen(this.app.state.selectedSubject.id);
          } else {
              this.app.showSubjectSelectionScreen();
          }
      };

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

  initDailyTestScreen() {
      const subjectSelect = document.getElementById('daily-test-subject-select');
      const subjects = this.app.state.subjects || [];

      if (subjectSelect) {
          subjectSelect.innerHTML = '<option value="">과목을 선택해주세요</option>';
          subjects.forEach(sub => {
              const opt = document.createElement('option');
              opt.value = sub.id;
              opt.textContent = sub.name;
              subjectSelect.appendChild(opt);
          });
      }
      this.loadAllDailyTests();
  },

  async addDailyTest() {
      const studentId = this.app.state.studentDocId;
      const studentName = this.app.state.studentName;
      const classId = this.app.state.studentData?.classId || null;

      const subjectSelect = document.getElementById('daily-test-subject-select');
      const dateEl = document.getElementById('daily-test-date');
      const scoreEl = document.getElementById('daily-test-score');
      const memoEl = document.getElementById('daily-test-memo');

      if (!subjectSelect.value) {
          showToast("과목을 선택해주세요.", true);
          return;
      }
      if (!dateEl.value || !scoreEl.value) {
          showToast("날짜와 점수를 입력해주세요.", true);
          return;
      }

      const selectedOption = subjectSelect.options[subjectSelect.selectedIndex];
      const subjectName = selectedOption ? selectedOption.text : '알 수 없음';

      if(!confirm(`${subjectName} ${scoreEl.value}점을 등록하시겠습니까?`)) return;

      try {
          await addDoc(collection(db, "daily_tests"), {
              studentId,
              studentName: studentName || '이름 없음',
              classId: classId, 
              subjectId: subjectSelect.value, 
              subjectName: subjectName,       
              date: dateEl.value,
              score: Number(scoreEl.value),
              memo: memoEl.value || '',
              createdAt: serverTimestamp()
          });
          
          showToast("등록되었습니다.");
          scoreEl.value = '';
          memoEl.value = '';
          this.loadAllDailyTests(); 

      } catch (e) {
          console.error(e);
          showToast("저장 실패", true);
      }
  },

  async loadAllDailyTests() {
      const studentId = this.app.state.studentDocId;
      const container = document.getElementById('student-daily-test-list');
      
      const dateInput = document.getElementById('daily-test-date');
      if(dateInput && !dateInput.value) dateInput.value = new Date().toISOString().split('T')[0];

      if (!container) return;
      container.innerHTML = '<div class="p-4 text-center text-slate-400">로딩 중...</div>';

      try {
          const q = query(
              collection(db, "daily_tests"),
              where("studentId", "==", studentId),
              orderBy("date", "desc")
          );
          
          const snapshot = await getDocs(q);
          container.innerHTML = '';

          if (snapshot.empty) {
              container.innerHTML = '<div class="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400">아직 등록된 테스트가 없습니다.</div>';
              return;
          }

          snapshot.forEach(docSnap => {
              const data = docSnap.data();
              const el = document.createElement('div');
              el.className = 'bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center';
              
              el.innerHTML = `
                  <div>
                      <div class="flex items-center gap-2 mb-1">
                          <span class="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded">${data.subjectName || '과목없음'}</span>
                          <span class="text-xs text-slate-400 font-bold">${data.date}</span>
                      </div>
                      <div class="font-bold text-slate-800 text-lg">${data.score}점 <span class="text-sm text-slate-500 font-normal ml-1">(${data.memo || '내용 없음'})</span></div>
                  </div>
                  <button class="del-btn text-slate-300 hover:text-red-500 p-2 transition">
                      <span class="material-icons-round">delete</span>
                  </button>
              `;
              
              el.querySelector('.del-btn').onclick = () => this.deleteDailyTest(docSnap.id);
              container.appendChild(el);
          });

      } catch (error) {
          console.error(error);
          container.innerHTML = '<div class="text-red-500 text-center p-4">데이터를 불러오지 못했습니다.</div>';
      }
  },

  async deleteDailyTest(docId) {
      if(!confirm("정말 삭제하시겠습니까?")) return;
      try {
          await deleteDoc(doc(db, "daily_tests", docId));
          showToast("삭제되었습니다.");
          this.loadAllDailyTests();
      } catch (e) {
          console.error(e);
          showToast("삭제 실패", true);
      }
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

  convertYoutubeUrlToEmbed(url) {
    const videoId = this.extractVideoId(url);
    if (!videoId) return "";
    return `https://www.youtube.com/embed/${videoId}?enablejsapi=1&origin=${window.location.origin}&rel=0`;
  },

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
  
  rewatchVideo1() {
      const { elements } = this.app;
      this.app.showScreen(elements.video1Screen);
      const iframe = document.getElementById(elements.video1Iframe);
      if(iframe) {
        iframe.style.display = 'block';
        const container = iframe.parentNode;
        const msg = container.querySelector('.video-complete-msg');
        if(msg) msg.remove();
      }
  }
};