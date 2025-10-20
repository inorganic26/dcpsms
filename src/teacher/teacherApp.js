// src/teacher/teacherApp.js

import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, addDoc, serverTimestamp, orderBy, deleteDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

import { lessonDashboard } from './lessonDashboard.js';
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { classVideoManager } from './classVideoManager.js';

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        studentsInClass: new Map(),
        subjects: [],
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        editingClass: null,
        editingHomeworkId: null,
    },

    init() {
        this.cacheElements();
        this.elements.loginBtn?.addEventListener('click', () => {
             const name = this.elements.nameInput?.value;
             const password = this.elements.passwordInput?.value;
             this.handleLogin(name, password);
        });
        this.elements.passwordInput?.addEventListener('keyup', (e) => {
             if (e.key === 'Enter') {
                 const name = this.elements.nameInput?.value;
                 const password = this.elements.passwordInput?.value;
                 this.handleLogin(name, password);
             }
        });
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'flex';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'none';
    },

    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요.");
            return;
        }
        try {
            const q = query(collection(db, 'teachers'), where("name", "==", name), where("password", "==", password));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                showToast(`환영합니다, ${userData.name} 선생님!`, false);
                this.showDashboard(userDoc.id, userData);
            } else {
                 const adminQ = query(collection(db, 'admins'), where("name", "==", name), where("password", "==", password));
                 const adminSnapshot = await getDocs(adminQ);
                 if(!adminSnapshot.empty) {
                     const adminDoc = adminSnapshot.docs[0];
                     const adminData = adminDoc.data();
                     showToast(`환영합니다, ${adminData.name} 관리자님!`, false);
                     this.showDashboard(adminDoc.id, adminData);
                 } else {
                    showToast("이름 또는 비밀번호가 일치하지 않습니다.");
                 }
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.code === 'permission-denied') {
                 showToast("로그인 정보 조회 권한이 부족합니다.");
            } else {
                showToast("로그인 중 오류가 발생했습니다.");
            }
        }
    },

    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';
        if (!this.isInitialized) {
            this.initializeDashboard();
        }
         if (userData.isInitialPassword === true && userData.role !== 'admin') {
             this.promptPasswordChange(userId);
         }
    },

    // --- 👇 초기화 순서 수정 👇 ---
    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.cacheElements(); // 1. 요소 캐싱

        // 2. 모듈들을 this에 할당 (init보다 먼저!)
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager; // lessonManager 객체 자체 할당
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager;

        // 3. 모듈들 초기화 (lessonManager.init은 내부적으로 managerInstance 생성)
        this.homeworkDashboard.init(this);
        this.lessonManager.init(this);
        this.classEditor.init(this);
        this.classVideoManager.init(this);

        // 4. 이벤트 리스너 추가 (모듈 할당 및 초기화 이후)
        this.addEventListeners();

        // 5. 초기 데이터 로드 시작
        this.populateClassSelect();
        this.listenForSubjects(); // 여기서 onSnapshot 설정 -> subjectsUpdated 이벤트 발생 가능성 있음

        // 6. 초기 화면 표시
        this.showDashboardMenu();
    },
    // --- 👆 초기화 순서 수정 끝 👆 ---

     async promptPasswordChange(teacherId) {
         const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
         if (newPassword && newPassword.length >= 6) {
             try {
                 const teacherRef = doc(db, 'teachers', teacherId);
                 await updateDoc(teacherRef, {
                     password: newPassword, // 실제 앱에서는 해싱 필요
                     isInitialPassword: false
                 });
                 showToast("비밀번호가 성공적으로 변경되었습니다.", false);
             } catch (error) {
                 console.error("비밀번호 변경 실패:", error);
                 showToast("비밀번호 변경에 실패했습니다.");
             }
         } else if (newPassword) {
             showToast("비밀번호는 6자리 이상이어야 합니다.");
         }
     },

    cacheElements() {
        this.elements = {
            loginContainer: document.getElementById('teacher-login-container'),
            dashboardContainer: document.getElementById('teacher-dashboard-container'),
            nameInput: document.getElementById('teacher-name'),
            passwordInput: document.getElementById('teacher-password'),
            loginBtn: document.getElementById('teacher-login-btn'),
            classSelect: document.getElementById('teacher-class-select'),
            mainContent: document.getElementById('teacher-main-content'),
            navButtonsContainer: document.getElementById('teacher-navigation-buttons'),
            views: {
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'),
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'),
            },
            homeworkDashboardControls: document.getElementById('homework-dashboard-controls'),
            homeworkSelect: document.getElementById('teacher-homework-select'),
            assignHomeworkBtn: document.getElementById('teacher-assign-homework-btn'),
            homeworkManagementButtons: document.getElementById('teacher-homework-management-buttons'),
            editHomeworkBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteHomeworkBtn: document.getElementById('teacher-delete-homework-btn'),
            homeworkContent: document.getElementById('teacher-homework-content'),
            selectedHomeworkTitle: document.getElementById('teacher-selected-homework-title'),
            homeworkTableBody: document.getElementById('teacher-homework-table-body'),
            assignHomeworkModal: document.getElementById('teacher-assign-homework-modal'),
            homeworkModalTitle: document.getElementById('teacher-homework-modal-title'),
            closeHomeworkModalBtn: document.getElementById('teacher-close-homework-modal-btn'),
            cancelHomeworkBtn: document.getElementById('teacher-cancel-homework-btn'),
            saveHomeworkBtn: document.getElementById('teacher-save-homework-btn'),
            homeworkSubjectSelect: document.getElementById('teacher-homework-subject-select'),
            homeworkTextbookSelect: document.getElementById('teacher-homework-textbook-select'),
            homeworkPagesInput: document.getElementById('teacher-homework-pages'),
            homeworkDueDateInput: document.getElementById('teacher-homework-due-date'),
            lessonMgmtControls: document.getElementById('lesson-mgmt-controls'),
            subjectSelectForMgmt: document.getElementById('teacher-subject-select-mgmt'),
            lessonsManagementContent: document.getElementById('teacher-lessons-management-content'),
            lessonPrompt: document.getElementById('teacher-lesson-prompt'),
            lessonsList: document.getElementById('teacher-lessons-list'),
            saveOrderBtn: document.getElementById('teacher-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('teacher-show-new-lesson-modal-btn'),
            modal: document.getElementById('teacher-new-lesson-modal'),
            modalTitle: document.getElementById('teacher-lesson-modal-title'),
            closeModalBtn: document.getElementById('teacher-close-modal-btn'),
            cancelBtn: document.getElementById('teacher-cancel-btn'),
            lessonTitle: document.getElementById('teacher-lesson-title'),
            video1Url: document.getElementById('teacher-video1-url'),
            video2Url: document.getElementById('teacher-video2-url'),
            addVideo1RevBtn: document.getElementById('teacher-add-video1-rev-btn'),
            addVideo2RevBtn: document.getElementById('teacher-add-video2-rev-btn'),
            quizJsonInput: document.getElementById('teacher-quiz-json-input'),
            previewQuizBtn: document.getElementById('teacher-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('teacher-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('teacher-questions-preview-title'),
            questionsPreviewList: document.getElementById('teacher-questions-preview-list'),
            saveLessonBtn: document.getElementById('teacher-save-lesson-btn'),
            saveBtnText: document.getElementById('teacher-save-btn-text'),
            saveLoader: document.getElementById('teacher-save-loader'),
            videoRevUrlsContainer: (type) => `teacher-video${type}-rev-urls-container`,
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            qnaVideoListContainer: document.getElementById('qna-video-list-teacher-container'),
            qnaVideosList: document.getElementById('qna-videos-list-teacher'),
            classVideoDateInput: document.getElementById('class-video-date'),
            classVideoListContainer: document.getElementById('class-video-list-container'),
            addClassVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveClassVideoBtn: document.getElementById('save-class-video-btn'),
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),
        };
        // console.log("[teacherApp.js] Elements cached."); // 로그 제거됨
    },

    // --- 👇 이벤트 리스너 추가 함수 수정 👇 ---
     addEventListeners() {
        if (this.elements.classSelect) {
            this.elements.classSelect.addEventListener('change', (e) => this.handleClassSelection(e));
        }
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.addEventListener('click', (e) => {
                 const card = e.target.closest('.teacher-nav-btn');
                 if (card && card.dataset.view) {
                     this.handleViewChange(card.dataset.view);
                 }
            });
        }
        if (this.elements.mainContent) {
             this.elements.mainContent.addEventListener('click', (e) => {
                 if (e.target.classList.contains('back-to-teacher-menu')) {
                     this.showDashboardMenu();
                 }
             });
         }
         this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo().then(() => this.loadQnaVideosForTeacher()));
         this.elements.qnaVideoDateInput?.addEventListener('change', () => this.loadQnaVideosForTeacher());

         // ✨ 수정: subjectsUpdated 이벤트 리스너 콜백을 화살표 함수로 유지 (this 컨텍스트 보장)
         document.addEventListener('subjectsUpdated', () => {
             // 이 콜백 함수 내에서 this는 TeacherApp 객체를 가리킵니다.
             // console.log("[teacherApp.js] 'subjectsUpdated' event received."); // 필요시 로그 추가
             this.updateSubjectDropdowns(); // this.updateSubjectDropdowns 호출 가능
        });
    },
    // --- 👆 이벤트 리스너 추가 함수 수정 끝 👆 ---

    showDashboardMenu() {
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'grid';
        }
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }
    },

    handleViewChange(viewName) {
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'none';
        }
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        } else {
             console.warn(`[teacherApp.js] View "${viewName}" not found. Showing dashboard menu.`);
             this.showDashboardMenu();
             return;
        }
        switch (viewName) {
            case 'homework-dashboard':
                if (this.elements.homeworkDashboardControls) this.elements.homeworkDashboardControls.style.display = 'flex';
                if (this.elements.homeworkManagementButtons) this.elements.homeworkManagementButtons.style.display = 'none';
                if (this.elements.homeworkContent) this.elements.homeworkContent.style.display = 'none';
                this.homeworkDashboard.populateHomeworkSelect();
                if(this.elements.homeworkSelect) this.elements.homeworkSelect.value = '';
                break;
            case 'lesson-mgmt':
                 if (this.elements.lessonMgmtControls) this.elements.lessonMgmtControls.style.display = 'block';
                 if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
                 if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
                 this.populateSubjectSelectForMgmt();
                 if(this.elements.subjectSelectForMgmt) this.elements.subjectSelectForMgmt.value = '';
                break;
            case 'qna-video-mgmt':
                 const today = new Date().toISOString().slice(0, 10);
                 if(this.elements.qnaVideoDateInput) {
                     if (!this.elements.qnaVideoDateInput.value || this.elements.qnaVideoDateInput.value !== today) {
                         this.elements.qnaVideoDateInput.value = today;
                         this.loadQnaVideosForTeacher(today);
                     } else {
                         this.loadQnaVideosForTeacher(this.elements.qnaVideoDateInput.value);
                     }
                 } else {
                     this.loadQnaVideosForTeacher();
                 }
                 if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
                 if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
                break;
             case 'class-video-mgmt':
                 this.classVideoManager.initView();
                 break;
            case 'class-mgmt':
                break;
            default:
                 this.showDashboardMenu();
                 break;
        }
    },


    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;
        const newClassName = selectedOption.text;
        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = newClassName;
        this.state.selectedHomeworkId = null;
        this.state.selectedSubjectIdForMgmt = null;
        this.state.selectedLessonId = null;
        this.state.selectedSubjectId = null;
        if (!this.state.selectedClassId) {
            if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';
             this.showDashboardMenu();
            return;
        }
        if(this.elements.mainContent) this.elements.mainContent.style.display = 'block';
        await this.fetchClassData(this.state.selectedClassId);
        this.showDashboardMenu();
    },

    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        try {
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;
            document.dispatchEvent(new CustomEvent('class-changed'));
        } catch (error) {
            console.error("[teacherApp.js] Error fetching class data:", error);
            showToast("반 정보를 불러오는 데 실패했습니다.");
            this.state.selectedClassData = null;
            this.state.studentsInClass.clear();
        }
    },

    listenForSubjects() {
        try {
            onSnapshot(query(collection(db, 'subjects')), (snapshot) => {
                this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 this.state.subjects.sort((a, b) => a.name.localeCompare(b.name));
                 // console.log("[teacherApp.js] Subjects updated from Firestore:", this.state.subjects.map(s => s.name)); // 로그 필요시 주석 해제
                 // ✨ 수정: 이벤트 디스패치는 데이터 업데이트 이후에!
                 document.dispatchEvent(new CustomEvent('subjectsUpdated'));
            });
        } catch (error) {
            console.error("[teacherApp.js] Error listening for subjects:", error);
            showToast("과목 목록 실시간 업데이트 실패");
        }
    },

    updateSubjectDropdowns() {
         // console.log("[teacherApp.js] updateSubjectDropdowns called."); // 로그 필요시 주석 해제
         let activeView = null;
         for (const viewName in this.elements.views) {
             if (this.elements.views[viewName]?.style.display === 'block') {
                 activeView = viewName; break;
             }
         }
         // console.log(`[teacherApp.js] Active view for dropdown update: ${activeView}`); // 로그 필요시 주석 해제

        if (activeView === 'lesson-mgmt') {
            this.populateSubjectSelectForMgmt();
        }
        if (this.elements.assignHomeworkModal?.style.display === 'flex') {
             if (this.homeworkDashboard?.populateSubjectsForHomeworkModal) {
                this.homeworkDashboard.populateSubjectsForHomeworkModal();
             }
        }
    },


    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.disabled = true;
        try {
            const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name")));
            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().name;
                select.appendChild(option);
            });
        } catch (error) {
            console.error("[teacherApp.js] Error populating class select:", error);
            select.innerHTML = '<option value="">-- 목록 로드 실패 --</option>';
            showToast("반 목록 로딩 실패");
        } finally {
            select.disabled = false;
        }
    },

    // --- 👇 populateSubjectSelectForMgmt 함수 수정 👇 ---
    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;
        // console.log("[teacherApp.js] Populating subject select for management..."); // 로그 필요시 주석 해제

        const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
        if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';

        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            select.appendChild(option);
        });

        if (currentSubjectId && this.state.subjects.some(s => s.id === currentSubjectId)) {
             select.value = currentSubjectId;
             this.state.selectedSubjectIdForMgmt = currentSubjectId;
             // console.log(`[teacherApp.js] Re-selected subject for management: ${currentSubjectId}`); // 로그 필요시 주석 해제
              if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'block';
              if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'none';

              // ✨ 수정: this.lessonManager 존재 확인 후 호출
              if (this.lessonManager) {
                  // console.log("[teacherApp.js] Calling lessonManager.handleLessonFilterChange..."); // 로그 필요시 주석 해제
                  this.lessonManager.handleLessonFilterChange(); // lessonManager.js의 wrapper 호출
              } else {
                  // 이 시점에 lessonManager가 없으면 초기화 로직 문제
                  console.error("[teacherApp.js] Error: this.lessonManager is undefined in populateSubjectSelectForMgmt.");
              }

        } else {
            // console.log("[teacherApp.js] No subject selected or previous selection invalid for management."); // 로그 필요시 주석 해제
            this.state.selectedSubjectIdForMgmt = null;
            if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
             select.value = '';
             if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
             if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
        }
        select.disabled = this.state.subjects.length === 0;
    },
    // --- 👆 populateSubjectSelectForMgmt 함수 수정 끝 👆 ---

     async saveQnaVideo() {
         const videoDate = this.elements.qnaVideoDateInput?.value;
         const title = this.elements.qnaVideoTitleInput?.value.trim();
         const youtubeUrl = this.elements.qnaVideoUrlInput?.value.trim();
         if (!this.state.selectedClassId) { showToast("반을 먼저 선택해주세요."); return; }
         if (!videoDate || !title || !youtubeUrl) { showToast("날짜, 제목, URL을 모두 입력해야 합니다."); return; }
         try {
             const docRef = await addDoc(collection(db, 'classVideos'), {
                 classId: this.state.selectedClassId, videoDate, title, youtubeUrl, createdAt: serverTimestamp()
             });
             showToast("질문 영상 저장 성공!", false);
             if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
             if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
         } catch (error) {
             console.error("[teacherApp.js] Error saving QnA video:", error);
             showToast("영상 저장 실패.");
         }
     },

     async loadQnaVideosForTeacher(selectedDate = this.elements.qnaVideoDateInput?.value) {
         const listEl = this.elements.qnaVideosList;
         if (!listEl) {
             console.error("[teacherApp.js] QnA video list element (qna-videos-list-teacher) not found.");
             return;
         }
         if (!this.state.selectedClassId || !selectedDate) {
             listEl.innerHTML = '<p class="text-sm text-slate-500">반이나 날짜를 선택해주세요.</p>';
             return;
         }
         listEl.innerHTML = '<div class="loader-small mx-auto"></div>';
         try {
             const q = query(
                 collection(db, 'classVideos'),
                 where('classId', '==', this.state.selectedClassId),
                 where('videoDate', '==', selectedDate),
                 orderBy('createdAt', 'desc')
             );
             const snapshot = await getDocs(q);
             listEl.innerHTML = '';
             if (snapshot.empty) {
                 listEl.innerHTML = '<p class="text-sm text-slate-500">해당 날짜에 등록된 질문 영상이 없습니다.</p>';
                 return;
             }
             snapshot.docs.forEach(docSnap => {
                 const video = docSnap.data();
                 const videoId = docSnap.id;
                 const div = document.createElement('div');
                 div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white shadow-sm';
                 div.innerHTML = `
                     <div class="flex-grow mr-4 overflow-hidden">
                         <p class="font-medium text-slate-700 break-words">${video.title || '제목 없음'}</p>
                         <a href="${video.youtubeUrl}" target="_blank" rel="noopener noreferrer" class="text-xs text-blue-500 hover:underline break-all block">${video.youtubeUrl || 'URL 없음'}</a>
                     </div>
                     <button data-id="${videoId}" class="delete-qna-video-btn btn btn-danger btn-sm flex-shrink-0">삭제</button>
                 `;
                 div.querySelector('.delete-qna-video-btn')?.addEventListener('click', async (e) => {
                     const videoDocId = e.target.dataset.id;
                     if (confirm(`'${video.title}' 영상을 정말 삭제하시겠습니까?`)) {
                         try {
                             await deleteDoc(doc(db, 'classVideos', videoDocId));
                             showToast("영상이 삭제되었습니다.", false);
                             this.loadQnaVideosForTeacher();
                         } catch (err) {
                             console.error("[teacherApp.js] Error deleting QnA video:", err);
                             showToast("영상 삭제 실패");
                         }
                     }
                 });
                 listEl.appendChild(div);
             });
         } catch (error) {
             console.error("[teacherApp.js] Error loading QnA videos:", error);
             listEl.innerHTML = '<p class="text-red-500">영상 목록 로딩 실패</p>';
             showToast("질문 영상 목록 로딩 중 오류 발생", true);
         }
     },
}; // TeacherApp 객체 끝

document.addEventListener('DOMContentLoaded', () => {
    TeacherApp.init();
});

export default TeacherApp;