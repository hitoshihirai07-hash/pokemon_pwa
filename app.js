/* ====== PWA & 基本 ====== */
const APP_VER = '2025-09-20_full_final';
const $ = (id) => document.getElementById(id);
const setText = (id, t) => $(id).textContent = t;
const num = (id, d=0) => { const v=$(id)?.value; const n=Number(v); return Number.isFinite(n)?n:d; };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
if('serviceWorker' in navigator){
  window.addEventListener('load', async ()=>{
    try{
      const reg = await navigator.serviceWorker.register('./service-worker.js',{scope:'./'});
      $('swStatus').textContent='SW 有効';
      reg.addEventListener('updatefound', ()=>{
        const nw=reg.installing;
        nw?.addEventListener('statechange', ()=>{
          if(nw.state==='installed' && navigator.serviceWorker.controller){
            if(confirm('新しい版があります。更新しますか？')) location.reload();
          }
        });
      });
    }catch(e){ $('swStatus').textContent='SW 失敗'; }
  });
}
let deferredPrompt=null;
window.addEventListener('beforeinstallprompt',(e)=>{e.preventDefault();deferredPrompt=e;$('installBtn').hidden=false;});
$('installBtn')?.addEventListener('click', async()=>{deferredPrompt?.prompt();await deferredPrompt?.userChoice;deferredPrompt=null;$('installBtn').hidden=true;});

/* ====== 図鑑データの読込 ====== */
let DEX=[], NAME_INDEX=[];
function toNumber(v){ if(v==null)return null; const s=String(v).replace(/[^\d]/g,''); return s?Number(s):null; }
function normalizeJP(s){ return String(s||'').normalize('NFKC').replace(/\s+/g,'').replace(/[ぁ-ん]/g,ch=>String.fromCharCode(ch.charCodeAt(0)+0x60)).toLowerCase(); }
function pick(p, keys, def=null){ for(const k of keys){ if(p[k]!=null) return p[k]; } return def; }

async function loadDexFromMaster(){
  try{
    const res = await fetch('./pokemon_master.json?ver='+APP_VER,{cache:'no-store'});
    const src = await res.json();
    DEX = src.map(p=>{
      const no = toNumber(p.No ?? p.no ?? p.dex ?? p.Dex);
      const name = String(p.名前 ?? p.name ?? '').trim();
      const base = {
        HP:   pick(p,['HP','hp']),
        攻撃: pick(p,['攻撃','こうげき','攻','A','a']),
        防御: pick(p,['防御','ぼうぎょ','防','B','b']),
        特攻: pick(p,['特攻','とくこう','C','c']),
        特防: pick(p,['特防','とくぼう','D','d']),
        素早: pick(p,['素早','素早さ','すばやさ','S','s']),
      };
      return { no, name, types:[p.タイプ1 ?? p.type1 ?? null, p.タイプ2 ?? p.type2 ?? null], base };
    });
    NAME_INDEX = DEX.map(d=>({no:d.no,name:d.name,norm:normalizeJP(d.name)}));
    const dl=$('pkmnlist'); dl.innerHTML=''; DEX.forEach(d=>{const o=document.createElement('option');o.value=d.name;dl.appendChild(o);});
    $('dexInfo').innerHTML=`<span class="pill">図鑑データ: ${DEX.length}件 読込OK</span>`;
  }catch(e){ $('dexInfo').innerHTML=`<span class="pill" style="background:#ffe5e5;color:#b00020">図鑑データ読込エラー</span>`; }
}
function findCandidates(q, limit=10){
  const n=normalizeJP(q); if(!n) return [];
  const isNum=/^\d+$/.test(q.trim());
  return NAME_INDEX.filter(r=>isNum?String(r.no).includes(q.trim()):r.norm.includes(n)).slice(0,limit).map(r=>({no:r.no,name:r.name}));
}
function pickDexByName(name){ return DEX.find(x=>x.name===name)||null; }

/* ====== 実数値計・ダメージ ====== */
const LEVEL=50;
const RANK_MULT={"-6":2/8,"-5":2/7,"-4":2/6,"-3":2/5,"-2":2/4,"-1":2/3,"0":1,"1":3/2,"2":2,"3":5/2,"4":3,"5":7/2,"6":4};
function calcStat(base, iv, ev, nature, isHP){
  if(isHP) return Math.floor(((2*base + iv + Math.floor(ev/4))*LEVEL)/100) + LEVEL + 10;
  const v = Math.floor(((2*base + iv + Math.floor(ev/4))*LEVEL)/100) + 5;
  return Math.floor(v * nature);
}
function damageCore(level, power, atk, df){
  const base=Math.floor(level*2/5)+2;
  const core=Math.floor((base*power*atk)/Math.max(1,df));
  return Math.floor(core/50)+2;
}
function weatherMoveMultiplier(weather, moveType){
  if(weather==='晴れ'&&moveType==='ほのお') return 1.5;
  if(weather==='晴れ'&&moveType==='みず')   return 0.5;
  if(weather==='雨'  &&moveType==='みず')   return 1.5;
  if(weather==='雨'  &&moveType==='ほのお') return 0.5;
  return 1.0;
}
function choiceItemMultiplier(item, category){
  if(item==='こだわりハチマキ'&&category==='物理') return 1.5;
  if(item==='こだわりメガネ'  &&category==='特殊') return 1.5;
  return 1.0;
}
function lifeOrbMultiplier(item){ return item==='いのちのたま'?1.3:1.0; }

/* ====== 計算タブ ====== */
function currentAtkStat(category){ return category==='物理'? num('atkA',1) : num('atkS',1); }
function currentDefStat(category){ return category==='物理'? num('defB',1) : num('defD',1); }
function sandSpDefBoostOn(category){ return $('weather').value==='砂嵐' && $('sandRock').value==='1' && category==='特殊'; }
function snowDefBoostOn(category){ return $('weather').value==='雪' && $('snowIce').value==='1' && category==='物理'; }
function calcRange(){
  const category=$('category').value, power=num('power',1), moveType=$('moveType').value;
  const stab=Number($('stab').value), typeMul=Number($('typeMul').value), weather=$('weather').value;
  const status=$('status').value, atkStage=Number($('atkStage').value), defStage=Number($('defStage').value);
  const item=$('item').value, otherMul=num('otherMul',1.0);
  let atk=currentAtkStat(category), df=currentDefStat(category);
  if(sandSpDefBoostOn(category)) df=Math.floor(df*1.5);
  if(snowDefBoostOn(category))   df=Math.floor(df*1.5);
  const rAtk=RANK_MULT[atkStage], rDef=RANK_MULT[defStage];
  const burn=(status==='やけど' && category==='物理')?0.5:1.0;
  const itemMul=choiceItemMultiplier(item,category)*lifeOrbMultiplier(item);
  const wMul=weatherMoveMultiplier(weather,moveType);
  const core=damageCore(LEVEL,power,Math.floor(atk*rAtk),Math.floor(df*rDef));
  const base=core*stab*typeMul*burn*itemMul*wMul*otherMul;
  return {min:Math.floor(base*0.85), max:Math.floor(base*1.0)};
}
let defCurHP=0;
function syncHPBar(){
  const hpMax=num('defHP',0); defCurHP=clamp(defCurHP,0,hpMax);
  const pct=hpMax>0?Math.round(defCurHP/hpMax*100):0;
  $('hpFill').style.width=pct+'%'; setText('hpText',`${defCurHP} / ${hpMax} (${pct}%)`);
}
function resetHP(){ defCurHP=num('defHP',0); syncHPBar(); $('log').value=''; }
function doAttack(){ const {min,max}=calcRange(); const roll=Math.floor(Math.random()*(max-min+1))+min; if(defCurHP<=0) defCurHP=num('defHP',0); const before=defCurHP; defCurHP=clamp(defCurHP-roll,0,num('defHP',0)); syncHPBar(); $('log').value+=`攻撃: ${roll} → ${before}→${defCurHP}\n`; }
function previewDamage(){
  const {min,max}=calcRange(); const hits=Number($('hits').value); const hpMax=num('defHP',0);
  const totalMin=min*hits,totalMax=max*hits;
  const remainMin=clamp(hpMax-totalMax,0,hpMax), remainMax=clamp(hpMax-totalMin,0,hpMax);
  const avg=Math.floor((min+max)/2)||1, fixed=max>0?Math.ceil(hpMax/max):'—', rnd=avg>0?Math.ceil(hpMax/avg):'—';
  setText('resultLine',`1発: ${min} ～ ${max} / ${hits}回: ${totalMin} ～ ${totalMax}`);
  const ul=$('resultList'); ul.innerHTML='';
  const a=document.createElement('li'); a.textContent=`残りHP（プレビュー）: ${remainMin} ～ ${remainMax}`; ul.appendChild(a);
  const b=document.createElement('li'); b.textContent=`確定 ${fixed} 発・乱数目安 ${rnd} 発`; ul.appendChild(b);
}
function runAtkCalc(){
  const target=$('atkCalcTarget').value;
  const val=calcStat(num('atkBase',50),num('atkIV',31),num('atkEV',0),Number($('atkNature').value),false);
  $('atkCalcOut').textContent=`${target}: ${val}`;
  if(target==='攻撃') $('atkA').value=val; else $('atkS').value=val;
}
function copyFromAtkCalc(kind){
  const m=$('atkCalcOut').textContent.match(/(攻撃|特攻):\s*(\d+)/); if(!m){alert('先に攻撃側の実数値計で計算');return;}
  const val=Number(m[2]); if(kind==='A') $('atkA').value=val; else $('atkS').value=val;
}
function runDefCalc(){
  const target=$('defCalcTarget').value, isHP=(target==='HP');
  const val=calcStat(num('defBase',50),num('defIV',31),num('defEV',0),isHP?1.0:Number($('defNature').value),isHP);
  $('defCalcOut').textContent=`${target}: ${val}`;
  if(target==='HP'){ $('defHP').value=val; resetHP(); } else if(target==='防御'){ $('defB').value=val; } else { $('defD').value=val; }
}
function copyFromDefCalc(kind){
  const m=$('defCalcOut').textContent.match(/(HP|防御|特防):\s*(\d+)/); if(!m){alert('先に防御側の実数値計で計算');return;}
  const stat=m[1], val=Number(m[2]);
  if(kind==='HP'||stat==='HP'){ $('defHP').value=val; resetHP(); }
  else if(kind==='B'||stat==='防御'){ $('defB').value=val; }
  else { $('defD').value=val; }
}

/* ====== 1対3（独立入力） ====== */
const mState={curHP:[0,0,0]};
function mAtkStat(){ return $('mCategory').value==='物理'? num('mAtkA',1) : num('mAtkS',1); }
function mDefStat(i){ return $('mCategory').value==='物理'? num(`d${i}B`,1) : num(`d${i}D`,1); }
function mWeatherMul(){ return weatherMoveMultiplier($('mWeather').value,$('mMoveType').value); }
function mItemMul(){ return choiceItemMultiplier($('mItem').value,$('mCategory').value)*lifeOrbMultiplier($('mItem').value); }
function mBurnMul(){ return ($('mStatus').value==='やけど' && $('mCategory').value==='物理')?0.5:1.0; }
function mRankAtk(){ return RANK_MULT[Number($('mAtkStage').value)]; }
function mRankDef(i){ return RANK_MULT[Number($(`d${i}DefStage`).value)]; }
function mSnowBoost(i){ return ($('mWeather').value==='雪' && $(`d${i}SnowIce`).value==='1' && $('mCategory').value==='物理')?1.5:1.0; }
function mSandBoost(i){ return ($('mWeather').value==='砂嵐' && $(`d${i}SandRock`).value==='1' && $('mCategory').value==='特殊')?1.5:1.0; }
function mRange(i){
  const power=num('mPower',1), stab=Number($('mStab').value), typeMul=Number($(`d${i}TypeMul`).value);
  let atk=mAtkStat(); let df=Math.floor(mDefStat(i)*mSnowBoost(i)*mSandBoost(i));
  const core=damageCore(LEVEL,power,Math.floor(atk*mRankAtk()),Math.floor(df*mRankDef(i)));
  const base=core*stab*typeMul*mBurnMul()*mItemMul()*mWeatherMul()*num('mOtherMul',1.0);
  return {min:Math.floor(base*0.85), max:Math.floor(base*1.0)};
}
function mSyncHP(i){
  const hpMax=num(`d${i}HP`,0); mState.curHP[i-1]=clamp(mState.curHP[i-1],0,hpMax);
  const pct=hpMax>0?Math.round(mState.curHP[i-1]/hpMax*100):0;
  $(`d${i}HpFill`).style.width=pct+'%'; setText(`d${i}HpText`,`${mState.curHP[i-1]} / ${hpMax} (${pct}%)`);
}
function mResetOne(i){ mState.curHP[i-1]=num(`d${i}HP`,0); mSyncHP(i); }
function mAttackOne(i){ const {min,max}=mRange(i); const roll=Math.floor(Math.random()*(max-min+1))+min; if(mState.curHP[i-1]<=0)mResetOne(i); const before=mState.curHP[i-1]; mState.curHP[i-1]=clamp(before-roll,0,num(`d${i}HP`,0)); mSyncHP(i); const name=$(`d${i}Name`).value||`相手${i}`; $('mLog').value+=`[${name}] ${roll} → ${before}→${mState.curHP[i-1]}\n`; }
function mPreviewOne(i){ const {min,max}=mRange(i); const hits=Number($('mHits').value), hpMax=num(`d${i}HP`,0); const totalMin=min*hits,totalMax=max*hits; const remainMin=clamp(hpMax-totalMax,0,hpMax), remainMax=clamp(hpMax-totalMin,0,hpMax); const avg=Math.floor((min+max)/2)||1; const fixed=max>0?Math.ceil(hpMax/max):'—'; const rnd=avg>0?Math.ceil(hpMax/avg):'—'; $(`d${i}Result`).textContent=`1発:${min}～${max} / ${hits}回:${totalMin}～${totalMax} / 残:${remainMin}～${remainMax} / 確定${fixed}発・乱数${rnd}発`; }
function mPreviewAll(){ [1,2,3].forEach(mPreviewOne); }
function mAttackAll(){ [1,2,3].forEach(mAttackOne); }
function mResetAll(){ [1,2,3].forEach(mResetOne); $('mLog').value=''; }

/* ====== 図鑑 UI（自動反映込み） ====== */
const dexSg=$('dexSuggest');
$('dexSearch').addEventListener('input',(e)=>{ const q=e.target.value.trim(); const list=findCandidates(q,12); if(!q||list.length===0){ dexSg.classList.add('hidden'); dexSg.innerHTML=''; return; } dexSg.classList.remove('hidden'); dexSg.innerHTML=list.map(x=>`<li data-no="${x.no}">${x.name}</li>`).join(''); });
dexSg.addEventListener('click',(e)=>{ const li=e.target.closest('li'); if(!li) return; const name=li.textContent; $('dexSearch').value=name; dexSg.classList.add('hidden'); showDexInfo(name); });
$('dexSearch').addEventListener('change',()=> showDexInfo($('dexSearch').value));

function autoApplyDexBaseFromUI(){
  const name=$('dexSearch').value.trim(); const d=pickDexByName(name); if(!d) return;
  const statDex=$('dexTarget').value; const baseDex=d.base?.[statDex]; if(baseDex!=null) $('dexBase').value=baseDex;
  const sel=$('dexSendTarget').value; const [dest,stat]=sel.split('-'); const base=d.base?.[stat]; if(base==null) return;
  const map={'atk':{'攻撃':'atkBase','特攻':'atkBase'},'def':{'HP':'defBase','防御':'defBase','特防':'defBase'},'d1':{'HP':'d1Base','防御':'d1Base','特防':'d1Base'},'d2':{'HP':'d2Base','防御':'d2Base','特防':'d2Base'},'d3':{'HP':'d3Base','防御':'d3Base','特防':'d3Base'}};
  const id=map[dest]?.[stat]; if(id) $(id).value=base;
}
function showDexInfo(name){
  const d=pickDexByName(name); if(!d){ $('dexInfo').textContent='未選択'; return; }
  $('dexInfo').innerHTML=`
    <div><strong>${d.name}</strong>　タイプ：${d.types.filter(Boolean).join(' / ')||'—'}</div>
    <table>
      <tr><th>HP</th><td>${d.base.HP ?? '-'}</td><th>攻撃</th><td>${d.base.攻撃 ?? '-'}</td><th>防御</th><td>${d.base.防御 ?? '-'}</td></tr>
      <tr><th>特攻</th><td>${d.base.特攻 ?? '-'}</td><th>特防</th><td>${d.base.特防 ?? '-'}</td><th>素早</th><td>${d.base.素早 ?? '-'}</td></tr>
    </table>`;
  const img=$('dexImg'); function imgPathLocal(n){ const slug=n.replace(/[（）()]/g,'').replace(/\s+/g,''); return `./imgs/${slug}.png`; }
  img.style.display='none'; img.src=imgPathLocal(d.name);
  img.onload=()=> img.style.display='';
  img.onerror=()=>{ img.onerror=null; if(d.no){ img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${d.no}.png`; img.onload=()=>img.style.display=''; img.onerror=()=>{img.style.display='none';}; } };
  $('dexBase').value=d.base[$('dexTarget').value] ?? 100;
  autoApplyDexBaseFromUI();
}
$('dexTarget')?.addEventListener('change',()=>{ const d=pickDexByName($('dexSearch').value.trim()); if(!d) return; const stat=$('dexTarget').value; const val=d.base?.[stat]; if(val!=null) $('dexBase').value=val; });

/* 1対3：名前→種族値プレビュー＆実数値計の種族値欄に自動反映 */
function findDexByInputName(name){
  if(!name) return null;
  const exact=DEX.find(d=>d.name===name); if(exact) return exact;
  const cand=findCandidates(name,1); if(cand && cand.length) return DEX.find(d=>d.name===cand[0].name)||null;
  return null;
}
function renderDexBoxFor(i,d){
  const box=$(`d${i}DexBox`); if(!box) return;
  if(!d){ box.textContent='—'; return; }
  const b=d.base||{}; const types=d.types.filter(Boolean).join(' / ')||'—';
  box.innerHTML=`<div><strong>${d.name}</strong>　タイプ：${types}</div>
  <table><tr><th>HP</th><td>${b.HP ?? '-'}</td><th>攻撃</th><td>${b.攻撃 ?? '-'}</td><th>防御</th><td>${b.防御 ?? '-'}</td></tr>
  <tr><th>特攻</th><td>${b.特攻 ?? '-'}</td><th>特防</th><td>${b.特防 ?? '-'}</td><th>素早</th><td>${b.素早 ?? '-'}</td></tr></table>`;
}
function hookMultiDexBoxes(){
  [1,2,3].forEach(i=>{
    const inp=$(`d${i}Name`), tgt=$(`d${i}CalcTarget`);
    const syncBase=()=>{ const d=findDexByInputName(inp.value.trim()); if(!d) return; const stat=tgt?.value||'HP'; const val=d.base?.[stat]; if(val!=null) $(`d${i}Base`).value=val; };
    const update=()=>{ const d=findDexByInputName(inp.value.trim()); renderDexBoxFor(i,d); syncBase(); };
    inp.addEventListener('input',update); inp.addEventListener('change',update); tgt?.addEventListener('change',syncBase); update();
  });
}

/* ====== パーティ保存 ＋ EV/性格補正 ====== */
const PARTY_KEY='pokemon_parties_v2', SINGLE_KEY='pokemon_singles_v2';
const NATURE_NAME_TABLE = (()=>{ // 推定性格名（↑,↓）
  const names={
    攻撃:{特攻:'いじっぱり',特防:'やんちゃ',素早:'ゆうかん',防御:'さみしがり'},
    防御:{攻撃:'ずぶとい',特攻:'わんぱく',特防:'のうてんき',素早:'のんき'},
    特攻:{攻撃:'ひかえめ',防御:'うっかりや',特防:'おくびょう',素早:'れいせい'},
    特防:{攻撃:'しんちょう',防御:'おだやか',特攻:'なまいき',素早:'おっとり'},
    素早:{攻撃:'ようき',防御:'せっかち',特攻:'おくびょう?',特防:'むじゃき'} // 厳密名はバージョン差あり。推定用なので「?」容認
  };
  return names;
})();
function partyEmpty(){ return { name:'', item:'', moves:['','','',''], memo:'', ev:{H:0,A:0,B:0,C:0,D:0,S:0}, iv:{H:31,A:31,B:31,C:31,D:31,S:31}, nature:{A:1.0,B:1.0,C:1.0,D:1.0,S:1.0}, leftover:'B', autoPlus4:true }; }
function getPartyUI(i){
  return {
    name:$(`p${i}Name`), item:$(`p${i}Item`), m1:$(`p${i}M1`), m2:$(`p${i}M2`), m3:$(`p${i}M3`), m4:$(`p${i}M4`),
    memo:$(`p${i}Memo`),
    ev:{ H:$(`p${i}EVH`), A:$(`p${i}EVA`), B:$(`p${i}EVB`), C:$(`p${i}EVC`), D:$(`p${i}EVD`), S:$(`p${i}EVS`) },
    iv:{ H:$(`p${i}IVH`), A:$(`p${i}IVA`), B:$(`p${i}IVB`), C:$(`p${i}IVC`), D:$(`p${i}IVD`), S:$(`p${i}IVS`) },
    nat:{ A:$(`p${i}NA`), B:$(`p${i}NB`), C:$(`p${i}NC`), D:$(`p${i}ND`), S:$(`p${i}NS`) },
    sum:$(`p${i}Sum`), warn:$(`p${i}Warn`), paste:$(`p${i}Paste`), copy:$(`p${i}Copy`),
    lock:$(`p${i}Lock`), plusTo:$(`p${i}PlusTo`), natureName:$(`p${i}NatureName`),
  };
}
function buildPartyUI(){
  const grid=$('partyGrid'); grid.innerHTML='';
  let html='';
  for(let i=1;i<=6;i++){
    html+=`<div class="card">
      <div class="slot-h"><strong>${i}体目</strong> <small>（名前にサジェストあり）</small></div>
      <div class="row"><label>名前</label><input id="p${i}Name" list="pkmnlist" placeholder="例：サーフゴー"/></div>
      <div class="row"><label>アイテム</label><input id="p${i}Item" placeholder="こだわりスカーフ 等"/></div>
      <div class="row"><label>技1</label><input id="p${i}M1"/></div>
      <div class="row"><label>技2</label><input id="p${i}M2"/></div>
      <div class="row"><label>技3</label><input id="p${i}M3"/></div>
      <div class="row"><label>技4</label><input id="p${i}M4"/></div>
      <div class="row"><label>メモ</label><input id="p${i}Memo"/></div>

      <div class="row"><label>EV(H/A/B/C/D/S)</label>
        <div class="ev-row">
          <input id="p${i}EVH" type="number" min="0" max="252" value="0"/>
          <input id="p${i}EVA" type="number" min="0" max="252" value="0"/>
          <input id="p${i}EVB" type="number" min="0" max="252" value="0"/>
          <input id="p${i}EVC" type="number" min="0" max="252" value="0"/>
          <input id="p${i}EVD" type="number" min="0" max="252" value="0"/>
          <input id="p${i}EVS" type="number" min="0" max="252" value="0"/>
        </div>
      </div>
      <div class="ev-tools">
        <label><input id="p${i}Lock" type="checkbox" checked/> 4の倍数ロック</label>
        <label>余り4の配分先</label>
        <select id="p${i}PlusTo">
          <option value="B" selected>B</option><option value="D">D</option><option value="S">S</option><option value="H">H</option><option value="A">A</option><option value="C">C</option><option value="">なし</option>
        </select>
        <button class="btn btn-ghost" onclick="presetEV(${i},'AS')">A252 S252</button>
        <button class="btn btn-ghost" onclick="presetEV(${i},'CS')">C252 S252</button>
        <button class="btn btn-ghost" onclick="presetEV(${i},'AH')">A252 H252</button>
        <button class="btn btn-ghost" onclick="presetEV(${i},'HB')">H252 B252</button>
        <button class="btn btn-ghost" onclick="presetEV(${i},'HD')">H252 D252</button>
        <span id="p${i}Sum" class="pill">合計 0 / 510</span>
        <span id="p${i}Warn" class="pill badge-err hidden">EV 合計が 510 を超えています</span>
        <button id="p${i}Copy" class="btn btn-ghost" onclick="copyEV(${i})">コピー</button>
        <button id="p${i}Paste" class="btn btn-ghost" onclick="pasteEV(${i})">貼り付け</button>
      </div>

      <div class="row"><label>IV(H/A/B/C/D/S)</label>
        <div class="ev-row">
          <input id="p${i}IVH" type="number" min="0" max="31" value="31"/>
          <input id="p${i}IVA" type="number" min="0" max="31" value="31"/>
          <input id="p${i}IVB" type="number" min="0" max="31" value="31"/>
          <input id="p${i}IVC" type="number" min="0" max="31" value="31"/>
          <input id="p${i}IVD" type="number" min="0" max="31" value="31"/>
          <input id="p${i}IVS" type="number" min="0" max="31" value="31"/>
        </div>
      </div>

      <div class="row"><label>性格補正</label>
        <div class="ev-row">
          <select id="p${i}NA"><option>1.1</option><option selected>1.0</option><option>0.9</option></select>
          <select id="p${i}NB"><option>1.1</option><option selected>1.0</option><option>0.9</option></select>
          <select id="p${i}NC"><option>1.1</option><option selected>1.0</option><option>0.9</option></select>
          <select id="p${i}ND"><option>1.1</option><option selected>1.0</option><option>0.9</option></select>
          <select id="p${i}NS"><option>1.1</option><option selected>1.0</option><option>0.9</option></select>
          <span id="p${i}NatureName" class="pill">性格：—</span>
        </div>
      </div>

      <div class="tight" style="margin-top:6px">
        <button class="btn btn-ghost" onclick="applyPartyToCalc(${i},'atk')">→ メイン攻撃側へ</button>
        <button class="btn btn-ghost" onclick="applyPartyToCalc(${i},'def')">→ メイン防御側へ</button>
        <button class="btn btn-ghost" onclick="applyPartyToMulti(${i})">→ 1対3へ（HP/B/D）</button>
      </div>
    </div>`;
  }
  grid.innerHTML=html;
  // イベント
  for(let i=1;i<=6;i++){
    const u=getPartyUI(i);
    [...Object.values(u.ev),...Object.values(u.iv)].forEach(inp=>{
      inp.addEventListener('input',()=>{ if(u.lock.checked){ inp.value=String(Math.min(252,Math.max(0,Math.round(Number(inp.value)/4)*4))); } updateEVSum(i); if(($('autoReflect').value==='on')) {/* 自動反映はパーティ内だけの更新。外部反映はボタン */} });
    });
    Object.values(u.nat).forEach(sel=> sel.addEventListener('change',()=>{updateNatureName(i);}));
    u.plusTo.addEventListener('change',()=>{});
  }
  refreshSinglesListAll();
}
function readPartyFromUI(){
  const arr=[];
  for(let i=1;i<=6;i++){
    const u=getPartyUI(i);
    arr.push({
      name:u.name.value.trim(), item:u.item.value.trim(), moves:[u.m1.value.trim(),u.m2.value.trim(),u.m3.value.trim(),u.m4.value.trim()], memo:u.memo.value.trim(),
      ev:{H:+u.ev.H.value||0,A:+u.ev.A.value||0,B:+u.ev.B.value||0,C:+u.ev.C.value||0,D:+u.ev.D.value||0,S:+u.ev.S.value||0},
      iv:{H:+u.iv.H.value||31,A:+u.iv.A.value||31,B:+u.iv.B.value||31,C:+u.iv.C.value||31,D:+u.iv.D.value||31,S:+u.iv.S.value||31},
      nature:{A:+u.nat.A.value,B:+u.nat.B.value,C:+u.nat.C.value,D:+u.nat.D.value,S:+u.nat.S.value},
      leftover:u.plusTo.value, autoPlus4:true
    });
  }
  return arr;
}
function writePartyToUI(arr){
  for(let i=1;i<=6;i++){
    const u=getPartyUI(i), d=arr[i-1]||partyEmpty();
    u.name.value=d.name||''; u.item.value=d.item||''; u.m1.value=d.moves?.[0]||''; u.m2.value=d.moves?.[1]||''; u.m3.value=d.moves?.[2]||''; u.m4.value=d.moves?.[3]||''; u.memo.value=d.memo||'';
    u.ev.H.value=d.ev?.H??0; u.ev.A.value=d.ev?.A??0; u.ev.B.value=d.ev?.B??0; u.ev.C.value=d.ev?.C??0; u.ev.D.value=d.ev?.D??0; u.ev.S.value=d.ev?.S??0;
    u.iv.H.value=d.iv?.H??31; u.iv.A.value=d.iv?.A??31; u.iv.B.value=d.iv?.B??31; u.iv.C.value=d.iv?.C??31; u.iv.D.value=d.iv?.D??31; u.iv.S.value=d.iv?.S??31;
    u.nat.A.value=(d.nature?.A??1.0).toFixed(1); u.nat.B.value=(d.nature?.B??1.0).toFixed(1); u.nat.C.value=(d.nature?.C??1.0).toFixed(1); u.nat.D.value=(d.nature?.D??1.0).toFixed(1); u.nat.S.value=(d.nature?.S??1.0).toFixed(1);
    u.plusTo.value=d.leftover || 'B';
    updateEVSum(i); updateNatureName(i);
  }
}
function updateEVSum(i){
  const u=getPartyUI(i);
  const vals=[u.ev.H,u.ev.A,u.ev.B,u.ev.C,u.ev.D,u.ev.S].map(x=>+x.value||0);
  const sum=vals.reduce((a,b)=>a+b,0);
  u.sum.textContent=`合計 ${sum} / 510`;
  const bad=sum>510; u.warn.classList.toggle('hidden', !bad);
}
function natureNameByMultipliers(m){
  // ちょうど +1.1 が1つ、-0.9が1つだけのときに名前推定（簡易）
  const up=Object.entries(m).filter(([,v])=>v>1.0);
  const down=Object.entries(m).filter(([,v])=>v<1.0);
  if(up.length!==1 || down.length!==1) return '—';
  const upStat = {A:'攻撃',B:'防御',C:'特攻',D:'特防',S:'素早'}[up[0][0]];
  const downStat = {A:'攻撃',B:'防御',C:'特攻',D:'特防',S:'素早'}[down[0][0]];
  return (NATURE_NAME_TABLE[upStat]||{})[downStat] || '—';
}
function updateNatureName(i){
  const u=getPartyUI(i);
  const name = natureNameByMultipliers({A:+u.nat.A.value,B:+u.nat.B.value,C:+u.nat.C.value,D:+u.nat.D.value,S:+u.nat.S.value});
  u.natureName.textContent = `性格：${name}`;
}
function presetEV(i, kind){
  const u=getPartyUI(i);
  const plus=u.plusTo.value; // 余り4の配分先
  const set=(H,A,B,C,D,S)=>{u.ev.H.value=H;u.ev.A.value=A;u.ev.B.value=B;u.ev.C.value=C;u.ev.D.value=D;u.ev.S.value=S;};
  if(kind==='AS'){ set(0,252,4,0,0,252); }
  if(kind==='CS'){ set(0,0,4,252,0,252); }
  if(kind==='AH'){ set(252,252,4,0,0,0); }
  if(kind==='HB'){ set(252,0,252,0,4,0); }
  if(kind==='HD'){ set(252,0,0,0,252,4); }
  // 余り先を上書きする場合はここで調整しても良い（既定どおりに据え置き）
  if(plus && ['H','A','B','C','D','S'].includes(plus)){
    // すでに +4 入っているケースはそのまま
  }
  updateEVSum(i);
}
function copyEV(i){
  const u=getPartyUI(i); const vals=[u.ev.H.value,u.ev.A.value,u.ev.B.value,u.ev.C.value,u.ev.D.value,u.ev.S.value];
  navigator.clipboard?.writeText(vals.join('-'));
  alert(`コピー: ${vals.join('-')}`);
}
function pasteEV(i){
  const u=getPartyUI(i);
  const s=prompt('貼り付け（形式: 252-0-4-0-0-252）'); if(!s) return;
  const m=s.trim().split(/[-\s,\/]+/).map(x=>parseInt(x,10));
  if(m.length!==6 || m.some(v=>isNaN(v))){ alert('6項目の数値が必要です'); return; }
  [u.ev.H.value,u.ev.A.value,u.ev.B.value,u.ev.C.value,u.ev.D.value,u.ev.S.value]=m.map(v=>clamp(v,0,252));
  if(u.lock.checked){ Object.values(u.ev).forEach(inp=> inp.value=String(Math.round(Number(inp.value)/4)*4)); }
  updateEVSum(i);
}

/* 保存系 */
function loadPartiesStore(){ try{return JSON.parse(localStorage.getItem(PARTY_KEY)||'{}');}catch{return{}} }
function savePartiesStore(obj){ localStorage.setItem(PARTY_KEY, JSON.stringify(obj)); refreshPartyList(); }
function refreshPartyList(){ const sel=$('partyList'), store=loadPartiesStore(), keys=Object.keys(store).sort(); sel.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join(''); }
function saveParty(){ const name=$('partySaveName').value.trim()||`party_${new Date().toISOString().slice(0,16).replace('T',' ')}`; const st=loadPartiesStore(); st[name]=readPartyFromUI(); savePartiesStore(st); alert(`保存しました：${name}`); }
function loadParty(){ const k=$('partyList').value; if(!k) return; const st=loadPartiesStore(); if(!st[k]) return; writePartyToUI(st[k]); }
function deleteParty(){ const k=$('partyList').value; if(!k) return; const st=loadPartiesStore(); delete st[k]; savePartiesStore(st); }

/* 1体保存（既存互換） */
function loadSinglesStore(){ try{return JSON.parse(localStorage.getItem(SINGLE_KEY)||'{}');}catch{return{}} }
function saveSinglesStore(obj){ localStorage.setItem(SINGLE_KEY, JSON.stringify(obj)); refreshSinglesListAll(); }
function getPartySlot(i){ const u=getPartyUI(i); return { name:u.name.value.trim(), item:u.item.value.trim(), moves:[u.m1.value.trim(),u.m2.value.trim(),u.m3.value.trim(),u.m4.value.trim()], memo:u.memo.value.trim() }; }
function saveSingle(i){ const key=prompt('この1体の保存名', `mon${i}_${Date.now()}`); if(!key) return; const st=loadSinglesStore(); st[key]=getPartySlot(i); saveSinglesStore(st); alert(`1体保存：${key}`); }
function applySingle(i){ const u=getPartyUI(i), key=prompt('読み出すキー（ドロップダウン未使用版）', ''); if(!key) return; const d=loadSinglesStore()[key]; if(!d) return; u.name.value=d.name||''; u.item.value=d.item||''; [u.m1.value,u.m2.value,u.m3.value,u.m4.value]=d.moves||['','','','']; u.memo.value=d.memo||''; }
function refreshSinglesListAll(){ /* 省略（必要ならプルダウン再配置可） */ }

/* 反映系（実数値を計算して送る） */
function baseForStatFromName(name, stat){
  const d=pickDexByName(name||''); return d?.base?.[stat] ?? 100;
}
function calcAllStatsFromParty(i){
  const u=getPartyUI(i);
  const base={HP:baseForStatFromName(u.name.value,'HP'), 攻撃:baseForStatFromName(u.name.value,'攻撃'), 防御:baseForStatFromName(u.name.value,'防御'), 特攻:baseForStatFromName(u.name.value,'特攻'), 特防:baseForStatFromName(u.name.value,'特防'), 素早:baseForStatFromName(u.name.value,'素早')};
  const iv={H:+u.iv.H.value||31,A:+u.iv.A.value||31,B:+u.iv.B.value||31,C:+u.iv.C.value||31,D:+u.iv.D.value||31,S:+u.iv.S.value||31};
  const ev={H:+u.ev.H.value||0,A:+u.ev.A.value||0,B:+u.ev.B.value||0,C:+u.ev.C.value||0,D:+u.ev.D.value||0,S:+u.ev.S.value||0};
  const nat={A:+u.nat.A.value||1.0,B:+u.nat.B.value||1.0,C:+u.nat.C.value||1.0,D:+u.nat.D.value||1.0,S:+u.nat.S.value||1.0};
  return {
    HP: calcStat(base.HP, iv.H, ev.H, 1.0, true),
    攻撃: calcStat(base.攻撃, iv.A, ev.A, nat.A, false),
    防御: calcStat(base.防御, iv.B, ev.B, nat.B, false),
    特攻: calcStat(base.特攻, iv.C, ev.C, nat.C, false),
    特防: calcStat(base.特防, iv.D, ev.D, nat.D, false),
    素早: calcStat(base.素早, iv.S, ev.S, nat.S, false),
  };
}
function applyPartyToCalc(i, side){
  const st=calcAllStatsFromParty(i);
  if(side==='atk'){ $('atkA').value=st.攻撃; $('atkS').value=st.特攻; alert(`攻撃: ${st.攻撃} / 特攻: ${st.特攻} を反映`); }
  else{ $('defHP').value=st.HP; $('defB').value=st.防御; $('defD').value=st.特防; resetHP(); alert(`HP:${st.HP} 防御:${st.防御} 特防:${st.特防} を反映`); }
}
function applyPartyToMulti(i){
  const st=calcAllStatsFromParty(i);
  // とりあえず相手1に反映（用途により1/2/3へ拡張可）
  $('d1HP').value=st.HP; $('d1B').value=st.防御; $('d1D').value=st.特防; mResetOne(1);
  alert(`相手1へ HP:${st.HP} 防御:${st.防御} 特防:${st.特防} を反映`);
}

/* ====== 構築データ（手動インポート＋ページネーション） ====== */
let TEAMS=[], TEAMS_F=[], teamPage=1, teamPageSize=50;
$('teamFile').addEventListener('change', async (e)=>{
  const f=e.target.files?.[0]; if(!f) return;
  const text = await f.text();
  let data=null;
  if(f.name.endsWith('.json')){ try{ data=JSON.parse(text); }catch{ alert('JSON解析エラー'); return; } }
  else { data=parseCSV(text); }
  if(!data || !data.length){ alert('データが空か読み込めません'); return; }
  TEAMS = normalizeTeams(data);
  TEAMS_F = TEAMS; teamPage=1; renderTeams();
  $('teamMeta').textContent = `${f.name} / ${TEAMS.length}件`;
});
$('teamPageSize').addEventListener('change', ()=>{ teamPageSize=Number($('teamPageSize').value)||50; renderTeams(); });
$('teamQuery').addEventListener('input', ()=>{ const q=$('teamQuery').value.trim(); TEAMS_F = filterTeams(TEAMS,q); teamPage=1; renderTeams(); });

function parseCSV(text){
  // 簡易CSV（ダブルクォート対応）
  const lines=text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(x=>x.length>0);
  const out=[];
  let headers=null;
  for(let i=0;i<lines.length;i++){
    const row=parseCSVLine(lines[i]); if(!row) continue;
    if(!headers){ headers=row; continue; }
    const obj={}; headers.forEach((h,idx)=> obj[h]=row[idx]);
    out.push(obj);
  }
  return out;
}
function parseCSVLine(line){
  const res=[]; let cur=''; let inQ=false;
  for(let i=0;i<line.length;i++){
    const c=line[i];
    if(inQ){
      if(c=='"'){ if(line[i+1]=='"'){ cur+='"'; i++; } else { inQ=false; } }
      else cur+=c;
    }else{
      if(c==','){ res.push(cur); cur=''; }
      else if(c=='"'){ inQ=true; }
      else cur+=c;
    }
  }
  res.push(cur); return res;
}
function normalizeTeams(rows){
  // ざっくり：1チーム = 6行構成（IDでグルーピング） or 1行に6匹
  // ここでは、よくある "poke1_name ... poke6_name" 形式 / "name1..6" 形式 / メンバー配列 を吸収
  const teams=[];
  for(const r of rows){
    // JSONライク：{ members:[{name,item,tera},...6] }
    if(Array.isArray(r.members)&&r.members.length){
      teams.push({meta:{season:r.season||'',rule:r.rule||'',rank:r.rank||r.rating||''}, members:r.members.slice(0,6).map(m=>({name:m.name||m.pokemon||'', item:m.item||m.持ち物||'', tera:m.tera||m.テラ||m.テラタイプ||''}))});
      continue;
    }
    // 1行に6匹（name1..6 / poke1_name..poke6_name）
    const mem=[];
    for(let i=1;i<=6;i++){
      const name = r[`name${i}`] || r[`poke${i}_name`] || r[`pokemon${i}`] || r[`ポケモン${i}`] || '';
      if(!name) continue;
      const item = r[`item${i}`] || r[`poke${i}_item`] || r[`持ち物${i}`] || '';
      const tera = r[`tera${i}`] || r[`poke${i}_tera`] || r[`テラ${i}`] || r[`テラタイプ${i}`] || '';
      mem.push({name,item,tera});
    }
    if(mem.length){
      teams.push({meta:{season:r.season||r.シーズン||'',rule:r.rule||r.ルール||'',rank:r.rank||r.順位||r.rating||r.レート||''}, members:mem});
    }
  }
  return teams;
}
function filterTeams(src, q){
  if(!q) return src;
  const n=normalizeJP(q);
  return src.filter(t=>{
    const meta = `${t.meta.season} ${t.meta.rule} ${t.meta.rank}`.toLowerCase();
    const any = t.members.some(m=>{
      const s = `${m.name} ${m.item} ${m.tera}`; return normalizeJP(s).includes(n);
    });
    return meta.includes(q.toLowerCase()) || any;
  });
}
function teamsPrev(){ if(teamPage>1){ teamPage--; renderTeams(); } }
function teamsNext(){ const pages=Math.max(1,Math.ceil(TEAMS_F.length/teamPageSize)); if(teamPage<pages){ teamPage++; renderTeams(); } }
function renderTeams(){
  const list=$('teamsList'); list.innerHTML='';
  const pages=Math.max(1,Math.ceil(TEAMS_F.length/teamPageSize));
  setText('teamPageInfo', `${teamPage} / ${pages}`);
  const start=(teamPage-1)*teamPageSize, end=Math.min(TEAMS_F.length, start+teamPageSize);
  for(let i=start;i<end;i++){
    const t=TEAMS_F[i];
    const card=document.createElement('div'); card.className='team-card';
    const h=document.createElement('div'); h.innerHTML=`<div class="tight"><span class="pill">S:${t.meta.season||'-'}</span><span class="pill">ルール:${t.meta.rule||'-'}</span><span class="pill">順位/レート:${t.meta.rank||'-'}</span></div>`;
    const mons=document.createElement('div'); mons.className='mons';
    for(let k=0;k<6;k++){
      const m=t.members[k]||{name:'',item:'',tera:''};
      const mon=document.createElement('div'); mon.className='mon';
      const dex=pickDexByName(m.name||''); const no=dex?.no;
      const img=document.createElement('img');
      if(no) img.src=`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${no}.png`;
      else img.style.display='none';
      mon.appendChild(img);
      const nm=document.createElement('div'); nm.textContent=m.name||'—'; mon.appendChild(nm);
      const small=document.createElement('div'); small.className='muted'; small.textContent=`テラ:${m.tera||'-'} / 持:${m.item||'-'}`; mon.appendChild(small);
      mons.appendChild(mon);
    }
    const ops=document.createElement('div'); ops.className='tight'; ops.style.marginTop='8px';
    const btnParty=document.createElement('button'); btnParty.className='btn'; btnParty.textContent='→ パーティへ一括反映'; btnParty.onclick=()=> applyTeamToParty(t);
    const btnSingles=document.createElement('button'); btnSingles.className='btn btn-ghost'; btnSingles.textContent='→ 1体保存（6体）'; btnSingles.onclick=()=> addTeamToSingles(t);
    ops.appendChild(btnParty); ops.appendChild(btnSingles);

    card.appendChild(h); card.appendChild(mons); card.appendChild(ops);
    list.appendChild(card);
  }
}
function applyTeamToParty(t){
  const arr=readPartyFromUI();
  for(let i=0;i<6;i++){
    const m=t.members[i];
    if(!m) continue;
    arr[i] = arr[i] || partyEmpty();
    arr[i].name = m.name || arr[i].name;
    arr[i].item = m.item || arr[i].item;
    // EV/IV/補正は空のまま（あなたのEV設計で詰める）
  }
  writePartyToUI(arr);
  alert('このチームをパーティに反映しました（名前/持ち物のみ）。');
}
function addTeamToSingles(t){
  const st=loadSinglesStore();
  t.members.forEach((m,idx)=>{ if(!m?.name) return; const key=`${m.name}_${Date.now()}_${idx+1}`; st[key]={name:m.name||'',item:m.item||'',moves:['','','',''],memo:`テラ:${m.tera||''}`}; });
  saveSinglesStore(st);
  alert('6体を1体保存に追加しました。');
}

/* ====== メモ ====== */
const MEMO_KEY='match_memos_v1';
function memoReadUI(){ return { my:[$('my1Name').value,$('my2Name').value,$('my3Name').value], op:[$('op1Name').value,$('op2Name').value,$('op3Name').value], notes:{ my1:$('my1Note').value,my2:$('my2Note').value,my3:$('my3Note').value, op1:$('op1Note').value,op2:$('op2Note').value,op3:$('op3Note').value, all:$('matchNote').value } }; }
function memoWriteUI(d){ $('my1Name').value=d?.my?.[0]||''; $('my2Name').value=d?.my?.[1]||''; $('my3Name').value=d?.my?.[2]||''; $('op1Name').value=d?.op?.[0]||''; $('op2Name').value=d?.op?.[1]||''; $('op3Name').value=d?.op?.[2]||''; $('my1Note').value=d?.notes?.my1||''; $('my2Note').value=d?.notes?.my2||''; $('my3Note').value=d?.notes?.my3||''; $('op1Note').value=d?.notes?.op1||''; $('op2Note').value=d?.notes?.op2||''; $('op3Note').value=d?.notes?.op3||''; $('matchNote').value=d?.notes?.all||''; }
function memoLoadStore(){ try{return JSON.parse(localStorage.getItem(MEMO_KEY)||'{}');}catch{return{}} }
function memoSaveStore(o){ localStorage.setItem(MEMO_KEY, JSON.stringify(o)); memoRefreshList(); }
function memoRefreshList(){ const st=memoLoadStore(), keys=Object.keys(st).sort(); $('memoList').innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join(''); }
function memoSave(){ const name=$('memoSaveName').value.trim()||`memo_${new Date().toISOString().slice(0,16).replace('T',' ')}`; const st=memoLoadStore(); st[name]=memoReadUI(); memoSaveStore(st); alert(`保存：${name}`); }
function memoLoad(){ const k=$('memoList').value; if(!k) return; const st=memoLoadStore(); if(!st[k]) return; memoWriteUI(st[k]); }
function memoDelete(){ const k=$('memoList').value; if(!k) return; const st=memoLoadStore(); delete st[k]; memoSaveStore(st); }

/* ====== タブ切替 ====== */
function switchTab(key){
  document.querySelectorAll('.tab').forEach(b=> b.classList.toggle('active', b.dataset.tab===key));
  ['calc','multi','dex','teams','memo','timer'].forEach(k=> $('tab-'+k).classList.toggle('hidden', k!==key));
  localStorage.setItem('activeTab', key); window.scrollTo({top:0,behavior:'smooth'});
}
document.addEventListener('click',(e)=>{ const btn=e.target.closest('.tab'); if(!btn) return; e.preventDefault(); switchTab(btn.dataset.tab); });

/* ====== タイマー ====== */
let timerMs=600000,timerRunning=false,timerEndAt=0,timerId=null;
function fmt(ms){ ms=Math.max(0,ms|0); const s=Math.floor(ms/1000); const mm=String(Math.floor(s/60)).padStart(2,'0'); const ss=String(s%60).padStart(2,'0'); return `${mm}:${ss}`; }
function drawTimer(){ const now=Date.now(); const remain=timerRunning?Math.max(0,timerEndAt-now):timerMs; $('timerDisplay').textContent=fmt(remain); if(timerRunning&&remain<=0){ stopTimer(false); if(navigator.vibrate) navigator.vibrate([200,100,200]); alert('タイマー終了！'); } }
function stopTimer(save=true){ if(timerId){clearInterval(timerId);timerId=null;} timerRunning=false; $('timerStartBtn').textContent='開始'; if(save)localStorage.setItem('timerMs',String(timerMs)); }
function startTimer(){ if(timerRunning) return; timerRunning=true; timerEndAt=Date.now()+timerMs; $('timerStartBtn').textContent='一時停止'; timerId=setInterval(drawTimer,200); }
function toggleTimer(){ if(!timerRunning){ const m=clamp(num('timerMin',10),0,999), s=clamp(num('timerSec',0),0,59); timerMs=(m*60+s)*1000; } timerRunning?stopTimer():startTimer(); }
function resetTimer(){ stopTimer(false); const m=clamp(num('timerMin',10),0,999), s=clamp(num('timerSec',0),0,59); timerMs=(m*60+s)*1000; drawTimer(); }

/* ====== 初期化 ====== */
(function init(){
  // 計算タブ：ランク・ヒット
  const atkStage=$('atkStage'), defStage=$('defStage'), hits=$('hits');
  for(let i=-6;i<=6;i++){ const o1=document.createElement('option');o1.value=i;o1.textContent=i; if(i===0)o1.selected=true; atkStage.appendChild(o1); const o2=document.createElement('option');o2.value=i;o2.textContent=i; if(i===0)o2.selected=true; defStage.appendChild(o2); }
  for(let i=1;i<=10;i++){ const o=document.createElement('option'); o.value=i; o.textContent=i; if(i===1)o.selected=true; hits.appendChild(o); }
  $('defHP').addEventListener('input', resetHP); defCurHP=num('defHP',0); syncHPBar();

  // 1対3
  const mAtk=$('mAtkStage'), mHits=$('mHits');
  for(let i=-6;i<=6;i++){ const o=document.createElement('option');o.value=i;o.textContent=i; if(i===0)o.selected=true; mAtk.appendChild(o); }
  for(let i=1;i<=10;i++){ const o=document.createElement('option');o.value=i;o.textContent=i; if(i===1)o.selected=true; mHits.appendChild(o); }
  [1,2,3].forEach(i=>{ const s=$(`d${i}DefStage`); for(let r=-6;r<=6;r++){ const o=document.createElement('option');o.value=r;o.textContent=r; if(r===0)o.selected=true; s.appendChild(o); } mResetOne(i); $(`d${i}HP`).addEventListener('input',()=>mResetOne(i)); });

  // パーティ
  buildPartyUI(); refreshPartyList();

  // 図鑑
  loadDexFromMaster().then(()=>{ $('dexSearch').addEventListener('change',()=>showDexInfo($('dexSearch').value)); hookMultiDexBoxes(); });
  hookMultiDexBoxes(); // 先にフック

  // タブ復元
  window.addEventListener('DOMContentLoaded',()=>{ switchTab(localStorage.getItem('activeTab')||'calc'); });

  // タイマー復元
  const saved=Number(localStorage.getItem('timerMs')); if(Number.isFinite(saved)&&saved>0) timerMs=saved;
  $('timerMin').value=Math.floor((timerMs/1000)/60); $('timerSec').value=Math.floor((timerMs/1000)%60); drawTimer();

  // メモ一覧
  memoRefreshList();
})();
