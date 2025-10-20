// src/admin/adminApp.js

import { auth, onAuthStateChanged, signInAnonymously, db } from '../shared/firebase.js';
// Firestore 모듈 추가 (classLectures 컬렉션 사용 위해)
import { collection, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, query, getDocs, where, writeBatch, setDoc, orderBy } from "firebase/firestore"; // orderBy 추가
import { showToast } from '../shared/utils.js';

// 기존 관리자 모듈 import
import { subjectManager } from './subjectManager.js';
import { textbookManager } from './textbookManager.js';
import { classManager } from './classManager.js';
import { studentManager } from './studentManager.js';
import { teacherManager } from './teacherManager.js';
import { lessonManager } from './lessonManager.js';
import { studentAssignmentManager } from './studentAssignmentManager.js';
// studentLesson import는 관리자 앱에 필요 없음

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: {
        subjects: [],
        classes: [],
        students: [],
        teachers: [],
        lessons: [],
        editingClass: null,
        selectedSubjectIdForLesson: null,
        editingLesson: null,
        generatedQuiz: null,
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
        selectedClassIdForClassVideo: null,
        currentClassVideoDate: null,
        currentClassVideos: [],
    },

    init() {
        document.getElementById('admin-initial-login').style.display = 'flex';
        document.getElementById('admin-main-dashboard').style.display = 'none';
        const secretLoginBtn = document.getElementById('admin-secret-login-btn');
        secretLoginBtn?.addEventListener('click', this.handleSecretLogin.bind(this));
    },

    async handleSecretLogin() {
        const inputPassword = document.getElementById('admin-secret-password').value;
        if (inputPassword !== 'qkraudtls0626^^') { // 비밀번호 확인 (실제 환경에서는 안전한 방식 사용)
            showToast('비밀번호가 올바르지 않습니다.');
            return;
        }
        try {
            await signInAnonymously(auth); // 익명 로그인 시도
            showToast("인증 성공!", false);
            this.showDashboard(); // 성공 시 대시보드 표시
        } catch (error) {
            console.error("익명 로그인 실패:", error);
            showToast("관리자 인증 실패. 인터넷 연결 확인.");
        }
    },

    showDashboard() {
        document.getElementById('admin-initial-login').style.display = 'none';
        document.getElementById('admin-main-dashboard').style.display = 'block';
        if (!this.isInitialized) { // 최초 한 번만 초기화 실행
            this.initializeDashboard();
        }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.cacheElements(); // 1. 요소 캐싱

        // 2. 모듈들을 this에 할당 (init보다 먼저!)
        // this.homeworkDashboard = homeworkDashboard; // 관리자 앱에는 homeworkDashboard 불필요
        this.lessonManager = lessonManager;
        // this.classEditor = classEditor; // classManager가 관리자 앱 역할 수행
        // this.classVideoManager = classVideoManager; // 관리자 앱 내부에 로직 통합

        // 3. 각 관리 모듈 초기화
        subjectManager.init(this);
        textbookManager.init(this);
        classManager.init(this);
        studentManager.init(this);
        teacherManager.init(this);
        lessonManager.init(this);
        studentAssignmentManager.init(this);
        // 수업 영상 관리 로직은 adminApp 내부에 구현

        // 4. 이벤트 리스너 추가 (모듈 할당 및 초기화 이후)
        this.addEventListeners();

        // 5. 초기 데이터 로드 시작
        // classManager.listenForClasses(); // 반 목록 로드 (classManager.init 내부에서 호출됨)
        // subjectManager.listenForSubjects(); // 과목 목록 로드 (subjectManager.init 내부에서 호출됨)

        // 6. 초기 화면 표시
        this.showAdminSection('dashboard');
    },

    cacheElements() {
        this.elements = {
            dashboardView: document.getElementById('admin-dashboard-view'),
            gotoSubjectMgmtBtn: document.getElementById('goto-subject-mgmt-btn'),
            gotoTextbookMgmtBtn: document.getElementById('goto-textbook-mgmt-btn'),
            gotoClassMgmtBtn: document.getElementById('goto-class-mgmt-btn'),
            gotoStudentMgmtBtn: document.getElementById('goto-student-mgmt-btn'),
            gotoTeacherMgmtBtn: document.getElementById('goto-teacher-mgmt-btn'),
            gotoLessonMgmtBtn: document.getElementById('goto-lesson-mgmt-btn'),
            gotoStudentAssignmentBtn: document.getElementById('goto-student-assignment-btn'),
            gotoQnaVideoMgmtBtn: document.getElementById('goto-qna-video-mgmt-btn'),
            gotoClassVideoMgmtBtn: document.getElementById('goto-class-video-mgmt-btn'), // 수업 영상 메뉴 버튼 ID로 가져오기

            qnaVideoMgmtView: document.getElementById('admin-qna-video-mgmt-view'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoDate: document.getElementById('admin-qna-video-date'),
            qnaVideoTitle: document.getElementById('admin-qna-video-title'),
            qnaVideoUrl: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),

            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            teacherMgmtView: document.getElementById('admin-teacher-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            studentAssignmentView: document.getElementById('admin-student-assignment-view'),
            classVideoMgmtView: document.getElementById('admin-class-video-mgmt-view'), // 수업 영상 뷰

            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),

            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),

            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),

            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPasswordInput: document.getElementById('admin-new-student-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),

            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherEmailInput: document.getElementById('admin-new-teacher-email'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),

            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherEmailInput: document.getElementById('admin-edit-teacher-email'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),

            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),

            modal: document.getElementById('admin-new-lesson-modal'),
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            closeModalBtn: document.getElementById('admin-close-modal-btn'),
            cancelBtn: document.getElementById('admin-cancel-btn'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'),
            video2Url: document.getElementById('admin-video2-url'),
            addVideo1RevBtn: document.getElementById('admin-add-video1-rev-btn'),
            addVideo2RevBtn: document.getElementById('admin-add-video2-rev-btn'),
            videoRevUrlsContainer: (type) => `admin-video${type}-rev-urls-container`,
            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'),
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),

            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
            editClassTypeSelect: document.getElementById('admin-edit-class-type'),

            // 수업 영상 관리 요소
            classVideoClassSelect: document.getElementById('admin-class-video-class-select'),
            classVideoDateInput: document.getElementById('admin-class-video-date'),
            classVideoListContainer: document.getElementById('admin-class-video-list-container'),
            addClassVideoFieldBtn: document.getElementById('admin-add-class-video-field-btn'),
            saveClassVideoBtn: document.getElementById('admin-save-class-video-btn'),
        };
    },

    addEventListeners() {
        // 메뉴 버튼 이벤트
        this.elements.gotoSubjectMgmtBtn?.addEventListener('click', () => this.showAdminSection('subject-mgmt'));
        this.elements.gotoTextbookMgmtBtn?.addEventListener('click', () => this.showAdminSection('textbook-mgmt'));
        this.elements.gotoClassMgmtBtn?.addEventListener('click', () => this.showAdminSection('class-mgmt'));
        this.elements.gotoStudentMgmtBtn?.addEventListener('click', () => this.showAdminSection('student-mgmt'));
        this.elements.gotoTeacherMgmtBtn?.addEventListener('click', () => this.showAdminSection('teacher-mgmt'));
        this.elements.gotoLessonMgmtBtn?.addEventListener('click', () => this.showAdminSection('lesson-mgmt'));
        this.elements.gotoStudentAssignmentBtn?.addEventListener('click', () => this.showAdminSection('student-assignment'));
        this.elements.gotoQnaVideoMgmtBtn?.addEventListener('click', () => this.showAdminSection('qna-video-mgmt'));

        // --- 👇 수업 영상 관리 메뉴 버튼 이벤트 리스너 추가 및 로그 👇 ---
        this.elements.gotoClassVideoMgmtBtn?.addEventListener('click', () => {
            console.log("[adminApp.js] '수업 영상 관리' 메뉴 클릭됨"); // 로그 추가
            this.showAdminSection('class-video-mgmt');
        });
        // --- 👆 ---

        // 뒤로가기 버튼 이벤트 (이벤트 위임)
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });

        // 질문 영상 저장 버튼
        this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo());

        // 수업 영상 관리 이벤트 리스너
        this.elements.classVideoClassSelect?.addEventListener('change', (e) => this.handleClassVideoClassChange(e.target.value));
        this.elements.classVideoDateInput?.addEventListener('change', (e) => this.handleClassVideoDateChange(e.target.value));
        this.elements.addClassVideoFieldBtn?.addEventListener('click', () => this.addClassVideoField());
        this.elements.saveClassVideoBtn?.addEventListener('click', () => this.saveClassVideos());

        // 사용자 정의 이벤트 리스너
        document.addEventListener('subjectsUpdated', () => {
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
        });
        document.addEventListener('classesUpdated', () => {
            this.populateClassSelectForQnaVideo();
            this.populateClassSelectForClassVideo(); // 수업 영상 반 목록 업데이트
        });
    },

    showAdminSection(sectionName) {
        console.log(`[adminApp.js] Attempting to show section: ${sectionName}`); // 로그 추가

        // 모든 뷰 숨기기
        Object.keys(this.elements).forEach(key => {
            if (key.endsWith('View')) {
                if(this.elements[key]) this.elements[key].style.display = 'none';
            }
        });

        const viewMap = {
            'dashboard': this.elements.dashboardView,
            'subject-mgmt': this.elements.subjectMgmtView,
            'textbook-mgmt': this.elements.textbookMgmtView,
            'class-mgmt': this.elements.classMgmtView,
            'student-mgmt': this.elements.studentMgmtView,
            'teacher-mgmt': this.elements.teacherMgmtView,
            'lesson-mgmt': this.elements.lessonMgmtView,
            'student-assignment': this.elements.studentAssignmentView,
            'qna-video-mgmt': this.elements.qnaVideoMgmtView,
            'class-video-mgmt': this.elements.classVideoMgmtView, // 수업 영상 뷰 확인
        };

        // 해당 뷰 표시
        const viewToShow = viewMap[sectionName]; // 찾기
        if (viewToShow) {
            console.log(`[adminApp.js] Showing element: ${viewToShow.id}`); // 로그 추가
            viewToShow.style.display = 'block'; // 표시
        } else {
             console.warn(`[adminApp.js] View element for "${sectionName}" not found. Showing dashboard.`);
             if(this.elements.dashboardView) this.elements.dashboardView.style.display = 'block';
        }

        // 특정 뷰 표시 시 초기화 작업
        if (sectionName === 'qna-video-mgmt') {
            this.populateClassSelectForQnaVideo();
        } else if (sectionName === 'class-video-mgmt') {
             console.log("[adminApp.js] Initializing Class Video View..."); // 로그 추가
            this.initClassVideoView(); // 수업 영상 뷰 초기화 함수 호출
        }
    },

    populateClassSelectForQnaVideo() {
        const select = this.elements.qnaClassSelect;
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- 반 선택 --</option>';
        this.state.classes.forEach(c => {
            select.innerHTML += `<option value="${c.id}" ${c.id === currentVal ? 'selected' : ''}>${c.name}</option>`;
        });
    },

    async saveQnaVideo() {
        const classId = this.elements.qnaClassSelect.value;
        const videoDate = this.elements.qnaVideoDate.value;
        const title = this.elements.qnaVideoTitle.value.trim();
        const youtubeUrl = this.elements.qnaVideoUrl.value.trim();
        if (!classId || !videoDate || !title || !youtubeUrl) {
            showToast("반, 날짜, 제목, URL을 모두 입력해야 합니다."); return;
        }
        try {
            await addDoc(collection(db, 'classVideos'), { classId, videoDate, title, youtubeUrl, createdAt: serverTimestamp() });
            showToast("질문 영상 저장 성공!", false);
            this.elements.qnaVideoTitle.value = '';
            this.elements.qnaVideoUrl.value = '';
        } catch (error) {
            console.error("질문 영상 저장 실패:", error); showToast("영상 저장 실패.");
        }
    },

    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook;
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}" ${sub.id === currentVal ? 'selected' : ''}>${sub.name}</option>`;
        });
    },

    renderSubjectOptionsForLesson() {
        const select = this.elements.subjectSelectForLesson;
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}" ${sub.id === currentVal ? 'selected' : ''}>${sub.name}</option>`;
        });
    },

    // --- 수업 영상 관리 관련 함수들 ---

    initClassVideoView() {
        this.populateClassSelectForClassVideo(); // 반 목록 채우기
        const today = new Date().toISOString().slice(0, 10);
        if (this.elements.classVideoDateInput) {
            this.elements.classVideoDateInput.value = today; // 오늘 날짜 기본 설정
        }
        // 반 선택이 아직 안 됐을 수 있으므로 로드는 반 선택 후 진행
        this.state.currentClassVideoDate = today;
        this.state.currentClassVideos = [];
        this.renderClassVideoFields([]); // 빈 목록 표시
        if (this.elements.classVideoListContainer) {
            this.elements.classVideoListContainer.innerHTML = '<p class="text-sm text-slate-500">먼저 반을 선택해주세요.</p>';
        }
    },

    populateClassSelectForClassVideo() {
        const select = this.elements.classVideoClassSelect;
        if (!select) return;
        const currentVal = this.state.selectedClassIdForClassVideo; // 현재 상태값 사용
        select.innerHTML = '<option value="">-- 반 선택 --</option>';
        const classesToShow = this.state.classes; // 모든 반 표시

        classesToShow.forEach(c => {
            select.innerHTML += `<option value="${c.id}" ${c.id === currentVal ? 'selected' : ''}>${c.name}</option>`;
        });
        select.value = currentVal || ""; // 저장된 값 또는 초기값("")으로 설정
    },

    handleClassVideoClassChange(classId) {
        this.state.selectedClassIdForClassVideo = classId;
        this.loadClassVideos(); // 반 변경 시 영상 로드
    },

    handleClassVideoDateChange(selectedDate) {
        this.state.currentClassVideoDate = selectedDate;
        this.loadClassVideos(); // 날짜 변경 시 영상 로드
    },

    async loadClassVideos() {
        const classId = this.state.selectedClassIdForClassVideo;
        const selectedDate = this.state.currentClassVideoDate;
        const container = this.elements.classVideoListContainer;

        if (!container) return;
        if (!classId || !selectedDate) {
             this.state.currentClassVideos = [];
             this.renderClassVideoFields([]);
             container.innerHTML = `<p class="text-sm text-slate-500">${!classId ? '반을' : '날짜를'} 선택해주세요.</p>`; // 더 명확한 메시지
            return;
        }

        container.innerHTML = '<div class="loader-small mx-auto"></div>';

        try {
            const q = query(
                collection(db, 'classLectures'),
                where('classId', '==', classId),
                where('lectureDate', '==', selectedDate)
            );
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                this.state.currentClassVideos = [];
            } else {
                const docSnap = snapshot.docs[0];
                this.state.currentClassVideos = docSnap.data().videos || [];
            }
            this.renderClassVideoFields(this.state.currentClassVideos);
        } catch (error) {
            console.error("수업 영상 로딩 실패:", error);
            showToast("수업 영상을 불러오는 데 실패했습니다.");
             container.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>';
        }
    },

    renderClassVideoFields(videos) {
        const container = this.elements.classVideoListContainer;
        if (!container) return;
        container.innerHTML = '';

        if (!videos || videos.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-500">등록된 영상이 없습니다. 아래 버튼으로 추가하세요.</p>';
        } else {
            videos.forEach((video, index) => this.addClassVideoField(video.title, video.url, index));
        }
        // 필드 추가 후 인덱스 재정렬 호출은 addClassVideoField 내부에서 처리해도 됨
        // this.reindexClassVideoFields(); // 필요시 호출
    },

    addClassVideoField(title = '', url = '', index = -1) {
        const container = this.elements.classVideoListContainer;
        if (!container) return;

        const noVideoMsg = container.querySelector('p');
        if (noVideoMsg?.textContent.includes('등록된 영상이 없습니다')) noVideoMsg.remove(); // 안내 메시지 제거 개선

        const fieldIndex = (index === -1) ? (container.querySelectorAll('.video-field-group').length) : index;

        const div = document.createElement('div');
        div.className = 'video-field-group border p-3 rounded bg-white relative mb-2'; // 필드 간 간격 추가
        div.dataset.index = fieldIndex;

        div.innerHTML = `
            <button class="remove-video-field-btn absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold leading-none z-10">&times;</button>
            <div class="mb-2">
                <label for="admin-video-title-${fieldIndex}" class="block text-xs font-medium text-slate-600 mb-1">영상 제목 ${fieldIndex + 1}</label>
                <input type="text" id="admin-video-title-${fieldIndex}" class="form-input form-input-sm video-title-input" value="${title}" placeholder="예: 수학 1단원 개념">
            </div>
            <div>
                <label for="admin-video-url-${fieldIndex}" class="block text-xs font-medium text-slate-600 mb-1">YouTube URL ${fieldIndex + 1}</label>
                <input type="url" id="admin-video-url-${fieldIndex}" class="form-input form-input-sm video-url-input" value="${url}" placeholder="https://youtube.com/watch?v=...">
            </div>
        `;

        div.querySelector('.remove-video-field-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            div.remove();
            this.reindexClassVideoFields();
        });

        container.appendChild(div);
        if (index === -1) this.reindexClassVideoFields(); // 새로 추가할 때만 인덱스 재정렬
    },

    reindexClassVideoFields() {
        const container = this.elements.classVideoListContainer;
        if (!container) return;
        const fieldGroups = container.querySelectorAll('.video-field-group');
        fieldGroups.forEach((group, newIndex) => {
             group.dataset.index = newIndex;
             const titleLabel = group.querySelector('label[for^="admin-video-title"]');
             const titleInput = group.querySelector('.video-title-input');
             const urlLabel = group.querySelector('label[for^="admin-video-url"]');
             const urlInput = group.querySelector('.video-url-input');
             if(titleLabel) { titleLabel.setAttribute('for', `admin-video-title-${newIndex}`); titleLabel.textContent = `영상 제목 ${newIndex + 1}`; }
             if(titleInput) { titleInput.id = `admin-video-title-${newIndex}`; }
             if(urlLabel) { urlLabel.setAttribute('for', `admin-video-url-${newIndex}`); urlLabel.textContent = `YouTube URL ${newIndex + 1}`; }
             if(urlInput) { urlInput.id = `admin-video-url-${newIndex}`; }
         });
         if (fieldGroups.length === 0) {
             container.innerHTML = '<p class="text-sm text-slate-500">등록된 영상이 없습니다. 아래 버튼으로 추가하세요.</p>';
         }
     },

    async saveClassVideos() {
        const classId = this.state.selectedClassIdForClassVideo;
        const selectedDate = this.state.currentClassVideoDate;
        if (!selectedDate || !classId) {
            showToast("반과 날짜가 선택되어야 합니다."); return;
        }
        const videoFields = this.elements.classVideoListContainer?.querySelectorAll('.video-field-group');
        if (!videoFields) return;
        const videosToSave = [];
        let hasError = false;
        videoFields.forEach(field => {
            const titleInput = field.querySelector('.video-title-input');
            const urlInput = field.querySelector('.video-url-input');
            const title = titleInput?.value.trim();
            const url = urlInput?.value.trim();
            if (title && url) {
                videosToSave.push({ title, url });
                if(titleInput) titleInput.classList.remove('border-red-500');
                if(urlInput) urlInput.classList.remove('border-red-500');
            } else if (title || url) {
                showToast(`영상 ${parseInt(field.dataset.index) + 1}의 제목/URL 확인 필요`);
                if(titleInput) titleInput.classList.toggle('border-red-500', !title);
                if(urlInput) urlInput.classList.toggle('border-red-500', !url);
                hasError = true;
            }
        });
        if (hasError) return;
        const saveBtn = this.elements.saveClassVideoBtn;
        if(saveBtn) saveBtn.disabled = true;
        try {
            const q = query(collection(db, 'classLectures'), where('classId', '==', classId), where('lectureDate', '==', selectedDate));
            const snapshot = await getDocs(q);
            if (videosToSave.length === 0) {
                 if (!snapshot.empty) {
                     await deleteDoc(snapshot.docs[0].ref);
                     showToast("해당 날짜 영상 삭제 완료.", false);
                 } else { showToast("저장할 영상 없음.", false); }
            } else {
                 const data = { classId, lectureDate: selectedDate, videos: videosToSave };
                 if (snapshot.empty) {
                     data.createdAt = serverTimestamp();
                     await setDoc(doc(collection(db, 'classLectures')), data); // 새 문서 생성
                 } else {
                     await updateDoc(snapshot.docs[0].ref, { videos: videosToSave }); // 기존 문서 업데이트
                 }
                 showToast("수업 영상 저장 완료.", false);
            }
            this.state.currentClassVideos = videosToSave; // 상태 업데이트
        } catch (error) {
            console.error("수업 영상 저장 실패:", error); showToast("수업 영상 저장 실패.");
        } finally {
             if(saveBtn) saveBtn.disabled = false;
        }
    },

}; // AdminApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    AdminApp.init();
});

export default AdminApp;