'use client';

import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Hash,
  UserCheck,
  CreditCard,
  Lock,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldCheck,
  HelpCircle,
  UserPlus,
  Mail,
  Database,
  ClipboardCheck,
  WifiOff,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Phone,
  MessageSquare,
  Layers,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  INITIAL_EDITION,
  INITIAL_SERVICES,
  INITIAL_AXES,
  INITIAL_SERVANTS,
  INITIAL_SERVANT_ROLES,
  INITIAL_LOGIN_CODES,
  INITIAL_OUTBOX,
  INITIAL_AUDIT_LOGS,
  DEMO_CREDENTIALS,
  EVENT_STAGES,
  computeHash,
  generateRandomCode,
  generateQrToken,
  createRecordId,
  getIsoNow,
  getReadableNow,
  maskEmail,
  type Edition,
  type Servant,
  type ServantRoleRecord,
  type LoginCodeRecord,
  type RecoveryRequestRecord,
  type AuditLogRecord,
  type SimulatedEmailMessage,
  type EventStageNumber,
} from '@/lib/carnival-store';
import { CarnivalEmblem } from './CarnivalEmblem';
import { RegisterServantView, type RegisterServantPayload } from './RegisterServantView';
import { SessionDashboardPreview } from './SessionDashboardPreview';
import { InspectorDrawer } from './InspectorDrawer';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';
import { useOnlineStatus } from '@/hooks/use-pwa';

type SimulatedUiState = 'normal' | 'loading' | 'empty' | 'error' | 'offline';

export const CarnivalAuthPortal: React.FC = () => {
  // حالة البيانات الأساسية (تحاكي جداول Supabase للمرحلة 1 و 2)
  const [edition, setEdition] = useState<Edition>(INITIAL_EDITION);
  const [services] = useState(INITIAL_SERVICES);
  const [axes] = useState(INITIAL_AXES);
  const [servants, setServants] = useState<Servant[]>(INITIAL_SERVANTS);
  const [servantRoles] = useState<ServantRoleRecord[]>(INITIAL_SERVANT_ROLES);
  const [loginCodes, setLoginCodes] = useState<LoginCodeRecord[]>(INITIAL_LOGIN_CODES);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequestRecord[]>([]);
  const [outbox, setOutbox] = useState<SimulatedEmailMessage[]>(INITIAL_OUTBOX);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);

  // الهوية البصرية المعتمدة: خلفيات فاتحة مبهجة مع ألوان كرنفالية زاهية كوضع افتراضي
  const [isLight, setIsLight] = useState(true);
  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [lastSavedTarget, setLastSavedTarget] = useState<'church' | 'carnival' | null>(null);
  const [uiState, setUiState] = useState<SimulatedUiState>('normal');
  const isOnline = useOnlineStatus(uiState === 'offline');

  // نافذة أدوات الاختبار والمحاكاة العائمة (تفتح عند الحاجة فقط)
  const [simPanelOpen, setSimPanelOpen] = useState(false);

  // التبويب الرئيسي (المشاركون vs فريق العمل)
  const [mainTab, setMainTab] = useState<'participants' | 'staff'>('participants');
  // التبويب الفرعي داخل المشاركون (كود الـ PIN vs الاسترجاع بالرقم القومي)
  const [participantSubTab, setParticipantSubTab] = useState<'pin' | 'national_id'>('pin');
  // التبويب الفرعي داخل فريق العمل (دخول الأدمن بالكود+كلمة المرور vs دخول فريق العمل بالكود)
  const [staffSubTab, setStaffSubTab] = useState<'admin_password' | 'staff_code'>('admin_password');
  // شاشة تسجيل خادم جديد
  const [showRegisterView, setShowRegisterView] = useState(false);

  // حقول الإدخال
  const [pinCode, setPinCode] = useState('');
  const [staffCode, setStaffCode] = useState('');
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // حقول الاسترجاع بالرقم القومي
  const [recoveryNatId, setRecoveryNatId] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryChannel, setRecoveryChannel] = useState<'email' | 'whatsapp_admin'>('email');
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const MAX_RECOVERY_ATTEMPTS = 3;

  // عداد محاولات الدخول
  const [loginAttempts, setLoginAttempts] = useState(0);
  const MAX_LOGIN_ATTEMPTS = 5;

  // رسائل الحالة والتنبيهات
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success' | 'warning';
    title: string;
    body: string;
  } | null>(null);
  const [showPinHelp, setShowPinHelp] = useState(false);

  // الجلسة النشطة بعد تسجيل الدخول
  const [activeServant, setActiveServant] = useState<Servant | null>(null);

  // درج الفحص (الإيميلات، الداتابيز، قائمة الاختبار اليدوي)
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'outbox' | 'database' | 'checklist'>('outbox');

  const appendAuditLog = (
    actorId: string | null,
    actorName: string,
    action: string,
    target: string,
    details: Record<string, string | number | boolean>
  ) => {
    const newRecord: AuditLogRecord = {
      id: createRecordId('aud'),
      edition_id: edition.id,
      actor_id: actorId,
      actor_name: actorName,
      action,
      target,
      details,
      created_at: getReadableNow(19),
    };
    setAuditLogs((prev) => [newRecord, ...prev]);
  };

  // استرجاع اللوجوهات المحفوظة من الداتابيز (السيرفر + LocalStorage) عند فتح التطبيق
  useEffect(() => {
    let isMounted = true;

    const readLocalBranding = (): Partial<Edition> | null => {
      try {
        const localRaw = window.localStorage.getItem('carnival_2027_branding_v1');
        return localRaw ? (JSON.parse(localRaw) as Partial<Edition>) : null;
      } catch {
        return null;
      }
    };

    fetch('/api/branding')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData) => {
        if (!isMounted) return;
        const localData = readLocalBranding();
        setEdition((prev) => {
          const merged: Edition = {
            ...prev,
            church_logo_url:
              serverData?.church_logo_url ??
              localData?.church_logo_url ??
              prev.church_logo_url,
            carnival_logo_url:
              serverData?.carnival_logo_url ||
              localData?.carnival_logo_url ||
              prev.carnival_logo_url,
            church_name:
              serverData?.church_name || localData?.church_name || prev.church_name,
            service_title:
              serverData?.service_title || localData?.service_title || prev.service_title,
          };
          try {
            window.localStorage.setItem('carnival_2027_branding_v1', JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      })
      .catch(() => {
        if (!isMounted) return;
        const localData = readLocalBranding();
        if (!localData) return;
        setEdition((prev) => ({
          ...prev,
          church_logo_url:
            localData.church_logo_url !== undefined
              ? localData.church_logo_url
              : prev.church_logo_url,
          carnival_logo_url: localData.carnival_logo_url || prev.carnival_logo_url,
          church_name: localData.church_name || prev.church_name,
          service_title: localData.service_title || prev.service_title,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // حفظ اللوجو الجديد (لوجو الكنيسة أو لوجو الخدمة/الكرنفال) في الداتابيز (السيرفر + LocalStorage + جدول editions)
  const handleLogoUpload = async (target: 'church' | 'carnival', dataUrl: string) => {
    setIsSavingLogo(true);
    setLastSavedTarget(null);

    const updatedFields =
      target === 'church'
        ? { church_logo_url: dataUrl }
        : { carnival_logo_url: dataUrl };

    setEdition((prev) => {
      const nextEdition = { ...prev, ...updatedFields };
      try {
        window.localStorage.setItem('carnival_2027_branding_v1', JSON.stringify(nextEdition));
      } catch {
        // ignore
      }
      return nextEdition;
    });

    try {
      await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edition_id: edition.id,
          ...updatedFields,
        }),
      });
    } catch {
      // localStorage already saved if offline
    }

    appendAuditLog(
      's-admin-1',
      'إعدادات الهوية (أدمن)',
      target === 'church' ? 'CHURCH_LOGO_SAVED_DB' : 'CARNIVAL_LOGO_SAVED_DB',
      `editions/${edition.id}`,
      {
        target_column: target === 'church' ? 'church_logo_url' : 'carnival_logo_url',
        persisted: true,
      }
    );

    setIsSavingLogo(false);
    setLastSavedTarget(target);
    setStatusMessage({
      type: 'success',
      title:
        target === 'church'
          ? 'تم حفظ لوجو الكنيسة في قاعدة البيانات بنجاح'
          : 'تم حفظ لوجو الخدمة / الكرنفال في قاعدة البيانات بنجاح',
      body: 'تم تخزين اللوجو في سجل الدورة النشطة (جدول editions على السيرفر وفي المتصفح) ولن يضيع عند إعادة تحميل الصفحة.',
    });
  };

  const handleStageChange = (newStage: EventStageNumber) => {
    setEdition((prev) => ({ ...prev, current_stage: newStage }));
    appendAuditLog('s-admin-1', 'شريط المحاكاة (أدمن)', 'STAGE_CHANGED', `editions/${edition.id}`, {
      from_stage: edition.current_stage,
      to_stage: newStage,
    });
  };

  // تنفيذ الدخول بالكود السري (للمشاركين أو فريق العمل)
  const handleCodeLogin = (e: React.FormEvent, rawCode: string, modeLabel: string) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isOnline) {
      setStatusMessage({
        type: 'error',
        title: 'أنت الآن في وضع عدم الاتصال (Offline)',
        body: 'تسجيل الدخول لأول مرة يتطلب اتصالاً بالإنترنت للتحقق من الكود المجزأ في السيرفر. بعد الدخول تبقى جلستك محفوظة أوفلاين.',
      });
      return;
    }

    if (uiState === 'error') {
      setStatusMessage({
        type: 'error',
        title: 'خطأ محاكاة في الاتصال بقاعدة البيانات (Error State)',
        body: 'تم تفعيل وضع اختبار الأخطاء من زر المحاكاة العائم. أعد الحالة إلى «طبيعي» لإتمام الدخول.',
      });
      return;
    }

    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      setStatusMessage({
        type: 'error',
        title: 'تم إيقاف المحاولات مؤقتاً لحماية الحساب (Rate Limit)',
        body: `لقد استنفدت الحد الأقصى (${MAX_LOGIN_ATTEMPTS} محاولات). يرجى استخدام استرجاع الكود بالرقم القومي أو مراجعة الأدمن.`,
      });
      return;
    }

    const cleanCode = rawCode.trim().toUpperCase();
    if (cleanCode.length < 4) {
      setStatusMessage({
        type: 'error',
        title: 'كود الدخول غير مكتمل',
        body: 'يرجى إدخال كود الدخول السري المكون من ٦ رموز (مثال: A8K2P9).',
      });
      return;
    }

    if (cleanCode.startsWith('SRV-QR-')) {
      setLoginAttempts((c) => c + 1);
      appendAuditLog(null, 'مجهول', 'LOGIN_REJECTED_QR_USED_AS_CODE', 'auth/login', {
        attempted_token: cleanCode,
      });
      setStatusMessage({
        type: 'error',
        title: 'تنبيه أمني: هذا رمز الهوية (QR) وليس كود الدخول السري!',
        body: 'طبقاً لقواعد الأمان، رمز الـ QR المطبوع على البادج مخصص لمسح الحضور فقط ولا يصلح لتسجيل الدخول لمنع انتحال الهوية.',
      });
      return;
    }

    const hashedInput = computeHash(cleanCode);
    const matchedCode = loginCodes.find((lc) => lc.code_hash === hashedInput);

    if (!matchedCode) {
      const nextAttempts = loginAttempts + 1;
      setLoginAttempts(nextAttempts);
      appendAuditLog(null, 'مجهول', 'LOGIN_FAILED_INVALID_CODE', 'auth/login', {
        mode: modeLabel,
        attempt: nextAttempts,
      });
      setStatusMessage({
        type: 'error',
        title: 'كود الدخول غير صحيح أو منتهي الصلاحية',
        body: `لم يتم العثور على كود مطابق. المحاولات المتبقية: ${MAX_LOGIN_ATTEMPTS - nextAttempts}.`,
      });
      return;
    }

    const servant = servants.find((s) => s.id === matchedCode.servant_id);
    if (!servant) return;

    if (servant.status === 'disabled') {
      appendAuditLog(servant.id, servant.full_name, 'LOGIN_BLOCKED_DISABLED', `servants/${servant.id}`, {});
      setStatusMessage({
        type: 'error',
        title: 'تم إيقاف هذا الحساب',
        body: 'حساب الخادم موقوف من قبل إدارة الكرنفال.',
      });
      return;
    }

    setLoginCodes((prev) =>
      prev.map((lc) => (lc.id === matchedCode.id ? { ...lc, used_at: getIsoNow() } : lc))
    );
    setLoginAttempts(0);
    appendAuditLog(servant.id, servant.full_name, 'LOGIN_SUCCESS_BY_CODE', `servants/${servant.id}`, {
      status: servant.status,
      mode: modeLabel,
    });
    setActiveServant(servant);
  };

  // تنفيذ دخول الأدمن (كود/اسم المستخدم + كلمة المرور)
  const handleAdminPasswordLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isOnline) {
      setStatusMessage({
        type: 'error',
        title: 'لا يوجد اتصال بالإنترنت (Offline)',
        body: 'دخول الأدمن يتطلب اتصالاً بالشبكة للتحقق من الصلاحيات.',
      });
      return;
    }

    const cleanId = adminIdentifier.trim();
    const cleanPass = adminPassword.trim();

    if (!cleanId || !cleanPass) {
      setStatusMessage({
        type: 'error',
        title: 'بيانات دخول الأدمن ناقصة',
        body: 'يرجى إدخال كود الأدمن (ADM999) أو اسم المستخدم (michael.admin) مع كلمة المرور.',
      });
      return;
    }

    const hashedPass = computeHash(cleanPass);
    const hashedIdAsCode = computeHash(cleanId.toUpperCase());

    const adminServant = servants.find((s) => {
      const isAdminRole = servantRoles.some((r) => r.servant_id === s.id && r.role === 'admin');
      if (!isAdminRole) return false;
      const hasMatchingUsername = s.admin_username?.toLowerCase() === cleanId.toLowerCase();
      const hasMatchingCode = loginCodes.some(
        (lc) => lc.servant_id === s.id && lc.code_hash === hashedIdAsCode
      );
      return (hasMatchingUsername || hasMatchingCode) && s.admin_password_hash === hashedPass;
    });

    if (!adminServant) {
      const nextAttempts = loginAttempts + 1;
      setLoginAttempts(nextAttempts);
      appendAuditLog(null, cleanId, 'ADMIN_LOGIN_FAILED', 'auth/admin', {
        attempt: nextAttempts,
      });
      setStatusMessage({
        type: 'error',
        title: 'بيانات دخول الأدمن غير صحيحة',
        body: 'تأكد من كود الأدمن (ADM999 أو michael.admin) وكلمة المرور (Carnival@2027).',
      });
      return;
    }

    setLoginAttempts(0);
    appendAuditLog(adminServant.id, adminServant.full_name, 'ADMIN_LOGIN_SUCCESS', `servants/${adminServant.id}`, {
      role: 'admin',
    });
    setActiveServant(adminServant);
  };

  // تنفيذ الاسترجاع بالرقم القومي
  const handleNationalIdRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isOnline) {
      setStatusMessage({
        type: 'error',
        title: 'لا يمكن استرجاع الكود أوفلاين',
        body: 'يرجى الاتصال بالإنترنت لإرسال طلب الاسترجاع.',
      });
      return;
    }

    if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      appendAuditLog(null, 'طلب استرجاع', 'RECOVERY_RATE_LIMITED', 'auth/recover', {
        attempts: recoveryAttempts,
      });
      setStatusMessage({
        type: 'error',
        title: 'تجاوزت الحد الأقصى لمحاولات الاسترجاع (٣ محاولات)',
        body: 'تم قفل الاسترجاع التلقائي مؤقتاً وتم تسجيل المحاولة في سجل المراجعة. يرجى التواصل مع الأدمن مباشرة.',
      });
      return;
    }

    const cleanNatId = recoveryNatId.replace(/\D/g, '');
    const cleanPhone = recoveryPhone.replace(/\D/g, '');

    if (cleanNatId.length !== 14) {
      setStatusMessage({
        type: 'error',
        title: 'الرقم القومي غير مكتمل',
        body: 'يرجى إدخال الرقم القومي المكون من ١٤ رقماً بالضبط.',
      });
      return;
    }

    if (!/^01[0125]\d{8}$/.test(cleanPhone)) {
      setStatusMessage({
        type: 'error',
        title: 'رقم الموبايل غير صحيح',
        body: 'يرجى إدخال رقم الموبايل المسجل (١١ رقماً).',
      });
      return;
    }

    const nextAttempts = recoveryAttempts + 1;
    setRecoveryAttempts(nextAttempts);

    const natHash = computeHash(cleanNatId);
    const matchedServant = servants.find(
      (s) => s.national_id_hash === natHash && s.phone === cleanPhone
    );

    if (!matchedServant) {
      appendAuditLog(null, 'مجهول', 'RECOVERY_FAILED_MISMATCH', 'auth/recover', {
        national_id_last4: cleanNatId.slice(-4),
        phone: cleanPhone,
        attempt: nextAttempts,
      });
      setStatusMessage({
        type: 'error',
        title: 'لم يتم العثور على بيانات مطابقة',
        body: `الرقم القومي أو رقم الموبايل غير مطابق لسجلات الخدام. المحاولات المتبقية: ${
          MAX_RECOVERY_ATTEMPTS - nextAttempts
        }.`,
      });
      return;
    }

    const newSecretCode = generateRandomCode(6);
    const newCodeHash = computeHash(newSecretCode);

    setLoginCodes((prev) => [
      {
        id: createRecordId('lc'),
        servant_id: matchedServant.id,
        code_hash: newCodeHash,
        delivery_status: recoveryChannel === 'email' ? 'sent' : 'whatsapp_sent',
        used_at: null,
        expires_at: '2027-02-05T23:59:59Z',
        created_at: getIsoNow(),
      },
      ...prev.filter((c) => c.servant_id !== matchedServant.id),
    ]);

    const newReq: RecoveryRequestRecord = {
      id: createRecordId('rec'),
      edition_id: edition.id,
      servant_id: matchedServant.id,
      servant_name: matchedServant.full_name,
      national_id_last4: matchedServant.national_id_last4,
      phone: matchedServant.phone,
      email: matchedServant.email,
      channel: recoveryChannel,
      status: recoveryChannel === 'email' ? 'sent_email' : 'pending_whatsapp',
      created_at: getReadableNow(16),
    };
    setRecoveryRequests((prev) => [newReq, ...prev]);

    if (recoveryChannel === 'email') {
      setOutbox((prev) => [
        {
          id: createRecordId('msg'),
          to_email: matchedServant.email,
          servant_name: matchedServant.full_name,
          subject: 'كود دخول سري جديد (استرجاع بالرقم القومي) - كرنفال 2027',
          secret_code_preview: newSecretCode,
          delivery_status: 'sent',
          sent_at: getReadableNow(16),
          purpose: 'recovery',
        },
        ...prev,
      ]);
    }

    appendAuditLog(
      matchedServant.id,
      matchedServant.full_name,
      'RECOVERY_CODE_ISSUED',
      `servants/${matchedServant.id}`,
      {
        channel: recoveryChannel,
        national_id_last4: matchedServant.national_id_last4,
        attempt: nextAttempts,
      }
    );

    setRecoveryNatId('');
    setRecoveryPhone('');

    if (recoveryChannel === 'email') {
      setStatusMessage({
        type: 'success',
        title: 'تم إرسال كود جديد إلى بريدك الإلكتروني المسجل',
        body: `حفاظاً على أمان بيانات الأطفال، لا يُعرض الكود على الشاشة أبداً. تم إرسال الكود الجديد إلى (${maskEmail(
          matchedServant.email
        )}). يمكنك فتح «صندوق الإيميل التجريبي» لمعاينته.`,
      });
    } else {
      setStatusMessage({
        type: 'warning',
        title: 'تم تحويل طلبك لشاشة الأدمن لإرسال الكود عبر واتساب',
        body: `تم تسجيل طلب استرجاع باسم (${matchedServant.full_name} - آخر ٤ أرقام قومي: ${matchedServant.national_id_last4}) في لوحة الأدمن وسجل المراجعة.`,
      });
    }
  };

  // تسجيل خادم جديد
  const handleRegisterServant = (payload: RegisterServantPayload) => {
    const natHash = computeHash(payload.national_id);
    const duplicateNat = servants.some((s) => s.national_id_hash === natHash);
    if (duplicateNat) {
      return {
        ok: false,
        error: 'هذا الرقم القومي مسجل بالفعل لخادم آخر في دورة الكرنفال الحالية.',
      };
    }

    const duplicateEmail = servants.some(
      (s) => s.email.toLowerCase() === payload.email.toLowerCase()
    );
    if (duplicateEmail) {
      return {
        ok: false,
        error: 'هذا البريد الإلكتروني مسجل بالفعل لخادم آخر.',
      };
    }

    const newServantId = createRecordId('s');
    const newQrToken = generateQrToken();
    const newSecretCode = generateRandomCode(6);
    const newCodeHash = computeHash(newSecretCode);
    const last4 = payload.national_id.slice(-4);
    const deliveryStatus: 'sent' | 'failed' = payload.simulate_email_failure ? 'failed' : 'sent';

    const newServant: Servant = {
      id: newServantId,
      edition_id: edition.id,
      full_name: payload.full_name,
      service_id: payload.service_id,
      phone: payload.phone,
      whatsapp: payload.whatsapp,
      email: payload.email,
      national_id_hash: natHash,
      national_id_last4: last4,
      health_and_skills: {
        skills: payload.skills,
        health_notes: payload.health_notes,
      },
      status: 'pending',
      qr_token: newQrToken,
      created_at: getIsoNow(),
    };

    const newLoginCode: LoginCodeRecord = {
      id: createRecordId('lc'),
      servant_id: newServantId,
      code_hash: newCodeHash,
      delivery_status: deliveryStatus,
      used_at: null,
      expires_at: '2027-02-05T23:59:59Z',
      created_at: getIsoNow(),
    };

    const newOutboxMsg: SimulatedEmailMessage = {
      id: createRecordId('msg'),
      to_email: payload.email,
      servant_name: payload.full_name,
      subject:
        deliveryStatus === 'sent'
          ? 'كود الدخول السري - كرنفال الأطفال 2027 (حسابك في انتظار الاعتماد)'
          : 'فشل الإرسال للإيميل - بانتظار إرسال الكود واتساب من الأدمن',
      secret_code_preview: newSecretCode,
      delivery_status: deliveryStatus,
      sent_at: getReadableNow(16),
      purpose: 'registration',
    };

    setServants((prev) => [newServant, ...prev]);
    setLoginCodes((prev) => [newLoginCode, ...prev]);
    setOutbox((prev) => [newOutboxMsg, ...prev]);

    const srvName = services.find((s) => s.id === payload.service_id)?.name || '';
    appendAuditLog(newServantId, payload.full_name, 'SERVANT_REGISTERED', `servants/${newServantId}`, {
      service: srvName,
      status: 'pending',
      national_id_last4: last4,
      delivery_status: deliveryStatus,
    });

    return {
      ok: true,
      servantName: payload.full_name,
      maskedEmail: maskEmail(payload.email),
      deliveryStatus,
      qrToken: newQrToken,
    };
  };

  // إرسال الكود واتساب من الأدمن لطلبات الاسترجاع
  const handleAdminSendWhatsappCode = (servantId: string) => {
    const srv = servants.find((s) => s.id === servantId);
    if (!srv) return;
    const newCode = generateRandomCode(6);
    setLoginCodes((prev) => [
      {
        id: createRecordId('lc'),
        servant_id: srv.id,
        code_hash: computeHash(newCode),
        delivery_status: 'whatsapp_sent',
        used_at: null,
        expires_at: '2027-02-05T23:59:59Z',
        created_at: getIsoNow(),
      },
      ...prev.filter((c) => c.servant_id !== srv.id),
    ]);
    setOutbox((prev) => [
      {
        id: createRecordId('msg'),
        to_email: `واتساب: ${srv.whatsapp}`,
        servant_name: srv.full_name,
        subject: 'تم إرسال الكود عبر واتساب بواسطة الأدمن',
        secret_code_preview: newCode,
        delivery_status: 'sent',
        sent_at: getReadableNow(16),
        purpose: 'admin_resend',
      },
      ...prev,
    ]);
    setRecoveryRequests((prev) =>
      prev.map((r) => (r.servant_id === servantId ? { ...r, status: 'resolved' } : r))
    );
    appendAuditLog('s-admin-1', 'مايكل يسري مسعد (أدمن)', 'ADMIN_SENT_CODE_WHATSAPP', `servants/${srv.id}`, {
      whatsapp: srv.whatsapp,
    });
  };

  const applyDemoCredential = (demo: (typeof DEMO_CREDENTIALS)[number]) => {
    setShowRegisterView(false);
    setActiveServant(null);
    setStatusMessage(null);
    setSimPanelOpen(false);

    if (demo.admin_username && demo.admin_password) {
      setMainTab('staff');
      setStaffSubTab('admin_password');
      setAdminIdentifier(demo.secret_code);
      setAdminPassword(demo.admin_password);
    } else if (demo.servant_id === 's-staff-1' || demo.servant_id === 's-lead-1') {
      setMainTab('staff');
      setStaffSubTab('staff_code');
      setStaffCode(demo.secret_code);
    } else {
      setMainTab('participants');
      setParticipantSubTab('pin');
      setPinCode(demo.secret_code);
    }
  };

  const currentStageMeta =
    EVENT_STAGES.find((s) => s.stage === edition.current_stage) || EVENT_STAGES[1];

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors ${
        isLight
          ? 'bg-gradient-to-b from-[#FFFDF7] via-[#FFF9EC] to-[#F4F8FF] text-slate-900'
          : 'bg-gradient-to-b from-[#080C17] via-[#0B101E] to-[#0E1528] text-slate-100'
      }`}
    >
      {/* شريط علوي رشيق يتبع Top Bar Contract (3 مناطق فقط) */}
      <header
        className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
          isLight
            ? 'bg-white/90 border-amber-200/80'
            : 'bg-[#0B101E]/90 border-slate-800/80'
        }`}
      >
        <div className="max-w-4xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
          {/* Zone 1: Brand Title */}
          <span
            className={`text-sm sm:text-base font-extrabold tracking-tight whitespace-nowrap shrink-0 ${
              isLight ? 'text-slate-900' : 'text-white'
            }`}
          >
            كرنفال Reflection 2027
          </span>

          {/* Zone 2: روابط الفحص السريعة */}
          <nav className="hidden sm:flex items-center gap-5 text-xs font-extrabold">
            <button
              type="button"
              onClick={() => {
                setInspectorTab('outbox');
                setInspectorOpen(true);
              }}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-orange-600' : 'text-slate-300 hover:text-orange-400'
              }`}
            >
              صندوق الإيميل ({outbox.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setInspectorTab('database');
                setInspectorOpen(true);
              }}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-blue-600' : 'text-slate-300 hover:text-cyan-400'
              }`}
            >
              الداتابيز ({auditLogs.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setInspectorTab('checklist');
                setInspectorOpen(true);
              }}
              className={`transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isLight ? 'text-slate-600 hover:text-emerald-600' : 'text-slate-300 hover:text-emerald-400'
              }`}
            >
              الاختبار اليدوي
            </button>
          </nav>

          {/* Zone 3: زر تثبيت التطبيق وتبديل الإضاءة */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton isLight={isLight} />
            <button
              type="button"
              onClick={() => setIsLight((prev) => !prev)}
              className={`min-h-[38px] px-3 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                isLight
                  ? 'bg-amber-100/80 text-amber-900 border-amber-300 hover:bg-amber-200/80'
                  : 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {isLight ? (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>ليلي</span>
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span>فاتح مبهج</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* شريط تنبيه الأوفلاين */}
      {!isOnline && (
        <div className="bg-amber-500 text-slate-950 px-4 py-2 text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            وضع عدم الاتصال (Offline Mode) نشط — يتم استخدام البيانات المخزنة محلياً.
          </span>
        </div>
      )}

      {/* المحتوى الرئيسي في المنتصف بدون زحام جانبي */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* الهيدر الثلاثي (لوجو الكنيسة يمين + اسم الكنيسة والخدمة في المنتصف + لوجو الكرنفال Reflection يسار وفي المنتصف) */}
        <CarnivalEmblem
          edition={edition}
          axes={uiState === 'empty' ? [] : axes}
          isLight={isLight}
          isSavingLogo={isSavingLogo}
          lastSavedTarget={lastSavedTarget}
          onLogoUpload={handleLogoUpload}
        />

        {/* حالات العرض أو نموذج الدخول */}
        {uiState === 'loading' ? (
          <div
            className={`rounded-3xl p-10 border text-center space-y-4 ${
              isLight
                ? 'bg-white border-amber-200 shadow-lg'
                : 'bg-[#12192B]/90 border-slate-800 shadow-2xl'
            }`}
          >
            <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
            <h3 className="text-base font-extrabold">جاري التحقق من حالة الدورة ومزامنة الصلاحيات...</h3>
            <p className="text-xs opacity-70">
              معاينة لحالة التحميل (Loading State). يمكنك إعادتها للوضع الطبيعي من الزر العائم بالأسفل.
            </p>
          </div>
        ) : activeServant ? (
          <SessionDashboardPreview
            edition={edition}
            servant={activeServant}
            roles={servantRoles
              .filter((r) => r.servant_id === activeServant.id)
              .map((r) => r.role)}
            serviceName={
              services.find((s) => s.id === activeServant.service_id)?.name || 'غير محدد'
            }
            allServices={services}
            isLight={isLight}
            onLogout={() => {
              appendAuditLog(
                activeServant.id,
                activeServant.full_name,
                'LOGOUT',
                `servants/${activeServant.id}`,
                {}
              );
              setActiveServant(null);
            }}
            onLogRlsTest={(action, target, allowed, reason) => {
              appendAuditLog(activeServant.id, activeServant.full_name, action, target, {
                allowed,
                reason: reason.slice(0, 70),
              });
            }}
          />
        ) : showRegisterView ? (
          <RegisterServantView
            edition={edition}
            services={services}
            isLight={isLight}
            isOffline={!isOnline}
            simulatedEmptyServices={uiState === 'empty'}
            onBackToLogin={() => setShowRegisterView(false)}
            onRegisterSubmit={handleRegisterServant}
            onOpenOutbox={() => {
              setInspectorTab('outbox');
              setInspectorOpen(true);
            }}
          />
        ) : (
          <div className="space-y-5">
            {/* التبويب المزدوج الرئيسي بألوان الكرنفال الزاهية: المشاركون (يمين) | فريق العمل (يسار) */}
            <div
              className={`p-1.5 rounded-full border-2 grid grid-cols-2 gap-1.5 ${
                isLight
                  ? 'bg-amber-50/90 border-amber-200 shadow-inner'
                  : 'bg-[#0E1424] border-slate-800/90 shadow-inner'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setMainTab('participants');
                  setStatusMessage(null);
                }}
                className={`min-h-[52px] rounded-full text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  mainTab === 'participants'
                    ? 'bg-gradient-to-l from-orange-500 via-amber-500 to-orange-600 text-white shadow-md shadow-orange-500/20'
                    : isLight
                    ? 'text-slate-700 hover:text-orange-700'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <CreditCard className="w-4 h-4 shrink-0" />
                <span>المشاركون</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMainTab('staff');
                  setStatusMessage(null);
                }}
                className={`min-h-[52px] rounded-full text-sm sm:text-base font-extrabold flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                  mainTab === 'staff'
                    ? 'bg-gradient-to-l from-blue-600 to-sky-600 text-white shadow-md shadow-blue-500/20'
                    : isLight
                    ? 'text-slate-700 hover:text-blue-700'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <UserCheck className="w-4 h-4 shrink-0" />
                <span>فريق العمل</span>
              </button>
            </div>

            {/* كارت الدخول الرئيسي بألوان فاتحة مبهجة وحواف واضحة */}
            <div
              className={`rounded-3xl p-5 sm:p-7 border-2 space-y-5 transition-colors ${
                isLight
                  ? 'bg-white border-amber-200/90 shadow-xl shadow-amber-900/5'
                  : 'bg-[#12192B]/95 border-slate-800/90 shadow-2xl shadow-black/60'
              }`}
            >
              {statusMessage && (
                <div
                  className={`rounded-2xl p-4 border text-xs sm:text-sm space-y-1 ${
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
                  <div className="font-extrabold flex items-center gap-2">
                    {statusMessage.type === 'error' ? (
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    )}
                    <span>{statusMessage.title}</span>
                  </div>
                  <p className="leading-relaxed opacity-90">{statusMessage.body}</p>
                </div>
              )}

              {mainTab === 'participants' ? (
                <>
                  {/* شريط التبويبات الفرعية للمشاركين (كود الـ PIN | الرقم القومي | تسجيل خادم جديد) */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      className={`p-1 rounded-full border inline-flex items-center gap-1 ${
                        isLight
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-[#0C1222] border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setParticipantSubTab('pin');
                          setStatusMessage(null);
                        }}
                        className={`min-h-[40px] px-4 rounded-full text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                          participantSubTab === 'pin'
                            ? 'bg-gradient-to-l from-orange-500 to-red-500 text-white shadow-sm'
                            : isLight
                            ? 'text-slate-700 hover:text-orange-600'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>كود الـ PIN</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setParticipantSubTab('national_id');
                          setStatusMessage(null);
                        }}
                        className={`min-h-[40px] px-4 rounded-full text-xs sm:text-sm font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                          participantSubTab === 'national_id'
                            ? 'bg-gradient-to-l from-orange-500 to-red-500 text-white shadow-sm'
                            : isLight
                            ? 'text-slate-700 hover:text-orange-600'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Hash className="w-3.5 h-3.5" />
                        <span>الرقم القومي</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowRegisterView(true);
                        setStatusMessage(null);
                      }}
                      className={`min-h-[40px] px-3.5 rounded-full border text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isLight
                          ? 'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700'
                          : 'border-orange-500/40 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>تسجيل خادم جديد</span>
                    </button>
                  </div>

                  {participantSubTab === 'pin' ? (
                    <form
                      onSubmit={(e) => handleCodeLogin(e, pinCode, 'participant_pin')}
                      className="space-y-4"
                    >
                      <div className="relative">
                        <input
                          type="text"
                          dir="ltr"
                          maxLength={12}
                          value={pinCode}
                          onChange={(e) => setPinCode(e.target.value.toUpperCase())}
                          placeholder="كود الـ PIN المطبوع (٦ رموز)"
                          className={`w-full min-h-[64px] px-12 rounded-full border-2 text-center font-[family-name:var(--font-mono)] text-base sm:text-lg font-extrabold tracking-widest uppercase outline-none transition-all ${
                            isLight
                              ? 'bg-amber-50/50 border-orange-400 text-slate-900 placeholder:text-slate-400 focus:border-orange-600 focus:bg-white'
                              : 'bg-[#1A2235] border-orange-500/60 text-white placeholder:text-slate-300/80 focus:border-orange-400 shadow-inner'
                          }`}
                        />
                        <KeyRound className="w-5 h-5 text-orange-500 absolute right-5 top-1/2 -translate-y-1/2" />
                      </div>

                      <div className="flex items-center justify-between px-2 text-xs sm:text-sm">
                        <button
                          type="button"
                          onClick={() => setShowPinHelp((prev) => !prev)}
                          className={`inline-flex items-center gap-1.5 font-bold hover:text-orange-600 transition-colors cursor-pointer ${
                            isLight ? 'text-slate-600' : 'text-slate-300'
                          }`}
                        >
                          <HelpCircle className="w-4 h-4 text-orange-500" />
                          <span>أين أجد كود الـ PIN؟</span>
                        </button>

                        <div className="inline-flex items-center gap-1.5 select-none">
                          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>مثال :</span>
                          <span
                            dir="ltr"
                            className={`font-[family-name:var(--font-mono)] font-bold ${
                              isLight ? 'text-slate-500' : 'text-slate-400'
                            }`}
                          >
                            X7M4Q2
                          </span>
                        </div>
                      </div>

                      {showPinHelp && (
                        <div
                          className={`rounded-2xl p-3.5 border text-xs leading-relaxed ${
                            isLight
                              ? 'bg-amber-50/80 border-amber-200 text-slate-700'
                              : 'bg-[#0B101E] border-slate-800 text-slate-300'
                          }`}
                        >
                          يُرسل كود الـ PIN السري إلى بريدك الإلكتروني الشخصي فور تسجيلك كخادم، وهو منفصل تماماً عن رمز الـ QR المطبوع على البادج. إذا فقدت الكود، اضغط على تبويب <strong>«# الرقم القومي»</strong> بالأعلى لاسترجاعه.
                        </div>
                      )}

                      <button
                        type="submit"
                        className="w-full min-h-[60px] rounded-full bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-orange-500/25 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.99] cursor-pointer"
                      >
                        <span>دخول المشارك إلى الكرنفال</span>
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleNationalIdRecovery} className="space-y-4">
                      <div
                        className={`rounded-2xl p-3.5 border text-xs leading-relaxed ${
                          isLight
                            ? 'bg-amber-50 border-amber-300 text-amber-950'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        <strong>استرجاع الكود السري بالرقم القومي:</strong> أدخل الرقم القومي (١٤ رقماً) ورقم موبايلك المسجل. لن يظهر أي كود على الشاشة؛ سيُرسل كود جديد لبريدك المسجل أو يُحوّل الطلب للأدمن عبر واتساب. (المحاولات المتبقية:{' '}
                        <span dir="ltr" className="font-extrabold">
                          {MAX_RECOVERY_ATTEMPTS - recoveryAttempts}
                        </span>
                        )
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold mb-1.5">
                            الرقم القومي المسجل (١٤ رقماً):
                          </label>
                          <div className="relative">
                              <input
                              type="text"
                              dir="ltr"
                              maxLength={14}
                              required
                              value={recoveryNatId}
                              onChange={(e) => setRecoveryNatId(e.target.value.replace(/\D/g, ''))}
                              placeholder="30001010000000"
                              className={`w-full min-h-[52px] pl-4 pr-11 rounded-2xl border text-left font-[family-name:var(--font-mono)] tabular-nums text-sm font-bold outline-none ${
                                isLight
                                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                                  : 'bg-[#1A2235] border-slate-700 text-white focus:border-orange-500'
                              }`}
                            />
                            <Hash className="w-4 h-4 text-orange-500 absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold mb-1.5">
                            رقم الموبايل المسجل (١١ رقماً):
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              dir="ltr"
                              maxLength={11}
                              required
                              value={recoveryPhone}
                              onChange={(e) => setRecoveryPhone(e.target.value.replace(/\D/g, ''))}
                              placeholder="01200000000"
                              className={`w-full min-h-[52px] pl-4 pr-11 rounded-2xl border text-left font-[family-name:var(--font-mono)] tabular-nums text-sm font-bold outline-none ${
                                isLight
                                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                                  : 'bg-[#1A2235] border-slate-700 text-white focus:border-orange-500'
                              }`}
                            />
                            <Phone className="w-4 h-4 text-orange-500 absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setRecoveryChannel('email')}
                            className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                              recoveryChannel === 'email'
                                ? isLight
                                  ? 'bg-orange-100 border-orange-500 text-orange-900'
                                  : 'bg-orange-500/20 border-orange-500 text-orange-300'
                                : 'border-slate-300 opacity-70'
                            }`}
                          >
                            <Mail className="w-3.5 h-3.5" />
                            <span>إرسال الكود للإيميل المسجل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setRecoveryChannel('whatsapp_admin')}
                            className={`min-h-[44px] px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                              recoveryChannel === 'whatsapp_admin'
                                ? isLight
                                  ? 'bg-emerald-100 border-emerald-500 text-emerald-900'
                                  : 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                                : 'border-slate-300 opacity-70'
                            }`}
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>الإيميل غير متاح (طلب واتساب للأدمن)</span>
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={recoveryAttempts >= MAX_RECOVERY_ATTEMPTS}
                        className="w-full min-h-[56px] rounded-full bg-gradient-to-l from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-sm sm:text-base shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                      >
                        <span>إرسال طلب استرجاع الكود الآمن</span>
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                    </form>
                  )}
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div
                      className={`p-1 rounded-full border inline-flex items-center gap-1 ${
                        isLight
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-[#0C1222] border-slate-800'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setStaffSubTab('admin_password');
                          setStatusMessage(null);
                        }}
                        className={`min-h-[40px] px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                          staffSubTab === 'admin_password'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isLight
                            ? 'text-slate-700 hover:text-blue-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <Lock className="w-3.5 h-3.5" />
                        <span>الأدمن (كود + كلمة مرور)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setStaffSubTab('staff_code');
                          setStatusMessage(null);
                        }}
                        className={`min-h-[40px] px-3.5 rounded-full text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                          staffSubTab === 'staff_code'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : isLight
                            ? 'text-slate-700 hover:text-blue-700'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        <span>فريق العمل / مسؤولو الخدمة (بالكود)</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowRegisterView(true);
                        setStatusMessage(null);
                      }}
                      className={`min-h-[40px] px-3.5 rounded-full border text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${
                        isLight
                          ? 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700'
                          : 'border-sky-500/40 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300'
                      }`}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>تسجيل خادم جديد</span>
                    </button>
                  </div>

                  {staffSubTab === 'admin_password' ? (
                    <form onSubmit={handleAdminPasswordLogin} className="space-y-4">
                      <div>
                        <label className="block text-xs sm:text-sm font-extrabold mb-2 text-right">
                          اسم المستخدم الشخصي أو كود الأدمن (للمنظم أو المسؤول):
                        </label>
                        <div className="relative">
                            <input
                              type="text"
                              dir="ltr"
                              value={adminIdentifier}
                              onChange={(e) => setAdminIdentifier(e.target.value)}
                              placeholder="اسم المستخدم الشخصي"
                              className={`w-full min-h-[58px] pl-5 pr-12 rounded-full border-2 text-center font-[family-name:var(--font-mono)] text-sm sm:text-base font-bold outline-none transition-colors ${
                                isLight
                                  ? 'bg-blue-50/40 border-blue-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                                  : 'bg-[#171F32] border-slate-700/80 text-white placeholder:text-slate-400 focus:border-sky-400'
                              }`}
                            />
                            <UserCheck className="w-5 h-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2" />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-extrabold mb-2 text-right">
                            كلمة المرور:
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              dir="ltr"
                              value={adminPassword}
                              onChange={(e) => setAdminPassword(e.target.value)}
                              placeholder="••••••••••"
                              className={`w-full min-h-[58px] px-12 rounded-full border-2 text-center font-[family-name:var(--font-mono)] text-sm sm:text-base font-bold outline-none transition-colors ${
                                isLight
                                  ? 'bg-blue-50/40 border-blue-300 text-slate-900 focus:border-blue-600 focus:bg-white'
                                  : 'bg-[#171F32] border-slate-700/80 text-white placeholder:text-slate-400 focus:border-sky-400'
                              }`}
                            />
                            <Lock className="w-5 h-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2" />
                            <button
                              type="button"
                              onClick={() => setShowPassword((p) => !p)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-500 hover:text-blue-600 absolute left-2 top-1/2 -translate-y-1/2 cursor-pointer"
                              title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                            >
                              {showPassword ? (
                                <EyeOff className="w-5 h-5" />
                              ) : (
                                <Eye className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full min-h-[60px] rounded-full bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.99] cursor-pointer"
                        >
                          <span>دخول المنظمين والإدارة</span>
                          <ArrowLeft className="w-5 h-5" />
                        </button>
                      </form>
                    ) : (
                      <form
                        onSubmit={(e) => handleCodeLogin(e, staffCode, 'staff_code')}
                        className="space-y-4"
                      >
                        <div>
                          <label className="block text-xs sm:text-sm font-extrabold mb-2">
                            كود الدخول السري (فريق العمل / مسؤولو الخدمة / المسجِّلون / الطوارئ):
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              dir="ltr"
                              maxLength={12}
                              value={staffCode}
                              onChange={(e) => setStaffCode(e.target.value.toUpperCase())}
                              placeholder="مثال: K9R3W8"
                              className={`w-full min-h-[58px] px-12 rounded-full border-2 text-center font-[family-name:var(--font-mono)] text-base font-extrabold tracking-widest uppercase outline-none ${
                                isLight
                                  ? 'bg-blue-50/40 border-blue-400 text-slate-900 focus:bg-white'
                                  : 'bg-[#171F32] border-sky-500/50 text-white'
                              }`}
                            />
                          <KeyRound className="w-5 h-5 text-blue-600 absolute right-4 top-1/2 -translate-y-1/2" />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full min-h-[60px] rounded-full bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-extrabold text-base sm:text-lg shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2.5 transition-transform active:scale-[0.99] cursor-pointer"
                      >
                        <span>دخول فريق العمل واللجان</span>
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    </form>
                  )}
                </div>
              )}

              <div className="pt-4 border-t border-slate-500/15 flex items-center justify-center gap-2 text-xs font-bold opacity-75">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>بيانات الجلسة مشفرة بأمان وتخضع للمراجعة الميدانية المعتمدة</span>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* زر عائم صغير لأدوات الاختبار والمحاكاة يفتح عند الحاجة فقط */}
      <div className="fixed bottom-4 left-4 z-40">
        <button
          type="button"
          onClick={() => setSimPanelOpen(true)}
          className="min-h-[48px] px-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white border border-amber-400/50 shadow-xl flex items-center gap-2 text-xs font-extrabold cursor-pointer transition-transform active:scale-95"
          title="فتح أدوات الاختبار والمحاكاة وحسابات التجربة"
        >
          <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          <span>أدوات الاختبار والمحاكاة (م {edition.current_stage})</span>
        </button>
      </div>

      {/* نافذة أدوات الاختبار والمحاكاة عند الضغط على الزر العائم */}
      {simPanelOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6">
          <div
            className={`w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-3xl p-5 sm:p-6 border shadow-2xl space-y-5 ${
              isLight ? 'bg-white border-amber-200 text-slate-900' : 'bg-[#111829] border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-500/20">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-orange-500" />
                <h3 className="text-base font-extrabold">أدوات المحاكاة والاختبار السريع (المرحلة ١ و ٢)</h3>
              </div>
              <button
                type="button"
                onClick={() => setSimPanelOpen(false)}
                className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* ١. حسابات تجريبية بضغطة واحدة */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-orange-600">
                <Sparkles className="w-4 h-4" />
                <span>١. الدخول السريع بحسابات تجريبية (اضغط للتعبئة الفورية):</span>
              </div>
              <div className="space-y-2">
                {DEMO_CREDENTIALS.map((demo) => (
                  <button
                    key={demo.servant_id}
                    type="button"
                    onClick={() => applyDemoCredential(demo)}
                    className={`w-full text-right rounded-2xl p-3 border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isLight
                        ? 'bg-amber-50/50 hover:bg-orange-50 border-amber-200/80 hover:border-orange-400'
                        : 'bg-[#0C1220] hover:bg-[#162038] border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-extrabold truncate">{demo.full_name}</span>
                        <span
                          className={`text-[11px] font-bold ${
                            demo.status === 'approved' ? 'text-emerald-600' : 'text-amber-600'
                          }`}
                        >
                          · {demo.status === 'approved' ? 'معتمد' : 'في انتظار الاعتماد'}
                        </span>
                      </div>
                      <div className="text-xs opacity-75 truncate">
                        {demo.role_summary} · {demo.service_name}
                      </div>
                    </div>
                    <div
                      dir="ltr"
                      className="px-2.5 py-1 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-600 font-[family-name:var(--font-mono)] text-xs font-extrabold shrink-0 tabular-nums"
                    >
                      {demo.secret_code}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ٢. تبديل مراحل الحدث السبع */}
            <div className="space-y-2.5 pt-2 border-t border-slate-500/15">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-blue-600">
                <Layers className="w-4 h-4" />
                <span>٢. تبديل مرحلة الحدث (State Machine 1..7):</span>
              </div>
              <div className="grid grid-cols-7 gap-1.5">
                {EVENT_STAGES.map((st) => {
                  const active = edition.current_stage === st.stage;
                  return (
                    <button
                      key={st.stage}
                      type="button"
                      onClick={() => handleStageChange(st.stage)}
                      className={`min-h-[40px] rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                        active
                          ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                          : isLight
                          ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          : 'bg-[#0C1220] text-slate-300 border-slate-800'
                      }`}
                    >
                      م {st.stage}
                    </button>
                  );
                })}
              </div>
              <div className="text-xs opacity-80">
                <strong>{currentStageMeta.title}:</strong> {currentStageMeta.description}
              </div>
            </div>

            {/* ٣. تبديل حالات الشاشة الخمس */}
            <div className="space-y-2 pt-2 border-t border-slate-500/15">
              <div className="text-xs sm:text-sm font-extrabold">٣. معاينة حالات الشاشة (UI States):</div>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { id: 'normal', label: 'طبيعي (Normal)' },
                    { id: 'loading', label: 'تحميل (Loading)' },
                    { id: 'empty', label: 'فارغ (Empty)' },
                    { id: 'error', label: 'خطأ (Error)' },
                    { id: 'offline', label: 'أوفلاين (Offline)' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => {
                      setUiState(st.id);
                      setSimPanelOpen(false);
                    }}
                    className={`min-h-[38px] px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                      uiState === st.id
                        ? 'bg-blue-600 text-white border-blue-500'
                        : isLight
                        ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        : 'bg-[#0C1220] text-slate-300 border-slate-800'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ٤. فتح نوافذ الفحص التفصيلية */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-500/15">
              <button
                type="button"
                onClick={() => {
                  setSimPanelOpen(false);
                  setInspectorTab('outbox');
                  setInspectorOpen(true);
                }}
                className="min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>الإيميلات ({outbox.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimPanelOpen(false);
                  setInspectorTab('database');
                  setInspectorOpen(true);
                }}
                className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Database className="w-3.5 h-3.5" />
                <span>الداتابيز</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSimPanelOpen(false);
                  setInspectorTab('checklist');
                  setInspectorOpen(true);
                }}
                className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5" />
                <span>الاختبار اليدوي</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* الفوتر العام */}
      <footer
        className={`border-t py-4 px-4 text-center text-xs font-bold opacity-75 ${
          isLight ? 'border-amber-200/80 bg-white/80' : 'border-slate-800/80 bg-[#080C17]'
        }`}
      >
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <span>كنيسة السيدة العذراء مريم بالعصافرة · كرنفال Reflection · السبت ٣٠ يناير ٢٠٢٧</span>
          <span>المرحلة ١ و ٢ (الأساس والدخول)</span>
        </div>
      </footer>

      {/* نافذة الفحص والاختبار اليدوي */}
      <InspectorDrawer
        isOpen={inspectorOpen}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        isLight={isLight}
        edition={edition}
        outbox={outbox}
        servants={servants}
        servantRoles={servantRoles}
        loginCodes={loginCodes}
        recoveryRequests={recoveryRequests}
        auditLogs={auditLogs}
        onClose={() => setInspectorOpen(false)}
        onUseDemoCode={(code, isAdmin) => {
          setShowRegisterView(false);
          setActiveServant(null);
          if (isAdmin) {
            setMainTab('staff');
            setStaffSubTab('admin_password');
            setAdminIdentifier(code);
          } else {
            setMainTab('participants');
            setParticipantSubTab('pin');
            setPinCode(code);
          }
        }}
        onAdminSendWhatsappCode={handleAdminSendWhatsappCode}
      />
    </div>
  );
};
