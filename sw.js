/* Shreenath Solar Quotations - offline service worker (GitHub Pages: /shreenath-solar-quotation/).
   Everything the app needs (page, PDF engine, logo, images) is inside index.html,
   so caching these few files makes the whole app work with no internet. */
const CACHE = "shreenath-quotes-gh-v1";
const ASSETS = [
  "./",
  "./manifest.json",
  "./index.html",
  "./icon-192.png",
  "./icon-512.png",
  "./maskable-192.png",
  "./maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-48.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: "reload" }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const withTimeout = (promise, ms) => new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error("timeout")), ms);
  promise.then(v => { clearTimeout(t); resolve(v); }, e => { clearTimeout(t); reject(e); });
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // The app page: try the network briefly (to pick up updates), otherwise use the saved copy.
  if (req.mode === "navigate") {
    event.respondWith(
      withTimeout(fetch(req), 4000)
        .then(res => {
          const isApp = /\/(index\.html)?$/.test(url.pathname);
          if (isApp && res && res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put("./", copy));
          }
          return res;
        })
        .catch(() => caches.match("./").then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Everything else: saved copy first, network only if missing.
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }))
  );
});
