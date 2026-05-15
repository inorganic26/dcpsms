// src/shared/utils.js

export const showToast = (message, isError = true) => {
    const toast = document.getElementById('toast-notification');
    const toastMessage = document.getElementById('toast-message');
    if (!toast || !toastMessage) return;
    toastMessage.textContent = message;
    toast.style.backgroundColor = isError ? '#ef4444' : '#22c55e';
    toast.classList.remove('opacity-0', 'translate-x-[120%]');
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-x-[120%]');
    }, 3000);
};

export const showLoading = (message = "로딩 중...") => {
    const loadingEl = document.getElementById('student-loading-screen') ||
        document.getElementById('admin-loading-screen') ||
        document.getElementById('teacher-loading-screen');

    if (loadingEl) {
        loadingEl.style.display = 'flex';
        loadingEl.classList.remove('hidden');
    }
};

export const hideLoading = () => {
    const loadingEl = document.getElementById('student-loading-screen') ||
        document.getElementById('admin-loading-screen') ||
        document.getElementById('teacher-loading-screen');
    if (loadingEl) {
        loadingEl.style.display = 'none';
        loadingEl.classList.add('hidden');
    }
};

// 👇 [수정] 다운로드 파일명 지정을 위해 studentName, date 파라미터 추가
export const openImagePreviewModal = (imageUrls, studentName = '이름미상', date = '날짜미상') => {
    if (!imageUrls || imageUrls.length === 0) return;

    let modal = document.getElementById('image-preview-modal');

    // 모달 DOM 생성 (없을 경우)
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-preview-modal';
        modal.className = 'fixed inset-0 z-[9999] bg-black/95 hidden flex flex-col';
        modal.innerHTML = `
            <div class="flex justify-end p-4 absolute top-0 right-0 w-full z-20 bg-gradient-to-b from-black/60 to-transparent">
                <button id="close-preview-btn" class="text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/20 backdrop-blur-md">
                    <span class="material-icons-round text-3xl">close</span>
                </button>
            </div>
            
            <div id="preview-images-container" class="flex-1 overflow-x-hidden overflow-y-auto flex flex-col gap-10 py-10" style="-webkit-overflow-scrolling: touch;">
                </div>
        `;
        document.body.appendChild(modal);

        // 닫기 이벤트
        const closeBtn = document.getElementById('close-preview-btn');
        const closeAction = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = ''; 
        };
        closeBtn.onclick = closeAction;
        modal.onclick = (e) => {
            if (e.target === modal || e.target.id === 'preview-images-container') {
                closeAction();
            }
        };
    }

    const container = document.getElementById('preview-images-container');
    container.innerHTML = '';

    // 이미지 렌더링
    imageUrls.forEach((url, index) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'w-full flex flex-col items-center justify-center px-2 min-h-[80vh] shrink-0';

        const imgBox = document.createElement('div');
        imgBox.className = 'relative max-w-4xl w-full flex flex-col items-center';

        const img = document.createElement('img');
        img.src = url;
        img.className = 'w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-gray-800';
        img.loading = 'lazy';

        // 정보 및 다운로드 버튼 바
        const infoBar = document.createElement('div');
        infoBar.className = 'mt-4 w-full flex justify-between items-center bg-gray-900/80 backdrop-blur-md p-4 rounded-xl text-gray-200';
        
        infoBar.innerHTML = `
            <span class="font-bold text-sm">Image ${index + 1} / ${imageUrls.length}</span>
            <button class="download-btn flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95">
                <span class="material-icons-round text-base">download</span> 저장
            </button>
        `;

        // 다운로드 로직
        const downloadBtn = infoBar.querySelector('.download-btn');
        downloadBtn.onclick = async (e) => {
            e.stopPropagation();
            const originalText = downloadBtn.innerHTML;
            downloadBtn.innerHTML = `<span class="material-icons-round animate-spin text-base">sync</span> 다운 중...`;
            downloadBtn.disabled = true;

            try {
                const response = await fetch(url, { mode: 'cors' });
                if (!response.ok) throw new Error('Network response was not ok');
                
                const blob = await response.blob();
                const blobUrl = window.URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = blobUrl;
                // 👇 [핵심] 다운로드 파일명 형식 적용: 학생이름_날짜_일일테스트_번호.jpg
                a.download = `${studentName}_${date}_일일테스트_${index + 1}.jpg`; 
                document.body.appendChild(a);
                a.click();
                
                document.body.removeChild(a);
                window.URL.revokeObjectURL(blobUrl);
                
                showToast("저장되었습니다.", false);
            } catch (err) {
                console.error("Download failed:", err);
                window.open(url, '_blank');
                showToast("오류: 이미지를 길게 눌러 저장하세요.", true);
            } finally {
                downloadBtn.innerHTML = originalText;
                downloadBtn.disabled = false;
            }
        };

        imgBox.appendChild(img);
        imgBox.appendChild(infoBar);
        wrapper.appendChild(imgBox);
        container.appendChild(wrapper);
    });

    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; 
};