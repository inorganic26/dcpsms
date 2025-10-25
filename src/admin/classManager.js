// src/admin/classManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, where, query, getDocs, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

// ✨ 공통 반 설정 편집기 import
import { createClassEditor } from '../shared/classEditor.js';

// ✨ 관리자 앱의 모달 내부 요소 ID 맵
const adminClassEditorConfig = {
    app: null, // app 인스턴스는 init 시 주입됨
    elements: {
        editClassModal: 'admin-edit-class-modal',
        editClassName: 'admin-edit-class-name',
        closeEditClassModalBtn: 'admin-close-edit-class-modal-btn',
        cancelEditClassBtn: 'admin-cancel-edit-class-btn',
        saveClassEditBtn: 'admin-save-class-edit-btn',
        editClassSubjectsContainer: 'admin-edit-class-subjects-and-textbooks',
        editClassTypeSelect: 'admin-edit-class-type',
        // (학생 관련 요소는 이 config에 포함시키지 않음)
    }
};


export const classManager = {
    sharedClassEditor: null, // ✨ 공통 편집기 인스턴스

    init(app) {
        this.app = app;
        adminClassEditorConfig.app = app; // ✨ config에 앱 인스턴스 주입

        // ✨ 공통 편집기 생성 및 초기화
        this.sharedClassEditor = createClassEditor(adminClassEditorConfig);

        // --- 관리자 고유 이벤트 리스너 ---
        this.app.elements.addClassBtn?.addEventListener('click', () => this.addNewClass());

        // ✨ 저장 버튼 리스너 (공통 모듈 호출 + 관리자 앱 고유 후속 처리)
        document.getElementById(adminClassEditorConfig.elements.saveClassEditBtn)?.addEventListener('click', async () => {
            const success = await this.sharedClassEditor.saveClassChanges();
            if (success) {
                // ✨ 저장 성공 후 AdminApp의 상태 갱신 (onSnapshot이 처리하므로 listenForClasses 재호출 불필요)
                // this.listenForClasses(); // onSnapshot 사용 중이므로 필요 없음
                // classManager는 adminApp의 state.classes를 직접 수정하지 않음, onSnapshot이 갱신
            }
        });

        this.listenForClasses();
    },

    async addNewClass() {
        // ... (기존 로직 변경 없음) ...
        const { newClassNameInput } = this.app.elements;
        if (!newClassNameInput) { /* ... */ return; }
        const className = newClassNameInput.value.trim();
        if (!className) { /* ... */ return; }
        try {
            await addDoc(collection(db, 'classes'), {
                name: className,
                subjects: {},
                classType: 'self-directed',
                createdAt: serverTimestamp()
            });
            showToast("새로운 반이 추가되었습니다. '수정' 버튼으로 과목, 학생, 반 특성을 설정하세요.", false);
            newClassNameInput.value = '';
        } catch (error) { /* ... */ }
    },

    listenForClasses() {
        // ... (기존 로직 변경 없음) ...
        console.log("[classManager] Starting to listen for classes...");
        const q = query(collection(db, 'classes'));
        onSnapshot(q, (snapshot) => {
            console.log(`[classManager] Firestore snapshot received for classes. Empty: ${snapshot.empty}, Size: ${snapshot.size}`);
            const classes = [];
            snapshot.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
            classes.sort((a, b) => a.name.localeCompare(b.name));
            if (this.app && this.app.state) {
                this.app.state.classes = classes;
            } else {
                console.error("[classManager] AdminApp instance or state is not available!"); return;
            }
            this.renderClassList();
            console.log("[classManager] Dispatching 'classesUpdated' event.");
            document.dispatchEvent(new CustomEvent('classesUpdated'));
        }, (error) => { /* ... */ });
    },

    renderClassList() {
        // ... (기존 로직 변경 없음, openEditClassModal 호출 부분은 유지) ...
        const { classesList } = this.app.elements;
        if (!classesList) { /* ... */ return; }
        const { subjects } = this.app.state || { subjects: [] };
        classesList.innerHTML = '';
        if (!this.app.state || !this.app.state.classes || this.app.state.classes.length === 0) {
            classesList.innerHTML = '<p class="text-sm text-slate-400">생성된 반이 없습니다.</p>';
            return;
        }
        this.app.state.classes.forEach(cls => {
            const classDiv = document.createElement('div');
            // ... (innerHTML 생성 로직) ...
            const subjectIds = cls.subjects ? Object.keys(cls.subjects) : [];
            const assignedSubjects = subjectIds.map(id => subjects.find(s => s.id === id)?.name).filter(Boolean).join(', ');
            const classTypeDisplay = cls.classType === 'live-lecture' ? '현강반' : '자기주도반';
            classDiv.className = "p-3 border rounded-lg";
            classDiv.innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <span class="font-medium text-slate-700">${cls.name}</span>
                        <span class="text-xs text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded ml-2">${classTypeDisplay}</span> </div>
                    <div class="flex items-center gap-2">
                        <button data-id="${cls.id}" class="edit-class-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                        <button data-id="${cls.id}" class="delete-class-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
                    </div>
                </div>
                <p class="text-xs text-slate-500 mt-1">연결된 과목: ${assignedSubjects || '없음'}</p>
            `;
            classesList.appendChild(classDiv);
            classDiv.querySelector('.delete-class-btn')?.addEventListener('click', (e) => this.deleteClass(e.target.dataset.id));
            classDiv.querySelector('.edit-class-btn')?.addEventListener('click', (e) => this.openEditClassModal(e.target.dataset.id)); // ✨ 이 부분 유지
        });
    },

    async deleteClass(classId) {
        // ... (기존 로직 변경 없음) ...
        if (!classId) return; if (!confirm("정말로 이 반을 삭제하시겠습니까? 소속된 학생들은 '미배정' 상태가 됩니다.")) return;
        try {
            const batch = writeBatch(db); const classRef = doc(db, 'classes', classId); batch.delete(classRef);
            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(studentDoc => { batch.update(studentDoc.ref, { classId: null }); });
            const lecturesQuery = query(collection(db, 'classLectures'), where('classId', '==', classId));
            const lecturesSnapshot = await getDocs(lecturesQuery);
            lecturesSnapshot.forEach(lectureDoc => { batch.delete(lectureDoc.ref); });
            await batch.commit(); showToast("반이 삭제되고 관련 데이터(학생 배정 해제, 수업 영상)가 정리되었습니다.", false);
        } catch (error) { console.error("[classManager] 반 삭제 실패:", error); showToast("반 삭제에 실패했습니다."); }
    },

    async openEditClassModal(classId) {
        if (!classId || !this.app || !this.app.state || !this.app.state.classes) return;
        const classData = this.app.state.classes.find(c => c.id === classId);
        if (!classData) return;
        
        // ✨ 수정할 대상 설정
        this.app.state.editingClass = classData;

        // ✨ 공통 모듈 호출
        await this.sharedClassEditor.openEditClassModal();

        // --- ✨ 관리자 고유 로직: 학생 목록 렌더링 ---
        const studentsContainer = document.getElementById('admin-edit-class-students-container');
        if (studentsContainer) {
            studentsContainer.innerHTML = '학생 정보 불러오는 중...';
            try {
                await this.renderStudentsForEditing(classId, studentsContainer);
            } catch (error) {
                console.error("[classManager] Error rendering students for editing:", error);
                studentsContainer.innerHTML = '<p class="text-red-500">학생 정보 로딩 실패</p>';
            }
        } else {
            console.warn("[classManager] 'admin-edit-class-students-container' not found.");
        }
    },

    // ✨ renderSubjectsForEditing 함수는 공통 모듈로 이동했으므로 삭제

    // ✨ renderStudentsForEditing 함수는 관리자 고유 기능이므로 *유지*
    async renderStudentsForEditing(classId, container) {
        // ... (기존 renderStudentsForEditing 로직 전체 복사) ...
        const allStudentsSnapshot = await getDocs(query(collection(db, 'students')));
        const allStudents = allStudentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const studentsInClass = allStudents.filter(s => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name));
        const studentsNotInClass = allStudents.filter(s => !s.classId || s.classId !== classId).sort((a, b) => a.name.localeCompare(b.name));
        container.innerHTML = `
            <div>
                <h4 class="font-semibold text-slate-700 mb-2">소속 학생 (${studentsInClass.length}명)</h4>
                <div id="admin-students-in-class-list" class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border p-2 rounded-md"></div>
            </div>
            <div>
                <h4 class="font-semibold text-slate-700 mb-2">학생 추가</h4>
                <input type="text" id="admin-student-search-input" class="w-full px-3 py-2 border rounded-lg mb-2" placeholder="이름 또는 전화번호로 검색">
                <div id="admin-students-not-in-class-list" class="space-y-2 max-h-40 overflow-y-auto custom-scrollbar border p-2 rounded-md"></div>
            </div>
        `;
        const inClassList = container.querySelector('#admin-students-in-class-list');
        const notInClassList = container.querySelector('#admin-students-not-in-class-list');
        const searchInput = container.querySelector('#admin-student-search-input');
        const renderStudentLists = (searchTerm = '') => {
            if (!inClassList || !notInClassList) return;
            inClassList.innerHTML = ''; notInClassList.innerHTML = '';
            const lowerSearchTerm = searchTerm.toLowerCase();
            if (studentsInClass.length === 0) { inClassList.innerHTML = '<p class="text-sm text-slate-400">소속된 학생이 없습니다.</p>'; } else {
                studentsInClass.forEach(student => {
                    const studentDiv = document.createElement('div'); studentDiv.className = "p-2 bg-slate-50 rounded-md flex justify-between items-center";
                    studentDiv.innerHTML = `<span class="text-sm">${student.name} (${student.phone || '번호없음'})</span> <button data-id="${student.id}" class="remove-student-btn text-red-500 text-xs font-bold">제외</button>`;
                    inClassList.appendChild(studentDiv);
                    studentDiv.querySelector('.remove-student-btn')?.addEventListener('click', async (e) => {
                         try { await updateDoc(doc(db, 'students', e.target.dataset.id), { classId: null }); showToast(`${student.name} 학생을 반에서 제외했습니다.`, false); await this.renderStudentsForEditing(classId, container); } catch (err) { console.error("학생 제외 실패:", err); showToast("학생 제외 처리 중 오류 발생"); }
                    });
                });
            }
            const filteredStudents = studentsNotInClass.filter(s => s.name.toLowerCase().includes(lowerSearchTerm) || (s.phone && s.phone.includes(searchTerm)));
            if (filteredStudents.length === 0) { notInClassList.innerHTML = '<p class="text-sm text-slate-400">추가할 학생이 없거나 검색 결과가 없습니다.</p>'; } else {
                 filteredStudents.forEach(student => {
                    const studentDiv = document.createElement('div'); studentDiv.className = "p-2 bg-slate-50 rounded-md flex justify-between items-center";
                    const otherClassName = student.classId && this.app?.state?.classes ? this.app.state.classes.find(c => c.id === student.classId)?.name : '미배정';
                    studentDiv.innerHTML = ` <div> <span class="text-sm">${student.name} (${student.phone || '번호없음'})</span> <span class="text-xs text-slate-400 ml-1">[${otherClassName || '정보없음'}]</span> </div> <button data-id="${student.id}" class="add-student-btn text-blue-500 text-xs font-bold">추가</button>`;
                    notInClassList.appendChild(studentDiv);
                    studentDiv.querySelector('.add-student-btn')?.addEventListener('click', async (e) => {
                         try { await updateDoc(doc(db, 'students', e.target.dataset.id), { classId: classId }); showToast(`${student.name} 학생을 반에 추가했습니다.`, false); await this.renderStudentsForEditing(classId, container); } catch (err) { console.error("학생 추가 실패:", err); showToast("학생 추가 처리 중 오류 발생"); }
                    });
                });
            }
        };
        searchInput?.addEventListener('input', (e) => renderStudentLists(e.target.value.trim()));
        renderStudentLists();
    },

    // ✨ closeEditClassModal은 공통 모듈에 위임
    closeEditClassModal() {
        this.sharedClassEditor.closeEditClassModal();
    },

    // ✨ saveClassChanges는 공통 모듈에 위임 (저장 버튼 리스너가 init에서 처리)
    // (이 함수는 더 이상 직접 호출되지 않지만, 만약 다른 곳에서 호출한다면 공통 모듈 호출로 변경)
    /*
    async saveClassChanges() {
        // 이 함수는 이제 init의 saveClassEditBtn 리스너가 대체합니다.
        // 만약 이 함수를 직접 호출하는 다른 코드가 있다면,
        // 그 코드가 this.sharedClassEditor.saveClassChanges()를 호출하도록 수정해야 합니다.
        console.warn("[classManager] saveClassChanges() is deprecated. Use sharedClassEditor.saveClassChanges() via button listener.");
        await this.sharedClassEditor.saveClassChanges();
    },
    */
};