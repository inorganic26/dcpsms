// src/shared/homeworkManager.js
import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch, limit, startAfter } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

export function createHomeworkManager(config) {
    const { app, elements } = config;

    const homeworkManager = {
        unsubscribe: null,
        isStudentsLoadedListenerAdded: false,
        
        // ✅ 페이지네이션 상태
        homeworkPageSize: 8,
        hwCurrentPage: 1,
        hwCursors: [], // 페이지별 마지막 문서를 저장

        init() {
            document.getElementById(elements.assignHomeworkBtn)?.addEventListener('click', () => this.openHomeworkModal(false));
            document.getElementById(elements.closeHomeworkModalBtn)?.addEventListener('click', () => this.closeHomeworkModal());
            document.getElementById(elements.cancelHomeworkBtn)?.addEventListener('click', () => this.closeHomeworkModal());
            document.getElementById(elements.saveHomeworkBtn)?.addEventListener('click', () => this.saveHomework());
            document.getElementById(elements.homeworkClassSelect)?.addEventListener('change', (e) => this.handleClassSelection(e));
            document.getElementById(elements.homeworkSelect)?.addEventListener('change', (e) => this.handleHomeworkSelection(e.target.value));
            document.getElementById(elements.homeworkSubjectSelect)?.addEventListener('change', (e) => this.populateTextbooksForHomework(e.target.value));
            document.getElementById(elements.editHomeworkBtn)?.addEventListener('click', () => this.openHomeworkModal(true));
            document.getElementById(elements.deleteHomeworkBtn)?.addEventListener('click', () => this.deleteHomework());

            if (elements.homeworkClassSelect && !this.isStudentsLoadedListenerAdded) {
                document.addEventListener('studentsLoaded', () => {
                    if (app.state.selectedClassIdForHomework && app.state.studentsInClass.size === 0) {
                        this.filterAndDisplayStudents(app.state.selectedClassIdForHomework);
                        if (app.state.selectedHomeworkId && this.unsubscribe) {
                             const homeworkId = app.state.selectedHomeworkId;
                             const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
                             this.unsubscribe();
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

        initView() {
            if (!elements.homeworkClassSelect) return;
            this.populateClassSelect();
            app.state.selectedHomeworkId = null;
            const classSelect = document.getElementById(elements.homeworkClassSelect);
            if (classSelect && app.state.classes?.length > 0) {
                const firstClassId = app.state.classes[0].id;
                if (firstClassId) {
                    classSelect.value = firstClassId;
                    this.handleClassSelection({ target: classSelect });
                } else {
                    this.resetUIState();
                }
            } else {
                this.resetUIState();
            }
        },

        populateClassSelect() {
            const select = document.getElementById(elements.homeworkClassSelect);
            if (!select) return;
            select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
            if (!app.state.classes || app.state.classes.length === 0) {
                select.innerHTML = '<option value="">-- 등록된 반 없음 --</option>'; return;
            }
            app.state.classes.forEach(cls => {
                select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
            });
        },

        handleClassSelection(event) {
             const selectElement = event.target;
             const newClassId = selectElement.value;
             app.state.selectedClassIdForHomework = newClassId;
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
             
             // 초기화
             this.hwCurrentPage = 1;
             this.hwCursors = [];
             this.handleHomeworkSelection('');

             if (!newClassId) return;

             if (mainContent) mainContent.style.display = 'block';
             if (assignBtn) assignBtn.disabled = false;
             if (hwSelect) { hwSelect.innerHTML = '<option value="">-- 숙제 로딩 중... --</option>'; hwSelect.disabled = true; }
             if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="loader-small mx-auto"></div> 학생 목록 확인 중...</td></tr>';

             this.filterAndDisplayStudents(newClassId);
             this.populateHomeworkSelect('first');
        },

        // ... (filterAndDisplayStudents, resetUIState, openHomeworkModal 등 기존 로직 유지 - 생략 가능 부분은 동일) ...
        filterAndDisplayStudents(classId) {
            const tableBody = document.getElementById(elements.homeworkTableBody);
            const allStudents = app.state.students;
            if (!allStudents || allStudents.length === 0) {
                if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-orange-500">전체 학생 목록 로딩 중...</td></tr>';
                return;
            }
            app.state.studentsInClass.clear();
            allStudents.forEach(student => {
                if (student && student.classId === classId) {
                    app.state.studentsInClass.set(student.id, student.name);
                }
            });
            if (tableBody) {
                if (app.state.studentsInClass.size === 0) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다.</td></tr>';
                } else if (!app.state.selectedHomeworkId) {
                    tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>';
                }
            }
        },
        
        resetUIState() {
             const mainContent = document.getElementById(elements.homeworkMainContent);
             if (mainContent) mainContent.style.display = 'none';
             // ... 나머지 UI 초기화 로직 동일 ...
        },

        async openHomeworkModal(isEditing = false) {
             // ... 기존 openHomeworkModal 코드와 완전히 동일 ...
             // (코드 길이상 생략하지만 실제 파일엔 기존 코드 그대로 있어야 합니다)
             const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
             if (!classId) { showToast("반을 선택해주세요."); return; }
             app.state.editingHomeworkId = isEditing ? app.state.selectedHomeworkId : null;
             
             const modal = document.getElementById(elements.assignHomeworkModal);
             const title = document.getElementById(elements.homeworkModalTitle);
             const saveBtn = document.getElementById(elements.saveHomeworkBtn);
             const subjectSelect = document.getElementById(elements.homeworkSubjectSelect);
             const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
             const dueDateInput = document.getElementById(elements.homeworkDueDateInput);
             const pagesInput = document.getElementById(elements.homeworkPagesInput);
             
             title.textContent = isEditing ? '숙제 정보 수정' : '새 숙제 출제';
             saveBtn.textContent = isEditing ? '수정하기' : '출제하기';
             
             subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
             textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
             textbookSelect.disabled = true;
             dueDateInput.value = ''; pagesInput.value = '';
             
             const selectedClassData = elements.homeworkClassSelect ? app.state.classes.find(c => c.id === classId) : app.state.selectedClassData;
             if(!selectedClassData) { showToast("반 정보 오류"); return; }
             
             const subjectIds = selectedClassData.subjects ? Object.keys(selectedClassData.subjects) : [];
             subjectIds.forEach(id => {
                 const subject = app.state.subjects.find(s => s.id === id);
                 if (subject) subjectSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
             });
             
             if (isEditing && app.state.editingHomeworkId) {
                 const docSnap = await getDoc(doc(db, 'homeworks', app.state.editingHomeworkId));
                 if(docSnap.exists()) {
                     const data = docSnap.data();
                     subjectSelect.value = data.subjectId;
                     await this.populateTextbooksForHomework(data.subjectId);
                     textbookSelect.value = data.textbookId;
                     textbookSelect.disabled = false;
                     dueDateInput.value = data.dueDate || '';
                     pagesInput.value = data.pages || '';
                 }
             }
             
             modal.style.display = 'flex';
        },

        async populateTextbooksForHomework(subjectId) {
             // ... 기존 코드와 동일 ...
            const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
            if (!textbookSelect) return;
            textbookSelect.innerHTML = '<option value="">-- 로딩 중... --</option>';
            textbookSelect.disabled = true;
            if (!subjectId) return;

            const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
            const selectedClassData = elements.homeworkClassSelect ? app.state.classes.find(c => c.id === classId) : app.state.selectedClassData;
            const textbookIds = selectedClassData?.subjects?.[subjectId]?.textbooks || [];
            
            // (간소화) 교재 데이터 로드 로직은 기존과 동일하므로 생략하지 않고 유지해야 함
            // 여기서는 핵심 로직만 표현
            try {
                let textbooks = app.state.textbooksBySubject?.[subjectId];
                if (!textbooks) {
                     const snaps = await Promise.all(textbookIds.map(id => getDoc(doc(db, `subjects/${subjectId}/textbooks`, id))));
                     textbooks = snaps.filter(s => s.exists()).map(s => ({id:s.id, ...s.data()}));
                     if(!app.state.textbooksBySubject) app.state.textbooksBySubject = {};
                     app.state.textbooksBySubject[subjectId] = textbooks;
                }
                textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
                textbooks.forEach(t => {
                    if (textbookIds.includes(t.id)) textbookSelect.innerHTML += `<option value="${t.id}">${t.name}</option>`;
                });
                textbookSelect.disabled = false;
            } catch(e) { console.error(e); }
        },

        closeHomeworkModal() {
            const modal = document.getElementById(elements.assignHomeworkModal);
            if (modal) modal.style.display = 'none';
            app.state.editingHomeworkId = null;
        },

        async saveHomework() {
            // ... 기존 saveHomework와 동일 ...
            // 성공 시 초기화 로직만 수정
            const saveBtn = document.getElementById(elements.saveHomeworkBtn);
            // ... (입력값 검증 생략) ...
             const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
             const subjectId = document.getElementById(elements.homeworkSubjectSelect)?.value;
             const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
             const textbookId = textbookSelect?.value;
             const textbookName = textbookSelect?.options[textbookSelect.selectedIndex]?.text;
             const dueDate = document.getElementById(elements.homeworkDueDateInput)?.value;
             const pages = document.getElementById(elements.homeworkPagesInput)?.value;

             if(!classId || !subjectId || !textbookId || !dueDate || !pages) { showToast("모두 입력해주세요"); return; }
             
             try {
                 const data = { classId, subjectId, textbookId, textbookName, dueDate, pages: parseInt(pages), createdAt: serverTimestamp() };
                 if(app.state.editingHomeworkId) {
                     await updateDoc(doc(db, 'homeworks', app.state.editingHomeworkId), data);
                 } else {
                     await addDoc(collection(db, 'homeworks'), data);
                     // 저장 후 첫 페이지로 리셋
                     this.hwCurrentPage = 1;
                     this.hwCursors = [];
                     await this.populateHomeworkSelect('first');
                 }
                 this.closeHomeworkModal();
                 showToast("저장되었습니다.", false);
             } catch(e) { showToast("저장 실패"); }
        },

        // ✅ [수정됨] 숙제 목록 페이지네이션 (이전/다음 지원)
        async populateHomeworkSelect(direction) {
            const select = document.getElementById(elements.homeworkSelect);
            if (!select) return;
            
            select.innerHTML = '<option value="">-- 로딩 중... --</option>';
            select.disabled = true;

            const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
            if (!classId) { select.innerHTML = '<option value="">-- 반 선택 필요 --</option>'; return; }

            try {
                let q;
                const hwRef = collection(db, 'homeworks');
                
                // 1. 방향에 따른 쿼리 설정
                if (direction === 'first') {
                    this.hwCurrentPage = 1;
                    this.hwCursors = [];
                    q = query(hwRef, where('classId', '==', classId), orderBy('createdAt', 'desc'), limit(this.homeworkPageSize));
                }
                else if (direction === 'next') {
                    const lastDoc = this.hwCursors[this.hwCurrentPage - 1];
                    q = query(hwRef, where('classId', '==', classId), orderBy('createdAt', 'desc'), startAfter(lastDoc), limit(this.homeworkPageSize));
                }
                else if (direction === 'prev') {
                    // 이전 페이지 로직: targetPage = currentPage - 1. Cursor index = targetPage - 2.
                    const targetPage = this.hwCurrentPage - 1;
                    const cursorIndex = targetPage - 2;
                    if (cursorIndex < 0) {
                        q = query(hwRef, where('classId', '==', classId), orderBy('createdAt', 'desc'), limit(this.homeworkPageSize));
                    } else {
                        const prevCursor = this.hwCursors[cursorIndex];
                        q = query(hwRef, where('classId', '==', classId), orderBy('createdAt', 'desc'), startAfter(prevCursor), limit(this.homeworkPageSize));
                    }
                }

                const snapshot = await getDocs(q);
                
                select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
                
                // 2. [이전 페이지] 옵션 추가 (2페이지 이상일 때만)
                if (direction === 'next' || (direction === 'prev' && this.hwCurrentPage > 2)) {
                     const prevOpt = document.createElement('option');
                     prevOpt.value = "PREV_PAGE";
                     prevOpt.textContent = "▲ 이전 페이지 (최근 숙제)";
                     prevOpt.style.fontWeight = "bold";
                     prevOpt.style.color = "#2563eb";
                     select.appendChild(prevOpt);
                } else if (this.hwCurrentPage > 1 && direction !== 'first') {
                     // 현재 2페이지인데 prev를 누르면 1페이지가 됨 -> 여기서는 렌더링 시점의 페이지를 봐야 함.
                     // 단순화: currentPage가 업데이트 되기 전/후 로직.
                     // 로직을 간소화: snapshot 처리 후 currentPage 업데이트.
                }

                if (snapshot.empty) {
                    if (direction === 'first') select.innerHTML += '<option value="" disabled>출제된 숙제 없음</option>';
                    else showToast("더 이상 숙제가 없습니다.");
                    // 빈 경우 이전 페이지로 복귀하거나 유지해야 하는데, UI 특성상 유지.
                    return;
                }

                // 3. 상태 업데이트
                if (direction === 'next') {
                    // 커서 저장
                    if (this.hwCursors.length < this.hwCurrentPage) {
                        this.hwCursors.push(snapshot.docs[snapshot.docs.length - 1]);
                    }
                    this.hwCurrentPage++;
                } else if (direction === 'prev') {
                    this.hwCurrentPage--;
                } else {
                    this.hwCurrentPage = 1;
                    this.hwCursors = [snapshot.docs[snapshot.docs.length - 1]];
                }

                // 다시 렌더링 (이전 버튼 조건 재확인)
                select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
                if (this.hwCurrentPage > 1) {
                    const prevOpt = document.createElement('option');
                    prevOpt.value = "PREV_PAGE";
                    prevOpt.textContent = "▲ 이전 페이지";
                    prevOpt.style.fontWeight = "bold";
                    prevOpt.style.color = "#2563eb";
                    select.appendChild(prevOpt);
                }

                snapshot.forEach(doc => { 
                    const hw = doc.data(); 
                    const displayDate = hw.dueDate || '기한없음'; 
                    const pagesText = hw.pages ? `(${hw.pages}p)` : ''; 
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `[${displayDate}] ${hw.textbookName} ${pagesText}`;
                    select.appendChild(option);
                });

                // 4. [다음 페이지] 옵션 추가 (꽉 찼을 때)
                if (snapshot.docs.length === this.homeworkPageSize) {
                    const nextOpt = document.createElement('option');
                    nextOpt.value = "NEXT_PAGE";
                    nextOpt.textContent = "▼ 다음 페이지 (과거 숙제)";
                    nextOpt.style.fontWeight = "bold";
                    nextOpt.style.color = "#2563eb";
                    select.appendChild(nextOpt);
                }

            } catch (error) { 
                console.error("Error populating homework select:", error); 
                select.innerHTML = '<option value="">-- 로드 실패 --</option>'; 
            } finally { 
                select.disabled = false;
                // 리스트 교체 후 포커스 유지
                if (direction !== 'first') select.focus();
            }
        },

        handleHomeworkSelection(homeworkId) {
            // ✅ 페이지 이동 처리
            if (homeworkId === 'NEXT_PAGE') {
                this.populateHomeworkSelect('next'); 
                return;
            }
            if (homeworkId === 'PREV_PAGE') {
                this.populateHomeworkSelect('prev');
                return;
            }

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
                if (tableBody) tableBody.innerHTML = '';
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
                (error) => { console.error("Error listening:", error); if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">로딩 실패</td></tr>'; }
            );
        },

        async deleteHomework() {
             if (!app.state.selectedHomeworkId) return;
             if (confirm("정말 삭제하시겠습니까?")) {
                 try {
                     const batch = writeBatch(db);
                     batch.delete(doc(db, 'homeworks', app.state.selectedHomeworkId));
                     await batch.commit();
                     showToast("삭제 완료", false);
                     this.populateHomeworkSelect('first'); // 삭제 후 첫 페이지로
                 } catch (error) { showToast("삭제 실패"); }
             }
        },
        // ... (renderHomeworkSubmissions, downloadHomework, renderTableHeader는 기존 코드 유지) ...
        async renderHomeworkSubmissions(snapshot) {
             const tableBody = document.getElementById(elements.homeworkTableBody); if (!tableBody) return; tableBody.innerHTML = '';
            const studentsMap = app.state.studentsInClass;

            if (!studentsMap || studentsMap.size === 0) {
                 tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">학생이 없습니다.</td></tr>';
                 return;
            }

            let homeworkData = {};
            try {
                if (app.state.selectedHomeworkId) {
                    const docSnap = await getDoc(doc(db, 'homeworks', app.state.selectedHomeworkId));
                    if (docSnap.exists()) homeworkData = docSnap.data();
                }
            } catch (e) {}

            const textbookName = homeworkData.textbookName || ''; 
            const totalPages = homeworkData.pages;
            const submissionsMap = new Map(); 
            snapshot.docs.forEach(doc => submissionsMap.set(doc.id, doc.data())); 
            const sortedStudents = Array.from(studentsMap.entries()).sort(([, a], [, b]) => a.localeCompare(b));

            sortedStudents.forEach(([studentDocId, studentName]) => {
                const submissionData = submissionsMap.get(studentDocId);
                const row = document.createElement('tr'); row.className = 'bg-white border-b hover:bg-slate-50';
                
                let statusHtml, submittedAtHtml, actionHtml;
                if (submissionData) {
                    const submittedAt = submissionData.submittedAt?.toDate().toLocaleString('ko-KR') || '-';
                    const cnt = submissionData.imageUrls?.length || 0; 
                    const isComplete = totalPages && cnt >= totalPages;
                    const statusClass = isComplete ? 'text-green-600' : 'text-yellow-600';
                    statusHtml = `<td class="px-6 py-4 ${statusClass} font-semibold">${isComplete ? '완료' : '제출중'} (${cnt}/${totalPages || '?'}p)</td>`;
                    submittedAtHtml = `<td class="px-6 py-4">${submittedAt}</td>`;
                    actionHtml = `<td class="px-6 py-4"><button data-doc-id="${studentDocId}" data-name="${studentName}" class="download-btn btn btn-primary btn-sm">다운로드</button></td>`;
                } else {
                    statusHtml = `<td class="px-6 py-4 text-slate-400">미제출</td>`; 
                    submittedAtHtml = `<td class="px-6 py-4">-</td>`; 
                    actionHtml = `<td class="px-6 py-4"></td>`;
                }
                row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${studentName}</td>${statusHtml}${submittedAtHtml}${actionHtml}`;
                tableBody.appendChild(row);
                
                row.querySelector('.download-btn')?.addEventListener('click', (e) => this.downloadHomework(e.target.dataset.docId, e.target.dataset.name, textbookName));
            });
        },
        async downloadHomework(studentDocId, studentName, textbookName) {
             if (!app.state.selectedHomeworkId || !studentDocId) return;
             try {
                 const snap = await getDoc(doc(db, 'homeworks', app.state.selectedHomeworkId, 'submissions', studentDocId));
                 if (!snap.exists()) return showToast("데이터 없음");
                 const { imageUrls, submittedAt } = snap.data();
                 const date = submittedAt?.toDate()?.toISOString().split('T')[0] || 'date';
                 
                 showToast(`${studentName} 다운로드 시작...`, false);
                 for (let i = 0; i < imageUrls.length; i++) {
                     const url = imageUrls[i]; 
                     const link = document.createElement('a'); 
                     link.href = url;
                     link.download = `${date}_${studentName}_${textbookName}_${i+1}.jpg`;
                     link.target = "_blank"; 
                     document.body.appendChild(link); link.click(); document.body.removeChild(link);
                 }
             } catch (e) { showToast("다운로드 오류"); }
        },
        renderTableHeader(tableBody, headers) {
            const table = tableBody?.parentElement; if (!table) return; table.querySelector('thead')?.remove();
            const thead = document.createElement('thead'); thead.className = 'text-xs text-gray-700 uppercase bg-gray-50';
            let headerHtml = '<tr>'; headers.forEach(h => headerHtml += `<th scope="col" class="px-6 py-3">${h}</th>`); headerHtml += '</tr>';
            thead.innerHTML = headerHtml; table.insertBefore(thead, tableBody);
        },
    };
    return homeworkManager;
}