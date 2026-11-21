'use client';

import * as XLSX from 'xlsx';
import {
  computeTeamScoreboard,
  ROLE_METADATA,
  type AuditLogRecord,
  type CodedTeamItem,
  type Edition,
  type EmergencyAlertRecord,
  type GateCheckinRecord,
  type KidParticipant,
  type PointsLedgerEntry,
  type Servant,
  type ServantRoleRecord,
  type ServiceItem,
} from './carnival-store';

function appendRtlSheet(
  wb: XLSX.WorkBook,
  sheetName: string,
  rows: Array<Record<string, string | number>>,
  emptyFallbackRow: Record<string, string | number>
) {
  const safeRows = rows.length > 0 ? rows : [emptyFallbackRow];
  const ws = XLSX.utils.json_to_sheet(safeRows);

  const keys = Object.keys(safeRows[0] || {});
  ws['!cols'] = keys.map((k) => {
    let maxLen = k.length + 4;
    for (const row of safeRows.slice(0, 200)) {
      const val = row[k] == null ? '' : String(row[k]);
      if (val.length + 3 > maxLen) maxLen = val.length + 3;
    }
    return { wch: Math.min(46, Math.max(14, maxLen)) };
  });

  ws['!views'] = [{ rightToLeft: true }];

  const safeSheetTitle = sheetName.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'تقرير';
  XLSX.utils.book_append_sheet(wb, ws, safeSheetTitle);
}

function getDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

const SOURCE_LABELS: Record<PointsLedgerEntry['source'], string> = {
  gate: 'حضور البوابة',
  early_bonus: 'بونص الحضور المبكر',
  round: 'نقاط جولة / محطة',
  team_spirit: 'روح الفريق',
  correction: 'قيد تصحيحي (إدارة)',
};

const CATEGORY_LABELS: Record<EmergencyAlertRecord['category'], string> = {
  medical: 'بلاغ طبي / إسعاف',
  lost_child: 'طفل تائه',
  lost_item: 'مفقودات',
  logistics: 'دعم لوجستي',
  schedule_change: 'تغيير بالجدول الزمني',
};

const SEVERITY_LABELS: Record<EmergencyAlertRecord['severity'], string> = {
  normal: 'عادي',
  urgent: 'عاجل',
  critical: 'طارئ جداً',
};

const ALERT_STATUS_LABELS: Record<EmergencyAlertRecord['status'], string> = {
  open: 'مفتوح',
  in_progress: 'قيد المتابعة',
  resolved: 'تم الحل',
};

function buildScoreboardRows(
  codedTeams: CodedTeamItem[],
  pointsLedger: PointsLedgerEntry[],
  kids: KidParticipant[],
  gateCheckins: GateCheckinRecord[]
) {
  const scoreboard = computeTeamScoreboard(codedTeams, pointsLedger, kids, gateCheckins);
  return scoreboard.map((team) => ({
    المركز: team.rank,
    'كود الفريق': team.team_code,
    'اسم الفريق': team.team_name,
    اللون: team.color_label,
    'نقاط البوابة': team.gate_points,
    'بونص المبكر': team.early_bonus_points,
    'نقاط المحطات والجولات': team.round_points,
    'نقاط روح الفريق': team.spirit_points,
    'القيود التصحيحية': team.correction_points,
    'إجمالي النقاط': team.total_points,
    'عدد المخدومين': team.kids_count,
    'الحضور بالبوابة': team.checked_in_kids_count,
    'نسبة الحضور %':
      team.kids_count > 0 ? Math.round((team.checked_in_kids_count / team.kids_count) * 100) : 0,
    'آخر حركة': team.last_activity_label,
  }));
}

function buildGateRows(gateCheckins: GateCheckinRecord[], services: ServiceItem[]) {
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  return gateCheckins.map((g, idx) => ({
    '#': idx + 1,
    النوع: g.subject_type === 'kid' ? 'مخدوم' : 'خادم',
    الاسم: g.subject_name,
    الخدمة: serviceMap.get(g.service_id) || g.service_id || '-',
    الفريق: g.team_name || '-',
    'الكود الشخصي': g.pin_code || '-',
    'رمز QR': g.qr_token,
    'وقت الدخول': g.checked_in_local_time,
    'حضور مبكر': g.is_early_arrival ? 'نعم (مبكر)' : 'لا',
    'نقاط البوابة': g.gate_points_awarded,
    'بونص المبكر': g.early_bonus_awarded,
    'إجمالي النقاط': g.gate_points_awarded + g.early_bonus_awarded,
    'مسجَّل بواسطة': g.recorded_by_name,
    'التوقيت الكامل': g.checked_in_at,
  }));
}

function buildKidsRows(
  kids: KidParticipant[],
  services: ServiceItem[],
  gateCheckins: GateCheckinRecord[],
  includeSensitivePii: boolean
) {
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  const gateMap = new Map(
    gateCheckins.filter((g) => g.subject_type === 'kid').map((g) => [g.subject_id, g])
  );
  return kids.map((k, idx) => {
    const gate = gateMap.get(k.id);
    const base: Record<string, string | number> = {
      '#': idx + 1,
      'اسم المخدوم': k.full_name,
      الخدمة: serviceMap.get(k.service_id) || k.service_id,
      'السنة الدراسية': k.grade_label,
      الفريق: k.team_name || 'غير مسكن',
      'حضور البوابة': gate ? `حضر (${gate.checked_in_local_time})` : 'لم يحضر بعد',
      'كود الدخول': k.pin_code,
      'رمز QR': k.qr_token,
      'طريقة الإدخال': k.source === 'excel' ? 'شيت إكسيل' : 'يدوي',
      'مسجَّل بواسطة': k.registered_by_name,
      'تاريخ التسجيل': k.created_at,
    };
    if (includeSensitivePii) {
      base['هاتف ولي الأمر'] = k.parent_phone || '-';
      base['ملاحظات صحية'] = k.health_notes || 'لا توجد';
    }
    return base;
  });
}

function buildLedgerRows(pointsLedger: PointsLedgerEntry[]) {
  return pointsLedger.map((e, idx) => ({
    '#': idx + 1,
    التاريخ: e.created_at,
    الفريق: e.team_name,
    المصدر: SOURCE_LABELS[e.source] || e.source,
    'الجولة / الفعالية': e.round_title || '-',
    المحور: e.axis_name || '-',
    النقاط: e.points,
    السبب: e.reason,
    المسجِّل: e.recorded_by_name,
  }));
}

function buildServantsRows(
  servants: Servant[],
  services: ServiceItem[],
  servantRoles: ServantRoleRecord[],
  includeSensitivePii: boolean
) {
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));
  return servants.map((s, idx) => {
    const rolesText = servantRoles
      .filter((r) => r.servant_id === s.id)
      .map((r) => ROLE_METADATA[r.role]?.label || r.role)
      .join('، ');
    const base: Record<string, string | number> = {
      '#': idx + 1,
      'الاسم الكامل': s.full_name,
      الخدمة: serviceMap.get(s.service_id) || s.service_id,
      النوع: s.gender || '-',
      المحافظة: s.governorate || '-',
      'الصلاحية الأساسية':
        s.primary_role === 'staff'
          ? 'فريق عمل'
          : s.primary_role === 'team_lead'
          ? 'مشارك (مسؤول فريق)'
          : 'محددة بالأدوار',
      الأدوار: rolesText || '-',
      الحالة: s.status === 'approved' ? 'معتمد' : s.status === 'pending' ? 'قيد المراجعة' : 'معطّل',
      'اسم المستخدم': s.username || s.admin_username || '-',
      'الكود الشخصي': s.pin_code || '-',
      'رمز QR': s.qr_token,
      'تاريخ التسجيل': s.created_at,
    };
    if (includeSensitivePii) {
      base['رقم الموبايل'] = s.phone || '-';
      base['البريد الإلكتروني'] = s.email || '-';
      base['آخر ٤ أرقام قومي'] = s.national_id_last4 || '-';
    }
    return base;
  });
}

function buildAlertRows(alerts: EmergencyAlertRecord[]) {
  return alerts.map((a, idx) => ({
    '#': idx + 1,
    التصنيف: CATEGORY_LABELS[a.category] || a.category,
    الأهمية: SEVERITY_LABELS[a.severity] || a.severity,
    العنوان: a.title,
    الوصف: a.description,
    الموقع: a.location,
    'المعني بالبلاغ': a.related_person_name || '-',
    الفريق: a.related_team_name || '-',
    الحالة: ALERT_STATUS_LABELS[a.status] || a.status,
    المبلِّغ: a.reported_by_name,
    'تم الحل بواسطة': a.resolved_by_name || '-',
    'ملاحظة الإغلاق': a.resolution_note || '-',
    'توقيت الإنشاء': a.created_at,
    'آخر تحديث': a.updated_at,
  }));
}

function buildAuditRows(auditLogs: AuditLogRecord[]) {
  return auditLogs.map((log, idx) => ({
    '#': idx + 1,
    التوقيت: log.created_at,
    المنفِّذ: log.actor_name,
    'معرف المنفِّذ': log.actor_id || '-',
    الإجراء: log.action,
    الهدف: log.target,
    التفاصيل: JSON.stringify(log.details || {}),
  }));
}

export function exportCarnivalMasterWorkbook(params: {
  edition: Edition;
  services: ServiceItem[];
  servants: Servant[];
  servantRoles: ServantRoleRecord[];
  kids: KidParticipant[];
  codedTeams: CodedTeamItem[];
  gateCheckins: GateCheckinRecord[];
  pointsLedger: PointsLedgerEntry[];
  emergencyAlerts: EmergencyAlertRecord[];
  auditLogs: AuditLogRecord[];
  includeSensitivePii: boolean;
}) {
  const wb = XLSX.utils.book_new();

  appendRtlSheet(
    wb,
    'الترتيب النهائي للفرق',
    buildScoreboardRows(params.codedTeams, params.pointsLedger, params.kids, params.gateCheckins),
    { ملاحظة: 'لا توجد فرق مسجلة حالياً' }
  );

  appendRtlSheet(
    wb,
    'حضور البوابة',
    buildGateRows(params.gateCheckins, params.services),
    { ملاحظة: 'لم يتم تسجيل حضور بوابة حتى الآن' }
  );

  appendRtlSheet(
    wb,
    'الفرق والمخدومين',
    buildKidsRows(params.kids, params.services, params.gateCheckins, params.includeSensitivePii),
    { ملاحظة: 'لا يوجد مخدومون مسجلون حالياً' }
  );

  appendRtlSheet(
    wb,
    'سجل النقاط التفصيلي',
    buildLedgerRows(params.pointsLedger),
    { ملاحظة: 'لا توجد قيود نقاط مسجلة حالياً' }
  );

  appendRtlSheet(
    wb,
    'سجل الخدام والأدوار',
    buildServantsRows(
      params.servants,
      params.services,
      params.servantRoles,
      params.includeSensitivePii
    ),
    { ملاحظة: 'لا يوجد خدام مسجلون حالياً' }
  );

  appendRtlSheet(
    wb,
    'الطوارئ والمفقودات',
    buildAlertRows(params.emergencyAlerts),
    { ملاحظة: 'لا توجد بلاغات مسجلة' }
  );

  appendRtlSheet(
    wb,
    'سجل المراقبة Audit',
    buildAuditRows(params.auditLogs),
    { ملاحظة: 'لا توجد أحداث مسجلة في سجل المراقبة' }
  );

  const safeName = params.edition.name.replace(/[^\u0600-\u06FFa-zA-Z0-9_-]+/g, '_');
  XLSX.writeFile(wb, `تقرير_${safeName}_الشامل_${getDateStamp()}.xlsx`);
}

export function exportGateAttendanceWorkbook(params: {
  gateCheckins: GateCheckinRecord[];
  services: ServiceItem[];
}) {
  const wb = XLSX.utils.book_new();
  appendRtlSheet(
    wb,
    'حضور البوابة',
    buildGateRows(params.gateCheckins, params.services),
    { ملاحظة: 'لم يتم تسجيل حضور بوابة حتى الآن' }
  );
  XLSX.writeFile(wb, `كشف_حضور_البوابة_${getDateStamp()}.xlsx`);
}

export function exportTeamsAndKidsWorkbook(params: {
  kids: KidParticipant[];
  services: ServiceItem[];
  gateCheckins: GateCheckinRecord[];
  includeSensitivePii: boolean;
}) {
  const wb = XLSX.utils.book_new();
  appendRtlSheet(
    wb,
    'الفرق والمخدومين',
    buildKidsRows(params.kids, params.services, params.gateCheckins, params.includeSensitivePii),
    { ملاحظة: 'لا يوجد مخدومون مسجلون حالياً' }
  );
  XLSX.writeFile(wb, `كشف_الفرق_والمخدومين_${getDateStamp()}.xlsx`);
}

export function exportScoreboardWorkbook(params: {
  codedTeams: CodedTeamItem[];
  pointsLedger: PointsLedgerEntry[];
  kids: KidParticipant[];
  gateCheckins: GateCheckinRecord[];
}) {
  const wb = XLSX.utils.book_new();
  appendRtlSheet(
    wb,
    'الترتيب النهائي للفرق',
    buildScoreboardRows(params.codedTeams, params.pointsLedger, params.kids, params.gateCheckins),
    { ملاحظة: 'لا توجد فرق مسجلة حالياً' }
  );
  appendRtlSheet(
    wb,
    'سجل النقاط التفصيلي',
    buildLedgerRows(params.pointsLedger),
    { ملاحظة: 'لا توجد قيود نقاط مسجلة حالياً' }
  );
  XLSX.writeFile(wb, `تقرير_الترتيب_والنقاط_${getDateStamp()}.xlsx`);
}

export function exportAuditLogsWorkbook(params: { auditLogs: AuditLogRecord[] }) {
  const wb = XLSX.utils.book_new();
  appendRtlSheet(
    wb,
    'سجل المراقبة',
    buildAuditRows(params.auditLogs),
    { ملاحظة: 'لا توجد أحداث مسجلة' }
  );
  XLSX.writeFile(wb, `سجل_المراقبة_والتدقيق_${getDateStamp()}.xlsx`);
}

export function exportAttendanceAnalyticsWorkbook(params: {
  edition: Edition;
  services: ServiceItem[];
  servants: Servant[];
  kids: KidParticipant[];
  codedGrades: { id: string; name: string }[];
  codedTeams: CodedTeamItem[];
  gateCheckins: GateCheckinRecord[];
  pointsLedger: PointsLedgerEntry[];
}) {
  const wb = XLSX.utils.book_new();
  const kidCheckins = new Map(
    params.gateCheckins
      .filter((g) => g.subject_type === 'kid')
      .map((g) => [g.subject_id, g])
  );
  const servantCheckins = new Map(
    params.gateCheckins
      .filter((g) => g.subject_type === 'servant')
      .map((g) => [g.subject_id, g])
  );

  const pct = (part: number, total: number) =>
    total > 0 ? Math.round((part / total) * 100) : 0;

  const byServiceRows = params.services.map((svc) => {
    const svcKids = params.kids.filter((k) => k.service_id === svc.id);
    const presentKids = svcKids.filter((k) => kidCheckins.has(k.id)).length;
    const earlyKids = svcKids.filter((k) => kidCheckins.get(k.id)?.is_early_arrival).length;
    const svcServants = params.servants.filter((s) => s.service_id === svc.id);
    const presentServants = svcServants.filter((s) => servantCheckins.has(s.id)).length;
    return {
      الخدمة: svc.name,
      المرحلة: svc.stage_group,
      'إجمالي المخدومين': svcKids.length,
      'المخدومون الحاضرون': presentKids,
      'المخدومون المتغيبون': Math.max(0, svcKids.length - presentKids),
      'حضور مبكر (مخدومين)': earlyKids,
      'نسبة حضور المخدومين %': pct(presentKids, svcKids.length),
      'إجمالي الخدام': svcServants.length,
      'الخدام الحاضرون': presentServants,
      'نسبة حضور الخدام %': pct(presentServants, svcServants.length),
    };
  });

  const gradeLabels = Array.from(
    new Set([
      ...params.codedGrades.map((g) => g.name),
      ...params.kids.map((k) => k.grade_label || 'غير محدد'),
    ])
  );
  const byGradeRows = gradeLabels.map((label) => {
    const gradeKids = params.kids.filter((k) => (k.grade_label || 'غير محدد') === label);
    const present = gradeKids.filter((k) => kidCheckins.has(k.id)).length;
    const early = gradeKids.filter((k) => kidCheckins.get(k.id)?.is_early_arrival).length;
    return {
      'السنة الدراسية': label,
      'إجمالي المسجلين': gradeKids.length,
      'الحضور الفعلي': present,
      المتغيبون: Math.max(0, gradeKids.length - present),
      'الحضور المبكر': early,
      'نسبة الحضور %': pct(present, gradeKids.length),
    };
  });

  const scoreboard = computeTeamScoreboard(
    params.codedTeams,
    params.pointsLedger,
    params.kids,
    params.gateCheckins
  );
  const byTeamRows = scoreboard.map((t) => ({
    المركز: t.rank,
    الفريق: t.team_name,
    'إجمالي المخدومين': t.kids_count,
    'الحضور بالبوابة': t.checked_in_kids_count,
    المتغيبون: Math.max(0, t.kids_count - t.checked_in_kids_count),
    'نسبة الحضور %': pct(t.checked_in_kids_count, t.kids_count),
    'إجمالي النقاط': t.total_points,
  }));

  appendRtlSheet(wb, 'الحضور حسب الخدمة', byServiceRows, {
    ملاحظة: 'لا توجد خدمات مسجلة',
  });
  appendRtlSheet(wb, 'الحضور حسب السنة', byGradeRows, {
    ملاحظة: 'لا توجد سنوات دراسية مسجلة',
  });
  appendRtlSheet(wb, 'الحضور حسب الفريق', byTeamRows, {
    ملاحظة: 'لا توجد فرق مسجلة',
  });

  const safeName = (params.edition.name || 'الكرنفال').replace(/[^\u0600-\u06FF\w-]+/g, '_');
  XLSX.writeFile(wb, `تقرير_الحضور_المفصل_${safeName}_${getDateStamp()}.xlsx`);
}
