import { NextRequest, NextResponse } from 'next/server';
import { recordGateCheckinWithLedger } from '../../../../src/db/carnival-repository.ts';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      checkin?: Record<string, unknown>;
      ledgerEntries?: Record<string, unknown>[];
    };

    if (!body?.checkin || typeof body.checkin !== 'object' || !body.checkin.id) {
      return NextResponse.json({ error: 'Invalid gate check-in payload.' }, { status: 400 });
    }

    await recordGateCheckinWithLedger(
      body.checkin,
      Array.isArray(body.ledgerEntries) ? body.ledgerEntries : []
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to record gate check-in:', error);
    return NextResponse.json({ error: 'تعذر تسجيل حضور البوابة.' }, { status: 500 });
  }
}
