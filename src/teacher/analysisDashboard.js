// src/teacher/analysisDashboard.js

import { showToast } from '../shared/utils.js';
import { storage, db } from '../shared/firebase.js'; // Firebase import
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { doc, onSnapshot } from "firebase/firestore";

export const analysisDashboard = {
    studentData: null,
    pdfAnalysisResult: null,
    
    init(app) {
        this.app = app;
        this.elements = {
            // 시험지 분석 UI
            testPdfUploadInput: document.getElementById('test-pdf-upload-input'),
            studentDataUploadInput: document.getElementById('student-data-upload-input'),
            pdfAnalysisStatus: document.getElementById('pdf-analysis-status'),
            testStudentListContainer: document.getElementById('test-analysis-student-list'),

            // 숙제 채점 UI
            homeworkImageUploadInput: document.getElementById('homework-image-upload-input'),
            homeworkStudentListContainer: document.getElementById('homework-analysis-student-list'),
            
            // 공통 모달 UI
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

        const testId = `test_${this.app.state.selectedClassId}_${Date.now()}`;
        const storageRef = ref(storage, `test-analysis/${testId}/${file.name}`);
        this.elements.pdfAnalysisStatus.textContent = "PDF 업로드 중...";

        try {
            await uploadBytes(storageRef, file);
            this.elements.pdfAnalysisStatus.textContent = "✅ PDF 업로드 완료! AI가 분석 중입니다... (최대 1분 소요)";
            showToast("PDF 업로드 성공! AI 분석이 시작되었습니다.", false);

            // Firestore에서 실시간으로 분석 결과 수신 대기
            this.listenForPdfAnalysisResult(testId);
        } catch (error) {
            this.elements.pdfAnalysisStatus.textContent = "PDF 업로드에 실패했습니다.";
            showToast("PDF 업로드 실패: " + error.message);
        }
    },

    listenForPdfAnalysisResult(testId) {
        const resultDocRef = doc(db, "testAnalysisResults", testId);
        onSnapshot(resultDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const result = docSnap.data();
                if (result.status === 'completed') {
                    this.pdfAnalysisResult = result.analysis;
                    this.elements.pdfAnalysisStatus.textContent = `✅ AI 분석 완료! ${Object.keys(result.analysis).length}개 문항 분석됨.`;
                    showToast("시험지 AI 분석이 완료되었습니다!", false);
                } else if (result.status === 'error') {
                    this.elements.pdfAnalysisStatus.textContent = `❌ AI 분석 실패: ${result.error}`;
                }
            }
        });
    },

    handleStudentDataUpload(event) {
        // 기존 XLSX 파싱 로직과 동일
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
            } catch (error) {
                showToast("학생 성적 파일(XLSX) 처리 중 오류가 발생했습니다.");
            }
        };
        reader.readAsArrayBuffer(file);
    },

    showTestAnalysisReport(studentName) {
        if (!this.pdfAnalysisResult || !this.studentData) {
            showToast("시험지 AI 분석 결과와 학생 성적 파일이 모두 준비되어야 합니다.");
            return;
        }
        const studentResult = this.studentData.find(row => row['학생명'] === studentName);
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

        Object.keys(this.pdfAnalysisResult).forEach(qNum => {
            const metadata = this.pdfAnalysisResult[qNum];
            const result = studentResult[`q${parseInt(qNum)}`] || 'N/A';
            const isCorrect = result === 'O';
            const rowClass = isCorrect ? 'bg-white' : 'bg-red-50';
            const resultClass = isCorrect ? 'text-green-700 font-bold' : 'text-red-700 font-bold';

            tableHtml += `<tr class="${rowClass} border-b hover:bg-slate-100">
                            <th scope="row" class="py-4 px-6 font-medium text-gray-900">${qNum}번</th>
                            <td class="py-4 px-6 ${resultClass}">${result}</td>
                            <td class="py-4 px-6">${metadata['단원명'] || 'N/A'}</td>
                            <td class="py-4 px-6">${metadata['난이도'] || 'N/A'}</td>
                            <td class="py-4 px-6 text-sm">${isCorrect ? '-' : (metadata['오답대응방안'] || 'N/A')}</td>
                          </tr>`;
        });

        tableHtml += `</tbody></table></div>`;
        tableHtml += `<div class="mt-4 text-right"><button onclick="document.getElementById('analysis-report-modal').style.display='none'" class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">닫기</button></div>`;
        
        this.elements.analysisContent.innerHTML = tableHtml;
        this.elements.analysisModal.style.display = 'flex';
    },


    // ========== 2. 숙제 자동 채점 기능 ==========

    async handleHomeworkImageUpload(event) {
        const files = event.target.files;
        if (files.length === 0 || !this.app.state.selectedClassId) {
            showToast("반을 먼저 선택한 후 이미지를 업로드해주세요.");
            return;
        }

        const homeworkId = `homework_${this.app.state.selectedClassId}_${Date.now()}`;
        showToast(`${files.length}개의 숙제 이미지 업로드를 시작합니다...`, false);

        for (const file of files) {
            const storageRef = ref(storage, `homework-grading/${homeworkId}/${file.name}`);
            try {
                await uploadBytes(storageRef, file);
            } catch (error) {
                showToast(`'${file.name}' 업로드 실패: ${error.message}`);
            }
        }
        
        showToast("모든 이미지 업로드 완료! AI가 채점을 시작합니다.", false);
        this.listenForHomeworkGradingResult(homeworkId);
    },
    
    listenForHomeworkGradingResult(homeworkId) {
        const resultDocRef = doc(db, "homeworkGradingResults", homeworkId);
        onSnapshot(resultDocRef, (docSnap) => {
            if (docSnap.exists()) {
                const result = docSnap.data();
                if (result.status === 'completed') {
                    showToast("숙제 AI 채점이 완료되었습니다!", false);
                    this.renderStudentLists(); // 채점 완료 후 학생 목록 새로고침
                } else if (result.status === 'error') {
                    showToast(`숙제 채점 실패: ${result.error}`);
                }
            }
        });
    },
    
    showHomeworkGradingReport(studentName) {
        // TODO: Firestore에서 해당 학생의 채점 결과를 가져와 모달에 표시
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

        this.app.state.studentsInClass.forEach((name, id) => {
            const studentCard = document.createElement('div');
            studentCard.className = 'p-3 border border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-blue-50 transition shadow-sm text-center';
            studentCard.innerHTML = `<h3 class="font-semibold text-slate-800 text-sm">${name}</h3>`;
            studentCard.addEventListener('click', () => this.showTestAnalysisReport(name));
            listEl.appendChild(studentCard);
        });
    },
    
    renderStudentListForHomework() {
        // 이 부분은 나중에 Firestore에서 채점 완료된 학생 목록을 가져와 렌더링하도록 수정
        const listEl = this.elements.homeworkStudentListContainer;
        if (!listEl) return;
        listEl.innerHTML = '<p class="text-slate-400 col-span-full">숙제 이미지를 업로드하면 채점 결과가 여기에 표시됩니다.</p>';
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
};