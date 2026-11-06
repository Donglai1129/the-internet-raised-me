const DB = 'tirm-meme-winners',
  FALLBACK = 'tirm.meme-winners.v1';
let connection;
function fallback() {
  try {
    return JSON.parse(localStorage.getItem(FALLBACK)) || { wins: {}, battles: {} };
  } catch {
    return { wins: {}, battles: {} };
  }
}
function open() {
  if (!connection)
    connection = new Promise((resolve, reject) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => {
        r.result.createObjectStore('memes', { keyPath: 'id' });
        r.result.createObjectStore('battles', { keyPath: 'encounter' });
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  return connection;
}
export async function loadWinners() {
  try {
    const db = await open();
    return await new Promise((resolve, reject) => {
      const r = db.transaction('memes').objectStore('memes').getAll();
      r.onsuccess = () =>
        resolve(Object.fromEntries(r.result.map((x) => [x.id, x.wins])));
      r.onerror = () => reject(r.error);
    });
  } catch {
    return fallback().wins;
  }
}
export async function storeWinner(encounter, id) {
  try {
    const db = await open();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(['memes', 'battles'], 'readwrite'),
        battles = tx.objectStore('battles'),
        memes = tx.objectStore('memes'),
        prior = battles.get(encounter);
      prior.onsuccess = () => {
        if (prior.result) return;
        const r = memes.get(id);
        r.onsuccess = () => {
          const wins = (r.result?.wins || 0) + 1;
          memes.put({ id, wins, lastWonAt: Date.now() });
          battles.put({ encounter, id, at: Date.now() });
        };
      };
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    return loadWinners();
  } catch {
    const data = fallback();
    if (!data.battles[encounter]) {
      data.battles[encounter] = id;
      data.wins[id] = (data.wins[id] || 0) + 1;
      try {
        localStorage.setItem(FALLBACK, JSON.stringify(data));
      } catch {}
    }
    return data.wins;
  }
}
