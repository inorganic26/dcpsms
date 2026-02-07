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

// ✨ [추가] 로딩 인디케이터를 표시하는 함수 (studentApp.js에서 사용됨)
export const showLoading = (message = "로딩 중...") => {
    const loadingEl = document.getElementById('student-loading-screen') ||
        document.getElementById('admin-loading-screen') ||
        document.getElementById('teacher-loading-screen');

    if (loadingEl) {
        // studentApp의 loading screen은 메세지 영역이 없어 간략화
        // const messageEl = loadingEl.querySelector('.loading-message');
        // if (messageEl) messageEl.textContent = message;
        loadingEl.style.display = 'flex';
        loadingEl.classList.remove('hidden');
    }
};

// ✨ [추가] 로딩 인디케이터를 숨기는 함수
export const hideLoading = () => {
    const loadingEl = document.getElementById('student-loading-screen') ||
        document.getElementById('admin-loading-screen') ||
        document.getElementById('teacher-loading-screen');
    if (loadingEl) {
        loadingEl.style.display = 'none';
        loadingEl.classList.add('hidden');
    }
};

// ✨ [수정] 이미지 미리보기 모달 - 한 번에 하나씩, 좌우 버튼으로 넘기기
export const openImagePreviewModal = (imageUrls) => {
    if (!imageUrls || imageUrls.length === 0) return;

    let currentIndex = 0;
    let modal = document.getElementById('image-preview-modal');

    // 모달이 없으면 생성
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-preview-modal';
        modal.className = 'fixed inset-0 z-[9999] bg-black/95 hidden';
        modal.innerHTML = `
            <div class="relative w-full h-full flex items-center justify-center">
                <!-- 닫기 버튼 -->
                <button id="close-preview-btn" class="absolute top-4 right-4 z-50 text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/30 backdrop-blur-sm">
                    <span class="material-icons-round text-3xl">close</span>
                </button>
                
                <!-- 이미지 컨테이너 -->
                <div id="preview-image-container" class="w-full h-full flex items-center justify-center p-8">
                    <!-- 이미지가 여기에 표시됨 -->
                </div>
                
                <!-- 이전 버튼 -->
                <button id="prev-image-btn" class="absolute left-4 top-1/2 -translate-y-1/2 z-40 text-white hover:text-gray-300 transition-colors p-3 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70">
                    <span class="material-icons-round text-4xl">chevron_left</span>
                </button>
                
                <!-- 다음 버튼 -->
                <button id="next-image-btn" class="absolute right-4 top-1/2 -translate-y-1/2 z-40 text-white hover:text-gray-300 transition-colors p-3 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70">
                    <span class="material-icons-round text-4xl">chevron_right</span>
                </button>
                
                <!-- 페이지 정보 및 다운로드 -->
                <div id="preview-info-bar" class="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 p-3 bg-gray-900/90 backdrop-blur-sm rounded-lg flex items-center gap-4 text-sm text-gray-300">
                    <span id="preview-page-info" class="font-semibold"></span>
                    <a id="preview-download-btn" href="#" target="_blank" download class="hover:text-white flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors">
                        <span class="material-icons-round text-sm">download</span> 원본 저장
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // 닫기 버튼
        document.getElementById('close-preview-btn').onclick = () => {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        };

        // 배경 클릭 시 닫기
        modal.onclick = (e) => {
            if (e.target === modal || e.target.id === 'preview-image-container') {
                modal.classList.add('hidden');
                document.body.style.overflow = '';
            }
        };

        // 이전 버튼
        document.getElementById('prev-image-btn').onclick = (e) => {
            e.stopPropagation();
            if (currentIndex > 0) {
                currentIndex--;
                showImage(currentIndex);
            }
        };

        // 다음 버튼
        document.getElementById('next-image-btn').onclick = (e) => {
            e.stopPropagation();
            if (currentIndex < imageUrls.length - 1) {
                currentIndex++;
                showImage(currentIndex);
            }
        };

        // 키보드 네비게이션
        document.addEventListener('keydown', (e) => {
            if (!modal.classList.contains('hidden')) {
                if (e.key === 'ArrowLeft' && currentIndex > 0) {
                    currentIndex--;
                    showImage(currentIndex);
                } else if (e.key === 'ArrowRight' && currentIndex < imageUrls.length - 1) {
                    currentIndex++;
                    showImage(currentIndex);
                } else if (e.key === 'Escape') {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            }
        });
    }

    // 이미지 표시 함수
    function showImage(index) {
        const container = document.getElementById('preview-image-container');
        const pageInfo = document.getElementById('preview-page-info');
        const downloadBtn = document.getElementById('preview-download-btn');
        const prevBtn = document.getElementById('prev-image-btn');
        const nextBtn = document.getElementById('next-image-btn');

        // 이미지 렌더링
        container.innerHTML = `
            <img src="${imageUrls[index]}" 
                 style="max-width: 90vw; max-height: 85vh; width: auto; height: auto; object-fit: contain;" 
                 class="rounded-lg shadow-2xl">
        `;

        // 페이지 정보 업데이트
        pageInfo.textContent = `이미지 ${index + 1} / ${imageUrls.length}`;
        downloadBtn.href = imageUrls[index];

        // 버튼 활성화/비활성화
        prevBtn.style.opacity = index === 0 ? '0.3' : '1';
        prevBtn.style.cursor = index === 0 ? 'not-allowed' : 'pointer';
        nextBtn.style.opacity = index === imageUrls.length - 1 ? '0.3' : '1';
        nextBtn.style.cursor = index === imageUrls.length - 1 ? 'not-allowed' : 'pointer';
    }

    export const openImagePreviewModal = (imageUrls) => {
        let modal = document.getElementById('image-preview-modal');

        // 모달이 없으면 생성
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'image-preview-modal';
            modal.className = 'fixed inset-0 z-[9999] bg-black/95 hidden flex flex-col';
            modal.innerHTML = `
            <div class="flex justify-end p-4 absolute top-0 right-0 w-full z-10 bg-gradient-to-b from-black/50 to-transparent">
                <button id="close-preview-btn" class="text-white hover:text-gray-300 transition-colors p-2 rounded-full bg-black/30 backdrop-blur-sm">
                    <span class="material-icons-round text-3xl">close</span>
                </button>
            </div>
            <div id="preview-images-container" class="flex-1 overflow-y-auto overflow-x-hidden" style="scroll-snap-type: y mandatory;">
                <!-- images injected here -->
            </div>
        `;
            document.body.appendChild(modal);

            // 닫기 버튼 이벤트
            document.getElementById('close-preview-btn').onclick = () => {
                modal.classList.add('hidden');
                document.body.style.overflow = ''; // 스크롤 복구
            };

            // 배경 클릭 시 닫기 (컨테이너 자체는 클릭해도 안 닫히게 주의해야 하지만, 
            // 여기서는 이미지가 꽉 차있을 수 있으므로 닫기 버튼을 명확히 사용하도록 유도하거나 배경 클릭 처리)
            modal.onclick = (e) => {
                if (e.target === modal || e.target.id === 'preview-images-container') {
                    modal.classList.add('hidden');
                    document.body.style.overflow = '';
                }
            };
        }

        const container = document.getElementById('preview-images-container');
        container.innerHTML = '';

        if (!imageUrls || imageUrls.length === 0) return;

        imageUrls.forEach((url, index) => {
            // 각 이미지를 담는 wrapper - 전체 화면 높이를 차지하고 스크롤 스냅 적용
            const wrapper = document.createElement('div');
            wrapper.style.scrollSnapAlign = 'start'; // 스크롤 시 이 위치에 스냅
            wrapper.style.scrollSnapStop = 'always'; // 항상 이 위치에서 멈춤
            wrapper.style.height = '100vh'; // 전체 화면 높이
            wrapper.className = 'flex flex-col items-center justify-center w-full px-4';

            // 이미지 컨테이너
            const imageContainer = document.createElement('div');
            imageContainer.className = 'flex flex-col items-center justify-center h-full w-full';

            // 이미지
            const img = document.createElement('img');
            img.src = url;
            img.style.maxHeight = '85vh'; // 정보 바 공간 확보
            img.style.maxWidth = '90vw';
            img.style.width = 'auto';
            img.style.height = 'auto';
            img.style.objectFit = 'contain';
            img.className = 'rounded-lg shadow-2xl';
            img.loading = 'lazy';

            // 하단 정보 바
            const actions = document.createElement('div');
            actions.className = 'mt-4 p-3 bg-gray-900/90 backdrop-blur-sm flex justify-between items-center text-sm text-gray-300 rounded-lg w-full max-w-2xl';
            actions.innerHTML = `<span class="font-semibold">이미지 ${index + 1} / ${imageUrls.length}</span> <a href="${url}" target="_blank" download class="hover:text-white flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 px-3 py-2 rounded-md transition-colors"><span class="material-icons-round text-sm">download</span> 원본 저장</a>`;

            imageContainer.appendChild(img);
            imageContainer.appendChild(actions);
            wrapper.appendChild(imageContainer);
            container.appendChild(wrapper);
        });

        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // 배경 스크롤 방지
    };