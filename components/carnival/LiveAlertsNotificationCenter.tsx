'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  BellRing,
  CalendarClock,
  Check,
  MapPin,
  Send,
  Siren,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  createRecordId,
  getIsoNow,
  type CarnivalActivityRound,
  type EmergencyAlertCategory,
  type EmergencyAlertRecord,
  type EmergencyAlertSeverity,
  type Servant,
} from '@/lib/carnival-store';

interface LiveAlertsNotificationCenterProps {
  editionId: string;
  actor: Servant;
  roleCategory: 'admin' | 'staff' | 'team_lead' | 'kid';
  canBroadcast: boolean;
  alerts: EmergencyAlertRecord[];
  activityRounds: CarnivalActivityRound[];
  onCreateAlert?: (alert: EmergencyAlertRecord) => Promise<void>;
  isLight: boolean;
}

const ALERT_TYPE_LABELS: Record<EmergencyAlertCategory, string> = {
  medical: 'طوارئ طبية',
  lost_child: 'طفل تائه',
  lost_item: 'مفقودات',
  logistics: 'تنبيه ميداني',
  schedule_change: 'تغيير مفاجئ في الجدول',
};

function playAlertTone(isCritical: boolean) {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = isCritical ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(isCritical ? 880 : 660, ctx.currentTime);
    if (isCritical) {
      osc.frequency.setValueAtTime(1046, ctx.currentTime + 0.14);
    }
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
  } catch {
    // تجاهل قيود التشغيل التلقائي للصوت
  }
}

async function sendBrowserPushNotification(title: string, body: string, tag: string, urgent: boolean) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  try {
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg && typeof reg.showNotification === 'function') {
        await reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
          tag,
          requireInteraction: urgent,
          dir: 'rtl',
          lang: 'ar',
        });
        return;
      }
    }
    new Notification(title, {
      body,
      icon: '/icon.svg',
      tag,
      requireInteraction: urgent,
      dir: 'rtl',
      lang: 'ar',
    });
  } catch {
    // fallback silently when notifications are restricted inside iframe
  }
}

export const LiveAlertsNotificationCenter: React.FC<LiveAlertsNotificationCenterProps> = ({
  editionId,
  actor,
  roleCategory,
  canBroadcast,
  alerts,
  activityRounds,
  onCreateAlert,
  isLight,
}) => {
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [liveScheduleChangeMsg, setLiveScheduleChangeMsg] = useState<string | null>(null);

  // نموذج بث سريع للأدمن وفريق العمل
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastType, setBroadcastType] = useState<'schedule_change' | 'medical' | 'lost_child' | 'logistics'>('schedule_change');
  const [broadcastSeverity, setBroadcastSeverity] = useState<EmergencyAlertSeverity>('urgent');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastLocation, setBroadcastLocation] = useState('جميع الفرق والمحطات');
  const [broadcastDetails, setBroadcastDetails] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sendFeedback, setSendFeedback] = useState<string | null>(null);

  const activeAlerts = useMemo(
    () =>
      alerts
        .filter((a) => a.status !== 'resolved')
        .sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [alerts]
  );

  const visibleAlerts = useMemo(
    () => activeAlerts.filter((a) => !dismissedIds.includes(a.id)),
    [activeAlerts, dismissedIds]
  );

  // تتبع التنبيهات الجديدة لحظياً لإطلاق Push Notification + صوت تنبيه
  const initializedRef = useRef(false);
  const seenAlertIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!initializedRef.current) {
      alerts.forEach((a) => seenAlertIdsRef.current.add(a.id));
      initializedRef.current = true;
      return;
    }

    const newlyArrived = activeAlerts.filter((a) => !seenAlertIdsRef.current.has(a.id));
    if (newlyArrived.length === 0) return;

    newlyArrived.forEach((alert) => {
      seenAlertIdsRef.current.add(alert.id);
      const prefix =
        alert.category === 'schedule_change' ? 'تحديث عاجل بالجدول الزمني' : 'تنبيه طوارئ فوري';
      sendBrowserPushNotification(
        `${prefix}: ${alert.title}`,
        `${alert.location} — ${alert.description}`,
        alert.id,
        alert.severity === 'critical'
      ).catch(() => undefined);
    });

    if (soundEnabled) {
      const hasCritical = newlyArrived.some((a) => a.severity === 'critical');
      playAlertTone(hasCritical);
    }
  }, [activeAlerts, alerts, soundEnabled]);

  // رصد التغييرات المفاجئة في الجدول الزمني لحظياً
  const roundsSignature = useMemo(
    () =>
      activityRounds
        .map((r) => `${r.id}:${r.title}:${r.start_time}-${r.end_time}:${r.location}`)
        .join('|'),
    [activityRounds]
  );
  const prevRoundsSigRef = useRef<string | null>(null);

  useEffect(() => {
    if (prevRoundsSigRef.current === null) {
      prevRoundsSigRef.current = roundsSignature;
      return;
    }
    if (prevRoundsSigRef.current !== roundsSignature) {
      prevRoundsSigRef.current = roundsSignature;
      const noticeText = `تم تحديث جدول الفقرات الآن (${activityRounds.length} فقرات) — يرجى مراجعة المواعيد والأماكن المحدثة.`;
      setLiveScheduleChangeMsg(noticeText);
      if (soundEnabled) playAlertTone(false);
      sendBrowserPushNotification(
        'تغيير في الجدول الزمني للكرنفال',
        noticeText,
        `schedule-sync-${Date.now()}`,
        false
      ).catch(() => undefined);
    }
  }, [roundsSignature, activityRounds.length, soundEnabled]);

  const handleRequestNotifications = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        await sendBrowserPushNotification(
          'تم تفعيل التنبيهات الفورية',
          'ستصلك إشعارات الطوارئ وتغييرات الجدول الزمني فوراً.',
          'carnival-notif-ready',
          false
        );
      }
    } catch {
      // ignore permission prompt errors
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateAlert || broadcastTitle.trim().length < 2) return;
    setIsSending(true);
    setSendFeedback(null);
    try {
      const now = getIsoNow();
      const newAlert: EmergencyAlertRecord = {
        id: createRecordId('alrt'),
        edition_id: editionId,
        category: broadcastType,
        severity: broadcastSeverity,
        title: broadcastTitle.trim(),
        description: broadcastDetails.trim() || broadcastTitle.trim(),
        location: broadcastLocation.trim() || 'جميع الفرق',
        status: 'open',
        reported_by_servant_id: actor.id,
        reported_by_name: actor.full_name,
        created_at: now,
        updated_at: now,
      };
      await onCreateAlert(newAlert);
      setBroadcastTitle('');
      setBroadcastDetails('');
      setSendFeedback('تم إرسال التنبيه الفوري إلى جميع مسؤولي الفرق بنجاح.');
      setTimeout(() => setSendFeedback(null), 3500);
    } catch {
      setSendFeedback('تعذر إرسال التنبيه — تحقق من الاتصال وحاول مجدداً.');
    } finally {
      setIsSending(false);
    }
  };

  // للمخدوم (kid) نعرض فقط تنبيهات تغيير الجدول إن وجدت بدون إزعاجه بتفاصيل الطوارئ الداخلية
  const displayedAlerts =
    roleCategory === 'kid'
      ? visibleAlerts.filter((a) => a.category === 'schedule_change')
      : visibleAlerts;

  const hasVisibleNotifications = displayedAlerts.length > 0 || Boolean(liveScheduleChangeMsg);
  const showToolbar = roleCategory !== 'kid' || hasVisibleNotifications;

  if (!showToolbar) return null;

  return (
    <section aria-label="مركز التنبيهات الفورية" className="space-y-2.5">
      {/* شريط التحكم في الإشعارات الفورية وبث التنبيهات لمسؤولي الفرق */}
      {roleCategory !== 'kid' && (
        <div
          className={`rounded-2xl px-3.5 py-2.5 border flex flex-wrap items-center justify-between gap-2 ${
            displayedAlerts.length > 0
              ? isLight
                ? 'bg-rose-50/90 border-rose-300 text-rose-950'
                : 'bg-rose-950/35 border-rose-500/40 text-rose-100'
              : isLight
              ? 'bg-white border-slate-200 text-slate-900'
              : 'bg-[#12192B] border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {displayedAlerts.length > 0 ? (
              <BellRing className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            ) : (
              <Bell className="w-4 h-4 text-orange-500 shrink-0" />
            )}
            <span className="text-xs font-extrabold truncate">
              {displayedAlerts.length > 0
                ? `تنبيهات فورية نشطة لمسؤولي الفرق (${displayedAlerts.length})`
                : 'التنبيهات الفورية للطوارئ وتغييرات الجدول'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {notifPermission !== 'unsupported' && notifPermission !== 'granted' && (
              <button
                type="button"
                onClick={handleRequestNotifications}
                className="min-h-[34px] px-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <BellRing className="w-3.5 h-3.5 shrink-0" />
                <span>تفعيل إشعارات الجهاز</span>
              </button>
            )}

            {notifPermission === 'granted' && (
              <span
                className={`min-h-[34px] px-2.5 rounded-xl border text-[11px] font-extrabold inline-flex items-center gap-1 ${
                  isLight
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-emerald-950/40 border-emerald-500/35 text-emerald-300'
                }`}
              >
                <Check className="w-3.5 h-3.5 shrink-0" />
                <span>الإشعارات مفعّلة</span>
              </span>
            )}

            {notifPermission === 'denied' && (
              <span className="text-[10px] font-bold opacity-75 inline-flex items-center gap-1 px-2">
                <BellOff className="w-3.5 h-3.5" />
                <span>الإشعارات محظورة بالمتصفح</span>
              </span>
            )}

            <button
              type="button"
              onClick={() => setSoundEnabled((p) => !p)}
              title={soundEnabled ? 'كتم صوت التنبيه' : 'تفعيل صوت التنبيه'}
              aria-label={soundEnabled ? 'كتم صوت التنبيه' : 'تفعيل صوت التنبيه'}
              className={`min-h-[34px] min-w-[34px] px-2 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  : 'bg-[#0C1222] border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>

            {canBroadcast && onCreateAlert && (
              <button
                type="button"
                onClick={() => {
                  setBroadcastOpen((p) => !p);
                  setSendFeedback(null);
                }}
                className={`min-h-[34px] px-2.5 rounded-xl text-[11px] font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                  broadcastOpen
                    ? 'bg-rose-600 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>{broadcastOpen ? 'إغلاق البث' : 'بث تنبيه فوري'}</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* نافذة البث السريع للطوارئ أو تغيير الجدول الزمني (للأدمن وفريق العمل) */}
      {canBroadcast && broadcastOpen && onCreateAlert && (
        <form
          onSubmit={handleBroadcastSubmit}
          className={`rounded-2xl p-4 border space-y-3 ${
            isLight ? 'bg-white border-blue-200 text-slate-900' : 'bg-[#0D1323] border-slate-800 text-slate-100'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-black text-blue-700 dark:text-sky-300">
              إرسال تنبيه فوري لمسؤولي الفرق (طوارئ / تغيير جدول)
            </span>
            <button
              type="button"
              onClick={() => setBroadcastOpen(false)}
              className="p-1 rounded-lg hover:bg-slate-500/10 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(
              [
                { id: 'schedule_change', label: 'تغيير بالجدول' },
                { id: 'medical', label: 'طوارئ طبية' },
                { id: 'lost_child', label: 'طفل تائه' },
                { id: 'logistics', label: 'تنبيه ميداني' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBroadcastType(opt.id)}
                className={`min-h-[40px] px-2.5 rounded-xl border text-xs font-extrabold cursor-pointer transition-colors ${
                  broadcastType === opt.id
                    ? opt.id === 'schedule_change'
                      ? 'bg-amber-600 text-white border-amber-500'
                      : 'bg-rose-600 text-white border-rose-500'
                    : isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700'
                    : 'bg-[#12192B] border-slate-700 text-slate-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder={
                broadcastType === 'schedule_change'
                  ? 'مثال: تأجيل روند الألعاب ١٥ دقيقة'
                  : 'عنوان التنبيه الفوري...'
              }
              className={`sm:col-span-2 min-h-[42px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
            <select
              value={broadcastSeverity}
              onChange={(e) => setBroadcastSeverity(e.target.value as EmergencyAlertSeverity)}
              className={`min-h-[42px] px-3 rounded-xl border text-xs font-extrabold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            >
              <option value="urgent">عاجل</option>
              <option value="critical">حرج جداً (أولوية قصوى)</option>
              <option value="normal">عادي</option>
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="text"
              value={broadcastLocation}
              onChange={(e) => setBroadcastLocation(e.target.value)}
              placeholder="المكان أو الفرق المستهدفة"
              className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
            <input
              type="text"
              value={broadcastDetails}
              onChange={(e) => setBroadcastDetails(e.target.value)}
              placeholder="التعليمات الفورية لمسؤولي الفرق..."
              className={`min-h-[42px] px-3 rounded-xl border text-xs font-bold ${
                isLight
                  ? 'bg-slate-50 border-slate-300 text-slate-900'
                  : 'bg-[#090D18] border-slate-700 text-white'
              }`}
            />
          </div>

          {sendFeedback && (
            <div className="text-xs font-extrabold text-emerald-700 dark:text-emerald-300">
              {sendFeedback}
            </div>
          )}

          <button
            type="submit"
            disabled={isSending}
            className="w-full min-h-[44px] rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? 'جاري الإرسال...' : 'إرسال التنبيه الفوري الآن'}</span>
          </button>
        </form>
      )}

      {/* إشارة تنبيه مرئية عند حدوث تعديل تلقائي في الجدول الزمني */}
      {liveScheduleChangeMsg && (
        <div
          role="alert"
          className={`rounded-2xl p-3.5 border-2 flex items-start justify-between gap-2.5 ${
            isLight
              ? 'bg-amber-50 border-amber-400 text-amber-950'
              : 'bg-amber-950/50 border-amber-500/60 text-amber-100'
          }`}
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="text-xs font-black">تحديث جديد في الجدول الزمني</div>
              <p className="text-xs font-semibold opacity-90">{liveScheduleChangeMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLiveScheduleChangeMsg(null)}
            className="min-h-[34px] px-2.5 rounded-xl bg-amber-600 text-white text-[11px] font-extrabold cursor-pointer shrink-0"
          >
            تم الاطلاع
          </button>
        </div>
      )}

      {/* بطاقات إشارات التنبيه المرئية النشطة */}
      {displayedAlerts.length > 0 && (
        <div className="space-y-2">
          {displayedAlerts.slice(0, 3).map((alert) => {
            const isSchedule = alert.category === 'schedule_change';
            const isCritical = alert.severity === 'critical';
            const cardClasses = isSchedule
              ? isLight
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-amber-950/45 border-amber-500/60 text-amber-100'
              : isCritical
              ? isLight
                ? 'bg-rose-50 border-rose-500 text-rose-950'
                : 'bg-rose-950/55 border-rose-500 text-rose-100'
              : isLight
              ? 'bg-orange-50 border-orange-300 text-orange-950'
              : 'bg-orange-950/40 border-orange-500/50 text-orange-100';

            return (
              <div
                key={alert.id}
                role="alert"
                className={`rounded-2xl p-3.5 border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${cardClasses}`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {isSchedule ? (
                      <CalendarClock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    ) : (
                      <Siren className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                    )}
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                      <span>{ALERT_TYPE_LABELS[alert.category]}</span>
                      <span>·</span>
                      <span>
                        {alert.severity === 'critical'
                          ? 'حرج جداً'
                          : alert.severity === 'urgent'
                          ? 'عاجل'
                          : 'تنبيه'}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-black">{alert.title}</div>
                    {alert.description && alert.description !== alert.title && (
                      <p className="text-xs opacity-90 leading-relaxed">{alert.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold opacity-80">
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0" />
                        <span>{alert.location}</span>
                      </span>
                      <span>المرسل: {alert.reported_by_name}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDismissedIds((prev) => [...prev, alert.id])}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-extrabold cursor-pointer shrink-0 self-end sm:self-center ${
                    isSchedule
                      ? 'bg-amber-600 hover:bg-amber-700 text-white'
                      : 'bg-rose-600 hover:bg-rose-700 text-white'
                  }`}
                >
                  تم الاستلام
                </button>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
