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
assert.ok(table(manyHands.concat('Tc Td'),'As Kh Qh').error);
console.log('2–8 player counts, split equity, reference selection, permutation and validation passed.');
