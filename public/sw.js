/* Service Worker لكرنفال الأطفال 2027 - دعم الأوفلاين الميداني */
const CACHE_VERSION = 'carnival-2027-v1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const STATIC_CACHE = `${CACHE_VERSION}-static`;

const PRECACHE_URLS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

const OFFLINE_FALLBACK_HTML = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>وضع الأوفلاين - كرنفال الأطفال 2027</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0B101E;
      color: #F8FAFC;
      font-family: system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif;
      padding: 24px;
      text-align: center;
    }
    .card {
      max-width: 380px;
      width: 100%;
      background: #12192B;
      border: 1px solid #334155;
      border-radius: 24px;
      padding: 28px 22px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.45);
    }
    h1 { font-size: 20px; margin: 0 0 10px; color: #F59E0B; }
    p { font-size: 14px; line-height: 1.7; color: #CBD5E1; margin: 0 0 20px; }
    button {
      width: 100%;
      min-height: 46px;
      border: none;
      border-radius: 14px;
      background: #EA580C;
      color: #FFFFFF;
      font-weight: 800;
      font-size: 14px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>لا يوجد اتصال بالإنترنت حالياً</h1>
    <p>تعذر تحميل هذه الصفحة لأول مرة بدون إنترنت. فور عودة الاتصال سيتم تحميل التطبيق وحفظه تلقائياً للعمل أوفلاين عند البوابة.</p>
    <button onclick="window.location.reload()">إعادة المحاولة</button>
  </div>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) =>
        Promise.allSettled(
          PRECACHE_URLS.map((url) =>
            cache.add(new Request(url, { cache: 'reload' })).catch(() => undefined)
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== STATIC_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsList) => {
      for (const client of clientsList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
      return undefined;
    })
  );
});

function shouldBypassRequest(url, request) {
  if (request.method !== 'GET') return true;
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return true;

  // لا نخزن أبداً استدعاءات API أو Firebase/Firestore لضمان دقة فحص الاتصال والمزامنة اللحظية
  if (url.pathname.startsWith('/api/')) return true;
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('securetoken.googleapis.com') ||
    url.hostname.includes('firebaseio.com')
  ) {
    return true;
  }

  return false;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldBypassRequest(url, request)) {
    return;
  }

  // 1. صفحات التنقل (HTML): Network-First مع سقوط تلقائي للنسخة المخزنة عند انقطاع الإنترنت
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy)).catch(() => undefined);
          }
          return response;
        })
        .catch(async () => {
          const cachedExact = await caches.match(request);
          if (cachedExact) return cachedExact;
          const cachedRoot = await caches.match('/');
          if (cachedRoot) return cachedRoot;
          return new Response(OFFLINE_FALLBACK_HTML, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          });
        })
    );
    return;
  }

  // 2. ملفات Next.js الثابتة، الخطوط، والأيقونات: Stale-While-Revalidate
  const isSameOriginStatic =
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      /\.(?:js|css|png|jpg|jpeg|webp|svg|ico|woff2?)$/i.test(url.pathname) ||
      url.pathname === '/manifest.webmanifest');

  const isGoogleFont =
    url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';

  if (isSameOriginStatic || isGoogleFont) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        const networkPromise = fetch(request)
          .then((response) => {
            if (response && (response.ok || response.type === 'opaque')) {
              cache.put(request, response.clone()).catch(() => undefined);
            }
            return response;
          })
          .catch(() => undefined);

        return cached || (await networkPromise) || new Response('', { status: 503 });
      })
    );
  }
});
