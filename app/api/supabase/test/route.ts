import { NextResponse } from 'next/server';
import { testSupabaseConnection } from '../../../../lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await testSupabaseConnection('editions');
    return NextResponse.json(result, {
      status: result.ok ? 200 : result.configured ? 502 : 503,
    });
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return NextResponse.json(
      {
        ok: false,
        configured: false,
        latencyMs: 0,
        tableChecked: 'editions',
        schemaReady: false,
        message: 'حدث خطأ غير متوقع أثناء اختبار الاتصال بـ Supabase.',
      },
      { status: 500 }
    );
  }
}
