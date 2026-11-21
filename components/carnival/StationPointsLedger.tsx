'use client';

import React, { useMemo, useState } from 'react';
import {
  Award,
  Sparkles,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Filter,
  Lock,
  Plus,
} from 'lucide-react';
import {
  createRecordId,
  decodeCarnivalQrPayload,
  getIsoNow,
  type AttendanceAndPointsPolicy,
  type CarnivalActivityRound,
  type CodedTeamItem,
  type GateCheckinRecord,
  type KidParticipant,
  type PointsLedgerEntry,
  type PointsLedgerSource,
  type Servant,
} from '@/lib/carnival-store';

interface StationPointsLedgerProps {
  editionId: string;
  actorServant: Servant;
  isAdmin: boolean;
  codedTeams: CodedTeamItem[];
  activityRounds: CarnivalActivityRound[];
  attendancePolicy: AttendanceAndPointsPolicy;
  kids: KidParticipant[];
  servants: Servant[];
  gateCheckins: GateCheckinRecord[];
  pointsLedger: PointsLedgerEntry[];
  onAddPointsEntry: (entry: PointsLedgerEntry) => Promise<void>;
  isLight: boolean;
}

const SOURCE_BADGE: Record<
  PointsLedgerSource,
  { label: string; badgeClass: string }
> = {
  gate: {
    label: 'حضور البوابة',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
  early_bonus: {
    label: 'بونص مبكر',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  round: {
    label: 'جولة / محطة',
    badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-sky-300 border-blue-500/30',
  },
  team_spirit: {
    label: 'روح الفريق',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
  },
  correction: {
    label: 'قيد تصحيحي',
    badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30',
  },
};

export const StationPointsLedger: React.FC<StationPointsLedgerProps> = ({
  editionId,
  actorServant,
  isAdmin,
  codedTeams,
  activityRounds,
  attendancePolicy,
  kids,
  servants,
  gateCheckins,
  pointsLedger,
  onAddPointsEntry,
  isLight,
}) => {
  const [entryMode, setEntryMode] = useState<'round' | 'team_spirit' | 'correction'>('round');
  const [selectedTeamId, setSelectedTeamId] = useState<string>(codedTeams[0]?.id || '');
  const [selectedRoundId, setSelectedRoundId] = useState<string>(activityRounds[0]?.id || '');
  const [targetSearch, setTargetSearch] = useState('');
  const [selectedTarget, setSelectedTarget] = useState<{
    type: 'team' | 'kid' | 'servant';
    id?: string;
    name?: string;
  }>({ type: 'team' });

  const [pointsValue, setPointsValue] = useState<string>('25');
  const [reason, setReason] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [filterTeamId, setFilterTeamId] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  const activeTeam =
    codedTeams.find((t) => t.id === selectedTeamId) || codedTeams[0];
  const activeRound =
    activityRounds.find((r) => r.id === selectedRoundId) || activityRounds[0];

  const checkedInKeys = useMemo(
    () => new Set(gateCheckins.map((c) => `${c.subject_type}_${c.subject_id}`)),
    [gateCheckins]
  );

  // بحث اختياري عن طفل أو خادم بالـ QR / PIN / الاسم لإسناد النقاط باسمه مع فريقه
  const matchedPersonSuggestions = useMemo(() => {
    const raw = targetSearch.trim();
    if (!raw) return [];
    const decoded = decodeCarnivalQrPayload(raw);
    const q = (decoded?.code || raw).toLowerCase();

    const matches: Array<{
      type: 'kid' | 'servant';
      id: string;
      name: string;
      teamName?: string;
      checkedIn: boolean;
    }> = [];

    for (const k of kids) {
      if (
        k.full_name.toLowerCase().includes(q) ||
        k.pin_code.toLowerCase().includes(q) ||
        k.qr_token.toLowerCase().includes(q)
      ) {
        matches.push({
          type: 'kid',
          id: k.id,
          name: k.full_name,
          teamName: k.team_name,
          checkedIn: checkedInKeys.has(`kid_${k.id}`),
        });
      }
    }
    for (const s of servants) {
      if (
        s.full_name.toLowerCase().includes(q) ||
        (s.pin_code && s.pin_code.toLowerCase().includes(q)) ||
        s.qr_token.toLowerCase().includes(q)
      ) {
        matches.push({
          type: 'servant',
          id: s.id,
          name: s.full_name,
          checkedIn: checkedInKeys.has(`servant_${s.id}`),
        });
      }
    }
    return matches.slice(0, 6);
  }, [targetSearch, kids, servants, checkedInKeys]);

  const maxAllowed =
    entryMode === 'round'
      ? activeRound?.max_points || 100
      : entryMode === 'team_spirit'
      ? attendancePolicy.team_spirit_max_points || 50
      : 1000;

  const filteredLedger = useMemo(() => {
    return [...pointsLedger]
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .filter((item) => {
        if (filterTeamId !== 'all' && item.team_id !== filterTeamId) return false;
        if (filterSource !== 'all' && item.source !== filterSource) return false;
        return true;
      });
  }, [pointsLedger, filterTeamId, filterSource]);

  const handleSubmitPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!activeTeam) {
      setFeedback({ type: 'error', text: 'يرجى تحديد الفريق أولاً.' });
      return;
    }

    const numericPoints = Number(pointsValue);
    if (Number.isNaN(numericPoints) || numericPoints === 0) {
      setFeedback({ type: 'error', text: 'يرجى إدخال عدد نقاط صحيح غير صفري.' });
      return;
    }

    if (entryMode !== 'correction') {
      if (numericPoints < 0 || numericPoints > maxAllowed) {
        setFeedback({
          type: 'error',
          text: `النقاط يجب أن تكون بين 1 و ${maxAllowed} حسب إعدادات الجولة والسياسة.`,
        });
        return;
      }
    } else {
      if (!isAdmin) {
        setFeedback({
          type: 'error',
          text: 'القيد التصحيحي مخصص لأدمن الكرنفال فقط.',
        });
        return;
      }
      if (numericPoints < -1000 || numericPoints > 1000) {
        setFeedback({
          type: 'error',
          text: 'القيد التصحيحي يجب أن يكون بين -1000 و +1000 نقطة.',
        });
        return;
      }
      if (reason.trim().length < 5) {
        setFeedback({
          type: 'error',
          text: 'يجب كتابة سبب واضح للقيد التصحيحي (٥ أحرف على الأقل) لحفظ سجل المراجعة.',
        });
        return;
      }
    }

    // التحقق من سياسة حضور البوابة قبل الفعاليات للفرد المحدد
    if (
      entryMode === 'round' &&
      attendancePolicy.require_gate_before_activities &&
      activeRound?.requires_gate_checkin &&
      selectedTarget.type !== 'team' &&
      selectedTarget.id
    ) {
      const hasGate = checkedInKeys.has(`${selectedTarget.type}_${selectedTarget.id}`);
      if (!hasGate) {
        setFeedback({
          type: 'error',
          text: `سياسة الكرنفال تتطلب تسجيل حضور البوابة لـ (${selectedTarget.name}) أولاً قبل منحه نقاط هذه الفعالية.`,
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const entry: PointsLedgerEntry = {
        id: createRecordId('pts'),
        edition_id: editionId,
        team_id: activeTeam.id,
        team_name: activeTeam.name,
        round_id: entryMode === 'round' ? activeRound?.id : undefined,
        round_title:
          entryMode === 'round'
            ? activeRound?.title
            : entryMode === 'team_spirit'
            ? 'نقاط روح الفريق والتعاون'
            : 'قيد تصحيحي إداري',
        axis_name: entryMode === 'round' ? activeRound?.axis_name : undefined,
        target_type: selectedTarget.type,
        target_id: selectedTarget.id,
        target_name: selectedTarget.name,
        source: entryMode,
        points: numericPoints,
        reason:
          reason.trim() ||
          (entryMode === 'round'
            ? `إنجاز محطة ${activeRound?.title || ''}${
                selectedTarget.name ? ` · ${selectedTarget.name}` : ''
              }`
            : 'تقدير روح الفريق والانضباط'),
        recorded_by_servant_id: actorServant.id,
        recorded_by_name: actorServant.full_name,
        created_at: getIsoNow(),
      };

      await onAddPointsEntry(entry);
      setReason('');
      setTargetSearch('');
      setSelectedTarget({ type: 'team' });
      setFeedback({
        type: 'success',
        text: `تم قيد ${numericPoints > 0 ? `+${numericPoints}` : numericPoints} نقطة لصالح (${activeTeam.name}) في السجل التراكمي بنجاح.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'تعذر حفظ القيد حالياً — تحقق من الاتصال أو الصلاحيات.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* شريط نوع القيد */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => {
            setEntryMode('round');
            setPointsValue(String(Math.min(25, activeRound?.max_points || 25)));
          }}
          className={`min-h-[44px] px-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            entryMode === 'round'
              ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
              : isLight
              ? 'bg-white text-slate-700 border-slate-200'
              : 'bg-[#0D1323] text-slate-300 border-slate-800'
          }`}
        >
          <Award className="w-4 h-4 shrink-0" />
          <span>نقاط محطة / جولة</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setEntryMode('team_spirit');
            setPointsValue(String(Math.min(15, attendancePolicy.team_spirit_max_points || 15)));
          }}
          className={`min-h-[44px] px-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
            entryMode === 'team_spirit'
              ? 'bg-purple-600 text-white border-purple-500 shadow-sm'
              : isLight
              ? 'bg-white text-slate-700 border-slate-200'
              : 'bg-[#0D1323] text-slate-300 border-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>روح الفريق</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => {
              setEntryMode('correction');
              setPointsValue('-10');
            }}
            className={`min-h-[44px] px-3 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap col-span-2 sm:col-span-1 ${
              entryMode === 'correction'
                ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                : isLight
                ? 'bg-white text-rose-700 border-rose-200'
                : 'bg-[#0D1323] text-rose-300 border-slate-800'
            }`}
          >
            <Scale className="w-4 h-4 shrink-0" />
            <span>قيد تصحيحي (أدمن)</span>
          </button>
        )}
      </div>

      {/* نموذج رصد قيد نقاط جديد */}
      <form
        onSubmit={handleSubmitPoints}
        className={`rounded-2xl p-4 border space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0D1323] border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-extrabold flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>قيد نقاط جديد (Append-Only — لا يمكن تعديل أو مسح القيود السابقة)</span>
          </span>
          {entryMode !== 'correction' && (
            <span className="font-bold opacity-75 tabular-nums">الحد الأقصى: {maxAllowed} نقطة</span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-extrabold block">الفريق المستفيد</label>
            <select
              value={activeTeam?.id || ''}
              onChange={(e) => setSelectedTeamId(e.target.value)}
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-extrabold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            >
              {codedTeams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name} ({tm.color_label})
                </option>
              ))}
            </select>
          </div>

          {entryMode === 'round' && (
            <div className="space-y-1">
              <label className="text-xs font-extrabold block">المحطة / الجولة</label>
              <select
                value={activeRound?.id || ''}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-extrabold ${
                  isLight
                    ? 'bg-slate-50 border-slate-300 text-slate-900'
                    : 'bg-[#090D18] border-slate-700 text-white'
                }`}
              >
                {activityRounds.map((rnd) => (
                  <option key={rnd.id} value={rnd.id}>
                    {rnd.round_number}. {rnd.title} (حد {rnd.max_points} ن)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-extrabold block">
              {entryMode === 'correction' ? 'النقاط التصحيحية (+ أو -)' : 'عدد النقاط الممنوحة'}
            </label>
            <input
              type="number"
              required
              min={entryMode === 'correction' ? -1000 : 1}
              max={entryMode === 'correction' ? 1000 : maxAllowed}
              value={pointsValue}
              onChange={(e) => setPointsValue(e.target.value)}
              className={`w-full min-h-[44px] px-3 rounded-xl border text-sm font-mono font-black ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-extrabold block">
              ربط بمخدوم أو خادم بالـ QR/PIN (اختياري)
            </label>
            <input
              type="text"
              value={targetSearch}
              onChange={(e) => {
                setTargetSearch(e.target.value);
                if (!e.target.value.trim()) setSelectedTarget({ type: 'team' });
              }}
              placeholder="اكتب الاسم أو الكود أو اتركه للفريق كاملاً..."
              className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>
        </div>

        {matchedPersonSuggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {matchedPersonSuggestions.map((item) => (
              <button
                key={`${item.type}-${item.id}`}
                type="button"
                onClick={() => {
                  setSelectedTarget({ type: item.type, id: item.id, name: item.name });
                  setTargetSearch(item.name);
                  if (item.teamName) {
                    const foundTm = codedTeams.find((t) => t.name === item.teamName);
                    if (foundTm) setSelectedTeamId(foundTm.id);
                  }
                }}
                className={`min-h-[38px] px-3 rounded-xl border text-xs font-extrabold flex items-center gap-1.5 cursor-pointer ${
                  selectedTarget.id === item.id
                    ? 'bg-orange-600 text-white border-orange-500'
                    : isLight
                    ? 'bg-slate-50 text-slate-800 border-slate-200'
                    : 'bg-[#141D33] text-slate-200 border-slate-700'
                }`}
              >
                <span>{item.name}</span>
                {!item.checkedIn && attendancePolicy.require_gate_before_activities && (
                  <Lock className="w-3 h-3 text-rose-500" />
                )}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-extrabold block">
            {entryMode === 'correction' ? 'سبب التصحيح (إلزامي)' : 'ملاحظة أو تفاصيل الأداء (اختياري)'}
          </label>
          <input
            type="text"
            required={entryMode === 'correction'}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={
              entryMode === 'correction'
                ? 'مثال: تصحيح رصد مكرر في جولة الألعاب الحركية'
                : 'مثال: تعاون ممتاز وإنهاء التحدي في الوقت المحدد'
            }
            className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-bold ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-[#090D18] border-slate-700 text-white'
            }`}
          />
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
          disabled={isSaving}
          className="w-full min-h-[48px] rounded-2xl bg-gradient-to-l from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-sm font-black flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-60"
        >
          <Plus className="w-4 h-4" />
          <span>{isSaving ? 'جاري الحفظ...' : 'اعتماد وقيد النقاط في السجل'}</span>
        </button>
      </form>

      {/* سجل القيود الكامل مع التصفية */}
      <div
        className={`rounded-2xl p-4 border space-y-3 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-extrabold flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-orange-500" />
            <span>سجل حركات النقاط ({filteredLedger.length})</span>
          </span>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterTeamId}
              onChange={(e) => setFilterTeamId(e.target.value)}
              className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#12192B] border-slate-700 text-white'
              }`}
            >
              <option value="all">كل الفرق</option>
              {codedTeams.map((tm) => (
                <option key={tm.id} value={tm.id}>
                  {tm.name}
                </option>
              ))}
            </select>

            <select
              value={filterSource}
              onChange={(e) => setFilterSource(e.target.value)}
              className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900'
                  : 'bg-[#12192B] border-slate-700 text-white'
              }`}
            >
              <option value="all">كل المصادر</option>
              <option value="gate">حضور البوابة</option>
              <option value="early_bonus">بونص مبكر</option>
              <option value="round">جولة / محطة</option>
              <option value="team_spirit">روح الفريق</option>
              <option value="correction">قيد تصحيحي</option>
            </select>
          </div>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto">
          {filteredLedger.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold opacity-65">
              لا توجد قيود نقاط مطابقة بعد — ابدأ برصد أول محطة أو حضور بوابة.
            </div>
          ) : (
            filteredLedger.map((entry) => {
              const badge = SOURCE_BADGE[entry.source];
              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                    isLight ? 'bg-white border-slate-200' : 'bg-[#12192B] border-slate-800'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-black truncate">{entry.team_name}</span>
                      <span
                        className={`px-2 py-0.5 rounded-lg border text-[10px] font-extrabold whitespace-nowrap ${badge.badgeClass}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <div className="text-[11px] opacity-80 truncate">{entry.reason}</div>
                    <div className="text-[10px] opacity-60">بواسطة: {entry.recorded_by_name}</div>
                  </div>
                  <span
                    dir="ltr"
                    className={`px-2.5 py-1 rounded-xl font-black text-sm tabular-nums shrink-0 ${
                      entry.points >= 0
                        ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    }`}
                  >
                    {entry.points >= 0 ? `+${entry.points}` : entry.points}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
