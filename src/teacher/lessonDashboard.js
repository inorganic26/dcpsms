// src/teacher/lessonDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonDashboard = {
    unsubscribe: null,

    // teacherApp.js로부터 state와 elements 객체를 전달받아 초기화합니다.
    init(state, elements) {
        this.state = state;
        this.elements = elements;

        // 학습 현황 대시보드와 관련된 이벤트 리스너를 설정합니다.
        this.elements.subjectSelect?.addEventListener('change', (e) => this.populateLessonSelect(e.target.value));
        this.elements.lessonSelect?.addEventListener('change', (e) => this.handleLessonSelection(e.target.value, e.target.options[e.target.selectedIndex].text));
    },

    // 선택된 과목에 맞는 학습 목록을 불러옵니다.
    async populateLessonSelect(subjectId) {
        this.state.selectedSubjectId = subjectId;
        this.elements.lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
        this.elements.dashboardContent.style.display = 'none';
        if (!subjectId) {
            this.elements.lessonSelect.disabled = true;
            return;
        }
        this.elements.lessonSelect.disabled = false;
        const snapshot = await getDocs(query(collection(db, 'subjects', subjectId, 'lessons')));
        snapshot.forEach(doc => this.elements.lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`);
    },

    // 선택된 학습의 학생별 현황을 실시간으로 보여줍니다.
    handleLessonSelection(lessonId, lessonTitle) {
        this.state.selectedLessonId = lessonId;
        if (this.unsubscribe) this.unsubscribe();
        if (!lessonId) {
            this.elements.dashboardContent.style.display = 'none';
            return;
        }
        this.elements.dashboardContent.style.display = 'block';
        this.elements.selectedLessonTitle.textContent = `'${lessonTitle}' 학습 현황`;
        this.renderTableHeader(this.elements.resultsTableBody, ['학생 이름', '진행 상태', '점수', '마지막 활동', '관리']);
        
        const submissionsRef = collection(db, 'subjects', this.state.selectedSubjectId, 'lessons', lessonId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef), (snapshot) => {
            const tbody = this.elements.resultsTableBody;
            tbody.innerHTML = '';
            if (snapshot.empty) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-500">참여 학생 없음</td></tr>';
                return;
            }
            const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            submissions.sort((a, b) => (b.lastAttemptAt?.toMillis() || 0) - (a.lastAttemptAt?.toMillis() || 0));
            submissions.forEach(sub => this.renderSubmissionRow(sub));
        });
    },

    // 학생 한 명의 학습 현황을 테이블 행으로 렌더링합니다.
    renderSubmissionRow(data) {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-slate-50';
        const score = (data.score !== undefined) ? `${data.score} / ${data.totalQuestions}` : '-';
        const dateRaw = data.lastAttemptAt;
        const date = (dateRaw && typeof dateRaw.toDate === 'function') ? dateRaw.toDate().toLocaleString() : '정보 없음';
        let statusClass = '';
        if (data.status.includes('통과')) statusClass = 'text-green-600 font-semibold';
        if (data.status.includes('실패')) statusClass = 'text-red-600 font-semibold';
        row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${data.studentName}</td><td class="px-6 py-4 ${statusClass}">${data.status}</td><td class="px-6 py-4">${score}</td><td class="px-6 py-4">${date}</td><td class="px-6 py-4"><button data-id="${data.id}" class="reset-lesson-btn text-xs bg-yellow-500 text-white font-semibold px-3 py-1 rounded-lg">기록 삭제</button></td>`;
        this.elements.resultsTableBody.appendChild(row);
        row.querySelector('.reset-lesson-btn').addEventListener('click', (e) => this.resetStudentLessonProgress(e.target.dataset.id, data.studentName));
    },

    // 학생의 학습 기록을 삭제합니다.
    async resetStudentLessonProgress(submissionId, studentName) {
        if (!confirm(`'${studentName}' 학생의 학습 기록을 정말 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'subjects', this.state.selectedSubjectId, 'lessons', this.state.selectedLessonId, 'submissions', submissionId));
            showToast("학생 기록이 삭제되었습니다.", false);
        } catch (error) {
            showToast("학생 기록 삭제에 실패했습니다.");
        }
    },
    
    // 테이블 헤더를 생성하는 유틸리티 함수입니다.
    renderTableHeader(tbody, headers) {
        const table = tbody.parentElement;
        table.querySelector('thead')?.remove();
        const thead = document.createElement('thead');
        thead.className = 'text-xs text-gray-700 uppercase bg-gray-50';
        let headerHtml = '<tr>';
        headers.forEach(h => headerHtml += `<th scope="col" class="px-6 py-3">${h}</th>`);
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;
        table.insertBefore(thead, tbody);
    }
};