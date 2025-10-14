// src/teacher/homeworkDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

const functions = getFunctions(app, 'asia-northeast3');

export const homeworkDashboard = {
    unsubscribe: null,

    init(app) {
        this.app = app;

        this.app.elements.assignHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(false));
        this.app.elements.closeHomeworkModalBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.app.elements.cancelHomeworkBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.app.elements.saveHomeworkBtn?.addEventListener('click', () => this.saveHomework());
        this.app.elements.homeworkSelect?.addEventListener('change', (e) => this.handleHomeworkSelection(e.target.value));
        this.app.elements.homeworkSubjectSelect?.addEventListener('change', (e) => this.populateTextbooksForHomework(e.target.value));
        this.app.elements.editHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(true));
        this.app.elements.deleteHomeworkBtn?.addEventListener('click', () => this.deleteHomework());
    },

    async openHomeworkModal(isEditing = false) {
        this.app.state.editingHomeworkId = isEditing ? this.app.state.selectedHomeworkId : null;
        
        this.app.elements.homeworkModalTitle.textContent = isEditing ? '숙제 정보 수정' : '새 숙제 출제';
        this.app.elements.saveHomeworkBtn.textContent = isEditing ? '수정하기' : '출제하기';

        const subjectSelect = this.app.elements.homeworkSubjectSelect;
        const pagesInput = document.getElementById('teacher-homework-pages');
        
        subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.app.elements.homeworkTextbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
        this.app.elements.homeworkTextbookSelect.disabled = true;
        this.app.elements.homeworkDueDateInput.value = '';
        if(pagesInput) pagesInput.value = '';

        if (!this.app.state.selectedClassData || !this.app.state.selectedClassData.subjects) {
            this.app.elements.assignHomeworkModal.style.display = 'flex';
            return;
        }

        const subjectIds = Object.keys(this.app.state.selectedClassData.subjects);
        if (subjectIds.length === 0) {
            this.app.elements.assignHomeworkModal.style.display = 'flex';
            return;
        }

        subjectIds.forEach(id => {
            const subject = this.app.state.subjects.find(s => s.id === id);
            if (subject) {
                 subjectSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
            }
        });

        if (isEditing && this.app.state.editingHomeworkId) {
            const homeworkDoc = await getDoc(doc(db, 'homeworks', this.app.state.editingHomeworkId));
            if (homeworkDoc.exists()) {
                const hwData = homeworkDoc.data();
                subjectSelect.value = hwData.subjectId;
                await this.populateTextbooksForHomework(hwData.subjectId);
                this.app.elements.homeworkTextbookSelect.value = hwData.textbookId;
                this.app.elements.homeworkDueDateInput.value = hwData.dueDate;
                if(pagesInput) pagesInput.value = hwData.pages || '';
            }
        }

        this.app.elements.assignHomeworkModal.style.display = 'flex';
    },

    async populateTextbooksForHomework(subjectId) {
        const textbookSelect = this.app.elements.homeworkTextbookSelect;
        textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
        if (!subjectId || !this.app.state.selectedClassData || !this.app.state.selectedClassData.subjects[subjectId]) {
            textbookSelect.disabled = true; return;
        }
        const textbookIds = this.app.state.selectedClassData.subjects[subjectId].textbooks;
        if (!textbookIds || textbookIds.length === 0) {
            textbookSelect.innerHTML = '<option value="">지정된 교재 없음</option>';
            textbookSelect.disabled = true;
            return;
        }
        const textbookDocs = await Promise.all(
            textbookIds.map(id => getDoc(doc(db, `subjects/${subjectId}/textbooks`, id)))
        );
        textbookDocs.forEach(textbookDoc => {
            if(textbookDoc.exists()){
                textbookSelect.innerHTML += `<option value="${textbookDoc.id}">${textbookDoc.data().name}</option>`;
            }
        });
        textbookSelect.disabled = false;
    },

    closeHomeworkModal() {
        this.app.elements.assignHomeworkModal.style.display = 'none';
        this.app.state.editingHomeworkId = null;
    },

    async saveHomework() {
        const subjectId = this.app.elements.homeworkSubjectSelect.value;
        const textbookSelect = this.app.elements.homeworkTextbookSelect;
        const textbookId = textbookSelect.value;
        const textbookName = textbookSelect.options[textbookSelect.selectedIndex].text;
        const dueDate = this.app.elements.homeworkDueDateInput.value;
        const pages = document.getElementById('teacher-homework-pages').value;

        if (!subjectId || !textbookId || !dueDate || !pages) { showToast("과목, 교재, 제출 기한, 총 페이지 수를 모두 입력해주세요."); return; }
        if (parseInt(pages, 10) <= 0) { showToast("페이지 수는 1 이상의 숫자를 입력해주세요."); return; }

        const homeworkData = {
            classId: this.app.state.selectedClassId,
            subjectId,
            textbookId,
            textbookName,
            dueDate,
            pages: parseInt(pages, 10),
        };

        try {
            if (this.app.state.editingHomeworkId) {
                const homeworkRef = doc(db, 'homeworks', this.app.state.editingHomeworkId);
                await updateDoc(homeworkRef, homeworkData);
                showToast("숙제 정보를 성공적으로 수정했습니다.", false);
            } else {
                homeworkData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'homeworks'), homeworkData);
                showToast("새로운 숙제가 출제되었습니다.", false);
            }
            this.closeHomeworkModal();
            await this.populateHomeworkSelect();
            this.app.elements.homeworkSelect.value = this.app.state.editingHomeworkId || '';
        } catch (error) {
            console.error("숙제 저장/수정 실패: ", error);
            showToast("숙제 처리에 실패했습니다.");
        }
    },

    async populateHomeworkSelect() {
        this.app.elements.homeworkSelect.innerHTML = '<option value="">-- 숙제 선택 --</option>';
        this.app.elements.homeworkContent.style.display = 'none';
        this.app.elements.homeworkManagementButtons.style.display = 'none';
        const q = query(collection(db, 'homeworks'), where('classId', '==', this.app.state.selectedClassId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        snapshot.forEach(doc => {
            const hw = doc.data();
            const displayDate = hw.dueDate || '기한없음';
            const pagesText = hw.pages ? `(${hw.pages}p)` : '';
            this.app.elements.homeworkSelect.innerHTML += `<option value="${doc.id}">[${displayDate}] ${hw.textbookName} ${pagesText}</option>`;
        });
    },

    handleHomeworkSelection(homeworkId) {
        this.app.state.selectedHomeworkId = homeworkId;
        if (this.unsubscribe) this.unsubscribe();
        
        if (!homeworkId) {
            this.app.elements.homeworkContent.style.display = 'none';
            this.app.elements.homeworkManagementButtons.style.display = 'none';
            return;
        }
        
        this.app.elements.homeworkContent.style.display = 'block';
        this.app.elements.homeworkManagementButtons.style.display = 'flex';
        
        const hwText = this.app.elements.homeworkSelect.options[this.app.elements.homeworkSelect.selectedIndex].text;
        
        this.app.elements.selectedHomeworkTitle.innerHTML = `
            '${hwText}' 숙제 제출 현황
            <div id="homework-analysis-container" class="mt-4 p-4 bg-slate-100 rounded-lg text-sm">
                <h4 class="font-bold text-slate-700 mb-2">📊 반 전체 오답 통계</h4>
                <div id="homework-analysis-content">통계를 불러오는 중...</div>
            </div>
        `;

        this.renderTableHeader(this.app.elements.homeworkTableBody, ['학생 이름', '제출 상태', '제출 시간', '관리']);
        
        const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef), (snapshot) => this.renderHomeworkSubmissions(snapshot));
        
        this.listenForHomeworkAnalysis(homeworkId);
    },

    listenForHomeworkAnalysis(homeworkId) {
        const homeworkRef = doc(db, 'homeworks', homeworkId);
        onSnapshot(homeworkRef, (docSnap) => {
            const analysisContent = document.getElementById('homework-analysis-content');
            if (docSnap.exists() && docSnap.data().analysis) {
                const analysis = docSnap.data().analysis;
                const sorted = Object.entries(analysis).sort(([,a],[,b]) => b - a);
                
                if (sorted.length === 0) {
                    analysisContent.innerHTML = '<p class="text-slate-500">아직 집계된 오답이 없습니다.</p>';
                    return;
                }

                analysisContent.innerHTML = sorted
                    .map(([qNum, count]) => `<span class="inline-block bg-red-200 text-red-800 text-xs font-semibold mr-2 px-2.5 py-0.5 rounded-full">${qNum}번 (${count}명)</span>`)
                    .join(' ');
            } else {
                analysisContent.innerHTML = '<p class="text-slate-500">AI 채점 후 통계가 표시됩니다.</p>';
            }
        });
    },

    async deleteHomework() {
        if (!this.app.state.selectedHomeworkId) return;

        if (confirm("정말로 이 숙제를 삭제하시겠습니까? 학생들의 제출 기록도 모두 사라집니다.")) {
            try {
                await deleteDoc(doc(db, 'homeworks', this.app.state.selectedHomeworkId));
                showToast("숙제가 삭제되었습니다.", false);
                this.app.state.selectedHomeworkId = null;
                this.populateHomeworkSelect();
            } catch (error) {
                console.error("숙제 삭제 실패:", error);
                showToast("숙제 삭제에 실패했습니다.");
            }
        }
    },

    async renderHomeworkSubmissions(snapshot) {
        const tbody = this.app.elements.homeworkTableBody;
        tbody.innerHTML = '';
    
        if (this.app.state.studentsInClass.size === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 등록된 학생이 없습니다. [관리자] 메뉴에서 학생을 반에 배정해주세요.</td></tr>';
            return;
        }
    
        const homeworkDoc = await getDoc(doc(db, 'homeworks', this.app.state.selectedHomeworkId));
        const homeworkData = homeworkDoc.exists() ? homeworkDoc.data() : {};
        const textbookName = homeworkData.textbookName || '';
        const totalPages = homeworkData.pages;
    
        const studentIds = Array.from(this.app.state.studentsInClass.keys());
        const analysisPromises = studentIds.map(studentId =>
            getDoc(doc(db, `students/${studentId}/homeworkAnalysis`, this.app.state.selectedHomeworkId))
        );
        const analysisSnapshots = await Promise.all(analysisPromises);
        
        const analysisResults = new Map();
        analysisSnapshots.forEach((snap, index) => {
            if (snap.exists()) {
                analysisResults.set(studentIds[index], snap.data());
            }
        });
    
        this.app.state.studentsInClass.forEach((name, id) => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';
    
            const submissionDoc = snapshot.docs.find(doc => doc.id === id);
            const analysisData = analysisResults.get(id);
    
            let statusHtml, submittedAtHtml, actionHtml;
    
            if (submissionDoc) {
                const submissionData = submissionDoc.data();
                const submittedAtRaw = submissionData.submittedAt;
                const submittedAt = (submittedAtRaw && typeof submittedAtRaw.toDate === 'function') ? submittedAtRaw.toDate().toLocaleString() : '정보 없음';
                const submittedPages = submissionData.imageUrls?.length || 0;
                const isComplete = totalPages > 0 && submittedPages >= totalPages;
                const statusClass = isComplete ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold';
                const pagesInfo = totalPages ? `(${submittedPages}/${totalPages}p)` : `(${submittedPages}p)`;
                
                statusHtml = `<td class="px-6 py-4 ${statusClass}">${isComplete ? `제출 완료 ${pagesInfo}` : `제출 중 ${pagesInfo}`}</td>`;
                submittedAtHtml = `<td class="px-6 py-4">${submittedAt}</td>`;
    
                let buttons = `<button class="download-btn text-xs bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg">전체 다운로드</button>`;
                
                if (analysisData) {
                    buttons += `<button class="show-grade-report-btn text-xs bg-green-600 text-white font-semibold px-3 py-1 rounded-lg">채점 결과 보기</button>`;
                } else {
                    buttons += `<button class="grade-btn text-xs bg-purple-600 text-white font-semibold px-3 py-1 rounded-lg">AI 채점</button>`;
                }
                actionHtml = `<td class="px-6 py-4 flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">${buttons}</td>`;
    
            } else {
                const statusClass = 'text-slate-400';
                const pagesInfo = totalPages ? `(0/${totalPages}p)` : '';
                statusHtml = `<td class="px-6 py-4 ${statusClass}">미제출 ${pagesInfo}</td>`;
                submittedAtHtml = `<td class="px-6 py-4">미제출</td>`;
                actionHtml = `<td class="px-6 py-4"></td>`;
            }
    
            row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${name}</td>${statusHtml}${submittedAtHtml}${actionHtml}`;
            tbody.appendChild(row);
    
            if (submissionDoc) {
                const submissionData = submissionDoc.data();
                row.querySelector('.download-btn')?.addEventListener('click', () => this.downloadHomework(submissionData, textbookName));
                row.querySelector('.grade-btn')?.addEventListener('click', (e) => this.runAIGrading(e, id));
                row.querySelector('.show-grade-report-btn')?.addEventListener('click', () => this.app.analysisDashboard.showHomeworkGradingReport(name, analysisData));
            }
        });
    },

    async runAIGrading(event, studentId) {
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '채점 중...';
        button.disabled = true;

        showToast("AI 채점을 요청했습니다. 잠시 후 결과가 집계됩니다.", false);
        
        try {
            const gradeAndAnalyzeHomework = httpsCallable(functions, 'gradeAndAnalyzeHomework');
            const result = await gradeAndAnalyzeHomework({ 
                homeworkId: this.app.state.selectedHomeworkId,
                studentId: studentId
            });
            
            if (result.data.success) {
                showToast("AI 채점 및 통계 집계가 완료되었습니다.", false);
            } else {
                throw new Error(result.data.message || '알 수 없는 오류');
            }
        } catch (error) {
            console.error("AI 채점 함수 호출 실패:", error);
            showToast(`AI 채점 실패: ${error.message}`);
            // 실패 시 버튼을 원상 복구
            button.textContent = originalText;
            button.disabled = false;
        }
    },

    async downloadHomework(submissionData, textbookName) {
        if (!submissionData || !submissionData.imageUrls || !submissionData.imageUrls.length === 0) {
            showToast("다운로드할 이미지가 없습니다.");
            return;
        }
        
        showToast("다운로드를 시작합니다...", false);
        const { studentName, submittedAt, imageUrls } = submissionData;
        const date = new Date(submittedAt.toMillis()).toISOString().split('T')[0];

        for (let i = 0; i < imageUrls.length; i++) {
            const url = imageUrls[i];
            const fileName = `${date}_${this.app.state.selectedClassName}_${studentName}_${textbookName}_${i+1}.jpg`;
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                link.click();
                URL.revokeObjectURL(link.href);
            } catch (error) {
                console.error(`다운로드 실패: ${fileName}`, error);
                showToast(`${fileName} 다운로드에 실패했습니다.`);
            }
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