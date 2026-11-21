'use client';

import React, { useState } from 'react';
import {
  X,
  Mail,
  Database,
  ClipboardCheck,
  Shield,
  CheckSquare,
  Square,
  Send,
  AlertCircle,
  CheckCircle2,
  Copy,
} from 'lucide-react';
import type {
  AuditLogRecord,
  Edition,
  LoginCodeRecord,
  RecoveryRequestRecord,
  Servant,
  ServantRoleRecord,
  SimulatedEmailMessage,
} from '@/lib/carnival-store';

interface InspectorDrawerProps {
  isOpen: boolean;
  activeTab: 'outbox' | 'database' | 'checklist';
  onTabChange: (tab: 'outbox' | 'database' | 'checklist') => void;
  isLight: boolean;
  edition: Edition;
  outbox: SimulatedEmailMessage[];
  servants: Servant[];
  servantRoles: ServantRoleRecord[];
  loginCodes: LoginCodeRecord[];
  recoveryRequests: RecoveryRequestRecord[];
  auditLogs: AuditLogRecord[];
  onClose: () => void;
  onUseDemoCode: (code: string, isAdmin?: boolean) => void;
  onAdminSendWhatsappCode: (servantId: string) => void;
}

const MANUAL_CHECKLIST_ITEMS = [
  {
    id: 'chk-1',
    title: '١. تجربة الدخول بالكود السري للمشارك (مسؤول فريق)',
    desc: 'استخدم الكود A8K2P9 في تبويب «المشاركون» وتأكد من فتح جلسة الخادم أبانوب ميشيل وعرض رمز الهوية QR منفصلاً عن الكود.',
  },
  {
    id: 'chk-2',
    title: '٢. تجربة حساب في انتظار الاعتماد (Pending Servant)',
    desc: 'استخدم الكود PND105 للخادم كيرلس هاني وتأكد أن النظام يمنعه من رؤية أي بيانات ويعرض شاشة «حسابك في انتظار الاعتماد».',
  },
  {
    id: 'chk-3',
    title: '٣. تجربة دخول فريق العمل (تعدد الأدوار) ودخول الأدمن',
    desc: 'انتقل لتبويب «فريق العمل»، جرب كود STF420 (يجمع دور فريق العمل + مسجِّل)، ثم جرب دخول الأدمن (كود ADM999 + كلمة المرور Carnival@2027).',
  },
  {
    id: 'chk-4',
    title: '٤. تجربة تسجيل خادم جديد وتشفير الرقم القومي',
    desc: 'افتح «تسجيل خادم جديد»، أدخل البيانات والرقم القومي (١٤ رقماً) والمهارات، وتأكد من وصول الكود في صندوق الإيميل التجريبي وحفظ آخر ٤ أرقام فقط.',
  },
  {
    id: 'chk-5',
    title: '٥. تجربة الاسترجاع بالرقم القومي (بدون عرض الكود على الشاشة)',
    desc: 'من تبويب «الرقم القومي»، أدخل الرقم القومي 29905150101234 والموبايل 01223456789 وتأكد من عدم ظهور الكود على الشاشة وإرساله للإيميل مع تسجيل الحركة في audit_log.',
  },
  {
    id: 'chk-6',
    title: '٦. تجربة قفل المراحل (State Machine) والحالات (Loading / Empty / Error / Offline)',
    desc: 'من شريط التحكم العلوي، غيّر المرحلة إلى المرحلة ٤ وحاول تسجيل خادم جديد (سيُرفض)، وجرب حالات الأوفلاين والخطأ.',
  },
];

export const InspectorDrawer: React.FC<InspectorDrawerProps> = ({
  isOpen,
  activeTab,
  onTabChange,
  isLight,
  edition,
  outbox,
  servants,
  servantRoles,
  loginCodes,
  recoveryRequests,
  auditLogs,
  onClose,
  onUseDemoCode,
  onAdminSendWhatsappCode,
}) => {
  const [checkedItems, setCheckedItems] = useState<string[]>(['chk-1']);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleCheck = (id: string) => {
    setCheckedItems((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleCopy = (code: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(code);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-6">
      <div
        className={`w-full max-w-4xl max-h-[90vh] rounded-3xl border flex flex-col overflow-hidden shadow-2xl ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0F1628] border-slate-800 text-slate-100'
        }`}
      >
        {/* الهيدر */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-500/20">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-orange-500" />
            <h3 className="text-base sm:text-lg font-extrabold">
              لوحة الفحص والتحقق للمرحلة ١ و ٢ (الأمان، الإيميلات، الداتابيز، والاختبار اليدوي)
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[40px] min-w-[40px] rounded-xl flex items-center justify-center hover:bg-slate-500/15 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* التبويبات */}
        <div
          className={`flex items-center gap-2 px-5 py-3 border-b border-slate-500/20 overflow-x-auto ${
            isLight ? 'bg-slate-50' : 'bg-[#0B101E]'
          }`}
        >
          <button
            type="button"
            onClick={() => onTabChange('outbox')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'outbox'
                ? 'bg-orange-600 text-white'
                : isLight
                ? 'text-slate-600 hover:bg-slate-200/70'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>صندوق الإيميل وبديل الواتساب ({outbox.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('database')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'database'
                ? 'bg-orange-600 text-white'
                : isLight
                ? 'text-slate-600 hover:bg-slate-200/70'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>جداول الداتابيز وسجل المراجعة ({auditLogs.length})</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('checklist')}
            className={`min-h-[42px] px-4 rounded-xl text-xs font-extrabold flex items-center gap-2 whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'checklist'
                ? 'bg-orange-600 text-white'
                : isLight
                ? 'text-slate-600 hover:bg-slate-200/70'
                : 'text-slate-300 hover:bg-slate-800'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>قائمة الاختبار اليدوي ({checkedItems.length}/{MANUAL_CHECKLIST_ITEMS.length})</span>
          </button>
        </div>

        {/* المحتوى */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {activeTab === 'outbox' && (
            <div className="space-y-4">
              <div
                className={`rounded-2xl p-4 border text-xs leading-relaxed ${
                  isLight
                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                    : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
                }`}
              >
                <strong>لماذا يوجد هذا الصندوق؟</strong> طبقاً لقواعد الأمان في الـ Blueprint، النظام لا يعرض كود الدخول السري على شاشة التسجيل أو شاشة الاسترجاع بالرقم القومي أبداً، بل يرسله إلى الإيميل المسجل عبر Google Apps Script (أو يتيح للأدمن إرساله واتساب إذا فشل الإيميل). هنا يمكنك رؤية الرسائل التي وصلت للإيميل لتجربة الكود فوراً.
              </div>

              <div className="space-y-3">
                {outbox.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-2xl p-4 border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#131C31] border-slate-800'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-extrabold text-sm">{msg.servant_name}</span>
                        <span
                          dir="ltr"
                          className="text-xs font-[family-name:var(--font-mono)] opacity-75"
                        >
                          ({msg.to_email})
                        </span>
                        {msg.delivery_status === 'sent' ? (
                          <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>تم الإرسال بالإيميل</span>
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>لم يُرسل (Spam/Limit) · يحتاج تدخل الأدمن واتساب</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs opacity-80">{msg.subject}</p>
                      <div className="text-[11px] opacity-60" dir="ltr">
                        {msg.sent_at}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        dir="ltr"
                        className="px-3.5 py-2 rounded-xl bg-orange-500/15 border border-orange-500/40 text-orange-400 font-[family-name:var(--font-mono)] font-extrabold text-sm tracking-widest tabular-nums"
                      >
                        {msg.secret_code_preview}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopy(msg.secret_code_preview)}
                        className="min-h-[40px] px-3 rounded-xl border border-slate-600/50 hover:bg-slate-500/15 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>{copiedCode === msg.secret_code_preview ? 'تم النسخ' : 'نسخ'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onUseDemoCode(msg.secret_code_preview, false);
                          onClose();
                        }}
                        className="min-h-[40px] px-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>تعبئة ودخول</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* طلبات الاسترجاع بالواتساب للأدمن */}
              {recoveryRequests.length > 0 && (
                <div className="pt-3 space-y-2">
                  <h4 className="text-sm font-extrabold text-amber-400">
                    طلبات استرجاع الكود المسجلة للأدمن ({recoveryRequests.length}):
                  </h4>
                  <div className="space-y-2">
                    {recoveryRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`rounded-xl p-3 border flex items-center justify-between gap-3 text-xs ${
                          isLight ? 'bg-amber-50 border-amber-200' : 'bg-amber-500/10 border-amber-500/30'
                        }`}
                      >
                        <div>
                          <span className="font-bold">{req.servant_name}</span> · آخر ٤ أرقام قومي:{' '}
                          <span dir="ltr" className="font-bold">
                            {req.national_id_last4}
                          </span>{' '}
                          · موبايل:{' '}
                          <span dir="ltr" className="font-bold">
                            {req.phone}
                          </span>{' '}
                          · القناة: <span className="font-bold">{req.channel === 'email' ? 'إيميل' : 'طلب واتساب للأدمن'}</span>
                        </div>
                        {req.servant_id && req.status === 'pending_whatsapp' && (
                          <button
                            type="button"
                            onClick={() => onAdminSendWhatsappCode(req.servant_id!)}
                            className="min-h-[36px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer"
                          >
                            إصدار كود وإرساله واتساب (أدمن)
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-5">
              {/* جدول الدورات واللوجوهات المحفوظة editions */}
              <div>
                <h4 className="text-sm font-extrabold mb-2 text-emerald-500">
                  ٠. جدول الدورة النشطة واللوجوهات المحفوظة (`editions` - محفوظ في السيرفر والـ LocalStorage):
                </h4>
                <div
                  className={`rounded-2xl p-4 border text-xs grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
                  }`}
                >
                  <div className="space-y-1">
                    <div>
                      <span className="opacity-70">اسم الكنيسة (`church_name`): </span>
                      <span className="font-extrabold">{edition.church_name}</span>
                    </div>
                    <div>
                      <span className="opacity-70">اسم الخدمة (`service_title`): </span>
                      <span className="font-extrabold">{edition.service_title}</span>
                    </div>
                    <div>
                      <span className="opacity-70">المرحلة الحالية (`current_stage`): </span>
                      <span className="font-extrabold text-orange-500">المرحلة {edition.current_stage}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 rounded-xl border border-amber-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                        {edition.church_logo_url ? (
                          <img
                            src={edition.church_logo_url}
                            alt="Church Logo"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-[9px] text-slate-400">افتراضي</span>
                        )}
                      </div>
                      <div>
                        <div className="font-extrabold">church_logo_url</div>
                        <div className="text-[10px] text-emerald-500 font-bold">
                          {edition.church_logo_url ? 'محفوظ في الداتابيز ✓' : 'لم يُرفع بعد'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-11 h-11 rounded-xl border border-sky-300 bg-white overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={edition.carnival_logo_url}
                          alt="Carnival Logo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div>
                        <div className="font-extrabold">carnival_logo_url</div>
                        <div className="text-[10px] text-emerald-500 font-bold">
                          محفوظ في الداتابيز ✓
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* جدول الخدام servants */}
              <div>
                <h4 className="text-sm font-extrabold mb-2 text-orange-400">
                  ١. جدول الخدام (`servants`) + التجزئة (`national_id_hash` & `qr_token` منفصل):
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-700/50">
                  <table className="w-full text-right text-xs">
                    <thead className={isLight ? 'bg-slate-100 text-slate-700' : 'bg-[#0B101E] text-slate-300'}>
                      <tr>
                        <th className="p-3">الاسم الثلاثي</th>
                        <th className="p-3">الحالة</th>
                        <th className="p-3">الأدوار (`servant_roles`)</th>
                        <th className="p-3">تجزئة الرقم القومي (`hash` + آخر ٤)</th>
                        <th className="p-3">رمز الهوية (`qr_token`)</th>
                        <th className="p-3">تجزئة الكود (`code_hash`)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700/30">
                      {servants.map((srv) => {
                        const roles = servantRoles
                          .filter((r) => r.servant_id === srv.id)
                          .map((r) => r.role)
                          .join(' + ');
                        const codeRec = loginCodes.find((c) => c.servant_id === srv.id);
                        return (
                          <tr key={srv.id}>
                            <td className="p-3 font-bold">{srv.full_name}</td>
                            <td className="p-3">
                              <span
                                className={
                                  srv.status === 'approved' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'
                                }
                              >
                                {srv.status}
                              </span>
                            </td>
                            <td className="p-3 font-[family-name:var(--font-mono)]">
                              {roles || 'بدون دور بعد (pending)'}
                            </td>
                            <td className="p-3 font-[family-name:var(--font-mono)]" dir="ltr">
                              {srv.national_id_hash.slice(0, 14)}... (last4: {srv.national_id_last4})
                            </td>
                            <td className="p-3 font-[family-name:var(--font-mono)] text-cyan-400" dir="ltr">
                              {srv.qr_token}
                            </td>
                            <td className="p-3 font-[family-name:var(--font-mono)] text-orange-400" dir="ltr">
                              {codeRec ? `${codeRec.code_hash.slice(0, 14)}... (${codeRec.delivery_status})` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* سجل المراجعة غير القابل للتعديل audit_log */}
              <div>
                <h4 className="text-sm font-extrabold mb-2 text-cyan-400">
                  ٢. سجل المراجعة (`audit_log` - Append-Only غير قابل للتعديل أو الحذف):
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className={`rounded-xl p-3 border text-xs flex flex-wrap items-center justify-between gap-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
                      }`}
                    >
                      <div>
                        <span className="font-[family-name:var(--font-mono)] font-bold text-orange-400">
                          {log.action}
                        </span>{' '}
                        · بواسطة: <span className="font-bold">{log.actor_name}</span> · الهدف:{' '}
                        <span dir="ltr" className="font-[family-name:var(--font-mono)]">
                          {log.target}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          dir="ltr"
                          className="font-[family-name:var(--font-mono)] text-[11px] opacity-80"
                        >
                          {JSON.stringify(log.details)}
                        </span>
                        <span
                          dir="ltr"
                          className="font-[family-name:var(--font-mono)] text-[11px] opacity-60 tabular-nums"
                        >
                          {log.created_at}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'checklist' && (
            <div className="space-y-3">
              <p className="text-xs sm:text-sm opacity-85">
                طبقاً لقواعد `RULES.md`، هذه قائمة الاختبار اليدوي للمرحلة ١ و ٢ للتأكد من استيفاء جميع المتطلبات قبل اعتمادك للانتقال إلى المرحلة ٣ (شاشة الأدمن):
              </p>
              {MANUAL_CHECKLIST_ITEMS.map((item) => {
                const isDone = checkedItems.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleCheck(item.id)}
                    className={`w-full text-right rounded-2xl p-4 border flex items-start gap-3 transition-colors cursor-pointer ${
                      isDone
                        ? isLight
                          ? 'bg-emerald-50 border-emerald-300'
                          : 'bg-emerald-500/10 border-emerald-500/30'
                        : isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#131C31] border-slate-800'
                    }`}
                  >
                    {isDone ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="text-sm font-extrabold">{item.title}</div>
                      <p className="text-xs opacity-80 mt-1 leading-relaxed">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
