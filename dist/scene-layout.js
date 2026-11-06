import { byId } from './engine.js?v=pins20261030';

function randomStream(text) {
  let n = 2166136261;
  for (const c of text) {
    n ^= c.charCodeAt(0);
    n = Math.imul(n, 16777619);
  }
  return () => {
    n = (Math.imul(n, 1664525) + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
function overlap(a, b) {
  const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return (w * h) / Math.min(a.w * a.h, b.w * b.h);
}
function arrange(frame, seed, mobile) {
  const rand = randomStream(JSON.stringify([seed, frame.index, frame.ids, mobile]));
  const width = mobile ? 320 : 1000,
    height = mobile ? Math.max(760, frame.ids.length * 105 + 120) : 740;
  const placed = [];
  for (const id of frame.ids) {
    const a = byId(id),
      ratio = a.width / a.height;
    let w = mobile
        ? 115 + rand() * 90
        : 150 + rand() * (frame.ids.length > 6 ? 155 : 220),
      h = w / ratio;
    const maxHeight = mobile ? 220 : 320;
    if (h > maxHeight) {
      w *= maxHeight / h;
      h = maxHeight;
    }
    let best = null,
      least = Infinity;
    for (let trial = 0; trial < 160; trial++) {
      const rect = {
        id,
        x: 12 + rand() * (width - w - 24),
        y: 85 + rand() * (height - h - 110),
        w,
        h,
      };
      const collision = placed.reduce((n, r) => Math.max(n, overlap(rect, r)), 0);
      if (collision < least) {
        least = collision;
        best = rect;
      }
      if (collision < 0.18) break;
    }
    placed.push(best);
  }
  return {
    height,
    items: placed.map((r) => ({ ...r, x: (r.x / width) * 100, w: (r.w / width) * 100 })),
  };
}
// Independent, repeatable layouts: rendering never advances the recommendation RNG.
export function buildSceneLayout(frame, seed) {
  const desktop = arrange(frame, seed, false),
    mobile = arrange(frame, seed, true);
  return {
    height: desktop.height,
    mobileHeight: mobile.height,
    items: desktop.items.map((r, i) => ({ ...r, mobile: mobile.items[i] })),
  };
}
