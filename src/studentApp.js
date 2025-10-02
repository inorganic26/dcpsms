import { collection, doc, getDocs, getDoc, setDoc, where, query, serverTimestamp, orderBy, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from './firebase.js';
import { showToast } from './utils.js';

const StudentApp = {
    isInitialized: false,
    elements: {},
    state: { 
        studentId: null, studentName: '', classId: null, 
        activeSubjects: [], selectedSubject: null, activeLesson: null, 
        currentQuestionIndex: 0, score: 0, quizQuestions: [], 
        passScore: 4, totalQuizQuestions: 5,
        currentHomeworkId: null, filesToUpload: [], isEditingHomework: false,
    },
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.cacheElements();
        this.addEventListeners();
    },
    cacheElements() {
        this.elements = {
            loadingScreen: document.getElementById('student-loading-screen'),
            loginScreen: document.getElementById('student-login-screen'),
            classSelect: document.getElementById('student-class-select'),
            nameSelect: document.getElementById('student-name-select'),
            passwordInput: document.getElementById('student-password'),
            loginBtn: document.getElementById('student-login-btn'),
            
            subjectSelectionScreen: document.getElementById('student-subject-selection-screen'),
            welcomeMessage: document.getElementById('student-welcome-message'),
            subjectsList: document.getElementById('student-subjects-list'),
            gotoHomeworkBtn: document.getElementById('student-goto-homework-btn'),
            
            lessonSelectionScreen: document.getElementById('student-lesson-selection-screen'),
            selectedSubjectTitle: document.getElementById('student-selected-subject-title'),
            lessonsList: document.getElementById('student-lessons-list'),
            noLessonScreen: document.getElementById('student-no-lesson-screen'),
            backToSubjectsBtn: document.getElementById('student-back-to-subjects-btn'),

            homeworkScreen: document.getElementById('student-homework-screen'),
            homeworkList: document.getElementById('student-homework-list'),
            backToSubjectsFromHomeworkBtn: document.getElementById('student-back-to-subjects-from-homework-btn'),
            
            uploadModal: document.getElementById('student-upload-modal'),
            uploadModalTitle: document.getElementById('student-upload-modal-title'),
            closeUploadModalBtn: document.getElementById('student-close-upload-modal-btn'),
            filesInput: document.getElementById('student-homework-files-input'),
            previewContainer: document.getElementById('student-homework-preview-container'),
            cancelUploadBtn: document.getElementById('student-cancel-upload-btn'),
            uploadBtn: document.getElementById('student-upload-btn'),
            uploadBtnText: document.getElementById('student-upload-btn-text'),
            uploadLoader: document.getElementById('student-upload-loader'),

            video1Screen: document.getElementById('student-video1-screen'),
            video1Title: document.getElementById('student-video1-title'),
            video1Iframe: document.getElementById('student-video1-iframe'),
            startQuizBtn: document.getElementById('student-start-quiz-btn'),
            backToLessonsFromVideoBtn: document.getElementById('student-back-to-lessons-from-video-btn'),
            
            quizScreen: document.getElementById('student-quiz-screen'),
            progressText: document.getElementById('student-progress-text'),
            scoreText: document.getElementById('student-score-text'),
            progressBar: document.getElementById('student-progress-bar'),
            questionText: document.getElementById('student-question-text'),
            optionsContainer: document.getElementById('student-options-container'),
            
            resultScreen: document.getElementById('student-result-screen'),
            successMessage: document.getElementById('student-success-message'),
            failureMessage: document.getElementById('student-failure-message'),
            resultScoreTextSuccess: document.getElementById('student-result-score-text-success'),
            resultScoreTextFailure: document.getElementById('student-result-score-text-failure'),
            reviewVideo2Iframe: document.getElementById('student-review-video2-iframe'),
            rewatchVideo1Btn: document.getElementById('student-rewatch-video1-btn'),
            video2Iframe: document.getElementById('student-video2-iframe'),
            retryQuizBtn: document.getElementById('student-retry-quiz-btn'),
            backToLessonsBtnSuccess: document.getElementById('student-back-to-lessons-btn-success'),
        };
    },
    addEventListeners() {
        this.elements.classSelect?.addEventListener('change', (e) => this.onClassSelect(e.target.value));
        this.elements.nameSelect?.addEventListener('change', () => this.onNameSelect());
        this.elements.loginBtn?.addEventListener('click', () => this.handleLogin());
        this.elements.startQuizBtn?.addEventListener('click', () => this.startQuiz());
        this.elements.retryQuizBtn?.addEventListener('click', () => this.startQuiz());
        this.elements.backToSubjectsBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.backToLessonsBtnSuccess?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.rewatchVideo1Btn?.addEventListener('click', () => this.rewatchVideo1());
        this.elements.backToLessonsFromVideoBtn?.addEventListener('click', () => this.showLessonSelectionScreen());
        this.elements.gotoHomeworkBtn?.addEventListener('click', () => this.showHomeworkScreen());
        this.elements.backToSubjectsFromHomeworkBtn?.addEventListener('click', () => this.showSubjectSelectionScreen());
        this.elements.closeUploadModalBtn?.addEventListener('click', () => this.closeUploadModal());
        this.elements.cancelUploadBtn?.addEventListener('click', () => this.closeUploadModal());
        this.elements.filesInput?.addEventListener('change', (e) => this.handleFileSelection(e));
        this.elements.uploadBtn?.addEventListener('click', () => this.handleUpload());
    },
    async showLoginScreen() {
        this.showScreen(this.elements.loadingScreen);
        const q = query(collection(db, 'classes'));
        try {
            const snapshot = await getDocs(q);
            this.elements.classSelect.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            snapshot.forEach(doc => this.elements.classSelect.innerHTML += `<option value="${doc.id}">${doc.data().name}</option>`);
            this.showScreen(this.elements.loginScreen);
        } catch (error) { console.error("반 목록 로딩 실패:", error); }
    },
    async onClassSelect(classId) {
        this.elements.nameSelect.innerHTML = '<option value="">-- 이름을 선택하세요 --</option>';
        this.elements.nameSelect.disabled = true; this.elements.passwordInput.disabled = true; this.elements.loginBtn.disabled = true; this.elements.passwordInput.value = '';
        if (!classId) return;
        const q = query(collection(db, 'students'), where("classId", "==", classId));
        const snapshot = await getDocs(q);
        const students = [];
        snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
        students.sort((a,b) => a.name.localeCompare(b.name));
        students.forEach(student => this.elements.nameSelect.innerHTML += `<option value="${student.id}">${student.name}</option>`);
        this.elements.nameSelect.disabled = false;
    },
    onNameSelect() {
        const isEnabled = !!this.elements.nameSelect.value;
        this.elements.passwordInput.disabled = !isEnabled; this.elements.loginBtn.disabled = !isEnabled; this.elements.passwordInput.value = '';
    },
    async handleLogin() {
        const studentId = this.elements.nameSelect.value;
        const password = this.elements.passwordInput.value;
        if (!studentId || !password) { showToast("이름과 비밀번호를 모두 입력해주세요."); return; }
        const studentDoc = await getDoc(doc(db, 'students', studentId));
        if (!studentDoc.exists()) { showToast("학생 정보를 찾을 수 없습니다."); return; }
        const studentData = studentDoc.data();
        if (studentData.password === password) {
            showToast(`환영합니다, ${studentData.name} 학생!`, false);
            this.state.studentId = studentId; this.state.studentName = studentData.name; this.state.classId = studentData.classId;
            await this.loadAvailableSubjects();
            this.showSubjectSelectionScreen();
        } else { showToast("비밀번호가 일치하지 않습니다."); }
    },
    stopAllVideos() {
        [this.elements.video1Iframe, this.elements.video2Iframe, this.elements.reviewVideo2Iframe].forEach(iframe => {
            if (iframe && iframe.src) { const tempSrc = iframe.src; iframe.src = ""; iframe.src = tempSrc; }
        });
    },
    showScreen(screenElement) {
        this.stopAllVideos();
        const screens = [
            this.elements.loadingScreen, 
            this.elements.loginScreen, 
            this.elements.subjectSelectionScreen, 
            this.elements.lessonSelectionScreen, 
            this.elements.video1Screen, 
            this.elements.quizScreen, 
            this.elements.resultScreen, 
            this.elements.homeworkScreen
        ];
        
        screens.forEach(s => { 
            if(s) s.style.display = 'none' 
        });
        
        if(screenElement) {
            screenElement.style.display = 'flex';
            if (screenElement.id && screenElement.id.includes('screen')) { 
                screenElement.style.alignItems = 'center'; 
                screenElement.style.justifyContent = 'center';
            }
        }
    },
    showSubjectSelectionScreen() {
        this.elements.welcomeMessage.textContent = `${this.state.studentName} 학생, 환영합니다!`;
        this.elements.subjectsList.innerHTML = '';
        if (this.state.activeSubjects.length === 0) {
            this.elements.subjectsList.innerHTML = '<p class="text-center text-slate-500 py-8">수강 가능한 과목이 없습니다.</p>';
        } else {
            this.state.activeSubjects.forEach(subject => this.renderSubjectChoice(subject));
        }
        this.showScreen(this.elements.subjectSelectionScreen);
    },
    showLessonSelectionScreen() {
        this.elements.selectedSubjectTitle.textContent = this.state.selectedSubject.name;
        this.listenForAvailableLessons();
        this.showScreen(this.elements.lessonSelectionScreen);
    },
    async loadAvailableSubjects() {
        this.showScreen(this.elements.loadingScreen);
        try {
            const classDoc = await getDoc(doc(db, 'classes', this.state.classId));
            if (!classDoc.exists() || !classDoc.data().subjects) { 
                this.state.activeSubjects = []; 
                return; 
            }
            const subjectIds = Object.keys(classDoc.data().subjects);
            const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
            this.state.activeSubjects = subjectDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
        } catch (error) { 
            console.error("수강 과목 로딩 실패:", error);
            this.state.activeSubjects = []; 
        }
    },
    async listenForAvailableLessons() {
        this.elements.lessonsList.innerHTML = '';
        this.elements.noLessonScreen.style.display = 'none';
        
        const q = query(collection(db, 'subjects', this.state.selectedSubject.id, 'lessons'), where("isActive", "==", true));
        const lessonsSnapshot = await getDocs(q);
        
        const activeLessons = lessonsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (activeLessons.length === 0) {
            this.elements.noLessonScreen.style.display = 'block';
            return;
        }

        // 'order' 필드를 기준으로 정렬. 없는 경우 맨 뒤로, 그 후에는 생성 시간으로 정렬
        activeLessons.sort((a, b) => {
            const orderA = a.order ?? Infinity;
            const orderB = b.order ?? Infinity;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
        });

        activeLessons.forEach(lesson => this.renderLessonChoice(lesson));
    },
    renderSubjectChoice(subject) {
        const button = document.createElement('button');
        button.className = "w-full p-4 text-lg font-semibold text-slate-700 border-2 border-slate-200 rounded-lg hover:bg-slate-100 transition";
        button.textContent = subject.name;
        button.addEventListener('click', () => { this.state.selectedSubject = subject; this.showLessonSelectionScreen(); });
        this.elements.subjectsList.appendChild(button);
    },
    renderLessonChoice(lesson) {
        const button = document.createElement('button');
        button.className = "w-full p-4 text-lg font-semibold text-slate-700 border-2 border-slate-200 rounded-lg hover:bg-slate-100 transition";
        button.textContent = lesson.title;
        button.addEventListener('click', () => this.startSelectedLesson(lesson));
        this.elements.lessonsList.appendChild(button);
    },
    convertYoutubeUrlToEmbed(url) {
        if (!url || typeof url !== 'string') return '';
        if (url.includes('/embed/')) return url;
        let videoId = url.match(/(?:watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/)?.[1];
        return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
    },
    startSelectedLesson(lesson) {
        this.state.activeLesson = lesson;
        this.elements.video1Title.textContent = this.state.activeLesson.title;
        this.elements.video1Iframe.src = this.convertYoutubeUrlToEmbed(this.state.activeLesson.video1Url);
        this.showScreen(this.elements.video1Screen);
    },
    startQuiz() {
        if (!this.state.activeLesson) return;
        this.updateStudentProgress('퀴즈 푸는 중');
        this.showScreen(this.elements.quizScreen);
        this.state.currentQuestionIndex = 0; this.state.score = 0;
        const shuffledBank = [...this.state.activeLesson.questionBank].sort(() => 0.5 - Math.random());
        this.state.quizQuestions = shuffledBank.slice(0, this.state.totalQuizQuestions);
        this.updateScoreDisplay(); this.displayQuestion();
    },
    displayQuestion() {
        const question = this.state.quizQuestions[this.state.currentQuestionIndex];
        if (!question) { this.showResults(); return; }
        this.updateProgress(); 
        this.elements.questionText.textContent = question.question;
        this.elements.optionsContainer.innerHTML = '';
        [...question.options].sort(() => 0.5 - Math.random()).forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.className = 'option-btn w-full p-4 text-left border-2 border-slate-300 rounded-lg hover:bg-slate-100';
            button.onclick = (e) => this.selectAnswer(e);
            this.elements.optionsContainer.appendChild(button);
        });
    },
    selectAnswer(e) {
        this.elements.optionsContainer.classList.add('disabled');
        const selected = e.target.textContent; const correct = this.state.quizQuestions[this.state.currentQuestionIndex].answer;
        if (selected === correct) { this.state.score++; e.target.classList.add('correct'); } 
        else {
            e.target.classList.add('incorrect');
            Array.from(this.elements.optionsContainer.children).forEach(btn => { if (btn.textContent === correct) btn.classList.add('correct'); });
        }
        this.updateScoreDisplay();
        setTimeout(() => { this.elements.optionsContainer.classList.remove('disabled'); this.state.currentQuestionIndex++; this.displayQuestion(); }, 1500);
    },
    showResults() {
        const pass = this.state.score >= this.state.passScore;
        this.updateStudentProgress(pass ? '퀴즈 통과 (완료)' : '퀴즈 실패', this.state.score);
        this.showScreen(this.elements.resultScreen);
        const scoreText = `${this.state.totalQuizQuestions} 문제 중 ${this.state.score} 문제를 맞혔습니다.`;
        if (pass) {
            this.elements.successMessage.style.display = 'block'; this.elements.failureMessage.style.display = 'none';
            this.elements.resultScoreTextSuccess.textContent = scoreText;
            this.elements.reviewVideo2Iframe.src = this.convertYoutubeUrlToEmbed(this.state.activeLesson.video2Url);
        } else {
            this.elements.successMessage.style.display = 'none'; this.elements.failureMessage.style.display = 'block';
            this.elements.resultScoreTextFailure.textContent = scoreText;
            this.elements.video2Iframe.src = this.convertYoutubeUrlToEmbed(this.state.activeLesson.video2Url);
        }
    },
    rewatchVideo1() {
        if (!this.state.activeLesson) return;
        this.elements.reviewVideo2Iframe.src = this.convertYoutubeUrlToEmbed(this.state.activeLesson.video1Url);
    },
    async updateStudentProgress(status, score = null) {
        if (!this.state.activeLesson || !this.state.studentId) return;
        const submissionRef = doc(db, 'subjects', this.state.selectedSubject.id, 'lessons', this.state.activeLesson.id, 'submissions', this.state.studentId);
        const data = { studentName: this.state.studentName, status, lastAttemptAt: serverTimestamp() };
        if (score !== null) { data.score = score; data.totalQuestions = this.state.totalQuizQuestions; }
        await setDoc(submissionRef, data, { merge: true });
    },
    updateScoreDisplay() { this.elements.scoreText.textContent = `점수: ${this.state.score}`; },
    updateProgress() {
        const progress = (this.state.currentQuestionIndex + 1) / this.state.totalQuizQuestions * 100;
        this.elements.progressText.textContent = `문제 ${this.state.currentQuestionIndex + 1} / ${this.state.totalQuizQuestions}`;
        this.elements.progressBar.style.width = `${progress}%`;
    },
    async showHomeworkScreen() {
        this.showScreen(this.elements.loadingScreen);
        const q = query(collection(db, 'homeworks'), where('classId', '==', this.state.classId), orderBy('dueDate', 'desc'));
        try {
            const homeworkSnapshot = await getDocs(q);
            const homeworks = homeworkSnapshot.docs.map(d => ({id: d.id, ...d.data()}));
            
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const recentHomeworks = homeworks.filter(hw => (hw.dueDate && new Date(hw.dueDate) >= twoWeeksAgo));

            this.elements.homeworkList.innerHTML = '';
            if (recentHomeworks.length === 0) {
                this.elements.homeworkList.innerHTML = '<p class="text-center text-slate-500 py-8">최근 2주 내에 출제된 숙제가 없습니다.</p>';
            } else {
                for (const hw of recentHomeworks) {
                    const submissionDoc = await getDoc(doc(db, 'homeworks', hw.id, 'submissions', this.state.studentId));
                    this.renderHomeworkItem(hw, submissionDoc.exists());
                }
            }
        } catch (error) {
            console.error("숙제 로딩 실패:", error);
            this.elements.homeworkList.innerHTML = `<div class="text-center text-red-500 py-8"><p>숙제 목록을 불러오는 데 실패했습니다.</p><p class="text-sm text-slate-500 mt-2">관리자에게 문의하거나 잠시 후 다시 시도해주세요.</p></div>`;
        }
        this.showScreen(this.elements.homeworkScreen);
    },
    renderHomeworkItem(hw, isSubmitted) {
        const item = document.createElement('div');
        item.className = `p-4 border rounded-lg flex items-center justify-between ${isSubmitted ? 'bg-green-50 border-green-200' : ''}`;
        
        const statusHtml = isSubmitted 
            ? `<div class="flex items-center gap-2">
                 <span class="text-sm font-semibold text-green-700">제출 완료</span>
                 <button class="edit-homework-btn text-xs bg-yellow-500 text-white font-semibold px-3 py-1 rounded-lg">수정하기</button>
               </div>`
            : '<button class="upload-homework-btn text-sm bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg">숙제 올리기</button>';
        
        const displayDate = hw.dueDate || '기한없음';
        item.innerHTML = `
            <div>
                <p class="text-xs text-slate-500">기한: ${displayDate}</p>
                <h3 class="font-bold text-slate-800">${hw.textbookName}</h3>
            </div>
            <div data-id="${hw.id}" data-textbook="${hw.textbookName}">${statusHtml}</div>`;
        this.elements.homeworkList.appendChild(item);

        item.querySelector('.upload-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement;
            this.openUploadModal(parent.dataset.id, parent.dataset.textbook, false);
        });

        item.querySelector('.edit-homework-btn')?.addEventListener('click', (e) => {
            const parent = e.target.parentElement.parentElement;
            this.openUploadModal(parent.dataset.id, parent.dataset.textbook, true);
        });
    },
    async openUploadModal(homeworkId, textbookName, isEditing = false) {
        this.state.currentHomeworkId = homeworkId;
        this.state.isEditingHomework = isEditing;
        this.state.filesToUpload = [];

        this.elements.uploadModalTitle.textContent = `[${textbookName}] 숙제 ${isEditing ? '수정' : '업로드'}`;
        this.elements.uploadBtnText.textContent = isEditing ? '수정하기' : '업로드하기';
        this.elements.previewContainer.innerHTML = '';
        this.elements.filesInput.value = '';

        if (isEditing) {
            const submissionDoc = await getDoc(doc(db, 'homeworks', this.state.currentHomeworkId, 'submissions', this.state.studentId));
            if (submissionDoc.exists()) {
                const existingFiles = submissionDoc.data().imageUrls.map(url => ({ type: 'existing', url }));
                this.state.filesToUpload = existingFiles;
                this.renderImagePreviews();
            }
        }

        this.elements.uploadModal.style.display = 'flex';
    },
    closeUploadModal() {
        this.state.currentHomeworkId = null;
        this.state.isEditingHomework = false;
        this.state.filesToUpload = [];
        this.elements.uploadModal.style.display = 'none';
    },
    handleFileSelection(event) {
        const newFiles = Array.from(event.target.files).map(file => ({ type: 'new', file }));
        this.state.filesToUpload.push(...newFiles);
        this.renderImagePreviews();
    },
    renderImagePreviews() {
        this.elements.previewContainer.innerHTML = '';
        this.state.filesToUpload.forEach((fileObject, index) => {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'relative';
            
            const img = document.createElement('img');
            img.className = 'w-full h-24 object-cover rounded-md';

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs';
            deleteBtn.textContent = 'X';
            deleteBtn.onclick = () => {
                this.state.filesToUpload.splice(index, 1);
                this.renderImagePreviews();
            };
            
            previewWrapper.appendChild(img);
            previewWrapper.appendChild(deleteBtn);

            if (fileObject.type === 'existing') {
                img.src = fileObject.url;
            } else { 
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target.result; };
                reader.readAsDataURL(fileObject.file);
            }
            this.elements.previewContainer.appendChild(previewWrapper);
        });
    },
    async handleUpload() {
        if (this.state.filesToUpload.length === 0) { showToast("업로드할 파일을 한 개 이상 선택해주세요."); return; }
        this.setUploadButtonLoading(true);

        const existingUrls = this.state.filesToUpload
            .filter(f => f.type === 'existing')
            .map(f => f.url);
        
        const newFiles = this.state.filesToUpload
            .filter(f => f.type === 'new')
            .map(f => f.file);

        try {
            const uploadPromises = newFiles.map((file, i) => {
                const filePath = `homeworks/${this.state.currentHomeworkId}/${this.state.studentId}/${Date.now()}_${i+1}_${file.name}`;
                const fileRef = ref(storage, filePath);
                return uploadBytes(fileRef, file).then(snapshot => getDownloadURL(snapshot.ref));
            });
            const newImageUrls = await Promise.all(uploadPromises);
            const finalImageUrls = [...existingUrls, ...newImageUrls];

            const submissionRef = doc(db, 'homeworks', this.state.currentHomeworkId, 'submissions', this.state.studentId);
            const dataToSave = {
                studentName: this.state.studentName,
                submittedAt: serverTimestamp(),
                imageUrls: finalImageUrls
            };
            
            if (this.state.isEditingHomework) {
                await updateDoc(submissionRef, dataToSave);
                showToast("숙제를 성공적으로 수정했습니다.", false);
            } else {
                await setDoc(submissionRef, dataToSave);
                showToast("숙제를 성공적으로 제출했습니다.", false);
            }

            this.closeUploadModal();
            this.showHomeworkScreen();
        } catch (error) {
            console.error("업로드/수정 실패:", error);
            showToast("숙제 처리에 실패했습니다.");
        } finally {
            this.setUploadButtonLoading(false);
        }
    },
    setUploadButtonLoading(isLoading) {
        this.elements.uploadBtnText.classList.toggle('hidden', isLoading);
        this.elements.uploadLoader.classList.toggle('hidden', !isLoading);
        this.elements.uploadBtn.disabled = isLoading;
    }
};

export default StudentApp;