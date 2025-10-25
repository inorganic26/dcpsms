// src/teacher/classEditor.js

// ✨ 공통 모듈 import
import { createClassEditor } from '../shared/classEditor.js';
// (Firestore 관련 import는 공통 모듈로 이동)
// import { doc, getDocs, collection, updateDoc, ... } from "firebase/firestore";
// import { db } from '../shared/firebase.js';
// import { showToast } from '../shared/utils.js';

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

    // ✨ openEditClassModal, closeEditClassModal, saveClassChanges, renderSubjectsForEditing 함수는
    // 공통 모듈로 이동했으므로 여기서 삭제합니다.

    // --- (과목/교재 관리 모달 함수들은 TeacherApp 고유 기능이므로 그대로 유지) ---
    openSubjectTextbookMgmtModal() { /* ... 기존 로직 ... */ },
    closeSubjectTextbookMgmtModal() { /* ... 기존 로직 ... */ },
    async addNewSubject() { /* ... 기존 로직 ... */ },
    async deleteSubject(subjectId) { /* ... 기존 로직 ... */ },
    renderSubjectListForMgmt() { /* ... 기존 로직 ... */ },
    populateSubjectSelectForTextbookMgmt() { /* ... 기존 로직 ... */ },
    handleSubjectSelectForTextbookMgmt(subjectId) { /* ... 기존 로직 ... */ },
    listenForTextbooks(subjectId) { /* ... 기존 로직 ... */ },
    renderTextbookListForMgmt(textbooks, subjectId) { /* ... 기존 로직 ... */ },
    async addNewTextbook() { /* ... 기존 로직 ... */ },
    async deleteTextbook(subjectId, textbookId) { /* ... 기존 로직 ... */ },

}; // classEditor 객체 끝