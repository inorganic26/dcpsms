// src/student/studentLesson.js

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentLesson = {
  init(app) {
    this.app = app;

    // 이벤트 리스너 연결 (Optional chaining 사용)
    this.app.elements.gotoRev1Btn?.addEventListener("click", () =>
      this.showNextRevisionVideo(1) // 영상 1 보충 영상 보기
    );
    this.app.elements.startQuizBtn?.addEventListener("click", () =>
      this.startQuiz() // 퀴즈 시작
    );
    this.app.elements.retryQuizBtn?.addEventListener("click", () =>
      this.startQuiz() // 퀴즈 재시도
    );
    this.app.elements.rewatchVideo1Btn?.addEventListener("click", () =>
      this.rewatchVideo1() // 영상 1 다시보기 (결과 화면에서)
    );
    this.app.elements.showRev2BtnSuccess?.addEventListener("click", () =>
      this.showNextRevisionVideo(2, true) // 영상 2 보충 영상 보기 (성공 시)
    );
    this.app.elements.showRev2BtnFailure?.addEventListener("click", () =>
      this.showNextRevisionVideo(2, false) // 영상 2 보충 영상 보기 (실패 시)
    );
  },

  // YouTube URL을 Embed URL로 변환하는 함수 (개선됨)
  convertYoutubeUrlToEmbed(url) {
    if (!url || typeof url !== "string") return ""; // 유효하지 않은 입력 처리

    url = url.trim(); // 앞뒤 공백 제거
    let videoId = null;
    let startTime = 0;
    let tempUrl = url;

    // URL 형식이 http(s):// 로 시작하지 않으면 추가
    if (!tempUrl.startsWith("http://") && !tempUrl.startsWith("https://")) {
      tempUrl = "https://" + tempUrl;
    }

    // 다양한 유튜브 URL 형식에서 비디오 ID 추출 (shorts 포함)
    const regex =
      /(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/;
    const match = tempUrl.match(regex);
    if (match) videoId = match[1];

    // 비디오 ID 유효성 검사 (11자리 영문, 숫자, _, -)
    if (!videoId || !/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
       console.error("[studentLesson.js] Invalid YouTube Video ID extracted:", videoId, "from URL:", tempUrl);
       return ""; // 잘못된 비디오 ID
    }

    // 시작 시간 추출 (t=XX)
    try {
      // URL 객체를 생성할 수 없는 경우(예: 잘못된 형식)를 대비
      const urlObj = new URL(tempUrl);
      const tParam = urlObj.searchParams.get("t");
      if (tParam) {
        // 't' 파라미터에서 숫자만 추출 (예: 10s -> 10)
        const secondsMatch = tParam.match(/^(\d+)/);
        if (secondsMatch) startTime = parseInt(secondsMatch[1], 10);
      }
    } catch (e) {
      // URL 파싱 실패 시 콘솔에 에러 기록 (시작 시간 없이 진행)
      console.error("[studentLesson.js] URL parsing error:", e, "Original URL:", tempUrl);
    }

    // Embed URL 생성
    // enablejsapi=1: JavaScript API 사용 가능 (선택 사항)
    let embedUrl = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    if (startTime > 0) embedUrl += `&start=${startTime}`; // 시작 시간 파라미터 추가 시 & 사용
    // console.log("[studentLesson.js] Generated Embed URL:", embedUrl); // 필요 시 로그 활성화
    return embedUrl;
  },

  // 선택된 학습 시작 함수 (iframe 생성 로직 제거, 화면 전환 우선)
  startSelectedLesson(lesson) {
    this.app.state.activeLesson = lesson; // 현재 학습 정보 저장
    this.app.state.currentRevVideoIndex = 0; // 보충 영상 인덱스 초기화

    const originalUrl = this.app.state.activeLesson.video1Url; // Firestore의 원본 URL
    const embedUrl = this.convertYoutubeUrlToEmbed(originalUrl); // Embed URL로 변환

    // 디버깅 로그
    console.log("[studentLesson.js] === Starting Lesson:", lesson.title, "===");
    console.log("[studentLesson.js] Original URL:", originalUrl);

    // Embed URL 생성 실패 시 처리
    if (!embedUrl) {
      console.error("[studentLesson.js] Failed to generate embed URL.");
      showToast(
        "비디오 URL 형식이 올바르지 않습니다. 관리자에게 문의하세요.",
        true
      );
      this.app.showLessonSelectionScreen(); // 학습 선택 화면으로 복귀
      return;
    }
    console.log("[studentLesson.js] Generated Embed URL:", embedUrl);

    // 학습 제목 설정
    const titleElement = this.app.elements.video1Title;
    if (titleElement) {
      titleElement.textContent = this.app.state.activeLesson.title;
      console.log("[studentLesson.js] Title set:", titleElement.textContent);
    } else {
      console.error("[studentLesson.js] video1Title element not found.");
      return; // 필수 요소 없으면 중단
    }

    // iframe 요소 참조 (캐시된 요소 사용)
    const iframe = this.app.elements.video1Iframe;
    if (!iframe) {
      console.error("[studentLesson.js] video1Iframe element not found in cache. Check HTML ID and cacheElements function.");
      showToast("영상 플레이어 요소를 찾을 수 없습니다.", true);
      this.app.showLessonSelectionScreen(); // 학습 선택 화면으로 복귀
      return;
    }
    console.log("[studentLesson.js] Found iframe element:", iframe);

    // 화면 전환을 먼저 수행
    this.app.showScreen(this.app.elements.video1Screen);
    console.log("[studentLesson.js] Called showScreen for video1Screen.");

    // iframe src 설정 및 표시 (화면 전환 후 약간의 지연)
    // 화면 전환 후 DOM 업데이트 시간을 약간 확보하기 위해 setTimeout 사용
    setTimeout(() => {
        try {
            console.log("[studentLesson.js] Setting iframe src inside setTimeout:", embedUrl);
            iframe.src = embedUrl; // iframe 소스 설정

            // iframe 로드 완료/실패 이벤트 (디버깅용)
            iframe.onload = () => {
                console.log("[studentLesson.js] video1 iframe reported loaded.");
                iframe.style.display = 'block'; // 로드 완료 시 표시
                console.log("[studentLesson.js] Set video1 iframe display to 'block' after load.");
            };
            iframe.onerror = (e) => {
                console.error("[studentLesson.js] video1 iframe reported error on load:", e);
                showToast("영상 로드 중 오류 발생.", true);
                iframe.style.display = 'none'; // 로드 실패 시 숨김
            };

            // 즉시 표시 시도 (onload가 불안정할 경우 대비)
             iframe.style.display = 'block';
             console.log("[studentLesson.js] Set video1 iframe display to 'block' immediately after setting src.");

        } catch (error) {
            console.error("[studentLesson.js] Error setting video1 iframe src or display:", error);
            showToast("영상 설정 중 오류 발생", true);
        }

        // 보충 영상 버튼 및 퀴즈 시작 버튼 상태 업데이트
        const revUrls = this.app.state.activeLesson.video1RevUrls;
        const hasRevUrls = revUrls && Array.isArray(revUrls) && revUrls.length > 0;
        const gotoRev1Btn = this.app.elements.gotoRev1Btn;
        const startQuizBtn = this.app.elements.startQuizBtn;

        if (gotoRev1Btn) {
            gotoRev1Btn.style.display = hasRevUrls ? "block" : "none";
            if (hasRevUrls) {
                gotoRev1Btn.textContent = `보충 영상 보기 (1/${revUrls.length})`;
            }
        }
        if (startQuizBtn) {
            startQuizBtn.style.display = hasRevUrls ? "none" : "block";
        }
        console.log(`[studentLesson.js] Buttons updated (hasRevUrls: ${hasRevUrls}).`);
    }, 10); // 10ms 지연
  },

  // 보충 영상 표시 함수
  showNextRevisionVideo(type, isSuccess = null) {
    const { state, elements } = this.app;
    // type 1: 기본 영상(video1) 보충, type 2: 문제 풀이 영상(video2) 보충
    const revUrls =
      type === 1 ? state.activeLesson?.video1RevUrls : state.activeLesson?.video2RevUrls;

    // activeLesson 없거나 보충 영상 없으면 중단
    if (!state.activeLesson || !revUrls || revUrls.length === 0) return;

    const currentIndex = state.currentRevVideoIndex; // 현재 보여줄 보충 영상 인덱스
    if (currentIndex >= revUrls.length) return; // 모든 보충 영상을 이미 본 경우

    // 보충 영상 URL을 Embed URL로 변환
    const url = this.convertYoutubeUrlToEmbed(revUrls[currentIndex]);
    if (!url) {
      showToast("보충 비디오 URL이 올바르지 않습니다.");
      return;
    }

    // 보충 영상 제목 설정
    const title = `${state.activeLesson.title} (보충 영상 ${
      currentIndex + 1
    }/${revUrls.length})`;

    // 타입에 따라 다른 iframe 및 버튼 조작
    if (type === 1) { // 영상 1 보충
      elements.video1Title.textContent = title; // 제목 업데이트
      const iframe = elements.video1Iframe; // 영상 1 iframe 참조
      if (!iframe) {
        console.error("video1Iframe 요소를 찾을 수 없습니다."); return;
      }
      iframe.src = url; // iframe 소스 변경
      iframe.style.display = "block";
      state.currentRevVideoIndex++; // 다음 보충 영상 인덱스로 증가

      // 다음 보충 영상 버튼 텍스트 업데이트 또는 퀴즈 버튼 표시
      if (state.currentRevVideoIndex < revUrls.length) {
        elements.gotoRev1Btn.textContent = `보충 영상 보기 (${
          state.currentRevVideoIndex + 1
        }/${revUrls.length})`;
      } else {
        elements.gotoRev1Btn.style.display = "none"; // 보충 영상 버튼 숨김
        elements.startQuizBtn.style.display = "block"; // 퀴즈 시작 버튼 표시
      }
    } else { // 영상 2 보충 (결과 화면)
      // 성공/실패 여부에 따라 다른 버튼과 iframe 참조
      const button = isSuccess ? elements.showRev2BtnSuccess : elements.showRev2BtnFailure;
      const iframe = isSuccess ? elements.reviewVideo2Iframe : elements.video2Iframe;

      if (iframe) {
        iframe.src = url; // iframe 소스 변경
        iframe.style.display = "block";
      } else {
        console.error(`결과 화면의 iframe 요소를 찾을 수 없습니다 (isSuccess: ${isSuccess})`); return;
      }
      state.currentRevVideoIndex++; // 다음 보충 영상 인덱스로 증가

      // 버튼 텍스트 업데이트 또는 숨김
      if (button) { // 버튼 요소가 존재하는지 확인
          if (state.currentRevVideoIndex < revUrls.length) {
              button.textContent = `보충 풀이 보기 (${state.currentRevVideoIndex + 1}/${revUrls.length})`;
          } else {
              button.style.display = "none"; // 모든 보충 영상 시청 완료
          }
      }
    }
  },

  // 퀴즈 시작 함수
  startQuiz() {
    // 현재 활성화된 학습 정보가 없으면 중단
    if (!this.app.state.activeLesson) {
      console.error("[studentLesson.js] startQuiz called but activeLesson is null.");
      this.app.showLessonSelectionScreen(); // 학습 선택 화면으로 이동
      return;
    }

    this.updateStudentProgress("퀴즈 푸는 중"); // Firestore에 진행 상태 업데이트
    this.app.state.currentQuestionIndex = 0; // 질문 인덱스 초기화
    this.app.state.score = 0; // 점수 초기화

    // Firestore에서 가져온 문제 은행 배열 확인
    const questionBank = Array.isArray(this.app.state.activeLesson.questionBank)
      ? this.app.state.activeLesson.questionBank
      : [];

    // 문제 은행이 비어있으면 중단
    if (questionBank.length === 0) {
      showToast("퀴즈 문항이 없습니다. 관리자에게 문의하세요.");
      this.app.showLessonSelectionScreen(); // 학습 선택 화면으로 이동
      return;
    }

    // 문제 은행 복사본을 만들어 무작위로 섞음
    const shuffledBank = [...questionBank].sort(() => 0.5 - Math.random());
    // 설정된 문제 수만큼 잘라서 실제 퀴즈 문항으로 사용
    this.app.state.quizQuestions = shuffledBank.slice(
      0,
      this.app.state.totalQuizQuestions
    );
    console.log(`[studentLesson.js] Starting quiz with ${this.app.state.quizQuestions.length} questions.`);

    // 퀴즈 화면 UI 업데이트 및 표시
    this.updateScoreDisplay(); // 점수 표시 업데이트 (0점)
    this.app.showScreen(this.app.elements.quizScreen); // 퀴즈 화면 표시
    this.displayQuestion(); // 첫 번째 질문 표시
  },

  // 현재 질문 표시 함수
  displayQuestion() {
    const { quizQuestions, currentQuestionIndex } = this.app.state;

    // 모든 문제를 다 풀었으면 결과 화면 표시
    if (currentQuestionIndex >= quizQuestions.length) {
      console.log("[studentLesson.js] All questions answered. Showing results.");
      this.showResults();
      return;
    }

    const question = quizQuestions[currentQuestionIndex]; // 현재 질문 객체 가져오기

    // 현재 인덱스에 해당하는 질문 객체가 없으면 오류 처리 후 결과 화면 표시
    if (!question) {
        console.error(`[studentLesson.js] Question at index ${currentQuestionIndex} is undefined.`);
        this.showResults();
        return;
    }

    // 진행률 업데이트 (예: "문제 1 / 5")
    this.updateProgress();

    // 질문 텍스트 표시 (질문 없으면 대체 텍스트)
    this.app.elements.questionText.textContent = question.question || "[질문 텍스트 없음]";

    // 선택지 컨테이너 초기화
    this.app.elements.optionsContainer.innerHTML = "";

    // 선택지 배열 확인
    const options = Array.isArray(question.options) ? question.options : [];

    // 선택지가 없는 경우 처리
    if (options.length === 0) {
      console.warn(`[studentLesson.js] Question ${currentQuestionIndex + 1} has no options.`);
      showToast("선택지가 없는 문제가 있습니다. 다음 문제로 넘어갑니다.", true);
      // 잠시 후 자동으로 다음 문제 표시
      setTimeout(() => {
        this.app.state.currentQuestionIndex++;
        this.displayQuestion();
      }, 1500);
      return;
    }

    // 선택지 버튼 생성 (선택지 순서 무작위 섞기)
    [...options].sort(() => 0.5 - Math.random()).forEach((option) => {
      const button = document.createElement("button");
      button.textContent = option; // 버튼 텍스트 설정
      button.className =
        "option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100"; // 스타일 클래스
      button.onclick = (e) => this.selectAnswer(e); // 클릭 이벤트 핸들러 연결
      this.app.elements.optionsContainer.appendChild(button); // 컨테이너에 버튼 추가
    });
    // console.log(`[studentLesson.js] Displaying question ${currentQuestionIndex + 1}:`, question.question); // 필요 시 로그 활성화
  },

  // 답안 선택 시 처리 함수
  selectAnswer(e) {
    // 여러 번 클릭 방지 위해 선택지 비활성화
    this.app.elements.optionsContainer.classList.add("disabled");

    const selectedButton = e.target; // 클릭된 버튼 요소
    const selectedAnswerText = selectedButton.textContent; // 선택한 답 텍스트
    const currentQuestion = this.app.state.quizQuestions[this.app.state.currentQuestionIndex]; // 현재 질문 객체
    const correctAnswerText = currentQuestion.answer; // 정답 텍스트

    // console.log(`[studentLesson.js] Question ${this.app.state.currentQuestionIndex + 1}: Selected='${selectedAnswerText}', Correct='${correctAnswerText}'`); // 필요 시 로그 활성화

    // 정답/오답 확인 및 시각적 피드백
    if (selectedAnswerText === correctAnswerText) {
      this.app.state.score++; // 점수 증가
      selectedButton.classList.add("correct"); // 초록색으로 표시
      // console.log("[studentLesson.js] Correct answer!"); // 필요 시 로그 활성화
    } else {
      selectedButton.classList.add("incorrect"); // 빨간색으로 표시
      // 오답 선택 시 정답 버튼을 찾아 초록색으로 표시
      Array.from(this.app.elements.optionsContainer.children).forEach((btn) => {
        if (btn.textContent === correctAnswerText) {
            btn.classList.add("correct");
        }
      });
      // console.log("[studentLesson.js] Incorrect answer."); // 필요 시 로그 활성화
    }

    // 점수 표시 업데이트
    this.updateScoreDisplay();

    // 잠시 후 다음 문제로 넘어감
    setTimeout(() => {
      this.app.elements.optionsContainer.classList.remove("disabled"); // 선택지 다시 활성화
      this.app.state.currentQuestionIndex++; // 다음 질문 인덱스로 이동
      this.displayQuestion(); // 다음 질문 표시
    }, 1500); // 1.5초 지연
  },

  // 퀴즈 결과 표시 함수 (이전 답변 내용 유지)
  showResults() {
    const { score, passScore, totalQuizQuestions, activeLesson } = this.app.state;

    // activeLesson 없으면 오류 처리
    if (!activeLesson) {
        console.error("[studentLesson.js] showResults called but activeLesson is null.");
        this.app.showLessonSelectionScreen(); // 학습 선택 화면으로 이동
        return;
    }

    this.app.state.currentRevVideoIndex = 0; // 보충 영상 인덱스 초기화

    const pass = score >= passScore; // 통과 여부 확인
    const status = pass ? "퀴즈 통과 (완료)" : "퀴즈 실패"; // Firestore에 저장할 상태 텍스트
    console.log(`[studentLesson.js] Quiz finished. Score: ${score}/${totalQuizQuestions}. Pass: ${pass}`);

    this.updateStudentProgress(status, score); // Firestore에 최종 결과 업데이트

    // 화면 전환 먼저
    this.app.showScreen(this.app.elements.resultScreen); // 결과 화면 표시
    console.log("[studentLesson.js] Switched to resultScreen.");

    // 결과 텍스트 설정
    const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
    // 영상 2 보충 영상 URL 배열 확인
    const revUrls = Array.isArray(activeLesson.video2RevUrls) ? activeLesson.video2RevUrls : [];
    const hasRevUrls = revUrls.length > 0;
    // 영상 2 Embed URL 변환
    const video2EmbedUrl = this.convertYoutubeUrlToEmbed(activeLesson.video2Url);

    // iframe 참조 및 src 설정 (화면 전환 후)
    let targetIframe = null; // 대상 iframe 참조 변수

    // 통과/실패에 따라 다른 메시지와 버튼 표시
    if (pass) { // 통과 시
      this.app.elements.successMessage.style.display = "block"; // 성공 메시지 표시
      this.app.elements.failureMessage.style.display = "none";  // 실패 메시지 숨김
      this.app.elements.resultScoreTextSuccess.textContent = scoreText; // 점수 텍스트

      targetIframe = this.app.elements.reviewVideo2Iframe; // 성공 시 iframe
      console.log("[studentLesson.js] Target iframe is reviewVideo2Iframe.");

      // 영상 2 보충 영상 버튼 표시 (성공 화면용)
      if (this.app.elements.showRev2BtnSuccess) {
        this.app.elements.showRev2BtnSuccess.style.display = hasRevUrls ? "block" : "none";
        if (hasRevUrls) this.app.elements.showRev2BtnSuccess.textContent = `보충 풀이 보기 (1/${revUrls.length})`;
      }

    } else { // 실패 시
      this.app.elements.successMessage.style.display = "none";  // 성공 메시지 숨김
      this.app.elements.failureMessage.style.display = "block"; // 실패 메시지 표시
      this.app.elements.resultScoreTextFailure.textContent = scoreText; // 점수 텍스트

      targetIframe = this.app.elements.video2Iframe; // 실패 시 iframe
      console.log("[studentLesson.js] Target iframe is video2Iframe.");

      // 영상 2 보충 영상 버튼 표시 (실패 화면용)
      if (this.app.elements.showRev2BtnFailure) {
        this.app.elements.showRev2BtnFailure.style.display = hasRevUrls ? "block" : "none";
        if (hasRevUrls) this.app.elements.showRev2BtnFailure.textContent = `보충 풀이 보기 (1/${revUrls.length})`;
      }
    }

    // 영상 2 URL 및 iframe 요소 유효성 검사 후 src 설정
    if (!video2EmbedUrl) {
      console.error("[studentLesson.js] video2Url is invalid:", activeLesson.video2Url);
      if (targetIframe) targetIframe.style.display = 'none'; // 유효하지 않으면 숨김
      // 관련 보충 버튼도 숨김
      if (this.app.elements.showRev2BtnSuccess) this.app.elements.showRev2BtnSuccess.style.display = 'none';
      if (this.app.elements.showRev2BtnFailure) this.app.elements.showRev2BtnFailure.style.display = 'none';

    } else if (!targetIframe) {
      console.error(`[studentLesson.js] Target iframe element (${pass ? 'reviewVideo2Iframe' : 'video2Iframe'}) not found.`);
      showToast("결과 영상 플레이어 요소를 찾을 수 없습니다.", true);

    } else {
      // 직접 src 설정 및 display: block 처리
      console.log(`[studentLesson.js] Setting target iframe (${targetIframe.id}) src:`, video2EmbedUrl);
      try {
        targetIframe.src = video2EmbedUrl;
        targetIframe.style.display = 'block'; // 즉시 표시 시도
        console.log(`[studentLesson.js] Set target iframe (${targetIframe.id}) display to 'block'.`);

        targetIframe.onload = () => console.log(`[studentLesson.js] Target iframe (${targetIframe.id}) loaded successfully.`);
        targetIframe.onerror = (e) => console.error(`[studentLesson.js] Target iframe (${targetIframe.id}) failed to load:`, e);
      } catch (error) {
          console.error(`[studentLesson.js] Error setting target iframe (${targetIframe.id}) src or display:`, error);
          showToast("결과 영상 설정 중 오류 발생", true);
          targetIframe.style.display = 'none'; // 오류 시 숨김
      }
    }
  },

  // 결과 화면에서 영상 1 다시보기
  rewatchVideo1() {
    if (!this.app.state.activeLesson) return; // activeLesson 없으면 중단
    const embedUrl = this.convertYoutubeUrlToEmbed(this.app.state.activeLesson.video1Url); // 영상 1 Embed URL

    // 성공 화면의 영상 2 iframe(reviewVideo2Iframe)에 영상 1 URL 설정
    const iframe = this.app.elements.reviewVideo2Iframe;
    if (embedUrl && iframe) {
      console.log("[studentLesson.js] Rewatching video 1 in reviewVideo2Iframe:", embedUrl);
      iframe.src = embedUrl;
      iframe.style.display = "block";
    } else if (!iframe) {
        console.error("[studentLesson.js] reviewVideo2Iframe element not found for rewatch.");
    } else {
        console.error("[studentLesson.js] Failed to get embedUrl for rewatching video 1.");
    }
  },

  // Firestore에 학생 학습 진행 상황 업데이트/저장
  async updateStudentProgress(status, score = null) {
    const { activeLesson, authUid, selectedSubject, studentName, totalQuizQuestions } = this.app.state;

    // 필요한 정보 (학습 ID, 인증 ID, 과목 ID) 없으면 오류 로그 남기고 중단
    if (!activeLesson?.id || !authUid || !selectedSubject?.id) {
      console.warn("[studentLesson.js] Failed to update progress: Missing required info.", {
          lessonId: activeLesson?.id,
          authUid: authUid,
          subjectId: selectedSubject?.id
      });
      showToast("학습 기록 저장에 필요한 정보가 부족합니다.", true);
      return;
    }

    // Firestore 문서 경로 설정 (subjects/{과목ID}/lessons/{학습ID}/submissions/{학생AuthID})
    const submissionRef = doc(
      db, "subjects", selectedSubject.id, "lessons", activeLesson.id, "submissions", authUid
    );

    // 저장할 데이터 객체 구성
    const data = {
      studentName: studentName || "익명", // 학생 이름
      status: status,                     // 현재 상태 (예: "퀴즈 통과 (완료)")
      lastAttemptAt: serverTimestamp(),  // 서버 시간 기준 마지막 활동 시간
    };

    // 점수 정보가 있으면 추가
    if (score !== null) {
      data.score = score;                 // 맞힌 문제 수
      data.totalQuestions = totalQuizQuestions; // 전체 문제 수
    }
    // console.log("[studentLesson.js] Preparing to update progress data:", data, "to path:", submissionRef.path); // 필요 시 로그 활성화

    // Firestore에 데이터 쓰기 (setDoc + merge: 문서 없으면 생성, 있으면 병합)
    try {
      await setDoc(submissionRef, data, { merge: true });
      // console.log("[studentLesson.js] Student progress updated successfully in Firestore."); // 필요 시 로그 활성화
    } catch (error) {
      console.error("[studentLesson.js] Firestore write error while updating progress:", error);
      showToast("학습 기록 저장 중 오류가 발생했습니다.");
    }
  },

  // 퀴즈 화면 상단 점수 표시 업데이트
  updateScoreDisplay() {
    if (this.app.elements.scoreText) {
        this.app.elements.scoreText.textContent = `점수: ${this.app.state.score}`;
    } else {
        console.warn("[studentLesson.js] scoreText element not found.");
    }
  },

  // 퀴즈 화면 상단 진행률 표시 업데이트
  updateProgress() {
    const { currentQuestionIndex, totalQuizQuestions } = this.app.state;
    // 진행률 계산 (0으로 나누기 방지)
    const progressPercent = totalQuizQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuizQuestions) * 100 : 0;

    // 진행률 텍스트 업데이트 (예: "문제 1 / 5")
    if (this.app.elements.progressText) {
      this.app.elements.progressText.textContent = `문제 ${currentQuestionIndex + 1} / ${totalQuizQuestions}`;
    } else {
        console.warn("[studentLesson.js] progressText element not found.");
    }
    // 진행률 막대 너비 업데이트
    if (this.app.elements.progressBar) {
      this.app.elements.progressBar.style.width = `${progressPercent}%`;
    } else {
        console.warn("[studentLesson.js] progressBar element not found.");
    }
  },
}; // studentLesson 객체 끝