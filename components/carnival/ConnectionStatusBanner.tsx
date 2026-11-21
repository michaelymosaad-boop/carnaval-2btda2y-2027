'use client';

import React from 'react';
import { Wifi, WifiOff, CloudOff, RefreshCw, UploadCloud, X, CheckCircle2 } from 'lucide-react';
import type { ServerConnectionState } from '@/hooks/use-pwa';

interface ConnectionStatusIndicatorProps {
  status: ServerConnectionState;
  isChecking: boolean;
  offlineQueueCount?: number;
  isLight: boolean;
  onClick: () => void;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  status,
  isChecking,
  offlineQueueCount = 0,
  isLight,
  onClick,
}) => {
  const config =
    status === 'offline'
      ? {
          icon: WifiOff,
          label: 'أوفلاين',
          title: 'التطبيق يعمل في وضع الأوفلاين — اضغط لعرض التفاصيل',
          classes: isLight
            ? 'border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100'
            : 'border-amber-500/40 bg-amber-950/50 text-amber-300 hover:bg-amber-950/80',
          iconClass: 'text-amber-600 dark:text-amber-400',
        }
      : status === 'server_unreachable'
      ? {
          icon: CloudOff,
          label: 'السيرفر متوقف',
          title: 'تعذر الوصول للسيرفر — اضغط لإعادة المحاولة',
          classes: isLight
            ? 'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100'
            : 'border-rose-500/40 bg-rose-950/50 text-rose-300 hover:bg-rose-950/80',
          iconClass: 'text-rose-600 dark:text-rose-400',
        }
      : {
          icon: Wifi,
          label: 'متصل',
          title: 'متصل بالسيرفر — اضغط لفحص حالة الاتصال',
          classes: isLight
            ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800 hover:bg-emerald-100'
            : 'border-emerald-500/30 bg-[#12192B] text-emerald-300 hover:bg-slate-800',
          iconClass: 'text-emerald-600 dark:text-emerald-400',
        };

  const IconComp = config.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={config.title}
      title={config.title}
      className={`min-h-[32px] px-2.5 rounded-full border text-[11px] font-extrabold inline-flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap ${config.classes}`}
    >
      <IconComp className={`w-3.5 h-3.5 shrink-0 ${config.iconClass}`} />
      <span>{isChecking ? 'فحص...' : config.label}</span>
      {offlineQueueCount > 0 && (
        <span className="px-1.5 py-0.2 rounded-md bg-orange-600 text-white text-[10px] font-black tabular-nums">
          {offlineQueueCount}
        </span>
      )}
    </button>
  );
};

interface ConnectionStatusBannerProps {
  status: ServerConnectionState;
  isChecking: boolean;
  lastCheckedAt: string | null;
  offlineQueueCount?: number;
  forceExpanded: boolean;
  onCloseExpanded: () => void;
  onRetryConnection: () => Promise<boolean>;
  onSyncOfflineQueue?: () => Promise<void>;
  isLight: boolean;
}

export const ConnectionStatusBanner: React.FC<ConnectionStatusBannerProps> = ({
  status,
  isChecking,
  lastCheckedAt,
  offlineQueueCount = 0,
  forceExpanded,
  onCloseExpanded,
  onRetryConnection,
  onSyncOfflineQueue,
  isLight,
}) => {
  const [isSyncing, setIsSyncing] = React.useState(false);

  const shouldRender = status !== 'online' || offlineQueueCount > 0 || forceExpanded;
  if (!shouldRender) return null;

  const isOffline = status === 'offline';
  const isUnreachable = status === 'server_unreachable';

  const handleRetry = async () => {
    const ok = await onRetryConnection();
    if (ok && offlineQueueCount > 0 && onSyncOfflineQueue) {
      setIsSyncing(true);
      try {
        await onSyncOfflineQueue();
      } finally {
        setIsSyncing(false);
      }
    }
  };

  const handleManualSync = async () => {
    if (!onSyncOfflineQueue) return;
    setIsSyncing(true);
    try {
      await onSyncOfflineQueue();
    } finally {
      setIsSyncing(false);
    }
  };

  const containerStyle = isOffline
    ? isLight
      ? 'bg-amber-50 border-amber-300 text-amber-950'
      : 'bg-amber-950/40 border-amber-500/40 text-amber-100'
    : isUnreachable
    ? isLight
      ? 'bg-rose-50 border-rose-300 text-rose-950'
      : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
    : isLight
    ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
    : 'bg-emerald-950/35 border-emerald-500/35 text-emerald-100';

  return (
    <div
      role={status === 'online' ? 'status' : 'alert'}
      aria-live="polite"
      className={`mb-3 rounded-2xl p-3.5 border space-y-2.5 transition-colors ${containerStyle}`}
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5 shrink-0">
            {isOffline ? (
              <WifiOff className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            ) : isUnreachable ? (
              <CloudOff className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
          </div>

          <div className="min-w-0 space-y-1">
            <div className="text-xs sm:text-sm font-black">
              {isOffline
                ? 'وضع الأوفلاين نشط — لا يوجد اتصال بالإنترنت'
                : isUnreachable
                ? 'تعذر الوصول إلى السيرفر حالياً'
                : 'الاتصال بالسيرفر يعمل بشكل مستقر'}
            </div>
            <p className="text-[11px] sm:text-xs font-semibold opacity-90 leading-relaxed">
              {isOffline
                ? 'يمكنك متابعة التصفح وتسجيل حضور البوابة محلياً؛ وسيتم رفع ومزامنة أي عمليات معلقة تلقائياً فور عودة الشبكة.'
                : isUnreachable
                ? 'الشبكة متصلة لكن تعذر التواصل مع خادم التطبيق في الوقت الحالي. قد تكون البيانات الظاهرة من آخر نسخة محفوظة على جهازك.'
                : lastCheckedAt
                ? `التحديثات والمزامنة اللحظية مفعّلة · آخر فحص للسيرفر الساعة ${lastCheckedAt}.`
                : 'التحديثات والمزامنة اللحظية مفعّلة.'}
            </p>
          </div>
        </div>

        {status === 'online' && forceExpanded && (
          <button
            type="button"
            onClick={onCloseExpanded}
            aria-label="إغلاق تفاصيل حالة الاتصال"
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/10 dark:hover:bg-white/10 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-1">
        {(isOffline || isUnreachable || forceExpanded) && (
          <button
            type="button"
            disabled={isChecking}
            onClick={handleRetry}
            className={`min-h-[40px] px-3.5 rounded-xl text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60 ${
              isUnreachable
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : isOffline
                ? 'bg-amber-600 hover:bg-amber-700 text-white'
                : isLight
                ? 'bg-white border border-emerald-300 text-emerald-900 hover:bg-emerald-100'
                : 'bg-emerald-900/50 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-900'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'جاري الفحص...' : 'إعادة فحص الاتصال'}</span>
          </button>
        )}

        {offlineQueueCount > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-extrabold tabular-nums">
              عمليات بانتظار المزامنة: {offlineQueueCount}
            </span>
            {status === 'online' && onSyncOfflineQueue && (
              <button
                type="button"
                disabled={isSyncing}
                onClick={handleManualSync}
                className="min-h-[40px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>{isSyncing ? 'جاري المزامنة...' : 'مزامنة الآن'}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
