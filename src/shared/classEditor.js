// src/shared/classEditor.js

import { collection, doc, updateDoc, getDocs, query, orderBy } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

// ✨ [수정됨] 공장 함수(Factory Function) 패턴으로 변경
// config = { app: AppInstance, elements: { idMap... } }
export const createClassEditor = (config) => {
    const { app, elements } = config;

    // 요소 ID를 이용해 DOM 요소를 가져오는 헬퍼 함수
    const getEl = (key) => {
        const id = elements[key];
        return id ? document.getElementById(id) : null;
    };

    return {
        async openEditClassModal() {
            // editingClass가 있으면(선생님 앱) 그걸 쓰고, 없으면 selectedClassData(관리자 앱) 사용
            const classData = app.state.editingClass || app.state.selectedClassData;
            
            if (!classData) {
                showToast("반 정보가 없습니다.");
                return;
            }

            const modal = getEl('editClassModal');
            const nameSpan = getEl('editClassName');
            const typeSelect = getEl('editClassTypeSelect');

            if (nameSpan) nameSpan.textContent = classData.name;
            if (typeSelect) typeSelect.value = classData.classType || 'live-lecture';

            // subjects 데이터 렌더링
            await this.renderSubjectSettings(classData.subjects || {});
            
            if (modal) modal.style.display = 'flex';
        },

        closeEditClassModal() {
            const modal = getEl('editClassModal');
            if (modal) modal.style.display = 'none';
        },

        async renderSubjectSettings(currentSubjects) {
            const container = getEl('editClassSubjectsContainer');
            if (!container) return;
            
            container.innerHTML = '<p class="text-sm text-gray-500">과목 및 교재 목록 로딩 중...</p>';

            try {
                // 1. 모든 과목 가져오기
                const subjects = app.state.subjects || [];
                
                // 2. 모든 교재 가져오기 (최상위 컬렉션)
                const q = query(collection(db, 'textbooks'), orderBy('name'));
                const textbookSnap = await getDocs(q);
                const allTextbooks = textbookSnap.docs.map(d => ({ id: d.id, ...d.data() }));

                container.innerHTML = '';

                if (subjects.length === 0) {
                    container.innerHTML = '<p class="text-sm text-slate-400">등록된 과목이 없습니다.</p>';
                    return;
                }

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
            const classId = app.state.selectedClassId; // 선생님 앱은 selectedClassId 사용
            const typeSelect = getEl('editClassTypeSelect');
            const container = getEl('editClassSubjectsContainer');
            
            if (!classId || !typeSelect || !container) return false;

            const newType = typeSelect.value;
            const subjectsData = {};
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
                return true; // 성공 신호 반환

            } catch (error) {
                console.error(error);
                showToast("저장 실패", true);
                return false;
            }
        }
    };
};