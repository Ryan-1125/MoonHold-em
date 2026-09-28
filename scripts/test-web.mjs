import assert from 'node:assert/strict';
import {analyze, analyze_table} from '../web/engine.mjs';
const run=(h,v,b)=>JSON.parse(analyze(h,v,b));
const turn=run('As Ad','Ks Kd','2c 3d 7h 9s');
assert.deepEqual([turn.wins,turn.losses,turn.ties,turn.total],[42,2,0,44]);
assert.equal(turn.hero.category,'一对');
assert.equal(turn.comparison,1);
const tie=run('2c 3c','4d 5d','As Ks Qs Js Ts');
assert.equal(tie.ties,1);assert.equal(tie.equity,.5);assert.equal(tie.comparison,0);
assert.equal(tie.hero.category,'同花顺');
const flop=run('Ah Kh','Qs Qd','2h 7h Qc');assert.equal(flop.total,990);
assert.equal(flop.wins+flop.losses+flop.ties,990);
assert.ok(run('As Ad','As Kd','2c 3d 7h').error);
assert.ok(run('garbage','Ks Kd','2c 3d 7h').error);
assert.ok(run('As','Ks Kd','2c 3d 7h').error);
assert.ok(run('As Ad','Ks Kd','2c 3d').error);
console.log('Browser bridge: examples, exact counts, ties and invalid inputs passed.');
assert.match(turn.reason, /A大于K/);
assert.deepEqual(turn.hero_decisive, ['As','Ad']);
assert.deepEqual(turn.villain_decisive, ['Ks','Kd']);
assert.match(tie.reason, /花色不分大小/);
assert.deepEqual(tie.hero_decisive, []);
console.log('Chinese explanations and decisive-card payloads passed.');

const table=(hands,board)=>JSON.parse(analyze_table(hands.join('|'),board));
const manyHands=['2c 2d','3c 3d','4c 4d','5c 5d','6c 6d','7c 7d','8c 8d','9c 9d'];
for(let n=2;n<=8;n++){
  const tied=table(manyHands.slice(0,n),'As Ks Qs Js Ts');
  assert.equal(tied.players.length,n);
  assert.deepEqual(tied.leaders,Array.from({length:n},(_,i)=>i));
  for(const p of tied.players){assert.equal(p.equity,1/n);assert.equal(p.ties,1);assert.notEqual(p.reference,tied.players.indexOf(p));}
}
const manyFlop=table(manyHands,'As Kh Qh');assert.equal(manyFlop.total,528);
assert.ok(Math.abs(manyFlop.players.reduce((s,p)=>s+p.equity,0)-1)<1e-9);
const reverse=table([...manyHands].reverse(),'As Kh Qh');
assert.deepEqual(reverse.players.map(p=>[p.wins,p.ties,p.losses,p.equity]),manyFlop.players.map(p=>[p.wins,p.ties,p.losses,p.equity]).reverse());
const partial=table(['As 2c','Ah 3c','9s 9d'],'Ks Qd Jh Tc 4s');
assert.deepEqual(partial.leaders,[0,1]);assert.deepEqual(partial.players.map(p=>p.equity),[.5,.5,0]);
const four=table(['As Ad','Ks Kd','Qs Qd','Js Jd'],'2c 3d 7h 9s');
assert.equal(four.total,40);assert.deepEqual(four.players.map(p=>p.wins),[34,2,2,2]);
assert.ok(table(['As Ad','As Kd'],'2c 3d 7h').error);
assert.ok(table(manyHands.concat('Tc Td','Jc Jd'),'As Kh Qh').error);
console.log('2–9 player counts, split equity, reference selection, permutation and validation passed.');

const nineHands=manyHands.concat('Tc Td');
const nineTie=table(nineHands,'As Ks Qs Js Ts');
assert.equal(nineTie.players.length,9);
assert.equal(nineTie.leaders.length,9);
for(const p of nineTie.players){assert.equal(p.equity,1/9);assert.equal(p.ties,1);}
const nineFlop=table(nineHands,'As Kh Qh');
assert.equal(nineFlop.total,465);
assert.ok(Math.abs(nineFlop.players.reduce((s,p)=>s+p.equity,0)-1)<1e-9);
console.log('Nine-player tie (1/9 share) and 465-board flop enumeration passed.');

// Every turn outcome must agree with the final showdown and equity totals.
function verifyRivers(hands,board){
  const result=table(hands,board);
  const known=new Set([...hands.join(' ').split(' '),...board.split(' ')]);
  assert.equal(result.rivers.length,52-known.size);
  assert.equal(new Set(result.rivers.map(r=>r.card)).size,result.rivers.length);
  const counts=hands.map(()=>({wins:0,ties:0,share:0}));
  for(const river of result.rivers){
    assert.ok(!known.has(river.card));
    const final=table(hands,board+' '+river.card);
    assert.deepEqual(river.winners,final.leaders);
    assert.deepEqual(final.rivers,[]);
    for(const i of river.winners){
      counts[i][river.winners.length===1?'wins':'ties']++;
      counts[i].share+=1/river.winners.length;
    }
  }
  counts.forEach((p,i)=>{
    assert.equal(p.wins,result.players[i].wins);
    assert.equal(p.ties,result.players[i].ties);
    assert.ok(Math.abs(p.share/result.total-result.players[i].equity)<1e-10);
  });
  return result;
}
const riversAA=verifyRivers(['As Ad','Ks Kd'],'2c 3d 7h 9s');
assert.deepEqual(riversAA.rivers.filter(r=>r.winners.includes(1)).map(r=>r.card),['Kc','Kh']);
const splitRivers=verifyRivers(['2c 3c','4d 5d'],'As Ks Qs Js');
assert.deepEqual(splitRivers.rivers.find(r=>r.card==='Ts').winners,[0,1]);
verifyRivers(['As Ad','Ks Kd','Qs Qd','Js Jd'],'2c 3d 7h 9s');
verifyRivers(nineHands,'As Kh Qh Jh');
assert.deepEqual(nineFlop.rivers,[]);
const reordered=table(['Ks Kd','As Ad'],'2c 3d 7h 9s');
assert.deepEqual(reordered.rivers.map(r=>r.winners),riversAA.rivers.map(r=>r.winners.map(i=>1-i).sort()));
console.log('River outcomes: exact cards, all final winners, ties, 2/4/9 seats and equity reconciliation passed.');
