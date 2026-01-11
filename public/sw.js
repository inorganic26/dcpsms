// public/sw.js

// 🔴 [수정됨] 배포할 때마다 버전을 올려주세요 (v2 -> v3)
const CACHE_NAME = 'dcps-pwa-v3-20260110-update';

// 캐싱할 파일 목록
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json'
];

// 1. 설치 (Install)
self.addEventListener('install', (event) => {
    // 대기 없이 바로 새 서비스 워커를 적용
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('캐시 열기 성공');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. 활성화 및 구버전 청소 (Activate)
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    // 현재 버전이 아닌 예전 캐시 데이터는 모두 삭제합니다.
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('구버전 캐시 삭제:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // 클라이언트 제어권 즉시 가져오기
            return self.clients.claim();
        })
    );
});

// 3. 요청 가로채기 (Fetch)
self.addEventListener('fetch', (event) => {
    // http, https 요청이 아니면 건너뜀
    if (!event.request.url.startsWith('http')) return;
    
    // POST 요청 등 데이터 전송은 캐싱하지 않음
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // 네트워크 요청 성공 시: 응답을 그대로 돌려주고, 캐시도 최신화
                if (!response || response.status !== 200 || response.type !== 'basic') {
                    return response;
                }

                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // 네트워크 실패(오프라인) 시: 캐시된 파일 사용
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        // 캐시에도 없다면 오프라인 메시지
                        return new Response("오프라인 상태입니다. 인터넷 연결을 확인해주세요.", {
                            status: 503,
                            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                        });
                    });
            })
    );
});