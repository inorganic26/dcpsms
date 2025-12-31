// src/parent/parentApp.js

import { initializeApp } from "firebase/app";
import { 
    getFirestore, collection, query, where, getDocs, doc, getDoc
} from "firebase/firestore";
import { 
    getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut 
} from "firebase/auth";

// ✅ 분리된 기능별 모듈 불러오기 (이 덕분에 코드가 짧아졌습니다)
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
let currentClassData = null; // 반 상세 정보 (과목, 타입 등)

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
    document.getElementById('parent-login-btn').addEventListener('click', handleLogin);
    document.getElementById('parent-logout-btn').addEventListener('click', handleLogout);
});

// 반 목록 드롭다운 채우기
async function loadClasses() {
    const select = document.getElementById('parent-login-class'); 
    try {
        const querySnapshot = await getDocs(collection(db, "classes"));
        select.innerHTML = '<option value="">반을 선택해주세요</option>';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.className) {
                const option = document.createElement('option');
                option.value = data.className; 
                option.textContent = data.className;
                select.appendChild(option);
            }
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
    const classSelect = document.getElementById('parent-login-class');
    const nameInput = document.getElementById('parent-login-name');
    const phoneInput = document.getElementById('parent-login-phone');

    const className = classSelect.value;
    const studentName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    if (!className || !studentName || !phone) {
        alert("모든 정보를 입력해주세요.");
        return;
    }

    const loginBtn = document.getElementById('parent-login-btn');
    loginBtn.textContent = "로그인 중...";
    loginBtn.disabled = true;

    // 임시 계정 생성 규칙 (전화번호 기반)
    const email = `p${phone}@dcprime.com`;
    const password = "123456";

    try {
        // Firebase 인증 (없으면 생성)
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                throw error;
            }
        }

        // 1. 학생 데이터 찾기
        const studentsRef = collection(db, "students");
        // 주의: 이 쿼리는 Firestore 콘솔에서 '복합 색인(Index)' 생성이 필요할 수 있습니다.
        const q = query(
            studentsRef, 
            where("className", "==", className),
            where("name", "==", studentName)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error("STUDENT_NOT_FOUND");
        }

        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();

        // 전화번호 뒷자리 검증
        if (studentData.phone && studentData.phone.slice(-4) !== phone) {
            throw new Error("PHONE_MISMATCH");
        }

        currentStudent = { id: studentDoc.id, ...studentData };
        
        // 2. 반 상세 정보(classData) 가져오기
        // (진도 모듈 등에서 반의 과목 정보나 수업 방식을 알기 위해 필요)
        let classId = currentStudent.classId;
        
        // 학생 정보에 classId가 없다면 반 이름으로 다시 검색
        if (!classId) {
             const classQ = query(collection(db, "classes"), where("className", "==", className));
             const classSnap = await getDocs(classQ);
             if(!classSnap.empty) classId = classSnap.docs[0].id;
        }

        if (classId) {
            const classDoc = await getDoc(doc(db, "classes", classId));
            if(classDoc.exists()) {
                currentClassData = { id: classDoc.id, ...classDoc.data() };
            }
        }

        // 3. 각 모듈 초기화 (DB, 학생정보, 반정보 전달)
        // 여기서 초기화해두면 이후 탭 전환 시 바로 사용 가능
        parentDailyTest.init(db, currentStudent, currentClassData);
        parentWeeklyTest.init(db, currentStudent); 
        parentHomework.init(db, currentStudent);
        parentProgress.init(db, currentStudent, currentClassData);

        // UI 업데이트
        document.getElementById('parent-student-name').textContent = currentStudent.name;
        document.getElementById('parent-class-name').textContent = currentStudent.className;
        
        document.getElementById('parent-login-container').classList.add('hidden');
        document.getElementById('parent-dashboard').classList.remove('hidden');

        // 기본 탭 로드
        switchTab('daily');

    } catch (error) {
        console.error("로그인 프로세스 에러:", error);
        await signOut(auth);
        
        if (error.message === "STUDENT_NOT_FOUND") alert("학생 정보를 찾을 수 없습니다.\n반과 이름을 다시 확인해주세요.");
        else if (error.message === "PHONE_MISMATCH") alert("전화번호가 등록된 정보와 일치하지 않습니다.");
        else alert("로그인 중 오류가 발생했습니다: " + error.message);
    } finally {
        loginBtn.textContent = "로그인";
        loginBtn.disabled = false;
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

    // ✅ 각 모듈의 렌더링 함수 실행
    // (이전에는 여기에 긴 코드가 있었지만, 이제는 한 줄씩만 호출하면 됩니다)
    switch (tabName) {
        case 'daily': 
            parentDailyTest.page = 0; // 탭 열 때마다 1페이지로 초기화
            parentDailyTest.render(); 
            break;
        case 'weekly': 
            parentWeeklyTest.page = 0;
            parentWeeklyTest.render(); 
            break;
        case 'homework': 
            parentHomework.render(); 
            break;
        case 'progress': 
            parentProgress.render(); 
            break;
    }
}