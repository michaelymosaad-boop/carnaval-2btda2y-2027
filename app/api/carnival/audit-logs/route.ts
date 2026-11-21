import { NextRequest, NextResponse } from 'next/server';
import { insertAuditLogRecord } from '../../../../src/db/carnival-repository.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (!body || typeof body !== 'object' || !body.id) {
      return NextResponse.json({ error: 'Invalid audit log payload.' }, { status: 400 });
    }
    await insertAuditLogRecord(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to record audit log:', error);
    return NextResponse.json({ error: 'تعذر حفظ سجل المراقبة.' }, { status: 500 });
  }
}
