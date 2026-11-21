import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

// Authenticated Firebase users synchronized to PostgreSQL
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  role: text('role').notNull().default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Carnival editions (branding, dates, current stage)
export const editions = pgTable('editions', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  codeLabel: text('code_label').notNull().default(''),
  churchName: text('church_name').notNull(),
  serviceTitle: text('service_title').notNull().default(''),
  motto: text('motto').notNull().default(''),
  churchLogoUrl: text('church_logo_url'),
  serviceLogoUrl: text('service_logo_url'),
  carnivalLogoUrl: text('carnival_logo_url'),
  startsOn: text('starts_on').notNull().default(''),
  endsOn: text('ends_on').notNull().default(''),
  footerText: text('footer_text').notNull().default(''),
  currentStage: integer('current_stage').notNull().default(2),
  status: text('status').notNull().default('active'),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// Portal, coding, and admin_auth configuration documents per edition
export const portalConfigs = pgTable('portal_configs', {
  id: text('id').primaryKey(), // e.g. "ed-carnival-2027::portal"
  editionId: text('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  configKey: text('config_key').notNull(), // "portal" | "coding" | "admin_auth"
  payload: jsonb('payload').$type<Record<string, unknown>>().notNull().default({}),
  updatedByServantId: text('updated_by_servant_id'),
  updatedAt: text('updated_at').notNull(),
});

// Servants registry (PII columns are projected strictly on server for verified admin only)
export const servants = pgTable('servants', {
  id: text('id').primaryKey(),
  editionId: text('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  serviceId: text('service_id').notNull(),
  phone: text('phone').notNull().default(''),
  phoneHash: text('phone_hash').notNull().default(''),
  whatsapp: text('whatsapp').notNull().default(''),
  email: text('email').notNull().default(''),
  emailHash: text('email_hash'),
  nationalIdHash: text('national_id_hash').notNull().default(''),
  nationalIdLast4: text('national_id_last4').notNull().default(''),
  nationalIdDisplay: text('national_id_display'),
  gender: text('gender'),
  birthDate: text('birth_date'),
  governorate: text('governorate'),
  avatarUrl: text('avatar_url'),
  skills: jsonb('skills').$type<string[]>().notNull().default([]),
  healthNotes: text('health_notes').notNull().default(''),
  status: text('status').notNull().default('approved'),
  qrToken: text('qr_token').notNull().default(''),
  pinCode: text('pin_code'),
  pinCodeHash: text('pin_code_hash'),
  username: text('username'),
  canViewKidsCodes: boolean('can_view_kids_codes').notNull().default(false),
  canManageCoding: boolean('can_manage_coding').notNull().default(false),
  adminUsername: text('admin_username'),
  adminPasswordHash: text('admin_password_hash'),
  customPasswordHash: text('custom_password_hash'),
  primaryRole: text('primary_role'),
  createdAt: text('created_at').notNull(),
});

// Kids participants registry (PII columns projected strictly on server for verified admin only)
export const kids = pgTable('kids', {
  id: text('id').primaryKey(),
  editionId: text('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  serviceId: text('service_id').notNull(),
  gradeLabel: text('grade_label').notNull().default(''),
  parentPhone: text('parent_phone').notNull().default(''),
  healthNotes: text('health_notes').notNull().default('لا توجد'),
  teamName: text('team_name').notNull().default(''),
  pinCode: text('pin_code').notNull().default(''),
  qrToken: text('qr_token').notNull().default(''),
  registeredByName: text('registered_by_name').notNull().default(''),
  teamUpdatedByServantId: text('team_updated_by_servant_id'),
  source: text('source').notNull().default('manual'),
  createdAt: text('created_at').notNull(),
});

// Servant login codes
export const loginCodes = pgTable('login_codes', {
  id: text('id').primaryKey(),
  servantId: text('servant_id').notNull(),
  codeHash: text('code_hash').notNull(),
  deliveryStatus: text('delivery_status').notNull().default('sent'),
  usedAt: text('used_at'),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});

// Carnival day gate check-ins
export const gateCheckins = pgTable('gate_checkins', {
  id: text('id').primaryKey(),
  editionId: text('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  subjectType: text('subject_type').notNull(), // "kid" | "servant"
  subjectId: text('subject_id').notNull(),
  subjectName: text('subject_name').notNull(),
  serviceId: text('service_id').notNull(),
  teamName: text('team_name'),
  qrToken: text('qr_token').notNull(),
  pinCode: text('pin_code'),
  checkedInAt: text('checked_in_at').notNull(),
  checkedInLocalTime: text('checked_in_local_time').notNull(),
  isEarlyArrival: boolean('is_early_arrival').notNull().default(false),
  gatePointsAwarded: integer('gate_points_awarded').notNull().default(0),
  earlyBonusAwarded: integer('early_bonus_awarded').notNull().default(0),
  recordedByServantId: text('recorded_by_servant_id').notNull(),
  recordedByName: text('recorded_by_name').notNull(),
});

// Append-only points ledger
export const pointsLedger = pgTable('points_ledger', {
  id: text('id').primaryKey(),
  editionId: text('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  teamId: text('team_id').notNull(),
  teamName: text('team_name').notNull(),
  roundId: text('round_id'),
  roundTitle: text('round_title'),
  axisName: text('axis_name'),
  targetType: text('target_type').notNull().default('team'), // "team" | "kid" | "servant"
  targetId: text('target_id'),
  targetName: text('target_name'),
  source: text('source').notNull(), // "gate" | "early_bonus" | "round" | "team_spirit" | "correction"
  points: integer('points').notNull().default(0),
  reason: text('reason').notNull(),
  recordedByServantId: text('recorded_by_servant_id').notNull(),
  recordedByName: text('recorded_by_name').notNull(),
  createdAt: text('created_at').notNull(),
});

// Emergency & field alerts
export const emergencyAlerts = pgTable('emergency_alerts', {
  id: text('id').primaryKey(),
  editionId: text('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  category: text('category').notNull(),
  severity: text('severity').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  location: text('location').notNull(),
  relatedPersonId: text('related_person_id'),
  relatedPersonName: text('related_person_name'),
  relatedTeamName: text('related_team_name'),
  status: text('status').notNull().default('open'),
  reportedByServantId: text('reported_by_servant_id').notNull(),
  reportedByName: text('reported_by_name').notNull(),
  updatedByServantId: text('updated_by_servant_id'),
  resolvedByName: text('resolved_by_name'),
  resolutionNote: text('resolution_note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// Audit logs
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  editionId: text('edition_id')
    .notNull()
    .references(() => editions.id, { onDelete: 'cascade' }),
  actorId: text('actor_id'),
  actorName: text('actor_name').notNull(),
  action: text('action').notNull(),
  target: text('target').notNull(),
  details: jsonb('details')
    .$type<Record<string, string | number | boolean>>()
    .notNull()
    .default({}),
  createdAt: text('created_at').notNull(),
});

// Relational definitions
export const editionsRelations = relations(editions, ({ many }) => ({
  portalConfigs: many(portalConfigs),
  servants: many(servants),
  kids: many(kids),
  gateCheckins: many(gateCheckins),
  pointsLedger: many(pointsLedger),
  emergencyAlerts: many(emergencyAlerts),
  auditLogs: many(auditLogs),
}));

export const portalConfigsRelations = relations(portalConfigs, ({ one }) => ({
  edition: one(editions, {
    fields: [portalConfigs.editionId],
    references: [editions.id],
  }),
}));

export const servantsRelations = relations(servants, ({ one }) => ({
  edition: one(editions, {
    fields: [servants.editionId],
    references: [editions.id],
  }),
}));

export const kidsRelations = relations(kids, ({ one }) => ({
  edition: one(editions, {
    fields: [kids.editionId],
    references: [editions.id],
  }),
}));

export const gateCheckinsRelations = relations(gateCheckins, ({ one }) => ({
  edition: one(editions, {
    fields: [gateCheckins.editionId],
    references: [editions.id],
  }),
}));

export const pointsLedgerRelations = relations(pointsLedger, ({ one }) => ({
  edition: one(editions, {
    fields: [pointsLedger.editionId],
    references: [editions.id],
  }),
}));

export const emergencyAlertsRelations = relations(emergencyAlerts, ({ one }) => ({
  edition: one(editions, {
    fields: [emergencyAlerts.editionId],
    references: [editions.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  edition: one(editions, {
    fields: [auditLogs.editionId],
    references: [editions.id],
  }),
}));
