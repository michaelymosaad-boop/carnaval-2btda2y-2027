'use client';

import { useEffect } from 'react';

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    let isUnmounted = false;
    let registrationRef: ServiceWorkerRegistration | null = null;

    const registerSw = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none',
        });
        if (isUnmounted) return;
        registrationRef = registration;

        // تفعيل النسخة المحدثة بسلاسة عند جاهزيتها
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing;
          if (!installing) return;
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              installing.postMessage({ type: 'SKIP_WAITING' });
            }
          });
        });
      } catch {
        // فشل التسجيل في بعض المتصفحات الخاصة أو البيئات المقيدة لا يعيق عمل التطبيق
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && registrationRef) {
        registrationRef.update().catch(() => undefined);
      }
    };

    if (document.readyState === 'complete') {
      registerSw();
    } else {
      window.addEventListener('load', registerSw, { once: true });
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isUnmounted = true;
      window.removeEventListener('load', registerSw);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return null;
}
