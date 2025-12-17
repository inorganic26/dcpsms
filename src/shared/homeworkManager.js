// src/shared/homeworkManager.js
import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch, limit, startAfter } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

export function createHomeworkManager(config) {
    const { app, elements } = config;

    const homeworkManager = {
        unsubscribe: null,
        isStudentsLoadedListenerAdded: false,
        homeworkPageSize: 8,
        hwCurrentPage: 1,
        hwCursors: [], 

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
        },

        async openHomeworkModal(isEditing = false) {
             const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
             if (!classId) { showToast("반을 선택해주세요."); return; }
             app.state.editingHomeworkId = isEditing ? app.state.selectedHomeworkId : null;
             
             const modal = document.getElementById(elements.assignHomeworkModal);
             const title = document.getElementById(elements.homeworkModalTitle);
             const saveBtn = document.getElementById(elements.saveHomeworkBtn);
             
             const titleInput = document.getElementById(elements.homeworkTitleInput);
             const subjectSelect = document.getElementById(elements.homeworkSubjectSelect);
             const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
             const dueDateInput = document.getElementById(elements.homeworkDueDateInput);
             const pagesInput = document.getElementById(elements.homeworkPagesInput);
             
             title.textContent = isEditing ? '숙제 정보 수정' : '새 숙제 출제';
             saveBtn.textContent = isEditing ? '수정하기' : '출제하기';
             
             if (titleInput) titleInput.value = '';
             subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
             textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
             textbookSelect.disabled = true;
             dueDateInput.value = ''; pagesInput.value = '';
             
             const selectedClassData = elements.homeworkClassSelect ? app.state.classes.find(c => c.id === classId) : app.state.selectedClassData;
             if(!selectedClassData) { showToast("반 정보 오류"); return; }
             
             const subjectIds = selectedClassData.subjects ? Object.keys(selectedClassData.subjects) : [];
             if (subjectIds.length === 0) {
                 subjectSelect.innerHTML = '<option value="" disabled>설정된 과목 없음</option>';
             } else {
                 subjectIds.forEach(id => {
                     const subject = app.state.subjects.find(s => s.id === id);
                     if (subject) subjectSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
                 });
             }
             
             if (isEditing && app.state.editingHomeworkId) {
                 const docSnap = await getDoc(doc(db, 'homeworks', app.state.editingHomeworkId));
                 if(docSnap.exists()) {
                     const data = docSnap.data();
                     if (titleInput) titleInput.value = data.title || '';
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
            const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
            if (!textbookSelect) return;
            
            textbookSelect.innerHTML = '<option value="">-- 로딩 중... --</option>';
            textbookSelect.disabled = true;
            if (!subjectId) return;

            try {
                const q = query(collection(db, "textbooks"), where("subjectId", "==", subjectId), orderBy("name"));
                const snapshot = await getDocs(q);
                
                textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
                
                if (snapshot.empty) {
                     textbookSelect.innerHTML += '<option value="" disabled>등록된 교재가 없습니다.</option>';
                } else {
                    snapshot.forEach(doc => {
                        const tb = doc.data();
                        textbookSelect.innerHTML += `<option value="${doc.id}">${tb.name}</option>`;
                    });
                }
                textbookSelect.disabled = false;

            } catch(e) { 
                console.error("교재 로딩 실패:", e); 
                textbookSelect.innerHTML = '<option value="">-- 로딩 실패 --</option>';
            }
        },

        closeHomeworkModal() {
            const modal = document.getElementById(elements.assignHomeworkModal);
            if (modal) modal.style.display = 'none';
            app.state.editingHomeworkId = null;
        },

        async saveHomework() {
             const saveBtn = document.getElementById(elements.saveHomeworkBtn);
             const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
             
             const titleInput = document.getElementById(elements.homeworkTitleInput);
             const title = titleInput?.value.trim();

             const subjectId = document.getElementById(elements.homeworkSubjectSelect)?.value;
             const textbookSelect = document.getElementById(elements.homeworkTextbookSelect);
             const textbookId = textbookSelect?.value;
             const textbookName = textbookSelect?.options[textbookSelect.selectedIndex]?.text;
             const dueDate = document.getElementById(elements.homeworkDueDateInput)?.value;
             const pages = document.getElementById(elements.homeworkPagesInput)?.value;

             if(!title) { showToast("숙제 제목을 입력해주세요."); return; } 
             if(!classId || !subjectId || !textbookId || !dueDate || !pages) { showToast("모든 정보를 입력해주세요"); return; }
             
             saveBtn.disabled = true;
             saveBtn.innerText = "저장 중...";

             try {
                 const data = { 
                     title, 
                     classId, 
                     subjectId, 
                     textbookId, 
                     textbookName, 
                     dueDate, 
                     pages: parseInt(pages) || 0, 
                     createdAt: serverTimestamp() 
                 };

                 if(app.state.editingHomeworkId) {
                     await updateDoc(doc(db, 'homeworks', app.state.editingHomeworkId), data);
                 } else {
                     await addDoc(collection(db, 'homeworks'), data);
                     this.hwCurrentPage = 1;
                     this.hwCursors = [];
                     await this.populateHomeworkSelect('first');
                 }
                 this.closeHomeworkModal();
                 showToast("저장되었습니다.", false);
             } catch(e) { 
                 console.error(e);
                 showToast("저장 실패"); 
             } finally {
                 saveBtn.disabled = false;
                 saveBtn.innerText = app.state.editingHomeworkId ? "수정하기" : "출제하기";
             }
        },

        // ✨ [수정됨] 매개변수 기본값('first') 추가
        async populateHomeworkSelect(direction = 'first') {
            const select = document.getElementById(elements.homeworkSelect);
            if (!select) return;
            
            select.innerHTML = '<option value="">-- 로딩 중... --</option>';
            select.disabled = true;

            const classId = elements.homeworkClassSelect ? app.state.selectedClassIdForHomework : app.state.selectedClassId;
            if (!classId) { select.innerHTML = '<option value="">-- 반 선택 필요 --</option>'; return; }

            try {
                let q;
                const hwRef = collection(db, 'homeworks');
                
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
                    const targetPage = this.hwCurrentPage - 1;
                    const cursorIndex = targetPage - 2;
                    if (cursorIndex < 0) {
                        q = query(hwRef, where('classId', '==', classId), orderBy('createdAt', 'desc'), limit(this.homeworkPageSize));
                    } else {
                        const prevCursor = this.hwCursors[cursorIndex];
                        q = query(hwRef, where('classId', '==', classId), orderBy('createdAt', 'desc'), startAfter(prevCursor), limit(this.homeworkPageSize));
                    }
                }

                // direction이 'first'가 아니지만 위 조건에 안 걸리는 경우(방어 코드)
                if (!q) {
                     this.hwCurrentPage = 1;
                     this.hwCursors = [];
                     q = query(hwRef, where('classId', '==', classId), orderBy('createdAt', 'desc'), limit(this.homeworkPageSize));
                }

                const snapshot = await getDocs(q);
                
                select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
                
                if (direction === 'next' || (direction === 'prev' && this.hwCurrentPage > 2)) {
                     const prevOpt = document.createElement('option');
                     prevOpt.value = "PREV_PAGE";
                     prevOpt.textContent = "▲ 이전 페이지 (최근 숙제)";
                     prevOpt.style.fontWeight = "bold";
                     prevOpt.style.color = "#2563eb";
                     select.appendChild(prevOpt);
                }

                if (snapshot.empty) {
                    if (direction === 'first') select.innerHTML += '<option value="" disabled>출제된 숙제 없음</option>';
                    else showToast("더 이상 숙제가 없습니다.");
                    return;
                }

                if (direction === 'next') {
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
                    const titleText = hw.title ? `"${hw.title}"` : hw.textbookName;
                    const pagesText = hw.pages ? `(${hw.pages}p)` : ''; 
                    const option = document.createElement('option');
                    option.value = doc.id;
                    option.textContent = `[${displayDate}] ${titleText} ${pagesText}`;
                    select.appendChild(option);
                });

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
                if (direction !== 'first') select.focus();
            }
        },

        handleHomeworkSelection(homeworkId) {
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
                     this.populateHomeworkSelect('first'); 
                 } catch (error) { showToast("삭제 실패"); }
             }
        },
        
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

            const homeworkTitle = homeworkData.title || homeworkData.textbookName || '숙제'; 
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
                
                row.querySelector('.download-btn')?.addEventListener('click', (e) => this.downloadHomework(e.target.dataset.docId, e.target.dataset.name, homeworkTitle));
            });
        },
        async downloadHomework(studentDocId, studentName, title) {
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
                     link.download = `${date}_${studentName}_${title}_${i+1}.jpg`;
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