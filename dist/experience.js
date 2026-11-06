import { scheduleReaction, reactionPost } from './reaction-posts.js?v=useronly1';
import { createFight } from './fight-engine.js?v=1';
import {
  artifacts,
  byId,
  createState,
  random,
  expose,
  interact,
  log,
} from './engine.js?v=pins20261030';
import { threads } from './threads.js?v=pins20261030';
export const library = artifacts.filter(
  (a) => a.source.kind !== 'original culture fragment',
);
export const sharedOpening = ['download', 'blue-wolf', 'neon-collage', 'how-bro-felt'];
const anchors = ['how-bro-felt', 'neon-collage', 'download', 'blue-wolf'];
export const routeOf = (a) =>
  a.culture === 0 ? 0 : a.culture === 1 || a.culture === 4 ? 1 : a.culture === 2 ? 2 : 3;
export function newVisit(seed) {
  const s = createState(seed);
  return {
    ...s,
    version: 3,
    contentRevision: 5,
    collectionRevision: 'pinterest-20261030',
    battleWins: {},
    nextFightAt: 4 + ((seed >>> 3) % 5),
    libraryIds: library.map((a) => a.id),
    bias: seed % 4,
    currentThread: seed % 4,
    anchor: anchors[seed % 4],
    frames: [],
    entered: false,
    reply: null,
    comparisonVisited: false,
    comparison: null,
    finished: false,
  };
}
// Preserve the visitor’s remaining history while withdrawing the old sourced images.
export function migrateCollection(input) {
  const valid = new Set(library.map((a) => a.id));
  const gone = (id) =>
    typeof id === 'string' &&
    (id.startsWith('web-') ||
      id.startsWith('culture-') ||
      ['music-portrait', 'good-night'].includes(id));
  function clean(value) {
    if (Array.isArray(value))
      return value
        .filter((v) => !gone(v) && !(v && typeof v === 'object' && gone(v.id)))
        .map(clean);
    if (value && typeof value === 'object')
      return Object.fromEntries(
        Object.entries(value)
          .filter(([key]) => !gone(key))
          .map(([key, v]) => [key, clean(v)]),
      );
    return gone(value) ? null : value;
  }
  const s = clean(input);
  if (!s || s.version !== 3) return s;
  function update(route) {
    if (!route) return;
    route.libraryIds = [...valid];
    route.contentRevision = 5;
    for (const key of ['familiarity', 'opened', 'skips'])
      route[key] = Object.fromEntries(
        Object.entries(route[key] || {}).filter(([id]) => valid.has(id)),
      );
    route.frames = (route.frames || [])
      .filter((f) => f.ids?.some((id) => valid.has(id)))
      .map((f, index) => ({
        ...f,
        index,
        ids: f.ids.filter((id) => valid.has(id)),
        seen: (f.seen || []).filter((id) => valid.has(id)),
        opened: (f.opened || []).filter((id) => valid.has(id)),
      }));
    route.current = route.frames.at(-1)?.ids || [];
    route.round = route.frames.length;
    if (!valid.has(route.anchor))
      route.anchor = anchors[route.bias % 4] || sharedOpening[0];
    if (route.reply && !valid.has(route.reply.id)) route.reply = null;
    if (route.memeChoice && !valid.has(route.memeChoice.id)) route.memeChoice = null;
    route.exposures = Array(8).fill(0);
    for (const [id, count] of Object.entries(route.familiarity))
      route.exposures[byId(id).culture] += count;
    route.responses = Array(8).fill(0);
    route.dwell = Array(8).fill(0);
    for (const e of route.log || []) {
      const a = byId(e.id);
      if (!a || e.type !== 'interaction') continue;
      if (e.kind === 'dwell') route.dwell[a.culture] += e.seconds || 0;
      else if (e.kind !== 'skip') route.responses[a.culture]++;
    }
    route.collectionRevision = 'pinterest-20261030';
    update(route.comparison);
  }
  update(s);
  return s;
}
// A click can only slightly tilt selection; it never determines a feed branch.
export function answerQuestion(s, choice) {
  if (!['more', 'different', 'mix'].includes(choice)) return false;
  s.feedChoice = { choice, thread: s.currentThread, until: s.frames.length + 3 };
  log(s, 'feed-choice', { choice, thread: threads[s.currentThread]?.id, frames: 3 });
  return true;
}
export function answerMemeQuestion(s, id, prompt, options) {
  if (!options.includes(id) || !s.libraryIds.includes(id)) return false;
  s.memeChoice = { id, until: s.frames.length + 3 };
  s.memeAnswers ??= [];
  s.memeAnswers.push({ id, prompt, options: [...options], at: s.frames.length });
  log(s, 'meme-choice', {
    id,
    prompt,
    options: [...options],
    previousViews: s.familiarity[id] || 0,
    isAssessment: false,
  });
  return true;
}
export function recordFightWin(s, encounter) {
  const winner = encounter.state.winner,
    ids = encounter.state.fighters.map((f) => f.id);
  if (
    encounter.rewarded ||
    !winner ||
    !ids.includes(winner) ||
    !s.libraryIds.includes(winner)
  )
    return false;
  encounter.rewarded = true;
  s.battleWins ??= {};
  s.battleWins[winner] = (s.battleWins[winner] || 0) + 1;
  s.pendingWinner = winner;
  answerMemeQuestion(s, winner, 'who are you backing?', ids);
  log(s, 'fight-win', {
    id: winner,
    encounter: encounter.id,
    wins: s.battleWins[winner],
  });
  return true;
}
export function recordMediaReaction(s, encounter, id) {
  const post = reactionPost(encounter.postId);
  if (!post || !post.options.includes(id) || encounter.selected === id) return false;
  if (!answerMemeQuestion(s, id, 'your reaction?', post.options)) return false;
  encounter.selected = id;
  s.mediaReactions ??= [];
  s.mediaReactions.push({ postId: post.id, url: post.url, id, at: s.frames.length });
  log(s, 'media-reaction', { postId: post.id, id, url: post.url });
  return true;
}
function scheduleFight(s, frame) {
  let n = (s.seed ^ Math.imul(frame.index + 1, 2654435761)) >>> 0;
  const r = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  if (!Number.isInteger(s.nextFightAt))
    s.nextFightAt = frame.index + 3 + Math.floor(r() * 5);
  if (frame.index < s.nextFightAt) return;
  const pool = [...frame.ids],
    ids = [];
  while (ids.length < 3) ids.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  frame.encounter = {
    id: `${s.seed}:${frame.index}`,
    state: createFight(ids, n),
    recorded: false,
    rewarded: false,
    seen: false,
  };
  s.nextFightAt = frame.index + 7 + Math.floor(r() * 7);
}
function weightedPick(s, items) {
  let r = random(s) * items.reduce((n, x) => n + x.w, 0);
  for (const x of items) {
    r -= x.w;
    if (r <= 0) return x.id;
  }
  return items.at(-1).id;
}
export const frameDensity = (index) =>
  Math.min(10, 4 + Math.floor(Math.max(0, index) / 4));
export function nextFrame(s) {
  const index = s.frames.length;
  let ids = [...sharedOpening];
  if (index > 0) {
    const previous = s.currentThread,
      choice = s.feedChoice?.until > index ? s.feedChoice : null;
    const candidates = threads.map((t, i) => ({
      id: i,
      w:
        (i === previous ? 0.35 : 1) *
        (choice?.choice === 'more' && i === choice.thread
          ? 5
          : choice?.choice === 'different' && i === choice.thread
            ? 0.05
            : 1),
    }));
    s.currentThread = weightedPick(s, candidates);
    const topic = threads[s.currentThread];
    ids = [];
    while (ids.length < frameDensity(index)) {
      if (
        ids.length >= 2 &&
        s.pendingWinner &&
        library.some((a) => a.id === s.pendingWinner) &&
        !ids.includes(s.pendingWinner)
      ) {
        ids.push(s.pendingWinner);
        continue;
      }
      // Two connected images and two chances to wander into the wider collection.
      const pool =
        ids.length < 2 ? library.filter((a) => topic.ids.includes(a.id)) : library;
      const picks = pool
        .filter((a) => !ids.includes(a.id))
        .map((a) => {
          const recent = s.frames.slice(-2).some((f) => f.ids.includes(a.id));
          const clickTilt = 1 + Math.min(s.opened[a.id] || 0, 3) * 0.05;
          const choiceTilt =
            s.memeChoice?.until > index && s.memeChoice.id === a.id ? 1.1 : 1;
          const winnerTilt = 1 + Math.min(s.battleWins?.[a.id] || 0, 6) * 0.7;
          return {
            id: a.id,
            w: clickTilt * choiceTilt * winnerTilt * (recent ? 0.3 : 1),
          };
        });
      ids.push(weightedPick(s, picks));
    }
  }
  if (index > 0) s.pendingWinner = null;
  const frame = {
    index,
    ids,
    thread: index === 0 ? null : threads[s.currentThread].id,
    connection: '',
    seen: [],
    opened: [],
    created: s.elapsed,
  };
  scheduleFight(s, frame);
  scheduleReaction(s, frame);
  s.frames.push(frame);
  s.current = [...ids];
  s.round = s.frames.length;
  log(s, 'selection', {
    ids: [...ids],
    frame: index,
    reason:
      index === 0
        ? 'shared mixed opening'
        : 'two connected references plus a widening mix as scrolling continues; click influence capped at 15%',
    thread: frame.thread,
  });
  return frame;
}
export function recordView(s, frame, id, reason = 'visible in route') {
  if (!frame.ids.includes(id) || frame.seen.includes(id)) return false;
  frame.seen.push(id);
  expose(s, byId(id), reason);
  return true;
}
export function openReference(s, frame, id) {
  if (!frame.opened.includes(id)) frame.opened.push(id);
  interact(s, byId(id), 'open');
  expose(s, byId(id), 'opened at full size');
}
export function leaveFrame(s, frame) {
  for (const id of frame.seen)
    if (!frame.opened.includes(id)) interact(s, byId(id), 'skip');
}
export function viewCount(s) {
  return s.exposures.reduce((a, b) => a + b, 0);
}
export function chapter(s) {
  if (s.comparisonVisited) return 3;
  if (s.reply) return 2;
  if (s.frames.length >= 4 && viewCount(s) >= 10) return 1;
  return 0;
}
export function answerReply(s, id) {
  const prior = s.familiarity[id] || 0;
  s.reply = { id, prior, t: s.elapsed };
  interact(s, byId(id), 'reply');
  log(s, 'cultural-language', {
    id,
    previousViews: prior,
    context: 'reply to How was your day using an image',
    isAssessment: false,
  });
}
export function replyOptions(s) {
  const familiar =
    Object.entries(s.familiarity)
      .filter(([id]) => byId(id))
      .sort((a, b) => b[1] - a[1])[0]?.[0] || s.anchor;
  const other = library
    .filter((a) => routeOf(a) !== routeOf(byId(familiar)))
    .sort((a, b) => (s.familiarity[a.id] || 0) - (s.familiarity[b.id] || 0))[0].id;
  return [familiar, other];
}
export function makeOtherRoute(s) {
  const alt = newVisit((s.seed ^ 0x9e3779b9) >>> 0);
  alt.bias = (s.bias + 2) % 4;
  alt.anchor = anchors[alt.bias];
  alt.currentThread = alt.bias;
  alt.entered = true;
  for (let i = 0; i < 5; i++) {
    const frame = nextFrame(alt);
    for (const id of frame.ids) recordView(alt, frame, id, 'counterfactual simulation');
  }
  return alt;
}
export function visitOther(s) {
  if (!s.comparison) s.comparison = makeOtherRoute(s);
  s.comparisonVisited = true;
  log(s, 'different-route', { seed: s.comparison.seed, simulated: true });
  return s.comparison;
}
export function evidence(s) {
  const anchor =
    Object.entries(s.familiarity).sort((a, b) => b[1] - a[1])[0]?.[0] || s.anchor;
  const events = s.log.filter((e) => e.type === 'exposure' && e.id === anchor),
    firstOpen = s.log.findIndex(
      (e) => e.type === 'interaction' && e.kind === 'open' && e.id === anchor,
    );
  const beforeOpen = s.log
    .slice(0, firstOpen < 0 ? undefined : firstOpen)
    .filter((e) => e.type === 'exposure' && e.id === anchor).length;
  const seen = new Set(Object.keys(s.familiarity)),
    other = s.comparison;
  const shared = other
    ? Object.keys(other.familiarity).filter((id) => seen.has(id)).length
    : 0;
  return {
    anchor,
    anchorViews: events.length,
    beforeOpen,
    opened: firstOpen >= 0,
    reply: s.reply,
    shared,
    unique: seen.size,
    views: viewCount(s),
    unseen: library.filter((a) => !seen.has(a.id)).length,
  };
}
