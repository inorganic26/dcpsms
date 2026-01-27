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
                // 워커 삭제 후 화면을 한 번 새로고침해서 확실하게 반영
                // window.location.reload(); // 무한 루프 위험이 있어 주석 처리함. 필요시 수동 새로고침 권장.
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
    
    console.log("✨ [PWA Cleanup] 정리 작업이 완료되었습니다. 이제 브라우저는 서버에서 최신 파일을 받아옵니다.");
})();

// -----------------------------------------------------------------------------
// 기존 애플리케이션 로직
// -----------------------------------------------------------------------------

import './shared/style.css';

console.log("Portal main.js loaded. Navigation handled by browser (MPA Mode).");