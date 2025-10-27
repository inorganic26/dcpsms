// src/student/studentLesson.js

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentLesson = {
  init(app) {
    this.app = app;

    // 이벤트 리스너 연결
    this.app.elements.gotoRev1Btn?.addEventListener("click", () => this.showNextRevisionVideo(1));
    this.app.elements.startQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.retryQuizBtn?.addEventListener("click", () => this.startQuiz());
    this.app.elements.rewatchVideo1Btn?.addEventListener("click", () => this.rewatchVideo1());
    this.app.elements.showRev2BtnSuccess?.addEventListener("click", () => this.showNextRevisionVideo(2, true));
    this.app.elements.showRev2BtnFailure?.addEventListener("click", () => this.showNextRevisionVideo(2, false));
  },

  // ✨ [최종 보강] YouTube URL 변환 함수: 모든 형태의 YouTube 링크에서 ID 추출 로직 강화
  convertYoutubeUrlToEmbed(url) {
    if (!url || typeof url !== "string") return "";
    
    let videoId = null; 
    let startTime = 0; 
    let tempUrl = url.trim();

    // 1. YouTube ID 추출 정규식: watch?v=, youtu.be/, embed/, shorts/, Studio URL 등 모든 패턴 처리
    const videoIdRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/;
    const idMatch = tempUrl.match(videoIdRegex);
    
    if (idMatch && idMatch[1]) {
        videoId = idMatch[1];
    } else {
         console.error("[studentLesson.js] Failed to extract video ID from URL:", url);
         return "";
    }
    
    // 2. Start Time ('t' 또는 'start' 매개변수) 추출
    try {
      // URL 객체로 파싱하여 쿼리에서 't' 또는 'start'를 찾습니다.
      if (!tempUrl.startsWith("http")) tempUrl = "https://" + tempUrl;
      const urlObj = new URL(tempUrl);
      const tParam = urlObj.searchParams.get('t') || urlObj.searchParams.get('start');
      
      if (tParam) {
          // 숫자(초)만 추출
          const secondsMatch = tParam.match(/^(\d+)/); 
          if (secondsMatch) startTime = parseInt(secondsMatch[1], 10);
      }
    } catch (e) { 
        // URL 파싱 오류 무시
    }

    // 3. 최종 표준 임베드 URL 생성
    let embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    if (startTime > 0) embedUrl += `&start=${startTime}`;
    
    console.log("[studentLesson.js] Extracted Video ID:", videoId);
    console.log("[studentLesson.js] Generated Embed URL:", embedUrl);
    return embedUrl;
  },

  // ✨ [수정] 학습 시작 함수: setTimeout 제거 및 에러 핸들링 보강
  startSelectedLesson(lesson) {
    const { elements } = this.app;
    this.app.state.activeLesson = lesson;
    this.app.state.currentRevVideoIndex = 0;

    const originalUrl = lesson.video1Url;
    const embedUrl = this.convertYoutubeUrlToEmbed(originalUrl);
    const iframe = elements.video1Iframe;
    const titleElement = elements.video1Title;
    
    console.log("[studentLesson.js] === Starting Lesson:", lesson.title, "===");

    if (!iframe || !titleElement) { 
        console.error("[studentLesson.js] Video player elements (iframe/title) not found."); 
        showToast("영상 플레이어 요소를 찾을 수 없습니다.", true); 
        this.app.showLessonSelectionScreen(); 
        return; 
    }
    
    // 1. UI 초기화 및 로딩 표시
    this.app.showScreen(elements.video1Screen);
    titleElement.textContent = lesson.title;
    iframe.style.display = 'none'; // 로드 완료 전 숨김
    iframe.style.border = 'none'; // ✨ [보강] border: none 추가
    
    // 2. URL 유효성 검사
    if (!embedUrl) {
        console.error("[studentLesson.js] Failed to generate embed URL:", originalUrl);
        showToast("비디오 URL 형식이 올바르지 않습니다. 관리자에게 문의하세요.", true);
        this.app.showLessonSelectionScreen(); 
        return; 
    }

    // 3. Iframe 로드 핸들링
    iframe.onerror = (e) => { 
        console.error("[studentLesson.js] video1 iframe reported error on load:", e); 
        showToast("영상 로드 중 오류 발생. (유튜브 정책 확인 필요)", true); 
        iframe.src = 'about:blank'; // 오류 시 비우기
        iframe.style.display = 'none'; 
    };
    iframe.onload = () => { 
        console.log("[studentLesson.js] video1 iframe reported loaded."); 
        iframe.style.display = 'block'; 
    };

    // 4. SRC 설정 (즉시 실행)
    iframe.src = embedUrl;
    console.log("[studentLesson.js] Iframe SRC set to:", embedUrl);

    // 5. 버튼 상태 업데이트
    const revUrls = lesson.video1RevUrls;
    const hasRevUrls = revUrls && Array.isArray(revUrls) && revUrls.length > 0;
    
    if (elements.gotoRev1Btn) { 
        elements.gotoRev1Btn.style.display = hasRevUrls ? "block" : "none"; 
        if (hasRevUrls) elements.gotoRev1Btn.textContent = `보충 영상 보기 (1/${revUrls.length})`; 
    }
    
    if (elements.startQuizBtn) { 
        elements.startQuizBtn.style.display = hasRevUrls ? "none" : "block"; 
    }
    console.log(`[studentLesson.js] Buttons updated (hasRevUrls: ${hasRevUrls}).`);
  },

  // 보충 영상 표시 함수 (변경 없음)
  showNextRevisionVideo(type, isSuccess = null) {
    const { state, elements } = this.app;
    const revUrls = type === 1 ? state.activeLesson?.video1RevUrls : state.activeLesson?.video2RevUrls;
    if (!state.activeLesson || !revUrls || revUrls.length === 0) return;
    const currentIndex = state.currentRevVideoIndex; if (currentIndex >= revUrls.length) return;
    const url = this.convertYoutubeUrlToEmbed(revUrls[currentIndex]); if (!url) { showToast("보충 비디오 URL이 올바르지 않습니다."); return; }
    const title = `${state.activeLesson.title} (보충 영상 ${currentIndex + 1}/${revUrls.length})`;
    if (type === 1) {
      if(elements.video1Title) elements.video1Title.textContent = title; const iframe = elements.video1Iframe;
      if (!iframe) { console.error("video1Iframe 요소를 찾을 수 없습니다."); return; }
      iframe.src = url; iframe.style.display = "block"; state.currentRevVideoIndex++;
      if (state.currentRevVideoIndex < revUrls.length) { if(elements.gotoRev1Btn) elements.gotoRev1Btn.textContent = `보충 영상 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`; }
      else { if(elements.gotoRev1Btn) elements.gotoRev1Btn.style.display = "none"; if(elements.startQuizBtn) elements.startQuizBtn.style.display = "block"; }
    } else {
      const button = isSuccess ? elements.showRev2BtnSuccess : elements.showRev2BtnFailure;
      const iframe = isSuccess ? elements.reviewVideo2Iframe : elements.video2Iframe;
      if (iframe) { iframe.src = url; iframe.style.display = "block"; } else { console.error(`결과 화면의 iframe 요소를 찾을 수 없습니다 (isSuccess: ${isSuccess})`); return; }
      state.currentRevVideoIndex++;
      if (button) { if (state.currentRevVideoIndex < revUrls.length) { button.textContent = `보충 풀이 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`; } else { button.style.display = "none"; } }
    }
  },

  // 퀴즈 시작 함수
  startQuiz() {
    // 👇 수정: studentDocId 유효성 검사 강화
    if (!this.app.state.activeLesson) { console.error("[studentLesson.js] startQuiz called but activeLesson is null."); this.app.showLessonSelectionScreen(); return; }
    if (!this.app.state.studentDocId || typeof this.app.state.studentDocId !== 'string' || this.app.state.studentDocId.trim() === '') {
        showToast("학생 정보(문서 ID)가 유효하지 않습니다. 다시 로그인해주세요.", true);
        console.error("[studentLesson.js] startQuiz called with invalid studentDocId:", this.app.state.studentDocId);
        this.app.showSubjectSelectionScreen(); return;
    }

    this.updateStudentProgress("퀴즈 푸는 중"); // Firestore 업데이트 시도
    this.app.state.currentQuestionIndex = 0; this.app.state.score = 0;
    const questionBank = Array.isArray(this.app.state.activeLesson.questionBank) ? this.app.state.activeLesson.questionBank : [];
    if (questionBank.length === 0) { showToast("퀴즈 문항이 없습니다. 관리자에게 문의하세요."); this.app.showLessonSelectionScreen(); return; }
    const shuffledBank = [...questionBank].sort(() => 0.5 - Math.random());
    this.app.state.quizQuestions = shuffledBank.slice(0, this.app.state.totalQuizQuestions);
    console.log(`[studentLesson.js] Starting quiz with ${this.app.state.quizQuestions.length} questions.`);
    this.updateScoreDisplay(); this.app.showScreen(this.app.elements.quizScreen); this.displayQuestion();
  },

  // 현재 질문 표시 함수 (변경 없음)
  displayQuestion() {
    const { quizQuestions, currentQuestionIndex } = this.app.state;
    if (currentQuestionIndex >= quizQuestions.length) { console.log("[studentLesson.js] All questions answered. Showing results."); this.showResults(); return; }
    const question = quizQuestions[currentQuestionIndex];
    if (!question) { console.error(`[studentLesson.js] Question at index ${currentQuestionIndex} is undefined.`); this.showResults(); return; }
    this.updateProgress();
    if(this.app.elements.questionText) this.app.elements.questionText.textContent = question.question || "[질문 텍스트 없음]";
    if(this.app.elements.optionsContainer) this.app.elements.optionsContainer.innerHTML = "";
    const options = Array.isArray(question.options) ? question.options : [];
    if (options.length === 0) { console.warn(`[studentLesson.js] Question ${currentQuestionIndex + 1} has no options.`); showToast("선택지가 없는 문제가 있습니다. 다음 문제로 넘어갑니다.", true); setTimeout(() => { this.app.state.currentQuestionIndex++; this.displayQuestion(); }, 1500); return; }
    [...options].sort(() => 0.5 - Math.random()).forEach((option) => {
      const button = document.createElement("button"); button.textContent = option; button.className = "option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100"; button.onclick = (e) => this.selectAnswer(e);
      if(this.app.elements.optionsContainer) this.app.elements.optionsContainer.appendChild(button);
    });
  },

  // 답안 선택 시 처리 함수 (변경 없음)
  selectAnswer(e) {
    if(this.app.elements.optionsContainer) this.app.elements.optionsContainer.classList.add("disabled");
    const selectedButton = e.target; const selectedAnswerText = selectedButton.textContent;
    const currentQuestion = this.app.state.quizQuestions[this.app.state.currentQuestionIndex]; const correctAnswerText = currentQuestion.answer;
    if (selectedAnswerText === correctAnswerText) { this.app.state.score++; selectedButton.classList.add("correct"); }
    else { selectedButton.classList.add("incorrect"); Array.from(this.app.elements.optionsContainer.children).forEach((btn) => { if (btn.textContent === correctAnswerText) { btn.classList.add("correct"); } }); }
    this.updateScoreDisplay();
    setTimeout(() => { if(this.app.elements.optionsContainer) this.app.elements.optionsContainer.classList.remove("disabled"); this.app.state.currentQuestionIndex++; this.displayQuestion(); }, 1500);
  },

  // 퀴즈 결과 표시 함수
  showResults() {
    const { score, passScore, totalQuizQuestions, activeLesson, studentDocId } = this.app.state; // studentDocId 추가
    if (!activeLesson) { console.error("[studentLesson.js] showResults called but activeLesson is null."); this.app.showLessonSelectionScreen(); return; }
    // 👇 수정: studentDocId 유효성 검사 강화
    if (!studentDocId || typeof studentDocId !== 'string' || studentDocId.trim() === '') {
        showToast("학생 정보(문서 ID)가 유효하지 않아 결과를 저장할 수 없습니다.", true);
        console.error("[studentLesson.js] showResults called with invalid studentDocId:", studentDocId);
        this.app.showSubjectSelectionScreen(); return;
    }

    this.app.state.currentRevVideoIndex = 0;
    const pass = score >= passScore; const status = pass ? "퀴즈 통과 (완료)" : "퀴즈 실패";
    console.log(`[studentLesson.js] Quiz finished. Score: ${score}/${totalQuizQuestions}. Pass: ${pass}`);
    this.updateStudentProgress(status, score); // Firestore 업데이트 시도

    this.app.showScreen(this.app.elements.resultScreen); console.log("[studentLesson.js] Switched to resultScreen.");
    const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
    const revUrls = Array.isArray(activeLesson.video2RevUrls) ? activeLesson.video2RevUrls : []; const hasRevUrls = revUrls.length > 0;
    const video2EmbedUrl = this.convertYoutubeUrlToEmbed(activeLesson.video2Url); let targetIframe = null;

    if (pass) { /* ... (성공 UI 처리, 변경 없음) ... */
      if(this.app.elements.successMessage) this.app.elements.successMessage.style.display = "block"; if(this.app.elements.failureMessage) this.app.elements.failureMessage.style.display = "none";
      if(this.app.elements.resultScoreTextSuccess) this.app.elements.resultScoreTextSuccess.textContent = scoreText; targetIframe = this.app.elements.reviewVideo2Iframe;
      console.log("[studentLesson.js] Target iframe is reviewVideo2Iframe.");
      if (this.app.elements.showRev2BtnSuccess) { this.app.elements.showRev2BtnSuccess.style.display = hasRevUrls ? "block" : "none"; if (hasRevUrls) this.app.elements.showRev2BtnSuccess.textContent = `보충 풀이 보기 (1/${revUrls.length})`; }
    } else { /* ... (실패 UI 처리, 변경 없음) ... */
      if(this.app.elements.successMessage) this.app.elements.successMessage.style.display = "none"; if(this.app.elements.failureMessage) this.app.elements.failureMessage.style.display = "block";
      if(this.app.elements.resultScoreTextFailure) this.app.elements.resultScoreTextFailure.textContent = scoreText; targetIframe = this.app.elements.video2Iframe;
      console.log("[studentLesson.js] Target iframe is video2Iframe.");
      if (this.app.elements.showRev2BtnFailure) { this.app.elements.showRev2BtnFailure.style.display = hasRevUrls ? "block" : "none"; if (hasRevUrls) this.app.elements.showRev2BtnFailure.textContent = `보충 풀이 보기 (1/${revUrls.length})`; }
    }

    if (!video2EmbedUrl) { /* ... (영상 URL 오류 처리, 변경 없음) ... */
      console.error("[studentLesson.js] video2Url is invalid:", activeLesson.video2Url); if (targetIframe) targetIframe.style.display = 'none';
      if (this.app.elements.showRev2BtnSuccess) this.app.elements.showRev2BtnSuccess.style.display = 'none'; if (this.app.elements.showRev2BtnFailure) this.app.elements.showRev2BtnFailure.style.display = 'none';
    } else if (!targetIframe) { /* ... (iframe 요소 없음 오류 처리, 변경 없음) ... */
      console.error(`[studentLesson.js] Target iframe element (${pass ? 'reviewVideo2Iframe' : 'video2Iframe'}) not found.`); showToast("결과 영상 플레이어 요소를 찾을 수 없습니다.", true);
    } else { /* ... (iframe src 설정, 변경 없음) ... */
      console.log(`[studentLesson.js] Setting target iframe (${targetIframe.id}) src:`, video2EmbedUrl);
      try { targetIframe.src = video2EmbedUrl; targetIframe.style.display = 'block'; console.log(`[studentLesson.js] Set target iframe (${targetIframe.id}) display to 'block'.`);
        targetIframe.onload = () => console.log(`[studentLesson.js] Target iframe (${targetIframe.id}) loaded successfully.`); targetIframe.onerror = (e) => console.error(`[studentLesson.js] Target iframe (${targetIframe.id}) failed to load:`, e);
      } catch (error) { console.error(`[studentLesson.js] Error setting target iframe (${targetIframe.id}) src or display:`, error); showToast("결과 영상 설정 중 오류 발생", true); targetIframe.style.display = 'none'; }
    }
  },

  // 영상 1 다시보기 (변경 없음)
  rewatchVideo1() {
    if (!this.app.state.activeLesson) return; const embedUrl = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url);
    const iframe = this.app.elements.reviewVideo2Iframe;
    if (embedUrl && iframe) { console.log("[studentLesson.js] Rewatching video 1 in reviewVideo2Iframe:", embedUrl); iframe.src = embedUrl; iframe.style.display = "block"; }
    else if (!iframe) { console.error("[studentLesson.js] reviewVideo2Iframe element not found for rewatch."); }
    else { console.error("[studentLesson.js] Failed to get embedUrl for rewatching video 1."); }
  },

  // Firestore 업데이트 함수
  async updateStudentProgress(status, score = null) {
    const { activeLesson, studentDocId, selectedSubject, studentName, totalQuizQuestions } = this.app.state;

    // 👇 수정: studentDocId 유효성 검사 강화
    if (!activeLesson?.id || !studentDocId || typeof studentDocId !== 'string' || studentDocId.trim() === '' || !selectedSubject?.id) {
      console.warn("[studentLesson.js] Failed to update progress: Missing or invalid required info.", {
          lessonId: activeLesson?.id,
          studentDocId: studentDocId, // 로그에 studentDocId 포함
          subjectId: selectedSubject?.id
      });
      // 사용자에게 직접적인 오류 메시지 (퀴즈 종료 시에는 이미 결과 화면이 보이므로 생략 가능)
      // showToast("학습 기록 저장에 필요한 정보가 부족합니다.", true);
      return;
    }

    const submissionRef = doc(
      db, "subjects", selectedSubject.id, "lessons", activeLesson.id, "submissions", studentDocId
    );

    const data = {
      studentName: studentName || "익명",
      status: status,
      lastAttemptAt: serverTimestamp(),
      studentDocId: studentDocId // Firestore 규칙 검증을 위해 studentDocId 필드 포함 (필수)
    };

    if (score !== null) {
      data.score = score;
      data.totalQuestions = totalQuizQuestions;
    }
    console.log("[studentLesson.js] Preparing to update progress data:", data, "to path:", submissionRef.path);

    try {
      // merge: true 옵션으로 기존 문서가 있으면 덮어쓰지 않고 필드 병합
      await setDoc(submissionRef, data, { merge: true });
      console.log("[studentLesson.js] Student progress updated successfully in Firestore.");
    } catch (error) {
      console.error("[studentLesson.js] Firestore write error while updating progress:", error);
      // 사용자에게 오류 표시 (퀴즈 종료 시 결과는 보여주되 저장 실패 알림)
      showToast(`학습 기록 저장 실패: ${error.message}. 결과는 표시되지만 저장되지 않았습니다.`);
    }
  },

  // 점수 표시 업데이트 (변경 없음)
  updateScoreDisplay() {
    if (this.app.elements.scoreText) { this.app.elements.scoreText.textContent = `점수: ${this.app.state.score}`; }
    else { console.warn("[studentLesson.js] scoreText element not found."); }
  },

  // 진행률 표시 업데이트 (변경 없음)
  updateProgress() {
    const { currentQuestionIndex, totalQuizQuestions } = this.app.state;
    const progressPercent = totalQuizQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuizQuestions) * 100 : 0;
    if (this.app.elements.progressText) { this.app.elements.progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${totalQuizQuestions}`; }
    else { console.warn("[studentLesson.js] progressText element not found."); }
    if (this.app.elements.progressBar) { this.app.elements.progressBar.style.width = `${progressPercent}%`; }
    else { console.warn("[studentLesson.js] progressBar element not found."); }
  },
}; // studentLesson 객체 끝