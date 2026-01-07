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

    // --- 학생 목록 가져오기 ---
    const getStudentList = async (classId) => {
        if (mode === 'teacher' && app.state.studentsInClass) {
            return Array.from(app.state.studentsInClass.entries())
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => a.name.localeCompare(b.name));
        }
        
        if (mode === 'admin') {
            try {
                const students = [];
                const q = query(collection(db, 'students'));
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

        state.cachedStudents = await getStudentList(state.selectedClassId);

        if (elements.contentDiv) elements.contentDiv.style.display = 'block';
        if (elements.contentDiv) elements.contentDiv.classList.remove('hidden');
        if (elements.placeholder) elements.placeholder.style.display = 'none';
        
        // 버튼 영역 표시 및 [다운로드 버튼] 동적 추가
        if (elements.btnsDiv) {
            elements.btnsDiv.style.display = 'flex';
            
            // 중복 추가 방지
            if (!elements.btnsDiv.querySelector('#custom-download-all-btn')) {
                const downloadAllBtn = document.createElement('button');
                downloadAllBtn.id = 'custom-download-all-btn';
                downloadAllBtn.className = "flex-1 bg-indigo-50 text-indigo-600 text-xs py-2 rounded font-bold hover:bg-indigo-100 transition ml-2";
                downloadAllBtn.innerHTML = '<span class="material-icons text-sm align-middle mr-1">folder_zip</span> 전체 내려받기';
                downloadAllBtn.onclick = downloadAllSubmissions;
                elements.btnsDiv.appendChild(downloadAllBtn);
            }
        }

        if (elements.tableBody) elements.tableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">데이터를 불러오는 중...</td></tr>';

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

        const oldSubs = hwData.submissions || {}; 
        
        students.forEach(student => {
            const sub = subs[student.id] || oldSubs[student.id];
            
            const statusInfo = homeworkManagerHelper.calculateStatus(sub, hwData);
            const downloadBtn = homeworkManagerHelper.renderFileButtons(sub, '반'); 
            const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';

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

        tbody.querySelectorAll('.force-complete-btn').forEach(btn => {
            btn.addEventListener('click', () => forceComplete(btn.dataset.id));
        });
    };

    const forceComplete = async (studentId) => {
        if (!confirm("페이지 수가 부족해도 '완료' 상태로 변경하시겠습니까?")) return;
        try {
            await setDoc(doc(db, 'homeworks', state.selectedHomeworkId, 'submissions', studentId), {
                studentDocId: studentId, manualComplete: true, status: 'completed', updatedAt: serverTimestamp()
            }, { merge: true });
            showToast("완료 처리되었습니다.");
        } catch (e) { console.error(e); showToast("처리 실패", true); }
    };

    // --- 모달 관리 ---
    const openModal = async (type) => {
        const isEdit = type === 'edit';
        if (elements.modalTitle) elements.modalTitle.textContent = isEdit ? '숙제 수정' : '새 숙제 등록';
        
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
                await handleSubjectChange(hw.subjectId);
                if(elements.textbookSelect) elements.textbookSelect.value = hw.textbookId || '';
            }
        } else {
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
            loadHomeworkList(state.selectedClassId);
        } catch (e) { console.error(e); showToast("저장 실패", true); }
    };

    const deleteHomework = async () => {
        if (!state.selectedHomeworkId || !confirm("정말 삭제하시겠습니까?")) return;
        try {
            await deleteDoc(doc(db, 'homeworks', state.selectedHomeworkId));
            showToast("삭제되었습니다.");
            loadHomeworkList(state.selectedClassId);
        } catch (e) { showToast("삭제 실패", true); }
    };

    // ============================================================
    // ⭐ [이름 안전하게 만들기] 함수 추가 (오류 해결 핵심!)
    // ============================================================
    const sanitizeFileName = (name) => {
        return name
            .replace(/[\\/:*?"<>|]/g, "_") // 1. 특수문자 제거
            .trim()                         // 2. 앞뒤 공백 제거 (Name not allowed 해결)
            .replace(/\.$/, "");            // 3. 맨 끝 점 제거 (Name not allowed 해결)
    };

    const downloadAllSubmissions = async () => {
        if (!('showDirectoryPicker' in window)) {
            alert("이 기능은 크롬(Chrome), 엣지(Edge) 브라우저의 PC버전에서만 지원됩니다.");
            return;
        }

        const { cachedStudents: students, cachedSubmissions: subs, cachedHomeworkData: hwData } = state;
        if (!students || students.length === 0) {
            showToast("학생 목록이 없습니다.", true);
            return;
        }
        if (!hwData) return;

        const btn = document.getElementById('custom-download-all-btn');
        const originalBtnText = btn ? btn.innerHTML : '전체 내려받기';

        const oldSubs = hwData.submissions || {};

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="material-icons text-sm animate-spin mr-1">sync</span> 저장 경로 선택 중...';
            }

            const dirHandle = await window.showDirectoryPicker();
            
            if (btn) btn.innerHTML = '<span class="material-icons text-sm animate-spin mr-1">sync</span> 다운로드 시작...';
            showToast("다운로드를 시작합니다...", false);

            const folderDate = hwData.dueDate ? hwData.dueDate : new Date().toISOString().split('T')[0];
            // ⭐ 제목도 안전하게 변환
            const safeTitle = sanitizeFileName(hwData.title);
            const targetFolderName = `${folderDate}_${safeTitle}`; 

            const dateDirHandle = await dirHandle.getDirectoryHandle(targetFolderName, { create: true });

            let totalFilesFound = 0;
            let downloadSuccessCount = 0;
            let downloadFailCount = 0;
            const totalStudents = students.length;

            console.log("=== [전체 다운로드 디버그 시작] ===");

            for (let i = 0; i < students.length; i++) {
                try {
                    const student = students[i];
                    const sub = subs[student.id] || oldSubs[student.id];

                    if (!sub) continue;

                    let filesToDownload = [];
                    if (sub.files && Array.isArray(sub.files) && sub.files.length > 0) {
                        filesToDownload = sub.files;
                    } else if (sub.fileUrl) {
                        filesToDownload = [ sub.fileUrl ];
                    }

                    if (filesToDownload.length === 0) continue;

                    if (btn) {
                        btn.innerHTML = `<span class="material-icons text-sm animate-spin mr-1">download</span> 진행 중 (${i + 1}/${totalStudents})<br><span class="text-[10px]">${student.name}</span>`;
                    }
                    
                    // ⭐ 학생 이름도 안전하게 변환 (오류 원인 해결!)
                    const safeStudentName = sanitizeFileName(student.name);
                    const studentDirHandle = await dateDirHandle.getDirectoryHandle(safeStudentName, { create: true });

                    for (let j = 0; j < filesToDownload.length; j++) {
                        totalFilesFound++;
                        let fileUrl = filesToDownload[j];

                        if (typeof fileUrl !== 'string') {
                            if (fileUrl.url) fileUrl = fileUrl.url;
                            else if (fileUrl.downloadUrl) fileUrl = fileUrl.downloadUrl;
                            else if (fileUrl.fileUrl) fileUrl = fileUrl.fileUrl;
                        }

                        if (typeof fileUrl !== 'string' || !fileUrl.startsWith('http')) {
                            console.warn(`[SKIP] 유효하지 않은 URL: ${safeStudentName}`, fileUrl);
                            continue;
                        }

                        const cacheBuster = (fileUrl.includes('?') ? '&' : '?') + `t=${new Date().getTime()}`;
                        const safeUrl = fileUrl + cacheBuster;

                        try {
                            await new Promise(r => setTimeout(r, 200));

                            const response = await fetch(safeUrl);
                            if (!response.ok) throw new Error(`HTTP Error ${response.status}`);
                            
                            const blob = await response.blob();

                            let ext = "jpg";
                            const lowerUrl = fileUrl.toLowerCase();
                            if (lowerUrl.includes('.png')) ext = "png";
                            else if (lowerUrl.includes('.jpeg')) ext = "jpeg";
                            else if (lowerUrl.includes('.pdf')) ext = "pdf";

                            const fileName = `${safeStudentName}_${j + 1}.${ext}`;

                            const fileHandle = await studentDirHandle.getFileHandle(fileName, { create: true });
                            const writable = await fileHandle.createWritable();
                            await writable.write(blob);
                            await writable.close();
                            
                            downloadSuccessCount++;

                        } catch (err) {
                            downloadFailCount++;
                            console.error(`❌ [다운로드 실패] ${safeStudentName} 파일${j+1}:`, err);
                        }
                    }

                } catch (studentErr) {
                    console.error(`⚠️ 학생 처리 중 오류 건너뜀 (${students[i].name}):`, studentErr);
                }
            }

            console.log(`=== [결과] 발견: ${totalFilesFound}, 성공: ${downloadSuccessCount}, 실패: ${downloadFailCount} ===`);

            if (downloadSuccessCount > 0) {
                 if (downloadFailCount > 0) {
                    alert(`⚠️ 부분 성공!\n\n성공: ${downloadSuccessCount}개\n실패: ${downloadFailCount}개\n\n[실패 원인] 대부분 'CORS' 설정 문제입니다.`);
                } else {
                    alert(`✅ 다운로드 완료!\n총 ${downloadSuccessCount}개의 파일을 저장했습니다.`);
                }
            } else if (totalFilesFound > 0) {
                alert(`❌ 다운로드 실패 (0/${totalFilesFound})\n\n보안 설정(CORS)이 되어있지 않아 다운로드가 차단되었습니다.`);
            } else {
                alert("다운로드할 제출 파일이 없습니다.");
            }

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error("다운로드 에러:", err);
                alert("오류가 발생했습니다.");
            }
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            }
        }
    };
    // ============================================================

    initListeners();

    return {
        loadHomeworkList
    };
};