// src/shared/homeworkDashboardManager.js

import { collection, addDoc, doc, updateDoc, deleteDoc, query, where, getDocs, orderBy, serverTimestamp, onSnapshot, setDoc, getDoc } from "firebase/firestore";
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
        cachedStudents: [], // 현재 반 학생
        movedStudents: [],  // 이동한 학생
        unsubHomework: null,
        unsubSubmissions: null,
        showSubmittedOnly: false
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

    // --- 학생 목록 가져오기 (등록일 createdAt 포함) ---
    const getStudentList = async (classId) => {
        // Teacher 모드
        if (mode === 'teacher' && app.state.studentsInClass) {
            return Array.from(app.state.studentsInClass.entries())
                .map(([id, name]) => ({ id, name, createdAt: null })) // 교사 모드는 일단 모두 표시
                .sort((a, b) => a.name.localeCompare(b.name));
        }
        
        // Admin 모드
        if (mode === 'admin') {
            try {
                const students = [];
                // ⚠️ [참고] 학생 수가 많아지면 where 쿼리로 최적화하는 것이 좋습니다.
                const q = query(collection(db, 'students'));
                const snap = await getDocs(q);
                
                snap.forEach(doc => {
                    const data = doc.data();
                    let isInClass = data.classId === classId;
                    // classIds 배열 확인
                    if (data.classIds && Array.isArray(data.classIds) && data.classIds.includes(classId)) {
                        isInClass = true;
                    }
                    if (isInClass) {
                        students.push({ 
                            id: doc.id, 
                            name: data.name,
                            // 등록일이 없으면 아주 옛날(2000년)로 취급하여 모든 숙제 표시
                            createdAt: data.createdAt ? data.createdAt.toDate() : new Date('2000-01-01') 
                        });
                    }
                });
                return students.sort((a, b) => a.name.localeCompare(b.name));
            } catch (e) {
                console.error("학생 목록 로드 실패:", e);
                return [];
            }
        }
        return [];
    };

    // --- 숙제 목록 로드 ---
    const loadHomeworkList = async (classId) => {
        state.selectedClassId = classId;
        const select = elements.homeworkSelect;
        if (!select) return;

        // UI 초기화
        if (elements.contentDiv) elements.contentDiv.style.display = 'none';
        if (elements.placeholder) elements.placeholder.style.display = 'flex';
        if (elements.btnsDiv) elements.btnsDiv.style.display = 'none';
        
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
        state.movedStudents = [];

        state.cachedStudents = await getStudentList(state.selectedClassId);

        if (elements.contentDiv) elements.contentDiv.style.display = 'block';
        if (elements.contentDiv) elements.contentDiv.classList.remove('hidden');
        if (elements.placeholder) elements.placeholder.style.display = 'none';
        
        // 버튼 영역 표시 및 [전체 다운로드 버튼] 추가
        if (elements.btnsDiv) {
            elements.btnsDiv.style.display = 'flex';
            
            // 중복 추가 방지
            if (!elements.btnsDiv.querySelector('#custom-download-all-btn')) {
                const downloadAllBtn = document.createElement('button');
                downloadAllBtn.id = 'custom-download-all-btn';
                downloadAllBtn.className = "flex-1 bg-indigo-50 text-indigo-600 text-xs py-2 rounded font-bold hover:bg-indigo-100 transition ml-2 flex items-center justify-center gap-1";
                downloadAllBtn.innerHTML = '<span class="material-icons text-sm">folder_zip</span> 전체 다운로드';
                downloadAllBtn.onclick = downloadAllSubmissions;
                elements.btnsDiv.appendChild(downloadAllBtn);
            }

            // [제출된 내역만 보기] 필터 추가
            if (!elements.btnsDiv.querySelector('#filter-submitted-only-container')) {
                const filterContainer = document.createElement('div');
                filterContainer.id = 'filter-submitted-only-container';
                filterContainer.className = "flex items-center ml-3";
                filterContainer.innerHTML = `
                    <input type="checkbox" id="filter-submitted-only" class="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500 cursor-pointer">
                    <label for="filter-submitted-only" class="ml-1 text-xs font-bold text-slate-600 cursor-pointer select-none">제출된 내역만 보기</label>
                `;
                elements.btnsDiv.insertBefore(filterContainer, elements.btnsDiv.firstChild);
                filterContainer.querySelector('input').addEventListener('change', (e) => {
                    state.showSubmittedOnly = e.target.checked;
                    renderTable();
                });
            }
        }

        if (elements.tableBody) elements.tableBody.innerHTML = '<tr><td colspan="4" class="p-4 text-center">데이터를 불러오는 중...</td></tr>';

        // 1. 숙제 정보 구독
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

        // 2. 제출 내역 구독
        const subCol = collection(db, 'homeworks', homeworkId, 'submissions');
        state.unsubSubmissions = onSnapshot(subCol, async (snap) => {
            state.cachedSubmissions = {};
            const currentStudentIds = new Set(state.cachedStudents.map(s => s.id));
            const orphanIds = [];

            snap.forEach(d => {
                state.cachedSubmissions[d.id] = d.data();
                if (!currentStudentIds.has(d.id)) {
                    orphanIds.push(d.id);
                }
            });

            // 이동한 학생 정보 가져오기 (비동기)
            const movedList = [];
            await Promise.all(orphanIds.map(async (uid) => {
                try {
                    const sSnap = await getDoc(doc(db, 'students', uid));
                    if (sSnap.exists()) {
                        const sData = sSnap.data();
                        // 퇴원생(반 정보 없음) 제외, 다른 반에 있는 경우만 추가
                        if (sData.classId) {
                            movedList.push({ 
                                id: uid, 
                                name: sData.name, 
                                createdAt: sData.createdAt ? sData.createdAt.toDate() : new Date('2000-01-01')
                            });
                        }
                    }
                } catch(e) {}
            }));
            
            state.movedStudents = movedList;
            renderTable();
        });
    };

    // --- [신입생 필터] 등록일 비교 로직 ---
    const isHomeworkBeforeStudent = (homeworkDateStr, studentDate) => {
        if (!homeworkDateStr || !studentDate) return false;
        const hwDate = new Date(homeworkDateStr);
        // 숙제 마감일 < 학생 등록일 이면 true (등록 전 숙제)
        return hwDate.getTime() < studentDate.getTime();
    };

    // --- 테이블 렌더링 ---
    const renderTable = () => {
        const { cachedHomeworkData: hwData, cachedSubmissions: subs, cachedStudents: students, movedStudents } = state;
        if (!hwData || !elements.tableBody) return;

        const tbody = elements.tableBody;
        tbody.innerHTML = '';

        const renderRow = (student, isMoved = false) => {
            const sub = subs[student.id];
            
            // 1. [필터] 제출된 내역만 보기
            if (state.showSubmittedOnly && (!sub || (sub.status !== 'completed' && sub.status !== 'partial'))) {
                return;
            }

            // 2. [신입생 처리] 제출 기록이 없는데, 숙제 날짜가 등록일보다 빠르면 -> 숨김/회색 처리
            const isBefore = !sub && isHomeworkBeforeStudent(hwData.dueDate, student.createdAt);

            if (isBefore) {
                tbody.innerHTML += `
                    <tr class="bg-slate-50/50 border-b">
                        <td class="p-3 text-slate-400 whitespace-nowrap flex items-center gap-2">
                            ${student.name}
                            ${isMoved ? '<span class="text-[10px] border px-1 rounded">이동</span>' : ''}
                        </td>
                        <td class="p-3 text-slate-300 text-xs italic" colspan="3">
                            등록 전 (해당 없음)
                        </td>
                    </tr>
                `;
                return;
            }

            // 정상 상태 표시
            let statusInfo = homeworkManagerHelper.calculateStatus(sub, hwData);
            if (sub && sub.status === 'partial') {
                statusInfo = { text: '부분 제출', color: 'text-orange-600 font-bold' };
            }

            const downloadBtn = homeworkManagerHelper.renderFileButtons(sub, '반'); 
            const date = sub?.submittedAt ? new Date(sub.submittedAt.toDate()).toLocaleDateString() : '-';
            const isCompleted = sub && (sub.status === 'completed' || sub.manualComplete);
            
            let actionBtn = !isCompleted ? `
                <button class="force-complete-btn ml-2 text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded hover:bg-green-100 transition whitespace-nowrap" 
                        data-id="${student.id}" title="강제 완료 처리">✅ 확인</button>` : '';

            // 팝업 버튼 (상세 보기)
            const detailBtn = `
                <button class="view-history-btn ml-1 text-slate-400 hover:text-indigo-600 transition" 
                        data-id="${student.id}" data-name="${student.name}" title="정보 보기">
                    <span class="material-icons text-sm align-middle">info</span>
                </button>
            `;

            const bgClass = isMoved ? 'bg-amber-50/30' : 'hover:bg-slate-50';
            const nameBadge = isMoved ? `<span class="text-[10px] text-amber-600 border border-amber-200 rounded px-1 ml-1 bg-white">타 반</span>` : '';

            tbody.innerHTML += `
                <tr class="${bgClass} border-b transition-colors">
                    <td class="p-3 font-medium text-slate-700 whitespace-nowrap flex items-center">
                        ${student.name} ${nameBadge} ${detailBtn}
                    </td>
                    <td class="p-3 ${statusInfo.color} whitespace-nowrap">${statusInfo.text} ${actionBtn}</td>
                    <td class="p-3 text-xs text-slate-500 whitespace-nowrap">${date}</td>
                    <td class="p-3 text-center"><div>${downloadBtn}</div></td>
                </tr>`;
        };

        if (students.length === 0 && movedStudents.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-400">학생 데이터가 없습니다.</td></tr>';
            return;
        }

        // 현재 반 학생 출력
        students.forEach(s => renderRow(s, false));

        // 반 이동 학생 출력 (제출 기록이 있는 경우)
        if (movedStudents.length > 0) {
            const hasData = movedStudents.some(s => subs[s.id]);
            if (!state.showSubmittedOnly || hasData) {
                tbody.innerHTML += `
                    <tr class="bg-slate-100 border-y-2 border-slate-200">
                        <td colspan="4" class="px-4 py-2 text-xs font-bold text-slate-600 text-center flex items-center justify-center gap-2">
                            <span class="material-icons text-sm">swap_horiz</span> 반 이동 학생 (타 반 소속)
                        </td>
                    </tr>
                `;
                movedStudents.forEach(s => renderRow(s, true));
            }
        }
        
        // ⭐ [UI 수정] 잘림 방지용 하단 여백 추가 (투명 행)
        tbody.innerHTML += `<tr class="h-24 w-full bg-transparent border-none pointer-events-none"><td colspan="4"></td></tr>`;

        // 리스너 연결
        tbody.querySelectorAll('.force-complete-btn').forEach(btn => {
            btn.addEventListener('click', () => forceComplete(btn.dataset.id));
        });
        
        tbody.querySelectorAll('.view-history-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                alert(`[${btn.dataset.name}] 학생 정보\n\n이동 전 기록 확인은 '학생 관리' 메뉴를 이용해주세요.`);
            });
        });
    };

    const forceComplete = async (studentId) => {
        if (!confirm("이 학생의 숙제를 '완료' 상태로 변경하시겠습니까?")) return;
        
        let student = state.cachedStudents.find(s => s.id === studentId);
        if (!student) student = state.movedStudents.find(s => s.id === studentId);
        const studentName = student ? student.name : "이름 없음";

        try {
            await setDoc(doc(db, 'homeworks', state.selectedHomeworkId, 'submissions', studentId), {
                studentDocId: studentId, 
                studentName: studentName,
                manualComplete: true, 
                status: 'completed', 
                updatedAt: serverTimestamp()
            }, { merge: true });
            showToast("완료 처리되었습니다.");
        } catch (e) { console.error(e); showToast("처리 실패", true); }
    };

    // ... 모달 및 저장 로직 ...
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

    const sanitizeFileName = (name) => {
        return (name || "unknown").replace(/[\\/:*?"<>|]/g, "_").trim().replace(/\.$/, "");
    };

    // --- ⭐ [다운로드 기능] 전체 다운로드 로직 ---
    const downloadAllSubmissions = async () => {
        const { cachedStudents, movedStudents, cachedSubmissions: subs, cachedHomeworkData: hwData } = state;
        const allTargetStudents = [...cachedStudents, ...movedStudents];
        
        if (!allTargetStudents || allTargetStudents.length === 0) {
            showToast("학생 목록이 없습니다.", true);
            return;
        }
        if (!hwData) return;

        const btn = document.getElementById('custom-download-all-btn');
        const originalBtnHTML = btn ? btn.innerHTML : '전체 다운로드';

        // 1. 크롬/엣지: 폴더 선택 방식
        if ('showDirectoryPicker' in window) {
            await downloadViaFileSystem(allTargetStudents, subs, hwData, btn, originalBtnHTML);
        } 
        // 2. 사파리/파이어폭스: ZIP 압축 방식
        else {
            await downloadViaZip(allTargetStudents, subs, hwData, btn, originalBtnHTML);
        }
    };

    // [Method A] 폴더 직접 저장 (크롬/엣지) - 🚀 [수정됨: fileUrl 추가 & 딜레이/에러핸들링 추가]
    const downloadViaFileSystem = async (students, subs, hwData, btn, originalBtnHTML) => {
        try {
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons text-sm animate-spin mr-1">sync</span> 경로 선택 중...'; }
            const dirHandle = await window.showDirectoryPicker();
            if (btn) btn.innerHTML = '<span class="material-icons text-sm animate-spin mr-1">download</span> 다운로드 중...';
            showToast("다운로드를 시작합니다...", false);

            const folderDate = hwData.dueDate ? hwData.dueDate : new Date().toISOString().split('T')[0];
            const safeTitle = sanitizeFileName(hwData.title);
            const targetFolderName = `${folderDate}_${safeTitle}`; 
            
            // 메인 폴더 생성
            const dateDirHandle = await dirHandle.getDirectoryHandle(targetFolderName, { create: true });
            
            let count = 0;
            for (let i = 0; i < students.length; i++) {
                const student = students[i];
                const sub = subs[student.id]; 
                if (!sub) continue;

                let files = sub.files || (sub.fileUrl ? [sub.fileUrl] : []);
                if (files.length === 0) continue;

                if (btn) btn.innerHTML = `진행 중 (${i+1}/${students.length})`;
                
                // 🔹 [수정 1] 학생 개별 폴더 생성 실패 시(이름 오류 등) 건너뛰도록 보호
                let studentDir;
                try {
                    studentDir = await dateDirHandle.getDirectoryHandle(sanitizeFileName(student.name), { create: true });
                } catch (folderErr) {
                    console.error(`폴더 생성 실패 [${student.name}]:`, folderErr);
                    continue; 
                }

                for (let j = 0; j < files.length; j++) {
                    // 🔹 [수정 2] 개별 파일 에러 핸들링 (하나 실패해도 멈추지 않음)
                    try {
                        // 🟢 [중요 수정] fileUrl 속성 체크 추가
                        const fileUrl = (typeof files[j] === 'string') ? files[j] : (files[j].url || files[j].downloadUrl || files[j].fileUrl);
                        
                        if (!fileUrl) {
                            console.warn("파일 URL 없음:", files[j]);
                            continue;
                        }

                        const response = await fetch(fileUrl);
                        if (!response.ok) throw new Error(`Fetch status: ${response.status}`);
                        const blob = await response.blob();
                        
                        let ext = "jpg";
                        if (fileUrl.toLowerCase().includes(".png")) ext = "png";
                        else if (fileUrl.toLowerCase().includes(".pdf")) ext = "pdf";
                        
                        const fileHandle = await studentDir.getFileHandle(`${sanitizeFileName(student.name)}_${j+1}.${ext}`, { create: true });
                        const writable = await fileHandle.createWritable();
                        await writable.write(blob);
                        await writable.close();
                        
                        // 🔹 [수정 3] 핵심: 쓰기 후 200ms 대기 (락 충돌 방지)
                        await new Promise(r => setTimeout(r, 200)); 
                        
                        count++;
                    } catch (fileErr) { 
                        console.error(`${student.name} 파일 저장 실패:`, fileErr);
                        // 실패해도 loop는 계속 돕니다.
                    }
                }
            }
            alert(`✅ 다운로드 완료! (성공: ${count}개)`);
        } catch (e) { 
            console.error(e); 
            if(e.name !== 'AbortError') alert("다운로드 중 치명적 오류가 발생했습니다."); 
        } 
        finally { if(btn) { btn.disabled = false; btn.innerHTML = originalBtnHTML; } }
    };

    // [Method B] ZIP 압축 (사파리/파이어폭스/모바일) - 🚀 [수정됨: fileUrl 추가]
    const downloadViaZip = async (students, subs, hwData, btn, originalBtnHTML) => {
        try {
            if (btn) { btn.disabled = true; btn.innerHTML = '<span class="material-icons text-sm animate-spin mr-1">hourglass_empty</span> JSZip 로드 중...'; }
            
            // CDN에서 JSZip 동적 로드 (여전히 CDN 사용 중이라면 유지)
            if (!window.JSZip) { await import("https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm").then(module => { window.JSZip = module.default; }); }

            const zip = new window.JSZip();
            const folderDate = hwData.dueDate ? hwData.dueDate : new Date().toISOString().split('T')[0];
            const safeTitle = sanitizeFileName(hwData.title);
            const rootFolder = zip.folder(`${folderDate}_${safeTitle}`);

            if (btn) btn.innerHTML = '<span class="material-icons text-sm animate-spin mr-1">download</span> 파일 수집 중...';
            showToast("파일을 압축하고 있습니다...", false);

            let count = 0;
            const promises = [];

            for (const student of students) {
                const sub = subs[student.id];
                if (!sub) continue;
                let files = sub.files || (sub.fileUrl ? [sub.fileUrl] : []);
                if (files.length === 0) continue;

                const studentFolder = rootFolder.folder(sanitizeFileName(student.name));
                files.forEach((f, idx) => {
                    // 🟢 [중요 수정] ZIP 방식에도 fileUrl 속성 체크 추가
                    const fileUrl = (typeof f === 'string') ? f : (f.url || f.downloadUrl || f.fileUrl);
                    
                    if (!fileUrl) return;

                    const p = fetch(fileUrl).then(r => r.blob()).then(blob => {
                        let ext = "jpg";
                        if (blob.type === "application/pdf") ext = "pdf";
                        else if (blob.type === "image/png") ext = "png";
                        else if (fileUrl.toLowerCase().includes(".pdf")) ext = "pdf";
                        else if (fileUrl.toLowerCase().includes(".png")) ext = "png";
                        studentFolder.file(`${sanitizeFileName(student.name)}_${idx+1}.${ext}`, blob);
                        count++;
                        if(btn) btn.innerHTML = `수집 중... (${count}개)`;
                    }).catch(err => console.error("Zip download error", err)); // ZIP 에러 핸들링 추가
                    promises.push(p);
                });
            }
            await Promise.all(promises);
            if (count === 0) { alert("다운로드할 파일이 없습니다."); return; }

            if (btn) btn.innerHTML = '<span class="material-icons text-sm animate-spin mr-1">compress</span> 압축 중...';
            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(content);
            a.download = `${folderDate}_${safeTitle}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(a.href);
            alert("✅ ZIP 파일 다운로드 시작");
        } catch (e) { console.error(e); alert("오류 발생 (CORS 확인 필요)"); } 
        finally { if(btn) { btn.disabled = false; btn.innerHTML = originalBtnHTML; } }
    };

    initListeners();
    return { loadHomeworkList };
};