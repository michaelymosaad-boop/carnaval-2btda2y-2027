'use client';

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  isFirebaseAdminUser,
  OperationType,
} from './firebase';
import {
  computeHash,
  INITIAL_ADMIN_AUTH_CONFIG,
  INITIAL_LOGIN_CODES,
  INITIAL_SERVANTS,
  type AdminAuthConfig,
  type LoginCodeRecord,
  type Servant,
  type KidParticipant,
  type Edition,
  type AttendanceAndPointsPolicy,
  type CodedGradeItem,
  type CodedTeamItem,
  type ServantRoleRecord,
  type CarnivalActivityRound,
  type AxisItem,
  type CarnivalInfoHistoryEntry,
  type GateCheckinRecord,
  type PointsLedgerEntry,
  type EmergencyAlertRecord,
  type EmergencyAlertStatus,
  type AuditLogRecord,
  INITIAL_AUDIT_LOGS,
} from './carnival-store';

const SERVANTS_COLLECTION = 'servants';
const KIDS_COLLECTION = 'kids';
const EDITIONS_COLLECTION = 'editions';
const LOGIN_CODES_COLLECTION = 'login_codes';
const PORTAL_CONFIG_COLLECTION = 'config';
const PORTAL_CONFIG_DOC_ID = 'portal';
const CODING_CONFIG_DOC_ID = 'coding';
const ADMIN_AUTH_CONFIG_DOC_ID = 'admin_auth';
const GATE_CHECKINS_SUBCOLLECTION = 'gate_checkins';
const POINTS_LEDGER_SUBCOLLECTION = 'points_ledger';
const ALERTS_SUBCOLLECTION = 'alerts';
const AUDIT_LOGS_SUBCOLLECTION = 'audit_logs';

export const DEMO_SERVANT_IDS = ['s-team-1', 's-staff-1', 's-lead-1', 's-pending-1'];
export const DEMO_KID_IDS = ['kid-101', 'kid-102'];
export const DEMO_LOGIN_CODE_IDS = ['lc-1', 'lc-2', 'lc-3', 'lc-4', 'lc-5'];
export const DEMO_AUDIT_LOG_IDS = ['aud-1', 'aud-2'];

function clampString(value: unknown, maxLen: number, fallback = ''): string {
  const str = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim();
  if (!str) return fallback;
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

function clampNullableUrl(value: string | null | undefined, maxLen = 500000): string | null {
  if (!value) return null;
  if (value.length > maxLen) return null;
  return value;
}

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

interface ServantPrivateInfo {
  phone: string;
  whatsapp: string;
  email: string;
  national_id_display: string;
  birth_date: string;
  health_notes: string;
}

interface KidPrivateInfo {
  parent_phone: string;
  health_notes: string;
}

/**
 * تجهيز نسخة عامة خالية من البيانات الشخصية الحساسة (PII) لـ servants/{id}
 */
function toPublicServantPayload(servant: Servant): Record<string, unknown> {
  const rawSkills = Array.isArray(servant.health_and_skills?.skills)
    ? servant.health_and_skills.skills.slice(0, 15).map((s) => clampString(s, 120)).filter(Boolean)
    : [];

  const emailHash =
    servant.email_hash ||
    (servant.email && !servant.email.startsWith('servant.')
      ? computeHash(servant.email.trim().toLowerCase())
      : undefined);

  const payload: Record<string, unknown> = {
    id: clampString(servant.id, 128),
    edition_id: clampString(servant.edition_id || 'ed-carnival-2027', 128),
    full_name: clampString(servant.full_name, 160, 'خادم'),
    service_id: clampString(servant.service_id, 128),
    phone_hash: clampString(
      servant.phone_hash || (servant.phone ? computeHash(servant.phone) : computeHash(servant.id)),
      128
    ),
    national_id_hash: clampString(servant.national_id_hash, 128),
    national_id_last4: clampString(servant.national_id_last4, 16),
    avatar_url: clampNullableUrl(servant.avatar_url, 500000),
    health_and_skills: {
      skills: rawSkills,
      health_notes: '',
    },
    status: servant.status || 'approved',
    qr_token: clampString(servant.qr_token, 128),
    created_at: clampString(servant.created_at || new Date().toISOString(), 64),
  };

  if (emailHash) payload.email_hash = clampString(emailHash, 128);
  if (servant.gender) payload.gender = servant.gender;
  if (servant.governorate) payload.governorate = clampString(servant.governorate, 120);
  if (typeof servant.can_view_kids_codes === 'boolean') {
    payload.can_view_kids_codes = servant.can_view_kids_codes;
  }
  if (typeof servant.can_manage_coding === 'boolean') {
    payload.can_manage_coding = servant.can_manage_coding;
  }
  if (servant.admin_username) payload.admin_username = clampString(servant.admin_username, 120);
  if (servant.admin_password_hash) payload.admin_password_hash = clampString(servant.admin_password_hash, 128);
  if (servant.custom_password_hash) payload.custom_password_hash = clampString(servant.custom_password_hash, 128);
  if (servant.pin_code) payload.pin_code = clampString(servant.pin_code, 32);
  if (servant.pin_code_hash) payload.pin_code_hash = clampString(servant.pin_code_hash, 128);
  if (servant.username) payload.username = clampString(servant.username, 120);
  if (servant.primary_role === 'team_lead' || servant.primary_role === 'staff') {
    payload.primary_role = servant.primary_role;
  } else if (servant.primary_role === null) {
    payload.primary_role = null;
  }

  return payload;
}

function toPrivateServantPayload(servant: Servant): ServantPrivateInfo {
  return {
    phone: clampString(servant.phone, 32, '01000000000'),
    whatsapp: clampString(servant.whatsapp || servant.phone, 32),
    email: clampString(servant.email, 160),
    national_id_display: clampString(servant.national_id_display, 64),
    birth_date: clampString(servant.birth_date, 64),
    health_notes: clampString(servant.health_and_skills?.health_notes, 500, 'لا توجد ملاحظات صحية'),
  };
}

/**
 * تجهيز نسخة عامة خالية من البيانات الشخصية الحساسة لـ kids/{id}
 */
function toPublicKidPayload(kid: KidParticipant): Record<string, unknown> {
  return {
    id: clampString(kid.id, 128),
    edition_id: clampString(kid.edition_id || 'ed-carnival-2027', 128),
    full_name: clampString(kid.full_name, 160, 'مخدوم'),
    service_id: clampString(kid.service_id, 128),
    grade_label: clampString(kid.grade_label, 120),
    team_name: clampString(kid.team_name, 160),
    pin_code: clampString(kid.pin_code, 32, 'K00000'),
    qr_token: clampString(kid.qr_token, 128),
    registered_by_name: clampString(kid.registered_by_name, 160),
    source: kid.source === 'excel' ? 'excel' : 'manual',
    created_at: clampString(kid.created_at || new Date().toISOString().slice(0, 16), 64),
  };
}

function toPrivateKidPayload(kid: KidParticipant): KidPrivateInfo {
  return {
    parent_phone: clampString(kid.parent_phone, 32),
    health_notes: clampString(kid.health_notes, 500, 'لا توجد'),
  };
}

function normalizeServantFromDoc(raw: Record<string, unknown>): Servant {
  const rawHealth = raw.health_and_skills as { skills?: string[]; health_notes?: string } | undefined;
  return {
    id: String(raw.id || ''),
    edition_id: String(raw.edition_id || 'ed-carnival-2027'),
    full_name: String(raw.full_name || ''),
    service_id: String(raw.service_id || ''),
    phone: String(raw.phone || ''),
    phone_hash: raw.phone_hash ? String(raw.phone_hash) : raw.phone ? computeHash(String(raw.phone)) : undefined,
    whatsapp: String(raw.whatsapp || raw.phone || ''),
    email: String(raw.email || ''),
    email_hash: raw.email_hash ? String(raw.email_hash) : undefined,
    national_id_hash: String(raw.national_id_hash || ''),
    national_id_last4: String(raw.national_id_last4 || ''),
    national_id_display: raw.national_id_display ? String(raw.national_id_display) : undefined,
    gender: raw.gender === 'أنثى' ? 'أنثى' : raw.gender === 'ذكر' ? 'ذكر' : undefined,
    birth_date: raw.birth_date ? String(raw.birth_date) : undefined,
    governorate: raw.governorate ? String(raw.governorate) : undefined,
    avatar_url: (raw.avatar_url as string | null | undefined) ?? null,
    health_and_skills: {
      skills: Array.isArray(rawHealth?.skills) ? rawHealth.skills.map(String) : [],
      health_notes: String(rawHealth?.health_notes || ''),
    },
    status: (raw.status as Servant['status']) || 'approved',
    qr_token: String(raw.qr_token || ''),
    pin_code: raw.pin_code ? String(raw.pin_code) : undefined,
    pin_code_hash: raw.pin_code_hash ? String(raw.pin_code_hash) : undefined,
    username: raw.username ? String(raw.username) : undefined,
    can_view_kids_codes: typeof raw.can_view_kids_codes === 'boolean' ? raw.can_view_kids_codes : undefined,
    can_manage_coding: typeof raw.can_manage_coding === 'boolean' ? raw.can_manage_coding : undefined,
    admin_username: raw.admin_username ? String(raw.admin_username) : undefined,
    admin_password_hash: raw.admin_password_hash ? String(raw.admin_password_hash) : undefined,
    custom_password_hash: raw.custom_password_hash ? String(raw.custom_password_hash) : undefined,
    primary_role:
      raw.primary_role === 'team_lead' || raw.primary_role === 'staff'
        ? raw.primary_role
        : raw.primary_role === null
        ? null
        : undefined,
    created_at: String(raw.created_at || ''),
  };
}

function normalizeKidFromDoc(raw: Record<string, unknown>): KidParticipant {
  return {
    id: String(raw.id || ''),
    edition_id: String(raw.edition_id || 'ed-carnival-2027'),
    full_name: String(raw.full_name || ''),
    service_id: String(raw.service_id || ''),
    grade_label: String(raw.grade_label || ''),
    parent_phone: String(raw.parent_phone || ''),
    health_notes: String(raw.health_notes || 'لا توجد'),
    team_name: String(raw.team_name || ''),
    pin_code: String(raw.pin_code || ''),
    qr_token: String(raw.qr_token || ''),
    registered_by_name: String(raw.registered_by_name || ''),
    source: raw.source === 'excel' ? 'excel' : 'manual',
    created_at: String(raw.created_at || ''),
  };
}

/**
 * حفظ أو تحديث خادم في Firestore بنظام Split Collection (عام + خاص)
 */
export async function saveServantToFirestore(servant: Servant): Promise<void> {
  const publicPath = `${SERVANTS_COLLECTION}/${servant.id}`;
  const privatePath = `${SERVANTS_COLLECTION}/${servant.id}/private/info`;
  try {
    const publicDocRef = doc(db, SERVANTS_COLLECTION, servant.id);
    const cleanPublic = JSON.parse(JSON.stringify(toPublicServantPayload(servant)));
    await setDoc(publicDocRef, cleanPublic, { merge: true });

    const privateDocRef = doc(db, SERVANTS_COLLECTION, servant.id, 'private', 'info');
    const cleanPrivate = JSON.parse(JSON.stringify(toPrivateServantPayload(servant)));
    try {
      await setDoc(privateDocRef, cleanPrivate, { merge: true });
    } catch (privErr) {
      // في حالة وجود المستند الخاص مسبقاً من غير صلاحية الأدمن نتجاهل تحديث الخاص
      if (!isFirebaseAdminUser(auth.currentUser)) {
        console.warn('Servant private info already secured:', privErr);
      } else {
        handleFirestoreError(privErr, OperationType.WRITE, privatePath);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }
}

/**
 * تحديث الرقم السري المخصص (واسم المستخدم إن لم يكن محدداً) بدون المساس بالبيانات الخاصة
 */
export async function updateServantPasswordHashInFirestore(
  servantId: string,
  customPasswordHash: string,
  usernameIfUnset?: string
): Promise<void> {
  const path = `${SERVANTS_COLLECTION}/${servantId}`;
  try {
    const patch: Record<string, string> = {
      custom_password_hash: clampString(customPasswordHash, 128),
    };
    if (usernameIfUnset) {
      patch.username = clampString(usernameIfUnset, 120);
    }
    await updateDoc(doc(db, SERVANTS_COLLECTION, servantId), patch);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * تحديث صورة الخادم الشخصية فقط
 */
export async function updateServantAvatarInFirestore(
  servantId: string,
  avatarUrl: string | null
): Promise<void> {
  const path = `${SERVANTS_COLLECTION}/${servantId}`;
  try {
    await updateDoc(doc(db, SERVANTS_COLLECTION, servantId), {
      avatar_url: avatarUrl,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

/**
 * حذف خادم من Firestore (يتطلب صلاحية الأدمن)
 */
export async function deleteServantFromFirestore(servantId: string): Promise<void> {
  const path = `${SERVANTS_COLLECTION}/${servantId}`;
  try {
    await deleteDoc(doc(db, SERVANTS_COLLECTION, servantId, 'private', 'info')).catch(() => undefined);
    await deleteDoc(doc(db, SERVANTS_COLLECTION, servantId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * الاشتراك اللحظي في قائمة الخدام (البيانات العامة الآمنة)
 */
export function subscribeToServants(
  onUpdate: (servants: Servant[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const servantsColRef = collection(db, SERVANTS_COLLECTION);
  return onSnapshot(
    servantsColRef,
    (snapshot) => {
      const items: Servant[] = [];
      snapshot.forEach((docSnap) => {
        const normalized = normalizeServantFromDoc(docSnap.data() as Record<string, unknown>);
        if (DEMO_SERVANT_IDS.includes(normalized.id)) return;
        items.push(normalized);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Realtime servants sync warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * حفظ أو تحديث طفل مخدوم في Firestore بنظام Split Collection (عام + خاص)
 */
export async function saveKidToFirestore(kid: KidParticipant): Promise<void> {
  const publicPath = `${KIDS_COLLECTION}/${kid.id}`;
  const privatePath = `${KIDS_COLLECTION}/${kid.id}/private/info`;
  try {
    const kidDocRef = doc(db, KIDS_COLLECTION, kid.id);
    const cleanPublic = JSON.parse(JSON.stringify(toPublicKidPayload(kid)));
    await setDoc(kidDocRef, cleanPublic, { merge: true });

    const privateDocRef = doc(db, KIDS_COLLECTION, kid.id, 'private', 'info');
    const cleanPrivate = JSON.parse(JSON.stringify(toPrivateKidPayload(kid)));
    try {
      await setDoc(privateDocRef, cleanPrivate, { merge: true });
    } catch (privErr) {
      if (!isFirebaseAdminUser(auth.currentUser)) {
        console.warn('Kid private info already secured:', privErr);
      } else {
        handleFirestoreError(privErr, OperationType.WRITE, privatePath);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, publicPath);
  }
}

/**
 * حذف مخدوم من Firestore (يتطلب صلاحية الأدمن)
 */
export async function deleteKidFromFirestore(kidId: string): Promise<void> {
  const path = `${KIDS_COLLECTION}/${kidId}`;
  try {
    await deleteDoc(doc(db, KIDS_COLLECTION, kidId, 'private', 'info')).catch(() => undefined);
    await deleteDoc(doc(db, KIDS_COLLECTION, kidId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * الاشتراك اللحظي في قائمة المخدومين (البيانات العامة الآمنة)
 */
export function subscribeToKids(
  onUpdate: (kids: KidParticipant[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const kidsColRef = collection(db, KIDS_COLLECTION);
  return onSnapshot(
    kidsColRef,
    (snapshot) => {
      const items: KidParticipant[] = [];
      snapshot.forEach((docSnap) => {
        const normalized = normalizeKidFromDoc(docSnap.data() as Record<string, unknown>);
        if (DEMO_KID_IDS.includes(normalized.id)) return;
        items.push(normalized);
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Realtime kids sync warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * للأدمن فقط بعد توثيق Google:
 * 1. ترحيل أي بيانات شخصية قديمة ما زالت على المستند العام إلى private/info وإزالتها من العام
 * 2. قراءة البيانات الخاصة (الهاتف، الرقم القومي، الملاحظات الصحية) ودمجها في حالة اللوحة
 */
export async function hydrateAndMigrateAdminPrivateData(
  currentServants: Servant[],
  currentKids: KidParticipant[]
): Promise<{ servants: Servant[]; kids: KidParticipant[] }> {
  if (!isFirebaseAdminUser(auth.currentUser)) {
    return { servants: currentServants, kids: currentKids };
  }

  const enrichedServants = await Promise.all(
    currentServants.map(async (srv) => {
      try {
        const publicDocRef = doc(db, SERVANTS_COLLECTION, srv.id);
        const privateDocRef = doc(db, SERVANTS_COLLECTION, srv.id, 'private', 'info');
        const [pubSnap, privSnap] = await Promise.all([
          getDoc(publicDocRef),
          getDoc(privateDocRef),
        ]);

        const pubData = (pubSnap.exists() ? pubSnap.data() : {}) as Record<string, unknown>;
        const privData = (privSnap.exists() ? privSnap.data() : {}) as Partial<ServantPrivateInfo>;

        const hasLegacyInlinePii = Boolean(
          pubData.phone ||
            pubData.whatsapp ||
            pubData.email ||
            pubData.national_id_display ||
            pubData.birth_date ||
            (pubData.health_and_skills as { health_notes?: string } | undefined)?.health_notes
        );

        const mergedServant: Servant = {
          ...srv,
          phone: privData.phone || srv.phone || '',
          phone_hash:
            srv.phone_hash ||
            (privData.phone ? computeHash(privData.phone) : srv.phone ? computeHash(srv.phone) : undefined),
          whatsapp: privData.whatsapp || srv.whatsapp || privData.phone || srv.phone || '',
          email: privData.email || srv.email || '',
          national_id_display: privData.national_id_display || srv.national_id_display || '',
          birth_date: privData.birth_date || srv.birth_date || '',
          health_and_skills: {
            skills: srv.health_and_skills?.skills || [],
            health_notes:
              privData.health_notes || srv.health_and_skills?.health_notes || 'لا توجد ملاحظات صحية',
          },
        };

        // ترحيل وتنظيف أي مستند عام قديم يحتوي على بيانات شخصية
        if (hasLegacyInlinePii || !privSnap.exists()) {
          await setDoc(
            privateDocRef,
            JSON.parse(JSON.stringify(toPrivateServantPayload(mergedServant))),
            { merge: true }
          );
          await setDoc(
            publicDocRef,
            JSON.parse(JSON.stringify(toPublicServantPayload(mergedServant)))
          );
        }

        return mergedServant;
      } catch (err) {
        console.warn(`Admin hydrate servant ${srv.id} warning:`, err);
        return srv;
      }
    })
  );

  const enrichedKids = await Promise.all(
    currentKids.map(async (kid) => {
      try {
        const publicDocRef = doc(db, KIDS_COLLECTION, kid.id);
        const privateDocRef = doc(db, KIDS_COLLECTION, kid.id, 'private', 'info');
        const [pubSnap, privSnap] = await Promise.all([
          getDoc(publicDocRef),
          getDoc(privateDocRef),
        ]);

        const pubData = (pubSnap.exists() ? pubSnap.data() : {}) as Record<string, unknown>;
        const privData = (privSnap.exists() ? privSnap.data() : {}) as Partial<KidPrivateInfo>;

        const hasLegacyInlinePii = Boolean(pubData.parent_phone || pubData.health_notes);

        const mergedKid: KidParticipant = {
          ...kid,
          parent_phone: privData.parent_phone || kid.parent_phone || '',
          health_notes: privData.health_notes || kid.health_notes || 'لا توجد',
        };

        if (hasLegacyInlinePii || !privSnap.exists()) {
          await setDoc(
            privateDocRef,
            JSON.parse(JSON.stringify(toPrivateKidPayload(mergedKid))),
            { merge: true }
          );
          await setDoc(
            publicDocRef,
            JSON.parse(JSON.stringify(toPublicKidPayload(mergedKid)))
          );
        }

        return mergedKid;
      } catch (err) {
        console.warn(`Admin hydrate kid ${kid.id} warning:`, err);
        return kid;
      }
    })
  );

  return { servants: enrichedServants, kids: enrichedKids };
}

/**
 * حفظ بيانات دورة الكرنفال في Firestore
 */
export async function saveEditionToFirestore(edition: Edition): Promise<void> {
  const path = `${EDITIONS_COLLECTION}/${edition.id}`;
  try {
    const editionDocRef = doc(db, EDITIONS_COLLECTION, edition.id);
    const payload = {
      id: clampString(edition.id, 128),
      name: clampString(edition.name, 200, 'كرنفال Reflection 2027'),
      code_label: clampString(edition.code_label, 120),
      church_name: clampString(edition.church_name, 200, 'كنيسة السيدة العذراء مريم'),
      service_title: clampString(edition.service_title, 240),
      motto: clampString(edition.motto, 240),
      church_logo_url: clampNullableUrl(edition.church_logo_url, 500000),
      service_logo_url: clampNullableUrl(edition.service_logo_url, 500000),
      carnival_logo_url: clampNullableUrl(edition.carnival_logo_url, 500000),
      starts_on: clampString(edition.starts_on, 64),
      ends_on: clampString(edition.ends_on, 64),
      footer_text: clampString(edition.footer_text, 300),
      current_stage: edition.current_stage,
      status: edition.status || 'active',
    };
    const cleanData = JSON.parse(JSON.stringify(payload));
    await setDoc(editionDocRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * الاشتراك اللحظي في بيانات دورة الكرنفال (الشعارات، الاسم، التاريخ، المرحلة) لجميع المستخدمين
 */
export function subscribeToEdition(
  editionId: string,
  onUpdate: (edition: Edition) => void,
  onError?: (err: unknown) => void
): () => void {
  const editionDocRef = doc(db, EDITIONS_COLLECTION, editionId);
  return onSnapshot(
    editionDocRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const raw = snapshot.data() as Partial<Edition>;
      if (raw && raw.id && raw.name) {
        onUpdate(raw as Edition);
      }
    },
    (error) => {
      console.warn('Realtime edition sync warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * حفظ إعدادات البوابة والتكويد والأدوار في Firestore (للأدمن فقط)
 */
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
  const path = `${EDITIONS_COLLECTION}/${editionId}/${PORTAL_CONFIG_COLLECTION}/${PORTAL_CONFIG_DOC_ID}`;
  try {
    const docRef = doc(
      db,
      EDITIONS_COLLECTION,
      editionId,
      PORTAL_CONFIG_COLLECTION,
      PORTAL_CONFIG_DOC_ID
    );
    const payload: PortalConfigDoc = {
      id: PORTAL_CONFIG_DOC_ID,
      edition_id: clampString(editionId, 128),
      ...(partial.attendance_policy ? { attendance_policy: partial.attendance_policy } : {}),
      ...(partial.coded_grades ? { coded_grades: partial.coded_grades.slice(0, 50) } : {}),
      ...(partial.coded_teams ? { coded_teams: partial.coded_teams.slice(0, 100) } : {}),
      ...(partial.servant_roles ? { servant_roles: partial.servant_roles.slice(0, 500) } : {}),
      ...(partial.activity_rounds ? { activity_rounds: partial.activity_rounds.slice(0, 100) } : {}),
      ...(partial.axes ? { axes: partial.axes.slice(0, 12) } : {}),
      ...(partial.carnival_history ? { carnival_history: partial.carnival_history.slice(0, 100) } : {}),
      ...(partial.demo_data_cleared !== undefined
        ? { demo_data_cleared: Boolean(partial.demo_data_cleared) }
        : {}),
      ...(partial.demo_cleaned_at
        ? { demo_cleaned_at: clampString(partial.demo_cleaned_at, 64) }
        : {}),
      updated_at: new Date().toISOString(),
    };
    const cleanData = JSON.parse(JSON.stringify(payload));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * حفظ قوائم التكويد (السنوات الدراسية والفرق) في مستند config/coding للأدمن أو الخادم المفوض للتكويد
 */
export async function saveCodingConfigToFirestore(
  editionId: string,
  partial: {
    coded_grades?: CodedGradeItem[];
    coded_teams?: CodedTeamItem[];
  },
  actorServantId?: string
): Promise<void> {
  const path = `${EDITIONS_COLLECTION}/${editionId}/${PORTAL_CONFIG_COLLECTION}/${CODING_CONFIG_DOC_ID}`;
  try {
    const docRef = doc(
      db,
      EDITIONS_COLLECTION,
      editionId,
      PORTAL_CONFIG_COLLECTION,
      CODING_CONFIG_DOC_ID
    );
    const payload: PortalConfigDoc = {
      id: CODING_CONFIG_DOC_ID,
      edition_id: clampString(editionId, 128),
      ...(partial.coded_grades ? { coded_grades: partial.coded_grades.slice(0, 50) } : {}),
      ...(partial.coded_teams ? { coded_teams: partial.coded_teams.slice(0, 100) } : {}),
      ...(actorServantId ? { updated_by_servant_id: clampString(actorServantId, 128) } : {}),
      updated_at: new Date().toISOString(),
    };
    const cleanData = JSON.parse(JSON.stringify(payload));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * الاشتراك اللحظي في سياسة البوابة والتكويد والأدوار والجولات من Firestore لجميع المستخدمين
 */
export function subscribeToPortalConfig(
  editionId: string,
  onUpdate: (config: PortalConfigDoc) => void,
  onError?: (err: unknown) => void
): () => void {
  const docRef = doc(
    db,
    EDITIONS_COLLECTION,
    editionId,
    PORTAL_CONFIG_COLLECTION,
    PORTAL_CONFIG_DOC_ID
  );
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      onUpdate(snapshot.data() as PortalConfigDoc);
    },
    (error) => {
      console.warn('Realtime portal config sync warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * الاشتراك اللحظي في مستند التكويد المشترك config/coding
 */
export function subscribeToCodingConfig(
  editionId: string,
  onUpdate: (config: PortalConfigDoc) => void,
  onError?: (err: unknown) => void
): () => void {
  const docRef = doc(
    db,
    EDITIONS_COLLECTION,
    editionId,
    PORTAL_CONFIG_COLLECTION,
    CODING_CONFIG_DOC_ID
  );
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      onUpdate(snapshot.data() as PortalConfigDoc);
    },
    (error) => {
      console.warn('Realtime coding config sync warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * حفظ سجل كود دخول مربوط ببطاقة خادم في Firestore
 */
export async function saveLoginCodeToFirestore(record: LoginCodeRecord): Promise<void> {
  const path = `${LOGIN_CODES_COLLECTION}/${record.id}`;
  try {
    const cleanData: LoginCodeRecord = {
      id: clampString(record.id, 128),
      servant_id: clampString(record.servant_id, 128),
      code_hash: clampString(record.code_hash, 128),
      delivery_status: record.delivery_status,
      used_at: record.used_at ?? null,
      expires_at: clampString(record.expires_at, 64),
      created_at: clampString(record.created_at, 64),
    };
    await setDoc(doc(db, LOGIN_CODES_COLLECTION, cleanData.id), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * تحديث وقت استخدام كود الدخول
 */
export async function markLoginCodeUsedInFirestore(codeId: string, usedAt: string): Promise<void> {
  const path = `${LOGIN_CODES_COLLECTION}/${codeId}`;
  try {
    await updateDoc(doc(db, LOGIN_CODES_COLLECTION, codeId), {
      used_at: clampString(usedAt, 64),
    });
  } catch (error) {
    console.warn('Mark login code used warning:', error);
  }
}

/**
 * الاشتراك اللحظي في أكواد الدخول من Firestore
 */
export function subscribeToLoginCodes(
  onUpdate: (codes: LoginCodeRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, LOGIN_CODES_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: LoginCodeRecord[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as Partial<LoginCodeRecord>;
        if (raw && raw.id && raw.servant_id && raw.code_hash) {
          items.push({
            id: String(raw.id),
            servant_id: String(raw.servant_id),
            code_hash: String(raw.code_hash),
            delivery_status:
              raw.delivery_status === 'failed'
                ? 'failed'
                : raw.delivery_status === 'whatsapp_sent'
                ? 'whatsapp_sent'
                : 'sent',
            used_at: raw.used_at ? String(raw.used_at) : null,
            expires_at: String(raw.expires_at || ''),
            created_at: String(raw.created_at || ''),
          });
        }
      });
      onUpdate(items);
    },
    (error) => {
      console.warn('Realtime login codes sync warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * الاشتراك اللحظي في إعداد دخول الأدمن والرقم الثابت لأول مرة
 */
export function subscribeToAdminAuthConfig(
  editionId: string,
  onUpdate: (config: AdminAuthConfig) => void,
  onError?: (err: unknown) => void
): () => void {
  const docRef = doc(
    db,
    EDITIONS_COLLECTION,
    editionId,
    PORTAL_CONFIG_COLLECTION,
    ADMIN_AUTH_CONFIG_DOC_ID
  );
  return onSnapshot(
    docRef,
    (snapshot) => {
      if (!snapshot.exists()) return;
      const raw = snapshot.data() as Partial<AdminAuthConfig>;
      if (raw && raw.id === 'admin_auth') {
        onUpdate({
          id: 'admin_auth',
          edition_id: String(raw.edition_id || editionId),
          admin_servant_id: String(raw.admin_servant_id || 's-admin-1'),
          admin_email: String(raw.admin_email || INITIAL_ADMIN_AUTH_CONFIG.admin_email),
          admin_username: String(raw.admin_username || ''),
          admin_password_hash: String(raw.admin_password_hash || ''),
          bootstrap_code_hash: String(raw.bootstrap_code_hash || ''),
          bootstrap_used: Boolean(raw.bootstrap_used),
          updated_at: String(raw.updated_at || ''),
        });
      }
    },
    (error) => {
      console.warn('Realtime admin_auth sync warning:', error);
      if (onError) onError(error);
    }
  );
}

/**
 * إتمام تفعيل حساب الأدمن لأول مرة بشكل ذري (Batch):
 * تعيين اليوزرنيم والباسورد الدائمين وتعطيل الرقم الثابت للأبد
 */
export async function completeAdminBootstrapInFirestore(
  editionId: string,
  servantId: string,
  adminEmail: string,
  username: string,
  passwordHash: string
): Promise<void> {
  const cleanUsername = clampString(username, 120);
  const cleanPasswordHash = clampString(passwordHash, 128);
  const nowIso = new Date().toISOString();

  const authDocRef = doc(
    db,
    EDITIONS_COLLECTION,
    editionId,
    PORTAL_CONFIG_COLLECTION,
    ADMIN_AUTH_CONFIG_DOC_ID
  );
  const servantDocRef = doc(db, SERVANTS_COLLECTION, servantId);
  const authPath = `${EDITIONS_COLLECTION}/${editionId}/${PORTAL_CONFIG_COLLECTION}/${ADMIN_AUTH_CONFIG_DOC_ID}`;

  try {
    const [authSnap, servantSnap] = await Promise.all([
      getDoc(authDocRef),
      getDoc(servantDocRef),
    ]);

    if (!authSnap.exists()) {
      await setDoc(authDocRef, {
        ...INITIAL_ADMIN_AUTH_CONFIG,
        edition_id: editionId,
        admin_servant_id: servantId,
        admin_email: clampString(adminEmail, 160, INITIAL_ADMIN_AUTH_CONFIG.admin_email),
      });
    }

    if (!servantSnap.exists()) {
      const seedAdmin = INITIAL_SERVANTS.find((s) => s.id === servantId);
      if (seedAdmin) {
        await saveServantToFirestore(seedAdmin);
      }
    }

    const batch = writeBatch(db);
    batch.update(authDocRef, {
      admin_username: cleanUsername,
      admin_password_hash: cleanPasswordHash,
      bootstrap_code_hash: '',
      bootstrap_used: true,
      updated_at: nowIso,
    });
    batch.update(servantDocRef, {
      admin_username: cleanUsername,
      admin_password_hash: cleanPasswordHash,
      username: cleanUsername,
      custom_password_hash: cleanPasswordHash,
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, authPath);
  }
}

/**
 * بذر البيانات الأولية إذا كانت قاعدة البيانات فارغة أو ناقصة المستندات المرجعية
 */
export async function seedInitialDataIfEmpty(
  initialServants: Servant[],
  _initialKids: KidParticipant[],
  initialEdition: Edition
): Promise<void> {
  try {
    const editionSnap = await getDoc(doc(db, EDITIONS_COLLECTION, initialEdition.id));
    if (!editionSnap.exists()) {
      await saveEditionToFirestore(initialEdition);
    }

    const adminSeed = initialServants.find((s) => s.id === 's-admin-1');
    if (adminSeed) {
      const adminSnap = await getDoc(doc(db, SERVANTS_COLLECTION, 's-admin-1'));
      if (!adminSnap.exists()) {
        await saveServantToFirestore(adminSeed);
      }
    }

    const adminAuthRef = doc(
      db,
      EDITIONS_COLLECTION,
      initialEdition.id,
      PORTAL_CONFIG_COLLECTION,
      ADMIN_AUTH_CONFIG_DOC_ID
    );
    const adminAuthSnap = await getDoc(adminAuthRef);
    if (!adminAuthSnap.exists()) {
      await setDoc(adminAuthRef, INITIAL_ADMIN_AUTH_CONFIG);
    }
  } catch (err) {
    console.warn('Seeding initial data deferred or offline:', err);
  }
}

// ============================================================================
// وظائف تشغيل يوم الكرنفال: حضور البوابة، سجل النقاط التراكمي، الطوارئ، تسكين الفرق
// ============================================================================

function toGateCheckinPayload(record: GateCheckinRecord): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: clampString(record.id, 128),
    edition_id: clampString(record.edition_id || 'ed-carnival-2027', 128),
    subject_type: record.subject_type === 'servant' ? 'servant' : 'kid',
    subject_id: clampString(record.subject_id, 128),
    subject_name: clampString(record.subject_name, 160, 'مشارك'),
    service_id: clampString(record.service_id, 128, 'srv-general'),
    qr_token: clampString(record.qr_token, 128, record.subject_id),
    checked_in_at: clampString(record.checked_in_at, 64),
    checked_in_local_time: clampString(record.checked_in_local_time, 16),
    is_early_arrival: Boolean(record.is_early_arrival),
    gate_points_awarded: Math.max(0, Math.min(500, Number(record.gate_points_awarded) || 0)),
    early_bonus_awarded: Math.max(0, Math.min(500, Number(record.early_bonus_awarded) || 0)),
    recorded_by_servant_id: clampString(record.recorded_by_servant_id, 128),
    recorded_by_name: clampString(record.recorded_by_name, 160, 'خادم البوابة'),
  };
  if (record.team_name && record.team_name.trim()) {
    payload.team_name = clampString(record.team_name, 160);
  }
  if (record.pin_code && record.pin_code.trim()) {
    payload.pin_code = clampString(record.pin_code, 32);
  }
  return payload;
}

function toPointsLedgerPayload(entry: PointsLedgerEntry): Record<string, unknown> {
  const rawPoints = Number(entry.points) || 0;
  const clampedPoints = Math.max(-1000, Math.min(1000, rawPoints));
  const payload: Record<string, unknown> = {
    id: clampString(entry.id, 128),
    edition_id: clampString(entry.edition_id || 'ed-carnival-2027', 128),
    team_id: clampString(entry.team_id, 128, 'tm-unassigned'),
    team_name: clampString(entry.team_name, 160, 'عام'),
    target_type:
      entry.target_type === 'kid' || entry.target_type === 'servant' ? entry.target_type : 'team',
    source: entry.source,
    points: entry.source === 'correction' ? clampedPoints : Math.max(0, clampedPoints),
    reason: clampString(entry.reason, 300, 'رصد نقاط'),
    recorded_by_servant_id: clampString(entry.recorded_by_servant_id, 128),
    recorded_by_name: clampString(entry.recorded_by_name, 160, 'خادم'),
    created_at: clampString(entry.created_at, 64),
  };
  if (entry.round_id && entry.round_id.trim()) {
    payload.round_id = clampString(entry.round_id, 128);
  }
  if (entry.round_title && entry.round_title.trim()) {
    payload.round_title = clampString(entry.round_title, 160);
  }
  if (entry.axis_name && entry.axis_name.trim()) {
    payload.axis_name = clampString(entry.axis_name, 120);
  }
  if (entry.target_id && entry.target_id.trim()) {
    payload.target_id = clampString(entry.target_id, 128);
  }
  if (entry.target_name && entry.target_name.trim()) {
    payload.target_name = clampString(entry.target_name, 160);
  }
  return payload;
}

function toEmergencyAlertPayload(alert: EmergencyAlertRecord): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    id: clampString(alert.id, 128),
    edition_id: clampString(alert.edition_id || 'ed-carnival-2027', 128),
    category: alert.category,
    severity: alert.severity,
    title: clampString(alert.title, 180, 'بلاغ ميداني'),
    description: clampString(alert.description, 600, '-'),
    location: clampString(alert.location, 160, 'الساحة الرئيسية'),
    status: alert.status,
    reported_by_servant_id: clampString(alert.reported_by_servant_id, 128),
    reported_by_name: clampString(alert.reported_by_name, 160, 'مستخدم'),
    created_at: clampString(alert.created_at, 64),
    updated_at: clampString(alert.updated_at, 64),
  };
  if (alert.related_person_id && alert.related_person_id.trim()) {
    payload.related_person_id = clampString(alert.related_person_id, 128);
  }
  if (alert.related_person_name && alert.related_person_name.trim()) {
    payload.related_person_name = clampString(alert.related_person_name, 160);
  }
  if (alert.related_team_name && alert.related_team_name.trim()) {
    payload.related_team_name = clampString(alert.related_team_name, 160);
  }
  if (alert.updated_by_servant_id && alert.updated_by_servant_id.trim()) {
    payload.updated_by_servant_id = clampString(alert.updated_by_servant_id, 128);
  }
  if (alert.resolved_by_name && alert.resolved_by_name.trim()) {
    payload.resolved_by_name = clampString(alert.resolved_by_name, 160);
  }
  if (alert.resolution_note && alert.resolution_note.trim()) {
    payload.resolution_note = clampString(alert.resolution_note, 400);
  }
  return payload;
}

export async function recordGateCheckinInFirestore(
  checkin: GateCheckinRecord,
  ledgerEntries: PointsLedgerEntry[]
): Promise<void> {
  const editionId = clampString(checkin.edition_id || 'ed-carnival-2027', 128);
  const checkinPath = `${EDITIONS_COLLECTION}/${editionId}/${GATE_CHECKINS_SUBCOLLECTION}/${checkin.id}`;
  try {
    const batch = writeBatch(db);
    const checkinRef = doc(
      db,
      EDITIONS_COLLECTION,
      editionId,
      GATE_CHECKINS_SUBCOLLECTION,
      checkin.id
    );
    batch.set(checkinRef, toGateCheckinPayload(checkin));

    for (const entry of ledgerEntries) {
      const entryRef = doc(
        db,
        EDITIONS_COLLECTION,
        editionId,
        POINTS_LEDGER_SUBCOLLECTION,
        entry.id
      );
      batch.set(entryRef, toPointsLedgerPayload(entry));
    }

    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, checkinPath);
  }
}

export function subscribeToGateCheckins(
  editionId: string,
  onUpdate: (records: GateCheckinRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const path = `${EDITIONS_COLLECTION}/${editionId}/${GATE_CHECKINS_SUBCOLLECTION}`;
  const colRef = collection(db, EDITIONS_COLLECTION, editionId, GATE_CHECKINS_SUBCOLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const records: GateCheckinRecord[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, unknown>;
        if (!raw || !raw.id) return;
        records.push({
          id: String(raw.id),
          edition_id: String(raw.edition_id || editionId),
          subject_type: raw.subject_type === 'servant' ? 'servant' : 'kid',
          subject_id: String(raw.subject_id || ''),
          subject_name: String(raw.subject_name || ''),
          service_id: String(raw.service_id || ''),
          team_name: raw.team_name ? String(raw.team_name) : undefined,
          qr_token: String(raw.qr_token || ''),
          pin_code: raw.pin_code ? String(raw.pin_code) : undefined,
          checked_in_at: String(raw.checked_in_at || ''),
          checked_in_local_time: String(raw.checked_in_local_time || ''),
          is_early_arrival: Boolean(raw.is_early_arrival),
          gate_points_awarded: Number(raw.gate_points_awarded) || 0,
          early_bonus_awarded: Number(raw.early_bonus_awarded) || 0,
          recorded_by_servant_id: String(raw.recorded_by_servant_id || ''),
          recorded_by_name: String(raw.recorded_by_name || ''),
        });
      });
      records.sort((a, b) => b.checked_in_at.localeCompare(a.checked_in_at));
      onUpdate(records);
    },
    (error) => {
      console.warn('Realtime gate_checkins sync warning:', error);
      if (onError) onError(error);
      else console.error(path, error);
    }
  );
}

export async function addPointsLedgerEntryInFirestore(entry: PointsLedgerEntry): Promise<void> {
  const editionId = clampString(entry.edition_id || 'ed-carnival-2027', 128);
  const entryPath = `${EDITIONS_COLLECTION}/${editionId}/${POINTS_LEDGER_SUBCOLLECTION}/${entry.id}`;
  try {
    await setDoc(
      doc(db, EDITIONS_COLLECTION, editionId, POINTS_LEDGER_SUBCOLLECTION, entry.id),
      toPointsLedgerPayload(entry)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, entryPath);
  }
}

export function subscribeToPointsLedger(
  editionId: string,
  onUpdate: (entries: PointsLedgerEntry[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, EDITIONS_COLLECTION, editionId, POINTS_LEDGER_SUBCOLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const entries: PointsLedgerEntry[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, unknown>;
        if (!raw || !raw.id) return;
        const src = String(raw.source || 'round');
        const validSource =
          src === 'gate' ||
          src === 'early_bonus' ||
          src === 'round' ||
          src === 'team_spirit' ||
          src === 'correction'
            ? src
            : 'round';
        entries.push({
          id: String(raw.id),
          edition_id: String(raw.edition_id || editionId),
          team_id: String(raw.team_id || ''),
          team_name: String(raw.team_name || ''),
          round_id: raw.round_id ? String(raw.round_id) : undefined,
          round_title: raw.round_title ? String(raw.round_title) : undefined,
          axis_name: raw.axis_name ? String(raw.axis_name) : undefined,
          target_type:
            raw.target_type === 'kid' || raw.target_type === 'servant' ? raw.target_type : 'team',
          target_id: raw.target_id ? String(raw.target_id) : undefined,
          target_name: raw.target_name ? String(raw.target_name) : undefined,
          source: validSource,
          points: Number(raw.points) || 0,
          reason: String(raw.reason || ''),
          recorded_by_servant_id: String(raw.recorded_by_servant_id || ''),
          recorded_by_name: String(raw.recorded_by_name || ''),
          created_at: String(raw.created_at || ''),
        });
      });
      entries.sort((a, b) => b.created_at.localeCompare(a.created_at));
      onUpdate(entries);
    },
    (error) => {
      console.warn('Realtime points_ledger sync warning:', error);
      if (onError) onError(error);
    }
  );
}

export async function createEmergencyAlertInFirestore(alert: EmergencyAlertRecord): Promise<void> {
  const editionId = clampString(alert.edition_id || 'ed-carnival-2027', 128);
  const alertPath = `${EDITIONS_COLLECTION}/${editionId}/${ALERTS_SUBCOLLECTION}/${alert.id}`;
  try {
    await setDoc(
      doc(db, EDITIONS_COLLECTION, editionId, ALERTS_SUBCOLLECTION, alert.id),
      toEmergencyAlertPayload(alert)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, alertPath);
  }
}

export async function updateEmergencyAlertInFirestore(
  editionId: string,
  alertId: string,
  patch: {
    status: EmergencyAlertStatus;
    updated_by_servant_id: string;
    resolved_by_name?: string;
    resolution_note?: string;
    updated_at: string;
  }
): Promise<void> {
  const cleanEditionId = clampString(editionId || 'ed-carnival-2027', 128);
  const alertPath = `${EDITIONS_COLLECTION}/${cleanEditionId}/${ALERTS_SUBCOLLECTION}/${alertId}`;
  const updateBody: Record<string, unknown> = {
    status: patch.status,
    updated_by_servant_id: clampString(patch.updated_by_servant_id, 128),
    updated_at: clampString(patch.updated_at, 64),
  };
  if (patch.resolved_by_name && patch.resolved_by_name.trim()) {
    updateBody.resolved_by_name = clampString(patch.resolved_by_name, 160);
  }
  if (patch.resolution_note && patch.resolution_note.trim()) {
    updateBody.resolution_note = clampString(patch.resolution_note, 400);
  }
  try {
    await updateDoc(
      doc(db, EDITIONS_COLLECTION, cleanEditionId, ALERTS_SUBCOLLECTION, alertId),
      updateBody
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, alertPath);
  }
}

export function subscribeToEmergencyAlerts(
  editionId: string,
  onUpdate: (alerts: EmergencyAlertRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, EDITIONS_COLLECTION, editionId, ALERTS_SUBCOLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: EmergencyAlertRecord[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, unknown>;
        if (!raw || !raw.id) return;
        const cat = String(raw.category || 'logistics');
        const sev = String(raw.severity || 'normal');
        const st = String(raw.status || 'open');
        items.push({
          id: String(raw.id),
          edition_id: String(raw.edition_id || editionId),
          category:
            cat === 'medical' ||
            cat === 'lost_child' ||
            cat === 'lost_item' ||
            cat === 'schedule_change'
              ? cat
              : 'logistics',
          severity: sev === 'urgent' || sev === 'critical' ? sev : 'normal',
          title: String(raw.title || ''),
          description: String(raw.description || ''),
          location: String(raw.location || ''),
          related_person_id: raw.related_person_id ? String(raw.related_person_id) : undefined,
          related_person_name: raw.related_person_name ? String(raw.related_person_name) : undefined,
          related_team_name: raw.related_team_name ? String(raw.related_team_name) : undefined,
          status: st === 'in_progress' || st === 'resolved' ? st : 'open',
          reported_by_servant_id: String(raw.reported_by_servant_id || ''),
          reported_by_name: String(raw.reported_by_name || ''),
          updated_by_servant_id: raw.updated_by_servant_id
            ? String(raw.updated_by_servant_id)
            : undefined,
          resolved_by_name: raw.resolved_by_name ? String(raw.resolved_by_name) : undefined,
          resolution_note: raw.resolution_note ? String(raw.resolution_note) : undefined,
          created_at: String(raw.created_at || ''),
          updated_at: String(raw.updated_at || ''),
        });
      });
      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      onUpdate(items);
    },
    (error) => {
      console.warn('Realtime alerts sync warning:', error);
      if (onError) onError(error);
    }
  );
}

export async function updateKidTeamInFirestore(
  kidId: string,
  newTeamName: string,
  updatedByServantId: string
): Promise<void> {
  const kidPath = `${KIDS_COLLECTION}/${kidId}`;
  try {
    await updateDoc(doc(db, KIDS_COLLECTION, kidId), {
      team_name: clampString(newTeamName, 160),
      team_updated_by_servant_id: clampString(updatedByServantId, 128),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, kidPath);
  }
}

// ============================================================================
// سجل المراقبة (Audit Logs) في Firestore وتنظيف البيانات التجريبية قبل الإطلاق
// ============================================================================

function toAuditLogPayload(record: AuditLogRecord): Record<string, unknown> {
  const sanitizedDetails: Record<string, string | number | boolean> = {};
  if (record.details && typeof record.details === 'object') {
    const entries = Object.entries(record.details).slice(0, 15);
    for (const [key, val] of entries) {
      const cleanKey = clampString(key, 60);
      if (!cleanKey) continue;
      if (typeof val === 'boolean' || typeof val === 'number') {
        sanitizedDetails[cleanKey] = val;
      } else if (val !== undefined && val !== null) {
        sanitizedDetails[cleanKey] = clampString(String(val), 180);
      }
    }
  }

  return {
    id: clampString(record.id, 128),
    edition_id: clampString(record.edition_id || 'ed-carnival-2027', 128),
    actor_id: record.actor_id ? clampString(record.actor_id, 128) : null,
    actor_name: clampString(record.actor_name, 160, 'نظام البوابة'),
    action: clampString(record.action, 120, 'SYSTEM_EVENT'),
    target: clampString(record.target, 200, 'system'),
    details: sanitizedDetails,
    created_at: clampString(record.created_at, 64),
  };
}

export async function saveAuditLogToFirestore(record: AuditLogRecord): Promise<void> {
  const editionId = clampString(record.edition_id || 'ed-carnival-2027', 128);
  const path = `${EDITIONS_COLLECTION}/${editionId}/${AUDIT_LOGS_SUBCOLLECTION}/${record.id}`;
  try {
    await setDoc(
      doc(db, EDITIONS_COLLECTION, editionId, AUDIT_LOGS_SUBCOLLECTION, record.id),
      toAuditLogPayload(record)
    );
  } catch (error) {
    console.warn(`Audit log persistence skipped (${path}):`, error);
  }
}

export function subscribeToAuditLogs(
  editionId: string,
  onUpdate: (logs: AuditLogRecord[]) => void,
  onError?: (err: unknown) => void
): () => void {
  const colRef = collection(db, EDITIONS_COLLECTION, editionId, AUDIT_LOGS_SUBCOLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: AuditLogRecord[] = [];
      snapshot.forEach((docSnap) => {
        const raw = docSnap.data() as Record<string, unknown>;
        if (!raw || !raw.id) return;
        if (DEMO_AUDIT_LOG_IDS.includes(String(raw.id))) return;
        const detailsObj: Record<string, string | number | boolean> = {};
        if (raw.details && typeof raw.details === 'object') {
          for (const [k, v] of Object.entries(raw.details as Record<string, unknown>)) {
            if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
              detailsObj[k] = v;
            }
          }
        }
        items.push({
          id: String(raw.id),
          edition_id: String(raw.edition_id || editionId),
          actor_id: raw.actor_id ? String(raw.actor_id) : null,
          actor_name: String(raw.actor_name || ''),
          action: String(raw.action || ''),
          target: String(raw.target || ''),
          details: detailsObj,
          created_at: String(raw.created_at || ''),
        });
      });
      items.sort((a, b) => b.created_at.localeCompare(a.created_at));
      onUpdate(items);
    },
    (error) => {
      console.warn('Realtime audit_logs sync warning:', error);
      if (onError) onError(error);
    }
  );
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

  const editionId = clampString(options.editionId || 'ed-carnival-2027', 128);
  const nowIso = new Date().toISOString();
  let deletedCount = 0;

  await savePortalConfigToFirestore(editionId, {
    demo_data_cleared: true,
    demo_cleaned_at: nowIso,
    ...(options.remainingRoles ? { servant_roles: options.remainingRoles } : {}),
  });

  for (const servantId of options.servantIdsToDelete) {
    if (servantId === 's-admin-1') continue;
    await deleteServantFromFirestore(servantId);
    deletedCount += 1;
  }

  for (const kidId of options.kidIdsToDelete) {
    await deleteKidFromFirestore(kidId);
    deletedCount += 1;
  }

  for (const codeId of options.loginCodeIdsToDelete) {
    await deleteDoc(doc(db, LOGIN_CODES_COLLECTION, codeId)).catch(() => undefined);
    deletedCount += 1;
  }

  for (const logId of options.auditLogIdsToDelete) {
    await deleteDoc(
      doc(db, EDITIONS_COLLECTION, editionId, AUDIT_LOGS_SUBCOLLECTION, logId)
    ).catch(() => undefined);
    deletedCount += 1;
  }

  for (const checkinId of options.gateCheckinIdsToDelete || []) {
    await deleteDoc(
      doc(db, EDITIONS_COLLECTION, editionId, GATE_CHECKINS_SUBCOLLECTION, checkinId)
    ).catch(() => undefined);
    deletedCount += 1;
  }

  for (const alertId of options.alertIdsToDelete || []) {
    await deleteDoc(
      doc(db, EDITIONS_COLLECTION, editionId, ALERTS_SUBCOLLECTION, alertId)
    ).catch(() => undefined);
    deletedCount += 1;
  }

  let zeroedTeamsCount = 0;
  for (const entry of options.zeroOutLedgerEntries || []) {
    await addPointsLedgerEntryInFirestore(entry);
    zeroedTeamsCount += 1;
  }

  return { deletedCount, zeroedTeamsCount };
}
