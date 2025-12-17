// src/admin/classManager.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
import { getSubjects } from "../store/subjectStore.js"; 
import { getTextbooks } from "../store/textbookStore.js"; 
import { getClasses } from "../store/classStore.js"; 

export const classManager = {
    app: null,
    elements: {},

    init(app) {
        this.app = app;
        this.elements = app.elements;
        this.addEventListeners();
        this.loadClasses(); 

        document.addEventListener('classesUpdated', () => {
            this.loadClasses();
        });
        
        // ✨ 교재 데이터가 로드되면 화면 갱신 (모달이 열려있을 경우 대비)
        document.addEventListener('textbooks-updated', () => {
             if (this.app.state.editingClass) {
                 this.renderSubjectSettings(this.app.state.editingClass.subjects || {});
             }
        });
    },

    addEventListeners() {
        this.elements.addClassBtn?.addEventListener('click', () => this.createClass());
        this.elements.closeEditClassModalBtn?.addEventListener('click', () => this.closeEditModal());
        this.elements.cancelEditClassBtn?.addEventListener('click', () => this.closeEditModal());
        this.elements.saveClassEditBtn?.addEventListener('click', () => this.updateClass());
    },

    async createClass() {
        const nameInput = this.elements.newClassNameInput;
        const name = nameInput.value.trim();
        if (!name) { showToast("반 이름을 입력하세요.", true); return; }

        try {
            await addDoc(collection(db, "classes"), {
                name,
                classType: 'live-lecture', 
                subjects: {},
                createdAt: new Date()
            });
            showToast("반이 생성되었습니다.", false);
            nameInput.value = "";
        } catch (error) {
            console.error(error);
            showToast("생성 실패", true);
        }
    },

    async loadClasses() {
        const listEl = this.elements.classesList;
        if (!listEl) return;

        const classes = getClasses(); 
        listEl.innerHTML = "";

        if (classes.length === 0) {
            listEl.innerHTML = '<p class="text-slate-400 text-sm p-4">등록된 반이 없거나 로딩 중입니다.</p>';
            return;
        }

        classes.forEach(cls => {
            const div = document.createElement("div");
            div.className = "flex justify-between items-center p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition mb-2";
            
            const typeBadge = cls.classType === 'live-lecture' 
                ? '<span class="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded font-bold mr-2">현강</span>' 
                : '<span class="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold mr-2">자습</span>';

            div.innerHTML = `
                <div>
                    <h3 class="font-bold text-slate-700 text-lg flex items-center">${typeBadge}${cls.name}</h3>
                </div>
                <div class="flex gap-2">
                    <button class="edit-btn text-slate-400 hover:text-blue-600 p-2 rounded-full hover:bg-blue-50 transition" title="수정">
                        <span class="material-icons">edit</span>
                    </button>
                    <button class="delete-btn text-slate-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition" title="삭제">
                        <span class="material-icons">delete</span>
                    </button>
                </div>
            `;

            div.querySelector(".edit-btn").addEventListener("click", () => this.openEditModal(cls));
            div.querySelector(".delete-btn").addEventListener("click", () => this.deleteClass(cls.id, cls.name));

            listEl.appendChild(div);
        });
    },

    openEditModal(cls) {
        this.app.state.editingClass = cls;
        const modal = this.elements.editClassModal;
        const nameInput = this.elements.editClassName;
        const typeSelect = this.elements.editClassTypeSelect;
        
        nameInput.value = cls.name;
        typeSelect.value = cls.classType || 'live-lecture'; 

        // ✨ 모달 열 때 교재 목록 렌더링
        this.renderSubjectSettings(cls.subjects || {});
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    },

    closeEditModal() {
        this.elements.editClassModal.classList.add('hidden');
        this.elements.editClassModal.classList.remove('flex');
        this.app.state.editingClass = null;
    },

    // ✨ [핵심 수정] 과목/교재 설정 렌더링 (최상위 교재 컬렉션 사용)
    renderSubjectSettings(currentSubjects) {
        const container = this.elements.editClassSubjectsContainer;
        if(!container) return;
        
        const allSubjects = getSubjects();
        const allTextbooks = getTextbooks(); // 여기서 최상위 교재 목록을 가져옴

        container.innerHTML = '';
        
        if (allSubjects.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400 p-2">등록된 과목이 없습니다. 과목 관리에서 먼저 등록해주세요.</p>';
            return;
        }
        
        allSubjects.forEach(subj => {
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

            // ✨ 교재 필터링: subjectId가 일치하는 교재 찾기
            const tbContainer = div.querySelector(`#textbooks-${subj.id}`);
            const subjTextbooks = allTextbooks.filter(tb => tb.subjectId === subj.id);
            
            if (subjTextbooks.length === 0) {
                tbContainer.innerHTML = '<p class="text-xs text-slate-400">등록된 교재 없음 (교재 관리에서 등록 필요)</p>';
            } else {
                subjTextbooks.forEach(tb => {
                    // 기존 설정에 이 교재 ID가 포함되어 있는지 확인
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
    },

    async updateClass() {
        const cls = this.app.state.editingClass;
        if (!cls) return;

        const newName = this.elements.editClassName.value.trim();
        const newType = this.elements.editClassTypeSelect.value;
        
        if (!newName) { showToast("반 이름을 입력하세요.", true); return; }

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
            await updateDoc(doc(db, "classes", cls.id), {
                name: newName,
                classType: newType, 
                subjects: subjectsData
            });
            showToast("반 정보가 수정되었습니다.", false);
            this.closeEditModal();
        } catch (error) {
            console.error(error);
            showToast("수정 실패", true);
        }
    },

    async deleteClass(classId, className) {
        if (!confirm(`'${className}' 반을 정말 삭제하시겠습니까?\n\n⚠️ 주의: 이 반에 속해있던 학생들은 모두 '미배정' 상태로 변경됩니다.`)) return;

        try {
            const batch = writeBatch(db);
            const classRef = doc(db, "classes", classId);
            batch.delete(classRef);

            const q = query(collection(db, "students"), where("classId", "==", classId));
            const snapshot = await getDocs(q);
            
            snapshot.forEach(docSnap => {
                batch.update(docSnap.ref, { classId: null });
            });

            await batch.commit();
            showToast("반이 삭제되었고, 학생들은 미배정 처리되었습니다.", false);
            
        } catch (error) {
            console.error("반 삭제 중 오류:", error);
            showToast("삭제 중 오류가 발생했습니다.", true);
        }
    }
};