/* =========================
   共通ユーティリティ（互換版）
========================== */
function byId(id){ return document.getElementById(id); }
function setVal(id,v){ var el=byId(id); if(el!=null) el.value=v; }
function getVal(id,def){
  var el=byId(id); if(!el) return def;
  var n = (el.type==='number' || el.type==='range') ? Number(el.value) : Number(el.value);
  return isFinite(n) ? n : (el.value!=='' ? el.value : def);
}
function setText(id,v){ var el=byId(id); if(el!=null) el.textContent=v; }
function addEvt(id,ev,fn){ var el=byId(id); if(el) el.addEventListener(ev,fn,false); }
function pct(x,tot){ return tot? (x/tot*100).toFixed(1):'0.0'; }
function ceilDiv(a,b){ b=b||1; return Math.floor((a+b-1)/b); }
function downloadFile(name, text, mime){ var blob=new Blob([text],{type:mime||'application/json'}); var a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function(){ URL.revokeObjectURL(a.href); },0); }

/* =========================
   最上部タイバー（常時表示・極小）
========================== */
document.addEventListener('DOMContentLoaded', function(){
  if(byId('timerTopDock')) return;

  // ▼ 既定でコンパクト表示（前回状態を復元）
  var compactPref = (function(){
    try{ return localStorage.getItem('pokeapp_timer_compact')==='1'; }catch(e){ return true; }
  })();

  var bar=document.createElement('div');
  bar.id='timerTopDock';
  bar.style.position='sticky';
  bar.style.top='0';
  bar.style.zIndex='999';
  bar.style.background='#0f1115';
  bar.style.color='#fff';
  bar.style.borderBottom='1px solid #2a2d33';
  bar.style.padding='4px 8px';              // ← 小さく
  bar.style.display='flex';
  bar.style.gap='6px';                       // ← 小さく
  bar.style.alignItems='center';
  bar.style.flexWrap='wrap';
  bar.style.fontSize='12px';                 // ← 小さく

  function mk(tag, id, text){
    var el=document.createElement(tag);
    if(id) el.id=id;
    if(text!=null) el.textContent=text;
    if(tag==='input'){ el.type='number'; el.className='small'; el.style.width='70px'; }
    if(tag==='button'){ el.className='btn small'; el.style.padding='2px 6px'; el.style.fontSize='12px'; }
    return el;
  }

  var label = mk('span', null, '⏱');
  var badge = mk('span', 'badgeTimer', 'タイマー: 停止');
  var min   = mk('input','timerMin'); min.min='1'; min.value='15'; min.title='分';
  var start = mk('button','timerStart','開始');
  var stop  = mk('button','timerStop','停止');
  var reset = mk('button','timerReset','0');
  var remain= mk('span','timerRemain','00:00');
  var state = mk('span','timerState','停止中');

  // ▼ コンパクト切替ボタン（常に右端）
  var toggle = mk('button','timerCompactToggle', compactPref?'展開':'縮小');
  toggle.style.marginLeft='auto';

  // 並べる
  bar.appendChild(label);
  bar.appendChild(badge);
  bar.appendChild(min);
  bar.appendChild(start);
  bar.appendChild(stop);
  bar.appendChild(reset);
  bar.appendChild(remain);
  bar.appendChild(state);
  bar.appendChild(toggle);

  document.body.insertBefore(bar, document.body.firstChild);

  // ▼ コンパクト表示：残り時間だけ + 切替ボタン
  function setCompact(on){
    var ids=['badgeTimer','timerMin','timerStart','timerStop','timerReset','timerState'];
    for(var i=0;i<ids.length;i++){
      var el=byId(ids[i]); if(el){ el.style.display = on ? 'none' : ''; }
    }
    // ラベルも小さく
    label.style.display = on ? 'none' : '';
    toggle.textContent = on ? '展開' : '縮小';
    try{ localStorage.setItem('pokeapp_timer_compact', on?'1':'0'); }catch(e){}
  }

  toggle.addEventListener('click', function(){
    var on = (toggle.textContent==='縮小'); // 今「縮小」と出てる＝これから縮小
    setCompact(on);
  }, false);

  // 初期状態
  setCompact(compactPref);
});


/* =========================
   タブ
========================== */
var tabs = document.querySelectorAll('.tab');
var sections = {
  calc:  byId('tab-calc'),
  stats: byId('tab-stats'),
  v13:   byId('tab-v13'),
  sr:    byId('tab-sr'),
  teams: byId('tab-teams'),
  party: byId('tab-party'),
  memo:  byId('tab-memo')
};
for(var i=0;i<tabs.length;i++){
  (function(btn){
    btn.addEventListener('click', function(){
      for(var j=0;j<tabs.length;j++) tabs[j].classList.remove('active');
      btn.classList.add('active');
      for(var k in sections){ if(sections[k]) sections[k].classList.add('hidden'); }
      var tgt = sections[btn.dataset.tab];
      if(tgt) tgt.classList.remove('hidden');
    }, false);
  })(tabs[i]);
}

/* =========================
   ランク補正
========================== */
var RANK={
  "-6":2/8,"-5":2/7,"-4":2/6,"-3":2/5,"-2":2/4,"-1":2/3,
  "0":1,"1":1.5,"2":2,"3":2.5,"4":3,"5":3.5,"6":4
};
function fillSelectNum(id, arr, def){
  var s=byId(id); if(!s) return;
  s.innerHTML='';
  for(var i=0;i<arr.length;i++){ var o=document.createElement('option'); o.value=String(arr[i]); o.textContent=String(arr[i]); s.appendChild(o); }
  if(def!==undefined) s.value=String(def);
}
function fillTypeSel(id){
  var s=byId(id); if(!s) return;
  var a=['0.25','0.5','1','2','4']; s.innerHTML='';
  for(var i=0;i<a.length;i++){ var o=document.createElement('option'); o.value=a[i]; o.textContent=a[i]; s.appendChild(o); }
  s.value='1';
}
function fillWeatherSel(id){
  var s=byId(id); if(!s) return;
  var a=['none','sun','rain','sand','snow']; s.innerHTML='';
  for(var i=0;i<a.length;i++){ var o=document.createElement('option'); o.value=a[i]; o.textContent=a[i]; s.appendChild(o); }
  s.value='none';
}
function fillMoveTypeSel(id){
  var s=byId(id); if(!s) return;
  var a=['炎','水','電気','草','氷','格闘','毒','地面','飛行','エスパー','虫','岩','ゴースト','ドラゴン','悪','鋼','フェアリー','ノーマル'];
  s.innerHTML='';
  for(var i=0;i<a.length;i++){ var o=document.createElement('option'); o.value=a[i]; o.textContent=a[i]; s.appendChild(o); }
  s.value='ノーマル';
}
fillSelectNum('atkRank', Object.keys(RANK), '0');
fillSelectNum('defRank', Object.keys(RANK), '0');
fillSelectNum('hits', (function(){var x=[],i; for(i=1;i<=10;i++) x.push(i); return x;})(), 1);
fillTypeSel('v13_type1'); fillTypeSel('v13_type2'); fillTypeSel('v13_type3');
fillWeatherSel('v13_weather1'); fillWeatherSel('v13_weather2'); fillWeatherSel('v13_weather3');
fillMoveTypeSel('moveType'); fillMoveTypeSel('v13_moveType');
fillSelectNum('v13_atkRank', Object.keys(RANK), '0');
fillSelectNum('v13_defRank1', Object.keys(RANK), '0');
fillSelectNum('v13_defRank2', Object.keys(RANK), '0');
fillSelectNum('v13_defRank3', Object.keys(RANK), '0');
fillSelectNum('v13_hits', (function(){var x=[],i; for(i=1;i<=10;i++) x.push(i); return x;})(), 1);

/* =========================
   図鑑（pokemon_master.json）
========================== */
var PM = { list: [], byName: {}, ready: false };
function rebuildDexList(){
  var dl=byId('dexList'); if(!dl) return;
  dl.innerHTML='';
  var src = PM.list.length ? PM.list : [];
  for(var i=0;i<src.length;i++){
    var name = src[i]['名前'];
    if(name){ var opt=document.createElement('option'); opt.value=name; dl.appendChild(opt); }
  }
}
function loadPokemonMaster(){
  if(PM.ready) return Promise.resolve();
  var tryPaths=['./data/pokemon_master.json','./pokemon_master.json','/data/pokemon_master.json','/pokemon_master.json'];
  var p = Promise.resolve();
  function tryFetch(idx){
    if(idx>=tryPaths.length) return Promise.resolve(null);
    return fetch(tryPaths[idx], {cache:'no-store'}).then(function(r){
      if(!r.ok) return tryFetch(idx+1);
      return r.json().catch(function(){ return tryFetch(idx+1); });
    }).catch(function(){ return tryFetch(idx+1); });
  }
  return tryFetch(0).then(function(data){
    if(!data || !data.length){ return; }
    PM.list = data;
    PM.byName = {};
    for(var i=0;i<data.length;i++){
      var n = data[i]['名前'];
      if(n) PM.byName[n]=data[i];
    }
    PM.ready = true; rebuildDexList(); document.dispatchEvent(new Event('dex-ready'));
  });
}
window.addEventListener('load', loadPokemonMaster);
function findMonByName(name){
  if(!name) return null;
  if(PM.ready && PM.byName[name]) return PM.byName[name];
  return null;
}

/* =========================
   実数値（メイン atk/def）
========================== */
var STAT_ORDER=['HP','攻撃','防御','特攻','特防','素早'];
function buildStatsUI(side){
  var box=byId('stats-'+side); if(!box) return;
  box.innerHTML='';
  var wrap=document.createElement('div');
  for(var i=0;i<STAT_ORDER.length;i++){
    var k=STAT_ORDER[i];
    var row=document.createElement('div'); row.className='row';
    row.innerHTML='<label>'+k+'</label>\
      <div class="flex" style="gap:6px;flex-wrap:wrap">\
        <input type="number" placeholder="種族値" id="'+side+'_base_'+k+'" style="width:90px">\
        <input type="number" placeholder="個体値(0-31)" id="'+side+'_iv_'+k+'" value="31" style="width:110px">\
        <input type="number" placeholder="努力値(0-252)" id="'+side+'_ev_'+k+'" value="0" style="width:110px">\
        <select id="'+side+'_nat_'+k+'" style="width:90px">\
          <option value="1.1">1.1</option><option value="1.0" selected>1.0</option><option value="0.9">0.9</option>\
        </select>\
        <input type="number" id="'+side+'_final_'+k+'" placeholder="実数値" readonly style="width:110px">\
        <button class="btn btn-ghost small" type="button" data-ev="'+side+':'+k+':0">EV0</button>\
        <button class="btn btn-ghost small" type="button" data-ev="'+side+':'+k+':252">EV252</button>\
      </div>';
    wrap.appendChild(row);
  }
  box.appendChild(wrap);
}
buildStatsUI('atk'); buildStatsUI('def');

function calcStat(base, iv, ev, lv, nat, isHP){
  if(isHP){ return Math.floor(((2*base+iv+Math.floor(ev/4))*lv)/100)+lv+10; }
  var v = Math.floor(((2*base+iv+Math.floor(ev/4))*lv)/100)+5;
  return Math.floor(v*nat);
}
function recalcSide(side){
  for(var i=0;i<STAT_ORDER.length;i++){
    var k=STAT_ORDER[i];
    var base=Number(byId(side+'_base_'+k).value||50);
    var iv  =Number(byId(side+'_iv_'+k).value||31);
    var ev  =Number(byId(side+'_ev_'+k).value||0);
    var nat =Number(byId(side+'_nat_'+k).value||1);
    var final=calcStat(base,iv,ev,50,nat,(k==='HP'));
    setVal(side+'_final_'+k, final);
  }
}
document.addEventListener('click', function(e){
  var t=e.target; if(!t || !t.dataset) return;
  if(t.dataset.ev){
    var a=t.dataset.ev.split(':'); var side=a[0], k=a[1], v=Number(a[2]);
    setVal(side+'_ev_'+k, v); recalcSide(side);
  }
}, false);
document.addEventListener('input', function(e){
  var id=e.target && e.target.id; if(!id) return;
  var m = id.match(/^(atk|def)_(base|iv|ev|nat)_(.+)$/);
  if(m){ recalcSide(m[1]); }
}, false);
recalcSide('atk'); recalcSide('def');

function getStatFromMon(mon, key){
  if(!mon) return undefined;
  var map={
    'HP':['HP','ＨＰ','hp'],
    '攻撃':['攻撃','こうげき','攻','atk'],
    '防御':['防御','ぼうぎょ','防','def'],
    '特攻':['特攻','とくこう','spa','特攻撃'],
    '特防':['特防','とくぼう','spd'],
    '素早':['素早','素早さ','すばやさ','spe']
  };
  var keys=map[key]||[key], i, k;
  for(i=0;i<keys.length;i++){ k=keys[i]; if(mon[k]!=null && mon[k]!=='') return Number(mon[k]); }
  return undefined;
}
function applyMonToBase(side, mon){
  if(!mon) return;
  for(var i=0;i<STAT_ORDER.length;i++){
    var k=STAT_ORDER[i], v=getStatFromMon(mon,k);
    if(v!=null) setVal(side+'_base_'+k, v);
  }
  var tbox = byId(side+'_typebox');
  if(tbox){
    var t1=mon['タイプ1']||'', t2=mon['タイプ2']||'';
    tbox.textContent = t2 ? (t1+' / '+t2) : t1;
  }
  recalcSide(side);
}
document.addEventListener('input', function(e){
  var id=e.target && e.target.id; if(!id) return;
  if(id==='dexSearchAtk'){
    var mon=findMonByName((e.target.value||'').trim()); if(mon) applyMonToBase('atk',mon);
  }else if(id==='dexSearchDef'){
    var mon2=findMonByName((e.target.value||'').trim()); if(mon2) applyMonToBase('def',mon2);
  }
}, false);
addEvt('btnDexLoad','click', loadPokemonMaster);
addEvt('btnDexClear','click', function(){ PM.ready=false; PM.list=[]; PM.byName={}; rebuildDexList(); });

addEvt('btnApplyStats','click', function(){
  setVal('atkStat', Number(byId('atk_final_攻撃').value||172));
  setVal('defStat', Number(byId('def_final_防御').value||120));
  setVal('defHP',   Number(byId('def_final_HP').value||155));
  var i, k;
  for(i=0;i<tabs.length;i++) tabs[i].classList.remove('active');
  var tb=document.querySelector('.tab[data-tab="calc"]'); if(tb) tb.classList.add('active');
  for(k in sections){ if(sections[k]) sections[k].classList.add('hidden'); }
  if(sections.calc) sections.calc.classList.remove('hidden');
});

/* =========================
   ダメージ計算（メイン1体）
========================== */
var resultBox=byId('result'), hpbar=byId('hpbar'), logBox=byId('logBox'), memoLog=byId('memoLog');
var LOG=[];
function writeLog(){
  if(logBox) logBox.value = LOG.join('\n');
  if(memoLog) memoLog.value = LOG.join('\n');
  var b=byId('badgeLog'); if(b) b.textContent='計算ログ: '+LOG.length+'件';
  try{ localStorage.setItem('pokeapp_log', JSON.stringify(LOG)); }catch(e){}
}
addEvt('btnClearLog','click', function(){ LOG=[]; writeLog(); });
var undoStack=[];
addEvt('btnUndo','click', function(){
  if(!undoStack.length) return;
  var last=undoStack.pop();
  if(logBox) logBox.value=last.log;
  if(memoLog) memoLog.value=last.log;
  setVal('defHP', last.hp);
  if(hpbar) hpbar.style.width= last.hpPct;
});

function dmgRange(opts){
  var level=50, power=opts.power, atk=opts.atk, def=opts.def, stab=opts.stab||1, typeMul=opts.typeMul||1;
  var rankAtk=opts.rankAtk||1, rankDef=opts.rankDef||1, extra=opts.extra||1;
  var mode=opts.mode||'phys', crit=!!opts.crit, moveType=opts.moveType||'ノーマル', weather=opts.weather||'none';
  var rockInSand=!!opts.rockInSand, iceInSnow=!!opts.iceInSnow;
  var weatherMul=1;
  if(weather==='sun'){ if(moveType==='炎') weatherMul=1.5; if(moveType==='水') weatherMul=0.5; }
  if(weather==='rain'){ if(moveType==='水') weatherMul=1.5; if(moveType==='炎') weatherMul=0.5; }
  if(weather==='sand' && mode==='spec' && rockInSand){ def=Math.floor(def*1.5); }
  if(weather==='snow' && mode==='phys' && iceInSnow){ def=Math.floor(def*1.5); }
  var defMul = crit ? 1 : rankDef;
  var base=Math.floor(level*2/5)+2;
  var core=Math.floor(Math.floor(base*power*(atk*rankAtk)/(def*defMul))/50)+2;
  var mn=Math.floor(core*stab*typeMul*0.85*weatherMul*extra);
  var mx=Math.floor(core*stab*typeMul*1.00*weatherMul*extra);
  return [mn,mx];
}
addEvt('btnCalc','click', function(){
  var atkStat=Number(byId('atkStat').value||172);
  var defStat0=Number(byId('defStat').value||120);
  var hp0=Number(byId('defHP').value||155);
  var power=Number(byId('power').value||80);
  var stab=Number(byId('stab').value||1);
  var typeMul=Number(byId('typeMul').value||1);
  var rankAtk=RANK[String(byId('atkRank').value||'0')]||1;
  var rankDef=RANK[String(byId('defRank').value||'0')]||1;
  var extra=Number(byId('extra').value||1);
  var mode=(byId('mode') && byId('mode').value)||'phys';
  var moveType=(byId('moveType') && byId('moveType').value)||'ノーマル';
  var weather=(byId('weather') && byId('weather').value)||'none';
  var critEl=byId('crit'), crit=false;
  if(critEl){ if(critEl.type==='checkbox') crit=critEl.checked; else crit=(Number(critEl.value)>1); }
  var hits=Number(byId('hits') && byId('hits').value || 1);
  var rockInSand=byId('chkRockInSand')? byId('chkRockInSand').checked : false;
  var iceInSnow =byId('chkIceInSnow')? byId('chkIceInSnow').checked : false;

  var r=dmgRange({power:power, atk:atkStat, def:defStat0, stab:stab, typeMul:typeMul, rankAtk:rankAtk, rankDef:rankDef, extra:extra, mode:mode, crit:crit, moveType:moveType, weather:weather, rockInSand:rockInSand, iceInSnow:iceInSnow});
  var mn=r[0], mx=r[1];
  var totMin=mn*hits, totMax=mx*hits;
  var hp=hp0;
  var remMin=Math.max(0,hp-totMax), remMax=Math.max(0,hp-totMin);
  var ko='';
  if(totMin>=hp) ko='確定1発';
  else if(totMax>=hp) ko='乱数1発（高乱数）';
  else { var a=ceilDiv(hp, mn||1), b=ceilDiv(hp, mx||1); ko=(a===b)?('確定'+a+'発'):('乱数'+a+'～'+b+'発'); }

  if(resultBox){
    resultBox.innerHTML = ''+
      '<div class="grid grid-3">'+
      '<div class="card"><div class="small muted">1発あたり</div><div><b>'+mn+' ～ '+mx+'</b></div></div>'+
      '<div class="card"><div class="small muted">'+hits+'回合計</div><div><b>'+totMin+' ～ '+totMax+'</b></div></div>'+
      '<div class="card"><div class="small muted">残りHP</div><div><b>'+remMin+' ～ '+remMax+'</b>（'+pct(remMin,hp)+'% ～ '+pct(remMax,hp)+'%）</div></div>'+
      '</div>'+
      '<div class="small">判定：<b>'+ko+'</b>　最小乱数ダメージ：<b>'+mn+'</b> / 最大乱数ダメージ：<b>'+mx+'</b></div>';
  }
  var remainPct = Math.max(0, 100 - Math.min(100, (totMax/hp*100)));
  if(hpbar) hpbar.style.width = remainPct+'%';

  undoStack.push({log:(logBox?logBox.value:''), hp:hp0, hpPct:'100%'});
  LOG.push('['+new Date().toLocaleTimeString()+'] 威力'+power+' STAB'+stab+' 相性'+typeMul+' 天候'+weather+(rockInSand?'(岩SpD1.5)':'')+(iceInSnow?'(氷Def1.5)':'')+' 急所'+(crit?'有':'無')+' 攻R'+(byId('atkRank')?byId('atkRank').value:0)+' 防R'+(byId('defRank')?byId('defRank').value:0)+' hit'+hits+' → 1発:'+mn+'-'+mx+' 合計:'+totMin+'-'+totMax+' | '+ko);
  writeLog();
});

/* =========================
   1対3（上に自分、下に3体）
========================== */
(function(){
  var sec = sections.v13; if(!sec) return;

  function buildSelf(){
    if(byId('v13_self_search')) return;
    var card=document.createElement('div'); card.className='card small';
    card.innerHTML = ''+
      '<div class="grid grid-3">'+
        '<div class="row"><label>（自分）図鑑検索</label><input id="v13_self_search" list="dexList" placeholder="例：サーフゴー"></div>'+
        '<div class="row"><label>攻撃モード</label>'+
          '<select id="v13_mode"><option value="phys">物理（攻撃→防御）</option><option value="spec">特殊（特攻→特防）</option></select>'+
        '</div>'+
        '<div class="row"><label>前提</label><input value="Lv50 / IV31 / EV0 / 補正1.0" readonly></div>'+
      '</div>'+
      '<div id="v13_self_form" class="mt8"></div>';
    sec.insertBefore(card, sec.firstChild);
  }
  function buildSelfForm(){
    var box=byId('v13_self_form'); if(!box) return;
    box.innerHTML = ['攻撃','特攻'].map(function(k){
      return ''+
      '<div class="row"><label>'+k+'</label>'+
      '<div class="flex" style="gap:6px;flex-wrap:wrap">'+
      '<input type="number" id="v13_self_base_'+k+'" placeholder="種族値" style="width:90px">'+
      '<input type="number" id="v13_self_iv_'+k+'"   placeholder="IV" value="31" min="0" max="31" style="width:80px">'+
      '<input type="number" id="v13_self_ev_'+k+'"   placeholder="EV" value="0" min="0" max="252" step="4" style="width:80px">'+
      '<select id="v13_self_nat_'+k+'" style="width:90px"><option value="1.1">1.1</option><option value="1.0" selected>1.0</option><option value="0.9">0.9</option></select>'+
      '<input type="number" id="v13_self_final_'+k+'" placeholder="実数値" readonly style="width:110px">'+
      '<button class="btn btn-ghost small" type="button" data-v13sev="'+k+':0">EV0</button>'+
      '<button class="btn btn-ghost small" type="button" data-v13sev="'+k+':252">EV252</button>'+
      '</div></div>';
    }).join('');
  }
  function selfRecalc(){
    ['攻撃','特攻'].forEach(function(k){
      var base=Number(byId('v13_self_base_'+k).value||50);
      var iv  =Number(byId('v13_self_iv_'+k).value||31);
      var ev  =Number(byId('v13_self_ev_'+k).value||0);
      var nat =Number(byId('v13_self_nat_'+k).value||1.0);
      var final=calcStat(base,iv,ev,50,nat,false);
      setVal('v13_self_final_'+k, final);
    });
    syncAtkToMode();
  }
  function applySelf(mon){
    ['攻撃','特攻'].forEach(function(k){
      var v=getStatFromMon(mon,k); if(v!=null) setVal('v13_self_base_'+k, v);
    });
    selfRecalc();
  }

  function buildFoe(i){
    var out=byId('v13_out'+i); var holder = out? out.closest('.card.small') : null;
    if(!holder) holder=sec;
    if(byId('v13_enemy_search_'+i)) return;
    var wrap=document.createElement('div');
    wrap.innerHTML = ''+
      '<div class="row"><label>（相手'+i+'）図鑑検索</label><input id="v13_enemy_search_'+i+'" list="dexList" placeholder="例：ピカチュウ"></div>'+
      '<div id="v13_foe_form_'+i+'" class="mt8"></div>';
    holder.insertBefore(wrap, holder.firstChild);
    var box=byId('v13_foe_form_'+i);
    box.innerHTML = ['HP','防御','特防'].map(function(k){
      return ''+
      '<div class="row"><label>'+k+'</label>'+
      '<div class="flex" style="gap:6px;flex-wrap:wrap">'+
      '<input type="number" id="v13_foe'+i+'_base_'+k+'" placeholder="種族値" style="width:90px">'+
      '<input type="number" id="v13_foe'+i+'_iv_'+k+'"   placeholder="IV" value="31" min="0" max="31" style="width:80px">'+
      '<input type="number" id="v13_foe'+i+'_ev_'+k+'"   placeholder="EV" value="0" min="0" max="252" step="4" style="width:80px">'+
      '<select id="v13_foe'+i+'_nat_'+k+'" style="width:90px"><option value="1.1">1.1</option><option value="1.0" selected>1.0</option><option value="0.9">0.9</option></select>'+
      '<input type="number" id="v13_foe'+i+'_final_'+k+'" placeholder="実数値" readonly style="width:110px">'+
      '<button class="btn btn-ghost small" type="button" data-v13fev="'+i+':'+k+':0">EV0</button>'+
      '<button class="btn btn-ghost small" type="button" data-v13fev="'+i+':'+k+':252">EV252</button>'+
      '</div></div>';
    }).join('');
  }
  function foeRecalc(i){
    function one(k,isHP){
      var base=Number(byId('v13_foe'+i+'_base_'+k).value||50);
      var iv  =Number(byId('v13_foe'+i+'_iv_'+k).value||31);
      var ev  =Number(byId('v13_foe'+i+'_ev_'+k).value||0);
      var nat =Number(byId('v13_foe'+i+'_nat_'+k).value||1.0);
      var f=calcStat(base,iv,ev,50,nat,isHP);
      setVal('v13_foe'+i+'_final_'+k, f); return f;
    }
    var hp=one('HP',true), df=one('防御',false), sd=one('特防',false);
    setVal('v13_hp'+i, hp);
    var mode = (byId('v13_mode') && byId('v13_mode').value)||'phys';
    setVal('v13_def'+i, mode==='phys'? df : sd);
  }
  function applyFoe(i,mon){
    ['HP','防御','特防'].forEach(function(k){ var v=getStatFromMon(mon,k); if(v!=null) setVal('v13_foe'+i+'_base_'+k, v); });
    foeRecalc(i); syncAtkToMode();
  }
  function syncAtkToMode(){
    var mode = (byId('v13_mode') && byId('v13_mode').value)||'phys';
    var atkPhys = Number(byId('v13_self_final_攻撃') && byId('v13_self_final_攻撃').value || 172);
    var atkSpec = Number(byId('v13_self_final_特攻') && byId('v13_self_final_特攻').value || 120);
    setVal('v13_atk', mode==='phys'? atkPhys : atkSpec);
    for(var i=1;i<=3;i++){
      var df = Number(byId('v13_foe'+i+'_final_防御') && byId('v13_foe'+i+'_final_防御').value || 120);
      var sd = Number(byId('v13_foe'+i+'_final_特防') && byId('v13_foe'+i+'_final_特防').value || 120);
      setVal('v13_def'+i, mode==='phys'? df : sd);
    }
  }
  function dmgV13(i){
    var atk   = Number(byId('v13_atk').value||172);
    var power = Number(byId('v13_power').value||80);
    var stab  = Number(byId('v13_stab').value||1.5);
    var rankAtk= RANK[String(byId('v13_atkRank').value||'0')]||1;
    var extra  = Number(byId('v13_extra').value||1);
    var mode   = (byId('v13_mode') && byId('v13_mode').value)||'phys';
    var hits   = Number(byId('v13_hits') && byId('v13_hits').value || 1);
    var moveType = (byId('v13_moveType') && byId('v13_moveType').value)||'ノーマル';
    var def    = Number(byId('v13_def'+i).value||120);
    var rankDef= RANK[String(byId('v13_defRank'+i).value||'0')]||1;
    var hp     = Number(byId('v13_hp'+i).value||155);
    var typeMul= Number(byId('v13_type'+i).value||1);
    var weather= (byId('v13_weather'+i) && byId('v13_weather'+i).value)||'none';
    var rockInSand = byId('v13_rock'+i)? byId('v13_rock'+i).checked : false;
    var iceInSnow  = byId('v13_ice'+i)?  byId('v13_ice'+i).checked  : false;
    var critEl=byId('v13_crit'), crit=false;
    if(critEl){ if(critEl.type==='checkbox') crit=critEl.checked; else crit=(Number(critEl.value)>1); }
    var r=dmgRange({power:power, atk:atk, def:def, stab:stab, typeMul:typeMul, rankAtk:rankAtk, rankDef:rankDef, extra:extra, mode:mode, crit:crit, moveType:moveType, weather:weather, rockInSand:rockInSand, iceInSnow:iceInSnow});
    var mn=r[0], mx=r[1], totMin=mn*hits, totMax=mx*hits, txt;
    if(totMin>=hp) txt='確定1発';
    else if(totMax>=hp) txt='乱数1発（高乱数）';
    else { var a=ceilDiv(hp, mn||1), b=ceilDiv(hp, mx||1); txt=(a===b)?('確定'+a+'発'):('乱数'+a+'～'+b+'発'); }
    var out=byId('v13_out'+i);
    if(out) out.textContent='1発:'+mn+'-'+mx+' / 合計:'+totMin+'-'+totMax+' | '+txt;
  }

  buildSelf(); buildSelfForm();
  buildFoe(1); buildFoe(2); buildFoe(3);

  document.addEventListener('click', function(e){
    var t=e.target; if(!t || !t.dataset) return;
    if(t.dataset.v13sev){
      var a=t.dataset.v13sev.split(':'), k=a[0], v=Number(a[1]);
      setVal('v13_self_ev_'+k, v); selfRecalc();
    }else if(t.dataset.v13fev){
      var b=t.dataset.v13fev.split(':'), i=Number(b[0]), kk=b[1], vv=Number(b[2]);
      setVal('v13_foe'+i+'_ev_'+kk, vv); foeRecalc(i); syncAtkToMode();
    }
  }, false);

  document.addEventListener('input', function(e){
    var id=e.target && e.target.id; if(!id) return;
    if(id==='v13_self_search'){ var m=findMonByName((e.target.value||'').trim()); if(m) applySelf(m); }
    else if(/^v13_self_(base|iv|ev|nat)_(攻撃|特攻)$/.test(id)){ selfRecalc(); syncAtkToMode(); }
    else if(/^v13_enemy_search_([1-3])$/.test(id)){ var idx=Number(id.slice(-1)); var m2=findMonByName((e.target.value||'').trim()); if(m2) applyFoe(idx,m2); }
    else if(/^v13_foe([1-3])_(base|iv|ev|nat)_(HP|防御|特防)$/.test(id)){ var idx2=Number(id.match(/^v13_foe([1-3])_/)[1]); foeRecalc(idx2); syncAtkToMode(); }
    else if(id==='v13_mode'){ syncAtkToMode(); }
  }, false);

  addEvt('btnV13','click', function(){ selfRecalc(); foeRecalc(1); foeRecalc(2); foeRecalc(3); syncAtkToMode(); dmgV13(1); dmgV13(2); dmgV13(3); });
})();

/* =========================
   ステルスロック
========================== */
var SR_MAP={'等倍':1,'1/2':0.5,'1/4':0.25,'2倍':2,'4倍':4};
(function(){
  var s=byId('sr_type'); if(!s) return;
  var a=['1/4','1/2','等倍','2倍','4倍']; s.innerHTML='';
  for(var i=0;i<a.length;i++){ var o=document.createElement('option'); o.value=a[i]; o.textContent=a[i]; s.appendChild(o); }
  s.value='等倍';
})();
addEvt('btnSR','click', function(){
  var hp=Number(byId('sr_hp').value||155), t=(byId('sr_type') && byId('sr_type').value)||'等倍';
  var mul=SR_MAP[t]||1; var dmg=Math.floor(hp*0.125*mul);
  setVal('sr_result', dmg+' ダメージ（'+pct(dmg,hp)+'%）');
});

/* =========================
   構築データ（CSV/TSV/PKDB JSON）
========================== */
function parseCSV(txt){
  var rows=txt.split(/\r?\n/).map(function(r){ return r.split(/,|\t/); });
  var out=[], i;
  for(i=0;i<rows.length;i++){ if(rows[i].some(function(x){return x && x.trim().length;})) out.push(rows[i]); }
  return out;
}
function normalizeTeams(rows){
  var out=[], i;
  for(i=0;i<rows.length;i++){
    var r=rows[i], names=r.slice(0,6).map(function(x){ return {name:(x||'').trim()}; });
    if(names.some(function(m){return m.name;})) out.push({meta:{season:'?',rule:'?',rank:null,rating:null}, members:names});
  }
  return out;
}
function normalizeFromPKDB(json){
  var teams=(json.teams||[]).map(function(t){
    return { meta:{season:json.season, rule:json.rule, rank:t.rank||null, rating:t.rating_value||null},
      members:(t.team||[]).map(function(m){ return {name:m.pokemon||m.name||'', item:m.item||'', tera:m.terastal||m.tera||''}; }) };
  });
  return teams;
}
var ALL_TEAMS=[];
function setTeams(arr){ ALL_TEAMS=Array.isArray(arr)?arr:[]; var b=byId('badgeTeams'); if(b) b.textContent='構築: '+ALL_TEAMS.length+'件'; renderTeamsList(); }
var diagBox=byId('diagBox');
addEvt('diagBtn','click', function(){ if(diagBox) diagBox.classList.toggle('hidden'); });
function setTextNode(id,txt){ var el=byId(id); if(el) el.textContent=txt; }
function handleLoad(){
  var f=byId('fileInput') && byId('fileInput').files && byId('fileInput').files[0];
  var pasted = byId('pasteBox') && byId('pasteBox').value && byId('pasteBox').value.trim();
  var info=byId('loadInfo');
  if(!f && !pasted){ if(info) info.textContent='入力がありません'; return; }
  var reader=new FileReader();
  reader.onload=function(){
    var txt=f? reader.result : pasted;
    if(!f) txt=pasted;
    var head=(txt||'').slice(0,400), teams=[], mode='', jsonErr='', rowsCount=0;
    try{
      var json=JSON.parse(txt); mode='JSON';
      if(json && json.teams) teams=normalizeFromPKDB(json);
      else{
        var asRows = Object.prototype.toString.call(json)==='[object Array]'? json : (json && json.rows? json.rows:null);
        if(asRows){ teams=normalizeTeams(asRows); rowsCount=asRows.length; }
      }
    }catch(e){ jsonErr=String(e.message||e); }
    if(!teams.length){ var rows=parseCSV(txt); rowsCount=rows.length; mode=mode||'CSV/TSV'; teams=normalizeTeams(rows); }
    setTextNode('diagMode', mode||'(不明)'); setTextNode('diagCount', String(rowsCount||teams.length)); setTextNode('diagErr', jsonErr||'(なし)'); setTextNode('diagHead', head);
    if(info) info.textContent = teams.length? ('読み込み成功：'+teams.length+'件') : '0件：形式をご確認ください';
    setTeams(teams);
  };
  if(f){ reader.readAsText(f); } else { reader.onload(); }
}
addEvt('loadBtn','click', handleLoad);
addEvt('clearBtn','click', function(){ if(byId('fileInput')) byId('fileInput').value=''; if(byId('pasteBox')) byId('pasteBox').value=''; if(byId('loadInfo')) byId('loadInfo').textContent='未読込'; if(byId('filterBox')) byId('filterBox').value=''; setTeams([]); });
addEvt('demoBtn','click', function(){
  var demo={season:33,rule:"シングル",teams:[{rank:1,rating_value:2180.889,team:[
    {pokemon:"ドドゲザン",terastal:"ほのお",item:"ラムのみ"},
    {pokemon:"マタドガス",form:"ガラルのすがた",terastal:"ノーマル",item:"くろいヘドロ"},
    {pokemon:"キラフロル",terastal:"ノーマル",item:"きあいのタスキ"},
    {pokemon:"ディンルー",terastal:"はがね",item:"オボンのみ"},
    {pokemon:"ルギア",terastal:"ノーマル",item:"たべのこし"},
    {pokemon:"コライドン",terastal:"ほのお",item:"こだわりスカーフ"}
  ]}]};
  setTeams(normalizeFromPKDB(demo)); setTextNode('loadInfo','デモ読込：1件');
});
addEvt('filterBox','input', renderTeamsList);

function renderTeamsList(){
  var box=byId('teamsList'); if(!box) return;
  var f=(byId('filterBox') && byId('filterBox').value || '').trim().toLowerCase();
  box.innerHTML='';
  var src = !f ? ALL_TEAMS : ALL_TEAMS.filter(function(t){
    var inMeta=String(t.meta.season)+' '+String(t.meta.rule)+' '+String(t.meta.rank)+' '+String(t.meta.rating);
    inMeta=inMeta.toLowerCase();
    var inMembers=(t.members||[]).map(function(m){ return (m.name||'')+' '+(m.item||'')+' '+(m.tera||''); }).join(' ').toLowerCase();
    return inMeta.indexOf(f)>-1 || inMembers.indexOf(f)>-1;
  });
  var fc=byId('filterCount'); if(fc) fc.textContent=src.length+' / '+ALL_TEAMS.length;
  if(!src.length){ var d=document.createElement('div'); d.className='muted'; d.textContent='0件です。'; box.appendChild(d); return; }
  for(var i=0;i<src.length;i++){
    var t=src[i]; var card=document.createElement('div'); card.className='card';
    var head=document.createElement('div'); head.className='flex';
    head.innerHTML='<span class="pill">S'+(t.meta.season||'?')+' / '+(t.meta.rule||'')+'</span>'+
      (t.meta.rank?'<span class="pill">順位:'+t.meta.rank+'</span>':'')+
      (t.meta.rating?'<span class="pill">レート:'+t.meta.rating+'</span>':'');
    var mons=document.createElement('div'); mons.className='mons';
    (t.members||[]).forEach(function(m,idx){
      var d2=document.createElement('div'); d2.className='mon';
      d2.innerHTML='<div style="font-weight:700">'+(idx+1)+'. '+(m.name||'-')+'</div><div class="muted">'+(m.item||'')+'</div><div class="muted">テラ:'+(m.tera||'')+'</div>';
      mons.appendChild(d2);
    });
    var btn=document.createElement('button'); btn.className='btn'; btn.textContent='このチームをパーティへ反映';
    (function(team){ btn.addEventListener('click', function(){ applyTeamToParty(team); }, false); })(t);
    card.appendChild(head); card.appendChild(mons); card.appendChild(document.createElement('hr')); card.appendChild(btn); box.appendChild(card);
  }
}

/* =========================
   パーティ（EV/性格/プリセット/技×4）＋保存
========================== */
var partyGrid=byId('partyGrid');
function buildPartyUI(){
  if(!partyGrid) return;
  partyGrid.innerHTML='';
  function btn(id,txt){ return '<button class="btn btn-ghost small" type="button" id="'+id+'">'+txt+'</button>'; }
  for(var i=1;i<=6;i++){
    var c=document.createElement('div'); c.className='card';
    c.innerHTML='' +
      '<div class="slot-h"><strong>スロット '+i+'</strong> <small id="p'+i+'Meta" class="muted"></small></div>'+
      '<div class="row"><label>名前</label><input id="p'+i+'Name" type="text" placeholder="例：サーフゴー" list="dexList"></div>'+
      '<div class="row"><label>持ち物</label><input id="p'+i+'Item" type="text"></div>'+
      '<div class="row"><label>テラタイプ</label><input id="p'+i+'Tera" type="text"></div>'+
      '<hr>'+
      '<div class="row"><label>性格（簡易）</label>'+
        '<select id="p'+i+'Nature">'+
          '<option value="neutral" selected>補正なし</option>'+
          '<option value="adamant">いじっぱり(A↑C↓)</option>'+
          '<option value="modest">ひかえめ(C↑A↓)</option>'+
          '<option value="jolly">ようき(S↑C↓)</option>'+
          '<option value="timid">おくびょう(S↑A↓)</option>'+
          '<option value="impish">わんぱく(Df↑C↓)</option>'+
          '<option value="bold">ずぶとい(Df↑A↓)</option>'+
          '<option value="careful">しんちょう(SpD↑C↓)</option>'+
          '<option value="calm">おだやか(SpD↑A↓)</option>'+
        '</select>'+
      '</div>'+
      '<div class="row"><label>努力値（4の倍数推奨）</label>'+
        '<div class="flex">'+
          '<input type="number" id="p'+i+'EV_HP"  placeholder="H" min="0" max="252" step="4" value="0" style="width:80px">'+
          '<input type="number" id="p'+i+'EV_Atk" placeholder="A" min="0" max="252" step="4" value="0" style="width:80px">'+
          '<input type="number" id="p'+i+'EV_Def" placeholder="B" min="0" max="252" step="4" value="0" style="width:80px">'+
          '<input type="number" id="p'+i+'EV_SpA" placeholder="C" min="0" max="252" step="4" value="0" style="width:80px">'+
          '<input type="number" id="p'+i+'EV_SpD" placeholder="D" min="0" max="252" step="4" value="0" style="width:80px">'+
          '<input type="number" id="p'+i+'EV_Spe" placeholder="S" min="0" max="252" step="4" value="0" style="width:80px">'+
        '</div>'+
      '</div>'+
      '<div class="row"><label>プリセット</label>'+
        '<div class="flex">'+ btn('p'+i+'Preset1','A+S 252') + btn('p'+i+'Preset2','C+S 252') + btn('p'+i+'Preset3','A+H 252') +
        '</div>'+
      '</div>'+
      '<div class="row"><label>技</label>'+
        '<div class="flex" style="gap:6px;flex-wrap:wrap">'+
          '<input id="p'+i+'Move1" type="text" placeholder="技1" style="min-width:160px">'+
          '<input id="p'+i+'Move2" type="text" placeholder="技2" style="min-width:160px">'+
          '<input id="p'+i+'Move3" type="text" placeholder="技3" style="min-width:160px">'+
          '<input id="p'+i+'Move4" type="text" placeholder="技4" style="min-width:160px">'+
        '</div>'+
      '</div>';
    partyGrid.appendChild(c);
    addEvt('p'+i+'Preset1','click', (function(i){ return function(){ setVal('p'+i+'EV_Atk',252); setVal('p'+i+'EV_Spe',252); refreshPartyJSON(); }; })(i));
    addEvt('p'+i+'Preset2','click', (function(i){ return function(){ setVal('p'+i+'EV_SpA',252); setVal('p'+i+'EV_Spe',252); refreshPartyJSON(); }; })(i));
    addEvt('p'+i+'Preset3','click', (function(i){ return function(){ setVal('p'+i+'EV_Atk',252); setVal('p'+i+'EV_HP',252); refreshPartyJSON(); }; })(i));
  }
}
buildPartyUI();
function getParty(){
  var arr=[], i;
  for(i=1;i<=6;i++){
    arr.push({
      name: (byId('p'+i+'Name') && byId('p'+i+'Name').value) || '',
      item: (byId('p'+i+'Item') && byId('p'+i+'Item').value) || '',
      tera: (byId('p'+i+'Tera') && byId('p'+i+'Tera').value) || '',
      nature: (byId('p'+i+'Nature') && byId('p'+i+'Nature').value) || 'neutral',
      ev:{
        hp:  Number(byId('p'+i+'EV_HP')  && byId('p'+i+'EV_HP').value  || 0),
        atk: Number(byId('p'+i+'EV_Atk') && byId('p'+i+'EV_Atk').value || 0),
        def: Number(byId('p'+i+'EV_Def') && byId('p'+i+'EV_Def').value || 0),
        spa: Number(byId('p'+i+'EV_SpA') && byId('p'+i+'EV_SpA').value || 0),
        spd: Number(byId('p'+i+'EV_SpD') && byId('p'+i+'EV_SpD').value || 0),
        spe: Number(byId('p'+i+'EV_Spe') && byId('p'+i+'EV_Spe').value || 0)
      },
      moves:[
        (byId('p'+i+'Move1') && byId('p'+i+'Move1').value)||'',
        (byId('p'+i+'Move2') && byId('p'+i+'Move2').value)||'',
        (byId('p'+i+'Move3') && byId('p'+i+'Move3').value)||'',
        (byId('p'+i+'Move4') && byId('p'+i+'Move4').value)||''
      ]
    });
  }
  return arr;
}
function refreshPartyJSON(){
  var ta=byId('partyJSON'); if(!ta) return;
  var data={members:getParty()};
  ta.value = JSON.stringify(data,null,2);
  try{ localStorage.setItem('pokeapp_party_autosave', JSON.stringify(data)); }catch(e){}
}
function applyPartySnapshot(data){
  var mem=(data && data.members)||[], i, m, mv;
  for(i=1;i<=6;i++){
    m=mem[i-1]||{};
    setVal('p'+i+'Name', m.name||''); setVal('p'+i+'Item', m.item||''); setVal('p'+i+'Tera', m.tera||'');
    setVal('p'+i+'Nature', m.nature||'neutral');
    var ev=m.ev||{};
    setVal('p'+i+'EV_HP', ev.hp||0); setVal('p'+i+'EV_Atk', ev.atk||0); setVal('p'+i+'EV_Def', ev.def||0);
    setVal('p'+i+'EV_SpA', ev.spa||0); setVal('p'+i+'EV_SpD', ev.spd||0); setVal('p'+i+'EV_Spe', ev.spe||0);
    mv = Object.prototype.toString.call(m.moves)==='[object Array]'? m.moves : [];
    setVal('p'+i+'Move1', mv[0]||''); setVal('p'+i+'Move2', mv[1]||''); setVal('p'+i+'Move3', mv[2]||''); setVal('p'+i+'Move4', mv[3]||'');
  }
  refreshPartyJSON();
}
function applyTeamToParty(team){
  var mem=team.members||[], i, m, mv;
  for(i=1;i<=6;i++){
    m=mem[i-1]||{name:'',item:'',tera:'',moves:[]};
    setVal('p'+i+'Name', m.name||''); setVal('p'+i+'Item', m.item||''); setVal('p'+i+'Tera', m.tera||'');
    mv = Object.prototype.toString.call(m.moves)==='[object Array]'? m.moves : [];
    setVal('p'+i+'Move1', mv[0]||''); setVal('p'+i+'Move2', mv[1]||''); setVal('p'+i+'Move3', mv[2]||''); setVal('p'+i+'Move4', mv[3]||'');
    var meta=byId('p'+i+'Meta'); if(meta) meta.textContent='S'+(team.meta.season||'?')+' '+(team.meta.rule||'')+(team.meta.rank?(' / 順位:'+team.meta.rank):'');
  }
  refreshPartyJSON();
  var i2,k;
  for(i2=0;i2<tabs.length;i2++) tabs[i2].classList.remove('active');
  var tb=document.querySelector('.tab[data-tab="party"]'); if(tb) tb.classList.add('active');
  for(k in sections){ if(sections[k]) sections[k].classList.add('hidden'); }
  if(sections.party) sections.party.classList.remove('hidden');
}
(function(){
  var i, flds=['Name','Item','Tera','Nature','EV_HP','EV_Atk','EV_Def','EV_SpA','EV_SpD','EV_Spe','Move1','Move2','Move3','Move4'];
  for(i=1;i<=6;i++){
    (function(i){
      for(var j=0;j<flds.length;j++){
        (function(fid){
          addEvt('p'+i+fid,'input', refreshPartyJSON);
          addEvt('p'+i+fid,'change', refreshPartyJSON);
        })(flds[j]);
      }
    })(i);
  }
})();
addEvt('copyPartyJSON','click', function(){ var ta=byId('partyJSON'); if(!ta) return; ta.select(); document.execCommand('copy'); });
addEvt('clearParty','click', function(){ buildPartyUI(); refreshPartyJSON(); buildPartyStorageBar(); });
refreshPartyJSON();

/* 保存スロット（LocalStorage） */
function getPartySlots(){ try{ return JSON.parse(localStorage.getItem('pokeapp_party_slots')||'{}'); }catch(e){ return {}; } }
function putPartySlots(obj){ try{ localStorage.setItem('pokeapp_party_slots', JSON.stringify(obj)); }catch(e){} }
function refreshPartySlotSelect(){
  var sel=byId('partySlotSel'); if(!sel) return;
  var slots=getPartySlots(); var last=localStorage.getItem('pokeapp_party_last')||'';
  sel.innerHTML='';
  var names=Object.keys(slots).sort();
  for(var i=0;i<names.length;i++){ var o=document.createElement('option'); o.value=names[i]; o.textContent=names[i]; sel.appendChild(o); }
  if(last && slots[last]) sel.value=last;
}
function buildPartyStorageBar(){
  var host=sections.party; if(!host) return;
  if(byId('partyStoreBar')) return;
  var bar=document.createElement('div'); bar.id='partyStoreBar'; bar.className='flex'; bar.style.gap='8px'; bar.style.margin='8px 0';
  var nameIn=document.createElement('input'); nameIn.id='partySlotName'; nameIn.placeholder='スロット名'; nameIn.className='small';
  var sel=document.createElement('select'); sel.id='partySlotSel'; sel.className='small';
  var bSave=document.createElement('button'); bSave.id='partySave'; bSave.className='btn'; bSave.textContent='保存';
  var bLoad=document.createElement('button'); bLoad.id='partyLoad'; bLoad.className='btn'; bLoad.textContent='読込';
  var bDel=document.createElement('button'); bDel.id='partyDel'; bDel.className='btn btn-ghost'; bDel.textContent='削除';
  var bExp=document.createElement('button'); bExp.id='partyExport'; bExp.className='btn btn-ghost'; bExp.textContent='すべて書出';
  var bImp=document.createElement('button'); bImp.id='partyImport'; bImp.className='btn btn-ghost'; bImp.textContent='一括読込';
  bar.appendChild(nameIn); bar.appendChild(bSave); bar.appendChild(sel); bar.appendChild(bLoad); bar.appendChild(bDel); bar.appendChild(bExp); bar.appendChild(bImp);
  host.insertBefore(bar, host.firstChild);

  bSave.onclick=function(){
    var nm=(nameIn.value||'').trim() || prompt('スロット名を入力') || '';
    if(!nm) return;
    var slots=getPartySlots(); slots[nm]={members:getParty()};
    putPartySlots(slots); localStorage.setItem('pokeapp_party_last', nm);
    refreshPartySlotSelect(); alert('保存しました');
  };
  bLoad.onclick=function(){
    var nm=byId('partySlotSel').value; if(!nm){ alert('スロットがありません'); return; }
    var slots=getPartySlots(); var data=slots[nm]; if(!data){ alert('データが見つかりません'); return; }
    applyPartySnapshot(data); localStorage.setItem('pokeapp_party_last', nm);
    alert('読込：'+nm);
  };
  bDel.onclick=function(){
    var nm=byId('partySlotSel').value; if(!nm) return;
    if(!confirm('削除しますか？ ['+nm+']')) return;
    var slots=getPartySlots(); delete slots[nm]; putPartySlots(slots);
    if(localStorage.getItem('pokeapp_party_last')===nm) localStorage.removeItem('pokeapp_party_last');
    refreshPartySlotSelect(); alert('削除しました');
  };
  bExp.onclick=function(){ downloadFile('party_slots.json', JSON.stringify(getPartySlots(),null,2)); };
  bImp.onclick=function(){
    var fi=document.createElement('input'); fi.type='file'; fi.accept='.json,application/json';
    fi.onchange=function(){
      var f=fi.files[0]; if(!f) return;
      var rd=new FileReader(); rd.onload=function(){
        try{ var obj=JSON.parse(rd.result); if(!obj || typeof obj!=='object'){ alert('不正なJSON'); return; }
          putPartySlots(obj); refreshPartySlotSelect(); alert('読込完了');
        }catch(e){ alert('JSON読込エラー: '+e.message); }
      }; rd.readAsText(f);
    }; fi.click();
  };
  refreshPartySlotSelect();
  try{
    var auto = JSON.parse(localStorage.getItem('pokeapp_party_autosave')||'null');
    if(auto && auto.members) applyPartySnapshot(auto);
  }catch(e){}
}
buildPartyStorageBar();

/* =========================
   計算ログ 保存/読込（TXT対応）
========================== */
function buildLogStorageBar(){
  if(!logBox) return;
  if(byId('logStoreBar')) return;
  var bar=document.createElement('div'); bar.id='logStoreBar'; bar.className='flex'; bar.style.gap='8px'; bar.style.margin='8px 0';
  var bSave=document.createElement('button'); bSave.id='logSave'; bSave.className='btn'; bSave.textContent='計算ログ保存';
  var bLoad=document.createElement('button'); bLoad.id='logLoad'; bLoad.className='btn'; bLoad.textContent='計算ログ読込';
  var bExp=document.createElement('button'); bExp.id='logExport'; bExp.className='btn btn-ghost'; bExp.textContent='TXT書出';
  var bImp=document.createElement('button'); bImp.id='logImport'; bImp.className='btn btn-ghost'; bImp.textContent='TXT読込';
  bar.appendChild(bSave); bar.appendChild(bLoad); bar.appendChild(bExp); bar.appendChild(bImp);
  logBox.parentElement.insertBefore(bar, logBox.nextSibling);

  bSave.onclick=function(){ try{ localStorage.setItem('pokeapp_log', JSON.stringify(LOG)); alert('保存しました'); }catch(e){ alert('保存失敗'); } };
  bLoad.onclick=function(){ try{ var arr=JSON.parse(localStorage.getItem('pokeapp_log')||'[]'); if(Object.prototype.toString.call(arr)==='[object Array]'){ LOG=arr; writeLog(); alert('読込しました'); } else alert('データなし'); }catch(e){ alert('読込失敗'); } };
  bExp.onclick=function(){ downloadFile('battle_calc_log.txt', (LOG||[]).join('\n'), 'text/plain'); };
  bImp.onclick=function(){
    var fi=document.createElement('input'); fi.type='file'; fi.accept='.txt,text/plain';
    fi.onchange=function(){ var f=fi.files[0]; if(!f) return; var rd=new FileReader(); rd.onload=function(){ LOG=(String(rd.result)).split(/\r?\n/).filter(function(x){return x.trim().length;}); writeLog(); alert('TXT読込完了'); }; rd.readAsText(f); };
    fi.click();
  };
  try{ var arr=JSON.parse(localStorage.getItem('pokeapp_log')||'[]'); if(Object.prototype.toString.call(arr)==='[object Array]' && arr.length){ LOG=arr; writeLog(); } }catch(e){}
}
buildLogStorageBar();

/* =========================
   対戦ログ（保存/読込/編集）
========================== */
var BATTLE_KEY='pokeapp_battles';
function loadBattles(){ try{ return JSON.parse(localStorage.getItem(BATTLE_KEY)||'[]'); }catch(e){ return []; } }
function saveBattles(arr){ try{ localStorage.setItem(BATTLE_KEY, JSON.stringify(arr)); }catch(e){} }
function nowIso(){ return new Date().toISOString(); }
function ymdhm(d){ d=d||new Date(); function pad(n){ return String(n).padStart(2,'0'); } return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())+' '+pad(d.getHours())+':'+pad(d.getMinutes()); }
function getPartySlotsNames(){ return Object.keys(getPartySlots()).sort(); }
function buildBattleLogUI(){
  var host=sections.memo; if(!host) return;
  if(byId('bl_time')) return; // 重複防止
  var wrap=document.createElement('div'); wrap.className='card';
  wrap.innerHTML = ''+
    '<h3>対戦ログ</h3>'+
    '<div class="grid grid-2">'+
      '<div>'+
        '<div class="row"><label>日時</label><input id="bl_time" class="small"></div>'+
        '<div class="row"><label>相手</label><input id="bl_opponent" class="small" placeholder="相手名/トレーナー名"></div>'+
        '<div class="row"><label>ルール</label><select id="bl_rule" class="small"><option value="シングル">シングル</option><option value="ダブル">ダブル</option><option value="その他">その他</option></select></div>'+
        '<div class="row"><label>シーズン</label><input id="bl_season" class="small" type="number" placeholder="例: 33"></div>'+
        '<div class="row"><label>結果</label><select id="bl_result" class="small"><option value="勝ち">勝ち</option><option value="負け">負け</option><option value="引き分け">引き分け</option></select></div>'+
        '<div class="row"><label>スコア</label><input id="bl_score" class="small" placeholder="例: 3-0"></div>'+
        '<div class="row"><label>ターン数</label><input id="bl_turns" class="small" type="number" placeholder="例: 17"></div>'+
        '<div class="row"><label>レート 前→後</label><div class="flex"><input id="bl_rate_before" type="number" class="small" placeholder="前"><input id="bl_rate_after" type="number" class="small" placeholder="後"></div></div>'+
      '</div>'+
      '<div>'+
        '<div class="row"><label>自分のパーティ（スロット）</label><select id="bl_my_slot" class="small"></select></div>'+
        '<div class="row"><label>相手の6体（改行/カンマ区切り）</label><textarea id="bl_opp_team" rows="4" class="small" placeholder="例：ミライドン, ホウオウ, ディンルー, ..."></textarea></div>'+
        '<div class="row"><label>メモ</label><textarea id="bl_notes" rows="4" class="small" placeholder="試合の要点/反省点など"></textarea></div>'+
      '</div>'+
    '</div>'+
    '<div class="flex" style="gap:8px;margin-top:8px">'+
      '<button id="bl_save"  class="btn">保存</button>'+
      '<button id="bl_clear" class="btn btn-ghost">フォームクリア</button>'+
      '<button id="bl_export" class="btn btn-ghost">全件エクスポート</button>'+
      '<button id="bl_import" class="btn btn-ghost">インポート</button>'+
    '</div>'+
    '<hr>'+
    '<div class="row"><label>フィルタ</label><input id="bl_filter" class="small" placeholder="相手名/結果/シーズン など部分一致"></div>'+
    '<div id="bl_list"></div>';
  host.prepend(wrap);

  setVal('bl_time', ymdhm());
  refreshBLSlot();

  addEvt('bl_save','click', saveBattleFromForm);
  addEvt('bl_clear','click', clearBattleForm);
  addEvt('bl_export','click', function(){ downloadFile('battle_logs.json', JSON.stringify(loadBattles(),null,2)); });
  addEvt('bl_import','click', function(){
    var fi=document.createElement('input'); fi.type='file'; fi.accept='.json,application/json';
    fi.onchange=function(){ var f=fi.files[0]; if(!f) return; var rd=new FileReader(); rd.onload=function(){ try{ var arr=JSON.parse(rd.result); if(Object.prototype.toString.call(arr)!=='[object Array]') return alert('配列JSONが必要です'); saveBattles(arr); renderBattleList(); alert('読込完了'); }catch(e){ alert('JSON読込エラー: '+e.message); } }; rd.readAsText(f); };
    fi.click();
  });
  addEvt('bl_filter','input', renderBattleList);
  renderBattleList();
}
function refreshBLSlot(){
  var sel=byId('bl_my_slot'); if(!sel) return;
  sel.innerHTML='';
  var defOpt=document.createElement('option'); defOpt.value=''; defOpt.textContent='（未指定）'; sel.appendChild(defOpt);
  var names=getPartySlotsNames(); for(var i=0;i<names.length;i++){ var o=document.createElement('option'); o.value=names[i]; o.textContent=names[i]; sel.appendChild(o); }
  var last=localStorage.getItem('pokeapp_party_last'); if(last && names.indexOf(last)>=0) sel.value=last;
}
function readOppTeamTextarea(){
  var raw=(byId('bl_opp_team') && byId('bl_opp_team').value||'').trim();
  if(!raw) return [];
  return raw.split(/\r?\n|,/).map(function(s){ return s.trim(); }).filter(function(s){ return !!s; });
}
function clearBattleForm(){
  setVal('bl_time', ymdhm());
  setVal('bl_opponent',''); setVal('bl_rule','シングル'); setVal('bl_season','');
  setVal('bl_result','勝ち'); setVal('bl_score',''); setVal('bl_turns','');
  setVal('bl_rate_before',''); setVal('bl_rate_after','');
  var sel=byId('bl_my_slot'); refreshBLSlot(); if(sel) sel.value='';
  setVal('bl_opp_team',''); setVal('bl_notes',''); delete window.__BL_EDITING__;
}
function saveBattleFromForm(){
  var id = (window.crypto && window.crypto.randomUUID && window.crypto.randomUUID()) || ('b_'+Date.now());
  if(window.__BL_EDITING__ && window.__BL_EDITING__.id) id = window.__BL_EDITING__.id;
  var entry={
    id:id, ts: nowIso(),
    time: byId('bl_time') && byId('bl_time').value || ymdhm(),
    opponent: byId('bl_opponent') && byId('bl_opponent').value || '',
    rule: byId('bl_rule') && byId('bl_rule').value || '',
    season: Number(byId('bl_season') && byId('bl_season').value || null),
    result: byId('bl_result') && byId('bl_result').value || '',
    score: byId('bl_score') && byId('bl_score').value || '',
    turns: Number(byId('bl_turns') && byId('bl_turns').value || null),
    rate_before: Number(byId('bl_rate_before') && byId('bl_rate_before').value || null),
    rate_after:  Number(byId('bl_rate_after') && byId('bl_rate_after').value || null),
    my_slot: byId('bl_my_slot') && byId('bl_my_slot').value || '',
    opp_team: readOppTeamTextarea(),
    notes: byId('bl_notes') && byId('bl_notes').value || ''
  };
  var arr=loadBattles();
  var idx=-1, i; for(i=0;i<arr.length;i++){ if(arr[i].id===entry.id){ idx=i; break; } }
  if(idx>=0) arr[idx]=entry; else arr.unshift(entry);
  saveBattles(arr); renderBattleList(); alert(idx>=0?'更新しました':'保存しました'); clearBattleForm();
}
function renderBattleList(){
  var box=byId('bl_list'); if(!box) return;
  var q=(byId('bl_filter') && byId('bl_filter').value || '').toLowerCase().trim();
  var arr=loadBattles();
  var src = !q ? arr : arr.filter(function(e){
    var hay = (e.time+' '+e.opponent+' '+e.rule+' S'+(e.season||'')+' '+e.result+' '+e.score+' '+e.my_slot+' '+(e.opp_team||[]).join(' ')).toLowerCase();
    return hay.indexOf(q)>=0;
  });
  box.innerHTML='';
  if(!src.length){ var d=document.createElement('div'); d.className='muted'; d.textContent='対戦ログはありません。'; box.appendChild(d); return; }
  src.forEach(function(e){
    var c=document.createElement('div'); c.className='card small';
    c.innerHTML = ''+
      '<div class="flex" style="gap:6px;align-items:center;flex-wrap:wrap">'+
        '<span class="pill">'+e.time+'</span>'+
        '<span class="pill">'+e.rule+(e.season?(' / S'+e.season):'')+'</span>'+
        '<span class="pill">'+e.result+(e.score?(' ('+e.score+')'):'')+'</span>'+
        (e.my_slot?('<span class="pill">自分:'+e.my_slot+'</span>'):'')+
        (e.opponent?('<strong>'+e.opponent+'</strong>'):'')+
      '</div>'+
      (e.opp_team && e.opp_team.length?('<div class="small muted" style="margin-top:4px">相手: '+e.opp_team.join(', ')+'</div>'):'')+
      (e.notes?('<div class="small" style="margin-top:4px;white-space:pre-wrap">'+e.notes+'</div>'):'')+
      ((isFinite(e.rate_before)||isFinite(e.rate_after))?('<div class="small muted" style="margin-top:4px">Rate: '+(e.rate_before==null?'-':e.rate_before)+' → '+(e.rate_after==null?'-':e.rate_after)+'</div>'):'')+
      '<div class="flex" style="gap:6px;margin-top:6px">'+
        '<button class="btn btn-ghost small" data-act="edit">編集</button>'+
        '<button class="btn btn-ghost small" data-act="del">削除</button>'+
        '<button class="btn btn-ghost small" data-act="copy">コピー</button>'+
      '</div>';
    var btns=c.querySelectorAll('[data-act]');
    for(var i=0;i<btns.length;i++){
      (function(b){
        b.addEventListener('click', function(){
          var act=b.getAttribute('data-act');
          if(act==='edit'){
            window.__BL_EDITING__=e;
            setVal('bl_time', e.time||ymdhm());
            setVal('bl_opponent', e.opponent||''); setVal('bl_rule', e.rule||'シングル'); setVal('bl_season', e.season==null?'':e.season);
            setVal('bl_result', e.result||'勝ち'); setVal('bl_score', e.score||''); setVal('bl_turns', e.turns==null?'':e.turns);
            setVal('bl_rate_before', e.rate_before==null?'':e.rate_before); setVal('bl_rate_after', e.rate_after==null?'':e.rate_after);
            refreshBLSlot(); setVal('bl_my_slot', e.my_slot||'');
            setVal('bl_opp_team', (e.opp_team||[]).join(', ')); setVal('bl_notes', e.notes||'');
            window.scrollTo({top:0, behavior:'smooth'});
          }else if(act==='del'){
            if(!confirm('この対戦ログを削除しますか？')) return;
            var arr=loadBattles().filter(function(x){ return x.id!==e.id; }); saveBattles(arr); renderBattleList();
          }else if(act==='copy'){
            var lines=[
              '日時: '+e.time, '相手: '+(e.opponent||'-'), 'ルール: '+e.rule+(e.season?(' / S'+e.season):''),
              '結果: '+e.result+(e.score?(' ('+e.score+')'):''),
              'ターン: '+(e.turns==null?'-':e.turns),
              'レート: '+(e.rate_before==null?'-':e.rate_before)+' → '+(e.rate_after==null?'-':e.rate_after),
              '自分PT: '+(e.my_slot||'-'),
              '相手PT: '+((e.opp_team||[]).join(', ')||'-'),
              'メモ:\n'+(e.notes||'')
            ].join('\n');
            if(navigator.clipboard && navigator.clipboard.writeText){ navigator.clipboard.writeText(lines).then(function(){ alert('クリップボードにコピーしました'); }); }
            else { alert(lines); }
          }
        }, false);
      })(btns[i]);
    }
    box.appendChild(c);
  });
}
buildBattleLogUI();

/* =========================
   タイマー本体
========================== */
var timer=null, remainMs=0;
function updateTimerBadge(){ var b=byId('badgeTimer'); if(b) b.textContent='タイマー: '+(timer?'動作中':'停止'); }
function fmt(ms){ var s=Math.max(0,Math.floor(ms/1000)); var m=Math.floor(s/60), r=s%60; return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0'); }
/* === タイマー：イベント委譲（要素の有無に関係なく動く） === */
document.addEventListener('click', function(e){
  var t = e.target; if(!t) return;
  var id = t.id || '';

  if(id === 'timerStart'){
    var minEl = byId('timerMin');
    var min = Number(minEl && minEl.value || 15);
    if(!isFinite(min) || min <= 0) min = 1;

    // 残り時間セット
    remainMs = min * 60 * 1000;
    setText('timerState', '動作中');
    updateTimerBadge();

    var rem = byId('timerRemain');
    if(rem) rem.textContent = fmt(remainMs);

    // 既存タイマー停止→開始
    if(timer) clearInterval(timer);
    timer = setInterval(function(){
      remainMs -= 1000;
      var r = byId('timerRemain');
      if(r) r.textContent = fmt(remainMs);
      if(remainMs <= 0){
        clearInterval(timer);
        timer = null;
        setText('timerState','終了');
        updateTimerBadge();
        alert('タイマー終了');
      }
    }, 1000);
  }

  else if(id === 'timerStop'){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
    setText('timerState','停止中');
    updateTimerBadge();
  }

  else if(id === 'timerReset'){
    if(timer){
      clearInterval(timer);
      timer = null;
    }
    var r2 = byId('timerRemain');
    if(r2) r2.textContent = '00:00';
    setText('timerState','停止中');
    updateTimerBadge();
  }
}, false);

var bL=byId('badgeLog'); if(bL) bL.textContent='計算ログ: 0件';

/* =========================
   Service Worker 登録（任意）
========================== */
if('serviceWorker' in navigator){
  window.addEventListener('load', function(){
    navigator.serviceWorker.register('./sw.js', {scope:'./'}).catch(function(e){ console.warn(e); });
  });
}


