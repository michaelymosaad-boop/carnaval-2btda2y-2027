'use client';

import React, { useRef, useState } from 'react';
import { Sparkles, Upload, Church, CheckCircle2, Loader2 } from 'lucide-react';
import { compressImageFileToDataUrl, type AxisItem, type Edition } from '@/lib/carnival-store';

interface CarnivalEmblemProps {
  edition: Edition;
  axes: AxisItem[];
  isLight: boolean;
  isSavingLogo: boolean;
  lastSavedTarget: 'church' | 'carnival' | null;
  onLogoUpload: (target: 'church' | 'carnival', dataUrl: string) => Promise<void>;
}

export const CarnivalEmblem: React.FC<CarnivalEmblemProps> = ({
  edition,
  axes,
  isLight,
  isSavingLogo,
  lastSavedTarget,
  onLogoUpload,
}) => {
  const churchInputRef = useRef<HTMLInputElement | null>(null);
  const carnivalInputRef = useRef<HTMLInputElement | null>(null);
  const [carnivalImgError, setCarnivalImgError] = useState(false);

  const handleFileSelect = async (
    target: 'church' | 'carnival',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFileToDataUrl(file, 512);
      if (target === 'carnival') {
        setCarnivalImgError(false);
      }
      await onLogoUpload(target, compressedDataUrl);
    } finally {
      e.target.value = '';
    }
  };

  const activeCarnivalLogo = edition.carnival_logo_url || '/assets/reflection_carnival_logo.jpg';

  return (
    <div className="space-y-5">
      {/* شريط الهوية الرسمي الثلاثي: لوجو الكنيسة (يمين) | اسم الكنيسة والخدمة (المنتصف) | لوجو الخدمة/الكرنفال (يسار) */}
      <div
        className={`rounded-3xl p-4 sm:p-5 border transition-all ${
          isLight
            ? 'bg-white border-amber-200/90 shadow-lg shadow-amber-500/5'
            : 'bg-[#12192B]/95 border-slate-800 shadow-xl'
        }`}
      >
        <div className="flex items-center justify-between gap-3 sm:gap-5">
          {/* اليمين: لوجو الكنيسة (متغير ويُحفظ في الداتابيز) */}
          <div className="flex flex-col items-center shrink-0">
            <input
              ref={churchInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect('church', e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => churchInputRef.current?.click()}
              title="اضغط لرفع أو تغيير لوجو الكنيسة وحفظه في الداتابيز"
              className={`group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 flex flex-col items-center justify-center overflow-hidden transition-all cursor-pointer ${
                isLight
                  ? 'bg-amber-50/80 border-amber-300 hover:border-orange-500 text-amber-800'
                  : 'bg-slate-900 border-amber-500/40 hover:border-amber-400 text-amber-300'
              }`}
            >
              {edition.church_logo_url ? (
                <img
                  src={edition.church_logo_url}
                  alt="لوجو الكنيسة"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain p-1 bg-white"
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-1 text-center">
                  <Church className="w-6 h-6 sm:w-7 sm:h-7 text-amber-600 stroke-[2]" />
                  <span className="mt-1 text-[9px] sm:text-[10px] font-extrabold leading-tight">
                    رفع لوجو الكنيسة
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-0.5">
                <Upload className="w-4 h-4" />
                <span>تغيير وحفظ</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => churchInputRef.current?.click()}
              className={`mt-1.5 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                lastSavedTarget === 'church'
                  ? 'text-emerald-600'
                  : isLight
                  ? 'text-amber-800 hover:text-orange-600'
                  : 'text-amber-300 hover:text-orange-400'
              }`}
            >
              {lastSavedTarget === 'church' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم الحفظ</span>
                </>
              ) : (
                <span>لوجو الكنيسة</span>
              )}
            </button>
          </div>

          {/* المنتصف: اسم الكنيسة واسم الخدمة الرسمي */}
          <div className="flex-1 text-center min-w-0 space-y-1">
            <div
              className={`text-sm sm:text-lg font-extrabold tracking-tight leading-snug ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              {edition.church_name}
            </div>
            <div
              className={`text-xs sm:text-sm font-bold leading-snug ${
                isLight ? 'text-orange-600' : 'text-amber-400'
              }`}
            >
              {edition.service_title}
            </div>
            <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
              <span
                dir="ltr"
                className={`inline-block px-3 py-0.5 rounded-full text-[11px] font-extrabold tracking-wider font-[family-name:var(--font-mono)] ${
                  isLight
                    ? 'bg-amber-100/80 text-amber-900 border border-amber-300/70'
                    : 'bg-slate-800 text-amber-300 border border-slate-700'
                }`}
              >
                {edition.code_label}
              </span>
              {isSavingLogo && (
                <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-blue-600">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span>جاري الحفظ في الداتابيز...</span>
                </span>
              )}
            </div>
          </div>

          {/* اليسار: لوجو الخدمة / الكرنفال (متغير ويُحفظ في الداتابيز) */}
          <div className="flex flex-col items-center shrink-0">
            <input
              ref={carnivalInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileSelect('carnival', e)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => carnivalInputRef.current?.click()}
              title="اضغط لرفع أو تغيير لوجو الخدمة / الكرنفال وحفظه في الداتابيز"
              className={`group relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 overflow-hidden bg-white flex items-center justify-center shadow-sm transition-all cursor-pointer ${
                isLight ? 'border-sky-300 hover:border-blue-600' : 'border-sky-500/40 hover:border-sky-400'
              }`}
            >
              {!carnivalImgError ? (
                <img
                  src={activeCarnivalLogo}
                  alt="لوجو الخدمة والكرنفال"
                  referrerPolicy="no-referrer"
                  onError={() => setCarnivalImgError(true)}
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <span className="text-xs font-extrabold text-orange-600">Reflection</span>
              )}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-0.5">
                <Upload className="w-4 h-4" />
                <span>تغيير وحفظ</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => carnivalInputRef.current?.click()}
              className={`mt-1.5 text-[10px] font-extrabold flex items-center gap-1 cursor-pointer ${
                lastSavedTarget === 'carnival'
                  ? 'text-emerald-600'
                  : isLight
                  ? 'text-blue-700 hover:text-orange-600'
                  : 'text-sky-300 hover:text-orange-400'
              }`}
            >
              {lastSavedTarget === 'carnival' ? (
                <>
                  <CheckCircle2 className="w-3 h-3" />
                  <span>تم الحفظ</span>
                </>
              ) : (
                <span>لوجو الخدمة/الكرنفال</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* عرض لوجو الكرنفال الرئيسي في المنتصف (قابل للتغيير أيضاً بالضغط عليه) */}
      <div className="flex flex-col items-center text-center">
        <button
          type="button"
          onClick={() => carnivalInputRef.current?.click()}
          title="اضغط لتغيير لوجو الكرنفال وحفظه في الداتابيز"
          className={`group relative w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white p-2 border-2 shadow-xl flex items-center justify-center overflow-hidden transition-transform hover:scale-[1.01] cursor-pointer ${
            isLight
              ? 'border-amber-300/80 shadow-orange-500/10'
              : 'border-slate-700 shadow-black/50'
          }`}
        >
          {!carnivalImgError ? (
            <img
              src={activeCarnivalLogo}
              alt="شعار كرنفال Reflection"
              referrerPolicy="no-referrer"
              onError={() => setCarnivalImgError(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <span className="text-lg font-extrabold text-orange-600">Reflection</span>
          )}
          <div className="absolute inset-x-0 bottom-0 py-1.5 bg-black/65 text-white text-[11px] font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
            <Upload className="w-3.5 h-3.5" />
            <span>تغيير لوجو الكرنفال</span>
          </div>
        </button>

        <h1
          className={`mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-balance ${
            isLight ? 'text-slate-900' : 'text-white'
          }`}
        >
          تسجيل الدخول والتجربة الميدانية
        </h1>
        <p
          className={`mt-1 text-xs sm:text-sm font-bold ${
            isLight ? 'text-slate-600' : 'text-slate-400'
          }`}
        >
          المنظومة التفاعلية للمشاركين، فريق العمل، ومسؤولي الخدمة
        </p>

        {/* شريط المحاور الأربعة الزاهية */}
        {axes.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-extrabold">
            {axes.map((axis, idx) => (
              <React.Fragment key={axis.id}>
                <span className="inline-flex items-center gap-1" style={{ color: axis.color }}>
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{axis.name}</span>
                </span>
                {idx < axes.length - 1 && (
                  <span
                    aria-hidden="true"
                    className={isLight ? 'text-slate-400 px-0.5' : 'text-slate-600 px-0.5'}
                  >
                    ·
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
