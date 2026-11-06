import { byId, cultures } from './engine.js?v=pins20261030';
import { palettes } from './palettes.js?v=pins20261030';

// Drawing uses an independent random stream and cannot alter the feed.
function hash(text) {
  let value = 2166136261;
  for (const char of text) {
    value ^= char.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}
function stream(seed) {
  let n = seed;
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
const mix = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
const rgb = (c) => `rgb(${c.join(',')})`;
export function portraitStats(s) {
  const dwell = {},
    choices = {};
  for (const event of s.log)
    if (event.type === 'interaction' && event.kind === 'dwell')
      dwell[event.id] = (dwell[event.id] || 0) + event.seconds;
  for (const answer of s.memeAnswers || [])
    choices[answer.id] = (choices[answer.id] || 0) + 1;
  return [...new Set([...Object.keys(s.familiarity), ...Object.keys(choices)])]
    .filter((id) => byId(id) && ((s.familiarity[id] || 0) > 0 || choices[id]))
    .map((id) => {
      const views = s.familiarity[id] || 0,
        opens = s.opened[id] || 0,
        chosen = choices[id] || 0;
      return {
        id,
        views,
        opens,
        chosen,
        dwell: dwell[id] || 0,
        skips: s.skips[id] || 0,
        score: views * 1.25 + opens * 2 + Math.log1p(dwell[id] || 0) * 1.5 + chosen * 6,
      };
    });
}
function overlap(a, b) {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)),
    h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (w * h) / Math.min(a.w * a.h, b.w * b.h);
}
export function buildPortraitPlan(s) {
  const stats = portraitStats(s),
    path = s.log
      .filter((e) => ['exposure', 'interaction', 'meme-choice'].includes(e.type))
      .map((e) => [e.type, e.id, e.kind, e.seconds, e.prompt]);
  const seed = hash(JSON.stringify({ seed: s.seed, stats, path })),
    rand = stream(seed),
    width = 1600,
    height = 1200;
  const total = stats.reduce((n, a) => n + a.views, 0),
    repeats =
      stats.reduce((n, a) => n + Math.max(0, a.views - 1), 0) / Math.max(1, total);
  const opens = stats.reduce((n, a) => n + a.opens, 0),
    choiceCount = stats.reduce((n, a) => n + a.chosen, 0);
  const layout = choiceCount
    ? 'clusters'
    : opens / Math.max(1, stats.length) > 0.4
      ? 'trail'
      : repeats > 0.6
        ? 'orbit'
        : 'scatter';
  const ranked = [...stats].sort((a, b) => b.score - a.score),
    max = Math.max(1, ...stats.map((a) => a.score));
  const colors = ranked
    .slice(0, 5)
    .flatMap((a) =>
      (palettes[a.id] || [cultures[byId(a.id).culture].color]).slice(0, a.chosen ? 2 : 1),
    );
  const accent = colors[0] || [70, 90, 140],
    secondary =
      colors.find((c) => c.reduce((n, v, i) => n + Math.abs(v - accent[i]), 0) > 100) ||
      mix(accent, [130, 150, 180], 0.5);
  const background = mix(accent, [255, 255, 255], 0.78),
    paper = mix(secondary, [255, 255, 255], 0.88),
    ink = mix(accent, [0, 0, 0], 0.7);
  const selected = stats
    .map((a) => ({ ...a, selection: a.score * (0.9 + rand() * 0.2) }))
    .sort((a, b) => b.selection - a.selection)
    .slice(0, Math.min(18, 8 + Math.ceil(stats.length * 0.35)));
  // Sequence positions preserve a trace of the order in which images appeared.
  const sequence = new Map();
  s.log
    .filter((e) => e.type === 'exposure')
    .forEach((e, i) => {
      if (!sequence.has(e.id)) sequence.set(e.id, i);
    });
  const last = Math.max(1, ...sequence.values());
  const anchors = Array.from({ length: cultures.length }, () => ({
    x: 280 + rand() * 1000,
    y: 230 + rand() * 680,
  }));
  const items = [];
  const order = selected.sort((a, b) => a.score - b.score);
  for (const entry of order) {
    const a = byId(entry.id),
      importance = Math.sqrt(entry.score / max),
      side = 115 + importance * 260 + Math.min(entry.chosen, 2) * 28 + rand() * 60,
      ratio = a.width / a.height;
    const w = ratio >= 1 ? side : side * ratio,
      h = ratio >= 1 ? side / ratio : side,
      anchor = anchors[a.culture];
    let best = null,
      bestOverlap = Infinity;
    for (let n = 0; n < 100; n++) {
      let cx, cy;
      if (layout === 'clusters') {
        cx = anchor.x + (rand() - 0.5) * 600;
        cy = anchor.y + (rand() - 0.5) * 560;
      } else if (layout === 'trail') {
        const t = (sequence.get(entry.id) || 0) / last;
        cx = 180 + t * 1200 + (rand() - 0.5) * 320;
        cy = 300 + Math.sin(t * Math.PI * 2) * 210 + rand() * 330;
      } else if (layout === 'orbit') {
        const angle = rand() * Math.PI * 2,
          radius = 170 + rand() * 380;
        cx = 800 + Math.cos(angle) * radius * 1.35;
        cy = 620 + Math.sin(angle) * radius * 0.8;
      } else {
        cx = 90 + rand() * 1420;
        cy = 190 + rand() * 850;
      }
      const rect = {
        x: Math.max(28, Math.min(width - w - 28, cx - w / 2)),
        y: Math.max(150, Math.min(height - h - 90, cy - h / 2)),
        w,
        h,
      };
      const collision = items.reduce(
        (worst, other) => Math.max(worst, overlap(rect, other)),
        0,
      );
      if (collision < bestOverlap) {
        best = rect;
        bestOverlap = collision;
      }
      if (collision < (entry.chosen ? 0.3 : 0.18)) break;
    }
    items.push({ ...entry, ...best, echo: false });
  }
  const echoes = selected
    .filter((a) => a.views >= 3)
    .sort((a, b) => b.views - a.views)
    .slice(0, Math.min(7, Math.ceil(repeats * 8)))
    .map((entry) => {
      const a = byId(entry.id),
        side = 48 + rand() * 55,
        ratio = a.width / a.height;
      return {
        ...entry,
        x: 30 + rand() * (width - side - 60),
        y: 155 + rand() * (height - side - 250),
        w: ratio >= 1 ? side : side * ratio,
        h: ratio >= 1 ? side / ratio : side,
        echo: true,
      };
    });
  return {
    width,
    height,
    seed,
    layout,
    color: accent,
    palette: { background, paper, accent, secondary, ink },
    repeats,
    choiceCount,
    items: [...echoes, ...items],
    stats,
  };
}
export async function renderPortrait(s, plan = buildPortraitPlan(s)) {
  const canvas = document.createElement('canvas');
  canvas.width = plan.width;
  canvas.height = plan.height;
  const ctx = canvas.getContext('2d'),
    p = plan.palette;
  ctx.fillStyle = rgb(p.background);
  ctx.fillRect(0, 0, plan.width, plan.height);
  // Color fields come from the visitor's encountered images. Only the export is colored.
  const wash = ctx.createLinearGradient(0, 0, plan.width, plan.height);
  wash.addColorStop(0, rgb(p.paper));
  wash.addColorStop(0.6, rgb(p.background));
  wash.addColorStop(1, rgb(mix(p.secondary, [255, 255, 255], 0.62)));
  ctx.fillStyle = wash;
  ctx.fillRect(0, 0, plan.width, plan.height);
  const images = new Map();
  await Promise.all(
    [...new Set(plan.items.map((a) => a.id))].map(async (id) => {
      const image = new Image();
      image.src = byId(id).image;
      try {
        await image.decode();
        images.set(id, image);
      } catch {}
    }),
  );
  for (const item of plan.items) {
    const image = images.get(item.id);
    if (!image) continue;
    if (item.chosen && !item.echo) {
      ctx.fillStyle = rgb(p.accent);
      ctx.fillRect(item.x - 6, item.y - 6, item.w + 12, item.h + 12);
    }
    ctx.drawImage(image, item.x, item.y, item.w, item.h);
  }
  return canvas;
}
