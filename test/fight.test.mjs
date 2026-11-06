import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createFight, powerUp, fightBeat } from '../dist/fight-engine.js?v=1';
const ids = ['pin-horse-suit', 'pin-bird-basketball', 'pin-blue-candy'];
test('fighters spar without ending the game before the visitor chooses', () => {
  const s = createFight(ids, 2);
  for (let i = 0; i < 200; i++) fightBeat(s);
  assert.equal(s.winner, null);
  assert(s.fighters.every((f) => f.hp >= 35));
});
test('each of the three memes can win when the visitor gives it power', () => {
  for (let seed = 0; seed < 30; seed++)
    for (const id of ids) {
      const s = createFight(ids, seed);
      powerUp(s, id);
      for (let i = 0; i < 100 && !s.winner; i++) fightBeat(s);
      assert.equal(s.winner, id);
      assert.equal(s.fighters.filter((f) => f.hp > 0).length, 1);
    }
});
test('repeated clicks strengthen the selected meme and finish the fight', () => {
  for (const id of ids) {
    const s = createFight(ids, 7);
    let clicks = 0;
    while (!s.winner && clicks++ < 20) powerUp(s, id);
    assert.equal(s.winner, id);
    assert(s.fighters.find((f) => f.id === id).power > 0);
    const before = JSON.stringify(s);
    assert(!powerUp(s, id));
    fightBeat(s);
    assert.equal(JSON.stringify(s), before);
  }
});
test('switching support is allowed, and reset creates a clean round', () => {
  const s = createFight(ids, 3);
  powerUp(s, ids[0]);
  powerUp(s, ids[1]);
  assert.equal(s.chosen, ids[1]);
  assert(!powerUp(s, 'not-a-fighter'));
  const fresh = createFight(ids, 3);
  assert.equal(fresh.chosen, null);
  assert(fresh.fighters.every((f) => f.hp === 100 && f.power === 0));
});

import {
  newVisit,
  nextFrame,
  recordFightWin,
  library,
} from '../dist/experience.js?v=inline1';
test('fights are random in-feed encounters with a gap between them', () => {
  const starts = new Set();
  for (let seed = 0; seed < 32; seed++) {
    const s = newVisit(seed),
      at = [];
    for (let i = 0; i < 60; i++) {
      const f = nextFrame(s);
      if (f.encounter) {
        at.push(i);
        assert.equal(new Set(f.encounter.state.fighters.map((x) => x.id)).size, 3);
        assert(f.encounter.state.fighters.every((x) => f.ids.includes(x.id)));
      }
    }
    assert(at[0] >= 4 && at[0] <= 8);
    starts.add(at[0]);
    for (let i = 1; i < at.length; i++)
      assert(at[i] - at[i - 1] >= 7 && at[i] - at[i - 1] <= 13);
  }
  assert(starts.size >= 4);
});
test('a fight result is recorded once and the winner appears in the next shuffle', () => {
  const s = newVisit(13);
  let frame;
  while (!frame?.encounter) frame = nextFrame(s);
  const e = frame.encounter,
    id = e.state.fighters[0].id;
  powerUp(e.state, id);
  for (let i = 0; i < 100 && !e.state.winner; i++) fightBeat(e.state);
  assert(recordFightWin(s, e));
  assert.equal(s.battleWins[id], 1);
  assert.equal(s.pendingWinner, id);
  assert(!recordFightWin(s, e));
  assert.equal(s.battleWins[id], 1);
  const f = nextFrame(s);
  assert(f.ids.includes(id));
  assert.equal(s.pendingWinner, null);
  assert(s.memeAnswers.some((a) => a.id === id));
});
test('saved winner counts increase long-term selection frequency without locking the feed', () => {
  const winner = 'pin-blue-candy';
  let normal = 0,
    boosted = 0;
  for (let seed = 0; seed < 60; seed++) {
    const a = newVisit(seed),
      b = newVisit(seed);
    b.battleWins = { [winner]: 4 };
    for (let i = 0; i < 30; i++) {
      normal += nextFrame(a).ids.includes(winner);
      boosted += nextFrame(b).ids.includes(winner);
    }
    assert(new Set(b.frames.flatMap((f) => f.ids)).size > 35);
  }
  assert(boosted > normal * 1.3, `${normal} vs ${boosted}`);
});
