// src/admin/adminReportManager.js
import { reportManager as sharedReportManager } from "../shared/reportManager.js";
import { showToast } from "../shared/utils.js";

export const adminReportManager = {
    app: null,
    elements: {
        reportClassSelect: 'admin-report-class-select',
        reportDateInput: 'admin-report-date',
        reportFilesInput: 'admin-report-files-input',
        uploadReportsBtn: 'admin-upload-reports-btn',
        reportUploadStatus: 'admin-report-upload-status',
        uploadedReportsList: 'admin-uploaded-reports-list'
    },

    init(app) {
        this.app = app;
        this.bindEvents();
    },

    bindEvents() {
        const el = (id) => document.getElementById(this.elements[id]);
        
        el('uploadReportsBtn')?.addEventListener('click', () => this.handleReportUpload());
        el('reportClassSelect')?.addEventListener('change', () => this.loadAndRenderUploadedReports());
        el('reportDateInput')?.addEventListener('change', () => this.loadAndRenderUploadedReports());
    },

    // 뷰 초기화 시 호출
    initView() {
        this.populateReportClassSelect();
        this.loadAndRenderUploadedReports();
    },

    populateReportClassSelect() {
        const sel = document.getElementById(this.elements.reportClassSelect);
        if (!sel) return;
        
        const classes = this.app.state.classes || []; 
        const currentSelection = sel.value;
        
        sel.innerHTML = '<option value="">-- 반 선택 --</option>';
        if (classes.length === 0) {
            sel.innerHTML += '<option value="" disabled>등록된 반 없음</option>';
            return;
        }
        
        classes.forEach((c) =>
            sel.insertAdjacentHTML("beforeend", `<option value="${c.id}">${c.name}</option>`)
        );
        if (classes.some(c => c.id === currentSelection)) {
            sel.value = currentSelection;
        }
    },
    
    async handleReportUpload() {
        const el = (id) => document.getElementById(this.elements[id]);
        const dateInput = el('reportDateInput');
        const filesInput = el('reportFilesInput');
        const statusEl = el('reportUploadStatus');
        const uploadBtn = el('uploadReportsBtn');
        const classSelect = el('reportClassSelect');

        if (!dateInput || !filesInput || !statusEl || !uploadBtn) return;

        const classId = classSelect.value;
        const testDateRaw = dateInput.value;
        const files = filesInput.files;

        if (!classId) { showToast("반 선택 필요"); return; }
        if (!testDateRaw || !files.length) { showToast("날짜/파일 선택 필요"); return; }

        const testDate = testDateRaw.replace(/-/g, '');
        uploadBtn.disabled = true;
        statusEl.innerHTML = `<span class="text-blue-600">업로드 중...</span>`;

        const uploadPromises = [];
        for (const file of files) {
            uploadPromises.push(
                sharedReportManager.uploadReport(file, classId, testDate)
            );
        }

        try {
            await Promise.all(uploadPromises);
            statusEl.innerHTML = `<span class="text-green-600">완료</span>`;
            showToast(`업로드 완료`, false);
            filesInput.value = '';
            await this.loadAndRenderUploadedReports();
        } catch (error) {
            console.error(error);
            statusEl.innerHTML = `<span class="text-red-600">오류 발생</span>`;
            showToast("업로드 오류", true);
        } finally {
            uploadBtn.disabled = false;
        }
    },

    async loadAndRenderUploadedReports() {
        const el = (id) => document.getElementById(this.elements[id]);
        const cls = el('reportClassSelect')?.value;
        const date = el('reportDateInput')?.value;
        const list = el('uploadedReportsList');

        if (!cls || !date || !list) return;

        list.innerHTML = 'Loading...';
        try {
            const yyyymmdd = date.replace(/-/g, "");
            const reports = await sharedReportManager.listReportsForDateAndClass(cls, yyyymmdd);
            
            list.innerHTML = "";
            if (!reports.length) { list.innerHTML = "<div class='text-gray-400 py-2'>업로드된 파일이 없습니다.</div>"; return; }

            const ul = document.createElement("ul");
            ul.className = 'space-y-2 mt-2';
            reports.forEach(r => {
                const li = document.createElement("li");
                li.className = "flex justify-between items-center border p-3 rounded bg-white shadow-sm text-sm";
                li.innerHTML = `
                    <span class="truncate pr-4">${r.fileName}</span> 
                    <div class="flex gap-2 flex-shrink-0">
                        <a href="${r.url}" target="_blank" class="text-blue-500 hover:text-blue-700 font-bold">보기</a>
                        <button class="text-red-500 hover:text-red-700 font-bold del-btn">삭제</button>
                    </div>`;
                
                li.querySelector('.del-btn').addEventListener('click', async () => {
                    if(confirm(`'${r.fileName}' 파일을 삭제하시겠습니까?`)) {
                        const path = `reports/${cls}/${yyyymmdd}/${r.fileName}`;
                        await this.tryDeleteReport(cls, date, r.fileName, path);
                        this.loadAndRenderUploadedReports(); // 목록 갱신
                    }
                });
                ul.appendChild(li);
            });
            list.appendChild(ul);
        } catch (e) {
            console.error(e);
            list.innerHTML = "로딩 실패";
        }
    },

    async tryDeleteReport(classId, dateStr, fileName, primaryPath) {
        // 1차 시도
        let success = await sharedReportManager.deleteReport(primaryPath);
        // 실패 시 레거시 경로 시도
        if (!success) {
             const rootPath = `reports/${classId}/${fileName}`;
             success = await sharedReportManager.deleteReport(rootPath);
        }
        showToast(success ? "삭제됨" : "삭제 실패", !success);
        return success;
    }
};