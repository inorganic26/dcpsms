// src/student/studentAuth.js

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../shared/firebase.js";
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

    handleLogin() {
        const student = this.state.selectedStudent;
        const pw = document.getElementById(this.elements.passwordInput).value.trim();
        if (!student || !pw) { showToast("정보를 입력해주세요.", true); return; }
        
        if (pw === (student.phone || "").slice(-4)) {
            showToast(`${student.name}님 환영합니다!`, false);
            const activeData = { ...student, classId: document.getElementById(this.elements.classSelect).value };
            this.app.onLoginSuccess(activeData, student.id);
        } else {
            showToast("비밀번호가 일치하지 않습니다.", true);
        }
    }
};