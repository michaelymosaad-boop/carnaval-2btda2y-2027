'use client';

import React, { useMemo, useState } from 'react';
import {
  Trophy,
  QrCode,
  Award,
  Users,
  Siren,
  Radio,
} from 'lucide-react';
import {
  type AttendanceAndPointsPolicy,
  type CarnivalActivityRound,
  type CodedTeamItem,
  type Edition,
  type EmergencyAlertRecord,
  type EmergencyAlertStatus,
  type GateCheckinRecord,
  type KidParticipant,
  type PointsLedgerEntry,
  type Servant,
  type ServantRole,
  type ServiceItem,
} from '@/lib/carnival-store';
import { LiveScoreboardView } from './LiveScoreboardView';
import { GateCheckinScanner } from './GateCheckinScanner';
import { StationPointsLedger } from './StationPointsLedger';
import { TeamAssignmentBoard } from './TeamAssignmentBoard';
import { EmergencyAlertsPanel } from './EmergencyAlertsPanel';
import { exportScoreboardWorkbook } from '@/lib/excel-export';

export type CarnivalOpsTabId = 'scoreboard' | 'gate' | 'stations' | 'teams' | 'alerts';

interface CarnivalOperationsHubProps {
  edition: Edition;
  actorServant: Servant;
  actorRoles: ServantRole[];
  isAdmin: boolean;
  canViewParentPhone?: boolean;
  servants: Servant[];
  kids: KidParticipant[];
  services: ServiceItem[];
  codedTeams: CodedTeamItem[];
  activityRounds: CarnivalActivityRound[];
  attendancePolicy: AttendanceAndPointsPolicy;
  gateCheckins: GateCheckinRecord[];
  pointsLedger: PointsLedgerEntry[];
  emergencyAlerts: EmergencyAlertRecord[];
  offlineQueueCount?: number;
  onSyncOfflineQueue?: () => Promise<void>;
  onRecordGateCheckin: (
    checkin: GateCheckinRecord,
    ledgerEntries: PointsLedgerEntry[]
  ) => Promise<{ queuedOffline: boolean }>;
  onAddPointsEntry: (entry: PointsLedgerEntry) => Promise<void>;
  onReassignKidTeam: (kidId: string, newTeamName: string) => Promise<void>;
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
  defaultTab?: CarnivalOpsTabId;
  isLight: boolean;
}

export const CarnivalOperationsHub: React.FC<CarnivalOperationsHubProps> = ({
  edition,
  actorServant,
  actorRoles,
  isAdmin,
  canViewParentPhone = false,
  servants,
  kids,
  services,
  codedTeams,
  activityRounds,
  attendancePolicy,
  gateCheckins,
  pointsLedger,
  emergencyAlerts,
  offlineQueueCount = 0,
  onSyncOfflineQueue,
  onRecordGateCheckin,
  onAddPointsEntry,
  onReassignKidTeam,
  onCreateAlert,
  onUpdateAlertStatus,
  defaultTab = 'scoreboard',
  isLight,
}) => {
  const isOperationalStaff =
    isAdmin ||
    actorServant.primary_role === 'staff' ||
    !!actorServant.can_manage_coding ||
    actorRoles.includes('staff') ||
    actorRoles.includes('service_lead') ||
    actorRoles.includes('emergency');

  const canUseGateOrStations =
    isAdmin ||
    actorServant.primary_role === 'staff' ||
    actorRoles.includes('staff') ||
    actorRoles.includes('service_lead');

  const canManageTeams =
    isAdmin ||
    actorServant.primary_role === 'staff' ||
    !!actorServant.can_manage_coding ||
    actorRoles.includes('service_lead');

  const availableTabs = useMemo(() => {
    const tabs: Array<{
      id: CarnivalOpsTabId;
      label: string;
      icon: React.ComponentType<{ className?: string }>;
      badge?: number;
    }> = [
      { id: 'scoreboard', label: 'الترتيب والنقاط', icon: Trophy },
    ];

    if (canUseGateOrStations) {
      tabs.push({
        id: 'gate',
        label: 'حضور البوابة',
        icon: QrCode,
        badge: gateCheckins.length,
      });
      tabs.push({
        id: 'stations',
        label: 'نقاط المحطات',
        icon: Award,
        badge: pointsLedger.length,
      });
    }

    if (canManageTeams) {
      tabs.push({
        id: 'teams',
        label: 'الفرق والبادجات',
        icon: Users,
        badge: kids.length,
      });
    }

    const activeAlertsCount = emergencyAlerts.filter((a) => a.status !== 'resolved').length;
    tabs.push({
      id: 'alerts',
      label: 'الطوارئ والمفقودات',
      icon: Siren,
      badge: activeAlertsCount > 0 ? activeAlertsCount : undefined,
    });

    return tabs;
  }, [
    canUseGateOrStations,
    canManageTeams,
    gateCheckins.length,
    pointsLedger.length,
    kids.length,
    emergencyAlerts,
  ]);

  const [activeTab, setActiveTab] = useState<CarnivalOpsTabId>(defaultTab);
  const effectiveTab = availableTabs.some((t) => t.id === activeTab)
    ? activeTab
    : 'scoreboard';

  return (
    <div
      className={`rounded-3xl p-4 sm:p-6 border space-y-4 transition-colors ${
        isLight
          ? 'bg-white border-amber-200 text-slate-900 shadow-lg shadow-amber-900/5'
          : 'bg-[#12192B]/95 border-slate-800 text-slate-100 shadow-2xl shadow-black/50'
      }`}
    >
      {/* عنوان غرفة العمليات الميدانية */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-500/15 print:hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-base font-black truncate">
              مركز تشغيل يوم الكرنفال المباشر
            </h3>
            <p className="text-[11px] opacity-75 truncate">
              تحديث لحظي مباشر · تسجيل البوابة، نقاط الروندات، التسكين، والطوارئ
            </p>
          </div>
        </div>
      </div>

      {/* شريط التبويبات المرن للموبايل */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 print:hidden">
        {availableTabs.map((tab) => {
          const IconComp = tab.icon;
          const isSelected = effectiveTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[44px] px-3.5 rounded-2xl border text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shrink-0 whitespace-nowrap ${
                isSelected
                  ? 'bg-gradient-to-l from-orange-600 to-amber-500 text-white border-orange-500 shadow-sm'
                  : isLight
                  ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  : 'bg-[#0D1323] text-slate-300 border-slate-800 hover:border-slate-600'
              }`}
            >
              <IconComp className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-lg text-[10px] font-black tabular-nums ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : isLight
                      ? 'bg-slate-200 text-slate-800'
                      : 'bg-slate-800 text-slate-200'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* محتوى التبويب النشط */}
      <div>
        {effectiveTab === 'scoreboard' && (
          <LiveScoreboardView
            codedTeams={codedTeams}
            pointsLedger={pointsLedger}
            kids={kids}
            gateCheckins={gateCheckins}
            onExportExcel={() =>
              exportScoreboardWorkbook({
                codedTeams,
                pointsLedger,
                kids,
                gateCheckins,
              })
            }
            isLight={isLight}
          />
        )}

        {effectiveTab === 'gate' && canUseGateOrStations && (
          <GateCheckinScanner
            editionId={edition.id}
            actorServant={actorServant}
            servants={servants}
            kids={kids}
            services={services}
            codedTeams={codedTeams}
            attendancePolicy={attendancePolicy}
            gateCheckins={gateCheckins}
            offlineQueueCount={offlineQueueCount}
            onSyncOfflineQueue={onSyncOfflineQueue}
            onRecordGateCheckin={onRecordGateCheckin}
            isLight={isLight}
          />
        )}

        {effectiveTab === 'stations' && canUseGateOrStations && (
          <StationPointsLedger
            editionId={edition.id}
            actorServant={actorServant}
            isAdmin={isAdmin}
            codedTeams={codedTeams}
            activityRounds={activityRounds}
            attendancePolicy={attendancePolicy}
            kids={kids}
            servants={servants}
            gateCheckins={gateCheckins}
            pointsLedger={pointsLedger}
            onAddPointsEntry={onAddPointsEntry}
            isLight={isLight}
          />
        )}

        {effectiveTab === 'teams' && canManageTeams && (
          <TeamAssignmentBoard
            edition={edition}
            services={services}
            kids={kids}
            codedTeams={codedTeams}
            gateCheckins={gateCheckins}
            includeSensitivePii={isAdmin}
            onReassignKidTeam={onReassignKidTeam}
            isLight={isLight}
          />
        )}

        {effectiveTab === 'alerts' && (
          <EmergencyAlertsPanel
            editionId={edition.id}
            actor={actorServant}
            canManageAlerts={isOperationalStaff}
            canViewParentPhone={canViewParentPhone}
            alerts={emergencyAlerts}
            kids={kids}
            codedTeams={codedTeams}
            onCreateAlert={onCreateAlert}
            onUpdateAlertStatus={onUpdateAlertStatus}
            isLight={isLight}
          />
        )}
      </div>
    </div>
  );
};
