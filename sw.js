const CACHE = "dayplanner-shell-v8";
const SCOPE = self.registration.scope;
const ASSETS = [
  "./",
  "./index.html",
  "./cloud",
  "./cloud.js",
  "./manifest.webmanifest",
  "./cloud-manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        ASSETS.map((asset) => cache.add(asset).catch(() => {}))
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

async function cachedFallback(request, candidates) {
  const direct = await caches.match(request);
  if (direct) return direct;
  for (const candidate of candidates) {
    const hit = await caches.match(candidate);
    if (hit) return hit;
  }
  return Response.error();
}

async function networkFirst(request, candidates) {
  try {
    const options =
      request.mode === "navigate" ? { cache: "no-store" } : undefined;
    const response = await fetch(request, options);
    if (response && response.ok) {
      const copy = response.clone();
      caches.open(CACHE).then((cache) => cache.put(request, copy));
      return response;
    }
    return cachedFallback(request, candidates);
  } catch (error) {
    return cachedFallback(request, candidates);
  }
}

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (error) {
    data = { body: event.data ? event.data.text() : "" };
  }

  const options = {
    body: data.body || "Напоминание о задаче",
    icon: data.icon || new URL("icon-192.png", SCOPE).href,
    badge: new URL("icon-192.png", SCOPE).href,
    tag: data.tag || "dayplanner",
    data: { url: data.url || SCOPE },
    vibrate: [200, 100, 200],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "Планер дня", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || SCOPE;

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if ("focus" in client) {
            if ("navigate" in client) client.navigate(target);
            return client.focus();
          }
        }
        return self.clients.openWindow(target);
      })
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  if (event.request.mode === "navigate") {
    const candidates = url.pathname.includes("cloud")
      ? ["./cloud", "./index.html", "./"]
      : ["./index.html", "./", "./cloud"];
    event.respondWith(networkFirst(event.request, candidates));
    return;
  }

  if (url.pathname.endsWith("/cloud.js") || url.pathname.endsWith("/sw.js")) {
    event.respondWith(networkFirst(event.request, [event.request]));
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
