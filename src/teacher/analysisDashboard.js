// src/teacher/analysisDashboard.js
// 분석표 관리 전용 대시보드 로직

import { showToast } from '../shared/utils.js';

export const analysisDashboard = {
    init(app) {
        this.app = app;
        this.elements = {
            studentListContainer: document.getElementById('teacher-analysis-student-list'),
            analysisModal: document.getElementById('analysis-report-modal'),
            analysisContent: document.getElementById('analysis-report-content'),
        };

        // 반 변경 시 학생 목록을 다시 렌더링하도록 구독 (teacherApp.js의 로직에 따라 달라질 수 있음)
        document.addEventListener('class-changed', () => this.renderStudentList());
        
        // 초기 로딩 시 학생 목록 렌더링 (이미 반이 선택된 경우 대비)
        if(this.app.state.selectedClassId) {
            this.renderStudentList();
        }
    },

    renderStudentList() {
        const listEl = this.elements.studentListContainer;
        listEl.innerHTML = '';

        if (!this.app.state.selectedClassId || this.app.state.studentsInClass.size === 0) {
            listEl.innerHTML = '<p class="text-slate-400">학생 목록을 불러올 수 없습니다. 반을 선택하거나 학생을 추가해주세요.</p>';
            return;
        }

        this.app.state.studentsInClass.forEach((name, id) => {
            const studentCard = document.createElement('div');
            studentCard.className = 'p-4 border border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-purple-50 transition shadow-sm';
            studentCard.innerHTML = `<h3 class="font-bold text-slate-800">${name}</h3>
                                     <p class="text-xs text-purple-600 mt-1">분석표 보기</p>`;
            studentCard.addEventListener('click', () => this.showAnalysisReport(id, name));
            listEl.appendChild(studentCard);
        });
    },
    
    // 학생별 심화 분석표를 표시하는 메인 함수 
    async showAnalysisReport(studentId, studentName) {
        const analysisModal = this.elements.analysisModal;
        const analysisContent = this.elements.analysisContent;
        
        if (!analysisModal || !analysisContent) {
            showToast("분석표 UI 요소가 준비되지 않았습니다.", true);
            return;
        }
        
        // 모달을 열고 로딩 상태 표시
        analysisModal.style.display = 'flex';
        analysisContent.innerHTML = `<div class="p-4 text-center">
                                        <div class="loader-small mx-auto"></div>
                                        <p class="mt-2 text-slate-600">${studentName} 학생의 분석 데이터를 불러오는 중...</p>
                                    </div>`;

        try {
            // 임시 데이터를 가져옵니다. (고정된 '고2수금 8월2일 주간테스트' 데이터 사용)
            const { studentResult, problemMetadata } = await this._fetchTestData(studentName); 
            
            // 분석 로직 실행 및 HTML 생성
            const reportHtml = this._generateReportHtml(studentName, studentResult, problemMetadata);
            
            analysisContent.innerHTML = reportHtml;

        } catch (error) {
            console.error("분석표 생성 실패:", error);
            analysisContent.innerHTML = `<p class="p-4 text-red-600">분석표 생성 중 오류가 발생했습니다: ${error.message}</p>`;
            showToast("분석표 생성에 실패했습니다.");
        }
    },

    // 내부 도우미 함수: HTML 보고서 생성
    _generateReportHtml(studentName, studentResult, problemMetadata) {
        let tableHtml = `<h3 class="text-xl font-bold mb-4">${studentName} 학생 심화 분석표 (총점: ${studentResult.score}점)</h3>`;
        tableHtml += `<div class="overflow-x-auto relative shadow-md sm:rounded-lg">`;
        tableHtml += `<table class="w-full text-sm text-left text-gray-500">`;
        tableHtml += `<thead class="text-xs text-gray-700 uppercase bg-gray-50"><tr>
                        <th scope="col" class="py-3 px-6">문항번호</th>
                        <th scope="col" class="py-3 px-6">학생 정오답</th>
                        <th scope="col" class="py-3 px-6">난이도</th>
                        <th scope="col" class="py-3 px-6">개념 유형</th>
                        <th scope="col" class="py-3 px-6">AI 코멘트</th>
                      </tr></thead><tbody>`;

        for (let i = 1; i <= 20; i++) {
            const qNum = `${i}번`;
            const result = studentResult[`q${i}`] || 'N/A';
            const metadata = problemMetadata[qNum] || {};
            const isCorrect = result === 'O';
            
            // 3단계 분석표의 AI 코멘트 로직
            let comment = '';
            if (isCorrect) {
                if (metadata.difficulty === '어려움') comment = '정답 (우수): 고난도 문제 해결 능력 우수.';
                else if (metadata.rate < 50) comment = '정답 (우수): 반 평균을 상회하는 이해도.';
                else comment = '정답 (기본): 해당 개념을 정확히 숙지.';
            } else { // 오답 또는 N/A
                if (metadata.difficulty === '어려움') comment = '오답 (심화 필요): 복합적인 문제 해결 전략 미흡.';
                else if (metadata.rate < 50) comment = '오답 (취약 개념): 반 전체도 어려워한 핵심 개념 문제. 집중 학습 필요.';
                else if (result === 'X') comment = '오답 (기본 복습): 기본적인 개념 이해 부족 또는 사소한 실수.';
                else comment = '데이터 없음: 분석표 데이터를 먼저 등록해주세요.';
            }

            const rowClass = isCorrect ? 'bg-green-50' : (result === 'X' ? 'bg-red-50' : 'bg-white');
            const resultClass = isCorrect ? 'text-green-700 font-bold' : (result === 'X' ? 'text-red-700 font-bold' : 'text-slate-400');
            const difficultyText = metadata.difficulty || 'N/A';

            tableHtml += `<tr class="${rowClass} border-b hover:bg-slate-100">
                            <th scope="row" class="py-4 px-6 font-medium text-gray-900">${qNum}</th>
                            <td class="py-4 px-6 ${resultClass}">${result}</td>
                            <td class="py-4 px-6">${difficultyText}</td>
                            <td class="py-4 px-6">${metadata.concept || 'N/A'}</td>
                            <td class="py-4 px-6 text-sm">${comment}</td>
                          </tr>`;
        }

        tableHtml += `</tbody></table></div>`;
        
        // 모달 닫기 버튼 추가
        tableHtml += `<div class="mt-4 text-right"><button onclick="document.getElementById('analysis-report-modal').style.display='none'" class="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded">닫기</button></div>`;
        
        return tableHtml;
    },

    // 내부 도우미 함수: 테스트 데이터 가져오기 (임시 데이터 - 실제는 Firestore 조회로 대체해야 함)
    async _fetchTestData(studentName) {
        // CSV 파일과 PDF 리포트를 기반으로 한 임시 데이터 (학생 이름으로 매핑)
        const studentsData = {
            '김서진': { 'score': 85, 'q1': 'O', 'q2': 'O', 'q3': 'O', 'q4': 'O', 'q5': 'O', 'q6': 'X', 'q7': 'O', 'q8': 'O', 'q9': 'O', 'q10': 'O', 'q11': 'O', 'q12': 'O', 'q13': 'O', 'q14': 'X', 'q15': 'O', 'q16': 'O', 'q17': 'O', 'q18': 'O', 'q19': 'O', 'q20': 'X' },
            '성정민': { 'score': 45, 'q1': 'O', 'q2': 'O', 'q3': 'X', 'q4': 'O', 'q5': 'X', 'q6': 'X', 'q7': 'O', 'q8': 'X', 'q9': 'X', 'q10': 'O', 'q11': 'O', 'q12': 'X', 'q13': 'X', 'q14': 'X', 'q15': 'X', 'q16': 'X', 'q17': 'O', 'q18': 'O', 'q19': 'O', 'q20': 'X' },
            '안소율': { 'score': 40, 'q1': 'O', 'q2': 'O', 'q3': 'O', 'q4': 'O', 'q5': 'X', 'q6': 'X', 'q7': 'O', 'q8': 'X', 'q9': 'X', 'q10': 'X', 'q11': 'O', 'q12': 'X', 'q13': 'O', 'q14': 'X', 'q15': 'X', 'q16': 'X', 'q17': 'X', 'q18': 'X', 'q19': 'X', 'q20': 'O' },
            '이재진': { 'score': 40, 'q1': 'O', 'q2': 'X', 'q3': 'O', 'q4': 'X', 'q5': 'O', 'q6': 'O', 'q7': 'O', 'q8': 'X', 'q9': 'X', 'q10': 'O', 'q11': 'X', 'q12': 'X', 'q13': 'X', 'q14': 'X', 'q15': 'X', 'q16': 'O', 'q17': 'O', 'q18': 'X', 'q19': 'X', 'q20': 'X' },
            '이현주': { 'score': 75, 'q1': 'O', 'q2': 'O', 'q3': 'O', 'q4': 'O', 'q5': 'X', 'q6': 'O', 'q7': 'O', 'q8': 'O', 'q9': 'O', 'q10': 'X', 'q11': 'O', 'q12': 'O', 'q13': 'O', 'q14': 'X', 'q15': 'O', 'q16': 'O', 'q17': 'O', 'q18': 'X', 'q19': 'O', 'q20': 'X' },
            '최효진': { 'score': 100, 'q1': 'O', 'q2': 'O', 'q3': 'O', 'q4': 'O', 'q5': 'O', 'q6': 'O', 'q7': 'O', 'q8': 'O', 'q9': 'O', 'q10': 'O', 'q11': 'O', 'q12': 'O', 'q13': 'O', 'q14': 'O', 'q15': 'O', 'q16': 'O', 'q17': 'O', 'q18': 'O', 'q19': 'O', 'q20': 'O' },
        };
        
        // AI 리포트의 '문항 정오표' 섹션 기반
        const metadata = {
            '1번': { 'concept': '평균변화율 계산', 'difficulty': '쉬움', 'rate': 100 }, '2번': { 'concept': '미분계수 정의 활용', 'difficulty': '쉬움', 'rate': 83 }, '3번': { 'concept': '미분계수의 기하학적 의미', 'difficulty': '쉬움', 'rate': 83 }, '4번': { 'concept': '미분가능성과 연속성 판별', 'difficulty': '쉬움', 'rate': 83 }, '5번': { 'concept': '극한값으로 표현된 미분계수', 'difficulty': '쉬움', 'rate': 50 },
            '6번': { 'concept': '미분계수의 정의', 'difficulty': '보통', 'rate': 50 }, '7번': { 'concept': '도함수의 정의 활용', 'difficulty': '보통', 'rate': 100 }, '8번': { 'concept': '다항함수 미분법', 'difficulty': '보통', 'rate': 50 }, '9번': { 'concept': '삼수함수 및 상수배 미분법', 'difficulty': '보통', 'rate': 50 }, '10번': { 'concept': '합과 차의 미분법', 'difficulty': '보통', 'rate': 67 },
            '11번': { 'concept': '곱의 미분법', 'difficulty': '보통', 'rate': 83 }, '12번': { 'concept': '다항식의 나머지 정리', 'difficulty': '보통', 'rate': 50 }, '13번': { 'concept': '접선의 방정식', 'difficulty': '보통', 'rate': 67 }, '14번': { 'concept': '미분법의 활용 (최댓값/최솟값)', 'difficulty': '어려움', 'rate': 17 }, '15번': { 'concept': '평균값 정리', 'difficulty': '어려움', 'rate': 50 },
            '16번': { 'concept': '함수의 증가와 감소', 'difficulty': '보통', 'rate': 67 }, '17번': { 'concept': '극대와 극소', 'difficulty': '어려움', 'rate': 83 }, '18번': { 'concept': '함수의 최대 최소 (폐구간)', 'difficulty': '어려움', 'rate': 50 }, '19번': { 'concept': '방정식에의 미분 활용', 'difficulty': '어려움', 'rate': 67 }, '20번': { 'concept': '미분법의 기본공식', 'difficulty': '보통', 'rate': 33 },
        };

        const studentResult = studentsData[studentName];

        if (!studentResult) {
            // Firestore에서 학생 ID를 이름으로 변환할 수 있는 로직이 없으므로,
            // 이름이 임시 데이터에 없으면 찾을 수 없다는 오류를 발생시킵니다.
            throw new Error(`학생(${studentName})의 시험 결과를 찾을 수 없습니다. (임시 데이터에 이름 없음)`);
        }

        return { 
            studentResult: studentResult, 
            problemMetadata: metadata 
        };
    }
};