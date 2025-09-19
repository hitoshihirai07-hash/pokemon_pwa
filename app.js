/* ===== PWA 基本（そのまま） ===== */
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

/* ===== ダメージ計算（最小実装） ===== */
const LEVEL = 50;
const RANK_MULT = { "-6":2/8,"-5":2/7,"-4":2/6,"-3":2/5,"-2":2/4,"-1":2/3,"0":1,"1":3/2,"2":2,"3":5/2,"4":3,"5":7/2,"6":4 };

const $ = (id) => document.getElementById(id);
const num = (el, def=0) => {
  const v = typeof el === 'string' ? $(el).value : el.value;
  const n = Number(v); return Number.isFinite(n) ? n : def;
};
const setText = (id, t) => $(id).textContent = t;

function clamp(n, lo, hi){ return Math.max(lo, Math.min(hi, n)); }

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
function weatherMoveMultiplier(weather, moveType){
  if(weather === '晴れ' && moveType === '炎') return 1.5;
  if(weather === '晴れ' && moveType === '水') return 0.5;
  if(weather === '雨' && moveType === '水') return 1.5;
  if(weather === '雨' && moveType === '炎') return 0.5;
  return 1.0;
}
function choiceItemMultiplier(item, category){
  if(item === 'こだわりハチマキ' && category === '物理') return 1.5;
  if(item === 'こだわりメガネ'   && category === '特殊') return 1.5;
  return 1.0;
}
function lifeOrbMultiplier(item){ return item === 'いのちのたま' ? 1.3 : 1.0; }

function currentAtkStat(category){
  return category === '物理' ? num('atkA', 1) : num('atkS', 1);
}
function currentDefStat(category){
  return category === '物理' ? num('defB', 1) : num('defD', 1);
}

function sandSpDefBoostOn(category){
  return $('weather').value === '砂嵐' && $('sandRock').value === '1' && category === '特殊';
}

function calcRange(){
  // 入力
  const category = $('category').value;
  const power = num('power', 1);
  const stab = Number($('stab').value);
  const typeMul = Number($('typeMul').value);
  const weather = $('weather').value;
  const status = $('status').value;
  const atkStage = Number($('atkStage').value);
  const defStage = Number($('defStage').value);
  const item = $('item').value;

  let atk = currentAtkStat(category);
  let df  = currentDefStat(category);
  if(sandSpDefBoostOn(category)) df = Math.floor(df * 1.5);

  // ランク
  const rAtk = RANK_MULT[atkStage];
  const rDef = RANK_MULT[defStage];

  // その他補正
  const burn = (status === 'やけど' && category === '物理') ? 0.5 : 1.0;
  const itemMul = choiceItemMultiplier(item, category) * lifeOrbMultiplier(item);
  const wMul = weatherMoveMultiplier(weather, (/*技タイプは簡略*/ typeMul>=1 ? '水' : '炎')); // ※必要なら技タイプ入力に差し替え可

  const core = damageCore(LEVEL, power, Math.floor(atk*rAtk), Math.floor(df*rDef));
  const base = core * stab * typeMul * burn * itemMul * wMul;

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

  // HPは減らさずプレビュー
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

  const line = `攻撃: ${roll} ダメージ → ${before} → ${defCurHP}`;
  $('log').value += line + '\n';
}

/* 実数値計：攻撃側 */
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
function copyFromAtkCalc(which){
  // which: 'A' or 'S' → 何もしない（実数値計で直接反映済）
}

/* 実数値計：防御側 */
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
function copyFromDefCalc(){
  // 実数値計で直接反映済
}

/* 初期化 */
(function init(){
  // ランク & 連続回数
  const atkStage = $('atkStage'), defStage = $('defStage'), hits=$('hits');
  for(let i=-6;i<=6;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===0)o.selected=true; atkStage.appendChild(o.cloneNode(true)); defStage.appendChild(o); }
  for(let i=1;i<=10;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===1)o.selected=true; hits.appendChild(o); }

  // HPバー
  defCurHP = num('defHP', 0); syncHPBar();

  // 入力変更で即HP再計算（HP欄だけ）
  $('defHP').addEventListener('input', resetHP);
})();
