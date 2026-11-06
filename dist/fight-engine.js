export function createFight(ids, seed = 1) {
  return {
    rng: seed >>> 0,
    chosen: null,
    winner: null,
    beat: 0,
    lastHit: null,
    fighters: ids.map((id) => ({ id, hp: 100, power: 0 })),
  };
}
function roll(s) {
  s.rng = (Math.imul(s.rng, 1664525) + 1013904223) >>> 0;
  return s.rng / 4294967296;
}
function finish(s) {
  const alive = s.fighters.filter((f) => f.hp > 0);
  if (alive.length === 1) s.winner = alive[0].id;
}
function hit(s, attacker, target, damage) {
  target.hp = Math.max(s.chosen ? 0 : 35, target.hp - damage);
  s.lastHit = { from: attacker.id, to: target.id };
  finish(s);
}
export function powerUp(s, id) {
  if (s.winner) return false;
  const f = s.fighters.find((f) => f.id === id);
  if (!f || f.hp <= 0) return false;
  s.chosen = id;
  f.power = Math.min(100, f.power + 15);
  f.hp = Math.min(100, f.hp + 12);
  const targets = s.fighters.filter((x) => x.id !== id && x.hp > 0);
  if (targets.length)
    hit(
      s,
      f,
      targets[Math.floor(roll(s) * targets.length)],
      10 + Math.floor(f.power / 8),
    );
  return true;
}
export function fightBeat(s) {
  if (s.winner) return;
  s.beat++;
  const alive = s.fighters.filter((f) => f.hp > 0),
    chosen = alive.find((f) => f.id === s.chosen);
  const attacker =
    chosen && s.beat % 3 !== 0 ? chosen : alive[Math.floor(roll(s) * alive.length)];
  const targets = alive.filter((f) => f.id !== attacker.id);
  if (!targets.length) {
    finish(s);
    return;
  }
  const target = targets[Math.floor(roll(s) * targets.length)];
  hit(
    s,
    attacker,
    target,
    attacker.id === s.chosen ? 14 + Math.floor(attacker.power / 5) : 3,
  );
}
