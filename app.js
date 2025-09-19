/* ===== PWA 基本 ===== */
const swStatus = document.getElementById('swStatus');
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('./service-worker.js', { scope: './' });
      swStatus.textContent = 'SW 有効';
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        nw?.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            if (confirm('新しい版があります。更新しますか？')) location.reload();
          }
        });
      });
    } catch (e) {
      swStatus.textContent = 'SW 失敗';
      console.warn(e);
    }
  });
} else {
  swStatus.textContent = 'SW 非対応';
}
let deferredPrompt = null;
const installBtn = document.getElementById('installBtn');
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); deferredPrompt = e; installBtn.hidden = false;
});
installBtn?.addEventListener('click', async () => {
  deferredPrompt?.prompt(); await deferredPrompt?.userChoice; deferredPrompt = null; installBtn.hidden = true;
});

/* ===== 共通ユーティリティ ===== */
const $ = (id) => document.getElementById(id);
const num = (el, def=0) => {
  const v = typeof el === 'string' ? $(el).value : el.value;
  const n = Number(v); return Number.isFinite(n) ? n : def;
};
const setText = (id, t) => $(id).textContent = t;
function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

/* ====== ダメージ計算（メイン） ====== */
const LEVEL = 50;
const RANK_MULT = { "-6":2/8,"-5":2/7,"-4":2/6,"-3":2/5,"-2":2/4,"-1":2/3,"0":1,"1":3/2,"2":2,"3":5/2,"4":3,"5":7/2,"6":4 };

function calcStat(base, iv, ev, nature, isHP){
  if(isHP){
    return Math.floor(((2*base + iv + Math.floor(ev/4)) * LEVEL)/100) + LEVEL + 10;
  }else{
    const v = Math.floor(((2*base + iv + Math.floor(ev/4)) * LEVEL)/100) + 5;
    return Math.floor(v * nature);
  }
}
function damageCore(level, power, atk, df){
  const base = Math.floor(level*2/5) + 2;
  const core = Math.floor( (base * power * atk) / Math.max(1, df) );
  return Math.floor(core/50) + 2;
}

// 天候×技タイプの補正（炎/水のみ）
function weatherMoveMultiplier(weather, moveType){
  if(weather === '晴れ' && moveType === 'ほのお') return 1.5;
  if(weather === '晴れ' && moveType === 'みず')   return 0.5;
  if(weather === '雨'   && moveType === 'みず')   return 1.5;
  if(weather === '雨'   && moveType === 'ほのお') return 0.5;
  return 1.0;
}
function choiceItemMultiplier(item, category){
  if(item === 'こだわりハチマキ' && category === '物理') return 1.5;
  if(item === 'こだわりメガネ'   && category === '特殊') return 1.5;
  return 1.0;
}
function lifeOrbMultiplier(item){ return item === 'いのちのたま' ? 1.3 : 1.0; }
function currentAtkStat(category){ return category === '物理' ? num('atkA', 1) : num('atkS', 1); }
function currentDefStat(category){ return category === '物理' ? num('defB', 1) : num('defD', 1); }

// 砂嵐中、特殊で岩タイプの特防1.5（手動トグル）
function sandSpDefBoostOn(category){
  return $('weather').value === '砂嵐' && $('sandRock').value === '1' && category === '特殊';
}
// ★ 雪中、物理で氷タイプの防御1.5（手動トグル）
function snowDefBoostOn(category){
  return $('weather').value === '雪' && $('snowIce').value === '1' && category === '物理';
}

function calcRange(){
  const category = $('category').value;
  const power = num('power', 1);
  const moveType = $('moveType').value;
  const stab = Number($('stab').value);
  const typeMul = Number($('typeMul').value);
  const weather = $('weather').value;
  const status = $('status').value;
  const atkStage = Number($('atkStage').value);
  const defStage = Number($('defStage').value);
  const item = $('item').value;
  const otherMul = num('otherMul', 1.0);

  let atk = currentAtkStat(category);
  let df  = currentDefStat(category);

  // 環境補正で防御側ステータスを変化
  if (sandSpDefBoostOn(category)) df = Math.floor(df * 1.5);
  if (snowDefBoostOn(category))   df = Math.floor(df * 1.5);

  // ランク補正
  const rAtk = RANK_MULT[atkStage];
  const rDef = RANK_MULT[defStage];

  // その他補正
  const burn = (status === 'やけど' && category === '物理') ? 0.5 : 1.0;
  const itemMul = choiceItemMultiplier(item, category) * lifeOrbMultiplier(item);
  const wMul = weatherMoveMultiplier(weather, moveType);

  const core = damageCore(LEVEL, power, Math.floor(atk*rAtk), Math.floor(df*rDef));
  const base = core * stab * typeMul * burn * itemMul * wMul * otherMul;

  const min = Math.floor(base * 0.85);
  const max = Math.floor(base * 1.00);
  return {min, max};
}

function previewDamage(){
  const {min, max} = calcRange();
  const hits = Number($('hits').value);
  const hpMax = num('defHP', 0);
  const totalMin = min * hits;
  const totalMax = max * hits;

  const remainMin = clamp(hpMax - totalMax, 0, hpMax);
  const remainMax = clamp(hpMax - totalMin, 0, hpMax);

  const avg = Math.floor((min+max)/2) || 1;
  const fixed = max>0 ? Math.ceil(hpMax / max) : '—';
  const rnd   = avg>0 ? Math.ceil(hpMax / avg) : '—';

  setText('resultLine', `1発: ${min} ～ ${max}　/　${hits}回合計: ${totalMin} ～ ${totalMax}`);
  const ul = $('resultList');
  ul.innerHTML = '';
  const li1 = document.createElement('li'); li1.textContent = `残りHP（プレビュー）: ${remainMin} ～ ${remainMax}（最大HP ${hpMax})`; ul.appendChild(li1);
  const li2 = document.createElement('li'); li2.textContent = `確定 ${fixed} 発・乱数目安 ${rnd} 発`; ul.appendChild(li2);
}

let defCurHP = 0;
function syncHPBar(){
  const hpMax = num('defHP', 0);
  defCurHP = clamp(defCurHP, 0, hpMax);
  const pct = hpMax>0 ? Math.round(defCurHP/hpMax*100) : 0;
  $('hpFill').style.width = pct + '%';
  setText('hpText', `${defCurHP} / ${hpMax} (${pct}%)`);
}
function resetHP(){
  defCurHP = num('defHP', 0);
  syncHPBar();
  $('log').value = '';
}
function doAttack(){
  const {min, max} = calcRange();
  const roll = Math.floor(Math.random() * (max - min + 1)) + min;
  if(defCurHP <= 0) defCurHP = num('defHP', 0);
  const before = defCurHP;
  defCurHP = clamp(defCurHP - roll, 0, num('defHP', 0));
  syncHPBar();
  $('log').value += `攻撃: ${roll} ダメージ → ${before} → ${defCurHP}\n`;
}

/* ====== 実数値計（計算タブ） ====== */
function runAtkCalc(){
  const target = $('atkCalcTarget').value; // 攻撃 or 特攻
  const base = num('atkBase', 50);
  const iv = num('atkIV', 31);
  const ev = num('atkEV', 0);
  const nature = Number($('atkNature').value);
  const val = calcStat(base, iv, ev, nature, false);
  $('atkCalcOut').textContent = `${target}: ${val}`;
  if(target === '攻撃'){ $('atkA').value = val; } else { $('atkS').value = val; }
}
function copyFromAtkCalc(){}

function runDefCalc(){
  const target = $('defCalcTarget').value; // HP/防御/特防
  const base = num('defBase', 50);
  const iv = num('defIV', 31);
  const ev = num('defEV', 0);
  const nature = Number($('defNature').value);
  const isHP = target === 'HP';
  const val = calcStat(base, iv, ev, isHP ? 1.0 : nature, isHP);
  $('defCalcOut').textContent = `${target}: ${val}`;
  if(target === 'HP'){ $('defHP').value = val; resetHP(); }
  else if(target === '防御'){ $('defB').value = val; }
  else { $('defD').value = val; }
}
function copyFromDefCalc(){}

/* ====== 図鑑検索・アダプタ（pokemon_master.json を変換） ====== */
let DEX = [];        // {no, name, types:[t1,t2], base:{HP,攻撃,防御,特攻,特防,素早}}
let NAME_INDEX = []; // {no, name, norm}

function toNumber(v){
  if (v == null) return null;
  const s = String(v).replace(/[^\d]/g,'');
  return s ? Number(s) : null;
}
function normalizeJP(s){
  return String(s || '')
    .normalize('NFKC')
    .replace(/\s+/g,'')
    .replace(/[ぁ-ん]/g, ch => String.fromCharCode(ch.charCodeAt(0) + 0x60))
    .toLowerCase();
}
async function loadDexFromMaster() {
  const res = await fetch('./pokemon_master.json');
  const src = await res.json();
  DEX = src.map(p => ({
    no: toNumber(p.No),
    name: String(p.名前).trim(),
    types: [p.タイプ1 || null, p.タイプ2 || null],
    base: { HP:p.HP, 攻撃:p.攻撃, 防御:p.防御, 特攻:p.特攻, 特防:p.特防, 素早:p.素早 }
  }));
  NAME_INDEX = DEX.map(d => ({ no:d.no, name:d.name, norm: normalizeJP(d.name) }));

  // datalist へ全名を流し込み
  const dl = $('pkmnlist'); dl.innerHTML = '';
  DEX.forEach(d => { const o=document.createElement('option'); o.value=d.name; dl.appendChild(o); });
}
function findCandidates(q, limit=10){
  const n = normalizeJP(q);
  if (!n) return [];
  const isNum = /^\d+$/.test(q.trim());
  return NAME_INDEX
    .filter(r => isNum ? String(r.no).includes(q.trim()) : r.norm.includes(n))
    .slice(0, limit)
    .map(r => ({ no:r.no, name:r.name }));
}
function pickDexByName(name){ return DEX.find(x => x.name === name) || null; }

/* 図鑑UI */
const dexSg = $('dexSuggest');
$('dexSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim();
  const list = findCandidates(q, 10);
  if (!q || list.length===0){ dexSg.classList.add('hidden'); dexSg.innerHTML=''; return; }
  dexSg.classList.remove('hidden');
  dexSg.innerHTML = list.map(x => `<li data-no="${x.no}">${x.name}</li>`).join('');
});
dexSg.addEventListener('click', (e) => {
  const li = e.target.closest('li'); if(!li) return;
  const name = li.textContent;
  $('dexSearch').value = name; dexSg.classList.add('hidden');
  showDexInfo(name);
});
function showDexInfo(name){
  const d = pickDexByName(name);
  if(!d){ $('dexInfo').textContent = '未選択'; return; }
  $('dexInfo').innerHTML = `
    <div><strong>${d.name}</strong>　タイプ：${d.types.filter(Boolean).join(' / ') || '—'}</div>
    <table>
      <tr><th>HP</th><td>${d.base.HP}</td><th>攻撃</th><td>${d.base.攻撃}</td><th>防御</th><td>${d.base.防御}</td></tr>
      <tr><th>特攻</th><td>${d.base.特攻}</td><th>特防</th><td>${d.base.特防}</td><th>素早</th><td>${d.base.素早}</td></tr>
    </table>
  `;
  $('dexBase').value = d.base[$('dexTarget').value] ?? 100;
}
function runDexCalc(){
  const isHP = $('dexTarget').value === 'HP';
  const val = calcStat(num('dexBase',100), num('dexIV',31), num('dexEV',0), isHP?1.0:Number($('dexNature').value), isHP);
  $('dexOut').textContent = `${$('dexTarget').value}: ${val}`;
}
function applyToCalc(side){
  const m = $('dexOut').textContent.match(/^(HP|攻撃|防御|特攻|特防|素早):\s*(\d+)/);
  if(!m){ alert('先に実数値を計算してください'); return; }
  const stat = m[1], v = Number(m[2]);
  if(side==='atk'){
    if(stat==='攻撃') $('atkA').value = v;
    if(stat==='特攻') $('atkS').value = v;
  }else{
    if(stat==='HP'){ $('defHP').value = v; resetHP(); }
    if(stat==='防御') $('defB').value = v;
    if(stat==='特防') $('defD').value = v;
  }
  alert(`「${stat} = ${v}」を${side==='atk'?'攻撃側':'防御側'}に反映しました`);
}

/* ====== パーティ（6体） 保存/読込 ====== */
const PARTY_KEY = 'pokemon_parties_v1';
const SINGLE_KEY = 'pokemon_singles_v1';

function partyEmpty(){ return { name:'', item:'', moves:['','','',''], memo:'' }; }
function getPartyUI(i){
  return { name:$(`p${i}Name`), item:$(`p${i}Item`),
    m1:$(`p${i}M1`), m2:$(`p${i}M2`), m3:$(`p${i}M3`), m4:$(`p${i}M4`),
    memo:$(`p${i}Memo`), singleName:$(`p${i}SaveName`), singleList:$(`p${i}SingleList`) };
}
function readPartyFromUI(){
  const arr=[]; for(let i=1;i<=6;i++){ const u=getPartyUI(i);
    arr.push({ name:u.name.value.trim(), item:u.item.value.trim(),
      moves:[u.m1.value.trim(),u.m2.value.trim(),u.m3.value.trim(),u.m4.value.trim()],
      memo:u.memo.value.trim() }); }
  return arr;
}
function writePartyToUI(arr){
  for(let i=1;i<=6;i++){ const u=getPartyUI(i), d=arr[i-1]||partyEmpty();
    u.name.value=d.name||''; u.item.value=d.item||'';
    u.m1.value=d.moves?.[0]||''; u.m2.value=d.moves?.[1]||''; u.m3.value=d.moves?.[2]||''; u.m4.value=d.moves?.[3]||'';
    u.memo.value=d.memo||''; }
}
function loadPartiesStore(){ try{return JSON.parse(localStorage.getItem(PARTY_KEY)||'{}');}catch{return{}} }
function savePartiesStore(obj){ localStorage.setItem(PARTY_KEY, JSON.stringify(obj)); refreshPartyList(); }
function refreshPartyList(){ const sel=$('partyList'), store=loadPartiesStore(), keys=Object.keys(store).sort(); sel.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join(''); }
function saveParty(){ const name=$('partySaveName').value.trim()||`party_${new Date().toISOString().slice(0,16).replace('T',' ')}`; const st=loadPartiesStore(); st[name]=readPartyFromUI(); savePartiesStore(st); alert(`保存しました：${name}`); }
function loadParty(){ const k=$('partyList').value; if(!k) return; const st=loadPartiesStore(); if(!st[k]) return; writePartyToUI(st[k]); }
function deleteParty(){ const k=$('partyList').value; if(!k) return; const st=loadPartiesStore(); delete st[k]; savePartiesStore(st); }

/* 個別保存（1体） */
function loadSinglesStore(){ try{return JSON.parse(localStorage.getItem(SINGLE_KEY)||'{}');}catch{return{}} }
function saveSinglesStore(obj){ localStorage.setItem(SINGLE_KEY, JSON.stringify(obj)); }
function saveSingle(i){
  const u=getPartyUI(i), key=(u.singleName.value.trim()||`mon${i}_${Date.now()}`), st=loadSinglesStore();
  st[key]={ name:u.name.value.trim(), item:u.item.value.trim(), moves:[u.m1.value.trim(),u.m2.value.trim(),u.m3.value.trim(),u.m4.value.trim()], memo:u.memo.value.trim() };
  saveSinglesStore(st); alert(`1体保存：${key}`); refreshSinglesListAll();
}
function applySingle(i){
  const u=getPartyUI(i), key=u.singleList.value; if(!key) return; const d=loadSinglesStore()[key]; if(!d) return;
  u.name.value=d.name||''; u.item.value=d.item||''; [u.m1.value,u.m2.value,u.m3.value,u.m4.value]=d.moves||['','','','']; u.memo.value=d.memo||'';
}
function refreshSinglesListAll(){ const st=loadSinglesStore(), keys=Object.keys(st).sort(); for(let i=1;i<=6;i++){ const u=getPartyUI(i); u.singleList.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join(''); } }

/* ====== タブ切替（堅牢版＋復元） ====== */
function switchTab(key){
  document.querySelectorAll('.tab').forEach(b=>{
    b.classList.toggle('active', b.dataset.tab===key);
  });
  $('tab-calc').classList.toggle('hidden', key!=='calc');
  $('tab-dex').classList.toggle('hidden', key!=='dex');
  $('tab-timer').classList.toggle('hidden', key!=='timer');
  localStorage.setItem('activeTab', key);
  window.scrollTo({top:0, behavior:'smooth'});
}
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.tab');
  if(!btn) return;
  e.preventDefault();
  switchTab(btn.dataset.tab);
});

/* ====== タイマー ====== */
let timerMs = 600000;          // 10分
let timerRunning = false;
let timerEndAt = 0;
let timerId = null;

function fmt(ms){
  ms = Math.max(0, ms|0);
  const s = Math.floor(ms/1000);
  const mm = String(Math.floor(s/60)).padStart(2,'0');
  const ss = String(s%60).padStart(2,'0');
  return `${mm}:${ss}`;
}
function drawTimer(){
  const now = Date.now();
  const remain = timerRunning ? Math.max(0, timerEndAt - now) : timerMs;
  $('timerDisplay').textContent = fmt(remain);
  if (timerRunning && remain <= 0){
    stopTimer(false);
    // フィードバック（可能なら振動）
    if (navigator.vibrate) navigator.vibrate([200,100,200]);
    alert('タイマー終了！');
  }
}
function stopTimer(save=true){
  if (timerId){ clearInterval(timerId); timerId = null; }
  timerRunning = false;
  $('timerStartBtn').textContent = '開始';
  if (save) localStorage.setItem('timerMs', String(timerMs));
}
function startTimer(){
  if (timerRunning) return;
  timerRunning = true;
  timerEndAt = Date.now() + timerMs;
  $('timerStartBtn').textContent = '一時停止';
  timerId = setInterval(drawTimer, 200);
}
function toggleTimer(){
  // 入力値反映（停止中のみ）
  if (!timerRunning){
    const m = clamp(num('timerMin',10), 0, 999);
    const s = clamp(num('timerSec',0), 0, 59);
    timerMs = (m*60 + s) * 1000;
  }
  timerRunning ? stopTimer() : startTimer();
}
function resetTimer(){
  stopTimer(false);
  const m = clamp(num('timerMin',10), 0, 999);
  const s = clamp(num('timerSec',0), 0, 59);
  timerMs = (m*60 + s) * 1000;
  drawTimer();
}

/* ====== 初期化 ====== */
(function init(){
  // ランク & 連続回数
  const atkStage=$('atkStage'), defStage=$('defStage'), hits=$('hits');
  for(let i=-6;i<=6;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===0)o.selected=true; atkStage.appendChild(o.cloneNode(true)); defStage.appendChild(o); }
  for(let i=1;i<=10;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===1)o.selected=true; hits.appendChild(o); }

  // HPバー
  defCurHP = num('defHP', 0); syncHPBar();
  $('defHP').addEventListener('input', resetHP);

  // パーティUI
  buildPartyUI(); refreshPartyList();

  // 図鑑読み込み
  loadDexFromMaster().then(()=>{
    $('dexSearch').addEventListener('change', ()=> showDexInfo($('dexSearch').value));
  });

  // タブ復元
  window.addEventListener('DOMContentLoaded', ()=>{
    switchTab(localStorage.getItem('activeTab') || 'calc');
  });

  // タイマー復元＆表示
  const saved = Number(localStorage.getItem('timerMs'));
  if (Number.isFinite(saved) && saved > 0) timerMs = saved;
  $('timerMin').value = Math.floor((timerMs/1000)/60);
  $('timerSec').value = Math.floor((timerMs/1000)%60);
  drawTimer();
})();
