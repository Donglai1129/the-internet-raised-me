import { sanitizeMediaHistory } from './reaction-posts.js?v=useronly1';
import { mountReaction } from './reaction-ui.js?v=useronly1';
import { mountBattle } from './battle-ui.js?v=inline1';
import { loadWinners, storeWinner } from './winner-db.js?v=inline1';
import { buildSceneLayout } from './scene-layout.js?v=randomlayout1';
import {
  byId,
  cultures,
  interact,
  expose,
  log,
  evolution,
} from './engine.js?v=pins20261030';
import {
  library,
  sharedOpening,
  newVisit,
  migrateCollection,
  nextFrame,
  recordMediaReaction,
  recordFightWin,
  answerMemeQuestion,
  recordView,
  openReference,
  leaveFrame,
  viewCount,
  answerReply,
  replyOptions,
  visitOther,
  makeOtherRoute,
  evidence,
} from './experience.js?v=useronly1';
import { threads, threadFor, connectedIds } from './threads.js?v=pins20261030';
import { buildPortraitPlan, renderPortrait } from './portrait.js?v=pins20261030';
import { renderHistory, appendCredits } from './history.js?v=pins20261030';
const $ = (s) => document.querySelector(s),
  KEY = 'tirm.experience.v4';
const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
  );
let visit;
try {
  visit = JSON.parse(localStorage.getItem(KEY));
} catch {}
if (
  visit?.version === 3 &&
  [4, 5].includes(visit.contentRevision) &&
  visit.collectionRevision !== 'pinterest-20261030'
)
  visit = migrateCollection(visit);
if (
  visit?.version !== 3 ||
  visit?.contentRevision !== 5 ||
  !visit.frames?.every((f) => f.ids.every(byId))
)
  visit = null;
const requested = new URLSearchParams(location.search).get('seed');
if (requested && /^\d+$/.test(requested) && visit?.seed !== Number(requested) >>> 0)
  visit = newVisit(Number(requested) >>> 0);
visit ??= newVisit(crypto.getRandomValues(new Uint32Array(1))[0]);
sanitizeMediaHistory(visit);
const storedWins = await loadWinners();
visit.battleWins = Object.fromEntries(
  Object.entries(storedWins).filter(([id]) => library.some((a) => a.id === id)),
);
const battleControllers = new Map();
const reactionControllers = new Map();
let mode = 'own',
  sound = false,
  active = null,
  openedAt = 0,
  dwell = 0,
  pending = new Map(),
  lastIntent = 0,
  lastAdvance = 0;
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const current = () => (mode === 'other' ? visit.comparison : visit);
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(visit));
  } catch {
    $('#announcement').textContent = 'This browser could not save the visit.';
  }
}
const image = (id, cls = '') =>
  `<img class="${cls}" src="${byId(id).image}" alt="${esc(byId(id).alt)}" draggable="false" loading="lazy" decoding="async">`;
function scrollToElement(el) {
  el?.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
}
const watcher = new IntersectionObserver(
  (entries) => {
    for (const e of entries) {
      const el = e.target;
      if (!e.isIntersecting) {
        clearTimeout(pending.get(el));
        pending.delete(el);
        continue;
      }
      if (pending.has(el)) continue;
      pending.set(
        el,
        setTimeout(() => {
          pending.delete(el);
          if (
            !el.isConnected ||
            document.hidden ||
            $('#reference').open ||
            $('#revelation').open
          )
            return;
          const s = current(),
            frame = s.frames[+el.dataset.frame];
          if (frame && recordView(s, frame, el.dataset.id)) {
            shape();
            save();
          }
        }, 750),
      );
    }
  },
  { threshold: 0.55 },
);
function observe(root = document) {
  root.querySelectorAll('.reference-object').forEach((el) => {
    watcher.unobserve(el);
    watcher.observe(el);
  });
}
function shape() {
  const s = current(),
    v = evolution(s),
    count = s.familiarity[s.anchor] || 0;
  document.documentElement.style.setProperty('--exposure-color', v.color.join(','));
  document.documentElement.style.setProperty(
    '--exposure-density',
    Math.min(count / 8, 1),
  );
  document.body.classList.toggle('another-route', mode === 'other');

  $('#memory').innerHTML = '';
  $('.home-link span').classList.toggle('familiar-link', count >= 3);
}
function attachObject(el, frame) {
  let start = null,
    origin = null,
    moved = false;
  el.onpointerdown = (e) => {
    start = { x: e.clientX, y: e.clientY };
    origin = { x: +(el.dataset.x || 0), y: +(el.dataset.y || 0) };
    moved = false;
    el.setPointerCapture(e.pointerId);
  };
  el.onpointermove = (e) => {
    if (!start) return;
    const x = e.clientX - start.x,
      y = e.clientY - start.y;
    if (Math.abs(x) + Math.abs(y) < 8 && !moved) return;
    moved = true;
    el.dataset.x = origin.x + x;
    el.dataset.y = origin.y + y;
    el.style.translate = `${origin.x + x}px ${origin.y + y}px`;
    el.style.zIndex = 20;
  };
  el.onpointerup = () => {
    start = null;
    if (moved) {
      interact(current(), byId(el.dataset.id), 'drag');
      save();
    }
  };
  el.onpointercancel = () => {
    start = null;
    moved = false;
  };
  el.onclick = () => {
    if (moved) {
      moved = false;
      return;
    }
    openItem(el.dataset.id, frame);
  };
  el.onkeydown = (e) => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    e.preventDefault();
    const x =
        +(el.dataset.x || 0) +
        (e.key === 'ArrowLeft' ? -15 : e.key === 'ArrowRight' ? 15 : 0),
      y =
        +(el.dataset.y || 0) +
        (e.key === 'ArrowUp' ? -15 : e.key === 'ArrowDown' ? 15 : 0);
    el.dataset.x = x;
    el.dataset.y = y;
    el.style.translate = `${x}px ${y}px`;
    interact(current(), byId(el.dataset.id), 'keyboard-move');
    save();
  };
}
function frameMarkup(frame) {
  const layout = buildSceneLayout(frame, current().seed);
  return `<article class="world-frame random-frame" style="--mobile-frame-height:${layout.mobileHeight}px" data-frame="${frame.index}" id="frame-${frame.index}" aria-label="Internet scene ${frame.index + 1}">${layout.items
    .map((r) => {
      const m = r.mobile,
        position = `style="--tile-x:${r.x}%;--tile-y:${r.y}px;--tile-w:${r.w}%;--tile-h:${r.h}px;--mobile-x:${m.x}%;--mobile-y:${m.y}px;--mobile-w:${m.w}%;--mobile-h:${m.h}px"`;
      return `<button class="reference-object" ${position} data-id="${r.id}" data-frame="${frame.index}" aria-label="Open ${esc(byId(r.id).title)}. Drag to move.">${image(r.id)}</button>`;
    })
    .join('')}</article>`;
}
function appendFrame(frame, scroll = true) {
  const holder = document.createElement('div');
  holder.innerHTML = frameMarkup(frame);
  const el = holder.firstElementChild;
  $('#stream').append(el);
  el.querySelectorAll('.reference-object').forEach((button) =>
    attachObject(button, frame),
  );
  observe(el);
  let target = el;
  if (frame.encounter) {
    const route = current(),
      wrapper = document.createElement('article');
    wrapper.className = 'meme-battle-frame';
    wrapper.setAttribute('aria-label', 'Meme fight');
    const battle = document.createElement('div');
    battle.className = 'meme-battle';
    wrapper.append(battle);
    $('#stream').append(wrapper);
    target = wrapper;
    const controller = mountBattle(battle, frame.encounter, {
      onUpdate: save,
      onSeen: (ids) => {
        ids.forEach((id) => expose(route, byId(id), 'visible in meme fight'));
        save();
      },
      canRun: () => {
        if ($('#reference').open || $('#revelation').open) return false;
        $('#feed-question').hidden = true;
        return true;
      },
      onWin: async (encounter, winner) => {
        recordFightWin(route, encounter);
        save();
        const totals = await storeWinner(encounter.id, winner);
        const active = Object.fromEntries(
          Object.entries(totals).filter(([id]) => library.some((a) => a.id === id)),
        );
        route.battleWins = { ...active };
        visit.battleWins = { ...active };
        if (visit.comparison) visit.comparison.battleWins = { ...active };
        encounter.recorded = true;
        save();
        battleControllers.get(encounter.id)?.markSaved();
      },
    });
    battleControllers.set(frame.encounter.id, controller);
  }
  if (frame.reaction) {
    const route = current(),
      wrapper = document.createElement('article');
    $('#stream').append(wrapper);
    target = wrapper;
    const controller = mountReaction(wrapper, frame.reaction, {
      onSeen: (ids) => {
        ids.forEach((id) => expose(route, byId(id), 'visible as a media reaction'));
        $('#feed-question').hidden = true;
        save();
      },
      onPick: (id) => {
        if (!recordMediaReaction(route, frame.reaction, id)) return false;
        shape();
        save();
        return true;
      },
    });
    reactionControllers.set(frame.reaction.id, controller);
  }
  shape();
  save();
  if (scroll) scrollToElement(target);
}
function renderRoute(scroll = true) {
  for (const c of reactionControllers.values()) c.dispose();
  reactionControllers.clear();
  for (const controller of battleControllers.values()) controller.dispose();
  battleControllers.clear();
  $('#feed-question').hidden = true;
  watcher.disconnect();
  for (const t of pending.values()) clearTimeout(t);
  pending.clear();
  $('#stream').innerHTML = '';
  $('#threshold').innerHTML = '';
  $('#continue').hidden = false;
  $('#continue').textContent = mode === 'other' ? 'keep scrolling ↓' : 'keep scrolling ↓';
  for (const frame of current().frames) appendFrame(frame, false);
  shape();
  if (mode === 'other') otherNotice();
  if (scroll) scrollToElement($('#stream').lastElementChild);
}
function enter() {
  visit.entered = true;
  if (!visit.frames.length) nextFrame(visit);
  $('#cover').hidden = true;
  $('#experience').hidden = false;
  document.body.classList.add('entered');
  renderRoute(false);
  save();
  scrollToElement($('#experience'));
}
function advance(fromScroll = false) {
  if ($('#reference').open || $('#revelation').open) return;
  lastIntent = 0;
  lastAdvance = performance.now();
  const s = current();
  if (s.frames.length) leaveFrame(s, s.frames[s.frames.length - 1]);
  const frame = nextFrame(s);
  appendFrame(frame, !fromScroll);
  if (frame.encounter || frame.reaction) $('#feed-question').hidden = true;
  else maybeQuestion();
}
function visitOtherPreview() {
  visit.comparison ??= makeOtherRoute(visit);
  save();
  return visit.comparison;
}
function otherNotice() {
  $('#threshold').innerHTML =
    `<section class="other-notice"><h2>Different feeds.<br>Different references.</h2><p>A simulated mix from the same collection.</p><button id="return-route">return to your feed ↗</button><button id="compare-routes">see what happened</button></section>`;
  $('#return-route').onclick = () => {
    mode = 'own';
    renderRoute();
    save();
  };
  $('#compare-routes').onclick = reveal;
}
function openItem(id, frame) {
  if (active) closeItem();
  const s = current();
  active = { s, id, frame };
  openedAt = performance.now();
  dwell = 0;
  openReference(s, frame, id);
  const a = byId(id);
  $('#reference-body').innerHTML =
    `${image(id, 'detail-image')}<div class="image-actions"><a href="${a.image}" download>save image ↓</a></div><details><summary>source</summary><p>${esc(a.source.kind)}${a.source.creator ? ' / ' + esc(a.source.creator) : ''}</p>${a.source.url ? `<a href="${a.source.url}" target="_blank" rel="noopener">${esc(a.source.license || 'original source')}</a>` : ''}</details>`;
  const related = connectedIds(id).filter((x) => s.libraryIds.includes(x));
  const relatedBlock = document.createElement('section');
  relatedBlock.className = 'related-photos';
  relatedBlock.innerHTML = `<h3>related photos</h3><div>${related.map((next) => `<button data-related="${next}" aria-label="Open related ${esc(byId(next).title)}">${image(next)}</button>`).join('')}</div>`;
  $('#reference-body').append(relatedBlock);
  relatedBlock
    .querySelectorAll('[data-related]')
    .forEach((b) => (b.onclick = () => openItem(b.dataset.related, frame)));
  $('#reference').showModal();
  if (sound) playTone(a.culture);
  shape();
  save();
}
function closeItem() {
  if (active) {
    interact(
      active.s,
      byId(active.id),
      'dwell',
      Math.min(
        120,
        Math.round((dwell + (document.hidden ? 0 : performance.now() - openedAt)) / 1000),
      ),
    );
    active = null;
  }
  $('#reference').close();
  observe();
  save();
}
function playTone(i) {
  try {
    const c = new AudioContext(),
      o = c.createOscillator(),
      g = c.createGain();
    o.frequency.value = 180 * Math.pow(1.3, i % 5);
    g.gain.setValueAtTime(0.025, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.3);
    o.connect(g).connect(c.destination);
    o.start();
    o.stop(c.currentTime + 0.3);
    o.onended = () => c.close();
  } catch {}
}
function download(name, canvas) {
  canvas.toBlob(
    (blob) => {
      if (!blob) return;
      const u = URL.createObjectURL(blob),
        a = document.createElement('a');
      a.href = u;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(u), 3000);
    },
    'image/jpeg',
    0.94,
  );
}
async function reveal() {
  if ($('#revelation').open) return;
  const s = structuredClone(visit),
    proof = evidence(s);
  log(visit, 'reveal', {});
  save();
  const ownLast = s.frames.at(-1)?.ids || sharedOpening,
    alt = s.comparison || visitOtherPreview(),
    known = new Set(Object.keys(s.familiarity));
  $('#reveal-body').innerHTML =
    `<h2 id="reveal-title">What showed up in your feed.</h2><section class="proof-row"><div>${image(proof.anchor)}</div><div><h3>${proof.anchorViews} appearances.</h3></div></section>${s.reply ? `<section class="proof-row"><div>${image(s.reply.id)}</div><div><h3>A reference became a reply.</h3><p>You had encountered it ${s.reply.prior} times before using it as a reply.</p></div></section>` : ''}<div class="route-comparison"><div><span>your recent feed</span><div>${ownLast
      .slice(0, 4)
      .map((id) => image(id))
      .join(
        '',
      )}</div></div><div><span>a different possible route · simulated</span><div>${alt.current
      .slice(0, 4)
      .map((id) => image(id))
      .join(
        '',
      )}</div></div></div><button class="browse-other" id="browse-other">browse this simulated alternative ↗</button><h3>A picture of what surrounded you.</h3><div id="portrait-wrap"><p>Generating your picture…</p></div><div class="export-actions"><button id="save-picture" disabled>save your picture JPG ↓</button><button id="save-history">save your history JPG ↓</button></div><button id="keep-exploring">return to your feed</button>`;
  $('#revelation').showModal();
  $('#browse-other').onclick = () => {
    closeReveal();
    visitOther(visit);
    mode = 'other';
    if (!visit.entered) {
      visit.entered = true;
      $('#cover').hidden = true;
      $('#experience').hidden = false;
      document.body.classList.add('entered');
    }
    renderRoute(false);
    $('#stream')
      .querySelectorAll('.world-frame')
      .forEach((el, i) => {
        if (i < current().frames.length - 1) el.hidden = true;
      });
    scrollToElement($('#experience'));
    save();
  };
  if (location.hash !== '#what-changed') history.pushState(null, '', '#what-changed');
  $('#keep-exploring').onclick = () => {
    closeReveal();
    mode = 'own';
    if (!visit.entered) enter();
    else renderRoute();
  };
  $('#save-history').onclick = async () => {
    const b = $('#save-history');
    b.disabled = true;
    try {
      download(`internet-history-${s.seed}.jpg`, await renderHistory(s));
    } finally {
      b.disabled = false;
    }
  };
  const plan = buildPortraitPlan(s),
    raw = await renderPortrait(s, plan),
    canvas = appendCredits(
      raw,
      plan.items.map((a) => a.id),
    );
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'A collage of your actual exposure history');
  canvas.id = 'portrait';
  $('#portrait-wrap').replaceChildren(canvas);
  $('#save-picture').disabled = false;
  $('#save-picture').onclick = () => download(`internet-raised-me-${s.seed}.jpg`, canvas);
}
function closeReveal() {
  $('#revelation').close();
  if (location.hash === '#what-changed')
    history.replaceState(null, '', location.pathname + location.search);
  observe();
}
$('#enter').onclick = enter;
$('#enter').disabled = false;
$('#continue').onclick = () => advance(false);
$('#raised-link').onclick = (e) => {
  e.preventDefault();
  reveal();
};
$('.home-link').onclick = (e) => {
  e.preventDefault();
  reveal();
};
$('#reveal').onclick = reveal;
$('#close-reference').onclick = closeItem;
$('#reference').addEventListener('cancel', (e) => {
  e.preventDefault();
  closeItem();
});
$('#close-reveal').onclick = closeReveal;
$('#revelation').addEventListener('cancel', (e) => {
  e.preventDefault();
  closeReveal();
});
$('#sound').onclick = () => {
  sound = !sound;
  $('#sound').textContent = `sound ${sound ? 'on' : 'off'}`;
  $('#sound').setAttribute('aria-pressed', sound);
  if (sound) playTone(2);
};
$('#restart').onclick = () => {
  lastIntent = 0;
  if (!confirm('Start a new route? Your current route will be replaced in this browser.'))
    return;
  visit = newVisit(crypto.getRandomValues(new Uint32Array(1))[0]);
  mode = 'own';
  save();
  history.replaceState(null, '', location.pathname);
  location.reload();
};
let loadPending = false;
function nearEnd() {
  return $('#scroll-sentinel').getBoundingClientRect().top < innerHeight + 220;
}
function requestMore() {
  if (
    loadPending ||
    !visit.entered ||
    !nearEnd() ||
    $('#reference').open ||
    $('#revelation').open ||
    document.hidden
  )
    return;
  loadPending = true;
  setTimeout(() => {
    loadPending = false;
    if (lastIntent && nearEnd() && !document.hidden) advance(true);
  }, 500);
}
window.addEventListener(
  'wheel',
  (e) => {
    if (e.deltaY > 0) {
      lastIntent = performance.now();
      requestMore();
    }
  },
  { passive: true },
);
window.addEventListener('keydown', (e) => {
  if (['PageDown', 'End', ' '].includes(e.key)) {
    lastIntent = performance.now();
    requestMore();
  }
});
const bottom = new IntersectionObserver(
  (entries) => {
    if (entries.some((e) => e.isIntersecting) && lastIntent) requestMore();
  },
  { rootMargin: '220px', threshold: 0 },
);
bottom.observe($('#scroll-sentinel'));
window.addEventListener('popstate', () => {
  if (location.hash === '#what-changed') reveal();
  else closeReveal();
});
document.addEventListener('visibilitychange', () => {
  if (active) {
    if (document.hidden) dwell += performance.now() - openedAt;
    else openedAt = performance.now();
  }
  if (!document.hidden) observe();
});
setInterval(() => {
  if (!document.hidden) {
    current().elapsed += 5;
    save();
  }
}, 5000);
window.addEventListener('pagehide', save);
if (visit.entered) {
  $('#cover').hidden = true;
  $('#experience').hidden = false;
  document.body.classList.add('entered');
  renderRoute(false);
  requestAnimationFrame(() => scrollToElement($('#stream').lastElementChild));
}
if (location.hash === '#what-changed') reveal();

// Edge sequences are ambient imagery, separate from recorded scene exposures.
let railCells = [];
function fitRails() {
  railCells = [...document.querySelectorAll('.meme-rail')].flatMap((rail, side) => {
    rail.replaceChildren();
    const count = Math.ceil(innerHeight / (innerWidth <= 750 ? 16 : 24));
    return Array.from({ length: count }, (_, i) => {
      const box = document.createElement('div');
      box.className = 'meme-box';
      const img = document.createElement('img');
      img.alt = '';
      img.decoding = 'async';
      const step = side ? 4 - (i % 5) : i % 5,
        index = (i * 7 + side * 3) % library.length;
      img.src = library[index].image;
      box.append(img);
      rail.append(box);
      const cell = {
        img,
        index,
        tempo: (step + 1) * 100,
        next: performance.now() + (step + 1) * 100,
        held: false,
      };
      box.onpointerenter = (e) => {
        if (e.pointerType === 'touch') return;
        cell.held = true;
        box.classList.add('is-held');
      };
      box.onpointerleave = () => {
        cell.held = false;
        cell.next = performance.now() + cell.tempo;
        box.classList.remove('is-held');
      };
      return cell;
    });
  });
}
fitRails();
window.addEventListener('resize', fitRails);
for (const item of library) {
  const preload = new Image();
  preload.src = item.image;
}
let railPaused = reduced;
const railToggle = $('#motion');
function setRailControl() {
  railToggle.textContent = railPaused ? 'play memes' : 'pause memes';
  railToggle.setAttribute('aria-pressed', String(railPaused));
}
railToggle.onclick = () => {
  railPaused = !railPaused;
  setRailControl();
};
setRailControl();
function tickRails(now) {
  const running =
    visit.entered &&
    !railPaused &&
    !document.hidden &&
    !$('#reference').open &&
    !$('#revelation').open;
  for (const cell of railCells) {
    if (!running || cell.held) {
      cell.next = now + cell.tempo;
      continue;
    }
    if (now >= cell.next) {
      cell.index = (cell.index + 1) % library.length;
      cell.img.src = library[cell.index].image;
      cell.next = now + cell.tempo;
    }
  }
  requestAnimationFrame(tickRails);
}
requestAnimationFrame(tickRails);

function maybeQuestion() {
  const s = current(),
    n = s.frames.length;
  if (!n || n % 10 || s.lastQuestion === n) return;
  s.lastQuestion = n;
  save();
  const box = $('#feed-question');
  const questions = [
    {
      text: 'which one is you rn?',
      ids: ['pin-horse-suit', 'pin-were-cooked', 'pin-so-peak'],
    },
    {
      text: 'your friend says “how was your day?”',
      ids: ['pin-minecraft-goodnight', 'sad-dinosaur', 'pin-blue-face'],
    },
    {
      text: 'which one are you sending to the group chat?',
      ids: ['pin-worst-post', 'pin-grass-hands', 'pin-banana-surprise'],
    },
  ];
  const q = questions[(n / 10 - 1) % questions.length];
  box.innerHTML = `<p>${q.text}</p><div class="meme-answers">${q.ids.map((id, i) => `<button data-meme="${id}" aria-label="Choose meme ${i + 1}: ${esc(byId(id).title)}">${image(id)}</button>`).join('')}</div><button class="skip-question" id="skip-question">skip ×</button>`;
  box.hidden = false;
  box.querySelectorAll('[data-meme]').forEach(
    (b) =>
      (b.onclick = () => {
        answerMemeQuestion(current(), b.dataset.meme, q.text, q.ids);
        box.hidden = true;
        save();
      }),
  );
  $('#skip-question').onclick = () => {
    box.hidden = true;
    save();
  };
}
