// public/sw.js
const CACHE_NAME = 'dcps-pwa-v1';

// 1. 설치 (경비원 출근)
self.addEventListener('install', (event) => {
    self.skipWaiting(); // 대기 없이 바로 작동 시작
});

// 2. 활성화 (경비원 근무 시작)
self.addEventListener('activate', (event) => {
    event.waitUntil(self.clients.claim());
});

// 3. 요청 가로채기 (네트워크 우선 전략)
// 설명: "무조건 인터넷 서버에서 최신 파일을 받아와라. 만약 인터넷이 끊기면 그때만 저장된 걸 보여줘라."
// -> 선생님이 코드를 수정해도 바로바로 반영되니까 '멘붕' 올 일이 없습니다!
self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => {
            return caches.match(event.request);
        })
    );
});