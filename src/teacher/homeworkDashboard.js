// src/teacher/homeworkDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc } from "firebase/firestore";
import { app, db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

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
        
        // 🚨 수정: null 체크 적용
        if (subjectSelect) subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (this.app.elements.homeworkTextbookSelect) this.app.elements.homeworkTextbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
        if (this.app.elements.homeworkTextbookSelect) this.app.elements.homeworkTextbookSelect.disabled = true;
        if (this.app.elements.homeworkDueDateInput) this.app.elements.homeworkDueDateInput.value = '';
        if(pagesInput) pagesInput.value = '';

        if (!this.app.state.selectedClassData || !this.app.state.selectedClassData.subjects) {
            if (this.app.elements.assignHomeworkModal) this.app.elements.assignHomeworkModal.style.display = 'flex';
            return;
        }

        const subjectIds = Object.keys(this.app.state.selectedClassData.subjects);
        if (subjectIds.length === 0) {
            if (this.app.elements.assignHomeworkModal) this.app.elements.assignHomeworkModal.style.display = 'flex';
            return;
        }

        subjectIds.forEach(id => {
            const subject = this.app.state.subjects.find(s => s.id === id);
            if (subject && subjectSelect) {
                 subjectSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
            }
        });

        if (isEditing && this.app.state.editingHomeworkId) {
            const homeworkDoc = await getDoc(doc(db, 'homeworks', this.app.state.editingHomeworkId));
            if (homeworkDoc.exists()) {
                const hwData = homeworkDoc.data();
                if (subjectSelect) subjectSelect.value = hwData.subjectId;
                await this.populateTextbooksForHomework(hwData.subjectId);
                if (this.app.elements.homeworkTextbookSelect) this.app.elements.homeworkTextbookSelect.value = hwData.textbookId;
                if (this.app.elements.homeworkDueDateInput) this.app.elements.homeworkDueDateInput.value = hwData.dueDate;
                if(pagesInput) pagesInput.value = hwData.pages || '';
            }
        }

        if (this.app.elements.assignHomeworkModal) this.app.elements.assignHomeworkModal.style.display = 'flex';
    },

    async populateTextbooksForHomework(subjectId) {
        const textbookSelect = this.app.elements.homeworkTextbookSelect;
        if (!textbookSelect) return; // 🚨 null 체크 추가
        
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
        if (this.app.elements.assignHomeworkModal) this.app.elements.assignHomeworkModal.style.display = 'none'; // 🚨 null 체크 적용
        this.app.state.editingHomeworkId = null;
    },

    async saveHomework() {
        const subjectId = this.app.elements.homeworkSubjectSelect?.value; // 🚨 null 체크 적용
        const textbookSelect = this.app.elements.homeworkTextbookSelect;
        const textbookId = textbookSelect?.value; // 🚨 null 체크 적용
        const textbookName = textbookSelect?.options[textbookSelect.selectedIndex]?.text; // 🚨 null 체크 적용
        const dueDate = this.app.elements.homeworkDueDateInput?.value; // 🚨 null 체크 적용
        const pagesInput = document.getElementById('teacher-homework-pages');
        const pages = pagesInput?.value; // 🚨 null 체크 적용

        if (!subjectId || !textbookId || !dueDate || !pages) { showToast("과목, 교재, 제출 기한, 총 페이지 수를 모두 입력해주세요."); return; }
        if (parseInt(pages, 10) <= 0 || isNaN(parseInt(pages, 10))) { showToast("페이지 수는 1 이상의 숫자를 입력해주세요."); return; } // 🚨 유효성 검사 강화

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
            // 🚨 null 체크 적용
            if (this.app.elements.homeworkSelect) this.app.elements.homeworkSelect.value = this.app.state.editingHomeworkId || '';
        } catch (error) {
            console.error("숙제 저장/수정 실패: ", error);
            showToast("숙제 처리에 실패했습니다.");
        }
    },

    async populateHomeworkSelect() {
        // 🚨 null 체크 적용
        if (this.app.elements.homeworkSelect) this.app.elements.homeworkSelect.innerHTML = '<option value="">-- 숙제 선택 --</option>';
        if (this.app.elements.homeworkContent) this.app.elements.homeworkContent.style.display = 'none';
        if (this.app.elements.homeworkManagementButtons) this.app.elements.homeworkManagementButtons.style.display = 'none';

        if (!this.app.state.selectedClassId) return; // 반이 선택되지 않았으면 로드 중단

        const q = query(collection(db, 'homeworks'), where('classId', '==', this.app.state.selectedClassId), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        if (snapshot.empty) return;
        
        snapshot.forEach(doc => {
            const hw = doc.data();
            const displayDate = hw.dueDate || '기한없음';
            const pagesText = hw.pages ? `(${hw.pages}p)` : '';
            // 🚨 null 체크 적용
            if (this.app.elements.homeworkSelect) this.app.elements.homeworkSelect.innerHTML += `<option value="${doc.id}">[${displayDate}] ${hw.textbookName} ${pagesText}</option>`;
        });
    },

    handleHomeworkSelection(homeworkId) {
        this.app.state.selectedHomeworkId = homeworkId;
        if (this.unsubscribe) this.unsubscribe();
        
        // 🚨 null 체크 적용
        if (!homeworkId) {
            if (this.app.elements.homeworkContent) this.app.elements.homeworkContent.style.display = 'none';
            if (this.app.elements.homeworkManagementButtons) this.app.elements.homeworkManagementButtons.style.display = 'none';
            return;
        }
        
        // 🚨 null 체크 적용
        if (this.app.elements.homeworkContent) this.app.elements.homeworkContent.style.display = 'block';
        if (this.app.elements.homeworkManagementButtons) this.app.elements.homeworkManagementButtons.style.display = 'flex';
        
        const hwText = this.app.elements.homeworkSelect.options[this.app.elements.homeworkSelect.selectedIndex].text;
        
        if (this.app.elements.selectedHomeworkTitle) this.app.elements.selectedHomeworkTitle.innerHTML = `'${hwText}' 숙제 제출 현황`; // 🚨 null 체크 적용

        // 🚨 null 체크 적용
        if (this.app.elements.homeworkTableBody) this.renderTableHeader(this.app.elements.homeworkTableBody, ['학생 이름', '제출 상태', '제출 시간', '관리']);
        
        const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef), (snapshot) => this.renderHomeworkSubmissions(snapshot));
    },

    async deleteHomework() {
        if (!this.app.state.selectedHomeworkId) return;

        if (confirm("정말로 이 숙제를 삭제하시겠습니까? 학생들의 제출 기록도 모두 사라집니다.")) {
            try {
                await deleteDoc(doc(db, 'homeworks', this.app.state.selectedHomeworkId));
                showToast("숙제가 삭제되었습니다.", false);
                this.app.state.selectedHomeworkId = null;
                await this.populateHomeworkSelect(); // 🚨 await 추가
            } catch (error) {
                console.error("숙제 삭제 실패:", error);
                showToast("숙제 삭제에 실패했습니다.");
            }
        }
    },

    async renderHomeworkSubmissions(snapshot) {
        const tbody = this.app.elements.homeworkTableBody;
        if (!tbody) return; // 🚨 null 체크 추가
        
        tbody.innerHTML = '';
    
        if (this.app.state.studentsInClass.size === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 등록된 학생이 없습니다. [관리자] 메뉴에서 학생을 반에 배정해주세요.</td></tr>';
            return;
        }
    
        const homeworkDoc = await getDoc(doc(db, 'homeworks', this.app.state.selectedHomeworkId));
        const homeworkData = homeworkDoc.exists() ? homeworkDoc.data() : {};
        const textbookName = homeworkData.textbookName || '';
        const totalPages = homeworkData.pages;
    
        let submittedCount = 0;
        snapshot.docs.forEach(doc => {
            if (this.app.state.studentsInClass.has(doc.id)) {
                submittedCount++;
            }
        });

        this.app.state.studentsInClass.forEach((name, id) => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';
    
            const submissionDoc = snapshot.docs.find(doc => doc.id === id);
    
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
    
                actionHtml = `<td class="px-6 py-4"><button class="download-btn text-xs bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg">전체 다운로드</button></td>`;
    
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
            }
        });
    },

    async downloadHomework(submissionData, textbookName) {
        if (!submissionData || !submissionData.imageUrls || submissionData.imageUrls.length === 0) {
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
        if (!table) return; // 🚨 null 체크 추가
        
        table.querySelector('thead')?.remove();
        const thead = document.createElement('thead');
        thead.className = 'text-xs text-gray-700 uppercase bg-gray-50';
        let headerHtml = '<tr>';
        headers.forEach(h => headerHtml += `<th scope="col" class="px-6 py-3">${h}</th>`);
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;
        table.insertBefore(thead, tbody);
    },
};