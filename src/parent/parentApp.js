// =============================================================================
// [parentApp.js] 학부모님 앱 메인 로직 (완성본)
// - 반: 드롭다운 선택 / 이름: 직접 입력 / 비번: 전화번호 뒷4자리
// - 기능: 자동 회원가입 및 로그인, 성적/숙제/진도 조회
// =============================================================================

import { initializeApp } from "firebase/app";
import { 
    getFirestore, collection, query, where, getDocs, doc, getDoc, 
    collectionGroup, orderBy, limit 
} from "firebase/firestore";
// ✅ 인증(Auth) 관련 필수 기능
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut
} from "firebase/auth";

// -----------------------------------------------------------------------------
// 1. 파이어베이스 설정 (svcm-v2 프로젝트)
// -----------------------------------------------------------------------------
const firebaseConfig = {
  apiKey: "AIzaSyBWto_OQ5pXI1i4NDTrEiqNZwZInmbxDwY",
  authDomain: "svcm-v2.firebaseapp.com",
  projectId: "svcm-v2",
  storageBucket: "svcm-v2.firebasestorage.app",
  messagingSenderId: "189740450655",
  appId: "1:189740450655:web:a7bf1b03d23352a09b2cea"
};

// 앱 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

let currentStudent = null; // 로그인한 학생 정보

// -----------------------------------------------------------------------------
// 2. 페이지 로드 시 실행
// -----------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
    // [중요] 로그인 전이라도 반 목록은 보여야 하므로 DB에서 가져옵니다.
    // (firestore.rules에서 classes 읽기가 허용되어 있어야 함)
    await loadClasses();

    // 탭 버튼 클릭 이벤트
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            switchTab(tabName);
        });
    });

    // 로그인 버튼 클릭
    document.getElementById('parent-login-btn').addEventListener('click', handleLogin);
    
    // 로그아웃 버튼
    document.getElementById('parent-logout-btn').addEventListener('click', handleLogout);
});

// 반 목록을 가져와서 드롭다운(<select>)에 채워넣는 함수
async function loadClasses() {
    const select = document.getElementById('parent-login-class'); 
    
    try {
        const querySnapshot = await getDocs(collection(db, "classes"));
        
        select.innerHTML = '<option value="">반을 선택해주세요</option>';
        
        // DB에 있는 반 이름들로 옵션 생성
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
        console.warn("반 목록 로딩 실패 (직접 입력 필요):", error);
        // 혹시 에러가 나더라도 사용자가 당황하지 않게 안내
        select.innerHTML = '<option value="">반 정보를 불러오지 못했습니다</option>';
    }
}

// =============================================================================
// 3. [핵심] 로그인 및 자동 회원가입 처리
// =============================================================================
async function handleLogin() {
    const classSelect = document.getElementById('parent-login-class');
    const nameInput = document.getElementById('parent-login-name');
    const phoneInput = document.getElementById('parent-login-phone');

    const className = classSelect.value;
    const studentName = nameInput.value.trim();
    const phone = phoneInput.value.trim();

    // 입력값 검증
    if (!className) {
        alert("반을 선택해주세요.");
        return;
    }
    if (!studentName || !phone) {
        alert("이름과 전화번호 뒷 4자리를 모두 입력해주세요.");
        return;
    }

    const loginBtn = document.getElementById('parent-login-btn');
    loginBtn.textContent = "로그인 중...";
    loginBtn.disabled = true;

    // -----------------------------------------------------------
    // 계정 규칙: p + 전화번호4자리 + @dcprime.com / 비번: 123456
    // -----------------------------------------------------------
    const email = `p${phone}@dcprime.com`;
    const password = "123456";

    try {
        // [1] 기존 계정으로 로그인 시도
        await signInWithEmailAndPassword(auth, email, password);
        console.log("기존 계정 로그인 성공");

    } catch (error) {
        // [2] 계정이 없으면(User not found), 새로 생성 (자동 가입)
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found') {
            console.log("계정 없음 -> 신규 생성 시도");
            try {
                await createUserWithEmailAndPassword(auth, email, password);
                console.log("신규 계정 생성 및 로그인 완료");
            } catch (createError) {
                console.error("계정 생성 실패:", createError);
                alert("로그인 처리 중 오류가 발생했습니다. (계정 생성 실패)");
                resetBtn(); return;
            }
        } else {
            console.error("로그인 에러:", error);
            alert("시스템 오류: " + error.message);
            resetBtn(); return;
        }
    }

    // -----------------------------------------------------------
    // 로그인 성공 후: 진짜 학생 데이터 확인
    // -----------------------------------------------------------
    try {
        const studentsRef = collection(db, "students");
        // [검색 조건] 반(className)과 이름(name)이 일치하는 학생 찾기
        const q = query(
            studentsRef, 
            where("className", "==", className),
            where("name", "==", studentName)
        );

        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            throw new Error("STUDENT_NOT_FOUND");
        }

        // 학생 찾음!
        const studentDoc = querySnapshot.docs[0];
        const studentData = studentDoc.data();

        // (선택) 전화번호 뒷자리 검증 (DB에 저장된 번호와 비교)
        if (studentData.phone) {
            const dbPhoneLast4 = studentData.phone.slice(-4);
            // 만약 DB 번호와 입력 번호가 다르면 차단 (보안 강화)
            if (dbPhoneLast4 !== phone) {
                throw new Error("PHONE_MISMATCH");
            }
        }

        // 통과 -> 정보 저장 및 화면 이동
        currentStudent = { id: studentDoc.id, ...studentData };
        
        // 상단 헤더 정보 업데이트
        document.getElementById('parent-student-name').textContent = currentStudent.name;
        document.getElementById('parent-class-name').textContent = currentStudent.className;
        
        // 화면 전환
        document.getElementById('parent-login-container').classList.add('hidden');
        document.getElementById('parent-dashboard').classList.remove('hidden');

        // 첫 탭 로드
        switchTab('daily');

    } catch (dbError) {
        console.error("학생 정보 확인 실패:", dbError);
        await signOut(auth); // 실패 시 로그아웃
        
        if (dbError.message === "STUDENT_NOT_FOUND") {
            alert(`선택하신 '${className}'에 '${studentName}' 학생이 없습니다.\n반과 이름을 다시 확인해주세요.`);
        } else if (dbError.message === "PHONE_MISMATCH") {
            alert("입력하신 전화번호가 등록된 정보와 일치하지 않습니다.");
        } else {
            alert("학생 정보를 불러오는데 실패했습니다.");
        }
    } finally {
        resetBtn();
    }

    function resetBtn() {
        loginBtn.textContent = "로그인";
        loginBtn.disabled = false;
    }
}

// 로그아웃
async function handleLogout() {
    try {
        await signOut(auth);
        window.location.reload();
    } catch (error) {
        console.error("로그아웃 실패:", error);
    }
}


// =============================================================================
// 4. 탭 및 데이터 로딩 기능
// =============================================================================

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
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');

    loadTabData(tabName);
}

function loadTabData(tabName) {
    if (!currentStudent) return;
    switch (tabName) {
        case 'daily': loadDailyTests(); break;
        case 'weekly': loadWeeklyTests(); break;
        case 'homework': loadHomeworks(); break;
        case 'progress': loadProgress(); break;
    }
}

// 1. 일일 테스트 로드
async function loadDailyTests() {
    const listContainer = document.getElementById('daily-test-list');
    listContainer.innerHTML = '<div class="loader-small mx-auto mt-10"></div>';

    try {
        const q = query(
            collectionGroup(db, 'submissions'),
            where('studentId', '==', currentStudent.id),
            where('type', '==', 'daily'),
            orderBy('submittedAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-center text-slate-400 py-10">응시한 일일 테스트가 없습니다.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.submittedAt ? new Date(data.submittedAt.toDate()).toLocaleDateString() : '-';
            const score = data.score !== undefined ? data.score : '-';
            const scoreColor = score >= 80 ? 'text-blue-600' : (score >= 60 ? 'text-amber-500' : 'text-red-500');

            html += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-slate-700">${data.testName || '일일 테스트'}</h3>
                        <p class="text-xs text-slate-400 mt-1">${date}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-2xl font-bold ${scoreColor}">${score}</span>
                        <span class="text-xs text-slate-400">점</span>
                    </div>
                </div>`;
        });
        listContainer.innerHTML = html;
    } catch (error) {
        console.error("일일테스트 로드 실패:", error);
        listContainer.innerHTML = '<p class="text-center text-red-400 py-10">데이터를 불러오지 못했습니다.</p>';
    }
}

// 2. 주간 테스트 로드
async function loadWeeklyTests() {
    const listContainer = document.getElementById('weekly-test-list');
    listContainer.innerHTML = '<div class="loader-small mx-auto mt-10"></div>';

    try {
        const q = query(
            collectionGroup(db, 'submissions'),
            where('studentId', '==', currentStudent.id),
            where('type', '==', 'weekly'),
            orderBy('submittedAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-center text-slate-400 py-10">응시한 주간 테스트가 없습니다.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.submittedAt ? new Date(data.submittedAt.toDate()).toLocaleDateString() : '-';
            const score = data.score !== undefined ? data.score : '-';
            const scoreColor = score >= 80 ? 'text-blue-600' : (score >= 60 ? 'text-amber-500' : 'text-red-500');

            html += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-slate-700">${data.testName || '주간 테스트'}</h3>
                        <p class="text-xs text-slate-400 mt-1">${date}</p>
                    </div>
                    <div class="text-right">
                        <span class="text-2xl font-bold ${scoreColor}">${score}</span>
                        <span class="text-xs text-slate-400">점</span>
                    </div>
                </div>`;
        });
        listContainer.innerHTML = html;
    } catch (error) {
        console.error("주간테스트 로드 실패:", error);
        listContainer.innerHTML = '<p class="text-center text-red-400 py-10">데이터를 불러오지 못했습니다.</p>';
    }
}

// 3. 숙제 로드
async function loadHomeworks() {
    const listContainer = document.getElementById('homework-list');
    listContainer.innerHTML = '<div class="loader-small mx-auto mt-10"></div>';

    try {
        const q = query(
            collectionGroup(db, 'submissions'),
            where('studentId', '==', currentStudent.id),
            where('type', '==', 'homework'),
            orderBy('submittedAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-center text-slate-400 py-10">제출한 숙제가 없습니다.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.submittedAt ? new Date(data.submittedAt.toDate()).toLocaleDateString() : '-';
            const status = data.isCompleted ? '완료' : '미완료';
            const statusClass = data.isCompleted ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500';

            html += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
                    <div>
                        <h3 class="font-bold text-slate-700">${data.title || '숙제'}</h3>
                        <p class="text-xs text-slate-400 mt-1">${date} 제출</p>
                    </div>
                    <div>
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${statusClass}">${status}</span>
                    </div>
                </div>`;
        });
        listContainer.innerHTML = html;
    } catch (error) {
        console.error("숙제 로드 실패:", error);
        listContainer.innerHTML = '<p class="text-center text-red-400 py-10">데이터를 불러오지 못했습니다.</p>';
    }
}

// 4. 진도 로드
async function loadProgress() {
    const listContainer = document.getElementById('progress-live-list');
    document.getElementById('progress-live').classList.remove('hidden');
    listContainer.innerHTML = '<div class="loader-small mx-auto mt-10"></div>';

    try {
        const q = query(
            collectionGroup(db, 'submissions'),
            where('studentId', '==', currentStudent.id),
            where('type', '==', 'video'),
            orderBy('updatedAt', 'desc'),
            limit(10)
        );

        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
            listContainer.innerHTML = '<p class="text-center text-slate-400 py-10">최근 학습 기록이 없습니다.</p>';
            return;
        }

        let html = '';
        snapshot.forEach(doc => {
            const data = doc.data();
            const date = data.updatedAt ? new Date(data.updatedAt.toDate()).toLocaleDateString() : '-';
            const progress = data.progressRate || 0;

            html += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-2">
                    <div class="flex justify-between items-center mb-2">
                        <h3 class="font-bold text-slate-700 text-sm">${data.videoTitle || '강의 영상'}</h3>
                        <span class="text-xs text-slate-400">${date}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2.5">
                        <div class="bg-blue-600 h-2.5 rounded-full" style="width: ${progress}%"></div>
                    </div>
                    <p class="text-right text-xs text-blue-600 mt-1 font-bold">${progress}% 학습</p>
                </div>`;
        });
        listContainer.innerHTML = html;
    } catch (error) {
        console.error("진도 로드 실패:", error);
        listContainer.innerHTML = '<p class="text-center text-red-400 py-10">데이터를 불러오지 못했습니다.</p>';
    }
}