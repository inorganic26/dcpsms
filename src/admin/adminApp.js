// src/admin/adminApp.js — 공용 유지형 컨트롤러(경로 수정 안정화 버전, 목록 갱신 보강)

import { signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

// 공용 기반 모듈
import { studentManager } from "./studentManager.js";
import { classManager } from "./classManager.js";
import { studentAssignmentManager } from "./studentAssignmentManager.js";
import { lessonManager } from "./lessonManager.js";
import { adminClassVideoManager } from "./adminClassVideoManager.js";
import { adminHomeworkDashboard } from "./adminHomeworkDashboard.js";
import { reportManager } from "../shared/reportManager.js";

// 스텁 모듈 (실제 구현 시 교체 필요)
const subjectManager = {
    init(app) { this.app = app; },
    renderList() { console.warn("subjectManager.renderList is a stub."); },
    addNewSubject() { showToast("과목 매니저 파일이 아직 연결되지 않았어요."); }
};
const textbookManager = {
    init(app) { this.app = app; },
    handleSubjectSelectForTextbook() { showToast("교재 매니저 파일이 아직 연결되지 않았어요."); },
    addNewTextbook() { showToast("교재 매니저 파일이 아직 연결되지 않았어요."); }
};
const teacherManager = {
    init(app) { this.app = app; },
    renderList(teachers) { 
        const listEl = this.app.elements.teachersList;
        if (!listEl) return;
        listEl.innerHTML = "";
        if (teachers.length === 0) {
          listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교사가 없습니다.</p>';
        } else {
             teachers.forEach((teacher) => {
                 const div = document.createElement("div");
                 div.className = "p-3 border rounded-lg flex items-center justify-between";
                 const emailDisplay = teacher.email ? `(${teacher.email})` : "(이메일 미등록)";
                 div.innerHTML = `
                    <div>
                        <p class="font-medium text-slate-700">${teacher.name} ${emailDisplay}</p>
                        <p class="text-xs text-slate-500">${teacher.phone || "번호없음"}</p>
                    </div>
                    <div class="flex gap-2">
                        <button data-id="${teacher.id}" class="edit-teacher-btn text-blue-500 text-sm font-semibold">수정</button>
                        <button data-id="${teacher.id}" class="reset-password-btn text-gray-500 text-sm font-semibold">비밀번호 초기화</button>
                        <button data-id="${teacher.id}" class="delete-teacher-btn text-red-500 text-sm font-semibold">삭제</button>
                    </div>`;
                 listEl.appendChild(div);
             });
        }
    },
    addNewTeacher() { showToast("교사 매니저 파일이 아직 연결되지 않았어요."); }
};

// adminClassVideoManagerConfig를 위한 상수
const adminClassVideoManagerConfig = {
    elements: {
        qnaClassSelect: 'admin-qna-class-select',
        lectureClassSelect: 'admin-class-video-class-select',
    }
};


export const AdminApp = {
    isInitialized: false,
    elements: {},
    state: {
        currentView: "dashboard",
        teachers: [],
        students: [],
        subjects: [],
        classes: [],
        selectedSubjectIdForTextbook: null,
        editingClass: null,
        selectedClassIdForHomework: null,
        selectedHomeworkId: null,
        studentsInClass: new Map(),
        selectedSubjectIdForMgmt: null,
        lessons: [],
        editingLesson: null,
        generatedQuiz: null,
        selectedClassIdForQnaVideo: null,
        selectedClassIdForClassVideo: null,
        editingQnaVideoId: null,
        editingClassVideoIndex: null,
        selectedReportClassId: null,
        selectedReportDate: null,
        uploadedReports: [],
    },

    // 앱 초기화 함수
    async init() {
        console.log("[AdminApp.init] 초기화 시작");
        if (this.isInitialized) return;

        this.cacheElements();
        this.showLoginScreen();
        this.addEventListeners();

        try {
            await signInAnonymously(auth);
            console.log("[AdminApp.init] Firebase 익명 로그인 성공");
        } catch (e) {
            console.error("[AdminApp.init] 익명 로그인 실패", e);
            showToast("Firebase 인증 초기화 실패", true);
        }

        console.log("[AdminApp.init] 기본 초기화 완료");
    },

    // HTML 요소 ID를 기반으로 요소를 찾아 elements 객체에 저장
    cacheElements() {
        this.elements = {
            // 로그인 화면
            initialLogin: document.getElementById("admin-initial-login"),
            secretPasswordInput: document.getElementById("admin-secret-password"),
            secretLoginBtn: document.getElementById("admin-secret-login-btn"),
            mainDashboard: document.getElementById("admin-main-dashboard"),

            // 각 섹션 뷰 컨테이너
            dashboardView: document.getElementById("admin-dashboard-view"),
            subjectMgmtView: document.getElementById("admin-subject-mgmt-view"),
            textbookMgmtView: document.getElementById("admin-textbook-mgmt-view"),
            classMgmtView: document.getElementById("admin-class-mgmt-view"),
            studentMgmtView: document.getElementById("admin-student-mgmt-view"),
            teacherMgmtView: document.getElementById("admin-teacher-mgmt-view"),
            studentAssignmentView: document.getElementById("admin-student-assignment-view"),
            lessonMgmtView: document.getElementById("admin-lesson-mgmt-view"),
            qnaVideoMgmtView: document.getElementById("admin-qna-video-mgmt-view"),
            classVideoMgmtView: document.getElementById("admin-class-video-mgmt-view"),
            homeworkMgmtView: document.getElementById("admin-homework-mgmt-view"),
            reportMgmtView: document.getElementById("admin-report-mgmt-view"),

            // 대시보드 메뉴 버튼들 (ID로 직접 찾아서 캐싱)
            gotoSubjectMgmtBtn: document.getElementById("goto-subject-mgmt-btn"),
            gotoTextbookMgmtBtn: document.getElementById("goto-textbook-mgmt-btn"),
            gotoClassMgmtBtn: document.getElementById("goto-class-mgmt-btn"),
            gotoStudentMgmtBtn: document.getElementById("goto-student-mgmt-btn"),
            gotoTeacherMgmtBtn: document.getElementById("goto-teacher-mgmt-btn"),
            gotoStudentAssignmentBtn: document.getElementById("goto-student-assignment-btn"),
            gotoLessonMgmtBtn: document.getElementById("goto-lesson-mgmt-btn"),
            gotoQnaVideoMgmtBtn: document.getElementById("goto-qna-video-mgmt-btn"),
            gotoClassVideoMgmtBtn: document.getElementById("goto-class-video-mgmt-btn"),
            gotoHomeworkMgmtBtn: document.getElementById("goto-homework-mgmt-btn"),
            gotoReportMgmtBtn: document.getElementById("goto-report-mgmt-btn"),

            // 과목 관리 뷰 요소
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),

            // 교재 관리 뷰 요소
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),

            // 반 관리 뷰 요소
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),

            // 학생 관리 뷰 요소
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPhoneInput: document.getElementById('admin-new-student-phone'),
            newParentPhoneInput: document.getElementById('admin-new-parent-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),

            // 교사 관리 뷰 요소
            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherEmailInput: document.getElementById('admin-new-teacher-email'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),
            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherEmailInput: document.getElementById('admin-edit-teacher-email'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),

             // 학생 수정 모달 요소
             editStudentModal: document.getElementById('admin-edit-student-modal'),
             editStudentNameInput: document.getElementById('admin-edit-student-name'),
             editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
             editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),
             closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
             cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
             saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),

             // 반 수정 모달 요소
             editClassModal: document.getElementById('admin-edit-class-modal'),
             editClassName: document.getElementById('admin-edit-class-name'),
             closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
             cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
             saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
             editClassSubjectsContainer: document.getElementById('admin-edit-class-subjects-and-textbooks'),
             editClassTypeSelect: document.getElementById('admin-edit-class-type'),

            // 학습 세트 관리 뷰 요소
            subjectSelectForMgmt: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            showNewLessonModalBtn: document.getElementById('admin-show-new-lesson-modal-btn'),
            modal: document.getElementById('admin-new-lesson-modal'),
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            closeModalBtn: document.getElementById('admin-close-modal-btn'),
            cancelBtn: document.getElementById('admin-cancel-btn'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'),
            video2Url: document.getElementById('admin-video2-url'),
            addVideo1RevBtn: document.getElementById('admin-add-video1-rev-btn'),
            addVideo2RevBtn: document.getElementById('admin-add-video2-rev-btn'),
            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'),
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),

            // QnA 영상 관리 요소
            qnaVideoDateInput: document.getElementById('admin-qna-video-date'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoTitleInput: document.getElementById('admin-qna-video-title'),
            qnaVideoUrlInput: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            qnaVideosList: document.getElementById('admin-qna-videos-list'),

            // 수업 영상 관리 요소
            lectureVideoDateInput: document.getElementById('admin-class-video-date'),
            lectureClassSelect: document.getElementById('admin-class-video-class-select'),
            lectureVideoListContainer: document.getElementById('admin-class-video-list-container'),
            saveLectureVideoBtn: document.getElementById('admin-save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('admin-class-video-title'),
            lectureVideoUrlInput: document.getElementById('admin-class-video-url'),

             // 숙제 관리 뷰 요소
             homeworkClassSelect: document.getElementById('admin-homework-class-select'),
             homeworkMainContent: document.getElementById('admin-homework-main-content'),
             homeworkSelect: document.getElementById('admin-homework-select'),
             assignHomeworkBtn: document.getElementById('admin-assign-homework-btn'),
             homeworkManagementButtons: document.getElementById('admin-homework-management-buttons'),
             editHomeworkBtn: document.getElementById('admin-edit-homework-btn'),
             deleteHomeworkBtn: document.getElementById('admin-delete-homework-btn'),
             homeworkContent: document.getElementById('admin-homework-content'),
             selectedHomeworkTitle: document.getElementById('admin-selected-homework-title'),
             homeworkTableBody: document.getElementById('admin-homework-table-body'),
             assignHomeworkModal: document.getElementById('admin-assign-homework-modal'),
             homeworkModalTitle: document.getElementById('admin-homework-modal-title'),
             closeHomeworkModalBtn: document.getElementById('admin-close-homework-modal-btn'),
             cancelHomeworkBtn: document.getElementById('admin-cancel-homework-btn'),
             saveHomeworkBtn: document.getElementById('admin-save-homework-btn'),
             homeworkSubjectSelect: document.getElementById('admin-homework-subject-select'),
             homeworkTextbookSelect: document.getElementById('admin-homework-textbook-select'),
             homeworkPagesInput: document.getElementById('admin-homework-pages'),
             homeworkDueDateInput: document.getElementById('admin-homework-due-date'),

            // 보고서 관리 뷰 요소
            reportClassSelect: document.getElementById('admin-report-class-select'),
            reportDateInput: document.getElementById('admin-report-date'),
            reportFilesInput: document.getElementById('admin-report-files-input'),
            uploadReportsBtn: document.getElementById('admin-upload-reports-btn'),
            reportUploadStatus: document.getElementById('admin-report-upload-status'),
            uploadedReportsList: document.getElementById('admin-uploaded-reports-list'),
        };
        console.log("[AdminApp] cacheElements 완료");
        // 캐싱 후 누락된 요소 확인
        Object.keys(this.elements).forEach(key => {
            if (typeof this.elements[key] !== 'function' && !this.elements[key]) {
                console.warn(`[AdminApp Cache] Element ID for key '${key}' not found in DOM! Check HTML.`);
            }
        });
    },

    // 이벤트 리스너 등록 함수
    addEventListeners() {
        // 로그인 관련
        this.elements.secretLoginBtn?.addEventListener("click", () => this.handleAdminLogin());
        this.elements.secretPasswordInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.handleAdminLogin();
        });

        // 대시보드 메뉴 버튼 이벤트 리스너
        const menuButtons = [
            { key: "gotoSubjectMgmtBtn", view: "subjectMgmt" },
            { key: "gotoTextbookMgmtBtn", view: "textbookMgmt" },
            { key: "gotoClassMgmtBtn", view: "classMgmt" },
            { key: "gotoStudentMgmtBtn", view: "studentMgmt" },
            { key: "gotoTeacherMgmtBtn", view: "teacherMgmt" },
            { key: "gotoStudentAssignmentBtn", view: "studentAssignment" },
            { key: "gotoLessonMgmtBtn", view: "lessonMgmt" },
            { key: "gotoQnaVideoMgmtBtn", view: "qnaVideoMgmt" },
            { key: "gotoClassVideoMgmtBtn", view: "classVideoMgmt" },
            { key: "gotoHomeworkMgmtBtn", view: "homeworkMgmt" },
            { key: "gotoReportMgmtBtn", view: "reportMgmt" },
        ];

        menuButtons.forEach(({ key, view }) => {
            const buttonElement = this.elements[key];
            if (buttonElement) {
                buttonElement.addEventListener("click", () => this.showView(view));
            } else {
                console.warn(`[AdminApp Listeners] Menu button element for key '${key}' not found during listener setup.`);
            }
        });

        // 뒤로가기 버튼들
        document.querySelectorAll(".back-to-admin-dashboard-btn")
            .forEach((b) => b.addEventListener("click", () => this.showView("dashboard")));

        // 보고서 뷰: 반 선택 또는 날짜 변경 시 목록 새로고침
        this.elements.reportClassSelect?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());
    },

    // 로그인 화면 표시
    showLoginScreen() {
        this.elements.initialLogin?.style.setProperty("display", "flex");
        this.elements.mainDashboard?.style.setProperty("display", "none");
    },

    // 관리자 로그인 처리
    async handleAdminLogin() {
        const password = this.elements.secretPasswordInput?.value || "";
        if (password !== "qkraudtls0626^^") {
            showToast("비밀번호가 일치하지 않습니다.", true);
            return;
        }

        showToast("관리자 로그인 성공", false);
        this.elements.initialLogin.style.display = "none";
        this.elements.mainDashboard.style.display = "block";

        setTimeout(() => {
            if (!this.isInitialized) {
                 this.initializeAppUI(true);
            }
            this.showView("dashboard");
        }, 50);
    },

    // 대시보드 UI 및 관련 매니저 모듈 초기화
    initializeAppUI(loadData = true) {
        if (this.isInitialized) {
            console.log("[AdminApp] 이미 초기화됨, 재초기화 건너뛰기.");
            return;
        }
        try {
            console.log("[AdminApp] 매니저 모듈 초기화 시작...");
            // 각 매니저 모듈의 init 함수 호출
            studentManager.init(this);
            classManager.init(this);
            studentAssignmentManager.init(this);
            lessonManager.init(this);
            adminClassVideoManager.init(this);
            adminHomeworkDashboard.init(this);

            // 스텁 모듈 초기화
            subjectManager.init(this);
            textbookManager.init(this);
            teacherManager.init(this);

            this.isInitialized = true;
            console.log("[AdminApp] 모든 매니저 초기화 완료");

            if (loadData) {
                console.log("[AdminApp] 데이터 리스너 시작...");
                this.listenForSubjects();
                this.listenForClasses();
                this.listenForStudents();
            }
        } catch (e) {
            console.error("[AdminApp.initializeAppUI] 매니저 초기화 중 오류 발생", e);
            showToast("관리자 앱 UI 초기화 중 심각한 오류 발생", true);
        }
    },

    // 지정된 이름의 뷰(화면 섹션)를 표시하는 함수
    showView(viewName) {
        console.log(`[AdminApp] 뷰 전환 시도: ${viewName}`);
        if (!this.elements.mainDashboard) {
            console.error("[AdminApp] 메인 대시보드 요소를 찾을 수 없어 뷰 전환 불가.");
            return;
        }

        // 모든 뷰(*View) 숨기기
        Object.keys(this.elements).forEach((key) => {
            if (key.endsWith("View") && this.elements[key]) {
                this.elements[key].style.display = "none";
            }
        });

        // 요청된 뷰 요소 찾기 (예: 'subjectMgmt' -> 'subjectMgmtView')
        const viewElementKey = `${viewName}View`;
        const targetViewElement = this.elements[viewElementKey];

        // 해당 뷰 요소가 존재하면 표시, 없으면 대시보드로 fallback
        if (targetViewElement) {
            targetViewElement.style.display = "block";
            this.state.currentView = viewName;
            console.log(`[AdminApp] '${viewName}' 뷰 표시됨`);

            // 특정 뷰로 전환 시 필요한 초기화 작업 수행
            switch (viewName) {
                case "homeworkMgmt":
                    adminHomeworkDashboard.initView?.();
                    break;
                case "qnaVideoMgmt":
                    adminClassVideoManager.initQnaView?.();
                    break;
                case "classVideoMgmt":
                    adminClassVideoManager.initLectureView?.();
                    break;
                case "reportMgmt":
                    this.populateReportClassSelect();
                    this.loadAndRenderUploadedReports();
                    break;
                case "studentAssignment":
                    studentAssignmentManager.populateClassSelects?.();
                    studentAssignmentManager.resetView?.();
                    break;
                case "subjectMgmt":
                    subjectManager.renderList?.(this.state.subjects); // ✨ [수정] 스텁이므로 state.subjects 전달
                    break;
                case "textbookMgmt":
                    // 교재 관리 뷰의 과목 선택 목록 갱신을 위해 onSnapshot의 콜백을 다시 호출하도록 트리거
                    // onSnapshot에 의해 자동으로 갱신되지만, 수동 렌더링이 필요하다면 여기에 로직 추가
                    textbookManager.handleSubjectSelectForTextbook?.(''); 
                    break;
                case "studentMgmt":
                    studentManager.renderList?.(this.state.students); // ✨ [수정] 명시적으로 목록 렌더링 호출
                    break;
                case "teacherMgmt":
                    teacherManager.renderList?.(this.state.teachers); // ✨ [수정] 명시적으로 목록 렌더링 호출
                    break;
            }
        } else {
            console.error(`[AdminApp] 뷰 요소 '${viewElementKey}'를 찾을 수 없음. 대시보드 표시.`);
            this.elements.dashboardView.style.display = "block";
            this.state.currentView = "dashboard";
        }
    },

    // Firestore에서 학생 목록 실시간 감지 및 상태 업데이트
    listenForStudents() {
        console.log("[AdminApp] 학생 목록 리스닝 시작");
        const qy = query(collection(db, "students"), orderBy("name"));
        onSnapshot(qy, (snap) => {
            this.state.students = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            console.log(`[AdminApp] 학생 ${this.state.students.length}명 로드됨`);
            document.dispatchEvent(new CustomEvent('studentsLoaded'));
            // ✨ [수정] 현재 뷰가 studentMgmt일 경우에만 renderList 호출
            if (this.state.currentView === 'studentMgmt') {
                studentManager.renderList?.(this.state.students);
            }
            if (this.state.currentView === 'studentAssignment') {
                studentAssignmentManager.handleSourceClassChange?.();
            }
        }, (error) => {
            console.error("[AdminApp] 학생 목록 리스닝 오류:", error);
            showToast("학생 목록 실시간 업데이트 실패", true);
        });
    },

    // Firestore에서 과목 목록 실시간 감지 및 상태 업데이트
    listenForSubjects() {
        console.log("[AdminApp] 과목 목록 리스닝 시작");
        const qy = query(collection(db, "subjects"), orderBy("name"));
        onSnapshot(qy, (snap) => {
            this.state.subjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            console.log(`[AdminApp] 과목 ${this.state.subjects.length}개 로드됨`);
            document.dispatchEvent(new CustomEvent('subjectsUpdated'));
            if (this.state.currentView === 'subjectMgmt') {
                subjectManager.renderList?.(this.state.subjects);
            }
            if (this.elements.editClassModal?.style.display === 'flex' && classManager.sharedClassEditor) {
                const container = document.getElementById(adminClassEditorConfig.elements.editClassSubjectsContainer);
                if (container && this.state.editingClass) {
                    classManager.sharedClassEditor.renderSubjectsForEditing(this.state.editingClass, container);
                }
            }
        }, (error) => {
            console.error("[AdminApp] 과목 목록 리스닝 오류:", error);
            showToast("과목 목록 실시간 업데이트 실패", true);
        });
    },

    // Firestore에서 반 목록 실시간 감지 및 상태 업데이트
    listenForClasses() {
        console.log("[AdminApp] 반 목록 리스닝 시작");
        const qy = query(collection(db, "classes"), orderBy("name"));
        onSnapshot(qy, (snap) => {
            this.state.classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            console.log(`[AdminApp] 반 ${this.state.classes.length}개 로드됨`);
            document.dispatchEvent(new CustomEvent('classesUpdated'));
            if (this.state.currentView === 'classMgmt') {
                classManager.renderClassList?.();
            }
            if (this.state.currentView === 'studentAssignment') {
                studentAssignmentManager.populateClassSelects?.();
            }
            if (this.state.currentView === 'homeworkMgmt') {
                adminHomeworkDashboard.managerInstance?.populateClassSelect?.();
            }
            if (this.state.currentView === 'qnaVideoMgmt') {
                adminClassVideoManager.managerInstance?.populateClassSelect?.(adminClassVideoManagerConfig.elements.qnaClassSelect, 'selectedClassIdForQnaVideo');
            }
            if (this.state.currentView === 'classVideoMgmt') {
                adminClassVideoManager.managerInstance?.populateClassSelect?.(adminClassVideoManagerConfig.elements.lectureClassSelect, 'selectedClassIdForClassVideo');
            }
            if (this.state.currentView === 'reportMgmt') {
                this.populateReportClassSelect();
            }
        }, (error) => {
            console.error("[AdminApp] 반 목록 리스닝 오류:", error);
            showToast("반 목록 실시간 업데이트 실패", true);
        });
    },

    // 보고서 관리 뷰: 반 선택 드롭다운 채우기
    populateReportClassSelect() {
        const sel = this.elements.reportClassSelect;
        if (!sel) return;
        const currentSelection = sel.value;
        sel.innerHTML = '<option value="">-- 반 선택 --</option>';
        if (!this.state.classes || this.state.classes.length === 0) {
            sel.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
            sel.disabled = true;
            this.state.selectedReportClassId = null;
        } else {
            sel.disabled = false;
            this.state.classes.forEach((c) =>
                sel.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`)
            );
            if (this.state.classes.some(c => c.id === currentSelection)) {
                sel.value = currentSelection;
                this.state.selectedReportClassId = currentSelection;
            } else {
                 sel.value = '';
                 this.state.selectedReportClassId = null;
            }
        }
    },

    // 보고서 관리 뷰: 업로드된 파일 목록 로드 및 렌더링
    async loadAndRenderUploadedReports() {
        const cls = this.elements.reportClassSelect?.value;
        const date = this.elements.reportDateInput?.value;
        const list = this.elements.uploadedReportsList;

        if (!cls || !date || !list) {
            if (list) list.innerHTML = '<p class="text-sm text-slate-400 mt-2">반과 날짜를 선택해주세요.</p>';
            this.state.uploadedReports = [];
            return;
        }

        list.innerHTML = '<div class="loader-small mx-auto my-4"></div>';

        try {
            const yyyymmdd = date.replace(/-/g, "");
            const reports = await reportManager.listReportsForDateAndClass(cls, yyyymmdd);

            this.state.uploadedReports = reports.map(r => ({
                fileName: r.fileName,
                url: r.url || '',
                storagePath: `reports/${cls}/${yyyymmdd}/${r.fileName}`,
            }));

            list.innerHTML = "";
            if (!this.state.uploadedReports || this.state.uploadedReports.length === 0) {
                list.innerHTML = '<p class="text-sm text-slate-400 mt-2">해당 날짜에 업로드된 리포트가 없습니다.</p>';
                return;
            }

            const listTitle = document.createElement('h3');
            listTitle.className = 'text-lg font-semibold text-slate-700 mb-2 mt-4 border-t pt-4';
            listTitle.textContent = `업로드된 리포트 (${this.state.uploadedReports.length}개)`;
            list.appendChild(listTitle);

            const ul = document.createElement("ul");
            ul.className = 'space-y-2';

            this.state.uploadedReports.forEach((r) => {
                const li = document.createElement("li");
                li.className = "flex justify-between items-center border p-2 rounded mb-1 bg-white text-sm";
                li.innerHTML = `
                  <span class="truncate mr-2">${r.fileName}</span>
                  <div class="flex-shrink-0 flex gap-2">
                    <a href="${r.url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:text-blue-700 text-xs font-bold">보기</a>
                    <button data-path="${r.storagePath}" data-filename="${r.fileName}" class="delete-report-btn text-red-500 hover:text-red-700 text-xs font-bold">삭제</button>
                  </div>
                `;
                li.querySelector('.delete-report-btn')?.addEventListener('click', async (e) => {
                    const path = e.target.dataset.path;
                    const filename = e.target.dataset.filename;
                    if (path && confirm(`'${filename}' 리포트를 삭제하시겠습니까?`)) {
                        const success = await reportManager.deleteReport(path);
                        if (success) {
                            await this.loadAndRenderUploadedReports();
                        }
                    }
                });
                ul.appendChild(li);
            });
            list.appendChild(ul);
        } catch (e) {
            console.error("[AdminApp] 리포트 목록 로딩 실패", e);
            list.innerHTML = '<p class="text-red-500 text-sm">리포트 목록 불러오기 실패</p>';
            this.state.uploadedReports = [];
        }
    },
};

// DOM 로드 완료 후 AdminApp 초기화 실행
document.addEventListener("DOMContentLoaded", () => {
    console.log("[AdminApp] DOMContentLoaded, initializing...");
    AdminApp.init();
});