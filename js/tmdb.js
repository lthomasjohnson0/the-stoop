/*
 * TMDB client for films and shows. Every request goes through get(), which turns
 * HTTP and network problems into a TmdbError with a kind the UI can explain.
 *
 * A film and a show can share the same TMDB id, so every title gets a key
 * like "movie:603" or "tv:1399" and the rest of the app uses that.
 */
const TMDB = (() => {
  const API_ROOT = 'https://api.themoviedb.org/3';
  const IMAGE_ROOT = 'https://image.tmdb.org/t/p/';
  let apiKey = '';

  class TmdbError extends Error {
    constructor(kind, status) {
      super(kind);
      this.kind = kind; // 'auth', 'network', 'http', 'notfound'
      this.status = status;
    }
  }

  function setKey(key) {
    apiKey = key.trim();
  }

  // v4 "Read Access Tokens" are long JWTs and go in a header; v3 keys go in the URL.
  function isToken(key) {
    return key.length > 60;
  }

  async function get(path, params = {}) {
    const url = new URL(API_ROOT + path);
    const headers = { accept: 'application/json' };

    if (isToken(apiKey)) {
      headers.Authorization = `Bearer ${apiKey}`;
    } else {
      url.searchParams.set('api_key', apiKey);
    }

    Object.entries(params).forEach(([name, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(name, value);
      }
    });

    let response;
    try {
      response = await fetch(url, { headers });
    } catch {
      throw new TmdbError('network', 0);
    }

    if (response.status === 401) throw new TmdbError('auth', 401);
    if (response.status === 404) throw new TmdbError('notfound', 404);
    if (!response.ok) throw new TmdbError('http', response.status);
    return response.json();
  }

  function image(path, size = 'w342') {
    return path ? `${IMAGE_ROOT}${size}${path}` : null;
  }

  function releaseYear(item) {
    return Number((item.release_date || item.first_air_date || '').slice(0, 4)) || null;
  }

  function trimSummary(item, type) {
    return {
      key: `${type}:${item.id}`,
      id: item.id,
      type,
      title: item.title || item.name,
      year: releaseYear(item),
      poster: item.poster_path || null,
      backdrop: item.backdrop_path || null,
      overview: item.overview || '',
      genres: item.genre_ids || (item.genres || []).map((genre) => genre.id)
    };
  }

  function trimDetails(item, type) {
    const isShow = type === 'tv';
    const crew = item.credits?.crew || [];
    const cast = item.credits?.cast || [];
    const keywords = (isShow ? item.keywords?.results : item.keywords?.keywords) || [];
    const recs = item.recommendations?.results || [];
    const videos = item.videos?.results || [];
    const trailer = videos.find((video) => video.site === 'YouTube' && video.type === 'Trailer');

    // "Makers" are directors for a film and creators for a show.
    const makers = isShow
      ? (item.created_by || []).map(({ id, name }) => ({ id, name }))
      : crew.filter((person) => person.job === 'Director').map(({ id, name }) => ({ id, name }));

    return {
      ...trimSummary(item, type),
      runtime: isShow ? null : item.runtime || null,
      seasons: isShow ? item.number_of_seasons || null : null,
      tagline: item.tagline || '',
      makers,
      cast: cast.slice(0, 8).map(({ id, name, character }) => ({ id, name, character })),
      keywords: keywords.slice(0, 25).map(({ id, name }) => ({ id, name })),
      recs: recs.slice(0, 20).map((rec) => `${type}:${rec.id}`),
      trailer: trailer ? trailer.key : null,
      hasDetails: true,
      fetchedAt: Date.now()
    };
  }

  // Match a title and year to TMDB, loosening the year filter if nothing comes back.
  async function findTitle(type, title, year) {
    const attempts = type === 'tv'
      ? [{ query: title, first_air_date_year: year }, { query: title }]
      : [{ query: title, primary_release_year: year }, { query: title, year }, { query: title }];

    for (const params of attempts) {
      const data = await get(`/search/${type}`, { ...params, include_adult: 'false' });
      const results = data.results || [];
      if (results.length) {
        const closest = [...results].sort((a, b) => yearGap(a, year) - yearGap(b, year))[0];
        return trimSummary(closest, type);
      }
    }
    return null;
  }

  function yearGap(item, year) {
    const released = releaseYear(item);
    return released ? Math.abs(released - year) : 999;
  }

  // Search films and shows at once.
  async function search(query) {
    const data = await get('/search/multi', { query, include_adult: 'false' });
    return (data.results || [])
      .filter((item) => item.media_type === 'movie' || item.media_type === 'tv')
      .slice(0, 20)
      .map((item) => trimSummary(item, item.media_type));
  }

  async function details(type, id) {
    const item = await get(`/${type}/${id}`, { append_to_response: 'credits,keywords,recommendations,videos' });
    return trimDetails(item, type);
  }

  async function verifyKey() {
    await get('/configuration');
  }

  return { TmdbError, setKey, image, findTitle, search, details, verifyKey };
})();

// TMDB genre ids are stable, so they live here instead of costing a request.
// Films and shows share most ids; the 107xx ones are TV-only.
const GENRES = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance',
  878: 'Science fiction', 10770: 'TV movie', 53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action and adventure', 10762: 'Kids', 10763: 'News', 10764: 'Reality',
  10765: 'Sci-fi and fantasy', 10766: 'Soap', 10767: 'Talk', 10768: 'War and politics'
};
