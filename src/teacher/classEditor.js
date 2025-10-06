// src/teacher/classEditor.js

import { doc, getDocs, collection, updateDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// 이 파일은 src/admin/classManager.js 에서 반 수정 관련 기능만 가져왔습니다.
export const classEditor = {
    init(app) {
        this.app = app;
        this.app.elements.editClassBtn?.addEventListener('click', () => this.openEditClassModal());
        this.app.elements.closeEditClassModalBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.cancelEditClassBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.saveClassEditBtn?.addEventListener('click', () => this.saveClassChanges());
    },

    async openEditClassModal() {
        const classData = this.app.state.selectedClassData;
        if (!classData) return;

        this.app.state.editingClass = classData;
        this.app.elements.editClassName.textContent = classData.name;

        const container = document.getElementById('teacher-edit-class-subjects-and-textbooks');
        container.innerHTML = '불러오는 중...';
        this.app.elements.editClassModal.style.display = 'flex';

        const currentSubjects = classData.subjects || {};

        const textbookPromises = this.app.state.subjects.map(subject => 
            getDocs(collection(db, `subjects/${subject.id}/textbooks`))
        );
        const textbookSnapshots = await Promise.all(textbookPromises);

        const allTextbooksBySubject = {};
        this.app.state.subjects.forEach((subject, index) => {
            allTextbooksBySubject[subject.id] = textbookSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });

        container.innerHTML = '';
        this.app.state.subjects.forEach(subject => {
            const isSubjectSelected = currentSubjects.hasOwnProperty(subject.id);
            const selectedTextbooks = isSubjectSelected ? new Set(currentSubjects[subject.id].textbooks) : new Set();
            const subjectGroup = document.createElement('div');
            subjectGroup.className = 'p-3 border rounded-lg';
            let textbookHtml = '<div class="pl-6 mt-2 space-y-1">';
            allTextbooksBySubject[subject.id].forEach(textbook => {
                textbookHtml += `
                    <div>
                        <input type="checkbox" id="teacher-textbook-${textbook.id}" data-subject-id="${subject.id}" data-textbook-id="${textbook.id}" class="textbook-checkbox" ${selectedTextbooks.has(textbook.id) ? 'checked' : ''}>
                        <label for="teacher-textbook-${textbook.id}" class="ml-2 text-sm">${textbook.name}</label>
                    </div>`;
            });
            textbookHtml += '</div>';
            subjectGroup.innerHTML = `
                <div class="font-semibold">
                    <input type="checkbox" id="teacher-subject-${subject.id}" data-subject-id="${subject.id}" class="subject-checkbox" ${isSubjectSelected ? 'checked' : ''}>
                    <label for="teacher-subject-${subject.id}" class="ml-2">${subject.name}</label>
                </div>
                ${allTextbooksBySubject[subject.id].length > 0 ? textbookHtml : ''}
            `;
            container.appendChild(subjectGroup);
        });
    },

    closeEditClassModal() {
        this.app.state.editingClass = null;
        this.app.elements.editClassModal.style.display = 'none';
    },

    async saveClassChanges() {
        if (!this.app.state.editingClass) return;
        const classId = this.app.state.editingClass.id;
        const newSubjectsData = {};

        const subjectCheckboxes = document.querySelectorAll('#teacher-edit-class-modal .subject-checkbox:checked');
        subjectCheckboxes.forEach(subjectCheckbox => {
            const subjectId = subjectCheckbox.dataset.subjectId;
            const textbookCheckboxes = document.querySelectorAll(`#teacher-edit-class-modal .textbook-checkbox[data-subject-id="${subjectId}"]:checked`);
            const selectedTextbookIds = Array.from(textbookCheckboxes).map(tb => tb.dataset.textbookId);
            newSubjectsData[subjectId] = { textbooks: selectedTextbookIds };
        });

        try {
            await updateDoc(doc(db, 'classes', classId), { subjects: newSubjectsData });
            showToast("반 정보가 성공적으로 수정되었습니다.", false);
            this.closeEditClassModal();
            // 변경된 데이터를 다시 불러오기
            await this.app.fetchClassData(classId);
        } catch (error) {
            console.error("반 정보 수정 실패:", error);
            showToast("반 정보 수정에 실패했습니다.");
        }
    },
};