'use client';

import React, { useState } from 'react';
import {
  CreditCard,
  UserCheck,
  Hash,
  KeyRound,
  Camera,
  Phone,
  ArrowLeft,
  UserPlus,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';

interface PortalLoginFormProps {
  isLight: boolean;
  mainTab: 'participants' | 'staff';
  onMainTabChange: (tab: 'participants' | 'staff') => void;
  participantSubTab: 'national_id' | 'pin';
  onParticipantSubTabChange: (sub: 'national_id' | 'pin') => void;
  staffSubTab: 'national_id' | 'credentials';
  onStaffSubTabChange: (sub: 'national_id' | 'credentials') => void;
  // Field values & handlers
  recoveryNatId: string;
  onRecoveryNatIdChange: (val: string) => void;
  recoveryPhone: string;
  onRecoveryPhoneChange: (val: string) => void;
  pinCode: string;
  onPinCodeChange: (val: string) => void;
  adminIdentifier: string;
  onAdminIdentifierChange: (val: string) => void;
  adminPassword: string;
  onAdminPasswordChange: (val: string) => void;
  // Submissions
  onNationalIdLogin: (e: React.FormEvent) => void;
  onCodeLogin: (e: React.FormEvent) => void;
  onStaffCredentialsLogin: (e: React.FormEvent) => void;
  onOpenQrScanner: () => void;
  onOpenRegisterServant: () => void;
  onOpenStaffPasswordSetup?: () => void;
  onGoogleServantLogin?: () => void;
  // State indicators
  statusMessage: { type: 'error' | 'success' | 'warning'; title: string; body: string } | null;
  recoveryAttempts: number;
  maxRecoveryAttempts: number;
  isAuthLoading?: boolean;
  authLoadingMessage?: string;
}

export const PortalLoginForm: React.FC<PortalLoginFormProps> = ({
  isLight,
  mainTab,
  onMainTabChange,
  participantSubTab,
  onParticipantSubTabChange,
  staffSubTab,
  onStaffSubTabChange,
  recoveryNatId,
  onRecoveryNatIdChange,
  recoveryPhone,
  onRecoveryPhoneChange,
  pinCode,
  onPinCodeChange,
  adminIdentifier,
  onAdminIdentifierChange,
  adminPassword,
  onAdminPasswordChange,
  onNationalIdLogin,
  onCodeLogin,
  onStaffCredentialsLogin,
  onOpenQrScanner,
  onOpenRegisterServant,
  onOpenStaffPasswordSetup,
  onGoogleServantLogin,
  statusMessage,
  recoveryAttempts,
  maxRecoveryAttempts,
  isAuthLoading = false,
  authLoadingMessage = 'جاري التحقق والمصادقة...',
}) => {
  const [showPassword, setShowPassword] = useState(false);

  const isStaff = mainTab === 'staff';
  const isNationalIdSubTab = !isStaff && participantSubTab === 'national_id';

  // زر تسجيل خادم جديد موحد بدون تكرار
  const renderNewServantButton = () => (
    <div className="flex justify-center pt-1">
      <button
        type="button"
        onClick={onOpenRegisterServant}
        className={`w-4/5 sm:w-3/4 min-h-[34px] rounded-full text-white font-extrabold text-[11px] sm:text-xs shadow-sm flex items-center justify-center gap-1.5 transition-transform active:scale-[0.99] cursor-pointer ${
          isStaff
            ? 'bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-blue-600/15'
            : 'bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 shadow-orange-500/15'
        }`}
      >
        <UserPlus className="w-3.5 h-3.5" />
        <span>تسجيل خادم جديد (غير مسجل)</span>
      </button>
    </div>
  );

  return (
    <div className="space-y-3.5 text-right font-sans">
      {/* التبويب الرئيسي (المشاركون vs فريق العمل) */}
      <div
        className={`p-1 rounded-full border grid grid-cols-2 gap-1 ${
          isLight ? 'bg-amber-50/90 border-amber-200 shadow-inner' : 'bg-[#0E1424] border-slate-800/90 shadow-inner'
        }`}
      >
        {/* المشاركون */}
        <button
          type="button"
          onClick={() => onMainTabChange('participants')}
          className={`min-h-[40px] px-2 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
            !isStaff
              ? 'bg-gradient-to-l from-orange-500 via-amber-500 to-orange-600 text-white shadow-sm shadow-orange-500/20'
              : isLight
              ? 'text-slate-700 hover:text-orange-700'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5 shrink-0" />
          <span>المشاركون</span>
        </button>

        {/* فريق العمل */}
        <button
          type="button"
          onClick={() => onMainTabChange('staff')}
          className={`min-h-[40px] px-2 rounded-full text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
            isStaff
              ? 'bg-gradient-to-l from-blue-600 to-sky-600 text-white shadow-sm shadow-blue-500/20'
              : isLight
              ? 'text-slate-700 hover:text-blue-700'
              : 'text-slate-300 hover:text-white'
          }`}
        >
          <UserCheck className="w-3.5 h-3.5 shrink-0" />
          <span>فريق العمل</span>
        </button>
      </div>

      {/* كارت الدخول الرئيسي */}
      <div
        className={`relative overflow-hidden rounded-3xl p-4 sm:p-5 border-2 space-y-4 transition-colors ${
          isLight
            ? 'bg-white border-amber-200/90 shadow-lg shadow-amber-900/5'
            : 'bg-[#12192B]/95 border-slate-800/90 shadow-2xl shadow-black/60'
        }`}
      >
        {isAuthLoading && (
          <div
            role="status"
            aria-live="polite"
            className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-xs ${
              isLight ? 'bg-white/85 text-slate-900' : 'bg-[#0B101E]/85 text-slate-100'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-extrabold">{authLoadingMessage}</p>
              <p className="text-[11px] opacity-75">يرجى الانتظار لحظات حتى إتمام المصادقة...</p>
            </div>
          </div>
        )}
        {/* رسائل التنبيه والخطأ */}
        {statusMessage && (
          <div
            className={`rounded-2xl p-3.5 border text-xs space-y-1 ${
              statusMessage.type === 'error'
                ? isLight
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                : statusMessage.type === 'warning'
                ? isLight
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                : isLight
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
            }`}
          >
            <div className="font-extrabold flex items-center gap-1.5">
              {statusMessage.type === 'error' ? (
                <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              )}
              <span>{statusMessage.title}</span>
            </div>
            <p className="leading-relaxed opacity-90">{statusMessage.body}</p>
          </div>
        )}

        {/* كارت مسح كود الـ QR الميداني المباشر - بمكان مخصص وواضح يمنع أي حركة أو إسكورول للشاشة */}
        <button
          type="button"
          onClick={onOpenQrScanner}
          className={`w-full min-h-[46px] px-3.5 py-2.5 rounded-2xl border-2 border-dashed flex items-center justify-between gap-2 transition-all cursor-pointer shadow-xs active:scale-[0.99] ${
            isLight
              ? isStaff
                ? 'border-blue-300 bg-blue-50/90 hover:bg-blue-100/90 text-blue-900 shadow-blue-500/5'
                : 'border-orange-300 bg-amber-50/90 hover:bg-amber-100/90 text-orange-950 shadow-orange-500/5'
              : isStaff
              ? 'border-blue-500/40 bg-blue-500/10 hover:bg-blue-500/20 text-sky-200'
              : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${
                isLight
                  ? isStaff
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-l from-orange-500 to-amber-500 text-white'
                  : 'bg-white/10 text-amber-300'
              }`}
            >
              <Camera className="w-4 h-4" />
            </div>
            <div className="text-right min-w-0">
              <div className="text-xs sm:text-sm font-extrabold">
                <span>مسح رمز الـ QR بالكاميرا</span>
              </div>
            </div>
          </div>
          <ArrowLeft className="w-4 h-4 opacity-60 shrink-0" />
        </button>

        {/* فاصل مرئي هادئ بين المسح والإدخال بالبيانات */}
        <div className="relative flex items-center justify-center py-0.5">
          <div className="border-t border-slate-300/50 dark:border-slate-700/60 w-full" />
          <span
            className={`px-3 text-[10px] font-extrabold rounded-full border ${
              isLight
                ? 'bg-white border-slate-200 text-slate-500'
                : 'bg-[#12192B] border-slate-700 text-slate-400'
            }`}
          >
            {isStaff ? 'تسجيل الدخول باسم المستخدم وكلمة المرور' : 'أو اختر طريقة الدخول'}
          </span>
        </div>

        {/* التبويب الفرعي (للمشاركين فقط) */}
        {!isStaff && (
          <div
            className={`p-1 rounded-2xl border grid grid-cols-2 gap-1 w-full ${
              isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-[#0C1222] border-slate-800'
            }`}
          >
            {/* خيار الكود / الـ QR (للمستوى ٣ خادم الفريق والمستوى ٤ المخدومين) */}
            <button
              type="button"
              onClick={() => onParticipantSubTabChange('pin')}
              className={`min-h-[34px] px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap overflow-hidden ${
                !isNationalIdSubTab
                  ? 'bg-gradient-to-l from-orange-500 to-red-500 text-white shadow-2xs'
                  : isLight
                  ? 'text-slate-700 hover:text-orange-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">بالكود أو الـ QR</span>
            </button>

            {/* خيار الرقم القومي لخادم الفريق */}
            <button
              type="button"
              onClick={() => onParticipantSubTabChange('national_id')}
              className={`min-h-[34px] px-2 rounded-xl text-[11px] font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap overflow-hidden ${
                isNationalIdSubTab
                  ? 'bg-gradient-to-l from-orange-500 to-red-500 text-white shadow-2xs'
                  : isLight
                  ? 'text-slate-700 hover:text-orange-600'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">خادم فريق (قومي)</span>
            </button>
          </div>
        )}

        {/* نموذج الإدخال بناءً على التبويب الفرعي المختار */}
        {isNationalIdSubTab ? (
          /* النموذج الموحد للرقم القومي ورقم الموبايل */
          <form onSubmit={onNationalIdLogin} className="space-y-3">
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs font-extrabold mb-1">
                  الرقم القومي المسجل (١٤ رقماً):
                </label>
                <div className="relative">
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={14}
                    required
                    value={recoveryNatId}
                    onChange={(e) => onRecoveryNatIdChange(e.target.value.replace(/\D/g, ''))}
                    placeholder="أدخل الرقم القومي (١٤ رقماً)"
                    className={`w-full min-h-[44px] pl-4 pr-10 rounded-full border-2 text-center font-mono tabular-nums text-xs sm:text-sm font-bold outline-none transition-colors ${
                      isLight
                        ? isStaff
                          ? 'bg-blue-50/40 border-blue-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                          : 'bg-amber-50/40 border-orange-300 text-slate-900 focus:border-orange-500 focus:bg-white'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                  <Hash
                    className={`w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 ${
                      isStaff ? 'text-blue-600' : 'text-orange-500'
                    }`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold mb-1">
                  رقم الهاتف المسجل (١١ رقماً):
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    dir="ltr"
                    maxLength={11}
                    required
                    value={recoveryPhone}
                    onChange={(e) => onRecoveryPhoneChange(e.target.value.replace(/\D/g, ''))}
                    placeholder="01XXXXXXXXX"
                    className={`w-full min-h-[44px] pl-4 pr-10 rounded-full border-2 text-center font-mono tabular-nums text-xs sm:text-sm font-bold outline-none transition-colors ${
                      isLight
                        ? isStaff
                          ? 'bg-blue-50/40 border-blue-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                          : 'bg-amber-50/40 border-orange-300 text-slate-900 focus:border-orange-500 focus:bg-white'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                  <Phone
                    className={`w-3.5 h-3.5 absolute right-3.5 top-1/2 -translate-y-1/2 ${
                      isStaff ? 'text-blue-600' : 'text-orange-500'
                    }`}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isAuthLoading || recoveryAttempts >= maxRecoveryAttempts}
                className={`w-full min-h-[44px] rounded-full text-white font-extrabold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  isStaff
                    ? 'bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 shadow-blue-600/20'
                    : 'bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 shadow-orange-500/20'
                }`}
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق والمصادقة...</span>
                  </>
                ) : (
                  <>
                    <span>{isStaff ? 'دخول مباشر لفريق العمل' : 'دخول المشارك إلى الكرنفال'}</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>

              {renderNewServantButton()}
            </div>
          </form>
        ) : !isStaff ? (
          /* نموذج الدخول بالكود أو الـ QR (لخادم المشاركون - المستوى ٣ والمخدومين - المستوى ٤) */
          <form onSubmit={onCodeLogin} className="space-y-3">
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                maxLength={24}
                value={pinCode}
                onChange={(e) => onPinCodeChange(e.target.value.toUpperCase())}
                placeholder="أدخل الكود المربوط بالبطاقة"
                className={`w-full min-h-[46px] px-10 rounded-full border-2 text-center font-mono text-xs sm:text-sm font-extrabold tracking-widest uppercase outline-none transition-all ${
                  isLight
                    ? 'bg-amber-50/50 border-orange-400 text-slate-900 placeholder:text-slate-400 focus:border-orange-600 focus:bg-white'
                    : 'bg-[#1A2235] border-orange-500/60 text-white placeholder:text-slate-300/80 focus:border-orange-400 shadow-inner'
                }`}
              />
              <KeyRound className="w-4 h-4 text-orange-500 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full min-h-[44px] rounded-full bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق والمصادقة...</span>
                  </>
                ) : (
                  <>
                    <span>دخول المشارك (خادم فريق / مخدوم)</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>

              {renderNewServantButton()}
            </div>
          </form>
        ) : (
          /* نموذج البريد / اسم المستخدم وكلمة المرور للأدمن وفريق العمل */
          <form onSubmit={onStaffCredentialsLogin} className="space-y-3">
            <div>
              <label className="block text-xs font-extrabold mb-1.5">
                البريد الإلكتروني أو اسم المستخدم (Username):
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={adminIdentifier}
                  onChange={(e) => onAdminIdentifierChange(e.target.value)}
                  placeholder="username أو email@gmail.com"
                  className={`w-full min-h-[44px] pl-4 pr-10 rounded-full border-2 text-center font-mono text-xs sm:text-sm font-bold outline-none transition-colors ${
                    isLight
                      ? 'bg-blue-50/40 border-blue-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                      : 'bg-[#171F32] border-slate-700/80 text-white placeholder:text-slate-400 focus:border-sky-400'
                  }`}
                />
                <UserCheck className="w-4 h-4 text-blue-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-extrabold mb-1.5">
                كلمة المرور (أو كود التفعيل الثابت للأدمن أول مرة):
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  dir="ltr"
                  required
                  value={adminPassword}
                  onChange={(e) => onAdminPasswordChange(e.target.value)}
                  placeholder="أدخل كلمة المرور الخاصة بك"
                  className={`w-full min-h-[44px] px-10 rounded-full border-2 text-center font-mono text-xs sm:text-sm font-bold outline-none transition-colors ${
                    isLight
                      ? 'bg-blue-50/40 border-blue-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                      : 'bg-[#171F32] border-slate-700/80 text-white placeholder:text-slate-400 focus:border-sky-400'
                  }`}
                />
                <Lock className="w-4 h-4 text-blue-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-blue-600 absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full min-h-[44px] rounded-full bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق والمصادقة...</span>
                  </>
                ) : (
                  <>
                    <span>دخول فريق العمل بالاسم وكلمة المرور</span>
                    <ArrowLeft className="w-4 h-4" />
                  </>
                )}
              </button>

              {onOpenStaffPasswordSetup && (
                <button
                  type="button"
                  onClick={onOpenStaffPasswordSetup}
                  className={`w-full min-h-[36px] px-3 rounded-xl border text-[11px] font-extrabold transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-amber-50/90 border-amber-200 text-amber-900 hover:bg-amber-100'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                  }`}
                >
                  أول مرة تدخل أو نسيت كلمة المرور؟ اضبط كلمة مرورك بالاسم والرقم القومي
                </button>
              )}

              {onGoogleServantLogin && (
                <button
                  type="button"
                  disabled={isAuthLoading}
                  onClick={onGoogleServantLogin}
                  className={`w-full min-h-[40px] px-3 rounded-full border-2 text-xs font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? 'bg-emerald-50/90 border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                      : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/20'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>الدخول الآمن بحساب Google</span>
                </button>
              )}

              {renderNewServantButton()}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
