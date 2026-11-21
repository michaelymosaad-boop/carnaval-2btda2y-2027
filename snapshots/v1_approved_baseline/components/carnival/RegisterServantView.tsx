'use client';

import React, { useState } from 'react';
import {
  UserPlus,
  ShieldCheck,
  Mail,
  Phone,
  CreditCard,
  HeartPulse,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  AVAILABLE_SKILLS,
  type Edition,
  type ServiceItem,
} from '@/lib/carnival-store';

export interface RegisterServantPayload {
  full_name: string;
  service_id: string;
  phone: string;
  whatsapp: string;
  email: string;
  national_id: string;
  skills: string[];
  health_notes: string;
  simulate_email_failure: boolean;
}

interface RegisterServantViewProps {
  edition: Edition;
  services: ServiceItem[];
  isLight: boolean;
  isOffline: boolean;
  simulatedEmptyServices: boolean;
  onBackToLogin: () => void;
  onRegisterSubmit: (payload: RegisterServantPayload) => {
    ok: boolean;
    error?: string;
    servantName?: string;
    maskedEmail?: string;
    deliveryStatus?: 'sent' | 'failed';
    qrToken?: string;
  };
  onOpenOutbox: () => void;
}

export const RegisterServantView: React.FC<RegisterServantViewProps> = ({
  edition,
  services,
  isLight,
  isOffline,
  simulatedEmptyServices,
  onBackToLogin,
  onRegisterSubmit,
  onOpenOutbox,
}) => {
  const [fullName, setFullName] = useState('');
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  const [phone, setPhone] = useState('');
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [selectedSkills, setSelectedSkills] = useState<string[]>(['قيادة ألعاب وفقرات']);
  const [healthNotes, setHealthNotes] = useState('');
  const [simulateEmailFailure, setSimulateEmailFailure] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<{
    servantName: string;
    maskedEmail: string;
    deliveryStatus: 'sent' | 'failed';
    qrToken: string;
  } | null>(null);

  // التحقق من آلة الحالة (State Machine): تسجيل الخدام متاح في المراحل 1 إلى 3 فقط
  const isStageOpenForRegistration = edition.current_stage <= 3;
  const displayedServices = simulatedEmptyServices ? [] : services;

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isOffline) {
      setErrorMsg('لا يمكن تسجيل حساب خادم جديد أثناء انقطاع الإنترنت (Offline). يرجى الاتصال بالشبكة أولاً.');
      return;
    }

    if (!isStageOpenForRegistration) {
      setErrorMsg(
        `التسجيل مغلق حالياً لأن الحدث في المرحلة (${edition.current_stage}). تسجيل الخدام متاح فقط في المراحل ١ إلى ٣.`
      );
      return;
    }

    const nameParts = fullName.trim().split(/\s+/);
    if (nameParts.length < 3) {
      setErrorMsg('يرجى إدخال الاسم الثلاثي للخادم بالكامل.');
      return;
    }

    if (!serviceId) {
      setErrorMsg('يرجى اختيار الخدمة التابع لها الخادم.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^01[0125]\d{8}$/.test(cleanPhone)) {
      setErrorMsg('يرجى إدخال رقم موبايل مصري صحيح مكوّن من ١١ رقماً (مثال: 01223456789).');
      return;
    }

    const cleanWhatsapp = sameWhatsapp ? cleanPhone : whatsapp.replace(/\D/g, '');
    if (!/^01[0125]\d{8}$/.test(cleanWhatsapp)) {
      setErrorMsg('يرجى إدخال رقم واتساب صحيح مكوّن من ١١ رقماً.');
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@(gmail\.com|yahoo\.com|icloud\.com)$/i.test(cleanEmail)) {
      setErrorMsg('يجب استخدام بريد إلكتروني شخصي معتمد (Gmail أو Yahoo أو iCloud) لإرسال كود الدخول السري.');
      return;
    }

    const cleanNatId = nationalId.replace(/\D/g, '');
    if (cleanNatId.length !== 14) {
      setErrorMsg('الرقم القومي يجب أن يتكون من ١٤ رقماً بالضبط (يُحفظ مجزّأً Hash لأغراض الاسترجاع الآمن فقط).');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = onRegisterSubmit({
        full_name: fullName.trim(),
        service_id: serviceId,
        phone: cleanPhone,
        whatsapp: cleanWhatsapp,
        email: cleanEmail,
        national_id: cleanNatId,
        skills: selectedSkills,
        health_notes: healthNotes.trim() || 'لا توجد ملاحظات صحية',
        simulate_email_failure: simulateEmailFailure,
      });

      setIsSubmitting(false);
      if (!res.ok) {
        setErrorMsg(res.error || 'حدث خطأ أثناء التسجيل.');
      } else {
        setSuccessResult({
          servantName: res.servantName!,
          maskedEmail: res.maskedEmail!,
          deliveryStatus: res.deliveryStatus!,
          qrToken: res.qrToken!,
        });
      }
    }, 350);
  };

  if (successResult) {
    return (
      <div
        className={`rounded-3xl p-6 sm:p-8 border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-900/5'
            : 'bg-[#12192B]/95 border-slate-800 text-slate-100 shadow-2xl shadow-black/50'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-extrabold">
            تم تسجيل بياناتك بنجاح · في انتظار الاعتماد
          </h2>
          <p className={`mt-2 text-sm leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            مرحباً بك يا <span className="font-bold text-orange-400">{successResult.servantName}</span>. تم إنشاء حسابك
            بحالة <span className="font-bold">«في انتظار الاعتماد (Pending)»</span> لحين مراجعة الأدمن أو مسؤول الخدمة.
          </p>
        </div>

        <div
          className={`mt-6 rounded-2xl p-4 border space-y-3 text-sm ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>حالة إرسال كود الدخول السري:</span>
            {successResult.deliveryStatus === 'sent' ? (
              <span className="font-bold text-emerald-400">
                أُرسل إلى الإيميل ({successResult.maskedEmail})
              </span>
            ) : (
              <span className="font-bold text-amber-400">
                تعذر الإرسال للإيميل · حُوّل لشاشة الأدمن (واتساب)
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>رمز الهوية للبادج (منفصل عن الكود):</span>
            <span
              dir="ltr"
              className="font-[family-name:var(--font-mono)] text-xs font-bold text-cyan-400 tabular-nums"
            >
              {successResult.qrToken}
            </span>
          </div>
          <p className={`text-xs pt-2 border-t ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
            ملاحظة أمنية: لا يتم عرض كود الدخول السري على الشاشة مطلقاً. يمكنك فتح «صندوق الإيميل التجريبي» بالأسفل لمعاينة الرسالة التي وصلت للخادم وتجربة الدخول بها.
          </p>
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onOpenOutbox}
            className="min-h-[52px] rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>فتح صندوق الإيميل التجريبي</span>
          </button>
          <button
            type="button"
            onClick={onBackToLogin}
            className={`min-h-[52px] rounded-2xl border font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer ${
              isLight
                ? 'border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-800'
                : 'border-slate-700 bg-slate-800/70 hover:bg-slate-800 text-slate-200'
            }`}
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لشاشة تسجيل الدخول</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-3xl p-5 sm:p-7 border transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-900/5'
          : 'bg-[#12192B]/95 border-slate-800/90 text-slate-100 shadow-2xl shadow-black/50'
      }`}
    >
      {/* رأس شاشة تسجيل الخادم */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-500/20">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold">تسجيل خادم جديد بالكرنفال</h2>
            <p className={`text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              يُحفظ الحساب «في انتظار الاعتماد» ويُرسل كود الدخول السري لبريدك الإلكتروني
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToLogin}
          className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            isLight
              ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          <span>عودة للدخول</span>
        </button>
      </div>

      {/* حالة قفل المرحلة من الـ State Machine */}
      {!isStageOpenForRegistration ? (
        <div className="mt-6 rounded-2xl p-6 border border-rose-500/30 bg-rose-500/10 text-center space-y-3">
          <Lock className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-extrabold text-rose-300">
            تسجيل الخدام الجدد مقفول في المرحلة الحالية ({edition.current_stage})
          </h3>
          <p className="text-xs sm:text-sm text-rose-200/90 leading-relaxed">
            طبقاً لقواعد مراحل الحدث (State Machine)، يُسمح بتسجيل الخدام في المراحل ١ إلى ٣ فقط. يمكنك تبديل المرحلة من شريط الاختبار العلوي لتجربة التسجيل.
          </p>
        </div>
      ) : displayedServices.length === 0 ? (
        /* حالة Empty للخدمات */
        <div className="mt-6 rounded-2xl p-6 border border-amber-500/30 bg-amber-500/10 text-center space-y-2">
          <AlertTriangle className="w-9 h-9 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold">لا توجد خدمات مضافة في هذه الدورة بعد (حالة فارغة Empty)</h3>
          <p className="text-xs opacity-80">
            يجب على الأدمن إدخال الخدمات الخمس أولاً في المرحلة ١ (أو إلغاء وضع Empty من شريط الاختبار).
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="rounded-2xl p-4 bg-rose-500/15 border border-rose-500/40 flex items-start gap-3 text-rose-300 text-xs sm:text-sm font-bold">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* الاسم الثلاثي والخدمة */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold mb-1.5">
                الاسم الثلاثي للخادم <span className="text-orange-500">*</span>
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="مثال: مينا عادل فوزي"
                className={`w-full min-h-[50px] px-4 rounded-2xl border text-sm font-medium outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                    : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold mb-1.5">
                الخدمة التابع لها (من الخدمات الخمس) <span className="text-orange-500">*</span>
              </label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                className={`w-full min-h-[50px] px-4 rounded-2xl border text-sm font-bold outline-none transition-colors ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                    : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                }`}
              >
                {displayedServices.map((srv) => (
                  <option key={srv.id} value={srv.id}>
                    {srv.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* رقم الموبايل والواتساب */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold mb-1.5">
                رقم الموبايل الشخصي <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  required
                  maxLength={11}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="01223456789"
                  className={`w-full min-h-[50px] pl-4 pr-10 rounded-2xl border text-left font-[family-name:var(--font-mono)] tabular-nums text-sm font-bold outline-none transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                      : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                  }`}
                />
                <Phone className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-bold">
                  رقم الواتساب <span className="text-orange-500">*</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-orange-400 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sameWhatsapp}
                    onChange={(e) => setSameWhatsapp(e.target.checked)}
                    className="rounded accent-orange-500"
                  />
                  <span>نفس رقم الموبايل</span>
                </label>
              </div>
              <input
                type="tel"
                dir="ltr"
                disabled={sameWhatsapp}
                maxLength={11}
                value={sameWhatsapp ? phone : whatsapp}
                onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                placeholder="01223456789"
                className={`w-full min-h-[50px] px-4 rounded-2xl border text-left font-[family-name:var(--font-mono)] tabular-nums text-sm font-bold outline-none transition-colors ${
                  sameWhatsapp ? 'opacity-60 cursor-not-allowed' : ''
                } ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                    : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                }`}
              />
            </div>
          </div>

          {/* الإيميل الشخصي والرقم القومي */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-bold mb-1.5">
                البريد الإلكتروني (Gmail / Yahoo / iCloud) <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="email"
                  dir="ltr"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="servant@gmail.com"
                  className={`w-full min-h-[50px] pl-4 pr-10 rounded-2xl border text-left font-[family-name:var(--font-mono)] text-sm font-bold outline-none transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                      : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                  }`}
                />
                <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs sm:text-sm font-bold mb-1.5">
                الرقم القومي (١٤ رقماً - يُشفر للاسترجاع فقط) <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="ltr"
                  required
                  maxLength={14}
                  value={nationalId}
                  onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                  placeholder="29901010101234"
                  className={`w-full min-h-[50px] pl-4 pr-10 rounded-2xl border text-left font-[family-name:var(--font-mono)] tabular-nums text-sm font-bold outline-none transition-colors ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                      : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                  }`}
                />
                <CreditCard className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
              <p className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                يُحفظ كـ Hash غير قابل للعكس، ويظهر للأدمن آخر ٤ أرقام فقط ({nationalId.slice(-4) || '----'}).
              </p>
            </div>
          </div>

          {/* المهارات الخاصة والملاحظات الصحية (الحقول الإضافية المعتمدة) */}
          <div
            className={`rounded-2xl p-4 border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0D1323]/90 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>المهارات الميدانية الخاصة (لتوزيع الفرق والمحطات):</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_SKILLS.map((skill) => {
                const active = selectedSkills.includes(skill);
                return (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-orange-600 text-white border-orange-500 shadow-sm'
                        : isLight
                        ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        : 'bg-[#141D33] text-slate-300 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {skill}
                  </button>
                );
              })}
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-1.5 text-xs font-bold mb-1.5">
                <HeartPulse className="w-4 h-4 text-rose-400" />
                <span>ملاحظات صحية أو طبية اختيارية (تظهر لمسؤول الطوارئ عند الحاجة):</span>
              </label>
              <input
                type="text"
                value={healthNotes}
                onChange={(e) => setHealthNotes(e.target.value)}
                placeholder="مثال: حساسية صدرية، أو اتركه فارغاً إن لم يوجد"
                className={`w-full min-h-[46px] px-3.5 rounded-xl border text-xs sm:text-sm outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-orange-500'
                    : 'bg-[#12192B] border-slate-700 text-white focus:border-orange-500'
                }`}
              />
            </div>
          </div>

          {/* خيار محاكاة فشل الإيميل لاختبار بديل الواتساب */}
          <div className="flex items-center justify-between px-1">
            <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={simulateEmailFailure}
                onChange={(e) => setSimulateEmailFailure(e.target.checked)}
                className="rounded accent-amber-500"
              />
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>
                محاكاة تعذر وصول الإيميل (لاختبار ظهور حالة «لم يُرسل» وإرسال الكود واتساب من الأدمن)
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[56px] rounded-2xl bg-gradient-to-l from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white font-extrabold text-base shadow-lg shadow-orange-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-5 h-5" />
            <span>{isSubmitting ? 'جاري تشفير البيانات وتوليد الكود...' : 'إرسال طلب تسجيل الخادم'}</span>
          </button>

          <div className="flex items-center justify-center gap-2 pt-2 text-xs opacity-75">
            <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>يُحفظ الرقم القومي مجزّأً (SHA-256 Hash) ولا يُستخدم كوسيلة دخول مباشرة</span>
          </div>
        </form>
      )}
    </div>
  );
};
