// src/shared/homeworkManager.js

// ✨ 전역 다운로드 함수 (HTML onclick에서 호출하기 위해 window에 등록)
window.downloadHomeworkFiles = async (filesJson, baseFileName) => {
    try {
        const files = JSON.parse(decodeURIComponent(filesJson));
        if (!files || files.length === 0) {
            alert("다운로드할 파일이 없습니다.");
            return;
        }

        let count = 0;
        const total = files.length;

        // 알림 표시 (파일이 많을 경우를 대비)
        const originalText = document.activeElement.innerText;
        document.activeElement.innerText = "다운로드 중...";
        document.activeElement.disabled = true;

        for (let i = 0; i < total; i++) {
            const file = files[i];
            const url = file.fileUrl;
            
            // 원래 파일의 확장자 추출 (예: .jpg, .pdf)
            // 파일명에 점이 없는 경우 대비
            const originalName = file.fileName || "file";
            const extIndex = originalName.lastIndexOf('.');
            const ext = extIndex > -1 ? originalName.substring(extIndex) : '';

            // ✨ 요청하신 파일명 형식: 날짜_반_이름_번호.확장자
            // 파일이 1개라도 번호를 붙여 통일성을 유지하거나, 1개일 땐 번호 생략 가능.
            // 요청: "파일이 여러개면 ... 1,2,3,4" -> 1개일 때도 1 붙이는 게 깔끔하지만, 
            // 보통 1개면 안 붙이기도 함. 여기선 1부터 무조건 붙여서 정렬되게 하겠습니다.
            const newFileName = `${baseFileName}_${i + 1}${ext}`;

            try {
                // 이름을 바꾸려면 fetch로 blob을 받아야 함
                const response = await fetch(url);
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = newFileName;
                document.body.appendChild(a);
                a.click();
                
                // 정리
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                
                count++;
            } catch (e) {
                console.error("다운로드 실패 (CORS 또는 네트워크 문제):", e);
                // 실패 시 원본 링크라도 열어줌
                window.open(url, '_blank');
            }

            // 브라우저가 다운로드를 처리할 시간을 조금 줌 (0.5초)
            await new Promise(r => setTimeout(r, 500));
        }

        document.activeElement.innerText = "완료!";
        setTimeout(() => {
            document.activeElement.innerText = originalText;
            document.activeElement.disabled = false;
        }, 2000);

    } catch (e) {
        console.error(e);
        alert("다운로드 중 오류가 발생했습니다.");
    }
};

export const homeworkManagerHelper = {
    /**
     * 숙제 상태 텍스트와 색상을 계산하는 함수
     */
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

    /**
     * 파일 다운로드 버튼 HTML을 생성하는 함수
     * @param {Object} submission - 학생의 제출 데이터
     * @param {String} className - 반 이름 (파일명 생성용)
     * @returns {String} HTML 문자열
     */
    renderFileButtons(submission, className = "반") {
        if (!submission) return '<span class="text-slate-400">-</span>';
        
        let files = [];
        if (submission.files && Array.isArray(submission.files)) {
            files = submission.files;
        } else if (submission.fileUrl) {
            files = [{ fileUrl: submission.fileUrl, fileName: 'file' }];
        }

        if (files.length === 0) return '<span class="text-slate-400">-</span>';

        // 1. 날짜 포맷팅 (YYYYMMDD)
        let dateStr = "날짜미상";
        if (submission.submittedAt) {
            const d = submission.submittedAt.toDate();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            dateStr = `${year}${month}${day}`;
        }

        // 2. 파일명 베이스: 날짜_반_이름
        // 공백이나 특수문자가 있으면 파일명 오류 날 수 있으므로 _로 치환
        const safeClassName = className.replace(/[^a-zA-Z0-9가-힣]/g, "_");
        const safeStudentName = (submission.studentName || "이름없음").replace(/[^a-zA-Z0-9가-힣]/g, "_");
        const baseFileName = `${dateStr}_${safeClassName}_${safeStudentName}`;

        // 3. 파일 목록을 JSON 문자열로 변환 (onclick에 넣기 위해)
        const filesJson = encodeURIComponent(JSON.stringify(files));

        // ✨ 단일 다운로드 버튼 생성
        return `
            <button onclick="downloadHomeworkFiles('${filesJson}', '${baseFileName}')" 
                class="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 border border-indigo-200 transition font-bold shadow-sm">
                <span class="material-icons text-[16px]">download</span> 
                다운로드 (${files.length}개)
            </button>
        `;
    }
};