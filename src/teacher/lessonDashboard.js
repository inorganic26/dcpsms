// src/teacher/lessonDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonDashboard = {
    unsubscribe: null,

    init(app) {
        this.app = app;

        // 요소가 존재하는지 확인 후 이벤트 리스너 추가
        if (this.app.elements.subjectSelectLesson) {
            this.app.elements.subjectSelectLesson.addEventListener('change', (e) => this.populateLessonSelect(e.target.value));
        }
        if (this.app.elements.lessonSelect) {
            this.app.elements.lessonSelect.addEventListener('change', (e) => this.handleLessonSelection(e.target.value, e.target.options[e.target.selectedIndex].text));
        }
    },

    async populateLessonSelect(subjectId) {
        this.app.state.selectedSubjectId = subjectId;
        this.app.elements.lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
        this.app.elements.lessonDashboardContent.style.display = 'none';
        if (!subjectId) {
            this.app.elements.lessonSelect.disabled = true;
            return;
        }
        this.app.elements.lessonSelect.disabled = false;
        const snapshot = await getDocs(query(collection(db, 'subjects', subjectId, 'lessons')));
        snapshot.forEach(doc => this.app.elements.lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`);
    },

    handleLessonSelection(lessonId, lessonTitle) {
        this.app.state.selectedLessonId = lessonId;
        if (this.unsubscribe) this.unsubscribe();
        if (!lessonId) {
            this.app.elements.lessonDashboardContent.style.display = 'none';
            return;
        }
        this.app.elements.lessonDashboardContent.style.display = 'block';
        this.app.elements.selectedLessonTitle.textContent = `'${lessonTitle}' 학습 현황`;
        this.renderTableHeader(this.app.elements.resultsTableBody, ['학생 이름', '진행 상태', '점수', '마지막 활동', '관리']);
        
        const submissionsRef = collection(db, 'subjects', this.app.state.selectedSubjectId, 'lessons', lessonId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef), (snapshot) => {
            const tbody = this.app.elements.resultsTableBody;
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

    renderSubmissionRow(data) {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-slate-50';
        const score = (data.score !== undefined) ? `${data.score} / ${data.totalQuestions}` : '-';
        const dateRaw = data.lastAttemptAt;
        const date = (dateRaw && typeof dateRaw.toDate === 'function') ? dateRaw.toDate().toLocaleString() : '정보 없음';
        let statusClass = '';
        if (data.status.includes('통과')) statusClass = 'text-green-600 font-semibold';
        if (data.status.includes('실패')) statusClass = 'text-red-600 font-semibold';
        row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${data.studentName}</td><td class="px-6 py-4 ${statusClass}">${data.status}</td><td class.px-6 py-4">${score}</td><td class="px-6 py-4">${date}</td><td class="px-6 py-4"><button data-id="${data.id}" class="reset-lesson-btn text-xs bg-yellow-500 text-white font-semibold px-3 py-1 rounded-lg">기록 삭제</button></td>`;
        this.app.elements.resultsTableBody.appendChild(row);
        row.querySelector('.reset-lesson-btn').addEventListener('click', (e) => this.resetStudentLessonProgress(e.target.dataset.id, data.studentName));
    },

    async resetStudentLessonProgress(submissionId, studentName) {
        if (!confirm(`'${studentName}' 학생의 학습 기록을 정말 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'subjects', this.app.state.selectedSubjectId, 'lessons', this.app.state.selectedLessonId, 'submissions', submissionId));
            showToast("학생 기록이 삭제되었습니다.", false);
        } catch (error) {
            showToast("학생 기록 삭제에 실패했습니다.");
        }
    },
    
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