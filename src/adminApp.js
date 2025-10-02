import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, where, query, getDocs, writeBatch } from "firebase/firestore";
import { db } from './firebase.js';
import { showToast } from './utils.js';

const AdminApp = {
    isInitialized: false,
    elements: {},
    state: { 
        subjects: [],
        classes: [],
        lessons: [],
        selectedSubjectsForNewClass: new Set(),
        editingClass: null,
        selectedSubjectIdForLesson: null,
        editingLesson: null,
        generatedQuiz: null, 
        selectedClassIdForStudent: null,
        selectedSubjectIdForTextbook: null,
    },
    init() {
        if (this.isInitialized) {
            this.showAdminSection('dashboard');
            return;
        };
        this.isInitialized = true;
        this.cacheElements();
        this.addEventListeners();
        this.listenForSubjects();
        this.listenForClasses();
        this.handleLessonFilterChange();
        this.showAdminSection('dashboard');
    },
    cacheElements() {
        this.elements = {
            dashboardView: document.getElementById('admin-dashboard-view'),
            gotoSubjectMgmtBtn: document.getElementById('goto-subject-mgmt-btn'),
            gotoTextbookMgmtBtn: document.getElementById('goto-textbook-mgmt-btn'),
            gotoClassMgmtBtn: document.getElementById('goto-class-mgmt-btn'),
            gotoStudentMgmtBtn: document.getElementById('goto-student-mgmt-btn'),
            gotoLessonMgmtBtn: document.getElementById('goto-lesson-mgmt-btn'),
            subjectMgmtView: document.getElementById('admin-subject-mgmt-view'),
            textbookMgmtView: document.getElementById('admin-textbook-mgmt-view'),
            classMgmtView: document.getElementById('admin-class-mgmt-view'),
            studentMgmtView: document.getElementById('admin-student-mgmt-view'),
            lessonMgmtView: document.getElementById('admin-lesson-mgmt-view'),
            newSubjectNameInput: document.getElementById('admin-new-subject-name'),
            addSubjectBtn: document.getElementById('admin-add-subject-btn'),
            subjectsList: document.getElementById('admin-subjects-list'),
            subjectSelectForTextbook: document.getElementById('admin-subject-select-for-textbook'),
            textbookManagementContent: document.getElementById('admin-textbook-management-content'),
            newTextbookNameInput: document.getElementById('admin-new-textbook-name'),
            addTextbookBtn: document.getElementById('admin-add-textbook-btn'),
            textbooksList: document.getElementById('admin-textbooks-list'),
            newClassNameInput: document.getElementById('admin-new-class-name'),
            addClassBtn: document.getElementById('admin-add-class-btn'),
            classesList: document.getElementById('admin-classes-list'),
            classSubjectsOptions: document.getElementById('admin-class-subjects-options'),
            classSelectForStudent: document.getElementById('admin-class-select-for-student'),
            newStudentNameInput: document.getElementById('admin-new-student-name'),
            newStudentPasswordInput: document.getElementById('admin-new-student-phone'),
            addStudentBtn: document.getElementById('admin-add-student-btn'),
            studentsList: document.getElementById('admin-students-list'),
            subjectSelectForLesson: document.getElementById('admin-subject-select-for-lesson'),
            lessonsManagementContent: document.getElementById('admin-lessons-management-content'),
            lessonPrompt: document.getElementById('admin-lesson-prompt'),
            lessonsList: document.getElementById('admin-lessons-list'),
            saveOrderBtn: document.getElementById('admin-save-lesson-order-btn'),
            modal: document.getElementById('admin-new-lesson-modal'), 
            modalTitle: document.getElementById('admin-lesson-modal-title'),
            lessonTitle: document.getElementById('admin-lesson-title'),
            video1Url: document.getElementById('admin-video1-url'), 
            video2Url: document.getElementById('admin-video2-url'),
            quizJsonInput: document.getElementById('admin-quiz-json-input'), 
            previewQuizBtn: document.getElementById('admin-preview-quiz-btn'),
            questionsPreviewContainer: document.getElementById('admin-questions-preview-container'), 
            questionsPreviewTitle: document.getElementById('admin-questions-preview-title'),
            questionsPreviewList: document.getElementById('admin-questions-preview-list'), 
            saveLessonBtn: document.getElementById('admin-save-lesson-btn'),
            saveBtnText: document.getElementById('admin-save-btn-text'), 
            saveLoader: document.getElementById('admin-save-loader'),
            editClassModal: document.getElementById('admin-edit-class-modal'),
            editClassName: document.getElementById('admin-edit-class-name'),
            editClassSubjectsOptions: document.getElementById('admin-edit-class-subjects-options'),
            closeEditClassModalBtn: document.getElementById('admin-close-edit-class-modal-btn'),
            cancelEditClassBtn: document.getElementById('admin-cancel-edit-class-btn'),
            saveClassEditBtn: document.getElementById('admin-save-class-edit-btn'),
        };
    },
    addEventListeners() {
        this.elements.gotoSubjectMgmtBtn.addEventListener('click', () => this.showAdminSection('subject-mgmt'));
        this.elements.gotoTextbookMgmtBtn.addEventListener('click', () => this.showAdminSection('textbook-mgmt'));
        this.elements.gotoClassMgmtBtn.addEventListener('click', () => this.showAdminSection('class-mgmt'));
        this.elements.gotoStudentMgmtBtn.addEventListener('click', () => this.showAdminSection('student-mgmt'));
        this.elements.gotoLessonMgmtBtn.addEventListener('click', () => this.showAdminSection('lesson-mgmt'));
        document.querySelectorAll('.back-to-admin-dashboard-btn').forEach(btn => {
            btn.addEventListener('click', () => this.showAdminSection('dashboard'));
        });
        this.elements.addSubjectBtn.addEventListener('click', () => this.addNewSubject());
        this.elements.addClassBtn.addEventListener('click', () => this.addNewClass());
        this.elements.subjectSelectForTextbook.addEventListener('change', (e) => this.handleSubjectSelectForTextbook(e.target.value));
        this.elements.addTextbookBtn.addEventListener('click', () => this.addNewTextbook());
        this.elements.addStudentBtn.addEventListener('click', () => this.addNewStudent());
        this.elements.classSelectForStudent.addEventListener('change', (e) => {
            this.state.selectedClassIdForStudent = e.target.value;
            this.listenForStudents();
        });
        this.elements.subjectSelectForLesson.addEventListener('change', (e) => {
            this.state.selectedSubjectIdForLesson = e.target.value;
            this.handleLessonFilterChange();
        });
        document.getElementById('admin-show-new-lesson-modal-btn').addEventListener('click', () => this.openLessonModalForCreate());
        document.getElementById('admin-close-modal-btn').addEventListener('click', () => this.hideModal());
        document.getElementById('admin-cancel-btn').addEventListener('click', () => this.hideModal());
        this.elements.previewQuizBtn.addEventListener('click', () => this.handleJsonPreview());
        this.elements.saveLessonBtn.addEventListener('click', () => this.saveLesson());
        this.elements.saveOrderBtn.addEventListener('click', () => this.saveLessonOrder());
        this.elements.closeEditClassModalBtn.addEventListener('click', () => this.closeEditClassModal());
        this.elements.cancelEditClassBtn.addEventListener('click', () => this.closeEditClassModal());
        this.elements.saveClassEditBtn.addEventListener('click', () => this.saveClassChanges());
    },
    showAdminSection(sectionName) {
        this.elements.dashboardView.style.display = 'none';
        Object.keys(this.elements).forEach(key => {
            if (key.endsWith('MgmtView')) {
                this.elements[key].style.display = 'none';
            }
        });
        const viewMap = {
            'dashboard': this.elements.dashboardView,
            'subject-mgmt': this.elements.subjectMgmtView,
            'textbook-mgmt': this.elements.textbookMgmtView,
            'class-mgmt': this.elements.classMgmtView,
            'student-mgmt': this.elements.studentMgmtView,
            'lesson-mgmt': this.elements.lessonMgmtView,
        };
        if (viewMap[sectionName]) {
            viewMap[sectionName].style.display = 'block';
        }
    },
    async addNewSubject() {
        const subjectName = this.elements.newSubjectNameInput.value.trim();
        if (!subjectName) { showToast("과목 이름을 입력해주세요."); return; }
        try {
            await addDoc(collection(db, 'subjects'), { name: subjectName, createdAt: serverTimestamp() });
            showToast("새로운 공통 과목이 추가되었습니다.", false);
            this.elements.newSubjectNameInput.value = '';
        } catch (error) { console.error("과목 추가 실패:", error); showToast("과목 추가에 실패했습니다."); }
    },
    listenForSubjects() {
        const q = query(collection(db, 'subjects'));
        onSnapshot(q, (snapshot) => {
            const subjects = [];
            snapshot.forEach(doc => subjects.push({ id: doc.id, ...doc.data() }));
            subjects.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
            this.state.subjects = subjects;
            this.renderSubjectList();
            this.renderSubjectOptionsForClass();
            this.renderSubjectOptionsForTextbook();
            this.renderSubjectOptionsForLesson();
            this.renderClassList();
        });
    },
    renderSubjectList() {
        this.elements.subjectsList.innerHTML = '';
        if (this.state.subjects.length === 0) {
            this.elements.subjectsList.innerHTML = '<p class="text-sm text-slate-400">생성된 과목이 없습니다.</p>';
            return;
        }
        this.state.subjects.forEach(sub => {
            const subjectDiv = document.createElement('div');
            subjectDiv.className = "p-3 border rounded-lg flex items-center justify-between";
            subjectDiv.innerHTML = `<span class="font-medium text-slate-700">${sub.name}</span> <button data-id="${sub.id}" class="delete-subject-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>`;
            this.elements.subjectsList.appendChild(subjectDiv);
            subjectDiv.querySelector('.delete-subject-btn').addEventListener('click', (e) => this.deleteSubject(e.target.dataset.id));
        });
    },
    async deleteSubject(subjectId) {
        if (!confirm("정말로 이 과목을 삭제하시겠습니까? 과목에 속한 모든 학습, 교재, 학생 기록이 영구적으로 삭제됩니다!")) return;
        try {
            await deleteDoc(doc(db, 'subjects', subjectId));
            showToast("과목이 삭제되었습니다.", false);
        } catch (error) { console.error("과목 삭제 실패:", error); showToast("과목 삭제에 실패했습니다."); }
    },
    renderSubjectOptionsForClass() {
        this.elements.classSubjectsOptions.innerHTML = '';
        if(this.state.subjects.length === 0) {
            this.elements.classSubjectsOptions.innerHTML = '<p class="text-slate-400">먼저 공통 과목을 생성해주세요.</p>';
            return;
        }
        this.state.subjects.forEach(subjectData => {
            const optionDiv = document.createElement('div');
            optionDiv.className = "subject-option";
            optionDiv.dataset.id = subjectData.id;
            optionDiv.textContent = subjectData.name;
            optionDiv.addEventListener('click', () => {
                const id = subjectData.id;
                if (this.state.selectedSubjectsForNewClass.has(id)) {
                    this.state.selectedSubjectsForNewClass.delete(id);
                    optionDiv.classList.remove('selected');
                } else {
                    this.state.selectedSubjectsForNewClass.add(id);
                    optionDiv.classList.add('selected');
                }
            });
            this.elements.classSubjectsOptions.appendChild(optionDiv);
        });
    },
    renderSubjectOptionsForTextbook() {
        const select = this.elements.subjectSelectForTextbook;
        select.innerHTML = '<option value="">-- 과목 선택 --</option>';
        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id; option.textContent = sub.name;
            select.appendChild(option);
        });
    },
    handleSubjectSelectForTextbook(subjectId) {
        this.state.selectedSubjectIdForTextbook = subjectId;
        if (subjectId) {
            this.elements.textbookManagementContent.style.display = 'block';
            this.listenForTextbooks();
        } else {
            this.elements.textbookManagementContent.style.display = 'none';
            this.elements.textbooksList.innerHTML = '';
        }
    },
    listenForTextbooks() {
        const subjectId = this.state.selectedSubjectIdForTextbook;
        if (!subjectId) return;
        const q = query(collection(db, `subjects/${subjectId}/textbooks`));
        onSnapshot(q, (snapshot) => {
            const textbooks = [];
            snapshot.forEach(doc => textbooks.push({ id: doc.id, ...doc.data() }));
            this.renderTextbookList(textbooks);
        });
    },
    renderTextbookList(textbooks) {
        const listEl = this.elements.textbooksList;
        listEl.innerHTML = '';
        if (textbooks.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교재가 없습니다.</p>';
            return;
        }
        textbooks.forEach(book => {
            const div = document.createElement('div');
            div.className = "p-3 border rounded-lg flex items-center justify-between";
            div.innerHTML = `<span class="font-medium text-slate-700">${book.name}</span> <button data-id="${book.id}" class="delete-textbook-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>`;
            listEl.appendChild(div);
            div.querySelector('.delete-textbook-btn').addEventListener('click', (e) => this.deleteTextbook(e.target.dataset.id));
        });
    },
    async addNewTextbook() {
        const subjectId = this.state.selectedSubjectIdForTextbook;
        const textbookName = this.elements.newTextbookNameInput.value.trim();
        if (!subjectId) { showToast("먼저 과목을 선택해주세요."); return; }
        if (!textbookName) { showToast("교재 이름을 입력해주세요."); return; }
        try {
            await addDoc(collection(db, `subjects/${subjectId}/textbooks`), { name: textbookName });
            showToast("새 교재가 추가되었습니다.", false);
            this.elements.newTextbookNameInput.value = '';
        } catch (error) { showToast("교재 추가에 실패했습니다."); }
    },
    async deleteTextbook(textbookId) {
        const subjectId = this.state.selectedSubjectIdForTextbook;
        if (!confirm("정말로 이 교재를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, `subjects/${subjectId}/textbooks`, textbookId));
            showToast("교재가 삭제되었습니다.", false);
        } catch (error) { showToast("교재 삭제에 실패했습니다."); }
    },
    renderSubjectOptionsForLesson() {
        const defaultOption = '<option value="">-- 과목 선택 --</option>';
        this.elements.subjectSelectForLesson.innerHTML = defaultOption;
        this.state.subjects.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.id;
            option.textContent = sub.name;
            this.elements.subjectSelectForLesson.appendChild(option);
        });
    },
    async addNewClass() {
        const className = this.elements.newClassNameInput.value.trim();
        if (!className) { showToast("반 이름을 입력해주세요."); return; }
        if (this.state.selectedSubjectsForNewClass.size === 0) {
            showToast("반에 연결할 과목을 하나 이상 선택해주세요.");
            return;
        }
        const subjectsData = {};
        this.state.selectedSubjectsForNewClass.forEach(subjectId => {
            subjectsData[subjectId] = { textbooks: [] };
        });
        try {
            await addDoc(collection(db, 'classes'), { 
                name: className, 
                subjects: subjectsData,
                createdAt: serverTimestamp() 
            });
            showToast("새로운 반이 추가되었습니다.", false);
            this.elements.newClassNameInput.value = '';
            this.state.selectedSubjectsForNewClass.clear();
            this.elements.classSubjectsOptions.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
        } catch (error) { console.error("반 추가 실패:", error); showToast("반 추가에 실패했습니다."); }
    },
    listenForClasses() {
        const q = query(collection(db, 'classes'));
        onSnapshot(q, (snapshot) => {
            const classes = [];
            snapshot.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
            classes.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));
            this.state.classes = classes;
            this.renderClassList();
        });
    },
    renderClassList() {
        this.elements.classesList.innerHTML = '';
        const studentSelect = this.elements.classSelectForStudent;
        studentSelect.innerHTML = '<option value="">-- 반 선택 --</option>';
        if (this.state.classes.length === 0) {
            this.elements.classesList.innerHTML = '<p class="text-sm text-slate-400">생성된 반이 없습니다.</p>';
            return;
        }
        this.state.classes.forEach(cls => {
            const classDiv = document.createElement('div');
            const subjectIds = cls.subjects ? Object.keys(cls.subjects) : [];
            const assignedSubjects = subjectIds
                .map(id => this.state.subjects.find(s => s.id === id)?.name)
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
            this.elements.classesList.appendChild(classDiv);
            classDiv.querySelector('.delete-class-btn').addEventListener('click', (e) => this.deleteClass(e.target.dataset.id));
            classDiv.querySelector('.edit-class-btn').addEventListener('click', (e) => this.openEditClassModal(e.target.dataset.id));
            const option = document.createElement('option');
            option.value = cls.id;
            option.textContent = cls.name;
            studentSelect.appendChild(option);
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
        } catch (error) { console.error("반 삭제 실패:", error); showToast("반 삭제에 실패했습니다."); }
    },
    async openEditClassModal(classId) {
        const classData = this.state.classes.find(c => c.id === classId);
        if (!classData) return;
        this.state.editingClass = classData;
        this.elements.editClassName.textContent = classData.name;
        const container = document.getElementById('admin-edit-class-subjects-and-textbooks');
        container.innerHTML = '불러오는 중...';
        const currentSubjects = classData.subjects || {};
        const allTextbooksBySubject = {};
        for (const subject of this.state.subjects) {
            const textbooksSnapshot = await getDocs(collection(db, `subjects/${subject.id}/textbooks`));
            allTextbooksBySubject[subject.id] = textbooksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
        container.innerHTML = '';
        this.state.subjects.forEach(subject => {
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
        this.elements.editClassModal.style.display = 'flex';
    },
    closeEditClassModal() {
        this.state.editingClass = null;
        this.elements.editClassModal.style.display = 'none';
    },
    async saveClassChanges() {
        if (!this.state.editingClass) return;
        const classId = this.state.editingClass.id;
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
    async addNewStudent() {
        const classId = this.state.selectedClassIdForStudent;
        const studentName = this.elements.newStudentNameInput.value.trim();
        const phone = this.elements.newStudentPasswordInput.value.trim();
        if (!classId) { showToast("학생을 추가할 반을 먼저 선택해주세요."); return; }
        if (!studentName || !phone) { showToast("학생 이름과 전화번호를 모두 입력해주세요."); return; }
        if (!/^\d+$/.test(phone) || phone.length < 4) {
            showToast("전화번호는 4자리 이상의 숫자로 입력해주세요."); return;
        }
        const password = phone.slice(-4);
        try {
            await addDoc(collection(db, 'students'), { name: studentName, password: password, classId: classId, createdAt: serverTimestamp() });
            showToast(`새로운 학생이 추가되었습니다. (비밀번호: ${password})`, false);
            this.elements.newStudentNameInput.value = '';
            this.elements.newStudentPasswordInput.value = '';
        } catch (error) { console.error("학생 추가 실패:", error); showToast("학생 추가에 실패했습니다."); }
    },
    listenForStudents() {
        const classId = this.state.selectedClassIdForStudent;
        if (!this.elements.studentsList) return;
        if (!classId) { this.elements.studentsList.innerHTML = '<p class="text-sm text-slate-400">먼저 반을 선택해주세요.</p>'; return; }
        const q = query(collection(db, 'students'), where("classId", "==", classId));
        onSnapshot(q, (snapshot) => {
            this.elements.studentsList.innerHTML = '';
            if (snapshot.empty) { this.elements.studentsList.innerHTML = '<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>'; return; }
            const students = [];
            snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
            students.sort((a, b) => a.name.localeCompare(b.name));
            students.forEach(std => this.renderStudent(std));
        });
    },
    renderStudent(studentData) {
        const studentDiv = document.createElement('div');
        studentDiv.className = "p-3 border rounded-lg flex items-center justify-between";
        studentDiv.innerHTML = `
            <span class="font-medium text-slate-700">${studentData.name}</span>
            <div class="flex gap-2">
                <button data-id="${studentData.id}" data-name="${studentData.name}" class="reset-password-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">비밀번호 초기화</button>
                <button data-id="${studentData.id}" class="delete-student-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
            </div>
        `;
        this.elements.studentsList.appendChild(studentDiv);
        studentDiv.querySelector('.delete-student-btn').addEventListener('click', async (e) => {
            if (confirm(`'${studentData.name}' 학생을 정말 삭제하시겠습니까?`)) {
                await deleteDoc(doc(db, "students", e.target.dataset.id));
                showToast("학생이 삭제되었습니다.", false);
            }
        });
        studentDiv.querySelector('.reset-password-btn').addEventListener('click', (e) => {
            this.resetStudentPassword(e.target.dataset.id, e.target.dataset.name);
        });
    },
     async resetStudentPassword(studentId, studentName) {
        const newPhone = prompt(`'${studentName}' 학생의 새 전화번호를 입력하세요.\n(비밀번호는 전화번호 뒷 4자리로 자동 설정됩니다.)`);
        if (newPhone === null) return;
        if (!/^\d+$/.test(newPhone) || newPhone.length < 4) {
            showToast("전화번호는 4자리 이상의 숫자로 입력해주세요."); return;
        }
        const finalPassword = newPhone.slice(-4);
        try {
            await updateDoc(doc(db, 'students', studentId), { password: finalPassword });
            showToast(`'${studentName}' 학생의 비밀번호가 '${finalPassword}'로 초기화되었습니다.`, false);
        } catch (error) { console.error("비밀번호 초기화 실패:", error); showToast("비밀번호 초기화에 실패했습니다."); }
    },
    handleLessonFilterChange() {
        const canShow = !!this.state.selectedSubjectIdForLesson;
        this.elements.lessonsManagementContent.style.display = canShow ? 'block' : 'none';
        this.elements.lessonPrompt.style.display = canShow ? 'none' : 'block';
        if (canShow) {
            this.listenForLessons();
        } else {
            this.elements.lessonsList.innerHTML = '';
        }
    },
    listenForLessons() {
        const { selectedSubjectIdForLesson } = this.state;
        if (!selectedSubjectIdForLesson) return;
        const lessonsRef = collection(db, 'subjects', selectedSubjectIdForLesson, 'lessons');
        const q = query(lessonsRef);
        onSnapshot(q, (snapshot) => {
            let lessons = [];
            snapshot.forEach(doc => lessons.push({ id: doc.id, ...doc.data() }));
            // order 필드가 있으면 그걸로, 없으면 생성 시간으로 정렬
            lessons.sort((a, b) => {
                const orderA = a.order ?? Infinity;
                const orderB = b.order ?? Infinity;
                if (orderA !== orderB) {
                    return orderA - orderB;
                }
                return (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0);
            });
            this.state.lessons = lessons;
            this.renderLessonList();
        });
    },
    renderLessonList() {
        this.elements.lessonsList.innerHTML = '';
        if (this.state.lessons.length === 0) {
            this.elements.lessonsList.innerHTML = '<p class="text-center text-slate-500 py-8">아직 생성된 학습 세트가 없습니다.</p>';
            return;
        }
        this.state.lessons.forEach(lesson => this.renderLessonCard(lesson));
        this.initDragAndDrop();
    },
    renderLessonCard(lesson) {
        const card = document.createElement('div');
        const isActive = lesson.isActive === true;
        card.className = `lesson-card p-4 border rounded-lg flex items-center justify-between gap-2 ${isActive ? 'bg-blue-50 border-blue-300' : 'bg-white'}`;
        card.setAttribute('draggable', 'true');
        card.dataset.id = lesson.id;

        card.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="drag-handle material-icons text-slate-400">drag_indicator</span>
                <h3 class="font-bold text-slate-800">${lesson.title}</h3>
            </div>
            <div class="flex-shrink-0 flex items-center gap-2">
                <button data-id="${lesson.id}" class="edit-lesson-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${lesson.id}" data-active="${isActive}" class="toggle-active-btn ${isActive ? 'bg-gray-500 hover:bg-gray-600' : 'bg-green-500 hover:bg-green-600'} text-white font-semibold px-3 py-1 rounded-lg transition text-xs">${isActive ? '비활성화' : '활성화'}</button>
                <button data-id="${lesson.id}" class="delete-btn bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded-lg transition text-xs">삭제</button>
            </div>`;
        this.elements.lessonsList.appendChild(card);
        card.querySelector('.edit-lesson-btn').addEventListener('click', (e) => this.openLessonModalForEdit(e.target.dataset.id));
        card.querySelector('.toggle-active-btn').addEventListener('click', (e) => this.toggleLessonActive(e.target.dataset.id, e.target.dataset.active === 'true'));
        card.querySelector('.delete-btn').addEventListener('click', (e) => this.deleteLesson(e.target.dataset.id));
    },
    initDragAndDrop() {
        const list = this.elements.lessonsList;
        let draggedItem = null;

        list.addEventListener('dragstart', e => {
            draggedItem = e.target.closest('.lesson-card');
            setTimeout(() => {
                draggedItem.classList.add('dragging');
            }, 0);
        });

        list.addEventListener('dragend', e => {
            setTimeout(() => {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }, 0);
        });

        list.addEventListener('dragover', e => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(list, e.clientY);
            const currentlyDragging = document.querySelector('.dragging');
            if (afterElement == null) {
                list.appendChild(currentlyDragging);
            } else {
                list.insertBefore(currentlyDragging, afterElement);
            }
        });
    },
    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.lesson-card:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    },
    async saveLessonOrder() {
        const { selectedSubjectIdForLesson } = this.state;
        if (!selectedSubjectIdForLesson) return;

        const lessonCards = this.elements.lessonsList.querySelectorAll('.lesson-card');
        if (lessonCards.length === 0) return;

        const batch = writeBatch(db);
        lessonCards.forEach((card, index) => {
            const lessonId = card.dataset.id;
            const lessonRef = doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', lessonId);
            batch.update(lessonRef, { order: index });
        });

        try {
            await batch.commit();
            showToast("학습 순서가 성공적으로 저장되었습니다.", false);
        } catch (error) {
            console.error("순서 저장 실패:", error);
            showToast("순서 저장에 실패했습니다.");
        }
    },
    async toggleLessonActive(lessonId, currentStatus) {
        const { selectedSubjectIdForLesson } = this.state;
        const lessonRef = doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', lessonId);
        try {
            await updateDoc(lessonRef, { isActive: !currentStatus });
            showToast(`학습이 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`, false);
        } catch (error) { console.error("활성화 상태 변경 실패:", error); showToast("활성화 상태 변경에 실패했습니다.");}
    },
    async deleteLesson(lessonIdToDelete) {
        const { selectedSubjectIdForLesson } = this.state;
        if (!confirm("정말로 이 학습 세트를 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', lessonIdToDelete));
            showToast("학습 세트가 성공적으로 삭제되었습니다.", false);
        } catch (error) { console.error("삭제 실패:", error); showToast("학습 세트 삭제에 실패했습니다.");}
    },
    async saveLesson() {
        const { selectedSubjectIdForLesson, editingLesson } = this.state;
        const title = this.elements.lessonTitle.value.trim();
        const video1Url = this.elements.video1Url.value.trim();
        const video2Url = this.elements.video2Url.value.trim();
        if (!title || !video1Url || !video2Url || !this.state.generatedQuiz) { showToast("모든 필드를 채워주세요."); return; }
        this.setSaveButtonLoading(true);
        const lessonData = { 
            title, video1Url, video2Url, 
            questionBank: this.state.generatedQuiz,
        };
        try {
            if (editingLesson) {
                const lessonRef = doc(db, 'subjects', selectedSubjectIdForLesson, 'lessons', editingLesson.id);
                await updateDoc(lessonRef, lessonData);
                showToast("학습 세트가 성공적으로 수정되었습니다.", false);
            } else {
                const newOrder = this.state.lessons.length;
                lessonData.order = newOrder;
                lessonData.isActive = false;
                lessonData.createdAt = serverTimestamp();
                const lessonsRef = collection(db, 'subjects', selectedSubjectIdForLesson, 'lessons');
                await addDoc(lessonsRef, lessonData);
                showToast("학습 세트가 성공적으로 생성되었습니다.", false);
            }
            this.hideModal();
        } catch(error) { showToast("저장 실패: " + error.message); } 
        finally { this.setSaveButtonLoading(false); }
    },
    openLessonModalForCreate() {
        this.state.editingLesson = null;
        this.elements.modalTitle.textContent = "새 학습 세트 만들기";
        this.elements.modal.style.display = 'flex';
        this.elements.lessonTitle.value = '';
        this.elements.video1Url.value = '';
        this.elements.video2Url.value = '';
        this.elements.quizJsonInput.value = '';
        this.elements.questionsPreviewContainer.classList.add('hidden');
        this.state.generatedQuiz = null;
    },
    openLessonModalForEdit(lessonId) {
        const lessonData = this.state.lessons.find(l => l.id === lessonId);
        if (!lessonData) {
            showToast("수정할 학습 세트 정보를 찾을 수 없습니다.");
            return;
        }
        this.state.editingLesson = lessonData;
        this.elements.modalTitle.textContent = "학습 세트 수정";
        this.elements.lessonTitle.value = lessonData.title;
        this.elements.video1Url.value = lessonData.video1Url;
        this.elements.video2Url.value = lessonData.video2Url;
        this.elements.quizJsonInput.value = JSON.stringify(lessonData.questionBank, null, 2);
        this.handleJsonPreview();
        this.elements.modal.style.display = 'flex';
    },
    hideModal() {
        this.state.editingLesson = null;
        this.elements.modal.style.display = 'none';
    },
    handleJsonPreview() {
        const jsonText = this.elements.quizJsonInput.value.trim(); 
        if (!jsonText) { 
            showToast("붙여넣은 내용이 없습니다."); 
            this.state.generatedQuiz = null;
            this.elements.questionsPreviewContainer.classList.add('hidden');
            return; 
        }
        try {
            const parsedJson = JSON.parse(jsonText);
            const questionBank = Array.isArray(parsedJson) ? parsedJson : parsedJson.questionBank;
            if (!questionBank || !Array.isArray(questionBank)) {
                throw new Error("'questionBank' 배열을 찾을 수 없습니다.");
            }
            this.state.generatedQuiz = questionBank;
            const questionCount = this.state.generatedQuiz.length;
            this.elements.questionsPreviewTitle.textContent = `생성된 퀴즈 (${questionCount}문항)`;
            this.elements.questionsPreviewList.innerHTML = this.state.generatedQuiz.map((q, i) => `<p><b>${i+1}. ${q.question}</b></p>`).join('');
            this.elements.questionsPreviewContainer.classList.remove('hidden'); 
            showToast(`퀴즈 ${questionCount}개를 성공적으로 불러왔습니다.`, false);
        } catch (error) {
            this.state.generatedQuiz = null; 
            this.elements.questionsPreviewContainer.classList.add('hidden');
            showToast(`JSON 형식이 올바르지 않습니다: ${error.message}`);
        }
    },
    setSaveButtonLoading(isLoading) {
        if (!this.elements.saveBtnText || !this.elements.saveLoader || !this.elements.saveLessonBtn) return;
        this.elements.saveBtnText.classList.toggle('hidden', isLoading); this.elements.saveLoader.classList.toggle('hidden', !isLoading);
        this.elements.saveLessonBtn.disabled = isLoading;
    }
};

export default AdminApp;