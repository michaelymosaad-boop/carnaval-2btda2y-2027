'use client';

import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import {
  Users,
  Search,
  Printer,
  Shuffle,
  CheckCircle2,
  QrCode,
  Sparkles,
  AlertTriangle,
  FileSpreadsheet,
} from 'lucide-react';
import { exportTeamsAndKidsWorkbook } from '@/lib/excel-export';
import {
  encodeCarnivalQrPayload,
  getTeamAccentHex,
  type CodedTeamItem,
  type Edition,
  type GateCheckinRecord,
  type KidParticipant,
  type ServiceItem,
} from '@/lib/carnival-store';

interface TeamAssignmentBoardProps {
  edition: Edition;
  services: ServiceItem[];
  kids: KidParticipant[];
  codedTeams: CodedTeamItem[];
  gateCheckins?: GateCheckinRecord[];
  includeSensitivePii?: boolean;
  onReassignKidTeam: (kidId: string, newTeamName: string) => Promise<void>;
  isLight: boolean;
}

export const TeamAssignmentBoard: React.FC<TeamAssignmentBoardProps> = ({
  edition,
  services,
  kids,
  codedTeams,
  gateCheckins = [],
  includeSensitivePii = false,
  onReassignKidTeam,
  isLight,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterServiceId, setFilterServiceId] = useState<string>('all');
  const [filterTeamName, setFilterTeamName] = useState<string>('all');
  const [showPrintableBadges, setShowPrintableBadges] = useState(false);
  const [badgeQrMap, setBadgeQrMap] = useState<Record<string, string>>({});
  const [updatingKidId, setUpdatingKidId] = useState<string | null>(null);
  const [isBalancing, setIsBalancing] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const validTeamNames = useMemo(
    () => new Set(codedTeams.map((t) => t.name)),
    [codedTeams]
  );

  const teamStats = useMemo(() => {
    return codedTeams.map((tm, idx) => ({
      ...tm,
      accent: getTeamAccentHex(tm.color_label, idx),
      count: kids.filter((k) => k.team_name === tm.name).length,
    }));
  }, [codedTeams, kids]);

  const unassignedKids = useMemo(
    () => kids.filter((k) => !k.team_name || !validTeamNames.has(k.team_name)),
    [kids, validTeamNames]
  );

  const filteredKids = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return kids.filter((kid) => {
      if (filterServiceId !== 'all' && kid.service_id !== filterServiceId) return false;
      if (filterTeamName === '__unassigned__') {
        if (kid.team_name && validTeamNames.has(kid.team_name)) return false;
      } else if (filterTeamName !== 'all' && kid.team_name !== filterTeamName) {
        return false;
      }
      if (!q) return true;
      return (
        kid.full_name.toLowerCase().includes(q) ||
        kid.pin_code.toLowerCase().includes(q) ||
        kid.team_name.toLowerCase().includes(q) ||
        kid.grade_label.toLowerCase().includes(q)
      );
    });
  }, [kids, filterServiceId, filterTeamName, searchQuery, validTeamNames]);

  // توليد صور QR حقيقية عند تفعيل عرض بادجات الطباعة
  useEffect(() => {
    if (!showPrintableBadges || filteredKids.length === 0) return;
    let cancelled = false;

    const generateAll = async () => {
      const nextMap: Record<string, string> = {};
      for (const kid of filteredKids.slice(0, 60)) {
        const srvName = services.find((s) => s.id === kid.service_id)?.name || '';
        const payload = encodeCarnivalQrPayload({
          type: 'kid',
          name: kid.full_name,
          code: kid.qr_token,
          pin: kid.pin_code,
          service: srvName,
        });
        try {
          nextMap[kid.id] = await QRCode.toDataURL(payload, {
            width: 180,
            margin: 1,
          });
        } catch {
          // ignore error
        }
      }
      if (!cancelled) {
        setBadgeQrMap(nextMap);
      }
    };

    generateAll();
    return () => {
      cancelled = true;
    };
  }, [showPrintableBadges, filteredKids, services]);

  const handleAutoBalanceUnassigned = async () => {
    if (codedTeams.length === 0 || unassignedKids.length === 0) return;
    setIsBalancing(true);
    setFeedback(null);
    try {
      const counts = new Map<string, number>();
      codedTeams.forEach((tm) => {
        counts.set(tm.name, kids.filter((k) => k.team_name === tm.name).length);
      });

      for (const kid of unassignedKids) {
        let minTeam = codedTeams[0].name;
        let minCount = counts.get(minTeam) ?? 0;
        for (const tm of codedTeams) {
          const c = counts.get(tm.name) ?? 0;
          if (c < minCount) {
            minCount = c;
            minTeam = tm.name;
          }
        }
        await onReassignKidTeam(kid.id, minTeam);
        counts.set(minTeam, minCount + 1);
      }

      setFeedback({
        type: 'success',
        text: `تم تسكين وتوزيع (${unassignedKids.length}) مخدومين بالتساوي على الفرق بنجاح.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'حدث خطأ أثناء التوزيع التلقائي — تحقق من الاتصال أو الصلاحيات.',
      });
    } finally {
      setIsBalancing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* إحصائيات توزيع الفرق */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 print:hidden">
        {teamStats.map((tm) => (
          <button
            key={tm.id}
            type="button"
            onClick={() =>
              setFilterTeamName((prev) => (prev === tm.name ? 'all' : tm.name))
            }
            className={`rounded-2xl p-3 border text-right transition-all cursor-pointer ${
              filterTeamName === tm.name
                ? 'border-orange-500 ring-2 ring-orange-500/20'
                : isLight
                ? 'bg-white border-slate-200'
                : 'bg-[#0D1323] border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: tm.accent }}
              />
              <span className="text-lg font-black tabular-nums">{tm.count}</span>
            </div>
            <div className="text-xs font-extrabold truncate mt-1">{tm.name}</div>
            <div className="text-[10px] opacity-70 truncate">{tm.color_label}</div>
          </button>
        ))}
      </div>

      {/* شريط التحكم والطباعة والتوزيع */}
      <div
        className={`rounded-2xl p-4 border space-y-3 print:hidden ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0D1323] border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
            <Users className="w-4 h-4 text-orange-500" />
            <span>تسكين الفرق النهائي وبادجات اليوم ({filteredKids.length})</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {unassignedKids.length > 0 && (
              <button
                type="button"
                disabled={isBalancing}
                onClick={handleAutoBalanceUnassigned}
                className="min-h-[44px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Shuffle className="w-4 h-4" />
                <span>توزيع متوازن لـ ({unassignedKids.length}) غير مسكنين</span>
              </button>
            )}

            <button
              type="button"
              onClick={() =>
                exportTeamsAndKidsWorkbook({
                  kids: filteredKids,
                  services,
                  gateCheckins,
                  includeSensitivePii,
                })
              }
              className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>تصدير Excel للفرق</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPrintableBadges((prev) => !prev)}
              className={`min-h-[44px] px-3.5 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                showPrintableBadges
                  ? 'bg-orange-600 text-white border-orange-500'
                  : isLight
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>{showPrintableBadges ? 'العودة لقائمة التسكين' : 'عرض بادجات الطباعة'}</span>
            </button>

            {showPrintableBadges && (
              <button
                type="button"
                onClick={() => window.print()}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>طباعة / حفظ PDF</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="relative">
            <Search className="w-4 h-4 opacity-50 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الكود..."
              className={`w-full min-h-[44px] pr-9 pl-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>

          <select
            value={filterServiceId}
            onChange={(e) => setFilterServiceId(e.target.value)}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-extrabold ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-[#090D18] border-slate-700 text-white'
            }`}
          >
            <option value="all">جميع المراحل والخدمات</option>
            {services.map((srv) => (
              <option key={srv.id} value={srv.id}>
                {srv.name}
              </option>
            ))}
          </select>

          <select
            value={filterTeamName}
            onChange={(e) => setFilterTeamName(e.target.value)}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-extrabold ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-[#090D18] border-slate-700 text-white'
            }`}
          >
            <option value="all">كل الفرق</option>
            <option value="__unassigned__">بدون فرقة / غير مسكن</option>
            {codedTeams.map((tm) => (
              <option key={tm.id} value={tm.name}>
                {tm.name}
              </option>
            ))}
          </select>
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
      </div>

      {/* إما قائمة التسكين السريع أو شبكة البادجات القابلة للطباعة */}
      {showPrintableBadges ? (
        <div className="space-y-3">
          <div className="text-xs font-bold opacity-75 print:hidden flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-orange-500" />
            <span>
              يتم عرض أول ٦٠ بطاقة مطابقة للتصفية الحالية جاهزة للطباعة أو الحفظ كـ PDF.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 print:grid-cols-2 print:gap-3">
            {filteredKids.slice(0, 60).map((kid) => {
              const matchedTeamIndex = codedTeams.findIndex((t) => t.name === kid.team_name);
              const matchedTeam = matchedTeamIndex >= 0 ? codedTeams[matchedTeamIndex] : null;
              const accent = getTeamAccentHex(
                matchedTeam?.color_label || '',
                Math.max(0, matchedTeamIndex)
              );
              const srvName =
                services.find((s) => s.id === kid.service_id)?.name || 'الكرنفال';
              const qrSrc = badgeQrMap[kid.id];

              return (
                <div
                  key={kid.id}
                  className="rounded-2xl border-2 p-3.5 bg-white text-slate-900 border-slate-300 break-inside-avoid space-y-2.5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200">
                    <div className="min-w-0">
                      <div className="text-[10px] font-extrabold text-slate-500 truncate">
                        {edition.church_name}
                      </div>
                      <div className="text-xs font-black text-orange-600 truncate">
                        {edition.name}
                      </div>
                    </div>
                    <span
                      className="px-2 py-0.5 rounded-lg text-[10px] font-black text-white whitespace-nowrap"
                      style={{ backgroundColor: accent }}
                    >
                      {matchedTeam?.code || 'TEAM'}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-20 h-20 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0 overflow-hidden">
                      {qrSrc ? (
                        <img
                          src={qrSrc}
                          alt={`QR ${kid.full_name}`}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <QrCode className="w-8 h-8 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="text-sm font-black text-slate-900 leading-snug">
                        {kid.full_name}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 truncate">
                        {srvName} · {kid.grade_label}
                      </div>
                      <div className="text-xs font-extrabold text-slate-800 truncate">
                        {kid.team_name}
                      </div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-300 font-mono text-xs font-black">
                        <span>PIN:</span>
                        <span>{kid.pin_code}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5">
          {filteredKids.length === 0 ? (
            <div className="py-8 text-center text-xs font-bold opacity-65">
              لا يوجد مخدومون مطابقون للتصفية الحالية.
            </div>
          ) : (
            filteredKids.map((kid) => {
              const srvName =
                services.find((s) => s.id === kid.service_id)?.name || 'غير محدد';
              const isBusy = updatingKidId === kid.id;

              return (
                <div
                  key={kid.id}
                  className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#0D1323] border-slate-800'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs sm:text-sm font-black truncate">
                        {kid.full_name}
                      </span>
                      <span className="font-mono text-[11px] opacity-75">
                        #{kid.pin_code}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-75 truncate">
                      {srvName} · {kid.grade_label}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      disabled={isBusy}
                      value={kid.team_name}
                      onChange={async (e) => {
                        const nextTeam = e.target.value;
                        if (nextTeam === kid.team_name) return;
                        setUpdatingKidId(kid.id);
                        setFeedback(null);
                        try {
                          await onReassignKidTeam(kid.id, nextTeam);
                          setFeedback({
                            type: 'success',
                            text: `تم نقل (${kid.full_name}) إلى (${nextTeam}) وحفظه.`,
                          });
                        } catch {
                          setFeedback({
                            type: 'error',
                            text: 'تعذر تحديث الفريق حالياً — تأكد من الاتصال والصلاحية.',
                          });
                        } finally {
                          setUpdatingKidId(null);
                        }
                      }}
                      className={`min-h-[44px] px-3 rounded-xl border text-xs font-extrabold cursor-pointer ${
                        isLight
                          ? 'bg-slate-50 border-slate-300 text-slate-900'
                          : 'bg-[#12192B] border-slate-700 text-white'
                      }`}
                    >
                      {!validTeamNames.has(kid.team_name) && (
                        <option value={kid.team_name}>{kid.team_name || 'بدون فرقة'}</option>
                      )}
                      {codedTeams.map((tm) => (
                        <option key={tm.id} value={tm.name}>
                          {tm.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
