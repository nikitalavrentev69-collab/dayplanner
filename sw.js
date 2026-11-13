const CACHE = "dayplanner-shell-v10";
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

  const icon = data.icon || new URL("icon-192.png", SCOPE).href;
  const options = {
    body: data.body || "Напоминание о задаче",
    icon,
    badge: icon,
    tag: data.tag || "dayplanner",
    data: {
      url: data.url || SCOPE,
      taskId: data.task_id || "",
      token: data.action_token || "",
      actionUrl: data.action_url || "",
      icon,
    },
    vibrate: [200, 100, 200],
  };
  if (data.action_token && data.action_url) {
    options.actions = [
      { action: "done", title: "Выполнено" },
      { action: "snooze", title: "+10 минут" },
    ];
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Планер дня", options)
  );
});

async function openApp(target) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  });
  for (const client of clients) {
    if ("focus" in client) {
      if ("navigate" in client) client.navigate(target);
      return client.focus();
    }
  }
  return self.clients.openWindow(target);
}

async function handleAction(action, data) {
  const icon = data.icon || new URL("icon-192.png", SCOPE).href;
  try {
    const response = await fetch(data.actionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.token, action }),
    });
    if (!response.ok) throw new Error("action failed");
    await self.registration.showNotification(
      action === "done" ? "Готово" : "Отложено",
      {
        body: action === "done"
          ? "Задача отмечена выполненной."
          : "Напомним через 10 минут.",
        icon,
        badge: icon,
        tag: `dayplanner-action-${data.taskId || "task"}`,
        data: { url: data.url || SCOPE },
        silent: true,
      },
    );
  } catch (error) {
    await self.registration.showNotification("Не удалось обновить задачу", {
      body: "Откройте планер и попробуйте ещё раз.",
      icon,
      badge: icon,
      tag: `dayplanner-action-${data.taskId || "task"}`,
      data: { url: data.url || SCOPE },
    });
  }
}

self.addEventListener("notificationclick", (event) => {
  const data = event.notification.data || {};
  if (
    (event.action === "done" || event.action === "snooze") &&
    data.token &&
    data.actionUrl
  ) {
    event.notification.close();
    event.waitUntil(handleAction(event.action, data));
    return;
  }

  event.notification.close();
  event.waitUntil(openApp(data.url || SCOPE));
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
