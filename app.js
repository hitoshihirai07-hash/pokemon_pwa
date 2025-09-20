/* ===== バージョン & PWA ===== */
const APP_VER = '2025-09-20-full';
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

/* ===== util ===== */
const $ = (id) => document.getElementById(id);
const num = (el, def=0) => { const v = typeof el === 'string' ? $(el).value : el.value; const n = Number(v); return Number.isFinite(n) ? n : def; };
const setText = (id, t) => $(id).textContent = t;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const LEVEL = 50;
const RANK_MULT = { "-6":2/8,"-5":2/7,"-4":2/6,"-3":2/5,"-2":2/4,"-1":2/3,"0":1,"1":3/2,"2":2,"3":5/2,"4":3,"5":7/2,"6":4 };

/* ===== 実数値/ダメージ ===== */
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

/* ====== 計算タブ ====== */
function currentAtkStat(category){ return category === '物理' ? num('atkA', 1) : num('atkS', 1); }
function currentDefStat(category){ return category === '物理' ? num('defB', 1) : num('defD', 1); }
function sandSpDefBoostOn(category){ return $('weather').value === '砂嵐' && $('sandRock').value === '1' && category === '特殊'; }
function snowDefBoostOn(category){ return $('weather').value === '雪' && $('snowIce').value === '1' && category === '物理'; }

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
  if (sandSpDefBoostOn(category)) df = Math.floor(df * 1.5);
  if (snowDefBoostOn(category))   df = Math.floor(df * 1.5);

  const rAtk = RANK_MULT[atkStage];
  const rDef = RANK_MULT[defStage];
  const burn = (status === 'やけど' && category === '物理') ? 0.5 : 1.0;
  const itemMul = choiceItemMultiplier(item, category) * lifeOrbMultiplier(item);
  const wMul = weatherMoveMultiplier(weather, moveType);

  const core = damageCore(LEVEL, power, Math.floor(atk*rAtk), Math.floor(df*rDef));
  const base = core * stab * typeMul * burn * itemMul * wMul * otherMul;
  const min = Math.floor(base * 0.85), max = Math.floor(base * 1.00);
  return {min, max};
}

let defCurHP = 0;
function syncHPBar(){
  const hpMax = num('defHP', 0);
  defCurHP = clamp(defCurHP, 0, hpMax);
  const pct = hpMax>0 ? Math.round(defCurHP/hpMax*100) : 0;
  $('hpFill').style.width = pct + '%';
  setText('hpText', `${defCurHP} / ${hpMax} (${pct}%)`);
}
function resetHP(){ defCurHP = num('defHP', 0); syncHPBar(); $('log').value = ''; }
function doAttack(){
  const {min, max} = calcRange();
  const roll = Math.floor(Math.random() * (max - min + 1)) + min;
  if(defCurHP <= 0) defCurHP = num('defHP', 0);
  const before = defCurHP;
  defCurHP = clamp(defCurHP - roll, 0, num('defHP', 0));
  syncHPBar();
  $('log').value += `攻撃: ${roll} ダメージ → ${before} → ${defCurHP}\n`;
}
function previewDamage(){
  const {min, max} = calcRange();
  const hits = Number($('hits').value);
  const hpMax = num('defHP', 0);
  const totalMin = min * hits, totalMax = max * hits;
  const remainMin = clamp(hpMax - totalMax, 0, hpMax), remainMax = clamp(hpMax - totalMin, 0, hpMax);
  const avg = Math.floor((min+max)/2) || 1;
  const fixed = max>0 ? Math.ceil(hpMax / max) : '—';
  const rnd   = avg>0 ? Math.ceil(hpMax / avg) : '—';
  setText('resultLine', `1発: ${min} ～ ${max}　/　${hits}回合計: ${totalMin} ～ ${totalMax}`);
  const ul = $('resultList'); ul.innerHTML = '';
  const li1 = document.createElement('li'); li1.textContent = `残りHP（プレビュー）: ${remainMin} ～ ${remainMax}（最大HP ${hpMax})`; ul.appendChild(li1);
  const li2 = document.createElement('li'); li2.textContent = `確定 ${fixed} 発・乱数目安 ${rnd} 発`; ul.appendChild(li2);
}

/* 実数値計（計算タブ） */
function runAtkCalc(){
  const target = $('atkCalcTarget').value;
  const val = calcStat(num('atkBase',50), num('atkIV',31), num('atkEV',0), Number($('atkNature').value), false);
  $('atkCalcOut').textContent = `${target}: ${val}`;
  if(target === '攻撃'){ $('atkA').value = val; } else { $('atkS').value = val; }
}
function copyFromAtkCalc(kind){
  const m = $('atkCalcOut').textContent.match(/(攻撃|特攻):\s*(\d+)/);
  if(!m){ alert('先に攻撃側の実数値計で計算してください'); return; }
  const val = Number(m[2]);
  if(kind==='A'){ $('atkA').value = val; } else { $('atkS').value = val; }
}
function runDefCalc(){
  const target = $('defCalcTarget').value, isHP = target==='HP';
  const val = calcStat(num('defBase',50), num('defIV',31), num('defEV',0), isHP?1.0:Number($('defNature').value), isHP);
  $('defCalcOut').textContent = `${target}: ${val}`;
  if(target === 'HP'){ $('defHP').value = val; resetHP(); }
  else if(target === '防御'){ $('defB').value = val; }
  else { $('defD').value = val; }
}
function copyFromDefCalc(kind){
  const m = $('defCalcOut').textContent.match(/(HP|防御|特防):\s*(\d+)/);
  if(!m){ alert('先に防御側の実数値計で計算してください'); return; }
  const stat = m[1], val = Number(m[2]);
  if(kind==='HP' || stat==='HP'){ $('defHP').value = val; resetHP(); }
  else if(kind==='B' || stat==='防御'){ $('defB').value = val; }
  else { $('defD').value = val; }
}

/* ===== 1対3: 計算ロジック ===== */
const mState = { curHP:[0,0,0] };
function mAtkStat(){ return $('mCategory').value==='物理' ? num('mAtkA',1) : num('mAtkS',1); }
function mDefStat(i){ return $('mCategory').value==='物理' ? num(`d${i}B`,1) : num(`d${i}D`,1); }
function mWeatherMul(){ return weatherMoveMultiplier($('mWeather').value, $('mMoveType').value); }
function mItemMul(){ return choiceItemMultiplier($('mItem').value, $('mCategory').value) * lifeOrbMultiplier($('mItem').value); }
function mBurnMul(){ return ($('mStatus').value==='やけど' && $('mCategory').value==='物理') ? 0.5 : 1.0; }
function mRankAtk(){ return RANK_MULT[Number($('mAtkStage').value)]; }
function mRankDef(i){ return RANK_MULT[Number($(`d${i}DefStage`).value)]; }
function mSnowBoost(i){ return ($('mWeather').value==='雪' && $(`d${i}SnowIce`).value==='1' && $('mCategory').value==='物理') ? 1.5 : 1.0; }
function mSandBoost(i){ return ($('mWeather').value==='砂嵐' && $(`d${i}SandRock`).value==='1' && $('mCategory').value==='特殊') ? 1.5 : 1.0; }

function mRange(i){
  const power = num('mPower',1);
  const stab  = Number($('mStab').value);
  const typeMul = Number($(`d${i}TypeMul`).value);
  let atk = mAtkStat();
  let df  = Math.floor(mDefStat(i) * mSnowBoost(i) * mSandBoost(i));
  const core = damageCore(LEVEL, power, Math.floor(atk*mRankAtk()), Math.floor(df*mRankDef(i)));
  const base = core * stab * typeMul * mBurnMul() * mItemMul() * mWeatherMul() * num('mOtherMul',1.0);
  const min = Math.floor(base*0.85), max = Math.floor(base*1.0);
  return {min, max};
}
function mSyncHP(i){
  const hpMax = num(`d${i}HP`,0);
  mState.curHP[i-1] = clamp(mState.curHP[i-1], 0, hpMax);
  const pct = hpMax>0 ? Math.round(mState.curHP[i-1]/hpMax*100) : 0;
  $(`d${i}HpFill`).style.width = pct + '%';
  setText(`d${i}HpText`, `${mState.curHP[i-1]} / ${hpMax} (${pct}%)`);
}
function mResetOne(i){ mState.curHP[i-1] = num(`d${i}HP`,0); mSyncHP(i); }
function mAttackOne(i){
  const {min,max}=mRange(i);
  const roll = Math.floor(Math.random()*(max-min+1))+min;
  if(mState.curHP[i-1]<=0) mResetOne(i);
  const before = mState.curHP[i-1];
  mState.curHP[i-1]=clamp(before-roll,0,num(`d${i}HP`,0));
  mSyncHP(i);
  const name = $(`d${i}Name`).value || `相手${i}`;
  $('mLog').value += `[${name}] 攻撃: ${roll} → ${before}→${mState.curHP[i-1]}\n`;
}
function mPreviewOne(i){
  const {min,max}=mRange(i);
  const hits = Number($('mHits').value), hpMax=num(`d${i}HP`,0);
  const totalMin=min*hits,totalMax=max*hits;
  const remainMin=clamp(hpMax-totalMax,0,hpMax), remainMax=clamp(hpMax-totalMin,0,hpMax);
  const avg = Math.floor((min+max)/2)||1;
  const fixed = max>0?Math.ceil(hpMax/max):'—';
  const rnd   = avg>0?Math.ceil(hpMax/avg):'—';
  $(`d${i}Result`).textContent = `1発:${min}～${max} / ${hits}回:${totalMin}～${totalMax} / 残:${remainMin}～${remainMax} / 確定${fixed}発・乱数${rnd}発`;
}
function mPreviewAll(){ [1,2,3].forEach(mPreviewOne); }
function mAttackAll(){ [1,2,3].forEach(mAttackOne); }
function mResetAll(){ [1,2,3].forEach(mResetOne); $('mLog').value=''; }
function mCopyAtk(kind){ if(kind==='A') $('mAtkA').value = num('atkA',200); else $('mAtkS').value = num('atkS',200); }

/* 1対3：実数値計 */
function mRunAtkCalc(){
  const target = $('mAtkCalcTarget').value;
  const base = num('mAtkBase',50), iv = num('mAtkIV',31), ev = num('mAtkEV',0);
  const nature = Number($('mAtkNature').value);
  const val = calcStat(base, iv, ev, nature, false);
  $('mAtkCalcOut').textContent = `${target}: ${val}`;
  if(target === '攻撃'){ $('mAtkA').value = val; } else { $('mAtkS').value = val; }
}
function mRunDefCalc(i){
  const target = $(`d${i}CalcTarget`).value, isHP = target==='HP';
  const base = num(`d${i}Base`,50), iv = num(`d${i}IV`,31), ev = num(`d${i}EV`,0);
  const nature = isHP ? 1.0 : Number($(`d${i}Nature`).value);
  const val = calcStat(base, iv, ev, nature, isHP);
  $(`d${i}CalcOut`).textContent = `${target}: ${val}`;
  if(isHP){ $(`d${i}HP`).value = val; mResetOne(i); }
  else if(target==='防御'){ $(`d${i}B`).value = val; }
  else { $(`d${i}D`).value = val; }
}

/* ===== 図鑑/検索 ===== */
let DEX = [];        // {no,name,types:[t1,t2],base:{HP,攻撃,防御,特攻,特防,素早}}
let NAME_INDEX = []; // {no,name,norm}
function toNumber(v){ if(v==null) return null; const s=String(v).replace(/[^\d]/g,''); return s?Number(s):null; }
function normalizeJP(s){ return String(s||'').normalize('NFKC').replace(/\s+/g,'').replace(/[ぁ-ん]/g,ch=>String.fromCharCode(ch.charCodeAt(0)+0x60)).toLowerCase(); }
// JSONキー揺れ吸収
function pick(p, keys, def=null){ for(const k of keys){ if(p[k] != null) return p[k]; } return def; }

async function loadDexFromMaster() {
  try {
    const res = await fetch('./pokemon_master.json?ver=' + APP_VER, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const src = await res.json();

    DEX = src.map(p => {
      const no = toNumber(p.No ?? p.no ?? p.dex ?? p.Dex);
      const name = String(p.名前 ?? p.name ?? '').trim();
      const base = {
        HP:  pick(p, ['HP','hp']),
        攻撃: pick(p, ['攻撃','こうげき','攻','A','a']),
        防御: pick(p, ['防御','ぼうぎょ','防','B','b']),
        特攻: pick(p, ['特攻','とくこう','C','c']),
        特防: pick(p, ['特防','とくぼう','D','d']),
        素早: pick(p, ['素早','素早さ','すばやさ','S','s'])
      };
      return { no, name, types:[p.タイプ1 ?? p.type1 ?? null, p.タイプ2 ?? p.type2 ?? null], base };
    });

    NAME_INDEX = DEX.map(d => ({ no:d.no, name:d.name, norm: normalizeJP(d.name) }));

    // datalist
    const dl = $('pkmnlist'); dl.innerHTML=''; DEX.forEach(d=>{ const o=document.createElement('option'); o.value=d.name; dl.appendChild(o); });
    const info = $('dexInfo'); if(info) info.innerHTML = `<span class="pill">図鑑データ: ${DEX.length}件 読込OK</span>`;
  } catch (err) {
    console.warn('pokemon_master.json 読込失敗:', err);
    DEX = []; NAME_INDEX = [];
    const info = $('dexInfo'); if(info) info.innerHTML = `<span class="pill" style="background:#ffe5e5;color:#b00020">図鑑データ読込エラー</span>`;
  }
}
function findCandidates(q, limit=10){
  const n = normalizeJP(q); if(!n) return [];
  const isNum = /^\d+$/.test(q.trim());
  return NAME_INDEX.filter(r=>isNum?String(r.no).includes(q.trim()):r.norm.includes(n)).slice(0,limit).map(r=>({no:r.no,name:r.name}));
}
function pickDexByName(name){ return DEX.find(x=>x.name===name)||null; }

const dexSg = $('dexSuggest');
$('dexSearch').addEventListener('input', (e) => {
  const q = e.target.value.trim(); const list = findCandidates(q, 10);
  if (!q || list.length===0){ dexSg.classList.add('hidden'); dexSg.innerHTML=''; return; }
  dexSg.classList.remove('hidden'); dexSg.innerHTML = list.map(x => `<li data-no="${x.no}">${x.name}</li>`).join('');
});
dexSg.addEventListener('click', (e) => {
  const li = e.target.closest('li'); if(!li) return;
  const name = li.textContent; $('dexSearch').value = name; dexSg.classList.add('hidden'); showDexInfo(name);
});
$('dexSearch').addEventListener('change', ()=> showDexInfo($('dexSearch').value));

function showDexInfo(name){
  const d = pickDexByName(name); if(!d){ $('dexInfo').textContent = '未選択'; return; }
  $('dexInfo').innerHTML = `
    <div><strong>${d.name}</strong>　タイプ：${d.types.filter(Boolean).join(' / ') || '—'}</div>
    <table>
      <tr><th>HP</th><td>${d.base.HP ?? '-'}</td><th>攻撃</th><td>${d.base.攻撃 ?? '-'}</td><th>防御</th><td>${d.base.防御 ?? '-'}</td></tr>
      <tr><th>特攻</th><td>${d.base.特攻 ?? '-'}</td><th>特防</th><td>${d.base.特防 ?? '-'}</td><th>素早</th><td>${d.base.素早 ?? '-'}</td></tr>
    </table>`;
  // 画像（ローカル→外部）
  const img = $('dexImg');
  function imgPathLocal(n){ const slug=n.replace(/[（）()]/g,'').replace(/\s+/g,''); return `./imgs/${slug}.png`; }
  img.style.display='none'; img.src = imgPathLocal(d.name);
  img.onload = ()=> img.style.display='';
  img.onerror = ()=>{ img.onerror=null; if(d.no){ img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${d.no}.png`; img.onload=()=>img.style.display=''; img.onerror=()=>{img.style.display='none';}; } };

  // 実数値計プリセット（対象のベース値を入れておく）
  $('dexBase').value = d.base[$('dexTarget').value] ?? 100;
}

/* 図鑑 → 各実数値計に種族値を送る */
function applyDexBase(){
  const name = $('dexSearch').value.trim();
  const d = pickDexByName(name);
  if(!d){ alert('先に図鑑でポケモンを選んでください'); return; }

  const sel = $('dexSendTarget').value; // 例: "atk-攻撃", "d2-特防"
  const [dest, stat] = sel.split('-');
  const val = d.base[stat];
  if(val == null){ alert(`種族値「${stat}」が見つかりませんでした`); return; }

  const map = {
    'atk': { '攻撃':'atkBase', '特攻':'atkBase' },
    'def': { 'HP':'defBase', '防御':'defBase', '特防':'defBase' },
    'd1':  { 'HP':'d1Base',  '防御':'d1Base',  '特防':'d1Base'  },
    'd2':  { 'HP':'d2Base',  '防御':'d2Base',  '特防':'d2Base'  },
    'd3':  { 'HP':'d3Base',  '防御':'d3Base',  '特防':'d3Base'  },
  };
  const targetInputId = map[dest]?.[stat];
  if(!targetInputId){ alert('反映先の項目が見つかりませんでした'); return; }

  $(targetInputId).value = val;

  // 便利表示
  if(dest === 'atk'){
    $('atkCalcTarget').value = stat;
    $('atkCalcOut').textContent = `ベース: ${val}`;
  }else if(dest === 'def'){
    $('defCalcTarget').value = stat;
    $('defCalcOut').textContent = `ベース: ${val}`;
  }else{
    const i = Number(dest.slice(1));
    $(`d${i}CalcTarget`).value = stat;
    $(`d${i}CalcOut`).textContent = `ベース: ${val}`;
  }

  alert(`「${d.name}」の種族値（${stat}=${val}）を反映しました`);
}

/* 図鑑の実数値計 → メイン攻撃/防御へ */
function runDexCalc(){
  const isHP = $('dexTarget').value==='HP';
  const val = calcStat(num('dexBase',100), num('dexIV',31), num('dexEV',0), isHP?1.0:Number($('dexNature').value), isHP);
  $('dexOut').textContent = `${$('dexTarget').value}: ${val}`;
}
function applyToCalc(side){
  const m = $('dexOut').textContent.match(/^(HP|攻撃|防御|特攻|特防|素早):\s*(\d+)/);
  if(!m){ alert('先に実数値を計算してください'); return; }
  const stat = m[1], v = Number(m[2]);
  if(side==='atk'){
    if(stat==='攻撃'){ $('atkA').value = v; $('mAtkA').value = v; }
    if(stat==='特攻'){ $('atkS').value = v; $('mAtkS').value = v; }
  }else{
    if(stat==='HP'){ $('defHP').value = v; resetHP(); }
    if(stat==='防御'){ $('defB').value = v; }
    if(stat==='特防'){ $('defD').value = v; }
  }
  alert(`「${stat} = ${v}」を反映しました`);
}

/* ===== パーティ保存 ===== */
const PARTY_KEY = 'pokemon_parties_v1';
const SINGLE_KEY = 'pokemon_singles_v1';
function partyEmpty(){ return { name:'', item:'', moves:['','','',''], memo:'' }; }
function getPartyUI(i){ return { name:$(`p${i}Name`), item:$(`p${i}Item`), m1:$(`p${i}M1`), m2:$(`p${i}M2`), m3:$(`p${i}M3`), m4:$(`p${i}M4`), memo:$(`p${i}Memo`), singleName:$(`p${i}SaveName`), singleList:$(`p${i}SingleList`) }; }
function readPartyFromUI(){ const arr=[]; for(let i=1;i<=6;i++){ const u=getPartyUI(i); arr.push({ name:u.name.value.trim(), item:u.item.value.trim(), moves:[u.m1.value.trim(),u.m2.value.trim(),u.m3.value.trim(),u.m4.value.trim()], memo:u.memo.value.trim() }); } return arr; }
function writePartyToUI(arr){ for(let i=1;i<=6;i++){ const u=getPartyUI(i), d=arr[i-1]||partyEmpty(); u.name.value=d.name||''; u.item.value=d.item||''; u.m1.value=d.moves?.[0]||''; u.m2.value=d.moves?.[1]||''; u.m3.value=d.moves?.[2]||''; u.m4.value=d.moves?.[3]||''; u.memo.value=d.memo||''; } }
function loadPartiesStore(){ try{return JSON.parse(localStorage.getItem(PARTY_KEY)||'{}');}catch{return{}} }
function savePartiesStore(obj){ localStorage.setItem(PARTY_KEY, JSON.stringify(obj)); refreshPartyList(); }
function refreshPartyList(){ const sel=$('partyList'), store=loadPartiesStore(), keys=Object.keys(store).sort(); sel.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join(''); }
function saveParty(){ const name=$('partySaveName').value.trim()||`party_${new Date().toISOString().slice(0,16).replace('T',' ')}`; const st=loadPartiesStore(); st[name]=readPartyFromUI(); savePartiesStore(st); alert(`保存しました：${name}`); }
function loadParty(){ const k=$('partyList').value; if(!k) return; const st=loadPartiesStore(); if(!st[k]) return; writePartyToUI(st[k]); }
function deleteParty(){ const k=$('partyList').value; if(!k) return; const st=loadPartiesStore(); delete st[k]; savePartiesStore(st); }

/* 1体保存 */
function loadSinglesStore(){ try{return JSON.parse(localStorage.getItem(SINGLE_KEY)||'{}');}catch{return{}} }
function saveSinglesStore(obj){ localStorage.setItem(SINGLE_KEY, JSON.stringify(obj)); }
function saveSingle(i){ const u=getPartyUI(i), key=(u.singleName.value.trim()||`mon${i}_${Date.now()}`), st=loadSinglesStore(); st[key]={ name:u.name.value.trim(), item:u.item.value.trim(), moves:[u.m1.value.trim(),u.m2.value.trim(),u.m3.value.trim(),u.m4.value.trim()], memo:u.memo.value.trim() }; saveSinglesStore(st); alert(`1体保存：${key}`); refreshSinglesListAll(); }
function applySingle(i){ const u=getPartyUI(i), key=u.singleList.value; if(!key) return; const d=loadSinglesStore()[key]; if(!d) return; u.name.value=d.name||''; u.item.value=d.item||''; [u.m1.value,u.m2.value,u.m3.value,u.m4.value]=d.moves||['','','','']; u.memo.value=d.memo||''; }
function refreshSinglesListAll(){ const st=loadSinglesStore(), keys=Object.keys(st).sort(); for(let i=1;i<=6;i++){ const u=getPartyUI(i); u.singleList.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join(''); } }
function buildPartyUI(){ const grid=$('partyGrid'); grid.innerHTML=''; let html=''; for(let i=1;i<=6;i++){ html+=`
  <div class="card">
    <div class="slot-h"><strong>${i}体目</strong> <small>（名前にサジェストあり）</small></div>
    <div class="row"><label>名前</label><input id="p${i}Name" list="pkmnlist" placeholder="例：サーフゴー" /></div>
    <div class="row"><label>アイテム</label><input id="p${i}Item" placeholder="こだわりスカーフ 等"/></div>
    <div class="row"><label>技1</label><input id="p${i}M1" /></div>
    <div class="row"><label>技2</label><input id="p${i}M2" /></div>
    <div class="row"><label>技3</label><input id="p${i}M3" /></div>
    <div class="row"><label>技4</label><input id="p${i}M4" /></div>
    <div class="row"><label>メモ</label><input id="p${i}Memo" /></div>
    <div class="tight" style="margin-top:8px">
      <input id="p${i}SaveName" placeholder="この1体の保存名" />
      <button class="btn btn-ghost" onclick="saveSingle(${i})">1体保存</button>
      <select id="p${i}SingleList"></select>
      <button class="btn btn-ghost" onclick="applySingle(${i})">呼び出し</button>
    </div>
  </div>`; } grid.innerHTML=html; refreshSinglesListAll(); }

/* ===== 対戦メモ ===== */
const MEMO_KEY = 'match_memos_v1';
function memoReadUI(){
  return {
    my:[ $('my1Name').value, $('my2Name').value, $('my3Name').value ],
    op:[ $('op1Name').value, $('op2Name').value, $('op3Name').value ],
    notes:{
      my1:$('my1Note').value, my2:$('my2Note').value, my3:$('my3Note').value,
      op1:$('op1Note').value, op2:$('op2Note').value, op3:$('op3Note').value,
      all:$('matchNote').value
    }
  };
}
function memoWriteUI(d){
  $('my1Name').value = d?.my?.[0]||''; $('my2Name').value = d?.my?.[1]||''; $('my3Name').value = d?.my?.[2]||'';
  $('op1Name').value = d?.op?.[0]||''; $('op2Name').value = d?.op?.[1]||''; $('op3Name').value = d?.op?.[2]||'';
  $('my1Note').value = d?.notes?.my1||''; $('my2Note').value = d?.notes?.my2||''; $('my3Note').value = d?.notes?.my3||'';
  $('op1Note').value = d?.notes?.op1||''; $('op2Note').value = d?.notes?.op2||''; $('op3Note').value = d?.notes?.op3||'';
  $('matchNote').value = d?.notes?.all||'';
}
function memoLoadStore(){ try{return JSON.parse(localStorage.getItem(MEMO_KEY)||'{}');}catch{return{}} }
function memoSaveStore(o){ localStorage.setItem(MEMO_KEY, JSON.stringify(o)); memoRefreshList(); }
function memoRefreshList(){ const st=memoLoadStore(), keys=Object.keys(st).sort(); $('memoList').innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join(''); }
function memoSave(){ const name=$('memoSaveName').value.trim()||`memo_${new Date().toISOString().slice(0,16).replace('T',' ')}`; const st=memoLoadStore(); st[name]=memoReadUI(); memoSaveStore(st); alert(`保存：${name}`); }
function memoLoad(){ const k=$('memoList').value; if(!k) return; const st=memoLoadStore(); if(!st[k]) return; memoWriteUI(st[k]); }
function memoDelete(){ const k=$('memoList').value; if(!k) return; const st=memoLoadStore(); delete st[k]; memoSaveStore(st); }

/* ===== タブ切替 ===== */
function switchTab(key){
  document.querySelectorAll('.tab').forEach(b=>{ b.classList.toggle('active', b.dataset.tab===key); });
  $('tab-calc').classList.toggle('hidden', key!=='calc');
  $('tab-multi').classList.toggle('hidden', key!=='multi');
  $('tab-dex').classList.toggle('hidden', key!=='dex');
  $('tab-memo').classList.toggle('hidden', key!=='memo');
  $('tab-timer').classList.toggle('hidden', key!=='timer');
  localStorage.setItem('activeTab', key);
  window.scrollTo({top:0, behavior:'smooth'});
}
document.addEventListener('click', (e)=>{
  const btn = e.target.closest('.tab'); if(!btn) return; e.preventDefault(); switchTab(btn.dataset.tab);
});

/* ===== タイマー ===== */
let timerMs = 600000, timerRunning=false, timerEndAt=0, timerId=null;
function fmt(ms){ ms=Math.max(0, ms|0); const s=Math.floor(ms/1000); const mm=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${mm}:${ss}`; }
function drawTimer(){ const now=Date.now(); const remain=timerRunning?Math.max(0,timerEndAt-now):timerMs; $('timerDisplay').textContent=fmt(remain); if(timerRunning&&remain<=0){ stopTimer(false); if(navigator.vibrate) navigator.vibrate([200,100,200]); alert('タイマー終了！'); } }
function stopTimer(save=true){ if(timerId){clearInterval(timerId); timerId=null;} timerRunning=false; $('timerStartBtn').textContent='開始'; if(save) localStorage.setItem('timerMs', String(timerMs)); }
function startTimer(){ if(timerRunning) return; timerRunning=true; timerEndAt=Date.now()+timerMs; $('timerStartBtn').textContent='一時停止'; timerId=setInterval(drawTimer,200); }
function toggleTimer(){ if(!timerRunning){ const m=clamp(num('timerMin',10),0,999); const s=clamp(num('timerSec',0),0,59); timerMs=(m*60+s)*1000; } timerRunning?stopTimer():startTimer(); }
function resetTimer(){ stopTimer(false); const m=clamp(num('timerMin',10),0,999); const s=clamp(num('timerSec',0),0,59); timerMs=(m*60+s)*1000; drawTimer(); }

/* ===== 初期化 ===== */
(function init(){
  try {
    // メイン
    const atkStage=$('atkStage'), defStage=$('defStage'), hits=$('hits');
    for(let i=-6;i<=6;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===0)o.selected=true; atkStage.appendChild(o.cloneNode(true)); defStage.appendChild(o); }
    for(let i=1;i<=10;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===1)o.selected=true; hits.appendChild(o); }
    defCurHP = num('defHP', 0); syncHPBar(); $('defHP').addEventListener('input', resetHP);

    // 1対3
    const mAtk=$('mAtkStage'), mHits=$('mHits');
    for(let i=-6;i<=6;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===0)o.selected=true; mAtk.appendChild(o); }
    for(let i=1;i<=10;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===1)o.selected=true; mHits.appendChild(o); }
    [1,2,3].forEach(i=>{
      const s=$(`d${i}DefStage`);
      for(let r=-6;r<=6;r++){ const o=document.createElement('option'); o.value=r; o.textContent=r; if(r===0)o.selected=true; s.appendChild(o); }
      mResetOne(i);
      $(`d${i}HP`).addEventListener('input', ()=>mResetOne(i));
    });

    // パーティ
    buildPartyUI(); refreshPartyList();

    // 図鑑
    loadDexFromMaster().then(()=>{ $('dexSearch').addEventListener('change', ()=> showDexInfo($('dexSearch').value)); });

    // タブ復元
    window.addEventListener('DOMContentLoaded', ()=>{ switchTab(localStorage.getItem('activeTab') || 'calc'); });

    // タイマー復元
    const saved = Number(localStorage.getItem('timerMs')); if(Number.isFinite(saved)&&saved>0) timerMs=saved;
    $('timerMin').value=Math.floor((timerMs/1000)/60); $('timerSec').value=Math.floor((timerMs/1000)%60); drawTimer();

    // メモ一覧
    memoRefreshList();
  } catch (e) {
    console.error('初期化エラー:', e); alert('初期化に失敗しました：' + e.message);
  }
})();
