import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

const TeacherApp = {
    isInitialized: false,
    elements: {},
    unsubscribe: null,
    state: {
        selectedClassId: null,
        selectedClassName: null,
        selectedClassData: null,
        selectedSubjectId: null,
        selectedLessonId: null,
        selectedHomeworkId: null,
        editingHomeworkId: null, // 수정 모드를 위한 상태 추가
        studentsInClass: new Map(),
    },
    init() {
        if (this.isInitialized) return;
        this.isInitialized = true;
        this.cacheElements();
        this.addEventListeners();
        this.populateClassSelect();
    },
    cacheElements() {
        this.elements = {
            loadingScreen: document.getElementById('teacher-loading-screen'),
            classSelect: document.getElementById('teacher-class-select'),
            viewSelect: document.getElementById('teacher-view-select'),
            lessonsDashboard: document.getElementById('teacher-lessons-dashboard'),
            subjectSelect: document.getElementById('teacher-subject-select'),
            lessonSelect: document.getElementById('teacher-lesson-select'),
            dashboardContent: document.getElementById('teacher-dashboard-content'),
            selectedLessonTitle: document.getElementById('teacher-selected-lesson-title'),
            resultsTableBody: document.getElementById('teacher-results-table-body'),
            homeworkDashboard: document.getElementById('teacher-homework-dashboard'),
            assignHomeworkBtnContainer: document.getElementById('teacher-assign-homework-btn-container'),
            assignHomeworkBtn: document.getElementById('teacher-assign-homework-btn'),
            homeworkSelect: document.getElementById('teacher-homework-select'),
            homeworkContent: document.getElementById('teacher-homework-content'),
            selectedHomeworkTitle: document.getElementById('teacher-selected-homework-title'),
            homeworkManagementButtons: document.getElementById('teacher-homework-management-buttons'),
            editHomeworkBtn: document.getElementById('teacher-edit-homework-btn'),
            deleteHomeworkBtn: document.getElementById('teacher-delete-homework-btn'),
            homeworkTableBody: document.getElementById('teacher-homework-table-body'),
            assignHomeworkModal: document.getElementById('teacher-assign-homework-modal'),
            homeworkModalTitle: document.getElementById('teacher-homework-modal-title'),
            closeHomeworkModalBtn: document.getElementById('teacher-close-homework-modal-btn'),
            cancelHomeworkBtn: document.getElementById('teacher-cancel-homework-btn'),
            saveHomeworkBtn: document.getElementById('teacher-save-homework-btn'),
            homeworkSubjectSelect: document.getElementById('teacher-homework-subject-select'),
            homeworkTextbookSelect: document.getElementById('teacher-homework-textbook-select'),
            homeworkDueDateInput: document.getElementById('teacher-homework-due-date'),
        };
    },
    addEventListeners() { 
        this.elements.classSelect?.addEventListener('change', (e) => this.handleClassSelection(e));
        this.elements.viewSelect?.addEventListener('change', (e) => this.handleViewChange(e.target.value));
        this.elements.subjectSelect?.addEventListener('change', (e) => this.populateLessonSelect(e.target.value));
        this.elements.lessonSelect?.addEventListener('change', (e) => this.handleLessonSelection(e.target.value, e.target.options[e.target.selectedIndex].text));
        this.elements.assignHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(false));
        this.elements.closeHomeworkModalBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.elements.cancelHomeworkBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.elements.saveHomeworkBtn?.addEventListener('click', () => this.saveHomework());
        this.elements.homeworkSelect?.addEventListener('change', (e) => this.handleHomeworkSelection(e.target.value));
        this.elements.homeworkSubjectSelect?.addEventListener('change', (e) => this.populateTextbooksForHomework(e.target.value));
        this.elements.editHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(true));
        this.elements.deleteHomeworkBtn?.addEventListener('click', () => this.deleteHomework());
    },
    resetAllSelections() {
        this.state.selectedClassId = null; this.state.selectedClassName = null;
        this.state.selectedClassData = null; this.state.selectedSubjectId = null;
        this.state.selectedLessonId = null; this.state.selectedHomeworkId = null;
        this.state.studentsInClass.clear();
        this.elements.viewSelect.disabled = true;
        this.elements.lessonsDashboard.style.display = 'none';
        this.elements.homeworkDashboard.style.display = 'none';
        this.elements.assignHomeworkBtnContainer.style.display = 'none';
    },
    async handleClassSelection(event) {
        const selectedOption = event.target.options[event.target.selectedIndex];
        this.state.selectedClassId = selectedOption.value;
        this.state.selectedClassName = selectedOption.text;
        if (!this.state.selectedClassId) { this.resetAllSelections(); return; }
        this.elements.viewSelect.disabled = false;
        await this.fetchClassData(this.state.selectedClassId);
        this.handleViewChange(this.elements.viewSelect.value);
    },
    async fetchClassData(classId) {
        await this.fetchStudentsInClass(classId);
        const classDoc = await getDoc(doc(db, 'classes', classId));
        if (classDoc.exists()) {
            this.state.selectedClassData = classDoc.data();
        } else {
            this.state.selectedClassData = null;
        }
    },
    handleViewChange(view) {
        this.elements.lessonsDashboard.style.display = 'none';
        this.elements.homeworkDashboard.style.display = 'none';
        this.elements.assignHomeworkBtnContainer.style.display = 'none';
        this.elements.dashboardContent.style.display = 'none';
        this.elements.homeworkContent.style.display = 'none';
        this.elements.homeworkManagementButtons.style.display = 'none';
        if (this.unsubscribe) this.unsubscribe();
        if (view === 'lessons') {
            this.elements.lessonsDashboard.style.display = 'block';
            this.populateSubjectSelect();
        } else if (view === 'homework') {
            this.elements.homeworkDashboard.style.display = 'block';
            this.elements.assignHomeworkBtnContainer.style.display = 'block';
            this.populateHomeworkSelect();
        }
    },
    async fetchStudentsInClass(classId) {
        this.state.studentsInClass.clear();
        const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
        const snapshot = await getDocs(studentsQuery);
        snapshot.forEach(doc => this.state.studentsInClass.set(doc.id, doc.data().name));
    },
    async populateClassSelect() {
        this.elements.loadingScreen.style.display = 'flex';
        this.elements.classSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
        try {
            const q = query(collection(db, 'classes'));
            const snapshot = await getDocs(q);
            snapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id; option.textContent = doc.data().name;
                this.elements.classSelect.appendChild(option);
            });
        } catch (error) { showToast("반 목록을 불러오는 데 실패했습니다."); } 
        finally { this.elements.loadingScreen.style.display = 'none'; }
    },
    async populateSubjectSelect() {
        this.elements.subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.elements.lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
        this.elements.lessonSelect.disabled = true; this.elements.dashboardContent.style.display = 'none';
        if (!this.state.selectedClassData || !this.state.selectedClassData.subjects) { 
            this.elements.subjectSelect.disabled = true; return; 
        }
        const subjectIds = Object.keys(this.state.selectedClassData.subjects);
        if(subjectIds.length === 0) { this.elements.subjectSelect.disabled = true; return; }
        const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
        subjectDocs.forEach(subjectDoc => {
            if(subjectDoc.exists()) {
                this.elements.subjectSelect.innerHTML += `<option value="${subjectDoc.id}">${subjectDoc.data().name}</option>`;
            }
        });
        this.elements.subjectSelect.disabled = false;
    },
    async populateLessonSelect(subjectId) {
        this.state.selectedSubjectId = subjectId;
        this.elements.lessonSelect.innerHTML = '<option value="">-- 학습 선택 --</option>';
        this.elements.dashboardContent.style.display = 'none';
        if (!subjectId) { this.elements.lessonSelect.disabled = true; return; }
        this.elements.lessonSelect.disabled = false;
        const snapshot = await getDocs(query(collection(db, 'subjects', subjectId, 'lessons')));
        snapshot.forEach(doc => this.elements.lessonSelect.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`);
    },
    handleLessonSelection(lessonId, lessonTitle) {
        this.state.selectedLessonId = lessonId;
        if (this.unsubscribe) this.unsubscribe(); 
        if (!lessonId) { this.elements.dashboardContent.style.display = 'none'; return; }
        this.elements.dashboardContent.style.display = 'block'; 
        this.elements.selectedLessonTitle.textContent = `'${lessonTitle}' 학습 현황`;
        this.renderTableHeader(this.elements.resultsTableBody, ['학생 이름', '진행 상태', '점수', '마지막 활동', '관리']);
        const submissionsRef = collection(db, 'subjects', this.state.selectedSubjectId, 'lessons', lessonId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef), (snapshot) => {
            const tbody = this.elements.resultsTableBody;
            tbody.innerHTML = '';
            if (snapshot.empty) { tbody.innerHTML = '<tr><td colspan="5" class="text-center p-8 text-slate-500">참여 학생 없음</td></tr>'; return; }
            const submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            submissions.sort((a,b) => (b.lastAttemptAt?.toMillis() || 0) - (a.lastAttemptAt?.toMillis() || 0));
            submissions.forEach(sub => this.renderSubmissionRow(sub));
        });
    },
    renderSubmissionRow(data) {
        const row = document.createElement('tr');
        row.className = 'bg-white border-b hover:bg-slate-50';
        const score = (data.score !== undefined) ? `${data.score} / ${data.totalQuestions}` : '-';
        const dateRaw = data.lastAttemptAt;
        const date = (dateRaw && typeof dateRaw.toDate === 'function') ? dateRaw.toDate().toLocaleString() : '정보 없음';
        let statusClass = ''; if(data.status.includes('통과')) statusClass = 'text-green-600 font-semibold'; if(data.status.includes('실패')) statusClass = 'text-red-600 font-semibold';
        row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${data.studentName}</td><td class="px-6 py-4 ${statusClass}">${data.status}</td><td class="px-6 py-4">${score}</td><td class="px-6 py-4">${date}</td><td class="px-6 py-4"><button data-id="${data.id}" class="reset-lesson-btn text-xs bg-yellow-500 text-white font-semibold px-3 py-1 rounded-lg">기록 삭제</button></td>`;
        this.elements.resultsTableBody.appendChild(row);
        row.querySelector('.reset-lesson-btn').addEventListener('click', (e) => this.resetStudentLessonProgress(e.target.dataset.id, data.studentName));
    },
    async resetStudentLessonProgress(submissionId, studentName) {
        if (!confirm(`'${studentName}' 학생의 학습 기록을 정말 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, 'subjects', this.state.selectedSubjectId, 'lessons', this.state.selectedLessonId, 'submissions', submissionId));
            showToast("학생 기록이 삭제되었습니다.", false);
        } catch(error) { showToast("학생 기록 삭제에 실패했습니다."); }
    },
    async openHomeworkModal(isEditing = false) {
        this.state.editingHomeworkId = isEditing ? this.state.selectedHomeworkId : null;
        
        this.elements.homeworkModalTitle.textContent = isEditing ? '숙제 정보 수정' : '새 숙제 출제';
        this.elements.saveHomeworkBtn.textContent = isEditing ? '수정하기' : '출제하기';

        const subjectSelect = this.elements.homeworkSubjectSelect;
        subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.elements.homeworkTextbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
        this.elements.homeworkTextbookSelect.disabled = true;
        this.elements.homeworkDueDateInput.value = '';

        if (!this.state.selectedClassData || !this.state.selectedClassData.subjects) {
            this.elements.assignHomeworkModal.style.display = 'flex';
            return;
        }

        const subjectIds = Object.keys(this.state.selectedClassData.subjects);
        if (subjectIds.length === 0) {
            this.elements.assignHomeworkModal.style.display = 'flex';
            return;
        }

        const subjectDocs = await Promise.all(subjectIds.map(id => getDoc(doc(db, 'subjects', id))));
        subjectDocs.forEach(subjectDoc => {
            if (subjectDoc.exists()) {
                subjectSelect.innerHTML += `<option value="${subjectDoc.id}">${subjectDoc.data().name}</option>`;
            }
        });

        if (isEditing && this.state.editingHomeworkId) {
            const homeworkDoc = await getDoc(doc(db, 'homeworks', this.state.editingHomeworkId));
            if (homeworkDoc.exists()) {
                const hwData = homeworkDoc.data();
                subjectSelect.value = hwData.subjectId;
                await this.populateTextbooksForHomework(hwData.subjectId);
                this.elements.homeworkTextbookSelect.value = hwData.textbookId;
                this.elements.homeworkDueDateInput.value = hwData.dueDate;
            }
        }

        this.elements.assignHomeworkModal.style.display = 'flex';
    },
    async populateTextbooksForHomework(subjectId) {
        const textbookSelect = this.elements.homeworkTextbookSelect;
        textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
        if (!subjectId || !this.state.selectedClassData || !this.state.selectedClassData.subjects[subjectId]) {
            textbookSelect.disabled = true; return;
        }
        const textbookIds = this.state.selectedClassData.subjects[subjectId].textbooks;
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
        this.elements.assignHomeworkModal.style.display = 'none';
        this.state.editingHomeworkId = null;
    },
    async saveHomework() {
        const subjectId = this.elements.homeworkSubjectSelect.value;
        const textbookSelect = this.elements.homeworkTextbookSelect;
        const textbookId = textbookSelect.value;
        const textbookName = textbookSelect.options[textbookSelect.selectedIndex].text;
        const dueDate = this.elements.homeworkDueDateInput.value;

        if (!subjectId || !textbookId || !dueDate) { showToast("과목, 교재, 제출 기한을 모두 선택해주세요."); return; }

        const homeworkData = {
            classId: this.state.selectedClassId,
            subjectId,
            textbookId,
            textbookName,
            dueDate,
        };

        try {
            if (this.state.editingHomeworkId) {
                // 수정 모드
                const homeworkRef = doc(db, 'homeworks', this.state.editingHomeworkId);
                await updateDoc(homeworkRef, homeworkData);
                showToast("숙제 정보를 성공적으로 수정했습니다.", false);
            } else {
                // 생성 모드
                homeworkData.createdAt = serverTimestamp();
                await addDoc(collection(db, 'homeworks'), homeworkData);
                showToast("새로운 숙제가 출제되었습니다.", false);
            }
            this.closeHomeworkModal();
            await this.populateHomeworkSelect();
            this.elements.homeworkSelect.value = this.state.editingHomeworkId || '';
        } catch (error) {
            console.error("숙제 저장/수정 실패: ", error);
            showToast("숙제 처리에 실패했습니다.");
        }
    },
    async populateHomeworkSelect() {
        this.elements.homeworkSelect.innerHTML = '<option value="">-- 숙제 선택 --</option>';
        this.elements.homeworkContent.style.display = 'none';
        this.elements.homeworkManagementButtons.style.display = 'none';
        const q = query(collection(db, 'homeworks'), where('classId', '==', this.state.selectedClassId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        snapshot.forEach(doc => {
            const hw = doc.data();
            const displayDate = hw.dueDate || '기한없음';
            this.elements.homeworkSelect.innerHTML += `<option value="${doc.id}">[${displayDate}] ${hw.textbookName}</option>`;
        });
    },
    handleHomeworkSelection(homeworkId) {
        this.state.selectedHomeworkId = homeworkId;
        if (this.unsubscribe) this.unsubscribe();
        
        if (!homeworkId) {
            this.elements.homeworkContent.style.display = 'none';
            this.elements.homeworkManagementButtons.style.display = 'none';
            return;
        }
        
        this.elements.homeworkContent.style.display = 'block';
        this.elements.homeworkManagementButtons.style.display = 'flex';
        
        const hwText = this.elements.homeworkSelect.options[this.elements.homeworkSelect.selectedIndex].text;
        this.elements.selectedHomeworkTitle.textContent = `'${hwText}' 숙제 제출 현황`;
        this.renderTableHeader(this.elements.homeworkTableBody, ['학생 이름', '제출 상태', '제출 시간', '관리']);
        
        const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef), (snapshot) => this.renderHomeworkSubmissions(snapshot));
    },
    async deleteHomework() {
        if (!this.state.selectedHomeworkId) return;

        if (confirm("정말로 이 숙제를 삭제하시겠습니까? 학생들의 제출 기록도 모두 사라집니다.")) {
            try {
                await deleteDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
                showToast("숙제가 삭제되었습니다.", false);
                this.state.selectedHomeworkId = null;
                this.populateHomeworkSelect();
            } catch (error) {
                console.error("숙제 삭제 실패:", error);
                showToast("숙제 삭제에 실패했습니다.");
            }
        }
    },
    async renderHomeworkSubmissions(snapshot) {
        const tbody = this.elements.homeworkTableBody;
        tbody.innerHTML = '';
        const homeworkDoc = await getDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
        const textbookName = homeworkDoc.data()?.textbookName || '';
        this.state.studentsInClass.forEach((name, id) => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';
            const submissionDoc = snapshot.docs.find(doc => doc.id === id);
            const submissionData = submissionDoc?.data();
            const isSubmitted = submissionData !== undefined;
            const submittedAtRaw = submissionData?.submittedAt;
            const submittedAt = (submittedAtRaw && typeof submittedAtRaw.toDate === 'function') ? submittedAtRaw.toDate().toLocaleString() : '미제출';
            const statusClass = isSubmitted ? 'text-green-600 font-semibold' : 'text-slate-400';
            row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${name}</td><td class="px-6 py-4 ${statusClass}">${isSubmitted ? '제출 완료' : '미제출'}</td><td class="px-6 py-4">${submittedAt}</td><td class="px-6 py-4">${isSubmitted ? `<button data-student-id="${id}" data-textbook-name="${textbookName}" class="download-btn text-xs bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg">전체 다운로드</button>` : ''}</td>`;
            tbody.appendChild(row);
        });
        tbody.querySelectorAll('.download-btn').forEach(btn => btn.addEventListener('click', (e) => this.downloadHomework(e.target.dataset.studentId, e.target.dataset.textbookName)));
    },
    async downloadHomework(studentId, textbookName) {
        showToast("다운로드를 시작합니다...", false);
        const submissionDoc = await getDoc(doc(db, 'homeworks', this.state.selectedHomeworkId, 'submissions', studentId));
        if (!submissionDoc.exists()) { showToast("제출 정보를 찾을 수 없습니다."); return; }
        const data = submissionDoc.data();
        const studentName = data.studentName;
        const date = new Date(data.submittedAt.toMillis()).toISOString().split('T')[0];
        for (let i = 0; i < data.imageUrls.length; i++) {
            const url = data.imageUrls[i];
            const fileName = `${date}_${this.state.selectedClassName}_${studentName}_${textbookName}_${i+1}.jpg`;
            try {
                const response = await fetch(url);
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob); link.download = fileName;
                link.click(); URL.revokeObjectURL(link.href);
            } catch (error) { showToast(`${fileName} 다운로드에 실패했습니다.`); }
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

export default TeacherApp;