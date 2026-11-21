'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  UserPlus,
  Phone,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRight,
  Sparkles,
  Camera,
  Upload,
  User,
  Calendar,
  MapPin,
  Trash2,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  AtSign,
} from 'lucide-react';
import {
  AVAILABLE_SKILLS,
  parseEgyptianNationalId,
  compressImageFileToDataUrl,
  generateServantUsername,
  type Edition,
  type ServiceItem,
  type Servant,
} from '@/lib/carnival-store';
import { ServantIdCardView } from './ServantIdCardView';

export interface RegisterServantPayload {
  full_name: string;
  national_id: string;
  gender: 'ذكر' | 'أنثى';
  birth_date: string;
  governorate: string;
  phone: string;
  whatsapp: string;
  email?: string;
  service_id: string;
  primary_role: 'team_lead' | 'staff';
  username?: string;
  password?: string;
  skills: string[];
  avatar_url: string | null;
}

interface RegisterServantViewProps {
  edition: Edition;
  services: ServiceItem[];
  existingUsernames?: string[];
  isLight: boolean;
  isOffline: boolean;
  simulatedEmptyServices: boolean;
  isServantRegistrationOpen?: boolean;
  isUserPortalOpen?: boolean;
  onBackToLogin: () => void;
  onProceedToStaffLogin?: (username: string) => void;
  onRegisterSubmit: (payload: RegisterServantPayload) => {
    ok: boolean;
    error?: string;
    servant?: Servant;
    serviceName?: string;
  };
  onUpdateRegisteredAvatar?: (servantId: string, newAvatarUrl: string) => void;
  onEnterReadOnlyProfile: (servant: Servant) => void;
}

export const RegisterServantView: React.FC<RegisterServantViewProps> = ({
  edition,
  services,
  existingUsernames = [],
  isLight,
  isOffline,
  simulatedEmptyServices,
  isServantRegistrationOpen = true,
  isUserPortalOpen = true,
  onBackToLogin,
  onProceedToStaffLogin,
  onRegisterSubmit,
  onUpdateRegisteredAvatar,
  onEnterReadOnlyProfile,
}) => {
  // ١. الاسم رباعي
  const [fullName, setFullName] = useState('');
  // ٢. الرقم القومي (١٤ رقماً) -> يستخرج منه ٣. النوع، ٤. تاريخ الميلاد، ٥. المحافظة أوتوماتيكياً
  const [nationalId, setNationalId] = useState('');
  // ٦. رقم الموبايل + خانة صح (لو هو نفس رقم الواتساب)
  const [phone, setPhone] = useState('');
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  // ٧. رقم واتساب + البريد الإلكتروني (اختياري)
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  // ٨. اسم الخدمة التابع لها
  const [serviceId, setServiceId] = useState(services[0]?.id || '');
  // ٩. الصفة/الصلاحية بالكرنفال (خادم فريق مشاركون أم خادم فرق عمل) + المهارات
  const [primaryRole, setPrimaryRole] = useState<'team_lead' | 'staff'>('team_lead');
  const [customUsername, setCustomUsername] = useState('');
  const [hasEditedUsername, setHasEditedUsername] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  // ١٠. صورة شخصية (رفع من الجهاز أو كاميرا)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [registeredData, setRegisteredData] = useState<{
    servant: Servant;
    serviceName: string;
  } | null>(null);

  // قراءة النوع وتاريخ الميلاد والمحافظة أوتوماتيكياً من الرقم القومي
  const parsedNatId = useMemo(() => parseEgyptianNationalId(nationalId), [nationalId]);

  const suggestedUsername = useMemo(
    () =>
      generateServantUsername(
        fullName,
        nationalId.replace(/\D/g, '').slice(-4),
        existingUsernames
      ),
    [fullName, nationalId, existingUsernames]
  );

  const effectiveUsername = (hasEditedUsername ? customUsername : suggestedUsername)
    .trim()
    .toLowerCase();

  const isStageOpenForRegistration = edition.current_stage <= 3 && isServantRegistrationOpen;
  const displayedServices = simulatedEmptyServices ? [] : services;

  const handleSelectPrimaryRole = (role: 'team_lead' | 'staff') => {
    setPrimaryRole(role);
    if (role === 'staff') {
      setSelectedSkills((prev) => prev.filter((s) => s !== 'خادم فريق'));
    }
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingPhoto(true);
    setErrorMsg(null);
    try {
      const dataUrl = await compressImageFileToDataUrl(file, 512);
      setAvatarUrl(dataUrl);
    } catch {
      setErrorMsg('تعذر قراءة الصورة الشخصية، يرجى اختيار صورة أخرى.');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (isOffline) {
      setErrorMsg(
        'لا يمكن تسجيل حساب خادم جديد أثناء انقطاع الإنترنت (Offline). يرجى الاتصال بالشبكة أولاً.'
      );
      return;
    }

    if (!isServantRegistrationOpen) {
      setErrorMsg('باب تسجيل الخدام الجدد مغلق حالياً بقرار من إدارة الكرنفال (الأدمن).');
      return;
    }

    if (!isStageOpenForRegistration) {
      setErrorMsg(
        `التسجيل مغلق حالياً لأن الحدث في المرحلة (${edition.current_stage}). تسجيل الخدام متاح فقط في المراحل ١ إلى ٣.`
      );
      return;
    }

    // ١. التحقق من الاسم الرباعي
    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    if (nameParts.length < 4) {
      setErrorMsg('يرجى إدخال الاسم رباعياً بالكامل (٤ أسماء على الأقل).');
      return;
    }

    // ٢-٥. التحقق من الرقم القومي واستخراج النوع وتاريخ الميلاد والمحافظة
    if (!parsedNatId.isValid || !parsedNatId.gender || !parsedNatId.birthDate || !parsedNatId.governorate) {
      setErrorMsg(
        parsedNatId.error ||
          'يرجى إدخال رقم قومي مصري صحيح مكوّن من ١٤ رقماً.'
      );
      return;
    }

    // ٦. التحقق من رقم الموبايل
    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^01[0125]\d{8}$/.test(cleanPhone)) {
      setErrorMsg('يرجى إدخال رقم موبايل مصري صحيح مكوّن من ١١ رقماً (يبدأ بـ 01).');
      return;
    }

    // ٧. التحقق من رقم الواتساب
    const resolvedWhatsapp = sameWhatsapp ? cleanPhone : whatsapp.replace(/\D/g, '');
    if (!/^01[0125]\d{8}$/.test(resolvedWhatsapp)) {
      setErrorMsg('يرجى إدخال رقم واتساب مصري صحيح مكوّن من ١١ رقماً.');
      return;
    }

    // ٨. التحقق من اسم الخدمة
    if (!serviceId) {
      setErrorMsg('يرجى اختيار اسم الخدمة التابع لها.');
      return;
    }

    // ٩. التحقق من اختيار مهارة واحدة على الأقل (لخادم فرق العمل فقط)
    if (primaryRole === 'staff' && selectedSkills.length === 0) {
      setErrorMsg('يرجى اختيار مهارة واحدة على الأقل من قائمة المهارات.');
      return;
    }

    // التحقق من اسم المستخدم وكلمة المرور عند اختيار «خادم فرق عمل»
    if (primaryRole === 'staff') {
      if (!/^[a-z0-9._-]{3,50}$/.test(effectiveUsername)) {
        setErrorMsg(
          'اسم المستخدم لخادم فرق العمل يجب أن يتكون من ٣ أحرف إنجليزية أو أرقام على الأقل (مثال: mina.adel).'
        );
        return;
      }
      if (
        existingUsernames.some(
          (u) => u.trim().toLowerCase() === effectiveUsername.toLowerCase()
        )
      ) {
        setErrorMsg('اسم المستخدم هذا مسجل بالفعل لخادم آخر، يرجى تعديله أو إضافة رقم.');
        return;
      }
      if (newPassword.trim().length < 4) {
        setErrorMsg('يرجى كتابة كلمة مرور جديدة لخادم فرق العمل (٤ رموز على الأقل).');
        return;
      }
      if (newPassword.trim() !== confirmPassword.trim()) {
        setErrorMsg('كلمتا المرور غير متطابقتين، يرجى التأكد وإعادة الإدخال.');
        return;
      }
    }

    setIsSubmitting(true);
    setTimeout(() => {
      const res = onRegisterSubmit({
        full_name: fullName.trim(),
        national_id: nationalId.replace(/\D/g, ''),
        gender: parsedNatId.gender!,
        birth_date: parsedNatId.birthDate!,
        governorate: parsedNatId.governorate!,
        phone: cleanPhone,
        whatsapp: resolvedWhatsapp,
        email: email.trim().toLowerCase() || undefined,
        service_id: serviceId,
        primary_role: primaryRole,
        username: primaryRole === 'staff' ? effectiveUsername : undefined,
        password: primaryRole === 'staff' ? newPassword.trim() : undefined,
        skills: primaryRole === 'team_lead' ? ['خادم فريق'] : selectedSkills,
        avatar_url: avatarUrl,
      });

      setIsSubmitting(false);
      if (!res.ok || !res.servant) {
        setErrorMsg(res.error || 'حدث خطأ أثناء حفظ البيانات.');
      } else {
        setRegisteredData({
          servant: res.servant,
          serviceName:
            res.serviceName ||
            services.find((s) => s.id === serviceId)?.name ||
            'غير محدد',
        });
      }
    }, 300);
  };

  // شاشة/كارت «تم التسجيل بنجاح» مع عرض اليوزرنيم لفرق العمل أو الدخول المباشر لخدام الفرق
  if (registeredData) {
    const { servant, serviceName } = registeredData;
    const isStaffRegistered = servant.primary_role === 'staff';
    return (
      <ServantIdCardView
        edition={edition}
        servant={servant}
        serviceName={serviceName}
        isLight={isLight}
        portalAccessLockedNotice={
          !isUserPortalOpen
            ? 'تم تسجيل حسابك وإصدار الكود والـ QR بنجاح! يمكنك تحميل بطاقة الـ QR ونسخ الكود الآن، ولكن الدخول إلى شاشات الكرنفال مغلق حالياً لحين فتح البوابة رسمياً من الأدمن.'
            : isStaffRegistered
            ? `تم حفظ بياناتك بنجاح! اسم المستخدم الخاص بك هو (${servant.username || effectiveUsername}). احتفظ بالكود والـ QR للبطاقة الشخصية، والدخول لمهام فريق العمل يتم باسم المستخدم وكلمة المرور فقط.`
            : null
        }
        onUpdateAvatar={(newAvatar) => {
          setRegisteredData((prev) =>
            prev ? { ...prev, servant: { ...prev.servant, avatar_url: newAvatar } } : null
          );
          onUpdateRegisteredAvatar?.(servant.id, newAvatar);
        }}
        primaryActionLabel={
          isUserPortalOpen
            ? isStaffRegistered
              ? 'الدخول الآن باسم المستخدم وكلمة المرور'
              : 'الدخول الآن بالبطاقة إلى صفحة خادم الفريق'
            : undefined
        }
        onPrimaryAction={
          isUserPortalOpen
            ? () => {
                if (isStaffRegistered) {
                  if (onProceedToStaffLogin) {
                    onProceedToStaffLogin(servant.username || effectiveUsername);
                  } else {
                    onBackToLogin();
                  }
                } else {
                  onEnterReadOnlyProfile(registeredData.servant);
                }
              }
            : undefined
        }
        secondaryActionLabel="العودة لشاشة تسجيل الدخول"
        onSecondaryAction={onBackToLogin}
      />
    );
  }

  return (
    <div
      className={`rounded-3xl p-4 sm:p-6 border-2 transition-colors ${
        isLight
          ? 'bg-white border-amber-200/90 text-slate-900 shadow-xl shadow-amber-900/5'
          : 'bg-[#12192B]/95 border-slate-800/90 text-slate-100 shadow-2xl shadow-black/50'
      }`}
    >
      {/* مدخلات رفع الصورة والكاميرا المخفية */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="user"
        onChange={handlePhotoSelect}
        className="hidden"
      />

      {/* رأس شاشة تسجيل الخادم */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-500/20">
        <div className="flex items-center gap-2.5">
          <div className="w-11 h-11 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
            <UserPlus className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-extrabold">تسجيل خادم جديد</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onBackToLogin}
          className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
            isLight
              ? 'border-amber-300 bg-amber-50/70 text-slate-800 hover:bg-amber-100'
              : 'border-slate-700 text-slate-300 hover:bg-slate-800'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          <span>عودة للدخول</span>
        </button>
      </div>

      {!isStageOpenForRegistration ? (
        <div className="mt-5 rounded-2xl p-6 border border-rose-500/30 bg-rose-500/10 text-center space-y-3">
          <Lock className="w-10 h-10 text-rose-400 mx-auto" />
          <h3 className="text-base font-extrabold text-rose-500">
            {!isServantRegistrationOpen
              ? 'باب تسجيل الخدام الجدد مغلق حالياً بقرار من الأدمن'
              : `تسجيل الخدام الجدد مقفول في المرحلة الحالية (${edition.current_stage})`}
          </h3>
          <p className="text-xs sm:text-sm opacity-90 leading-relaxed">
            {!isServantRegistrationOpen
              ? 'قامت إدارة الكرنفال بإغلاق تسجيل الخدام الجدد حالياً. إذا كنت مسجلاً بالفعل يمكنك العودة لشاشة تسجيل الدخول.'
              : 'يُسمح بتسجيل الخدام الجدد في المراحل ١ إلى ٣ فقط.'}
          </p>
        </div>
      ) : displayedServices.length === 0 ? (
        <div className="mt-5 rounded-2xl p-6 border border-amber-500/30 bg-amber-500/10 text-center space-y-2">
          <AlertTriangle className="w-9 h-9 text-amber-500 mx-auto" />
          <h3 className="text-base font-bold">لا توجد مراحل خدمية مضافة حالياً</h3>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {errorMsg && (
            <div className="rounded-2xl p-3.5 bg-rose-500/15 border border-rose-500/40 flex items-start gap-2.5 text-rose-600 dark:text-rose-300 text-xs sm:text-sm font-extrabold">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ١. الاسم رباعي */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold mb-1.5">
              ١- الاسم رباعي <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="الاسم رباعي بالكامل"
                className={`w-full min-h-[48px] pl-4 pr-10 rounded-2xl border-2 text-sm font-bold outline-none transition-colors ${
                  isLight
                    ? 'bg-amber-50/40 border-amber-200 text-slate-900 focus:border-orange-500 focus:bg-white'
                    : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                }`}
              />
              <User className="w-4 h-4 text-orange-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* ٢. الرقم القومي */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold mb-1.5">
              ٢- الرقم القومي (١٤ رقماً) <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                dir="ltr"
                required
                maxLength={14}
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
                placeholder="١٤ رقماً"
                className={`w-full min-h-[48px] pl-4 pr-10 rounded-2xl border-2 text-center font-[family-name:var(--font-mono)] tabular-nums text-sm sm:text-base font-extrabold tracking-wider outline-none transition-colors ${
                  parsedNatId.isValid
                    ? 'border-emerald-500 bg-emerald-500/5'
                    : isLight
                    ? 'bg-amber-50/40 border-amber-200 text-slate-900 focus:border-orange-500 focus:bg-white'
                    : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                }`}
              />
              <CreditCard className="w-4 h-4 text-orange-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
            {nationalId.length > 0 && !parsedNatId.isValid && (
              <p className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                {parsedNatId.error} ({nationalId.length}/14)
              </p>
            )}
          </div>

          {/* ٣. النوع + ٤. تاريخ الميلاد + ٥. المحافظة */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* ٣. النوع */}
            <div
              className={`rounded-2xl p-3 border-2 ${
                parsedNatId.gender
                  ? isLight
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                  : isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0D1323] border-slate-800'
              }`}
            >
              <label className="block text-[11px] font-extrabold opacity-75 mb-1">
                ٣- النوع
              </label>
              <div className="flex items-center gap-1.5 text-sm font-extrabold">
                <User className="w-4 h-4 text-orange-500 shrink-0" />
                <span>{parsedNatId.gender || '—'}</span>
              </div>
            </div>

            {/* ٤. تاريخ الميلاد */}
            <div
              className={`rounded-2xl p-3 border-2 ${
                parsedNatId.birthDate
                  ? isLight
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                  : isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0D1323] border-slate-800'
              }`}
            >
              <label className="block text-[11px] font-extrabold opacity-75 mb-1">
                ٤- تاريخ الميلاد
              </label>
              <div className="flex items-center gap-1.5 text-sm font-extrabold">
                <Calendar className="w-4 h-4 text-blue-600 shrink-0" />
                <span dir="ltr" className="font-[family-name:var(--font-mono)]">
                  {parsedNatId.birthDate || 'YYYY-MM-DD'}
                </span>
              </div>
            </div>

            {/* ٥. المحافظة */}
            <div
              className={`rounded-2xl p-3 border-2 ${
                parsedNatId.governorate
                  ? isLight
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-emerald-500/10 border-emerald-500/30'
                  : isLight
                  ? 'bg-slate-50 border-slate-200'
                  : 'bg-[#0D1323] border-slate-800'
              }`}
            >
              <label className="block text-[11px] font-extrabold opacity-75 mb-1">
                ٥- المحافظة
              </label>
              <div className="flex items-center gap-1.5 text-sm font-extrabold">
                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{parsedNatId.governorate || '—'}</span>
              </div>
            </div>
          </div>

          {/* ٦. رقم الموبايل + ٧. رقم واتساب */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 items-stretch">
            {/* ٦. رقم الموبايل وبجانبه بوكس صح لو هو نفسه رقم الواتساب */}
            <div className="flex flex-col justify-between">
              <div className="min-h-[34px] flex items-center justify-between gap-2 mb-1.5">
                <label className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
                  ٦- رقم الموبايل <span className="text-orange-500">*</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-orange-600 dark:text-amber-400 font-extrabold cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={sameWhatsapp}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameWhatsapp(checked);
                      if (checked) {
                        setWhatsapp(phone);
                      }
                    }}
                    className="w-4 h-4 rounded accent-orange-500 cursor-pointer shrink-0"
                  />
                  <span className="flex flex-col leading-[1.15] text-[10px] sm:text-[11px] text-right">
                    <span>نفس رقم</span>
                    <span>الواتساب</span>
                  </span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  required
                  maxLength={11}
                  value={phone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setPhone(val);
                    if (sameWhatsapp) {
                      setWhatsapp(val);
                    }
                  }}
                  placeholder="01XXXXXXXXX"
                  className={`w-full min-h-[48px] pl-4 pr-10 rounded-2xl border-2 text-center font-[family-name:var(--font-mono)] tabular-nums text-sm font-extrabold outline-none transition-colors ${
                    isLight
                      ? 'bg-amber-50/40 border-amber-200 text-slate-900 focus:border-orange-500 focus:bg-white'
                      : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                  }`}
                />
                <Phone className="w-4 h-4 text-orange-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* ٧. رقم واتساب */}
            <div className="flex flex-col justify-between">
              <div className="min-h-[34px] flex items-center justify-between mb-1.5">
                <label className="text-xs sm:text-sm font-extrabold whitespace-nowrap">
                  ٧- رقم واتساب <span className="text-orange-500">*</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="tel"
                  dir="ltr"
                  required
                  readOnly={sameWhatsapp}
                  maxLength={11}
                  value={sameWhatsapp ? phone : whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ''))}
                  placeholder="01XXXXXXXXX"
                  className={`w-full min-h-[48px] pl-4 pr-10 rounded-2xl border-2 text-center font-[family-name:var(--font-mono)] tabular-nums text-sm font-extrabold outline-none transition-colors ${
                    sameWhatsapp ? 'opacity-75 cursor-not-allowed' : ''
                  } ${
                    isLight
                      ? 'bg-amber-50/40 border-amber-200 text-slate-900 focus:border-orange-500 focus:bg-white'
                      : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                  }`}
                />
                <Phone className="w-4 h-4 text-emerald-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>

          {/* بريد Google الإلكتروني (اختياري للدخول بـ Firebase Auth) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs sm:text-sm font-extrabold">
                البريد الإلكتروني / حساب Google <span className="text-[11px] font-bold opacity-65">(اختياري)</span>
              </label>
            </div>
            <div className="relative">
              <input
                type="email"
                dir="ltr"
                maxLength={160}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@gmail.com (اختياري)"
                className={`w-full min-h-[46px] pl-4 pr-10 rounded-2xl border-2 text-center font-[family-name:var(--font-mono)] text-xs sm:text-sm font-bold outline-none transition-colors ${
                  isLight
                    ? 'bg-amber-50/40 border-amber-200 text-slate-900 focus:border-orange-500 focus:bg-white'
                    : 'bg-[#0D1323] border-slate-700/80 text-white focus:border-orange-500'
                }`}
              />
              <Mail className="w-4 h-4 text-blue-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* ٨. اسم الخدمة التابع لها */}
          <div>
            <label className="block text-xs sm:text-sm font-extrabold mb-1.5">
              ٨- اسم الخدمة التابع لها <span className="text-orange-500">*</span>
            </label>
            <select
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className={`w-full min-h-[48px] px-4 rounded-2xl border-2 text-xs sm:text-sm font-extrabold outline-none transition-colors cursor-pointer ${
                isLight
                  ? 'bg-amber-50/40 border-amber-200 text-slate-900 focus:border-orange-500 focus:bg-white'
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

          {/* ٩. الصفة بالكرنفال والمهارات */}
          <div
            className={`rounded-2xl p-3.5 sm:p-4 border-2 space-y-3 ${
              isLight ? 'bg-amber-50/40 border-amber-200/80' : 'bg-[#0D1323]/90 border-slate-800'
            }`}
          >
            <div className="space-y-2">
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold">
                <Sparkles className="w-4 h-4 text-orange-500" />
                <span>٩- اختر صفتك / صلاحيتك بالكرنفال <span className="text-orange-500">*</span></span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPrimaryRole('team_lead')}
                  className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer space-y-1 ${
                    primaryRole === 'team_lead'
                      ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-white border-orange-500 shadow-sm'
                      : isLight
                      ? 'bg-white text-slate-800 border-amber-200 hover:bg-amber-50'
                      : 'bg-[#141D33] text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-black">
                    <span>خادم فريق (مشاركون)</span>
                    {primaryRole === 'team_lead' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPrimaryRole('staff')}
                  className={`p-3 rounded-xl border-2 text-right transition-all cursor-pointer ${
                    primaryRole === 'staff'
                      ? 'bg-gradient-to-l from-blue-600 to-sky-600 text-white border-blue-500 shadow-sm'
                      : isLight
                      ? 'bg-white text-slate-800 border-slate-300 hover:bg-blue-50'
                      : 'bg-[#141D33] text-slate-200 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs font-black">
                    <span>خادم فرق عمل (تنظيم وإدخال مخدومين)</span>
                    {primaryRole === 'staff' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  </div>
                </button>
              </div>
            </div>

            {primaryRole === 'staff' && (
              <div
                className={`rounded-2xl p-3.5 border-2 space-y-3 ${
                  isLight ? 'bg-blue-50/75 border-blue-200' : 'bg-blue-950/25 border-blue-500/30'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-black text-blue-700 dark:text-sky-300">
                    <KeyRound className="w-4 h-4 shrink-0" />
                    <span>بيانات الدخول لخادم فرق العمل</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <label className="text-xs font-extrabold">
                      اسم المستخدم الخاص بك (Username) <span className="text-orange-500">*</span>
                    </label>
                    {hasEditedUsername && (
                      <button
                        type="button"
                        onClick={() => {
                          setHasEditedUsername(false);
                          setCustomUsername('');
                        }}
                        className="text-[10px] font-extrabold text-blue-600 dark:text-sky-400 underline cursor-pointer"
                      >
                        استعادة الاسم المقترح
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      dir="ltr"
                      required
                      value={hasEditedUsername ? customUsername : suggestedUsername}
                      onChange={(e) => {
                        setHasEditedUsername(true);
                        setCustomUsername(e.target.value.replace(/[^a-zA-Z0-9._-]/g, '').toLowerCase());
                      }}
                      placeholder="name.surname"
                      className={`w-full min-h-[44px] pl-4 pr-10 rounded-xl border-2 text-center font-[family-name:var(--font-mono)] text-sm font-black outline-none transition-colors ${
                        isLight
                          ? 'bg-white border-blue-300 text-slate-900 focus:border-blue-600'
                          : 'bg-[#0D1323] border-slate-700 text-white focus:border-sky-400'
                      }`}
                    />
                    <AtSign className="w-4 h-4 text-blue-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      كلمة المرور الجديدة <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        dir="ltr"
                        required
                        minLength={4}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="٤ رموز فأكثر"
                        className={`w-full min-h-[44px] px-9 rounded-xl border-2 text-center font-[family-name:var(--font-mono)] text-sm font-bold outline-none transition-colors ${
                          isLight
                            ? 'bg-white border-blue-300 text-slate-900 focus:border-blue-600'
                            : 'bg-[#0D1323] border-slate-700 text-white focus:border-sky-400'
                        }`}
                      />
                      <Lock className="w-4 h-4 text-blue-600 absolute right-3 top-1/2 -translate-y-1/2" />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((p) => !p)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-blue-600 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold mb-1">
                      تأكيد كلمة المرور <span className="text-orange-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        dir="ltr"
                        required
                        minLength={4}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد كتابة كلمة المرور"
                        className={`w-full min-h-[44px] px-9 rounded-xl border-2 text-center font-[family-name:var(--font-mono)] text-sm font-bold outline-none transition-colors ${
                          confirmPassword && confirmPassword === newPassword
                            ? 'border-emerald-500 bg-emerald-500/5'
                            : isLight
                            ? 'bg-white border-blue-300 text-slate-900 focus:border-blue-600'
                            : 'bg-[#0D1323] border-slate-700 text-white focus:border-sky-400'
                        }`}
                      />
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>
                {/* المهارات التفصيلية تظهر فقط عند اختيار خادم فرق عمل وبنفس اللون اللبني */}
                <div className="pt-2.5 border-t border-blue-500/20 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-extrabold text-blue-800 dark:text-sky-300">
                      المهارات التفصيلية (اختر مهارة أو أكثر){' '}
                      <span className="text-sky-500">*</span>
                    </label>
                    <span className="text-[11px] font-bold text-blue-700 dark:text-sky-300">
                      تم اختيار ({selectedSkills.length})
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {AVAILABLE_SKILLS.filter((skill) => skill !== 'خادم فريق').map((skill) => {
                      const active = selectedSkills.includes(skill);
                      return (
                        <button
                          key={skill}
                          type="button"
                          onClick={() => toggleSkill(skill)}
                          className={`min-h-[42px] px-3.5 py-2 rounded-xl text-xs font-extrabold border-2 flex items-center justify-between gap-2 transition-all cursor-pointer text-right ${
                            active
                              ? 'bg-gradient-to-l from-blue-600 to-sky-500 text-white border-sky-500 shadow-sm'
                              : isLight
                              ? 'bg-white text-slate-700 border-blue-200 hover:bg-sky-50 hover:border-sky-300'
                              : 'bg-[#0D1323] text-slate-200 border-blue-500/30 hover:border-sky-400'
                          }`}
                        >
                          <span>{skill}</span>
                          {active && <CheckCircle2 className="w-4 h-4 shrink-0 text-white" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ١٠. صورة شخصية (رفع صورة من الجهاز أو كاميرا) */}
          <div
            className={`rounded-2xl p-3.5 sm:p-4 border-2 space-y-3 ${
              isLight ? 'bg-slate-50 border-amber-200/80' : 'bg-[#0D1323]/90 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold">
                <Camera className="w-4 h-4 text-blue-600" />
                <span>١٠- صورة شخصية (للبادج وملف الخادم)</span>
              </label>
              <span className="text-[11px] opacity-75">
                {avatarUrl ? 'تم إرفاق الصورة' : 'من الجهاز أو الكاميرا'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3.5">
              <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-orange-400 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="الصورة الشخصية"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-9 h-9 text-slate-400" />
                )}
              </div>

              <div className="flex flex-wrap gap-2 flex-1">
                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[42px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>رفع صورة من الجهاز</span>
                </button>

                <button
                  type="button"
                  disabled={isUploadingPhoto}
                  onClick={() => cameraInputRef.current?.click()}
                  className="min-h-[42px] px-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>التقاط بالكاميرا</span>
                </button>

                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(null)}
                    className="min-h-[42px] px-3 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-extrabold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* زر حفظ وتسجيل البيانات */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full min-h-[54px] rounded-full bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer disabled:opacity-50"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>{isSubmitting ? 'جاري حفظ وتسجيل البيانات...' : 'حفظ وتسجيل البيانات'}</span>
          </button>
        </form>
      )}
    </div>
  );
};
