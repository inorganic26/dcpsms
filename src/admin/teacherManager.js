// src/admin/teacherManager.js

import { collection, onSnapshot, doc, deleteDoc, getDoc, query } from "firebase/firestore";
// getFunctions와 httpsCallable은 app이 초기화된 후 호출해야 하므로 여기서 import
import { getFunctions, httpsCallable } from "firebase/functions";
// db만 import하고, app은 firebase.js에서 가져온 것을 명시적으로 사용
import { db, app as firebaseApp } from '../shared/firebase.js'; // firebaseApp으로 이름 변경하여 가져오기
import { showToast } from '../shared/utils.js';

// functions 초기화 위치 수정 (firebaseApp이 초기화된 후)
let functions;
let createOrUpdateTeacher; // functions 호출 가능 여부 확인 위해 전역 선언

export const teacherManager = {
    editingTeacherId: null,

    // ▼▼▼ 매개변수 이름을 adminAppInstance로 변경 ▼▼▼
    init(adminAppInstance) {
        // this.app은 AdminApp 객체를 가리키도록 함
        this.app = adminAppInstance;
        // ▲▲▲ 매개변수 이름을 adminAppInstance로 변경 ▲▲▲

        // functions 초기화 (firebaseApp 객체가 유효한 시점)
        // ▼▼▼ firebaseApp 사용 ▼▼▼
        functions = getFunctions(firebaseApp, 'asia-northeast3');
        // ▲▲▲ firebaseApp 사용 ▲▲▲
        createOrUpdateTeacher = httpsCallable(functions, 'createOrUpdateTeacher');

        // 요소 캐싱 (adminAppInstance에서 전달받은 요소 사용)
        this.elements = this.app.elements; // adminApp에서 캐싱된 요소 사용

        // null 체크 추가
        this.elements.addTeacherBtn?.addEventListener('click', () => this.addNewTeacher());
        this.elements.closeEditTeacherModalBtn?.addEventListener('click', () => this.closeEditTeacherModal());
        this.elements.cancelEditTeacherBtn?.addEventListener('click', () => this.closeEditTeacherModal());
        this.elements.saveTeacherEditBtn?.addEventListener('click', () => this.saveTeacherChanges());

        console.log("[teacherManager] Initializing Teacher Manager..."); // 디버깅 로그
        this.listenForTeachers();
    },

    async addNewTeacher() {
        // createOrUpdateTeacher 함수 사용 가능 여부 확인
        if (typeof createOrUpdateTeacher !== 'function') {
             console.error("createOrUpdateTeacher Cloud Function is not available.");
             showToast("교사 추가 기능을 사용할 수 없습니다. (Cloud Function 확인 필요)");
             return;
         }

        const { newTeacherNameInput, newTeacherEmailInput, newTeacherPhoneInput } = this.elements;
        // null 체크 추가
        const name = newTeacherNameInput?.value.trim();
        const email = newTeacherEmailInput?.value.trim();
        const phone = newTeacherPhoneInput?.value.trim();

        if (!name || !email || !phone) {
            showToast("이름, 이메일, 전화번호를 모두 입력해주세요.");
            return;
        }

        console.log("[teacherManager] Attempting to add new teacher:", { name, email, phone }); // 디버깅 로그

        try {
            const result = await createOrUpdateTeacher({ name, email, phone });
            console.log("[teacherManager] Add teacher result:", result.data); // 디버깅 로그
            showToast(result.data.message, false);
            if (newTeacherNameInput) newTeacherNameInput.value = '';
            if (newTeacherEmailInput) newTeacherEmailInput.value = '';
            if (newTeacherPhoneInput) newTeacherPhoneInput.value = '';
        } catch (error) {
            console.error("[teacherManager] 교사 추가 실패:", error); // 상세 오류 로깅
            showToast(`교사 추가 실패: ${error.message}`);
        }
    },

    listenForTeachers() {
        console.log("[teacherManager] Starting to listen for teachers..."); // 디버깅 로그
        const q = query(collection(db, 'teachers'));

        // null 체크 추가
        if (!this.elements.teachersList) {
            console.error("[teacherManager] teachersList element not found in cache.");
            return;
        }

        onSnapshot(q, (snapshot) => {
            console.log(`[teacherManager] Firestore snapshot received. Empty: ${snapshot.empty}, Size: ${snapshot.size}`); // 디버깅 로그
            const listEl = this.elements.teachersList;
            if (!listEl) {
                console.error("[teacherManager] teachersList element is null inside onSnapshot.");
                return; // listEl이 없으면 더 이상 진행 불가
            }

            listEl.innerHTML = ''; // 목록 초기화
            if (snapshot.empty) {
                console.log("[teacherManager] No teachers found in Firestore."); // 디버깅 로그
                listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 교사가 없습니다.</p>';
                return;
            }

            const teachers = [];
            snapshot.forEach(doc => teachers.push({ id: doc.id, ...doc.data() }));
            console.log("[teacherManager] Fetched teachers data:", teachers); // 디버깅 로그

            teachers.sort((a, b) => a.name.localeCompare(b.name));

            // 앱 상태 업데이트 (adminApp의 state 직접 참조)
            this.app.state.teachers = teachers;

            console.log("[teacherManager] Rendering teacher list..."); // 디버깅 로그
            teachers.forEach(teacher => this.renderTeacher(teacher));
        }, (error) => { // 에러 콜백 추가
            console.error("[teacherManager] Error listening to Firestore:", error);
            showToast("교사 목록을 불러오는 중 오류가 발생했습니다.", true);
            if (this.elements.teachersList) {
                this.elements.teachersList.innerHTML = '<p class="text-red-500">교사 목록 로딩 실패</p>';
            }
        });
    },

    renderTeacher(teacherData) {
        console.log("[teacherManager] Rendering teacher:", teacherData.name); // 디버깅 로그
        const listEl = this.elements.teachersList;
        if (!listEl) {
             console.error("[teacherManager] teachersList element is null during renderTeacher.");
             return;
        }

        const teacherDiv = document.createElement('div');
        teacherDiv.className = "p-3 border rounded-lg flex items-center justify-between";
        const emailDisplay = teacherData.email ? `(${teacherData.email})` : '(이메일 미등록)';

        teacherDiv.innerHTML = `
            <div>
                <p class="font-medium text-slate-700">${teacherData.name} ${emailDisplay}</p>
                <p class="text-xs text-slate-500">${teacherData.phone || '번호없음'}</p>
            </div>
            <div class="flex gap-2">
                <button data-id="${teacherData.id}" class="edit-teacher-btn text-blue-500 hover:text-blue-700 text-sm font-semibold">수정</button>
                <button data-id="${teacherData.id}" data-name="${teacherData.name}" class="reset-password-btn text-gray-500 hover:text-gray-700 text-sm font-semibold">비밀번호 초기화</button>
                <button data-id="${teacherData.id}" class="delete-teacher-btn text-red-500 hover:text-red-700 text-sm font-semibold">삭제</button>
            </div>
        `;
        listEl.appendChild(teacherDiv);

        // 이벤트 리스너 null 체크 후 추가
        teacherDiv.querySelector('.edit-teacher-btn')?.addEventListener('click', (e) => {
            this.openEditTeacherModal(e.target.dataset.id);
        });

        teacherDiv.querySelector('.delete-teacher-btn')?.addEventListener('click', async (e) => {
            if (confirm(`'${teacherData.name}' 교사를 정말 삭제하시겠습니까? (연결된 로그인 계정도 삭제됩니다)`)) {
                console.log(`[teacherManager] Deleting teacher with ID: ${e.target.dataset.id}`); // 디버깅 로그
                try {
                    // TODO: 교사 삭제 Cloud Function 호출 필요 (현재는 Firestore 문서만 삭제)
                    await deleteDoc(doc(db, "teachers", e.target.dataset.id));
                    showToast("교사 정보가 삭제되었습니다. 연결된 계정은 별도 삭제가 필요할 수 있습니다.", false);
                    // 목록은 onSnapshot에 의해 자동 갱신됨
                } catch (error) {
                    console.error("[teacherManager] 교사 삭제 실패:", error);
                    showToast("교사 삭제 실패.");
                }
            }
        });

        teacherDiv.querySelector('.reset-password-btn')?.addEventListener('click', (e) => {
            this.resetTeacherPassword(e.target.dataset.id, e.target.dataset.name);
        });
    },

    openEditTeacherModal(teacherId) {
        console.log("[teacherManager] Opening edit modal for teacher ID:", teacherId); // 디버깅 로그
        const teacherData = this.app.state.teachers.find(t => t.id === teacherId);
        if (!teacherData) {
            showToast("교사 정보를 찾을 수 없습니다.");
            return;
        }
        this.editingTeacherId = teacherId;

        // null 체크 추가
        if (this.elements.editTeacherNameInput) this.elements.editTeacherNameInput.value = teacherData.name;
        if (this.elements.editTeacherEmailInput) this.elements.editTeacherEmailInput.value = teacherData.email || '';
        if (this.elements.editTeacherPhoneInput) this.elements.editTeacherPhoneInput.value = teacherData.phone;
        if (this.elements.editTeacherModal) this.elements.editTeacherModal.style.display = 'flex';
    },

    closeEditTeacherModal() {
        console.log("[teacherManager] Closing edit modal."); // 디버깅 로그
        this.editingTeacherId = null;
        // null 체크 추가
        if (this.elements.editTeacherModal) this.elements.editTeacherModal.style.display = 'none';
    },

    async saveTeacherChanges() {
        if (!this.editingTeacherId) return;

        // createOrUpdateTeacher 함수 사용 가능 여부 확인
        if (typeof createOrUpdateTeacher !== 'function') {
             console.error("createOrUpdateTeacher Cloud Function is not available.");
             showToast("교사 수정 기능을 사용할 수 없습니다. (Cloud Function 확인 필요)");
             return;
         }

        // null 체크 추가
        const name = this.elements.editTeacherNameInput?.value.trim();
        const email = this.elements.editTeacherEmailInput?.value.trim();
        const phone = this.elements.editTeacherPhoneInput?.value.trim();

        if (!name || !phone) {
            showToast("이름과 전화번호는 필수입니다.");
            return;
        }

        console.log("[teacherManager] Saving changes for teacher ID:", this.editingTeacherId, { name, email, phone }); // 디버깅 로그

        try {
            const result = await createOrUpdateTeacher({
                teacherId: this.editingTeacherId,
                name,
                email,
                phone
            });
            console.log("[teacherManager] Save changes result:", result.data); // 디버깅 로그
            showToast(result.data.message, false);
            this.closeEditTeacherModal();
        } catch (error) {
            console.error("[teacherManager] 교사 정보 수정 실패:", error); // 상세 오류 로깅
            showToast(`정보 수정 실패: ${error.message}`);
        }
    },

    async resetTeacherPassword(teacherId, teacherName) {
        if (confirm(`'${teacherName}' 교사의 비밀번호를 전화번호 뒷 4자리로 초기화하시겠습니까?`)) {
            console.warn("[teacherManager] 비밀번호 초기화 기능은 아직 구현되지 않았습니다. Cloud Function 호출 필요."); // 경고 로그
            // TODO: 비밀번호 초기화 Cloud Function 호출 필요
            showToast("비밀번호 초기화 기능은 아직 구현되지 않았습니다.");
        }
    },
};