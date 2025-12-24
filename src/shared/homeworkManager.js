// src/shared/homeworkManager.js

// ✨ 전역 다운로드 함수
window.downloadHomeworkFiles = async (btnElement, filesJson, baseFileName) => {
    // 1. 버튼 상태 저장 (원래 텍스트 복구용)
    const originalHtml = btnElement.innerHTML;
    const originalWidth = btnElement.style.width; 
    btnElement.style.width = `${btnElement.offsetWidth}px`;
    btnElement.disabled = true;

    // 성공 시 UI 처리 함수 (중복 방지용)
    const showSuccessUI = () => {
        btnElement.innerHTML = `<span class="material-icons text-[16px]">check_circle</span> 완료!`;
        btnElement.classList.replace('text-indigo-700', 'text-green-700');
        btnElement.classList.replace('bg-indigo-50', 'bg-green-50');

        setTimeout(() => {
            btnElement.innerHTML = originalHtml;
            btnElement.classList.replace('text-green-700', 'text-indigo-700');
            btnElement.classList.replace('bg-green-50', 'bg-indigo-50');
            btnElement.style.width = originalWidth; 
            btnElement.disabled = false;
        }, 2000);
    };

    try {
        const files = JSON.parse(decodeURIComponent(filesJson));
        if (!files || files.length === 0) {
            alert("다운로드할 파일이 없습니다.");
            btnElement.disabled = false;
            return;
        }

        const total = files.length;

        // ✨ [신규 기능] 폴더 선택 API 시도 (Chrome/Edge PC 전용)
        if ('showDirectoryPicker' in window) {
            try {
                // 폴더 선택 팝업 띄우기
                const dirHandle = await window.showDirectoryPicker();
                
                btnElement.innerHTML = `<span class="material-icons animate-spin text-[16px]">sync</span> 저장 중...`;

                for (let i = 0; i < total; i++) {
                    btnElement.innerHTML = `<span class="material-icons animate-pulse text-[16px]">downloading</span> ${i + 1} / ${total}`;
                    
                    const file = files[i];
                    const url = file.fileUrl;
                    
                    // 파일명 생성
                    const originalName = file.fileName || "file";
                    const extIndex = originalName.lastIndexOf('.');
                    const ext = extIndex > -1 ? originalName.substring(extIndex) : '';
                    const newFileName = `${baseFileName}_${i + 1}${ext}`;

                    // 파일 데이터 가져오기
                    const response = await fetch(url);
                    const blob = await response.blob();

                    // 선택한 폴더에 파일 생성 및 쓰기
                    const fileHandle = await dirHandle.getFileHandle(newFileName, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(blob);
                    await writable.close();
                    
                    // 딜레이 (UI 갱신용)
                    await new Promise(r => setTimeout(r, 100));
                }

                showSuccessUI();
                return; // 폴더 저장 성공 시 여기서 종료

            } catch (err) {
                // 사용자가 '취소'를 눌렀을 때는 조용히 복귀
                if (err.name === 'AbortError') {
                    btnElement.innerHTML = originalHtml;
                    btnElement.style.width = originalWidth;
                    btnElement.disabled = false;
                    return;
                }
                // 그 외 오류(권한 거부 등)는 콘솔에 찍고 기존 방식으로 폴백
                console.warn("폴더 저장 실패, 일반 다운로드로 전환:", err);
            }
        }

        // ==========================================
        // [기존 방식] 폴더 선택 미지원 브라우저용 Fallback
        // ==========================================
        btnElement.innerHTML = `<span class="material-icons animate-spin text-[16px]">sync</span> 준비 중...`;

        for (let i = 0; i < total; i++) {
            btnElement.innerHTML = `<span class="material-icons animate-pulse text-[16px]">downloading</span> ${i + 1} / ${total}`;

            const file = files[i];
            const url = file.fileUrl;
            
            const originalName = file.fileName || "file";
            const extIndex = originalName.lastIndexOf('.');
            const ext = extIndex > -1 ? originalName.substring(extIndex) : '';
            const newFileName = `${baseFileName}_${i + 1}${ext}`;

            try {
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
                window.open(url, '_blank');
            }

            await new Promise(r => setTimeout(r, 800));
        }

        showSuccessUI();

    } catch (e) {
        console.error(e);
        alert("오류가 발생했습니다.");
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

        // 파일명: 날짜_반_이름 (특수문자 제거)
        const safeClassName = className.replace(/[^a-zA-Z0-9가-힣]/g, "_");
        const safeStudentName = (submission.studentName || "이름없음").replace(/[^a-zA-Z0-9가-힣]/g, "_");
        const baseFileName = `${dateStr}_${safeClassName}_${safeStudentName}`;

        const filesJson = encodeURIComponent(JSON.stringify(files));

        // 단일 다운로드 버튼
        return `
            <button onclick="downloadHomeworkFiles(this, '${filesJson}', '${baseFileName}')" 
                class="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition font-bold shadow-sm whitespace-nowrap">
                <span class="material-icons text-[16px]">download</span> 
                다운로드 (${files.length}개)
            </button>
        `;
    }
};