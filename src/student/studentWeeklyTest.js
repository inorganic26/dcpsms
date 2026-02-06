// src/student/studentWeeklyTest.js

// 👇 [추가]
import imageCompression from 'browser-image-compression';
import { db, storage } from "../shared/firebase.js"; // storage 추가
import { doc, getDoc, setDoc, collection, query, where, orderBy, getDocs } from "firebase/firestore";
// 👇 [추가]
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { showToast } from "../shared/utils.js"; // showToast 사용 권장
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
        selectedFiles: [] // 👇 [추가]
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
        
        // 👇 [추가] 파일 관련
        fileBtn: 'weekly-test-file-btn',
        fileInput: 'weekly-test-file-input',
        filePreview: 'weekly-test-file-preview'
    },

    async init(studentId, studentName) {
        this.state.studentId = studentId;
        this.state.studentName = studentName;
        
        const dateInput = document.getElementById(this.elements.dateInput);
        if(dateInput) {
            dateInput.value = formatDateString(new Date());
            this.handleDateChange(); 
        }

        this.bindEvents();
        await Promise.all([
            this.fetchCurrentWeekData(),
            this.fetchHistory()
        ]);
    },

    bindEvents() {
        const dateInput = document.getElementById(this.elements.dateInput);
        if (dateInput) dateInput.onchange = () => this.handleDateChange();

        const saveBtn = document.getElementById(this.elements.saveBtn);
        if (saveBtn) {
            const newBtn = saveBtn.cloneNode(true);
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);
            newBtn.addEventListener('click', () => this.handleSave(newBtn));
        }
        
        // 👇 [추가] 파일 선택 이벤트
        const fileBtn = document.getElementById(this.elements.fileBtn);
        const fileInput = document.getElementById(this.elements.fileInput);
        if(fileBtn && fileInput) {
            fileBtn.onclick = () => fileInput.click();
            fileInput.onchange = (e) => this.handleFileSelect(e);
        }
    },

    // 👇 [추가] 파일 미리보기
    handleFileSelect(event) {
        const files = Array.from(event.target.files);
        this.state.selectedFiles = files;
        
        const previewEl = document.getElementById(this.elements.filePreview);
        if(!previewEl) return;
        
        previewEl.innerHTML = '';
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = document.createElement('img');
                img.src = e.target.result;
                img.className = 'w-full h-16 object-cover rounded-lg border border-slate-200';
                previewEl.appendChild(img);
            };
            reader.readAsDataURL(file);
        });
        
        const btn = document.getElementById(this.elements.fileBtn);
        if(btn) btn.innerHTML = `<span class="material-icons-round text-green-500">check_circle</span> ${files.length}장 선택됨`;
    },

    handleDateChange() {
        // (기존 로직 동일)
        const dateInput = document.getElementById(this.elements.dateInput);
        const timeSelect = document.getElementById(this.elements.timeSelect);
        if (!dateInput || !timeSelect) return;
        const dateVal = dateInput.value;
        if (!dateVal) return;
        const day = new Date(dateVal).getDay();
        let options = [];
        if (day === 5) options = ['16:00', '17:00', '18:00', '19:00', '20:00'];
        else if (day === 6 || day === 0) options = ['12:00', '13:00', '14:00', '15:00'];
        
        timeSelect.innerHTML = '<option value="">시간 선택</option>';
        if (options.length === 0) {
            const opt = document.createElement('option'); opt.text = "금/토/일만 가능"; opt.disabled = true; timeSelect.appendChild(opt);
        } else {
            options.forEach(t => {
                const opt = document.createElement('option'); opt.value = t; opt.text = t; timeSelect.appendChild(opt);
            });
        }
        const targetDate = getWeeklyTestTargetDate(dateVal);
        const label = getWeekLabel(targetDate);
        const titleEl = document.getElementById(this.elements.title);
        if(titleEl) titleEl.textContent = `주간테스트 (${label})`;
    },

    async fetchCurrentWeekData() {
        if (!this.state.studentId) return;
        const targetDate = getWeeklyTestTargetDate(new Date());
        const targetDateStr = formatDateString(targetDate);
        const docId = `${this.state.studentId}_${targetDateStr}`;
        try {
            const docRef = doc(db, 'weekly_tests', docId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                this.state.record = docSnap.data();
                this.renderCurrentData(docSnap.data());
            } else {
                this.state.record = null;
                this.renderStatus("아직 예약 내역이 없습니다.");
            }
        } catch (error) {
            this.state.record = null;
            this.renderStatus("아직 예약 내역이 없습니다.");
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
        const dateInput = document.getElementById(this.elements.dateInput);
        const timeSelect = document.getElementById(this.elements.timeSelect);
        const scoreInput = document.getElementById(this.elements.scoreInput);
        
        if (dateInput) { dateInput.value = data.examDate; this.handleDateChange(); }
        if (timeSelect) timeSelect.value = data.examTime;
        if (scoreInput && data.score !== null) scoreInput.value = data.score;

        const canEdit = isEditAllowedForStudent();
        const hasScore = data.score !== null && data.score !== undefined;

        if (hasScore || !canEdit) {
            if(dateInput) dateInput.disabled = true;
            if(timeSelect) timeSelect.disabled = true;
            this.renderStatus(hasScore ? "응시 완료 ✅" : "예약됨 (변경 불가) 🕒");
        } else {
            this.renderStatus("예약 중 (목요일까지 변경 가능)");
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
            
            // 이미지 아이콘 추가
            const hasImage = item.imageUrls && item.imageUrls.length > 0;
            const icon = hasImage ? '<span class="material-icons-round text-xs text-indigo-500 ml-1">image</span>' : '';

            return `
                <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center">
                    <div>
                        <h4 class="font-bold text-slate-700 text-sm mb-1 flex items-center">${item.weekLabel || item.targetDate} ${icon}</h4>
                        <p class="text-xs text-slate-400">시험일: ${item.examDate} (${item.examTime})</p>
                    </div>
                    <div>${scoreDisplay}</div>
                </div>`;
        }).join('');
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

        if (!examDate || !examTime) return alert("날짜와 시간을 선택해주세요.");
        
        // 시간 점검
        const day = new Date(examDate).getDay();
        if (day !== 5 && day !== 6 && day !== 0) return alert("주간테스트는 금, 토, 일요일에만 가능합니다.");

        // 수정 권한 점검
        const hasRecord = this.state.record;
        const hasScore = hasRecord && hasRecord.score;
        if (hasRecord && !hasScore && !score && !isEditAllowedForStudent()) {
            return alert("예약 변경 기간(목요일)이 지났습니다.");
        }

        btn.disabled = true;
        btn.textContent = "저장 중...";

        try {
            // 👇 [추가] 이미지 압축 및 업로드
            let imageUrls = [];
            // 기존 이미지가 있다면 유지할 수도 있지만, 여기선 새로 올린 것만 추가하거나 덮어쓰는 로직 (현재는 추가)
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
                imageUrls = results.filter(u => u !== null);
            }

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
                uid: this.state.studentId 
            };
            
            // 이미지가 있을 때만 필드 업데이트 (merge이므로 기존 이미지 날아가지 않게 주의 - 여기서는 덮어쓰기 or 병합 선택)
            // 간단하게: 새 이미지가 있으면 덮어쓰기, 없으면 기존 유지하려면 로직이 더 필요하지만
            // 여기선 "새로 올린게 있으면 저장"으로 처리합니다.
            if (imageUrls.length > 0) {
                payload.imageUrls = imageUrls;
            }

            await setDoc(doc(db, 'weekly_tests', docId), payload, { merge: true });
            
            // 상태 갱신
            this.state.record = { ...this.state.record, ...payload };
            this.renderCurrentData(this.state.record);
            await this.fetchHistory();
            
            // 초기화
            this.state.selectedFiles = [];
            document.getElementById(this.elements.filePreview).innerHTML = '';
            document.getElementById(this.elements.fileBtn).innerHTML = `<span class="material-icons-round">add_a_photo</span> 사진 선택 (여러 장 가능)`;

            alert("저장되었습니다.");
        } catch (e) {
            console.error(e);
            alert("저장 실패: 오류가 발생했습니다.");
        } finally {
            btn.disabled = false;
            btn.innerHTML = `<span class="material-icons-round">save</span> 예약 / 점수 제출`;
        }
    }
};