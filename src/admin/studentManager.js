// src/admin/studentManager.js

import { collection, onSnapshot, addDoc, serverTimestamp, doc, deleteDoc, updateDoc, getDoc, query } from "firebase/firestore";
import { db } from '../shared/firebase.js';
import { showToast } from '../shared/utils.js';

export const studentManager = {
    editingStudentId: null, // 현재 수정 중인 학생 ID 저장

    init(app) {
        this.app = app;

        // 요소 캐싱 (adminApp.js에서 이미 캐싱했지만, 여기서도 참조할 수 있도록 추가)
        this.elements = {
             // 신규 등록 필드
             newStudentNameInput: document.getElementById('admin-new-student-name'),
             newStudentPhoneInput: document.getElementById('admin-new-student-phone'), // ID가 phone으로 되어있음
             newParentPhoneInput: document.getElementById('admin-new-parent-phone'), // 부모님 번호 필드
             addStudentBtn: document.getElementById('admin-add-student-btn'),
             studentsList: document.getElementById('admin-students-list'),
             // 수정 모달 필드
             editStudentModal: document.getElementById('admin-edit-student-modal'),
             closeEditStudentModalBtn: document.getElementById('admin-close-edit-student-modal-btn'),
             cancelEditStudentBtn: document.getElementById('admin-cancel-edit-student-btn'),
             saveStudentEditBtn: document.getElementById('admin-save-student-edit-btn'),
             editStudentNameInput: document.getElementById('admin-edit-student-name'),
             editStudentPhoneInput: document.getElementById('admin-edit-student-phone'),
             editParentPhoneInput: document.getElementById('admin-edit-parent-phone'),
        };

        // 이벤트 리스너 연결
        this.elements.addStudentBtn?.addEventListener('click', () => this.addNewStudent());
        // 수정 모달 버튼 리스너
        this.elements.closeEditStudentModalBtn?.addEventListener('click', () => this.closeEditStudentModal());
        this.elements.cancelEditStudentBtn?.addEventListener('click', () => this.closeEditStudentModal());
        this.elements.saveStudentEditBtn?.addEventListener('click', () => this.saveStudentChanges());

        this.listenForStudents(); // 학생 목록 실시간 감지 시작
    },

    // 신규 학생 추가 (부모님 전화번호 포함)
    async addNewStudent() {
        // 요소 다시 참조 (init에서 참조했지만 함수 내에서 명시적 참조)
        const studentNameInput = this.elements.newStudentNameInput;
        const phoneInput = this.elements.newStudentPhoneInput;
        const parentPhoneInput = this.elements.newParentPhoneInput;

        const studentName = studentNameInput.value.trim();
        const phone = phoneInput.value.trim();
        const parentPhone = parentPhoneInput.value.trim();

        // 유효성 검사
        if (!studentName || !phone) {
            showToast("학생 이름과 학생 전화번호는 필수입니다.");
            return;
        }
        if (!/^\d+$/.test(phone) || phone.length < 4) {
            showToast("학생 전화번호는 4자리 이상의 숫자로 입력해주세요.");
            return;
        }
        if (parentPhone && !/^\d+$/.test(parentPhone)) {
             showToast("부모님 전화번호는 숫자만 입력해주세요.");
             return;
        }

        const password = phone.slice(-4); // 비밀번호는 학생 전화번호 뒷 4자리
        try {
            await addDoc(collection(db, 'students'), {
                name: studentName,
                password: password, // 주의: 실제 앱에서는 해싱 필요
                phone: phone,
                parentPhone: parentPhone || null, // 값이 없으면 null로 저장
                classId: null, // 초기에는 미배정
                createdAt: serverTimestamp(),
                isInitialPassword: true
            });
            showToast(`새로운 학생 ${studentName} 추가됨 (비밀번호: ${password})`, false);
            // 입력 필드 초기화
            studentNameInput.value = '';
            phoneInput.value = '';
            parentPhoneInput.value = ''; // 부모님 번호 필드도 초기화
        } catch (error) {
            console.error("학생 추가 실패:", error);
            showToast("학생 추가 실패.");
        }
    },

    // 학생 목록 실시간 감지 및 렌더링
    listenForStudents() {
        const studentsListEl = this.elements.studentsList; // 변수명 변경
        if (!studentsListEl) return;

        const q = query(collection(db, 'students'));
        onSnapshot(q, (snapshot) => {
            studentsListEl.innerHTML = ''; // 목록 초기화
            if (snapshot.empty) {
                studentsListEl.innerHTML = '<p class="text-sm text-slate-400">등록된 학생이 없습니다.</p>';
                return;
            }
            const students = [];
            snapshot.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
            // 이름순 정렬
            students.sort((a, b) => a.name.localeCompare(b.name));

            // 미배정/배정 그룹 분리
            const assigned = students.filter(s => s.classId);
            const unassigned = students.filter(s => !s.classId);

            // 미배정 학생 목록 렌더링
            studentsListEl.innerHTML += '<h4 class="text-md font-semibold text-slate-600 mt-4">미배정 학생</h4>';
            if (unassigned.length === 0) {
                 studentsListEl.innerHTML += '<p class="text-sm text-slate-400">미배정 학생이 없습니다.</p>';
            } else {
                unassigned.forEach(std => this.renderStudent(std));
            }

            // 반 배정된 학생 목록 렌더링
            studentsListEl.innerHTML += '<h4 class="text-md font-semibold text-slate-600 mt-6">반 배정된 학생</h4>';
            if (assigned.length === 0) {
                 studentsListEl.innerHTML += '<p class="text-sm text-slate-400">반 배정된 학생이 없습니다.</p>';
            } else {
                 assigned.forEach(std => this.renderStudent(std));
            }
        });
    },

    // 개별 학생 정보 렌더링 (수정 버튼 및 부모님 번호 표시 추가)
    renderStudent(studentData) {
        const studentsListEl = this.elements.studentsList; // 변수명 변경
        if (!studentsListEl) return;

        const studentDiv = document.createElement('div');
        // AdminApp의 state에 접근하여 반 이름 찾기 (this.app 사용)
        const className = this.app?.state?.classes?.find(c => c.id === studentData.classId)?.name || '미배정';
        // 부모님 번호 표시 (있을 경우에만)
        const parentPhoneDisplay = studentData.parentPhone ? `<p class="text-xs text-slate-500">보호자: ${studentData.parentPhone}</p>` : '';

        studentDiv.className = "p-3 border rounded-lg flex items-center justify-between";
        studentDiv.innerHTML = `
            <div>
                <span class="font-medium text-slate-700">${studentData.name} (${studentData.phone || '번호없음'})</span>
                <span class="text-xs text-slate-500 ml-2">[${className}]</span>
                ${parentPhoneDisplay} </div>
            <div class="flex gap-2 flex-shrink-0"> <button data-id="${studentData.id}" class="edit-student-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${studentData.id}" data-name="${studentData.name}" class="reset-password-btn text-gray-500 hover:text-gray-700 text-sm font-semibold">비밀번호 초기화</button>
                <button data-id="${studentData.id}" class="delete-student-btn text-red-500 hover:red-blue-700 text-sm font-semibold">삭제</button>
            </div>
        `;
        studentsListEl.appendChild(studentDiv);

        // 수정 버튼 이벤트 리스너 추가
        studentDiv.querySelector('.edit-student-btn')?.addEventListener('click', (e) => {
            this.openEditStudentModal(e.target.dataset.id); // 수정 모달 열기 함수 호출
        });

        // 삭제 버튼 이벤트 리스너
        studentDiv.querySelector('.delete-student-btn')?.addEventListener('click', async (e) => {
            if (confirm(`'${studentData.name}' 학생을 정말 삭제하시겠습니까?`)) {
                try {
                    await deleteDoc(doc(db, "students", e.target.dataset.id));
                    showToast("학생 삭제 완료.", false);
                } catch (error) {
                     console.error("학생 삭제 실패:", error); showToast("학생 삭제 실패.");
                }
            }
        });

        // 비밀번호 초기화 버튼 이벤트 리스너
        studentDiv.querySelector('.reset-password-btn')?.addEventListener('click', (e) => {
            this.resetStudentPassword(e.target.dataset.id, e.target.dataset.name);
        });
    },

    // --- 학생 정보 수정 모달 관련 함수들 ---

    // 수정 모달 열기
    async openEditStudentModal(studentId) {
        this.editingStudentId = studentId; // 현재 수정할 학생 ID 저장
        if (!studentId) return;

        try {
            const studentRef = doc(db, 'students', studentId);
            const studentSnap = await getDoc(studentRef);

            if (studentSnap.exists()) {
                const studentData = studentSnap.data();
                // 모달 필드에 기존 학생 정보 채우기
                if(this.elements.editStudentNameInput) this.elements.editStudentNameInput.value = studentData.name || '';
                if(this.elements.editStudentPhoneInput) this.elements.editStudentPhoneInput.value = studentData.phone || '';
                if(this.elements.editParentPhoneInput) this.elements.editParentPhoneInput.value = studentData.parentPhone || ''; // 부모님 번호 채우기

                // 모달 표시
                if(this.elements.editStudentModal) this.elements.editStudentModal.style.display = 'flex';
                document.body.classList.add('modal-open'); // 스크롤 방지
            } else {
                showToast("학생 정보를 찾을 수 없습니다.");
                this.editingStudentId = null;
            }
        } catch (error) {
            console.error("학생 정보 로딩 실패:", error);
            showToast("학생 정보 로딩 실패.");
            this.editingStudentId = null;
        }
    },

    // 수정 모달 닫기
    closeEditStudentModal() {
        this.editingStudentId = null; // 수정 중인 학생 ID 초기화
        if(this.elements.editStudentModal) this.elements.editStudentModal.style.display = 'none'; // 모달 숨기기
        document.body.classList.remove('modal-open'); // 스크롤 잠금 해제
    },

    // 변경사항 저장
    async saveStudentChanges() {
        if (!this.editingStudentId) return; // 수정할 학생 ID 없으면 중단

        // 수정 모달에서 입력된 값 가져오기
        const name = this.elements.editStudentNameInput.value.trim();
        const phone = this.elements.editStudentPhoneInput.value.trim();
        const parentPhone = this.elements.editParentPhoneInput.value.trim();

        // 유효성 검사
        if (!name || !phone) {
            showToast("이름과 학생 전화번호는 필수입니다.");
            return;
        }
        if (!/^\d+$/.test(phone) || phone.length < 4) {
            showToast("학생 전화번호는 4자리 이상의 숫자로 입력해주세요.");
            return;
        }
        if (parentPhone && !/^\d+$/.test(parentPhone)) {
             showToast("부모님 전화번호는 숫자만 입력해주세요.");
             return;
        }

        // 비밀번호 자동 재설정 (전화번호 뒷 4자리)
        const newPassword = phone.slice(-4);
        const dataToUpdate = {
            name: name,
            phone: phone,
            parentPhone: parentPhone || null, // 없으면 null
            password: newPassword, // 비밀번호 업데이트 (주의: 실제 앱에서는 해싱 필요)
            isInitialPassword: true // 비밀번호가 변경되었으므로 초기화 상태로 설정
        };

        try {
            const studentRef = doc(db, 'students', this.editingStudentId);
            await updateDoc(studentRef, dataToUpdate); // Firestore 문서 업데이트
            showToast("학생 정보가 성공적으로 수정되었습니다.", false);
            this.closeEditStudentModal(); // 모달 닫기
            // 목록은 onSnapshot에 의해 자동으로 갱신됨
        } catch (error) {
            console.error("학생 정보 수정 실패:", error);
            showToast("학생 정보 수정 실패.");
        }
    },
    // --- 학생 정보 수정 모달 관련 함수 추가 끝 ---

    // 비밀번호 초기화
    async resetStudentPassword(studentId, studentName) {
        if (confirm(`'${studentName}' 학생의 비밀번호를 전화번호 뒷 4자리로 초기화하시겠습니까?`)) {
            try {
                const studentRef = doc(db, 'students', studentId);
                const studentSnap = await getDoc(studentRef);
                if (studentSnap.exists()) {
                    const phone = studentSnap.data().phone;
                    if (phone && phone.length >= 4) {
                        const newPassword = phone.slice(-4);
                        await updateDoc(studentRef, {
                            password: newPassword, // 실제로는 해싱 처리 후 저장해야 합니다.
                            isInitialPassword: true
                        });
                        showToast(`'${studentName}' 비밀번호 '${newPassword}'로 초기화 완료.`, false);
                    } else { showToast("전화번호 정보가 올바르지 않아 초기화 불가."); }
                }
            } catch (error) { console.error("비밀번호 초기화 실패:", error); showToast("비밀번호 초기화 실패."); }
        }
    },
}; // studentManager 객체 끝