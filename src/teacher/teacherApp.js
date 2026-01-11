// src/teacher/teacherApp.js

import { doc, getDoc, getDocs, collection, query, where, onSnapshot, updateDoc, orderBy } from "firebase/firestore";
// 👇 [수정] setPersistence, browserLocalPersistence 추가됨
import { signInWithCustomToken, signOut, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db, auth } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';
import { setSubjects } from "../store/subjectStore.js";

import { homeworkDashboard } from './homeworkDashboard.js';
import { lessonManager } from './lessonManager.js';
import { classEditor } from './classEditor.js'; 
import { createClassVideoManager } from '../shared/classVideoManager.js'; 
import { analysisDashboard } from './analysisDashboard.js';
import { subjectTextbookManager } from './subjectTextbookManager.js';

const TeacherApp = {
    isInitialized: false,
    classVideoManager: null, 
    elements: {},
    state: {
        teacherId: null,
        teacherData: null,
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        studentsInClass: new Map(),
        subjects: [],
        currentView: 'dashboard',
        isSubjectsLoading: true,
        isClassDataLoading: false,
        editingLectureId: null 
    },

    init() {
        if (this.isInitialized) return;
        this.cacheElements();
        // ⚠️ 주의: 기존 코드에 있던 자동 로그아웃(signOut)은 제거하거나 주석 처리해야 
        // 앱을 켰을 때 로그인이 유지됩니다. 보안을 위해 남겨두고 싶으시다면 두셔도 되지만,
        // "유지"를 원하신다면 아래 줄을 지우는 것이 좋습니다.
        // signOut(auth).then(() => console.log("Logged out for security.")); 

        this.elements.loginBtn?.addEventListener('click', () => {
            this.handleLogin(this.elements.nameInput?.value, this.elements.passwordInput?.value);
        });
        
        this.elements.passwordInput?.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') this.handleLogin(this.elements.nameInput?.value, this.elements.passwordInput?.value);
        });

        this.elements.loginContainer.style.display = 'flex';
        this.elements.dashboardContainer.style.display = 'none';

        // ⭐ [핵심 수정] 메인 콘텐츠 스크롤 강제 적용
        const mainContent = document.getElementById('teacher-main-content');
        if (mainContent) {
            mainContent.classList.add('overflow-y-auto', 'h-full', 'pb-20');
            if(mainContent.parentElement) {
                mainContent.parentElement.classList.add('h-screen', 'overflow-hidden', 'flex', 'flex-col');
            }
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
                'student-list-mgmt': document.getElementById('view-student-list-mgmt'),
                'class-mgmt': document.getElementById('view-class-mgmt'),
                'class-video-mgmt': document.getElementById('view-class-video-mgmt'),
                'report-mgmt': document.getElementById('view-report-mgmt'),
                'daily-test-mgmt': document.getElementById('view-daily-test-mgmt'),
                'weekly-test-mgmt': document.getElementById('view-weekly-test-mgmt'),
                'learning-status-mgmt': document.getElementById('view-learning-status-mgmt'),
            },
            
            studentListContainer: document.getElementById('teacher-student-list-container'),
            gotoClassVideoMgmtBtn: document.querySelector('[data-view="class-video-mgmt"]'),
            
            currentClassInfo: document.getElementById('current-class-info'),
            currentClassType: document.getElementById('current-class-type'),
            currentClassSubjectsList: document.getElementById('current-class-subjects-list'),
        };

        this.elements.qnaClassSelect = "teacher-class-select"; 
        this.elements.qnaVideoDateInput = "qna-video-date";
        this.elements.saveQnaVideoBtn = "save-qna-video-btn";
        this.elements.qnaVideoTitleInput = "qna-video-title";
        this.elements.qnaVideoUrlInput = "qna-video-url";
        this.elements.qnaVideosList = "qna-videos-list-teacher";

        this.elements.lectureClassSelect = "teacher-class-select"; 
        this.elements.lectureVideoDateInput = "class-video-date";
        this.elements.saveLectureVideoBtn = "save-class-video-btn";
        this.elements.addLectureVideoFieldBtn = "add-class-video-field-btn";
        this.elements.lectureVideoListContainer = "class-video-list-container";
        this.elements.lectureVideoTitleInput = "class-video-title";
        this.elements.lectureVideoUrlInput = "class-video-url";
    },

    async handleLogin(name, password) {
        if (!name || !password) { showToast("입력 확인 필요"); return; }
        showToast("로그인 중...", false);

        try {
            // 🚀 [핵심 수정] 로그인 상태 영구 유지 설정
            await setPersistence(auth, browserLocalPersistence);

            const functions = getFunctions(app, 'asia-northeast3');
            const verifyLogin = httpsCallable(functions, 'verifyTeacherLogin');
            const result = await verifyLogin({ name, password });
            
            if (!result.data.success) { showToast(result.data.message || "실패", true); return; }

            await signInWithCustomToken(auth, result.data.token);
            this.state.teacherId = result.data.teacherId;
            this.state.teacherData = result.data.teacherData;

            if (result.data.teacherData.isInitialPassword) {
                 this.showDashboard();
                 this.promptPasswordChange(result.data.teacherId);
            } else {
                 showToast(`환영합니다, ${result.data.teacherData.name} 선생님!`, false);
                 this.showDashboard();
            }
        } catch (error) { console.error(error); showToast("오류 발생", true); }
    },

    async promptPasswordChange(teacherId) {
        let newPassword = null;
        while (true) {
            newPassword = prompt("새 비밀번호 (6자리 이상)");
            if (newPassword === null) return;
            if (newPassword.trim().length >= 6) break;
            alert("6자리 이상이어야 합니다.");
        }
        try {
            await updateDoc(doc(db, 'teachers', teacherId), { password: newPassword, isInitialPassword: false });
            showToast("변경 완료", false);
        } catch (error) { showToast("실패", true); }
    },

    showDashboard() {
        this.elements.loginContainer.style.display = 'none';
        this.elements.dashboardContainer.style.display = 'block';
        if (!this.isInitialized) this.initializeDashboard();
    },

    initializeDashboard() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        
        this.homeworkDashboard = homeworkDashboard;
        this.lessonManager = lessonManager;
        this.classEditor = classEditor;
        this.analysisDashboard = analysisDashboard;
        this.subjectTextbookManager = subjectTextbookManager;

        this.classVideoManager = createClassVideoManager({
            app: this,
            elements: this.elements,
            options: { disableClassSelectPopulation: true } 
        });

        try {
            this.homeworkDashboard.init(this);
            this.lessonManager.init(this);
            this.classEditor.init(this);
            this.analysisDashboard.init(this);
            this.subjectTextbookManager.init(this);
        } catch (e) { console.error("매니저 초기화 오류:", e); }

        this.addEventListeners();
        this.populateClassSelect();
        this.listenForSubjects(); 
        
        if (this.elements.mainContent) this.elements.mainContent.style.display = 'none';
    },

    addEventListeners() {
        this.elements.classSelect?.addEventListener('change', (e) => this.handleClassSelection(e));

        this.elements.navButtonsContainer?.addEventListener('click', (e) => {
            const card = e.target.closest('.teacher-nav-btn');
            if (card?.dataset.view) this.handleViewChange(card.dataset.view);
        });

        this.elements.mainContent?.addEventListener('click', (e) => {
            if (e.target.classList.contains('back-to-teacher-menu')) this.showDashboardMenu();
        });

        document.addEventListener('subjectsUpdated', () => {
            this.state.isSubjectsLoading = false;
            if (this.state.currentView === 'lesson-mgmt') this.lessonManager.populateSubjectSelect();
            if (this.state.currentView === 'class-mgmt') this.displayCurrentClassInfo();
        });

        document.addEventListener('class-changed', () => {
            if (this.state.currentView === 'daily-test-mgmt') this.analysisDashboard.initDailyTestView();
            if (this.state.currentView === 'weekly-test-mgmt') this.analysisDashboard.initWeeklyTestView();
            if (this.state.currentView === 'learning-status-mgmt') this.analysisDashboard.initLearningStatusView();
        });
    },

    showDashboardMenu() {
        this.state.currentView = 'dashboard';
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'grid';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        if (this.elements.gotoClassVideoMgmtBtn) {
            const isLive = this.state.selectedClassData?.classType === 'live-lecture';
            this.elements.gotoClassVideoMgmtBtn.style.display = isLive ? 'flex' : 'none';
        }
        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
    },

    handleViewChange(viewName) {
        this.state.currentView = viewName;
        if (this.elements.navButtonsContainer) this.elements.navButtonsContainer.style.display = 'none';
        Object.values(this.elements.views).forEach(view => { if (view) view.style.display = 'none'; });

        const viewToShow = this.elements.views[viewName];
        if (viewToShow) viewToShow.style.display = 'block';
        else { this.showDashboardMenu(); return; }

        if (this.elements.mainContent) this.elements.mainContent.style.display = 'block';
        if (this.elements.classSelect && this.state.selectedClassId) this.elements.classSelect.value = this.state.selectedClassId;

        switch (viewName) {
            case 'homework-dashboard': this.homeworkDashboard.populateHomeworkSelect(); break;
            case 'lesson-mgmt': this.lessonManager.populateSubjectSelect(); break;
            case 'student-list-mgmt': this.renderStudentList(); break;
            case 'class-mgmt': this.displayCurrentClassInfo(); break;
            case 'daily-test-mgmt': this.analysisDashboard.initDailyTestView(); break;
            case 'weekly-test-mgmt': this.analysisDashboard.initWeeklyTestView(); break;
            case 'learning-status-mgmt': this.analysisDashboard.initLearningStatusView(); break;
            
            case 'qna-video-mgmt': this.classVideoManager.initQnaView(); break;
            case 'class-video-mgmt': this.classVideoManager.initLectureView(); break;
        }
    },

    async handleClassSelection(event) {
        const newClassId = event.target.value;
        this.state.selectedClassId = newClassId;
        this.state.selectedClassName = event.target.options[event.target.selectedIndex].text;
        
        this.state.studentsInClass.clear();
        if (!newClassId) { this.showDashboardMenu(); return; }

        this.state.isClassDataLoading = true;
        if (this.state.currentView === 'student-list-mgmt') this.renderStudentList(); 
        
        try {
            const q1 = query(collection(db, 'students'), where('classId', '==', newClassId));
            const q2 = query(collection(db, 'students'), where('classIds', 'array-contains', newClassId));
            const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
            s1.forEach(d => this.state.studentsInClass.set(d.id, d.data().name));
            s2.forEach(d => this.state.studentsInClass.set(d.id, d.data().name));
            
            const docSnap = await getDoc(doc(db, 'classes', newClassId));
            this.state.selectedClassData = docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        } catch(e) { console.error(e); }
        
        this.state.isClassDataLoading = false;
        document.dispatchEvent(new CustomEvent('class-changed'));
        
        if (this.state.currentView === 'dashboard') this.showDashboardMenu();
        else if (this.state.currentView === 'student-list-mgmt') this.renderStudentList();
    },

    renderStudentList() {
        const container = this.elements.studentListContainer;
        if (!container) return;
        container.innerHTML = '';

        if (this.state.isClassDataLoading) { container.innerHTML = '<div class="loader-small mx-auto"></div>'; return; }
        if (!this.state.selectedClassId) { container.innerHTML = '<p class="p-4 text-slate-500">반 선택 필요</p>'; return; }
        if (this.state.studentsInClass.size === 0) { container.innerHTML = '<p class="p-4 text-slate-500">학생 없음</p>'; return; }

        Array.from(this.state.studentsInClass.entries()).sort((a,b)=>a[1].localeCompare(b[1])).forEach(([id, name]) => {
            const div = document.createElement('div');
            div.className = "p-3 border-b bg-white hover:bg-slate-50";
            div.textContent = name;
            container.appendChild(div);
        });
    },

    displayCurrentClassInfo() {
        const info = this.elements.currentClassInfo;
        const type = this.elements.currentClassType;
        const list = this.elements.currentClassSubjectsList;
        if (!info || !this.state.selectedClassData) { if(info) info.style.display='none'; return; }

        info.style.display = 'block';
        type.textContent = this.state.selectedClassData.classType === 'live-lecture' ? '현강반' : '자기주도반';
        list.innerHTML = '';
        
        const sIds = Object.keys(this.state.selectedClassData.subjects || {});
        if (sIds.length === 0) list.innerHTML = '<li>과목 없음</li>';
        else sIds.forEach(id => {
            const name = this.state.subjects.find(s=>s.id===id)?.name || '알 수 없음';
            const li = document.createElement('li'); li.textContent = name;
            list.appendChild(li);
        });
    },

    listenForSubjects() {
        onSnapshot(query(collection(db, 'subjects'), orderBy("name")), (snap) => {
            const subjects = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            this.state.subjects = subjects;
            setSubjects(subjects);
            document.dispatchEvent(new CustomEvent('subjectsUpdated'));
        });
    },

    async populateClassSelect() {
        const select = this.elements.classSelect;
        if (!select) return;
        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const snap = await getDocs(query(collection(db, 'classes'), orderBy("name")));
            select.innerHTML = '<option value="">-- 반 선택 --</option>';
            snap.forEach(d => select.innerHTML += `<option value="${d.id}">${d.data().name}</option>`);
            if (this.state.selectedClassId) select.value = this.state.selectedClassId;
        } catch(e) { select.innerHTML = '<option>로드 실패</option>'; }
    },
    
    async fetchClassData(classId) {
        try {
            const docSnap = await getDoc(doc(db, 'classes', classId));
            if(docSnap.exists()) this.state.selectedClassData = { id: docSnap.id, ...docSnap.data() };
        } catch(e){ console.error(e); }
    }
};

export { TeacherApp };