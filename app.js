
// Service Worker 登録
const swStatus = document.getElementById('swStatus');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
      swStatus.textContent = 'Service Worker: 有効';
      // 新バージョン検知でリロード促し（任意）
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            const ok = confirm('新しいバージョンがあります。更新しますか？');
            if (ok) location.reload();
          }
        });
      });
    } catch (e) {
      swStatus.textContent = 'Service Worker: 失敗';
      console.warn(e);
    }
  });
} else {
  swStatus.textContent = 'Service Worker: 非対応';
}

// 「ホーム画面に追加」ボタン
let deferredPrompt;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice; // accepted / dismissed
  deferredPrompt = null;
  installBtn.hidden = true;
});
