'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Lock,
  Sparkles,
  Layers,
  ShieldAlert,
  Eye,
  Trophy,
  Users,
  CalendarClock,
} from 'lucide-react';
import {
  ROLE_METADATA,
  EVENT_STAGES,
  type Edition,
  type Servant,
  type ServantRole,
  type ServiceItem,
  type AxisItem,
  type CarnivalInfoHistoryEntry,
  type EventStageNumber,
  type ServantRoleRecord,
  type ServantStatus,
  type CarnivalActivityRound,
  type AttendanceAndPointsPolicy,
  type KidParticipant,
  type CodedGradeItem,
  type CodedTeamItem,
  INITIAL_ACTIVITY_ROUNDS,
  INITIAL_ATTENDANCE_POLICY,
  INITIAL_CODED_GRADES,
  INITIAL_CODED_TEAMS,
  computeTeamScoreboard,
  type GateCheckinRecord,
  type PointsLedgerEntry,
  type EmergencyAlertRecord,
  type EmergencyAlertStatus,
  type AuditLogRecord,
} from '@/lib/carnival-store';
import { AdminDashboard } from './AdminDashboard';
import { type HomepageAdminPayload } from './CarnivalEmblem';
import { ServantIdCardView } from './ServantIdCardView';
import { KidsRegistrationManager } from './KidsRegistrationManager';
import { CodingMasterDataManager } from './CodingMasterDataManager';
import { CarnivalOperationsHub } from './CarnivalOperationsHub';
import { LiveScoreboardView } from './LiveScoreboardView';
import { EmergencyAlertsPanel } from './EmergencyAlertsPanel';
import { RoleQuickDashboard } from './RoleQuickDashboard';
import { LiveAlertsNotificationCenter } from './LiveAlertsNotificationCenter';

interface SessionDashboardPreviewProps {
  edition: Edition;
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
  axes?: AxisItem[];
  history?: CarnivalInfoHistoryEntry[];
  isLight: boolean;
  accessLevel?: 'full' | 'readonly';
  onLogout: () => void;
  onLogRlsTest: (action: string, target: string, allowed: boolean, reason: string) => void;
  onOpenSettingsModal?: () => void;
  onSaveSettings?: (payload: HomepageAdminPayload) => Promise<void>;
  onLogoUpload?: (target: 'church' | 'service' | 'carnival', dataUrl: string | null) => Promise<void>;
  onStageChange?: (stage: EventStageNumber) => void;
  onUpdateServantAvatar?: (servantId: string, newAvatarUrl: string) => void;
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

export const SessionDashboardPreview: React.FC<SessionDashboardPreviewProps> = ({
  edition,
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
  axes = [],
  history = [],
  isLight,
  accessLevel = 'full',
  onLogout,
  onLogRlsTest,
  onOpenSettingsModal,
  onSaveSettings,
  onLogoUpload,
  onStageChange,
  onUpdateServantAvatar,
  onUpdateServantStatus,
  onDeleteServant,
  onBulkApproveServants,
  onToggleServantRole,
  onToggleServantKidsCodesPermission,
  onToggleServantCodingPermission,
  onSaveCodedGrades,
  onSaveCodedTeams,
  onSaveActivityRounds,
  onSaveAttendancePolicy,
  onAddKids,
  onDeleteKid,
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
  const [activeRole, setActiveRole] = useState<ServantRole>(roles[0] || 'team_lead');
  const [showReadonlyAlertForm, setShowReadonlyAlertForm] = useState(false);
  const [rlsTestFeedback, setRlsTestFeedback] = useState<{
    allowed: boolean;
    title: string;
    detail: string;
  } | null>(null);

  const isAdmin =
    accessLevel === 'full' && (roles.includes('admin') || activeRole === 'admin');
  const canAddKidsInSession =
    accessLevel === 'full' &&
    (!!servant.can_manage_coding ||
      roles.includes('registrar') ||
      roles.includes('service_lead') ||
      roles.includes('admin'));
  const canViewCodesInSession =
    accessLevel === 'full' && !!servant.can_view_kids_codes;
  const canManageKids = canAddKidsInSession || canViewCodesInSession;
  const stageInfo =
    EVENT_STAGES.find((s) => s.stage === edition.current_stage) || EVENT_STAGES[1];

  // إذا كان المستخدم المسجل هو الأدمن بصلاحية كاملة، يتم عرض AdminDashboard
  if (isAdmin && onSaveSettings && onLogoUpload && onStageChange) {
    return (
      <AdminDashboard
        edition={edition}
        axes={axes}
        history={history}
        servant={servant}
        roles={roles}
        serviceName={serviceName}
        allServices={allServices}
        allServants={allServants}
        allServantRoles={allServantRoles}
        activityRounds={activityRounds}
        attendancePolicy={attendancePolicy}
        kids={kids}
        codedGrades={codedGrades}
        codedTeams={codedTeams}
        isLight={isLight}
        onOpenSettingsModal={onOpenSettingsModal}
        onSaveSettings={onSaveSettings}
        onLogoUpload={onLogoUpload}
        onStageChange={onStageChange}
        onUpdateServantStatus={onUpdateServantStatus}
        onDeleteServant={onDeleteServant}
        onBulkApproveServants={onBulkApproveServants}
        onToggleServantRole={onToggleServantRole}
        onToggleServantKidsCodesPermission={onToggleServantKidsCodesPermission}
        onToggleServantCodingPermission={onToggleServantCodingPermission}
        onSaveCodedGrades={onSaveCodedGrades}
        onSaveCodedTeams={onSaveCodedTeams}
        onSaveActivityRounds={onSaveActivityRounds}
        onSaveAttendancePolicy={onSaveAttendancePolicy}
        onAddKids={onAddKids}
        onDeleteKid={onDeleteKid}
        onLogout={onLogout}
        onLogRlsTest={onLogRlsTest}
        isFirebaseAdmin={isFirebaseAdmin}
        firebaseAdminEmail={firebaseAdminEmail}
        isAdminGoogleSigningIn={isAdminGoogleSigningIn}
        adminGoogleAuthError={adminGoogleAuthError}
        onSignInAdminGoogle={onSignInAdminGoogle}
        onSignOutAdminGoogle={onSignOutAdminGoogle}
        gateCheckins={gateCheckins}
        pointsLedger={pointsLedger}
        emergencyAlerts={emergencyAlerts}
        offlineQueueCount={offlineQueueCount}
        onSyncOfflineQueue={onSyncOfflineQueue}
        onRecordGateCheckin={onRecordGateCheckin}
        onAddPointsEntry={onAddPointsEntry}
        onReassignKidTeam={onReassignKidTeam}
        onCreateAlert={onCreateAlert}
        onUpdateAlertStatus={onUpdateAlertStatus}
        auditLogs={auditLogs}
        demoDataCleared={demoDataCleared}
        demoCleanedAt={demoCleanedAt}
        onCleanupDemoData={onCleanupDemoData}
      />
    );
  }

  // حساب النقاط والفرقة والترتيب الحقيقي من Firestore
  const matchedKidRecord = kids.find((k) => k.id === servant.id);
  const participantTeamName =
    matchedKidRecord?.team_name ||
    codedTeams[0]?.name ||
    'فريق أسود الكرنفال (المجموعة أ)';

  const scoreboard = computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins);
  const myTeamSummary =
    scoreboard.find((t) => t.team_name === participantTeamName) || scoreboard[0];

  const myGateRecord = gateCheckins.find(
    (g) =>
      g.subject_id === servant.id &&
      g.subject_type === (matchedKidRecord ? 'kid' : 'servant')
  );

  const assignedTeam = {
    teamName: myTeamSummary?.team_name || participantTeamName,
    totalPoints: myTeamSummary?.total_points ?? 0,
    rank: myTeamSummary ? `المركز #${myTeamSummary.rank}` : '—',
    stationNow: activityRounds[0]?.title || 'جولات اليوم الكرنفالي',
  };

  const carnivalSchedule = activityRounds.map((r) => ({
    time: `${r.start_time} - ${r.end_time}`,
    title: r.title,
    location: r.location,
  }));

  // ١. إذا كان الدخول في وضع المشاهدة فقط (مسؤول فريق أو مخدوم)
  if (accessLevel === 'readonly') {
    const readonlyRoleCategory = matchedKidRecord ? 'kid' : 'team_lead';
    const readonlyRoleLabel = matchedKidRecord ? 'مشارك (مخدوم)' : 'مسؤول فريق';

    return (
      <div className="space-y-4">
        {/* مركز التنبيهات الفورية للطوارئ وتغييرات الجدول الزمني */}
        <LiveAlertsNotificationCenter
          editionId={edition.id}
          actor={servant}
          roleCategory={readonlyRoleCategory}
          canBroadcast={false}
          alerts={emergencyAlerts}
          activityRounds={activityRounds}
          isLight={isLight}
        />

        {/* لوحة المتابعة السريعة حسب دور المستخدم */}
        <RoleQuickDashboard
          roleCategory={readonlyRoleCategory}
          roleLabel={readonlyRoleLabel}
          userName={servant.full_name}
          serviceName={serviceName}
          myTeamName={assignedTeam.teamName}
          kids={kids}
          servants={allServants}
          codedTeams={codedTeams}
          pointsLedger={pointsLedger}
          gateCheckins={gateCheckins}
          emergencyAlerts={emergencyAlerts}
          activityRounds={activityRounds}
          isLight={isLight}
        />

        {/* بطاقة بيانات الخادم أو المشارك مع تحميل الـ QR ونسخ الكود */}
        <ServantIdCardView
          edition={edition}
          servant={servant}
          serviceName={serviceName}
          isLight={isLight}
          onUpdateAvatar={(newUrl) => {
            if (onUpdateServantAvatar) {
              onUpdateServantAvatar(servant.id, newUrl);
            }
          }}
          secondaryActionLabel="تسجيل الخروج والعودة"
          onSecondaryAction={onLogout}
        />

        {/* الفرقة والنقاط والجدول */}
        <div
          className={`rounded-[28px] p-5 border shadow-lg space-y-4 ${
            isLight
              ? 'bg-white border-slate-200/90 text-[#0F2942]'
              : 'bg-[#12192B] border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-500/15">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-extrabold">
              <Eye className="w-4 h-4 shrink-0" />
              <span>ترتيب الفرق وجدول اليوم</span>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-extrabold border whitespace-nowrap ${
                myGateRecord
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                  : isLight
                  ? 'bg-slate-100 border-slate-200 text-slate-600'
                  : 'bg-[#0B101E] border-slate-700 text-slate-300'
              }`}
            >
              {myGateRecord
                ? `حضر بالبوابة (${myGateRecord.checked_in_local_time})`
                : 'لم يسجل حضور البوابة بعد'}
            </span>
          </div>

          {/* ترتيب الفرق المباشر للمشارك */}
          <LiveScoreboardView
            codedTeams={codedTeams}
            pointsLedger={pointsLedger}
            kids={kids}
            gateCheckins={gateCheckins}
            highlightTeamName={assignedTeam.teamName}
            isLight={isLight}
            compact={true}
          />

          {/* جدول اليوم الكرنفالي */}
          <div
            className={`rounded-2xl p-4 border space-y-3 ${
              isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
            }`}
          >
            <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
              <CalendarClock className="w-4 h-4 text-orange-500" />
              <span>جدول فقرات وروندات الكرنفال:</span>
            </div>
            <div className="space-y-2">
              {carnivalSchedule.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#141D33] border-slate-800'
                  }`}
                >
                  <div>
                    <div className="font-extrabold">{item.title}</div>
                    <div className="text-[11px] opacity-70">{item.location}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-orange-500/10 text-orange-600 dark:text-amber-300 font-extrabold text-[11px] tabular-nums">
                    {item.time}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* زر إرسال بلاغ طوارئ أو مفقودات سريع للمشارك / خادم الفريق */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setShowReadonlyAlertForm((p) => !p)}
              className={`w-full min-h-[44px] px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer ${
                showReadonlyAlertForm
                  ? 'bg-rose-600 text-white border-rose-500'
                  : isLight
                  ? 'bg-rose-50 border-rose-200 text-rose-700'
                  : 'bg-rose-950/30 border-rose-500/30 text-rose-300'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              <span>
                {showReadonlyAlertForm
                  ? 'إخفاء نافذة بلاغ الطوارئ والمفقودات'
                  : 'إبلاغ سريع عن حالة طارئة أو مفقودات'}
              </span>
            </button>

            {showReadonlyAlertForm && (
              <EmergencyAlertsPanel
                editionId={edition.id}
                actor={servant}
                canManageAlerts={false}
                canViewParentPhone={false}
                alerts={emergencyAlerts}
                kids={kids}
                codedTeams={codedTeams}
                onCreateAlert={onCreateAlert || (async () => {})}
                onUpdateAlertStatus={onUpdateAlertStatus || (async () => {})}
                isLight={isLight}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ٢. إذا كان حساب الخادم في انتظار الاعتماد (Pending) عند الدخول الكامل
  if (servant.status === 'pending') {
    return (
      <div className="space-y-4">
        <ServantIdCardView
          edition={edition}
          servant={servant}
          serviceName={serviceName}
          isLight={isLight}
          onUpdateAvatar={(newUrl) => {
            if (onUpdateServantAvatar) {
              onUpdateServantAvatar(servant.id, newUrl);
            }
          }}
          secondaryActionLabel="تسجيل الخروج والعودة"
          onSecondaryAction={onLogout}
        />
      </div>
    );
  }

  const currentRoleMeta = ROLE_METADATA[activeRole];

  const runRlsSimulation = (
    testType: 'other_service' | 'direct_points_update' | 'registrar_stage_check'
  ) => {
    if (testType === 'other_service') {
      const otherService = allServices.find((s) => s.id !== servant.service_id);
      if (activeRole === 'admin') {
        const msg = `مسموح للأدمن فقط: الأدمن يملك صلاحية استعراض جميع الخدمات بما فيها (${otherService?.name}).`;
        setRlsTestFeedback({ allowed: true, title: 'نجح الوصول (صلاحية أدمن)', detail: msg });
        onLogRlsTest('RLS_SELECT_OTHER_SERVICE', otherService?.name || 'other', true, msg);
      } else {
        const msg = `مرفوض بواسطة Row Level Security: دور (${currentRoleMeta.label}) مقيّد بخدمته فقط (${serviceName}) ولا يمكنه قراءة بيانات (${otherService?.name}).`;
        setRlsTestFeedback({
          allowed: false,
          title: 'تم حظر الوصول (RLS Policy Blocked)',
          detail: msg,
        });
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
        onLogRlsTest(
          'STAGE_MACHINE_REGISTER_KID_ALLOWED',
          `stage_${edition.current_stage}`,
          true,
          msg
        );
      } else {
        const msg = !isStage4
          ? `مرفوض بواسطة State Machine: الحدث حالياً في المرحلة (${edition.current_stage} - ${stageInfo.short_title}). إدخال المخدومين يُفتح فقط في المرحلة ٤.`
          : `مرفوض بواسطة RLS: دورك الحالي (${currentRoleMeta.label}) غير مصرح له بإدخال مخدومين جدد.`;
        setRlsTestFeedback({ allowed: false, title: 'مرفوض (قيد المرحلة أو الدور)', detail: msg });
        onLogRlsTest(
          'STAGE_MACHINE_REGISTER_KID_BLOCKED',
          `stage_${edition.current_stage}`,
          false,
          msg
        );
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* مركز التنبيهات الفورية وبث الطوارئ وتغييرات الجدول */}
      <LiveAlertsNotificationCenter
        editionId={edition.id}
        actor={servant}
        roleCategory="staff"
        canBroadcast={true}
        alerts={emergencyAlerts}
        activityRounds={activityRounds}
        onCreateAlert={onCreateAlert}
        isLight={isLight}
      />

      {/* لوحة المتابعة السريعة لخادم فريق العمل */}
      <RoleQuickDashboard
        roleCategory="staff"
        roleLabel={currentRoleMeta.label}
        userName={servant.full_name}
        serviceName={serviceName}
        kids={kids}
        servants={allServants}
        codedTeams={codedTeams}
        pointsLedger={pointsLedger}
        gateCheckins={gateCheckins}
        emergencyAlerts={emergencyAlerts}
        activityRounds={activityRounds}
        isLight={isLight}
      />

      {/* بطاقة بيانات الخادم مع تحميل الـ QR ونسخ الكود */}
      <ServantIdCardView
        edition={edition}
        servant={servant}
        serviceName={serviceName}
        isLight={isLight}
        onUpdateAvatar={(newUrl) => {
          if (onUpdateServantAvatar) {
            onUpdateServantAvatar(servant.id, newUrl);
          }
        }}
        secondaryActionLabel="تسجيل الخروج والعودة"
        onSecondaryAction={onLogout}
      />

      {/* غرفة تشغيل يوم الكرنفال المباشرة لخدام فرق العمل */}
      <CarnivalOperationsHub
        edition={edition}
        actorServant={servant}
        actorRoles={roles}
        isAdmin={false}
        canViewParentPhone={roles.includes('emergency') || roles.includes('service_lead')}
        servants={allServants}
        kids={kids}
        services={allServices}
        codedTeams={codedTeams}
        activityRounds={activityRounds}
        attendancePolicy={attendancePolicy}
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
        defaultTab={roles.includes('emergency') ? 'alerts' : 'gate'}
        isLight={isLight}
      />

      <div
        className={`rounded-3xl p-5 sm:p-7 border space-y-6 transition-colors ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900 shadow-xl shadow-slate-900/5'
            : 'bg-[#12192B]/95 border-slate-800/90 text-slate-100 shadow-2xl shadow-black/50'
        }`}
      >

      {/* تعدد الأدوار للخادم الواحد (جدول servant_roles) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-extrabold">
            <Layers className="w-4 h-4 text-orange-400" />
            <span>الأدوار المسندة للخادم ({roles.length} أدوار):</span>
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
            <span className="text-sm font-extrabold text-orange-500">
              صلاحيات الدور النشط: {currentRoleMeta.label}
            </span>
            <span className="text-xs opacity-70">وسيلة الدخول: {currentRoleMeta.login_type}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1.5">
              <div className="font-bold text-emerald-500 flex items-center gap-1.5">
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
              <div className="font-bold text-rose-500 flex items-center gap-1.5">
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

      {/* مختبر الصلاحيات وآلة الحالة */}
      <div
        className={`rounded-2xl p-4 border space-y-3 ${
          isLight ? 'bg-amber-50/60 border-amber-200' : 'bg-[#0B101E] border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>
              اختبار قواعد الحماية (RLS) ومراحل الحدث (المرحلة الحالية: {stageInfo.title})
            </span>
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
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-300'
                : 'bg-rose-500/15 border-rose-500/40 text-rose-600 dark:text-rose-300'
            }`}
          >
            <div className="font-extrabold flex items-center gap-1.5">
              {rlsTestFeedback.allowed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              ) : (
                <Lock className="w-4 h-4 text-rose-500 shrink-0" />
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

      {/* شاشة تكويد الفرق والسنوات الدراسية للخدام المفوضين من الأدمن */}
      {servant.can_manage_coding && onSaveCodedGrades && onSaveCodedTeams && (
        <CodingMasterDataManager
          codedGrades={codedGrades}
          codedTeams={codedTeams}
          isLight={isLight}
          onSaveCodedGrades={onSaveCodedGrades}
          onSaveCodedTeams={onSaveCodedTeams}
        />
      )}

      {/* قسم تسجيل المخدومين وعرض الأكواد: متاح للخادم المسجِّل أو أمين الخدمة أو المفوضين من الأدمن */}
      {canManageKids ? (
        <KidsRegistrationManager
          edition={edition}
          services={allServices}
          kids={kids}
          codedGrades={codedGrades}
          codedTeams={codedTeams}
          actorName={servant.full_name}
          actorServiceId={servant.service_id}
          isAdmin={false}
          canAddKids={canAddKidsInSession}
          canViewKidsCodes={canViewCodesInSession}
          isKidsRegistrationOpen={attendancePolicy?.allow_kids_registration ?? true}
          isLight={isLight}
          onAddKids={(newKids) => {
            if (onAddKids) onAddKids(newKids);
          }}
          onDeleteKid={onDeleteKid}
        />
      ) : (
        <div
          className={`rounded-2xl p-4 border flex items-center gap-3 text-xs font-bold ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-600'
              : 'bg-[#0D1323] border-slate-800 text-slate-400'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            إدخال بيانات المخدومين أو استعراض أكوادهم متاح فقط للخادم الحاصل على دور{' '}
            <strong className="text-orange-600 dark:text-amber-400">«خادم مسجِّل / أمين خدمة»</strong>{' '}
            أو صلاحية التكويد وعرض الأكواد من الأدمن.
          </span>
        </div>
      )}
    </div>
  );
};
