// src/teacher/homeworkDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const homeworkDashboard = {
    unsubscribe: null,

    init(state, elements) {
        this.state = state;
        this.elements = elements;

        // 숙제 현황 대시보드 관련 이벤트 리스너 설정
        this.elements.assignHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(false));
        this.elements.closeHomeworkModalBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.elements.cancelHomeworkBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.elements.saveHomeworkBtn?.addEventListener('click', () => this.saveHomework());
        this.elements.homeworkSelect?.addEventListener('change', (e) => this.handleHomeworkSelection(e.target.value));
        this.elements.homeworkSubjectSelect?.addEventListener('change', (e) => this.populateTextbooksForHomework(e.target.value));
        this.elements.editHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(true));
        this.elements.deleteHomeworkBtn?.addEventListener('click', () => this.deleteHomework());
    },

    // 새 숙제 출제 또는 기존 숙제 수정을 위한 모달 열기
    async openHomeworkModal(isEditing = false) {
        this.state.editingHomeworkId = isEditing ? this.state.selectedHomeworkId : null;
        
        this.elements.homeworkModalTitle.textContent = isEditing ? '숙제 정보 수정' : '새 숙제 출제';
        this.elements.saveHomeworkBtn.textContent = isEditing ? '수정하기' : '출제하기';

        const subjectSelect = this.elements.homeworkSubjectSelect;
        const pagesInput = document.getElementById('teacher-homework-pages');
        
        subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.elements.homeworkTextbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
        this.elements.homeworkTextbookSelect.disabled = true;
        this.elements.homeworkDueDateInput.value = '';
        if(pagesInput) pagesInput.value = '';

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
                if(pagesInput) pagesInput.value = hwData.pages || '';
            }
        }

        this.elements.assignHomeworkModal.style.display = 'flex';
    },

    // 숙제 모달의 교재 선택 목록 채우기
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

    // 새 숙제 저장 또는 기존 숙제 업데이트
    async saveHomework() {
        const subjectId = this.elements.homeworkSubjectSelect.value;
        const textbookSelect = this.elements.homeworkTextbookSelect;
        const textbookId = textbookSelect.value;
        const textbookName = textbookSelect.options[textbookSelect.selectedIndex].text;
        const dueDate = this.elements.homeworkDueDateInput.value;
        const pages = document.getElementById('teacher-homework-pages').value;

        if (!subjectId || !textbookId || !dueDate || !pages) { showToast("과목, 교재, 제출 기한, 총 페이지 수를 모두 입력해주세요."); return; }
        if (parseInt(pages, 10) <= 0) { showToast("페이지 수는 1 이상의 숫자를 입력해주세요."); return; }

        const homeworkData = {
            classId: this.state.selectedClassId,
            subjectId,
            textbookId,
            textbookName,
            dueDate,
            pages: parseInt(pages, 10),
        };

        try {
            if (this.state.editingHomeworkId) {
                const homeworkRef = doc(db, 'homeworks', this.state.editingHomeworkId);
                await updateDoc(homeworkRef, homeworkData);
                showToast("숙제 정보를 성공적으로 수정했습니다.", false);
            } else {
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

    // 숙제 선택 드롭다운 목록 채우기
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
            this.elements.homeworkSelect.innerHTML += `<option value="${doc.id}">[${displayDate}] ${hw.textbookName} (${hw.pages}p)</option>`;
        });
    },

    // 선택된 숙제의 제출 현황 보여주기
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

    // 숙제 제출 현황 테이블 렌더링
    async renderHomeworkSubmissions(snapshot) {
        const tbody = this.elements.homeworkTableBody;
        tbody.innerHTML = '';
        const homeworkDoc = await getDoc(doc(db, 'homeworks', this.state.selectedHomeworkId));
        const homeworkData = homeworkDoc.data();
        const textbookName = homeworkData?.textbookName || '';
        const totalPages = homeworkData?.pages || 0;
        
        this.state.studentsInClass.forEach((name, id) => {
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';
            const submissionDoc = snapshot.docs.find(doc => doc.id === id);
            
            if (submissionDoc) {
                const submissionData = submissionDoc.data();
                const submittedAtRaw = submissionData.submittedAt;
                const submittedAt = (submittedAtRaw && typeof submittedAtRaw.toDate === 'function') ? submittedAtRaw.toDate().toLocaleString() : '정보 없음';
                const submittedPages = submissionData.imageUrls?.length || 0;
                const isComplete = submittedPages >= totalPages;
                const statusClass = isComplete ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold';
                const statusText = isComplete ? `제출 완료 (${submittedPages}/${totalPages}p)` : `제출 중 (${submittedPages}/${totalPages}p)`;

                row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${name}</td><td class="px-6 py-4 ${statusClass}">${statusText}</td><td class="px-6 py-4">${submittedAt}</td><td class="px-6 py-4"></td>`;
                
                const downloadBtn = document.createElement('button');
                downloadBtn.className = 'download-btn text-xs bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg';
                downloadBtn.textContent = '전체 다운로드';
                downloadBtn.addEventListener('click', () => this.downloadHomework(submissionData, textbookName));
                row.cells[3].appendChild(downloadBtn);
            } else {
                const statusClass = 'text-slate-400';
                row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${name}</td><td class="px-6 py-4 ${statusClass}">미제출 (0/${totalPages}p)</td><td class="px-6 py-4">미제출</td><td class="px-6 py-4"></td>`;
            }
            tbody.appendChild(row);
        });
    },

    // 학생 숙제 이미지 다운로드
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
            const fileName = `${date}_${this.state.selectedClassName}_${studentName}_${textbookName}_${i+1}.jpg`;
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