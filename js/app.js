'use strict';

/* =========================================================
   The Stoop: UI and wiring
   ========================================================= */

const $ = (id) => document.getElementById(id);

const els = {
  tabs: $('tabs'),
  keyGate: $('key-gate'),
  keyForm: $('key-form'),
  keyInput: $('key-input'),
  keyStatus: $('key-status'),
  app: $('app'),
  resetKey: $('reset-key'),
  steps: $('steps'),
  shareStoop: $('share-stoop'),
  sharedStoop: $('shared-stoop'),
  sharedStatus: $('shared-status'),
  sharedGrid: $('shared-grid'),
  sharedClose: $('shared-close'),
  addToStoop: $('add-to-stoop'),
  blockTab: $('block-tab'),
  blockRefresh: $('block-refresh'),
  blockYou: $('block-you'),
  blockStatus: $('block-status'),
  blockMost: $('block-most'),
  mostList: $('most-list'),
  blockGrid: $('block-grid'),
  shareDialog: $('share-dialog'),
  shareForm: $('share-form'),
  shareName: $('share-name'),
  picker: $('picker-dialog'),
  pickerClose: $('picker-close'),
  pickerForm: $('picker-form'),
  pickerInput: $('picker-input'),
  pickerStatus: $('picker-status'),
  pickerResults: $('picker-results'),
  searchForm: $('search-form'),
  searchInput: $('search-input'),
  shelfTitle: $('shelf-title'),
  shelfSub: $('shelf-sub'),
  eraFilters: $('era-filters'),
  mediaSwitch: $('media-switch'),
  hideWatched: $('hide-watched'),
  shelfStatus: $('shelf-status'),
  shelfProgress: $('shelf-progress'),
  shelfProgressBar: $('shelf-progress-bar'),
  shelfGrid: $('shelf-grid'),
  foryouStatus: $('foryou-status'),
  foryouProgress: $('foryou-progress'),
  foryouProgressBar: $('foryou-progress-bar'),
  recList: $('rec-list'),
  refreshPicks: $('refresh-picks'),
  diaryStats: $('diary-stats'),
  diaryList: $('diary-list'),
  watchlistGrid: $('watchlist-grid'),
  watchlistStatus: $('watchlist-status'),
  watchlistCount: $('watchlist-count'),
  dialog: $('film-dialog'),
  dialogClose: $('dialog-close'),
  filmBackdrop: $('film-backdrop'),
  filmPosterSlot: $('film-poster-slot'),
  filmTitle: $('film-title'),
  filmMeta: $('film-meta'),
  filmTagline: $('film-tagline'),
  filmNote: $('film-note'),
  filmOverview: $('film-overview'),
  filmCast: $('film-cast'),
  filmStatus: $('film-status'),
  filmTrailer: $('film-trailer'),
  filmTmdb: $('film-tmdb'),
  rating: $('rating'),
  stars: $('stars'),
  verdict: $('verdict'),
  clearRating: $('clear-rating'),
  toggleWatched: $('toggle-watched'),
  toggleWatchlist: $('toggle-watchlist'),
  toggleStoop: $('toggle-stoop'),
  filmTake: $('film-take'),
  toast: $('toast'),
  posterTemplate: $('poster-template')
};

const THIS_YEAR = new Date().getFullYear();

const ERAS = [
  { id: 'all', label: 'Everything', test: () => true },
  { id: 'early', label: 'Before 1970', test: (film) => film.year < 1970 },
  { id: '1970s', label: '1970s', test: (film) => decadeOf(film) === 1970 },
  { id: '1980s', label: '1980s', test: (film) => decadeOf(film) === 1980 },
  { id: '1990s', label: '1990s', test: (film) => decadeOf(film) === 1990 },
  { id: '2000s', label: '2000s', test: (film) => decadeOf(film) === 2000 },
  { id: '2010s', label: '2010s', test: (film) => decadeOf(film) === 2010 },
  { id: '2020s', label: '2020s', test: (film) => film.year >= 2020 },
  { id: 'new', label: `New in ${THIS_YEAR}`, test: (film) => film.year >= THIS_YEAR },
  { id: 'hoops', label: 'Hoops', test: (film) => app.canonMeta.get(film.key)?.tags.includes('hoops') },
  { id: 'blax', label: 'Blaxploitation', test: (film) => app.canonMeta.get(film.key)?.tags.includes('blax') },
  { id: 'parody', label: 'Parody', test: (film) => app.canonMeta.get(film.key)?.tags.includes('parody') }
];

const app = {
  films: new Map(),     // "movie:603" or "tv:1399" -> everything we know about the title
  shelf: { movie: [], tv: [] }, // shelf order for films and for shows
  canonMeta: new Map(), // key -> { tags, note }
  mediaType: 'movie',   // which half of the shelf is showing
  canonReady: false,
  era: 'all',
  view: 'shelf',
  searchResults: null,
  searchQuery: '',
  openKey: null,
  recsSignature: '',
  recsRun: 0,
  recsRanked: [],       // every pick, best match first
  recsPage: 0,          // which batch of picks is showing
  keyFromConfig: false
};

/* ---------- Small helpers ---------- */

function decadeOf(film) {
  return Math.floor(film.year / 10) * 10;
}

function canonKey(entry) {
  return `${entry.type}|${entry.title}|${entry.year}`;
}

// Letterboxd style: filled stars plus a ½ for half ratings, e.g. 3.5 => ★★★½
// What each rating means, said the way you'd say it in the group chat.
const VERDICTS = {
  0.5: 'Turned it off',
  1: 'Nah',
  1.5: 'Rough watch',
  2: 'Mid',
  2.5: 'Had its moments',
  3: 'Solid',
  3.5: 'A hit',
  4: 'Run it back',
  4.5: 'Top tier',
  5: 'Classic. No debate.'
};

function stars(rating) {
  return '★'.repeat(Math.floor(rating)) + (rating % 1 ? '½' : '');
}

// Color each star full, half, or empty for a rating from 0 to 5 in half steps.
function paintStars(value) {
  els.stars.querySelectorAll('.star').forEach((star) => {
    const n = Number(star.dataset.star);
    star.classList.toggle('is-full', value >= n);
    star.classList.toggle('is-half', value === n - 0.5);
  });
  els.verdict.textContent = VERDICTS[value] || '';
}

function filmLabel(film) {
  return film.year ? `${film.title} (${film.year})` : film.title;
}

function register(film) {
  const merged = { ...(app.films.get(film.key) || {}), ...film };
  app.films.set(film.key, merged);
  return merged;
}

function filmByKey(key) {
  return app.films.get(key) || Store.getEntry(key);
}

function shelfKeys() {
  return [...app.shelf.movie, ...app.shelf.tv];
}

// A small "Series" tag so shows stand out wherever films and shows mix.
function seriesBadge() {
  const badge = document.createElement('span');
  badge.className = 'kind-badge';
  badge.textContent = 'Series';
  return badge;
}

let toastTimer;
function toast(message) {
  // A modal dialog sits in the top layer, so the toast moves inside it to stay visible.
  const host = els.dialog.open ? els.dialog : els.picker.open ? els.picker : document.body;
  if (els.toast.parentElement !== host) host.append(els.toast);
  els.toast.textContent = message;
  els.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => els.toast.classList.remove('is-visible'), 3200);
}

function setProgress(wrapper, bar, done, total) {
  wrapper.hidden = done >= total;
  bar.style.setProperty('--progress', `${Math.round((done / total) * 100)}%`);
}

// Run async work over a list with a cap on how many requests are in flight.
async function mapLimit(items, limit, worker, onProgress) {
  const results = new Array(items.length);
  let next = 0;
  let done = 0;

  async function run() {
    while (next < items.length) {
      const index = next++;
      try {
        results[index] = { ok: true, value: await worker(items[index], index) };
      } catch (error) {
        results[index] = { ok: false, error };
      }
      done++;
      if (onProgress) onProgress(done, items.length);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}

function isAuthError(error) {
  return error instanceof TMDB.TmdbError && error.kind === 'auth';
}

function friendlyError(error) {
  if (error instanceof TMDB.TmdbError) {
    if (error.kind === 'network') return "Couldn't reach TMDB. Check your connection and try again.";
    if (error.kind === 'auth') return "TMDB didn't accept the API key.";
    if (error.status === 429) return 'TMDB is getting too many requests. Wait a few seconds and try again.';
  }
  return 'Something went wrong talking to TMDB. Try again in a moment.';
}

function poster(film, size = 'w342') {
  const frame = document.createElement('span');
  frame.className = 'poster-art';
  const src = TMDB.image(film.poster, size);

  if (src) {
    const img = document.createElement('img');
    img.src = src;
    img.alt = `Poster for ${filmLabel(film)}`;
    img.loading = 'lazy';
    img.addEventListener('error', () => img.replaceWith(posterFallback(film)), { once: true });
    frame.append(img);
  } else {
    frame.append(posterFallback(film));
  }
  return frame;
}

function posterFallback(film) {
  const fallback = document.createElement('span');
  fallback.className = 'poster-fallback';
  fallback.textContent = film.title;
  return fallback;
}

/* =========================================================
   Key gate
   ========================================================= */

function showKeyGate(message = '') {
  els.app.hidden = true;
  els.tabs.hidden = true;
  els.keyGate.hidden = false;
  els.keyStatus.textContent = message;
  els.keyStatus.classList.toggle('is-error', Boolean(message));
  els.keyInput.focus();
}

async function handleKeySubmit(event) {
  event.preventDefault();
  const key = els.keyInput.value.trim();
  if (!key) return;

  const submit = els.keyForm.querySelector('button');
  submit.disabled = true;
  els.keyStatus.classList.remove('is-error');
  els.keyStatus.textContent = 'Checking your key…';
  TMDB.setKey(key);

  try {
    await TMDB.verifyKey();
    Store.saveApiKey(key);
    els.keyStatus.textContent = '';
    startApp();
  } catch (error) {
    els.keyStatus.classList.add('is-error');
    els.keyStatus.textContent = isAuthError(error)
      ? "That key didn't work. Copy the API Key (the shorter one) from your TMDB settings and try again."
      : friendlyError(error);
  } finally {
    submit.disabled = false;
  }
}

function handleResetKey() {
  Store.clearApiKey();
  els.keyInput.value = '';
  showKeyGate();
}

/* =========================================================
   Startup
   ========================================================= */

function init() {
  buildEraFilters();
  bindEvents();

  const configKey = (window.STOOP_CONFIG && window.STOOP_CONFIG.tmdbApiKey) || '';
  app.keyFromConfig = Boolean(configKey.trim());
  const key = configKey.trim() || Store.getApiKey();

  if (!Store.isAvailable()) {
    toast("This browser is blocking storage, so your ratings and lists won't be saved after you leave.");
  }

  if (!key) {
    showKeyGate();
    return;
  }
  TMDB.setKey(key);
  startApp();
}

function startApp() {
  els.keyGate.hidden = true;
  els.app.hidden = false;
  els.tabs.hidden = false;
  els.resetKey.hidden = app.keyFromConfig;
  renderStoop();
  updateWatchlistCount();
  showSharedStoop();
  els.blockTab.hidden = !Classroom.enabled;
  scheduleSync();
  if (!app.canonReady) loadCanon();
}

// Match every shelf film to TMDB, using the cache for anything already found.
async function loadCanon() {
  els.shelfStatus.classList.remove('is-error');
  els.shelfStatus.textContent = 'Pulling films off the shelf…';
  els.shelfGrid.replaceChildren(...skeletonCards(12));

  // One cheap request first, so a bad key or no connection fails once instead of a hundred times.
  try {
    await TMDB.verifyKey();
  } catch (error) {
    if (isAuthError(error)) {
      showKeyGate("TMDB didn't accept the saved key. Paste a working one to continue.");
    } else {
      showShelfError(friendlyError(error));
    }
    return;
  }

  const wanted = [
    ...CANON.map((entry) => ({ ...entry, type: 'movie' })),
    ...SHOWS.map((entry) => ({ ...entry, type: 'tv' }))
  ];
  const fresh = [];
  const results = await mapLimit(wanted, 6, async (entry) => {
    const key = canonKey(entry);
    const cached = Store.getSummary(key);
    if (cached) return cached;
    const found = await TMDB.findTitle(entry.type, entry.title, entry.year);
    if (found) fresh.push([key, found]);
    return found;
  }, (done, total) => setProgress(els.shelfProgress, els.shelfProgressBar, done, total));

  if (fresh.length) Store.saveSummaries(fresh);

  if (results.some((result) => !result.ok && isAuthError(result.error))) {
    showKeyGate("TMDB didn't accept the saved key. Paste a working one to continue.");
    return;
  }

  app.shelf = { movie: [], tv: [] };
  results.forEach((result, index) => {
    if (!result.ok || !result.value) return;
    const film = register(result.value);
    if (app.canonMeta.has(film.key)) return; // same title matched twice
    app.shelf[film.type].push(film.key);
    app.canonMeta.set(film.key, { tags: wanted[index].tags || [], note: wanted[index].note || '' });
  });

  const failed = results.filter((result) => !result.ok);
  if (!shelfKeys().length) {
    els.shelfProgress.hidden = true;
    showShelfError(failed.length ? friendlyError(failed[0].error) : 'The shelf came back empty.');
    return;
  }

  app.canonReady = true;
  els.shelfStatus.textContent = failed.length
    ? `${failed.length} films didn't load this time. Refresh the page to try them again.`
    : '';
  renderShelf();
}

function showShelfError(message) {
  els.shelfGrid.replaceChildren();
  els.shelfStatus.classList.add('is-error');
  els.shelfStatus.textContent = message + ' ';
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.className = 'link-button';
  retry.textContent = 'Try again';
  retry.addEventListener('click', loadCanon);
  els.shelfStatus.append(retry);
}

function skeletonCards(count) {
  return Array.from({ length: count }, () => {
    const li = document.createElement('li');
    li.className = 'poster-item is-loading';
    li.setAttribute('aria-hidden', 'true');
    return li;
  });
}

/* =========================================================
   The stoop (top four)
   ========================================================= */

function renderStoop() {
  const top = Store.getTop4();
  const steps = [0, 1, 2, 3].map((index) => {
    const li = document.createElement('li');
    li.className = 'step';
    li.dataset.index = index;

    const seat = document.createElement('div');
    seat.className = 'seat';
    const key = top[index];

    if (key) {
      const film = filmByKey(key);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'seat-film';
      button.draggable = true;
      button.dataset.key = key;
      button.setAttribute('aria-label', `${filmLabel(film)}, step ${index + 1}. Open film.`);
      button.append(poster(film, 'w342'));
      button.addEventListener('click', () => openFilm(key));
      button.addEventListener('dragstart', (event) => {
        event.dataTransfer.setData('text/plain', String(index));
        event.dataTransfer.effectAllowed = 'move';
        button.classList.add('is-dragging');
      });
      button.addEventListener('dragend', () => button.classList.remove('is-dragging'));

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'seat-remove';
      remove.setAttribute('aria-label', `Take ${filmLabel(film)} off your stoop`);
      remove.textContent = '\u2212';
      remove.addEventListener('click', () => removeFromStoop(key));

      seat.append(button, remove);
    } else {
      // An open step is a button: tap the plus to search and fill it.
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'seat-empty seat-add';
      add.setAttribute('aria-label', 'Add a favorite to your stoop');
      const plus = document.createElement('span');
      plus.className = 'seat-plus';
      plus.setAttribute('aria-hidden', 'true');
      plus.textContent = '+';
      const label = document.createElement('span');
      label.className = 'seat-add-label';
      label.textContent = 'Add a favorite';
      add.append(plus, label);
      add.addEventListener('click', openPicker);
      seat.append(add);
    }

    // Drag one favorite onto another step to swap them (HTML Drag and Drop API).
    li.addEventListener('dragover', (event) => {
      event.preventDefault();
      li.classList.add('is-drop-target');
    });
    li.addEventListener('dragleave', () => li.classList.remove('is-drop-target'));
    li.addEventListener('drop', (event) => {
      event.preventDefault();
      li.classList.remove('is-drop-target');
      const from = Number(event.dataTransfer.getData('text/plain'));
      moveOnStoop(from, index);
    });

    const slab = document.createElement('span');
    slab.className = 'slab';
    slab.setAttribute('aria-hidden', 'true');

    li.append(seat, slab);
    return li;
  });

  els.steps.replaceChildren(...steps);
}

function moveOnStoop(from, to) {
  const top = Store.getTop4();
  if (Number.isNaN(from) || from === to || !top[from]) return;
  const [moved] = top.splice(from, 1);
  top.splice(Math.min(to, top.length), 0, moved);
  Store.setTop4(top);
  renderStoop();
  scheduleSync();
}

const STOOP_FULL = 'Your stoop is full. Tap \u2212 on one of your four to make room.';

function startAddingToStoop() {
  openPicker();
}

function addToStoop(film) {
  const top = Store.getTop4();
  if (top.includes(film.key)) {
    toast(`${film.title} is already on your stoop.`);
    return;
  }
  if (top.length >= 4) {
    toast(STOOP_FULL);
    return;
  }
  // Claim the step first, so the entry counts as worth keeping when it saves.
  Store.setTop4([...top, film.key]);
  Store.update(film, {});
  if (app.openKey === film.key) syncLogControls();
  if (Classroom.enabled && Store.getProfile().sharing === null) app.askToShare = true;
  els.picker.close();
  refreshAfterLog();
  toast(`${film.title} is on your stoop, step ${top.length + 1}.`);
}

function removeFromStoop(key) {
  const film = filmByKey(key);
  Store.setTop4(Store.getTop4().filter((item) => item !== key));
  // Saving with no change drops the entry if the stoop was the only thing keeping it.
  if (film) Store.update(film, {});
  if (app.openKey === key) syncLogControls();
  refreshAfterLog();
  els.steps.querySelector('.seat-add')?.focus();
  toast(`${film ? film.title : 'That title'} is off your stoop.`);
}

/* ---------- Quick add picker ---------- */

let pickerTimer;
let pickerRun = 0;

function openPicker() {
  if (Store.getTop4().length >= 4) {
    toast(STOOP_FULL);
    return;
  }
  clearTimeout(pickerTimer);
  pickerRun++;
  els.pickerInput.value = '';
  showPickerSuggestions();
  els.picker.showModal();
  els.pickerInput.focus();
}

// Before anything is typed, offer what the visitor has already watched, best rated first.
function showPickerSuggestions() {
  const top = Store.getTop4();
  const yours = Store.entries()
    .filter((entry) => (entry.rating || entry.watched) && !top.includes(entry.key))
    .sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.loggedAt || 0) - (a.loggedAt || 0))
    .slice(0, 8);
  els.pickerStatus.classList.remove('is-error');
  els.pickerStatus.textContent = yours.length
    ? "From what you've watched, or search for anything."
    : 'Search for any film or show to give it a step.';
  renderPickerResults(yours.map((entry) => filmByKey(entry.key)));
}

function handlePickerInput() {
  clearTimeout(pickerTimer);
  const query = els.pickerInput.value.trim();
  if (!query) {
    pickerRun++;
    showPickerSuggestions();
    return;
  }
  if (query.length < 2) return;
  pickerTimer = setTimeout(() => runPickerSearch(query), 350);
}

function handlePickerSubmit(event) {
  event.preventDefault();
  clearTimeout(pickerTimer);
  const query = els.pickerInput.value.trim();
  if (query) runPickerSearch(query);
  else showPickerSuggestions();
}

async function runPickerSearch(query) {
  const run = ++pickerRun;
  els.pickerStatus.classList.remove('is-error');
  els.pickerStatus.textContent = `Searching for “${query}”…`;
  try {
    const films = (await TMDB.search(query)).map(register);
    if (run !== pickerRun) return; // a newer search started
    els.pickerStatus.textContent = films.length
      ? 'Tap one to give it a step.'
      : `Nothing matches “${query}”. Try another spelling.`;
    renderPickerResults(films);
  } catch (error) {
    if (run !== pickerRun) return;
    if (isAuthError(error)) {
      els.picker.close();
      showKeyGate("TMDB stopped accepting the key. Paste a working one to continue.");
      return;
    }
    els.pickerStatus.classList.add('is-error');
    els.pickerStatus.textContent = friendlyError(error);
  }
}

function renderPickerResults(films) {
  const top = Store.getTop4();
  const items = films.filter(Boolean).map((film) => {
    const isShow = (film.type || film.key.split(':')[0]) === 'tv';
    const onStoop = top.includes(film.key);

    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'picker-option';
    option.setAttribute('aria-label', onStoop
      ? `${filmLabel(film)}, already on your stoop`
      : `Add ${filmLabel(film)}${isShow ? ', series,' : ''} to your stoop`);

    const thumb = document.createElement('span');
    thumb.className = 'picker-thumb';
    thumb.append(poster(film, 'w92'));

    const text = document.createElement('span');
    text.className = 'picker-text';
    const title = document.createElement('span');
    title.className = 'picker-title';
    title.textContent = film.title;
    if (isShow) title.append(' ', seriesBadge());
    const meta = document.createElement('span');
    meta.className = 'picker-meta';
    meta.textContent = [film.year, onStoop ? 'Already on your stoop' : ''].filter(Boolean).join(' · ');
    text.append(title, meta);

    option.append(thumb, text);
    if (onStoop) option.disabled = true;
    else option.addEventListener('click', () => addToStoop(film));

    const li = document.createElement('li');
    li.append(option);
    return li;
  });
  els.pickerResults.replaceChildren(...items);
}

/* ---------- Sharing by link ----------
   The four titles ride along in the address, so no account or server is needed:
   ?stoop=m603.t1399 means the film with TMDB id 603, then the show with id 1399. */

function stoopLink(keys) {
  const code = keys
    .map((key) => {
      const [type, id] = key.split(':');
      return `${type === 'tv' ? 't' : 'm'}${id}`;
    })
    .join('.');
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('stoop', code);
  return url.toString();
}

function readSharedStoop() {
  const code = new URLSearchParams(location.search).get('stoop') || '';
  const keys = code
    .split('.')
    .map((part) => part.match(/^([mt])(\d{1,10})$/))
    .filter(Boolean)
    .map(([, type, id]) => `${type === 't' ? 'tv' : 'movie'}:${id}`);
  return [...new Set(keys)].slice(0, 4);
}

async function shareStoop() {
  const keys = Store.getTop4();
  if (!keys.length) {
    toast('Your stoop is empty. Tap + on a step to add your first favorite.');
    return;
  }

  const url = stoopLink(keys);
  const titles = keys.map((key) => filmByKey(key)?.title).filter(Boolean);
  const text = `My top four on The Stoop: ${titles.join(', ')}. What four are on yours?`;

  if (navigator.share) {
    try {
      await navigator.share({ title: 'My stoop', text, url });
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
      // Fall through to the clipboard if the share sheet fails.
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    toast('Link copied. Paste it anywhere to share your stoop.');
  } catch {
    toast(`Copying is blocked here. Your link: ${url}`);
  }
}

async function showSharedStoop() {
  const keys = readSharedStoop();
  if (!keys.length) {
    els.sharedStoop.hidden = true;
    return;
  }

  els.sharedStoop.hidden = false;
  els.sharedStatus.classList.remove('is-error');
  els.sharedStatus.textContent = '';
  els.sharedGrid.replaceChildren(...skeletonCards(keys.length));

  const results = await mapLimit(keys, 4, (key) => getDetails(key));
  const films = results.filter((result) => result.ok).map((result) => result.value);
  if (!films.length) {
    els.sharedGrid.replaceChildren();
    els.sharedStatus.classList.add('is-error');
    els.sharedStatus.textContent = results[0]?.error
      ? `This stoop couldn't load. ${friendlyError(results[0].error)}`
      : "This stoop link doesn't point to any titles.";
    return;
  }
  renderGrid(els.sharedGrid, films);
  if (films.length < keys.length) {
    els.sharedStatus.textContent = `${keys.length - films.length} of their titles couldn't load.`;
  }
}

function closeSharedStoop() {
  els.sharedStoop.hidden = true;
  const url = new URL(location.href);
  url.searchParams.delete('stoop');
  history.replaceState(null, '', url);
  els.shareStoop.closest('.stoop').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* =========================================================
   Shelf, search, and poster grids
   ========================================================= */

function buildEraFilters() {
  const buttons = ERAS.map((era) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'chip';
    button.dataset.era = era.id;
    button.textContent = era.label;
    button.setAttribute('aria-pressed', String(era.id === app.era));
    return button;
  });
  els.eraFilters.replaceChildren(...buttons);
}

function setEra(id) {
  app.era = id;
  els.eraFilters.querySelectorAll('.chip').forEach((button) => {
    button.setAttribute('aria-pressed', String(button.dataset.era === id));
  });
}

function renderShelf() {
  const searching = app.searchResults !== null;
  els.eraFilters.hidden = searching;
  els.mediaSwitch.hidden = searching;
  els.hideWatched.parentElement.hidden = searching;

  if (searching) {
    els.shelfTitle.textContent = `Results for “${app.searchQuery}”`;
    els.shelfSub.replaceChildren();
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'link-button';
    back.textContent = 'Back to the shelf';
    back.addEventListener('click', clearSearch);
    els.shelfSub.append('Anything you log here counts toward your picks. ', back);

    renderGrid(els.shelfGrid, app.searchResults);
    els.shelfStatus.classList.remove('is-error');
    els.shelfStatus.textContent = app.searchResults.length ? '' : `Nothing on TMDB matches “${app.searchQuery}”. Check the spelling or try fewer words.`;
    return;
  }

  els.shelfTitle.textContent = 'The shelf';
  if (!app.canonReady) return;

  const isShows = app.mediaType === 'tv';
  const pool = app.shelf[app.mediaType].map((key) => app.films.get(key));
  els.shelfSub.textContent = isShows
    ? `${pool.length} Black shows, from Sanford and Son to now. Letterboxd doesn't log TV. This does.`
    : `${pool.length} Black films, from Oscar Micheaux to Ryan Coogler. Tap one to rate it or log it.`;

  // Only offer eras that actually have something in this half of the shelf.
  els.eraFilters.querySelectorAll('.chip').forEach((chip) => {
    const test = ERAS.find((item) => item.id === chip.dataset.era).test;
    chip.hidden = !pool.some(test);
  });
  if (els.eraFilters.querySelector(`[data-era="${app.era}"]`).hidden) setEra('all');

  const era = ERAS.find((item) => item.id === app.era);
  const films = pool
    .filter((film) => era.test(film))
    .filter((film) => !(els.hideWatched.checked && Store.getEntry(film.key)?.watched));

  renderGrid(els.shelfGrid, films);
  els.shelfStatus.classList.remove('is-error');
  els.shelfStatus.textContent = films.length ? '' : `You've seen everything in this section. Pick another era or show ${isShows ? 'shows' : 'films'} you've watched.`;
}

function renderGrid(list, films) {
  const items = films.map((film) => {
    const fragment = els.posterTemplate.content.cloneNode(true);
    const card = fragment.querySelector('.poster-card');
    card.dataset.key = film.key;
    card.querySelector('.poster-frame').append(poster(film));
    card.querySelector('.poster-title').textContent = film.title;
    card.querySelector('.poster-year').textContent = film.type === 'tv' ? `Series, ${film.year || 'TBA'}` : film.year || '';

    const entry = Store.getEntry(film.key);
    const marks = card.querySelector('.poster-marks');
    if (entry?.rating) {
      marks.textContent = stars(entry.rating);
      marks.setAttribute('aria-label', `You rated it ${entry.rating} out of 5`);
    } else if (entry?.watched) {
      marks.textContent = 'Watched';
    } else if (entry?.watchlist) {
      marks.textContent = 'On watchlist';
    }
    card.classList.toggle('is-watched', Boolean(entry?.watched));
    return fragment;
  });
  list.replaceChildren(...items);
}

async function handleSearch(event) {
  event.preventDefault();
  const query = els.searchInput.value.trim();
  if (!query) {
    clearSearch();
    return;
  }

  setView('shelf');
  els.shelfStatus.classList.remove('is-error');
  els.shelfStatus.textContent = `Searching TMDB for “${query}”…`;

  try {
    const results = await TMDB.search(query);
    results.forEach(register);
    app.searchQuery = query;
    app.searchResults = results.map((film) => app.films.get(film.key));
    renderShelf();
  } catch (error) {
    if (isAuthError(error)) {
      showKeyGate("TMDB stopped accepting the key. Paste a working one to continue.");
      return;
    }
    els.shelfStatus.classList.add('is-error');
    els.shelfStatus.textContent = friendlyError(error);
  }
}

function clearSearch() {
  app.searchResults = null;
  app.searchQuery = '';
  els.searchInput.value = '';
  renderShelf();
}

/* =========================================================
   Film dialog
   ========================================================= */

async function getDetails(key) {
  const known = app.films.get(key);
  if (known?.hasDetails) return known;

  const cached = Store.getDetails(key);
  if (cached) return register(cached);

  const [type, id] = key.split(':');
  const details = await TMDB.details(type, id);
  Store.saveDetails(details);
  return register(details);
}

async function openFilm(key) {
  const film = filmByKey(key);
  if (!film) return;
  app.openKey = key;

  fillFilmBasics(film);
  syncLogControls();
  if (!els.dialog.open) els.dialog.showModal();

  if (film.hasDetails) {
    fillFilmDetails(film);
    return;
  }

  els.filmStatus.textContent = 'Loading cast and crew…';
  try {
    const details = await getDetails(key);
    if (app.openKey === key) fillFilmDetails(details);
  } catch (error) {
    if (app.openKey !== key) return;
    els.filmStatus.textContent = isAuthError(error)
      ? "TMDB didn't accept the API key, so cast and crew can't load."
      : `${friendlyError(error)} Your rating still saves.`;
  }
}

function fillFilmBasics(film) {
  els.filmTitle.textContent = film.title;
  els.filmMeta.textContent = [film.type === 'tv' ? 'Series' : null, film.year].filter(Boolean).join(', ');
  els.filmTagline.textContent = '';
  els.filmOverview.textContent = film.overview || '';
  els.filmCast.textContent = '';
  els.filmStatus.textContent = '';
  els.filmTrailer.hidden = true;
  els.filmTmdb.href = `https://www.themoviedb.org/${film.type}/${film.id}`;

  const note = app.canonMeta.get(film.key)?.note;
  els.filmNote.hidden = !note;
  els.filmNote.textContent = note || '';

  els.filmPosterSlot.replaceChildren(poster(film, 'w342'));

  const backdrop = TMDB.image(film.backdrop, 'w780');
  els.filmBackdrop.replaceChildren();
  els.filmBackdrop.classList.toggle('has-image', Boolean(backdrop));
  if (backdrop) {
    const img = document.createElement('img');
    img.src = backdrop;
    img.alt = '';
    img.addEventListener('error', () => {
      img.remove();
      els.filmBackdrop.classList.remove('has-image');
    }, { once: true });
    els.filmBackdrop.append(img);
  }
}

function fillFilmDetails(film) {
  const meta = [film.type === 'tv' ? 'Series' : null, film.year, film.runtime ? `${film.runtime} min` : null];
  if (film.seasons) meta.push(`${film.seasons} season${film.seasons === 1 ? '' : 's'}`);
  if (film.makers.length) {
    const verb = film.type === 'tv' ? 'Created by' : 'Directed by';
    meta.push(`${verb} ${film.makers.map((person) => person.name).join(' and ')}`);
  }
  els.filmMeta.textContent = meta.filter(Boolean).join(', ');
  els.filmTagline.textContent = film.tagline;
  els.filmOverview.textContent = film.overview || 'TMDB has no summary for this one yet.';
  els.filmCast.textContent = film.cast.length
    ? `Starring ${film.cast.slice(0, 5).map((person) => person.name).join(', ')}`
    : '';
  els.filmStatus.textContent = '';

  if (film.trailer) {
    els.filmTrailer.href = `https://www.youtube.com/watch?v=${encodeURIComponent(film.trailer)}`;
    els.filmTrailer.hidden = false;
  }
}

function syncLogControls() {
  const entry = Store.getEntry(app.openKey);
  const rating = entry?.rating || 0;

  els.rating.querySelectorAll('input').forEach((input) => {
    input.checked = Number(input.value) === rating;
  });
  paintStars(rating);
  els.clearRating.hidden = !rating;

  els.toggleWatched.setAttribute('aria-pressed', String(Boolean(entry?.watched)));
  els.toggleWatchlist.setAttribute('aria-pressed', String(Boolean(entry?.watchlist)));
  els.toggleStoop.setAttribute('aria-pressed', String(Store.getTop4().includes(app.openKey)));
  els.filmTake.value = entry?.take || '';
}

function logChange(patch) {
  const film = filmByKey(app.openKey);
  Store.update(film, patch);
  syncLogControls();
  refreshAfterLog();
}

function refreshAfterLog() {
  scheduleSync();
  renderStoop();
  if (!els.sharedStoop.hidden) showSharedStoop();
  updateWatchlistCount();
  if (app.view === 'shelf') renderShelf();
  if (app.view === 'diary') renderDiary();
  if (app.view === 'watchlist') renderWatchlist();
  if (app.view === 'foryou') renderForYou();
}

function handleRating(event) {
  const rating = Number(event.target.value);
  const wasWatched = Store.getEntry(app.openKey)?.watched;
  // Rating a film logs it as watched and takes it off the watchlist, like Letterboxd.
  logChange({ rating, watched: true, watchlist: false });
  toast(`${wasWatched ? 'Rated' : 'Logged'} ${stars(rating)}. ${VERDICTS[rating]}`);
}

function handleClearRating() {
  logChange({ rating: 0 });
  toast('Rating cleared.');
}

function handleToggleWatched() {
  const watched = !Store.getEntry(app.openKey)?.watched;
  logChange(watched ? { watched: true, watchlist: false } : { watched: false, rating: 0 });
  toast(watched ? 'Marked as watched.' : 'Removed from Watched.');
}

function handleToggleWatchlist() {
  const watchlist = !Store.getEntry(app.openKey)?.watchlist;
  logChange({ watchlist });
  toast(watchlist ? 'Added to your watchlist.' : 'Removed from your watchlist.');
}

function handleToggleStoop() {
  const key = app.openKey;
  const top = Store.getTop4();

  if (top.includes(key)) {
    Store.setTop4(top.filter((item) => item !== key));
    logChange({});
    toast('Taken off your stoop.');
    return;
  }
  if (top.length >= 4) {
    toast(STOOP_FULL);
    return;
  }

  // Claim the step first, so the entry counts as worth keeping when it saves.
  Store.setTop4([...top, key]);
  logChange({});
  toast(`On your stoop, step ${top.length + 1}.`);
  if (Classroom.enabled && Store.getProfile().sharing === null) app.askToShare = true;
}

let takeTimer;
function handleTakeInput() {
  clearTimeout(takeTimer);
  const key = app.openKey;
  const take = els.filmTake.value;
  takeTimer = setTimeout(() => {
    Store.update(filmByKey(key), { take: take.trim() });
    if (app.view === 'diary') renderDiary();
  }, 400);
}

function closeDialog() {
  els.dialog.close();
}

/* =========================================================
   For you
   ========================================================= */

async function renderForYou() {
  const entries = Store.entries();
  const stoop = Store.getTop4();
  const watched = new Set(entries.filter((entry) => entry.watched).map((entry) => entry.key));

  // Seeds: everything rated, plus stoop titles even if they haven't been rated.
  const seedList = entries
    .filter((entry) => entry.rating || stoop.includes(entry.key))
    .map((entry) => ({ key: entry.key, rating: entry.rating || 0, onStoop: stoop.includes(entry.key) }));
  const signature = seedList.map((seed) => `${seed.key}=${seed.rating}${seed.onStoop ? '*' : ''}`).sort().join(',') + `|${watched.size}|${shelfKeys().length}`;

  if (seedList.length < 2) {
    app.recsSignature = '';
    app.recsRanked = [];
    els.refreshPicks.hidden = true;
    els.foryouProgress.hidden = true;
    els.recList.replaceChildren();
    els.foryouStatus.classList.remove('is-error');
    els.foryouStatus.replaceChildren(
      seedList.length
        ? 'One down. Rate one more, or put it on your stoop, and your picks show up here. '
        : 'Rate at least two films or shows, or put them on your stoop, and your picks show up here. '
    );
    const go = document.createElement('button');
    go.type = 'button';
    go.className = 'link-button';
    go.textContent = 'Go to the shelf';
    go.addEventListener('click', () => setView('shelf'));
    els.foryouStatus.append(go);
    return;
  }

  if (!app.canonReady) {
    els.refreshPicks.hidden = true;
    els.foryouStatus.textContent = 'Waiting for the shelf to finish loading…';
    return;
  }

  if (signature === app.recsSignature) return;
  app.recsSignature = signature;
  const run = ++app.recsRun;

  els.foryouStatus.classList.remove('is-error');
  els.foryouStatus.textContent = 'Comparing your ratings with the shelf…';
  els.recList.replaceChildren();
  els.refreshPicks.hidden = true;
  app.recsRanked = [];

  const seedResults = await mapLimit(seedList, 6, (seed) => getDetails(seed.key));
  const candidateKeys = shelfKeys().filter((key) => !watched.has(key) && !stoop.includes(key));
  const candidateResults = await mapLimit(candidateKeys, 6, (key) => getDetails(key),
    (done, total) => setProgress(els.foryouProgress, els.foryouProgressBar, done, total));

  if (run !== app.recsRun) return; // a newer rating started a fresh run

  const errors = [...seedResults, ...candidateResults].filter((result) => !result.ok);
  if (errors.some((result) => isAuthError(result.error))) {
    showKeyGate("TMDB stopped accepting the key. Paste a working one to continue.");
    return;
  }

  const seeds = seedResults
    .map((result, index) => (result.ok ? { film: result.value, rating: seedList[index].rating, onStoop: seedList[index].onStoop } : null))
    .filter(Boolean);
  const candidates = candidateResults.filter((result) => result.ok).map((result) => result.value);

  if (!seeds.length || !candidates.length) {
    app.recsSignature = '';
    els.foryouProgress.hidden = true;
    els.foryouStatus.classList.add('is-error');
    els.foryouStatus.textContent = errors.length ? friendlyError(errors[0].error) : "You've watched the whole shelf. Search for more films to keep going.";
    return;
  }

  app.recsRanked = Recommender.rank(seeds, candidates);
  app.recsPage = 0;
  els.foryouStatus.textContent = app.recsRanked.length
    ? ''
    : "Your ratings don't line up with anything left on the shelf yet. Rate a few more films you loved.";
  if (errors.length) toast(`${errors.length} films couldn't be compared this time.`);
  showRecsPage();
}

const PICKS_PER_PAGE = 12;

function showRecsPage() {
  const start = app.recsPage * PICKS_PER_PAGE;
  els.refreshPicks.hidden = !app.recsRanked.length;
  renderRecs(app.recsRanked.slice(start, start + PICKS_PER_PAGE), start);
}

// Refresh steps through the ranked list a batch at a time, then wraps back to the best matches.
function refreshPicks() {
  const total = app.recsRanked.length;
  if (total <= PICKS_PER_PAGE) {
    toast('These are all your matches right now. Rate a few more to get new picks.');
    return;
  }
  const next = app.recsPage + 1;
  if (next * PICKS_PER_PAGE >= total) {
    app.recsPage = 0;
    toast("You've seen every pick. Back to your best matches.");
  } else {
    app.recsPage = next;
    const first = next * PICKS_PER_PAGE + 1;
    toast(`Showing picks ${first} to ${Math.min(first + PICKS_PER_PAGE - 1, total)} of ${total}.`);
  }
  showRecsPage();
}

function renderRecs(picks, offset = 0) {
  const items = picks.map((pick, index) => {
    const li = document.createElement('li');
    li.className = 'rec';

    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'rec-poster';
    open.setAttribute('aria-label', `Open ${filmLabel(pick.film)}`);
    open.append(poster(pick.film, 'w185'));
    open.addEventListener('click', () => openFilm(pick.film.key));

    const body = document.createElement('div');
    body.className = 'rec-body';

    const rank = document.createElement('p');
    rank.className = 'rec-rank';
    rank.textContent = `Pick ${offset + index + 1}`;

    const title = document.createElement('h3');
    const titleButton = document.createElement('button');
    titleButton.type = 'button';
    titleButton.className = 'link-button rec-title';
    titleButton.textContent = pick.film.title;
    titleButton.addEventListener('click', () => openFilm(pick.film.key));
    title.append(titleButton, ` (${pick.film.year})`);
    if (pick.film.type === 'tv') title.append(' ', seriesBadge());

    const reasons = document.createElement('ul');
    reasons.className = 'rec-reasons';
    pick.reasons.forEach((reason) => {
      const item = document.createElement('li');
      item.textContent = reason;
      reasons.append(item);
    });

    const onList = Boolean(Store.getEntry(pick.film.key)?.watchlist);
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'chip';
    save.textContent = 'Watchlist';
    save.setAttribute('aria-pressed', String(onList));
    save.addEventListener('click', () => {
      const next = save.getAttribute('aria-pressed') !== 'true';
      Store.update(pick.film, { watchlist: next });
      save.setAttribute('aria-pressed', String(next));
      updateWatchlistCount();
      toast(next ? 'Added to your watchlist.' : 'Removed from your watchlist.');
    });

    body.append(rank, title, reasons, save);
    li.append(open, body);
    return li;
  });
  els.recList.replaceChildren(...items);
}

/* =========================================================
   Diary and watchlist
   ========================================================= */

function renderDiary() {
  const logged = Store.entries()
    .filter((entry) => entry.watched)
    .sort((a, b) => b.loggedAt - a.loggedAt);

  renderStats(logged);

  if (!logged.length) {
    const empty = document.createElement('p');
    empty.className = 'status';
    empty.textContent = 'Nothing logged yet. Open any film and mark it watched, or just give it a rating.';
    els.diaryList.replaceChildren(empty);
    return;
  }

  const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
  const groups = new Map();
  logged.forEach((entry) => {
    const label = monthFormat.format(new Date(entry.loggedAt));
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(entry);
  });

  const sections = [...groups].map(([label, group]) => {
    const section = document.createElement('section');
    section.className = 'diary-month';
    const heading = document.createElement('h3');
    heading.textContent = label;
    const list = document.createElement('ol');
    list.className = 'stubs';
    group.forEach((entry) => list.append(diaryRow(entry)));
    section.append(heading, list);
    return section;
  });
  els.diaryList.replaceChildren(...sections);
}

// Each logged film renders as a torn movie ticket: date on the stub, film on the ticket.
function diaryRow(entry) {
  const li = document.createElement('li');
  li.className = 'stub';
  const date = new Date(entry.loggedAt);

  const tear = document.createElement('time');
  tear.className = 'stub-date';
  tear.dateTime = date.toISOString().slice(0, 10);
  const month = document.createElement('span');
  month.className = 'stub-month';
  month.textContent = date.toLocaleDateString('en-US', { month: 'short' });
  const day = document.createElement('span');
  day.className = 'stub-day';
  day.textContent = date.getDate();
  tear.append(month, day);

  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'stub-poster';
  open.setAttribute('aria-label', `Open ${filmLabel(entry)}`);
  open.append(poster(entry, 'w92'));
  open.addEventListener('click', () => openFilm(entry.key));

  const body = document.createElement('div');
  body.className = 'stub-body';
  const title = document.createElement('p');
  title.className = 'stub-title';
  title.textContent = filmLabel(entry);
  if (entry.type === 'tv') title.append(' ', seriesBadge());
  body.append(title);

  if (entry.rating) {
    const rating = document.createElement('p');
    rating.className = 'stub-rating';
    const glyphs = document.createElement('span');
    glyphs.className = 'stub-stars';
    glyphs.textContent = stars(entry.rating);
    glyphs.setAttribute('aria-label', `${entry.rating} out of 5`);
    rating.append(glyphs, ` ${VERDICTS[entry.rating]}`);
    body.append(rating);
  }
  if (entry.take) {
    const take = document.createElement('p');
    take.className = 'stub-take';
    take.textContent = `“${entry.take}”`;
    body.append(take);
  }

  li.append(tear, open, body);
  return li;
}

function renderStats(logged) {
  const rated = logged.filter((entry) => entry.rating);
  const average = rated.length ? (rated.reduce((sum, entry) => sum + entry.rating, 0) / rated.length).toFixed(1) : null;

  const decades = new Map();
  logged.filter((entry) => entry.year).forEach((entry) => {
    const decade = Math.floor(entry.year / 10) * 10;
    decades.set(decade, (decades.get(decade) || 0) + 1);
  });
  const topDecade = [...decades].sort((a, b) => b[1] - a[1])[0];

  const stats = [
    ['Watched', String(logged.length)],
    ['Average rating', average ? `${average} of 5` : 'None yet'],
    ['Your decade', topDecade ? `${topDecade[0]}s` : 'None yet']
  ];

  const nodes = stats.flatMap(([term, value]) => {
    const wrap = document.createElement('div');
    const dt = document.createElement('dt');
    dt.textContent = term;
    const dd = document.createElement('dd');
    dd.textContent = value;
    wrap.append(dt, dd);
    return wrap;
  });
  els.diaryStats.replaceChildren(...nodes);
}

function renderWatchlist() {
  const saved = Store.entries().filter((entry) => entry.watchlist);
  renderGrid(els.watchlistGrid, saved);
  els.watchlistStatus.textContent = saved.length
    ? ''
    : 'Your watchlist is empty. Open a film or show and tap "Watchlist" to save it for later.';
}

function updateWatchlistCount() {
  const count = Store.entries().filter((entry) => entry.watchlist).length;
  els.watchlistCount.textContent = count ? String(count) : '';
}

/* =========================================================
   The block (shared stoops in Supabase)
   ========================================================= */

function openShareDialog() {
  els.shareName.value = Store.getProfile().name || '';
  els.shareDialog.showModal();
}

// The share form uses method="dialog", so the clicked button's value becomes returnValue.
function handleShareChoice() {
  const choice = els.shareDialog.returnValue;
  if (choice === 'share') {
    Store.updateProfile({ sharing: true, name: els.shareName.value.trim().slice(0, 40) });
    syncNow();
    toast('Your stoop is on the block.');
  } else if (choice === 'private') {
    const wasSharing = Store.getProfile().sharing === true;
    Store.updateProfile({ sharing: false });
    if (wasSharing) syncNow({ clear: true });
    toast(wasSharing ? 'Taken off the block. Your picks stay on this device.' : 'Kept private. You can share later from The block.');
  } else if (Store.getProfile().sharing === null) {
    // Closed with Escape: treat it as private for now, and don't ask again.
    Store.updateProfile({ sharing: false });
  }
  els.shareDialog.returnValue = '';
  if (app.view === 'block') renderBlock();
}

function snapshot(film) {
  return { key: film.key, type: film.type, title: film.title, year: film.year, poster: film.poster };
}

let syncTimer;
function scheduleSync() {
  if (!Classroom.enabled || Store.getProfile().sharing !== true) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => syncNow(), 1200);
}

// Push this visitor's stoop and ratings to their row. clear: true empties the row.
async function syncNow({ clear = false } = {}) {
  if (!Classroom.enabled) return;
  const profile = Store.getProfile();
  const row = {
    id: profile.id,
    name: clear ? null : profile.name || null,
    top4: clear ? [] : Store.getTop4().map(filmByKey).filter(Boolean).map(snapshot),
    ratings: clear ? [] : Store.entries()
      .filter((entry) => entry.rating)
      .slice(0, 400)
      .map((entry) => ({ ...snapshot(entry), rating: entry.rating })),
    updated_at: new Date().toISOString()
  };

  try {
    await Classroom.save(row);
    app.syncWarned = false;
  } catch {
    if (!app.syncWarned) {
      app.syncWarned = true;
      toast("Couldn't reach the block. Your picks are still saved on this device.");
    }
  }
}

function renderBlockYou() {
  const profile = Store.getProfile();
  els.blockYou.replaceChildren();

  const line = document.createElement('p');
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'link-button';
  button.addEventListener('click', openShareDialog);

  if (profile.sharing === true) {
    line.append(`You're on the block as ${profile.name || 'Anonymous'}. `);
    button.textContent = 'Change name or stop sharing';
  } else {
    line.append("Your stoop isn't on the block yet. ");
    button.textContent = 'Share my stoop';
  }
  line.append(button);
  els.blockYou.append(line);
}

async function renderBlock() {
  renderBlockYou();
  els.blockStatus.classList.remove('is-error');
  els.blockStatus.textContent = 'Walking the block…';
  els.blockRefresh.disabled = true;

  let rows;
  try {
    rows = await Classroom.list();
  } catch (error) {
    els.blockStatus.classList.add('is-error');
    els.blockStatus.textContent = error.kind === 'network'
      ? "Couldn't reach the block. Check your connection and hit Refresh."
      : 'The block is having trouble right now. Hit Refresh in a minute.';
    els.blockRefresh.disabled = false;
    return;
  }
  els.blockRefresh.disabled = false;

  const myId = Store.getProfile().id;
  const stoops = rows.filter((row) => Array.isArray(row.top4) && row.top4.length);
  els.blockStatus.textContent = stoops.length
    ? `${stoops.length} ${stoops.length === 1 ? 'stoop' : 'stoops'} on the block.`
    : 'Nobody has shared a stoop yet. Send the link to your people and check back.';

  renderMostPicked(stoops);
  els.blockGrid.replaceChildren(...stoops.map((row) => blockCard(row, row.id === myId)));
}

// Tally which titles show up on the most stoops.
function renderMostPicked(stoops) {
  const tally = new Map();
  stoops.forEach((row) => {
    row.top4.forEach((film) => {
      const current = tally.get(film.key) || { film, count: 0 };
      current.count++;
      tally.set(film.key, current);
    });
  });

  const top = [...tally.values()].filter((item) => item.count > 1).sort((a, b) => b.count - a.count).slice(0, 6);
  els.blockMost.hidden = top.length === 0;
  els.mostList.replaceChildren(...top.map(({ film, count }) => {
    const li = document.createElement('li');
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'link-button';
    open.textContent = filmLabel(film);
    open.addEventListener('click', () => openSharedFilm(film));
    li.append(open, ` is on ${count} stoops`);
    return li;
  }));
}

function blockCard(row, isMine) {
  const li = document.createElement('li');
  li.className = 'block-card';
  if (isMine) li.classList.add('is-mine');

  const name = document.createElement('h3');
  name.textContent = row.name || 'Anonymous';
  if (isMine) {
    const you = document.createElement('span');
    you.className = 'kind-badge';
    you.textContent = 'You';
    name.append(' ', you);
  }

  const four = document.createElement('ol');
  four.className = 'block-four';
  row.top4.forEach((film) => {
    const item = document.createElement('li');
    const open = document.createElement('button');
    open.type = 'button';
    open.className = 'block-poster';
    open.setAttribute('aria-label', `Open ${filmLabel(film)}`);
    open.append(poster(film, 'w185'));
    open.addEventListener('click', () => openSharedFilm(film));
    item.append(open);
    four.append(item);
  });

  const rated = Array.isArray(row.ratings) ? row.ratings : [];
  const meta = document.createElement('p');
  meta.className = 'block-meta';
  const favorite = [...rated].sort((a, b) => b.rating - a.rating)[0];
  meta.textContent = rated.length
    ? `${rated.length} rated. Highest: ${favorite.title} at ${stars(favorite.rating)}`
    : 'No ratings yet';

  li.append(name, four, meta);
  return li;
}

// A classmate's pick might not be on this visitor's shelf yet, so register it first.
function openSharedFilm(film) {
  if (!app.films.has(film.key)) register(film);
  openFilm(film.key);
}

/* =========================================================
   Views and events
   ========================================================= */

function setView(view) {
  app.view = view;
  els.tabs.querySelectorAll('.tab').forEach((tab) => {
    if (tab.dataset.view === view) tab.setAttribute('aria-current', 'page');
    else tab.removeAttribute('aria-current');
  });
  ['shelf', 'foryou', 'diary', 'watchlist', 'block'].forEach((name) => {
    $(`view-${name}`).hidden = name !== view;
  });

  if (view === 'shelf') renderShelf();
  if (view === 'foryou') renderForYou();
  if (view === 'diary') renderDiary();
  if (view === 'watchlist') renderWatchlist();
  if (view === 'block') renderBlock();
}

function bindEvents() {
  els.keyForm.addEventListener('submit', handleKeySubmit);
  els.resetKey.addEventListener('click', handleResetKey);

  els.tabs.addEventListener('click', (event) => {
    const tab = event.target.closest('.tab');
    if (tab) setView(tab.dataset.view);
  });

  els.eraFilters.addEventListener('click', (event) => {
    const chip = event.target.closest('.chip');
    if (!chip) return;
    setEra(chip.dataset.era);
    renderShelf();
  });

  els.mediaSwitch.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button || button.dataset.media === app.mediaType) return;
    app.mediaType = button.dataset.media;
    els.mediaSwitch.querySelectorAll('button').forEach((item) => {
      item.setAttribute('aria-pressed', String(item === button));
    });
    renderShelf();
  });

  els.hideWatched.addEventListener('change', renderShelf);
  els.searchForm.addEventListener('submit', handleSearch);
  els.shareStoop.addEventListener('click', shareStoop);
  els.sharedClose.addEventListener('click', closeSharedStoop);
  els.addToStoop.addEventListener('click', startAddingToStoop);
  els.pickerForm.addEventListener('submit', handlePickerSubmit);
  els.pickerInput.addEventListener('input', handlePickerInput);
  els.pickerClose.addEventListener('click', () => els.picker.close());
  els.picker.addEventListener('click', (event) => {
    if (event.target === els.picker) els.picker.close(); // click on the backdrop
  });
  els.picker.addEventListener('close', () => {
    clearTimeout(pickerTimer);
    pickerRun++;
    if (app.askToShare) {
      app.askToShare = false;
      openShareDialog();
    }
  });
  els.shareDialog.addEventListener('close', handleShareChoice);
  els.blockRefresh.addEventListener('click', renderBlock);
  els.refreshPicks.addEventListener('click', refreshPicks);

  // One listener for every poster grid on the page.
  document.addEventListener('click', (event) => {
    const card = event.target.closest('.poster-card');
    if (card) openFilm(card.dataset.key);
  });

  els.dialogClose.addEventListener('click', closeDialog);
  els.dialog.addEventListener('click', (event) => {
    if (event.target === els.dialog) closeDialog(); // click on the backdrop
  });
  els.dialog.addEventListener('close', () => {
    if (app.askToShare) {
      app.askToShare = false;
      openShareDialog();
    }
    app.openKey = null;
  });

  els.rating.addEventListener('change', handleRating);

  // Hovering a half star previews that rating; leaving the stars shows the saved one again.
  els.stars.addEventListener('mouseover', (event) => {
    const half = event.target.closest('.star-half');
    if (half) paintStars(Number(half.previousElementSibling.value));
  });
  els.stars.addEventListener('mouseleave', () => {
    paintStars(Store.getEntry(app.openKey)?.rating || 0);
  });
  els.clearRating.addEventListener('click', handleClearRating);
  els.toggleWatched.addEventListener('click', handleToggleWatched);
  els.toggleWatchlist.addEventListener('click', handleToggleWatchlist);
  els.toggleStoop.addEventListener('click', handleToggleStoop);
  els.filmTake.addEventListener('input', handleTakeInput);
}

init();
