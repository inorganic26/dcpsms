// src/main.js

/**
 * 🚨 [PWA 강제 초기화 스크립트]
 * 홈 화면에 추가된 앱이 구버전(좀비 서비스 워커)에 갇혀 업데이트되지 않는 문제를 해결합니다.
 * 이 코드는 페이지 로드 시 즉시 실행되어 기존 서비스 워커와 캐시를 모두 날려버립니다.
 */
(async function forceCleanupPWA() {
    console.log("🧹 [PWA Cleanup] PWA 정리 작업을 시작합니다...");

    // 1. 등록된 모든 서비스 워커 강제 해제 (Unregister)
    if ('serviceWorker' in navigator) {
        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length > 0) {
                for (const registration of registrations) {
                    await registration.unregister();
                    console.log(`✅ [ServiceWorker] 등록 해제 완료: ${registration.scope}`);
                }
                console.log("✅ [ServiceWorker] 모든 서비스 워커가 제거되었습니다.");
            } else {
                console.log("ℹ️ [ServiceWorker] 등록된 서비스 워커가 없습니다.");
            }
        } catch (error) {
            console.error("❌ [ServiceWorker] 제거 중 오류 발생:", error);
        }
    }

    // 2. 캐시 스토리지(Cache Storage) 강제 삭제
    if ('caches' in window) {
        try {
            const cacheNames = await caches.keys();
            if (cacheNames.length > 0) {
                for (const name of cacheNames) {
                    await caches.delete(name);
                    console.log(`✅ [Cache] 캐시 저장소 삭제 완료: ${name}`);
                }
                console.log("✅ [Cache] 모든 캐시가 삭제되었습니다.");
            }
        } catch (error) {
            console.error("❌ [Cache] 캐시 삭제 실패:", error);
        }
    }

    // 3. [중요] 정리 후 자동 새로고침 (무한 루프 방지 로직 포함)
    // 캐시 삭제 후 깨끗한 상태에서 서버의 최신 파일을 받아오기 위해 1회 강제 새로고침을 수행합니다.
    const PWA_CLEANUP_KEY = 'pwa_cleanup_done_fixed'; 
    
    // 이전에 리로드한 적이 없다면 리로드 실행
    if (!sessionStorage.getItem(PWA_CLEANUP_KEY)) {
        console.log("⚡ [PWA Cleanup] 정리 완료. 최신 버전 반영을 위해 새로고침합니다...");
        
        // 플래그 설정 (새로고침 후에는 이 블록이 실행되지 않음)
        sessionStorage.setItem(PWA_CLEANUP_KEY, 'true');
        
        // 확실한 처리를 위해 약간의 지연 후 리로드
        setTimeout(() => {
            window.location.reload();
        }, 100);
        return; // 리로드가 예정되어 있으므로 이후 코드 실행 중단
    } else {
        console.log("✨ [PWA Cleanup] 이미 정리가 완료된 세션입니다. 정상 진입합니다.");
    }
    
    console.log("✨ [PWA Cleanup] 정리 작업이 완료되었습니다. 이제 브라우저는 서버에서 최신 파일을 받아옵니다.");
})();

// -----------------------------------------------------------------------------
// 기존 애플리케이션 로직
// -----------------------------------------------------------------------------

import './shared/style.css';

console.log("Portal main.js loaded. Navigation handled by browser (MPA Mode).");