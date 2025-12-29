// src/shared/homeworkDashboardManager.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { showToast } from "./utils.js";
import { homeworkManagerHelper } from "./homeworkManager.js";

export const createHomeworkDashboardManager = (config) => {
    const { app, elements, mode } = config; // mode: 'admin' 또는 'teacher'

    // 상태 관리
    let state = {
        selectedClassId: null,
        selectedHomeworkId: null,
        editingHomework: null,
        cachedHomeworkData: null,
        cachedSubmissions: {},
        cachedStudents: [], // 학생 목록 (admin용)
        unsubHomework: null,
        unsubSubmissions: null
    };

    // --- 리스너 초기화 ---
    const initListeners = () => {
        elements.homeworkSelect?.addEventListener('change', (e) => loadHomeworkDetails(e.target.value));
        elements.assignBtn?.addEventListener('click', () => openModal('create'));
        elements.saveBtn?.addEventListener('click', () => saveHomework());
        elements.closeBtn?.addEventListener('click', () => closeModal());
        elements.cancelBtn?.addEventListener('click', () => closeModal());
        elements.editBtn?.addEventListener('click', () => openModal('edit'));
        elements.deleteBtn?.addEventListener('click', () => deleteHomework());
        elements.subjectSelect?.addEventListener('change', (e) => handleSubjectChange(e.target.value));
    };

    // --- 학생 목록 가져오기 (관리자/선생님 분기 처리) ---
    const getStudentList = async (classId) => {
        // [선생님] 이미 앱 상태에 학생 목록이 있음
        if (mode === 'teacher' && app.state.studentsInClass) {
            return Array.from(app.state.studentsInClass.entries())
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
        
        // [관리자] DB에서 해당 반 학생을 조회해야 함
        if (mode === 'admin') {
            try {
                // classIds 배열에 classId가 포함된 학생 or classId 필드가 일치하는 학생
                // (복잡한 쿼리 대신 단순화를 위해 전체 로드 후 필터링하거나, 최적화된 쿼리 사용)
                // 여기서는 기존 로직 호환성을 위해 쿼리 사용
                const students = [];
                const q = query(collection(db, 'students')); // 전체 로드 후 필터 (데이터 양에 따라 최적화 필요)
                const snap = await getDocs(q);
                
                snap.forEach(doc => {
                    const data = doc.data();
                    let isInClass = data.classId === classId;
                    if (data.classIds && Array.isArray(data.classIds) && data.classIds.includes(classId)) {
                        isInClass = true;
                    }
                    if (isInClass) students.push({ id: doc.id, name: data.name });
                });
                return students.sort((a, b) => a.name.localeCompare(b.name));
            } catch (e) {
                console.error("학생 목록 로드 실패:", e);
                return [];
            }
        }
        return [];
    };

    // --- 숙제 목록 (Select Box) 로드 ---
    const loadHomeworkList = async (classId) => {
        state.selectedClassId = classId;
        const select = elements.homeworkSelect;
        if (!select) return;

        // UI 초기화
        if (elements.contentDiv) elements.contentDiv.style.display = 'none';
        if (elements.placeholder) elements.placeholder.style.display = 'flex';
        if (elements.btnsDiv) elements.btnsDiv.style.display = 'none';
        
        // 리스너 해제
        if (state.unsubHomework) state.unsubHomework();
        if (state.unsubSubmissions) state.unsubSubmissions();

        select.innerHTML = '<option>로딩 중...</option>';
        try {
            const q = query(collection(db, 'homeworks'), where('classId', '==', classId), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            
            select.innerHTML = '<option value="">-- 숙제 선택 --</option>';
            if (snap.empty) {
                select.innerHTML += '<option disabled>(등록된 숙제 없음)</option>';
            } else {
                snap.forEach(doc => {
                    select.innerHTML += `<option value="${doc.id}">${doc.data().title}</option>`;
                });
            }
        } catch (e) { 
            console.error(e);
            select.innerHTML = '<option>로드 실패</option>'; 
        }
    };

    // --- 숙제 상세 보기 ---
    const loadHomeworkDetails = async (homeworkId) => {
        if (!homeworkId) return;
        state.selectedHomeworkId = homeworkId;

        // 학생 목록 준비
        state.cachedStudents = await getStudentList(state.selectedClassId);

        // UI 표시
        if (elements.contentDiv) elements.contentDiv.style.display = 'block'; // or flex
        if (elements.contentDiv) elements.contentDiv.classList.remove('hidden');
        if (elements.placeholder) elements.placeholder.style.display = 'none';
        if (elements.btnsDiv) elements.btnsDiv.style.display = 'flex';
        if (elements.tableBody) elements.tableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">데이터를 불러오는 중...</td></tr>';

        // 1. 숙제 정보 감시
        state.unsubHomework = onSnapshot(doc(db, 'homeworks', homeworkId), (snap) => {
            if (!snap.exists()) {
                if(elements.tableBody) elements.tableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-red-500">삭제됨</td></tr>';
                return;
            }
            const data = snap.data();
            state.editingHomework = { id: homeworkId, ...data };
            state.cachedHomeworkData = data;
            if(elements.contentTitle) elements.contentTitle.textContent = data.title;
            renderTable();
        });

        // 2. 제출 현황 감시
        const subCol = collection(db, 'homeworks', homeworkId, 'submissions');
        state.unsubSubmissions = onSnapshot(subCol, (snap) => {
            state.cachedSubmissions = {};
            snap.forEach(d => state.cachedSubmissions[d.id] = d.data());
            renderTable();
        });
    };

    // --- 테이블 렌더링 ---
    const renderTable = () => {
        const { cachedHomeworkData: hwData, cachedSubmissions: subs, cachedStudents: students } = state;
        if (!hwData || !elements.tableBody) return;

        const tbody = elements.tableBody;
        tbody.innerHTML = '';

        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">학생이 없습니다.</td></tr>';
            return;
        }

        const oldSubs = hwData.submissions || {}; // 하위 호환
        
        students.forEach(student => {
            const sub = subs[student.id] || oldSubs[student.id];
            
            // 상태 및 버튼 생성 (helper 사용)
            const statusInfo = homeworkManagerHelper.calculateStatus(sub, hwData);
            const downloadBtn = homeworkManagerHelper.renderFileButtons(sub, '반'); // 반 이름은 생략 가능
            const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';

            // 강제 완료 버튼
            let actionBtn = (sub && !sub.manualComplete) ? `
                <button class="force-complete-btn ml-2 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition" 
                        data-id="${student.id}" title="강제 완료 처리">✅ 확인</button>` : '';

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50 border-b">
                    <td class="p-3 font-medium text-slate-700">${student.name}</td>
                    <td class="p-3 ${statusInfo.color}">${statusInfo.text} ${actionBtn}</td>
                    <td class="p-3 text-xs text-slate-500">${date}</td>
                    <td class="p-3 text-center"><div>${downloadBtn}</div></td>
                </tr>`;
        });

        // 이벤트 연결
        tbody.querySelectorAll('.force-complete-btn').forEach(btn => {
            btn.addEventListener('click', () => forceComplete(btn.dataset.id));
        });
    };

    // --- 강제 완료 처리 ---
    const forceComplete = async (studentId) => {
        if (!confirm("페이지 수가 부족해도 '완료' 상태로 변경하시겠습니까?")) return;
        try {
            await setDoc(doc(db, 'homeworks', state.selectedHomeworkId, 'submissions', studentId), {
                studentDocId: studentId, manualComplete: true, status: 'completed', updatedAt: serverTimestamp()
            }, { merge: true });
            showToast("완료 처리되었습니다.");
        } catch (e) { console.error(e); showToast("처리 실패", true); }
    };

    // --- 모달 열기 ---
    const openModal = async (type) => {
        const isEdit = type === 'edit';
        if (elements.modalTitle) elements.modalTitle.textContent = isEdit ? '숙제 수정' : '새 숙제 등록';
        
        // 과목 로드
        const subSelect = elements.subjectSelect;
        if (subSelect) {
            subSelect.innerHTML = '<option>로딩 중...</option>';
            try {
                const q = query(collection(db, 'subjects'), orderBy('name'));
                const snap = await getDocs(q);
                subSelect.innerHTML = '<option value="">-- 과목 선택 --</option>';
                snap.forEach(d => subSelect.innerHTML += `<option value="${d.id}">${d.data().name}</option>`);
            } catch(e) { subSelect.innerHTML = '<option>로드 실패</option>'; }
        }

        if (isEdit && state.editingHomework) {
            const hw = state.editingHomework;
            elements.titleInput.value = hw.title;
            elements.pagesInput.value = hw.pages || '';
            elements.totalPagesInput.value = hw.totalPages || '';
            elements.dueDateInput.value = hw.dueDate || '';
            
            if (hw.subjectId && subSelect) {
                subSelect.value = hw.subjectId;
                await handleSubjectChange(hw.subjectId); // 교재 로드
                if(elements.textbookSelect) elements.textbookSelect.value = hw.textbookId || '';
            }
        } else {
            // 초기화
            elements.titleInput.value = '';
            elements.pagesInput.value = '';
            elements.totalPagesInput.value = '';
            elements.dueDateInput.value = '';
            if(subSelect) subSelect.value = '';
            if(elements.textbookSelect) {
                elements.textbookSelect.innerHTML = '<option value="">교재 선택</option>';
                elements.textbookSelect.disabled = true;
            }
            state.editingHomework = null;
        }

        if(elements.modal) elements.modal.style.display = 'flex';
    };

    const closeModal = () => {
        if(elements.modal) elements.modal.style.display = 'none';
        state.editingHomework = null;
    };

    // --- 과목 선택 시 교재 로드 ---
    const handleSubjectChange = async (subjectId) => {
        const tbSelect = elements.textbookSelect;
        if (!tbSelect) return;
        
        tbSelect.innerHTML = '<option>로딩 중...</option>';
        tbSelect.disabled = true;
        
        if (!subjectId) { tbSelect.innerHTML = '<option value="">교재 선택</option>'; return; }

        try {
            const q = query(collection(db, 'textbooks'), where('subjectId', '==', subjectId), orderBy('name'));
            const snap = await getDocs(q);
            tbSelect.innerHTML = '<option value="">-- 교재 선택 --</option>';
            snap.forEach(d => tbSelect.innerHTML += `<option value="${d.id}">${d.data().name}</option>`);
            tbSelect.disabled = false;
        } catch (e) {
            console.error(e);
            tbSelect.innerHTML = '<option>로드 실패</option>';
        }
    };

    // --- 저장 ---
    const saveHomework = async () => {
        if (!state.selectedClassId) { showToast("반 정보가 없습니다."); return; }
        
        const data = {
            classId: state.selectedClassId,
            title: elements.titleInput.value,
            subjectId: elements.subjectSelect.value,
            textbookId: elements.textbookSelect.value,
            pages: elements.pagesInput.value,
            dueDate: elements.dueDateInput.value,
            totalPages: Number(elements.totalPagesInput.value) || 0,
            updatedAt: serverTimestamp()
        };

        if (!data.title || !data.subjectId) { showToast("제목과 과목은 필수입니다.", true); return; }

        try {
            if (state.editingHomework) {
                await updateDoc(doc(db, 'homeworks', state.editingHomework.id), data);
                showToast("수정되었습니다.");
            } else {
                data.createdAt = serverTimestamp();
                await addDoc(collection(db, 'homeworks'), data);
                showToast("등록되었습니다.");
            }
            closeModal();
            loadHomeworkList(state.selectedClassId); // 목록 갱신
        } catch (e) { console.error(e); showToast("저장 실패", true); }
    };

    // --- 삭제 ---
    const deleteHomework = async () => {
        if (!state.selectedHomeworkId || !confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'homeworks', state.selectedHomeworkId));
            showToast("삭제되었습니다.");
            // UI 초기화
            loadHomeworkList(state.selectedClassId);
        } catch (e) { showToast("삭제 실패", true); }
    };

    // 초기화 실행
    initListeners();

    return {
        loadHomeworkList
    };
};