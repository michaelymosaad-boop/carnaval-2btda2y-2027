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

export interface CarnivalInfoHistoryEntry {
  id: string;
  previous_name: string;
  new_name: string;
  previous_date: string;
  new_date: string;
  changed_by: string;
  changed_at: string;
  summary?: string;
}

export interface Edition {
  id: string;
  name: string;
  code_label: string;
  church_name: string;
  service_title: string;
  motto?: string;
  church_logo_url: string | null;
  service_logo_url?: string | null;
  carnival_logo_url: string | null;
  starts_on: string;
  ends_on: string;
  footer_text?: string;
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
  phone_hash?: string;
  whatsapp: string;
  email: string;
  email_hash?: string;
  national_id_hash: string;
  national_id_last4: string;
  national_id_display?: string;
  gender?: 'ذكر' | 'أنثى';
  birth_date?: string;
  governorate?: string;
  avatar_url?: string | null;
  health_and_skills: HealthAndSkills;
  status: ServantStatus;
  qr_token: string;
  pin_code?: string;
  pin_code_hash?: string;
  username?: string;
  can_view_kids_codes?: boolean;
  can_manage_coding?: boolean;
  admin_username?: string;
  admin_password_hash?: string;
  custom_password_hash?: string;
  primary_role?: 'team_lead' | 'staff' | null;
  created_at: string;
}

export interface AdminAuthConfig {
  id: 'admin_auth';
  edition_id: string;
  admin_servant_id: string;
  admin_email: string;
  admin_username: string;
  admin_password_hash: string;
  bootstrap_code_hash: string;
  bootstrap_used: boolean;
  updated_at: string;
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
    description: 'كل خادم يسجل بياناته ويظهر له الكود والـ QR مباشرة في الشاشة دون إيميل، والحساب معتمد فوراً.',
    open_actions: ['تسجيل الخدام الجدد (اعتماد فوري)', 'ظهور الكود والـ QR في الشاشة', 'الدخول بالرقم القومي والموبايل'],
    locked_actions: ['إدخال المخدومين', 'تقسيم الفرق', 'المسح الميداني'],
  },
  {
    stage: 3,
    title: '٣. إدارة الخدام والأدوار',
    short_title: 'الأدوار والصلاحيات',
    description: 'جميع الخدام معتمدون تلقائياً، ويقوم الأدمن بتحديد الأدوار وتفويض الصلاحيات أو حذف أي مستخدم.',
    open_actions: ['تعيين الأدوار المتعددة', 'منح صلاحية التكويد والأكواد', 'حذف أي مستخدم'],
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
  'تنظيم وحركة',
  'خادم فريق',
  'خادم روندات ألعاب',
  'خادم روندات روحي',
  'خادم عام حسب احتياج الكرنفال',
];

export const EGYPTIAN_GOVERNORATE_CODES: Record<string, string> = {
  '01': 'القاهرة',
  '02': 'الإسكندرية',
  '03': 'بورسعيد',
  '04': 'السويس',
  '11': 'دمياط',
  '12': 'الدقهلية',
  '13': 'الشرقية',
  '14': 'القليوبية',
  '15': 'كفر الشيخ',
  '16': 'الغربية',
  '17': 'المنوفية',
  '18': 'البحيرة',
  '19': 'الإسماعيلية',
  '21': 'الجيزة',
  '22': 'بني سويف',
  '23': 'الفيوم',
  '24': 'المنيا',
  '25': 'أسيوط',
  '26': 'سوهاج',
  '27': 'قنا',
  '28': 'أسوان',
  '29': 'الأقصر',
  '31': 'البحر الأحمر',
  '32': 'الوادي الجديد',
  '33': 'مطروح',
  '34': 'شمال سيناء',
  '35': 'جنوب سيناء',
  '88': 'خارج الجمهورية',
};

export interface ParsedEgyptianNationalId {
  isValid: boolean;
  gender: 'ذكر' | 'أنثى';
  birthDate: string;
  birthDateArabic: string;
  governorate: string;
  error?: string;
}

/**
 * استخراج النوع وتاريخ الميلاد والمحافظة تلقائياً من الرقم القومي المصري المكون من ١٤ رقماً
 */
export function parseEgyptianNationalId(rawInput: string): ParsedEgyptianNationalId {
  const digits = rawInput.replace(/\D/g, '');
  if (digits.length !== 14) {
    return {
      isValid: false,
      gender: 'ذكر',
      birthDate: '',
      birthDateArabic: '',
      governorate: '',
      error: 'يجب أن يتكون الرقم القومي من ١٤ رقماً بالضبط.',
    };
  }

  const centuryCode = digits.charAt(0);
  if (centuryCode !== '2' && centuryCode !== '3') {
    return {
      isValid: false,
      gender: 'ذكر',
      birthDate: '',
      birthDateArabic: '',
      governorate: '',
      error: 'الرقم القومي يجب أن يبدأ بـ 2 أو 3.',
    };
  }

  const centuryBase = centuryCode === '2' ? 1900 : 2000;
  const yearOffset = parseInt(digits.slice(1, 3), 10);
  const month = parseInt(digits.slice(3, 5), 10);
  const day = parseInt(digits.slice(5, 7), 10);
  const fullYear = centuryBase + yearOffset;

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return {
      isValid: false,
      gender: 'ذكر',
      birthDate: '',
      birthDateArabic: '',
      governorate: '',
      error: 'تاريخ الميلاد المضمن داخل الرقم القومي غير صحيح.',
    };
  }

  const govCode = digits.slice(7, 9);
  const governorate = EGYPTIAN_GOVERNORATE_CODES[govCode] || `محافظة (${govCode})`;
  const genderDigit = parseInt(digits.charAt(12), 10);
  const gender: 'ذكر' | 'أنثى' = genderDigit % 2 === 1 ? 'ذكر' : 'أنثى';

  const isoBirthDate = `${fullYear}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const birthDateArabic = `${day} / ${month} / ${fullYear}`;

  return {
    isValid: true,
    gender,
    birthDate: isoBirthDate,
    birthDateArabic,
    governorate,
  };
}

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

const ARABIC_CHAR_MAP: Record<string, string> = {
  ا: 'a',
  أ: 'a',
  إ: 'e',
  آ: 'a',
  ب: 'b',
  ت: 't',
  ث: 'th',
  ج: 'g',
  ح: 'h',
  خ: 'kh',
  د: 'd',
  ذ: 'z',
  ر: 'r',
  ز: 'z',
  س: 's',
  ش: 'sh',
  ص: 's',
  ض: 'd',
  ط: 't',
  ظ: 'z',
  ع: 'a',
  غ: 'gh',
  ف: 'f',
  ق: 'k',
  ك: 'k',
  ل: 'l',
  م: 'm',
  ن: 'n',
  ه: 'h',
  ة: 'a',
  و: 'o',
  ؤ: 'o',
  ي: 'y',
  ى: 'a',
  ئ: 'e',
  ء: 'a',
};

export function transliterateArabicToSlug(text: string): string {
  const cleaned = text
    .trim()
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, '');

  let out = '';
  for (const ch of cleaned) {
    if (ARABIC_CHAR_MAP[ch]) {
      out += ARABIC_CHAR_MAP[ch];
    } else if (/[a-z0-9]/.test(ch)) {
      out += ch;
    } else if (/\s|_|-|\./.test(ch)) {
      out += '.';
    }
  }
  return out.replace(/\.+/g, '.').replace(/^\.+|\.+$/g, '');
}

export function generateServantUsername(
  fullName: string,
  natIdLast4 = '',
  existingUsernames: string[] = []
): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  const firstTwo = words.slice(0, 2).map((w) => transliterateArabicToSlug(w)).filter(Boolean);
  let base = firstTwo.join('.');
  if (base.length < 3) {
    base = `servant.${natIdLast4 || '2027'}`;
  }
  const normalizedSet = new Set(existingUsernames.map((u) => u.trim().toLowerCase()).filter(Boolean));
  if (!normalizedSet.has(base.toLowerCase())) {
    return base;
  }
  const withLast4 = natIdLast4 ? `${base}.${natIdLast4}` : `${base}.27`;
  if (!normalizedSet.has(withLast4.toLowerCase())) {
    return withLast4;
  }
  let idx = 2;
  while (normalizedSet.has(`${withLast4}${idx}`.toLowerCase())) {
    idx += 1;
  }
  return `${withLast4}${idx}`;
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

const ARABIC_DAYS = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const ARABIC_MONTHS = [
  'يناير',
  'فبراير',
  'مارس',
  'أبريل',
  'مايو',
  'يونيو',
  'يوليو',
  'أغسطس',
  'سبتمبر',
  'أكتوبر',
  'نوفمبر',
  'ديسمبر',
];

function toArabicDigits(num: number | string): string {
  const digits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(num).replace(/\d/g, (d) => digits[Number(d)] || d);
}

/**
 * تنسيق التاريخ باللغة العربية بشكل متطابق بين السيرفر والمتصفح (Hydration-Safe)
 */
export function formatArabicDateLabel(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return isoDate;
  const [year, month, day] = parts;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  const dayName = ARABIC_DAYS[utcDate.getUTCDay()] || '';
  const monthName = ARABIC_MONTHS[month - 1] || '';
  return `${dayName} ${toArabicDigits(day)} ${monthName} ${toArabicDigits(year)}`;
}

export const INITIAL_CARNIVAL_HISTORY: CarnivalInfoHistoryEntry[] = [
  {
    id: 'hist-init-1',
    previous_name: 'كرنفال الأطفال ٢٠٢٧',
    new_name: 'كرنفال Reflection 2027',
    previous_date: '2027-02-04',
    new_date: '2027-02-04',
    changed_by: 'مايكل يسري مسعد (أدمن)',
    changed_at: '2026-11-09 10:00:00',
  },
];

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
        if (file.type === 'image/png') {
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.length <= 350000) {
            resolve(pngUrl);
            return;
          }
        }
        let jpegUrl = canvas.toDataURL('image/jpeg', 0.82);
        if (jpegUrl.length > 350000) {
          jpegUrl = canvas.toDataURL('image/jpeg', 0.65);
        }
        resolve(jpegUrl);
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
  code_label: 'REFLECTION · 04 FEB 2027',
  church_name: 'كنيسة السيدة العذراء مريم - بالعصافرة',
  service_title: 'خدمة ابتدائى بنين وبنات مرحله حضانه لسادسه',
  motto: 'المسيح في قلبي، يظهر في حياتي',
  church_logo_url: null,
  service_logo_url: null,
  carnival_logo_url: '/assets/reflection_carnival_logo.jpg',
  starts_on: '2027-02-04',
  ends_on: '2027-02-04',
  footer_text: 'كنيسة السيدة العذراء مريم - بالعصافرة · كرنفال Reflection 2027',
  current_stage: 2,
  status: 'active',
};

export const INITIAL_SERVICES: ServiceItem[] = [
  {
    id: 'srv-nursery',
    edition_id: 'ed-carnival-2027',
    name: 'مرحلة حضانة',
    stage_group: 'حضانة (KG1 - KG2)',
    sort_order: 1,
  },
  {
    id: 'srv-boys-1-3',
    edition_id: 'ed-carnival-2027',
    name: 'مرحلة أولى وثانية وثالثة بنين',
    stage_group: 'الصف الأول إلى الثالث الابتدائي - بنين',
    sort_order: 2,
  },
  {
    id: 'srv-girls-1-3',
    edition_id: 'ed-carnival-2027',
    name: 'مرحلة أولى وثانية وثالثة بنات',
    stage_group: 'الصف الأول إلى الثالث الابتدائي - بنات',
    sort_order: 3,
  },
  {
    id: 'srv-boys-4-6',
    edition_id: 'ed-carnival-2027',
    name: 'مرحلة رابعة وخامسة وسادسة بنين',
    stage_group: 'الصف الرابع إلى السادس الابتدائي - بنين',
    sort_order: 4,
  },
  {
    id: 'srv-girls-4-6',
    edition_id: 'ed-carnival-2027',
    name: 'مرحلة رابعة وخامسة وسادسة بنات',
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
    name: 'سلوكي',
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

export const DEMO_CREDENTIALS: DemoCredentialHint[] = [];

export const INITIAL_ADMIN_AUTH_CONFIG: AdminAuthConfig = {
  id: 'admin_auth',
  edition_id: 'ed-carnival-2027',
  admin_servant_id: 's-admin-1',
  admin_email: 'michael.y.mosaad@gmail.com',
  admin_username: '',
  admin_password_hash: '',
  bootstrap_code_hash: computeHash('202700'),
  bootstrap_used: false,
  updated_at: '2026-10-24T09:00:00Z',
};

export const INITIAL_SERVANTS: Servant[] = [
  {
    id: 's-admin-1',
    edition_id: 'ed-carnival-2027',
    full_name: 'مايكل يسري مسعد عطية',
    service_id: 'srv-boys-4-6',
    phone: '01270009999',
    phone_hash: computeHash('01270009999'),
    whatsapp: '01270009999',
    email: 'michael.y.mosaad@gmail.com',
    national_id_hash: computeHash('29501010209999'),
    national_id_last4: '9999',
    national_id_display: '29501010209999',
    gender: 'ذكر',
    birth_date: '1995-01-01',
    governorate: 'الإسكندرية',
    avatar_url: null,
    health_and_skills: {
      skills: ['تنظيم وحركة', 'خادم عام حسب احتياج الكرنفال'],
      health_notes: 'لا توجد',
    },
    status: 'approved',
    qr_token: 'SRV-QR-99ADM2027X',
    pin_code: 'ADM990',
    pin_code_hash: computeHash('ADM990'),
    primary_role: 'staff',
    created_at: '2026-10-24T09:00:00Z',
  },
];

export const INITIAL_SERVANT_ROLES: ServantRoleRecord[] = [
  { id: 'sr-6', servant_id: 's-admin-1', role: 'admin' },
];

export const INITIAL_LOGIN_CODES: LoginCodeRecord[] = [
  {
    id: 'lc-4',
    servant_id: 's-admin-1',
    code_hash: computeHash('ADM990'),
    delivery_status: 'sent',
    used_at: null,
    expires_at: '2027-02-05T23:59:59Z',
    created_at: '2026-10-24T09:00:05Z',
  },
];

export const INITIAL_OUTBOX: SimulatedEmailMessage[] = [];

export const INITIAL_AUDIT_LOGS: AuditLogRecord[] = [];

export interface CarnivalActivityRound {
  id: string;
  edition_id: string;
  title: string;
  axis_name: string;
  location: string;
  round_number: number;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  max_points: number;
  requires_gate_checkin: boolean;
}

export interface AttendanceAndPointsPolicy {
  require_gate_before_activities: boolean;
  gate_attendance_points: number;
  early_arrival_bonus_points: number;
  early_arrival_cutoff_time: string;
  early_arrival_minutes_before_round: number;
  team_spirit_max_points: number;
  allow_offline_scan_queue: boolean;
  lock_kids_registration_after_stage4: boolean;
  allow_user_portal_access: boolean;
  allow_servant_registration: boolean;
  allow_kids_registration: boolean;
}

export interface CodedGradeItem {
  id: string;
  code: string;
  name: string;
  service_id?: string;
}

export interface CodedTeamItem {
  id: string;
  code: string;
  name: string;
  color_label: string;
  service_id?: string;
}

export interface KidParticipant {
  id: string;
  edition_id: string;
  full_name: string;
  service_id: string;
  grade_label: string;
  parent_phone: string;
  health_notes: string;
  team_name: string;
  pin_code: string;
  qr_token: string;
  registered_by_name: string;
  source: 'manual' | 'excel';
  created_at: string;
}

export const INITIAL_ACTIVITY_ROUNDS: CarnivalActivityRound[] = [
  {
    id: 'act-1',
    edition_id: 'ed-carnival-2027',
    title: 'استقبال البوابة وتوزيع البادجات',
    axis_name: 'سلوكي',
    location: 'البوابة الرئيسية وفناء الكنيسة',
    round_number: 1,
    start_time: '09:00',
    end_time: '09:45',
    duration_minutes: 45,
    max_points: 50,
    requires_gate_checkin: false,
  },
  {
    id: 'act-2',
    edition_id: 'ed-carnival-2027',
    title: 'فقرة التسبحة والافتتاح (المسيح في قلبي)',
    axis_name: 'روحي',
    location: 'القاعة الكبرى',
    round_number: 2,
    start_time: '09:45',
    end_time: '10:30',
    duration_minutes: 45,
    max_points: 60,
    requires_gate_checkin: true,
  },
  {
    id: 'act-3',
    edition_id: 'ed-carnival-2027',
    title: 'روند الألعاب التفاعلية والتحدي الحركي',
    axis_name: 'ترفيهي',
    location: 'ملعب الكرنفال (أ)',
    round_number: 3,
    start_time: '10:30',
    end_time: '11:30',
    duration_minutes: 60,
    max_points: 100,
    requires_gate_checkin: true,
  },
  {
    id: 'act-4',
    edition_id: 'ed-carnival-2027',
    title: 'ورشة الإبداع والعمل الفني (يظهر في حياتي)',
    axis_name: 'إبداعي',
    location: 'قاعة الأنشطة بالدور الثاني',
    round_number: 4,
    start_time: '11:30',
    end_time: '12:15',
    duration_minutes: 45,
    max_points: 75,
    requires_gate_checkin: true,
  },
];

export const INITIAL_ATTENDANCE_POLICY: AttendanceAndPointsPolicy = {
  require_gate_before_activities: true,
  gate_attendance_points: 30,
  early_arrival_bonus_points: 20,
  early_arrival_cutoff_time: '09:30',
  early_arrival_minutes_before_round: 10,
  team_spirit_max_points: 50,
  allow_offline_scan_queue: true,
  lock_kids_registration_after_stage4: true,
  allow_user_portal_access: true,
  allow_servant_registration: true,
  allow_kids_registration: true,
};

export const INITIAL_CODED_GRADES: CodedGradeItem[] = [
  { id: 'grd-kg1', code: 'GRD-01', name: 'حضانة صغرى (KG1)', service_id: 'srv-nursery' },
  { id: 'grd-kg2', code: 'GRD-02', name: 'حضانة كبرى (KG2)', service_id: 'srv-nursery' },
  { id: 'grd-p1', code: 'GRD-03', name: 'الصف الأول الابتدائي', service_id: 'srv-boys-1-3' },
  { id: 'grd-p2', code: 'GRD-04', name: 'الصف الثاني الابتدائي', service_id: 'srv-boys-1-3' },
  { id: 'grd-p3', code: 'GRD-05', name: 'الصف الثالث الابتدائي', service_id: 'srv-boys-1-3' },
  { id: 'grd-p4', code: 'GRD-06', name: 'الصف الرابع الابتدائي', service_id: 'srv-boys-4-6' },
  { id: 'grd-p5', code: 'GRD-07', name: 'الصف الخامس الابتدائي', service_id: 'srv-boys-4-6' },
  { id: 'grd-p6', code: 'GRD-08', name: 'الصف السادس الابتدائي', service_id: 'srv-boys-4-6' },
];

export const INITIAL_CODED_TEAMS: CodedTeamItem[] = [
  {
    id: 'tm-1',
    code: 'TM-01',
    name: 'فريق أسود الكرنفال (المجموعة أ)',
    color_label: 'برتقالي ذهبي',
  },
  {
    id: 'tm-2',
    code: 'TM-02',
    name: 'فريق نجوم الفرح (المجموعة ب)',
    color_label: 'أزرق سماوي',
  },
  {
    id: 'tm-3',
    code: 'TM-03',
    name: 'فريق نسور الإيمان (المجموعة ج)',
    color_label: 'أخضر زمردي',
  },
  {
    id: 'tm-4',
    code: 'TM-04',
    name: 'فريق أبطال المحبة (المجموعة د)',
    color_label: 'بنفسجي ملكي',
  },
];

export interface CarnivalQrPayloadData {
  v: 1;
  type: 'servant' | 'kid';
  name: string;
  code: string;
  pin?: string;
  service: string;
  phone?: string;
  natIdLast4?: string;
}

/**
 * توليد محتوى QR حقيقي ومهيكل يربط الكود بالاسم والمرحلة والبيانات الأساسية
 */
export function encodeCarnivalQrPayload(input: Omit<CarnivalQrPayloadData, 'v'>): string {
  const payload: CarnivalQrPayloadData = {
    v: 1,
    ...input,
  };
  return JSON.stringify(payload);
}

/**
 * فك وقراءة محتوى الـ QR الممسوح (سواء كان JSON كامل من الـ QR الحقيقي أو الكود النصي المباشر)
 */
export function decodeCarnivalQrPayload(rawInput: string): CarnivalQrPayloadData | null {
  const trimmed = rawInput.trim();
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as Partial<CarnivalQrPayloadData>;
      if (parsed && typeof parsed.code === 'string') {
        return {
          v: 1,
          type: parsed.type === 'kid' ? 'kid' : 'servant',
          name: parsed.name || 'غير محدد',
          code: parsed.code.trim().toUpperCase(),
          pin: parsed.pin,
          service: parsed.service || 'غير محدد',
          phone: parsed.phone,
          natIdLast4: parsed.natIdLast4,
        };
      }
    } catch {
      return null;
    }
  }
  return null;
}

export const INITIAL_KID_PARTICIPANTS: KidParticipant[] = [];

// ============================================================================
// نماذج تشغيل يوم الكرنفال (حضور البوابة، سجل النقاط التراكمي، الطوارئ، الترتيب الحي)
// ============================================================================

export type GateSubjectType = 'kid' | 'servant';

export interface GateCheckinRecord {
  id: string;
  edition_id: string;
  subject_type: GateSubjectType;
  subject_id: string;
  subject_name: string;
  service_id: string;
  team_name?: string;
  qr_token: string;
  pin_code?: string;
  checked_in_at: string;
  checked_in_local_time: string;
  is_early_arrival: boolean;
  gate_points_awarded: number;
  early_bonus_awarded: number;
  recorded_by_servant_id: string;
  recorded_by_name: string;
}

export type PointsLedgerSource =
  | 'gate'
  | 'early_bonus'
  | 'round'
  | 'team_spirit'
  | 'correction';

export interface PointsLedgerEntry {
  id: string;
  edition_id: string;
  team_id: string;
  team_name: string;
  round_id?: string;
  round_title?: string;
  axis_name?: string;
  target_type: 'team' | 'kid' | 'servant';
  target_id?: string;
  target_name?: string;
  source: PointsLedgerSource;
  points: number;
  reason: string;
  recorded_by_servant_id: string;
  recorded_by_name: string;
  created_at: string;
}

export type EmergencyAlertCategory =
  | 'medical'
  | 'lost_child'
  | 'lost_item'
  | 'logistics'
  | 'schedule_change';
export type EmergencyAlertSeverity = 'normal' | 'urgent' | 'critical';
export type EmergencyAlertStatus = 'open' | 'in_progress' | 'resolved';

export interface EmergencyAlertRecord {
  id: string;
  edition_id: string;
  category: EmergencyAlertCategory;
  severity: EmergencyAlertSeverity;
  title: string;
  description: string;
  location: string;
  related_person_id?: string;
  related_person_name?: string;
  related_team_name?: string;
  status: EmergencyAlertStatus;
  reported_by_servant_id: string;
  reported_by_name: string;
  updated_by_servant_id?: string;
  resolved_by_name?: string;
  resolution_note?: string;
  created_at: string;
  updated_at: string;
}

export interface TeamScoreSummary {
  team_id: string;
  team_code: string;
  team_name: string;
  color_label: string;
  accent_hex: string;
  gate_points: number;
  early_bonus_points: number;
  round_points: number;
  spirit_points: number;
  correction_points: number;
  total_points: number;
  kids_count: number;
  checked_in_kids_count: number;
  entries_count: number;
  last_activity_label: string;
  rank: number;
}

export function getCurrentLocalHHMM(date = new Date()): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function isTimeBeforeOrEqualCutoff(localHHMM: string, cutoffHHMM: string): boolean {
  const parseMinutes = (hhmm: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec((hhmm || '').trim());
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  };
  const currentMin = parseMinutes(localHHMM);
  const cutoffMin = parseMinutes(cutoffHHMM);
  if (currentMin === null || cutoffMin === null) return false;
  return currentMin <= cutoffMin;
}

export function getTeamAccentHex(colorLabel: string, index: number): string {
  const label = (colorLabel || '').toLowerCase();
  if (label.includes('برتق') || label.includes('ذهب') || label.includes('orange')) return '#EA580C';
  if (label.includes('أزرق') || label.includes('سما') || label.includes('blue')) return '#0284C7';
  if (label.includes('أخضر') || label.includes('زمرد') || label.includes('green')) return '#059669';
  if (label.includes('بنفسج') || label.includes('ملك') || label.includes('purple')) return '#7C3AED';
  if (label.includes('أحمر') || label.includes('وردي') || label.includes('red')) return '#E11D48';
  const palette = ['#EA580C', '#0284C7', '#059669', '#7C3AED', '#D97706', '#E11D48'];
  return palette[index % palette.length];
}

export function computeTeamScoreboard(
  codedTeams: CodedTeamItem[],
  pointsLedger: PointsLedgerEntry[],
  kids: KidParticipant[],
  gateCheckins: GateCheckinRecord[]
): TeamScoreSummary[] {
  const teamsList = codedTeams.length > 0 ? codedTeams : INITIAL_CODED_TEAMS;
  const checkedInKidIds = new Set(
    gateCheckins.filter((g) => g.subject_type === 'kid').map((g) => g.subject_id)
  );

  const rawSummaries = teamsList.map((team, idx) => {
    const teamEntries = pointsLedger.filter(
      (entry) => entry.team_id === team.id || entry.team_name === team.name
    );

    let gate_points = 0;
    let early_bonus_points = 0;
    let round_points = 0;
    let spirit_points = 0;
    let correction_points = 0;

    for (const entry of teamEntries) {
      if (entry.source === 'gate') gate_points += entry.points;
      else if (entry.source === 'early_bonus') early_bonus_points += entry.points;
      else if (entry.source === 'round') round_points += entry.points;
      else if (entry.source === 'team_spirit') spirit_points += entry.points;
      else if (entry.source === 'correction') correction_points += entry.points;
    }

    const total_points =
      gate_points + early_bonus_points + round_points + spirit_points + correction_points;

    const teamKids = kids.filter((k) => k.team_name === team.name);
    const checked_in_kids_count = teamKids.filter((k) => checkedInKidIds.has(k.id)).length;

    const latestEntry = [...teamEntries].sort((a, b) =>
      b.created_at.localeCompare(a.created_at)
    )[0];

    const last_activity_label = latestEntry
      ? `${latestEntry.round_title || latestEntry.reason} (${latestEntry.points >= 0 ? '+' : ''}${latestEntry.points})`
      : 'لم تُسجَّل نقاط بعد';

    return {
      team_id: team.id,
      team_code: team.code,
      team_name: team.name,
      color_label: team.color_label,
      accent_hex: getTeamAccentHex(team.color_label, idx),
      gate_points,
      early_bonus_points,
      round_points,
      spirit_points,
      correction_points,
      total_points,
      kids_count: teamKids.length,
      checked_in_kids_count,
      entries_count: teamEntries.length,
      last_activity_label,
      rank: 1,
    };
  });

  rawSummaries.sort((a, b) => {
    if (b.total_points !== a.total_points) return b.total_points - a.total_points;
    if (b.checked_in_kids_count !== a.checked_in_kids_count) {
      return b.checked_in_kids_count - a.checked_in_kids_count;
    }
    return a.team_name.localeCompare(b.team_name, 'ar');
  });

  return rawSummaries.map((item, idx) => ({
    ...item,
    rank: idx + 1,
  }));
}



