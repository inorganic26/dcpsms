// src/parent/parentHomework.js

import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";

export const parentHomework = {
    db: null,
    student: null,
    
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
    },

    async fetchHomeworks() {
        if (!this.student) return;

        const classId = this.student.classId;
        const classIds = this.student.classIds || [];

        if (!classId && classIds.length === 0) return;

        this.renderLoading();

        try {
            let allHomeworks = [];

            // 1. 메인 반
            if (classId) {
                const q = query(collection(this.db, "homeworks"), where("classId", "==", classId));
                const snapshot = await getDocs(q);
                snapshot.forEach(doc => allHomeworks.push({ id: doc.id, ...doc.data() }));
            }

            // 2. 추가 반
            if (classIds.length > 0) {
                const q2 = query(collection(this.db, "homeworks"), where("classId", "in", classIds));
                const snapshot2 = await getDocs(q2);
                snapshot2.forEach(doc => {
                    if (!allHomeworks.find(h => h.id === doc.id)) {
                        allHomeworks.push({ id: doc.id, ...doc.data() });
                    }
                });
            }

            // 3. 정렬
            allHomeworks.sort((a, b) => {
                const dateA = a.dueDate || a.endDate || "0000-00-00";
                const dateB = b.dueDate || b.endDate || "0000-00-00";
                return new Date(dateB) - new Date(dateA);
            });

            const now = new Date();
            let active = [];
            let past = [];

            // 4. 분류
            allHomeworks.forEach(hw => {
                const dateStr = hw.dueDate || hw.endDate;
                if (!dateStr) { active.push(hw); return; }
                const endDateTime = new Date(dateStr + "T23:59:59");
                if (endDateTime < now) past.push(hw);
                else active.push(hw);
            });

            // 5. 제출 확인
            this.state.homeworks = await this.checkSubmissionStatus(active);
            this.state.pastHomeworks = await this.checkSubmissionStatus(past);

            this.renderList();

        } catch (error) {
            console.error("부모님 앱 숙제 로딩 실패:", error);
            this.renderError();
        }
    },

    async checkSubmissionStatus(homeworkList) {
        if (!this.student.id) return homeworkList;
        const studentName = this.student.name; 

        const results = await Promise.all(homeworkList.map(async (hw) => {
            try {
                // 0. [초기 호환] 숙제 문서 자체 필드
                if (hw.submissions && hw.submissions[this.student.id]) {
                     return { ...hw, isSubmitted: true, submissionData: hw.submissions[this.student.id] };
                }

                // 1. 문서 ID (최신)
                const subRef = doc(this.db, "homeworks", hw.id, "submissions", this.student.id);
                const subSnap = await getDoc(subRef);
                if (subSnap.exists()) {
                    return { ...hw, isSubmitted: true, submissionData: subSnap.data() };
                } 
                
                const subColRef = collection(this.db, "homeworks", hw.id, "submissions");

                // 2. studentId 필드 (구형)
                const q1 = query(subColRef, where("studentId", "==", this.student.id));
                const snap1 = await getDocs(q1);
                if (!snap1.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap1.docs[0].data() };
                }

                // 3. studentDocId 필드 (더 옛날)
                const q2 = query(subColRef, where("studentDocId", "==", this.student.id));
                const snap2 = await getDocs(q2);
                if (!snap2.empty) {
                    return { ...hw, isSubmitted: true, submissionData: snap2.docs[0].data() };
                }

                // 4. studentName 필드 (ID 없는 데이터 대응)
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

        if (this.state.homeworks.length > 0) {
            html += `<div class="mb-2 px-1 text-sm font-bold text-slate-700 flex items-center gap-2"><span class="material-icons-round text-base text-blue-500">assignment</span> 진행 중인 과제</div>`;
            html += this.state.homeworks.map(hw => this.createCard(hw)).join('');
        } else {
            html += `<div class="text-center py-8 bg-white rounded-xl border border-slate-100 mb-6 text-slate-400 text-sm">현재 진행 중인 과제가 없습니다.</div>`;
        }

        if (this.state.pastHomeworks.length > 0) {
            html += `<div class="mt-8 mb-2 px-1 text-sm font-bold text-slate-400 flex items-center gap-2 border-t border-slate-200 pt-6"><span class="material-icons-round text-base">history</span> 지난 과제</div>`;
            html += this.state.pastHomeworks.map(hw => this.createCard(hw, true)).join(''); 
        } else {
            html += `<div class="text-center py-8 text-slate-400 mt-8 pt-6 border-t border-slate-200">지난 과제 기록이 없습니다.</div>`;
        }

        listEl.innerHTML = html;

        // [이벤트 연결] 개별 다운로드
        listEl.querySelectorAll('.file-download-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.downloadFile(btn.dataset.url, btn.dataset.name);
            });
        });

        // [이벤트 연결] 전체 다운로드
        listEl.querySelectorAll('.download-all-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownloadAll(btn.dataset.id);
            });
        });
    },

    createCard(hw, isPast = false) {
        let statusBadge = `<span class="bg-red-50 text-red-500 px-2 py-1 rounded text-xs font-bold border border-red-100">미제출</span>`;
        let submissionInfo = "";
        let opacityClass = isPast ? "opacity-70 grayscale-[0.3]" : "";
        let fileListHtml = "";

        if (hw.isSubmitted) {
            const status = hw.submissionData.status;
            const submittedDate = hw.submissionData.submittedAt ? new Date(hw.submissionData.submittedAt.toDate()).toLocaleDateString() : '-';
            
            if(status === 'partial') {
                statusBadge = `<span class="bg-orange-50 text-orange-600 px-2 py-1 rounded text-xs font-bold border border-orange-100">부분 제출</span>`;
            } else {
                statusBadge = `<span class="bg-green-50 text-green-600 px-2 py-1 rounded text-xs font-bold border border-green-100">제출 완료</span>`;
            }

            // 파일 목록
            const files = hw.submissionData.files || (hw.submissionData.fileUrl ? [{fileName: '첨부파일', fileUrl: hw.submissionData.fileUrl}] : []);
            
            if (files.length > 0) {
                // [추가] 파일이 2개 이상일 때만 '모두 저장' 버튼 표시
                const downloadAllBtn = files.length > 1 
                    ? `<button class="download-all-btn text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-1 rounded hover:bg-indigo-100 transition font-bold ml-auto flex items-center gap-1" data-id="${hw.id}">
                        <span class="material-icons-round text-[14px]">folder_zip</span> 모두 저장
                       </button>` 
                    : '';

                fileListHtml = `<div class="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div class="flex items-center justify-between mb-2">
                        <p class="text-xs text-slate-500 font-bold">📄 제출한 파일 (${files.length}개)</p>
                        ${downloadAllBtn}
                    </div>
                    <div class="space-y-2">
                        ${files.map(f => `
                            <button class="file-download-btn w-full flex items-center gap-2 text-left bg-white p-2 rounded border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 transition group"
                                data-url="${f.fileUrl}" data-name="${f.fileName}">
                                <span class="material-icons-round text-sm text-slate-400 group-hover:text-indigo-500">download</span>
                                <span class="text-xs text-slate-600 group-hover:text-indigo-700 truncate">${f.fileName || '파일 다운로드'}</span>
                            </button>
                        `).join('')}
                    </div>
                </div>`;
            }

            submissionInfo = `<div class="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-50 flex flex-col gap-1">
                <div class="flex items-center gap-1"><span class="material-icons-round text-sm text-green-500">check_circle</span> 제출일: ${submittedDate}</div>
                ${fileListHtml}
            </div>`;
        }

        return `
            <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm mb-3 ${opacityClass} transition hover:shadow-md">
                <div class="flex justify-between items-start mb-2">
                    <h4 class="font-bold text-slate-800 text-base leading-snug">${hw.title}</h4>
                    <div class="flex-shrink-0 ml-2">${statusBadge}</div>
                </div>
                <p class="text-xs text-slate-500 mb-3 line-clamp-2">${hw.description || '내용 없음'}</p>
                <div class="flex justify-between items-center text-xs text-slate-400 bg-slate-50 p-2 rounded-lg">
                    <div class="flex items-center gap-1">
                        <span class="material-icons-round text-sm">event</span>
                        마감: <span class="${isPast ? '' : 'text-blue-600 font-bold'}">${hw.dueDate || hw.endDate || '없음'}</span>
                    </div>
                    <div>${hw.pages ? `범위: ${hw.pages}` : ''}</div>
                </div>
                ${submissionInfo}
            </div>
        `;
    },

    // [신규] 전체 다운로드 핸들러
    handleDownloadAll(hwId) {
        const hw = [...this.state.homeworks, ...this.state.pastHomeworks].find(h => h.id === hwId);
        if (!hw || !hw.submissionData) return;
        
        const files = hw.submissionData.files || (hw.submissionData.fileUrl ? [{fileName: '첨부파일', fileUrl: hw.submissionData.fileUrl}] : []);
        
        if (files.length === 0) {
            alert("다운로드할 파일이 없습니다.");
            return;
        }

        if (!confirm(`총 ${files.length}개의 파일을 모두 다운로드하시겠습니까?\n(팝업 차단이 설정되어 있다면 해제해주세요)`)) return;

        // 1초 간격으로 순차 다운로드 실행
        files.forEach((f, index) => {
            setTimeout(() => {
                this.downloadFile(f.fileUrl, f.fileName);
            }, index * 1000); 
        });
    },

    async downloadFile(url, fileName) {
        try {
            console.log(`다운로드 시작: ${fileName}`);
            const response = await fetch(url);
            const blob = await response.blob();
            const link = document.createElement('a');
            
            link.href = window.URL.createObjectURL(blob);
            link.download = fileName; 
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
        } catch (error) {
            console.error('Download failed:', error);
            // 실패 시 조용히 넘어가거나, 필요 시 알림
        }
    },
    
    toggleTab() {},
    closeModal() {},
    openSubmitModal() {},
    submitHomework() {}
};