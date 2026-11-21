'use client';

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Maximize2,
  Minimize2,
  Snowflake,
  PartyPopper,
  Radio,
  Flame,
  Shield,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  computeTeamScoreboard,
  INITIAL_CODED_TEAMS,
  type Edition,
  type AxisItem,
  type CodedTeamItem,
  type PointsLedgerEntry,
  type KidParticipant,
  type GateCheckinRecord,
} from '@/lib/carnival-store';

interface CarnivalLiveDisplayViewProps {
  edition: Edition;
  axes: AxisItem[];
  codedTeams?: CodedTeamItem[];
  pointsLedger?: PointsLedgerEntry[];
  kids?: KidParticipant[];
  gateCheckins?: GateCheckinRecord[];
  isLight: boolean;
  onOpenSettingsModal?: () => void;
}

export const CarnivalLiveDisplayView: React.FC<CarnivalLiveDisplayViewProps> = ({
  edition,
  axes,
  codedTeams = INITIAL_CODED_TEAMS,
  pointsLedger = [],
  kids = [],
  gateCheckins = [],
  isLight,
  onOpenSettingsModal,
}) => {
  const teams = React.useMemo(() => {
    const computed = computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins);
    return computed.map((item) => ({
      id: item.team_id,
      name: item.team_name,
      service_name: `${item.color_label} · حضور ${item.checked_in_kids_count}/${item.kids_count}`,
      color: item.accent_hex,
      score: item.gate_points + item.round_points,
      bonus: item.early_bonus_points + item.spirit_points + item.correction_points,
      total: item.total_points,
      last_activity: item.last_activity_label,
      rank: item.rank,
    }));
  }, [codedTeams, pointsLedger, kids, gateCheckins]);

  const [isFrozen, setIsFrozen] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('الآن');

  // محاكاة Polling كل 10 ثواني طبقاً للـ Blueprint
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setLastRefreshed(
        now.toLocaleTimeString('ar-EG', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // مؤقت إنهاء الاحتفال
  useEffect(() => {
    if (showCelebration) {
      const t = setTimeout(() => setShowCelebration(false), 7000);
      return () => clearTimeout(t);
    }
  }, [showCelebration]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const topTeam = teams[0];

  return (
    <div
      className={`rounded-3xl border-2 transition-all overflow-hidden relative ${
        isLight
          ? 'bg-gradient-to-b from-[#FFFDF8] via-[#FFF9EE] to-[#F1F6FF] border-amber-200 text-slate-900 shadow-xl'
          : 'bg-gradient-to-b from-[#0B101E] via-[#0E1528] to-[#080C17] border-slate-800 text-slate-100 shadow-2xl'
      } ${isFullscreen ? 'p-6 sm:p-10 min-h-screen' : 'p-4 sm:p-6'}`}
    >
      {/* شاشة احتفال البطل (Champion Celebration Animation) */}
      {showCelebration && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in zoom-in-95 duration-300">
          <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center text-amber-950 shadow-2xl shadow-yellow-500/50 animate-bounce mb-4">
            <Trophy className="w-14 h-14 sm:w-20 sm:h-20" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-amber-300 text-xs sm:text-sm font-extrabold mb-2">
            <Sparkles className="w-4 h-4" />
            <span>بطل كرنفال {edition.name}</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-wide mb-2">
            {topTeam.name}
          </h2>
          <p className="text-amber-300 text-lg sm:text-2xl font-black mb-4">
            {topTeam.score + topTeam.bonus} نقطة
          </p>
          <p className="text-xs sm:text-sm text-slate-300 max-w-md">
            مبروك لجميع مخدومي وخدام {topTeam.name} على الأداء المتميز والروح الكرنفالية الرائعة!
          </p>
          <button
            type="button"
            onClick={() => setShowCelebration(false)}
            className="mt-6 px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm cursor-pointer shadow-lg"
          >
            إغلاق شاشة الاحتفال
          </button>
        </div>
      )}

      {/* الشريط العلوي لشاشة العرض الحية والتحكم */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-500/15">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 shrink-0">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-black">
                شاشة العرض الحية (Live Display · Kiosk)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                مباشر
              </span>
            </div>
            <p className="text-[11px] opacity-75">
              تُعرض على الشاشات الكبيرة والبروجكتور (بيانات عامة وتحديث تلقائي كل ١٠ ثوانٍ)
            </p>
          </div>
        </div>

        {/* أزرار تحكم الأدمن في العرض */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setIsFrozen((prev) => !prev)}
            className={`min-h-[34px] px-3 rounded-xl border text-xs font-black flex items-center gap-1.5 transition-all cursor-pointer ${
              isFrozen
                ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                : isLight
                ? 'bg-white hover:bg-blue-50 text-blue-700 border-blue-300'
                : 'bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border-blue-500/40'
            }`}
            title="تجميد النتائج قبل إعلان الفائز النهائي"
          >
            <Snowflake className={`w-3.5 h-3.5 ${isFrozen ? 'animate-spin' : ''}`} />
            <span>{isFrozen ? 'النتائج مجمّدة' : 'تجميد النتائج'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowCelebration(true)}
            className="min-h-[34px] px-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-black flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform active:scale-95"
            title="تشغيل شاشة الاحتفال بالبطل"
          >
            <PartyPopper className="w-3.5 h-3.5" />
            <span>احتفال البطل</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className={`min-h-[34px] px-2.5 rounded-xl border text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
            }`}
            title="وضع ملء الشاشة (Kiosk)"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* تنبيه التجميد إذا كان نشطاً */}
      {isFrozen && (
        <div className="mt-3 py-1.5 px-3 rounded-xl bg-blue-500/15 border border-blue-500/40 text-blue-700 dark:text-blue-300 text-xs font-black flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Snowflake className="w-4 h-4 shrink-0" />
            <span>تم تجميد عرض النتائج على الشاشة — النقاط مخفية لمنع حرق النتيجة النهائية!</span>
          </div>
          <span className="text-[10px] opacity-80">تحكم الأدمن</span>
        </div>
      )}

      {/* هيدر الكرنفال التفاعلي للشاشة الحية */}
      <div className="mt-4 text-center space-y-1.5">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 text-xs font-black">
          <Flame className="w-3.5 h-3.5" />
          <span>سباق النقاط والمحطات المباشر</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          {edition.name} · {edition.church_name}
        </h2>
        <div className="flex items-center justify-center gap-3 text-xs opacity-75 font-bold">
          <span>{edition.service_title}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-blue-500" />
            آخر تحديث: {lastRefreshed}
          </span>
        </div>
      </div>

      {/* بطاقة بطل الصدارة حالياً */}
      {topTeam && (
      <div
        className={`mt-4 rounded-2xl p-4 sm:p-5 border-2 transition-all flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isLight
            ? 'bg-gradient-to-r from-amber-100/90 via-orange-50 to-amber-50 border-amber-300 shadow-md'
            : 'bg-gradient-to-r from-[#21180D] via-[#1A1822] to-[#12192B] border-amber-500/40'
        }`}
      >
        <div className="flex items-center gap-3.5 text-center sm:text-right">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-500 text-amber-950 flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
            <Trophy className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs font-extrabold text-amber-700 dark:text-amber-400">
              <Trophy className="w-3.5 h-3.5" />
              <span>المركز الأول حتى الآن</span>
            </div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
              {topTeam.name}
            </h3>
            <p className="text-xs opacity-75 font-bold">{topTeam.service_name}</p>
          </div>
        </div>

        <div className="text-center sm:text-left shrink-0">
          <div className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-amber-400 tabular-nums">
            {isFrozen ? '•••' : topTeam.total}
          </div>
          <div className="text-[11px] font-bold opacity-75 tabular-nums">
            {isFrozen ? 'النتيجة مجمدة' : `بوابة ومحطات: ${topTeam.score} · بونص وروح: ${topTeam.bonus}`}
          </div>
        </div>
      </div>
      )}

      {/* قائمة ترتيب الفرق الميدانية */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between px-2 text-xs font-extrabold opacity-75">
          <span>الترتيب والفريق</span>
          <span>مجموع النقاط</span>
        </div>

        {teams.map((team, idx) => (
          <div
            key={team.id}
            className={`rounded-2xl p-3 sm:p-4 border transition-all flex items-center justify-between gap-3 ${
              idx === 0
                ? isLight
                  ? 'bg-amber-50/90 border-amber-300 font-black'
                  : 'bg-[#1C160B] border-amber-500/50'
                : isLight
                ? 'bg-white border-slate-200 hover:border-amber-300'
                : 'bg-[#101728] border-slate-800 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                  idx === 0
                    ? 'bg-amber-500 text-amber-950 shadow-sm'
                    : idx === 1
                    ? 'bg-slate-300 text-slate-800'
                    : idx === 2
                    ? 'bg-amber-700 text-white'
                    : 'bg-slate-500/20 opacity-75'
                }`}
              >
                {idx + 1}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-black truncate">{team.name}</span>
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: team.color }}
                  />
                </div>
                <div className="text-[11px] opacity-70 truncate">{team.service_name}</div>
              </div>
            </div>

            <div className="text-left shrink-0">
              <div
                dir="ltr"
                className="font-[family-name:var(--font-mono)] text-sm sm:text-base font-black text-orange-600 dark:text-amber-400 tabular-nums"
              >
                {isFrozen ? '•••' : team.total}
              </div>
              <div className="text-[10px] opacity-70 tabular-nums">
                {isFrozen ? 'مجمّد' : `${team.bonus >= 0 ? `+${team.bonus}` : team.bonus} بونص`}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* شريط المحاور الأربعة للكرنفال في أسفل الشاشة الحية */}
      {axes.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-500/15 flex flex-wrap items-center justify-center gap-2">
          {axes.map((ax) => (
            <div
              key={ax.id}
              className={`px-2.5 py-1 rounded-xl border text-[11px] font-black flex items-center gap-1.5 ${
                isLight ? 'bg-white border-amber-200' : 'bg-[#101728] border-slate-800'
              }`}
              style={{ color: ax.color }}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: ax.color }} />
              <span>{ax.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* زر إعدادات الكرنفال السريع المخصص للأدمن */}
      {onOpenSettingsModal && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={onOpenSettingsModal}
            className="text-xs font-extrabold text-blue-600 dark:text-sky-400 underline hover:opacity-80 cursor-pointer"
          >
            تعديل بيانات الكرنفال والشعار في إعدادات الأدمن
          </button>
        </div>
      )}
    </div>
  );
};
