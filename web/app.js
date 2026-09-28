const $ = id => document.getElementById(id);
const suits = {s:'♠',h:'♥',d:'♦',c:'♣'};
const suitNames = {s:'黑桃',h:'红桃',d:'方块',c:'梅花'};
const presets = {
  turn:{hands:[['As','Ad'],['Ks','Kd']],board:['2c','3d','7h','9s',null]},
  flush:{hands:[['Ah','Kh'],['Qs','Qd']],board:['2h','7h','Qc',null,null]},
  tie:{hands:[['2c','3c'],['4d','5d']],board:['As','Ks','Qs','Js','Ts']},
  four:{hands:[['As','Ad'],['Ks','Kd'],['Qs','Qd'],['Js','Jd']],board:['2c','3d','7h','9s',null]}
};
let state, selected=null, revision=0, busy=false, exporting=false, result=null, detailSeat=0;
const empty=$('result-content').innerHTML;
const worker=new Worker('worker.js',{type:'module'});
const seatLabel=i=>`玩家 ${i+1}`;
const selectedCards=()=>selected ? (selected.seat===-1?state.board:state.hands[selected.seat]) : null;
function cardHTML(card,cls='mini') {
  return `<span class="${cls}${'hd'.includes(card[1])?' red':''}">${card[0]==='T'?'10':card[0]}${suits[card[1]]}</span>`;
}
function invalidate(){saveTable();revision++;busy=false;result=null;$('result-content').innerHTML=empty;$('result-status').textContent='牌面已更新';$('message').textContent='';}
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
  document.getElementById("download-image").disabled=exporting||busy||![...state.hands.flat(),...state.board].some(Boolean);
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
const restoredTable=restoreTable();
if(restoredTable){state=restoredTable;render();calculate();}else{load('turn');}
const handGuide=$('hand-guide');
$('open-guide').onclick=()=>handGuide.showModal();
$('close-guide').onclick=()=>handGuide.close();
handGuide.addEventListener('click',event=>{if(event.target!==handGuide)return;const r=handGuide.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)handGuide.close();});
handGuide.addEventListener('close',()=>$('open-guide').focus());

// Only card selections are persisted; derived probabilities are recalculated.
function saveTable(){
  try{
    localStorage.setItem('moonholdem.table.v1',JSON.stringify({version:1,hands:state.hands,board:state.board}));
  }catch{
  }
}
function restoreTable(){
  try{
    const raw=localStorage.getItem('moonholdem.table.v1');
    if(!raw)return null;
    if(raw.length>5000)throw Error('Invalid saved table');
    const saved=JSON.parse(raw);
    if(saved.version!==1||!Array.isArray(saved.hands)||saved.hands.length<2||saved.hands.length>9||!Array.isArray(saved.board)||saved.board.length!==5||!saved.hands.every(h=>Array.isArray(h)&&h.length===2))throw Error('Invalid saved table');
    const cards=[...saved.hands.flat(),...saved.board];
    if(!cards.every(c=>c===null||(typeof c==='string'&&/^[2-9TJQKA][shdc]$/.test(c))))throw Error('Invalid saved cards');
    const used=cards.filter(Boolean);
    if(new Set(used).size!==used.length)throw Error('Duplicate saved cards');
    return {hands:saved.hands,board:saved.board};
  }catch{
    return null;
  }
}

// Render a clean report from a frozen snapshot, independent of screen size.
function tableImage(snapshot,analysis,date){
  const width=1000,rowHeight=116,rowsTop=420;
  const height=rowsTop+snapshot.hands.length*rowHeight+158;
  const canvas=document.createElement('canvas');canvas.width=width*2;canvas.height=height*2;
  const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.scale(2,2);
  const ink='#f2f0e6',muted='#a9b7ab',gold='#e1bd78';
  ctx.fillStyle='#101b19';ctx.fillRect(0,0,width,height);
  const text=(value,x,y,size=18,color=ink,weight=400,align='left')=>{ctx.font=`${weight} ${size}px "Microsoft YaHei", "Noto Sans CJK SC", sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(value,x,y);};
  const box=(x,y,w,h,fill,stroke)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,10);ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}};
  const card=(value,x,y,w=53,h=73)=>{
    box(x,y,w,h,value?'#f2efe4':'#253a2e',value?'#d2c397':'#49614e');
    if(!value){text('—',x+w/2,y+h/2+7,21,muted,400,'center');return;}
    const color='hd'.includes(value[1])?'#b74d42':'#24352d';
    text(value[0]==='T'?'10':value[0],x+w/2,y+h*.4,w*.4,color,700,'center');
    text(suits[value[1]],x+w/2,y+h*.8,w*.43,color,400,'center');
  };
  text("MoonHold'em",48,67,34,gold,650);
  text('牌局快照',952,65,21,ink,500,'right');
  text(date.toLocaleString('zh-CN',{hour12:false}),952,94,13,muted,400,'right');
  const boardCount=snapshot.board.filter(Boolean).length;
  const stage=({3:'翻牌',4:'转牌',5:'河牌'})[boardCount]||'待补全';
  text(`${snapshot.hands.length} 人牌桌  /  ${stage}  /  ${analysis?'精确枚举 '+analysis.total+' 种结局':'尚未计算'}`,48,117,16,muted);
  box(48,149,904,174,'#1c3229','#405c48');
  text('公共牌',74,184,17,gold,600);
  snapshot.board.forEach((c,i)=>card(c,328+i*67,200));
  text('— 表示未选牌',926,302,12,muted,400,'right');
  text(analysis?(boardCount===5?'最终摊牌结果':'当前牌型 · 最终结果概率'):'已保存牌面 · 尚无计算结果',48,365,21,gold,600);
  const columns=[{label:'独赢',x:572},{label:'共同获胜',x:692},{label:'落败',x:812},{label:'权益',x:925}];
  text('玩家 / 底牌',68,400,14,muted);text('当前牌型',330,400,14,muted);
  columns.forEach(c=>text(c.label,c.x,400,14,muted,400,'right'));
  snapshot.hands.forEach((hand,i)=>{
    const y=rowsTop+i*rowHeight,p=analysis?.players[i],leading=analysis?.leaders.includes(i);
    box(48,y,904,rowHeight-10,leading?'#29392d':'#172522',leading?'#8e8055':'#30423b');
    text(`玩家 ${i+1}`,68,y+30,18,leading?gold:ink,600);
    if(leading)text(boardCount===5?'获胜':'当前领先',68,y+60,12,gold);
    hand.forEach((c,j)=>card(c,171+j*63,y+16,49,70));
    text(p?p.hand.category:'未计算',330,y+47,19,p?ink:muted,500);
    if(p){
      const values=[p.wins/analysis.total,p.ties/analysis.total,p.losses/analysis.total,p.equity];
      values.forEach((v,j)=>text((v*100).toFixed(2)+'%',columns[j].x,y+54,19,j===3?gold:ink,600,'right'));
    }else columns.forEach(c=>text('—',c.x,y+54,18,muted,400,'right'));
  });
  const bottom=rowsTop+snapshot.hands.length*rowHeight;
  text(analysis?'所有底牌已知；共同获胜时按人数平分权益。不含下注与边池。':'这是尚未计算的牌面快照；未展示概率或胜负结论。',48,bottom+30,14,muted);
  text(analysis&&boardCount<5?'当前领先不代表最终获胜。概率来自全部剩余公共牌的精确枚举。':'牌面与结果取自下载时的牌局；百分比显示值经四舍五入。',48,bottom+56,14,muted);
  ctx.strokeStyle='#30423b';ctx.beginPath();ctx.moveTo(48,bottom+83);ctx.lineTo(952,bottom+83);ctx.stroke();
  text("MoonHold'em · MoonBit",48,bottom+119,14,muted);
  text('Ryan',952,bottom+119,14,muted,400,'right');
  return canvas;
}
const previewDialog=$('image-preview');
let pendingImage=null;
previewDialog.addEventListener('close',()=>{
  if(pendingImage){URL.revokeObjectURL(pendingImage.url);pendingImage=null;}
  $('preview-image').removeAttribute('src');
  $('download-image').focus();
});
$('cancel-download').onclick=()=>previewDialog.close();
$('confirm-download').onclick=()=>{
  if(!pendingImage)return;
  const {url,filename}=pendingImage;
  const link=document.createElement('a');link.href=url;link.download=filename;
  document.body.append(link);link.click();link.remove();
  pendingImage=null;
  setTimeout(()=>URL.revokeObjectURL(url),30000);
  previewDialog.close();
  $('download-status').textContent=`牌局已保存为：\n${filename}`;
};
$('download-image').onclick=async()=>{
  const button=$('download-image');
  if(button.disabled)return;
  const snapshot=structuredClone(state),analysis=result?structuredClone(result):null,date=new Date();
  exporting=true;button.disabled=true;button.textContent='正在生成图片…';
  $('download-status').textContent='';
  try{
    await document.fonts.ready;
    const canvas=tableImage(snapshot,analysis,date);
    const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('PNG encoding failed')),'image/png'));
    const day=[date.getFullYear(),String(date.getMonth()+1).padStart(2,'0'),String(date.getDate()).padStart(2,'0')].join('.');
    const time=[date.getHours(),date.getMinutes(),date.getSeconds()].map(v=>String(v).padStart(2,'0')).join('');
    pendingImage={url:URL.createObjectURL(blob),filename:`MoonHold'em-${snapshot.hands.length}人牌局-${day}-${time}.png`};
    $('preview-image').src=pendingImage.url;
    $('preview-filename').textContent=pendingImage.filename;
    previewDialog.showModal();
  }catch{
    if(pendingImage){URL.revokeObjectURL(pendingImage.url);pendingImage=null;}
    $('download-status').textContent='图片生成失败，请重试。';
  }finally{
    exporting=false;button.innerHTML='<span aria-hidden="true">↓</span> 下载牌局图片';render();
  }
};
