// src/teacher/analysisDashboard.js

import { showToast } from '../shared/utils.js';
// storage, db, ref, uploadBytes, doc, onSnapshot 제거 (AI 분석 관련 Firestore/Storage 사용 안함)

// ❌ CDN으로 로드된 라이브러리는 import 할 수 없습니다. 제거합니다.
// import jsPDF from "jspdf"; 
// import html2canvas from "html2canvas"; 

export const analysisDashboard = {
    studentData: null,
    pdfAnalysisResult: null,
    currentStudentName: null,
    app: null, 
    elements: {}, 

    init(app) {
        this.app = app; 

        // elements 캐싱 (기존 로직 유지)
        this.elements = {
            studentDataUploadInput: app.elements.studentDataUploadInput,
            testStudentListContainer: app.elements.testStudentListContainer,

            analysisModal: app.elements.analysisModal,
            analysisHeader: app.elements.analysisHeader,
            analysisMain: app.elements.analysisMain,
            analysisCloseBtn: app.elements.analysisCloseBtn,
            analysisSaveBtn: app.elements.analysisSaveBtn,
            pdfAnalysisJsonInput: app.elements.pdfAnalysisJsonInput,
            loadAnalysisJsonBtn: app.elements.loadAnalysisJsonBtn,
            pdfAnalysisStatus: app.elements.pdfAnalysisStatus,
        };

        this.addEventListeners();
    },

    addEventListeners() {
        document.addEventListener('class-changed', () => this.renderStudentLists());
        this.elements.studentDataUploadInput?.addEventListener('change', (e) => this.handleStudentDataUpload(e));

        this.elements.analysisCloseBtn?.addEventListener('click', () => {
            if (this.elements.analysisModal) this.elements.analysisModal.style.display = 'none';
        });

        this.elements.analysisSaveBtn?.addEventListener('click', () => {
            if (this.currentStudentName) this.saveReportAsPDF(this.currentStudentName);
        });

        this.elements.loadAnalysisJsonBtn?.addEventListener('click', () => this.handleAnalysisJsonLoad());
    },

     // 임시: JSON 분석 결과 로드 핸들러 추가
     handleAnalysisJsonLoad() {
        const jsonInput = this.elements.pdfAnalysisJsonInput;
        const statusEl = this.elements.pdfAnalysisStatus;
        if (!jsonInput || !statusEl) return;

        const jsonText = jsonInput.value.trim();
        if (!jsonText) {
            showToast("분석 결과 JSON을 입력해주세요.");
            this.pdfAnalysisResult = null;
            statusEl.innerHTML = '<span class="text-red-600">❌ 분석 결과 없음</span>';
            this.renderStudentListForTest();
            return;
        }

        try {
            const parsedJson = JSON.parse(jsonText);
            if (typeof parsedJson !== 'object' || parsedJson === null || Object.keys(parsedJson).length === 0) {
                throw new Error("유효한 JSON 객체 형식이 아닙니다.");
            }
            this.pdfAnalysisResult = parsedJson;
            const qCount = Object.keys(this.pdfAnalysisResult).length;
            statusEl.innerHTML = `<span class="text-green-600">✅ 분석 완료 (${qCount}문항)</span>`;
            showToast("분석 결과를 성공적으로 불러왔습니다.", false);
            this.renderStudentListForTest();
        } catch (error) {
            this.pdfAnalysisResult = null;
            statusEl.innerHTML = `<span class="text-red-600">❌ JSON 파싱 오류: ${error.message}</span>`;
            showToast(`JSON 형식이 올바르지 않습니다: ${error.message}`);
            this.renderStudentListForTest();
        }
    },


    handleStudentDataUpload(event) {
        // window.XLSX는 CDN 로드에 의존합니다.
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
                this.studentData = null; 
                this.renderStudentListForTest(); 
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
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

        if (!this.elements.analysisHeader || !this.elements.analysisMain || !this.elements.analysisModal) {
             showToast("리포트 UI 요소가 준비되지 않았습니다.", true);
             return;
        }

        if (!this.pdfAnalysisResult || typeof this.pdfAnalysisResult !== 'object' || Object.keys(this.pdfAnalysisResult).length === 0) {
             showToast("시험 분석 결과가 필요합니다. JSON을 입력하고 로드해주세요.");
             return;
         }
         if (!this.studentData || !Array.isArray(this.studentData) || this.studentData.length === 0) {
             showToast("학생 성적 파일이 필요합니다. 엑셀 파일을 업로드해주세요.");
             return;
         }


        const nameKey = Object.keys(this.studentData[0]).find(k => k.toLowerCase().includes('학생') || k.toLowerCase().includes('이름') || k.toLowerCase().includes('name'));
         if (!nameKey) {
            showToast("학생 이름 컬럼을 찾을 수 없습니다 ('학생' 또는 '이름' 포함).");
            return;
         }

        const studentResult = this.studentData.find(r => r[nameKey] === studentName);
        if (!studentResult) {
            showToast(`'${studentName}' 학생 정보를 성적 파일에서 찾을 수 없습니다.`);
            return;
        }

        const totalScore = this._calculateScore(studentResult, this.pdfAnalysisResult);
        const wrongAnswers = [];

        Object.keys(this.pdfAnalysisResult).forEach(qNum => {
             // 성적 데이터 키 확인 ('q1', '1', 'Q1' 등 다양한 형식 처리)
             const resultKey = Object.keys(studentResult).find(k => k.toLowerCase() === `q${qNum}` || k === qNum);
             const res = resultKey ? studentResult[resultKey] : undefined;

            if (res !== 'O' && res !== 'o') { // 대소문자 구분 없이 'O'가 아니면 오답 처리
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
             wrongAnswers.sort((a, b) => parseInt(a.qNum) - parseInt(b.qNum)); // 문항 번호 순 정렬 추가
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
                // JSON 데이터 키 이름이 다를 수 있으므로 유연하게 처리
                const unit = item.metadata['단원명'] || item.metadata['unit'] || '-';
                const difficulty = item.metadata['난이도'] || item.metadata['difficulty'] || '-';
                const solution = item.metadata['오답대응방안'] || item.metadata['solution'] || '-';
                html += `
                  <tr class="bg-red-50 border-b hover:bg-slate-100">
                    <td class="py-3 px-6 font-medium text-gray-900">${item.qNum}번</td>
                    <td class="py-3 px-6">${unit}</td>
                    <td class="py-3 px-6">${difficulty}</td>
                    <td class="py-3 px-6">${solution}</td>
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
        // 🚨 [수정] 전역 변수에서 라이브러리를 가져옵니다.
        const jsPDF = window.jsPDF;
        const html2canvas = window.html2canvas;

        if (typeof jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
            showToast("PDF 저장 라이브러리(jsPDF/html2canvas)를 찾을 수 없습니다.", true);
            return;
        }

        try {
            const modalEl = this.elements.analysisModal;
            if (!modalEl || modalEl.style.display === 'none') return showToast("리포트가 표시되어야 PDF로 저장할 수 있습니다.");

            showToast("PDF 생성 중...", false);

            // 리포트 내용이 테이블인지, 아니면 "모든 문제 정답" 메시지인지 확인
            const reportContentElement = this.elements.analysisMain.querySelector('.overflow-x-auto') || this.elements.analysisMain.querySelector('div');

            if (!reportContentElement) {
                showToast("PDF로 변환할 리포트 내용을 찾을 수 없습니다.");
                return;
            }

            // html2canvas 옵션 조정 (배경색 흰색, 스케일 조정)
            const canvas = await html2canvas(reportContentElement, {
                scale: 2, // 해상도 향상
                useCORS: true,
                backgroundColor: "#ffffff" // 배경색 명시
            });

            // jsPDF 인스턴스 사용
            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

            const imgWidthMM = 190; // A4 용지 너비에 맞춤 (여백 고려)
            const pageHeightMM = 297;
            const imgHeightMM = (canvas.height * imgWidthMM) / canvas.width;
            let heightLeft = imgHeightMM;
            let position = 10; // 상단 여백

            // 첫 페이지 추가
            pdf.addImage(imgData, "PNG", 10, position, imgWidthMM, imgHeightMM); // 좌우 여백 추가
            heightLeft -= (pageHeightMM - 20); // 상하 여백 고려

            // 내용이 길 경우 여러 페이지에 걸쳐 추가
            while (heightLeft > 0) {
                position = -heightLeft - 10; // 다음 페이지 위치 계산
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 10, position, imgWidthMM, imgHeightMM);
                heightLeft -= (pageHeightMM - 20);
            }

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
            listEl.innerHTML = '<p class="text-slate-400 col-span-full text-center py-4">선택된 반에 학생이 없습니다.</p>';
            return;
        }

        // 분석 결과와 학생 데이터가 모두 준비되었는지 확인
         const isAnalysisReady = !!this.pdfAnalysisResult && typeof this.pdfAnalysisResult === 'object' && Object.keys(this.pdfAnalysisResult).length > 0;
         const isStudentDataReady = !!this.studentData && Array.isArray(this.studentData) && this.studentData.length > 0;
         const ready = isAnalysisReady && isStudentDataReady;


        // Map을 이름순으로 정렬
        const sortedStudents = Array.from(this.app.state.studentsInClass.values()).sort((a, b) => a.localeCompare(b));

        sortedStudents.forEach((name) => {
            const card = document.createElement('div');
            card.className = `p-3 border rounded-lg text-center shadow-sm transition
                ${ready ? 'bg-white hover:bg-blue-50 cursor-pointer' : 'bg-slate-100 opacity-60 cursor-not-allowed'}`; // 준비 안되면 비활성 스타일

            card.innerHTML = `
                <h3 class="font-semibold text-slate-800 text-sm">${name}</h3>
                <p class="text-xs ${ready ? 'text-blue-500' : 'text-slate-400'}">
                    ${ready ? '리포트 보기' : (isAnalysisReady ? '성적 파일 필요' : (isStudentDataReady ? '분석 결과 필요' : '분석/성적 필요'))}
                </p>`;

            if (ready) card.addEventListener('click', () => this.showTestAnalysisReport(name));
            listEl.appendChild(card);
        });
    },
};