import { desc, eq, inArray } from 'drizzle-orm';
import { db } from './index.ts';
import {
  auditLogs,
  editions,
  emergencyAlerts,
  gateCheckins,
  kids,
  loginCodes,
  pointsLedger,
  portalConfigs,
  servants,
} from './schema.ts';

export const DEMO_SERVANT_IDS = ['s-team-1', 's-staff-1', 's-lead-1', 's-pending-1'];
export const DEMO_KID_IDS = ['kid-101', 'kid-102'];
export const DEMO_LOGIN_CODE_IDS = ['lc-1', 'lc-2', 'lc-3', 'lc-4', 'lc-5'];
export const DEMO_AUDIT_LOG_IDS = ['aud-1', 'aud-2'];

export function clampString(value: unknown, maxLen: number, fallback = ''): string {
  const str =
    typeof value === 'string'
      ? value.trim()
      : value == null
      ? ''
      : String(value).trim();
  if (!str) return fallback;
  return str.length > maxLen ? str.slice(0, maxLen) : str;
}

export function clampNullableUrl(
  value: unknown,
  maxLen = 500000
): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (value.length > maxLen) return null;
  return value;
}

export function serverComputeHash(input: string): string {
  const normalized = input.trim().toUpperCase();
  let h1 = 0xdeadbeef ^ normalized.length;
  let h2 = 0x41c6ce57 ^ normalized.length;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 =
    Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^
    Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 =
    Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^
    Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    'sha256_' +
    (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0') +
    normalized.length.toString(16).padStart(4, '0')
  );
}

function mapEditionRow(row: typeof editions.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    code_label: row.codeLabel,
    church_name: row.churchName,
    service_title: row.serviceTitle,
    motto: row.motto,
    church_logo_url: row.churchLogoUrl,
    service_logo_url: row.serviceLogoUrl,
    carnival_logo_url: row.carnivalLogoUrl,
    starts_on: row.startsOn,
    ends_on: row.endsOn,
    footer_text: row.footerText,
    current_stage: row.currentStage,
    status: row.status,
  };
}

function mapServantRow(row: typeof servants.$inferSelect, includePrivatePii: boolean) {
  return {
    id: row.id,
    edition_id: row.editionId,
    full_name: row.fullName,
    service_id: row.serviceId,
    phone: includePrivatePii ? row.phone : '',
    phone_hash: row.phoneHash || undefined,
    whatsapp: includePrivatePii ? row.whatsapp : '',
    email: includePrivatePii ? row.email : '',
    email_hash: row.emailHash || undefined,
    national_id_hash: row.nationalIdHash,
    national_id_last4: row.nationalIdLast4,
    national_id_display: includePrivatePii ? row.nationalIdDisplay || undefined : undefined,
    gender: row.gender === 'أنثى' ? 'أنثى' : row.gender === 'ذكر' ? 'ذكر' : undefined,
    birth_date: includePrivatePii ? row.birthDate || undefined : undefined,
    governorate: row.governorate || undefined,
    avatar_url: row.avatarUrl ?? null,
    health_and_skills: {
      skills: Array.isArray(row.skills) ? row.skills.map(String) : [],
      health_notes: includePrivatePii ? row.healthNotes || '' : '',
    },
    status: row.status,
    qr_token: row.qrToken,
    pin_code: row.pinCode || undefined,
    pin_code_hash: row.pinCodeHash || undefined,
    username: row.username || undefined,
    can_view_kids_codes: row.canViewKidsCodes,
    can_manage_coding: row.canManageCoding,
    admin_username: row.adminUsername || undefined,
    admin_password_hash: row.adminPasswordHash || undefined,
    custom_password_hash: row.customPasswordHash || undefined,
    primary_role:
      row.primaryRole === 'team_lead' || row.primaryRole === 'staff'
        ? row.primaryRole
        : row.primaryRole === null
        ? null
        : undefined,
    created_at: row.createdAt,
  };
}

function mapKidRow(row: typeof kids.$inferSelect, includePrivatePii: boolean) {
  return {
    id: row.id,
    edition_id: row.editionId,
    full_name: row.fullName,
    service_id: row.serviceId,
    grade_label: row.gradeLabel,
    parent_phone: includePrivatePii ? row.parentPhone : '',
    health_notes: includePrivatePii ? row.healthNotes || 'لا توجد' : 'لا توجد',
    team_name: row.teamName,
    pin_code: row.pinCode,
    qr_token: row.qrToken,
    registered_by_name: row.registeredByName,
    source: row.source === 'excel' ? 'excel' : 'manual',
    created_at: row.createdAt,
  };
}

export async function ensureEditionRow(editionId: string): Promise<void> {
  const cleanId = clampString(editionId, 128, 'ed-carnival-2027');
  try {
    await db
      .insert(editions)
      .values({
        id: cleanId,
        name: 'كرنفال الأطفال ٢٠٢٧',
        codeLabel: 'Reflection 2027',
        churchName: 'كنيسة السيدة العذراء مريم - بالعصافرة',
        serviceTitle: 'خدمة مدارس الأحد',
        motto: 'ليكن فيكم هذا الفكر',
        startsOn: '2027-07-15',
        endsOn: '2027-07-17',
        footerText: 'كنيسة السيدة العذراء مريم - بالعصافرة',
        currentStage: 2,
        status: 'active',
      })
      .onConflictDoNothing({ target: editions.id });
  } catch (error) {
    console.error('Database error ensuring edition:', error);
    throw new Error('Failed to initialize carnival edition.', { cause: error });
  }
}

export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await db.select({ id: editions.id }).from(editions).limit(1);
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    throw new Error('Database service unavailable.', { cause: error });
  }
}

export async function getFullCarnivalSnapshot(
  editionId: string,
  includePrivatePii: boolean
) {
  const cleanEditionId = clampString(editionId, 128, 'ed-carnival-2027');
  try {
    const [
      editionRows,
      configRows,
      servantRows,
      kidRows,
      loginCodeRows,
      checkinRows,
      ledgerRows,
      alertRows,
      auditRows,
    ] = await Promise.all([
      db.select().from(editions).where(eq(editions.id, cleanEditionId)).limit(1),
      db
        .select()
        .from(portalConfigs)
        .where(eq(portalConfigs.editionId, cleanEditionId)),
      db.select().from(servants),
      db.select().from(kids),
      db.select().from(loginCodes),
      db
        .select()
        .from(gateCheckins)
        .where(eq(gateCheckins.editionId, cleanEditionId))
        .orderBy(desc(gateCheckins.checkedInAt)),
      db
        .select()
        .from(pointsLedger)
        .where(eq(pointsLedger.editionId, cleanEditionId))
        .orderBy(desc(pointsLedger.createdAt)),
      db
        .select()
        .from(emergencyAlerts)
        .where(eq(emergencyAlerts.editionId, cleanEditionId))
        .orderBy(desc(emergencyAlerts.createdAt)),
      db
        .select()
        .from(auditLogs)
        .where(eq(auditLogs.editionId, cleanEditionId))
        .orderBy(desc(auditLogs.createdAt)),
    ]);

    const configMap = new Map(configRows.map((c) => [c.configKey, c]));
    const portalCfgRow = configMap.get('portal');
    const codingCfgRow = configMap.get('coding');
    const adminAuthRow = configMap.get('admin_auth');

    return {
      edition: editionRows[0] ? mapEditionRow(editionRows[0]) : null,
      portalConfig: portalCfgRow
        ? {
            id: 'portal',
            edition_id: portalCfgRow.editionId,
            ...(portalCfgRow.payload as Record<string, unknown>),
            updated_at: portalCfgRow.updatedAt,
          }
        : null,
      codingConfig: codingCfgRow
        ? {
            id: 'coding',
            edition_id: codingCfgRow.editionId,
            ...(codingCfgRow.payload as Record<string, unknown>),
            updated_by_servant_id: codingCfgRow.updatedByServantId || undefined,
            updated_at: codingCfgRow.updatedAt,
          }
        : null,
      adminAuthConfig: adminAuthRow
        ? {
            id: 'admin_auth',
            edition_id: adminAuthRow.editionId,
            ...(adminAuthRow.payload as Record<string, unknown>),
            updated_at: adminAuthRow.updatedAt,
          }
        : null,
      servants: servantRows
        .filter((s) => !DEMO_SERVANT_IDS.includes(s.id))
        .map((s) => mapServantRow(s, includePrivatePii)),
      kids: kidRows
        .filter((k) => !DEMO_KID_IDS.includes(k.id))
        .map((k) => mapKidRow(k, includePrivatePii)),
      loginCodes: loginCodeRows.map((lc) => ({
        id: lc.id,
        servant_id: lc.servantId,
        code_hash: lc.codeHash,
        delivery_status:
          lc.deliveryStatus === 'failed'
            ? 'failed'
            : lc.deliveryStatus === 'whatsapp_sent'
            ? 'whatsapp_sent'
            : 'sent',
        used_at: lc.usedAt ?? null,
        expires_at: lc.expiresAt,
        created_at: lc.createdAt,
      })),
      gateCheckins: checkinRows.map((c) => ({
        id: c.id,
        edition_id: c.editionId,
        subject_type: c.subjectType === 'servant' ? 'servant' : 'kid',
        subject_id: c.subjectId,
        subject_name: c.subjectName,
        service_id: c.serviceId,
        team_name: c.teamName || undefined,
        qr_token: c.qrToken,
        pin_code: c.pinCode || undefined,
        checked_in_at: c.checkedInAt,
        checked_in_local_time: c.checkedInLocalTime,
        is_early_arrival: c.isEarlyArrival,
        gate_points_awarded: c.gatePointsAwarded,
        early_bonus_awarded: c.earlyBonusAwarded,
        recorded_by_servant_id: c.recordedByServantId,
        recorded_by_name: c.recordedByName,
      })),
      pointsLedger: ledgerRows.map((p) => ({
        id: p.id,
        edition_id: p.editionId,
        team_id: p.teamId,
        team_name: p.teamName,
        round_id: p.roundId || undefined,
        round_title: p.roundTitle || undefined,
        axis_name: p.axisName || undefined,
        target_type:
          p.targetType === 'kid' || p.targetType === 'servant'
            ? p.targetType
            : 'team',
        target_id: p.targetId || undefined,
        target_name: p.targetName || undefined,
        source: p.source,
        points: p.points,
        reason: p.reason,
        recorded_by_servant_id: p.recordedByServantId,
        recorded_by_name: p.recordedByName,
        created_at: p.createdAt,
      })),
      alerts: alertRows.map((a) => ({
        id: a.id,
        edition_id: a.editionId,
        category: a.category,
        severity: a.severity,
        title: a.title,
        description: a.description,
        location: a.location,
        related_person_id: a.relatedPersonId || undefined,
        related_person_name: a.relatedPersonName || undefined,
        related_team_name: a.relatedTeamName || undefined,
        status: a.status,
        reported_by_servant_id: a.reportedByServantId,
        reported_by_name: a.reportedByName,
        updated_by_servant_id: a.updatedByServantId || undefined,
        resolved_by_name: a.resolvedByName || undefined,
        resolution_note: a.resolutionNote || undefined,
        created_at: a.createdAt,
        updated_at: a.updatedAt,
      })),
      auditLogs: auditRows
        .filter((l) => !DEMO_AUDIT_LOG_IDS.includes(l.id))
        .map((l) => ({
          id: l.id,
          edition_id: l.editionId,
          actor_id: l.actorId ?? null,
          actor_name: l.actorName,
          action: l.action,
          target: l.target,
          details: (l.details || {}) as Record<string, string | number | boolean>,
          created_at: l.createdAt,
        })),
    };
  } catch (error) {
    console.error('Database query failed in getFullCarnivalSnapshot:', error);
    throw new Error('Failed to load carnival snapshot.', { cause: error });
  }
}

export async function upsertEdition(edition: Record<string, unknown>): Promise<void> {
  const id = clampString(edition.id, 128, 'ed-carnival-2027');
  const stageNum = Math.max(1, Math.min(7, Number(edition.current_stage) || 2));
  const statusVal =
    edition.status === 'draft' || edition.status === 'archived'
      ? edition.status
      : 'active';

  try {
    await db
      .insert(editions)
      .values({
        id,
        name: clampString(edition.name, 200, 'كرنفال Reflection 2027'),
        codeLabel: clampString(edition.code_label, 120),
        churchName: clampString(edition.church_name, 200, 'كنيسة السيدة العذراء مريم'),
        serviceTitle: clampString(edition.service_title, 240),
        motto: clampString(edition.motto, 240),
        churchLogoUrl: clampNullableUrl(edition.church_logo_url),
        serviceLogoUrl: clampNullableUrl(edition.service_logo_url),
        carnivalLogoUrl: clampNullableUrl(edition.carnival_logo_url),
        startsOn: clampString(edition.starts_on, 64),
        endsOn: clampString(edition.ends_on, 64),
        footerText: clampString(edition.footer_text, 300),
        currentStage: stageNum,
        status: statusVal,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: editions.id,
        set: {
          name: clampString(edition.name, 200, 'كرنفال Reflection 2027'),
          codeLabel: clampString(edition.code_label, 120),
          churchName: clampString(edition.church_name, 200, 'كنيسة السيدة العذراء مريم'),
          serviceTitle: clampString(edition.service_title, 240),
          motto: clampString(edition.motto, 240),
          churchLogoUrl: clampNullableUrl(edition.church_logo_url),
          serviceLogoUrl: clampNullableUrl(edition.service_logo_url),
          carnivalLogoUrl: clampNullableUrl(edition.carnival_logo_url),
          startsOn: clampString(edition.starts_on, 64),
          endsOn: clampString(edition.ends_on, 64),
          footerText: clampString(edition.footer_text, 300),
          currentStage: stageNum,
          status: statusVal,
          updatedAt: new Date(),
        },
      });
  } catch (error) {
    console.error('Database query failed in upsertEdition:', error);
    throw new Error('Failed to save edition data.', { cause: error });
  }
}

export async function upsertPortalConfig(
  editionId: string,
  configKey: 'portal' | 'coding' | 'admin_auth',
  partialPayload: Record<string, unknown>,
  updatedByServantId?: string
): Promise<void> {
  const cleanEditionId = clampString(editionId, 128, 'ed-carnival-2027');
  const rowId = `${cleanEditionId}::${configKey}`;
  const nowIso = new Date().toISOString();

  try {
    await ensureEditionRow(cleanEditionId);
    const existing = await db
      .select()
      .from(portalConfigs)
      .where(eq(portalConfigs.id, rowId))
      .limit(1);

    const prevPayload = (existing[0]?.payload || {}) as Record<string, unknown>;
    const mergedPayload: Record<string, unknown> = {
      ...prevPayload,
      ...partialPayload,
    };

    await db
      .insert(portalConfigs)
      .values({
        id: rowId,
        editionId: cleanEditionId,
        configKey,
        payload: mergedPayload,
        updatedByServantId: updatedByServantId
          ? clampString(updatedByServantId, 128)
          : null,
        updatedAt: nowIso,
      })
      .onConflictDoUpdate({
        target: portalConfigs.id,
        set: {
          payload: mergedPayload,
          updatedByServantId: updatedByServantId
            ? clampString(updatedByServantId, 128)
            : existing[0]?.updatedByServantId ?? null,
          updatedAt: nowIso,
        },
      });
  } catch (error) {
    console.error('Database query failed in upsertPortalConfig:', error);
    throw new Error('Failed to save configuration.', { cause: error });
  }
}

export async function canServantManageCoding(servantId: string): Promise<boolean> {
  const cleanId = clampString(servantId, 128);
  if (!cleanId) return false;
  try {
    const rows = await db
      .select({ canManageCoding: servants.canManageCoding })
      .from(servants)
      .where(eq(servants.id, cleanId))
      .limit(1);
    return Boolean(rows[0]?.canManageCoding);
  } catch (error) {
    console.error('Database query failed in canServantManageCoding:', error);
    throw new Error('Failed to verify coding permission.', { cause: error });
  }
}

export async function upsertServant(
  raw: Record<string, unknown>,
  options: { isAdmin: boolean }
): Promise<void> {
  const id = clampString(raw.id, 128);
  if (!id) throw new Error('Invalid servant identifier.');
  const editionId = clampString(raw.edition_id, 128, 'ed-carnival-2027');

  try {
    await ensureEditionRow(editionId);

    const existingRows = await db
      .select()
      .from(servants)
      .where(eq(servants.id, id))
      .limit(1);
    const existing = existingRows[0];

    // Prevent unauthenticated modification of existing servants or admin account
    if (existing && !options.isAdmin) {
      throw new Error('Only administrators can modify existing servant records.');
    }
    if (!options.isAdmin && id === 's-admin-1') {
      throw new Error('Cannot modify administrator record.');
    }

    const rawHealth = raw.health_and_skills as
      | { skills?: unknown[]; health_notes?: unknown }
      | undefined;
    const skills = Array.isArray(rawHealth?.skills)
      ? rawHealth.skills
          .slice(0, 15)
          .map((s) => clampString(s, 120))
          .filter(Boolean)
      : [];

    const phone = clampString(raw.phone, 32, existing?.phone || '01000000000');
    const whatsapp = clampString(raw.whatsapp, 32, existing?.whatsapp || phone);
    const email = clampString(raw.email, 160, existing?.email || '');
    const phoneHash = clampString(
      raw.phone_hash || (phone ? serverComputeHash(phone) : serverComputeHash(id)),
      128
    );
    const emailHash = raw.email_hash
      ? clampString(raw.email_hash, 128)
      : email && !email.startsWith('servant.')
      ? serverComputeHash(email.toLowerCase())
      : existing?.emailHash ?? null;

    const status =
      raw.status === 'pending' || raw.status === 'disabled' ? raw.status : 'approved';
    const primaryRole =
      raw.primary_role === 'team_lead' || raw.primary_role === 'staff'
        ? raw.primary_role
        : raw.primary_role === null
        ? null
        : existing?.primaryRole ?? null;

    const values = {
      id,
      editionId,
      fullName: clampString(raw.full_name, 160, 'خادم'),
      serviceId: clampString(raw.service_id, 128),
      phone,
      phoneHash,
      whatsapp,
      email,
      emailHash,
      nationalIdHash: clampString(raw.national_id_hash, 128),
      nationalIdLast4: clampString(raw.national_id_last4, 16),
      nationalIdDisplay: raw.national_id_display
        ? clampString(raw.national_id_display, 64)
        : existing?.nationalIdDisplay ?? null,
      gender: raw.gender === 'أنثى' ? 'أنثى' : raw.gender === 'ذكر' ? 'ذكر' : null,
      birthDate: raw.birth_date
        ? clampString(raw.birth_date, 64)
        : existing?.birthDate ?? null,
      governorate: raw.governorate ? clampString(raw.governorate, 120) : null,
      avatarUrl: clampNullableUrl(raw.avatar_url),
      skills,
      healthNotes: clampString(
        rawHealth?.health_notes,
        500,
        existing?.healthNotes || 'لا توجد ملاحظات صحية'
      ),
      status: options.isAdmin ? status : 'approved',
      qrToken: clampString(raw.qr_token, 128),
      pinCode: raw.pin_code ? clampString(raw.pin_code, 32) : null,
      pinCodeHash: raw.pin_code_hash ? clampString(raw.pin_code_hash, 128) : null,
      username: raw.username ? clampString(raw.username, 120) : null,
      canViewKidsCodes: options.isAdmin ? Boolean(raw.can_view_kids_codes) : false,
      canManageCoding: options.isAdmin ? Boolean(raw.can_manage_coding) : false,
      adminUsername:
        options.isAdmin && raw.admin_username
          ? clampString(raw.admin_username, 120)
          : existing?.adminUsername ?? null,
      adminPasswordHash:
        options.isAdmin && raw.admin_password_hash
          ? clampString(raw.admin_password_hash, 128)
          : existing?.adminPasswordHash ?? null,
      customPasswordHash: raw.custom_password_hash
        ? clampString(raw.custom_password_hash, 128)
        : existing?.customPasswordHash ?? null,
      primaryRole,
      createdAt: clampString(raw.created_at, 64, new Date().toISOString()),
    };

    await db
      .insert(servants)
      .values(values)
      .onConflictDoUpdate({
        target: servants.id,
        set: values,
      });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Only administrators')) {
      throw error;
    }
    if (error instanceof Error && error.message.startsWith('Cannot modify')) {
      throw error;
    }
    console.error('Database query failed in upsertServant:', error);
    throw new Error('Failed to save servant record.', { cause: error });
  }
}

export async function patchServantSafeFields(
  servantId: string,
  patch: {
    custom_password_hash?: string;
    username?: string;
    avatar_url?: string | null;
  }
): Promise<void> {
  const cleanId = clampString(servantId, 128);
  if (!cleanId) throw new Error('Invalid servant identifier.');

  const updateData: Partial<typeof servants.$inferInsert> = {};
  if (typeof patch.custom_password_hash === 'string' && patch.custom_password_hash.trim()) {
    updateData.customPasswordHash = clampString(patch.custom_password_hash, 128);
  }
  if (typeof patch.username === 'string' && patch.username.trim()) {
    updateData.username = clampString(patch.username, 120);
  }
  if (patch.avatar_url !== undefined) {
    updateData.avatarUrl = clampNullableUrl(patch.avatar_url);
  }

  if (Object.keys(updateData).length === 0) return;

  try {
    await db.update(servants).set(updateData).where(eq(servants.id, cleanId));
  } catch (error) {
    console.error('Database query failed in patchServantSafeFields:', error);
    throw new Error('Failed to update servant profile.', { cause: error });
  }
}

export async function deleteServantById(servantId: string): Promise<void> {
  const cleanId = clampString(servantId, 128);
  if (!cleanId || cleanId === 's-admin-1') {
    throw new Error('Cannot delete primary administrator account.');
  }
  try {
    await db.delete(servants).where(eq(servants.id, cleanId));
  } catch (error) {
    console.error('Database query failed in deleteServantById:', error);
    throw new Error('Failed to delete servant record.', { cause: error });
  }
}

export async function upsertKid(
  raw: Record<string, unknown>,
  options: { isAdmin: boolean }
): Promise<void> {
  const id = clampString(raw.id, 128);
  if (!id) throw new Error('Invalid participant identifier.');
  const editionId = clampString(raw.edition_id, 128, 'ed-carnival-2027');

  try {
    await ensureEditionRow(editionId);

    const existingRows = await db.select().from(kids).where(eq(kids.id, id)).limit(1);
    const existing = existingRows[0];

    const values = {
      id,
      editionId,
      fullName: clampString(raw.full_name, 160, 'مخدوم'),
      serviceId: clampString(raw.service_id, 128),
      gradeLabel: clampString(raw.grade_label, 120),
      parentPhone:
        options.isAdmin || !existing
          ? clampString(raw.parent_phone, 32, existing?.parentPhone || '')
          : existing.parentPhone,
      healthNotes:
        options.isAdmin || !existing
          ? clampString(raw.health_notes, 500, existing?.healthNotes || 'لا توجد')
          : existing.healthNotes,
      teamName: clampString(raw.team_name, 160),
      pinCode: clampString(raw.pin_code, 32, 'K00000'),
      qrToken: clampString(raw.qr_token, 128),
      registeredByName: clampString(raw.registered_by_name, 160),
      source: raw.source === 'excel' ? 'excel' : 'manual',
      createdAt: clampString(raw.created_at, 64, new Date().toISOString().slice(0, 16)),
    };

    await db
      .insert(kids)
      .values(values)
      .onConflictDoUpdate({
        target: kids.id,
        set: values,
      });
  } catch (error) {
    console.error('Database query failed in upsertKid:', error);
    throw new Error('Failed to save participant record.', { cause: error });
  }
}

export async function updateKidTeam(
  kidId: string,
  newTeamName: string,
  updatedByServantId: string
): Promise<void> {
  const cleanId = clampString(kidId, 128);
  if (!cleanId) throw new Error('Invalid participant identifier.');
  try {
    await db
      .update(kids)
      .set({
        teamName: clampString(newTeamName, 160),
        teamUpdatedByServantId: clampString(updatedByServantId, 128),
      })
      .where(eq(kids.id, cleanId));
  } catch (error) {
    console.error('Database query failed in updateKidTeam:', error);
    throw new Error('Failed to update participant team.', { cause: error });
  }
}

export async function deleteKidById(kidId: string): Promise<void> {
  const cleanId = clampString(kidId, 128);
  if (!cleanId) throw new Error('Invalid participant identifier.');
  try {
    await db.delete(kids).where(eq(kids.id, cleanId));
  } catch (error) {
    console.error('Database query failed in deleteKidById:', error);
    throw new Error('Failed to delete participant record.', { cause: error });
  }
}

export async function upsertLoginCode(record: Record<string, unknown>): Promise<void> {
  const id = clampString(record.id, 128);
  if (!id) throw new Error('Invalid login code identifier.');
  const deliveryStatus =
    record.delivery_status === 'failed'
      ? 'failed'
      : record.delivery_status === 'whatsapp_sent'
      ? 'whatsapp_sent'
      : 'sent';

  try {
    const values = {
      id,
      servantId: clampString(record.servant_id, 128),
      codeHash: clampString(record.code_hash, 128),
      deliveryStatus,
      usedAt: record.used_at ? clampString(record.used_at, 64) : null,
      expiresAt: clampString(record.expires_at, 64),
      createdAt: clampString(record.created_at, 64, new Date().toISOString()),
    };

    await db
      .insert(loginCodes)
      .values(values)
      .onConflictDoUpdate({
        target: loginCodes.id,
        set: values,
      });
  } catch (error) {
    console.error('Database query failed in upsertLoginCode:', error);
    throw new Error('Failed to save login code.', { cause: error });
  }
}

export async function markLoginCodeUsed(codeId: string, usedAt: string): Promise<void> {
  const cleanId = clampString(codeId, 128);
  if (!cleanId) return;
  try {
    await db
      .update(loginCodes)
      .set({ usedAt: clampString(usedAt, 64) })
      .where(eq(loginCodes.id, cleanId));
  } catch (error) {
    console.error('Database query failed in markLoginCodeUsed:', error);
    throw new Error('Failed to update login code status.', { cause: error });
  }
}

export async function completeAdminBootstrap(params: {
  editionId: string;
  servantId: string;
  adminEmail: string;
  username: string;
  passwordHash: string;
  isAdminToken: boolean;
  seedAdminServant?: Record<string, unknown>;
}): Promise<void> {
  const editionId = clampString(params.editionId, 128, 'ed-carnival-2027');
  const servantId = clampString(params.servantId, 128, 's-admin-1');
  const cleanUsername = clampString(params.username, 120);
  const cleanPasswordHash = clampString(params.passwordHash, 128);
  const nowIso = new Date().toISOString();
  const rowId = `${editionId}::admin_auth`;

  try {
    await ensureEditionRow(editionId);

    const existingAuth = await db
      .select()
      .from(portalConfigs)
      .where(eq(portalConfigs.id, rowId))
      .limit(1);

    const prevPayload = (existingAuth[0]?.payload || {}) as Record<string, unknown>;
    if (prevPayload.bootstrap_used === true && !params.isAdminToken) {
      throw new Error('Admin account is already activated. Google admin verification is required.');
    }

    await db.transaction(async (tx) => {
      const existingServant = await tx
        .select({ id: servants.id })
        .from(servants)
        .where(eq(servants.id, servantId))
        .limit(1);

      if (!existingServant[0] && params.seedAdminServant) {
        const s = params.seedAdminServant;
        await tx
          .insert(servants)
          .values({
            id: servantId,
            editionId,
            fullName: clampString(s.full_name, 160, 'أدمن الكرنفال'),
            serviceId: clampString(s.service_id, 128, 'srv-general'),
            phone: clampString(s.phone, 32, '01000000000'),
            phoneHash: clampString(s.phone_hash, 128, serverComputeHash('01000000000')),
            whatsapp: clampString(s.whatsapp, 32, '01000000000'),
            email: clampString(params.adminEmail, 160),
            emailHash: serverComputeHash(params.adminEmail.toLowerCase()),
            nationalIdHash: clampString(s.national_id_hash, 128),
            nationalIdLast4: clampString(s.national_id_last4, 16),
            status: 'approved',
            qrToken: clampString(s.qr_token, 128, 'ADMIN-QR-2027'),
            canViewKidsCodes: true,
            canManageCoding: true,
            adminUsername: cleanUsername,
            adminPasswordHash: cleanPasswordHash,
            username: cleanUsername,
            customPasswordHash: cleanPasswordHash,
            createdAt: nowIso,
          })
          .onConflictDoNothing({ target: servants.id });
      } else {
        await tx
          .update(servants)
          .set({
            adminUsername: cleanUsername,
            adminPasswordHash: cleanPasswordHash,
            username: cleanUsername,
            customPasswordHash: cleanPasswordHash,
          })
          .where(eq(servants.id, servantId));
      }

      const nextAuthPayload = {
        id: 'admin_auth',
        edition_id: editionId,
        admin_servant_id: servantId,
        admin_email: clampString(params.adminEmail, 160),
        admin_username: cleanUsername,
        admin_password_hash: cleanPasswordHash,
        bootstrap_code_hash: '',
        bootstrap_used: true,
        updated_at: nowIso,
      };

      await tx
        .insert(portalConfigs)
        .values({
          id: rowId,
          editionId,
          configKey: 'admin_auth',
          payload: nextAuthPayload,
          updatedByServantId: servantId,
          updatedAt: nowIso,
        })
        .onConflictDoUpdate({
          target: portalConfigs.id,
          set: {
            payload: nextAuthPayload,
            updatedByServantId: servantId,
            updatedAt: nowIso,
          },
        });
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Admin account is already')) {
      throw error;
    }
    console.error('Database query failed in completeAdminBootstrap:', error);
    throw new Error('Failed to activate administrator credentials.', { cause: error });
  }
}

export async function seedInitialData(params: {
  edition: Record<string, unknown>;
  adminServant?: Record<string, unknown>;
  adminAuthConfig?: Record<string, unknown>;
}): Promise<void> {
  const editionId = clampString(params.edition?.id, 128, 'ed-carnival-2027');
  try {
    const existingEdition = await db
      .select({ id: editions.id })
      .from(editions)
      .where(eq(editions.id, editionId))
      .limit(1);

    if (!existingEdition[0]) {
      await upsertEdition(params.edition);
    }

    if (params.adminServant && params.adminServant.id === 's-admin-1') {
      const existingAdmin = await db
        .select({ id: servants.id })
        .from(servants)
        .where(eq(servants.id, 's-admin-1'))
        .limit(1);
      if (!existingAdmin[0]) {
        await upsertServant(params.adminServant, { isAdmin: true });
      }
    }

    if (params.adminAuthConfig) {
      const rowId = `${editionId}::admin_auth`;
      const existingAuth = await db
        .select({ id: portalConfigs.id })
        .from(portalConfigs)
        .where(eq(portalConfigs.id, rowId))
        .limit(1);
      if (!existingAuth[0]) {
        await db
          .insert(portalConfigs)
          .values({
            id: rowId,
            editionId,
            configKey: 'admin_auth',
            payload: params.adminAuthConfig,
            updatedAt: new Date().toISOString(),
          })
          .onConflictDoNothing({ target: portalConfigs.id });
      }
    }
  } catch (error) {
    console.error('Database query failed in seedInitialData:', error);
    throw new Error('Failed to seed initial carnival data.', { cause: error });
  }
}

export async function recordGateCheckinWithLedger(
  checkin: Record<string, unknown>,
  ledgerEntries: Record<string, unknown>[]
): Promise<void> {
  const editionId = clampString(checkin.edition_id, 128, 'ed-carnival-2027');
  const checkinId = clampString(checkin.id, 128);
  if (!checkinId) throw new Error('Invalid gate check-in identifier.');

  try {
    await ensureEditionRow(editionId);

    await db.transaction(async (tx) => {
      await tx
        .insert(gateCheckins)
        .values({
          id: checkinId,
          editionId,
          subjectType: checkin.subject_type === 'servant' ? 'servant' : 'kid',
          subjectId: clampString(checkin.subject_id, 128),
          subjectName: clampString(checkin.subject_name, 160, 'مشارك'),
          serviceId: clampString(checkin.service_id, 128, 'srv-general'),
          teamName: checkin.team_name ? clampString(checkin.team_name, 160) : null,
          qrToken: clampString(checkin.qr_token, 128, String(checkin.subject_id || '')),
          pinCode: checkin.pin_code ? clampString(checkin.pin_code, 32) : null,
          checkedInAt: clampString(checkin.checked_in_at, 64, new Date().toISOString()),
          checkedInLocalTime: clampString(checkin.checked_in_local_time, 16),
          isEarlyArrival: Boolean(checkin.is_early_arrival),
          gatePointsAwarded: Math.max(
            0,
            Math.min(500, Number(checkin.gate_points_awarded) || 0)
          ),
          earlyBonusAwarded: Math.max(
            0,
            Math.min(500, Number(checkin.early_bonus_awarded) || 0)
          ),
          recordedByServantId: clampString(checkin.recorded_by_servant_id, 128),
          recordedByName: clampString(checkin.recorded_by_name, 160, 'خادم البوابة'),
        })
        .onConflictDoNothing({ target: gateCheckins.id });

      for (const entry of ledgerEntries) {
        const entryId = clampString(entry.id, 128);
        if (!entryId) continue;
        const rawPoints = Number(entry.points) || 0;
        const clampedPoints = Math.max(-1000, Math.min(1000, rawPoints));
        const source = clampString(entry.source, 32, 'gate');
        await tx
          .insert(pointsLedger)
          .values({
            id: entryId,
            editionId,
            teamId: clampString(entry.team_id, 128, 'tm-unassigned'),
            teamName: clampString(entry.team_name, 160, 'عام'),
            roundId: entry.round_id ? clampString(entry.round_id, 128) : null,
            roundTitle: entry.round_title ? clampString(entry.round_title, 160) : null,
            axisName: entry.axis_name ? clampString(entry.axis_name, 120) : null,
            targetType:
              entry.target_type === 'kid' || entry.target_type === 'servant'
                ? entry.target_type
                : 'team',
            targetId: entry.target_id ? clampString(entry.target_id, 128) : null,
            targetName: entry.target_name ? clampString(entry.target_name, 160) : null,
            source,
            points: source === 'correction' ? clampedPoints : Math.max(0, clampedPoints),
            reason: clampString(entry.reason, 300, 'حضور البوابة'),
            recordedByServantId: clampString(entry.recorded_by_servant_id, 128),
            recordedByName: clampString(entry.recorded_by_name, 160, 'خادم'),
            createdAt: clampString(entry.created_at, 64, new Date().toISOString()),
          })
          .onConflictDoNothing({ target: pointsLedger.id });
      }
    });
  } catch (error) {
    console.error('Database query failed in recordGateCheckinWithLedger:', error);
    throw new Error('Failed to record gate check-in.', { cause: error });
  }
}

export async function insertPointsLedgerEntry(
  entry: Record<string, unknown>,
  options: { isAdmin: boolean }
): Promise<void> {
  const editionId = clampString(entry.edition_id, 128, 'ed-carnival-2027');
  const entryId = clampString(entry.id, 128);
  if (!entryId) throw new Error('Invalid ledger entry identifier.');

  const source = clampString(entry.source, 32, 'round');
  if (source === 'correction' && !options.isAdmin) {
    throw new Error('Only administrators can record correction entries.');
  }

  const rawPoints = Number(entry.points) || 0;
  const clampedPoints = Math.max(-1000, Math.min(1000, rawPoints));

  try {
    await ensureEditionRow(editionId);
    await db
      .insert(pointsLedger)
      .values({
        id: entryId,
        editionId,
        teamId: clampString(entry.team_id, 128, 'tm-unassigned'),
        teamName: clampString(entry.team_name, 160, 'عام'),
        roundId: entry.round_id ? clampString(entry.round_id, 128) : null,
        roundTitle: entry.round_title ? clampString(entry.round_title, 160) : null,
        axisName: entry.axis_name ? clampString(entry.axis_name, 120) : null,
        targetType:
          entry.target_type === 'kid' || entry.target_type === 'servant'
            ? entry.target_type
            : 'team',
        targetId: entry.target_id ? clampString(entry.target_id, 128) : null,
        targetName: entry.target_name ? clampString(entry.target_name, 160) : null,
        source,
        points: source === 'correction' ? clampedPoints : Math.max(0, clampedPoints),
        reason: clampString(entry.reason, 300, 'رصد نقاط'),
        recordedByServantId: clampString(entry.recorded_by_servant_id, 128),
        recordedByName: clampString(entry.recorded_by_name, 160, 'خادم'),
        createdAt: clampString(entry.created_at, 64, new Date().toISOString()),
      })
      .onConflictDoNothing({ target: pointsLedger.id });
  } catch (error) {
    console.error('Database query failed in insertPointsLedgerEntry:', error);
    throw new Error('Failed to record points entry.', { cause: error });
  }
}

export async function insertEmergencyAlert(alert: Record<string, unknown>): Promise<void> {
  const editionId = clampString(alert.edition_id, 128, 'ed-carnival-2027');
  const alertId = clampString(alert.id, 128);
  if (!alertId) throw new Error('Invalid alert identifier.');

  const cat = clampString(alert.category, 32, 'logistics');
  const sev = clampString(alert.severity, 32, 'normal');
  const st = clampString(alert.status, 32, 'open');

  try {
    await ensureEditionRow(editionId);
    await db
      .insert(emergencyAlerts)
      .values({
        id: alertId,
        editionId,
        category:
          cat === 'medical' ||
          cat === 'lost_child' ||
          cat === 'lost_item' ||
          cat === 'schedule_change'
            ? cat
            : 'logistics',
        severity: sev === 'urgent' || sev === 'critical' ? sev : 'normal',
        title: clampString(alert.title, 180, 'بلاغ ميداني'),
        description: clampString(alert.description, 600, '-'),
        location: clampString(alert.location, 160, 'الساحة الرئيسية'),
        relatedPersonId: alert.related_person_id
          ? clampString(alert.related_person_id, 128)
          : null,
        relatedPersonName: alert.related_person_name
          ? clampString(alert.related_person_name, 160)
          : null,
        relatedTeamName: alert.related_team_name
          ? clampString(alert.related_team_name, 160)
          : null,
        status: st === 'in_progress' || st === 'resolved' ? st : 'open',
        reportedByServantId: clampString(alert.reported_by_servant_id, 128),
        reportedByName: clampString(alert.reported_by_name, 160, 'مستخدم'),
        updatedByServantId: alert.updated_by_servant_id
          ? clampString(alert.updated_by_servant_id, 128)
          : null,
        resolvedByName: alert.resolved_by_name
          ? clampString(alert.resolved_by_name, 160)
          : null,
        resolutionNote: alert.resolution_note
          ? clampString(alert.resolution_note, 400)
          : null,
        createdAt: clampString(alert.created_at, 64, new Date().toISOString()),
        updatedAt: clampString(alert.updated_at, 64, new Date().toISOString()),
      })
      .onConflictDoNothing({ target: emergencyAlerts.id });
  } catch (error) {
    console.error('Database query failed in insertEmergencyAlert:', error);
    throw new Error('Failed to create emergency alert.', { cause: error });
  }
}

export async function updateEmergencyAlertRecord(
  alertId: string,
  patch: {
    status: string;
    updated_by_servant_id: string;
    resolved_by_name?: string;
    resolution_note?: string;
    updated_at: string;
  }
): Promise<void> {
  const cleanId = clampString(alertId, 128);
  if (!cleanId) throw new Error('Invalid alert identifier.');
  const validStatus =
    patch.status === 'in_progress' || patch.status === 'resolved'
      ? patch.status
      : 'open';

  try {
    await db
      .update(emergencyAlerts)
      .set({
        status: validStatus,
        updatedByServantId: clampString(patch.updated_by_servant_id, 128),
        resolvedByName: patch.resolved_by_name
          ? clampString(patch.resolved_by_name, 160)
          : undefined,
        resolutionNote: patch.resolution_note
          ? clampString(patch.resolution_note, 400)
          : undefined,
        updatedAt: clampString(patch.updated_at, 64, new Date().toISOString()),
      })
      .where(eq(emergencyAlerts.id, cleanId));
  } catch (error) {
    console.error('Database query failed in updateEmergencyAlertRecord:', error);
    throw new Error('Failed to update emergency alert.', { cause: error });
  }
}

export async function insertAuditLogRecord(record: Record<string, unknown>): Promise<void> {
  const editionId = clampString(record.edition_id, 128, 'ed-carnival-2027');
  const logId = clampString(record.id, 128);
  if (!logId) return;

  const sanitizedDetails: Record<string, string | number | boolean> = {};
  if (record.details && typeof record.details === 'object') {
    for (const [key, val] of Object.entries(record.details as Record<string, unknown>).slice(
      0,
      15
    )) {
      const cleanKey = clampString(key, 60);
      if (!cleanKey) continue;
      if (typeof val === 'boolean' || typeof val === 'number') {
        sanitizedDetails[cleanKey] = val;
      } else if (val !== undefined && val !== null) {
        sanitizedDetails[cleanKey] = clampString(String(val), 180);
      }
    }
  }

  try {
    await ensureEditionRow(editionId);
    await db
      .insert(auditLogs)
      .values({
        id: logId,
        editionId,
        actorId: record.actor_id ? clampString(record.actor_id, 128) : null,
        actorName: clampString(record.actor_name, 160, 'نظام البوابة'),
        action: clampString(record.action, 120, 'SYSTEM_EVENT'),
        target: clampString(record.target, 200, 'system'),
        details: sanitizedDetails,
        createdAt: clampString(record.created_at, 64, new Date().toISOString()),
      })
      .onConflictDoNothing({ target: auditLogs.id });
  } catch (error) {
    console.error('Database query failed in insertAuditLogRecord:', error);
    throw new Error('Failed to record audit log.', { cause: error });
  }
}

export async function cleanupDemoDataAdmin(options: {
  editionId: string;
  servantIdsToDelete: string[];
  kidIdsToDelete: string[];
  loginCodeIdsToDelete: string[];
  auditLogIdsToDelete: string[];
  gateCheckinIdsToDelete?: string[];
  alertIdsToDelete?: string[];
  zeroOutLedgerEntries?: Record<string, unknown>[];
  remainingRoles?: unknown[];
}): Promise<{ deletedCount: number; zeroedTeamsCount: number }> {
  const editionId = clampString(options.editionId, 128, 'ed-carnival-2027');
  const nowIso = new Date().toISOString();

  const safeServantIds = (options.servantIdsToDelete || []).filter(
    (id) => id && id !== 's-admin-1'
  );
  const safeKidIds = (options.kidIdsToDelete || []).filter(Boolean);
  const safeLoginCodeIds = (options.loginCodeIdsToDelete || []).filter(Boolean);
  const safeAuditIds = (options.auditLogIdsToDelete || []).filter(Boolean);
  const safeCheckinIds = (options.gateCheckinIdsToDelete || []).filter(Boolean);
  const safeAlertIds = (options.alertIdsToDelete || []).filter(Boolean);

  try {
    await upsertPortalConfig(editionId, 'portal', {
      demo_data_cleared: true,
      demo_cleaned_at: nowIso,
      ...(Array.isArray(options.remainingRoles)
        ? { servant_roles: options.remainingRoles.slice(0, 500) }
        : {}),
    });

    let deletedCount = 0;
    let zeroedTeamsCount = 0;

    await db.transaction(async (tx) => {
      if (safeServantIds.length > 0) {
        await tx.delete(servants).where(inArray(servants.id, safeServantIds));
        deletedCount += safeServantIds.length;
      }
      if (safeKidIds.length > 0) {
        await tx.delete(kids).where(inArray(kids.id, safeKidIds));
        deletedCount += safeKidIds.length;
      }
      if (safeLoginCodeIds.length > 0) {
        await tx.delete(loginCodes).where(inArray(loginCodes.id, safeLoginCodeIds));
        deletedCount += safeLoginCodeIds.length;
      }
      if (safeAuditIds.length > 0) {
        await tx.delete(auditLogs).where(inArray(auditLogs.id, safeAuditIds));
        deletedCount += safeAuditIds.length;
      }
      if (safeCheckinIds.length > 0) {
        await tx.delete(gateCheckins).where(inArray(gateCheckins.id, safeCheckinIds));
        deletedCount += safeCheckinIds.length;
      }
      if (safeAlertIds.length > 0) {
        await tx.delete(emergencyAlerts).where(inArray(emergencyAlerts.id, safeAlertIds));
        deletedCount += safeAlertIds.length;
      }

      for (const entry of options.zeroOutLedgerEntries || []) {
        const entryId = clampString(entry.id, 128);
        if (!entryId) continue;
        const rawPoints = Number(entry.points) || 0;
        const clampedPoints = Math.max(-1000, Math.min(1000, rawPoints));
        await tx
          .insert(pointsLedger)
          .values({
            id: entryId,
            editionId,
            teamId: clampString(entry.team_id, 128, 'tm-unassigned'),
            teamName: clampString(entry.team_name, 160, 'عام'),
            targetType: 'team',
            source: 'correction',
            points: clampedPoints,
            reason: clampString(entry.reason, 300, 'تصفير نقاط تجريبية قبل الإطلاق'),
            recordedByServantId: clampString(entry.recorded_by_servant_id, 128, 's-admin-1'),
            recordedByName: clampString(entry.recorded_by_name, 160, 'أدمن الكرنفال'),
            createdAt: clampString(entry.created_at, 64, nowIso),
          })
          .onConflictDoNothing({ target: pointsLedger.id });
        zeroedTeamsCount += 1;
      }
    });

    return { deletedCount, zeroedTeamsCount };
  } catch (error) {
    console.error('Database query failed in cleanupDemoDataAdmin:', error);
    throw new Error('Failed to clean up demo records.', { cause: error });
  }
}
