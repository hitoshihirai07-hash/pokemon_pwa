// 図鑑データ（repoの data/pokemon_master.json or localStorage）
window.DEX = [];

async function loadDexFromRepo() {
  try {
    const r = await fetch('./data/pokemon_master.json', { cache: 'no-store' });
    if (!r.ok) throw new Error('not found');
    const j = await r.json();
    if (Array.isArray(j)) {
      window.DEX = j;
      updateDexBadge();
      document.dispatchEvent(new CustomEvent('dex-ready'));
      return true;
    }
  } catch (_) {}
  return false;
}

function updateDexBadge() {
  const b = document.getElementById('badgeDex');
  if (!b) return;
  const n = Array.isArray(window.DEX) ? window.DEX.length : 0;
  b.textContent = n ? `図鑑: ${n}件` : '図鑑: 未読込';
  b.style.background = n ? '#eef4ff' : '#fff3cd';
  b.style.color = n ? '#2a58b5' : '#8a6d3b';
}

function loadDexFromLocal() {
  const raw = localStorage.getItem('DEX_JSON');
  if (!raw) return false;
  try {
    const j = JSON.parse(raw);
    if (Array.isArray(j)) {
      window.DEX = j;
      updateDexBadge();
      document.dispatchEvent(new CustomEvent('dex-ready'));
      return true;
    }
  } catch (_) {}
  return false;
}

function saveDexToLocal(arr) {
  try { localStorage.setItem('DEX_JSON', JSON.stringify(arr)); } catch (_) {}
}
function clearDexLocal() { localStorage.removeItem('DEX_JSON'); }

function findMon(query) {
  if (!query) return null;
  const s = String(query).trim();
  let hit = window.DEX.find(p => String(p.No) === s || p.名前 === s);
  if (hit) return hit;
  hit = window.DEX.find(p => p.名前 && p.名前.startsWith(s));
  return hit || null;
}

function dexNameList() { return (window.DEX || []).map(p => `${p.No} ${p.名前}`); }

async function initDex() {
  if (loadDexFromLocal()) return;
  if (await loadDexFromRepo()) return;
  updateDexBadge();
  document.dispatchEvent(new CustomEvent('dex-ready'));
}
document.addEventListener('DOMContentLoaded', initDex);

window.__DEX__ = {
  pickAndLoad: () => {
    const input = document.getElementById('dexFilePicker');
    if (!input) return;
    input.value = '';
    input.onchange = async () => {
      const f = input.files && input.files[0];
      if (!f) return;
      try {
        const txt = await f.text();
        const j = JSON.parse(txt);
        if (!Array.isArray(j)) throw new Error('配列JSONではありません');
        window.DEX = j;
        saveDexToLocal(j);
        updateDexBadge();
        document.dispatchEvent(new CustomEvent('dex-ready'));
        alert(`図鑑を読み込みました：${j.length}件`);
      } catch (_) {
        alert('図鑑JSONの読み込みに失敗しました。形式をご確認ください。');
      }
    };
    input.click();
  },
  clearLocal: () => {
    clearDexLocal();
    window.DEX = [];
    updateDexBadge();
    document.dispatchEvent(new CustomEvent('dex-ready'));
    alert('図鑑のローカル保存を削除しました。');
  },
  findMon
};
