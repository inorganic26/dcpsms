// src/admin/studentAssignmentManager.js

import { collection, doc, getDocs, query, updateDoc, where, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentAssignmentManager = {
    init(app) {
        this.app = app;
        this.elements = {
            sourceClassSelect: document.getElementById('admin-source-class-select'),
            targetClassSelect: document.getElementById('admin-target-class-select'),
            studentSearchInput: document.getElementById('admin-student-search-input-assignment'),
            sourceStudentList: document.getElementById('admin-source-student-list'),
            assignBtn: document.getElementById('admin-assign-students-btn'),
        };
        this.state = {
            students: [],
            selectedStudentIds: new Set(),
        };

        // DOM 요소가 존재하는지 확인 후 이벤트 리스너 추가
        if (this.elements.sourceClassSelect) {
            this.elements.sourceClassSelect.addEventListener('change', () => this.handleSourceClassChange());
        }
        if (this.elements.studentSearchInput) {
            this.elements.studentSearchInput.addEventListener('input', () => this.renderStudentList());
        }
        if (this.elements.assignBtn) {
            this.elements.assignBtn.addEventListener('click', () => this.assignStudents());
        }
        
        // AdminApp의 뷰 전환 이벤트 리스너를 활용
        document.getElementById('goto-student-assignment-btn').addEventListener('click', () => {
            this.populateClassSelects();
            this.resetView();
        });
    },

    populateClassSelects() {
        const { classes } = this.app.state;
        const sourceSelect = this.elements.sourceClassSelect;
        const targetSelect = this.elements.targetClassSelect;

        sourceSelect.innerHTML = '<option value="unassigned">미배정</option>';
        targetSelect.innerHTML = '<option value="">-- 배정할 반 --</option>';

        classes.forEach(c => {
            sourceSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
            targetSelect.innerHTML += `<option value="${c.id}">${c.name}</option>`;
        });
    },
    
    resetView() {
        this.elements.sourceStudentList.innerHTML = '<p class="text-sm text-slate-400">먼저 반을 선택해주세요.</p>';
        this.elements.studentSearchInput.value = '';
        this.state.students = [];
        this.state.selectedStudentIds.clear();
    },

    async handleSourceClassChange() {
        const selectedClassId = this.elements.sourceClassSelect.value;
        this.elements.sourceStudentList.innerHTML = '<div class="loader-small"></div>'; // 로딩 스피너 (스타일 추가 필요)
        
        let q;
        if (selectedClassId === 'unassigned') {
            q = query(collection(db, 'students'), where('classId', '==', null));
        } else {
            q = query(collection(db, 'students'), where('classId', '==', selectedClassId));
        }

        const snapshot = await getDocs(q);
        this.state.students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        this.state.students.sort((a,b) => a.name.localeCompare(b.name));
        this.state.selectedStudentIds.clear();
        this.renderStudentList();
    },

    renderStudentList() {
        const searchTerm = this.elements.studentSearchInput.value.toLowerCase();
        const listEl = this.elements.sourceStudentList;
        listEl.innerHTML = '';
        
        const filteredStudents = this.state.students.filter(s => 
            s.name.toLowerCase().includes(searchTerm) || (s.phone && s.phone.includes(searchTerm))
        );

        if (filteredStudents.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">해당 반에 학생이 없거나 검색 결과가 없습니다.</p>';
            return;
        }

        filteredStudents.forEach(student => {
            const div = document.createElement('div');
            div.className = `p-3 border rounded-lg cursor-pointer ${this.state.selectedStudentIds.has(student.id) ? 'bg-blue-100 border-blue-300' : 'bg-white'}`;
            div.textContent = `${student.name} (${student.phone || '번호없음'})`;
            div.dataset.id = student.id;
            
            div.addEventListener('click', () => {
                const id = div.dataset.id;
                if (this.state.selectedStudentIds.has(id)) {
                    this.state.selectedStudentIds.delete(id);
                    div.classList.remove('bg-blue-100', 'border-blue-300');
                    div.classList.add('bg-white');
                } else {
                    this.state.selectedStudentIds.add(id);
                    div.classList.add('bg-blue-100', 'border-blue-300');
                    div.classList.remove('bg-white');
                }
            });
            listEl.appendChild(div);
        });
    },

    async assignStudents() {
        const targetClassId = this.elements.targetClassSelect.value;
        if (!targetClassId) {
            showToast("배정할 반을 선택해주세요.");
            return;
        }
        if (this.state.selectedStudentIds.size === 0) {
            showToast("배정할 학생을 한 명 이상 선택해주세요.");
            return;
        }

        if (!confirm(`${this.state.selectedStudentIds.size}명의 학생을 선택한 반으로 배정하시겠습니까?`)) return;

        try {
            const batch = writeBatch(db);
            this.state.selectedStudentIds.forEach(studentId => {
                const studentRef = doc(db, 'students', studentId);
                batch.update(studentRef, { classId: targetClassId });
            });
            await batch.commit();
            showToast("학생 배정이 완료되었습니다.", false);
            // 성공 후 목록 새로고침
            this.handleSourceClassChange();
        } catch (error) {
            console.error("학생 배정 실패:", error);
            showToast("학생 배정에 실패했습니다.");
        }
    }
};