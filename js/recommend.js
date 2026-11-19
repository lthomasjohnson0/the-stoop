/*
 * Recommender. Think of it like a friend on the stoop who remembers what you said
 * about every movie: each film you rated pulls candidates toward it if they share
 * a director or creator, actors, themes (TMDB keywords), or genres. Ratings above 3 stars
 * pull, ratings below push away. Titles on your stoop are your declared favorites, so they
 * pull harder than any rating, whether or not you rated them.
 *
 * Every pick explains itself in at most two short lines: which title you rated led to it
 * and what the two have in common, then one more supporting connection if there is one.
 */
const Recommender = (() => {
  const WEIGHTS = {
    maker: 5,
    castEach: 2,
    castMax: 3,
    keywordEach: 0.8,
    keywordMax: 5,
    genreEach: 0.5,
    tmdbRec: 3
  };

  // A rating counts as "rated well" for the second line at this many stars or more.
  const LIKED = 3.5;

  // A stoop title pulls 1.5 times as hard as a 5-star rating.
  const STOOP_WEIGHT = 3.75;

  // TMDB tags that describe how a film was made or released, not what it is about.
  const META_KEYWORDS = new Set([
    'woman director', 'duringcreditsstinger', 'aftercreditsstinger', 'based on novel or book',
    'based on comic', 'based on play or musical', 'based on short story', 'independent film',
    'black and white', 'sequel', 'remake', 'biography', 'anthology', 'miniseries',
    'live action remake', 'directorial debut', 'duringcreditsstingers', 'aftercreditsstingers'
  ]);

  // 5 stars => 2.5, 4 => 1.5, 3 => 0.5, 2 => -0.5, 1 => -1.5. On the stoop => 3.75.
  function seedWeight(rating, onStoop) {
    return onStoop ? STOOP_WEIGHT : rating - 2.5;
  }

  function overlap(listA, listB, key = 'id') {
    const ids = new Set(listB.map((item) => item[key]));
    return listA.filter((item) => ids.has(item[key]));
  }

  function compare(seed, candidate) {
    const factors = [];

    // Same director (film) or creator (show). People ids are shared, so this crosses over.
    const makers = overlap(candidate.makers, seed.makers);
    if (makers.length) {
      factors.push({ type: 'maker', points: WEIGHTS.maker, names: makers.map((m) => m.name) });
    }

    const cast = overlap(candidate.cast, seed.cast).slice(0, WEIGHTS.castMax);
    if (cast.length) {
      factors.push({ type: 'cast', points: cast.length * WEIGHTS.castEach, names: cast.map((c) => c.name) });
    }

    if (seed.recs.includes(candidate.key)) {
      factors.push({ type: 'tmdb', points: WEIGHTS.tmdbRec });
    }

    const keywords = overlap(candidate.keywords, seed.keywords);
    if (keywords.length) {
      const points = Math.min(WEIGHTS.keywordMax, keywords.length * WEIGHTS.keywordEach);
      factors.push({ type: 'keyword', points, names: keywords.map((k) => k.name) });
    }

    const genres = candidate.genres.filter((genre) => seed.genres.includes(genre));
    if (genres.length) {
      factors.push({ type: 'genre', points: genres.length * WEIGHTS.genreEach, names: genres.map((g) => GENRES[g]).filter(Boolean) });
    }

    return factors;
  }

  /* ---------- Wording ---------- */

  function listNames(names) {
    if (names.length <= 1) return names[0] || '';
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  function starText(rating) {
    return `${rating} star${rating === 1 ? '' : 's'}`;
  }

  function themes(factor) {
    return factor.names.filter((name) => !META_KEYWORDS.has(name.toLowerCase())).slice(0, 2);
  }

  // A factor is worth saying out loud only if it has something specific to name.
  function sayable(factor) {
    if (factor.type === 'keyword') return themes(factor).length > 0;
    if (factor.type === 'genre') return factor.names.length > 0;
    return true;
  }

  function makerVerb(seed, candidate) {
    if (seed.type === 'movie' && candidate.type === 'movie') return 'directed';
    if (seed.type === 'tv' && candidate.type === 'tv') return 'created';
    return 'made';
  }

  // Follows "You gave <title> N stars." so it can say "both".
  function sharedWith(factor, seed, candidate) {
    switch (factor.type) {
      case 'maker':
        return `${listNames(factor.names)} ${makerVerb(seed, candidate)} both.`;
      case 'cast': {
        const names = factor.names.slice(0, 2);
        return `${listNames(names)} ${names.length > 1 ? 'are' : 'is'} in both.`;
      }
      case 'tmdb':
        return 'Fans of it often watch this one next.';
      case 'keyword':
        return `Both deal with ${listNames(themes(factor))}.`;
      case 'genre':
        return `Same genre: ${factor.names[0].toLowerCase()}.`;
      default:
        return '';
    }
  }

  // How the visitor feels about a title, as the opening of the first line.
  function standing(link) {
    return link.onStoop
      ? `${link.seed.title} is on your stoop.`
      : `You gave ${link.seed.title} ${starText(link.rating)}.`;
  }

  // A second title you like, named on its own line.
  function alsoLike(factor, link) {
    const { seed } = link;
    const title = `${seed.title} (${link.onStoop ? 'on your stoop' : starText(link.rating)})`;
    switch (factor.type) {
      case 'maker':
        return `${listNames(factor.names)} also made ${title}.`;
      case 'cast': {
        const names = factor.names.slice(0, 2);
        return `${listNames(names)} ${names.length > 1 ? 'are' : 'is'} also in ${title}.`;
      }
      case 'tmdb':
        return `Fans of ${title} often watch it too.`;
      case 'keyword':
        return `Like ${title}, it deals with ${listNames(themes(factor))}.`;
      default:
        return '';
    }
  }

  /*
   * links: one per rated title that pulled this candidate up, strongest first,
   * each with its sayable factors strongest first.
   */
  function explain(candidate, links) {
    const [top, ...rest] = links;
    if (!top) return [];

    const lead = top.factors[0];
    const reasons = [`${standing(top)} ${sharedWith(lead, top.seed, candidate)}`];

    // Prefer a second title you liked, so the pick rests on more than one rating.
    for (const link of rest) {
      if (!link.onStoop && link.rating < LIKED) continue;
      const factor = link.factors.find((f) => f.type !== 'genre');
      if (factor) {
        reasons.push(alsoLike(factor, link));
        return reasons;
      }
    }

    // Otherwise add a different kind of connection to the same title. Genre alone is too thin.
    const extra = top.factors.find((f) => f.type !== lead.type && f.type !== 'genre');
    if (extra) reasons.push(sharedWith(extra, top.seed, candidate));
    return reasons;
  }

  /*
   * seeds: [{ film: details, rating, onStoop }]
   * candidates: [details]
   * returns: [{ film, score, reasons: [string] }] best first
   */
  function rank(seeds, candidates) {
    const results = candidates.map((candidate) => {
      let score = 0;
      const links = [];

      seeds.forEach(({ film: seed, rating, onStoop }) => {
        const weight = seedWeight(rating, onStoop);
        let pull = 0;
        const factors = [];
        compare(seed, candidate).forEach((factor) => {
          const points = factor.points * weight;
          score += points;
          if (points > 0) {
            pull += points;
            if (sayable(factor)) factors.push({ ...factor, points });
          }
        });
        if (pull > 0 && factors.length) {
          factors.sort((a, b) => b.points - a.points);
          links.push({ seed, rating, onStoop: Boolean(onStoop), pull, factors });
        }
      });

      links.sort((a, b) => b.pull - a.pull);
      return { film: candidate, score, reasons: explain(candidate, links) };
    });

    return results
      .filter((result) => result.score > 0 && result.reasons.length)
      .sort((a, b) => b.score - a.score);
  }

  return { rank };
})();
