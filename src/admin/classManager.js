// src/admin/classManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, where, query, getDocs, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const classManager = {
    init(app) {
        this.app = app;

        // 반 관리 관련 이벤트 리스너 설정
        this.app.elements.addClassBtn.addEventListener('click', () => this.addNewClass());
        this.app.elements.closeEditClassModalBtn.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.cancelEditClassBtn.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.saveClassEditBtn.addEventListener('click', () => this.saveClassChanges());

        this.listenForClasses();
    },

    async addNewClass() {
        const { newClassNameInput } = this.app.elements;
        const className = newClassNameInput.value.trim();
        if (!className) { 
            showToast("반 이름을 입력해주세요."); 
            return; 
        }

        try {
            await addDoc(collection(db, 'classes'), { 
                name: className, 
                subjects: {}, // 빈 과목으로 반 생성
                createdAt: serverTimestamp() 
            });
            showToast("새로운 반이 추가되었습니다. '수정' 버튼으로 과목을 설정하세요.", false);
            newClassNameInput.value = '';
        } catch (error) { 
            console.error("반 추가 실패:", error); 
            showToast("반 추가에 실패했습니다."); 
        }
    },

    listenForClasses() {
        const q = query(collection(db, 'classes'));
        onSnapshot(q, (snapshot) => {
            const classes = [];
            snapshot.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
            classes.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
            this.app.state.classes = classes;
            this.renderClassList();
        });
    },

    renderClassList() {
        const { classesList, classSelectForStudent } = this.app.elements;
        const { classes, subjects } = this.app.state;

        classesList.innerHTML = '';
        classSelectForStudent.innerHTML = '<option value="">-- 반 선택 --</option>';

        if (classes.length === 0) {
            classesList.innerHTML = '<p class="text-sm text-slate-400">생성된 반이 없습니다.</p>';
            return;
        }

        classes.forEach(cls => {
            const classDiv = document.createElement('div');
            const subjectIds = cls.subjects ? Object.keys(cls.subjects) : [];
            const assignedSubjects = subjectIds
                .map(id => subjects.find(s => s.id === id)?.name)
                .filter(Boolean)
                .join(', ');
            classDiv.className = "p-3 border rounded-lg";
            classDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-medium text-slate-700">${cls.name}</span> 
                    <div class="flex items-center gap-2">
                        <button data-id="${cls.id}" class="edit-class-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                        <button data-id="${cls.id}" class="delete-class-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mt-1">연결된 과목: ${assignedSubjects || '없음'}</p>
            `;
            classesList.appendChild(classDiv);
            classDiv.querySelector('.delete-class-btn').addEventListener('click', (e) => this.deleteClass(e.target.dataset.id));
            classDiv.querySelector('.edit-class-btn').addEventListener('click', (e) => this.openEditClassModal(e.target.dataset.id));
            
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            classSelectForStudent.appendChild(option);
        });
    },

    async deleteClass(classId) {
        if (!confirm("정말로 이 반을 삭제하시겠습니까? 학생 명단도 함께 삭제됩니다.")) return;
        try {
            const batch = writeBatch(db);
            const classRef = doc(db, 'classes', classId);
            batch.delete(classRef);
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(studentDoc => batch.delete(studentDoc.ref));
            await batch.commit();
            showToast("반과 소속 학생들이 삭제되었습니다.", false);
        } catch (error) { 
            console.error("반 삭제 실패:", error); 
            showToast("반 삭제에 실패했습니다."); 
        }
    },

    async openEditClassModal(classId) {
        const classData = this.app.state.classes.find(c => c.id === classId);
        if (!classData) return;
        this.app.state.editingClass = classData;
        this.app.elements.editClassName.textContent = classData.name;
        
        const container = document.getElementById('admin-edit-class-subjects-and-textbooks');
        container.innerHTML = '불러오는 중...';
        this.app.elements.editClassModal.style.display = 'flex';

        const currentSubjects = classData.subjects || {};
        
        const textbookPromises = this.app.state.subjects.map(subject => 
            getDocs(collection(db, `subjects/${subject.id}/textbooks`))
        );
        const textbookSnapshots = await Promise.all(textbookPromises);
        
        const allTextbooksBySubject = {};
        this.app.state.subjects.forEach((subject, index) => {
            allTextbooksBySubject[subject.id] = textbookSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });
        
        container.innerHTML = '';
        this.app.state.subjects.forEach(subject => {
            const isSubjectSelected = currentSubjects.hasOwnProperty(subject.id);
            const selectedTextbooks = isSubjectSelected ? new Set(currentSubjects[subject.id].textbooks) : new Set();
            const subjectGroup = document.createElement('div');
            subjectGroup.className = 'p-3 border rounded-lg';
            let textbookHtml = '<div class="pl-6 mt-2 space-y-1">';
            allTextbooksBySubject[subject.id].forEach(textbook => {
                textbookHtml += `
                    <div>
                        <input type="checkbox" id="textbook-${textbook.id}" data-subject-id="${subject.id}" data-textbook-id="${textbook.id}" class="textbook-checkbox" ${selectedTextbooks.has(textbook.id) ? 'checked' : ''}>
                        <label for="textbook-${textbook.id}" class="ml-2 text-sm">${textbook.name}</label>
                    </div>`;
            });
            textbookHtml += '</div>';
            subjectGroup.innerHTML = `
                <div class="font-semibold">
                    <input type="checkbox" id="subject-${subject.id}" data-subject-id="${subject.id}" class="subject-checkbox" ${isSubjectSelected ? 'checked' : ''}>
                    <label for="subject-${subject.id}" class="ml-2">${subject.name}</label>
                </div>
                ${allTextbooksBySubject[subject.id].length > 0 ? textbookHtml : ''}
            `;
            container.appendChild(subjectGroup);
        });
    },

    closeEditClassModal() {
        this.app.state.editingClass = null;
        this.app.elements.editClassModal.style.display = 'none';
    },

    async saveClassChanges() {
        if (!this.app.state.editingClass) return;
        const classId = this.app.state.editingClass.id;
        const newSubjectsData = {};
        
        const subjectCheckboxes = document.querySelectorAll('#admin-edit-class-modal .subject-checkbox:checked');
        subjectCheckboxes.forEach(subjectCheckbox => {
            const subjectId = subjectCheckbox.dataset.subjectId;
            const textbookCheckboxes = document.querySelectorAll(`#admin-edit-class-modal .textbook-checkbox[data-subject-id="${subjectId}"]:checked`);
            const selectedTextbookIds = Array.from(textbookCheckboxes).map(tb => tb.dataset.textbookId);
            newSubjectsData[subjectId] = { textbooks: selectedTextbookIds };
        });
        
        try {
            await updateDoc(doc(db, 'classes', classId), { subjects: newSubjectsData });
            showToast("반 정보가 성공적으로 수정되었습니다.", false);
            this.closeEditClassModal();
        } catch (error) {
            console.error("반 정보 수정 실패:", error);
            showToast("반 정보 수정에 실패했습니다.");
        }
    },
};