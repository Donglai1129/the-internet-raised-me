import { reactionPost, isVideoPost } from './reaction-posts.js?v=useronly1';
import { byId } from './engine.js?v=pins20261030';
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
export function mountReaction(
  root,
  encounter,
  { onSeen = () => {}, onPick = () => {} } = {},
) {
  const post = reactionPost(encounter.postId);
  if (!post) return { dispose() {} };
  root.className = `reaction-page reaction-${post.kind}`;
  root.setAttribute('aria-label', post.title);
  root.innerHTML = `<div class="reaction-content"><div class="reaction-source"><a href="${post.profile || post.url}" target="_blank" rel="noopener noreferrer">${esc(post.credit)}</a></div><div class="reaction-player"></div><a class="reaction-original" href="${post.url}" target="_blank" rel="noopener noreferrer">open original ↗</a></div><div class="reaction-answer"><p>your reaction?</p><div class="reaction-options">${post.options
    .map((id) => {
      const a = byId(id);
      return `<button type="button" data-reaction="${id}" aria-label="React with ${esc(a.title)}" aria-pressed="${encounter.selected === id}"><img src="${a.image}" alt="${esc(a.alt)}" loading="lazy"></button>`;
    })
    .join('')}</div><span class="reaction-status" role="status"></span></div>`;
  const player = root.querySelector('.reaction-player');
  let playing = false;
  function cover() {
    playing = false;
    player.innerHTML = isVideoPost(post)
      ? `<img class="reaction-poster" src="${post.thumbnail}" alt="${esc(post.title)}" loading="lazy">`
      : `<div class="reaction-quote"><q>${esc((post.quote || post.fallback || post.title).replace(/[“”]/g, ''))}</q><small>${esc(post.quoteCredit || post.credit)}</small></div>`;
  }
  function play() {
    if (playing) return;
    playing = true;
    player.innerHTML = `<iframe title="${esc(post.title)}" src="${post.embed}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  }
  cover();
  root.querySelectorAll('[data-reaction]').forEach(
    (button) =>
      (button.onclick = () => {
        const id = button.dataset.reaction;
        if (encounter.selected === id) return;
        if (onPick(id, post) === false) return;
        encounter.selected = id;
        paint();
      }),
  );
  function paint() {
    root
      .querySelectorAll('[data-reaction]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.reaction === encounter.selected)),
      );
    root.querySelector('.reaction-status').textContent = encounter.selected ? '✓' : '';
  }
  paint();
  let visible = false;
  function sync() {
    if (visible && !document.hidden) play();
    else if (playing) cover();
  }
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        visible = e.isIntersecting && e.intersectionRatio >= 0.35;
        if (visible && !encounter.seen) {
          encounter.seen = true;
          onSeen(post.options);
        }
        sync();
      }
    },
    { threshold: 0.35 },
  );
  observer.observe(root);
  document.addEventListener('visibilitychange', sync);
  return {
    dispose() {
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      player.innerHTML = '';
    },
  };
}
