// src/student/studentLesson.js

import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentLesson = {
  init(app) {
    this.app = app;

    this.app.elements.gotoRev1Btn?.addEventListener("click", () =>
      this.showNextRevisionVideo(1)
    );
    this.app.elements.startQuizBtn?.addEventListener("click", () =>
      this.startQuiz()
    );
    this.app.elements.retryQuizBtn?.addEventListener("click", () =>
      this.startQuiz()
    );
    this.app.elements.rewatchVideo1Btn?.addEventListener("click", () =>
      this.rewatchVideo1()
    );
    this.app.elements.showRev2BtnSuccess?.addEventListener("click", () =>
      this.showNextRevisionVideo(2, true)
    );
    this.app.elements.showRev2BtnFailure?.addEventListener("click", () =>
      this.showNextRevisionVideo(2, false)
    );
  },

  convertYoutubeUrlToEmbed(url) {
    if (!url || typeof url !== "string") return "";

    url = url.trim();
    let videoId = null;
    let startTime = 0;
    let tempUrl = url;

    if (!tempUrl.startsWith("http://") && !tempUrl.startsWith("https://")) {
      tempUrl = "https://" + tempUrl;
    }

    const regex =
      /(?:youtu\.be\/|v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})(?:[?&]|$)/;
    const match = tempUrl.match(regex);
    if (match) videoId = match[1];

    if (!videoId || videoId.length !== 11) return "";

    try {
      const urlObj = new URL(tempUrl);
      const tParam = urlObj.searchParams.get("t");
      if (tParam) {
        const secondsMatch = tParam.match(/^(\d+)/);
        if (secondsMatch) startTime = parseInt(secondsMatch[1], 10);
      }
    } catch (e) {
      console.error("URL 파싱 오류:", e);
    }

    let embedUrl = `https://www.youtube.com/embed/${videoId}`;
    if (startTime > 0) embedUrl += `?start=${startTime}`;
    return embedUrl;
  },

  // ✅ 영상 시작 시 iframe이 자동으로 생성되도록 수정
  startSelectedLesson(lesson) {
    this.app.state.activeLesson = lesson;
    this.app.state.currentRevVideoIndex = 0;

    const originalUrl = this.app.state.activeLesson.video1Url;
    const embedUrl = this.convertYoutubeUrlToEmbed(originalUrl);

    console.log("-----------------------------------------");
    console.log("디버깅: 선택된 학습 영상 정보 확인");
    console.log("1. Firestore에 저장된 원본 URL:", originalUrl);
    console.log("2. 변환된 임베드 URL (iframe src):", embedUrl);
    console.log("-----------------------------------------");

    if (!embedUrl) {
      showToast(
        "비디오 URL이 올바르지 않거나 Firestore에 저장된 값이 비어 있습니다.",
        true
      );
      return;
    }

    this.app.elements.video1Title.textContent =
      this.app.state.activeLesson.title;

    // ✅ iframe이 없으면 자동으로 생성
    let iframe = this.app.elements.video1Iframe;
    if (!iframe) {
      iframe = document.createElement("iframe");
      iframe.id = "video1Iframe";
      iframe.width = "100%";
      iframe.height = "360";
      iframe.frameBorder = "0";
      iframe.allow =
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.style.display = "block";

      // video1Screen이 있으면 그 안에 삽입
      const container = this.app.elements.video1Screen || document.body;
      container.appendChild(iframe);
      this.app.elements.video1Iframe = iframe;
    }

    iframe.src = embedUrl;
    iframe.style.display = "block";

    const revUrls = this.app.state.activeLesson.video1RevUrls;
    if (revUrls && revUrls.length > 0) {
      this.app.elements.gotoRev1Btn.style.display = "block";
      this.app.elements.gotoRev1Btn.textContent = `보충 영상 보기 (1/${revUrls.length})`;
      this.app.elements.startQuizBtn.style.display = "none";
    } else {
      this.app.elements.gotoRev1Btn.style.display = "none";
      this.app.elements.startQuizBtn.style.display = "block";
    }

    this.app.showScreen(this.app.elements.video1Screen);
  },

  showNextRevisionVideo(type, isSuccess = null) {
    const { state, elements } = this.app;
    const revUrls =
      type === 1 ? state.activeLesson.video1RevUrls : state.activeLesson.video2RevUrls;

    if (!revUrls || revUrls.length === 0) return;

    const currentIndex = state.currentRevVideoIndex;
    if (currentIndex >= revUrls.length) return;

    const url = this.convertYoutubeUrlToEmbed(revUrls[currentIndex]);
    if (!url) {
      showToast("비디오 URL이 올바르지 않습니다.");
      return;
    }

    const title = `${state.activeLesson.title} (보충 영상 ${
      currentIndex + 1
    }/${revUrls.length})`;

    if (type === 1) {
      elements.video1Title.textContent = title;

      // ✅ iframe이 없으면 자동 생성
      let iframe = elements.video1Iframe;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.id = "video1Iframe";
        iframe.width = "100%";
        iframe.height = "360";
        iframe.frameBorder = "0";
        iframe.allowFullscreen = true;
        elements.video1Screen.appendChild(iframe);
        elements.video1Iframe = iframe;
      }

      iframe.src = url;
      iframe.style.display = "block";
      state.currentRevVideoIndex++;

      if (state.currentRevVideoIndex < revUrls.length) {
        elements.gotoRev1Btn.textContent = `보충 영상 보기 (${
          state.currentRevVideoIndex + 1
        }/${revUrls.length})`;
      } else {
        elements.gotoRev1Btn.style.display = "none";
        elements.startQuizBtn.style.display = "block";
      }
    } else {
      const button = isSuccess
        ? elements.showRev2BtnSuccess
        : elements.showRev2BtnFailure;
      const iframe = isSuccess
        ? elements.reviewVideo2Iframe
        : elements.video2Iframe;

      if (iframe) {
        iframe.src = url;
        iframe.style.display = "block";
      }
      state.currentRevVideoIndex++;

      if (state.currentRevVideoIndex < revUrls.length) {
        button.textContent = `보충 풀이 보기 (1/${revUrls.length})`;
      } else {
        button.style.display = "none";
      }
    }
  },

  startQuiz() {
    if (!this.app.state.activeLesson) {
      console.error("activeLesson이 없습니다.");
      return;
    }

    this.updateStudentProgress("퀴즈 푸는 중");
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
    this.app.state.quizQuestions = shuffledBank.slice(
      0,
      this.app.state.totalQuizQuestions
    );

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
    this.app.elements.optionsContainer.innerHTML = "";

    const options = Array.isArray(question.options) ? question.options : [];

    if (options.length === 0) {
      console.warn(`Question ${currentQuestionIndex + 1} has no options.`);
      setTimeout(() => {
        this.app.state.currentQuestionIndex++;
        this.displayQuestion();
      }, 500);
      return;
    }

    [...options].sort(() => 0.5 - Math.random()).forEach((option) => {
      const button = document.createElement("button");
      button.textContent = option;
      button.className =
        "option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100";
      button.onclick = (e) => this.selectAnswer(e);
      this.app.elements.optionsContainer.appendChild(button);
    });
  },

  selectAnswer(e) {
    this.app.elements.optionsContainer.classList.add("disabled");
    const selected = e.target.textContent;
    const correct =
      this.app.state.quizQuestions[this.app.state.currentQuestionIndex].answer;

    if (selected === correct) {
      this.app.state.score++;
      e.target.classList.add("correct");
    } else {
      e.target.classList.add("incorrect");
      Array.from(this.app.elements.optionsContainer.children).forEach((btn) => {
        if (btn.textContent === correct) btn.classList.add("correct");
      });
    }

    this.updateScoreDisplay();
    setTimeout(() => {
      this.app.elements.optionsContainer.classList.remove("disabled");
      this.app.state.currentQuestionIndex++;
      this.displayQuestion();
    }, 1500);
  },

  showResults() {
    const { score, passScore, totalQuizQuestions, activeLesson } =
      this.app.state;
    this.app.state.currentRevVideoIndex = 0;

    const pass = score >= passScore;
    this.updateStudentProgress(
      pass ? "퀴즈 통과 (완료)" : "퀴즈 실패",
      score
    );
    this.app.showScreen(this.app.elements.resultScreen);

    const scoreText = `${totalQuizQuestions} 문제 중 ${score} 문제를 맞혔습니다.`;
    const revUrls = Array.isArray(activeLesson.video2RevUrls)
      ? activeLesson.video2RevUrls
      : [];

    const video2EmbedUrl = this.convertYoutubeUrlToEmbed(
      activeLesson.video2Url
    );

    if (!video2EmbedUrl) {
      console.error("video2Url이 올바르지 않습니다:", activeLesson.video2Url);
    }

    if (pass) {
      const button = this.app.elements.showRev2BtnSuccess;
      this.app.elements.successMessage.style.display = "block";
      this.app.elements.failureMessage.style.display = "none";
      this.app.elements.resultScoreTextSuccess.textContent = scoreText;

      if (video2EmbedUrl) {
        this.app.elements.reviewVideo2Iframe.src = video2EmbedUrl;
      }

      if (revUrls && revUrls.length > 0) {
        button.textContent = `보충 풀이 보기 (1/${revUrls.length})`;
        button.style.display = "block";
      } else {
        button.style.display = "none";
      }
    } else {
      const button = this.app.elements.showRev2BtnFailure;
      this.app.elements.successMessage.style.display = "none";
      this.app.elements.failureMessage.style.display = "block";
      this.app.elements.resultScoreTextFailure.textContent = scoreText;

      if (video2EmbedUrl) {
        this.app.elements.video2Iframe.src = video2EmbedUrl;
      }

      if (revUrls && revUrls.length > 0) {
        button.textContent = `보충 풀이 보기 (1/${revUrls.length})`;
        button.style.display = "block";
      } else {
        button.style.display = "none";
      }
    }
  },

  rewatchVideo1() {
    if (!this.app.state.activeLesson) return;

    const embedUrl = this.convertYoutubeUrlToEmbed(
      this.app.state.activeLesson.video1Url
    );
    if (embedUrl) {
      let iframe = this.app.elements.reviewVideo2Iframe;
      if (!iframe) {
        iframe = document.createElement("iframe");
        iframe.width = "100%";
        iframe.height = "360";
        iframe.frameBorder = "0";
        iframe.allowFullscreen = true;
        this.app.elements.resultScreen.appendChild(iframe);
        this.app.elements.reviewVideo2Iframe = iframe;
      }
      iframe.src = embedUrl;
      iframe.style.display = "block";
    }
  },

  async updateStudentProgress(status, score = null) {
    const { activeLesson, authUid, selectedSubject, studentName, totalQuizQuestions } =
      this.app.state;

    if (!activeLesson || !authUid || !selectedSubject) {
      console.warn("학습 진행 상황 업데이트 실패: 필요한 정보 부족");
      return;
    }

    const submissionRef = doc(
      db,
      "subjects",
      selectedSubject.id,
      "lessons",
      activeLesson.id,
      "submissions",
      authUid
    );

    const data = {
      studentName: studentName || "익명",
      status,
      lastAttemptAt: serverTimestamp(),
    };

    if (score !== null) {
      data.score = score;
      data.totalQuestions = totalQuizQuestions;
    }

    try {
      await setDoc(submissionRef, data, { merge: true });
      console.log("Student progress updated successfully:", status, score);
    } catch (error) {
      console.error("Firestore 쓰기 오류:", error);
      showToast("학습 기록 저장 중 오류가 발생했습니다.");
    }
  },

  updateScoreDisplay() {
    this.app.elements.scoreText.textContent = `점수: ${this.app.state.score}`;
  },

  updateProgress() {
    const { currentQuestionIndex, totalQuizQuestions } = this.app.state;
    const progress =
      totalQuizQuestions > 0
        ? ((currentQuestionIndex + 1) / totalQuizQuestions) * 100
        : 0;
    this.app.elements.progressText.textContent = `문제 ${
      currentQuestionIndex + 1
    } / ${totalQuizQuestions}`;
    this.app.elements.progressBar.style.width = `${progress}%`;
  },
};
