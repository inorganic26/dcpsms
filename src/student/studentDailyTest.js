// src/student/studentDailyTest.js

import { db } from "../shared/firebase.js";
import { collection, addDoc, query, where, getDocs, orderBy, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export const studentDailyTest = {
    app: null,
    state: {
        tests: [],
        loading: false
    },

    elements: {
        listContainer: 'daily-test-list-body',
        subjectSelect: 'daily-test-subject-select', // [추가] 과목 선택 ID
        dateInput: 'daily-test-date',
        scoreInput: 'daily-test-score',
        memoInput: 'daily-test-memo',
        addButton: 'daily-test-add-btn',
    },

    // [수정] App 인스턴스를 받도록 변경
    init(app) {
        this.app = app;
        
        // 오늘 날짜 세팅
        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        this.populateSubjects(); // [추가] 과목 목록 채우기
        this.bindEvents();
        this.fetchTests();
    },

    // [신규] 과목 목록 드롭다운 생성
    populateSubjects() {
        const select = document.getElementById(this.elements.subjectSelect);
        if (!select) return;

        // App에 로드된 과목 정보 가져오기
        const subjects = this.app.state.subjects || [];
        
        select.innerHTML = '<option value="">과목을 선택해주세요</option>';
        subjects.forEach(sub => {
            const opt = document.createElement('option');
            opt.value = sub.id;
            opt.text = sub.name;
            select.appendChild(opt);
        });
    },

    bindEvents() {
        const addBtn = document.getElementById(this.elements.addButton);
        if (addBtn) {
            const newBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newBtn, addBtn);
            newBtn.addEventListener('click', () => this.handleAddTest());
        }
    },

    async fetchTests() {
        const studentId = this.app.state.studentDocId;
        if (!studentId) return;
        
        this.renderLoading();

        try {
            const q = query(
                collection(db, "daily_tests"),
                where("studentId", "==", studentId),
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

    async handleAddTest() {
        const dateEl = document.getElementById(this.elements.dateInput);
        const scoreEl = document.getElementById(this.elements.scoreInput);
        const memoEl = document.getElementById(this.elements.memoInput);
        const subjEl = document.getElementById(this.elements.subjectSelect);

        const date = dateEl.value;
        const score = scoreEl.value;
        const memo = memoEl.value;
        const subjectId = subjEl.value;

        if (!subjectId) return alert("과목을 선택해주세요.");
        if (!score) return alert("점수를 입력해주세요.");

        const subjectName = subjEl.options[subjEl.selectedIndex].text;

        if (!confirm(`${subjectName} - ${score}점\n등록하시겠습니까?`)) return;

        try {
            await addDoc(collection(db, "daily_tests"), {
                studentId: this.app.state.studentDocId,
                studentName: this.app.state.studentName || "이름 없음",
                classId: this.app.state.studentData?.classId || null, // 반 정보도 추가
                subjectId,
                subjectName,
                date,
                score: Number(score),
                memo,
                createdAt: serverTimestamp()
            });

            alert("등록되었습니다.");
            scoreEl.value = '';
            memoEl.value = '';
            subjEl.value = ''; // 과목 선택 초기화
            this.fetchTests();
        } catch (error) {
            console.error("저장 에러:", error);
            alert("저장 중 오류가 발생했습니다.");
        }
    },

    async handleDelete(id) {
        if (!confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, "daily_tests", id));
            this.fetchTests();
        } catch (error) {
            alert("삭제 실패");
        }
    },

    renderLoading() {
        const tbody = document.getElementById(this.elements.listContainer);
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center">로딩 중...</td></tr>`;
    },

    renderError() {
        const tbody = document.getElementById(this.elements.listContainer);
        if(tbody) tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">오류 발생</td></tr>`;
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
                <td class="p-2">
                    <div class="text-xs text-slate-400">${test.date}</div>
                    <div class="font-bold text-slate-700">${test.subjectName || '과목없음'}</div>
                </td>
                <td class="p-2 font-bold text-blue-600">${test.score}점</td>
                <td class="p-2 text-gray-500 text-sm">${test.memo || '-'}</td>
                <td class="p-2 text-right">
                    <button class="text-red-400 hover:text-red-600 text-xs delete-btn" data-id="${test.id}">
                        <span class="material-icons-round text-sm">delete</span>
                    </button>
                </td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
    }
};