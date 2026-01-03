// src/parent/parentHomework.js

import { collection, query, where, getDocs, doc, getDoc, onSnapshot } from "firebase/firestore";

export const parentHomework = {
    db: null,
    student: null,
    unsubscribe: null,
    
    state: {
        homeworks: [],
        pastHomeworks: []
    },

    elements: {
        listContainer: 'homework-list'
    },

    init(db, student) {
        this.db = db;
        this.student = student;
        // 모달 닫기 이벤트 (ESC 키)
        document.addEventListener('keydown', (e) => {
            if(e.key === 'Escape') this.closeDetailModal();
        });
    },

    fetchHomeworks() {
        if (!this.student) return;

        const classId = this.student.classId;
        const classIds = this.student.classIds || [];

        if (!classId && classIds.length === 0) return;

        this.renderLoading();

        if (this.unsubscribe) {
            this.unsubscribe();
            this.unsubscribe = null;
        }

        const q = query(collection(this.db, "homeworks"), where("classId", "==", classId));
        
        this.unsubscribe = onSnapshot(q, async (snapshot) => {
            let allHomeworks = [];
            snapshot.forEach(doc => allHomeworks.push({ id: doc.id, ...doc.data() }));

            if (classIds.length > 0) {
                const q2 = query(collection(this.db, "homeworks"), where("classId", "in", classIds));
                const snapshot2 = await getDocs(q2);
                snapshot2.forEach(doc => {
                    if (!allHomeworks.find(h => h.id === doc.id)) {
                        allHomeworks.push({ id: doc.id, ...doc.data() });
                    }
                });
            }

            allHomeworks.sort((a, b) => {
                const dateA = a.dueDate || a.endDate || "0000-00-00";
                const dateB = b.dueDate || b.endDate || "0000-00-00";
                return new Date(dateB) - new Date(dateA);
            });

            const now = new Date();
            let active = [];
            let past = [];

            allHomeworks.forEach(hw => {
                const dateStr = hw.dueDate || hw.endDate;
                if (!dateStr) { active.push(hw); return; }
                const endDateTime = new Date(dateStr + "T23:59:59");
                if (endDateTime < now) past.push(hw);
                else active.push(hw);
            });

            this.state.homeworks = await this.checkSubmissionStatus(active);
            this.state.pastHomeworks = await this.checkSubmissionStatus(past);

            this.renderList();
        });
    },

    async checkSubmissionStatus(homeworkList) {
        if (!this.student.id) return homeworkList;
        const studentName = this.student.name; 

        const results = await Promise.all(homeworkList.map(async (hw) => {
            try {
                if (hw.submissions && hw.submissions[this.student.id]) {
                     return { ...hw, isSubmitted: true, submissionData: hw.submissions[this.student.id] };
                }

                const subRef = doc(this.db, "homeworks", hw.id, "submissions", this.student.id);
                const subSnap = await getDoc(subRef);
                if (subSnap.exists()) {
                    return { ...hw, isSubmitted: true, submissionData: subSnap.data() };
                } 
                
                const subColRef = collection(this.db, "homeworks", hw.id, "submissions");

                const q1 = query(subColRef, where("studentId", "==", this.student.id));
                const snap1 = await getDocs(q1);
                if (!snap1.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap1.docs[0].data() };
                }

                const q2 = query(subColRef, where("studentDocId", "==", this.student.id));
                const snap2 = await getDocs(q2);
                if (!snap2.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap2.docs[0].data() };
                }

                if (studentName) {
                    const q3 = query(subColRef, where("studentName", "==", studentName));
                    const snap3 = await getDocs(q3);
                    if (!snap3.empty) {
                        return { ...hw, isSubmitted: true, submissionData: snap3.docs[0].data() };
                    }
                }

                return { ...hw, isSubmitted: false };

            } catch (e) {
                return { ...hw, isSubmitted: false };
            }
        }));

        return results;
    },

    renderLoading() {
        const el = document.getElementById(this.elements.listContainer);
        if(el) el.innerHTML = '<div class="loader-small mx-auto mt-10"></div>';
    },

    renderError() {
        const el = document.getElementById(this.elements.listContainer);
        if(el) el.innerHTML = '<div class="text-center text-red-500 py-4">숙제 정보를 불러오지 못했습니다.</div>';
    },

    renderList() {
        const listEl = document.getElementById(this.elements.listContainer);
        if(!listEl) return;

        let html = '';

        // [UI 변경] 파일 리스트를 뺀 '심플한 카드'만 생성
        if (this.state.homeworks.length > 0) {
            html += `<div class="mb-2 px-1 text-sm font-bold text-slate-700 flex items-center gap-2"><span class="material-icons-round text-base text-blue-500">assignment</span> 진행 중인 과제</div>`;
            html += this.state.homeworks.map(hw => this.createSummaryCard(hw)).join('');
        } else {
            html += `<div class="text-center py-8 bg-white rounded-xl border border-slate-100 mb-6 text-slate-400 text-sm">현재 진행 중인 과제가 없습니다.</div>`;
        }

        if (this.state.pastHomeworks.length > 0) {
            html += `<div class="mt-8 mb-2 px-1 text-sm font-bold text-slate-400 flex items-center gap-2 border-t border-slate-200 pt-6"><span class="material-icons-round text-base">history</span> 지난 과제</div>`;
            html += this.state.pastHomeworks.map(hw => this.createSummaryCard(hw, true)).join(''); 
        } else {
            html += `<div class="text-center py-8 text-slate-400 mt-8 pt-6 border-t border-slate-200">지난 과제 기록이 없습니다.</div>`;
        }

        listEl.innerHTML = html;

        // [이벤트] 카드 클릭 시 팝업 열기
        listEl.querySelectorAll('.homework-card').forEach(card => {
            card.addEventListener('click', () => {
                const hwId = card.dataset.id;
                const hw = [...this.state.homeworks, ...this.state.pastHomeworks].find(h => h.id === hwId);
                if (hw) this.openDetailModal(hw);
            });
        });
    },

    // ⭐ [신규 UI] 목록에는 '요약 정보'만 보여줌 (파일 목록 X)
    createSummaryCard(hw, isPast = false) {
        let statusBadge = `<span class="bg-red-50 text-red-500 px-2 py-1 rounded text-xs font-bold border border-red-100">미제출</span>`;
        let opacityClass = isPast ? "opacity-70 grayscale-[0.3]" : "";
        let submittedDateInfo = "";

        if (hw.isSubmitted) {
            const status = hw.submissionData.status;
            if(status === 'partial') {
                statusBadge = `<span class="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold border border-orange-100">부분 제출</span>`;
            } else {
                statusBadge = `<span class="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold border border-green-100">제출 완료</span>`;
            }
            // 제출한 날짜 표시 (옵션)
            const date = hw.submissionData.submittedAt ? new Date(hw.submissionData.submittedAt.toDate()).toLocaleDateString() : '';
            if(date) submittedDateInfo = `<span class="text-[10px] text-green-600 mt-1">(${date} 제출)</span>`;
        }

        return `
            <div class="homework-card cursor-pointer bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-3 ${opacityClass} transition hover:shadow-md hover:border-indigo-200 active:bg-slate-50" data-id="${hw.id}">
                <div class="flex justify-between items-start mb-2">
                    <div>
                        <h4 class="font-bold text-slate-800 text-base leading-snug">${hw.title}</h4>
                        <div class="text-xs text-slate-400 mt-1 line-clamp-1">${hw.description || '내용 없음'}</div>
                    </div>
                    <div class="flex flex-col items-end flex-shrink-0 ml-2">
                        ${statusBadge}
                        ${submittedDateInfo}
                    </div>
                </div>
                <div class="flex justify-between items-center text-xs text-slate-500 bg-slate-50 p-2 rounded-lg mt-2">
                    <div class="flex items-center gap-1">
                        <span class="material-icons-round text-sm">event</span>
                        <span class="${isPast ? '' : 'text-blue-600 font-bold'}">${hw.dueDate || hw.endDate || '기한 없음'}</span>
                    </div>
                    <div class="flex items-center gap-1 text-indigo-400 font-bold">
                        상세보기 <span class="material-icons-round text-sm">chevron_right</span>
                    </div>
                </div>
            </div>
        `;
    },

    // ⭐ [신규 UI] 팝업(모달) 생성 및 표시
    openDetailModal(hw) {
        // 기존 모달 있으면 제거
        this.closeDetailModal();

        const files = hw.isSubmitted && hw.submissionData 
            ? (hw.submissionData.files || (hw.submissionData.fileUrl ? [{fileName: '첨부파일', fileUrl: hw.submissionData.fileUrl}] : []))
            : [];

        // 파일 목록 HTML 생성
        let fileAreaHtml = '';
        if (files.length > 0) {
            fileAreaHtml = `
                <div class="mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div class="flex items-center justify-between mb-3">
                        <p class="text-sm text-slate-600 font-bold flex items-center gap-1">
                            <span class="material-icons-round text-base text-indigo-500">folder</span>
                            제출한 파일 (${files.length}개)
                        </p>
                    </div>
                    
                    <div class="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        ${files.map(f => `
                            <button class="modal-file-btn w-full flex items-center gap-3 text-left bg-white p-3 rounded-lg border border-slate-200 hover:bg-indigo-50 hover:border-indigo-300 transition group"
                                data-url="${f.fileUrl}" data-name="${f.fileName}">
                                <div class="bg-indigo-50 p-2 rounded-full text-indigo-500 group-hover:bg-indigo-100">
                                    <span class="material-icons-round text-lg">description</span>
                                </div>
                                <span class="text-sm text-slate-700 font-medium truncate flex-1">${f.fileName || '파일 다운로드'}</span>
                                <span class="material-icons-round text-slate-300 group-hover:text-indigo-500">download</span>
                            </button>
                        `).join('')}
                    </div>

                    ${files.length > 1 ? `
                        <button id="modal-download-all-btn" class="w-full mt-3 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-md shadow-indigo-100 flex items-center justify-center gap-2">
                            <span class="material-icons-round">folder_zip</span>
                            한 번에 저장하기 (ZIP)
                        </button>
                        <p class="text-[10px] text-center text-slate-400 mt-2">팝업 차단 없이 안전하게 다운로드됩니다.</p>
                    ` : ''}
                </div>
            `;
        } else if (hw.isSubmitted) {
            fileAreaHtml = `<div class="mt-4 p-4 text-center text-slate-400 bg-slate-50 rounded-xl text-sm">제출된 파일이 없습니다.</div>`;
        } else {
            fileAreaHtml = `<div class="mt-4 p-4 text-center text-red-400 bg-red-50 rounded-xl text-sm font-bold">아직 과제를 제출하지 않았습니다.</div>`;
        }

        // 모달 HTML 구조
        const modalHtml = `
            <div id="hw-detail-modal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4">
                <div class="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
                    <div class="p-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                        <h3 class="font-bold text-lg text-slate-800 truncate pr-4">${hw.title}</h3>
                        <button id="modal-close-btn" class="p-2 rounded-full hover:bg-slate-100 transition">
                            <span class="material-icons-round text-slate-500">close</span>
                        </button>
                    </div>

                    <div class="p-5 overflow-y-auto">
                        <div class="flex gap-2 mb-4">
                            <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">마감: ${hw.dueDate || '없음'}</span>
                            <span class="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">범위: ${hw.pages || '-'}</span>
                        </div>
                        <p class="text-sm text-slate-600 leading-relaxed whitespace-pre-line mb-4">${hw.description || '상세 내용이 없습니다.'}</p>
                        
                        ${fileAreaHtml}
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 이벤트 연결
        document.getElementById('modal-close-btn').addEventListener('click', () => this.closeDetailModal());
        
        // 배경 클릭 시 닫기
        document.getElementById('hw-detail-modal').addEventListener('click', (e) => {
            if (e.target.id === 'hw-detail-modal') this.closeDetailModal();
        });

        // 개별 다운로드
        document.querySelectorAll('.modal-file-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.downloadFile(btn.dataset.url, btn.dataset.name);
            });
        });

        // 전체 다운로드 (ZIP)
        const zipBtn = document.getElementById('modal-download-all-btn');
        if (zipBtn) {
            zipBtn.addEventListener('click', () => {
                this.handleDownloadAllAsZip(zipBtn, hw.id);
            });
        }
    },

    closeDetailModal() {
        const modal = document.getElementById('hw-detail-modal');
        if (modal) modal.remove();
    },

    // ⭐ ZIP 다운로드 기능 (기존 로직 유지)
    async handleDownloadAllAsZip(btnElement, hwId) {
        const ua = navigator.userAgent.toLowerCase();
        const isInApp = ua.includes('kakao') || ua.includes('naver');
        if (isInApp) alert("⚠️ 카카오톡에서는 다운로드가 안 될 수 있습니다.\n'다른 브라우저로 열기'를 권장합니다.");

        const hw = [...this.state.homeworks, ...this.state.pastHomeworks].find(h => h.id === hwId);
        if (!hw || !hw.submissionData) return;
        const files = hw.submissionData.files || [];

        const originalText = btnElement.innerHTML;
        btnElement.disabled = true;
        btnElement.innerHTML = `<span class="material-icons-round text-sm animate-spin">sync</span> 압축 중...`;

        try {
            if (!window.JSZip) {
                await this.loadScript("https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js");
            }
            const zip = new window.JSZip();
            const downloadPromises = files.map(async (file, index) => {
                const cacheBuster = (file.fileUrl.includes('?') ? '&' : '?') + `t=${new Date().getTime()}`;
                const response = await fetch(file.fileUrl + cacheBuster);
                if (!response.ok) throw new Error("File fetch failed");
                const blob = await response.blob();
                let fileName = file.fileName || `file_${index + 1}`;
                if (!fileName.includes('.')) fileName += ".jpg"; 
                return { fileName, blob };
            });

            const fileObjects = await Promise.all(downloadPromises);
            fileObjects.forEach(f => zip.file(f.fileName, f.blob));
            const content = await zip.generateAsync({ type: "blob" });

            const zipName = `${this.student.name}_${hw.title}_제출파일.zip`.replace(/[\\/:*?"<>|]/g, "_");
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(content);
            link.download = zipName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setTimeout(() => alert("압축 완료! 다운로드를 시작합니다."), 500);

        } catch (error) {
            console.error("ZIP Error:", error);
            alert("오류가 발생했습니다. 개별 다운로드를 이용해주세요.");
        } finally {
            btnElement.innerHTML = originalText;
            btnElement.disabled = false;
        }
    },

    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    async downloadFile(url, fileName) {
        const ua = navigator.userAgent.toLowerCase();
        const isInApp = ua.includes('kakao') || ua.includes('naver');
        if (isInApp) {
            if(confirm("다운로드를 위해 파일을 엽니다.")) window.location.href = url;
            return;
        }
        try {
            const cacheBuster = (url.includes('?') ? '&' : '?') + `t=${new Date().getTime()}`;
            const response = await fetch(url + cacheBuster);
            if (!response.ok) throw new Error("HTTP error");
            const blob = await response.blob();
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName; 
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            window.open(url, '_blank');
        }
    },
    
    toggleTab() {},
    closeModal() {},
    openSubmitModal() {},
    submitHomework() {}
};