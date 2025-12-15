// src/admin/studentAssignmentManager.js

import { doc, writeBatch } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
// ✨ 경로 확인: ../store/ 가 맞습니다.
import { getStudents } from "../store/studentStore.js";
import { getClasses } from "../store/classStore.js";

export const studentAssignmentManager = {
    elements: {
        viewContainer: null,
    },
    state: {
        leftClassId: 'unassigned',
        rightClassId: '',
        checkedStudentIds: new Set(),
    },

    init(app) {
        this.app = app;
        this.elements.viewContainer = document.getElementById('admin-student-assignment-view');

        // ✨ [핵심 추가] 학생 데이터가 변경되면 자동으로 리스트 새로고침
        document.addEventListener('studentsUpdated', () => {
            console.log("학생 목록 변경 감지 -> 화면 갱신");
            this.refreshLists();
        });
        
        // ✨ [핵심 추가] 반 데이터가 변경되어도 새로고침 (반 이름 변경 등 반영)
        document.addEventListener('classesUpdated', () => {
            this.populateSelects(); // 드롭다운 갱신
            this.refreshLists();    // 리스트 갱신
        });
    },

    resetView() {
        this.state.checkedStudentIds.clear();
        this.renderLayout();
        this.bindEvents();
        this.refreshLists();
    },
    
    // ... (이하 populateClassSelects, renderLayout 등 나머지 코드는 기존과 동일하므로 유지) ...
    // 아래 코드는 기존 코드 그대로 두시면 됩니다. (혹시 필요하면 이전에 드린 전체 코드를 참고하세요)

    renderLayout() {
        if (!this.elements.viewContainer) return;

        this.elements.viewContainer.innerHTML = `
            <button class="back-to-admin-dashboard-btn mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-2">
                <span class="material-icons">arrow_back</span> 메인으로 돌아가기
            </button>
            <header class="mb-8">
                <h1 class="text-3xl font-bold text-slate-800">학생 반 배정 (다중 이동)</h1>
                <p class="text-slate-500 mt-2">왼쪽에서 학생을 선택하고 [이동] 버튼을 눌러 오른쪽 반으로 보내세요.</p>
            </header>

            <div class="flex flex-col md:flex-row gap-4 h-[calc(100vh-250px)] min-h-[600px]">
                
                <div class="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-slate-200">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">보내는 반 (From)</label>
                        <select id="assignment-left-select" class="form-select w-full text-sm font-bold text-slate-700 bg-white">
                            </select>
                    </div>
                    <div class="p-2 border-b border-slate-100 flex justify-between items-center bg-white px-3">
                        <div class="flex items-center gap-2">
                            <input type="checkbox" id="check-all-left" class="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500">
                            <label for="check-all-left" class="text-xs font-bold text-slate-500 cursor-pointer">전체 선택</label>
                        </div>
                        <span id="assignment-left-count" class="bg-slate-100 text-slate-600 text-xs px-2 py-1 rounded-full font-bold">0명</span>
                    </div>
                    <div id="assignment-left-list" class="flex-grow overflow-y-auto p-2 space-y-1 bg-slate-50/30">
                        </div>
                </div>

                <div class="flex md:flex-col justify-center items-center gap-2 p-2">
                    <button id="btn-move-right" class="btn-primary flex items-center justify-center gap-1 py-3 px-4 shadow-lg w-full md:w-auto transform active:scale-95 transition">
                        <span>이동</span>
                        <span class="material-icons">arrow_forward</span>
                    </button>
                </div>

                <div class="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
                    <div class="p-4 bg-slate-50 border-b border-slate-200">
                        <label class="block text-xs font-bold text-slate-500 uppercase mb-1">받는 반 (To)</label>
                        <select id="assignment-right-select" class="form-select w-full text-sm font-bold text-slate-700 bg-white">
                            </select>
                    </div>
                    <div class="p-2 border-b border-slate-100 flex justify-between items-center bg-white px-3">
                        <span class="text-xs font-bold text-slate-500">현재 소속 학생</span>
                        <span id="assignment-right-count" class="bg-indigo-50 text-indigo-600 text-xs px-2 py-1 rounded-full font-bold">0명</span>
                    </div>
                    <div id="assignment-right-list" class="flex-grow overflow-y-auto p-2 space-y-1 bg-slate-50/30 opacity-70">
                        </div>
                </div>
            </div>
        `;

        this.elements.viewContainer.querySelector('.back-to-admin-dashboard-btn')
            ?.addEventListener('click', () => this.app.showView('dashboard'));
    },

    bindEvents() {
        const leftSelect = document.getElementById('assignment-left-select');
        const rightSelect = document.getElementById('assignment-right-select');
        const moveBtn = document.getElementById('btn-move-right');
        const checkAll = document.getElementById('check-all-left');

        leftSelect?.addEventListener('change', (e) => {
            this.state.leftClassId = e.target.value;
            this.state.checkedStudentIds.clear(); 
            if(checkAll) checkAll.checked = false;
            this.renderLeftList();
        });

        rightSelect?.addEventListener('change', (e) => {
            this.state.rightClassId = e.target.value;
            this.renderRightList();
        });

        moveBtn?.addEventListener('click', () => this.handleBulkMove());

        checkAll?.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            const students = this.getStudentsInClass(this.state.leftClassId);
            
            if (isChecked) {
                students.forEach(s => this.state.checkedStudentIds.add(s.id));
            } else {
                this.state.checkedStudentIds.clear();
            }
            this.renderLeftList();
        });
    },

    refreshLists() {
        const classes = getClasses();
        if ((!this.state.rightClassId || !classes.find(c => c.id === this.state.rightClassId)) && classes.length > 0) {
            this.state.rightClassId = classes[0].id;
        }

        this.populateSelects();
        this.renderLeftList();
        this.renderRightList();
    },

    populateSelects() {
        const classes = getClasses();
        const leftSelect = document.getElementById('assignment-left-select');
        const rightSelect = document.getElementById('assignment-right-select');
        
        if (!leftSelect || !rightSelect) return;

        const createOptions = (selectedId) => {
            let html = `<option value="unassigned" ${selectedId === 'unassigned' ? 'selected' : ''}>🚫 미배정 학생들</option>`;
            if (classes.length > 0) {
                html += `<optgroup label="등록된 반">`;
                classes.forEach(c => {
                    const typeLabel = c.classType === 'live-lecture' ? '[현강]' : '[자습]';
                    html += `<option value="${c.id}" ${selectedId === c.id ? 'selected' : ''}>${typeLabel} ${c.name}</option>`;
                });
                html += `</optgroup>`;
            }
            return html;
        };

        leftSelect.innerHTML = createOptions(this.state.leftClassId);
        rightSelect.innerHTML = createOptions(this.state.rightClassId);
    },

    getStudentsInClass(classId) {
        const allStudents = getStudents();
        const allClasses = getClasses();
        const activeClassIds = new Set(allClasses.map(c => c.id));

        let targetStudents = [];

        if (classId === 'unassigned') {
            targetStudents = allStudents.filter(s => 
                !s.classId || !activeClassIds.has(s.classId)
            );
        } else {
            targetStudents = allStudents.filter(s => s.classId === classId);
        }
        return targetStudents.sort((a, b) => a.name.localeCompare(b.name));
    },

    renderLeftList() {
        const listEl = document.getElementById('assignment-left-list');
        const countEl = document.getElementById('assignment-left-count');
        if (!listEl) return;

        const students = this.getStudentsInClass(this.state.leftClassId);
        countEl.textContent = `${students.length}명`;
        listEl.innerHTML = '';

        if (students.length === 0) {
            listEl.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm">학생이 없습니다.</div>`;
            return;
        }

        students.forEach(student => {
            const isChecked = this.state.checkedStudentIds.has(student.id);
            const allClasses = getClasses();
            const isOrphan = student.classId && !allClasses.find(c => c.id === student.classId);
            const orphanBadge = isOrphan ? `<span class="text-[10px] bg-red-100 text-red-600 px-1 rounded ml-1">삭제된 반 소속</span>` : '';

            const div = document.createElement('div');
            div.className = `p-3 border rounded-lg flex items-center gap-3 cursor-pointer transition ${isChecked ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`;
            
            div.innerHTML = `
                <input type="checkbox" class="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-gray-300" ${isChecked ? 'checked' : ''}>
                <div class="flex-grow">
                    <p class="font-bold text-slate-700 text-sm flex items-center">
                        ${student.name} ${orphanBadge}
                    </p>
                    <p class="text-xs text-slate-400 font-mono">${student.phone?.slice(-4) || ''}</p>
                </div>
            `;

            div.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = div.querySelector('input');
                    checkbox.checked = !checkbox.checked;
                }
                
                const checkbox = div.querySelector('input');
                if (checkbox.checked) {
                    this.state.checkedStudentIds.add(student.id);
                    div.classList.add('bg-indigo-50', 'border-indigo-300', 'ring-1', 'ring-indigo-300');
                    div.classList.remove('bg-white', 'border-slate-200');
                } else {
                    this.state.checkedStudentIds.delete(student.id);
                    div.classList.remove('bg-indigo-50', 'border-indigo-300', 'ring-1', 'ring-indigo-300');
                    div.classList.add('bg-white', 'border-slate-200');
                }
            });

            listEl.appendChild(div);
        });
    },

    renderRightList() {
        const listEl = document.getElementById('assignment-right-list');
        const countEl = document.getElementById('assignment-right-count');
        if (!listEl) return;

        const students = this.getStudentsInClass(this.state.rightClassId);
        countEl.textContent = `${students.length}명`;
        listEl.innerHTML = '';

        if (students.length === 0) {
            listEl.innerHTML = `<div class="text-center py-10 text-slate-400 text-sm">배정된 학생이 없습니다.</div>`;
            return;
        }

        students.forEach(student => {
            const div = document.createElement('div');
            div.className = "p-3 bg-white border border-slate-100 rounded-lg flex items-center justify-between opacity-80";
            div.innerHTML = `
                <div>
                    <span class="text-sm font-medium text-slate-600">${student.name}</span>
                    <span class="text-xs text-slate-400 ml-1">${student.phone?.slice(-4) || ''}</span>
                </div>
                <span class="material-icons text-slate-300 text-sm">person</span>
            `;
            listEl.appendChild(div);
        });
    },

    async handleBulkMove() {
        const selectedIds = Array.from(this.state.checkedStudentIds);
        const targetClassId = this.state.rightClassId;
        const sourceClassId = this.state.leftClassId;

        if (selectedIds.length === 0) {
            showToast("이동할 학생을 왼쪽에서 선택해주세요.", true);
            return;
        }

        if (sourceClassId === targetClassId && sourceClassId !== 'unassigned') {
            showToast("보내는 반과 받는 반이 같습니다.", true);
            return;
        }

        const targetClassName = targetClassId === 'unassigned' 
            ? '미배정 상태' 
            : getClasses().find(c => c.id === targetClassId)?.name || '해당 반';

        if (!confirm(`선택한 ${selectedIds.length}명의 학생을\n'${targetClassName}'(으)로 이동하시겠습니까?`)) return;

        const batch = writeBatch(db);
        const newClassIdValue = targetClassId === 'unassigned' ? null : targetClassId;

        selectedIds.forEach(studentId => {
            const ref = doc(db, "students", studentId);
            batch.update(ref, { classId: newClassIdValue });
        });

        try {
            await batch.commit();
            showToast(`${selectedIds.length}명 이동 완료!`, false);
            
            // 이동 후 선택 초기화
            this.state.checkedStudentIds.clear();
            const checkAll = document.getElementById('check-all-left');
            if(checkAll) checkAll.checked = false;
            
            // ✨ 1번 파일(studentStore.js)이 잘 작동한다면, 
            // 여기서 수동으로 refreshLists()를 부르지 않아도 자동으로 갱신됩니다.
            // 하지만 안전을 위해 한 번 더 호출해도 상관없습니다.
            setTimeout(() => this.refreshLists(), 500);

        } catch (error) {
            console.error("일괄 이동 실패:", error);
            showToast("이동 중 오류가 발생했습니다.", true);
        }
    }
};