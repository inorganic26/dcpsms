// src/shared/homeworkManager.js

// ✨ 전역 다운로드 함수
window.downloadHomeworkFiles = async (btnElement, filesJson, baseFileName) => {
    // 1. 버튼 상태 저장 (원래 텍스트 복구용)
    const originalHtml = btnElement.innerHTML;
    const originalWidth = btnElement.style.width; // 너비 고정 (덜컹거림 방지)
    btnElement.style.width = `${btnElement.offsetWidth}px`;
    btnElement.disabled = true;

    try {
        const files = JSON.parse(decodeURIComponent(filesJson));
        if (!files || files.length === 0) {
            alert("다운로드할 파일이 없습니다.");
            btnElement.disabled = false;
            return;
        }

        const total = files.length;

        // 2. 다운로드 시작 알림
        btnElement.innerHTML = `<span class="material-icons animate-spin text-[16px]">sync</span> 준비 중...`;

        for (let i = 0; i < total; i++) {
            // 진행 상황 표시 (예: 1/3 다운로드...)
            btnElement.innerHTML = `<span class="material-icons animate-pulse text-[16px]">downloading</span> ${i + 1} / ${total}`;

            const file = files[i];
            const url = file.fileUrl;
            
            // 파일명 생성 (확장자 유지)
            const originalName = file.fileName || "file";
            const extIndex = originalName.lastIndexOf('.');
            const ext = extIndex > -1 ? originalName.substring(extIndex) : '';
            const newFileName = `${baseFileName}_${i + 1}${ext}`;

            try {
                // Blob으로 받아와서 이름 변경 후 다운로드
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = newFileName;
                document.body.appendChild(a);
                a.click();
                
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                
            } catch (e) {
                console.error("다운로드 실패:", e);
                // 실패 시 새 창으로라도 띄워줌
                window.open(url, '_blank');
            }

            // 브라우저 부하 방지용 딜레이
            await new Promise(r => setTimeout(r, 800));
        }

        // 3. 완료 메시지
        btnElement.innerHTML = `<span class="material-icons text-[16px]">check_circle</span> 완료!`;
        btnElement.classList.replace('text-indigo-700', 'text-green-700');
        btnElement.classList.replace('bg-indigo-50', 'bg-green-50');

        // 4. 2초 후 원래 버튼으로 '자동 복귀'
        setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.classList.replace('text-green-700', 'text-indigo-700');
            btnElement.classList.replace('bg-green-50', 'bg-indigo-50');
            btnElement.style.width = originalWidth; // 너비 해제
            btnElement.disabled = false;
        }, 2000);

    } catch (e) {
        console.error(e);
        alert("오류가 발생했습니다. 다시 시도해주세요.");
        // 오류 시 즉시 복구
        btnElement.innerHTML = originalHtml;
        btnElement.disabled = false;
    }
};

export const homeworkManagerHelper = {
    calculateStatus(submission, homework) {
        if (!submission || submission.status !== 'completed') {
            return { text: '미제출', color: 'text-red-500 font-bold' };
        }

        const fileCount = submission.files ? submission.files.length : (submission.fileUrl ? 1 : 0);
        const totalPages = homework.totalPages ? parseInt(homework.totalPages, 10) : 0;

        if (totalPages > 0 && fileCount < totalPages) {
            return { text: `${fileCount} / ${totalPages}`, color: 'text-orange-500 font-bold' };
        }

        return { text: '완료', color: 'text-green-600 font-bold' };
    },

    renderFileButtons(submission, className = "반") {
        if (!submission) return '<span class="text-slate-400">-</span>';
        
        let files = [];
        if (submission.files && Array.isArray(submission.files)) {
            files = submission.files;
        } else if (submission.fileUrl) {
            files = [{ fileUrl: submission.fileUrl, fileName: 'file' }];
        }

        if (files.length === 0) return '<span class="text-slate-400">-</span>';

        let dateStr = "날짜미상";
        if (submission.submittedAt) {
            const d = submission.submittedAt.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dateStr = `${year}${month}${day}`;
        }

        const safeClassName = className.replace(/[^a-zA-Z0-9가-힣]/g, "_");
        const safeStudentName = (submission.studentName || "이름없음").replace(/[^a-zA-Z0-9가-힣]/g, "_");
        const baseFileName = `${dateStr}_${safeClassName}_${safeStudentName}`;

        const filesJson = encodeURIComponent(JSON.stringify(files));

        // ✨ [핵심 수정] this(버튼 자신)를 함수에 전달하여 제어권을 확보함
        return `
            <button onclick="downloadHomeworkFiles(this, '${filesJson}', '${baseFileName}')" 
                class="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition font-bold shadow-sm whitespace-nowrap">
                <span class="material-icons text-[16px]">download</span> 
                다운로드 (${files.length}개)
            </button>
        `;
    }
};