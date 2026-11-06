import { analyze, timeLabel } from './analytics.js?v=pins20261030';
import { byId, cultures } from './engine.js?v=pins20261030';
function text(ctx, content, x, y, width, size = 21, color = '#111') {
  ctx.font = `${size}px Arial`;
  ctx.fillStyle = color;
  let line = '',
    cursor = y;
  for (const word of String(content).split(/\s+/)) {
    if (line && ctx.measureText(line + ' ' + word).width > width) {
      ctx.fillText(line, x, cursor);
      cursor += size * 1.4;
      line = word;
    } else line += (line ? ' ' : '') + word;
  }
  if (line) ctx.fillText(line, x, cursor);
  return cursor + size * 1.4;
}
export function appendCredits(canvas, ids) {
  const sources = [...new Set(ids)]
    .map(byId)
    .filter((a) => a?.source.kind === 'Wikimedia Commons');
  if (!sources.length) return canvas;
  const result = document.createElement('canvas');
  result.width = canvas.width;
  result.height = canvas.height + 60 + sources.length * 240;
  const ctx = result.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, result.width, result.height);
  ctx.drawImage(canvas, 0, 0);
  text(
    ctx,
    'Image credits / individual source licenses apply',
    35,
    canvas.height + 30,
    result.width - 70,
    14,
  );
  let y = canvas.height + 57;
  for (const a of sources) {
    const source = a.source;
    y = text(
      ctx,
      `${a.title} — ${source.creator} / ${source.license}`,
      35,
      y,
      result.width - 70,
      12,
    );
    y = text(
      ctx,
      `${source.url} / ${source.licenseUrl || ''}`,
      35,
      y,
      result.width - 70,
      11,
      '#555',
    );
    y =
      text(
        ctx,
        source.changes || 'Unmodified source image.',
        35,
        y,
        result.width - 70,
        10,
        '#555',
      ) + 10;
  }
  const trimmed = document.createElement('canvas');
  trimmed.width = result.width;
  trimmed.height = Math.ceil(y + 25);
  trimmed.getContext('2d').drawImage(result, 0, 0);
  return trimmed;
}
export async function renderHistory(s) {
  const data = analyze(s),
    canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 2050;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 1600, 2050);
  text(ctx, 'the internet raised me', 65, 80, 1400, 42);
  text(
    ctx,
    `Your visit / ${s.seed.toString(16).toUpperCase()} / ${s.round} batches`,
    65,
    125,
    1400,
    17,
    '#555',
  );
  const facts = [
    [data.views, 'content views'],
    [data.unique, `different items / ${data.library} in library`],
    [Math.round(data.repeatRate * 100) + '%', 'repeat views'],
    [timeLabel(data.dwellSeconds), 'time in opened content'],
  ];
  facts.forEach(([value, label], i) => {
    text(ctx, value, 65 + i * 385, 225, 350, 56);
    text(ctx, label, 65 + i * 385, 265, 350, 17, '#555');
  });
  text(ctx, 'What reached you / what you opened', 65, 350, 1400, 28);
  const max = Math.max(1, ...data.shownByCulture, ...data.openedByCulture);
  cultures.forEach((c, i) => {
    const y = 410 + i * 58;
    text(ctx, c.name, 65, y, 360, 18);
    ctx.fillStyle = `rgb(${c.color})`;
    ctx.fillRect(435, y - 17, (850 * data.shownByCulture[i]) / max, 16);
    ctx.fillStyle = '#111';
    ctx.fillRect(435, y + 6, (850 * data.openedByCulture[i]) / max, 4);
    text(
      ctx,
      `${data.shownByCulture[i]} shown / ${data.openedByCulture[i]} opened`,
      1310,
      y,
      245,
      14,
    );
  });
  text(ctx, 'Your exposure path', 65, 930, 1400, 28);
  data.timeline.slice(-100).forEach((e, i) => {
    ctx.fillStyle = `rgb(${cultures[e.culture].color})`;
    ctx.fillRect(65 + (i % 50) * 29, 965 + Math.floor(i / 50) * 25, 25, 19);
  });
  text(
    ctx,
    'Each mark is one recorded content view, left to right. Colors match the groups above.',
    65,
    1045,
    1400,
    15,
    '#555',
  );
  const shift =
    data.shift && data.shift.change > 0
      ? `${cultures[data.shift.culture].name} grew from ${Math.round(data.shift.first * 100)}% of your first ${data.sampleSize} views to ${Math.round(data.shift.last * 100)}% of your latest ${data.sampleSize}.`
      : 'Keep browsing to compare your early and recent mix.';
  text(ctx, shift, 65, 1130, 1400, 25);
  text(
    ctx,
    `Longest same-group run: ${data.longest} views. ${data.skipped} passed over before Show more. ${data.unseen.length} library items never reached you.`,
    65,
    1220,
    1400,
    21,
  );
  text(
    ctx,
    data.attention.length ? 'What held your attention' : 'What kept appearing',
    65,
    1320,
    1400,
    28,
  );
  const top = data.attention.length
    ? data.attention
        .slice(0, 5)
        .map(([id, seconds]) => ({ id, label: timeLabel(seconds) }))
    : Object.entries(s.familiarity)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id, n]) => ({ id, label: `shown ${n} times` }));
  const images = await Promise.all(
    top.map(async (item) => {
      const image = new Image();
      image.src = byId(item.id).image;
      try {
        await image.decode();
        return image;
      } catch {
        return null;
      }
    }),
  );
  top.forEach((item, i) => {
    const image = images[i],
      x = 65 + i * 300;
    if (image) {
      const scale = Math.min(265 / image.width, 260 / image.height);
      ctx.drawImage(image, x, 1370, image.width * scale, image.height * scale);
    }
    text(ctx, item.label, x, 1670, 270, 17);
    text(ctx, byId(item.id).title, x, 1700, 270, 14, '#555');
  });
  text(
    ctx,
    'A record of the environment you encountered — not a diagnosis of who you are.',
    65,
    1870,
    1400,
    21,
  );
  text(
    ctx,
    'If the internet is raising a generation, who are we becoming?',
    65,
    1930,
    1400,
    28,
  );
  return appendCredits(
    canvas,
    top.map((a) => a.id),
  );
}
