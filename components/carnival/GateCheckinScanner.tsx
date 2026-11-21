'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  QrCode,
  ScanLine,
  Search,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertTriangle,
  Users,
  UserCheck,
  WifiOff,
  RefreshCw,
  Camera,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { exportGateAttendanceWorkbook } from '@/lib/excel-export';
import {
  createRecordId,
  decodeCarnivalQrPayload,
  getCurrentLocalHHMM,
  getIsoNow,
  isTimeBeforeOrEqualCutoff,
  type AttendanceAndPointsPolicy,
  type CodedTeamItem,
  type GateCheckinRecord,
  type KidParticipant,
  type PointsLedgerEntry,
  type Servant,
  type ServiceItem,
} from '@/lib/carnival-store';

interface GateCheckinScannerProps {
  editionId: string;
  actorServant: Servant;
  servants: Servant[];
  kids: KidParticipant[];
  services: ServiceItem[];
  codedTeams: CodedTeamItem[];
  attendancePolicy: AttendanceAndPointsPolicy;
  gateCheckins: GateCheckinRecord[];
  offlineQueueCount?: number;
  onSyncOfflineQueue?: () => Promise<void>;
  onRecordGateCheckin: (
    checkin: GateCheckinRecord,
    ledgerEntries: PointsLedgerEntry[]
  ) => Promise<{ queuedOffline: boolean }>;
  isLight: boolean;
}

type MatchedGateTarget =
  | { kind: 'kid'; record: KidParticipant }
  | { kind: 'servant'; record: Servant };

interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<Array<{ rawValue?: string }>>;
}

export const GateCheckinScanner: React.FC<GateCheckinScannerProps> = ({
  editionId,
  actorServant,
  servants,
  kids,
  services,
  codedTeams,
  attendancePolicy,
  gateCheckins,
  offlineQueueCount = 0,
  onSyncOfflineQueue,
  onRecordGateCheckin,
  isLight,
}) => {
  const [scanInput, setScanInput] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | 'kid' | 'servant'>('all');
  const [selectedTeamOverride, setSelectedTeamOverride] = useState(
    codedTeams[0]?.name || 'فريق أسود الكرنفال (المجموعة أ)'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncingQueue, setIsSyncingQueue] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  // مسح الكاميرا المباشر (يدعم Chrome/Android عبر BarcodeDetector إن توفر)
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const startCameraScan = async () => {
    setCameraError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraError('الكاميرا غير مدعومة في هذا المتصفح، استخدم البحث بالاسم أو الكود.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraOpen(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 100);

      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;

      if (!DetectorCtor) {
        setCameraError(
          'تم فتح الكاميرا للمعاينة، لكن هذا المتصفح لا يدعم القراءة التلقائية لـ QR. أدخل الكود أو الاسم يدوياً.'
        );
        return;
      }

      const detector = new DetectorCtor({ formats: ['qr_code'] });
      const timer = setInterval(async () => {
        if (!videoRef.current || !streamRef.current) {
          clearInterval(timer);
          return;
        }
        try {
          const barcodes = await detector.detect(videoRef.current);
          const raw = barcodes.find((b) => b.rawValue)?.rawValue;
          if (raw) {
            setScanInput(raw);
            stopCamera();
            clearInterval(timer);
          }
        } catch {
          // ignore transient frame errors
        }
      }, 450);
    } catch {
      setCameraError('تعذر فتح الكاميرا — تأكد من منح صلاحية الكاميرا للموقع.');
    }
  };

  const checkedInKeySet = useMemo(
    () => new Set(gateCheckins.map((c) => `${c.subject_type}_${c.subject_id}`)),
    [gateCheckins]
  );

  // البحث والمطابقة عبر JSON الـ QR أو qr_token أو pin_code أو الاسم
  const matchedCandidates = useMemo<MatchedGateTarget[]>(() => {
    const raw = scanInput.trim();
    const decoded = raw ? decodeCarnivalQrPayload(raw) : null;
    const query = (decoded?.code || raw).toLowerCase();

    const results: MatchedGateTarget[] = [];

    if (filterKind === 'all' || filterKind === 'kid') {
      for (const kid of kids) {
        if (!query) {
          results.push({ kind: 'kid', record: kid });
        } else {
          const hit =
            kid.qr_token.toLowerCase() === query ||
            kid.pin_code.toLowerCase() === query ||
            (decoded?.pin && kid.pin_code.toLowerCase() === decoded.pin.toLowerCase()) ||
            kid.full_name.toLowerCase().includes(query) ||
            kid.pin_code.toLowerCase().includes(query) ||
            kid.qr_token.toLowerCase().includes(query);
          if (hit) results.push({ kind: 'kid', record: kid });
        }
      }
    }

    if (filterKind === 'all' || filterKind === 'servant') {
      for (const srv of servants) {
        if (!query) {
          results.push({ kind: 'servant', record: srv });
        } else {
          const hit =
            srv.qr_token.toLowerCase() === query ||
            (srv.pin_code && srv.pin_code.toLowerCase() === query) ||
            (decoded?.pin && srv.pin_code && srv.pin_code.toLowerCase() === decoded.pin.toLowerCase()) ||
            srv.full_name.toLowerCase().includes(query) ||
            (srv.pin_code && srv.pin_code.toLowerCase().includes(query)) ||
            srv.qr_token.toLowerCase().includes(query);
          if (hit) results.push({ kind: 'servant', record: srv });
        }
      }
    }

    return results.slice(0, 15);
  }, [scanInput, filterKind, kids, servants]);

  const nowHHMM = getCurrentLocalHHMM();
  const isCurrentlyEarly = isTimeBeforeOrEqualCutoff(
    nowHHMM,
    attendancePolicy.early_arrival_cutoff_time || '09:30'
  );

  const kidsCheckedCount = useMemo(
    () => gateCheckins.filter((g) => g.subject_type === 'kid').length,
    [gateCheckins]
  );
  const servantsCheckedCount = useMemo(
    () => gateCheckins.filter((g) => g.subject_type === 'servant').length,
    [gateCheckins]
  );
  const earlyCount = useMemo(
    () => gateCheckins.filter((g) => g.is_early_arrival).length,
    [gateCheckins]
  );

  const handleConfirmCheckin = async (target: MatchedGateTarget) => {
    setFeedback(null);
    const subjectId = target.record.id;
    const subjectType = target.kind;
    const deterministicId = `${subjectType}_${subjectId}`;

    if (checkedInKeySet.has(deterministicId)) {
      setFeedback({
        type: 'warning',
        text: `تم تسجيل حضور البوابة مسبقاً لـ (${target.record.full_name}) ولا يمكن تكراره.`,
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const localTime = getCurrentLocalHHMM();
      const isoNow = getIsoNow();
      const early = isTimeBeforeOrEqualCutoff(
        localTime,
        attendancePolicy.early_arrival_cutoff_time || '09:30'
      );
      const gatePoints = Math.max(0, Number(attendancePolicy.gate_attendance_points) || 0);
      const earlyPoints = early
        ? Math.max(0, Number(attendancePolicy.early_arrival_bonus_points) || 0)
        : 0;

      const resolvedTeamName =
        subjectType === 'kid'
          ? target.record.team_name || selectedTeamOverride
          : selectedTeamOverride;

      const matchedTeam =
        codedTeams.find((t) => t.name === resolvedTeamName) || codedTeams[0];

      const checkin: GateCheckinRecord = {
        id: deterministicId,
        edition_id: editionId,
        subject_type: subjectType,
        subject_id: subjectId,
        subject_name: target.record.full_name,
        service_id: target.record.service_id,
        team_name: matchedTeam?.name || resolvedTeamName,
        qr_token: target.record.qr_token,
        pin_code: target.record.pin_code,
        checked_in_at: isoNow,
        checked_in_local_time: localTime,
        is_early_arrival: early,
        gate_points_awarded: gatePoints,
        early_bonus_awarded: earlyPoints,
        recorded_by_servant_id: actorServant.id,
        recorded_by_name: actorServant.full_name,
      };

      const ledgerEntries: PointsLedgerEntry[] = [];
      if (gatePoints > 0 && matchedTeam) {
        ledgerEntries.push({
          id: createRecordId('pts'),
          edition_id: editionId,
          team_id: matchedTeam.id,
          team_name: matchedTeam.name,
          round_title: 'حضور البوابة الرئيسي',
          target_type: subjectType,
          target_id: subjectId,
          target_name: target.record.full_name,
          source: 'gate',
          points: gatePoints,
          reason: `تسجيل حضور البوابة (${target.record.full_name}) الساعة ${localTime}`,
          recorded_by_servant_id: actorServant.id,
          recorded_by_name: actorServant.full_name,
          created_at: isoNow,
        });
      }
      if (early && earlyPoints > 0 && matchedTeam) {
        ledgerEntries.push({
          id: createRecordId('pts'),
          edition_id: editionId,
          team_id: matchedTeam.id,
          team_name: matchedTeam.name,
          round_title: 'بونص الحضور المبكر',
          target_type: subjectType,
          target_id: subjectId,
          target_name: target.record.full_name,
          source: 'early_bonus',
          points: earlyPoints,
          reason: `حضور مبكر قبل ${attendancePolicy.early_arrival_cutoff_time} (${target.record.full_name})`,
          recorded_by_servant_id: actorServant.id,
          recorded_by_name: actorServant.full_name,
          created_at: isoNow,
        });
      }

      const res = await onRecordGateCheckin(checkin, ledgerEntries);
      setScanInput('');
      const totalPts = gatePoints + earlyPoints;
      setFeedback({
        type: res.queuedOffline ? 'warning' : 'success',
        text: res.queuedOffline
          ? `تم حفظ حضور (${target.record.full_name}) في قائمة الانتظار أوفلاين وسيتم رفعه فور عودة الشبكة.`
          : `تم تسجيل حضور (${target.record.full_name}) الساعة ${localTime} وإضافة +${totalPts} نقطة لـ ${matchedTeam?.name || resolvedTeamName}.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'تعذر حفظ تسجيل البوابة — تحقق من الاتصال أو الصلاحية وحاول مرة أخرى.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* ملخص عداد البوابة + حالة الطابور أوفلاين */}
      <div className="grid grid-cols-3 gap-2.5">
        <div
          className={`rounded-2xl p-3 border text-center ${
            isLight ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#0D1323] border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold opacity-75">حضور المخدومين</div>
          <div className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
            {kidsCheckedCount} / {kids.length}
          </div>
        </div>

        <div
          className={`rounded-2xl p-3 border text-center ${
            isLight ? 'bg-blue-50/70 border-blue-200' : 'bg-[#0D1323] border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold opacity-75">حضور الخدام</div>
          <div className="text-lg sm:text-xl font-black text-blue-600 dark:text-sky-400 tabular-nums mt-0.5">
            {servantsCheckedCount} / {servants.length}
          </div>
        </div>

        <div
          className={`rounded-2xl p-3 border text-center ${
            isLight ? 'bg-amber-50/80 border-amber-200' : 'bg-[#0D1323] border-slate-800'
          }`}
        >
          <div className="text-[11px] font-bold opacity-75">بونص مبكر</div>
          <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums mt-0.5">
            {earlyCount}
          </div>
        </div>
      </div>

      {/* شريط سياسة الحضور المبكر */}
      <div
        className={`rounded-2xl p-3 border flex flex-wrap items-center justify-between gap-2 text-xs font-bold ${
          isCurrentlyEarly
            ? isLight
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
            : isLight
            ? 'bg-slate-50 border-slate-200 text-slate-700'
            : 'bg-[#0D1323] border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 shrink-0 text-orange-500" />
          <span>
            الوقت الحالي <span className="tabular-nums">{nowHHMM}</span> · حد البونص المبكر حتى{' '}
            <span className="tabular-nums">{attendancePolicy.early_arrival_cutoff_time}</span>
          </span>
        </div>
        <span className="font-extrabold tabular-nums">
          +{attendancePolicy.gate_attendance_points} بوابة
          {isCurrentlyEarly && attendancePolicy.early_arrival_bonus_points > 0
            ? ` + ${attendancePolicy.early_arrival_bonus_points} مبكر`
            : ''}
        </span>
      </div>

      {offlineQueueCount > 0 && (
        <div className="rounded-2xl p-3 bg-amber-500/15 border border-amber-500/40 flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold text-amber-800 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 shrink-0" />
            <span>يوجد ({offlineQueueCount}) تسجيلات حضور محفوظة أوفلاين بانتظار المزامنة</span>
          </div>
          {onSyncOfflineQueue && (
            <button
              type="button"
              disabled={isSyncingQueue}
              onClick={async () => {
                setIsSyncingQueue(true);
                try {
                  await onSyncOfflineQueue();
                } finally {
                  setIsSyncingQueue(false);
                }
              }}
              className="min-h-[38px] px-3 rounded-xl bg-amber-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingQueue ? 'animate-spin' : ''}`} />
              <span>مزامنة الآن</span>
            </button>
          )}
        </div>
      )}

      {/* صندوق البحث والمسح */}
      <div
        className={`rounded-2xl p-4 border space-y-3 ${
          isLight ? 'bg-white border-slate-200' : 'bg-[#0D1323] border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
            <ScanLine className="w-4 h-4 text-orange-500" />
            <span>مسح QR أو إدخال الكود / الاسم عند البوابة</span>
          </span>

          <div className="flex items-center gap-1.5">
            {(['all', 'kid', 'servant'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => setFilterKind(kind)}
                className={`min-h-[36px] px-3 rounded-xl text-xs font-extrabold border transition-colors cursor-pointer whitespace-nowrap ${
                  filterKind === kind
                    ? 'bg-orange-600 text-white border-orange-500'
                    : isLight
                    ? 'bg-slate-50 text-slate-700 border-slate-200'
                    : 'bg-[#141D33] text-slate-300 border-slate-700'
                }`}
              >
                {kind === 'all' ? 'الكل' : kind === 'kid' ? 'مخدومين' : 'خدام'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 opacity-50 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              placeholder="امسح محتوى QR أو اكتب الكود أو الاسم..."
              className={`w-full min-h-[48px] pr-10 pl-3 rounded-2xl border text-xs sm:text-sm font-bold outline-none ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                  : 'bg-[#090D18] border-slate-700 text-white focus:border-orange-500'
              }`}
            />
          </div>

          <button
            type="button"
            onClick={cameraOpen ? stopCamera : startCameraScan}
            className={`min-h-[48px] px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap ${
              cameraOpen
                ? 'bg-rose-600 text-white border-rose-500'
                : 'bg-blue-600 hover:bg-blue-500 text-white border-blue-500'
            }`}
          >
            {cameraOpen ? <X className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
            <span>{cameraOpen ? 'إغلاق الكاميرا' : 'مسح بالكاميرا'}</span>
          </button>
        </div>

        {cameraOpen && (
          <div className="rounded-2xl overflow-hidden border border-blue-500/40 bg-black relative">
            <video ref={videoRef} playsInline muted className="w-full max-h-56 object-cover" />
            <div className="p-2 text-center text-[11px] font-bold text-slate-200 bg-black/70">
              وجّه الكاميرا نحو رمز QR على بطاقة المخدوم أو الخادم
            </div>
          </div>
        )}

        {cameraError && (
          <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs font-bold">
            {cameraError}
          </div>
        )}

        {/* الفريق الافتراضي في حال عدم تسكين الخادم لفريق */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-bold opacity-80">الفريق المستفيد للخدام أو غير المسكنين:</span>
          <select
            value={selectedTeamOverride}
            onChange={(e) => setSelectedTeamOverride(e.target.value)}
            className={`min-h-[44px] px-3 rounded-xl border text-xs font-extrabold ${
              isLight
                ? 'bg-slate-50 border-slate-300 text-slate-900'
                : 'bg-[#090D18] border-slate-700 text-white'
            }`}
          >
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
                : feedback.type === 'warning'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-800 dark:text-amber-200'
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

        {/* قائمة النتائج الجاهزة لتأكيد الدخول بضغطة واحدة */}
        <div className="space-y-2 max-h-80 overflow-y-auto pr-0.5">
          {matchedCandidates.length === 0 ? (
            <div className="py-6 text-center text-xs font-bold opacity-65">
              لا توجد نتائج مطابقة للبحث.
            </div>
          ) : (
            matchedCandidates.map((item) => {
              const isChecked = checkedInKeySet.has(`${item.kind}_${item.record.id}`);
              const serviceLabel =
                services.find((s) => s.id === item.record.service_id)?.name || 'غير محدد';
              const healthNote =
                item.kind === 'kid'
                  ? item.record.health_notes
                  : item.record.health_and_skills?.health_notes;
              const hasHealthWarning =
                !!healthNote &&
                healthNote !== 'لا توجد' &&
                healthNote !== 'لا توجد ملاحظات صحية';

              return (
                <div
                  key={`${item.kind}-${item.record.id}`}
                  className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                    isChecked
                      ? isLight
                        ? 'bg-emerald-50/70 border-emerald-200'
                        : 'bg-emerald-950/20 border-emerald-500/30'
                      : isLight
                      ? 'bg-slate-50 border-slate-200'
                      : 'bg-[#12192B] border-slate-800'
                  }`}
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold whitespace-nowrap ${
                          item.kind === 'kid'
                            ? 'bg-purple-500/15 text-purple-700 dark:text-purple-300'
                            : 'bg-blue-500/15 text-blue-700 dark:text-sky-300'
                        }`}
                      >
                        {item.kind === 'kid' ? 'مخدوم' : 'خادم'}
                      </span>
                      <span className="text-xs sm:text-sm font-black truncate">
                        {item.record.full_name}
                      </span>
                      {item.record.pin_code && (
                        <span className="font-mono text-[11px] opacity-75">
                          #{item.record.pin_code}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-75 truncate">
                      {serviceLabel}
                      {item.kind === 'kid' ? ` · ${item.record.team_name}` : ''}
                    </div>
                    {hasHealthWarning && (
                      <div className="text-[11px] font-extrabold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>تنبيه صحي: {healthNote}</span>
                      </div>
                    )}
                  </div>

                  {isChecked ? (
                    <div className="min-h-[44px] px-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تم حضور البوابة</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleConfirmCheckin(item)}
                      className="min-h-[44px] px-4 rounded-xl bg-gradient-to-l from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap shadow-sm disabled:opacity-50"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>تأكيد حضور البوابة</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* أحدث عمليات تسجيل البوابة */}
      {gateCheckins.length > 0 && (
        <div
          className={`rounded-2xl p-4 border space-y-2.5 ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-[#0B101E] border-slate-800'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-extrabold">
            <span className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>سجل الحاضرين بالبوابة ({gateCheckins.length})</span>
            </span>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 opacity-75">
                <Users className="w-3.5 h-3.5" />
                <span>مرتب بالأحدث</span>
              </span>
              <button
                type="button"
                onClick={() =>
                  exportGateAttendanceWorkbook({
                    gateCheckins,
                    services,
                  })
                }
                className="min-h-[34px] px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>تصدير كشف الحضور</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto">
            {gateCheckins.slice(0, 12).map((chk) => (
              <div
                key={chk.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs ${
                  isLight ? 'bg-white border-slate-200' : 'bg-[#12192B] border-slate-800'
                }`}
              >
                <div className="min-w-0">
                  <div className="font-extrabold truncate">{chk.subject_name}</div>
                  <div className="text-[11px] opacity-75 truncate">
                    {chk.team_name || 'بدون فريق'} · الساعة{' '}
                    <span className="tabular-nums">{chk.checked_in_local_time}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {chk.is_early_arrival && (
                    <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-700 dark:text-amber-300 text-[10px] font-extrabold flex items-center gap-1 whitespace-nowrap">
                      <Sparkles className="w-3 h-3" />
                      <span>مبكر</span>
                    </span>
                  )}
                  <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-[11px] font-black tabular-nums whitespace-nowrap">
                    +{chk.gate_points_awarded + chk.early_bonus_awarded}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
