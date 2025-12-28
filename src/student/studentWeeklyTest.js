// src/student/studentWeeklyTest.js

import { db } from "../shared/firebase.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { 
    getWeeklyTestTargetDate, 
    formatDateString, 
    getWeekLabel, 
    isEditAllowedForStudent 
} from "../shared/dateUtils.js";

export const studentWeeklyTest = {
    state: {
        studentId: null,
        studentName: null,
        record: null, // DB에서 가져온 내 데이터
        loading: false
    },

    elements: {
        screen: 'student-weekly-test-screen',
        title: 'weekly-test-title',
        dateInput: 'weekly-test-date',
        timeSelect: 'weekly-test-time',
        scoreInput: 'weekly-test-score',
        saveBtn: 'weekly-test-save-btn',
        statusMsg: 'weekly-test-status',
        backBtn: 'student-back-to-subjects-from-weekly-btn' // 뒤로가기 버튼 ID
    },

    // 초기화 및 실행
    async init(studentId, studentName) {
        this.state.studentId = studentId;
        this.state.studentName = studentName;
        
        // 기본값: 오늘 날짜
        const dateInput = document.getElementById(this.elements.dateInput);
        if(dateInput) {
            dateInput.value = formatDateString(new Date());
            this.handleDateChange(); // 시간 옵션 초기화
        }

        this.bindEvents();
        await this.fetchData();
    },

    bindEvents() {
        // 날짜 변경 시 시간 옵션 변경 (금 vs 주말)
        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput) {
            // 기존 리스너 제거 방식 대신 덮어쓰기
            dateInput.onchange = () => this.handleDateChange();
        }

        // 저장 버튼
        const saveBtn = document.getElementById(this.elements.saveBtn);
        if (saveBtn) {
            // cloneNode로 기존 리스너 제거 효과
            const newBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);
            newBtn.addEventListener('click', () => this.handleSave());
        }
    },

    // 금/토/일 선택에 따라 시간 목록 변경
    handleDateChange() {
        const dateInput = document.getElementById(this.elements.dateInput);
        const timeSelect = document.getElementById(this.elements.timeSelect);
        
        if (!dateInput || !timeSelect) return;

        const dateVal = dateInput.value;
        if (!dateVal) return;

        const day = new Date(dateVal).getDay(); // 5:금, 6:토, 0:일
        let options = [];

        if (day === 5) { // 금요일
            options = ['16:00', '17:00', '18:00', '19:00', '20:00'];
        } else if (day === 6 || day === 0) { // 토,일
            options = ['12:00', '13:00', '14:00', '15:00'];
        } else {
            options = []; // 선택 불가
        }

        // 옵션 렌더링
        timeSelect.innerHTML = '<option value="">시간 선택</option>';
        if (options.length === 0) {
            const opt = document.createElement('option');
            opt.text = "금/토/일만 가능";
            opt.disabled = true;
            timeSelect.appendChild(opt);
        } else {
            options.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t;
                opt.text = t;
                timeSelect.appendChild(opt);
            });
        }
        
        // 제목 업데이트 (N월 N주차)
        const targetDate = getWeeklyTestTargetDate(dateVal);
        const label = getWeekLabel(targetDate);
        const titleEl = document.getElementById(this.elements.title);
        if(titleEl) titleEl.textContent = `주간테스트 (${label})`;
    },

    // 내 예약/점수 정보 가져오기
    async fetchData() {
        if (!this.state.studentId) return;

        const targetDate = getWeeklyTestTargetDate(new Date());
        const targetDateStr = formatDateString(targetDate);
        const docId = `${this.state.studentId}_${targetDateStr}`;

        try {
            const docRef = doc(db, 'weekly_tests', docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.state.record = data;
                this.renderData(data);
            } else {
                this.state.record = null;
                this.renderStatus("아직 예약 내역이 없습니다.");
            }
        } catch (error) {
            console.error("로딩 실패:", error);
        }
    },

    renderData(data) {
        const dateInput = document.getElementById(this.elements.dateInput);
        const timeSelect = document.getElementById(this.elements.timeSelect);
        const scoreInput = document.getElementById(this.elements.scoreInput);
        
        // 값 채우기
        if (dateInput) {
            dateInput.value = data.examDate;
            this.handleDateChange(); // 시간 옵션 다시 그리기
        }
        if (timeSelect) timeSelect.value = data.examTime;
        if (scoreInput && data.score !== null) scoreInput.value = data.score;

        // 수정 권한 체크 (목요일 마감 & 점수 유무)
        const canEdit = isEditAllowedForStudent();
        const hasScore = data.score !== null && data.score !== undefined;

        // 이미 점수 냈거나, 목요일 지났으면 날짜/시간 수정 불가
        if (hasScore || !canEdit) {
            if(dateInput) dateInput.disabled = true;
            if(timeSelect) timeSelect.disabled = true;
            this.renderStatus(hasScore ? "응시 완료 ✅" : "예약됨 (변경 불가) 🕒");
        } else {
            this.renderStatus("예약 중 (목요일까지 변경 가능)");
        }
    },

    renderStatus(msg) {
        const el = document.getElementById(this.elements.statusMsg);
        if(el) el.textContent = msg;
    },

    async handleSave() {
        const dateInput = document.getElementById(this.elements.dateInput);
        const timeSelect = document.getElementById(this.elements.timeSelect);
        const scoreInput = document.getElementById(this.elements.scoreInput);

        const examDate = dateInput.value;
        const examTime = timeSelect.value;
        const score = scoreInput.value;

        if (!examDate || !examTime) return alert("날짜와 시간을 선택해주세요.");

        // 요일 체크
        const day = new Date(examDate).getDay();
        if (day !== 5 && day !== 6 && day !== 0) {
            return alert("주간테스트는 금, 토, 일요일에만 가능합니다.");
        }

        // 예약 변경 제한 (기록O, 점수X, 목요일지남 -> 차단)
        const hasRecord = this.state.record;
        const hasScore = hasRecord && hasRecord.score;
        if (hasRecord && !hasScore && !score && !isEditAllowedForStudent()) {
            return alert("예약 변경 기간(목요일)이 지났습니다.");
        }

        const targetDate = getWeeklyTestTargetDate(examDate);
        const targetDateStr = formatDateString(targetDate);
        const docId = `${this.state.studentId}_${targetDateStr}`;

        const payload = {
            uid: this.state.studentId,
            userName: this.state.studentName || "학생",
            targetDate: targetDateStr,
            weekLabel: getWeekLabel(targetDate),
            examDate: examDate,
            examTime: examTime,
            score: score ? Number(score) : null,
            status: score ? 'completed' : 'reserved',
            updatedAt: new Date()
        };

        try {
            await setDoc(doc(db, 'weekly_tests', docId), payload, { merge: true });
            this.state.record = payload;
            this.renderData(payload); // 화면 갱신 (비활성화 처리 등)
            alert("저장되었습니다.");
        } catch (e) {
            console.error(e);
            alert("저장 실패");
        }
    }
};