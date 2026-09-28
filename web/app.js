const $ = id => document.getElementById(id);
const suits = {s:'♠',h:'♥',d:'♦',c:'♣'};
const suitNames = {s:'黑桃',h:'红桃',d:'方块',c:'梅花'};
const presets = {
  turn:{hands:[['As','Ad'],['Ks','Kd']],board:['2c','3d','7h','9s',null]},
  flush:{hands:[['Ah','Kh'],['Qs','Qd']],board:['2h','7h','Qc',null,null]},
  tie:{hands:[['2c','3c'],['4d','5d']],board:['As','Ks','Qs','Js','Ts']},
  four:{hands:[['As','Ad'],['Ks','Kd'],['Qs','Qd'],['Js','Jd']],board:['2c','3d','7h','9s',null]}
};
let state, selected=null, revision=0, busy=false, result=null, detailSeat=0;
const empty=$('result-content').innerHTML;
const worker=new Worker('worker.js',{type:'module'});
const seatLabel=i=>`玩家 ${i+1}`;
const selectedCards=()=>selected ? (selected.seat===-1?state.board:state.hands[selected.seat]) : null;
function cardHTML(card,cls='mini') {
  return `<span class="${cls}${'hd'.includes(card[1])?' red':''}">${card[0]==='T'?'10':card[0]}${suits[card[1]]}</span>`;
}
function invalidate(){revision++;busy=false;result=null;$('result-content').innerHTML=empty;$('result-status').textContent='牌面已更新';$('message').textContent='';}
function slot(card,seat,index){
  const b=document.createElement('button');
  b.className='card-slot'+(card?' filled':'')+(card&&'hd'.includes(card[1])?' red':'')+(selected?.seat===seat&&selected?.index===index?' active':'');
  const label=seat===-1?'公共牌':seatLabel(seat);
  b.setAttribute('aria-label',`${label}第${index+1}张：${card?suitNames[card[1]]+card[0]:'未选择'}`);
  b.setAttribute('aria-pressed',String(selected?.seat===seat&&selected?.index===index));
  b.innerHTML=card?`<span class="rank">${card[0]==='T'?'10':card[0]}</span><span class="suit">${suits[card[1]]}</span>`:'+';
  b.onclick=()=>{selected={seat,index};render();};return b;
}
function removeSeat(index){
  if(state.hands.length<=2)return;
  state.hands.splice(index,1);
  if(selected?.seat===index)selected=null;
  else if(selected && selected.seat>index)selected.seat--;
  detailSeat=0;invalidate();render();
}
function render(){
  const table=$('players');table.replaceChildren();
  state.hands.forEach((cards,seat)=>{
    const panel=document.createElement('div');panel.className='seat'+(result?.leaders.includes(seat)?' leading':'');
    const header=document.createElement('div');header.className='seat-header';
    const heading=document.createElement('h3');heading.textContent=seatLabel(seat);header.append(heading);
    const remove=document.createElement('button');remove.className='remove-seat';remove.textContent='×';remove.title=`移除${seatLabel(seat)}`;remove.setAttribute('aria-label',remove.title);remove.disabled=state.hands.length<=2;remove.onclick=()=>removeSeat(seat);header.append(remove);
    panel.append(header);const slots=document.createElement('div');slots.className='slots';cards.forEach((card,index)=>slots.append(slot(card,seat,index)));panel.append(slots);
    const badge=document.createElement('p');badge.className='seat-state';badge.textContent=result?.leaders.includes(seat)?(state.board.filter(Boolean).length===5?'本局获胜':'当前领先'):'两张底牌';panel.append(badge);table.append(panel);
  });
  $('board-slots').replaceChildren(...state.board.map((card,index)=>slot(card,-1,index)));
  $('seat-count').textContent=`${state.hands.length} 人牌桌`;
  $('add-seat').disabled=state.hands.length>=9;
  const used=new Set([...state.hands.flat(),...state.board].filter(Boolean));
  const deck=$('deck');deck.replaceChildren();
  for(const suit of ['s','h','d','c'])for(const rank of ['2','3','4','5','6','7','8','9','T','J','Q','K','A']){
    const card=rank+suit,b=document.createElement('button');b.className='deck-card'+('hd'.includes(suit)?' red':'');b.innerHTML=`${rank==='T'?'10':rank}<span>${suits[suit]}</span>`;b.disabled=!selected||used.has(card);b.classList.toggle('used-card',used.has(card));b.setAttribute('aria-label',suitNames[suit]+(rank==='T'?'10':rank));
    b.onclick=()=>{const target=selectedCards();if(!target||!selected||used.has(card))return;target[selected.index]=card;invalidate();const next=target.findIndex(c=>!c);selected=next>=0?{seat:selected.seat,index:next}:null;render();};deck.append(b);
  }
  const count=state.board.filter(Boolean).length;
  $('stage').textContent=(count===3?'翻牌':count===4?'转牌':count===5?'河牌':'选择公共牌')+` · ${count} / 5`;
  $('selection-label').textContent=selected?`正在选择：${selected.seat===-1?'公共牌':seatLabel(selected.seat)} · 第 ${selected.index+1} 张`:'请先点击要选牌或替换的牌位';
  const ready=state.hands.every(h=>h.every(Boolean))&&count>=3;
  const remaining=52-2*state.hands.length-count;
  const outcomes=count===3?remaining*(remaining-1)/2:count===4?remaining:1;
  $('calculate').disabled=!ready||busy;
  $('calculate').innerHTML=busy?'正在精确计算…':'计算牌力与概率 <span aria-hidden="true">→</span>';
  $('ready-note').textContent=ready?`精确枚举 ${outcomes} 种结局`:'请选齐所有底牌和至少 3 张公共牌';
  $('remove').disabled=!selected||!selectedCards()?.[selected.index];
}
function calculate(){
  if($('calculate').disabled)return;
  busy=true;render();$('message').textContent='正在枚举剩余公共牌…';
  worker.postMessage({id:revision,hands:state.hands.map(h=>h.join(' ')).join('|'),board:state.board.filter(Boolean).join(' ')});
}
function load(name){state=structuredClone(presets[name]);selected=null;detailSeat=0;invalidate();render();calculate();}
function showResults(){
  const r=result,finished=state.board.filter(Boolean).length===5;
  const pct=n=>(n/r.total*100).toFixed(2);
  const title=r.leaders.length===state.hands.length?(finished?'所有玩家平局':'所有玩家当前牌力相同'):r.leaders.map(seatLabel).join('、')+(finished?(r.leaders.length>1?'共同获胜':'获胜'):'当前领先');
  const rows=r.players.map((p,i)=>`<tr class="${i===detailSeat?'selected-result':''}"><th scope="row"><button class="result-seat" data-seat="${i}" aria-pressed="${i===detailSeat}">${seatLabel(i)}${r.leaders.includes(i)?'<span class="leader-star" aria-label="当前最强"> ★</span>':''}</button></th><td>${pct(p.wins)}%</td><td>${pct(p.ties)}%</td><td>${pct(p.losses)}%</td><td class="equity-cell">${(p.equity*100).toFixed(2)}%</td></tr>`).join('');
  const p=r.players[detailSeat];
  const reason=p.reason.replaceAll('玩家一','__LEFT__').replaceAll('玩家二',seatLabel(p.reference)).replaceAll('__LEFT__',seatLabel(detailSeat));
  $('result-content').innerHTML=`<h3 class="result-title">${title}</h3><p class="subtext">${finished?'公共牌已全部发出，以下为最终摊牌结果。':'当前领先不代表最终获胜。下表精确枚举所有剩余公共牌。'}</p><div class="prob-head"><span>全桌 · 最终结果概率</span><small>${r.total.toLocaleString()} 种结局</small></div><div class="prob-table-wrap"><table class="prob-table"><caption>点击玩家，查看其牌力解释</caption><thead><tr><th>玩家</th><th>独赢</th><th>共同获胜</th><th>落败</th><th>权益</th></tr></thead><tbody>${rows}</tbody></table></div><p class="subtext">共同获胜指并列第一；每种结局按获胜人数平分权益。权益总和约为 100%（显示值经四舍五入）。</p><div class="detail-heading"><h3>${seatLabel(detailSeat)} · 牌力详情</h3><span>${p.hand.category}</span></div><div class="mini-cards">${p.hand.best.map(c=>cardHTML(c,p.decisive.includes(c)?'mini decisive':'mini')).join('')}</div><p class="rank-note">${p.decisive.length?'金色边框为与对比玩家比较时的关键牌。':'与对比玩家的最佳五张等值，没有单独决定胜负的牌。'}</p><div class="explanation"><strong>${finished?'摊牌比较':'当前牌力比较'} · 对比${seatLabel(p.reference)}</strong><p>${reason}</p></div><p class="subtext">${r.leaders.includes(detailSeat)?'当前最强玩家与其最强对手比较。':'此玩家与当前最强玩家比较。'} 概率按全桌计算，不是仅与该对手单挑的概率。</p>`;
  for(const button of document.querySelectorAll('[data-seat]'))button.onclick=()=>{detailSeat=Number(button.dataset.seat);showResults();const active=document.querySelector(`[data-seat="${detailSeat}"]`);active?.focus({preventScroll:true});};
}
worker.onmessage=({data})=>{
  if(data.id!==revision)return;
  busy=false;
  if(data.error||data.result?.error){render();$('message').textContent=data.error||data.result.error;$('result-status').textContent='计算失败';return;}
  result=data.result;detailSeat=Math.min(detailSeat,state.hands.length-1);render();showResults();$('message').textContent='计算完成。所有可能结局均已枚举。';$('result-status').textContent='多人精确结果';
};
worker.onerror=()=>{busy=false;render();$('message').textContent='计算模块加载失败，请重新运行 node scripts/serve-web.mjs 并刷新页面。';};
$('calculate').onclick=calculate;
$('remove').onclick=()=>{if(!selected)return;selectedCards()[selected.index]=null;invalidate();render();};
$('reset').onclick=()=>{state={hands:state.hands.map(()=>[null,null]),board:[null,null,null,null,null]};selected=null;detailSeat=0;invalidate();render();};
$('add-seat').onclick=()=>{if(state.hands.length>=9)return;state.hands.push([null,null]);selected={seat:state.hands.length-1,index:0};invalidate();render();};
for(const b of document.querySelectorAll('[data-preset]'))b.onclick=()=>load(b.dataset.preset);
load('turn');
const handGuide=$('hand-guide');
$('open-guide').onclick=()=>handGuide.showModal();
$('close-guide').onclick=()=>handGuide.close();
handGuide.addEventListener('click',event=>{if(event.target!==handGuide)return;const r=handGuide.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)handGuide.close();});
handGuide.addEventListener('close',()=>$('open-guide').focus());
