// src/teacher/lessonDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const lessonDashboard = {
    unsubscribe: null,

    init(app) {
        this.app = app;
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
            // 최근 활동 순 정렬 (lastAttemptAt 우선, 없으면 lastWatchUpdate)
            submissions.sort((a, b) => {
                const timeA = a.lastAttemptAt?.toMillis() || a.lastWatchUpdate?.toMillis() || 0;
                const timeB = b.lastAttemptAt?.toMillis() || b.lastWatchUpdate?.toMillis() || 0;
                return timeB - timeA;
            });
            submissions.forEach(sub => this.renderSubmissionRow(sub));
        });
    },

    renderSubmissionRow(data) {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-slate-50';
        
        // 🚀 [수정] 점수 표시 로직 강화
        // 1순위: 맞은개수/전체개수, 2순위: 100점 환산점수, 3순위: -
        let scoreDisplay = '-';
        if (data.correctCount !== undefined && data.totalQuestions !== undefined) {
            scoreDisplay = `${data.score}점 (${data.correctCount}/${data.totalQuestions})`;
        } else if (data.score !== undefined) {
            scoreDisplay = `${data.score}점`;
        }

        const dateRaw = data.lastAttemptAt || data.lastWatchUpdate;
        const date = (dateRaw && typeof dateRaw.toDate === 'function') ? dateRaw.toDate().toLocaleString() : '정보 없음';

        // 🚀 [수정] 상태 표시 로직 강화 (영어 코드 -> 한글 변환 및 색상 적용)
        let statusText = '학습 중';
        let statusClass = 'text-slate-500';

        // 안전한 접근을 위해 data.status가 있을 때만 체크
        const status = data.status || '';

        if (status === 'completed' || status.includes('통과')) {
            statusText = '통과';
            statusClass = 'text-green-600 font-bold';
        } else if (status === 'failed' || status.includes('실패')) {
            statusText = '재도전 필요';
            statusClass = 'text-red-600 font-bold';
        } else if (data.watchedSeconds > 0) {
            // 퀴즈는 안 풀었지만 영상은 보고 있는 경우
            statusText = '영상 시청 중';
            statusClass = 'text-blue-500';
        }

        row.innerHTML = `
            <td class="px-6 py-4 font-medium text-slate-900">${data.studentName || '이름 없음'}</td>
            <td class="px-6 py-4 ${statusClass}">${statusText}</td>
            <td class="px-6 py-4">${scoreDisplay}</td>
            <td class="px-6 py-4 text-sm text-slate-500">${date}</td>
            <td class="px-6 py-4">
                <button data-id="${data.id}" class="reset-lesson-btn text-xs bg-red-100 hover:bg-red-200 text-red-600 font-semibold px-3 py-1 rounded-lg transition">
                    기록 삭제
                </button>
            </td>`;
            
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