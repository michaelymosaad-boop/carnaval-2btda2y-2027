'use client';

import React from 'react';
import { UserCheck, Settings, LogOut, X, HelpCircle, User, Moon, Sun } from 'lucide-react';
import { CarnivalEmblem, type HomepageAdminPayload } from './CarnivalEmblem';

export interface HeaderPageInstructionItem {
  title: string;
  description: string;
  badge?: string;
  color?: 'orange' | 'blue' | 'emerald' | 'amber';
}

export interface HeaderPageInstructions {
  title: string;
  subtitle?: string;
  items: HeaderPageInstructionItem[];
}

interface CarnivalHeaderProps {
  edition: any; // Simplified for this component
  servant: any | null;
  serviceName?: string;
  servantPoints?: {
    total: number;
    breakdown: { title: string; points: number }[];
  };
  isAdminLoggedIn: boolean;
  isLight: boolean;
  adminPanelOpen: boolean;
  setAdminPanelOpen: (open: boolean) => void;
  onLogout: () => void;
  onLogoUpload: (target: 'church' | 'service' | 'carnival', dataUrl: string | null) => Promise<void>;
  onSaveHomepageSettings: (payload: HomepageAdminPayload) => Promise<void>;
  onToggleTheme?: () => void;
  instructions?: HeaderPageInstructions;
  onOpenProfile?: () => void;
  devAdminTrigger?: React.ReactNode;
  connectionIndicator?: React.ReactNode;
}

export const CarnivalHeader: React.FC<CarnivalHeaderProps> = ({
  edition,
  servant,
  serviceName,
  servantPoints,
  isAdminLoggedIn,
  isLight,
  adminPanelOpen,
  setAdminPanelOpen,
  onLogout,
  onLogoUpload,
  onSaveHomepageSettings,
  onToggleTheme,
  instructions,
  onOpenProfile,
  devAdminTrigger,
  connectionIndicator,
}) => {
  const [profileMenuOpen, setProfileMenuOpen] = React.useState(false);
  const [helpOpen, setHelpOpen] = React.useState(false);

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full backdrop-blur-md border-b transition-colors ${
          isLight
            ? 'bg-[#FFFDF7]/95 border-amber-200/80 shadow-xs'
            : 'bg-[#080C17]/95 border-slate-800/80 shadow-xs'
        }`}
      >
        <div className="max-w-xl w-full mx-auto px-3 sm:px-4 pt-2 pb-2.5 space-y-2">
          {/* شريط التحكم المدمج: زر الإرشاد والوضع الليلي باليمين وأيقونة الحساب باليسار */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => setHelpOpen(true)}
                aria-label="دليل الاستخدام والإرشادات"
                title="دليل الاستخدام والإرشادات"
                className={`min-h-[32px] px-2.5 rounded-full border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  isLight
                    ? 'border-amber-200 bg-amber-50/90 text-orange-700 hover:bg-amber-100 hover:border-orange-300'
                    : 'border-slate-800 bg-[#12192B] text-amber-300 hover:bg-slate-800'
                }`}
              >
                <HelpCircle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                <span>إرشاد الاستخدام</span>
              </button>

              {onToggleTheme && (
                <button
                  type="button"
                  onClick={onToggleTheme}
                  aria-label={isLight ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى الوضع النهاري'}
                  title={isLight ? 'الوضع الليلي' : 'الوضع الفاتح'}
                  className={`min-h-[32px] px-2.5 rounded-full border text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                    isLight
                      ? 'border-amber-200 bg-white/95 text-amber-900 hover:bg-amber-100/80 shadow-2xs'
                      : 'border-slate-800 bg-[#12192B] text-amber-300 hover:bg-slate-800'
                  }`}
                >
                  {isLight ? (
                    <>
                      <Moon className="w-3.5 h-3.5 text-amber-600" />
                      <span>ليلي</span>
                    </>
                  ) : (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>فاتح</span>
                    </>
                  )}
                </button>
              )}
              {connectionIndicator}
            </div>

            {/* أيقونة المستخدم: تظهر فقط عند تسجيل الدخول بصورة اليوزر في المرحلة الثانية ولا تظهر قبل تسجيل الدخول */}
            {servant ? (
              <button
                type="button"
                onClick={() => {
                  if (onOpenProfile) {
                    onOpenProfile();
                  } else {
                    setProfileMenuOpen(true);
                  }
                }}
                aria-label="الملف الشخصي ورصيد النقاط"
                title={`حساب: ${servant.full_name}`}
                className={`w-9 h-9 rounded-full border-2 flex items-center justify-center overflow-hidden shrink-0 cursor-pointer shadow-2xs transition-all active:scale-95 ${
                  isLight
                    ? 'bg-white border-emerald-500 text-slate-800 shadow-emerald-500/10'
                    : 'bg-[#12192B] border-emerald-400 text-emerald-300 shadow-emerald-400/10'
                }`}
              >
                {servant.avatar_url ? (
                  <img
                    src={servant.avatar_url}
                    alt={servant.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-emerald-600" />
                )}
              </button>
            ) : devAdminTrigger ? (
              devAdminTrigger
            ) : null}
          </div>

          {/* لوجو وهوية الكرنفال بكامل العرض وبدون انضغاط */}
          <div className="w-full">
            <CarnivalEmblem
              edition={edition}
              axes={[]}
              history={[]}
              isLight={isLight}
              isSavingLogo={false}
              lastSavedTarget={null}
              isAdminAuthorized={isAdminLoggedIn}
              externalAdminPanelOpen={adminPanelOpen}
              onCloseExternalAdminPanel={() => setAdminPanelOpen(false)}
              hideLoginSubheader={true}
              onLogoUpload={onLogoUpload}
              onSaveHomepageSettings={onSaveHomepageSettings}
            />
          </div>
        </div>
      </header>

      {/* Help Tooltip Overlay */}
      {helpOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setHelpOpen(false)}
        >
          <div
            dir="rtl"
            className={`w-full max-w-sm rounded-3xl p-5 space-y-4 border shadow-2xl text-right ${
              isLight ? 'bg-white border-amber-200 text-slate-900' : 'bg-[#12192B] border-slate-800 text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center pb-2 border-b border-slate-500/20">
              <div className="flex items-center gap-2 font-extrabold text-sm text-orange-600">
                <HelpCircle className="w-4 h-4 shrink-0" />
                <span>{instructions?.title || 'دليل الاستخدام السريع'}</span>
              </div>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {instructions?.subtitle && (
              <div
                className={`text-xs font-black tracking-wide ${
                  isLight ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {instructions.subtitle}
              </div>
            )}

            <div className="space-y-3 text-xs leading-relaxed max-h-[60vh] overflow-y-auto pr-0.5">
              {instructions && instructions.items.length > 0 ? (
                instructions.items.map((item, idx) => {
                  // ألوان متناسقة وعالية التباين بنسبة 100% بدون بهتان
                  let cardStyle = '';
                  let titleStyle = '';
                  let badgeStyle = '';
                  let descStyle = isLight
                    ? 'text-slate-900 font-bold leading-relaxed'
                    : 'text-slate-100 font-medium leading-relaxed';

                  if (item.color === 'blue') {
                    cardStyle = isLight
                      ? 'bg-blue-50/95 border-blue-300 shadow-xs'
                      : 'bg-sky-950/40 border-sky-500/40 shadow-xs';
                    titleStyle = isLight ? 'text-blue-950 font-black' : 'text-sky-300 font-black';
                    badgeStyle = isLight
                      ? 'bg-blue-100 text-blue-950 border border-blue-300 font-black'
                      : 'bg-sky-500/25 text-sky-200 border border-sky-400/40 font-black';
                  } else if (item.color === 'emerald') {
                    cardStyle = isLight
                      ? 'bg-emerald-50/95 border-emerald-300 shadow-xs'
                      : 'bg-emerald-950/40 border-emerald-500/40 shadow-xs';
                    titleStyle = isLight ? 'text-emerald-950 font-black' : 'text-emerald-300 font-black';
                    badgeStyle = isLight
                      ? 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-black'
                      : 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40 font-black';
                  } else {
                    // orange or amber
                    cardStyle = isLight
                      ? 'bg-amber-50/95 border-amber-300 shadow-xs'
                      : 'bg-amber-950/40 border-amber-500/40 shadow-xs';
                    titleStyle = isLight ? 'text-amber-950 font-black' : 'text-amber-300 font-black';
                    badgeStyle = isLight
                      ? 'bg-amber-100 text-amber-950 border border-amber-300 font-black'
                      : 'bg-amber-500/25 text-amber-200 border border-amber-400/40 font-black';
                  }

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-2xl border space-y-1.5 transition-all ${cardStyle}`}
                    >
                      <div className="flex items-center gap-2">
                        {item.badge && (
                          <span className={`text-[10px] px-2 py-0.5 rounded-md ${badgeStyle}`}>
                            {item.badge}
                          </span>
                        )}
                        <h4 className={`text-xs ${titleStyle}`}>{item.title}</h4>
                      </div>
                      <p className={`text-[12px] ${descStyle}`}>{item.description}</p>
                    </div>
                  );
                })
              ) : (
                <>
                  <div
                    className={`p-3.5 rounded-2xl border space-y-1.5 ${
                      isLight ? 'bg-orange-50/95 border-orange-300 shadow-xs' : 'bg-orange-950/40 border-orange-500/40'
                    }`}
                  >
                    <div className={`font-black text-xs ${isLight ? 'text-orange-950' : 'text-orange-300'}`}>
                      ١. المشاركون (خدام الفرق والمخدومين):
                    </div>
                    <p
                      className={`text-[12px] leading-relaxed ${
                        isLight ? 'text-slate-900 font-bold' : 'text-slate-100 font-medium'
                      }`}
                    >
                      • <strong className="font-black">خدام الفرق:</strong> الدخول بالرقم القومي (١٤ رقماً) ورقم الهاتف المسجل (١١ رقماً).
                      <br />• <strong className="font-black">المخدومين (الأطفال):</strong> الدخول بالكود المطبوع أو بمسح الـ QR.
                    </p>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border space-y-1.5 ${
                      isLight ? 'bg-blue-50/95 border-blue-300 shadow-xs' : 'bg-sky-950/40 border-sky-500/40'
                    }`}
                  >
                    <div className={`font-black text-xs ${isLight ? 'text-blue-950' : 'text-sky-300'}`}>
                      ٢. فريق العمل (التنظيم والمحطات):
                    </div>
                    <p
                      className={`text-[12px] leading-relaxed ${
                        isLight ? 'text-slate-900 font-bold' : 'text-slate-100 font-medium'
                      }`}
                    >
                      • الدخول بالرقم القومي ورقم الموبايل أو باسم المستخدم وكود الدخول.
                    </p>
                  </div>

                  <div
                    className={`p-3.5 rounded-2xl border space-y-1.5 ${
                      isLight ? 'bg-emerald-50/95 border-emerald-300 shadow-xs' : 'bg-emerald-950/40 border-emerald-500/40'
                    }`}
                  >
                    <div className={`font-black text-xs ${isLight ? 'text-emerald-950' : 'text-emerald-300'}`}>
                      ٣. مسح رمز الـ QR:
                    </div>
                    <p
                      className={`text-[12px] leading-relaxed ${
                        isLight ? 'text-slate-900 font-bold' : 'text-slate-100 font-medium'
                      }`}
                    >
                      • مسح الـ QR المباشر يفتح عرض البطاقة والنقاط والجدول (قراءة فقط).
                    </p>
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="w-full py-3 rounded-2xl bg-gradient-to-l from-orange-600 via-amber-600 to-orange-600 hover:from-orange-700 hover:to-amber-700 text-white font-black text-sm shadow-md shadow-orange-600/30 cursor-pointer transition-transform active:scale-[0.99]"
            >
              فهمت ذلك، إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Profile Menu Modal (يظهر فقط عند تسجيل الدخول) */}
      {profileMenuOpen && servant && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-14 sm:pt-20 p-3 sm:p-4"
          onClick={() => setProfileMenuOpen(false)}
        >
          <div
            dir="rtl"
            className={`w-full max-w-sm rounded-3xl p-5 space-y-4 border shadow-2xl text-right max-h-[88vh] overflow-y-auto ${
              isLight ? 'bg-white border-amber-200 text-slate-900' : 'bg-[#12192B] border-slate-800 text-slate-100'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* رأس النافذة */}
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-500/20">
              <div className="flex items-center gap-2 font-extrabold text-sm text-emerald-600 dark:text-emerald-400">
                <UserCheck className="w-4 h-4" />
                <span>الملف الشخصي ورصيد النقاط</span>
              </div>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* التعريف بالخادم */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="w-14 h-14 rounded-full border-2 border-emerald-500 overflow-hidden bg-slate-100 flex items-center justify-center shrink-0">
                {servant.avatar_url ? (
                  <img
                    src={servant.avatar_url}
                    alt={servant.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-7 h-7 text-emerald-600" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-extrabold text-sm truncate">{servant.full_name}</div>
                <div className="text-xs opacity-80 mt-0.5 truncate">
                  {serviceName || servant.service_name || 'خدمة الكرنفال الميدانية'}
                </div>
                <div className="text-[11px] font-mono text-emerald-700 dark:text-emerald-300 font-bold mt-0.5">
                  هاتف: {servant.phone}
                </div>
              </div>
            </div>

            {/* رصيد النقاط الفعلي لكل مشاركة وفاعلية */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold">
                <span className="text-orange-600 dark:text-amber-300">سجل مشاركاتك ورصيد النقاط:</span>
                <span className="text-[11px] opacity-75 font-normal">
                  {servantPoints?.breakdown.length || 0} حركة
                </span>
              </div>

              <div className="space-y-1.5">
                {servantPoints && servantPoints.breakdown.length > 0 ? (
                  servantPoints.breakdown.slice(0, 6).map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-xl border flex items-center justify-between text-xs ${
                        isLight
                          ? 'bg-slate-50/80 border-slate-200 text-slate-800'
                          : 'bg-[#17213A] border-slate-800 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0 pr-1">
                        <span
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                            item.points < 0 ? 'bg-rose-500' : 'bg-emerald-500'
                          }`}
                        />
                        <span className="truncate text-[11px] font-bold">{item.title}</span>
                      </div>
                      <span
                        className={`font-mono font-extrabold shrink-0 ${
                          item.points < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.points >= 0 ? `+${item.points}` : item.points} نقطة
                      </span>
                    </div>
                  ))
                ) : (
                  <div
                    className={`p-3 rounded-xl border border-dashed text-center text-[11px] font-bold ${
                      isLight
                        ? 'bg-slate-50 border-slate-200 text-slate-500'
                        : 'bg-[#17213A]/60 border-slate-700 text-slate-400'
                    }`}
                  >
                    لا توجد نقاط مسجلة حتى الآن — ستظهر تلقائياً عند تسجيل الحضور والفعاليات.
                  </div>
                )}
              </div>

              {/* صندوق إجمالي النقاط */}
              <div className="p-3 rounded-2xl bg-gradient-to-l from-emerald-500/15 via-teal-500/15 to-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-extrabold opacity-75">إجمالي رصيد النقاط الفعلي:</div>
                  <div className="text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono">
                    {servantPoints?.total ?? 0} نقطة
                  </div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500 text-white text-[11px] font-extrabold shadow-sm">
                  {(servantPoints?.total ?? 0) > 0 ? 'رصيد نشط' : 'بانتظار البداية'}
                </div>
              </div>
            </div>

            {/* وتحت خالص خروج */}
            <button
              type="button"
              onClick={() => {
                setProfileMenuOpen(false);
                onLogout();
              }}
              className="w-full py-2.5 rounded-xl bg-rose-500/15 text-rose-600 hover:bg-rose-500/25 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors mt-2"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
