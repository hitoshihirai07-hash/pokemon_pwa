/* ===== ユーティリティ ===== */
function escapeHtml(s){ const m={'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}; return String(s??'').replace(/[&<>"]/g,ch=>m[ch]); }
function charCount(s,ch){ let c=0; for(let i=0;i<s.length;i++) if(s[i]===ch) c++; return c; }

/* ===== CSV/TSV パーサ ===== */
function parseCSV(text){
  if(!text||!text.trim()) return [];
  text=text.replace(/\uFEFF/g,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
  const sample=text.split('\n').slice(0,5).join('\n');
  let delim=','; const cand=[{c:'\t',s:charCount(sample,'\t')},{c:';',s:charCount(sample,';')},{c:',',s:charCount(sample,',')}].sort((a,b)=>b.s-a.s);
  if(cand[0].s>0) delim=cand[0].c;

  const rows=[]; let cur='',inQ=false,line=[],i=0;
  const pushCell=()=>{line.push(cur);cur='';};
  const pushLine=()=>{rows.push(line);line=[];};
  const s=text+'\n';
  while(i<s.length){
    const ch=s[i];
    if(inQ){
      if(ch==='"'){ if(s[i+1]==='"'){cur+='"';i+=2;continue;} inQ=false;i++;continue; }
      cur+=ch; i++; continue;
    }else{
      if(ch==='"'){ inQ=true; i++; continue; }
      if(ch===delim){ pushCell(); i++; continue; }
      if(ch==='\n'){ pushCell(); pushLine(); i++; continue; }
      cur+=ch; i++;
    }
  }
  if(!rows.length) return [];
  const headers=rows[0].map(h=>h?.trim?.()||'');
  const out=[];
  for(let r=1;r<rows.length;r++){
    const obj={}; headers.forEach((h,i)=>obj[h]=rows[r][i]??'');
    if(Object.values(obj).every(v=>String(v??'').trim()==='')) continue;
    out.push(obj);
  }
  return out;
}

/* ===== PokeDB形式 正規化 =====
  例: {season, rule, teams:[{rank, rating_value, team:[{pokemon, form, terastal, item}×≤6]}×N]}
*/
function normalizeFromPKDB(json){
  if(!json||!Array.isArray(json.teams)) return [];
  const season=json.season??'', rule=json.rule??'';
  const out=[];
  for(const t of json.teams){
    const members=(t.team||[]).slice(0,6).map(m=>({
      name: m.form ? `${m.pokemon}（${m.form}）` : (m.pokemon||''),
      item: m.item||'',
      tera: m.terastal||''
    }));
    if(members.length){
      out.push({ meta:{season,rule,rank:(t.rank??''),rating:(t.rating_value??'')}, members });
    }
  }
  return out;
}

/* ===== 汎用 正規化（CSV/TSV/JSONの“横並び”や“縦持ち”も吸収） ===== */
function normalizeTeams(rows){
  if(!rows||!rows.length) return [];

  // 1) すでに {members:[...]} 構造ならそのまま受理
  const outA=[];
  for(const r of rows){
    if(Array.isArray(r.members)&&r.members.length){
      outA.push({
        meta:{season:r.season||r.シーズン||'', rule:r.rule||r.ルール||'', rank:r.rank||r.順位||r.rating||r.レート||''},
        members:r.members
      });
    }
  }
  if(outA.length) return outA;

  // 2) 横並び: name1/item1/tera1, name2/item2/tera2, ...
  const norm=s=>String(s||'').trim().toLowerCase().replace(/\s+/g,'')
    .replace(/[（）()]/g,'')
    .replace(/ポケモン|pokemon|poke/g,'name')
    .replace(/名前/g,'name')
    .replace(/もちもの|持ち物|item/g,'item')
    .replace(/テラタイプ|テラ|tera/g,'tera');
  const packs=[];
  const tryRow=r=>{
    const keys=Object.keys(r);
    const map={};
    for(const k of keys){
      const nk=norm(k);
      const m=nk.match(/(name|item|tera)(\d{1,2})$/);
      if(!m) continue;
      const kind=m[1]; const idx=parseInt(m[2],10);
      if(idx<1||idx>6) continue;
      (map[idx]||(map[idx]={name:'',item:'',tera:''}))[kind]=(r[k]??'').toString().trim();
    }
    const members=[];
    for(let i=1;i<=6;i++){ if(!map[i]||!map[i].name) continue; members.push(map[i]); }
    if(members.length){
      return {
        meta:{season:r.season||r.シーズン||'', rule:r.rule||r.ルール||'', rank:r.rank||r.順位||r.rating||r.レート||''},
        members
      };
    }
    return null;
  };
  for(const r of rows){ const t=tryRow(r); if(t) packs.push(t); }
  if(packs.length) return packs;

  // 3) 縦持ち（teamId 等でグループ化）
  const guessIdKey=()=>{
    const f={};
    for(const r of rows){
      for(const k of Object.keys(r)){
        const nk=norm(k);
        if(/(team|チーム)id$/.test(nk)||/(グループ|id)$/.test(nk)) f[k]=(f[k]||0)+1;
      }
    }
    const e=Object.entries(f).sort((a,b)=>b[1]-a[1])[0];
    return e?e[0]:null;
  };
  const idKey=guessIdKey();
  if(idKey){
    const groups={};
    for(const r of rows){
      const id=(r[idKey]??'').toString(); if(!id) continue;
      (groups[id]||(groups[id]=[])).push(r);
    }
    const out=[];
    for(const id of Object.keys(groups)){
      const g=groups[id]; const mem=[];
      for(const r of g){
        const keys=Object.keys(r);
        const pick=w=>{
          const pri=w==='name'
            ? [/^(名前|ポケモン|name|pokemon|poke)$/i]
            : w==='item'
              ? [/^(持ち物|item|もちもの)$/i]
              : [/^(テラタイプ|テラ|tera)$/i];
          for(const p of pri){ const hit=keys.find(k=>p.test(k)); if(hit) return (r[hit]??'').toString().trim(); }
          for(const k of keys){
            const nk=norm(k);
            if(w==='name'&&nk==='name') return (r[k]??'').toString().trim();
            if(w==='item'&&nk==='item') return (r[k]??'').toString().trim();
            if(w==='tera'&&nk==='tera') return (r[k]??'').toString().trim();
          }
          return '';
        };
        const name=pick('name'); if(!name) continue;
        mem.push({name, item:pick('item'), tera:pick('tera')});
        if(mem.length>=6) break;
      }
      if(mem.length){ out.push({ meta:{season:'',rule:'',rank:''}, members:mem }); }
    }
    if(out.length) return out;
  }

  return [];
}
