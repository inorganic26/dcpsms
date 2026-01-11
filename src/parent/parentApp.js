// src/parent/parentApp.js

import { initializeApp } from "firebase/app";
import { 
    getFirestore, collection, getDocs, doc, getDoc
} from "firebase/firestore";
import { 
    getAuth, signInWithCustomToken, signOut, onAuthStateChanged,
    setPersistence, browserLocalPersistence 
} from "firebase/auth";
import { 
    getFunctions, httpsCallable 
} from "firebase/functions";

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

    // [핵심] 로그인 상태 감지 (로딩 멈춤 해결)
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // 이미 데이터가 로드되어 있으면 스킵
            if (currentStudent) return;

            try {
                // 토큰에서 claims(권한 정보) 확인
                const tokenResult = await user.getIdTokenResult();
                const claims = tokenResult.claims;

                // 🚀 [수정됨] 학부모 권한이 확실할 때만 진행
                if (claims.role === 'parent' && claims.studentId) {
                    console.log("학부모 세션 복구 중...", claims.studentId);
                    
                    // 자녀 정보 다시 불러오기
                    const studentDoc = await getDoc(doc(db, "students", claims.studentId));
                    if (studentDoc.exists()) {
                        const sData = { id: studentDoc.id, ...studentDoc.data() };
                        
                        // 전역 변수 복구
                        currentStudent = sData;
                        
                        // 반 정보 복구
                        if (sData.classId) {
                            const cDoc = await getDoc(doc(db, "classes", sData.classId));
                            if(cDoc.exists()) currentClassData = { id: cDoc.id, ...cDoc.data() };
                        }

                        // 모듈 초기화
                        if (parentDailyTest) parentDailyTest.init(db, currentStudent, currentClassData);
                        if (parentWeeklyTest) parentWeeklyTest.init(db, currentStudent, currentClassData); 
                        if (parentHomework) parentHomework.init(db, currentStudent); 
                        if (parentProgress) parentProgress.init(db, currentStudent, currentClassData);

                        // UI 업데이트
                        updateUIOnLogin();
                    } else {
                        // 학생 데이터가 사라진 경우 -> 로그아웃
                        throw new Error("학생 정보를 찾을 수 없습니다.");
                    }
                } else {
                    // 🚀 [추가됨] 로그인은 됐는데 학부모가 아닌 경우 -> 로그아웃
                    console.warn("학부모 권한이 없습니다. 로그아웃합니다.");
                    await signOut(auth); // 여기서 강제로 내보내서 로그인 화면으로 보냄
                }
            } catch(e) { 
                console.error("세션 복구 실패:", e); 
                await signOut(auth); // 에러 나면 안전하게 로그아웃
            }
        } else {
            // 로그아웃 상태면 로그인 화면 보이기
            showLoginScreen();
        }
    });
});

// UI 업데이트 헬퍼 함수
function updateUIOnLogin() {
    const nameEl = document.getElementById('parent-student-name');
    if (nameEl) nameEl.textContent = currentStudent.name;
    
    const classEl = document.getElementById('parent-class-name');
    if (classEl && currentClassData) {
        classEl.textContent = currentClassData.name;
    }
    
    const loginContainer = document.getElementById('parent-login-container');
    const dashboard = document.getElementById('parent-dashboard');
    
    if (loginContainer) loginContainer.classList.add('hidden');
    if (dashboard) dashboard.classList.remove('hidden');

    switchTab('daily');
}

// 🚀 [추가됨] 로그인 화면 강제 표시 함수
function showLoginScreen() {
    const loginContainer = document.getElementById('parent-login-container');
    const dashboard = document.getElementById('parent-dashboard');
    if (loginContainer) loginContainer.classList.remove('hidden');
    if (dashboard) dashboard.classList.add('hidden');
}

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
            const clsName = data.name || data.className;
            if (clsName) {
                classes.push({ id: doc.id, name: clsName });
            }
        });
        
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
        loginBtn.textContent = "로그인 중...";
        loginBtn.disabled = true;
    }

    try {
        // [핵심] 로그인 유지 설정
        await setPersistence(auth, browserLocalPersistence);

        const functions = getFunctions(app, 'asia-northeast3');
        const verifyParentLoginFn = httpsCallable(functions, 'verifyParentLogin');

        const result = await verifyParentLoginFn({ 
            classId, 
            studentName, 
            phoneSuffix 
        });

        const data = result.data;

        if (!data.success) {
            throw new Error(data.message || "로그인 실패");
        }

        await signInWithCustomToken(auth, data.token);
        console.log("학부모 로그인 성공");

        // 데이터 세팅
        currentStudent = data.studentData;

        if (classId) {
            const classDoc = await getDoc(doc(db, "classes", classId));
            if(classDoc.exists()) {
                currentClassData = { id: classDoc.id, ...classDoc.data() };
            }
        }

        if (parentDailyTest) parentDailyTest.init(db, currentStudent, currentClassData);
        if (parentWeeklyTest) parentWeeklyTest.init(db, currentStudent, currentClassData); 
        if (parentHomework) parentHomework.init(db, currentStudent); 
        if (parentProgress) parentProgress.init(db, currentStudent, currentClassData);

        updateUIOnLogin();

    } catch (error) {
        console.error("로그인 프로세스 에러:", error);
        alert(error.message || "로그인 중 오류가 발생했습니다.");
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
    document.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === tabName) {
            btn.classList.add('active', 'text-blue-600', 'border-blue-600');
            btn.classList.remove('text-slate-400', 'border-transparent');
        } else {
            btn.classList.remove('active', 'text-blue-600', 'border-blue-600');
            btn.classList.add('text-slate-400', 'border-transparent');
        }
    });

    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });
    const target = document.getElementById(`tab-${tabName}`);
    if(target) target.classList.remove('hidden');

    if (!currentStudent) return;

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
            if(parentHomework) parentHomework.fetchHomeworks(); 
            break;
        case 'progress': 
            if(parentProgress) parentProgress.render(); 
            break;
    }
}