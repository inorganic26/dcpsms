// src/teacher/analysisDashboard.js

import { showToast } from '../shared/utils.js';
import { storage, db } from '../shared/firebase.js';
import { ref, uploadBytes } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";

export const analysisDashboard = {
    studentData: null,
    pdfAnalysisResult: null,
    currentTestId: null,
    analysisUnsubscribe: null,
    
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
            analysisSaveBtn: document.getElementById('analysis-report-save-btn'), // 저장 버튼 추가
        };

        this.addEventListeners();
    },

    addEventListeners() {
        document.addEventListener('class-changed', () => this.renderStudentLists());
        this.elements.testPdfUploadInput?.addEventListener('change', (e) => this.handlePdfUpload(e));
        this.elements.studentDataUploadInput?.addEventListener('change', (e) => this.handleStudentDataUpload(e));
        
        this.elements.analysisCloseBtn?.addEventListener('click', () => {
            if (this.elements.analysisModal) {
                this.elements.analysisModal.style.display = 'none';
            }
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
        
        this.elements.pdfAnalysisStatus.innerHTML = `<div class="flex items-center gap-2 text-blue-600"><div class="loader-small"></div><span>PDF 업로드 중...</span></div>`;
        
        try {
            await uploadBytes(storageRef, file);
            this.elements.pdfAnalysisStatus.innerHTML = `<div class="flex items-center gap-2 text-blue-600"><div class="loader-small"></div><span>✅ PDF 업로드 완료! AI 분석 요청 중입니다.</span></div>`;
            showToast("PDF 업로드 성공! AI 분석이 시작되었습니다.", false);
            this.listenForPdfAnalysisResult(testId);
        } catch (error) {
            this.elements.pdfAnalysisStatus.innerHTML = "❌ PDF 업로드에 실패했습니다.";
            showToast("PDF 업로드 실패: " + error.message);
        }
    },

    listenForPdfAnalysisResult(testId) {
        const resultDocRef = doc(db, "testAnalysisResults", testId);
        
        if (this.analysisUnsubscribe) this.analysisUnsubscribe();

        if (!document.getElementById('loader-style')) {
             const style = document.createElement('style');
             style.id = 'loader-style';
             style.textContent = `.loader-small { border: 2px solid rgba(0, 0, 0, 0.1); border-top: 2px solid #3b82f6; border-radius: 50%; width: 16px; height: 16px; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`;
             document.head.appendChild(style);
        }

        this.analysisUnsubscribe = onSnapshot(resultDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const result = docSnap.data();
                if (result.status === 'processing') {
                    this.elements.pdfAnalysisStatus.innerHTML = `<div class="flex items-center gap-2 text-orange-600"><div class="loader-small" style="border-top-color: #f97316;"></div><span>AI가 시험지를 분석 중입니다... (최대 5분 소요)</span></div>`;
                } else if (result.status === 'completed') {
                    this.pdfAnalysisResult = result.analysis;
                    const qCount = Object.keys(result.analysis).length;
                    this.elements.pdfAnalysisStatus.innerHTML = `<span class="text-green-600">✅ AI 분석 완료! ${qCount}개 문항 분석됨.</span>`;
                    showToast("시험지 AI 분석이 완료되었습니다!", false);
                    this.renderStudentListForTest();
                    this.analysisUnsubscribe();
                } else if (result.status === 'error') {
                    const errorMessage = result.error || '알 수 없는 오류';
                    this.elements.pdfAnalysisStatus.innerHTML = `<span class="text-red-600">❌ AI 분석 실패: ${errorMessage}</span>`;
                    this.analysisUnsubscribe();
                }
            } else if (testId === this.currentTestId) {
                 this.elements.pdfAnalysisStatus.innerHTML = `<div class="flex items-center gap-2 text-blue-600"><div class="loader-small"></div><span>AI 분석 요청 중...</span></div>`;
            } else {
                 this.elements.pdfAnalysisStatus.innerHTML = `<p class="text-xs text-slate-500 mt-1">AI가 분석할 시험지 PDF를 업로드하세요.</p>`;
            }
        });
    },

    handleStudentDataUpload(event) {
        const XLSX = window.XLSX;
        if (typeof XLSX === 'undefined') {
            showToast("XLSX 처리 라이브러리를 찾을 수 없습니다.");
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
                showToast(`성공적으로 ${this.studentData.length}명의 학생 성적을 불러왔습니다.`, false);
                this.renderStudentListForTest();
            } catch (error) {
                console.error("XLSX 파일 처리 오류:", error);
                showToast("학생 성적 파일(XLSX) 처리 중 오류가 발생했습니다.");
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
            const resultRaw = studentResult['q' + qNum] || studentResult[qNum];
            if (resultRaw === 'O' || resultRaw === 'o') {
                score += scorePerQuestion;
            }
        });
        return Math.round(score);
    },

    showTestAnalysisReport(studentName) {
        if (!this.pdfAnalysisResult || !this.studentData) {
            showToast("시험지 AI 분석 결과와 학생 성적 파일이 모두 준비되어야 합니다.");
            return;
        }
        
        if (typeof this.pdfAnalysisResult !== 'object' || Array.isArray(this.pdfAnalysisResult) || Object.keys(this.pdfAnalysisResult).length === 0) {
            showToast("AI 분석 결과 형식이 유효하지 않아 리포트를 표시할 수 없습니다.");
            return;
        }

        const nameKey = Object.keys(this.studentData[0]).find(key => key.includes('학생명') || key.includes('이름') || key.includes('학생'));
        const studentResult = this.studentData.find(row => row[nameKey] === studentName);

        if (!studentResult) {
            showToast(`성적 파일에서 '${studentName}' 학생 정보를 찾을 수 없습니다.`);
            return;
        }

        const totalScore = this._calculateScore(studentResult, this.pdfAnalysisResult);
        const wrongAnswers = [];

        Object.keys(this.pdfAnalysisResult).sort((a, b) => parseInt(a) - parseInt(b)).forEach(qNum => {
            const resultRaw = studentResult['q' + qNum] || studentResult[qNum];
            const isCorrect = (resultRaw === 'O' || resultRaw === 'o');

            if (!isCorrect) {
                wrongAnswers.push({
                    qNum,
                    metadata: this.pdfAnalysisResult[qNum]
                });
            }
        });

        this.elements.analysisHeader.innerHTML = `<h2 class="text-2xl font-bold text-slate-800">${studentName} 학생 오답 분석표 (총점: ${totalScore}점)</h2>`;

        let tableHtml;
        if (wrongAnswers.length === 0) {
            tableHtml = `<div class="text-center py-10"><p class="text-lg text-green-600 font-semibold">🎉 모든 문제를 맞혔습니다! 🎉</p></div>`;
        } else {
            tableHtml = `<div class="overflow-x-auto relative shadow-md sm:rounded-lg">
                           <table class="w-full text-sm text-left text-gray-500">
                             <thead class="text-xs text-gray-700 uppercase bg-gray-50">
                               <tr>
                                 <th scope="col" class="px-6 py-3">문항번호</th>
                                 <th scope="col" class="px-6 py-3">단원명(핵심유형)</th>
                                 <th scope="col" class="px-6 py-3">난이도</th>
                                 <th scope="col" class="px-6 py-3">오답 대응 방안</th>
                               </tr>
                             </thead>
                             <tbody>`;
            
            wrongAnswers.forEach(item => {
                tableHtml += `<tr class="bg-red-50 border-b hover:bg-slate-100">
                                <th scope="row" class="py-4 px-6 font-medium text-gray-900">${item.qNum}번</th>
                                <td class="py-4 px-6">${item.metadata['단원명'] || 'N/A'}</td>
                                <td class="py-4 px-6">${item.metadata['난이도'] || 'N/A'}</td>
                                <td class="py-4 px-6 text-sm">${item.metadata['오답대응방안'] || 'N/A'}</td>
                              </tr>`;
            });

            tableHtml += `</tbody></table></div>`;
        }

        this.elements.analysisMain.innerHTML = tableHtml;
        this.elements.analysisModal.style.display = 'flex';
        // 시험지 분석 결과는 저장 버튼을 숨깁니다.
        if (this.elements.analysisSaveBtn) this.elements.analysisSaveBtn.style.display = 'none';
    },

    // --- ▼▼▼ [수정] 저장 콜백 함수를 인자로 받도록 수정 ▼▼▼ ---
    showHomeworkGradingReport(studentName, analysisData, saveCallback) {
        if (!analysisData || !analysisData.results) {
            showToast(`'${studentName}' 학생의 채점 결과가 없습니다.`);
            return;
        }

        const { results, analyzedAt } = analysisData;
        const date = (analyzedAt && analyzedAt.toDate) ? analyzedAt.toDate().toLocaleString() : '날짜 정보 없음';
        
        this.elements.analysisHeader.innerHTML = `<h2 class="text-2xl font-bold text-slate-800">${studentName} 학생 숙제 채점 결과</h2><p class="text-sm text-slate-500 mt-1">채점 일시: ${date}</p>`;

        const sortedResults = Object.entries(results).sort((a, b) => parseInt(a[0]) - parseInt(b[0]));
        
        let resultHtml = '';
        
        if (sortedResults.length === 0) {
            resultHtml = `
                <div class="text-center py-10 col-span-full">
                    <p class="text-slate-600 font-semibold">채점된 문제가 없습니다.</p>
                    <p class="text-sm text-slate-400 mt-2">AI가 이미지에서 문제 번호나 채점 표시(O, X)를 인식하지 못했을 수 있습니다.</p>
                </div>
            `;
        } else {
            resultHtml = '<div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">';
            sortedResults.forEach(([qNum, result]) => {
                let bgColor, textColor;
                switch(result) {
                    case 'O': bgColor = 'bg-green-100'; textColor = 'text-green-800'; break;
                    case 'X': bgColor = 'bg-red-100'; textColor = 'text-red-800'; break;
                    default: bgColor = 'bg-slate-100'; textColor = 'text-slate-600';
                }
                resultHtml += `<div class="p-3 rounded-lg text-center ${bgColor} ${textColor}">
                                 <p class="font-bold text-lg">${qNum}번</p>
                                 <p class="text-sm font-semibold">${result}</p>
                               </div>`;
            });
            resultHtml += '</div>';
        }

        this.elements.analysisMain.innerHTML = resultHtml;
        this.elements.analysisModal.style.display = 'flex';
        
        // 저장 버튼을 표시하고, 클릭 시 콜백 함수를 실행합니다.
        if (this.elements.analysisSaveBtn) {
            this.elements.analysisSaveBtn.style.display = 'inline-block';
            // 기존 이벤트 리스너를 제거하고 새로 할당하여 중복 실행 방지
            this.elements.analysisSaveBtn.replaceWith(this.elements.analysisSaveBtn.cloneNode(true));
            this.elements.analysisSaveBtn = document.getElementById('analysis-report-save-btn'); // 교체된 버튼 다시 참조
            this.elements.analysisSaveBtn.addEventListener('click', saveCallback);
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

        const isDataLoaded = !!this.studentData;
        const isAnalysisCompleted = !!this.pdfAnalysisResult;
        const isReady = isDataLoaded && isAnalysisCompleted;
        
        this.app.state.studentsInClass.forEach((name, id) => {
            const studentCard = document.createElement('div');
            studentCard.className = `p-3 border rounded-lg cursor-pointer bg-white transition shadow-sm text-center ${isReady ? 'hover:bg-blue-50 hover:border-blue-300' : 'opacity-50 cursor-not-allowed'}`;
            
            let statusText = '';
            if (!isDataLoaded) statusText = '성적 파일 필요';
            else if (!isAnalysisCompleted) statusText = 'AI 분석 필요';
            else statusText = '리포트 보기';
            
            studentCard.innerHTML = `
                <h3 class="font-semibold text-slate-800 text-sm">${name}</h3>
                <p class="text-xs ${isReady ? 'text-blue-500' : 'text-slate-400'}">${statusText}</p>
            `;
            if (isReady) {
                studentCard.addEventListener('click', () => this.showTestAnalysisReport(name));
            } else {
                 studentCard.title = "AI 분석 결과와 학생 성적 파일이 모두 준비되어야 합니다.";
            }
            listEl.appendChild(studentCard);
        });
    },
};