import test from 'node:test';
import assert from 'node:assert/strict';
import { newVisit, nextFrame, recordMediaReaction, library } from '../dist/experience.js';
import {
  reactionPosts,
  reactionPost,
  isVideoPost,
  sanitizeMediaHistory,
} from '../dist/reaction-posts.js';
test('media pages shuffle all sources without repeats or fight collisions, and contain only the supplied clips', () => {
  const orders = [];
  for (let seed = 1; seed <= 20; seed++) {
    const s = newVisit(seed),
      media = [];
    for (let i = 0; i < 220 && media.length < reactionPosts.length * 2; i++) {
      const f = nextFrame(s);
      if (f.reaction) {
        assert.ok(!f.encounter);
        media.push(f.reaction.postId);
      }
    }
    assert.equal(media.length, reactionPosts.length * 2);
    for (let i = 0; i < 2; i++) {
      const cycle = media.slice(i * reactionPosts.length, (i + 1) * reactionPosts.length);
      assert.equal(new Set(cycle).size, reactionPosts.length);
      assert.ok(cycle.slice(0, 4).every((id) => reactionPost(id).kind !== 'vine'));
    }
    assert.ok(media.every((id, i) => i === 0 || id !== media[i - 1]));
    orders.push(media.join(','));
  }
  assert.ok(new Set(orders).size > 3);
});
test('a returning visit resumes the same shuffled media queue', () => {
  const s = newVisit(136);
  for (let i = 0; i < 22; i++) nextFrame(s);
  const restored = JSON.parse(JSON.stringify(s));
  for (let i = 0; i < 50; i++) assert.deepEqual(nextFrame(restored), nextFrame(s));
  assert.deepEqual(restored.mediaQueue, s.mediaQueue);
});
test('the media pool contains exactly the three links supplied by the user', () => {
  assert.equal(reactionPosts.length, 3);
  for (const id of ['-7lV0SgPsB8', 'GqZ5bunhiFs', 'mgoHCuZYFEQ'])
    assert.ok(reactionPosts.some((p) => p.url.includes(id) && isVideoPost(p)));
  assert.ok(reactionPosts.every((p) => p.selectedBy === 'visitor collection'));
});
test('withdrawn embeds disappear from both saved feeds without deleting photo history', () => {
  const s = newVisit(136);
  const f = nextFrame(s);
  f.reaction = { postId: 'daquan-courtroom' };
  s.mediaQueue = ['steve-aisle-six', 'low-quality-roblox'];
  s.mediaRevision = 'old';
  s.mediaReactions = [{ postId: 'steve-aisle-six' }, { postId: 'low-quality-roblox' }];
  s.log.push({ postId: 'wasted-kanye', type: 'media-reaction' });
  s.comparison = newVisit(88);
  nextFrame(s.comparison).reaction = { postId: 'chickens' };
  const ids = [...f.ids];
  sanitizeMediaHistory(s);
  assert.deepEqual(f.ids, ids);
  assert.equal(f.reaction, undefined);
  assert.equal(s.comparison.frames[0].reaction, undefined);
  assert.deepEqual(s.mediaQueue, []);
  assert.deepEqual(s.mediaReactions, [{ postId: 'low-quality-roblox' }]);
  assert.ok(!s.log.some((e) => e.postId === 'wasted-kanye'));
  f.reaction = { postId: 'low-quality-roblox', selected: 'pin-play-roblox' };
  sanitizeMediaHistory(s);
  assert.equal(f.reaction.selected, 'pin-play-roblox');
});
test('media reactions persist and enter the personalized image history without duplicate picks', () => {
  const s = newVisit(136);
  while (!s.frames.at(-1)?.reaction) nextFrame(s);
  const e = s.frames.at(-1).reaction,
    p = reactionPost(e.postId),
    id = p.options[1];
  assert.equal(recordMediaReaction(s, e, 'not-an-option'), false);
  assert.equal(recordMediaReaction(s, e, id), true);
  assert.equal(recordMediaReaction(s, e, id), false);
  assert.equal(s.mediaReactions.length, 1);
  assert.equal(s.memeAnswers.at(-1).id, id);
  const copy = JSON.parse(JSON.stringify(s));
  assert.equal(copy.frames.at(-1).reaction.selected, id);
  assert.equal(recordMediaReaction(copy, copy.frames.at(-1).reaction, id), false);
  assert.equal(
    recordMediaReaction(copy, copy.frames.at(-1).reaction, p.options[0]),
    true,
  );
});
test('all media options use the Pinterest collection and link to named platform sources', () => {
  const ids = new Set(library.map((a) => a.id));
  for (const p of reactionPosts) {
    assert.equal(p.options.length, 3);
    assert.ok(p.options.every((id) => ids.has(id)));
    assert.ok(new URL(p.url).protocol === 'https:');
    assert.ok(p.credit);
    assert.ok(p.embed.startsWith('https://'));
  }
});

test('All video players autoplay muted inline and loop their own clip', () => {
  for (const p of reactionPosts.filter(isVideoPost)) {
    const u = new URL(p.embed);
    for (const key of ['autoplay', 'mute', 'playsinline', 'loop'])
      assert.equal(u.searchParams.get(key), '1');
    assert.equal(u.searchParams.get('playlist'), u.pathname.split('/').at(-1));
  }
});
