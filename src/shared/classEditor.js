// src/shared/classEditor.js

import { collection, getDocs, query, where, doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "./firebase.js";
import { getSubjects } from "../store/subjectStore.js"; // Store 사용
import { showToast } from "./utils.js";

export const classEditor = {
    elements: {},
    currentClassData: null,
    tempSelectedSubjects: {}, // { subjectId: { textbooks: [] } }

    init() {
        // 별도 초기화 로직 없음 (Store 구독은 사용하는 쪽에서 처리하거나 필요 시 추가)
    },

    // ===============================================================
    // 1. 과목 및 교재 설정 렌더링
    // ===============================================================
    async renderSubjectsForEditing(classData, container) {
        if (!container) return;
        this.currentClassData = classData;
        this.tempSelectedSubjects = JSON.parse(JSON.stringify(classData.subjects || {}));

        container.innerHTML = '<div class="loader-small mx-auto"></div> 과목 정보 로딩 중...';

        const allSubjects = getSubjects(); // Store에서 가져옴
        
        if (!allSubjects || allSubjects.length === 0) {
            container.innerHTML = '<p class="text-sm text-red-500">등록된 과목이 없거나 로딩되지 않았습니다.</p>';
            return;
        }

        container.innerHTML = '';
        const list = document.createElement('div');
        list.className = 'space-y-4';

        for (const subject of allSubjects) {
            const isSelected = !!this.tempSelectedSubjects[subject.id];
            
            const item = document.createElement('div');
            item.className = 'border p-3 rounded-lg bg-slate-50';
            
            // 과목 체크박스
            const header = document.createElement('div');
            header.className = 'flex items-center gap-2 mb-2';
            header.innerHTML = `
                <input type="checkbox" id="subj-${subject.id}" class="subject-checkbox w-4 h-4" value="${subject.id}" ${isSelected ? 'checked' : ''}>
                <label for="subj-${subject.id}" class="font-bold text-slate-700 cursor-pointer select-none">${subject.name}</label>
            `;
            item.appendChild(header);

            // 교재 선택 영역 (과목이 선택되었을 때만 표시)
            const textbookArea = document.createElement('div');
            textbookArea.id = `textbook-area-${subject.id}`;
            textbookArea.className = isSelected ? 'pl-6 block' : 'pl-6 hidden';
            textbookArea.innerHTML = '<p class="text-xs text-slate-400">교재 목록 로딩 중...</p>';
            
            item.appendChild(textbookArea);
            list.appendChild(item);

            // 이벤트 리스너: 과목 체크 시 교재 영역 토글 및 데이터 로드
            const checkbox = header.querySelector('input');
            checkbox.addEventListener('change', async (e) => {
                if (e.target.checked) {
                    textbookArea.classList.remove('hidden');
                    if (!this.tempSelectedSubjects[subject.id]) {
                        this.tempSelectedSubjects[subject.id] = { textbooks: [] };
                    }
                    await this.loadTextbooksForSubject(subject.id, textbookArea);
                } else {
                    textbookArea.classList.add('hidden');
                    delete this.tempSelectedSubjects[subject.id];
                }
            });

            // 이미 선택된 과목이라면 즉시 교재 로드
            if (isSelected) {
                this.loadTextbooksForSubject(subject.id, textbookArea);
            }
        }

        container.appendChild(list);
    },

    async loadTextbooksForSubject(subjectId, container) {
        try {
            const q = collection(db, 'subjects', subjectId, 'textbooks');
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                container.innerHTML = '<p class="text-xs text-slate-400">등록된 교재가 없습니다.</p>';
                return;
            }

            container.innerHTML = '';
            const selectedTextbooks = this.tempSelectedSubjects[subjectId]?.textbooks || [];

            snapshot.forEach(doc => {
                const tb = doc.data();
                const isTbSelected = selectedTextbooks.includes(doc.id);
                
                const div = document.createElement('div');
                div.className = 'flex items-center gap-2 mb-1';
                div.innerHTML = `
                    <input type="checkbox" id="tb-${doc.id}" class="textbook-checkbox w-3 h-3" value="${doc.id}" ${isTbSelected ? 'checked' : ''}>
                    <label for="tb-${doc.id}" class="text-sm text-slate-600 cursor-pointer">${tb.name}</label>
                `;
                container.appendChild(div);

                div.querySelector('input').addEventListener('change', (e) => {
                    const currentTbs = this.tempSelectedSubjects[subjectId].textbooks;
                    if (e.target.checked) {
                        if (!currentTbs.includes(doc.id)) currentTbs.push(doc.id);
                    } else {
                        const idx = currentTbs.indexOf(doc.id);
                        if (idx > -1) currentTbs.splice(idx, 1);
                    }
                });
            });

        } catch (e) {
            console.error(e);
            container.innerHTML = '<p class="text-xs text-red-400">교재 로딩 실패</p>';
        }
    },

    // 저장 버튼 클릭 시 호출하여 최종 데이터 반환
    getUpdatedClassData() {
        return {
            subjects: this.tempSelectedSubjects
        };
    },

    // ===============================================================
    // 2. 학생 관리 렌더링 (검색 기능 포함)
    // ===============================================================
    renderStudentsForEditing(classData, container) {
        if (!container) return;
        this.currentClassData = classData;
        
        container.innerHTML = `
            <div class="mb-4">
                <div class="flex gap-2">
                    <input type="text" id="student-search-input" class="form-input text-sm" placeholder="학생 이름 검색...">
                    <button id="student-search-btn" class="btn-secondary text-sm whitespace-nowrap">검색</button>
                </div>
                <div id="student-search-results" class="mt-2 max-h-32 overflow-y-auto border rounded hidden bg-white"></div>
            </div>
            <h4 class="font-bold text-sm text-slate-700 mb-2">현재 배정된 학생</h4>
            <div id="assigned-students-list" class="space-y-1 max-h-40 overflow-y-auto">
                <div class="loader-small"></div> 로딩 중...
            </div>
        `;

        this.loadAssignedStudents(classData.id);

        // 검색 이벤트
        const searchInput = container.querySelector('#student-search-input');
        const searchBtn = container.querySelector('#student-search-btn');
        const resultBox = container.querySelector('#student-search-results');

        const performSearch = async () => {
            const keyword = searchInput.value.trim();
            if (keyword.length < 1) { showToast("검색어를 입력하세요"); return; }
            
            resultBox.classList.remove('hidden');
            resultBox.innerHTML = '<div class="p-2 text-xs">검색 중...</div>';

            try {
                // 이름으로 검색 (접두사 검색)
                const q = query(collection(db, 'students'), 
                    where('name', '>=', keyword), 
                    where('name', '<=', keyword + '\uf8ff'));
                const snapshot = await getDocs(q);

                resultBox.innerHTML = '';
                if (snapshot.empty) {
                    resultBox.innerHTML = '<div class="p-2 text-xs text-slate-400">검색 결과 없음</div>';
                    return;
                }

                snapshot.forEach(docSnap => {
                    const s = docSnap.data();
                    const div = document.createElement('div');
                    div.className = 'p-2 hover:bg-slate-100 flex justify-between items-center cursor-pointer border-b text-sm';
                    div.innerHTML = `<span>${s.name} (${s.phone?.slice(-4)})</span> <span class="text-blue-500 font-bold text-xs">+ 추가</span>`;
                    
                    div.addEventListener('click', () => this.addStudentToClass(docSnap.id, s.name));
                    resultBox.appendChild(div);
                });
            } catch(e) {
                console.error(e);
                resultBox.innerHTML = '<div class="p-2 text-xs text-red-500">검색 오류</div>';
            }
        };

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => { if(e.key === 'Enter') performSearch(); });
    },

    async loadAssignedStudents(classId) {
        const listContainer = document.getElementById('assigned-students-list');
        if (!listContainer) return;

        try {
            const q = query(collection(db, 'students'), where('classId', '==', classId));
            const snapshot = await getDocs(q);

            listContainer.innerHTML = '';
            if (snapshot.empty) {
                listContainer.innerHTML = '<p class="text-xs text-slate-400">배정된 학생이 없습니다.</p>';
                return;
            }

            snapshot.forEach(docSnap => {
                const s = docSnap.data();
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center p-2 bg-slate-50 rounded border text-sm';
                div.innerHTML = `
                    <span>${s.name}</span>
                    <button class="text-red-500 text-xs font-bold hover:underline remove-student-btn">제거</button>
                `;
                div.querySelector('.remove-student-btn').addEventListener('click', () => 
                    this.removeStudentFromClass(docSnap.id, s.name)
                );
                listContainer.appendChild(div);
            });
        } catch(e) {
            console.error(e);
            listContainer.innerHTML = '<p class="text-xs text-red-500">목록 로딩 실패</p>';
        }
    },

    async addStudentToClass(studentId, studentName) {
        if (!confirm(`${studentName} 학생을 이 반에 추가하시겠습니까?`)) return;
        try {
            await updateDoc(doc(db, 'students', studentId), { classId: this.currentClassData.id });
            showToast("학생이 추가되었습니다.", false);
            this.loadAssignedStudents(this.currentClassData.id);
        } catch(e) {
            console.error(e);
            showToast("추가 실패", true);
        }
    },

    async removeStudentFromClass(studentId, studentName) {
        if (!confirm(`${studentName} 학생을 반에서 제외하시겠습니까?`)) return;
        try {
            await updateDoc(doc(db, 'students', studentId), { classId: null });
            showToast("학생이 제외되었습니다.", false);
            this.loadAssignedStudents(this.currentClassData.id);
        } catch(e) {
            showToast("제외 실패", true);
        }
    }
};