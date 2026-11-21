import type { Metadata, Viewport } from 'next';
import { Cairo } from 'next/font/google';
import './globals.css';
import { ServiceWorkerRegistrar } from '@/components/pwa/ServiceWorkerRegistrar';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-cairo',
});

export const viewport: Viewport = {
  themeColor: '#EA580C',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'كرنفال الأطفال 2027 - المنظومة الميدانية',
  description:
    'تطبيق ويب تقدمي (PWA) لإدارة كرنفال الأطفال ليوم واحد (الخميس 04 فبراير 2027) يشمل تسجيل الخدام والمخدومين، المسح بالـ QR أوفلاين، حساب النقاط، وإدارة الطوارئ.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'كرنفال 2027',
  },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    title: 'كرنفال الأطفال 2027 - المنظومة الميدانية',
    description:
      'تطبيق ويب تقدمي (PWA) لإدارة كرنفال الأطفال ليوم واحد (الخميس 04 فبراير 2027) يشمل تسجيل الخدام والمخدومين، المسح بالـ QR أوفلاين، حساب النقاط، وإدارة الطوارئ.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'كرنفال الأطفال 2027 - المنظومة الميدانية',
    description:
      'تطبيق ويب تقدمي (PWA) لإدارة كرنفال الأطفال ليوم واحد (الخميس 04 فبراير 2027) يشمل تسجيل الخدام والمخدومين، المسح بالـ QR أوفلاين، حساب النقاط، وإدارة الطوارئ.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`overflow-x-hidden ${cairo.variable}`}>
      <body
        suppressHydrationWarning
        className={`${cairo.className} font-sans antialiased selection:bg-orange-500 selection:text-white min-h-screen overflow-x-hidden w-full max-w-full`}
      >
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}

