import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createState,
  expose,
  interact,
  byId,
  next,
  migrateState,
  cultures,
  artifacts,
} from '../dist/engine.js';
import { analyze } from '../dist/analytics.js';
test('analytics report actual repetition, reach, attention and passive repeats', () => {
  const s = createState(4),
    a = byId('blue-wolf'),
    b = byId('download');
  expose(s, a, 'page');
  expose(s, a, 'page');
  expose(s, b, 'page');
  interact(s, b, 'open');
  interact(s, b, 'dwell', 17);
  interact(s, a, 'skip');
  const d = analyze(s);
  assert.equal(d.views, 3);
  assert.equal(d.unique, 2);
  assert.equal(d.repeats, 1);
  assert.equal(d.repeatRate, 1 / 3);
  assert.equal(d.dwellSeconds, 17);
  assert.equal(d.skipped, 1);
  assert.deepEqual(d.passive, [a.id]);
  assert.equal(d.unseen.length, artifacts.length - 2);
});
test('early/recent shift comes from ordered exposures, not inferred identity', () => {
  const s = createState(7);
  for (let i = 0; i < 10; i++) expose(s, byId('blue-wolf'), 'page');
  for (let i = 0; i < 10; i++) expose(s, byId('culture-lobby-chat'), 'page');
  const d = analyze(s);
  assert.equal(d.shift.culture, 6);
  assert.equal(d.shift.first, 0);
  assert.equal(d.shift.last, 1);
  assert.equal(d.longest, 10);
});
test('legacy meme-only state expands without losing old counts or seed', () => {
  const s = createState(4);
  for (const key of ['exposures', 'responses', 'dwell', 'weights'])
    s[key] = s[key].slice(0, 4);
  s.exposures[0] = 12;
  const v = migrateState(s);
  assert.equal(v.exposures.length, cultures.length);
  assert.equal(v.exposures[0], 12);
  assert.equal(v.seed, 4);
  assert.equal(v.weights[7], 1);
});
test('browsing maintains broad internet culture rather than only memes', () => {
  const s = createState(9);
  for (let i = 0; i < 30; i++) {
    const batch = next(s);
    assert(batch.filter((a) => a.kind !== 'meme').length >= 2);
    for (const a of batch) expose(s, a, 'test');
  }
});
test('library has valid sources, varied content types and connected cross-category paths', () => {
  assert(artifacts.length >= 70);
  assert(new Set(artifacts.map((a) => a.kind)).size >= 6);
  for (const a of artifacts) {
    assert(a.related.length > 0);
    assert(a.related.every(byId));
    if (a.source.kind === 'Wikimedia Commons') {
      assert(a.source.creator);
      assert(a.source.license);
      assert(a.source.url.startsWith('https://commons.wikimedia.org/'));
    }
  }
});
