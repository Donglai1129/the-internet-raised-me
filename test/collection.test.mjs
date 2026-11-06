import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  library,
  newVisit,
  nextFrame,
  migrateCollection,
} from '../dist/experience.js?v=pins20261030';
import { threads, connectedIds } from '../dist/threads.js?v=pins20261030';
import { buildPortraitPlan } from '../dist/portrait.js?v=pins20261030';

test('active collection contains 40 new Pinterest images and 13 retained originals, without sourced images', () => {
  assert.equal(library.length, 53);
  assert.equal(library.filter((a) => a.id.startsWith('pin-')).length, 40);
  for (const a of library) {
    assert.equal(a.source.kind, 'Pinterest — collected by the user');
    assert(!a.id.startsWith('web-'));
    assert(existsSync(new URL('../dist/' + a.image, import.meta.url)));
    assert(connectedIds(a.id).length >= 4);
  }
  assert(
    !existsSync(new URL('../dist/assets/library/web-26520e9a14.jpg', import.meta.url)),
  );
});
test('new Pinterest images are reachable in feeds, related photos and portrait colors', () => {
  const seen = new Set();
  for (let seed = 0; seed < 8; seed++) {
    const s = newVisit(seed);
    for (let i = 0; i < 30; i++) for (const id of nextFrame(s).ids) seen.add(id);
  }
  for (const a of library) assert(seen.has(a.id), a.id);
  for (const t of threads)
    for (const id of [...t.ids, ...t.bridges]) assert(library.some((a) => a.id === id));
});
test('returning visits keep remaining history and lose withdrawn images in both feeds and exports', () => {
  const s = newVisit(13);
  s.contentRevision = 4;
  delete s.collectionRevision;
  s.entered = true;
  s.frames = [
    {
      index: 0,
      ids: ['download', 'web-26520e9a14'],
      seen: ['download', 'web-26520e9a14'],
      opened: ['web-26520e9a14'],
    },
  ];
  s.familiarity = { download: 2, 'web-26520e9a14': 3 };
  s.opened = { 'web-26520e9a14': 1 };
  s.log = [
    { type: 'exposure', id: 'download' },
    { type: 'exposure', id: 'web-26520e9a14' },
    { type: 'interaction', kind: 'open', id: 'web-26520e9a14' },
  ];
  s.comparison = structuredClone({ ...s, comparison: null });
  const before = JSON.stringify(s),
    v = migrateCollection(s);
  assert.equal(JSON.stringify(s), before);
  assert.equal(v.seed, s.seed);
  assert(v.entered);
  assert.equal(v.familiarity.download, 2);
  assert.equal(v.libraryIds.length, 53);
  assert.equal(
    v.exposures.reduce((n, x) => n + x, 0),
    2,
  );
  assert(!JSON.stringify(v).includes('web-26520e9a14'));
  assert.deepEqual(v.frames[0].ids, ['download']);
  assert.equal(v.comparison.libraryIds.length, 53);
  assert(buildPortraitPlan(v).items.every((a) => a.id === 'download'));
});
