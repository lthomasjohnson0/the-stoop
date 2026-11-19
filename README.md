# The Stoop

A Letterboxd-style diary and recommendation site for Black cinema. Letterboxd only logs movies, but The Stoop logs shows too. You pick from a hand-picked shelf of 147 Black films (1920 through 2026, including a blaxploitation run and Black parody films) and 55 Black shows (1972 to now). Rate them in half stars and log them as ticket stubs. Keep your four favorites on the stoop, and get recommendations that explain why each one was picked.

![Screenshot of The Stoop](docs/screenshot.png)
<!-- TODO: add a screenshot at docs/screenshot.png -->

## APIs used

| API | Type | What it does here |
| --- | --- | --- |
| TMDB (The Movie Database) | Data | Matches the shelf to real films and shows. Pulls posters, backdrops, cast, directors and show creators, keywords, trailers, and TMDB's own recommendations. Also powers search across films and shows. |
| Supabase (REST API) | Data | Powers The block. People who choose to share get their top four and ratings saved to a shared table, and everyone's stoops show up side by side with a Most picked tally. Optional. |
| Web Storage (localStorage) | Browser | Saves your ratings, diary, watchlist, takes, and top four between visits. |
| Web Share + Clipboard | Browser | "Share my stoop" opens the share sheet, or copies your four to the clipboard if sharing isn't available. |
| HTML Drag and Drop | Browser | Drag a favorite onto another step to reorder your stoop. |
| Web App Manifest + Service Worker | Browser | Lets The Stoop install as an app with its own icon, open full screen, and load its own files offline. |

## Running it locally

There's no build step. It's plain HTML, CSS, and JavaScript.

1. Clone the repo:

   ```sh
   git clone https://github.com/lthomasjohnson0/the-stoop.git
   cd the-stoop
   ```

2. Create your config file from the example:

   ```sh
   cp js/config.example.js js/config.js
   ```

3. Open `js/config.js` and paste in your TMDB API key. You can get a free one at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api). Use the v3 "API Key", the shorter one. Add a Supabase URL and publishable key too if you want The block. Otherwise leave those empty.

   `js/config.js` is in `.gitignore`, so your keys stay on your machine.

4. Serve the folder with any static server, for example:

   ```sh
   python -m http.server 8000
   ```

   Then open <http://localhost:8000>. VS Code Live Server works too. Opening `index.html` directly also works, but the app install and offline mode need a server.

If you skip the config step, the site still runs. It asks you to paste a TMDB key on first load and keeps it in that browser only.

## How recommendations work

Every film you rate pulls the unwatched shelf toward it. A match counts for more when it shares a director or show creator, actors, TMDB keywords (themes like "coming of age"), or genres, or when it shows up in TMDB's recommendations for that film. Ratings above 3 stars pull, and ratings below push away. Titles on your stoop count as your favorites. They pull 1.5 times as hard as a 5-star rating, even if you haven't rated them. People ids are shared across films and shows, so a show you love can recommend a film and the other way around. Each pick keeps the reasons it scored well, and the site shows them.

## Installing it as an app

The Stoop is a progressive web app. Once it's served over HTTPS, it can be installed:

- **Android, Chrome, Edge:** tap **Install the app** in the footer, or use the install icon in the address bar.
- **iPhone and iPad (Safari):** tap Share, then **Add to Home Screen**.

When the list of app files changes, bump `VERSION` in `sw.js` so installed copies refresh their cache.

---

This product uses the TMDB API but is not endorsed or certified by TMDB.
