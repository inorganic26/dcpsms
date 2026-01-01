// src/parent/parentApp.js

import { initializeApp } from "firebase/app";
import { 
    getFirestore, collection, query, where, getDocs, doc, getDoc
} from "firebase/firestore";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from "firebase/auth";

// ✅ 기능별 모듈 불러오기
import { parentDailyTest } from "./parentDailyTest.js";
import { parentWeeklyTest } from "./parentWeeklyTest.js";
import { parentHomework } from "./parentHomework.js";
import { parentProgress } from "./parentProgress.js";

// -----------------------------------------------------------------------------
// 1. 파이어베이스 설정
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBWto_OQ5pXI1i4NDTrEiqNZwZInmbxDwY",
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  storageBucket: "svcm-v2.firebasestorage.app",
  messagingSenderId: "189740450655",
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

let currentStudent = null;
let currentClassData = null; 

// -----------------------------------------------------------------------------
// 2. 초기화 및 이벤트 리스너
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    // 반 목록 로드 (로그인 전)
    await loadClasses();

    // 탭 전환 버튼 이벤트
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // 로그인/로그아웃 버튼 이벤트
    const loginBtn = document.getElementById('parent-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleLogin);
    }

    const logoutBtn = document.getElementById('parent-logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// 반 목록 드롭다운 채우기
async function loadClasses() {
    const select = document.getElementById('parent-login-class'); 
    if (!select) return;

    try {
        const querySnapshot = await getDocs(collection(db, "classes"));
        select.innerHTML = '<option value="">반을 선택해주세요</option>';
        
        const classes = [];
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // DB 필드명 호환성 체크 (name 또는 className)
            const clsName = data.name || data.className;
            if (clsName) {
                classes.push({ id: doc.id, name: clsName });
            }
        });
        
        // 가나다순 정렬
        classes.sort((a, b) => a.name.localeCompare(b.name));

        classes.forEach(cls => {
            const option = document.createElement('option');
            option.value = cls.id; 
            option.textContent = cls.name;
            select.appendChild(option);
        });

    } catch (error) {
        console.warn("반 목록 로딩 실패:", error);
        select.innerHTML = '<option value="">반 정보를 불러오지 못했습니다</option>';
    }
}

// -----------------------------------------------------------------------------
// 3. 로그인 로직
// -----------------------------------------------------------------------------
async function handleLogin() {
    const classIdEl = document.getElementById('parent-login-class');
    const studentNameEl = document.getElementById('parent-login-name');
    const phoneSuffixEl = document.getElementById('parent-login-phone');

    const classId = classIdEl ? classIdEl.value : ''; 
    const studentName = studentNameEl ? studentNameEl.value.trim() : ''; 
    const phoneSuffix = phoneSuffixEl ? phoneSuffixEl.value.trim() : ''; 

    if (!classId || !studentName || !phoneSuffix) {
        alert("모든 정보를 입력해주세요.");
        return;
    }
    
    if (phoneSuffix.length !== 4) {
        alert("비밀번호는 전화번호 뒷 4자리여야 합니다.");
        return;
    }

    const loginBtn = document.getElementById('parent-login-btn');
    if (loginBtn) {
        loginBtn.textContent = "확인 중...";
        loginBtn.disabled = true;
    }

    try {
        // 1. 학생 찾기 (DB 조회)
        const studentsRef = collection(db, "students");
        
        // 반 ID로 먼저 검색
        let q = query(
            studentsRef, 
            where("classId", "==", classId),
            where("name", "==", studentName)
        );
        let querySnapshot = await getDocs(q);
        
        // 결과가 없으면 classIds 배열로 2차 검색 (학생이 여러 반인 경우 대비)
        if (querySnapshot.empty) {
            const q2 = query(
                studentsRef, 
                where("classIds", "array-contains", classId),
                where("name", "==", studentName)
            );
            querySnapshot = await getDocs(q2);
        }

        if (querySnapshot.empty) {
            throw new Error("STUDENT_NOT_FOUND");
        }

        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();

        // 2. 전화번호 검증 (DB 데이터와 입력값 대조)
        const registeredPhone = studentData.phone || studentData.parentPhone || "";
        const cleanPhone = registeredPhone.replace(/-/g, "").trim();
        
        if (!cleanPhone || cleanPhone.slice(-4) !== phoneSuffix) {
             throw new Error("PHONE_MISMATCH");
        }

        // 3. 로그인 및 계정 생성
        const email = `parent_${studentDoc.id}@dcpsms.com`;
        
        // 비밀번호 정책: "dcps" + 전화번호뒷4자리 (총 8자리)
        const safePassword = "dcps" + phoneSuffix; 

        try {
            // A. 로그인 시도
            await signInWithEmailAndPassword(auth, email, safePassword);
            console.log("기존 계정으로 로그인 성공");

        } catch (loginError) {
            // B. 실패 시: 계정이 없거나(user-not-found), 비번이 틀림(invalid-credential)
            if (loginError.code === 'auth/user-not-found' || loginError.code === 'auth/invalid-credential') {
                try {
                    // C. 계정 자동 생성 시도
                    await createUserWithEmailAndPassword(auth, email, safePassword);
                    console.log("새 계정 생성 후 로그인 성공");
                } catch (createError) {
                    if (createError.code === 'auth/email-already-in-use') {
                        throw new Error("비밀번호(전화번호 뒷자리)가 일치하지 않거나 시스템 오류입니다.");
                    } else {
                        throw createError; 
                    }
                }
            } else {
                throw loginError;
            }
        }

        // 4. 로그인 성공 후 데이터 세팅
        currentStudent = { id: studentDoc.id, ...studentData };
        
        // 반 상세 정보 가져오기
        if (classId) {
            const classDoc = await getDoc(doc(db, "classes", classId));
            if(classDoc.exists()) {
                currentClassData = { id: classDoc.id, ...classDoc.data() };
            }
        }

        // 5. 모듈 초기화 (DB, 학생정보 전달)
        // [중요] parentHomework.init에는 db와 currentStudent를 전달합니다.
        if (parentDailyTest) parentDailyTest.init(db, currentStudent, currentClassData);
        if (parentWeeklyTest) parentWeeklyTest.init(db, currentStudent); 
        if (parentHomework) parentHomework.init(db, currentStudent); 
        if (parentProgress) parentProgress.init(db, currentStudent, currentClassData);

        // 6. UI 업데이트
        const nameEl = document.getElementById('parent-student-name');
        if (nameEl) nameEl.textContent = currentStudent.name;
        
        // 반 이름 표시
        const classEl = document.getElementById('parent-class-name');
        if (classEl) {
            let className = '';
            if (currentClassData) {
                className = currentClassData.name;
            } else if (classIdEl && classIdEl.options[classIdEl.selectedIndex]) {
                className = classIdEl.options[classIdEl.selectedIndex].text;
            }
            classEl.textContent = className;
        }
        
        // 화면 전환
        const loginContainer = document.getElementById('parent-login-container');
        const dashboard = document.getElementById('parent-dashboard');
        
        if (loginContainer) loginContainer.classList.add('hidden');
        if (dashboard) dashboard.classList.remove('hidden');

        // 첫 탭 열기
        switchTab('daily');

    } catch (error) {
        console.error("로그인 프로세스 에러:", error);
        
        if (error.message === "STUDENT_NOT_FOUND") {
            alert("학생 정보를 찾을 수 없습니다.\n반과 이름을 다시 확인해주세요.");
        } else if (error.message === "PHONE_MISMATCH") {
            alert("전화번호 뒷 4자리가 일치하지 않습니다.");
        } else if (error.code === "auth/invalid-credential" || error.code === "auth/wrong-password") {
            alert("로그인 정보가 올바르지 않습니다.");
        } else {
            alert("로그인 실패: " + (error.message || error.code));
        }
        
        await signOut(auth);
    } finally {
        if (loginBtn) {
            loginBtn.textContent = "로그인";
            loginBtn.disabled = false;
        }
    }
}

async function handleLogout() {
    try {
        await signOut(auth);
        window.location.reload();
    } catch (e) {
        console.error("로그아웃 실패", e);
    }
}

// -----------------------------------------------------------------------------
// 4. 탭 전환 및 모듈 렌더링 호출
// -----------------------------------------------------------------------------
function switchTab(tabName) {
    // 탭 버튼 스타일 변경
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active', 'text-blue-600', 'border-blue-600');
            btn.classList.remove('text-slate-400', 'border-transparent');
        } else {
            btn.classList.remove('active', 'text-blue-600', 'border-blue-600');
            btn.classList.add('text-slate-400', 'border-transparent');
        }
    });

    // 콘텐츠 영역 전환
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    const target = document.getElementById(`tab-${tabName}`);
    if(target) target.classList.remove('hidden');

    if (!currentStudent) return;

    // 모듈 렌더링 실행
    switch (tabName) {
        case 'daily': 
            if(parentDailyTest) {
                parentDailyTest.page = 0; 
                parentDailyTest.render();
            }
            break;
        case 'weekly': 
            if(parentWeeklyTest) {
                parentWeeklyTest.page = 0;
                parentWeeklyTest.render(); 
            }
            break;
        case 'homework': 
            // [중요] fetchHomeworks() 호출 (parentHomework.js의 최신 메서드)
            if(parentHomework) parentHomework.fetchHomeworks(); 
            break;
        case 'progress': 
            if(parentProgress) parentProgress.render(); 
            break;
    }
}