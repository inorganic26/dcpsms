// src/teacher/classEditor.js

import { doc, getDocs, collection, updateDoc, addDoc, serverTimestamp, deleteDoc, query, writeBatch, where, onSnapshot } from "firebase/firestore"; // onSnapshot 추가
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const classEditor = {
    selectedSubjectIdForTextbookMgmt: null,
    unsubscribeTextbooks: null,
    app: null, // TeacherApp 인스턴스 참조를 저장할 속성

    init(app) {
        this.app = app; // TeacherApp 인스턴스 저장

        // 요소 존재 여부 확인 후 리스너 추가 (Optional Chaining 사용)
        this.app.elements.editClassBtn?.addEventListener('click', () => this.openEditClassModal());
        this.app.elements.closeEditClassModalBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.cancelEditClassBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.saveClassEditBtn?.addEventListener('click', () => this.saveClassChanges());

        this.app.elements.manageSubjectsTextbooksBtn?.addEventListener('click', () => this.openSubjectTextbookMgmtModal());
        document.getElementById('teacher-close-subject-textbook-modal-btn')?.addEventListener('click', () => this.closeSubjectTextbookMgmtModal());
        document.getElementById('teacher-close-subject-textbook-modal-btn-footer')?.addEventListener('click', () => this.closeSubjectTextbookMgmtModal());
        document.getElementById('teacher-add-subject-btn')?.addEventListener('click', () => this.addNewSubject());
        document.getElementById('teacher-subject-select-for-textbook-mgmt')?.addEventListener('change', (e) => this.handleSubjectSelectForTextbookMgmt(e.target.value));
        document.getElementById('teacher-add-textbook-btn')?.addEventListener('click', () => this.addNewTextbook());

        // 이벤트 위임 (삭제 버튼)
        document.getElementById('teacher-subjects-list-mgmt')?.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-subject-btn') && e.target.dataset.id) {
                this.deleteSubject(e.target.dataset.id);
            }
        });
        document.getElementById('teacher-textbooks-list-mgmt')?.addEventListener('click', (e) => {
             if (e.target.classList.contains('delete-textbook-btn') && e.target.dataset.subjectId && e.target.dataset.id) {
                this.deleteTextbook(e.target.dataset.subjectId, e.target.dataset.id);
            }
        });

        // 초기화 시 필수 모달 요소 존재 확인 (디버깅용)
        if (!this.app.elements.editClassModal) console.warn("[ClassEditor Init] Critical element #teacher-edit-class-modal not found in cache!");
    },

    async openEditClassModal() {
        // 앱 참조 및 상태 확인
        if (!this.app || !this.app.state || !this.app.elements) {
            console.error("[ClassEditor] TeacherApp reference (this.app) is missing!");
            showToast("오류: 앱 초기화 실패.", true);
            return;
        }

        const classData = this.app.state.selectedClassData;
        if (!classData) {
            showToast("수정할 반 정보가 없습니다. 반을 먼저 선택해주세요.");
            return;
        }
        this.app.state.editingClass = classData;

        // 필수 모달 요소 가져오기 (캐시 우선, 없으면 직접 탐색)
        const editClassName = this.app.elements.editClassName || document.getElementById('teacher-edit-class-name');
        const editClassSubjectsContainer = this.app.elements.editClassSubjectsContainer || document.getElementById('teacher-edit-class-subjects-and-textbooks');
        const editClassModal = this.app.elements.editClassModal || document.getElementById('teacher-edit-class-modal');
        const editClassTypeSelect = this.app.elements.editClassTypeSelect || document.getElementById('teacher-edit-class-type');

        // 요소 존재 여부 최종 확인
        let missingElement = false;
        if (!editClassName) { console.error("FATAL: Element #teacher-edit-class-name not found."); missingElement = true; }
        if (!editClassSubjectsContainer) { console.error("FATAL: Element #teacher-edit-class-subjects-and-textbooks not found."); missingElement = true; }
        if (!editClassModal) { console.error("FATAL: Element #teacher-edit-class-modal not found."); missingElement = true; }
        if (!editClassTypeSelect) { console.error("FATAL: Element #teacher-edit-class-type not found."); missingElement = true; }

        if (missingElement) {
            showToast("반 설정 수정 화면의 필수 구성 요소를 찾을 수 없습니다.", true);
            return; // 필수 요소 없으면 실행 중단
        }

        // --- 요소가 모두 확인되었으므로 모달 내용 채우기 및 표시 ---
        try {
            editClassName.textContent = classData.name;
            editClassTypeSelect.value = classData.classType || 'self-directed';
            editClassSubjectsContainer.innerHTML = '과목 및 교재 정보 불러오는 중...';

            editClassModal.style.display = 'flex'; // 모달 표시
            document.body.classList.add('modal-open'); // 스크롤 잠금

            // --- 과목 및 교재 정보 로드 및 렌더링 ---
            const currentSubjects = classData.subjects || {};
            let allTextbooksBySubject = {}; // { subjectId: [{id, name}, ...] }

            // 앱 상태의 과목 정보 사용 (teacherApp에서 미리 로드)
            const allSubjects = this.app.state.subjects;
            if (!Array.isArray(allSubjects) || allSubjects.length === 0) {
                 // 과목 정보가 아직 로드되지 않았거나 없는 경우
                 editClassSubjectsContainer.innerHTML = '<p class="text-orange-500">과목 정보 로딩 중... 잠시 후 다시 시도해주세요.</p>';
                 // 여기서 모달을 닫거나 사용자에게 알림을 줄 수 있습니다.
                 // throw new Error("과목 정보가 로드되지 않았습니다."); // 에러 발생시켜 catch 블록으로 이동시킬 수도 있음
                 return; // 일단 함수 종료
            }

            // 각 과목의 교재 정보 가져오기 (Firestore 호출)
            const textbookPromises = allSubjects.map(subject =>
               getDocs(collection(db, `subjects/${subject.id}/textbooks`))
            );
            const textbookSnapshots = await Promise.all(textbookPromises);

            // 가져온 교재 정보를 구조화하고 앱 상태 캐시에 저장
            allSubjects.forEach((subject, index) => {
                const textbooks = textbookSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
                allTextbooksBySubject[subject.id] = textbooks;
                // teacherApp 상태의 교재 캐시 업데이트
                this.app.state.textbooksBySubject[subject.id] = textbooks;
            });

            // --- 과목/교재 선택 UI 렌더링 ---
            editClassSubjectsContainer.innerHTML = ''; // 로딩 메시지 제거
            allSubjects.forEach(subject => {
                const isSubjectSelected = currentSubjects.hasOwnProperty(subject.id);
                const subjectData = currentSubjects[subject.id];
                // 교재 ID 배열 안전하게 확인
                const selectedTextbookIds = (isSubjectSelected && subjectData && Array.isArray(subjectData.textbooks)) ? subjectData.textbooks : [];
                const selectedTextbooksSet = new Set(selectedTextbookIds);

                const subjectGroup = document.createElement('div');
                subjectGroup.className = 'p-3 border rounded-lg';
                let textbookHtml = '<div class="pl-6 mt-2 space-y-1">';
                const textbooksForThisSubject = allTextbooksBySubject[subject.id] || [];

                if(textbooksForThisSubject.length > 0) {
                    // 이름순으로 교재 정렬
                    textbooksForThisSubject.sort((a, b) => a.name.localeCompare(b.name));
                    textbooksForThisSubject.forEach(textbook => {
                        textbookHtml += `
                            <div>
                                <input type="checkbox" id="teacher-textbook-${textbook.id}" data-subject-id="${subject.id}" data-textbook-id="${textbook.id}" class="textbook-checkbox" ${selectedTextbooksSet.has(textbook.id) ? 'checked' : ''}>
                                <label for="teacher-textbook-${textbook.id}" class="ml-2 text-sm">${textbook.name}</label>
                            </div>`;
                    });
                     textbookHtml += '</div>';
                } else {
                     textbookHtml = '<p class="pl-6 mt-2 text-sm text-slate-400">등록된 교재 없음</p>';
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

        } catch(error) {
            console.error("Error opening or rendering edit class modal:", error);
            showToast("반 설정 화면을 여는 중 오류가 발생했습니다: " + error.message, true);
            // 오류 발생 시 모달 닫기 시도
            if(editClassModal) editClassModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    },

    closeEditClassModal() {
        this.app.state.editingClass = null;
        const modal = this.app.elements.editClassModal || document.getElementById('teacher-edit-class-modal'); // 직접 찾기 추가
        if(modal) {
           modal.style.display = 'none';
        } else {
           console.warn("Attempted to close editClassModal, but element not found.");
        }
        document.body.classList.remove('modal-open');
    },

    async saveClassChanges() {
        if (!this.app || !this.app.state || !this.app.state.editingClass) {
             showToast("수정할 반 정보가 없습니다.");
             return;
        }
        const classId = this.app.state.editingClass.id;
        const newSubjectsData = {};
        const classTypeSelect = this.app.elements.editClassTypeSelect || document.getElementById('teacher-edit-class-type'); // 직접 찾기 추가

        if(!classTypeSelect) {
             console.error("Element #teacher-edit-class-type not found for saving.");
             showToast("반 유형 설정을 저장할 수 없습니다.", true);
             return;
        }
        const newClassType = classTypeSelect.value;

        // 모달 요소 직접 찾기 (안정성)
        const modal = this.app.elements.editClassModal || document.getElementById('teacher-edit-class-modal');
        if (!modal) {
            console.error("Edit class modal not found for collecting data.");
            showToast("데이터 수집 중 오류 발생.", true);
            return;
        }

        const subjectCheckboxes = modal.querySelectorAll('.subject-checkbox:checked');
        subjectCheckboxes.forEach(subjectCheckbox => {
            const subjectId = subjectCheckbox.dataset.subjectId;
            const textbookCheckboxes = modal.querySelectorAll(`.textbook-checkbox[data-subject-id="${subjectId}"]:checked`);
            const selectedTextbookIds = Array.from(textbookCheckboxes).map(tb => tb.dataset.textbookId);
            newSubjectsData[subjectId] = { textbooks: selectedTextbookIds };
        });

        console.log("Saving class changes:", { classId, newClassType, newSubjectsData }); // 저장 데이터 확인

        try {
            await updateDoc(doc(db, 'classes', classId), {
                 subjects: newSubjectsData,
                 classType: newClassType
            });
            showToast("반 정보가 성공적으로 수정되었습니다.", false);
            this.closeEditClassModal();
            // 반 데이터 다시 로드 및 상태 업데이트 (teacherApp에서 처리)
            await this.app.fetchClassData(classId); // fetchClassData 호출 확인
            // 업데이트된 정보를 반 설정 뷰에 즉시 반영 (teacherApp에서 처리)
            this.app.displayCurrentClassInfo(); // displayCurrentClassInfo 호출 확인
             // 메뉴 갱신
             this.app.showDashboardMenu(); // 현강반 메뉴 표시 여부 업데이트
        } catch (error) {
            console.error("반 정보 수정 실패:", error);
            showToast(`반 정보 수정에 실패했습니다: ${error.message}`, true);
        }
    },

    // --- (과목/교재 관리 모달 함수들 - 이전 답변과 동일하게 유지) ---
    openSubjectTextbookMgmtModal() {
        const modal = document.getElementById('teacher-subject-textbook-mgmt-modal');
        if (!modal) return;
        if (this.app.state.isSubjectsLoading) { showToast("과목 정보 로딩 중..."); return; }
        if (!Array.isArray(this.app.state.subjects)) { showToast("과목 정보 오류.", true); return; }
        modal.style.display = 'flex';
        document.body.classList.add('modal-open');
        this.renderSubjectListForMgmt();
        this.populateSubjectSelectForTextbookMgmt();
        this.handleSubjectSelectForTextbookMgmt(this.selectedSubjectIdForTextbookMgmt);
        const newSubjectInput = document.getElementById('teacher-new-subject-name'); if (newSubjectInput) newSubjectInput.value = '';
        const newTextbookInput = document.getElementById('teacher-new-textbook-name'); if (newTextbookInput) newTextbookInput.value = '';
    },
    closeSubjectTextbookMgmtModal() {
        const modal = document.getElementById('teacher-subject-textbook-mgmt-modal'); if (modal) modal.style.display = 'none';
        document.body.classList.remove('modal-open');
        this.selectedSubjectIdForTextbookMgmt = null;
        if (this.unsubscribeTextbooks) { this.unsubscribeTextbooks(); this.unsubscribeTextbooks = null; }
    },
    async addNewSubject() {
        const inputEl = document.getElementById('teacher-new-subject-name'); if (!inputEl) return;
        const subjectName = inputEl.value.trim(); if (!subjectName) { showToast("과목 이름을 입력해주세요."); return; }
        try { await addDoc(collection(db, 'subjects'), { name: subjectName, createdAt: serverTimestamp() }); showToast("새 과목 추가 완료.", false); inputEl.value = ''; }
        catch (error) { console.error("과목 추가 실패:", error); showToast("과목 추가 실패."); }
    },
    async deleteSubject(subjectId) {
        if (!subjectId) return; const subjectToDelete = this.app.state.subjects.find(s => s.id === subjectId); if (!subjectToDelete) return;
        if (!confirm(`'${subjectToDelete.name}' 과목을 정말 삭제하시겠습니까? 관련 데이터(학습, 교재, 반 설정)가 모두 삭제됩니다.`)) return;
        try {
            const batch = writeBatch(db);
            const lessonsRef = collection(db, 'subjects', subjectId, 'lessons'); const lessonsSnapshot = await getDocs(lessonsRef); lessonsSnapshot.forEach(doc => batch.delete(doc.ref));
            const textbooksRef = collection(db, 'subjects', subjectId, 'textbooks'); const textbooksSnapshot = await getDocs(textbooksRef); textbooksSnapshot.forEach(doc => batch.delete(doc.ref));
            const classesQuery = query(collection(db, 'classes')); const classesSnapshot = await getDocs(classesQuery);
            classesSnapshot.forEach(classDoc => {
                const classData = classDoc.data(); if (classData.subjects && classData.subjects[subjectId]) { const updatedSubjects = { ...classData.subjects }; delete updatedSubjects[subjectId]; batch.update(classDoc.ref, { subjects: updatedSubjects }); }
            });
            const subjectRef = doc(db, 'subjects', subjectId); batch.delete(subjectRef);
            await batch.commit(); showToast("과목과 관련 데이터 삭제 완료.", false);
        } catch (error) { console.error("과목 삭제 실패:", error); showToast("과목 삭제 실패."); }
    },
    renderSubjectListForMgmt() {
        const listEl = document.getElementById('teacher-subjects-list-mgmt'); if (!listEl) return; listEl.innerHTML = '';
        const subjects = this.app.state.subjects; if (!Array.isArray(subjects) || subjects.length === 0) { listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 과목 없음.</p>'; return; }
        subjects.forEach(sub => {
            const div = document.createElement('div'); div.className = "p-2 border rounded-md flex items-center justify-between bg-white";
            div.innerHTML = `<span class="font-medium text-slate-700 text-sm">${sub.name}</span> <button data-id="${sub.id}" class="delete-subject-btn text-red-500 hover:text-red-700 text-xs font-semibold">삭제</button>`; listEl.appendChild(div);
        });
    },
    populateSubjectSelectForTextbookMgmt() {
        const select = document.getElementById('teacher-subject-select-for-textbook-mgmt'); if (!select) return;
        const currentSelection = this.selectedSubjectIdForTextbookMgmt || select.value; select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        const subjects = this.app.state.subjects; if (!Array.isArray(subjects) || subjects.length === 0) { select.disabled = true; this.handleSubjectSelectForTextbookMgmt(''); return; }
        select.disabled = false; subjects.forEach(sub => { select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`; });
        if (subjects.some(s => s.id === currentSelection)) { select.value = currentSelection; this.handleSubjectSelectForTextbookMgmt(currentSelection); }
        else { select.value = ''; this.handleSubjectSelectForTextbookMgmt(''); }
    },
    handleSubjectSelectForTextbookMgmt(subjectId) {
        this.selectedSubjectIdForTextbookMgmt = subjectId;
        const textbookContent = document.getElementById('teacher-textbook-management-content'); const textbookList = document.getElementById('teacher-textbooks-list-mgmt'); const newTextbookInput = document.getElementById('teacher-new-textbook-name');
        if (this.unsubscribeTextbooks) { this.unsubscribeTextbooks(); this.unsubscribeTextbooks = null; }
        if (subjectId) { if (textbookContent) textbookContent.style.display = 'block'; if (newTextbookInput) newTextbookInput.value = ''; this.listenForTextbooks(subjectId); }
        else { if (textbookContent) textbookContent.style.display = 'none'; if (textbookList) textbookList.innerHTML = '<p class="text-sm text-slate-400">과목 선택 필요.</p>'; }
    },
    listenForTextbooks(subjectId) {
        if (!subjectId) return; const listEl = document.getElementById('teacher-textbooks-list-mgmt'); if (listEl) listEl.innerHTML = '<div class="loader-small mx-auto"></div>';
        const q = query(collection(db, `subjects/${subjectId}/textbooks`));
        this.unsubscribeTextbooks = onSnapshot(q, (snapshot) => {
            const textbooks = []; snapshot.forEach(doc => textbooks.push({ id: doc.id, ...doc.data() })); textbooks.sort((a,b)=> a.name.localeCompare(b.name)); this.renderTextbookListForMgmt(textbooks, subjectId);
        }, (error) => { console.error("교재 목록 로딩 실패:", error); if(listEl) listEl.innerHTML = '<p class="text-red-500">교재 목록 로딩 실패</p>'; });
    },
    renderTextbookListForMgmt(textbooks, subjectId) {
        const listEl = document.getElementById('teacher-textbooks-list-mgmt'); if (!listEl) return; listEl.innerHTML = '';
        if (textbooks.length === 0) { listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교재 없음.</p>'; return; }
        textbooks.forEach(book => {
            const div = document.createElement('div'); div.className = "p-2 border rounded-md flex items-center justify-between bg-white";
            div.innerHTML = `<span class="font-medium text-slate-700 text-sm">${book.name}</span> <button data-id="${book.id}" data-subject-id="${subjectId}" class="delete-textbook-btn text-red-500 hover:text-red-700 text-xs font-semibold">삭제</button>`; listEl.appendChild(div);
        });
    },
    async addNewTextbook() {
        const inputEl = document.getElementById('teacher-new-textbook-name'); if (!inputEl) return; const subjectId = this.selectedSubjectIdForTextbookMgmt; const textbookName = inputEl.value.trim();
        if (!subjectId) { showToast("과목 선택 필요."); return; } if (!textbookName) { showToast("교재 이름 입력 필요."); return; }
        try { await addDoc(collection(db, `subjects/${subjectId}/textbooks`), { name: textbookName }); showToast("새 교재 추가 완료.", false); inputEl.value = ''; }
        catch (error) { console.error("교재 추가 실패:", error); showToast("교재 추가 실패."); }
    },
    async deleteTextbook(subjectId, textbookId) {
        if (!subjectId || !textbookId) return; if (!confirm(`정말로 이 교재를 삭제하시겠습니까?`)) return;
        try {
            await deleteDoc(doc(db, `subjects/${subjectId}/textbooks`, textbookId)); const classesQuery = query(collection(db, 'classes')); const classesSnapshot = await getDocs(classesQuery); const batch = writeBatch(db);
            classesSnapshot.forEach(classDoc => {
                const d = classDoc.data(); if (d.subjects && d.subjects[subjectId]?.textbooks?.includes(textbookId)) {
                    const updatedTBs = d.subjects[subjectId].textbooks.filter(id => id !== textbookId); const updatedSub = { ...d.subjects[subjectId], textbooks: updatedTBs }; const updatedClsSubs = { ...d.subjects, [subjectId]: updatedSub }; batch.update(classDoc.ref, { subjects: updatedClsSubs });
                }
            }); await batch.commit(); showToast("교재 삭제 및 반 설정 업데이트 완료.", false);
        } catch (error) { console.error("교재 삭제 실패:", error); showToast("교재 삭제 실패."); }
    },

}; // classEditor 객체 끝