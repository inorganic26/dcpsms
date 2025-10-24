// src/admin/adminHomeworkDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch } from "firebase/firestore"; // writeBatch 추가
import { db } from '../shared/firebase.js'; // firebase.js 경로 확인
import { showToast } from '../shared/utils.js';

export const adminHomeworkDashboard = {
    unsubscribe: null,
    // ======[ 학생 로딩 리스너 상태 추가 ]======
    isStudentsLoadedListenerAdded: false,
    // ===================================

    init(app) {
        this.app = app; // AdminApp 인스턴스 참조

        // 관리자 앱 요소 ID에 맞게 수정 및 null 체크 강화
        this.app.elements.assignHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(false));
        this.app.elements.closeHomeworkModalBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.app.elements.cancelHomeworkBtn?.addEventListener('click', () => this.closeHomeworkModal());
        this.app.elements.saveHomeworkBtn?.addEventListener('click', () => this.saveHomework());
        this.app.elements.homeworkClassSelect?.addEventListener('change', (e) => this.handleClassSelection(e)); // 반 선택 핸들러
        this.app.elements.homeworkSelect?.addEventListener('change', (e) => this.handleHomeworkSelection(e.target.value));
        this.app.elements.homeworkSubjectSelect?.addEventListener('change', (e) => this.populateTextbooksForHomework(e.target.value));
        this.app.elements.editHomeworkBtn?.addEventListener('click', () => this.openHomeworkModal(true));
        this.app.elements.deleteHomeworkBtn?.addEventListener('click', () => this.deleteHomework());

        // ======[ studentsLoaded 이벤트 리스너 추가 (한 번만) ]======
        if (!this.isStudentsLoadedListenerAdded) {
            document.addEventListener('studentsLoaded', () => {
                console.log("[Admin Homework] Received 'studentsLoaded' event.");
                // 현재 반이 선택되어 있고, 학생 목록 필터링이 필요한 상태라면 필터링 재시도
                if (this.app.state.selectedClassIdForHomework && this.app.state.studentsInClass.size === 0) {
                     console.log("[Admin Homework] Attempting to filter students again after studentsLoaded event.");
                    this.filterAndDisplayStudents(this.app.state.selectedClassIdForHomework);
                    // 숙제가 이미 선택된 상태였다면 제출 현황도 다시 렌더링 시도
                    if (this.app.state.selectedHomeworkId && this.unsubscribe) {
                         console.log("[Admin Homework] Refreshing submissions rendering after students loaded.");
                         const homeworkId = this.app.state.selectedHomeworkId;
                         const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
                         // 기존 리스너 해제 후 다시 설정 (혹은 snapshot 직접 가져와서 render 호출)
                         this.unsubscribe();
                         this.unsubscribe = onSnapshot(query(submissionsRef),
                            (snapshot) => this.renderHomeworkSubmissions(snapshot),
                            (error) => { /* 에러 처리 */ }
                         );
                    }
                }
            });
            this.isStudentsLoadedListenerAdded = true;
        }
        // =============================================
    },

    // 뷰가 활성화될 때 호출 (수정됨: 첫 반 자동 선택)
    initView() {
        this.populateClassSelect(); // 반 목록 채우기
        this.app.state.selectedHomeworkId = null; // 숙제 선택 초기화

        // --- 첫 반 자동 선택 로직 ---
        const classSelect = this.app.elements.homeworkClassSelect;
        // 반 목록 로딩이 완료되었고, 반이 하나 이상 존재하는 경우
        if (classSelect && this.app.state.classes?.length > 0) {
            const firstClassId = this.app.state.classes[0].id; // 첫 번째 반 ID 가져오기 (정렬된 상태 가정)
            if (firstClassId) {
                console.log(`[Admin Homework] Automatically selecting first class: ${firstClassId}`);
                classSelect.value = firstClassId; // 드롭다운 값 설정
                this.handleClassSelection({ target: classSelect });
            } else {
                this.app.state.selectedClassIdForHomework = null;
                this.app.state.studentsInClass.clear();
                this.resetUIState();
            }
        } else {
            this.app.state.selectedClassIdForHomework = null;
            this.app.state.studentsInClass.clear();
            this.resetUIState();
        }

        console.log("[Admin Homework] View Initialized and potentially auto-selected first class.");
    },

    // UI 상태 초기화 함수 (initView 및 반 미선택 시 호출)
    resetUIState() {
        if (this.app.elements.homeworkMainContent) this.app.elements.homeworkMainContent.style.display = 'none';
        if (this.app.elements.homeworkSelect) {
            this.app.elements.homeworkSelect.innerHTML = '<option value="">-- 반 선택 필요 --</option>';
            this.app.elements.homeworkSelect.disabled = true;
        }
        if (this.app.elements.homeworkTableBody) this.app.elements.homeworkTableBody.innerHTML = '';
        if (this.app.elements.homeworkManagementButtons) this.app.elements.homeworkManagementButtons.style.display = 'none';
        if (this.app.elements.homeworkContent) this.app.elements.homeworkContent.style.display = 'none';
        if (this.app.elements.assignHomeworkBtn) this.app.elements.assignHomeworkBtn.disabled = true;
    },

    // 관리자용 반 선택 드롭다운 채우기
    populateClassSelect() {
        const select = this.app.elements.homeworkClassSelect;
        if (!select) return;

        select.innerHTML = '<option value="">-- 반 로딩 중... --</option>';
        select.disabled = true;

        if (!this.app.state.classes || this.app.state.classes.length === 0) {
            select.innerHTML = '<option value="">-- 등록된 반 없음 --</option>';
            console.log("[Admin Homework] No classes available to populate.");
            return;
        }

        select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>';
        select.disabled = false;
        this.app.state.classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });

         console.log("[Admin Homework] Class select populated.");
    },

    // ======[ 반 선택 핸들러 수정: 학생 필터링 로직 분리 ]======
    async handleClassSelection(event) {
        const selectElement = event.target;
        const newClassId = selectElement.value;

        console.log(`[Admin Homework] Class selected: ${newClassId || 'None'}`);
        this.app.state.selectedClassIdForHomework = newClassId;
        this.app.state.selectedHomeworkId = null;
        this.app.state.studentsInClass.clear();

        const homeworkMainContent = this.app.elements.homeworkMainContent;
        const homeworkSelect = this.app.elements.homeworkSelect;
        const homeworkTableBody = this.app.elements.homeworkTableBody;
        const assignHomeworkBtn = this.app.elements.assignHomeworkBtn;

        // UI 초기화 및 비활성화
        if (homeworkMainContent) homeworkMainContent.style.display = 'none';
        if (homeworkSelect) {
            homeworkSelect.innerHTML = '<option value="">-- 반 선택 필요 --</option>';
            homeworkSelect.disabled = true;
        }
        if (homeworkTableBody) homeworkTableBody.innerHTML = '';
        if (assignHomeworkBtn) assignHomeworkBtn.disabled = true;
        this.handleHomeworkSelection(''); // 숙제 관련 UI 초기화

        if (!newClassId) {
            console.log("[Admin Homework] Class selection cleared.");
            return;
        }

        // 반 선택 시 UI 업데이트 및 로딩 상태 표시
        if (homeworkMainContent) homeworkMainContent.style.display = 'block';
        if (assignHomeworkBtn) assignHomeworkBtn.disabled = false;
        if (homeworkSelect) {
            homeworkSelect.innerHTML = '<option value="">-- 숙제 로딩 중... --</option>';
            homeworkSelect.disabled = true;
        }
        if (homeworkTableBody) homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="loader-small mx-auto"></div> 학생 목록 확인 중...</td></tr>';

        // --- 학생 목록 필터링 시도 ---
        this.filterAndDisplayStudents(newClassId); // 필터링 함수 호출

        // --- 숙제 목록 로드 (학생 목록 로드와 별개로 진행) ---
        try {
            await this.populateHomeworkSelect();
        } catch (error) {
            console.error("[Admin Homework] Error populating homework select:", error);
            showToast("숙제 목록 로딩 실패", true);
            if (homeworkSelect) {
                homeworkSelect.innerHTML = '<option value="">-- 로드 실패 --</option>';
                homeworkSelect.disabled = true;
            }
            if (homeworkTableBody) homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">숙제 목록 로딩 실패</td></tr>';
        }
    },
    // ======================================================

    // ======[ 학생 필터링 및 UI 업데이트 함수 추가 ]======
    filterAndDisplayStudents(classId) {
        const homeworkTableBody = this.app.elements.homeworkTableBody;
        const allStudents = this.app.state.students;

        // 학생 목록 로드 상태 확인
        if (!allStudents || allStudents.length === 0) {
            console.warn("[Admin Homework] (filter) 전체 학생 목록이 아직 준비되지 않았습니다.");
            if (homeworkTableBody) homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-orange-500">전체 학생 목록 로딩 중... 잠시 후 숙제를 선택해주세요.</td></tr>';
            // studentsLoaded 이벤트 리스너가 나중에 이 함수를 다시 호출할 것임
            return;
        }

        // 학생 목록 필터링
        this.app.state.studentsInClass.clear(); // 필터링 전 초기화
        allStudents.forEach(student => {
            if (student && student.classId === classId) {
                this.app.state.studentsInClass.set(student.id, student.name);
            }
        });
        console.log(`[Admin Homework] (filter) Filtered students for class ${classId}. Count: ${this.app.state.studentsInClass.size}`);

        // 테이블 초기 메시지 설정 (숙제 선택 전 상태)
        if (homeworkTableBody) {
            if (this.app.state.studentsInClass.size === 0) {
                homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다. [반 배정 관리]에서 학생을 추가해주세요.</td></tr>';
            } else {
                // 숙제가 아직 선택되지 않은 경우 메시지 표시
                if (!this.app.state.selectedHomeworkId) {
                    homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>';
                }
                // 숙제가 이미 선택된 경우 renderHomeworkSubmissions가 호출되어 테이블 내용을 덮어쓰므로 여기서는 추가 작업 불필요
            }
        }
    },
    // =============================================

    // ... (openHomeworkModal, populateTextbooksForHomework, closeHomeworkModal, saveHomework 함수는 기존과 동일하게 유지) ...
    async openHomeworkModal(isEditing = false) {
        // 선택된 반이 있는지 먼저 확인
        if (!this.app.state.selectedClassIdForHomework) {
            showToast("숙제를 출제/수정할 반을 먼저 선택해주세요.");
            return;
        }
        this.app.state.editingHomeworkId = isEditing ? this.app.state.selectedHomeworkId : null;

        const modal = this.app.elements.assignHomeworkModal;
        const title = this.app.elements.homeworkModalTitle;
        const saveBtn = this.app.elements.saveHomeworkBtn;
        const subjectSelect = this.app.elements.homeworkSubjectSelect;
        const textbookSelect = this.app.elements.homeworkTextbookSelect;
        const dueDateInput = this.app.elements.homeworkDueDateInput;
        const pagesInput = this.app.elements.homeworkPagesInput;

        if (!modal || !title || !saveBtn || !subjectSelect || !textbookSelect || !dueDateInput || !pagesInput) {
            console.error("[Admin Homework] Modal elements not found.");
            showToast("숙제 모달 창을 열 수 없습니다.", true);
            return;
        }

        title.textContent = isEditing ? '숙제 정보 수정' : '새 숙제 출제';
        saveBtn.textContent = isEditing ? '수정하기' : '출제하기';

        // Reset fields
        subjectSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
        textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
        textbookSelect.disabled = true;
        dueDateInput.value = '';
        pagesInput.value = '';

        // 선택된 반의 데이터 로드 (AdminApp 상태 사용)
        const selectedClassData = this.app.state.classes.find(c => c.id === this.app.state.selectedClassIdForHomework);

        if (!selectedClassData || !selectedClassData.subjects) {
            showToast("선택된 반의 과목 정보를 불러올 수 없습니다.");
            modal.style.display = 'flex'; // 모달은 보여주되 내용은 비움
            return;
        }

        const subjectIds = Object.keys(selectedClassData.subjects);
        if (subjectIds.length === 0) {
             showToast("선택된 반에 지정된 과목이 없습니다. [반 관리]에서 과목을 먼저 설정해주세요.");
             subjectSelect.innerHTML = '<option value="">반에 지정된 과목 없음</option>';
             subjectSelect.disabled = true;
             modal.style.display = 'flex'; // 모달은 보여주되 내용은 비움
            return;
        }

        // Populate subject select options
        subjectSelect.disabled = false;
        subjectIds.forEach(id => {
            const subject = this.app.state.subjects.find(s => s.id === id);
            if (subject) {
                 subjectSelect.innerHTML += `<option value="${subject.id}">${subject.name}</option>`;
            }
        });

        // If editing, load existing homework data
        if (isEditing && this.app.state.editingHomeworkId) {
            saveBtn.disabled = true; // 수정 정보 로딩 중 저장 버튼 비활성화
            try {
                const homeworkDoc = await getDoc(doc(db, 'homeworks', this.app.state.editingHomeworkId));
                if (homeworkDoc.exists()) {
                    const hwData = homeworkDoc.data();
                    // 과목 선택 드롭다운에 해당 과목이 있는지 확인 후 선택
                    if (Array.from(subjectSelect.options).some(opt => opt.value === hwData.subjectId)) {
                        subjectSelect.value = hwData.subjectId;
                        // Populate textbooks based on the loaded subject
                        await this.populateTextbooksForHomework(hwData.subjectId);
                        // 교재 선택 드롭다운에 해당 교재가 있는지 확인 후 선택
                        if (Array.from(textbookSelect.options).some(opt => opt.value === hwData.textbookId)) {
                            textbookSelect.value = hwData.textbookId;
                        } else {
                             showToast("저장된 교재를 현재 반 설정에서 찾을 수 없습니다.", true);
                             textbookSelect.value = ''; // 선택 초기화
                             textbookSelect.disabled = true;
                        }
                    } else {
                         showToast("저장된 과목을 현재 반 설정에서 찾을 수 없습니다.", true);
                         subjectSelect.value = ''; // 선택 초기화
                         textbookSelect.value = '';
                         textbookSelect.disabled = true;
                    }

                    dueDateInput.value = hwData.dueDate || '';
                    pagesInput.value = hwData.pages || '';
                } else {
                     showToast("수정할 숙제 정보를 찾을 수 없습니다.");
                     this.closeHomeworkModal(); // 정보 없으면 모달 닫기
                     return;
                }
            } catch (error) {
                console.error("Error loading homework for editing:", error);
                showToast("숙제 정보 로딩 중 오류 발생.");
                this.closeHomeworkModal();
                return;
            } finally {
                 saveBtn.disabled = false; // 로딩 완료 후 저장 버튼 활성화
            }
        }

        modal.style.display = 'flex';
    },

    async populateTextbooksForHomework(subjectId) {
        const textbookSelect = this.app.elements.homeworkTextbookSelect;
        if (!textbookSelect) return;

        textbookSelect.innerHTML = '<option value="">-- 교재 로딩 중... --</option>';
        textbookSelect.disabled = true; // 로딩 시작 시 비활성화

        if (!subjectId) {
            textbookSelect.innerHTML = '<option value="">-- 과목 선택 필요 --</option>';
            return;
        }

        // 선택된 반의 데이터에서 해당 과목에 지정된 교재 ID 목록 가져오기
        const selectedClassData = this.app.state.classes.find(c => c.id === this.app.state.selectedClassIdForHomework);
        const textbookIds = selectedClassData?.subjects?.[subjectId]?.textbooks;

        if (!textbookIds || textbookIds.length === 0) {
            textbookSelect.innerHTML = '<option value="">반에 지정된 교재 없음</option>';
            // 비활성화 상태는 유지
            return;
        }

        try {
            const textbookDocs = await Promise.all(
                textbookIds.map(id => getDoc(doc(db, `subjects/${subjectId}/textbooks`, id)))
            );

            textbookSelect.innerHTML = '<option value="">-- 교재 선택 --</option>'; // 로딩 완료 후 기본 옵션
            let foundTextbooks = false;
            textbookDocs.forEach(textbookDoc => {
                if(textbookDoc.exists()){
                    textbookSelect.innerHTML += `<option value="${textbookDoc.id}">${textbookDoc.data().name}</option>`;
                    foundTextbooks = true;
                }
            });

            if (!foundTextbooks) {
                 textbookSelect.innerHTML = '<option value="">지정된 교재 없음</option>';
            } else {
                 textbookSelect.disabled = false; // 교재가 있으면 활성화
            }

        } catch (error) {
             console.error("Error populating textbooks:", error);
             showToast("교재 목록 로딩 실패", true);
             textbookSelect.innerHTML = '<option value="">-- 로드 실패 --</option>';
             // 비활성화 상태 유지
        }
    },

    closeHomeworkModal() {
        if (this.app.elements.assignHomeworkModal) this.app.elements.assignHomeworkModal.style.display = 'none';
        this.app.state.editingHomeworkId = null;
    },

    async saveHomework() {
        const classId = this.app.state.selectedClassIdForHomework; // 관리자는 상태에서 가져옴
        const subjectId = this.app.elements.homeworkSubjectSelect?.value;
        const textbookSelect = this.app.elements.homeworkTextbookSelect;
        const textbookId = textbookSelect?.value;
        const textbookName = textbookSelect?.options[textbookSelect.selectedIndex]?.text;
        const dueDate = this.app.elements.homeworkDueDateInput?.value;
        const pagesInput = this.app.elements.homeworkPagesInput;
        const pages = pagesInput?.value;
        const saveBtn = this.app.elements.saveHomeworkBtn;

        if (!classId) { showToast("숙제를 출제할 반을 먼저 선택해주세요."); return; }
        if (!subjectId || !textbookId || !dueDate || !pages) { showToast("과목, 교재, 제출 기한, 총 페이지 수를 모두 입력해주세요."); return; }
        const pagesInt = parseInt(pages, 10);
        if (isNaN(pagesInt) || pagesInt <= 0) { showToast("페이지 수는 1 이상의 숫자를 입력해주세요."); return; }

        if (saveBtn) saveBtn.disabled = true; // 저장 시작 시 버튼 비활성화

        const homeworkData = {
            classId: classId,
            subjectId,
            textbookId,
            textbookName,
            dueDate,
            pages: pagesInt,
        };

        try {
            let homeworkRef;
            if (this.app.state.editingHomeworkId) {
                homeworkRef = doc(db, 'homeworks', this.app.state.editingHomeworkId);
                await updateDoc(homeworkRef, homeworkData);
                showToast("숙제 정보를 성공적으로 수정했습니다.", false);
            } else {
                homeworkData.createdAt = serverTimestamp();
                // addDoc은 DocumentReference를 반환
                const addedDocRef = await addDoc(collection(db, 'homeworks'), homeworkData);
                homeworkRef = addedDocRef; // 새로 추가된 문서의 참조 저장
                showToast("새로운 숙제가 출제되었습니다.", false);
            }
            this.closeHomeworkModal();
            await this.populateHomeworkSelect(); // 숙제 목록 다시 로드

            // 목록 다시 로드 후, 방금 추가/수정한 숙제를 자동으로 선택
            if (homeworkRef?.id && this.app.elements.homeworkSelect) {
                 this.app.elements.homeworkSelect.value = homeworkRef.id;
                 this.handleHomeworkSelection(homeworkRef.id); // 선택 핸들러 호출
            }

        } catch (error) {
            console.error("숙제 저장/수정 실패: ", error);
            showToast("숙제 처리에 실패했습니다.");
        } finally {
             if (saveBtn) saveBtn.disabled = false; // 완료 후 버튼 활성화
        }
    },


    async populateHomeworkSelect() {
        const select = this.app.elements.homeworkSelect;
        if (!select) return;

        select.innerHTML = '<option value="">-- 로딩 중... --</option>';
        select.disabled = true;
        if (this.app.elements.homeworkContent) this.app.elements.homeworkContent.style.display = 'none';
        if (this.app.elements.homeworkManagementButtons) this.app.elements.homeworkManagementButtons.style.display = 'none';
        if (this.app.elements.homeworkTableBody) this.app.elements.homeworkTableBody.innerHTML = '';

        const classId = this.app.state.selectedClassIdForHomework;
        if (!classId) {
            select.innerHTML = '<option value="">-- 반 선택 필요 --</option>';
            return;
        }

        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
            if (snapshot.empty) {
                 select.innerHTML += '<option value="" disabled>출제된 숙제 없음</option>';
                 if (this.app.elements.homeworkTableBody) {
                    if (this.app.state.studentsInClass.size > 0) {
                        this.app.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">이 반에는 출제된 숙제가 없습니다.</td></tr>';
                    } else {
                        // 학생 목록 로딩 상태에 따라 다른 메시지 표시 (filterAndDisplayStudents 함수에서 처리)
                        // this.app.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다.</td></tr>';
                    }
                 }
            } else {
                snapshot.forEach(doc => {
                    const hw = doc.data();
                    const displayDate = hw.dueDate || '기한없음';
                    const pagesText = hw.pages ? `(${hw.pages}p)` : '';
                    select.innerHTML += `<option value="${doc.id}">[${displayDate}] ${hw.textbookName} ${pagesText}</option>`;
                });
                 // 숙제가 있으면, 학생 목록 로딩 상태에 따라 테이블 메시지 설정 (filterAndDisplayStudents 함수에서 처리)
                 // if (this.app.elements.homeworkTableBody) {
                 //    this.app.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>';
                 // }
            }
        } catch (error) {
             console.error("Error populating homework select:", error);
             select.innerHTML = '<option value="">-- 로드 실패 --</option>';
             showToast("숙제 목록 로딩 실패", true);
             if (this.app.elements.homeworkTableBody) {
                 this.app.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">숙제 목록 로딩 실패</td></tr>';
             }
        } finally {
             select.disabled = false;
        }
    },

    handleHomeworkSelection(homeworkId) {
        console.log(`[Admin Homework] Homework selected: ${homeworkId || 'None'}`);
        this.app.state.selectedHomeworkId = homeworkId;
        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
            console.log("[Admin Homework] Unsubscribed from previous homework listener.");
        }

        const homeworkContent = this.app.elements.homeworkContent;
        const managementButtons = this.app.elements.homeworkManagementButtons;
        const tableBody = this.app.elements.homeworkTableBody;
        const selectedTitle = this.app.elements.selectedHomeworkTitle;
        const selectElement = this.app.elements.homeworkSelect;

        if (!homeworkId) {
            if (homeworkContent) homeworkContent.style.display = 'none';
            if (managementButtons) managementButtons.style.display = 'none';
            if (tableBody) {
                // 학생 필터링이 완료되었는지 확인하고 메시지 표시
                this.filterAndDisplayStudents(this.app.state.selectedClassIdForHomework);
            }
            if (selectedTitle) selectedTitle.textContent = '';
            return;
        }

        if (homeworkContent) homeworkContent.style.display = 'block';
        if (managementButtons) managementButtons.style.display = 'flex';

        const selectedOptionText = selectElement?.options[selectElement.selectedIndex]?.text || '선택된 숙제';
        if (selectedTitle) selectedTitle.textContent = `'${selectedOptionText}' 숙제 제출 현황`;

        if (tableBody) this.renderTableHeader(tableBody, ['학생 이름', '제출 상태', '제출 시간', '관리']);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="loader-small mx-auto"></div> 제출 현황 로딩 중...</td></tr>';

        console.log(`[Admin Homework] Setting up listener for homework submissions: ${homeworkId}`);
        const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef),
            (snapshot) => {
                console.log(`[Admin Homework] Submissions snapshot received for ${homeworkId}. Size: ${snapshot.size}`);
                this.renderHomeworkSubmissions(snapshot);
            },
            (error) => {
                console.error(`[Admin Homework] Error listening to submissions for ${homeworkId}:`, error);
                showToast("숙제 제출 현황 실시간 업데이트 실패", true);
                if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">제출 현황 로딩 실패</td></tr>';
            }
        );
    },

    async deleteHomework() {
        if (!this.app.state.selectedHomeworkId) return;
        const homeworkIdToDelete = this.app.state.selectedHomeworkId;
        const selectElement = this.app.elements.homeworkSelect;
        const hwText = selectElement ? selectElement.options[selectElement.selectedIndex]?.text : `ID: ${homeworkIdToDelete}`;


        if (confirm(`'${hwText}' 숙제를 정말 삭제하시겠습니까? 학생들의 제출 기록도 모두 사라집니다.`)) {
            console.log(`[Admin Homework] Attempting to delete homework: ${homeworkIdToDelete}`);
            const deleteBtn = this.app.elements.deleteHomeworkBtn;
            if (deleteBtn) deleteBtn.disabled = true;

            try {
                const submissionsRef = collection(db, 'homeworks', homeworkIdToDelete, 'submissions');
                const submissionsSnapshot = await getDocs(submissionsRef);
                const batch = writeBatch(db);
                if (!submissionsSnapshot.empty) {
                    console.log(`[Admin Homework] Deleting ${submissionsSnapshot.size} submission(s)...`);
                    submissionsSnapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                }

                const homeworkRef = doc(db, 'homeworks', homeworkIdToDelete);
                batch.delete(homeworkRef);

                await batch.commit();

                showToast("숙제 및 관련 제출 기록이 삭제되었습니다.", false);
                console.log(`[Admin Homework] Homework ${homeworkIdToDelete} and submissions deleted successfully.`);

                this.app.state.selectedHomeworkId = null;
                await this.populateHomeworkSelect();

            } catch (error) {
                console.error("숙제 삭제 실패:", error);
                showToast("숙제 삭제에 실패했습니다. 다시 시도해주세요.", true);
            } finally {
                 if (deleteBtn) deleteBtn.disabled = false;
            }
        }
    },

    async renderHomeworkSubmissions(snapshot) {
        const tableBody = this.app.elements.homeworkTableBody;
        if (!tableBody) {
            console.error("[Admin Homework] Table body not found for rendering submissions.");
            return;
        }

        tableBody.innerHTML = '';

        const studentsMap = this.app.state.studentsInClass;

        // ======[ 학생 목록 로드 상태 재확인 ]======
        if (studentsMap.size === 0) {
            // filterAndDisplayStudents 함수가 아직 실행 중이거나 실패했을 수 있음
            // 메시지는 filterAndDisplayStudents 또는 handleClassSelection에서 표시하므로 여기서는 로딩 스피너만 표시
             tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">학생 목록 확인 중...</td></tr>';
             // studentsLoaded 이벤트 발생 시 이 함수가 다시 호출될 것임
            return;
        }
        // ===================================

        let homeworkData = {};
        let homeworkLoadError = false;
        try {
            if (this.app.state.selectedHomeworkId) {
                const homeworkDoc = await getDoc(doc(db, 'homeworks', this.app.state.selectedHomeworkId));
                if (homeworkDoc.exists()) {
                    homeworkData = homeworkDoc.data();
                } else {
                     console.warn(`[Admin Homework] Selected homework document ${this.app.state.selectedHomeworkId} not found.`);
                     tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">선택한 숙제 정보를 찾을 수 없습니다.</td></tr>';
                     return;
                }
            } else {
                 tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>';
                 return;
            }
        } catch (error) {
            console.error("숙제 정보 로드 실패(in render):", error);
            homeworkLoadError = true;
        }

        if (homeworkLoadError) {
             tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">숙제 정보 로딩 실패</td></tr>';
             return;
        }

        const textbookName = homeworkData.textbookName || '알 수 없는 교재';
        const totalPages = homeworkData.pages;

        const submissionsMap = new Map();
        snapshot.docs.forEach(doc => {
            submissionsMap.set(doc.id, doc.data());
        });

        const sortedStudents = Array.from(studentsMap.entries()).sort(([, a], [, b]) => a.localeCompare(b));

        if (sortedStudents.length === 0) {
             tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">표시할 학생 데이터가 없습니다.</td></tr>';
             return;
        }

        sortedStudents.forEach(([studentDocId, studentName]) => { // Key는 Firestore 문서 ID
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';

            // 학생 문서 ID(studentDocId)로 제출 정보 조회
            // 학생 앱에서 익명 UID로 저장하므로, 이 studentDocId와 제출 문서 ID가 다를 수 있음.
            // 관리자 앱에서는 학생 이름만 보여주면 되므로, 학생 목록 기준으로 루프 돌고 제출 데이터 매칭 시도
            // TODO: 제출 데이터 조회 방식을 학생 UID 기준으로 변경해야 함 (studentAuthUid를 studentDocId 대신 사용)
            // 현재 코드에서는 학생 문서 ID와 제출 문서 ID가 다르므로 매칭 안됨. 임시로 항상 미제출로 표시될 것임.

            // ======[ 임시 수정: 제출 Map에서 학생 이름으로 조회 (동명이인 문제 가능성 있음) ]======
            // 이상적으로는 studentsInClass Map의 key가 학생의 Auth UID여야 함.
            // 현재는 student 문서 ID이므로, 임시 방편으로 이름으로 매칭 시도.
            let submissionData = null;
            for (const [submitterUid, data] of submissionsMap.entries()) {
                 if (data.studentName === studentName) {
                     submissionData = data;
                     break; // 첫 번째 매칭되는 데이터 사용
                 }
            }
             // ===============================================================

            let statusHtml, submittedAtHtml, actionHtml;

            if (submissionData) {
                const submittedAtRaw = submissionData.submittedAt;
                const submittedAt = (submittedAtRaw && typeof submittedAtRaw.toDate === 'function')
                                     ? submittedAtRaw.toDate().toLocaleString('ko-KR')
                                     : '시간 정보 없음';
                const submittedPages = submissionData.imageUrls?.length || 0;
                const isTotalPagesValid = typeof totalPages === 'number' && totalPages > 0;
                const isComplete = isTotalPagesValid && submittedPages >= totalPages;
                const statusClass = isComplete ? 'text-green-600 font-semibold' : 'text-yellow-600 font-semibold';
                const pagesInfo = isTotalPagesValid ? `(${submittedPages}/${totalPages}p)` : `(${submittedPages}p)`;

                statusHtml = `<td class="px-6 py-4 ${statusClass}">${isComplete ? `제출 완료 ${pagesInfo}` : `제출 중 ${pagesInfo}`}</td>`;
                submittedAtHtml = `<td class="px-6 py-4">${submittedAt}</td>`;
                actionHtml = `<td class="px-6 py-4"><button class="download-btn text-xs bg-blue-600 text-white font-semibold px-3 py-1 rounded-lg hover:bg-blue-700 transition">전체 다운로드</button></td>`;

            } else {
                const statusClass = 'text-slate-400';
                 const isTotalPagesValid = typeof totalPages === 'number' && totalPages > 0;
                const pagesInfo = isTotalPagesValid ? `(0/${totalPages}p)` : '';
                statusHtml = `<td class="px-6 py-4 ${statusClass}">미제출 ${pagesInfo}</td>`;
                submittedAtHtml = `<td class="px-6 py-4">-</td>`;
                actionHtml = `<td class="px-6 py-4"></td>`;
            }

            row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${studentName}</td>${statusHtml}${submittedAtHtml}${actionHtml}`;
            tableBody.appendChild(row);
            if (submissionData) {
                // 다운로드 버튼 이벤트 리스너는 submissionData가 있을 때만 추가
                row.querySelector('.download-btn')?.addEventListener('click', () => this.downloadHomework(submissionData, textbookName, studentName));
            }
        });
        console.log("[Admin Homework] Homework submissions rendered.");
    },


    // 다운로드 함수 (이전과 동일)
    async downloadHomework(submissionData, textbookName, studentName) {
        if (!submissionData || !submissionData.imageUrls || submissionData.imageUrls.length === 0) {
            showToast("다운로드할 이미지가 없습니다.");
            return;
        }

        showToast(`'${studentName}' 학생 숙제 다운로드 시작...`, false);
        const { submittedAt, imageUrls } = submissionData;
        const date = submittedAt?.toDate()?.toISOString().split('T')[0] || 'unknown_date';
        const className = this.app.state.classes.find(c => c.id === this.app.state.selectedClassIdForHomework)?.name || 'unknown_class';

        for (let i = 0; i < imageUrls.length; i++) {
            const url = imageUrls[i];
            const fileName = `${date}_${className}_${studentName}_${textbookName}_${i+1}.jpg`;
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const blob = await response.blob();
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = fileName;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(link.href);
                 await new Promise(resolve => setTimeout(resolve, 100)); // 약간의 지연
            } catch (error) {
                console.error(`다운로드 실패: ${fileName}`, error);
                showToast(`${fileName} 다운로드에 실패했습니다. (오류: ${error.message})`, true);
                 // 한 파일 실패해도 다음 파일 시도
            }
        }
        showToast(`'${studentName}' 학생 숙제 다운로드 완료.`, false);
    },

    // 테이블 헤더 렌더링 (이전과 동일)
    renderTableHeader(tableBody, headers) { // 변수명 tbody -> tableBody
        const table = tableBody?.parentElement;
        if (!table) return;
        table.querySelector('thead')?.remove();
        const thead = document.createElement('thead');
        thead.className = 'text-xs text-gray-700 uppercase bg-gray-50';
        let headerHtml = '<tr>';
        headers.forEach(h => headerHtml += `<th scope="col" class="px-6 py-3">${h}</th>`);
        headerHtml += '</tr>';
        thead.innerHTML = headerHtml;
        table.insertBefore(thead, tableBody); // 변수명 tbody -> tableBody
    },
};