// src/teacher/teacherApp.js

import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, addDoc, serverTimestamp } from "firebase/firestore"; // ✅ addDoc, serverTimestamp 추가
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

import { lessonDashboard } from './lessonDashboard.js';
import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js';
import { classVideoManager } from './classVideoManager.js'; // ✅ 신규 모듈 import

const TeacherApp = {
    isInitialized: false,
    elements: {},
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null, // ✅ 여기에 classType 포함될 예정
        studentsInClass: new Map(),
        subjects: [],
        selectedSubjectId: null, // 학습 현황용 (이제 사용 안 함)
        selectedLessonId: null, // 학습 현황용 (이제 사용 안 함)
        selectedHomeworkId: null,
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        editingClass: null,
    },

    init() {
        this.cacheElements();

        // 기존 로그인 로직 유지
        this.elements.loginBtn?.addEventListener('click', () => {
             // ✅ 실제 로그인 로직에서는 Firebase Auth 사용 권장
             // 현재는 teacherAuth.js가 없으므로 임시로 하드코딩된 이름/비번 로직 사용
             const email = this.elements.emailInput?.value; // ✅ emailInput 사용 (teacherAuth.js 미사용 시 가정)
             const password = this.elements.passwordInput?.value;
             this.handleLogin(email, password); // ✅ email 전달하도록 수정
        });

        this.elements.passwordInput?.addEventListener('keyup', (e) => {
             if (e.key === 'Enter') {
                 const email = this.elements.emailInput?.value; // ✅ emailInput 사용
                 const password = this.elements.passwordInput?.value;
                 this.handleLogin(email, password); // ✅ email 전달하도록 수정
             }
        });

        // ✅ 교사 로그인 로직 변경 (Firebase Auth 미사용 가정)
        // ensureAuthWithRole(['teacher', 'admin'], (user) => {
        //     this.showDashboard(user);
        // });
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'flex';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'none';
    },

    // ✅ 로그인 핸들러 수정 (Firebase Auth 미사용 시 이름/비번 기반으로 변경)
    async handleLogin(email, password) {
        if (!email || !password) {
            showToast("이메일과 비밀번호를 모두 입력해주세요."); // 이름 -> 이메일로 변경
            return;
        }

        try {
            // Firestore 'teachers' 컬렉션에서 이메일과 비밀번호로 사용자 조회
            const q = query(collection(db, 'teachers'), where("email", "==", email), where("password", "==", password));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const userDoc = querySnapshot.docs[0];
                const userData = userDoc.data();
                showToast(`환영합니다, ${userData.name} 선생님!`, false);
                this.showDashboard(userDoc.id, userData); // 사용자 ID와 데이터 전달
            } else {
                 // 관리자 계정도 확인 (임시 방편)
                 const adminQ = query(collection(db, 'admins'), where("email", "==", email), where("password", "==", password));
                 const adminSnapshot = await getDocs(adminQ);
                 if(!adminSnapshot.empty) {
                     const adminDoc = adminSnapshot.docs[0];
                     const adminData = adminDoc.data();
                     showToast(`환영합니다, ${adminData.name} 관리자님!`, false);
                     this.showDashboard(adminDoc.id, adminData); // 관리자 ID와 데이터 전달
                 } else {
                    showToast("이메일 또는 비밀번호가 일치하지 않습니다.");
                 }
            }
        } catch (error) {
            console.error("Login error:", error);
            showToast("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
        }
    },


    // ✅ showDashboard 인자 수정: user -> userId, userData
    showDashboard(userId, userData) {
        if (this.elements.loginContainer) this.elements.loginContainer.style.display = 'none';
        if (this.elements.dashboardContainer) this.elements.dashboardContainer.style.display = 'block';

        this.initializeDashboard(); // 대시보드 초기화

         // ✅ 초기 비밀번호 변경 로직 (teacherAuth.js 미사용 시 가정)
         if (userData.isInitialPassword === true && userData.role !== 'admin') { // 관리자는 제외
             this.promptPasswordChange(userId);
         }
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;

        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.classVideoManager = classVideoManager; // ✅ 신규 모듈 초기화

        this.homeworkDashboard.init(this);
        this.lessonManager.init(this);
        this.classEditor.init(this);
        this.classVideoManager.init(this); // ✅ 신규 모듈 초기화

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects();
        this.showDashboardMenu(); // 메뉴 먼저 표시
    },

     // ✅ 비밀번호 변경 로직 추가 (teacherAuth.js 미사용 시 가정)
     async promptPasswordChange(teacherId) {
         const newPassword = prompt("최초 로그인입니다. 사용할 새 비밀번호를 입력하세요 (6자리 이상).");
         if (newPassword && newPassword.length >= 6) {
             try {
                 const teacherRef = doc(db, 'teachers', teacherId);
                 // ❗ 보안 주의: 실제 운영 환경에서는 비밀번호 해싱 필요 (Cloud Function 등 사용)
                 await updateDoc(teacherRef, {
                     password: newPassword, // 임시로 평문 저장 (보안 취약!)
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
            emailInput: document.getElementById('teacher-email'), // ✅ nameInput -> emailInput
            passwordInput: document.getElementById('teacher-password'),
            loginBtn: document.getElementById('teacher-login-btn'),
            classSelect: document.getElementById('teacher-class-select'),
            mainContent: document.getElementById('teacher-main-content'),
            navButtonsContainer: document.getElementById('teacher-navigation-buttons'),
            views: {
                'homework-dashboard': document.getElementById('view-homework-dashboard'),
                'qna-video-mgmt': document.getElementById('view-qna-video-mgmt'), // 기존 질문 영상
                'lesson-mgmt': document.getElementById('view-lesson-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'), // ✅ 신규 수업 영상 뷰
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

            // 학습 관리 요소 (기존 유지, ID 접두사 확인 필요)
            lessonMgmtControls: document.getElementById('lesson-mgmt-controls'),
            subjectSelectForMgmt: document.getElementById('teacher-subject-select-mgmt'),
            lessonsManagementContent: document.getElementById('teacher-lessons-management-content'),
            lessonPrompt: document.getElementById('teacher-lesson-prompt'),
            lessonsList: document.getElementById('teacher-lessons-list'),
            saveOrderBtn: document.getElementById('teacher-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('teacher-show-new-lesson-modal-btn'),
            modal: document.getElementById('teacher-new-lesson-modal'), // 학습 세트 모달
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
            videoRevUrlsContainer: (type) => `teacher-video${type}-rev-urls-container`, // 함수 형태로 유지

            // 반 설정 요소 (기존 유지)
            editClassBtn: document.getElementById('teacher-edit-class-btn'),
            editClassModal: document.getElementById('teacher-edit-class-modal'),
            editClassName: document.getElementById('teacher-edit-class-name'),
            closeEditClassModalBtn: document.getElementById('teacher-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('teacher-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('teacher-save-class-edit-btn'),
            editClassSubjectsContainer: document.getElementById('teacher-edit-class-subjects-and-textbooks'),
            // ✅ 반 유형 select 요소 추가
            editClassTypeSelect: document.getElementById('teacher-edit-class-type'),

            // 기존 질문 영상 요소 (qna 접두사 사용)
            qnaVideoDateInput: document.getElementById('qna-video-date'),
            qnaVideoTitleInput: document.getElementById('qna-video-title'),
            qnaVideoUrlInput: document.getElementById('qna-video-url'),
            saveQnaVideoBtn: document.getElementById('save-qna-video-btn'),

            // ✅ 신규 수업 영상 관리 요소 (class 접두사 사용)
            classVideoDateInput: document.getElementById('class-video-date'),
            classVideoListContainer: document.getElementById('class-video-list-container'),
            addClassVideoFieldBtn: document.getElementById('add-class-video-field-btn'),
            saveClassVideoBtn: document.getElementById('save-class-video-btn'),
            // ✅ 수업 영상 관리 메뉴 버튼 ID 추가
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
         // ✅ 기존 질문 영상 저장 버튼 이벤트 리스너 추가 (qnaVideoManager 미사용 시)
         this.elements.saveQnaVideoBtn?.addEventListener('click', () => this.saveQnaVideo());
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

         // ✅ 반 유형에 따라 '수업 영상 관리' 메뉴 표시/숨김
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
                 // 기존 질문 영상 로직 유지
                 if(this.elements.qnaVideoDateInput) this.elements.qnaVideoDateInput.value = '';
                 if(this.elements.qnaVideoTitleInput) this.elements.qnaVideoTitleInput.value = '';
                 if(this.elements.qnaVideoUrlInput) this.elements.qnaVideoUrlInput.value = '';
                break;
             // ✅ 신규 수업 영상 뷰 로직 추가
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

     // ✅ updateSubjectDropdowns 수정: 현재 활성화된 뷰에 따라 필요한 드롭다운만 업데이트
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


    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.disabled = true;
        try {
            const snapshot = await getDocs(query(collection(db, 'classes'), orderBy("name"))); // 이름순 정렬 추가
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

     // ✅ 기존 질문 영상 저장 함수 추가 (qnaVideoManager 미사용 시)
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
};

document.addEventListener('DOMContentLoaded', () => {
    TeacherApp.init(); // Firebase Auth 사용 안 하므로 바로 init 호출
});

export default TeacherApp;