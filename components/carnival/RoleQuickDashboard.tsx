'use client';

import React, { useMemo } from 'react';
import {
  Users,
  UserCheck,
  Trophy,
  QrCode,
  Siren,
  CalendarClock,
  LayoutDashboard,
  Award,
} from 'lucide-react';
import {
  computeTeamScoreboard,
  type CarnivalActivityRound,
  type CodedTeamItem,
  type EmergencyAlertRecord,
  type GateCheckinRecord,
  type KidParticipant,
  type PointsLedgerEntry,
  type Servant,
} from '@/lib/carnival-store';

export type QuickDashboardRole = 'admin' | 'staff' | 'team_lead' | 'kid';

interface RoleQuickDashboardProps {
  roleCategory: QuickDashboardRole;
  roleLabel: string;
  userName: string;
  serviceName?: string;
  myTeamName?: string;
  kids: KidParticipant[];
  servants: Servant[];
  codedTeams: CodedTeamItem[];
  pointsLedger: PointsLedgerEntry[];
  gateCheckins: GateCheckinRecord[];
  emergencyAlerts: EmergencyAlertRecord[];
  activityRounds: CarnivalActivityRound[];
  isLight: boolean;
}

interface StatMetric {
  id: string;
  label: string;
  value: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentClass: string;
}

export const RoleQuickDashboard: React.FC<RoleQuickDashboardProps> = ({
  roleCategory,
  roleLabel,
  userName,
  serviceName,
  myTeamName,
  kids,
  servants,
  codedTeams,
  pointsLedger,
  gateCheckins,
  emergencyAlerts,
  activityRounds,
  isLight,
}) => {
  const scoreboard = useMemo(
    () => computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins),
    [codedTeams, pointsLedger, kids, gateCheckins]
  );

  const activeAlertsCount = useMemo(
    () => emergencyAlerts.filter((a) => a.status !== 'resolved').length,
    [emergencyAlerts]
  );

  const topTeam = scoreboard[0];
  const myTeam = useMemo(() => {
    if (!myTeamName) return scoreboard[0];
    return scoreboard.find((t) => t.team_name === myTeamName) || scoreboard[0];
  }, [scoreboard, myTeamName]);

  const maxPoints = useMemo(() => {
    const highest = scoreboard.reduce((acc, item) => Math.max(acc, item.total_points), 0);
    return highest > 0 ? highest : 1;
  }, [scoreboard]);

  const metrics: StatMetric[] = useMemo(() => {
    if (roleCategory === 'admin') {
      const checkedInKids = gateCheckins.filter((g) => g.subject_type === 'kid').length;
      return [
        {
          id: 'kids',
          label: 'المخدومون المسجلون',
          value: String(kids.length),
          sublabel: `حضر البوابة: ${checkedInKids}`,
          icon: Users,
          accentClass: 'text-orange-600 dark:text-amber-400',
        },
        {
          id: 'servants',
          label: 'الخدام المسجلون',
          value: String(servants.length),
          sublabel: `${codedTeams.length} فرق مفعّلة`,
          icon: UserCheck,
          accentClass: 'text-blue-600 dark:text-sky-400',
        },
        {
          id: 'leader',
          label: 'أعلى نقاط فريق',
          value: String(topTeam?.total_points ?? 0),
          sublabel: topTeam ? topTeam.team_name : 'بانتظار النقاط',
          icon: Trophy,
          accentClass: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'alerts',
          label: 'بلاغات وتنبيهات نشطة',
          value: String(activeAlertsCount),
          sublabel: activeAlertsCount > 0 ? 'تتطلب متابعة فورية' : 'لا توجد طوارئ مفتوحة',
          icon: Siren,
          accentClass:
            activeAlertsCount > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-600 dark:text-slate-400',
        },
      ];
    }

    if (roleCategory === 'staff') {
      return [
        {
          id: 'kids',
          label: 'المخدومون المسجلون',
          value: String(kids.length),
          sublabel: `${codedTeams.length} فرق بالكرنفال`,
          icon: Users,
          accentClass: 'text-orange-600 dark:text-amber-400',
        },
        {
          id: 'gate',
          label: 'حضور البوابة اليوم',
          value: String(gateCheckins.length),
          sublabel: 'مسح QR وكود',
          icon: QrCode,
          accentClass: 'text-blue-600 dark:text-sky-400',
        },
        {
          id: 'leader',
          label: 'نقاط المتصدر حالياً',
          value: String(topTeam?.total_points ?? 0),
          sublabel: topTeam ? topTeam.team_name : 'بانتظار الرصد',
          icon: Trophy,
          accentClass: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'alerts',
          label: 'تنبيهات وطوارئ نشطة',
          value: String(activeAlertsCount),
          sublabel: `${activityRounds.length} جولات بالجدول`,
          icon: Siren,
          accentClass:
            activeAlertsCount > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-600 dark:text-slate-400',
        },
      ];
    }

    if (roleCategory === 'team_lead') {
      return [
        {
          id: 'my-points',
          label: 'نقاط فريقك الحالية',
          value: String(myTeam?.total_points ?? 0),
          sublabel: myTeam ? myTeam.team_name : 'لم يُحدد فريق بعد',
          icon: Trophy,
          accentClass: 'text-orange-600 dark:text-amber-400',
        },
        {
          id: 'rank',
          label: 'ترتيب الفريق',
          value: myTeam ? `#${myTeam.rank}` : '—',
          sublabel: `من أصل ${scoreboard.length} فرق`,
          icon: Award,
          accentClass: 'text-blue-600 dark:text-sky-400',
        },
        {
          id: 'team-kids',
          label: 'مخدومو الفريق',
          value: String(myTeam?.kids_count ?? 0),
          sublabel: `حاضرون بالبوابة: ${myTeam?.checked_in_kids_count ?? 0}`,
          icon: Users,
          accentClass: 'text-emerald-600 dark:text-emerald-400',
        },
        {
          id: 'alerts',
          label: 'تنبيهات لمسؤولي الفرق',
          value: String(activeAlertsCount),
          sublabel: activeAlertsCount > 0 ? 'راجع التنبيهات بالأعلى' : 'الجدول مستقر حالياً',
          icon: Siren,
          accentClass:
            activeAlertsCount > 0
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-slate-600 dark:text-slate-400',
        },
      ];
    }

    // kid
    return [
      {
        id: 'kid-points',
        label: 'نقاط فرقتك الآن',
        value: String(myTeam?.total_points ?? 0),
        sublabel: myTeam ? myTeam.team_name : 'فرقة الكرنفال',
        icon: Trophy,
        accentClass: 'text-orange-600 dark:text-amber-400',
      },
      {
        id: 'kid-rank',
        label: 'الترتيب الحالي',
        value: myTeam ? `#${myTeam.rank}` : '—',
        sublabel: `بين ${scoreboard.length} فرق`,
        icon: Award,
        accentClass: 'text-blue-600 dark:text-sky-400',
      },
      {
        id: 'kid-members',
        label: 'أعضاء فرقتك',
        value: String(myTeam?.kids_count ?? 0),
        sublabel: 'مشارك مسجل',
        icon: Users,
        accentClass: 'text-emerald-600 dark:text-emerald-400',
      },
      {
        id: 'kid-rounds',
        label: 'فقرات اليوم',
        value: String(activityRounds.length),
        sublabel: activityRounds[0]?.title || 'جدول الكرنفال',
        icon: CalendarClock,
        accentClass: 'text-slate-600 dark:text-slate-300',
      },
    ];
  }, [
    roleCategory,
    kids.length,
    servants.length,
    codedTeams.length,
    gateCheckins,
    topTeam,
    myTeam,
    scoreboard.length,
    activeAlertsCount,
    activityRounds,
  ]);

  return (
    <section
      aria-label="لوحة المؤشرات السريعة"
      className={`rounded-2xl border p-4 space-y-4 transition-colors ${
        isLight
          ? 'bg-white border-slate-200 text-slate-900'
          : 'bg-[#12192B] border-slate-800 text-slate-100'
      }`}
    >
      {/* ترويسة اللوحة حسب الدور */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 min-w-0">
          <LayoutDashboard className="w-4 h-4 text-orange-500 shrink-0" />
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-black truncate">
              لوحة المتابعة السريعة · {roleLabel}
            </h3>
            <p className="text-[11px] opacity-70 truncate">
              {userName}
              {serviceName ? ` · ${serviceName}` : ''}
            </p>
          </div>
        </div>
        <span className="text-[11px] font-bold opacity-70 shrink-0 tabular-nums">
          {scoreboard.length} فرق
        </span>
      </div>

      {/* شبكة المؤشرات الأربعة (2x2 على الموبايل و 4 أعمدة على الشاشات الأكبر) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {metrics.map((metric) => {
          const IconComp = metric.icon;
          return (
            <div
              key={metric.id}
              className={`rounded-xl p-3 border space-y-1.5 ${
                isLight
                  ? 'bg-slate-50/70 border-slate-200/90'
                  : 'bg-[#0C1222] border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-[11px] font-bold opacity-75 truncate">{metric.label}</span>
                <IconComp className={`w-3.5 h-3.5 shrink-0 ${metric.accentClass}`} />
              </div>
              <div className={`text-xl sm:text-2xl font-black leading-none tabular-nums ${metric.accentClass}`}>
                {metric.value}
              </div>
              <div className="text-[10px] font-semibold opacity-75 truncate">{metric.sublabel}</div>
            </div>
          );
        })}
      </div>

      {/* شريط مختصر لنقاط الفرق الحالية */}
      {scoreboard.length > 0 && (
        <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-extrabold opacity-80">
            <span>نقاط الفرق الحالية</span>
            <span>الترتيب المباشر</span>
          </div>

          <div className="space-y-1.5">
            {scoreboard.slice(0, 4).map((team) => {
              const isHighlighted =
                (roleCategory === 'team_lead' || roleCategory === 'kid') &&
                myTeam?.team_id === team.team_id;
              const widthPct =
                team.total_points > 0
                  ? Math.max(8, Math.round((team.total_points / maxPoints) * 100))
                  : 0;

              return (
                <div key={team.team_id} className="space-y-1">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-black opacity-65 tabular-nums w-5 shrink-0">
                        #{team.rank}
                      </span>
                      <span
                        className={`truncate font-bold ${
                          isHighlighted ? 'text-orange-600 dark:text-amber-400 font-black' : ''
                        }`}
                      >
                        {team.team_name}
                        {isHighlighted ? ' (فريقك)' : ''}
                      </span>
                    </div>
                    <span className="font-black text-xs tabular-nums shrink-0">
                      {team.total_points} نقطة
                    </span>
                  </div>
                  <div
                    className={`h-1.5 w-full rounded-full overflow-hidden ${
                      isLight ? 'bg-slate-200/80' : 'bg-slate-800'
                    }`}
                  >
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${widthPct}%`,
                        backgroundColor: team.accent_hex,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
