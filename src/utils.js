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