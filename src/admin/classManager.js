// src/admin/classManager.js
import { collection, addDoc, doc, deleteDoc, updateDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../shared/firebase.js";
import { showToast } from "../shared/utils.js";
// ✨ Store 도입
import { setClasses, getClasses, CLASS_EVENTS } from "../store/classStore.js";

export const classManager = {
    elements: {},
    // 더 이상 AdminApp 전체가 필요하지 않음
    sharedClassEditor: null, 

    init(adminAppInstance) {
        this.elements = adminAppInstance.elements;
        
        // 이벤트 바인딩
        this.elements.addClassBtn?.addEventListener('click', () => this.handleAddClass());
        this.elements.classesList?.addEventListener('click', (e) => this.handleClassListClick(e));
        this.elements.closeEditClassModalBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.elements.cancelEditClassBtn?.addEventListener('click', () => this.closeEditClassModal());
        this.elements.saveClassEditBtn?.addEventListener('click', () => this.saveClassEdit());

        // ✨ Store 변경 감지 -> UI 갱신
        document.addEventListener(CLASS_EVENTS.UPDATED, () => {
            this.renderClassList();
        });

        // DB 리스너 시작 (데이터 가져오기)
        this.listenForClasses();
        
        // (옵션) ClassEditor 모듈 초기화 등은 여기서 처리
        import("../shared/classEditor.js").then(module => {
             this.sharedClassEditor = module.classEditor;
        });
    },

    // ✨ DB 리스너: Store 업데이트
    listenForClasses() {
        const q = query(collection(db, "classes"), orderBy("name"));
        onSnapshot(q, (snap) => {
            const classes = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            setClasses(classes); // Store에 저장 (이벤트 발생 -> renderClassList 실행됨)
        }, (err) => {
            console.error("반 목록 로딩 실패:", err);
            if(this.elements.classesList) this.elements.classesList.innerHTML = "<p class='text-red-500'>로딩 실패</p>";
        });
    },

    // ✨ Store에서 데이터 조회
    renderClassList() {
        const classes = getClasses();
        const listEl = this.elements.classesList;
        if (!listEl) return;
        
        listEl.innerHTML = '';
        if (classes.length === 0) {
            listEl.innerHTML = '<p class="text-sm text-slate-400">등록된 반이 없습니다.</p>';
            return;
        }

        classes.forEach(cls => {
            const div = document.createElement('div');
            div.className = 'p-3 border rounded-lg flex justify-between items-center bg-white';
            div.innerHTML = `
                <span class="font-medium text-slate-700">${cls.name}</span>
                <div class="flex gap-2">
                    <button data-id="${cls.id}" class="edit-class-btn text-blue-500 hover:text-blue-700 text-sm font-bold">수정</button>
                    <button data-id="${cls.id}" class="delete-class-btn text-red-500 hover:text-red-700 text-sm font-bold">삭제</button>
                </div>
            `;
            listEl.appendChild(div);
        });
    },

    async handleAddClass() {
        const name = this.elements.newClassNameInput.value.trim();
        if (!name) {
            showToast("반 이름을 입력해주세요.", true);
            return;
        }
        try {
            await addDoc(collection(db, "classes"), { 
                name,
                subjects: [], 
                textbooks: [],
                studentIds: [],
                type: 'self-directed' 
            });
            showToast(`'${name}' 반이 추가되었습니다.`, false);
            this.elements.newClassNameInput.value = '';
        } catch (e) {
            console.error(e);
            showToast("반 추가 실패", true);
        }
    },

    async handleClassListClick(e) {
        const id = e.target.dataset.id;
        if (!id) return;

        if (e.target.classList.contains('delete-class-btn')) {
            const cls = getClasses().find(c => c.id === id);
            if (confirm(`'${cls?.name}' 반을 삭제하시겠습니까?`)) {
                await deleteDoc(doc(db, "classes", id));
                showToast("반이 삭제되었습니다.", false);
            }
        } else if (e.target.classList.contains('edit-class-btn')) {
            this.openEditClassModal(id);
        }
    },

    openEditClassModal(id) {
        const cls = getClasses().find(c => c.id === id);
        if (!cls) return;
        
        this.editingClassId = id;
        this.editingClassData = cls; 
        
        this.elements.editClassName.textContent = cls.name;
        this.elements.editClassTypeSelect.value = cls.type || 'self-directed';
        
        if (this.sharedClassEditor) {
            this.sharedClassEditor.renderSubjectsForEditing(
                cls, 
                document.getElementById('admin-edit-class-subjects-and-textbooks')
            );
            this.sharedClassEditor.renderStudentsForEditing(
                cls, 
                document.getElementById('admin-edit-class-students-container')
            );
        }
        this.elements.editClassModal.style.display = 'flex';
    },

    closeEditClassModal() {
        this.editingClassId = null;
        this.elements.editClassModal.style.display = 'none';
    },

    async saveClassEdit() {
        if (!this.editingClassId || !this.sharedClassEditor) return;
        try {
            const type = this.elements.editClassTypeSelect.value;
            const updatedData = this.sharedClassEditor.getUpdatedClassData();
            updatedData.type = type;

            await updateDoc(doc(db, "classes", this.editingClassId), updatedData);
            showToast("반 정보가 수정되었습니다.", false);
            this.closeEditClassModal();
        } catch (e) {
            console.error(e);
            showToast("수정 실패", true);
        }
    }
};