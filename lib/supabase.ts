import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';

function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isSupabaseConfigured(): boolean {
  return (
    isValidHttpUrl(rawSupabaseUrl) &&
    rawSupabaseAnonKey.length > 0 &&
    !rawSupabaseUrl.includes('YOUR_SUPABASE') &&
    !rawSupabaseAnonKey.includes('YOUR_SUPABASE')
  );
}

/**
 * عميل Supabase المهيأ من المتغيرات البيئية:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * يكون null إذا لم تكن المتغيرات البيئية مضبوطة بعد حتى لا يتعطل البناء أو التشغيل.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured()
  ? createClient(rawSupabaseUrl, rawSupabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;

/**
 * إرجاع عميل Supabase أو إطلاق رسالة خطأ واضحة في حال غياب المتغيرات البيئية.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase client is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    );
  }
  return supabase;
}

export interface SupabaseConnectionTestResult {
  ok: boolean;
  configured: boolean;
  latencyMs: number;
  tableChecked: string;
  schemaReady: boolean;
  message: string;
  errorCode?: string;
}

/**
 * اختبار الاتصال الفعلي بقاعدة بيانات Supabase والتأكد من جاهزية الجداول.
 */
export async function testSupabaseConnection(
  tableName = 'editions'
): Promise<SupabaseConnectionTestResult> {
  if (!supabase) {
    return {
      ok: false,
      configured: false,
      latencyMs: 0,
      tableChecked: tableName,
      schemaReady: false,
      message:
        'متغيرات Supabase البيئية غير مضبوطة بعد (NEXT_PUBLIC_SUPABASE_URL و NEXT_PUBLIC_SUPABASE_ANON_KEY).',
    };
  }

  const startedAt = Date.now();
  try {
    const { error } = await supabase
      .from(tableName)
      .select('id', { count: 'exact', head: true });

    const latencyMs = Date.now() - startedAt;

    if (!error) {
      return {
        ok: true,
        configured: true,
        latencyMs,
        tableChecked: tableName,
        schemaReady: true,
        message: 'تم الاتصال بقاعدة بيانات Supabase بنجاح والجداول جاهزة للعمل.',
      };
    }

    // رموز عدم وجود الجدول تعني أن الاتصال ومفاتيح المشروع صحيحة لكن الجداول لم تُنفّذ بعد
    if (error.code === '42P01' || error.code === 'PGRST205') {
      return {
        ok: true,
        configured: true,
        latencyMs,
        tableChecked: tableName,
        schemaReady: false,
        errorCode: error.code,
        message:
          'تم الاتصال بخادم Supabase بنجاح، لكن الجداول لم تُنشأ بعد. قم بتشغيل ملف الـ SQL داخل Supabase SQL Editor.',
      };
    }

    return {
      ok: false,
      configured: true,
      latencyMs,
      tableChecked: tableName,
      schemaReady: false,
      errorCode: error.code,
      message:
        'تعذر إتمام الاتصال بـ Supabase. تأكد من صحة الرابط ومفتاح الـ Anon Key وسياسات RLS.',
    };
  } catch {
    return {
      ok: false,
      configured: true,
      latencyMs: Date.now() - startedAt,
      tableChecked: tableName,
      schemaReady: false,
      message: 'فشل الوصول إلى خادم Supabase. تحقق من الاتصال بالإنترنت وصحة NEXT_PUBLIC_SUPABASE_URL.',
    };
  }
}
