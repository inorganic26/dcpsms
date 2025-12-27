// src/student/studentAuth.js

import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
// 로그인 관련 기능 가져오기
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
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
        console.log("[studentAuth] 초기화 시작");
        
        this.addEventListeners();
        
        // ✨ [핵심 수정] 
        // 권한 문제로 목록이 안 뜰 수 있으므로, 
        // 먼저 현재 로그인 상태를 확인하고 필요하면 익명 로그인을 시도한 뒤 목록을 불러옵니다.
        onAuthStateChanged(auth, (user) => {
            if (user) {
                // 이미 로그인되어 있다면 바로 로드
                this.loadClasses();
            } else {
                // 로그인되어 있지 않다면 익명 로그인 후 로드 (권한 확보)
                signInAnonymously(auth)
                    .then(() => {
                        console.log("[studentAuth] 익명 권한 확보 완료");
                        this.loadClasses();
                    })
                    .catch((err) => {
                        console.error("[studentAuth] 익명 로그인 실패 (목록 로드 불가 가능성):", err);
                        // 실패하더라도 일단 로드 시도
                        this.loadClasses();
                    });
            }
        });
    },

    addEventListeners() {
        const el = (id) => document.getElementById(this.elements[id]);
        
        // 요소가 실제로 존재하는지 체크
        const classSelect = el('classSelect');
        const nameSelect = el('nameSelect');
        const loginBtn = el('loginBtn');
        const pwInput = el('passwordInput');

        if(classSelect) classSelect.addEventListener('change', (e) => this.handleClassChange(e.target.value));
        if(nameSelect) nameSelect.addEventListener('change', (e) => this.handleNameChange(e.target.value));
        if(loginBtn) loginBtn.addEventListener('click', () => this.handleLogin());
        if(pwInput) pwInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.handleLogin(); });
    },

    async loadClasses() {
        const select = document.getElementById(this.elements.classSelect);
        if (!select) {
            console.error("[studentAuth] 반 선택 박스(student-class-select)를 찾을 수 없습니다.");
            return;
        }

        // 로딩 표시
        select.innerHTML = '<option value="">데이터 불러오는 중...</option>';
        select.disabled = true;

        try {
            console.log("[studentAuth] 반 목록 쿼리 시작");
            const q = query(collection(db, "classes"), orderBy("name"));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                select.innerHTML = '<option value="">등록된 반이 없습니다</option>';
                console.warn("[studentAuth] 반 데이터가 0건입니다.");
            } else {
                select.innerHTML = '<option value="">반을 선택해주세요</option>';
                snapshot.forEach(doc => {
                    const opt = document.createElement('option');
                    opt.value = doc.id;
                    opt.textContent = doc.data().name;
                    select.appendChild(opt);
                });
                console.log(`[studentAuth] ${snapshot.size}개의 반 로드 완료`);
            }
        } catch (e) {
            console.error("[studentAuth] 반 목록 로드 실패:", e);
            select.innerHTML = '<option value="">목록 로드 실패 (새로고침 필요)</option>';
            showToast("반 목록을 불러오지 못했습니다.", true);
        } finally {
            select.disabled = false;
        }
    },

    async handleClassChange(classId) {
        const nameSelect = document.getElementById(this.elements.nameSelect);
        if(!nameSelect) return;

        nameSelect.innerHTML = '<option value="">이름을 선택해주세요</option>';
        nameSelect.disabled = true;
        this.state.selectedStudent = null;
        
        if (!classId) return;

        try {
            // 구형 데이터(classId)와 신형 데이터(classIds 배열) 모두 지원
            const q1 = query(collection(db, "students"), where("classIds", "array-contains", classId));
            const q2 = query(collection(db, "students"), where("classId", "==", classId));
            
            // 병렬 처리로 속도 향상
            const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

            const studentsMap = new Map();
            // 중복 제거하며 병합
            [...snap1.docs, ...snap2.docs].forEach(d => {
                studentsMap.set(d.id, { id: d.id, ...d.data() });
            });
            
            this.state.studentsInClass = Array.from(studentsMap.values())
                .sort((a, b) => a.name.localeCompare(b.name));
            
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
        } catch (e) { 
            console.error("[studentAuth] 학생 로드 실패:", e);
            showToast("학생 목록 로드 실패", true); 
        }
    },

    handleNameChange(studentId) {
        this.state.selectedStudent = this.state.studentsInClass.find(s => s.id === studentId);
        const pwInput = document.getElementById(this.elements.passwordInput);
        if(pwInput) {
            pwInput.value = '';
            pwInput.focus();
        }
    },

    async handleLogin() {
        const student = this.state.selectedStudent;
        const pwInput = document.getElementById(this.elements.passwordInput);
        const pw = pwInput?.value.trim();
        
        if (!student) { showToast("학생을 선택해주세요.", true); return; }
        if (!pw) { showToast("비밀번호(전화번호 뒷 4자리)를 입력해주세요.", true); return; }
        
        // 전화번호 뒷 4자리 확인
        if (pw === (student.phone || "").slice(-4)) {
            try {
                // 이미 init에서 로그인을 시도했지만, 확실하게 세션을 보장하기 위해 한 번 더 체크
                if (!auth.currentUser) {
                    await signInAnonymously(auth);
                }

                showToast(`${student.name}님 환영합니다!`, false);
                
                // 선택된 반 ID를 포함하여 데이터 전달
                const classSelect = document.getElementById(this.elements.classSelect);
                const activeData = { 
                    ...student, 
                    classId: classSelect ? classSelect.value : student.classId 
                };
                
                this.app.onLoginSuccess(activeData, student.id);
            } catch (error) {
                console.error("로그인 처리 오류:", error);
                showToast("로그인 시스템 오류", true);
            }
        } else {
            showToast("비밀번호가 일치하지 않습니다.", true);
            if(pwInput) {
                pwInput.value = '';
                pwInput.focus();
            }
        }
    }
};