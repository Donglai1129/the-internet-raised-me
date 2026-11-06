import { artifacts, byId, cultures, total } from './engine.js?v=pins20261030';
export function analyze(s) {
  const available = s.libraryIds ? s.libraryIds.map(byId).filter(Boolean) : artifacts;
  const exposures = s.log.filter((e) => e.type === 'exposure' && byId(e.id));
  const unique = Object.keys(s.familiarity).filter(byId),
    views = total(s),
    repeats = Math.max(0, views - unique.length);
  const dwell = {};
  let skipped = 0;
  for (const e of s.log) {
    if (e.type === 'interaction' && e.kind === 'dwell')
      dwell[e.id] = (dwell[e.id] || 0) + e.seconds;
    if (e.type === 'interaction' && e.kind === 'skip') skipped++;
  }
  const attention = Object.entries(dwell)
    .filter(([id, n]) => byId(id) && n > 0)
    .sort((a, b) => b[1] - a[1]);
  const n = Math.min(10, Math.floor(exposures.length / 2));
  const distribution = (list) =>
    cultures.map(
      (_, i) => list.filter((e) => byId(e.id).culture === i).length / (list.length || 1),
    );
  const first = distribution(exposures.slice(0, n)),
    last = distribution(exposures.slice(-n));
  const shifts = last
    .map((share, i) => ({
      culture: i,
      first: first[i],
      last: share,
      change: share - first[i],
    }))
    .sort((a, b) => b.change - a.change);
  let longest = 0,
    run = 0,
    previous = null,
    longestCulture = null;
  for (const e of exposures) {
    const c = byId(e.id).culture;
    run = c === previous ? run + 1 : 1;
    if (run > longest) {
      longest = run;
      longestCulture = c;
    }
    previous = c;
  }
  const passive = unique
    .filter((id) => s.familiarity[id] >= 2 && !s.opened[id])
    .sort((a, b) => s.familiarity[b] - s.familiarity[a]);
  const kindCounts = {};
  for (const e of exposures) {
    const kind = byId(e.id).kind || 'meme';
    kindCounts[kind] = (kindCounts[kind] || 0) + 1;
  }
  const opened = cultures.map((_, i) =>
    Object.entries(s.opened).reduce(
      (n, [id, count]) => n + (byId(id)?.culture === i ? count : 0),
      0,
    ),
  );
  return {
    views,
    unique: unique.length,
    library: available.length,
    repeats,
    repeatRate: views ? repeats / views : 0,
    coverage: unique.length / available.length,
    opened: opened.reduce((a, b) => a + b, 0),
    openedByCulture: opened,
    shownByCulture: [...s.exposures],
    dwellSeconds: Object.values(dwell).reduce((a, b) => a + b, 0),
    attention,
    skipped,
    first,
    last,
    sampleSize: n,
    shift: n >= 4 ? shifts[0] : null,
    longest,
    longestCulture,
    passive,
    kindCounts,
    unseen: available.filter((a) => !s.familiarity[a.id]).map((a) => a.id),
    timeline: exposures.map((e) => ({ id: e.id, culture: byId(e.id).culture, t: e.t })),
    connections: s.log.filter(
      (e) => e.type === 'related-link' && byId(e.from) && byId(e.to),
    ),
  };
}
export function timeLabel(seconds) {
  return seconds >= 60 ? `${Math.floor(seconds / 60)}m ${seconds % 60}s` : `${seconds}s`;
}
