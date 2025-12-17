// src/student/studentAuth.js

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
// ✨ [수정] signInAnonymously와 auth 가져오기
import { signInAnonymously } from "firebase/auth";
import { db, auth } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";

export const studentAuth = {
    app: null,
    elements: {
        classSelect: 'student-class-select',
        nameSelect: 'student-name-select',
        passwordInput: 'student-password',
        loginBtn: 'student-login-btn'
    },
    state: { classes: [], studentsInClass: [], selectedStudent: null },

    init(app) {
        this.app = app;
        this.addEventListeners();
        this.loadClasses();
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id]);
        el('classSelect')?.addEventListener('change', (e) => this.handleClassChange(e.target.value));
        el('nameSelect')?.addEventListener('change', (e) => this.handleNameChange(e.target.value));
        el('loginBtn')?.addEventListener('click', () => this.handleLogin());
        el('passwordInput')?.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(); });
    },

    async loadClasses() {
        const select = document.getElementById(this.elements.classSelect);
        if (!select) return;
        select.innerHTML = '<option value="">로딩 중...</option>';
        try {
            const q = query(collection(db, "classes"), orderBy("name"));
            const snapshot = await getDocs(q);
            select.innerHTML = '<option value="">반을 선택해주세요</option>';
            snapshot.forEach(doc => {
                const opt = document.createElement('option');
                opt.value = doc.id;
                opt.textContent = doc.data().name;
                select.appendChild(opt);
            });
        } catch (e) {
            console.error(e);
            select.innerHTML = '<option value="">로드 실패</option>';
        }
    },

    async handleClassChange(classId) {
        const nameSelect = document.getElementById(this.elements.nameSelect);
        nameSelect.innerHTML = '<option value="">이름을 선택해주세요</option>';
        nameSelect.disabled = true;
        this.state.selectedStudent = null;
        if (!classId) return;

        try {
            // classIds(신규) 또는 classId(구형) 호환
            const q1 = query(collection(db, "students"), where("classIds", "array-contains", classId));
            const snap1 = await getDocs(q1);
            const q2 = query(collection(db, "students"), where("classId", "==", classId));
            const snap2 = await getDocs(q2);

            const studentsMap = new Map();
            [...snap1.docs, ...snap2.docs].forEach(d => studentsMap.set(d.id, { id: d.id, ...d.data() }));
            
            this.state.studentsInClass = Array.from(studentsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
            
            if (this.state.studentsInClass.length === 0) {
                nameSelect.innerHTML = '<option value="">학생이 없습니다</option>';
            } else {
                this.state.studentsInClass.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.name;
                    nameSelect.appendChild(opt);
                });
                nameSelect.disabled = false;
            }
        } catch (e) { showToast("학생 로드 실패", true); }
    },

    handleNameChange(studentId) {
        this.state.selectedStudent = this.state.studentsInClass.find(s => s.id === studentId);
        document.getElementById(this.elements.passwordInput).value = '';
        document.getElementById(this.elements.passwordInput).focus();
    },

    // ✨ [핵심 수정] 실제 Firebase Auth 로그인을 수행하여 권한 획득
    async handleLogin() {
        const student = this.state.selectedStudent;
        const pwInput = document.getElementById(this.elements.passwordInput);
        const pw = pwInput.value.trim();
        
        if (!student || !pw) { showToast("정보를 입력해주세요.", true); return; }
        
        // 전화번호 뒷 4자리 확인
        if (pw === (student.phone || "").slice(-4)) {
            try {
                // 1. Firebase 인증 시스템에 '익명'으로 로그인
                // (이 과정을 거쳐야 firestore.rules의 isAuthenticated()가 true가 됩니다)
                await signInAnonymously(auth);

                showToast(`${student.name}님 환영합니다!`, false);
                const activeData = { ...student, classId: document.getElementById(this.elements.classSelect).value };
                
                this.app.onLoginSuccess(activeData, student.id);
            } catch (error) {
                console.error("Firebase 로그인 실패:", error);
                showToast("로그인 처리 중 오류가 발생했습니다.", true);
            }
        } else {
            showToast("비밀번호가 일치하지 않습니다.", true);
            pwInput.value = '';
            pwInput.focus();
        }
    }
};