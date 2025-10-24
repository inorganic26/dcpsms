// src/admin/adminHomeworkDashboard.js

import { collection, onSnapshot, doc, deleteDoc, query, getDocs, getDoc, addDoc, serverTimestamp, where, orderBy, updateDoc, writeBatch } from "firebase/firestore"; // writeBatch 추가
import { db } from '../shared/firebase.js'; // firebase.js 경로 확인
import { showToast } from '../shared/utils.js';

export const adminHomeworkDashboard = {
    unsubscribe: null,

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
                // handleClassSelection 함수를 수동으로 호출하여 해당 반의 데이터 로드 시작
                // 이벤트 객체를 모방하여 전달 (실제 이벤트가 아니므로 target만 필요)
                this.handleClassSelection({ target: classSelect });
            } else {
                // 첫 반 ID가 없는 예외적인 경우 초기화
                this.app.state.selectedClassIdForHomework = null;
                this.app.state.studentsInClass.clear();
                this.resetUIState();
            }
        } else {
            // 반 목록이 없거나 로딩 중인 경우 초기화
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

    // 관리자용 반 선택 드롭다운 채우기 (수정됨: 자동 선택 로직 제거)
    populateClassSelect() {
        const select = this.app.elements.homeworkClassSelect;
        if (!select) return;

        // 임시로 로딩 메시지 추가 (classesUpdated 이벤트 전에 호출될 수 있음)
        select.innerHTML = '<option value="">-- 반 로딩 중... --</option>';
        select.disabled = true;

        if (!this.app.state.classes || this.app.state.classes.length === 0) {
            select.innerHTML = '<option value="">-- 등록된 반 없음 --</option>';
            // select.disabled = true; // 이미 비활성화됨
            console.log("[Admin Homework] No classes available to populate.");
            return;
        }

        select.innerHTML = '<option value="">-- 반을 선택하세요 --</option>'; // 로딩 완료 후 기본 옵션
        select.disabled = false;
        // 이름순으로 정렬된 반 목록 사용 (classManager에서 정렬됨)
        this.app.state.classes.forEach(cls => {
            select.innerHTML += `<option value="${cls.id}">${cls.name}</option>`;
        });

         console.log("[Admin Homework] Class select populated.");
         // initView에서 자동 선택 및 이벤트 발생을 처리하므로 여기서는 값 설정 안 함
    },

    // 관리자용 반 선택 핸들러 (수정됨: 로딩 확인 강화)
    async handleClassSelection(event) {
        // 이벤트 객체에서 실제 select 요소 가져오기
        const selectElement = event.target;
        const newClassId = selectElement.value; // 선택된 값 가져오기

        console.log(`[Admin Homework] Class selected: ${newClassId || 'None'}`);
        this.app.state.selectedClassIdForHomework = newClassId;
        this.app.state.selectedHomeworkId = null; // 숙제 선택 초기화
        this.app.state.studentsInClass.clear(); // 선택된 반 학생 목록 초기화

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
        if (assignHomeworkBtn) assignHomeworkBtn.disabled = true; // 반 미선택 시 출제 버튼 비활성화
        this.handleHomeworkSelection(''); // 숙제 관련 UI 초기화

        // 반 선택 해제 시 함수 종료
        if (!newClassId) {
            console.log("[Admin Homework] Class selection cleared.");
            return;
        }

        // 반 선택 시 UI 업데이트 및 로딩 상태 표시
        if (homeworkMainContent) homeworkMainContent.style.display = 'block'; // 메인 콘텐츠 표시
        if (assignHomeworkBtn) assignHomeworkBtn.disabled = false; // 반 선택 시 출제 버튼 활성화
        if (homeworkSelect) {
            homeworkSelect.innerHTML = '<option value="">-- 숙제 로딩 중... --</option>';
            homeworkSelect.disabled = true;
        }
        if (homeworkTableBody) homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="loader-small mx-auto"></div> 학생 목록 확인 중...</td></tr>'; // 테이블 로딩 표시

        // --- 학생 목록 로드 확인 및 필터링 ---
        try {
            // studentManager가 로드한 전체 학생 목록 확인
            const allStudents = this.app.state.students;

            // 아직 로드되지 않았거나 비어있는 경우
            if (!allStudents || allStudents.length === 0) {
                console.warn("[Admin Homework] 전체 학생 목록이 아직 준비되지 않았습니다.");
                 if (homeworkTableBody) homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-orange-500">전체 학생 목록 로딩 중... 잠시 후 숙제를 선택해주세요.</td></tr>';
                 // 학생 목록 로드는 studentManager에서 비동기로 진행되므로, 여기서는 기다리지 않고 숙제 로드로 넘어감.
                 // 숙제 현황 표시(renderHomeworkSubmissions) 시점에 학생 목록을 다시 확인.
            } else {
                // 학생 목록이 있으면 필터링 진행
                allStudents.forEach(student => {
                    // student 객체와 classId 유효성 검사 추가
                    if (student && student.classId === newClassId) {
                        // 학생 ID를 키로 사용 (Firestore 문서 ID)
                        this.app.state.studentsInClass.set(student.id, student.name);
                    }
                });
                console.log(`[Admin Homework] Filtered students for class ${newClassId}. Count: ${this.app.state.studentsInClass.size}`);
                 // 학생 필터링 후 테이블 초기 메시지 설정 (숙제 선택 전)
                 if (homeworkTableBody) {
                    if (this.app.state.studentsInClass.size === 0) {
                        homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다. [반 배정 관리]에서 학생을 추가해주세요.</td></tr>';
                    } else {
                        homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>'; // 학생은 있으나 숙제 미선택
                    }
                 }
            }

            // 학생 목록 상태와 관계없이 숙제 목록 로드 시도
            await this.populateHomeworkSelect();

        } catch (error) {
            console.error("[Admin Homework] Error during class selection handling:", error);
            showToast("반 선택 처리 중 오류 발생", true);
            if (homeworkTableBody) homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">오류 발생: 학생/숙제 목록 로딩 실패</td></tr>';
            if (homeworkSelect) {
                homeworkSelect.innerHTML = '<option value="">-- 로드 실패 --</option>';
                homeworkSelect.disabled = true;
            }
        }
        // finally 블록 제거: populateHomeworkSelect 내에서 최종 상태 처리
    },


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

    // 숙제 선택 드롭다운 채우기 (로딩 상태 처리 강화)
    async populateHomeworkSelect() {
        const select = this.app.elements.homeworkSelect;
        if (!select) return;

        // 초기화 및 로딩 시작 상태
        select.innerHTML = '<option value="">-- 로딩 중... --</option>';
        select.disabled = true;
        // 연결된 UI 초기화
        if (this.app.elements.homeworkContent) this.app.elements.homeworkContent.style.display = 'none';
        if (this.app.elements.homeworkManagementButtons) this.app.elements.homeworkManagementButtons.style.display = 'none';
        if (this.app.elements.homeworkTableBody) this.app.elements.homeworkTableBody.innerHTML = ''; // 테이블 내용도 초기화

        const classId = this.app.state.selectedClassIdForHomework;
        if (!classId) {
            select.innerHTML = '<option value="">-- 반 선택 필요 --</option>';
            // select.disabled = true; // 이미 위에서 true로 설정됨
            return;
        }

        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);

            select.innerHTML = '<option value="">-- 숙제 선택 --</option>'; // 로딩 완료 후 기본 옵션
            if (snapshot.empty) {
                 select.innerHTML += '<option value="" disabled>출제된 숙제 없음</option>';
                 // 데이터가 없으므로 테이블에 메시지 표시
                 if (this.app.elements.homeworkTableBody) {
                    // 학생 목록 상태에 따라 다른 메시지 표시
                    if (this.app.state.studentsInClass.size > 0) {
                        this.app.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">이 반에는 출제된 숙제가 없습니다.</td></tr>';
                    } else {
                        // 학생 목록 로딩 중 메시지는 handleClassSelection 에서 처리
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
                 // 숙제가 있으면 테이블에 안내 메시지 표시 (숙제 선택 유도)
                 if (this.app.elements.homeworkTableBody) {
                    this.app.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>';
                 }
            }
        } catch (error) {
             console.error("Error populating homework select:", error);
             select.innerHTML = '<option value="">-- 로드 실패 --</option>';
             showToast("숙제 목록 로딩 실패", true);
             if (this.app.elements.homeworkTableBody) {
                 this.app.elements.homeworkTableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-red-500">숙제 목록 로딩 실패</td></tr>';
             }
        } finally {
             select.disabled = false; // 로딩 완료/실패 후 활성화
             // 반 변경 시에는 handleClassSelection에서 초기화하므로 여기서는 호출 안 함
             // this.handleHomeworkSelection('');
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

        // 숙제 선택 해제 시 UI 초기화
        if (!homeworkId) {
            if (homeworkContent) homeworkContent.style.display = 'none';
            if (managementButtons) managementButtons.style.display = 'none';
            if (tableBody) {
                // 반에 학생이 있는지 확인 후 메시지 표시
                if (this.app.state.studentsInClass.size > 0) {
                     tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">숙제를 선택해주세요.</td></tr>';
                } else if (this.app.state.selectedClassIdForHomework) {
                     tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다.</td></tr>';
                } else {
                     tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">먼저 반을 선택해주세요.</td></tr>';
                }
            }
            if (selectedTitle) selectedTitle.textContent = ''; // 제목 비우기
            return;
        }

        // 숙제 선택 시 UI 업데이트 및 데이터 로딩 시작
        if (homeworkContent) homeworkContent.style.display = 'block';
        if (managementButtons) managementButtons.style.display = 'flex';

        // 선택된 숙제 제목 표시
        const selectedOptionText = selectElement?.options[selectElement.selectedIndex]?.text || '선택된 숙제';
        if (selectedTitle) selectedTitle.textContent = `'${selectedOptionText}' 숙제 제출 현황`;

        // 테이블 헤더 렌더링
        if (tableBody) this.renderTableHeader(tableBody, ['학생 이름', '제출 상태', '제출 시간', '관리']);

        // 테이블 내용 로딩 상태 표시
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8"><div class="loader-small mx-auto"></div> 제출 현황 로딩 중...</td></tr>';

        // 제출 현황 실시간 리스너 설정
        console.log(`[Admin Homework] Setting up listener for homework submissions: ${homeworkId}`);
        const submissionsRef = collection(db, 'homeworks', homeworkId, 'submissions');
        this.unsubscribe = onSnapshot(query(submissionsRef),
            (snapshot) => {
                console.log(`[Admin Homework] Submissions snapshot received for ${homeworkId}. Size: ${snapshot.size}`);
                this.renderHomeworkSubmissions(snapshot); // 스냅샷 받을 때마다 테이블 업데이트
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
            if (deleteBtn) deleteBtn.disabled = true; // 삭제 시작 시 버튼 비활성화

            try {
                // 하위 컬렉션(submissions)의 모든 문서를 먼저 삭제 (batch 사용)
                const submissionsRef = collection(db, 'homeworks', homeworkIdToDelete, 'submissions');
                const submissionsSnapshot = await getDocs(submissionsRef);
                const batch = writeBatch(db);
                if (!submissionsSnapshot.empty) {
                    console.log(`[Admin Homework] Deleting ${submissionsSnapshot.size} submission(s)...`);
                    submissionsSnapshot.forEach(doc => {
                        batch.delete(doc.ref);
                    });
                }

                // 숙제 문서 삭제 추가
                const homeworkRef = doc(db, 'homeworks', homeworkIdToDelete);
                batch.delete(homeworkRef);

                // Batch 실행
                await batch.commit();

                showToast("숙제 및 관련 제출 기록이 삭제되었습니다.", false);
                console.log(`[Admin Homework] Homework ${homeworkIdToDelete} and submissions deleted successfully.`);

                // 상태 초기화 및 UI 업데이트
                this.app.state.selectedHomeworkId = null;
                await this.populateHomeworkSelect(); // 숙제 목록 새로고침
                // handleHomeworkSelection(''); // populateHomeworkSelect 내부에서 호출됨

            } catch (error) {
                console.error("숙제 삭제 실패:", error);
                showToast("숙제 삭제에 실패했습니다. 다시 시도해주세요.", true);
            } finally {
                 if (deleteBtn) deleteBtn.disabled = false; // 완료 후 버튼 활성화
            }
        }
    },

    // 제출 현황 렌더링 (로딩 확인 로직 강화)
    async renderHomeworkSubmissions(snapshot) {
        const tableBody = this.app.elements.homeworkTableBody; // 변수명 tbody -> tableBody
        if (!tableBody) {
            console.error("[Admin Homework] Table body not found for rendering submissions.");
            return;
        }

        tableBody.innerHTML = ''; // Clear previous rows

        // 선택된 반의 학생 목록 가져오기 (adminApp 상태 사용 - handleClassSelection에서 채워짐)
        const studentsMap = this.app.state.studentsInClass;

        // 학생 목록 로딩 상태 확인 (handleClassSelection에서 실패했거나 아직 로딩 중일 수 있음)
        const allStudents = this.app.state.students;
        if (!allStudents || allStudents.length === 0) {
             // 전체 학생 목록이 로딩 안됐으면 대기 메시지
             tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-orange-500">전체 학생 목록 로딩 중...</td></tr>';
             return;
        }

        // studentsInClass가 비어있는 경우 (필터링 후 학생이 없는 경우)
        if (studentsMap.size === 0) {
            if (this.app.state.selectedClassIdForHomework) {
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">이 반에 배정된 학생이 없습니다.</td></tr>';
            } else {
                 // 이 경우는 이론상 발생하기 어려움 (반 선택 후 숙제 선택 가능)
                tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-400">반을 선택해주세요.</td></tr>';
            }
            return;
        }

        // 숙제 정보 가져오기 (총 페이지 수 등)
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
                 // 숙제가 선택되지 않은 경우
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

        // 제출 정보 Map 생성 (빠른 조회를 위해)
        const submissionsMap = new Map();
        snapshot.docs.forEach(doc => {
            // Firestore 문서 ID가 학생의 Auth UID와 일치하는지 확인
            submissionsMap.set(doc.id, doc.data());
        });

        // 반 학생 목록 기준으로 테이블 행 생성 (이름순 정렬)
        const sortedStudents = Array.from(studentsMap.entries()).sort(([, a], [, b]) => a.localeCompare(b));

        if (sortedStudents.length === 0) {
             // 이 경우는 studentsMap.size === 0 에서 이미 처리되었어야 함
             tableBody.innerHTML = '<tr><td colspan="4" class="text-center py-8 text-slate-500">표시할 학생 데이터가 없습니다.</td></tr>';
             return;
        }

        sortedStudents.forEach(([studentAuthUid, studentName]) => { // Key가 학생 ID (Firestore 문서 ID)
            const row = document.createElement('tr');
            row.className = 'bg-white border-b hover:bg-slate-50';

            // 학생 ID(studentAuthUid)로 제출 정보 조회
            const submissionData = submissionsMap.get(studentAuthUid);

            let statusHtml, submittedAtHtml, actionHtml;

            if (submissionData) {
                const submittedAtRaw = submissionData.submittedAt;
                // Firestore Timestamp 객체인지 확인 후 변환
                const submittedAt = (submittedAtRaw && typeof submittedAtRaw.toDate === 'function')
                                     ? submittedAtRaw.toDate().toLocaleString('ko-KR') // 한국 시간 형식
                                     : '시간 정보 없음';
                const submittedPages = submissionData.imageUrls?.length || 0;
                // totalPages가 유효한 숫자인지 확인
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
                actionHtml = `<td class="px-6 py-4"></td>`; // 미제출 시 액션 없음
            }

            row.innerHTML = `<td class="px-6 py-4 font-medium text-slate-900">${studentName}</td>${statusHtml}${submittedAtHtml}${actionHtml}`;
            tableBody.appendChild(row); // 변수명 tbody -> tableBody
            if (submissionData) {
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