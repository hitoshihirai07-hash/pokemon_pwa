
(function(){
'use strict';

// ---- helpers ----
function $(id){ return document.getElementById(id); }
function esc(s){
  s = String(s==null ? '' : s);
  return s.replace(/[&<>\"']/g, function(m){
    switch(m){ case '&': return '&amp;'; case '<': return '&lt;'; case '>': return '&gt;'; case '"': return '&quot;'; default: return '&#39;'; }
  });
}

// ---- tabs ----
(function(){
  var tabs = document.querySelectorAll('.tabs button');
  tabs.forEach(function(btn){
    btn.addEventListener('click', function(){
      tabs.forEach(function(b){ b.classList.remove('active'); });
      document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
      btn.classList.add('active');
      var id = btn.getAttribute('data-tab');
      var pane = document.getElementById(id);
      if (pane) pane.classList.add('active');
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
})();

// ---- timer ----
(function(){
  var view=$('timerView'), start=$('timerStart'), pause=$('timerPause'), reset=$('timerReset'), minI=$('timerMin');
  var remain=0, running=false;
  function fmt(s){ var m=Math.floor(s/60), r=s%60; return String(m).padStart(2,'0')+':'+String(r).padStart(2,'0'); }
  function tick(){ if(!running) return; if(remain<=0){ running=false; view.textContent='00:00'; return; } remain--; view.textContent=fmt(remain); setTimeout(tick,1000); }
  start.addEventListener('click', function(){ var m=Math.max(1,Math.min(180,+minI.value||10)); remain=m*60; running=true; view.textContent=fmt(remain); tick(); });
  pause.addEventListener('click', function(){ running=false; });
  reset.addEventListener('click', function(){ running=false; view.textContent='00:00'; });
})();

// ---- data loading ----
var DEX=null, MOVES=null;
function loadDex(cb){
  if (DEX) return cb();
  fetch('./pokemon_master.json', {cache:'no-store'}).then(function(r){ return r.ok?r.json():[]; })
  .then(function(j){ DEX=j||[]; cb(); }).catch(function(){ DEX=[]; cb(); });
}
function loadMoves(cb){
  if (MOVES) return cb();
  fetch('./moves.csv', {cache:'no-store'}).then(function(r){ return r.text(); })
  .then(function(t){ MOVES=parseCSV(t); cb(); }).catch(function(){ MOVES=[]; cb(); });
}
// csv parse (very tolerant)
function parseCSV(text){
  var lines = text.split(/\r?\n/).filter(function(x){ return x.trim().length>0; });
  if (!lines.length) return [];
  var head = splitCSVLine(lines[0]);
  var out = [];
  for (var i=1;i<lines.length;i++){
    var cols = splitCSVLine(lines[i]);
    var row = {};
    for (var j=0;j<head.length && j<cols.length;j++){
      row[head[j].trim()] = cols[j].trim();
    }
    out.push(row);
  }
  return out;
}
function splitCSVLine(line){
  var res=[], cur='', q=false;
  for (var i=0;i<line.length;i++){
    var c=line[i];
    if (c=='"'){ if (q && line[i+1]=='"'){ cur+='"'; i++; } else { q=!q; } }
    else if (c==',' && !q){ res.push(cur); cur=''; }
    else cur+=c;
  }
  res.push(cur);
  return res;
}
function guessKey(cands){
  if (!MOVES || !MOVES.length) return cands[0];
  var row = MOVES[0];
  for (var i=0;i<cands.length;i++){ if (row.hasOwnProperty(cands[i])) return cands[i]; }
  return Object.keys(row)[0] || cands[0];
}

// ---- datalists ----
(function(){
  loadDex(function(){
    var dl = $('dexNames'); if (!dl) return;
    dl.innerHTML = (DEX||[]).map(function(p){ return '<option value="'+esc(p.名前)+'">'; }).join('');
  });
  loadMoves(function(){
    var dl = $('moveNames'); if (!dl) return;
    var nameKey = guessKey(['技','name','ワザ','move','技名']);
    dl.innerHTML = (MOVES||[]).map(function(m){ var v=m[nameKey]||''; return v? '<option value="'+esc(v)+'">' : ''; }).join('');
  });
})();

// ---- common calc ----
var RANK = {"-6":0.25,"-5":2/7,"-4":2/6,"-3":2/5,"-2":0.5,"-1":2/3,"0":1,"1":1.5,"2":2,"3":2.5,"4":3,"5":3.5,"6":4};
function nonHP(base,iv,ev,mul){ base=+base||0; iv=+iv||0; ev=+ev||0; mul=+mul||1; var tmp=Math.floor(((2*base + iv + Math.floor(ev/4))*50)/100)+5; return Math.floor(tmp*mul); }
function HP(base,iv,ev){ base=+base||0; iv=+iv||0; ev=+ev||0; return Math.floor(((2*base + iv + Math.floor(ev/4))*50)/100)+60; }
function dmgRange(params){
  var level=50, power=params.power, atk=params.atk, df=params.df;
  var base = Math.floor((level*2)/5)+2;
  var core = Math.floor(Math.floor(base * power * params.rAtk * atk / (params.rDef * df))/50)+2;

  // weather
  var wmul = 1.0;
  if (params.weather==='sun'){ if (params.moveType==='ほのお') wmul=1.5; if (params.moveType==='みず') wmul=0.5; }
  else if (params.weather==='rain'){ if (params.moveType==='みず') wmul=1.5; if (params.moveType==='ほのお') wmul=0.5; }
  else if (params.weather==='sand'){ if (params.cat==='special' && (params.defTypes||[]).indexOf('いわ')>=0) { df = Math.floor(df*1.5); } }
  else if (params.weather==='snow'){ if (params.cat==='physical' && (params.defTypes||[]).indexOf('こおり')>=0) { df = Math.floor(df*1.5); } }

  var critMul = params.crit ? 1.5 : 1.0;

  var itemMul = 1.0;
  if (params.item==='atk1.5' && params.cat==='physical') itemMul=1.5;
  if (params.item==='spa1.5' && params.cat==='special') itemMul=1.5;
  if (params.item==='lo1.3') itemMul*=1.3;

  var mult = params.stab * params.typeMul * wmul * params.extra * critMul * itemMul;
  var mn = Math.floor(core * mult * 0.85);
  var mx = Math.floor(core * mult * 1.00);
  return [mn,mx];
}

// ---- rank selects init ----
(function(){
  var a=$('atk_stage'), d=$('def_stage'); if(!a||!d) return;
  for (var i=-6;i<=6;i++){
    var o=document.createElement('option'); o.value=String(i); o.textContent=(i>0? ('+'+i) : String(i)); if (i===0) o.selected=true; a.appendChild(o);
    var p=document.createElement('option'); p.value=String(i); p.textContent=(i>0? ('+'+i) : String(i)); if (i===0) p.selected=true; d.appendChild(p);
  }
})();

// ---- 1v1 ----
(function(){
  var atk={}, def={};
  ['HP','攻撃','防御','特攻','特防','素早'].forEach(function(k){
    atk['base_'+k]=$('atk_base_'+k); atk['iv_'+k]=$('atk_iv_'+k); atk['ev_'+k]=$('atk_ev_'+k); atk['mul_'+k]=$('atk_mul_'+k); atk['fin_'+k]=$('atk_fin_'+k);
    def['base_'+k]=$('def_base_'+k); def['iv_'+k]=$('def_iv_'+k); def['ev_'+k]=$('def_ev_'+k); def['mul_'+k]=$('def_mul_'+k); def['fin_'+k]=$('def_fin_'+k);
  });
  var atkName=$('atk_name'), defName=$('def_name');
  function findMon(n){ if(!n) return null; n=String(n).trim(); for (var i=0;i<(DEX||[]).length;i++){ var p=DEX[i]; if(p && (p.名前===n || String(p.No)===n)) return p; } return null; }
  function fillBase(side, mon){
    ['HP','攻撃','防御','特攻','特防','素早'].forEach(function(k){
      var b = mon ? (+mon[k]||50) : 50; side['base_'+k].textContent=b;
    });
  }
  function recalc(side){
    side['fin_HP'].textContent = HP(+side['base_HP'].textContent, +side['iv_HP'].value, +side['ev_HP'].value);
    ['攻撃','防御','特攻','特防','素早'].forEach(function(k){
      var mul = side['mul_'+k] ? +side['mul_'+k].value : 1.0;
      side['fin_'+k].textContent = nonHP(+side['base_'+k].textContent, +side['iv_'+k].value, +side['ev_'+k].value, mul);
    });
  }
  function onAtkName(){ loadDex(function(){ var m=findMon(atkName.value); fillBase(atk,m); recalc(atk); }); }
  function onDefName(){ loadDex(function(){ var m=findMon(defName.value); fillBase(def,m); recalc(def); }); }
  if (atkName) ['input','change'].forEach(function(ev){ atkName.addEventListener(ev, onAtkName); });
  if (defName) ['input','change'].forEach(function(ev){ defName.addEventListener(ev, onDefName); });
  loadDex(function(){ onAtkName(); onDefName(); });

  // move auto
  var moveName=$('move_name'), movePower=$('move_power'), moveType=$('move_type'), moveCat=$('move_cat'), moveHits=$('move_hits'), crit=$('crit'), critBadge=$('crit_force'), hint=$('move_hint');
  function normalize(v){
    if(!v) return '';
    v=String(v).trim();
    var map={'物理':'physical','Physical':'physical','physical':'physical','特殊':'special','Special':'special','special':'special','auto':'auto','Auto':'auto','自動':'auto'};
    return map[v] || v;
  }
  function parseBool(v){ v=String(v||'').trim().toLowerCase(); return ['true','1','はい','y','yes','必ず','必ず急所'].indexOf(v)>=0; }
  function onMoveSel(){
    loadMoves(function(){
      if (!MOVES || !MOVES.length) return;
      var keyName=guessKey(['技','name','ワザ','move','技名']);
      var keyPow =guessKey(['威力','power']);
      var keyType=guessKey(['タイプ','type']);
      var keyCat =guessKey(['分類','category','class']);
      var keyHit =guessKey(['連続','hits']);
      var keyCrit=guessKey(['必ず急所','crit','always_crit']);
      var keyTera=guessKey(['テラ','tera']);

      var q=String(moveName.value||'').trim();
      var row=null;
      for (var i=0;i<MOVES.length;i++){ if ((MOVES[i][keyName]||'')===q){ row=MOVES[i]; break; } }
      if (!row){ hint.textContent=''; return; }

      if (row[keyPow]) movePower.value = (+row[keyPow]||+movePower.value||80);
      if (row[keyType]) moveType.value = row[keyType];

      var cat = normalize(row[keyCat]);
      if (/テラバースト/.test(q) && String(row[keyTera]||'').toLowerCase().indexOf('auto')>=0){ cat='auto'; }
      if (cat==='physical' || cat==='special' || cat==='auto'){ moveCat.value = cat; }

      if (row[keyHit]){
        var h = String(row[keyHit]).strip() if False else String(row[keyHit])
      }
    });
  }
  if (moveName) ['change','input'].forEach(function(ev){ moveName.addEventListener(ev, onMoveSel); });

  // compute
  var btn=$('btn_calc'), result=$('result'), hpbar=$('hpbar_inner'), logs=$('atk_logs');
  var srBtn=$('sr_apply');
  function currentCat(){
    var c = $('move_cat').value;
    if (c==='auto'){
      var a= +$('atk_fin_攻撃').textContent || 0;
      var s= +$('atk_fin_特攻').textContent || 0;
      return (a>=s)? 'physical' : 'special';
    }
    return c;
  }
  function compute(){
    var cat = currentCat();
    var atkStat = (cat==='physical') ? (+$('atk_fin_攻撃').textContent||0) : (+$('atk_fin_特攻').textContent||0);
    var defStat = (cat==='physical') ? (+$('def_fin_防御').textContent||0) : (+$('def_fin_特防').textContent||0);
    var params={
      power:+$('move_power').value||1,
      atk:atkStat||1,
      df:defStat||1,
      cat:cat,
      rAtk:RANK[$('atk_stage').value]||1,
      rDef:RANK[$('def_stage').value]||1,
      moveType:$('move_type').value||'',
      defTypes: [ $('def_t1').value||'', $('def_t2').value||'' ].filter(function(x){ return !!x; }),
      weather:$('weather').value,
      stab:+$('stab').value||1,
      typeMul:+$('type_mul').value||1,
      extra:+$('extra_mul').value||1,
      crit:$('crit').checked,
      item:$('item_mul').value
    };
    var dm = dmgRange(params);
    var mn=dm[0], mx=dm[1];
    var hits = Math.min(10, Math.max(1, +$('move_hits').value||1));
    var totalMin = mn*hits, totalMax=mx*hits;
    var defHP = +$('def_fin_HP').textContent || 1;
    var remainMin = Math.max(0, defHP - totalMax);
    var remainMax = Math.max(0, defHP - totalMin);
    var label='';
    if (totalMin>=defHP) label='確定1発';
    else if (totalMax>=defHP) label='乱数1発（高乱数）';
    else {
      var minHits = Math.ceil(defHP / Math.max(1,mn));
      var maxHits = Math.ceil(defHP / Math.max(1,mx));
      label = (minHits===maxHits)? ('確定'+minHits+'発') : ('乱数'+minHits+'～'+maxHits+'発');
    }
    result.innerHTML = '<div>1発: <b>'+mn+'</b>～<b>'+mx+'</b>（'+hits+'回合計: <b>'+totalMin+'</b>～<b>'+totalMax+'</b>）</div>'
      + '<div>残りHP: '+remainMin+'～'+remainMax+' / '+defHP+'（'+(remainMin/defHP*100).toFixed(1)+'%～'+(remainMax/defHP*100).toFixed(1)+'%）</div>'
      + '<div>'+label+'</div>';
    hpbar.style.width = Math.max(0, 100 - (remainMax/defHP*100)) + '%';

    var line = [
      ( $('atk_name').value||'攻撃側')+'→'+( $('def_name').value||'防御側'),
      '技:'+( $('move_name').value||'-')+' 威力:'+params.power+' '+(cat==='physical'?'物':'特'),
      'STAB:'+params.stab+' 相性:'+params.typeMul+' 天候:'+params.weather+' 急所:'+($('crit').checked?'あり':'なし'),
      'ランク:攻'+$('atk_stage').value+' 防'+$('def_stage').value,
      '結果:1発'+mn+'-'+mx+' / '+hits+'回'+totalMin+'-'+totalMax+' | '+label
    ].join(' | ');
    logs.value = (logs.value? (logs.value+'\n') : '') + line;
    localStorage.setItem('calc_logs', logs.value);
  }
  if (btn) btn.addEventListener('click', compute);
  if (srBtn) srBtn.addEventListener('click', function(){
    var defHP = +$('def_fin_HP').textContent || 1;
    var mul = +$('sr_vs_rock').value||1;
    var dmg = Math.floor(defHP * 0.125 * mul);
    var remain = Math.max(0, defHP - dmg);
    $('sr_info').textContent = 'SRダメージ:'+dmg+' → 残りHP:'+remain;
  });
  var saved = localStorage.getItem('calc_logs'); if (saved) $('atk_logs').value = saved;
  var mvClear=$('move_clear'); if (mvClear) mvClear.addEventListener('click', function(){ $('move_name').value=''; $('move_power').value=80; $('move_type').value=''; $('move_cat').value='physical'; $('move_hits').value=1; $('crit').checked=false; $('crit_force').style.display='none'; $('move_hint').textContent=''; });
})();

// ---- 1v3 : self compact + sync ----
(function(){
  var mount = $('v13-self-mount'); if(!mount) return;
  mount.innerHTML =
  '<div id="v13-self">'
    +'<div class="left">'
      +'<div class="head"><div>自分ポケ</div><input id="v13_self_name" list="dexNames" placeholder="例：ドラパルト"></div>'
      +'<div class="row"><div class="label">攻</div><input id="v13_ev_atk" type="number" min="0" max="252" step="4" placeholder="EV"><input id="v13_iv_atk" type="number" min="0" max="31" value="31" placeholder="IV"><select id="v13_mul_atk"><option value="0.9">0.9</option><option value="1.0" selected>1.0</option><option value="1.1">1.1</option></select></div>'
      +'<div class="row"><div class="label">特</div><input id="v13_ev_spa" type="number" min="0" max="252" step="4" placeholder="EV"><input id="v13_iv_spa" type="number" min="0" max="31" value="31" placeholder="IV"><select id="v13_mul_spa"><option value="0.9">0.9</option><option value="1.0" selected>1.0</option><option value="1.1">1.1</option></select></div>'
    +'</div>'
    +'<div class="right">'
      +'<div class="line"><span>攻実数値</span><b id="v13_out_atk">-</b></div>'
      +'<div class="line"><span>特実数値</span><b id="v13_out_spa">-</b></div>'
      +'<div class="grid2" style="margin-top:4px">'
        +'<label>分類<select id="v13_cat"><option value="physical" selected>物理</option><option value="special">特殊</option></select></label>'
        +'<label>威力<input id="v13_power" type="number" min="1" max="500" value="80"></label>'
      +'</div>'
      +'<div class="controls">'
        +'<label>STAB<select id="v13_stab"><option>1.0</option><option>1.5</option><option>2.0</option></select></label>'
        +'<label>天候<select id="v13_weather"><option value="none" selected>なし</option><option value="sun">晴れ</option><option value="rain">雨</option><option value="sand">砂嵐</option><option value="snow">雪</option></select></label>'
        +'<label>追加補正<input id="v13_extra" type="number" step="0.05" value="1.0" style="width:90px"></label>'
      +'</div>'
    +'</div>'
  +'</div>'
  +'<input id="v13_atk_atk" type="number" hidden><input id="v13_atk_spa" type="number" hidden>';

  var name=$('v13_self_name'), evA=$('v13_ev_atk'), ivA=$('v13_iv_atk'), muA=$('v13_mul_atk'), evS=$('v13_ev_spa'), ivS=$('v13_iv_spa'), muS=$('v13_mul_spa'), outA=$('v13_out_atk'), outS=$('v13_out_spa'), hidA=$('v13_atk_atk'), hidS=$('v13_atk_spa');
  var baseAtk=100, baseSpa=100;
  function findMon(n){ if(!n) return null; n=String(n).trim(); for (var i=0;i<(DEX||[]).length;i++){ var p=DEX[i]; if(p && (p.名前===n || String(p.No)===n)) return p; } return null; }
  function recalc(){ var a=nonHP(baseAtk,+ivA.value,+evA.value,+muA.value); var s=nonHP(baseSpa,+ivS.value,+evS.value,+muS.value); outA.textContent=isFinite(a)?a:'-'; outS.textContent=isFinite(s)?s:'-'; hidA.value=isFinite(a)?a:0; hidS.value=isFinite(s)?s:0; }
  function onName(){ loadDex(function(){ var m=findMon(name.value); baseAtk=m?(+m.攻撃||100):100; baseSpa=m?(+m.特攻||100):100; recalc(); }); }
  ['input','change'].forEach(function(ev){ name.addEventListener(ev,onName); [evA,ivA,muA,evS,ivS,muS].forEach(function(x){ x.addEventListener(ev,recalc); }); });
  onName();
})();

// ---- party ----
(function(){
  var grid=$('partyGrid'); if(!grid) return;
  function cell(i){
    return '<div class="card-sub">'
      +'<h3>#'+(i+1)+'</h3>'
      +'<div class="grid three"><label>名前<input id="pt'+i+'_name" list="dexNames"></label><label>持ち物<input id="pt'+i+'_item"></label><label>性格<select id="pt'+i+'_nat"><option>補正なし</option><option>いじっぱり</option><option>ひかえめ</option><option>ようき</option><option>ずぶとい</option><option>おだやか</option></select></label></div>'
      +'<div class="grid three"><label>技1<input id="pt'+i+'_m1"></label><label>技2<input id="pt'+i+'_m2"></label><label>技3<input id="pt'+i+'_m3"></label></div>'
      +'<div class="grid two"><label>技4<input id="pt'+i+'_m4"></label><label>備考<input id="pt'+i+'_note"></label></div>'
      +'<div class="grid three"><label>攻EV<input id="pt'+i+'_ev_atk" type="number" min="0" max="252" step="4"></label><label>防EV<input id="pt'+i+'_ev_def" type="number" min="0" max="252" step="4"></label><label>HP EV<input id="pt'+i+'_ev_hp" type="number" min="0" max="252" step="4"></label></div>'
      +'</div>';
  }
  grid.innerHTML = new Array(6).fill(0).map(function(_,i){ return cell(i); }).join('');
  function save(){
    var name = $('partyName').value||('PT_'+Date.now());
    var pt=[];
    for (var i=0;i<6;i++){
      pt.push({
        name:$('pt'+i+'_name').value||'',
        item:$('pt'+i+'_item').value||'',
        nat:$('pt'+i+'_nat').value||'',
        m:[1,2,3,4].map(function(n){ return $('pt'+i+'_m'+n).value||''; }),
        note:$('pt'+i+'_note').value||'',
        ev:{atk:+($('pt'+i+'_ev_atk').value||0),def:+($('pt'+i+'_ev_def').value||0),hp:+($('pt'+i+'_ev_hp').value||0)}
      });
    }
    var data={name:name,team:pt};
    var all = JSON.parse(localStorage.getItem('parties')||'[]');
    all = all.filter(function(x){ return x.name!==name; }); all.push(data);
    localStorage.setItem('parties', JSON.stringify(all));
    alert('保存しました');
  }
  function load(){
    var all = JSON.parse(localStorage.getItem('parties')||'[]');
    if (!all.length){ alert('保存がありません'); return; }
    var name = prompt('読み込む保存名を入力', all[all.length-1].name);
    var it = null;
    for (var i=0;i<all.length;i++){ if (all[i].name===name){ it=all[i]; break; } }
    if (!it) it = all[all.length-1];
    $('partyName').value = it.name;
    for (var i=0;i<6;i++){
      var p=it.team[i]; if(!p) continue;
      $('pt'+i+'_name').value = p.name||'';
      $('pt'+i+'_item').value = p.item||'';
      $('pt'+i+'_nat').value = p.nat||'補正なし';
      for (var n=1;n<=4;n++){ $('pt'+i+'_m'+n).value = (p.m && p.m[n-1]) || ''; }
      $('pt'+i+'_note').value = p.note||'';
      if (p.ev){ $('pt'+i+'_ev_atk').value=p.ev.atk||0; $('pt'+i+'_ev_def').value=p.ev.def||0; $('pt'+i+'_ev_hp').value=p.ev.hp||0; }
    }
  }
  function clearAll(){ grid.querySelectorAll('input,select').forEach(function(e){ if(e.id!=='partyName') e.value=''; }); }
  $('partySave').addEventListener('click', save);
  $('partyLoad').addEventListener('click', load);
  $('partyClear').addEventListener('click', clearAll);
})();

// ---- builds ----
(function(){
  var btn=$('builds_load'); if(!btn) return;
  var fileI=$('builds_file'), list=$('builds_list');
  btn.addEventListener('click', function(){
    var fname=(fileI.value||'').trim(); if(!fname){ alert('JSONファイル名を入力'); return; }
    fetch('./'+fname, {cache:'no-store'}).then(function(r){ return r.json(); }).then(function(j){
      var teams=j.teams||[];
      if (!teams.length){ list.innerHTML='<div class="small">0件</div>'; return; }
      var html='';
      for (var i=0;i<teams.length && i<100;i++){
        var t=teams[i], mons=t.team||[];
        html += '<div class="card-sub"><div><b>#'+esc(t.rank)+'</b> Rating:'+esc(t.rating_value||'')+'</div>'
              + '<div>'+mons.map(function(m){ return esc(m.pokemon + (m.form?('（'+m.form+'）'):'') ); }).join(' / ') +'</div>'
              + '</div>';
      }
      list.innerHTML = html;
    }).catch(function(){ list.innerHTML='<div class="small">読み込みエラー</div>'; });
  });
})();

// ---- diary ----
(function(){
  var save=$('diary_save'), clearBtn=$('diary_clear'), title=$('diary_title'), dateI=$('diary_date'), body=$('diary_body'), list=$('diary_list');
  if (!save) return;
  function render(){
    var all=JSON.parse(localStorage.getItem('diary')||'[]');
    list.innerHTML = all.map(function(d,i){
      return '<div class="card-sub"><div><b>'+esc(d.title||('No.'+i))+'</b> '+esc(d.date||'')+'</div><pre class="small">'+esc(d.body||'')+'</pre></div>';
    }).join('');
  }
  save.addEventListener('click', function(){
    var all=JSON.parse(localStorage.getItem('diary')||'[]');
    all.push({title:title.value||('ログ'+(all.length+1)), date:dateI.value||'', body:body.value||''});
    localStorage.setItem('diary', JSON.stringify(all)); render();
  });
  clearBtn.addEventListener('click', function(){ localStorage.removeItem('diary'); render(); });
  render();
})();

})(); // IIFE
