// public/sw.js
const CACHE_NAME = 'dcps-pwa-v1';

// 1. 설치
self.addEventListener('install', (event) => {
    self.skipWaiting();
});

// 2. 활성화
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 3. 요청 가로채기 (수정됨)
self.addEventListener('fetch', (event) => {
    // chrome-extension 등 http/https가 아닌 요청은 건너뜀
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request).then((response) => {
                // 캐시에 있으면 반환, 없으면 에러 대신 '오프라인' 메시지 반환
                return response || new Response("오프라인 상태입니다.", { 
                    status: 503, 
                    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
            });
        })
    );
});