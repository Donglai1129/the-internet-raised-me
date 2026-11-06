import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  artifacts,
  byId,
  opening,
  createState,
  next,
  expose,
  interact,
  evolution,
  total,
  stage,
} from '../dist/engine.js';
function run(seed, n) {
  const s = createState(seed);
  for (let i = 0; i < n; i++) for (const a of next(s)) expose(s, a, 'test');
  return s;
}
test('every visitor begins with the same mixed-culture opening', () => {
  for (const seed of [1, 19, 4321])
    assert.deepEqual(
      next(createState(seed)).map((a) => a.id),
      opening,
    );
});
test('seed and ordered exposures reproduce the complete history', () =>
  assert.deepEqual(run(42, 20), run(42, 20)));
test('system controlled paths diverge without any clicks', () => {
  const a = run(1, 30),
    b = run(54321, 30);
  assert.notDeepEqual(a.exposures, b.exposures);
  assert.notDeepEqual(evolution(a).color, evolution(b).color);
  assert(a.responses.every((n) => n === 0));
});
test('repeated real content changes exposure weights and exact familiarity', () => {
  const s = createState(5),
    a = byId('how-bro-felt');
  for (let i = 0; i < 20; i++) expose(s, a, 'repeat');
  assert(s.weights[0] > s.weights[1]);
  assert.equal(s.familiarity[a.id], 20);
  assert.equal(evolution(s).lead, a.id);
  assert.equal(s.responses[0], 0);
});
test('skipping is logged without boosting recommendations or inventing exposures', () => {
  const s = createState(2);
  const before = [...s.weights];
  interact(s, artifacts[0], 'skip');
  assert.deepEqual(s.weights, before);
  assert.equal(total(s), 0);
  assert.equal(s.skips[artifacts[0].id], 1);
});
test('open and dwell are independent from exposure', () => {
  const s = createState(2),
    a = byId('download');
  interact(s, a, 'open');
  interact(s, a, 'dwell', 15);
  assert.equal(total(s), 0);
  assert.equal(s.responses[2], 1);
  assert.equal(s.dwell[2], 15);
});
test('recommendation batches have five valid distinct entries with room for later repetition', () => {
  const s = createState(7);
  let repeats = 0;
  const seen = new Set();
  for (let i = 0; i < 15; i++) {
    const batch = next(s);
    assert.equal(new Set(batch.map((a) => a.id)).size, 5);
    for (const a of batch) {
      assert(a.image && a.alt && a.source.kind);
      if (seen.has(a.id)) repeats++;
      seen.add(a.id);
      expose(s, a, 'test');
    }
  }
  assert(repeats > 0);
});
test('state serializes, stages advance, and source relationships resolve', () => {
  const s = run(4, 10);
  assert.equal(stage(s), 3);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  assert(s.weights.every((n) => n > 0));
  for (const a of artifacts) assert(a.related.every((id) => byId(id)));
});
