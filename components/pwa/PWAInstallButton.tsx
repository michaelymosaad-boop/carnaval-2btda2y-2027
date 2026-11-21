'use client';

import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '@/hooks/use-pwa';

export const PWAInstallButton: React.FC<{ isLight?: boolean }> = ({ isLight = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowGuide(true);
          }
        }}
        aria-label="تثبيت التطبيق على الموبايل"
        title="تثبيت التطبيق على شاشة الموبايل (PWA)"
        className={`min-h-[36px] px-2.5 sm:px-3 rounded-full flex items-center justify-center gap-1.5 text-[11px] font-extrabold transition-all shrink-0 cursor-pointer border shadow-xs active:scale-95 whitespace-nowrap ${
          isLight
            ? 'bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100 hover:border-orange-400'
            : 'bg-orange-500/20 text-amber-300 border-orange-500/40 hover:bg-orange-500/30'
        }`}
      >
        <Download className="w-3.5 h-3.5 shrink-0" />
        <span>تثبيت</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl p-6 border shadow-2xl ${
              isLight
                ? 'bg-white border-slate-200 text-slate-900'
                : 'bg-[#111827] border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/20">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-bold">تثبيت تطبيق الكرنفال على الموبايل</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg hover:bg-slate-500/10"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm leading-relaxed">
              <p className={isLight ? 'text-slate-600' : 'text-slate-300'}>
                تطبيق الكرنفال يعمل كتطبيق ويب تقدمي (PWA) بدون متجر تطبيقات لحفظ المسح والعمل أوفلاين يوم الحدث:
              </p>
              {isIOS ? (
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>اضغط على زر المشاركة (Share) في متصفح Safari بالأسفل.</li>
                  <li>اختر «إضافة إلى الشاشة الرئيسية» (Add to Home Screen).</li>
                  <li>اضغط «إضافة» ليظهر التطبيق فوراً على شاشة هاتفك.</li>
                </ol>
              ) : (
                <ol className="list-decimal list-inside space-y-2 font-medium">
                  <li>افتح قائمة المتصفح (النقاط الثلاث أعلى الشاشة في Chrome).</li>
                  <li>اختر «تثبيت التطبيق» (Install App) أو «الإضافة إلى الشاشة الرئيسية».</li>
                  <li>سيعمل التطبيق بملء الشاشة ويدعم تخزين المسح أوفلاين.</li>
                </ol>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-6 w-full min-h-[48px] rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm transition-colors cursor-pointer"
            >
              فهمت، إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};
