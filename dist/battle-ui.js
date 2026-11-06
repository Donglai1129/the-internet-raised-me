import { byId } from './engine.js?v=pins20261030';
import { powerUp, fightBeat } from './fight-engine.js?v=1';
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
function limbs() {
  return `<svg viewBox="0 0 300 290" aria-hidden="true"><ellipse class="shadow" cx="150" cy="265" rx="65" ry="9"/><g class="arm-left"><path d="M88 120 L55 103 L32 122 M32 122 l-10 -7 M32 122 l-10 4 M32 122 l-4 12"/></g><g class="arm-right"><path d="M212 120 L246 91 L265 105 M265 105 l11 -7 M265 105 l11 4 M265 105 l3 12"/></g><g class="leg-left"><path d="M125 187 L108 223 L85 255 L65 255"/></g><g class="leg-right"><path d="M175 187 L190 221 L209 255 L232 255"/></g><path class="floor" d="M35 275 H265"/></svg>`;
}
export function mountBattle(root, encounter, { onUpdate, onWin, onSeen, canRun }) {
  const state = encounter.state,
    ids = state.fighters.map((f) => f.id),
    timers = new Set();
  let visible = false,
    disposed = false,
    reported = Boolean(encounter.recorded);
  root.innerHTML = `<p class="battle-instruction">click a meme. give it power.</p><div class="battle-arena">${ids
    .map((id, i) => {
      const a = byId(id);
      return `<button class="fighter" data-fighter="${id}" style="--x:${[20, 50, 80][i]}%;--y:${[54, 45, 54][i]}%" aria-label="Power up ${esc(a.title)}"><span class="rig">${limbs()}<span class="meme-body"><img src="${a.image}" alt="${esc(a.alt)}" draggable="false"></span></span><span class="fighter-label">${esc(a.title)}</span><span class="health" role="meter" aria-label="Health of ${esc(a.title)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"><i></i></span><span class="power-label">+ power</span></button>`;
    })
    .join(
      '',
    )}</div><div class="battle-result" role="status" aria-live="polite"></div><div class="battle-saved"></div>`;
  const el = (id) => root.querySelector(`[data-fighter="${id}"]`);
  function transient(node, cls, time = 240) {
    node.classList.remove(cls);
    void node.offsetWidth;
    node.classList.add(cls);
    const t = setTimeout(() => {
      node.classList.remove(cls);
      timers.delete(t);
    }, time);
    timers.add(t);
  }
  function animateHit() {
    if (!state.lastHit) return;
    const from = el(state.lastHit.from),
      to = el(state.lastHit.to),
      dx = to.offsetLeft - from.offsetLeft,
      dy = to.offsetTop - from.offsetTop,
      len = Math.hypot(dx, dy) || 1;
    from.style.setProperty('--lunge-x', `${(dx / len) * 70}px`);
    from.style.setProperty('--lunge-y', `${(dy / len) * 70}px`);
    transient(from, 'striking', 260);
    transient(to, 'hit', 200);
  }
  function paint() {
    for (const f of state.fighters) {
      const b = el(f.id);
      b.classList.toggle('chosen', f.id === state.chosen);
      b.classList.toggle('out', f.hp === 0);
      b.classList.toggle('champion', f.id === state.winner);
      b.disabled = Boolean(state.winner) || f.hp === 0;
      b.querySelector('.health').setAttribute('aria-valuenow', f.hp);
      b.querySelector('.health>i').style.width = f.hp + '%';
      b.querySelector('.power-label').textContent =
        f.hp === 0
          ? 'out'
          : f.id === state.winner
            ? 'winner ↑'
            : f.power
              ? `power ${f.power} ↑`
              : '+ power';
    }
    root.querySelector('.battle-instruction').textContent = state.winner
      ? ''
      : state.chosen
        ? 'keep clicking your meme.'
        : 'click a meme. give it power.';
    if (state.winner) {
      root.querySelector('.battle-result').textContent =
        byId(state.winner).title + ' wins';
      if (!reported) {
        reported = true;
        onWin(encounter, state.winner);
      } else if (encounter.recorded) {
        root.querySelector('.battle-saved').textContent = 'saved ↑';
      }
    }
  }
  root.querySelectorAll('.fighter').forEach(
    (b) =>
      (b.onclick = () => {
        if (powerUp(state, b.dataset.fighter)) {
          transient(b, 'boost', 400);
          paint();
          animateHit();
          onUpdate();
        }
      }),
  );
  const observer = new IntersectionObserver(
    (entries) => {
      visible = entries[0].isIntersecting;
      root.classList.toggle('battle-paused', !visible);
      if (visible && !encounter.seen) {
        encounter.seen = true;
        onSeen(ids);
        onUpdate();
      }
    },
    { threshold: 0.15 },
  );
  observer.observe(root);
  const interval = setInterval(() => {
    const running = visible && !document.hidden && canRun();
    root.classList.toggle('battle-paused', !running);
    if (!running || state.winner) return;
    fightBeat(state);
    paint();
    animateHit();
    onUpdate();
  }, 550);
  paint();
  return {
    dispose() {
      disposed = true;
      clearInterval(interval);
      observer.disconnect();
      for (const t of timers) clearTimeout(t);
      timers.clear();
    },
    markSaved() {
      if (!disposed) root.querySelector('.battle-saved').textContent = 'saved ↑';
    },
  };
}
