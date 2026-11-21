'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  Users,
  UserCheck,
  Clock,
  UserX,
  FileSpreadsheet,
  Layers,
  GraduationCap,
  Flag,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import {
  computeTeamScoreboard,
  type CodedGradeItem,
  type CodedTeamItem,
  type Edition,
  type GateCheckinRecord,
  type KidParticipant,
  type PointsLedgerEntry,
  type Servant,
  type ServiceItem,
} from '@/lib/carnival-store';
import { exportAttendanceAnalyticsWorkbook } from '@/lib/excel-export';

interface AttendanceAnalyticsPanelProps {
  edition: Edition;
  services: ServiceItem[];
  servants: Servant[];
  kids: KidParticipant[];
  codedGrades: CodedGradeItem[];
  codedTeams: CodedTeamItem[];
  gateCheckins: GateCheckinRecord[];
  pointsLedger: PointsLedgerEntry[];
  isLight: boolean;
}

type BreakdownTab = 'service' | 'grade' | 'team' | 'servants';

function pct(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 100);
}

export const AttendanceAnalyticsPanel: React.FC<AttendanceAnalyticsPanelProps> = ({
  edition,
  services,
  servants,
  kids,
  codedGrades,
  codedTeams,
  gateCheckins,
  pointsLedger,
  isLight,
}) => {
  const [activeTab, setActiveTab] = useState<BreakdownTab>('service');
  const [selectedServiceFilter, setSelectedServiceFilter] = useState<string>('all');

  const analytics = useMemo(() => {
    const kidCheckinMap = new Map<string, GateCheckinRecord>();
    const servantCheckinMap = new Map<string, GateCheckinRecord>();

    for (const record of gateCheckins) {
      if (record.subject_type === 'kid') {
        kidCheckinMap.set(record.subject_id, record);
      } else {
        servantCheckinMap.set(record.subject_id, record);
      }
    }

    const filteredKids =
      selectedServiceFilter === 'all'
        ? kids
        : kids.filter((k) => k.service_id === selectedServiceFilter);

    const filteredServants =
      selectedServiceFilter === 'all'
        ? servants
        : servants.filter((s) => s.service_id === selectedServiceFilter);

    const totalKids = filteredKids.length;
    const checkedInKids = filteredKids.filter((k) => kidCheckinMap.has(k.id)).length;
    const earlyKids = filteredKids.filter((k) => kidCheckinMap.get(k.id)?.is_early_arrival).length;
    const absentKids = Math.max(0, totalKids - checkedInKids);

    const totalServants = filteredServants.length;
    const checkedInServants = filteredServants.filter((s) => servantCheckinMap.has(s.id)).length;
    const earlyServants = filteredServants.filter(
      (s) => servantCheckinMap.get(s.id)?.is_early_arrival
    ).length;

    // 1. تفصيل حسب الخدمة
    const byService = services.map((svc) => {
      const svcKids = kids.filter((k) => k.service_id === svc.id);
      const svcCheckedKids = svcKids.filter((k) => kidCheckinMap.has(k.id)).length;
      const svcEarlyKids = svcKids.filter((k) => kidCheckinMap.get(k.id)?.is_early_arrival).length;
      const svcServants = servants.filter((s) => s.service_id === svc.id);
      const svcCheckedServants = svcServants.filter((s) => servantCheckinMap.has(s.id)).length;
      return {
        id: svc.id,
        name: svc.name,
        stageGroup: svc.stage_group,
        totalKids: svcKids.length,
        checkedInKids: svcCheckedKids,
        absentKids: Math.max(0, svcKids.length - svcCheckedKids),
        earlyKids: svcEarlyKids,
        kidsRate: pct(svcCheckedKids, svcKids.length),
        totalServants: svcServants.length,
        checkedInServants: svcCheckedServants,
        servantsRate: pct(svcCheckedServants, svcServants.length),
      };
    });

    // 2. تفصيل حسب السنة الدراسية
    const gradeLabelsOrder = Array.from(
      new Set([
        ...codedGrades.map((g) => g.name),
        ...filteredKids.map((k) => k.grade_label || 'غير محدد'),
      ])
    );

    const byGrade = gradeLabelsOrder
      .map((label) => {
        const gradeKids = filteredKids.filter((k) => (k.grade_label || 'غير محدد') === label);
        const present = gradeKids.filter((k) => kidCheckinMap.has(k.id)).length;
        const early = gradeKids.filter((k) => kidCheckinMap.get(k.id)?.is_early_arrival).length;
        return {
          label,
          totalKids: gradeKids.length,
          checkedInKids: present,
          absentKids: Math.max(0, gradeKids.length - present),
          earlyKids: early,
          rate: pct(present, gradeKids.length),
        };
      })
      .filter((row) => row.totalKids > 0 || codedGrades.some((g) => g.name === row.label));

    // 3. تفصيل حسب الفريق
    const scoreboard = computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins);
    const byTeam = scoreboard.map((team) => {
      const teamKids = filteredKids.filter((k) => k.team_name === team.team_name);
      const present = teamKids.filter((k) => kidCheckinMap.has(k.id)).length;
      const early = teamKids.filter((k) => kidCheckinMap.get(k.id)?.is_early_arrival).length;
      return {
        team_id: team.team_id,
        team_name: team.team_name,
        team_code: team.team_code,
        accent_hex: team.accent_hex,
        rank: team.rank,
        total_points: team.total_points,
        totalKids: teamKids.length,
        checkedInKids: present,
        absentKids: Math.max(0, teamKids.length - present),
        earlyKids: early,
        rate: pct(present, teamKids.length),
      };
    });

    // 4. تفصيل حضور الخدام
    const absentServantsList = filteredServants.filter((s) => !servantCheckinMap.has(s.id));

    return {
      totalKids,
      checkedInKids,
      earlyKids,
      absentKids,
      kidsRate: pct(checkedInKids, totalKids),
      totalServants,
      checkedInServants,
      earlyServants,
      servantsRate: pct(checkedInServants, totalServants),
      totalEarlyAll: earlyKids + earlyServants,
      byService,
      byGrade,
      byTeam,
      absentServantsList,
    };
  }, [
    services,
    servants,
    kids,
    codedGrades,
    codedTeams,
    gateCheckins,
    pointsLedger,
    selectedServiceFilter,
  ]);

  const serviceNameMap = useMemo(
    () => new Map(services.map((s) => [s.id, s.name])),
    [services]
  );

  const cardSurface = isLight
    ? 'bg-white border-slate-200 text-slate-900'
    : 'bg-[#121B2E] border-slate-800 text-slate-100';

  const mutedText = isLight ? 'text-slate-600' : 'text-slate-400';

  return (
    <div dir="rtl" className="space-y-4">
      {/* شريط الفلتر السريع وزر التصدير */}
      <div
        className={`rounded-2xl p-3.5 border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 ${
          isLight
            ? 'bg-sky-50/70 border-sky-200 text-slate-900'
            : 'bg-[#0C1424] border-sky-500/30 text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Filter className="w-4 h-4 text-sky-500 shrink-0" />
          <select
            value={selectedServiceFilter}
            onChange={(e) => setSelectedServiceFilter(e.target.value)}
            aria-label="تصفية التقرير حسب الخدمة"
            className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
              isLight
                ? 'bg-white border-sky-200 text-slate-900'
                : 'bg-[#121B2E] border-slate-700 text-slate-100'
            }`}
          >
            <option value="all">جميع الخدمات ({services.length})</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() =>
            exportAttendanceAnalyticsWorkbook({
              edition,
              services,
              servants,
              kids,
              codedGrades,
              codedTeams,
              gateCheckins,
              pointsLedger,
            })
          }
          className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 shrink-0" />
          <span>تصدير التقرير المفصّل (Excel)</span>
        </button>
      </div>

      {/* مؤشرات الأداء العليا (KPIs) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className={`rounded-2xl p-3 border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={mutedText}>حضور المخدومين</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400">
              {analytics.checkedInKids}
            </span>
            <span className={`text-xs font-bold ${mutedText}`}>/ {analytics.totalKids}</span>
          </div>
          <div className="mt-1 text-[11px] font-extrabold text-emerald-600 dark:text-emerald-400">
            نسبة {analytics.kidsRate}%
          </div>
        </div>

        <div className={`rounded-2xl p-3 border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={mutedText}>حضور الخدام</span>
            <UserCheck className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span className="text-xl font-black font-mono text-sky-600 dark:text-sky-400">
              {analytics.checkedInServants}
            </span>
            <span className={`text-xs font-bold ${mutedText}`}>/ {analytics.totalServants}</span>
          </div>
          <div className="mt-1 text-[11px] font-extrabold text-sky-600 dark:text-sky-400">
            نسبة {analytics.servantsRate}%
          </div>
        </div>

        <div className={`rounded-2xl p-3 border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={mutedText}>حضور مبكر</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-1.5 text-xl font-black font-mono text-amber-600 dark:text-amber-400">
            {analytics.totalEarlyAll}
          </div>
          <div className={`mt-1 text-[10px] font-bold ${mutedText}`}>
            {analytics.earlyKids} مخدوم · {analytics.earlyServants} خادم
          </div>
        </div>

        <div className={`rounded-2xl p-3 border ${cardSurface}`}>
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className={mutedText}>لم يحضر بعد</span>
            <UserX className="w-4 h-4 text-rose-500" />
          </div>
          <div className="mt-1.5 text-xl font-black font-mono text-rose-600 dark:text-rose-400">
            {analytics.absentKids}
          </div>
          <div className={`mt-1 text-[10px] font-bold ${mutedText}`}>مخدوم بدون مسح بوابة</div>
        </div>
      </div>

      {/* تبويبات التفصيل */}
      <div
        className={`grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl border ${
          isLight ? 'bg-slate-100/90 border-slate-200' : 'bg-[#0C1222] border-slate-800'
        }`}
      >
        {(
          [
            { id: 'service', label: 'حسب الخدمة', icon: Layers },
            { id: 'grade', label: 'السنة الدراسية', icon: GraduationCap },
            { id: 'team', label: 'حسب الفريق', icon: Flag },
            { id: 'servants', label: 'حضور الخدام', icon: UserCheck },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-[38px] px-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                active
                  ? 'bg-gradient-to-l from-orange-600 to-amber-500 text-white shadow-xs'
                  : isLight
                  ? 'text-slate-700 hover:bg-white'
                  : 'text-slate-300 hover:bg-slate-800/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ١. التفصيل حسب الخدمة */}
      {activeTab === 'service' && (
        <div className="space-y-2.5">
          {analytics.byService.map((row) => (
            <div key={row.id} className={`rounded-2xl p-3.5 border space-y-2 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-extrabold truncate">{row.name}</div>
                  <div className={`text-[10px] font-bold ${mutedText}`}>
                    {row.stageGroup} · خدام حاضرون: {row.checkedInServants}/{row.totalServants} ({row.servantsRate}%)
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs shrink-0">
                  {row.kidsRate}%
                </span>
              </div>

              <div className="w-full h-2.5 rounded-full bg-slate-500/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-teal-500 transition-all duration-300"
                  style={{ width: `${row.kidsRate}%` }}
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-bold pt-0.5">
                <div className={`rounded-xl py-1.5 ${isLight ? 'bg-slate-50' : 'bg-[#0C1324]'}`}>
                  <div className="font-mono font-black">{row.totalKids}</div>
                  <div className={`text-[10px] ${mutedText}`}>مسجل</div>
                </div>
                <div className={`rounded-xl py-1.5 ${isLight ? 'bg-emerald-50' : 'bg-emerald-950/30'}`}>
                  <div className="font-mono font-black text-emerald-600 dark:text-emerald-400">
                    {row.checkedInKids}
                  </div>
                  <div className={`text-[10px] ${mutedText}`}>حضر</div>
                </div>
                <div className={`rounded-xl py-1.5 ${isLight ? 'bg-amber-50' : 'bg-amber-950/30'}`}>
                  <div className="font-mono font-black text-amber-600 dark:text-amber-400">
                    {row.earlyKids}
                  </div>
                  <div className={`text-[10px] ${mutedText}`}>مبكر</div>
                </div>
                <div className={`rounded-xl py-1.5 ${isLight ? 'bg-rose-50' : 'bg-rose-950/30'}`}>
                  <div className="font-mono font-black text-rose-600 dark:text-rose-400">
                    {row.absentKids}
                  </div>
                  <div className={`text-[10px] ${mutedText}`}>متغيب</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ٢. التفصيل حسب السنة الدراسية */}
      {activeTab === 'grade' && (
        <div className="space-y-2">
          {analytics.byGrade.length === 0 ? (
            <div className={`p-6 rounded-2xl border border-dashed text-center text-xs font-bold ${mutedText}`}>
              لا توجد سنوات دراسية مسجلة بعد.
            </div>
          ) : (
            analytics.byGrade.map((row) => (
              <div key={row.label} className={`rounded-2xl p-3.5 border space-y-2 ${cardSurface}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <GraduationCap className="w-4 h-4 text-indigo-500 shrink-0" />
                    <span className="text-xs sm:text-sm font-extrabold truncate">{row.label}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[11px] font-mono font-bold ${mutedText}`}>
                      {row.checkedInKids} / {row.totalKids}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-mono font-black text-xs">
                      {row.rate}%
                    </span>
                  </div>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-500/15 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-l from-indigo-500 to-violet-500 transition-all"
                    style={{ width: `${row.rate}%` }}
                  />
                </div>
                <div className={`flex items-center justify-between text-[10px] font-bold ${mutedText}`}>
                  <span>حضور مبكر: {row.earlyKids}</span>
                  <span>متغيبون: {row.absentKids}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ٣. التفصيل حسب الفريق */}
      {activeTab === 'team' && (
        <div className="space-y-2">
          {analytics.byTeam.map((team) => (
            <div key={team.team_id} className={`rounded-2xl p-3.5 border space-y-2 ${cardSurface}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: team.accent_hex }}
                  />
                  <span className="text-xs sm:text-sm font-extrabold truncate">
                    #{team.rank} {team.team_name}
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${mutedText}`}>
                    ({team.total_points} نقطة)
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-mono font-black text-xs shrink-0">
                  {team.checkedInKids}/{team.totalKids} ({team.rate}%)
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-500/15 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${team.rate}%`, backgroundColor: team.accent_hex }}
                />
              </div>
              <div className={`flex items-center justify-between text-[10px] font-bold ${mutedText}`}>
                <span>حضور مبكر: {team.earlyKids}</span>
                <span>متغيبون: {team.absentKids}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ٤. حضور الخدام بالبوابة */}
      {activeTab === 'servants' && (
        <div className="space-y-3">
          <div className={`rounded-2xl p-3.5 border space-y-2 ${cardSurface}`}>
            <div className="flex items-center justify-between">
              <div className="text-xs font-extrabold flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-sky-500" />
                <span>نسبة حضور الخدام بكل خدمة</span>
              </div>
              <span className="text-xs font-mono font-black text-sky-600 dark:text-sky-400">
                {analytics.checkedInServants} / {analytics.totalServants}
              </span>
            </div>
            <div className="space-y-2 pt-1">
              {analytics.byService.map((svc) => (
                <div key={svc.id} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold">
                    <span className="truncate">{svc.name}</span>
                    <span className="font-mono shrink-0">
                      {svc.checkedInServants}/{svc.totalServants} ({svc.servantsRate}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-500/15 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-sky-500"
                      style={{ width: `${svc.servantsRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-2xl p-3.5 border space-y-2 ${cardSurface}`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold">
                خدام لم يسجلوا حضور البوابة بعد ({analytics.absentServantsList.length})
              </span>
            </div>
            {analytics.absentServantsList.length === 0 ? (
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>جميع الخدام المسجلين حضروا بالبوابة!</span>
              </div>
            ) : (
              <div className="max-h-52 overflow-y-auto space-y-1.5">
                {analytics.absentServantsList.slice(0, 40).map((s) => (
                  <div
                    key={s.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                      isLight
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-[#0C1324] border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-extrabold truncate">{s.full_name}</div>
                      <div className={`text-[10px] truncate ${mutedText}`}>
                        {serviceNameMap.get(s.service_id) || 'خدمة الكرنفال'}
                      </div>
                    </div>
                    <span dir="ltr" className="text-[11px] font-mono font-bold opacity-80 shrink-0">
                      {s.phone || '-'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
