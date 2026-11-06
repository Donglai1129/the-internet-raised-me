import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createState, artifacts, expose, interact, byId } from '../dist/engine.js';
import { buildPortraitPlan, portraitStats } from '../dist/portrait.js';
function visit(seed) {
  const s = createState(seed);
  for (let i = 0; i < 15; i++) {
    for (let j = 0; j < 1 + (i % 4); j++) expose(s, artifacts[i], 'test');
  }
  return s;
}
test('portrait generation is reproducible and leaves recommendation state untouched', () => {
  const s = visit(12),
    before = JSON.stringify(s);
  assert.deepEqual(buildPortraitPlan(s), buildPortraitPlan(s));
  assert.equal(JSON.stringify(s), before);
});
test('portrait contains only memes actually encountered, including echoes', () => {
  const s = createState(9),
    a = byId('download');
  for (let i = 0; i < 5; i++) expose(s, a, 'test');
  const p = buildPortraitPlan(s);
  assert(p.items.length > 0);
  assert(p.items.every((x) => x.id === a.id));
  assert(p.items.some((x) => x.echo));
});
test('clicks and dwell personalize the same exposure history', () => {
  const s = visit(12),
    before = buildPortraitPlan(s);
  interact(s, byId('blue-wolf'), 'open');
  interact(s, byId('blue-wolf'), 'dwell', 40);
  const after = buildPortraitPlan(s);
  assert.notEqual(after.seed, before.seed);
  assert.notDeepEqual(after.items, before.items);
  const stats = portraitStats(s).find((a) => a.id === 'blue-wolf');
  assert.equal(stats.opens, 1);
  assert.equal(stats.dwell, 40);
  assert(stats.score > stats.views * 1.25);
});
test('different visitor seeds make different non-grid layouts for the same views', () => {
  const a = buildPortraitPlan(visit(1)),
    b = buildPortraitPlan(visit(2));
  assert.notDeepEqual(
    a.items.map((x) => [x.x, x.y]),
    b.items.map((x) => [x.x, x.y]),
  );
  assert(new Set(a.items.map((x) => Math.round(x.w))).size > 5);
});
test('all images fit inside the export canvas', () => {
  for (let seed = 0; seed < 40; seed++) {
    const p = buildPortraitPlan(visit(seed));
    for (const item of p.items) {
      assert(item.x >= 0 && item.y >= 0);
      assert(item.x + item.w <= p.width);
      assert(item.y + item.h <= p.height);
      assert(item.w > 0 && item.h > 0);
    }
  }
});
test('an unstarted visit does not invent meme exposure', () =>
  assert.equal(buildPortraitPlan(createState(1)).items.length, 0));
test('colors are sampled from encountered images and change with the collection', () => {
  const a = createState(4),
    b = createState(4);
  expose(a, byId('blue-wolf'), 'test');
  expose(b, byId('neon-collage'), 'test');
  assert.notDeepEqual(buildPortraitPlan(a).palette, buildPortraitPlan(b).palette);
});
test('meme answers enter the collage and change layout without inventing views', () => {
  const s = visit(3),
    before = buildPortraitPlan(s);
  s.memeAnswers = [
    {
      id: 'alien-reaction',
      prompt: 'which one?',
      options: ['alien-reaction', 'download'],
    },
  ];
  const after = buildPortraitPlan(s);
  assert.equal(after.choiceCount, 1);
  assert.equal(after.layout, 'clusters');
  assert.notDeepEqual(before.items, after.items);
  assert(after.items.some((i) => i.id === 'alien-reaction' && i.chosen === 1));
});
test('browsing behavior controls composition rather than only randomizing coordinates', () => {
  const s = createState(3);
  for (let i = 0; i < 5; i++) expose(s, byId('download'), 'test');
  assert.equal(buildPortraitPlan(s).layout, 'orbit');
  interact(s, byId('download'), 'open');
  assert.equal(buildPortraitPlan(s).layout, 'trail');
});
