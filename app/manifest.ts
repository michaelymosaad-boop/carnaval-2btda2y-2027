import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: 'كرنفال الأطفال 2027 - المنظومة الميدانية',
    short_name: 'كرنفال 2027',
    description:
      'تطبيق ويب تقدمي (PWA) لإدارة كرنفال الأطفال ليوم واحد (الخميس 04 فبراير 2027) يشمل تسجيل الخدام والمخدومين، المسح بالـ QR أوفلاين، حساب النقاط، وإدارة الطوارئ.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0B101E',
    theme_color: '#EA580C',
    dir: 'rtl',
    lang: 'ar',
    icons: [
      {
        src: '/pwa-192x192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/pwa-maskable-512x512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
