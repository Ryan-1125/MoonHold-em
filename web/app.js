const $ = (id) => document.getElementById(id);
const suits = {s:'♠',h:'♥',d:'♦',c:'♣'};
const suitNames = {s:'黑桃',h:'红桃',d:'方块',c:'梅花'};
const groups = {hero:'玩家一',villain:'玩家二',board:'公共牌'};
const presets = {
  turn:{hero:['As','Ad'],villain:['Ks','Kd'],board:['2c','3d','7h','9s',null]},
  flush:{hero:['Ah','Kh'],villain:['Qs','Qd'],board:['2h','7h','Qc',null,null]},
  tie:{hero:['2c','3c'],villain:['4d','5d'],board:['As','Ks','Qs','Js','Ts']}
};
let state, selected={group:'hero',index:0}, revision=0, busy=false;
const empty = $('result-content').innerHTML;
const worker = new Worker('worker.js', {type:'module'});
function cardHTML(card, cls='mini') {
  const rank=card[0]==='T'?'10':card[0];
  return `<span class="${cls}${'hd'.includes(card[1])?' red':''}">${rank}${suits[card[1]]}</span>`;
}
function invalidate(){revision++;busy=false;$('result-content').innerHTML=empty;$('result-status').textContent='牌面已更新';$('message').textContent='';}
function render(){
  for (const [group,label] of Object.entries(groups)) {
    const container=$(group+'-slots');container.replaceChildren();
    state[group].forEach((card,index)=>{
      const button=document.createElement('button');
      button.className='card-slot'+(card?' filled':'')+(card&&'hd'.includes(card[1])?' red':'')+(selected.group===group&&selected.index===index?' active':'');
      button.setAttribute('aria-label',`${label}第${index+1}张：${card?suitNames[card[1]]+card[0]:'未选择'}`);
      button.setAttribute('aria-pressed',String(selected.group===group&&selected.index===index));
      button.innerHTML=card?`<span class="rank">${card[0]==='T'?'10':card[0]}</span><span class="suit">${suits[card[1]]}</span>`:'+';
      button.onclick=()=>{selected={group,index};render();};container.append(button);
    });
  }
  const used=new Set(Object.values(state).flat().filter(Boolean));
  const deck=$('deck');deck.replaceChildren();
  for(const suit of ['s','h','d','c']) for(const rank of ['A','K','Q','J','T','9','8','7','6','5','4','3','2']){
    const card=rank+suit, b=document.createElement('button');b.className='deck-card'+('hd'.includes(suit)?' red':'');
    b.innerHTML=`${rank==='T'?'10':rank}<span>${suits[suit]}</span>`;b.disabled=used.has(card);b.setAttribute('aria-label',suitNames[suit]+(rank==='T'?'10':rank));
    b.onclick=()=>{state[selected.group][selected.index]=card;invalidate();const next=state[selected.group].findIndex(c=>!c);if(next>=0)selected.index=next;render();};deck.append(b);
  }
  const count=state.board.filter(Boolean).length;
  $('stage').textContent=(count===3?'翻牌':count===4?'转牌':count===5?'河牌':'选择公共牌')+` · ${count} / 5`;
  $('selection-label').textContent=`正在选择：${groups[selected.group]} · 第 ${selected.index+1} 张`;
  const ready=state.hero.every(Boolean)&&state.villain.every(Boolean)&&count>=3;
  $('calculate').disabled=!ready||busy;
  $('calculate').innerHTML=busy?'正在精确计算…':'计算牌力与概率 <span>↗</span>';
  $('ready-note').textContent=ready?`将枚举 ${count===3?'990':count===4?'44':'1'} 种结局`:'请选齐双方底牌和至少 3 张公共牌';
  $('remove').disabled=!state[selected.group][selected.index];
}
function calculate(){if($('calculate').disabled)return;busy=true;render();$('message').textContent='正在枚举剩余公共牌…';worker.postMessage({id:revision,hero:state.hero.join(' '),villain:state.villain.join(' '),board:state.board.filter(Boolean).join(' ')});}
function load(name){state=structuredClone(presets[name]);selected={group:'hero',index:0};invalidate();render();calculate();}
function rankName(r){return ({14:'A',13:'K',12:'Q',11:'J'})[r]||String(r);}
worker.onmessage=({data})=>{
  if(data.id!==revision)return;busy=false;render();
  if(data.error){$('message').textContent=data.error;$('result-status').textContent='计算失败';return;}
  const r=data.result;
  if(r.error){$('message').textContent=r.error;return;}
  $('message').textContent='计算完成。所有可能结局均已枚举。';$('result-status').textContent='精确结果';
  const finished=state.board.filter(Boolean).length===5;
  const title=r.comparison===0?(finished?'双方平局':'当前牌力相同'):`玩家${r.comparison>0?'一':'二'}${finished?'获胜':'当前领先'}`;
  const hand=(name,h)=>`<div class="hand-result"><div class="hand-title"><span>${name} · 当前最佳五张</span><strong>${h.category}</strong></div><div class="mini-cards">${h.best.map(c=>cardHTML(c)).join('')}</div><p class="rank-note">比较点数：${h.ranks.map(rankName).join(' → ')}（从左到右依次比较）</p></div>`;
  const pct=n=>(n/r.total*100).toFixed(2);
  $('result-content').innerHTML=`<h3 class="result-title">${title}</h3><p class="subtext">${finished?'公共牌已全部发出，以下为最终摊牌结果。':'当前领先不代表最终获胜，请结合下方概率判断。'}</p>${hand('玩家一',r.hero)}${hand('玩家二',r.villain)}<div class="prob-head"><span>玩家一 · 最终结果概率</span><small>${r.total.toLocaleString()} 种结局</small></div><div class="bar" aria-hidden="true"><div class="segment win" style="width:${pct(r.wins)}%"></div><div class="segment tie" style="width:${pct(r.ties)}%"></div><div class="segment loss" style="width:${pct(r.losses)}%"></div></div><div class="legend"><div>获胜<strong>${pct(r.wins)}%</strong><small>${r.wins} 种</small></div><div>平局<strong>${pct(r.ties)}%</strong><small>${r.ties} 种</small></div><div>落败<strong>${pct(r.losses)}%</strong><small>${r.losses} 种</small></div></div><div class="equity"><span>玩家一 · 平分后权益</span><strong>${(r.equity*100).toFixed(2)}%</strong></div>`;
};
worker.onerror=()=>{busy=false;render();$('message').textContent='计算模块加载失败，请重新运行 node scripts/serve-web.mjs 并刷新页面。';};
$('calculate').onclick=calculate;
$('remove').onclick=()=>{state[selected.group][selected.index]=null;invalidate();render();};
$('reset').onclick=()=>{state={hero:[null,null],villain:[null,null],board:[null,null,null,null,null]};selected={group:'hero',index:0};invalidate();render();};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>load(b.dataset.preset);
load('turn');
