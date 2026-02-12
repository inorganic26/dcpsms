// src/student/studentWeeklyTest.js

import imageCompression from 'browser-image-compression';
import { db, storage } from "../shared/firebase.js";
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { showToast } from "../shared/utils.js";
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
        record: null,
        history: [],
        loading: false,
        selectedFiles: [],
        existingImages: [] // 기존 이미지 관리용
    },

    elements: {
        screen: 'student-weekly-test-screen',
        title: 'weekly-test-title',
        dateInput: 'weekly-test-date',
        timeSelect: 'weekly-test-time',
        scoreInput: 'weekly-test-score',
        saveBtn: 'weekly-test-save-btn',
        statusMsg: 'weekly-test-status',
        backBtn: 'student-back-to-subjects-from-weekly-btn',
        historyList: 'weekly-test-history-list',
        fileBtn: 'weekly-test-file-btn',
        fileInput: 'weekly-test-file-input',
        filePreview: 'weekly-test-file-preview'
    },

    async init(studentId, studentName) {
        this.state.studentId = studentId;
        this.state.studentName = studentName;
        this.state.selectedFiles = [];
        this.state.existingImages = [];
        
        const dateInput = document.getElementById(this.elements.dateInput);
        
        // 1. 초기 날짜 설정 (오늘)
        if(dateInput) {
            dateInput.value = formatDateString(new Date());
            // 초기 데이터 로드 (오늘 기준)
            await this.handleDateChange(); 
        }

        this.bindEvents();
        await this.fetchHistory();
    },

    bindEvents() {
        const dateInput = document.getElementById(this.elements.dateInput);
        // ✨ [수정] 날짜 변경 시 해당 주차 데이터 불러오기
        if (dateInput) {
            dateInput.onchange = async () => {
                await this.handleDateChange();
            };
        }

        const saveBtn = document.getElementById(this.elements.saveBtn);
        if (saveBtn) {
            const newBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);
            newBtn.addEventListener('click', () => this.handleSave(newBtn));
        }
        
        const fileBtn = document.getElementById(this.elements.fileBtn);
        const fileInput = document.getElementById(this.elements.fileInput);
        if(fileBtn && fileInput) {
            fileBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleFileSelect(e);
        }
    },

    // 파일 미리보기 및 선택 처리
    renderFilePreview() {
        const container = document.getElementById(this.elements.filePreview);
        const btn = document.getElementById(this.elements.fileBtn);
        if (!container) return;
        
        container.innerHTML = '';

        // 1. 기존 이미지 (삭제 가능)
        this.state.existingImages.forEach((url, index) => {
            const div = document.createElement('div');
            div.className = "relative inline-block m-1";
            div.innerHTML = `
                <img src="${url}" class="w-16 h-16 object-cover rounded-lg border border-indigo-200">
                <button class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow hover:bg-red-600">
                    <span class="material-icons-round text-xs block">close</span>
                </button>`;
            
            div.querySelector('button').onclick = (e) => {
                e.preventDefault();
                this.state.existingImages.splice(index, 1);
                this.renderFilePreview();
            };
            container.appendChild(div);
        });

        // 2. 신규 파일
        this.state.selectedFiles.forEach((file, index) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const div = document.createElement('div');
                div.className = "relative inline-block m-1";
                div.innerHTML = `
                    <img src="${e.target.result}" class="w-16 h-16 object-cover rounded-lg border border-green-200 opacity-90">
                    <button class="absolute -top-2 -right-2 bg-slate-500 text-white rounded-full p-0.5 shadow hover:bg-slate-600">
                        <span class="material-icons-round text-xs block">close</span>
                    </button>`;
                div.querySelector('button').onclick = (e) => {
                    e.preventDefault();
                    this.state.selectedFiles.splice(index, 1);
                    this.renderFilePreview();
                };
                container.appendChild(div);
            };
            reader.readAsDataURL(file);
        });

        // 버튼 텍스트 업데이트
        const total = this.state.existingImages.length + this.state.selectedFiles.length;
        if(btn) {
            btn.innerHTML = total > 0 
                ? `<span class="material-icons-round text-green-500">check_circle</span> 총 ${total}장`
                : `<span class="material-icons-round">add_a_photo</span> 사진 선택`;
        }
    },

    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.state.selectedFiles = [...this.state.selectedFiles, ...files];
        this.renderFilePreview();
        event.target.value = '';
    },

    // ✨ [수정] 날짜 변경 핸들러 + 데이터 로드 통합
    async handleDateChange() {
        const dateInput = document.getElementById(this.elements.dateInput);
        const timeSelect = document.getElementById(this.elements.timeSelect);
        if (!dateInput || !timeSelect) return;
        
        const dateVal = dateInput.value;
        if (!dateVal) return;
        
        // 1. 시간 옵션 설정
        const day = new Date(dateVal).getDay();
        let options = [];
        if (day === 5) options = ['16:00', '17:00', '18:00', '19:00', '20:00'];
        else if (day === 6 || day === 0) options = ['12:00', '13:00', '14:00', '15:00'];
        
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
        
        // 2. 타이틀 업데이트
        const targetDate = getWeeklyTestTargetDate(dateVal);
        const label = getWeekLabel(targetDate);
        const titleEl = document.getElementById(this.elements.title);
        if(titleEl) titleEl.textContent = `주간테스트 (${label})`;

        // 3. 해당 날짜 데이터 불러오기 (fetchCurrentWeekData 기능 통합)
        await this.fetchDataByDate(dateVal);
    },

    // ✨ [신규] 특정 날짜 기준 데이터 불러오기
    async fetchDataByDate(dateString) {
        if (!this.state.studentId) return;

        const targetDate = getWeeklyTestTargetDate(dateString);
        const targetDateStr = formatDateString(targetDate);
        const docId = `${this.state.studentId}_${targetDateStr}`;
        
        try {
            const docRef = doc(db, 'weekly_tests', docId);
            const docSnap = await getDoc(docRef);
            
            // 폼 초기화
            this.state.selectedFiles = [];
            this.state.existingImages = [];

            if (docSnap.exists()) {
                const data = docSnap.data();
                this.state.record = data;
                this.state.existingImages = data.imageUrls || [];
                this.renderCurrentData(data);
            } else {
                this.state.record = null;
                // 기록 없으면 시간/점수 초기화
                const timeSelect = document.getElementById(this.elements.timeSelect);
                const scoreInput = document.getElementById(this.elements.scoreInput);
                if(timeSelect) timeSelect.value = '';
                if(scoreInput) scoreInput.value = '';
                
                this.renderStatus("기록이 없습니다. (신규 예약/입력 가능)");
            }
            this.renderFilePreview();
        } catch (error) {
            console.error(error);
            this.state.record = null;
            this.renderStatus("데이터 로드 오류");
        }
    },

    async fetchHistory() {
        if (!this.state.studentId) return;
        try {
            const q = query(
                collection(db, "weekly_tests"),
                where("uid", "==", this.state.studentId),
                orderBy("targetDate", "desc")
            );
            const querySnapshot = await getDocs(q);
            this.state.history = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderHistory();
        } catch (error) { console.error(error); }
    },

    renderCurrentData(data) {
        // 이미 handleDateChange에서 호출되므로 값만 채워줌
        const timeSelect = document.getElementById(this.elements.timeSelect);
        const scoreInput = document.getElementById(this.elements.scoreInput);
        
        if (timeSelect && data.examTime) timeSelect.value = data.examTime;
        if (scoreInput && data.score !== null) scoreInput.value = data.score;

        // ✨ [수정] 날짜 입력창은 항상 활성화 (지난 기록 조회를 위해)
        const dateInput = document.getElementById(this.elements.dateInput);
        if(dateInput) dateInput.disabled = false;

        // 점수가 있으면 수정 불가? -> 아니요, 수정 가능하게 열어둡니다.
        // 만약 '제출 완료 후 수정 불가'를 원하시면 여기 조건을 추가하면 됩니다.
        
        const hasScore = data.score !== null && data.score !== undefined;
        if (hasScore) {
            this.renderStatus("응시 완료 ✅ (수정 가능)");
        } else {
            this.renderStatus("예약 중 / 미응시");
        }
    },

    renderHistory() {
        const container = document.getElementById(this.elements.historyList);
        if (!container) return;
        if (this.state.history.length === 0) {
            container.innerHTML = '<p class="text-center text-slate-400 py-4 text-sm">아직 기록이 없습니다.</p>';
            return;
        }
        container.innerHTML = this.state.history.map(item => {
            const scoreDisplay = item.score !== null 
                ? `<span class="text-lg font-bold ${item.score >= 90 ? 'text-blue-600' : (item.score < 70 ? 'text-red-500' : 'text-slate-700')}">${item.score}점</span>`
                : `<span class="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">미응시</span>`;
            
            const hasImage = item.imageUrls && item.imageUrls.length > 0;
            const icon = hasImage ? `<span class="material-icons-round text-xs text-indigo-500 ml-1">image</span>` : '';

            // 리스트 클릭 시 해당 날짜로 이동하는 기능 추가
            return `
                <div class="history-item cursor-pointer hover:bg-slate-50 transition bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center" 
                     data-date="${item.examDate}">
                    <div>
                        <h4 class="font-bold text-slate-700 text-sm mb-1 flex items-center">${item.weekLabel || item.targetDate} ${icon}</h4>
                        <p class="text-xs text-slate-400">시험일: ${item.examDate} (${item.examTime})</p>
                    </div>
                    <div>${scoreDisplay}</div>
                </div>`;
        }).join('');

        // 히스토리 클릭 이벤트
        container.querySelectorAll('.history-item').forEach(item => {
            item.onclick = () => {
                const date = item.dataset.date;
                const dateInput = document.getElementById(this.elements.dateInput);
                if(dateInput) {
                    dateInput.value = date;
                    this.handleDateChange(); // 해당 날짜 데이터 로드
                    window.scrollTo({ top: 0, behavior: 'smooth' }); // 상단으로 이동
                }
            };
        });
    },

    renderStatus(msg) {
        const el = document.getElementById(this.elements.statusMsg);
        if(el) el.textContent = msg;
    },

    async handleSave(btn) {
        const dateInput = document.getElementById(this.elements.dateInput);
        const timeSelect = document.getElementById(this.elements.timeSelect);
        const scoreInput = document.getElementById(this.elements.scoreInput);

        const examDate = dateInput.value;
        const examTime = timeSelect.value;
        const score = scoreInput.value;

        if (!examDate || !examTime) return showToast("날짜와 시간을 선택해주세요.", true);
        
        const day = new Date(examDate).getDay();
        if (day !== 5 && day !== 6 && day !== 0) return showToast("주간테스트는 금, 토, 일요일에만 가능합니다.", true);

        // ✨ [수정] 권한 체크 로직 완화
        // 기존: 목요일까지만 예약 변경 가능
        // 변경: 점수(score)가 입력되어 있으면(시험 결과 제출) 요일 상관없이 저장 가능
        const isScoreSubmission = score && score.trim() !== "";
        
        // 예약만 변경하려는데 기간이 지났으면 막음
        if (!isScoreSubmission && !isEditAllowedForStudent()) {
            // 이미 예약된 데이터가 있는데 단순히 시간만 바꾸려 할 때
            const hasRecord = this.state.record;
            if (hasRecord && !hasRecord.score) {
                return showToast("예약 변경 기간(목요일)이 지났습니다.", true);
            }
        }

        btn.disabled = true;
        btn.textContent = "저장 중...";

        try {
            // 1. 신규 이미지 업로드
            let newImageUrls = [];
            if (this.state.selectedFiles.length > 0) {
                const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
                const uploadPromises = this.state.selectedFiles.map(async (file) => {
                    try {
                        const compressed = await imageCompression(file, options);
                        const path = `weekly_test_images/${this.state.studentId}/${Date.now()}_${file.name}`;
                        const storageRef = ref(storage, path);
                        await uploadBytes(storageRef, compressed);
                        return await getDownloadURL(storageRef);
                    } catch (e) { console.error(e); return null; }
                });
                const results = await Promise.all(uploadPromises);
                newImageUrls = results.filter(u => u !== null);
            }

            // 2. 최종 URL 리스트
            const finalImageUrls = [...this.state.existingImages, ...newImageUrls];

            const targetDate = getWeeklyTestTargetDate(examDate);
            const targetDateStr = formatDateString(targetDate);
            const docId = `${this.state.studentId}_${targetDateStr}`;

            const payload = {
                studentId: this.state.studentId, 
                userName: this.state.studentName || "학생",
                targetDate: targetDateStr,
                weekLabel: getWeekLabel(targetDate),
                examDate: examDate,
                examTime: examTime,
                score: score ? Number(score) : null,
                status: score ? 'completed' : 'reserved',
                updatedAt: new Date(),
                uid: this.state.studentId,
                imageUrls: finalImageUrls
            };
            
            await setDoc(doc(db, 'weekly_tests', docId), payload, { merge: true });
            
            this.state.record = { ...this.state.record, ...payload };
            this.state.existingImages = finalImageUrls;
            this.state.selectedFiles = [];
            
            this.renderCurrentData(this.state.record);
            this.renderFilePreview();
            await this.fetchHistory();
            
            showToast("저장되었습니다.", false);

        } catch (e) {
            console.error(e);
            showToast("저장 실패", true);
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-icons-round">save</span> 예약 / 점수 제출`;
        }
    }
};