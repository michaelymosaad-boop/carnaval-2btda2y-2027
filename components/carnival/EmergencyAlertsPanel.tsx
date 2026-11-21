'use client';

import React, { useMemo, useState } from 'react';
import {
  Siren,
  HeartPulse,
  SearchCheck,
  Briefcase,
  PackageSearch,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Send,
  CalendarClock,
} from 'lucide-react';
import {
  createRecordId,
  getIsoNow,
  type CodedTeamItem,
  type EmergencyAlertCategory,
  type EmergencyAlertRecord,
  type EmergencyAlertSeverity,
  type EmergencyAlertStatus,
  type KidParticipant,
  type Servant,
} from '@/lib/carnival-store';

interface EmergencyAlertsPanelProps {
  editionId: string;
  actor: Servant;
  canManageAlerts: boolean;
  canViewParentPhone?: boolean;
  alerts: EmergencyAlertRecord[];
  kids: KidParticipant[];
  codedTeams: CodedTeamItem[];
  onCreateAlert: (alert: EmergencyAlertRecord) => Promise<void>;
  onUpdateAlertStatus: (
    alertId: string,
    patch: {
      status: EmergencyAlertStatus;
      updated_by_servant_id: string;
      resolved_by_name?: string;
      resolution_note?: string;
      updated_at: string;
    }
  ) => Promise<void>;
  isLight: boolean;
}

const CATEGORY_META: Record<
  EmergencyAlertCategory,
  { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  medical: { label: 'طوارئ طبية', icon: HeartPulse },
  lost_child: { label: 'طفل تائه', icon: SearchCheck },
  lost_item: { label: 'مفقودات', icon: PackageSearch },
  logistics: { label: 'دعم وتنظيم', icon: Briefcase },
  schedule_change: { label: 'تغيير بالجدول', icon: CalendarClock },
};

const SEVERITY_META: Record<
  EmergencyAlertSeverity,
  { label: string; badgeClass: string }
> = {
  normal: {
    label: 'عادي',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
  },
  urgent: {
    label: 'عاجل',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/40',
  },
  critical: {
    label: 'حرج جداً',
    badgeClass: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40',
  },
};

const STATUS_META: Record<
  EmergencyAlertStatus,
  { label: string; badgeClass: string }
> = {
  open: {
    label: 'مفتوح',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
  in_progress: {
    label: 'قيد المتابعة',
    badgeClass: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30',
  },
  resolved: {
    label: 'تم الحل',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
};

export const EmergencyAlertsPanel: React.FC<EmergencyAlertsPanelProps> = ({
  editionId,
  actor,
  canManageAlerts,
  canViewParentPhone = false,
  alerts,
  kids,
  codedTeams,
  onCreateAlert,
  onUpdateAlertStatus,
  isLight,
}) => {
  const [category, setCategory] = useState<EmergencyAlertCategory>('lost_child');
  const [severity, setSeverity] = useState<EmergencyAlertSeverity>('urgent');
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [personQuery, setPersonQuery] = useState('');
  const [selectedKid, setSelectedKid] = useState<KidParticipant | null>(null);
  const [selectedTeamName, setSelectedTeamName] = useState('');

  const [statusFilter, setStatusFilter] = useState<'active' | 'all' | 'resolved'>('active');
  const [resolutionDrafts, setResolutionDrafts] = useState<Record<string, string>>({});
  const [busyAlertId, setBusyAlertId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const kidSuggestions = useMemo(() => {
    const q = personQuery.trim().toLowerCase();
    if (!q) return [];
    return kids
      .filter(
        (k) =>
          k.full_name.toLowerCase().includes(q) ||
          k.pin_code.toLowerCase().includes(q)
      )
      .slice(0, 5);
  }, [personQuery, kids]);

  const filteredAlerts = useMemo(() => {
    return [...alerts]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((al) => {
        if (statusFilter === 'active') return al.status !== 'resolved';
        if (statusFilter === 'resolved') return al.status === 'resolved';
        return true;
      });
  }, [alerts, statusFilter]);

  const openCount = useMemo(
    () => alerts.filter((a) => a.status !== 'resolved').length,
    [alerts]
  );

  const handleSubmitAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (title.trim().length < 2 || location.trim().length < 1) {
      setFeedback({
        type: 'error',
        text: 'يرجى كتابة عنوان واضح ومكان البلاغ.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const now = getIsoNow();
      const newAlert: EmergencyAlertRecord = {
        id: createRecordId('alrt'),
        edition_id: editionId,
        category,
        severity,
        title: title.trim(),
        description: description.trim() || title.trim(),
        location: location.trim(),
        related_person_id: selectedKid?.id,
        related_person_name: selectedKid?.full_name || (personQuery.trim() || undefined),
        related_team_name: selectedKid?.team_name || selectedTeamName || undefined,
        status: 'open',
        reported_by_servant_id: actor.id,
        reported_by_name: actor.full_name,
        created_at: now,
        updated_at: now,
      };

      await onCreateAlert(newAlert);
      setTitle('');
      setLocation('');
      setDescription('');
      setPersonQuery('');
      setSelectedKid(null);
      setSelectedTeamName('');
      setFeedback({
        type: 'success',
        text: 'تم إرسال البلاغ الميداني فوراً لوحدة الطوارئ والإدارة.',
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'تعذر إرسال البلاغ — تحقق من الاتصال وحاول مجدداً.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransitionStatus = async (
    alert: EmergencyAlertRecord,
    nextStatus: EmergencyAlertStatus
  ) => {
    setBusyAlertId(alert.id);
    setFeedback(null);
    try {
      await onUpdateAlertStatus(alert.id, {
        status: nextStatus,
        updated_by_servant_id: actor.id,
        resolved_by_name: nextStatus === 'resolved' ? actor.full_name : undefined,
        resolution_note: resolutionDrafts[alert.id]?.trim() || undefined,
        updated_at: getIsoNow(),
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'تعذر تحديث حالة البلاغ — تأكد من صلاحية فريق العمل أو الأدمن.',
      });
    } finally {
      setBusyAlertId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* نموذج إنشاء بلاغ ميداني جديد */}
      <form
        onSubmit={handleSubmitAlert}
        className={`rounded-2xl p-4 border space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0D1323] border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
            <Siren className="w-4 h-4 shrink-0" />
            <span>إرسال بلاغ طوارئ أو مفقودات ميداني</span>
          </span>
          <span className="text-[11px] font-bold opacity-75 tabular-nums">
            بلاغات نشطة: {openCount}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(CATEGORY_META) as EmergencyAlertCategory[]).map((catKey) => {
            const meta = CATEGORY_META[catKey];
            const IconComp = meta.icon;
            return (
              <button
                key={catKey}
                type="button"
                onClick={() => setCategory(catKey)}
                className={`min-h-[44px] px-2.5 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  category === catKey
                    ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200'
                    : 'bg-[#12192B] text-slate-300 border-slate-700'
                }`}
              >
                <IconComp className="w-4 h-4 shrink-0" />
                <span>{meta.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-2 space-y-1">
            <label className="text-xs font-extrabold block">عنوان البلاغ</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: طفل تائه عند ملعب الكرنفال / حقيبة مفقودة"
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold block">درجة الأهمية</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as EmergencyAlertSeverity)}
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-extrabold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            >
              <option value="normal">عادي</option>
              <option value="urgent">عاجل</option>
              <option value="critical">حرج جداً (طوارئ فورية)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-extrabold block">الموقع داخل الكرنفال</label>
            <input
              type="text"
              required
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="مثال: البوابة الرئيسية / الدور الثاني"
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold block">
              ربط بمخدوم (اختياري — بدون حفظ رقم الهاتف عاماً)
            </label>
            <input
              type="text"
              value={personQuery}
              onChange={(e) => {
                setPersonQuery(e.target.value);
                setSelectedKid(null);
              }}
              placeholder="اسم المخدوم أو الكود..."
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>
        </div>

        {kidSuggestions.length > 0 && !selectedKid && (
          <div className="flex flex-wrap gap-1.5">
            {kidSuggestions.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => {
                  setSelectedKid(k);
                  setPersonQuery(k.full_name);
                  setSelectedTeamName(k.team_name);
                }}
                className={`min-h-[36px] px-3 rounded-xl border text-xs font-extrabold cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-800'
                    : 'bg-[#12192B] border-slate-700 text-slate-200'
                }`}
              >
                {k.full_name} ({k.team_name})
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="space-y-1">
            <label className="text-xs font-extrabold block">الفريق المرتبط (اختياري)</label>
            <select
              value={selectedTeamName}
              onChange={(e) => setSelectedTeamName(e.target.value)}
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            >
              <option value="">غير مرتبط بفريق محدد</option>
              {codedTeams.map((tm) => (
                <option key={tm.id} value={tm.name}>
                  {tm.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold block">تفاصيل إضافية</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="وصف سريع للحالة أو المواصفات..."
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>
        </div>

        {feedback && (
          <div
            className={`rounded-2xl p-3 border text-xs font-extrabold flex items-center gap-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[48px] rounded-2xl bg-rose-600 hover:bg-rose-500 text-white text-sm font-black flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
          <span>{isSubmitting ? 'جاري إرسال البلاغ...' : 'إرسال البلاغ فوراً'}</span>
        </button>
      </form>

      {/* قائمة البلاغات الحالية */}
      <div
        className={`rounded-2xl p-4 border space-y-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold">سجل البلاغات الميدانية ({filteredAlerts.length})</span>
          <div className="flex items-center gap-1.5">
            {(['active', 'resolved', 'all'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setStatusFilter(tab)}
                className={`min-h-[36px] px-3 rounded-xl border text-xs font-extrabold cursor-pointer whitespace-nowrap ${
                  statusFilter === tab
                    ? 'bg-orange-600 text-white border-orange-500'
                    : isLight
                    ? 'bg-white text-slate-700 border-slate-200'
                    : 'bg-[#12192B] text-slate-300 border-slate-700'
                }`}
              >
                {tab === 'active' ? 'النشطة' : tab === 'resolved' ? 'المغلقة' : 'الكل'}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredAlerts.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold opacity-65">
              لا توجد بلاغات في هذه القائمة — الكرنفال يسير بسلام!
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const catMeta = CATEGORY_META[alert.category];
              const sevMeta = SEVERITY_META[alert.severity];
              const stMeta = STATUS_META[alert.status];
              const matchedKid = alert.related_person_id
                ? kids.find((k) => k.id === alert.related_person_id)
                : undefined;
              const emergencyPhone =
                canViewParentPhone && matchedKid?.parent_phone ? matchedKid.parent_phone : null;

              return (
                <div
                  key={alert.id}
                  className={`p-3.5 rounded-2xl border space-y-2.5 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#12192B] border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold whitespace-nowrap ${sevMeta.badgeClass}`}
                        >
                          {sevMeta.label}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold whitespace-nowrap ${stMeta.badgeClass}`}
                        >
                          {stMeta.label}
                        </span>
                        <span className="text-[11px] font-bold opacity-75">
                          {catMeta.label}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-black">{alert.title}</h4>
                      <p className="text-xs opacity-80 leading-relaxed">{alert.description}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] opacity-80">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-orange-500" />
                      <span>{alert.location}</span>
                    </span>
                    {alert.related_person_name && (
                      <span>المرتبط: {alert.related_person_name}</span>
                    )}
                    {alert.related_team_name && <span>{alert.related_team_name}</span>}
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>أبلغ عنه: {alert.reported_by_name}</span>
                    </span>
                  </div>

                  {emergencyPhone && (
                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between gap-2 text-xs">
                      <span className="font-extrabold text-rose-700 dark:text-rose-300">
                        رقم ولي الأمر (للطوارئ الموثقة فقط):
                      </span>
                      <a
                        href={`tel:${emergencyPhone}`}
                        dir="ltr"
                        className="min-h-[36px] px-3 rounded-lg bg-rose-600 text-white font-mono font-extrabold flex items-center gap-1.5"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>{emergencyPhone}</span>
                      </a>
                    </div>
                  )}

                  {alert.status === 'resolved' && alert.resolution_note && (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                      ملاحظة الإغلاق ({alert.resolved_by_name || 'الطوارئ'}): {alert.resolution_note}
                    </div>
                  )}

                  {canManageAlerts && alert.status !== 'resolved' && (
                    <div className="pt-2 border-t border-slate-500/15 space-y-2">
                      <input
                        type="text"
                        value={resolutionDrafts[alert.id] || ''}
                        onChange={(e) =>
                          setResolutionDrafts((prev) => ({
                            ...prev,
                            [alert.id]: e.target.value,
                          }))
                        }
                        placeholder="ملاحظة الإجراء أو التسليم قبل الإغلاق (اختياري)..."
                        className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 text-slate-900'
                            : 'bg-[#090D18] border-slate-700 text-white'
                        }`}
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        {alert.status === 'open' && (
                          <button
                            type="button"
                            disabled={busyAlertId === alert.id}
                            onClick={() => handleTransitionStatus(alert, 'in_progress')}
                            className="min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold cursor-pointer whitespace-nowrap"
                          >
                            بدء المتابعة الميدانية
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busyAlertId === alert.id}
                          onClick={() => handleTransitionStatus(alert, 'resolved')}
                          className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>إغلاق وحل البلاغ</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
