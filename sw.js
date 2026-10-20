const V = "cd-v6";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== V).map(k => caches.delete(k)))).then(() => self.clients.claim())
));
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && r.status === 200) { const c = r.clone(); caches.open(V).then(ch => ch.put(e.request, c)).catch(() => {}); }
      return r;
    }).catch(() => caches.match(e.request))
  );
});
