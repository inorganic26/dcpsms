// src/shared/classEditor.js
import { doc, getDocs, collection, updateDoc } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

/**
 * 반 설정 편집기 공통 로직을 생성하는 팩토리 함수
 * @param {object} config - { app, elements }
 * app: AdminApp 또는 TeacherApp 인스턴스 (state.subjects, state.classes 등 참조)
 * elements: 각 앱의 HTML 요소 ID 맵
 */
export function createClassEditor(config) {
    const { app, elements } = config;

    const manager = {
        // --- 모달 열기 ---
        async openEditClassModal() {
            const classData = app.state.editingClass; // 호출 측(admin/teacher)에서 app.state.editingClass를 설정해야 함
            if (!classData) {
                showToast("수정할 반 정보가 없습니다.");
                return;
            }

            // 모달 요소 가져오기
            const modal = document.getElementById(elements.editClassModal);
            const classNameEl = document.getElementById(elements.editClassName);
            const classTypeSelect = document.getElementById(elements.editClassTypeSelect);
            const subjectsContainer = document.getElementById(elements.editClassSubjectsContainer);

            if (!modal || !classNameEl || !classTypeSelect || !subjectsContainer) {
                console.error("[Shared ClassEditor] 필수 모달 요소를 찾을 수 없습니다.", elements);
                showToast("반 설정 화면을 여는 데 필요한 구성 요소가 부족합니다.", true);
                return;
            }

            // 모달 내용 채우기
            classNameEl.textContent = classData.name;
            classTypeSelect.value = classData.classType || 'self-directed';
            subjectsContainer.innerHTML = '과목 및 교재 정보 불러오는 중...';

            // 모달 표시
            modal.style.display = 'flex';
            document.body.classList.add('modal-open');

            // 과목 및 교재 정보 로드 및 렌더링
            try {
                await this.renderSubjectsForEditing(classData, subjectsContainer);
            } catch (error) {
                console.error("[Shared ClassEditor] Error rendering subjects:", error);
                subjectsContainer.innerHTML = '<p class="text-red-500">과목/교재 정보 로딩 실패</p>';
            }
        },

        // --- 모달 닫기 ---
        closeEditClassModal() {
            app.state.editingClass = null; // 수정 상태 해제
            const modal = document.getElementById(elements.editClassModal);
            if (modal) modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        },

        // --- 과목/교재 목록 렌더링 (모달 내부용) ---
        async renderSubjectsForEditing(classData, container) {
            if (!app.state.subjects) {
                 container.innerHTML = '<p class="text-red-500">공통 과목 정보를 불러올 수 없습니다.</p>';
                 return;
            }

            const currentSubjects = classData.subjects || {};
            let allTextbooksBySubject = app.state.textbooksBySubject || {}; // 캐시된 교재 정보 활용 (TeacherApp)

            // 교재 정보가 캐시되지 않았거나 부족한 경우 Firestore에서 로드
            const subjectsToFetch = app.state.subjects.filter(s => !allTextbooksBySubject[s.id]);
            if (subjectsToFetch.length > 0) {
                 console.log(`[Shared ClassEditor] Fetching textbooks for ${subjectsToFetch.length} subjects...`);
                 const textbookPromises = subjectsToFetch.map(subject =>
                    getDocs(collection(db, `subjects/${subject.id}/textbooks`))
                 );
                 const textbookSnapshots = await Promise.all(textbookPromises);
                 subjectsToFetch.forEach((subject, index) => {
                     allTextbooksBySubject[subject.id] = textbookSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
                 });
                 // 앱 공통 상태에도 캐시 (선택적, TeacherApp은 이미 하고 있음)
                 app.state.textbooksBySubject = allTextbooksBySubject;
            }


            container.innerHTML = ''; // 로딩 메시지 제거
            if (app.state.subjects.length === 0) {
                container.innerHTML = '<p class="text-sm text-slate-400">등록된 공통 과목이 없습니다.</p>';
                return;
            }

            app.state.subjects.forEach(subject => {
                const isSubjectSelected = currentSubjects.hasOwnProperty(subject.id);
                const subjectData = currentSubjects[subject.id];
                const selectedTextbookIds = (isSubjectSelected && subjectData && Array.isArray(subjectData.textbooks)) ? subjectData.textbooks : [];
                const selectedTextbooksSet = new Set(selectedTextbookIds);

                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'p-3 border rounded-lg';
                let textbookHtml = '<div class="pl-6 mt-2 space-y-1">';
                const textbooksForThisSubject = allTextbooksBySubject[subject.id] || [];

                if(textbooksForThisSubject.length > 0) {
                    textbooksForThisSubject.sort((a, b) => a.name.localeCompare(b.name));
                    textbooksForThisSubject.forEach(textbook => {
                        // 고유 ID 생성을 위해 element config ID를 접두사로 사용 (admin/teacher 구분)
                        const textbookId = `${elements.editClassModal}-textbook-${textbook.id}`;
                        textbookHtml += `
                            <div>
                                <input type="checkbox" id="${textbookId}" data-subject-id="${subject.id}" data-textbook-id="${textbook.id}" class="textbook-checkbox" ${selectedTextbooksSet.has(textbook.id) ? 'checked' : ''}>
                                <label for="${textbookId}" class="ml-2 text-sm">${textbook.name}</label>
                            </div>`;
                    });
                     textbookHtml += '</div>';
                } else {
                     textbookHtml = '<p class="pl-6 mt-2 text-sm text-slate-400">등록된 교재 없음</p>';
                }

                const subjectId = `${elements.editClassModal}-subject-${subject.id}`;
                subjectGroup.innerHTML = `
                    <div class="font-semibold">
                        <input type="checkbox" id="${subjectId}" data-subject-id="${subject.id}" class="subject-checkbox" ${isSubjectSelected ? 'checked' : ''}>
                        <label for="${subjectId}" class="ml-2">${subject.name}</label>
                    </div>
                    ${textbookHtml}
                `;
                container.appendChild(subjectGroup);
            });
        },

        // --- 변경사항 저장 (과목, 교재, 유형만) ---
        async saveClassChanges() {
            if (!app.state.editingClass) {
                 showToast("수정할 반 정보가 없습니다.");
                 return false;
            }
            const classId = app.state.editingClass.id;
            const newSubjectsData = {};

            const modal = document.getElementById(elements.editClassModal);
            const classTypeSelect = document.getElementById(elements.editClassTypeSelect);

            if(!modal || !classTypeSelect) {
                console.error("[Shared ClassEditor] Save failed: Modal or ClassTypeSelect element not found.");
                showToast("저장 실패: 필수 요소를 찾을 수 없습니다.", true);
                return false;
            }

            const newClassType = classTypeSelect.value;

            // 모달 내에서 체크된 과목/교재 정보 수집
            const subjectCheckboxes = modal.querySelectorAll('.subject-checkbox:checked');
            subjectCheckboxes.forEach(subjectCheckbox => {
                const subjectId = subjectCheckbox.dataset.subjectId;
                const textbookCheckboxes = modal.querySelectorAll(`.textbook-checkbox[data-subject-id="${subjectId}"]:checked`);
                const selectedTextbookIds = Array.from(textbookCheckboxes).map(tb => tb.dataset.textbookId);
                newSubjectsData[subjectId] = { textbooks: selectedTextbookIds };
            });

            console.log("[Shared ClassEditor] Saving class changes:", { classId, newClassType, newSubjectsData });

            try {
                await updateDoc(doc(db, 'classes', classId), {
                    subjects: newSubjectsData,
                    classType: newClassType
                });
                showToast("반 정보(과목/교재/유형)가 성공적으로 수정되었습니다.", false);
                this.closeEditClassModal();
                return true; // 성공 반환
            } catch (error) {
                console.error("[Shared ClassEditor] 반 정보 수정 실패:", error);
                showToast(`반 정보 수정에 실패했습니다: ${error.message}`, true);
                return false; // 실패 반환
            }
        },

        // --- 초기화 (이벤트 리스너 연결) ---
        init() {
            document.getElementById(elements.closeEditClassModalBtn)?.addEventListener('click', () => this.closeEditClassModal());
            document.getElementById(elements.cancelEditClassBtn)?.addEventListener('click', () => this.closeEditClassModal());
            
            // saveClassChanges는 async이므로, 호출 측(admin/teacher)에서 await으로 처리
            // document.getElementById(elements.saveClassEditBtn)?.addEventListener('click', () => this.saveClassChanges());
            // -> 저장 버튼 리스너는 각 앱(admin/teacher)에서 직접 연결하여 후속 처리를 하도록 변경
        }
    };

    manager.init(); // 공통 이벤트 리스너(닫기, 취소) 초기화
    return manager;
}