export { artifacts } from './catalog.js?v=pins20261030';
import { artifacts } from './catalog.js?v=pins20261030';
export const cultures = [
  { id: 'bro', name: 'alpha / reaction edits', color: [76, 141, 70] },
  { id: 'remix', name: 'absurd / remixed images', color: [115, 88, 180] },
  { id: 'language', name: 'reactions / internet language', color: [82, 123, 133] },
  { id: 'dream', name: 'nostalgia / dream imagery', color: [83, 131, 208] },
  { id: 'web', name: 'personal web / digital artifacts', color: [23, 57, 173] },
  { id: 'music', name: 'music / fandom', color: [177, 103, 175] },
  { id: 'community', name: 'gaming / online communities', color: [81, 143, 86] },
  { id: 'habits', name: 'platforms / attention habits', color: [187, 94, 68] },
];
export const opening = [
  'blue-wolf',
  'download',
  'culture-profile-online',
  'culture-playlist-night',
  'culture-brb',
];
export function migrateState(s) {
  if (!s || s.version !== 2) return null;
  for (const key of ['exposures', 'responses', 'dwell', 'weights']) {
    if (!Array.isArray(s[key])) return null;
    while (s[key].length < cultures.length) s[key].push(key === 'weights' ? 1 : 0);
  }
  return s;
}
export const byId = (id) => artifacts.find((a) => a.id === id);
export function random(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
export function createState(seed) {
  return {
    version: 2,
    seed,
    rng: seed,
    exposures: Array(8).fill(0),
    responses: Array(8).fill(0),
    dwell: Array(8).fill(0),
    weights: Array(8).fill(1),
    familiarity: {},
    opened: {},
    skips: {},
    log: [],
    round: 0,
    current: [],
    signals: [],
    elapsed: 0,
    nudge: seed % 8,
  };
}
export const total = (s) => s.exposures.reduce((a, b) => a + b, 0);
export const stage = (s) =>
  total(s) < 10 ? 0 : total(s) < 22 ? 1 : total(s) < 38 ? 2 : 3;
export function log(s, type, data) {
  s.log.push({ n: s.log.length, t: s.elapsed, type, ...data });
}
export function reinforce(s) {
  const sum = total(s) || 1;
  s.weights = s.exposures.map(
    (v, i) =>
      0.5 +
      Math.pow(
        1 + (v / sum) * 4 + s.responses[i] * 0.1 + Math.min(s.dwell[i], 240) * 0.006,
        1 + Math.min(sum / 65, 1),
      ) +
      (s.round > 1 && i === s.nudge ? 2.4 : 0),
  );
  log(s, 'recommendation', { weights: [...s.weights], systemNudge: s.nudge });
}
export function expose(s, a, reason) {
  s.exposures[a.culture]++;
  s.familiarity[a.id] = (s.familiarity[a.id] || 0) + 1;
  log(s, 'exposure', { id: a.id, culture: a.culture, reason });
  reinforce(s);
}
export function interact(s, a, kind, seconds = 0) {
  if (kind === 'skip') {
    s.skips[a.id] = (s.skips[a.id] || 0) + 1;
  } else if (kind === 'dwell') {
    s.dwell[a.culture] += seconds;
  } else {
    s.responses[a.culture]++;
    if (kind === 'open') s.opened[a.id] = (s.opened[a.id] || 0) + 1;
  }
  log(s, 'interaction', { id: a.id, kind, seconds });
  if (kind !== 'skip') reinforce(s);
}
export function choose(s, exclude = [], predicate = () => true) {
  const eligible = artifacts.filter((a) => !exclude.includes(a.id) && predicate(a));
  const groups = cultures.map((c, i) => eligible.filter((a) => a.culture === i));
  const weights = groups.map((g, i) => (g.length ? s.weights[i] : 0));
  let r = random(s) * weights.reduce((a, b) => a + b, 0),
    i = 0;
  while (i < weights.length - 1 && r >= weights[i]) r -= weights[i++];
  const list = groups[i].length ? groups[i] : eligible;
  return list[Math.floor(random(s) * list.length)];
}
export function next(s) {
  s.round++;
  reinforce(s);
  const ids = s.round === 1 ? [...opening] : [];
  while (ids.length < 5) {
    const needCulture =
      ids.length >= 3 && ids.filter((id) => byId(id).kind !== 'meme').length < 2;
    ids.push(choose(s, ids, needCulture ? (a) => a.kind !== 'meme' : () => true).id);
  }
  s.current = ids;
  log(s, 'selection', {
    ids: [...ids],
    weights: [...s.weights],
    reason:
      s.round === 1
        ? 'shared mixed-culture opening'
        : 'weighted recommendations; at least two non-meme references',
  });
  return ids.map(byId);
}
export function evolution(s) {
  const sum = total(s) || 1,
    p = s.exposures.map((x) => x / sum),
    strength = Math.min(total(s) / 50, 1),
    dominant = p.indexOf(Math.max(...p));
  const ranked = Object.entries(s.familiarity).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  return {
    p,
    strength,
    dominant,
    color: [0, 1, 2].map((k) =>
      Math.round(cultures.reduce((v, c, i) => v + c.color[k] * p[i], 0)),
    ),
    density: Math.min(3, Math.floor(total(s) / 14)),
    repeat: ranked.filter((x) => x[1] >= 2).map((x) => x[0]),
    lead: ranked[0]?.[0] || null,
    scale: 1 + p[2] * strength * 0.13,
    layout: Math.floor((s.round - 1) / 2) % 3,
  };
}
export function snapshot(s) {
  return { ids: [...s.current], evolution: evolution(s), round: s.round };
}
