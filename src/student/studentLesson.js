// src/student/studentLesson.js

import { collection, getDocs, query, orderBy, doc, setDoc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js"; 

// YouTube API 로드 (오류 방지를 위해 상단 선언 필수)
let isYouTubeApiReady = false;
if (!window.YT) {
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => { isYouTubeApiReady = true; };
} else {
    isYouTubeApiReady = true;
}

export const studentLesson = {
    app: null,
    player: null,     
    player2: null,    
    watchTimer: null,
    saveTimer: null, // DB 저장용 타이머
    
    trickClickCount: 0,
    lastClickTime: 0,

    state: {
        lessons: [],
        currentLesson: null,
        allQuestions: [],      
        selectedQuestions: [], 
        currentQuestionIndex: 0,
        score: 0,
        videoDuration: 0,
        watchedSeconds: 0,
        isVideoCompleted: false,
    },

    elements: {
        lessonGrid: 'student-lesson-grid',
        videoScreen: 'student-video1-screen',
        videoTitle: 'student-video1-title',
        videoIframe: 'student-video1-iframe',
        msgContainer: 'video-msg-container', 
        startQuizBtn: 'startQuizBtn',
        gotoRevBtn: 'gotoRev1Btn',
        quizScreen: 'student-quiz-screen',
        progressBar: 'student-quiz-progress-bar',
        progressText: 'student-quiz-progress-text',
        questionText: 'student-quiz-question-text',
        optionsContainer: 'student-quiz-options-container',
        resultScreen: 'student-result-screen',
        successMsg: 'student-result-success-msg',
        failureMsg: 'student-result-failure-msg',
        scoreTextSuccess: 'student-result-score-text-success',
        scoreTextFailure: 'student-result-score-text-failure',
        retryBtn: 'student-retry-quiz-btn',
        rewatchBtn: 'student-rewatch-video1-btn',
        reviewVideoContainer: 'student-review-video2-container',
        reviewVideoIframe: 'student-review-video2-iframe',
        backFromResBtn: 'student-back-to-lessons-from-result-btn',
    },

    init(app) {
        this.app = app;
        document.getElementById(this.elements.retryBtn)?.addEventListener('click', () => this.startQuiz());
        document.getElementById(this.elements.rewatchBtn)?.addEventListener('click', () => {
            this.app.showScreen(this.elements.videoScreen);
        });
        document.getElementById(this.elements.startQuizBtn)?.addEventListener('click', () => this.startQuiz());
        document.getElementById(this.elements.backFromResBtn)?.addEventListener('click', () => this.app.exitVideoScreen());
    },

    async loadLessons(subjectId) {
        const grid = document.getElementById(this.elements.lessonGrid);
        if(!grid) return;
        grid.innerHTML = '<div class="col-span-full text-center py-10">로딩 중...</div>';

        try {
            const q = query(collection(db, `subjects/${subjectId}/lessons`), orderBy('order'));
            const snap = await getDocs(q);
            this.state.lessons = snap.docs.map(d => ({id: d.id, ...d.data()}));
            this.renderLessonGrid();
        } catch(e) {
            console.error(e);
            grid.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">로딩 실패</div>';
        }
    },

    renderLessonGrid() {
        const grid = document.getElementById(this.elements.lessonGrid);
        grid.innerHTML = '';
        
        if(this.state.lessons.length === 0) {
            grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-400">등록된 강의가 없습니다.</div>';
            return;
        }

        this.state.lessons.forEach(lesson => {
            if (lesson.isActive === false) return; 

            const div = document.createElement('div');
            div.className = "bg-white p-5 rounded-2xl border border-slate-100 shadow-sm active:scale-95 transition cursor-pointer flex flex-col gap-3";
            div.innerHTML = `
                <div class="flex items-center gap-3 mb-1">
                    <span class="bg-indigo-100 text-indigo-600 text-xs font-bold px-2 py-1 rounded">LESSON</span>
                    <h3 class="font-bold text-slate-800 text-lg line-clamp-1">${lesson.title}</h3>
                </div>
                <div class="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                    <div class="h-full bg-indigo-500 w-0"></div>
                </div>`;
            div.onclick = () => this.playLesson(lesson);
            grid.appendChild(div);
        });
    },

    async playLesson(lesson) {
        this.state.currentLesson = lesson;
        this.state.watchedSeconds = 0;
        this.state.videoDuration = 0;
        this.state.isVideoCompleted = false;
        this.state.trickClickCount = 0;

        if (this.watchTimer) clearInterval(this.watchTimer);
        if (this.saveTimer) clearInterval(this.saveTimer);

        // UI 초기화
        const titleEl = document.getElementById(this.elements.videoTitle);
        const quizBtn = document.getElementById(this.elements.startQuizBtn);
        const revBtn = document.getElementById(this.elements.gotoRevBtn);

        if(titleEl) titleEl.textContent = lesson.title;
        if(quizBtn) quizBtn.classList.add('hidden');
        if(revBtn) revBtn.style.display = 'none';

        // 1. DB에서 기존 기록 조회
        try {
            const studentId = this.app.state.studentDocId;
            const subjectId = this.app.state.selectedSubject.id;
            const docRef = doc(db, "subjects", subjectId, "lessons", lesson.id, "submissions", studentId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                
                // 자기주도반 & 퀴즈 통과 시 분기 처리
                if (data.status === 'completed') {
                    const classType = this.app.state.classType || 'live-lecture';
                    
                    if (classType === 'self-directed') {
                        if (confirm("이미 퀴즈를 통과했습니다.\n[확인] -> 2번 영상(다음 진도) 보기\n[취소] -> 1번 영상(복습) 다시 보기")) {
                            
                            this.prepareQuiz(lesson); 
                            
                            // [수정] 2000점 오류 해결: 총 문제 수(5)를 기준으로 맞은 개수 환산
                            const questionCount = Math.min(5, this.state.allQuestions.length) || 5;
                            this.state.selectedQuestions = this.state.allQuestions.slice(0, questionCount);
                            
                            // DB에는 100(점)이 저장되어 있음 -> 이를 맞은 개수(5)로 변환
                            const savedPercentage = data.score !== undefined ? Number(data.score) : 100;
                            this.state.score = Math.round((savedPercentage / 100) * questionCount); 
                            
                            this.finishQuiz(true); // forceShowResult = true
                            return; 
                        }
                    } else {
                        if(!confirm("이미 학습을 완료했습니다. 다시 학습하시겠습니까?")) {
                            return;
                        }
                    }
                }

                // 시청 시간 복구
                if (data.watchedSeconds) {
                    this.state.watchedSeconds = data.watchedSeconds;
                    console.log(`기존 시청 시간 복구: ${this.state.watchedSeconds}초`);
                }
            }
        } catch(e) {
            console.error("기록 불러오기 실패:", e);
        }

        this.app.showScreen(this.elements.videoScreen);
        this.prepareQuiz(lesson);
        this.renderStatusMessage();
        this.loadVideo(lesson.video1Url);
    },

    renderStatusMessage() {
        const container = document.getElementById(this.elements.msgContainer);
        if (!container) return;

        container.innerHTML = '';
        const msg = document.createElement('div');
        msg.id = 'trick-msg-box';
        msg.className = "w-full text-center p-4 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-700 font-bold cursor-pointer select-none transition hover:bg-gray-200";
        msg.textContent = "⏳ 누적 시청 시간: 0% (진행 중)";
        
        msg.addEventListener('click', () => {
            const now = Date.now();
            if (now - this.lastClickTime < 500) this.trickClickCount++; 
            else this.trickClickCount = 1;
            this.lastClickTime = now;
            if (this.trickClickCount >= 5) {
                this.completeVideo();
                this.trickClickCount = 0;
            }
        });
        container.appendChild(msg);
        
        if(this.state.watchedSeconds > 0 && this.state.videoDuration > 0) {
             this.updateProgress();
        }
    },

    updateStatusMessageText(text, isComplete = false) {
        const msg = document.getElementById('trick-msg-box');
        if (!msg) return;
        msg.innerHTML = text;
        if (isComplete) {
            msg.className = "w-full text-center p-4 bg-green-50 border-2 border-green-200 rounded-xl text-green-700 font-bold shadow-sm";
        } else {
            msg.className = "w-full text-center p-4 bg-gray-100 border-2 border-gray-300 rounded-xl text-gray-700 font-bold cursor-pointer select-none";
        }
    },

    loadVideo(url) {
        const videoId = this.extractVideoId(url);
        if (!videoId) return;

        if (!isYouTubeApiReady) {
            setTimeout(() => this.loadVideo(url), 500);
            return;
        }
        const origin = window.location.origin;

        if (this.player) { try { this.player.destroy(); } catch(e){} this.player = null; }
        if (this.player2) { try { this.player2.destroy(); } catch(e){} this.player2 = null; }

        this.player = new YT.Player(this.elements.videoIframe, {
            height: '100%',
            width: '100%',
            videoId: videoId,
            host: 'https://www.youtube.com',
            playerVars: { 
                'playsinline': 1, 
                'rel': 0, 
                'enablejsapi': 1, 
                'origin': origin 
            },
            events: {
                'onReady': (event) => {
                    this.state.videoDuration = event.target.getDuration();
                    event.target.playVideo();
                    
                    if (this.state.watchedSeconds > 0) {
                        this.updateProgress();
                    }
                    
                    this.startWatchTimer();
                },
                'onStateChange': (event) => this.onPlayerStateChange(event)
            }
        });
    },

    stopVideo() {
        if (this.watchTimer) clearInterval(this.watchTimer);
        if (this.saveTimer) clearInterval(this.saveTimer);
        if (this.player && typeof this.player.stopVideo === 'function') try { this.player.stopVideo(); } catch(e) {}
        if (this.player2 && typeof this.player2.stopVideo === 'function') try { this.player2.stopVideo(); } catch(e) {}
    },

    startWatchTimer() {
        if (this.watchTimer) clearInterval(this.watchTimer);
        
        this.watchTimer = setInterval(() => {
            if (this.player && this.player.getPlayerState && this.player.getPlayerState() === YT.PlayerState.PLAYING) {
                this.state.watchedSeconds++;
                this.updateProgress();
            }
        }, 1000);

        if (this.saveTimer) clearInterval(this.saveTimer);
        this.saveTimer = setInterval(() => {
            this.saveWatchProgressToDB();
        }, 10000); // 10초마다 저장
    },

    async saveWatchProgressToDB() {
        if (this.state.isVideoCompleted) return; 

        try {
            const studentId = this.app.state.studentDocId;
            const subjectId = this.app.state.selectedSubject.id;
            const lessonId = this.state.currentLesson.id;
            
            const docRef = doc(db, "subjects", subjectId, "lessons", lessonId, "submissions", studentId);
            
            await setDoc(docRef, {
                watchedSeconds: this.state.watchedSeconds,
                lastWatchUpdate: serverTimestamp(),
                studentId: studentId, 
                studentName: this.app.state.studentName
            }, { merge: true });
            
        } catch (e) {
            console.warn("시청 시간 저장 실패(네트워크 등):", e);
        }
    },

    onPlayerStateChange(event) {
        if (event.data === YT.PlayerState.ENDED) {
            this.checkCompletion();
            this.saveWatchProgressToDB(); 
        }
        if (event.data === YT.PlayerState.PAUSED) {
            this.saveWatchProgressToDB(); 
        }
    },

    updateProgress() {
        if (!this.state.videoDuration) return;
        if (this.state.isVideoCompleted) return;
        const percent = Math.min(100, Math.round((this.state.watchedSeconds / this.state.videoDuration) * 100));
        this.updateStatusMessageText(`⏳ 누적 시청 시간: ${percent}%`);
    },

    checkCompletion() {
        if (this.state.isVideoCompleted) return;
        if (!this.state.videoDuration) return;
        const percent = (this.state.watchedSeconds / this.state.videoDuration) * 100;
        
        if (percent >= 60) {
            this.completeVideo();
        } else {
            const msg = document.getElementById('trick-msg-box');
            if(msg) {
                msg.innerHTML = `⚠️ 시청 시간 부족 (${Math.round(percent)}% / 60%)<br>영상을 끝까지 시청해주세요.`;
                msg.className = "w-full text-center p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-600 font-bold cursor-pointer select-none";
            }
        }
    },

    completeVideo() {
        this.state.isVideoCompleted = true;
        if(this.watchTimer) clearInterval(this.watchTimer);
        this.saveWatchProgressToDB(); 
        
        this.updateStatusMessageText("✅ 영상 학습 완료! 아래 퀴즈를 풀어보세요.", true);
        const quizBtn = document.getElementById(this.elements.startQuizBtn);
        if(quizBtn) {
            quizBtn.style.display = 'block';
            quizBtn.classList.remove('hidden');
            quizBtn.disabled = false;
        }
    },

    prepareQuiz(lesson) {
        let questions = [];
        try {
            if(lesson.questionBank) questions = lesson.questionBank;
            else if(lesson.quizJson) questions = JSON.parse(lesson.quizJson);
        } catch(e) { questions = []; }
        this.state.allQuestions = Array.isArray(questions) ? questions : [];
    },

    startQuiz() {
        const all = [...this.state.allQuestions];
        if (all.length === 0) {
            alert("등록된 문제가 없습니다.");
            return;
        }
        for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
        }
        this.state.selectedQuestions = all.slice(0, 5);
        this.state.currentQuestionIndex = 0;
        this.state.score = 0;
        this.stopVideo(); 
        this.app.showScreen(this.elements.quizScreen);
        this.renderQuestion();
    },

    renderQuestion() {
        const q = this.state.selectedQuestions[this.state.currentQuestionIndex];
        const total = this.state.selectedQuestions.length;
        const progressText = document.getElementById(this.elements.progressText);
        const progressBar = document.getElementById(this.elements.progressBar);
        const qText = document.getElementById(this.elements.questionText);
        const optContainer = document.getElementById(this.elements.optionsContainer);

        if(progressText) progressText.textContent = `문제 ${this.state.currentQuestionIndex + 1} / ${total}`;
        if(progressBar) progressBar.style.width = `${((this.state.currentQuestionIndex) / total) * 100}%`;
        if(qText) qText.innerHTML = q.question;
        
        if(optContainer) {
            optContainer.innerHTML = '';
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = "w-full p-4 text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-xl transition font-medium text-slate-700 active:scale-95 duration-200";
                btn.innerHTML = opt;
                btn.onclick = () => this.handleAnswer(idx + 1);
                optContainer.appendChild(btn);
            });
        }
        if (window.MathJax && window.MathJax.typesetPromise) {
            const screen = document.getElementById(this.elements.quizScreen);
            if(screen) window.MathJax.typesetPromise([screen]).catch(()=>{});
        }
    },

    handleAnswer(selectedIdx) {
        const currentQ = this.state.selectedQuestions[this.state.currentQuestionIndex];
        const userSelect = String(selectedIdx).trim();
        const dbAnswer = String(currentQ.answer).trim();
        let isCorrect = false;

        if (userSelect === dbAnswer) isCorrect = true;
        else if (currentQ.options && currentQ.options[selectedIdx - 1]) {
            const selectedText = String(currentQ.options[selectedIdx - 1]).trim();
            if (selectedText === dbAnswer) isCorrect = true;
        }

        if (isCorrect) this.state.score++;
        this.state.currentQuestionIndex++;
        if (this.state.currentQuestionIndex < this.state.selectedQuestions.length) {
            this.renderQuestion();
        } else {
            this.finishQuiz();
        }
    },

    async finishQuiz(forceShowResult = false) {
        const total = this.state.selectedQuestions.length || 5; 
        const score = this.state.score;
        const percentage = Math.round((score / total) * 100);
        const isPass = forceShowResult ? true : (score >= (total >= 5 ? 4 : Math.ceil(total * 0.8)));

        this.app.showScreen(this.elements.resultScreen);
        const successDiv = document.getElementById(this.elements.successMsg);
        const failDiv = document.getElementById(this.elements.failureMsg);
        const revContainer = document.getElementById(this.elements.reviewVideoContainer);
        const exitBtn = document.getElementById(this.elements.backFromResBtn);

        revContainer.classList.add('hidden');
        revContainer.style.display = 'none';
        
        if (isPass) {
            successDiv.style.display = 'block';
            failDiv.style.display = 'none';
            document.getElementById(this.elements.scoreTextSuccess).textContent = `${score} / ${total} 문제 정답 (${percentage}점)`;
            
            const classType = this.app.state.classType || 'live-lecture'; 
            const lesson = this.state.currentLesson;
            const origin = window.location.origin;

            if (classType === 'self-directed' && (lesson.video2Url || (lesson.video2List && lesson.video2List.length > 0))) {
                revContainer.classList.remove('hidden');
                revContainer.style.display = 'block';
                
                const v2Url = lesson.video2Url || (lesson.video2List ? lesson.video2List[0].url : '');
                const vid = this.extractVideoId(v2Url);
                
                if (window.YT && vid) {
                     if(this.player2) { try{ this.player2.destroy(); }catch(e){} }
                     this.player2 = new YT.Player(this.elements.reviewVideoIframe, {
                        height: '100%',
                        width: '100%',
                        videoId: vid,
                        host: 'https://www.youtube.com',
                        playerVars: { 
                            'playsinline': 1, 
                            'rel': 0,
                            'origin': origin 
                        },
                    });
                }
                if(exitBtn) exitBtn.textContent = "학습 완료 및 목록으로";

            } else {
                if(exitBtn) exitBtn.textContent = "목록으로 나가기";
            }
            
            if (!forceShowResult) {
                await this.saveResult('completed', percentage);
            }
        } else {
            successDiv.style.display = 'none';
            failDiv.style.display = 'block';
            document.getElementById(this.elements.scoreTextFailure).textContent = `${score} / ${total} 문제 정답 (${percentage}점)`;
            await this.saveResult('failed', percentage);
        }
    },

    async saveResult(status, score) {
        try {
            const sid = this.app.state.studentDocId;
            const subId = this.app.state.selectedSubject.id;
            const lid = this.state.currentLesson.id;
            await setDoc(doc(db, "subjects", subId, "lessons", lid, "submissions", sid), {
                studentId: sid,
                studentName: this.app.state.studentName,
                status: status,
                score: score,
                watchedSeconds: this.state.watchedSeconds, 
                lastAttemptAt: serverTimestamp()
            }, { merge: true });
        } catch(e) { console.error(e); }
    },

    extractVideoId(url) {
        if (!url) return null;
        let videoId = '';
        if (url.includes('youtu.be/')) videoId = url.split('youtu.be/')[1]?.split('?')[0];
        else if (url.includes('youtube.com/watch')) videoId = new URL(url).searchParams.get('v');
        else if (url.includes('youtube.com/embed/')) videoId = url.split('embed/')[1]?.split('?')[0];
        return videoId;
    }
};