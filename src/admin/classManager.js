// src/admin/classManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, where, query, getDocs, writeBatch } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const classManager = {
    init(app) {
        this.app = app;

        // 반 관리 관련 이벤트 리스너 설정 (null 체크 추가)
        this.app.elements.addClassBtn?.addEventListener('click', () => this.addNewClass());
        this.app.elements.closeEditClassModalBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.cancelEditClassBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.app.elements.saveClassEditBtn?.addEventListener('click', () => this.saveClassChanges());

        this.listenForClasses();
    },

    async addNewClass() {
        const { newClassNameInput } = this.app.elements;
        // null 체크 추가
        if (!newClassNameInput) {
             console.error("[classManager] newClassNameInput element not found.");
             showToast("반 이름 입력 필드를 찾을 수 없습니다.");
             return;
        }
        const className = newClassNameInput.value.trim();
        if (!className) {
            showToast("반 이름을 입력해주세요.");
            return;
        }

        try {
            // ✅ 반 추가 시 classType 기본값으로 'self-directed' 추가
            await addDoc(collection(db, 'classes'), {
                name: className,
                subjects: {}, // 빈 과목으로 반 생성
                classType: 'self-directed', // ✅ 기본값 추가
                createdAt: serverTimestamp()
            });
            showToast("새로운 반이 추가되었습니다. '수정' 버튼으로 과목, 학생, 반 특성을 설정하세요.", false);
            newClassNameInput.value = '';
        } catch (error) {
            console.error("[classManager] 반 추가 실패:", error);
            showToast("반 추가에 실패했습니다.");
        }
    },

    listenForClasses() {
        console.log("[classManager] Starting to listen for classes..."); // ✨ 로그 추가
        const q = query(collection(db, 'classes'));
        onSnapshot(q, (snapshot) => {
            console.log(`[classManager] Firestore snapshot received for classes. Empty: ${snapshot.empty}, Size: ${snapshot.size}`); // ✨ 로그 추가
            const classes = [];
            snapshot.forEach(doc => classes.push({ id: doc.id, ...doc.data() }));
            // 이름순 정렬 추가
            classes.sort((a, b) => a.name.localeCompare(b.name));

            console.log("[classManager] Fetched and sorted classes:", classes); // ✨ 로그 추가

            // this.app.state.classes 업데이트 전에 null/undefined 확인 (방어 코드)
            if (this.app && this.app.state) {
                this.app.state.classes = classes;
            } else {
                console.error("[classManager] AdminApp instance or state is not available!"); // ✨ 오류 로그 추가
                return; // 앱 상태 없으면 중단
            }

            this.renderClassList(); // 목록 렌더링은 그대로 유지

            // 반 목록이 업데이트되었다는 신호를 앱 전체에 보냅니다.
            console.log("[classManager] Dispatching 'classesUpdated' event."); // ✨ 로그 추가
            document.dispatchEvent(new CustomEvent('classesUpdated'));
        }, (error) => { // 에러 콜백 추가
            console.error("[classManager] Error listening to classes:", error); // ✨ 상세 오류 로깅
            showToast("반 목록 실시간 업데이트 중 오류 발생.", true);
        });
    },

    renderClassList() {
        const { classesList } = this.app.elements;
        // null 체크 추가
        if (!classesList) {
             console.error("[classManager] classesList element not found for rendering.");
             return;
        }
        const { subjects } = this.app.state || { subjects: [] }; // state가 없을 경우 기본값

        classesList.innerHTML = '';

        if (!this.app.state || !this.app.state.classes || this.app.state.classes.length === 0) {
            classesList.innerHTML = '<p class="text-sm text-slate-400">생성된 반이 없습니다.</p>';
            return;
        }

        this.app.state.classes.forEach(cls => {
            const classDiv = document.createElement('div');
            const subjectIds = cls.subjects ? Object.keys(cls.subjects) : [];
            const assignedSubjects = subjectIds
                .map(id => subjects.find(s => s.id === id)?.name)
                .filter(Boolean)
                .join(', ');

            // ✅ 반 유형 표시 추가
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
            // null 체크 후 이벤트 리스너 추가
            classDiv.querySelector('.delete-class-btn')?.addEventListener('click', (e) => this.deleteClass(e.target.dataset.id));
            classDiv.querySelector('.edit-class-btn')?.addEventListener('click', (e) => this.openEditClassModal(e.target.dataset.id));
        });
    },

    async deleteClass(classId) {
        if (!classId) return; // ID 없으면 중단
        if (!confirm("정말로 이 반을 삭제하시겠습니까? 소속된 학생들은 '미배정' 상태가 됩니다.")) return;
        try {
            const batch = writeBatch(db);
            const classRef = doc(db, 'classes', classId);
            batch.delete(classRef);

            const studentsQuery = query(collection(db, 'students'), where('classId', '==', classId));
            const studentsSnapshot = await getDocs(studentsQuery);
            studentsSnapshot.forEach(studentDoc => {
                batch.update(studentDoc.ref, { classId: null });
            });

            // ✅ 추가: 해당 반의 수업 영상(classLectures)도 삭제
            const lecturesQuery = query(collection(db, 'classLectures'), where('classId', '==', classId));
            const lecturesSnapshot = await getDocs(lecturesQuery);
            lecturesSnapshot.forEach(lectureDoc => {
                 batch.delete(lectureDoc.ref);
            });

            await batch.commit();
            showToast("반이 삭제되고 관련 데이터(학생 배정 해제, 수업 영상)가 정리되었습니다.", false);
        } catch (error) {
            console.error("[classManager] 반 삭제 실패:", error);
            showToast("반 삭제에 실패했습니다.");
        }
    },

    async openEditClassModal(classId) {
        if (!classId || !this.app || !this.app.state || !this.app.state.classes) return;
        const classData = this.app.state.classes.find(c => c.id === classId);
        if (!classData) return;
        this.app.state.editingClass = classData;

        // 필수 요소 확인 강화
        const editClassName = document.getElementById('admin-edit-class-name');
        const subjectsContainer = document.getElementById('admin-edit-class-subjects-and-textbooks');
        const modal = document.getElementById('admin-edit-class-modal');
        const studentsContainer = document.getElementById('admin-edit-class-students-container');
        const classTypeSelect = document.getElementById('admin-edit-class-type');

        if (!editClassName || !subjectsContainer || !modal || !studentsContainer || !classTypeSelect) {
            console.error("[classManager] 필수 모달 요소 중 일부를 찾을 수 없습니다:",
                { editClassName, subjectsContainer, modal, studentsContainer, classTypeSelect });
            showToast("반 수정 화면을 여는 데 필요한 구성 요소가 부족합니다.");
            return;
        }

        editClassName.textContent = classData.name;
        classTypeSelect.value = classData.classType || 'self-directed';
        subjectsContainer.innerHTML = '과목 정보 불러오는 중...';
        studentsContainer.innerHTML = '학생 정보 불러오는 중...';
        document.body.classList.add('modal-open');
        modal.style.display = 'flex';

        // 과목 및 학생 정보 렌더링 (오류 처리 강화)
        try {
            await this.renderSubjectsForEditing(classData, subjectsContainer);
        } catch (error) {
            console.error("[classManager] Error rendering subjects for editing:", error);
            subjectsContainer.innerHTML = '<p class="text-red-500">과목/교재 정보 로딩 실패</p>';
        }
        try {
            await this.renderStudentsForEditing(classId, studentsContainer);
        } catch (error) {
            console.error("[classManager] Error rendering students for editing:", error);
            studentsContainer.innerHTML = '<p class="text-red-500">학생 정보 로딩 실패</p>';
        }
    },

    async renderSubjectsForEditing(classData, container) {
        if (!this.app || !this.app.state || !this.app.state.subjects) {
             container.innerHTML = '<p class="text-red-500">공통 과목 정보를 불러올 수 없습니다.</p>';
             return;
        }
        const currentSubjects = classData.subjects || {};
        const textbookPromises = this.app.state.subjects.map(subject =>
            getDocs(collection(db, `subjects/${subject.id}/textbooks`))
        );
        const textbookSnapshots = await Promise.all(textbookPromises);

        const allTextbooksBySubject = {};
        this.app.state.subjects.forEach((subject, index) => {
            allTextbooksBySubject[subject.id] = textbookSnapshots[index].docs.map(doc => ({ id: doc.id, ...doc.data() }));
        });

        container.innerHTML = ''; // 초기화
        if (this.app.state.subjects.length === 0) {
            container.innerHTML = '<p class="text-sm text-slate-400">등록된 공통 과목이 없습니다.</p>';
            return;
        }

        this.app.state.subjects.forEach(subject => {
            const isSubjectSelected = currentSubjects.hasOwnProperty(subject.id);
            const selectedTextbooks = isSubjectSelected && Array.isArray(currentSubjects[subject.id]?.textbooks) ? new Set(currentSubjects[subject.id].textbooks) : new Set();
            const subjectGroup = document.createElement('div');
            subjectGroup.className = 'p-3 border rounded-lg';
            let textbookHtml = '<div class="pl-6 mt-2 space-y-1">';

            const textbooksForThisSubject = allTextbooksBySubject[subject.id] || [];
            if (textbooksForThisSubject.length > 0) {
                textbooksForThisSubject.forEach(textbook => {
                    textbookHtml += `
                        <div>
                            <input type="checkbox" id="textbook-${textbook.id}" data-subject-id="${subject.id}" data-textbook-id="${textbook.id}" class="textbook-checkbox" ${selectedTextbooks.has(textbook.id) ? 'checked' : ''}>
                            <label for="textbook-${textbook.id}" class="ml-2 text-sm">${textbook.name}</label>
                        </div>`;
                });
                textbookHtml += '</div>';
            } else {
                textbookHtml = '<p class="pl-6 mt-2 text-sm text-slate-400">등록된 교재 없음</p>'; // 교재 없을 때 메시지
            }

            subjectGroup.innerHTML = `
                <div class="font-semibold">
                    <input type="checkbox" id="subject-${subject.id}" data-subject-id="${subject.id}" class="subject-checkbox" ${isSubjectSelected ? 'checked' : ''}>
                    <label for="subject-${subject.id}" class="ml-2">${subject.name}</label>
                </div>
                ${textbookHtml} `; // 교재가 없어도 컨테이너는 표시
            container.appendChild(subjectGroup);
        });
    },


    async renderStudentsForEditing(classId, container) {
        // 학생 목록 로딩
        const allStudentsSnapshot = await getDocs(query(collection(db, 'students')));
        const allStudents = allStudentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // 현재 반 학생과 다른 학생 분리 및 정렬
        const studentsInClass = allStudents.filter(s => s.classId === classId).sort((a, b) => a.name.localeCompare(b.name));
        const studentsNotInClass = allStudents.filter(s => !s.classId || s.classId !== classId).sort((a, b) => a.name.localeCompare(b.name));

        // HTML 구조 생성
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

        // DOM 요소 참조
        const inClassList = container.querySelector('#admin-students-in-class-list');
        const notInClassList = container.querySelector('#admin-students-not-in-class-list');
        const searchInput = container.querySelector('#admin-student-search-input');

        // 학생 목록 렌더링 함수
        const renderStudentLists = (searchTerm = '') => {
            if (!inClassList || !notInClassList) return; // 요소 없으면 중단
            inClassList.innerHTML = '';
            notInClassList.innerHTML = '';
            const lowerSearchTerm = searchTerm.toLowerCase();

            // 소속 학생 렌더링
            if (studentsInClass.length === 0) {
                 inClassList.innerHTML = '<p class="text-sm text-slate-400">소속된 학생이 없습니다.</p>';
            } else {
                studentsInClass.forEach(student => {
                    // 검색어 필터링 (소속 학생 목록에는 필터링 불필요할 수 있음)
                    // if (searchTerm && !student.name.toLowerCase().includes(lowerSearchTerm) && !(student.phone && student.phone.includes(searchTerm))) return;

                    const studentDiv = document.createElement('div');
                    studentDiv.className = "p-2 bg-slate-50 rounded-md flex justify-between items-center";
                    studentDiv.innerHTML = `
                        <span class="text-sm">${student.name} (${student.phone || '번호없음'})</span>
                        <button data-id="${student.id}" class="remove-student-btn text-red-500 text-xs font-bold">제외</button>
                    `;
                    inClassList.appendChild(studentDiv);
                    studentDiv.querySelector('.remove-student-btn')?.addEventListener('click', async (e) => {
                        try {
                            await updateDoc(doc(db, 'students', e.target.dataset.id), { classId: null });
                            showToast(`${student.name} 학생을 반에서 제외했습니다.`, false);
                            await this.renderStudentsForEditing(classId, container); // 목록 새로고침 (await 추가)
                        } catch (err) {
                            console.error("학생 제외 실패:", err);
                            showToast("학생 제외 처리 중 오류 발생");
                        }
                    });
                });
            }

            // 추가할 학생 필터링 및 렌더링
            const filteredStudents = studentsNotInClass.filter(s =>
                s.name.toLowerCase().includes(lowerSearchTerm) || (s.phone && s.phone.includes(searchTerm))
            );

            if (filteredStudents.length === 0) {
                 notInClassList.innerHTML = '<p class="text-sm text-slate-400">추가할 학생이 없거나 검색 결과가 없습니다.</p>';
            } else {
                 filteredStudents.forEach(student => {
                    const studentDiv = document.createElement('div');
                    studentDiv.className = "p-2 bg-slate-50 rounded-md flex justify-between items-center";
                    // this.app.state.classes가 로드되었는지 확인 후 반 이름 찾기
                    const otherClassName = student.classId && this.app?.state?.classes ? this.app.state.classes.find(c => c.id === student.classId)?.name : '미배정';
                    studentDiv.innerHTML = `
                         <div>
                            <span class="text-sm">${student.name} (${student.phone || '번호없음'})</span>
                            <span class="text-xs text-slate-400 ml-1">[${otherClassName || '정보없음'}]</span> </div>
                        <button data-id="${student.id}" class="add-student-btn text-blue-500 text-xs font-bold">추가</button>
                    `;
                    notInClassList.appendChild(studentDiv);
                    studentDiv.querySelector('.add-student-btn')?.addEventListener('click', async (e) => {
                         try {
                             await updateDoc(doc(db, 'students', e.target.dataset.id), { classId: classId });
                             showToast(`${student.name} 학생을 반에 추가했습니다.`, false);
                             await this.renderStudentsForEditing(classId, container); // 목록 새로고침 (await 추가)
                         } catch (err) {
                             console.error("학생 추가 실패:", err);
                             showToast("학생 추가 처리 중 오류 발생");
                         }
                    });
                });
            }
        };

        // 검색 입력 이벤트 리스너 (null 체크 추가)
        searchInput?.addEventListener('input', (e) => renderStudentLists(e.target.value.trim()));
        renderStudentLists(); // 초기 렌더링
    },


    closeEditClassModal() {
        if (this.app && this.app.state) {
            this.app.state.editingClass = null;
        }
        document.body.classList.remove('modal-open');
        const modal = document.getElementById('admin-edit-class-modal');
        if(modal) modal.style.display = 'none';
    },

    async saveClassChanges() {
        if (!this.app || !this.app.state || !this.app.state.editingClass) return;
        const classId = this.app.state.editingClass.id;
        const newSubjectsData = {};
        const classTypeSelect = document.getElementById('admin-edit-class-type'); // ✅ 반 유형 select 요소 가져오기

        if(!classTypeSelect) {
            console.error("반 유형 선택 요소를 찾을 수 없습니다.");
            showToast("반 유형을 설정할 수 없습니다.");
            return;
        }
        const newClassType = classTypeSelect.value; // ✅ 선택된 반 유형 값 가져오기

        const subjectCheckboxes = document.querySelectorAll('#admin-edit-class-modal .subject-checkbox:checked');
        subjectCheckboxes.forEach(subjectCheckbox => {
            const subjectId = subjectCheckbox.dataset.subjectId;
            const textbookCheckboxes = document.querySelectorAll(`#admin-edit-class-modal .textbook-checkbox[data-subject-id="${subjectId}"]:checked`);
            const selectedTextbookIds = Array.from(textbookCheckboxes).map(tb => tb.dataset.textbookId);
            newSubjectsData[subjectId] = { textbooks: selectedTextbookIds };
        });

        console.log("[classManager] Saving class changes:", { classId, newClassType, newSubjectsData }); // ✨ 로그 추가

        try {
            await updateDoc(doc(db, 'classes', classId), {
                subjects: newSubjectsData,
                classType: newClassType // ✅ 저장할 데이터에 추가
            });
            showToast("반 정보(과목/교재/유형)가 성공적으로 수정되었습니다.", false);
            this.closeEditClassModal(); // ✅ 수정 후 모달 닫기 추가
        } catch (error) {
            console.error("[classManager] 반 정보 수정 실패:", error);
            showToast("반 정보 수정에 실패했습니다.");
        }
    },
};