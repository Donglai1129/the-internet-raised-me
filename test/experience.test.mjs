import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  library,
  newVisit,
  sharedOpening,
  nextFrame,
  frameDensity,
  answerQuestion,
  answerMemeQuestion,
  recordView,
  openReference,
  answerReply,
  replyOptions,
  makeOtherRoute,
  visitOther,
  evidence,
  viewCount,
  chapter,
} from '../dist/experience.js';
function walk(seed, n) {
  const s = newVisit(seed);
  for (let i = 0; i < n; i++) {
    const f = nextFrame(s);
    for (const id of f.ids) recordView(s, f, id);
  }
  return s;
}
test('everyone enters the same authentic mixed scene, without mock-interface fragments', () => {
  for (const seed of [1, 5, 10])
    assert.deepEqual(nextFrame(newVisit(seed)).ids, sharedOpening);
  assert(library.every((a) => a.source.kind !== 'original culture fragment'));
});
test('free exploration is reproducible without clicks', () => {
  const a = walk(32, 7),
    b = walk(32, 7);
  assert.deepEqual(a, b);
  assert(new Set(a.frames.slice(1).map((f) => f.thread)).size >= 2);
  assert(Object.values(a.opened).every((n) => n === 0));
});
test('view observations do not recount an already seen frame on rerender', () => {
  const s = newVisit(7),
    f = nextFrame(s);
  assert(recordView(s, f, f.ids[0]));
  assert(!recordView(s, f, f.ids[0]));
  assert.equal(viewCount(s), 1);
});
test('reply records familiarity before the new context and is not graded', () => {
  const s = walk(6, 4),
    [known, other] = replyOptions(s);
  const count = s.familiarity[known];
  answerReply(s, known);
  assert.equal(s.reply.prior, count);
  assert.equal(s.reply.id, known);
  assert(!('correct' in s.reply));
  assert.notEqual(known, other);
  assert.equal(chapter(s), 2);
});
test('other route is synthetic, distinct, and isolated from original exposure history', () => {
  const s = walk(17, 7),
    before = JSON.stringify(s.familiarity);
  const alt = makeOtherRoute(s);
  assert.notEqual(alt.anchor, s.anchor);
  assert.equal(JSON.stringify(s.familiarity), before);
  assert.notDeepEqual(alt.current, s.current);
  visitOther(s);
  assert(s.comparisonVisited);
  assert.equal(chapter(s), 3);
});
test('evidence distinguishes imposed repetition from a visitor opening', () => {
  const s = walk(8, 4),
    f = s.frames.at(-1),
    id = evidence(s).anchor,
    before = s.familiarity[id];
  openReference(s, f, id);
  const e = evidence(s);
  assert.equal(e.beforeOpen, before);
  assert.equal(e.anchorViews, before + 1);
  assert(e.opened);
});
test('all routes, including the alternative, remain serializable and in the active library', () => {
  const s = walk(2, 7);
  visitOther(s);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
  for (const f of [...s.frames, ...s.comparison.frames])
    assert(f.ids.every((id) => s.libraryIds.includes(id)));
});

test('feed keeps connected images while freely sampling the wider library', async () => {
  const { threads } = await import('../dist/threads.js');
  for (let seed = 0; seed < 16; seed++) {
    const s = walk(seed, 20);
    assert(new Set(s.frames.slice(1).map((f) => f.thread)).size >= 3);
    for (const f of s.frames.slice(1)) {
      const topic = threads.find((t) => t.id === f.thread);
      assert.equal(new Set(f.ids).size, frameDensity(f.index));
      assert(f.ids.slice(0, 2).every((id) => topic.ids.includes(id)));
    }
  }
});
test('even extreme opening history cannot lock the theme or suppress exploration', () => {
  const s = newVisit(5);
  s.opened['neon-collage'] = 100000;
  for (let i = 0; i < 30; i++) nextFrame(s);
  assert.equal(new Set(s.frames.slice(1).map((f) => f.thread)).size, 4);
  assert(new Set(s.frames.flatMap((f) => f.ids)).size > 25);
});
test('explicit answers affect only three upcoming sections and are logged', () => {
  const s = walk(8, 10);
  assert(answerQuestion(s, 'different'));
  assert.equal(s.feedChoice.until, 13);
  for (let i = 0; i < 4; i++) nextFrame(s);
  assert(s.frames.length > s.feedChoice.until);
  assert(s.log.some((e) => e.type === 'feed-choice' && e.choice === 'different'));
  assert(!answerQuestion(s, 'skip'));
});
test('connections come from curated semantic relationships, not arbitrary catalog adjacency', async () => {
  const { threads, connectedIds } = await import('../dist/threads.js');
  for (const t of threads)
    for (const id of t.ids) {
      const connections = connectedIds(id);
      assert(connections.length >= 4);
      assert(!connections.includes(id));
      assert(connections.every((next) => library.some((a) => a.id === next)));
    }
});

test('meme questions record the chosen image and prompt without setting a theme or diagnosis', () => {
  const s = walk(3, 10),
    thread = s.currentThread,
    options = ['lone-wolf', 'sad-dinosaur', 'download'];
  assert(answerMemeQuestion(s, options[1], 'which one is you rn?', options));
  assert.equal(s.memeAnswers[0].id, options[1]);
  assert.equal(s.currentThread, thread);
  assert.equal(s.memeChoice.until, 13);
  assert(!answerMemeQuestion(s, 'blue-wolf', 'test', options));
  assert.equal(s.memeAnswers.length, 1);
  assert(s.log.some((e) => e.type === 'meme-choice' && e.isAssessment === false));
});

test('successive scenes gradually grow from four to ten distinct images without changing the opening', () => {
  const s = newVisit(67),
    counts = [];
  for (let i = 0; i < 60; i++) {
    const f = nextFrame(s);
    counts.push(f.ids.length);
    assert.equal(new Set(f.ids).size, f.ids.length);
    assert(f.ids.every((id) => s.libraryIds.includes(id)));
    if (i) assert(counts[i] >= counts[i - 1]);
  }
  assert.deepEqual(counts.slice(0, 4), [4, 4, 4, 4]);
  assert.equal(counts[4], 5);
  assert.equal(counts[12], 7);
  assert.equal(counts[24], 10);
  assert(counts.every((n) => n <= 10));
});
