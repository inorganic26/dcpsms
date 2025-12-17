// src/shared/classEditor.js

import { collection, doc, updateDoc, getDocs, query, orderBy, where } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

// ✨ 선생님/관리자 공용 반 편집 기능
export const classEditor = {
    app: null,
    elements: {},

    init(app) {
        this.app = app;
        this.elements = app.elements; // app.elements를 공유받음

        this.elements.editClassBtn?.addEventListener('click', () => this.openEditClassModal());
        this.elements.closeEditClassModalBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.elements.cancelEditClassBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.elements.saveClassEditBtn?.addEventListener('click', () => this.saveClassChanges());
    },

    async openEditClassModal() {
        const classData = this.app.state.selectedClassData;
        if (!classData) {
            showToast("반 정보가 없습니다.");
            return;
        }

        const modal = this.elements.editClassModal;
        const nameSpan = this.elements.editClassName;
        const typeSelect = this.elements.editClassTypeSelect;

        nameSpan.textContent = classData.name;
        typeSelect.value = classData.classType || 'live-lecture';

        await this.renderSubjectSettings(classData.subjects || {});
        modal.style.display = 'flex';
    },

    closeEditClassModal() {
        if (this.elements.editClassModal) this.elements.editClassModal.style.display = 'none';
    },

    // ✨ [핵심 수정] 최상위 textbooks 컬렉션 조회
    async renderSubjectSettings(currentSubjects) {
        const container = this.elements.editClassSubjectsContainer;
        if (!container) return;
        container.innerHTML = '<p class="text-sm text-gray-500">과목 및 교재 목록 로딩 중...</p>';

        try {
            // 1. 모든 과목 가져오기
            const subjects = this.app.state.subjects || [];
            
            // 2. 모든 교재 가져오기 (최상위 컬렉션)
            const q = query(collection(db, 'textbooks'), orderBy('name'));
            const textbookSnap = await getDocs(q);
            const allTextbooks = textbookSnap.docs.map(d => ({ id: d.id, ...d.data() }));

            container.innerHTML = '';

            subjects.forEach(subj => {
                const isChecked = !!currentSubjects[subj.id];
                const div = document.createElement('div');
                div.className = "mb-3 pb-3 border-b border-slate-200 last:border-0";

                div.innerHTML = `
                    <div class="flex items-center gap-2 mb-2">
                        <input type="checkbox" id="subj-${subj.id}" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500" ${isChecked ? 'checked' : ''}>
                        <label for="subj-${subj.id}" class="font-bold text-slate-700 cursor-pointer select-none">${subj.name}</label>
                    </div>
                    <div id="textbooks-${subj.id}" class="pl-6 space-y-1 ${isChecked ? '' : 'hidden'}"></div>
                `;

                // 해당 과목의 교재만 필터링
                const tbContainer = div.querySelector(`#textbooks-${subj.id}`);
                const subjTextbooks = allTextbooks.filter(tb => tb.subjectId === subj.id);

                if (subjTextbooks.length === 0) {
                    tbContainer.innerHTML = '<p class="text-xs text-slate-400">등록된 교재 없음</p>';
                } else {
                    subjTextbooks.forEach(tb => {
                        const isTbChecked = currentSubjects[subj.id]?.textbooks?.includes(tb.id);
                        const tbDiv = document.createElement('div');
                        tbDiv.className = "flex items-center gap-2";
                        tbDiv.innerHTML = `
                            <input type="checkbox" class="tb-check w-3 h-3 text-blue-500 rounded border-gray-300" value="${tb.id}" ${isTbChecked ? 'checked' : ''}>
                            <span class="text-sm text-slate-600">${tb.name}</span>
                        `;
                        tbContainer.appendChild(tbDiv);
                    });
                }

                const subjCheck = div.querySelector(`#subj-${subj.id}`);
                subjCheck.addEventListener('change', (e) => {
                    tbContainer.classList.toggle('hidden', !e.target.checked);
                });

                container.appendChild(div);
            });

        } catch (error) {
            console.error("Error rendering subjects:", error);
            container.innerHTML = '<p class="text-red-500">데이터 로딩 실패</p>';
        }
    },

    async saveClassChanges() {
        const classId = this.app.state.selectedClassId;
        const typeSelect = this.elements.editClassTypeSelect;
        
        if (!classId) return;

        const newType = typeSelect.value;
        const subjectsData = {};
        const container = this.elements.editClassSubjectsContainer;
        const subjChecks = container.querySelectorAll('input[id^="subj-"]:checked');

        subjChecks.forEach(chk => {
            const subjId = chk.id.replace('subj-', '');
            const tbChecks = container.querySelectorAll(`#textbooks-${subjId} .tb-check:checked`);
            const tbIds = Array.from(tbChecks).map(cb => cb.value);
            
            subjectsData[subjId] = {
                active: true,
                textbooks: tbIds
            };
        });

        try {
            await updateDoc(doc(db, "classes", classId), {
                classType: newType,
                subjects: subjectsData
            });
            showToast("반 설정이 저장되었습니다.", false);
            this.closeEditClassModal();
            
            // 앱 상태 갱신 트리거 (필요 시)
            if (this.app.fetchClassData) {
                await this.app.fetchClassData(classId);
            }
            if (this.app.displayCurrentClassInfo) {
                this.app.displayCurrentClassInfo();
            }

        } catch (error) {
            console.error(error);
            showToast("저장 실패", true);
        }
    }
};