/*
 * Everything the visitor logs lives in localStorage (the Web Storage API).
 * Reads and writes are wrapped so a blocked or full storage never breaks the page.
 */
const Store = (() => {
  const KEYS = {
    apiKey: 'stoop:tmdb-key',
    diary: 'stoop:diary:v2',
    cache: 'stoop:cache:v2',
    profile: 'stoop:profile:v1'
  };
  const DETAILS_TTL = 14 * 24 * 60 * 60 * 1000;

  let available = true;
  let diary = read(KEYS.diary, { entries: {}, top4: [] });
  let cache = read(KEYS.cache, { summaries: {}, details: {} });
  let profile = read(KEYS.profile, null);

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      available = false;
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      available = false;
      return false;
    }
  }

  /* ---------- API key ---------- */

  function getApiKey() {
    try {
      return localStorage.getItem(KEYS.apiKey) || '';
    } catch {
      return '';
    }
  }

  function saveApiKey(key) {
    try {
      localStorage.setItem(KEYS.apiKey, key);
    } catch {
      available = false;
    }
  }

  function clearApiKey() {
    try {
      localStorage.removeItem(KEYS.apiKey);
    } catch {
      available = false;
    }
  }

  /* ---------- Diary ---------- */

  // Entries are keyed like "movie:603" or "tv:1399".
  function getEntry(key) {
    return diary.entries[key] || null;
  }

  function entries() {
    return Object.values(diary.entries);
  }

  // Merge a change into a film's entry, keeping a snapshot so the diary renders offline.
  function update(film, patch) {
    const current = diary.entries[film.key] || {
      key: film.key,
      id: film.id,
      type: film.type,
      rating: 0,
      watched: false,
      watchlist: false,
      take: '',
      loggedAt: null
    };
    const next = {
      ...current,
      title: film.title,
      year: film.year,
      poster: film.poster,
      ...patch
    };

    if (next.watched && !next.loggedAt) next.loggedAt = Date.now();
    if (!next.watched) next.loggedAt = null;

    const isEmpty = !next.rating && !next.watched && !next.watchlist && !next.take && !diary.top4.includes(film.key);
    if (isEmpty) {
      delete diary.entries[film.key];
    } else {
      diary.entries[film.key] = next;
    }
    write(KEYS.diary, diary);
    return diary.entries[film.key] || null;
  }

  function getTop4() {
    return diary.top4.filter((key) => diary.entries[key]);
  }

  function setTop4(keys) {
    diary.top4 = keys.slice(0, 4);
    write(KEYS.diary, diary);
  }

  /* ---------- TMDB cache ---------- */

  function getSummary(key) {
    return cache.summaries[key] || null;
  }

  function saveSummaries(pairs) {
    pairs.forEach(([key, summary]) => {
      cache.summaries[key] = summary;
    });
    persistCache();
  }

  function getDetails(key) {
    const hit = cache.details[key];
    if (!hit || Date.now() - hit.fetchedAt > DETAILS_TTL) return null;
    return hit;
  }

  function saveDetails(details) {
    cache.details[details.key] = details;
    persistCache();
  }

  // If storage fills up, drop the cached details (they can be refetched) and try again.
  function persistCache() {
    if (!write(KEYS.cache, cache)) {
      cache.details = {};
      write(KEYS.cache, cache);
    }
  }

  /* ---------- Profile for the block ---------- */

  // sharing: null means "never asked", true means shared, false means kept private.
  function getProfile() {
    if (!profile) {
      profile = { id: makeId(), name: '', sharing: null };
      write(KEYS.profile, profile);
    }
    return profile;
  }

  function updateProfile(patch) {
    profile = { ...getProfile(), ...patch };
    write(KEYS.profile, profile);
    return profile;
  }

  function makeId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // Fallback for browsers without randomUUID: a version 4 UUID from random bytes.
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) =>
      (Number(c) ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(c) / 4)))).toString(16)
    );
  }

  function isAvailable() {
    return available;
  }

  return {
    getApiKey, saveApiKey, clearApiKey,
    getEntry, entries, update, getTop4, setTop4,
    getSummary, saveSummaries, getDetails, saveDetails,
    getProfile, updateProfile,
    isAvailable
  };
})();
