import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newVisit, nextFrame } from '../dist/experience.js?v=density1';
import { buildSceneLayout } from '../dist/scene-layout.js?v=randomlayout1';

test('each section gets a different composition even with identical images', () => {
  const s = newVisit(7),
    f = nextFrame(s),
    layouts = [];
  for (let index = 0; index < 30; index++)
    layouts.push(JSON.stringify(buildSceneLayout({ ...f, index }, s.seed).items));
  assert.equal(new Set(layouts).size, 30);
});
test('layout is stable on rerender and does not alter the feed state or frame', () => {
  const s = newVisit(4),
    f = nextFrame(s),
    before = JSON.stringify(s),
    a = buildSceneLayout(f, s.seed);
  assert.deepEqual(a, buildSceneLayout(f, s.seed));
  assert.equal(JSON.stringify(s), before);
  assert.notDeepEqual(a, buildSceneLayout(f, 5));
});
test('all images stay inside desktop and mobile scenes with captions clear', () => {
  for (let seed = 0; seed < 40; seed++) {
    const s = newVisit(seed);
    for (let i = 0; i < 30; i++) {
      const f = nextFrame(s),
        p = buildSceneLayout(f, s.seed);
      assert.equal(p.items.length, f.ids.length);
      for (const r of p.items)
        for (const [rect, height] of [
          [r, p.height],
          [r.mobile, p.mobileHeight],
        ]) {
          assert(rect.x >= 0 && rect.x + rect.w <= 100);
          assert(rect.y >= 80 && rect.y + rect.h <= height);
          assert(rect.w > 0 && rect.h > 0);
        }
    }
  }
});
