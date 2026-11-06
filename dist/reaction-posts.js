// Only the three video links supplied by the user.
export const reactionPosts = [
  {
    id: 'italian-squid-game',
    kind: 'short',
    title: 'italian brainrot squid game',
    credit: '@bigstaranimation · YouTube',
    selectedBy: 'visitor collection',
    url: 'https://www.youtube.com/shorts/-7lV0SgPsB8',
    embed:
      'https://www.youtube-nocookie.com/embed/-7lV0SgPsB8?rel=0&autoplay=1&mute=1&playsinline=1&loop=1&playlist=-7lV0SgPsB8',
    thumbnail: 'https://i.ytimg.com/vi/-7lV0SgPsB8/hqdefault.jpg',
    options: ['pin-brains-shrinking', 'pin-so-peak', 'pin-were-cooked'],
  },
  {
    id: 'low-quality-roblox',
    kind: 'video',
    title: 'low quality roblox memes',
    credit: 'Bacon Hug · YouTube',
    selectedBy: 'visitor collection',
    url: 'https://www.youtube.com/watch?v=GqZ5bunhiFs',
    embed:
      'https://www.youtube-nocookie.com/embed/GqZ5bunhiFs?rel=0&autoplay=1&mute=1&playsinline=1&loop=1&playlist=GqZ5bunhiFs',
    thumbnail: 'https://i.ytimg.com/vi/GqZ5bunhiFs/hqdefault.jpg',
    options: ['pin-play-roblox', 'pin-crying-prayer', 'pin-roblox-grass'],
  },
  {
    id: 'second-date-subway',
    kind: 'short',
    title: 'second date update / subway surfers',
    credit: '@islampak360 · YouTube',
    selectedBy: 'visitor collection',
    url: 'https://www.youtube.com/shorts/mgoHCuZYFEQ',
    embed:
      'https://www.youtube-nocookie.com/embed/mgoHCuZYFEQ?rel=0&autoplay=1&mute=1&playsinline=1&loop=1&playlist=mgoHCuZYFEQ',
    thumbnail: 'https://i.ytimg.com/vi/mgoHCuZYFEQ/hqdefault.jpg',
    options: ['pin-damn-crazy', 'pin-stop-hand', 'pin-close-up-reaction'],
  },
];
export const reactionPost = (id) => reactionPosts.find((p) => p.id === id);
export const isVideoPost = (post) => ['vine', 'video', 'short'].includes(post.kind);
export const MEDIA_REVISION = 'user-only-20261030';
// Keep the shuffle independent of photo sampling and stable across reloads.
function refillQueue(s, r) {
  const ids = reactionPosts.map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  const last = s.frames.filter((f) => f.reaction).at(-1)?.reaction.postId;
  if (ids[0] === last) [ids[0], ids[1]] = [ids[1], ids[0]];
  return ids;
}
// Remove withdrawn embeds from saved pages as well as future shuffles.
export function sanitizeMediaHistory(s) {
  if (!s) return;
  const valid = new Set(reactionPosts.map((p) => p.id));
  for (const frame of s.frames || [])
    if (frame.reaction && !valid.has(frame.reaction.postId)) delete frame.reaction;
  s.mediaQueue = (s.mediaQueue || []).filter((id) => valid.has(id));
  s.mediaReactions = (s.mediaReactions || []).filter((e) => valid.has(e.postId));
  s.log = (s.log || []).filter((e) => !e.postId || valid.has(e.postId));
  if (s.mediaRevision !== MEDIA_REVISION) {
    s.mediaQueue = [];
    s.mediaRevision = MEDIA_REVISION;
  }
  sanitizeMediaHistory(s.comparison);
}
export function scheduleReaction(s, frame) {
  let n = (s.seed ^ Math.imul(frame.index + 1, 2246822519)) >>> 0;
  const r = () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
  if (!Number.isInteger(s.nextReactionAt))
    s.nextReactionAt = frame.index + 2 + Math.floor(r() * 2);
  if (frame.index < s.nextReactionAt || frame.encounter) return;
  if (s.mediaRevision !== MEDIA_REVISION) {
    s.mediaRevision = MEDIA_REVISION;
    s.mediaQueue = [];
  }
  if (!s.mediaQueue?.length) s.mediaQueue = refillQueue(s, r);
  const postId = s.mediaQueue.shift();
  frame.reaction = {
    id: `media:${s.seed}:${frame.index}`,
    postId,
    selected: null,
    seen: false,
  };
  s.mediaPageCount = (s.mediaPageCount || 0) + 1;
  s.nextReactionAt = frame.index + 4 + Math.floor(r() * 4);
}
