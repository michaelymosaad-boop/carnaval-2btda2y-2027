'use client';

import { auth, isFirebaseAdminUser } from './firebase';
import {
  INITIAL_ADMIN_AUTH_CONFIG,
  INITIAL_SERVANTS,
  type AdminAuthConfig,
  type AttendanceAndPointsPolicy,
  type AuditLogRecord,
  type AxisItem,
  type CarnivalActivityRound,
  type CarnivalInfoHistoryEntry,
  type CodedGradeItem,
  type CodedTeamItem,
  type Edition,
  type EmergencyAlertRecord,
  type EmergencyAlertStatus,
  type GateCheckinRecord,
  type KidParticipant,
  type LoginCodeRecord,
  type PointsLedgerEntry,
  type Servant,
  type ServantRoleRecord,
} from './carnival-store';

export const DEMO_SERVANT_IDS = ['s-team-1', 's-staff-1', 's-lead-1', 's-pending-1'];
export const DEMO_KID_IDS = ['kid-101', 'kid-102'];
export const DEMO_LOGIN_CODE_IDS = ['lc-1', 'lc-2', 'lc-3', 'lc-4', 'lc-5'];
export const DEMO_AUDIT_LOG_IDS = ['aud-1', 'aud-2'];

export interface PortalConfigDoc {
  id: string;
  edition_id: string;
  attendance_policy?: AttendanceAndPointsPolicy;
  coded_grades?: CodedGradeItem[];
  coded_teams?: CodedTeamItem[];
  servant_roles?: ServantRoleRecord[];
  activity_rounds?: CarnivalActivityRound[];
  axes?: AxisItem[];
  carnival_history?: CarnivalInfoHistoryEntry[];
  demo_data_cleared?: boolean;
  demo_cleaned_at?: string;
  updated_by_servant_id?: string;
  updated_at: string;
}

interface CarnivalSyncSnapshot {
  edition: Edition | null;
  portalConfig: PortalConfigDoc | null;
  codingConfig: PortalConfigDoc | null;
  adminAuthConfig: AdminAuthConfig | null;
  servants: Servant[];
  kids: KidParticipant[];
  loginCodes: LoginCodeRecord[];
  gateCheckins: GateCheckinRecord[];
  pointsLedger: PointsLedgerEntry[];
  alerts: EmergencyAlertRecord[];
  auditLogs: AuditLogRecord[];
  isAdminView?: boolean;
}

type SnapshotListener = {
  onUpdate: (snapshot: CarnivalSyncSnapshot) => void;
  onError?: (err: unknown) => void;
};

const POLL_INTERVAL_MS = 6000;

async function getAuthHeaders(includeJson = true): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }
  const currentUser = auth.currentUser;
  if (currentUser) {
    try {
      const idToken = await currentUser.getIdToken();
      if (idToken) {
        headers.Authorization = `Bearer ${idToken}`;
      }
    } catch {
      // Proceed without token if refresh fails while offline
    }
  }
  return headers;
}

async function apiRequest<T>(
  url: string,
  options: { method?: string; body?: unknown } = {}
): Promise<T> {
  const method = options.method || 'GET';
  const headers = await getAuthHeaders(options.body !== undefined);
  const res = await fetch(url, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  });

  if (!res.ok) {
    let errorMessage = `Request failed (${res.status})`;
    try {
      const errData = (await res.json()) as { error?: string };
      if (errData?.error) errorMessage = errData.error;
    } catch {
      // Ignore non-JSON error body
    }
    throw new Error(errorMessage);
  }

  return (await res.json()) as T;
}

class EditionSyncHub {
  private editionId: string;
  private listeners = new Set<SnapshotListener>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private latestSnapshot: CarnivalSyncSnapshot | null = null;
  private inFlight: Promise<CarnivalSyncSnapshot | null> | null = null;

  constructor(editionId: string) {
    this.editionId = editionId;
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    if (this.latestSnapshot) {
      listener.onUpdate(this.latestSnapshot);
    }
    this.ensurePolling();
    void this.refresh();

    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };
  }

  private ensurePolling() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        return;
      }
      void this.refresh();
    }, POLL_INTERVAL_MS);
  }

  async refresh(force = false): Promise<CarnivalSyncSnapshot | null> {
    if (this.inFlight && !force) {
      return this.inFlight;
    }
    const run = (async () => {
      try {
        const snapshot = await apiRequest<CarnivalSyncSnapshot>(
          `/api/carnival/sync?editionId=${encodeURIComponent(this.editionId)}`
        );
        this.latestSnapshot = snapshot;
        for (const listener of this.listeners) {
          listener.onUpdate(snapshot);
        }
        return snapshot;
      } catch (err) {
        for (const listener of this.listeners) {
          if (listener.onError) listener.onError(err);
        }
        return this.latestSnapshot;
      } finally {
        this.inFlight = null;
      }
    })();

    this.inFlight = run;
    return run;
  }
}

const syncHubs = new Map<string, EditionSyncHub>();

function getSyncHub(editionId = 'ed-carnival-2027'): EditionSyncHub {
  const cleanId = editionId || 'ed-carnival-2027';
  let hub = syncHubs.get(cleanId);
  if (!hub) {
    hub = new EditionSyncHub(cleanId);
    syncHubs.set(cleanId, hub);
  }
  return hub;
}

function triggerAllHubsRefresh(): void {
  for (const hub of syncHubs.values()) {
    void hub.refresh(true);
  }
}

export async function saveServantToFirestore(servant: Servant): Promise<void> {
  await apiRequest('/api/carnival/servants', {
    method: 'POST',
    body: servant,
  });
  triggerAllHubsRefresh();
}

export async function updateServantPasswordHashInFirestore(
  servantId: string,
  customPasswordHash: string,
  usernameIfUnset?: string
): Promise<void> {
  await apiRequest(`/api/carnival/servants/${encodeURIComponent(servantId)}`, {
    method: 'PATCH',
    body: {
      custom_password_hash: customPasswordHash,
      ...(usernameIfUnset ? { username: usernameIfUnset } : {}),
    },
  });
  triggerAllHubsRefresh();
}

export async function updateServantAvatarInFirestore(
  servantId: string,
  avatarUrl: string | null
): Promise<void> {
  await apiRequest(`/api/carnival/servants/${encodeURIComponent(servantId)}`, {
    method: 'PATCH',
    body: { avatar_url: avatarUrl },
  });
  triggerAllHubsRefresh();
}

export async function deleteServantFromFirestore(servantId: string): Promise<void> {
  await apiRequest(`/api/carnival/servants/${encodeURIComponent(servantId)}`, {
    method: 'DELETE',
  });
  triggerAllHubsRefresh();
}

export function subscribeToServants(
  onUpdate: (servants: Servant[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub('ed-carnival-2027').subscribe({
    onUpdate: (snap) => onUpdate(snap.servants || []),
    onError,
  });
}

export async function saveKidToFirestore(kid: KidParticipant): Promise<void> {
  await apiRequest('/api/carnival/kids', {
    method: 'POST',
    body: kid,
  });
  triggerAllHubsRefresh();
}

export async function deleteKidFromFirestore(kidId: string): Promise<void> {
  await apiRequest(`/api/carnival/kids/${encodeURIComponent(kidId)}`, {
    method: 'DELETE',
  });
  triggerAllHubsRefresh();
}

export function subscribeToKids(
  onUpdate: (kids: KidParticipant[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub('ed-carnival-2027').subscribe({
    onUpdate: (snap) => onUpdate(snap.kids || []),
    onError,
  });
}

export async function hydrateAndMigrateAdminPrivateData(
  currentServants: Servant[],
  currentKids: KidParticipant[]
): Promise<{ servants: Servant[]; kids: KidParticipant[] }> {
  if (!isFirebaseAdminUser(auth.currentUser)) {
    return { servants: currentServants, kids: currentKids };
  }
  const snapshot = await getSyncHub('ed-carnival-2027').refresh(true);
  if (!snapshot) {
    return { servants: currentServants, kids: currentKids };
  }
  return {
    servants: snapshot.servants || currentServants,
    kids: snapshot.kids || currentKids,
  };
}

export async function saveEditionToFirestore(edition: Edition): Promise<void> {
  await apiRequest('/api/carnival/edition', {
    method: 'PUT',
    body: edition,
  });
  triggerAllHubsRefresh();
}

export function subscribeToEdition(
  editionId: string,
  onUpdate: (edition: Edition) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => {
      if (snap.edition && snap.edition.id && snap.edition.name) {
        onUpdate(snap.edition);
      }
    },
    onError,
  });
}

export async function savePortalConfigToFirestore(
  editionId: string,
  partial: {
    attendance_policy?: AttendanceAndPointsPolicy;
    coded_grades?: CodedGradeItem[];
    coded_teams?: CodedTeamItem[];
    servant_roles?: ServantRoleRecord[];
    activity_rounds?: CarnivalActivityRound[];
    axes?: AxisItem[];
    carnival_history?: CarnivalInfoHistoryEntry[];
    demo_data_cleared?: boolean;
    demo_cleaned_at?: string;
  }
): Promise<void> {
  await apiRequest('/api/carnival/config', {
    method: 'PUT',
    body: {
      editionId,
      configKey: 'portal',
      payload: partial,
    },
  });
  triggerAllHubsRefresh();
}

export async function saveCodingConfigToFirestore(
  editionId: string,
  partial: {
    coded_grades?: CodedGradeItem[];
    coded_teams?: CodedTeamItem[];
  },
  actorServantId?: string
): Promise<void> {
  await apiRequest('/api/carnival/config', {
    method: 'PUT',
    body: {
      editionId,
      configKey: 'coding',
      payload: partial,
      actorServantId,
    },
  });
  triggerAllHubsRefresh();
}

export function subscribeToPortalConfig(
  editionId: string,
  onUpdate: (config: PortalConfigDoc) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => {
      if (snap.portalConfig) {
        onUpdate(snap.portalConfig);
      }
    },
    onError,
  });
}

export function subscribeToCodingConfig(
  editionId: string,
  onUpdate: (config: PortalConfigDoc) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => {
      if (snap.codingConfig) {
        onUpdate(snap.codingConfig);
      }
    },
    onError,
  });
}

export async function saveLoginCodeToFirestore(record: LoginCodeRecord): Promise<void> {
  await apiRequest('/api/carnival/login-codes', {
    method: 'POST',
    body: record,
  });
  triggerAllHubsRefresh();
}

export async function markLoginCodeUsedInFirestore(
  codeId: string,
  usedAt: string
): Promise<void> {
  try {
    await apiRequest('/api/carnival/login-codes', {
      method: 'PATCH',
      body: { id: codeId, used_at: usedAt },
    });
    triggerAllHubsRefresh();
  } catch (error) {
    console.warn('Mark login code used warning:', error);
  }
}

export function subscribeToLoginCodes(
  onUpdate: (codes: LoginCodeRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub('ed-carnival-2027').subscribe({
    onUpdate: (snap) => onUpdate(snap.loginCodes || []),
    onError,
  });
}

export function subscribeToAdminAuthConfig(
  editionId: string,
  onUpdate: (config: AdminAuthConfig) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => {
      if (snap.adminAuthConfig && snap.adminAuthConfig.id === 'admin_auth') {
        onUpdate(snap.adminAuthConfig);
      }
    },
    onError,
  });
}

export async function completeAdminBootstrapInFirestore(
  editionId: string,
  servantId: string,
  adminEmail: string,
  username: string,
  passwordHash: string
): Promise<void> {
  const seedAdmin = INITIAL_SERVANTS.find((s) => s.id === servantId);
  await apiRequest('/api/carnival/admin-bootstrap', {
    method: 'POST',
    body: {
      editionId,
      servantId,
      adminEmail,
      username,
      passwordHash,
      seedAdminServant: seedAdmin,
    },
  });
  triggerAllHubsRefresh();
}

export async function seedInitialDataIfEmpty(
  initialServants: Servant[],
  _initialKids: KidParticipant[],
  initialEdition: Edition
): Promise<void> {
  try {
    const adminSeed = initialServants.find((s) => s.id === 's-admin-1');
    await apiRequest('/api/carnival/seed', {
      method: 'POST',
      body: {
        edition: initialEdition,
        adminServant: adminSeed,
        adminAuthConfig: INITIAL_ADMIN_AUTH_CONFIG,
      },
    });
  } catch (err) {
    console.warn('Seeding initial data deferred or offline:', err);
  }
}

export async function recordGateCheckinInFirestore(
  checkin: GateCheckinRecord,
  ledgerEntries: PointsLedgerEntry[]
): Promise<void> {
  await apiRequest('/api/carnival/gate-checkins', {
    method: 'POST',
    body: { checkin, ledgerEntries },
  });
  triggerAllHubsRefresh();
}

export function subscribeToGateCheckins(
  editionId: string,
  onUpdate: (records: GateCheckinRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => onUpdate(snap.gateCheckins || []),
    onError,
  });
}

export async function addPointsLedgerEntryInFirestore(
  entry: PointsLedgerEntry
): Promise<void> {
  await apiRequest('/api/carnival/points-ledger', {
    method: 'POST',
    body: entry,
  });
  triggerAllHubsRefresh();
}

export function subscribeToPointsLedger(
  editionId: string,
  onUpdate: (entries: PointsLedgerEntry[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => onUpdate(snap.pointsLedger || []),
    onError,
  });
}

export async function createEmergencyAlertInFirestore(
  alert: EmergencyAlertRecord
): Promise<void> {
  await apiRequest('/api/carnival/alerts', {
    method: 'POST',
    body: alert,
  });
  triggerAllHubsRefresh();
}

export async function updateEmergencyAlertInFirestore(
  _editionId: string,
  alertId: string,
  patch: {
    status: EmergencyAlertStatus;
    updated_by_servant_id: string;
    resolved_by_name?: string;
    resolution_note?: string;
    updated_at: string;
  }
): Promise<void> {
  await apiRequest('/api/carnival/alerts', {
    method: 'PATCH',
    body: {
      alertId,
      ...patch,
    },
  });
  triggerAllHubsRefresh();
}

export function subscribeToEmergencyAlerts(
  editionId: string,
  onUpdate: (alerts: EmergencyAlertRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => onUpdate(snap.alerts || []),
    onError,
  });
}

export async function updateKidTeamInFirestore(
  kidId: string,
  newTeamName: string,
  updatedByServantId: string
): Promise<void> {
  await apiRequest(`/api/carnival/kids/${encodeURIComponent(kidId)}`, {
    method: 'PATCH',
    body: {
      team_name: newTeamName,
      updated_by_servant_id: updatedByServantId,
    },
  });
  triggerAllHubsRefresh();
}

export async function saveAuditLogToFirestore(record: AuditLogRecord): Promise<void> {
  try {
    await apiRequest('/api/carnival/audit-logs', {
      method: 'POST',
      body: record,
    });
    triggerAllHubsRefresh();
  } catch (error) {
    console.warn('Audit log persistence skipped:', error);
  }
}

export function subscribeToAuditLogs(
  editionId: string,
  onUpdate: (logs: AuditLogRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  return getSyncHub(editionId).subscribe({
    onUpdate: (snap) => onUpdate(snap.auditLogs || []),
    onError,
  });
}

export async function cleanupDemoDataInFirestore(options: {
  editionId: string;
  servantIdsToDelete: string[];
  kidIdsToDelete: string[];
  loginCodeIdsToDelete: string[];
  auditLogIdsToDelete: string[];
  gateCheckinIdsToDelete?: string[];
  alertIdsToDelete?: string[];
  zeroOutLedgerEntries?: PointsLedgerEntry[];
  remainingRoles?: ServantRoleRecord[];
}): Promise<{ deletedCount: number; zeroedTeamsCount: number }> {
  if (!isFirebaseAdminUser(auth.currentUser)) {
    throw new Error(
      'لحذف السجلات القديمة، يجب توثيق حساب Google الخاص بالأدمن أولاً من الأعلى.'
    );
  }

  const result = await apiRequest<{ deletedCount: number; zeroedTeamsCount: number }>(
    '/api/carnival/admin/cleanup',
    {
      method: 'POST',
      body: options,
    }
  );
  triggerAllHubsRefresh();
  return result;
}
