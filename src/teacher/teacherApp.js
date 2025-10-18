// src/teacher/teacherApp.js

// FIX: orderBy를 import 목록에 추가하여 ReferenceError 해결
import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, addDoc, serverTimestamp, orderBy } from "firebase/firestore"; 
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
    },

    init() {
        this.cacheElements();

        // 로그인 로직 (이름/비밀번호 사용)
        this.elements.loginBtn?.addEventListener('click', () => {
             const name = this.elements.nameInput?.value; // ✅ 수정: nameInput 사용
             const password = this.elements.passwordInput?.value;
             this.handleLogin(name, password); // ✅ 수정: 이름(name) 전달
        });

        this.elements.passwordInput?.addEventListener('keyup', (e) => {
             if (e.key === 'Enter') {
                 const name = this.elements.nameInput?.value; // ✅ 수정: nameInput 사용
                 const password = this.elements.passwordInput?.value;
                 this.handleLogin(name, password); // ✅ 수정: 이름(name) 전달
             }
        });

        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'flex';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'none';
    },

    // ✅ 로그인 핸들러: 이름(name)과 비밀번호로 조회하도록 수정
    async handleLogin(name, password) {
        if (!name || !password) {
            showToast("이름과 비밀번호를 모두 입력해주세요."); // ✅ 메시지 수정
            return;
        }

        try {
            // Firestore 'teachers' 컬렉션에서 이름과 비밀번호로 사용자 조회
            const q = query(collection(db, 'teachers'), where("name", "==", name), where("password", "==", password)); // ✅ 수정: "email" -> "name"
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                showToast(`환영합니다, ${userData.name} 선생님!`, false);
                this.showDashboard(userDoc.id, userData); 
            } else {
                 // 관리자 계정
                 const adminQ = query(collection(db, 'admins'), where("name", "==", name), where("password", "==", password)); // ✅ 수정: "email" -> "name"
                 const adminSnapshot = await getDocs(adminQ);
                 if(!adminSnapshot.empty) {
                     const adminDoc = adminSnapshot.docs[0];
                     const adminData = adminDoc.data();
                     showToast(`환영합니다, ${adminData.name} 관리자님!`, false);
                     this.showDashboard(adminDoc.id, adminData); 
                 } else {
                    showToast("이름 또는 비밀번호가 일치하지 않습니다."); // ✅ 메시지 수정
                 }
            }
        } catch (error) {
            console.error("Login error:", error);
            if (error.code === 'permission-denied') {
                 showToast("로그인 정보 조회 권한이 부족합니다. (Firebase 규칙 확인 필요)");
            } else {
                showToast("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
            }
        }
    },


    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';

        this.initializeDashboard(); 

         if (userData.isInitialPassword === true && userData.role !== 'admin') { 
             this.promptPasswordChange(userId);
         }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager; 

        this.homeworkDashboard.init(this);
        this.lessonManager.init(this);
        this.classEditor.init(this);
        this.classVideoManager.init(this); 

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects();
        this.showDashboardMenu(); 
    },

     // 비밀번호 변경 로직 (기존 유지)
     async promptPasswordChange(teacherId) {
         const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
         if (newPassword && newPassword.length >= 6) {
             try {
                 const teacherRef = doc(db, 'teachers', teacherId);
                 await updateDoc(teacherRef, {
                     password: newPassword,
                     isInitialPassword: false
                 });
                 showToast("비밀번호가 성공적으로 변경되었습니다.", false);
             } catch (error) {
                 console.error("비밀번호 변경 실패:", error);
                 showToast("비밀번호 변경에 실패했습니다.");
             }
         } else if (newPassword) {
             showToast("비밀번호는 6자리 이상이어야 합니다.");
         } else {
             showToast("비밀번호 변경이 취소되었습니다.");
         }
     },

    cacheElements() {
        this.elements = {
            loginContainer: document.getElementById('teacher-login-container'),
            dashboardContainer: document.getElementById('teacher-dashboard-container'),
            nameInput: document.getElementById('teacher-name'), // ✅ 수정: nameInput 사용
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
            // 숙제 현황 요소 (기존 유지)
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

            // 학습 관리 요소 (기존 유지)
            lessonMgmtControls: document.getElementById('lesson-mgmt-controls'),
            subjectSelectForMgmt: document.getElementById('teacher-subject-select-mgmt'),
            lessonsManagementContent: document.getElementById('teacher-lessons-management-content'),
            lessonPrompt: document.getElementById('teacher-lesson-prompt'),
            lessonsList: document.getElementById('teacher-lessons-list'),
            saveOrderBtn: document.getElementById('teacher-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('teacher-show-new-lesson-modal-btn'),
            modal: document.getElementById('teacher-new-lesson-modal'), 
            modalTitle: document.getElementById('teacher-lesson-modal-title'),
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

            // 반 설정 요소 (기존 유지)
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            // 반 유형 select 요소 추가
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),

            // 기존 질문 영상 요소 (qna 접두사 사용)
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),
            // ✅ 추가: 질문 영상을 표시할 컨테이너
            qnaVideoListContainer: document.getElementById('qna-video-list-teacher-container'), // (index.html에 추가되어야 함)
            qnaVideosList: document.getElementById('qna-videos-list-teacher'), // (index.html에 추가되어야 함)

            // 신규 수업 영상 관리 요소 (class 접두사 사용)
            classVideoDateInput: document.getElementById('class-video-date'),
            classVideoListContainer: document.getElementById('class-video-list-container'),
            addClassVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveClassVideoBtn: document.getElementById('save-class-video-btn'),
            // 수업 영상 관리 메뉴 버튼 ID 추가
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),

        };
    },

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
         // 메뉴로 돌아가기 버튼에 대한 이벤트 위임
         if (this.elements.mainContent) {
             this.elements.mainContent.addEventListener('click', (e) => {
                 if (e.target.classList.contains('back-to-teacher-menu')) {
                     this.showDashboardMenu();
                 }
             });
         }
         // 기존 질문 영상 저장 버튼 이벤트 리스너 추가 (qnaVideoManager 미사용 시)
         this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo().then(() => this.loadQnaVideosForTeacher())); // ✅ 저장 후 바로 조회
         this.elements.qnaVideoDateInput?.addEventListener('change', () => this.loadQnaVideosForTeacher()); // ✅ 날짜 변경 시 조회
    },

    // 메인 메뉴(카드 그리드)를 보여주는 함수
    showDashboardMenu() {
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'grid'; // 카드 그리드 표시
        }
        // 모든 특정 뷰 div 숨기기
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });

         // 반 유형에 따라 '수업 영상 관리' 메뉴 표시/숨김
         if (this.elements.gotoClassVideoMgmtBtn) {
            const isLiveLecture = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLiveLecture ? 'flex' : 'none';
         }
    },


    handleViewChange(viewName) {
        // 카드 네비게이션 그리드 숨기기
        if (this.elements.navButtonsContainer) {
            this.elements.navButtonsContainer.style.display = 'none';
        }

        // 먼저 모든 특정 뷰 숨기기
        Object.values(this.elements.views).forEach(view => {
            if (view) view.style.display = 'none';
        });

        // 선택된 뷰 표시
        const viewToShow = this.elements.views[viewName];
        if (viewToShow) {
            viewToShow.style.display = 'block';
        } else {
             this.showDashboardMenu(); // 뷰가 없으면 메뉴 표시
             return;
        }


        // 각 뷰가 표시될 때의 특정 로직
        switch (viewName) {
            case 'homework-dashboard':
                // 기존 숙제 로직 유지
                if (this.elements.homeworkDashboardControls) this.elements.homeworkDashboardControls.style.display = 'flex';
                if (this.elements.homeworkManagementButtons) this.elements.homeworkManagementButtons.style.display = this.state.selectedHomeworkId ? 'flex' : 'none';
                if (this.elements.homeworkContent) this.elements.homeworkContent.style.display = this.state.selectedHomeworkId ? 'block' : 'none';
                this.homeworkDashboard.populateHomeworkSelect();
                if(this.elements.homeworkSelect) {
                     this.elements.homeworkSelect.value = '';
                     this.elements.homeworkSelect.dispatchEvent(new Event('change'));
                }
                break;
            case 'lesson-mgmt':
                 // 기존 학습 관리 로직 유지
                 if (this.elements.lessonMgmtControls) this.elements.lessonMgmtControls.style.display = 'block';
                 if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = this.state.selectedSubjectIdForMgmt ? 'block' : 'none';
                 if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = this.state.selectedSubjectIdForMgmt ? 'none' : 'block';
                 this.populateSubjectSelectForMgmt();
                 if(this.elements.subjectSelectForMgmt) {
                     this.elements.subjectSelectForMgmt.value = '';
                     this.elements.subjectSelectForMgmt.dispatchEvent(new Event('change'));
                }
                break;
            case 'qna-video-mgmt':
                 // ✅ 수정: 질문 영상 뷰 진입 시 오늘 날짜로 조회
                 const today = new Date().toISOString().slice(0, 10);
                 if(this.elements.qnaVideoDateInput) this.elements.qnaVideoDateInput.value = today;
                 this.loadQnaVideosForTeacher(today); 
                 if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
                 if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
                break;
             // 신규 수업 영상 뷰 로직 추가
             case 'class-video-mgmt':
                 this.classVideoManager.initView(); // 뷰 초기화 (날짜 설정 및 비디오 로드)
                 break;
            case 'class-mgmt':
                break; // 반 설정은 모달로 처리되므로 특별한 초기화 X
            default:
                 this.showDashboardMenu();
                 break;
        }
    },


    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        const newClassId = selectedOption.value;

        // 같은 반을 다시 선택하면 아무 작업 안 함
        // if (newClassId === this.state.selectedClassId) return; // 주석 처리: 반 데이터를 다시 로드하기 위해

        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = selectedOption.text;
        // 반 변경 시 관련 상태 초기화
        this.state.selectedHomeworkId = null;
        this.state.selectedSubjectIdForMgmt = null;


        if (!this.state.selectedClassId) {
            if(this.elements.mainContent) this.elements.mainContent.style.display = 'none';
             this.showDashboardMenu(); // 메뉴 숨기기 추가
            return;
        }

        if(this.elements.mainContent) this.elements.mainContent.style.display = 'block';
        await this.fetchClassData(this.state.selectedClassId); // 반 데이터(classType 포함) 다시 로드
        this.showDashboardMenu(); // 반 선택 후 기본 메뉴 표시 (classType에 따라 버튼 표시 여부 결정됨)
    },

    async fetchClassData(classId) {
        this.state.studentsInClass.clear();
        try {
            // 학생 목록 가져오기
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));

            // 반 상세 정보(classType 포함) 가져오기
            const classDoc = await getDoc(doc(db, 'classes', classId));
            this.state.selectedClassData = classDoc.exists() ? { id: classDoc.id, ...classDoc.data() } : null;

            // 반 데이터 로드 완료 이벤트 발생
            document.dispatchEvent(new CustomEvent('class-changed'));
        } catch (error) {
            console.error("반 데이터 로딩 실패:", error);
            showToast("반 정보를 불러오는 데 실패했습니다.");
            this.state.selectedClassData = null;
            this.state.studentsInClass.clear();
        }
    },

    listenForSubjects() {
        try {
            onSnapshot(query(collection(db, 'subjects')), (snapshot) => {
                this.state.subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 this.state.subjects.sort((a, b) => a.name.localeCompare(b.name)); // 이름순 정렬 추가
                this.updateSubjectDropdowns(); // 드롭다운 업데이트
            });
        } catch (error) {
            console.error("과목 실시간 업데이트 실패:", error);
            showToast("과목 목록 업데이트에 실패했습니다.");
        }
    },

     // updateSubjectDropdowns 수정: 현재 활성화된 뷰에 따라 필요한 드롭다운만 업데이트
    updateSubjectDropdowns() {
         let activeView = null;
         for (const viewName in this.elements.views) {
             if (this.elements.views[viewName] && this.elements.views[viewName].style.display === 'block') {
                 activeView = viewName;
                 break;
             }
         }

        if (activeView === 'lesson-mgmt') {
            this.populateSubjectSelectForMgmt();
        }
         // 숙제 모달이 열려 있을 때만 숙제 모달의 과목 드롭다운 업데이트
        if (this.elements.assignHomeworkModal && this.elements.assignHomeworkModal.style.display === 'flex') {
             // homeworkDashboard 모듈에 해당 함수가 있는지 확인 후 호출
             if (this.homeworkDashboard && typeof this.homeworkDashboard.populateSubjectsForHomeworkModal === 'function') {
                this.homeworkDashboard.populateSubjectsForHomeworkModal();
             }
        }
    },


    // FIX: populateClassSelect에서 orderBy가 정의되도록 수정
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
            console.error("반 목록 로딩 실패:", error);
            select.innerHTML = '<option value="">-- 목록 로드 실패 --</option>';
            showToast("반 목록을 불러오는 데 실패했습니다.");
        } finally {
            select.disabled = false;
        }
    },

    populateSubjectSelectForMgmt() {
        const select = this.elements.subjectSelectForMgmt;
        if (!select) return;

        const currentSubjectId = select.value || this.state.selectedSubjectIdForMgmt; // 현재 값 유지 시도

        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
        if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';

        // 과목 목록 채우기 (state.subjects 사용)
        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            select.appendChild(option);
        });

        // 이전에 선택된 과목이 여전히 존재하면 다시 선택
        if (currentSubjectId && this.state.subjects.some(s => s.id === currentSubjectId)) {
             select.value = currentSubjectId;
             this.state.selectedSubjectIdForMgmt = currentSubjectId; // state 업데이트
              if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'block';
              if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'none';
              this.lessonManager.handleLessonFilterChange(); // lessonManager의 함수 호출
        } else {
            // 이전에 선택한 과목이 없거나 사라졌으면 초기화
            this.state.selectedSubjectIdForMgmt = null;
            if (this.elements.lessonsList) this.elements.lessonsList.innerHTML = '';
             select.value = ''; // 드롭다운도 초기화
             if (this.elements.lessonsManagementContent) this.elements.lessonsManagementContent.style.display = 'none';
             if (this.elements.lessonPrompt) this.elements.lessonPrompt.style.display = 'block';
        }

        select.disabled = this.state.subjects.length === 0;
    },

     // 기존 질문 영상 저장 함수
     async saveQnaVideo() {
         const videoDate = this.elements.qnaVideoDateInput?.value;
         const title = this.elements.qnaVideoTitleInput?.value.trim();
         const youtubeUrl = this.elements.qnaVideoUrlInput?.value.trim();

         if (!this.state.selectedClassId) {
             showToast("영상을 저장할 반을 먼저 선택해주세요.");
             return;
         }

         if (!videoDate || !title || !youtubeUrl) {
             showToast("날짜, 제목, URL을 모두 입력해야 합니다.");
             return;
         }

         try {
             await addDoc(collection(db, 'classVideos'), {
                 classId: this.state.selectedClassId,
                 videoDate,
                 title,
                 youtubeUrl,
                 createdAt: serverTimestamp()
             });
             showToast("질문 영상이 성공적으로 저장되었습니다.", false);
             if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
             if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
             // 날짜는 유지할 수도 있음
         } catch (error) {
             console.error("질문 영상 저장 실패:", error);
             showToast("영상 저장에 실패했습니다.");
         }
     },
     
     // ✅ 추가된 기능: 선생님 앱에서 질문 영상 목록 조회
     async loadQnaVideosForTeacher(selectedDate = this.elements.qnaVideoDateInput?.value) {
         const listEl = document.getElementById('qna-videos-list-teacher'); // index.html에 이 ID를 가진 요소가 있다고 가정
         if (!listEl || !this.state.selectedClassId || !selectedDate) {
             if (listEl) listEl.innerHTML = '<p class="text-sm text-slate-500">반이나 날짜를 선택해주세요.</p>';
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

             snapshot.docs.forEach(doc => {
                 const video = doc.data();
                 const div = document.createElement('div');
                 div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white';
                 div.innerHTML = `
                     <div class="flex-grow">
                         <p class="font-medium text-slate-700">${video.title}</p>
                         <a href="${video.youtubeUrl}" target="_blank" class="text-xs text-blue-500 hover:underline truncate w-64 block">${video.youtubeUrl}</a>
                     </div>
                     `;
                 listEl.appendChild(div);
             });

         } catch (error) {
             console.error("질문 영상 조회 실패:", error);
             listEl.innerHTML = '<p class="text-red-500">영상 목록을 불러오는 데 실패했습니다.</p>';
         }
     },
};

document.addEventListener('DOMContentLoaded', () => {
    TeacherApp.init(); 
});

export default TeacherApp;