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