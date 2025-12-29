// src/student/studentDailyTest.js

import { db } from "../shared/firebase.js";
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, serverTimestamp } from "firebase/firestore";

export const studentDailyTest = {
    app: null,
    state: {
        tests: [],
        loading: false
    },

    elements: {
        // [수정됨] HTML ID와 일치하도록 변경
        listContainer: 'student-daily-test-list',    // 기존: daily-test-list-body (불일치)
        addButton: 'student-add-daily-test-btn',     // 기존: daily-test-add-btn (불일치)
        
        // 나머지는 HTML과 일치함
        subjectSelect: 'daily-test-subject-select', 
        dateInput: 'daily-test-date',
        scoreInput: 'daily-test-score',
        memoInput: 'daily-test-memo',
    },

    init(app) {
        this.app = app;
        
        // 오늘 날짜 세팅
        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }

        this.populateSubjects(); 
        this.bindEvents();
        this.fetchTests();
    },

    populateSubjects() {
        const select = document.getElementById(this.elements.subjectSelect);
        if (!select) return;

        const subjects = this.app.state.subjects || [];
        
        select.innerHTML = '<option value="">과목을 선택해주세요</option>';
        
        if (subjects.length === 0) {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.text = "배정된 과목이 없습니다";
            select.appendChild(opt);
            return;
        }

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
            // 버튼이 중복 클릭되거나 이벤트가 쌓이는 것 방지
            const newBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newBtn, addBtn);
            
            newBtn.addEventListener('click', (e) => {
                if(e) e.preventDefault(); // 새로고침 방지
                this.handleAddTest();
            });
        } else {
            console.error(`[오류] 등록 버튼(${this.elements.addButton})을 찾을 수 없습니다.`);
        }
    },

    async fetchTests() {
        const studentId = this.app.state.studentDocId;
        if (!studentId) return;
        
        this.renderLoading();

        try {
            // 색인 에러 방지를 위해 where 조건만 사용
            const q = query(
                collection(db, "daily_tests"),
                where("studentId", "==", studentId)
            );

            const querySnapshot = await getDocs(q);
            
            // 데이터 매핑
            let tests = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 최신 날짜순 정렬 (자바스크립트 처리)
            tests.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA;
            });

            this.state.tests = tests;
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

        if (!dateEl || !scoreEl || !memoEl || !subjEl) return;

        const date = dateEl.value;
        const score = scoreEl.value;
        const memo = memoEl.value;
        const subjectId = subjEl.value;

        if (!subjectId) return alert("과목을 선택해주세요.");
        if (!score) return alert("점수를 입력해주세요.");

        const subjectName = subjEl.options[subjEl.selectedIndex].text;
        const studentId = this.app.state.studentDocId;
        const studentName = this.app.state.studentName || "이름 없음";
        const classId = this.app.state.studentData?.classId || null;

        if (!studentId) {
            alert("학생 정보를 불러오지 못했습니다. 새로고침 후 다시 시도해주세요.");
            return;
        }

        if (!confirm(`${subjectName} - ${score}점\n등록하시겠습니까?`)) return;

        try {
            await addDoc(collection(db, "daily_tests"), {
                studentId: studentId,
                studentName: studentName,
                classId: classId, 
                subjectId: subjectId,
                subjectName: subjectName,
                date: date,
                score: Number(score),
                memo: memo || "",
                createdAt: serverTimestamp()
            });

            alert("등록되었습니다.");
            
            // 입력창 초기화
            scoreEl.value = '';
            memoEl.value = '';
            subjEl.value = ''; 
            
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
            console.error("삭제 실패:", error);
            alert("삭제 실패");
        }
    },

    renderLoading() {
        const container = document.getElementById(this.elements.listContainer);
        if(container) container.innerHTML = `<div class="p-4 text-center text-slate-400">로딩 중...</div>`;
    },

    renderError() {
        const container = document.getElementById(this.elements.listContainer);
        if(container) container.innerHTML = `<div class="p-4 text-center text-red-500">데이터를 불러오지 못했습니다.</div>`;
    },

    renderList() {
        const container = document.getElementById(this.elements.listContainer);
        if (!container) return;

        if (this.state.tests.length === 0) {
            container.innerHTML = `<div class="p-4 text-center text-slate-400">기록이 없습니다.</div>`;
            return;
        }

        // [수정됨] HTML 구조에 맞춰 div 기반 렌더링으로 변경 (기존 table -> div)
        container.innerHTML = this.state.tests.map(test => `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                <div>
                    <div class="text-xs text-slate-400 mb-1">${test.date}</div>
                    <div class="font-bold text-slate-700">${test.subjectName || '과목없음'}</div>
                    <div class="text-sm text-slate-500 mt-1">${test.memo || '-'}</div>
                </div>
                <div class="text-right">
                    <div class="text-lg font-bold text-blue-600 mb-1">${test.score}점</div>
                    <button class="text-red-400 hover:text-red-600 text-xs delete-btn flex items-center gap-1 justify-end ml-auto" data-id="${test.id}">
                        <span class="material-icons-round text-sm">delete</span> 삭제
                    </button>
                </div>
            </div>
        `).join('');

        container.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleDelete(e.currentTarget.dataset.id));
        });
    }
};