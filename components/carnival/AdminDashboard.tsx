'use client';

import React, { useMemo, useRef, useState } from 'react';
import {
  Settings2,
  Radio,
  ShieldCheck,
  LogOut,
  Upload,
  Trash2,
  RotateCcw,
  Plus,
  Church,
  Sparkles,
  CheckCircle2,
  History,
  Layers,
  Eye,
  MonitorPlay,
  Calendar,
  ShieldAlert,
  Lock,
  CalendarClock,
  UserCheck,
  Users,
  Send,
  Copy,
  Check,
  Award,
  X,
  ChevronLeft,
  Save,
  BookOpen,
  Loader2,
  KeyRound,
  Flame,
  FileSpreadsheet,
  Search,
  Database,
  AlertTriangle,
  Download,
  Printer,
  BarChart3,
} from 'lucide-react';
import {
  INITIAL_AXES,
  INITIAL_ACTIVITY_ROUNDS,
  INITIAL_ATTENDANCE_POLICY,
  INITIAL_CODED_GRADES,
  INITIAL_CODED_TEAMS,
  EVENT_STAGES,
  ROLE_METADATA,
  compressImageFileToDataUrl,
  formatArabicDateLabel,
  createRecordId,
  getIsoNow,
  type Edition,
  type AxisItem,
  type CarnivalInfoHistoryEntry,
  type Servant,
  type ServantRole,
  type ServantRoleRecord,
  type ServantStatus,
  type ServiceItem,
  type EventStageNumber,
  type CarnivalActivityRound,
  type AttendanceAndPointsPolicy,
  type KidParticipant,
  type CodedGradeItem,
  type CodedTeamItem,
  type GateCheckinRecord,
  type PointsLedgerEntry,
  type EmergencyAlertRecord,
  type EmergencyAlertStatus,
  type AuditLogRecord,
} from '@/lib/carnival-store';
import {
  DEMO_AUDIT_LOG_IDS,
  DEMO_KID_IDS,
  DEMO_SERVANT_IDS,
} from '@/lib/firebase-service';
import {
  exportAuditLogsWorkbook,
  exportCarnivalMasterWorkbook,
  exportGateAttendanceWorkbook,
  exportScoreboardWorkbook,
  exportTeamsAndKidsWorkbook,
} from '@/lib/excel-export';
import { type HomepageAdminPayload } from './CarnivalEmblem';
import { CarnivalLiveDisplayView } from './CarnivalLiveDisplayView';
import { KidsRegistrationManager } from './KidsRegistrationManager';
import { CodingMasterDataManager } from './CodingMasterDataManager';
import { CarnivalOperationsHub } from './CarnivalOperationsHub';
import { RoleQuickDashboard } from './RoleQuickDashboard';
import { LiveAlertsNotificationCenter } from './LiveAlertsNotificationCenter';
import { BulkBadgesPrintManager } from './BulkBadgesPrintManager';
import { AttendanceAnalyticsPanel } from './AttendanceAnalyticsPanel';

export interface AdminDashboardProps {
  edition: Edition;
  axes: AxisItem[];
  history: CarnivalInfoHistoryEntry[];
  servant: Servant;
  roles: ServantRole[];
  serviceName: string;
  allServices: ServiceItem[];
  allServants?: Servant[];
  allServantRoles?: ServantRoleRecord[];
  activityRounds?: CarnivalActivityRound[];
  attendancePolicy?: AttendanceAndPointsPolicy;
  kids?: KidParticipant[];
  codedGrades?: CodedGradeItem[];
  codedTeams?: CodedTeamItem[];
  isLight: boolean;
  onOpenSettingsModal?: () => void;
  onSaveSettings: (payload: HomepageAdminPayload) => Promise<void>;
  onLogoUpload: (
    target: 'church' | 'service' | 'carnival',
    dataUrl: string | null
  ) => Promise<void>;
  onStageChange: (stage: EventStageNumber) => void;
  onUpdateServantStatus?: (servantId: string, status: ServantStatus) => void;
  onDeleteServant?: (servantId: string) => void;
  onBulkApproveServants?: () => void;
  onToggleServantRole?: (servantId: string, role: ServantRole) => void;
  onToggleServantKidsCodesPermission?: (servantId: string) => void;
  onToggleServantCodingPermission?: (servantId: string) => void;
  onSaveCodedGrades?: (grades: CodedGradeItem[]) => void;
  onSaveCodedTeams?: (teams: CodedTeamItem[]) => void;
  onSaveActivityRounds?: (rounds: CarnivalActivityRound[]) => void;
  onSaveAttendancePolicy?: (policy: AttendanceAndPointsPolicy) => void;
  onAddKids?: (newKids: KidParticipant[]) => void;
  onDeleteKid?: (kidId: string) => void;
  onLogout: () => void;
  onLogRlsTest: (action: string, target: string, allowed: boolean, reason: string) => void;
  isFirebaseAdmin?: boolean;
  firebaseAdminEmail?: string | null;
  isAdminGoogleSigningIn?: boolean;
  adminGoogleAuthError?: string | null;
  onSignInAdminGoogle?: () => void;
  onSignOutAdminGoogle?: () => void;
  gateCheckins?: GateCheckinRecord[];
  pointsLedger?: PointsLedgerEntry[];
  emergencyAlerts?: EmergencyAlertRecord[];
  offlineQueueCount?: number;
  onSyncOfflineQueue?: () => Promise<void>;
  onRecordGateCheckin?: (
    checkin: GateCheckinRecord,
    ledgerEntries: PointsLedgerEntry[]
  ) => Promise<{ queuedOffline: boolean }>;
  onAddPointsEntry?: (entry: PointsLedgerEntry) => Promise<void>;
  onReassignKidTeam?: (kidId: string, newTeamName: string) => Promise<void>;
  onCreateAlert?: (alert: EmergencyAlertRecord) => Promise<void>;
  onUpdateAlertStatus?: (
    alertId: string,
    patch: {
      status: EmergencyAlertStatus;
      updated_by_servant_id: string;
      resolved_by_name?: string;
      resolution_note?: string;
      updated_at: string;
    }
  ) => Promise<void>;
  auditLogs?: AuditLogRecord[];
  demoDataCleared?: boolean;
  demoCleanedAt?: string | null;
  onCleanupDemoData?: (options: {
    includeOperationalTestRecords: boolean;
    zeroOutPointsLedger: boolean;
  }) => Promise<{ deletedCount: number; zeroedTeamsCount: number }>;
}

const ASSIGNABLE_ROLES: ServantRole[] = [
  'registrar',
  'team_lead',
  'staff',
  'service_lead',
  'emergency',
];

type SettingsOverlayCardId =
  | 'identity'
  | 'rounds_policy'
  | 'servants'
  | 'coding'
  | 'kids'
  | 'reports_audit'
  | 'bulk_badges'
  | 'attendance_analytics'
  | null;

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  edition,
  axes,
  history,
  servant,
  roles,
  serviceName,
  allServices,
  allServants = [],
  allServantRoles = [],
  activityRounds = INITIAL_ACTIVITY_ROUNDS,
  attendancePolicy = INITIAL_ATTENDANCE_POLICY,
  kids = [],
  codedGrades = INITIAL_CODED_GRADES,
  codedTeams = INITIAL_CODED_TEAMS,
  isLight,
  onSaveSettings,
  onLogoUpload,
  onStageChange,
  onDeleteServant,
  onToggleServantRole,
  onToggleServantKidsCodesPermission,
  onToggleServantCodingPermission,
  onSaveCodedGrades,
  onSaveCodedTeams,
  onSaveActivityRounds,
  onSaveAttendancePolicy,
  onAddKids,
  onDeleteKid,
  onLogout,
  onLogRlsTest,
  isFirebaseAdmin = false,
  firebaseAdminEmail = null,
  isAdminGoogleSigningIn = false,
  adminGoogleAuthError = null,
  onSignInAdminGoogle,
  onSignOutAdminGoogle,
  gateCheckins = [],
  pointsLedger = [],
  emergencyAlerts = [],
  offlineQueueCount = 0,
  onSyncOfflineQueue,
  onRecordGateCheckin,
  onAddPointsEntry,
  onReassignKidTeam,
  onCreateAlert,
  onUpdateAlertStatus,
  auditLogs = [],
  demoDataCleared = false,
  demoCleanedAt = null,
  onCleanupDemoData,
}) => {
  const [activeView, setActiveView] = useState<'settings' | 'ops' | 'live'>('settings');
  // نظام الكروت: كل كارت يفتح صفحة منبثقة فوق الصفحة (Overlay Modal) تُغلق بالحفظ أو زر X
  const [activeOverlayCard, setActiveOverlayCard] = useState<SettingsOverlayCardId>(null);
  const [livePreviewSubMode, setLivePreviewSubMode] = useState<'kiosk' | 'user_screen'>('kiosk');

  // ١. حالة الهوية والشعارات والمراحل (مدمجة بالكامل مع لوحة الأدمن)
  const [draftChurchName, setDraftChurchName] = useState(edition.church_name);
  const [draftServiceTitle, setDraftServiceTitle] = useState(edition.service_title);
  const [draftCarnivalName, setDraftCarnivalName] = useState(edition.name);
  const [draftCarnivalDate, setDraftCarnivalDate] = useState(edition.starts_on);
  const [draftMotto, setDraftMotto] = useState(
    edition.motto || 'المسيح في قلبي، يظهر في حياتي'
  );
  const [draftFooterText, setDraftFooterText] = useState(
    edition.footer_text || `${edition.church_name} · ${edition.name}`
  );
  const [draftChurchLogo, setDraftChurchLogo] = useState<string | null>(edition.church_logo_url);
  const [draftServiceLogo, setDraftServiceLogo] = useState<string | null>(
    edition.service_logo_url || null
  );
  const [draftCarnivalLogo, setDraftCarnivalLogo] = useState<string | null>(
    edition.carnival_logo_url
  );
  const [draftAxes, setDraftAxes] = useState<AxisItem[]>(axes.length > 0 ? axes : INITIAL_AXES);
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // ٢. حالة الفعاليات والجولات وسياسة الحضور المبكر
  const [localRounds, setLocalRounds] = useState<CarnivalActivityRound[]>(activityRounds);
  const [localPolicy, setLocalPolicy] = useState<AttendanceAndPointsPolicy>(attendancePolicy);
  const [notifyTeamsOnScheduleChange, setNotifyTeamsOnScheduleChange] = useState(true);

  const [prevActivityRounds, setPrevActivityRounds] = useState(activityRounds);
  if (prevActivityRounds !== activityRounds) {
    setPrevActivityRounds(activityRounds);
    setLocalRounds(activityRounds);
  }

  const [prevAttendancePolicy, setPrevAttendancePolicy] = useState(attendancePolicy);
  if (prevAttendancePolicy !== attendancePolicy) {
    setPrevAttendancePolicy(attendancePolicy);
    setLocalPolicy(attendancePolicy);
  }

  const [prevEdition, setPrevEdition] = useState(edition);
  if (prevEdition !== edition) {
    setPrevEdition(edition);
    setDraftChurchName(edition.church_name);
    setDraftServiceTitle(edition.service_title);
    setDraftCarnivalName(edition.name);
    setDraftCarnivalDate(edition.starts_on);
    setDraftMotto(edition.motto || 'المسيح في قلبي، يظهر في حياتي');
    setDraftFooterText(edition.footer_text || `${edition.church_name} · ${edition.name}`);
    setDraftChurchLogo(edition.church_logo_url);
    setDraftServiceLogo(edition.service_logo_url || null);
    setDraftCarnivalLogo(edition.carnival_logo_url);
  }

  const [prevAxes, setPrevAxes] = useState(axes);
  if (prevAxes !== axes) {
    setPrevAxes(axes);
    if (axes.length > 0) {
      setDraftAxes(axes);
    }
  }
  const [newRoundTitle, setNewRoundTitle] = useState('');
  const [newRoundAxis, setNewRoundAxis] = useState(axes[0]?.name || 'ترفيهي');
  const [newRoundLocation, setNewRoundLocation] = useState('');
  const [newRoundStart, setNewRoundStart] = useState('12:15');
  const [newRoundEnd, setNewRoundEnd] = useState('13:00');
  const [newRoundDuration, setNewRoundDuration] = useState(45);
  const [newRoundPoints, setNewRoundPoints] = useState(80);

  // ٣. حالة إدارة الخدام وحذف المستخدمين
  const [servantFilterService, setServantFilterService] = useState<string>('all');
  const [copiedServantId, setCopiedServantId] = useState<string | null>(null);
  const [confirmDeleteServantId, setConfirmDeleteServantId] = useState<string | null>(null);

  // ٦. حالة تصدير Excel وتنظيف البيانات التجريبية وسجل المراقبة
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [includeOperationalReset, setIncludeOperationalReset] = useState(false);
  const [zeroOutPointsReset, setZeroOutPointsReset] = useState(false);
  const [confirmCleanupAck, setConfirmCleanupAck] = useState(false);
  const [isCleaningDemo, setIsCleaningDemo] = useState(false);
  const [cleanupResult, setCleanupResult] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [rlsFeedback, setRlsFeedback] = useState<{
    allowed: boolean;
    title: string;
    detail: string;
  } | null>(null);

  const churchFileRef = useRef<HTMLInputElement | null>(null);
  const serviceFileRef = useRef<HTMLInputElement | null>(null);
  const carnivalFileRef = useRef<HTMLInputElement | null>(null);

  const stageInfo =
    EVENT_STAGES.find((s) => s.stage === edition.current_stage) || EVENT_STAGES[1];

  const filteredServants = useMemo(() => {
    return allServants.filter((srv) => {
      if (servantFilterService !== 'all' && srv.service_id !== servantFilterService) return false;
      return true;
    });
  }, [allServants, servantFilterService]);

  const handleLogoFileChange = async (
    target: 'church' | 'service' | 'carnival',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImageFileToDataUrl(file, 420);
      if (target === 'church') {
        setDraftChurchLogo(compressed);
      } else if (target === 'service') {
        setDraftServiceLogo(compressed);
      } else {
        setDraftCarnivalLogo(compressed);
      }
      await onLogoUpload(target, compressed);
      setSaveFeedback(
        target === 'church'
          ? 'تم رفع وحفظ اللوجو الأيمن (الكنيسة) بنجاح!'
          : target === 'service'
          ? 'تم رفع وحفظ شعار الخدمة بنجاح!'
          : 'تم رفع وحفظ اللوجو الأيسر (الكرنفال) بنجاح!'
      );
    } finally {
      e.target.value = '';
    }
  };

  const handleAxisChange = (index: number, field: 'name' | 'color', value: string) => {
    setDraftAxes((prev) =>
      prev.map((ax, i) => (i === index ? { ...ax, [field]: value } : ax))
    );
  };

  const handleAddAxis = () => {
    const newId = createRecordId('ax');
    setDraftAxes((prev) => [
      ...prev,
      {
        id: newId,
        edition_id: edition.id,
        name: `جانب ${prev.length + 1}`,
        color: '#F59E0B',
        text_class: 'text-amber-500',
        dot_class: 'bg-amber-500',
        sort_order: prev.length + 1,
      },
    ]);
  };

  const handleRemoveAxis = (index: number) => {
    if (draftAxes.length <= 1) return;
    setDraftAxes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveIdentitySettings = async (closeAfterSave = false) => {
    const cleanedAxes = draftAxes
      .map((ax, idx) => ({ ...ax, name: ax.name.trim(), sort_order: idx + 1 }))
      .filter((ax) => ax.name.length > 0);

    setIsSaving(true);
    setSaveFeedback(null);
    await onSaveSettings({
      church_name: draftChurchName.trim() || edition.church_name,
      service_title: draftServiceTitle.trim() || edition.service_title,
      carnival_name: draftCarnivalName.trim() || edition.name,
      carnival_date: draftCarnivalDate,
      motto: draftMotto.trim() || 'المسيح في قلبي، يظهر في حياتي',
      footer_text:
        draftFooterText.trim() ||
        `${draftChurchName.trim() || edition.church_name} · ${
          draftCarnivalName.trim() || edition.name
        }`,
      church_logo_url: draftChurchLogo,
      service_logo_url: draftServiceLogo,
      carnival_logo_url: draftCarnivalLogo,
      axes: cleanedAxes.length > 0 ? cleanedAxes : INITIAL_AXES,
      changed_by: servant.full_name,
    });
    setIsSaving(false);
    setSaveFeedback('تم حفظ إعدادات الهوية والشعارات والمراحل بنجاح!');
    if (closeAfterSave) {
      setActiveOverlayCard(null);
    }
  };

  const broadcastScheduleChangeNotice = (title: string, description: string) => {
    if (!notifyTeamsOnScheduleChange || !onCreateAlert) return;
    const now = getIsoNow();
    onCreateAlert({
      id: createRecordId('alrt'),
      edition_id: edition.id,
      category: 'schedule_change',
      severity: 'urgent',
      title,
      description,
      location: 'جميع الفرق والمحطات',
      status: 'open',
      reported_by_servant_id: servant.id,
      reported_by_name: servant.full_name,
      created_at: now,
      updated_at: now,
    }).catch(() => undefined);
  };

  const handleAddActivityRound = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoundTitle.trim()) return;
    const nextRound: CarnivalActivityRound = {
      id: createRecordId('act'),
      edition_id: edition.id,
      title: newRoundTitle.trim(),
      axis_name: newRoundAxis,
      location: newRoundLocation.trim() || 'الساحة الرئيسية',
      round_number: localRounds.length + 1,
      start_time: newRoundStart,
      end_time: newRoundEnd,
      duration_minutes: Number(newRoundDuration) || 45,
      max_points: Number(newRoundPoints) || 50,
      requires_gate_checkin: true,
    };
    const updated = [...localRounds, nextRound];
    setLocalRounds(updated);
    if (onSaveActivityRounds) onSaveActivityRounds(updated);
    broadcastScheduleChangeNotice(
      `إضافة فعالية جديدة: ${nextRound.title}`,
      `الموعد: ${nextRound.start_time} - ${nextRound.end_time} · المكان: ${nextRound.location}`
    );
    setNewRoundTitle('');
    setNewRoundLocation('');
    setSaveFeedback(`تمت إضافة الفعالية (${nextRound.title}) إلى جدول جولات الكرنفال بنجاح.`);
  };

  const handleDeleteActivityRound = (roundId: string) => {
    const removed = localRounds.find((r) => r.id === roundId);
    const updated = localRounds
      .filter((r) => r.id !== roundId)
      .map((r, idx) => ({ ...r, round_number: idx + 1 }));
    setLocalRounds(updated);
    if (onSaveActivityRounds) onSaveActivityRounds(updated);
    if (removed) {
      broadcastScheduleChangeNotice(
        `تعديل في الجدول الزمني: إلغاء (${removed.title})`,
        `تم تحديث ترتيب الجولات (${updated.length} فقرات متبقية). يرجى مراجعة الجدول المحدث.`
      );
    }
    setSaveFeedback('تم حذف الجولة وإعادة ترقيم الجولات تلقائياً.');
  };

  const handlePolicySave = (closeAfterSave = false) => {
    if (onSaveAttendancePolicy) onSaveAttendancePolicy(localPolicy);
    if (onSaveActivityRounds) onSaveActivityRounds(localRounds);
    setSaveFeedback('تم حفظ سياسة الحضور المبكر والجولات بنجاح.');
    if (closeAfterSave) {
      setActiveOverlayCard(null);
    }
  };

  const runRlsCheck = (testType: 'other_service' | 'direct_points_update') => {
    if (testType === 'other_service') {
      const msg =
        'مسموح للأدمن فقط: الأدمن يملك صلاحية استعراض وإدارة جميع الخدمات الخمس.';
      setRlsFeedback({ allowed: true, title: 'نجح الوصول الشامل (صلاحية أدمن)', detail: msg });
      onLogRlsTest('ADMIN_SELECT_ALL_SERVICES', 'services/*', true, msg);
    } else {
      const msg =
        'مرفوض للجميع (حتى الأدمن!): جدول points_ledger محمي بـ Trigger (Append-Only) يمنع UPDATE/DELETE.';
      setRlsFeedback({
        allowed: false,
        title: 'حظر تعديل سجل النقاط الأصلي (Append-Only Ledger)',
        detail: msg,
      });
      onLogRlsTest('RLS_UPDATE_POINTS_LEDGER_BLOCKED', 'points_ledger', false, msg);
    }
  };

  const settingsCards = [
    {
      id: 'identity' as const,
      num: '١',
      title: 'الهوية والشعارات والمراحل (لوحة الأدمن)',
      subtitle: 'تعديل اسم الكنيسة والكرنفال، اللوجوهات الـ ٣، الجوانب، ومراحل الحدث ١..٧',
      badge: `المرحلة ${edition.current_stage}: ${stageInfo.short_title}`,
      icon: Settings2,
      colorClass: 'from-orange-500 to-amber-500 text-orange-600 dark:text-amber-400',
      borderClass: isLight
        ? 'border-amber-200 hover:border-orange-400 bg-amber-50/40'
        : 'border-slate-800 hover:border-orange-500/60 bg-[#0D1323]',
    },
    {
      id: 'rounds_policy' as const,
      num: '٢',
      title: 'الجولات والحضور وباب التسجيل',
      subtitle:
        'فتح/قفل شاشات المستخدمين، بونص الحضور المبكر قبل الفعالية الجديدة بدقائق، وجدول الروندات',
      badge: `${localRounds.length} جولات · بونص قبل الفعالية بـ ${
        localPolicy.early_arrival_minutes_before_round || 10
      } د`,
      icon: CalendarClock,
      colorClass: 'from-blue-600 to-sky-500 text-blue-600 dark:text-sky-400',
      borderClass: isLight
        ? 'border-blue-200 hover:border-blue-400 bg-blue-50/30'
        : 'border-slate-800 hover:border-sky-500/60 bg-[#0D1323]',
    },
    {
      id: 'servants' as const,
      num: '٣',
      title: 'إدارة الخدام والأدوار والصلاحيات',
      subtitle:
        'الكل معتمد تلقائياً · تحديد الأدوار، تفويض التكويد والأكواد، أو حذف أي مستخدم',
      badge: `${allServants.length} خادم معتمد`,
      icon: UserCheck,
      colorClass: 'from-emerald-600 to-teal-500 text-emerald-600 dark:text-emerald-400',
      borderClass: isLight
        ? 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/30'
        : 'border-slate-800 hover:border-emerald-500/60 bg-[#0D1323]',
    },
    {
      id: 'coding' as const,
      num: '٤',
      title: 'تكويد الفرق والسنة الدراسية (List of Values)',
      subtitle:
        'تحديث قوائم الاختيار لتسجيل المخدومين وتحديث شيت القالب الفارغ (Excel) تلقائياً',
      badge: `${codedGrades.length} سنوات · ${codedTeams.length} فرق`,
      icon: BookOpen,
      colorClass: 'from-indigo-600 to-violet-500 text-indigo-600 dark:text-indigo-400',
      borderClass: isLight
        ? 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/30'
        : 'border-slate-800 hover:border-indigo-500/60 bg-[#0D1323]',
    },
    {
      id: 'kids' as const,
      num: '٥',
      title: 'المخدومين وشيت الإكسيل وسحب صور الـ QR',
      subtitle:
        'إدخال فردي، رفع شيت إكسيل بقوائم التكويد، وسحب/مشاركة صور بطاقات الـ QR دفعة واحدة',
      badge: `${kids.length} مخدوم مسجل`,
      icon: Users,
      colorClass: 'from-purple-600 to-fuchsia-500 text-purple-600 dark:text-purple-400',
      borderClass: isLight
        ? 'border-purple-200 hover:border-purple-400 bg-purple-50/30'
        : 'border-slate-800 hover:border-purple-500/60 bg-[#0D1323]',
    },
    {
      id: 'reports_audit' as const,
      num: '٦',
      title: 'تقارير Excel وسجل المراقبة وتنظيف التجارب',
      subtitle:
        'تصدير الشيت الشامل (٧ أوراق)، متابعة سجل المراقبة، وتهيئة البيانات التجريبية قبل الإطلاق',
      badge: `${auditLogs.length} حدث · Excel`,
      icon: FileSpreadsheet,
      colorClass: 'from-teal-600 to-emerald-500 text-teal-600 dark:text-teal-400',
      borderClass: isLight
        ? 'border-teal-200 hover:border-teal-400 bg-teal-50/30'
        : 'border-slate-800 hover:border-teal-500/60 bg-[#0D1323]',
    },
    {
      id: 'bulk_badges' as const,
      num: '٧',
      title: 'طباعة البادجات الجماعية (A4 جاهزة للقص)',
      subtitle:
        'تصفية حسب الخدمة أو الفريق أو السنة الدراسية وطباعة بطاقات QR بعلامات قص جاهزة للتغليف',
      badge: `${kids.length + allServants.length} بطاقة · A4`,
      icon: Printer,
      colorClass: 'from-amber-600 to-orange-500 text-amber-600 dark:text-amber-400',
      borderClass: isLight
        ? 'border-amber-200 hover:border-amber-400 bg-amber-50/30'
        : 'border-slate-800 hover:border-amber-500/60 bg-[#0D1323]',
    },
    {
      id: 'attendance_analytics' as const,
      num: '٨',
      title: 'تقرير الحضور المفصّل (الخدمة · السنة · الفريق)',
      subtitle:
        'نسب الحضور الفعلي مقابل المسجلين، الحضور المبكر، المتغيبين، وتصدير تقرير Excel مفصّل',
      badge: `${gateCheckins.length} حضور مسجّل`,
      icon: BarChart3,
      colorClass: 'from-sky-600 to-indigo-500 text-sky-600 dark:text-sky-400',
      borderClass: isLight
        ? 'border-sky-200 hover:border-sky-400 bg-sky-50/30'
        : 'border-slate-800 hover:border-sky-500/60 bg-[#0D1323]',
    },
  ];

  return (
    <div
      className={`rounded-3xl p-3.5 sm:p-5 border-2 space-y-4 transition-colors print:p-0 print:border-0 print:shadow-none print:bg-white ${
        isLight
          ? 'bg-white border-amber-200 text-slate-900 shadow-xl shadow-amber-900/5'
          : 'bg-[#12192B]/95 border-slate-800 text-slate-100 shadow-2xl shadow-black/60'
      }`}
    >
      {/* مدخلات رفع الشعارات المخفية */}
      <input
        ref={churchFileRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleLogoFileChange('church', e)}
        className="hidden"
      />
      <input
        ref={serviceFileRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleLogoFileChange('service', e)}
        className="hidden"
      />
      <input
        ref={carnivalFileRef}
        type="file"
        accept="image/*"
        onChange={(e) => handleLogoFileChange('carnival', e)}
        className="hidden"
      />

      {/* ١. هيدر لوحة تحكم الأدمن */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-500/20 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h2 className="text-sm sm:text-base font-extrabold truncate">
                إعدادات ولوحة الأدمن ({servant.full_name})
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                أدمن معتمد
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="min-h-[36px] px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-600 dark:text-rose-300 border border-rose-500/30 text-xs font-extrabold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>خروج</span>
        </button>
      </div>

      <div className="space-y-4 print:hidden">
      {/* ١.ب بطاقة توثيق حساب الأدمن عبر Google */}
      {onSignInAdminGoogle && (
        <div
          className={`rounded-2xl p-3.5 border space-y-2 ${
            isFirebaseAdmin
              ? isLight
                ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950'
                : 'bg-emerald-950/35 border-emerald-500/40 text-emerald-100'
              : isLight
              ? 'bg-amber-50/90 border-amber-300 text-amber-950'
              : 'bg-amber-950/30 border-amber-500/40 text-amber-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-start gap-2 min-w-0 flex-1">
              <KeyRound
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  isFirebaseAdmin ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              />
              <div className="min-w-0">
                <div className="text-xs font-extrabold">
                  {isFirebaseAdmin
                    ? 'توثيق حساب الأدمن عبر Google مفعّل'
                    : 'تفعيل الصلاحيات الإدارية الخاصة عبر Google (اختياري)'}
                </div>
                <p className="text-[11px] opacity-85 leading-relaxed mt-0.5">
                  {isFirebaseAdmin
                    ? `الحساب الموثق: ${firebaseAdminEmail}`
                    : 'توثيق حساب Google المعتمد يفعّل عرض الأرقام الخاصة والحذف الإداري المباشر.'}
                </p>
              </div>
            </div>

            {isFirebaseAdmin ? (
              onSignOutAdminGoogle && (
                <button
                  type="button"
                  onClick={onSignOutAdminGoogle}
                  className="min-h-[34px] px-3 rounded-xl border border-emerald-500/40 text-[11px] font-extrabold hover:bg-emerald-500/15 cursor-pointer shrink-0"
                >
                  فصل حساب Google
                </button>
              )
            ) : (
              <button
                type="button"
                disabled={isAdminGoogleSigningIn}
                onClick={onSignInAdminGoogle}
                className="min-h-[38px] px-3.5 rounded-xl bg-gradient-to-l from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs font-extrabold shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isAdminGoogleSigningIn ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التوثيق...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>توثيق الأدمن بـ Google</span>
                  </>
                )}
              </button>
            )}
          </div>

          {adminGoogleAuthError && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] font-bold">
              {adminGoogleAuthError}
            </div>
          )}
        </div>
      )}

      {/* مركز التنبيهات الفورية وبث الطوارئ وتغييرات الجدول لمسؤولي الفرق */}
      <LiveAlertsNotificationCenter
        editionId={edition.id}
        actor={servant}
        roleCategory="admin"
        canBroadcast={true}
        alerts={emergencyAlerts}
        activityRounds={localRounds}
        onCreateAlert={onCreateAlert}
        isLight={isLight}
      />

      {/* لوحة المتابعة السريعة للأدمن */}
      <RoleQuickDashboard
        roleCategory="admin"
        roleLabel="أدمن الكرنفال"
        userName={servant.full_name}
        serviceName={serviceName}
        kids={kids}
        servants={allServants}
        codedTeams={codedTeams}
        pointsLedger={pointsLedger}
        gateCheckins={gateCheckins}
        emergencyAlerts={emergencyAlerts}
        activityRounds={localRounds}
        isLight={isLight}
      />

      {/* ٢. شريط التبديل الرئيسي مضبوط داخل شاشة الموبايل */}
      <div
        className={`p-1 rounded-2xl border grid grid-cols-3 gap-1 ${
          isLight
            ? 'bg-amber-50/90 border-amber-200 shadow-inner'
            : 'bg-[#0C1222] border-slate-800 shadow-inner'
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveView('settings')}
          className={`min-h-[44px] px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeView === 'settings'
              ? 'bg-gradient-to-l from-blue-600 to-sky-600 text-white shadow-sm'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">الإعدادات (٨)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('ops')}
          className={`min-h-[44px] px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeView === 'ops'
              ? 'bg-gradient-to-l from-emerald-600 to-teal-500 text-white shadow-sm'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">تشغيل الكرنفال</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveView('live')}
          className={`min-h-[44px] px-2 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
            activeView === 'live'
              ? 'bg-gradient-to-l from-orange-500 to-amber-500 text-white shadow-sm'
              : 'opacity-75 hover:opacity-100'
          }`}
        >
          <Radio className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">الشاشة الحية</span>
        </button>
      </div>

      {saveFeedback && (
        <div className="rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="truncate">{saveFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveFeedback(null)}
            className="p-1 rounded-lg hover:bg-emerald-500/20 cursor-pointer shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      </div>

      {activeView === 'settings' ? (
        /* ================= كروت إعدادات النظام ================= */
        <div className="grid grid-cols-1 gap-3 print:hidden">
          {settingsCards.map((card) => {
            const IconComp = card.icon;
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => {
                  setSaveFeedback(null);
                  setActiveOverlayCard(card.id);
                }}
                className={`w-full text-right rounded-2xl p-4 border-2 transition-all cursor-pointer flex items-center justify-between gap-3 group active:scale-[0.99] ${card.borderClass}`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${card.colorClass} text-white flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <IconComp className="w-5 h-5 text-white" />
                  </div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-extrabold">
                        {card.num}. {card.title}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-700'
                            : 'bg-[#141D33] border-slate-700 text-slate-300'
                        }`}
                      >
                        {card.badge}
                      </span>
                    </div>
                    <p className="text-[11px] opacity-75 leading-relaxed line-clamp-2">
                      {card.subtitle}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 transition-transform group-hover:-translate-x-0.5 ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-600'
                      : 'bg-[#141D33] border-slate-700 text-slate-300'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      ) : activeView === 'ops' ? (
        /* ================= غرفة عمليات يوم الكرنفال (بوابة + محطات + تسكين + طوارئ) ================= */
        <CarnivalOperationsHub
          edition={edition}
          actorServant={servant}
          actorRoles={roles}
          isAdmin={true}
          canViewParentPhone={isFirebaseAdmin}
          servants={allServants}
          kids={kids}
          services={allServices}
          codedTeams={codedTeams}
          activityRounds={localRounds}
          attendancePolicy={localPolicy}
          gateCheckins={gateCheckins}
          pointsLedger={pointsLedger}
          emergencyAlerts={emergencyAlerts}
          offlineQueueCount={offlineQueueCount}
          onSyncOfflineQueue={onSyncOfflineQueue}
          onRecordGateCheckin={
            onRecordGateCheckin || (async () => ({ queuedOffline: false }))
          }
          onAddPointsEntry={onAddPointsEntry || (async () => {})}
          onReassignKidTeam={onReassignKidTeam || (async () => {})}
          onCreateAlert={onCreateAlert || (async () => {})}
          onUpdateAlertStatus={onUpdateAlertStatus || (async () => {})}
          defaultTab="gate"
          isLight={isLight}
        />
      ) : (
        /* ================= صفحة المعاينة الحية (Live Display) ================= */
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div
              className={`p-1 rounded-xl border inline-flex items-center gap-1 ${
                isLight ? 'bg-slate-100 border-slate-200' : 'bg-[#0C1222] border-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={() => setLivePreviewSubMode('kiosk')}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  livePreviewSubMode === 'kiosk'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <MonitorPlay className="w-3.5 h-3.5" />
                <span>شاشة العرض (Kiosk)</span>
              </button>

              <button
                type="button"
                onClick={() => setLivePreviewSubMode('user_screen')}
                className={`min-h-[34px] px-2.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer ${
                  livePreviewSubMode === 'user_screen'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'opacity-75 hover:opacity-100'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>معاينة شاشة المستخدم</span>
              </button>
            </div>
          </div>

          {livePreviewSubMode === 'kiosk' ? (
            <CarnivalLiveDisplayView
              edition={edition}
              axes={axes}
              codedTeams={codedTeams}
              pointsLedger={pointsLedger}
              kids={kids}
              gateCheckins={gateCheckins}
              isLight={isLight}
              onOpenSettingsModal={() => {
                setActiveView('settings');
                setActiveOverlayCard('identity');
              }}
            />
          ) : (
            <div
              className={`rounded-3xl p-4 border-2 space-y-3 ${
                isLight
                  ? 'bg-gradient-to-b from-[#FFFDF7] to-[#FFF9EC] border-amber-300 shadow-inner'
                  : 'bg-[#0B101E] border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-extrabold text-blue-600 dark:text-sky-400 pb-2 border-b border-slate-500/15">
                <span className="flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  <span>معاينة حية لهيدر وهوية المستخدم:</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 text-[10px]">
                  متزامن لحظياً
                </span>
              </div>

              <div
                className={`rounded-2xl p-3 border space-y-2 ${
                  isLight ? 'bg-white border-amber-200' : 'bg-[#12192B] border-slate-800'
                }`}
              >
                <div
                  className={`w-full py-1.5 px-3 rounded-xl border text-center font-extrabold text-xs ${
                    isLight
                      ? 'bg-amber-50/80 border-amber-200 text-slate-900'
                      : 'bg-[#0C1222] border-slate-800 text-white'
                  }`}
                >
                  {edition.church_name}
                </div>

                <div className="flex items-center justify-between gap-3 px-1">
                  <div className="w-14 h-14 rounded-2xl border-2 border-amber-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {edition.church_logo_url ? (
                      <img
                        src={edition.church_logo_url}
                        alt="لوجو الكنيسة"
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <Church className="w-6 h-6 text-amber-600" />
                    )}
                  </div>

                  <div className="flex-1 text-center min-w-0 space-y-1">
                    <div className="inline-flex px-3 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-orange-600 text-xs font-extrabold truncate max-w-full">
                      {edition.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-[11px] font-bold opacity-80">
                      <Calendar className="w-3 h-3 text-blue-600" />
                      <span>{formatArabicDateLabel(edition.starts_on)}</span>
                    </div>
                  </div>

                  <div className="w-14 h-14 rounded-2xl border-2 border-sky-300 bg-white flex items-center justify-center overflow-hidden shrink-0">
                    {edition.carnival_logo_url ? (
                      <img
                        src={edition.carnival_logo_url}
                        alt="لوجو الكرنفال"
                        className="w-full h-full object-contain p-0.5"
                      />
                    ) : (
                      <Sparkles className="w-6 h-6 text-orange-500" />
                    )}
                  </div>
                </div>

                <div
                  className={`w-full py-1.5 px-3 rounded-xl border text-center font-extrabold text-[11px] ${
                    isLight
                      ? 'bg-amber-50/80 border-amber-200 text-orange-700'
                      : 'bg-[#0C1222] border-slate-800 text-amber-400'
                  }`}
                >
                  {edition.service_title}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= النافذة المنبثقة فوق الصفحة (Full Overlay Card Modal) ================= */}
      {activeOverlayCard && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto print:static print:inset-auto print:bg-white print:p-0 print:block print:overflow-visible">
          <div
            className={`w-full ${
              activeOverlayCard === 'bulk_badges' || activeOverlayCard === 'attendance_analytics'
                ? 'max-w-3xl'
                : 'max-w-xl'
            } max-h-[92vh] rounded-3xl border-2 shadow-2xl flex flex-col overflow-hidden print:max-w-none print:max-h-none print:rounded-none print:border-0 print:shadow-none print:overflow-visible print:bg-white ${
              isLight
                ? 'bg-[#FFFDF9] border-amber-300 text-slate-900'
                : 'bg-[#0E1526] border-slate-700 text-slate-100'
            }`}
          >
            {/* هيدر الصفحة المنبثقة الثابت مع زر الحفظ وزر الإغلاق X */}
            <div
              className={`px-4 py-3 border-b flex items-center justify-between gap-2 shrink-0 print:hidden ${
                isLight ? 'bg-amber-50/90 border-amber-200' : 'bg-[#131C31] border-slate-800'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Settings2 className="w-4 h-4 text-orange-500 shrink-0" />
                <h3 className="text-xs sm:text-sm font-extrabold truncate">
                  {settingsCards.find((c) => c.id === activeOverlayCard)?.title}
                </h3>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {(activeOverlayCard === 'identity' || activeOverlayCard === 'rounds_policy') && (
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => {
                      if (activeOverlayCard === 'identity') {
                        handleSaveIdentitySettings(true);
                      } else if (activeOverlayCard === 'rounds_policy') {
                        handlePolicySave(true);
                      }
                    }}
                    className="min-h-[34px] px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ وإغلاق</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveOverlayCard(null)}
                  title="إغلاق النافذة (X)"
                  className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-white border-slate-300 text-slate-700 hover:bg-rose-50 hover:text-rose-600'
                      : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-rose-500/20 hover:text-rose-300'
                  }`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* محتوى الصفحة المنبثقة القابل للتمرير */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4 print:p-0 print:overflow-visible">
              {saveFeedback && (
                <div className="rounded-2xl p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-extrabold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{saveFeedback}</span>
                </div>
              )}

              {activeOverlayCard === 'identity' && (
                /* ====== محتوى كارت ١: الهوية والشعارات والمحاور والمراحل (مدمج مع لوحة الأدمن) ====== */
                <div className="space-y-4">
                  {/* أ. الشعارات الـ ٣: اللوجو الأيمن + شعار المنتصف + اللوجو الأيسر */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {/* اللوجو الأيمن */}
                    <div
                      className={`rounded-2xl p-3 border space-y-2 ${
                        isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#0C1220] border-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-extrabold">١. لوجو الكنيسة (يمين)</div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {draftChurchLogo ? (
                            <img
                              src={draftChurchLogo}
                              alt="لوجو الكنيسة"
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Church className="w-5 h-5 text-amber-600" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <button
                            type="button"
                            onClick={() => churchFileRef.current?.click()}
                            className="min-h-[30px] px-2.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>رفع صورة</span>
                          </button>
                          {draftChurchLogo && (
                            <button
                              type="button"
                              onClick={() => {
                                setDraftChurchLogo(null);
                                onLogoUpload('church', null);
                              }}
                              className="min-h-[26px] px-2 rounded-lg bg-rose-500/15 text-rose-600 text-[10px] font-bold cursor-pointer"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* شعار الخدمة / المنتصف */}
                    <div
                      className={`rounded-2xl p-3 border space-y-2 ${
                        isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#0C1220] border-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-extrabold">٢. شعار الخدمة (المنتصف)</div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {draftServiceLogo ? (
                            <img
                              src={draftServiceLogo}
                              alt="شعار الخدمة"
                              className="w-full h-full object-contain p-1"
                            />
                          ) : (
                            <Sparkles className="w-5 h-5 text-orange-500" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <button
                            type="button"
                            onClick={() => serviceFileRef.current?.click()}
                            className="min-h-[30px] px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>رفع صورة</span>
                          </button>
                          {draftServiceLogo && (
                            <button
                              type="button"
                              onClick={() => {
                                setDraftServiceLogo(null);
                                onLogoUpload('service', null);
                              }}
                              className="min-h-[26px] px-2 rounded-lg bg-rose-500/15 text-rose-600 text-[10px] font-bold cursor-pointer"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* اللوجو الأيسر */}
                    <div
                      className={`rounded-2xl p-3 border space-y-2 ${
                        isLight ? 'bg-blue-50/50 border-blue-200' : 'bg-[#0C1220] border-slate-800'
                      }`}
                    >
                      <div className="text-[11px] font-extrabold">٣. لوجو الكرنفال (يسار)</div>
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-xl border bg-white flex items-center justify-center overflow-hidden shrink-0">
                          {draftCarnivalLogo ? (
                            <img
                              src={draftCarnivalLogo}
                              alt="لوجو الكرنفال"
                              className="w-full h-full object-contain p-0.5"
                            />
                          ) : (
                            <Sparkles className="w-5 h-5 text-blue-500" />
                          )}
                        </div>
                        <div className="flex flex-col gap-1 flex-1">
                          <button
                            type="button"
                            onClick={() => carnivalFileRef.current?.click()}
                            className="min-h-[30px] px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Upload className="w-3 h-3" />
                            <span>رفع صورة</span>
                          </button>
                          {draftCarnivalLogo && (
                            <button
                              type="button"
                              onClick={() => {
                                setDraftCarnivalLogo(null);
                                onLogoUpload('carnival', null);
                              }}
                              className="min-h-[26px] px-2 rounded-lg bg-rose-500/15 text-rose-600 text-[10px] font-bold cursor-pointer"
                            >
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ب. بيانات الهيدر والشعار النصي والفوتر */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-extrabold mb-1">اسم الكنيسة:</label>
                      <input
                        type="text"
                        required
                        value={draftChurchName}
                        onChange={(e) => setDraftChurchName(e.target.value)}
                        className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                            : 'bg-[#0C1220] border-slate-700 focus:border-orange-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold mb-1">عنوان الخدمة:</label>
                      <input
                        type="text"
                        required
                        value={draftServiceTitle}
                        onChange={(e) => setDraftServiceTitle(e.target.value)}
                        className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                            : 'bg-[#0C1220] border-slate-700 focus:border-orange-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold mb-1">اسم الكرنفال:</label>
                      <input
                        type="text"
                        required
                        value={draftCarnivalName}
                        onChange={(e) => setDraftCarnivalName(e.target.value)}
                        className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                            : 'bg-[#0C1220] border-slate-700 focus:border-orange-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold mb-1">تاريخ الكرنفال:</label>
                      <input
                        type="date"
                        dir="ltr"
                        required
                        value={draftCarnivalDate}
                        onChange={(e) => setDraftCarnivalDate(e.target.value)}
                        className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-mono font-bold outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                            : 'bg-[#0C1220] border-slate-700 focus:border-orange-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold mb-1">شعار الكرنفال (Motto):</label>
                      <input
                        type="text"
                        value={draftMotto}
                        onChange={(e) => setDraftMotto(e.target.value)}
                        className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                            : 'bg-[#0C1220] border-slate-700 focus:border-orange-500'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-extrabold mb-1">
                        نص الشريط السفلي (اسم الكنيسة والكرنفال):
                      </label>
                      <input
                        type="text"
                        value={draftFooterText}
                        onChange={(e) => setDraftFooterText(e.target.value)}
                        className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-bold outline-none ${
                          isLight
                            ? 'bg-slate-50 border-slate-300 focus:border-orange-500 focus:bg-white'
                            : 'bg-[#0C1220] border-slate-700 focus:border-orange-500'
                        }`}
                      />
                    </div>
                  </div>

                  {/* ج. الجوانب الأربعة */}
                  <div
                    className={`rounded-2xl p-3.5 border space-y-2.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold">
                        الجوانب والمحاور ({draftAxes.length}):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={handleAddAxis}
                          className="min-h-[28px] px-2.5 rounded-lg bg-blue-600/15 text-blue-600 dark:text-sky-400 border border-blue-500/30 text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>إضافة</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDraftAxes(INITIAL_AXES)}
                          className="min-h-[28px] px-2.5 rounded-lg bg-slate-500/10 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>افتراضي</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {draftAxes.map((ax, idx) => (
                        <div
                          key={ax.id}
                          className={`flex items-center gap-2 p-2 rounded-xl border ${
                            isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                          }`}
                        >
                          <input
                            type="color"
                            value={ax.color}
                            onChange={(e) => handleAxisChange(idx, 'color', e.target.value)}
                            className="w-7 h-7 rounded-lg border-0 cursor-pointer shrink-0 bg-transparent"
                          />
                          <input
                            type="text"
                            value={ax.name}
                            onChange={(e) => handleAxisChange(idx, 'name', e.target.value)}
                            className="flex-1 min-w-0 px-2 py-1 text-xs font-extrabold bg-transparent outline-none"
                          />
                          {draftAxes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveAxis(idx)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* د. مراحل الحدث السبع (State Machine 1..7) */}
                  <div
                    className={`rounded-2xl p-3.5 border space-y-2.5 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-600 dark:text-sky-400">
                        <Layers className="w-4 h-4" />
                        <span>مرحلة الحدث الحالية (State Machine 1..7):</span>
                      </div>
                      <span className="text-xs font-extrabold text-orange-600">
                        {stageInfo.short_title}
                      </span>
                    </div>

                    <div className="grid grid-cols-7 gap-1">
                      {EVENT_STAGES.map((st) => {
                        const active = edition.current_stage === st.stage;
                        return (
                          <button
                            key={st.stage}
                            type="button"
                            onClick={() => onStageChange(st.stage)}
                            className={`min-h-[36px] rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                              active
                                ? 'bg-blue-600 text-white border-blue-500 shadow-xs'
                                : isLight
                                ? 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                                : 'bg-[#141D33] text-slate-300 border-slate-700'
                            }`}
                          >
                            م {st.stage}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-xs opacity-85 leading-relaxed">
                      <strong>{stageInfo.title}:</strong> {stageInfo.description}
                    </p>
                  </div>

                  {/* هـ. سجل التعديلات وفحص الحماية */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div
                      className={`rounded-2xl p-3 border space-y-2 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1220] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-600">
                        <History className="w-3.5 h-3.5" />
                        <span>سجل التعديلات ({history.length}):</span>
                      </div>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {history.slice(0, 3).map((h) => (
                          <div
                            key={h.id}
                            className={`p-2 rounded-xl border text-[11px] ${
                              isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                            }`}
                          >
                            <div className="font-bold">{h.changed_by}</div>
                            <div className="opacity-80">
                              {h.previous_name} ← <strong>{h.new_name}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div
                      className={`rounded-2xl p-3 border space-y-2 ${
                        isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#0C1220] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>فحص قواعد الحماية (RLS):</span>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => runRlsCheck('other_service')}
                          className={`min-h-[32px] px-2.5 rounded-xl border text-[11px] font-bold text-right cursor-pointer ${
                            isLight
                              ? 'bg-white border-slate-300'
                              : 'bg-[#141D33] border-slate-700'
                          }`}
                        >
                          • اختبار وصول الأدمن للخدمات الخمس
                        </button>
                        <button
                          type="button"
                          onClick={() => runRlsCheck('direct_points_update')}
                          className={`min-h-[32px] px-2.5 rounded-xl border text-[11px] font-bold text-right cursor-pointer ${
                            isLight
                              ? 'bg-white border-slate-300'
                              : 'bg-[#141D33] border-slate-700'
                          }`}
                        >
                          • اختبار حماية سجل النقاط (Append-Only)
                        </button>
                      </div>
                      {rlsFeedback && (
                        <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold">
                          {rlsFeedback.title}: {rlsFeedback.detail}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeOverlayCard === 'rounds_policy' && (
                /* ====== محتوى كارت ٢: الجولات والحضور وباب التسجيل ====== */
                <div className="space-y-4">
                  {/* أ. قرارات فتح/غلق البوابة والتسجيل */}
                  <div
                    className={`rounded-2xl p-3.5 border-2 space-y-3 ${
                      isLight
                        ? 'bg-blue-50/50 border-blue-200'
                        : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="text-xs font-extrabold text-blue-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Lock className="w-4 h-4 shrink-0" />
                      <span>أولاً: فتح وغلق شاشات المستخدمين وباب التسجيل</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div
                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                          isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold">١. فتح شاشات الدخول للمستخدمين</div>
                          <div className="text-[11px] opacity-75">
                            {localPolicy.allow_user_portal_access
                              ? 'الدخول مفتوح حالياً للخدام والمخدومين ✓'
                              : 'الشاشات مقفولة حالياً حتى يفتحها الأدمن 🔒'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = {
                              ...localPolicy,
                              allow_user_portal_access: !localPolicy.allow_user_portal_access,
                            };
                            setLocalPolicy(next);
                            if (onSaveAttendancePolicy) onSaveAttendancePolicy(next);
                          }}
                          className={`min-h-[34px] px-3 rounded-xl text-xs font-extrabold text-white cursor-pointer ${
                            localPolicy.allow_user_portal_access ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        >
                          {localPolicy.allow_user_portal_access ? 'قفل الشاشات' : 'فتح الشاشات'}
                        </button>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                          isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold">٢. باب تسجيل الخدام الجدد</div>
                          <div className="text-[11px] opacity-75">
                            {localPolicy.allow_servant_registration ? 'مفتوح ✓' : 'مغلق 🔒'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = {
                              ...localPolicy,
                              allow_servant_registration: !localPolicy.allow_servant_registration,
                            };
                            setLocalPolicy(next);
                            if (onSaveAttendancePolicy) onSaveAttendancePolicy(next);
                          }}
                          className={`min-h-[34px] px-3 rounded-xl text-xs font-extrabold text-white cursor-pointer ${
                            localPolicy.allow_servant_registration ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        >
                          {localPolicy.allow_servant_registration ? 'غلق للخدام' : 'فتح للخدام'}
                        </button>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                          isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-extrabold">٣. باب تسجيل المخدومين</div>
                          <div className="text-[11px] opacity-75">
                            {localPolicy.allow_kids_registration ? 'مفتوح للمسجِّلين ✓' : 'مغلق 🔒'}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = {
                              ...localPolicy,
                              allow_kids_registration: !localPolicy.allow_kids_registration,
                            };
                            setLocalPolicy(next);
                            if (onSaveAttendancePolicy) onSaveAttendancePolicy(next);
                          }}
                          className={`min-h-[34px] px-3 rounded-xl text-xs font-extrabold text-white cursor-pointer ${
                            localPolicy.allow_kids_registration ? 'bg-rose-600' : 'bg-emerald-600'
                          }`}
                        >
                          {localPolicy.allow_kids_registration ? 'غلق للمخدومين' : 'فتح للمخدومين'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ب. سياسة الحضور وبونص الحضور المبكر قبل موعد الفعالية الجديدة بدقائق قليلة */}
                  <div
                    className={`rounded-2xl p-3.5 border space-y-3 ${
                      isLight ? 'bg-amber-50/50 border-amber-200' : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-orange-600 dark:text-amber-400">
                      <Award className="w-4 h-4" />
                      <span>ثانياً: سياسة الحضور وبونص الفعالية الجديدة</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5 text-xs">
                      <div
                        className={`p-3 rounded-xl border space-y-2 ${
                          isLight ? 'bg-white border-amber-200' : 'bg-[#141D33] border-slate-700'
                        }`}
                      >
                        <div className="font-extrabold text-orange-600 dark:text-amber-300">
                          • بونص الحضور المبكر (قبل ميعاد الفعالية الجديدة بدقائق قليلة — الفعالية التي ستُفتح بعد دقائق):
                        </div>
                        <p className="text-[11px] opacity-80">
                          يُمنح البونص تلقائياً لمن يسجل حضوره قبل فتح الفعالية الجديدة بدقائق قليلة (وليس مرتبطاً بساعة ثابتة فقط).
                        </p>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">نقاط البونص:</span>
                            <input
                              type="number"
                              min={0}
                              max={200}
                              value={localPolicy.early_arrival_bonus_points}
                              onChange={(e) =>
                                setLocalPolicy((p) => ({
                                  ...p,
                                  early_arrival_bonus_points: Number(e.target.value) || 0,
                                }))
                              }
                              className="w-16 px-2 py-1 rounded-lg border text-center font-mono font-extrabold bg-transparent"
                            />
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">قبل فتح الفعالية بـ (دقائق):</span>
                            <input
                              type="number"
                              min={1}
                              max={60}
                              value={localPolicy.early_arrival_minutes_before_round || 10}
                              onChange={(e) =>
                                setLocalPolicy((p) => ({
                                  ...p,
                                  early_arrival_minutes_before_round: Number(e.target.value) || 10,
                                }))
                              }
                              className="w-16 px-2 py-1 rounded-lg border text-center font-mono font-extrabold bg-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      <div
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 ${
                          isLight ? 'bg-white border-amber-200' : 'bg-[#141D33] border-slate-700'
                        }`}
                      >
                        <span className="font-extrabold">نقاط تسجيل حضور البوابة:</span>
                        <input
                          type="number"
                          min={0}
                          max={200}
                          value={localPolicy.gate_attendance_points}
                          onChange={(e) =>
                            setLocalPolicy((p) => ({
                              ...p,
                              gate_attendance_points: Number(e.target.value) || 0,
                            }))
                          }
                          className="w-20 px-2 py-1 rounded-lg border text-center font-mono font-extrabold bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ج. جدول الفعاليات والروندات */}
                  <div
                    className={`rounded-2xl p-3.5 border space-y-3 ${
                      isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1220] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-extrabold">
                      <span>ثالثاً: جدول الفعاليات والروندات ({localRounds.length})</span>
                      <span>
                        الإجمالي: {localRounds.reduce((acc, r) => acc + r.max_points, 0)} نقطة
                      </span>
                    </div>

                    <label className="flex items-center gap-2 text-[11px] font-bold cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={notifyTeamsOnScheduleChange}
                        onChange={(e) => setNotifyTeamsOnScheduleChange(e.target.checked)}
                        className="w-4 h-4 rounded accent-orange-600 cursor-pointer"
                      />
                      <span>إرسال تنبيه فوري لمسؤولي الفرق تلقائياً عند إضافة أو حذف فعالية بالجدول</span>
                    </label>

                    <div className="space-y-2">
                      {localRounds.map((round) => (
                        <div
                          key={round.id}
                          className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                            isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="font-extrabold truncate">
                              {round.round_number}. {round.title}
                            </div>
                            <div className="text-[11px] opacity-75">
                              {round.axis_name} · {round.location} ({round.start_time} -{' '}
                              {round.end_time})
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-600 font-extrabold text-[11px]">
                              {round.max_points} ن
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDeleteActivityRound(round.id)}
                              className="p-1 text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <form
                      onSubmit={handleAddActivityRound}
                      className={`p-3 rounded-xl border space-y-2.5 ${
                        isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-700'
                      }`}
                    >
                      <div className="text-xs font-extrabold text-orange-600">
                        + إضافة فعالية جديدة:
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          required
                          value={newRoundTitle}
                          onChange={(e) => setNewRoundTitle(e.target.value)}
                          placeholder="اسم الفعالية"
                          className="min-h-[36px] px-3 rounded-xl border text-xs font-bold bg-transparent"
                        />
                        <input
                          type="text"
                          value={newRoundLocation}
                          onChange={(e) => setNewRoundLocation(e.target.value)}
                          placeholder="المكان"
                          className="min-h-[36px] px-3 rounded-xl border text-xs font-bold bg-transparent"
                        />
                        <select
                          value={newRoundAxis}
                          onChange={(e) => setNewRoundAxis(e.target.value)}
                          className={`min-h-[36px] px-3 rounded-xl border text-xs font-bold ${
                            isLight ? 'bg-slate-50 text-slate-900' : 'bg-[#0C1220] text-white'
                          }`}
                        >
                          {draftAxes.map((ax) => (
                            <option key={ax.id} value={ax.name}>
                              محور: {ax.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          value={newRoundPoints}
                          onChange={(e) => setNewRoundPoints(Number(e.target.value) || 50)}
                          placeholder="النقاط"
                          className="min-h-[36px] px-3 rounded-xl border text-xs font-mono font-bold bg-transparent"
                        />
                      </div>
                      <button
                        type="submit"
                        className="w-full min-h-[36px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>إضافة الجولة</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {activeOverlayCard === 'servants' && (
                /* ====== محتوى كارت ٣: الخدام والأدوار والصلاحيات وحذف أي يوزر ====== */
                <div className="space-y-3.5">
                  <div
                    className={`rounded-2xl p-3 border text-xs font-bold leading-relaxed ${
                      isLight
                        ? 'bg-emerald-50/70 border-emerald-200 text-slate-800'
                        : 'bg-[#0C1220] border-slate-800 text-slate-300'
                    }`}
                  >
                    • <strong>السياسة المعتمدة:</strong> كل خادم يسجل بياناته يظهر له الكود والـ QR مباشرة في الشاشة دون إيميل، ويكون <strong>معتمداً تلقائياً</strong>. ويمكنك كأدمن تعيين أدواره أو تفويضه بالتكويد والأكواد أو <strong>حذف أي مستخدم</strong>.
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold">
                      إجمالي الخدام المعتمدين ({filteredServants.length}):
                    </span>
                    <select
                      value={servantFilterService}
                      onChange={(e) => setServantFilterService(e.target.value)}
                      className={`min-h-[36px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-[#0C1220] border-slate-700 text-white'
                      }`}
                    >
                      <option value="all">جميع المراحل والخدمات</option>
                      {allServices.map((srv) => (
                        <option key={srv.id} value={srv.id}>
                          {srv.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2.5">
                    {filteredServants.map((srv) => {
                      const srvRoles = allServantRoles
                        .filter((r) => r.servant_id === srv.id)
                        .map((r) => r.role);
                      const srvServiceName =
                        allServices.find((s) => s.id === srv.service_id)?.name || 'غير محدد';
                      const isTargetAdmin = srvRoles.includes('admin');

                      return (
                        <div
                          key={srv.id}
                          className={`p-3.5 rounded-2xl border space-y-2.5 ${
                            isLight
                              ? 'bg-slate-50/90 border-slate-200'
                              : 'bg-[#0C1220] border-slate-800'
                          }`}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs sm:text-sm font-extrabold">
                                  {srv.full_name}
                                </span>
                                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                  معتمد ✓
                                </span>
                              </div>
                              <div className="text-[11px] opacity-75">
                                {srvServiceName} · موبايل: {srv.phone} · QR: {srv.qr_token}
                                {srv.pin_code ? ` · كود: ${srv.pin_code}` : ''}
                                {srv.username || srv.admin_username
                                  ? ` · يوزر: ${srv.username || srv.admin_username}`
                                  : ''}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(srv.pin_code || srv.qr_token);
                                  setCopiedServantId(srv.id);
                                  setTimeout(() => setCopiedServantId(null), 1800);
                                }}
                                className={`min-h-[30px] px-2.5 rounded-xl border text-[11px] font-extrabold flex items-center gap-1 cursor-pointer ${
                                  copiedServantId === srv.id
                                    ? 'bg-emerald-600 text-white border-emerald-500'
                                    : isLight
                                    ? 'bg-white border-slate-300 text-slate-700'
                                    : 'bg-[#141D33] border-slate-700 text-slate-200'
                                }`}
                              >
                                {copiedServantId === srv.id ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>نسخ</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>{srv.pin_code ? `كود ${srv.pin_code}` : 'الكود'}</span>
                                  </>
                                )}
                              </button>

                              <a
                                href={`https://wa.me/2${srv.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                                  `أهلاً بك يا ${srv.full_name} في ${edition.name}. رمز الـ QR الخاص بك هو: ${srv.qr_token}${srv.pin_code ? ` والكود المربوط به هو: ${srv.pin_code}` : ''}${srv.username ? ` واسم المستخدم: ${srv.username}` : ''}`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="min-h-[30px] px-2.5 rounded-xl bg-emerald-600/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold flex items-center gap-1"
                              >
                                <Send className="w-3 h-3" />
                                <span>واتساب</span>
                              </a>

                              {/* زر حذف أي يوزر (مع تأكيد الحذف) */}
                              {!isTargetAdmin && onDeleteServant && (
                                <>
                                  {confirmDeleteServantId === srv.id ? (
                                    <div className="flex items-center gap-1">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          onDeleteServant(srv.id);
                                          setConfirmDeleteServantId(null);
                                          setSaveFeedback(
                                            `تم حذف حساب المستخدم (${srv.full_name}) نهائياً.`
                                          );
                                        }}
                                        className="min-h-[30px] px-2.5 rounded-xl bg-rose-600 text-white text-[11px] font-extrabold cursor-pointer"
                                      >
                                        تأكيد الحذف
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteServantId(null)}
                                        className="min-h-[30px] px-2 rounded-xl bg-slate-500/20 text-[11px] font-bold cursor-pointer"
                                      >
                                        إلغاء
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteServantId(srv.id)}
                                      title="حذف المستخدم"
                                      className="min-h-[30px] px-2.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>حذف</span>
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* أزرار تعيين الأدوار */}
                          <div className="pt-2 border-t border-slate-500/15 space-y-2">
                            <div className="flex flex-wrap items-center gap-1">
                              {ASSIGNABLE_ROLES.map((roleKey) => {
                                const hasRole = srvRoles.includes(roleKey);
                                return (
                                  <button
                                    key={roleKey}
                                    type="button"
                                    onClick={() => {
                                      if (onToggleServantRole) {
                                        onToggleServantRole(srv.id, roleKey);
                                      }
                                    }}
                                    className={`min-h-[28px] px-2 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer ${
                                      hasRole
                                        ? 'bg-orange-600 text-white border-orange-500'
                                        : isLight
                                        ? 'bg-white text-slate-600 border-slate-300'
                                        : 'bg-[#141D33] text-slate-300 border-slate-700'
                                    }`}
                                  >
                                    {hasRole ? '✓ ' : '+ '}
                                    {ROLE_METADATA[roleKey].label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* أزرار التفويض من الأدمن: صلاحية شاشة الأكواد + صلاحية التكويد */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onToggleServantKidsCodesPermission) {
                                    onToggleServantKidsCodesPermission(srv.id);
                                  }
                                }}
                                className={`min-h-[28px] px-2.5 rounded-lg text-[10px] font-extrabold border flex items-center gap-1 cursor-pointer ${
                                  srv.can_view_kids_codes
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : isLight
                                    ? 'bg-white text-blue-700 border-blue-300'
                                    : 'bg-[#141D33] text-sky-300 border-slate-700'
                                }`}
                              >
                                <Lock className="w-3 h-3 shrink-0" />
                                <span>
                                  {srv.can_view_kids_codes
                                    ? '✓ مفوض بكشف الأكواد'
                                    : '+ تفويض شاشة الأكواد'}
                                </span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  if (onToggleServantCodingPermission) {
                                    onToggleServantCodingPermission(srv.id);
                                  }
                                }}
                                className={`min-h-[28px] px-2.5 rounded-lg text-[10px] font-extrabold border flex items-center gap-1 cursor-pointer ${
                                  srv.can_manage_coding
                                    ? 'bg-indigo-600 text-white border-indigo-500'
                                    : isLight
                                    ? 'bg-white text-indigo-700 border-indigo-300'
                                    : 'bg-[#141D33] text-indigo-300 border-slate-700'
                                }`}
                              >
                                <BookOpen className="w-3 h-3 shrink-0" />
                                <span>
                                  {srv.can_manage_coding
                                    ? '✓ مفوض بتكويد الفرق والسنة'
                                    : '+ تفويض تكويد الفرق والسنة'}
                                </span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeOverlayCard === 'coding' && (
                /* ====== محتوى كارت ٤: تكويد الفرق والسنة الدراسية (List of Values) ====== */
                <CodingMasterDataManager
                  codedGrades={codedGrades}
                  codedTeams={codedTeams}
                  isLight={isLight}
                  onSaveCodedGrades={(grades) => {
                    if (onSaveCodedGrades) onSaveCodedGrades(grades);
                  }}
                  onSaveCodedTeams={(teams) => {
                    if (onSaveCodedTeams) onSaveCodedTeams(teams);
                  }}
                />
              )}

              {activeOverlayCard === 'kids' && (
                /* ====== محتوى كارت ٥: تسجيل المخدومين وشيت الإكسيل وسحب صور الأكواد ====== */
                <KidsRegistrationManager
                  edition={edition}
                  services={allServices}
                  kids={kids}
                  codedGrades={codedGrades}
                  codedTeams={codedTeams}
                  actorName={`${servant.full_name} (أدمن)`}
                  actorServiceId={servant.service_id}
                  isAdmin={true}
                  canViewKidsCodes={true}
                  isKidsRegistrationOpen={localPolicy.allow_kids_registration}
                  isLight={isLight}
                  onAddKids={(newKids) => {
                    if (onAddKids) onAddKids(newKids);
                  }}
                  onDeleteKid={onDeleteKid}
                />
              )}

              {activeOverlayCard === 'reports_audit' && (() => {
                const demoServantsCount = allServants.filter((s) =>
                  DEMO_SERVANT_IDS.includes(s.id)
                ).length;
                const demoKidsCount = kids.filter((k) => DEMO_KID_IDS.includes(k.id)).length;
                const demoAuditCount = auditLogs.filter((a) =>
                  DEMO_AUDIT_LOG_IDS.includes(a.id)
                ).length;
                const totalLedgerPts = pointsLedger.reduce((sum, e) => sum + e.points, 0);

                const q = auditSearchQuery.trim().toLowerCase();
                const visibleAuditLogs = !q
                  ? auditLogs.slice(0, 60)
                  : auditLogs
                      .filter(
                        (log) =>
                          log.actor_name.toLowerCase().includes(q) ||
                          log.action.toLowerCase().includes(q) ||
                          log.target.toLowerCase().includes(q)
                      )
                      .slice(0, 60);

                return (
                  <div className="space-y-5">
                    {/* القسم ١: تصدير تقارير Excel جاهزة */}
                    <div
                      className={`rounded-2xl p-4 border space-y-3 ${
                        isLight
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-[#0C1422] border-emerald-500/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-emerald-700 dark:text-emerald-300">
                          <FileSpreadsheet className="w-4 h-4 shrink-0" />
                          <span>١. تصدير تقارير Excel حقيقية (.xlsx)</span>
                        </div>
                        <span className="text-[11px] font-bold opacity-80">
                          {isFirebaseAdmin
                            ? 'يتضمن الهواتف للمشرف الموثق'
                            : 'بدون هواتف خاصة (حتى توثيق Google)'}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          exportCarnivalMasterWorkbook({
                            edition,
                            services: allServices,
                            servants: allServants,
                            servantRoles: allServantRoles,
                            kids,
                            codedTeams,
                            gateCheckins,
                            pointsLedger,
                            emergencyAlerts,
                            auditLogs,
                            includeSensitivePii: isFirebaseAdmin,
                          })
                        }
                        className="w-full min-h-[46px] px-4 rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <Download className="w-4 h-4 shrink-0" />
                        <span>تحميل التقرير الشامل للكرنفال (٧ أوراق عمل Excel)</span>
                      </button>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            exportScoreboardWorkbook({
                              codedTeams,
                              pointsLedger,
                              kids,
                              gateCheckins,
                            })
                          }
                          className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold flex items-center justify-between gap-2 cursor-pointer ${
                            isLight
                              ? 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                              : 'bg-[#121B2E] border-slate-700 text-emerald-300 hover:border-emerald-500/50'
                          }`}
                        >
                          <span>تقرير الترتيب والنقاط</span>
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            exportGateAttendanceWorkbook({
                              gateCheckins,
                              services: allServices,
                            })
                          }
                          className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold flex items-center justify-between gap-2 cursor-pointer ${
                            isLight
                              ? 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                              : 'bg-[#121B2E] border-slate-700 text-emerald-300 hover:border-emerald-500/50'
                          }`}
                        >
                          <span>كشف حضور البوابة ({gateCheckins.length})</span>
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            exportTeamsAndKidsWorkbook({
                              kids,
                              services: allServices,
                              gateCheckins,
                              includeSensitivePii: isFirebaseAdmin,
                            })
                          }
                          className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold flex items-center justify-between gap-2 cursor-pointer ${
                            isLight
                              ? 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                              : 'bg-[#121B2E] border-slate-700 text-emerald-300 hover:border-emerald-500/50'
                          }`}
                        >
                          <span>كشف الفرق والمخدومين ({kids.length})</span>
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                        </button>

                        <button
                          type="button"
                          onClick={() => exportAuditLogsWorkbook({ auditLogs })}
                          className={`min-h-[40px] px-3 rounded-xl border text-xs font-extrabold flex items-center justify-between gap-2 cursor-pointer ${
                            isLight
                              ? 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-50'
                              : 'bg-[#121B2E] border-slate-700 text-emerald-300 hover:border-emerald-500/50'
                          }`}
                        >
                          <span>كشف سجل المراقبة ({auditLogs.length})</span>
                          <FileSpreadsheet className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </div>

                    {/* القسم ٢: تنظيف البيانات التجريبية قبل استقبال التسجيلات الحقيقية */}
                    <div
                      className={`rounded-2xl p-4 border space-y-3 ${
                        isLight
                          ? 'bg-rose-50/60 border-rose-200'
                          : 'bg-[#1A1018] border-rose-500/30'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-rose-700 dark:text-rose-300">
                          <Trash2 className="w-4 h-4 shrink-0" />
                          <span>٢. تهيئة وتنظيف البيانات التجريبية قبل الإطلاق</span>
                        </div>
                        {demoDataCleared && (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[10px] font-extrabold">
                            تم التنظيف مسبقاً
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] opacity-85 leading-relaxed">
                        يحذف الحسابات والأكواد والمخدومين التجريبيين الافتراضيين ويمنع إعادة إنشائها تلقائياً عند تحديث الصفحة، مع الإبقاء التام على حساب الأدمن وكل التسجيلات الحقيقية.
                        {demoCleanedAt ? ` (آخر تنظيف: ${demoCleanedAt.slice(0, 16).replace('T', ' ')})` : ''}
                      </p>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                        <div
                          className={`p-2 rounded-xl border ${
                            isLight ? 'bg-white border-rose-200' : 'bg-[#0E1526] border-slate-800'
                          }`}
                        >
                          <div className="text-sm font-black tabular-nums">{demoServantsCount}</div>
                          <div className="text-[10px] opacity-75">خدام تجريبيون</div>
                        </div>
                        <div
                          className={`p-2 rounded-xl border ${
                            isLight ? 'bg-white border-rose-200' : 'bg-[#0E1526] border-slate-800'
                          }`}
                        >
                          <div className="text-sm font-black tabular-nums">{demoKidsCount}</div>
                          <div className="text-[10px] opacity-75">مخدومون تجريبيون</div>
                        </div>
                        <div
                          className={`p-2 rounded-xl border ${
                            isLight ? 'bg-white border-rose-200' : 'bg-[#0E1526] border-slate-800'
                          }`}
                        >
                          <div className="text-sm font-black tabular-nums">{gateCheckins.length}</div>
                          <div className="text-[10px] opacity-75">حضور بوابة</div>
                        </div>
                        <div
                          className={`p-2 rounded-xl border ${
                            isLight ? 'bg-white border-rose-200' : 'bg-[#0E1526] border-slate-800'
                          }`}
                        >
                          <div className="text-sm font-black tabular-nums">{totalLedgerPts}</div>
                          <div className="text-[10px] opacity-75">رصيد نقاط حالي</div>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs font-bold">
                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={includeOperationalReset}
                            onChange={(e) => setIncludeOperationalReset(e.target.checked)}
                            className="mt-1 accent-rose-600"
                          />
                          <span>
                            مسح سجلات التجارب الميدانية أيضاً (حضور البوابة: {gateCheckins.length}، البلاغات: {emergencyAlerts.length}، وسجل المراقبة الأولي: {demoAuditCount})
                          </span>
                        </label>

                        <label className="flex items-start gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={zeroOutPointsReset}
                            onChange={(e) => setZeroOutPointsReset(e.target.checked)}
                            className="mt-1 accent-rose-600"
                          />
                          <span>
                            تصفير أرصدة نقاط الفرق الحالية عبر قيد تصحيحي رسمي (للحفاظ على نزاهة السجل غير القابل للحذف)
                          </span>
                        </label>

                        <label className="flex items-start gap-2 cursor-pointer text-rose-700 dark:text-rose-300">
                          <input
                            type="checkbox"
                            checked={confirmCleanupAck}
                            onChange={(e) => setConfirmCleanupAck(e.target.checked)}
                            className="mt-1 accent-rose-600"
                          />
                          <span>أؤكد رغبتي في حذف البيانات التجريبية المحددة وتجهيز المنظومة للتسجيل الفعلي</span>
                        </label>
                      </div>

                      {!isFirebaseAdmin && onSignInAdminGoogle && (
                        <div
                          className={`rounded-xl p-3 border text-xs flex flex-wrap items-center justify-between gap-2 ${
                            isLight
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 font-bold">
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                            <span>يلزم توثيق حساب Google للأدمن أولاً لحذف السجلات التجريبية:</span>
                          </span>
                          <button
                            type="button"
                            disabled={isAdminGoogleSigningIn}
                            onClick={onSignInAdminGoogle}
                            className="min-h-[36px] px-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-extrabold cursor-pointer"
                          >
                            {isAdminGoogleSigningIn ? 'جاري التوثيق...' : 'توثيق Google الآن'}
                          </button>
                        </div>
                      )}

                      {cleanupResult && (
                        <div
                          className={`rounded-xl p-3 border text-xs font-extrabold ${
                            cleanupResult.type === 'success'
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {cleanupResult.text}
                        </div>
                      )}

                      {onCleanupDemoData && (
                        <button
                          type="button"
                          disabled={!confirmCleanupAck || !isFirebaseAdmin || isCleaningDemo}
                          onClick={async () => {
                            setCleanupResult(null);
                            setIsCleaningDemo(true);
                            try {
                              const res = await onCleanupDemoData({
                                includeOperationalTestRecords: includeOperationalReset,
                                zeroOutPointsLedger: zeroOutPointsReset,
                              });
                              setConfirmCleanupAck(false);
                              setCleanupResult({
                                type: 'success',
                                text: `تم التنظيف بنجاح: حذف ${res.deletedCount} سجل تجريبي${
                                  res.zeroedTeamsCount > 0
                                    ? ` وتصفير أرصدة ${res.zeroedTeamsCount} فرق بقيد تصحيحي`
                                    : ''
                                }. المنظومة جاهزة الآن لاستقبال التسجيلات الحقيقية.`,
                              });
                            } catch (err) {
                              setCleanupResult({
                                type: 'error',
                                text:
                                  err instanceof Error
                                    ? err.message
                                    : 'تعذر إتمام التنظيف. تأكد من الاتصال وتوثيق الأدمن.',
                              });
                            } finally {
                              setIsCleaningDemo(false);
                            }
                          }}
                          className="w-full min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                        >
                          {isCleaningDemo ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>جاري تنظيف البيانات التجريبية...</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span>تنفيذ تنظيف البيانات التجريبية وتجهيز الإطلاق</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* القسم ٣: سجل المراقبة والتدقيق */}
                    <div
                      className={`rounded-2xl p-4 border space-y-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0C1222] border-slate-800'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
                          <Database className="w-4 h-4 text-blue-500 shrink-0" />
                          <span>٣. سجل المراقبة والتدقيق ({auditLogs.length})</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-sky-300 text-[10px] font-extrabold">
                          تحديث لحظي محفوظ
                        </span>
                      </div>

                      <div className="relative">
                        <Search className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={auditSearchQuery}
                          onChange={(e) => setAuditSearchQuery(e.target.value)}
                          placeholder="بحث بالاسم أو نوع الحدث أو المسار..."
                          className={`w-full min-h-[40px] pr-9 pl-3 rounded-xl border text-xs font-bold ${
                            isLight
                              ? 'bg-white border-slate-300 text-slate-900'
                              : 'bg-[#12192B] border-slate-700 text-white'
                          }`}
                        />
                      </div>

                      <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                        {visibleAuditLogs.length === 0 ? (
                          <div className="py-5 text-center text-xs font-bold opacity-65">
                            لا توجد أحداث مطابقة في سجل المراقبة.
                          </div>
                        ) : (
                          visibleAuditLogs.map((log) => (
                            <div
                              key={log.id}
                              className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                                isLight
                                  ? 'bg-white border-slate-200'
                                  : 'bg-[#12192B] border-slate-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-extrabold truncate">{log.actor_name}</span>
                                <span className="text-[10px] font-mono opacity-75 shrink-0 tabular-nums">
                                  {log.created_at}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                                <span className="px-2 py-0.5 rounded-lg bg-orange-500/15 text-orange-700 dark:text-amber-300 font-mono font-extrabold">
                                  {log.action}
                                </span>
                                <span className="font-mono opacity-75 truncate">{log.target}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {activeOverlayCard === 'bulk_badges' && (
                <BulkBadgesPrintManager
                  edition={edition}
                  services={allServices}
                  servants={allServants}
                  servantRoles={allServantRoles}
                  kids={kids}
                  codedGrades={codedGrades}
                  codedTeams={codedTeams}
                  isLight={isLight}
                />
              )}

              {activeOverlayCard === 'attendance_analytics' && (
                <AttendanceAnalyticsPanel
                  edition={edition}
                  services={allServices}
                  servants={allServants}
                  kids={kids}
                  codedGrades={codedGrades}
                  codedTeams={codedTeams}
                  gateCheckins={gateCheckins}
                  pointsLedger={pointsLedger}
                  isLight={isLight}
                />
              )}
            </div>

            {/* شريط سفلي للنافذة المنبثقة للحفظ والإغلاق السريع */}
            <div
              className={`px-4 py-3 border-t flex items-center justify-between gap-2 shrink-0 print:hidden ${
                isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#131C31] border-slate-800'
              }`}
            >
              {(activeOverlayCard === 'identity' || activeOverlayCard === 'rounds_policy') ? (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => {
                    if (activeOverlayCard === 'identity') {
                      handleSaveIdentitySettings(true);
                    } else if (activeOverlayCard === 'rounds_policy') {
                      handlePolicySave(true);
                    }
                  }}
                  className="flex-1 min-h-[42px] rounded-xl bg-gradient-to-l from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>حفظ التعديلات وإغلاق النافذة</span>
                </button>
              ) : (
                <div className="text-[11px] font-bold opacity-75">
                  يتم حفظ التعديلات تلقائياً فور إجرائها
                </div>
              )}

              <button
                type="button"
                onClick={() => setActiveOverlayCard(null)}
                className={`min-h-[42px] px-4 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <X className="w-4 h-4" />
                <span>إغلاق (X)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
