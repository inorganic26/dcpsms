// src/shared/homeworkManager.js
import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

// 설정 객체를 받아 homeworkManager 인스턴스를 생성하는 팩토리 함수
export function createHomeworkManager(config) {
    const { app, elements } = config; // app: AdminApp 또는 TeacherApp 인스턴스, elements: 해당 앱의 요소 ID 맵

    const homeworkManager = {
        unsubscribe: null,
        isStudentsLoadedListenerAdded: false, // 학생 로딩 리스너 상태 (admin 전용)

        init() {
            // config.elements를 사용하여 이벤트 리스너 연결
            document.getElementById(elements.assignHomeworkBtn)?.addEventListener('click', () => this.openHomeworkModal(false));
            document.getElementById(elements.closeHomeworkModalBtn)?.addEventListener('click', () => this.closeHomeworkModal());
            document.getElementById(elements.cancelHomeworkBtn)?.addEventListener('click', () => this.closeHomeworkModal());
            document.getElementById(elements.saveHomeworkBtn)?.addEventListener('click', () => this.saveHomework());
            document.getElementById(elements.homeworkClassSelect)?.addEventListener('change', (e) => this.handleClassSelection(e)); // 관리자용
            document.getElementById(elements.homeworkSelect)?.addEventListener('change', (e) => this.handleHomeworkSelection(e.target.value));
            document.getElementById(elements.homeworkSubjectSelect)?.addEventListener('change', (e) => this.populateTextbooksForHomework(e.target.value));
            document.getElementById(elements.editHomeworkBtn)?.addEventListener('click', () => this.openHomeworkModal(true));
            document.getElementById(elements.deleteHomeworkBtn)?.addEventListener('click', () => this.deleteHomework());

            // 관리자 앱인 경우에만 studentsLoaded 이벤트 리스너 추가
            if (elements.homeworkClassSelect && !this.isStudentsLoadedListenerAdded) {
                document.addEventListener('studentsLoaded', () => {
                    console.log("[Shared Homework] Received 'studentsLoaded' event.");
                    // 관리자 앱 상태 확인 (selectedClassIdForHomework)
                    if (app.state.selectedClassIdForHomework && app.state.studentsInClass.size === 0) {
                        console.log("[Shared Homework] Attempting to filter students again after studentsLoaded event.");
                        this.filterAndDisplayStudents(app.state.selectedClassIdForHomework);
                        // 숙제가 선택된 상태였다면 제출 현황 다시 렌더링
                        if (app.state.selectedHomeworkId && this.unsubscribe) {
                             console.log("[Shared Homework] Refreshing submissions rendering after students loaded.");
                             const homeworkId = app.state.selectedHomeworkId;
                             const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
                             this.unsubscribe(); // 기존 리스너 해제
                             this.unsubscribe = onSnapshot(query(submissionsRef),
                                (snapshot) => this.renderHomeworkSubmissions(snapshot),
                                (error) => { console.error("Error re-listening:", error)}
                             );
                        }
                    }
                });
                this.isStudentsLoadedListenerAdded = true;
            }
        },

        // --- 관리자 전용 함수 ---
        initView() { // 관리자 앱에서만 호출
            // ... (내용 변경 없음) ...
            if (!elements.homeworkClassSelect) return;
            this.populateClassSelect();
            app.state.selectedHomeworkId = null;

            const classSelect = document.getElementById(elements.homeworkClassSelect);
            if (classSelect && app.state.classes?.length > 0) {
                const firstClassId = app.state.classes[0].id;
                if (firstClassId) {
                    console.log(`[Shared Homework] Automatically selecting first class: ${firstClassId}`);
                    classSelect.value = firstClassId;
                    this.handleClassSelection({ target: classSelect });
                } else {
                    app.state.selectedClassIdForHomework = null;
                    app.state.studentsInClass.clear();
                    this.resetUIState();
                }
            } else {
                app.state.selectedClassIdForHomework = null;
                app.state.studentsInClass.clear();
                this.resetUIState();
            }
            console.log("[Shared Homework] Admin View Initialized.");
        },

        populateClassSelect() { // 관리자 앱에서만 호출
            // ... (내용 변경 없음) ...
            const select = document.getElementById(elements.homeworkClassSelect);
            if (!select) return;
            select.innerHTML = '<option value="">-- 반 로딩 중... --</option>';
            select.disabled = true;
            if (!app.state.classes || app.state.classes.length === 0) {
                select.innerHTML = '<option value="">-- 등록된 반 없음 --</option>'; return;
            }
            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            select.disabled = false;
            app.state.classes.forEach(cls => {
                select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
            });
            console.log("[Shared Homework] Admin Class select populated.");
        },

        handleClassSelection(event) { // 관리자 앱에서만 호출
            // ... (내용 변경 없음) ...
             const selectElement = event.target;
             const newClassId = selectElement.value;
             console.log(`[Shared Homework] Admin Class selected: ${newClassId || 'None'}`);
             app.state.selectedClassIdForHomework = newClassId; // 관리자 상태 업데이트
             app.state.selectedHomeworkId = null;
             app.state.studentsInClass.clear();

             const mainContent = document.getElementById(elements.homeworkMainContent);
             const hwSelect = document.getElementById(elements.homeworkSelect);
             const tableBody = document.getElementById(elements.homeworkTableBody);
             const assignBtn = document.getElementById(elements.assignHomeworkBtn);

             if (mainContent) mainContent.style.display = 'none';
             if (hwSelect) { hwSelect.innerHTML = '<option value="">-- 반 선택 필요 --</option>'; hwSelect.disabled = true; }
             if (tableBody) tableBody.innerHTML = '';
             if (assignBtn) assignBtn.disabled = true;
             this.handleHomeworkSelection('');

             if (!newClassId) return;

             if (mainContent) mainContent.style.display = 'block';
             if (assignBtn) assignBtn.disabled = false;
             if (hwSelect) { hwSelect.innerHTML = '<option value="">-- 숙제 로딩 중... --</option>'; hwSelect.disabled = true; }
             if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="loader-small mx-auto"></div> 학생 목록 확인 중...</td></tr>';

             this.filterAndDisplayStudents(newClassId);
             this.populateHomeworkSelect();
        },

        filterAndDisplayStudents(classId) { // 관리자 앱에서만 호출
            // ... (내용 변경 없음) ...
            const tableBody = document.getElementById(elements.homeworkTableBody);
            const allStudents = app.state.students;

            if (!allStudents || allStudents.length === 0) {
                console.warn("[Shared Homework] (filter) 전체 학생 목록이 아직 준비되지 않았습니다.");
                if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-orange-500">전체 학생 목록 로딩 중...</td></tr>';
                return;
            }

            app.state.studentsInClass.clear();
            allStudents.forEach(student => {
                if (student && student.classId === classId) {
                    app.state.studentsInClass.set(student.id, student.name); // 관리자 상태 업데이트 (key: studentDocId)
                }
            });
            console.log(`[Shared Homework] (filter) Filtered students for class ${classId}. Count: ${app.state.studentsInClass.size}`);

            if (tableBody) {
                if (app.state.studentsInClass.size === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다.</td></tr>';
                } else if (!app.state.selectedHomeworkId) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>';
                }
                // 숙제가 선택된 경우, renderHomeworkSubmissions에서 학생 목록을 다시 그립니다.
            }
        },
        // --- 공통 함수 ---
        resetUIState() {
            // ... (내용 변경 없음) ...
            const mainContent = document.getElementById(elements.homeworkMainContent);
            const hwSelect = document.getElementById(elements.homeworkSelect);
            const tableBody = document.getElementById(elements.homeworkTableBody);
            const mgmtButtons = document.getElementById(elements.homeworkManagementButtons);
            const hwContent = document.getElementById(elements.homeworkContent);
            const assignBtn = document.getElementById(elements.assignHomeworkBtn);

            if (mainContent) mainContent.style.display = 'none';
            if (hwSelect) { hwSelect.innerHTML = '<option value="">-- 반 선택 필요 --</option>'; hwSelect.disabled = true; }
            if (tableBody) tableBody.innerHTML = '';
            if (mgmtButtons) mgmtButtons.style.display = 'none';
            if (hwContent) hwContent.style.display = 'none';
            if (assignBtn) assignBtn.disabled = true;
        },

        async openHomeworkModal(isEditing = false) {
            // ... (내용 변경 없음) ...
            const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
            if (!classId) { showToast("숙제를 출제/수정할 반을 먼저 선택해주세요."); return; }
            app.state.editingHomeworkId = isEditing ? app.state.selectedHomeworkId : null;

            const modal = document.getElementById(elements.assignHomeworkModal);
            const title = document.getElementById(elements.homeworkModalTitle);
            const saveBtn = document.getElementById(elements.saveHomeworkBtn);
            const subjectSelect = document.getElementById(elements.homeworkSubjectSelect);
            const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
            const dueDateInput = document.getElementById(elements.homeworkDueDateInput);
            const pagesInput = document.getElementById(elements.homeworkPagesInput);

            if (!modal || !title || !saveBtn || !subjectSelect || !textbookSelect || !dueDateInput || !pagesInput) { console.error("[Shared Homework] Modal elements not found."); return; }

            title.textContent = isEditing ? '숙제 정보 수정' : '새 숙제 출제';
            saveBtn.textContent = isEditing ? '수정하기' : '출제하기';

            subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
            textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
            textbookSelect.disabled = true;
            dueDateInput.value = ''; pagesInput.value = '';

            const selectedClassData = elements.homeworkClassSelect ? app.state.classes.find(c => c.id === classId) : app.state.selectedClassData;
            if (!selectedClassData || !selectedClassData.subjects) { showToast("선택된 반의 과목 정보를 불러올 수 없습니다."); modal.style.display = 'flex'; return; }
            const subjectIds = Object.keys(selectedClassData.subjects);
            if (subjectIds.length === 0) { showToast("선택된 반에 지정된 과목이 없습니다."); subjectSelect.innerHTML = '<option value="">반에 지정된 과목 없음</option>'; subjectSelect.disabled = true; modal.style.display = 'flex'; return; }

            subjectSelect.disabled = false;
            subjectIds.forEach(id => { const subject = app.state.subjects.find(s => s.id === id); if (subject) subjectSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`; });

            if (isEditing && app.state.editingHomeworkId) {
                saveBtn.disabled = true;
                try {
                    const homeworkDoc = await getDoc(doc(db, 'homeworks', app.state.editingHomeworkId));
                    if (homeworkDoc.exists()) {
                        const hwData = homeworkDoc.data();
                        if (Array.from(subjectSelect.options).some(opt => opt.value === hwData.subjectId)) {
                            subjectSelect.value = hwData.subjectId; await this.populateTextbooksForHomework(hwData.subjectId);
                            if (Array.from(textbookSelect.options).some(opt => opt.value === hwData.textbookId)) { textbookSelect.value = hwData.textbookId; }
                            else { textbookSelect.value = ''; textbookSelect.disabled = true; }
                        } else { subjectSelect.value = ''; textbookSelect.value = ''; textbookSelect.disabled = true; }
                        dueDateInput.value = hwData.dueDate || ''; pagesInput.value = hwData.pages || '';
                    } else { this.closeHomeworkModal(); showToast("수정할 숙제 정보를 찾지 못했습니다."); return; }
                } catch (error) { showToast("숙제 정보 로드 중 오류."); this.closeHomeworkModal(); return; }
                finally { saveBtn.disabled = false; }
            }
            modal.style.display = 'flex';
        },

        async populateTextbooksForHomework(subjectId) {
            // ... (내용 변경 없음) ...
            const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
            if (!textbookSelect) return;
            textbookSelect.innerHTML = '<option value="">-- 교재 로딩 중... --</option>';
            textbookSelect.disabled = true;
            if (!subjectId) { textbookSelect.innerHTML = '<option value="">-- 과목 선택 필요 --</option>'; return; }

            const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
            const selectedClassData = elements.homeworkClassSelect ? app.state.classes.find(c => c.id === classId) : app.state.selectedClassData;
            const textbookIds = selectedClassData?.subjects?.[subjectId]?.textbooks;
            if (!textbookIds || textbookIds.length === 0) { textbookSelect.innerHTML = '<option value="">반에 지정된 교재 없음</option>'; return; }

            try {
                let textbooks = app.state.textbooksBySubject?.[subjectId];
                if (!textbooks) {
                    console.log(`[Shared Homework] Fetching textbooks for subject ${subjectId} from Firestore.`);
                    const textbookDocs = await Promise.all( textbookIds.map(id => getDoc(doc(db, `subjects/${subjectId}/textbooks`, id))) );
                    textbooks = textbookDocs.filter(d => d.exists()).map(d => ({ id: d.id, ...d.data() }));
                    if (!app.state.textbooksBySubject) app.state.textbooksBySubject = {};
                    app.state.textbooksBySubject[subjectId] = textbooks;
                } else { console.log(`[Shared Homework] Using cached textbooks for subject ${subjectId}.`); }

                textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
                let foundTextbooks = false;
                 textbooks.forEach(textbookData => {
                    if (textbookIds.includes(textbookData.id)) {
                        textbookSelect.innerHTML += `<option value="${textbookData.id}">${textbookData.name}</option>`;
                        foundTextbooks = true;
                    }
                });
                if (!foundTextbooks) textbookSelect.innerHTML = '<option value="">지정된 교재 없음</option>';
                else textbookSelect.disabled = false;
            } catch (error) { console.error("Error populating textbooks:", error); textbookSelect.innerHTML = '<option value="">-- 로드 실패 --</option>'; }
        },

        closeHomeworkModal() {
            // ... (내용 변경 없음) ...
            const modal = document.getElementById(elements.assignHomeworkModal);
            if (modal) modal.style.display = 'none';
            app.state.editingHomeworkId = null;
        },

        async saveHomework() {
            // ... (내용 변경 없음) ...
            const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
            const subjectId = document.getElementById(elements.homeworkSubjectSelect)?.value;
            const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
            const textbookId = textbookSelect?.value;
            const textbookName = textbookSelect?.options[textbookSelect.selectedIndex]?.text;
            const dueDate = document.getElementById(elements.homeworkDueDateInput)?.value;
            const pagesInput = document.getElementById(elements.homeworkPagesInput);
            const pages = pagesInput?.value;
            const saveBtn = document.getElementById(elements.saveHomeworkBtn);

            if (!classId) { showToast("숙제를 출제할 반을 선택해주세요."); return; }
            if (!subjectId || !textbookId || !dueDate || !pages) { showToast("과목, 교재, 제출 기한, 총 페이지 수를 모두 입력해주세요."); return; }
            const pagesInt = parseInt(pages, 10);
            if (isNaN(pagesInt) || pagesInt <= 0) { showToast("페이지 수는 1 이상의 숫자를 입력해주세요."); return; }
            if (saveBtn) saveBtn.disabled = true;

            const homeworkData = { classId, subjectId, textbookId, textbookName, dueDate, pages: pagesInt };

            try {
                let homeworkRef;
                if (app.state.editingHomeworkId) {
                    homeworkRef = doc(db, 'homeworks', app.state.editingHomeworkId);
                    await updateDoc(homeworkRef, homeworkData);
                    showToast("숙제 정보 수정 완료.", false);
                } else {
                    homeworkData.createdAt = serverTimestamp();
                    const addedDocRef = await addDoc(collection(db, 'homeworks'), homeworkData);
                    homeworkRef = addedDocRef;
                    showToast("새 숙제 출제 완료.", false);
                }
                this.closeHomeworkModal();
                await this.populateHomeworkSelect();

                const hwSelect = document.getElementById(elements.homeworkSelect);
                if (homeworkRef?.id && hwSelect) {
                    hwSelect.value = homeworkRef.id;
                    this.handleHomeworkSelection(homeworkRef.id);
                }
            } catch (error) { console.error("숙제 저장/수정 실패: ", error); showToast("숙제 처리 실패."); }
            finally { if (saveBtn) saveBtn.disabled = false; }
        },

        async populateHomeworkSelect() {
            // ... (내용 변경 없음) ...
            const select = document.getElementById(elements.homeworkSelect);
            if (!select) return;
            select.innerHTML = '<option value="">-- 로딩 중... --</option>';
            select.disabled = true;
            const hwContent = document.getElementById(elements.homeworkContent);
            const mgmtButtons = document.getElementById(elements.homeworkManagementButtons);
            const tableBody = document.getElementById(elements.homeworkTableBody);
            if(hwContent) hwContent.style.display = 'none';
            if(mgmtButtons) mgmtButtons.style.display = 'none';
            if(tableBody) tableBody.innerHTML = '';

            const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
            if (!classId) { select.innerHTML = '<option value="">-- 반 선택 필요 --</option>'; return; }

            try {
                const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
                const snapshot = await getDocs(q);
                select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
                if (snapshot.empty) {
                     select.innerHTML += '<option value="" disabled>출제된 숙제 없음</option>';
                     if (tableBody) {
                         const studentMap = app.state.studentsInClass;
                         if (studentMap && studentMap.size > 0) { tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">출제된 숙제가 없습니다.</td></tr>'; }
                         // else: 학생 로딩 메시지는 filterAndDisplayStudents에서 처리
                     }
                } else {
                    snapshot.forEach(doc => { const hw = doc.data(); const displayDate = hw.dueDate || '기한없음'; const pagesText = hw.pages ? `(${hw.pages}p)` : ''; select.innerHTML += `<option value="${doc.id}">[${displayDate}] ${hw.textbookName} ${pagesText}</option>`; });
                }
            } catch (error) { console.error("Error populating homework select:", error); select.innerHTML = '<option value="">-- 로드 실패 --</option>'; if(tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">숙제 목록 로딩 실패</td></tr>'; }
            finally { select.disabled = false; }
        },

        handleHomeworkSelection(homeworkId) {
            // ... (내용 변경 없음) ...
            console.log(`[Shared Homework] Homework selected: ${homeworkId || 'None'}`);
            app.state.selectedHomeworkId = homeworkId;
            if (this.unsubscribe) { this.unsubscribe(); this.unsubscribe = null; }

            const hwContent = document.getElementById(elements.homeworkContent);
            const mgmtButtons = document.getElementById(elements.homeworkManagementButtons);
            const tableBody = document.getElementById(elements.homeworkTableBody);
            const selectedTitle = document.getElementById(elements.selectedHomeworkTitle);
            const selectElement = document.getElementById(elements.homeworkSelect);

            if (!homeworkId) {
                if (hwContent) hwContent.style.display = 'none';
                if (mgmtButtons) mgmtButtons.style.display = 'none';
                if (tableBody) {
                     const studentMap = app.state.studentsInClass;
                    if (elements.homeworkClassSelect) { this.filterAndDisplayStudents(app.state.selectedClassIdForHomework); }
                    else if (studentMap && studentMap.size > 0) { tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>'; }
                    else if (app.state.selectedClassId) { tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다.</td></tr>'; }
                    else { tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">반을 선택해주세요.</td></tr>'; }
                }
                if (selectedTitle) selectedTitle.textContent = '';
                return;
            }

            if (hwContent) hwContent.style.display = 'block';
            if (mgmtButtons) mgmtButtons.style.display = 'flex';
            const selectedOptionText = selectElement?.options[selectElement.selectedIndex]?.text || '선택된 숙제';
            if (selectedTitle) selectedTitle.textContent = `'${selectedOptionText}' 숙제 제출 현황`;
            if (tableBody) this.renderTableHeader(tableBody, ['학생 이름', '제출 상태', '제출 시간', '관리']);
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="loader-small mx-auto"></div> 제출 현황 로딩 중...</td></tr>';

            const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
            this.unsubscribe = onSnapshot(query(submissionsRef),
                (snapshot) => this.renderHomeworkSubmissions(snapshot),
                (error) => { console.error("Error listening to submissions:", error); if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">제출 현황 로딩 실패</td></tr>'; }
            );
        },

        async deleteHomework() {
            // ... (내용 변경 없음) ...
             if (!app.state.selectedHomeworkId) return;
             const homeworkIdToDelete = app.state.selectedHomeworkId;
             const selectElement = document.getElementById(elements.homeworkSelect);
             const hwText = selectElement ? selectElement.options[selectElement.selectedIndex]?.text : `ID: ${homeworkIdToDelete}`;
             if (confirm(`'${hwText}' 숙제를 정말 삭제하시겠습니까? 학생들의 제출 기록도 모두 사라집니다.`)) {
                 const deleteBtn = document.getElementById(elements.deleteHomeworkBtn); if (deleteBtn) deleteBtn.disabled = true;
                 try {
                     const submissionsRef = collection(db, 'homeworks', homeworkIdToDelete, 'submissions');
                     const submissionsSnapshot = await getDocs(submissionsRef); const batch = writeBatch(db);
                     if (!submissionsSnapshot.empty) submissionsSnapshot.forEach(doc => batch.delete(doc.ref));
                     batch.delete(doc(db, 'homeworks', homeworkIdToDelete)); await batch.commit();
                     showToast("숙제 삭제 완료.", false); app.state.selectedHomeworkId = null;
                     await this.populateHomeworkSelect();
                 } catch (error) { console.error("숙제 삭제 실패:", error); showToast("숙제 삭제 실패."); }
                 finally { if (deleteBtn) deleteBtn.disabled = false; }
             }
        },

        async renderHomeworkSubmissions(snapshot) {
            const tableBody = document.getElementById(elements.homeworkTableBody); if (!tableBody) return; tableBody.innerHTML = '';
            // 👇 수정: studentsMap의 key는 studentDocId (Firestore 문서 ID)
            const studentsMap = app.state.studentsInClass; // 관리자/교사 앱 모두 이 상태 사용 (key: studentDocId)

            if (!studentsMap || studentsMap.size === 0) {
                 if (elements.homeworkClassSelect && (!app.state.students || app.state.students.length === 0)) {
                      tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-orange-500">전체 학생 목록 로딩 중...</td></tr>';
                 } else {
                     tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다.</td></tr>';
                 }
                return;
            }

            let homeworkData = {}; let homeworkLoadError = false;
            try { /* ... (숙제 정보 로드, 변경 없음) ... */
                if (app.state.selectedHomeworkId) {
                    const homeworkDoc = await getDoc(doc(db, 'homeworks', app.state.selectedHomeworkId));
                    if (homeworkDoc.exists()) homeworkData = homeworkDoc.data();
                    else { tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">선택한 숙제 정보 없음</td></tr>'; return; }
                } else { tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>'; return; }
            } catch (error) { homeworkLoadError = true; }
            if (homeworkLoadError) { tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">숙제 정보 로딩 실패</td></tr>'; return; }

            const textbookName = homeworkData.textbookName || ''; const totalPages = homeworkData.pages;
            // 👇 수정: submissionsMap의 key는 studentDocId
            const submissionsMap = new Map(); snapshot.docs.forEach(doc => submissionsMap.set(doc.id, doc.data())); // doc.id는 학생 Firestore 문서 ID
            const sortedStudents = Array.from(studentsMap.entries()).sort(([, a], [, b]) => a.localeCompare(b)); // studentsMap: [studentDocId, name]

            sortedStudents.forEach(([studentDocId, studentName]) => {
                 // 👇 수정: studentDocId로 submissionsMap에서 직접 조회
                 const submissionData = submissionsMap.get(studentDocId);

                const row = document.createElement('tr'); row.className = 'bg-white border-b hover:bg-slate-50';
                let statusHtml, submittedAtHtml, actionHtml;
                if (submissionData) { /* ... (제출 상태 표시 로직, 변경 없음) ... */
                    const submittedAtRaw = submissionData.submittedAt; const submittedAt = (submittedAtRaw?.toDate) ? submittedAtRaw.toDate().toLocaleString('ko-KR') : '-';
                    const submittedPages = submissionData.imageUrls?.length || 0; const isTotalValid = typeof totalPages === 'number' && totalPages > 0;
                    const isComplete = isTotalValid && submittedPages >= totalPages; const statusClass = isComplete ? 'text-green-600' : 'text-yellow-600';
                    const pagesInfo = isTotalValid ? `(${submittedPages}/${totalPages}p)` : `(${submittedPages}p)`;
                    statusHtml = `<td class="px-6 py-4 ${statusClass} font-semibold">${isComplete ? '완료' : '제출중'} ${pagesInfo}</td>`;
                    submittedAtHtml = `<td class="px-6 py-4">${submittedAt}</td>`;
                    // 👇 수정: 다운로드 버튼에 studentDocId 전달
                    actionHtml = `<td class="px-6 py-4"><button data-doc-id="${studentDocId}" data-name="${studentName}" class="download-btn btn btn-primary btn-sm">다운로드</button></td>`;
                } else { /* ... (미제출 상태 표시 로직, 변경 없음) ... */
                    const isTotalValid = typeof totalPages === 'number' && totalPages > 0; const pagesInfo = isTotalValid ? `(0/${totalPages}p)` : '';
                    statusHtml = `<td class="px-6 py-4 text-slate-400">미제출 ${pagesInfo}</td>`; submittedAtHtml = `<td class="px-6 py-4">-</td>`; actionHtml = `<td class="px-6 py-4"></td>`;
                }
                row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${studentName}</td>${statusHtml}${submittedAtHtml}${actionHtml}`;
                tableBody.appendChild(row);
                if (submissionData) {
                    // 👇 수정: 다운로드 이벤트 리스너에 studentDocId 전달
                    row.querySelector('.download-btn')?.addEventListener('click', (e) => this.downloadHomework(e.target.dataset.docId, e.target.dataset.name, textbookName));
                }
            });
        },

        // 👇 수정: 파라미터 이름 변경 (studentAuthUid -> studentDocId) 및 내부 로직 수정
        async downloadHomework(studentDocId, studentName, textbookName) {
             if (!app.state.selectedHomeworkId || !studentDocId) { showToast("다운로드 정보 부족"); return; }
             try {
                 // 👇 수정: studentDocId 사용
                 const submissionDoc = await getDoc(doc(db, 'homeworks', app.state.selectedHomeworkId, 'submissions', studentDocId));
                 if (!submissionDoc.exists()) { showToast("제출 데이터를 찾을 수 없습니다."); return; }
                 const submissionData = submissionDoc.data();

                 if (!submissionData.imageUrls || submissionData.imageUrls.length === 0) { showToast("다운로드할 이미지가 없습니다."); return; }
                 showToast(`'${studentName}' 학생 숙제 다운로드 시작...`, false);
                 const { submittedAt, imageUrls } = submissionData;
                 const date = submittedAt?.toDate()?.toISOString().split('T')[0] || 'unknown';
                 const className = elements.homeworkClassSelect ? app.state.classes.find(c => c.id === app.state.selectedClassIdForHomework)?.name || 'unknown' : app.state.selectedClassName || 'unknown';

                 for (let i = 0; i < imageUrls.length; i++) {
                     const url = imageUrls[i]; const fileName = `${date}_${className}_${studentName}_${textbookName}_${i+1}.jpg`;
                     try { /* ... (다운로드 로직, 변경 없음) ... */
                         const response = await fetch(url); if (!response.ok) throw new Error(`Status: ${response.status}`);
                         const blob = await response.blob(); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = fileName;
                         document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href);
                         await new Promise(resolve => setTimeout(resolve, 150));
                     } catch (error) { console.error(`다운로드 실패: ${fileName}`, error); showToast(`${fileName} 다운로드 실패: ${error.message}`, true); }
                 } showToast(`'${studentName}' 학생 숙제 다운로드 완료.`, false);
             } catch (error) { console.error("제출 데이터 조회 실패:", error); showToast("제출 데이터를 가져오는 중 오류 발생"); }
        },

        renderTableHeader(tableBody, headers) {
            // ... (내용 변경 없음) ...
            const table = tableBody?.parentElement; if (!table) return; table.querySelector('thead')?.remove();
            const thead = document.createElement('thead'); thead.className = 'text-xs text-gray-700 uppercase bg-gray-50';
            let headerHtml = '<tr>'; headers.forEach(h => headerHtml += `<th scope="col" class="px-6 py-3">${h}</th>`); headerHtml += '</tr>';
            thead.innerHTML = headerHtml; table.insertBefore(thead, tableBody);
        },
    };
    return homeworkManager;
}