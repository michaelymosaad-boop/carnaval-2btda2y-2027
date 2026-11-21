'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  QrCode,
  KeyRound,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  Lock,
  Sparkles,
  Layers,
  ShieldAlert,
} from 'lucide-react';
import {
  ROLE_METADATA,
  EVENT_STAGES,
  type Edition,
  type Servant,
  type ServantRole,
  type ServiceItem,
} from '@/lib/carnival-store';

interface SessionDashboardPreviewProps {
  edition: Edition;
  servant: Servant;
  roles: ServantRole[];
  serviceName: string;
  allServices: ServiceItem[];
  isLight: boolean;
  onLogout: () => void;
  onLogRlsTest: (action: string, target: string, allowed: boolean, reason: string) => void;
}

export const SessionDashboardPreview: React.FC<SessionDashboardPreviewProps> = ({
  edition,
  servant,
  roles,
  serviceName,
  allServices,
  isLight,
  onLogout,
  onLogRlsTest,
}) => {
  const [activeRole, setActiveRole] = useState<ServantRole>(roles[0] || 'team_lead');
  const [rlsTestFeedback, setRlsTestFeedback] = useState<{
    allowed: boolean;
    title: string;
    detail: string;
  } | null>(null);

  const stageInfo = EVENT_STAGES.find((s) => s.stage === edition.current_stage) || EVENT_STAGES[1];

  // إذا كان حساب الخادم لا يزال في انتظار الاعتماد (Pending)
  if (servant.status === 'pending') {
    return (
      <div
        className={`rounded-3xl p-6 sm:p-8 border transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-900/5'
            : 'bg-[#12192B]/95 border-slate-800 text-slate-100 shadow-2xl shadow-black/50'
        }`}
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Clock className="w-9 h-9" />
          </div>
          <h2 className="mt-4 text-xl sm:text-2xl font-extrabold">
            حسابك في انتظار الاعتماد (Pending Approval)
          </h2>
          <p className={`mt-2 text-sm max-w-lg leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
            أهلاً بك يا <span className="font-bold text-orange-400">{servant.full_name}</span>. تم التحقق من كود الدخول السري الخاص بك بنجاح، ولكن لا يمكنك الوصول لشاشات الخدمة أو بيانات الأطفال إلا بعد اعتماد حسابك من الأدمن أو مسؤول الخدمة (المرحلة ٣).
          </p>
        </div>

        <div
          className={`mt-6 rounded-2xl p-4 border space-y-2.5 text-xs sm:text-sm ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
          }`}
        >
          <div className="flex justify-between">
            <span className="opacity-70">الخدمة المسجل بها:</span>
            <span className="font-bold">{serviceName}</span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">آخر ٤ أرقام من الرقم القومي:</span>
            <span dir="ltr" className="font-[family-name:var(--font-mono)] font-bold tabular-nums">
              ****{servant.national_id_last4}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="opacity-70">رمز الهوية على البادج (QR):</span>
            <span dir="ltr" className="font-[family-name:var(--font-mono)] font-bold text-cyan-400 tabular-nums">
              {servant.qr_token}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-6 w-full min-h-[52px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج والعودة</span>
        </button>
      </div>
    );
  }

  const currentRoleMeta = ROLE_METADATA[activeRole];

  const runRlsSimulation = (testType: 'other_service' | 'direct_points_update' | 'registrar_stage_check') => {
    if (testType === 'other_service') {
      const otherService = allServices.find((s) => s.id !== servant.service_id);
      if (activeRole === 'admin') {
        const msg = `مسموح للأدمن فقط: الأدمن يملك صلاحية استعراض جميع الخدمات بما فيها (${otherService?.name}).`;
        setRlsTestFeedback({ allowed: true, title: 'نجح الوصول (صلاحية أدمن)', detail: msg });
        onLogRlsTest('RLS_SELECT_OTHER_SERVICE', otherService?.name || 'other', true, msg);
      } else {
        const msg = `مرفوض بواسطة Row Level Security: دور (${currentRoleMeta.label}) مقيّد بخدمته فقط (${serviceName}) ولا يمكنه قراءة بيانات (${otherService?.name}).`;
        setRlsTestFeedback({ allowed: false, title: 'تم حظر الوصول (RLS Policy Blocked)', detail: msg });
        onLogRlsTest('RLS_SELECT_OTHER_SERVICE_DENIED', otherService?.name || 'other', false, msg);
      }
    } else if (testType === 'direct_points_update') {
      const msg =
        'مرفوض للجميع (حتى الأدمن!): جدول points_ledger محمي بـ Trigger (Append-Only) يمنع UPDATE/DELETE. أي تعديل يجب أن يُضاف كقيد جديد بمصدر source = correction مع سبب مسجل.';
      setRlsTestFeedback({
        allowed: false,
        title: 'حظر تعديل سجل النقاط (Append-Only Ledger)',
        detail: msg,
      });
      onLogRlsTest('RLS_UPDATE_POINTS_LEDGER_BLOCKED', 'points_ledger', false, msg);
    } else if (testType === 'registrar_stage_check') {
      const isStage4 = edition.current_stage === 4;
      const hasRegistrar = roles.includes('registrar') || roles.includes('admin');
      if (isStage4 && hasRegistrar) {
        const msg = `مسموح: الحدث حالياً في المرحلة ٤ (تسجيل المخدومين) والخادم يملك صلاحية الإدخال لخدمة (${serviceName}).`;
        setRlsTestFeedback({ allowed: true, title: 'مسموح بإدخال المخدومين', detail: msg });
        onLogRlsTest('STAGE_MACHINE_REGISTER_KID_ALLOWED', `stage_${edition.current_stage}`, true, msg);
      } else {
        const msg = !isStage4
          ? `مرفوض بواسطة State Machine: الحدث حالياً في المرحلة (${edition.current_stage} - ${stageInfo.short_title}). إدخال المخدومين يُفتح فقط في المرحلة ٤.`
          : `مرفوض بواسطة RLS: دورك الحالي (${currentRoleMeta.label}) غير مصرح له بإدخال مخدومين جدد.`;
        setRlsTestFeedback({ allowed: false, title: 'مرفوض (قيد المرحلة أو الدور)', detail: msg });
        onLogRlsTest('STAGE_MACHINE_REGISTER_KID_BLOCKED', `stage_${edition.current_stage}`, false, msg);
      }
    }
  };

  return (
    <div
      className={`rounded-3xl p-5 sm:p-7 border space-y-6 transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-900/5'
          : 'bg-[#12192B]/95 border-slate-800/90 text-slate-100 shadow-2xl shadow-black/50'
      }`}
    >
      {/* الهيدر ومعلومات الجلسة المعتمدة */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-500/20">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold">{servant.full_name}</h2>
              <span className="text-xs font-bold text-emerald-400">· معتمد</span>
            </div>
            <p className={`text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {serviceName} · الرقم القومي: <span dir="ltr">****{servant.national_id_last4}</span>
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[44px] px-4 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>

      {/* الفصل الأمني بين كود الدخول السري ورمز الهوية QR على البادج */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div
          className={`rounded-2xl p-4 border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400">
            <QrCode className="w-4 h-4" />
            <span>رمز الهوية العام على البادج (QR Token)</span>
          </div>
          <div
            dir="ltr"
            className="mt-2 font-[family-name:var(--font-mono)] text-sm font-extrabold tracking-wider tabular-nums"
          >
            {servant.qr_token}
          </div>
          <p className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            يُمسح لتسجيل حضور الخادم وإضافة نقاطه لفريقه. لا يصلح أبداً لتسجيل الدخول لو صوّره أي شخص.
          </p>
        </div>

        <div
          className={`rounded-2xl p-4 border ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400">
            <KeyRound className="w-4 h-4" />
            <span>حماية كود الدخول السري (Hashed Login Code)</span>
          </div>
          <div
            dir="ltr"
            className="mt-2 font-[family-name:var(--font-mono)] text-xs font-bold text-slate-400 truncate"
          >
            {servant.national_id_hash.slice(0, 24)}...
          </div>
          <p className={`mt-1 text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            الكود السري والرقم القومي مخزنان بتجزئة SHA-256 غير قابلة للعكس.
          </p>
        </div>
      </div>

      {/* تعدد الأدوار للخادم الواحد (جدول servant_roles) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <Layers className="w-4 h-4 text-orange-400" />
            <span>الأدوار المسندة للخادم ({roles.length} أدوار في جدول servant_roles):</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {roles.map((roleKey) => {
            const meta = ROLE_METADATA[roleKey];
            const isSelected = activeRole === roleKey;
            return (
              <button
                key={roleKey}
                type="button"
                onClick={() => setActiveRole(roleKey)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                    : isLight
                    ? 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
                    : 'bg-[#0D1323] text-slate-300 border-slate-700 hover:border-slate-500'
                }`}
              >
                {meta.label}
              </button>
            );
          })}
        </div>

        {/* تفاصيل صلاحيات الدور النشط */}
        <div
          className={`rounded-2xl p-4 border space-y-3 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0D1323] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-extrabold text-orange-400">
              صلاحيات الدور النشط: {currentRoleMeta.label}
            </span>
            <span className="text-xs opacity-70">وسيلة الدخول: {currentRoleMeta.login_type}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>مسموح له (RLS Allowed):</span>
              </div>
              <ul className="space-y-1 pr-4 list-disc opacity-90">
                {currentRoleMeta.can_do.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="space-y-1.5">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <XCircle className="w-3.5 h-3.5" />
                <span>ممنوع عنه (RLS Blocked):</span>
              </div>
              <ul className="space-y-1 pr-4 list-disc opacity-90">
                {currentRoleMeta.cannot_do.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* مختبر الصلاحيات وآلة الحالة (RLS & State Machine Interactive Verification) */}
      <div
        className={`rounded-2xl p-4 border space-y-3 ${
          isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-[#0B101E] border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>اختبار قواعد الحماية (RLS) ومراحل الحدث (المرحلة الحالية: {stageInfo.title})</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => runRlsSimulation('other_service')}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                : 'bg-[#141D33] border-slate-700 hover:border-slate-500 text-slate-200'
            }`}
          >
            محاولة قراءة خدمة أخرى
          </button>

          <button
            type="button"
            onClick={() => runRlsSimulation('direct_points_update')}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                : 'bg-[#141D33] border-slate-700 hover:border-slate-500 text-slate-200'
            }`}
          >
            محاولة تعديل قيد في سجل النقاط
          </button>

          <button
            type="button"
            onClick={() => runRlsSimulation('registrar_stage_check')}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
              isLight
                ? 'bg-white border-slate-300 hover:bg-slate-100 text-slate-800'
                : 'bg-[#141D33] border-slate-700 hover:border-slate-500 text-slate-200'
            }`}
          >
            محاولة إدخال طفل في المرحلة ({edition.current_stage})
          </button>
        </div>

        {rlsTestFeedback && (
          <div
            className={`rounded-xl p-3.5 border text-xs space-y-1 ${
              rlsTestFeedback.allowed
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="font-extrabold flex items-center gap-1.5">
              {rlsTestFeedback.allowed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{rlsTestFeedback.title}</span>
            </div>
            <p className="leading-relaxed opacity-95">{rlsTestFeedback.detail}</p>
          </div>
        )}
      </div>

      {/* المهارات المسجلة للخادم */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-xs opacity-80">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-orange-400" />
          <span>المهارات المسجلة: {servant.health_and_skills.skills.join(' · ') || 'غير محدد'}</span>
        </div>
        <span>ملاحظات صحية: {servant.health_and_skills.health_notes}</span>
      </div>
    </div>
  );
};
