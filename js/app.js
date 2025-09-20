(function dockTimerTop(){
  if (document.getElementById('timerTopDock')) return;
  const bar = document.createElement('div');
  bar.id = 'timerTopDock';
  Object.assign(bar.style, {
    position:'sticky', top:'0', zIndex:'999',
    background:'#0f1115', color:'#fff',
    borderBottom:'1px solid #2a2d33',
    padding:'8px 12px',
    display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap'
  });
  const ensure = (tag, id, initText='')=>{
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement(tag); el.id = id;
      if (initText) el.textContent = initText;
      if (tag === 'input') el.type = 'number';
      if (id === 'timerMin') { el.min = '1'; el.value = el.value || '15'; el.style.width='80px'; el.title='分'; }
      if (tag === 'button') { el.className = 'btn small'; }
      if (id === 'badgeTimer') { el.className = 'pill'; }
      if (id === 'timerRemain') el.textContent = '00:00';
      if (id === 'timerState')  el.textContent = '停止中';
    }
    return el;
  };
  const label  = document.createElement('span'); label.textContent = '⏱ タイマー';
  const badge  = ensure('span','badgeTimer','タイマー: 停止');
  const min    = ensure('input','timerMin');
  const start  = ensure('button','timerStart','開始');
  const stop   = ensure('button','timerStop','停止');
  const reset  = ensure('button','timerReset','リセット');
  const remain = ensure('span','timerRemain','00:00');
  const state  = ensure('span','timerState','停止中');
  bar.append(label, badge, min, start, stop, reset, remain, state);
  document.addEventListener('DOMContentLoaded', ()=> document.body.prepend(bar));
})();

/* =========================================================
   タブ切替（要素が無い場合はスキップ。落ちないように）
========================================================= */
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
    Object.values(sections).forEach(s=>s&&s.classList.add('hidden'));
    const target = sections[b.dataset.tab];
    target && target.classList.remove('hidden');
  });
}

/* =========================================================
   共通ユーティリティ
========================================================= */
function set(id,v){ const el=document.getElementById(id); if(el!=null) el.value=v; }
function val(id,def){ const el=document.getElementById(id); if(!el) return def; const n=Number(el.value); return Number.isFinite(n)?n:def; }
function text(id,v){ const el=document.getElementById(id); if(el!=null) el.textContent=v; }
function pct(x,tot){ return tot? (x/tot*100).toFixed(1):'0.0'; }
function ceilDiv(a,b){ return Math.floor((a+b-1)/(b||1)); }
function evQuickSet(inputId, v){ const el=document.getElementById(inputId); if(!el) return; el.value=v; el.dispatchEvent(new Event('input')); }
function createBtn(lbl, id, cls='btn small'){ const b=document.createElement('button'); b.textContent=lbl; b.className=cls; if(id) b.id=id; return b; }
function createSelect(id, cls='small'){ const s=document.createElement('select'); if(id) s.id=id; s.className=cls; return s; }
function createInput(id,ph, cls='small'){ const i=document.createElement('input'); if(id) i.id=id; i.placeholder=ph||''; i.className=cls; return i; }
function downloadFile(name, text, mime='application/json'){ const blob=new Blob([text],{type:mime}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href); }

/* =========================================================
   ランク補正
========================================================= */
const RANK = {
  "-6": 2/8, "-5": 2/7, "-4": 2/6, "-3": 2/5, "-2": 2/4, "-1": 2/3,
  "0": 1, "1": 1.5, "2": 2, "3": 2.5, "4": 3, "5": 3.5, "6": 4
};
function fillSelect(id, arr, def){
  const s=document.getElementById(id); if(!s) return;
  s.innerHTML='';
  arr.forEach(v=>{const o=document.createElement('option');o.value=String(v);o.textContent=String(v);s.appendChild(o)});
  if(def!==undefined) s.value=String(def);
}
['atkRank','defRank','v13_atkRank','v13_defRank1','v13_defRank2','v13_defRank3'].forEach(id=> fillSelect(id, Object.keys(RANK), '0'));
fillSelect('hits', Array.from({length:10},(_,i)=>i+1), 1);
fillSelect('v13_hits', Array.from({length:10},(_,i)=>i+1), 1);

function fillType(id){
  const s=document.getElementById(id); if(!s) return;
  ['0.25','0.5','1','2','4'].forEach(x=>{const o=document.createElement('option');o.textContent=o.value=x;s.appendChild(o)});
  s.value='1';
}
['v13_type1','v13_type2','v13_type3'].forEach(fillType);

function fillWeather(id){
  const w=['none','sun','rain','sand','snow']; const s=document.getElementById(id); if(!s) return;
  w.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;s.appendChild(o)}); s.value='none';
}
['v13_weather1','v13_weather2','v13_weather3'].forEach(fillWeather);

function fillMoveType(id){
  const t=['炎','水','電気','草','氷','格闘','毒','地面','飛行','エスパー','虫','岩','ゴースト','ドラゴン','悪','鋼','フェアリー','ノーマル'];
  const s=document.getElementById(id); if(!s) return;
  t.forEach(x=>{const o=document.createElement('option');o.value=x;o.textContent=x;s.appendChild(o)}); s.value='ノーマル';
}
fillMoveType('moveType'); fillMoveType('v13_moveType');

/* =========================================================
   図鑑ローダ（pokemon_master.json）
========================================================= */
const PM = { list: [], byName: new Map(), ready: false };
async function loadPokemonMaster() {
  if (PM.ready) return;
  const tryPaths = ['./data/pokemon_master.json','./pokemon_master.json','/data/pokemon_master.json','/pokemon_master.json'];
  let data=null;
  for (const u of tryPaths) {
    try { const res = await fetch(u, {cache:'no-store'}); if(res.ok){ data = await res.json(); break; } } catch(_) {}
  }
  if (!data || !Array.isArray(data)) return;
  PM.list = data; PM.byName.clear();
  data.forEach(p=>{ if(p && typeof p['名前']==='string') PM.byName.set(p['名前'], p); });
  PM.ready = true; rebuildDexList(); document.dispatchEvent(new Event('dex-ready'));
}
function findMonByName(name){
  if(!name) return null;
  if (window.__DEX__ && typeof window.__DEX__.findMon==='function') return window.__DEX__.findMon(name);
  if (!PM.ready) return null;
  return PM.byName.get(name) || null;
}
function rebuildDexList() {
  const dl = document.getElementById('dexList'); if (!dl) return;
  dl.innerHTML = '';
  const src = (window.DEX && Array.isArray(window.DEX) ? window.DEX.map(p=>p.名前) : PM.list.map(p=>p.名前)).slice(0, 10000);
  src.forEach(name => { const opt = document.createElement('option'); opt.value = name; dl.appendChild(opt); });
}
window.addEventListener('load', loadPokemonMaster);

/* =========================================================
   実数値計算（メイン atk/def）
========================================================= */
const STAT_ORDER=['HP','攻撃','防御','特攻','特防','素早'];
function buildStatsUI(side){
  const box=document.getElementById('stats-'+side); if(!box) return;
  box.innerHTML='';
  const wrap=document.createElement('div');
  STAT_ORDER.forEach(k=>{
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
  STAT_ORDER.forEach(k=>{
    const base=+val(`${side}_base_${k}`,50), iv=+val(`${side}_iv_${k}`,31), ev=+val(`${side}_ev_${k}`,0), nat=+val(`${side}_nat_${k}`,1);
    const final=calcStat(base,iv,ev,50,nat,(k==='HP')); set(`${side}_final_${k}`,final);
  });
}
function setEV(side,k,v){ set(`${side}_ev_${k}`,v); recalcSide(side); }
['atk','def'].forEach(s=>{
  STAT_ORDER.forEach(k=>{
    ['base','iv','ev','nat'].forEach(t=>{
      const id=`${s}_${t}_${k}`; ['input','change'].forEach(ev=>{
        document.addEventListener(ev, e=>{ if(e.target && e.target.id===id) recalcSide(s); });
      });
    });
  });
});
recalcSide('atk'); recalcSide('def');

/* 図鑑→実数値へ反映（メイン） */
function getStatFromMon(mon, key){
  if(!mon) return undefined;
  const map = {
    'HP':['HP','ＨＰ','hp'],
    '攻撃':['攻撃','こうげき','攻','atk'],
    '防御':['防御','ぼうぎょ','防','def'],
    '特攻':['特攻','とくこう','spa','特攻撃'],
    '特防':['特防','とくぼう','spd'],
    '素早':['素早','素早さ','すばやさ','spe']
  };
  const keys = map[key]||[key];
  for(const k of keys){ if(mon[k]!=null && mon[k]!=='' ) return Number(mon[k]); }
  return undefined;
}
function applyMonToBase(side, mon) {
  if (!mon) return;
  STAT_ORDER.forEach(k=>{
    const v = getStatFromMon(mon,k);
    if(v!=null) set(`${side}_base_${k}`, v);
  });
  const typeBox = document.querySelector(`#${side}_typebox`);
  if (typeBox) {
    const t1 = mon?.['タイプ1'] ?? '';
    const t2 = mon?.['タイプ2'] ?? '';
    typeBox.textContent = t2 ? `${t1} / ${t2}` : `${t1}`;
  }
  recalcSide(side);
}
document.addEventListener('input', (e) => {
  if (e.target?.id === 'dexSearchAtk') {
    const mon = findMonByName(e.target.value.trim()) || null;
    if (mon) applyMonToBase('atk', mon);
  } else if (e.target?.id === 'dexSearchDef') {
    const mon = findMonByName(e.target.value.trim()) || null;
    if (mon) applyMonToBase('def', mon);
  }
});
document.getElementById('btnDexLoad')?.addEventListener('click', loadPokemonMaster);
document.getElementById('btnDexClear')?.addEventListener('click', ()=>{ PM.ready=false; PM.list=[]; PM.byName.clear(); rebuildDexList(); });

document.getElementById('btnApplyStats')?.addEventListener('click',()=>{
  set('atkStat', val('atk_final_攻撃',172));
  set('defStat', val('def_final_防御',120));
  set('defHP',   val('def_final_HP',155));
  tabs.forEach(x=>x.classList.remove('active')); document.querySelector('.tab[data-tab="calc"]')?.classList.add('active');
  Object.values(sections).forEach(s=>s&&s.classList.add('hidden')); sections.calc && sections.calc.classList.remove('hidden');
});

/* =========================================================
   ダメージ計算（メイン1体）
========================================================= */
const resultBox=document.getElementById('result'), hpbar=document.getElementById('hpbar'), logBox=document.getElementById('logBox'), memoLog=document.getElementById('memoLog');
let LOG=[];
function writeLog(){
  logBox && (logBox.value=LOG.join('\n'));
  memoLog && (memoLog.value=LOG.join('\n'));
  const b=document.getElementById('badgeLog'); if(b) b.textContent=`計算ログ: ${LOG.length}件`;
  try{ localStorage.setItem('pokeapp_log', JSON.stringify(LOG)); }catch(_){}
}
document.getElementById('btnClearLog')?.addEventListener('click',()=>{ LOG=[]; writeLog(); });
let undoStack=[]; document.getElementById('btnUndo')?.addEventListener('click',()=>{ if(!undoStack.length) return; const last=undoStack.pop(); logBox && (logBox.value=last.log); memoLog && (memoLog.value=last.log); set('defHP', last.hp); if(hpbar) hpbar.style.width= last.hpPct; });

function dmgRange({level=50,power,atk,def,stab=1,typeMul=1,rankAtk=1,rankDef=1,extra=1,mode='phys',crit=false,moveType='ノーマル',weather='none', rockInSand=false, iceInSnow=false}){
  let weatherMul=1;
  if(weather==='sun'){ if(moveType==='炎') weatherMul=1.5; if(moveType==='水') weatherMul=0.5; }
  if(weather==='rain'){ if(moveType==='水') weatherMul=1.5; if(moveType==='炎') weatherMul=0.5; }
  if(weather==='sand' && mode==='spec' && rockInSand){ def = Math.floor(def*1.5); }
  if(weather==='snow' && mode==='phys' && iceInSnow){ def = Math.floor(def*1.5); }
  let defMul=rankDef; if(crit){ defMul=1; }
  const base=Math.floor(level*2/5)+2;
  const core=Math.floor(Math.floor(base*power*(atk*rankAtk)/(def*defMul))/50)+2;
  const min=Math.floor(core*stab*typeMul*0.85*weatherMul*extra);
  const max=Math.floor(core*stab*typeMul*1.00*weatherMul*extra);
  return [min,max];
}
document.getElementById('btnCalc')?.addEventListener('click',()=>{
  const atkStat=val('atkStat',172), defStat0=val('defStat',120), hp0=val('defHP',155);
  const power=val('power',80), stab=+document.getElementById('stab')?.value||1, typeMul=+document.getElementById('typeMul')?.value||1;
  const rankAtk=RANK[document.getElementById('atkRank')?.value||'0'], rankDef=RANK[document.getElementById('defRank')?.value||'0'];
  const extra=val('extra',1), mode=document.getElementById('mode')?.value||'phys', moveType=document.getElementById('moveType')?.value||'ノーマル';
  const weather=document.getElementById('weather')?.value||'none';
  const critEl=document.getElementById('crit'); const crit=critEl?(critEl.type==='checkbox'?critEl.checked:(+critEl.value>1)):false;
  const hits=+document.getElementById('hits')?.value||1;
  const rockInSand=document.getElementById('chkRockInSand')?.checked, iceInSnow=document.getElementById('chkIceInSnow')?.checked;

  const [mn,mx]=dmgRange({power,atk:atkStat,def:defStat0,stab,typeMul,rankAtk,rankDef,extra,mode,crit,moveType,weather,rockInSand,iceInSnow});
  const totMin=mn*hits, totMax=mx*hits;
  const hp=hp0; const remMin=Math.max(0,hp-totMax), remMax=Math.max(0,hp-totMin);

  let ko='';
  if(totMin>=hp){ ko='確定1発'; }
  else if(totMax>=hp){ ko='乱数1発（高乱数）'; }
  else { const a=ceilDiv(hp,mn||1), b=ceilDiv(hp,mx||1); ko=(a===b)?`確定${a}発`:`乱数${a}～${b}発`; }

  if(resultBox){
    resultBox.innerHTML = `
      <div class="grid grid-3">
        <div class="card"><div class="small muted">1発あたり</div><div><b>${mn} ～ ${mx}</b></div></div>
        <div class="card"><div class="small muted">${hits}回合計</div><div><b>${totMin} ～ ${totMax}</b></div></div>
        <div class="card"><div class="small muted">残りHP</div><div><b>${remMin} ～ ${remMax}</b>（${pct(remMin,hp)}% ～ ${pct(remMax,hp)}%）</div></div>
      </div>
      <div class="small">判定：<b>${ko}</b>　最小乱数ダメージ：<b>${mn}</b> / 最大乱数ダメージ：<b>${mx}</b></div>
    `;
  }
  const remainPct = Math.max(0, 100 - Math.min(100, (totMax/hp*100)));
  if(hpbar) hpbar.style.width = `${remainPct}%`;

  undoStack.push({log:logBox?.value||'', hp:hp0, hpPct:`100%`});
  LOG.push(`[${new Date().toLocaleTimeString()}] 威力${power} STAB${stab} 相性${typeMul} 天候${weather}${rockInSand?'(岩SpD1.5)':''}${iceInSnow?'(氷Def1.5)':''} 急所${crit?'有':'無'} 攻R${document.getElementById('atkRank')?.value||0} 防R${document.getElementById('defRank')?.value||0} hit${hits} → 1発:${mn}-${mx} 合計:${totMin}-${totMax} | ${ko}`);
  writeLog();
});

/* =========================================================
   1対3（上に自分、下に相手3体）＋種族値→実数値同期
========================================================= */
(function enhanceV13(){
  const sec = sections.v13; if(!sec) return;

  // 自分（攻撃側）
  if(!document.getElementById('v13_self_search')){
    const selfCard = document.createElement('div');
    selfCard.className='card small';
    selfCard.innerHTML = `
      <div class="grid grid-3">
        <div class="row"><label>（自分）図鑑検索</label><input id="v13_self_search" list="dexList" placeholder="例：サーフゴー"></div>
        <div class="row"><label>攻撃モード</label>
          <select id="v13_mode">
            <option value="phys">物理（攻撃→防御）</option>
            <option value="spec">特殊（特攻→特防）</option>
          </select>
        </div>
        <div class="row"><label>前提</label><input value="Lv50 / IV既定:31 / EV既定:0 / 補正1.0" readonly></div>
      </div>
      <div id="v13_self_form" class="mt8"></div>
    `;
    sec.querySelector('.card.small')?.insertAdjacentElement('beforebegin', selfCard);
  }
  buildV13SelfForm();

  // 相手×3（カード内の先頭へフォーム追加）
  [1,2,3].forEach(i=>{
    const outEl=document.getElementById(`v13_out${i}`);
    const holder = outEl?.closest('.card.small') || sec;
    if(holder && !document.getElementById(`v13_enemy_search_${i}`)){
      const wrap = document.createElement('div');
      wrap.innerHTML = `
        <div class="row"><label>（相手${i}）図鑑検索</label><input id="v13_enemy_search_${i}" list="dexList" placeholder="例：ピカチュウ"></div>
        <div id="v13_foe_form_${i}" class="mt8"></div>
      `;
      holder.insertBefore(wrap, holder.firstChild);
      buildV13FoeForm(i);
    }
  });

  function v13EventHandler(e){
    const id = e.target?.id || '';
    if(id === 'v13_self_search'){
      const mon = findMonByName(e.target.value.trim()) || null;
      if(mon) applyV13SelfFromDex(mon);
    }
    if(id.startsWith('v13_self_')){ recalcV13Self(); syncV13ModeToStats(); }

    const m = id.match(/^v13_enemy_search_(\d)$/);
    if(m){
      const idx = Number(m[1]);
      const mon = findMonByName(e.target.value.trim()) || null;
      if(mon) applyV13FoeFromDex(idx, mon);
    }
    const m2 = id.match(/^v13_foe(\d)_(base|iv|ev|nat)_(HP|防御|特防)$/);
    if(m2){
      const idx = Number(m2[1]);
      recalcV13Foe(idx);
      syncV13ModeToStats();
    }
    if(id === 'v13_mode'){ syncV13ModeToStats(); }
  }
  ['input','change'].forEach(ev => document.addEventListener(ev, v13EventHandler));

  document.getElementById('btnV13')?.addEventListener('click', ()=>{
    recalcV13Self();
    [1,2,3].forEach(recalcV13Foe);
    syncV13ModeToStats();
    [1,2,3].forEach(dmgRangeV13);
  });

  syncV13ModeToStats();
})();
function buildV13SelfForm(){
  const box=document.getElementById('v13_self_form'); if(!box) return;
  box.innerHTML = `
    ${['攻撃','特攻'].map(k=>`
      <div class="row"><label>${k}</label>
        <div class="flex" style="gap:6px;flex-wrap:wrap">
          <input type="number" id="v13_self_base_${k}" placeholder="種族値" style="width:90px">
          <input type="number" id="v13_self_iv_${k}"   placeholder="IV" value="31" min="0" max="31" style="width:80px">
          <input type="number" id="v13_self_ev_${k}"   placeholder="EV" value="0" min="0" max="252" step="4" style="width:80px">
          <select id="v13_self_nat_${k}" style="width:90px">
            <option value="1.1">1.1</option><option value="1.0" selected>1.0</option><option value="0.9">0.9</option>
          </select>
          <input type="number" id="v13_self_final_${k}" placeholder="実数値" readonly style="width:110px">
          <button class="btn btn-ghost small" type="button" onclick="evQuickSet('v13_self_ev_${k}',0)">EV0</button>
          <button class="btn btn-ghost small" type="button" onclick="evQuickSet('v13_self_ev_${k}',252)">EV252</button>
        </div>
      </div>
    `).join('')}
  `;
}
function recalcV13Self(){
  ['攻撃','特攻'].forEach(k=>{
    const base=val(`v13_self_base_${k}`,50),
          iv  =val(`v13_self_iv_${k}`,31),
          ev  =val(`v13_self_ev_${k}`,0),
          nat =val(`v13_self_nat_${k}`,1.0);
    const final=calcStat(base,iv,ev,50,nat,false);
    set(`v13_self_final_${k}`,final);
  });
  syncV13ModeToStats();
}
function applyV13SelfFromDex(mon){
  ['攻撃','特攻'].forEach(k=> set(`v13_self_base_${k}`, getStatFromMon(mon,k) ?? 50));
  recalcV13Self(); syncV13ModeToStats();
}

function buildV13FoeForm(i){
  const box=document.getElementById(`v13_foe_form_${i}`); if(!box) return;
  box.innerHTML = `
    ${['HP','防御','特防'].map(k=>`
      <div class="row"><label>${k}</label>
        <div class="flex" style="gap:6px;flex-wrap:wrap">
          <input type="number" id="v13_foe${i}_base_${k}" placeholder="種族値" style="width:90px">
          <input type="number" id="v13_foe${i}_iv_${k}"   placeholder="IV" value="31" min="0" max="31" style="width:80px">
          <input type="number" id="v13_foe${i}_ev_${k}"   placeholder="EV" value="0" min="0" max="252" step="4" style="width:80px">
          <select id="v13_foe${i}_nat_${k}" style="width:90px">
            <option value="1.1">1.1</option><option value="1.0" selected>1.0</option><option value="0.9">0.9</option>
          </select>
          <input type="number" id="v13_foe${i}_final_${k}" placeholder="実数値" readonly style="width:110px">
          <button class="btn btn-ghost small" type="button" onclick="evQuickSet('v13_foe${i}_ev_${k}',0)">EV0</button>
          <button class="btn btn-ghost small" type="button" onclick="evQuickSet('v13_foe${i}_ev_${k}',252)">EV252</button>
        </div>
      </div>
    `).join('')}
  `;
}
function recalcV13Foe(i){
  const doOne=(k,isHP)=>{ const base=val(`v13_foe${i}_base_${k}`,50), iv=val(`v13_foe${i}_iv_${k}`,31), ev=val(`v13_foe${i}_ev_${k}`,0), nat=val(`v13_foe${i}_nat_${k}`,1.0); const f=calcStat(base,iv,ev,50,nat,isHP); set(`v13_foe${i}_final_${k}`,f); return f; };
  const hp = doOne('HP',true);
  const df = doOne('防御',false);
  const sd = doOne('特防',false);
  set(`v13_hp${i}`, hp);
  const mode=document.getElementById('v13_mode')?.value || 'phys';
  set(`v13_def${i}`, mode==='phys'? df : sd);
}
function applyV13FoeFromDex(i, mon){
  ['HP','防御','特防'].forEach(k=> set(`v13_foe${i}_base_${k}`, getStatFromMon(mon,k) ?? 50));
  recalcV13Foe(i); syncV13ModeToStats();
}
function syncV13ModeToStats(){
  const mode=document.getElementById('v13_mode')?.value || 'phys';
  const atkPhys = val('v13_self_final_攻撃',172);
  const atkSpec = val('v13_self_final_特攻',120);
  set('v13_atk', mode==='phys'? atkPhys : atkSpec);
  [1,2,3].forEach(i=>{
    const df = val(`v13_foe${i}_final_防御`,120);
    const sd = val(`v13_foe${i}_final_特防`,120);
    set(`v13_def${i}`, mode==='phys'? df : sd);
  });
}
function dmgRangeV13(i){
  const atk   = val('v13_atk',172);
  const power = val('v13_power',80);
  const stab  = +val('v13_stab',1.5);
  const rankAtk = RANK[String(val('v13_atkRank',0))];
  const extra   = val('v13_extra',1);
  const mode    = document.getElementById('v13_mode')?.value || 'phys';
  const hits    = +val('v13_hits',1);
  const moveType = document.getElementById('v13_moveType')?.value || 'ノーマル';
  const def    = val(`v13_def${i}`,120);
  const rankDef= RANK[String(val(`v13_defRank${i}`,0))];
  const hp     = val(`v13_hp${i}`,155);
  const typeMul= +val(`v13_type${i}`,1);
  const weather= document.getElementById(`v13_weather${i}`)?.value || 'none';
  const rockInSand = document.getElementById(`v13_rock${i}`)?.checked;
  const iceInSnow  = document.getElementById(`v13_ice${i}`)?.checked;
  const critEl=document.getElementById('v13_crit'); const crit=critEl?(critEl.type==='checkbox'?critEl.checked:(+critEl.value>1)):false;

  const [mn,mx]=dmgRange({power,atk,def,stab,typeMul,rankAtk,rankDef,extra,mode,crit,moveType,weather,rockInSand,iceInSnow});
  const totMin=mn*hits, totMax=mx*hits;
  let txt=`1発:${mn}-${mx} / 合計:${totMin}-${totMax} | `;
  if(totMin>=hp) txt+='確定1発';
  else if(totMax>=hp) txt+='乱数1発（高乱数）';
  else {const a=ceilDiv(hp,mn||1), b=ceilDiv(hp,mx||1); txt+=(a===b)?`確定${a}発`:`乱数${a}～${b}発`;}
  document.getElementById(`v13_out${i}`)?.textContent=txt;
}
document.getElementById('btnV13')?.addEventListener('click',()=>[1,2,3].forEach(dmgRangeV13));

/* =========================================================
   ステルスロック
========================================================= */
const SR_MAP={'等倍':1,'1/2':0.5,'1/4':0.25,'2倍':2,'4倍':4};
(function(){
  const s=document.getElementById('sr_type'); if(!s) return;
  ['1/4','1/2','等倍','2倍','4倍'].forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;s.appendChild(o)}); s.value='等倍';
})();
document.getElementById('btnSR')?.addEventListener('click',()=>{
  const hp=val('sr_hp',155), t=document.getElementById('sr_type')?.value||'等倍'; const mul=SR_MAP[t]||1;
  const dmg=Math.floor(hp*0.125*mul); set('sr_result',`${dmg} ダメージ（${pct(dmg,hp)}%）`);
});

/* =========================================================
   構築インポート（CSV/TSV/PKDB JSON 簡易対応）
========================================================= */
function parseCSV(txt){ const rows=txt.split(/\r?\n/).map(r=>r.split(/,|\t/)); return rows.filter(r=>r.some(x=>x && x.trim().length)); }
function normalizeTeams(rows){
  const out=[]; rows.forEach((r)=>{ const names=r.slice(0,6).map(x=>({name:(x||'').trim()})); if(names.some(m=>m.name)) out.push({meta:{season:'?',rule:'?',rank:null,rating:null},members:names}); });
  return out;
}
function normalizeFromPKDB(json){
  const teams=(json.teams||[]).map(t=>({
    meta:{season:json.season, rule:json.rule, rank:t.rank||null, rating:t.rating_value||null},
    members:(t.team||[]).map(m=>({name:m.pokemon||m.name||'', item:m.item||'', tera:m.terastal||m.tera||''}))
  }));
  return teams;
}
let ALL_TEAMS=[]; function setTeams(arr){ ALL_TEAMS=Array.isArray(arr)?arr:[]; const b=document.getElementById('badgeTeams'); if(b) b.textContent=`構築: ${ALL_TEAMS.length}件`; renderTeamsList(); }
const diagBox=document.getElementById('diagBox');
document.getElementById('diagBtn')?.addEventListener('click',()=>{ diagBox && diagBox.classList.toggle('hidden'); });
function setText(id,txt){ const el=document.getElementById(id); if(el) el.textContent=txt; }
async function handleLoad(){
  const f=document.getElementById('fileInput')?.files?.[0];
  const pasted=document.getElementById('pasteBox')?.value?.trim();
  const info=document.getElementById('loadInfo');
  let txt=''; if(f){txt=await f.text();} else if(pasted){txt=pasted;} else {info&&(info.textContent='入力がありません'); return;}
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

  setText('diagMode',mode); setText('diagCount', String(rowsCount||teams.length)); setText('diagErr', jsonErr||'(なし)'); setText('diagHead', head);
  info && (info.textContent = teams.length? `読み込み成功：${teams.length}件` : '0件：形式をご確認ください');
  setTeams(teams);
}
document.getElementById('loadBtn')?.addEventListener('click',handleLoad);
document.getElementById('clearBtn')?.addEventListener('click',()=>{ const fi=document.getElementById('fileInput'); if(fi) fi.value=''; const pb=document.getElementById('pasteBox'); if(pb) pb.value=''; const li=document.getElementById('loadInfo'); if(li) li.textContent='未読込'; const fb=document.getElementById('filterBox'); if(fb) fb.value=''; setTeams([]); });
document.getElementById('demoBtn')?.addEventListener('click',()=>{
  const demo={season:33,rule:"シングル",teams:[
    {rank:1,rating_value:2180.889,team:[
      {pokemon:"ドドゲザン",terastal:"ほのお",item:"ラムのみ"},
      {pokemon:"マタドガス",form:"ガラルのすがた",terastal:"ノーマル",item:"くろいヘドロ"},
      {pokemon:"キラフロル",terastal:"ノーマル",item:"きあいのタスキ"},
      {pokemon:"ディンルー",terastal:"はがね",item:"オボンのみ"},
      {pokemon:"ルギア",terastal:"ノーマル",item:"たべのこし"},
      {pokemon:"コライドン",terastal:"ほのお",item:"こだわりスカーフ"}
    ]}
  ]};
  const t=normalizeFromPKDB(demo); setTeams(t); setText('loadInfo',`デモ読込：${t.length}件`);
});
function renderTeamsList(){
  const box=document.getElementById('teamsList'); const f=(document.getElementById('filterBox')?.value||'').trim().toLowerCase(); if(!box) return;
  box.innerHTML='';
  const src=!f?ALL_TEAMS:ALL_TEAMS.filter(t=>{
    const inMeta=`${t.meta.season} ${t.meta.rule} ${t.meta.rank} ${t.meta.rating}`.toLowerCase();
    const inMembers=t.members.map(m=>`${m.name} ${m.item} ${m.tera}`.toLowerCase()).join(' ');
    return inMeta.includes(f)||inMembers.includes(f);
  });
  const fc=document.getElementById('filterCount'); if(fc) fc.textContent=`${src.length} / ${ALL_TEAMS.length}`;
  if(!src.length){ const d=document.createElement('div'); d.className='muted'; d.textContent='0件です。'; box.appendChild(d); return; }
  for(const t of src){
    const card=document.createElement('div'); card.className='card';
    const head=document.createElement('div'); head.className='flex';
    head.innerHTML=`<span class="pill">S${t.meta.season||'?'} / ${t.meta.rule||''}</span>`+(t.meta.rank?`<span class="pill">順位:${t.meta.rank}</span>`:'')+(t.meta.rating?`<span class="pill">レート:${t.meta.rating}</span>`:'');
    const mons=document.createElement('div'); mons.className='mons';
    t.members.forEach((m,i)=>{ const d=document.createElement('div'); d.className='mon'; d.innerHTML=`<div style="font-weight:700">${i+1}. ${m.name?m.name:'-'}</div><div class="muted">${m.item||''}</div><div class="muted">テラ:${m.tera||''}</div>`; mons.appendChild(d); });
    const btn=document.createElement('button'); btn.className='btn'; btn.textContent='このチームをパーティへ反映';
    btn.addEventListener('click',()=>applyTeamToParty(t));
    card.appendChild(head); card.appendChild(mons); card.appendChild(document.createElement('hr')); card.appendChild(btn); box.appendChild(card);
  }
}
document.getElementById('filterBox')?.addEventListener('input', renderTeamsList);

/* =========================================================
   パーティ（努力値 & 性格 & プリセット & 技×4）＋保存読込
========================================================= */
const partyGrid=document.getElementById('partyGrid');
function buildPartyUI(){
  if(!partyGrid) return;
  partyGrid.innerHTML='';
  for(let i=1;i<=6;i++){
    const c=document.createElement('div'); c.className='card';
    c.innerHTML=`
      <div class="slot-h"><strong>スロット ${i}</strong> <small id="p${i}Meta" class="muted"></small></div>
      <div class="row"><label>名前</label><input id="p${i}Name" type="text" placeholder="例：サーフゴー" list="dexList"></div>
      <div class="row"><label>持ち物</label><input id="p${i}Item" type="text"></div>
      <div class="row"><label>テラタイプ</label><input id="p${i}Tera" type="text"></div>
      <hr>
      <div class="row"><label>性格（簡易）</label>
        <select id="p${i}Nature">
          <option value="neutral" selected>補正なし</option>
          <option value="adamant">いじっぱり(A↑C↓)</option>
          <option value="modest">ひかえめ(C↑A↓)</option>
          <option value="jolly">ようき(S↑C↓)</option>
          <option value="timid">おくびょう(S↑A↓)</option>
          <option value="impish">わんぱく(Df↑C↓)</option>
          <option value="bold">ずぶとい(Df↑A↓)</option>
          <option value="careful">しんちょう(SpD↑C↓)</option>
          <option value="calm">おだやか(SpD↑A↓)</option>
        </select>
      </div>
      <div class="row"><label>努力値（4の倍数推奨）</label>
        <div class="flex">
          <input type="number" id="p${i}EV_HP"  placeholder="H" min="0" max="252" step="4" value="0" style="width:80px">
          <input type="number" id="p${i}EV_Atk" placeholder="A" min="0" max="252" step="4" value="0" style="width:80px">
          <input type="number" id="p${i}EV_Def" placeholder="B" min="0" max="252" step="4" value="0" style="width:80px">
          <input type="number" id="p${i}EV_SpA" placeholder="C" min="0" max="252" step="4" value="0" style="width:80px">
          <input type="number" id="p${i}EV_SpD" placeholder="D" min="0" max="252" step="4" value="0" style="width:80px">
          <input type="number" id="p${i}EV_Spe" placeholder="S" min="0" max="252" step="4" value="0" style="width:80px">
        </div>
      </div>
      <div class="row"><label>プリセット</label>
        <div class="flex">
          <button class="btn btn-ghost small" type="button" id="p${i}Preset1">A+S 252</button>
          <button class="btn btn-ghost small" type="button" id="p${i}Preset2">C+S 252</button>
          <button class="btn btn-ghost small" type="button" id="p${i}Preset3">A+H 252</button>
        </div>
      </div>
      <div class="row"><label>技</label>
        <div class="flex" style="gap:6px;flex-wrap:wrap">
          <input id="p${i}Move1" type="text" placeholder="技1" style="min-width:160px">
          <input id="p${i}Move2" type="text" placeholder="技2" style="min-width:160px">
          <input id="p${i}Move3" type="text" placeholder="技3" style="min-width:160px">
          <input id="p${i}Move4" type="text" placeholder="技4" style="min-width:160px">
        </div>
      </div>
    `;
    partyGrid.appendChild(c);
    document.getElementById(`p${i}Preset1`).onclick=()=>{ set(`p${i}EV_Atk`,252); set(`p${i}EV_Spe`,252); };
    document.getElementById(`p${i}Preset2`).onclick=()=>{ set(`p${i}EV_SpA`,252); set(`p${i}EV_Spe`,252); };
    document.getElementById(`p${i}Preset3`).onclick=()=>{ set(`p${i}EV_Atk`,252); set(`p${i}EV_HP`,252); };
  }
}
buildPartyUI();
function refreshPartyJSON(){
  const ta=document.getElementById('partyJSON'); if(!ta) return;
  const data={ members: getParty() }; ta.value=JSON.stringify(data,null,2);
  try{ localStorage.setItem('pokeapp_party_autosave', JSON.stringify(data)); }catch(_){}
}
function getParty(){
  const arr=[]; for(let i=1;i<=6;i++){
    arr.push({
      name:document.getElementById(`p${i}Name`)?.value||'',
      item:document.getElementById(`p${i}Item`)?.value||'',
      tera:document.getElementById(`p${i}Tera`)?.value||'',
      nature:document.getElementById(`p${i}Nature`)?.value||'neutral',
      ev:{ hp:+val(`p${i}EV_HP`,0), atk:+val(`p${i}EV_Atk`,0), def:+val(`p${i}EV_Def`,0), spa:+val(`p${i}EV_SpA`,0), spd:+val(`p${i}EV_SpD`,0), spe:+val(`p${i}EV_Spe`,0) },
      moves:[ document.getElementById(`p${i}Move1`)?.value||'', document.getElementById(`p${i}Move2`)?.value||'', document.getElementById(`p${i}Move3`)?.value||'', document.getElementById(`p${i}Move4`)?.value||'' ]
    });
  } return arr;
}
function applyPartySnapshot(data){
  const mem=(data?.members)||[];
  for(let i=1;i<=6;i++){
    const m=mem[i-1]||{};
    set(`p${i}Name`, m.name||''); set(`p${i}Item`, m.item||''); set(`p${i}Tera`, m.tera||'');
    set(`p${i}Nature`, m.nature||'neutral');
    const ev=m.ev||{};
    set(`p${i}EV_HP`, ev.hp??0); set(`p${i}EV_Atk`, ev.atk??0); set(`p${i}EV_Def`, ev.def??0);
    set(`p${i}EV_SpA`, ev.spa??0); set(`p${i}EV_SpD`, ev.spd??0); set(`p${i}EV_Spe`, ev.spe??0);
    const mv = Array.isArray(m.moves)? m.moves: [];
    set(`p${i}Move1`, mv[0]||''); set(`p${i}Move2`, mv[1]||''); set(`p${i}Move3`, mv[2]||''); set(`p${i}Move4`, mv[3]||'');
  }
  refreshPartyJSON();
}
function applyTeamToParty(team){
  const mem=team.members||[];
  for(let i=1;i<=6;i++){
    const m=mem[i-1]||{name:'',item:'',tera:'',moves:[]};
    set(`p${i}Name`,m.name||''); set(`p${i}Item`,m.item||''); set(`p${i}Tera`,m.tera||'');
    const mv = Array.isArray(m.moves)? m.moves: []; set(`p${i}Move1`, mv[0]||''); set(`p${i}Move2`, mv[1]||''); set(`p${i}Move3`, mv[2]||''); set(`p${i}Move4`, mv[3]||'');
    const meta=document.getElementById(`p${i}Meta`); if(meta) meta.textContent=`S${team.meta.season||'?'} ${team.meta.rule||''}`+(team.meta.rank?` / 順位:${team.meta.rank}`:'');
  }
  refreshPartyJSON();
  tabs.forEach(x=>x.classList.remove('active')); document.querySelector('.tab[data-tab="party"]')?.classList.add('active');
  Object.values(sections).forEach(s=>s&&s.classList.add('hidden')); sections.party && sections.party.classList.remove('hidden');
}
for(let i=1;i<=6;i++){
  ['Name','Item','Tera','Nature','EV_HP','EV_Atk','EV_Def','EV_SpA','EV_SpD','EV_Spe','Move1','Move2','Move3','Move4'].forEach(f=>{
    document.addEventListener('input',e=>{ if(e.target && e.target.id===`p${i}${f}`) refreshPartyJSON(); });
    document.addEventListener('change',e=>{ if(e.target && e.target.id===`p${i}${f}`) refreshPartyJSON(); });
  });
}
document.getElementById('copyPartyJSON')?.addEventListener('click',()=>{ const ta=document.getElementById('partyJSON'); if(!ta) return; ta.select(); document.execCommand('copy'); });
document.getElementById('clearParty')?.addEventListener('click',()=>{ buildPartyUI(); refreshPartyJSON(); buildPartyStorageBar(); });
refreshPartyJSON();

/* 保存スロット（LocalStorage） */
function getPartySlots(){ try{ return JSON.parse(localStorage.getItem('pokeapp_party_slots')||'{}'); }catch(_){ return {}; } }
function putPartySlots(obj){ try{ localStorage.setItem('pokeapp_party_slots', JSON.stringify(obj)); }catch(_){ } }
function refreshPartySlotSelect(){
  const sel=document.getElementById('partySlotSel'); if(!sel) return;
  const slots=getPartySlots(); const last=localStorage.getItem('pokeapp_party_last')||'';
  sel.innerHTML=''; 
  Object.keys(slots).sort().forEach(name=>{ const o=document.createElement('option'); o.value=name; o.textContent=name; sel.appendChild(o); });
  if(last && slots[last]) sel.value=last;
}
function buildPartyStorageBar(){
  const host = sections.party; if(!host) return;
  if(document.getElementById('partyStoreBar')) return;
  const bar=document.createElement('div'); bar.id='partyStoreBar'; bar.className='flex'; bar.style.gap='8px'; bar.style.margin='8px 0';
  const nameIn = createInput('partySlotName','スロット名');
  const sel = createSelect('partySlotSel');
  const bSave = createBtn('保存','partySave');
  const bLoad = createBtn('読込','partyLoad');
  const bDel  = createBtn('削除','partyDel');
  const bExp  = createBtn('すべて書出','partyExport');
  const bImp  = createBtn('一括読込','partyImport');
  bar.append(nameIn, bSave, sel, bLoad, bDel, bExp, bImp);
  host.insertBefore(bar, host.firstChild);

  bSave.onclick=()=>{
    const nm=(nameIn.value||'').trim() || prompt('スロット名を入力') || '';
    if(!nm) return;
    const slots=getPartySlots(); slots[nm]={members:getParty()};
    putPartySlots(slots); localStorage.setItem('pokeapp_party_last', nm);
    refreshPartySlotSelect(); alert('保存しました');
  };
  bLoad.onclick=()=>{
    const nm=document.getElementById('partySlotSel').value; if(!nm){ alert('スロットがありません'); return; }
    const slots=getPartySlots(); const data=slots[nm]; if(!data){ alert('データが見つかりません'); return; }
    applyPartySnapshot(data); localStorage.setItem('pokeapp_party_last', nm);
    alert(`読込：${nm}`);
  };
  bDel.onclick=()=>{
    const nm=document.getElementById('partySlotSel').value; if(!nm) return;
    if(!confirm(`削除しますか？ [${nm}]`)) return;
    const slots=getPartySlots(); delete slots[nm]; putPartySlots(slots);
    if(localStorage.getItem('pokeapp_party_last')===nm) localStorage.removeItem('pokeapp_party_last');
    refreshPartySlotSelect(); alert('削除しました');
  };
  bExp.onclick=()=> downloadFile('party_slots.json', JSON.stringify(getPartySlots(),null,2));
  bImp.onclick=()=>{
    const fi=document.createElement('input'); fi.type='file'; fi.accept='.json,application/json';
    fi.onchange=async ()=>{ const f=fi.files[0]; if(!f) return; const txt=await f.text(); try{ const obj=JSON.parse(txt); if(!obj || typeof obj!=='object'){ alert('不正なJSON'); return; } putPartySlots(obj); refreshPartySlotSelect(); alert('読込完了'); }catch(e){ alert('JSON読込エラー: '+e.message); } };
    fi.click();
  };
  refreshPartySlotSelect();

  // オートセーブ復元
  try{
    const auto = JSON.parse(localStorage.getItem('pokeapp_party_autosave')||'null');
    if(auto && auto.members) applyPartySnapshot(auto);
  }catch(_){}
}
buildPartyStorageBar();

/* =========================================================
   計算ログ 保存／読込（LocalStorage + TXT）
========================================================= */
function buildLogStorageBar(){
  const area=logBox; if(!area) return;
  if(document.getElementById('logStoreBar')) return;
  const bar=document.createElement('div'); bar.id='logStoreBar'; bar.className='flex'; bar.style.gap='8px'; bar.style.margin='8px 0';
  const bSave=createBtn('計算ログ保存','logSave');
  const bLoad=createBtn('計算ログ読込','logLoad');
  const bExp =createBtn('TXT書出','logExport');
  const bImp =createBtn('TXT読込','logImport');
  bar.append(bSave,bLoad,bExp,bImp);
  area.parentElement.insertBefore(bar, area.nextSibling);

  bSave.onclick=()=>{ try{ localStorage.setItem('pokeapp_log', JSON.stringify(LOG)); alert('保存しました'); }catch(e){ alert('保存失敗'); } };
  bLoad.onclick=()=>{ try{ const arr=JSON.parse(localStorage.getItem('pokeapp_log')||'[]'); if(Array.isArray(arr)){ LOG=arr; writeLog(); alert('読込しました'); } else alert('データなし'); }catch(e){ alert('読込失敗'); } };
  bExp.onclick=()=> downloadFile('battle_calc_log.txt', (LOG||[]).join('\n'), 'text/plain');
  bImp.onclick=()=>{
    const fi=document.createElement('input'); fi.type='file'; fi.accept='.txt,text/plain';
    fi.onchange=async ()=>{ const f=fi.files[0]; if(!f) return; const txt=await f.text(); LOG=(txt.split(/\r?\n/).filter(x=>x.trim().length)); writeLog(); alert('TXT読込完了'); };
    fi.click();
  };
  // 起動時に自動復元
  try{ const arr=JSON.parse(localStorage.getItem('pokeapp_log')||'[]'); if(Array.isArray(arr) && arr.length){ LOG=arr; writeLog(); } }catch(_){}
}
buildLogStorageBar();

/* =========================================================
   ★ 対戦ログ（専用フォーム＋一覧＋保存/読込/インポート/エクスポート）
========================================================= */
const BATTLE_KEY = 'pokeapp_battles';
function loadBattles(){ try{ return JSON.parse(localStorage.getItem(BATTLE_KEY)||'[]'); }catch(_){ return []; } }
function saveBattles(arr){ try{ localStorage.setItem(BATTLE_KEY, JSON.stringify(arr)); }catch(_){ } }
function nowIso(){ return new Date().toISOString(); }
function ymdhm(d=new Date()){ const pad=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; }
function getPartySlotsNames(){ return Object.keys(getPartySlots()).sort(); }

function buildBattleLogUI(){
  const host = sections.memo; if(!host) return;
  const wrap = document.createElement('div');
  wrap.className='card';
  wrap.innerHTML = `
    <h3>対戦ログ</h3>
    <div class="grid grid-2">
      <div>
        <div class="row"><label>日時</label><input id="bl_time" class="small"></div>
        <div class="row"><label>相手</label><input id="bl_opponent" class="small" placeholder="相手名/トレーナー名"></div>
        <div class="row"><label>ルール</label>
          <select id="bl_rule" class="small">
            <option value="シングル">シングル</option>
            <option value="ダブル">ダブル</option>
            <option value="その他">その他</option>
          </select>
        </div>
        <div class="row"><label>シーズン</label><input id="bl_season" class="small" type="number" placeholder="例: 33"></div>
        <div class="row"><label>結果</label>
          <select id="bl_result" class="small">
            <option value="勝ち">勝ち</option>
            <option value="負け">負け</option>
            <option value="引き分け">引き分け</option>
          </select>
        </div>
        <div class="row"><label>スコア</label><input id="bl_score" class="small" placeholder="例: 3-0"></div>
        <div class="row"><label>ターン数</label><input id="bl_turns" class="small" type="number" placeholder="例: 17"></div>
        <div class="row"><label>レート 前→後</label>
          <div class="flex">
            <input id="bl_rate_before" type="number" class="small" placeholder="前">
            <input id="bl_rate_after"  type="number" class="small" placeholder="後">
          </div>
        </div>
      </div>
      <div>
        <div class="row"><label>自分のパーティ（スロット）</label>
          <select id="bl_my_slot" class="small"></select>
        </div>
        <div class="row"><label>相手の6体（改行/カンマ区切り）</label>
          <textarea id="bl_opp_team" rows="4" class="small" placeholder="例：ミライドン, ホウオウ, ディンルー, ..."></textarea>
        </div>
        <div class="row"><label>メモ</label>
          <textarea id="bl_notes" rows="4" class="small" placeholder="試合の要点/反省点など"></textarea>
        </div>
      </div>
    </div>
    <div class="flex" style="gap:8px;margin-top:8px">
      <button id="bl_save"  class="btn">保存</button>
      <button id="bl_clear" class="btn btn-ghost">フォームクリア</button>
      <button id="bl_export" class="btn btn-ghost">全件エクスポート</button>
      <button id="bl_import" class="btn btn-ghost">インポート</button>
    </div>
    <hr>
    <div class="row"><label>フィルタ</label>
      <input id="bl_filter" class="small" placeholder="相手名/結果/シーズン など部分一致">
    </div>
    <div id="bl_list"></div>
  `;
  host.prepend(wrap);

  document.getElementById('bl_time').value = ymdhm();
  refreshBLSlot();

  document.getElementById('bl_save').onclick = saveBattleFromForm;
  document.getElementById('bl_clear').onclick = clearBattleForm;
  document.getElementById('bl_export').onclick = ()=> downloadFile('battle_logs.json', JSON.stringify(loadBattles(),null,2));
  document.getElementById('bl_import').onclick = ()=>{
    const fi=document.createElement('input'); fi.type='file'; fi.accept='.json,application/json';
    fi.onchange=async ()=>{ const f=fi.files[0]; if(!f) return; const txt=await f.text(); try{ const arr=JSON.parse(txt); if(!Array.isArray(arr)) return alert('配列JSONが必要です'); saveBattles(arr); renderBattleList(); alert('読込完了'); }catch(e){ alert('JSON読込エラー: '+e.message); } };
    fi.click();
  };
  document.getElementById('bl_filter').addEventListener('input', renderBattleList);
  renderBattleList();
}
function refreshBLSlot(){
  const sel = document.getElementById('bl_my_slot'); if(!sel) return;
  sel.innerHTML='';
  const names = getPartySlotsNames();
  const defOpt = document.createElement('option'); defOpt.value=''; defOpt.textContent='（未指定）'; sel.appendChild(defOpt);
  names.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
  const last=localStorage.getItem('pokeapp_party_last'); if(last && names.includes(last)) sel.value=last;
}
function readOppTeamTextarea(){
  const raw = (document.getElementById('bl_opp_team').value||'').trim();
  if(!raw) return [];
  return raw.split(/\r?\n|,/).map(s=>s.trim()).filter(Boolean);
}
function clearBattleForm(){
  set('bl_time', ymdhm());
  set('bl_opponent',''); set('bl_rule','シングル'); set('bl_season','');
  set('bl_result','勝ち'); set('bl_score',''); set('bl_turns',''); set('bl_rate_before',''); set('bl_rate_after','');
  set('bl_opp_team',''); set('bl_notes',''); refreshBLSlot();
  delete window.__BL_EDITING__;
}
function saveBattleFromForm(){
  const entry = {
    id: window.__BL_EDITING__?.id || crypto.randomUUID?.() || ('b_'+Date.now()),
    ts: nowIso(),
    time: document.getElementById('bl_time').value || ymdhm(),
    opponent: document.getElementById('bl_opponent').value||'',
    rule: document.getElementById('bl_rule').value||'',
    season: Number(document.getElementById('bl_season').value)||null,
    result: document.getElementById('bl_result').value||'',
    score: document.getElementById('bl_score').value||'',
    turns: Number(document.getElementById('bl_turns').value)||null,
    rate_before: Number(document.getElementById('bl_rate_before').value)||null,
    rate_after:  Number(document.getElementById('bl_rate_after').value)||null,
    my_slot: document.getElementById('bl_my_slot').value||'',
    opp_team: readOppTeamTextarea(),
    notes: document.getElementById('bl_notes').value||''
  };
  const arr = loadBattles();
  const idx = arr.findIndex(x=>x.id===entry.id);
  if(idx>=0) arr[idx]=entry; else arr.unshift(entry);
  saveBattles(arr);
  renderBattleList();
  alert(idx>=0?'更新しました':'保存しました');
  clearBattleForm();
}
function renderBattleList(){
  const box = document.getElementById('bl_list'); if(!box) return;
  const q=(document.getElementById('bl_filter').value||'').toLowerCase().trim();
  const arr = loadBattles();
  const src = !q ? arr : arr.filter(e=>{
    const hay = `${e.time} ${e.opponent} ${e.rule} S${e.season||''} ${e.result} ${e.score} ${e.my_slot} ${(e.opp_team||[]).join(' ')}`.toLowerCase();
    return hay.includes(q);
  });
  box.innerHTML='';
  if(!src.length){ const d=document.createElement('div'); d.className='muted'; d.textContent='対戦ログはありません。'; box.appendChild(d); return; }
  src.forEach(e=>{
    const c=document.createElement('div'); c.className='card small';
    c.innerHTML=`
      <div class="flex" style="gap:6px;align-items:center;flex-wrap:wrap">
        <span class="pill">${e.time}</span>
        <span class="pill">${e.rule}${e.season?` / S${e.season}`:''}</span>
        <span class="pill">${e.result}${e.score?` (${e.score})`:''}</span>
        ${e.my_slot?`<span class="pill">自分:${e.my_slot}</span>`:''}
        ${e.opponent?`<strong>${e.opponent}</strong>`:''}
      </div>
      ${e.opp_team?.length?`<div class="small muted" style="margin-top:4px">相手: ${e.opp_team.join(', ')}</div>`:''}
      ${e.notes?`<div class="small" style="margin-top:4px;white-space:pre-wrap">${e.notes}</div>`:''}
      ${(Number.isFinite(e.rate_before)||Number.isFinite(e.rate_after))?`<div class="small muted" style="margin-top:4px">Rate: ${e.rate_before??'-'} → ${e.rate_after??'-'}</div>`:''}
      <div class="flex" style="gap:6px;margin-top:6px">
        <button class="btn btn-ghost small" data-act="edit">編集</button>
        <button class="btn btn-ghost small" data-act="del">削除</button>
        <button class="btn btn-ghost small" data-act="copy">コピー</button>
      </div>
    `;
    c.querySelector('[data-act="edit"]').onclick=()=>{
      window.__BL_EDITING__ = e;
      set('bl_time', e.time||ymdhm());
      set('bl_opponent', e.opponent||''); set('bl_rule', e.rule||'シングル'); set('bl_season', e.season??'');
      set('bl_result', e.result||'勝ち'); set('bl_score', e.score||''); set('bl_turns', e.turns??'');
      set('bl_rate_before', e.rate_before??''); set('bl_rate_after', e.rate_after??'');
      refreshBLSlot(); set('bl_my_slot', e.my_slot||'');
      set('bl_opp_team', (e.opp_team||[]).join(', ')); set('bl_notes', e.notes||'');
      window.scrollTo({top:0, behavior:'smooth'});
    };
    c.querySelector('[data-act="del"]').onclick=()=>{
      if(!confirm('この対戦ログを削除しますか？')) return;
      const arr=loadBattles().filter(x=>x.id!==e.id); saveBattles(arr); renderBattleList();
    };
    c.querySelector('[data-act="copy"]').onclick=()=>{
      const lines=[
        `日時: ${e.time}`, `相手: ${e.opponent||'-'}`, `ルール: ${e.rule}${e.season?` / S${e.season}`:''}`,
        `結果: ${e.result}${e.score?` (${e.score})`:''}`, `ターン: ${e.turns??'-'}`,
        `レート: ${(e.rate_before??'-')} → ${(e.rate_after??'-')}`, `自分PT: ${e.my_slot||'-'}`,
        `相手PT: ${(e.opp_team||[]).join(', ')||'-'}`, `メモ:\n${e.notes||''}`
      ];
      navigator.clipboard?.writeText(lines.join('\n'));
      alert('クリップボードにコピーしました');
    };
    box.appendChild(c);
  });
}
buildBattleLogUI();

/* =========================================================
   タイマー本体（Top Dock と連携）
========================================================= */
let timer=null, remainMs=0;
function updateTimerBadge(){ const b=document.getElementById('badgeTimer'); if(b) b.textContent = `タイマー: ${timer?'動作中':'停止'}`; }
function fmt(ms){ const s=Math.max(0,Math.floor(ms/1000)); const m=Math.floor(s/60), r=s%60; return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`; }
document.getElementById('timerStart')?.addEventListener('click',()=>{
  const min=val('timerMin',15); remainMs=min*60*1000;
  set('timerState','動作中'); updateTimerBadge();
  if(timer) clearInterval(timer);
  timer=setInterval(()=>{
    remainMs-=1000; const el=document.getElementById('timerRemain'); el && (el.textContent=fmt(remainMs));
    if(remainMs<=0){ clearInterval(timer); timer=null; set('timerState','終了'); updateTimerBadge(); alert('タイマー終了'); }
  },1000);
});
document.getElementById('timerStop')?.addEventListener('click',()=>{ if(timer){ clearInterval(timer); timer=null; set('timerState','停止中'); updateTimerBadge(); } });
document.getElementById('timerReset')?.addEventListener('click',()=>{ if(timer){ clearInterval(timer); timer=null; } const el=document.getElementById('timerRemain'); el && (el.textContent='00:00'); set('timerState','停止中'); updateTimerBadge(); });
updateTimerBadge();
const bL=document.getElementById('badgeLog'); if(bL) bL.textContent='計算ログ: 0件';

/* =========================================================
   Service Worker 登録（任意）
========================================================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(console.error);
  });
}

