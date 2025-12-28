import { db } from "../shared/firebase.js";
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc } from "firebase/firestore";

export const studentDailyTest = {
    // 상태 저장
    state: {
        studentId: null,
        studentName: null,
        tests: [],
        loading: false
    },

    // DOM 요소 ID 매핑 (HTML에 이 ID를 가진 요소들이 미리 있어야 함)
    elements: {
        listContainer: 'daily-test-list-body', // <tbody> ID
        dateInput: 'daily-test-date',
        scoreInput: 'daily-test-score',
        memoInput: 'daily-test-memo',
        addButton: 'daily-test-add-btn',
    },

    // 초기화 함수
    init(studentId, studentName) {
        this.state.studentId = studentId;
        this.state.studentName = studentName;
        
        // 오늘 날짜 기본 세팅
        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        this.bindEvents();
        this.fetchTests();
    },

    bindEvents() {
        const addBtn = document.getElementById(this.elements.addButton);
        if (addBtn) {
            // 기존 리스너 제거 후 추가 (중복 방지)
            const newBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newBtn, addBtn);
            newBtn.addEventListener('click', () => this.handleAddTest());
        }
    },

    // 데이터 불러오기
    async fetchTests() {
        if (!this.state.studentId) return;
        
        this.renderLoading();

        try {
            const q = query(
                collection(db, "daily_tests"),
                where("studentId", "==", this.state.studentId),
                orderBy("date", "desc")
            );

            const querySnapshot = await getDocs(q);
            this.state.tests = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            this.renderList();
        } catch (error) {
            console.error("데이터 로딩 실패:", error);
            this.renderError();
        }
    },

    // 테스트 추가
    async handleAddTest() {
        const dateEl = document.getElementById(this.elements.dateInput);
        const scoreEl = document.getElementById(this.elements.scoreInput);
        const memoEl = document.getElementById(this.elements.memoInput);

        const date = dateEl.value;
        const score = scoreEl.value;
        const memo = memoEl.value;

        if (!score) return alert("점수를 입력해주세요!");
        if (!confirm(`${date} 일자 테스트 점수(${score}점)를 등록하시겠습니까?`)) return;

        try {
            await addDoc(collection(db, "daily_tests"), {
                studentId: this.state.studentId,
                studentName: this.state.studentName || "이름 없음",
                date,
                score: Number(score),
                memo,
                createdAt: new Date()
            });

            alert("등록되었습니다.");
            scoreEl.value = '';
            memoEl.value = '';
            this.fetchTests(); // 목록 갱신
        } catch (error) {
            console.error("저장 에러:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    },

    // 테스트 삭제
    async handleDelete(id) {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "daily_tests", id));
            this.fetchTests();
        } catch (error) {
            console.error("삭제 실패:", error);
            alert("삭제에 실패했습니다.");
        }
    },

    // --- 렌더링 관련 함수들 ---

    renderLoading() {
        const tbody = document.getElementById(this.elements.listContainer);
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center">로딩 중...</td></tr>`;
    },

    renderError() {
        const tbody = document.getElementById(this.elements.listContainer);
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">데이터를 불러오지 못했습니다.</td></tr>`;
    },

    renderList() {
        const tbody = document.getElementById(this.elements.listContainer);
        if (!tbody) return;

        if (this.state.tests.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-gray-400">기록이 없습니다.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.state.tests.map(test => `
            <tr class="hover:bg-gray-50 border-b border-gray-100">
                <td class="p-2 text-gray-800">${test.date}</td>
                <td class="p-2 font-bold text-blue-600">${test.score}점</td>
                <td class="p-2 text-gray-500">${test.memo || '-'}</td>
                <td class="p-2 text-right">
                    <button class="text-red-500 hover:text-red-700 underline text-xs delete-btn" data-id="${test.id}">
                        삭제
                    </button>
                </td>
            </tr>
        `).join('');

        // 삭제 버튼에 이벤트 연결 (동적 생성된 요소이므로 렌더링 후 연결)
        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.handleDelete(e.target.dataset.id);
            });
        });
    }
};