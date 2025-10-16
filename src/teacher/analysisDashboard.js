// src/teacher/analysisDashboard.js

import { showToast } from '../shared/utils.js';
import { storage, db } from '../shared/firebase.js';
import { ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";

// ✅ jsPDF와 html2canvas 불러오기 (CDN 환경)
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export const analysisDashboard = {
    studentData: null,
    pdfAnalysisResult: null,
    currentTestId: null,
    analysisUnsubscribe: null,
    currentStudentName: null,

    init(app) {
        this.app = app;
        this.elements = {
            testPdfUploadInput: document.getElementById('test-pdf-upload-input'),
            studentDataUploadInput: document.getElementById('student-data-upload-input'),
            pdfAnalysisStatus: document.getElementById('pdf-analysis-status'),
            testStudentListContainer: document.getElementById('test-analysis-student-list'),

            analysisModal: document.getElementById('analysis-report-modal'),
            analysisHeader: document.getElementById('analysis-report-header'),
            analysisMain: document.getElementById('analysis-report-main'),
            analysisCloseBtn: document.getElementById('analysis-report-close-btn'),
            analysisSaveBtn: document.getElementById('analysis-report-save-btn'),
        };

        this.addEventListeners();
    },

    addEventListeners() {
        document.addEventListener('class-changed', () => this.renderStudentLists());
        this.elements.testPdfUploadInput?.addEventListener('change', (e) => this.handlePdfUpload(e));
        this.elements.studentDataUploadInput?.addEventListener('change', (e) => this.handleStudentDataUpload(e));

        this.elements.analysisCloseBtn?.addEventListener('click', () => {
            if (this.elements.analysisModal) this.elements.analysisModal.style.display = 'none';
        });

        // ✅ PDF 저장 버튼 이벤트 추가
        this.elements.analysisSaveBtn?.addEventListener('click', () => {
            if (this.currentStudentName) this.saveReportAsPDF(this.currentStudentName);
        });
    },

    async handlePdfUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.app.state.selectedClassId) {
            showToast("반을 먼저 선택한 후 PDF 파일을 업로드해주세요.");
            return;
        }

        if (this.analysisUnsubscribe) this.analysisUnsubscribe();

        const testId = `test_${this.app.state.selectedClassId}_${Date.now()}`;
        this.currentTestId = testId;
        this.pdfAnalysisResult = null;

        const storageRef = ref(storage, `test-analysis/${testId}/${file.name}`);

        this.elements.pdfAnalysisStatus.innerHTML = `
            <div class="flex items-center gap-2 text-blue-600">
                <div class="loader-small"></div><span>PDF 업로드 중...</span>
            </div>`;

        try {
            await uploadBytes(storageRef, file);
            this.elements.pdfAnalysisStatus.innerHTML = `
                <div class="flex items-center gap-2 text-blue-600">
                    <div class="loader-small"></div><span>✅ 업로드 완료! AI 분석 요청 중...</span>
                </div>`;
            showToast("PDF 업로드 성공! AI 분석이 시작되었습니다.", false);
            this.listenForPdfAnalysisResult(testId);
        } catch (error) {
            console.error("PDF 업로드 오류:", error);
            this.elements.pdfAnalysisStatus.innerHTML = "❌ PDF 업로드 실패";
            showToast("PDF 업로드 실패: " + error.message);
        }
    },

    listenForPdfAnalysisResult(testId) {
        const resultDocRef = doc(db, "testAnalysisResults", testId);
        if (this.analysisUnsubscribe) this.analysisUnsubscribe();

        const TIMEOUT_DURATION_MS = 180000;
        const timeoutId = setTimeout(() => {
            this.elements.pdfAnalysisStatus.innerHTML = `
                <span class="text-red-600">❌ 분석 시간 초과(3분). 다시 시도해 주세요.</span>`;
            if (this.analysisUnsubscribe) {
                this.analysisUnsubscribe();
                this.analysisUnsubscribe = null;
            }
        }, TIMEOUT_DURATION_MS);

        if (!document.getElementById('loader-style')) {
            const style = document.createElement('style');
            style.id = 'loader-style';
            style.textContent = `
                .loader-small {
                    border: 2px solid rgba(0, 0, 0, 0.1);
                    border-top: 2px solid #3b82f6;
                    border-radius: 50%;
                    width: 16px;
                    height: 16px;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 0% { transform: rotate(0deg);} 100% {transform: rotate(360deg);} }`;
            document.head.appendChild(style);
        }

        this.analysisUnsubscribe = onSnapshot(resultDocRef, (docSnap) => {
            if (!docSnap.exists()) return;
            const result = docSnap.data();
            const status = result.status || "unknown";

            if (status === 'processing') {
                this.elements.pdfAnalysisStatus.innerHTML = `
                    <div class="flex items-center gap-2 text-orange-600">
                        <div class="loader-small" style="border-top-color: #f97316;"></div>
                        <span>AI 분석 중... (최대 3분)</span>
                    </div>`;
            } else if (status === 'completed') {
                clearTimeout(timeoutId);
                if (result.analysis && typeof result.analysis === 'object') {
                    this.pdfAnalysisResult = result.analysis;
                    const qCount = Object.keys(result.analysis).length;
                    this.elements.pdfAnalysisStatus.innerHTML = `
                        <span class="text-green-600">✅ 분석 완료 (${qCount}문항)</span>`;
                    showToast("AI 시험지 분석 완료!", false);
                    this.renderStudentListForTest();
                } else {
                    this.elements.pdfAnalysisStatus.innerHTML = `
                        <span class="text-red-600">⚠️ 분석 결과 형식 오류</span>`;
                }
                if (this.analysisUnsubscribe) this.analysisUnsubscribe();
            } else if (status === 'error') {
                clearTimeout(timeoutId);
                const msg = result.error || "알 수 없는 오류";
                this.elements.pdfAnalysisStatus.innerHTML = `<span class="text-red-600">❌ 분석 실패: ${msg}</span>`;
                if (this.analysisUnsubscribe) this.analysisUnsubscribe();
            }
        });
    },

    handleStudentDataUpload(event) {
        const XLSX = window.XLSX;
        if (typeof XLSX === 'undefined') {
            showToast("XLSX 라이브러리를 찾을 수 없습니다.");
            return;
        }

        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                this.studentData = XLSX.utils.sheet_to_json(worksheet);
                showToast(`✅ ${this.studentData.length}명 학생 성적 불러옴`, false);
                this.renderStudentListForTest();
            } catch (error) {
                console.error("XLSX 오류:", error);
                showToast("학생 성적 파일 처리 오류 발생.");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    _calculateScore(studentResult, problemMetadata) {
        let score = 0;
        const questionCount = Object.keys(problemMetadata).length;
        if (questionCount === 0) return 0;
        const scorePerQuestion = 100 / questionCount;

        Object.keys(problemMetadata).forEach(qNum => {
            const res = studentResult['q' + qNum] || studentResult[qNum];
            if (res === 'O' || res === 'o') score += scorePerQuestion;
        });
        return Math.round(score);
    },

    /** 🧾 리포트 표시 */
    showTestAnalysisReport(studentName) {
        this.currentStudentName = studentName;

        if (!this.pdfAnalysisResult || !this.studentData) {
            showToast("AI 분석 결과와 학생 성적 파일이 모두 필요합니다.");
            return;
        }

        const nameKey = Object.keys(this.studentData[0]).find(k => k.includes('학생') || k.includes('이름'));
        const studentResult = this.studentData.find(r => r[nameKey] === studentName);
        if (!studentResult) {
            showToast(`'${studentName}' 학생 정보를 찾을 수 없습니다.`);
            return;
        }

        const totalScore = this._calculateScore(studentResult, this.pdfAnalysisResult);
        const wrongAnswers = [];

        Object.keys(this.pdfAnalysisResult).forEach(qNum => {
            const res = studentResult['q' + qNum] || studentResult[qNum];
            if (res !== 'O' && res !== 'o') {
                wrongAnswers.push({ qNum, metadata: this.pdfAnalysisResult[qNum] });
            }
        });

        this.elements.analysisHeader.innerHTML = `
            <h2 class="text-2xl font-bold text-slate-800">
                ${studentName} 오답 분석표 (총점: ${totalScore}점)
            </h2>`;

        let html;
        if (wrongAnswers.length === 0) {
            html = `<div class="text-center py-10 text-green-600 font-semibold">🎉 모든 문제 정답! 🎉</div>`;
        } else {
            html = `<div class="overflow-x-auto relative shadow-md sm:rounded-lg">
              <table class="w-full text-sm text-left text-gray-500">
                <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                  <tr>
                    <th class="px-6 py-3">문항번호</th>
                    <th class="px-6 py-3">단원명</th>
                    <th class="px-6 py-3">난이도</th>
                    <th class="px-6 py-3">오답 대응 방안</th>
                  </tr>
                </thead><tbody>`;
            wrongAnswers.forEach(item => {
                html += `
                  <tr class="bg-red-50 border-b hover:bg-slate-100">
                    <td class="py-3 px-6 font-medium text-gray-900">${item.qNum}번</td>
                    <td class="py-3 px-6">${item.metadata['단원명'] || '-'}</td>
                    <td class="py-3 px-6">${item.metadata['난이도'] || '-'}</td>
                    <td class="py-3 px-6">${item.metadata['오답대응방안'] || '-'}</td>
                  </tr>`;
            });
            html += `</tbody></table></div>`;
        }

        this.elements.analysisMain.innerHTML = html;
        this.elements.analysisModal.style.display = 'flex';
        if (this.elements.analysisSaveBtn) this.elements.analysisSaveBtn.style.display = 'inline-flex';
    },

    /** 💾 PDF 저장 기능 */
    async saveReportAsPDF(studentName) {
        try {
            const modalEl = this.elements.analysisModal;
            if (!modalEl) return showToast("리포트가 표시되어야 PDF로 저장할 수 있습니다.");

            showToast("PDF 생성 중...", false);

            const canvas = await html2canvas(modalEl.querySelector('.overflow-x-auto') || modalEl, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff"
            });

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

            const imgWidth = 210;
            const pageHeight = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            pdf.save(`오답분석_${studentName}_${dateStr}.pdf`);

            showToast("PDF 저장 완료 ✅", false);
        } catch (err) {
            console.error("PDF 저장 오류:", err);
            showToast("PDF 저장 중 오류가 발생했습니다.");
        }
    },

    renderStudentLists() {
        this.renderStudentListForTest();
    },

    renderStudentListForTest() {
        const listEl = this.elements.testStudentListContainer;
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!this.app.state.selectedClassId || this.app.state.studentsInClass.size === 0) {
            listEl.innerHTML = '<p class="text-slate-400 col-span-full text-center py-4">학생 목록이 없습니다.</p>';
            return;
        }

        const ready = !!this.studentData && !!this.pdfAnalysisResult;

        this.app.state.studentsInClass.forEach((name) => {
            const card = document.createElement('div');
            card.className = `p-3 border rounded-lg text-center shadow-sm transition 
                ${ready ? 'bg-white hover:bg-blue-50 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`;

            card.innerHTML = `
                <h3 class="font-semibold text-slate-800 text-sm">${name}</h3>
                <p class="text-xs ${ready ? 'text-blue-500' : 'text-slate-400'}">
                    ${ready ? '리포트 보기' : 'AI 분석 / 성적 파일 필요'}
                </p>`;

            if (ready) card.addEventListener('click', () => this.showTestAnalysisReport(name));
            listEl.appendChild(card);
        });
    },
};
