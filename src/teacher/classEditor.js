// src/teacher/classEditor.js

// ✨ 공통 모듈 import
import { createClassEditor } from '../shared/classEditor.js';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, query, getDocs, writeBatch } from "firebase/firestore"; // Firestore import 추가
import { db } from '../shared/firebase.js'; // db import 추가
import { showToast } from '../shared/utils.js'; // showToast import 추가

// ✨ 선생님 앱의 HTML 요소 ID 맵
const teacherClassEditorConfig = {
    app: null, // app 인스턴스는 init 시 주입됨
    elements: {
        editClassModal: 'teacher-edit-class-modal',
        editClassName: 'teacher-edit-class-name',
        closeEditClassModalBtn: 'teacher-close-edit-class-modal-btn',
        cancelEditClassBtn: 'teacher-cancel-edit-class-btn',
        saveClassEditBtn: 'teacher-save-class-edit-btn',
        editClassSubjectsContainer: 'teacher-edit-class-subjects-and-textbooks',
        editClassTypeSelect: 'teacher-edit-class-type',
        // (관리자 전용 요소는 여기에 없음)
    }
};

export const classEditor = {
    managerInstance: null, // ✨ 공통 매니저 인스턴스
    app: null, // TeacherApp 인스턴스 참조
    // 과목/교재 관리 모달 상태 추적용 (선택적)
    _selectedSubjectIdForMgmt: null,

    init(app) {
        this.app = app; // TeacherApp 인스턴스 저장
        teacherClassEditorConfig.app = app; // config에도 앱 인스턴스 주입

        // ✨ 공통 매니저 생성 (init은 내부에서 호출됨)
        this.managerInstance = createClassEditor(teacherClassEditorConfig);

        // --- 선생님 앱 전용 이벤트 리스너 연결 ---

        // '반 특성/과목/교재 설정 변경' 버튼 클릭 시
        this.app.elements.editClassBtn?.addEventListener('click', () => {
            if (!this.app.state.selectedClassData) {
                showToast("수정할 반 정보가 없습니다. 반을 먼저 선택해주세요.");
                return;
            }
            // ✨ 공통 모듈을 호출하기 전, 수정할 대상 설정
            this.app.state.editingClass = this.app.state.selectedClassData;
            this.managerInstance.openEditClassModal();
        });

        // '과목/교재 관리' 버튼 클릭 시 (이 로직은 TeacherApp에 고유하므로 유지)
        this.app.elements.manageSubjectsTextbooksBtn?.addEventListener('click', () => this.openSubjectTextbookMgmtModal());

        // ✨ 저장 버튼 클릭 시 (공통 모듈 호출 + 앱 고유 후속 처리)
        document.getElementById(teacherClassEditorConfig.elements.saveClassEditBtn)?.addEventListener('click', async () => {
            const success = await this.managerInstance.saveClassChanges();
            if (success) {
                // ✨ 저장 성공 후 TeacherApp의 상태 갱신
                await this.app.fetchClassData(this.app.state.selectedClassId);
                this.app.displayCurrentClassInfo(); // UI 갱신
                this.app.showDashboardMenu(); // 메뉴 갱신 (현강반/자기주도반)
            }
        });

        // --- 과목/교재 관리 모달 관련 리스너 (기존 로직 유지) ---
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
    },

    // ✨✨✨ 헬퍼 함수 추가: 과목/교재 관리 모달이 열려 있는지 확인 ✨✨✨
    isSubjectTextbookMgmtModalOpen() {
        const modal = this.app.elements.subjectTextbookMgmtModal;
        return modal && modal.style.display === 'flex';
    },
    // ✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨

    // ✨ openEditClassModal, closeEditClassModal, saveClassChanges, renderSubjectsForEditing 함수는
    // 공통 모듈로 이동했으므로 여기서 삭제합니다.

    // --- (과목/교재 관리 모달 함수들은 TeacherApp 고유 기능이므로 그대로 유지) ---
    openSubjectTextbookMgmtModal() {
        if (!this.app.elements.subjectTextbookMgmtModal) return;
        this.app.elements.subjectTextbookMgmtModal.style.display = 'flex';
        document.body.classList.add('modal-open');
        this.renderSubjectListForMgmt(); // 과목 목록 렌더링
        this.populateSubjectSelectForTextbookMgmt(); // 교재용 과목 선택 채우기
        // 모달 열 때 교재 관리 부분 초기화
        this.handleSubjectSelectForTextbookMgmt('');
    },
    closeSubjectTextbookMgmtModal() {
        if (!this.app.elements.subjectTextbookMgmtModal) return;
        this.app.elements.subjectTextbookMgmtModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        this._selectedSubjectIdForMgmt = null; // 선택된 과목 ID 초기화
    },
    async addNewSubject() {
        const input = document.getElementById('teacher-new-subject-name');
        if (!input) return;
        const subjectName = input.value.trim();
        if (!subjectName) { showToast("과목 이름을 입력해주세요."); return; }
        try {
            await addDoc(collection(db, 'subjects'), { name: subjectName, createdAt: serverTimestamp() });
            showToast("새 과목 추가 완료.", false);
            input.value = '';
            // 과목 목록은 onSnapshot으로 자동 갱신됨
        } catch (error) { showToast("과목 추가 실패."); }
    },
    async deleteSubject(subjectId) {
        if (!confirm("과목을 삭제하면 해당 과목의 학습 세트, 교재 정보도 모두 삭제됩니다. 계속하시겠습니까?")) return;
        try {
            const batch = writeBatch(db);
            // 학습 세트 삭제
            const lessonsRef = collection(db, 'subjects', subjectId, 'lessons');
            const lessonsSnapshot = await getDocs(lessonsRef);
            lessonsSnapshot.forEach(doc => batch.delete(doc.ref));
            // 교재 삭제
            const textbooksRef = collection(db, 'subjects', subjectId, 'textbooks');
            const textbooksSnapshot = await getDocs(textbooksRef);
            textbooksSnapshot.forEach(doc => batch.delete(doc.ref));
            // 과목 삭제
            batch.delete(doc(db, 'subjects', subjectId));
            await batch.commit();
            showToast("과목 및 관련 데이터 삭제 완료.", false);
             // 교재용 과목 선택 드롭다운 갱신
            this.populateSubjectSelectForTextbookMgmt();
            // 현재 선택된 과목이 삭제된 것이면 교재 목록 초기화
            if (this._selectedSubjectIdForMgmt === subjectId) {
                 this.handleSubjectSelectForTextbookMgmt('');
            }
        } catch (error) { showToast("과목 삭제 실패."); }
    },
    renderSubjectListForMgmt() {
        const listEl = document.getElementById('teacher-subjects-list-mgmt');
        if (!listEl) return;
        listEl.innerHTML = '';
        if (!this.app.state.subjects || this.app.state.subjects.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 과목 없음</p>'; return;
        }
        this.app.state.subjects.forEach(sub => {
            const div = document.createElement('div');
            div.className = "p-2 border rounded-md flex items-center justify-between";
            div.innerHTML = `<span>${sub.name}</span> <button data-id="${sub.id}" class="delete-subject-btn text-red-500 text-xs font-bold">삭제</button>`;
            listEl.appendChild(div);
        });
    },
    populateSubjectSelectForTextbookMgmt() {
        const select = document.getElementById('teacher-subject-select-for-textbook-mgmt');
        if (!select) return;
        const currentSelection = this._selectedSubjectIdForMgmt || select.value; // 현재 선택값 유지 시도
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        if (!this.app.state.subjects || this.app.state.subjects.length === 0) {
            select.innerHTML += '<option value="" disabled>과목 없음</option>'; return;
        }
        this.app.state.subjects.forEach(sub => {
            select.innerHTML += `<option value="${sub.id}">${sub.name}</option>`;
        });
        // 현재 선택값 복원 시도
        if (currentSelection && this.app.state.subjects.some(s => s.id === currentSelection)) {
             select.value = currentSelection;
        } else {
             select.value = ''; // 목록에 없으면 초기화
             this._selectedSubjectIdForMgmt = null;
        }
    },
    handleSubjectSelectForTextbookMgmt(subjectId) {
        this._selectedSubjectIdForMgmt = subjectId; // 상태 업데이트
        const contentEl = document.getElementById('teacher-textbook-management-content');
        const listEl = document.getElementById('teacher-textbooks-list-mgmt');
        if (!contentEl || !listEl) return;
        if (subjectId) {
            contentEl.style.display = 'block';
            listEl.innerHTML = '<p class="text-sm text-slate-400">교재 목록 로딩 중...</p>';
            this.listenForTextbooks(subjectId); // 해당 과목 교재 리스너 시작
        } else {
            contentEl.style.display = 'none';
            listEl.innerHTML = '<p class="text-sm text-slate-400">과목을 선택해주세요.</p>';
        }
        // 새 교재 이름 입력 필드 초기화
        const textbookInput = document.getElementById('teacher-new-textbook-name');
        if(textbookInput) textbookInput.value = '';
    },
    listenForTextbooks(subjectId) {
        if (!subjectId) return;
        const q = query(collection(db, `subjects/${subjectId}/textbooks`));
        // 기존 리스너가 있다면 해제 (선택적: 여기서는 매번 새로 설정)
        // if (this.textbookUnsubscribe) this.textbookUnsubscribe();
        onSnapshot(q, (snapshot) => {
            const textbooks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            this.renderTextbookListForMgmt(textbooks, subjectId);
        });
    },
    renderTextbookListForMgmt(textbooks, subjectId) {
         const listEl = document.getElementById('teacher-textbooks-list-mgmt');
         if (!listEl || this._selectedSubjectIdForMgmt !== subjectId) return; // 현재 선택된 과목과 다르면 렌더링 안 함
         listEl.innerHTML = '';
         if (textbooks.length === 0) {
             listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교재 없음</p>'; return;
         }
         textbooks.forEach(book => {
             const div = document.createElement('div');
             div.className = "p-2 border rounded-md flex items-center justify-between";
             // 삭제 버튼에 subjectId도 포함
             div.innerHTML = `<span>${book.name}</span> <button data-id="${book.id}" data-subject-id="${subjectId}" class="delete-textbook-btn text-red-500 text-xs font-bold">삭제</button>`;
             listEl.appendChild(div);
         });
    },
    async addNewTextbook() {
         const subjectId = this._selectedSubjectIdForMgmt;
         const input = document.getElementById('teacher-new-textbook-name');
         if (!input || !subjectId) { showToast("과목을 먼저 선택하세요."); return; }
         const textbookName = input.value.trim();
         if (!textbookName) { showToast("교재 이름을 입력하세요."); return; }
         try {
             await addDoc(collection(db, `subjects/${subjectId}/textbooks`), { name: textbookName });
             showToast("새 교재 추가 완료.", false);
             input.value = '';
             // 목록은 onSnapshot으로 자동 갱신됨
         } catch (error) { showToast("교재 추가 실패."); }
    },
    async deleteTextbook(subjectId, textbookId) {
         if (!confirm("교재를 삭제하시겠습니까?")) return;
         try {
             await deleteDoc(doc(db, `subjects/${subjectId}/textbooks`, textbookId));
             showToast("교재 삭제 완료.", false);
             // 목록은 onSnapshot으로 자동 갱신됨
         } catch (error) { showToast("교재 삭제 실패."); }
    },

}; // classEditor 객체 끝