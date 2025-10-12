// src/teacher/analysisDashboard.js

import { showToast } from '../shared/utils.js';
import { storage, db } from '../shared/firebase.js'; // Firebase import
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";

export const analysisDashboard = {
    studentData: null,
    pdfAnalysisResult: null,
    currentTestId: null, // 🛠️ 진행 상황 추적을 위한 상태 추가
    analysisUnsubscribe: null, // 🛠️ 실시간 리스너 관리를 위한 상태 추가
    
    init(app) {
        this.app = app;
        this.elements = {
            // 시험지 분석 UI (유지)
            testPdfUploadInput: document.getElementById('test-pdf-upload-input'),
            studentDataUploadInput: document.getElementById('student-data-upload-input'),
            pdfAnalysisStatus: document.getElementById('pdf-analysis-status'),
            testStudentListContainer: document.getElementById('test-analysis-student-list'),

            // 숙제 채점 UI (유지)
            homeworkImageUploadInput: document.getElementById('homework-image-upload-input'),
            homeworkStudentListContainer: document.getElementById('homework-analysis-student-list'),
            
            // 공통 모달 UI (유지)
            analysisModal: document.getElementById('analysis-report-modal'),
            analysisContent: document.getElementById('analysis-report-content'),
        };

        this.addEventListeners();
    },

    addEventListeners() {
        document.addEventListener('class-changed', () => this.renderStudentLists());
        
        this.elements.testPdfUploadInput?.addEventListener('change', (e) => this.handlePdfUpload(e));
        this.elements.studentDataUploadInput?.addEventListener('change', (e) => this.handleStudentDataUpload(e));
        
        this.elements.homeworkImageUploadInput?.addEventListener('change', (e) => this.handleHomeworkImageUpload(e));
    },

    // ========== 1. 시험지 분석 기능 ==========

    async handlePdfUpload(event) {
        const file = event.target.files[0];
        if (!file || !this.app.state.selectedClassId) {
            showToast("반을 먼저 선택한 후 PDF 파일을 업로드해주세요.");
            return;
        }
        
        // 🛠️ 기존 리스너 해제
        if (this.analysisUnsubscribe) this.analysisUnsubscribe();

        const testId = `test_${this.app.state.selectedClassId}_${Date.now()}`;
        this.currentTestId = testId; // 현재 처리 중인 testId 저장
        this.pdfAnalysisResult = null; // 결과 초기화

        const storageRef = ref(storage, `test-analysis/${testId}/${file.name}`);
        
        // 🛠️ 개선: PDF 업로드 시작 상태 표시
        this.elements.pdfAnalysisStatus.innerHTML = `
            <div class="flex items-center gap-2 text-blue-600">
                <div class="loader-small"></div>
                <span>PDF 업로드 중...</span>
            </div>
        `;
        
        try {
            await uploadBytes(storageRef, file);
            
            // 🛠️ 개선: 업로드 완료 및 분석 요청 상태 표시
            this.elements.pdfAnalysisStatus.innerHTML = `
                <div class="flex items-center gap-2 text-blue-600">
                    <div class="loader-small"></div>
                    <span>✅ PDF 업로드 완료! AI 분석 요청 중입니다.</span>
                </div>
            `;
            showToast("PDF 업로드 성공! AI 분석이 시작되었습니다.", false);

            this.listenForPdfAnalysisResult(testId);
        } catch (error) {
            this.elements.pdfAnalysisStatus.innerHTML = "❌ PDF 업로드에 실패했습니다.";
            showToast("PDF 업로드 실패: " + error.message);
        }
    },

    listenForPdfAnalysisResult(testId) {
        const resultDocRef = doc(db, "testAnalysisResults", testId);
        
        // 🛠️ 개선: 기존 리스너 해제 및 새 리스너 설정
        if (this.analysisUnsubscribe) this.analysisUnsubscribe();

        // 🛠️ loader-small을 위한 CSS를 임시로 주입 (원래 shared/style.css에 추가되어야 함)
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
                 @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                 }
             `;
             document.head.appendChild(style);
        }

        this.analysisUnsubscribe = onSnapshot(resultDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const result = docSnap.data();
                
                if (result.status === 'processing') {
                    // 🛠️ 개선: '분석 중' 상태에 로딩 스피너와 메시지 표시
                    this.elements.pdfAnalysisStatus.innerHTML = `
                        <div class="flex items-center gap-2 text-orange-600">
                            <div class="loader-small" style="border-top-color: #f97316;"></div>
                            <span>AI가 시험지를 분석 중입니다... (최대 5분 소요)</span>
                        </div>
                    `;
                } else if (result.status === 'completed') {
                    this.pdfAnalysisResult = result.analysis;
                    const qCount = Object.keys(result.analysis).length;
                    
                    // 🛠️ 개선: 완료 시 전체 문항 수 표시
                    this.elements.pdfAnalysisStatus.innerHTML = `
                        <span class="text-green-600">✅ AI 분석 완료! ${qCount}개 문항 분석됨.</span>
                    `;
                    showToast("시험지 AI 분석이 완료되었습니다!", false);
                    this.renderStudentListForTest();
                    this.analysisUnsubscribe(); // 완료 후 리스너 해제
                } else if (result.status === 'error') {
                    const errorMessage = result.error || '알 수 없는 오류';
                    this.elements.pdfAnalysisStatus.innerHTML = `
                        <span class="text-red-600">❌ AI 분석 실패: ${errorMessage}</span>
                    `;
                    this.analysisUnsubscribe(); // 오류 시 리스너 해제
                }
            } else if (testId === this.currentTestId) {
                // 문서가 삭제되었거나 아직 생성되지 않은 경우 (로딩 상태를 유지)
                 this.elements.pdfAnalysisStatus.innerHTML = `
                    <div class="flex items-center gap-2 text-blue-600">
                        <div class="loader-small"></div>
                        <span>AI 분석 요청 중...</span>
                    </div>
                `;
            } else {
                 this.elements.pdfAnalysisStatus.innerHTML = `<p class="text-xs text-slate-500 mt-1">AI가 분석할 시험지 PDF를 업로드하세요.</p>`;
            }
        });
    },

    handleStudentDataUpload(event) {
        const XLSX = window.XLSX;
        if (typeof XLSX === 'undefined') {
            showToast("XLSX 처리 라이브러리를 찾을 수 없습니다. HTML 파일에 스크립트가 로드되었는지 확인해주세요.");
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
        
        for (let i = 1; i <= questionCount; i++) {
            if (studentResult[`q${i}`] === 'O') {
                score += scorePerQuestion;
            }
        }
        return Math.round(score);
    },

    showTestAnalysisReport(studentName) {
        if (!this.pdfAnalysisResult || !this.studentData) {
            showToast("시험지 AI 분석 결과와 학생 성적 파일이 모두 준비되어야 합니다.");
            return;
        }
        
        const studentRowKeys = this.studentData.length > 0 ? Object.keys(this.studentData[0]) : [];
        const nameKey = studentRowKeys.find(key => key.includes('학생명') || key.includes('이름'));

        const studentResult = this.studentData.find(row => row[nameKey] === studentName);
        if (!studentResult) {
            showToast(`성적 파일에서 '${studentName}' 학생 정보를 찾을 수 없습니다.`);
            return;
        }

        const totalScore = this._calculateScore(studentResult, this.pdfAnalysisResult);
        
        let tableHtml = `<h3 class="text-xl font-bold mb-4">${studentName} 학생 심화 분석표 (총점: ${totalScore}점)</h3>`;
        tableHtml += `<div class="overflow-x-auto relative shadow-md sm:rounded-lg">`;
        tableHtml += `<table class="w-full text-sm text-left text-gray-500">`;
        tableHtml += `<thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr>
                        <th scope="col" class="py-3 px-6">문항번호</th>
                        <th scope="col" class="py-3 px-6">정오답</th>
                        <th scope="col" class="py-3 px-6">단원명(핵심유형)</th>
                        <th scope="col" class="py-3 px-6">난이도</th>
                        <th scope="col" class="py-3 px-6">오답 대응 방안</th>
                      </tr></thead><tbody>`;

        Object.keys(this.pdfAnalysisResult).sort((a, b) => parseInt(a) - parseInt(b)).forEach(qNum => {
            const metadata = this.pdfAnalysisResult[qNum];
            const result = studentResult[`q${parseInt(qNum)}`] || 'N/A'; 
            const isCorrect = result === 'O';
            const rowClass = isCorrect ? 'bg-white' : 'bg-red-50';
            const resultClass = isCorrect ? 'text-green-700 font-bold' : 'text-red-700 font-bold';

            tableHtml += `<tr class="${rowClass} border-b hover:bg-slate-100">
                            <th scope="row" class="py-4 px-6 font-medium text-gray-900">${qNum}번</th>
                            <td class="py-4 px-6 ${resultClass}">${result}</td>
                            <td class="py-4 px-6">${metadata['단원명'] || '분석 중/N/A'}</td>
                            <td class="py-4 px-6">${metadata['난이도'] || '분석 중/N/A'}</td>
                            <td class="py-4 px-6 text-sm">${isCorrect ? '-' : (metadata['오답대응방안'] || '분석 중/N/A')}</td>
                          </tr>`;
        });

        tableHtml += `</tbody></table></div>`;
        tableHtml += `<div class="mt-4 text-right"><button onclick="document.getElementById('analysis-report-modal').style.display='none'" class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">닫기</button></div>`;
        
        this.elements.analysisContent.innerHTML = tableHtml;
        this.elements.analysisModal.style.display = 'flex';
    },


    // ========== 2. 숙제 자동 채점 기능 (UI 유지) ==========

    async handleHomeworkImageUpload(event) {
        const files = event.target.files;
        if (files.length === 0 || !this.app.state.selectedClassId) {
            showToast("반을 먼저 선택한 후 이미지를 업로드해주세요.");
            return;
        }

        const homeworkId = `homework_${this.app.state.selectedClassId}_${Date.now()}`;
        showToast(`${files.length}개의 숙제 이미지 업로드를 시작합니다...`, false);

        const uploadPromises = Array.from(files).map(file => {
            const filePath = `homework-grading/${homeworkId}/${file.name}`;
            const storageRef = ref(storage, filePath);
            return uploadBytes(storageRef, file);
        });

        try {
            await Promise.all(uploadPromises);
            
            this.elements.homeworkImageUploadInput.value = ''; // 업로드 완료 후 파일 인풋 초기화
            showToast("모든 이미지 업로드 완료! AI가 채점을 시작합니다.", false);
            this.listenForHomeworkGradingResult(homeworkId);

        } catch (error) {
            console.error("병렬 업로드 실패:", error);
            showToast("이미지 업로드에 실패했습니다. (네트워크 오류 가능성)");
        }
    },
    
    listenForHomeworkGradingResult(homeworkId) {
        const resultDocRef = doc(db, "homeworkGradingResults", homeworkId);
        onSnapshot(resultDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const result = docSnap.data();
                if (result.status === 'completed' || result.results) {
                    showToast("숙제 AI 채점 진행 중/완료!", false);
                    this.renderStudentListForHomework();
                } else if (result.status === 'error') {
                    showToast(`숙제 채점 실패: ${result.error}`);
                }
            }
        });
    },
    
    showHomeworkGradingReport(studentName) {
        showToast(`'${studentName}' 학생의 숙제 채점 결과를 불러옵니다. (이 기능은 구현 예정)`);
    },

    // ========== 공통 기능 ==========
    
    renderStudentLists() {
        this.renderStudentListForTest();
        this.renderStudentListForHomework();
    },

    renderStudentListForTest() {
        const listEl = this.elements.testStudentListContainer;
        if (!listEl) return;
        listEl.innerHTML = '';

        if (!this.app.state.selectedClassId || this.app.state.studentsInClass.size === 0) {
            listEl.innerHTML = '<p class="text-slate-400 col-span-full">학생 목록이 없습니다.</p>';
            return;
        }

        const isDataLoaded = !!this.studentData;
        const isAnalysisCompleted = !!this.pdfAnalysisResult;
        const isReady = isDataLoaded && isAnalysisCompleted;
        
        this.app.state.studentsInClass.forEach((name, id) => {
            const studentCard = document.createElement('div');
            studentCard.className = `p-3 border rounded-lg cursor-pointer bg-white transition shadow-sm text-center ${isReady ? 'hover:bg-blue-50' : 'opacity-50 cursor-not-allowed'}`;
            
            let statusText = '';
            if (!isDataLoaded) statusText = '성적 파일 필요';
            else if (!isAnalysisCompleted) statusText = 'AI 분석 중';
            else statusText = '리포트 보기';
            
            studentCard.innerHTML = `
                <h3 class="font-semibold text-slate-800 text-sm">${name}</h3>
                <p class="text-xs text-blue-500">${statusText}</p>
            `;
            if (isReady) {
                studentCard.addEventListener('click', () => this.showTestAnalysisReport(name));
            } else {
                 studentCard.title = "AI 분석 결과와 학생 성적 파일이 모두 준비되어야 합니다.";
            }
            listEl.appendChild(studentCard);
        });
    },
    
    renderStudentListForHomework() {
        const listEl = this.elements.homeworkStudentListContainer;
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-slate-400 col-span-full">숙제 이미지를 업로드하면 채점 결과가 여기에 표시됩니다.</p>';
    },
};