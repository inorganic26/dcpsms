// public/sw.js
// 💥 서비스 워커 자폭 코드 (기존 캐시 삭제 및 등록 해제)

self.addEventListener('install', (e) => {
  self.skipWaiting(); // 대기 없이 즉시 활성화
});

self.addEventListener('activate', (e) => {
  // 1. 모든 클라이언트(열린 탭)에게 "새로고침해!"라고 신호 보내기
  self.clients.matchAll().then(clients => {
    clients.forEach(client => client.postMessage({ type: 'RELOAD_PAGE' }));
  });

  // 2. 스스로 등록 해제 (죽기)
  self.registration.unregister()
    .then(() => console.log('✅ Service Worker: 자폭 성공 (Unregistered)'));
});