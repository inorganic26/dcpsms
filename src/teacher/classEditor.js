// src/teacher/classEditor.js

import { doc, getDocs, collection, updateDoc } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const classEditor = {
    init(app) {
        this.app = app;
        // Optional chaining 추가
        this.app.elements.editClassBtn?.addEventListener('click', () => this.openEditClassModal());
        this.app.elements.closeEditClassModalBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.cancelEditClassBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.saveClassEditBtn?.addEventListener('click', () => this.saveClassChanges());
    },

    async openEditClassModal() {
        const classData = this.app.state.selectedClassData;
        if (!classData) {
            showToast("수정할 반 정보가 없습니다. 반을 선택해주세요."); // 사용자 피드백 추가
            return;
        }

        this.app.state.editingClass = classData; // editingClass 설정 추가

        // ✅ 필수 요소 확인 추가
        const { editClassName, editClassSubjectsContainer, editClassModal, editClassTypeSelect } = this.app.elements;
        if (!editClassName || !editClassSubjectsContainer || !editClassModal || !editClassTypeSelect) {
            console.error("반 설정 모달의 필수 요소를 찾을 수 없습니다.");
            showToast("반 설정 화면을 여는 데 문제가 발생했습니다.");
            return;
        }

        editClassName.textContent = classData.name;
        // ✅ 반 유형 설정
        editClassTypeSelect.value = classData.classType || 'self-directed';

        editClassSubjectsContainer.innerHTML = '과목 및 교재 정보 불러오는 중...';
        editClassModal.style.display = 'flex';
        document.body.classList.add('modal-open'); // 스크롤 방지

        // 과목 및 교재 렌더링 (기존 로직과 유사)
        const currentSubjects = classData.subjects || {};
        let allTextbooksBySubject = {};

        try {
             // Firestore에서 모든 공통 과목 정보 가져오기 (state.subjects 사용)
             const allSubjects = this.app.state.subjects;

             // 각 공통 과목에 대한 교재 정보 가져오기
            const textbookPromises = allSubjects.map(subject =>
                getDocs(collection(db, `subjects/${subject.id}/textbooks`))
            );
            const textbookSnapshots = await Promise.all(textbookPromises);

            allSubjects.forEach((subject, index) => {
                allTextbooksBySubject[subject.id] = textbookSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
            });

        } catch(error) {
            console.error("과목 또는 교재 정보 로딩 실패:", error);
            editClassSubjectsContainer.innerHTML = '<p class="text-red-500">과목/교재 정보를 불러오는 데 실패했습니다.</p>';
            return;
        }


        // UI 렌더링
        editClassSubjectsContainer.innerHTML = '';
        this.app.state.subjects.forEach(subject => { // app.state.subjects 사용
            const isSubjectSelected = currentSubjects.hasOwnProperty(subject.id);
            const selectedTextbooks = isSubjectSelected ? new Set(currentSubjects[subject.id].textbooks) : new Set();
            const subjectGroup = document.createElement('div');
            subjectGroup.className = 'p-3 border rounded-lg';
            let textbookHtml = '<div class="pl-6 mt-2 space-y-1">';

            // 해당 과목의 교재가 있을 경우에만 교재 목록 생성
            if(allTextbooksBySubject[subject.id] && allTextbooksBySubject[subject.id].length > 0) {
                allTextbooksBySubject[subject.id].forEach(textbook => {
                    textbookHtml += `
                        <div>
                            <input type="checkbox" id="teacher-textbook-${textbook.id}" data-subject-id="${subject.id}" data-textbook-id="${textbook.id}" class="textbook-checkbox" ${selectedTextbooks.has(textbook.id) ? 'checked' : ''}>
                            <label for="teacher-textbook-${textbook.id}" class="ml-2 text-sm">${textbook.name}</label>
                        </div>`;
                });
                 textbookHtml += '</div>';
            } else {
                 textbookHtml = '<p class="pl-6 mt-2 text-sm text-slate-400">등록된 교재 없음</p>'; // 교재 없을 때 메시지
            }


            subjectGroup.innerHTML = `
                <div class="font-semibold">
                    <input type="checkbox" id="teacher-subject-${subject.id}" data-subject-id="${subject.id}" class="subject-checkbox" ${isSubjectSelected ? 'checked' : ''}>
                    <label for="teacher-subject-${subject.id}" class="ml-2">${subject.name}</label>
                </div>
                ${textbookHtml}
            `;
            editClassSubjectsContainer.appendChild(subjectGroup);
        });
    },

    closeEditClassModal() {
        this.app.state.editingClass = null;
        if(this.app.elements.editClassModal) { // null 체크 추가
           this.app.elements.editClassModal.style.display = 'none';
        }
        document.body.classList.remove('modal-open'); // 스크롤 잠금 해제
    },

    async saveClassChanges() {
        if (!this.app.state.editingClass) {
             showToast("수정할 반 정보가 없습니다.");
             return;
        }
        const classId = this.app.state.editingClass.id;
        const newSubjectsData = {};
        const classTypeSelect = this.app.elements.editClassTypeSelect; // ✅ 반 유형 select 요소 가져오기

        if(!classTypeSelect) {
             console.error("반 유형 선택 요소를 찾을 수 없습니다.");
             return;
        }
        const newClassType = classTypeSelect.value; // ✅ 선택된 반 유형 값 가져오기


        // 과목 및 교재 데이터 수집 (기존 로직 유지)
        const subjectCheckboxes = document.querySelectorAll('#teacher-edit-class-modal .subject-checkbox:checked');
        subjectCheckboxes.forEach(subjectCheckbox => {
            const subjectId = subjectCheckbox.dataset.subjectId;
            const textbookCheckboxes = document.querySelectorAll(`#teacher-edit-class-modal .textbook-checkbox[data-subject-id="${subjectId}"]:checked`);
            const selectedTextbookIds = Array.from(textbookCheckboxes).map(tb => tb.dataset.textbookId);
            newSubjectsData[subjectId] = { textbooks: selectedTextbookIds };
        });

        try {
            // ✅ 업데이트 데이터에 classType 추가
            await updateDoc(doc(db, 'classes', classId), {
                 subjects: newSubjectsData,
                 classType: newClassType // ✅ 저장할 데이터에 추가
            });
            showToast("반 정보(과목/교재/유형)가 성공적으로 수정되었습니다.", false);
            this.closeEditClassModal();
            // ✅ 변경된 데이터를 다시 불러오도록 app에 요청
            await this.app.fetchClassData(classId);
             this.app.showDashboardMenu(); // ✅ 메뉴 갱신 (수업 영상 버튼 표시 여부)
        } catch (error) {
            console.error("반 정보 수정 실패:", error);
            showToast("반 정보 수정에 실패했습니다.");
        }
    },
};