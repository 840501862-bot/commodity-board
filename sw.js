/* 页面缓存：让打开/刷新直接命中本地缓存，后台静默更新，不再等 GitHub Pages 首字节 */
const CACHE = "commodity-board-v4";
const PAGE = "index.html";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      c.add(new Request(PAGE, { cache: "no-store" })).catch(() => {})
    )
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function refreshInBackground(req) {
  try {
    const res = await fetch(req, { cache: "no-store" });
    if (res && res.ok) {
      const c = await caches.open(CACHE);
      await c.put(new Request(PAGE), res.clone());
    }
  } catch (err) {}
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const isPage = req.mode === "navigate" || /(\/|\/index\.html)(\?.*)?$/.test(req.url);
  if (!isPage) return;                       // 币安接口等跨域请求一律不接管

  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const cached = await c.match(new Request(PAGE));
    if (cached) {
      e.waitUntil(refreshInBackground(req));   // 秒开 + 后台静默更新
      return cached;
    }
    try {
      const res = await fetch(req, { cache: "no-store" });
      if (res && res.ok) await c.put(new Request(PAGE), res.clone());
      return res;
    } catch (err) {
      return new Response("页面暂不可用，请检查网络后重试", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8" }
      });
    }
  })());
});
