'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function subscribeStandalone(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia('(display-mode: standalone)');
  mql.addEventListener('change', callback);
  window.addEventListener('appinstalled', callback);
  return () => {
    mql.removeEventListener('change', callback);
    window.removeEventListener('appinstalled', callback);
  };
}

function getStandaloneSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function getStandaloneServerSnapshot(): boolean {
  return false;
}

function subscribeNoop() {
  return () => {};
}

function getIOSSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  const userAgent = window.navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

function getIOSServerSnapshot(): boolean {
  return false;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installedOverride, setInstalledOverride] = useState(false);

  const isStandalone = useSyncExternalStore(
    subscribeStandalone,
    getStandaloneSnapshot,
    getStandaloneServerSnapshot
  );

  const isIOS = useSyncExternalStore(subscribeNoop, getIOSSnapshot, getIOSServerSnapshot);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalledOverride(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstalledOverride(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled: isStandalone || installedOverride,
    isIOS,
    install,
  };
}

function subscribeOnline(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot(): boolean {
  if (typeof navigator === 'undefined') return true;
  return navigator.onLine;
}

function getOnlineServerSnapshot(): boolean {
  return true;
}

export function useOnlineStatus(simulatedOffline: boolean = false) {
  const browserOnline = useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getOnlineServerSnapshot
  );

  return browserOnline && !simulatedOffline;
}

export type ServerConnectionState = 'online' | 'offline' | 'server_unreachable';

export interface ServerConnectionInfo {
  status: ServerConnectionState;
  isOnline: boolean;
  isChecking: boolean;
  lastCheckedAt: string | null;
  recheckNow: () => Promise<boolean>;
}

export function useServerConnectionStatus(
  simulatedOffline: boolean = false,
  simulatedServerError: boolean = false
): ServerConnectionInfo {
  const browserOnline = useOnlineStatus(simulatedOffline);
  const [serverReachable, setServerReachable] = useState<boolean>(true);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);

  const probeServer = async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true;
    if (simulatedOffline || !navigator.onLine) {
      setServerReachable(false);
      return false;
    }
    if (simulatedServerError) {
      setServerReachable(false);
      return false;
    }

    setIsChecking(true);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch('/api/branding', {
        method: 'GET',
        cache: 'no-store',
        signal: controller.signal,
      });
      const ok = res.ok;
      setServerReachable(ok);
      const now = new Date();
      setLastCheckedAt(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      return ok;
    } catch {
      setServerReachable(false);
      return false;
    } finally {
      window.clearTimeout(timeoutId);
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!browserOnline || simulatedServerError) {
      return;
    }

    let active = true;
    const runProbe = async () => {
      if (!active) return;
      await probeServer();
    };

    const initialTimer = window.setTimeout(() => {
      runProbe();
    }, 0);

    const handleFocusOrOnline = () => {
      if (document.visibilityState === 'visible') {
        runProbe();
      }
    };

    window.addEventListener('online', handleFocusOrOnline);
    document.addEventListener('visibilitychange', handleFocusOrOnline);
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        runProbe();
      }
    }, 45000);

    return () => {
      active = false;
      window.clearTimeout(initialTimer);
      window.removeEventListener('online', handleFocusOrOnline);
      document.removeEventListener('visibilitychange', handleFocusOrOnline);
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [browserOnline, simulatedOffline, simulatedServerError]);

  const status: ServerConnectionState = !browserOnline
    ? 'offline'
    : !serverReachable || simulatedServerError
    ? 'server_unreachable'
    : 'online';

  return {
    status,
    isOnline: status === 'online',
    isChecking,
    lastCheckedAt,
    recheckNow: probeServer,
  };
}

