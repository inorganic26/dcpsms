// src/admin/adminApp.js

import { signInAnonymously } from "firebase/auth";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

// 모듈
import { studentManager } from "./studentManager.js";
import { classManager } from "./classManager.js";
import { studentAssignmentManager } from "./studentAssignmentManager.js";
import { lessonManager } from "./lessonManager.js";
import { adminClassVideoManager } from "./adminClassVideoManager.js";
import { adminHomeworkDashboard } from "./adminHomeworkDashboard.js";
import { reportManager } from "../shared/reportManager.js";
import { teacherManager } from "./teacherManager.js";
import { subjectManager } from "./subjectManager.js"; 
import { textbookManager } from "./textbookManager.js"; 

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
        // teachers: [], // ❌ Store로 이동 (제거됨)
        // students: [], // ❌ Store로 이동 (제거됨)
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

    async init() {
        console.log("[AdminApp.init] 초기화 시작");
        if (this.isInitialized) return;

        this.cacheElements();
        this.showLoginScreen();
        this.addEventListeners();

        console.log("[AdminApp.init] 기본 초기화 완료");
    },

    cacheElements() {
        this.elements = {
            // 로그인 화면
            initialLogin: document.getElementById("admin-initial-login"),
            secretPasswordInput: document.getElementById("admin-secret-password"),
            secretLoginBtn: document.getElementById("admin-secret-login-btn"),
            mainDashboard: document.getElementById("admin-main-dashboard"),

            // 각 섹션 뷰
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

            // 버튼
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

            // 과목
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),

            // 교재
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),

            // 반
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),

            // 학생 (UI 요소는 유지하지만 데이터는 매니저가 관리)
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPhoneInput: document.getElementById('admin-new-student-phone'),
            newParentPhoneInput: document.getElementById('admin-new-parent-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),

            // 교사
            newTeacherNameInput: document.getElementById('admin-new-teacher-name'),
            newTeacherPhoneInput: document.getElementById('admin-new-teacher-phone'),
            addTeacherBtn: document.getElementById('admin-add-teacher-btn'),
            teachersList: document.getElementById('admin-teachers-list'),
            editTeacherModal: document.getElementById('admin-edit-teacher-modal'),
            editTeacherNameInput: document.getElementById('admin-edit-teacher-name'),
            editTeacherPhoneInput: document.getElementById('admin-edit-teacher-phone'),
            closeEditTeacherModalBtn: document.getElementById('admin-close-edit-teacher-modal-btn'),
            cancelEditTeacherBtn: document.getElementById('admin-cancel-edit-teacher-btn'),
            saveTeacherEditBtn: document.getElementById('admin-save-teacher-edit-btn'),

             // 학생 수정 모달
             editStudentModal: document.getElementById('admin-edit-student-modal'),
             editStudentNameInput: document.getElementById('admin-edit-student-name'),
             editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
             editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),
             closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
             cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
             saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),

             // 반 수정 모달
             editClassModal: document.getElementById('admin-edit-class-modal'),
             editClassName: document.getElementById('admin-edit-class-name'),
             closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
             cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
             saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
             editClassSubjectsContainer: document.getElementById('admin-edit-class-subjects-and-textbooks'),
             editClassTypeSelect: document.getElementById('admin-edit-class-type'),

            // 학습 세트
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
            addVideo1RevBtn: document.getElementById('admin-add-video1-rev-btn'),
            
            videoRevUrlsContainer: (type) => `admin-video${type}-rev-urls-container`,

            quizJsonInput: document.getElementById('admin-quiz-json-input'),
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'),
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'),
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'),
            saveLoader: document.getElementById('admin-save-loader'),

            // QnA 영상
            qnaVideoDateInput: document.getElementById('admin-qna-video-date'),
            qnaClassSelect: document.getElementById('admin-qna-class-select'),
            qnaVideoTitleInput: document.getElementById('admin-qna-video-title'),
            qnaVideoUrlInput: document.getElementById('admin-qna-video-url'),
            saveQnaVideoBtn: document.getElementById('admin-save-qna-video-btn'),
            qnaVideosList: document.getElementById('admin-qna-videos-list'),

            // 수업 영상
            lectureVideoDateInput: document.getElementById('admin-class-video-date'),
            lectureClassSelect: document.getElementById('admin-class-video-class-select'),
            lectureVideoListContainer: document.getElementById('admin-class-video-list-container'),
            saveLectureVideoBtn: document.getElementById('admin-save-class-video-btn'),
            lectureVideoTitleInput: document.getElementById('admin-class-video-title'),
            lectureVideoUrlInput: document.getElementById('admin-class-video-url'),

             // 숙제 관리
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

            // 보고서 관리
            reportClassSelect: document.getElementById('admin-report-class-select'),
            reportDateInput: document.getElementById('admin-report-date'),
            reportFilesInput: document.getElementById('admin-report-files-input'),
            uploadReportsBtn: document.getElementById('admin-upload-reports-btn'),
            reportUploadStatus: document.getElementById('admin-report-upload-status'),
            uploadedReportsList: document.getElementById('admin-uploaded-reports-list'),
        };
    },

    addEventListeners() {
        this.elements.secretLoginBtn?.addEventListener("click", () => this.handleAdminLogin());
        this.elements.secretPasswordInput?.addEventListener("keypress", (e) => {
            if (e.key === "Enter") this.handleAdminLogin();
        });

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
            }
        });

        document.querySelectorAll(".back-to-admin-dashboard-btn")
            .forEach((b) => b.addEventListener("click", () => this.showView("dashboard")));

        this.elements.uploadReportsBtn?.addEventListener('click', () => this.handleReportUpload());
        
        this.elements.reportClassSelect?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        this.elements.reportDateInput?.addEventListener('change', () => this.loadAndRenderUploadedReports());
    },

    showLoginScreen() {
        this.elements.initialLogin?.style.setProperty("display", "flex");
        this.elements.mainDashboard?.style.setProperty("display", "none");
    },

    // ✅ 관리자 로그인 처리 (서버 검증 방식 유지 - 보안)
    async handleAdminLogin() {
        const password = this.elements.secretPasswordInput?.value || "";
        
        if (!password) {
            showToast("비밀번호를 입력해주세요.", true);
            return;
        }

        showToast("로그인 및 권한 확인 중...", false);

        try {
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }

            const functions = getFunctions(app, 'asia-northeast3');
            const verifyPassword = httpsCallable(functions, 'verifyAdminPassword');
            
            await verifyPassword({ password });
            await auth.currentUser.getIdToken(true);

            showToast("관리자 로그인 성공", false);
            this.elements.initialLogin.style.display = "none";
            this.elements.mainDashboard.style.display = "block";

            setTimeout(() => {
                if (!this.isInitialized) {
                     this.initializeAppUI(true);
                }
                this.showView("dashboard");
            }, 50);

        } catch (e) {
            console.error("로그인 실패:", e);
            if (e.code === 'functions/permission-denied') {
                showToast("비밀번호가 일치하지 않습니다.", true);
            } else {
                showToast("로그인 처리 중 오류가 발생했습니다.", true);
            }
        }
    },

    initializeAppUI(loadData = true) {
        if (this.isInitialized) return;
        try {
            console.log("[AdminApp] 매니저 모듈 초기화 시작...");
            
            studentManager.init(this);
            classManager.init(this);
            studentAssignmentManager.init(this);
            lessonManager.init(this);
            adminClassVideoManager.init(this);
            adminHomeworkDashboard.init(this);

            subjectManager.init(this);
            textbookManager.init(this);
            teacherManager.init(this);

            this.isInitialized = true;
            console.log("[AdminApp] 모든 매니저 초기화 완료");

            if (loadData) {
                console.log("[AdminApp] 데이터 리스너 시작...");
                this.listenForSubjects();
                this.listenForClasses();
                // ❌ listenForStudents, listenForTeachers 제거됨 (각 매니저가 담당)
            }
        } catch (e) {
            console.error("[AdminApp.initializeAppUI] 매니저 초기화 중 오류 발생", e);
            showToast("관리자 앱 UI 초기화 중 심각한 오류 발생", true);
        }
    },

    showView(viewName) {
        if (!this.elements.mainDashboard) return;

        Object.keys(this.elements).forEach((key) => {
            if (key.endsWith("View") && this.elements[key]) {
                this.elements[key].style.display = "none";
            }
        });

        const viewElementKey = `${viewName}View`;
        const targetViewElement = this.elements[viewElementKey];

        if (targetViewElement) {
            targetViewElement.style.display = "block";
            this.state.currentView = viewName;

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
                    subjectManager.renderList?.(this.state.subjects);
                    break;
                case "textbookMgmt":
                    textbookManager.populateSubjectSelect?.();
                    textbookManager.handleSubjectSelectForTextbook?.(this.elements.subjectSelectForTextbook.value || ''); 
                    break;
                case "lessonMgmt":
                    lessonManager.populateSubjectSelect?.();
                    lessonManager.handleSubjectSelectForLesson?.(this.elements.subjectSelectForMgmt.value || ''); 
                    break;
                case "studentMgmt":
                    // ✨ Store에서 데이터가 로드되어 있으면 바로 렌더링
                    // (로드 안되어 있어도 리스너가 있어서 상관없음)
                    break;
                case "teacherMgmt":
                    break;
            }
        } else {
            this.elements.dashboardView.style.display = "block";
            this.state.currentView = "dashboard";
        }
    },

    listenForSubjects() {
        const qy = query(collection(db, "subjects"), orderBy("name"));
        onSnapshot(qy, (snap) => {
            this.state.subjects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
            document.dispatchEvent(new CustomEvent('subjectsUpdated'));
            
            if (this.state.currentView === 'subjectMgmt') {
                subjectManager.renderList?.(this.state.subjects);
            }
            if (this.state.currentView === 'textbookMgmt') {
                textbookManager.populateSubjectSelect?.();
            }
            if (this.state.currentView === 'lessonMgmt') {
                lessonManager.populateSubjectSelect?.();
            }
            if (this.elements.editClassModal?.style.display === 'flex' && classManager.sharedClassEditor) {
                const container = document.getElementById(adminClassEditorConfig.elements.editClassSubjectsContainer);
                if (container && this.state.editingClass) {
                    classManager.sharedClassEditor.renderSubjectsForEditing(this.state.editingClass, container);
                }
            }
        }, (error) => {
             console.error("[AdminApp] 과목 목록 리스닝 오류:", error);
        });
    },

    listenForClasses() {
        const qy = query(collection(db, "classes"), orderBy("name"));
        onSnapshot(qy, (snap) => {
            this.state.classes = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
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
        });
    },

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
    
    async handleReportUpload() {
        const dateInput = this.elements.reportDateInput;
        const filesInput = this.elements.reportFilesInput;
        const statusEl = this.elements.reportUploadStatus;
        const uploadBtn = this.elements.uploadReportsBtn;

        if (!dateInput || !filesInput || !statusEl || !uploadBtn) return;

        const classId = this.elements.reportClassSelect?.value;
        const testDateRaw = dateInput.value;
        const files = filesInput.files;

        if (!classId) {
            showToast("먼저 대상 반을 선택해주세요.");
            return;
        }
        if (!testDateRaw || !files || files.length === 0) {
            showToast("시험 날짜와 리포트 파일을 모두 선택해주세요.");
            return;
        }

        const testDate = testDateRaw.replace(/-/g, '');
        if (testDate.length !== 8 || !/^\d+$/.test(testDate)) {
            showToast("날짜 형식이 올바르지 않습니다.", true);
            return;
        }

        uploadBtn.disabled = true;
        statusEl.innerHTML = `<span class="text-blue-600">파일 ${files.length}개 업로드 시작 중...</span>`;
        let successCount = 0;
        let failCount = 0;

        const uploadPromises = [];
        for (const file of files) {
            uploadPromises.push(
                reportManager.uploadReport(file, classId, testDate)
                    .then(success => {
                        if (success) successCount++;
                        else failCount++;
                        statusEl.innerHTML =
                            `<span class="text-blue-600">업로드 진행 중... (${successCount + failCount}/${files.length}, 성공: ${successCount}, 실패: ${failCount})</span>`;
                    })
            );
        }

        try {
            await Promise.all(uploadPromises);
            statusEl.innerHTML =
                `<span class="${failCount > 0 ? 'text-red-600' : 'text-green-600'}">업로드 완료: 총 ${files.length}개 중 ${successCount}개 성공, ${failCount}개 실패.</span>`;
            showToast(`리포트 업로드 완료 (성공: ${successCount}, 실패: ${failCount})`, failCount > 0);
            filesInput.value = '';
            await this.loadAndRenderUploadedReports();
        } catch (error) {
            console.error("Error during parallel report upload:", error);
            statusEl.innerHTML =
                `<span class="text-red-600">업로드 중 오류 발생.</span>`;
            showToast("리포트 업로드 중 오류 발생", true);
        } finally {
            uploadBtn.disabled = false;
        }
    },

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
                    <button data-path="${r.storagePath}" data-filename="${r.fileName}" data-class-id="${cls}" data-date-str="${date}" class="delete-report-btn text-red-500 hover:text-red-700 text-xs font-bold">삭제</button>
                  </div>
                `;
                li.querySelector('.delete-report-btn')?.addEventListener('click', async (e) => {
                    const path = e.target.dataset.path;
                    const filename = e.target.dataset.filename;
                    
                    if (path && confirm(`'${filename}' 리포트를 삭제하시겠습니까?`)) {
                        const success = await this.tryDeleteReport(e.target.dataset.classId, e.target.dataset.dateStr, filename, path);

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
    
    async tryDeleteReport(classId, dateStr, fileName, primaryPath) {
        let success = await reportManager.deleteReport(primaryPath);
        if (success) {
            showToast("리포트 삭제 완료.", false);
            return true;
        }

        const rootPath = `reports/${classId}/${fileName}`;
        if (primaryPath !== rootPath) {
             success = await reportManager.deleteReport(rootPath);
             if (success) {
                 showToast("리포트 삭제 완료.", false);
                 return true;
             }
        }
        
        showToast("리포트 삭제에 실패했습니다.", true);
        return false;
    }
};

document.addEventListener("DOMContentLoaded", () => {
    console.log("[AdminApp] DOMContentLoaded, initializing...");
    AdminApp.init();
});