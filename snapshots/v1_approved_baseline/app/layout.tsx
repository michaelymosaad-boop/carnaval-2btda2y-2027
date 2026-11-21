import type { Metadata, Viewport } from 'next';
import { Cairo, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const cairo = Cairo({
  subsets: ['arabic', 'latin'],
  weight: ['400', '600', '700', '800'],
  variable: '--font-cairo',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  themeColor: '#0B101E',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: 'كرنفال الأطفال 2027 - المنظومة الميدانية',
  description:
    'تطبيق ويب تقدمي (PWA) لإدارة كرنفال الأطفال ليوم واحد (السبت 30 يناير 2027) يشمل تسجيل الخدام والمخدومين، المسح بالـ QR أوفلاين، حساب النقاط، وإدارة الطوارئ.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'كرنفال 2027',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'كرنفال الأطفال 2027 - المنظومة الميدانية',
    description:
      'تطبيق ويب تقدمي (PWA) لإدارة كرنفال الأطفال ليوم واحد (السبت 30 يناير 2027) يشمل تسجيل الخدام والمخدومين، المسح بالـ QR أوفلاين، حساب النقاط، وإدارة الطوارئ.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'كرنفال الأطفال 2027 - المنظومة الميدانية',
    description:
      'تطبيق ويب تقدمي (PWA) لإدارة كرنفال الأطفال ليوم واحد (السبت 30 يناير 2027) يشمل تسجيل الخدام والمخدومين، المسح بالـ QR أوفلاين، حساب النقاط، وإدارة الطوارئ.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${cairo.variable} ${jetbrainsMono.variable} dark`}>
      <body
        suppressHydrationWarning
        className="font-[family-name:var(--font-cairo)] antialiased selection:bg-orange-500 selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
