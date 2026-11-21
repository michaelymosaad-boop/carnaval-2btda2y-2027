'use client';

import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  KeyRound,
  Hash,
  UserCheck,
  CreditCard,
  Lock,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  HelpCircle,
  Mail,
  Database,
  ClipboardCheck,
  WifiOff,
  Sun,
  Moon,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sparkles,
  Phone,
  Layers,
  SlidersHorizontal,
  Camera,
  QrCode,
  Edit3,
  X,
  UserPlus,
  Users,
  Heart,
  Target,
  Compass,
  Clock,
  Pause,
  Play,
  LogIn,
} from 'lucide-react';
import {
  INITIAL_EDITION,
  INITIAL_SERVICES,
  INITIAL_AXES,
  INITIAL_SERVANTS,
  INITIAL_SERVANT_ROLES,
  INITIAL_LOGIN_CODES,
  INITIAL_OUTBOX,
  INITIAL_AUDIT_LOGS,
  INITIAL_CARNIVAL_HISTORY,
  INITIAL_ACTIVITY_ROUNDS,
  INITIAL_ATTENDANCE_POLICY,
  INITIAL_KID_PARTICIPANTS,
  INITIAL_CODED_GRADES,
  INITIAL_CODED_TEAMS,
  INITIAL_ADMIN_AUTH_CONFIG,
  EVENT_STAGES,
  computeHash,
  generateRandomCode,
  generateQrToken,
  createRecordId,
  getIsoNow,
  getReadableNow,
  encodeCarnivalQrPayload,
  decodeCarnivalQrPayload,
  computeTeamScoreboard,
  type Edition,
  type Servant,
  type ServantStatus,
  type ServantRole,
  type ServantRoleRecord,
  type LoginCodeRecord,
  type RecoveryRequestRecord,
  type AuditLogRecord,
  type SimulatedEmailMessage,
  type EventStageNumber,
  type CarnivalInfoHistoryEntry,
  type AxisItem,
  type CarnivalActivityRound,
  type AttendanceAndPointsPolicy,
  type KidParticipant,
  type CodedGradeItem,
  type CodedTeamItem,
  type AdminAuthConfig,
  type GateCheckinRecord,
  type PointsLedgerEntry,
  type EmergencyAlertRecord,
  type EmergencyAlertStatus,
} from '@/lib/carnival-store';
import dynamic from 'next/dynamic';
import { CarnivalEmblem, type HomepageAdminPayload } from './CarnivalEmblem';
import { CarnivalHeader } from './CarnivalHeader';
import { PortalLoginForm } from './PortalLoginForm';
import type { RegisterServantPayload } from './RegisterServantView';
import { computeRealProfilePoints } from '@/lib/profile-points';

const RegisterServantView = dynamic(
  () => import('./RegisterServantView').then((m) => m.RegisterServantView),
  { ssr: false }
);
const KidsRegistrationManager = dynamic(
  () => import('./KidsRegistrationManager').then((m) => m.KidsRegistrationManager),
  { ssr: false }
);
const SessionDashboardPreview = dynamic(
  () => import('./SessionDashboardPreview').then((m) => m.SessionDashboardPreview),
  { ssr: false }
);
const ProfilePage = dynamic(
  () => import('./ProfilePage').then((m) => m.ProfilePage),
  { ssr: false }
);
const ServantIdCardView = dynamic(
  () => import('./ServantIdCardView').then((m) => m.ServantIdCardView),
  { ssr: false }
);
const InspectorDrawer = dynamic(
  () => import('./InspectorDrawer').then((m) => m.InspectorDrawer),
  { ssr: false }
);
import {
  ConnectionStatusBanner,
  ConnectionStatusIndicator,
} from './ConnectionStatusBanner';
import { PWAInstallButton } from '@/components/pwa/PWAInstallButton';
import { useServerConnectionStatus } from '@/hooks/use-pwa';
import {
  saveServantToFirestore,
  updateServantPasswordHashInFirestore,
  updateServantAvatarInFirestore,
  deleteServantFromFirestore,
  subscribeToServants,
  saveLoginCodeToFirestore,
  markLoginCodeUsedInFirestore,
  subscribeToLoginCodes,
  subscribeToAdminAuthConfig,
  completeAdminBootstrapInFirestore,
  saveKidToFirestore,
  deleteKidFromFirestore,
  subscribeToKids,
  seedInitialDataIfEmpty,
  saveEditionToFirestore,
  subscribeToEdition,
  savePortalConfigToFirestore,
  subscribeToPortalConfig,
  saveCodingConfigToFirestore,
  subscribeToCodingConfig,
  hydrateAndMigrateAdminPrivateData,
  recordGateCheckinInFirestore,
  subscribeToGateCheckins,
  addPointsLedgerEntryInFirestore,
  subscribeToPointsLedger,
  createEmergencyAlertInFirestore,
  updateEmergencyAlertInFirestore,
  subscribeToEmergencyAlerts,
  updateKidTeamInFirestore,
  saveAuditLogToFirestore,
  subscribeToAuditLogs,
  cleanupDemoDataInFirestore,
  DEMO_SERVANT_IDS,
  DEMO_KID_IDS,
  DEMO_LOGIN_CODE_IDS,
  DEMO_AUDIT_LOG_IDS,
} from '@/lib/firebase-service';
import { onAuthStateChanged } from 'firebase/auth';
import {
  auth,
  isFirebaseAdminUser,
  signInAdminWithGoogle,
  signInServantWithGoogle,
  signOutFirebaseAuth,
  testFirestoreConnection,
} from '@/lib/firebase';

type SimulatedUiState = 'normal' | 'loading' | 'empty' | 'error' | 'offline';
type PortalPage = 'welcome' | 'vision' | 'register' | 'login';

const PORTAL_PAGE_ORDER: Record<PortalPage, number> = {
  welcome: 0,
  vision: 1,
  register: 2,
  login: 3,
};

const rtlPageVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? -36 : 36,
    opacity: 0,
    scale: 0.985,
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.26,
      ease: [0.22, 1, 0.36, 1] as const,
      when: 'beforeChildren' as const,
      staggerChildren: 0.055,
    },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? 36 : -36,
    opacity: 0,
    scale: 0.985,
    transition: {
      duration: 0.18,
      ease: [0.4, 0, 1, 1] as const,
    },
  }),
};

const staggeredItemVariants = {
  enter: {
    opacity: 0,
    y: 12,
  },
  center: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.24,
      ease: [0.22, 1, 0.36, 1] as const,
    },
  },
  exit: {
    opacity: 0,
    y: -6,
    transition: {
      duration: 0.12,
    },
  },
};

export const CarnivalAuthPortal: React.FC = () => {
  // حالة البيانات الأساسية
  const [edition, setEdition] = useState<Edition>(INITIAL_EDITION);
  const [carnivalHistory, setCarnivalHistory] = useState<CarnivalInfoHistoryEntry[]>(
    INITIAL_CARNIVAL_HISTORY
  );
  const [services] = useState(INITIAL_SERVICES);
  const [axes, setAxes] = useState<AxisItem[]>(INITIAL_AXES);
  const [servants, setServants] = useState<Servant[]>(INITIAL_SERVANTS);
  const [servantRoles, setServantRoles] = useState<ServantRoleRecord[]>(INITIAL_SERVANT_ROLES);
  const [loginCodes, setLoginCodes] = useState<LoginCodeRecord[]>(INITIAL_LOGIN_CODES);
  const [recoveryRequests, setRecoveryRequests] = useState<RecoveryRequestRecord[]>([]);
  const [outbox, setOutbox] = useState<SimulatedEmailMessage[]>(INITIAL_OUTBOX);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>(INITIAL_AUDIT_LOGS);
  const [activityRounds, setActivityRounds] = useState<CarnivalActivityRound[]>(
    INITIAL_ACTIVITY_ROUNDS
  );
  const [attendancePolicy, setAttendancePolicy] = useState<AttendanceAndPointsPolicy>(
    INITIAL_ATTENDANCE_POLICY
  );
  const [kids, setKids] = useState<KidParticipant[]>(INITIAL_KID_PARTICIPANTS);
  const [codedGrades, setCodedGrades] = useState<CodedGradeItem[]>(INITIAL_CODED_GRADES);
  const [codedTeams, setCodedTeams] = useState<CodedTeamItem[]>(INITIAL_CODED_TEAMS);
  const [adminAuthConfig, setAdminAuthConfig] = useState<AdminAuthConfig>(
    INITIAL_ADMIN_AUTH_CONFIG
  );

  // بيانات تشغيل يوم الكرنفال الحية (حضور البوابة، سجل النقاط التراكمي، بلاغات الطوارئ، وطابور البوابة أوفلاين)
  const OFFLINE_GATE_QUEUE_STORAGE_KEY = 'carnival_2027_offline_gate_queue_v1';
  type OfflineGateQueueItem = {
    checkin: GateCheckinRecord;
    ledgerEntries: PointsLedgerEntry[];
  };
  const [gateCheckins, setGateCheckins] = useState<GateCheckinRecord[]>([]);
  const [pointsLedger, setPointsLedger] = useState<PointsLedgerEntry[]>([]);
  const [emergencyAlerts, setEmergencyAlerts] = useState<EmergencyAlertRecord[]>([]);
  const [offlineGateQueue, setOfflineGateQueue] = useState<OfflineGateQueueItem[]>([]);
  const offlineGateQueueRef = useRef<OfflineGateQueueItem[]>([]);

  useEffect(() => {
    offlineGateQueueRef.current = offlineGateQueue;
  }, [offlineGateQueue]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      try {
        const raw = window.localStorage.getItem(OFFLINE_GATE_QUEUE_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as OfflineGateQueueItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          offlineGateQueueRef.current = parsed;
          setOfflineGateQueue(parsed);
          setGateCheckins((prev) => {
            const seen = new Set(prev.map((g) => g.id));
            const queued = parsed.map((q) => q.checkin).filter((g) => !seen.has(g.id));
            return [...queued, ...prev];
          });
          setPointsLedger((prev) => {
            const seen = new Set(prev.map((e) => e.id));
            const queued = parsed.flatMap((q) => q.ledgerEntries).filter((e) => !seen.has(e.id));
            return [...queued, ...prev];
          });
        }
      } catch {
        // ignore invalid storage payload
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // نافذة الإعداد الإلزامي للأدمن عند الدخول لأول مرة بالكود الثابت (202700)
  const [adminBootstrapModalOpen, setAdminBootstrapModalOpen] = useState(false);
  const [pendingBootstrapAdmin, setPendingBootstrapAdmin] = useState<Servant | null>(null);
  const [bootstrapUsername, setBootstrapUsername] = useState('michael.mosaad');
  const [bootstrapPassword, setBootstrapPassword] = useState('');
  const [bootstrapPasswordConfirm, setBootstrapPasswordConfirm] = useState('');
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [isBootstrapSubmitting, setIsBootstrapSubmitting] = useState(false);

  const portalRolesRef = useRef<ServantRoleRecord[]>(INITIAL_SERVANT_ROLES);
  const servantsListRef = useRef<Servant[]>(INITIAL_SERVANTS);
  const portalConfigUpdatedAtRef = useRef<string>('');
  const codingConfigUpdatedAtRef = useRef<string>('');
  const demoClearedRef = useRef<boolean>(false);
  const [demoDataCleared, setDemoDataCleared] = useState(false);
  const [demoCleanedAt, setDemoCleanedAt] = useState<string | null>(null);

  const mergeServantRoles = (
    baseRoles: ServantRoleRecord[],
    servantsList: Servant[]
  ): ServantRoleRecord[] => {
    const merged = [...baseRoles];
    for (const s of servantsList) {
      if (s.primary_role === 'team_lead' || s.primary_role === 'staff') {
        const alreadyHas = merged.some(
          (r) => r.servant_id === s.id && r.role === s.primary_role
        );
        if (!alreadyHas) {
          merged.push({
            id: `sr-primary-${s.id}-${s.primary_role}`,
            servant_id: s.id,
            role: s.primary_role,
          });
        }
      }
    }
    return merged;
  };

  useEffect(() => {
    servantsListRef.current = servants;
  }, [servants]);

  // الهوية البصرية المعتمدة
  const [isLight, setIsLight] = useState(true);

  // مزامنة فئة dark على مستوى جذر الصفحة لمنع تداخل ألوان التباين
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isLight) {
        document.documentElement.classList.remove('dark');
      } else {
        document.documentElement.classList.add('dark');
      }
    }
  }, [isLight]);

  // حالة التحقق الأولي من جلسة المصادقة في Firebase وحالة التحميل النشطة وتوثيق الأدمن بـ Google
  const [isFirebaseAuthChecking, setIsFirebaseAuthChecking] = useState(true);
  const [isFirebaseAdmin, setIsFirebaseAdmin] = useState(false);
  const [firebaseAdminEmail, setFirebaseAdminEmail] = useState<string | null>(null);
  const [isAdminGoogleSigningIn, setIsAdminGoogleSigningIn] = useState(false);
  const [adminGoogleAuthError, setAdminGoogleAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authLoadingMessage, setAuthLoadingMessage] = useState(
    'جاري التحقق من البيانات والمصادقة عبر Firebase...'
  );

  // مزامنة قاعدة بيانات Firestore الحية وحالة Firebase Authentication لحظياً
  useEffect(() => {
    let isMounted = true;
    let unsubscribeServants: (() => void) | undefined;
    let unsubscribeKids: (() => void) | undefined;
    let unsubscribeEdition: (() => void) | undefined;
    let unsubscribePortalConfig: (() => void) | undefined;
    let unsubscribeCodingConfig: (() => void) | undefined;
    let unsubscribeLoginCodes: (() => void) | undefined;
    let unsubscribeAdminAuthConfig: (() => void) | undefined;
    let unsubscribeGateCheckins: (() => void) | undefined;
    let unsubscribePointsLedger: (() => void) | undefined;
    let unsubscribeAlerts: (() => void) | undefined;
    let unsubscribeAuditLogs: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!isMounted) return;
        setIsFirebaseAuthChecking(false);
        const adminVerified = isFirebaseAdminUser(user);
        setIsFirebaseAdmin(adminVerified);
        setFirebaseAdminEmail(adminVerified ? user?.email || null : null);
      },
      (error) => {
        console.warn('Firebase auth state check warning:', error);
        if (isMounted) {
          setIsFirebaseAuthChecking(false);
          setIsFirebaseAdmin(false);
          setFirebaseAdminEmail(null);
        }
      }
    );

    const authFallbackTimer = setTimeout(() => {
      if (isMounted) {
        setIsFirebaseAuthChecking(false);
      }
    }, 2500);

    const initFirebaseSync = async () => {
      try {
        await testFirestoreConnection();
        await seedInitialDataIfEmpty(INITIAL_SERVANTS, INITIAL_KID_PARTICIPANTS, INITIAL_EDITION);

        unsubscribeEdition = subscribeToEdition(INITIAL_EDITION.id, (remoteEdition) => {
          if (!isMounted) return;
          setEdition((prev) => ({
            ...prev,
            ...remoteEdition,
            church_logo_url:
              remoteEdition.church_logo_url !== undefined
                ? remoteEdition.church_logo_url
                : prev.church_logo_url,
            service_logo_url:
              remoteEdition.service_logo_url !== undefined
                ? remoteEdition.service_logo_url
                : prev.service_logo_url,
            carnival_logo_url:
              remoteEdition.carnival_logo_url !== undefined
                ? remoteEdition.carnival_logo_url
                : prev.carnival_logo_url,
          }));
        });

        unsubscribePortalConfig = subscribeToPortalConfig(INITIAL_EDITION.id, (remoteCfg) => {
          if (!isMounted) return;
          const remoteUpdatedAt = remoteCfg.updated_at || '';
          portalConfigUpdatedAtRef.current = remoteUpdatedAt;
          if (remoteCfg.attendance_policy) {
            setAttendancePolicy(remoteCfg.attendance_policy);
          }
          if (
            Array.isArray(remoteCfg.coded_grades) &&
            remoteCfg.coded_grades.length > 0 &&
            remoteUpdatedAt >= codingConfigUpdatedAtRef.current
          ) {
            setCodedGrades(remoteCfg.coded_grades);
          }
          if (
            Array.isArray(remoteCfg.coded_teams) &&
            remoteCfg.coded_teams.length > 0 &&
            remoteUpdatedAt >= codingConfigUpdatedAtRef.current
          ) {
            setCodedTeams(remoteCfg.coded_teams);
          }
          if (Array.isArray(remoteCfg.activity_rounds)) {
            setActivityRounds(remoteCfg.activity_rounds);
          }
          if (Array.isArray(remoteCfg.axes) && remoteCfg.axes.length > 0) {
            setAxes(remoteCfg.axes);
          }
          if (Array.isArray(remoteCfg.carnival_history) && remoteCfg.carnival_history.length > 0) {
            setCarnivalHistory(remoteCfg.carnival_history);
          }
          if (Array.isArray(remoteCfg.servant_roles) && remoteCfg.servant_roles.length > 0) {
            portalRolesRef.current = remoteCfg.servant_roles;
            setServantRoles(mergeServantRoles(remoteCfg.servant_roles, servantsListRef.current));
          }
          if (remoteCfg.demo_data_cleared !== undefined) {
            const isCleared = Boolean(remoteCfg.demo_data_cleared);
            demoClearedRef.current = isCleared;
            setDemoDataCleared(isCleared);
            setDemoCleanedAt(remoteCfg.demo_cleaned_at || null);
            if (isCleared) {
              setOutbox((prev) => prev.filter((m) => m.id !== 'msg-1' && m.id !== 'msg-2'));
            }
          }
        });

        unsubscribeCodingConfig = subscribeToCodingConfig(INITIAL_EDITION.id, (codingCfg) => {
          if (!isMounted) return;
          const codingUpdatedAt = codingCfg.updated_at || '';
          codingConfigUpdatedAtRef.current = codingUpdatedAt;
          if (
            Array.isArray(codingCfg.coded_grades) &&
            codingCfg.coded_grades.length > 0 &&
            codingUpdatedAt >= portalConfigUpdatedAtRef.current
          ) {
            setCodedGrades(codingCfg.coded_grades);
          }
          if (
            Array.isArray(codingCfg.coded_teams) &&
            codingCfg.coded_teams.length > 0 &&
            codingUpdatedAt >= portalConfigUpdatedAtRef.current
          ) {
            setCodedTeams(codingCfg.coded_teams);
          }
        });

        unsubscribeServants = subscribeToServants(async (remoteServants) => {
          if (remoteServants && remoteServants.length > 0 && isMounted) {
            let finalServants = remoteServants;
            if (isFirebaseAdminUser(auth.currentUser)) {
              const hydrated = await hydrateAndMigrateAdminPrivateData(remoteServants, []);
              finalServants = hydrated.servants;
            }
            if (isMounted) {
              servantsListRef.current = finalServants;
              setServants(finalServants);
              setServantRoles(mergeServantRoles(portalRolesRef.current, finalServants));
            }
          }
        });

        unsubscribeKids = subscribeToKids(async (remoteKids) => {
          if (Array.isArray(remoteKids) && isMounted && (remoteKids.length > 0 || demoClearedRef.current)) {
            if (isFirebaseAdminUser(auth.currentUser)) {
              const hydrated = await hydrateAndMigrateAdminPrivateData([], remoteKids);
              if (isMounted) setKids(hydrated.kids);
            } else {
              setKids(remoteKids);
            }
          }
        });

        unsubscribeAdminAuthConfig = subscribeToAdminAuthConfig(
          INITIAL_EDITION.id,
          (remoteAdminAuth) => {
            if (!isMounted) return;
            setAdminAuthConfig(remoteAdminAuth);
          }
        );

        unsubscribeLoginCodes = subscribeToLoginCodes((remoteCodes) => {
          if (!isMounted) return;
          if (remoteCodes.length > 0 || demoClearedRef.current) {
            setLoginCodes(remoteCodes);
          }
        });

        unsubscribeGateCheckins = subscribeToGateCheckins(
          INITIAL_EDITION.id,
          (remoteCheckins) => {
            if (!isMounted) return;
            const pendingQueue = offlineGateQueueRef.current;
            if (pendingQueue.length === 0) {
              setGateCheckins(remoteCheckins);
              return;
            }
            const seen = new Set(remoteCheckins.map((r) => r.id));
            const queuedCheckins = pendingQueue
              .map((q) => q.checkin)
              .filter((r) => !seen.has(r.id));
            setGateCheckins([...queuedCheckins, ...remoteCheckins]);
          }
        );

        unsubscribePointsLedger = subscribeToPointsLedger(
          INITIAL_EDITION.id,
          (remoteEntries) => {
            if (!isMounted) return;
            const pendingQueue = offlineGateQueueRef.current;
            if (pendingQueue.length === 0) {
              setPointsLedger(remoteEntries);
              return;
            }
            const seen = new Set(remoteEntries.map((e) => e.id));
            const queuedEntries = pendingQueue
              .flatMap((q) => q.ledgerEntries)
              .filter((e) => !seen.has(e.id));
            setPointsLedger([...queuedEntries, ...remoteEntries]);
          }
        );

        unsubscribeAlerts = subscribeToEmergencyAlerts(
          INITIAL_EDITION.id,
          (remoteAlerts) => {
            if (!isMounted) return;
            setEmergencyAlerts(remoteAlerts);
          }
        );

        unsubscribeAuditLogs = subscribeToAuditLogs(INITIAL_EDITION.id, (remoteLogs) => {
          if (!isMounted) return;
          if (remoteLogs.length > 0 || demoClearedRef.current) {
            setAuditLogs(remoteLogs);
          }
        });
      } catch (err) {
        console.warn('Firebase sync warning (offline mode supported):', err);
      }
    };

    initFirebaseSync();

    return () => {
      isMounted = false;
      clearTimeout(authFallbackTimer);
      unsubscribeAuth();
      if (unsubscribeServants) unsubscribeServants();
      if (unsubscribeKids) unsubscribeKids();
      if (unsubscribeEdition) unsubscribeEdition();
      if (unsubscribePortalConfig) unsubscribePortalConfig();
      if (unsubscribeCodingConfig) unsubscribeCodingConfig();
      if (unsubscribeLoginCodes) unsubscribeLoginCodes();
      if (unsubscribeAdminAuthConfig) unsubscribeAdminAuthConfig();
      if (unsubscribeGateCheckins) unsubscribeGateCheckins();
      if (unsubscribePointsLedger) unsubscribePointsLedger();
      if (unsubscribeAlerts) unsubscribeAlerts();
      if (unsubscribeAuditLogs) unsubscribeAuditLogs();
    };
  }, []);

  // عند توثيق الأدمن عبر Google: ترقية البيانات الخاصة وترحيل أي حقول قديمة تلقائياً
  useEffect(() => {
    if (!isFirebaseAdmin) return;
    let cancelled = false;
    hydrateAndMigrateAdminPrivateData(servants, kids)
      .then((res) => {
        if (cancelled) return;
        setServants(res.servants);
        setKids(res.kids);
      })
      .catch((err) => console.warn('Admin private hydration warning:', err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFirebaseAdmin]);

  const handleSignInAdminGoogle = async () => {
    setAdminGoogleAuthError(null);
    setIsAdminGoogleSigningIn(true);
    try {
      const user = await signInAdminWithGoogle();
      setIsFirebaseAdmin(true);
      setFirebaseAdminEmail(user.email || null);
      const hydrated = await hydrateAndMigrateAdminPrivateData(servants, kids);
      setServants(hydrated.servants);
      setKids(hydrated.kids);
      appendAuditLog(
        activeServant?.id || 's-admin-1',
        activeServant?.full_name || user.email || 'أدمن',
        'ADMIN_GOOGLE_AUTH_VERIFIED',
        `admins/${user.uid}`,
        { email: user.email || '' }
      );
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'تعذر توثيق حساب Google للأدمن. يرجى المحاولة مجدداً.';
      setAdminGoogleAuthError(msg);
    } finally {
      setIsAdminGoogleSigningIn(false);
    }
  };

  const handleSignOutAdminGoogle = async () => {
    await signOutFirebaseAuth().catch(() => undefined);
    setIsFirebaseAdmin(false);
    setFirebaseAdminEmail(null);
  };

  const handleServantGoogleLogin = async () => {
    setStatusMessage(null);
    setIsAuthLoading(true);
    setAuthLoadingMessage('جاري المصادقة الآمنة عبر Google (Firebase Auth)...');
    try {
      const user = await signInServantWithGoogle();
      const signedEmail = (user.email || '').trim().toLowerCase();

      if (isFirebaseAdminUser(user)) {
        setIsFirebaseAdmin(true);
        setFirebaseAdminEmail(user.email || null);
        const hydrated = await hydrateAndMigrateAdminPrivateData(servants, kids);
        setServants(hydrated.servants);
        setKids(hydrated.kids);
        const resolvedAdmin =
          hydrated.servants.find((s) =>
            servantRoles.some((r) => r.servant_id === s.id && r.role === 'admin')
          ) ||
          hydrated.servants.find((s) => s.id === 's-admin-1') ||
          hydrated.servants[0];
        if (resolvedAdmin) {
          setSessionAccessLevel('full');
          setActiveServant(resolvedAdmin);
          setQrCardLanding(null);
        }
        return;
      }

      const emailHash = computeHash(signedEmail);
      const matched = servants.find(
        (s) =>
          s.email_hash === emailHash ||
          (s.email && s.email.trim().toLowerCase() === signedEmail)
      );

      if (!matched) {
        setStatusMessage({
          type: 'warning',
          title: 'حساب Google غير مرتبط بخادم مسجل',
          body: `البريد (${signedEmail}) غير مسجل في استمارة الخدام. يمكنك تسجيل الدخول بالاسم وكلمة المرور أو إضافة البريد الإلكتروني أثناء التسجيل.`,
        });
        return;
      }

      if (!attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
        setStatusMessage({
          type: 'warning',
          title: `أهلاً بك يا ${matched.full_name}`,
          body: 'تم التحقق من هويتك عبر Google بنجاح، ولكن بوابة الدخول للمستخدمين مغلقة حالياً لحين فتح المرحلة الثانية من الأدمن.',
        });
        return;
      }

      setSessionAccessLevel('full');
      setActiveServant(matched);
      setQrCardLanding(null);
      appendAuditLog(
        matched.id,
        matched.full_name,
        'SERVANT_GOOGLE_AUTH_LOGIN',
        `servants/${matched.id}`,
        { email_verified: true }
      );
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'تعذر إتمام المصادقة عبر Google. تأكد من السماح بالنوافذ المنبثقة والمحاولة مرة أخرى.';
      setStatusMessage({
        type: 'error',
        title: 'تعذر تسجيل الدخول عبر Google',
        body: msg,
      });
    } finally {
      setIsAuthLoading(false);
    }
  };

  const [isSavingLogo, setIsSavingLogo] = useState(false);
  const [lastSavedTarget, setLastSavedTarget] = useState<'church' | 'service' | 'carnival' | null>(
    null
  );
  const [uiState, setUiState] = useState<SimulatedUiState>('normal');
  const serverConnection = useServerConnectionStatus(
    uiState === 'offline',
    uiState === 'error'
  );
  const isOnline = serverConnection.status === 'online';
  const [connectionBannerExpanded, setConnectionBannerExpanded] = useState(false);

  // التنقل الحر بين الصفحات الثلاث: ١. الاستقبال (welcome) | ٢. رؤيتنا ورسالتنا (vision) | ٣. تسجيل الدخول (login)
  const [currentPage, setCurrentPage] = useState<PortalPage>('welcome');
  const [pageDirection, setPageDirection] = useState<number>(1);
  const [welcomeLogoError, setWelcomeLogoError] = useState(false);

  const navigateToPage = (nextPage: PortalPage) => {
    if (nextPage === currentPage) return;
    const dir = PORTAL_PAGE_ORDER[nextPage] > PORTAL_PAGE_ORDER[currentPage] ? 1 : -1;
    setPageDirection(dir);
    setCurrentPage(nextPage);
  };

  // بوابة الأدمن السريعة (تظهر حصرياً في بيئة المعاينة والتطوير هنا ولا تظهر إطلاقاً عند النشر)
  const isDevPreviewOnly = useSyncExternalStore(
    () => () => {},
    () => {
      const host = window.location.hostname.toLowerCase();
      const isSharedProdHost = host.startsWith('ais-pre-');
      const isDevEnv = process.env.NODE_ENV !== 'production';
      const isDevHost =
        host === 'localhost' || host === '127.0.0.1' || host.startsWith('ais-dev-');
      return !isSharedProdHost && (isDevEnv || isDevHost);
    },
    () => false
  );
  const [devAdminModalOpen, setDevAdminModalOpen] = useState(false);
  const [devAdminError, setDevAdminError] = useState<string | null>(null);

  const handleDevAdminGoogleEnter = async () => {
    setDevAdminError(null);
    setIsAdminGoogleSigningIn(true);
    try {
      const user = await signInAdminWithGoogle();
      setIsFirebaseAdmin(true);
      setFirebaseAdminEmail(user.email || null);
      const hydrated = await hydrateAndMigrateAdminPrivateData(servants, kids);
      servantsListRef.current = hydrated.servants;
      setServants(hydrated.servants);
      setKids(hydrated.kids);

      const resolvedAdminServant =
        hydrated.servants.find((s) =>
          servantRoles.some((r) => r.servant_id === s.id && r.role === 'admin')
        ) ||
        hydrated.servants.find((s) => s.id === 's-admin-1') ||
        servants[0];

      if (resolvedAdminServant) {
        setSessionAccessLevel('full');
        setActiveServant(resolvedAdminServant);
        appendAuditLog(
          resolvedAdminServant.id,
          resolvedAdminServant.full_name,
          'ADMIN_GOOGLE_DIRECT_LOGIN',
          `admins/${user.uid}`,
          { email: user.email || '' }
        );
      }
      setDevAdminModalOpen(false);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'تعذر تسجيل الدخول بحساب Google المعتمد للأدمن.';
      setDevAdminError(msg);
    } finally {
      setIsAdminGoogleSigningIn(false);
    }
  };

  // التبديل بين شاشة الاستخدام الفعلي وأدوات الاختبار والمحاكاة ولوحة أدمن الصفحة الرئيسية
  const [viewMode, setViewMode] = useState<'actual' | 'simulation'>('actual');
  const [modeMenuOpen, setModeMenuOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // وضع معاينة المرحلة الثانية (مغلق عن الجمهور العام ومتاح فقط من مدخل الأدمن/المعاينة)
  const [phase2PreviewMode, setPhase2PreviewMode] = useState(false);
  // شاشة بطاقة التعريف الموازية عند مسح QR أو الكود:
  // - المستوى ١ (أدمن) و ٢ (فريق عمل): يعرض البطاقة فقط ثم يحوّل تلقائياً لشاشة الإيميل/اليوزر + الباسورد
  // - المستوى ٣ (خادم فريق) و ٤ (مخدوم): دخول مباشر بالـ QR أو الكود المربوط
  const [qrCardLanding, setQrCardLanding] = useState<{
    servant: Servant;
    category: 'admin' | 'staff' | 'team_servant' | 'kid';
    autoRedirectPaused: boolean;
    secondsLeft: number;
  } | null>(null);
  const hasHandledUrlQrRef = useRef(false);

  // التبويب الرئيسي في شاشة الدخول للمرحلة الثانية (المشاركون vs فريق العمل) + شرح علامة الاستفهام
  const [mainTab, setMainTab] = useState<'participants' | 'staff'>('staff');
  const [roleHelpBanner, setRoleHelpBanner] = useState<'participants' | 'staff' | null>(null);

  // التبويب الفرعي داخل المشاركون (كود / QR أولاً، ثم خادم فريق بالرقم القومي والموبايل)
  const [participantSubTab, setParticipantSubTab] = useState<'national_id' | 'pin'>('pin');
  // التبويب الفرعي داخل فريق العمل (الإيميل / اسم المستخدم + كلمة المرور فقط)
  const [staffSubTab, setStaffSubTab] = useState<'national_id' | 'credentials'>('credentials');
  // شاشة تسجيل خادم جديد (الـ ١٠ حقول)
  const [showRegisterView, setShowRegisterView] = useState(false);
  // شاشة تسجيل وتشفير المخدومين (للخدام المفوضين)
  const [showKidsManager, setShowKidsManager] = useState(false);
  // شاشة الملف الشخصي ورصيد النقاط للخادم
  const [showProfilePage, setShowProfilePage] = useState(false);
  // نافذة التحقق من هوية الخادم (لإضافة المخدومين أو لضبط كلمة مرور فريق العمل في المرحلة الثانية)
  const [servantVerifyPurpose, setServantVerifyPurpose] = useState<'kids_manager' | 'portal_staff_login'>('kids_manager');
  const [servantVerifyModalOpen, setServantVerifyModalOpen] = useState(false);
  const [servantAuthView, setServantAuthView] = useState<'login' | 'first_time' | 'forgot_password'>('login');
  const [servantLoginName, setServantLoginName] = useState('');
  const [servantLoginPassword, setServantLoginPassword] = useState('');
  const [servantFirstTimeName, setServantFirstTimeName] = useState('');
  const [servantFirstTimeNatId, setServantFirstTimeNatId] = useState('');
  const [servantFirstTimePassword, setServantFirstTimePassword] = useState('');
  const [servantFirstTimeConfirm, setServantFirstTimeConfirm] = useState('');
  const [servantRecoveryNatId, setServantRecoveryNatId] = useState('');
  const [servantRecoveryNewPassword, setServantRecoveryNewPassword] = useState('');
  const [servantRecoveryConfirm, setServantRecoveryConfirm] = useState('');
  const [servantVerifyError, setServantVerifyError] = useState<string | null>(null);
  const [servantVerifySuccess, setServantVerifySuccess] = useState<string | null>(null);

  // حقول الإدخال
  const [pinCode, setPinCode] = useState('');
  const [adminIdentifier, setAdminIdentifier] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // حقل المسح الميداني للـ QR (يعرض البطاقة الشخصية فقط — لا يمنح صلاحية دخول لفريق العمل أو الأدمن بدون كلمة المرور)
  const [qrInputToken, setQrInputToken] = useState('');
  const [qrModalError, setQrModalError] = useState<string | null>(null);

  // حقول الدخول بالرقم القومي ورقم الهاتف معاً المسجلين في قاعدة البيانات
  const [recoveryNatId, setRecoveryNatId] = useState('');
  const [recoveryPhone, setRecoveryPhone] = useState('');
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const MAX_RECOVERY_ATTEMPTS = 5;

  // عداد محاولات الدخول
  const [loginAttempts, setLoginAttempts] = useState(0);
  const MAX_LOGIN_ATTEMPTS = 5;

  // رسائل الحالة والتنبيهات
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success' | 'warning';
    title: string;
    body: string;
  } | null>(null);
  const [showPinHelp, setShowPinHelp] = useState(false);

  // الجلسة النشطة ومستوى الصلاحية (كامل 'full' أو قراءة فقط 'readonly')
  const [activeServant, setActiveServant] = useState<Servant | null>(null);
  const [sessionAccessLevel, setSessionAccessLevel] = useState<'full' | 'readonly'>('full');

  // درج الفحص
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorTab, setInspectorTab] = useState<'outbox' | 'database' | 'checklist'>('outbox');

  const appendAuditLog = (
    actorId: string | null,
    actorName: string,
    action: string,
    target: string,
    details: Record<string, string | number | boolean>
  ) => {
    const newRecord: AuditLogRecord = {
      id: createRecordId('aud'),
      edition_id: edition.id,
      actor_id: actorId,
      actor_name: actorName,
      action,
      target,
      details,
      created_at: getReadableNow(19),
    };
    setAuditLogs((prev) => [newRecord, ...prev]);
    saveAuditLogToFirestore(newRecord).catch(() => undefined);
  };

  const handleCleanupDemoData = async ({
    includeOperationalTestRecords,
    zeroOutPointsLedger,
  }: {
    includeOperationalTestRecords: boolean;
    zeroOutPointsLedger: boolean;
  }): Promise<{ deletedCount: number; zeroedTeamsCount: number }> => {
    const servantIdsToDelete = servants
      .filter((s) => DEMO_SERVANT_IDS.includes(s.id) && s.id !== 's-admin-1')
      .map((s) => s.id);
    const kidIdsToDelete = kids
      .filter((k) => DEMO_KID_IDS.includes(k.id))
      .map((k) => k.id);
    const loginCodeIdsToDelete = Array.from(
      new Set([
        ...DEMO_LOGIN_CODE_IDS,
        ...loginCodes
          .filter((lc) => DEMO_SERVANT_IDS.includes(lc.servant_id))
          .map((lc) => lc.id),
      ])
    );
    const auditLogIdsToDelete = includeOperationalTestRecords
      ? auditLogs.map((a) => a.id)
      : auditLogs.filter((a) => DEMO_AUDIT_LOG_IDS.includes(a.id)).map((a) => a.id);
    const gateCheckinIdsToDelete = includeOperationalTestRecords
      ? gateCheckins.map((g) => g.id)
      : [];
    const alertIdsToDelete = includeOperationalTestRecords
      ? emergencyAlerts.map((a) => a.id)
      : [];

    const zeroOutLedgerEntries: PointsLedgerEntry[] = [];
    if (zeroOutPointsLedger) {
      const board = computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins);
      const actorId = activeServant?.id || 's-admin-1';
      const actorName = activeServant?.full_name || 'أدمن الكرنفال';
      const nowStr = getReadableNow(19);
      for (const team of board) {
        let remainingDelta = -team.total_points;
        while (remainingDelta !== 0) {
          const chunk =
            remainingDelta > 1000
              ? 1000
              : remainingDelta < -1000
              ? -1000
              : remainingDelta;
          zeroOutLedgerEntries.push({
            id: createRecordId('pts'),
            edition_id: edition.id,
            team_id: team.team_id,
            team_name: team.team_name,
            target_type: 'team',
            source: 'correction',
            points: chunk,
            reason: 'تصفير رصيد ما قبل الإطلاق (تنظيف البيانات التجريبية)',
            recorded_by_servant_id: actorId,
            recorded_by_name: actorName,
            created_at: nowStr,
          });
          remainingDelta -= chunk;
        }
      }
    }

    const remainingRoles = portalRolesRef.current.filter(
      (r) => !DEMO_SERVANT_IDS.includes(r.servant_id)
    );

    const result = await cleanupDemoDataInFirestore({
      editionId: edition.id,
      servantIdsToDelete,
      kidIdsToDelete,
      loginCodeIdsToDelete,
      auditLogIdsToDelete,
      gateCheckinIdsToDelete,
      alertIdsToDelete,
      zeroOutLedgerEntries,
      remainingRoles,
    });

    const cleanedAt = new Date().toISOString();
    demoClearedRef.current = true;
    setDemoDataCleared(true);
    setDemoCleanedAt(cleanedAt);

    const nextServants = servants.filter((s) => !servantIdsToDelete.includes(s.id));
    servantsListRef.current = nextServants;
    setServants(nextServants);
    portalRolesRef.current = remainingRoles;
    setServantRoles(mergeServantRoles(remainingRoles, nextServants));
    setKids((prev) => prev.filter((k) => !kidIdsToDelete.includes(k.id)));
    setLoginCodes((prev) => prev.filter((lc) => !loginCodeIdsToDelete.includes(lc.id)));
    setOutbox((prev) => prev.filter((m) => m.id !== 'msg-1' && m.id !== 'msg-2'));

    if (includeOperationalTestRecords) {
      persistOfflineGateQueue([]);
      setGateCheckins([]);
      setEmergencyAlerts([]);
      setAuditLogs([]);
    } else {
      setAuditLogs((prev) => prev.filter((a) => !auditLogIdsToDelete.includes(a.id)));
    }

    if (zeroOutLedgerEntries.length > 0) {
      setPointsLedger((prev) => [...zeroOutLedgerEntries, ...prev]);
    }

    appendAuditLog(
      activeServant?.id || 's-admin-1',
      activeServant?.full_name || 'أدمن الكرنفال',
      'DEMO_DATA_CLEANED',
      `editions/${edition.id}/config/portal`,
      {
        deleted_count: result.deletedCount,
        zeroed_teams: result.zeroedTeamsCount,
        cleared_operational_tests: includeOperationalTestRecords,
      }
    );

    return result;
  };

  const persistOfflineGateQueue = (items: {
    checkin: GateCheckinRecord;
    ledgerEntries: PointsLedgerEntry[];
  }[]) => {
    offlineGateQueueRef.current = items;
    setOfflineGateQueue(items);
    if (typeof window !== 'undefined') {
      try {
        if (items.length === 0) {
          window.localStorage.removeItem(OFFLINE_GATE_QUEUE_STORAGE_KEY);
        } else {
          window.localStorage.setItem(OFFLINE_GATE_QUEUE_STORAGE_KEY, JSON.stringify(items));
        }
      } catch {
        // ignore storage quota errors
      }
    }
  };

  const syncOfflineGateQueue = async () => {
    const pending = [...offlineGateQueueRef.current];
    if (pending.length === 0 || !isOnline) return;
    const remaining: typeof pending = [];

    for (const item of pending) {
      try {
        await recordGateCheckinInFirestore(item.checkin, item.ledgerEntries);
      } catch (err) {
        const msg = err instanceof Error ? err.message.toLowerCase() : '';
        if (!msg.includes('already') && !msg.includes('exists')) {
          remaining.push(item);
        }
      }
    }

    persistOfflineGateQueue(remaining);
    if (pending.length > remaining.length) {
      appendAuditLog(
        activeServant?.id || 's-admin-1',
        activeServant?.full_name || 'خادم البوابة',
        'OFFLINE_GATE_QUEUE_SYNCED',
        `editions/${edition.id}/gate_checkins`,
        {
          synced_count: pending.length - remaining.length,
          remaining_count: remaining.length,
        }
      );
    }
  };

  useEffect(() => {
    if (isOnline && offlineGateQueueRef.current.length > 0) {
      syncOfflineGateQueue().catch(() => undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const handleRecordGateCheckin = async (
    checkin: GateCheckinRecord,
    ledgerEntries: PointsLedgerEntry[]
  ): Promise<{ queuedOffline: boolean }> => {
    const canQueueOffline = attendancePolicy.allow_offline_scan_queue ?? true;
    const enqueueItem = () => {
      const existingQueue = offlineGateQueueRef.current;
      if (!existingQueue.some((q) => q.checkin.id === checkin.id)) {
        persistOfflineGateQueue([{ checkin, ledgerEntries }, ...existingQueue]);
      }
      setGateCheckins((prev) =>
        prev.some((g) => g.id === checkin.id) ? prev : [checkin, ...prev]
      );
      setPointsLedger((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const added = ledgerEntries.filter((e) => !seen.has(e.id));
        return [...added, ...prev];
      });
      appendAuditLog(
        checkin.recorded_by_servant_id,
        checkin.recorded_by_name,
        'GATE_CHECKIN_QUEUED_OFFLINE',
        `editions/${checkin.edition_id}/gate_checkins/${checkin.id}`,
        {
          subject_name: checkin.subject_name,
          is_early: checkin.is_early_arrival,
        }
      );
    };

    if (!isOnline) {
      if (!canQueueOffline) {
        throw new Error('الجهاز غير متصل بالإنترنت وطابور البوابة غير مفعّل في السياسة الحالية.');
      }
      enqueueItem();
      return { queuedOffline: true };
    }

    try {
      await recordGateCheckinInFirestore(checkin, ledgerEntries);
      setGateCheckins((prev) =>
        prev.some((g) => g.id === checkin.id) ? prev : [checkin, ...prev]
      );
      setPointsLedger((prev) => {
        const seen = new Set(prev.map((e) => e.id));
        const added = ledgerEntries.filter((e) => !seen.has(e.id));
        return [...added, ...prev];
      });
      appendAuditLog(
        checkin.recorded_by_servant_id,
        checkin.recorded_by_name,
        'GATE_CHECKIN_RECORDED',
        `editions/${checkin.edition_id}/gate_checkins/${checkin.id}`,
        {
          subject_name: checkin.subject_name,
          points: checkin.gate_points_awarded + checkin.early_bonus_awarded,
        }
      );
      return { queuedOffline: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isPermissionOrConflict =
        msg.includes('permission') || msg.includes('already') || msg.includes('exists');
      if (canQueueOffline && !isPermissionOrConflict && typeof navigator !== 'undefined' && !navigator.onLine) {
        enqueueItem();
        return { queuedOffline: true };
      }
      throw err;
    }
  };

  const handleAddPointsEntry = async (entry: PointsLedgerEntry): Promise<void> => {
    await addPointsLedgerEntryInFirestore(entry);
    setPointsLedger((prev) => (prev.some((e) => e.id === entry.id) ? prev : [entry, ...prev]));
    appendAuditLog(
      entry.recorded_by_servant_id,
      entry.recorded_by_name,
      'POINTS_LEDGER_ADDED',
      `editions/${entry.edition_id}/points_ledger/${entry.id}`,
      {
        team_name: entry.team_name,
        source: entry.source,
        points: entry.points,
      }
    );
  };

  const handleReassignKidTeam = async (kidId: string, newTeamName: string): Promise<void> => {
    const actorId = activeServant?.id || 's-admin-1';
    await updateKidTeamInFirestore(kidId, newTeamName, actorId);
    setKids((prev) =>
      prev.map((k) => (k.id === kidId ? { ...k, team_name: newTeamName } : k))
    );
    appendAuditLog(
      actorId,
      activeServant?.full_name || 'خادم التسكين',
      'KID_TEAM_REASSIGNED',
      `kids/${kidId}`,
      { team_name: newTeamName }
    );
  };

  const handleCreateAlert = async (alert: EmergencyAlertRecord): Promise<void> => {
    await createEmergencyAlertInFirestore(alert);
    setEmergencyAlerts((prev) => (prev.some((a) => a.id === alert.id) ? prev : [alert, ...prev]));
    appendAuditLog(
      alert.reported_by_servant_id,
      alert.reported_by_name,
      'EMERGENCY_ALERT_CREATED',
      `editions/${alert.edition_id}/alerts/${alert.id}`,
      {
        category: alert.category,
        severity: alert.severity,
        location: alert.location,
      }
    );
  };

  const handleUpdateAlertStatus = async (
    alertId: string,
    patch: {
      status: EmergencyAlertStatus;
      updated_by_servant_id: string;
      resolved_by_name?: string;
      resolution_note?: string;
      updated_at: string;
    }
  ): Promise<void> => {
    await updateEmergencyAlertInFirestore(edition.id, alertId, patch);
    setEmergencyAlerts((prev) =>
      prev.map((a) =>
        a.id === alertId
          ? {
              ...a,
              status: patch.status,
              updated_by_servant_id: patch.updated_by_servant_id,
              resolved_by_name: patch.resolved_by_name ?? a.resolved_by_name,
              resolution_note: patch.resolution_note ?? a.resolution_note,
              updated_at: patch.updated_at,
            }
          : a
      )
    );
    appendAuditLog(
      patch.updated_by_servant_id,
      patch.resolved_by_name || activeServant?.full_name || 'فريق الطوارئ',
      'EMERGENCY_ALERT_UPDATED',
      `editions/${edition.id}/alerts/${alertId}`,
      { status: patch.status }
    );
  };

  // استرجاع اللوجوهات وبيانات اسم وتاريخ الكرنفال من السيرفر و LocalStorage
  useEffect(() => {
    let isMounted = true;

    const readLocalBranding = (): Partial<Edition> | null => {
      try {
        const localRaw = window.localStorage.getItem('carnival_2027_branding_v1');
        return localRaw ? (JSON.parse(localRaw) as Partial<Edition>) : null;
      } catch {
        return null;
      }
    };

    const readLocalHistory = (): CarnivalInfoHistoryEntry[] | null => {
      try {
        const raw = window.localStorage.getItem('carnival_2027_history_v1');
        return raw ? (JSON.parse(raw) as CarnivalInfoHistoryEntry[]) : null;
      } catch {
        return null;
      }
    };

    const readLocalAxes = (): AxisItem[] | null => {
      try {
        const raw = window.localStorage.getItem('carnival_2027_axes_v1');
        return raw ? (JSON.parse(raw) as AxisItem[]) : null;
      } catch {
        return null;
      }
    };

    fetch('/api/branding')
      .then((res) => (res.ok ? res.json() : null))
      .then((serverData) => {
        if (!isMounted) return;
        const localData = readLocalBranding();
        const localHistory = readLocalHistory();
        const localAxes = readLocalAxes();

        if (Array.isArray(serverData?.axes) && serverData.axes.length > 0) {
          setAxes(serverData.axes);
          try {
            window.localStorage.setItem('carnival_2027_axes_v1', JSON.stringify(serverData.axes));
          } catch {
            // ignore
          }
        } else if (Array.isArray(localAxes) && localAxes.length > 0) {
          setAxes(localAxes);
        }

        if (Array.isArray(serverData?.history) && serverData.history.length > 0) {
          setCarnivalHistory(serverData.history);
          try {
            window.localStorage.setItem(
              'carnival_2027_history_v1',
              JSON.stringify(serverData.history)
            );
          } catch {
            // ignore
          }
        } else if (Array.isArray(localHistory) && localHistory.length > 0) {
          setCarnivalHistory(localHistory);
        }

        setEdition((prev) => {
          const resolvedDate =
            serverData?.carnival_date || localData?.starts_on || prev.starts_on;
          const resolvedChurch =
            serverData?.church_name || localData?.church_name || prev.church_name;
          const resolvedName = serverData?.carnival_name || localData?.name || prev.name;
          const merged: Edition = {
            ...prev,
            name: resolvedName,
            starts_on: resolvedDate,
            ends_on: resolvedDate,
            motto:
              serverData?.motto ||
              localData?.motto ||
              prev.motto ||
              'المسيح في قلبي، يظهر في حياتي',
            church_logo_url:
              serverData?.church_logo_url !== undefined
                ? serverData.church_logo_url
                : localData?.church_logo_url !== undefined
                ? localData.church_logo_url
                : prev.church_logo_url,
            service_logo_url:
              serverData?.service_logo_url !== undefined
                ? serverData.service_logo_url
                : localData?.service_logo_url !== undefined
                ? localData.service_logo_url
                : prev.service_logo_url,
            carnival_logo_url:
              serverData?.carnival_logo_url !== undefined
                ? serverData.carnival_logo_url
                : localData?.carnival_logo_url !== undefined
                ? localData.carnival_logo_url
                : prev.carnival_logo_url,
            church_name: resolvedChurch,
            service_title:
              serverData?.service_title || localData?.service_title || prev.service_title,
            footer_text:
              serverData?.footer_text ||
              localData?.footer_text ||
              `${resolvedChurch} · ${resolvedName}`,
          };
          try {
            window.localStorage.setItem('carnival_2027_branding_v1', JSON.stringify(merged));
          } catch {
            // ignore
          }
          return merged;
        });
      })
      .catch(() => {
        if (!isMounted) return;
        const localData = readLocalBranding();
        const localHistory = readLocalHistory();
        const localAxes = readLocalAxes();
        if (Array.isArray(localAxes) && localAxes.length > 0) {
          setAxes(localAxes);
        }
        if (Array.isArray(localHistory) && localHistory.length > 0) {
          setCarnivalHistory(localHistory);
        }
        if (!localData) return;
        setEdition((prev) => ({
          ...prev,
          name: localData.name || prev.name,
          starts_on: localData.starts_on || prev.starts_on,
          ends_on: localData.ends_on || prev.ends_on,
          motto: localData.motto || prev.motto || 'المسيح في قلبي، يظهر في حياتي',
          church_logo_url:
            localData.church_logo_url !== undefined
              ? localData.church_logo_url
              : prev.church_logo_url,
          service_logo_url:
            localData.service_logo_url !== undefined
              ? localData.service_logo_url
              : prev.service_logo_url,
          carnival_logo_url:
            localData.carnival_logo_url !== undefined
              ? localData.carnival_logo_url
              : prev.carnival_logo_url,
          church_name: localData.church_name || prev.church_name,
          service_title: localData.service_title || prev.service_title,
          footer_text:
            localData.footer_text ||
            `${localData.church_name || prev.church_name} · ${localData.name || prev.name}`,
        }));
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSaveHomepageSettings = async (payload: HomepageAdminPayload) => {
    const oldName = edition.name;
    const oldDate = edition.starts_on;

    const newHistoryEntry: CarnivalInfoHistoryEntry = {
      id: createRecordId('hist'),
      previous_name: oldName,
      new_name: payload.carnival_name,
      previous_date: oldDate,
      new_date: payload.carnival_date,
      changed_by: payload.changed_by,
      changed_at: getReadableNow(19),
      summary: `تحديث إعدادات الصفحة الرئيسية (${payload.church_name} | ${payload.axes.map((a) => a.name).join('، ')})`,
    };

    const updatedHistory = [newHistoryEntry, ...carnivalHistory];
    setCarnivalHistory(updatedHistory);
    try {
      window.localStorage.setItem('carnival_2027_history_v1', JSON.stringify(updatedHistory));
    } catch {
      // ignore
    }

    setAxes(payload.axes);
    try {
      window.localStorage.setItem('carnival_2027_axes_v1', JSON.stringify(payload.axes));
    } catch {
      // ignore
    }

    const resolvedFooterText =
      payload.footer_text?.trim() || `${payload.church_name} · ${payload.carnival_name}`;
    const resolvedMotto = payload.motto?.trim() || edition.motto || 'المسيح في قلبي، يظهر في حياتي';

    const nextEdition: Edition = {
      ...edition,
      church_name: payload.church_name,
      service_title: payload.service_title,
      name: payload.carnival_name,
      starts_on: payload.carnival_date,
      ends_on: payload.carnival_date,
      motto: resolvedMotto,
      footer_text: resolvedFooterText,
      church_logo_url: payload.church_logo_url,
      service_logo_url:
        payload.service_logo_url !== undefined ? payload.service_logo_url : edition.service_logo_url,
      carnival_logo_url: payload.carnival_logo_url,
    };
    setEdition(nextEdition);
    try {
      window.localStorage.setItem('carnival_2027_branding_v1', JSON.stringify(nextEdition));
    } catch {
      // ignore
    }
    if (isFirebaseAdminUser(auth.currentUser)) {
      saveEditionToFirestore(nextEdition).catch(console.error);
      savePortalConfigToFirestore(edition.id, {
        axes: payload.axes,
        carnival_history: updatedHistory,
      }).catch(console.error);
    }

    try {
      const res = await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edition_id: edition.id,
          church_name: payload.church_name,
          service_title: payload.service_title,
          carnival_name: payload.carnival_name,
          carnival_date: payload.carnival_date,
          motto: resolvedMotto,
          footer_text: resolvedFooterText,
          church_logo_url: payload.church_logo_url,
          service_logo_url: payload.service_logo_url,
          carnival_logo_url: payload.carnival_logo_url,
          axes: payload.axes,
          changed_by: payload.changed_by,
        }),
      });
      if (res.ok) {
        const resPayload = await res.json();
        if (Array.isArray(resPayload?.branding?.history)) {
          setCarnivalHistory(resPayload.branding.history);
          try {
            window.localStorage.setItem(
              'carnival_2027_history_v1',
              JSON.stringify(resPayload.branding.history)
            );
          } catch {
            // ignore
          }
        }
      }
    } catch {
      // localStorage already updated
    }

    appendAuditLog(
      's-admin-1',
      payload.changed_by,
      'HOMEPAGE_SETTINGS_UPDATED',
      `editions/${edition.id}`,
      {
        previous_name: oldName,
        new_name: payload.carnival_name,
        previous_date: oldDate,
        new_date: payload.carnival_date,
        axes_count: payload.axes.length,
      }
    );
  };

  const handleLogoUpload = async (
    target: 'church' | 'service' | 'carnival',
    dataUrl: string | null
  ) => {
    setIsSavingLogo(true);
    setLastSavedTarget(null);

    const updatedFields =
      target === 'church'
        ? { church_logo_url: dataUrl }
        : target === 'service'
        ? { service_logo_url: dataUrl }
        : { carnival_logo_url: dataUrl };

    if (target === 'carnival') {
      setWelcomeLogoError(false);
    }

    setEdition((prev) => {
      const nextEdition = { ...prev, ...updatedFields };
      try {
        window.localStorage.setItem('carnival_2027_branding_v1', JSON.stringify(nextEdition));
      } catch {
        // ignore
      }
      if (isFirebaseAdminUser(auth.currentUser)) {
        saveEditionToFirestore(nextEdition).catch(console.error);
      }
      return nextEdition;
    });

    try {
      await fetch('/api/branding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          edition_id: edition.id,
          ...updatedFields,
        }),
      });
    } catch {
      // localStorage already saved
    }

    appendAuditLog(
      's-admin-1',
      'إعدادات الهوية (أدمن)',
      'LOGO_UPDATED_DB',
      `editions/${edition.id}`,
      {
        target_column: target,
        persisted: true,
      }
    );

    setIsSavingLogo(false);
    setLastSavedTarget(target);
  };

  const handleStageChange = (newStage: EventStageNumber) => {
    setEdition((prev) => {
      const next = { ...prev, current_stage: newStage };
      if (isFirebaseAdminUser(auth.currentUser)) {
        saveEditionToFirestore(next).catch(console.error);
      }
      return next;
    });
    appendAuditLog('s-admin-1', 'شريط المحاكاة (أدمن)', 'STAGE_CHANGED', `editions/${edition.id}`, {
      from_stage: edition.current_stage,
      to_stage: newStage,
    });
  };

  // الدخول بالكود المربوط أو الـ QR:
  // - المستوى ٣ (خادم فريق / مسؤول فريق) والمستوى ٤ (مخدوم): دخول مباشر بالكود أو الـ QR
  // - المستوى ١ (أدمن) والمستوى ٢ (فريق العمل): يفتح بطاقة التعريف الشخصية فقط ويحوّل لشاشة كلمة المرور
  const handleCodeLogin = async (e: React.FormEvent, rawCode: string, modeLabel: string) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isOnline) {
      setStatusMessage({
        type: 'error',
        title: 'أنت الآن في وضع عدم الاتصال (Offline)',
        body: 'تسجيل الدخول يتطلب اتصالاً بالإنترنت للتحقق من الكود.',
      });
      return;
    }

    if (uiState === 'error') {
      setStatusMessage({
        type: 'error',
        title: 'تعذر الوصول إلى السيرفر حالياً',
        body: 'تم تفعيل وضع اختبار تعذر الاتصال. أعد الحالة إلى «طبيعي» لإتمام الدخول.',
      });
      return;
    }

    if (loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      setStatusMessage({
        type: 'error',
        title: 'تم إيقاف المحاولات مؤقتاً لحماية الحساب',
        body: `لقد استنفدت الحد الأقصى (${MAX_LOGIN_ATTEMPTS} محاولات).`,
      });
      return;
    }

    const decodedQr = decodeCarnivalQrPayload(rawCode);
    const cleanCode = (decodedQr?.pin || decodedQr?.code || rawCode).trim().toUpperCase();
    if (cleanCode.length < 4) {
      setStatusMessage({
        type: 'error',
        title: 'كود الدخول غير مكتمل',
        body: 'يرجى إدخال الكود المربوط بالبطاقة أو مسح رمز الـ QR بشكل صحيح.',
      });
      return;
    }

    setIsAuthLoading(true);
    setAuthLoadingMessage('جاري التحقق من الكود ورمز الـ QR...');
    try {
      await auth.authStateReady().catch(() => undefined);

      // ١. المستوى ٤: المخدومون (دخول مباشر بالكود أو الـ QR)
      const matchedKid = kids.find(
        (k) => k.pin_code.toUpperCase() === cleanCode || k.qr_token.toUpperCase() === cleanCode
      );
      if (matchedKid) {
        if (!attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
          setStatusMessage({
            type: 'warning',
            title: 'شاشات الدخول للمستخدمين مغلقة حالياً من الأدمن',
            body: `كود المخدوم (${matchedKid.full_name}) صحيح ومسجل، ولكن شاشات الدخول مغلقة حالياً لحين فتح البوابة رسمياً من إدارة الكرنفال.`,
          });
          return;
        }
        const kidAsParticipantCard = buildKidAsServantCard(matchedKid);
        setLoginAttempts(0);
        setSessionAccessLevel('readonly');
        setActiveServant(kidAsParticipantCard);
        appendAuditLog(
          matchedKid.id,
          matchedKid.full_name,
          'KID_CODE_OR_QR_LOGIN_SUCCESS',
          `kids/${matchedKid.id}`,
          { mode: modeLabel }
        );
        return;
      }

      // ٢. مطابقة الخدام والأدمن عبر QR أو PIN مربوط أو LoginCodeRecord
      const hashedInput = computeHash(cleanCode);
      const matchedLoginCode = loginCodes.find((lc) => lc.code_hash === hashedInput);
      const matchedServant = servants.find(
        (s) =>
          s.qr_token.toUpperCase() === cleanCode ||
          (s.pin_code && s.pin_code.toUpperCase() === cleanCode) ||
          (s.pin_code_hash && s.pin_code_hash === hashedInput) ||
          (matchedLoginCode && s.id === matchedLoginCode.servant_id)
      );

      if (!matchedServant) {
        const nextAttempts = loginAttempts + 1;
        setLoginAttempts(nextAttempts);
        appendAuditLog(null, 'مجهول', 'LOGIN_FAILED_INVALID_CODE', 'auth/login', {
          mode: modeLabel,
          attempt: nextAttempts,
        });
        setStatusMessage({
          type: 'error',
          title: 'كود الدخول أو رمز الـ QR غير صحيح',
          body: `لم يتم العثور على بطاقة مطابقة. المحاولات المتبقية: ${MAX_LOGIN_ATTEMPTS - nextAttempts}.`,
        });
        return;
      }

      if (matchedServant.status === 'disabled') {
        setStatusMessage({
          type: 'error',
          title: 'تم إيقاف هذا الحساب',
          body: 'الحساب موقوف من قبل إدارة الكرنفال.',
        });
        return;
      }

      const category = classifyQrServantCategory(matchedServant);

      // المستويان ١ (أدمن) و ٢ (فريق العمل): الكود والـ QR يعرضان البطاقة الشخصية فقط ولا يدخلان دون كلمة المرور!
      if (category === 'admin' || category === 'staff') {
        setLoginAttempts(0);
        openQrIdentificationCard(matchedServant, category);
        return;
      }

      // المستوى ٣ (خادم مشاركون / مسؤول فريق): دخول مباشر بالكود أو الـ QR
      if (!attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
        setStatusMessage({
          type: 'warning',
          title: 'شاشات الدخول للمستخدمين مغلقة حالياً من الأدمن',
          body: `أهلاً بك يا ${matchedServant.full_name} — بطاقتك وكودك مسجلان وجاهزان، ولكن شاشات الدخول للمستخدمين مغلقة حالياً لحين فتح البوابة رسمياً من إدارة الكرنفال.`,
        });
        return;
      }

      if (matchedLoginCode) {
        const usedAtIso = getIsoNow();
        setLoginCodes((prev) =>
          prev.map((lc) => (lc.id === matchedLoginCode.id ? { ...lc, used_at: usedAtIso } : lc))
        );
        markLoginCodeUsedInFirestore(matchedLoginCode.id, usedAtIso).catch(console.error);
      }

      setLoginAttempts(0);
      appendAuditLog(
        matchedServant.id,
        matchedServant.full_name,
        'TEAM_LEAD_CODE_OR_QR_LOGIN_SUCCESS',
        `servants/${matchedServant.id}`,
        {
          status: matchedServant.status,
          mode: modeLabel,
        }
      );
      setSessionAccessLevel('readonly');
      setActiveServant(matchedServant);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // تصنيف الحساب ضمن المستويات الأربعة:
  // ١. admin (الأدمن) | ٢. staff (خدام فرق العمل) | ٣. team_servant (خادم المشاركون / مسؤول فريق)
  const classifyQrServantCategory = (
    servant: Servant
  ): 'admin' | 'staff' | 'team_servant' => {
    const rolesForServant = servantRoles
      .filter((r) => r.servant_id === servant.id)
      .map((r) => r.role);
    if (rolesForServant.includes('admin') || servant.id === 's-admin-1') {
      return 'admin';
    }
    if (
      servant.primary_role === 'staff' ||
      rolesForServant.some((role) =>
        ['service_lead', 'registrar', 'staff', 'emergency'].includes(role)
      ) ||
      !!servant.admin_username ||
      !!servant.custom_password_hash
    ) {
      return 'staff';
    }
    return 'team_servant';
  };

  const buildKidAsServantCard = (kid: KidParticipant): Servant => ({
    id: kid.id,
    edition_id: kid.edition_id,
    full_name: kid.full_name,
    service_id: kid.service_id,
    phone: kid.parent_phone,
    whatsapp: kid.parent_phone,
    email: '',
    national_id_hash: '',
    national_id_last4: kid.pin_code,
    national_id_display: `PIN: ${kid.pin_code} · ${kid.grade_label}`,
    gender: 'ذكر',
    birth_date: kid.grade_label,
    governorate: kid.team_name,
    avatar_url: null,
    health_and_skills: {
      skills: [kid.team_name, kid.grade_label],
      health_notes: kid.health_notes,
    },
    status: 'approved',
    pin_code: kid.pin_code,
    qr_token: kid.qr_token,
    created_at: kid.created_at,
  });

  const redirectStaffQrToPasswordLogin = (
    target: Servant,
    category: 'admin' | 'staff' = classifyQrServantCategory(target) === 'admin' ? 'admin' : 'staff'
  ) => {
    setQrCardLanding(null);
    setActiveServant(null);
    setShowProfilePage(false);
    setShowKidsManager(false);
    setShowRegisterView(false);
    setViewMode('actual');
    setMainTab('staff');
    setStaffSubTab('credentials');
    setAdminIdentifier(
      target.admin_username ||
        target.username ||
        (category === 'admin' ? adminAuthConfig.admin_email : '') ||
        target.full_name
    );
    setAdminPassword('');
    setStatusMessage({
      type: 'warning',
      title:
        category === 'admin'
          ? `تم عرض بطاقة الأدمن — ${target.full_name}`
          : `تم تحويلك لتسجيل الدخول — ${target.full_name}`,
      body:
        category === 'admin'
          ? 'للانتقال إلى لوحة الإدارة والصفحة العامة يلزم إدخال الإيميل أو اسم المستخدم وكلمة المرور (أو الكود الثابت عند الدخول الأول).'
          : 'الـ QR والكود يعرضان بطاقتك الشخصية فقط. أدخل اسم المستخدم وكلمة المرور الخاصة بك لفتح مساحة فريق العمل.',
    });
    setCurrentPage('login');
  };

  const openQrIdentificationCard = (
    target: Servant,
    category: 'admin' | 'staff' | 'team_servant' | 'kid'
  ) => {
    const isAdminTarget = category === 'admin';
    if (!isAdminTarget && !attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
      setQrModalError(
        `بطاقة (${target.full_name}) صحيحة ومسجلة، ولكن المرحلة الثانية مغلقة حالياً عن المستخدمين لحين فتح البوابة من الأدمن.`
      );
      setStatusMessage({
        type: 'warning',
        title: 'المرحلة الثانية مغلقة حالياً من الأدمن',
        body: `بطاقة (${target.full_name}) مسجلة وجاهزة، ولكن شاشات الدخول والتعريف بالـ QR مغلقة حالياً للمستخدمين لحين الإطلاق الرسمي.`,
      });
      return false;
    }

    appendAuditLog(
      target.id,
      target.full_name,
      category === 'admin'
        ? 'QR_ADMIN_PROFILE_CARD_OPENED'
        : category === 'staff'
        ? 'QR_STAFF_PROFILE_CARD_OPENED'
        : 'QR_PARTICIPANT_PROFILE_CARD_OPENED',
      category === 'kid' ? `kids/${target.id}` : `servants/${target.id}`,
      {
        qr_token: target.qr_token,
        category,
      }
    );

    setQrInputToken('');
    setQrModalError(null);
    setQrModalOpen(false);
    setActiveServant(null);
    setShowProfilePage(false);
    setShowKidsManager(false);
    setShowRegisterView(false);
    setViewMode('actual');
    setStatusMessage(null);
    setQrCardLanding({
      servant: target,
      category,
      autoRedirectPaused: false,
      secondsLeft: 5,
    });
    return true;
  };

  // عداد الـ ٥ ثوانٍ التلقائي لبطاقة تعريف الأدمن وفريق العمل للانتقال إلى شاشة اليوزر/الإيميل وكلمة المرور
  useEffect(() => {
    if (
      !qrCardLanding ||
      (qrCardLanding.category !== 'staff' && qrCardLanding.category !== 'admin') ||
      qrCardLanding.autoRedirectPaused
    ) {
      return;
    }
    const targetServant = qrCardLanding.servant;
    const targetCategory = qrCardLanding.category;
    const remaining = qrCardLanding.secondsLeft;

    const timer = window.setTimeout(() => {
      if (remaining <= 1) {
        setQrCardLanding(null);
        setActiveServant(null);
        setShowProfilePage(false);
        setShowKidsManager(false);
        setShowRegisterView(false);
        setViewMode('actual');
        setMainTab('staff');
        setStaffSubTab('credentials');
        setAdminIdentifier(
          targetServant.admin_username ||
            targetServant.username ||
            (targetCategory === 'admin' ? adminAuthConfig.admin_email : '') ||
            targetServant.full_name
        );
        setAdminPassword('');
        setStatusMessage({
          type: 'warning',
          title:
            targetCategory === 'admin'
              ? `التحويل التلقائي لتسجيل دخول الأدمن — ${targetServant.full_name}`
              : `تم التحويل التلقائي لتسجيل دخول فريق العمل — ${targetServant.full_name}`,
          body:
            targetCategory === 'admin'
              ? 'أدخل الإيميل أو اسم المستخدم وكلمة المرور للدخول إلى لوحة الإدارة والصفحة العامة.'
              : 'أدخل اسم المستخدم وكلمة المرور الخاصة بك لتفعيل مهامك وصلاحياتك في الكرنفال.',
        });
        setCurrentPage('login');
      } else {
        setQrCardLanding((prev) =>
          prev && prev.servant.id === targetServant.id && !prev.autoRedirectPaused
            ? { ...prev, secondsLeft: remaining - 1 }
            : prev
        );
      }
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [qrCardLanding, adminAuthConfig.admin_email]);

  // دعم فتح رابط الـ QR مباشرة عبر المتصفح (?qr=...) عند تفعيل البوابة أو في بيئة المعاينة
  useEffect(() => {
    if (isFirebaseAuthChecking || hasHandledUrlQrRef.current) return;
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const qrParam = params.get('qr')?.trim();
    if (!qrParam) return;

    hasHandledUrlQrRef.current = true;
    const canOpenPortal = attendancePolicy.allow_user_portal_access || isDevPreviewOnly;
    if (!canOpenPortal) return;

    const timer = window.setTimeout(() => {
      const decoded = decodeCarnivalQrPayload(qrParam);
      const cleanToken = (decoded?.code || qrParam).trim().toUpperCase();
      const matchedKid = kids.find(
        (k) => k.qr_token.toUpperCase() === cleanToken || k.pin_code.toUpperCase() === cleanToken
      );
      if (matchedKid) {
        if (isDevPreviewOnly) setPhase2PreviewMode(true);
        openQrIdentificationCard(buildKidAsServantCard(matchedKid), 'kid');
        return;
      }
      const hashedToken = computeHash(cleanToken);
      const matchedServant = servants.find(
        (s) =>
          s.qr_token.toUpperCase() === cleanToken ||
          (s.pin_code && s.pin_code.toUpperCase() === cleanToken) ||
          (s.pin_code_hash && s.pin_code_hash === hashedToken)
      );
      if (matchedServant) {
        if (isDevPreviewOnly) setPhase2PreviewMode(true);
        const category = classifyQrServantCategory(matchedServant);
        openQrIdentificationCard(matchedServant, category);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  });

  // دخول المستوى ١ (الأدمن) والمستوى ٢ (خدام فرق العمل):
  // - الأدمن: بالإيميل أو اسم المستخدم + كلمة المرور (وفي أول مرة فقط بالرقم الثابت 202700 ثم يتغير فوراً بعد الدخول)
  // - خدام فرق العمل: باسم المستخدم + كلمة المرور التي أنشأها أثناء التسجيل
  const handleStaffCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isOnline) {
      setStatusMessage({
        type: 'error',
        title: 'لا يوجد اتصال بالإنترنت (Offline)',
        body: 'تسجيل الدخول يتطلب اتصالاً بالشبكة للتحقق من بيانات الحساب.',
      });
      return;
    }

    const cleanId = adminIdentifier.trim();
    const cleanPass = adminPassword.trim();

    if (!cleanId || !cleanPass) {
      setStatusMessage({
        type: 'error',
        title: 'اسم المستخدم وكلمة المرور مطلوبان',
        body: 'يرجى إدخال اسم المستخدم (أو البريد للأدمن) مع كلمة المرور الخاصة بك.',
      });
      return;
    }

    setIsAuthLoading(true);
    setAuthLoadingMessage('جاري التحقق من اسم المستخدم وكلمة المرور...');
    try {
      await auth.authStateReady().catch(() => undefined);

      const lowerId = cleanId.toLowerCase();
      const normQuery = normalizeArabicName(cleanId);
      const hashedPass = computeHash(cleanPass);

      const matchedServant = servants.find((s) => {
        const isAdminRole =
          s.id === 's-admin-1' ||
          servantRoles.some((r) => r.servant_id === s.id && r.role === 'admin');
        const normSrvName = normalizeArabicName(s.full_name);
        const matchesName =
          !!normQuery &&
          (normSrvName === normQuery ||
            (normQuery.length >= 4 && normSrvName.includes(normQuery)));

        if (isAdminRole) {
          return (
            s.email?.toLowerCase() === lowerId ||
            s.admin_username?.toLowerCase() === lowerId ||
            s.username?.toLowerCase() === lowerId ||
            adminAuthConfig.admin_email?.toLowerCase() === lowerId ||
            adminAuthConfig.admin_username?.toLowerCase() === lowerId ||
            matchesName
          );
        }

        return (
          s.username?.toLowerCase() === lowerId ||
          s.admin_username?.toLowerCase() === lowerId ||
          s.email?.toLowerCase() === lowerId ||
          matchesName
        );
      });

      if (!matchedServant) {
        const nextAttempts = loginAttempts + 1;
        setLoginAttempts(nextAttempts);
        appendAuditLog(null, cleanId || 'فريق العمل', 'STAFF_OR_ADMIN_LOGIN_FAILED', 'auth/staff', {
          attempt: nextAttempts,
        });
        setStatusMessage({
          type: 'error',
          title: 'اسم المستخدم أو الإيميل غير مسجل',
          body: 'تأكد من اسم المستخدم المسجل أو البريد المعتمد للأدمن.',
        });
        return;
      }

      if (matchedServant.status === 'disabled') {
        setStatusMessage({
          type: 'error',
          title: 'تم إيقاف هذا الحساب',
          body: 'حساب الخادم موقوف من قبل إدارة الكرنفال.',
        });
        return;
      }

      const category = classifyQrServantCategory(matchedServant);

      // المستوى ٣ (خادم مشاركون فقط): لا يدخل من تبويب فريق العمل بكلمة مرور
      if (category === 'team_servant') {
        setStatusMessage({
          type: 'warning',
          title: `أهلاً بك يا ${matchedServant.full_name} (خادم فريق - مشاركون)`,
          body: 'حسابك من المستوى ٣ (مشاركون). للدخول المباشر استخدم رمز الـ QR أو الكود المربوط من تبويب «المشاركون».',
        });
        return;
      }

      // المستوى ١: الأدمن
      if (category === 'admin') {
        // أول مرة فقط: مطابقة الرقم الثابت من الداتابيز (202700) -> إلزام بتغييره فوراً ليوزرنيم وباسورد دائم
        const isValidBootstrapAttempt =
          !adminAuthConfig.bootstrap_used &&
          !!adminAuthConfig.bootstrap_code_hash &&
          hashedPass === adminAuthConfig.bootstrap_code_hash;

        if (isValidBootstrapAttempt) {
          setPendingBootstrapAdmin(matchedServant);
          setBootstrapUsername(
            adminAuthConfig.admin_username || matchedServant.username || 'michael.mosaad'
          );
          setBootstrapPassword('');
          setBootstrapPasswordConfirm('');
          setBootstrapError(null);
          setAdminBootstrapModalOpen(true);
          return;
        }

        const hasValidAdminPassword =
          (!!adminAuthConfig.admin_password_hash &&
            hashedPass === adminAuthConfig.admin_password_hash) ||
          (!!matchedServant.admin_password_hash &&
            hashedPass === matchedServant.admin_password_hash) ||
          (!!matchedServant.custom_password_hash &&
            hashedPass === matchedServant.custom_password_hash);

        if (!hasValidAdminPassword) {
          const nextAttempts = loginAttempts + 1;
          setLoginAttempts(nextAttempts);
          const triedOldBootstrap =
            adminAuthConfig.bootstrap_used && hashedPass === computeHash('202700');
          setStatusMessage({
            type: 'error',
            title: triedOldBootstrap
              ? 'تم استهلاك الرقم الثابت وتغييره مسبقاً'
              : 'كلمة مرور الأدمن غير صحيحة',
            body: triedOldBootstrap
              ? 'الرقم الثابت للأدمن يعمل لأول دخول فقط وقد تم استبداله بالفعل. يرجى إدخال كلمة المرور الدائمة التي أنشأتها أو الدخول عبر Google.'
              : 'تأكد من كلمة المرور الخاصة بحساب الأدمن، أو ادخل عبر حساب Google المعتمد.',
          });
          return;
        }

        setLoginAttempts(0);
        setAdminPassword('');
        setQrCardLanding(null);
        setSessionAccessLevel('full');
        setActiveServant(matchedServant);
        appendAuditLog(
          matchedServant.id,
          matchedServant.full_name,
          'ADMIN_CREDENTIALS_LOGIN_SUCCESS',
          `servants/${matchedServant.id}`,
          { via: 'credentials' }
        );
        return;
      }

      // المستوى ٢: خدام فرق العمل (باليوزرنيم وكلمة المرور المحفوظة فقط — بدون أي تجاوز بالكود)
      const hasValidStaffPass =
        (!!matchedServant.custom_password_hash &&
          matchedServant.custom_password_hash === hashedPass) ||
        (!!matchedServant.admin_password_hash &&
          matchedServant.admin_password_hash === hashedPass);

      if (!matchedServant.custom_password_hash && !matchedServant.admin_password_hash) {
        setStatusMessage({
          type: 'warning',
          title: `أهلاً يا ${matchedServant.full_name}`,
          body: 'لم تقم بضبط كلمة مرور خاصة بك حتى الآن. اضغط على زر «ضبط أو استعادة كلمة المرور لأول مرة» بالأسفل لتعيين كلمة مرورك.',
        });
        return;
      }

      if (!hasValidStaffPass) {
        const nextAttempts = loginAttempts + 1;
        setLoginAttempts(nextAttempts);
        appendAuditLog(null, cleanId, 'STAFF_LOGIN_FAILED_WRONG_PASSWORD', 'auth/staff', {
          attempt: nextAttempts,
        });
        setStatusMessage({
          type: 'error',
          title: 'كلمة المرور غير صحيحة',
          body: 'يرجى التأكد من كلمة المرور المرتبطة باسم المستخدم. يمكنك إعادة ضبطها بالرقم القومي إذا نسيتها.',
        });
        return;
      }

      if (!attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
        setStatusMessage({
          type: 'warning',
          title: 'شاشات الدخول للمستخدمين مغلقة حالياً من الأدمن',
          body: `أهلاً بك يا ${matchedServant.full_name} — بياناتك وحسابك جاهزان، ولكن شاشات الدخول للمستخدمين مغلقة حالياً لحين فتح البوابة رسمياً من إدارة الكرنفال.`,
        });
        return;
      }

      setLoginAttempts(0);
      setAdminPassword('');
      appendAuditLog(
        matchedServant.id,
        matchedServant.full_name,
        'STAFF_LOGIN_SUCCESS',
        `servants/${matchedServant.id}`,
        { username: matchedServant.username || matchedServant.admin_username || '' }
      );
      setQrCardLanding(null);
      setSessionAccessLevel('full');
      setActiveServant(matchedServant);
    } finally {
      setIsAuthLoading(false);
    }
  };

  // إتمام الإعداد الإلزامي للأدمن بعد الدخول الأول بالرقم الثابت (202700)
  const handleCompleteAdminBootstrap = async (e: React.FormEvent) => {
    e.preventDefault();
    setBootstrapError(null);
    if (!pendingBootstrapAdmin) return;

    const cleanUsername = bootstrapUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,50}$/.test(cleanUsername)) {
      setBootstrapError(
        'يرجى كتابة اسم مستخدم بالإنجليزية (3 إلى 50 حرفاً: حروف، أرقام، نقطة، شرطة).'
      );
      return;
    }
    if (bootstrapPassword.length < 6) {
      setBootstrapError('يرجى اختيار كلمة مرور دائمة من 6 أحرف/أرقام على الأقل.');
      return;
    }
    if (bootstrapPassword !== bootstrapPasswordConfirm) {
      setBootstrapError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
      return;
    }

    setIsBootstrapSubmitting(true);
    try {
      const pwdHash = computeHash(bootstrapPassword);
      const adminEmail =
        pendingBootstrapAdmin.email ||
        adminAuthConfig.admin_email ||
        INITIAL_ADMIN_AUTH_CONFIG.admin_email;

      await completeAdminBootstrapInFirestore(
        edition.id,
        pendingBootstrapAdmin.id,
        adminEmail,
        cleanUsername,
        pwdHash
      );

      setAdminAuthConfig((prev) => ({
        ...prev,
        admin_email: adminEmail,
        admin_username: cleanUsername,
        admin_password_hash: pwdHash,
        bootstrap_used: true,
        bootstrap_code_hash: '',
        updated_at: getIsoNow(),
      }));

      const updatedAdmin: Servant = {
        ...pendingBootstrapAdmin,
        username: cleanUsername,
        admin_username: cleanUsername,
        custom_password_hash: pwdHash,
        admin_password_hash: pwdHash,
      };
      servantsListRef.current = servantsListRef.current.map((s) =>
        s.id === updatedAdmin.id ? updatedAdmin : s
      );
      setServants(servantsListRef.current);

      appendAuditLog(
        updatedAdmin.id,
        updatedAdmin.full_name,
        'ADMIN_FIRST_LOGIN_BOOTSTRAP_COMPLETED',
        `editions/${edition.id}/config/admin_auth`,
        { username: cleanUsername, bootstrap_invalidated: true }
      );

      setAdminBootstrapModalOpen(false);
      setPendingBootstrapAdmin(null);
      setBootstrapPassword('');
      setBootstrapPasswordConfirm('');
      setAdminPassword('');
      setAdminIdentifier(cleanUsername);
      setQrCardLanding(null);
      setSessionAccessLevel('full');
      setActiveServant(updatedAdmin);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'تعذر حفظ بيانات الأدمن الجديدة في Firestore. تأكد من الاتصال وحاول مجدداً.';
      setBootstrapError(msg);
    } finally {
      setIsBootstrapSubmitting(false);
    }
  };

  // الدخول عبر مسح الـ QR الميداني:
  // - المستوى ١ (أدمن) و ٢ (فريق العمل): يعرض بطاقة التعريف الشخصية فقط ثم يحوّله لشاشة كلمة المرور
  // - المستوى ٣ (خادم مشاركون) و ٤ (مخدوم): يفتح بطاقة التعريف مع الدخول المباشر بالـ QR
  const handleQrModalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQrModalError(null);

    const decodedQr = decodeCarnivalQrPayload(qrInputToken);
    const cleanQr = (decodedQr?.code || qrInputToken).trim().toUpperCase();
    if (!cleanQr) {
      setQrModalError('يرجى مسح أو إدخال رمز الـ QR المطبوع على البادج.');
      return;
    }

    // التحقق مما إذا كان الـ QR الممسوح يخص مخدوماً (طفلاً)
    const matchedKidByQr = kids.find(
      (k) => k.qr_token.toUpperCase() === cleanQr || k.pin_code.toUpperCase() === cleanQr
    );
    if (matchedKidByQr) {
      const kidCard = buildKidAsServantCard(matchedKidByQr);
      openQrIdentificationCard(kidCard, 'kid');
      return;
    }

    const hashedQr = computeHash(cleanQr);
    const matchedQrOnly = servants.find(
      (s) =>
        s.qr_token.toUpperCase() === cleanQr ||
        (s.pin_code && s.pin_code.toUpperCase() === cleanQr) ||
        (s.pin_code_hash && s.pin_code_hash === hashedQr)
    );
    if (!matchedQrOnly) {
      setQrModalError(
        'رمز الـ QR غير مطابق لأي بطاقة مسجلة. تأكد من صحة الرمز أو امسح البادج مجدداً.'
      );
      return;
    }

    const category = classifyQrServantCategory(matchedQrOnly);
    openQrIdentificationCard(matchedQrOnly, category);
  };

  // الدخول المباشر بالرقم القومي ورقم الهاتف (مقيد بالمستوى ٣ خدام المشاركون فقط)
  const handleNationalIdDirectLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    if (!isOnline) {
      setStatusMessage({
        type: 'error',
        title: 'أنت الآن في وضع عدم الاتصال (Offline)',
        body: 'التحقق من مطابقة الرقم القومي ورقم الهاتف يتطلب اتصالاً بالإنترنت.',
      });
      return;
    }

    if (uiState === 'error') {
      setStatusMessage({
        type: 'error',
        title: 'تعذر الوصول إلى السيرفر حالياً',
        body: 'تم تفعيل وضع اختبار تعذر الاتصال. أعد الحالة إلى «طبيعي» لإتمام الدخول.',
      });
      return;
    }

    if (recoveryAttempts >= MAX_RECOVERY_ATTEMPTS) {
      setStatusMessage({
        type: 'error',
        title: `تم إيقاف المحاولات مؤقتاً (${MAX_RECOVERY_ATTEMPTS} محاولات)`,
        body: 'يرجى التأكد من الرقم القومي ورقم الهاتف المسجلين أو مراجعة الأدمن.',
      });
      return;
    }

    const cleanNatId = recoveryNatId.replace(/\D/g, '');
    const cleanPhone = recoveryPhone.replace(/\D/g, '');

    if (cleanNatId.length !== 14) {
      setStatusMessage({
        type: 'error',
        title: 'الرقم القومي غير مكتمل',
        body: 'يرجى إدخال الرقم القومي المكون من ١٤ رقماً بالضبط.',
      });
      return;
    }

    if (!/^01[0125]\d{8}$/.test(cleanPhone)) {
      setStatusMessage({
        type: 'error',
        title: 'رقم الهاتف غير صحيح',
        body: 'يرجى إدخال رقم الهاتف المسجل (١١ رقماً يبدأ بـ 01).',
      });
      return;
    }

    setIsAuthLoading(true);
    setAuthLoadingMessage('جاري مطابقة الرقم القومي والتحقق...');
    try {
      await auth.authStateReady().catch(() => undefined);

      const natHash = computeHash(cleanNatId);
      const phoneHash = computeHash(cleanPhone);
      const matchedServant = servants.find(
        (s) =>
          s.national_id_hash === natHash &&
          (s.phone_hash ? s.phone_hash === phoneHash : s.phone === cleanPhone)
      );

      if (!matchedServant) {
        const nextAttempts = recoveryAttempts + 1;
        setRecoveryAttempts(nextAttempts);
        appendAuditLog(null, 'مجهول', 'NATIONAL_ID_LOGIN_FAILED_MISMATCH', 'auth/national-id', {
          national_id_last4: cleanNatId.slice(-4),
          phone: cleanPhone,
          attempt: nextAttempts,
        });
        setStatusMessage({
          type: 'error',
          title: 'البيانات غير مطابقة للسجل',
          body: `الرقم القومي أو رقم الهاتف غير مطابق للبيانات المسجلة. المحاولات المتبقية: ${
            MAX_RECOVERY_ATTEMPTS - nextAttempts
          }.`,
        });
        return;
      }

      if (matchedServant.status === 'disabled') {
        setStatusMessage({
          type: 'error',
          title: 'تم إيقاف هذا الحساب',
          body: 'حساب الخادم موقوف من قبل إدارة الكرنفال.',
        });
        return;
      }

      const category = classifyQrServantCategory(matchedServant);
      if (category === 'admin' || category === 'staff') {
        setStatusMessage({
          type: 'warning',
          title:
            category === 'admin'
              ? 'حساب الأدمن يدخل بكلمة المرور أو Google فقط'
              : 'حساب فريق العمل يتطلب اسم المستخدم وكلمة المرور',
          body: 'هذا التبويب مخصص لخدام المشاركون (المستوى ٣). يرجى التبديل إلى تبويب «فريق العمل» وإدخال اسم المستخدم وكلمة المرور.',
        });
        return;
      }

      if (!attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
        setStatusMessage({
          type: 'warning',
          title: 'شاشات الدخول للمستخدمين مغلقة حالياً من الأدمن',
          body: `أهلاً بك يا ${matchedServant.full_name} — بياناتك وحسابك والـ QR الخاص بك (${matchedServant.qr_token}) جاهزة، ولكن الدخول إلى شاشات المستخدمين مغلق حالياً لحين فتح البوابة رسمياً من الأدمن.`,
        });
        return;
      }

      setRecoveryAttempts(0);
      setLoginAttempts(0);
      setRecoveryNatId('');
      setRecoveryPhone('');

      appendAuditLog(
        matchedServant.id,
        matchedServant.full_name,
        'TEAM_LEAD_NATIONAL_ID_LOGIN_SUCCESS',
        `servants/${matchedServant.id}`,
        {
          status: matchedServant.status,
          national_id_last4: matchedServant.national_id_last4,
          phone: matchedServant.phone,
        }
      );

      setSessionAccessLevel('readonly');
      setActiveServant(matchedServant);
    } finally {
      setIsAuthLoading(false);
    }
  };

  const checkServantCanAddKids = (srv: Servant) => {
    return (
      !!srv.can_manage_coding ||
      servantRoles.some(
        (r) =>
          r.servant_id === srv.id &&
          ['admin', 'service_lead', 'registrar'].includes(r.role)
      )
    );
  };

  const checkServantCodingPermission = (srv: Servant) => {
    return checkServantCanAddKids(srv) || !!srv.can_view_kids_codes;
  };

  // فتح شاشة تسجيل المخدومين مع فحص وجود الخادم وصلاحيته الممنوحة
  const handleOpenKidsRegistration = () => {
    setStatusMessage(null);
    if (activeServant && sessionAccessLevel === 'full') {
      if (checkServantCodingPermission(activeServant)) {
        setShowKidsManager(true);
      } else {
        setStatusMessage({
          type: 'warning',
          title: `أهلاً بك يا خادم (${activeServant.full_name})`,
          body: 'حسابك مسجل كخادم، ولكن إضافة المخدومين أو استعراض أكوادهم مقتصرة على الخدام المفوضين بهذه الصلاحية (أدمن / أمين خدمة / خادم مسجِّل / مفوض تكويد أو عرض أكواد). يمكنك مراجعة الأدمن لمنحك الصلاحية.',
        });
      }
    } else {
      setServantVerifyPurpose('kids_manager');
      setServantAuthView('login');
      setServantVerifyError(null);
      setServantVerifySuccess(null);
      setServantVerifyModalOpen(true);
    }
  };

  // دالة لتطبيع الحروف العربية وتسهيل مطابقة الأسماء
  const normalizeArabicName = (name: string) => {
    return name
      .trim()
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/\s+/g, ' ');
  };

  // ١. تسجيل دخول الخادم بالاسم ثلاثي/اليوزر والرقم السري
  const handleServantPasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setServantVerifyError(null);
    setServantVerifySuccess(null);

    const rawQuery = servantLoginName.trim().toLowerCase();
    const normQuery = normalizeArabicName(servantLoginName);
    if (!normQuery) {
      setServantVerifyError('يرجى إدخال اسم المستخدم أو اسم الخادم ثلاثياً.');
      return;
    }
    if (!servantLoginPassword) {
      setServantVerifyError('يرجى إدخال كلمة المرور الخاصة بك.');
      return;
    }

    setIsAuthLoading(true);
    setAuthLoadingMessage('جاري التحقق من هوية الخادم والمصادقة عبر Firebase...');
    try {
      await auth.authStateReady().catch(() => undefined);

      const matchedServant = servants.find((s) => {
        const normSrvName = normalizeArabicName(s.full_name);
        return (
          normSrvName === normQuery ||
          normSrvName.includes(normQuery) ||
          normQuery.includes(normSrvName) ||
          (s.username && s.username.toLowerCase() === rawQuery) ||
          (s.admin_username && s.admin_username.toLowerCase() === rawQuery) ||
          (s.email && s.email.toLowerCase() === rawQuery)
        );
      });

      if (!matchedServant) {
        setServantVerifyError(
          'اسم المستخدم أو اسم الخادم غير مسجل. إذا كانت هذه أول مرة، يرجى الضغط على «أول مرة تسجل دخولك؟» لضبط كلمة مرورك.'
        );
        return;
      }

      const enteredHash = computeHash(servantLoginPassword);
      const hasValidCustom =
        !!matchedServant.custom_password_hash &&
        matchedServant.custom_password_hash === enteredHash;
      const hasValidStaffPass =
        !!matchedServant.admin_password_hash &&
        matchedServant.admin_password_hash === enteredHash;

      if (!matchedServant.custom_password_hash && !matchedServant.admin_password_hash) {
        setServantVerifyError(
          `أهلاً يا خادم (${matchedServant.full_name}). لم تقم بضبط كلمة مرور خاصة بك حتى الآن. اضغط على «أول مرة تسجل دخولك؟» لضبط كلمة المرور برقمك القومي.`
        );
        return;
      }

      if (!hasValidCustom && !hasValidStaffPass) {
        setServantVerifyError(
          'كلمة المرور غير صحيحة. إذا نسيت كلمة المرور، يمكنك استعادتها وتحديثها بالرقم القومي عبر الرابط بالأسفل.'
        );
        return;
      }

      if (servantVerifyPurpose === 'kids_manager') {
        if (!checkServantCodingPermission(matchedServant)) {
          setServantVerifyError(
            `أهلاً يا خادم (${matchedServant.full_name}). تم التحقق من هويتك كخادم مسجل، ولكن إضافة وتشفير المخدومين تتطلب اختيار صلاحية «خادم فرق عمل» أو تفويض من إدارة الكرنفال.`
          );
          return;
        }
      } else {
        const isServantAdmin = servantRoles.some(
          (r) => r.servant_id === matchedServant.id && r.role === 'admin'
        );
        if (!isServantAdmin && !attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
          setServantVerifyError(
            `أهلاً بك يا ${matchedServant.full_name} — بياناتك جاهزة، ولكن شاشات الدخول للمستخدمين مغلقة حالياً لحين فتح المرحلة الثانية من الأدمن.`
          );
          return;
        }
      }

      setActiveServant(matchedServant);
      setSessionAccessLevel('full');
      setServantVerifyModalOpen(false);
      setQrCardLanding(null);
      if (servantVerifyPurpose === 'kids_manager') {
        setShowKidsManager(true);
      }
      setServantLoginPassword('');
      appendAuditLog(
        matchedServant.id,
        matchedServant.full_name,
        'SERVANT_LOGGED_IN_WITH_PASSWORD',
        'auth/servant-password',
        { purpose: servantVerifyPurpose }
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  // ٢. ضبط الرقم السري للخادم لأول مرة (الاسم ثلاثي + الرقم القومي + ضبط الباسورد)
  const handleServantFirstTimeSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setServantVerifyError(null);
    setServantVerifySuccess(null);

    const cleanNatId = servantFirstTimeNatId.replace(/\D/g, '');
    if (cleanNatId.length !== 14) {
      setServantVerifyError('يرجى إدخال الرقم القومي المكون من ١٤ رقماً بالكامل.');
      return;
    }

    const normName = normalizeArabicName(servantFirstTimeName);
    if (normName.split(' ').length < 2) {
      setServantVerifyError('يرجى إدخال الاسم ثلاثياً على الأقل.');
      return;
    }

    if (servantFirstTimePassword.length < 4) {
      setServantVerifyError('يرجى اختيار رقم سري مكون من ٤ خانات على الأقل.');
      return;
    }

    if (servantFirstTimePassword !== servantFirstTimeConfirm) {
      setServantVerifyError('الرقم السري وتأكيده غير متطابقين.');
      return;
    }

    setIsAuthLoading(true);
    setAuthLoadingMessage('جاري حفظ كلمة المرور وتأكيد الدخول...');
    try {
      await auth.authStateReady().catch(() => undefined);

      const natHash = computeHash(cleanNatId);
      const matchedServant = servants.find((s) => s.national_id_hash === natHash);

      if (!matchedServant) {
        setServantVerifyError(
          'الرقم القومي المدخل غير مسجل لخادم. يجب تسجيل بياناتك في المرحلة الأولى أولاً.'
        );
        return;
      }

      const normMatchedName = normalizeArabicName(matchedServant.full_name);
      const inputParts = normName.split(' ');
      const matchedParts = normMatchedName.split(' ');
      const sharedParts = inputParts.filter((part) => matchedParts.includes(part));
      if (sharedParts.length < 2) {
        setServantVerifyError(
          `الاسم المدخل لا يطابق الاسم المسجل للرقم القومي (${matchedServant.full_name}). يرجى كتابة اسمك المسجل بدقة.`
        );
        return;
      }

      if (servantVerifyPurpose === 'kids_manager' && !checkServantCodingPermission(matchedServant)) {
        setServantVerifyError(
          `أهلاً يا خادم (${matchedServant.full_name}). تم التحقق من هويتك كخادم مسجل، ولكن إضافة وتشفير المخدومين تتطلب صلاحية معتمدة من إدارة الكرنفال طبقاً للاشتراطات.`
        );
        return;
      }

      const pwdHash = computeHash(servantFirstTimePassword);
      const updatedServant: Servant = { ...matchedServant, custom_password_hash: pwdHash };
      setServants((prev) => prev.map((s) => (s.id === matchedServant.id ? updatedServant : s)));
      await updateServantPasswordHashInFirestore(
        matchedServant.id,
        pwdHash,
        matchedServant.username
      ).catch(console.error);

      const isServantAdmin = servantRoles.some(
        (r) => r.servant_id === matchedServant.id && r.role === 'admin'
      );
      const canEnterPortal =
        servantVerifyPurpose === 'kids_manager' ||
        isServantAdmin ||
        attendancePolicy.allow_user_portal_access ||
        phase2PreviewMode;

      setServantFirstTimePassword('');
      setServantFirstTimeConfirm('');
      appendAuditLog(
        matchedServant.id,
        matchedServant.full_name,
        'SERVANT_PASSWORD_INITIAL_SETUP',
        'auth/first-time-setup',
        { purpose: servantVerifyPurpose }
      );

      if (!canEnterPortal) {
        setAdminIdentifier(
          matchedServant.username || matchedServant.admin_username || matchedServant.full_name
        );
        setServantVerifySuccess(
          `تم ضبط كلمة المرور بنجاح لحساب (${matchedServant.full_name})، ولكن الدخول للبوابة مغلق حالياً للمستخدمين لحين فتح المرحلة الثانية من الأدمن.`
        );
        return;
      }

      setActiveServant(updatedServant);
      setSessionAccessLevel('full');
      setServantVerifyModalOpen(false);
      setQrCardLanding(null);
      if (servantVerifyPurpose === 'kids_manager') {
        setShowKidsManager(true);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // ٣. استعادة وإعادة ضبط الرقم السري بالرقم القومي
  const handleServantResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setServantVerifyError(null);
    setServantVerifySuccess(null);

    const cleanNatId = servantRecoveryNatId.replace(/\D/g, '');
    if (cleanNatId.length !== 14) {
      setServantVerifyError('يرجى إدخال الرقم القومي المكون من ١٤ رقماً بالكامل.');
      return;
    }

    if (servantRecoveryNewPassword.length < 4) {
      setServantVerifyError('يرجى كتابة رقم سري جديد من ٤ خانات على الأقل.');
      return;
    }

    if (servantRecoveryNewPassword !== servantRecoveryConfirm) {
      setServantVerifyError('الرقم السري الجديد وتأكيده غير متطابقين.');
      return;
    }

    setIsAuthLoading(true);
    setAuthLoadingMessage('جاري تحديث كلمة المرور...');
    try {
      await auth.authStateReady().catch(() => undefined);

      const natHash = computeHash(cleanNatId);
      const matchedServant = servants.find((s) => s.national_id_hash === natHash);

      if (!matchedServant) {
        setServantVerifyError('الرقم القومي غير مسجل لخادم.');
        return;
      }

      if (servantVerifyPurpose === 'kids_manager' && !checkServantCodingPermission(matchedServant)) {
        setServantVerifyError(
          `أهلاً يا خادم (${matchedServant.full_name}). حسابك مسجل، ولكن إضافة وتشفير المخدومين تتطلب صلاحية معتمدة من إدارة الكرنفال طبقاً للاشتراطات.`
        );
        return;
      }

      const pwdHash = computeHash(servantRecoveryNewPassword);
      const updatedServant: Servant = { ...matchedServant, custom_password_hash: pwdHash };
      setServants((prev) => prev.map((s) => (s.id === matchedServant.id ? updatedServant : s)));
      await updateServantPasswordHashInFirestore(
        matchedServant.id,
        pwdHash,
        matchedServant.username
      ).catch(console.error);

      const isServantAdmin = servantRoles.some(
        (r) => r.servant_id === matchedServant.id && r.role === 'admin'
      );
      const canEnterPortal =
        servantVerifyPurpose === 'kids_manager' ||
        isServantAdmin ||
        attendancePolicy.allow_user_portal_access ||
        phase2PreviewMode;

      setServantRecoveryNewPassword('');
      setServantRecoveryConfirm('');
      appendAuditLog(
        matchedServant.id,
        matchedServant.full_name,
        'SERVANT_PASSWORD_RESET_BY_NAT_ID',
        'auth/reset-password',
        { purpose: servantVerifyPurpose }
      );

      if (!canEnterPortal) {
        setAdminIdentifier(
          matchedServant.username || matchedServant.admin_username || matchedServant.full_name
        );
        setServantVerifySuccess(
          `تم تحديث كلمة المرور بنجاح لحساب (${matchedServant.full_name})، ولكن الدخول للبوابة مغلق حالياً للمستخدمين لحين فتح المرحلة الثانية من الأدمن.`
        );
        return;
      }

      setActiveServant(updatedServant);
      setSessionAccessLevel('full');
      setServantVerifyModalOpen(false);
      setQrCardLanding(null);
      if (servantVerifyPurpose === 'kids_manager') {
        setShowKidsManager(true);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  // حفظ وتسجيل خادم جديد مباشرة في Firestore (مع إنشاء QR + كود مربوط + اسم مستخدم وباسورد للمستوى ٢)
  const handleRegisterServant = (payload: RegisterServantPayload) => {
    const natHash = computeHash(payload.national_id);
    const duplicateNat = servants.some((s) => s.national_id_hash === natHash);
    if (duplicateNat) {
      return {
        ok: false,
        error: 'هذا الرقم القومي مسجل بالفعل لخادم آخر.',
      };
    }

    const cleanUsername = payload.username?.trim().toLowerCase() || '';
    if (payload.primary_role === 'staff') {
      if (!/^[a-z0-9._-]{3,50}$/.test(cleanUsername)) {
        return {
          ok: false,
          error: 'يرجى إدخال اسم مستخدم صالح بالإنجليزية لخادم فرق العمل (3 أحرف على الأقل).',
        };
      }
      const duplicateUsername = servants.some(
        (s) =>
          s.username?.toLowerCase() === cleanUsername ||
          s.admin_username?.toLowerCase() === cleanUsername
      );
      if (duplicateUsername) {
        return {
          ok: false,
          error: 'اسم المستخدم هذا مسجل لخادم آخر، يرجى اختيار اسم مستخدم مختلف.',
        };
      }
      if (!payload.password || payload.password.length < 4) {
        return {
          ok: false,
          error: 'يرجى إنشاء كلمة مرور لا تقل عن ٤ أحرف/أرقام لحساب فرق العمل.',
        };
      }
    }

    const newServantId = createRecordId('s');
    const newQrToken = generateQrToken();
    let newPinCode = generateRandomCode(6);
    while (servants.some((s) => s.pin_code?.toUpperCase() === newPinCode)) {
      newPinCode = generateRandomCode(6);
    }
    const newCodeHash = computeHash(newPinCode);
    const last4 = payload.national_id.slice(-4);
    const resolvedEmail = payload.email?.trim().toLowerCase() || `servant.${last4}@gmail.com`;
    const resolvedEmailHash = payload.email?.trim()
      ? computeHash(payload.email.trim().toLowerCase())
      : undefined;

    const newServant: Servant = {
      id: newServantId,
      edition_id: edition.id,
      full_name: payload.full_name,
      service_id: payload.service_id,
      phone: payload.phone,
      phone_hash: computeHash(payload.phone),
      whatsapp: payload.whatsapp,
      email: resolvedEmail,
      email_hash: resolvedEmailHash,
      national_id_hash: natHash,
      national_id_last4: last4,
      national_id_display: payload.national_id,
      gender: payload.gender,
      birth_date: payload.birth_date,
      governorate: payload.governorate,
      avatar_url: payload.avatar_url,
      health_and_skills: {
        skills: payload.skills,
        health_notes: 'لا توجد ملاحظات صحية',
      },
      status: 'approved',
      qr_token: newQrToken,
      pin_code: newPinCode,
      pin_code_hash: newCodeHash,
      username: payload.primary_role === 'staff' ? cleanUsername : undefined,
      custom_password_hash:
        payload.primary_role === 'staff' && payload.password
          ? computeHash(payload.password)
          : undefined,
      can_manage_coding: payload.primary_role === 'staff',
      can_view_kids_codes: payload.primary_role === 'staff',
      primary_role: payload.primary_role,
      created_at: getIsoNow(),
    };

    const nextServants = [newServant, ...servantsListRef.current];
    servantsListRef.current = nextServants;
    setServants(nextServants);
    setServantRoles(mergeServantRoles(portalRolesRef.current, nextServants));

    const newLoginCode: LoginCodeRecord = {
      id: createRecordId('lc'),
      servant_id: newServantId,
      code_hash: newCodeHash,
      delivery_status: 'sent',
      used_at: null,
      expires_at: '2027-02-05T23:59:59Z',
      created_at: getIsoNow(),
    };

    const srvName = services.find((s) => s.id === payload.service_id)?.name || 'غير محدد';

    saveServantToFirestore(newServant).catch((err) => {
      console.error('Failed to sync servant to Firestore:', err);
      setStatusMessage({
        type: 'warning',
        title: 'تم الحفظ محلياً مع تنبيه مزامنة',
        body: 'تم إنشاء بطاقة الخادم محلياً، ولكن تعذرت المزامنة الفورية مع السحابة. تأكد من الاتصال بالإنترنت.',
      });
    });
    saveLoginCodeToFirestore(newLoginCode).catch(console.error);
    setLoginCodes((prev) => [newLoginCode, ...prev]);

    appendAuditLog(
      newServantId,
      payload.full_name,
      'SERVANT_REGISTERED_4TIER',
      `servants/${newServantId}`,
      {
        service: srvName,
        primary_role: payload.primary_role,
        username: cleanUsername || '-',
        pin_code: newPinCode,
        national_id_last4: last4,
      }
    );

    return {
      ok: true,
      servant: newServant,
      serviceName: srvName,
    };
  };

  const handleUpdateServantAvatar = (servantId: string, newAvatarUrl: string) => {
    setServants((prev) =>
      prev.map((s) => (s.id === servantId ? { ...s, avatar_url: newAvatarUrl } : s))
    );
    setActiveServant((prev) =>
      prev && prev.id === servantId ? { ...prev, avatar_url: newAvatarUrl } : prev
    );
    updateServantAvatarInFirestore(servantId, newAvatarUrl).catch(console.error);
  };

  const handleAdminSendWhatsappCode = (servantId: string) => {
    const srv = servants.find((s) => s.id === servantId);
    if (!srv) return;
    const newCode = generateRandomCode(6);
    const newLoginCode: LoginCodeRecord = {
      id: createRecordId('lc'),
      servant_id: srv.id,
      code_hash: computeHash(newCode),
      delivery_status: 'whatsapp_sent',
      used_at: null,
      expires_at: '2027-02-05T23:59:59Z',
      created_at: getIsoNow(),
    };
    setLoginCodes((prev) => [newLoginCode, ...prev.filter((c) => c.servant_id !== srv.id)]);
    saveLoginCodeToFirestore(newLoginCode).catch(console.error);
    setOutbox((prev) => [
      {
        id: createRecordId('msg'),
        to_email: `واتساب: ${srv.whatsapp}`,
        servant_name: srv.full_name,
        subject: 'تم إرسال الكود عبر واتساب بواسطة الأدمن',
        secret_code_preview: newCode,
        delivery_status: 'sent',
        sent_at: getReadableNow(16),
        purpose: 'admin_resend',
      },
      ...prev,
    ]);
    setRecoveryRequests((prev) =>
      prev.map((r) => (r.servant_id === servantId ? { ...r, status: 'resolved' } : r))
    );
    appendAuditLog(
      's-admin-1',
      'مايكل يسري مسعد (أدمن)',
      'ADMIN_SENT_CODE_WHATSAPP',
      `servants/${srv.id}`,
      {
        whatsapp: srv.whatsapp,
      }
    );
  };

  const currentStageMeta =
    EVENT_STAGES.find((s) => s.stage === edition.current_stage) || EVENT_STAGES[1];

  const isAdminLoggedIn =
    !!activeServant &&
    sessionAccessLevel === 'full' &&
    servantRoles.some((r) => r.servant_id === activeServant.id && r.role === 'admin');

  // إرشادات الصفحة الحالية الديناميكية لعرضها في زر إرشاد الاستخدام (الشرح التفصيلي لكل شاشة)
  const currentInstructions = React.useMemo(() => {
    if (showProfilePage) {
      return {
        title: 'إرشادات الملف الشخصي ورصيد النقاط',
        subtitle: 'بيانات الخادم ورصيد المشاركات والفعاليات',
        items: [
          {
            title: 'بيانات الخادم',
            description: 'عرض الاسم المسجل، الخدمة، شارة الدور، وكود الـ QR المعتمد.',
            badge: 'البيانات',
            color: 'blue' as const,
          },
          {
            title: 'سجل النقاط التفصيلي',
            description: 'تفاصيل رصيد النقاط لكل فاعلية ومشاركة مع إجمالي النقاط الكلي.',
            badge: 'النقاط',
            color: 'emerald' as const,
          },
          {
            title: 'تسجيل الخروج',
            description: 'الزر بالأسفل يتيح لك تسجيل الخروج بضغطة واحدة والعودة للشاشة الرئيسية.',
            badge: 'الخروج',
            color: 'amber' as const,
          },
        ],
      };
    }
    if (activeServant) {
      if (isAdminLoggedIn) {
        return {
          title: 'إرشادات لوحة تحكم الأدمن والتنبيهات',
          subtitle: 'إدارة الكرنفال، التنبيهات الفورية، والتشغيل الميداني',
          items: [
            {
              title: 'لوحة المتابعة السريعة ومؤشر الاتصال',
              description: 'تعرض أعلى اللوحة أعداد المخدومين والخدام ونقاط الفرق والبلاغات النشطة، ويظهر مؤشر حالة الاتصال في الشريط العلوي مع تنبيه تلقائي عند الأوفلاين أو تعذر الوصول للسيرفر.',
              badge: 'المتابعة',
              color: 'blue' as const,
            },
            {
              title: 'التنبيهات الفورية لمسؤولي الفرق',
              description: 'يمكنك بث تنبيه فوري للطوارئ أو تعديلات الجدول من زر «بث تنبيه فوري»، كما يُرسل تنبيه تلقائي لمسؤولي الفرق عند إضافة أو حذف فعالية بالجدول الزمني.',
              badge: 'تنبيهات',
              color: 'orange' as const,
            },
            {
              title: 'الإعدادات والتشغيل والتقارير',
              description: 'اضغط على أي كارت بالإعدادات للتعديل والحفظ، وانتقل إلى «تشغيل يوم الكرنفال» لمسح البوابة ونقاط المحطات، أو صدّر تقارير Excel الشاملة من بطاقة التقارير.',
              badge: 'الإدارة',
              color: 'emerald' as const,
            },
          ],
        };
      }
      if (sessionAccessLevel === 'readonly') {
        return {
          title: 'إرشادات متابعة الفريق والتنبيهات الفورية',
          subtitle: 'لوحة المشارك ومسؤول الفريق',
          items: [
            {
              title: 'لوحة الفريق والنقاط المباشرة',
              description: 'تعرض نقاط فريقك الحالية وترتيبه المباشر بين الفرق وأعضاء الفريق الحاضرين بالبوابة.',
              badge: 'الفريق',
              color: 'orange' as const,
            },
            {
              title: 'إشعارات الطوارئ وتغييرات الجدول',
              description: 'اضغط «تفعيل إشعارات الجهاز» لتصلك تنبيهات الطوارئ وأي تغيير مفاجئ في مواعيد الجدول الزمني فوراً بإشارة مرئية وصوت تنبيه.',
              badge: 'فوري',
              color: 'blue' as const,
            },
            {
              title: 'الإبلاغ السريع والعمل أوفلاين',
              description: 'يمكنك إرسال بلاغ طوارئ أو مفقودات من الزر أسفل الجدول، ومتابعة حالة الاتصال بالسيرفر من المؤشر العلوي.',
              badge: 'طوارئ',
              color: 'emerald' as const,
            },
          ],
        };
      }
      return {
        title: 'إرشادات غرفة تشغيل فريق العمل',
        subtitle: 'البوابة، نقاط المحطات، التنبيهات، والعمل أوفلاين',
        items: [
          {
            title: 'لوحة المتابعة والبث الفوري',
            description: 'تابع أعداد الحضور ونقاط الفرق أعلى الشاشة، واستخدم «بث تنبيه فوري» لإبلاغ مسؤولي الفرق فوراً بأي طارئ أو تعديل في الجدول.',
            badge: 'التشغيل',
            color: 'blue' as const,
          },
          {
            title: 'حضور البوابة في وضع الأوفلاين',
            description: 'عند انقطاع الشبكة يعمل المسح محلياً ويظهر عدد العمليات المعلقة في شريط حالة الاتصال ليتم رفعها فور عودة السيرفر.',
            badge: 'أوفلاين',
            color: 'amber' as const,
          },
          {
            title: 'إدارة المخدومين والفرق',
            description: 'حسب صلاحياتك، يمكنك تسجيل المخدومين، ضبط تسكين الفرق، وتقييم نقاط المحطات لحظياً.',
            badge: 'الصلاحيات',
            color: 'emerald' as const,
          },
        ],
      };
    }
    if (showKidsManager) {
      return {
        title: 'إرشادات إدارة وتكويد المخدومين',
        subtitle: 'إضافة ومتابعة بيانات الأطفال المشاركين بالكرنفال',
        items: [
          {
            title: 'إضافة مخدوم جديد',
            description: 'أدخل بيانات الطفل (الاسم، تاريخ الميلاد أو الرقم القومي، المرحلة، والفرقة) لاستخراج الكود وبطاقة الـ QR المعتمدة.',
            badge: 'إضافة',
            color: 'blue' as const,
          },
          {
            title: 'البحث والاستعلام والتصدير',
            description: 'يمكنك مراجعة قائمة الأطفال والبحث بالاسم أو الكود، أو رفع شيت Excel وسحب بطاقات الـ QR دفعة واحدة.',
            badge: 'استعلام',
            color: 'emerald' as const,
          },
        ],
      };
    }
    if (showRegisterView) {
      return {
        title: 'إرشادات استمارة تسجيل خادم جديد',
        subtitle: 'شرح خطوات الاستمارة والأدوار والمهارات',
        items: [
          {
            title: 'البيانات الشخصية والرقم القومي',
            description: 'أدخل الاسم رباعياً والرقم القومي (١٤ رقماً) ليتم استخراج النوع وتاريخ الميلاد والمحافظة تلقائياً، ثم رقم الموبايل والواتساب والخدمة التابع لها، والبريد الإلكتروني (اختياري للدخول عبر Google).',
            badge: 'البيانات',
            color: 'orange' as const,
          },
          {
            title: 'الفرق بين خادم فريق وخادم فرق عمل',
            description: 'خادم فريق (مشاركون): يرافق فريق المخدومين ويدخل مباشرة ببطاقة الـ QR أو الكود دون كلمة مرور. خادم فرق عمل: للتنظيم والمحطات وإدخال المخدومين، ويحدد مهاراته واسم مستخدم وكلمة مرور خاصة به.',
            badge: 'الأدوار',
            color: 'blue' as const,
          },
          {
            title: 'بطاقة الخادم والـ QR',
            description: 'فور الحفظ تظهر بطاقة الخادم الرسمية محملة بكود الدخول ورمز الـ QR القابل للتحميل والمشاركة.',
            badge: 'البطاقة',
            color: 'emerald' as const,
          },
        ],
      };
    }
    if (currentPage === 'welcome') {
      return {
        title: 'إرشادات صفحة الاستقبال',
        subtitle: 'الصفحة الأولى: الترحيب بالكرنفال',
        items: [
          {
            title: 'مرحباً بكم',
            description: 'تعرض الصفحة شعار الكرنفال والدباجة المعتمدة «المسيح في قلبي، يظهر في حياتي»، ويظهر بالأعلى مؤشر حالة الاتصال بالسيرفر.',
            badge: 'ترحيب',
            color: 'orange' as const,
          },
          {
            title: 'المتابعة للتسجيل',
            description: 'اضغط على زر «استمرار للتسجيل» للانتقال إلى رؤية ورسالة الكرنفال ثم بوابة التسجيل الميداني.',
            badge: 'متابعة',
            color: 'amber' as const,
          },
        ],
      };
    }
    if (currentPage === 'vision') {
      return {
        title: 'إرشادات رؤيتنا ورسالتنا',
        subtitle: 'الصفحة الثانية: الرؤية والرسالة الميدانية',
        items: [
          {
            title: 'الرؤية والمحاور',
            description: 'توضح الرؤية والأهداف المعتمدة للخدمة خلال فعاليات الكرنفال لعام ٢٠٢٧.',
            badge: 'الرؤية',
            color: 'blue' as const,
          },
          {
            title: 'الانتقال للتسجيل',
            description: 'اضغط على زر «استمرار للتسجيل» للوصول إلى خيارات التسجيل الميداني.',
            badge: 'متابعة',
            color: 'orange' as const,
          },
        ],
      };
    }
    if (qrCardLanding) {
      if (qrCardLanding.category === 'staff' || qrCardLanding.category === 'admin') {
        return {
          title:
            qrCardLanding.category === 'admin'
              ? 'إرشادات بطاقة تعريف الأدمن (QR)'
              : 'إرشادات بطاقة تعريف فريق العمل (QR)',
          subtitle: 'التحويل التلقائي لتسجيل الدخول بكلمة المرور',
          items: [
            {
              title: 'الـ QR والكود للتعريف الشخصي فقط',
              description:
                qrCardLanding.category === 'admin'
                  ? 'بطاقة الأدمن تعرض بياناتك التعريفية فقط؛ للانتقال للوحة الإدارة يلزم البريد أو اسم المستخدم وكلمة المرور.'
                  : 'عند مسح بادج فريق العمل، تظهر هذه البطاقة أولاً لعرض الاسم والخدمة ولا تمنح دخولاً دون كلمة المرور.',
              badge: 'تعريف',
              color: 'orange' as const,
            },
            {
              title: 'تحويل تلقائي خلال ٥ ثوانٍ',
              description: 'يتم تحويلك تلقائياً لشاشة الدخول مع تعبئة اسم المستخدم لتكتب كلمة المرور، أو يمكنك إيقاف العد مؤقتاً لمراجعة البطاقة.',
              badge: 'دخول',
              color: 'blue' as const,
            },
          ],
        };
      }
      return {
        title: 'إرشادات بطاقة تعريف المشاركين (QR)',
        subtitle: 'بطاقة التعريف والدخول المباشر لخدام الفرق والمخدومين',
        items: [
          {
            title: 'مراجعة بيانات المشارك',
            description: 'تظهر بطاقة التعريف الكاملة بالاسم والخدمة والفرقة ورمز الـ QR الخاص بالمشارك.',
            badge: 'البطاقة',
            color: 'emerald' as const,
          },
          {
            title: 'دخول مباشر بدون كلمة مرور',
            description: 'اضغط على «دخول مباشر بالـ QR» من أسفل البطاقة لعرض الفرقة ورصيد النقاط وجدول اليوم والتنبيهات مباشرة.',
            badge: 'دخول مباشر',
            color: 'orange' as const,
          },
        ],
      };
    }
    if (currentPage === 'register') {
      return {
        title: 'الشرح الوافي لإرشادات بوابة التسجيل الميداني',
        subtitle: 'الصفحة الثالثة (المرحلة الأولى): تسجيل الخدام وإضافة المخدومين',
        items: [
          {
            title: '١. الخطوة الأولى: تسجيل نفسي كخادم جديد',
            description: 'إذا لم تسجل من قبل في كرنفال ٢٠٢٧، افتح الاستمارة واملأ بياناتك الأساسية (الاسم رباعي، الرقم القومي ١٤ رقماً، رقم الموبايل، والخدمة التابع لها) ليتم حفظ حسابك وتوليد بطاقة الـ QR الرسمية فوراً.',
            badge: 'أول خطوة',
            color: 'orange' as const,
          },
          {
            title: '٢. الخطوة الثانية: إضافة وتكويد المخدومين',
            description: 'مخصصة لخدام المرحلة وأمناء الخدمة المفوضين لإضافة الأطفال فردياً أو عبر شيت إكسيل واستخراج أكوادهم وبطاقات الـ QR. يشترط تسجيل الخادم لنفسه أولاً في الخطوة ١ وحصوله على الصلاحية.',
            badge: 'للمفوضين',
            color: 'blue' as const,
          },
          {
            title: '٣. اشتراطات الدخول وكلمة المرور لأول مرة',
            description: 'للدخول إلى شاشة إضافة المخدومين، اكتب اسمك ثلاثياً وكلمة مرورك الخاصة. إذا كانت هذه أول مرة، اختر «أول مرة تسجل دخولك؟» لتعيين كلمة مرور جديدة بالاسم والرقم القومي (١٤ رقماً)، ويمكنك استعادتها لاحقاً بالرقم القومي.',
            badge: 'كلمة المرور',
            color: 'emerald' as const,
          },
        ],
      };
    }
    if (currentPage === 'login') {
      return {
        title: 'إرشادات شاشة الدخول',
        subtitle: 'طرق الدخول المعتمدة للمشاركين وفريق العمل',
        items: [
          {
            title: 'المشاركون (خدام الفرق والمخدومون)',
            description: 'يدخل خادم الفريق والمخدوم مباشرة بالكود المربوط بالبطاقة أو بمسح رمز الـ QR دون كلمة مرور، كما يمكن لخادم الفريق الدخول بالرقم القومي (١٤ رقماً) ورقم الهاتف المسجل.',
            badge: 'المشاركون',
            color: 'orange' as const,
          },
          {
            title: 'فريق العمل والإدارة',
            description: 'الدخول لخدام فرق العمل والأدمن يكون بالبريد أو اسم المستخدم وكلمة المرور (أو بحساب Google المعتمد). ومسح الـ QR يعرض البطاقة الشخصية فقط ثم يحوّلك لكتابة كلمة المرور.',
            badge: 'فريق العمل',
            color: 'blue' as const,
          },
          {
            title: 'التحقق من الاتصال والأوفلاين',
            description: 'يوضح المؤشر أعلى الشاشة ما إذا كنت متصلاً بالسيرفر أو في وضع الأوفلاين، ويمكنك الضغط عليه لإعادة فحص الاتصال في أي وقت.',
            badge: 'الاتصال',
            color: 'emerald' as const,
          },
        ],
      };
    }
    return undefined;
  }, [
    showProfilePage,
    activeServant,
    isAdminLoggedIn,
    sessionAccessLevel,
    showKidsManager,
    showRegisterView,
    qrCardLanding,
    currentPage,
  ]);

  const activeProfilePoints = React.useMemo(
    () =>
      computeRealProfilePoints({
        servant: activeServant,
        pointsLedger,
        gateCheckins,
        kids,
        codedTeams,
      }),
    [activeServant, pointsLedger, gateCheckins, kids, codedTeams]
  );

  return (
    <div
      className={`min-h-screen w-full max-w-full overflow-x-hidden flex flex-col transition-colors ${
        isLight
          ? 'bg-gradient-to-b from-[#FFFDF7] via-[#FFF9EC] to-[#F4F8FF] text-slate-900'
          : 'bg-gradient-to-b from-[#080C17] via-[#0B101E] to-[#0E1528] text-slate-100'
      }`}
    >
      <div className="print:hidden">
        <CarnivalHeader
          edition={edition}
          servant={activeServant}
          serviceName={services.find((s) => s.id === activeServant?.service_id)?.name}
          servantPoints={{
            total: activeProfilePoints.totalPoints,
            breakdown: activeProfilePoints.breakdown.map((item) => ({
              title: item.title,
              points: item.points,
            })),
          }}
          isAdminLoggedIn={isAdminLoggedIn}
          isLight={isLight}
          adminPanelOpen={adminPanelOpen}
          setAdminPanelOpen={setAdminPanelOpen}
          onOpenProfile={() => setShowProfilePage(true)}
          onLogout={() => {
              appendAuditLog(
                  activeServant?.id || 'null',
                  activeServant?.full_name || 'null',
                  'LOGOUT',
                  `servants/${activeServant?.id}`,
                  {}
              );
              setActiveServant(null);
              setQrCardLanding(null);
              setShowProfilePage(false);
              setShowKidsManager(false);
              setShowRegisterView(false);
              setCurrentPage('welcome');
              setSessionAccessLevel('full');
          }}
          onLogoUpload={handleLogoUpload}
          onSaveHomepageSettings={handleSaveHomepageSettings}
          onToggleTheme={() => setIsLight((prev) => !prev)}
          instructions={currentInstructions}
          connectionIndicator={
            <ConnectionStatusIndicator
              status={serverConnection.status}
              isChecking={serverConnection.isChecking}
              offlineQueueCount={offlineGateQueue.length}
              isLight={isLight}
              onClick={() => {
                setConnectionBannerExpanded((prev) => !prev);
                serverConnection.recheckNow();
              }}
            />
          }
          devAdminTrigger={
            isDevPreviewOnly && !activeServant ? (
              <button
                type="button"
                onClick={() => {
                  setDevAdminError(null);
                  setDevAdminModalOpen(true);
                }}
                aria-label="مدخل الأدمن السريع (معاينة التطوير فقط)"
                title="مدخل الأدمن (يظهر في المعاينة هنا فقط ولا يظهر عند النشر)"
                className={`min-h-[30px] px-2.5 rounded-full border text-[11px] font-extrabold inline-flex items-center gap-1 transition-all cursor-pointer opacity-80 hover:opacity-100 shrink-0 ${
                  isLight
                    ? 'border-slate-300/90 bg-white/90 text-slate-700 hover:border-orange-400 hover:text-orange-700 shadow-2xs'
                    : 'border-slate-700/90 bg-[#12192B]/90 text-slate-300 hover:border-amber-400 hover:text-amber-300'
                }`}
              >
                <Lock className="w-3 h-3 text-orange-500 shrink-0" />
                <span>إدارة</span>
              </button>
            ) : undefined
          }
        />
      </div>

      {/* المحتوى الرئيسي المتجاوب والمتناسق مع الهيدر */}
      <div className="flex-1 max-w-xl w-full mx-auto px-3 sm:px-4 pt-3 sm:pt-4 pb-28 print:max-w-none print:p-0 print:m-0">
          <ConnectionStatusBanner
            status={serverConnection.status}
            isChecking={serverConnection.isChecking}
            lastCheckedAt={serverConnection.lastCheckedAt}
            offlineQueueCount={offlineGateQueue.length}
            forceExpanded={connectionBannerExpanded}
            onCloseExpanded={() => setConnectionBannerExpanded(false)}
            onRetryConnection={serverConnection.recheckNow}
            onSyncOfflineQueue={syncOfflineGateQueue}
            isLight={isLight}
          />
          {isFirebaseAuthChecking && (
            <div
              role="status"
              aria-live="polite"
              className={`mb-3 rounded-2xl px-3.5 py-2.5 border flex items-center justify-center gap-2 text-xs font-extrabold shadow-xs ${
                isLight
                  ? 'bg-amber-50/95 border-amber-200 text-amber-900'
                  : 'bg-[#12192B] border-slate-700 text-amber-300'
              }`}
            >
              <Loader2 className="w-4 h-4 animate-spin text-orange-500 shrink-0" />
              <span>جاري التحقق من الجلسة والاتصال...</span>
            </div>
          )}
          {phase2PreviewMode && !activeServant && (
            <div
              className={`mb-3 rounded-3xl p-3 sm:p-3.5 border-2 shadow-sm space-y-2.5 ${
                isLight
                  ? 'bg-gradient-to-l from-orange-50 via-amber-50 to-sky-50 border-orange-300 text-slate-900'
                  : 'bg-[#121B30] border-orange-500/40 text-slate-100'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-orange-700 dark:text-amber-300">
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>معاينة المرحلة الثانية (مغلقة عن المستخدمين حتى الإطلاق الرسمي)</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPhase2PreviewMode(false);
                    setQrCardLanding(null);
                    setStatusMessage(null);
                    setCurrentPage('welcome');
                  }}
                  className="px-2.5 py-1 rounded-xl border border-slate-300 dark:border-slate-700 bg-white/80 dark:bg-slate-900 text-[11px] font-extrabold hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                >
                  إغلاق المعاينة والعودة للمرحلة ١
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setQrCardLanding(null);
                    setStatusMessage(null);
                    setMainTab('staff');
                    setStaffSubTab('credentials');
                    setCurrentPage('login');
                  }}
                  className={`min-h-[32px] px-3 rounded-xl text-[11px] font-extrabold border cursor-pointer transition-colors ${
                    !qrCardLanding && currentPage === 'login'
                      ? 'bg-orange-600 text-white border-orange-500'
                      : isLight
                      ? 'bg-white border-slate-200 text-slate-700 hover:border-orange-400'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  صفحة ١: شاشة الدخول
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const staffSample =
                      servants.find((s) => classifyQrServantCategory(s) === 'staff') ||
                      servants[0];
                    if (staffSample) openQrIdentificationCard(staffSample, 'staff');
                  }}
                  className={`min-h-[32px] px-3 rounded-xl text-[11px] font-extrabold border cursor-pointer transition-colors ${
                    qrCardLanding?.category === 'staff'
                      ? 'bg-blue-600 text-white border-blue-500'
                      : isLight
                      ? 'bg-white border-slate-200 text-blue-700 hover:border-blue-400'
                      : 'bg-slate-900 border-slate-700 text-sky-300'
                  }`}
                >
                  تجربة QR فريق العمل (تحويل ٥ث)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const teamSample =
                      servants.find((s) => classifyQrServantCategory(s) === 'team_servant') ||
                      servants[0];
                    if (teamSample) openQrIdentificationCard(teamSample, 'team_servant');
                  }}
                  className={`min-h-[32px] px-3 rounded-xl text-[11px] font-extrabold border cursor-pointer transition-colors ${
                    qrCardLanding?.category === 'team_servant'
                      ? 'bg-emerald-600 text-white border-emerald-500'
                      : isLight
                      ? 'bg-white border-slate-200 text-emerald-700 hover:border-emerald-400'
                      : 'bg-slate-900 border-slate-700 text-emerald-300'
                  }`}
                >
                  تجربة QR خادم فريق (دخول مباشر)
                </button>

                {kids[0] && (
                  <button
                    type="button"
                    onClick={() =>
                      openQrIdentificationCard(buildKidAsServantCard(kids[0]), 'kid')
                    }
                    className={`min-h-[32px] px-3 rounded-xl text-[11px] font-extrabold border cursor-pointer transition-colors ${
                      qrCardLanding?.category === 'kid'
                        ? 'bg-teal-600 text-white border-teal-500'
                        : isLight
                        ? 'bg-white border-slate-200 text-teal-700 hover:border-teal-400'
                        : 'bg-slate-900 border-slate-700 text-teal-300'
                    }`}
                  >
                    تجربة QR مخدوم (دخول مباشر)
                  </button>
                )}
              </div>
            </div>
          )}

          {isDevPreviewOnly && viewMode === 'simulation' ? (
            /* شاشة أدوات الاختبار والمحاكاة */
            <div
              className={`rounded-3xl p-5 sm:p-6 border-2 shadow-xl space-y-5 ${
                isLight
                  ? 'bg-white border-amber-200 text-slate-900'
                  : 'bg-[#111829] border-slate-800 text-slate-100'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 shrink-0">
                    <SlidersHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm sm:text-base font-extrabold">
                      أدوات الاختبار والمحاكاة (Development / Testing Only)
                    </h2>
                    <p className="text-[11px] opacity-75">
                      شاشة مخصصة للاختبار — اختر الدخول بالرقم القومي والموبايل أو بالكود
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-orange-600">
                  <Sparkles className="w-4 h-4" />
                  <span>١. الحسابات المسجلة فعلياً ({servants.length}):</span>
                </div>
                <div
                  className={`rounded-2xl p-3.5 border text-xs font-bold ${
                    isLight
                      ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
                  }`}
                >
                  تم حذف جميع الحسابات الوهمية والتجريبية؛ المنظومة تعمل الآن بالحسابات الحقيقية المسجلة فقط.
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-500/15">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-blue-600">
                  <Layers className="w-4 h-4" />
                  <span>٢. تبديل مرحلة الحدث (١..٧):</span>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {EVENT_STAGES.map((st) => {
                    const active = edition.current_stage === st.stage;
                    return (
                      <button
                        key={st.stage}
                        type="button"
                        onClick={() => handleStageChange(st.stage)}
                        className={`min-h-[40px] rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                          active
                            ? 'bg-orange-600 text-white border-orange-500 shadow-xs'
                            : isLight
                            ? 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            : 'bg-[#0C1220] text-slate-300 border-slate-800'
                        }`}
                      >
                        م {st.stage}
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs opacity-80">
                  <strong>{currentStageMeta.title}:</strong> {currentStageMeta.description}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-500/15">
                <button
                  type="button"
                  onClick={() => {
                    setInspectorTab('outbox');
                    setInspectorOpen(true);
                  }}
                  className="min-h-[44px] rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>الإيميلات ({outbox.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInspectorTab('database');
                    setInspectorOpen(true);
                  }}
                  className="min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Database className="w-3.5 h-3.5" />
                  <span>السجلات ({auditLogs.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInspectorTab('checklist');
                    setInspectorOpen(true);
                  }}
                  className="min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <ClipboardCheck className="w-3.5 h-3.5" />
                  <span>الاختبار اليدوي</span>
                </button>
              </div>
            </div>
          ) : uiState === 'loading' ? (
              <div
                className={`rounded-3xl p-10 border text-center space-y-4 ${
                  isLight
                    ? 'bg-white border-amber-200 shadow-lg'
                    : 'bg-[#12192B]/90 border-slate-800 shadow-2xl'
                }`}
              >
                <Loader2 className="w-10 h-10 text-orange-500 animate-spin mx-auto" />
                <h3 className="text-base font-extrabold">
                  جاري التحقق من حالة الدورة ومزامنة الصلاحيات...
                </h3>
              </div>
            ) : qrCardLanding ? (
              /* الشاشة الموازية عند مسح الـ QR: بطاقة التعريف الشخصية
                 - فريق العمل: يعرض عداد تحويل تلقائي (٥ ثوانٍ) إلى شاشة الاسم وكلمة المرور
                 - خدام الفرق والمخدومون: يتيح الدخول المباشر بالـ QR لعرض الفرقة والنقاط والجدول */
              <div className="space-y-4">
                {qrCardLanding.category === 'staff' || qrCardLanding.category === 'admin' ? (
                  <div
                    className={`rounded-3xl p-4 sm:p-5 border-2 shadow-lg space-y-3 ${
                      isLight
                        ? 'bg-gradient-to-l from-amber-50 via-orange-50/90 to-white border-orange-300 text-slate-900'
                        : 'bg-gradient-to-l from-[#1A233A] to-[#12192B] border-orange-500/40 text-slate-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 dark:text-amber-400 shrink-0">
                          <Clock className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xs sm:text-sm font-black text-orange-800 dark:text-amber-300">
                            {qrCardLanding.category === 'admin'
                              ? 'بطاقة تعريف الأدمن (الـ QR يعرض البطاقة فقط)'
                              : 'بطاقة تعريف فريق العمل (التحويل التلقائي لتسجيل الدخول)'}
                          </h3>
                          <p className="text-[11px] sm:text-xs font-bold opacity-85 leading-relaxed">
                            {qrCardLanding.category === 'admin'
                              ? 'بطاقة الـ QR أو الكود تفتح صفحتك التعريفية فقط. للانتقال للوحة الإدارة والصفحة العامة سيتم تحويلك لشاشة الإيميل/اسم المستخدم وكلمة المرور خلال '
                              : 'رمز الـ QR والكود يعرضان هويتك التعريفية فقط. للوصول لمساحة فريق العمل سيتم تحويلك تلقائياً إلى شاشة اسم المستخدم وكلمة المرور خلال '}
                            <span className="font-black text-orange-600 dark:text-amber-300 tabular-nums">
                              {qrCardLanding.secondsLeft}
                            </span>{' '}
                            ثوانٍ.
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 w-12 h-12 rounded-2xl bg-orange-600 text-white flex flex-col items-center justify-center shadow-md">
                        <span className="text-lg font-black leading-none tabular-nums">
                          {qrCardLanding.autoRedirectPaused ? '⏸' : qrCardLanding.secondsLeft}
                        </span>
                        <span className="text-[9px] font-bold">ثانية</span>
                      </div>
                    </div>

                    {!qrCardLanding.autoRedirectPaused && (
                      <div className="w-full h-2 rounded-full bg-orange-200/70 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-l from-orange-500 to-amber-500 transition-all duration-700"
                          style={{ width: `${Math.max(0, Math.min(100, (qrCardLanding.secondsLeft / 5) * 100))}%` }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          redirectStaffQrToPasswordLogin(
                            qrCardLanding.servant,
                            qrCardLanding.category === 'admin' ? 'admin' : 'staff'
                          )
                        }
                        className="min-h-[44px] px-4 rounded-2xl bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                      >
                        <LogIn className="w-4 h-4 shrink-0" />
                        <span>
                          {qrCardLanding.category === 'admin'
                            ? 'الانتقال لشاشة دخول الأدمن (كلمة المرور)'
                            : 'الانتقال لشاشة اسم المستخدم وكلمة المرور'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setQrCardLanding((prev) =>
                            prev ? { ...prev, autoRedirectPaused: !prev.autoRedirectPaused } : prev
                          )
                        }
                        className={`min-h-[44px] px-4 rounded-2xl border text-xs font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors ${
                          isLight
                            ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                            : 'bg-[#0F172A] border-slate-700 text-slate-200 hover:bg-slate-800'
                        }`}
                      >
                        {qrCardLanding.autoRedirectPaused ? (
                          <>
                            <Play className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>استئناف التحويل التلقائي</span>
                          </>
                        ) : (
                          <>
                            <Pause className="w-4 h-4 text-orange-500 shrink-0" />
                            <span>إيقاف العد التلقائي لمراجعة البطاقة</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`rounded-3xl p-4 sm:p-5 border-2 shadow-lg space-y-2.5 ${
                      isLight
                        ? 'bg-gradient-to-l from-emerald-50 via-teal-50/80 to-white border-emerald-300 text-slate-900'
                        : 'bg-gradient-to-l from-[#102925] to-[#12192B] border-emerald-500/40 text-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5">
                        <h3 className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300">
                          {qrCardLanding.category === 'kid'
                            ? 'بطاقة التعريف الشخصية للمخدوم (مشارك بالكرنفال)'
                            : 'بطاقة التعريف الشخصية لخادم الفريق (مشارك بالكرنفال)'}
                        </h3>
                        <p className="text-[11px] sm:text-xs font-bold opacity-85 leading-relaxed">
                          تم التحقق بنجاح. يمكنك مراجعة بطاقتك أو الدخول مباشرة عبر الـ QR أو الكود المربوط لعرض فرقتك ورصيد النقاط وجدول اليوم بدون كلمة مرور.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <ServantIdCardView
                  edition={edition}
                  servant={qrCardLanding.servant}
                  serviceName={
                    services.find((s) => s.id === qrCardLanding.servant.service_id)?.name || 'غير محدد'
                  }
                  isLight={isLight}
                  onUpdateAvatar={
                    qrCardLanding.category === 'kid'
                      ? undefined
                      : (newUrl) => {
                          handleUpdateServantAvatar(qrCardLanding.servant.id, newUrl);
                          setQrCardLanding((prev) =>
                            prev ? { ...prev, servant: { ...prev.servant, avatar_url: newUrl } } : prev
                          );
                        }
                  }
                  primaryActionLabel={
                    qrCardLanding.category === 'staff' || qrCardLanding.category === 'admin'
                      ? qrCardLanding.autoRedirectPaused
                        ? 'الانتقال لشاشة الدخول (اسم المستخدم وكلمة المرور)'
                        : `الانتقال الآن لشاشة الدخول (${qrCardLanding.secondsLeft}ث)`
                      : 'دخول مباشر بالـ QR / الكود (عرض الفرقة والنقاط)'
                  }
                  onPrimaryAction={() => {
                    if (qrCardLanding.category === 'staff' || qrCardLanding.category === 'admin') {
                      redirectStaffQrToPasswordLogin(
                        qrCardLanding.servant,
                        qrCardLanding.category === 'admin' ? 'admin' : 'staff'
                      );
                    } else {
                      const target = qrCardLanding.servant;
                      const cat = qrCardLanding.category;
                      setQrCardLanding(null);
                      setSessionAccessLevel('readonly');
                      setActiveServant(target);
                      appendAuditLog(
                        target.id,
                        target.full_name,
                        'PARTICIPANT_QR_DIRECT_LOGIN',
                        `qr/${target.qr_token}`,
                        { category: cat }
                      );
                    }
                  }}
                  secondaryActionLabel="إغلاق البطاقة والعودة"
                  onSecondaryAction={() => {
                    setQrCardLanding(null);
                    setCurrentPage(phase2PreviewMode || attendancePolicy.allow_user_portal_access ? 'login' : 'welcome');
                  }}
                />
              </div>
            ) : showProfilePage && activeServant ? (
              /* صفحة البروفايل المخصصة للخادم (ProfilePage) */
              <ProfilePage
                servant={activeServant}
                serviceName={services.find((s) => s.id === activeServant.service_id)?.name}
                roles={servantRoles
                  .filter((r) => r.servant_id === activeServant.id)
                  .map((r) => r.role)}
                edition={edition}
                pointsLedger={pointsLedger}
                gateCheckins={gateCheckins}
                kids={kids}
                codedTeams={codedTeams}
                isLight={isLight}
                onClose={() => setShowProfilePage(false)}
                onLogout={() => {
                  appendAuditLog(
                    activeServant.id,
                    activeServant.full_name,
                    'LOGOUT',
                    `servants/${activeServant.id}`,
                    {}
                  );
                  setActiveServant(null);
                  setQrCardLanding(null);
                  setShowProfilePage(false);
                  setShowKidsManager(false);
                  setShowRegisterView(false);
                  setCurrentPage('welcome');
                  setSessionAccessLevel('full');
                }}
              />
            ) : showKidsManager ? (
              /* شاشة تسجيل وتشفير المخدومين (الأطفال) للخدام المفوضين */
              <div className="space-y-4">
                <div
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    isLight
                      ? 'bg-blue-50/90 border-blue-200'
                      : 'bg-blue-500/10 border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600 shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold text-blue-800 dark:text-sky-300">
                        {activeServant && !checkServantCanAddKids(activeServant) && activeServant.can_view_kids_codes
                          ? 'شاشة استعراض وسحب أكواد المخدومين (QR / PIN)'
                          : 'شاشة تسجيل وتشفير المخدومين (الأطفال)'}
                      </div>
                      <div className="text-[10px] opacity-75">
                        الخادم المفوض: {activeServant?.full_name || 'خادم معتمد'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowKidsManager(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap"
                  >
                    العودة لبوابة التسجيل
                  </button>
                </div>

                <KidsRegistrationManager
                  edition={edition}
                  services={services}
                  kids={kids}
                  codedGrades={codedGrades}
                  codedTeams={codedTeams}
                  actorName={activeServant?.full_name || 'خادم مفوض'}
                  actorServiceId={activeServant?.service_id || services[0]?.id || ''}
                  isAdmin={isAdminLoggedIn}
                  canAddKids={activeServant ? checkServantCanAddKids(activeServant) : false}
                  canViewKidsCodes={!!activeServant?.can_view_kids_codes}
                  isKidsRegistrationOpen={attendancePolicy.allow_kids_registration ?? true}
                  isLight={isLight}
                  onAddKids={(newKids) => {
                    setKids((prev) => [...newKids, ...prev]);
                    newKids.forEach((kid) => saveKidToFirestore(kid).catch(console.error));
                    appendAuditLog(
                      activeServant?.id || 'servant',
                      activeServant?.full_name || 'خادم مفوض',
                      'KIDS_REGISTERED_BY_SERVANT',
                      'kids_participants',
                      { count: newKids.length, source: newKids[0]?.source || 'manual' }
                    );
                  }}
                  onDeleteKid={(kidId) => {
                    if (!isAdminLoggedIn) return;
                    setKids((prev) => prev.filter((k) => k.id !== kidId));
                    deleteKidFromFirestore(kidId).catch(console.error);
                  }}
                />
              </div>
            ) : showRegisterView ? (
              /* شاشة تسجيل خادم جديد (الـ ١٠ حقول الذكية) */
              <div className="space-y-4">
                <div
                  className={`flex items-center justify-between p-3 rounded-2xl border ${
                    isLight
                      ? 'bg-orange-50/90 border-orange-200'
                      : 'bg-orange-500/10 border-orange-500/30'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-5 h-5 text-orange-600 shrink-0" />
                    <div>
                      <div className="text-xs font-extrabold text-orange-800 dark:text-amber-300">
                        استمارة تسجيل خادم جديد بالكرنفال
                      </div>
                      <div className="text-[10px] opacity-75">
                        سجل بياناتك المعتمدة للحصول على بطاقة الـ QR وتحديد خدمتك
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRegisterView(false)}
                    className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-extrabold hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer whitespace-nowrap"
                  >
                    العودة لبوابة التسجيل
                  </button>
                </div>

                <RegisterServantView
                  edition={edition}
                  services={services}
                  isLight={isLight}
                  isOffline={!isOnline}
                  simulatedEmptyServices={uiState === 'empty'}
                  isServantRegistrationOpen={attendancePolicy.allow_servant_registration}
                  isUserPortalOpen={attendancePolicy.allow_user_portal_access || phase2PreviewMode}
                  existingUsernames={servants.flatMap((s) =>
                    [s.username, s.admin_username].filter(Boolean) as string[]
                  )}
                  onBackToLogin={() => setShowRegisterView(false)}
                  onRegisterSubmit={handleRegisterServant}
                  onUpdateRegisteredAvatar={handleUpdateServantAvatar}
                  onProceedToStaffLogin={(registeredUsername) => {
                    setShowRegisterView(false);
                    setActiveServant(null);
                    setQrCardLanding(null);
                    setMainTab('staff');
                    setStaffSubTab('credentials');
                    setAdminIdentifier(registeredUsername);
                    setAdminPassword('');
                    setStatusMessage({
                      type: 'success',
                      title: 'تم إنشاء حساب فرق العمل وحفظه بنجاح',
                      body: `اسم المستخدم: ${registeredUsername} — أدخل كلمة المرور التي أنشأتها للدخول وإضافة المخدومين.`,
                    });
                    setCurrentPage('login');
                  }}
                  onEnterReadOnlyProfile={(createdServant) => {
                    if (createdServant.primary_role === 'staff') {
                      setShowRegisterView(false);
                      setActiveServant(null);
                      setMainTab('staff');
                      setStaffSubTab('credentials');
                      setAdminIdentifier(
                        createdServant.username || createdServant.full_name
                      );
                      setAdminPassword('');
                      setCurrentPage('login');
                      return;
                    }
                    if (!attendancePolicy.allow_user_portal_access && !phase2PreviewMode) {
                      setShowRegisterView(false);
                      setStatusMessage({
                        type: 'warning',
                        title: 'تم حفظ تسجيلك وبطاقة الـ QR والكود المربوط بنجاح',
                        body: 'شاشات الدخول للمستخدمين مغلقة حالياً من قِبل الأدمن لحين فتح البوابة رسمياً.',
                      });
                      return;
                    }
                    setShowRegisterView(false);
                    setSessionAccessLevel('readonly');
                    setActiveServant(createdServant);
                  }}
                />
              </div>
            ) : activeServant ? (
              /* شاشة الجلسة النشطة (سواء صلاحية كاملة أو قراءة فقط بعد التسجيل / مسح الـ QR) */
              <SessionDashboardPreview
                edition={edition}
                servant={activeServant}
                roles={servantRoles
                  .filter((r) => r.servant_id === activeServant.id)
                  .map((r) => r.role)}
                serviceName={
                  services.find((s) => s.id === activeServant.service_id)?.name || 'غير محدد'
                }
                allServices={services}
                allServants={servants}
                allServantRoles={servantRoles}
                activityRounds={activityRounds}
                attendancePolicy={attendancePolicy}
                kids={kids}
                codedGrades={codedGrades}
                codedTeams={codedTeams}
                axes={axes}
                history={carnivalHistory}
                isLight={isLight}
                accessLevel={sessionAccessLevel}
                onOpenSettingsModal={() => setAdminPanelOpen(true)}
                onSaveSettings={handleSaveHomepageSettings}
                onLogoUpload={handleLogoUpload}
                onStageChange={handleStageChange}
                onUpdateServantAvatar={handleUpdateServantAvatar}
                isFirebaseAdmin={isFirebaseAdmin}
                firebaseAdminEmail={firebaseAdminEmail}
                isAdminGoogleSigningIn={isAdminGoogleSigningIn}
                adminGoogleAuthError={adminGoogleAuthError}
                onSignInAdminGoogle={handleSignInAdminGoogle}
                onSignOutAdminGoogle={handleSignOutAdminGoogle}
                onUpdateServantStatus={(servantId, newStatus) => {
                  setServants((prev) =>
                    prev.map((s) => {
                      if (s.id !== servantId) return s;
                      const updated = { ...s, status: newStatus };
                      if (isFirebaseAdminUser(auth.currentUser)) {
                        saveServantToFirestore(updated).catch(console.error);
                      }
                      return updated;
                    })
                  );
                  appendAuditLog(
                    activeServant.id,
                    activeServant.full_name,
                    'SERVANT_STATUS_UPDATED',
                    `servants/${servantId}`,
                    { status: newStatus }
                  );
                }}
                onDeleteServant={(servantId) => {
                  setServants((prev) => prev.filter((s) => s.id !== servantId));
                  setServantRoles((prev) => prev.filter((r) => r.servant_id !== servantId));
                  if (isFirebaseAdminUser(auth.currentUser)) {
                    deleteServantFromFirestore(servantId).catch(console.error);
                  }
                  appendAuditLog(
                    activeServant.id,
                    activeServant.full_name,
                    'SERVANT_DELETED_BY_ADMIN',
                    `servants/${servantId}`,
                    {}
                  );
                }}
                onBulkApproveServants={() => {
                  setServants((prev) =>
                    prev.map((s) => {
                      if (s.status !== 'pending') return s;
                      const updated = { ...s, status: 'approved' as const };
                      if (isFirebaseAdminUser(auth.currentUser)) {
                        saveServantToFirestore(updated).catch(console.error);
                      }
                      return updated;
                    })
                  );
                }}
                onToggleServantRole={(servantId, role) => {
                  const exists = servantRoles.some(
                    (r) => r.servant_id === servantId && r.role === role
                  );
                  const nextPortalRoles = exists
                    ? portalRolesRef.current.filter(
                        (r) => !(r.servant_id === servantId && r.role === role)
                      )
                    : [
                        ...portalRolesRef.current.filter(
                          (r) => !(r.servant_id === servantId && r.role === role)
                        ),
                        { id: createRecordId('sr'), servant_id: servantId, role },
                      ];
                  portalRolesRef.current = nextPortalRoles;

                  const targetServant = servantsListRef.current.find((s) => s.id === servantId);
                  let nextServants = servantsListRef.current;
                  if (exists && targetServant && targetServant.primary_role === role) {
                    const updatedServant: Servant = { ...targetServant, primary_role: null };
                    nextServants = servantsListRef.current.map((s) =>
                      s.id === servantId ? updatedServant : s
                    );
                    servantsListRef.current = nextServants;
                    setServants(nextServants);
                    if (isFirebaseAdminUser(auth.currentUser)) {
                      saveServantToFirestore(updatedServant).catch(console.error);
                    }
                  }

                  setServantRoles(mergeServantRoles(nextPortalRoles, nextServants));
                  if (isFirebaseAdminUser(auth.currentUser)) {
                    savePortalConfigToFirestore(edition.id, {
                      servant_roles: nextPortalRoles,
                    }).catch(console.error);
                  }
                }}
                onToggleServantKidsCodesPermission={(servantId) => {
                  setServants((prev) =>
                    prev.map((s) => {
                      if (s.id !== servantId) return s;
                      const updated = { ...s, can_view_kids_codes: !s.can_view_kids_codes };
                      if (isFirebaseAdminUser(auth.currentUser)) {
                        saveServantToFirestore(updated).catch(console.error);
                      }
                      return updated;
                    })
                  );
                }}
                onToggleServantCodingPermission={(servantId) => {
                  setServants((prev) =>
                    prev.map((s) => {
                      if (s.id !== servantId) return s;
                      const updated = { ...s, can_manage_coding: !s.can_manage_coding };
                      if (isFirebaseAdminUser(auth.currentUser)) {
                        saveServantToFirestore(updated).catch(console.error);
                      }
                      return updated;
                    })
                  );
                }}
                onSaveCodedGrades={(newGrades) => {
                  setCodedGrades(newGrades);
                  const actorId = isFirebaseAdminUser(auth.currentUser)
                    ? undefined
                    : activeServant.id;
                  saveCodingConfigToFirestore(
                    edition.id,
                    { coded_grades: newGrades },
                    actorId
                  ).catch(console.error);
                  if (isFirebaseAdminUser(auth.currentUser)) {
                    savePortalConfigToFirestore(edition.id, {
                      coded_grades: newGrades,
                    }).catch(console.error);
                  }
                }}
                onSaveCodedTeams={(newTeams) => {
                  setCodedTeams(newTeams);
                  const actorId = isFirebaseAdminUser(auth.currentUser)
                    ? undefined
                    : activeServant.id;
                  saveCodingConfigToFirestore(
                    edition.id,
                    { coded_teams: newTeams },
                    actorId
                  ).catch(console.error);
                  if (isFirebaseAdminUser(auth.currentUser)) {
                    savePortalConfigToFirestore(edition.id, {
                      coded_teams: newTeams,
                    }).catch(console.error);
                  }
                }}
                onSaveActivityRounds={(newRounds) => {
                  setActivityRounds(newRounds);
                  if (isFirebaseAdminUser(auth.currentUser)) {
                    savePortalConfigToFirestore(edition.id, {
                      activity_rounds: newRounds,
                    }).catch(console.error);
                  }
                }}
                onSaveAttendancePolicy={(newPolicy) => {
                  setAttendancePolicy(newPolicy);
                  if (isFirebaseAdminUser(auth.currentUser)) {
                    savePortalConfigToFirestore(edition.id, {
                      attendance_policy: newPolicy,
                    }).catch(console.error);
                  }
                }}
                onAddKids={(newKids) => {
                  setKids((prev) => [...newKids, ...prev]);
                  newKids.forEach((kid) => saveKidToFirestore(kid).catch(console.error));
                  appendAuditLog(
                    activeServant.id,
                    activeServant.full_name,
                    'KIDS_REGISTERED',
                    'kids_participants',
                    { count: newKids.length, source: newKids[0]?.source || 'manual' }
                  );
                }}
                onDeleteKid={(kidId) => {
                  setKids((prev) => prev.filter((k) => k.id !== kidId));
                  if (isFirebaseAdminUser(auth.currentUser)) {
                    deleteKidFromFirestore(kidId).catch(console.error);
                  }
                }}
                onLogout={() => {
                  appendAuditLog(
                    activeServant.id,
                    activeServant.full_name,
                    'LOGOUT',
                    `servants/${activeServant.id}`,
                    {}
                  );
                  setActiveServant(null);
                  setSessionAccessLevel('full');
                }}
                onLogRlsTest={(action, target, allowed, reason) => {
                  appendAuditLog(activeServant.id, activeServant.full_name, action, target, {
                    allowed,
                    reason: reason.slice(0, 70),
                  });
                }}
                gateCheckins={gateCheckins}
                pointsLedger={pointsLedger}
                emergencyAlerts={emergencyAlerts}
                offlineQueueCount={offlineGateQueue.length}
                onSyncOfflineQueue={syncOfflineGateQueue}
                onRecordGateCheckin={handleRecordGateCheckin}
                onAddPointsEntry={handleAddPointsEntry}
                onReassignKidTeam={handleReassignKidTeam}
                onCreateAlert={handleCreateAlert}
                onUpdateAlertStatus={handleUpdateAlertStatus}
                auditLogs={auditLogs}
                demoDataCleared={demoDataCleared}
                demoCleanedAt={demoCleanedAt}
                onCleanupDemoData={handleCleanupDemoData}
              />
            ) : (
              <AnimatePresence mode="wait" custom={pageDirection} initial={false}>
                {currentPage === 'welcome' ? (
                  /* =====================================================================
                     الصفحة الأولى (١): الصفحة العامة — صفحة الاستقبال
                     في المنتصف لوجو الكرنفال وتحتها دباجة: "المسيح في قلبي، يظهر في حياتي"
                     وتحتها زرار "استمرار للتسجيل" يدخلنا على الصفحة التانية
                     ===================================================================== */
                  <motion.div
                    key="page-welcome"
                    custom={pageDirection}
                    variants={rtlPageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className={`rounded-3xl p-6 sm:p-8 border-2 text-center space-y-6 ${
                      isLight
                        ? 'bg-white border-amber-200/90 shadow-xl shadow-amber-900/5'
                        : 'bg-[#12192B]/95 border-slate-800/90 shadow-2xl shadow-black/60'
                    }`}
                  >
                    {/* لوجو الكرنفال الكبير في منتصف الصفحة */}
                    <div className="flex flex-col items-center justify-center pt-2">
                      <motion.div
                        variants={staggeredItemVariants}
                        className={`w-44 h-44 sm:w-52 sm:h-52 rounded-3xl border-4 overflow-hidden bg-white flex items-center justify-center shadow-xl ${
                          isLight
                            ? 'border-amber-300 shadow-orange-500/10'
                            : 'border-amber-500/40 shadow-black/50'
                        }`}
                      >
                        {edition.carnival_logo_url && !welcomeLogoError ? (
                          <img
                            src={edition.carnival_logo_url}
                            alt="لوجو الكرنفال"
                            referrerPolicy="no-referrer"
                            onError={() => setWelcomeLogoError(true)}
                            className="w-full h-full object-contain p-2"
                          />
                        ) : (
                          <div className="flex flex-col items-center justify-center p-4 text-center">
                            <Sparkles className="w-14 h-14 text-orange-500" />
                            <span className="mt-2 text-sm font-extrabold text-orange-600">
                              {edition.name}
                            </span>
                          </div>
                        )}
                      </motion.div>

                      {/* الدباجة تحت لوجو الكرنفال مباشرة */}
                      <motion.div variants={staggeredItemVariants} className="mt-6 space-y-2">
                        <div
                          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl border-2 text-base sm:text-xl font-extrabold tracking-wide shadow-xs ${
                            isLight
                              ? 'bg-gradient-to-l from-amber-50 via-orange-50 to-amber-50 border-amber-300 text-orange-700'
                              : 'bg-[#17213A] border-amber-500/40 text-amber-300'
                          }`}
                        >
                          <Heart className="w-5 h-5 text-rose-500 fill-rose-500 shrink-0" />
                          <span>«{edition.motto || 'المسيح في قلبي، يظهر في حياتي'}»</span>
                        </div>
                      </motion.div>
                    </div>

                    {/* زر استمرار للتسجيل -> ينقل للصفحة الثانية (رؤيتنا ورسالتنا) */}
                    <motion.div variants={staggeredItemVariants} className="pt-2">
                      <button
                        type="button"
                        onClick={() => navigateToPage('vision')}
                        className="w-full min-h-[54px] rounded-full bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
                      >
                        <span>استمرار للتسجيل</span>
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    </motion.div>
                  </motion.div>
                ) : currentPage === 'vision' ? (
                  /* =====================================================================
                     الصفحة الثانية (٢): رؤيتنا ورسالتنا (الرؤية + الأهداف + الرسالة)
                     وتحتها زرار "استمرار للتسجيل" يدخلنا على الصفحة التالتة
                     ===================================================================== */
                  <motion.div
                    key="page-vision"
                    custom={pageDirection}
                    variants={rtlPageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className={`rounded-3xl p-5 sm:p-7 border-2 space-y-5 ${
                      isLight
                        ? 'bg-white border-amber-200/90 shadow-xl shadow-amber-900/5'
                        : 'bg-[#12192B]/95 border-slate-800/90 shadow-2xl shadow-black/60'
                    }`}
                  >
                    <motion.div
                      variants={staggeredItemVariants}
                      className="flex items-center justify-between pb-3 border-b border-slate-500/15"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-500 shrink-0">
                          <Compass className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-base sm:text-lg font-extrabold">رؤيتنا ورسالتنا</h2>
                          <p className="text-[11px] opacity-75">
                            {edition.name} · {edition.church_name}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigateToPage('welcome')}
                        className={`min-h-[36px] px-3 rounded-xl border text-xs font-extrabold flex items-center gap-1 cursor-pointer ${
                          isLight
                            ? 'border-amber-200 bg-amber-50/70 text-slate-700 hover:bg-amber-100'
                            : 'border-slate-700 bg-slate-800 text-slate-200'
                        }`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>السابق</span>
                      </button>
                    </motion.div>

                    {/* ١. الرؤية */}
                    <motion.div
                      variants={staggeredItemVariants}
                      className={`rounded-2xl p-4 border-2 space-y-2 ${
                        isLight
                          ? 'bg-gradient-to-b from-amber-50/80 to-white border-amber-200'
                          : 'bg-[#0D1323] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-orange-600 dark:text-amber-400">
                        <Sparkles className="w-4 h-4 shrink-0" />
                        <span>الرؤية</span>
                      </div>
                      <p className="text-xs sm:text-sm leading-relaxed font-bold opacity-95">
                        إعداد طفل مسيحي واعٍ بهويته في المسيح، ومدرك لبنوّته لله، يسعى أن يعكس صورة المسيح في مختلف جوانب حياته؛ من مظهره وسلوكه، إلى طريقة تفكيره وكلامه، وتفاعلاته وعلاقاته، وصولًا إلى اختياراته ونجاحاته، ليكون حضوره في كل مكان شهادة حيّة لانتمائه للمسيح.
                      </p>
                    </motion.div>

                    {/* ٢. الأهداف */}
                    <motion.div
                      variants={staggeredItemVariants}
                      className={`rounded-2xl p-4 border-2 space-y-3 ${
                        isLight
                          ? 'bg-sky-50/50 border-sky-200'
                          : 'bg-[#0D1323] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 text-sm sm:text-base font-extrabold text-blue-600 dark:text-sky-400">
                        <Target className="w-4 h-4 shrink-0" />
                        <span>الأهداف</span>
                      </div>

                      <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed">
                        <motion.div
                          variants={staggeredItemVariants}
                          className={`p-3 rounded-xl border ${
                            isLight ? 'bg-white border-sky-100' : 'bg-[#141D33] border-slate-700'
                          }`}
                        >
                          <span className="font-extrabold text-orange-600 dark:text-amber-400">
                            ١- الوعي والفهم:{' '}
                          </span>
                          <span className="font-bold">
                            إن الولد يعرف ويفهم ويؤمن إنه مسيحي، وإنه ابن ربنا، ويكون عنده فهم حقيقي لهويته كمسيحي وصفات المسيح والصورة اللي المفروض يكون عليها.
                          </span>
                        </motion.div>

                        <motion.div
                          variants={staggeredItemVariants}
                          className={`p-3 rounded-xl border ${
                            isLight ? 'bg-white border-sky-100' : 'bg-[#141D33] border-slate-700'
                          }`}
                        >
                          <span className="font-extrabold text-blue-600 dark:text-sky-400">
                            ٢- التطبيق العملي:{' '}
                          </span>
                          <span className="font-bold">
                            إزاي يترجم الفهم والإيمان ده في حياته وتصرفاته اليومية، ويعيش فعلاً كابن لربنا من خلال انشطة تفاعلية ومواقف حياتية.
                          </span>
                        </motion.div>

                        <motion.div
                          variants={staggeredItemVariants}
                          className={`p-3 rounded-xl border ${
                            isLight ? 'bg-white border-sky-100' : 'bg-[#141D33] border-slate-700'
                          }`}
                        >
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                            ٣- الاستمرار والثبات:{' '}
                          </span>
                          <span className="font-bold">
                            إيه اللي يساعده يفضل ثابت في إيمانه وهويته المسيحية، ويعرف يحافظ عليهم ويكبر فيهم مع الوقت.
                          </span>
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* ٣. الرسالة */}
                    <motion.div
                      variants={staggeredItemVariants}
                      className={`rounded-2xl p-4 border-2 text-center space-y-1.5 ${
                        isLight
                          ? 'bg-gradient-to-l from-amber-50 via-orange-50 to-amber-50 border-amber-300'
                          : 'bg-[#17213A] border-amber-500/40'
                      }`}
                    >
                      <div className="text-xs font-extrabold opacity-75">الرسالة</div>
                      <div className="text-base sm:text-lg font-extrabold text-orange-600 dark:text-amber-300">
                        «المسيح في قلبي، يظهر في حياتي».
                      </div>
                    </motion.div>

                    {/* زر استمرار للتسجيل -> ينقل للصفحة الثالثة (بوابة التسجيل) */}
                    <motion.div variants={staggeredItemVariants}>
                      <button
                        type="button"
                        onClick={() => navigateToPage('register')}
                        className="w-full min-h-[54px] rounded-full bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-sm sm:text-base shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] cursor-pointer"
                      >
                        <span>استمرار للتسجيل</span>
                        <ArrowLeft className="w-5 h-5" />
                      </button>
                    </motion.div>
                  </motion.div>
                ) : currentPage === 'register' ? (
                  /* =====================================================================
                     الصفحة الثالثة (٣): بوابة التسجيل الميداني (المرحلة الأولى: الإعداد والتسجيل)
                     ١. تسجيل نفسي خادم جديد
                     ٢. تسجيل وإضافة المخدومين (للخدام المفوضين بالرقم القومي + الموبايل أو الـ QR + القومي)
                     ===================================================================== */
                  <motion.div
                    key="page-register"
                    custom={pageDirection}
                    variants={rtlPageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    className="space-y-4"
                  >
                    {/* ترويسة صفحة التسجيل الميداني */}
                    <div
                      className={`rounded-2xl p-4 border-2 text-center space-y-1.5 transition-colors ${
                        isLight
                          ? 'bg-gradient-to-l from-amber-50/90 via-orange-50/80 to-amber-50/90 border-amber-300/80 shadow-md shadow-amber-900/5'
                          : 'bg-[#12192B]/95 border-slate-800 shadow-2xl shadow-black/60'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gradient-to-l from-orange-500 to-amber-500 text-white flex items-center justify-center mx-auto shadow-md shadow-orange-500/20">
                        <UserPlus className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base sm:text-lg font-extrabold">بوابة التسجيل الميداني</h2>
                        <p className="text-xs opacity-75 mt-0.5">
                          اختر نوع التسجيل للمتابعة في فعاليات الكرنفال
                        </p>
                      </div>
                    </div>

                    {/* رسائل التنبيه والخطأ */}
                    {statusMessage && (
                      <div
                        className={`rounded-2xl p-3.5 border text-xs space-y-1 ${
                          statusMessage.type === 'error'
                            ? isLight
                              ? 'bg-red-50 border-red-300 text-red-900'
                              : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
                            : statusMessage.type === 'warning'
                            ? isLight
                              ? 'bg-amber-50 border-amber-300 text-amber-900'
                              : 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : isLight
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        <div className="font-extrabold flex items-center gap-1.5">
                          {statusMessage.type === 'error' ? (
                            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <span>{statusMessage.title}</span>
                        </div>
                        <p className="leading-relaxed opacity-90">{statusMessage.body}</p>
                      </div>
                    )}

                    {/* كارت الخيار الأول: ١. تسجيل نفسي كخادم جديد */}
                    <div
                      className={`rounded-2xl p-4 border-2 transition-all space-y-3 ${
                        isLight
                          ? 'bg-white border-amber-200/90 hover:border-orange-300 shadow-md shadow-amber-900/5'
                          : 'bg-[#12192B]/95 border-slate-800 hover:border-slate-700 shadow-xl'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
                          <UserPlus className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-extrabold whitespace-nowrap shrink-0">
                              الخطوة ١
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold">تسجيل نفسي كخادم جديد</h3>
                          </div>
                          <p className="text-[11px] sm:text-xs font-bold opacity-80 leading-relaxed">
                            للخدام غير المسجلين بعد: املأ استمارة بياناتك وحدد خدمتك لاستخراج بطاقة الـ QR المعتمدة.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setStatusMessage(null);
                          setShowRegisterView(true);
                        }}
                        className="w-full min-h-[46px] rounded-xl bg-gradient-to-l from-orange-500 via-red-500 to-amber-500 hover:from-orange-600 hover:to-red-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
                      >
                        <UserPlus className="w-4 h-4 shrink-0" />
                        <span>تسجيل نفسي كخادم جديد</span>
                        <ArrowLeft className="w-4 h-4 shrink-0" />
                      </button>
                    </div>

                    {/* كارت الخيار الثاني: ٢. إضافة المخدومين */}
                    <div
                      className={`rounded-2xl p-4 border-2 transition-all space-y-3 ${
                        isLight
                          ? 'bg-white border-blue-200/90 hover:border-blue-400 shadow-md shadow-blue-900/5'
                          : 'bg-[#12192B]/95 border-slate-800 hover:border-slate-700 shadow-xl'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                          <Users className="w-5 h-5" />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-600 text-white font-extrabold whitespace-nowrap shrink-0">
                              الخطوة ٢
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold">إضافة المخدومين</h3>
                          </div>
                          <p className="text-[11px] sm:text-xs font-bold opacity-80 leading-relaxed">
                            للخدام المفوضين (بعد تسجيلهم في الخطوة ١): إضافة وتكويد الأطفال عبر الاسم والرقم السري بالرقم القومي.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenKidsRegistration}
                        className="w-full min-h-[46px] rounded-xl bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer transition-transform active:scale-[0.99]"
                      >
                        <Users className="w-4 h-4 shrink-0" />
                        <span>إضافة المخدومين</span>
                        <ArrowLeft className="w-4 h-4 shrink-0" />
                      </button>
                    </div>

                    {/* تلميح مختصر للإشارة للشرح الوافي في أيقونة الاستفهام بالأعلى */}
                    <div
                      className={`rounded-2xl px-3.5 py-2.5 border text-[11px] font-bold flex items-center gap-2 ${
                        isLight
                          ? 'bg-slate-50/90 border-slate-200 text-slate-600'
                          : 'bg-[#0F172A]/80 border-slate-800 text-slate-300'
                      }`}
                    >
                      <HelpCircle className="w-4 h-4 text-orange-500 shrink-0" />
                      <span>
                        لشرح وافٍ لاشتراطات التسجيل وضبط كلمة المرور لأول مرة، اضغط على أيقونة «؟» أعلى الشاشة.
                      </span>
                    </div>
                  </motion.div>
                ) : (
                  /* صفحة تسجيل الدخول العامة المؤجلة (الصفحة الرابعة لاحقاً) */
                  <motion.div
                    key="page-login"
                    custom={pageDirection}
                    variants={rtlPageVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <PortalLoginForm
                      isLight={isLight}
                      mainTab={mainTab}
                      onMainTabChange={(t) => {
                        setMainTab(t);
                        setStatusMessage(null);
                      }}
                      participantSubTab={participantSubTab}
                      onParticipantSubTabChange={(st) => {
                        setParticipantSubTab(st);
                        setStatusMessage(null);
                      }}
                      staffSubTab={staffSubTab}
                      onStaffSubTabChange={(st) => {
                        setStaffSubTab(st);
                        setStatusMessage(null);
                      }}
                      recoveryNatId={recoveryNatId}
                      onRecoveryNatIdChange={setRecoveryNatId}
                      recoveryPhone={recoveryPhone}
                      onRecoveryPhoneChange={setRecoveryPhone}
                      pinCode={pinCode}
                      onPinCodeChange={setPinCode}
                      adminIdentifier={adminIdentifier}
                      onAdminIdentifierChange={setAdminIdentifier}
                      adminPassword={adminPassword}
                      onAdminPasswordChange={setAdminPassword}
                      onNationalIdLogin={handleNationalIdDirectLogin}
                      onCodeLogin={(e) => handleCodeLogin(e, pinCode, 'participant_pin')}
                      onStaffCredentialsLogin={handleStaffCredentialsLogin}
                      onOpenQrScanner={() => {
                        setQrModalError(null);
                        setQrModalOpen(true);
                        setStatusMessage(null);
                      }}
                      onOpenRegisterServant={() => setShowRegisterView(true)}
                      onOpenStaffPasswordSetup={() => {
                        setServantVerifyPurpose('portal_staff_login');
                        setServantAuthView('first_time');
                        setServantVerifyError(null);
                        setServantVerifySuccess(null);
                        if (adminIdentifier.trim()) {
                          setServantFirstTimeName(adminIdentifier.trim());
                        }
                        setServantVerifyModalOpen(true);
                      }}
                      onGoogleServantLogin={handleServantGoogleLogin}
                      statusMessage={statusMessage}
                      recoveryAttempts={recoveryAttempts}
                      maxRecoveryAttempts={MAX_RECOVERY_ATTEMPTS}
                      isAuthLoading={isAuthLoading}
                      authLoadingMessage={authLoadingMessage}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}
        </div>

        {/* المنطقة الثالثة (Row 3): الشريط السفلي الثابت (Footer) */}
        <div
          className={`row-start-3 col-span-1 w-full min-w-0 sticky bottom-0 z-30 pt-2 pb-2 backdrop-blur-md space-y-2 transition-colors ${
            isLight ? 'bg-[#FFFDF7]/92' : 'bg-[#080C17]/92'
          }`}
        >
          {/* شريط التنقل بين الصفحات الثلاث في المرحلة الأولى (١. الاستقبال | ٢. رؤيتنا ورسالتنا | ٣. التسجيل) */}
          {!activeServant && !showRegisterView && !showKidsManager && !qrCardLanding && !phase2PreviewMode && viewMode === 'actual' ? (
            <div className="flex justify-center w-full">
              <div
                className={`p-1 rounded-full border inline-flex items-center justify-center gap-1 max-w-full overflow-x-auto ${
                  isLight
                    ? 'bg-white/95 border-amber-200 shadow-sm'
                    : 'bg-[#12192B] border-slate-800 shadow-md'
                }`}
              >
                {(
                  [
                    { id: 'welcome', label: '١. الاستقبال' },
                    { id: 'vision', label: '٢. رؤيتنا ورسالتنا' },
                    { id: 'register', label: '٣. التسجيل' },
                  ] as const
                ).map((step) => {
                  const isCurrent = currentPage === step.id;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => {
                        navigateToPage(step.id);
                        setStatusMessage(null);
                      }}
                      className={`relative min-h-[30px] px-3 rounded-full text-[11px] font-extrabold transition-colors cursor-pointer whitespace-nowrap overflow-hidden ${
                        isCurrent
                          ? 'text-white'
                          : isLight
                          ? 'text-slate-600 hover:text-orange-600'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {isCurrent && (
                        <motion.span
                          layoutId="activePortalStepPill"
                          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                          className="absolute inset-0 rounded-full bg-gradient-to-l from-orange-500 to-amber-500 shadow-2xs"
                        />
                      )}
                      <span className="relative z-10">{step.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : activeServant ? (
            /* شريط المستخدم السفلي بعد الدخول في نفس المكان متوسطناً فوق الفوتر */
            <div className="flex justify-center w-full">
              <div
                className={`p-1 rounded-full border inline-flex items-center justify-center gap-1 max-w-full overflow-x-auto ${
                  isLight
                    ? 'bg-white/95 border-amber-200 shadow-sm'
                    : 'bg-[#12192B] border-slate-800 shadow-md'
                }`}
              >
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="min-h-[30px] px-3 rounded-full text-[11px] font-extrabold bg-gradient-to-l from-orange-500 to-amber-500 text-white cursor-pointer whitespace-nowrap"
                >
                  ١. بطاقتي والـ QR
                </button>
                <button
                  type="button"
                  onClick={() => window.scrollTo({ top: 380, behavior: 'smooth' })}
                  className={`min-h-[30px] px-3 rounded-full text-[11px] font-extrabold cursor-pointer whitespace-nowrap ${
                    isLight
                      ? 'text-slate-700 hover:text-orange-600'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  ٢. المهام والجولات
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveServant(null);
                    setQrCardLanding(null);
                    setSessionAccessLevel('full');
                  }}
                  className="min-h-[30px] px-3 rounded-full text-[11px] font-extrabold text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 cursor-pointer whitespace-nowrap"
                >
                  ٣. تسجيل الخروج
                </button>
              </div>
            </div>
          ) : null}

          {/* ٢. سطر اسم الكنيسة والكرنفال في الـ Footer بالأسفل + زر تثبيت التطبيق */}
          <div className="w-full flex items-center justify-between gap-2">
            <div
              onClick={isAdminLoggedIn ? () => setAdminPanelOpen(true) : undefined}
              title={isAdminLoggedIn ? 'اضغط لتعديل نص الشريط السفلي من لوحة الأدمن' : undefined}
              className={`flex-1 min-w-0 rounded-2xl border py-1.5 px-3 text-center text-[11px] font-extrabold flex items-center justify-center gap-1.5 ${
                isAdminLoggedIn ? 'cursor-pointer hover:border-orange-400' : 'cursor-default'
              } ${
                isLight
                  ? 'border-amber-200/80 bg-white/90 text-slate-600'
                  : 'border-slate-800/80 bg-[#0D1323]/90 text-slate-400'
              }`}
            >
              <span className="block leading-snug break-words">
                {edition.footer_text || `${edition.church_name} · ${edition.name}`}
              </span>
              {isAdminLoggedIn && <Edit3 className="w-3 h-3 text-orange-500 shrink-0" />}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <PWAInstallButton isLight={isLight} />
            </div>
          </div>
        </div>

      {/* نافذة مسح الـ QR الميدانية:
          - المستوى ١ (أدمن) و ٢ (فريق عمل): تعرض بطاقة التعريف الشخصية ثم تحوّل لشاشة كلمة المرور
          - المستوى ٣ (خادم مشاركون) و ٤ (مخدوم): تفتح البطاقة مع إمكانية الدخول المباشر */}
      {qrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-xs p-3 sm:p-4">
          <div
            className={`w-full max-w-md rounded-3xl border-2 p-5 shadow-2xl space-y-4 text-center ${
              isLight
                ? 'bg-white border-amber-200 text-slate-900'
                : 'bg-[#111829] border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-500/20">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold">
                <QrCode className="w-4 h-4 text-orange-500" />
                <span>مسح رمز الـ QR الميداني</span>
              </div>
              <button
                type="button"
                onClick={() => setQrModalOpen(false)}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center hover:bg-slate-500/10 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`aspect-video max-w-[230px] mx-auto rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-3 space-y-1.5 ${
                isLight
                  ? 'bg-amber-50/60 border-orange-300 text-slate-700'
                  : 'bg-[#0C1220] border-orange-500/40 text-slate-300'
              }`}
            >
              <Camera className="w-8 h-8 text-orange-500 animate-pulse" />
              <p className="text-xs font-extrabold">وجّه الكاميرا نحو رمز الـ QR المطبوع</p>
              <p className="text-[10px] opacity-75 leading-relaxed">
                فريق العمل والأدمن: يعرض البطاقة الشخصية فقط ثم يطلب كلمة المرور · المشاركون: يفتح البطاقة مع دخول مباشر
              </p>
            </div>

            {qrModalError && (
              <div className="rounded-xl p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-[11px] font-extrabold">
                {qrModalError}
              </div>
            )}

            <form onSubmit={handleQrModalSubmit} className="space-y-2.5 text-right">
              <div>
                <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                  <label className="text-[11px] font-extrabold">رمز أو محتوى الـ QR الممسوح من البادج:</label>
                </div>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={qrInputToken}
                  onChange={(e) => setQrInputToken(e.target.value)}
                  placeholder="أدخل رمز الـ QR أو الكود المطبوع على البادج"
                  className={`w-full min-h-[40px] px-3 rounded-xl border text-center font-[family-name:var(--font-mono)] text-xs font-extrabold outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                      : 'bg-[#171F32] border-slate-700 text-white focus:border-orange-500'
                  }`}
                />
                {qrInputToken.trim() && decodeCarnivalQrPayload(qrInputToken) && (
                  <div className="mt-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 space-y-0.5">
                    <div>
                      ✓ قراءة فورية للـ QR: <strong>{decodeCarnivalQrPayload(qrInputToken)?.name}</strong>
                    </div>
                    <div dir="ltr" className="font-mono text-[10px] opacity-85">
                      Code: {decodeCarnivalQrPayload(qrInputToken)?.code}
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full min-h-[42px] rounded-full bg-gradient-to-l from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-xs font-extrabold cursor-pointer shadow-sm"
              >
                فتح بطاقة التعريف الشخصية بالـ QR
              </button>
            </form>

            <button
              type="button"
              onClick={() => setQrModalOpen(false)}
              className="w-full min-h-[34px] rounded-full border border-slate-400/30 text-xs font-bold opacity-80 hover:opacity-100 cursor-pointer"
            >
              إغلاق الماسح والعودة
            </button>
          </div>
        </div>
      )}

      {/* نافذة التحقق ودخول الخادم لتسجيل المخدومين:
          - الدخول بالاسم واليوزر والباسورد فقط (بدون QR)
          - لأول مرة: الدخول بالاسم ثلاثي والرقم القومي لضبط رقم سري خاص
          - في حال نسيان الباسورد: استعادته وتحديثه بالرقم القومي */}
      {servantVerifyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4">
          <div
            className={`relative overflow-hidden w-full max-w-md rounded-3xl border-2 p-5 shadow-2xl space-y-4 text-right max-h-[90vh] overflow-y-auto ${
              isLight
                ? 'bg-white border-blue-200 text-slate-900'
                : 'bg-[#111829] border-slate-800 text-slate-100'
            }`}
          >
            {isAuthLoading && (
              <div
                role="status"
                aria-live="polite"
                className={`absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 p-6 text-center backdrop-blur-xs ${
                  isLight ? 'bg-white/85 text-slate-900' : 'bg-[#0B101E]/85 text-slate-100'
                }`}
              >
                <div className="w-14 h-14 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-sky-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-extrabold">{authLoadingMessage}</p>
                  <p className="text-[11px] opacity-75">يرجى الانتظار لحظات حتى إتمام المصادقة...</p>
                </div>
              </div>
            )}

            {/* رأس النافذة */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-500/20">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-blue-600 dark:text-sky-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {servantAuthView === 'login'
                    ? servantVerifyPurpose === 'portal_staff_login'
                      ? 'دخول فريق العمل بالاسم وكلمة المرور'
                      : 'دخول خادم لتسجيل مخدومين'
                    : servantAuthView === 'first_time'
                    ? 'ضبط كلمة المرور بالاسم والرقم القومي'
                    : 'استعادة وإعادة ضبط كلمة المرور'}
                </span>
              </div>
              <button
                type="button"
                disabled={isAuthLoading}
                onClick={() => setServantVerifyModalOpen(false)}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center hover:bg-slate-500/10 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {servantVerifyError && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold leading-relaxed">
                {servantVerifyError}
              </div>
            )}

            {servantVerifySuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-300 text-xs font-bold leading-relaxed">
                {servantVerifySuccess}
              </div>
            )}

            {/* النموذج الأول: تسجيل دخول الخادم بالاسم والباسورد */}
            {servantAuthView === 'login' ? (
              <form onSubmit={handleServantPasswordLogin} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    اسم الخادم ثلاثياً (أو اسم المستخدم):
                  </label>
                  <input
                    type="text"
                    required
                    value={servantLoginName}
                    onChange={(e) => setServantLoginName(e.target.value)}
                    placeholder="اكتب اسمك ثلاثياً كما تم تسجيله"
                    className={`w-full min-h-[42px] px-3.5 rounded-xl border text-xs font-extrabold outline-none transition-colors ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    الرقم السري الخاص بالخادم:
                  </label>
                  <input
                    type="password"
                    required
                    value={servantLoginPassword}
                    onChange={(e) => setServantLoginPassword(e.target.value)}
                    placeholder="أدخل رقمك السري"
                    className={`w-full min-h-[42px] px-3.5 rounded-xl border text-xs font-extrabold outline-none tracking-wider transition-colors ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full min-h-[46px] rounded-2xl bg-gradient-to-l from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white text-xs sm:text-sm font-extrabold cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحقق والمصادقة...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>دخول خادم لتسجيل مخدومين</span>
                    </>
                  )}
                </button>

                {/* روابط التبديل والتسجيل */}
                <div className="pt-2 border-t border-slate-500/20 space-y-2 text-center text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setServantVerifyError(null);
                      setServantAuthView('first_time');
                    }}
                    className="w-full p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-700 dark:text-amber-300 font-extrabold text-[11px] hover:bg-orange-500/15 cursor-pointer block"
                  >
                    أول مرة تسجل دخولك؟ اضغط هنا لضبط رقمك السري بالاسم والرقم القومي
                  </button>

                  <div className="flex items-center justify-between text-[11px] px-1">
                    <button
                      type="button"
                      onClick={() => {
                        setServantVerifyError(null);
                        setServantAuthView('forgot_password');
                      }}
                      className="text-slate-500 dark:text-slate-400 hover:text-blue-600 underline cursor-pointer"
                    >
                      نسيت الرقم السري؟ استعادة بالرقم القومي
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setServantVerifyModalOpen(false);
                        setShowRegisterView(true);
                      }}
                      className="text-blue-600 dark:text-sky-400 font-extrabold hover:underline cursor-pointer"
                    >
                      تسجيل خادم جديد
                    </button>
                  </div>
                </div>
              </form>
            ) : servantAuthView === 'first_time' ? (
              /* النموذج الثاني: ضبط الرقم السري لأول مرة بالاسم ثلاثي والرقم القومي */
              <form onSubmit={handleServantFirstTimeSetup} className="space-y-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-700 dark:text-sky-300 leading-relaxed">
                  أدخل اسمك ثلاثياً كما تم تسجيله والرقم القومي (١٤ رقماً) لتعيين رقم سري خاص بك لاستخدامه في كل مرة.
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    اسم الخادم ثلاثياً كما تم تسجيله:
                  </label>
                  <input
                    type="text"
                    required
                    value={servantFirstTimeName}
                    onChange={(e) => setServantFirstTimeName(e.target.value)}
                    placeholder="اكتب اسمك ثلاثياً كما تم تسجيله"
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    الرقم القومي المسجل للخادم (١٤ رقماً):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={14}
                    required
                    value={servantFirstTimeNatId}
                    onChange={(e) => setServantFirstTimeNatId(e.target.value.replace(/\D/g, ''))}
                    placeholder="الرقم القومي (١٤ رقماً)"
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-center font-[family-name:var(--font-mono)] tabular-nums text-xs font-extrabold outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    اختر رقمك السري الخاص الجديد:
                  </label>
                  <input
                    type="password"
                    required
                    value={servantFirstTimePassword}
                    onChange={(e) => setServantFirstTimePassword(e.target.value)}
                    placeholder="اكتب رقم سري من ٤ خانات على الأقل"
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    تأكيد الرقم السري الجديد:
                  </label>
                  <input
                    type="password"
                    required
                    value={servantFirstTimeConfirm}
                    onChange={(e) => setServantFirstTimeConfirm(e.target.value)}
                    placeholder="أعد كتابة الرقم السري للتأكيد"
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full min-h-[44px] rounded-2xl bg-gradient-to-l from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-extrabold cursor-pointer shadow-md shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الحفظ والمصادقة...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        {servantVerifyPurpose === 'portal_staff_login'
                          ? 'حفظ كلمة المرور والدخول للبوابة'
                          : 'حفظ الرقم السري والدخول لتسجيل مخدومين'}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServantVerifyError(null);
                    setServantAuthView('login');
                  }}
                  className="w-full min-h-[34px] rounded-xl border border-slate-400/30 text-xs font-extrabold hover:bg-slate-500/10 cursor-pointer text-slate-600 dark:text-slate-300"
                >
                  العودة لتسجيل الدخول بالرقم السري
                </button>
              </form>
            ) : (
              /* النموذج الثالث: استعادة وإعادة ضبط الرقم السري بالرقم القومي */
              <form onSubmit={handleServantResetPassword} className="space-y-3">
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  أدخل رقمك القومي المسجل لإعادة ضبط وتعيين رقم سري جديد لحسابك.
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    الرقم القومي المسجل للخادم (١٤ رقماً):
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    maxLength={14}
                    required
                    value={servantRecoveryNatId}
                    onChange={(e) => setServantRecoveryNatId(e.target.value.replace(/\D/g, ''))}
                    placeholder="الرقم القومي (١٤ رقماً)"
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-center font-[family-name:var(--font-mono)] tabular-nums text-xs font-extrabold outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    كتابة الرقم السري الجديد:
                  </label>
                  <input
                    type="password"
                    required
                    value={servantRecoveryNewPassword}
                    onChange={(e) => setServantRecoveryNewPassword(e.target.value)}
                    placeholder="اكتب رقمك السري الجديد"
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold mb-1">
                    تأكيد الرقم السري الجديد:
                  </label>
                  <input
                    type="password"
                    required
                    value={servantRecoveryConfirm}
                    onChange={(e) => setServantRecoveryConfirm(e.target.value)}
                    placeholder="أعد كتابة الرقم السري للتأكيد"
                    className={`w-full min-h-[40px] px-3 rounded-xl border text-xs font-extrabold outline-none ${
                      isLight
                        ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-blue-500'
                        : 'bg-[#171F32] border-slate-700 text-white focus:border-sky-400'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full min-h-[44px] rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-extrabold cursor-pointer shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAuthLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري التحديث والمصادقة...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>تحديث الرقم السري والدخول</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setServantVerifyError(null);
                    setServantAuthView('login');
                  }}
                  className="w-full min-h-[34px] rounded-xl border border-slate-400/30 text-xs font-extrabold hover:bg-slate-500/10 cursor-pointer text-slate-600 dark:text-slate-300"
                >
                  العودة لتسجيل الدخول بالرقم السري
                </button>
              </form>
            )}

            <button
              type="button"
              onClick={() => setServantVerifyModalOpen(false)}
              className="w-full min-h-[34px] rounded-full border border-slate-400/30 text-xs font-bold opacity-80 hover:opacity-100 cursor-pointer"
            >
              إلغاء والعودة
            </button>
          </div>
        </div>
      )}

      {/* للأمان: لا تظهر أيقونة أدوات ولوحة الأدمن السفلية إلا عندما يكون الأدمن مسجلاً دخوله بحسابه */}
      {isAdminLoggedIn && (
        <div className="fixed bottom-2.5 right-3.5 z-40">
          {modeMenuOpen && (
            <div
              className={`mb-2 w-60 rounded-2xl p-1.5 border shadow-2xl space-y-1 ${
                isLight
                  ? 'bg-white border-amber-200 text-slate-900'
                  : 'bg-[#141A29] border-slate-700 text-white'
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  setViewMode('actual');
                  setModeMenuOpen(false);
                }}
                className={`w-full min-h-[36px] px-3 rounded-xl text-xs font-extrabold flex items-center justify-between transition-colors cursor-pointer ${
                  viewMode === 'actual'
                    ? 'bg-emerald-600 text-white'
                    : isLight
                    ? 'hover:bg-amber-50 text-slate-700'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>لوحة تحكم الأدمن والـ Live</span>
                </span>
                {viewMode === 'actual' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
              </button>

              <button
                type="button"
                onClick={() => {
                  setViewMode('actual');
                  setAdminPanelOpen(true);
                  setModeMenuOpen(false);
                }}
                className={`w-full min-h-[36px] px-3 rounded-xl text-xs font-extrabold flex items-center justify-between transition-colors cursor-pointer ${
                  isLight
                    ? 'hover:bg-amber-50 text-orange-700'
                    : 'hover:bg-slate-800 text-amber-300'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>تعديل الهيدر والشريط السفلي</span>
                </span>
              </button>

              {isDevPreviewOnly && (
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('simulation');
                    setModeMenuOpen(false);
                  }}
                  className={`w-full min-h-[36px] px-3 rounded-xl text-xs font-extrabold flex items-center justify-between transition-colors cursor-pointer ${
                    viewMode === 'simulation'
                      ? 'bg-slate-900 text-amber-300'
                      : isLight
                      ? 'hover:bg-amber-50 text-slate-700'
                      : 'hover:bg-slate-800 text-slate-200'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span>أدوات الاختبار والمحاكاة</span>
                  </span>
                  {viewMode === 'simulation' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={() => setModeMenuOpen((prev) => !prev)}
            aria-label="خيارات الأدمن المعتمد"
            title="خيارات الأدمن المعتمد"
            className="w-9 h-9 rounded-full bg-[#171717] hover:bg-neutral-800 text-white border border-white/20 shadow-lg flex items-center justify-center cursor-pointer transition-transform active:scale-95"
          >
            <SlidersHorizontal className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      )}

      {isDevPreviewOnly && (
        <InspectorDrawer
          isOpen={inspectorOpen}
        activeTab={inspectorTab}
        onTabChange={setInspectorTab}
        isLight={isLight}
        edition={edition}
        outbox={outbox}
        servants={servants}
        servantRoles={servantRoles}
        loginCodes={loginCodes}
        recoveryRequests={recoveryRequests}
        auditLogs={auditLogs}
        onClose={() => setInspectorOpen(false)}
        onUseDemoCode={(code, isAdmin) => {
          setShowRegisterView(false);
          setActiveServant(null);
          setViewMode('actual');
          setCurrentPage('login');
          if (isAdmin) {
            setMainTab('staff');
            setStaffSubTab('credentials');
            setAdminIdentifier(code);
          } else {
            setMainTab('participants');
            setParticipantSubTab('pin');
            setPinCode(code);
          }
        }}
        onAdminSendWhatsappCode={handleAdminSendWhatsappCode}
        />
      )}

      {/* نافذة مدخل الأدمن السريع (تظهر فقط في بيئة المعاينة والتطوير ومخفية تماماً عند النشر العام) */}
      {isDevPreviewOnly && devAdminModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4"
          onClick={() => !isAdminGoogleSigningIn && setDevAdminModalOpen(false)}
        >
          <div
            dir="rtl"
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-sm rounded-3xl border-2 p-5 shadow-2xl space-y-4 text-right ${
              isLight
                ? 'bg-white border-amber-200 text-slate-900'
                : 'bg-[#111829] border-slate-800 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-500/20">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-orange-600 dark:text-amber-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>مدخل الأدمن السريع (معاينة فقط)</span>
              </div>
              <button
                type="button"
                disabled={isAdminGoogleSigningIn}
                onClick={() => setDevAdminModalOpen(false)}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center hover:bg-slate-500/10 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`rounded-2xl p-2.5 border text-[11px] font-bold leading-relaxed ${
                isLight
                  ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}
            >
              هذا المدخل يظهر لك هنا في بيئة المعاينة فقط لفتح لوحة الإدارة خلال المرحلة الأولى، ومخفي تماماً عن المستخدمين في رابط النشر العام.
            </div>

            {devAdminError && (
              <div className="rounded-xl p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-bold leading-relaxed">
                {devAdminError}
              </div>
            )}

            {/* ١. الدخول المباشر وتوثيق لوحة الإدارة عبر Google فقط */}
            <button
              type="button"
              disabled={isAdminGoogleSigningIn}
              onClick={handleDevAdminGoogleEnter}
              className="w-full min-h-[46px] rounded-2xl bg-gradient-to-l from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs sm:text-sm font-extrabold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 transition-transform active:scale-[0.99]"
            >
              {isAdminGoogleSigningIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span>جاري التوثيق والدخول عبر Google...</span>
                </>
              ) : (
                <>
                  <KeyRound className="w-4 h-4 shrink-0" />
                  <span>دخول وتوثيق الأدمن بـ Google</span>
                </>
              )}
            </button>

            <div
              className={`rounded-2xl p-2.5 border text-[11px] font-bold leading-relaxed ${
                isLight
                  ? 'bg-slate-50 border-slate-200 text-slate-600'
                  : 'bg-[#171F32] border-slate-700 text-slate-300'
              }`}
            >
              {!adminAuthConfig.bootstrap_used
                ? 'يمكن للأدمن أيضاً الدخول من تبويب «فريق العمل» بالبريد المعتمد والرقم الثابت الأولي (202700) ليتم تغييره فوراً لاسم مستخدم وكلمة مرور دائمة، أو الدخول السريع عبر Google أعلاه.'
                : 'تم إعداد اسم المستخدم وكلمة المرور الدائمة للأدمن بنجاح. يمكنك الدخول بهما من تبويب «فريق العمل» أو الدخول السريع عبر Google أعلاه.'}
            </div>

            {/* ٣. معاينة المرحلة الثانية (صفحة ١ شاشة الدخول + بطاقة تعريف QR الموازية) */}
            <div className="pt-2 border-t border-slate-500/20 space-y-2">
              <div className="text-[11px] font-black text-orange-600 dark:text-amber-400">
                معاينة المرحلة الثانية (مغلقة عن المستخدمين الآن):
              </div>

              <button
                type="button"
                onClick={() => {
                  setDevAdminModalOpen(false);
                  setShowRegisterView(false);
                  setShowKidsManager(false);
                  setShowProfilePage(false);
                  setActiveServant(null);
                  setQrCardLanding(null);
                  setStatusMessage(null);
                  setPhase2PreviewMode(true);
                  setMainTab('staff');
                  setStaffSubTab('credentials');
                  navigateToPage('login');
                }}
                className="w-full min-h-[38px] px-3 rounded-xl bg-gradient-to-l from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-[11px] font-extrabold cursor-pointer shadow-xs"
              >
                معاينة صفحة ١: شاشة الدخول (فريق العمل / المشاركون)
              </button>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDevAdminModalOpen(false);
                    setPhase2PreviewMode(true);
                    const staffSample =
                      servants.find((s) => classifyQrServantCategory(s) === 'staff') ||
                      servants[0];
                    if (staffSample) openQrIdentificationCard(staffSample, 'staff');
                  }}
                  className={`min-h-[38px] px-2 rounded-xl border text-[10px] font-extrabold cursor-pointer transition-colors ${
                    isLight
                      ? 'border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100'
                      : 'border-blue-500/40 bg-blue-500/15 text-sky-300 hover:bg-blue-500/25'
                  }`}
                >
                  QR فريق العمل (تحويل ٥ث)
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDevAdminModalOpen(false);
                    setPhase2PreviewMode(true);
                    const teamSample =
                      servants.find((s) => classifyQrServantCategory(s) === 'team_servant') ||
                      servants[0];
                    if (teamSample) openQrIdentificationCard(teamSample, 'team_servant');
                  }}
                  className={`min-h-[38px] px-2 rounded-xl border text-[10px] font-extrabold cursor-pointer transition-colors ${
                    isLight
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                      : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  QR مشارك (دخول مباشر)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* نافذة الإعداد الإلزامي للأدمن بعد الدخول الأول بالرقم الثابت (202700) */}
      {adminBootstrapModalOpen && pendingBootstrapAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-3 sm:p-4">
          <div
            dir="rtl"
            className={`w-full max-w-md rounded-3xl border-2 p-5 shadow-2xl space-y-4 text-right ${
              isLight
                ? 'bg-white border-orange-300 text-slate-900'
                : 'bg-[#111829] border-orange-500/40 text-slate-100'
            }`}
          >
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-500/20">
              <div className="flex items-center gap-2 text-xs sm:text-sm font-extrabold text-orange-600 dark:text-amber-400">
                <ShieldCheck className="w-5 h-5 shrink-0" />
                <span>إعداد بيانات الأدمن الدائمة (إلزامي للدخول الأول)</span>
              </div>
              <button
                type="button"
                disabled={isBootstrapSubmitting}
                onClick={() => {
                  setAdminBootstrapModalOpen(false);
                  setPendingBootstrapAdmin(null);
                  setBootstrapPassword('');
                  setBootstrapPasswordConfirm('');
                }}
                className="min-h-[32px] min-w-[32px] rounded-xl flex items-center justify-center hover:bg-slate-500/10 cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div
              className={`rounded-2xl p-3 border text-xs font-bold leading-relaxed ${
                isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              }`}
            >
              تم التحقق من الرقم الثابت الأولي لحساب الإدارة ({pendingBootstrapAdmin.full_name}). لحماية المنظومة، يجب الآن إنشاء{' '}
              <strong>اسم مستخدم وكلمة مرور دائمة</strong>؛ وبمجرد الحفظ سيتم إبطال الرقم الثابت نهائياً ولن يعمل مجدداً.
            </div>

            {bootstrapError && (
              <div className="rounded-xl p-2.5 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-300 text-xs font-extrabold">
                {bootstrapError}
              </div>
            )}

            <form onSubmit={handleCompleteAdminBootstrap} className="space-y-3">
              <div>
                <label className="block text-[11px] font-extrabold mb-1">
                  اسم المستخدم الدائم للأدمن (بالإنجليزية):
                </label>
                <input
                  type="text"
                  dir="ltr"
                  required
                  value={bootstrapUsername}
                  onChange={(e) => setBootstrapUsername(e.target.value)}
                  placeholder="michael.mosaad"
                  className={`w-full min-h-[42px] px-3.5 rounded-xl border font-[family-name:var(--font-mono)] text-xs font-extrabold outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                      : 'bg-[#171F32] border-slate-700 text-white focus:border-amber-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold mb-1">
                  كلمة المرور الدائمة الجديدة (٦ أحرف/أرقام على الأقل):
                </label>
                <input
                  type="password"
                  required
                  value={bootstrapPassword}
                  onChange={(e) => setBootstrapPassword(e.target.value)}
                  placeholder="أدخل كلمة مرور قوية"
                  className={`w-full min-h-[42px] px-3.5 rounded-xl border text-xs font-extrabold outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                      : 'bg-[#171F32] border-slate-700 text-white focus:border-amber-400'
                  }`}
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold mb-1">
                  تأكيد كلمة المرور الدائمة:
                </label>
                <input
                  type="password"
                  required
                  value={bootstrapPasswordConfirm}
                  onChange={(e) => setBootstrapPasswordConfirm(e.target.value)}
                  placeholder="أعد كتابة كلمة المرور الجديدة"
                  className={`w-full min-h-[42px] px-3.5 rounded-xl border text-xs font-extrabold outline-none ${
                    isLight
                      ? 'bg-slate-50 border-slate-300 text-slate-900 focus:border-orange-500'
                      : 'bg-[#171F32] border-slate-700 text-white focus:border-amber-400'
                  }`}
                />
              </div>

              <button
                type="submit"
                disabled={isBootstrapSubmitting}
                className="w-full min-h-[46px] rounded-2xl bg-gradient-to-l from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white text-xs sm:text-sm font-extrabold shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isBootstrapSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري حفظ بيانات الأدمن وإبطال الرقم الثابت...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ بياناتي الدائمة والدخول للوحة الإدارة</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
