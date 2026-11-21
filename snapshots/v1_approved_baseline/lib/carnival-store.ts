'use client';

export type ServantRole =
  | 'admin'
  | 'service_lead'
  | 'registrar'
  | 'team_lead'
  | 'staff'
  | 'emergency';

export type ServantStatus = 'pending' | 'approved' | 'disabled';

export type EventStageNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Edition {
  id: string;
  name: string;
  code_label: string;
  church_name: string;
  service_title: string;
  church_logo_url: string | null;
  carnival_logo_url: string;
  starts_on: string;
  ends_on: string;
  current_stage: EventStageNumber;
  status: 'draft' | 'active' | 'archived';
}

export interface ServiceItem {
  id: string;
  edition_id: string;
  name: string;
  stage_group: string;
  sort_order: number;
}

export interface AxisItem {
  id: string;
  edition_id: string;
  name: string;
  color: string;
  text_class: string;
  dot_class: string;
  sort_order: number;
}

export interface HealthAndSkills {
  skills: string[];
  health_notes: string;
}

export interface Servant {
  id: string;
  edition_id: string;
  full_name: string;
  service_id: string;
  phone: string;
  whatsapp: string;
  email: string;
  national_id_hash: string;
  national_id_last4: string;
  health_and_skills: HealthAndSkills;
  status: ServantStatus;
  qr_token: string;
  admin_username?: string;
  admin_password_hash?: string;
  created_at: string;
}

export interface ServantRoleRecord {
  id: string;
  servant_id: string;
  role: ServantRole;
}

export interface LoginCodeRecord {
  id: string;
  servant_id: string;
  code_hash: string;
  delivery_status: 'sent' | 'failed' | 'whatsapp_sent';
  used_at: string | null;
  expires_at: string;
  created_at: string;
}

export interface RecoveryRequestRecord {
  id: string;
  edition_id: string;
  servant_id: string | null;
  servant_name: string;
  national_id_last4: string;
  phone: string;
  email: string;
  channel: 'email' | 'whatsapp_admin';
  status: 'sent_email' | 'pending_whatsapp' | 'resolved' | 'rejected';
  created_at: string;
}

export interface AuditLogRecord {
  id: string;
  edition_id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  target: string;
  details: Record<string, string | number | boolean>;
  created_at: string;
}

export interface SimulatedEmailMessage {
  id: string;
  to_email: string;
  servant_name: string;
  subject: string;
  secret_code_preview: string; // Shown ONLY in the external email outbox simulator, never on the recovery screen
  delivery_status: 'sent' | 'failed';
  sent_at: string;
  purpose: 'registration' | 'recovery' | 'admin_resend';
}

export interface StageDefinition {
  stage: EventStageNumber;
  title: string;
  short_title: string;
  description: string;
  open_actions: string[];
  locked_actions: string[];
}

export const EVENT_STAGES: StageDefinition[] = [
  {
    stage: 1,
    title: '١. الإعداد',
    short_title: 'الإعداد',
    description: 'الأدمن يدخل الخدمات والمحاور والفعاليات والجولات والتوقيتات وسياسة الحضور.',
    open_actions: ['إعداد الأدمن', 'تسجيل الخدام', 'اعتماد الخدام'],
    locked_actions: ['إدخال المخدومين', 'تقسيم الفرق', 'المسح الميداني'],
  },
  {
    stage: 2,
    title: '٢. تسجيل الخدام',
    short_title: 'تسجيل الخدام',
    description: 'كل خادم يسجل بياناته ويصله الكود على إيميله، والحساب في انتظار الاعتماد.',
    open_actions: ['تسجيل الخدام الجدد', 'إرسال الكود للإيميل', 'استرجاع الكود بالرقم القومي'],
    locked_actions: ['إدخال المخدومين', 'تقسيم الفرق', 'المسح الميداني'],
  },
  {
    stage: 3,
    title: '٣. اعتماد الخدام',
    short_title: 'اعتماد الخدام',
    description: 'الأدمن أو مسؤول الخدمة يعتمد بالجملة، ويحدد الأدوار، ويختار الخدام المسجِّلين.',
    open_actions: ['اعتماد الخدام بالجملة', 'تعيين الأدوار المتعددة', 'تسجيل الخدام'],
    locked_actions: ['إدخال المخدومين', 'تقسيم الفرق'],
  },
  {
    stage: 4,
    title: '٤. تسجيل المخدومين',
    short_title: 'تسجيل المخدومين',
    description: 'الخدام المسجِّلون يدخلون بيانات الأطفال لخدمتهم أولاً بأول.',
    open_actions: ['إدخال المخدومين (للخادم المسجِّل)'],
    locked_actions: ['تسجيل خدام جدد', 'تقسيم الفرق'],
  },
  {
    stage: 5,
    title: '٥. قفل التسجيل',
    short_title: 'قفل التسجيل',
    description: 'يُقفل إدخال المخدومين نهائياً، ويُفتح تقسيم الفرق لمسؤولي الخدمات.',
    open_actions: ['بدء تقسيم الفرق'],
    locked_actions: ['إضافة أو حذف مخدومين (إلا بإذن الأدمن وبسبب مسجل)'],
  },
  {
    stage: 6,
    title: '٦. تقسيم الفرق والبطاقات',
    short_title: 'الفرق والـ QR',
    description: 'مسؤول الخدمة يوزع الأطفال على فرق ويختار خادم الفريق وقائدين، وتُطبع كروت الـ QR.',
    open_actions: ['توزيع الفرق', 'توليد وطباعة بطاقات QR (PDF)'],
    locked_actions: ['إدخال مخدومين عادي'],
  },
  {
    stage: 7,
    title: '٧. يوم الكرنفال',
    short_title: 'يوم الكرنفال',
    description: 'حضور البوابة أولاً، ثم المسح عند كل فعالية، والنقاط، والطوارئ، وشاشة العرض.',
    open_actions: ['حضور البوابة', 'مسح الفعاليات أوفلاين/أونلاين', 'النقاط والطوارئ', 'شاشة العرض'],
    locked_actions: ['تعديل بنية الفرق', 'تسجيل المخدومين'],
  },
];

export const ROLE_METADATA: Record<
  ServantRole,
  {
    label: string;
    login_type: string;
    can_do: string[];
    cannot_do: string[];
    badge_color: string;
  }
> = {
  admin: {
    label: 'أدمن الكرنفال',
    login_type: 'كود + كلمة مرور',
    can_do: [
      'ضبط محتوى الكرنفال والتوقيتات وسياسة الحضور',
      'اعتماد الحسابات وقفل التسجيل وإدارة الأدوار',
      'رؤية كل الخدمات وإضافة قيد تصحيحي للنقاط بسبب مسجل',
    ],
    cannot_do: ['تعديل أو حذف سجل النقاط الأصلي (قيد تصحيحي فقط)'],
    badge_color: 'text-amber-400 border-amber-500/30 bg-amber-500/10',
  },
  service_lead: {
    label: 'مسؤول خدمة',
    login_type: 'كود سري',
    can_do: [
      'رؤية خدمته فقط واعتماد خدام خدمته',
      'تقسيم الفرق بعد قفل التسجيل وتوزيع خدام خدمته',
      'استلام تنبيه «فريق بدون خادم»',
    ],
    cannot_do: ['رؤية أو تعديل بيانات الخدمات الأربع الأخرى'],
    badge_color: 'text-purple-400 border-purple-500/30 bg-purple-500/10',
  },
  registrar: {
    label: 'خادم مسجِّل',
    login_type: 'كود سري',
    can_do: ['إدخال بيانات المخدومين لخدمته أثناء فترة التسجيل (المرحلة ٤)'],
    cannot_do: ['إدخال أو تعديل مخدومين بعد قفل التسجيل أو في خدمة أخرى'],
    badge_color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/10',
  },
  team_lead: {
    label: 'مشارك (مسؤول فريق)',
    login_type: 'كود سري (PIN)',
    can_do: [
      'رؤية فريقه ونقاط كل طفل بالتفصيل ومجموع الفريق',
      'كسب نقاط حضور وتفاعل تضاف لفريقه',
      'استعراض المحطات وخريطة المكان',
    ],
    cannot_do: ['رؤية الفرق الأخرى أو تعديل النقاط يدوياً'],
    badge_color: 'text-orange-400 border-orange-500/30 bg-orange-500/10',
  },
  staff: {
    label: 'فريق العمل (محطات وجولات)',
    login_type: 'كود سري',
    can_do: [
      'مسح QR لحضور البوابة والفعاليات (أونلاين وأوفلاين)',
      'منح نقاط لفريق أو فرد وتسجيل نتائج الألعاب',
      'تقييم تفاعل الخادم من ١ إلى ٥ في محطته',
    ],
    cannot_do: ['التصرف في محطات أو جولات غير مربوطة به'],
    badge_color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10',
  },
  emergency: {
    label: 'مسؤول طوارئ / مفقودات',
    login_type: 'كود سري',
    can_do: [
      'استلام بلاغات الطوارئ والطفل التائه والمفقودات وإغلاقها',
      'رؤية رقم ولي الأمر وقت البلاغ فقط مع تسجيل المراجعة',
    ],
    cannot_do: ['تعديل النقاط أو إعدادات الفعاليات'],
    badge_color: 'text-rose-400 border-rose-500/30 bg-rose-500/10',
  },
};

export const AVAILABLE_SKILLS = [
  'إسعافات أولية وطوارئ',
  'تصوير وتوثيق ميديا',
  'تنظيم وحركة حشود',
  'قيادة ألعاب وفقرات',
  'ترانيم وعزف',
  'دعم تقني ومسح QR',
];

/**
 * دالة تجزئة (Hash) قياسية لمحاكاة تخزين الأكواد والرقم القومي بشكل غير نصي صريح
 */
export function computeHash(input: string): string {
  const normalized = input.trim().toUpperCase();
  let h1 = 0xdeadbeef ^ normalized.length;
  let h2 = 0x41c6ce57 ^ normalized.length;
  for (let i = 0, ch; i < normalized.length; i++) {
    ch = normalized.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (
    'sha256_' +
    (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0') +
    normalized.length.toString(16).padStart(4, '0')
  );
}

export function generateRandomCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateQrToken(): string {
  const hex = '0123456789ABCDEF';
  let token = 'SRV-QR-';
  for (let i = 0; i < 10; i++) {
    token += hex.charAt(Math.floor(Math.random() * hex.length));
  }
  return token;
}

let seqCounter = 100;
export function createRecordId(prefix: string): string {
  seqCounter += 1;
  return `${prefix}-${seqCounter}-${ generateRandomCode(4).toLowerCase() }`;
}

export function getIsoNow(): string {
  return new Date().toISOString();
}

export function getReadableNow(length = 19): string {
  return new Date().toISOString().replace('T', ' ').slice(0, length);
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***.com';
  const visible = local.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(3, local.length - 2))}@${domain}`;
}

/**
 * ضغط وتحجيم صورة اللوجو المرفوعة لضمان سرعة الحفظ في الداتابيز والـ LocalStorage بدون تجاوز الحجم
 */
export function compressImageFileToDataUrl(file: File, maxDimension = 512): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة'));
    reader.onload = () => {
      const resultStr = typeof reader.result === 'string' ? reader.result : '';
      if (!resultStr) {
        reject(new Error('ملف الصورة فارغ'));
        return;
      }
      // إذا كان الملف SVG نرجعه كما هو
      if (file.type === 'image/svg+xml') {
        resolve(resultStr);
        return;
      }
      const img = new window.Image();
      img.onerror = () => resolve(resultStr);
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width || 1, img.height || 1));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(resultStr);
          return;
        }
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png', 0.92));
      };
      img.src = resultStr;
    };
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// البيانات الأولية لدورة كرنفال الأطفال 2027 (Seed Data)
// ============================================================================

export const INITIAL_EDITION: Edition = {
  id: 'ed-carnival-2027',
  name: 'كرنفال Reflection 2027',
  code_label: 'REFLECTION · 30 JAN 2027',
  church_name: 'كنيسة السيدة العذراء مريم - بالعصافرة',
  service_title: 'خدمة ابتدائي من حضانة لسادسة بنين وبنات',
  church_logo_url: null,
  carnival_logo_url: '/assets/reflection_carnival_logo.jpg',
  starts_on: '2027-01-30',
  ends_on: '2027-01-30',
  current_stage: 2,
  status: 'active',
};

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'srv-nursery',
    edition_id: 'ed-carnival-2027',
    name: 'خدمة حضانة',
    stage_group: 'حضانة (KG1 - KG2)',
    sort_order: 1,
  },
  {
    id: 'srv-boys-1-3',
    edition_id: 'ed-carnival-2027',
    name: 'ابتدائي بنين (أولى إلى ثالثة)',
    stage_group: 'الصف الأول إلى الثالث الابتدائي - بنين',
    sort_order: 2,
  },
  {
    id: 'srv-girls-1-3',
    edition_id: 'ed-carnival-2027',
    name: 'ابتدائي بنات (أولى إلى ثالثة)',
    stage_group: 'الصف الأول إلى الثالث الابتدائي - بنات',
    sort_order: 3,
  },
  {
    id: 'srv-boys-4-6',
    edition_id: 'ed-carnival-2027',
    name: 'ابتدائي بنين (رابعة إلى سادسة)',
    stage_group: 'الصف الرابع إلى السادس الابتدائي - بنين',
    sort_order: 4,
  },
  {
    id: 'srv-girls-4-6',
    edition_id: 'ed-carnival-2027',
    name: 'ابتدائي بنات (رابعة إلى سادسة)',
    stage_group: 'الصف الرابع إلى السادس الابتدائي - بنات',
    sort_order: 5,
  },
];

export const INITIAL_AXES: AxisItem[] = [
  {
    id: 'axis-spiritual',
    edition_id: 'ed-carnival-2027',
    name: 'روحي',
    color: '#D97706', // أصفر ذهبي دافئ
    text_class: 'text-amber-600',
    dot_class: 'bg-amber-500',
    sort_order: 1,
  },
  {
    id: 'axis-psych',
    edition_id: 'ed-carnival-2027',
    name: 'سلوكي ونفسي',
    color: '#0D9488', // فيروزي / أزرق مخضر
    text_class: 'text-teal-600',
    dot_class: 'bg-teal-500',
    sort_order: 2,
  },
  {
    id: 'axis-creative',
    edition_id: 'ed-carnival-2027',
    name: 'إبداعي',
    color: '#E11D48', // أحمر برتقالي كرنفالي
    text_class: 'text-rose-600',
    dot_class: 'bg-rose-500',
    sort_order: 3,
  },
  {
    id: 'axis-tech',
    edition_id: 'ed-carnival-2027',
    name: 'تكنولوجي',
    color: '#2563EB', // أزرق زاهي
    text_class: 'text-blue-600',
    dot_class: 'bg-blue-600',
    sort_order: 4,
  },
];

// الحسابات التجريبية الجاهزة لاختبار كل دور وكل حالة فوراً
export interface DemoCredentialHint {
  servant_id: string;
  full_name: string;
  role_summary: string;
  service_name: string;
  secret_code: string;
  national_id_plain: string;
  phone: string;
  admin_username?: string;
  admin_password?: string;
  status: ServantStatus;
}

export const DEMO_CREDENTIALS: DemoCredentialHint[] = [
  {
    servant_id: 's-team-1',
    full_name: 'أبانوب ميشيل وديع',
    role_summary: 'مشارك (مسؤول فريق أسود الكرنفال)',
    service_name: 'ابتدائي بنين (رابعة إلى سادسة)',
    secret_code: 'A8K2P9',
    national_id_plain: '29905150101234',
    phone: '01223456789',
    status: 'approved',
  },
  {
    servant_id: 's-staff-1',
    full_name: 'مارينا سمير جرجس',
    role_summary: 'فريق العمل (محطة الألعاب) + خادم مسجِّل',
    service_name: 'ابتدائي بنات (أولى إلى ثالثة)',
    secret_code: 'STF420',
    national_id_plain: '30108200105678',
    phone: '01287654321',
    status: 'approved',
  },
  {
    servant_id: 's-lead-1',
    full_name: 'بيتر نبيل شكري',
    role_summary: 'مسؤول خدمة + مشارك (مسؤول فريق)',
    service_name: 'ابتدائي بنين (أولى إلى ثالثة)',
    secret_code: 'SRV770',
    national_id_plain: '29611020103456',
    phone: '01201122334',
    status: 'approved',
  },
  {
    servant_id: 's-admin-1',
    full_name: 'مايكل يسري مسعد',
    role_summary: 'أدمن الكرنفال العام',
    service_name: 'ابتدائي بنين (رابعة إلى سادسة)',
    secret_code: 'ADM999',
    national_id_plain: '29501010109999',
    phone: '01270009999',
    admin_username: 'michael.admin',
    admin_password: 'Carnival@2027',
    status: 'approved',
  },
  {
    servant_id: 's-pending-1',
    full_name: 'كيرلس هاني فوزي',
    role_summary: 'خادم مسجل حديثاً (في انتظار الاعتماد)',
    service_name: 'خدمة حضانة',
    secret_code: 'PND105',
    national_id_plain: '30304100104455',
    phone: '01211223344',
    status: 'pending',
  },
];

export const INITIAL_SERVANTS: Servant[] = [
  {
    id: 's-team-1',
    edition_id: 'ed-carnival-2027',
    full_name: 'أبانوب ميشيل وديع',
    service_id: 'srv-boys-4-6',
    phone: '01223456789',
    whatsapp: '01223456789',
    email: 'abanoub.michel@gmail.com',
    national_id_hash: computeHash('29905150101234'),
    national_id_last4: '1234',
    health_and_skills: {
      skills: ['قيادة ألعاب وفقرات', 'تنظيم وحركة حشود'],
      health_notes: 'لا توجد ملاحظات صحية',
    },
    status: 'approved',
    qr_token: 'SRV-QR-88F12A90C1',
    created_at: '2026-11-01T10:00:00Z',
  },
  {
    id: 's-staff-1',
    edition_id: 'ed-carnival-2027',
    full_name: 'مارينا سمير جرجس',
    service_id: 'srv-girls-1-3',
    phone: '01287654321',
    whatsapp: '01287654321',
    email: 'marina.samir@gmail.com',
    national_id_hash: computeHash('30108200105678'),
    national_id_last4: '5678',
    health_and_skills: {
      skills: ['دعم تقني ومسح QR', 'تصوير وتوثيق ميديا'],
      health_notes: 'لا توجد',
    },
    status: 'approved',
    qr_token: 'SRV-QR-44B77E19D2',
    created_at: '2026-11-02T12:30:00Z',
  },
  {
    id: 's-lead-1',
    edition_id: 'ed-carnival-2027',
    full_name: 'بيتر نبيل شكري',
    service_id: 'srv-boys-1-3',
    phone: '01201122334',
    whatsapp: '01201122334',
    email: 'peter.nabil@yahoo.com',
    national_id_hash: computeHash('29611020103456'),
    national_id_last4: '3456',
    health_and_skills: {
      skills: ['تنظيم وحركة حشود', 'إسعافات أولية وطوارئ'],
      health_notes: 'لا توجد',
    },
    status: 'approved',
    qr_token: 'SRV-QR-19C65D00A7',
    created_at: '2026-11-02T15:00:00Z',
  },
  {
    id: 's-admin-1',
    edition_id: 'ed-carnival-2027',
    full_name: 'مايكل يسري مسعد',
    service_id: 'srv-boys-4-6',
    phone: '01270009999',
    whatsapp: '01270009999',
    email: 'michael.y.mosaad@gmail.com',
    national_id_hash: computeHash('29501010109999'),
    national_id_last4: '9999',
    health_and_skills: {
      skills: ['دعم تقني ومسح QR', 'تنظيم وحركة حشود'],
      health_notes: 'لا توجد',
    },
    status: 'approved',
    qr_token: 'SRV-QR-99ADM2027X',
    admin_username: 'michael.admin',
    admin_password_hash: computeHash('Carnival@2027'),
    created_at: '2026-10-24T09:00:00Z',
  },
  {
    id: 's-pending-1',
    edition_id: 'ed-carnival-2027',
    full_name: 'كيرلس هاني فوزي',
    service_id: 'srv-nursery',
    phone: '01211223344',
    whatsapp: '01211223344',
    email: 'kirollos.hany@icloud.com',
    national_id_hash: computeHash('30304100104455'),
    national_id_last4: '4455',
    health_and_skills: {
      skills: ['ترانيم وعزف'],
      health_notes: 'حساسية جيوب أنفية من الأتربة',
    },
    status: 'pending',
    qr_token: 'SRV-QR-55PND8812K',
    created_at: '2026-11-08T18:20:00Z',
  },
];

export const INITIAL_SERVANT_ROLES: ServantRoleRecord[] = [
  { id: 'sr-1', servant_id: 's-team-1', role: 'team_lead' },
  { id: 'sr-2', servant_id: 's-staff-1', role: 'staff' },
  { id: 'sr-3', servant_id: 's-staff-1', role: 'registrar' }, // يجمع بين دورين كما نص الـ Blueprint
  { id: 'sr-4', servant_id: 's-lead-1', role: 'service_lead' },
  { id: 'sr-5', servant_id: 's-lead-1', role: 'team_lead' }, // يجمع بين دورين
  { id: 'sr-6', servant_id: 's-admin-1', role: 'admin' },
];

export const INITIAL_LOGIN_CODES: LoginCodeRecord[] = [
  {
    id: 'lc-1',
    servant_id: 's-team-1',
    code_hash: computeHash('A8K2P9'),
    delivery_status: 'sent',
    used_at: null,
    expires_at: '2027-02-05T23:59:59Z',
    created_at: '2026-11-01T10:00:05Z',
  },
  {
    id: 'lc-2',
    servant_id: 's-staff-1',
    code_hash: computeHash('STF420'),
    delivery_status: 'sent',
    used_at: null,
    expires_at: '2027-02-05T23:59:59Z',
    created_at: '2026-11-02T12:30:05Z',
  },
  {
    id: 'lc-3',
    servant_id: 's-lead-1',
    code_hash: computeHash('SRV770'),
    delivery_status: 'sent',
    used_at: null,
    expires_at: '2027-02-05T23:59:59Z',
    created_at: '2026-11-02T15:00:05Z',
  },
  {
    id: 'lc-4',
    servant_id: 's-admin-1',
    code_hash: computeHash('ADM999'),
    delivery_status: 'sent',
    used_at: null,
    expires_at: '2027-02-05T23:59:59Z',
    created_at: '2026-10-24T09:00:05Z',
  },
  {
    id: 'lc-5',
    servant_id: 's-pending-1',
    code_hash: computeHash('PND105'),
    delivery_status: 'failed', // مثال لحالة "لم يُرسل" ليظهر للأدمن خيار إعادة الإرسال أو الواتساب
    used_at: null,
    expires_at: '2027-02-05T23:59:59Z',
    created_at: '2026-11-08T18:20:05Z',
  },
];

export const INITIAL_OUTBOX: SimulatedEmailMessage[] = [
  {
    id: 'msg-1',
    to_email: 'abanoub.michel@gmail.com',
    servant_name: 'أبانوب ميشيل وديع',
    subject: 'كود الدخول السري - كرنفال الأطفال 2027',
    secret_code_preview: 'A8K2P9',
    delivery_status: 'sent',
    sent_at: '2026-11-01 10:00',
    purpose: 'registration',
  },
  {
    id: 'msg-2',
    to_email: 'kirollos.hany@icloud.com',
    servant_name: 'كيرلس هاني فوزي',
    subject: 'كود الدخول السري - كرنفال الأطفال 2027 (فشل الإرسال - بانتظار واتساب الأدمن)',
    secret_code_preview: 'PND105',
    delivery_status: 'failed',
    sent_at: '2026-11-08 18:20',
    purpose: 'registration',
  },
];

export const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [
  {
    id: 'aud-1',
    edition_id: 'ed-carnival-2027',
    actor_id: 's-admin-1',
    actor_name: 'مايكل يسري مسعد (أدمن)',
    action: 'EDITION_CREATED',
    target: 'editions/ed-carnival-2027',
    details: { stage: 2, services_count: 5, axes_count: 4 },
    created_at: '2026-10-24 09:00:00',
  },
  {
    id: 'aud-2',
    edition_id: 'ed-carnival-2027',
    actor_id: 's-pending-1',
    actor_name: 'كيرلس هاني فوزي',
    action: 'SERVANT_REGISTERED',
    target: 'servants/s-pending-1',
    details: { service: 'خدمة حضانة', status: 'pending', national_id_last4: '4455', email_delivery: 'failed' },
    created_at: '2026-11-08 18:20:05',
  },
];
