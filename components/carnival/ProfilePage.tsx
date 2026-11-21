'use client';

import React, { useMemo } from 'react';
import {
  User,
  LogOut,
  ArrowRight,
  Sparkles,
  Phone,
  Shield,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  QrCode,
  ScanLine,
  Users,
  Trophy,
  Clock,
  Inbox,
} from 'lucide-react';
import {
  ROLE_METADATA,
  type Servant,
  type ServantRole,
  type Edition,
  type PointsLedgerEntry,
  type GateCheckinRecord,
  type KidParticipant,
  type CodedTeamItem,
} from '@/lib/carnival-store';
import { computeRealProfilePoints } from '@/lib/profile-points';

interface ProfilePageProps {
  servant: Servant;
  serviceName?: string;
  roles?: string[];
  edition?: Edition;
  pointsLedger?: PointsLedgerEntry[];
  gateCheckins?: GateCheckinRecord[];
  kids?: KidParticipant[];
  codedTeams?: CodedTeamItem[];
  isLight: boolean;
  onClose: () => void;
  onLogout: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  servant,
  serviceName,
  roles = [],
  edition,
  pointsLedger = [],
  gateCheckins = [],
  kids = [],
  codedTeams = [],
  isLight,
  onClose,
  onLogout,
}) => {
  const summary = useMemo(
    () =>
      computeRealProfilePoints({
        servant,
        pointsLedger,
        gateCheckins,
        kids,
        codedTeams,
      }),
    [servant, pointsLedger, gateCheckins, kids, codedTeams]
  );

  const arabicRoles = summary.isKid
    ? [summary.matchedKid?.team_name ? `فريق ${summary.matchedKid.team_name}` : 'مخدوم مشارك']
    : roles.length === 0
    ? [servant.primary_role === 'staff' ? 'خادم فريق عمل' : 'خادم فريق']
    : roles.map((r) => ROLE_METADATA[r as ServantRole]?.label || r);

  const pointsStatusBadge =
    summary.totalPoints >= 80
      ? 'أداء متميز'
      : summary.totalPoints > 0
      ? 'رصيد نشط'
      : 'بانتظار البداية';

  return (
    <div
      dir="rtl"
      className="w-full max-w-xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-300"
    >
      {/* شريط العنوان وأزرار التنقل */}
      <div
        className={`flex items-center justify-between p-3.5 rounded-2xl border transition-colors ${
          isLight
            ? 'bg-white/95 border-amber-200/90 shadow-sm text-slate-900'
            : 'bg-[#12192B]/95 border-slate-800 shadow-md text-slate-100'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
              isLight
                ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-slate-700'
                : 'border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title="العودة"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold flex items-center gap-1.5">
              <span>{summary.isKid ? 'الملف الشخصي للمخدوم' : 'الملف الشخصي للخادم'}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold">
                نشط
              </span>
            </h1>
            <p className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {edition?.name || 'كرنفال الأطفال ٢٠٢٧'} · {edition?.church_name || 'كنيسة السيدة العذراء مريم'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-orange-500/15 hover:bg-orange-500/25 text-orange-600 dark:text-amber-400 text-xs font-extrabold cursor-pointer transition-colors"
        >
          العودة للمنظومة
        </button>
      </div>

      {/* كارت هوية وبيانات المستخدم الأساسية */}
      <div
        className={`rounded-3xl p-5 border-2 transition-all space-y-4 shadow-xl ${
          isLight
            ? 'bg-gradient-to-br from-white via-amber-50/40 to-white border-amber-200 shadow-amber-900/5'
            : 'bg-gradient-to-br from-[#12192B] via-[#0E1528] to-[#12192B] border-slate-800 shadow-black/40'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
          {/* الصورة الشخصية */}
          <div className="relative shrink-0">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl border-3 border-emerald-500 overflow-hidden bg-slate-100 dark:bg-slate-800 shadow-lg flex items-center justify-center">
              {servant.avatar_url ? (
                <img
                  src={servant.avatar_url}
                  alt={servant.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
              )}
            </div>
            <div className="absolute -bottom-1 -left-1 px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-extrabold shadow-sm">
              {summary.isKid ? 'مخدوم مشارك' : 'خادم معتمد'}
            </div>
          </div>

          {/* البيانات الأساسية */}
          <div className="min-w-0 flex-1 space-y-1.5">
            <h2 className="text-base sm:text-lg font-black tracking-tight">{servant.full_name}</h2>
            <div className="text-xs font-bold text-orange-600 dark:text-amber-400 flex items-center justify-center sm:justify-start gap-1.5">
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>
                {serviceName || 'خدمة الكرنفال الميدانية'}
                {summary.matchedKid?.grade_label ? ` · ${summary.matchedKid.grade_label}` : ''}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-sky-300 font-extrabold flex items-center gap-1">
                <Shield className="w-3.5 h-3.5" />
                <span>{arabicRoles.join(' · ')}</span>
              </span>

              {summary.gateCheckin ? (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] font-extrabold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    حضر بالبوابة {summary.gateCheckin.checked_in_local_time}
                    {summary.gateCheckin.is_early_arrival ? ' (مبكر)' : ''}
                  </span>
                </span>
              ) : (
                <span
                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1 ${
                    isLight
                      ? 'bg-slate-100 border-slate-200 text-slate-600'
                      : 'bg-slate-800/70 border-slate-700 text-slate-300'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>لم يُسجَّل حضور البوابة بعد</span>
                </span>
              )}

              {!summary.isKid && servant.national_id_last4 && (
                <span className="px-2.5 py-1 rounded-xl bg-slate-500/10 border border-slate-500/20 font-mono text-[11px] font-bold">
                  الرقم القومي: ***{servant.national_id_last4}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* تفاصيل الاتصال والكود الميداني */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-500/15 text-xs">
          <div
            className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#17213A] border-slate-800'
            }`}
          >
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {summary.isKid ? 'هاتف ولي الأمر:' : 'رقم الهاتف المسجل:'}
              </span>
              <span dir="ltr" className="font-mono font-black text-xs">
                {servant.phone || 'غير مسجل'}
              </span>
            </div>
          </div>

          <div
            className={`p-2.5 rounded-2xl border flex items-center gap-2 ${
              isLight ? 'bg-white border-slate-200' : 'bg-[#17213A] border-slate-800'
            }`}
          >
            <QrCode className="w-4 h-4 text-orange-500 shrink-0" />
            <div className="min-w-0 flex-1">
              <span className={`text-[10px] font-bold block ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                كود البطاقة والـ QR:
              </span>
              <span dir="ltr" className="font-mono font-black text-xs text-orange-600 dark:text-amber-300 truncate block">
                {servant.qr_token || 'غير متوفر'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ملخص النشاط الميداني للخدام (إحصائيات حقيقية من السجل) */}
      {!summary.isKid && (
        <div
          className={`rounded-3xl p-4 border shadow-md space-y-2.5 ${
            isLight
              ? 'bg-white border-sky-200/90 text-slate-900'
              : 'bg-[#12192B]/95 border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
              <ScanLine className="w-4 h-4 text-sky-500" />
              <span>ملخص نشاطك الميداني الفعلي</span>
            </h3>
            <span className={`text-[10px] font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              محدث لحظياً
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div
              className={`p-2.5 rounded-2xl border ${
                isLight ? 'bg-sky-50/80 border-sky-200' : 'bg-sky-950/30 border-sky-500/30'
              }`}
            >
              <ScanLine className="w-4 h-4 text-sky-500 mx-auto mb-1" />
              <div className="text-base font-black font-mono">{summary.servantStats.gateScansRecorded}</div>
              <div className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                مسح بوابة
              </div>
            </div>
            <div
              className={`p-2.5 rounded-2xl border ${
                isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-amber-950/30 border-amber-500/30'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500 mx-auto mb-1" />
              <div className="text-base font-black font-mono">{summary.servantStats.pointsEntriesRecorded}</div>
              <div className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                رصد نقاط
              </div>
            </div>
            <div
              className={`p-2.5 rounded-2xl border ${
                isLight ? 'bg-emerald-50/80 border-emerald-200' : 'bg-emerald-950/30 border-emerald-500/30'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <div className="text-base font-black font-mono">{summary.servantStats.kidsInServiceCount}</div>
              <div className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                مخدوم بالخدمة
              </div>
            </div>
          </div>
        </div>
      )}

      {/* كارت رصيد النقاط الإجمالي والتفصيلي (حقيقي 100%) */}
      <div
        className={`rounded-3xl p-5 border-2 space-y-4 shadow-xl transition-all ${
          isLight
            ? 'bg-white border-emerald-200/90 shadow-emerald-900/5'
            : 'bg-[#12192B]/95 border-slate-800 shadow-black/40'
        }`}
      >
        {/* ملخص إجمالي النقاط الكبير */}
        <div className="p-4 rounded-2xl bg-gradient-to-l from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-lg shadow-emerald-600/20 flex items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold opacity-90">
              <Award className="w-4 h-4 text-amber-300" />
              <span>إجمالي رصيد النقاط الفعلي:</span>
            </div>
            <div className="text-3xl font-black font-mono tracking-tight flex items-baseline gap-1.5">
              <span>{summary.totalPoints}</span>
              <span className="text-sm font-extrabold opacity-90">نقطة</span>
            </div>
            {summary.teamName && summary.teamRank !== null && (
              <div className="text-[11px] font-bold text-emerald-100">
                فريق {summary.teamName} · المركز #{summary.teamRank} ({summary.teamTotalPoints ?? 0} نقطة للفريق)
              </div>
            )}
          </div>

          <div className="text-center px-3.5 py-2 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/25 shrink-0">
            <Sparkles className="w-6 h-6 text-amber-300 mx-auto" />
            <span className="text-[11px] font-extrabold block mt-0.5">{pointsStatusBadge}</span>
          </div>
        </div>

        {/* تفاصيل النقاط لكل مشاركة وفاعلية */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-500/15">
            <h3 className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-orange-500" />
              <span>سجل النقاط الفعلي لكل مشاركة:</span>
            </h3>
            <span className={`text-[11px] font-black ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {summary.breakdown.length} حركة
            </span>
          </div>

          {summary.breakdown.length === 0 ? (
            <div
              className={`p-5 rounded-2xl border border-dashed text-center space-y-2 ${
                isLight
                  ? 'bg-slate-50/90 border-slate-300 text-slate-600'
                  : 'bg-[#17213A]/60 border-slate-700 text-slate-300'
              }`}
            >
              <Inbox className="w-7 h-7 mx-auto text-slate-400" />
              <div className="text-xs font-extrabold">لم تُسجَّل نقاط حتى الآن</div>
              <p className="text-[11px] leading-relaxed opacity-80">
                سيظهر هنا سجل النقاط الفعلي تلقائياً فور تسجيل حضور البوابة والمشاركة في فعاليات وجولات يوم الكرنفال.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.breakdown.map((item, index) => {
                const isNegative = item.points < 0;
                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isLight
                        ? 'bg-slate-50/80 border-slate-200/90 hover:border-emerald-300 hover:bg-emerald-50/30'
                        : 'bg-[#17213A] border-slate-800 hover:border-emerald-500/40 hover:bg-[#1C2846]'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${
                          isNegative
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <span className="text-xs font-bold">{index + 1}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black leading-snug">{item.title}</div>
                        <div
                          className={`flex flex-wrap items-center gap-1.5 mt-1 text-[10px] font-bold ${
                            isLight ? 'text-slate-600' : 'text-slate-400'
                          }`}
                        >
                          <span className="px-1.5 py-0.5 rounded-md bg-slate-500/10 font-bold">
                            {item.category}
                          </span>
                          {item.scopeLabel && (
                            <span className="px-1.5 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-amber-300 font-bold">
                              {item.scopeLabel}
                            </span>
                          )}
                          {item.time && <span dir="ltr">{item.time}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <span
                        className={`px-2.5 py-1 rounded-xl border font-mono font-black text-xs sm:text-sm block whitespace-nowrap ${
                          isNegative
                            ? 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                            : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.points >= 0 ? `+${item.points}` : item.points} نقطة
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-end gap-0.5 mt-0.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>معتمد</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* زر تسجيل الخروج في الأسفل تماماً */}
      <div className="pt-2 pb-4">
        <button
          type="button"
          onClick={onLogout}
          className="w-full min-h-[48px] rounded-2xl bg-gradient-to-l from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-extrabold text-sm shadow-lg shadow-rose-600/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج والعودة للشاشة الرئيسية</span>
        </button>
      </div>
    </div>
  );
};
