'use strict';

/*
 * App install support: registers the service worker and, where the browser allows it
 * (Chrome, Edge, Android), shows an "Install the app" button in the footer.
 * Safari on iPhone has no install prompt; there it's Share, then Add to Home Screen.
 */
(() => {
  if ('serviceWorker' in navigator && location.protocol !== 'file:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {
        // The site works the same without it; it just can't install or open offline.
      });
    });
  }

  const button = document.getElementById('install-app');
  if (!button) return;
  let installPrompt = null;

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    installPrompt = event;
    button.hidden = false;
  });

  button.addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => null);
    installPrompt = null;
    button.hidden = true;
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    button.hidden = true;
  });
})();
