/* ===== タブ切替 ===== */
const tabs = document.querySelectorAll('.tab');
const sections = {
  calc:  document.getElementById('tab-calc'),
  stats: document.getElementById('tab-stats'),
  v13:   document.getElementById('tab-v13'),
  sr:    document.getElementById('tab-sr'),
  teams: document.getElementById('tab-teams'),
  party: document.getElementById('tab-party'),
  memo:  document.getElementById('tab-memo')
};
for (const b of tabs){
  b.addEventListener('click', ()=>{
    tabs.forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    Object.values(sections).forEach(s=>s.classList.add('hidden'));
    sections[b.dataset.tab].classList.remove('hidden');
  });
}

/* ===== 共通 ===== */
function set(id,v){ const el=document.getElementById(id); if(el) el.value=v; }
function val(id,def){ const el=document.getElementById(id); const n=Number(el?.value); return Number.isFinite(n)?n:def; }
function pct(x,tot){ return tot? (x/tot*100).toFixed(1):'0.0'; }
function ceilDiv(a,b){ return Math.floor((a+b-1)/(b||1)); }

/* ===== ランク倍率 ===== */
const RANK={-6:2/8,-5:2/7,-4:2/6,-3:2/5,-2:2/4,-1:2/3,0:1,1:1.5,2:2,3:2.5,4:3,5:3.5,6:4};
function fillSelect(id, arr, def){ const s=document.getElementById(id); s.innerHTML=''; arr.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;s.appendChild(o)}); if(def!==undefined) s.value=String(def); }
fillSelect('atkRank', Object.keys(RANK), 0);
fillSelect('defRank', Object.keys(RANK), 0);
fillSelect('hits', Array.from({length:10},(_,i)=>i+1), 1);
['v13_atkRank','v13_defRank1','v13_defRank2','v13_defRank3','v13_hits'].forEach(i=> fillSelect(i, Object.keys(RANK), 0));

function fillType(id){ const s=document.getElementById(id); ['0.25','0.5','1','2','4'].forEach(x=>{const o=document.createElement('option');o.textContent=o.value=x;s.appendChild(o)}); s.value='1';}
['v13_type1','v13_type2','v13_type3'].forEach(fillType);

function fillWeather(id){ const w=['none','sun','rain','sand','snow']; const s=document.getElementById(id); w.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;s.appendChild(o)}); s.value='none';}
['v13_weather1','v13_weather2','v13_weather3'].forEach(fillWeather);

function fillMoveType(id){ const t=['炎','水','電気','草','氷','格闘','毒','地面','飛行','エスパー','虫','岩','ゴースト','ドラゴン','悪','鋼','フェアリー','ノーマル']; const s=document.getElementById(id); t.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;s.appendChild(o)}); s.value='ノーマル';}
fillMoveType('moveType'); fillMoveType('v13_moveType');

/* ===== 実数値計算 UI ===== */
const STAT_KEYS=['HP','攻撃','防御','特攻','特防','素早'];
function buildStatsUI(side){
  const box=document.getElementById('stats-'+side); box.innerHTML='';
  const wrap=document.createElement('div');
  STAT_KEYS.forEach(k=>{
    const row=document.createElement('div'); row.className='row';
    row.innerHTML=`<label>${k}</label>
      <div class="flex" style="gap:6px;flex-wrap:wrap">
        <input type="number" placeholder="種族値" id="${side}_base_${k}" style="width:90px">
        <input type="number" placeholder="個体値(0-31)" id="${side}_iv_${k}" value="31" style="width:110px">
        <input type="number" placeholder="努力値(0-252)" id="${side}_ev_${k}" value="0" style="width:110px">
        <select id="${side}_nat_${k}" style="width:90px">
          <option value="1.1">1.1</option><option value="1.0" selected>1.0</option><option value="0.9">0.9</option>
        </select>
        <input type="number" id="${side}_final_${k}" placeholder="実数値" readonly style="width:110px">
        <button class="btn btn-ghost small" type="button" onclick="setEV('${side}','${k}',0)">EV0</button>
        <button class="btn btn-ghost small" type="button" onclick="setEV('${side}','${k}',252)">EV252</button>
      </div>`;
    wrap.appendChild(row);
  });
  box.appendChild(wrap);
}
buildStatsUI('atk'); buildStatsUI('def');

function calcStat(base, iv, ev, lv, nat, isHP){
  if(isHP){ return Math.floor(((2*base+iv+Math.floor(ev/4))*lv)/100)+lv+10; }
  const v=Math.floor(((2*base+iv+Math.floor(ev/4))*lv)/100)+5;
  return Math.floor(v*nat);
}
function recalcSide(side){
  STAT_KEYS.forEach(k=>{
    const base=+val(`${side}_base_${k}`,50), iv=+val(`${side}_iv_${k}`,31), ev=+val(`${side}_ev_${k}`,0), nat=+val(`${side}_nat_${k}`,1);
    const final=calcStat(base,iv,ev,50,nat,(k==='HP')); set(`${side}_final_${k}`,final);
  });
}
function setEV(side,k,v){ set(`${side}_ev_${k}`,v); recalcSide(side); }
['atk','def'].forEach(s=>{ STAT_KEYS.forEach(k=>{ ['base','iv','ev','nat'].forEach(t=>{ const id=`${s}_${t}_${k}`; document.addEventListener('input',e=>{ if(e.target && e.target.id===id) recalcSide(s); }); }); }); });
recalcSide('atk'); recalcSide('def');

document.getElementById('btnApplyStats').addEventListener('click',()=>{
  set('atkStat', val('atk_final_攻撃',172));
  set('defStat', val('def_final_防御',120));
  set('defHP',   val('def_final_HP',155));
  tabs.forEach(x=>x.classList.remove('active')); document.querySelector('.tab[data-tab="calc"]').classList.add('active');
  Object.values(sections).forEach(s=>s.classList.add('hidden')); sections.calc.classList.remove('hidden');
});

/* ===== 図鑑連携（実数値タブ先頭の検索→ベース反映） ===== */
function rebuildDexList() {
  const dl = document.getElementById('dexList'); if (!dl) return;
  dl.innerHTML = '';
  (window.DEX || []).slice(0, 5000).forEach(p => {
    const opt = document.createElement('option');
    opt.value = `${p.No} ${p.名前}`;
    dl.appendChild(opt);
  });
}
document.addEventListener('dex-ready', rebuildDexList);

function applyMonToBase(side, mon) {
  if (!mon) return;
  const map = { 'HP':'HP','攻撃':'攻撃','防御':'防御','特攻':'特攻','特防':'特防','素早':'素早' };
  Object.keys(map).forEach(k => {
    const id = `${side}_base_${k}`;
    const el = document.getElementById(id);
    if (el && mon[k] != null) el.value = mon[k];
  });
  recalcSide(side);
}
document.addEventListener('input', (e) => {
  if (e.target?.id === 'dexSearchAtk') {
    const mon = window.__DEX__?.findMon(e.target.value.trim()) || null;
    if (mon) applyMonToBase('atk', mon);
  } else if (e.target?.id === 'dexSearchDef') {
    const mon = window.__DEX__?.findMon(e.target.value.trim()) || null;
    if (mon) applyMonToBase('def', mon);
  }
});
document.getElementById('btnDexLoad')?.addEventListener('click', () => window.__DEX__?.pickAndLoad());
document.getElementById('btnDexClear')?.addEventListener('click', () => window.__DEX__?.clearLocal());

/* ===== ダメージ計算 ===== */
const resultBox=document.getElementById('result'), hpbar=document.getElementById('hpbar'), logBox=document.getElementById('logBox'), memoLog=document.getElementById('memoLog');
let LOG=[]; function writeLog(s){ LOG.push(s); logBox.value=LOG.join('\n'); if(memoLog) memoLog.value=LOG.join('\n'); document.getElementById('badgeLog').textContent=`ログ: ${LOG.length}件`; }
document.getElementById('btnClearLog').addEventListener('click',()=>{ LOG=[]; writeLog(''); });
let undoStack=[]; document.getElementById('btnUndo').addEventListener('click',()=>{ if(!undoStack.length) return; const last=undoStack.pop(); logBox.value=last.log; if(memoLog) memoLog.value=last.log; set('defHP', last.hp); hpbar.style.width= last.hpPct; });

function dmgRange({level=50,power,atk,def,stab=1,typeMul=1,rankAtk=1,rankDef=1,extra=1,mode='phys',crit=false,moveType='ノーマル',weather='none', rockInSand=false, iceInSnow=false}){
  let weatherMul=1;
  if(weather==='sun'){ if(moveType==='炎') weatherMul=1.5; if(moveType==='水') weatherMul=0.5; }
  if(weather==='rain'){ if(moveType==='水') weatherMul=1.5; if(moveType==='炎') weatherMul=0.5; }
  if(weather==='sand' && mode==='spec' && rockInSand){ def = Math.floor(def*1.5); }
  if(weather==='snow' && mode==='phys' && iceInSnow){ def = Math.floor(def*1.5); }
  let atkMul=rankAtk, defMul=rankDef;
  if(crit){ defMul=1; }
  const base=Math.floor(level*2/5)+2;
  const core=Math.floor(Math.floor(base*power*(atk*atkMul)/(def*defMul))/50)+2;
  const min=Math.floor(core*stab*typeMul*0.85*weatherMul*extra);
  const max=Math.floor(core*stab*typeMul*1.00*weatherMul*extra);
  return [min,max];
}

document.getElementById('btnCalc').addEventListener('click',()=>{
  const atkStat=val('atkStat',172), defStat0=val('defStat',120), hp0=val('defHP',155);
  const power=val('power',80), stab=+document.getElementById('stab').value, typeMul=+document.getElementById('typeMul').value;
  const rankAtk=RANK[+document.getElementById('atkRank').value], rankDef=RANK[+document.getElementById('defRank').value];
  const extra=val('extra',1), mode=document.getElementById('mode').value, moveType=document.getElementById('moveType').value;
  const weather=document.getElementById('weather').value, crit=(+document.getElementById('crit').value)>1, hits=+document.getElementById('hits').value;
  const rockInSand=document.getElementById('chkRockInSand').checked, iceInSnow=document.getElementById('chkIceInSnow').checked;

  const [mn,mx]=dmgRange({power,atk:atkStat,def:defStat0,stab,typeMul,rankAtk,rankDef,extra,mode,crit,moveType,weather,rockInSand,iceInSnow});
  const totMin=mn*hits, totMax=mx*hits;
  const hp=hp0; const remMin=Math.max(0,hp-totMax), remMax=Math.max(0,hp-totMin);

  let ko='';
  if(totMin>=hp){ ko='確定1発'; }
  else if(totMax>=hp){ ko='乱数1発（高乱数）'; }
  else { const a=ceilDiv(hp,mn||1), b=ceilDiv(hp,mx||1); ko=(a===b)?`確定${a}発`:`乱数${a}～${b}発`; }

  resultBox.innerHTML = `
    <div class="grid grid-3">
      <div class="card"><div class="small muted">1発あたり</div><div><b>${mn} ～ ${mx}</b></div></div>
      <div class="card"><div class="small muted">${hits}回合計</div><div><b>${totMin} ～ ${totMax}</b></div></div>
      <div class="card"><div class="small muted">残りHP</div><div><b>${remMin} ～ ${remMax}</b>（${pct(remMin,hp)}% ～ ${pct(remMax,hp)}%）</div></div>
    </div>
    <div class="small">判定：<b>${ko}</b>　最小乱数ダメージ：<b>${mn}</b> / 最大乱数ダメージ：<b>${mx}</b></div>
  `;
  const remainPct = Math.max(0, 100 - Math.min(100, (totMax/hp*100)));
  hpbar.style.width = `${remainPct}%`;

  undoStack.push({log:logBox.value, hp:hp0, hpPct:`100%`});
  writeLog(`[${new Date().toLocaleTimeString()}] 威力${power} STAB${stab} 相性${typeMul} 天候${weather}${rockInSand?'(岩SpD1.5)':''}${iceInSnow?'(氷Def1.5)':''} 急所${crit?'有':'無'} 攻R${document.getElementById('atkRank').value} 防R${document.getElementById('defRank').value} hit${hits} → 1発:${mn}-${mx} 合計:${totMin}-${totMax} | ${ko}`);
});

/* ===== 1対3 ===== */
function calcOne(i){
  const atk=val('v13_atk',172), power=val('v13_power',80), stab=+val('v13_stab',1.5), rankAtk=RANK[+val('v13_atkRank',0)], extra=val('v13_extra',1);
  const mode=document.getElementById('v13_mode').value, hits=+val('v13_hits',1), moveType=document.getElementById('v13_moveType','ノーマル');
  const def=val(`v13_def${i}`,120), rankDef=RANK[+val(`v13_defRank${i}`,0)], hp=val(`v13_hp${i}`,155);
  const typeMul=+val(`v13_type${i}`,1), weather=document.getElementById(`v13_weather${i}`).value;
  const rockInSand=document.getElementById(`v13_rock${i}`).checked, iceInSnow=document.getElementById(`v13_ice${i}`).checked;
  const crit=(+val('v13_crit',1)>1);

  const [mn,mx]=dmgRange({power,atk,def,stab,typeMul,rankAtk,rankDef,extra,mode,crit,moveType,weather,rockInSand,iceInSnow});
  const totMin=mn*hits, totMax=mx*hits;
  let txt=`1発:${mn}-${mx} / 合計:${totMin}-${totMax} | `;
  if(totMin>=hp) txt+='確定1発';
  else if(totMax>=hp) txt+='乱数1発（高乱数）';
  else {const a=ceilDiv(hp,mn||1), b=ceilDiv(hp,mx||1); txt+=(a===b)?`確定${a}発`:`乱数${a}～${b}発`;}
  document.getElementById(`v13_out${i}`).textContent=txt;
}
document.getElementById('btnV13').addEventListener('click',()=>[1,2,3].forEach(calcOne));

/* ===== ステルスロック ===== */
const SR_MAP={'等倍':1,'1/2':0.5,'1/4':0.25,'2倍':2,'4倍':4};
(function(){ const s=document.getElementById('sr_type'); ['1/4','1/2','等倍','2倍','4倍'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;s.appendChild(o)}); s.value='等倍';})();
document.getElementById('btnSR').addEventListener('click',()=>{ const hp=val('sr_hp',155), t=document.getElementById('sr_type').value; const mul=SR_MAP[t]||1; const dmg=Math.floor(hp*0.125*mul); set('sr_result',`${dmg} ダメージ（${pct(dmg,hp)}%）`); });

/* ===== 構築インポート ===== */
let ALL_TEAMS=[]; function setTeams(arr){ ALL_TEAMS=Array.isArray(arr)?arr:[]; document.getElementById('badgeTeams').textContent=`構築: ${ALL_TEAMS.length}件`; renderTeamsList(); }
const diagBox=document.getElementById('diagBox');
document.getElementById('diagBtn').addEventListener('click',()=>{ diagBox.classList.toggle('hidden'); });
function setText(id,txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }

async function handleLoad(){
  const f=document.getElementById('fileInput').files[0];
  const pasted=document.getElementById('pasteBox').value.trim();
  const info=document.getElementById('loadInfo');
  let txt=''; if(f){txt=await f.text();} else if(pasted){txt=pasted;} else {info.textContent='入力がありません'; return;}
  const head=txt.slice(0,400); let teams=[], mode='', jsonErr='', rowsCount=0;
  try{
    const json=JSON.parse(txt); mode='JSON';
    if(json && json.teams){ teams=normalizeFromPKDB(json);}
    else{
      const asRows=Array.isArray(json)?json:(Array.isArray(json.rows)?json.rows:null);
      if(asRows){ teams=normalizeTeams(asRows); rowsCount=asRows.length; }
    }
  }catch(e){ jsonErr=String(e.message||e); }
  if(!teams.length){ const rows=parseCSV(txt); rowsCount=rows.length; mode=mode||'CSV/TSV'; teams=normalizeTeams(rows); }

  document.getElementById('filterBox').value='';
  setText('diagMode',mode); setText('diagCount', String(rowsCount||teams.length)); setText('diagErr', jsonErr||'(なし)'); setText('diagHead', head);
  if(!teams.length){ info.textContent='0件：形式をご確認ください'; } else { info.textContent=`読み込み成功：${teams.length}件`; }
  setTeams(teams);
}
document.getElementById('loadBtn').addEventListener('click',handleLoad);
document.getElementById('clearBtn').addEventListener('click',()=>{ document.getElementById('fileInput').value=''; document.getElementById('pasteBox').value=''; document.getElementById('loadInfo').textContent='未読込'; document.getElementById('filterBox').value=''; setTeams([]); });
document.getElementById('demoBtn').addEventListener('click',()=>{ const demo={season:33,rule:"シングル",teams:[{rank:1,rating_value:2180.889,team:[{pokemon:"ドドゲザン",form:"",terastal:"ほのお",item:"ラムのみ"},{pokemon:"マタドガス",form:"ガラルのすがた",terastal:"ノーマル",item:"くろいヘドロ"},{pokemon:"キラフロル",form:"",terastal:"ノーマル",item:"きあいのタスキ"},{pokemon:"ディンルー",form:"",terastal:"はがね",item:"オボンのみ"},{pokemon:"ルギア",form:"",terastal:"ノーマル",item:"たべのこし"},{pokemon:"コライドン",form:"",terastal:"ほのお",item:"こだわりスカーフ"}]},{rank:2,rating_value:2177.16,team:[{pokemon:"ミライドン",form:"",terastal:"フェアリー",item:"こだわりメガネ"},{pokemon:"ホウオウ",form:"",terastal:"ノーマル",item:"あつぞこブーツ"},{pokemon:"テツノワダチ",form:"",terastal:"ノーマル",item:"こだわりハチマキ"},{pokemon:"ディンルー",form:"",terastal:"フェアリー",item:"たべのこし"},{pokemon:"パオジアン",form:"",terastal:"あく",item:"きあいのタスキ"},{pokemon:"ブリジュラス",form:"",terastal:"フェアリー",item:"オボンのみ"}]}]}; const t=normalizeFromPKDB(demo); setTeams(t); setText('loadInfo',`デモ読込：${t.length}件`); });

function renderTeamsList(){
  const box=document.getElementById('teamsList'); const f=(document.getElementById('filterBox').value||'').trim().toLowerCase(); box.innerHTML='';
  const src=!f?ALL_TEAMS:ALL_TEAMS.filter(t=>{
    const inMeta=`${t.meta.season} ${t.meta.rule} ${t.meta.rank} ${t.meta.rating}`.toLowerCase();
    const inMembers=t.members.map(m=>`${m.name} ${m.item} ${m.tera}`.toLowerCase()).join(' ');
    return inMeta.includes(f)||inMembers.includes(f);
  });
  setText('filterCount',`${src.length} / ${ALL_TEAMS.length}`);
  if(!src.length){ const d=document.createElement('div'); d.className='muted'; d.textContent='0件です。'; box.appendChild(d); return; }
  for(const t of src){
    const card=document.createElement('div'); card.className='card';
    const head=document.createElement('div'); head.className='flex';
    head.innerHTML=`<span class="pill">S${t.meta.season||'?'} / ${t.meta.rule||''}</span>`+(t.meta.rank?`<span class="pill">順位:${t.meta.rank}</span>`:'')+(t.meta.rating?`<span class="pill">レート:${t.meta.rating}</span>`:'');
    const mons=document.createElement('div'); mons.className='mons';
    t.members.forEach((m,i)=>{ const d=document.createElement('div'); d.className='mon'; d.innerHTML=`<div style="font-weight:700">${i+1}. ${escapeHtml(m.name||'-')}</div><div class="muted">${escapeHtml(m.item||'')}</div><div class="muted">テラ:${escapeHtml(m.tera||'')}</div>`; mons.appendChild(d); });
    const btn=document.createElement('button'); btn.className='btn'; btn.textContent='このチームをパーティへ反映';
    btn.addEventListener('click',()=>applyTeamToParty(t));
    card.appendChild(head); card.appendChild(mons); card.appendChild(document.createElement('hr')); card.appendChild(btn); box.appendChild(card);
  }
}
document.getElementById('filterBox').addEventListener('input', renderTeamsList);

/* ===== パーティ ===== */
const partyGrid=document.getElementById('partyGrid');
function buildPartyUI(){ partyGrid.innerHTML=''; for(let i=1;i<=6;i++){ const c=document.createElement('div'); c.className='card'; c.innerHTML=`<div class="slot-h"><strong>スロット ${i}</strong> <small id="p${i}Meta" class="muted"></small></div><div class="row"><label>名前</label><input id="p${i}Name" type="text" placeholder="例：サーフゴー"></div><div class="row"><label>持ち物</label><input id="p${i}Item" type="text"></div><div class="row"><label>テラタイプ</label><input id="p${i}Tera" type="text"></div>`; partyGrid.appendChild(c); } }
buildPartyUI();
function refreshPartyJSON(){ const data={ members: getParty() }; const ta=document.getElementById('partyJSON'); if(ta) ta.value=JSON.stringify(data,null,2); }
function getParty(){ const arr=[]; for(let i=1;i<=6;i++){ arr.push({ name:document.getElementById(`p${i}Name`)?.value||'', item:document.getElementById(`p${i}Item`)?.value||'', tera:document.getElementById(`p${i}Tera`)?.value||'' }); } return arr; }
function applyTeamToParty(team){
  const mem=team.members||[]; for(let i=1;i<=6;i++){ const m=mem[i-1]||{name:'',item:'',tera:''}; set(`p${i}Name`,m.name||''); set(`p${i}Item`,m.item||''); set(`p${i}Tera`,m.tera||''); const meta=document.getElementById(`p${i}Meta`); if(meta) meta.textContent=`S${team.meta.season||'?'} ${team.meta.rule||''}`+(team.meta.rank?` / 順位:${team.meta.rank}`:''); }
  refreshPartyJSON();
  tabs.forEach(x=>x.classList.remove('active')); document.querySelector('.tab[data-tab="party"]').classList.add('active');
  Object.values(sections).forEach(s=>s.classList.add('hidden')); sections.party.classList.remove('hidden');
}
for(let i=1;i<=6;i++){ ['Name','Item','Tera'].forEach(f=>{ document.addEventListener('input',e=>{ if(e.target && e.target.id===`p${i}${f}`) refreshPartyJSON(); }); }); }
document.getElementById('copyPartyJSON').addEventListener('click',()=>{ const ta=document.getElementById('partyJSON'); ta.select(); document.execCommand('copy'); });
document.getElementById('clearParty').addEventListener('click',()=>{ buildPartyUI(); refreshPartyJSON(); });
refreshPartyJSON();

/* ===== タイマー ===== */
let timer=null, remainMs=0;
function updateTimerBadge(){ const b=document.getElementById('badgeTimer'); if(b) b.textContent = `タイマー: ${timer?'動作中':'停止'}`; }
function fmt(ms){ const s=Math.max(0,Math.floor(ms/1000)); const m=Math.floor(s/60), r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }
document.getElementById('timerStart').addEventListener('click',()=>{ const min=val('timerMin',15); remainMs=min*60*1000; set('timerState','動作中'); updateTimerBadge(); if(timer) clearInterval(timer); timer=setInterval(()=>{ remainMs-=1000; set('timerRemain',fmt(remainMs)); if(remainMs<=0){ clearInterval(timer); timer=null; set('timerState','終了'); updateTimerBadge(); alert('タイマー終了'); }},1000); });
document.getElementById('timerStop').addEventListener('click',()=>{ if(timer){ clearInterval(timer); timer=null; set('timerState','停止中'); updateTimerBadge(); } });
document.getElementById('timerReset').addEventListener('click',()=>{ if(timer){ clearInterval(timer); timer=null; } set('timerRemain','00:00'); set('timerState','停止中'); updateTimerBadge(); });
updateTimerBadge();
document.getElementById('badgeLog').textContent='ログ: 0件';

/* ===== Service Worker 登録（Pages配下対応） ===== */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(console.error);
  });
}
