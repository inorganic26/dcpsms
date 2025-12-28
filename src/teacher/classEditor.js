// src/teacher/classEditor.js

import { createClassEditor } from '../shared/classEditor.js';
import { showToast } from '../shared/utils.js';

// ID 맵 정의
const config = {
    app: null,
    elements: {
        editClassModal: 'teacher-edit-class-modal',
        editClassName: 'teacher-edit-class-name',
        closeEditClassModalBtn: 'teacher-close-edit-class-modal-btn',
        cancelEditClassBtn: 'teacher-cancel-edit-class-btn',
        saveClassEditBtn: 'teacher-save-class-edit-btn',
        editClassSubjectsContainer: 'teacher-edit-class-subjects-and-textbooks',
        editClassTypeSelect: 'teacher-edit-class-type',
    }
};

export const classEditor = {
    managerInstance: null,
    app: null,

    init(app) {
        this.app = app;
        config.app = app;
        this.managerInstance = createClassEditor(config);

        // 이벤트 연결
        document.getElementById('teacher-edit-class-btn')?.addEventListener('click', () => {
            if (!this.app.state.selectedClassData) { showToast("반 정보 없음"); return; }
            this.app.state.editingClass = this.app.state.selectedClassData;
            this.managerInstance.openEditClassModal();
        });

        document.getElementById('teacher-manage-subjects-textbooks-btn')?.addEventListener('click', () => {
            // subjectTextbookManager로 위임 (여기선 호출만)
            import('./subjectTextbookManager.js').then(m => m.subjectTextbookManager.openModal());
        });

        document.getElementById('teacher-save-class-edit-btn')?.addEventListener('click', async () => {
            const success = await this.managerInstance.saveClassChanges();
            if (success) {
                await this.app.fetchClassData(this.app.state.selectedClassId);
                this.app.displayCurrentClassInfo();
            }
        });
    }
};