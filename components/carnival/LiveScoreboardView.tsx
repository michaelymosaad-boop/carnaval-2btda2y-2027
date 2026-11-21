'use client';

import React, { useMemo } from 'react';
import {
  Trophy,
  Medal,
  Award,
  Sparkles,
  Users,
  ShieldCheck,
  History,
  ArrowUpRight,
  Snowflake,
  FileSpreadsheet,
} from 'lucide-react';
import {
  computeTeamScoreboard,
  type CodedTeamItem,
  type GateCheckinRecord,
  type KidParticipant,
  type PointsLedgerEntry,
  type TeamScoreSummary,
} from '@/lib/carnival-store';

interface LiveScoreboardViewProps {
  codedTeams: CodedTeamItem[];
  pointsLedger: PointsLedgerEntry[];
  kids: KidParticipant[];
  gateCheckins: GateCheckinRecord[];
  highlightTeamName?: string;
  isFrozen?: boolean;
  isLight: boolean;
  compact?: boolean;
  onExportExcel?: () => void;
}

const SOURCE_LABELS: Record<PointsLedgerEntry['source'], string> = {
  gate: 'حضور البوابة',
  early_bonus: 'بونص مبكر',
  round: 'جولة / محطة',
  team_spirit: 'روح الفريق',
  correction: 'قيد تصحيحي',
};

export const LiveScoreboardView: React.FC<LiveScoreboardViewProps> = ({
  codedTeams,
  pointsLedger,
  kids,
  gateCheckins,
  highlightTeamName,
  isFrozen = false,
  isLight,
  compact = false,
  onExportExcel,
}) => {
  const scoreboard: TeamScoreSummary[] = useMemo(
    () => computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins),
    [codedTeams, pointsLedger, kids, gateCheckins]
  );

  const recentEntries = useMemo(
    () => [...pointsLedger].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 6),
    [pointsLedger]
  );

  const leader = scoreboard[0];
  const totalAwardedPoints = useMemo(
    () => pointsLedger.reduce((acc, item) => acc + item.points, 0),
    [pointsLedger]
  );

  return (
    <div className="space-y-4">
      {isFrozen && (
        <div
          className={`rounded-2xl p-3 border text-xs font-extrabold flex items-center gap-2 ${
            isLight
              ? 'bg-sky-50 border-sky-200 text-sky-900'
              : 'bg-sky-950/40 border-sky-500/40 text-sky-200'
          }`}
        >
          <Snowflake className="w-4 h-4 shrink-0 text-sky-500" />
          <span>النتائج مجمّدة حالياً من إدارة الكرنفال تمهيداً لإعلان الترتيب النهائي.</span>
        </div>
      )}

      {/* ملخص سريع للصدارة والإجمالي */}
      {leader && (
        <div
          className={`rounded-2xl p-4 border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            isLight
              ? 'bg-gradient-to-l from-amber-50 via-[#FFFDF7] to-orange-50/70 border-amber-300 text-slate-900'
              : 'bg-gradient-to-l from-[#1E1912] via-[#131B2E] to-[#101729] border-amber-500/40 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center shrink-0 shadow-sm">
              <Trophy className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold text-amber-700 dark:text-amber-400">
                المتصدر حالياً (المركز الأول)
              </div>
              <h3 className="text-sm sm:text-base font-black truncate">{leader.team_name}</h3>
              <div className="text-[11px] opacity-75 truncate">
                حضور المخدومين: {leader.checked_in_kids_count} من {leader.kids_count}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-4 pt-2 sm:pt-0 border-t sm:border-t-0 border-amber-500/20 shrink-0">
            <div className="text-right sm:text-left">
              <div className="text-[11px] opacity-75 font-bold">إجمالي نقاط الفريق</div>
              <div className="text-2xl font-black text-orange-600 dark:text-amber-400 tabular-nums">
                {isFrozen ? '•••' : leader.total_points}
              </div>
            </div>
            <div
              className={`px-3 py-2 rounded-xl border text-center ${
                isLight ? 'bg-white border-amber-200' : 'bg-[#0B101E] border-slate-700'
              }`}
            >
              <div className="text-[10px] opacity-75 font-bold">حركات السجل</div>
              <div className="text-sm font-black tabular-nums">{pointsLedger.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* ترتيب الفرق مع تفصيل مصادر النقاط */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs font-extrabold opacity-90">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>ترتيب الفرق المباشر ({scoreboard.length} فرق)</span>
          </span>
          <div className="flex items-center gap-2">
            <span className="tabular-nums">
              مجموع نقاط السجل: {isFrozen ? 'مجمّد' : totalAwardedPoints}
            </span>
            {!compact && onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="min-h-[34px] px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap shadow-2xs"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير Excel</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5">
          {scoreboard.map((team) => {
            const isHighlighted =
              !!highlightTeamName && team.team_name.trim() === highlightTeamName.trim();
            const RankIcon = team.rank === 1 ? Trophy : team.rank === 2 ? Medal : Award;
            const rankBadgeStyle =
              team.rank === 1
                ? 'bg-amber-500 text-amber-950'
                : team.rank === 2
                ? isLight
                  ? 'bg-slate-200 text-slate-800'
                  : 'bg-slate-700 text-slate-100'
                : team.rank === 3
                ? 'bg-orange-700 text-white'
                : isLight
                ? 'bg-slate-100 text-slate-700'
                : 'bg-slate-800 text-slate-300';

            return (
              <div
                key={team.team_id}
                className={`rounded-2xl p-3.5 sm:p-4 border transition-colors space-y-2.5 ${
                  isHighlighted
                    ? isLight
                      ? 'bg-orange-50/90 border-orange-400 shadow-sm'
                      : 'bg-orange-950/30 border-orange-500/60'
                    : isLight
                    ? 'bg-white border-slate-200'
                    : 'bg-[#0F1627] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 tabular-nums ${rankBadgeStyle}`}
                    >
                      {team.rank <= 3 ? <RankIcon className="w-5 h-5" /> : team.rank}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-black truncate">{team.team_name}</span>
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: team.accent_hex }}
                          aria-hidden="true"
                        />
                        {isHighlighted && (
                          <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-orange-600 text-white whitespace-nowrap">
                            فريقك
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] opacity-75 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          <span className="tabular-nums">
                            {team.checked_in_kids_count}/{team.kids_count} مخدوم حضر
                          </span>
                        </span>
                        <span className="truncate">{team.last_activity_label}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-left shrink-0">
                    <div className="text-xl sm:text-2xl font-black text-orange-600 dark:text-amber-400 tabular-nums">
                      {isFrozen ? '•••' : team.total_points}
                    </div>
                    <div className="text-[10px] font-bold opacity-70">نقطة</div>
                  </div>
                </div>

                {!compact && !isFrozen && (
                  <div
                    className={`pt-2 border-t flex flex-wrap items-center gap-2 text-[11px] font-bold ${
                      isLight ? 'border-slate-100 text-slate-600' : 'border-slate-800 text-slate-300'
                    }`}
                  >
                    <span className="tabular-nums">بوابة: {team.gate_points}</span>
                    <span>·</span>
                    <span className="tabular-nums">مبكر: {team.early_bonus_points}</span>
                    <span>·</span>
                    <span className="tabular-nums">جولات: {team.round_points}</span>
                    <span>·</span>
                    <span className="tabular-nums">روح الفريق: {team.spirit_points}</span>
                    {team.correction_points !== 0 && (
                      <>
                        <span>·</span>
                        <span
                          className={`tabular-nums ${
                            team.correction_points < 0 ? 'text-rose-500' : 'text-emerald-500'
                          }`}
                        >
                          تصحيح: {team.correction_points > 0 ? `+${team.correction_points}` : team.correction_points}
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* آخر قيود النقاط المسجلة لحظياً */}
      {!compact && !isFrozen && recentEntries.length > 0 && (
        <div
          className={`rounded-2xl p-4 border space-y-2.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-extrabold">
            <span className="flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-500" />
              <span>أحدث حركات سجل النقاط (Append-Only)</span>
            </span>
            <span className="flex items-center gap-1 text-[11px] opacity-70">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>سجل محمي غير قابل للتعديل</span>
            </span>
          </div>

          <div className="space-y-1.5">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#12192B] border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-extrabold truncate flex items-center gap-1.5">
                    <ArrowUpRight className="w-3.5 h-3.5 text-orange-500 shrink-0" />
                    <span className="truncate">{entry.team_name}</span>
                  </div>
                  <div className="text-[11px] opacity-75 truncate">
                    {SOURCE_LABELS[entry.source]} · {entry.round_title || entry.reason} (بواسطة{' '}
                    {entry.recorded_by_name})
                  </div>
                </div>
                <span
                  dir="ltr"
                  className={`px-2.5 py-1 rounded-lg text-xs font-black tabular-nums shrink-0 ${
                    entry.points >= 0
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  {entry.points >= 0 ? `+${entry.points}` : entry.points}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
